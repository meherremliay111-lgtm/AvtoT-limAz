import {
  EnvironmentType,
  GameMode,
  PoliceInteractionState,
  TimeOfDay,
  TrainingState,
  VehicleTelemetry,
  ViolationRecord,
  ViolationSeverity,
  WeatherType,
} from './types';
import { TrafficManager } from './trafficManager';
import { WorldData } from './worldBuilder';

function pointToSegmentDist(px: number, pz: number, x1: number, z1: number, x2: number, z2: number): number {
  const vx = x2 - x1;
  const vz = z2 - z1;
  const wx = px - x1;
  const wz = pz - z1;
  const c1 = wx * vx + wz * vz;
  if (c1 <= 0) return Math.hypot(px - x1, pz - z1);
  const c2 = vx * vx + vz * vz;
  if (c2 <= c1) return Math.hypot(px - x2, pz - z2);
  const b = c1 / c2;
  return Math.hypot(px - (x1 + b * vx), pz - (z1 + b * vz));
}

export class RulesEngine {
  private readonly mode: GameMode;
  private readonly environment: EnvironmentType;
  private readonly weather: WeatherType;
  private readonly timeOfDay: TimeOfDay;
  private readonly world: WorldData;

  public score = 100;
  public violations: ViolationRecord[] = [];
  public collisionCount = 0;
  public latestWarning: ViolationRecord | null = null;
  public latestWarningTimer = 0;

  public examFinished = false;
  public examPassed: boolean | null = null;
  public examFailReason: string | null = null;

  public nearbySignCode: string | null = null;
  public nearbySignTitle: string | null = null;
  public interactPrompt: string | null = null;

  public police: PoliceInteractionState = {
    pullOverActive: false,
    reason: '',
    pulledOverCompleted: false,
    documentsChecked: false,
    patrolDistanceM: 120,
    regulatorNearby: false,
    regulatorSignal: 'none',
    regulatorInstruction: '',
  };

  public training: TrainingState | null = null;

  private cooldowns = new Map<string, number>();
  private lastX = 0;
  private lastZ = 0;
  private hasLastPos = false;
  private steerTimer = 0;
  private noStoppingTimer = 0;
  private policeIgnoreTimer = 0;
  private policeClearTimer = 0;
  private stoppedAtStopSigns = new Set<string>();
  private passedSignLimits = new Map<string, number>();
  private activeSpeedLimit: number;
  private zoneLabel: string;

  // Callbacks to trigger audio chimes and Azerbaijani voice prompts
  private onViolationSound?: (critical: boolean, code: string) => void;
  private onPoliceChirp?: () => void;
  private onPoliceStoppedPrompt?: () => void;
  private onExamFinished?: (passed: boolean) => void;
  private onNavPrompt?: (
    key: 'nav_turn_right' | 'nav_turn_left' | 'nav_straight' | 'nav_crosswalk' | 'nav_stop_line'
  ) => void;

  private policeStoppedSpoken = false;
  private prevCrosswalkPromptId = '';

  constructor(
    mode: GameMode,
    environment: EnvironmentType,
    weather: WeatherType,
    timeOfDay: TimeOfDay,
    world: WorldData,
    callbacks?: {
      onViolationSound?: (critical: boolean, code: string) => void;
      onPoliceChirp?: () => void;
      onPoliceStoppedPrompt?: () => void;
      onExamFinished?: (passed: boolean) => void;
      onNavPrompt?: (
        key: 'nav_turn_right' | 'nav_turn_left' | 'nav_straight' | 'nav_crosswalk' | 'nav_stop_line'
      ) => void;
    }
  ) {
    this.mode = mode;
    this.environment = environment;
    this.weather = weather;
    this.timeOfDay = timeOfDay;
    this.world = world;
    this.onViolationSound = callbacks?.onViolationSound;
    this.onPoliceChirp = callbacks?.onPoliceChirp;
    this.onPoliceStoppedPrompt = callbacks?.onPoliceStoppedPrompt;
    this.onExamFinished = callbacks?.onExamFinished;
    this.onNavPrompt = callbacks?.onNavPrompt;

    this.activeSpeedLimit = environment === 'highway' ? 110 : 60;
    this.zoneLabel =
      environment === 'city'
        ? 'Bakı · Şəhər küçələri'
        : environment === 'village'
          ? 'Kənd yolu · Məhdud görünüş'
          : 'Bakı-Quba Avtomagistralı';

    if (mode === 'training') {
      this.training = this.createTrainingState();
    }
  }

  private createTrainingState(): TrainingState {
    const envSteps = [
      {
        id: 'seatbelt',
        title: '1. Təhlükəsizlik kəmərini bağlayın',
        instruction: 'Hərəkətə başlamazdan əvvəl [B] düyməsi və ya ekrandakı Kəmər düyməsi ilə təhlükəsizlik kəmərini bağlayın.',
        ruleRef: 'PDF səh. 17 · YHQ Maddə 37',
        completed: false,
      },
      {
        id: 'gear_drive',
        title: '2. Əl əyləcini endirin və D rejiminə keçin',
        instruction: 'Əl əyləcini buraxın ([H]) və avtomatik sürətlər qutusunu D (Hərəkət) rejiminə keçirin.',
        ruleRef: 'PDF səh. 58–59',
        completed: false,
      },
      {
        id: 'signal_start',
        title: '3. Dönmə siqnalı verib hərəkətə başlayın',
        instruction: 'Sola və ya sağa dönmə siqnalını yandırın ([Q] / [Z]) və sürəti 25 km/saatdan yuxarı qaldırın.',
        ruleRef: 'PDF səh. 36–37',
        completed: false,
      },
      {
        id: 'lights_check',
        title: '4. İşıq cihazlarını şəraitə uyğun yoxlayın',
        instruction:
          this.weather === 'fog'
            ? 'Dumanlı havada [L] ilə Yaxın + Duman faralarını qoşun (Uzaq işıq qadağandır!).'
            : this.timeOfDay === 'night'
              ? 'Gecə şəraitində [L] düyməsi ilə faraları yandırın.'
              : 'İşıq sistemini [L] ilə yoxlayın və yol nişanlarına əməl edərək 140 m sürün.',
        ruleRef: 'PDF səh. 52, 70–71',
        completed: false,
      },
      {
        id: 'distance_practice',
        title: '5. Qaydalara uyğun marşrut məşqi (320 m)',
        instruction:
          this.environment === 'city'
            ? 'İşıqforlara, piyada keçidlərinə və sürət limitinə əməl edərək 320 m yol qət edin.'
            : this.environment === 'village'
              ? 'Dar kənd yolunda sürət həddinə (40–60 km/s) əməl edərək 320 m yol qət edin.'
              : 'Magistralda zolağı qoruyaraq və 110 km/s limitini aşmadan 350 m qət edin.',
        ruleRef: 'PDF səh. 39, 62–69',
        completed: false,
      },
      {
        id: 'safe_park',
        title: '6. Sağa siqnalla təhlükəsiz dayanma (P)',
        instruction: 'Sağa dönmə siqnalını verin, tam dayanın və P (Parking) rejiminə keçin.',
        ruleRef: 'PDF səh. 40, 74–75',
        completed: false,
      },
    ];

    return {
      missionTitle:
        this.environment === 'city'
          ? 'Şəhər Praktiki Təlimi'
          : this.environment === 'village'
            ? 'Kənd Yolu Praktiki Təlimi'
            : 'Magistral Sürüş Təlimi',
      steps: envSteps,
      currentStepIndex: 0,
      feedbackText: envSteps[0].instruction,
      feedbackTone: 'info',
    };
  }

  public getCurrentSpeedLimit(): number {
    return this.activeSpeedLimit;
  }

  public getZoneLabel(): string {
    return this.zoneLabel;
  }

  private recordViolation(
    nowSec: number,
    code: string,
    title: string,
    description: string,
    correctBehavior: string,
    sourceRef: string,
    pointsDeducted: number,
    severity: ViolationSeverity,
    triggerPolicePullover = false
  ): void {
    const last = this.cooldowns.get(code) ?? -999;
    if (nowSec - last < 7.5) return;
    this.cooldowns.set(code, nowSec);

    const rec: ViolationRecord = {
      id: `${code}_${Math.round(nowSec * 10)}`,
      timestampSec: Math.round(nowSec),
      code,
      title,
      description,
      correctBehavior,
      sourceRef,
      pointsDeducted: this.mode === 'exam' ? pointsDeducted : 0,
      severity,
    };

    this.violations.unshift(rec);
    this.latestWarning = rec;
    this.latestWarningTimer = 6.5;
    this.onViolationSound?.(severity === 'critical', code);

    if (this.mode === 'training' && this.training) {
      this.training.feedbackText = `Səhv: ${title}. ${correctBehavior}`;
      this.training.feedbackTone = 'warning';
    }

    if (this.mode === 'exam' && !this.examFinished) {
      this.score = Math.max(0, this.score - pointsDeducted);
      if (severity === 'critical' || this.score <= 0) {
        this.score = 0;
        this.examFinished = true;
        this.examPassed = false;
        this.examFailReason = `${title} (${sourceRef})`;
        this.onExamFinished?.(false);
      }
    }

    if (triggerPolicePullover && !this.police.pullOverActive && this.mode !== 'exam') {
      this.police.pullOverActive = true;
      this.police.pulledOverCompleted = false;
      this.police.documentsChecked = false;
      this.policeStoppedSpoken = false;
      this.police.reason = title;
      this.policeIgnoreTimer = 0;
      this.onPoliceChirp?.();
    }
  }

  public handleInteract(telemetry: VehicleTelemetry, physicsRef: { fuelPercent: number }): string | null {
    // 1. DYP Police Document Check
    if (this.police.pullOverActive && !this.police.documentsChecked && telemetry.speedKmh <= 4) {
      this.police.pulledOverCompleted = true;
      this.police.documentsChecked = true;
      this.policeClearTimer = 3.2;
      return 'DYP sənəd yoxlaması tamamlandı: Sürücülük vəsiqəsi, Texpasport və İcbari sığorta təsdiqləndi.';
    }

    // 2. Fuel station refuel
    for (const fs of this.world.fuelStations) {
      if (Math.hypot(telemetry.x - fs.x, telemetry.z - fs.z) <= fs.radius + 3 && telemetry.speedKmh <= 5) {
        physicsRef.fuelPercent = 100;
        return 'YDM: Yanacaq çəni tam dolduruldu (100%).';
      }
    }
    return null;
  }

  public evaluate(
    dt: number,
    nowSec: number,
    telemetry: VehicleTelemetry,
    traffic: TrafficManager,
    collision: { collidedWith: 'building' | 'vehicle' | 'pedestrian' | 'cyclist' | null }
  ): void {
    if (this.latestWarningTimer > 0) {
      this.latestWarningTimer = Math.max(0, this.latestWarningTimer - dt);
      if (this.latestWarningTimer === 0) {
        this.latestWarning = null;
      }
    }

    // Update nearby road sign HUD indicator
    this.nearbySignCode = null;
    this.nearbySignTitle = null;
    for (const st of this.world.signTriggers) {
      const dist = Math.hypot(telemetry.x - st.x, telemetry.z - st.z);
      if (dist <= st.radius) {
        this.nearbySignCode = st.code;
        this.nearbySignTitle = st.title;
        if (st.ruleType === 'speed_limit' && st.limitValue) {
          this.activeSpeedLimit = st.limitValue;
        }
        if (st.ruleType === 'stop' && telemetry.speedKmh <= 2) {
          this.stoppedAtStopSigns.add(`${st.x}_${st.z}`);
        }
      }
    }

    // Update interact prompt
    this.interactPrompt = null;
    for (const fs of this.world.fuelStations) {
      if (Math.hypot(telemetry.x - fs.x, telemetry.z - fs.z) <= fs.radius + 3) {
        this.interactPrompt =
          telemetry.speedKmh <= 5
            ? 'Yanacaq doldurmaq üçün [E] düyməsinə basın'
            : 'YDM zonası: Yanacaq doldurmaq üçün dayanın';
      }
    }

    // Update Regulator (Nizamlayıcı) status
    if (this.world.regulatorPos) {
      const distReg = Math.hypot(telemetry.x - this.world.regulatorPos.x, telemetry.z - this.world.regulatorPos.z);
      const regInfo = traffic.getRegulatorSignal();
      this.police.regulatorNearby = distReg < 36;
      this.police.regulatorSignal = this.police.regulatorNearby ? regInfo.signal : 'none';
      this.police.regulatorInstruction = this.police.regulatorNearby ? regInfo.instruction : '';
    } else {
      this.police.regulatorNearby = false;
      this.police.regulatorSignal = 'none';
      this.police.regulatorInstruction = '';
    }

    // Police distance & pull-over resolution
    this.police.patrolDistanceM = traffic.getNearestPoliceDistance(telemetry.x, telemetry.z);
    traffic.setPolicePursuit(this.police.pullOverActive && !this.police.documentsChecked);

    if (this.police.pullOverActive) {
      if (this.police.documentsChecked) {
        this.policeClearTimer -= dt;
        if (this.policeClearTimer <= 0) {
          this.police.pullOverActive = false;
          this.police.pulledOverCompleted = false;
          this.police.documentsChecked = false;
          this.policeStoppedSpoken = false;
          this.police.reason = '';
        }
      } else if (telemetry.speedKmh <= 4) {
        this.police.pulledOverCompleted = true;
        this.interactPrompt = 'DYP əməkdaşına sənədləri təqdim etmək üçün [E] basın';
        if (!this.policeStoppedSpoken) {
          this.policeStoppedSpoken = true;
          this.onPoliceStoppedPrompt?.();
        }
      } else if (telemetry.speedKmh > 32) {
        this.policeIgnoreTimer += dt;
        if (this.policeIgnoreTimer > 9) {
          this.recordViolation(
            nowSec,
            'POLICE_IGNORE',
            'Yol polisinin saxlama əmrinə tabe olmama',
            'DYP patrulu sayrışan işıqlarla saxlama tələbi verdiyi halda hərəkəti davam etdirdiniz.',
            'Sağa dönmə siqnalı verib yolun sağ kənarında tam dayanın və E düyməsi ilə sənədləri təqdim edin.',
            'PDF səh. 18, 36 · YHQ Maddə 37, 48',
            100,
            'critical'
          );
          this.policeIgnoreTimer = 0;
        }
      }
    }

    if (this.examFinished) return;

    // 1. Collision check
    if (collision.collidedWith) {
      this.collisionCount += 1;
      const targetLabel =
        collision.collidedWith === 'pedestrian'
          ? 'piyada ilə toqquşma'
          : collision.collidedWith === 'cyclist'
            ? 'velosipedçi ilə toqquşma'
            : collision.collidedWith === 'vehicle'
              ? 'digər nəqliyyat vasitəsi ilə toqquşma'
              : 'yol kənarı maneə / bina ilə toqquşma';
      this.recordViolation(
        nowSec,
        'COLLISION',
        'Qəza / Toqquşma',
        `Hərəkət zamanı ${targetLabel} baş verdi.`,
        'Sürəti şəraitə uyğun seçin, ara məsafəsini və dönmə bucaqlarını qoruyun.',
        'PDF səh. 62–63 · DYP İmtahan Qaydası (-100 bal)',
        100,
        'critical',
        true
      );
    }

    // 2. Seatbelt & Handbrake checks while moving
    if (telemetry.speedKmh > 14 && !telemetry.seatbeltFastened) {
      this.recordViolation(
        nowSec,
        'NO_SEATBELT',
        'Təhlükəsizlik kəməri bağlanmayıb',
        'Hərəkətə başlamazdan əvvəl təhlükəsizlik kəməri bağlanmalıdır.',
        '[B] düyməsi ilə kəməri bağlayın.',
        'PDF səh. 17 · YHQ Maddə 37 (-10 bal)',
        10,
        'minor',
        true
      );
    }

    if (telemetry.speedKmh > 8 && telemetry.handbrakeEngaged) {
      this.recordViolation(
        nowSec,
        'HANDBRAKE_MOVE',
        'Əl əyləci çəkili vəziyyətdə hərəkət',
        'Avtomobili əl əyləcini endirmədən idarə edirsiniz.',
        '[H] düyməsi və ya ekran düyməsi ilə əl əyləcini buraxın.',
        'PDF səh. 63 · İmtahan qaydası (-10 bal)',
        10,
        'minor'
      );
    }

    // 3. Speed limit check
    const excess = telemetry.speedKmh - this.activeSpeedLimit;
    if (excess > 25) {
      this.recordViolation(
        nowSec,
        'SPEED_EXTREME',
        `Sürət həddinin kobud aşılması (${telemetry.speedKmh} / ${this.activeSpeedLimit} km/s)`,
        `Müəyyən olunmuş ${this.activeSpeedLimit} km/saat sürət həddini 25+ km/saat aşdınız.`,
        `Sürəti dərhal ${this.activeSpeedLimit} km/saatdan aşağı salın.`,
        'PDF səh. 39 · YHQ Maddə 50 (-100 bal)',
        100,
        'critical',
        true
      );
    } else if (excess > 6) {
      this.recordViolation(
        nowSec,
        'SPEED_LIMIT',
        `Sürət həddinin aşılması (${telemetry.speedKmh} / ${this.activeSpeedLimit} km/s)`,
        `Bu sahədə maksimum icazə verilən sürət ${this.activeSpeedLimit} km/saatdır.`,
        'Qaz pedalını buraxıb sürəti limit daxilinə qaytarın.',
        'PDF səh. 39 · YHQ Maddə 50 (-15 bal)',
        15,
        'minor',
        excess > 15
      );
    }

    // 4. Night headlights & Fog high-beam / Rain wipers
    if (telemetry.speedKmh > 15) {
      if (this.timeOfDay === 'night' && telemetry.headlights === 'off') {
        this.recordViolation(
          nowSec,
          'NO_HEADLIGHTS_NIGHT',
          'Gecə vaxtı faralar yandırılmayıb',
          'Sutkanın qaranlıq vaxtı yaxın və ya uzaq işıqlar qoşulmadan hərəkət qadağandır.',
          '[L] düyməsi ilə yaxın işıqları yandırın.',
          'PDF səh. 52, 70 · YHQ Maddə 73 (-15 bal)',
          15,
          'minor',
          true
        );
      }

      if (this.weather === 'fog' && telemetry.headlights === 'high') {
        this.recordViolation(
          nowSec,
          'FOG_HIGH_BEAM',
          'Dumanda uzaq işıqlardan istifadə',
          'Dumanlı havada uzaq işıq şüaları duman damcılarından əks olunaraq görməni bağlayır.',
          '[L] düyməsi ilə Yaxın + Duman faraları rejiminə keçin.',
          'PDF səh. 71 (-10 bal)',
          10,
          'minor'
        );
      }

      if (this.weather === 'rain' && !telemetry.wipersOn) {
        this.recordViolation(
          nowSec,
          'RAIN_NO_WIPERS',
          'Yağışda şüşəsilənlər qoşulmayıb',
          'Yağışlı havada ön şüşənin görünməsini təmin etmək üçün şüşəsilənləri aktiv edin.',
          '[V] düyməsi ilə şüşəsilənləri işə salın.',
          'PDF səh. 70 (-10 bal)',
          10,
          'minor'
        );
      }
    }

    // 5. Turn signal check on significant steering
    if (telemetry.speedKmh > 16 && Math.abs(telemetry.steeringAngle) > 0.28) {
      this.steerTimer += dt;
      if (this.steerTimer > 0.7 && telemetry.indicators === 'none') {
        this.recordViolation(
          nowSec,
          'NO_SIGNAL',
          'Dönmə siqnalı verilmədən manevr',
          'Dönmə və ya zolaq dəyişmə manevrinə başlamazdan əvvəl müvafiq dönmə işıq göstəricisini yandırmalısınız.',
          'Sola [Q] və ya sağa [Z] dönmə siqnalını vaxtında qoşun.',
          'PDF səh. 36, 63 · DYP İmtahan (-10 bal)',
          10,
          'minor'
        );
        this.steerTimer = 0;
      }
    } else {
      this.steerTimer = 0;
    }

    // 6. Traffic light & Stop line crossing check
    if (this.hasLastPos && telemetry.speedKmh > 4) {
      for (const pole of this.world.trafficLightPoles) {
        // Ignore if Nizamlayıcı is nearby and permitting movement (PDF p. 49)
        const nearReg =
          this.police.regulatorNearby &&
          (this.police.regulatorSignal === 'left_turn_allowed' ||
            this.police.regulatorSignal === 'speed_up');

        const light = traffic.getAxisLight(pole.axis);
        if (pole.axis === 'ns' && Math.abs(telemetry.x) < 8.5) {
          const crossed =
            pole.approachDir === 1
              ? this.lastZ < pole.stopLineCoord && telemetry.z >= pole.stopLineCoord
              : this.lastZ > pole.stopLineCoord && telemetry.z <= pole.stopLineCoord;
          if (crossed) {
            if (this.police.regulatorNearby && this.police.regulatorSignal === 'stop') {
              this.recordViolation(
                nowSec,
                'REGULATOR_STOP_FAIL',
                'Nizamlayıcının "Dayan" işarəsinə tabe olmama',
                'Nizamlayıcı əlini yuxarı qaldırdığı halda kəsişməyə daxil oldunuz.',
                'Nizamlayıcının işarəsi işıqfordan üstündür — tam dayanın.',
                'PDF səh. 49–50 · YHQ Maddə 59 (-100 bal)',
                100,
                'critical',
                true
              );
            } else if (!nearReg && light === 'red') {
              this.recordViolation(
                nowSec,
                'RED_LIGHT',
                'İşıqforun qırmızı işığında keçid',
                'Qadağanedici qırmızı işıq yandığı halda stop-xətti keçdiniz.',
                'Sarı və ya qırmızı işıqda stop-xətt qarşısında tam dayanın.',
                'PDF səh. 49, 63 · DYP İmtahan (-100 bal)',
                100,
                'critical',
                true
              );
            }
          }
        } else if (pole.axis === 'ew' && Math.abs(telemetry.z) < 8.5) {
          const crossed =
            pole.approachDir === 1
              ? this.lastX < pole.stopLineCoord && telemetry.x >= pole.stopLineCoord
              : this.lastX > pole.stopLineCoord && telemetry.x <= pole.stopLineCoord;
          if (crossed && !nearReg && light === 'red') {
            this.recordViolation(
              nowSec,
              'RED_LIGHT',
              'İşıqforun qırmızı işığında keçid',
              'Qadağanedici qırmızı işıq yandığı halda stop-xətti keçdiniz.',
              'Stop-xətt qarşısında tam dayanın.',
              'PDF səh. 49, 63 · DYP İmtahan (-100 bal)',
              100,
              'critical',
              true
            );
          }
        }
      }

      // 7. Solid line crossing check (PDF p. 63: crossing white/yellow solid line = -100)
      for (const seg of this.world.solidLineSegments) {
        const dPrev = pointToSegmentDist(this.lastX, this.lastZ, seg.x1, seg.z1, seg.x2, seg.z2);
        const dCurr = pointToSegmentDist(telemetry.x, telemetry.z, seg.x1, seg.z1, seg.x2, seg.z2);
        const crossedX =
          seg.x1 === seg.x2 &&
          ((this.lastX < seg.x1 && telemetry.x >= seg.x1) || (this.lastX > seg.x1 && telemetry.x <= seg.x1)) &&
          telemetry.z >= Math.min(seg.z1, seg.z2) &&
          telemetry.z <= Math.max(seg.z1, seg.z2);

        if (crossedX && (dPrev < 2.2 || dCurr < 2.2)) {
          this.recordViolation(
            nowSec,
            'SOLID_LINE',
            'Bütöv (qoşa və ya sarı) nişanlanma xəttini kəsmə',
            '1.1 / 1.3 bütöv ayırıcı və ya sarı kənar xəttini tapdalayaraq keçdiniz.',
            'Öz zolağınızda qalın; bütöv xətti kəsmək qəti qadağandır.',
            'PDF səh. 63 · DYP İmtahan (-100 bal)',
            100,
            'critical',
            true
          );
        }
      }
    }

    // 8. Crosswalk pedestrian yielding check
    for (const cw of this.world.crosswalks) {
      const inBox =
        Math.abs(telemetry.x - cw.x) <= cw.width * 0.55 &&
        Math.abs(telemetry.z - cw.z) <= cw.length * 0.55 + 1.4;
      if (inBox && telemetry.speedKmh > 5) {
        if (traffic.isPedestrianActiveOnCrosswalk(cw.x, cw.z, cw.width, cw.length)) {
          this.recordViolation(
            nowSec,
            'CROSSWALK_PEDESTRIAN',
            'Piyada keçidində piyadaya yol verməmə',
            'Zebra piyada keçidində piyada olduğu halda dayanmadan hərəkət etdiniz.',
            'Piyada keçidinə daxil olan piyadalar tam keçənə qədər dayanın.',
            'PDF səh. 63, 68–69 · DYP İmtahan (-100 bal)',
            100,
            'critical',
            true
          );
        }
      }
    }

    // 9. STOP (2.5) sign check
    for (const st of this.world.signTriggers) {
      if (st.ruleType === 'stop') {
        const dist = Math.hypot(telemetry.x - st.x, telemetry.z - st.z);
        const key = `${st.x}_${st.z}`;
        if (dist < 6.5 && telemetry.speedKmh > 14 && !this.stoppedAtStopSigns.has(key)) {
          this.recordViolation(
            nowSec,
            'STOP_SIGN_FAIL',
            '2.5 STOP nişanında dayanmama',
            '2.5 nişanı qarşısında sürəti tam 0 km/saata endirmədən keçdiniz.',
            'STOP nişanı tələb edir ki, tam dayanasınız (0 km/s), ətrafı yoxlayıb sonra hərəkət edəsiniz.',
            'PDF səh. 27, 75 · YHQ Əlavə 2 (2.5)',
            25,
            'minor'
          );
        }
      }
    }

    // 10. 3.27 No-Stopping Zone check
    let inNoStop = false;
    for (const nsz of this.world.noStoppingZones) {
      if (Math.hypot(telemetry.x - nsz.x, telemetry.z - nsz.z) < nsz.radius) {
        inNoStop = true;
      }
    }
    if (inNoStop && telemetry.speedKmh < 1) {
      this.noStoppingTimer += dt;
      if (this.noStoppingTimer > 3.5) {
        this.recordViolation(
          nowSec,
          'NO_STOPPING_ZONE',
          '3.27 "Dayanmaq qadağandır" zonasında dayanma',
          '3.27 nişanının təsir zonasında avtomobili saxladınız.',
          '5.15 Parklama meydançasına və ya icazəli sahəyə keçin.',
          'PDF səh. 40, 68 · YHQ Əlavə 3 (3.27)',
          15,
          'minor'
        );
        this.noStoppingTimer = 0;
      }
    } else {
      this.noStoppingTimer = 0;
    }

    // 11. Training mode progressive mission checks
    if (this.mode === 'training' && this.training) {
      this.updateTrainingProgress(telemetry);
    }

    // 12. Proactive navigation & safety voice prompts (crosswalks, stop lines, intersections)
    if (telemetry.speedKmh > 8 && this.onNavPrompt) {
      const fwdX = -Math.sin(telemetry.heading);
      const fwdZ = -Math.cos(telemetry.heading);

      for (const cw of this.world.crosswalks) {
        const dx = cw.x - telemetry.x;
        const dz = cw.z - telemetry.z;
        const d = Math.hypot(dx, dz);
        const ahead = dx * fwdX + dz * fwdZ;
        if (d < 22 && ahead > 6 && this.prevCrosswalkPromptId !== cw.id) {
          this.prevCrosswalkPromptId = cw.id;
          this.onNavPrompt('nav_crosswalk');
          break;
        }
      }

      for (const pole of this.world.trafficLightPoles) {
        if (pole.axis === 'ns' && Math.abs(telemetry.x) < 8) {
          const dz = pole.stopLineCoord - telemetry.z;
          const distAhead = dz * fwdZ;
          if (distAhead > 5 && distAhead < 22 && traffic.getAxisLight('ns') === 'red') {
            this.onNavPrompt('nav_stop_line');
            break;
          }
        }
      }

      // Upcoming intersection guidance in city/village
      if (this.environment === 'city' && Math.abs(telemetry.x) < 9 && telemetry.z > 20 && telemetry.z < 36 && fwdZ < -0.5) {
        const choices: Array<'nav_straight' | 'nav_turn_right' | 'nav_turn_left'> = [
          'nav_straight',
          'nav_turn_right',
          'nav_turn_left',
        ];
        this.onNavPrompt(choices[Math.floor(nowSec) % choices.length]);
      }
    }

    // 13. Exam mode completion check (600m clean route + safe parking)
    if (this.mode === 'exam' && !this.examFinished) {
      if (telemetry.distanceMeters >= 600 && telemetry.speedKmh <= 2 && telemetry.gear === 'P') {
        this.examFinished = true;
        this.examPassed = this.score >= 70;
        this.examFailReason = this.examPassed ? null : 'Keçid balı toplanmadı.';
        this.onExamFinished?.(Boolean(this.examPassed));
      }
    }

    this.lastX = telemetry.x;
    this.lastZ = telemetry.z;
    this.hasLastPos = true;
  }

  private updateTrainingProgress(t: VehicleTelemetry): void {
    if (!this.training) return;
    const steps = this.training.steps;
    const idx = this.training.currentStepIndex;
    if (idx >= steps.length) return;

    const current = steps[idx];
    let done = false;

    if (current.id === 'seatbelt' && t.seatbeltFastened) {
      done = true;
    } else if (current.id === 'gear_drive' && !t.handbrakeEngaged && t.gear === 'D') {
      done = true;
    } else if (current.id === 'signal_start' && t.indicators !== 'none' && t.speedKmh >= 20) {
      done = true;
    } else if (current.id === 'lights_check') {
      if (this.weather === 'fog' && t.headlights === 'fog') done = true;
      else if (this.timeOfDay === 'night' && (t.headlights === 'low' || t.headlights === 'high')) done = true;
      else if (this.weather !== 'fog' && this.timeOfDay === 'day' && t.distanceMeters >= 130) done = true;
    } else if (current.id === 'distance_practice' && t.distanceMeters >= 320) {
      done = true;
    } else if (current.id === 'safe_park' && t.distanceMeters >= 320 && t.speedKmh <= 2 && t.gear === 'P') {
      done = true;
    }

    if (done) {
      current.completed = true;
      if (idx + 1 < steps.length) {
        this.training.currentStepIndex = idx + 1;
        this.training.feedbackText = `Əla! Növbəti tapşırıq: ${steps[idx + 1].instruction}`;
        this.training.feedbackTone = 'success';
      } else {
        this.training.currentStepIndex = steps.length;
        this.training.feedbackText =
          'Təbrik edirik! Bütün təlim mərhələlərini uğurla tamamladınız. Sərbəst sürüşə və ya İmtahana keçə bilərsiniz.';
        this.training.feedbackTone = 'success';
      }
    }
  }
}
