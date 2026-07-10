import { timingSafeEqual } from "node:crypto";
import type { NextFunction, Request, Response } from "express";

const SAFE_METHODS = new Set(["GET", "HEAD", "OPTIONS"]);

function configuredToken(): string | null {
  const token = process.env["SCANNER_WRITE_TOKEN"]?.trim();
  return token ? token : null;
}

function timingSafeTokenEqual(actual: string, expected: string): boolean {
  const actualBuffer = Buffer.from(actual);
  const expectedBuffer = Buffer.from(expected);

  if (actualBuffer.length !== expectedBuffer.length) {
    return false;
  }

  return timingSafeEqual(actualBuffer, expectedBuffer);
}

function bearerToken(req: Request): string | null {
  const value = req.get("authorization");
  if (!value) return null;

  const [scheme, token] = value.split(/\s+/, 2);
  if (scheme?.toLowerCase() !== "bearer") return null;

  const normalized = token?.trim();
  return normalized ? normalized : null;
}

function scannerWriteTokenHeader(req: Request): string | null {
  const value = req.get("x-scanner-write-token")?.trim();
  return value ? value : null;
}

export function requireScannerWriteAuth(
  req: Request,
  res: Response,
  next: NextFunction,
) {
  if (SAFE_METHODS.has(req.method.toUpperCase())) {
    next();
    return;
  }

  const expected = configuredToken();
  if (!expected) {
    res.status(503).json({
      error: "Scanner write access is not configured",
    });
    return;
  }

  const provided = bearerToken(req) ?? scannerWriteTokenHeader(req);
  if (!provided || !timingSafeTokenEqual(provided, expected)) {
    res.status(401).json({
      error: "Scanner write token is required",
    });
    return;
  }

  next();
}
