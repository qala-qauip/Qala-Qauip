import { registerSW } from 'virtual:pwa-register';
import type { CitizenReportDraft } from '../types.ts';

const DRAFTS_KEY = 'qalaqauip_offline_drafts_v1';

interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }>;
}

let deferredPrompt: BeforeInstallPromptEvent | null = null;
const pwaListeners = new Set<() => void>();

export function initPWA(): void {
  if (typeof window === 'undefined') return;

  registerSW({
    immediate: true,
    onOfflineReady() {
      notifyListeners();
    },
    onNeedRefresh() {
      notifyListeners();
    },
  });

  window.addEventListener('beforeinstallprompt', (e) => {
    e.preventDefault();
    deferredPrompt = e as BeforeInstallPromptEvent;
    notifyListeners();
  });

  window.addEventListener('appinstalled', () => {
    deferredPrompt = null;
    notifyListeners();
  });

  window.addEventListener('online', () => notifyListeners());
  window.addEventListener('offline', () => notifyListeners());
}

function notifyListeners(): void {
  pwaListeners.forEach((fn) => fn());
}

export function subscribePWA(cb: () => void): () => void {
  pwaListeners.add(cb);
  return () => pwaListeners.delete(cb);
}

export function isStandalonePWA(): boolean {
  if (typeof window === 'undefined') return false;
  return (
    window.matchMedia('(display-mode: standalone)').matches ||
    (window.navigator as Navigator & { standalone?: boolean }).standalone === true
  );
}

export function isIosSafari(): boolean {
  if (typeof navigator === 'undefined') return false;
  const ua = navigator.userAgent;
  return /iP(ad|hone|od)/i.test(ua) && /WebKit/i.test(ua) && !/CriOS|FxiOS/i.test(ua);
}

export function canInstallPWA(): boolean {
  return deferredPrompt !== null && !isStandalonePWA();
}

export async function triggerPWAInstall(): Promise<boolean> {
  if (!deferredPrompt) return false;
  await deferredPrompt.prompt();
  const choice = await deferredPrompt.userChoice;
  if (choice.outcome === 'accepted') {
    deferredPrompt = null;
  }
  notifyListeners();
  return choice.outcome === 'accepted';
}

export function getOfflineDrafts(): CitizenReportDraft[] {
  try {
    const raw = localStorage.getItem(DRAFTS_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? (parsed as CitizenReportDraft[]) : [];
  } catch {
    return [];
  }
}

export function saveOfflineDraft(draft: CitizenReportDraft): CitizenReportDraft[] {
  const existing = getOfflineDrafts().filter((d) => d.id !== draft.id);
  const next = [draft, ...existing].slice(0, 25);
  try {
    localStorage.setItem(DRAFTS_KEY, JSON.stringify(next));
  } catch {
    // Ignore storage quota issues
  }
  notifyListeners();
  return next;
}

export function removeOfflineDraft(draftId: string): CitizenReportDraft[] {
  const next = getOfflineDrafts().filter((d) => d.id !== draftId);
  try {
    localStorage.setItem(DRAFTS_KEY, JSON.stringify(next));
  } catch {
    // Ignore
  }
  notifyListeners();
  return next;
}
