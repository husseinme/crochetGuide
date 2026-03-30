import type {
  GeneratedCrochetProject,
  InstructionText,
  ParsedInstruction,
  ParsedPart,
  ParsedRow,
  Project,
  ProjectSummary,
  ProjectTools,
  YarnColor,
  GenerationResult,
} from "@/types/project";

const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === "object" && value !== null && !Array.isArray(value);

const isInstructionText = (value: unknown): value is InstructionText =>
  isRecord(value) &&
  typeof value.human === "string" &&
  typeof value.abbreviated === "string";

const isParsedInstruction = (value: unknown): value is ParsedInstruction =>
  isRecord(value) &&
  typeof value.id === "string" &&
  isInstructionText(value.text) &&
  (value.originalText === undefined || typeof value.originalText === "string");

const isParsedRow = (value: unknown): value is ParsedRow =>
  isRecord(value) &&
  typeof value.rowNumber === "number" &&
  typeof value.title === "string" &&
  typeof value.originalRowText === "string" &&
  Array.isArray(value.instructions) &&
  value.instructions.every(isParsedInstruction) &&
  (value.stitchCount === null || typeof value.stitchCount === "number") &&
  (value.repeatGroupId === null || typeof value.repeatGroupId === "string") &&
  (value.repeatIndex === null || typeof value.repeatIndex === "number") &&
  (value.repeatTotal === null || typeof value.repeatTotal === "number");

const isColor = (value: unknown): value is YarnColor =>
  isRecord(value) && typeof value.name === "string" && typeof value.hex === "string";

const isProjectTools = (value: unknown): value is ProjectTools =>
  isRecord(value) &&
  (value.hookSize === null || typeof value.hookSize === "string") &&
  (value.yarnType === null || typeof value.yarnType === "string") &&
  (value.yarnWeight === null || typeof value.yarnWeight === "string") &&
  Array.isArray(value.colors) &&
  value.colors.every(isColor);

const isParsedPart = (value: unknown): value is ParsedPart =>
  isRecord(value) &&
  typeof value.name === "string" &&
  typeof value.partIndex === "number" &&
  typeof value.description === "string" &&
  isRecord(value.details) &&
  typeof value.details.rowCount === "number" &&
  Array.isArray(value.details.notes) &&
  value.details.notes.every((item) => typeof item === "string") &&
  Array.isArray(value.rows) &&
  value.rows.every(isParsedRow);

const isProjectSummary = (value: unknown): value is ProjectSummary =>
  isRecord(value) &&
  typeof value.title === "string" &&
  typeof value.description === "string" &&
  (value.difficulty === null || typeof value.difficulty === "string") &&
  (value.finishedSize === null || typeof value.finishedSize === "string") &&
  isProjectTools(value.tools) &&
  Array.isArray(value.materials) &&
  value.materials.every((item) => typeof item === "string") &&
  Array.isArray(value.skills) &&
  value.skills.every((item) => typeof item === "string") &&
  Array.isArray(value.notes) &&
  value.notes.every((item) => typeof item === "string");

const isGenerationResult = (value: unknown): value is GenerationResult =>
  isRecord(value) &&
  (value.source === "gemini" || value.source === "local") &&
  [
    "success",
    "missing_api_key",
    "empty_ai_response",
    "gemini_error",
    "gemini_timeout",
    "parse_fallback",
  ].includes(value.status as string) &&
  typeof value.message === "string" &&
  typeof value.output === "string" &&
  (value.debug === undefined || typeof value.debug === "string");

export const isGeneratedCrochetProject = (
  value: unknown,
): value is GeneratedCrochetProject =>
  isRecord(value) &&
  typeof value.projectName === "string" &&
  (value.summary === undefined || isProjectSummary(value.summary)) &&
  (value.parts === null || value.parts === undefined || (Array.isArray(value.parts) && value.parts.every(isParsedPart))) &&
  (value.rows === null || value.rows === undefined || (Array.isArray(value.rows) && value.rows.every(isParsedRow)));

export const isProject = (value: unknown): value is Project =>
  isRecord(value) &&
  typeof value.id === "string" &&
  typeof value.name === "string" &&
  typeof value.originalPatternText === "string" &&
  isProjectSummary(value.summary) &&
  (value.generation === undefined || isGenerationResult(value.generation)) &&
  typeof value.hasStarted === "boolean" &&
  isRecord(value.startedSections) &&
  (value.parts === null ||
    value.parts === undefined ||
    (Array.isArray(value.parts) && value.parts.every(isParsedPart))) &&
  Array.isArray(value.parsedRows) &&
  value.parsedRows.every(isParsedRow) &&
  typeof value.currentRow === "number" &&
  isRecord(value.completedSteps) &&
  Object.values(value.completedSteps).every((item) => typeof item === "boolean") &&
  typeof value.totalRows === "number" &&
  typeof value.percentDone === "number" &&
  typeof value.createdAt === "string" &&
  typeof value.updatedAt === "string" &&
  typeof value.instructionStyle === "string" &&
  typeof value.notes === "string" &&
  typeof value.elapsedSeconds === "number" &&
  typeof value.isTimerRunning === "boolean" &&
  (value.timerStartedAt === null || typeof value.timerStartedAt === "string");

export const sanitizeProject = (project: Project): Project => {
  const parsedRows =
    project.parsedRows.length > 0
      ? project.parsedRows
      : (project.parts ?? []).flatMap((part) => part.rows);
  const totalRows = Math.max(parsedRows.length, 1);
  const currentRow = Math.min(Math.max(project.currentRow, 1), totalRows);
  const fallbackSummary = {
    title: project.name,
    description: "Crochet project",
    difficulty: null,
    finishedSize: null,
    tools: {
      hookSize: null,
      yarnType: null,
      yarnWeight: null,
      colors: [],
    },
    materials: [],
    skills: [],
    notes: [],
  };

  return {
    ...project,
    summary: project.summary ?? fallbackSummary,
    generation:
      project.generation ??
      ({
        source: "local",
        status: "parse_fallback",
        message: "Generated locally (legacy project)",
        output: project.originalPatternText ?? "",
      } as GenerationResult),
    hasStarted: project.hasStarted ?? false,
    startedSections: project.startedSections ?? {},
    elapsedSeconds: project.elapsedSeconds ?? 0,
    timerStartedAt: project.timerStartedAt ?? null,
    activeSessionStartedAt: project.activeSessionStartedAt ?? project.timerStartedAt ?? null,
    isTimerRunning: project.isTimerRunning ?? false,
    completedAt: project.completedAt ?? null,
    instructionStyle: project.instructionStyle ?? "human",
    notes: project.notes ?? "",
    parts: project.parts ?? null,
    parsedRows,
    totalRows,
    currentRow,
  };
};
