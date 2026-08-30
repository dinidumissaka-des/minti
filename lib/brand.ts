/**
 * Literal colors for surfaces the CSS layer cannot reach — the PWA manifest,
 * the theme-color meta tag, the native Capacitor shell, and the iOS launch
 * screen (ios/App/App/Base.lproj/LaunchScreen.storyboard and its Splash
 * imageset, which cannot read this file and hold the same value literally).
 * These mirror `--background` and `--accent` in app/globals.css; change both
 * together.
 */
export const BRAND = {
  backgroundDark: "#190b0b",
  accent: "#9fe870",
} as const;
