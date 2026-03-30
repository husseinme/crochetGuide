"use client";

import { useEffect, useState } from "react";

type RenameProjectDialogProps = {
  currentName: string;
  open: boolean;
  onClose: () => void;
  onSave: (value: string) => void;
};

export function RenameProjectDialog({
  currentName,
  open,
  onClose,
  onSave,
}: RenameProjectDialogProps) {
  const [value, setValue] = useState(currentName);

  useEffect(() => {
    setValue(currentName);
  }, [currentName, open]);

  if (!open) {
    return null;
  }

  const isValid = value.trim().length > 0;

  return (
    <div className="fixed inset-0 z-[70] flex items-center justify-center bg-overlay px-4">
      <div className="w-full max-w-sm rounded-2xl border border-border bg-surfaceElevated p-5 shadow-panel">
        <div className="space-y-2">
          <h3 className="text-lg font-semibold text-text">Rename project</h3>
          <p className="text-sm leading-6 text-muted">
            Choose a clear name so it is easy to resume later.
          </p>
        </div>

        <input
          value={value}
          onChange={(event) => setValue(event.target.value)}
          className="mt-4 h-12 w-full rounded-2xl border border-border bg-surface px-4 text-base text-text outline-none transition focus:border-mutedStrong focus:ring-2 focus:ring-muted/30"
          placeholder="Project name"
          maxLength={60}
        />

        <div className="mt-5 flex items-center justify-end gap-3">
          <button
            type="button"
            onClick={onClose}
            className="rounded-2xl border border-border px-4 py-2 text-sm font-medium text-mutedStrong transition hover:text-text"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={() => isValid && onSave(value.trim())}
            disabled={!isValid}
            className="rounded-2xl bg-accent px-4 py-2 text-sm font-medium text-accentText transition disabled:cursor-not-allowed disabled:opacity-50"
          >
            Save
          </button>
        </div>
      </div>
    </div>
  );
}
