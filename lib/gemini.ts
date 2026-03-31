import { inferProjectName } from "@/lib/naming";
import { parsePattern } from "@/lib/parser";
import { isGeneratedCrochetProject } from "@/lib/validation";
import { splitCompoundInstruction, capitalizeInstruction, normalizeInstructionList } from "@/lib/text";
import type {
  GeneratedCrochetProject,
  GenerationResult,
  ParsedInstruction,
  ParsedPart,
  ParsedRow,
  ProjectSummary,
} from "@/types/project";

const GEMINI_API_URL =
  "https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent";
const DEFAULT_MAX_RETRIES = 2;
// Timeout disabled per user request; keep constant in case we need to restore quickly.
const REQUEST_TIMEOUT_MS = 0;

const CROCHET_PROJECT_SCHEMA = {
  type: "object",
  properties: {
    projectName: {
      type: "string",
      description:
        "Project name inferred from the pattern. Use a real title if present, otherwise a concise descriptive name.",
    },
    summary: {
      type: "object",
      properties: {
        title: { type: "string" },
        description: { type: "string" },
        difficulty: { type: ["string", "null"] },
        finishedSize: { type: ["string", "null"] },
        tools: {
          type: "object",
          properties: {
            hookSize: { type: ["string", "null"] },
            yarnType: { type: ["string", "null"] },
            yarnWeight: { type: ["string", "null"] },
            colors: {
              type: "array",
              items: {
                type: "object",
                properties: {
                  name: { type: "string" },
                  hex: { type: "string" },
                },
                required: ["name", "hex"],
              },
            },
          },
          required: ["hookSize", "yarnType", "yarnWeight", "colors"],
        },
        materials: { type: "array", items: { type: "string" } },
        skills: { type: "array", items: { type: "string" } },
        notes: { type: "array", items: { type: "string" } },
      },
      required: [
        "title",
        "description",
        "difficulty",
        "finishedSize",
        "tools",
        "materials",
        "skills",
        "notes",
      ],
    },
    parts: {
      type: ["array", "null"],
      description:
        "Only include real named pattern parts that actually exist in the pattern, such as Head, Body, Arms, Border, or Assembly. Do not invent generic sections.",
      items: {
        type: "object",
        properties: {
          name: { type: "string" },
          partIndex: { type: "integer" },
          description: { type: "string" },
          details: {
            type: "object",
            properties: {
              rowCount: { type: "integer" },
              notes: { type: "array", items: { type: "string" } },
            },
            required: ["rowCount", "notes"],
          },
          rows: {
            type: "array",
            items: {
              type: "object",
              properties: {
                rowNumber: { type: "integer" },
                title: { type: "string" },
                stitchCount: { type: ["integer", "null"] },
                instructions: {
                  type: "array",
                  items: {
                    type: "object",
                    properties: {
                      id: { type: "string" },
                      text: {
                        type: "object",
                        properties: {
                          human: { type: "string" },
                          abbreviated: { type: "string" },
                        },
                        required: ["human", "abbreviated"],
                      },
                    },
                    required: ["id", "text"],
                  },
                },
                originalRowText: { type: "string" },
                repeatGroupId: { type: ["string", "null"] },
                repeatIndex: { type: ["integer", "null"] },
                repeatTotal: { type: ["integer", "null"] },
              },
              required: [
                "rowNumber",
                "title",
                "stitchCount",
                "instructions",
                "originalRowText",
                "repeatGroupId",
                "repeatIndex",
                "repeatTotal",
              ],
            },
          },
        },
        required: ["name", "partIndex", "description", "details", "rows"],
      },
    },
    rows: {
      type: "array",
      description:
        "Use this only when the pattern does not clearly contain real named parts.",
      items: {
        type: "object",
        properties: {
          rowNumber: { type: "integer" },
          title: { type: "string" },
          stitchCount: { type: ["integer", "null"] },
          instructions: {
            type: "array",
            items: {
              type: "object",
              properties: {
                id: { type: "string" },
                text: {
                  type: "object",
                  properties: {
                    human: { type: "string" },
                    abbreviated: { type: "string" },
                  },
                  required: ["human", "abbreviated"],
                },
              },
              required: ["id", "text"],
            },
          },
          originalRowText: { type: "string" },
          repeatGroupId: { type: ["string", "null"] },
          repeatIndex: { type: ["integer", "null"] },
          repeatTotal: { type: ["integer", "null"] },
        },
        required: [
          "rowNumber",
          "title",
          "stitchCount",
          "instructions",
          "originalRowText",
          "repeatGroupId",
          "repeatIndex",
          "repeatTotal",
        ],
      },
    },
  },
  required: ["projectName", "summary", "parts", "rows"],
} as const;

const GEMINI_PROMPT = `Convert this LONG crochet pattern into structured JSON.

Return JSON only (no markdown). Keys required: projectName, summary, parts or rows, repeat metadata, instructions with text.human and text.abbreviated.

Important cleanup rules:
- Ignore copyright, promotional text, repeated headers/footers, website/order info, duplicate title blocks, abbreviation glossaries, and disclaimers.
- Keep only content that directly helps crochet the project: title, materials/tools, notes that affect execution, named sections (e.g., BOTTLE COZY, STRAP, FINISHING), and the actual rows/rounds.

Row and repeat rules:
- Detect and expand finite repeats such as "Rnds 26-33: Rep Rnd 18-25" or "Rnds 34 and 35: Rep Rnd 18 twice" into explicit rows with repeat metadata (repeatGroupId, repeatIndex, repeatTotal).
- For open-ended repeats like "Rep Row 2 until desired length", do NOT invent counts; keep a repeatable instruction row that explains the condition.
- Preserve real section names; only use parts when the pattern names them. Otherwise set parts=null and use rows.

Instruction rules:
- Each instruction must be a complete, standalone action; no orphan fragments. Provide text.human (clear) and text.abbreviated (concise shorthand).
- Interpret crochet shorthand using context; keep stitch counts when present, else null.

If any section is unclear, still return a usable partial project (summary + best-effort parts/rows) rather than failing.
`;

const wait = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

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

const preprocessPattern = (patternText: string): { text: string; length: number } => {
  const trimmed = patternText.trim();
  // Keep full text; only trim outer whitespace.
  return { text: trimmed, length: trimmed.length };
};

export const cleanRawPatternText = (input: string): string => {
  const lines = input.split(/\r?\n/);
  const filtered: string[] = [];
  const footerPatterns = [
    /all rights reserved/i,
    /lion brand/i,
    /copyright/i,
    /pattern number/i,
    /printing/i,
    /customer service/i,
    /sku/i,
    /purchase/i,
    /order/i,
  ];
  let skipAbbrev = false;

  for (const rawLine of lines) {
    const line = rawLine.trimEnd();
    const lower = line.toLowerCase();
    if (!line) {
      filtered.push("");
      continue;
    }
    if (/^abbreviations[:]?/i.test(line)) {
      skipAbbrev = true;
      continue;
    }
    if (skipAbbrev) {
      if (/^notes[:]?/i.test(line) || /^pattern/i.test(line) || /^rnds?/i.test(line) || /^row/i.test(line)) {
        skipAbbrev = false;
      } else {
        continue;
      }
    }
    if (footerPatterns.some((re) => re.test(line))) continue;
    if (/^page \d+/i.test(line)) continue;
    if (/^print/i.test(line)) continue;
    filtered.push(line);
  }

  const deduped = filtered.filter((line, idx, arr) => !(line && idx > 0 && line === arr[idx - 1]));
  return deduped.join("\n");
};

const normalizeInstruction = (
  instruction: any,
  fallbackId: string,
  fallbackText: string,
): ParsedInstruction => {
  const human =
    typeof instruction?.text?.human === "string"
      ? instruction.text.human
      : typeof instruction?.text === "string"
        ? instruction.text
        : fallbackText;
  const abbreviated =
    typeof instruction?.text?.abbreviated === "string"
      ? instruction.text.abbreviated
      : human;

  const textPair = { human: human.trim(), abbreviated: abbreviated.trim() };

  return {
    id: typeof instruction?.id === "string" ? instruction.id.trim() : fallbackId,
    text: textPair,
    originalText:
      typeof instruction?.originalText === "string"
        ? instruction.originalText.trim()
        : human.trim(),
  };
};

const splitCompoundText = (text: string): string[] => {
  const cleaned = text.trim();
  if (!cleaned) return [];
  const splits = cleaned
    .split(/(?:,\s*(?=(make|increase|decrease|inc|dec|sc|hdc|dc|sl st|slip|chain|join|stuff|sew|attach|change)\b)|\bthen\b|\bafter that\b|\bnext\b)/gi)
    .map((s) => s.trim())
    .filter(Boolean);
  if (splits.length <= 1) return [cleaned];
  return splits;
};

const normalizeRow = (row: Partial<ParsedRow>, indexOffset = 0): ParsedRow => {
  const rowNumber = typeof row.rowNumber === "number" ? row.rowNumber : indexOffset + 1;
  const originalRowText = (row.originalRowText ?? "").trim();
  const instructionsArray = Array.isArray(row.instructions) ? row.instructions : [];

  const baseInstructions =
    instructionsArray.length > 0
      ? instructionsArray.map((instruction, idx) =>
          normalizeInstruction(
            instruction,
            `row-${rowNumber}-step-${idx + 1}`,
            originalRowText || "Follow this row as written.",
          ),
        )
      : [
          normalizeInstruction(
            {},
            `row-${rowNumber}-step-1`,
            originalRowText || "Follow this row as written.",
          ),
        ];

  const expanded = baseInstructions.flatMap((instruction, idx) => {
    const splits = splitCompoundInstruction(instruction.text.human);
    if (splits.length <= 1)
      return [
        {
          ...instruction,
          text: {
            human: capitalizeInstruction(instruction.text.human),
            abbreviated: capitalizeInstruction(instruction.text.abbreviated || instruction.text.human),
          },
        },
      ];
    return splits.map((text, splitIdx) => ({
      ...instruction,
      id: `${instruction.id}-p${splitIdx + 1}`,
      text: {
        human: capitalizeInstruction(text),
        abbreviated: capitalizeInstruction(
          instruction.text.abbreviated || instruction.text.human,
        ),
      },
    }));
  });

  const normalizedTexts = normalizeInstructionList(
    expanded.map((i) => i.text.human),
    originalRowText || `Row ${rowNumber}`,
  );

  const instructionsRaw =
    normalizedTexts.length === expanded.length
      ? expanded.map((item, i) => ({
          ...item,
          text: {
            human: normalizedTexts[i],
            abbreviated: item.text.abbreviated || normalizedTexts[i],
          },
        }))
      : normalizedTexts.map((text, i) => ({
          id: `${rowNumber}-step-${i + 1}`,
          text: { human: text, abbreviated: text },
          originalText: text,
        }));

  const instructions = dedupeConsecutive(instructionsRaw, (i) => i.text.human);

  return {
    rowNumber,
    title:
      typeof row.title === "string" && row.title.trim().length > 0
        ? row.title.trim()
        : `Row ${rowNumber}`,
    stitchCount: typeof row.stitchCount === "number" ? row.stitchCount : null,
    instructions,
    originalRowText,
    repeatGroupId: row.repeatGroupId ?? null,
    repeatIndex: typeof row.repeatIndex === "number" ? row.repeatIndex : null,
    repeatTotal: typeof row.repeatTotal === "number" ? row.repeatTotal : null,
  };
};

const normalizePart = (part: Partial<ParsedPart>, index: number): ParsedPart => {
  const rows = Array.isArray(part.rows) ? part.rows : [];
  const normalizedRows = rows.map((row, idx) => normalizeRow(row, idx));
  return {
    name: (part.name ?? `Part ${index + 1}`).toString().trim(),
    partIndex: typeof part.partIndex === "number" ? part.partIndex : index + 1,
    description: typeof part.description === "string" ? part.description : "",
    details: {
      rowCount: typeof part.details?.rowCount === "number" ? part.details.rowCount : normalizedRows.length,
      notes:
        Array.isArray(part.details?.notes) && part.details?.notes.every((n) => typeof n === "string")
          ? part.details?.notes
          : [],
    },
    rows: normalizedRows,
  };
};

export const buildFallbackProject = (
  patternText: string,
  description = "Generated locally because AI response was unavailable.",
): GeneratedCrochetProject => {
  const rows = parsePattern(patternText).map((row, idx) => normalizeRow(row, idx));

  return {
    projectName: inferProjectName(patternText, 0),
    summary: {
      title: inferProjectName(patternText, 0),
      description,
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
    },
    parts: null,
    rows,
  };
};

export const buildGenerationPayload = (
  project: GeneratedCrochetProject,
  generation: Omit<GenerationResult, "output"> & { output?: string },
) => ({
  project,
  generation: {
    ...generation,
    output: generation.output ?? JSON.stringify(project),
  },
});

const extractTextResponse = (payload: unknown): string | null => {
  if (
    !payload ||
    typeof payload !== "object" ||
    !("candidates" in payload) ||
    !Array.isArray(payload.candidates) ||
    payload.candidates.length === 0
  ) {
    return null;
  }

  const firstCandidate = payload.candidates[0];
  if (
    !firstCandidate ||
    typeof firstCandidate !== "object" ||
    !("content" in firstCandidate) ||
    !firstCandidate.content ||
    typeof firstCandidate.content !== "object" ||
    !("parts" in firstCandidate.content) ||
    !Array.isArray(firstCandidate.content.parts)
  ) {
    return null;
  }

  return firstCandidate.content.parts
    .map((part: unknown) =>
      part && typeof part === "object" && "text" in part && typeof part.text === "string"
        ? part.text
        : "",
    )
    .join("")
    .trim();
};

const parseAndValidateGeneratedProject = (
  rawText: string,
  patternText: string,
): { project: GeneratedCrochetProject; usedFallback: boolean } => {
  console.log("Gemini raw text:", rawText);

  let parsed: any;
  try {
    parsed = JSON.parse(rawText);
  } catch {
    throw new Error("Gemini returned non-JSON text.");
  }

  console.log("Gemini parsed JSON:", parsed);

  const summaryObject = (parsed as Partial<GeneratedCrochetProject>).summary ?? {
    title: inferProjectName(patternText, 0),
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

  const normalizeTools = (tools: any) => ({
    hookSize: tools?.hookSize ?? null,
    yarnType: tools?.yarnType ?? null,
    yarnWeight: tools?.yarnWeight ?? null,
    colors: Array.isArray(tools?.colors)
      ? tools.colors.map((c: any, idx: number) => ({
          name: typeof c?.name === "string" ? c.name : `Color ${idx + 1}`,
          hex: typeof c?.hex === "string" ? c.hex : "#888888",
        }))
      : [],
  });

  const normalizedParts =
    Array.isArray(parsed.parts) && parsed.parts.length > 0
      ? parsed.parts.map((part: any, idx: number) => normalizePart(part, idx))
      : null;
  const normalizedRows =
    normalizedParts === null
      ? (Array.isArray(parsed.rows) && parsed.rows.length > 0
          ? parsed.rows.map((row: any, idx: number) => normalizeRow(row, idx))
          : null)
      : null;
  const normalizedSummary: ProjectSummary = {
    title: summaryObject.title?.trim() || inferProjectName(patternText, 0),
    description: summaryObject.description?.trim() || "Crochet project",
    difficulty: summaryObject.difficulty ?? null,
    finishedSize: summaryObject.finishedSize ?? null,
    tools: normalizeTools(summaryObject.tools ?? {}),
    materials: Array.isArray(summaryObject.materials)
      ? summaryObject.materials.filter((m: unknown) => typeof m === "string")
      : [],
    skills: Array.isArray(summaryObject.skills)
      ? summaryObject.skills.filter((m: unknown) => typeof m === "string")
      : [],
    notes: Array.isArray(summaryObject.notes)
      ? summaryObject.notes.filter((m: unknown) => typeof m === "string")
      : [],
  };

  const result: GeneratedCrochetProject = {
    projectName:
      typeof parsed.projectName === "string" && parsed.projectName.trim().length > 0
        ? parsed.projectName.trim()
        : inferProjectName(patternText, 0),
    summary: normalizedSummary,
    parts: normalizedParts,
    rows: normalizedParts ? null : normalizedRows,
  };

  if (!isGeneratedCrochetProject(result)) {
    return { project: buildFallbackProject(patternText), usedFallback: true };
  }

  if (!result.parts && (!result.rows || result.rows.length === 0)) {
    return { project: buildFallbackProject(patternText), usedFallback: true };
  }

  return { project: result, usedFallback: false };
};

const readApiKey = () => process.env.GEMINI_API_KEY || "";

export const hasGeminiApiKey = (): boolean => Boolean(readApiKey());

export async function generateCrochetProject(
  patternText: string,
): Promise<{ project: GeneratedCrochetProject; generation: GenerationResult }> {
  const cleaned = cleanRawPatternText(patternText);
  const { text: trimmedPattern, length: inputLength } = preprocessPattern(cleaned);
  const t0 = Date.now();
  const logPhase = (label: string) => {
    const elapsed = Date.now() - t0;
    console.info(`[Gemini] ${label} +${elapsed}ms`);
  };

  const localPayload = (
    status: GenerationResult["status"],
    message: string,
    debug?: string,
  ) =>
    buildGenerationPayload(
      buildFallbackProject(trimmedPattern, message),
      {
        source: "local",
        status,
        message,
        debug,
        output: trimmedPattern,
      },
    );

  if (!trimmedPattern) {
    return localPayload("parse_fallback", "Generated locally because the pattern was empty.", "Empty input");
  }

  logPhase(`Clean + preprocess finished. Input size: ${inputLength}`);

  // If running on the client, call the API route so the key stays server-side.
  if (typeof window !== "undefined") {
    try {
      logPhase("Client calling /api/gemini");
      const res = await fetch("/api/gemini", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ patternText: trimmedPattern }),
      });
      const data = (await res.json()) as { project?: GeneratedCrochetProject; generation?: GenerationResult };
      if (!res.ok || !data?.project || !data?.generation) {
        const debug = !res.ok ? `API route status ${res.status}` : "Unexpected payload shape";
        throw new Error(debug);
      }
      logPhase("Client call succeeded");
      return { project: data.project, generation: data.generation };
    } catch (err) {
      console.error("[Gemini] Client call failed", err);
      return localPayload(
        "gemini_error",
        "Generated locally because Gemini request failed.",
        err instanceof Error ? err.message : "Unknown client error",
      );
    }
  }

  // Server-side direct call with secret key.
  const apiKey = readApiKey();
  if (!apiKey) {
    return localPayload("missing_api_key", "Generated locally because API key is missing.");
  }

  let lastError: Error | null = null;
  for (let attempt = 0; attempt <= DEFAULT_MAX_RETRIES; attempt += 1) {
    try {
      console.info(
        "[Gemini] Server request attempt",
        attempt + 1,
        "Has key:",
        Boolean(apiKey),
        "Input size:",
        inputLength,
      );

      const controller = REQUEST_TIMEOUT_MS > 0 ? new AbortController() : undefined;
      if (controller) {
        setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS);
      }

      logPhase(`Attempt ${attempt + 1}: Gemini request start`);

      const response = await fetch(`${GEMINI_API_URL}?key=${encodeURIComponent(apiKey)}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        signal: controller?.signal,
        body: JSON.stringify({
          contents: [
            {
              parts: [
                {
                  text: `${GEMINI_PROMPT}\n\nPattern:\n${trimmedPattern}`,
                },
              ],
            },
          ],
          generationConfig: {
            temperature: 0.1,
            responseMimeType: "application/json",
            responseJsonSchema: CROCHET_PROJECT_SCHEMA,
          },
        }),
      });

      logPhase(`Attempt ${attempt + 1}: Gemini response received`);
      if (!response.ok) throw new Error(`Gemini API request failed with status ${response.status}.`);
      const payload = (await response.json()) as unknown;
      logPhase(`Attempt ${attempt + 1}: Gemini payload parsed`);
      const responseText = extractTextResponse(payload);
      if (!responseText) {
        return localPayload("empty_ai_response", "Generated locally because Gemini returned an empty response.");
      }
      try {
        logPhase(`Attempt ${attempt + 1}: Parsing project start`);
        const { project, usedFallback } = parseAndValidateGeneratedProject(responseText, trimmedPattern);
        if (usedFallback) {
          logPhase(`Attempt ${attempt + 1}: Parsed with fallback`);
          return buildGenerationPayload(project, {
            source: "local",
            status: "parse_fallback",
            message: "Generated locally because the AI response could not be parsed.",
            debug: "Validation failed; used local parser",
          });
        }
        logPhase(`Attempt ${attempt + 1}: Parsing finished successfully`);
        return buildGenerationPayload(project, {
          source: "gemini",
          status: "success",
          message: "Generated with Gemini",
          debug: undefined,
        });
      } catch (error) {
        console.error("[Gemini] Parse error. raw responseText length:", responseText.length);
        throw error;
      }
    } catch (error) {
      if ((error as any)?.name === "AbortError") {
        console.error("[Gemini] Request aborted", attempt + 1);
        return localPayload(
          "gemini_error",
          "Generated locally because the Gemini request was aborted.",
          "Gemini request aborted",
        );
      }
      lastError = error instanceof Error ? error : new Error("Unknown Gemini error");
      console.error("[Gemini] Error attempt", attempt + 1, error);
      if (attempt < DEFAULT_MAX_RETRIES) {
        await wait(400 * (attempt + 1));
        continue;
      }
    }
  }

  if (lastError) console.error(lastError);
  return localPayload(
    "gemini_error",
    "Generated locally because Gemini request failed.",
    lastError?.message,
  );
}
