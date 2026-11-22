import * as THREE from 'three';
import { RoomEnvironment } from 'three/examples/jsm/environments/RoomEnvironment.js';
import { getVehicleColorHex } from '../data/trafficRules';
import { SimAudioEngine } from './audio';
import { AudioSettings, PedestrianSpeechKey } from './audioTypes';
import { VehiclePhysics } from './physics';
import { RulesEngine } from './rulesEngine';
import { TrafficManager } from './trafficManager';
import {
  CameraMode,
  ControlInputs,
  GearMode,
  HeadlightMode,
  HudSnapshot,
  IndicatorState,
  SimulationConfig,
  VehicleTelemetry,
  WeatherType,
  TimeOfDay,
} from './types';
import { BmwM5Rig, buildBmwM5 } from './vehicleModel';
import { buildWorld, WorldData } from './worldBuilder';

function detectSoftwareGl(renderer: THREE.WebGLRenderer): boolean {
  try {
    const gl = renderer.getContext();
    const dbg = gl.getExtension('WEBGL_debug_renderer_info');
    if (dbg) {
      const str = String(gl.getParameter(dbg.UNMASKED_RENDERER_WEBGL) || '');
      if (/SwiftShader|llvmpipe|softpipe|Software|Basic Render/i.test(str)) {
        return true;
      }
    }
  } catch {
    // fallback false
  }
  return false;
}

export class SimulatorEngine {
  private container: HTMLElement;
  private config: SimulationConfig;
  private onHudUpdate: (snapshot: HudSnapshot) => void;
  private onToast?: (msg: string) => void;

  private renderer!: THREE.WebGLRenderer;
  private scene!: THREE.Scene;
  private camera!: THREE.PerspectiveCamera;
  private pmremGen?: THREE.PMREMGenerator;
  private envRT?: THREE.WebGLRenderTarget;

  private world!: WorldData;
  private bmw!: BmwM5Rig;
  private physics = new VehiclePhysics();
  private traffic!: TrafficManager;
  private rules!: RulesEngine;
  private audio = new SimAudioEngine();

  // Lighting & Weather
  private sunLight!: THREE.DirectionalLight;
  private hemiLight!: THREE.HemisphereLight;
  private rainPoints: THREE.Points | null = null;
  private rainPositions: Float32Array | null = null;

  // Runtime state
  private cameraMode: CameraMode = 'third';
  private headlights: HeadlightMode = 'off';
  private indicators: IndicatorState = 'none';
  private seatbeltFastened = false;
  private handbrakeEngaged = true;
  private wipersOn = false;
  private engineRunning = true;
  private paused = false;
  private hornActive = false;

  private inputs: ControlInputs = {
    throttle: 0,
    brake: 0,
    handbrake: false,
    steerInput: 0,
    steerTarget: null,
  };
  private keys = new Set<string>();

  // Loop & Software GL scheduling
  private isSoftwareGl = false;
  private disposed = false;
  private rafId = 0;
  private syncTimerId = 0;
  private lastFrameMs = 0;
  private simTimeSec = 0;
  private hudEmitAcc = 0;
  private wiperPhase = 0;
  private wasOnCurb = false;
  private lastPedSpeechIdx = 0;

  // Pre-allocated camera & math vectors (zero GC in loop)
  private readonly _camDesiredPos = new THREE.Vector3();
  private readonly _camDesiredLook = new THREE.Vector3();
  private readonly _camSmoothPos = new THREE.Vector3();
  private readonly _camSmoothLook = new THREE.Vector3();
  private readonly _telemetry: VehicleTelemetry = {
    x: 0,
    z: 0,
    heading: 0,
    speedKmh: 0,
    rpm: 820,
    gear: 'P',
    autoGearStep: 1,
    steeringAngle: 0,
    fuelPercent: 88,
    seatbeltFastened: false,
    handbrakeEngaged: true,
    headlights: 'off',
    indicators: 'none',
    wipersOn: false,
    hornActive: false,
    brakePressed: false,
    gasPressed: false,
    engineRunning: true,
    currentSpeedLimit: 60,
    inZoneLabel: '',
    distanceMeters: 0,
    elapsedSeconds: 0,
  };

  constructor(
    container: HTMLElement,
    config: SimulationConfig,
    onHudUpdate: (snapshot: HudSnapshot) => void,
    onToast?: (msg: string) => void
  ) {
    this.container = container;
    this.config = { ...config };
    this.onHudUpdate = onHudUpdate;
    this.onToast = onToast;

    this.initScene();
    this.bindEvents();
    this.emitHud();
    this.lastFrameMs = performance.now();
    this.scheduleNextFrame();
  }

  private initScene(): void {
    const width = Math.max(320, this.container.clientWidth);
    const height = Math.max(240, this.container.clientHeight);

    this.scene = new THREE.Scene();

    // Probe renderer to detect software GL before configuring heavy post/shadows
    const probeCanvas = document.createElement('canvas');
    const probeCtx = probeCanvas.getContext('webgl2') || probeCanvas.getContext('webgl');
    let software = false;
    if (probeCtx) {
      const dbg = probeCtx.getExtension('WEBGL_debug_renderer_info');
      if (dbg) {
        const rendererStr = String(probeCtx.getParameter(dbg.UNMASKED_RENDERER_WEBGL) || '');
        software = /SwiftShader|llvmpipe|softpipe|Software|Basic Render/i.test(rendererStr);
      }
    }

    this.renderer = new THREE.WebGLRenderer({
      antialias: !software,
      powerPreference: 'high-performance',
    });
    this.isSoftwareGl = software || detectSoftwareGl(this.renderer);

    this.renderer.setPixelRatio(this.isSoftwareGl ? 1 : Math.min(window.devicePixelRatio || 1, 2));
    this.renderer.setSize(width, height);
    this.renderer.toneMapping = THREE.ACESFilmicToneMapping;
    this.renderer.toneMappingExposure = 1.05;
    this.renderer.outputColorSpace = THREE.SRGBColorSpace;
    this.renderer.shadowMap.enabled = !this.isSoftwareGl;
    if (!this.isSoftwareGl) {
      this.renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    }

    this.renderer.domElement.style.display = 'block';
    this.renderer.domElement.style.width = '100%';
    this.renderer.domElement.style.height = '100%';
    this.container.appendChild(this.renderer.domElement);

    // PMREM metallic environment for BMW M5 paint & chrome
    this.pmremGen = new THREE.PMREMGenerator(this.renderer);
    this.envRT = this.pmremGen.fromScene(new RoomEnvironment(), 0.04);
    this.scene.environment = this.envRT.texture;

    this.camera = new THREE.PerspectiveCamera(62, width / height, 0.12, 650);

    // Lighting
    this.hemiLight = new THREE.HemisphereLight(0xbae6fd, 0x334155, 0.85);
    this.scene.add(this.hemiLight);

    this.sunLight = new THREE.DirectionalLight(0xfffbeb, 1.95);
    this.sunLight.position.set(60, 110, 45);
    if (!this.isSoftwareGl) {
      this.sunLight.castShadow = true;
      this.sunLight.shadow.mapSize.set(1024, 1024);
      this.sunLight.shadow.camera.near = 10;
      this.sunLight.shadow.camera.far = 280;
      const d = 80;
      this.sunLight.shadow.camera.left = -d;
      this.sunLight.shadow.camera.right = d;
      this.sunLight.shadow.camera.top = d;
      this.sunLight.shadow.camera.bottom = -d;
    }
    this.scene.add(this.sunLight);
    this.scene.add(this.sunLight.target);

    // Build World
    this.world = buildWorld(this.config.environment, this.config.timeOfDay);
    this.scene.add(this.world.root);

    // Build BMW M5
    const colorHex = getVehicleColorHex(this.config.vehicleColor);
    this.bmw = buildBmwM5(colorHex, this.config.mode === 'training');
    this.physics.reset(this.world.startPos.x, this.world.startPos.z, this.world.startPos.heading);
    this.bmw.group.position.set(this.physics.x, 0, this.physics.z);
    this.bmw.group.rotation.y = this.physics.heading;
    this.scene.add(this.bmw.group);

    // Initial camera placement behind car
    this._camSmoothPos.set(this.physics.x, 2.8, this.physics.z + 7.2);
    this._camSmoothLook.set(this.physics.x, 1.0, this.physics.z - 8);
    this.camera.position.copy(this._camSmoothPos);
    this.camera.lookAt(this._camSmoothLook);

    // Default reasonable light/wiper state for free/exam convenience? Keep off so user learns, OR in exam keep manual.
    // Build Traffic & Rules
    this.traffic = new TrafficManager(this.world, this.config.trafficDensity);
    this.scene.add(this.traffic.root);

    this.rules = this.createRulesEngine();

    this.audio.onUnlocked(() => {
      if (this.disposed) return;
      if (this.engineRunning) {
        this.audio.playDoorSound();
        this.audio.playEngineStartup();
      }
      if (this.config.mode === 'exam' && !this.rules.examFinished && this.simTimeSec < 18) {
        this.audio.playPoliceSpeech('exam_start', { priority: 'normal', cooldownSec: 4 });
      }
    });

    this.createRainSystem();
    this.applyWeatherAndTime();
  }

  private createRulesEngine(): RulesEngine {
    return new RulesEngine(
      this.config.mode,
      this.config.environment,
      this.config.weather,
      this.config.timeOfDay,
      this.world,
      {
        onViolationSound: (critical, code) => {
          this.audio.playViolationChime(critical);
          if (code === 'NO_SEATBELT') {
            this.audio.playPoliceSpeech('warn_seatbelt', { cooldownSec: 12 });
          } else if (code === 'SPEED_LIMIT' || code === 'SPEED_EXTREME') {
            this.audio.playPoliceSpeech('warn_speed', { cooldownSec: 10 });
          } else if (code === 'CROSSWALK_PEDESTRIAN') {
            this.audio.playPoliceSpeech('warn_crosswalk', { cooldownSec: 10 });
          } else if (
            code === 'RED_LIGHT' ||
            code === 'STOP_SIGN_FAIL' ||
            code === 'SOLID_LINE' ||
            code === 'NO_STOPPING_ZONE' ||
            code === 'REGULATOR_STOP_FAIL'
          ) {
            this.audio.playPoliceSpeech('warn_sign', { cooldownSec: 10 });
          }
        },
        onPoliceChirp: () => {
          const p = this.traffic?.getNearestPolicePos(this.physics.x, this.physics.z);
          const spatial = p
            ? {
                dx: p.x - this.physics.x,
                dz: p.z - this.physics.z,
                playerHeading: this.physics.heading,
                maxDistance: 75,
              }
            : undefined;
          this.audio.playPoliceChirp(spatial);
          this.audio.playPoliceSpeech('police_pullover', { priority: 'high', cooldownSec: 8, spatial });
        },
        onPoliceStoppedPrompt: () => {
          const p = this.traffic?.getNearestPolicePos(this.physics.x, this.physics.z);
          const spatial = p
            ? {
                dx: p.x - this.physics.x,
                dz: p.z - this.physics.z,
                playerHeading: this.physics.heading,
                maxDistance: 55,
              }
            : undefined;
          this.audio.playPoliceSpeech('police_engine_off', { cooldownSec: 6, spatial });
          this.audio.playPoliceSpeech('police_license', { cooldownSec: 6, spatial });
          this.audio.playPoliceSpeech('police_docs', { cooldownSec: 6, spatial });
        },
        onExamFinished: (passed) => {
          this.audio.playPoliceSpeech(passed ? 'exam_pass' : 'exam_fail', {
            priority: 'high',
            cooldownSec: 2,
          });
        },
        onNavPrompt: (key) => {
          this.audio.playPoliceSpeech(key, { cooldownSec: 14 });
        },
      }
    );
  }

  private createRainSystem(): void {
    const count = 850;
    const positions = new Float32Array(count * 3);
    for (let i = 0; i < count; i++) {
      positions[i * 3] = (Math.random() - 0.5) * 44;
      positions[i * 3 + 1] = Math.random() * 18;
      positions[i * 3 + 2] = (Math.random() - 0.5) * 44;
    }
    const geo = new THREE.BufferGeometry();
    geo.setAttribute('position', new THREE.BufferAttribute(positions, 3));
    const mat = new THREE.PointsMaterial({
      color: 0xcbd5e1,
      size: 0.14,
      transparent: true,
      opacity: 0.65,
    });
    this.rainPoints = new THREE.Points(geo, mat);
    this.rainPoints.visible = this.config.weather === 'rain';
    this.rainPositions = positions;
    this.scene.add(this.rainPoints);
  }

  public setWeatherAndTime(weather: WeatherType, timeOfDay: TimeOfDay): void {
    this.config.weather = weather;
    this.config.timeOfDay = timeOfDay;
    this.applyWeatherAndTime();
    this.emitHud();
  }

  private applyWeatherAndTime(): void {
    const isNight = this.config.timeOfDay === 'night';
    const isFog = this.config.weather === 'fog';
    const isRain = this.config.weather === 'rain';

    let skyHex = 0x7dd3fc;
    if (isNight) {
      skyHex = isFog ? 0x1e293b : 0x090f1d;
    } else if (isFog) {
      skyHex = 0xcbd5e1;
    } else if (isRain) {
      skyHex = 0x64748b;
    }

    this.scene.background = new THREE.Color(skyHex);
    const fogDensity = isFog ? 0.032 : isRain ? 0.009 : isNight ? 0.006 : 0.0018;
    this.scene.fog = new THREE.FogExp2(skyHex, fogDensity);

    this.hemiLight.intensity = isNight ? 0.34 : isRain || isFog ? 0.65 : 0.9;
    this.sunLight.intensity = isNight ? 0.25 : isFog ? 0.55 : isRain ? 0.85 : 1.95;
    this.sunLight.color.setHex(isNight ? 0x93c5fd : 0xfffbeb);
    this.renderer.toneMappingExposure = isNight ? 0.92 : 1.05;

    for (const pl of this.world.streetLampLights) {
      pl.intensity = isNight ? 15 : 0;
    }
    for (const wm of this.world.windowMaterials) {
      wm.emissiveIntensity = isNight ? 0.9 : 0.05;
    }

    if (this.rainPoints) {
      this.rainPoints.visible = isRain;
    }
  }

  private bindEvents(): void {
    window.addEventListener('resize', this.handleResize);
    window.addEventListener('keydown', this.handleKeyDown);
    window.addEventListener('keyup', this.handleKeyUp);
    this.renderer.domElement.addEventListener('webglcontextlost', this.handleContextLost);
    this.renderer.domElement.addEventListener('webglcontextrestored', this.handleContextRestored);
  }

  private handleContextLost = (e: Event): void => {
    e.preventDefault();
    this.paused = true;
  };

  private handleContextRestored = (): void => {
    this.paused = false;
  };

  private handleResize = (): void => {
    if (this.disposed) return;
    const w = Math.max(320, this.container.clientWidth);
    const h = Math.max(240, this.container.clientHeight);
    this.camera.aspect = w / h;
    this.camera.updateProjectionMatrix();
    this.renderer.setSize(w, h);
  };

  private handleKeyDown = (e: KeyboardEvent): void => {
    const tag = (e.target as HTMLElement)?.tagName;
    if (tag === 'INPUT' || tag === 'TEXTAREA') return;

    const code = e.code;
    if (['ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight', 'Space'].includes(code)) {
      e.preventDefault();
    }

    this.audio.ensureStarted();
    if (this.paused || this.rules.examFinished) {
      return;
    }
    this.keys.add(code);

    if (e.repeat) return;

    if (code === 'KeyC') this.toggleCamera();
    else if (code === 'KeyR') this.setGear(this.physics.gear === 'R' ? 'D' : 'R');
    else if (code === 'KeyE') this.triggerInteract();
    else if (code === 'KeyB') this.toggleSeatbelt();
    else if (code === 'KeyH') this.toggleHandbrake();
    else if (code === 'KeyL') this.cycleHeadlights();
    else if (code === 'KeyV') this.toggleWipers();
    else if (code === 'KeyQ') this.toggleIndicator('left');
    else if (code === 'KeyZ') this.toggleIndicator('right');
    else if (code === 'KeyF') this.toggleIndicator('hazard');
    else if (code === 'KeyK') this.triggerHorn(true);
    else if (code === 'KeyI') this.toggleEngine();
    else if (code === 'KeyO') this.triggerDoor();
    else if (code === 'Digit1') this.setGear('P');
    else if (code === 'Digit2') this.setGear('R');
    else if (code === 'Digit3') this.setGear('N');
    else if (code === 'Digit4') this.setGear('D');
  };

  private handleKeyUp = (e: KeyboardEvent): void => {
    this.keys.delete(e.code);
    if (e.code === 'KeyK') {
      this.triggerHorn(false);
    }
  };

  // UI / Mobile Touch Control Methods
  public setTouchThrottle(val: number): void {
    this.audio.ensureStarted();
    this.inputs.throttle = Math.max(0, Math.min(1, val));
  }

  public setTouchBrake(val: number): void {
    this.audio.ensureStarted();
    this.inputs.brake = Math.max(0, Math.min(1, val));
  }

  public setTouchSteerTarget(val: number | null): void {
    this.audio.ensureStarted();
    this.inputs.steerTarget = val;
  }

  public setGear(gear: GearMode): void {
    this.audio.ensureStarted();
    const ok = this.physics.setGear(gear);
    if (!ok && this.onToast) {
      this.onToast('Sürət qutusunu dəyişmək üçün əvvəlcə avtomobili tam dayandırın.');
    }
    this.emitHud();
  }

  public toggleCamera(): void {
    this.cameraMode = this.cameraMode === 'third' ? 'first' : 'third';
    this.emitHud();
  }

  public toggleSeatbelt(): void {
    this.seatbeltFastened = !this.seatbeltFastened;
    this.emitHud();
  }

  public toggleHandbrake(): void {
    this.handbrakeEngaged = !this.handbrakeEngaged;
    this.emitHud();
  }

  public cycleHeadlights(): void {
    const order: HeadlightMode[] = ['off', 'low', 'high', 'fog'];
    const next = order[(order.indexOf(this.headlights) + 1) % order.length];
    this.headlights = next;
    this.emitHud();
  }

  public toggleIndicator(type: 'left' | 'right' | 'hazard'): void {
    this.audio.ensureStarted();
    this.indicators = this.indicators === type ? 'none' : type;
    this.emitHud();
  }

  public toggleWipers(): void {
    this.wipersOn = !this.wipersOn;
    this.emitHud();
  }

  public toggleEngine(): void {
    this.audio.ensureStarted();
    this.engineRunning = !this.engineRunning;
    if (this.engineRunning) {
      this.audio.playEngineStartup();
      this.onToast?.('BMW M5 mühərriki işə salındı.');
    } else {
      this.audio.playEngineShutdown();
      this.onToast?.('Mühərrik söndürüldü.');
    }
    this.emitHud();
  }

  public triggerDoor(): void {
    this.audio.ensureStarted();
    this.audio.playDoorSound();
    this.onToast?.('Avtomobilin qapısı açılıb-bağlandı.');
  }

  public triggerHorn(active: boolean): void {
    this.hornActive = active;
    this.audio.setHorn(active);
  }

  public triggerInteract(): void {
    this.audio.ensureStarted();
    this.physics.fillTelemetry(this._telemetry);
    const msg = this.rules.handleInteract(this._telemetry, this.physics);
    if (msg && this.onToast) {
      this.onToast(msg);
    }
    this.emitHud();
  }

  public setPaused(p: boolean): void {
    this.paused = p;
    this.audio.updateEngine(0, 0, !p);
  }

  public setMuted(muted: boolean): void {
    this.audio.setMuted(muted);
  }

  public isMuted(): boolean {
    return this.audio.isMuted();
  }

  public getAudioSettings(): AudioSettings {
    return this.audio.getSettings();
  }

  public updateAudioSettings(patch: Partial<AudioSettings>): AudioSettings {
    this.audio.ensureStarted();
    return this.audio.updateSettings(patch);
  }

  public restart(): void {
    this.resetExam();
  }

  public resetExam(): void {
    if (this.disposed) return;

    this.audio.clearSpeechQueue();
    this.keys.clear();
    this.inputs.throttle = 0;
    this.inputs.brake = 0;
    this.inputs.handbrake = false;
    this.inputs.steerInput = 0;
    this.inputs.steerTarget = null;

    this.physics.reset(this.world.startPos.x, this.world.startPos.z, this.world.startPos.heading);
    this.physics.fuelPercent = 88;
    this.seatbeltFastened = false;
    this.handbrakeEngaged = true;
    this.indicators = 'none';
    this.headlights = 'off';
    this.wipersOn = false;
    this.hornActive = false;
    this.audio.setHorn(false);
    this.engineRunning = true;
    this.wiperPhase = 0;
    this.wasOnCurb = false;
    this.simTimeSec = 0;
    this.hudEmitAcc = 0;
    this.lastFrameMs = performance.now();

    this.scene.remove(this.traffic.root);
    this.traffic.dispose();
    this.traffic = new TrafficManager(this.world, this.config.trafficDensity);
    this.scene.add(this.traffic.root);

    this.rules = this.createRulesEngine();

    this.syncTelemetry(false, false);
    this.updateBmwVisuals(0, performance.now(), false);

    // Snap camera immediately behind BMW M5 at startPos (or cockpit if in first-person)
    const sinH = Math.sin(this.physics.heading);
    const cosH = Math.cos(this.physics.heading);
    const fwdX = -sinH;
    const fwdZ = -cosH;
    this._camSmoothPos.set(this.physics.x - fwdX * 7.2, 2.95, this.physics.z - fwdZ * 7.2);
    this._camSmoothLook.set(this.physics.x + fwdX * 6.5, 1.1, this.physics.z + fwdZ * 6.5);
    this.updateCamera(0.05);

    this.paused = false;
    this.audio.playDoorSound();
    this.audio.playEngineStartup();
    if (this.config.mode === 'exam') {
      this.audio.playPoliceSpeech('exam_start', { priority: 'normal', cooldownSec: 2 });
    }
    this.emitHud();
  }

  private syncTelemetry(brakePressed: boolean, gasPressed: boolean): void {
    this.physics.fillTelemetry(this._telemetry);
    this._telemetry.seatbeltFastened = this.seatbeltFastened;
    this._telemetry.handbrakeEngaged = this.handbrakeEngaged;
    this._telemetry.headlights = this.headlights;
    this._telemetry.indicators = this.indicators;
    this._telemetry.wipersOn = this.wipersOn;
    this._telemetry.hornActive = this.hornActive;
    this._telemetry.brakePressed = brakePressed;
    this._telemetry.gasPressed = gasPressed;
    this._telemetry.engineRunning = this.engineRunning;
    this._telemetry.currentSpeedLimit = this.rules.getCurrentSpeedLimit();
    this._telemetry.inZoneLabel = this.rules.getZoneLabel();
    this._telemetry.elapsedSeconds = Math.round(this.simTimeSec);
  }

  private scheduleNextFrame(): void {
    if (this.disposed) return;
    if (this.isSoftwareGl) {
      this.afterDraw(this.tick);
    } else {
      this.rafId = requestAnimationFrame(this.tick);
    }
  }

  private afterDraw(cb: (now: number) => void): void {
    const gl = this.renderer.getContext() as WebGL2RenderingContext;
    if (typeof gl.fenceSync === 'function') {
      const sync = gl.fenceSync(gl.SYNC_GPU_COMMANDS_COMPLETE, 0);
      if (!sync) {
        this.syncTimerId = window.setTimeout(() => cb(performance.now()), 32);
        return;
      }
      gl.flush();
      const startPoll = performance.now();
      const poll = () => {
        if (this.disposed) {
          gl.deleteSync(sync);
          return;
        }
        const status = gl.clientWaitSync(sync, 0, 0);
        if (
          status === gl.ALREADY_SIGNALED ||
          status === gl.CONDITION_SATISFIED ||
          status === gl.WAIT_FAILED ||
          performance.now() - startPoll > 80
        ) {
          gl.deleteSync(sync);
          cb(performance.now());
        } else {
          this.syncTimerId = window.setTimeout(poll, 16);
        }
      };
      this.syncTimerId = window.setTimeout(poll, 16);
    } else {
      this.syncTimerId = window.setTimeout(() => cb(performance.now()), 32);
    }
  }

  private tick = (nowMs: number): void => {
    if (this.disposed) return;
    const dt = Math.min(0.05, Math.max(0.001, (nowMs - this.lastFrameMs) / 1000));
    this.lastFrameMs = nowMs;

    if (!this.paused && !this.rules.examFinished) {
      this.stepSimulation(dt, nowMs);
    }

    this.renderer.render(this.scene, this.camera);
    this.scheduleNextFrame();
  };

  private stepSimulation(dt: number, nowMs: number): void {
    this.simTimeSec += dt;

    // Combine keyboard + touch inputs
    const kbGas = this.keys.has('KeyW') || this.keys.has('ArrowUp') ? 1 : 0;
    const kbBrake =
      this.keys.has('KeyS') || this.keys.has('ArrowDown') || this.keys.has('Space') ? 1 : 0;
    const kbLeft = this.keys.has('KeyA') || this.keys.has('ArrowLeft') ? 1 : 0;
    const kbRight = this.keys.has('KeyD') || this.keys.has('ArrowRight') ? 1 : 0;

    const effectiveInputs: ControlInputs = {
      throttle: Math.max(kbGas, this.inputs.throttle),
      brake: Math.max(kbBrake, this.inputs.brake),
      handbrake: this.handbrakeEngaged,
      steerInput: kbLeft - kbRight, // +1 left, -1 right
      steerTarget: this.inputs.steerTarget,
    };

    // Physics step
    const physMetrics = this.physics.step(
      dt,
      effectiveInputs,
      this.config.weather,
      this.handbrakeEngaged,
      this.engineRunning
    );

    // Traffic & Collision step
    const collision = this.traffic.update(
      dt,
      this.simTimeSec,
      this.physics.x,
      this.physics.z,
      this.physics.heading,
      this.physics.speedMs
    );

    if (collision.collidedWith) {
      this.audio.playCollisionSound(collision.collidedWith, Math.round(Math.abs(this.physics.speedMs * 3.6)));
      this.physics.x += collision.pushOutX;
      this.physics.z += collision.pushOutZ;
      this.physics.speedMs *= -0.18;
    }

    // Update Telemetry snapshot object
    this.syncTelemetry(effectiveInputs.brake > 0.05, effectiveInputs.throttle > 0.05);

    // Curb hit detection (city sidewalk curb, village road shoulder, highway edge)
    const onCurbNow = this.detectCurbContact();
    if (onCurbNow && !this.wasOnCurb && this._telemetry.speedKmh > 6) {
      this.audio.playCollisionSound('curb', this._telemetry.speedKmh);
    }
    this.wasOnCurb = onCurbNow;

    // Seatbelt warning chime while driving unbuckled
    if (this._telemetry.speedKmh > 12 && !this.seatbeltFastened) {
      this.audio.playSeatbeltWarning();
    }

    // Rules Engine evaluation
    this.rules.evaluate(dt, this.simTimeSec, this._telemetry, this.traffic, collision);
    this._telemetry.currentSpeedLimit = this.rules.getCurrentSpeedLimit();

    if (this.rules.examFinished) {
      this.keys.clear();
      this.inputs.throttle = 0;
      this.inputs.brake = 0;
      this.inputs.steerTarget = null;
      this.audio.setHorn(false);
    }

    // Update 3D BMW M5 visuals
    this.updateBmwVisuals(dt, nowMs, effectiveInputs.brake > 0.05);

    // Update Rain particles around car
    if (this.rainPoints && this.rainPositions && this.config.weather === 'rain') {
      this.rainPoints.position.set(this.physics.x, 0, this.physics.z);
      for (let i = 0; i < this.rainPositions.length; i += 3) {
        this.rainPositions[i + 1] -= 18 * dt;
        if (this.rainPositions[i + 1] < 0) {
          this.rainPositions[i + 1] = 17.5;
        }
      }
      (this.rainPoints.geometry.getAttribute('position') as THREE.BufferAttribute).needsUpdate = true;
    }

    // Move sun shadow frustum with car
    this.sunLight.position.set(this.physics.x + 55, 105, this.physics.z + 40);
    this.sunLight.target.position.set(this.physics.x, 0, this.physics.z);

    // Update Camera smoothly
    this.updateCamera(dt);

    // Spatial Pedestrian Voices & Crowd Ambiance
    const pedInfo = this.traffic.getNearestPedestrianInfo(this.physics.x, this.physics.z);
    const nearCrowdStrength = pedInfo && pedInfo.dist < 32 ? Math.max(0, 1 - pedInfo.dist / 32) : 0;
    if (pedInfo && pedInfo.dist < 20 && !this.rules.examFinished) {
      const spatial = {
        dx: pedInfo.x - this.physics.x,
        dz: pedInfo.z - this.physics.z,
        playerHeading: this.physics.heading,
        maxDistance: 28,
      };
      if (pedInfo.dist < 11 && this._telemetry.speedKmh > 18) {
        this.audio.playPedestrianSpeech(
          this._telemetry.speedKmh > 30 ? 'ped_danger_1' : 'ped_alert_1',
          spatial,
          7.0
        );
      } else if (pedInfo.nearCrosswalk || pedInfo.waiting) {
        const key: PedestrianSpeechKey = this.lastPedSpeechIdx % 2 === 0 ? 'ped_wait_1' : 'ped_wait_2';
        this.lastPedSpeechIdx += 1;
        this.audio.playPedestrianSpeech(key, spatial, 14.0);
      } else if (pedInfo.dist < 15) {
        const key: PedestrianSpeechKey = this.lastPedSpeechIdx % 2 === 0 ? 'ped_talk_1' : 'ped_talk_2';
        this.lastPedSpeechIdx += 1;
        this.audio.playPedestrianSpeech(key, spatial, 16.0);
      }
    }

    // Update 3D Dynamic Audio Frame
    this.audio.updateFrame({
      rpm: this.physics.rpm,
      speedKmh: this._telemetry.speedKmh,
      throttle: effectiveInputs.throttle,
      brakingDecel: physMetrics.brakingDecel,
      lateralSlip: physMetrics.lateralSlip,
      engineRunning: this.engineRunning,
      active: !this.paused && !this.rules.examFinished,
      environment: this.config.environment,
      weather: this.config.weather,
      timeOfDay: this.config.timeOfDay,
      nearCrowdStrength,
    });

    // Emit HUD snapshot at ~15 Hz
    this.hudEmitAcc += dt;
    if (this.hudEmitAcc >= 0.066 || this.rules.examFinished) {
      this.hudEmitAcc = 0;
      this.emitHud();
    }
  }

  private detectCurbContact(): boolean {
    if (this.config.environment === 'city') {
      // Main avenue asphalt width ~14m (|x| <= 7.0), intersection crosses at |z| <= 11
      return Math.abs(this.physics.z) > 12 && Math.abs(this.physics.x) > 7.1;
    }
    if (this.config.environment === 'village') {
      return Math.abs(this.physics.x) > 4.4;
    }
    // Highway asphalt corridor
    return this.physics.x < 0.8 || this.physics.x > 19.2;
  }

  private updateBmwVisuals(dt: number, nowMs: number, braking: boolean): void {
    this.bmw.group.position.set(this.physics.x, 0, this.physics.z);
    this.bmw.group.rotation.y = this.physics.heading;

    // Suspension pitch/roll
    this.bmw.bodyTiltGroup.rotation.x = this.physics.pitchAngle;
    this.bmw.bodyTiltGroup.rotation.z = this.physics.rollAngle;

    // Steered front wheels & spinning wheels
    this.bmw.frontLeftPivot.rotation.y = this.physics.steeringAngle;
    this.bmw.frontRightPivot.rotation.y = this.physics.steeringAngle;
    for (const w of this.bmw.wheelRolls) {
      w.rotation.x = this.physics.wheelSpinAngle;
    }

    // Interior M5 steering wheel & cockpit needles
    this.bmw.steeringWheel.rotation.z = this.physics.steeringAngle * 2.1;
    const speedNorm = Math.min(1, this._telemetry.speedKmh / 240);
    this.bmw.speedNeedle.rotation.z = 2.1 - speedNorm * 4.2;
    const rpmNorm = Math.min(1, this.physics.rpm / 7500);
    this.bmw.rpmNeedle.rotation.z = 2.1 - rpmNorm * 4.2;

    // Headlights & spots
    const hlIntensity =
      this.headlights === 'high' ? 42 : this.headlights === 'low' || this.headlights === 'fog' ? 22 : 0;
    const hlMatIntensity =
      this.headlights === 'high' ? 2.4 : this.headlights === 'low' || this.headlights === 'fog' ? 1.5 : 0.35;
    for (const s of this.bmw.headlightSpots) {
      s.intensity = hlIntensity;
      s.angle = this.headlights === 'high' ? Math.PI / 4.2 : Math.PI / 5.5;
    }
    for (const m of this.bmw.headlightMeshes) {
      (m.material as THREE.MeshStandardMaterial).emissiveIntensity = hlMatIntensity;
    }

    // Brake & Reverse lights
    for (const m of this.bmw.brakeLightMeshes) {
      (m.material as THREE.MeshStandardMaterial).emissiveIntensity = braking || this.handbrakeEngaged ? 2.6 : 0.5;
    }
    for (const m of this.bmw.reverseLightMeshes) {
      (m.material as THREE.MeshStandardMaterial).emissiveIntensity = this.physics.gear === 'R' ? 2.2 : 0;
    }

    // Blinker relay & indicator LEDs
    const blinkActive = this.indicators !== 'none';
    const blinkOn = this.audio.tickBlinker(blinkActive, nowMs);
    const leftOn = blinkOn && (this.indicators === 'left' || this.indicators === 'hazard');
    const rightOn = blinkOn && (this.indicators === 'right' || this.indicators === 'hazard');
    for (const m of this.bmw.leftIndicatorMeshes) {
      (m.material as THREE.MeshStandardMaterial).emissiveIntensity = leftOn ? 2.8 : 0;
    }
    for (const m of this.bmw.rightIndicatorMeshes) {
      (m.material as THREE.MeshStandardMaterial).emissiveIntensity = rightOn ? 2.8 : 0;
    }

    // Windshield wipers
    if (this.wipersOn) {
      this.wiperPhase += dt * 5.5;
      const angle = (Math.sin(this.wiperPhase) * 0.5 + 0.5) * 1.1;
      this.bmw.wiperLeft.rotation.z = angle;
      this.bmw.wiperRight.rotation.z = angle;
    } else {
      this.bmw.wiperLeft.rotation.z += (0 - this.bmw.wiperLeft.rotation.z) * Math.min(1, 8 * dt);
      this.bmw.wiperRight.rotation.z += (0 - this.bmw.wiperRight.rotation.z) * Math.min(1, 8 * dt);
    }
  }

  private updateCamera(dt: number): void {
    const sinH = Math.sin(this.physics.heading);
    const cosH = Math.cos(this.physics.heading);
    // Vehicle forward = (-sinH, -cosH)
    const fwdX = -sinH;
    const fwdZ = -cosH;
    const rightX = cosH;
    const rightZ = -sinH;

    if (this.cameraMode === 'first') {
      // Driver eye position inside M5 cabin (left-hand drive X = -0.36, Y = 1.18, Z = -0.05)
      this._camDesiredPos.set(
        this.physics.x + rightX * -0.36 - fwdX * 0.05,
        1.19,
        this.physics.z + rightZ * -0.36 - fwdZ * 0.05
      );
      this._camDesiredLook.set(
        this.physics.x + rightX * -0.36 + fwdX * 22,
        1.04,
        this.physics.z + rightZ * -0.36 + fwdZ * 22
      );
      this.camera.position.copy(this._camDesiredPos);
      this.camera.lookAt(this._camDesiredLook);
      this._camSmoothPos.copy(this._camDesiredPos);
      this._camSmoothLook.copy(this._camDesiredLook);
    } else {
      // Smooth Third-Person Chase Camera
      this._camDesiredPos.set(
        this.physics.x - fwdX * 7.2,
        2.95,
        this.physics.z - fwdZ * 7.2
      );
      this._camDesiredLook.set(
        this.physics.x + fwdX * 6.5,
        1.1,
        this.physics.z + fwdZ * 6.5
      );
      this._camSmoothPos.x = THREE.MathUtils.damp(this._camSmoothPos.x, this._camDesiredPos.x, 7.5, dt);
      this._camSmoothPos.y = THREE.MathUtils.damp(this._camSmoothPos.y, this._camDesiredPos.y, 7.5, dt);
      this._camSmoothPos.z = THREE.MathUtils.damp(this._camSmoothPos.z, this._camDesiredPos.z, 7.5, dt);

      this._camSmoothLook.x = THREE.MathUtils.damp(this._camSmoothLook.x, this._camDesiredLook.x, 9, dt);
      this._camSmoothLook.y = THREE.MathUtils.damp(this._camSmoothLook.y, this._camDesiredLook.y, 9, dt);
      this._camSmoothLook.z = THREE.MathUtils.damp(this._camSmoothLook.z, this._camDesiredLook.z, 9, dt);

      this.camera.position.copy(this._camSmoothPos);
      this.camera.lookAt(this._camSmoothLook);
    }
  }

  private emitHud(): void {
    this.onHudUpdate({
      telemetry: { ...this._telemetry },
      cameraMode: this.cameraMode,
      police: { ...this.rules.police },
      training: this.rules.training
        ? {
            ...this.rules.training,
            steps: this.rules.training.steps.map((s) => ({ ...s })),
          }
        : null,
      score: this.rules.score,
      violations: [...this.rules.violations],
      collisionCount: this.rules.collisionCount,
      latestWarning: this.rules.latestWarning ? { ...this.rules.latestWarning } : null,
      nearbySignCode: this.rules.nearbySignCode,
      nearbySignTitle: this.rules.nearbySignTitle,
      examFinished: this.rules.examFinished,
      examPassed: this.rules.examPassed,
      examFailReason: this.rules.examFailReason,
      interactPrompt: this.rules.interactPrompt,
    });
  }

  public dispose(): void {
    this.disposed = true;
    if (this.rafId) cancelAnimationFrame(this.rafId);
    if (this.syncTimerId) clearTimeout(this.syncTimerId);

    window.removeEventListener('resize', this.handleResize);
    window.removeEventListener('keydown', this.handleKeyDown);
    window.removeEventListener('keyup', this.handleKeyUp);

    this.renderer.domElement.removeEventListener('webglcontextlost', this.handleContextLost);
    this.renderer.domElement.removeEventListener('webglcontextrestored', this.handleContextRestored);

    this.audio.dispose();
    this.traffic.dispose();

    this.scene.traverse((obj) => {
      const mesh = obj as THREE.Mesh;
      if (mesh.geometry) mesh.geometry.dispose();
      if (mesh.material) {
        if (Array.isArray(mesh.material)) mesh.material.forEach((m) => m.dispose());
        else mesh.material.dispose();
      }
    });

    this.envRT?.dispose();
    this.pmremGen?.dispose();
    this.renderer.dispose();

    if (this.renderer.domElement.parentNode === this.container) {
      this.container.removeChild(this.renderer.domElement);
    }
  }
}
