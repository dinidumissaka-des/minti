/**
 * Literal colors for surfaces the CSS layer cannot reach — the PWA manifest,
 * the theme-color meta tag, and the native Capacitor shell. These mirror
 * `--background` and `--accent` in app/globals.css; change both together.
 */
export const BRAND = {
  backgroundDark: "#2c0203",
  accent: "#9fe870",
} as const;
