import { timingSafeEqual } from "node:crypto";
import type { RequestHandler } from "express";

const ADMIN_TOKEN_ENV_NAMES = [
  "SCANNER_ADMIN_TOKEN",
  "ADMIN_API_TOKEN",
  "SESSION_SECRET",
] as const;

function getConfiguredAdminToken(): string | null {
  for (const name of ADMIN_TOKEN_ENV_NAMES) {
    const value = process.env[name]?.trim();
    if (value) return value;
  }
  return null;
}

function extractBearerToken(header: string | undefined): string | null {
  if (!header) return null;
  const match = /^Bearer\s+(.+)$/i.exec(header.trim());
  return match?.[1]?.trim() || null;
}

function safeTokenEquals(actual: string | null, expected: string): boolean {
  if (!actual) return false;

  const actualBuffer = Buffer.from(actual);
  const expectedBuffer = Buffer.from(expected);
  if (actualBuffer.length !== expectedBuffer.length) return false;

  return timingSafeEqual(actualBuffer, expectedBuffer);
}

export const requireAdminAuth: RequestHandler = (req, res, next) => {
  const expected = getConfiguredAdminToken();
  if (!expected) {
    res.status(503).json({
      error:
        "Admin API token is not configured. Set SCANNER_ADMIN_TOKEN, ADMIN_API_TOKEN, or SESSION_SECRET.",
    });
    return;
  }

  const token = extractBearerToken(req.get("authorization"));
  if (!safeTokenEquals(token, expected)) {
    res.setHeader("WWW-Authenticate", "Bearer");
    res.status(401).json({ error: "Admin authorization required" });
    return;
  }

  next();
};
