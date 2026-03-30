import { NextResponse } from "next/server";
import { generateCrochetProject } from "@/lib/gemini";

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
    console.info("[Gemini API Route] Starting Gemini request");
    const payload = await generateCrochetProject(patternText);
    console.info("[Gemini API Route] Gemini request succeeded");
    return NextResponse.json(payload);
  } catch (error) {
    console.error("[Gemini API Route] Error:", error);
    return NextResponse.json(
      { error: "Failed to process pattern" },
      { status: 500 },
    );
  }
}
