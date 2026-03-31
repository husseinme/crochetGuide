import { isGeneratedCrochetProject } from "@/lib/validation";
import type { GeneratedCrochetProject } from "@/types/project";

export function validateProject(project: GeneratedCrochetProject): { ok: true } | { ok: false; error: string } {
  if (!isGeneratedCrochetProject(project)) return { ok: false, error: "Schema validation failed" };
  if ((!project.parts || project.parts.length === 0) && (!project.rows || project.rows.length === 0)) {
    return { ok: false, error: "No rows found" };
  }
  return { ok: true };
}

