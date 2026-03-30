type HistoryTriggerProps = {
  onOpen: () => void;
};

export function HistoryTrigger({ onOpen }: HistoryTriggerProps) {
  return (
    <button
      type="button"
      onClick={onOpen}
      className="w-full rounded-2xl border border-border bg-surface px-4 py-3 text-sm font-medium text-muted transition hover:border-muted/70 hover:text-text"
    >
      History
    </button>
  );
}
