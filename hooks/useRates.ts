"use client";

import { useEffect, useMemo, useState } from "react";
import { getRatesForBase, readCachedRates } from "@/lib/exchangeRates";
import type { Rates } from "@/lib/money";

// Rates for one display currency. Failure is reported rather than thrown: the
// app still works offline, it just shows foreign entries as they were entered
// and says so.
//
// The map is only ever used for the currency it was fetched for. Holding the
// previous one across a currency change was worse than holding none: a map
// fetched for AED has AED at 1.0, so every figure came out unconverted under
// the new label — the exact bug this layer exists to fix, just transiently.
export function useRates(display: string): { rates: Rates | null; failed: boolean; loading: boolean } {
  const [fetched, setFetched] = useState<{ base: string; rates: Rates } | null>(null);
  const [failed, setFailed] = useState(false);

  // Whatever was last stored for this base, however old, so a switch to a
  // currency seen before converts on the first render.
  const cached = useMemo(() => readCachedRates(display), [display]);
  const rates = fetched?.base === display ? fetched.rates : cached;

  useEffect(() => {
    let live = true;
    setFailed(false);
    getRatesForBase(display)
      .then((cache) => {
        if (live) setFetched({ base: cache.base, rates: cache.rates });
      })
      .catch(() => {
        if (live) setFailed(true);
      });
    return () => {
      live = false;
    };
  }, [display]);

  // Nothing to convert with yet, but a fetch is still out: not a failure, and
  // not worth a notice that would flash on every currency change.
  return { rates, failed, loading: rates === null && !failed };
}
