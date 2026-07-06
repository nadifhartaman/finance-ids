"use client";

import { useState } from "react";

/**
 * Director+ affordance (`projects.flag`): mark a project for discussion.
 * Preview only — the flag lives in component state until the backend
 * exists to persist it. Kept as its own client island so ProjectTable
 * stays a Server Component.
 */
export default function FlagProjectButton({
  projectName,
}: {
  projectName: string;
}) {
  const [flagged, setFlagged] = useState(false);

  if (flagged) {
    return (
      <button
        type="button"
        onClick={() => setFlagged(false)}
        title={`${projectName} is flagged for discussion (preview — resets on reload). Click to undo.`}
        className="rounded-md px-2 py-0.5 text-xs font-medium text-chip-warning-text hover:bg-chip-warning-bg"
      >
        ⚑ Flagged (preview)
      </button>
    );
  }

  return (
    <button
      type="button"
      onClick={() => setFlagged(true)}
      title="Mark this project to discuss with the team. Saved for real once the backend is connected."
      className="rounded-md px-2 py-0.5 text-xs font-medium text-primary-700 hover:bg-primary-50"
    >
      Flag for review
    </button>
  );
}
