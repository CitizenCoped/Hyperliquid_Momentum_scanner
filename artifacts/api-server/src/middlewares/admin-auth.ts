import { timingSafeEqual } from "node:crypto";
import type { NextFunction, Request, Response } from "express";

const ADMIN_TOKEN_ENV = "SCANNER_ADMIN_TOKEN";
const SAFE_METHODS = new Set(["GET", "HEAD", "OPTIONS"]);

function configuredAdminToken(): string | null {
  const token = process.env[ADMIN_TOKEN_ENV]?.trim();
  return token ? token : null;
}

function bearerToken(req: Request): string | null {
  const value = req.get("authorization");
  if (!value) return null;

  const match = /^Bearer\s+(.+)$/i.exec(value);
  const token = match?.[1]?.trim();
  return token || null;
}

function safeEqual(a: string, b: string): boolean {
  const aBytes = Buffer.from(a);
  const bBytes = Buffer.from(b);
  if (aBytes.length !== bBytes.length) return false;
  return timingSafeEqual(aBytes, bBytes);
}

export function requireAdminAuth(
  req: Request,
  res: Response,
  next: NextFunction,
): void {
  if (SAFE_METHODS.has(req.method.toUpperCase())) {
    next();
    return;
  }

  const expected = configuredAdminToken();
  if (!expected) {
    res.status(503).json({
      error: `${ADMIN_TOKEN_ENV} is required for mutating API requests`,
    });
    return;
  }

  const actual = bearerToken(req);
  if (!actual || !safeEqual(actual, expected)) {
    res.status(401).json({ error: "Admin token required" });
    return;
  }

  next();
}
