import { timingSafeEqual } from "node:crypto";
import type { RequestHandler } from "express";

const ADMIN_TOKEN_ENV = "SCANNER_ADMIN_TOKEN";

function configuredAdminToken(): string | null {
  const token = process.env[ADMIN_TOKEN_ENV]?.trim();
  return token ? token : null;
}

function extractPresentedToken(authorization: string | undefined): string | null {
  if (!authorization) return null;

  const [scheme, ...rest] = authorization.trim().split(/\s+/);
  if (scheme?.toLowerCase() !== "bearer" || rest.length !== 1) return null;

  const token = rest[0]?.trim();
  return token ? token : null;
}

function tokensMatch(expected: string, presented: string): boolean {
  const expectedBytes = Buffer.from(expected, "utf8");
  const presentedBytes = Buffer.from(presented, "utf8");

  if (expectedBytes.length !== presentedBytes.length) return false;
  return timingSafeEqual(expectedBytes, presentedBytes);
}

export const requireAdminAuth: RequestHandler = (req, res, next) => {
  const expectedToken = configuredAdminToken();
  if (!expectedToken) {
    res.status(503).json({
      error: `${ADMIN_TOKEN_ENV} is required for mutating scanner endpoints`,
    });
    return;
  }

  const presentedToken = extractPresentedToken(req.header("authorization"));
  if (!presentedToken) {
    res.status(401).json({ error: "Admin bearer token required" });
    return;
  }

  if (!tokensMatch(expectedToken, presentedToken)) {
    res.status(403).json({ error: "Invalid admin bearer token" });
    return;
  }

  next();
};
