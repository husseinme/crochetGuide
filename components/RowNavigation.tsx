type RowNavigationProps = {
  canGoBack: boolean;
  canGoNext: boolean;
  isLastRow: boolean;
  onBack: () => void;
  onNext: () => void;
};

export function RowNavigation({
  canGoBack,
  canGoNext,
  isLastRow,
  onBack,
  onNext,
}: RowNavigationProps) {
  return (
    <div className="flex items-center justify-center gap-3 pt-2">
      <button
        type="button"
        onClick={onBack}
        disabled={!canGoBack}
        className="min-h-12 rounded-2xl border border-border px-5 text-sm font-medium text-mutedStrong transition disabled:cursor-not-allowed disabled:opacity-40"
      >
        Back
      </button>
      <button
        type="button"
        onClick={onNext}
        disabled={!canGoNext}
        className="min-h-12 min-w-36 rounded-2xl bg-accent px-6 text-sm font-medium text-accentText transition disabled:cursor-not-allowed disabled:opacity-50"
      >
        {isLastRow ? "Finish" : "Next"}
      </button>
    </div>
  );
}
