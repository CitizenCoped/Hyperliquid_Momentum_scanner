import { timingSafeEqual } from "node:crypto";
import type { NextFunction, Request, Response } from "express";

export const WRITE_TOKEN_ENV_VAR = "SCANNER_WRITE_TOKEN";
export const WRITE_TOKEN_HEADER = "x-scanner-write-token";

const READ_ONLY_METHODS = new Set(["GET", "HEAD", "OPTIONS"]);

function isReadOnlyMethod(method: string): boolean {
  return READ_ONLY_METHODS.has(method.toUpperCase());
}

function getConfiguredWriteToken(): string | null {
  const token = process.env[WRITE_TOKEN_ENV_VAR]?.trim();
  return token ? token : null;
}

function getRequestWriteToken(req: Request): string | null {
  const explicitHeader = req.get(WRITE_TOKEN_HEADER)?.trim();
  if (explicitHeader) return explicitHeader;

  const authorization = req.get("authorization")?.trim();
  const match = authorization?.match(/^Bearer\s+(.+)$/i);
  const bearerToken = match?.[1]?.trim();
  return bearerToken ? bearerToken : null;
}

function tokensMatch(provided: string, expected: string): boolean {
  const providedBuffer = Buffer.from(provided);
  const expectedBuffer = Buffer.from(expected);
  if (providedBuffer.length !== expectedBuffer.length) return false;
  return timingSafeEqual(providedBuffer, expectedBuffer);
}

export function requireScannerWriteToken(
  req: Request,
  res: Response,
  next: NextFunction,
): void {
  if (isReadOnlyMethod(req.method)) {
    next();
    return;
  }

  const expectedToken = getConfiguredWriteToken();
  if (!expectedToken) {
    res.status(503).json({
      error: `${WRITE_TOKEN_ENV_VAR} must be configured before scanner write endpoints can be used`,
    });
    return;
  }

  const providedToken = getRequestWriteToken(req);
  if (!providedToken || !tokensMatch(providedToken, expectedToken)) {
    res.set("WWW-Authenticate", 'Bearer realm="scanner-write"');
    res.status(401).json({ error: "Unauthorized" });
    return;
  }

  next();
}
