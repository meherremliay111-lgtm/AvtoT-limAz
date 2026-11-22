import React, { useMemo, useState } from 'react';
import { BookOpen, CheckCircle2, HelpCircle, Search, XCircle } from 'lucide-react';
import { ROAD_SIGNS, RoadSignItem, SIGN_CATEGORIES, SignCategoryId } from '../data/roadSigns';
import { RoadSignSvg } from './RoadSignSvg';

export const RoadSignsAcademy: React.FC = () => {
  const [selectedCategory, setSelectedCategory] = useState<SignCategoryId | 'all'>('all');
  const [search, setSearch] = useState('');
  const [activeSign, setActiveSign] = useState<RoadSignItem>(ROAD_SIGNS[0]);
  const [quizMode, setQuizMode] = useState(false);

  // Quiz state
  const [quizIndex, setQuizIndex] = useState(0);
  const [quizScore, setQuizScore] = useState(0);
  const [quizAnswered, setQuizAnswered] = useState<string | null>(null);

  const filteredSigns = useMemo(() => {
    const q = search.trim().toLowerCase();
    return ROAD_SIGNS.filter((s) => {
      if (selectedCategory !== 'all' && s.category !== selectedCategory) return false;
      if (!q) return true;
      return (
        s.code.toLowerCase().includes(q) ||
        s.name.toLowerCase().includes(q) ||
        s.meaning.toLowerCase().includes(q)
      );
    });
  }, [selectedCategory, search]);

  const activeCategoryMeta = SIGN_CATEGORIES.find((c) => c.id === selectedCategory) ?? null;

  // Deterministic 10-question sign quiz slice
  const quizQuestions = useMemo(() => {
    const pool = ROAD_SIGNS.slice(0, 12);
    return pool.map((correct, idx) => {
      const distractors = ROAD_SIGNS.filter((s) => s.code !== correct.code)
        .slice(idx, idx + 3);
      const options = [correct, ...distractors].sort((a, b) => a.code.localeCompare(b.code));
      return { correct, options };
    });
  }, []);

  const currentQuiz = quizQuestions[quizIndex];

  const handleAnswerQuiz = (code: string) => {
    if (quizAnswered) return;
    setQuizAnswered(code);
    if (code === currentQuiz.correct.code) {
      setQuizScore((s) => s + 1);
    }
  };

  const handleNextQuiz = () => {
    setQuizAnswered(null);
    if (quizIndex + 1 < quizQuestions.length) {
      setQuizIndex((i) => i + 1);
    } else {
      setQuizIndex(0);
      setQuizScore(0);
      setQuizMode(false);
    }
  };

  return (
    <div className="mx-auto max-w-7xl px-4 py-6 sm:px-6">
      {/* Header Row */}
      <div className="flex flex-wrap items-center justify-between gap-4 border-b border-slate-800 pb-5">
        <div>
          <h1 className="font-display text-2xl font-bold text-white sm:text-3xl">
            Azərbaycan Yol Nişanları Akademiyası
          </h1>
          <p className="mt-1 text-sm text-slate-400">
            Yol Hərəkəti Haqqında Qanun (Əlavə 1–7) · Sürücülük dərs vəsaiti (səh. 27–30) · Simulyator təsiri
          </p>
        </div>

        <button
          type="button"
          onClick={() => {
            setQuizMode(!quizMode);
            setQuizIndex(0);
            setQuizScore(0);
            setQuizAnswered(null);
          }}
          className={`flex items-center gap-2 rounded-xl px-4 py-2.5 text-sm font-semibold transition ${
            quizMode
              ? 'border border-slate-700 bg-slate-800 text-white'
              : 'bg-sky-600 text-white hover:bg-sky-500'
          }`}
        >
          {quizMode ? <BookOpen className="h-4 w-4" /> : <HelpCircle className="h-4 w-4" />}
          {quizMode ? 'Nişan Kataloquna Qayıt' : 'Nişan Tanıma Testi (12 sual)'}
        </button>
      </div>

      {quizMode ? (
        <div className="mx-auto mt-6 max-w-2xl rounded-2xl border border-slate-800 bg-slate-900 p-6">
          <div className="flex items-center justify-between text-xs font-medium text-slate-400 tabular-nums">
            <span>
              Sual {quizIndex + 1} / {quizQuestions.length}
            </span>
            <span>Düzgün cavablar: {quizScore}</span>
          </div>

          <div className="mt-6 flex flex-col items-center">
            <div className="rounded-2xl border border-slate-700 bg-slate-950 p-6">
              <RoadSignSvg sign={currentQuiz.correct} size={132} />
            </div>
            <p className="mt-4 text-center text-sm font-medium text-slate-200">
              Bu yol nişanı hansı mənanı bildirir?
            </p>
          </div>

          <div className="mt-6 grid gap-2.5">
            {currentQuiz.options.map((opt) => {
              const isSelected = quizAnswered === opt.code;
              const isCorrect = opt.code === currentQuiz.correct.code;
              let btnStyle = 'border-slate-700 bg-slate-950 text-slate-200 hover:border-slate-500';
              if (quizAnswered) {
                if (isCorrect) btnStyle = 'border-emerald-500 bg-emerald-950/60 text-emerald-200';
                else if (isSelected) btnStyle = 'border-red-500 bg-red-950/60 text-red-200';
                else btnStyle = 'border-slate-800 bg-slate-950 text-slate-500';
              }
              return (
                <button
                  key={opt.code}
                  type="button"
                  onClick={() => handleAnswerQuiz(opt.code)}
                  className={`flex items-center justify-between rounded-xl border px-4 py-3 text-left text-sm transition ${btnStyle}`}
                >
                  <span>
                    <span className="font-mono font-bold text-sky-400">{opt.code}</span> · {opt.name}
                  </span>
                  {quizAnswered && isCorrect && <CheckCircle2 className="h-4 w-4 text-emerald-400" />}
                  {quizAnswered && isSelected && !isCorrect && <XCircle className="h-4 w-4 text-red-400" />}
                </button>
              );
            })}
          </div>

          {quizAnswered && (
            <div className="mt-5 rounded-xl border border-slate-700 bg-slate-950 p-4 text-xs text-slate-300">
              <div className="font-semibold text-white">Sürücü davranışı:</div>
              <p className="mt-1">{currentQuiz.correct.driverAction}</p>
              <div className="mt-1.5 text-slate-500">{currentQuiz.correct.sourceRef}</div>
              <button
                type="button"
                onClick={handleNextQuiz}
                className="mt-4 w-full rounded-xl bg-sky-600 py-2.5 text-sm font-semibold text-white hover:bg-sky-500"
              >
                {quizIndex + 1 < quizQuestions.length ? 'Növbəti Sual' : 'Testi Bitir'}
              </button>
            </div>
          )}
        </div>
      ) : (
        <>
          {/* Category Filter Bar & Search */}
          <div className="mt-5 flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
            <div className="flex flex-wrap gap-1.5">
              <button
                type="button"
                onClick={() => setSelectedCategory('all')}
                className={`rounded-lg px-3 py-1.5 text-xs font-medium transition ${
                  selectedCategory === 'all'
                    ? 'bg-sky-600 text-white'
                    : 'border border-slate-800 bg-slate-900 text-slate-300 hover:bg-slate-800'
                }`}
              >
                Hamısı ({ROAD_SIGNS.length})
              </button>
              {SIGN_CATEGORIES.map((cat) => (
                <button
                  key={cat.id}
                  type="button"
                  onClick={() => setSelectedCategory(cat.id)}
                  className={`rounded-lg px-3 py-1.5 text-xs font-medium transition ${
                    selectedCategory === cat.id
                      ? 'bg-sky-600 text-white'
                      : 'border border-slate-800 bg-slate-900 text-slate-300 hover:bg-slate-800'
                  }`}
                >
                  {cat.order <= 7 ? `${cat.order}. ${cat.shortTitle}` : cat.shortTitle}
                </button>
              ))}
            </div>

            <div className="relative w-full lg:w-72">
              <Search className="pointer-events-none absolute left-3 top-2.5 h-4 w-4 text-slate-500" />
              <input
                type="text"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Kod və ya ad ilə axtar (məs. 2.5, STOP)"
                className="w-full rounded-xl border border-slate-800 bg-slate-900 py-2 pl-9 pr-3 text-sm text-white placeholder-slate-500 focus:border-sky-500 focus:outline-none"
              />
            </div>
          </div>

          {activeCategoryMeta && (
            <div className="mt-4 rounded-xl border border-slate-800 bg-slate-900/80 p-4">
              <div className="text-sm font-bold text-white">{activeCategoryMeta.title}</div>
              <p className="mt-1 text-xs text-slate-300">{activeCategoryMeta.description}</p>
              <div className="mt-1.5 text-xs text-slate-400">
                Forma qaydası: {activeCategoryMeta.shapeRule} · {activeCategoryMeta.pdfRef}
              </div>
            </div>
          )}

          {/* Split Catalog Grid + Detail Inspector */}
          <div className="mt-6 grid gap-6 lg:grid-cols-12">
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 md:grid-cols-4 lg:col-span-7">
              {filteredSigns.map((sign) => {
                const selected = activeSign.code === sign.code;
                return (
                  <button
                    key={sign.code}
                    type="button"
                    onClick={() => setActiveSign(sign)}
                    className={`flex flex-col items-center rounded-xl border p-3.5 text-center transition ${
                      selected
                        ? 'border-sky-500 bg-slate-800/90'
                        : 'border-slate-800 bg-slate-900 hover:border-slate-700'
                    }`}
                  >
                    <RoadSignSvg sign={sign} size={64} />
                    <div className="mt-2.5 font-mono text-xs font-bold text-sky-400">{sign.code}</div>
                    <div className="mt-0.5 text-xs font-medium text-slate-200 line-clamp-2">{sign.name}</div>
                  </button>
                );
              })}
            </div>

            {/* Active Sign Detail Inspector */}
            <aside className="lg:col-span-5">
              <div className="sticky top-20 rounded-2xl border border-slate-800 bg-slate-900 p-5">
                <div className="flex items-start gap-4 border-b border-slate-800 pb-4">
                  <div className="rounded-xl border border-slate-700 bg-slate-950 p-3">
                    <RoadSignSvg sign={activeSign} size={84} />
                  </div>
                  <div>
                    <div className="font-mono text-sm font-bold text-sky-400">{activeSign.code}</div>
                    <h2 className="mt-0.5 font-display text-lg font-bold text-white">{activeSign.name}</h2>
                    <div className="mt-1 text-xs text-slate-400">{activeSign.sourceRef}</div>
                  </div>
                </div>

                <div className="mt-4 space-y-4 text-sm">
                  <div>
                    <div className="text-xs font-semibold uppercase tracking-wider text-slate-400">
                      Hüquqi Mənası
                    </div>
                    <p className="mt-1 text-slate-200">{activeSign.meaning}</p>
                  </div>

                  <div>
                    <div className="text-xs font-semibold uppercase tracking-wider text-emerald-400">
                      Sürücü Nə Etməlidir?
                    </div>
                    <p className="mt-1 text-slate-200">{activeSign.driverAction}</p>
                  </div>

                  <div className="rounded-xl border border-slate-800 bg-slate-950 p-3">
                    <div className="text-xs font-semibold uppercase tracking-wider text-sky-400">
                      3D Simulyatorda Təsiri
                    </div>
                    <p className="mt-1 text-xs text-slate-300">{activeSign.simImpact}</p>
                  </div>
                </div>
              </div>
            </aside>
          </div>
        </>
      )}
    </div>
  );
};
