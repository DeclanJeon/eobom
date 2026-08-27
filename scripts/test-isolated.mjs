import { mkdtempSync, readdirSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join, relative } from "node:path";
import { spawnSync } from "node:child_process";

function collectTests(directory) {
  return readdirSync(directory, { withFileTypes: true }).flatMap((entry) => {
    const path = join(directory, entry.name);
    if (entry.isDirectory()) return collectTests(path);
    return entry.name.endsWith(".test.ts") || entry.name.endsWith(".test.tsx") ? [path] : [];
  });
}

function resolveTestArgs(rawArgs) {
  const excludes = [];
  const args = [];
  for (let index = 0; index < rawArgs.length; index += 1) {
    if (rawArgs[index] === "--exclude") {
      if (rawArgs[index + 1]) excludes.push(rawArgs[index + 1]);
      index += 1;
    } else {
      args.push(rawArgs[index]);
    }
  }
  if (excludes.length === 0) return args.length ? args : ["tests/"];
  const candidates = collectTests("tests");
  return candidates.filter((path) => !excludes.includes(relative(process.cwd(), path)));
}
const directory = mkdtempSync(join(tmpdir(), "eobom-test-"));
const databaseUrl = `file:${join(directory, "eobom.db")}`;
const environment = { ...process.env, DATABASE_URL: databaseUrl, DATABASE_URL_TEST: databaseUrl };

function run(args, extra = {}) {
  const result = spawnSync("bun", args, {
    cwd: process.cwd(),
    env: { ...environment, ...extra },
    stdio: "inherit",
  });
  if (result.error) throw result.error;
  if (result.status !== 0) process.exit(result.status ?? 1);
}

try {
  run(["x", "prisma", "db", "push", "--skip-generate"]);
  const fts = spawnSync("bun", ["x", "prisma", "db", "execute", "--file", "prisma/fts5-setup.sql", "--schema", "prisma/schema.prisma"], {
    cwd: process.cwd(),
    env: environment,
    stdio: "inherit",
  });
  if (fts.status !== 0) run(["x", "prisma", "db", "execute", "--file", "prisma/fts5-setup-fallback.sql", "--schema", "prisma/schema.prisma"]);
  run(["test", ...resolveTestArgs(process.argv.slice(2))]);
} finally {
  rmSync(directory, { recursive: true, force: true });
}
