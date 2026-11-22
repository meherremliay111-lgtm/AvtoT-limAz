import React, { useEffect, useRef, useState } from 'react';
import {
  AlertTriangle,
  Camera,
  CheckCircle2,
  ChevronDown,
  ChevronUp,
  CloudRain,
  DoorOpen,
  Eye,
  Fuel,
  Gauge,
  Lightbulb,
  Moon,
  Pause,
  Play,
  Power,
  RotateCcw,
  ShieldAlert,
  ShieldCheck,
  Sliders,
  Sun,
  Volume2,
  VolumeX,
  Wind,
  X,
} from 'lucide-react';
import { ROAD_SIGNS } from '../data/roadSigns';
import { loadAudioSettings } from '../sim/audio';
import { AudioSettings } from '../sim/audioTypes';
import { SimulatorEngine } from '../sim/SimulatorEngine';
import {
  ExamResultSummary,
  GearMode,
  HudSnapshot,
  SimulationConfig,
  TimeOfDay,
  WeatherType,
} from '../sim/types';
import { AudioSettingsPanel } from './AudioSettingsPanel';
import { RoadSignSvg } from './RoadSignSvg';

interface SimulatorViewProps {
  config: SimulationConfig;
  onExit: () => void;
  onSaveResult: (result: ExamResultSummary) => void;
  onAnalyzeExamWithAi: (result: ExamResultSummary) => void;
}

const GEAR_MODES: GearMode[] = ['P', 'R', 'N', 'D'];

export const SimulatorView: React.FC<SimulatorViewProps> = ({
  config,
  onExit,
  onSaveResult,
  onAnalyzeExamWithAi,
}) => {
  const mountRef = useRef<HTMLDivElement | null>(null);
  const engineRef = useRef<SimulatorEngine | null>(null);
  const savedExamRef = useRef(false);

  const [hud, setHud] = useState<HudSnapshot | null>(null);
  const [toast, setToast] = useState<string | null>(null);
  const [paused, setPaused] = useState(false);
  const [audioSettings, setAudioSettings] = useState<AudioSettings>(() => loadAudioSettings());
  const [audioPanelOpen, setAudioPanelOpen] = useState(false);
  const [controlsOpen, setControlsOpen] = useState(true);
  const [weather, setWeather] = useState<WeatherType>(config.weather);
  const [timeOfDay, setTimeOfDay] = useState<TimeOfDay>(config.timeOfDay);
  const [wheelSteer, setWheelSteer] = useState(0); // -1..1 for visual wheel

  useEffect(() => {
    if (!mountRef.current) return;
    savedExamRef.current = false;

    const engine = new SimulatorEngine(
      mountRef.current,
      {
        mode: config.mode,
        environment: config.environment,
        weather: config.weather,
        timeOfDay: config.timeOfDay,
        trafficDensity: config.trafficDensity,
        vehicleColor: config.vehicleColor,
      },
      (snapshot) => {
        setHud(snapshot);
      },
      (msg) => {
        setToast(msg);
        window.setTimeout(() => setToast(null), 4000);
      }
    );
    engineRef.current = engine;

    return () => {
      engine.dispose();
      engineRef.current = null;
    };
  }, [
    config.mode,
    config.environment,
    config.weather,
    config.timeOfDay,
    config.trafficDensity,
    config.vehicleColor,
  ]);

  // Save finished exam automatically once
  useEffect(() => {
    if (hud?.examFinished && !savedExamRef.current && config.mode === 'exam') {
      savedExamRef.current = true;
      const summary: ExamResultSummary = {
        id: `exam_${Date.now()}`,
        dateIso: new Date().toISOString(),
        mode: config.mode,
        environment: config.environment,
        weather,
        timeOfDay,
        startingScore: 100,
        finalScore: hud.score,
        passed: Boolean(hud.examPassed),
        failReason: hud.examFailReason,
        durationSec: hud.telemetry.elapsedSeconds,
        distanceMeters: hud.telemetry.distanceMeters,
        violations: hud.violations,
      };
      onSaveResult(summary);
    }
  }, [hud?.examFinished, hud?.examPassed, hud?.score, hud?.examFailReason, hud?.telemetry.elapsedSeconds, hud?.telemetry.distanceMeters, hud?.violations, config.mode, config.environment, weather, timeOfDay, onSaveResult]);

  const handleWeatherChange = (w: WeatherType) => {
    setWeather(w);
    engineRef.current?.setWeatherAndTime(w, timeOfDay);
  };

  const handleTimeChange = (t: TimeOfDay) => {
    setTimeOfDay(t);
    engineRef.current?.setWeatherAndTime(weather, t);
  };

  const handleTogglePause = () => {
    const next = !paused;
    setPaused(next);
    engineRef.current?.setPaused(next);
  };

  const handleAudioSettingsChange = (patch: Partial<AudioSettings>) => {
    if (engineRef.current) {
      const updated = engineRef.current.updateAudioSettings(patch);
      setAudioSettings(updated);
    } else {
      setAudioSettings((prev) => ({ ...prev, ...patch }));
    }
  };

  const handleToggleMute = () => {
    handleAudioSettingsChange({ muted: !audioSettings.muted });
  };

  const resetExam = () => {
    savedExamRef.current = false;
    setPaused(false);
    setToast(null);
    setWheelSteer(0);
    engineRef.current?.resetExam();
    if (document.activeElement instanceof HTMLElement) {
      document.activeElement.blur();
    }
  };

  const handleRestart = () => {
    resetExam();
  };

  // Interactive rotary steering wheel pointer drag (works on mouse & mobile touch)
  const wheelDraggingRef = useRef(false);
  const wheelCenterRef = useRef<{ x: number; y: number }>({ x: 0, y: 0 });

  const updateWheelFromPointer = (clientX: number, clientY: number) => {
    const dx = clientX - wheelCenterRef.current.x;
    const dy = clientY - wheelCenterRef.current.y;
    let angle = Math.atan2(dx, -dy); // 0 is top, +right, -left
    angle = Math.max(-1.35, Math.min(1.35, angle));
    const norm = -angle / 1.35; // +1 left, -1 right matching VehiclePhysics
    setWheelSteer(angle);
    engineRef.current?.setTouchSteerTarget(norm);
  };

  const handleWheelPointerDown = (e: React.PointerEvent<HTMLDivElement>) => {
    e.currentTarget.setPointerCapture(e.pointerId);
    const rect = e.currentTarget.getBoundingClientRect();
    wheelCenterRef.current = { x: rect.left + rect.width / 2, y: rect.top + rect.height / 2 };
    wheelDraggingRef.current = true;
    updateWheelFromPointer(e.clientX, e.clientY);
  };

  const handleWheelPointerMove = (e: React.PointerEvent<HTMLDivElement>) => {
    if (!wheelDraggingRef.current) return;
    updateWheelFromPointer(e.clientX, e.clientY);
  };

  const handleWheelPointerUp = () => {
    wheelDraggingRef.current = false;
    setWheelSteer(0);
    engineRef.current?.setTouchSteerTarget(null);
  };

  const nearbySignObj = hud?.nearbySignCode
    ? ROAD_SIGNS.find((s) => s.code === hud.nearbySignCode) ?? null
    : null;

  const t = hud?.telemetry;
  const speedLimit = t?.currentSpeedLimit ?? (config.environment === 'highway' ? 110 : 60);
  const overSpeed = (t?.speedKmh ?? 0) > speedLimit;
  const headlightLabel =
    t?.headlights === 'off'
      ? 'Sönülü'
      : t?.headlights === 'low'
        ? 'Yaxın'
        : t?.headlights === 'high'
          ? 'Uzaq'
          : 'Duman';

  return (
    <div className="relative h-screen w-screen overflow-hidden bg-slate-950 text-slate-100 select-none">
      {/* Isolated WebGL Viewport — NO backdrop-blur anywhere on top */}
      <div ref={mountRef} className="absolute inset-0 h-full w-full" />

      {/* Top Compact Telemetry Strip */}
      <header className="relative z-20 flex flex-wrap items-center justify-between gap-2 border-b border-slate-800 bg-slate-950/92 px-3 py-2 sm:px-5">
        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={onExit}
            className="flex items-center gap-1.5 rounded-lg border border-slate-700 bg-slate-900 px-2.5 py-1.5 text-xs font-medium text-slate-200 hover:bg-slate-800"
          >
            <X className="h-3.5 w-3.5" />
            Çıxış
          </button>

          <div className="hidden md:flex flex-col">
            <span className="text-xs font-semibold text-white">
              BMW M5 · {config.mode === 'exam' ? 'İmtahan Rejimi' : config.mode === 'training' ? 'Təlim Rejimi' : 'Sərbəst Sürüş'}
            </span>
            <span className="text-[11px] text-slate-400">
              {t?.inZoneLabel || 'Yüklənir...'}
            </span>
          </div>
        </div>

        {/* Center Live Gauges */}
        <div className="flex items-center gap-3 sm:gap-5">
          <div className="flex items-baseline gap-1.5">
            <span
              className={`font-mono text-2xl sm:text-3xl font-bold tabular-nums ${
                overSpeed ? 'text-red-400' : 'text-white'
              }`}
            >
              {t?.speedKmh ?? 0}
            </span>
            <span className="text-[11px] text-slate-400">km/s</span>
          </div>

          <div className="flex items-center gap-1.5 rounded-md border border-slate-700 bg-slate-900 px-2 py-1">
            <span className="font-mono text-sm font-bold text-amber-400 tabular-nums">
              {t?.gear ?? 'P'}
              {t?.gear === 'D' ? t.autoGearStep : ''}
            </span>
            <span className="text-[11px] text-slate-400 tabular-nums">
              {t?.rpm ?? 820} dövr
            </span>
          </div>

          {/* Active Speed Limit Sign */}
          <div
            className="flex h-9 w-9 items-center justify-center rounded-full border-[3px] border-red-600 bg-white font-mono text-xs font-extrabold text-slate-950 tabular-nums"
            title="Aktiv sürət limiti"
          >
            {speedLimit}
          </div>

          <div className="hidden sm:flex items-center gap-3 text-xs text-slate-300 tabular-nums">
            <span className="flex items-center gap-1">
              <Fuel className="h-3.5 w-3.5 text-sky-400" />
              {t?.fuelPercent ?? 88}%
            </span>
            <span>
              {t?.distanceMeters ?? 0} m{config.mode === 'exam' ? ' / 600 m' : ''}
            </span>
            {config.mode === 'exam' && (
              <span
                className={`font-semibold ${
                  (hud?.score ?? 100) >= 70 ? 'text-emerald-400' : 'text-red-400'
                }`}
              >
                Bal: {hud?.score ?? 100}/100
              </span>
            )}
          </div>
        </div>

        {/* Right Quick Controls */}
        <div className="flex items-center gap-1.5">
          {config.mode === 'free' && (
            <div className="hidden lg:flex items-center gap-1 rounded-lg border border-slate-800 bg-slate-900 p-0.5">
              <button
                type="button"
                onClick={() => handleWeatherChange('sunny')}
                className={`rounded px-2 py-1 text-[11px] ${weather === 'sunny' ? 'bg-sky-600 text-white' : 'text-slate-400'}`}
                title="Günəşli"
              >
                <Sun className="h-3.5 w-3.5" />
              </button>
              <button
                type="button"
                onClick={() => handleWeatherChange('rain')}
                className={`rounded px-2 py-1 text-[11px] ${weather === 'rain' ? 'bg-sky-600 text-white' : 'text-slate-400'}`}
                title="Yağışlı"
              >
                <CloudRain className="h-3.5 w-3.5" />
              </button>
              <button
                type="button"
                onClick={() => handleWeatherChange('fog')}
                className={`rounded px-2 py-1 text-[11px] ${weather === 'fog' ? 'bg-sky-600 text-white' : 'text-slate-400'}`}
                title="Dumanlı"
              >
                <Wind className="h-3.5 w-3.5" />
              </button>
              <button
                type="button"
                onClick={() => handleTimeChange(timeOfDay === 'day' ? 'night' : 'day')}
                className={`rounded px-2 py-1 text-[11px] ${timeOfDay === 'night' ? 'bg-indigo-600 text-white' : 'text-amber-400'}`}
                title="Gündüz / Gecə"
              >
                {timeOfDay === 'night' ? <Moon className="h-3.5 w-3.5" /> : <Sun className="h-3.5 w-3.5" />}
              </button>
            </div>
          )}

          <button
            type="button"
            onClick={() => engineRef.current?.toggleCamera()}
            className="flex items-center gap-1 rounded-lg border border-slate-700 bg-slate-900 px-2.5 py-1.5 text-xs font-medium text-slate-200 hover:bg-slate-800"
            title="Kamera rejimi (C)"
          >
            <Camera className="h-3.5 w-3.5 text-sky-400" />
            <span className="hidden sm:inline">{hud?.cameraMode === 'first' ? 'Sürücü [C]' : 'Arxa [C]'}</span>
          </button>

          <button
            type="button"
            onClick={handleToggleMute}
            className="rounded-lg border border-slate-700 bg-slate-900 p-1.5 text-slate-200 hover:bg-slate-800"
            title={audioSettings.muted ? 'Səsi aç' : 'Səsi söndür'}
            data-testid="audio-mute-btn"
          >
            {audioSettings.muted ? (
              <VolumeX className="h-4 w-4 text-slate-400" />
            ) : (
              <Volume2 className="h-4 w-4 text-emerald-400" />
            )}
          </button>

          <button
            type="button"
            onClick={() => setAudioPanelOpen((o) => !o)}
            className={`flex items-center gap-1 rounded-lg border px-2 py-1.5 text-xs font-medium ${
              audioPanelOpen
                ? 'border-sky-500 bg-sky-950/70 text-sky-300'
                : 'border-slate-700 bg-slate-900 text-slate-200 hover:bg-slate-800'
            }`}
            title="Səs parametrləri"
            data-testid="audio-settings-btn"
          >
            <Sliders className="h-3.5 w-3.5" />
            <span className="hidden sm:inline">Səs</span>
          </button>

          <button
            type="button"
            onClick={handleTogglePause}
            className="rounded-lg border border-slate-700 bg-slate-900 p-1.5 text-slate-200 hover:bg-slate-800"
            title="Fasilə"
          >
            {paused ? <Play className="h-4 w-4 text-emerald-400" /> : <Pause className="h-4 w-4" />}
          </button>

          <button
            type="button"
            onClick={handleRestart}
            className="rounded-lg border border-slate-700 bg-slate-900 p-1.5 text-slate-200 hover:bg-slate-800"
            title="Yenidən başla"
          >
            <RotateCcw className="h-4 w-4" />
          </button>
        </div>
      </header>

      {audioPanelOpen && (
        <AudioSettingsPanel
          settings={audioSettings}
          onChange={handleAudioSettingsChange}
          onClose={() => setAudioPanelOpen(false)}
        />
      )}

      {/* Left Floating Stack: Training Guide / Nizamlayıcı / Nearby Sign */}
      <div className="pointer-events-none absolute left-3 top-16 z-20 flex max-w-sm flex-col gap-2">
        {hud?.training && (
          <div className="pointer-events-auto rounded-xl border border-slate-700 bg-slate-950/92 p-3 shadow-lg">
            <div className="flex items-center justify-between text-xs font-semibold text-sky-400">
              <span>{hud.training.missionTitle}</span>
              <span className="tabular-nums">
                {Math.min(hud.training.currentStepIndex + 1, hud.training.steps.length)} / {hud.training.steps.length}
              </span>
            </div>
            <p
              className={`mt-1.5 text-xs leading-relaxed ${
                hud.training.feedbackTone === 'warning'
                  ? 'text-amber-300'
                  : hud.training.feedbackTone === 'success'
                    ? 'text-emerald-300'
                    : 'text-slate-200'
              }`}
            >
              {hud.training.feedbackText}
            </p>
            <div className="mt-2 flex flex-col gap-1">
              {hud.training.steps.map((st, idx) => (
                <div
                  key={st.id}
                  className={`flex items-center gap-1.5 text-[11px] ${
                    st.completed
                      ? 'text-emerald-400 line-through opacity-75'
                      : idx === hud.training?.currentStepIndex
                        ? 'font-semibold text-white'
                        : 'text-slate-500'
                  }`}
                >
                  <CheckCircle2 className="h-3 w-3 shrink-0" />
                  <span className="truncate">{st.title}</span>
                </div>
              ))}
            </div>
          </div>
        )}

        {hud?.police.regulatorNearby && (
          <div className="rounded-xl border border-lime-500/60 bg-slate-950/94 p-3 shadow-lg">
            <div className="flex items-center gap-2 text-xs font-bold text-lime-400">
              <ShieldAlert className="h-4 w-4" />
              DYP Nizamlayıcısı (YHQ Maddə 59)
            </div>
            <p className="mt-1 text-xs text-slate-200">{hud.police.regulatorInstruction}</p>
          </div>
        )}

        {nearbySignObj && (
          <div className="flex items-center gap-3 rounded-xl border border-slate-700 bg-slate-950/92 p-2.5 shadow-lg">
            <RoadSignSvg sign={nearbySignObj} size={46} className="shrink-0" />
            <div className="min-w-0">
              <div className="text-xs font-bold text-white">
                {nearbySignObj.code} · {nearbySignObj.name}
              </div>
              <div className="mt-0.5 text-[11px] text-slate-300 line-clamp-2">
                {nearbySignObj.driverAction}
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Right / Top-Center Alerts: Violation Toast, DYP Pullover, Interact Prompt */}
      <div className="pointer-events-none absolute right-3 top-16 z-20 flex max-w-sm flex-col items-end gap-2">
        {hud?.police.pullOverActive && (
          <div className="pointer-events-auto rounded-xl border-2 border-red-500 bg-slate-950/95 p-3.5 shadow-xl">
            <div className="flex items-center justify-between gap-2 text-xs font-bold text-red-400">
              <span className="flex items-center gap-1.5">
                <ShieldAlert className="h-4 w-4" />
                DYP PATRUL SAXLAMASI
              </span>
              <span className="font-mono tabular-nums">{hud.police.patrolDistanceM} m</span>
            </div>
            <p className="mt-1 text-xs text-slate-200">
              Səbəb: <span className="font-semibold text-white">{hud.police.reason}</span>
            </p>
            <p className="mt-1.5 text-[11px] text-slate-300">
              {hud.police.documentsChecked
                ? 'Sənədlər yoxlanıldı. Qaydalara əməl edərək hərəkəti davam etdirin.'
                : hud.police.pulledOverCompleted
                  ? 'Avtomobil dayandı. Sənədləri (Vəsiqə, Texpasport, Sığorta) təqdim edin:'
                  : 'Sağa dönmə siqnalını verib avtomobili tam dayandırın!'}
            </p>
            {hud.police.pulledOverCompleted && !hud.police.documentsChecked && (
              <button
                type="button"
                onClick={() => engineRef.current?.triggerInteract()}
                className="mt-2 w-full rounded-lg bg-sky-600 px-3 py-1.5 text-xs font-semibold text-white hover:bg-sky-500"
              >
                Sənədləri təqdim et [E]
              </button>
            )}
          </div>
        )}

        {hud?.latestWarning && (
          <div
            className={`pointer-events-auto rounded-xl border p-3 shadow-xl ${
              hud.latestWarning.severity === 'critical'
                ? 'border-red-500 bg-red-950/95'
                : 'border-amber-500 bg-slate-950/95'
            }`}
          >
            <div className="flex items-center justify-between gap-2 text-xs font-bold text-white">
              <span className="flex items-center gap-1.5 text-amber-300">
                <AlertTriangle className="h-4 w-4" />
                {hud.latestWarning.title}
              </span>
              {hud.latestWarning.pointsDeducted > 0 && (
                <span className="font-mono text-red-400 tabular-nums">
                  -{hud.latestWarning.pointsDeducted} bal
                </span>
              )}
            </div>
            <p className="mt-1 text-xs text-slate-200">{hud.latestWarning.description}</p>
            <p className="mt-1 text-[11px] text-emerald-300">
              Düzgün qayda: {hud.latestWarning.correctBehavior}
            </p>
            <div className="mt-1 text-[10px] text-slate-400">{hud.latestWarning.sourceRef}</div>
          </div>
        )}

        {hud?.interactPrompt && !hud.police.pullOverActive && (
          <button
            type="button"
            onClick={() => engineRef.current?.triggerInteract()}
            className="pointer-events-auto rounded-lg border border-sky-500 bg-sky-950/95 px-3 py-2 text-xs font-semibold text-sky-200 shadow-lg hover:bg-sky-900"
          >
            {hud.interactPrompt}
          </button>
        )}

        {toast && (
          <div className="rounded-lg border border-emerald-500/70 bg-slate-950/95 px-3 py-2 text-xs text-emerald-300 shadow-lg">
            {toast}
          </div>
        )}
      </div>

      {/* Bottom Driver Cockpit Dock (Desktop + Mobile Touch) */}
      <div className="pointer-events-none absolute bottom-2 left-2 right-2 z-20 flex flex-col items-center">
        <button
          type="button"
          onClick={() => setControlsOpen(!controlsOpen)}
          className="pointer-events-auto mb-1 flex items-center gap-1 rounded-t-lg border border-b-0 border-slate-700 bg-slate-950/92 px-3 py-1 text-[11px] font-medium text-slate-300 hover:text-white"
        >
          {controlsOpen ? <ChevronDown className="h-3.5 w-3.5" /> : <ChevronUp className="h-3.5 w-3.5" />}
          Sükan və İdarəetmə Paneli
        </button>

        {controlsOpen && (
          <div className="pointer-events-auto flex w-full max-w-5xl flex-wrap items-center justify-between gap-3 rounded-2xl border border-slate-800 bg-slate-950/92 px-3 py-2.5 shadow-2xl sm:px-5">
            {/* Left: Interactive Touch Steering Wheel */}
            <div className="flex items-center gap-3">
              <div
                onPointerDown={handleWheelPointerDown}
                onPointerMove={handleWheelPointerMove}
                onPointerUp={handleWheelPointerUp}
                onPointerCancel={handleWheelPointerUp}
                className="relative flex h-20 w-20 cursor-grab items-center justify-center rounded-full border-4 border-slate-600 bg-slate-900 active:cursor-grabbing touch-none sm:h-24 sm:w-24"
                style={{
                  transform: `rotate(${(wheelSteer || -(t?.steeringAngle ?? 0) * 2.2) * 57.3}deg)`,
                }}
                title="Sükanı döndürmək üçün sürüşdürün və ya A/D düymələrindən istifadə edin"
              >
                <div className="absolute top-0 h-2.5 w-2 rounded-b bg-red-500" />
                <div className="h-1.5 w-full bg-slate-700" />
                <div className="absolute bottom-1/2 h-1/2 w-1.5 translate-y-full bg-slate-700" />
                <div className="z-10 flex h-7 w-7 items-center justify-center rounded-full border border-sky-500 bg-slate-950 text-[10px] font-bold text-sky-400">
                  M5
                </div>
              </div>

              {/* Turn Signals */}
              <div className="flex flex-col gap-1.5">
                <div className="flex items-center gap-1">
                  <button
                    type="button"
                    onClick={() => engineRef.current?.toggleIndicator('left')}
                    className={`rounded-lg border px-2.5 py-1.5 text-xs font-bold ${
                      t?.indicators === 'left' || t?.indicators === 'hazard'
                        ? 'border-amber-400 bg-amber-500/20 text-amber-300'
                        : 'border-slate-700 bg-slate-900 text-slate-300'
                    }`}
                    title="Sol siqnal (Q)"
                  >
                    ◀ Q
                  </button>
                  <button
                    type="button"
                    onClick={() => engineRef.current?.toggleIndicator('hazard')}
                    className={`rounded-lg border px-2 py-1.5 text-xs font-bold ${
                      t?.indicators === 'hazard'
                        ? 'border-red-500 bg-red-500/25 text-red-300'
                        : 'border-slate-700 bg-slate-900 text-slate-300'
                    }`}
                    title="Qəza işıqları (F)"
                  >
                    ▲ F
                  </button>
                  <button
                    type="button"
                    onClick={() => engineRef.current?.toggleIndicator('right')}
                    className={`rounded-lg border px-2.5 py-1.5 text-xs font-bold ${
                      t?.indicators === 'right' || t?.indicators === 'hazard'
                        ? 'border-amber-400 bg-amber-500/20 text-amber-300'
                        : 'border-slate-700 bg-slate-900 text-slate-300'
                    }`}
                    title="Sağ siqnal (Z)"
                  >
                    Z ▶
                  </button>
                </div>
                <div className="text-[10px] text-slate-400">
                  W/S: Qaz/Əyləc · A/D: Sükan · C: Kamera · E: Əlaqə
                </div>
              </div>
            </div>

            {/* Center: Automatic Gear Selector P-R-N-D + Safety & Lights */}
            <div className="flex flex-wrap items-center gap-2">
              <div className="flex rounded-lg border border-slate-700 bg-slate-900 p-0.5">
                {GEAR_MODES.map((g) => (
                  <button
                    key={g}
                    type="button"
                    onClick={() => engineRef.current?.setGear(g)}
                    className={`rounded-md px-2.5 py-1.5 font-mono text-xs font-bold ${
                      t?.gear === g
                        ? 'bg-sky-600 text-white'
                        : 'text-slate-400 hover:text-white'
                    }`}
                  >
                    {g}
                  </button>
                ))}
              </div>

              <button
                type="button"
                onClick={() => engineRef.current?.toggleSeatbelt()}
                className={`flex items-center gap-1 rounded-lg border px-2.5 py-1.5 text-xs font-medium ${
                  t?.seatbeltFastened
                    ? 'border-emerald-600 bg-emerald-950/60 text-emerald-300'
                    : 'border-red-600 bg-red-950/60 text-red-300'
                }`}
                title="Təhlükəsizlik kəməri (B)"
              >
                <ShieldCheck className="h-3.5 w-3.5" />
                Kəmər [B]
              </button>

              <button
                type="button"
                onClick={() => engineRef.current?.toggleHandbrake()}
                className={`rounded-lg border px-2.5 py-1.5 text-xs font-medium ${
                  t?.handbrakeEngaged
                    ? 'border-red-500 bg-red-950/60 text-red-300'
                    : 'border-slate-700 bg-slate-900 text-slate-300'
                }`}
                title="Əl əyləci (H)"
              >
                Əl əyləci [H]
              </button>

              <button
                type="button"
                onClick={() => engineRef.current?.cycleHeadlights()}
                className={`flex items-center gap-1 rounded-lg border px-2.5 py-1.5 text-xs font-medium ${
                  t?.headlights !== 'off'
                    ? 'border-sky-500 bg-sky-950/70 text-sky-300'
                    : 'border-slate-700 bg-slate-900 text-slate-300'
                }`}
                title="Faralar (L)"
              >
                <Lightbulb className="h-3.5 w-3.5" />
                {headlightLabel} [L]
              </button>

              <button
                type="button"
                onClick={() => engineRef.current?.toggleWipers()}
                className={`flex items-center gap-1 rounded-lg border px-2 py-1.5 text-xs font-medium ${
                  t?.wipersOn
                    ? 'border-sky-500 bg-sky-950/70 text-sky-300'
                    : 'border-slate-700 bg-slate-900 text-slate-300'
                }`}
                title="Şüşəsilənlər (V)"
              >
                <Eye className="h-3.5 w-3.5" />
                [V]
              </button>

              <button
                type="button"
                onClick={() => engineRef.current?.toggleEngine()}
                className={`flex items-center gap-1 rounded-lg border px-2 py-1.5 text-xs font-medium ${
                  t?.engineRunning
                    ? 'border-emerald-600/80 bg-emerald-950/60 text-emerald-300'
                    : 'border-red-600 bg-red-950/60 text-red-300'
                }`}
                title="Mühərrik Start / Stop (I)"
              >
                <Power className="h-3.5 w-3.5" />
                [I]
              </button>

              <button
                type="button"
                onClick={() => engineRef.current?.triggerDoor()}
                className="flex items-center gap-1 rounded-lg border border-slate-700 bg-slate-900 px-2 py-1.5 text-xs font-medium text-slate-300 hover:bg-slate-800"
                title="Qapını aç / bağla (O)"
              >
                <DoorOpen className="h-3.5 w-3.5" />
                [O]
              </button>

              <button
                type="button"
                onPointerDown={() => engineRef.current?.triggerHorn(true)}
                onPointerUp={() => engineRef.current?.triggerHorn(false)}
                onPointerLeave={() => engineRef.current?.triggerHorn(false)}
                className="rounded-lg border border-slate-700 bg-slate-900 px-2.5 py-1.5 text-xs font-medium text-slate-300 hover:bg-slate-800"
                title="Səs siqnalı (K)"
              >
                Klakson
              </button>
            </div>

            {/* Right: Touch Brake & Gas Pedals */}
            <div className="flex items-center gap-2">
              <button
                type="button"
                onPointerDown={() => engineRef.current?.setTouchBrake(1)}
                onPointerUp={() => engineRef.current?.setTouchBrake(0)}
                onPointerLeave={() => engineRef.current?.setTouchBrake(0)}
                className={`flex h-14 w-16 flex-col items-center justify-center rounded-xl border-2 text-xs font-bold touch-none ${
                  t?.brakePressed
                    ? 'border-red-400 bg-red-600 text-white'
                    : 'border-red-700/70 bg-slate-900 text-red-300'
                }`}
              >
                ƏYLƏC
                <span className="text-[10px] font-normal opacity-80">[S / Space]</span>
              </button>
              <button
                type="button"
                onPointerDown={() => engineRef.current?.setTouchThrottle(1)}
                onPointerUp={() => engineRef.current?.setTouchThrottle(0)}
                onPointerLeave={() => engineRef.current?.setTouchThrottle(0)}
                className={`flex h-14 w-16 flex-col items-center justify-center rounded-xl border-2 text-xs font-bold touch-none ${
                  t?.gasPressed
                    ? 'border-emerald-400 bg-emerald-600 text-white'
                    : 'border-emerald-700/70 bg-slate-900 text-emerald-300'
                }`}
              >
                QAZ
                <span className="text-[10px] font-normal opacity-80">[W]</span>
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Exam Completion Modal */}
      {hud?.examFinished && (
        <div
          className="absolute inset-0 z-50 flex items-center justify-center bg-slate-950/90 p-4"
          data-testid="exam-result-modal"
        >
          <div className="max-h-[90vh] w-full max-w-2xl overflow-y-auto rounded-2xl border border-slate-700 bg-slate-900 p-6 shadow-2xl">
            <div className="flex items-center justify-between border-b border-slate-800 pb-4">
              <div>
                <h2 className="font-display text-2xl font-bold text-white">
                  {hud.examPassed ? 'İmtahan Uğurla Keçildi ("Məqbul")' : 'İmtahan Uğursuz Oldu ("Qeyri-məqbul")'}
                </h2>
                <p className="mt-1 text-xs text-slate-400">
                  DYP Təcrübi İmtahan Standartı (100 bonus balı sistemi · PDF səh. 63)
                </p>
              </div>
              <div
                className={`rounded-xl border px-4 py-2 font-mono text-2xl font-bold tabular-nums ${
                  hud.examPassed
                    ? 'border-emerald-500/50 bg-emerald-950/60 text-emerald-400'
                    : 'border-red-500/50 bg-red-950/60 text-red-400'
                }`}
              >
                {hud.score} / 100
              </div>
            </div>

            {hud.examFailReason && (
              <div className="mt-4 rounded-xl border border-red-500/50 bg-red-950/40 p-3 text-sm text-red-200">
                Dayandırılma səbəbi: <span className="font-semibold">{hud.examFailReason}</span>
              </div>
            )}

            <div className="mt-4 grid grid-cols-2 gap-3 text-center sm:grid-cols-4">
              <div className="rounded-xl border border-slate-800 bg-slate-950 p-3">
                <div className="text-xs text-slate-400">Məsafə</div>
                <div className="mt-1 font-mono text-lg font-bold text-white tabular-nums">
                  {hud.telemetry.distanceMeters} m
                </div>
              </div>
              <div className="rounded-xl border border-slate-800 bg-slate-950 p-3">
                <div className="text-xs text-slate-400">Müddət</div>
                <div className="mt-1 font-mono text-lg font-bold text-white tabular-nums">
                  {hud.telemetry.elapsedSeconds} san
                </div>
              </div>
              <div className="rounded-xl border border-slate-800 bg-slate-950 p-3">
                <div className="text-xs text-slate-400">Pozuntular</div>
                <div className="mt-1 font-mono text-lg font-bold text-white tabular-nums">
                  {hud.violations.length}
                </div>
              </div>
              <div className="rounded-xl border border-slate-800 bg-slate-950 p-3">
                <div className="text-xs text-slate-400">Qəza sayı</div>
                <div className="mt-1 font-mono text-lg font-bold text-white tabular-nums">
                  {hud.collisionCount}
                </div>
              </div>
            </div>

            <div className="mt-5">
              <h3 className="text-sm font-semibold text-slate-200">Qeydə alınmış qayda pozuntuları</h3>
              {hud.violations.length === 0 ? (
                <p className="mt-2 rounded-xl border border-emerald-800/50 bg-emerald-950/30 p-3 text-xs text-emerald-300">
                  Heç bir qayda pozuntusu qeydə alınmadı. Mükəmməl idarəetmə!
                </p>
              ) : (
                <div className="mt-2 flex max-h-48 flex-col gap-2 overflow-y-auto">
                  {hud.violations.map((v) => (
                    <div key={v.id} className="rounded-xl border border-slate-800 bg-slate-950 p-3 text-xs">
                      <div className="flex items-center justify-between font-semibold text-white">
                        <span>{v.title}</span>
                        <span className="font-mono text-red-400 tabular-nums">-{v.pointsDeducted} bal</span>
                      </div>
                      <p className="mt-1 text-slate-300">{v.correctBehavior}</p>
                      <div className="mt-1 text-[11px] text-slate-500">{v.sourceRef}</div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            <div className="mt-6 flex flex-wrap justify-end gap-2.5">
              <button
                type="button"
                onClick={resetExam}
                data-testid="retry-exam-btn"
                className="flex items-center gap-1.5 rounded-xl border border-slate-700 bg-slate-800 px-4 py-2 text-sm font-medium text-white hover:bg-slate-700"
              >
                <RotateCcw className="h-4 w-4" />
                Yenidən İmtahan Ver
              </button>
              <button
                type="button"
                onClick={() =>
                  onAnalyzeExamWithAi({
                    id: `exam_${Date.now()}`,
                    dateIso: new Date().toISOString(),
                    mode: config.mode,
                    environment: config.environment,
                    weather,
                    timeOfDay,
                    startingScore: 100,
                    finalScore: hud.score,
                    passed: Boolean(hud.examPassed),
                    failReason: hud.examFailReason,
                    durationSec: hud.telemetry.elapsedSeconds,
                    distanceMeters: hud.telemetry.distanceMeters,
                    violations: hud.violations,
                  })
                }
                className="flex items-center gap-1.5 rounded-xl bg-sky-600 px-4 py-2 text-sm font-semibold text-white hover:bg-sky-500"
              >
                <Gauge className="h-4 w-4" />
                Hüquqi Ekspert Təhlili
              </button>
              <button
                type="button"
                onClick={onExit}
                className="rounded-xl border border-slate-700 bg-slate-950 px-4 py-2 text-sm font-medium text-slate-300 hover:text-white"
              >
                Əsas Menyuya Qayıt
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
