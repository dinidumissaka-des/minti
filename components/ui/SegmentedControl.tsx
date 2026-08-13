"use client";

import { useCallback, useEffect, useLayoutEffect, useRef, useState } from "react";

export interface Segment<T extends string> {
  key: T;
  label: React.ReactNode | ((active: boolean) => React.ReactNode);
  ariaLabel?: string;
}

interface Props<T extends string> {
  items: Segment<T>[];
  value: T;
  onChange: (key: T) => void;
  /** Container. Carries the track look (flat-chip / glass-chip) and its padding. */
  className?: string;
  /** Each button. */
  itemClassName?: string;
  /** The sliding highlight. */
  pillClassName?: string;
  inactiveClassName?: string;
  activeClassName?: string;
  ariaLabel?: string;
  /** Pass null inside an element that already carries the semantics (a <nav>). */
  role?: string | null;
  itemRole?: string | null;
}

interface PillRect {
  left: number;
  top: number;
  width: number;
  height: number;
}

// One highlight that moves between slots, rather than N buttons each toggling
// their own background. The pill is measured off the live DOM instead of
// assuming equal widths, so it stays correct with container padding, wrapped
// labels and font swaps.
export default function SegmentedControl<T extends string>({
  items,
  value,
  onChange,
  className = "",
  itemClassName = "",
  pillClassName = "",
  inactiveClassName = "",
  activeClassName = "",
  ariaLabel,
  role = "tablist",
  itemRole = "tab",
}: Props<T>) {
  const containerRef = useRef<HTMLDivElement>(null);
  const itemRefs = useRef(new Map<T, HTMLButtonElement>());
  const [pill, setPill] = useState<PillRect | null>(null);
  const [ready, setReady] = useState(false);

  const measure = useCallback(() => {
    const el = itemRefs.current.get(value);
    // The selected key can live outside this control (the desktop nav has no
    // Insights segment). Drop the highlight rather than stranding it.
    if (!el) {
      setPill(null);
      return;
    }
    setPill({
      left: el.offsetLeft,
      top: el.offsetTop,
      width: el.offsetWidth,
      height: el.offsetHeight,
    });
  }, [value]);

  useLayoutEffect(() => {
    measure();
  }, [measure, items.length]);

  // The first paint positions the pill; without this it would animate in from
  // the container's origin every time the control mounts.
  useEffect(() => {
    if (!pill || ready) return;
    const id = requestAnimationFrame(() => setReady(true));
    return () => cancelAnimationFrame(id);
  }, [pill, ready]);

  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;
    const ro = new ResizeObserver(measure);
    ro.observe(el);
    return () => ro.disconnect();
  }, [measure]);

  return (
    <div
      ref={containerRef}
      {...(role ? { role } : {})}
      aria-label={ariaLabel}
      className={`relative isolate ${className}`}
    >
      {pill && (
        <span
          aria-hidden="true"
          className={`absolute left-0 top-0 ${pillClassName} ${
            ready ? "transition-[transform,width,height] duration-slow ease-out" : ""
          }`}
          style={{
            width: pill.width,
            height: pill.height,
            transform: `translate3d(${pill.left}px, ${pill.top}px, 0)`,
            zIndex: -1,
          }}
        />
      )}
      {items.map(({ key, label, ariaLabel: itemAriaLabel }) => {
        const active = key === value;
        return (
          <button
            key={key}
            ref={(el) => {
              if (el) itemRefs.current.set(key, el);
              else itemRefs.current.delete(key);
            }}
            {...(itemRole ? { role: itemRole, "aria-selected": active } : {})}
            aria-label={itemAriaLabel}
            onClick={() => onChange(key)}
            className={`${itemClassName} transition-[color,transform] duration-fast active:scale-95 ${
              active ? activeClassName : inactiveClassName
            }`}
          >
            {typeof label === "function" ? label(active) : label}
          </button>
        );
      })}
    </div>
  );
}
