export const CATEGORY_COLORS_DARK: Record<string, string> = {
  "Food & Dining": "#9FE870",
  Grocery:         "#c8f55a",
  Transport:       "#00B67A",
  Shopping:        "#f5c85a",
  Entertainment:   "#f55adb",
  Health:          "#5a9cf5",
  Utilities:       "#f5885a",
  Travel:          "#a55af5",
  Education:       "#5af5a8",
};

export const CATEGORY_COLORS_LIGHT: Record<string, string> = {
  "Food & Dining": "#4a8a2f",
  Grocery:         "#6b8a1a",
  Transport:       "#00875f",
  Shopping:        "#a3781a",
  Entertainment:   "#b3269e",
  Health:          "#2f6bc4",
  Utilities:       "#c1591a",
  Travel:          "#7a2fc4",
  Education:       "#1f9c6b",
};

// Kept for any remaining direct references — defaults to the dark palette.
export const CATEGORY_COLORS = CATEGORY_COLORS_DARK;

export function getCategoryColor(category: string, theme: "light" | "dark"): string | undefined {
  const palette = theme === "light" ? CATEGORY_COLORS_LIGHT : CATEGORY_COLORS_DARK;
  return palette[category];
}

export const OTHER_CATEGORY_COLOR: Record<"light" | "dark", string> = {
  dark:  "#ffffff33",
  light: "#0f170b33",
};
