type PatternInputProps = {
  value: string;
  onChange: (value: string) => void;
};

export function PatternInput({ value, onChange }: PatternInputProps) {
  return (
    <textarea
      value={value}
      onChange={(event) => onChange(event.target.value)}
      placeholder="Paste your crochet pattern here..."
      className="min-h-[260px] w-full resize-none rounded-2xl border border-border bg-surface px-4 py-4 text-base leading-7 text-text outline-none transition placeholder:text-muted focus:border-mutedStrong focus:ring-2 focus:ring-muted/30 sm:min-h-[320px] sm:px-5 sm:py-5"
      autoCapitalize="sentences"
      autoCorrect="off"
      spellCheck={false}
    />
  );
}
