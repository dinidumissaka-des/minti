"use client";

import { useEffect, useRef, useState } from "react";
import { useAnimatedNumber } from "@/hooks/useAnimatedNumber";
import { usePrivacy } from "@/components/PrivacyContext";

interface Props {
  value: number;
  format: (value: number) => string;
  className?: string;
  /** Rendered after the number, inside the same element (a currency suffix). */
  suffix?: React.ReactNode;
  prefix?: string;
}

// Counts to the new figure instead of swapping it. Privacy is handled here too:
// masking blurs the amount out and the bullets back in, so hiding a balance
// reads as concealment rather than as the text being replaced.
export default function AnimatedNumber({ value, format, className = "", suffix, prefix }: Props) {
  const { privacyMode, mask } = usePrivacy();
  const animated = useAnimatedNumber(value);
  const [flipping, setFlipping] = useState(false);
  const mounted = useRef(false);

  useEffect(() => {
    if (!mounted.current) {
      mounted.current = true;
      return;
    }
    setFlipping(true);
    const id = setTimeout(() => setFlipping(false), 180);
    return () => clearTimeout(id);
  }, [privacyMode]);

  return (
    <span
      className={`inline-block transition-[filter,opacity] duration-fast ease-out ${
        flipping ? "blur-[6px] opacity-40" : "blur-0 opacity-100"
      } ${className}`}
    >
      {prefix}
      {mask(format(privacyMode ? value : animated))}
      {suffix}
    </span>
  );
}
