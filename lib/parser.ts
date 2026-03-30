import type { ParsedInstruction, ParsedRow } from "@/types/project";

const STITCH_TERMS: Array<[RegExp, string]> = [
  [/^sl\s*st$/i, "Make a slip stitch"],
  [/^(magic\s+ring|mr)$/i, "Start with a magic ring"],
  [/^sc\s+(\d+)$/i, "Make $1 single crochets"],
  [/^sc$/i, "Make 1 single crochet"],
  [/^inc$/i, "Increase (make 2 stitches in the same stitch)"],
  [/^dec$/i, "Decrease (combine 2 stitches into 1)"],
  [/^ch\s+(\d+)$/i, "Chain $1"],
  [/^ch$/i, "Chain 1"],
  [/^dc\s+(\d+)$/i, "Make $1 double crochets"],
  [/^dc$/i, "Make 1 double crochet"],
  [/^hdc\s+(\d+)$/i, "Make $1 half double crochets"],
  [/^hdc$/i, "Make 1 half double crochet"],
  [/^(tc|tr)\s+(\d+)$/i, "Make $2 treble crochets"],
  [/^(tc|tr)$/i, "Make 1 treble crochet"],
  [/^sk\s+(\d+)$/i, "Skip $1 stitches"],
  [/^sk$/i, "Skip 1 stitch"],
  [/^blo$/i, "Work in the back loop only"],
  [/^flo$/i, "Work in the front loop only"],
];

const normalizeInstruction = (value: string): string =>
  value
    .replace(/\s+/g, " ")
    .replace(/[.;]+$/g, "")
    .trim();

const sentenceCase = (value: string): string =>
  value.charAt(0).toUpperCase() + value.slice(1);

const splitInstructionParts = (text: string): string[] =>
  text
    .split(/,(?![^\[]*\]|[^(]*\))/)
    .map((part) => normalizeInstruction(part))
    .filter(Boolean);

export const extractStitchCount = (rowText: string): number | undefined => {
  const patterns = [
    /\((\d+)\)\s*$/,
    /(\d+)\s*sts?\.?$/i,
    /total\s+(\d+)/i,
    /=\s*(\d+)\s*sts?$/i,
  ];

  for (const pattern of patterns) {
    const match = rowText.match(pattern);
    if (match) {
      return Number(match[1]);
    }
  }

  return undefined;
};

const removeTrailingStitchCount = (rowText: string): string =>
  rowText
    .replace(/\((\d+)\)\s*$/g, "")
    .replace(/(\d+)\s*sts?\.?$/gi, "")
    .replace(/total\s+\d+/gi, "")
    .replace(/=\s*\d+\s*sts?$/gi, "")
    .trim();

const humanizeUnknownInstruction = (rawInstruction: string): string => {
  const cleaned = normalizeInstruction(rawInstruction);
  const expanded = cleaned
    .replace(/\bsts\b/gi, "stitches")
    .replace(/\bst\b/gi, "stitch")
    .replace(/\brep\b/gi, "repeat")
    .replace(/\bsc\b/gi, "single crochet")
    .replace(/\binc\b/gi, "increase")
    .replace(/\bdec\b/gi, "decrease")
    .replace(/\bch\b/gi, "chain")
    .replace(/\bdc\b/gi, "double crochet")
    .replace(/\bhdc\b/gi, "half double crochet")
    .replace(/\bsl st\b/gi, "slip stitch")
    .replace(/\bsk\b/gi, "skip");

  return sentenceCase(expanded);
};

export const humanizeInstruction = (rawInstruction: string): string => {
  const instruction = normalizeInstruction(rawInstruction);

  const repeatMatch = instruction.match(/^\[(.+)\]\s*x\s*(\d+)$/i);
  if (repeatMatch) {
    const repeatedParts = splitInstructionParts(repeatMatch[1]).map((part) =>
      humanizeInstruction(part).toLowerCase(),
    );
    return `Repeat ${repeatMatch[2]} times: ${repeatedParts.join(", then ")}`;
  }

  const repeatWordsMatch = instruction.match(/^rep(?:eat)?\s+(.+?)\s*x\s*(\d+)$/i);
  if (repeatWordsMatch) {
    return `Repeat ${humanizeUnknownInstruction(repeatWordsMatch[1]).toLowerCase()} ${repeatWordsMatch[2]} times`;
  }

  for (const [pattern, replacement] of STITCH_TERMS) {
    if (pattern.test(instruction)) {
      return instruction.replace(pattern, replacement);
    }
  }

  const stitchQualifier = instruction.match(/^(blo|flo)\s+(sc|dc|hdc|tr|tc)\s+(\d+)$/i);
  if (stitchQualifier) {
    const location = stitchQualifier[1].toLowerCase() === "blo" ? "back loop only" : "front loop only";
    const stitchLabel =
      stitchQualifier[2].toLowerCase() === "sc"
        ? "single crochets"
        : stitchQualifier[2].toLowerCase() === "dc"
          ? "double crochets"
          : stitchQualifier[2].toLowerCase() === "hdc"
            ? "half double crochets"
            : "treble crochets";

    return `Make ${stitchQualifier[3]} ${stitchLabel} in the ${location}`;
  }

  return humanizeUnknownInstruction(instruction);
};

export const parseInstruction = (rawInstruction: string, rowNumber: number, instructionIndex: number): ParsedInstruction => {
  const originalText = normalizeInstruction(rawInstruction);

  return {
    id: `row-${rowNumber}-step-${instructionIndex + 1}`,
    text: {
      human: humanizeInstruction(originalText),
      abbreviated: originalText,
    },
    originalText,
  };
};

const extractRowMetadata = (
  rawRowText: string,
  index: number,
): { rowNumber: number; title: string; body: string } => {
  const trimmed = rawRowText.trim();
  const namedRowMatch = trimmed.match(/^(row|round|rnd|r)\s*(\d+)\s*[:.)-]?\s*(.*)$/i);
  if (namedRowMatch) {
    const rowNumber = Number(namedRowMatch[2]);
    const label = namedRowMatch[1].toLowerCase();
    const title = label === "round" || label === "rnd" ? `Round ${rowNumber}` : `Row ${rowNumber}`;

    return {
      rowNumber,
      title,
      body: namedRowMatch[3].trim(),
    };
  }

  const numberedRowMatch = trimmed.match(/^(\d+)\s*[:.)-]\s*(.*)$/i);
  if (numberedRowMatch) {
    const rowNumber = Number(numberedRowMatch[1]);

    return {
      rowNumber,
      title: `Row ${rowNumber}`,
      body: numberedRowMatch[2].trim(),
    };
  }

  return {
    rowNumber: index + 1,
    title: `Row ${index + 1}`,
    body: trimmed,
  };
};

export const parseRow = (rawRowText: string, index: number): ParsedRow => {
  const metadata = extractRowMetadata(rawRowText, index);
  const stitchCount = extractStitchCount(rawRowText);
  const rowBody = removeTrailingStitchCount(metadata.body || rawRowText);
  const instructionParts = splitInstructionParts(rowBody);
  const instructions =
    instructionParts.length > 0
      ? instructionParts.map((instruction, instructionIndex) =>
          parseInstruction(instruction, metadata.rowNumber, instructionIndex),
        )
      : [parseInstruction(rawRowText, metadata.rowNumber, 0)];

  return {
    rowNumber: metadata.rowNumber,
    title: metadata.title,
    stitchCount: stitchCount ?? null,
    instructions,
    originalRowText: rawRowText.trim(),
    repeatGroupId: null,
    repeatIndex: null,
    repeatTotal: null,
  };
};

export const splitPatternIntoRows = (patternText: string): string[] => {
  const cleaned = patternText
    .replace(/\r\n/g, "\n")
    .split("\n")
    .map((line) => line.trim())
    .filter(Boolean);

  if (cleaned.length === 0) {
    return [];
  }

  const rowLikeLines = cleaned.filter((line) =>
    /^(row|round|rnd|r)\s*\d+[:.)-]?/i.test(line) || /^\d+\s*[:.)-]/.test(line),
  );

  if (rowLikeLines.length >= 1) {
    return rowLikeLines;
  }

  const paragraphRows = patternText
    .split(/\n\s*\n/)
    .map((chunk) => chunk.trim())
    .filter(Boolean);

  if (paragraphRows.length > 1) {
    return paragraphRows;
  }

  const sentenceRows = patternText
    .split(/\n/)
    .map((line) => line.trim())
    .filter(Boolean);

  return sentenceRows.length > 0 ? sentenceRows : [patternText.trim()];
};

export const parsePattern = (patternText: string): ParsedRow[] => {
  const rows = splitPatternIntoRows(patternText);

  if (rows.length === 0) {
    return [
      parseRow(patternText.trim() || "Paste a crochet pattern to get started.", 0),
    ];
  }

  return rows.map((row, index) => parseRow(row, index));
};
