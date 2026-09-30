/**
 * Faraz Pharmacy Design System
 * Premium, clinical, modern, restrained
 */

export const tokens = {
  colors: {
    light: {
      background: "#F8F9FD",
      surface: "#FFFFFF",
      elevated: "#FFFFFF",
      text: "#0F172A",
      muted: "#64748B",
      border: "#E2E8F0",
      primary: "#3612B8",
      primaryHover: "#2A0E94",
      accent: "#3612B8",
    },
    dark: {
      background: "#0B0D14",
      surface: "#131620",
      elevated: "#1A1E2C",
      text: "#F8FAFC",
      muted: "#94A3B8",
      border: "#232938",
      primary: "#4A25E1",
      primaryHover: "#3612B8",
      accent: "#6236FF",
    },
    semantic: {
      success: "#16A34A",
      warning: "#D97706",
      danger: "#DC2626",
      info: "#3612B8",
    },
  },

  animation: {
    hover: "100-150ms",
    dropdown: "150-200ms",
    modal: "150-200ms",
    toast: "200ms",
  },

  principles: {
    style: "premium, clinical, modern, restrained",
    typography: "Inter / Inter Tight / JetBrains Mono",
    interaction: "keyboard-first",
    pos: "optimized for barcode scanning and rapid transactions",
    dashboard: "operationally useful, not decorative",
    tables: "dense data, generous row height",
    animation: "subtle and functional",
  },
} as const;

export type DesignTokens = typeof tokens;
