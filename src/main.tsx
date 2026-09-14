import {StrictMode} from 'react';
import {createRoot} from 'react-dom/client';
import App from './App.tsx';
import './index.css';

// Handle dynamic import chunk loading failures (e.g., when a new deployment invalidates old chunk hashes)
window.addEventListener('vite:preloadError', (event) => {
  console.warn('Vite preload error encountered, reloading to fetch latest assets:', event);
  window.location.reload();
});

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
);
