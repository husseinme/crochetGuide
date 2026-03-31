import { inferProjectName } from "@/lib/naming";
import { parsePattern } from "@/lib/parser";
import { splitCompoundInstruction, capitalizeInstruction, normalizeInstructionList } from "@/lib/text";
import type { GeneratedCrochetProject, ParsedInstruction, ParsedPart, ParsedRow, ProjectSummary } from "@/types/project";

const dedupeConsecutive = <T>(items: T[], key: (item: T) => string): T[] => {
  const result: T[] = [];
  let last = "";
  items.forEach((item) => {
    const k = key(item).trim().toLowerCase();
    if (k && k !== last) {
      result.push(item);
      last = k;
    }
  });
  return result;
};

const normalizeInstruction = (raw: any, fallbackId: string, fallbackText: string): ParsedInstruction => {
  const human = typeof raw?.text?.human === "string" ? raw.text.human : typeof raw?.text === "string" ? raw.text : fallbackText;
  const abbreviated = typeof raw?.text?.abbreviated === "string" ? raw.text.abbreviated : human;
  const id = typeof raw?.id === "string" ? raw.id : fallbackId;
  const expanded = splitCompoundInstruction(human).map((t, idx) => ({
    id: idx === 0 ? id : `${id}-p${idx + 1}`,
    text: {
      human: capitalizeInstruction(t),
      abbreviated: capitalizeInstruction(abbreviated),
    },
    originalText: human,
  }));
  const cleaned = normalizeInstructionList(expanded.map((e) => e.text.human), human);
  if (cleaned.length === expanded.length) {
    return dedupeConsecutive(
      expanded.map((e, i) => ({ ...e, text: { human: cleaned[i], abbreviated: e.text.abbreviated || cleaned[i] } })),
      (i) => i.text.human,
    )[0];
  }
  return {
    id,
    text: { human: capitalizeInstruction(human), abbreviated: capitalizeInstruction(abbreviated) },
    originalText: human,
  };
};

const normalizeRow = (raw: any, idx: number): ParsedRow => {
  const rowNumber = typeof raw?.rowNumber === "number" ? raw.rowNumber : idx + 1;
  const orig = typeof raw?.originalRowText === "string" ? raw.originalRowText : "";
  const instructionsRaw: any[] = Array.isArray(raw?.instructions) ? raw.instructions : [];
  const base = instructionsRaw.length
    ? instructionsRaw.map((ins, i: number) => normalizeInstruction(ins, `row-${rowNumber}-step-${i + 1}`, orig || `Row ${rowNumber}`))
    : [normalizeInstruction({}, `row-${rowNumber}-step-1`, orig || `Row ${rowNumber}`)];
  const instructions = dedupeConsecutive(base, (i) => i.text.human);
  return {
    rowNumber,
    title: typeof raw?.title === "string" && raw.title.trim() ? raw.title.trim() : `Row ${rowNumber}`,
    stitchCount: typeof raw?.stitchCount === "number" ? raw.stitchCount : null,
    instructions,
    originalRowText: orig,
    repeatGroupId: raw?.repeatGroupId ?? null,
    repeatIndex: typeof raw?.repeatIndex === "number" ? raw.repeatIndex : null,
    repeatTotal: typeof raw?.repeatTotal === "number" ? raw.repeatTotal : null,
  };
};

const normalizePart = (raw: any, index: number): ParsedPart => {
  const rows: any[] = Array.isArray(raw?.rows) ? raw.rows : [];
  const normalizedRows = rows.map((r, i: number) => normalizeRow(r, i));
  return {
    name: typeof raw?.name === "string" ? raw.name : `Part ${index + 1}`,
    partIndex: typeof raw?.partIndex === "number" ? raw.partIndex : index + 1,
    description: typeof raw?.description === "string" ? raw.description : "",
    details: {
      rowCount: typeof raw?.details?.rowCount === "number" ? raw.details.rowCount : normalizedRows.length,
      notes: Array.isArray(raw?.details?.notes) ? raw.details.notes.filter((n: any) => typeof n === "string") : [],
    },
    rows: normalizedRows,
  };
};

export const normalizeGeminiProject = (
  parsed: any,
  patternText: string,
  fallbackProjectName: string,
): { project: GeneratedCrochetProject; usedFallback: boolean; reason?: string } => {
  const normalizedSummary: ProjectSummary = {
    title: parsed?.summary?.title || fallbackProjectName,
    description: parsed?.summary?.description || "Crochet project",
    difficulty: parsed?.summary?.difficulty ?? null,
    finishedSize: parsed?.summary?.finishedSize ?? null,
    tools: {
      hookSize: parsed?.summary?.tools?.hookSize ?? null,
      yarnType: parsed?.summary?.tools?.yarnType ?? null,
      yarnWeight: parsed?.summary?.tools?.yarnWeight ?? null,
      colors: Array.isArray(parsed?.summary?.tools?.colors)
        ? parsed.summary.tools.colors.map((c: any, idx: number) => ({
            name: typeof c?.name === "string" ? c.name : `Color ${idx + 1}`,
            hex: typeof c?.hex === "string" ? c.hex : "#888888",
          }))
        : [],
    },
    materials: Array.isArray(parsed?.summary?.materials)
      ? parsed.summary.materials.filter((m: any) => typeof m === "string")
      : [],
    skills: Array.isArray(parsed?.summary?.skills)
      ? parsed.summary.skills.filter((m: any) => typeof m === "string")
      : [],
    notes: Array.isArray(parsed?.summary?.notes)
      ? parsed.summary.notes.filter((m: any) => typeof m === "string")
      : [],
  };

  const parts = Array.isArray(parsed?.parts) && parsed.parts.length > 0
    ? parsed.parts.map((p: any, i: number) => normalizePart(p, i))
    : null;

  const rows = !parts
    ? (Array.isArray(parsed?.rows) && parsed.rows.length > 0
        ? (parsed.rows as any[]).map((r, i: number) => normalizeRow(r, i))
        : null)
    : null;

  const project: GeneratedCrochetProject = {
    projectName: typeof parsed?.projectName === "string" && parsed.projectName.trim()
      ? parsed.projectName.trim()
      : inferProjectName(patternText, 0),
    summary: normalizedSummary,
    parts,
    rows,
  };

  if ((!project.parts || project.parts.length === 0) && (!project.rows || project.rows.length === 0)) {
    return { project: buildFallbackProject(patternText, "Generated locally because AI output was unusable."), usedFallback: true, reason: "no rows" };
  }

  return { project, usedFallback: false };
};

// Local fallback imported lazily to avoid cycles
import { buildFallbackProject } from "./fallbackProject";
