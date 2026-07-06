"use client";

import { useState, useTransition } from "react";
import { updateProjectFlag } from "@/lib/projects-actions";

/**
 * Director+ affordance (`projects.flag`): mark a project for discussion.
 * Persists via PATCH /api/projects/:id/flag. Kept as its own client island
 * so ProjectTable stays a Server Component.
 */
export default function FlagProjectButton({
  projectId,
  projectName,
  initialFlagged,
}: {
  projectId: string;
  projectName: string;
  initialFlagged: boolean;
}) {
  const [flagged, setFlagged] = useState(initialFlagged);
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  function toggle() {
    const next = !flagged;
    setFlagged(next);
    setError(null);
    startTransition(async () => {
      const { error } = await updateProjectFlag(projectId, next);
      if (error) {
        setFlagged(!next);
        setError(error);
      }
    });
  }

  return (
    <div className="text-right">
      {flagged ? (
        <button
          type="button"
          onClick={toggle}
          disabled={isPending}
          title={`${projectName} is flagged for discussion. Click to undo.`}
          className="rounded-md px-2 py-0.5 text-xs font-medium text-chip-warning-text hover:bg-chip-warning-bg disabled:opacity-60"
        >
          ⚑ Flagged
        </button>
      ) : (
        <button
          type="button"
          onClick={toggle}
          disabled={isPending}
          title="Mark this project to discuss with the team."
          className="rounded-md px-2 py-0.5 text-xs font-medium text-primary-700 hover:bg-primary-50 disabled:opacity-60"
        >
          Flag for review
        </button>
      )}
      {error && <p className="mt-1 text-xs text-chip-error-text">{error}</p>}
    </div>
  );
}
