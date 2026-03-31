import { cleanRawPatternText } from "./cleanInput";
import { buildPrompt } from "./buildPrompt";
import { callGemini } from "./geminiClient";
import { parseJson } from "./parseGeminiResponse";
import { normalizeGeminiProject } from "./normalizeGeminiResponse";
import { validateProject } from "./validateProjectSchema";
import { buildFallbackProject } from "./fallbackProject";
import type { GeneratedCrochetProject, GenerationResult } from "@/types/project";

export type PipelineResult = { project: GeneratedCrochetProject; generation: GenerationResult; log: string[] };

export async function generateCrochetProjectPipeline(patternText: string): Promise<PipelineResult> {
  const log: string[] = [];
  const push = (msg: string) => log.push(msg);

  const cleaned = cleanRawPatternText(patternText);
  push(`Cleaned length: ${cleaned.length}`);

  if (!cleaned.cleaned) {
    const project = buildFallbackProject(patternText, "Generated locally because pattern was empty.");
    return { project, generation: baseGen("parse_fallback", "Pattern empty after cleaning"), log };
  }

  const promptObj = buildPrompt(cleaned.cleaned);
  push("Prompt built");

  const gemini = await callGemini(promptObj.text);
  if (!gemini.ok) {
    push(`Gemini failed: ${gemini.error}`);
    const project = buildFallbackProject(patternText, "Generated locally because Gemini request failed.");
    return { project, generation: baseGen("gemini_error", gemini.error, gemini.debug), log };
  }
  push(`Gemini response received in ${gemini.elapsedMs}ms`);

  const parsed = parseJson<any>(gemini.text);
  if (!parsed.ok) {
    push(`Parse failed: ${parsed.error}`);
    const project = buildFallbackProject(patternText, "Generated locally because AI JSON parse failed.");
    return { project, generation: baseGen("parse_fallback", parsed.error, parsed.debug), log };
  }
  push("Parse succeeded");

  const normalized = normalizeGeminiProject(parsed.value, patternText, cleaned.cleaned.split(/\n/)[0] || "Crochet Project");
  if (normalized.usedFallback) {
    push(`Normalization fallback: ${normalized.reason ?? "unknown"}`);
  } else {
    push("Normalization succeeded");
  }

  const validation = validateProject(normalized.project);
  if (!validation.ok) {
    push(`Validation failed: ${validation.error}`);
    const project = buildFallbackProject(patternText, "Generated locally because validation failed.");
    return { project, generation: baseGen("parse_fallback", validation.error), log };
  }
  push("Validation succeeded");

  return {
    project: normalized.project,
    generation: baseGen(normalized.usedFallback ? "parse_fallback" : "success", normalized.usedFallback ? "Partial fallback used" : "Generated with Gemini"),
    log,
  };
}

const baseGen = (
  status: GenerationResult["status"],
  message: string,
  debug?: string,
): GenerationResult => ({
  source: status === "success" ? "gemini" : "local",
  status,
  message,
  debug,
  output: message,
});

