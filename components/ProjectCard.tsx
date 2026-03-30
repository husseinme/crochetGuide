"use client";

import { useState } from "react";
import type { HistoryProjectSummary } from "@/types/project";
import { formatElapsedTime } from "@/lib/timer";

type ProjectCardProps = {
  project: HistoryProjectSummary;
  onOpen: (id: string) => void;
  onRename: (id: string) => void;
  onDelete: (id: string) => void;
};

export function ProjectCard({
  project,
  onOpen,
  onRename,
  onDelete,
}: ProjectCardProps) {
  const [confirmDelete, setConfirmDelete] = useState(false);

  return (
    <article className="rounded-2xl border border-border bg-surface px-4 py-4 transition">
      <button
        type="button"
        onClick={() => onOpen(project.id)}
        className="w-full text-left"
      >
        <h3 className="text-base font-semibold text-text">{project.name}</h3>
        <p className="mt-2 text-sm text-muted">{project.percentDone}% complete</p>
        <p className="mt-1 text-sm text-mutedStrong">
          Row {project.currentRow} / {project.totalRows} · {project.rowsLeft} rows left
        </p>
        <p className="mt-1 text-xs text-muted">Time: {formatElapsedTime(project.elapsedSeconds)}</p>
      </button>

      <div className="mt-4 flex items-center justify-end gap-2">
        <button
          type="button"
          onClick={() => onRename(project.id)}
          className="rounded-xl border border-border px-3 py-2 text-xs font-medium text-mutedStrong transition hover:text-text"
        >
          Rename
        </button>
        {confirmDelete ? (
          <>
            <button
              type="button"
              onClick={() => setConfirmDelete(false)}
              className="rounded-xl border border-border px-3 py-2 text-xs font-medium text-mutedStrong transition hover:text-text"
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={() => onDelete(project.id)}
              className="rounded-xl bg-accent px-3 py-2 text-xs font-medium text-accentText"
            >
              Delete
            </button>
          </>
        ) : (
          <button
            type="button"
            onClick={() => setConfirmDelete(true)}
            className="rounded-xl border border-border px-3 py-2 text-xs font-medium text-mutedStrong transition hover:text-text"
          >
            Delete
          </button>
        )}
      </div>
    </article>
  );
}
