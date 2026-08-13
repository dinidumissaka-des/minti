"use client";

import { useEffect } from "react";
import { isNative } from "@/lib/platform";

export default function ServiceWorkerRegistration() {
  useEffect(() => {
    if (isNative()) return;
    // Dev's chunk filenames aren't content-hashed the way prod's are, so the
    // SW's cache-first /_next/static/ handler can serve a stale chunk for a
    // route you haven't just reloaded — looks like a real styling bug, isn't.
    if (process.env.NODE_ENV !== "production") return;
    if ("serviceWorker" in navigator) {
      navigator.serviceWorker.register("/sw.js").catch(() => {});
    }
  }, []);
  return null;
}
