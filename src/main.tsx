import {StrictMode} from 'react';
import {createRoot} from 'react-dom/client';
import App from './App.tsx';
import './index.css';
import { initSilentPWAUpdates } from './utils/pwaUpdater.ts';

// Handle dynamic import chunk loading failures (e.g., when a new deployment invalidates old chunk hashes)
window.addEventListener('vite:preloadError', (event) => {
  console.warn('Vite preload error encountered, reloading to fetch latest assets:', event);
  const lastPreloadReload = sessionStorage.getItem('munazzam_last_preload_reload');
  if (!lastPreloadReload || Date.now() - parseInt(lastPreloadReload, 10) > 10000) {
    sessionStorage.setItem('munazzam_last_preload_reload', Date.now().toString());
    window.location.reload();
  }
});

// Initialize automatic silent background updates across all devices and sessions
initSilentPWAUpdates();

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
);

