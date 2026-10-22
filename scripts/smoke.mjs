// scripts/smoke.mjs: browser smoke test against a RUNNING app (signed-out states).
// Fails on any page error, on a React render loop ("Maximum update depth"), or if navigation clicks do nothing.
// Usage: BASE=http://localhost:3000 npm run smoke   (CHROMIUM=/path/to/chromium to override the browser)
import { chromium } from "playwright";
import { existsSync } from "node:fs";

const BASE = process.env.BASE ?? "http://localhost:3000";
const exe = process.env.CHROMIUM ?? ["/usr/bin/chromium", "/usr/bin/google-chrome"].find(existsSync);
const PAGES = ["/", "/report", "/investigator", "/guardian", "/council", "/dean", "/how-it-works", "/admin/policies"];
const FATAL = /Maximum update depth|Too many re-renders|Hydration failed/i;

const browser = await chromium.launch({ headless: true, ...(exe ? { executablePath: exe } : {}) });
const page = await browser.newPage({ viewport: { width: 1280, height: 800 } });
const problems = [];
page.on("pageerror", (e) => problems.push(`pageerror: ${String(e).slice(0, 200)}`));
page.on("console", (m) => { if (m.type() === "error" && FATAL.test(m.text())) problems.push(`console: ${m.text().slice(0, 200)}`); });

let failed = 0;
const check = (ok, label) => { console.log(`${ok ? "PASS" : "FAIL"}  ${label}`); if (!ok) failed++; };

for (const path of PAGES) {
  const before = problems.length;
  const t0 = Date.now();
  const res = await page.goto(BASE + path, { waitUntil: "networkidle", timeout: 60000 }).catch((e) => ({ status: () => `ERR ${e.message}` }));
  await page.waitForTimeout(1500); // let effects settle; a render loop shows up here
  check(res.status() === 200 && problems.length === before, `${path} loads cleanly (HTTP ${res.status()}, ${Date.now() - t0} ms)`);
}

await page.goto(BASE + "/", { waitUntil: "networkidle" });
await page.getByRole("link", { name: /file a sealed report/i }).first().click({ timeout: 5000 }).catch(() => {});
await page.waitForURL(/\/report/, { timeout: 5000 }).catch(() => {});
check(page.url().includes("/report"), `CTA "File a sealed report" navigates (now at ${page.url()})`);

await page.getByRole("link", { name: /how it works/i }).first().click({ timeout: 5000 }).catch(() => {});
await page.waitForURL(/how-it-works/, { timeout: 5000 }).catch(() => {});
check(page.url().includes("how-it-works"), "nav link 'How it works' navigates");

for (const p of [...new Set(problems)]) console.log(`      ${p}`);
await browser.close();
console.log(failed ? `\n${failed} smoke check(s) FAILED` : "\nall smoke checks passed");
process.exit(failed ? 1 : 0);
