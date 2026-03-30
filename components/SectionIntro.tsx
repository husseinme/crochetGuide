import type { ParsedPart, YarnColor } from "@/types/project";
import { ColorText } from "@/components/ColorText";

type SectionIntroProps = {
  part: ParsedPart;
  onStart: () => void;
  colors?: YarnColor[];
};

export function SectionIntro({ part, onStart, colors = [] }: SectionIntroProps) {
  return (
    <div className="mx-auto max-w-2xl rounded-[1.25rem] border border-border bg-surfaceElevated p-6 shadow-panel sm:p-8">
      <div className="space-y-2 text-center">
        <p className="text-sm font-medium text-muted">Section</p>
        <h1 className="text-3xl font-semibold tracking-tight text-text sm:text-4xl">
          {part.name}
        </h1>
        <p className="text-sm text-muted">
          {part.details.rowCount} {part.details.rowCount === 1 ? "row" : "rows"}
        </p>
      </div>

      <p className="mt-4 text-base leading-7 text-muted">
        <ColorText text={part.description} colors={colors} />
      </p>

      {part.details.notes.length > 0 ? (
        <div className="mt-6 rounded-2xl border border-border bg-surface px-4 py-3">
          <p className="text-sm font-semibold text-text">Notes</p>
          <ul className="mt-2 space-y-1 text-sm text-muted">
            {part.details.notes.map((note, index) => (
              <li key={`${part.name}-note-${index}`}>
                <ColorText text={note} colors={colors} />
              </li>
            ))}
          </ul>
        </div>
      ) : null}

      <button
        type="button"
        onClick={onStart}
        className="mt-8 w-full min-h-12 rounded-2xl bg-accent px-5 text-sm font-medium text-accentText transition"
      >
        Start Section
      </button>
    </div>
  );
}
