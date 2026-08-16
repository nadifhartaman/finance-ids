import { Router } from "express";
import { requirePermission } from "../middleware/auth.js";
import { fetchPartners } from "../lib/queries.js";
import { createPartner, isClientType } from "../lib/mutations.js";

export const partnersRouter = Router();

const VALID_ROLES = ["customer", "vendor", "employee", "lender"] as const;
type PartnerRoleParam = (typeof VALID_ROLES)[number];

function isPartnerRole(value: unknown): value is PartnerRoleParam {
  return typeof value === "string" && (VALID_ROLES as readonly string[]).includes(value);
}

partnersRouter.get("/", async (req, res) => {
  const { role } = req.query;
  if (role !== undefined && !isPartnerRole(role)) {
    res.status(400).json({ error: `role must be one of ${VALID_ROLES.join(", ")}` });
    return;
  }
  const partners = await fetchPartners(role);
  res.json({
    partners: partners.map((p) => ({
      id: p.id,
      name: p.name,
      clientType: p.client_type,
      isCustomer: p.is_customer,
      isVendor: p.is_vendor,
      isEmployee: p.is_employee,
      isLender: p.is_lender,
      isActive: p.is_active,
      taxId: p.tax_id,
    })),
  });
});

/** Creating a vendor/lender/employee identity is a records-of-fact action — same bar as posting. */
partnersRouter.post("/", requirePermission("accounting.manual-entry"), async (req, res) => {
  const { name, clientType, isCustomer, isVendor, isEmployee, isLender, taxId } = req.body ?? {};

  if (typeof name !== "string" || !name.trim()) {
    res.status(400).json({ error: "name is required" });
    return;
  }
  if (clientType != null && !isClientType(clientType)) {
    res.status(400).json({ error: 'clientType must be "government" or "private"' });
    return;
  }
  const flags = { isCustomer, isVendor, isEmployee, isLender };
  for (const [key, value] of Object.entries(flags)) {
    if (value != null && typeof value !== "boolean") {
      res.status(400).json({ error: `${key} must be a boolean` });
      return;
    }
  }
  if (!isCustomer && !isVendor && !isEmployee && !isLender) {
    res.status(400).json({ error: "At least one role (isCustomer/isVendor/isEmployee/isLender) must be true" });
    return;
  }

  try {
    const { id } = await createPartner(
      {
        name: name.trim(),
        clientType: clientType ?? null,
        isCustomer: !!isCustomer,
        isVendor: !!isVendor,
        isEmployee: !!isEmployee,
        isLender: !!isLender,
        taxId: typeof taxId === "string" ? taxId : null,
      },
      req.user!.id,
    );
    res.status(201).json({ id });
  } catch (err) {
    res.status(400).json({ error: err instanceof Error ? err.message : "Failed to create partner" });
  }
});
