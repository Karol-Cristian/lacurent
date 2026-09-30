import { chromium } from "playwright";
import crypto from "node:crypto";

const baseUrl = String(process.env.HOME_LAB_BASE_URL || "").replace(/\/$/, "");
const runs = Number(process.env.TEO_SOAK_RUNS || 10);
const diagnosticOnly = process.env.TEO_DIAGNOSTIC_ONLY === "1";
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
    const sections = await page.locator("#reportBody .ed-report-section").evaluateAll(nodes =>
      nodes.map(node => {
        const heading = String(node.querySelector("h2")?.textContent || "(fără titlu)").trim();
        const text = String(node.textContent || "").replace(/\s+/g," ").trim();
        return {heading,text};
      })
    );
    const sectionDigests = Object.fromEntries(
      sections.map(section => [
        section.heading,
        crypto.createHash("sha256").update(section.text).digest("hex").slice(0,12),
      ])
    );
    const snapshot = await page.evaluate(() => ({
      energyClass:String(document.querySelector("#edBaselineClass")?.textContent || "").trim(),
      annualCost:String(document.querySelector("#edBaselineCost")?.textContent || "").trim(),
      finalEnergy:String(document.querySelector("#edBaselineFinalEnergy")?.textContent || "").trim(),
      primaryEnergy:String(document.querySelector("#edBaselinePrimaryEnergy")?.textContent || "").trim(),
      status:String(document.querySelector("#edBaselineStatus")?.textContent || "").trim(),
    }));
    const runLogTail = (await page.locator("#runLog").innerText())
      .split("\n")
      .filter(Boolean)
      .slice(-24);
    const page5Summary = await page.evaluate(() => ({
      measures:[...document.querySelectorAll("#edTeoMeasures .ed-teo-measure")]
        .map(node => String(node.textContent || "").replace(/\s+/g," ").trim()),
      capex:String(document.querySelector("#edTeoCapex")?.textContent || "").trim(),
      saving:String(document.querySelector("#edTeoSaving")?.textContent || "").trim(),
      payback:String(document.querySelector("#edTeoPayback")?.textContent || "").trim(),
      finalists:String(document.querySelector("#edTeoFinalists")?.textContent || "").trim(),
      compliant:String(document.querySelector("#edTeoCompliant")?.textContent || "").trim(),
      evaluated:String(document.querySelector("#edTeoEvaluated")?.textContent || "").trim(),
      badge:String(document.querySelector("#edTeoComplianceBadge")?.textContent || "").replace(/\s+/g," ").trim(),
    }));

    return {
      ordinal,
      durationMs:performance.now() - started,
      digest,
      snapshot,
      sections,
      sectionDigests,
      page5Summary,
      runLogTail,
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
      + " sections=" + JSON.stringify(row.sectionDigests)
      + " page5=" + JSON.stringify(row.page5Summary)
    );
  }
} finally {
  await browser.close();
}

const baseline = rows[0];
const differences = [];
for (const row of rows.slice(1)) {
  if (JSON.stringify(row.snapshot) !== JSON.stringify(baseline.snapshot)) {
    differences.push({
      kind:"hud",
      ordinal:row.ordinal,
      baseline:baseline.snapshot,
      current:row.snapshot,
    });
  }
  if (row.digest !== baseline.digest) {
    const baselineSections = new Map(baseline.sections.map(section => [section.heading, section.text]));
    const currentSections = new Map(row.sections.map(section => [section.heading, section.text]));
    const changedSections = [];
    for (const heading of new Set([...baselineSections.keys(), ...currentSections.keys()])) {
      const left = baselineSections.get(heading) || "";
      const right = currentSections.get(heading) || "";
      if (left !== right) {
        changedSections.push({
          heading,
          baseline:left,
          current:right,
        });
      }
    }
    differences.push({
      kind:"report",
      ordinal:row.ordinal,
      baselineDigest:baseline.digest,
      currentDigest:row.digest,
      changedSections,
      baselinePage5:baseline.page5Summary,
      currentPage5:row.page5Summary,
      baselineRunLogTail:baseline.runLogTail,
      currentRunLogTail:row.runLogTail,
    });
  }
}

if (differences.length) {
  console.log("TEO_DIAGNOSTIC_DIFFERENCES=" + JSON.stringify(differences, null, 2));
  if (!diagnosticOnly) {
    throw new Error("TEO deterministic contract failed; see TEO_DIAGNOSTIC_DIFFERENCES above.");
  }
}

const durations = rows.map(row => row.durationMs);
console.log(JSON.stringify({
  status:differences.length ? "diagnostic_differences" : "pass",
  runs,
  p50Ms:Math.round(percentile(durations,50)),
  p95Ms:Math.round(percentile(durations,95)),
  maxMs:Math.round(Math.max(...durations)),
  digest:baseline.digest,
  snapshot:baseline.snapshot,
}, null, 2));
