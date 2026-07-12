import { timingSafeEqual } from "node:crypto";
import type { NextFunction, Request, Response } from "express";

const WRITE_METHODS = new Set(["POST", "PUT", "PATCH", "DELETE"]);

function getBearerToken(header: string | undefined): string | null {
  if (!header) return null;

  const match = /^Bearer\s+(.+)$/i.exec(header.trim());
  return match?.[1]?.trim() || null;
}

function tokenMatches(candidate: string | null, expected: string): boolean {
  if (!candidate) return false;

  const candidateBuffer = Buffer.from(candidate);
  const expectedBuffer = Buffer.from(expected);

  return (
    candidateBuffer.length === expectedBuffer.length &&
    timingSafeEqual(candidateBuffer, expectedBuffer)
  );
}

export function requireWriteAuth(
  req: Request,
  res: Response,
  next: NextFunction,
): void {
  if (!WRITE_METHODS.has(req.method.toUpperCase())) {
    next();
    return;
  }

  const expectedToken = process.env.SCANNER_WRITE_TOKEN?.trim();
  if (!expectedToken) {
    res.status(401).json({
      error: "Scanner write token is not configured",
    });
    return;
  }

  const bearerToken = getBearerToken(req.get("authorization"));
  const headerToken = req.get("x-scanner-write-token")?.trim() || null;

  if (
    tokenMatches(bearerToken, expectedToken) ||
    tokenMatches(headerToken, expectedToken)
  ) {
    next();
    return;
  }

  res.status(401).json({
    error: "Invalid scanner write token",
  });
}
