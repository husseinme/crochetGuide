import { NextResponse } from "next/server";
import { generateCrochetProjectPipeline } from "@/lib/ai/generateCrochetProject";
import { buildGenerationPayload } from "@/lib/gemini";
import { buildFallbackProject } from "@/lib/ai/fallbackProject";
import type { GenerationResult } from "@/types/project";

export const runtime = "nodejs";
const SOFT_TIMEOUT_MS = 8000; // stay under Netlify function timeout to avoid 502

export async function POST(req: Request) {
  let patternText: string = "";
  try {
    const body = await req.json();
    patternText = typeof body?.patternText === "string" ? body.patternText : "";
    console.info(
      "[Gemini API Route] Has key:",
      Boolean(process.env.GEMINI_API_KEY),
      "Input size:",
      patternText.length,
    );
    const t0 = Date.now();
    const logPhase = (label: string) => {
      const elapsed = Date.now() - t0;
      console.info(`[Gemini API Route] ${label} +${elapsed}ms`);
    };

    logPhase("Request received");
    logPhase("Starting Gemini request");
    const payload = await Promise.race([
      generateCrochetProjectPipeline(patternText),
      new Promise((resolve) =>
        setTimeout(() => {
          logPhase("Soft timeout hit; returning fallback to avoid platform 502");
          const fbProject = buildFallbackProject(
            patternText,
            "Generated locally because the Gemini request exceeded the function time limit.",
          );
          resolve({
            project: fbProject,
            generation: {
              source: "local",
              status: "gemini_timeout",
              message: "Generated locally because the Gemini request timed out on the server.",
              debug: "Soft timeout reached in API route (likely platform limit).",
              output: patternText,
            },
            log: ["soft-timeout"],
          });
        }, SOFT_TIMEOUT_MS),
      ),
    ]) as Awaited<ReturnType<typeof generateCrochetProjectPipeline>>;
    logPhase(
      `Gemini route completed. source=${payload.generation.source} status=${payload.generation.status}`,
    );
    return NextResponse.json({ ok: true, project: payload.project, generation: payload.generation, log: payload.log });
  } catch (error) {
    console.error("[Gemini API Route] Error:", error);
    const fallbackProject = buildFallbackProject(patternText ?? "", "Generated locally because the Gemini API route failed.");
    const generation: GenerationResult = {
      source: "local",
      status: "gemini_error",
      message: "Generated locally because the Gemini API route failed.",
      debug: error instanceof Error ? error.message : "Unknown route error",
      output: patternText ?? "",
    };
    const payload = buildGenerationPayload(fallbackProject, generation);
    return NextResponse.json({ ok: false, project: payload.project, generation, error: generation.message, debug: generation.debug }, { status: 200 });
  }
}
