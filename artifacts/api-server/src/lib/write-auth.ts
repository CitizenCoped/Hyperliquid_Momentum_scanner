import { timingSafeEqual } from "node:crypto";
import type { NextFunction, Request, Response } from "express";

const WRITE_TOKEN_HEADER = "x-scanner-write-token";

function configuredWriteToken(): string | null {
  const token = process.env.SCANNER_WRITE_TOKEN?.trim();
  return token ? token : null;
}

function tokenFromAuthorizationHeader(value: string | undefined): string | null {
  if (!value) return null;

  const [scheme, token, ...rest] = value.trim().split(/\s+/);
  if (rest.length > 0 || !/^Bearer$/i.test(scheme) || !token) return null;

  return token;
}

function tokenFromHeader(value: string | string[] | undefined): string | null {
  if (Array.isArray(value)) return value[0]?.trim() || null;
  return value?.trim() || null;
}

function tokensMatch(actual: string, expected: string): boolean {
  const actualBuffer = Buffer.from(actual);
  const expectedBuffer = Buffer.from(expected);

  return (
    actualBuffer.length === expectedBuffer.length &&
    timingSafeEqual(actualBuffer, expectedBuffer)
  );
}

export function requireScannerWriteAuth(
  req: Request,
  res: Response,
  next: NextFunction,
): void {
  const expected = configuredWriteToken();
  if (!expected) {
    res.status(503).json({ error: "Scanner write token is not configured" });
    return;
  }

  const actual =
    tokenFromAuthorizationHeader(req.get("authorization")) ??
    tokenFromHeader(req.headers[WRITE_TOKEN_HEADER]);

  if (!actual || !tokensMatch(actual, expected)) {
    res.status(401).json({ error: "Unauthorized scanner write request" });
    return;
  }

  next();
}
