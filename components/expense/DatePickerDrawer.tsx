"use client";

import { useState, useEffect, useRef } from "react";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { gsap } from "gsap";

const DAYS = ["Mo", "Tu", "We", "Th", "Fr", "Sa", "Su"];
const MONTHS = [
  "January", "February", "March", "April", "May", "June",
  "July", "August", "September", "October", "November", "December",
];

const ACCENT = "#9FE870";

interface Props {
  open: boolean;
  value: string;
  onChange: (date: string) => void;
  onClose: () => void;
}

function toISO(year: number, month: number, day: number) {
  return `${year}-${String(month + 1).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
}

export default function DatePickerDrawer({ open, value, onChange, onClose }: Props) {
  const today = new Date().toISOString().split("T")[0];
  const initial = value ? new Date(value + "T00:00:00") : new Date();

  const [viewYear, setViewYear] = useState(initial.getFullYear());
  const [viewMonth, setViewMonth] = useState(initial.getMonth());

  const cellRefs = useRef<(HTMLButtonElement | null)[]>([]);
  const headerRef = useRef<HTMLDivElement>(null);
  const rotations = useRef<number[]>([]);

  useEffect(() => {
    if (value) {
      const d = new Date(value + "T00:00:00");
      setViewYear(d.getFullYear());
      setViewMonth(d.getMonth());
    }
  }, [open]);

  const daysInMonth = new Date(viewYear, viewMonth + 1, 0).getDate();
  const firstDow = new Date(viewYear, viewMonth, 1).getDay();
  const offset = firstDow === 0 ? 6 : firstDow - 1;
  const cells: (number | null)[] = [
    ...Array(offset).fill(null),
    ...Array.from({ length: daysInMonth }, (_, i) => i + 1),
  ];
  while (cells.length % 7 !== 0) cells.push(null);

  // Regenerate rotations when cell count changes
  if (rotations.current.length !== cells.length) {
    rotations.current = cells.map(() => (Math.random() - 0.5) * 10);
  }

  function animateCellsIn() {
    const activeCells = cellRefs.current.filter(Boolean) as HTMLButtonElement[];
    const header = headerRef.current;
    if (!activeCells.length) return;

    gsap.killTweensOf([...activeCells, header]);
    gsap.set(activeCells, { scale: 0, opacity: 0 });
    if (header) gsap.set(header, { opacity: 0, y: -6 });

    if (header) gsap.to(header, { opacity: 1, y: 0, duration: 0.3, ease: "power2.out" });

    activeCells.forEach((cell, i) => {
      gsap.to(cell, {
        scale: 1,
        opacity: 1,
        rotation: rotations.current[i] ?? 0,
        duration: 0.45,
        delay: i * 0.018 + gsap.utils.random(-0.01, 0.01),
        ease: "back.out(1.9)",
      });
    });
  }

  useEffect(() => {
    if (open) animateCellsIn();
  }, [open]);

  useEffect(() => {
    if (open) {
      rotations.current = cells.map(() => (Math.random() - 0.5) * 10);
      animateCellsIn();
    }
  }, [viewMonth, viewYear]);

  function prevMonth() {
    if (viewMonth === 0) { setViewMonth(11); setViewYear(y => y - 1); }
    else setViewMonth(m => m - 1);
  }

  function nextMonth() {
    if (viewMonth === 11) { setViewMonth(0); setViewYear(y => y + 1); }
    else setViewMonth(m => m + 1);
  }

  function select(day: number) {
    onChange(toISO(viewYear, viewMonth, day));
    onClose();
  }

  return (
    <div className="px-2 py-3 [overflow:visible]">
      {/* Month nav */}
      <div ref={headerRef} className="flex items-center justify-between mb-3 px-1">
        <button
          onClick={prevMonth}
          className="w-8 h-8 flex items-center justify-center rounded-full border border-ink/10 text-muted hover:text-ink hover:border-ink/30 transition-colors"
        >
          <ChevronLeft size={15} />
        </button>
        <span className="font-sans font-semibold text-ink text-sm">
          {MONTHS[viewMonth]} {viewYear}
        </span>
        <button
          onClick={nextMonth}
          className="w-8 h-8 flex items-center justify-center rounded-full border border-ink/10 text-muted hover:text-ink hover:border-ink/30 transition-colors"
        >
          <ChevronRight size={15} />
        </button>
      </div>

      {/* Day headers */}
      <div className="grid grid-cols-7 mb-2">
        {DAYS.map((d) => (
          <div key={d} className="text-center text-xs font-mono text-muted py-1">
            {d}
          </div>
        ))}
      </div>

      {/* Day grid */}
      <div className="grid grid-cols-7 gap-y-1">
        {cells.map((day, i) => {
          if (!day) return <div key={i} />;
          const iso = toISO(viewYear, viewMonth, day);
          const isSelected = iso === value;
          const isToday = iso === today;

          return (
            <button
              key={`${viewYear}-${viewMonth}-${day}`}
              ref={(el) => { cellRefs.current[i] = el; }}
              onClick={() => select(day)}
              onMouseEnter={(e) => gsap.to(e.currentTarget, { scale: 1.15, duration: 0.2, ease: "back.out(1.5)" })}
              onMouseLeave={(e) => gsap.to(e.currentTarget, { scale: 1, duration: 0.25, ease: "power2.out" })}
              style={{
                opacity: 0,
                transform: "scale(0)",
                backgroundColor: isSelected ? ACCENT : "transparent",
                color: isSelected ? "#163300" : isToday ? "rgb(var(--accent-text))" : "rgb(var(--ink) / 0.8)",
                boxShadow: isSelected ? `0 2px 12px ${ACCENT}40` : undefined,
              }}
              className={`aspect-square flex items-center justify-center rounded-full text-sm font-mono mx-auto w-9 h-9 border transition-colors ${
                isSelected ? "border-transparent font-bold" : isToday ? "border-accent-fill/40" : "border-transparent hover:bg-ink/10"
              }`}
            >
              {day}
            </button>
          );
        })}
      </div>
    </div>
  );
}
