import { timingSafeEqual } from "node:crypto";
import type { RequestHandler } from "express";

const READ_ONLY_METHODS = new Set(["GET", "HEAD", "OPTIONS"]);

export function isReadOnlyMethod(method: string): boolean {
  return READ_ONLY_METHODS.has(method.toUpperCase());
}

function extractBearerToken(header: string | undefined): string | null {
  if (!header) return null;

  const [scheme, ...parts] = header.trim().split(/\s+/);
  if (scheme?.toLowerCase() !== "bearer" || parts.length === 0) return null;

  const token = parts.join(" ").trim();
  return token.length > 0 ? token : null;
}

function tokenMatches(candidate: string | null | undefined, expected: string): boolean {
  if (!candidate) return false;

  const candidateBuffer = Buffer.from(candidate);
  const expectedBuffer = Buffer.from(expected);

  if (candidateBuffer.length !== expectedBuffer.length) return false;
  return timingSafeEqual(candidateBuffer, expectedBuffer);
}

export const requireWriteToken: RequestHandler = (req, res, next) => {
  if (isReadOnlyMethod(req.method)) {
    next();
    return;
  }

  const expectedToken = process.env["SCANNER_WRITE_TOKEN"]?.trim();
  if (!expectedToken) {
    res.status(503).json({
      error: "Scanner write API is disabled until SCANNER_WRITE_TOKEN is configured.",
    });
    return;
  }

  const bearerToken = extractBearerToken(req.get("authorization") ?? undefined);
  const headerToken = req.get("x-scanner-write-token")?.trim();

  if (
    tokenMatches(bearerToken, expectedToken) ||
    tokenMatches(headerToken, expectedToken)
  ) {
    next();
    return;
  }

  res.status(401).json({ error: "A valid scanner write token is required." });
};
