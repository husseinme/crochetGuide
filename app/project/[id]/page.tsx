"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { BottomProgressBar } from "@/components/BottomProgressBar";
import { Checklist } from "@/components/Checklist";
import { EmptyState } from "@/components/EmptyState";
import { ProjectSummary } from "@/components/ProjectSummary";
import { SectionIntro } from "@/components/SectionIntro";
import { RowHeader } from "@/components/RowHeader";
import { RowNavigation } from "@/components/RowNavigation";
import { ThemeToggle } from "@/components/ThemeToggle";
import {
  calculatePercentDone,
  calculateRowsLeft,
  calculateRowProgress,
  getCurrentPart,
  getCurrentRow,
  getNextUnfinishedInstructionId,
  getProjectSegments,
} from "@/lib/projectUtils";
import { formatElapsedTime, getCurrentElapsedSeconds, nowIso } from "@/lib/timer";
import { getProjectById, updateProject } from "@/lib/storage";
import type { GenerationResult, Project } from "@/types/project";
import { useDebounce } from "@/lib/useDebounce";

const generationLabel = (generation: GenerationResult) => {
  if (generation.status === "success") return "Generated with Gemini";
  if (generation.status === "missing_api_key") return "Generated locally (missing API key)";
  if (generation.status === "empty_ai_response") return "Generated locally (empty AI response)";
  if (generation.status === "gemini_error") return "Generated locally (Gemini error)";
  return "Generated locally (parse fallback)";
};

export default function ProjectPage() {
  const params = useParams<{ id: string }>();
  const router = useRouter();
  const [project, setProject] = useState<Project | null>(null);
  const [ready, setReady] = useState(false);
  const [displayElapsed, setDisplayElapsed] = useState(0);
  const [notesOpen, setNotesOpen] = useState(false);
  const [notesDraft, setNotesDraft] = useState("");
  const [showComplete, setShowComplete] = useState(false);
  const [completionMessage, setCompletionMessage] = useState("");
  const debouncedSaveNotes = useDebounce((val: string) => {
    if (!project) return;
    const updated = updateProject(project.id, { notes: val });
    if (updated) setProject(updated);
  }, 400);

  useEffect(() => {
    const currentProject = getProjectById(params.id);
    setProject(currentProject);
    setNotesDraft(currentProject?.notes ?? "");
    setReady(true);
  }, [params.id]);

  const currentRow = useMemo(
    () => (project ? getCurrentRow(project) : null),
    [project],
  );

  const activeInstructionId = useMemo(
    () =>
      currentRow
        ? getNextUnfinishedInstructionId(currentRow, project?.completedSteps ?? {})
        : null,
    [currentRow, project?.completedSteps],
  );

  const currentPart = useMemo(
    () => (project ? getCurrentPart(project) : null),
    [project],
  );

  useEffect(() => {
    if (!project) return;
    let interval: NodeJS.Timeout | null = null;
    const tick = () => setDisplayElapsed(getCurrentElapsedSeconds(project));
    tick();
    interval = setInterval(tick, 1000);
    return () => {
      if (interval) clearInterval(interval);
    };
  }, [project]);

  if (!ready) {
    return null;
  }

  if (!project || !currentRow) {
    return (
      <main className="mx-auto flex min-h-[100dvh] w-full max-w-3xl items-center px-4 py-10">
        <div className="w-full">
          <EmptyState
            title="Project not found"
            description="This project is not available locally anymore. You can return home and start a new one."
            actionHref="/"
            actionLabel="Back home"
          />
        </div>
      </main>
    );
  }

  const toggleStep = (instructionId: string) => {
    const nextCompletedSteps = {
      ...project.completedSteps,
      [instructionId]: !project.completedSteps[instructionId],
    };

    const updatedProject = updateProject(project.id, {
      completedSteps: nextCompletedSteps,
      percentDone: calculatePercentDone({
        ...project,
        completedSteps: nextCompletedSteps,
      }),
    });

    if (updatedProject) {
      setProject(updatedProject);
    }
  };

  const startProject = () => {
    if (project.isTimerRunning) return;
    const updatedProject = updateProject(project.id, {
      hasStarted: true,
      isTimerRunning: true,
      timerStartedAt: nowIso(),
      activeSessionStartedAt: nowIso(),
    });
    if (updatedProject) {
      setProject(updatedProject);
    }
  };

  const handleNotesChange = (val: string) => {
    setNotesDraft(val);
    debouncedSaveNotes(val);
  };

  const startSection = (partName: string) => {
    const updatedProject = updateProject(project.id, {
      startedSections: { ...project.startedSections, [partName]: true },
      isTimerRunning: true,
      timerStartedAt: project.timerStartedAt ?? nowIso(),
      activeSessionStartedAt: project.timerStartedAt ?? nowIso(),
    });
    if (updatedProject) {
      setProject(updatedProject);
    }
  };

  const completeCurrentRowSteps = () => {
    if (!project || !currentRow) return project.completedSteps;
    const nextSteps = { ...project.completedSteps };
    currentRow.instructions.forEach((i) => {
      nextSteps[i.id] = true;
    });
    return nextSteps;
  };

  const navigateRow = (direction: "back" | "next") => {
    let completedSteps = project.completedSteps;
    if (direction === "next") {
      completedSteps = completeCurrentRowSteps();
    }

    const nextRowNumber =
      direction === "back"
        ? Math.max(project.currentRow - 1, 1)
        : Math.min(project.currentRow + 1, project.totalRows);

    const updatedProject = updateProject(project.id, {
      currentRow: nextRowNumber,
      completedSteps,
      isTimerRunning: direction === "next" && nextRowNumber > project.totalRows ? false : project.isTimerRunning,
      timerStartedAt: project.timerStartedAt,
      activeSessionStartedAt: project.timerStartedAt,
    });

    if (updatedProject) {
      const allDone = nextRowNumber === project.totalRows && calculatePercentDone(updatedProject) === 100;
      if (allDone) {
        const totalElapsed = getCurrentElapsedSeconds(updatedProject);
        const finalized = updateProject(project.id, {
          elapsedSeconds: totalElapsed,
          isTimerRunning: false,
          timerStartedAt: null,
          activeSessionStartedAt: null,
          completedAt: nowIso(),
        });
        if (finalized) {
          setProject(finalized);
          setCompletionMessage(sampleCompletionMessage());
          setShowComplete(true);
          return;
        }
      }
      setProject(updatedProject);
      window.scrollTo({ top: 0, behavior: "smooth" });
    }
  };

  const shouldShowSectionIntro = () => {
    if (!project.parts || project.parts.length === 0) return false;
    if (!currentPart) return false;
    return !project.startedSections[currentPart.part.name];
  };

  const backToSectionIntro = (): boolean => {
    if (!project.parts || !currentPart) return false;
    if (currentPart.rowIndexInPart === 1) {
      const updatedProject = updateProject(project.id, {
        startedSections: { ...project.startedSections, [currentPart.part.name]: false },
      });
      if (updatedProject) {
        setProject(updatedProject);
      }
      return true;
    }
    return false;
  };

  const formatElapsed = (seconds: number) => {
    const hrs = Math.floor(seconds / 3600);
    const mins = Math.floor((seconds % 3600) / 60);
    const secs = seconds % 60;
    if (hrs > 0) return `${hrs}h ${mins}m ${secs}s`;
    const mm = mins.toString().padStart(2, "0");
    const ss = secs.toString().padStart(2, "0");
    return `${mm}:${ss}`;
  };

  return (
    <main className="mx-auto min-h-[100dvh] w-full max-w-6xl px-4 pb-32 pt-6 sm:px-6 sm:pt-8">
      <div className="mb-8 flex items-center justify-between gap-3">
        <Link
          href="/"
          className="rounded-2xl border border-border px-4 py-2 text-sm font-medium text-mutedStrong transition hover:text-text"
        >
          Home
        </Link>
        <ThemeToggle />
      </div>

      <div className="flex flex-col gap-6 lg:flex-row">
        <div className="flex-1">
      {!project.hasStarted ? (
        <ProjectSummary
          summary={project.summary}
          projectName={project.name}
          generation={project.generation}
          onStart={startProject}
        />
      ) : shouldShowSectionIntro() && currentPart ? (
        <SectionIntro part={currentPart.part} onStart={() => startSection(currentPart.part.name)} />
      ) : (
      <div className="mx-auto max-w-2xl rounded-[1.25rem] border border-border bg-surfaceElevated p-6 shadow-panel sm:p-8">
          <RowHeader
            title={currentRow.title}
            stitchCount={currentRow.stitchCount}
            projectName={project.name}
            partName={currentPart?.part.name ?? null}
            partProgressLabel={
              currentPart
                ? `Row ${currentPart.rowIndexInPart} of ${currentPart.part.rows.length}`
                : null
            }
            repeatLabel={
              currentRow.repeatTotal && currentRow.repeatIndex
              ? `Repeat ${currentRow.repeatIndex} of ${currentRow.repeatTotal}`
              : null
            }
          />
          {project.generation ? (
            <div className="mt-3 rounded-xl border border-border bg-surface px-3 py-2 text-left">
              <p className="text-xs font-semibold text-text">{generationLabel(project.generation)}</p>
              <p className="text-xs text-muted">{project.generation.message}</p>
              {project.generation.debug ? (
                <p className="mt-1 text-[11px] text-muted">Debug: {project.generation.debug}</p>
              ) : null}
            </div>
          ) : null}
          <div className="mt-4 text-center text-sm text-muted">
            Row {project.currentRow} / {project.totalRows} · {calculateRowsLeft(project)} rows left
          </div>
          <div className="mt-2 text-center text-xs text-muted">
            Time: {formatElapsed(displayElapsed)}
          </div>

          <section className="mt-8">
            <Checklist
              row={currentRow}
              completedSteps={project.completedSteps}
              activeInstructionId={activeInstructionId}
              onToggleStep={toggleStep}
              colors={project.summary.tools.colors}
              instructionStyle={project.instructionStyle}
            />
          </section>

          {project.currentRow === project.totalRows && activeInstructionId === null ? (
            <p className="mt-6 text-center text-sm text-muted">
              This row is complete. You can finish and return home whenever you are ready.
            </p>
          ) : null}

          <section className="mt-8">
          <RowNavigation
            canGoBack={project.currentRow > 1}
            canGoNext={project.currentRow < project.totalRows || activeInstructionId === null}
            isLastRow={project.currentRow === project.totalRows}
            onBack={() => {
              if (!backToSectionIntro()) {
                navigateRow("back");
              }
            }}
            onNext={() => navigateRow("next")}
          />
        </section>
      </div>
      )}

        </div>

        <aside className="hidden w-80 shrink-0 lg:block">
          <NotesPanel
            value={notesDraft}
            onChange={handleNotesChange}
          />
        </aside>
      </div>

      <button
        type="button"
        className="fixed right-3 top-1/2 z-40 -translate-y-1/2 rounded-full bg-surfaceElevated px-3 py-3 shadow-panel border border-border lg:hidden"
        onClick={() => setNotesOpen(true)}
        aria-label="Open notes"
      >
        📑
      </button>

      {notesOpen ? (
        <div
          className="fixed inset-0 z-50 bg-overlay backdrop-blur-sm"
          onClick={() => setNotesOpen(false)}
        >
          <div
            className="absolute right-0 top-0 h-full w-[88%] max-w-sm bg-surfaceElevated p-4 shadow-panel"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="mb-4 flex items-center justify-between">
              <h3 className="text-sm font-semibold text-text">Notes</h3>
              <button
                type="button"
                className="rounded-xl border border-border px-3 py-1 text-xs text-mutedStrong"
                onClick={() => setNotesOpen(false)}
              >
                Close
              </button>
            </div>
            <NotesPanel value={notesDraft} onChange={handleNotesChange} />
          </div>
        </div>
      ) : null}

      <BottomProgressBar
        currentRow={project.currentRow}
        totalRows={project.totalRows}
        segments={getProjectSegments(project, project.completedSteps)}
        overallPercent={calculateRowProgress(project)}
      />
      {showComplete ? (
        <CompletionModal
          projectName={project.name}
          elapsed={formatElapsed(displayElapsed)}
          message={completionMessage}
          onClose={() => router.push("/")}
        />
      ) : null}
    </main>
  );
}

function NotesPanel({ value, onChange }: { value: string; onChange: (v: string) => void }) {
  return (
    <div className="rounded-2xl border border-border bg-surface p-4 shadow-panel h-full">
      <h3 className="text-sm font-semibold text-text">Notes</h3>
      <textarea
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="mt-3 h-full min-h-[240px] w-full resize-none rounded-2xl border border-border bg-surfaceElevated px-3 py-3 text-sm text-text outline-none"
        placeholder="Add your project notes..."
      />
    </div>
  );
}

function CompletionModal({
  projectName,
  elapsed,
  message,
  onClose,
}: {
  projectName: string;
  elapsed: string;
  message: string;
  onClose: () => void;
}) {
  const confetti = Array.from({ length: 40 });
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-overlay backdrop-blur-sm px-4">
      <div className="relative w-full max-w-xl rounded-2xl border border-border bg-surfaceElevated p-8 text-center shadow-panel">
        <h2 className="text-2xl font-bold text-text">{projectName}</h2>
        <p className="mt-2 text-sm text-muted">Finished in {elapsed}</p>
        <p className="mt-4 text-base text-text">{message}</p>
        <div className="pointer-events-none absolute inset-0 overflow-hidden">
          {confetti.map((_, idx) => (
            <span
              key={idx}
              className="absolute h-2 w-2 rounded-full"
              style={{
                left: `${Math.random() * 100}%`,
                animation: "fall 1.6s ease-out forwards",
                animationDelay: `${Math.random() * 0.8}s`,
                backgroundColor: ["#fbbf24", "#22d3ee", "#a78bfa", "#f472b6"][idx % 4],
              }}
            />
          ))}
        </div>
        <button
          type="button"
          onClick={onClose}
          className="mt-8 w-full rounded-2xl bg-accent px-5 py-3 text-sm font-medium text-accentText"
        >
          Back to Home
        </button>
      </div>
      <style jsx>{`
        @keyframes fall {
          0% {
            transform: translateY(-10%) rotate(0deg);
            opacity: 1;
          }
          100% {
            transform: translateY(120%) rotate(720deg);
            opacity: 0;
          }
        }
      `}</style>
    </div>
  );
}

function sampleCompletionMessage() {
  const options = [
    "Clean finish. That looked smooth.",
    "Nice work. Stitches stayed consistent.",
    "Great job. That pattern came together well.",
    "Solid finish. Love the flow you kept.",
  ];
  return options[Math.floor(Math.random() * options.length)];
}
