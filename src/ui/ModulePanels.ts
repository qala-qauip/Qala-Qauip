import { Chart, registerables } from 'chart.js';
import {
  AUTHORIZED_CAMERA_FEEDS,
  CITIES,
  DEPARTMENTS,
  KZ_EMERGENCY_CONTACTS,
  generateSampleHazardCanvas,
} from '../data/shymkentBaseline.ts';
import { I18N, LANG_LABELS } from '../i18n.ts';
import { analyzeWithQalaVision } from '../services/apiService.ts';
import { createVisionDetectionRecord } from '../services/firebaseService.ts';
import type { TwinSimulationMode } from '../twin/CityTwinEngine.ts';
import type {
  CommandTab,
  Incident,
  IncidentCategory,
  IncidentStatus,
  Language,
  SeverityLevel,
} from '../types.ts';
import {
  escapeHtml,
  exportAnalyticsPdf,
  exportIncidentsCsv,
  formatTimestamp,
  severityBadgeClass,
} from './helpers.ts';
import { lucideSvg } from './icons.ts';
import { store } from './store.ts';

Chart.register(...registerables);

const STATUS_ORDER: IncidentStatus[] = [
  'detected',
  'under_review',
  'confirmed',
  'assigned',
  'in_progress',
  'resolved',
  'closed',
];

const CATEGORIES: IncidentCategory[] = [
  'traffic_accident',
  'fire_smoke',
  'flooding',
  'road_pothole',
  'congestion',
  'fallen_tree',
  'waste_overflow',
  'infrastructure_damage',
  'road_obstruction',
  'water_pipe',
  'power_outage',
];

export class ModulePanels {
  private charts: Chart[] = [];
  private cameraStream: MediaStream | null = null;
  private visionNotes = '';
  private visionMediaBase64 = '';
  private visionMime = 'image/jpeg';
  private visionSourceType: 'camera' | 'upload' | 'video' | 'audio' | 'sample' = 'sample';
  private brainInput = '';
  private newIncOpen = false;
  private filterCategory = 'all';
  private filterDistrict = 'all';

  public destroyCharts(): void {
    this.charts.forEach((c) => c.destroy());
    this.charts = [];
  }

  public stopCamera(): void {
    if (this.cameraStream) {
      this.cameraStream.getTracks().forEach((tr) => tr.stop());
      this.cameraStream = null;
    }
  }

  public renderTab(tab: CommandTab): string {
    switch (tab) {
      case 'home':
      case 'map':
        return this.renderMapWorkspace(tab === 'home');
      case 'brain':
        return this.renderBrainWorkspace();
      case 'vision':
        return this.renderVisionWorkspace();
      case 'predict':
        return this.renderPredictWorkspace();
      case 'traffic':
        return this.renderTrafficWorkspace();
      case 'infrastructure':
        return this.renderInfrastructureWorkspace();
      case 'emergency':
        return this.renderEmergencyWorkspace();
      case 'citizen':
        return this.renderCitizenDeskWorkspace();
      case 'eco':
        return this.renderEcoWorkspace();
      case 'response':
        return this.renderResponseWorkspace();
      case 'twin':
        return this.renderTwinWorkspace();
      case 'analytics':
        return this.renderAnalyticsWorkspace();
      case 'settings':
        return this.renderSettingsWorkspace();
    }
  }

  private renderMapWorkspace(showKpis: boolean): string {
    const s = store.state;
    const t = I18N[s.language];
    const incidents = store.getVisibleIncidents();
    const critical = incidents.filter((i) => i.severity === 'critical').length;
    const resolved = incidents.filter((i) => i.status === 'resolved' || i.status === 'closed').length;
    const rate = incidents.length > 0 ? `${Math.round((resolved / incidents.length) * 100)}%` : '0%';

    return `
      <div class="flex flex-col h-full gap-3">
        ${
          showKpis && !s.fullscreenMap
            ? `<div class="grid grid-cols-2 xl:grid-cols-4 gap-3">
                <div class="qq-surface rounded-xl p-3.5">
                  <div class="text-[11px] text-[var(--qq-text-muted)]">${escapeHtml(t.activeIncidents)}</div>
                  <div class="font-mono-tech text-2xl font-bold mt-1">${incidents.length}</div>
                </div>
                <div class="qq-surface rounded-xl p-3.5">
                  <div class="text-[11px] text-[var(--qq-text-muted)]">${escapeHtml(t.criticalAlerts)}</div>
                  <div class="font-mono-tech text-2xl font-bold mt-1 text-[#EF4444]">${critical}</div>
                </div>
                <div class="qq-surface rounded-xl p-3.5">
                  <div class="text-[11px] text-[var(--qq-text-muted)]">${escapeHtml(t.resolvedRate)}</div>
                  <div class="font-mono-tech text-2xl font-bold mt-1 text-[#22C55E]">${rate}</div>
                </div>
                <div class="qq-surface rounded-xl p-3.5">
                  <div class="text-[11px] text-[var(--qq-text-muted)]">${escapeHtml(t.tabs.eco)} / AQI</div>
                  <div class="font-mono-tech text-2xl font-bold mt-1 text-[#00D4E8]">
                    ${s.weather.available && s.weather.current ? `${s.weather.current.temperature_2m.toFixed(0)}°C` : '—'}
                    <span class="text-xs font-normal text-[var(--qq-text-muted)]">· AQI ${s.eco.available && s.eco.current ? s.eco.current.european_aqi : '—'}</span>
                  </div>
                </div>
              </div>`
            : ''
        }

        <!-- Map Control Toolbar -->
        <div class="qq-surface rounded-xl px-3 py-2 flex flex-wrap items-center justify-between gap-2">
          <div class="flex flex-wrap items-center gap-1.5">
            <button data-map-layer="mapSatellite" class="px-2.5 py-1.5 rounded-lg text-xs font-medium flex items-center gap-1.5 transition ${
              s.mapSatellite ? 'bg-[#00D4E8] text-[#080D14]' : 'qq-panel hover:border-[#00D4E8]/50'
            }">${lucideSvg('satellite', 'w-3.5 h-3.5')}${escapeHtml(s.mapSatellite ? t.satelliteView : t.streetView)}</button>

            <button data-map-layer="mapTraffic" class="px-2.5 py-1.5 rounded-lg text-xs font-medium flex items-center gap-1.5 transition ${
              s.mapTraffic ? 'bg-[#00D4E8]/20 text-[#00D4E8] border border-[#00D4E8]/40' : 'qq-panel'
            }">${lucideSvg('route', 'w-3.5 h-3.5')}${escapeHtml(t.trafficLayer)}</button>

            <button data-map-layer="mapHeatmap" class="px-2.5 py-1.5 rounded-lg text-xs font-medium flex items-center gap-1.5 transition ${
              s.mapHeatmap ? 'bg-[#EF4444]/20 text-[#EF4444] border border-[#EF4444]/40' : 'qq-panel'
            }">${lucideSvg('flame', 'w-3.5 h-3.5')}${escapeHtml(t.heatmapLayer)}</button>

            <button data-map-layer="mapDistricts" class="px-2.5 py-1.5 rounded-lg text-xs font-medium flex items-center gap-1.5 transition ${
              s.mapDistricts ? 'bg-[#00D4E8]/20 text-[#00D4E8] border border-[#00D4E8]/40' : 'qq-panel'
            }">${lucideSvg('layers', 'w-3.5 h-3.5')}${escapeHtml(t.districtsLayer)}</button>

            <button data-map-layer="mapEmergency" class="px-2.5 py-1.5 rounded-lg text-xs font-medium flex items-center gap-1.5 transition ${
              s.mapEmergency ? 'bg-[#38BDF8]/20 text-[#38BDF8] border border-[#38BDF8]/40' : 'qq-panel'
            }">${lucideSvg('siren', 'w-3.5 h-3.5')}${escapeHtml(t.emergencyLayer)}</button>

            <button data-map-layer="mapAltRoute" class="px-2.5 py-1.5 rounded-lg text-xs font-medium flex items-center gap-1.5 transition ${
              s.mapAltRoute ? 'bg-[#22C55E]/20 text-[#22C55E] border border-[#22C55E]/40' : 'qq-panel'
            }">${lucideSvg('navigation', 'w-3.5 h-3.5')}${escapeHtml(t.altRoutes)}</button>
          </div>

          <div class="flex items-center gap-1.5">
            ${
              s.mapsConfigured
                ? `<button data-mod-action="toggle-provider" class="px-2.5 py-1.5 rounded-lg qq-panel text-xs font-mono-tech hover:border-[#00D4E8]/50">
                    ${s.mapProvider === 'google' ? 'Google Maps' : 'MapLibre OSM'}
                  </button>`
                : `<span class="px-2.5 py-1.5 rounded-lg qq-panel text-[11px] font-mono-tech text-[var(--qq-text-muted)]">MapLibre OSM</span>`
            }
            <button data-mod-action="gps-me" class="p-1.5 rounded-lg qq-panel hover:border-[#00D4E8]/50" title="${escapeHtml(t.myLocation)}">
              ${lucideSvg('locate', 'w-4 h-4 text-[#00D4E8]')}
            </button>
            <button data-mod-action="toggle-new-inc" class="px-2.5 py-1.5 rounded-lg bg-[#00D4E8] text-[#080D14] text-xs font-semibold flex items-center gap-1">
              ${lucideSvg('plus', 'w-3.5 h-3.5')}${escapeHtml(t.newIncident)}
            </button>
            <button data-mod-action="fullscreen-map" class="p-1.5 rounded-lg qq-panel hover:border-[#00D4E8]/50" title="${escapeHtml(s.fullscreenMap ? t.exitFullscreen : t.fullscreen)}">
              ${lucideSvg(s.fullscreenMap ? 'minimize' : 'maximize', 'w-4 h-4')}
            </button>
          </div>
        </div>

        ${
          this.newIncOpen
            ? `<form id="qq-new-inc-form" class="qq-surface rounded-xl p-4 grid sm:grid-cols-4 gap-3 border-[#00D4E8]/40">
                <input name="title" required placeholder="Title / Атауы" class="sm:col-span-2 px-3 py-2 rounded-lg qq-panel text-xs outline-none" />
                <select name="category" class="px-3 py-2 rounded-lg qq-panel text-xs outline-none">
                  ${CATEGORIES.map((c) => `<option value="${c}">${escapeHtml(t.categories[c])}</option>`).join('')}
                </select>
                <select name="severity" class="px-3 py-2 rounded-lg qq-panel text-xs outline-none">
                  ${(['low', 'medium', 'high', 'critical'] as SeverityLevel[])
                    .map((sv) => `<option value="${sv}">${escapeHtml(t.severities[sv])}</option>`)
                    .join('')}
                </select>
                <input name="address" placeholder="Address / Мекенжай" value="Тәуке хан 48" class="sm:col-span-2 px-3 py-2 rounded-lg qq-panel text-xs outline-none" />
                <select name="district" class="px-3 py-2 rounded-lg qq-panel text-xs outline-none">
                  ${store
                    .getCity()
                    .districts.map((d) => `<option value="${d.id}">${escapeHtml(d.name[s.language])}</option>`)
                    .join('')}
                </select>
                <div class="flex gap-2">
                  <button type="submit" class="flex-1 py-2 rounded-lg bg-[#00D4E8] text-[#080D14] text-xs font-bold">${escapeHtml(t.registerIncidentBtn)}</button>
                  <button type="button" data-mod-action="toggle-new-inc" class="px-3 py-2 rounded-lg qq-panel text-xs">${lucideSvg('x', 'w-4 h-4')}</button>
                </div>
              </form>`
            : ''
        }

        <!-- Live Interactive Map Container -->
        <div class="relative flex-1 min-h-[380px] rounded-2xl overflow-hidden border border-[var(--qq-border)] bg-[#0A111A]">
          <div id="qq-main-map" class="w-full h-full min-h-[380px]"></div>
          <div class="absolute bottom-3 left-3 z-10 px-2.5 py-1 rounded-lg qq-glass text-[10px] font-mono-tech text-[var(--qq-text-muted)] pointer-events-none">
            ${escapeHtml(store.getCity().name[s.language])} · ${store.getCity().lat.toFixed(4)}, ${store.getCity().lng.toFixed(4)}
          </div>
        </div>
      </div>
    `;
  }

  private renderBrainWorkspace(): string {
    const s = store.state;
    const t = I18N[s.language];

    return `
      <div class="grid lg:grid-cols-12 gap-4 h-full">
        <div class="lg:col-span-8 flex flex-col qq-surface rounded-2xl p-4 h-[74vh]">
          <div class="flex items-center justify-between pb-3 border-b border-[var(--qq-border)]">
            <div class="flex items-center gap-2.5">
              <span class="p-2 rounded-xl bg-[#00D4E8]/15 text-[#00D4E8]">${lucideSvg('brain', 'w-5 h-5')}</span>
              <div>
                <div class="font-display font-bold text-base">Qala Brain</div>
                <div class="text-[11px] text-[var(--qq-text-muted)]">Grounded in Firestore (${s.liveIncidents.length} incidents) & Open-Meteo</div>
              </div>
            </div>
            <button data-mod-action="gen-weekly-report" class="px-3 py-1.5 rounded-lg qq-panel hover:border-[#00D4E8]/50 text-xs font-semibold flex items-center gap-1.5">
              ${lucideSvg('file', 'w-3.5 h-3.5 text-[#00D4E8]')}
              ${s.reportBusy ? '...' : escapeHtml(t.generateAiReport)}
            </button>
          </div>

          <div class="flex-1 overflow-y-auto qq-scrollbar py-4 space-y-3">
            ${
              s.brainMessages.length === 0
                ? `<div class="p-6 text-center space-y-3">
                    <div class="text-sm text-[var(--qq-text-muted)]">${escapeHtml(t.noFakeDataNotice)}</div>
                    <div class="flex flex-wrap justify-center gap-2">
                      ${t.brainPrompts
                        .map(
                          (p) =>
                            `<button data-brain-prompt="${escapeHtml(p)}" class="px-3 py-1.5 rounded-lg qq-panel hover:border-[#00D4E8]/60 text-xs">${escapeHtml(p)}</button>`
                        )
                        .join('')}
                    </div>
                  </div>`
                : s.brainMessages
                    .map(
                      (m) => `
                  <div class="p-3.5 rounded-xl text-sm leading-relaxed ${
                    m.role === 'user' ? 'bg-[#00D4E8]/12 ml-10 border border-[#00D4E8]/25' : 'qq-panel mr-6'
                  }">
                    <div class="text-[10px] font-mono-tech uppercase text-[var(--qq-text-muted)] mb-1">
                      ${m.role === 'user' ? 'Operator' : 'Qala Brain'} · ${formatTimestamp(m.timestamp, s.language)}
                    </div>
                    <div class="whitespace-pre-line">${escapeHtml(m.text)}</div>
                    ${
                      m.structured
                        ? `<div class="mt-3 pt-2.5 border-t border-[var(--qq-border)] space-y-1.5 text-xs">
                            <div class="flex flex-wrap gap-2">
                              ${
                                m.structured.riskLevel
                                  ? `<span class="px-2 py-0.5 rounded bg-[#00D4E8]/15 text-[#00D4E8] font-mono-tech">Risk: ${escapeHtml(m.structured.riskLevel)}</span>`
                                  : ''
                              }
                              ${
                                m.structured.recommendedDepartment
                                  ? `<span class="px-2 py-0.5 rounded qq-surface">${escapeHtml(m.structured.recommendedDepartment)}</span>`
                                  : ''
                              }
                            </div>
                            ${
                              m.structured.actionPlan?.length
                                ? `<ul class="list-disc pl-4 text-[var(--qq-text-muted)] space-y-0.5">
                                    ${m.structured.actionPlan.map((step) => `<li>${escapeHtml(step)}</li>`).join('')}
                                  </ul>`
                                : ''
                            }
                          </div>`
                        : ''
                    }
                  </div>
                `
                    )
                    .join('')
            }
            ${s.brainBusy ? `<div class="text-xs text-[#00D4E8] animate-pulse px-2">Qala Brain reasoning over verified city context...</div>` : ''}
          </div>

          <form id="qq-brain-form" class="pt-3 border-t border-[var(--qq-border)] flex gap-2">
            <input id="qq-brain-input" value="${escapeHtml(this.brainInput)}" placeholder="${escapeHtml(t.askBrainPlaceholder)}" class="flex-1 px-3.5 py-2.5 rounded-xl qq-panel text-sm outline-none focus:border-[#00D4E8]" />
            <button type="submit" class="px-4 py-2.5 rounded-xl bg-[#00D4E8] text-[#080D14] text-sm font-bold flex items-center gap-1.5">
              ${lucideSvg('send', 'w-4 h-4')}
              ${escapeHtml(t.send)}
            </button>
          </form>
        </div>

        <div class="lg:col-span-4 space-y-4">
          <div class="qq-surface rounded-2xl p-4 space-y-2.5">
            <div class="text-xs font-mono-tech uppercase text-[#00D4E8]">Quick Prompts</div>
            <div class="space-y-1.5">
              ${t.brainPrompts
                .map(
                  (p) =>
                    `<button data-brain-prompt="${escapeHtml(p)}" class="w-full text-left px-3 py-2 rounded-lg qq-panel hover:border-[#00D4E8]/50 text-xs transition">${escapeHtml(p)}</button>`
                )
                .join('')}
            </div>
          </div>

          ${
            s.lastReport
              ? `<div class="qq-surface rounded-2xl p-4 space-y-2">
                  <div class="font-bold text-sm text-[#00D4E8]">${escapeHtml(s.lastReport.title)}</div>
                  <p class="text-xs text-[var(--qq-text-muted)] leading-relaxed">${escapeHtml(s.lastReport.executiveSummary)}</p>
                  <ul class="text-xs list-disc pl-4 space-y-1">
                    ${s.lastReport.keyFindings.map((f) => `<li>${escapeHtml(f)}</li>`).join('')}
                  </ul>
                </div>`
              : ''
          }
        </div>
      </div>
    `;
  }

  private renderVisionWorkspace(): string {
    const s = store.state;
    const t = I18N[s.language];
    const res = s.visionResult;

    return `
      <div class="grid lg:grid-cols-12 gap-4">
        <div class="lg:col-span-7 qq-surface rounded-2xl p-4 space-y-4">
          <div class="flex flex-wrap items-center justify-between gap-2">
            <div class="font-display font-bold text-base flex items-center gap-2">
              ${lucideSvg('camera', 'w-5 h-5 text-[#00D4E8]')}
              Qala Vision AI
            </div>
            <span class="text-[11px] px-2.5 py-1 rounded-full bg-[#22C55E]/15 text-[#22C55E] border border-[#22C55E]/30">
              No facial recognition · Hazard detection only
            </span>
          </div>

          <div class="flex flex-wrap gap-2">
            <button data-mod-action="vision-webcam" class="px-3 py-2 rounded-lg qq-panel hover:border-[#00D4E8]/50 text-xs font-semibold flex items-center gap-1.5">
              ${lucideSvg('video', 'w-4 h-4 text-[#00D4E8]')}
              ${this.cameraStream ? 'Capture Frame' : escapeHtml(t.capturePhoto)}
            </button>
            <label class="px-3 py-2 rounded-lg qq-panel hover:border-[#00D4E8]/50 text-xs font-semibold flex items-center gap-1.5 cursor-pointer">
              ${lucideSvg('upload', 'w-4 h-4 text-[#00D4E8]')}
              ${escapeHtml(t.uploadMedia)}
              <input id="qq-vision-file" type="file" accept="image/*,video/*,audio/*" class="hidden" />
            </label>
            <button data-vision-sample="pothole" class="px-2.5 py-2 rounded-lg qq-panel text-xs">Sample: Pothole</button>
            <button data-vision-sample="smoke" class="px-2.5 py-2 rounded-lg qq-panel text-xs">Sample: Smoke/Fire</button>
            <button data-vision-sample="flood" class="px-2.5 py-2 rounded-lg qq-panel text-xs">Sample: Flood</button>
          </div>

          <!-- Video or Preview + Bounding Box Overlay -->
          <div class="relative rounded-xl overflow-hidden border border-[var(--qq-border)] bg-[#060A10] min-h-[260px] flex items-center justify-center">
            ${
              this.cameraStream
                ? `<video id="qq-vision-video" autoplay playsinline muted class="w-full max-h-[340px] object-contain"></video>`
                : this.visionMediaBase64 && this.visionMime.startsWith('image/')
                  ? `<div class="relative w-full flex justify-center">
                      <img src="${this.visionMediaBase64}" alt="Vision analysis input" class="max-h-[340px] object-contain" />
                      ${
                        res?.boundingBox && res.detected
                          ? `<div style="top:${(res.boundingBox.ymin / 10).toFixed(1)}%;left:${(res.boundingBox.xmin / 10).toFixed(1)}%;width:${Math.max(8, (res.boundingBox.xmax - res.boundingBox.xmin) / 10).toFixed(1)}%;height:${Math.max(8, (res.boundingBox.ymax - res.boundingBox.ymin) / 10).toFixed(1)}%" class="absolute border-2 border-[#00D4E8] bg-[#00D4E8]/15 rounded pointer-events-none">
                              <span class="absolute -top-5 left-0 px-1.5 py-0.5 bg-[#00D4E8] text-[#080D14] text-[10px] font-bold rounded">${escapeHtml(res.boundingBox.label || res.hazardCategory)}</span>
                            </div>`
                          : ''
                      }
                    </div>`
                  : `<div class="text-xs text-[var(--qq-text-muted)] p-8 text-center">Select a sample road hazard scene, upload media, or open live camera feed.</div>`
            }
          </div>

          <div class="flex gap-2">
            <input id="qq-vision-notes" value="${escapeHtml(this.visionNotes)}" placeholder="Location / operator notes..." class="flex-1 px-3 py-2 rounded-lg qq-panel text-xs outline-none" />
            <button data-mod-action="run-vision-ai" class="px-4 py-2 rounded-lg bg-[#00D4E8] text-[#080D14] text-xs font-bold flex items-center gap-1.5">
              ${lucideSvg('sparkles', 'w-4 h-4')}
              ${s.visionBusy ? '...' : escapeHtml(t.analyzeWithAi)}
            </button>
          </div>
        </div>

        <div class="lg:col-span-5 space-y-4">
          <div class="qq-surface rounded-2xl p-4 space-y-3">
            <div class="text-xs font-mono-tech uppercase text-[#00D4E8]">Detection Result</div>
            ${
              !res
                ? `<div class="text-xs text-[var(--qq-text-muted)] py-6">No media analyzed yet in this session.</div>`
                : `<div class="space-y-3">
                    <div class="flex items-center justify-between">
                      <span class="font-bold text-sm">${escapeHtml(res.title)}</span>
                      <span class="text-[11px] px-2 py-0.5 rounded-full border ${severityBadgeClass(res.severity)}">${escapeHtml(t.severities[res.severity])}</span>
                    </div>
                    <div class="grid grid-cols-2 gap-2 text-xs">
                      <div class="qq-panel rounded-lg p-2.5">
                        <div class="text-[var(--qq-text-muted)]">Category</div>
                        <div class="font-semibold mt-0.5">${escapeHtml(res.hazardCategory)}</div>
                      </div>
                      <div class="qq-panel rounded-lg p-2.5">
                        <div class="text-[var(--qq-text-muted)]">Confidence</div>
                        <div class="font-mono-tech font-bold mt-0.5 text-[#00D4E8]">${Math.round(res.confidence * 100)}%</div>
                      </div>
                    </div>
                    <p class="text-xs leading-relaxed text-[var(--qq-text-muted)]">${escapeHtml(res.explanation)}</p>
                    <div class="text-xs">
                      <span class="text-[var(--qq-text-muted)]">Dept:</span>
                      <span class="font-semibold">${escapeHtml(res.recommendedDepartment)}</span>
                    </div>
                    <div class="flex flex-wrap gap-2 pt-1">
                      <button data-mod-action="vision-register" class="flex-1 py-2 px-3 rounded-lg bg-[#00D4E8] text-[#080D14] text-xs font-bold">
                        ${escapeHtml(t.registerIncidentBtn)}
                      </button>
                      <button data-mod-action="vision-confirm" class="py-2 px-3 rounded-lg bg-[#22C55E]/20 text-[#22C55E] text-xs font-semibold">
                        ${escapeHtml(t.confirmOperator)}
                      </button>
                      <button data-mod-action="vision-dismiss" class="py-2 px-3 rounded-lg qq-panel text-xs">
                        ${escapeHtml(t.dismissAlert)}
                      </button>
                    </div>
                  </div>`
            }
          </div>

          <div class="qq-surface rounded-2xl p-4 space-y-2">
            <div class="text-xs font-semibold">Authorized Camera Corridor Metadata</div>
            ${AUTHORIZED_CAMERA_FEEDS.map(
              (c) => `
              <div class="qq-panel rounded-lg p-2.5 flex items-center justify-between text-xs">
                <span>${escapeHtml(c.name)}</span>
                <span class="px-2 py-0.5 rounded bg-[#F59E0B]/15 text-[#F59E0B] font-mono-tech text-[10px]">DEMO STREAM</span>
              </div>
            `
            ).join('')}
          </div>
        </div>
      </div>
    `;
  }

  private renderPredictWorkspace(): string {
    const s = store.state;
    const t = I18N[s.language];

    return `
      <div class="space-y-4">
        <div class="qq-surface rounded-xl p-3.5 flex flex-wrap items-center justify-between gap-2">
          <div class="text-xs text-[var(--qq-text-muted)]">
            <span class="font-semibold text-[var(--qq-text)]">Qala Predict Engine:</span>
            ${escapeHtml(t.sourceLabel)}: Open-Meteo + Firestore Patterns · ${escapeHtml(t.updatedLabel)}: ${formatTimestamp(s.weather.fetchedAt, s.language)}
          </div>
          <button data-mod-action="refresh-telemetry" class="px-3 py-1.5 rounded-lg qq-panel text-xs font-semibold flex items-center gap-1.5">
            ${lucideSvg('refresh', 'w-3.5 h-3.5 text-[#00D4E8]')}
            Refresh Open-Meteo
          </button>
        </div>

        <div class="grid sm:grid-cols-2 xl:grid-cols-4 gap-3">
          ${s.risks
            .map(
              (r) => `
            <div class="qq-surface rounded-2xl p-4 space-y-2.5">
              <div class="flex items-center justify-between gap-2">
                <span class="font-mono-tech text-xs uppercase text-[#00D4E8]">${escapeHtml(r.type.replace(/_/g, ' '))}</span>
                <span class="text-[10px] px-2 py-0.5 rounded-full border ${severityBadgeClass(r.severity)}">${escapeHtml(t.severities[r.severity])}</span>
              </div>
              <div class="flex items-end justify-between">
                <div class="font-mono-tech text-3xl font-bold">${r.index}<span class="text-xs text-[var(--qq-text-muted)]">/100</span></div>
                <span class="text-[10px] px-1.5 py-0.5 rounded qq-panel">${escapeHtml(r.timeWindow)}</span>
              </div>
              <div class="w-full h-1.5 rounded-full bg-white/10 overflow-hidden">
                <div class="h-full rounded-full ${
                  r.index >= 75 ? 'bg-[#EF4444]' : r.index >= 50 ? 'bg-orange-400' : r.index >= 25 ? 'bg-[#F59E0B]' : 'bg-[#22C55E]'
                }" style="width:${r.index}%"></div>
              </div>
              <div class="text-xs text-[var(--qq-text-muted)]">${escapeHtml(r.reasons[0] || '')}</div>
              <div class="text-[11px] font-medium text-[#00D4E8]">→ ${escapeHtml(r.preventiveActions[0] || '')}</div>
              <div class="text-[10px] text-[var(--qq-text-muted)] border-t border-[var(--qq-border)] pt-2 flex justify-between">
                <span>${escapeHtml(r.zone)}</span>
                <span>${r.kind === 'recorded_pattern' ? 'Recorded Pattern' : 'Rule-based'}</span>
              </div>
            </div>
          `
            )
            .join('')}
        </div>
      </div>
    `;
  }

  private renderTrafficWorkspace(): string {
    const s = store.state;
    const t = I18N[s.language];
    const trafficIncidents = store
      .getVisibleIncidents()
      .filter((i) => ['traffic_accident', 'congestion', 'road_obstruction', 'road_pothole'].includes(i.category));

    return `
      <div class="space-y-4">
        <div class="qq-surface rounded-2xl p-4 flex flex-wrap items-center justify-between gap-3">
          <div>
            <h2 class="font-display font-bold text-lg">${escapeHtml(t.tabs.traffic)}</h2>
            <p class="text-xs text-[var(--qq-text-muted)]">Corridor status, alternative route modeling, and authorized camera counting metadata (no automated signal control).</p>
          </div>
          <div class="flex gap-2">
            <button data-map-layer="mapAltRoute" class="px-3 py-2 rounded-lg text-xs font-semibold ${
              s.mapAltRoute ? 'bg-[#00D4E8] text-[#080D14]' : 'qq-panel'
            }">${escapeHtml(t.altRoutes)}</button>
            <button data-mod-action="sim-congestion-twin" class="px-3 py-2 rounded-lg qq-panel text-xs font-semibold">3D Congestion Sim</button>
          </div>
        </div>

        <div class="grid md:grid-cols-3 gap-3">
          ${AUTHORIZED_CAMERA_FEEDS.map(
            (cam) => `
            <div class="qq-surface rounded-xl p-4 space-y-2">
              <div class="flex items-center justify-between">
                <span class="text-xs font-bold">${escapeHtml(cam.name)}</span>
                <span class="text-[10px] px-2 py-0.5 rounded bg-[#F59E0B]/15 text-[#F59E0B]">Sensor not connected</span>
              </div>
              <div class="text-xs text-[var(--qq-text-muted)]">${escapeHtml(t.noDataUnavailable)}</div>
            </div>
          `
          ).join('')}
        </div>

        <div class="qq-surface rounded-2xl p-4 space-y-2.5">
          <div class="text-xs font-semibold uppercase text-[var(--qq-text-muted)]">Recorded Road & Mobility Incidents (${trafficIncidents.length})</div>
          ${
            trafficIncidents.length === 0
              ? `<div class="text-xs text-[var(--qq-text-muted)] py-4">${escapeHtml(t.noFakeDataNotice)}</div>`
              : trafficIncidents
                  .map(
                    (i) => `
                <div class="qq-panel rounded-xl p-3 flex items-center justify-between gap-3">
                  <div>
                    <div class="font-semibold text-sm">${escapeHtml(i.title)}</div>
                    <div class="text-xs text-[var(--qq-text-muted)]">${escapeHtml(i.address)} · ${escapeHtml(t.statuses[i.status])}</div>
                  </div>
                  <button data-open-inc="${i.id}" class="px-3 py-1.5 rounded-lg bg-[#00D4E8]/15 text-[#00D4E8] text-xs font-semibold">Inspect</button>
                </div>
              `
                  )
                  .join('')
          }
        </div>
      </div>
    `;
  }

  private renderInfrastructureWorkspace(): string {
    const s = store.state;
    const t = I18N[s.language];

    return `
      <div class="space-y-4">
        <div class="qq-surface rounded-xl p-3.5 flex flex-wrap items-center justify-between gap-2">
          <div class="text-xs text-[var(--qq-text-muted)]">
            MQTT / IoT telemetry ready · Unconnected physical sensors explicitly display <span class="text-[#F59E0B] font-semibold">Sensor not connected</span>.
          </div>
          <span class="text-xs font-mono-tech">Work Orders: ${s.workOrders.length}</span>
        </div>

        <div class="grid md:grid-cols-2 gap-3">
          ${s.assets
            .map(
              (a) => `
            <div class="qq-surface rounded-2xl p-4 space-y-2.5">
              <div class="flex items-start justify-between gap-2">
                <div>
                  <div class="text-[11px] font-mono-tech uppercase text-[#00D4E8]">${escapeHtml(a.assetType)} · ${escapeHtml(a.district)}</div>
                  <div class="font-bold text-sm mt-0.5">${escapeHtml(a.name[s.language])}</div>
                </div>
                <span class="text-[10px] px-2 py-0.5 rounded-full border ${
                  a.condition === 'degraded' || a.condition === 'critical'
                    ? 'bg-[#F59E0B]/15 text-[#F59E0B] border-[#F59E0B]/40'
                    : 'bg-[#22C55E]/15 text-[#22C55E] border-[#22C55E]/40'
                }">${escapeHtml(a.condition.toUpperCase())}</span>
              </div>

              <div class="grid grid-cols-3 gap-2 text-xs">
                <div class="qq-panel rounded-lg p-2">
                  <div class="text-[10px] text-[var(--qq-text-muted)]">Risk Score</div>
                  <div class="font-mono-tech font-bold">${a.riskScore}/100</div>
                </div>
                <div class="qq-panel rounded-lg p-2">
                  <div class="text-[10px] text-[var(--qq-text-muted)]">Next Check</div>
                  <div class="font-mono-tech">${escapeHtml(a.nextMaintenance)}</div>
                </div>
                <div class="qq-panel rounded-lg p-2">
                  <div class="text-[10px] text-[var(--qq-text-muted)]">IoT Feed</div>
                  <div class="text-[10px] text-[#F59E0B] font-semibold">${a.iotConnected ? 'Connected' : 'Not connected'}</div>
                </div>
              </div>

              <div class="flex items-center justify-between pt-1">
                <span class="text-[11px] text-[var(--qq-text-muted)] truncate pr-2">${escapeHtml(a.notes)}</span>
                <button data-create-wo="${a.id}" class="shrink-0 px-3 py-1.5 rounded-lg bg-[#00D4E8] text-[#080D14] text-xs font-bold">
                  + Work Order
                </button>
              </div>
            </div>
          `
            )
            .join('')}
        </div>

        ${
          s.workOrders.length > 0
            ? `<div class="qq-surface rounded-2xl p-4 space-y-2">
                <div class="text-xs font-semibold uppercase text-[var(--qq-text-muted)]">Work Orders</div>
                ${s.workOrders
                  .map(
                    (w) => `
                  <div class="qq-panel rounded-lg p-2.5 flex items-center justify-between text-xs">
                    <span class="font-medium">${escapeHtml(w.title)}</span>
                    <span class="font-mono-tech text-[#00D4E8]">${escapeHtml(w.status)} · ${escapeHtml(w.priority)}</span>
                  </div>
                `
                  )
                  .join('')}
              </div>`
            : `<div class="text-xs text-[var(--qq-text-muted)]">${escapeHtml(t.noDataUnavailable)}</div>`
        }
      </div>
    `;
  }

  private renderEmergencyWorkspace(): string {
    const s = store.state;
    const t = I18N[s.language];
    const urgent = store
      .getVisibleIncidents()
      .filter((i) => i.severity === 'critical' || i.severity === 'high');

    return `
      <div class="space-y-4">
        <div class="rounded-xl p-3.5 bg-[#EF4444]/10 border border-[#EF4444]/35 flex items-center gap-2.5 text-xs text-[#EF4444]">
          ${lucideSvg('shieldAlert', 'w-4 h-4 shrink-0')}
          <span>${escapeHtml(t.humanConfirmationRequired)} ${escapeHtml(t.noAutoGovDispatch)}</span>
        </div>

        <!-- Kazakhstan Official Emergency Numbers -->
        <div class="qq-surface rounded-2xl p-4 space-y-3">
          <div class="text-xs font-semibold uppercase text-[var(--qq-text-muted)]">${escapeHtml(t.officialEmergencyNumbers)}</div>
          <div class="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-2.5">
            ${KZ_EMERGENCY_CONTACTS.map(
              (c) => `
              <a href="tel:${c.number}" class="qq-panel rounded-xl p-3 hover:border-[#00D4E8]/60 transition block">
                <div class="font-mono-tech text-xl font-bold text-[#00D4E8] flex items-center justify-between">
                  ${c.number}
                  ${lucideSvg('phone', 'w-3.5 h-3.5')}
                </div>
                <div class="font-semibold text-xs mt-1">${escapeHtml(c.label[s.language])}</div>
                <div class="text-[10px] text-[var(--qq-text-muted)] mt-0.5">${escapeHtml(c.desc[s.language])}</div>
              </a>
            `
            ).join('')}
          </div>
        </div>

        <div class="qq-surface rounded-2xl p-4 space-y-3">
          <div class="text-xs font-semibold uppercase text-[var(--qq-text-muted)]">High & Critical Dispatch Queue (${urgent.length})</div>
          ${
            urgent.length === 0
              ? `<div class="text-xs text-[var(--qq-text-muted)] py-6 text-center">${escapeHtml(t.noFakeDataNotice)}</div>`
              : urgent
                  .map(
                    (i) => `
                <div class="qq-panel rounded-xl p-3.5 flex flex-wrap items-center justify-between gap-3">
                  <div class="space-y-1">
                    <div class="flex items-center gap-2">
                      <span class="font-mono-tech text-xs text-[#00D4E8]">${escapeHtml(i.trackingNumber)}</span>
                      <span class="text-[10px] px-2 py-0.5 rounded-full border ${severityBadgeClass(i.severity)}">${escapeHtml(t.severities[i.severity])}</span>
                      <span class="text-[11px] text-[var(--qq-text-muted)]">${escapeHtml(t.statuses[i.status])}</span>
                    </div>
                    <div class="font-semibold text-sm">${escapeHtml(i.title)}</div>
                    <div class="text-xs text-[var(--qq-text-muted)]">${escapeHtml(i.address)}</div>
                  </div>
                  <div class="flex flex-wrap gap-2">
                    <button data-dispatch-confirm="${i.id}" class="px-3 py-1.5 rounded-lg bg-[#22C55E] text-[#080D14] text-xs font-bold">${escapeHtml(t.confirmOperator)}</button>
                    <button data-dispatch-assign="${i.id}" class="px-3 py-1.5 rounded-lg bg-[#00D4E8] text-[#080D14] text-xs font-bold">${escapeHtml(t.dispatchInternal)}</button>
                  </div>
                </div>
              `
                  )
                  .join('')
          }
        </div>
      </div>
    `;
  }

  private renderCitizenDeskWorkspace(): string {
    const s = store.state;
    const t = I18N[s.language];
    const reports = store.getVisibleIncidents().filter((i) => i.source === 'citizen');

    return `
      <div class="space-y-4">
        <div class="qq-surface rounded-2xl p-4 flex flex-wrap items-center justify-between gap-3">
          <div>
            <h2 class="font-display font-bold text-lg">${escapeHtml(t.tabs.citizen)}</h2>
            <p class="text-xs text-[var(--qq-text-muted)]">Citizen submissions synced from mobile PWA and command intake.</p>
          </div>
          <button data-mod-action="open-citizen-pwa" class="px-3.5 py-2 rounded-lg bg-[#00D4E8] text-[#080D14] text-xs font-bold">
            ${escapeHtml(t.citizenApp)} →
          </button>
        </div>

        <div class="space-y-2.5">
          ${
            reports.length === 0
              ? `<div class="qq-surface rounded-xl p-6 text-center text-xs text-[var(--qq-text-muted)]">${escapeHtml(t.noFakeDataNotice)}</div>`
              : reports
                  .map(
                    (r) => `
                <div class="qq-surface rounded-xl p-4 flex flex-wrap items-center justify-between gap-3">
                  <div>
                    <div class="text-xs font-mono-tech text-[#00D4E8]">${escapeHtml(r.trackingNumber)} · ${escapeHtml(t.categories[r.category])}</div>
                    <div class="font-semibold text-sm mt-0.5">${escapeHtml(r.title)}</div>
                    <div class="text-xs text-[var(--qq-text-muted)] mt-0.5">${escapeHtml(r.address)} · ${formatTimestamp(r.createdAt, s.language)}</div>
                  </div>
                  <button data-open-inc="${r.id}" class="px-3 py-1.5 rounded-lg qq-panel text-xs font-semibold hover:border-[#00D4E8]/50">Manage</button>
                </div>
              `
                  )
                  .join('')
          }
        </div>
      </div>
    `;
  }

  private renderEcoWorkspace(): string {
    const s = store.state;
    const t = I18N[s.language];
    const w = s.weather;
    const e = s.eco;

    return `
      <div class="space-y-4">
        <div class="qq-surface rounded-xl p-3.5 flex flex-wrap items-center justify-between gap-2">
          <div class="text-xs text-[var(--qq-text-muted)]">
            ${escapeHtml(t.sourceLabel)}: <span class="text-[#00D4E8] font-medium">Open-Meteo Forecast & Air Quality</span> ·
            ${escapeHtml(t.updatedLabel)}: ${formatTimestamp(w.fetchedAt || e.fetchedAt, s.language)}
          </div>
          <button data-mod-action="refresh-telemetry" class="px-3 py-1.5 rounded-lg qq-panel text-xs font-semibold flex items-center gap-1.5">
            ${lucideSvg('refresh', 'w-3.5 h-3.5 text-[#00D4E8]')}Refresh
          </button>
        </div>

        <div class="grid sm:grid-cols-2 lg:grid-cols-4 gap-3">
          ${[
            ['Temperature', w.available && w.current ? `${w.current.temperature_2m.toFixed(1)} °C` : 'Unavailable'],
            ['Humidity', w.available && w.current ? `${w.current.relative_humidity_2m}%` : 'Unavailable'],
            ['Wind / Gusts', w.available && w.current ? `${w.current.wind_speed_10m} / ${w.current.wind_gusts_10m} km/h` : 'Unavailable'],
            ['Precipitation', w.available && w.current ? `${w.current.precipitation} mm` : 'Unavailable'],
            ['European AQI', e.available && e.current ? `${e.current.european_aqi}` : 'Unavailable'],
            ['PM2.5', e.available && e.current ? `${e.current.pm2_5} µg/m³` : 'Unavailable'],
            ['PM10', e.available && e.current ? `${e.current.pm10} µg/m³` : 'Unavailable'],
            ['NO₂ / O₃', e.available && e.current ? `${e.current.nitrogen_dioxide} / ${e.current.ozone} µg/m³` : 'Unavailable'],
          ]
            .map(
              ([k, v]) => `
            <div class="qq-surface rounded-2xl p-4">
              <div class="text-xs text-[var(--qq-text-muted)]">${k}</div>
              <div class="font-mono-tech text-2xl font-bold mt-1.5">${v}</div>
            </div>
          `
            )
            .join('')}
        </div>
      </div>
    `;
  }

  private renderResponseWorkspace(): string {
    const s = store.state;
    const t = I18N[s.language];
    const incidents = store.getVisibleIncidents();
    const sel = store.getSelectedIncident() || incidents[0] || null;

    return `
      <div class="grid lg:grid-cols-12 gap-4 h-full">
        <div class="lg:col-span-5 qq-surface rounded-2xl p-4 space-y-2.5 max-h-[74vh] overflow-y-auto qq-scrollbar">
          <div class="font-semibold text-xs uppercase text-[var(--qq-text-muted)]">${escapeHtml(t.tabs.response)} (${incidents.length})</div>
          ${
            incidents.length === 0
              ? `<div class="text-xs text-[var(--qq-text-muted)] py-8 text-center">${escapeHtml(t.noFakeDataNotice)}</div>`
              : incidents
                  .map(
                    (i) => `
                <button data-select-inc="${i.id}" class="w-full text-left qq-panel rounded-xl p-3 transition ${
                  sel?.id === i.id ? 'border-[#00D4E8]' : 'hover:border-[#00D4E8]/40'
                }">
                  <div class="flex items-center justify-between text-[11px]">
                    <span class="font-mono-tech text-[#00D4E8]">${escapeHtml(i.trackingNumber)}</span>
                    <span class="px-2 py-0.5 rounded-full border ${severityBadgeClass(i.severity)}">${escapeHtml(t.severities[i.severity])}</span>
                  </div>
                  <div class="font-semibold text-sm mt-1">${escapeHtml(i.title)}</div>
                  <div class="text-xs text-[var(--qq-text-muted)] mt-1 flex justify-between">
                    <span>${escapeHtml(t.statuses[i.status])}</span>
                    <span>${escapeHtml(i.district)}</span>
                  </div>
                </button>
              `
                  )
                  .join('')
          }
        </div>

        <div class="lg:col-span-7 qq-surface rounded-2xl p-4 space-y-4 max-h-[74vh] overflow-y-auto qq-scrollbar">
          ${
            !sel
              ? `<div class="text-sm text-[var(--qq-text-muted)] py-12 text-center">Select an incident to manage lifecycle, assign agency, and add notes.</div>`
              : `
            <div class="flex flex-wrap items-start justify-between gap-2 border-b border-[var(--qq-border)] pb-3">
              <div>
                <div class="flex items-center gap-2">
                  <span class="font-mono-tech text-xs text-[#00D4E8]">${escapeHtml(sel.trackingNumber)}</span>
                  ${sel.isDemo ? `<span class="text-[10px] px-2 py-0.5 rounded bg-[#F59E0B]/20 text-[#F59E0B] font-bold">DEMO</span>` : ''}
                </div>
                <h3 class="font-display text-lg font-bold mt-1">${escapeHtml(sel.title)}</h3>
                <div class="text-xs text-[var(--qq-text-muted)]">${escapeHtml(sel.address)} · ${sel.lat.toFixed(4)}, ${sel.lng.toFixed(4)}</div>
              </div>
              <span class="text-xs px-2.5 py-1 rounded-full border ${severityBadgeClass(sel.severity)}">${escapeHtml(t.severities[sel.severity])}</span>
            </div>

            <!-- 7-Step Lifecycle Stepper -->
            <div class="flex flex-wrap gap-1.5">
              ${STATUS_ORDER.map(
                (st) => `
                <button data-set-status="${sel.id}|${st}" class="px-2.5 py-1.5 rounded-lg text-[11px] font-semibold transition ${
                  sel.status === st
                    ? 'bg-[#00D4E8] text-[#080D14]'
                    : 'qq-panel hover:border-[#00D4E8]/50 text-[var(--qq-text-muted)]'
                }">${escapeHtml(t.statuses[st])}</button>
              `
              ).join('')}
            </div>

            <div class="grid sm:grid-cols-2 gap-3 text-xs">
              <div>
                <label class="block text-[var(--qq-text-muted)] mb-1">Responsible Department</label>
                <select data-assign-dept="${sel.id}" class="w-full px-3 py-2 rounded-lg qq-panel outline-none">
                  ${DEPARTMENTS.map(
                    (d) => `<option value="${d.id}" ${sel.assignedDepartmentId === d.id ? 'selected' : ''}>${escapeHtml(d.name[s.language])}</option>`
                  ).join('')}
                </select>
              </div>
              <div class="qq-panel rounded-lg p-2.5">
                <div class="text-[var(--qq-text-muted)]">AI Summary</div>
                <div class="mt-0.5">${escapeHtml(sel.aiSummary || sel.description || '—')}</div>
              </div>
            </div>

            <!-- History -->
            <div class="space-y-1.5">
              <div class="text-xs font-semibold uppercase text-[var(--qq-text-muted)]">Audit History</div>
              ${
                sel.history.length === 0
                  ? `<div class="text-xs text-[var(--qq-text-muted)]">Initial record logged.</div>`
                  : sel.history
                      .map(
                        (h) => `
                    <div class="qq-panel rounded-lg px-3 py-2 text-xs flex justify-between">
                      <span><strong class="text-[#00D4E8]">${escapeHtml(t.statuses[h.toStatus])}</strong> · ${escapeHtml(h.note)}</span>
                      <span class="text-[var(--qq-text-muted)]">${formatTimestamp(h.timestamp, s.language)}</span>
                    </div>
                  `
                      )
                      .join('')
              }
            </div>

            <!-- Comments -->
            <form id="qq-inc-comment-form" data-inc-id="${sel.id}" class="flex gap-2">
              <input name="comment" placeholder="Add operator/agency update..." class="flex-1 px-3 py-2 rounded-lg qq-panel text-xs outline-none" />
              <button type="submit" class="px-3.5 py-2 rounded-lg bg-[#00D4E8] text-[#080D14] text-xs font-bold">${escapeHtml(t.send)}</button>
            </form>
            ${
              sel.comments.length > 0
                ? `<div class="space-y-1.5">
                    ${sel.comments
                      .map(
                        (c) => `<div class="qq-panel rounded-lg p-2.5 text-xs"><strong>${escapeHtml(c.author)}:</strong> ${escapeHtml(c.text)}</div>`
                      )
                      .join('')}
                  </div>`
                : ''
            }
          `
          }
        </div>
      </div>
    `;
  }

  private renderTwinWorkspace(): string {
    const s = store.state;
    const t = I18N[s.language];

    return `
      <div class="relative w-full h-[76vh] rounded-2xl overflow-hidden border border-[var(--qq-border)] bg-[#080D14]">
        <div id="qq-twin-canvas" class="w-full h-full"></div>

        <div class="absolute top-3 left-3 right-3 flex flex-wrap items-center justify-between gap-2 pointer-events-none">
          <div class="px-3 py-1.5 rounded-xl qq-glass text-xs pointer-events-auto flex items-center gap-2">
            <span class="w-2 h-2 rounded-full bg-[#00D4E8]"></span>
            <span class="font-display font-bold">Shymkent 3D Digital Twin</span>
            <span class="text-[var(--qq-text-muted)] hidden sm:inline">· ${escapeHtml(t.simulationDisclaimer)}</span>
          </div>
          <button data-mod-action="enter-xr" class="pointer-events-auto px-3.5 py-2 rounded-xl bg-[#00D4E8] text-[#080D14] text-xs font-bold flex items-center gap-1.5 shadow-lg">
            ${lucideSvg('box', 'w-4 h-4')}
            ${escapeHtml(t.xrSpatial)}
          </button>
        </div>

        <!-- Collapsible Bottom Simulation Dock -->
        <div class="absolute bottom-3 left-1/2 -translate-x-1/2 z-10 qq-glass rounded-2xl px-3 py-2 flex flex-wrap items-center gap-1.5">
          ${(
            [
              ['flood', t.simulateFlood, 'waves'],
              ['closure', t.simulateClosure, 'alert'],
              ['congestion', t.simulateCongestion, 'route'],
              ['outage', t.simulateOutage, 'flame'],
              ['none', t.resetSim, 'reset'],
            ] as [TwinSimulationMode, string, 'waves' | 'alert' | 'route' | 'flame' | 'reset'][]
          )
            .map(
              ([mode, label, icon]) => `
            <button data-twin-sim="${mode}" class="px-3 py-1.5 rounded-xl text-xs font-semibold flex items-center gap-1.5 transition ${
              s.twinSimMode === mode && mode !== 'none'
                ? 'bg-[#00D4E8] text-[#080D14]'
                : 'hover:bg-white/10 text-[var(--qq-text)]'
            }">${lucideSvg(icon, 'w-3.5 h-3.5')}${escapeHtml(label)}</button>
          `
            )
            .join('')}
        </div>
      </div>
    `;
  }

  private renderAnalyticsWorkspace(): string {
    const s = store.state;
    const t = I18N[s.language];
    const filtered = this.getAnalyticsFilteredIncidents(s.liveIncidents);

    return `
      <div class="space-y-4">
        <div class="qq-surface rounded-2xl p-4 flex flex-wrap items-center justify-between gap-3">
          <div class="flex flex-wrap gap-2">
            <select id="qq-an-cat" class="px-3 py-2 rounded-lg qq-panel text-xs outline-none">
              <option value="all">All Categories</option>
              ${CATEGORIES.map(
                (c) => `<option value="${c}" ${this.filterCategory === c ? 'selected' : ''}>${escapeHtml(t.categories[c])}</option>`
              ).join('')}
            </select>
            <select id="qq-an-dist" class="px-3 py-2 rounded-lg qq-panel text-xs outline-none">
              <option value="all">All Districts</option>
              ${store
                .getCity()
                .districts.map(
                  (d) => `<option value="${d.id}" ${this.filterDistrict === d.id ? 'selected' : ''}>${escapeHtml(d.name[s.language])}</option>`
                )
                .join('')}
            </select>
          </div>
          <div class="flex flex-wrap gap-2">
            <button data-mod-action="gen-weekly-report" class="px-3 py-2 rounded-lg qq-panel text-xs font-semibold flex items-center gap-1.5">
              ${lucideSvg('brain', 'w-3.5 h-3.5 text-[#00D4E8]')}
              ${s.reportBusy ? '...' : escapeHtml(t.generateAiReport)}
            </button>
            <button data-mod-action="export-csv" class="px-3 py-2 rounded-lg qq-panel text-xs font-semibold flex items-center gap-1.5">
              ${lucideSvg('download', 'w-3.5 h-3.5')}
              ${escapeHtml(t.exportCsv)}
            </button>
            <button data-mod-action="export-pdf" class="px-3 py-2 rounded-lg bg-[#00D4E8] text-[#080D14] text-xs font-bold flex items-center gap-1.5">
              ${lucideSvg('file', 'w-3.5 h-3.5')}
              ${escapeHtml(t.exportPdf)}
            </button>
          </div>
        </div>

        <div class="grid md:grid-cols-2 gap-4">
          <div class="qq-surface rounded-2xl p-4 h-72 flex flex-col">
            <div class="text-xs font-semibold mb-2">Incidents by Category (DB Verified: ${filtered.length})</div>
            <div class="flex-1 relative"><canvas id="qq-chart-cat"></canvas></div>
          </div>
          <div class="qq-surface rounded-2xl p-4 h-72 flex flex-col">
            <div class="text-xs font-semibold mb-2">Severity Distribution</div>
            <div class="flex-1 relative"><canvas id="qq-chart-sev"></canvas></div>
          </div>
        </div>

        ${
          s.lastReport
            ? `<div class="qq-surface rounded-2xl p-4 space-y-2">
                <div class="font-display font-bold text-base text-[#00D4E8]">${escapeHtml(s.lastReport.title)}</div>
                <p class="text-xs leading-relaxed">${escapeHtml(s.lastReport.executiveSummary)}</p>
                <div class="grid md:grid-cols-2 gap-3 pt-2 text-xs">
                  <div>
                    <div class="font-semibold mb-1">Key Findings</div>
                    <ul class="list-disc pl-4 space-y-1 text-[var(--qq-text-muted)]">
                      ${s.lastReport.keyFindings.map((k) => `<li>${escapeHtml(k)}</li>`).join('')}
                    </ul>
                  </div>
                  <div>
                    <div class="font-semibold mb-1">Preventive Recommendations</div>
                    <ul class="list-disc pl-4 space-y-1 text-[var(--qq-text-muted)]">
                      ${s.lastReport.preventiveRecommendations.map((r) => `<li>${escapeHtml(r)}</li>`).join('')}
                    </ul>
                  </div>
                </div>
              </div>`
            : ''
        }
      </div>
    `;
  }

  private renderSettingsWorkspace(): string {
    const s = store.state;
    const t = I18N[s.language];

    return `
      <div class="max-w-3xl space-y-4">
        <div class="qq-surface rounded-2xl p-5 space-y-4">
          <h2 class="font-display font-bold text-lg">${escapeHtml(t.tabs.settings)}</h2>

          <div class="grid sm:grid-cols-2 gap-4 text-xs">
            <div class="space-y-1.5">
              <div class="text-[var(--qq-text-muted)]">Interface Language</div>
              <div class="flex gap-1.5">
                ${(['kk', 'ru', 'en'] as Language[])
                  .map(
                    (l) => `
                  <button data-set-lang="${l}" class="flex-1 py-2 rounded-lg font-semibold ${
                    s.language === l ? 'bg-[#00D4E8] text-[#080D14]' : 'qq-panel'
                  }">${LANG_LABELS[l]}</button>
                `
                  )
                  .join('')}
              </div>
            </div>

            <div class="space-y-1.5">
              <div class="text-[var(--qq-text-muted)]">Theme & City Scope</div>
              <div class="flex gap-2">
                <button data-mod-action="toggle-theme" class="flex-1 py-2 rounded-lg qq-panel font-semibold">
                  ${s.darkTheme ? 'Dark Mode' : 'Light Mode'}
                </button>
                <select id="qq-settings-city" class="flex-1 px-2.5 py-2 rounded-lg qq-panel outline-none">
                  ${CITIES.map(
                    (c) => `<option value="${c.id}" ${s.cityId === c.id ? 'selected' : ''}>${escapeHtml(c.name[s.language])}</option>`
                  ).join('')}
                </select>
              </div>
            </div>
          </div>

          <div class="grid sm:grid-cols-3 gap-3 text-xs pt-2 border-t border-[var(--qq-border)]">
            <div class="qq-panel rounded-xl p-3">
              <div class="text-[var(--qq-text-muted)]">Firebase Connection</div>
              <div class="font-bold mt-1 ${s.firebaseConnected ? 'text-[#22C55E]' : 'text-[#F59E0B]'}">
                ${s.firebaseConnected ? 'Connected' : 'Checked / Offline'}
              </div>
            </div>
            <div class="qq-panel rounded-xl p-3">
              <div class="text-[var(--qq-text-muted)]">Map Provider</div>
              <div class="font-bold mt-1 text-[#00D4E8]">${s.mapProvider === 'google' ? 'Google Maps Platform' : 'MapLibre + OSM'}</div>
            </div>
            <div class="qq-panel rounded-xl p-3">
              <div class="text-[var(--qq-text-muted)]">Active Role</div>
              <div class="font-bold mt-1">${s.user ? escapeHtml(t.roles[s.user.role]) : 'Guest Viewer'}</div>
            </div>
          </div>
        </div>
      </div>
    `;
  }

  private getAnalyticsFilteredIncidents(list: Incident[]): Incident[] {
    return list.filter((i) => {
      if (this.filterCategory !== 'all' && i.category !== this.filterCategory) return false;
      if (this.filterDistrict !== 'all' && i.district !== this.filterDistrict) return false;
      return true;
    });
  }

  public mountCharts(): void {
    this.destroyCharts();
    const s = store.state;
    const t = I18N[s.language];
    const filtered = this.getAnalyticsFilteredIncidents(s.liveIncidents);

    const catCanvas = document.querySelector<HTMLCanvasElement>('#qq-chart-cat');
    if (catCanvas) {
      const counts = CATEGORIES.map((c) => filtered.filter((i) => i.category === c).length);
      this.charts.push(
        new Chart(catCanvas, {
          type: 'bar',
          data: {
            labels: CATEGORIES.map((c) => t.categories[c].slice(0, 14)),
            datasets: [
              {
                label: 'Incidents',
                data: counts,
                backgroundColor: '#00D4E8',
                borderRadius: 6,
              },
            ],
          },
          options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: { legend: { display: false } },
            scales: {
              x: { ticks: { color: '#8C9BAA', font: { size: 10 } } },
              y: { beginAtZero: true, ticks: { color: '#8C9BAA', stepSize: 1 } },
            },
          },
        })
      );
    }

    const sevCanvas = document.querySelector<HTMLCanvasElement>('#qq-chart-sev');
    if (sevCanvas) {
      const sevKeys: SeverityLevel[] = ['low', 'medium', 'high', 'critical'];
      this.charts.push(
        new Chart(sevCanvas, {
          type: 'doughnut',
          data: {
            labels: sevKeys.map((k) => t.severities[k]),
            datasets: [
              {
                data: sevKeys.map((k) => filtered.filter((i) => i.severity === k).length),
                backgroundColor: ['#22C55E', '#F59E0B', '#F97316', '#EF4444'],
                borderWidth: 0,
              },
            ],
          },
          options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
              legend: { position: 'bottom', labels: { color: '#8C9BAA', font: { size: 11 } } },
            },
          },
        })
      );
    }
  }

  public bindPanelEvents(
    container: HTMLElement,
    onMapLocate: () => void,
    onRequestRerender: () => void
  ): void {
    // Map layer toggles
    container.querySelectorAll<HTMLElement>('[data-map-layer]').forEach((btn) => {
      btn.addEventListener('click', () => {
        const layer = btn.dataset.mapLayer as
          | 'mapSatellite'
          | 'mapTraffic'
          | 'mapHeatmap'
          | 'mapDistricts'
          | 'mapEmergency'
          | 'mapAltRoute';
        if (layer) store.toggleMapLayer(layer);
      });
    });

    // Twin simulation mode buttons
    container.querySelectorAll<HTMLElement>('[data-twin-sim]').forEach((btn) => {
      btn.addEventListener('click', () => {
        store.setTwinSimMode(btn.dataset.twinSim as TwinSimulationMode);
      });
    });

    // Brain prompt shortcuts
    container.querySelectorAll<HTMLElement>('[data-brain-prompt]').forEach((btn) => {
      btn.addEventListener('click', () => {
        void store.askQalaBrain(btn.dataset.brainPrompt || '');
      });
    });

    // Vision samples
    container.querySelectorAll<HTMLElement>('[data-vision-sample]').forEach((btn) => {
      btn.addEventListener('click', () => {
        this.stopCamera();
        const kind = btn.dataset.visionSample as 'pothole' | 'smoke' | 'flood';
        this.visionMediaBase64 = generateSampleHazardCanvas(kind);
        this.visionMime = 'image/jpeg';
        this.visionSourceType = 'sample';
        this.visionNotes = `Shymkent sample scene (${kind})`;
        onRequestRerender();
      });
    });

    // New incident form
    const newIncForm = container.querySelector<HTMLFormElement>('#qq-new-inc-form');
    newIncForm?.addEventListener('submit', async (e) => {
      e.preventDefault();
      const fd = new FormData(newIncForm);
      const city = store.getCity();
      const distId = String(fd.get('district') || city.districts[0]?.id || 'alfarabi');
      const distObj = city.districts.find((d) => d.id === distId);
      const lat = (distObj?.center[0] || city.lat) + (Math.random() - 0.5) * 0.008;
      const lng = (distObj?.center[1] || city.lng) + (Math.random() - 0.5) * 0.008;

      await store.registerIncident({
        title: String(fd.get('title') || 'Incident'),
        category: fd.get('category') as IncidentCategory,
        severity: fd.get('severity') as SeverityLevel,
        address: String(fd.get('address') || ''),
        district: distId,
        lat,
        lng,
        source: 'operator',
        operatorVerified: true,
      });
      this.newIncOpen = false;
      onRequestRerender();
    });

    // Brain form
    const brainForm = container.querySelector<HTMLFormElement>('#qq-brain-form');
    const brainInput = container.querySelector<HTMLInputElement>('#qq-brain-input');
    brainInput?.addEventListener('input', () => {
      this.brainInput = brainInput.value;
    });
    brainForm?.addEventListener('submit', (e) => {
      e.preventDefault();
      const q = this.brainInput.trim();
      if (!q) return;
      this.brainInput = '';
      void store.askQalaBrain(q);
    });

    // Vision file & notes
    const visionNotes = container.querySelector<HTMLInputElement>('#qq-vision-notes');
    visionNotes?.addEventListener('input', () => {
      this.visionNotes = visionNotes.value;
    });
    const visionFile = container.querySelector<HTMLInputElement>('#qq-vision-file');
    visionFile?.addEventListener('change', () => {
      const f = visionFile.files?.[0];
      if (!f) return;
      this.stopCamera();
      const reader = new FileReader();
      reader.onload = () => {
        this.visionMediaBase64 = String(reader.result || '');
        this.visionMime = f.type || 'image/jpeg';
        this.visionSourceType = f.type.startsWith('video/')
          ? 'video'
          : f.type.startsWith('audio/')
            ? 'audio'
            : 'upload';
        onRequestRerender();
      };
      reader.readAsDataURL(f);
    });

    // Re-attach live camera stream if active
    const videoEl = container.querySelector<HTMLVideoElement>('#qq-vision-video');
    if (videoEl && this.cameraStream) {
      videoEl.srcObject = this.cameraStream;
    }

    // Response controls
    container.querySelectorAll<HTMLElement>('[data-select-inc], [data-open-inc]').forEach((btn) => {
      btn.addEventListener('click', () => {
        const id = btn.dataset.selectInc || btn.dataset.openInc || null;
        store.selectIncident(id);
        if (btn.dataset.openInc) store.setActiveTab('response');
      });
    });

    container.querySelectorAll<HTMLElement>('[data-set-status]').forEach((btn) => {
      btn.addEventListener('click', () => {
        const [incId, st] = (btn.dataset.setStatus || '').split('|');
        if (incId && st) {
          void store.advanceIncidentStatus(incId, st as IncidentStatus, `Updated to ${st}`);
        }
      });
    });

    container.querySelectorAll<HTMLSelectElement>('[data-assign-dept]').forEach((selEl) => {
      selEl.addEventListener('change', () => {
        const incId = selEl.dataset.assignDept;
        if (incId) {
          void store.advanceIncidentStatus(incId, 'assigned', `Assigned to ${selEl.value}`, {
            assignedDepartmentId: selEl.value,
          });
        }
      });
    });

    const commentForm = container.querySelector<HTMLFormElement>('#qq-inc-comment-form');
    commentForm?.addEventListener('submit', (e) => {
      e.preventDefault();
      const incId = commentForm.dataset.incId;
      const fd = new FormData(commentForm);
      const txt = String(fd.get('comment') || '');
      if (incId && txt.trim()) store.addIncidentComment(incId, txt);
    });

    // Emergency dispatch actions
    container.querySelectorAll<HTMLElement>('[data-dispatch-confirm]').forEach((btn) => {
      btn.addEventListener('click', () => {
        const id = btn.dataset.dispatchConfirm;
        if (id) {
          void store.advanceIncidentStatus(id, 'confirmed', 'Emergency Coordinator verified', {
            operatorVerified: true,
          });
        }
      });
    });
    container.querySelectorAll<HTMLElement>('[data-dispatch-assign]').forEach((btn) => {
      btn.addEventListener('click', () => {
        const id = btn.dataset.dispatchAssign;
        if (id) {
          void store.advanceIncidentStatus(id, 'assigned', 'Internal brigade dispatched', {
            operatorVerified: true,
            assignedDepartmentId: 'tjd-shymkent',
          });
        }
      });
    });

    // Work Order creation
    container.querySelectorAll<HTMLElement>('[data-create-wo]').forEach((btn) => {
      btn.addEventListener('click', () => {
        const assetId = btn.dataset.createWo;
        const asset = store.state.assets.find((a) => a.id === assetId);
        if (asset) {
          void store.createWorkOrder({
            assetId: asset.id,
            departmentId: asset.departmentId,
            title: `Inspect & Maintain: ${asset.name[store.state.language]}`,
            priority: asset.priority,
          });
        }
      });
    });

    // Analytics filters
    container.querySelector<HTMLSelectElement>('#qq-an-cat')?.addEventListener('change', (e) => {
      this.filterCategory = (e.target as HTMLSelectElement).value;
      onRequestRerender();
    });
    container.querySelector<HTMLSelectElement>('#qq-an-dist')?.addEventListener('change', (e) => {
      this.filterDistrict = (e.target as HTMLSelectElement).value;
      onRequestRerender();
    });

    // Settings controls
    container.querySelectorAll<HTMLElement>('[data-set-lang]').forEach((btn) => {
      btn.addEventListener('click', () => {
        store.setLanguage(btn.dataset.setLang as Language);
      });
    });
    container.querySelector<HTMLSelectElement>('#qq-settings-city')?.addEventListener('change', (e) => {
      store.setCity((e.target as HTMLSelectElement).value as 'shymkent' | 'astana' | 'almaty');
    });

    // Generic module actions
    container.querySelectorAll<HTMLElement>('[data-mod-action]').forEach((btn) => {
      btn.addEventListener('click', async () => {
        const act = btn.dataset.modAction;
        if (act === 'toggle-provider') {
          store.setMapProvider(store.state.mapProvider === 'google' ? 'osm' : 'google');
        } else if (act === 'gps-me') {
          onMapLocate();
        } else if (act === 'toggle-new-inc') {
          this.newIncOpen = !this.newIncOpen;
          onRequestRerender();
        } else if (act === 'fullscreen-map') {
          store.toggleFullscreenMap();
        } else if (act === 'gen-weekly-report') {
          await store.runExecutiveReport('weekly');
        } else if (act === 'refresh-telemetry') {
          await store.refreshTelemetry();
        } else if (act === 'open-citizen-pwa') {
          store.setSurface('citizen');
        } else if (act === 'enter-xr') {
          store.setSurface('xr');
        } else if (act === 'sim-congestion-twin') {
          store.setTwinSimMode('congestion');
          store.setActiveTab('twin');
        } else if (act === 'toggle-theme') {
          store.toggleTheme();
        } else if (act === 'export-csv') {
          exportIncidentsCsv(this.getAnalyticsFilteredIncidents(store.state.liveIncidents));
        } else if (act === 'export-pdf') {
          exportAnalyticsPdf({
            cityName: store.getCity().name[store.state.language],
            incidents: this.getAnalyticsFilteredIncidents(store.state.liveIncidents),
            report: store.state.lastReport,
            lang: store.state.language,
          });
        } else if (act === 'vision-webcam') {
          if (this.cameraStream) {
            const vid = container.querySelector<HTMLVideoElement>('#qq-vision-video');
            if (vid && vid.videoWidth > 0) {
              const canvas = document.createElement('canvas');
              canvas.width = vid.videoWidth;
              canvas.height = vid.videoHeight;
              canvas.getContext('2d')?.drawImage(vid, 0, 0);
              this.visionMediaBase64 = canvas.toDataURL('image/jpeg', 0.9);
              this.visionMime = 'image/jpeg';
              this.visionSourceType = 'camera';
            }
            this.stopCamera();
            onRequestRerender();
          } else {
            try {
              this.cameraStream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: 'environment' } });
              onRequestRerender();
            } catch {
              store.showToast('Camera unavailable or permission denied', 'warning');
            }
          }
        } else if (act === 'run-vision-ai') {
          if (!this.visionMediaBase64) {
            this.visionMediaBase64 = generateSampleHazardCanvas('pothole');
            this.visionMime = 'image/jpeg';
            this.visionSourceType = 'sample';
          }
          store.state.visionBusy = true;
          onRequestRerender();
          try {
            const res = await analyzeWithQalaVision({
              mediaBase64: this.visionMediaBase64,
              mimeType: this.visionMime,
              language: store.state.language,
              locationHint: this.visionNotes || store.getCity().name[store.state.language],
              sourceType: this.visionSourceType,
              userNotes: this.visionNotes,
            });
            store.state.visionResult = res;
            store.state.visionHistory = [res, ...store.state.visionHistory].slice(0, 12);
            void createVisionDetectionRecord({
              cityId: store.state.cityId,
              hazardType: res.hazardCategory,
              severity: res.severity,
              confidence: res.confidence,
              explanation: res.explanation,
              operatorStatus: 'pending',
            });
          } catch (err) {
            store.showToast(err instanceof Error ? err.message : 'Vision AI failed', 'danger');
          } finally {
            store.state.visionBusy = false;
            onRequestRerender();
          }
        } else if (act === 'vision-register' && store.state.visionResult) {
          const r = store.state.visionResult;
          const cat: IncidentCategory =
            r.hazardCategory === 'none' ? 'infrastructure_damage' : r.hazardCategory;
          const city = store.getCity();
          await store.registerIncident({
            category: cat,
            severity: r.severity,
            title: r.title,
            description: r.explanation,
            lat: city.lat + (Math.random() - 0.5) * 0.01,
            lng: city.lng + (Math.random() - 0.5) * 0.01,
            address: this.visionNotes || city.name[store.state.language],
            source: 'vision_ai',
            aiSummary: `${r.explanation} (${Math.round(r.confidence * 100)}%)`,
            operatorVerified: r.operatorStatus === 'confirmed',
          });
        } else if (act === 'vision-confirm' && store.state.visionResult) {
          store.state.visionResult.operatorStatus = 'confirmed';
          store.showToast('Detection verified by operator', 'success');
          onRequestRerender();
        } else if (act === 'vision-dismiss' && store.state.visionResult) {
          store.state.visionResult.operatorStatus = 'dismissed';
          store.showToast('Detection dismissed', 'info');
          onRequestRerender();
        }
      });
    });
  }
}
