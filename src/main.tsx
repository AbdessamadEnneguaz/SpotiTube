import { createRoot } from 'react-dom/client';
import { registerSW } from 'virtual:pwa-register';
import App from './App.tsx';
import './index.css';

// Register Auto-Updating PWA Service Worker for immediate OTA web/UI delivery
if ('serviceWorker' in navigator) {
  let hasReloadedForOta = false;

  navigator.serviceWorker.addEventListener('controllerchange', () => {
    if (hasReloadedForOta) return;
    hasReloadedForOta = true;
    window.location.reload();
  });

  const updateSW = registerSW({
    immediate: true,
    onNeedRefresh() {
      void updateSW(true);
    },
    onRegisteredSW(_swUrl, registration) {
      if (!registration) return;

      // Check for newly deployed web builds periodically and whenever returning to foreground
      const checkForOtaUpdate = () => {
        registration.update().catch(() => {});
      };

      window.setInterval(checkForOtaUpdate, 30 * 60 * 1000);
      document.addEventListener('visibilitychange', () => {
        if (!document.hidden) {
          checkForOtaUpdate();
        }
      });
    },
  });
}

createRoot(document.getElementById('root')!).render(<App />);
