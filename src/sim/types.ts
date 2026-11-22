export type GearMode = 'P' | 'R' | 'N' | 'D';
export type EnvironmentType = 'city' | 'village' | 'highway';
export type WeatherType = 'sunny' | 'rain' | 'fog';
export type TimeOfDay = 'day' | 'night';
export type CameraMode = 'third' | 'first';
export type TrafficDensity = 'low' | 'medium' | 'high';
export type GameMode = 'training' | 'free' | 'exam';
export type HeadlightMode = 'off' | 'low' | 'high' | 'fog';
export type IndicatorState = 'none' | 'left' | 'right' | 'hazard';

export type VehicleColorId = 'marina_bay' | 'frozen_black' | 'alpine_white' | 'toronto_red' | 'donington_grey';

export interface VehicleConfig {
  id: string;
  name: string;
  subtitle: string;
  colorId: VehicleColorId;
  colorHex: string;
  transmission: 'Avtomatik (M Steptronic 8-pilləli)';
  engine: string;
  powerHp: number;
  category: string;
  plateNumber: string;
}

export interface SimulationConfig {
  mode: GameMode;
  environment: EnvironmentType;
  weather: WeatherType;
  timeOfDay: TimeOfDay;
  trafficDensity: TrafficDensity;
  vehicleColor: VehicleColorId;
}

export interface VehicleTelemetry {
  x: number;
  z: number;
  heading: number; // radians
  speedKmh: number;
  rpm: number;
  gear: GearMode;
  autoGearStep: number; // 1..8 when in D
  steeringAngle: number; // radians (-0.6..0.6)
  fuelPercent: number;
  seatbeltFastened: boolean;
  handbrakeEngaged: boolean;
  headlights: HeadlightMode;
  indicators: IndicatorState;
  wipersOn: boolean;
  hornActive: boolean;
  brakePressed: boolean;
  gasPressed: boolean;
  engineRunning: boolean;
  currentSpeedLimit: number;
  inZoneLabel: string;
  distanceMeters: number;
  elapsedSeconds: number;
}

export type ViolationSeverity = 'minor' | 'critical';

export interface ViolationRecord {
  id: string;
  timestampSec: number;
  code: string;
  title: string;
  description: string;
  correctBehavior: string;
  sourceRef: string;
  pointsDeducted: number;
  severity: ViolationSeverity;
}

export type PoliceSignalType = 'none' | 'stop' | 'slow_down' | 'speed_up' | 'left_turn_allowed';

export interface PoliceInteractionState {
  pullOverActive: boolean;
  reason: string;
  pulledOverCompleted: boolean;
  documentsChecked: boolean;
  patrolDistanceM: number;
  regulatorNearby: boolean;
  regulatorSignal: PoliceSignalType;
  regulatorInstruction: string;
}

export interface TrainingStep {
  id: string;
  title: string;
  instruction: string;
  ruleRef: string;
  completed: boolean;
}

export interface TrainingState {
  missionTitle: string;
  steps: TrainingStep[];
  currentStepIndex: number;
  feedbackText: string;
  feedbackTone: 'info' | 'success' | 'warning';
}

export interface ExamResultSummary {
  id: string;
  dateIso: string;
  mode: GameMode;
  environment: EnvironmentType;
  weather: WeatherType;
  timeOfDay: TimeOfDay;
  startingScore: number;
  finalScore: number;
  passed: boolean;
  failReason: string | null;
  durationSec: number;
  distanceMeters: number;
  violations: ViolationRecord[];
}

export interface HudSnapshot {
  telemetry: VehicleTelemetry;
  cameraMode: CameraMode;
  police: PoliceInteractionState;
  training: TrainingState | null;
  score: number;
  violations: ViolationRecord[];
  collisionCount: number;
  latestWarning: ViolationRecord | null;
  nearbySignCode: string | null;
  nearbySignTitle: string | null;
  examFinished: boolean;
  examPassed: boolean | null;
  examFailReason: string | null;
  interactPrompt: string | null;
}

export interface ControlInputs {
  throttle: number; // 0..1
  brake: number; // 0..1
  handbrake: boolean;
  steerInput: number; // -1 (right) to +1 (left) or keyboard smooth
  steerTarget: number | null; // direct wheel angle -1..1 for touch wheel
}
