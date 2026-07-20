import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./components/**/*.{js,ts,jsx,tsx,mdx}",
    "./app/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      colors: {
        background: "rgb(10 15 8)",
        surface:    "rgba(255, 255, 255, 0.07)",
        surface2:   "rgba(255, 255, 255, 0.12)",
        border:     "rgba(255, 255, 255, 0.10)",
        text:       "rgba(255, 255, 255, 0.88)",
        muted:      "rgba(255, 255, 255, 0.5)",
        accent:     "rgb(var(--accent)    / <alpha-value>)",
        "accent-on":"rgb(var(--accent-on) / <alpha-value>)",
        primary:    "rgb(var(--accent)    / <alpha-value>)",
        danger:     "rgb(var(--danger)    / <alpha-value>)",
        tertiary:   "#00B67A",
        // shadcn aliases
        foreground:           "rgba(255, 255, 255, 0.88)",
        card:                 { DEFAULT: "rgba(255, 255, 255, 0.07)", foreground: "rgba(255, 255, 255, 0.88)" },
        popover:              { DEFAULT: "rgba(255, 255, 255, 0.12)", foreground: "rgba(255, 255, 255, 0.88)" },
        "muted-foreground":   "rgba(255, 255, 255, 0.5)",
        "accent-foreground":  "rgb(var(--accent-on) / <alpha-value>)",
        destructive:          { DEFAULT: "rgb(var(--danger) / <alpha-value>)", foreground: "rgba(255, 255, 255, 0.88)" },
        input:                "rgba(255, 255, 255, 0.13)",
        ring:                 "rgb(var(--accent) / <alpha-value>)",
        "primary-foreground": "rgb(var(--accent-on) / <alpha-value>)",
      },
      fontFamily: {
        serif:     ["var(--font-manrope)", "sans-serif"],
        sans:      ["var(--font-manrope)", "sans-serif"],
        mono:      ["var(--font-manrope)", "sans-serif"],
        fraunces:  ["var(--font-fraunces)", "Fraunces", "serif"],
      },
      borderRadius: {
        none:    "0",
        sm:      "6px",
        DEFAULT: "10px",
        md:      "16px",
        lg:      "16px",
        xl:      "20px",
        "2xl":   "24px",
        "3xl":   "32px",
        full:    "9999px",
      },
      keyframes: {
        fadeSlideIn: {
          "0%":   { opacity: "0", transform: "translateY(8px)" },
          "100%": { opacity: "1", transform: "translateY(0)" },
        },
        spin: {
          "0%":   { transform: "rotate(0deg)" },
          "100%": { transform: "rotate(360deg)" },
        },
        fluidBg: {
          "0%":   { backgroundPosition: "0% 50%" },
          "50%":  { backgroundPosition: "100% 50%" },
          "100%": { backgroundPosition: "0% 50%" },
        },
        glassSheen: {
          "0%":   { transform: "translateX(-100%) skewX(-15deg)", opacity: "0" },
          "30%":  { opacity: "1" },
          "70%":  { opacity: "1" },
          "100%": { transform: "translateX(300%) skewX(-15deg)", opacity: "0" },
        },
      },
      animation: {
        "fade-slide-in": "fadeSlideIn 220ms ease-out",
        spin: "spin 3s linear infinite",
        "fluid-bg": "fluidBg 4s ease infinite",
        "glass-sheen": "glassSheen 3.5s ease-in-out infinite",
      },
    },
  },
  plugins: [],
};
export default config;
