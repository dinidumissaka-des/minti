"use client";

import "./Surface.css";

interface Props {
  children?: React.ReactNode;
  width?: number | string;
  height?: number | string;
  borderRadius?: number;
  className?: string;
  style?: React.CSSProperties;
}

// Was GlassSurface. It frosted a translucent fill behind an SVG displacement
// map; when the surface went opaque the map, the per-card backdrop-filter, the
// ResizeObserver that regenerated the map on every resize and the
// WebKit/Firefox capability sniff were all invisible and all still running, so
// they went. What is left is worth a component because every card in the app
// goes through it: the radius and the surface colour stay in one place, and a
// caller can tint the edge by passing borderColor through `style`.
export default function Surface({
  children,
  width = "100%",
  height = "auto",
  borderRadius = 12,
  className = "",
  style = {},
}: Props) {
  return (
    <div
      className={`surface ${className}`}
      style={{
        ...style,
        width: typeof width === "number" ? `${width}px` : width,
        height: typeof height === "number" ? `${height}px` : height,
        borderRadius: `${borderRadius}px`,
      }}
    >
      <div className="surface__content">{children}</div>
    </div>
  );
}
