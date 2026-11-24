import type { Unsubscribe } from 'firebase/firestore';
import {
  CITIES,
  DEMO_SCENARIOS,
  DEPARTMENTS,
  SHYMKENT_INFRASTRUCTURE_REGISTRY,
} from '../data/shymkentBaseline.ts';
import {
  computeRiskPredictions,
  fetchEco,
  fetchPublicConfig,
  fetchWeather,
  generateExecutiveReport,
  queryQalaBrain,
  type ReportResponse,
} from '../services/apiService.ts';
import {
  addIncidentHistoryRecord,
  createAuditLogRecord,
  createCitizenReportRecord,
  createIncidentRecord,
  createWorkOrderRecord,
  ensureUserDocs,
  findDuplicateIncident,
  generateId,
  observeAuth,
  saveAiAnalysisRecord,
  saveGeneratedReportRecord,
  subscribeIncidents,
  subscribeNotifications,
  subscribeWorkOrders,
  testConnection,
  updateIncidentRecord,
  updateUserLanguagePref,
} from '../services/firebaseService.ts';
import {
  canInstallPWA,
  getOfflineDrafts,
  initPWA,
  isIosSafari,
  isStandalonePWA,
  removeOfflineDraft,
  saveOfflineDraft,
  subscribePWA,
} from '../services/pwaService.ts';
import type { MapProviderMode } from '../map/QalaMapEngine.ts';
import type { TwinSimulationMode } from '../twin/CityTwinEngine.ts';
import type {
  AppSurfaceMode,
  BrainMessage,
  CitizenReportDraft,
  CitizenTab,
  CityConfig,
  CityId,
  CommandTab,
  EcoSnapshot,
  Incident,
  IncidentCategory,
  IncidentStatus,
  InfrastructureAsset,
  Language,
  NotificationItem,
  RiskPrediction,
  SeverityLevel,
  UserProfile,
  VisionAnalysisResult,
  WeatherSnapshot,
  WorkOrder,
} from '../types.ts';

export interface DemoState {
  active: boolean;
  playing: boolean;
  paused: boolean;
  scenarioIndex: number;
  stepIndex: number;
  speed: 1 | 2 | 4;
  loop: boolean;
}

export interface AppState {
  language: Language;
  darkTheme: boolean;
  surface: AppSurfaceMode;
  activeTab: CommandTab;
  citizenTab: CitizenTab;
  sidebarCollapsed: boolean;
  fullscreenMap: boolean;
  searchQuery: string;
  cityId: CityId;

  mapsApiKey: string;
  mapsConfigured: boolean;
  mapProvider: MapProviderMode;
  gmpQuotaExceeded: boolean;
  mapSatellite: boolean;
  mapTraffic: boolean;
  mapHeatmap: boolean;
  mapDistricts: boolean;
  mapEmergency: boolean;
  mapAltRoute: boolean;

  firebaseConnected: boolean;
  user: UserProfile | null;
  authModalOpen: boolean;
  authBusy: boolean;
  authError: string | null;

  liveIncidents: Incident[];
  demoIncidents: Incident[];
  demo: DemoState;
  selectedIncidentId: string | null;

  weather: WeatherSnapshot;
  eco: EcoSnapshot;
  risks: RiskPrediction[];
  assets: InfrastructureAsset[];
  workOrders: WorkOrder[];
  notifications: NotificationItem[];

  visionResult: VisionAnalysisResult | null;
  visionHistory: VisionAnalysisResult[];
  visionBusy: boolean;

  brainMessages: BrainMessage[];
  brainBusy: boolean;
  lastReport: ReportResponse | null;
  reportBusy: boolean;

  twinSimMode: TwinSimulationMode;
  offlineDrafts: CitizenReportDraft[];
  isOnline: boolean;
  canInstallPwa: boolean;
  isStandalonePwa: boolean;
  isIosSafari: boolean;

  toast: { text: string; tone: 'info' | 'success' | 'warning' | 'danger' } | null;
}

const LANG_KEY = 'qalaqauip_lang_v1';
const THEME_KEY = 'qalaqauip_theme_v1';

function readInitialLang(): Language {
  try {
    const saved = localStorage.getItem(LANG_KEY);
    if (saved === 'kk' || saved === 'ru' || saved === 'en') return saved;
  } catch {
    // ignore
  }
  return 'kk';
}

function readInitialDark(): boolean {
  try {
    return localStorage.getItem(THEME_KEY) !== 'light';
  } catch {
    return true;
  }
}

export class QalaStore {
  public state: AppState;
  private listeners = new Set<() => void>();
  private unsubIncidents: Unsubscribe | null = null;
  private unsubWorkOrders: Unsubscribe | null = null;
  private unsubNotifs: Unsubscribe | null = null;
  private demoTimer: number | null = null;
  private toastTimer: number | null = null;

  constructor() {
    const lang = readInitialLang();
    const dark = readInitialDark();
    document.documentElement.classList.toggle('light', !dark);
    document.documentElement.lang = lang;

    this.state = {
      language: lang,
      darkTheme: dark,
      surface: 'command',
      activeTab: 'home',
      citizenTab: 'home',
      sidebarCollapsed: false,
      fullscreenMap: false,
      searchQuery: '',
      cityId: 'shymkent',

      mapsApiKey: '',
      mapsConfigured: false,
      mapProvider: 'osm',
      gmpQuotaExceeded: false,
      mapSatellite: false,
      mapTraffic: true,
      mapHeatmap: true,
      mapDistricts: true,
      mapEmergency: true,
      mapAltRoute: false,

      firebaseConnected: false,
      user: null,
      authModalOpen: false,
      authBusy: false,
      authError: null,

      liveIncidents: [],
      demoIncidents: [],
      demo: {
        active: false,
        playing: false,
        paused: false,
        scenarioIndex: 0,
        stepIndex: 0,
        speed: 1,
        loop: true,
      },
      selectedIncidentId: null,

      weather: { source: 'Open-Meteo', fetchedAt: '', available: false },
      eco: { source: 'Open-Meteo Air Quality', fetchedAt: '', available: false },
      risks: [],
      assets: [...SHYMKENT_INFRASTRUCTURE_REGISTRY],
      workOrders: [],
      notifications: [],

      visionResult: null,
      visionHistory: [],
      visionBusy: false,

      brainMessages: [],
      brainBusy: false,
      lastReport: null,
      reportBusy: false,

      twinSimMode: 'none',
      offlineDrafts: getOfflineDrafts(),
      isOnline: typeof navigator !== 'undefined' ? navigator.onLine : true,
      canInstallPwa: false,
      isStandalonePwa: isStandalonePWA(),
      isIosSafari: isIosSafari(),

      toast: null,
    };
  }

  public subscribe(fn: () => void): () => void {
    this.listeners.add(fn);
    return () => this.listeners.delete(fn);
  }

  private emit(): void {
    this.listeners.forEach((fn) => fn());
  }

  public getCity(): CityConfig {
    return CITIES.find((c) => c.id === this.state.cityId) || CITIES[0];
  }

  public getVisibleIncidents(): Incident[] {
    const base = this.state.demo.active
      ? [...this.state.demoIncidents, ...this.state.liveIncidents]
      : [...this.state.liveIncidents];

    const q = this.state.searchQuery.trim().toLowerCase();
    if (!q) return base;
    return base.filter(
      (i) =>
        i.title.toLowerCase().includes(q) ||
        i.trackingNumber.toLowerCase().includes(q) ||
        i.address.toLowerCase().includes(q) ||
        i.district.toLowerCase().includes(q) ||
        i.category.toLowerCase().includes(q)
    );
  }

  public getSelectedIncident(): Incident | null {
    if (!this.state.selectedIncidentId) return null;
    return (
      this.state.demoIncidents.find((i) => i.id === this.state.selectedIncidentId) ||
      this.state.liveIncidents.find((i) => i.id === this.state.selectedIncidentId) ||
      null
    );
  }

  public showToast(text: string, tone: 'info' | 'success' | 'warning' | 'danger' = 'info'): void {
    this.state.toast = { text, tone };
    this.emit();
    if (this.toastTimer) window.clearTimeout(this.toastTimer);
    this.toastTimer = window.setTimeout(() => {
      this.state.toast = null;
      this.emit();
    }, 4500);
  }

  public async bootstrap(): Promise<void> {
    initPWA();
    subscribePWA(() => {
      this.state.isOnline = navigator.onLine;
      this.state.canInstallPwa = canInstallPWA();
      this.state.isStandalonePwa = isStandalonePWA();
      this.state.offlineDrafts = getOfflineDrafts();
      this.emit();
    });

    window.addEventListener('gmp-quota-exceeded', () => {
      this.state.gmpQuotaExceeded = true;
      this.state.mapProvider = 'osm';
      this.emit();
    });

    const pub = await fetchPublicConfig();
    this.state.mapsApiKey = pub.mapsApiKey;
    this.state.mapsConfigured = pub.mapsConfigured;
    this.state.mapProvider = pub.mapsConfigured ? 'google' : 'osm';

    const fbCheck = await testConnection();
    this.state.firebaseConnected = fbCheck.ok;

    observeAuth(async (fbUser) => {
      if (fbUser) {
        const profile = await ensureUserDocs(fbUser, this.state.language, this.state.cityId);
        this.state.user = profile;
        this.state.authModalOpen = false;
        this.state.authError = null;
      } else {
        this.state.user = null;
      }
      this.rewireFirestoreSubscriptions();
      this.emit();
    });

    this.rewireFirestoreSubscriptions();
    await this.refreshTelemetry();
  }

  private rewireFirestoreSubscriptions(): void {
    this.unsubIncidents?.();
    this.unsubWorkOrders?.();
    this.unsubNotifs?.();

    this.unsubIncidents = subscribeIncidents(this.state.cityId, this.state.user, (items) => {
      this.state.liveIncidents = items;
      this.recomputeRisks();
      this.emit();
    });

    this.unsubWorkOrders = subscribeWorkOrders(this.state.cityId, this.state.user, (orders) => {
      this.state.workOrders = orders;
      this.emit();
    });

    this.unsubNotifs = subscribeNotifications(this.state.user, (notifs) => {
      this.state.notifications = notifs;
      this.emit();
    });
  }

  public async refreshTelemetry(): Promise<void> {
    const city = this.getCity();
    const [weather, eco] = await Promise.all([fetchWeather(city.lat, city.lng), fetchEco(city.lat, city.lng)]);
    this.state.weather = weather;
    this.state.eco = eco;
    this.recomputeRisks();
    this.emit();
  }

  private recomputeRisks(): void {
    this.state.risks = computeRiskPredictions({
      city: this.getCity(),
      weather: this.state.weather,
      eco: this.state.eco,
      incidents: this.state.liveIncidents,
      assets: this.state.assets,
      language: this.state.language,
    });
  }

  public setLanguage(lang: Language): void {
    this.state.language = lang;
    document.documentElement.lang = lang;
    try {
      localStorage.setItem(LANG_KEY, lang);
    } catch {
      // ignore
    }
    if (this.state.user) {
      void updateUserLanguagePref(this.state.user.uid, this.state.user.displayName, lang);
    }
    this.recomputeRisks();
    this.emit();
  }

  public toggleTheme(): void {
    this.state.darkTheme = !this.state.darkTheme;
    document.documentElement.classList.toggle('light', !this.state.darkTheme);
    try {
      localStorage.setItem(THEME_KEY, this.state.darkTheme ? 'dark' : 'light');
    } catch {
      // ignore
    }
    this.emit();
  }

  public setSurface(surface: AppSurfaceMode): void {
    this.state.surface = surface;
    this.emit();
  }

  public setActiveTab(tab: CommandTab): void {
    this.state.activeTab = tab;
    this.state.surface = 'command';
    this.emit();
  }

  public setCitizenTab(tab: CitizenTab): void {
    this.state.citizenTab = tab;
    this.emit();
  }

  public setCity(cityId: CityId): void {
    this.state.cityId = cityId;
    this.rewireFirestoreSubscriptions();
    void this.refreshTelemetry();
    this.emit();
  }

  public setSearchQuery(q: string): void {
    this.state.searchQuery = q;
    this.emit();
  }

  public toggleSidebar(): void {
    this.state.sidebarCollapsed = !this.state.sidebarCollapsed;
    this.emit();
  }

  public toggleFullscreenMap(): void {
    this.state.fullscreenMap = !this.state.fullscreenMap;
    this.emit();
  }

  public setMapProvider(provider: MapProviderMode): void {
    this.state.mapProvider = provider;
    this.emit();
  }

  public toggleMapLayer(
    layer: 'mapSatellite' | 'mapTraffic' | 'mapHeatmap' | 'mapDistricts' | 'mapEmergency' | 'mapAltRoute'
  ): void {
    this.state[layer] = !this.state[layer];
    this.emit();
  }

  public selectIncident(id: string | null): void {
    this.state.selectedIncidentId = id;
    this.emit();
  }

  public setAuthModal(open: boolean): void {
    this.state.authModalOpen = open;
    this.state.authError = null;
    this.emit();
  }

  public setTwinSimMode(mode: TwinSimulationMode): void {
    this.state.twinSimMode = mode;
    this.emit();
  }

  public async registerIncident(params: {
    category: IncidentCategory;
    severity: SeverityLevel;
    title: string;
    description?: string;
    lat: number;
    lng: number;
    address?: string;
    district?: string;
    source: Incident['source'];
    aiSummary?: string;
    operatorVerified?: boolean;
  }): Promise<Incident> {
    const city = this.getCity();
    const district = params.district || city.districts[0]?.id || 'alfarabi';
    const dept = DEPARTMENTS.find((d) => d.categories.includes(params.category))?.id || 'qala-joldary';
    const dup = findDuplicateIncident(this.state.liveIncidents, params.category, params.lat, params.lng);

    const res = await createIncidentRecord({
      cityId: this.state.cityId,
      district,
      category: params.category,
      severity: params.severity,
      title: params.title,
      description: dup
        ? `${params.description || ''} [Linked near existing ${dup.trackingNumber}]`.trim()
        : params.description,
      lat: params.lat,
      lng: params.lng,
      address: params.address,
      source: params.source,
      assignedDepartmentId: dept,
      aiSummary: params.aiSummary,
      operatorVerified: params.operatorVerified,
      status: params.operatorVerified ? 'confirmed' : 'detected',
    });

    if (!res.savedToFirestore) {
      this.state.liveIncidents = [res.incident, ...this.state.liveIncidents];
    }

    if (params.source === 'citizen' && this.state.user?.emailVerified) {
      await createCitizenReportRecord({
        cityId: this.state.cityId,
        category: params.category,
        description: params.description || params.title,
        lat: params.lat,
        lng: params.lng,
        linkedIncidentId: res.incident.id,
      });
    }

    if (dup) {
      this.showToast(`Duplicate cluster noted near ${dup.trackingNumber}`, 'warning');
    } else if (res.savedToFirestore) {
      this.showToast(`${res.incident.trackingNumber} saved to Firestore`, 'success');
    } else {
      this.showToast(`${res.incident.trackingNumber} created in session (${res.error || 'local'})`, 'warning');
    }

    this.state.selectedIncidentId = res.incident.id;
    this.recomputeRisks();
    this.emit();
    return res.incident;
  }

  public async advanceIncidentStatus(
    incidentId: string,
    toStatus: IncidentStatus,
    note: string,
    extra?: { assignedDepartmentId?: string; severity?: SeverityLevel; operatorVerified?: boolean }
  ): Promise<void> {
    const inc =
      this.state.demoIncidents.find((i) => i.id === incidentId) ||
      this.state.liveIncidents.find((i) => i.id === incidentId);
    if (!inc) return;

    const fromStatus = inc.status;
    inc.status = toStatus;
    inc.updatedAt = new Date().toISOString();
    if (extra?.assignedDepartmentId) inc.assignedDepartmentId = extra.assignedDepartmentId;
    if (extra?.severity) inc.severity = extra.severity;
    if (extra?.operatorVerified !== undefined) inc.operatorVerified = extra.operatorVerified;
    inc.history = [
      ...inc.history,
      {
        id: generateId('h'),
        fromStatus,
        toStatus,
        note,
        actorName: this.state.user?.displayName || 'Operator',
        timestamp: inc.updatedAt,
      },
    ];

    if (!inc.isDemo) {
      const upd = await updateIncidentRecord(incidentId, {
        status: toStatus,
        ...(extra?.assignedDepartmentId ? { assignedDepartmentId: extra.assignedDepartmentId } : {}),
        ...(extra?.severity ? { severity: extra.severity } : {}),
        ...(extra?.operatorVerified !== undefined ? { operatorVerified: extra.operatorVerified } : {}),
      });
      if (upd.ok) {
        await addIncidentHistoryRecord(incidentId, fromStatus, toStatus, note);
        await createAuditLogRecord(`incident:${toStatus}`, `incidents/${incidentId}`);
      } else if (upd.error) {
        this.showToast(upd.error, 'warning');
      }
    }
    this.emit();
  }

  public addIncidentComment(incidentId: string, text: string): void {
    const inc =
      this.state.demoIncidents.find((i) => i.id === incidentId) ||
      this.state.liveIncidents.find((i) => i.id === incidentId);
    if (!inc || !text.trim()) return;
    inc.comments = [
      ...inc.comments,
      {
        id: generateId('c'),
        author: this.state.user?.displayName || 'Operator',
        text: text.trim(),
        createdAt: new Date().toISOString(),
      },
    ];
    this.emit();
  }

  public async createWorkOrder(params: {
    assetId?: string;
    incidentId?: string;
    departmentId?: string;
    title: string;
    priority: WorkOrder['priority'];
  }): Promise<void> {
    const res = await createWorkOrderRecord({
      cityId: this.state.cityId,
      ...params,
    });
    if (!res.ok) {
      this.state.workOrders = [res.order, ...this.state.workOrders];
      this.showToast(res.error || 'Saved work order locally', 'warning');
    } else {
      this.showToast('Work order created', 'success');
    }
    this.emit();
  }

  public async askQalaBrain(prompt: string): Promise<void> {
    if (!prompt.trim() || this.state.brainBusy) return;
    const userMsg: BrainMessage = {
      id: generateId('bm'),
      role: 'user',
      text: prompt.trim(),
      timestamp: new Date().toISOString(),
    };
    this.state.brainMessages = [...this.state.brainMessages, userMsg];
    this.state.brainBusy = true;
    this.emit();

    const city = this.getCity();
    const cityContext = {
      city: city.name[this.state.language],
      cityId: city.id,
      districts: city.districts.map((d) => d.name[this.state.language]),
      weather: this.state.weather.available ? this.state.weather.current : 'unavailable',
      airQuality: this.state.eco.available ? this.state.eco.current : 'unavailable',
      activeIncidentsCount: this.state.liveIncidents.length,
      recordedIncidents: this.state.liveIncidents.slice(0, 25).map((i) => ({
        trackingNumber: i.trackingNumber,
        category: i.category,
        severity: i.severity,
        status: i.status,
        district: i.district,
        address: i.address,
        title: i.title,
        operatorVerified: i.operatorVerified,
        assignedDepartmentId: i.assignedDepartmentId,
      })),
      riskPredictions: this.state.risks.map((r) => ({
        type: r.type,
        index: r.index,
        severity: r.severity,
        zone: r.zone,
        reasons: r.reasons,
      })),
      infrastructureAssets: this.state.assets.map((a) => ({
        name: a.name[this.state.language],
        condition: a.condition,
        riskScore: a.riskScore,
        iotConnected: a.iotConnected,
      })),
      departments: DEPARTMENTS.map((d) => ({
        id: d.id,
        name: d.name[this.state.language],
        slaMinutes: d.slaMinutes,
      })),
    };

    try {
      const res = await queryQalaBrain({
        prompt: prompt.trim(),
        language: this.state.language,
        cityContext,
        history: this.state.brainMessages.slice(-6).map((m) => ({ role: m.role, text: m.text })),
      });
      const aiMsg: BrainMessage = {
        id: generateId('bm'),
        role: 'assistant',
        text: res.answer,
        structured: {
          riskLevel: res.riskLevel,
          recommendedDepartment: res.recommendedDepartment,
          actionPlan: res.actionPlan,
          referencedIds: res.referencedIds,
        },
        timestamp: new Date().toISOString(),
      };
      this.state.brainMessages = [...this.state.brainMessages, aiMsg];
      void saveAiAnalysisRecord(this.state.cityId, prompt.trim(), res.answer);
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Qala Brain request failed';
      this.state.brainMessages = [
        ...this.state.brainMessages,
        {
          id: generateId('bm'),
          role: 'assistant',
          text: msg,
          timestamp: new Date().toISOString(),
        },
      ];
    } finally {
      this.state.brainBusy = false;
      this.emit();
    }
  }

  public async runExecutiveReport(period: 'daily' | 'weekly' | 'monthly'): Promise<void> {
    if (this.state.reportBusy) return;
    this.state.reportBusy = true;
    this.emit();
    try {
      const inc = this.state.liveIncidents;
      const statsSummary = {
        city: this.getCity().name[this.state.language],
        totalIncidents: inc.length,
        criticalCount: inc.filter((i) => i.severity === 'critical').length,
        resolvedCount: inc.filter((i) => i.status === 'resolved' || i.status === 'closed').length,
        weatherCurrent: this.state.weather.current || null,
        ecoCurrent: this.state.eco.current || null,
        topRisks: this.state.risks.slice(0, 4).map((r) => ({ type: r.type, index: r.index })),
        incidents: inc.slice(0, 15).map((i) => ({
          trackingNumber: i.trackingNumber,
          title: i.title,
          category: i.category,
          severity: i.severity,
          status: i.status,
          district: i.district,
        })),
      };
      const report = await generateExecutiveReport({
        period,
        language: this.state.language,
        statsSummary,
      });
      this.state.lastReport = report;
      void saveGeneratedReportRecord(this.state.cityId, period, report.title);
    } catch (err) {
      this.showToast(err instanceof Error ? err.message : 'Report generation failed', 'danger');
    } finally {
      this.state.reportBusy = false;
      this.emit();
    }
  }

  public saveCitizenDraft(draft: Omit<CitizenReportDraft, 'id' | 'createdAt' | 'synced'>): CitizenReportDraft {
    const full: CitizenReportDraft = {
      ...draft,
      id: generateId('draft'),
      createdAt: new Date().toISOString(),
      synced: false,
    };
    this.state.offlineDrafts = saveOfflineDraft(full);
    this.emit();
    return full;
  }

  public async syncCitizenDrafts(): Promise<void> {
    if (!navigator.onLine) {
      this.showToast('Offline — cannot sync drafts yet.', 'warning');
      return;
    }
    const drafts = [...this.state.offlineDrafts];
    for (const d of drafts) {
      await this.registerIncident({
        category: d.category,
        severity: 'medium',
        title: d.description.slice(0, 80) || 'Citizen Report',
        description: d.description,
        lat: d.lat,
        lng: d.lng,
        address: d.address,
        source: 'citizen',
        aiSummary: d.aiCategoryHint,
      });
      this.state.offlineDrafts = removeOfflineDraft(d.id);
    }
    this.showToast(`Synced ${drafts.length} offline draft(s).`, 'success');
    this.emit();
  }

  // --- Interactive Demo Mode (strictly isolated from live DB records) ---
  public startDemo(scenarioIdx = 0): void {
    this.stopDemoTimer();
    const idx = ((scenarioIdx % DEMO_SCENARIOS.length) + DEMO_SCENARIOS.length) % DEMO_SCENARIOS.length;
    this.state.demo = {
      ...this.state.demo,
      active: true,
      playing: true,
      paused: false,
      scenarioIndex: idx,
      stepIndex: 0,
    };
    this.applyDemoScenarioStep(idx, 0);
    this.scheduleNextDemoStep();
    this.emit();
  }

  public pauseDemo(): void {
    this.stopDemoTimer();
    this.state.demo.paused = true;
    this.state.demo.playing = false;
    this.emit();
  }

  public resumeDemo(): void {
    if (!this.state.demo.active) {
      this.startDemo(this.state.demo.scenarioIndex);
      return;
    }
    this.state.demo.paused = false;
    this.state.demo.playing = true;
    this.scheduleNextDemoStep();
    this.emit();
  }

  public stopDemo(): void {
    this.stopDemoTimer();
    this.state.demo = {
      ...this.state.demo,
      active: false,
      playing: false,
      paused: false,
      stepIndex: 0,
    };
    this.state.demoIncidents = [];
    this.emit();
  }

  public setDemoSpeed(speed: 1 | 2 | 4): void {
    this.state.demo.speed = speed;
    if (this.state.demo.playing && !this.state.demo.paused) {
      this.stopDemoTimer();
      this.scheduleNextDemoStep();
    }
    this.emit();
  }

  public toggleDemoLoop(): void {
    this.state.demo.loop = !this.state.demo.loop;
    this.emit();
  }

  public jumpToDemoScenario(idx: number): void {
    this.startDemo(idx);
  }

  private stopDemoTimer(): void {
    if (this.demoTimer !== null) {
      window.clearTimeout(this.demoTimer);
      this.demoTimer = null;
    }
  }

  private scheduleNextDemoStep(): void {
    this.stopDemoTimer();
    if (!this.state.demo.active || this.state.demo.paused || !this.state.demo.playing) return;
    const scenario = DEMO_SCENARIOS[this.state.demo.scenarioIndex];
    const delayMs = Math.round(3000 / this.state.demo.speed);

    this.demoTimer = window.setTimeout(() => {
      const nextStep = this.state.demo.stepIndex + 1;
      if (nextStep < scenario.steps.length) {
        this.state.demo.stepIndex = nextStep;
        this.applyDemoScenarioStep(this.state.demo.scenarioIndex, nextStep);
        this.scheduleNextDemoStep();
      } else if (this.state.demo.loop) {
        const nextScenario = (this.state.demo.scenarioIndex + 1) % DEMO_SCENARIOS.length;
        this.state.demo.scenarioIndex = nextScenario;
        this.state.demo.stepIndex = 0;
        this.applyDemoScenarioStep(nextScenario, 0);
        this.scheduleNextDemoStep();
      } else {
        this.state.demo.playing = false;
      }
      this.emit();
    }, delayMs);
  }

  private applyDemoScenarioStep(scenarioIdx: number, stepIdx: number): void {
    const scenario = DEMO_SCENARIOS[scenarioIdx];
    const lang = this.state.language;
    const step = scenario.steps[stepIdx] || scenario.steps[0];
    const nowIso = new Date().toISOString();

    const demoIncident: Incident = {
      id: `demo_${scenario.id}`,
      trackingNumber: `DEMO-${scenarioIdx + 1}`,
      cityId: 'shymkent',
      district: scenario.district,
      category: scenario.category,
      severity: scenario.severity,
      status: step.status,
      title: scenario.title[lang],
      description: scenario.aiExplanation[lang],
      lat: scenario.lat,
      lng: scenario.lng,
      address: scenario.address,
      source: 'vision_ai',
      reporterUid: 'demo_engine',
      assignedDepartmentId: scenario.departmentId,
      operatorVerified: stepIdx >= 1,
      aiSummary: scenario.aiExplanation[lang],
      createdAt: nowIso,
      updatedAt: nowIso,
      isDemo: true,
      history: scenario.steps.slice(0, stepIdx + 1).map((s, i) => ({
        id: `dh_${i}`,
        toStatus: s.status,
        note: s.label[lang],
        actorName: 'DEMO ENGINE',
        timestamp: nowIso,
      })),
      comments: [],
    };

    this.state.demoIncidents = [demoIncident];
    this.state.selectedIncidentId = demoIncident.id;
  }
}

export const store = new QalaStore();
