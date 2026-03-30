"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { GreetingHeader } from "@/components/GreetingHeader";
import { HistoryModal } from "@/components/HistoryModal";
import { HistoryTrigger } from "@/components/HistoryTrigger";
import { PatternInput } from "@/components/PatternInput";
import { RenameProjectDialog } from "@/components/RenameProjectDialog";
import { ThemeToggle } from "@/components/ThemeToggle";
import { buildProjectFromPattern } from "@/lib/projectFactory";
import {
  createProject,
  deleteProject,
  getHistorySummaries,
  getProjectById,
  renameProject,
  seedMockProjectsIfEmpty,
} from "@/lib/storage";
import { calculatePercentDone } from "@/lib/projectUtils";
import type { HistoryProjectSummary } from "@/types/project";

export default function HomePage() {
  const router = useRouter();
  const [patternText, setPatternText] = useState("");
  const [instructionStyle, setInstructionStyle] = useState<"human" | "abbreviated">("human");
  const [isStarting, setIsStarting] = useState(false);
  const [historyOpen, setHistoryOpen] = useState(false);
  const [projects, setProjects] = useState<HistoryProjectSummary[]>([]);
  const [renameTargetId, setRenameTargetId] = useState<string | null>(null);
  const [renameTargetName, setRenameTargetName] = useState("");

  useEffect(() => {
    seedMockProjectsIfEmpty();
    setProjects(getHistorySummaries());
  }, []);

  const refreshHistory = () => {
    setProjects(getHistorySummaries());
  };

  const startDisabled = patternText.trim().length === 0;

  const renameTarget = useMemo(
    () => (renameTargetId ? getProjectById(renameTargetId) : null),
    [renameTargetId],
  );

  useEffect(() => {
    setRenameTargetName(renameTarget?.name ?? "");
  }, [renameTarget]);

  const handleStartProject = async () => {
    const trimmedPattern = patternText.trim();
    if (!trimmedPattern || isStarting) {
      return;
    }

    setIsStarting(true);

    try {
      const project = await buildProjectFromPattern(trimmedPattern, projects.length);
      const createdProject = createProject({
        ...project,
        instructionStyle,
        percentDone: calculatePercentDone(project),
        notes: "",
      });

      setPatternText("");
      refreshHistory();
      router.push(`/project/${createdProject.id}`);
    } finally {
      setIsStarting(false);
    }
  };

  const openRenameDialog = (id: string) => {
    const project = getProjectById(id);
    if (!project) {
      return;
    }

    setRenameTargetId(id);
    setRenameTargetName(project.name);
  };

  const closeRenameDialog = () => {
    setRenameTargetId(null);
    setRenameTargetName("");
  };

  return (
    <main className="mx-auto flex min-h-[100dvh] w-full max-w-5xl items-center px-4 pb-[calc(env(safe-area-inset-bottom)+2rem)] pt-8 sm:px-6 sm:pt-12">
      <div className="mx-auto w-full max-w-2xl">
        <div className="mb-8 flex items-center justify-end">
          <ThemeToggle />
        </div>

        <section className="space-y-8 rounded-[1.25rem] border border-border bg-surfaceElevated p-6 shadow-panel sm:p-8">
          <GreetingHeader
            title="Hello, Hussein 👋"
            subtitle="What will you crochet today?"
          />

          <div className="space-y-4">
            <div className="flex items-center justify-between text-sm text-muted">
              <span className="font-medium text-text">Instruction Style</span>
              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={() => setInstructionStyle("human")}
                  className={`rounded-xl px-3 py-2 text-xs font-medium ${instructionStyle === "human" ? "bg-accent text-accentText" : "border border-border text-mutedStrong"}`}
                >
                  Simple
                </button>
                <button
                  type="button"
                  onClick={() => setInstructionStyle("abbreviated")}
                  className={`rounded-xl px-3 py-2 text-xs font-medium ${instructionStyle === "abbreviated" ? "bg-accent text-accentText" : "border border-border text-mutedStrong"}`}
                >
                  Abbreviations
                </button>
              </div>
            </div>
            <PatternInput value={patternText} onChange={setPatternText} />
            <button
              type="button"
              onClick={handleStartProject}
              disabled={startDisabled || isStarting}
              className="min-h-12 w-full rounded-2xl bg-accent px-5 text-sm font-medium text-accentText transition disabled:cursor-not-allowed disabled:opacity-45"
            >
              {isStarting ? "Starting..." : "Start Project"}
            </button>
          </div>

          <HistoryTrigger onOpen={() => setHistoryOpen(true)} />
        </section>
      </div>

      <HistoryModal
        open={historyOpen}
        projects={projects}
        onClose={() => setHistoryOpen(false)}
        onOpenProject={(id) => {
          setHistoryOpen(false);
          router.push(`/project/${id}`);
        }}
        onRenameProject={openRenameDialog}
        onDeleteProject={(id) => {
          deleteProject(id);
          refreshHistory();
        }}
      />

      <RenameProjectDialog
        open={Boolean(renameTargetId)}
        currentName={renameTargetName}
        onClose={closeRenameDialog}
        onSave={(value) => {
          if (!renameTargetId) {
            return;
          }

          renameProject(renameTargetId, value);
          refreshHistory();
          closeRenameDialog();
        }}
      />
    </main>
  );
}
