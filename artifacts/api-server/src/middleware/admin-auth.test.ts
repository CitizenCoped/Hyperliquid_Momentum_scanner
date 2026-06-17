import { createServer, type Server } from "node:http";
import type { AddressInfo } from "node:net";
import test from "node:test";
import assert from "node:assert/strict";
import app from "../app";

async function withServer<T>(
  fn: (baseUrl: string) => Promise<T>,
): Promise<T> {
  const server: Server = createServer(app);
  await new Promise<void>((resolve) => server.listen(0, "127.0.0.1", resolve));

  try {
    const address = server.address() as AddressInfo;
    return await fn(`http://127.0.0.1:${address.port}`);
  } finally {
    await new Promise<void>((resolve, reject) => {
      server.close((err) => (err ? reject(err) : resolve()));
    });
  }
}

async function requestProtectedSettings(token?: string): Promise<Response> {
  return withServer((baseUrl) =>
    fetch(`${baseUrl}/api/settings`, {
      method: "PUT",
      headers: {
        "Content-Type": "application/json",
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
      },
      body: JSON.stringify({ watchThreshold: "not-a-number" }),
    }),
  );
}

function setAdminToken(value: string | undefined): () => void {
  const previous = process.env.SCANNER_ADMIN_TOKEN;
  if (value === undefined) {
    delete process.env.SCANNER_ADMIN_TOKEN;
  } else {
    process.env.SCANNER_ADMIN_TOKEN = value;
  }

  return () => {
    if (previous === undefined) {
      delete process.env.SCANNER_ADMIN_TOKEN;
    } else {
      process.env.SCANNER_ADMIN_TOKEN = previous;
    }
  };
}

test("mutating scanner routes fail closed when no admin token is configured", async () => {
  const restore = setAdminToken(undefined);
  try {
    const response = await requestProtectedSettings("anything");

    assert.equal(response.status, 503);
    assert.match(await response.text(), /SCANNER_ADMIN_TOKEN/);
  } finally {
    restore();
  }
});

test("mutating scanner routes require a bearer token", async () => {
  const restore = setAdminToken("correct-token");
  try {
    const response = await requestProtectedSettings();

    assert.equal(response.status, 401);
    assert.match(await response.text(), /Admin bearer token required/);
  } finally {
    restore();
  }
});

test("mutating scanner routes reject incorrect bearer tokens", async () => {
  const restore = setAdminToken("correct-token");
  try {
    const response = await requestProtectedSettings("wrong-token");

    assert.equal(response.status, 403);
    assert.match(await response.text(), /Invalid admin bearer token/);
  } finally {
    restore();
  }
});

test("mutating scanner routes continue to route after a valid bearer token", async () => {
  const restore = setAdminToken("correct-token");
  try {
    const response = await requestProtectedSettings("correct-token");

    assert.equal(response.status, 400);
    assert.match(await response.text(), /Invalid settings payload/);
  } finally {
    restore();
  }
});
