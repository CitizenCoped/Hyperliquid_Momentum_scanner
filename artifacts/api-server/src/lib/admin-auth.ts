import { timingSafeEqual } from "node:crypto";
import type { Request, RequestHandler } from "express";

const ADMIN_TOKEN_ENV_VARS = ["SCANNER_ADMIN_TOKEN", "SESSION_SECRET"] as const;

function getConfiguredAdminToken(): string | null {
  for (const envVar of ADMIN_TOKEN_ENV_VARS) {
    const value = process.env[envVar]?.trim();
    if (value) return value;
  }
  return null;
}

function getRequestToken(req: Request): string | null {
  const authorization = req.get("authorization");
  if (authorization) {
    const [scheme, ...rest] = authorization.split(" ");
    if (scheme?.toLowerCase() === "bearer") {
      const token = rest.join(" ").trim();
      if (token) return token;
    }
  }

  const headerToken = req.get("x-admin-token")?.trim();
  return headerToken || null;
}

function tokensMatch(expected: string, received: string): boolean {
  const expectedBuffer = Buffer.from(expected);
  const receivedBuffer = Buffer.from(received);
  if (expectedBuffer.length !== receivedBuffer.length) return false;
  return timingSafeEqual(expectedBuffer, receivedBuffer);
}

export const requireAdminAuth: RequestHandler = (req, res, next) => {
  const configuredToken = getConfiguredAdminToken();
  if (!configuredToken) {
    res.status(503).json({
      error:
        "Admin token is not configured. Set SCANNER_ADMIN_TOKEN or SESSION_SECRET.",
    });
    return;
  }

  const requestToken = getRequestToken(req);
  if (!requestToken || !tokensMatch(configuredToken, requestToken)) {
    res.set("WWW-Authenticate", 'Bearer realm="scanner-admin"');
    res.status(401).json({ error: "Admin authorization required" });
    return;
  }

  next();
};
