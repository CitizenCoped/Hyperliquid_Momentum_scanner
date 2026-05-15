import { timingSafeEqual } from "node:crypto";
import type { NextFunction, Request, Response } from "express";
import { logger } from "./logger";

const MUTATING_METHODS = new Set(["POST", "PUT", "PATCH", "DELETE"]);
const ADMIN_TOKEN_ENV_KEYS = [
  "SCANNER_ADMIN_TOKEN",
  "API_ADMIN_TOKEN",
  "ADMIN_API_TOKEN",
] as const;

function configuredAdminToken(): string | null {
  for (const key of ADMIN_TOKEN_ENV_KEYS) {
    const value = process.env[key]?.trim();
    if (value) return value;
  }

  return null;
}

function safeEqual(left: string, right: string): boolean {
  const leftBuffer = Buffer.from(left);
  const rightBuffer = Buffer.from(right);

  return (
    leftBuffer.length === rightBuffer.length &&
    timingSafeEqual(leftBuffer, rightBuffer)
  );
}

function tokenFromAuthorizationHeader(value: string | undefined): string | null {
  if (!value) return null;

  const match = /^Bearer\s+(.+)$/i.exec(value.trim());
  return match?.[1]?.trim() || null;
}

function tokenFromRequest(req: Request): string | null {
  return (
    tokenFromAuthorizationHeader(req.get("authorization")) ??
    req.get("x-scanner-admin-token")?.trim() ??
    req.get("x-admin-token")?.trim() ??
    null
  );
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

  const expected = configuredAdminToken();
  if (!expected) {
    logger.error(
      { envKeys: ADMIN_TOKEN_ENV_KEYS },
      "Admin mutation refused because no admin token is configured",
    );
    res.status(503).json({
      error: "Admin token is not configured on the API server",
    });
    return;
  }

  const presented = tokenFromRequest(req);
  if (!presented || !safeEqual(presented, expected)) {
    res.set("WWW-Authenticate", 'Bearer realm="scanner-admin"');
    res.status(401).json({ error: "Admin authorization required" });
    return;
  }

  next();
}
