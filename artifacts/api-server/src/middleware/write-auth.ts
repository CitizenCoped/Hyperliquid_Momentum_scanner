import { timingSafeEqual } from "node:crypto";
import type { RequestHandler } from "express";

const SAFE_METHODS = new Set(["GET", "HEAD", "OPTIONS"]);

function configuredWriteToken(): string | null {
  const token = process.env["SCANNER_WRITE_TOKEN"]?.trim();
  return token ? token : null;
}

function bearerToken(value: string | undefined): string | null {
  if (!value) return null;
  const match = /^Bearer\s+(.+)$/i.exec(value);
  return match?.[1]?.trim() || null;
}

function suppliedWriteTokens(req: Parameters<RequestHandler>[0]): string[] {
  const tokens = [
    bearerToken(req.get("authorization")),
    req.get("x-scanner-write-token")?.trim() || null,
  ];
  return tokens.filter((token): token is string => Boolean(token));
}

function tokenMatches(supplied: string, expected: string): boolean {
  const suppliedBytes = Buffer.from(supplied, "utf8");
  const expectedBytes = Buffer.from(expected, "utf8");

  if (suppliedBytes.length !== expectedBytes.length) {
    return false;
  }

  return timingSafeEqual(suppliedBytes, expectedBytes);
}

export const requireWriteToken: RequestHandler = (req, res, next) => {
  if (SAFE_METHODS.has(req.method.toUpperCase())) {
    next();
    return;
  }

  const expected = configuredWriteToken();
  if (!expected) {
    res.status(503).json({
      error: "Scanner write token is not configured.",
    });
    return;
  }

  const authorized = suppliedWriteTokens(req).some((token) =>
    tokenMatches(token, expected),
  );

  if (!authorized) {
    res.status(401).json({
      error: "A valid scanner write token is required.",
    });
    return;
  }

  next();
};
