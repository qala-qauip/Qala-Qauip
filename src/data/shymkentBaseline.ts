import type {
  CityConfig,
  DemoScenario,
  IncidentCategory,
  InfrastructureAsset,
  Language,
} from '../types.ts';

export const CITIES: CityConfig[] = [
  {
    id: 'shymkent',
    name: { kk: 'Шымкент', ru: 'Шымкент', en: 'Shymkent' },
    lat: 42.3417,
    lng: 69.5901,
    zoom: 12.5,
    status: 'active_pilot',
    districts: [
      { id: 'abay', name: { kk: 'Абай ауданы', ru: 'Абайский район', en: 'Abay District' }, center: [42.332, 69.545] },
      { id: 'alfarabi', name: { kk: 'Әл-Фараби ауданы', ru: 'Аль-Фарабийский район', en: 'Al-Farabi District' }, center: [42.318, 69.596] },
      { id: 'enbekshi', name: { kk: 'Еңбекші ауданы', ru: 'Енбекшинский район', en: 'Enbekshi District' }, center: [42.312, 69.642] },
      { id: 'karatau', name: { kk: 'Қаратау ауданы', ru: 'Каратауский район', en: 'Karatau District' }, center: [42.376, 69.618] },
      { id: 'turan', name: { kk: 'Тұран ауданы', ru: 'район Туран', en: 'Turan District' }, center: [42.352, 69.575] },
    ],
  },
  {
    id: 'astana',
    name: { kk: 'Астана', ru: 'Астана', en: 'Astana' },
    lat: 51.1694,
    lng: 71.4491,
    zoom: 12,
    status: 'planned',
    districts: [
      { id: 'esil', name: { kk: 'Есіл ауданы', ru: 'район Есиль', en: 'Esil District' }, center: [51.128, 71.43] },
      { id: 'nura', name: { kk: 'Нұра ауданы', ru: 'район Нура', en: 'Nura District' }, center: [51.145, 71.38] },
    ],
  },
  {
    id: 'almaty',
    name: { kk: 'Алматы', ru: 'Алматы', en: 'Almaty' },
    lat: 43.2389,
    lng: 76.8897,
    zoom: 12,
    status: 'planned',
    districts: [
      { id: 'almaly', name: { kk: 'Алмалы ауданы', ru: 'Алмалинский район', en: 'Almaly District' }, center: [43.256, 76.928] },
      { id: 'bostandyk', name: { kk: 'Бостандық ауданы', ru: 'Бостандыкский район', en: 'Bostandyk District' }, center: [43.218, 76.912] },
    ],
  },
];

export const DEPARTMENTS: {
  id: string;
  name: Record<Language, string>;
  categories: IncidentCategory[];
  slaMinutes: number;
}[] = [
  {
    id: 'tjd-shymkent',
    name: {
      kk: 'ТЖД және Өрт сөндіру қызметі',
      ru: 'ДЧС и Служба пожаротушения',
      en: 'Emergency & Fire Response Dept',
    },
    categories: ['fire_smoke', 'flooding', 'fallen_tree'],
    slaMinutes: 15,
  },
  {
    id: 'qala-joldary',
    name: {
      kk: 'Жол және көлік инфрақұрылымы басқармасы',
      ru: 'Управление дорог и транспорта',
      en: 'Roads & Transport Authority',
    },
    categories: ['traffic_accident', 'road_pothole', 'congestion', 'road_obstruction'],
    slaMinutes: 45,
  },
  {
    id: 'shymkent-su',
    name: {
      kk: 'Су арнасы және кәріз қызметі',
      ru: 'Служба водоснабжения и канализации',
      en: 'Water & Drainage Utility',
    },
    categories: ['water_pipe', 'flooding'],
    slaMinutes: 60,
  },
  {
    id: 'ontustik-zharyq',
    name: {
      kk: 'Электр желілері және көше жарығы',
      ru: 'Электросети и уличное освещение',
      en: 'Power Grid & Street Lighting',
    },
    categories: ['power_outage', 'infrastructure_damage'],
    slaMinutes: 60,
  },
  {
    id: 'taza-qala',
    name: {
      kk: 'Санитарлық тазалық және экология',
      ru: 'Санитарная очистка и экология',
      en: 'Sanitation & Ecology Service',
    },
    categories: ['waste_overflow', 'fallen_tree'],
    slaMinutes: 120,
  },
];

export const KZ_EMERGENCY_CONTACTS: {
  number: string;
  label: Record<Language, string>;
  desc: Record<Language, string>;
}[] = [
  {
    number: '112',
    label: { kk: 'Бірыңғай ТЖ қызметі', ru: 'Единая служба спасения', en: 'Unified Emergency Dispatch' },
    desc: { kk: 'Барлық шұғыл жағдайлар', ru: 'Все экстренные ситуации', en: 'All emergencies' },
  },
  {
    number: '101',
    label: { kk: 'Өрт сөндіру қызметі', ru: 'Пожарная служба', en: 'Fire Department' },
    desc: { kk: 'Өрт, түтін, құтқару', ru: 'Пожар, дым, спасение', en: 'Fire, smoke, rescue' },
  },
  {
    number: '102',
    label: { kk: 'Полиция', ru: 'Полиция', en: 'Police' },
    desc: { kk: 'Қоғамдық тәртіп, ЖКО', ru: 'Правопорядок, ДТП', en: 'Law enforcement, traffic accidents' },
  },
  {
    number: '103',
    label: { kk: 'Жедел жәрдем', ru: 'Скорая медицинская помощь', en: 'Ambulance' },
    desc: { kk: 'Медициналық көмек', ru: 'Медицинская помощь', en: 'Medical emergency' },
  },
  {
    number: '104',
    label: { kk: 'Газ апаттық қызметі', ru: 'Аварийная газовая служба', en: 'Gas Emergency' },
    desc: { kk: 'Газ иісі, құбыр ақауы', ru: 'Утечка газа', en: 'Gas leak response' },
  },
  {
    number: '109',
    label: { kk: 'iKomek / Бірыңғай байланыс', ru: 'Единый контакт-центр 109', en: 'Municipal Contact Center 109' },
    desc: { kk: 'Коммуналдық өтініштер', ru: 'Коммунальные обращения', en: 'Municipal utility requests' },
  },
];

export const EMERGENCY_SERVICE_LOCATIONS = [
  { id: 'es-1', type: 'fire', name: 'ӨСБ-1 (Tauke Khan)', lat: 42.3235, lng: 69.5912 },
  { id: 'es-2', type: 'hospital', name: 'Шымкент Қалалық Клиникалық Ауруханасы', lat: 42.3398, lng: 69.5692 },
  { id: 'es-3', type: 'police', name: 'Әл-Фараби АПБ', lat: 42.3175, lng: 69.6041 },
  { id: 'es-4', type: 'fire', name: 'ӨСБ-4 (Karatau)', lat: 42.3685, lng: 69.6225 },
];

export const SHYMKENT_INFRASTRUCTURE_REGISTRY: InfrastructureAsset[] = [
  {
    id: 'asset-road-tauke',
    cityId: 'shymkent',
    assetType: 'road',
    name: { kk: 'Тәуке хан даңғылы (магистраль)', ru: 'Проспект Тауке хана', en: 'Tauke Khan Avenue Arterial' },
    district: 'alfarabi',
    lat: 42.3195,
    lng: 69.5955,
    condition: 'fair',
    priority: 'medium',
    riskScore: 42,
    departmentId: 'qala-joldary',
    nextMaintenance: '2026-12-10',
    lastMaintenance: '2026-08-14',
    iotConnected: false,
    notes: 'High commuter volume corridor; routine asphalt inspection scheduled.',
  },
  {
    id: 'asset-bridge-badam',
    cityId: 'shymkent',
    assetType: 'bridge',
    name: { kk: 'Бадам өзені көпір өткелі', ru: 'Мост через реку Бадам', en: 'Badam River Bridge' },
    district: 'enbekshi',
    lat: 42.3045,
    lng: 69.6195,
    condition: 'fair',
    priority: 'high',
    riskScore: 54,
    departmentId: 'qala-joldary',
    nextMaintenance: '2026-12-02',
    lastMaintenance: '2026-05-20',
    iotConnected: false,
    notes: 'Structural joint inspection and drainage check.',
  },
  {
    id: 'asset-water-abay',
    cityId: 'shymkent',
    assetType: 'water_pipe',
    name: { kk: 'Абай ауданы магистральды су құбыры', ru: 'Магистральный водопровод Абай', en: 'Abay District Main Water Pipeline' },
    district: 'abay',
    lat: 42.3335,
    lng: 69.552,
    condition: 'degraded',
    priority: 'high',
    riskScore: 68,
    departmentId: 'shymkent-su',
    nextMaintenance: '2026-11-29',
    lastMaintenance: '2025-11-11',
    iotConnected: false,
    notes: 'Pressure valve sector scheduled for telemetry upgrade (MQTT ready).',
  },
  {
    id: 'asset-power-karatau',
    cityId: 'shymkent',
    assetType: 'power_grid',
    name: { kk: 'Қаратау-110 қосалқы станциясы', ru: 'Подстанция Каратау-110', en: 'Karatau-110 Substation' },
    district: 'karatau',
    lat: 42.3712,
    lng: 69.615,
    condition: 'good',
    priority: 'low',
    riskScore: 22,
    departmentId: 'ontustik-zharyq',
    nextMaintenance: '2027-01-15',
    lastMaintenance: '2026-09-03',
    iotConnected: false,
    notes: 'Primary feeder serving northern residential blocks.',
  },
  {
    id: 'asset-sewage-turan',
    cityId: 'shymkent',
    assetType: 'sewage',
    name: { kk: 'Тұран нөсер кәріз коллекторы', ru: 'Ливневый коллектор Туран', en: 'Turan Storm Drainage Collector' },
    district: 'turan',
    lat: 42.3492,
    lng: 69.5788,
    condition: 'degraded',
    priority: 'urgent',
    riskScore: 74,
    departmentId: 'shymkent-su',
    nextMaintenance: '2026-11-27',
    lastMaintenance: '2026-04-12',
    iotConnected: false,
    notes: 'Priority pre-rain grate clearing zone.',
  },
  {
    id: 'asset-light-baidibek',
    cityId: 'shymkent',
    assetType: 'streetlight',
    name: { kk: 'Бәйдібек би даңғылы жарық желісі', ru: 'Линия освещения пр. Байдибек би', en: 'Baidibek Bi Lighting Corridor' },
    district: 'karatau',
    lat: 42.362,
    lng: 69.605,
    condition: 'good',
    priority: 'low',
    riskScore: 18,
    departmentId: 'ontustik-zharyq',
    nextMaintenance: '2027-02-01',
    lastMaintenance: '2026-10-10',
    iotConnected: false,
    notes: 'LED adaptive streetlamp corridor.',
  },
];

export const AUTHORIZED_CAMERA_FEEDS = [
  {
    id: 'cam-tauke-republic',
    name: 'CAM-01 · Тәуке хан / Республика қиылысы',
    district: 'alfarabi',
    lat: 42.3198,
    lng: 69.591,
    status: 'demo' as const,
  },
  {
    id: 'cam-baidibek-nursat',
    name: 'CAM-02 · Бәйдібек би / Нұрсәт аймағы',
    district: 'karatau',
    lat: 42.3635,
    lng: 69.6075,
    status: 'demo' as const,
  },
  {
    id: 'cam-temirlan-abay',
    name: 'CAM-03 · Темірлан тас жолы / Абай',
    district: 'abay',
    lat: 42.3312,
    lng: 69.5468,
    status: 'demo' as const,
  },
];

export const DEMO_SCENARIOS: DemoScenario[] = [
  {
    id: 'demo-traffic-accident',
    category: 'traffic_accident',
    severity: 'critical',
    title: {
      kk: 'Тәуке хан – Республика қиылысындағы ЖКО',
      ru: 'ДТП на перекрёстке Тауке хана – Республики',
      en: 'Traffic Collision at Tauke Khan & Republic Ave',
    },
    district: 'alfarabi',
    lat: 42.3198,
    lng: 69.591,
    address: 'Тәуке хан даңғылы 48',
    departmentId: 'qala-joldary',
    aiExplanation: {
      kk: 'Vision AI екі көліктің соқтығысуын және оң жақ жолақтың жабылғанын анықтады. Қозғалыс баяулады, балама бағыттар ұсынылды.',
      ru: 'Vision AI зафиксировал столкновение двух авто и перекрытие правой полосы. Предложены объездные маршруты.',
      en: 'Vision AI detected a two-vehicle collision blocking the right lane. Alternative routing activated.',
    },
    steps: [
      { status: 'detected', label: { kk: 'Vision AI қауіпті тіркеді', ru: 'Vision AI обнаружил инцидент', en: 'Vision AI detected hazard' }, delaySec: 0 },
      { status: 'confirmed', label: { kk: 'Оператор оқиғаны растады', ru: 'Оператор подтвердил инцидент', en: 'Operator verified incident' }, delaySec: 3 },
      { status: 'assigned', label: { kk: 'Жол қызметі мен полицияға тағайындалды', ru: 'Назначено дорожной службе', en: 'Assigned to Roads & Traffic Dept' }, delaySec: 6 },
      { status: 'in_progress', label: { kk: 'Бригада оқиға орнында', ru: 'Бригада на месте', en: 'Response crew on site' }, delaySec: 9 },
      { status: 'resolved', label: { kk: 'Жол ашылды, қозғалыс қалпына келді', ru: 'Движение восстановлено', en: 'Road cleared & traffic restored' }, delaySec: 12 },
    ],
  },
  {
    id: 'demo-fire-smoke',
    category: 'fire_smoke',
    severity: 'critical',
    title: {
      kk: 'Еңбекші қойма аймағында түтін мен өрт ошағы',
      ru: 'Задымление и очаг возгорания в промзоне Енбекши',
      en: 'Fire & Heavy Smoke in Enbekshi Warehouse Zone',
    },
    district: 'enbekshi',
    lat: 42.3095,
    lng: 69.639,
    address: 'Сайрам көшесі 112',
    departmentId: 'tjd-shymkent',
    aiExplanation: {
      kk: 'Қою қара түтін бағаны анықталды. ТЖД операторына шұғыл растау сұрауы жіберілді.',
      ru: 'Обнаружен плотный столб дыма. Отправлен срочный запрос оператору ДЧС.',
      en: 'Dense smoke plume detected. Urgent operator verification prompt dispatched.',
    },
    steps: [
      { status: 'detected', label: { kk: 'Түтін сенсоры және AI сигналы', ru: 'Сигнал задымления', en: 'Smoke plume detected' }, delaySec: 0 },
      { status: 'confirmed', label: { kk: 'ТЖ үйлестірушісі растады', ru: 'Подтверждено координатором ЧС', en: 'Emergency coordinator confirmed' }, delaySec: 3 },
      { status: 'assigned', label: { kk: 'ӨСБ-1 бригадасы бағытталды', ru: 'Направлена бригада ПЧ-1', en: 'Fire Station 1 dispatched' }, delaySec: 6 },
      { status: 'in_progress', label: { kk: 'Өрт оқшаулануда', ru: 'Локализация очага', en: 'Containment in progress' }, delaySec: 9 },
      { status: 'resolved', label: { kk: 'Өрт сөндірілді, қауіп жойылды', ru: 'Пожар ликвидирован', en: 'Fire extinguished' }, delaySec: 12 },
    ],
  },
  {
    id: 'demo-flooding',
    category: 'flooding',
    severity: 'high',
    title: {
      kk: 'Тұран нөсер коллекторы маңында су жиналуы',
      ru: 'Подтопление у ливневого коллектора Туран',
      en: 'Stormwater Accumulation near Turan Collector',
    },
    district: 'turan',
    lat: 42.3492,
    lng: 69.5788,
    address: 'Желтоқсан көшесі 24',
    departmentId: 'shymkent-su',
    aiExplanation: {
      kk: 'Жауын-шашын кезінде нөсер торының бітелуіне байланысты жол бөлігін су басты.',
      ru: 'Подтопление проезжей части из-за засора ливневой решётки.',
      en: 'Surface flooding along roadway due to clogged stormwater grate.',
    },
    steps: [
      { status: 'detected', label: { kk: 'Тұрғын фотосы және Open-Meteo жаңбыр дабылы', ru: 'Фото жителя и сигнал осадков', en: 'Citizen photo + rain alert' }, delaySec: 0 },
      { status: 'confirmed', label: { kk: 'Оператор растады', ru: 'Подтверждено оператором', en: 'Operator confirmed' }, delaySec: 3 },
      { status: 'assigned', label: { kk: 'Су арнасы бригадасына тапсырылды', ru: 'Назначено Водоканалу', en: 'Assigned to Water Utility' }, delaySec: 6 },
      { status: 'in_progress', label: { kk: 'Коллектор тазартылуда', ru: 'Очистка коллектора', en: 'Drainage clearing underway' }, delaySec: 9 },
      { status: 'resolved', label: { kk: 'Су деңгейі төмендетілді', ru: 'Вода отведена', en: 'Water cleared' }, delaySec: 12 },
    ],
  },
  {
    id: 'demo-pothole',
    category: 'road_pothole',
    severity: 'medium',
    title: {
      kk: 'Темірлан тас жолында терең шұңқыр',
      ru: 'Глубокая выбоина на Темирлановском шоссе',
      en: 'Deep Road Pothole on Temirlan Highway',
    },
    district: 'abay',
    lat: 42.3315,
    lng: 69.5472,
    address: 'Темірлан тас жолы 74',
    departmentId: 'qala-joldary',
    aiExplanation: {
      kk: 'Асфальт жабынының 1.2м бөлігі бұзылған, көліктерге қауіп төндіреді.',
      ru: 'Разрушение асфальтового покрытия 1.2м, риск повреждения авто.',
      en: '1.2m asphalt breakdown posing tire/suspension hazard.',
    },
    steps: [
      { status: 'detected', label: { kk: 'Тұрғын өтініші тіркелді', ru: 'Заявка жителя принята', en: 'Citizen report logged' }, delaySec: 0 },
      { status: 'confirmed', label: { kk: 'AI шұңқырды жіктеді (94%)', ru: 'AI подтвердил дефект (94%)', en: 'AI classified pothole (94%)' }, delaySec: 3 },
      { status: 'assigned', label: { kk: 'Жол жөндеу бригадасы тағайындалды', ru: 'Назначена дорожная бригада', en: 'Road repair crew assigned' }, delaySec: 6 },
      { status: 'in_progress', label: { kk: 'Асфальт төсеу жұмысы', ru: 'Укладка асфальта', en: 'Asphalt patching in progress' }, delaySec: 9 },
      { status: 'resolved', label: { kk: 'Жол жабыны қалпына келтірілді', ru: 'Покрытие восстановлено', en: 'Surface repaired' }, delaySec: 12 },
    ],
  },
  {
    id: 'demo-congestion',
    category: 'congestion',
    severity: 'medium',
    title: {
      kk: 'Бәйдібек би даңғылында кешкі кептеліс',
      ru: 'Вечерний затор на проспекте Байдибек би',
      en: 'Peak Hour Congestion on Baidibek Bi Ave',
    },
    district: 'karatau',
    lat: 42.3622,
    lng: 69.6052,
    address: 'Бәйдібек би даңғылы 118',
    departmentId: 'qala-joldary',
    aiExplanation: {
      kk: 'Көлік ағыны өткізу қабілетінен 40% асты. Балама айналма бағыт ұсынылды.',
      ru: 'Плотность потока превышает норму на 40%. Рекомендован объезд.',
      en: 'Traffic density 40% above corridor baseline. Detour advisory published.',
    },
    steps: [
      { status: 'detected', label: { kk: 'Ағын тығыздығы анықталды', ru: 'Обнаружен рост плотности', en: 'Density spike detected' }, delaySec: 0 },
      { status: 'confirmed', label: { kk: 'Көлік операторы растады', ru: 'Подтверждено центром трафика', en: 'Traffic desk confirmed' }, delaySec: 3 },
      { status: 'assigned', label: { kk: 'Балама бағыт жарияланды', ru: 'Опубликован объезд', en: 'Detour guidance published' }, delaySec: 6 },
      { status: 'in_progress', label: { kk: 'Реттеу жүргізілуде', ru: 'Мониторинг разгрузки', en: 'Corridor clearing monitored' }, delaySec: 9 },
      { status: 'resolved', label: { kk: 'Қозғалыс қалыпқа келді', ru: 'Трафик нормализован', en: 'Traffic flow normalized' }, delaySec: 12 },
    ],
  },
  {
    id: 'demo-water-pipe',
    category: 'water_pipe',
    severity: 'high',
    title: {
      kk: 'Абай ауданында су құбырының жарылуы',
      ru: 'Прорыв магистрального водопровода в Абайском районе',
      en: 'Water Main Rupture in Abay District',
    },
    district: 'abay',
    lat: 42.3335,
    lng: 69.552,
    address: 'Қазыбек би көшесі 89',
    departmentId: 'shymkent-su',
    aiExplanation: {
      kk: 'Тұрғындардан 3 қайталанған өтініш біріктірілді. Жақын маңдағы су қысымы төмендеуі мүмкін.',
      ru: 'Объединены 3 дублирующих обращения жителей. Возможна просадка давления.',
      en: '3 duplicate citizen reports merged. Nearby pressure drop expected.',
    },
    steps: [
      { status: 'detected', label: { kk: '3 өтініш кластерленді', ru: 'Сгруппировано 3 обращения', en: '3 reports clustered' }, delaySec: 0 },
      { status: 'confirmed', label: { kk: 'Су арнасы диспетчері растады', ru: 'Подтверждено диспетчером', en: 'Utility dispatch confirmed' }, delaySec: 3 },
      { status: 'assigned', label: { kk: 'Апаттық бригада жіберілді', ru: 'Выехала аварийная бригада', en: 'Repair crew en route' }, delaySec: 6 },
      { status: 'in_progress', label: { kk: 'Ысырма жабылып, дәнекерленуде', ru: 'Перекрытие и ремонт трубы', en: 'Valve isolated & pipe repair' }, delaySec: 9 },
      { status: 'resolved', label: { kk: 'Су беру қалпына келтірілді', ru: 'Водоснабжение восстановлено', en: 'Water supply restored' }, delaySec: 12 },
    ],
  },
  {
    id: 'demo-fallen-tree',
    category: 'fallen_tree',
    severity: 'high',
    title: {
      kk: 'Жел салдарынан жолға ағаш құлауы',
      ru: 'Падение дерева на проезжую часть при порывах ветра',
      en: 'Fallen Tree Blocking Roadway After Wind Gusts',
    },
    district: 'alfarabi',
    lat: 42.3155,
    lng: 69.5998,
    address: 'Бейбітшілік көшесі 15',
    departmentId: 'taza-qala',
    aiExplanation: {
      kk: 'Жолдың бір жолағын ірі ағаш бөгеп тұр. Қалалық тазалық және ТЖ бригадасы қажет.',
      ru: 'Крупное дерево перекрыло полосу движения. Требуется расчистка.',
      en: 'Large fallen tree blocking traffic lane. Clearing crew required.',
    },
    steps: [
      { status: 'detected', label: { kk: 'Камера жол бөгетін тіркеді', ru: 'Камера выявила преграду', en: 'Camera detected obstruction' }, delaySec: 0 },
      { status: 'confirmed', label: { kk: 'Оператор растады', ru: 'Подтверждено оператором', en: 'Operator confirmed' }, delaySec: 3 },
      { status: 'assigned', label: { kk: 'Тазалық бригадасы тағайындалды', ru: 'Назначена бригада расчистки', en: 'Clearing team assigned' }, delaySec: 6 },
      { status: 'in_progress', label: { kk: 'Ағаш кесіліп, шығарылуда', ru: 'Распил и вывоз ствола', en: 'Cutting & removal underway' }, delaySec: 9 },
      { status: 'resolved', label: { kk: 'Жол толық тазартылды', ru: 'Проезд освобождён', en: 'Roadway fully cleared' }, delaySec: 12 },
    ],
  },
];

export function generateSampleHazardCanvas(kind: 'pothole' | 'smoke' | 'flood'): string {
  const canvas = document.createElement('canvas');
  canvas.width = 640;
  canvas.height = 360;
  const ctx = canvas.getContext('2d');
  if (!ctx) return '';

  // Road background
  ctx.fillStyle = '#252c34';
  ctx.fillRect(0, 0, 640, 360);

  // Horizon sky
  const sky = ctx.createLinearGradient(0, 0, 0, 120);
  sky.addColorStop(0, '#172330');
  sky.addColorStop(1, '#314254');
  ctx.fillStyle = sky;
  ctx.fillRect(0, 0, 640, 120);

  // Perspective lane lines
  ctx.strokeStyle = '#cbd5e1';
  ctx.lineWidth = 4;
  ctx.setLineDash([18, 14]);
  ctx.beginPath();
  ctx.moveTo(320, 120);
  ctx.lineTo(320, 360);
  ctx.stroke();
  ctx.setLineDash([]);

  if (kind === 'pothole') {
    ctx.fillStyle = '#11161c';
    ctx.beginPath();
    ctx.ellipse(275, 250, 74, 34, 0.12, 0, Math.PI * 2);
    ctx.fill();
    ctx.strokeStyle = '#64748b';
    ctx.lineWidth = 3;
    ctx.stroke();
    ctx.fillStyle = '#334155';
    ctx.beginPath();
    ctx.ellipse(275, 254, 48, 20, 0.1, 0, Math.PI * 2);
    ctx.fill();
  } else if (kind === 'smoke') {
    // Building silhouette
    ctx.fillStyle = '#1e293b';
    ctx.fillRect(380, 70, 150, 110);
    // Orange flame base
    ctx.fillStyle = '#f97316';
    ctx.beginPath();
    ctx.arc(445, 110, 26, 0, Math.PI * 2);
    ctx.fill();
    // Smoke plume
    for (let i = 0; i < 6; i++) {
      ctx.fillStyle = `rgba(30, 35, 42, ${0.75 - i * 0.08})`;
      ctx.beginPath();
      ctx.arc(445 - i * 16, 90 - i * 15, 28 + i * 7, 0, Math.PI * 2);
      ctx.fill();
    }
  } else {
    // Urban stormwater flooding sheen
    const water = ctx.createLinearGradient(0, 180, 0, 360);
    water.addColorStop(0, 'rgba(14, 116, 144, 0.55)');
    water.addColorStop(1, 'rgba(6, 182, 212, 0.72)');
    ctx.fillStyle = water;
    ctx.fillRect(0, 185, 640, 175);
    ctx.strokeStyle = 'rgba(224, 242, 254, 0.45)';
    ctx.lineWidth = 2;
    for (let i = 0; i < 6; i++) {
      ctx.beginPath();
      ctx.ellipse(240 + i * 35, 250 + (i % 3) * 26, 45, 8, 0, 0, Math.PI * 2);
      ctx.stroke();
    }
  }

  ctx.fillStyle = 'rgba(8, 13, 20, 0.75)';
  ctx.fillRect(14, 14, 260, 28);
  ctx.fillStyle = '#00D4E8';
  ctx.font = 'bold 13px monospace';
  ctx.fillText(`QALA VISION SAMPLE · ${kind.toUpperCase()}`, 24, 33);

  return canvas.toDataURL('image/jpeg', 0.9);
}
