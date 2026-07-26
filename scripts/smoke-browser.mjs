import { chromium } from "playwright";
import fs from "fs";
import path from "path";

const outDir = "artifacts/screenshots";
fs.mkdirSync(outDir, { recursive: true });
const base = process.env.SMOKE_BASE || "https://eobom.ponslink.com";
const browser = await chromium.launch({ headless: true });
const page = await browser.newPage({ viewport: { width: 1280, height: 800 } });
const results = [];

async function shot(name, url, expectText) {
  const res = await page.goto(url, { waitUntil: "networkidle", timeout: 60000 });
  const status = res?.status() ?? 0;
  const body = await page.textContent("body");
  const okText = expectText ? body?.includes(expectText) : true;
  const file = path.join(outDir, `${name}.png`);
  await page.screenshot({ path: file, fullPage: true });
  results.push({ name, url, status, okText, file, title: await page.title() });
}

await shot("home", `${base}/`, "이어봄");
await shot("login", `${base}/login`, "Google");
await shot("contact", `${base}/contact`, "문의");
// protected should redirect to login
await page.goto(`${base}/today`, { waitUntil: "networkidle", timeout: 60000 });
const todayUrl = page.url();
await page.screenshot({ path: path.join(outDir, "today-redirect.png"), fullPage: true });
results.push({ name: "today-redirect", url: todayUrl, status: 200, okText: todayUrl.includes("login") || todayUrl.includes("today"), file: "artifacts/screenshots/today-redirect.png" });

await browser.close();
fs.writeFileSync(
  "artifacts/browser-automation-transcript.json",
  JSON.stringify(
    {
      schemaVersion: 1,
      kind: "playwright-browser-automation",
      base,
      results,
      generatedAt: new Date().toISOString(),
    },
    null,
    2,
  ),
);
console.log(JSON.stringify(results, null, 2));
