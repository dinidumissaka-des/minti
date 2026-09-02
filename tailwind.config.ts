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
        background: "rgb(var(--background) / <alpha-value>)",
        ink:        "rgb(var(--ink)        / <alpha-value>)",
        scrim:      "rgb(var(--scrim)      / <alpha-value>)",
        sheet:      "rgb(var(--sheet)      / <alpha-value>)",
        muted:      "rgb(var(--ink) / 0.5)",
        brand:        "rgb(var(--brand)       / <alpha-value>)",
        accent:       "rgb(var(--accent-text) / <alpha-value>)",
        "accent-fill":"rgb(var(--accent)      / <alpha-value>)",
        "accent-on":  "rgb(var(--accent-on)   / <alpha-value>)",
        primary:      "rgb(var(--accent)      / <alpha-value>)",
        danger:       "rgb(var(--danger-text) / <alpha-value>)",
        "danger-fill":"rgb(var(--danger)      / <alpha-value>)",
        oxblood: {
          50:  "rgb(var(--oxblood-50)  / <alpha-value>)",
          100: "rgb(var(--oxblood-100) / <alpha-value>)",
          200: "rgb(var(--oxblood-200) / <alpha-value>)",
          300: "rgb(var(--oxblood-300) / <alpha-value>)",
          400: "rgb(var(--oxblood-400) / <alpha-value>)",
          500: "rgb(var(--oxblood-500) / <alpha-value>)",
          600: "rgb(var(--oxblood-600) / <alpha-value>)",
          700: "rgb(var(--oxblood-700) / <alpha-value>)",
          800: "rgb(var(--oxblood-800) / <alpha-value>)",
          900: "rgb(var(--oxblood-900) / <alpha-value>)",
          950: "rgb(var(--oxblood-950) / <alpha-value>)",
          1000:"rgb(var(--oxblood-1000)/ <alpha-value>)",
        },
        // shadcn aliases
        foreground:           "rgb(var(--ink) / 0.88)",
        card:                 { DEFAULT: "rgb(var(--ink) / 0.07)", foreground: "rgb(var(--ink) / 0.88)" },
        popover:              { DEFAULT: "rgb(var(--ink) / 0.12)", foreground: "rgb(var(--ink) / 0.88)" },
        "muted-foreground":   "rgb(var(--ink) / 0.5)",
        "accent-foreground":  "rgb(var(--accent-on) / <alpha-value>)",
        destructive:          { DEFAULT: "rgb(var(--danger) / <alpha-value>)", foreground: "rgb(var(--ink) / 0.88)" },
        input:                "rgb(var(--ink) / 0.13)",
        ring:                 "rgb(var(--accent) / <alpha-value>)",
        "primary-foreground": "rgb(var(--accent-on) / <alpha-value>)",
      },
      // Low-alpha surface steps the design system uses. Tailwind's default
      // opacity scale only goes in fives, so without these the class silently
      // generates nothing.
      opacity: {
        3: "0.03",
        4: "0.04",
        6: "0.06",
        7: "0.07",
        8: "0.08",
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
        md:      "12px",
        lg:      "16px",
        xl:      "20px",
        "2xl":   "24px",
        "3xl":   "32px",
        full:    "9999px",
      },
      // Named layers. Anything overlaying the app belongs on this ladder, so
      // the next overlay is not chosen by guessing a larger number.
      zIndex: {
        background: "0",
        content:    "10",
        "nav-scrim": "45",
        nav:        "50",
        prompt:     "55",
        scrim:      "60",
        drawer:     "70",
        skip:       "200",
        lock:       "300",
      },
      fontSize: {
        // List-row and menu-row body copy: between text-sm (14) and text-base (16).
        body: "15px",
      },
      spacing: {
        control: "52px",
        reveal:  "60px",
      },
      // Motion scale — the CSS variables live in globals.css so JS-driven
      // animations can read the same curves. Durations are named, not numeric:
      // a component asking for `duration-slow` stays correct if the scale moves.
      transitionTimingFunction: {
        out:      "var(--ease-out)",
        spring:   "var(--ease-spring)",
        "in-out": "var(--ease-in-out)",
      },
      transitionDuration: {
        fast:   "var(--dur-fast)",
        base:   "var(--dur-base)",
        slow:   "var(--dur-slow)",
        slower: "var(--dur-slower)",
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
        // Directional view changes. Content enters from the side it came from,
        // so the tab bar and the month arrows both read as movement along a line.
        viewInFwd: {
          "0%":   { opacity: "0", transform: "translate3d(16px, 0, 0)" },
          "100%": { opacity: "1", transform: "translate3d(0, 0, 0)" },
        },
        viewInBack: {
          "0%":   { opacity: "0", transform: "translate3d(-16px, 0, 0)" },
          "100%": { opacity: "1", transform: "translate3d(0, 0, 0)" },
        },
        rowIn: {
          "0%":   { opacity: "0", transform: "translate3d(0, 10px, 0)" },
          "100%": { opacity: "1", transform: "translate3d(0, 0, 0)" },
        },
        popIn: {
          "0%":   { opacity: "0", transform: "scale(0.8)" },
          "60%":  { opacity: "1", transform: "scale(1.04)" },
          "100%": { opacity: "1", transform: "scale(1)" },
        },
      },
      animation: {
        "fade-slide-in": "fadeSlideIn var(--dur-base) var(--ease-out)",
        spin: "spin 3s linear infinite",
        "view-in-fwd":  "viewInFwd var(--dur-slow) var(--ease-out) both",
        "view-in-back": "viewInBack var(--dur-slow) var(--ease-out) both",
        "row-in":       "rowIn var(--dur-base) var(--ease-out) both",
        "pop-in":       "popIn var(--dur-slow) var(--ease-spring) both",
      },
    },
  },
  plugins: [],
};
export default config;
