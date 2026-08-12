"use client";

import { useEffect } from "react";
import { isNative } from "@/lib/platform";

export default function ServiceWorkerRegistration() {
  useEffect(() => {
    if (isNative()) return;
    if ("serviceWorker" in navigator) {
      navigator.serviceWorker.register("/sw.js").catch(() => {});
    }
  }, []);
  return null;
}
