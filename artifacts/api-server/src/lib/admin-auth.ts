import { timingSafeEqual } from "node:crypto";
import type { RequestHandler } from "express";
import { logger } from "./logger";

const ADMIN_TOKEN_ENV_KEYS = ["SCANNER_ADMIN_TOKEN", "API_ADMIN_TOKEN"] as const;

function configuredAdminToken(): string | null {
  for (const key of ADMIN_TOKEN_ENV_KEYS) {
    const value = process.env[key]?.trim();
    if (value) return value;
  }
  return null;
}

function safeEqual(a: string, b: string): boolean {
  const left = Buffer.from(a);
  const right = Buffer.from(b);
  return left.length === right.length && timingSafeEqual(left, right);
}

function tokenFromAuthorizationHeader(value: string | undefined): string | null {
  if (!value) return null;
  const match = /^Bearer\s+(.+)$/i.exec(value.trim());
  return match?.[1]?.trim() || null;
}

export const requireAdminAuth: RequestHandler = (req, res, next) => {
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

  const presented =
    tokenFromAuthorizationHeader(req.get("authorization")) ??
    req.get("x-scanner-admin-token")?.trim();

  if (!presented || !safeEqual(presented, expected)) {
    res.set("WWW-Authenticate", 'Bearer realm="scanner-admin"');
    res.status(401).json({ error: "Admin authorization required" });
    return;
  }

  next();
};
