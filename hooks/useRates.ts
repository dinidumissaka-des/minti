"use client";

import { useEffect, useState } from "react";
import { getRatesForBase } from "@/lib/exchangeRates";
import type { Rates } from "@/lib/money";

// Rates for one display currency, cached 6h by lib/exchangeRates. Failure is
// reported rather than thrown: the app still works offline, it just shows
// foreign entries as they were entered and says so.
export function useRates(display: string): { rates: Rates | null; failed: boolean } {
  const [rates, setRates] = useState<Rates | null>(null);
  const [failed, setFailed] = useState(false);

  useEffect(() => {
    let live = true;
    setFailed(false);
    getRatesForBase(display)
      .then((cache) => {
        if (live) setRates(cache.rates);
      })
      .catch(() => {
        if (!live) return;
        setRates(null);
        setFailed(true);
      });
    return () => {
      live = false;
    };
  }, [display]);

  return { rates, failed };
}
