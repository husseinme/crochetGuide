import { CROCHET_PROJECT_SCHEMA } from "./schema";

const GEMINI_API_URL =
  "https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent";

export type GeminiSuccess = { ok: true; text: string; raw: unknown; elapsedMs: number };
export type GeminiFailure = { ok: false; error: string; debug?: string };

export async function callGemini(prompt: string): Promise<GeminiSuccess | GeminiFailure> {
  const key = process.env.GEMINI_API_KEY;
  if (!key) return { ok: false, error: "Missing GEMINI_API_KEY" };

  const started = Date.now();
  try {
    const res = await fetch(`${GEMINI_API_URL}?key=${encodeURIComponent(key)}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        contents: [{ parts: [{ text: prompt }]}],
        generationConfig: {
          temperature: 0.1,
          responseMimeType: "application/json",
          responseJsonSchema: CROCHET_PROJECT_SCHEMA,
        },
      }),
    });
    const elapsedMs = Date.now() - started;
    if (!res.ok) return { ok: false, error: `Gemini HTTP ${res.status}`, debug: `status ${res.status}` };
    const payload = (await res.json()) as unknown;
    const text = extractTextResponse(payload);
    if (!text) return { ok: false, error: "Empty Gemini response", debug: "no text parts", };
    return { ok: true, text, raw: payload, elapsedMs };
  } catch (error) {
    return { ok: false, error: "Gemini request failed", debug: error instanceof Error ? error.message : "unknown" };
  }
}

const extractTextResponse = (payload: unknown): string | null => {
  if (!payload || typeof payload !== "object" || !("candidates" in payload)) return null;
  const candidates = (payload as any).candidates;
  if (!Array.isArray(candidates) || !candidates.length) return null;
  const first = candidates[0];
  if (!first?.content?.parts) return null;
  return first.content.parts
    .map((part: any) => (part && typeof part.text === "string" ? part.text : ""))
    .join("")
    .trim();
};

