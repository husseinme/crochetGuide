import { generateCrochetProject } from "@/lib/gemini";
import { inferProjectName } from "@/lib/naming";
import { flattenPartsToRows } from "@/lib/projectUtils";
import type { GeneratedCrochetProject, Project } from "@/types/project";

const createProjectId = () =>
  `project-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;

const resolveRows = (generated: GeneratedCrochetProject) =>
  generated.parts ? flattenPartsToRows(generated.parts) : generated.rows ?? [];

export async function buildProjectFromPattern(
  patternText: string,
  existingProjectCount: number,
): Promise<Project> {
  const trimmedPattern = patternText.trim();
  const generated = await generateCrochetProject(trimmedPattern);
  const parsedRows = resolveRows(generated);
  const now = new Date().toISOString();

  return {
    id: createProjectId(),
    name:
      generated.projectName.trim() || inferProjectName(trimmedPattern, existingProjectCount),
    originalPatternText: trimmedPattern,
    summary: generated.summary,
    hasStarted: false,
    startedSections: {},
    elapsedSeconds: 0,
    timerStartedAt: null,
    activeSessionStartedAt: null,
    isTimerRunning: false,
    completedAt: null,
    instructionStyle: "human",
    notes: "",
    parts: generated.parts,
    parsedRows,
    currentRow: 1,
    completedSteps: {},
    totalRows: parsedRows.length,
    percentDone: 0,
    createdAt: now,
    updatedAt: now,
  };
}
