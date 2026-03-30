"use client";

import { useEffect, useState } from "react";
import { applyTheme, getStoredTheme, persistTheme } from "@/lib/theme";
import type { ThemeMode } from "@/types/project";

const MODES: ThemeMode[] = ["system", "light", "dark"];

export function ThemeToggle() {
  const [mode, setMode] = useState<ThemeMode>("system");

  useEffect(() => {
    const initialMode = getStoredTheme();
    setMode(initialMode);
    applyTheme(initialMode);
  }, []);

  useEffect(() => {
    const mediaQuery = window.matchMedia("(prefers-color-scheme: dark)");
    const handleChange = () => {
      const currentMode = getStoredTheme();
      if (currentMode === "system") {
        applyTheme("system");
      }
    };

    mediaQuery.addEventListener("change", handleChange);
    return () => mediaQuery.removeEventListener("change", handleChange);
  }, []);

  const cycleMode = () => {
    const nextMode = MODES[(MODES.indexOf(mode) + 1) % MODES.length];
    setMode(nextMode);
    persistTheme(nextMode);
    applyTheme(nextMode);
  };

  return (
    <button
      type="button"
      onClick={cycleMode}
      className="rounded-2xl border border-border px-3 py-2 text-sm font-medium text-mutedStrong transition hover:text-text"
      aria-label={`Theme: ${mode}`}
    >
      {mode === "system" ? "System" : mode === "light" ? "Light" : "Dark"}
    </button>
  );
}
