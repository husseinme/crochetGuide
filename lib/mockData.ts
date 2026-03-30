import type { Project } from "@/types/project";
import { calculatePercentDone } from "@/lib/projectUtils";
import { parsePattern } from "@/lib/parser";

const now = new Date();

const makeProject = (
  id: string,
  name: string,
  pattern: string,
  currentRow: number,
  completedSteps: Record<string, boolean>,
  minutesAgo: number,
): Project => {
  const parsedRows = parsePattern(pattern);
  const timestamp = new Date(now.getTime() - minutesAgo * 60 * 1000).toISOString();

  const project: Project = {
    id,
    name,
    originalPatternText: pattern,
    summary: {
      title: name,
      description: "Quick mock project for testing history and resume flow.",
      difficulty: "Easy",
      finishedSize: null,
      tools: {
        hookSize: "3.5mm",
        yarnType: "Acrylic",
        yarnWeight: "DK",
        colors: [{ name: "Slate", hex: "#6b7280" }],
      },
      materials: ["Yarn", "Hook", "Stuffing"],
      skills: ["Single crochet", "Increase", "Decrease"],
      notes: [],
    },
    hasStarted: true,
    startedSections: {},
    elapsedSeconds: 0,
    timerStartedAt: null,
    activeSessionStartedAt: null,
    isTimerRunning: false,
    completedAt: null,
    instructionStyle: "human",
    notes: "",
    parts: null,
    parsedRows,
    currentRow,
    completedSteps,
    totalRows: parsedRows.length,
    percentDone: 0,
    createdAt: timestamp,
    updatedAt: timestamp,
  };

  return {
    ...project,
    percentDone: calculatePercentDone(project),
  };
};

export const mockProjects: Project[] = [
  makeProject(
    "mock-baby-bear",
    "Baby Bear Plushie",
    `Row 1: 6 sc in magic ring (6)
Row 2: inc x 6 (12)
Row 3: [sc 1, inc] x 6 (18)
Row 4: sc 18 (18)
Row 5: sc 2, inc, sc 5, dec, sc 8 (18)
Row 6: sc 18 (18)
Row 7: dec x 6 (12)
Row 8: sc 12 (12)
Row 9: dec x 6 (6)`,
    5,
    {
      "row-1-step-1": true,
      "row-2-step-1": true,
      "row-3-step-1": true,
      "row-4-step-1": true,
      "row-5-step-1": true,
    },
    30,
  ),
  makeProject(
    "mock-tulip-coaster",
    "Tulip Coaster",
    `Round 1: magic ring, ch 1, sc 8, sl st (8)
Round 2: ch 2, inc x 8, sl st (16)
Round 3: [sc 1, inc] x 8, sl st (24)
Round 4: blo sc 24 (24)
Round 5: dc 24, sl st (24)`,
    3,
    {
      "row-1-step-1": true,
      "row-1-step-2": true,
      "row-1-step-3": true,
      "row-1-step-4": true,
      "row-2-step-1": true,
    },
    180,
  ),
  makeProject(
    "mock-bucket-hat",
    "Simple Bucket Hat",
    `R1: 8 sc in mr (8)
R2: inc x 8 (16)
R3: [sc 1, inc] x 8 (24)
R4: [sc 2, inc] x 8 (32)
R5: sc 32 (32)
R6: sc 32 (32)
R7: hdc 32 (32)
R8: hdc 32 (32)`,
    8,
    {
      "row-1-step-1": true,
      "row-2-step-1": true,
      "row-3-step-1": true,
      "row-4-step-1": true,
      "row-5-step-1": true,
      "row-6-step-1": true,
      "row-7-step-1": true,
      "row-8-step-1": true,
    },
    360,
  ),
];
