import type { NextFunction, Request, Response } from "express";
import { timingSafeEqual } from "node:crypto";

const ADMIN_TOKEN_ENV = "SCANNER_ADMIN_TOKEN";

function configuredAdminToken(): string | null {
  const token = process.env[ADMIN_TOKEN_ENV]?.trim();
  return token ? token : null;
}

function tokenFromRequest(req: Request): string | null {
  const header = req.get("authorization");
  if (!header) return null;

  const [scheme, token] = header.split(/\s+/, 2);
  if (scheme?.toLowerCase() !== "bearer" || !token) return null;
  return token;
}

function secureEquals(a: string, b: string): boolean {
  const aBuffer = Buffer.from(a);
  const bBuffer = Buffer.from(b);
  return aBuffer.length === bBuffer.length && timingSafeEqual(aBuffer, bBuffer);
}

export function requireAdminToken(
  req: Request,
  res: Response,
  next: NextFunction,
): void {
  const expected = configuredAdminToken();

  if (!expected) {
    res.status(503).json({
      error: `${ADMIN_TOKEN_ENV} is required before admin actions are enabled`,
    });
    return;
  }

  const supplied = tokenFromRequest(req);
  if (!supplied || !secureEquals(supplied, expected)) {
    res.status(401).json({ error: "admin token required" });
    return;
  }

  next();
}
