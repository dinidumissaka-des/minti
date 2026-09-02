/**
 * Literal colors for surfaces the CSS layer cannot reach — the PWA manifest,
 * the theme-color meta tag, and the native Capacitor shell. These mirror
 * `--background` and `--accent` in app/globals.css; change both together.
 *
 * `--accent` inverts per theme (the ramp's darkest step on a light ground, its
 * lightest on the dark one), and everything reading this file is the dark
 * shell, so `accent` carries the dark-mode value.
 */
export const BRAND = {
  backgroundDark: "#0c0505",
  accent: "#fdecec",
} as const;
