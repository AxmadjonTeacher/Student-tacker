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
      .then((reg) => {
        console.log("🚀 Service Worker registered successfully:", reg.scope);

        // Check for updates
        reg.addEventListener("updatefound", () => {
          const newWorker = reg.installing;
          if (newWorker) {
            newWorker.addEventListener("statechange", () => {
              if (newWorker.state === "installed" && navigator.serviceWorker.controller) {
                console.log("✨ New Service Worker update found! Skipping waiting...");
                newWorker.postMessage({ type: "SKIP_WAITING" });
              }
            });
          }
        });
      })
      .catch((err) => console.error("❌ Service Worker registration failed:", err));
  });

  // Reload the page when the service worker changes (takes over control)
  let refreshing = false;
  navigator.serviceWorker.addEventListener("controllerchange", () => {
    if (!refreshing) {
      refreshing = true;
      console.log("🔄 Reloading page to apply new update...");
      window.location.reload();
    }
  });
}

