"use client";

import { useEffect, useState } from "react";

// How many pixels of the layout viewport the on-screen keyboard covers.
// iOS never resizes the WKWebView for the keyboard, so a bottom-anchored sheet
// keeps its full height underneath it and the browser tries to scroll the
// focused field into view on its own — which drags the page behind a fixed
// sheet and leaves the caret painted away from the field. visualViewport is
// the only API that reports the overlap; offsetTop covers the case where iOS
// already shifted the visual viewport before we measured.
const KEYBOARD_MIN_HEIGHT = 100;

export function useKeyboardInset(enabled = true) {
  const [inset, setInset] = useState(0);

  useEffect(() => {
    const vv = window.visualViewport;
    if (!enabled || !vv) {
      setInset(0);
      return;
    }

    const measure = () => {
      const overlap = window.innerHeight - (vv.height + vv.offsetTop);
      setInset(overlap > KEYBOARD_MIN_HEIGHT ? Math.round(overlap) : 0);
    };

    measure();
    vv.addEventListener("resize", measure);
    vv.addEventListener("scroll", measure);
    return () => {
      vv.removeEventListener("resize", measure);
      vv.removeEventListener("scroll", measure);
    };
  }, [enabled]);

  return inset;
}
