"use client";

import { useEffect, useRef } from "react";
import { gsap } from "gsap";
import { CATEGORY_COLORS } from "@/lib/categories";

const PRESET_CATEGORIES = Object.keys(CATEGORY_COLORS);
const ACCENT = "#9FE870";

interface Props {
  open: boolean;
  selected: string;
  isCustom: boolean;
  onSelect: (cat: string) => void;
}

export default function CategoryPicker({ open, selected, isCustom, onSelect }: Props) {
  const pillRefs = useRef<(HTMLButtonElement | null)[]>([]);
  const rotations = useRef<number[]>([]);

  const allItems = [...PRESET_CATEGORIES, "__custom__"];

  if (rotations.current.length === 0) {
    rotations.current = allItems.map(() => (Math.random() - 0.5) * 16);
  }

  useEffect(() => {
    const pills = pillRefs.current.filter(Boolean) as HTMLButtonElement[];
    if (!pills.length) return;

    if (open) {
      gsap.killTweensOf(pills);
      gsap.set(pills, { scale: 0, opacity: 0, transformOrigin: "50% 50%" });
      pills.forEach((pill, i) => {
        gsap.to(pill, {
          scale: 1,
          opacity: 1,
          rotation: rotations.current[i],
          duration: 0.5,
          delay: i * 0.055 + gsap.utils.random(-0.02, 0.02),
          ease: "back.out(1.9)",
        });
      });
    } else {
      gsap.killTweensOf(pills);
      gsap.to(pills, { scale: 0, opacity: 0, duration: 0.18, ease: "power2.in", stagger: 0.025 });
    }
  }, [open]);

  return (
    <div className="flex flex-wrap gap-2 py-4 px-2 justify-center [overflow:visible]">
      {allItems.map((cat, i) => {
        const isSelected = cat === "__custom__" ? isCustom : selected === cat && !isCustom;
        const label = cat === "__custom__" ? "Custom..." : cat;

        return (
          <button
            key={cat}
            ref={(el) => { pillRefs.current[i] = el; }}
            onClick={() => onSelect(cat)}
            onMouseEnter={(e) => gsap.to(e.currentTarget, { scale: 1.1, duration: 0.2, ease: "back.out(1.5)" })}
            onMouseLeave={(e) => gsap.to(e.currentTarget, { scale: 1, duration: 0.25, ease: "power2.out" })}
            className="px-5 py-3 sm:px-8 sm:py-5 rounded-full text-sm sm:text-xl font-bold border transition-colors"
            style={{
              opacity: 0,
              transform: "scale(0)",
              backgroundColor: isSelected ? ACCENT : "rgb(var(--ink) / 0.07)",
              color: isSelected ? "#163300" : "rgb(var(--ink) / 0.75)",
              borderColor: isSelected ? "transparent" : "rgb(var(--ink) / 0.1)",
              boxShadow: isSelected
                ? `0 4px 20px ${ACCENT}40`
                : "0 4px 16px rgba(0,0,0,0.4)",
            }}
          >
            {label}
          </button>
        );
      })}
    </div>
  );
}
