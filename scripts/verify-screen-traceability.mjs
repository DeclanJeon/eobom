import { existsSync, readFileSync } from "node:fs";
import { join } from "node:path";

const root = process.cwd();
const manifestPath = join(root, "artifacts/eobom-design-v2/screen-route-traceability.json");
const manifest = JSON.parse(readFileSync(manifestPath, "utf8"));
const failures = [];
const expectedIds = Array.from({ length: 38 }, (_, index) => String(index + 1).padStart(2, "0"));

if (manifest.screens.length !== expectedIds.length) failures.push(`expected 38 screens, found ${manifest.screens.length}`);
const ids = manifest.screens.map((screen) => screen.id);
if (new Set(ids).size !== ids.length) failures.push("screen ids must be unique");
for (const id of expectedIds) if (!ids.includes(id)) failures.push(`missing screen id ${id}`);

function routeSource(route) {
  const path = route.replace(/^\//, "");
  if (path.startsWith("api/")) return join(root, "src/app", path, "route.ts");
  return join(root, "src/app", path, "page.tsx");
}

for (const screen of manifest.screens) {
  const htmlPath = join(root, "artifacts/eobom-design-v2/standalone-ui", screen.html);
  if (!existsSync(htmlPath)) failures.push(`${screen.id}: missing ${screen.html}`);
  for (const route of screen.route.split("|")) {
    if (!route.startsWith("/")) failures.push(`${screen.id}: invalid route ${route}`);
    if (!existsSync(routeSource(route))) failures.push(`${screen.id}: missing source for ${route}`);
  }
  if (!screen.state || !screen.implemented) failures.push(`${screen.id}: state and implemented are required`);
}

if (failures.length > 0) {
  console.error(failures.join("\n"));
  process.exit(1);
}

console.log(`traceability OK: ${manifest.screens.length} screens, ${new Set(manifest.screens.flatMap((screen) => screen.route.split("|"))).size} routes`);
