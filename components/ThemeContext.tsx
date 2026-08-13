"use client";

import { createContext, useContext, useState, useCallback, useEffect } from "react";
import { flushSync } from "react-dom";

type Theme = "light" | "dark";

interface ThemeContextType {
  theme: Theme;
  /** Origin, in viewport pixels, for the reveal — normally the toggle's center. */
  toggleTheme: (origin?: { x: number; y: number }) => void;
}

const ThemeContext = createContext<ThemeContextType>({
  theme: "dark",
  toggleTheme: () => {},
});

type ViewTransitionDocument = Document & {
  startViewTransition?: (callback: () => void) => { finished: Promise<void> };
};

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  const [theme, setTheme] = useState<Theme>("dark");

  useEffect(() => {
    setTheme(document.documentElement.classList.contains("light") ? "light" : "dark");

    if (localStorage.getItem("minti_theme")) return;

    const mq = window.matchMedia("(prefers-color-scheme: light)");
    const handler = (e: MediaQueryListEvent) => {
      if (localStorage.getItem("minti_theme")) return;
      setTheme(e.matches ? "light" : "dark");
      document.documentElement.classList.toggle("light", e.matches);
    };
    mq.addEventListener("change", handler);
    return () => mq.removeEventListener("change", handler);
  }, []);

  const toggleTheme = useCallback((origin?: { x: number; y: number }) => {
    const apply = () => {
      setTheme((prev) => {
        const next: Theme = prev === "dark" ? "light" : "dark";
        localStorage.setItem("minti_theme", next);
        document.documentElement.classList.toggle("light", next === "light");
        return next;
      });
    };

    const doc = document as ViewTransitionDocument;
    const reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    if (!doc.startViewTransition || reduced) {
      apply();
      return;
    }

    // The incoming theme is clipped in as a circle from the button that was
    // pressed, so the switch has a source instead of repainting everywhere at once.
    const root = document.documentElement;
    root.style.setProperty("--theme-origin-x", origin ? `${origin.x}px` : "50%");
    root.style.setProperty("--theme-origin-y", origin ? `${origin.y}px` : "50%");

    // flushSync so the class lands inside the transition's capture window;
    // React would otherwise batch it out of the snapshot.
    doc.startViewTransition(() => flushSync(apply));
  }, []);

  return (
    <ThemeContext.Provider value={{ theme, toggleTheme }}>
      {children}
    </ThemeContext.Provider>
  );
}

export function useTheme() {
  return useContext(ThemeContext);
}
