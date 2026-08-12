"use client";

import dynamic from "next/dynamic";
import { useTheme } from "@/components/ThemeContext";
import { BRAND } from "@/lib/brand";

const LightRays = dynamic(() => import("@/components/background/LightRays"), { ssr: false });

export default function AppBackground() {
  const { theme } = useTheme();
  const isLight = theme === "light";

  return (
    <div
      className="fixed z-background bg-background"
      style={{ inset: 0, top: "calc(-1 * env(safe-area-inset-top))" }}
    >
      <div style={{ width: "100%", height: "100%", opacity: isLight ? 0.3 : 1, transition: "opacity 0.3s ease" }}>
        <LightRays
          raysOrigin="top-center"
          raysColor={BRAND.accent}
          raysSpeed={1.2}
          lightSpread={0.9}
          rayLength={1.4}
          followMouse={true}
          mouseInfluence={0.12}
          noiseAmount={0.08}
          distortion={0.03}
          fadeDistance={1.2}
          saturation={isLight ? 0.5 : 0.9}
        />
      </div>
    </div>
  );
}
