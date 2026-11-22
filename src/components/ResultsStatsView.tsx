import React from 'react';
import { Award, CheckCircle2, Scale, Trash2, XCircle } from 'lucide-react';
import { ExamResultSummary } from '../sim/types';

interface ResultsStatsViewProps {
  results: ExamResultSummary[];
  onClear: () => void;
  onAnalyzeExam: (result: ExamResultSummary) => void;
}

const ENV_LABELS: Record<string, string> = {
  city: 'Şəhər',
  village: 'Kənd',
  highway: 'Magistral',
};

const WEATHER_LABELS: Record<string, string> = {
  sunny: 'Günəşli',
  rain: 'Yağışlı',
  fog: 'Dumanlı',
};

export const ResultsStatsView: React.FC<ResultsStatsViewProps> = ({
  results,
  onClear,
  onAnalyzeExam,
}) => {
  const totalExams = results.length;
  const passedCount = results.filter((r) => r.passed).length;
  const avgScore =
    totalExams > 0 ? Math.round(results.reduce((acc, r) => acc + r.finalScore, 0) / totalExams) : 0;
  const totalDist = results.reduce((acc, r) => acc + r.distanceMeters, 0);

  return (
    <div className="mx-auto max-w-7xl px-4 py-6 sm:px-6">
      <div className="flex flex-wrap items-center justify-between gap-4 border-b border-slate-800 pb-5">
        <div>
          <h1 className="font-display text-2xl font-bold text-white sm:text-3xl">
            İmtahan Nəticələri və Statistika
          </h1>
          <p className="mt-1 text-sm text-slate-400">
            Rəsmi 100 bonus balı qiymətləndirməsi · Bütün sessiyalar brauzerdə yadda saxlanılır
          </p>
        </div>

        {totalExams > 0 && (
          <button
            type="button"
            onClick={onClear}
            className="flex items-center gap-1.5 rounded-xl border border-slate-700 bg-slate-900 px-3.5 py-2 text-xs font-medium text-slate-300 hover:bg-slate-800 hover:text-white"
          >
            <Trash2 className="h-3.5 w-3.5" />
            Tarixçəni Təmizlə
          </button>
        )}
      </div>

      {/* Summary KPI Row */}
      <div className="mt-6 grid grid-cols-2 gap-4 lg:grid-cols-4">
        <div className="rounded-2xl border border-slate-800 bg-slate-900 p-4">
          <div className="text-xs text-slate-400">Ümumi İmtahan Sayı</div>
          <div className="mt-1 font-mono text-2xl font-bold text-white tabular-nums">{totalExams}</div>
        </div>
        <div className="rounded-2xl border border-slate-800 bg-slate-900 p-4">
          <div className="text-xs text-slate-400">Uğurlu ("Məqbul")</div>
          <div className="mt-1 font-mono text-2xl font-bold text-emerald-400 tabular-nums">
            {passedCount} ({totalExams > 0 ? Math.round((passedCount / totalExams) * 100) : 0}%)
          </div>
        </div>
        <div className="rounded-2xl border border-slate-800 bg-slate-900 p-4">
          <div className="text-xs text-slate-400">Orta İmtahan Balı</div>
          <div className="mt-1 font-mono text-2xl font-bold text-sky-400 tabular-nums">
            {avgScore} / 100
          </div>
        </div>
        <div className="rounded-2xl border border-slate-800 bg-slate-900 p-4">
          <div className="text-xs text-slate-400">Cəmi Məsafə</div>
          <div className="mt-1 font-mono text-2xl font-bold text-white tabular-nums">
            {(totalDist / 1000).toFixed(2)} km
          </div>
        </div>
      </div>

      {/* History List */}
      <div className="mt-8">
        {results.length === 0 ? (
          <div className="rounded-2xl border border-slate-800 bg-slate-900 p-10 text-center">
            <Award className="mx-auto h-10 w-10 text-slate-500" />
            <h2 className="mt-3 font-display text-lg font-semibold text-white">
              Hələ imtahan nəticəsi yoxdur
            </h2>
            <p className="mt-1 text-sm text-slate-400">
              Simulyatorda "İmtahan rejimi"ni seçərək 600 metrlik sınaq marşrutunu tamamlayın.
            </p>
          </div>
        ) : (
          <div className="space-y-4">
            {results.map((r) => (
              <div key={r.id} className="rounded-2xl border border-slate-800 bg-slate-900 p-5">
                <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-800 pb-3">
                  <div className="flex items-center gap-2.5">
                    {r.passed ? (
                      <CheckCircle2 className="h-5 w-5 text-emerald-400" />
                    ) : (
                      <XCircle className="h-5 w-5 text-red-400" />
                    )}
                    <div>
                      <div className="text-sm font-bold text-white">
                        {r.passed ? 'Məqbul' : 'Qeyri-məqbul'} · {ENV_LABELS[r.environment]} ·{' '}
                        {WEATHER_LABELS[r.weather]} ({r.timeOfDay === 'night' ? 'Gecə' : 'Gündüz'})
                      </div>
                      <div className="text-xs text-slate-400 tabular-nums">
                        {new Date(r.dateIso).toLocaleString('az-AZ')} · {r.distanceMeters} m · {r.durationSec} san
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center gap-3">
                    <span
                      className={`font-mono text-xl font-bold tabular-nums ${
                        r.passed ? 'text-emerald-400' : 'text-red-400'
                      }`}
                    >
                      {r.finalScore} / 100
                    </span>
                    <button
                      type="button"
                      onClick={() => onAnalyzeExam(r)}
                      className="flex items-center gap-1.5 rounded-lg bg-sky-600 px-3 py-1.5 text-xs font-semibold text-white hover:bg-sky-500"
                    >
                      <Scale className="h-3.5 w-3.5" />
                      Hüquqi Təhlil
                    </button>
                  </div>
                </div>

                {r.failReason && (
                  <p className="mt-3 text-xs text-red-300">
                    Dayandırılma səbəbi: {r.failReason}
                  </p>
                )}

                {r.violations.length > 0 && (
                  <div className="mt-3 grid gap-2 sm:grid-cols-2">
                    {r.violations.map((v) => (
                      <div key={v.id} className="rounded-xl border border-slate-800 bg-slate-950 p-2.5 text-xs">
                        <div className="flex items-center justify-between font-semibold text-slate-200">
                          <span>{v.title}</span>
                          <span className="font-mono text-red-400 tabular-nums">-{v.pointsDeducted}</span>
                        </div>
                        <div className="mt-1 text-[11px] text-slate-400">{v.sourceRef}</div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};
