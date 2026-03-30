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

const GEMINI_PROMPT = `You are converting a raw crochet pattern into structured project JSON.

Return STRICT JSON only.
No markdown.
No explanation.
No extra text.

Goal:
Take the raw crochet pattern and return structured JSON that includes:
- a concise project summary for the overview screen with tools and colors
- real named pattern parts only if they actually exist in the pattern
- rows inside each part
- human-readable checklist instructions
- expanded repeated rows so each row exists explicitly
- repeat countdown metadata per row (repeatGroupId, repeatIndex, repeatTotal)
- each instruction is a complete, checkbox-ready action with no orphan fragments

Important:
Do NOT invent generic labels like Section 1, Section 2, Part A, Part B.
Only create grouped parts when the pattern clearly contains real labeled components such as Head, Body, Tentacles, Border, Arms, Legs, Ears, Tail, Wings, Assembly, or Finishing.
If no real named parts are clearly present, return the project as a single ungrouped row list.

Filtering:
- Remove copyright text, disclaimers, links, tutorials, image references, duplicate language sections, and general tips not needed for execution.
- Keep project title, tools/materials, execution notes, and the actual crochet instructions only.

Part detection rules:
- Detect real named pattern components only when they are explicitly present or strongly implied by the pattern.
- Do NOT treat Materials, Notes, Abbreviations, Tips, Tutorials, Copyright, or video links as parts.
- Ignore duplicate language versions and keep only the main relevant pattern language.

Row rules:
- Detect rows using labels like Row 1, Round 1, R1, and 1.
- Split combined row ranges like 4-5. sc around into row 4 and row 5.
- Preserve order exactly.
- If the pattern says to repeat rows or to repeat for N rows, expand those into individual rows in the final timeline. Include repeat metadata on each expanded row: repeatGroupId (string), repeatIndex (1-based), repeatTotal.
- If repeat counts are unclear, do not invent them; leave repeat metadata null and keep rows unexpanded.

Instruction rules:
- Convert crochet abbreviations into clear, beginner-friendly instructions using the full pattern context.
- Each instruction must be a complete sentence or action phrase that stands on its own; never return orphaned words or partial phrases.
- Do not split an instruction if it would create incomplete fragments. Prefer fewer complete checklist items over many broken ones.
- Interpret symbolic repeat notation (e.g., * 2 sc in next st, sc in next 2 sts; rep from * around) and rewrite it into readable repeat instructions. Treat the whole repeat as one action when clarity requires it.
- For every instruction, return both text.human (clear rewrite) and text.abbreviated (concise crochet shorthand).
- Examples: sc -> single crochet, inc -> increase, dec or sc2tog -> decrease, ch -> chain, sl st -> slip stitch, dc -> double crochet, hdc -> half double crochet, BLO -> work in the back loops only, FLO -> work in the front loops only, mr -> magic ring.
- Examples: sc 3 -> Make 3 single crochets, inc -> Increase (make 2 stitches in the same stitch), sc2tog x9 -> Decrease 9 times.
- Keep instruction text beginner-friendly.
- Do not use abbreviations as the main visible text in human; store them in text.abbreviated.
- Do not invent missing logic.
- Preserve original meaning.

Stitch count rules:
- Extract stitch count if present, such as (24), 24 sts, or total 24.
- If not present, set stitchCount to null.

Edge cases:
- If the pattern is messy, still produce usable output.
- If no rows are clearly found, fall back to splitting by lines.
- If a row has no clear instructions, create one instruction using the original row text.
- If no real named parts are found, set parts to null and use rows.
- If expanded repeats cannot be determined safely, leave repeat metadata null and avoid inventing counts.

Use ids that are stable within the project, like row-1-step-1 or head-row-3-step-2.
Return one final JSON object only.`;

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

const buildFallbackProject = (
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

const buildGenerationPayload = (
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
  const trimmedPattern = patternText.trim();

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

  // If running on the client, call the API route so the key stays server-side.
  if (typeof window !== "undefined") {
    try {
      const res = await fetch("/api/gemini", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ patternText: trimmedPattern }),
      });
      if (!res.ok) throw new Error(`Gemini API route failed: ${res.status}`);
      const data = (await res.json()) as { project: GeneratedCrochetProject; generation: GenerationResult };
      if (!data?.project || !data?.generation) {
        throw new Error("Gemini API route returned unexpected shape");
      }
      return data;
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
      console.info("[Gemini] Server request attempt", attempt + 1, "Has key:", Boolean(apiKey));
      const response = await fetch(`${GEMINI_API_URL}?key=${encodeURIComponent(apiKey)}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          contents: [
            {
              parts: [
                {
                  text: `${GEMINI_PROMPT}\n\nRaw crochet pattern:\n${trimmedPattern}`,
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
      if (!response.ok) throw new Error(`Gemini API request failed with status ${response.status}.`);
      const payload = (await response.json()) as unknown;
      const responseText = extractTextResponse(payload);
      if (!responseText) {
        return localPayload("empty_ai_response", "Generated locally because Gemini returned an empty response.");
      }
      try {
        const { project, usedFallback } = parseAndValidateGeneratedProject(responseText, trimmedPattern);
        if (usedFallback) {
          return buildGenerationPayload(project, {
            source: "local",
            status: "parse_fallback",
            message: "Generated locally because the AI response could not be parsed.",
            debug: "Validation failed; used local parser",
          });
        }
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
