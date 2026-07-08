import { timingSafeEqual } from "node:crypto";
import type { RequestHandler } from "express";

const WRITE_METHODS = new Set(["POST", "PUT", "PATCH", "DELETE"]);

export function isWriteMethod(method: string): boolean {
  return WRITE_METHODS.has(method.toUpperCase());
}

export function extractScannerWriteToken(
  authorizationHeader: string | undefined,
  scannerTokenHeader: string | undefined,
): string | null {
  const bearerMatch = authorizationHeader?.match(/^Bearer\s+(.+)$/i);
  const token = bearerMatch?.[1] ?? scannerTokenHeader;
  const trimmed = token?.trim();

  return trimmed ? trimmed : null;
}

export function isScannerWriteTokenValid(
  expectedToken: string | undefined,
  providedToken: string | null,
): boolean {
  const expected = expectedToken?.trim();
  if (!expected || !providedToken) return false;

  const expectedBuffer = Buffer.from(expected);
  const providedBuffer = Buffer.from(providedToken);
  if (expectedBuffer.length !== providedBuffer.length) return false;

  return timingSafeEqual(expectedBuffer, providedBuffer);
}

export const requireScannerWriteToken: RequestHandler = (req, res, next) => {
  if (!isWriteMethod(req.method)) {
    next();
    return;
  }

  const expectedToken = process.env.SCANNER_WRITE_TOKEN;
  const providedToken = extractScannerWriteToken(
    req.get("authorization"),
    req.get("x-scanner-write-token"),
  );

  if (!expectedToken?.trim()) {
    res.status(503).json({ error: "Scanner write token is not configured" });
    return;
  }

  if (!isScannerWriteTokenValid(expectedToken, providedToken)) {
    res.status(401).json({ error: "Unauthorized" });
    return;
  }

  next();
};
