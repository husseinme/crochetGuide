"use client";

import { useEffect } from "react";
import type { HistoryProjectSummary } from "@/types/project";
import { EmptyState } from "@/components/EmptyState";
import { ProjectCard } from "@/components/ProjectCard";

type HistoryModalProps = {
  open: boolean;
  projects: HistoryProjectSummary[];
  onClose: () => void;
  onOpenProject: (id: string) => void;
  onRenameProject: (id: string) => void;
  onDeleteProject: (id: string) => void;
};

export function HistoryModal({
  open,
  projects,
  onClose,
  onOpenProject,
  onRenameProject,
  onDeleteProject,
}: HistoryModalProps) {
  useEffect(() => {
    if (!open) {
      return undefined;
    }

    const originalOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";

    return () => {
      document.body.style.overflow = originalOverflow;
    };
  }, [open]);

  if (!open) {
    return null;
  }

  return (
    <div className="fixed inset-0 z-50 bg-overlay backdrop-blur-sm px-4 py-6 sm:px-6" role="dialog" aria-modal="true">
      <div className="mx-auto flex h-full w-full max-w-2xl items-center justify-center">
        <div className="flex max-h-[min(82dvh,760px)] w-full flex-col overflow-hidden rounded-[1.1rem] border border-border bg-surfaceElevated shadow-panel">
          <div className="flex items-center justify-between border-b border-border px-5 py-4">
            <div>
              <h2 className="text-lg font-semibold text-text">History</h2>
              <p className="text-sm text-muted">Pick up where you left off.</p>
            </div>
            <button
              type="button"
              onClick={onClose}
              className="rounded-xl border border-border px-3 py-2 text-sm font-medium text-mutedStrong transition hover:text-text"
            >
              Close
            </button>
          </div>

          <div className="overflow-y-auto px-5 py-5">
            {projects.length === 0 ? (
              <EmptyState
                title="No saved projects yet"
                description="Start a project from the home page and it will appear here for quick resume later."
              />
            ) : (
              <div className="space-y-3">
                {projects.map((project) => (
                  <ProjectCard
                    key={project.id}
                    project={project}
                    onOpen={onOpenProject}
                    onRename={onRenameProject}
                    onDelete={onDeleteProject}
                  />
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
