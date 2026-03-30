import type { ProjectSummary, YarnColor } from "@/types/project";
import { ColorText } from "@/components/ColorText";

type ProjectSummaryProps = {
  summary: ProjectSummary;
  projectName: string;
  onStart: () => void;
};

export function ProjectSummary({ summary, projectName, onStart }: ProjectSummaryProps) {
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
