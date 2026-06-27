import { timingSafeEqual } from "node:crypto";
import type { Request, RequestHandler } from "express";

const SAFE_METHODS = new Set(["GET", "HEAD", "OPTIONS"]);
const WRITE_TOKEN_ENV = "SCANNER_WRITE_TOKEN";

function configuredWriteToken(): string | null {
  const token = process.env[WRITE_TOKEN_ENV]?.trim();
  return token ? token : null;
}

function allowsMissingToken(): boolean {
  return process.env.NODE_ENV === "development" || process.env.NODE_ENV === "test";
}

function getHeader(req: Request, name: string): string | undefined {
  const value = req.get(name);
  return Array.isArray(value) ? value[0] : value;
}

function providedWriteToken(req: Request): string | null {
  const authorization = getHeader(req, "authorization");
  const bearer = authorization?.match(/^Bearer\s+(.+)$/i)?.[1]?.trim();
  if (bearer) return bearer;

  const headerToken = getHeader(req, "x-scanner-write-token")?.trim();
  return headerToken || null;
}

function tokensMatch(provided: string, expected: string): boolean {
  const providedBytes = Buffer.from(provided);
  const expectedBytes = Buffer.from(expected);
  if (providedBytes.length !== expectedBytes.length) return false;
  return timingSafeEqual(providedBytes, expectedBytes);
}

export const requireWriteToken: RequestHandler = (req, res, next) => {
  if (SAFE_METHODS.has(req.method.toUpperCase())) {
    next();
    return;
  }

  const expected = configuredWriteToken();
  if (!expected) {
    if (allowsMissingToken()) {
      next();
      return;
    }

    res.status(503).json({
      error: `${WRITE_TOKEN_ENV} must be configured before API writes are enabled.`,
    });
    return;
  }

  const provided = providedWriteToken(req);
  if (!provided || !tokensMatch(provided, expected)) {
    res.setHeader("WWW-Authenticate", 'Bearer realm="scanner-admin"');
    res.status(401).json({ error: "Valid scanner admin token required." });
    return;
  }

  next();
};
