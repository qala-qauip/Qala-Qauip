import { I18N, LANG_LABELS } from '../i18n.ts';
import { QalaMapEngine } from '../map/QalaMapEngine.ts';
import { analyzeWithQalaVision } from '../services/apiService.ts';
import { triggerPWAInstall } from '../services/pwaService.ts';
import type { CitizenTab, IncidentCategory, Language, SeverityLevel } from '../types.ts';
import { escapeHtml, formatTimestamp, severityBadgeClass } from './helpers.ts';
import { lucideSvg, qalaLogoSvg } from './icons.ts';
import { store } from './store.ts';

const CATEGORIES: IncidentCategory[] = [
  'road_pothole',
  'traffic_accident',
  'flooding',
  'fire_smoke',
  'water_pipe',
  'power_outage',
  'fallen_tree',
  'waste_overflow',
  'congestion',
  'infrastructure_damage',
];

export class CitizenAppView {
  private root: HTMLElement;
  private mapEngine: QalaMapEngine | null = null;
  private reportCategory: IncidentCategory = 'road_pothole';
  private reportSeverity: SeverityLevel = 'medium';
  private reportDescription = '';
  private reportAddress = 'Шымкент, Тәуке хан даңғылы';
  private reportLat = 42.3417;
  private reportLng = 69.5901;
  private reportPhotoDataUrl = '';
  private reportAiHint = '';
  private aiAnalyzing = false;
  private listeningVoice = false;
  private brainInput = '';

  constructor(root: HTMLElement) {
    this.root = root;
  }

  public render(): void {
    const s = store.state;
    const t = I18N[s.language];
    const city = store.getCity();

    if (s.citizenTab !== 'map') {
      this.mapEngine?.dispose();
      this.mapEngine = null;
    }

    this.root.innerHTML = `
      <div class="min-h-screen flex flex-col bg-[var(--qq-bg)] text-[var(--qq-text)] max-w-2xl mx-auto border-x border-[var(--qq-border)]">
        <!-- Mobile Top Bar -->
        <header class="sticky top-0 z-30 qq-glass border-b border-[var(--qq-border)] px-4 py-3 flex items-center justify-between gap-2">
          <div class="flex items-center gap-2.5">
            ${qalaLogoSvg(28)}
            <div>
              <div class="font-display font-bold text-sm leading-tight">${t.appName} · ${escapeHtml(t.citizenApp)}</div>
              <div class="text-[11px] text-[var(--qq-text-muted)]">${escapeHtml(city.name[s.language])}</div>
            </div>
          </div>
          <div class="flex items-center gap-1.5">
            ${
              !s.isOnline
                ? `<span class="px-2 py-1 rounded bg-[#F59E0B]/15 text-[#F59E0B] text-[10px] font-semibold flex items-center gap-1">${lucideSvg('wifiOff', 'w-3 h-3')}Offline</span>`
                : ''
            }
            ${
              s.canInstallPwa
                ? `<button data-cit-action="install-pwa" class="px-2.5 py-1 rounded-lg bg-[#00D4E8] text-[#080D14] text-[11px] font-semibold flex items-center gap-1">${lucideSvg('download', 'w-3 h-3')}PWA</button>`
                : ''
            }
            <button data-cit-action="command-mode" class="px-2.5 py-1 rounded-lg qq-surface text-[11px] font-medium hover:border-[#00D4E8]/50">
              ${escapeHtml(t.commandCenter)}
            </button>
          </div>
        </header>

        ${
          s.isIosSafari && !s.isStandalonePwa
            ? `<div class="px-4 py-2 text-[11px] bg-[#00D4E8]/10 text-[#00D4E8] border-b border-[var(--qq-border)]">${escapeHtml(t.iosInstallHint)}</div>`
            : ''
        }

        <!-- Main Mobile Body -->
        <main class="flex-1 p-4 pb-24 space-y-4 overflow-y-auto qq-scrollbar">
          ${this.renderTabBody()}
        </main>

        <!-- Bottom Mobile Navigation -->
        <nav class="fixed bottom-0 left-1/2 -translate-x-1/2 w-full max-w-2xl z-30 qq-glass border-t border-[var(--qq-border)] grid grid-cols-5">
          ${(
            [
              ['home', 'home'],
              ['map', 'map'],
              ['report', 'plus'],
              ['ai', 'brain'],
              ['profile', 'user'],
            ] as [CitizenTab, 'home' | 'map' | 'plus' | 'brain' | 'user'][]
          )
            .map(
              ([tab, icon]) => `
            <button data-cit-tab="${tab}" class="py-2.5 flex flex-col items-center justify-center gap-1 text-[11px] font-medium transition ${
              s.citizenTab === tab ? 'text-[#00D4E8]' : 'text-[var(--qq-text-muted)]'
            }">
              ${lucideSvg(icon, tab === 'report' ? 'w-5 h-5' : 'w-4 h-4')}
              <span class="truncate max-w-full px-1">${escapeHtml(t.citizenTabs[tab])}</span>
            </button>
          `
            )
            .join('')}
        </nav>
      </div>
    `;

    this.bindEvents();
    if (s.citizenTab === 'map') {
      void this.mountCitizenMap();
    }
  }

  private renderTabBody(): string {
    const s = store.state;
    const t = I18N[s.language];
    const incidents = store.getVisibleIncidents();

    if (s.citizenTab === 'home') {
      return `
        <div class="qq-surface rounded-2xl p-4 space-y-3">
          <div class="flex items-center justify-between">
            <div class="text-xs font-mono-tech text-[#00D4E8]">${escapeHtml(store.getCity().name[s.language])}</div>
            <span class="text-xs text-[var(--qq-text-muted)]">${s.weather.available && s.weather.current ? `${s.weather.current.temperature_2m.toFixed(1)}°C` : '—'}</span>
          </div>
          <h2 class="font-display text-lg font-bold">${escapeHtml(t.slogan)}</h2>
          <div class="flex gap-2">
            <button data-cit-tab="report" class="flex-1 py-2.5 px-3 rounded-xl bg-[#00D4E8] text-[#080D14] font-semibold text-xs flex items-center justify-center gap-1.5">
              ${lucideSvg('camera', 'w-4 h-4')}
              ${escapeHtml(t.submitReport)}
            </button>
            <button data-cit-tab="ai" class="py-2.5 px-3 rounded-xl qq-panel font-semibold text-xs flex items-center gap-1.5">
              ${lucideSvg('brain', 'w-4 h-4 text-[#00D4E8]')}
              Qala Brain
            </button>
          </div>
        </div>

        ${
          s.offlineDrafts.length > 0
            ? `<div class="qq-surface rounded-xl p-3 border-[#F59E0B]/40 flex items-center justify-between gap-2">
                <div class="text-xs"><span class="font-bold text-[#F59E0B]">${s.offlineDrafts.length}</span> ${escapeHtml(t.saveOfflineDraft)}</div>
                <button data-cit-action="sync-drafts" class="px-3 py-1.5 rounded-lg bg-[#F59E0B] text-[#080D14] text-xs font-semibold">${escapeHtml(t.syncDrafts)}</button>
              </div>`
            : ''
        }

        <div class="space-y-2.5">
          <div class="text-xs font-semibold uppercase tracking-wider text-[var(--qq-text-muted)]">${escapeHtml(t.activeIncidents)} (${incidents.length})</div>
          ${
            incidents.length === 0
              ? `<div class="qq-surface rounded-xl p-6 text-center text-xs text-[var(--qq-text-muted)]">${escapeHtml(t.noFakeDataNotice)}</div>`
              : incidents
                  .slice(0, 12)
                  .map(
                    (inc) => `
                  <div class="qq-surface rounded-xl p-3.5 space-y-1.5">
                    <div class="flex items-center justify-between gap-2">
                      <span class="font-mono-tech text-[11px] text-[#00D4E8]">${escapeHtml(inc.trackingNumber)}</span>
                      <span class="text-[10px] px-2 py-0.5 rounded-full border ${severityBadgeClass(inc.severity)}">${escapeHtml(t.severities[inc.severity])}</span>
                    </div>
                    <div class="font-semibold text-sm">${escapeHtml(inc.title)}</div>
                    <div class="text-xs text-[var(--qq-text-muted)] flex items-center justify-between">
                      <span>${escapeHtml(t.statuses[inc.status])}</span>
                      <span>${formatTimestamp(inc.createdAt, s.language)}</span>
                    </div>
                  </div>
                `
                  )
                  .join('')
          }
        </div>
      `;
    }

    if (s.citizenTab === 'map') {
      return `
        <div class="space-y-2">
          <div class="flex items-center justify-between">
            <div class="text-xs font-semibold">${escapeHtml(t.tabs.map)}</div>
            <button data-cit-action="gps-locate" class="px-2.5 py-1 rounded-lg qq-surface text-xs flex items-center gap-1">
              ${lucideSvg('locate', 'w-3.5 h-3.5 text-[#00D4E8]')}
              ${escapeHtml(t.myLocation)}
            </button>
          </div>
          <div id="qq-citizen-map" class="w-full h-[66vh] rounded-2xl overflow-hidden border border-[var(--qq-border)]"></div>
        </div>
      `;
    }

    if (s.citizenTab === 'report') {
      return `
        <div class="qq-surface rounded-2xl p-4 space-y-4">
          <h2 class="font-display text-lg font-bold">${escapeHtml(t.submitReport)}</h2>

          <!-- Step 1: Photo / Camera -->
          <div class="space-y-2">
            <div class="flex gap-2">
              <label class="flex-1 py-2.5 px-3 rounded-xl qq-panel text-xs font-semibold flex items-center justify-center gap-1.5 cursor-pointer hover:border-[#00D4E8]/60">
                ${lucideSvg('camera', 'w-4 h-4 text-[#00D4E8]')}
                ${escapeHtml(t.capturePhoto)}
                <input id="qq-cit-file" type="file" accept="image/*" capture="environment" class="hidden" />
              </label>
              <button data-cit-action="voice" class="py-2.5 px-3 rounded-xl qq-panel text-xs font-semibold flex items-center gap-1.5 ${
                this.listeningVoice ? 'border-[#EF4444] text-[#EF4444]' : ''
              }">
                ${lucideSvg('mic', 'w-4 h-4')}
                ${escapeHtml(t.voiceNote)}
              </button>
            </div>
            ${
              this.reportPhotoDataUrl
                ? `<div class="relative rounded-xl overflow-hidden border border-[var(--qq-border)]">
                    <img src="${this.reportPhotoDataUrl}" alt="Evidence" class="w-full max-h-48 object-cover" />
                    <button data-cit-action="ai-analyze" class="mt-2 w-full py-2 rounded-lg bg-[#00D4E8]/15 text-[#00D4E8] text-xs font-semibold flex items-center justify-center gap-1.5">
                      ${lucideSvg('sparkles', 'w-3.5 h-3.5')}
                      ${this.aiAnalyzing ? '...' : escapeHtml(t.analyzeWithAi)}
                    </button>
                  </div>`
                : ''
            }
            ${
              this.reportAiHint
                ? `<div class="text-xs p-2.5 rounded-lg bg-[#00D4E8]/10 text-[#00D4E8] border border-[#00D4E8]/30">${escapeHtml(this.reportAiHint)}</div>`
                : ''
            }
          </div>

          <!-- Step 2: Category & Description -->
          <div class="space-y-2.5">
            <select id="qq-cit-cat" class="w-full px-3 py-2.5 rounded-xl qq-panel text-sm outline-none">
              ${CATEGORIES.map(
                (c) => `<option value="${c}" ${this.reportCategory === c ? 'selected' : ''}>${escapeHtml(t.categories[c])}</option>`
              ).join('')}
            </select>
            <textarea id="qq-cit-desc" rows="3" placeholder="${escapeHtml(t.askBrainPlaceholder)}" class="w-full px-3 py-2.5 rounded-xl qq-panel text-sm outline-none">${escapeHtml(this.reportDescription)}</textarea>
          </div>

          <!-- Step 3: GPS -->
          <div class="space-y-2">
            <div class="flex gap-2">
              <input id="qq-cit-addr" value="${escapeHtml(this.reportAddress)}" class="flex-1 px-3 py-2 rounded-xl qq-panel text-xs outline-none" />
              <button data-cit-action="report-gps" class="px-3 py-2 rounded-xl qq-panel text-xs font-semibold flex items-center gap-1">
                ${lucideSvg('locate', 'w-3.5 h-3.5 text-[#00D4E8]')}GPS
              </button>
            </div>
            <div class="text-[11px] font-mono-tech text-[var(--qq-text-muted)]">GPS: ${this.reportLat.toFixed(5)}, ${this.reportLng.toFixed(5)}</div>
          </div>

          <!-- Step 4: Submit or Offline Draft -->
          <div class="flex gap-2 pt-1">
            <button data-cit-action="submit-report" class="flex-1 py-3 rounded-xl bg-[#00D4E8] text-[#080D14] text-sm font-bold">
              ${escapeHtml(t.submitReport)}
            </button>
            <button data-cit-action="save-draft" class="py-3 px-4 rounded-xl qq-panel text-xs font-semibold">
              ${escapeHtml(t.saveOfflineDraft)}
            </button>
          </div>
        </div>
      `;
    }

    if (s.citizenTab === 'ai') {
      return `
        <div class="qq-surface rounded-2xl p-4 space-y-3">
          <div class="font-display font-bold text-base flex items-center gap-2">
            ${lucideSvg('brain', 'w-5 h-5 text-[#00D4E8]')}
            Qala Brain
          </div>
          <div class="flex flex-wrap gap-1.5">
            ${t.brainPrompts
              .slice(0, 3)
              .map(
                (p) =>
                  `<button data-cit-prompt="${escapeHtml(p)}" class="text-left text-[11px] px-2.5 py-1.5 rounded-lg qq-panel hover:border-[#00D4E8]/50">${escapeHtml(p)}</button>`
              )
              .join('')}
          </div>
          <div class="space-y-2.5 max-h-[45vh] overflow-y-auto qq-scrollbar">
            ${s.brainMessages
              .map(
                (m) => `
              <div class="p-3 rounded-xl text-xs leading-relaxed ${
                m.role === 'user' ? 'bg-[#00D4E8]/15 ml-6' : 'qq-panel mr-4'
              }">${escapeHtml(m.text)}</div>
            `
              )
              .join('')}
            ${s.brainBusy ? `<div class="text-xs text-[#00D4E8] animate-pulse">Qala Brain analyzing...</div>` : ''}
          </div>
          <form id="qq-cit-brain-form" class="flex gap-2">
            <input id="qq-cit-brain-input" value="${escapeHtml(this.brainInput)}" placeholder="${escapeHtml(t.askBrainPlaceholder)}" class="flex-1 px-3 py-2 rounded-xl qq-panel text-xs outline-none" />
            <button type="submit" class="px-3.5 py-2 rounded-xl bg-[#00D4E8] text-[#080D14] text-xs font-bold">${escapeHtml(t.send)}</button>
          </form>
        </div>
      `;
    }

    // Profile
    return `
      <div class="qq-surface rounded-2xl p-4 space-y-4">
        <div class="flex items-center justify-between">
          <div>
            <div class="font-bold text-base">${s.user ? escapeHtml(s.user.displayName) : 'Guest Citizen'}</div>
            <div class="text-xs text-[var(--qq-text-muted)]">${s.user ? escapeHtml(s.user.email) : escapeHtml(t.guestOperatorNote)}</div>
          </div>
          ${
            s.user
              ? `<button data-cit-action="signout" class="px-3 py-1.5 rounded-lg qq-panel text-xs">${escapeHtml(t.signOut)}</button>`
              : `<button data-cit-action="signin" class="px-3 py-1.5 rounded-lg bg-[#00D4E8] text-[#080D14] text-xs font-semibold">${escapeHtml(t.signInGoogle)}</button>`
          }
        </div>
        <div class="flex gap-2">
          ${(['kk', 'ru', 'en'] as Language[])
            .map(
              (l) =>
                `<button data-cit-lang="${l}" class="flex-1 py-2 rounded-lg text-xs font-semibold ${
                  s.language === l ? 'bg-[#00D4E8] text-[#080D14]' : 'qq-panel'
                }">${LANG_LABELS[l]}</button>`
            )
            .join('')}
        </div>
        <button data-cit-action="site-mode" class="w-full py-2.5 rounded-xl qq-panel text-xs font-semibold">${escapeHtml(t.officialSite)}</button>
      </div>
    `;
  }

  private bindEvents(): void {
    this.root.querySelectorAll<HTMLElement>('[data-cit-tab]').forEach((el) => {
      el.addEventListener('click', () => {
        store.setCitizenTab(el.dataset.citTab as CitizenTab);
      });
    });

    this.root.querySelectorAll<HTMLElement>('[data-cit-lang]').forEach((el) => {
      el.addEventListener('click', () => {
        store.setLanguage(el.dataset.citLang as Language);
      });
    });

    this.root.querySelectorAll<HTMLElement>('[data-cit-prompt]').forEach((el) => {
      el.addEventListener('click', () => {
        void store.askQalaBrain(el.dataset.citPrompt || '');
      });
    });

    const catEl = this.root.querySelector<HTMLSelectElement>('#qq-cit-cat');
    catEl?.addEventListener('change', () => {
      this.reportCategory = catEl.value as IncidentCategory;
    });

    const descEl = this.root.querySelector<HTMLTextAreaElement>('#qq-cit-desc');
    descEl?.addEventListener('input', () => {
      this.reportDescription = descEl.value;
    });

    const addrEl = this.root.querySelector<HTMLInputElement>('#qq-cit-addr');
    addrEl?.addEventListener('input', () => {
      this.reportAddress = addrEl.value;
    });

    const fileEl = this.root.querySelector<HTMLInputElement>('#qq-cit-file');
    fileEl?.addEventListener('change', () => {
      const f = fileEl.files?.[0];
      if (!f) return;
      const reader = new FileReader();
      reader.onload = () => {
        this.reportPhotoDataUrl = String(reader.result || '');
        this.render();
      };
      reader.readAsDataURL(f);
    });

    const brainForm = this.root.querySelector<HTMLFormElement>('#qq-cit-brain-form');
    const brainInp = this.root.querySelector<HTMLInputElement>('#qq-cit-brain-input');
    brainInp?.addEventListener('input', () => {
      this.brainInput = brainInp.value;
    });
    brainForm?.addEventListener('submit', (e) => {
      e.preventDefault();
      const q = this.brainInput.trim();
      if (!q) return;
      this.brainInput = '';
      void store.askQalaBrain(q);
    });

    this.root.querySelectorAll<HTMLElement>('[data-cit-action]').forEach((btn) => {
      btn.addEventListener('click', async () => {
        const act = btn.dataset.citAction;
        if (act === 'command-mode') store.setSurface('command');
        else if (act === 'site-mode') store.setSurface('website');
        else if (act === 'install-pwa') await triggerPWAInstall();
        else if (act === 'sync-drafts') await store.syncCitizenDrafts();
        else if (act === 'signin') store.setAuthModal(true);
        else if (act === 'signout') {
          const { signOutUser } = await import('../services/firebaseService.ts');
          await signOutUser();
        } else if (act === 'gps-locate' || act === 'report-gps') {
          navigator.geolocation?.getCurrentPosition(
            (pos) => {
              this.reportLat = pos.coords.latitude;
              this.reportLng = pos.coords.longitude;
              this.mapEngine?.flyTo(this.reportLat, this.reportLng, 15);
              this.render();
            },
            () => store.showToast('GPS permission denied or unavailable', 'warning')
          );
        } else if (act === 'voice') {
          const SpeechRec = window.SpeechRecognition || window.webkitSpeechRecognition;
          if (!SpeechRec) {
            store.showToast('Web Speech API unsupported in this browser', 'warning');
            return;
          }
          const rec = new SpeechRec();
          rec.lang = store.state.language === 'ru' ? 'ru-RU' : store.state.language === 'en' ? 'en-US' : 'kk-KZ';
          this.listeningVoice = true;
          this.render();
          rec.onresult = (ev) => {
            const txt = ev.results[0]?.[0]?.transcript || '';
            this.reportDescription = `${this.reportDescription} ${txt}`.trim();
          };
          rec.onend = () => {
            this.listeningVoice = false;
            this.render();
          };
          rec.start();
        } else if (act === 'ai-analyze' && this.reportPhotoDataUrl) {
          this.aiAnalyzing = true;
          this.render();
          try {
            const res = await analyzeWithQalaVision({
              mediaBase64: this.reportPhotoDataUrl,
              mimeType: 'image/jpeg',
              language: store.state.language,
              locationHint: this.reportAddress,
              sourceType: 'camera',
              userNotes: this.reportDescription,
            });
            if (res.hazardCategory !== 'none') this.reportCategory = res.hazardCategory;
            this.reportSeverity = res.severity;
            this.reportAiHint = `${res.title} (${Math.round(res.confidence * 100)}%): ${res.explanation}`;
            if (!this.reportDescription) this.reportDescription = res.explanation;
          } catch (err) {
            this.reportAiHint = err instanceof Error ? err.message : 'AI analysis error';
          } finally {
            this.aiAnalyzing = false;
            this.render();
          }
        } else if (act === 'submit-report') {
          const desc = this.reportDescription.trim() || I18N[store.state.language].categories[this.reportCategory];
          if (!navigator.onLine) {
            store.saveCitizenDraft({
              cityId: store.state.cityId,
              category: this.reportCategory,
              description: desc,
              lat: this.reportLat,
              lng: this.reportLng,
              address: this.reportAddress,
              photoDataUrl: this.reportPhotoDataUrl || undefined,
              aiCategoryHint: this.reportAiHint || undefined,
            });
            store.showToast(I18N[store.state.language].offlineBanner, 'warning');
          } else {
            await store.registerIncident({
              category: this.reportCategory,
              severity: this.reportSeverity,
              title: desc.slice(0, 90),
              description: desc,
              lat: this.reportLat,
              lng: this.reportLng,
              address: this.reportAddress,
              source: 'citizen',
              aiSummary: this.reportAiHint || undefined,
            });
            this.reportDescription = '';
            this.reportPhotoDataUrl = '';
            this.reportAiHint = '';
            store.setCitizenTab('home');
          }
        } else if (act === 'save-draft') {
          store.saveCitizenDraft({
            cityId: store.state.cityId,
            category: this.reportCategory,
            description: this.reportDescription.trim() || I18N[store.state.language].categories[this.reportCategory],
            lat: this.reportLat,
            lng: this.reportLng,
            address: this.reportAddress,
            photoDataUrl: this.reportPhotoDataUrl || undefined,
          });
          store.setCitizenTab('home');
        }
      });
    });
  }

  private async mountCitizenMap(): Promise<void> {
    const el = this.root.querySelector<HTMLElement>('#qq-citizen-map');
    if (!el) return;
    const s = store.state;
    if (!this.mapEngine) {
      this.mapEngine = new QalaMapEngine(el, {
        onIncidentClick: (inc) => store.showToast(`${inc.trackingNumber}: ${inc.title}`, 'info'),
        onMapCoordClick: (lat, lng) => {
          this.reportLat = lat;
          this.reportLng = lng;
          store.showToast(`Pinned: ${lat.toFixed(4)}, ${lng.toFixed(4)}`, 'info');
        },
      });
    }
    await this.mapEngine.render({
      city: store.getCity(),
      language: s.language,
      incidents: store.getVisibleIncidents(),
      satellite: false,
      showTraffic: s.mapTraffic,
      showHeatmap: s.mapHeatmap,
      showDistricts: s.mapDistricts,
      showEmergency: true,
      showAltRoute: false,
      provider: s.mapProvider,
      darkTheme: s.darkTheme,
      mapsApiKey: s.mapsApiKey,
    });
  }

  public dispose(): void {
    this.mapEngine?.dispose();
    this.mapEngine = null;
  }
}
