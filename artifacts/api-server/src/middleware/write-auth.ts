import { timingSafeEqual } from "node:crypto";
import type { NextFunction, Request, Response } from "express";

const SAFE_METHODS = new Set(["GET", "HEAD", "OPTIONS"]);

function safeTokenEquals(actual: string, expected: string): boolean {
  const actualBuffer = Buffer.from(actual);
  const expectedBuffer = Buffer.from(expected);
  if (actualBuffer.length !== expectedBuffer.length) return false;
  return timingSafeEqual(actualBuffer, expectedBuffer);
}

function tokenFromRequest(req: Request): string | null {
  const headerToken = req.get("x-scanner-write-token");
  if (headerToken) return headerToken;

  const authorization = req.get("authorization");
  const match = authorization?.match(/^Bearer\s+(.+)$/i);
  return match?.[1] ?? null;
}

export function requireScannerWriteAuth(
  req: Request,
  res: Response,
  next: NextFunction,
): void {
  if (SAFE_METHODS.has(req.method.toUpperCase())) {
    next();
    return;
  }

  const expectedToken = process.env.SCANNER_WRITE_TOKEN;
  if (!expectedToken) {
    res.status(503).json({ error: "Scanner write token is not configured" });
    return;
  }

  const providedToken = tokenFromRequest(req);
  if (!providedToken || !safeTokenEquals(providedToken, expectedToken)) {
    res.status(401).json({ error: "Unauthorized" });
    return;
  }

  next();
}
