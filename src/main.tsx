import { createRoot } from 'react-dom/client';
import { registerSW } from 'virtual:pwa-register';
import App from './App.tsx';
import './index.css';

// Register Cache-First PWA Service Worker
if ('serviceWorker' in navigator) {
  registerSW({
    immediate: true,
    onOfflineReady() {
      // Service worker precache and Cache-First runtime rules are active
    },
  });
}

createRoot(document.getElementById('root')!).render(<App />);
