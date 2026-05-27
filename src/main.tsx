import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App.tsx'

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
)

// This snippet registers the PWABuilder service worker code cleanly
if (typeof window !== "undefined" && "serviceWorker" in navigator) {
  window.addEventListener("load", () => {
    navigator.serviceWorker
      .register("/pwabuilder-sw.js") // Points directly to your public folder asset
      .then((reg) => console.log("🚀 Service Worker registered successfully:", reg.scope))
      .catch((err) => console.error("❌ Service Worker registration failed:", err));
  });
}

