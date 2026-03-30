import type { YarnColor } from "@/types/project";
import { ColorText } from "@/components/ColorText";

type ChecklistItemProps = {
  text: string;
  checked: boolean;
  active: boolean;
  onToggle: () => void;
  colors: YarnColor[];
};

export function ChecklistItem({
  text,
  checked,
  active,
  onToggle,
  colors,
}: ChecklistItemProps) {
  return (
    <label
      className={[
        "flex min-h-14 cursor-pointer items-start gap-4 rounded-2xl border px-4 py-3 transition",
        checked
          ? "border-border bg-surface text-muted line-through"
          : active
            ? "border-mutedStrong bg-surfaceElevated text-text"
            : "border-border bg-surface text-mutedStrong",
      ].join(" ")}
    >
      <input
        type="checkbox"
        checked={checked}
        onChange={onToggle}
        className="mt-1 h-5 w-5 rounded border-border text-accent focus:ring-accent"
      />
      <span className="flex-1 text-base leading-7">
        <ColorText text={text} colors={colors} />
      </span>
    </label>
  );
}
