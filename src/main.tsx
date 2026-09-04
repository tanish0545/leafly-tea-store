import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App.tsx'
import "./styles/leafly.css";
import { sanitizeAuthUrl } from "./utils/urlSanitizer";

// Immediately sanitize address bar from sensitive auth redirect parameters
sanitizeAuthUrl();

// Silent, loop-guarded chunk recovery for newly deployed Vite assets
window.addEventListener('vite:preloadError', (event) => {
  event.preventDefault();
  const lastReload = Number(sessionStorage.getItem('leafly_chunk_reload') || '0');
  const now = Date.now();
  if (now - lastReload > 15000) {
    sessionStorage.setItem('leafly_chunk_reload', String(now));
    window.location.reload();
  }
});

window.addEventListener('unhandledrejection', (event) => {
  if (
    event.reason?.message?.includes('Failed to fetch dynamically imported module') ||
    event.reason?.message?.includes('Importing a module script failed') ||
    event.reason?.name === 'ChunkLoadError'
  ) {
    const lastReload = Number(sessionStorage.getItem('leafly_chunk_reload') || '0');
    const now = Date.now();
    if (now - lastReload > 15000) {
      sessionStorage.setItem('leafly_chunk_reload', String(now));
      window.location.reload();
    }
  }
});

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
)
