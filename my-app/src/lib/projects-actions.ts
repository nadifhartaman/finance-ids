"use server";

/** Project flag (Phase 3) + project/client CRUD — projects.flag / projects.write roles. */
import { revalidatePath } from "next/cache";
import { authedFetch, patchAction } from "./authed-fetch";

export async function updateProjectFlag(
  id: string,
  isFlagged: boolean,
): Promise<{ error: string | null }> {
  return patchAction(
    `/api/projects/${id}/flag`,
    { isFlagged },
    ["/projects", "/"],
    "Failed to update project.",
  );
}

export interface ProjectFormState {
  error: string | null;
  success?: boolean;
}

export async function createProject(
  _prevState: ProjectFormState,
  formData: FormData,
): Promise<ProjectFormState> {
  const name = formData.get("name");
  const productLine = formData.get("productLine");
  const contractValue = Number(formData.get("contractValue"));
  const budgetRaw = formData.get("budget");
  const budget = budgetRaw && String(budgetRaw).trim() !== "" ? Number(budgetRaw) : null;
  const clientMode = formData.get("clientMode");
  const clientId = formData.get("clientId");
  const newClientName = formData.get("newClientName");
  const newClientType = formData.get("newClientType");

  if (
    typeof name !== "string" ||
    !name.trim() ||
    typeof productLine !== "string" ||
    !productLine ||
    !Number.isFinite(contractValue) ||
    contractValue <= 0 ||
    (budget !== null && (!Number.isFinite(budget) || budget < 0))
  ) {
    return { error: "Fill in all required fields; contract value and budget must be positive." };
  }

  const body: Record<string, unknown> = {
    name: name.trim(),
    productLine,
    contractValue,
    budget,
  };
  if (clientMode === "new") {
    if (typeof newClientName !== "string" || !newClientName.trim() || typeof newClientType !== "string") {
      return { error: "New client name and type are required." };
    }
    body.newClient = { name: newClientName.trim(), clientType: newClientType };
  } else {
    if (typeof clientId !== "string" || !clientId) {
      return { error: "Select a client." };
    }
    body.clientId = clientId;
  }

  const res = await authedFetch("/api/projects", { method: "POST", body: JSON.stringify(body) });
  if (!res.ok) {
    const responseBody = await res.json().catch(() => null);
    return { error: responseBody?.error ?? "Failed to create project." };
  }

  revalidatePath("/projects");
  revalidatePath("/");
  revalidatePath("/invoices");
  revalidatePath("/budgets");
  return { error: null, success: true };
}

export async function updateProject(
  id: string,
  input: { name: string; productLine: string; contractValue: number },
): Promise<{ error: string | null }> {
  return patchAction(
    `/api/projects/${id}`,
    input,
    ["/projects", "/", "/invoices", "/budgets"],
    "Failed to update project.",
  );
}

export async function deleteProject(id: string): Promise<{ error: string | null }> {
  return patchAction(
    `/api/projects/${id}`,
    undefined,
    ["/projects", "/", "/invoices", "/budgets"],
    "Failed to delete project.",
    "DELETE",
  );
}
