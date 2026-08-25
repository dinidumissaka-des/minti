"use client";

import { useEffect, useState } from "react";
import SplitFlapText from "@/components/ui/SplitFlapText";
import { usePrefersReducedMotion } from "@/hooks/usePrefersReducedMotion";
import { cn } from "@/lib/utils";

const TRACKS = ["Coffee", "Rent", "Spotify", "Flights", "Groceries"];
const BOARD_WIDTH = Math.max(...TRACKS.map((w) => w.length));
const FLIP_MS = 2600;

export default function AuthShowcase({ className }: { className?: string }) {
  const reduced = usePrefersReducedMotion();
  const [track, setTrack] = useState(0);

  useEffect(() => {
    if (reduced) return;
    const id = setInterval(() => setTrack((i) => (i + 1) % TRACKS.length), FLIP_MS);
    return () => clearInterval(id);
  }, [reduced]);

  return (
    <section className={cn("flex-col gap-10", className)} aria-label="What Minti does">
      <div className="flex flex-col gap-6">
        <div className="flex items-center gap-3 text-sm font-semibold uppercase tracking-[0.16em]">
          <span className="text-muted">Tracking</span>
          <SplitFlapText value={TRACKS[track]} minLength={BOARD_WIDTH} className="text-accent" />
        </div>
        <h2 className="font-fraunces text-[clamp(2.75rem,4.8vw,4.5rem)] leading-[1.02] text-ink text-balance">
          A whole month, on one screen.
        </h2>
      </div>

      <p className="text-body text-muted">
        Installs to your home screen · works offline · your data stays yours.
      </p>
    </section>
  );
}
