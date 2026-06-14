// Selectable accent colors. Each has a slightly brighter shade for dark mode.
// Values are space-separated RGB triplets so they slot into the `--accent`
// CSS variable used throughout the theme.

export interface AccentDef {
  label: string;
  light: string;
  dark: string;
}

export const ACCENTS: Record<string, AccentDef> = {
  teal: { label: "Teal", light: "13 148 136", dark: "20 184 166" },
  green: { label: "Green", light: "22 163 74", dark: "34 197 94" },
  blue: { label: "Blue", light: "37 99 235", dark: "59 130 246" },
  indigo: { label: "Indigo", light: "79 70 229", dark: "99 102 241" },
  purple: { label: "Purple", light: "124 58 237", dark: "139 92 246" },
  pink: { label: "Pink", light: "219 39 119", dark: "236 72 153" },
  red: { label: "Red", light: "220 38 38", dark: "239 68 68" },
  orange: { label: "Orange", light: "234 88 12", dark: "249 115 22" },
  amber: { label: "Amber", light: "217 119 6", dark: "245 158 11" },
};

export const DEFAULT_ACCENT = "teal";

export function accentDef(key: string | undefined): AccentDef {
  return ACCENTS[key ?? ""] ?? ACCENTS[DEFAULT_ACCENT];
}
