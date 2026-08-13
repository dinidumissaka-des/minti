"use client";

import { useEffect, useState } from "react";

// The CSS in globals.css neutralises declarative animation on its own. This is
// for the JS-driven motion (number tweens, sheet drag, theme reveal) that no
// media query can reach.
export function usePrefersReducedMotion() {
  const [reduced, setReduced] = useState(false);

  useEffect(() => {
    const mq = window.matchMedia("(prefers-reduced-motion: reduce)");
    setReduced(mq.matches);
    const handler = (e: MediaQueryListEvent) => setReduced(e.matches);
    mq.addEventListener("change", handler);
    return () => mq.removeEventListener("change", handler);
  }, []);

  return reduced;
}
