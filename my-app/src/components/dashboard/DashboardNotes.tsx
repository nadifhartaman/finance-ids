"use client";

import { useActionState, useEffect, useRef } from "react";
import { createNote, type NoteState } from "@/lib/notes-actions";
import { formatDate } from "@/lib/format";
import type { NoteItem } from "@/lib/types";

const initialState: NoteState = { error: null };

/**
 * Director+ affordance (`notes.write`): a short comment on the numbers, e.g.
 * "revenue dipped because of X" — see .scratch/user-management/PRD.md.
 * Dashboard-only for now (entity="page" on the backend); everyone can read.
 */
export default function DashboardNotes({
  notes,
  canWrite,
}: {
  notes: NoteItem[];
  canWrite: boolean;
}) {
  const [state, formAction, isPending] = useActionState(createNote, initialState);
  const formRef = useRef<HTMLFormElement>(null);

  useEffect(() => {
    if (state !== initialState && !state.error) {
      formRef.current?.reset();
    }
  }, [state]);

  return (
    <div className="space-y-3">
      {notes.length === 0 ? (
        <p className="text-sm text-ink-muted">No notes yet.</p>
      ) : (
        <ul className="space-y-3">
          {notes.map((note) => (
            <li key={note.id} className="rounded-lg bg-soft px-3 py-2">
              <p className="text-sm text-title">{note.body}</p>
              <p className="mt-1 text-xs text-ink-muted">
                {note.authorName} · {formatDate(note.createdAt)}
              </p>
            </li>
          ))}
        </ul>
      )}

      {canWrite && (
        <form ref={formRef} action={formAction} className="space-y-2 border-t border-card-border pt-3">
          <textarea
            name="body"
            rows={2}
            placeholder="Add a note, e.g. why revenue dipped this month…"
            className="w-full rounded-lg border border-card-border bg-card px-3 py-2 text-sm text-title outline-none focus:border-primary-300"
          />
          {state.error && (
            <p className="text-xs text-chip-error-text">{state.error}</p>
          )}
          <button
            type="submit"
            disabled={isPending}
            className="rounded-lg bg-primary-600 px-3 py-1.5 text-sm font-medium text-white hover:bg-primary-700 disabled:opacity-60"
          >
            {isPending ? "Saving…" : "Add note"}
          </button>
        </form>
      )}
    </div>
  );
}
