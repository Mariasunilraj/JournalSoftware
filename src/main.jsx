import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App.jsx'

// Register Service Worker for PWA App installation on phones and laptops
if ('serviceWorker' in navigator) {
  window.addEventListener('load', () => {
    navigator.serviceWorker.register('/sw.js').catch((err) => {
      console.warn('PWA service worker registration notice:', err);
    });
  });
}

// Global capture for PWA Install Prompt (Chrome / Edge on Android & Laptop)
window.addEventListener('beforeinstallprompt', (e) => {
  e.preventDefault();
  window.__pwaDeferredPrompt = e;
  window.dispatchEvent(new Event('pwa-prompt-available'));
});

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <App />
  </StrictMode>,
)
