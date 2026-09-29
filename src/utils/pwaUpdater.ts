import { registerSW } from 'virtual:pwa-register';

interface VersionInfo {
  version: string;
  builtAt?: string;
}

let initialAppVersion: string | null = null;
let isRefreshing = false;
let globalRegistration: ServiceWorkerRegistration | null = null;

// Prevent rapid reload loops (minimum 15 seconds between automated reloads)
function canSafelyReload(): boolean {
  if (isRefreshing) return false;
  try {
    const lastReload = sessionStorage.getItem('munazzam_last_auto_reload');
    if (lastReload) {
      const elapsed = Date.now() - parseInt(lastReload, 10);
      if (elapsed < 15000) {
        return false;
      }
    }
  } catch {}
  return true;
}

function markReloadAttempt(version?: string) {
  try {
    sessionStorage.setItem('munazzam_last_auto_reload', Date.now().toString());
    if (version) {
      sessionStorage.setItem('munazzam_synced_version', version);
    }
  } catch {}
}

/**
 * Silently triggers a page reload to apply new assets when a new deployment is ready.
 */
function performSilentRefresh(newVersion?: string) {
  if (!canSafelyReload()) return;
  isRefreshing = true;
  markReloadAttempt(newVersion);
  window.location.reload();
}

/**
 * Checks for updates both via the ServiceWorker registration API and the version.json file.
 */
export async function checkForAppUpdates(): Promise<void> {
  // 1. Ask the service worker registration to check for updates on the server
  if (globalRegistration) {
    try {
      await globalRegistration.update();
    } catch {
      // Ignore network errors during background check
    }
  }

  // 2. Secondary check against version.json with cache-busting query parameter
  try {
    const res = await fetch(`/version.json?_t=${Date.now()}`, {
      cache: 'no-store',
      headers: {
        'Cache-Control': 'no-cache, no-store, must-revalidate',
        'Pragma': 'no-cache',
      },
    });

    if (res.ok) {
      const data: VersionInfo = await res.json();
      if (data && data.version) {
        if (!initialAppVersion) {
          initialAppVersion = data.version;
          return;
        }

        // If version on server is newer than current session version
        if (data.version !== initialAppVersion) {
          console.log('[Munazzam PWA] New deployment detected:', data.version, '(current:', initialAppVersion, ')');
          
          // Verify if we already reloaded for this specific version in this tab
          const syncedVersion = sessionStorage.getItem('munazzam_synced_version');
          if (syncedVersion === data.version) {
            initialAppVersion = data.version;
            return;
          }

          if (globalRegistration) {
            try {
              await globalRegistration.update();
            } catch {}
          }

          // Delay slightly to allow service worker to activate and cache assets
          setTimeout(() => {
            performSilentRefresh(data.version);
          }, 1000);
        }
      }
    }
  } catch {
    // Silent failure on offline / network hiccup
  }
}

/**
 * Initializes automatic silent PWA background updates across devices.
 * Configures service worker registration, listeners for controllerchange,
 * visibility/focus/online events, and periodic background checks.
 */
export function initSilentPWAUpdates(): void {
  if (typeof window === 'undefined') return;

  // Listen for the controllerchange event when a new SW activates and claims clients
  if ('serviceWorker' in navigator) {
    navigator.serviceWorker.addEventListener('controllerchange', () => {
      console.log('[Munazzam PWA] Service worker controller changed. Activating latest version.');
      performSilentRefresh();
    });
  }

  // Register ServiceWorker with VitePWA autoUpdate mechanism
  const updateSW = registerSW({
    immediate: true,
    onNeedRefresh() {
      // In autoUpdate mode, telling updateSW to skipWaiting immediately
      updateSW(true);
    },
    onOfflineReady() {
      // App is primed for offline use
    },
    onRegisteredSW(_swScriptUrl, registration) {
      if (registration) {
        globalRegistration = registration;
        
        // Immediate check shortly after launch
        setTimeout(() => {
          checkForAppUpdates();
        }, 2500);

        // Periodic background checks every 45 seconds
        setInterval(() => {
          checkForAppUpdates();
        }, 45 * 1000);
      }
    },
    onRegisterError(error) {
      console.warn('[Munazzam PWA] Service worker registration notice:', error);
    },
  });

  // Check for updates when user returns to tab / unlocks phone
  document.addEventListener('visibilitychange', () => {
    if (document.visibilityState === 'visible') {
      checkForAppUpdates();
    }
  });

  // Check for updates when window regains focus
  window.addEventListener('focus', () => {
    checkForAppUpdates();
  });

  // Check for updates when device comes back online
  window.addEventListener('online', () => {
    checkForAppUpdates();
  });
}
