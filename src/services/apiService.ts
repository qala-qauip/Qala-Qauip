import type {
  CityConfig,
  EcoSnapshot,
  Incident,
  InfrastructureAsset,
  Language,
  RiskPrediction,
  SeverityLevel,
  VisionAnalysisResult,
  WeatherSnapshot,
} from '../types.ts';

export interface PublicRuntimeConfig {
  mapsApiKey: string;
  mapsConfigured: boolean;
  serverTime: string;
}

export interface BrainResponse {
  answer: string;
  riskLevel: string;
  recommendedDepartment: string;
  actionPlan: string[];
  referencedIds: string[];
}

export interface ReportResponse {
  title: string;
  executiveSummary: string;
  keyFindings: string[];
  preventiveRecommendations: string[];
  generatedAt: string;
}

export async function fetchPublicConfig(): Promise<PublicRuntimeConfig> {
  try {
    const res = await fetch('/api/config/public');
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    return (await res.json()) as PublicRuntimeConfig;
  } catch {
    return {
      mapsApiKey: import.meta.env.VITE_GOOGLE_MAPS_API_KEY || '',
      mapsConfigured: Boolean(import.meta.env.VITE_GOOGLE_MAPS_API_KEY),
      serverTime: new Date().toISOString(),
    };
  }
}

export async function fetchWeather(lat: number, lng: number): Promise<WeatherSnapshot> {
  try {
    const res = await fetch(`/api/weather?lat=${encodeURIComponent(lat)}&lng=${encodeURIComponent(lng)}`);
    const data = await res.json();
    if (!res.ok || !data.current) {
      return {
        source: 'Open-Meteo',
        fetchedAt: new Date().toISOString(),
        available: false,
        error: data?.error || `HTTP ${res.status}`,
      };
    }
    return {
      source: data.source || 'Open-Meteo',
      fetchedAt: data.fetchedAt || new Date().toISOString(),
      available: true,
      current: data.current,
      hourly: data.hourly,
    };
  } catch (err) {
    return {
      source: 'Open-Meteo',
      fetchedAt: new Date().toISOString(),
      available: false,
      error: err instanceof Error ? err.message : 'Weather unavailable',
    };
  }
}

export async function fetchEco(lat: number, lng: number): Promise<EcoSnapshot> {
  try {
    const res = await fetch(`/api/eco?lat=${encodeURIComponent(lat)}&lng=${encodeURIComponent(lng)}`);
    const data = await res.json();
    if (!res.ok || !data.current) {
      return {
        source: 'Open-Meteo Air Quality',
        fetchedAt: new Date().toISOString(),
        available: false,
        error: data?.error || `HTTP ${res.status}`,
      };
    }
    return {
      source: data.source || 'Open-Meteo Air Quality',
      fetchedAt: data.fetchedAt || new Date().toISOString(),
      available: true,
      current: data.current,
    };
  } catch (err) {
    return {
      source: 'Open-Meteo Air Quality',
      fetchedAt: new Date().toISOString(),
      available: false,
      error: err instanceof Error ? err.message : 'Air quality unavailable',
    };
  }
}

export async function queryQalaBrain(params: {
  prompt: string;
  language: Language;
  cityContext: Record<string, unknown>;
  history?: { role: string; text: string }[];
}): Promise<BrainResponse> {
  const res = await fetch('/api/ai/brain', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(params),
  });
  const data = await res.json();
  if (!res.ok) {
    throw new Error(data?.error || `Qala Brain HTTP ${res.status}`);
  }
  return data as BrainResponse;
}

export async function analyzeWithQalaVision(params: {
  mediaBase64: string;
  mimeType: string;
  language: Language;
  locationHint: string;
  sourceType: 'camera' | 'upload' | 'video' | 'audio' | 'sample';
  userNotes?: string;
}): Promise<VisionAnalysisResult> {
  const res = await fetch('/api/ai/vision', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(params),
  });
  const data = await res.json();
  if (!res.ok) {
    throw new Error(data?.error || `Qala Vision HTTP ${res.status}`);
  }
  return {
    ...data,
    previewDataUrl: params.mimeType.startsWith('image/') ? params.mediaBase64 : undefined,
    operatorStatus: 'pending',
  } as VisionAnalysisResult;
}

export async function generateExecutiveReport(params: {
  period: 'daily' | 'weekly' | 'monthly';
  language: Language;
  statsSummary: Record<string, unknown>;
}): Promise<ReportResponse> {
  const res = await fetch('/api/ai/report', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(params),
  });
  const data = await res.json();
  if (!res.ok) {
    throw new Error(data?.error || `Qala Report HTTP ${res.status}`);
  }
  return data as ReportResponse;
}

function severityFromIndex(idx: number): SeverityLevel {
  if (idx >= 75) return 'critical';
  if (idx >= 50) return 'high';
  if (idx >= 25) return 'medium';
  return 'low';
}

function clamp(n: number, min = 0, max = 100): number {
  return Math.max(min, Math.min(max, Math.round(n)));
}

export function computeRiskPredictions(params: {
  city: CityConfig;
  weather: WeatherSnapshot;
  eco: EcoSnapshot;
  incidents: Incident[];
  assets: InfrastructureAsset[];
  language: Language;
}): RiskPrediction[] {
  const { city, weather, incidents, assets, language } = params;
  const now = new Date().toISOString();
  const cur = weather.current;
  const hourly = weather.hourly;
  const liveIncidents = incidents.filter((i) => !i.isDemo && i.status !== 'closed');

  const maxPrecipProb = hourly?.precipitation_probability?.length
    ? Math.max(...hourly.precipitation_probability.slice(0, 12))
    : 0;
  const maxHourlyRain = hourly?.precipitation?.length
    ? Math.max(...hourly.precipitation.slice(0, 12))
    : 0;
  const maxHourlyWind = hourly?.wind_speed_10m?.length
    ? Math.max(...hourly.wind_speed_10m.slice(0, 12))
    : cur?.wind_speed_10m ?? 0;

  const temp = cur?.temperature_2m ?? 12;
  const rain = cur?.rain ?? 0;
  const wind = Math.max(cur?.wind_speed_10m ?? 0, cur?.wind_gusts_10m ?? 0, maxHourlyWind);

  const label = (kk: string, ru: string, en: string) =>
    language === 'kk' ? kk : language === 'ru' ? ru : en;

  const heavyRainIdx = clamp((maxPrecipProb * 0.6) + (rain + maxHourlyRain) * 8);
  const degradedDrainage = assets.filter((a) => a.assetType === 'sewage' && a.condition !== 'good').length;
  const floodIdx = clamp(heavyRainIdx * 0.72 + degradedDrainage * 16 + liveIncidents.filter((i) => i.category === 'flooding').length * 14);
  const strongWindIdx = clamp((wind / 60) * 100);
  const extremeTempIdx = clamp(temp >= 34 ? (temp - 30) * 8 : temp <= -8 ? (-temp - 4) * 7 : 8);
  const blackIceIdx = clamp(temp <= 2 && temp >= -12 ? (maxPrecipProb * 0.55 + (rain > 0 ? 35 : 12)) : 4);

  const roadIncidents = liveIncidents.filter((i) => i.category === 'traffic_accident' || i.category === 'road_pothole');
  const accidentIdx = clamp(20 + roadIncidents.length * 16 + (blackIceIdx > 45 ? 18 : 0) + (heavyRainIdx > 50 ? 12 : 0));

  const congestionCount = liveIncidents.filter((i) => i.category === 'congestion' || i.category === 'road_obstruction').length;
  const hour = new Date().getHours();
  const isPeak = (hour >= 7 && hour <= 9) || (hour >= 17 && hour <= 20);
  const congestionIdx = clamp((isPeak ? 42 : 18) + congestionCount * 18 + roadIncidents.length * 10);

  const avgAssetRisk = assets.length
    ? assets.reduce((acc, a) => acc + a.riskScore, 0) / assets.length
    : 25;
  const infraIdx = clamp(avgAssetRisk + (extremeTempIdx > 50 ? 12 : 0) + liveIncidents.filter((i) => i.category === 'water_pipe' || i.category === 'power_outage').length * 10);

  return [
    {
      id: 'pred-heavy-rain',
      type: 'heavy_rain',
      index: heavyRainIdx,
      severity: severityFromIndex(heavyRainIdx),
      reasons: [
        weather.available
          ? label(
              `12 сағаттық жауын-шашын ықтималдығы: ${maxPrecipProb}%`,
              `Вероятность осадков за 12 ч: ${maxPrecipProb}%`,
              `12h precipitation probability: ${maxPrecipProb}%`
            )
          : label('Ауа райы дерегі уақытша қолжетімсіз', 'Данные погоды недоступны', 'Weather API unavailable'),
      ],
      timeWindow: '0–12h',
      zone: city.name[language],
      preventiveActions: [
        label('Нөсер арықтарын алдын ала тексеру', 'Проверить ливневые стоки', 'Pre-check storm drains'),
      ],
      source: 'Open-Meteo + QalaQauip Rules Engine',
      updatedAt: now,
      kind: 'rule_based_prediction',
    },
    {
      id: 'pred-flood',
      type: 'flood_risk',
      index: floodIdx,
      severity: severityFromIndex(floodIdx),
      reasons: [
        label(
          `Жауын индексі (${heavyRainIdx}) және ${degradedDrainage} тозған кәріз нысаны`,
          `Индекс осадков (${heavyRainIdx}) и ${degradedDrainage} изношенных коллекторов`,
          `Rain index (${heavyRainIdx}) + ${degradedDrainage} degraded drainage assets`
        ),
      ],
      timeWindow: '0–24h',
      zone: city.districts[4]?.name[language] || city.name[language],
      preventiveActions: [
        label('Тұран коллекторын тазарту бригадасын дайындау', 'Подготовить очистку коллектора Туран', 'Stage Turan drainage clearing crew'),
      ],
      source: 'Open-Meteo + Infrastructure Registry',
      updatedAt: now,
      kind: 'rule_based_prediction',
    },
    {
      id: 'pred-wind',
      type: 'strong_wind',
      index: strongWindIdx,
      severity: severityFromIndex(strongWindIdx),
      reasons: [
        label(
          `Ең жоғары жел екпіні: ${wind.toFixed(1)} км/сағ`,
          `Максимальный ветер/порывы: ${wind.toFixed(1)} км/ч`,
          `Peak wind/gusts: ${wind.toFixed(1)} km/h`
        ),
      ],
      timeWindow: '0–12h',
      zone: city.name[language],
      preventiveActions: [
        label('Құрылыс крандары мен ескі ағаштарды бақылау', 'Мониторинг конструкций и деревьев', 'Monitor cranes and aging trees'),
      ],
      source: 'Open-Meteo + QalaQauip Rules Engine',
      updatedAt: now,
      kind: 'rule_based_prediction',
    },
    {
      id: 'pred-temp',
      type: 'extreme_temp',
      index: extremeTempIdx,
      severity: severityFromIndex(extremeTempIdx),
      reasons: [
        label(
          `Ауа температурасы: ${temp.toFixed(1)}°C`,
          `Температура воздуха: ${temp.toFixed(1)}°C`,
          `Ambient temperature: ${temp.toFixed(1)}°C`
        ),
      ],
      timeWindow: '0–24h',
      zone: city.name[language],
      preventiveActions: [
        label('Энергия және су желісінің жүктемесін тексеру', 'Контроль нагрузки энергосетей', 'Monitor grid & water peak demand'),
      ],
      source: 'Open-Meteo',
      updatedAt: now,
      kind: 'rule_based_prediction',
    },
    {
      id: 'pred-ice',
      type: 'black_ice',
      index: blackIceIdx,
      severity: severityFromIndex(blackIceIdx),
      reasons: [
        label(
          `Температура ${temp.toFixed(1)}°C кезінде ылғалдың қату ықтималдығы`,
          `Вероятность гололедицы при ${temp.toFixed(1)}°C`,
          `Surface freeze potential at ${temp.toFixed(1)}°C`
        ),
      ],
      timeWindow: 'Night / Morning',
      zone: city.districts[1]?.name[language] || city.name[language],
      preventiveActions: [
        label('Көпірлер мен еңіс жолдарға құм-тұз қоспасын дайындау', 'Подготовить реагенты для мостов', 'Stage de-icing on bridges'),
      ],
      source: 'Open-Meteo + QalaQauip Rules Engine',
      updatedAt: now,
      kind: 'rule_based_prediction',
    },
    {
      id: 'pred-accident',
      type: 'accident_hotspot',
      index: accidentIdx,
      severity: severityFromIndex(accidentIdx),
      reasons: [
        label(
          `Тіркелген жол оқиғалары: ${roadIncidents.length}, ауа райы факторы ескерілді`,
          `Зафиксированных дорожных инцидентов: ${roadIncidents.length}`,
          `${roadIncidents.length} recorded road incidents + weather factor`
        ),
      ],
      timeWindow: 'Next 6h',
      zone: city.districts[1]?.name[language] || city.name[language],
      preventiveActions: [
        label('Тәуке хан – Республика қиылысын патрульдік бақылау', 'Усилить контроль узла Тауке хана', 'Increase junction visibility patrol'),
      ],
      source: 'Incidents DB + Open-Meteo',
      updatedAt: now,
      kind: roadIncidents.length > 0 ? 'recorded_pattern' : 'rule_based_prediction',
    },
    {
      id: 'pred-congestion',
      type: 'congestion_prob',
      index: congestionIdx,
      severity: severityFromIndex(congestionIdx),
      reasons: [
        label(
          isPeak ? 'Қарбалас сағат жүктемесі + жол кедергілері' : 'Күндізгі ағын + тіркелген бөгеттер',
          isPeak ? 'Пиковая нагрузка + инциденты' : 'Текущий трафик + инциденты',
          isPeak ? 'Peak commute hour + active corridor incidents' : 'Baseline flow + active incidents'
        ),
      ],
      timeWindow: 'Next 3h',
      zone: city.districts[3]?.name[language] || city.name[language],
      preventiveActions: [
        label('Тұрғындарға балама көше бағыттарын ұсыну', 'Предложить объездные коридоры', 'Publish detour corridor advisories'),
      ],
      source: 'Incidents DB + Time-of-day Model',
      updatedAt: now,
      kind: 'rule_based_prediction',
    },
    {
      id: 'pred-infra',
      type: 'infra_degradation',
      index: infraIdx,
      severity: severityFromIndex(infraIdx),
      reasons: [
        label(
          `Орташа актив тәуекелі: ${Math.round(avgAssetRisk)}/100`,
          `Средний индекс износа активов: ${Math.round(avgAssetRisk)}/100`,
          `Mean asset risk index: ${Math.round(avgAssetRisk)}/100`
        ),
      ],
      timeWindow: '7 days',
      zone: city.districts[0]?.name[language] || city.name[language],
      preventiveActions: [
        label('Тәуекелі жоғары құбыр мен коллекторға жоспарлы жөндеу', 'Плановый ремонт изношенных сетей', 'Schedule work orders for degraded pipes & drains'),
      ],
      source: 'Infrastructure Registry + Incidents DB',
      updatedAt: now,
      kind: 'recorded_pattern',
    },
  ];
}
