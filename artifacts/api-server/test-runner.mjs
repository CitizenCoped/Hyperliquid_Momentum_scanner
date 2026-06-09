import { spawnSync } from "node:child_process";
import { mkdtemp, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { build } from "esbuild";

const packageDir = path.dirname(fileURLToPath(import.meta.url));
const tempDir = await mkdtemp(path.join(tmpdir(), "api-server-tests-"));
const outfile = path.join(tempDir, "scanner-engine.concurrency.test.mjs");

try {
  await build({
    entryPoints: [
      path.join(packageDir, "src/lib/scanner-engine.concurrency.test.ts"),
    ],
    bundle: true,
    platform: "node",
    format: "esm",
    outfile,
    logLevel: "silent",
    external: ["pg-native"],
  });

  const result = spawnSync(process.execPath, ["--test", outfile], {
    stdio: "inherit",
    env: {
      ...process.env,
      DATABASE_URL:
        process.env.DATABASE_URL ??
        "postgres://scanner:scanner@127.0.0.1:1/scanner",
    },
  });

  if (result.error) throw result.error;
  process.exitCode = result.status ?? 1;
} finally {
  await rm(tempDir, { recursive: true, force: true });
}
