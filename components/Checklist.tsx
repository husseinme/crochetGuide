import type { ParsedRow } from "@/types/project";
import { ChecklistItem } from "@/components/ChecklistItem";
import type { YarnColor } from "@/types/project";

type ChecklistProps = {
  row: ParsedRow;
  completedSteps: Record<string, boolean>;
  activeInstructionId: string | null;
  onToggleStep: (instructionId: string) => void;
  colors: YarnColor[];
  instructionStyle: "human" | "abbreviated";
};

export function Checklist({
  row,
  completedSteps,
  activeInstructionId,
  onToggleStep,
  colors,
  instructionStyle,
}: ChecklistProps) {
  return (
    <div className="space-y-3">
      {row.instructions.map((instruction) => (
        <ChecklistItem
          key={instruction.id}
          text={instruction.text[instructionStyle] || instruction.text.human}
          checked={Boolean(completedSteps[instruction.id])}
          active={instruction.id === activeInstructionId}
          onToggle={() => onToggleStep(instruction.id)}
          colors={colors}
        />
      ))}
    </div>
  );
}
