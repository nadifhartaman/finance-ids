import type { NextFunction, Request, Response } from "express";

// Express 5 forwards rejected promises from async route handlers here
// automatically — no try/catch + next(err) needed in routes.
export function errorHandler(
  err: unknown,
  _req: Request,
  res: Response,
  _next: NextFunction,
): void {
  console.error(err);
  const message = err instanceof Error ? err.message : "Internal server error";
  res.status(500).json({ error: message });
}
