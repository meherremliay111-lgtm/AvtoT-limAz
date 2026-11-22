export type SignCategoryId =
  | 'warning'
  | 'priority'
  | 'prohibitory'
  | 'mandatory'
  | 'informative'
  | 'service'
  | 'additional'
  | 'recognition';

export interface SignCategoryMeta {
  id: SignCategoryId;
  order: number;
  title: string;
  shortTitle: string;
  shapeRule: string;
  description: string;
  pdfRef: string;
}

export interface RoadSignItem {
  code: string;
  category: SignCategoryId;
  name: string;
  meaning: string;
  driverAction: string;
  simImpact: string;
  sourceRef: string;
  shape: 'triangle' | 'circle' | 'diamond' | 'octagon' | 'rect' | 'square' | 'plate';
  bgColor: string;
  borderColor: string;
  textColor?: string;
  symbolText?: string;
  symbolType:
    | 'pedestrian_warn'
    | 'rail_barrier'
    | 'equal_cross'
    | 'side_road_right'
    | 'narrow_road'
    | 'slippery'
    | 'road_works'
    | 'roundabout_warn'
    | 'sharp_turn'
    | 'animals'
    | 'main_road'
    | 'main_road_end'
    | 'yield'
    | 'stop'
    | 'oncoming_priority'
    | 'my_priority'
    | 'no_entry'
    | 'no_traffic'
    | 'speed_limit'
    | 'no_overtake'
    | 'no_overtake_end'
    | 'no_stopping'
    | 'no_parking'
    | 'no_left'
    | 'no_right'
    | 'no_uturn'
    | 'min_distance'
    | 'go_straight'
    | 'go_right'
    | 'go_left'
    | 'roundabout_mand'
    | 'bike_lane'
    | 'motorway'
    | 'motorway_end'
    | 'one_way'
    | 'city_start'
    | 'pedestrian_cross'
    | 'parking'
    | 'bus_stop'
    | 'living_zone'
    | 'first_aid'
    | 'hospital'
    | 'fuel'
    | 'service'
    | 'food'
    | 'rest_area'
    | 'dist_plate'
    | 'zone_plate'
    | 'main_dir_plate'
    | 'rain_plate'
    | 'training_car'
    | 'novice'
    | 'hazard_triangle';
}

export const SIGN_CATEGORIES: SignCategoryMeta[] = [
  {
    id: 'warning',
    order: 1,
    title: '1. Xəbərdarlıq nişanları',
    shortTitle: 'Xəbərdarlıq',
    shapeRule: 'Ağ fonlu bərabərtərəfli üçbucaq, qırmızı haşiyə',
    description:
      'Yolun təhlükəli sahəsinə yaxınlaşma və təhlükənin xarakteri barədə məlumat verir. Məhdudiyyət qoymur, lakin sürücü diqqətini artırmalı və şəraitə uyğun tədbir görməlidir.',
    pdfRef: 'Bölmə 2.3.1, səh. 28 · YHQ Əlavə 1',
  },
  {
    id: 'priority',
    order: 2,
    title: '2. Üstünlük nişanları',
    shortTitle: 'Üstünlük',
    shapeRule: 'Müxtəlif forma və rənglər (romb, üçbucaq, səkkizbucaqlı)',
    description:
      'Yolayrıclarını, hərəkət hissələrinin kəsişmələrini və əks istiqamətdə hərəkət edən nəqliyyat vasitələrinin dar sahələri keçmə növbəliliyini müəyyən edir.',
    pdfRef: 'Bölmə 2.3.1, səh. 27–28 · YHQ Əlavə 2',
  },
  {
    id: 'prohibitory',
    order: 3,
    title: '3. Qadağan nişanları',
    shortTitle: 'Qadağan',
    shapeRule: 'Dairəvi forma, ağ (və ya mavi) fon, qırmızı haşiyə',
    description:
      'Yol hərəkəti iştirakçılarının hərəkətinə müəyyən məhdudiyyətlər qoyur və ya əvvəl qoyulmuş məhdudiyyəti ləğv edir.',
    pdfRef: 'Bölmə 2.3.1, səh. 28 · YHQ Əlavə 3',
  },
  {
    id: 'mandatory',
    order: 4,
    title: '4. Məcburi hərəkət istiqaməti nişanları',
    shortTitle: 'Məcburi',
    shapeRule: 'Dairəvi forma, mavi fon, ağ ox və ya simvol',
    description:
      'Yalnız göstərilən istiqamətlərdə hərəkət etməyi, minimum sürəti və ya müəyyən nəqliyyat növlərinin hərəkət zolağını məcburi edir.',
    pdfRef: 'Bölmə 2.3.1, səh. 27, 34 · YHQ Əlavə 4',
  },
  {
    id: 'informative',
    order: 5,
    title: '5. Məlumatverici-göstərici nişanlar',
    shortTitle: 'Məlumatverici',
    shapeRule: 'Düzbucaq və ya kvadrat forma, mavi / yaşıl / ağ fon',
    description:
      'Hərəkətin müəyyən rejimini (avtomagistral, yaşayış zonası, birtərəfli yol, parklama) tətbiq və ya ləğv edir, yaşayış məntəqələri barədə məlumat verir.',
    pdfRef: 'Bölmə 2.3.1, səh. 28 · YHQ Əlavə 5',
  },
  {
    id: 'service',
    order: 6,
    title: '6. Servis nişanları',
    shortTitle: 'Servis',
    shapeRule: 'Düzbucaq forma, enli mavi haşiyə, ağ içlik',
    description:
      'Yollarda tibb məntəqəsi, xəstəxana, yanacaqdoldurma, texniki xidmət, qidalanma və istirahət obyektlərinin yerləşməsini göstərir.',
    pdfRef: 'Bölmə 2.3.1, səh. 29 · YHQ Əlavə 6',
  },
  {
    id: 'additional',
    order: 7,
    title: '7. Əlavə məlumat nişanları (lövhəciklər)',
    shortTitle: 'Əlavə məlumat',
    shapeRule: 'Ağ fonlu düzbucaq lövhəciklər, qara haşiyə',
    description:
      'Birlikdə tətbiq olunduğu əsas yol nişanının altında quraşdırılır və onun təsir məsafəsini, istiqamətini, vaxtını və ya nəqliyyat növünü dəqiqləşdirir.',
    pdfRef: 'Bölmə 2.3.1, səh. 29 · YHQ Əlavə 7',
  },
  {
    id: 'recognition',
    order: 8,
    title: 'Tanınma və xüsusi fərqləndirmə nişanları',
    shortTitle: 'Tanınma',
    shapeRule: 'Nəqliyyat vasitəsinin üzərində quraşdırılan standart nişanlar',
    description:
      'Təlim avtomobili, qəza dayanma nişanı, təcrübəsiz sürücü, uşaqların daşınması, əlil və həkim kimi nəqliyyat vasitələrinin tanınma nişanlarıdır.',
    pdfRef: 'Bölmə 2.3.1, səh. 29–30',
  },
];

export const ROAD_SIGNS: RoadSignItem[] = [
  // 1. Xəbərdarlıq nişanları
  {
    code: '1.20',
    category: 'warning',
    name: 'Piyada keçidi',
    meaning: '5.16.1 və 5.16.2 nişanları və ya 1.14.1–1.14.3 nişanlanması ilə işarələnmiş piyada keçidinə yaxınlaşma.',
    driverAction: 'Yaşayış məntəqəsində 50–100 m, kənarda 150–300 m əvvəl sürəti azaldın və piyadalara yol verməyə hazır olun.',
    simImpact: 'Şəhər və kənd yollarında piyada keçidindən əvvəl sürəti azaltma xəbərdarlığı verir.',
    sourceRef: 'PDF səh. 28, 68 · YHQ Əlavə 1 (1.20)',
    shape: 'triangle',
    bgColor: '#FFFFFF',
    borderColor: '#DC2626',
    symbolType: 'pedestrian_warn',
  },
  {
    code: '1.1',
    category: 'warning',
    name: 'Şlaqbaumlu dəmiryol keçidi',
    meaning: 'Qarşıda şlaqbaumla təchiz edilmiş dəmiryol keçidinin olduğunu bildirir.',
    driverAction: 'Sürəti azaldın, şlaqbaumun vəziyyətinə və işıqfor siqnalına baxın, ötmə əməliyyatı aparmayın.',
    simImpact: 'Keçidə 100 m qalmış ötmə və geriyə dönmə qadağandır.',
    sourceRef: 'PDF səh. 31–32 · YHQ Əlavə 1 (1.1)',
    shape: 'triangle',
    bgColor: '#FFFFFF',
    borderColor: '#DC2626',
    symbolType: 'rail_barrier',
  },
  {
    code: '1.6',
    category: 'warning',
    name: 'Eyni əhəmiyyətli yolların kəsişməsi',
    meaning: 'Qarşıda nizamlanmayan bərabər əhəmiyyətli yol ayrıcı var.',
    driverAction: 'Kəsişmədə sağdan yaxınlaşan bütün relssiz nəqliyyat vasitələrinə yol verin ("Sağ əl qaydası").',
    simImpact: 'Sağdan gələn AI avtomobilinə yol vermədikdə qayda pozuntusu qeydə alınır.',
    sourceRef: 'PDF səh. 33, 62 · YHQ Əlavə 1 (1.6)',
    shape: 'triangle',
    bgColor: '#FFFFFF',
    borderColor: '#DC2626',
    symbolType: 'equal_cross',
  },
  {
    code: '1.7',
    category: 'warning',
    name: 'Dairəvi hərəkətlə kəsişmə',
    meaning: 'Qarşıda dairəvi hərəkət təşkil olunmuş yol ayrıcı var.',
    driverAction: 'Sürəti azaldın, nişanlarla başqa qayda göstərilməyibsə dairədə hərəkət edənlərə yol verin.',
    simImpact: 'Şəhərdə dairəvi yol ayrıcına girişdən əvvəl xəbərdarlıq edir.',
    sourceRef: 'PDF səh. 39, 75 · YHQ Əlavə 1 (1.7)',
    shape: 'triangle',
    bgColor: '#FFFFFF',
    borderColor: '#DC2626',
    symbolType: 'roundabout_warn',
  },
  {
    code: '1.11.1',
    category: 'warning',
    name: 'Təhlükəli döngə',
    meaning: 'Kiçik radiuslu və ya məhdud görünüşlü təhlükəli sağ döngə.',
    driverAction: 'Döngədən əvvəl sürəti azaldın, əks zolağa çıxmayın və ötmə etməyin.',
    simImpact: 'Kənd yollarında məhdud görünüşlü döngələrdə ötmə pozuntusunu yoxlayır.',
    sourceRef: 'PDF səh. 39, 71 · YHQ Əlavə 1 (1.11.1)',
    shape: 'triangle',
    bgColor: '#FFFFFF',
    borderColor: '#DC2626',
    symbolType: 'sharp_turn',
  },
  {
    code: '1.13',
    category: 'warning',
    name: 'Sürüşkən yol',
    meaning: 'Yol örtüyünün sürüşmə əmsalı aşağı olan sahəsi.',
    driverAction: 'Kəskin tormozlama və sərt sükan manevrlərindən çəkinin, ara məsafəsini artırın.',
    simImpact: 'Yağışlı və sürüşkən hissələrdə tormoz məsafəsini xəbərdar edir.',
    sourceRef: 'PDF səh. 61, 71 · YHQ Əlavə 1 (1.13)',
    shape: 'triangle',
    bgColor: '#FFFFFF',
    borderColor: '#DC2626',
    symbolType: 'slippery',
  },
  {
    code: '1.18',
    category: 'warning',
    name: 'Yolun daralması',
    meaning: 'Hərəkət hissəsinin hər iki tərəfdən və ya bir tərəfdən daralması.',
    driverAction: 'Zolaq dəyişərkən dönmə siqnalı verin və zolağı dəyişməyən avtomobilə yol verin.',
    simImpact: 'Daralan hissədə əvvəlcədən düzgün zolağa keçməyi tələb edir.',
    sourceRef: 'PDF səh. 19, 70 · YHQ Əlavə 1 (1.18)',
    shape: 'triangle',
    bgColor: '#FFFFFF',
    borderColor: '#DC2626',
    symbolType: 'narrow_road',
  },
  {
    code: '1.23',
    category: 'warning',
    name: 'Yol işləri',
    meaning: 'Yolun hərəkət hissəsində təmir və ya tikinti işləri aparılır.',
    driverAction: 'Sürəti azaldın, müvəqqəti nişanlara və narıncı sayrışan işıqlara diqqət edin.',
    simImpact: 'Təmir zonasında sürət həddinə və manevr qaydalarına nəzarət edir.',
    sourceRef: 'PDF səh. 24, 29 · YHQ Əlavə 1 (1.23)',
    shape: 'triangle',
    bgColor: '#FEF08A',
    borderColor: '#DC2626',
    symbolType: 'road_works',
  },
  {
    code: '1.24',
    category: 'warning',
    name: 'Mal-qara qovulması',
    meaning: 'Kənd yollarında yoldan heyvanların keçməsi ehtimalı olan sahə.',
    driverAction: 'Sürəti azaldın, heyvan sürüsü olduqda tam dayanın.',
    simImpact: 'Kənd yolunun xarakterik təhlükə sahəsini bildirir.',
    sourceRef: 'PDF səh. 26 · YHQ Əlavə 1 (1.24)',
    shape: 'triangle',
    bgColor: '#FFFFFF',
    borderColor: '#DC2626',
    symbolType: 'animals',
  },

  // 2. Üstünlük nişanları
  {
    code: '2.1',
    category: 'priority',
    name: 'Baş yol',
    meaning: 'Nizamlanmayan yolayrıclarında birinci keçmək hüququ verən yol.',
    driverAction: 'Üstünlüyə maliksiniz, lakin piyadalara və operativ nəqliyyat vasitələrinə yol verməyi unutmayın.',
    simImpact: 'Kəsişmələrdə baş yolda olduğunuzu göstərir; digər avtomobillər sizə yol verir.',
    sourceRef: 'PDF səh. 7, 27, 33 · YHQ Əlavə 2 (2.1)',
    shape: 'diamond',
    bgColor: '#FACC15',
    borderColor: '#FFFFFF',
    symbolType: 'main_road',
  },
  {
    code: '2.2',
    category: 'priority',
    name: 'Baş yolun sonu',
    meaning: '2.1 nişanı ilə müəyyən edilmiş baş yol statusunun bitməsi.',
    driverAction: 'Növbəti yolayrıcında sağdan gələnlərə və ya digər üstünlük nişanlarına uyğun yol verin.',
    simImpact: 'Üstünlük zonasının bitdiyini xəbərdar edir.',
    sourceRef: 'PDF səh. 27 · YHQ Əlavə 2 (2.2)',
    shape: 'diamond',
    bgColor: '#FACC15',
    borderColor: '#FFFFFF',
    symbolType: 'main_road_end',
  },
  {
    code: '2.4',
    category: 'priority',
    name: 'Yol verin',
    meaning: 'Kəsişən (və ya lövhəciklə göstərilən baş) yolla hərəkət edən nəqliyyat vasitələrinə yol verilməlidir.',
    driverAction: 'Baş yoldakı avtomobillər maneəsiz keçənə qədər sürəti azaldın və ya dayanın.',
    simImpact: 'Yol ayrıcına baş yolda maşın varkən çıxsanız "Yol verməmə" pozuntusu yazılır.',
    sourceRef: 'PDF səh. 4, 27, 33, 45 · YHQ Əlavə 2 (2.4)',
    shape: 'triangle',
    bgColor: '#FFFFFF',
    borderColor: '#DC2626',
    symbolType: 'yield',
  },
  {
    code: '2.5',
    category: 'priority',
    name: 'Dayanmadan keçmək qadağandır (STOP)',
    meaning: 'Stop-xəttin, o olmadıqda isə kəsişən hərəkət hissəsinin kənarının qarşısında məcburi dayanma.',
    driverAction: 'Tam 0 km/saat sürətə qədər dayanın, sağa-sola baxın və yol verdikdən sonra hərəkətə başlayın.',
    simImpact: 'Tam dayanmadan (sürət > 2 km/saat) kəsişməyə daxil olsanız cərimə/xəta qeydə alınır.',
    sourceRef: 'PDF səh. 16, 27, 75 · YHQ Əlavə 2 (2.5)',
    shape: 'octagon',
    bgColor: '#DC2626',
    borderColor: '#FFFFFF',
    textColor: '#FFFFFF',
    symbolText: 'STOP',
    symbolType: 'stop',
  },
  {
    code: '2.6',
    category: 'priority',
    name: 'Qarşıdan gələn nəqliyyatın üstünlüyü',
    meaning: 'Dar yol sahəsində qarşıdan gələn nəqliyyat vasitəsinin keçməsini çətinləşdirirsə, giriş qadağandır.',
    driverAction: 'Dar sahəyə girməzdən əvvəl qarşıdakı avtomobilə yol verin.',
    simImpact: 'Kənd yolundakı dar körpü/sahədə qarşıdan gələnə yol verməni yoxlayır.',
    sourceRef: 'PDF səh. 27 · YHQ Əlavə 2 (2.6)',
    shape: 'circle',
    bgColor: '#FFFFFF',
    borderColor: '#DC2626',
    symbolType: 'oncoming_priority',
  },
  {
    code: '2.7',
    category: 'priority',
    name: 'Qarşıdan gələn nəqliyyata nisbətən üstünlük',
    meaning: 'Yolun dar sahəsində qarşıdan gələn nəqliyyata nisbətən üstün hərəkət hüququ.',
    driverAction: 'Qarşı tərəf sizə yol verməlidir, lakin təhlükəsizliyə əmin olaraq keçin.',
    simImpact: 'Dar sahədə keçid üstünlüyünü bildirir.',
    sourceRef: 'PDF səh. 27 · YHQ Əlavə 2 (2.7)',
    shape: 'square',
    bgColor: '#0284C7',
    borderColor: '#FFFFFF',
    symbolType: 'my_priority',
  },

  // 3. Qadağan nişanları
  {
    code: '3.1',
    category: 'prohibitory',
    name: 'Giriş qadağandır',
    meaning: 'Bütün nəqliyyat vasitələrinin bu istiqamətdə girişi qadağandır ("Kərpic").',
    driverAction: 'Bu küçəyə və ya qarşı hərəkət zolağına daxil olmayın.',
    simImpact: 'Nişandan keçdikdə kritik qayda pozuntusu (-100 bal / DYP xəbərdarlığı) baş verir.',
    sourceRef: 'PDF səh. 28, 40 · YHQ Əlavə 3 (3.1)',
    shape: 'circle',
    bgColor: '#DC2626',
    borderColor: '#FFFFFF',
    symbolType: 'no_entry',
  },
  {
    code: '3.2',
    category: 'prohibitory',
    name: 'Hərəkət qadağandır',
    meaning: 'Bütün nəqliyyat vasitələrinin hərəkəti qadağandır (xüsusi istisnalar xaric).',
    driverAction: 'Alternativ marşrut seçin, nişanın təsir sahəsinə daxil olmayın.',
    simImpact: 'Qapalı küçəyə daxil olduqda pozuntu qeydə alır.',
    sourceRef: 'PDF səh. 28, 40 · YHQ Əlavə 3 (3.2)',
    shape: 'circle',
    bgColor: '#FFFFFF',
    borderColor: '#DC2626',
    symbolType: 'no_traffic',
  },
  {
    code: '3.24',
    category: 'prohibitory',
    name: 'Maksimum sürətin məhdudlaşdırılması (40 / 60 / 90 / 110)',
    meaning: 'Nişanda göstəriləndən (km/saat) artıq sürətlə hərəkət etmək qadağandır.',
    driverAction: 'Sürəti nişanda göstərilən həddən aşağı salın (növbəti yolayrıcına və ya ləğv nişanına qədər).',
    simImpact: 'Simulyatorda aktiv sürət limitini dərhal yeniləyir və aşmanı izləyir.',
    sourceRef: 'PDF səh. 28, 39 · YHQ Əlavə 3 (3.24)',
    shape: 'circle',
    bgColor: '#FFFFFF',
    borderColor: '#DC2626',
    symbolText: '60',
    symbolType: 'speed_limit',
  },
  {
    code: '3.20',
    category: 'prohibitory',
    name: 'Ötmək qadağandır',
    meaning: 'Bütün nəqliyyat vasitələrini ötmək qadağandır (30 km/saatdan aşağı gedən təkərli texnikalar istisna ola bilər).',
    driverAction: 'Öz zolağınızda qalın, əks zolağa çıxaraq ötmə etməyin.',
    simImpact: 'Təsir zonasında qarşı zolağa çıxaraq ötmə cəhdi qayda pozuntusu sayılır.',
    sourceRef: 'PDF səh. 39–40, 67 · YHQ Əlavə 3 (3.20)',
    shape: 'circle',
    bgColor: '#FFFFFF',
    borderColor: '#DC2626',
    symbolType: 'no_overtake',
  },
  {
    code: '3.21',
    category: 'prohibitory',
    name: 'Ötmək qadağandır zonasının sonu',
    meaning: '3.20 nişanı ilə tətbiq edilmiş ötmə qadağasını ləğv edir.',
    driverAction: 'Yalnız qarşı zolaq boş və görünüş kifayət qədər olduqda təhlükəsiz ötə bilərsiniz.',
    simImpact: 'Ötmə qadağası zonasını bitirir.',
    sourceRef: 'PDF səh. 28 · YHQ Əlavə 3 (3.21)',
    shape: 'circle',
    bgColor: '#FFFFFF',
    borderColor: '#1E293B',
    symbolType: 'no_overtake_end',
  },
  {
    code: '3.27',
    category: 'prohibitory',
    name: 'Dayanmaq qadağandır',
    meaning: 'Nəqliyyat vasitələrinin dayanması və durması qadağandır.',
    driverAction: 'Bu nişanın təsir zonasında avtomobili saxlamayın (yalnız piyadaya/işıqfora görə məcburi dayanma istisnadır).',
    simImpact: 'Zonada P rejiminə keçib və ya 4 saniyədən çox saxladıqda pozuntu qeyd olunur.',
    sourceRef: 'PDF səh. 40, 68 · YHQ Əlavə 3 (3.27)',
    shape: 'circle',
    bgColor: '#1D4ED8',
    borderColor: '#DC2626',
    symbolType: 'no_stopping',
  },
  {
    code: '3.28',
    category: 'prohibitory',
    name: 'Durmaq qadağandır',
    meaning: 'Nəqliyyat vasitələrinin durması qadağandır (sərnişin mindirib-düşürmə / yük boşaltma istisna olmaqla).',
    driverAction: 'Avtomobili uzun müddətə park etməyin, təyin olunmuş parklama yerinə keçin.',
    simImpact: 'Qadağan zonada parklanmanı (P rejimi) bloklayır və xəbərdarlıq verir.',
    sourceRef: 'PDF səh. 40, 68 · YHQ Əlavə 3 (3.28)',
    shape: 'circle',
    bgColor: '#1D4ED8',
    borderColor: '#DC2626',
    symbolType: 'no_parking',
  },
  {
    code: '3.19',
    category: 'prohibitory',
    name: 'Geriyə dönmək qadağandır',
    meaning: 'Geriyə dönmə manevri qadağandır (sola dönməyə icazə verilir).',
    driverAction: 'Geriyə dönməyin, zərurət varsa sola dönün və ya düzünə hərəkət edin.',
    simImpact: 'Kəsişmədə U-turn manevrini qadağan edir.',
    sourceRef: 'PDF səh. 63 · YHQ Əlavə 3 (3.19)',
    shape: 'circle',
    bgColor: '#FFFFFF',
    borderColor: '#DC2626',
    symbolType: 'no_uturn',
  },

  // 4. Məcburi hərəkət nişanları
  {
    code: '4.1.1',
    category: 'mandatory',
    name: 'Düzünə hərəkət',
    meaning: 'Yalnız oxla göstərilən düzünə istiqamətdə hərəkətə icazə verilir.',
    driverAction: 'Yolayrıcında sağa, sola və ya geriyə dönməyin.',
    simImpact: 'Düzünə məcburi kəsişmədə dönmə pozuntusunu yoxlayır.',
    sourceRef: 'PDF səh. 28, 34 · YHQ Əlavə 4 (4.1.1)',
    shape: 'circle',
    bgColor: '#0284C7',
    borderColor: '#FFFFFF',
    symbolType: 'go_straight',
  },
  {
    code: '4.1.2',
    category: 'mandatory',
    name: 'Sağa hərəkət',
    meaning: 'Yalnız sağa dönməyə icazə verilir.',
    driverAction: 'Sağa dönmə siqnalını yandırın və sağa dönün.',
    simImpact: 'Məcburi sağa dönmə zolağında yönləndirir.',
    sourceRef: 'PDF səh. 34 · YHQ Əlavə 4 (4.1.2)',
    shape: 'circle',
    bgColor: '#0284C7',
    borderColor: '#FFFFFF',
    symbolType: 'go_right',
  },
  {
    code: '4.3',
    category: 'mandatory',
    name: 'Dairəvi hərəkət',
    meaning: 'Yalnız oxlarla göstərilmiş istiqamətdə (saat əqrəbinin əksinə) dairə ətrafında hərəkətə icazə verilir.',
    driverAction: 'Dönmə siqnalını yandırın, dairədəki avtomobillərə yol verin və saat əqrəbinin əksinə dairəyə daxil olun.',
    simImpact: 'Şəhər dairəvi kəsişməsində hərəkət istiqamətini və yol verməni tənzimləyir.',
    sourceRef: 'PDF səh. 39, 75 · YHQ Əlavə 4 (4.3)',
    shape: 'circle',
    bgColor: '#0284C7',
    borderColor: '#FFFFFF',
    symbolType: 'roundabout_mand',
  },
  {
    code: '4.5',
    category: 'mandatory',
    name: 'Velosiped yolu',
    meaning: 'Yalnız velosipedlər və mopedlər üçün nəzərdə tutulmuş yol.',
    driverAction: 'Avtomobillə bu yola daxil olmayın, kəsişmələrdə velosipedçilərə yol verin.',
    simImpact: 'Velosipedçilərin ayrı hərəkət zolağını bildirir.',
    sourceRef: 'PDF səh. 25–26 · YHQ Əlavə 4 (4.5)',
    shape: 'circle',
    bgColor: '#0284C7',
    borderColor: '#FFFFFF',
    symbolType: 'bike_lane',
  },

  // 5. Məlumatverici-göstərici nişanlar
  {
    code: '5.1',
    category: 'informative',
    name: 'Avtomagistral',
    meaning: 'Avtomagistrallarda hərəkət qaydalarının qüvvədə olduğu yol. Minik avtomobilləri üçün maksimum sürət 110 km/saatdır.',
    driverAction: 'Sürətləndirmə zolağından istifadə edib baş yola yol verərək qoşulun. Dayanma/geriyə hərəkət qadağandır.',
    simImpact: 'Magistral mühitində sürət limitini 110 km/saat edir, zolaq və dayanma qaydalarını aktivləşdirir.',
    sourceRef: 'PDF səh. 6–7, 31, 39 · YHQ Əlavə 5 (5.1)',
    shape: 'rect',
    bgColor: '#15803D',
    borderColor: '#FFFFFF',
    symbolType: 'motorway',
  },
  {
    code: '5.5',
    category: 'informative',
    name: 'Birtərəfli hərəkətli yol',
    meaning: 'Bütün eni boyu nəqliyyat vasitələrinin yalnız bir istiqamətdə hərəkət etdiyi yol.',
    driverAction: 'Qarşıdan nəqliyyat gəlməyəcəyini nəzərə alın, lakin əks istiqamətdə geri getməyin.',
    simImpact: 'Birtərəfli küçə istiqamətini bildirir.',
    sourceRef: 'PDF səh. 28 · YHQ Əlavə 5 (5.5)',
    shape: 'square',
    bgColor: '#0284C7',
    borderColor: '#FFFFFF',
    symbolType: 'one_way',
  },
  {
    code: '5.16.1',
    category: 'informative',
    name: 'Piyada keçidi',
    meaning: 'Piyadaların yolu keçməsi üçün ayrılmış və işarələnmiş zona.',
    driverAction: 'Keçidə daxil olan və ya daxil olmaqda olan piyadalara mütləq yol verin. Ötmə və geriyə dönmə qadağandır.',
    simImpact: 'Zebra keçidində piyada olduqda tam dayanma tələb edir (pozularsa -100 bal).',
    sourceRef: 'PDF səh. 28, 68–69 · YHQ Əlavə 5 (5.16.1)',
    shape: 'square',
    bgColor: '#0284C7',
    borderColor: '#FFFFFF',
    symbolType: 'pedestrian_cross',
  },
  {
    code: '5.15',
    category: 'informative',
    name: 'Duracaq (Parklama) yeri',
    meaning: 'Nəqliyyat vasitələrinin parklanması üçün xüsusi ayrılmış meydança.',
    driverAction: 'Siqnal verərək xətlərin daxilinə səliqəli park edin və P rejiminə keçin.',
    simImpact: 'Təlim və imtahan tapşırıqlarında parklanma zonasını işarələyir.',
    sourceRef: 'PDF səh. 8–9, 74–75 · YHQ Əlavə 5 (5.15)',
    shape: 'square',
    bgColor: '#0284C7',
    borderColor: '#FFFFFF',
    symbolText: 'P',
    symbolType: 'parking',
  },
  {
    code: '5.12',
    category: 'informative',
    name: 'Avtobus dayanacağı',
    meaning: 'Ümumi istifadədə olan nəqliyyat vasitələrinin (avtobus) dayanacaq yeri.',
    driverAction: 'Yaşayış məntəqəsində dayanacaqdan hərəkətə başlayan avtobusa yol verin. Dayanacaqdan 15 m məsafədə durmayın.',
    simImpact: 'Şəhər avtobusları dayanacaqdan çıxarkən sağ zolaqda yol verməni yoxlayır.',
    sourceRef: 'PDF səh. 37, 43 · YHQ Əlavə 5 (5.12)',
    shape: 'rect',
    bgColor: '#0284C7',
    borderColor: '#FFFFFF',
    symbolType: 'bus_stop',
  },
  {
    code: '5.38',
    category: 'informative',
    name: 'Yaşayış zonası',
    meaning: 'Piyadaların həm səkidə, həm də hərəkət hissəsində üstünlüyə malik olduğu zona. Maksimum sürət 20 km/saatdır.',
    driverAction: 'Sürəti 20 km/saatdan aşağı saxlayın, piyadalara yol verin, zonadan çıxarkən bütün iştirakçılara yol verin.',
    simImpact: 'Yaşayış zonası daxilində sürət limitini 20 km/saat edir.',
    sourceRef: 'PDF səh. 25 · YHQ Əlavə 5 (5.38)',
    shape: 'rect',
    bgColor: '#0284C7',
    borderColor: '#FFFFFF',
    symbolType: 'living_zone',
  },

  // 6. Servis nişanları
  {
    code: '6.1',
    category: 'service',
    name: 'İlk tibbi yardım məntəqəsi',
    meaning: 'Yol kənarında təcili tibbi yardım məntəqəsinin yerləşməsini göstərir.',
    driverAction: 'Zərərçəkən olduqda və ya tibbi ehtiyac yarandıqda bu istiqamətə dönün.',
    simImpact: 'Şəhər və magistral obyekt nişanı kimi göstərilir.',
    sourceRef: 'PDF səh. 29 · YHQ Əlavə 6 (6.1)',
    shape: 'rect',
    bgColor: '#0284C7',
    borderColor: '#FFFFFF',
    symbolType: 'first_aid',
  },
  {
    code: '6.3',
    category: 'service',
    name: 'Yanacaqdoldurma məntəqəsi (YDM)',
    meaning: 'Qarşıda avtomobillər üçün yanacaqdoldurma məntəqəsi var.',
    driverAction: 'Yanacaq azaldıqda YDM zonasına daxil olub E düyməsi ilə yanacaq doldura bilərsiniz.',
    simImpact: '3D dünyada YDM ərazisində yanacaq çənini doldurmaq mümkündür.',
    sourceRef: 'PDF səh. 29 · YHQ Əlavə 6 (6.3)',
    shape: 'rect',
    bgColor: '#0284C7',
    borderColor: '#FFFFFF',
    symbolType: 'fuel',
  },
  {
    code: '6.4',
    category: 'service',
    name: 'Texniki xidmət məntəqəsi',
    meaning: 'Avtomobillərin texniki təmir və xidmət məntəqəsi.',
    driverAction: 'Nasazlıq yarandıqda texniki xidmətə müraciət edin.',
    simImpact: 'Magistral və şəhər servis infrastrukturu.',
    sourceRef: 'PDF səh. 29 · YHQ Əlavə 6 (6.4)',
    shape: 'rect',
    bgColor: '#0284C7',
    borderColor: '#FFFFFF',
    symbolType: 'service',
  },
  {
    code: '6.9',
    category: 'service',
    name: 'İstirahət yeri',
    meaning: 'Magistral yollarda hər 50 km-dən bir yaradılan dincəlmə və dayanacaq meydançası.',
    driverAction: 'Uzun səfərdə yorğunluq hiss etdikdə yalnız bu meydançada durun.',
    simImpact: 'Magistralda icazəli dayanma sahəsini göstərir.',
    sourceRef: 'PDF səh. 6, 29, 40 · YHQ Əlavə 6 (6.9)',
    shape: 'rect',
    bgColor: '#0284C7',
    borderColor: '#FFFFFF',
    symbolType: 'rest_area',
  },

  // 7. Əlavə məlumat nişanları (Lövhəciklər)
  {
    code: '7.1.1',
    category: 'additional',
    name: 'Obyektə qədər məsafə (300 m)',
    meaning: 'Əsas nişanın qüvvəyə minəcəyi sahəyə və ya təhlükəli obyektə qədər olan məsafəni göstərir.',
    driverAction: 'Göstərilən məsafədən sonra əsas nişanın tələbinə əməl etməyə hazır olun.',
    simImpact: 'STOP və ya Piyada keçidi nişanlarının altında məsafə dəqiqləşdirir.',
    sourceRef: 'PDF səh. 29 · YHQ Əlavə 7 (7.1.1)',
    shape: 'plate',
    bgColor: '#FFFFFF',
    borderColor: '#0F172A',
    symbolText: '300 m',
    symbolType: 'dist_plate',
  },
  {
    code: '7.13',
    category: 'additional',
    name: 'Baş yolun istiqaməti',
    meaning: 'Yolayrıcında baş yolun istiqamətinin dəyişdiyini (qalın xətt) göstərir.',
    driverAction: 'Baş yolla gedənlər öz aralarında sağdan gələnə yol verir; ikinci dərəcəli yoldakılar hamıya yol verir.',
    simImpact: 'Şəhər mürəkkəb kəsişməsində prioritet sxemini göstərir.',
    sourceRef: 'PDF səh. 33, 37 · YHQ Əlavə 7 (7.13)',
    shape: 'plate',
    bgColor: '#FFFFFF',
    borderColor: '#0F172A',
    symbolType: 'main_dir_plate',
  },
  {
    code: '7.16',
    category: 'additional',
    name: 'Yaş örtük (Yağışlı hava)',
    meaning: 'Əsas nişanın (məsələn, sürət həddinin) yalnız yol örtüyü yaş olduqda qüvvədə olduğunu bildirir.',
    driverAction: 'Yağışlı havada sürəti lövhəciklə birlikdə olan məhdudiyyətə uyğunlaşdırın.',
    simImpact: 'Yağışlı hava rejimində xüsusi sürət məhdudiyyətini aktivləşdirir.',
    sourceRef: 'PDF səh. 29, 71 · YHQ Əlavə 7 (7.16)',
    shape: 'plate',
    bgColor: '#FFFFFF',
    borderColor: '#0F172A',
    symbolType: 'rain_plate',
  },

  // 8. Tanınma nişanları
  {
    code: 'T-NV',
    category: 'recognition',
    name: 'Təlim nəqliyyat vasitəsi',
    meaning: 'Sürücülük öyrətmək üçün istifadə olunan mexaniki nəqliyyat vasitəsinin ön və arxasına vurulur.',
    driverAction: 'Təlim avtomobili yaxınlığında səbirli olun və təhlükəsiz ara məsafəsi saxlayın.',
    simImpact: 'Təlim rejimində BMW M5 damında rəsmi "TƏLİM" lövhəsi aktiv olur.',
    sourceRef: 'PDF səh. 30, 58 · YHQ Maddə 74',
    shape: 'triangle',
    bgColor: '#FFFFFF',
    borderColor: '#DC2626',
    symbolText: 'T',
    symbolType: 'training_car',
  },
  {
    code: 'TƏC-SÜR',
    category: 'recognition',
    name: 'Təcrübəsiz sürücü (!)',
    meaning: '2 ildən az sürücülük stajı olan sürücülərin avtomobilinin arxasında yerləşdirilir.',
    driverAction: 'Sürücünün manevrlərinə qarşı əlavə diqqətli olun.',
    simImpact: 'Nəzəri hazırlıq və yol iştirakçıları nişanlamasında istifadə olunur.',
    sourceRef: 'PDF səh. 30',
    shape: 'plate',
    bgColor: '#FACC15',
    borderColor: '#0F172A',
    symbolText: '!',
    symbolType: 'novice',
  },
  {
    code: 'QƏZA',
    category: 'recognition',
    name: 'Qəza dayanma nişanı',
    meaning: 'Məcburi dayanma və ya YNH zamanı avtomobildən ən azı 30 m arxada quraşdırılır.',
    driverAction: 'Qəza işıqlarını yandırın və nişanı digər sürücülərin görə biləcəyi məsafədə yerləşdirin.',
    simImpact: 'Qəza və ya məcburi dayanma ssenarisində yoxlanılır.',
    sourceRef: 'PDF səh. 17, 30, 41',
    shape: 'triangle',
    bgColor: '#FFFFFF',
    borderColor: '#DC2626',
    symbolType: 'hazard_triangle',
  },
];
