import { timingSafeEqual } from "node:crypto";
import type { Request, RequestHandler } from "express";

const SAFE_METHODS = new Set(["GET", "HEAD", "OPTIONS"]);

function configuredWriteToken(): string | null {
  const token = process.env["SCANNER_WRITE_TOKEN"]?.trim();
  return token ? token : null;
}

function tokenFromRequest(req: Request): string | null {
  const headerToken = req.get("x-scanner-write-token")?.trim();
  if (headerToken) return headerToken;

  const authorization = req.get("authorization");
  const bearerMatch = authorization?.match(/^Bearer\s+(.+)$/i);
  return bearerMatch?.[1]?.trim() || null;
}

function tokensMatch(actual: string, expected: string): boolean {
  const actualBuffer = Buffer.from(actual);
  const expectedBuffer = Buffer.from(expected);

  return (
    actualBuffer.length === expectedBuffer.length &&
    timingSafeEqual(actualBuffer, expectedBuffer)
  );
}

export const requireWriteAuth: RequestHandler = (req, res, next) => {
  if (SAFE_METHODS.has(req.method.toUpperCase())) {
    next();
    return;
  }

  const expectedToken = configuredWriteToken();
  if (!expectedToken) {
    res
      .status(503)
      .json({ error: "Scanner write authentication is not configured" });
    return;
  }

  const actualToken = tokenFromRequest(req);
  if (!actualToken || !tokensMatch(actualToken, expectedToken)) {
    res.status(401).json({ error: "Unauthorized" });
    return;
  }

  next();
};
