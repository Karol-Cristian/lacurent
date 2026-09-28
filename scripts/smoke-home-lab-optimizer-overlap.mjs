import {createHash} from "node:crypto";
import {chromium} from "playwright";

const baseUrl = process.env.HOME_LAB_BASE_URL;
if (!baseUrl) throw new Error("HOME_LAB_BASE_URL is required");

const browser = await chromium.launch({headless:true});
const page = await browser.newPage({viewport:{width:1280,height:900}});
const compactCandidateCounts = new Map();
let releaseCostBasis;
const costBasisGate = new Promise(resolve => { releaseCostBasis = resolve; });

page.on("request", request => {
  if (!request.url().endsWith("/api/home-lab-next/calculate")) return;
  const body = request.postData() || "";
  if (!body.includes('_optimizer_candidate')) return;
  const boundary = body.split("\r\n", 1)[0];
  const normalizedBody = boundary ? body.split(boundary).join("<multipart-boundary>") : body;
  const fingerprint = createHash("sha256").update(normalizedBody).digest("hex");
  compactCandidateCounts.set(fingerprint, (compactCandidateCounts.get(fingerprint) || 0) + 1);
});

try {
  await page.route("**/api/market-cost-basis", async route => {
    await costBasisGate;
    await route.continue();
  });
  await page.goto(`${baseUrl}/home-lab-next`, {waitUntil:"domcontentloaded", timeout:30000});
  await page.waitForSelector("[data-home-lab-next]", {state:"visible", timeout:15000});
  await page.waitForFunction(
    () => document.querySelector("#hlnDockCta") && !document.querySelector("#hlnDockCta").disabled,
    null,
    {timeout:20000}
  );
  await page.locator("#hlnDockCta").click();
  await page.waitForSelector('[data-hln-screen="site"].is-active', {state:"visible", timeout:15000});

  const dispatched = await page.evaluate(() => {
    const button = document.querySelector('[data-hln-smart-config="roi"]');
    if (!(button instanceof HTMLButtonElement)) return false;
    button.click();
    button.click();
    return true;
  });
  if (!dispatched) throw new Error("Best ROI button is missing");
  releaseCostBasis();

  await page.waitForFunction(
    () => {
      const button = document.querySelector('[data-hln-smart-config="roi"]');
      const note = String(document.querySelector("#hlnOptimizationNote")?.textContent || "");
      return button && !button.disabled && (note.includes("CAPEX") || note.includes("Nicio"));
    },
    null,
    {timeout:90000}
  );

  const duplicates = [...compactCandidateCounts.entries()].filter(([, count]) => count > 1);
  if (duplicates.length) {
    throw new Error(
      `Rapid optimizer clicks issued duplicate candidate calculations: ${duplicates.map(([, count]) => count).join(",")}`
    );
  }
  if (!compactCandidateCounts.size) throw new Error("Optimizer issued no compact candidate calculations");

  console.log(JSON.stringify({
    status:"ok",
    uniqueCompactCandidates:compactCandidateCounts.size,
    duplicateCompactCandidates:duplicates.length,
  }));
} finally {
  await browser.close();
}
