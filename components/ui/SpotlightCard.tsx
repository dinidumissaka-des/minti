"use client";

import { useRef, useState } from "react";
import GlassSurface from "@/components/GlassSurface";

interface Props {
  children: React.ReactNode;
  className?: string;
  style?: React.CSSProperties;
}

// React Bits' SpotlightCard, on a GlassSurface instead of its own opaque panel
// so it frosts like every other card in the app. The glow itself is
// .spotlight-glow in globals.css — it has to flip per theme like .flat-chip.
export default function SpotlightCard({ children, className = "", style }: Props) {
  const ref = useRef<HTMLDivElement>(null);
  const [lit, setLit] = useState(false);

  function trackCursor(e: React.MouseEvent<HTMLDivElement>) {
    const el = ref.current;
    if (!el) return;
    const rect = el.getBoundingClientRect();
    el.style.setProperty("--spot-x", `${e.clientX - rect.left}px`);
    el.style.setProperty("--spot-y", `${e.clientY - rect.top}px`);
  }

  return (
    <GlassSurface borderRadius={28} backgroundOpacity={0.07} className={className} style={style}>
      <div
        ref={ref}
        onMouseMove={trackCursor}
        onMouseEnter={() => setLit(true)}
        onMouseLeave={() => setLit(false)}
        className="relative w-full h-full p-5"
      >
        <div
          aria-hidden
          className={`spotlight-glow pointer-events-none absolute inset-0 transition-opacity duration-slow ease-out ${
            lit ? "opacity-100" : "opacity-0"
          }`}
        />
        <div className="relative">{children}</div>
      </div>
    </GlassSurface>
  );
}
