/**
 * Literal colors for surfaces the CSS layer cannot reach — the PWA manifest,
 * the theme-color meta tag, and the native Capacitor shell. These mirror
 * `--background` and `--accent` in app/globals.css; change both together.
 */
export const BRAND = {
  backgroundDark: "#0a0f08",
  backgroundLight: "#f7faf3",
  accent: "#ff6200",
} as const;
