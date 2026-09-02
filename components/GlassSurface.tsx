"use client";

import "./GlassSurface.css";

interface Props {
  children?: React.ReactNode;
  width?: number | string;
  height?: number | string;
  borderRadius?: number;
  className?: string;
  style?: React.CSSProperties;
}

// Still named for the frosted card it used to be. It no longer frosts: the
// surface is an opaque --surface fill, so the SVG displacement map, the
// per-card backdrop-filter, the ResizeObserver that regenerated the map on
// every resize and the WebKit/Firefox capability sniff all went with it —
// none of them were visible behind an opaque background, and each card was
// paying for them. Kept as a component because every card goes through it, so
// the radius and the surface colour stay in one place.
export default function GlassSurface({
  children,
  width = "100%",
  height = "auto",
  borderRadius = 12,
  className = "",
  style = {},
}: Props) {
  return (
    <div
      className={`glass-surface ${className}`}
      style={{
        ...style,
        width: typeof width === "number" ? `${width}px` : width,
        height: typeof height === "number" ? `${height}px` : height,
        borderRadius: `${borderRadius}px`,
      }}
    >
      <div className="glass-surface__content">{children}</div>
    </div>
  );
}
