"use client";

import { useState } from "react";
import { ChevronLeft, ChevronRight, Check } from "lucide-react";
import { CATEGORY_COLORS } from "@/lib/categories";
import ViewTransition from "@/components/ui/ViewTransition";

const MONTH_NAMES = ["January","February","March","April","May","June","July","August","September","October","November","December"];
const DAY_LABELS = ["Mo","Tu","We","Th","Fr","Sa","Su"];

// ─── Calendar Picker ──────────────────────────────────────────────────────────

export function CalendarPicker({ value, onChange, onClose }: { value: string; onChange: (d: string) => void; onClose: () => void }) {
  const initial = value ? new Date(value + "T00:00:00") : new Date();
  const [viewYear, setViewYear] = useState(initial.getFullYear());
  const [viewMonth, setViewMonth] = useState(initial.getMonth());
  const [dir, setDir] = useState(1);
  const todayISO = new Date().toISOString().split("T")[0];

  const daysInMonth = new Date(viewYear, viewMonth + 1, 0).getDate();
  const firstDow = new Date(viewYear, viewMonth, 1).getDay();
  const offset = firstDow === 0 ? 6 : firstDow - 1;
  const cells: (number | null)[] = [
    ...Array(offset).fill(null),
    ...Array.from({ length: daysInMonth }, (_, i) => i + 1),
  ];
  while (cells.length % 7 !== 0) cells.push(null);

  function toISO(day: number) {
    return `${viewYear}-${String(viewMonth + 1).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
  }

  function prevMonth() {
    setDir(-1);
    if (viewMonth === 0) { setViewMonth(11); setViewYear(y => y - 1); }
    else setViewMonth(m => m - 1);
  }

  function nextMonth() {
    setDir(1);
    if (viewMonth === 11) { setViewMonth(0); setViewYear(y => y + 1); }
    else setViewMonth(m => m + 1);
  }

  return (
    <div className="px-3 pb-2">
      <div className="flex items-center justify-between mb-4">
        <button onClick={prevMonth} aria-label="Previous month" className="w-10 h-10 flex items-center justify-center rounded-full bg-ink/7 text-ink/60 hover:text-ink transition-[color,transform] duration-fast active:scale-90">
          <ChevronLeft size={16} />
        </button>
        <span className="font-sans font-semibold text-ink text-base overflow-hidden">
          <ViewTransition trigger={`${viewYear}-${viewMonth}`} direction={dir} className="block">
            {MONTH_NAMES[viewMonth]} {viewYear}
          </ViewTransition>
        </span>
        <button onClick={nextMonth} aria-label="Next month" className="w-10 h-10 flex items-center justify-center rounded-full bg-ink/7 text-ink/60 hover:text-ink transition-[color,transform] duration-fast active:scale-90">
          <ChevronRight size={16} />
        </button>
      </div>

      <div className="grid grid-cols-7 mb-1">
        {DAY_LABELS.map(d => (
          <div key={d} className="text-center text-xs font-mono text-ink/50 py-1">{d}</div>
        ))}
      </div>

      <ViewTransition trigger={`${viewYear}-${viewMonth}`} direction={dir} className="grid grid-cols-7 gap-y-1">
        {cells.map((day, i) => {
          if (!day) return <div key={i} />;
          const iso = toISO(day);
          const isSelected = iso === value;
          const isToday = iso === todayISO;
          return (
            <button
              key={iso}
              onClick={() => { onChange(iso); onClose(); }}
              className={`aspect-square flex items-center justify-center rounded-full text-body font-mono mx-auto w-10 h-10 transition-[color,background-color,border-color,transform] duration-fast active:scale-90 ${
                isSelected
                  ? "bg-accent-fill text-accent-on font-bold"
                  : isToday
                  ? "border border-accent/50 text-accent"
                  : "text-ink/80 hover:bg-ink/10"
              }`}
            >
              {day}
            </button>
          );
        })}
      </ViewTransition>
    </div>
  );
}

// ─── Category List ────────────────────────────────────────────────────────────

export function CategoryList({
  selected,
  onSelect,
  extraOptions,
}: {
  selected: string;
  onSelect: (cat: string) => void;
  extraOptions?: { value: string; label: string }[];
}) {
  return (
    <div className="flex flex-col px-1">
      {Object.keys(CATEGORY_COLORS).map(cat => (
        <button
          key={cat}
          onClick={() => onSelect(cat)}
          className={`flex items-center gap-3 px-4 py-4 rounded-xl text-left transition-[color,background-color,transform] duration-fast active:scale-[0.98] ${selected === cat ? "bg-ink/10" : "hover:bg-ink/5"}`}
        >
          <span className="flex-1 text-body font-sans text-ink">{cat}</span>
          {selected === cat && <Check size={15} className="flex-shrink-0 text-accent" />}
        </button>
      ))}
      {extraOptions?.map(({ value, label }) => (
        <button
          key={value}
          onClick={() => onSelect(value)}
          className={`flex items-center gap-3 px-4 py-4 rounded-xl text-left transition-[color,background-color,transform] duration-fast active:scale-[0.98] ${selected === value ? "bg-ink/10" : "hover:bg-ink/5"}`}
        >
          <span className="flex-1 text-body font-sans text-ink/60">{label}</span>
          {selected === value && <Check size={15} className="flex-shrink-0 text-accent" />}
        </button>
      ))}
    </div>
  );
}

// ─── Source List (for income sources) ────────────────────────────────────────

export function SourceList({ sources, selected, onSelect }: { sources: string[]; selected: string; onSelect: (s: string) => void }) {
  return (
    <div className="flex flex-col px-1">
      {sources.map(source => (
        <button
          key={source}
          onClick={() => onSelect(source)}
          className={`flex items-center gap-3 px-4 py-4 rounded-xl text-left transition-[color,background-color,transform] duration-fast active:scale-[0.98] ${selected === source ? "bg-ink/10" : "hover:bg-ink/5"}`}
        >
          <span className="flex-1 text-body font-sans text-ink">{source}</span>
          {selected === source && <Check size={15} className="flex-shrink-0 text-accent" />}
        </button>
      ))}
    </div>
  );
}
