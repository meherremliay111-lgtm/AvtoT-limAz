import React, { useEffect, useState } from 'react';
import { AlertCircle, BookOpenCheck, Scale, Send, Sparkles } from 'lucide-react';
import { TRAFFIC_RULES_CURRICULUM } from '../data/trafficRules';

interface RulesAndLawViewProps {
  initialAiQuestion?: string;
  initialAiContext?: string;
}

const SAMPLE_QUESTIONS = [
  'Dairəvi hərəkət yolayrıcında 2.4 "Yol verin" nişanı yoxdursa, kim birinci keçir?',
  'Nizamlayıcı sağ əlini önə uzadıbsa, qarşıdan və sol tərəfdən gələn avtomobillər hansı istiqamətdə gedə bilər?',
  'Dumanlı havada uzaq işıqlardan istifadə etmək niyə qadağandır və hansı işıqlar yandırılmalıdır?',
  'Texniki baxış müddəti üzrə 2019-cu il dərs vəsaiti ilə hazırda qüvvədə olan Qanunun 30-cu maddəsi arasındakı fərq nədir?',
];

export const RulesAndLawView: React.FC<RulesAndLawViewProps> = ({
  initialAiQuestion = '',
  initialAiContext = '',
}) => {
  const [question, setQuestion] = useState(initialAiQuestion);
  const [context, setContext] = useState(initialAiContext);
  const [loading, setLoading] = useState(false);
  const [answer, setAnswer] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (initialAiQuestion) {
      setQuestion(initialAiQuestion);
      setContext(initialAiContext);
    }
  }, [initialAiQuestion, initialAiContext]);

  const handleAsk = async (customQ?: string) => {
    const qText = (customQ ?? question).trim();
    if (!qText) return;
    if (customQ) setQuestion(customQ);

    setLoading(true);
    setError(null);
    setAnswer(null);

    try {
      const res = await fetch('/api/analyze-law', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ question: qText, context }),
      });
      const data = (await res.json()) as { analysis?: string; error?: string };
      if (!res.ok) {
        setError(data.error || 'Sorğu zamanı xəta baş verdi.');
      } else {
        setAnswer(data.analysis || '');
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Serverə qoşulmaq mümkün olmadı.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="mx-auto max-w-7xl px-4 py-6 sm:px-6">
      <div className="border-b border-slate-800 pb-5">
        <h1 className="font-display text-2xl font-bold text-white sm:text-3xl">
          Yol Hərəkəti Qaydaları və Hüquqi Baza
        </h1>
        <p className="mt-1 text-sm text-slate-400">
          Azərbaycan Respublikasının "Yol Hərəkəti Haqqında" Qanunu · dyp.gov.az · "Sürücülük" dərs vəsaiti (2019)
        </p>
      </div>

      {/* High-Thinking Legal Expert Analysis Panel */}
      <section className="mt-6 rounded-2xl border border-sky-800/60 bg-slate-900 p-5 sm:p-6">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div className="flex items-center gap-2.5">
            <Scale className="h-5 w-5 text-sky-400" />
            <h2 className="font-display text-lg font-bold text-white">
              Hüquqi Situasiya Təhlili (Dərin Mühakimə)
            </h2>
          </div>
          <span className="text-xs text-slate-400">
            Mənbə: YHQ &amp; Sürücülük PDF (2019)
          </span>
        </div>

        <p className="mt-2 text-xs text-slate-300">
          Mürəkkəb yolayrıcılarını, nizamlayıcı siqnallarını və ya imtahan səhvlərinizi yazın — sistem qanunvericilik maddələri əsasında addım-addım təhlil təqdim edəcək.
        </p>

        <div className="mt-3 flex flex-wrap gap-2">
          {SAMPLE_QUESTIONS.map((sq, idx) => (
            <button
              key={idx}
              type="button"
              onClick={() => void handleAsk(sq)}
              className="rounded-lg border border-slate-700 bg-slate-950 px-3 py-1.5 text-left text-xs text-slate-300 hover:border-sky-500 hover:text-white"
            >
              {sq}
            </button>
          ))}
        </div>

        <form
          onSubmit={(e) => {
            e.preventDefault();
            void handleAsk();
          }}
          className="mt-4 flex flex-col gap-3 sm:flex-row"
        >
          <textarea
            rows={2}
            value={question}
            onChange={(e) => setQuestion(e.target.value)}
            placeholder="Yol situasiyası və ya qayda barədə sualınızı yazın..."
            className="flex-1 rounded-xl border border-slate-700 bg-slate-950 p-3 text-sm text-white placeholder-slate-500 focus:border-sky-500 focus:outline-none"
          />
          <button
            type="submit"
            disabled={loading || !question.trim()}
            className="flex items-center justify-center gap-2 rounded-xl bg-sky-600 px-5 py-3 text-sm font-semibold text-white hover:bg-sky-500 disabled:opacity-50"
          >
            {loading ? (
              <>
                <Sparkles className="h-4 w-4 animate-spin" />
                Təhlil edilir...
              </>
            ) : (
              <>
                <Send className="h-4 w-4" />
                Təhlil Et
              </>
            )}
          </button>
        </form>

        {context && (
          <div className="mt-3 rounded-xl border border-slate-800 bg-slate-950 p-3 text-xs text-slate-400">
            <div className="flex items-center justify-between">
              <span className="font-semibold text-slate-300">Əlavə edilmiş imtahan konteksti:</span>
              <button
                type="button"
                onClick={() => setContext('')}
                className="text-sky-400 hover:underline"
              >
                Təmizlə
              </button>
            </div>
            <p className="mt-1 whitespace-pre-line">{context}</p>
          </div>
        )}

        {error && (
          <div className="mt-4 flex items-start gap-2 rounded-xl border border-red-700/70 bg-red-950/50 p-3.5 text-sm text-red-200">
            <AlertCircle className="mt-0.5 h-4 w-4 shrink-0 text-red-400" />
            <span>{error}</span>
          </div>
        )}

        {answer && (
          <div className="mt-4 rounded-xl border border-slate-700 bg-slate-950 p-4 text-sm leading-relaxed text-slate-200 whitespace-pre-line">
            {answer}
          </div>
        )}
      </section>

      {/* Curriculum Sections */}
      <div className="mt-8 grid gap-5 md:grid-cols-2">
        {TRAFFIC_RULES_CURRICULUM.map((sec) => {
          const isDiscrepancy = sec.id === 'law_updates_discrepancy';
          return (
            <article
              key={sec.id}
              className={`rounded-2xl border p-5 ${
                isDiscrepancy
                  ? 'border-amber-600/60 bg-amber-950/20 md:col-span-2'
                  : 'border-slate-800 bg-slate-900'
              }`}
            >
              <div className="flex items-start justify-between gap-2">
                <h3 className="font-display text-lg font-bold text-white">{sec.title}</h3>
                <BookOpenCheck className={`h-5 w-5 shrink-0 ${isDiscrepancy ? 'text-amber-400' : 'text-sky-400'}`} />
              </div>
              <div className="mt-1 text-xs text-slate-400">{sec.sourceRef}</div>
              <p className="mt-3 text-sm text-slate-200">{sec.summary}</p>

              <ul className="mt-3 space-y-2 text-xs text-slate-300">
                {sec.bullets.map((b, i) => (
                  <li key={i} className="flex items-start gap-2">
                    <span className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-sky-400" />
                    <span>{b}</span>
                  </li>
                ))}
              </ul>

              <div className="mt-4 rounded-xl border border-slate-800 bg-slate-950/80 p-3 text-xs text-slate-300">
                <span className="font-semibold text-sky-400">Simulyatorda tətbiqi: </span>
                {sec.simConnection}
              </div>

              {sec.discrepancyNote && (
                <div className="mt-3 rounded-xl border border-amber-700/60 bg-amber-950/40 p-3 text-xs text-amber-200">
                  <span className="font-bold">Qeyd: </span>
                  {sec.discrepancyNote}
                </div>
              )}
            </article>
          );
        })}
      </div>
    </div>
  );
};
