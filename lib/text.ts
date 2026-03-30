const ACTION_BOUNDARIES = [
  ", then ",
  " then ",
  ", next ",
  " next ",
  " after that ",
  ". ",
];

const FILLER = new Set(["", "then", "next", "and", "make"]);

export const splitCompoundInstruction = (text: string): string[] => {
  const cleaned = text.trim();
  if (!cleaned) return [];

  let normalized = cleaned;
  ACTION_BOUNDARIES.forEach((sep) => {
    const marker = "|~|";
    normalized = normalized.split(sep).join(marker);
  });

  const pieces = normalized
    .split("|~|")
    .map((p) => p.replace(/^[,.\s]+|[,.\s]+$/g, "").trim())
    .filter(Boolean);

  const meaningful = pieces.filter((p) => {
    const lower = p.toLowerCase();
    if (FILLER.has(lower)) return false;
    if (lower.length <= 3) return false;
    return true;
  });

  if (meaningful.length === 0) return [cleaned];
  if (meaningful.length === 1) return meaningful;

  // Ensure each starts with a verb; if not, prepend previous verb when obvious.
  const verbs = ["make", "increase", "decrease", "chain", "slip", "work", "change", "stuff", "cut", "join", "sew", "embroider", "attach", "fasten"];
  let lastVerb = "";
  const repaired = meaningful.map((p) => {
    const lower = p.toLowerCase();
    const verb = verbs.find((v) => lower.startsWith(v));
    if (verb) {
      lastVerb = verb;
      return capitalize(p);
    }
    if (lastVerb) {
      return capitalize(`${lastVerb} ${p}`);
    }
    return capitalize(p);
  });

  // guard against garbage: if any fragment is only filler, bail out to original
  if (repaired.some((p) => FILLER.has(p.toLowerCase()))) {
    return [cleaned];
  }

  return repaired;
};

const capitalize = (s: string) => (s ? s.charAt(0).toUpperCase() + s.slice(1) : s);

export const capitalizeInstruction = capitalize;

const CROCHET_VERBS = [
  "make",
  "chain",
  "increase",
  "decrease",
  "skip",
  "sc",
  "hdc",
  "dc",
  "slip",
  "sl st",
  "work",
  "change",
  "stuff",
  "cut",
  "join",
  "sew",
  "embroider",
  "attach",
  "fasten",
  "repeat",
];

const isFragmentJunk = (text: string): boolean => {
  const lower = text.trim().toLowerCase();
  if (lower.length === 0) return true;
  if (FILLER.has(lower)) return true;
  if (lower.length <= 3) return true;
  if (/^[,.;]+$/.test(lower)) return true;
  return false;
};

export const normalizeInstructionList = (
  instructions: string[],
  originalRowText: string,
): string[] => {
  const cleaned = instructions
    .map((t) => t.trim())
    .filter((t) => !isFragmentJunk(t));

  const hasGoodVerb = (s: string) =>
    CROCHET_VERBS.some((v) => s.toLowerCase().startsWith(v));

  // If any fragment lacks a leading verb and seems like a continuation, merge it with previous.
  const merged: string[] = [];
  for (const item of cleaned) {
    if (merged.length === 0) {
      merged.push(item);
      continue;
    }
    const shouldMerge =
      !hasGoodVerb(item) ||
      item.split(" ").length <= 5 ||
      /^[a-z]/.test(item) ||
      /^(in|the|stitch|space)/i.test(item);

    if (shouldMerge) {
      merged[merged.length - 1] = `${merged[merged.length - 1]} ${item}`.trim();
    } else merged.push(item);
  }

  const finalList = merged
    .map((t) => capitalizeInstruction(t))
    .filter((t) => !isFragmentJunk(t));

  if (finalList.length === 0) {
    return [capitalizeInstruction(originalRowText || "Follow this row as written.")];
  }
  return finalList;
};
