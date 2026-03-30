import type { GenerationResult, ProjectSummary, YarnColor } from "@/types/project";
import { ColorText } from "@/components/ColorText";

type ProjectSummaryProps = {
  summary: ProjectSummary;
  projectName: string;
  generation?: GenerationResult;
  onStart: () => void;
};

const generationBadge = (generation?: GenerationResult) => {
  if (!generation) return null;
  const stateLabel =
    generation.status === "success"
      ? "Generated with Gemini"
      : generation.status === "missing_api_key"
        ? "Generated locally (missing API key)"
        : generation.status === "empty_ai_response"
          ? "Generated locally (empty AI response)"
          : generation.status === "gemini_error"
            ? "Generated locally (Gemini error)"
            : generation.status === "gemini_timeout"
              ? "Generated locally (Gemini timeout)"
              : "Generated locally (parse fallback)";

  return (
    <div className="mt-3 rounded-xl border border-border bg-surface px-3 py-2 text-left">
      <p className="text-xs font-semibold text-text">{stateLabel}</p>
      <p className="text-xs text-muted">{generation.message}</p>
      {generation.debug ? (
        <p className="mt-1 text-[11px] text-muted">Debug: {generation.debug}</p>
      ) : null}
    </div>
  );
};

export function ProjectSummary({ summary, projectName, onStart, generation }: ProjectSummaryProps) {
  return (
    <div className="mx-auto max-w-2xl rounded-[1.25rem] border border-border bg-surfaceElevated p-6 shadow-panel sm:p-8">
      <div className="space-y-2 text-center">
        <p className="text-sm font-medium text-muted">{projectName}</p>
        <h1 className="text-3xl font-semibold tracking-tight text-text sm:text-4xl">
          {summary.title || projectName}
        </h1>
        {summary.finishedSize ? (
          <p className="text-sm text-muted">Finished size: {summary.finishedSize}</p>
        ) : null}
        {summary.difficulty ? (
          <p className="text-sm text-muted">Difficulty: {summary.difficulty}</p>
        ) : null}
      </div>

      {generationBadge(generation)}

      <p className="mt-4 text-base leading-7 text-muted">
        <ColorText text={summary.description} colors={summary.tools.colors} />
      </p>

      <div className="mt-6 grid gap-4 sm:grid-cols-2">
        <SummaryList title="Materials" items={summary.materials} colors={summary.tools.colors} />
        <SummaryList title="Skills" items={summary.skills} colors={summary.tools.colors} />
      </div>

      <div className="mt-6 rounded-2xl border border-border bg-surface px-4 py-3">
        <p className="text-sm font-semibold text-text">Tools</p>
        <ul className="mt-2 space-y-1 text-sm text-muted">
          {summary.tools.hookSize ? <li>Hook: {summary.tools.hookSize}</li> : null}
          {summary.tools.yarnType ? <li>Yarn: {summary.tools.yarnType}</li> : null}
          {summary.tools.yarnWeight ? <li>Weight: {summary.tools.yarnWeight}</li> : null}
        </ul>
        {summary.tools.colors.length > 0 ? (
          <div className="mt-3 space-y-1">
            {summary.tools.colors.map((color, index) => (
              <div key={`${color.name}-${index}`} className="flex items-center gap-2 text-sm text-muted">
                <span
                  className="h-4 w-4 rounded-full border border-border"
                  style={{ backgroundColor: color.hex }}
                  aria-hidden
                />
                <span>{color.name}</span>
              </div>
            ))}
          </div>
        ) : null}
      </div>

      {summary.notes.length > 0 ? (
        <div className="mt-6">
          <SummaryList title="Notes" items={summary.notes} colors={summary.tools.colors} />
        </div>
      ) : null}

      <button
        type="button"
        onClick={onStart}
        className="mt-8 w-full min-h-12 rounded-2xl bg-accent px-5 text-sm font-medium text-accentText transition"
      >
        Start
      </button>
    </div>
  );
}

function SummaryList({ title, items, colors }: { title: string; items: string[]; colors?: YarnColor[] }) {
  if (!items || items.length === 0) {
    return null;
  }

  return (
    <div className="rounded-2xl border border-border bg-surface px-4 py-3">
      <p className="text-sm font-semibold text-text">{title}</p>
      <ul className="mt-2 space-y-1 text-sm text-muted">
        {items.map((item, index) => (
          <li key={`${title}-${index}`}>
            {colors ? <ColorText text={item} colors={colors} /> : item}
          </li>
        ))}
      </ul>
    </div>
  );
}
