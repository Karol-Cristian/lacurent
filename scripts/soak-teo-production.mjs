import { chromium } from "playwright";
import crypto from "node:crypto";

const baseUrl = String(process.env.HOME_LAB_BASE_URL || "").replace(/\/$/, "");
const runs = Number(process.env.TEO_SOAK_RUNS || 10);
if (!baseUrl) throw new Error("HOME_LAB_BASE_URL is required");

function percentile(values, p) {
  const sorted = [...values].sort((a,b) => a-b);
  if (!sorted.length) return 0;
  return sorted[Math.min(sorted.length - 1, Math.ceil((p / 100) * sorted.length) - 1)];
}

async function runOnce(browser, ordinal) {
  const context = await browser.newContext({viewport:{width:1280,height:900}});
  const page = await context.newPage();
  const serverErrors = [];
  const teoRoutes = [];
  const requestFailures = [];
  const pageErrors = [];

  page.on("pageerror", error => pageErrors.push(String(error?.stack || error)));
  page.on("requestfailed", request => {
    try {
      const url = new URL(request.url());
      const failure = request.failure()?.errorText || "failed";
      const benignAbort =
        failure === "net::ERR_ABORTED"
        && url.pathname === "/api/home-lab-next/calculate";
      if (url.origin === new URL(baseUrl).origin && !benignAbort) {
        requestFailures.push(request.method() + " " + url.pathname + " :: " + failure);
      }
    } catch {}
  });
  page.on("response", response => {
    try {
      const url = new URL(response.url());
      if (url.origin !== new URL(baseUrl).origin) return;
      if (response.status() >= 500) {
        serverErrors.push(response.request().method() + " " + url.pathname + " :: " + response.status());
      }
      if (
        url.pathname.startsWith("/api/optimization/home-lab/v3/")
        || url.pathname.startsWith("/api/optimization/home-lab/v4/")
      ) {
        teoRoutes.push({
          path:url.pathname,
          status:response.status(),
          route:response.headers()["x-lacurent-teo"] || "",
          shard:response.headers()["x-lacurent-teo-shard"] || "",
        });
      }
    } catch {}
  });

  const started = performance.now();
  try {
    await page.goto(baseUrl + "/home-lab-next", {waitUntil:"networkidle", timeout:45000});
    if (!(await page.locator("[data-editorial-lab]").count())) {
      const body = (await page.locator("body").innerText()).slice(0,1200);
      throw new Error("Editorial bootstrap failed: " + body);
    }

    const privacy = page.locator("[data-lacurent-first-use-consent]");
    if (await privacy.isVisible()) {
      await privacy.locator("[data-lacurent-deny-local]").click();
      await privacy.waitFor({state:"hidden",timeout:5000});
    }

    await page.locator('[data-page="intro"] [data-next]').click();
    await page.locator('[data-page="house"].is-active').waitFor({state:"visible",timeout:15000});

    const marker = page.locator('#edLocationMap .ed-map-locality[data-climate-zone="III"]').first();
    await marker.waitFor({state:"visible",timeout:10000});
    const calcPromise = page.waitForResponse(
      response => {
        try {
          return new URL(response.url()).pathname === "/api/home-lab-next/calculate"
            && response.request().method() === "POST";
        } catch { return false; }
      },
      {timeout:45000},
    );
    await marker.dispatchEvent("click");
    const calc = await calcPromise;
    if (calc.status() !== 200) throw new Error("Baseline RBPE returned HTTP " + calc.status());

    for (const pageName of ["house","envelope","systems","renewables"]) {
      await page.locator('[data-page="' + pageName + '"] [data-next]').click();
      const nextName =
        pageName === "house" ? "envelope"
        : pageName === "envelope" ? "systems"
        : pageName === "systems" ? "renewables"
        : "goal";
      await page.locator('[data-page="' + nextName + '"].is-active').waitFor({
        state:"visible",
        timeout:15000,
      });
    }

    await page.locator("#runAnalysis").click();
    await page.waitForFunction(
      () => {
        const result = document.querySelector("#edTeoResult");
        const state = String(document.querySelector("#edTeoRunState")?.textContent || "").trim();
        return (result && !result.hasAttribute("hidden")) || state === "Eroare";
      },
      null,
      {timeout:210000},
    );

    const teoState = String(await page.locator("#edTeoRunState").innerText()).trim();
    if (teoState === "Eroare") {
      throw new Error(
        "TEO UI failed: " + await page.locator("#edNzebMessage").innerText()
        + " log=" + (await page.locator("#runLog").innerText()).slice(-6000)
      );
    }
    if (!(await page.locator('[data-page="goal"].is-active').count())) {
      throw new Error("TEO result left page 5 unexpectedly.");
    }
    if (serverErrors.length) {
      throw new Error("TEO produced server 5xx: " + JSON.stringify(serverErrors));
    }
    if (pageErrors.length || requestFailures.length) {
      throw new Error("Browser errors: " + JSON.stringify({pageErrors,requestFailures}));
    }

    const criticalRoutes = teoRoutes.filter(row =>
      row.path.endsWith("/v4/plan")
      || row.path.endsWith("/v3/verify")
      || row.path.includes("/v4/flow/")
      || row.path.endsWith("/v4/flow/start")
    );
    if (!criticalRoutes.length) throw new Error("No TEO API responses were observed.");
    for (const row of criticalRoutes) {
      if (row.route !== "private-teo-sharded") {
        throw new Error("TEO bypassed private router: " + JSON.stringify(row));
      }
    }

    await page.locator("#openReportFromGoal").click();
    await page.locator('[data-page="report"].is-active').waitFor({state:"visible",timeout:10000});
    const reportText = (await page.locator("#reportBody").innerText()).replace(/\s+/g," ").trim();
    const digest = crypto.createHash("sha256").update(reportText).digest("hex");
    const snapshot = await page.evaluate(() => ({
      energyClass:String(document.querySelector("#edBaselineClass")?.textContent || "").trim(),
      annualCost:String(document.querySelector("#edBaselineCost")?.textContent || "").trim(),
      finalEnergy:String(document.querySelector("#edBaselineFinalEnergy")?.textContent || "").trim(),
      primaryEnergy:String(document.querySelector("#edBaselinePrimaryEnergy")?.textContent || "").trim(),
      status:String(document.querySelector("#edBaselineStatus")?.textContent || "").trim(),
    }));

    return {
      ordinal,
      durationMs:performance.now() - started,
      digest,
      snapshot,
      shards:[...new Set(criticalRoutes.map(row => row.shard).filter(Boolean))],
      routeCount:criticalRoutes.length,
    };
  } finally {
    await context.close();
  }
}

const browser = await chromium.launch({headless:true});
const rows = [];
try {
  for (let ordinal=1; ordinal<=runs; ordinal++) {
    const row = await runOnce(browser, ordinal);
    rows.push(row);
    console.log(
      "TEO soak " + ordinal + "/" + runs
      + " " + Math.round(row.durationMs) + "ms"
      + " shards=" + row.shards.join(",")
      + " digest=" + row.digest.slice(0,12)
    );
  }
} finally {
  await browser.close();
}

const baseline = rows[0];
for (const row of rows.slice(1)) {
  if (JSON.stringify(row.snapshot) !== JSON.stringify(baseline.snapshot)) {
    throw new Error("TEO final HUD is non-deterministic: " + JSON.stringify({baseline,row}));
  }
  if (row.digest !== baseline.digest) {
    throw new Error("TEO final report is non-deterministic: " + JSON.stringify({
      baseline:baseline.digest,
      ordinal:row.ordinal,
      digest:row.digest,
    }));
  }
}

const durations = rows.map(row => row.durationMs);
console.log(JSON.stringify({
  status:"pass",
  runs,
  p50Ms:Math.round(percentile(durations,50)),
  p95Ms:Math.round(percentile(durations,95)),
  maxMs:Math.round(Math.max(...durations)),
  digest:baseline.digest,
  snapshot:baseline.snapshot,
}, null, 2));
