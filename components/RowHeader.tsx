type RowHeaderProps = {
  title: string;
  stitchCount?: number | null;
  projectName?: string;
  partName?: string | null;
  partProgressLabel?: string | null;
  repeatLabel?: string | null;
};

export function RowHeader({
  title,
  stitchCount,
  projectName,
  partName,
  partProgressLabel,
  repeatLabel,
}: RowHeaderProps) {
  return (
    <header className="space-y-2 text-center">
      {projectName ? (
        <p className="text-sm font-medium text-muted">{projectName}</p>
      ) : null}
      {partName ? (
        <p className="text-sm text-mutedStrong">
          {partName}
          {partProgressLabel ? ` · ${partProgressLabel}` : ""}
        </p>
      ) : null}
      <h1 className="text-3xl font-semibold tracking-tight text-text sm:text-4xl">
        {title}
      </h1>
      <div className="flex items-center justify-center gap-3 text-sm text-muted">
        {stitchCount ? <span>{stitchCount} stitches</span> : null}
        {repeatLabel ? (
          <span className="rounded-xl border border-border px-3 py-1 text-xs text-mutedStrong">
            {repeatLabel}
          </span>
        ) : null}
      </div>
    </header>
  );
}
