"use client";

import { Zap, Repeat, Gauge, Globe } from "lucide-react";
import SpotlightCard from "@/components/ui/SpotlightCard";
import { cn } from "@/lib/utils";

const FEATURES = [
  {
    Icon: Zap,
    title: "Two taps to log",
    body: "Amount, category, done. The number pad is already open when the form is.",
  },
  {
    Icon: Repeat,
    title: "Subscriptions counted",
    body: "Recurring bills roll into the month's total before they surprise you.",
  },
  {
    Icon: Gauge,
    title: "A budget that keeps score",
    body: "One bar for the month — spending and subscriptions together, live.",
  },
  {
    Icon: Globe,
    title: "Any currency",
    body: "Live rates with an offline cache, and a converter a tap away.",
  },
];

export default function AuthShowcase({ className }: { className?: string }) {
  return (
    <section className={cn("flex-col gap-8", className)} aria-label="What Minti does">
      <div className="flex flex-col gap-3">
        <span className="text-xs font-semibold uppercase tracking-[0.16em] text-accent">
          What Minti is
        </span>
        <h2 className="font-fraunces text-[2.25rem] leading-[1.1] text-ink text-balance">
          A whole month, on one screen.
        </h2>
        <p className="text-body text-muted max-w-[44ch]">
          A pocket expense tracker that stays out of the way — log what you spend, watch the
          budget move, and see the recurring bills before they land.
        </p>
      </div>

      <div className="grid grid-cols-2 gap-3">
        {FEATURES.map(({ Icon, title, body }, i) => (
          <SpotlightCard key={title} className="animate-row-in" style={{ animationDelay: `${i * 60}ms` }}>
            <div className="flex flex-col gap-2">
              <Icon size={18} className="text-accent" aria-hidden />
              <h3 className="text-body font-semibold text-ink">{title}</h3>
              <p className="text-sm text-muted leading-relaxed">{body}</p>
            </div>
          </SpotlightCard>
        ))}
      </div>

      <p className="text-sm text-muted">
        Installs to your home screen · works offline · your data stays yours.
      </p>
    </section>
  );
}
