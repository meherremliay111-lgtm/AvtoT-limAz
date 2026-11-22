import { VehicleConfig, VehicleColorId } from '../sim/types';

export const BMW_M5_VARIANTS: VehicleConfig[] = [
  {
    id: 'bmw-m5-marina',
    name: 'BMW M5 Competition (F90)',
    subtitle: 'Marina Bay Blue Metallic · B kateqoriyası',
    colorId: 'marina_bay',
    colorHex: '#1D4ED8',
    transmission: 'Avtomatik (M Steptronic 8-pilləli)',
    engine: '4.4L V8 TwinPower Turbo',
    powerHp: 625,
    category: 'B (≤ 3500 kq, ≤ 8 sərnişin)',
    plateNumber: '90-MB-202',
  },
  {
    id: 'bmw-m5-black',
    name: 'BMW M5 Competition (F90)',
    subtitle: 'Frozen Black Metallic · B kateqoriyası',
    colorId: 'frozen_black',
    colorHex: '#1E293B',
    transmission: 'Avtomatik (M Steptronic 8-pilləli)',
    engine: '4.4L V8 TwinPower Turbo',
    powerHp: 625,
    category: 'B (≤ 3500 kq, ≤ 8 sərnişin)',
    plateNumber: '90-MB-202',
  },
  {
    id: 'bmw-m5-white',
    name: 'BMW M5 Competition (F90)',
    subtitle: 'Alpine White · Təlim və İmtahan təchizatlı',
    colorId: 'alpine_white',
    colorHex: '#F1F5F9',
    transmission: 'Avtomatik (M Steptronic 8-pilləli)',
    engine: '4.4L V8 TwinPower Turbo',
    powerHp: 625,
    category: 'B (≤ 3500 kq, ≤ 8 sərnişin)',
    plateNumber: '90-MB-202',
  },
  {
    id: 'bmw-m5-red',
    name: 'BMW M5 Competition (F90)',
    subtitle: 'Toronto Red Metallic · B kateqoriyası',
    colorId: 'toronto_red',
    colorHex: '#B91C1C',
    transmission: 'Avtomatik (M Steptronic 8-pilləli)',
    engine: '4.4L V8 TwinPower Turbo',
    powerHp: 625,
    category: 'B (≤ 3500 kq, ≤ 8 sərnişin)',
    plateNumber: '90-MB-202',
  },
  {
    id: 'bmw-m5-grey',
    name: 'BMW M5 Competition (F90)',
    subtitle: 'Donington Grey Metallic · B kateqoriyası',
    colorId: 'donington_grey',
    colorHex: '#64748B',
    transmission: 'Avtomatik (M Steptronic 8-pilləli)',
    engine: '4.4L V8 TwinPower Turbo',
    powerHp: 625,
    category: 'B (≤ 3500 kq, ≤ 8 sərnişin)',
    plateNumber: '90-MB-202',
  },
];

export function getVehicleColorHex(colorId: VehicleColorId): string {
  return BMW_M5_VARIANTS.find((v) => v.colorId === colorId)?.colorHex ?? '#1D4ED8';
}

export interface TrafficRuleSection {
  id: string;
  title: string;
  sourceRef: string;
  summary: string;
  bullets: string[];
  simConnection: string;
  discrepancyNote?: string;
}

export const TRAFFIC_RULES_CURRICULUM: TrafficRuleSection[] = [
  {
    id: 'driver_duties',
    title: 'Sürücünün əsas vəzifələri və hərəkətə hazırlıq',
    sourceRef: 'PDF Bölmə 1.4.1, 4.1.1, 4.4.1 (səh. 15–18, 58–60, 73–75) · YHQ Maddə 37',
    summary:
      'Sürücü yola çıxmazdan əvvəl avtomobilin texniki sazlığını yoxlamalı, güzgüləri tənzimləməli, təhlükəsizlik kəmərini bağlamalı və DYP əməkdaşının tələbi ilə sənədləri təqdim etməlidir.',
    bullets: [
      'Üzərində olmalıdır: Sürücülük vəsiqəsi, Qeydiyyat şəhadətnaməsi ("texpasport") və İcbari sığorta şəhadətnaməsi.',
      'Avtomatik sürətlər qutusunda P (Parking), R (Arxa), N (Neytral), D (Hərəkət) rejimləri istifadə olunur; keçidlər əyləc basılı halda səlis edilməlidir.',
      'Konstruksiyada nəzərdə tutulmuş təhlükəsizlik kəməri hərəkətə başlamazdan əvvəl bağlanmalıdır.',
      'Hərəkət zamanı əl telefonundan istifadə, sükanı buraxmaq və qapı açıq hərəkət etmək qadağandır.',
    ],
    simConnection:
      'Simulyatorda təhlükəsizlik kəmərini bağlamadan və əl əyləcini endirmədən hərəkətə başlamaq qayda pozuntusu kimi qeydə alınır; DYP saxlaması zamanı E düyməsi ilə 3 sənəd yoxlanılır.',
  },
  {
    id: 'speed_limits',
    title: 'Hərəkət sürəti və ara məsafəsi',
    sourceRef: 'PDF Bölmə 3.1.1, 2.2.1 (səh. 25, 39) · YHQ Maddə 50',
    summary:
      'Sürət yaşayış zonası, şəhər, kənd və avtomagistral kateqoriyalarına, habelə yol nişanlarına və hava şəraitinə uyğun seçilməlidir.',
    bullets: [
      'Yaşayış və həyət zonalarında: maksimum 20 km/saat (piyadalar üstünlüyə malikdir).',
      'Yaşayış məntəqələri daxilində (Şəhər/Kənd): maksimum 60 km/saat (nişanla başqa hədd göstərilməyibsə).',
      'Avtomagistralda minik avtomobilləri (3.5 t-dək): maksimum 110 km/saat; avtobuslar bütün yollarda 90 km/saat.',
      'Ara məsafəsi: normal şəraitdə 100 km/saatda əylənmə 44–50 m, dumanda 100 m-dək artır; 60 km/saatda dumanda ən azı 60 m ara məsafəsi saxlanmalıdır.',
    ],
    simConnection:
      'Şəhər (60 km/s), Kənd (60 km/s, döngələrdə 40 km/s), Magistral (110 km/s) limitləri dinamik yoxlanılır; yağış və duman tormoz məsafəsini uzadır.',
  },
  {
    id: 'intersections',
    title: 'Yolayrıclarının keçilməsi və dairəvi hərəkət',
    sourceRef: 'PDF Bölmə 2.4.1, 4.4.1 (səh. 32–34, 39, 75) · YHQ Maddə 75–77',
    summary:
      'Nizamlanan yolayrıcıları işıqfor və ya nizamlayıcı ilə, nizamlanmayanlar isə üstünlük nişanları və "sağ əl qaydası" ilə keçilir.',
    bullets: [
      'Nizamlayıcının göstərişləri işıqfor, yol nişanı və nişanlanma xətlərinə zidd olsa belə məcburidir.',
      'Yaşıl işıqda sola/geriyə dönərkən qarşıdan düzünə və sağa gedənlərə yol verilməlidir.',
      'Eyni əhəmiyyətli yolların kəsişməsində sağdan yaxınlaşan nəqliyyat vasitəsinə yol verilir.',
      'Baş yol və ikinci dərəcəli yol kəsişməsində ikinci dərəcəli yoldakı sürücü baş yoldakılara yol verir.',
      'Dairəvi hərəkətdə nişanla başqa qayda qoyulmayıbsa, dairəyə daxil olan sürücü dairədə hərəkət edənlərə yol verməlidir.',
    ],
    simConnection:
      'Şəhər xəritəsində işıqforlu kəsişmələr, nizamlanmayan baş/ikinci dərəcəli yol, STOP nişanlı çıxış və Dairəvi kəsişmə AI trafiki ilə birlikdə işləyir.',
  },
  {
    id: 'pedestrians_cyclists',
    title: 'Piyada keçidləri, velosipedçilər və avtobuslar',
    sourceRef: 'PDF Bölmə 2.2.1, 3.1.1, 4.3.1 (səh. 25–26, 37, 68–69) · YHQ Maddə 53',
    summary:
      'Piyada keçidində olan və ya keçidə daxil olan piyadalara, eləcə də dayanacaqdan çıxan şəhər avtobuslarına yol verilməlidir.',
    bullets: [
      'Nizamlanmayan piyada keçidində piyada yola daxil olduqda sürücü dayanıb yol verməlidir.',
      'Qonşu zolaqdakı maşın piyada keçidi qarşısında dayanıbsa, digər zolaqlardakı sürücülər də dayanıb piyada olmadığını yəqin etməlidir.',
      'Yaşayış məntəqələrində işarələnmiş dayanacaqdan hərəkətə başlayan avtobuslara yol verilməlidir.',
      'Velosiped və mopedlər yolun sağ kənar zolağında hərəkət edir; sağa dönərkən onları buraxmaq lazımdır.',
    ],
    simConnection:
      'Piyadalar zebra keçidlərindən keçir; keçiddə piyada varkən dayanmamaq imtahanda kritik (-100 bal) pozuntu hesab olunur.',
  },
  {
    id: 'police_signals',
    title: 'Yol polisi, nizamlayıcı siqnalları və operativ nəqliyyat',
    sourceRef: 'PDF Bölmə 1.4.1, 3.1.1, 3.4.1 (səh. 18–19, 36, 49–50, 53) · YHQ Maddə 48, 59',
    summary:
      'Qırmızı və ya göy sayrışan işıq + xüsusi səs siqnalı qoşmuş operativ nəqliyyat vasitəsinə sağ zolağı boşaldıb yol vermək məcburidir.',
    bullets: [
      'Nizamlayıcı əlini yuxarı qaldırıbsa ("Diqqət!") — bütün hərəkət dayanır (yolayrıcında olanlar çıxışı tamamlayır).',
      'Nizamlayıcı sağ əlini önə uzadıbsa — sol tərəfdən gələnlər bütün istiqamətlərə, sinə tərəfdən gələnlər yalnız sağa dönə bilər; sağ və arxa tərəfdən hərəkət qadağandır.',
      'Nizamlayıcı əli ilə yuxarı-aşağı hərəkət edirsə — "Sürəti azaldın"; dairəvi hərəkət edirsə — "Sürəti artırın".',
      'Polis avtomobili arxanızca sayrışan işıq yandırıb "Dayanın" əmri verdikdə sağa dönmə siqnalı yandırıb yol kənarında dayanmalısınız.',
    ],
    simConnection:
      '3D DYP patrul avtomobili pozuntu olduqda sizi saxlayır, nizamlayıcı 3D qol/jezl animasiyaları ilə siqnal verir.',
  },
  {
    id: 'weather_lights',
    title: 'Gecə, yağış və duman şəraitində işıq cihazları',
    sourceRef: 'PDF Bölmə 3.4.1, 4.3.1 (səh. 52, 69–71) · YHQ Maddə 73',
    summary:
      'Qaranlıqda və məhdud görünmə şəraitində faralar düzgün rejimdə qoşulmalı, qarşıdan gələn nəqliyyata 150 m qalmış uzaq işıq yaxın işığa keçirilməlidir.',
    bullets: [
      'Gecə vaxtı yaxın və ya uzaq işıqlar yandırılmalıdır; qarşıdakı avtomobilə ən azı 150 m qalmış uzaq işıq söndürülür.',
      'Dumanlı havada uzaq işıq (High Beam) yandırmaq QADAĞANDIR (duman pərdəsi işığı əks etdirib görməni bağlayır); yaxın işıq + duman faraları qoşulur.',
      'Yağışlı havada şüşəsilənlər işlək olmalı, sürət və ara məsafəsi tənzimlənməlidir.',
    ],
    simConnection:
      'Gecə farasız sürmək, dumanda uzaq işıq qoşmaq və ya yağışda şüşəsiləni aktiv etməmək qayda pozuntusu kimi izah olunur.',
  },
  {
    id: 'law_updates_discrepancy',
    title: 'Rəsmi Qanunvericilik Müqayisəsi (PDF 2019 vs. dyp.gov.az)',
    sourceRef: 'YHQ Maddə 30 & DYP İmtahan Qaydaları (dyp.gov.az) vs. PDF səh. 13, 63',
    summary:
      'Simulyator təqdim edilən 2019 PDF dərs vəsaiti ilə yanaşı, hazırda qüvvədə olan Azərbaycan Respublikası qanunvericiliyindəki yenilikləri əsas götürür.',
    bullets: [
      'TEXNİKİ BAXIŞ FƏRQİ: PDF vəsaitdə (səh. 13) "nəqliyyat vasitələri ildə bir dəfə texniki baxışdan keçirilməlidir" yazılmışdır. Lakin qüvvədə olan "Yol Hərəkəti Haqqında" Qanunun 30-cu maddəsinə əsasən: minik avtomobilləri istehsal olunduğu vaxtdan 4 il keçdikdə 2 ildə bir dəfə, 10 il keçdikdə isə ildə bir dəfə texniki baxışdan keçirilir (növbəti baxış üçün əvvəlki tarixdən 20 gün müddət verilir).',
      'İMTİHAN QİYMƏTLƏNDİRMƏSİ: PDF (səh. 63) və DYP təcrübi imtahan qaydalarına görə imtahan 2 mərhələlidir (1. Avtodrom/meydança, 2. Şəhər marşrutu). 100 bonus balı modelində kobud pozuntular (qırmızı işıq, bütöv/sarı xətti tapdalama, piyadaya yol verməmə, toqquşma) 100 bal çıxılmaqla dərhal "Qeyri-məqbul" nəticə verir; yüngül səhvlər (əl əyləci, dönmə siqnalının unudulması) 10 bal çıxır.',
      'TRANSMİSSİYA QEYDİ (PDF səh. 23 & dyp.gov.az): "B" kateqoriyası üzrə təcrübi imtahan avtomatik transmissiyalı avtomobildə (BMW M5 kimi) verilərsə, sürücülük vəsiqəsində yalnız avtomatik sürətlər qutulu avtomobili idarə etmək hüququ qeyd olunur.',
    ],
    simConnection:
      'İmtahan rejimi rəsmi 100 bonus balı və kritik/yüngül pozuntu fərqinə əsaslanır; heç bir əsassız cərimə məbləği uydurulmur.',
    discrepancyNote:
      'Texniki baxış dövriliyi üzrə 2019 PDF-i ilə qüvvədə olan YHQ Maddə 30 arasındakı fərqdə qüvvədə olan Qanun əsas götürülmüşdür.',
  },
];

export interface TrainingMissionPreset {
  id: string;
  environment: 'city' | 'village' | 'highway';
  weather: 'sunny' | 'rain' | 'fog';
  timeOfDay: 'day' | 'night';
  title: string;
  description: string;
}

export const TRAINING_MISSIONS: TrainingMissionPreset[] = [
  {
    id: 'city-basics',
    environment: 'city',
    weather: 'sunny',
    timeOfDay: 'day',
    title: 'Şəhər Təlimi: İlkin hazırlıq, işıqfor və piyada keçidi',
    description:
      'Kəmər, D rejimi, dönmə siqnalları, işıqfor, piyada keçidi və DYP yoxlaması üzrə addım-addım praktiki məşq.',
  },
  {
    id: 'village-curves',
    environment: 'village',
    weather: 'fog',
    timeOfDay: 'day',
    title: 'Kənd Yolu Təlimi: Dumanlı havada dar yollar və döngələr',
    description:
      'Məhdud görünüşlü döngələr, duman faralarının düzgün seçilməsi (uzaq işıq qadağası) və qarşıdan gələnlə ehtiyatlı keçid.',
  },
  {
    id: 'highway-lanes',
    environment: 'highway',
    weather: 'sunny',
    timeOfDay: 'night',
    title: 'Magistral Təlimi: Gecə sürət rejimi, zolaq dəyişmə və ara məsafəsi',
    description:
      '110 km/saat magistral qaydası, faraların idarəsi, siqnalla zolaq dəyişmə və təhlükəsiz ara məsafəsi.',
  },
];
