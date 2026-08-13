"use client";

import { useEffect, useState } from "react";

// Keep in step with the duration class below.
const COLLAPSE_MS = 320;

interface Props {
  open: boolean;
  children: React.ReactNode;
  className?: string;
}

// grid-template-rows 0fr→1fr rather than max-height: it animates to the
// content's real height, so there is no magic pixel cap to outgrow.
//
// Unmounts once closed. A permanently mounted zero-height child still earns a
// gap from a flex-gap parent, which would leave dead space under every closed
// form.
export default function Collapse({ open, children, className = "" }: Props) {
  const [mounted, setMounted] = useState(open);
  const [expanded, setExpanded] = useState(open);

  useEffect(() => {
    if (open) {
      setMounted(true);
      // Expand on the frame after mount, or there is no start value to animate from.
      const frame = requestAnimationFrame(() => setExpanded(true));
      return () => cancelAnimationFrame(frame);
    }
    setExpanded(false);
    const timer = setTimeout(() => setMounted(false), COLLAPSE_MS);
    return () => clearTimeout(timer);
  }, [open]);

  if (!mounted) return null;

  return (
    <div
      className={`grid transition-[grid-template-rows,opacity] duration-slow ease-out ${
        expanded ? "grid-rows-[1fr] opacity-100" : "grid-rows-[0fr] opacity-0"
      } ${className}`}
    >
      <div className="min-h-0 overflow-hidden">{children}</div>
    </div>
  );
}
