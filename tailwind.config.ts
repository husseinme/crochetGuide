import type { Config } from "tailwindcss";

const config: Config = {
  darkMode: "class",
  content: [
    "./app/**/*.{ts,tsx}",
    "./components/**/*.{ts,tsx}",
    "./lib/**/*.{ts,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        surface: "rgb(var(--surface) / <alpha-value>)",
        surfaceElevated: "rgb(var(--surface-elevated) / <alpha-value>)",
        border: "rgb(var(--border) / <alpha-value>)",
        text: "rgb(var(--text) / <alpha-value>)",
        muted: "rgb(var(--muted) / <alpha-value>)",
        mutedStrong: "rgb(var(--muted-strong) / <alpha-value>)",
        accent: "rgb(var(--accent) / <alpha-value>)",
        accentText: "rgb(var(--accent-text) / <alpha-value>)",
        track: "rgb(var(--track) / <alpha-value>)",
        fill: "rgb(var(--fill) / <alpha-value>)",
        overlay: "rgb(var(--overlay) / <alpha-value>)",
      },
      borderRadius: {
        xl2: "1rem",
      },
      boxShadow: {
        panel: "0 6px 24px rgba(15, 23, 42, 0.04)",
      },
    },
  },
  plugins: [],
};

export default config;
