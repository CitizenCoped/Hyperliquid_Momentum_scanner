import type { NextFunction, Request, Response } from "express";
import { timingSafeEqual } from "node:crypto";

const MUTATING_METHODS = new Set(["POST", "PUT", "PATCH", "DELETE"]);

function safeEquals(a: string, b: string): boolean {
  const aBuf = Buffer.from(a);
  const bBuf = Buffer.from(b);
  if (aBuf.length !== bBuf.length) return false;
  return timingSafeEqual(aBuf, bBuf);
}

function tokenFromRequest(req: Request): string | null {
  const auth = req.header("authorization");
  if (auth) {
    const match = /^Bearer\s+(.+)$/i.exec(auth);
    if (match?.[1]) return match[1].trim();
  }

  const headerToken = req.header("x-admin-token");
  return headerToken?.trim() || null;
}

export function requireAdminAuth(
  req: Request,
  res: Response,
  next: NextFunction,
): void {
  if (!MUTATING_METHODS.has(req.method.toUpperCase())) {
    next();
    return;
  }

  const expectedToken = process.env.ADMIN_API_TOKEN?.trim();
  if (!expectedToken) {
    res.status(503).json({
      error: "Admin API token is not configured",
    });
    return;
  }

  const providedToken = tokenFromRequest(req);
  if (!providedToken || !safeEquals(providedToken, expectedToken)) {
    res.status(401).json({
      error: "Admin API token is required",
    });
    return;
  }

  next();
}
