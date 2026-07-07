import { Router } from "express";
import { fetchClients } from "../lib/queries.js";

export const clientsRouter = Router();

clientsRouter.get("/", async (_req, res) => {
  const clients = await fetchClients();
  res.json({
    clients: clients.map((c) => ({ id: c.id, name: c.name, clientType: c.client_type })),
  });
});
