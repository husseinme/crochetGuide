export type ParseResult<T> = { ok: true; value: T } | { ok: false; error: string; debug?: string };

export function parseJson<T>(text: string): ParseResult<T> {
  const trimmed = text.trim();
  const cleaned = trimmed.replace(/^```json\s*/i, "").replace(/```$/i, "");
  try {
    const value = JSON.parse(cleaned) as T;
    return { ok: true, value };
  } catch (error) {
    return { ok: false, error: "Failed to parse JSON", debug: error instanceof Error ? error.message : "unknown" };
  }
}

