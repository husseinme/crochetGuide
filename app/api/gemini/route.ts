import { NextResponse } from "next/server";
import { generateCrochetProject } from "@/lib/gemini";

export const runtime = "nodejs";

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const patternText = typeof body?.patternText === "string" ? body.patternText : "";
    console.info("[Gemini API Route] Has key:", Boolean(process.env.GEMINI_API_KEY));
    if (!process.env.GEMINI_API_KEY) {
      return NextResponse.json(
        { error: "Missing Gemini key on server" },
        { status: 500 },
      );
    }
    console.info("[Gemini API Route] Starting Gemini request");
    const project = await generateCrochetProject(patternText);
    console.info("[Gemini API Route] Gemini request succeeded");
    return NextResponse.json(project);
  } catch (error) {
    console.error("[Gemini API Route] Error:", error);
    return NextResponse.json(
      { error: "Failed to process pattern" },
      { status: 500 },
    );
  }
}
