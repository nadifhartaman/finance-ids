"use client";

import { useActionState, useEffect, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import {
  Dialog,
  DialogBody,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { createProject, updateProject, type ProjectFormState } from "@/lib/projects-actions";
import type { ClientOption, ClientType, Project } from "@/lib/types";

const initialState: ProjectFormState = { error: null };

const PRODUCT_LINES = ["VIANA", "ORION", "AIoT", "Indi AI", "3D Digital Twin"] as const;

/** admin+ affordance (`projects.write`): create a new project (existing or brand-new client), or edit an existing one's core facts. */
export default function ProjectFormDialog({
  isOpen,
  onOpenChange,
  clients,
  project,
}: {
  isOpen: boolean;
  onOpenChange: (isOpen: boolean) => void;
  clients: ClientOption[];
  /** Present in edit mode; absent in create mode. */
  project?: Project;
}) {
  const router = useRouter();
  const isEdit = Boolean(project);

  const [createState, createAction, isCreating] = useActionState(createProject, initialState);
  useEffect(() => {
    if (!isEdit && createState !== initialState && !createState.error) {
      router.refresh();
      onOpenChange(false);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [createState]);

  // Parent remounts this component per project (key={project?.id ?? "create"}),
  // so these initial values are always fresh — no sync effect needed.
  const [name, setName] = useState(project?.name ?? "");
  const [productLine, setProductLine] = useState(project?.productLine ?? PRODUCT_LINES[0]);
  const [contractValue, setContractValue] = useState(
    project ? String(project.contractValue) : "",
  );
  const [clientMode, setClientMode] = useState<"existing" | "new">("existing");
  const [newClientType, setNewClientType] = useState<ClientType>("government");
  const [editError, setEditError] = useState<string | null>(null);
  const [isSavingEdit, startEditTransition] = useTransition();

  function saveEdit(close: () => void) {
    if (!project) return;
    const value = Number(contractValue);
    if (!Number.isFinite(value) || value <= 0 || !name.trim()) return;
    startEditTransition(async () => {
      const result = await updateProject(project.id, {
        name: name.trim(),
        productLine,
        contractValue: value,
      });
      if (result.error) {
        setEditError(result.error);
        return;
      }
      router.refresh();
      close();
    });
  }

  return (
    <Dialog isOpen={isOpen} onOpenChange={onOpenChange}>
      {({ close }) =>
        isEdit ? (
          <form
            onSubmit={(e) => {
              e.preventDefault();
              saveEdit(close);
            }}
          >
            <DialogHeader>
              <DialogTitle>Edit project — {project?.name}</DialogTitle>
            </DialogHeader>
            <DialogBody className="space-y-3">
              <p className="text-xs text-ink-muted">
                Client: {project?.client} (client can&rsquo;t be changed here)
              </p>
              <label className="block">
                <span className="mb-1.5 block font-medium text-title">Project name</span>
                <input
                  type="text"
                  required
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className="w-full rounded-lg border border-card-border px-3 py-2 text-foreground outline-none focus:border-primary-300"
                  autoFocus
                />
              </label>
              <label className="block">
                <span className="mb-1.5 block font-medium text-title">Product line</span>
                <select
                  value={productLine}
                  onChange={(e) => setProductLine(e.target.value)}
                  className="w-full rounded-lg border border-card-border bg-card px-3 py-2 text-title"
                >
                  {PRODUCT_LINES.map((line) => (
                    <option key={line} value={line}>
                      {line}
                    </option>
                  ))}
                </select>
              </label>
              <label className="block">
                <span className="mb-1.5 block font-medium text-title">Contract value</span>
                <span className="flex items-center gap-2 rounded-lg border border-card-border px-3 py-2 focus-within:border-primary-300">
                  <span className="text-ink-muted">Rp</span>
                  <input
                    type="number"
                    min={0}
                    value={contractValue}
                    onChange={(e) => setContractValue(e.target.value)}
                    className="w-full bg-transparent text-foreground outline-none"
                  />
                </span>
              </label>
              {editError && (
                <p className="rounded-lg bg-chip-error-bg px-3 py-2 text-xs text-chip-error-text">
                  {editError}
                </p>
              )}
            </DialogBody>
            <DialogFooter>
              <button
                type="button"
                onClick={close}
                className="rounded-lg border border-card-border px-4 py-2 text-sm font-medium text-ink-secondary hover:bg-soft"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={isSavingEdit}
                className="rounded-lg bg-primary-600 px-4 py-2 text-sm font-medium text-white hover:bg-primary-700 disabled:opacity-60"
              >
                {isSavingEdit ? "Saving…" : "Save change"}
              </button>
            </DialogFooter>
          </form>
        ) : (
          <form action={createAction}>
            <DialogHeader>
              <DialogTitle>New project</DialogTitle>
            </DialogHeader>
            <DialogBody className="space-y-3">
              <div>
                <span className="mb-1.5 block font-medium text-title">Client</span>
                <div className="mb-2 flex gap-4 text-sm text-ink-secondary">
                  <label className="flex items-center gap-1.5">
                    <input
                      type="radio"
                      name="clientMode"
                      value="existing"
                      checked={clientMode === "existing"}
                      onChange={() => setClientMode("existing")}
                    />
                    Existing client
                  </label>
                  <label className="flex items-center gap-1.5">
                    <input
                      type="radio"
                      name="clientMode"
                      value="new"
                      checked={clientMode === "new"}
                      onChange={() => setClientMode("new")}
                    />
                    Add new client
                  </label>
                </div>
                {clientMode === "existing" ? (
                  <select
                    name="clientId"
                    required
                    defaultValue=""
                    className="w-full rounded-lg border border-card-border bg-card px-3 py-2 text-title"
                  >
                    <option value="" disabled>
                      Select a client…
                    </option>
                    {clients.map((c) => (
                      <option key={c.id} value={c.id}>
                        {c.name}
                      </option>
                    ))}
                  </select>
                ) : (
                  <div className="space-y-2">
                    <input
                      name="newClientName"
                      type="text"
                      required
                      placeholder="Client name"
                      className="w-full rounded-lg border border-card-border px-3 py-2 text-foreground outline-none focus:border-primary-300"
                    />
                    <div className="flex gap-4 text-sm text-ink-secondary">
                      <label className="flex items-center gap-1.5">
                        <input
                          type="radio"
                          name="newClientType"
                          value="government"
                          checked={newClientType === "government"}
                          onChange={() => setNewClientType("government")}
                        />
                        Government
                      </label>
                      <label className="flex items-center gap-1.5">
                        <input
                          type="radio"
                          name="newClientType"
                          value="private"
                          checked={newClientType === "private"}
                          onChange={() => setNewClientType("private")}
                        />
                        Private
                      </label>
                    </div>
                  </div>
                )}
              </div>
              <label className="block">
                <span className="mb-1.5 block font-medium text-title">Project name</span>
                <input
                  name="name"
                  type="text"
                  required
                  className="w-full rounded-lg border border-card-border px-3 py-2 text-foreground outline-none focus:border-primary-300"
                />
              </label>
              <label className="block">
                <span className="mb-1.5 block font-medium text-title">Product line</span>
                <select
                  name="productLine"
                  required
                  defaultValue={PRODUCT_LINES[0]}
                  className="w-full rounded-lg border border-card-border bg-card px-3 py-2 text-title"
                >
                  {PRODUCT_LINES.map((line) => (
                    <option key={line} value={line}>
                      {line}
                    </option>
                  ))}
                </select>
              </label>
              <label className="block">
                <span className="mb-1.5 block font-medium text-title">Contract value</span>
                <span className="flex items-center gap-2 rounded-lg border border-card-border px-3 py-2 focus-within:border-primary-300">
                  <span className="text-ink-muted">Rp</span>
                  <input
                    name="contractValue"
                    type="number"
                    min={0}
                    required
                    className="w-full bg-transparent text-foreground outline-none"
                  />
                </span>
              </label>
              <label className="block">
                <span className="mb-1.5 block font-medium text-title">
                  Budget (optional)
                </span>
                <span className="flex items-center gap-2 rounded-lg border border-card-border px-3 py-2 focus-within:border-primary-300">
                  <span className="text-ink-muted">Rp</span>
                  <input
                    name="budget"
                    type="number"
                    min={0}
                    className="w-full bg-transparent text-foreground outline-none"
                  />
                </span>
              </label>
              {createState.error && (
                <p className="rounded-lg bg-chip-error-bg px-3 py-2 text-xs text-chip-error-text">
                  {createState.error}
                </p>
              )}
            </DialogBody>
            <DialogFooter>
              <button
                type="button"
                onClick={close}
                className="rounded-lg border border-card-border px-4 py-2 text-sm font-medium text-ink-secondary hover:bg-soft"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={isCreating}
                className="rounded-lg bg-primary-600 px-4 py-2 text-sm font-medium text-white hover:bg-primary-700 disabled:opacity-60"
              >
                {isCreating ? "Creating…" : "Create project"}
              </button>
            </DialogFooter>
          </form>
        )
      }
    </Dialog>
  );
}
