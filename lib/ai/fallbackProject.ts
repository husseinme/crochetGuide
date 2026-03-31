import { inferProjectName } from "@/lib/naming";
import { parsePattern } from "@/lib/parser";
import { normalizeInstructionList, splitCompoundInstruction, capitalizeInstruction } from "@/lib/text";
import type { GeneratedCrochetProject, ParsedInstruction, ParsedRow } from "@/types/project";

const normalizeInstruction = (text: string, id: string): ParsedInstruction => {
  const splits = splitCompoundInstruction(text);
  const cleaned = normalizeInstructionList(splits, text);
  const human = cleaned[0] || text;
  return {
    id,
    text: { human: capitalizeInstruction(human), abbreviated: capitalizeInstruction(human) },
    originalText: text,
  };
};

const normalizeRow = (rowText: string, index: number): ParsedRow => {
  const instruction = normalizeInstruction(rowText, `row-${index + 1}-step-1`);
  return {
    rowNumber: index + 1,
    title: `Row ${index + 1}`,
    stitchCount: null,
    instructions: [instruction],
    originalRowText: rowText,
    repeatGroupId: null,
    repeatIndex: null,
    repeatTotal: null,
  };
};

export const buildFallbackProject = (
  patternText: string,
  description = "Generated locally because AI response was unavailable.",
): GeneratedCrochetProject => {
  const rowsParsed = parsePattern(patternText);
  const rows = rowsParsed.length
    ? rowsParsed.map((r, idx) => normalizeRow(r.originalRowText || r.title || `Row ${idx + 1}`, idx))
    : [normalizeRow(patternText || "Pattern", 0)];

  return {
    projectName: inferProjectName(patternText, 0),
    summary: {
      title: inferProjectName(patternText, 0),
      description,
      difficulty: null,
      finishedSize: null,
      tools: { hookSize: null, yarnType: null, yarnWeight: null, colors: [] },
      materials: [],
      skills: [],
      notes: [],
    },
    parts: null,
    rows,
  };
};

