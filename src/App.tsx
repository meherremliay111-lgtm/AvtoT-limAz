import { useCallback, useEffect, useMemo, useState } from 'react';
import {
  Award,
  BookOpen,
  Car,
  CloudRain,
  Compass,
  GraduationCap,
  MapPin,
  Moon,
  Play,
  Scale,
  ShieldCheck,
  Sun,
  Users,
  Wind,
} from 'lucide-react';
import { ResultsStatsView } from './components/ResultsStatsView';
import { RoadSignsAcademy } from './components/RoadSignsAcademy';
import { RulesAndLawView } from './components/RulesAndLawView';
import { SimulatorView } from './components/SimulatorView';
import { BMW_M5_VARIANTS, TRAINING_MISSIONS } from './data/trafficRules';
import {
  EnvironmentType,
  ExamResultSummary,
  GameMode,
  SimulationConfig,
  TimeOfDay,
  TrafficDensity,
  VehicleColorId,
  WeatherType,
} from './sim/types';

type AppTab = 'launcher' | 'signs' | 'rules' | 'results';

const STORAGE_KEY = 'avtotelim_az_results_v1';

export default function App() {
  const [activeTab, setActiveTab] = useState<AppTab>('launcher');
  const [isDriving, setIsDriving] = useState(false);

  // Simulation Configuration
  const [mode, setMode] = useState<GameMode>('training');
  const [environment, setEnvironment] = useState<EnvironmentType>('city');
  const [weather, setWeather] = useState<WeatherType>('sunny');
  const [timeOfDay, setTimeOfDay] = useState<TimeOfDay>('day');
  const [trafficDensity, setTrafficDensity] = useState<TrafficDensity>('medium');
  const [vehicleColor, setVehicleColor] = useState<VehicleColorId>('marina_bay');

  // Exam history & AI debrief bridge
  const [results, setResults] = useState<ExamResultSummary[]>(() => {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      return raw ? (JSON.parse(raw) as ExamResultSummary[]) : [];
    } catch {
      return [];
    }
  });
  const [aiQuestionBridge, setAiQuestionBridge] = useState('');
  const [aiContextBridge, setAiContextBridge] = useState('');

  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(results));
    } catch {
      // ignore storage quota errors
    }
  }, [results]);

  const handleSaveResult = useCallback((summary: ExamResultSummary) => {
    setResults((prev) => [summary, ...prev]);
  }, []);

  const handleAnalyzeExam = useCallback((summary: ExamResultSummary) => {
    const vList =
      summary.violations.length === 0
        ? 'Heç bir qayda pozuntusu qeydə alınmayıb.'
        : summary.violations
            .map((v, i) => `${i + 1}. ${v.title} (-${v.pointsDeducted} bal, ${v.sourceRef}): ${v.description}`)
            .join('\n');

    setAiContextBridge(
      `Rejim: ${summary.mode}, Mühit: ${summary.environment}, Hava: ${summary.weather}/${summary.timeOfDay}, Yekun Bal: ${summary.finalScore}/100 (${summary.passed ? 'Məqbul' : 'Qeyri-məqbul'}), Məsafə: ${summary.distanceMeters} m.\nPozuntular:\n${vList}`
    );
    setAiQuestionBridge(
      summary.violations.length > 0
        ? 'Bu imtahanda buraxdığım səhvləri Azərbaycan Respublikasının Yol Hərəkəti Qanunu əsasında izah et və növbəti dəfə necə düzgün sürməli olduğumu göstər.'
        : 'Bu uğurlu imtahan nəticəmi qiymətləndir və real DYP imtahanında əlavə nələrə diqqət etməli olduğumu izah et.'
    );
    setIsDriving(false);
    setActiveTab('rules');
  }, []);

  const selectedCar =
    BMW_M5_VARIANTS.find((v) => v.colorId === vehicleColor) ?? BMW_M5_VARIANTS[0];

  const activeConfig = useMemo<SimulationConfig>(
    () => ({
      mode,
      environment,
      weather,
      timeOfDay,
      trafficDensity,
      vehicleColor,
    }),
    [mode, environment, weather, timeOfDay, trafficDensity, vehicleColor]
  );

  if (isDriving) {
    return (
      <SimulatorView
        config={activeConfig}
        onExit={() => setIsDriving(false)}
        onSaveResult={handleSaveResult}
        onAnalyzeExamWithAi={handleAnalyzeExam}
      />
    );
  }

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100">
      {/* Clean 3-Zone Top Bar */}
      <header className="sticky top-0 z-30 border-b border-slate-800 bg-slate-950/95">
        <div className="mx-auto flex max-w-7xl flex-wrap items-center justify-between gap-3 px-4 py-3 sm:px-6">
          {/* Left: Brand */}
          <button
            type="button"
            onClick={() => setActiveTab('launcher')}
            className="flex items-center gap-2.5 text-left"
          >
            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-sky-600 text-white">
              <Car className="h-5 w-5" />
            </div>
            <div>
              <div className="font-display text-base font-bold tracking-tight text-white">
                AvtoTəlim AZ
              </div>
              <div className="text-[11px] text-slate-400">
                3D Sürücülük Simulyatoru · YHQ &amp; DYP
              </div>
            </div>
          </button>

          {/* Center: Navigation Links */}
          <nav className="flex flex-wrap items-center gap-1">
            <button
              type="button"
              onClick={() => setActiveTab('launcher')}
              className={`flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-medium transition ${
                activeTab === 'launcher'
                  ? 'bg-slate-800 text-white'
                  : 'text-slate-400 hover:bg-slate-900 hover:text-slate-200'
              }`}
            >
              <Compass className="h-3.5 w-3.5" />
              Simulyator
            </button>
            <button
              type="button"
              onClick={() => setActiveTab('signs')}
              className={`flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-medium transition ${
                activeTab === 'signs'
                  ? 'bg-slate-800 text-white'
                  : 'text-slate-400 hover:bg-slate-900 hover:text-slate-200'
              }`}
            >
              <BookOpen className="h-3.5 w-3.5" />
              Yol Nişanları
            </button>
            <button
              type="button"
              onClick={() => setActiveTab('rules')}
              className={`flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-medium transition ${
                activeTab === 'rules'
                  ? 'bg-slate-800 text-white'
                  : 'text-slate-400 hover:bg-slate-900 hover:text-slate-200'
              }`}
            >
              <Scale className="h-3.5 w-3.5" />
              Qaydalar və Hüquq
            </button>
            <button
              type="button"
              onClick={() => setActiveTab('results')}
              className={`flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-medium transition ${
                activeTab === 'results'
                  ? 'bg-slate-800 text-white'
                  : 'text-slate-400 hover:bg-slate-900 hover:text-slate-200'
              }`}
            >
              <Award className="h-3.5 w-3.5" />
              Nəticələr ({results.length})
            </button>
          </nav>

          {/* Right: Direct Exam Launch */}
          <button
            type="button"
            onClick={() => {
              setMode('exam');
              setIsDriving(true);
            }}
            className="flex items-center gap-1.5 rounded-xl bg-sky-600 px-3.5 py-2 text-xs font-semibold text-white hover:bg-sky-500"
          >
            <ShieldCheck className="h-4 w-4" />
            İmtahana Başla
          </button>
        </div>
      </header>

      {activeTab === 'signs' && <RoadSignsAcademy />}
      {activeTab === 'rules' && (
        <RulesAndLawView
          initialAiQuestion={aiQuestionBridge}
          initialAiContext={aiContextBridge}
        />
      )}
      {activeTab === 'results' && (
        <ResultsStatsView
          results={results}
          onClear={() => setResults([])}
          onAnalyzeExam={handleAnalyzeExam}
        />
      )}

      {activeTab === 'launcher' && (
        <main className="mx-auto max-w-7xl px-4 py-6 sm:px-6">
          {/* Hero Intro + Direct Launch */}
          <section className="flex flex-col justify-between gap-6 rounded-2xl border border-slate-800 bg-slate-900 p-6 lg:flex-row lg:items-center">
            <div className="max-w-2xl">
              <div className="text-xs font-semibold text-sky-400">
                Azərbaycan Respublikası Yol Hərəkəti Qaydaları · B Kateqoriyası
              </div>
              <h1 className="mt-1.5 font-display text-2xl font-bold tracking-tight text-white sm:text-4xl">
                BMW M5 ilə 3D Sürücülük və İmtahan Simulyatoru
              </h1>
              <p className="mt-2.5 text-sm leading-relaxed text-slate-300">
                Şəhər, kənd və magistral yollarında işıqforlar, DYP nizamlayıcısı, piyada keçidləri, dairəvi yolayrıcları və dinamik trafik şəraitində həm praktiki bacarıqlarınızı, həm də nəzəri biliklərinizi sınayın.
              </p>
              <div className="mt-3 text-xs text-slate-400">
                Sürücünün gözündən (1-ci şəxs) və arxa (3-cü şəxs) kamera · Avtomatik P-R-N-D · Klaviatura və mobil sensor idarəetmə
              </div>
            </div>

            <div className="flex shrink-0 flex-col gap-2.5 sm:flex-row lg:flex-col">
              <button
                type="button"
                onClick={() => setIsDriving(true)}
                className="flex items-center justify-center gap-2 rounded-xl bg-sky-600 px-6 py-3.5 text-sm font-bold text-white shadow-lg hover:bg-sky-500"
              >
                <Play className="h-4 w-4 fill-current" />
                Sürüşə Başla ({mode === 'training' ? 'Təlim' : mode === 'exam' ? 'İmtahan' : 'Sərbəst'})
              </button>
              <button
                type="button"
                onClick={() => setActiveTab('signs')}
                className="rounded-xl border border-slate-700 bg-slate-950 px-5 py-2.5 text-xs font-medium text-slate-200 hover:bg-slate-800"
              >
                Yol Nişanlarını Öyrən (7 Kateqoriya)
              </button>
            </div>
          </section>

          {/* Configuration Grid */}
          <div className="mt-6 grid gap-6 lg:grid-cols-12">
            {/* Left Column: Mode + Environment + Weather */}
            <div className="space-y-6 lg:col-span-7">
              {/* 1. Game Mode */}
              <section className="rounded-2xl border border-slate-800 bg-slate-900 p-5">
                <div className="flex items-center gap-2 text-sm font-bold text-white">
                  <GraduationCap className="h-4 w-4 text-sky-400" />
                  1. Oyun Rejimini Seçin
                </div>
                <div className="mt-3 grid gap-3 sm:grid-cols-3">
                  {[
                    {
                      id: 'training' as GameMode,
                      title: 'Təlim Rejimi',
                      desc: 'Addım-addım təlimat, dərhal izah və TƏLİM nişanlı məşq.',
                    },
                    {
                      id: 'free' as GameMode,
                      title: 'Sərbəst Sürüş',
                      desc: 'İstənilən hava, vaxt və trafik sıxlığında azad təcrübə.',
                    },
                    {
                      id: 'exam' as GameMode,
                      title: 'İmtahan Rejimi',
                      desc: 'Rəsmi 100 bonus balı · 600 m marşrut · DYP hesabatı.',
                    },
                  ].map((item) => (
                    <button
                      key={item.id}
                      type="button"
                      onClick={() => setMode(item.id)}
                      className={`rounded-xl border p-3.5 text-left transition ${
                        mode === item.id
                          ? 'border-sky-500 bg-sky-950/40'
                          : 'border-slate-800 bg-slate-950 hover:border-slate-700'
                      }`}
                    >
                      <div className="text-sm font-bold text-white">{item.title}</div>
                      <p className="mt-1 text-xs text-slate-400">{item.desc}</p>
                    </button>
                  ))}
                </div>

                {mode === 'training' && (
                  <div className="mt-4 border-t border-slate-800 pt-4">
                    <div className="text-xs font-semibold text-slate-400">Hazır Təlim Ssenariləri:</div>
                    <div className="mt-2 grid gap-2 sm:grid-cols-3">
                      {TRAINING_MISSIONS.map((m) => (
                        <button
                          key={m.id}
                          type="button"
                          onClick={() => {
                            setEnvironment(m.environment);
                            setWeather(m.weather);
                            setTimeOfDay(m.timeOfDay);
                          }}
                          className={`rounded-xl border p-2.5 text-left text-xs transition ${
                            environment === m.environment &&
                            weather === m.weather &&
                            timeOfDay === m.timeOfDay
                              ? 'border-emerald-500 bg-emerald-950/30 text-white'
                              : 'border-slate-800 bg-slate-950 text-slate-300 hover:border-slate-700'
                          }`}
                        >
                          <div className="font-semibold">{m.title}</div>
                          <div className="mt-1 text-[11px] text-slate-400 line-clamp-2">{m.description}</div>
                        </button>
                      ))}
                    </div>
                  </div>
                )}
              </section>

              {/* 2. Road Environment */}
              <section className="rounded-2xl border border-slate-800 bg-slate-900 p-5">
                <div className="flex items-center gap-2 text-sm font-bold text-white">
                  <MapPin className="h-4 w-4 text-sky-400" />
                  2. Yol və Ətraf Mühit
                </div>
                <div className="mt-3 grid gap-3 sm:grid-cols-3">
                  {[
                    {
                      id: 'city' as EnvironmentType,
                      title: 'Şəhər (Bakı)',
                      limit: '60 km/s',
                      desc: 'İşıqforlar, Nizamlayıcı, Dairəvi kəsişmə, Piyada keçidi, 5.15 Parklama, YDM.',
                    },
                    {
                      id: 'village' as EnvironmentType,
                      title: 'Kənd Yolu',
                      limit: '40–60 km/s',
                      desc: 'Dar ikitərəfli yol, məhdud görünüşlü döngələr, piyadalar və velosipedçi.',
                    },
                    {
                      id: 'highway' as EnvironmentType,
                      title: 'Avtomagistral',
                      limit: '110 km/s',
                      desc: '3 zolaqlı hərəkət, ayırıcı sədd, ötmə/zolaq dəyişmə, istirahət meydançası.',
                    },
                  ].map((env) => (
                    <button
                      key={env.id}
                      type="button"
                      onClick={() => setEnvironment(env.id)}
                      className={`rounded-xl border p-3.5 text-left transition ${
                        environment === env.id
                          ? 'border-sky-500 bg-sky-950/40'
                          : 'border-slate-800 bg-slate-950 hover:border-slate-700'
                      }`}
                    >
                      <div className="flex items-center justify-between">
                        <span className="text-sm font-bold text-white">{env.title}</span>
                        <span className="font-mono text-xs text-sky-400 tabular-nums">{env.limit}</span>
                      </div>
                      <p className="mt-1 text-xs text-slate-400">{env.desc}</p>
                    </button>
                  ))}
                </div>
              </section>

              {/* 3. Weather, Time & Traffic Density */}
              <section className="rounded-2xl border border-slate-800 bg-slate-900 p-5">
                <div className="grid gap-5 sm:grid-cols-3">
                  <div>
                    <div className="text-xs font-bold text-slate-300">Hava Şəraiti</div>
                    <div className="mt-2 flex flex-col gap-1.5">
                      {[
                        { id: 'sunny' as WeatherType, label: 'Günəşli', icon: Sun },
                        { id: 'rain' as WeatherType, label: 'Yağışlı (sürüşkən)', icon: CloudRain },
                        { id: 'fog' as WeatherType, label: 'Dumanlı (məhdud görünüş)', icon: Wind },
                      ].map((w) => {
                        const Icon = w.icon;
                        return (
                          <button
                            key={w.id}
                            type="button"
                            onClick={() => setWeather(w.id)}
                            className={`flex items-center gap-2 rounded-lg border px-3 py-2 text-xs font-medium ${
                              weather === w.id
                                ? 'border-sky-500 bg-sky-950/50 text-white'
                                : 'border-slate-800 bg-slate-950 text-slate-400 hover:text-slate-200'
                            }`}
                          >
                            <Icon className="h-3.5 w-3.5 text-sky-400" />
                            {w.label}
                          </button>
                        );
                      })}
                    </div>
                  </div>

                  <div>
                    <div className="text-xs font-bold text-slate-300">Sutka Vaxtı</div>
                    <div className="mt-2 flex flex-col gap-1.5">
                      <button
                        type="button"
                        onClick={() => setTimeOfDay('day')}
                        className={`flex items-center gap-2 rounded-lg border px-3 py-2 text-xs font-medium ${
                          timeOfDay === 'day'
                            ? 'border-sky-500 bg-sky-950/50 text-white'
                            : 'border-slate-800 bg-slate-950 text-slate-400 hover:text-slate-200'
                        }`}
                      >
                        <Sun className="h-3.5 w-3.5 text-amber-400" />
                        Gündüz
                      </button>
                      <button
                        type="button"
                        onClick={() => setTimeOfDay('night')}
                        className={`flex items-center gap-2 rounded-lg border px-3 py-2 text-xs font-medium ${
                          timeOfDay === 'night'
                            ? 'border-sky-500 bg-sky-950/50 text-white'
                            : 'border-slate-800 bg-slate-950 text-slate-400 hover:text-slate-200'
                        }`}
                      >
                        <Moon className="h-3.5 w-3.5 text-indigo-400" />
                        Gecə (faralar məcburidir)
                      </button>
                    </div>
                  </div>

                  <div>
                    <div className="flex items-center gap-1.5 text-xs font-bold text-slate-300">
                      <Users className="h-3.5 w-3.5 text-sky-400" />
                      Trafik Sıxlığı
                    </div>
                    <div className="mt-2 flex flex-col gap-1.5">
                      {[
                        { id: 'low' as TrafficDensity, label: 'Aşağı (4 avtomobil + DYP)' },
                        { id: 'medium' as TrafficDensity, label: 'Orta (8 avtomobil + avtobus)' },
                        { id: 'high' as TrafficDensity, label: 'Yüksək (12 avtomobil, sıx)' },
                      ].map((td) => (
                        <button
                          key={td.id}
                          type="button"
                          onClick={() => setTrafficDensity(td.id)}
                          className={`rounded-lg border px-3 py-2 text-left text-xs font-medium ${
                            trafficDensity === td.id
                              ? 'border-sky-500 bg-sky-950/50 text-white'
                              : 'border-slate-800 bg-slate-950 text-slate-400 hover:text-slate-200'
                          }`}
                        >
                          {td.label}
                        </button>
                      ))}
                    </div>
                  </div>
                </div>
              </section>
            </div>

            {/* Right Column: BMW M5 Selector & Controls Guide */}
            <div className="space-y-6 lg:col-span-5">
              <section className="rounded-2xl border border-slate-800 bg-slate-900 p-5">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2 text-sm font-bold text-white">
                    <Car className="h-4 w-4 text-sky-400" />
                    Avtomobil Seçimi: BMW M5
                  </div>
                  <span className="font-mono text-xs text-slate-400">AZ {selectedCar.plateNumber}</span>
                </div>

                {/* Color Preview Banner */}
                <div className="mt-4 flex items-center justify-between rounded-xl border border-slate-800 bg-slate-950 p-4">
                  <div>
                    <div className="font-display text-lg font-bold text-white">{selectedCar.name}</div>
                    <div className="mt-0.5 text-xs text-slate-400">{selectedCar.subtitle}</div>
                  </div>
                  <div
                    className="h-12 w-12 shrink-0 rounded-xl border-2 border-white/30 shadow-inner"
                    style={{ backgroundColor: selectedCar.colorHex }}
                  />
                </div>

                {/* Color Variants */}
                <div className="mt-3 flex flex-wrap gap-2">
                  {BMW_M5_VARIANTS.map((variant) => (
                    <button
                      key={variant.id}
                      type="button"
                      onClick={() => setVehicleColor(variant.colorId)}
                      className={`flex items-center gap-2 rounded-lg border px-2.5 py-1.5 text-xs ${
                        vehicleColor === variant.colorId
                          ? 'border-sky-500 bg-slate-800 text-white'
                          : 'border-slate-800 bg-slate-950 text-slate-400 hover:text-white'
                      }`}
                    >
                      <span
                        className="h-3.5 w-3.5 rounded-full border border-white/30"
                        style={{ backgroundColor: variant.colorHex }}
                      />
                      {variant.subtitle.split(' · ')[0]}
                    </button>
                  ))}
                </div>

                {/* Technical Specs */}
                <div className="mt-4 grid grid-cols-2 gap-2.5 text-xs">
                  <div className="rounded-xl border border-slate-800 bg-slate-950 p-2.5">
                    <div className="text-slate-400">Mühərrik</div>
                    <div className="mt-0.5 font-semibold text-white">{selectedCar.engine}</div>
                  </div>
                  <div className="rounded-xl border border-slate-800 bg-slate-950 p-2.5">
                    <div className="text-slate-400">Güc</div>
                    <div className="mt-0.5 font-semibold text-white tabular-nums">{selectedCar.powerHp} a.g.</div>
                  </div>
                  <div className="rounded-xl border border-slate-800 bg-slate-950 p-2.5">
                    <div className="text-slate-400">Sürətlər qutusu</div>
                    <div className="mt-0.5 font-semibold text-white">{selectedCar.transmission}</div>
                  </div>
                  <div className="rounded-xl border border-slate-800 bg-slate-950 p-2.5">
                    <div className="text-slate-400">Kateqoriya</div>
                    <div className="mt-0.5 font-semibold text-white">{selectedCar.category}</div>
                  </div>
                </div>
              </section>

              {/* Keyboard & Touch Reference */}
              <section className="rounded-2xl border border-slate-800 bg-slate-900 p-5">
                <h2 className="text-sm font-bold text-white">İdarəetmə Düymələri (Klaviatura &amp; Ekran)</h2>
                <div className="mt-3 grid grid-cols-2 gap-2 text-xs text-slate-300">
                  <div className="rounded-lg border border-slate-800 bg-slate-950 px-2.5 py-2">
                    <span className="font-mono font-bold text-sky-400">W / ↑</span> — Qaz (Hərəkət)
                  </div>
                  <div className="rounded-lg border border-slate-800 bg-slate-950 px-2.5 py-2">
                    <span className="font-mono font-bold text-sky-400">S / ↓ / Space</span> — Əyləc
                  </div>
                  <div className="rounded-lg border border-slate-800 bg-slate-950 px-2.5 py-2">
                    <span className="font-mono font-bold text-sky-400">A / D (← / →)</span> — Sükan
                  </div>
                  <div className="rounded-lg border border-slate-800 bg-slate-950 px-2.5 py-2">
                    <span className="font-mono font-bold text-sky-400">R / 1–4</span> — P-R-N-D qutusu
                  </div>
                  <div className="rounded-lg border border-slate-800 bg-slate-950 px-2.5 py-2">
                    <span className="font-mono font-bold text-sky-400">Q / Z / F</span> — Dönmə / Qəza işığı
                  </div>
                  <div className="rounded-lg border border-slate-800 bg-slate-950 px-2.5 py-2">
                    <span className="font-mono font-bold text-sky-400">C</span> — Kamera (Sürücü / Arxa)
                  </div>
                  <div className="rounded-lg border border-slate-800 bg-slate-950 px-2.5 py-2">
                    <span className="font-mono font-bold text-sky-400">B / H</span> — Kəmər / Əl əyləci
                  </div>
                  <div className="rounded-lg border border-slate-800 bg-slate-950 px-2.5 py-2">
                    <span className="font-mono font-bold text-sky-400">L / V / E</span> — Faralar / Şüşəsilən / DYP
                  </div>
                </div>
              </section>
            </div>
          </div>
        </main>
      )}
    </div>
  );
}
