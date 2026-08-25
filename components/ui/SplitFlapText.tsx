"use client";

import { useEffect, useRef, useState } from "react";
import { usePrefersReducedMotion } from "@/hooks/usePrefersReducedMotion";
import "./SplitFlapText.css";

const CHARSET = "ABCDEFGHIJKLMNOPQRSTUVWXYZ";
const ROLL_STEPS = 6;
const STEP_MS = 55;
const CELL_STAGGER = 45;

interface Props {
  value: string;
  /** Pad to a fixed cell count so the board never reflows between values. */
  minLength?: number;
  charset?: string;
  className?: string;
}

export default function SplitFlapText({
  value,
  minLength = 0,
  charset = CHARSET,
  className = "",
}: Props) {
  const reduced = usePrefersReducedMotion();
  const target = value.toUpperCase().padEnd(Math.max(minLength, value.length), " ");
  const [cells, setCells] = useState(() => target.split(""));
  const [ticks, setTicks] = useState(() => target.split("").map(() => 0));
  const timers = useRef<ReturnType<typeof setTimeout>[]>([]);

  useEffect(() => {
    timers.current.forEach(clearTimeout);
    timers.current = [];

    const next = target.split("");
    if (reduced) {
      setCells(next);
      setTicks(next.map(() => 0));
      return;
    }

    // Each cell rolls through junk letters and lands on its own beat, so the
    // word settles left to right the way a real board does.
    next.forEach((char, i) => {
      for (let step = 1; step <= ROLL_STEPS; step++) {
        const settled = step === ROLL_STEPS;
        timers.current.push(
          setTimeout(() => {
            setCells((prev) => {
              const c = prev.length === next.length ? [...prev] : next.map(() => " ");
              c[i] = settled ? char : charset[Math.floor(Math.random() * charset.length)];
              return c;
            });
            setTicks((prev) => {
              const t = prev.length === next.length ? [...prev] : next.map(() => 0);
              t[i] = t[i] + 1;
              return t;
            });
          }, i * CELL_STAGGER + step * STEP_MS)
        );
      }
    });

    return () => {
      timers.current.forEach(clearTimeout);
      timers.current = [];
    };
  }, [target, reduced, charset]);

  return (
    <span className={`split-flap ${className}`}>
      <span className="sr-only">{value}</span>
      <span aria-hidden className="split-flap__row">
        {cells.map((char, i) => (
          <span key={i} className="split-flap__cell">
            <span key={ticks[i]} className="split-flap__char">
              {char === " " ? " " : char}
            </span>
          </span>
        ))}
      </span>
    </span>
  );
}
