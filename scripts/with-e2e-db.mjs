import { mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { spawn, spawnSync } from "node:child_process";

const dir = mkdtempSync(join(tmpdir(), "e2e-"));
const dbPath = join(dir, "e2e.db");
const dbUrl = `file:${dbPath}`;
process.env.DATABASE_URL = dbUrl;
process.env.DATABASE_URL_TEST = dbUrl;

const push = spawnSync("bunx", ["prisma", "db", "push", "--skip-generate", "--accept-data-loss"], {
  env: { ...process.env, DATABASE_URL: dbUrl, DATABASE_URL_TEST: dbUrl },
  stdio: "inherit",
});
if (push.status !== 0) process.exit(push.status ?? 1);

spawnSync("bunx", ["prisma", "db", "execute", "--file", "prisma/fts5-setup.sql", "--schema", "prisma/schema.prisma"], {
  env: { ...process.env, DATABASE_URL: dbUrl },
  stdio: "inherit",
});
// Seed Story corpus from dev DB so 5routes story-mirror tests have data
try {
  const { DatabaseSync } = await import("node:sqlite");
  const devPath = join(process.cwd(), "db", "eobom.db");
  const e2eDb = new DatabaseSync(dbPath);
  try { e2eDb.exec(`ATTACH DATABASE '${devPath.replace(/'/g, "''")}' AS dev`); } catch {}
  const tables = ["StoryWork", "StoryChunk", "StoryCard", "StoryEdition", "StoryPassage"];
  for (const t of tables) {
    try { e2eDb.exec(`INSERT OR IGNORE INTO main."${t}" SELECT * FROM dev."${t}"`); } catch {}
  }
  try { e2eDb.exec("DETACH DATABASE dev"); } catch {}
  e2eDb.close();
  console.log("[e2e-db] corpus seeded");
} catch (e) {
  console.warn("[e2e-db] corpus seed skipped", e);
}
console.log(`[e2e-db] ${dbUrl}`);
// Keep dev server alive — Playwright will kill this wrapper when done
const child = spawn("bun", ["run", "dev"], {
  env: { ...process.env, DATABASE_URL: dbUrl, DATABASE_URL_TEST: dbUrl },
  stdio: "inherit",
});
child.on("exit", (code) => {
  try { rmSync(dir, { recursive: true, force: true }); } catch {}
  process.exit(code ?? 0);
});
process.on("SIGTERM", () => {
  try { rmSync(dir, { recursive: true, force: true }); } catch {}
  child.kill("SIGTERM");
});
process.on("SIGINT", () => {
  try { rmSync(dir, { recursive: true, force: true }); } catch {}
  child.kill("SIGINT");
});
