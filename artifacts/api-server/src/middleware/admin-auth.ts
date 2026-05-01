import { timingSafeEqual } from "crypto";
import type { NextFunction, Request, Response } from "express";

const ADMIN_TOKEN_ENV = "SCANNER_ADMIN_TOKEN";

function configuredAdminToken(): string | null {
  const token = process.env[ADMIN_TOKEN_ENV]?.trim();
  return token ? token : null;
}

function bearerToken(req: Request): string | null {
  const value = req.get("authorization");
  if (!value) return null;

  const [scheme, ...rest] = value.split(" ");
  const token = rest.join(" ").trim();
  if (scheme.toLowerCase() !== "bearer" || !token) return null;

  return token;
}

function safeEqual(a: string, b: string): boolean {
  const aBytes = Buffer.from(a);
  const bBytes = Buffer.from(b);
  if (aBytes.length !== bBytes.length) return false;
  return timingSafeEqual(aBytes, bBytes);
}

export function requireAdminToken(
  req: Request,
  res: Response,
  next: NextFunction,
): void {
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
