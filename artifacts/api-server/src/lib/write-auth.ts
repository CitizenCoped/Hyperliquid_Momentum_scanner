import { createHash, timingSafeEqual } from "node:crypto";
import type { NextFunction, Request, RequestHandler, Response } from "express";

const SAFE_METHODS = new Set(["GET", "HEAD", "OPTIONS"]);

interface WriteAuthInput {
  method: string;
  configuredToken?: string | null;
  authorizationHeader?: string | null;
  scannerWriteTokenHeader?: string | null;
  nodeEnv?: string;
}

export interface WriteAuthDecision {
  allowed: boolean;
  status?: 401 | 503;
  error?: string;
}

function normalizeToken(token?: string | null): string | null {
  const trimmed = token?.trim();
  return trimmed ? trimmed : null;
}

function extractBearerToken(header?: string | null): string | null {
  const value = normalizeToken(header);
  if (!value) return null;

  const [scheme, ...rest] = value.split(/\s+/);
  if (scheme?.toLowerCase() !== "bearer") return null;

  return normalizeToken(rest.join(" "));
}

function tokensMatch(candidate: string, expected: string): boolean {
  const candidateDigest = createHash("sha256").update(candidate).digest();
  const expectedDigest = createHash("sha256").update(expected).digest();
  return timingSafeEqual(candidateDigest, expectedDigest);
}

export function authorizeWriteRequest({
  method,
  configuredToken,
  authorizationHeader,
  scannerWriteTokenHeader,
  nodeEnv = process.env.NODE_ENV,
}: WriteAuthInput): WriteAuthDecision {
  if (SAFE_METHODS.has(method.toUpperCase())) {
    return { allowed: true };
  }

  const expectedToken = normalizeToken(configuredToken);
  if (!expectedToken) {
    if (nodeEnv === "development") {
      return { allowed: true };
    }

    return {
      allowed: false,
      status: 503,
      error: "Scanner write token is not configured",
    };
  }

  const suppliedToken =
    extractBearerToken(authorizationHeader) ??
    normalizeToken(scannerWriteTokenHeader);

  if (suppliedToken && tokensMatch(suppliedToken, expectedToken)) {
    return { allowed: true };
  }

  return {
    allowed: false,
    status: 401,
    error: "A valid scanner write token is required",
  };
}

export function requireScannerWriteToken(): RequestHandler {
  return (req: Request, res: Response, next: NextFunction) => {
    const decision = authorizeWriteRequest({
      method: req.method,
      configuredToken: process.env.SCANNER_WRITE_TOKEN,
      authorizationHeader: req.get("authorization"),
      scannerWriteTokenHeader: req.get("x-scanner-write-token"),
    });

    if (decision.allowed) {
      next();
      return;
    }

    if (decision.status === 401) {
      res.setHeader("WWW-Authenticate", 'Bearer realm="scanner-writes"');
    }

    res.status(decision.status ?? 401).json({ error: decision.error });
  };
}
