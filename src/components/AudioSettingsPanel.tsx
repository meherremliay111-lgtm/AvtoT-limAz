import React from 'react';
import { Sliders, Volume2, VolumeX, X } from 'lucide-react';
import { AudioSettings } from '../sim/audioTypes';

interface AudioSettingsPanelProps {
  settings: AudioSettings;
  onChange: (patch: Partial<AudioSettings>) => void;
  onClose: () => void;
}

interface ChannelRowProps {
  label: string;
  hint: string;
  value: number;
  disabled: boolean;
  onChange: (val: number) => void;
}

const ChannelRow: React.FC<ChannelRowProps> = ({ label, hint, value, disabled, onChange }) => {
  const pct = Math.round(value * 100);
  return (
    <div className="flex flex-col gap-1">
      <div className="flex items-center justify-between text-xs">
        <div>
          <span className="font-medium text-slate-100">{label}</span>
          <span className="ml-2 text-[11px] text-slate-400">{hint}</span>
        </div>
        <span className="font-mono text-xs font-semibold text-sky-400 tabular-nums">{pct}%</span>
      </div>
      <input
        type="range"
        min={0}
        max={100}
        value={pct}
        disabled={disabled}
        onChange={(e) => onChange(Number(e.target.value) / 100)}
        className="h-1.5 w-full cursor-pointer accent-sky-500 disabled:cursor-not-allowed disabled:opacity-40"
      />
    </div>
  );
};

export const AudioSettingsPanel: React.FC<AudioSettingsPanelProps> = ({
  settings,
  onChange,
  onClose,
}) => {
  return (
    <div
      className="pointer-events-auto absolute right-3 top-14 z-40 w-80 max-w-[calc(100vw-1.5rem)] rounded-2xl border border-slate-700 bg-slate-950/96 p-4 shadow-2xl"
      data-testid="audio-settings-panel"
    >
      <div className="flex items-center justify-between border-b border-slate-800 pb-2.5">
        <div className="flex items-center gap-2 text-sm font-bold text-white">
          <Sliders className="h-4 w-4 text-sky-400" />
          3D Səs İdarəetmə Paneli
        </div>
        <button
          type="button"
          onClick={onClose}
          className="rounded-lg p-1 text-slate-400 hover:bg-slate-800 hover:text-white"
          title="Bağla"
        >
          <X className="h-4 w-4" />
        </button>
      </div>

      <div className="mt-3 flex items-center justify-between rounded-xl border border-slate-800 bg-slate-900 px-3 py-2">
        <span className="text-xs font-medium text-slate-200">
          {settings.muted ? 'Bütün səslər söndürülüb' : '3D Audio sistem aktivdir'}
        </span>
        <button
          type="button"
          onClick={() => onChange({ muted: !settings.muted })}
          className={`flex items-center gap-1.5 rounded-lg px-2.5 py-1 text-xs font-semibold ${
            settings.muted
              ? 'bg-red-600/20 text-red-300 border border-red-500/40'
              : 'bg-emerald-600/20 text-emerald-300 border border-emerald-500/40'
          }`}
        >
          {settings.muted ? <VolumeX className="h-3.5 w-3.5" /> : <Volume2 className="h-3.5 w-3.5" />}
          {settings.muted ? 'Aktivləşdir' : 'Söndür'}
        </button>
      </div>

      <div className="mt-3.5 flex flex-col gap-3">
        <ChannelRow
          label="Ümumi səs səviyyəsi"
          hint="Master"
          value={settings.masterVolume}
          disabled={settings.muted}
          onChange={(v) => onChange({ masterVolume: v })}
        />
        <ChannelRow
          label="Mühərrik səsi"
          hint="BMW M5 V8 · Turbo · Egzoz"
          value={settings.engineVolume}
          disabled={settings.muted}
          onChange={(v) => onChange({ engineVolume: v })}
        />
        <ChannelRow
          label="Yol və ətraf mühit"
          hint="Asfalt · Yağış · Küçə"
          value={settings.environmentVolume}
          disabled={settings.muted}
          onChange={(v) => onChange({ environmentVolume: v })}
        />
        <ChannelRow
          label="Piyada səsləri"
          hint="Küçə · Keçid · Xəbərdarlıq"
          value={settings.pedestrianVolume}
          disabled={settings.muted}
          onChange={(v) => onChange({ pedestrianVolume: v })}
        />
        <ChannelRow
          label="Yol polisi səsləri"
          hint="DYP · İmtahan təlimatı"
          value={settings.policeVolume}
          disabled={settings.muted}
          onChange={(v) => onChange({ policeVolume: v })}
        />
        <ChannelRow
          label="Xəbərdarlıq və qəza"
          hint="Kəmər · Toqquşma · Siqnal"
          value={settings.alertsVolume}
          disabled={settings.muted}
          onChange={(v) => onChange({ alertsVolume: v })}
        />
      </div>
    </div>
  );
};
