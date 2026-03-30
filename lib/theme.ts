"use client";

import type { ThemeMode } from "@/types/project";

export const THEME_STORAGE_KEY = "crochet-guide-theme";

export const resolveTheme = (mode: ThemeMode): "light" | "dark" => {
  if (mode === "system") {
    if (typeof window !== "undefined" && window.matchMedia("(prefers-color-scheme: dark)").matches) {
      return "dark";
    }

    return "light";
  }

  return mode;
};

export const applyTheme = (mode: ThemeMode): void => {
  if (typeof document === "undefined") {
    return;
  }

  const resolvedTheme = resolveTheme(mode);
  const root = document.documentElement;

  root.classList.toggle("dark", resolvedTheme === "dark");
  root.dataset.theme = mode;
};

export const getStoredTheme = (): ThemeMode => {
  if (typeof window === "undefined") {
    return "system";
  }

  const storedTheme = window.localStorage.getItem(THEME_STORAGE_KEY);
  if (storedTheme === "light" || storedTheme === "dark" || storedTheme === "system") {
    return storedTheme;
  }

  return "system";
};

export const persistTheme = (mode: ThemeMode): void => {
  if (typeof window === "undefined") {
    return;
  }

  window.localStorage.setItem(THEME_STORAGE_KEY, mode);
};
