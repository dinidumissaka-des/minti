"use client";

import { useEffect, useRef, useState } from "react";

interface Props {
  /** How long the stroke takes to drain, in ms. Match the timer it traces. */
  duration: number;
  /** Radius of the box being traced — a card's *inner* radius, one border in. */
  radius: number;
  /** The draining stroke. The neutral marks state, so that is the default. */
  stroke?: string;
  /** The full outline it drains against. */
  track?: string;
  thickness?: number;
  className?: string;
}

// A rounded-rect stroke that retreats to nothing over the life of a timer, so
// the outline that is left *is* the time that is left. Mount it inside the
// element it traces (anything `relative`); it fills the box and never takes a
// pointer event.
//
// It measures rather than stretching one viewBox with preserveAspectRatio
// ="none" — non-uniform scaling would thin the stroke along the long sides and
// oval the corners. Measuring also gives the exact perimeter, so the dash runs
// off engines that ignore pathLength on a <rect>.
export default function CountdownOutline({
  duration,
  radius,
  stroke = "rgb(var(--accent-text))",
  track = "rgb(var(--ink) / 0.1)",
  thickness = 1.5,
  className = "",
}: Props) {
  const ref = useRef<HTMLDivElement | null>(null);
  const [box, setBox] = useState<{ w: number; h: number } | null>(null);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const measure = () => setBox({ w: el.offsetWidth, h: el.offsetHeight });
    measure();
    const observer = new ResizeObserver(measure);
    observer.observe(el);
    return () => observer.disconnect();
  }, []);

  // Half the stroke sits either side of the path, and a card clips its
  // overflow, so the path runs half a stroke inside the box.
  const inset = thickness / 2;
  const w = box ? box.w - thickness : 0;
  const h = box ? box.h - thickness : 0;
  const r = Math.max(0, Math.min(radius - inset, w / 2, h / 2));
  const length = 2 * (w - 2 * r) + 2 * (h - 2 * r) + 2 * Math.PI * r;

  return (
    <div ref={ref} aria-hidden="true" className={`pointer-events-none absolute inset-0 ${className}`}>
      {box && w > 0 && h > 0 && (
        <svg width={box.w} height={box.h} viewBox={`0 0 ${box.w} ${box.h}`} fill="none">
          <rect
            x={inset} y={inset} width={w} height={h} rx={r} ry={r}
            stroke={track} strokeWidth={thickness}
          />
          <rect
            x={inset} y={inset} width={w} height={h} rx={r} ry={r}
            stroke={stroke} strokeWidth={thickness} strokeLinecap="round"
            className="animate-countdown-drain"
            style={{
              strokeDasharray: length,
              ["--outline-length" as string]: `${length}`,
              ["--outline-duration" as string]: `${duration}ms`,
            }}
          />
        </svg>
      )}
    </div>
  );
}
