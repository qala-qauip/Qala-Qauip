import { I18N, LANG_LABELS } from '../i18n.ts';
import { createPartnershipRequestRecord } from '../services/firebaseService.ts';
import type { CommandTab, Language } from '../types.ts';
import { escapeHtml } from './helpers.ts';
import { lucideSvg, qalaLogoSvg, type IconName } from './icons.ts';
import { store } from './store.ts';

const SITE_MODULES: { tab: CommandTab; icon: IconName }[] = [
  { tab: 'brain', icon: 'brain' },
  { tab: 'vision', icon: 'camera' },
  { tab: 'map', icon: 'map' },
  { tab: 'predict', icon: 'activity' },
  { tab: 'traffic', icon: 'route' },
  { tab: 'infrastructure', icon: 'wrench' },
  { tab: 'emergency', icon: 'siren' },
  { tab: 'citizen', icon: 'users' },
  { tab: 'eco', icon: 'leaf' },
  { tab: 'response', icon: 'clipboard' },
  { tab: 'twin', icon: 'box' },
  { tab: 'analytics', icon: 'analytics' },
];

export class OfficialSiteView {
  private root: HTMLElement;
  private rafId: number | null = null;
  private partnerStatus: { text: string; ok: boolean } | null = null;

  constructor(root: HTMLElement) {
    this.root = root;
  }

  public mount(): void {
    this.render();
  }

  public render(): void {
    const s = store.state;
    const t = I18N[s.language];

    this.root.innerHTML = `
      <div class="min-h-screen bg-[var(--qq-bg)] text-[var(--qq-text)] overflow-y-auto qq-scrollbar">
        <!-- Sticky GovTech Header -->
        <header class="sticky top-0 z-40 backdrop-blur-md qq-glass border-b border-[var(--qq-border)]">
          <div class="max-w-7xl mx-auto px-4 sm:px-6 h-16 flex items-center justify-between gap-3">
            <div class="flex items-center gap-3">
              ${qalaLogoSvg(34)}
              <div>
                <div class="font-display font-bold tracking-tight text-lg leading-none">${t.appName}</div>
                <div class="text-[11px] text-[var(--qq-text-muted)] hidden sm:block">${escapeHtml(t.pilotCity)}: ${escapeHtml(store.getCity().name[s.language])}</div>
              </div>
            </div>

            <div class="flex items-center gap-2 flex-wrap justify-end">
              <div class="flex rounded-lg border border-[var(--qq-border)] overflow-hidden text-xs font-semibold">
                ${(['kk', 'ru', 'en'] as Language[])
                  .map(
                    (l) => `
                  <button data-site-lang="${l}" class="px-2.5 py-1.5 transition ${
                    s.language === l
                      ? 'bg-[#00D4E8] text-[#080D14]'
                      : 'hover:bg-white/5 text-[var(--qq-text-muted)]'
                  }">${LANG_LABELS[l]}</button>
                `
                  )
                  .join('')}
              </div>

              <button data-site-action="theme" class="p-2 rounded-lg qq-surface hover:border-[#00D4E8]/50 transition" title="Theme">
                ${lucideSvg(s.darkTheme ? 'sun' : 'moon', 'w-4 h-4')}
              </button>

              <button data-site-action="citizen" class="hidden md:inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium qq-surface hover:border-[#00D4E8]/50 transition">
                ${lucideSvg('users', 'w-3.5 h-3.5 text-[#00D4E8]')}
                ${escapeHtml(t.citizenApp)}
              </button>

              <button data-site-action="open-platform" class="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-lg text-xs font-semibold bg-[#00D4E8] text-[#080D14] hover:opacity-90 transition">
                ${lucideSvg('shield', 'w-3.5 h-3.5')}
                ${escapeHtml(t.openPlatform)}
              </button>
            </div>
          </div>
        </header>

        <!-- Dynamic Hero Section -->
        <section class="relative overflow-hidden border-b border-[var(--qq-border)]">
          <canvas id="qq-site-hero-canvas" class="absolute inset-0 w-full h-full pointer-events-none opacity-65"></canvas>
          <div class="relative z-10 max-w-7xl mx-auto px-4 sm:px-6 py-16 lg:py-24 grid lg:grid-cols-12 gap-10 items-center">
            <div class="lg:col-span-7 space-y-6">
              <div class="inline-flex items-center gap-2 px-3 py-1.5 rounded-full text-xs font-medium bg-[#00D4E8]/10 text-[#00D4E8] border border-[#00D4E8]/30">
                <span class="w-2 h-2 rounded-full bg-[#22C55E] animate-pulse"></span>
                ${escapeHtml(t.pilotCity)}: ${escapeHtml(store.getCity().name[s.language])} · ${escapeHtml(t.expansionBadge)}
              </div>

              <h1 class="font-display text-3xl sm:text-5xl font-bold tracking-tight leading-[1.12]">
                ${escapeHtml(t.heroTitle)}
              </h1>

              <p class="text-base sm:text-lg text-[#00D4E8] font-medium">
                ${escapeHtml(t.slogan)}
              </p>

              <p class="text-sm sm:text-base text-[var(--qq-text-muted)] max-w-2xl leading-relaxed">
                ${escapeHtml(t.heroSubtitle)}
              </p>

              <div class="flex flex-wrap gap-3 pt-2">
                <button data-site-action="open-platform" class="inline-flex items-center gap-2 px-5 py-3 rounded-xl font-semibold text-sm bg-[#00D4E8] text-[#080D14] hover:opacity-90 transition shadow-lg shadow-[#00D4E8]/20">
                  ${lucideSvg('activity', 'w-4 h-4')}
                  ${escapeHtml(t.openPlatform)}
                </button>
                <button data-site-action="watch-demo" class="inline-flex items-center gap-2 px-5 py-3 rounded-xl font-semibold text-sm qq-surface hover:border-[#00D4E8]/60 transition">
                  ${lucideSvg('play', 'w-4 h-4 text-[#00D4E8]')}
                  ${escapeHtml(t.watchDemo)}
                </button>
                <a href="#partnership" class="inline-flex items-center gap-2 px-5 py-3 rounded-xl font-semibold text-sm border border-[var(--qq-border)] hover:border-[#00D4E8]/60 transition">
                  ${lucideSvg('building', 'w-4 h-4')}
                  ${escapeHtml(t.applyPartnership)}
                </a>
              </div>
            </div>

            <div class="lg:col-span-5">
              <div class="qq-surface rounded-2xl p-5 space-y-4 shadow-2xl">
                <div class="flex items-center justify-between border-b border-[var(--qq-border)] pb-3">
                  <div class="flex items-center gap-2 text-xs font-mono-tech text-[#00D4E8]">
                    ${lucideSvg('shield', 'w-4 h-4')}
                    SHYMKENT URBAN OS · LIVE TELEMETRY
                  </div>
                  <span class="text-[11px] px-2 py-0.5 rounded bg-[#22C55E]/15 text-[#22C55E] font-medium">${escapeHtml(t.systemOnline)}</span>
                </div>

                <div class="grid grid-cols-2 gap-3">
                  <div class="qq-panel rounded-xl p-3">
                    <div class="text-[11px] text-[var(--qq-text-muted)]">${escapeHtml(t.tabs.eco)}</div>
                    <div class="font-mono-tech text-xl font-bold mt-1">
                      ${s.weather.available && s.weather.current ? `${s.weather.current.temperature_2m.toFixed(1)}°C` : '—'}
                    </div>
                    <div class="text-[11px] text-[var(--qq-text-muted)] mt-0.5">Open-Meteo Live</div>
                  </div>
                  <div class="qq-panel rounded-xl p-3">
                    <div class="text-[11px] text-[var(--qq-text-muted)]">EU AQI</div>
                    <div class="font-mono-tech text-xl font-bold mt-1">
                      ${s.eco.available && s.eco.current ? s.eco.current.european_aqi : '—'}
                    </div>
                    <div class="text-[11px] text-[var(--qq-text-muted)] mt-0.5">Open-Meteo Air</div>
                  </div>
                  <div class="qq-panel rounded-xl p-3">
                    <div class="text-[11px] text-[var(--qq-text-muted)]">${escapeHtml(t.activeIncidents)}</div>
                    <div class="font-mono-tech text-xl font-bold mt-1">${s.liveIncidents.length}</div>
                    <div class="text-[11px] text-[var(--qq-text-muted)] mt-0.5">Firestore Verified</div>
                  </div>
                  <div class="qq-panel rounded-xl p-3">
                    <div class="text-[11px] text-[var(--qq-text-muted)]">5 Districts</div>
                    <div class="font-mono-tech text-xl font-bold mt-1">100%</div>
                    <div class="text-[11px] text-[var(--qq-text-muted)] mt-0.5">Abay · Turan · Karatau</div>
                  </div>
                </div>

                <div class="text-[11px] text-[var(--qq-text-muted)] flex items-center gap-2 pt-1">
                  ${lucideSvg('check', 'w-3.5 h-3.5 text-[#22C55E] shrink-0')}
                  ${escapeHtml(t.noFakeDataNotice)}
                </div>
              </div>
            </div>
          </div>
        </section>

        <!-- Mission & Problems / Solutions -->
        <section class="max-w-7xl mx-auto px-4 sm:px-6 py-14 space-y-12">
          <div class="qq-surface rounded-2xl p-6 sm:p-8 flex flex-col md:flex-row md:items-center justify-between gap-6">
            <div class="space-y-2 max-w-3xl">
              <div class="text-xs font-mono-tech uppercase tracking-wider text-[#00D4E8]">${escapeHtml(t.site.missionTitle)}</div>
              <p class="text-lg sm:text-xl font-medium leading-relaxed">${escapeHtml(t.site.missionBody)}</p>
            </div>
            <button data-site-action="xr-mode" class="shrink-0 inline-flex items-center gap-2 px-4 py-2.5 rounded-xl qq-panel hover:border-[#00D4E8]/60 text-xs font-semibold transition">
              ${lucideSvg('box', 'w-4 h-4 text-[#00D4E8]')}
              ${escapeHtml(t.xrSpatial)}
            </button>
          </div>

          <div class="grid md:grid-cols-2 gap-6">
            <div class="qq-surface rounded-2xl p-6 space-y-4">
              <h2 class="font-display text-xl font-bold flex items-center gap-2">
                ${lucideSvg('alert', 'w-5 h-5 text-[#F59E0B]')}
                ${escapeHtml(t.site.problemsTitle)}
              </h2>
              <div class="space-y-3">
                ${t.site.problems
                  .map(
                    (p) => `
                  <div class="qq-panel rounded-xl p-4">
                    <div class="font-semibold text-sm">${escapeHtml(p.title)}</div>
                    <div class="text-xs text-[var(--qq-text-muted)] mt-1">${escapeHtml(p.desc)}</div>
                  </div>
                `
                  )
                  .join('')}
              </div>
            </div>

            <div class="qq-surface rounded-2xl p-6 space-y-4">
              <h2 class="font-display text-xl font-bold flex items-center gap-2">
                ${lucideSvg('shield', 'w-5 h-5 text-[#00D4E8]')}
                ${escapeHtml(t.site.solutionsTitle)}
              </h2>
              <div class="space-y-3">
                ${t.site.solutions
                  .map(
                    (sol) => `
                  <div class="qq-panel rounded-xl p-4 border-l-2 border-l-[#00D4E8]">
                    <div class="font-semibold text-sm">${escapeHtml(sol.title)}</div>
                    <div class="text-xs text-[var(--qq-text-muted)] mt-1">${escapeHtml(sol.desc)}</div>
                  </div>
                `
                  )
                  .join('')}
              </div>
            </div>
          </div>

          <!-- 12 Core Modules Grid -->
          <div class="space-y-5">
            <h2 class="font-display text-2xl font-bold">${escapeHtml(t.site.modulesTitle)}</h2>
            <div class="grid sm:grid-cols-2 lg:grid-cols-4 gap-4">
              ${SITE_MODULES.map(
                (m) => `
                <button data-site-module="${m.tab}" class="text-left qq-surface rounded-xl p-4 hover:border-[#00D4E8]/60 transition group">
                  <div class="flex items-center justify-between">
                    <span class="p-2 rounded-lg bg-[#00D4E8]/10 text-[#00D4E8]">${lucideSvg(m.icon, 'w-4 h-4')}</span>
                    <span class="text-[var(--qq-text-muted)] group-hover:text-[#00D4E8] transition">${lucideSvg('chevronRight', 'w-4 h-4')}</span>
                  </div>
                  <div class="font-semibold text-sm mt-3">${escapeHtml(t.tabs[m.tab])}</div>
                </button>
              `
              ).join('')}
            </div>
          </div>

          <!-- Akimat & Citizen Benefits -->
          <div class="grid md:grid-cols-2 gap-6">
            <div class="qq-surface rounded-2xl p-6 space-y-3">
              <h3 class="font-display text-lg font-bold text-[#00D4E8]">${escapeHtml(t.site.akimatTitle)}</h3>
              <ul class="space-y-2.5 text-sm">
                ${t.site.akimatPoints
                  .map(
                    (pt) => `
                  <li class="flex items-start gap-2.5">
                    ${lucideSvg('check', 'w-4 h-4 text-[#22C55E] mt-0.5 shrink-0')}
                    <span>${escapeHtml(pt)}</span>
                  </li>
                `
                  )
                  .join('')}
              </ul>
            </div>

            <div class="qq-surface rounded-2xl p-6 space-y-3">
              <h3 class="font-display text-lg font-bold text-[#00D4E8]">${escapeHtml(t.site.citizenTitle)}</h3>
              <ul class="space-y-2.5 text-sm">
                ${t.site.citizenPoints
                  .map(
                    (pt) => `
                  <li class="flex items-start gap-2.5">
                    ${lucideSvg('check', 'w-4 h-4 text-[#00D4E8] mt-0.5 shrink-0')}
                    <span>${escapeHtml(pt)}</span>
                  </li>
                `
                  )
                  .join('')}
              </ul>
            </div>
          </div>

          <!-- Pilot City & Partnership Form -->
          <div id="partnership" class="grid lg:grid-cols-12 gap-6 items-start">
            <div class="lg:col-span-5 qq-surface rounded-2xl p-6 space-y-4">
              <div class="text-xs font-mono-tech text-[#00D4E8] uppercase">SHYMKENT · ASTANA · ALMATY</div>
              <h2 class="font-display text-2xl font-bold">${escapeHtml(t.site.pilotTitle)}</h2>
              <p class="text-sm text-[var(--qq-text-muted)] leading-relaxed">${escapeHtml(t.site.pilotBody)}</p>
              <div class="flex flex-wrap gap-2 pt-2">
                ${store
                  .getCity()
                  .districts.map(
                    (d) =>
                      `<span class="text-xs px-2.5 py-1 rounded-md qq-panel font-medium">${escapeHtml(d.name[s.language])}</span>`
                  )
                  .join('')}
              </div>
            </div>

            <form id="qq-partner-form" class="lg:col-span-7 qq-surface rounded-2xl p-6 space-y-4">
              <h3 class="font-display text-xl font-bold">${escapeHtml(t.site.partnerTitle)}</h3>
              <div class="grid sm:grid-cols-2 gap-4">
                <div>
                  <label class="block text-xs text-[var(--qq-text-muted)] mb-1">${escapeHtml(t.site.partnerOrg)}</label>
                  <input name="organization" required minlength="2" maxlength="160" class="w-full px-3 py-2 rounded-lg qq-panel text-sm outline-none focus:border-[#00D4E8]" />
                </div>
                <div>
                  <label class="block text-xs text-[var(--qq-text-muted)] mb-1">${escapeHtml(t.site.partnerContact)}</label>
                  <input name="contactName" required minlength="2" maxlength="120" class="w-full px-3 py-2 rounded-lg qq-panel text-sm outline-none focus:border-[#00D4E8]" />
                </div>
              </div>
              <div>
                <label class="block text-xs text-[var(--qq-text-muted)] mb-1">${escapeHtml(t.site.partnerCity)}</label>
                <input name="city" value="Шымкент" maxlength="80" class="w-full px-3 py-2 rounded-lg qq-panel text-sm outline-none focus:border-[#00D4E8]" />
              </div>
              <div>
                <label class="block text-xs text-[var(--qq-text-muted)] mb-1">${escapeHtml(t.site.partnerMsg)}</label>
                <textarea name="message" required minlength="5" maxlength="1500" rows="3" class="w-full px-3 py-2 rounded-lg qq-panel text-sm outline-none focus:border-[#00D4E8]"></textarea>
              </div>
              ${
                this.partnerStatus
                  ? `<div class="text-xs px-3 py-2 rounded-lg ${
                      this.partnerStatus.ok ? 'bg-[#22C55E]/15 text-[#22C55E]' : 'bg-[#F59E0B]/15 text-[#F59E0B]'
                    }">${escapeHtml(this.partnerStatus.text)}</div>`
                  : ''
              }
              <button type="submit" class="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-[#00D4E8] text-[#080D14] text-sm font-semibold hover:opacity-90 transition">
                ${lucideSvg('send', 'w-4 h-4')}
                ${escapeHtml(t.site.partnerSubmit)}
              </button>
            </form>
          </div>
        </section>

        <footer class="border-t border-[var(--qq-border)] py-6 text-center text-xs text-[var(--qq-text-muted)]">
          QalaQauip Smart City Operating System · Shymkent, Kazakhstan · ${escapeHtml(t.slogan)}
        </footer>
      </div>
    `;

    this.bindEvents();
    this.startHeroCanvas();
  }

  private bindEvents(): void {
    this.root.querySelectorAll<HTMLElement>('[data-site-lang]').forEach((btn) => {
      btn.addEventListener('click', () => {
        const lang = btn.dataset.siteLang as Language;
        if (lang) store.setLanguage(lang);
      });
    });

    this.root.querySelectorAll<HTMLElement>('[data-site-action]').forEach((btn) => {
      btn.addEventListener('click', () => {
        const act = btn.dataset.siteAction;
        if (act === 'open-platform') store.setSurface('command');
        else if (act === 'watch-demo') {
          store.setSurface('command');
          store.setActiveTab('map');
          store.startDemo(0);
        } else if (act === 'citizen') store.setSurface('citizen');
        else if (act === 'xr-mode') store.setSurface('xr');
        else if (act === 'theme') store.toggleTheme();
      });
    });

    this.root.querySelectorAll<HTMLElement>('[data-site-module]').forEach((btn) => {
      btn.addEventListener('click', () => {
        const tab = btn.dataset.siteModule as CommandTab;
        if (tab) store.setActiveTab(tab);
      });
    });

    const form = this.root.querySelector<HTMLFormElement>('#qq-partner-form');
    form?.addEventListener('submit', async (e) => {
      e.preventDefault();
      const fd = new FormData(form);
      const res = await createPartnershipRequestRecord({
        organization: String(fd.get('organization') || ''),
        contactName: String(fd.get('contactName') || ''),
        city: String(fd.get('city') || 'Shymkent'),
        message: String(fd.get('message') || ''),
      });
      if (res.ok) {
        this.partnerStatus = { text: I18N[store.state.language].site.partnerSuccess, ok: true };
        form.reset();
      } else if (res.error === 'AUTH_REQUIRED') {
        store.setAuthModal(true);
        this.partnerStatus = { text: I18N[store.state.language].guestOperatorNote, ok: false };
      } else {
        this.partnerStatus = { text: res.error || 'Error', ok: false };
      }
      this.render();
    });
  }

  private startHeroCanvas(): void {
    if (this.rafId !== null) cancelAnimationFrame(this.rafId);
    const canvas = this.root.querySelector<HTMLCanvasElement>('#qq-site-hero-canvas');
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const nodes = Array.from({ length: 34 }, (_, i) => ({
      x: ((i * 97) % 100) / 100,
      y: ((i * 53) % 100) / 100,
      vx: ((i % 2 === 0 ? 1 : -1) * (0.00018 + (i % 5) * 0.00005)),
      vy: ((i % 3 === 0 ? 1 : -1) * (0.00014 + (i % 4) * 0.00004)),
    }));

    const draw = () => {
      if (!document.body.contains(canvas)) return;
      const w = (canvas.width = canvas.clientWidth || 800);
      const h = (canvas.height = canvas.clientHeight || 420);
      ctx.clearRect(0, 0, w, h);

      for (const n of nodes) {
        n.x = (n.x + n.vx + 1) % 1;
        n.y = (n.y + n.vy + 1) % 1;
      }

      ctx.strokeStyle = 'rgba(0, 212, 232, 0.14)';
      ctx.lineWidth = 1;
      for (let i = 0; i < nodes.length; i++) {
        for (let j = i + 1; j < nodes.length; j++) {
          const dx = (nodes[i].x - nodes[j].x) * w;
          const dy = (nodes[i].y - nodes[j].y) * h;
          if (dx * dx + dy * dy < 24000) {
            ctx.beginPath();
            ctx.moveTo(nodes[i].x * w, nodes[i].y * h);
            ctx.lineTo(nodes[j].x * w, nodes[j].y * h);
            ctx.stroke();
          }
        }
      }

      for (let i = 0; i < nodes.length; i++) {
        ctx.fillStyle = i % 7 === 0 ? '#F59E0B' : '#00D4E8';
        ctx.beginPath();
        ctx.arc(nodes[i].x * w, nodes[i].y * h, i % 7 === 0 ? 3 : 2, 0, Math.PI * 2);
        ctx.fill();
      }

      this.rafId = requestAnimationFrame(draw);
    };
    this.rafId = requestAnimationFrame(draw);
  }

  public dispose(): void {
    if (this.rafId !== null) cancelAnimationFrame(this.rafId);
    this.rafId = null;
  }
}
