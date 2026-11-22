export interface AudioSettings {
  muted: boolean;
  masterVolume: number;      // 0..1 Ümumi səs səviyyəsi
  engineVolume: number;      // 0..1 BMW M5 mühərrik səsi
  environmentVolume: number; // 0..1 Yol və ətraf mühit səsləri
  pedestrianVolume: number;  // 0..1 Piyada səsləri
  policeVolume: number;      // 0..1 Yol polisi və imtahan nitqləri
  alertsVolume: number;      // 0..1 Xəbərdarlıq və qəza səsləri
}

export const DEFAULT_AUDIO_SETTINGS: AudioSettings = {
  muted: false,
  masterVolume: 0.85,
  engineVolume: 0.85,
  environmentVolume: 0.72,
  pedestrianVolume: 0.82,
  policeVolume: 0.92,
  alertsVolume: 0.88,
};

export type PoliceSpeechKey =
  | 'police_pullover'
  | 'police_engine_off'
  | 'police_license'
  | 'police_docs'
  | 'warn_seatbelt'
  | 'warn_speed'
  | 'warn_crosswalk'
  | 'warn_sign'
  | 'exam_start'
  | 'nav_turn_right'
  | 'nav_turn_left'
  | 'nav_straight'
  | 'nav_crosswalk'
  | 'nav_stop_line'
  | 'exam_pass'
  | 'exam_fail';

export type PedestrianSpeechKey =
  | 'ped_talk_1'
  | 'ped_talk_2'
  | 'ped_wait_1'
  | 'ped_wait_2'
  | 'ped_alert_1'
  | 'ped_danger_1';

export type VehicleSfxKey =
  | 'm5_startup'
  | 'm5_shutdown'
  | 'm5_exhaust_pop'
  | 'brake_hard'
  | 'blinker_on'
  | 'blinker_off'
  | 'door_open_close'
  | 'seatbelt_chime'
  | 'crash_light'
  | 'crash_heavy'
  | 'curb_hit'
  | 'barrier_scrape'
  | 'emergency_alert'
  | 'system_warning';
