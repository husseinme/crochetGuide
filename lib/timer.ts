import type { Project } from "@/types/project";

export const nowIso = () => new Date().toISOString();

export const getCurrentElapsedSeconds = (project: Project): number => {
  const base = project.elapsedSeconds || 0;
  if (!project.isTimerRunning || !project.timerStartedAt) return base;
  const start = Date.parse(project.timerStartedAt);
  if (Number.isNaN(start)) return base;
  const diff = Math.max(0, Math.floor((Date.now() - start) / 1000));
  return base + diff;
};

export const formatElapsedTime = (seconds: number): string => {
  const total = Math.max(0, Math.floor(seconds));
  const hrs = Math.floor(total / 3600);
  const mins = Math.floor((total % 3600) / 60);
  const secs = total % 60;
  if (hrs > 0) {
    return `${hrs}h ${mins}m ${secs}s`;
  }
  const mm = mins.toString().padStart(2, "0");
  const ss = secs.toString().padStart(2, "0");
  return `${mm}:${ss}`;
};
