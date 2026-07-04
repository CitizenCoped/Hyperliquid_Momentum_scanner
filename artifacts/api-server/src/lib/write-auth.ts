import { timingSafeEqual } from "node:crypto";
import type { NextFunction, Request, Response } from "express";

const PUBLIC_METHODS = new Set(["GET", "HEAD", "OPTIONS"]);

function configuredToken(): string | null {
  const token = process.env.SCANNER_WRITE_TOKEN?.trim();
  return token ? token : null;
}

function extractBearerToken(header: string | undefined): string | null {
  if (!header) return null;

  const [scheme, ...rest] = header.trim().split(/\s+/);
  if (scheme?.toLowerCase() !== "bearer") return null;

  const token = rest.join(" ").trim();
  return token ? token : null;
}

function tokensMatch(actual: string, expected: string): boolean {
  const actualBuffer = Buffer.from(actual);
  const expectedBuffer = Buffer.from(expected);

  if (actualBuffer.length !== expectedBuffer.length) {
    return false;
  }

  return timingSafeEqual(actualBuffer, expectedBuffer);
}

function requestToken(req: Request): string | null {
  return (
    extractBearerToken(req.get("authorization")) ??
    req.get("x-scanner-write-token")?.trim() ??
    null
  );
}

export function requireWriteToken(
  req: Request,
  res: Response,
  next: NextFunction,
): void {
  if (PUBLIC_METHODS.has(req.method.toUpperCase())) {
    next();
    return;
  }

  const expected = configuredToken();
  if (!expected) {
    res.status(503).json({
      error: "Scanner write API is not configured",
    });
    return;
  }

  const provided = requestToken(req);
  if (!provided || !tokensMatch(provided, expected)) {
    res.status(401).json({
      error: "Unauthorized scanner write request",
    });
    return;
  }

  next();
}
