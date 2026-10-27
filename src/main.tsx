import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import './index.css'
import App from './App.tsx'
import { initSentry } from './lib/sentry'
import { initPostHog } from './lib/posthog'
import { initMixpanel } from './lib/mixpanel'
import { registerSW } from 'virtual:pwa-register'

// Handle Vite dynamic import chunk loading failures after hard reloads (Ctrl+Shift+R)
if (typeof window !== 'undefined') {
  // Capture PWA install prompt globally so any component or modal can trigger it on demand
  window.addEventListener('beforeinstallprompt', (e) => {
    e.preventDefault();
    (window as any).__pwaInstallPrompt = e;
    window.dispatchEvent(new CustomEvent('pwa-prompt-ready'));
  });

  window.addEventListener('appinstalled', () => {
    (window as any).__pwaInstallPrompt = null;
    (window as any).__pwaIsInstalled = true;
    window.dispatchEvent(new CustomEvent('pwa-installed'));
  });

  window.addEventListener('vite:preloadError', (event) => {
    console.warn('[PromptHub] Dynamic chunk preload error detected on hard reload. Refreshing chunks...', event);
    // Prevent infinite reload loop using sessionStorage flag
    const lastReload = sessionStorage.getItem('ph_last_chunk_reload');
    const now = Date.now();
    if (!lastReload || now - parseInt(lastReload, 10) > 10000) {
      sessionStorage.setItem('ph_last_chunk_reload', String(now));
      window.location.reload();
    }
  });
}

// Schedule non-critical background services on idle / post-render to unblock first paint
const initBackgroundServices = () => {
  try {
    registerSW({ immediate: false });
  } catch {}
  try {
    initSentry();
  } catch {}
  try {
    initPostHog();
  } catch {}
  try {
    initMixpanel();
  } catch {}
};

if (typeof window !== 'undefined') {
  if ('requestIdleCallback' in window) {
    (window as any).requestIdleCallback(initBackgroundServices, { timeout: 2500 });
  } else {
    setTimeout(initBackgroundServices, 150);
  }
}

// Initialize TanStack Query client for server state caching
const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      refetchOnWindowFocus: false,
      retry: 1,
    },
  },
})

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <QueryClientProvider client={queryClient}>
      <App />
    </QueryClientProvider>
  </StrictMode>,
)
