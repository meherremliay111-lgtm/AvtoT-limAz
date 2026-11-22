import {
  AudioSettings,
  DEFAULT_AUDIO_SETTINGS,
  PedestrianSpeechKey,
  PoliceSpeechKey,
  VehicleSfxKey,
} from './audioTypes';
import { EnvironmentType, TimeOfDay, WeatherType } from './types';

const SETTINGS_STORAGE_KEY = 'avtotelim_audio_settings_v1';

const LOOP_URLS = {
  m5_idle: '/assets/audio/vehicle/m5_idle_loop.wav',
  m5_mid: '/assets/audio/vehicle/m5_mid_loop.wav',
  m5_high: '/assets/audio/vehicle/m5_high_loop.wav',
  m5_turbo: '/assets/audio/vehicle/m5_turbo_spool.wav',
  tire_asphalt: '/assets/audio/vehicle/tire_asphalt_loop.wav',
  tire_wet: '/assets/audio/vehicle/tire_wet_loop.wav',
  tire_skid: '/assets/audio/vehicle/tire_skid_loop.wav',
  horn: '/assets/audio/vehicle/horn_loop.wav',
  env_city: '/assets/audio/env/env_city_loop.wav',
  env_highway: '/assets/audio/env/env_highway_loop.wav',
  env_village: '/assets/audio/env/env_village_loop.wav',
  env_night: '/assets/audio/env/env_night_loop.wav',
  env_rain: '/assets/audio/env/env_rain_loop.wav',
  env_wind: '/assets/audio/env/env_wind_loop.wav',
  env_crowd: '/assets/audio/env/env_crowd_loop.wav',
} as const;

type LoopKey = keyof typeof LOOP_URLS;

const VEHICLE_SFX_URLS: Record<VehicleSfxKey, string> = {
  m5_startup: '/assets/audio/vehicle/m5_startup.mp3',
  m5_shutdown: '/assets/audio/vehicle/m5_shutdown.mp3',
  m5_exhaust_pop: '/assets/audio/vehicle/m5_exhaust_pop.mp3',
  brake_hard: '/assets/audio/vehicle/brake_hard.mp3',
  blinker_on: '/assets/audio/vehicle/blinker_on.mp3',
  blinker_off: '/assets/audio/vehicle/blinker_off.mp3',
  door_open_close: '/assets/audio/vehicle/door_open_close.mp3',
  seatbelt_chime: '/assets/audio/vehicle/seatbelt_chime.mp3',
  crash_light: '/assets/audio/vehicle/crash_light.mp3',
  crash_heavy: '/assets/audio/vehicle/crash_heavy.mp3',
  curb_hit: '/assets/audio/vehicle/curb_hit.mp3',
  barrier_scrape: '/assets/audio/vehicle/barrier_scrape.mp3',
  emergency_alert: '/assets/audio/vehicle/emergency_alert.mp3',
  system_warning: '/assets/audio/vehicle/system_warning.mp3',
};

const POLICE_SPEECH_URLS: Record<PoliceSpeechKey, string> = {
  police_pullover: '/assets/audio/police/police_pullover.mp3',
  police_engine_off: '/assets/audio/police/police_engine_off.mp3',
  police_license: '/assets/audio/police/police_license.mp3',
  police_docs: '/assets/audio/police/police_docs.mp3',
  warn_seatbelt: '/assets/audio/police/warn_seatbelt.mp3',
  warn_speed: '/assets/audio/police/warn_speed.mp3',
  warn_crosswalk: '/assets/audio/police/warn_crosswalk.mp3',
  warn_sign: '/assets/audio/police/warn_sign.mp3',
  exam_start: '/assets/audio/police/exam_start.mp3',
  nav_turn_right: '/assets/audio/police/nav_turn_right.mp3',
  nav_turn_left: '/assets/audio/police/nav_turn_left.mp3',
  nav_straight: '/assets/audio/police/nav_straight.mp3',
  nav_crosswalk: '/assets/audio/police/nav_crosswalk.mp3',
  nav_stop_line: '/assets/audio/police/nav_stop_line.mp3',
  exam_pass: '/assets/audio/police/exam_pass.mp3',
  exam_fail: '/assets/audio/police/exam_fail.mp3',
};

const PEDESTRIAN_SPEECH_URLS: Record<PedestrianSpeechKey, string> = {
  ped_talk_1: '/assets/audio/pedestrians/ped_talk_1.mp3',
  ped_talk_2: '/assets/audio/pedestrians/ped_talk_2.mp3',
  ped_wait_1: '/assets/audio/pedestrians/ped_wait_1.mp3',
  ped_wait_2: '/assets/audio/pedestrians/ped_wait_2.mp3',
  ped_alert_1: '/assets/audio/pedestrians/ped_alert_1.mp3',
  ped_danger_1: '/assets/audio/pedestrians/ped_danger_1.mp3',
};

type BusName = 'engine' | 'env' | 'pedestrian' | 'police' | 'alerts';

export function loadAudioSettings(): AudioSettings {
  if (typeof window === 'undefined') return { ...DEFAULT_AUDIO_SETTINGS };
  try {
    const raw = window.localStorage.getItem(SETTINGS_STORAGE_KEY);
    if (!raw) return { ...DEFAULT_AUDIO_SETTINGS };
    const parsed = JSON.parse(raw) as Partial<AudioSettings>;
    return {
      muted: Boolean(parsed.muted),
      masterVolume: clamp01(parsed.masterVolume ?? DEFAULT_AUDIO_SETTINGS.masterVolume),
      engineVolume: clamp01(parsed.engineVolume ?? DEFAULT_AUDIO_SETTINGS.engineVolume),
      environmentVolume: clamp01(parsed.environmentVolume ?? DEFAULT_AUDIO_SETTINGS.environmentVolume),
      pedestrianVolume: clamp01(parsed.pedestrianVolume ?? DEFAULT_AUDIO_SETTINGS.pedestrianVolume),
      policeVolume: clamp01(parsed.policeVolume ?? DEFAULT_AUDIO_SETTINGS.policeVolume),
      alertsVolume: clamp01(parsed.alertsVolume ?? DEFAULT_AUDIO_SETTINGS.alertsVolume),
    };
  } catch {
    return { ...DEFAULT_AUDIO_SETTINGS };
  }
}

function clamp01(v: number): number {
  return Number.isFinite(v) ? Math.max(0, Math.min(1, v)) : 0.8;
}

export interface SpatialSource {
  dx: number; // targetX - playerX
  dz: number; // targetZ - playerZ
  playerHeading: number;
  maxDistance?: number;
}

interface LoopChannel {
  key: LoopKey;
  bus: BusName;
  gainNode: GainNode;
  filterNode?: BiquadFilterNode;
  source: AudioBufferSourceNode | null;
  started: boolean;
}

interface QueuedSpeech {
  key: PoliceSpeechKey;
  spatial?: SpatialSource;
}

export class SimAudioEngine {
  private ctx: AudioContext | null = null;
  private masterGain: GainNode | null = null;
  private buses: Record<BusName, GainNode | null> = {
    engine: null,
    env: null,
    pedestrian: null,
    police: null,
    alerts: null,
  };

  private settings: AudioSettings = loadAudioSettings();
  private buffers = new Map<string, AudioBuffer>();
  private loadingUrls = new Set<string>();
  private loopChannels = new Map<LoopKey, LoopChannel>();

  private unlocked = false;
  private pendingUnlockCallbacks: Array<() => void> = [];
  private disposed = false;

  // Dynamic state trackers
  private blinkerPhase = false;
  private lastBlinkerTime = 0;
  private hornActive = false;
  private prevThrottle = 0;
  private cooldowns = new Map<string, number>();

  // Speech & pedestrian anti-overlap
  private speechQueue: QueuedSpeech[] = [];
  private activePoliceSource: AudioBufferSourceNode | null = null;
  private activePedSource: AudioBufferSourceNode | null = null;

  public getSettings(): AudioSettings {
    return { ...this.settings };
  }

  public updateSettings(patch: Partial<AudioSettings>): AudioSettings {
    this.settings = {
      ...this.settings,
      ...patch,
      masterVolume: clamp01(patch.masterVolume ?? this.settings.masterVolume),
      engineVolume: clamp01(patch.engineVolume ?? this.settings.engineVolume),
      environmentVolume: clamp01(patch.environmentVolume ?? this.settings.environmentVolume),
      pedestrianVolume: clamp01(patch.pedestrianVolume ?? this.settings.pedestrianVolume),
      policeVolume: clamp01(patch.policeVolume ?? this.settings.policeVolume),
      alertsVolume: clamp01(patch.alertsVolume ?? this.settings.alertsVolume),
    };

    try {
      if (typeof window !== 'undefined') {
        window.localStorage.setItem(SETTINGS_STORAGE_KEY, JSON.stringify(this.settings));
      }
    } catch {
      // ignore storage errors
    }

    this.applyBusGains();
    return this.getSettings();
  }

  public setMuted(muted: boolean): void {
    this.updateSettings({ muted });
  }

  public isMuted(): boolean {
    return this.settings.muted;
  }

  public onUnlocked(cb: () => void): void {
    if (this.unlocked && this.ctx && this.ctx.state === 'running') {
      cb();
    } else {
      this.pendingUnlockCallbacks.push(cb);
    }
  }

  public ensureStarted(): void {
    if (this.disposed || typeof window === 'undefined') return;
    if (!this.ctx) {
      const AudioCtx =
        window.AudioContext ||
        (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
      if (!AudioCtx) return;

      this.ctx = new AudioCtx();
      this.setupGraph();
      this.preloadAll();
    }

    if (this.ctx.state === 'suspended') {
      void this.ctx.resume().then(() => this.markUnlocked());
    } else if (this.ctx.state === 'running') {
      this.markUnlocked();
    }
  }

  private markUnlocked(): void {
    if (this.disposed || !this.ctx) return;
    const wasUnlocked = this.unlocked;
    this.unlocked = true;
    this.startDecodedLoops();
    if (!wasUnlocked && this.pendingUnlockCallbacks.length > 0) {
      const cbs = [...this.pendingUnlockCallbacks];
      this.pendingUnlockCallbacks = [];
      for (const cb of cbs) cb();
    }
  }

  private setupGraph(): void {
    if (!this.ctx) return;
    const compressor = this.ctx.createDynamicsCompressor();
    compressor.threshold.value = -10;
    compressor.knee.value = 18;
    compressor.ratio.value = 5;
    compressor.attack.value = 0.004;
    compressor.release.value = 0.2;
    compressor.connect(this.ctx.destination);

    this.masterGain = this.ctx.createGain();
    this.masterGain.connect(compressor);

    (['engine', 'env', 'pedestrian', 'police', 'alerts'] as BusName[]).forEach((name) => {
      if (!this.ctx || !this.masterGain) return;
      const g = this.ctx.createGain();
      g.connect(this.masterGain);
      this.buses[name] = g;
    });

    this.applyBusGains();

    // Setup loop channels
    this.createLoopChannel('m5_idle', 'engine', true);
    this.createLoopChannel('m5_mid', 'engine', true);
    this.createLoopChannel('m5_high', 'engine', true);
    this.createLoopChannel('m5_turbo', 'engine', false);
    this.createLoopChannel('horn', 'engine', false);
    this.createLoopChannel('tire_asphalt', 'env', true);
    this.createLoopChannel('tire_wet', 'env', false);
    this.createLoopChannel('tire_skid', 'alerts', false);
    this.createLoopChannel('env_city', 'env', false);
    this.createLoopChannel('env_highway', 'env', false);
    this.createLoopChannel('env_village', 'env', false);
    this.createLoopChannel('env_night', 'env', false);
    this.createLoopChannel('env_rain', 'env', false);
    this.createLoopChannel('env_wind', 'env', false);
    this.createLoopChannel('env_crowd', 'pedestrian', false);
  }

  private createLoopChannel(key: LoopKey, bus: BusName, withFilter: boolean): void {
    if (!this.ctx) return;
    const busNode = this.buses[bus];
    if (!busNode) return;

    const gainNode = this.ctx.createGain();
    gainNode.gain.value = 0;

    let filterNode: BiquadFilterNode | undefined;
    if (withFilter) {
      filterNode = this.ctx.createBiquadFilter();
      filterNode.type = 'lowpass';
      filterNode.frequency.value = 1800;
      filterNode.connect(gainNode);
    }

    gainNode.connect(busNode);

    this.loopChannels.set(key, {
      key,
      bus,
      gainNode,
      filterNode,
      source: null,
      started: false,
    });
  }

  private applyBusGains(): void {
    if (!this.ctx || !this.masterGain) return;
    const now = this.ctx.currentTime;
    const master = this.settings.muted ? 0 : this.settings.masterVolume;
    this.masterGain.gain.setTargetAtTime(master, now, 0.04);
    this.buses.engine?.gain.setTargetAtTime(this.settings.engineVolume, now, 0.04);
    this.buses.env?.gain.setTargetAtTime(this.settings.environmentVolume, now, 0.04);
    this.buses.pedestrian?.gain.setTargetAtTime(this.settings.pedestrianVolume, now, 0.04);
    this.buses.police?.gain.setTargetAtTime(this.settings.policeVolume, now, 0.04);
    this.buses.alerts?.gain.setTargetAtTime(this.settings.alertsVolume, now, 0.04);
  }

  private preloadAll(): void {
    const urls = [
      ...Object.values(LOOP_URLS),
      ...Object.values(VEHICLE_SFX_URLS),
      ...Object.values(POLICE_SPEECH_URLS),
      ...Object.values(PEDESTRIAN_SPEECH_URLS),
    ];
    for (const url of urls) {
      void this.loadBuffer(url);
    }
  }

  private async loadBuffer(url: string): Promise<AudioBuffer | null> {
    if (this.disposed || !this.ctx || typeof fetch !== 'function') return null;
    const cached = this.buffers.get(url);
    if (cached) return cached;
    if (this.loadingUrls.has(url)) return null;

    this.loadingUrls.add(url);
    try {
      const res = await fetch(url);
      if (!res.ok) return null;
      const arr = await res.arrayBuffer();
      if (this.disposed || !this.ctx) return null;
      const decoded = await this.ctx.decodeAudioData(arr);
      this.buffers.set(url, decoded);
      if (this.unlocked) {
        this.startDecodedLoops();
      }
      return decoded;
    } catch {
      return null;
    } finally {
      this.loadingUrls.delete(url);
    }
  }

  private startDecodedLoops(): void {
    if (!this.ctx || this.disposed) return;
    for (const [key, ch] of this.loopChannels.entries()) {
      if (ch.started) continue;
      const url = LOOP_URLS[key];
      const buf = this.buffers.get(url);
      if (!buf) continue;

      const src = this.ctx.createBufferSource();
      src.buffer = buf;
      src.loop = true;
      src.connect(ch.filterNode ?? ch.gainNode);
      src.start(0);
      ch.source = src;
      ch.started = true;
    }
  }

  private canTrigger(tag: string, cooldownSec: number): boolean {
    const nowSec = performance.now() / 1000;
    const prev = this.cooldowns.get(tag) ?? -999;
    if (nowSec - prev < cooldownSec) return false;
    this.cooldowns.set(tag, nowSec);
    return true;
  }

  private computeSpatial3D(spatial?: SpatialSource): { pan: number; atten: number } {
    if (!spatial) return { pan: 0, atten: 1 };
    const dist = Math.hypot(spatial.dx, spatial.dz);
    const maxDist = spatial.maxDistance ?? 42;
    if (dist >= maxDist) return { pan: 0, atten: 0 };

    // Player right vector in world XZ: (cosH, -sinH)
    const rightX = Math.cos(spatial.playerHeading);
    const rightZ = -Math.sin(spatial.playerHeading);
    const len = Math.max(0.5, dist);
    const pan = Math.max(-0.92, Math.min(0.92, (spatial.dx * rightX + spatial.dz * rightZ) / len));
    const atten = Math.max(0.08, Math.pow(1 - dist / maxDist, 1.45));
    return { pan, atten };
  }

  private playUrlOneShot(
    url: string,
    bus: BusName,
    volume = 1,
    spatial?: SpatialSource,
    onNode?: (src: AudioBufferSourceNode) => void
  ): void {
    if (this.disposed || this.settings.muted) return;
    if (!this.ctx || this.ctx.state !== 'running') return;
    const busNode = this.buses[bus];
    if (!busNode) return;

    const { pan, atten } = this.computeSpatial3D(spatial);
    if (atten <= 0.01) return;

    const buf = this.buffers.get(url);
    if (!buf) {
      void this.loadBuffer(url).then((loaded) => {
        if (loaded && !this.disposed && bus === 'police') {
          this.playUrlOneShot(url, bus, volume, spatial, onNode);
        }
      });
      return;
    }

    const src = this.ctx.createBufferSource();
    src.buffer = buf;

    const g = this.ctx.createGain();
    g.gain.value = volume * atten;

    if (typeof this.ctx.createStereoPanner === 'function' && Math.abs(pan) > 0.02) {
      const panner = this.ctx.createStereoPanner();
      panner.pan.value = pan;
      src.connect(panner);
      panner.connect(g);
    } else {
      src.connect(g);
    }

    g.connect(busNode);
    onNode?.(src);
    src.start(0);
  }

  // ==================== BMW M5 ENGINE & VEHICLE LOOP ====================

  public updateFrame(params: {
    rpm: number;
    speedKmh: number;
    throttle: number;
    brakingDecel: number;
    lateralSlip: number;
    engineRunning: boolean;
    active: boolean;
    environment: EnvironmentType;
    weather: WeatherType;
    timeOfDay: TimeOfDay;
    nearCrowdStrength: number; // 0..1 when near crosswalk/pedestrians
  }): void {
    if (!this.ctx || this.ctx.state !== 'running' || this.disposed) return;

    const t = this.ctx.currentTime;
    const engineActive = params.active && params.engineRunning && !this.settings.muted;

    const idleCh = this.loopChannels.get('m5_idle');
    const midCh = this.loopChannels.get('m5_mid');
    const highCh = this.loopChannels.get('m5_high');
    const turboCh = this.loopChannels.get('m5_turbo');

    if (engineActive) {
      const rpm = Math.max(700, Math.min(7600, params.rpm));
      // Smooth weights across idle (700..2400), mid (1500..4600), high (3400..7500)
      const wIdle = Math.max(0, Math.min(1, 1 - (rpm - 1400) / 1400));
      const wMid =
        rpm < 1200
          ? 0
          : rpm < 2600
            ? (rpm - 1200) / 1400
            : Math.max(0, 1 - (rpm - 3600) / 1800);
      const wHigh = Math.max(0, Math.min(1, (rpm - 3100) / 2400));

      const loadBoost = 0.72 + params.throttle * 0.42;
      const filterCutoff = 520 + (rpm / 7500) * 2600 + params.throttle * 1400;

      if (idleCh?.source) {
        idleCh.source.playbackRate.setTargetAtTime(0.84 + (rpm - 820) / 2600, t, 0.06);
        idleCh.gainNode.gain.setTargetAtTime(wIdle * 0.42 * loadBoost, t, 0.07);
        idleCh.filterNode?.frequency.setTargetAtTime(filterCutoff * 0.75, t, 0.07);
      }
      if (midCh?.source) {
        midCh.source.playbackRate.setTargetAtTime(0.65 + (rpm - 1400) / 3600, t, 0.06);
        midCh.gainNode.gain.setTargetAtTime(wMid * 0.46 * loadBoost, t, 0.07);
        midCh.filterNode?.frequency.setTargetAtTime(filterCutoff, t, 0.07);
      }
      if (highCh?.source) {
        highCh.source.playbackRate.setTargetAtTime(0.75 + (rpm - 3200) / 5200, t, 0.06);
        highCh.gainNode.gain.setTargetAtTime(wHigh * 0.50 * loadBoost, t, 0.07);
        highCh.filterNode?.frequency.setTargetAtTime(filterCutoff * 1.2, t, 0.07);
      }

      // Twin-turbo spool on throttle load
      const turboGain =
        params.throttle > 0.35 && rpm > 2300
          ? ((rpm - 2300) / 4800) * params.throttle * 0.24
          : 0;
      if (turboCh?.source) {
        turboCh.source.playbackRate.setTargetAtTime(0.85 + (rpm / 7500) * 0.55, t, 0.08);
        turboCh.gainNode.gain.setTargetAtTime(turboGain, t, 0.08);
      }

      // M5 overrun exhaust crackle/pop on rapid lift-off from high RPM
      if (this.prevThrottle > 0.55 && params.throttle < 0.08 && rpm > 3300) {
        if (this.canTrigger('exhaust_pop', 1.4)) {
          this.playVehicleSfx('m5_exhaust_pop', 0.42);
        }
      }
    } else {
      idleCh?.gainNode.gain.setTargetAtTime(0, t, 0.08);
      midCh?.gainNode.gain.setTargetAtTime(0, t, 0.08);
      highCh?.gainNode.gain.setTargetAtTime(0, t, 0.08);
      turboCh?.gainNode.gain.setTargetAtTime(0, t, 0.08);
    }
    this.prevThrottle = params.throttle;

    // Road / Tire / Wet / Skid layers
    const activeEnv = params.active && !this.settings.muted;
    const speedFactor = Math.min(1, Math.max(0, (params.speedKmh - 5) / 110));
    const asphaltCh = this.loopChannels.get('tire_asphalt');
    const wetCh = this.loopChannels.get('tire_wet');
    const skidCh = this.loopChannels.get('tire_skid');

    if (activeEnv && params.speedKmh > 4) {
      if (asphaltCh?.source) {
        asphaltCh.source.playbackRate.setTargetAtTime(0.75 + speedFactor * 0.75, t, 0.08);
        asphaltCh.gainNode.gain.setTargetAtTime(speedFactor * 0.34, t, 0.08);
        asphaltCh.filterNode?.frequency.setTargetAtTime(360 + speedFactor * 1200, t, 0.08);
      }
      const wetGain = params.weather === 'rain' ? speedFactor * 0.32 : 0;
      wetCh?.gainNode.gain.setTargetAtTime(wetGain, t, 0.1);

      const isSkidding =
        (params.lateralSlip > 0.54 && params.speedKmh > 22) ||
        (params.brakingDecel > 7.6 && params.speedKmh > 28);
      skidCh?.gainNode.gain.setTargetAtTime(isSkidding ? 0.30 : 0, t, 0.05);

      if (params.brakingDecel > 4.8 && params.speedKmh > 18 && this.canTrigger('brake_hard', 1.2)) {
        this.playVehicleSfx('brake_hard', 0.48);
      }
    } else {
      asphaltCh?.gainNode.gain.setTargetAtTime(0, t, 0.08);
      wetCh?.gainNode.gain.setTargetAtTime(0, t, 0.08);
      skidCh?.gainNode.gain.setTargetAtTime(0, t, 0.08);
    }

    // Environment & Weather Loops
    const envCity = this.loopChannels.get('env_city');
    const envHighway = this.loopChannels.get('env_highway');
    const envVillage = this.loopChannels.get('env_village');
    const envNight = this.loopChannels.get('env_night');
    const envRain = this.loopChannels.get('env_rain');
    const envWind = this.loopChannels.get('env_wind');
    const envCrowd = this.loopChannels.get('env_crowd');

    if (activeEnv) {
      envCity?.gainNode.gain.setTargetAtTime(params.environment === 'city' ? 0.22 : 0, t, 0.25);
      envHighway?.gainNode.gain.setTargetAtTime(params.environment === 'highway' ? 0.24 : 0, t, 0.25);
      envVillage?.gainNode.gain.setTargetAtTime(params.environment === 'village' ? 0.24 : 0, t, 0.25);
      envNight?.gainNode.gain.setTargetAtTime(params.timeOfDay === 'night' ? 0.20 : 0, t, 0.3);
      envRain?.gainNode.gain.setTargetAtTime(params.weather === 'rain' ? 0.28 : 0, t, 0.25);

      const windTarget =
        (params.weather === 'fog' ? 0.16 : params.weather === 'rain' ? 0.12 : 0.04) +
        Math.min(0.24, (params.speedKmh / 160) * 0.22);
      envWind?.gainNode.gain.setTargetAtTime(windTarget, t, 0.2);

      const crowdTarget =
        params.environment === 'city'
          ? Math.min(0.24, 0.04 + params.nearCrowdStrength * 0.2)
          : params.nearCrowdStrength * 0.15;
      envCrowd?.gainNode.gain.setTargetAtTime(crowdTarget, t, 0.2);
    } else {
      [envCity, envHighway, envVillage, envNight, envRain, envWind, envCrowd].forEach((ch) =>
        ch?.gainNode.gain.setTargetAtTime(0, t, 0.12)
      );
    }

    // Horn hold control
    const hornCh = this.loopChannels.get('horn');
    hornCh?.gainNode.gain.setTargetAtTime(this.hornActive && activeEnv ? 0.42 : 0, t, 0.02);
  }

  // Compatibility alias for pause/dispose calls
  public updateEngine(rpm: number, throttle: number, running: boolean): void {
    this.updateFrame({
      rpm,
      speedKmh: 0,
      throttle,
      brakingDecel: 0,
      lateralSlip: 0,
      engineRunning: running,
      active: running,
      environment: 'city',
      weather: 'sunny',
      timeOfDay: 'day',
      nearCrowdStrength: 0,
    });
  }

  // ==================== VEHICLE ONE-SHOTS & INTERACTIONS ====================

  public playVehicleSfx(key: VehicleSfxKey, volume = 0.72, cooldownSec = 0): void {
    if (cooldownSec > 0 && !this.canTrigger(`sfx_${key}`, cooldownSec)) return;
    const bus: BusName =
      key.startsWith('crash_') ||
      key === 'curb_hit' ||
      key === 'barrier_scrape' ||
      key === 'emergency_alert' ||
      key === 'system_warning' ||
      key === 'seatbelt_chime'
        ? 'alerts'
        : 'engine';
    this.playUrlOneShot(VEHICLE_SFX_URLS[key], bus, volume);
  }

  public setHorn(active: boolean): void {
    this.ensureStarted();
    this.hornActive = active;
    if (this.ctx && this.ctx.state === 'running') {
      const hornCh = this.loopChannels.get('horn');
      hornCh?.gainNode.gain.setTargetAtTime(
        active && !this.settings.muted ? 0.44 : 0,
        this.ctx.currentTime,
        0.02
      );
    }
  }

  public playHorn(): void {
    this.setHorn(true);
    window.setTimeout(() => this.setHorn(false), 260);
  }

  public tickBlinker(active: boolean, nowMs: number): boolean {
    if (!active) {
      this.blinkerPhase = false;
      return false;
    }
    if (nowMs - this.lastBlinkerTime > 420) {
      this.lastBlinkerTime = nowMs;
      this.blinkerPhase = !this.blinkerPhase;
      if (!this.settings.muted && this.ctx && this.ctx.state === 'running') {
        this.playVehicleSfx(this.blinkerPhase ? 'blinker_on' : 'blinker_off', 0.45);
      }
    }
    return this.blinkerPhase;
  }

  public playEngineStartup(): void {
    this.playVehicleSfx('m5_startup', 0.78, 0.8);
  }

  public playEngineShutdown(): void {
    this.playVehicleSfx('m5_shutdown', 0.72, 0.6);
  }

  public playDoorSound(): void {
    this.playVehicleSfx('door_open_close', 0.75, 0.45);
  }

  public playSeatbeltWarning(): void {
    this.playVehicleSfx('seatbelt_chime', 0.65, 6.0);
  }

  public playViolationChime(critical: boolean): void {
    this.ensureStarted();
    this.playVehicleSfx(critical ? 'emergency_alert' : 'system_warning', critical ? 0.78 : 0.66, 1.0);
  }

  public playCollisionSound(
    kind: 'building' | 'vehicle' | 'pedestrian' | 'cyclist' | 'curb',
    speedKmh: number,
    spatial?: SpatialSource
  ): void {
    if (kind === 'curb') {
      this.playUrlOneShot(VEHICLE_SFX_URLS.curb_hit, 'alerts', 0.78, spatial);
      return;
    }
    if (!this.canTrigger(`collision_${kind}`, 0.8)) return;

    if (kind === 'building') {
      const key: VehicleSfxKey = speedKmh > 28 ? 'crash_heavy' : 'barrier_scrape';
      this.playUrlOneShot(VEHICLE_SFX_URLS[key], 'alerts', 0.88, spatial);
      this.playVehicleSfx('emergency_alert', 0.65, 1.5);
    } else if (kind === 'vehicle') {
      const key: VehicleSfxKey = speedKmh > 24 ? 'crash_heavy' : 'crash_light';
      this.playUrlOneShot(VEHICLE_SFX_URLS[key], 'alerts', 0.9, spatial);
      this.playVehicleSfx('emergency_alert', 0.7, 1.5);
    } else {
      // Pedestrian / cyclist
      this.playUrlOneShot(VEHICLE_SFX_URLS.crash_light, 'alerts', 0.8, spatial);
      this.playVehicleSfx('emergency_alert', 0.85, 1.2);
      this.playPedestrianSpeech('ped_danger_1', spatial, 3.0);
    }
  }

  // ==================== AZERBAIJANI POLICE & EXAM SPEECH ====================

  public playPoliceChirp(spatial?: SpatialSource): void {
    this.ensureStarted();
    if (!this.ctx || this.ctx.state !== 'running' || this.settings.muted) return;
    if (!this.canTrigger('police_chirp', 3.0)) return;
    const busNode = this.buses.police;
    if (!busNode) return;

    const { pan, atten } = this.computeSpatial3D(spatial);
    if (atten <= 0.01) return;

    const t = this.ctx.currentTime;
    const osc = this.ctx.createOscillator();
    const g = this.ctx.createGain();
    osc.type = 'triangle';
    osc.frequency.setValueAtTime(680, t);
    osc.frequency.linearRampToValueAtTime(1180, t + 0.16);
    osc.frequency.linearRampToValueAtTime(720, t + 0.34);
    g.gain.setValueAtTime(0.16 * atten, t);
    g.gain.exponentialRampToValueAtTime(0.001, t + 0.38);

    if (typeof this.ctx.createStereoPanner === 'function') {
      const panner = this.ctx.createStereoPanner();
      panner.pan.value = pan;
      osc.connect(panner);
      panner.connect(g);
    } else {
      osc.connect(g);
    }
    g.connect(busNode);
    osc.start(t);
    osc.stop(t + 0.4);
  }

  public playPoliceSpeech(
    key: PoliceSpeechKey,
    options?: {
      priority?: 'normal' | 'high';
      cooldownSec?: number;
      spatial?: SpatialSource;
    }
  ): void {
    const cooldown = options?.cooldownSec ?? 8.0;
    if (cooldown > 0 && !this.canTrigger(`speech_${key}`, cooldown)) return;

    const priority = options?.priority ?? 'normal';
    if (priority === 'high') {
      this.speechQueue = [];
      try {
        this.activePoliceSource?.stop();
      } catch {
        // already stopped
      }
      this.activePoliceSource = null;
      this.startPoliceSpeechNow({ key, spatial: options?.spatial });
      return;
    }

    if (this.activePoliceSource) {
      if (this.speechQueue.length < 2 && !this.speechQueue.some((q) => q.key === key)) {
        this.speechQueue.push({ key, spatial: options?.spatial });
      }
      return;
    }

    this.startPoliceSpeechNow({ key, spatial: options?.spatial });
  }

  private startPoliceSpeechNow(item: QueuedSpeech): void {
    if (this.disposed || this.settings.muted || !this.ctx || this.ctx.state !== 'running') {
      return;
    }
    const url = POLICE_SPEECH_URLS[item.key];
    const buf = this.buffers.get(url);
    if (!buf) {
      void this.loadBuffer(url).then((loaded) => {
        if (loaded && !this.disposed && !this.activePoliceSource) {
          this.startPoliceSpeechNow(item);
        }
      });
      return;
    }

    const busNode = this.buses.police;
    if (!busNode) return;

    const { pan, atten } = this.computeSpatial3D(item.spatial);
    const src = this.ctx.createBufferSource();
    src.buffer = buf;

    const g = this.ctx.createGain();
    g.gain.value = 0.96 * Math.max(0.55, atten);

    if (typeof this.ctx.createStereoPanner === 'function' && Math.abs(pan) > 0.02) {
      const panner = this.ctx.createStereoPanner();
      panner.pan.value = pan;
      src.connect(panner);
      panner.connect(g);
    } else {
      src.connect(g);
    }

    g.connect(busNode);
    this.activePoliceSource = src;

    src.onended = () => {
      if (this.activePoliceSource === src) {
        this.activePoliceSource = null;
      }
      if (!this.disposed && this.speechQueue.length > 0) {
        const next = this.speechQueue.shift()!;
        this.startPoliceSpeechNow(next);
      }
    };

    src.start(0);
  }

  // ==================== AZERBAIJANI 3D PEDESTRIAN VOICES ====================

  public playPedestrianSpeech(
    key: PedestrianSpeechKey,
    spatial?: SpatialSource,
    cooldownSec = 10.0
  ): void {
    if (this.disposed || this.settings.muted || !this.ctx || this.ctx.state !== 'running') return;
    if (this.activePedSource) return; // Never overlap multiple pedestrian clips
    if (!this.canTrigger(`ped_${key}`, cooldownSec) || !this.canTrigger('ped_global', 4.5)) return;

    this.playUrlOneShot(PEDESTRIAN_SPEECH_URLS[key], 'pedestrian', 0.9, spatial, (src) => {
      this.activePedSource = src;
      src.onended = () => {
        if (this.activePedSource === src) {
          this.activePedSource = null;
        }
      };
    });
  }

  public clearSpeechQueue(): void {
    this.speechQueue = [];
    try {
      this.activePoliceSource?.stop();
    } catch {
      // ignore
    }
    this.activePoliceSource = null;
    try {
      this.activePedSource?.stop();
    } catch {
      // ignore
    }
    this.activePedSource = null;
  }

  public dispose(): void {
    this.disposed = true;
    this.clearSpeechQueue();
    for (const ch of this.loopChannels.values()) {
      try {
        ch.source?.stop();
      } catch {
        // ignore
      }
    }
    this.loopChannels.clear();
    try {
      if (this.ctx && this.ctx.state !== 'closed') {
        void this.ctx.close();
      }
    } catch {
      // ignore
    }
    this.ctx = null;
  }
}
