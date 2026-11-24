import type {
  CommandTab,
  CitizenTab,
  IncidentCategory,
  IncidentStatus,
  Language,
  SeverityLevel,
  UserRole,
} from './types.ts';

export const LANG_LABELS: Record<Language, string> = {
  kk: 'ҚАЗ',
  ru: 'РУС',
  en: 'ENG',
};

interface Dictionary {
  appName: string;
  slogan: string;
  heroTitle: string;
  heroSubtitle: string;
  openPlatform: string;
  watchDemo: string;
  applyPartnership: string;
  commandCenter: string;
  officialSite: string;
  citizenApp: string;
  xrSpatial: string;
  demoModeBadge: string;
  demoDisclaimer: string;
  searchPlaceholder: string;
  pilotCity: string;
  expansionBadge: string;
  systemOnline: string;
  offlineBanner: string;
  installPwa: string;
  iosInstallHint: string;
  signInGoogle: string;
  signInEmail: string;
  signOut: string;
  guestOperatorNote: string;
  noFakeDataNotice: string;
  humanConfirmationRequired: string;
  mapsQuotaWarning: string;
  switchToOsm: string;
  switchToGoogle: string;
  satelliteView: string;
  streetView: string;
  trafficLayer: string;
  heatmapLayer: string;
  districtsLayer: string;
  emergencyLayer: string;
  myLocation: string;
  fullscreen: string;
  exitFullscreen: string;
  altRoutes: string;
  noDataUnavailable: string;
  sourceLabel: string;
  updatedLabel: string;
  activeIncidents: string;
  criticalAlerts: string;
  resolvedRate: string;
  avgResponseTime: string;
  quickActions: string;
  newIncident: string;
  runScan: string;
  openDemo: string;
  exportCsv: string;
  exportPdf: string;
  generateAiReport: string;
  askBrainPlaceholder: string;
  send: string;
  registerIncidentBtn: string;
  confirmOperator: string;
  dismissAlert: string;
  escalatePriority: string;
  dispatchInternal: string;
  officialEmergencyNumbers: string;
  noAutoGovDispatch: string;
  submitReport: string;
  saveOfflineDraft: string;
  syncDrafts: string;
  capturePhoto: string;
  uploadMedia: string;
  voiceNote: string;
  analyzeWithAi: string;
  simulateFlood: string;
  simulateClosure: string;
  simulateCongestion: string;
  simulateOutage: string;
  resetSim: string;
  simulationDisclaimer: string;
  play: string;
  pause: string;
  resume: string;
  restart: string;
  loop: string;
  speed: string;
  tabs: Record<CommandTab, string>;
  citizenTabs: Record<CitizenTab, string>;
  categories: Record<IncidentCategory, string>;
  severities: Record<SeverityLevel, string>;
  statuses: Record<IncidentStatus, string>;
  roles: Record<UserRole, string>;
  brainPrompts: string[];
  site: {
    missionTitle: string;
    missionBody: string;
    problemsTitle: string;
    problems: { title: string; desc: string }[];
    solutionsTitle: string;
    solutions: { title: string; desc: string }[];
    modulesTitle: string;
    akimatTitle: string;
    akimatPoints: string[];
    citizenTitle: string;
    citizenPoints: string[];
    pilotTitle: string;
    pilotBody: string;
    partnerTitle: string;
    partnerOrg: string;
    partnerContact: string;
    partnerCity: string;
    partnerMsg: string;
    partnerSubmit: string;
    partnerSuccess: string;
  };
}

const KK: Dictionary = {
  appName: 'QalaQauip',
  slogan: 'Қауіпті анықтаймыз. Алдын ала болжаймыз. Қаланы қорғаймыз.',
  heroTitle: 'Қауіпсіз қаланың интеллектуалды болашағы',
  heroSubtitle:
    'QalaQauip қалалық деректерді интеллектуалды шешімдерге айналдырып, қауіптерді анықтауға, алдын ала болжауға және тиімді әрекет етуге көмектеседі.',
  openPlatform: 'Платформаны ашу',
  watchDemo: 'Демонстрацияны көру',
  applyPartnership: 'Серіктестікке өтініш беру',
  commandCenter: 'Басқару орталығы',
  officialSite: 'Ресми сайт',
  citizenApp: 'Тұрғын қосымшасы',
  xrSpatial: 'XR 3D Кеңістік',
  demoModeBadge: 'DEMO MODE — Симуляциялық сценарий',
  demoDisclaimer: 'Демонстрациялық деректер нақты тіркелген оқиғалардан бөлек көрсетіледі.',
  searchPlaceholder: 'Оқиға, көше, аудан немесе нысан іздеу...',
  pilotCity: 'Пилоттық қала',
  expansionBadge: 'Кеңейтуге дайын: Астана · Алматы · Халықаралық',
  systemOnline: 'Жүйе белсенді',
  offlineBanner: 'Офлайн режим — өтініштер жергілікті жадқа сақталады',
  installPwa: 'Қосымшаны орнату (PWA)',
  iosInstallHint: 'iOS Safari: Бөлісу → Негізгі экранға қосу',
  signInGoogle: 'Google арқылы кіру',
  signInEmail: 'Email арқылы кіру',
  signOut: 'Шығу',
  guestOperatorNote: 'Операциялық деректерді жазу және растау үшін кіріңіз.',
  noFakeDataNotice: 'Тексерілмеген немесе ойдан шығарылған көрсеткіштер қолданылмайды.',
  humanConfirmationRequired: 'Төтенше жағдайлар бойынша маңызды шешімдерді оператор растауы міндетті.',
  mapsQuotaWarning: 'Google Maps лимиті шегіне жетті — MapLibre + OpenStreetMap балама картасы қолжетімді.',
  switchToOsm: 'MapLibre / OSM картасына ауысу',
  switchToGoogle: 'Google Maps картасына ауысу',
  satelliteView: 'Спутник',
  streetView: 'Карта',
  trafficLayer: 'Көлік қозғалысы',
  heatmapLayer: 'Жылу картасы',
  districtsLayer: 'Аудан шекаралары',
  emergencyLayer: 'ТЖ қызметтері',
  myLocation: 'Менің GPS орным',
  fullscreen: 'Толық экран',
  exitFullscreen: 'Қалыпты экран',
  altRoutes: 'Балама маршрут',
  noDataUnavailable: 'Нақты датчик қосылмаған — деректер қолжетімсіз',
  sourceLabel: 'Дереккөз',
  updatedLabel: 'Соңғы жаңарту',
  activeIncidents: 'Белсенді оқиғалар',
  criticalAlerts: 'Өте қауіпті оқиғалар',
  resolvedRate: 'Шешілу пайызы',
  avgResponseTime: 'Орташа жауап уақыты',
  quickActions: 'Жылдам әрекеттер',
  newIncident: 'Жаңа оқиға тіркеу',
  runScan: 'Камера талдауы',
  openDemo: 'Демо сценарий',
  exportCsv: 'CSV жүктеу',
  exportPdf: 'PDF есеп жүктеу',
  generateAiReport: 'Qala Brain есебін жасау',
  askBrainPlaceholder: 'Шымкенттің қазіргі жағдайы туралы сұрақ қойыңыз...',
  send: 'Жіберу',
  registerIncidentBtn: 'Оқиға ретінде тіркеу',
  confirmOperator: 'Оператор растауы',
  dismissAlert: 'Қабылдамау',
  escalatePriority: 'Басымдықты арттыру',
  dispatchInternal: 'Ішкі бригадаға жіберу',
  officialEmergencyNumbers: 'ҚР Ресми төтенше қызмет нөмірлері',
  noAutoGovDispatch: 'Ескерту: Мемлекеттік қызметтерге автоматты шақырту ресми интеграциясыз жіберілмейді.',
  submitReport: 'Өтініш жіберу',
  saveOfflineDraft: 'Офлайн сақтау',
  syncDrafts: 'Жобаларды синхрондау',
  capturePhoto: 'Камерамен түсіру',
  uploadMedia: 'Фото / Видео жүктеу',
  voiceNote: 'Дауыспен сипаттау',
  analyzeWithAi: 'AI талдауын бастау',
  simulateFlood: 'Су басу симуляциясы',
  simulateClosure: 'Жол жабылуы',
  simulateCongestion: 'Кептеліс моделі',
  simulateOutage: 'Инфрақұрылым ақауы',
  resetSim: 'Қалпына келтіру',
  simulationDisclaimer: 'Ескерту: Бұл визуалды симуляция Open-Meteo және базалық геометрияға негізделген, ғылыми гидрологиялық болжам емес.',
  play: 'Бастау',
  pause: 'Кідірту',
  resume: 'Жалғастыру',
  restart: 'Қайта бастау',
  loop: 'Қайталау',
  speed: 'Жылдамдық',
  tabs: {
    home: 'Басты бет',
    map: 'Қала картасы',
    brain: 'Qala Brain',
    vision: 'Vision AI',
    predict: 'Қауіпті болжау',
    traffic: 'Көлік қозғалысы',
    infrastructure: 'Инфрақұрылым',
    emergency: 'Төтенше жағдайлар',
    citizen: 'Тұрғын өтініштері',
    eco: 'Экология',
    response: 'Оқиғаларды басқару',
    twin: 'Цифрлық 3D қала',
    analytics: 'Аналитика',
    settings: 'Баптаулар',
  },
  citizenTabs: {
    home: 'Басты бет',
    map: 'Карта',
    report: 'Өтініш',
    ai: 'Qala Brain',
    profile: 'Профиль',
  },
  categories: {
    traffic_accident: 'Жол-көлік апаты',
    fire_smoke: 'Өрт және түтін',
    flooding: 'Су басу',
    road_pothole: 'Жолдағы шұңқыр',
    congestion: 'Көлік кептелісі',
    fallen_tree: 'Құлаған ағаш',
    waste_overflow: 'Толып кеткен қоқыс',
    infrastructure_damage: 'Бұзылған инфрақұрылым',
    road_obstruction: 'Жол бөгеті',
    water_pipe: 'Су құбыры ақауы',
    power_outage: 'Электр желісі ақауы',
  },
  severities: {
    low: 'Төмен қауіп',
    medium: 'Орташа қауіп',
    high: 'Жоғары қауіп',
    critical: 'Өте жоғары қауіп',
  },
  statuses: {
    detected: 'Анықталды',
    under_review: 'Тексерілуде',
    confirmed: 'Расталды',
    assigned: 'Тағайындалды',
    in_progress: 'Жұмыс жүргізілуде',
    resolved: 'Шешілді',
    closed: 'Жабылды',
  },
  roles: {
    citizen: 'Қала тұрғыны',
    city_operator: 'Қалалық оператор',
    agency_staff: 'Мекеме қызметкері',
    agency_head: 'Мекеме басшысы',
    emergency_coordinator: 'ТЖ үйлестірушісі',
    city_admin: 'Қала әкімшісі',
    platform_admin: 'Платформа әкімшісі',
  },
  brainPrompts: [
    'Бүгін Шымкентте қандай қауіпті жағдайлар бар?',
    'Қай ауданда жол апаты жиі болады?',
    'Қай көшелерді жөндеу қажет?',
    'Қай аймақта су басу қаупі жоғары?',
    'Қандай мәселелер шұғыл шешімді қажет етеді?',
    'Қаланың апталық қауіпсіздік есебін дайында.',
  ],
  site: {
    missionTitle: 'Жобаның мақсаты',
    missionBody:
      'Қалалық инфрақұрылымды, жол қауіпсіздігін, коммуналдық желілерді және төтенше жағдайларды бірыңғай интеллектуалды операциялық жүйеде біріктіру.',
    problemsTitle: 'Қалалардың қазіргі мәселелері',
    problems: [
      { title: 'Бөлшектенген деректер', desc: 'Әр мекеме бөлек жүйеде жұмыс істейді, жедел үйлестіру баяу.' },
      { title: 'Кешіккен әрекет', desc: 'Мәселелер алдын ала емес, салдары орын алғаннан кейін ғана тіркеледі.' },
      { title: 'Қайталанатын өтініштер', desc: 'Тұрғындар мен камералардан түскен сигналдар орталықтандырылмаған.' },
    ],
    solutionsTitle: 'QalaQauip ұсынатын шешімдер',
    solutions: [
      { title: 'Qala Brain AI', desc: 'Деректер базасына негізделген шұғыл талдау, жіктеу және шешім ұсыныстары.' },
      { title: 'Vision AI & Карта', desc: 'Фото/видео талдау және Google Maps / OSM негізіндегі нақты уақыт картасы.' },
      { title: 'Толық бақылау циклі', desc: 'Анықталған сәттен бастап шешілгенге дейінгі мөлдір диспетчерлік процесс.' },
    ],
    modulesTitle: 'Экожүйе модульдері',
    akimatTitle: 'Әкімдік пен мекемелерге артықшылықтар',
    akimatPoints: [
      'Шымкент аудандары бойынша нақты уақыттағы жедел ахуал тақтасы',
      'Мекемелердің SLA мерзімі мен орындалу тиімділігін бақылау',
      'PDF/CSV есептер және Qala Brain аналитикалық қорытындылары',
    ],
    citizenTitle: 'Қала тұрғындарына артықшылықтар',
    citizenPoints: [
      'Фото немесе дауыс арқылы 30 секундта өтініш жолдау',
      'GPS орналасуды автоматты тіркеу және мәртебені бақылау',
      'Интернетсіз кезде офлайн жоба ретінде сақтау (PWA)',
    ],
    pilotTitle: 'Пилоттық қала — Шымкент',
    pilotBody:
      'Шымкенттің 5 ауданы (Абай, Әл-Фараби, Еңбекші, Қаратау, Тұран) архитектуралық үлгі ретінде қамтылған. Жүйе Астана, Алматы және халықаралық қалаларға масштабтауға дайын.',
    partnerTitle: 'Серіктестік және енгізуге өтініш',
    partnerOrg: 'Ұйым / Әкімдік атауы',
    partnerContact: 'Байланыс тұлғасы',
    partnerCity: 'Қала',
    partnerMsg: 'Ынтымақтастық мақсаты',
    partnerSubmit: 'Өтінішті жіберу',
    partnerSuccess: 'Серіктестік өтініші деректер базасына сақталды.',
  },
};

const RU: Dictionary = {
  appName: 'QalaQauip',
  slogan: 'Обнаруживаем угрозы. Прогнозируем заранее. Защищаем город.',
  heroTitle: 'Интеллектуальное будущее безопасного города',
  heroSubtitle:
    'QalaQauip превращает городские данные в интеллектуальные решения, помогая выявлять риски, прогнозировать угрозы и эффективно реагировать.',
  openPlatform: 'Открыть платформу',
  watchDemo: 'Смотреть демонстрацию',
  applyPartnership: 'Подать заявку на партнёрство',
  commandCenter: 'Центр управления',
  officialSite: 'Официальный сайт',
  citizenApp: 'Приложение жителя',
  xrSpatial: 'XR 3D Пространство',
  demoModeBadge: 'DEMO MODE — Симуляционный сценарий',
  demoDisclaimer: 'Демонстрационные данные отделены от реально зафиксированных инцидентов.',
  searchPlaceholder: 'Поиск инцидента, улицы, района или объекта...',
  pilotCity: 'Пилотный город',
  expansionBadge: 'Готово к масштабированию: Астана · Алматы · Мир',
  systemOnline: 'Система активна',
  offlineBanner: 'Офлайн-режим — обращения сохраняются локально',
  installPwa: 'Установить приложение (PWA)',
  iosInstallHint: 'iOS Safari: Поделиться → На экран «Домой»',
  signInGoogle: 'Войти через Google',
  signInEmail: 'Войти по Email',
  signOut: 'Выйти',
  guestOperatorNote: 'Войдите для сохранения и подтверждения операционных записей.',
  noFakeDataNotice: 'Неподтверждённые или вымышленные показатели не отображаются.',
  humanConfirmationRequired: 'Критические решения по ЧС требуют обязательного подтверждения оператором.',
  mapsQuotaWarning: 'Достигнут лимит Google Maps — доступна альтернативная карта MapLibre + OpenStreetMap.',
  switchToOsm: 'Переключиться на MapLibre / OSM',
  switchToGoogle: 'Переключиться на Google Maps',
  satelliteView: 'Спутник',
  streetView: 'Карта',
  trafficLayer: 'Трафик',
  heatmapLayer: 'Тепловая карта',
  districtsLayer: 'Границы районов',
  emergencyLayer: 'Службы ЧС',
  myLocation: 'Моя геолокация',
  fullscreen: 'На весь экран',
  exitFullscreen: 'Обычный режим',
  altRoutes: 'Альтернативный маршрут',
  noDataUnavailable: 'Датчик не подключён — данные недоступны',
  sourceLabel: 'Источник',
  updatedLabel: 'Обновлено',
  activeIncidents: 'Активные инциденты',
  criticalAlerts: 'Критические инциденты',
  resolvedRate: 'Процент решения',
  avgResponseTime: 'Среднее время ответа',
  quickActions: 'Быстрые действия',
  newIncident: 'Новый инцидент',
  runScan: 'Анализ камеры',
  openDemo: 'Демо-сценарий',
  exportCsv: 'Скачать CSV',
  exportPdf: 'Скачать PDF',
  generateAiReport: 'Отчёт Qala Brain',
  askBrainPlaceholder: 'Задайте вопрос о текущей ситуации в Шымкенте...',
  send: 'Отправить',
  registerIncidentBtn: 'Зарегистрировать инцидент',
  confirmOperator: 'Подтвердить оператором',
  dismissAlert: 'Отклонить',
  escalatePriority: 'Повысить приоритет',
  dispatchInternal: 'Назначить внутреннюю бригаду',
  officialEmergencyNumbers: 'Официальные номера экстренных служб РК',
  noAutoGovDispatch: 'Внимание: Автоматический вызов госслужб без официальной интеграции отключён.',
  submitReport: 'Отправить обращение',
  saveOfflineDraft: 'Сохранить офлайн',
  syncDrafts: 'Синхронизировать черновики',
  capturePhoto: 'Снять на камеру',
  uploadMedia: 'Загрузить фото / видео',
  voiceNote: 'Голосовое описание',
  analyzeWithAi: 'Запустить AI-анализ',
  simulateFlood: 'Симуляция подтопления',
  simulateClosure: 'Перекрытие дороги',
  simulateCongestion: 'Модель затора',
  simulateOutage: 'Сбой инфраструктуры',
  resetSim: 'Сбросить',
  simulationDisclaimer: 'Внимание: Визуальная симуляция основана на Open-Meteo и базовой геометрии, не является гидрологическим прогнозом.',
  play: 'Старт',
  pause: 'Пауза',
  resume: 'Продолжить',
  restart: 'Сначала',
  loop: 'Повтор',
  speed: 'Скорость',
  tabs: {
    home: 'Главная',
    map: 'Карта города',
    brain: 'Qala Brain',
    vision: 'Vision AI',
    predict: 'Прогноз рисков',
    traffic: 'Транспорт',
    infrastructure: 'Инфраструктура',
    emergency: 'ЧС и диспетчер',
    citizen: 'Обращения граждан',
    eco: 'Экология',
    response: 'Управление инцидентами',
    twin: 'Цифровой 3D город',
    analytics: 'Аналитика',
    settings: 'Настройки',
  },
  citizenTabs: {
    home: 'Главная',
    map: 'Карта',
    report: 'Сообщить',
    ai: 'Qala Brain',
    profile: 'Профиль',
  },
  categories: {
    traffic_accident: 'ДТП',
    fire_smoke: 'Пожар и дым',
    flooding: 'Подтопление',
    road_pothole: 'Яма на дороге',
    congestion: 'Дорожный затор',
    fallen_tree: 'Упавшее дерево',
    waste_overflow: 'Переполненные баки',
    infrastructure_damage: 'Повреждение инфраструктуры',
    road_obstruction: 'Препятствие на дороге',
    water_pipe: 'Авария водопровода',
    power_outage: 'Сбой электросети',
  },
  severities: {
    low: 'Низкий риск',
    medium: 'Средний риск',
    high: 'Высокий риск',
    critical: 'Критический риск',
  },
  statuses: {
    detected: 'Обнаружено',
    under_review: 'На проверке',
    confirmed: 'Подтверждено',
    assigned: 'Назначено ведомство',
    in_progress: 'В работе',
    resolved: 'Решено',
    closed: 'Закрыто',
  },
  roles: {
    citizen: 'Житель города',
    city_operator: 'Городской оператор',
    agency_staff: 'Сотрудник ведомства',
    agency_head: 'Руководитель ведомства',
    emergency_coordinator: 'Координатор ЧС',
    city_admin: 'Администратор города',
    platform_admin: 'Администратор платформы',
  },
  brainPrompts: [
    'Какие опасные ситуации зафиксированы сегодня в Шымкенте?',
    'В каком районе чаще происходят ДТП?',
    'Какие улицы требуют срочного ремонта?',
    'Где наиболее высокий риск подтопления?',
    'Какие проблемы требуют немедленного решения?',
    'Подготовь еженедельный отчёт безопасности города.',
  ],
  site: {
    missionTitle: 'Миссия проекта',
    missionBody:
      'Объединить безопасность города, коммунальные сети, транспорт и прогнозирование рисков в единой интеллектуальной операционной системе.',
    problemsTitle: 'Текущие вызовы городов',
    problems: [
      { title: 'Разрозненные данные', desc: 'Службы работают в отдельных системах без единой координации.' },
      { title: 'Реактивный подход', desc: 'Инциденты фиксируются после последствий вместо раннего прогноза.' },
      { title: 'Дубли обращений', desc: 'Сигналы граждан и камер не объединяются автоматически.' },
    ],
    solutionsTitle: 'Решения QalaQauip',
    solutions: [
      { title: 'Qala Brain AI', desc: 'Анализ базы данных, классификация и рекомендации по реагированию.' },
      { title: 'Vision AI и Карта', desc: 'Мультимодальное выявление угроз и живая карта Google Maps / OSM.' },
      { title: 'Полный цикл реагирования', desc: 'Прозрачный маршрут от обнаружения до подтверждённого устранения.' },
    ],
    modulesTitle: 'Модули экосистемы',
    akimatTitle: 'Преимущества для акимата и служб',
    akimatPoints: [
      'Единая оперативная карта по всем 5 районам Шымкента',
      'Контроль SLA и эффективности подрядных ведомств',
      'Экспорт отчётов в PDF/CSV и аналитика Qala Brain',
    ],
    citizenTitle: 'Преимущества для жителей',
    citizenPoints: [
      'Отправка обращения за 30 секунд с фото или голосом',
      'Автоматическая геолокация и отслеживание статуса',
      'Офлайн-черновики без интернета (PWA)',
    ],
    pilotTitle: 'Пилотный город — Шымкент',
    pilotBody:
      'Охвачены все 5 районов Шымкента (Абай, Аль-Фараби, Енбекши, Каратау, Туран) с архитектурой для масштабирования на Астану, Алматы и международные города.',
    partnerTitle: 'Заявка на партнёрство и внедрение',
    partnerOrg: 'Организация / Акимат',
    partnerContact: 'Контактное лицо',
    partnerCity: 'Город',
    partnerMsg: 'Цель сотрудничества',
    partnerSubmit: 'Отправить заявку',
    partnerSuccess: 'Заявка на партнёрство сохранена в базе данных.',
  },
};

const EN: Dictionary = {
  appName: 'QalaQauip',
  slogan: 'Detect hazards. Predict early. Protect the city.',
  heroTitle: 'The Intelligent Future of a Safe City',
  heroSubtitle:
    'QalaQauip transforms urban data into actionable intelligence to detect hazards, predict risks early, and coordinate rapid municipal response.',
  openPlatform: 'Launch Platform',
  watchDemo: 'Watch Interactive Demo',
  applyPartnership: 'Request Partnership',
  commandCenter: 'Command Center',
  officialSite: 'Official Website',
  citizenApp: 'Citizen App',
  xrSpatial: 'XR 3D Spatial',
  demoModeBadge: 'DEMO MODE — Simulated Scenario',
  demoDisclaimer: 'Demonstration data is strictly separated from verified operational incidents.',
  searchPlaceholder: 'Search incident, street, district, or asset...',
  pilotCity: 'Pilot City',
  expansionBadge: 'Scale-ready: Astana · Almaty · Global',
  systemOnline: 'System Online',
  offlineBanner: 'Offline Mode — Reports saved locally for sync',
  installPwa: 'Install App (PWA)',
  iosInstallHint: 'iOS Safari: Share → Add to Home Screen',
  signInGoogle: 'Sign in with Google',
  signInEmail: 'Sign in with Email',
  signOut: 'Sign Out',
  guestOperatorNote: 'Sign in to persist and verify operational records.',
  noFakeDataNotice: 'No fabricated statistics or unverified events are shown.',
  humanConfirmationRequired: 'Critical emergency decisions require mandatory human operator confirmation.',
  mapsQuotaWarning: 'Google Maps quota reached — MapLibre + OpenStreetMap fallback is ready.',
  switchToOsm: 'Switch to MapLibre / OSM',
  switchToGoogle: 'Switch to Google Maps',
  satelliteView: 'Satellite',
  streetView: 'Map',
  trafficLayer: 'Traffic',
  heatmapLayer: 'Heatmap',
  districtsLayer: 'Districts',
  emergencyLayer: 'Emergency Services',
  myLocation: 'My GPS Location',
  fullscreen: 'Fullscreen',
  exitFullscreen: 'Exit Fullscreen',
  altRoutes: 'Alternative Route',
  noDataUnavailable: 'Sensor not connected — data unavailable',
  sourceLabel: 'Source',
  updatedLabel: 'Last updated',
  activeIncidents: 'Active Incidents',
  criticalAlerts: 'Critical Alerts',
  resolvedRate: 'Resolution Rate',
  avgResponseTime: 'Avg Response Time',
  quickActions: 'Quick Actions',
  newIncident: 'Log Incident',
  runScan: 'Vision Scan',
  openDemo: 'Demo Scenario',
  exportCsv: 'Export CSV',
  exportPdf: 'Export PDF',
  generateAiReport: 'Generate Qala Brain Report',
  askBrainPlaceholder: 'Ask Qala Brain about Shymkent urban safety...',
  send: 'Send',
  registerIncidentBtn: 'Register as Incident',
  confirmOperator: 'Operator Confirm',
  dismissAlert: 'Dismiss',
  escalatePriority: 'Escalate Priority',
  dispatchInternal: 'Dispatch Internal Crew',
  officialEmergencyNumbers: 'Official Kazakhstan Emergency Numbers',
  noAutoGovDispatch: 'Notice: Automatic dispatch to state emergency agencies is disabled without official integration.',
  submitReport: 'Submit Report',
  saveOfflineDraft: 'Save Offline Draft',
  syncDrafts: 'Sync Drafts',
  capturePhoto: 'Capture Camera',
  uploadMedia: 'Upload Photo / Video',
  voiceNote: 'Voice Description',
  analyzeWithAi: 'Analyze with AI',
  simulateFlood: 'Flood Simulation',
  simulateClosure: 'Road Closure',
  simulateCongestion: 'Congestion Model',
  simulateOutage: 'Infra Outage',
  resetSim: 'Reset',
  simulationDisclaimer: 'Notice: Visual simulation is based on Open-Meteo & geometric assumptions, not a certified hydrological forecast.',
  play: 'Start',
  pause: 'Pause',
  resume: 'Resume',
  restart: 'Restart',
  loop: 'Loop',
  speed: 'Speed',
  tabs: {
    home: 'Home',
    map: 'Qala Map',
    brain: 'Qala Brain',
    vision: 'Vision AI',
    predict: 'Risk Predict',
    traffic: 'Traffic',
    infrastructure: 'Infrastructure',
    emergency: 'Emergency',
    citizen: 'Citizen Reports',
    eco: 'Ecology',
    response: 'Incident Response',
    twin: '3D Digital Twin',
    analytics: 'Analytics',
    settings: 'Settings',
  },
  citizenTabs: {
    home: 'Home',
    map: 'Map',
    report: 'Submit',
    ai: 'Qala Brain',
    profile: 'Profile',
  },
  categories: {
    traffic_accident: 'Traffic Accident',
    fire_smoke: 'Fire & Smoke',
    flooding: 'Flooding',
    road_pothole: 'Road Pothole',
    congestion: 'Traffic Congestion',
    fallen_tree: 'Fallen Tree',
    waste_overflow: 'Waste Overflow',
    infrastructure_damage: 'Infrastructure Damage',
    road_obstruction: 'Road Obstruction',
    water_pipe: 'Water Pipe Failure',
    power_outage: 'Power Grid Outage',
  },
  severities: {
    low: 'Low Risk',
    medium: 'Medium Risk',
    high: 'High Risk',
    critical: 'Critical Risk',
  },
  statuses: {
    detected: 'Detected',
    under_review: 'Under Review',
    confirmed: 'Confirmed',
    assigned: 'Assigned',
    in_progress: 'In Progress',
    resolved: 'Resolved',
    closed: 'Closed',
  },
  roles: {
    citizen: 'Citizen',
    city_operator: 'City Operator',
    agency_staff: 'Agency Staff',
    agency_head: 'Agency Head',
    emergency_coordinator: 'Emergency Coordinator',
    city_admin: 'City Admin',
    platform_admin: 'Platform Admin',
  },
  brainPrompts: [
    'What hazardous situations are active in Shymkent today?',
    'Which district experiences frequent traffic incidents?',
    'Which streets require urgent road repair?',
    'Which zones have elevated flood risk?',
    'Which issues need immediate dispatch?',
    'Prepare the weekly city safety executive brief.',
  ],
  site: {
    missionTitle: 'Project Mission',
    missionBody:
      'Unify urban safety, municipal utilities, mobility monitoring, and proactive risk prediction into one intelligent city operating system.',
    problemsTitle: 'Urban Challenges Today',
    problems: [
      { title: 'Fragmented Silos', desc: 'Agencies operate on disconnected tools, slowing emergency coordination.' },
      { title: 'Reactive Operations', desc: 'Hazards are discovered after damage occurs instead of early prediction.' },
      { title: 'Duplicate Reports', desc: 'Citizen reports and camera feeds are not correlated automatically.' },
    ],
    solutionsTitle: 'QalaQauip Solutions',
    solutions: [
      { title: 'Qala Brain AI', desc: 'Database-grounded reasoning, classification, and response recommendations.' },
      { title: 'Vision AI & Mapping', desc: 'Multimodal hazard detection synced with live Google Maps / OSM views.' },
      { title: 'End-to-End Lifecycle', desc: 'Auditable workflow from detection to verified municipal resolution.' },
    ],
    modulesTitle: 'Ecosystem Modules',
    akimatTitle: 'Benefits for Municipalities',
    akimatPoints: [
      'Real-time situational awareness across all 5 Shymkent districts',
      'SLA deadline tracking and agency performance accountability',
      'One-click PDF/CSV exports and Qala Brain executive briefs',
    ],
    citizenTitle: 'Benefits for Citizens',
    citizenPoints: [
      'Report urban hazards in 30 seconds with photo, video, or voice',
      'Automatic GPS tagging and live resolution tracking',
      'Offline-ready PWA draft saving when connectivity drops',
    ],
    pilotTitle: 'Pilot City — Shymkent',
    pilotBody:
      'Covers all 5 districts of Shymkent (Abay, Al-Farabi, Enbekshi, Karatau, Turan) with multi-city architecture ready for Astana, Almaty, and global expansion.',
    partnerTitle: 'Partnership & Deployment Inquiry',
    partnerOrg: 'Organization / Municipality',
    partnerContact: 'Contact Person',
    partnerCity: 'City',
    partnerMsg: 'Collaboration Goal',
    partnerSubmit: 'Submit Inquiry',
    partnerSuccess: 'Partnership inquiry saved to the database.',
  },
};

export const I18N: Record<Language, Dictionary> = {
  kk: KK,
  ru: RU,
  en: EN,
};
