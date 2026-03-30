import type { ParsedPart, ParsedRow, Project } from "@/types/project";

export const flattenPartsToRows = (parts: ParsedPart[] | null): ParsedRow[] =>
  parts ? parts.flatMap((part) => part.rows) : [];

export const getPartRowRange = (parts: ParsedPart[], globalRowIndex: number) => {
  let start = 0;
  for (const part of parts) {
    const end = start + part.rows.length;
    if (globalRowIndex >= start && globalRowIndex < end) {
      return { part, indexInPart: globalRowIndex - start };
    }
    start = end;
  }
  return null;
};

export const getProjectRows = (project: Project): ParsedRow[] =>
  project.parsedRows.length > 0 ? project.parsedRows : flattenPartsToRows(project.parts);

export const getInstructionCounts = (
  project: Project,
): { total: number; completed: number } => {
  const rows = getProjectRows(project);
  const allInstructions = rows.flatMap((row) => row.instructions);
  const total = allInstructions.length;
  const completed = allInstructions.filter(
    (instruction) => project.completedSteps[instruction.id],
  ).length;
  return { total, completed };
};

export const getPartInstructionProgress = (
  part: ParsedPart,
  completedSteps: Record<string, boolean>,
): { total: number; completed: number; percent: number } => {
  const instructions = part.rows.flatMap((row) => row.instructions);
  const total = instructions.length;
  const completed = instructions.filter((instruction) => completedSteps[instruction.id]).length;
  const percent = total > 0 ? Math.round((completed / total) * 100) : 0;
  return { total, completed, percent };
};

export const getCurrentRow = (project: Project): ParsedRow =>
  getProjectRows(project)[
    Math.min(Math.max(project.currentRow - 1, 0), getProjectRows(project).length - 1)
  ];

export const getCurrentPart = (
  project: Project,
): { part: ParsedPart; rowIndexInPart: number } | null => {
  if (!project.parts || project.parts.length === 0) {
    return null;
  }

  const match = getPartRowRange(project.parts, project.currentRow - 1);
  return match
    ? {
        part: match.part,
        rowIndexInPart: match.indexInPart + 1,
      }
    : null;
};

export const isRowComplete = (
  row: ParsedRow | undefined,
  completedSteps: Record<string, boolean>,
): boolean => {
  if (!row) {
    return false;
  }

  if (row.instructions.length === 0) {
    return false;
  }

  return row.instructions.every((instruction) => Boolean(completedSteps[instruction.id]));
};

export const getNextUnfinishedInstructionId = (
  row: ParsedRow | undefined,
  completedSteps: Record<string, boolean>,
): string | null => {
  if (!row) {
    return null;
  }

  const nextInstruction = row.instructions.find(
    (instruction) => !completedSteps[instruction.id],
  );

  return nextInstruction?.id ?? null;
};

export const calculatePercentDone = (project: Project): number => {
  const { total, completed } = getInstructionCounts(project);
  if (total === 0) {
    return 0;
  }

  return Math.round((completed / total) * 100);
};

export const calculateRowsLeft = (project: Project): number =>
  Math.max(project.totalRows - project.currentRow, 0);

export const calculateRowProgress = (project: Project): number => {
  return calculatePercentDone(project);
};

export const getProjectSegments = (
  project: Project,
  completedSteps: Record<string, boolean>,
): { label: string; percent: number }[] => {
  if (project.parts && project.parts.length > 0) {
    const totals = project.parts.map((part) => getPartInstructionProgress(part, completedSteps));
    const grandTotal = totals.reduce((sum, t) => sum + t.total, 0) || 1;
    let cumulative = 0;
    return project.parts.map((part, index) => {
      const { completed, total } = totals[index];
      cumulative += total;
      return {
        label: part.name,
        percent: Math.round((completed / grandTotal) * 100),
      };
    });
  }

  const { completed, total } = getInstructionCounts(project);
  return [
    {
      label: "Project",
      percent: total > 0 ? Math.round((completed / total) * 100) : 0,
    },
  ];
};
