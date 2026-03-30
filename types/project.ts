export type InstructionText = {
  human: string;
  abbreviated: string;
};

export type GenerationResult = {
  source: "gemini" | "local";
  status:
    | "success"
    | "missing_api_key"
    | "empty_ai_response"
    | "gemini_error"
    | "gemini_timeout"
    | "parse_fallback";
  message: string;
  debug?: string;
  output: string;
};

export type ParsedInstruction = {
  id: string;
  text: InstructionText;
  originalText: string;
};

export type ParsedRow = {
  rowNumber: number;
  title: string;
  stitchCount: number | null;
  instructions: ParsedInstruction[];
  originalRowText: string;
  repeatGroupId: string | null;
  repeatIndex: number | null;
  repeatTotal: number | null;
};

export type YarnColor = {
  name: string;
  hex: string;
};

export type ProjectTools = {
  hookSize: string | null;
  yarnType: string | null;
  yarnWeight: string | null;
  colors: YarnColor[];
};

export type ParsedPart = {
  name: string;
  partIndex: number;
  description: string;
  details: {
    rowCount: number;
    notes: string[];
  };
  rows: ParsedRow[];
};

export type ProjectSummary = {
  title: string;
  description: string;
  difficulty: string | null;
  finishedSize: string | null;
  tools: ProjectTools;
  materials: string[];
  skills: string[];
  notes: string[];
};

export type GeneratedCrochetProject = {
  projectName: string;
  summary: ProjectSummary;
  parts: ParsedPart[] | null;
  rows: ParsedRow[] | null;
};

export type Project = {
  id: string;
  name: string;
  originalPatternText: string;
  summary: ProjectSummary;
  generation: GenerationResult;
  hasStarted: boolean;
  startedSections: Record<string, boolean>;
  elapsedSeconds: number;
  timerStartedAt: string | null;
  activeSessionStartedAt?: string | null;
  isTimerRunning: boolean;
  completedAt?: string | null;
  instructionStyle: "human" | "abbreviated";
  notes: string;
  parts: ParsedPart[] | null;
  parsedRows: ParsedRow[];
  currentRow: number;
  completedSteps: Record<string, boolean>;
  totalRows: number;
  percentDone: number;
  createdAt: string;
  updatedAt: string;
};

export type HistoryProjectSummary = {
  id: string;
  name: string;
  percentDone: number;
  currentRow: number;
  totalRows: number;
  rowsLeft: number;
  updatedAt: string;
  elapsedSeconds: number;
};

export type ThemeMode = "light" | "dark" | "system";
