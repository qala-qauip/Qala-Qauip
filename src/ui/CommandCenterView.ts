import { CITIES, DEMO_SCENARIOS } from '../data/shymkentBaseline.ts';
import { I18N, LANG_LABELS } from '../i18n.ts';
import { QalaMapEngine } from '../map/QalaMapEngine.ts';
import {
  registerWithEmail,
  resetUserPassword,
  signInWithEmail,
  signInWithGoogle,
  signOutUser,
} from '../services/firebaseService.ts';
import { triggerPWAInstall } from '../services/pwaService.ts';
import { CityTwinEngine } from '../twin/CityTwinEngine.ts';
import type { CityId, CommandTab, Language } from '../types.ts';
import { escapeHtml, formatTimestamp, severityBadgeClass } from './helpers.ts';
import { lucideSvg, qalaLogoSvg, type IconName } from './icons.ts';
import { ModulePanels } from './ModulePanels.ts';
import { store } from './store.ts';

const NAV_ITEMS: { tab: CommandTab; icon: IconName }[] = [
  { tab: 'home', icon: 'home' },
  { tab: 'map', icon: 'map' },
  { tab: 'brain', icon: 'brain' },
  { tab: 'vision', icon: 'camera' },
  { tab: 'predict', icon: 'activity' },
  { tab: 'traffic', icon: 'route' },
  { tab: 'infrastructure', icon: 'wrench' },
  { tab: 'emergency', icon: 'siren' },
  { tab: 'citizen', icon: 'users' },
  { tab: 'eco', icon: 'leaf' },
  { tab: 'response', icon: 'clipboard' },
  { tab: 'twin', icon: 'box' },
  { tab: 'analytics', icon: 'analytics' },
  { tab: 'settings', icon: 'settings' },
];

export class CommandCenterView {
  private root: HTMLElement;
  private panels = new ModulePanels();
  private mapEngine: QalaMapEngine | null = null;
  private twinEngine: CityTwinEngine | null = null;
  private notifOpen = false;
  private authMode: 'login' | 'register' | 'reset' = 'login';

  constructor(root: HTMLElement) {
    this.root = root;
  }

  public render(): void {
    const s = store.state;
    const t = I18N[s.language];
    const isMapTab = s.activeTab === 'home' || s.activeTab === 'map';
    const isTwinTab = s.activeTab === 'twin';

    if (!isMapTab && this.mapEngine) {
      this.mapEngine.dispose();
      this.mapEngine = null;
    }
    if (!isTwinTab && this.twinEngine) {
      this.twinEngine.dispose();
      this.twinEngine = null;
    }
    if (s.activeTab !== 'analytics') {
      this.panels.destroyCharts();
    }
    if (s.activeTab !== 'vision') {
      this.panels.stopCamera();
    }

    const incidents = store.getVisibleIncidents();
    const unreadNotifs = s.notifications.filter((n) => !n.read).length;

    this.root.innerHTML = `
      <div class="h-screen w-screen flex flex-col overflow-hidden bg-[var(--qq-bg)] text-[var(--qq-text)]">
        <!-- Case A Google Maps Demo Key Quota Banner (sticky z-50) -->
        ${
          s.gmpQuotaExceeded
            ? `<div class="sticky top-0 z-50 px-4 py-2 bg-[#F59E0B] text-[#080D14] text-xs font-semibold flex flex-wrap items-center justify-between gap-2">
                <div class="flex items-center gap-2">
                  ${lucideSvg('alert', 'w-4 h-4 shrink-0')}
                  <span>${escapeHtml(t.mapsQuotaWarning)}</span>
                </div>
                <button data-cc-action="use-osm" class="px-2.5 py-1 rounded bg-[#080D14] text-[#F4F7FA] text-[11px] font-bold">
                  ${escapeHtml(t.switchToOsm)}
                </button>
              </div>`
            : ''
        }

        ${
          !s.isOnline
            ? `<div class="px-4 py-1.5 bg-[#F59E0B]/20 text-[#F59E0B] border-b border-[#F59E0B]/30 text-xs flex items-center gap-2">
                ${lucideSvg('wifiOff', 'w-3.5 h-3.5')}
                ${escapeHtml(t.offlineBanner)}
              </div>`
            : ''
        }

        <!-- Top Control Bar -->
        <header class="h-14 shrink-0 qq-surface border-b border-[var(--qq-border)] px-3 sm:px-4 flex items-center justify-between gap-2">
          <div class="flex items-center gap-2.5 min-w-0">
            <button data-cc-action="toggle-sidebar" class="p-1.5 rounded-lg qq-panel hover:border-[#00D4E8]/50">
              ${lucideSvg(s.sidebarCollapsed ? 'chevronRight' : 'menu', 'w-4 h-4')}
            </button>
            <div class="flex items-center gap-2">
              ${qalaLogoSvg(28)}
              <div class="hidden sm:block">
                <div class="font-display font-bold text-sm leading-none">${t.appName}</div>
                <div class="text-[10px] text-[#00D4E8] font-mono-tech">Smart City OS</div>
              </div>
            </div>

            <!-- City Selector -->
            <select id="qq-top-city" class="ml-1 px-2.5 py-1.5 rounded-lg qq-panel text-xs font-medium outline-none">
              ${CITIES.map(
                (c) => `<option value="${c.id}" ${s.cityId === c.id ? 'selected' : ''}>${escapeHtml(c.name[s.language])}</option>`
              ).join('')}
            </select>
          </div>

          <!-- Global Search -->
          <div class="hidden md:flex items-center flex-1 max-w-md relative">
            <span class="absolute left-3 text-[var(--qq-text-muted)]">${lucideSvg('search', 'w-3.5 h-3.5')}</span>
            <input id="qq-top-search" value="${escapeHtml(s.searchQuery)}" placeholder="${escapeHtml(t.searchPlaceholder)}" class="w-full pl-8 pr-3 py-1.5 rounded-lg qq-panel text-xs outline-none focus:border-[#00D4E8]" />
          </div>

          <!-- Right Actions -->
          <div class="flex items-center gap-1.5">
            <!-- Surface Switcher -->
            <button data-cc-surface="website" class="hidden lg:inline-flex px-2.5 py-1.5 rounded-lg qq-panel text-xs hover:border-[#00D4E8]/50">
              ${escapeHtml(t.officialSite)}
            </button>
            <button data-cc-surface="citizen" class="hidden lg:inline-flex px-2.5 py-1.5 rounded-lg qq-panel text-xs hover:border-[#00D4E8]/50">
              ${escapeHtml(t.citizenApp)}
            </button>
            <button data-cc-surface="xr" class="hidden xl:inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg bg-[#00D4E8]/15 text-[#00D4E8] border border-[#00D4E8]/35 text-xs font-semibold">
              ${lucideSvg('box', 'w-3.5 h-3.5')}XR
            </button>

            <!-- Demo Mode Trigger -->
            <button data-cc-action="toggle-demo" class="px-2.5 py-1.5 rounded-lg text-xs font-semibold flex items-center gap-1 ${
              s.demo.active
                ? 'bg-[#F59E0B] text-[#080D14]'
                : 'qq-panel text-[#00D4E8] hover:border-[#00D4E8]/50'
            }">
              ${lucideSvg(s.demo.active ? 'pause' : 'play', 'w-3.5 h-3.5')}
              <span class="hidden sm:inline">${s.demo.active ? 'DEMO' : 'Demo'}</span>
            </button>

            <!-- Language -->
            <div class="flex rounded-lg border border-[var(--qq-border)] overflow-hidden text-[11px] font-semibold">
              ${(['kk', 'ru', 'en'] as Language[])
                .map(
                  (l) => `<button data-cc-lang="${l}" class="px-2 py-1 ${
                    s.language === l ? 'bg-[#00D4E8] text-[#080D14]' : 'text-[var(--qq-text-muted)]'
                  }">${LANG_LABELS[l]}</button>`
                )
                .join('')}
            </div>

            ${
              s.canInstallPwa
                ? `<button data-cc-action="install-pwa" class="p-1.5 rounded-lg bg-[#00D4E8] text-[#080D14]" title="${escapeHtml(t.installPwa)}">${lucideSvg('download', 'w-4 h-4')}</button>`
                : ''
            }

            <button data-cc-action="theme" class="p-1.5 rounded-lg qq-panel hover:border-[#00D4E8]/50">
              ${lucideSvg(s.darkTheme ? 'sun' : 'moon', 'w-4 h-4')}
            </button>

            <!-- Notifications -->
            <div class="relative">
              <button data-cc-action="toggle-notif" class="p-1.5 rounded-lg qq-panel hover:border-[#00D4E8]/50 relative">
                ${lucideSvg('bell', 'w-4 h-4')}
                ${unreadNotifs > 0 ? `<span class="absolute -top-1 -right-1 w-4 h-4 rounded-full bg-[#EF4444] text-white text-[9px] flex items-center justify-center font-bold">${unreadNotifs}</span>` : ''}
              </button>
              ${
                this.notifOpen
                  ? `<div class="absolute right-0 mt-2 w-72 qq-surface rounded-xl p-3 shadow-2xl z-50 space-y-2">
                      <div class="text-xs font-bold flex justify-between">
                        <span>Notifications</span>
                        <span class="text-[var(--qq-text-muted)]">${s.notifications.length}</span>
                      </div>
                      ${
                        s.notifications.length === 0
                          ? `<div class="text-xs text-[var(--qq-text-muted)] py-3">No new alerts.</div>`
                          : s.notifications
                              .slice(0, 6)
                              .map(
                                (n) => `<div class="qq-panel rounded-lg p-2 text-xs"><div class="font-semibold">${escapeHtml(n.title)}</div><div class="text-[var(--qq-text-muted)]">${escapeHtml(n.body)}</div></div>`
                              )
                              .join('')
                      }
                    </div>`
                  : ''
              }
            </div>

            <!-- Auth -->
            ${
              s.user
                ? `<button data-cc-action="signout" class="px-2.5 py-1.5 rounded-lg qq-panel text-xs flex items-center gap-1.5" title="${escapeHtml(s.user.email)}">
                    <span class="w-2 h-2 rounded-full bg-[#22C55E]"></span>
                    <span class="hidden xl:inline max-w-[90px] truncate">${escapeHtml(s.user.displayName)}</span>
                    ${lucideSvg('logout', 'w-3.5 h-3.5')}
                  </button>`
                : `<button data-cc-action="open-auth" class="px-2.5 py-1.5 rounded-lg bg-[#00D4E8] text-[#080D14] text-xs font-bold flex items-center gap-1">
                    ${lucideSvg('login', 'w-3.5 h-3.5')}
                    <span class="hidden sm:inline">${escapeHtml(t.signInGoogle)}</span>
                  </button>`
            }
          </div>
        </header>

        <!-- Interactive Demo Mode Bar -->
        ${
          s.demo.active
            ? this.renderDemoControlBar()
            : ''
        }

        <!-- 3-Column Command Shell -->
        <div class="flex-1 flex min-h-0 overflow-hidden">
          <!-- Left Collapsible Sidebar -->
          ${
            !s.fullscreenMap
              ? `<aside class="${
                  s.sidebarCollapsed ? 'w-14' : 'w-56'
                } shrink-0 qq-surface border-r border-[var(--qq-border)] flex flex-col justify-between transition-all duration-200 overflow-y-auto qq-scrollbar">
                  <nav class="p-2 space-y-1">
                    ${NAV_ITEMS.map(
                      (item) => `
                      <button data-cc-tab="${item.tab}" title="${escapeHtml(t.tabs[item.tab])}" class="w-full flex items-center gap-2.5 px-2.5 py-2 rounded-xl text-xs font-medium transition ${
                        s.activeTab === item.tab
                          ? 'bg-[#00D4E8]/15 text-[#00D4E8] border border-[#00D4E8]/35'
                          : 'text-[var(--qq-text-muted)] hover:text-[var(--qq-text)] hover:bg-white/5'
                      }">
                        ${lucideSvg(item.icon, 'w-4 h-4 shrink-0')}
                        ${!s.sidebarCollapsed ? `<span class="truncate">${escapeHtml(t.tabs[item.tab])}</span>` : ''}
                      </button>
                    `
                    ).join('')}
                  </nav>

                  ${
                    !s.sidebarCollapsed
                      ? `<div class="p-3 m-2 rounded-xl qq-panel text-[11px] space-y-1">
                          <div class="font-semibold text-[#00D4E8]">${escapeHtml(store.getCity().name[s.language])}</div>
                          <div class="text-[var(--qq-text-muted)]">${escapeHtml(t.expansionBadge)}</div>
                        </div>`
                      : ''
                  }
                </aside>`
              : ''
          }

          <!-- Center Workspace -->
          <main id="qq-center-workspace" class="flex-1 min-w-0 p-3 sm:p-4 overflow-y-auto qq-scrollbar">
            ${this.panels.renderTab(s.activeTab)}
          </main>

          <!-- Right Live Operations Panel -->
          ${
            !s.fullscreenMap
              ? `<aside class="hidden xl:flex w-80 shrink-0 qq-surface border-l border-[var(--qq-border)] flex-col min-h-0">
                  <!-- Quick Actions -->
                  <div class="p-3 border-b border-[var(--qq-border)] space-y-2">
                    <div class="text-[11px] font-semibold uppercase tracking-wider text-[var(--qq-text-muted)]">${escapeHtml(t.quickActions)}</div>
                    <div class="grid grid-cols-3 gap-1.5 text-[11px]">
                      <button data-cc-tab="vision" class="py-2 px-2 rounded-lg qq-panel hover:border-[#00D4E8]/50 flex flex-col items-center gap-1">
                        ${lucideSvg('camera', 'w-3.5 h-3.5 text-[#00D4E8]')}
                        <span class="truncate max-w-full">${escapeHtml(t.runScan)}</span>
                      </button>
                      <button data-cc-tab="brain" class="py-2 px-2 rounded-lg qq-panel hover:border-[#00D4E8]/50 flex flex-col items-center gap-1">
                        ${lucideSvg('brain', 'w-3.5 h-3.5 text-[#00D4E8]')}
                        <span class="truncate max-w-full">Qala Brain</span>
                      </button>
                      <button data-cc-action="start-demo-quick" class="py-2 px-2 rounded-lg qq-panel hover:border-[#00D4E8]/50 flex flex-col items-center gap-1">
                        ${lucideSvg('play', 'w-3.5 h-3.5 text-[#F59E0B]')}
                        <span class="truncate max-w-full">Demo</span>
                      </button>
                    </div>
                  </div>

                  <!-- Live Incident Feed -->
                  <div class="flex-1 overflow-y-auto qq-scrollbar p-3 space-y-2">
                    <div class="flex items-center justify-between text-[11px] font-semibold uppercase tracking-wider text-[var(--qq-text-muted)]">
                      <span>${escapeHtml(t.activeIncidents)}</span>
                      <span class="font-mono-tech text-[#00D4E8]">${incidents.length}</span>
                    </div>
                    ${
                      incidents.length === 0
                        ? `<div class="qq-panel rounded-xl p-4 text-xs text-[var(--qq-text-muted)] space-y-2">
                            <p>${escapeHtml(t.noFakeDataNotice)}</p>
                            <p class="text-[11px]">${escapeHtml(t.guestOperatorNote)}</p>
                          </div>`
                        : incidents
                            .slice(0, 15)
                            .map(
                              (i) => `
                          <button data-feed-inc="${i.id}" class="w-full text-left qq-panel rounded-xl p-2.5 transition ${
                            s.selectedIncidentId === i.id ? 'border-[#00D4E8]' : 'hover:border-[#00D4E8]/40'
                          }">
                            <div class="flex items-center justify-between gap-1 text-[10px]">
                              <span class="font-mono-tech text-[#00D4E8]">${escapeHtml(i.trackingNumber)} ${i.isDemo ? '· DEMO' : ''}</span>
                              <span class="px-1.5 py-0.5 rounded-full border ${severityBadgeClass(i.severity)}">${escapeHtml(t.severities[i.severity])}</span>
                            </div>
                            <div class="font-semibold text-xs mt-1 line-clamp-2">${escapeHtml(i.title)}</div>
                            <div class="text-[10px] text-[var(--qq-text-muted)] mt-1 flex justify-between">
                              <span>${escapeHtml(t.statuses[i.status])}</span>
                              <span>${formatTimestamp(i.createdAt, s.language)}</span>
                            </div>
                          </button>
                        `
                            )
                            .join('')
                    }
                  </div>

                  <!-- Qala Brain Mini Panel -->
                  <div class="p-3 border-t border-[var(--qq-border)] space-y-2">
                    <div class="text-[11px] font-semibold flex items-center gap-1.5 text-[#00D4E8]">
                      ${lucideSvg('sparkles', 'w-3.5 h-3.5')}
                      Qala Brain
                    </div>
                    <button data-quick-brain="${escapeHtml(t.brainPrompts[0])}" class="w-full text-left text-[11px] px-2.5 py-2 rounded-lg qq-panel hover:border-[#00D4E8]/50 truncate">
                      ${escapeHtml(t.brainPrompts[0])}
                    </button>
                  </div>
                </aside>`
              : ''
          }
        </div>
      </div>

      ${s.authModalOpen ? this.renderAuthModal() : ''}
    `;

    this.bindEvents();
    this.mountActiveEngines();
  }

  private renderDemoControlBar(): string {
    const s = store.state;
    const t = I18N[s.language];
    const scenario = DEMO_SCENARIOS[s.demo.scenarioIndex];
    const step = scenario.steps[s.demo.stepIndex];

    return `
      <div class="shrink-0 px-3 sm:px-4 py-2 bg-[#F59E0B]/12 border-b border-[#F59E0B]/35 flex flex-wrap items-center justify-between gap-2 text-xs">
        <div class="flex flex-wrap items-center gap-2">
          <span class="px-2 py-0.5 rounded bg-[#F59E0B] text-[#080D14] font-mono-tech font-bold text-[10px]">${escapeHtml(t.demoModeBadge)}</span>
          <span class="font-semibold">${escapeHtml(scenario.title[s.language])}</span>
          <span class="text-[var(--qq-text-muted)]">· Step ${s.demo.stepIndex + 1}/${scenario.steps.length}: <strong class="text-[#00D4E8]">${escapeHtml(step.label[s.language])}</strong></span>
        </div>

        <div class="flex flex-wrap items-center gap-1.5">
          <select id="qq-demo-scenario" class="px-2 py-1 rounded qq-panel text-xs outline-none">
            ${DEMO_SCENARIOS.map(
              (sc, idx) => `<option value="${idx}" ${idx === s.demo.scenarioIndex ? 'selected' : ''}>${idx + 1}. ${escapeHtml(sc.title[s.language])}</option>`
            ).join('')}
          </select>

          <button data-demo-act="playpause" class="px-2.5 py-1 rounded bg-[#00D4E8] text-[#080D14] font-bold flex items-center gap-1">
            ${lucideSvg(s.demo.paused || !s.demo.playing ? 'play' : 'pause', 'w-3.5 h-3.5')}
            ${escapeHtml(s.demo.paused ? t.resume : s.demo.playing ? t.pause : t.play)}
          </button>

          <button data-demo-act="restart" class="px-2 py-1 rounded qq-panel" title="${escapeHtml(t.restart)}">${lucideSvg('reset', 'w-3.5 h-3.5')}</button>

          <button data-demo-act="speed" class="px-2 py-1 rounded qq-panel font-mono-tech">${s.demo.speed}x</button>

          <button data-demo-act="loop" class="px-2 py-1 rounded ${s.demo.loop ? 'bg-[#00D4E8]/20 text-[#00D4E8]' : 'qq-panel'}">${escapeHtml(t.loop)}</button>

          <button data-demo-act="exit" class="px-2 py-1 rounded bg-[#EF4444]/20 text-[#EF4444] font-semibold">${lucideSvg('x', 'w-3.5 h-3.5')}</button>
        </div>
      </div>
    `;
  }

  private renderAuthModal(): string {
    const s = store.state;
    const t = I18N[s.language];

    return `
      <div class="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm flex items-center justify-center p-4">
        <div class="qq-surface rounded-2xl max-w-md w-full p-6 space-y-4 shadow-2xl">
          <div class="flex items-center justify-between">
            <div class="flex items-center gap-2">
              ${qalaLogoSvg(28)}
              <h3 class="font-display font-bold text-lg">${t.appName} Account</h3>
            </div>
            <button data-cc-action="close-auth" class="p-1 rounded-lg qq-panel">${lucideSvg('x', 'w-4 h-4')}</button>
          </div>

          <button data-cc-action="google-signin" class="w-full py-2.5 px-4 rounded-xl bg-[#00D4E8] text-[#080D14] font-bold text-sm flex items-center justify-center gap-2">
            ${lucideSvg('login', 'w-4 h-4')}
            ${escapeHtml(t.signInGoogle)}
          </button>

          <div class="text-center text-xs text-[var(--qq-text-muted)]">— ${escapeHtml(t.signInEmail)} —</div>

          <div class="flex gap-1 text-xs">
            <button data-auth-tab="login" class="flex-1 py-1.5 rounded-lg ${this.authMode === 'login' ? 'bg-[#00D4E8]/20 text-[#00D4E8]' : 'qq-panel'}">Sign In</button>
            <button data-auth-tab="register" class="flex-1 py-1.5 rounded-lg ${this.authMode === 'register' ? 'bg-[#00D4E8]/20 text-[#00D4E8]' : 'qq-panel'}">Register</button>
            <button data-auth-tab="reset" class="flex-1 py-1.5 rounded-lg ${this.authMode === 'reset' ? 'bg-[#00D4E8]/20 text-[#00D4E8]' : 'qq-panel'}">Reset</button>
          </div>

          <form id="qq-auth-email-form" class="space-y-3">
            ${
              this.authMode === 'register'
                ? `<input name="displayName" required placeholder="Full Name" class="w-full px-3 py-2 rounded-lg qq-panel text-sm outline-none" />`
                : ''
            }
            <input name="email" type="email" required placeholder="Email" class="w-full px-3 py-2 rounded-lg qq-panel text-sm outline-none" />
            ${
              this.authMode !== 'reset'
                ? `<input name="password" type="password" required minlength="6" placeholder="Password" class="w-full px-3 py-2 rounded-lg qq-panel text-sm outline-none" />`
                : ''
            }
            ${
              s.authError
                ? `<div class="text-xs p-2.5 rounded-lg bg-[#EF4444]/15 text-[#EF4444]">${escapeHtml(s.authError)}</div>`
                : ''
            }
            <button type="submit" class="w-full py-2.5 rounded-xl qq-panel border-[#00D4E8]/50 font-semibold text-sm hover:bg-[#00D4E8]/10">
              ${this.authMode === 'login' ? 'Sign In' : this.authMode === 'register' ? 'Create Account' : 'Send Reset Link'}
            </button>
          </form>
        </div>
      </div>
    `;
  }

  private bindEvents(): void {
    this.root.querySelectorAll<HTMLElement>('[data-cc-tab]').forEach((btn) => {
      btn.addEventListener('click', () => {
        store.setActiveTab(btn.dataset.ccTab as CommandTab);
      });
    });

    this.root.querySelectorAll<HTMLElement>('[data-cc-surface]').forEach((btn) => {
      btn.addEventListener('click', () => {
        const surf = btn.dataset.ccSurface as 'command' | 'website' | 'citizen' | 'xr';
        if (surf) store.setSurface(surf);
      });
    });

    this.root.querySelectorAll<HTMLElement>('[data-cc-lang]').forEach((btn) => {
      btn.addEventListener('click', () => {
        store.setLanguage(btn.dataset.ccLang as Language);
      });
    });

    this.root.querySelector<HTMLSelectElement>('#qq-top-city')?.addEventListener('change', (e) => {
      store.setCity((e.target as HTMLSelectElement).value as CityId);
    });

    const searchEl = this.root.querySelector<HTMLInputElement>('#qq-top-search');
    searchEl?.addEventListener('input', () => {
      store.setSearchQuery(searchEl.value);
    });

    this.root.querySelectorAll<HTMLElement>('[data-feed-inc]').forEach((btn) => {
      btn.addEventListener('click', () => {
        const id = btn.dataset.feedInc || null;
        store.selectIncident(id);
        const inc = store.getSelectedIncident();
        if (inc && this.mapEngine) {
          this.mapEngine.flyTo(inc.lat, inc.lng, 15);
        }
      });
    });

    this.root.querySelectorAll<HTMLElement>('[data-quick-brain]').forEach((btn) => {
      btn.addEventListener('click', () => {
        const prompt = btn.dataset.quickBrain || '';
        store.setActiveTab('brain');
        void store.askQalaBrain(prompt);
      });
    });

    // Demo controls
    this.root.querySelector<HTMLSelectElement>('#qq-demo-scenario')?.addEventListener('change', (e) => {
      store.jumpToDemoScenario(Number((e.target as HTMLSelectElement).value));
    });
    this.root.querySelectorAll<HTMLElement>('[data-demo-act]').forEach((btn) => {
      btn.addEventListener('click', () => {
        const act = btn.dataset.demoAct;
        if (act === 'playpause') {
          if (store.state.demo.paused || !store.state.demo.playing) store.resumeDemo();
          else store.pauseDemo();
        } else if (act === 'restart') store.startDemo(store.state.demo.scenarioIndex);
        else if (act === 'speed') {
          const next = store.state.demo.speed === 1 ? 2 : store.state.demo.speed === 2 ? 4 : 1;
          store.setDemoSpeed(next);
        } else if (act === 'loop') store.toggleDemoLoop();
        else if (act === 'exit') store.stopDemo();
      });
    });

    // Auth modal tabs & submit
    this.root.querySelectorAll<HTMLElement>('[data-auth-tab]').forEach((btn) => {
      btn.addEventListener('click', () => {
        this.authMode = btn.dataset.authTab as 'login' | 'register' | 'reset';
        this.render();
      });
    });

    const authForm = this.root.querySelector<HTMLFormElement>('#qq-auth-email-form');
    authForm?.addEventListener('submit', async (e) => {
      e.preventDefault();
      const fd = new FormData(authForm);
      const email = String(fd.get('email') || '');
      const password = String(fd.get('password') || '');
      const displayName = String(fd.get('displayName') || '');
      store.state.authError = null;
      try {
        if (this.authMode === 'login') {
          await signInWithEmail(email, password);
        } else if (this.authMode === 'register') {
          await registerWithEmail(email, password, displayName);
          store.showToast('Verification email sent. Please verify your inbox.', 'info');
        } else {
          await resetUserPassword(email);
          store.showToast('Password reset email sent.', 'success');
        }
      } catch (err) {
        store.state.authError = err instanceof Error ? err.message : 'Authentication failed';
        this.render();
      }
    });

    this.root.querySelectorAll<HTMLElement>('[data-cc-action]').forEach((btn) => {
      btn.addEventListener('click', async () => {
        const act = btn.dataset.ccAction;
        if (act === 'toggle-sidebar') store.toggleSidebar();
        else if (act === 'theme') store.toggleTheme();
        else if (act === 'install-pwa') await triggerPWAInstall();
        else if (act === 'use-osm') {
          store.setMapProvider('osm');
        } else if (act === 'toggle-demo' || act === 'start-demo-quick') {
          if (store.state.demo.active && act === 'toggle-demo') store.stopDemo();
          else {
            store.setActiveTab('map');
            store.startDemo(0);
          }
        } else if (act === 'toggle-notif') {
          this.notifOpen = !this.notifOpen;
          this.render();
        } else if (act === 'open-auth') store.setAuthModal(true);
        else if (act === 'close-auth') store.setAuthModal(false);
        else if (act === 'google-signin') {
          try {
            await signInWithGoogle();
          } catch (err) {
            store.state.authError = err instanceof Error ? err.message : 'Google Sign-In failed';
            this.render();
          }
        } else if (act === 'signout') {
          await signOutUser();
        }
      });
    });

    const workspace = this.root.querySelector<HTMLElement>('#qq-center-workspace');
    if (workspace) {
      this.panels.bindPanelEvents(
        workspace,
        () => {
          navigator.geolocation?.getCurrentPosition(
            (pos) => this.mapEngine?.flyTo(pos.coords.latitude, pos.coords.longitude, 15),
            () => store.showToast('GPS permission denied or unavailable', 'warning')
          );
        },
        () => this.render()
      );
    }
  }

  private mountActiveEngines(): void {
    const s = store.state;
    if (s.activeTab === 'home' || s.activeTab === 'map') {
      const mapEl = this.root.querySelector<HTMLElement>('#qq-main-map');
      if (mapEl) {
        this.mapEngine?.dispose();
        this.mapEngine = new QalaMapEngine(mapEl, {
          onIncidentClick: (inc) => {
            store.selectIncident(inc.id);
            store.showToast(`${inc.trackingNumber}: ${inc.title}`, 'info');
          },
          onProviderFallback: (msg) => store.showToast(msg, 'warning'),
        });
        void this.mapEngine.render({
          city: store.getCity(),
          language: s.language,
          incidents: store.getVisibleIncidents(),
          satellite: s.mapSatellite,
          showTraffic: s.mapTraffic,
          showHeatmap: s.mapHeatmap,
          showDistricts: s.mapDistricts,
          showEmergency: s.mapEmergency,
          showAltRoute: s.mapAltRoute,
          provider: s.mapProvider,
          darkTheme: s.darkTheme,
          mapsApiKey: s.mapsApiKey,
        });
      }
    } else if (s.activeTab === 'twin') {
      const twinEl = this.root.querySelector<HTMLElement>('#qq-twin-canvas');
      if (twinEl) {
        this.twinEngine?.dispose();
        this.twinEngine = new CityTwinEngine(twinEl, (id) => {
          store.selectIncident(id);
          store.setActiveTab('response');
        });
        this.twinEngine.syncIncidents(store.getVisibleIncidents());
        this.twinEngine.setSimulationMode(s.twinSimMode);
      }
    } else if (s.activeTab === 'analytics') {
      this.panels.mountCharts();
    }
  }

  public dispose(): void {
    this.mapEngine?.dispose();
    this.mapEngine = null;
    this.twinEngine?.dispose();
    this.twinEngine = null;
    this.panels.destroyCharts();
    this.panels.stopCamera();
  }
}
