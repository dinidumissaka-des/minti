"use client";

import { useEffect, useState } from "react";
import { usePrefersReducedMotion } from "@/hooks/usePrefersReducedMotion";

interface Props {
  /** 0–100. */
  value: number;
  /** The filled bar. */
  barClassName?: string;
  /** For a bar whose color is data-driven (a category swatch), not a token. */
  barStyle?: React.CSSProperties;
  /** The track. */
  className?: string;
}

// Bars used to render at their final width on first paint, so the transition
// only ever fired on later updates — the fill never animated on the screen
// where you actually look at it. Mounting at zero and setting the real width
// on the next frame makes the first render the animated one.
export default function Meter({ value, barClassName = "", barStyle, className = "" }: Props) {
  const reduced = usePrefersReducedMotion();
  const [width, setWidth] = useState(0);

  useEffect(() => {
    if (reduced) {
      setWidth(value);
      return;
    }
    const id = requestAnimationFrame(() => setWidth(value));
    return () => cancelAnimationFrame(id);
  }, [value, reduced]);

  return (
    <div className={`overflow-hidden rounded-full ${className}`}>
      <div
        className={`h-full rounded-full transition-[width] duration-slower ease-out ${barClassName}`}
        style={{ ...barStyle, width: `${width}%` }}
      />
    </div>
  );
}
