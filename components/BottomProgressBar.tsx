type Segment = { label: string; percent: number };

type BottomProgressBarProps = {
  currentRow: number;
  totalRows: number;
  segments: Segment[];
  overallPercent: number;
};

export function BottomProgressBar({
  currentRow,
  totalRows,
  segments,
  overallPercent,
}: BottomProgressBarProps) {
  return (
    <div className="fixed inset-x-0 bottom-0 z-40 border-t border-border bg-surface/95 px-4 pb-[calc(env(safe-area-inset-bottom)+1rem)] pt-3 backdrop-blur">
      <div className="mx-auto w-full max-w-4xl">
        <div className="mb-2 flex items-center justify-between text-xs font-medium text-muted">
          <span>Row {currentRow} / {totalRows}</span>
          <span>{overallPercent}%</span>
        </div>
        <div className="flex h-2 overflow-hidden rounded-full bg-track">
          {segments.map((segment, index) => (
            <div
              key={segment.label + index}
              className="h-full bg-fill transition-all duration-300"
              style={{ width: `${segments.length > 1 ? Math.max(segment.percent, 1) : segment.percent}%` }}
              title={segment.label}
            />
          ))}
        </div>
      </div>
    </div>
  );
}
