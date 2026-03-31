import { NextResponse } from "next/server";
import { buildFallbackProject, buildGenerationPayload, generateCrochetProject } from "@/lib/gemini";
import type { GenerationResult } from "@/types/project";

export const runtime = "nodejs";

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const patternText = typeof body?.patternText === "string" ? body.patternText : "";
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
    const payload = await generateCrochetProject(patternText);
    logPhase(
      `Gemini route completed. source=${payload.generation.source} status=${payload.generation.status}`,
    );
    return NextResponse.json(payload);
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
    return NextResponse.json(payload, { status: 200 });
  }
}
