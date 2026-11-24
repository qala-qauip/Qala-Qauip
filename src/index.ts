import * as xb from 'xrblocks';
import { CitizenAppView } from './ui/CitizenAppView.ts';
import { CommandCenterView } from './ui/CommandCenterView.ts';
import { escapeHtml } from './ui/helpers.ts';
import { OfficialSiteView } from './ui/OfficialSiteView.ts';
import { store } from './ui/store.ts';
import { XRCityScript } from './xr/XRCityScript.ts';

class QalaAppRoot {
  private rootEl: HTMLElement;
  private toastEl: HTMLElement;
  private commandView: CommandCenterView | null = null;
  private siteView: OfficialSiteView | null = null;
  private citizenView: CitizenAppView | null = null;
  private activeSurface = store.state.surface;
  private xrInitialized = false;

  constructor() {
    const appHost = document.getElementById('root');
    if (!appHost) {
      throw new Error('Root mount element #root not found.');
    }
    this.rootEl = document.createElement('div');
    this.toastEl = document.createElement('div');
    this.toastEl.className = 'fixed bottom-4 right-4 z-[70] pointer-events-none';
    appHost.innerHTML = '';
    appHost.appendChild(this.rootEl);
    appHost.appendChild(this.toastEl);
  }

  public async start(): Promise<void> {
    store.subscribe(() => this.renderCurrent());
    await store.bootstrap();
    this.renderCurrent();
  }

  private renderCurrent(): void {
    const s = store.state;

    // Render toast overlay
    if (s.toast) {
      const toneClass =
        s.toast.tone === 'danger'
          ? 'bg-[#EF4444] text-white'
          : s.toast.tone === 'warning'
            ? 'bg-[#F59E0B] text-[#080D14]'
            : s.toast.tone === 'success'
              ? 'bg-[#22C55E] text-[#080D14]'
              : 'qq-surface text-[var(--qq-text)] border-[#00D4E8]/50';
      this.toastEl.innerHTML = `<div class="px-4 py-2.5 rounded-xl text-xs font-semibold shadow-2xl border ${toneClass}">${escapeHtml(s.toast.text)}</div>`;
    } else {
      this.toastEl.innerHTML = '';
    }

    if (s.surface !== this.activeSurface) {
      this.teardownViews();
      this.activeSurface = s.surface;
    }

    if (s.surface === 'xr') {
      void this.launchXRMode();
      return;
    }

    if (s.surface === 'website') {
      if (!this.siteView) this.siteView = new OfficialSiteView(this.rootEl);
      this.siteView.render();
    } else if (s.surface === 'citizen') {
      if (!this.citizenView) this.citizenView = new CitizenAppView(this.rootEl);
      this.citizenView.render();
    } else {
      if (!this.commandView) this.commandView = new CommandCenterView(this.rootEl);
      this.commandView.render();
    }
  }

  private async launchXRMode(): Promise<void> {
    this.rootEl.innerHTML = `
      <div class="fixed inset-0 z-50 bg-[#080D14] flex flex-col items-center justify-center p-6 text-center space-y-4">
        <div class="text-xs font-mono-tech uppercase text-[#00D4E8]">XR Blocks Spatial Mode</div>
        <h2 class="font-display text-2xl font-bold">QalaQauip 3D Shymkent XR</h2>
        <p class="text-xs text-[#8C9BAA] max-w-md">
          Use Enter XR / Simulator below to inspect the holographic Shymkent 3D Digital Twin with spatial UI controls.
        </p>
        <button id="qq-exit-xr-btn" class="px-4 py-2 rounded-xl qq-surface text-xs font-semibold hover:border-[#00D4E8]/60">
          Return to 2D Command Center
        </button>
      </div>
    `;
    document.getElementById('qq-exit-xr-btn')?.addEventListener('click', () => {
      document.getElementById('XRButtonWrapper')?.remove();
      store.setSurface('command');
    });

    if (!this.xrInitialized) {
      this.xrInitialized = true;
      const options = new xb.Options();
      options.setAppTitle('QalaQauip XR Spatial Twin');
      options.setAppDescription('Inspect Shymkent 3D Digital Twin in WebXR.');
      options.xrButton.showEnterSimulatorButton = true;
      xb.add(
        new XRCityScript(store.getVisibleIncidents(), store.state.language, () => {
          document.getElementById('XRButtonWrapper')?.remove();
          store.setSurface('command');
        })
      );
      await xb.init(options);
    }
  }

  private teardownViews(): void {
    this.commandView?.dispose();
    this.commandView = null;
    this.siteView?.dispose();
    this.siteView = null;
    this.citizenView?.dispose();
    this.citizenView = null;
  }
}

document.addEventListener('DOMContentLoaded', () => {
  const app = new QalaAppRoot();
  void app.start();
});
