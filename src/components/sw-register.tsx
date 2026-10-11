"use client";

import { useEffect } from "react";

/** Înregistrează service worker-ul doar în producție (în dev ar ține în cache chunk-urile HMR). */
export function ServiceWorkerRegister() {
  useEffect(() => {
    if (process.env.NODE_ENV !== "production" || !("serviceWorker" in navigator)) return;
    navigator.serviceWorker.register("/sw.js").catch(() => {});
  }, []);
  return null;
}
