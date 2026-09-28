import { chromium } from "playwright";
import fs from "node:fs";
import crypto from "node:crypto";

const localBase = String(process.env.HOME_LAB_BASE_URL || "http://127.0.0.1:8765").replace(/\/$/, "");
const prodBase = String(process.env.RELIABILITY_PROD_BASE_URL || "https://lacurent.com").replace(/\/$/, "");
const serverPid = Number(process.env.HOME_LAB_SERVER_PID || 0) || null;

const cfg = Object.freeze({
  localSequential: Number(process.env.RELIABILITY_LOCAL_SEQUENTIAL || 250),
  localConcurrentBatches: Number(process.env.RELIABILITY_LOCAL_CONCURRENT_BATCHES || 15),
  localConcurrency: Number(process.env.RELIABILITY_LOCAL_CONCURRENCY || 6),
  prodSequential: Number(process.env.RELIABILITY_PROD_SEQUENTIAL || 80),
  prodConcurrentBatches: Number(process.env.RELIABILITY_PROD_CONCURRENT_BATCHES || 6),
  prodConcurrency: Number(process.env.RELIABILITY_PROD_CONCURRENCY || 4),
  localUiRounds: Number(process.env.RELIABILITY_LOCAL_UI_ROUNDS || 4),
  prodUiRounds: Number(process.env.RELIABILITY_PROD_UI_ROUNDS || 2),
  localTeoRuns: Number(process.env.RELIABILITY_LOCAL_TEO_RUNS || 3),
  prodTeoRuns: Number(process.env.RELIABILITY_PROD_TEO_RUNS || 5),
});

const metricKeys = [
  "energy_class",
  "annual_cost_lei",
  "annual_heating_demand_kwh",
  "annual_cooling_demand_kwh",
  "final_energy_kwh",
  "primary_energy_kwh",
  "primary_specific_kwh_m2",
  "design_heat_load_kw",
];

function percentile(values, p) {
  if (!values.length) return null;
  const sorted = [...values].sort((a,b) => a-b);
  const index = Math.min(sorted.length - 1, Math.max(0, Math.ceil((p / 100) * sorted.length) - 1));
  return sorted[index];
}

function rounded(value, digits = 2) {
  if (!Number.isFinite(value)) return null;
  return Number(value.toFixed(digits));
}

function readRssKb(pid) {
  if (!pid) return null;
  try {
    const text = fs.readFileSync("/proc/" + pid + "/status", "utf8");
    const match = text.match(/^VmRSS:\s+(\d+)\s+kB$/m);
    return match ? Number(match[1]) : null;
  } catch {
    return null;
  }
}

function scalarSnapshot(payload) {
  const out = {};
  for (const key of metricKeys) out[key] = payload?.[key] ?? null;
  out.pv_orientation = payload?.renewables?.pv?.orientation ?? null;
  return out;
}

function snapshotsEquivalent(a, b) {
  for (const key of metricKeys) {
    const av = a?.[key];
    const bv = b?.[key];
    if (key === "energy_class") {
      if (String(av ?? "") !== String(bv ?? "")) return false;
      continue;
    }
    if (av == null && bv == null) continue;
    const an = Number(av);
    const bn = Number(bv);
    if (!Number.isFinite(an) || !Number.isFinite(bn)) {
      if (String(av) !== String(bv)) return false;
      continue;
    }
    const tolerance = Math.max(1e-7, 1e-9 * Math.max(Math.abs(an), Math.abs(bn), 1));
    if (Math.abs(an - bn) > tolerance) return false;
  }
  return true;
}

function summarizeLatencies(values) {
  return {
    count: values.length,
    p50_ms: rounded(percentile(values, 50)),
    p95_ms: rounded(percentile(values, 95)),
    p99_ms: rounded(percentile(values, 99)),
    max_ms: rounded(values.length ? Math.max(...values) : NaN),
    mean_ms: rounded(values.length ? values.reduce((a,b) => a+b, 0) / values.length : NaN),
  };
}

async function captureCanonicalMultipart(browser, baseUrl) {
  const context = await browser.newContext({ viewport:{width:1280,height:900} });
  const page = await context.newPage();
  const diagnostics = {pageErrors:[], consoleErrors:[], serverErrors:[], requestFailures:[]};
  page.on("pageerror", error => diagnostics.pageErrors.push(String(error?.stack || error)));
  page.on("console", message => {
    if (message.type() === "error") diagnostics.consoleErrors.push(message.text());
  });
  page.on("response", response => {
    try {
      if (new URL(response.url()).origin === new URL(baseUrl).origin && response.status() >= 500) {
        diagnostics.serverErrors.push(response.request().method() + " " + response.url() + " :: " + response.status());
      }
    } catch {}
  });
  page.on("requestfailed", request => {
    try {
      const failure = request.failure()?.errorText || "failed";
      const url = new URL(request.url());
      const benignAbort = failure === "net::ERR_ABORTED" && url.pathname === "/api/home-lab-next/calculate";
      if (url.origin === new URL(baseUrl).origin && !benignAbort) {
        diagnostics.requestFailures.push(request.method() + " " + request.url() + " :: " + failure);
      }
    } catch {}
  });

  await page.goto(baseUrl + "/home-lab-next", {waitUntil:"networkidle", timeout:45000});
  const privacy = page.locator("[data-lacurent-first-use-consent]");
  if (await privacy.isVisible()) {
    await privacy.locator("[data-lacurent-deny-local]").click();
    await privacy.waitFor({state:"hidden",timeout:5000});
  }
  if (await page.locator('[data-page="intro"].is-active').count()) {
    await page.locator('[data-page="intro"] [data-next]').click();
  }
  await page.locator("#edLocationMap svg.ed-location-map-svg").waitFor({state:"visible",timeout:15000});
  const marker = page.locator('#edLocationMap .ed-map-locality[data-climate-zone="III"]').first();
  await marker.waitFor({state:"visible",timeout:10000});

  const responsePromise = page.waitForResponse(
    response => {
      try {
        return new URL(response.url()).pathname === "/api/home-lab-next/calculate"
          && response.request().method() === "POST"
          && response.status() === 200;
      } catch {
        return false;
      }
    },
    {timeout:45000}
  );
  await marker.dispatchEvent("click");
  const response = await responsePromise;
  const request = response.request();
  const body = request.postDataBuffer();
  const contentType = request.headers()["content-type"] || "";
  const payload = await response.json();

  if (!body?.length || !contentType.toLowerCase().includes("multipart/form-data")) {
    throw new Error("Could not capture canonical Editorial multipart calculation request");
  }
  await page.waitForFunction(
    () => {
      const ids = ["#edBaselineClass","#edBaselineCost","#edBaselineFinalEnergy","#edBaselinePrimaryEnergy"];
      return ids.every(id => {
        const value = String(document.querySelector(id)?.textContent || "").trim();
        return value && value !== "—";
      });
    },
    null,
    {timeout:30000}
  );

  return {
    context, page, diagnostics,
    request:{body,contentType},
    baselineSnapshot:scalarSnapshot(payload),
  };
}

async function rawCalculate(baseUrl, canonicalRequest) {
  const started = performance.now();
  let response;
  try {
    response = await fetch(baseUrl + "/api/home-lab-next/calculate", {
      method:"POST",
      headers:{
        "content-type":canonicalRequest.contentType,
        "user-agent":"Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 Chrome/140 ReliabilityCampaign/1.0",
        "accept":"application/json",
        "cache-control":"no-cache",
      },
      body:canonicalRequest.body,
      signal:AbortSignal.timeout(30000),
    });
  } catch (error) {
    return {
      ok:false,
      status:0,
      durationMs:performance.now() - started,
      error:String(error?.message || error),
      snapshot:null,
      route:null,
    };
  }
  const durationMs = performance.now() - started;
  const text = await response.text();
  let payload = null;
  try { payload = JSON.parse(text); } catch {}
  return {
    ok:response.ok,
    status:response.status,
    durationMs,
    error:response.ok ? null : (payload?.error || text.slice(0,300)),
    snapshot:payload ? scalarSnapshot(payload) : null,
    route:response.headers.get("x-lacurent-calc"),
  };
}

async function runRequestCampaign(name, baseUrl, canonicalRequest, sequentialCount, concurrentBatches, concurrency) {
  const latencies = [];
  const statuses = {};
  const routes = {};
  const failures = [];
  let mismatches = 0;

  const baseline = await rawCalculate(baseUrl, canonicalRequest);
  if (!baseline.ok || !baseline.snapshot) {
    throw new Error(name + " baseline request failed: " + JSON.stringify(baseline));
  }
  const expected = baseline.snapshot;

  const consume = result => {
    latencies.push(result.durationMs);
    statuses[result.status] = (statuses[result.status] || 0) + 1;
    routes[result.route || "none"] = (routes[result.route || "none"] || 0) + 1;
    if (!result.ok) {
      if (failures.length < 20) failures.push({status:result.status,error:result.error});
      return;
    }
    if (!snapshotsEquivalent(expected, result.snapshot)) mismatches += 1;
  };

  for (let i=0; i<sequentialCount; i++) {
    consume(await rawCalculate(baseUrl, canonicalRequest));
  }
  for (let batch=0; batch<concurrentBatches; batch++) {
    const results = await Promise.all(
      Array.from({length:concurrency}, () => rawCalculate(baseUrl, canonicalRequest))
    );
    for (const result of results) consume(result);
    await new Promise(resolve => setTimeout(resolve, 80));
  }

  const total = sequentialCount + concurrentBatches * concurrency;
  const successful = Object.entries(statuses)
    .filter(([status]) => Number(status) >= 200 && Number(status) < 300)
    .reduce((sum,[,count]) => sum + count, 0);

  return {
    name,
    baseUrl,
    total,
    successful,
    failureCount:total - successful,
    successRate:rounded(successful / Math.max(total,1), 5),
    deterministicMismatches:mismatches,
    statuses,
    routes,
    latency:summarizeLatencies(latencies),
    failures,
    baseline:expected,
  };
}

async function advanceToRenewables(page) {
  for (const pageName of ["house","envelope","systems"]) {
    await page.locator('[data-page="' + pageName + '"] [data-next]').click();
    const nextName = pageName === "house" ? "envelope" : pageName === "envelope" ? "systems" : "renewables";
    await page.locator('[data-page="' + nextName + '"].is-active').waitFor({state:"visible",timeout:15000});
  }
}

async function runUiPvStress(prepared, baseUrl, rounds) {
  const {page} = prepared;
  await advanceToRenewables(page);
  await page.evaluate(() => {
    const pv = document.querySelector("#pvEnabled");
    if (!(pv instanceof HTMLInputElement)) throw new Error("PV control missing");
    pv.checked = true;
    pv.dispatchEvent(new Event("change",{bubbles:true}));
  });

  const select = page.locator('select[name="pv_orientation"]');
  const sequence = ["south_west","west","north_west","north","north_east","east","south_east","south"];
  const durations = [];
  const failures = [];
  let requests = 0;

  for (let round=0; round<rounds; round++) {
    for (const orientation of sequence) {
      const started = performance.now();
      const responsePromise = page.waitForResponse(
        response => {
          try {
            const req = response.request();
            const post = req.postData() || "";
            return new URL(response.url()).pathname === "/api/home-lab-next/calculate"
              && req.method() === "POST"
              && (
                new URLSearchParams(post).get("pv_orientation") === orientation
                || post.includes('name="pv_orientation"\r\n\r\n' + orientation + "\r\n")
              );
          } catch {
            return false;
          }
        },
        {timeout:30000}
      );
      await select.selectOption(orientation);
      const response = await responsePromise;
      requests += 1;
      durations.push(performance.now() - started);
      if (response.status() !== 200) {
        failures.push({round,orientation,status:response.status()});
        continue;
      }
      const payload = await response.json();
      if (payload?.renewables?.pv?.orientation !== orientation) {
        failures.push({round,orientation,status:200,error:"orientation_mismatch"});
      }
      await page.waitForFunction(
        () => {
          const ids = ["#edBaselineClass","#edBaselineCost","#edBaselineFinalEnergy","#edBaselinePrimaryEnergy"];
          return ids.every(id => {
            const value = String(document.querySelector(id)?.textContent || "").trim();
            return value && value !== "—";
          });
        },
        null,
        {timeout:30000}
      );
    }
  }

  return {
    name:"pv_ui_" + (baseUrl === prodBase ? "production" : "local"),
    baseUrl,
    rounds,
    requests,
    failures,
    latency:summarizeLatencies(durations),
    diagnostics:prepared.diagnostics,
  };
}

async function prepareFreshEditorialRun(browser, baseUrl) {
  const context = await browser.newContext({viewport:{width:1280,height:900}});
  const page = await context.newPage();
  const serverErrors = [];
  const pageErrors = [];
  const requestFailures = [];
  page.on("response", response => {
    try {
      if (new URL(response.url()).origin === new URL(baseUrl).origin && response.status() >= 500) {
        serverErrors.push(response.request().method()+" "+response.url()+" :: "+response.status());
      }
    } catch {}
  });
  page.on("pageerror", error => pageErrors.push(String(error?.stack || error)));
  page.on("requestfailed", request => {
    try {
      const failure = request.failure()?.errorText || "failed";
      const url = new URL(request.url());
      const benign = failure === "net::ERR_ABORTED" && url.pathname === "/api/home-lab-next/calculate";
      if (url.origin === new URL(baseUrl).origin && !benign) {
        requestFailures.push(request.method()+" "+request.url()+" :: "+failure);
      }
    } catch {}
  });

  await page.goto(baseUrl + "/home-lab-next",{waitUntil:"networkidle",timeout:45000});
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
          && response.request().method() === "POST" && response.status() === 200;
      } catch { return false; }
    },
    {timeout:45000}
  );
  await marker.dispatchEvent("click");
  await calcPromise;
  await page.waitForFunction(
    () => String(document.querySelector("#edBaselineClass")?.textContent || "").trim() !== "—",
    null,{timeout:30000}
  );
  return {context,page,serverErrors,pageErrors,requestFailures};
}

async function runTeoOnce(browser, baseUrl, ordinal) {
  const prepared = await prepareFreshEditorialRun(browser,baseUrl);
  const {page,context,serverErrors,pageErrors,requestFailures} = prepared;
  const started = performance.now();
  try {
    await advanceToRenewables(page);
    await page.locator('[data-page="renewables"] [data-next]').click();
    await page.locator('[data-page="goal"].is-active').waitFor({state:"visible",timeout:15000});
    await page.locator("#runAnalysis").click();
    await page.waitForFunction(
      () => {
        const done=document.querySelector('[data-page="done"]');
        const error=document.querySelector('[data-page="error"]');
        return done?.classList.contains("is-active") || error?.classList.contains("is-active");
      },
      null,{timeout:210000}
    );
    const durationMs = performance.now() - started;
    if (await page.locator('[data-page="error"].is-active').count()) {
      return {
        ok:false, ordinal, durationMs,
        error:await page.locator("#errorText").innerText(),
        log:(await page.locator("#runLog").innerText()).slice(-12000),
        serverErrors,pageErrors,requestFailures,
      };
    }
    const snapshot = await page.evaluate(() => ({
      energyClass:String(document.querySelector("#edBaselineClass")?.textContent || "").trim(),
      annualCost:String(document.querySelector("#edBaselineCost")?.textContent || "").trim(),
      finalEnergy:String(document.querySelector("#edBaselineFinalEnergy")?.textContent || "").trim(),
      primaryEnergy:String(document.querySelector("#edBaselinePrimaryEnergy")?.textContent || "").trim(),
      status:String(document.querySelector("#edBaselineStatus")?.textContent || "").trim(),
    }));
    await page.locator("#openReport").click();
    await page.locator('[data-page="report"].is-active').waitFor({state:"visible",timeout:10000});
    const reportText = await page.locator("#reportBody").innerText();
    const reportDigest = crypto.createHash("sha256")
      .update(reportText.replace(/\d+(?:\.\d+)?\s*ms/g,"<time>").replace(/\s+/g," ").trim())
      .digest("hex");
    return {
      ok:true, ordinal, durationMs, snapshot, reportDigest,
      serverErrors,pageErrors,requestFailures,
    };
  } finally {
    await context.close();
  }
}

async function runTeoCampaign(browser, name, baseUrl, runs) {
  const rows=[];
  for (let i=0;i<runs;i++) rows.push(await runTeoOnce(browser,baseUrl,i+1));
  const successes=rows.filter(row=>row.ok);
  const first=successes[0]?.snapshot || null;
  let snapshotMismatches=0;
  for (const row of successes.slice(1)) {
    if (JSON.stringify(row.snapshot) !== JSON.stringify(first)) snapshotMismatches += 1;
  }
  const digests=new Set(successes.map(row=>row.reportDigest));
  return {
    name,baseUrl,runs,
    successful:successes.length,
    failureCount:runs-successes.length,
    snapshotMismatches,
    distinctReportDigests:digests.size,
    latency:summarizeLatencies(successes.map(row=>row.durationMs)),
    rows,
  };
}

function campaignFailed(campaign) {
  return campaign.failureCount > 0 || campaign.deterministicMismatches > 0;
}

const browser = await chromium.launch({headless:true});
const rssStartKb = readRssKb(serverPid);
const summary = {
  config:cfg,
  startedAt:new Date().toISOString(),
  localBase,prodBase,
  rssStartKb,
};

try {
  const localPrepared = await captureCanonicalMultipart(browser,localBase);
  summary.localDirect = await runRequestCampaign(
    "local_direct_rbpe",
    localBase,
    localPrepared.request,
    cfg.localSequential,
    cfg.localConcurrentBatches,
    cfg.localConcurrency,
  );
  summary.localPvUi = await runUiPvStress(localPrepared,localBase,cfg.localUiRounds);
  await localPrepared.context.close();

  const prodPrepared = await captureCanonicalMultipart(browser,prodBase);
  summary.prodDirect = await runRequestCampaign(
    "production_direct_rbpe",
    prodBase,
    prodPrepared.request,
    cfg.prodSequential,
    cfg.prodConcurrentBatches,
    cfg.prodConcurrency,
  );
  summary.prodPvUi = await runUiPvStress(prodPrepared,prodBase,cfg.prodUiRounds);
  await prodPrepared.context.close();

  summary.rssAfterDirectKb = readRssKb(serverPid);
  summary.localTeo = await runTeoCampaign(browser,"local_teo_repeatability",localBase,cfg.localTeoRuns);
  summary.prodTeo = await runTeoCampaign(browser,"production_teo_repeatability",prodBase,cfg.prodTeoRuns);
  summary.rssEndKb = readRssKb(serverPid);
  if (summary.rssStartKb != null && summary.rssEndKb != null) {
    summary.rssGrowthKb = summary.rssEndKb - summary.rssStartKb;
    summary.rssGrowthPct = rounded((summary.rssGrowthKb / Math.max(summary.rssStartKb,1))*100,2);
  }

  const hardFailures=[];
  for (const item of [summary.localDirect,summary.prodDirect]) {
    if (campaignFailed(item)) hardFailures.push(item.name + ": " + item.failureCount + " failures, " + item.deterministicMismatches + " deterministic mismatches");
  }
  for (const item of [summary.localPvUi,summary.prodPvUi]) {
    if (item.failures.length) hardFailures.push(item.name + ": " + item.failures.length + " UI request failures");
    if (item.diagnostics.serverErrors.length) hardFailures.push(item.name + ": server 5xx=" + item.diagnostics.serverErrors.length);
    if (item.diagnostics.pageErrors.length) hardFailures.push(item.name + ": page errors=" + item.diagnostics.pageErrors.length);
    if (item.diagnostics.requestFailures.length) hardFailures.push(item.name + ": request failures=" + item.diagnostics.requestFailures.length);
  }
  for (const item of [summary.localTeo,summary.prodTeo]) {
    if (item.failureCount) hardFailures.push(item.name + ": " + item.failureCount + " TEO failures");
    if (item.snapshotMismatches) hardFailures.push(item.name + ": " + item.snapshotMismatches + " final HUD mismatches");
    const serverErrorCount=item.rows.reduce((n,row)=>n+(row.serverErrors?.length||0),0);
    const pageErrorCount=item.rows.reduce((n,row)=>n+(row.pageErrors?.length||0),0);
    const requestFailureCount=item.rows.reduce((n,row)=>n+(row.requestFailures?.length||0),0);
    if (serverErrorCount) hardFailures.push(item.name + ": server 5xx=" + serverErrorCount);
    if (pageErrorCount) hardFailures.push(item.name + ": page errors=" + pageErrorCount);
    if (requestFailureCount) hardFailures.push(item.name + ": request failures=" + requestFailureCount);
  }
  summary.hardFailures=hardFailures;
  summary.ok=hardFailures.length===0;
} catch (error) {
  summary.ok=false;
  summary.fatal=String(error?.stack || error);
} finally {
  summary.finishedAt=new Date().toISOString();
  console.log("RELIABILITY_SUMMARY_JSON=" + JSON.stringify(summary));
  await browser.close();
}

if (!summary.ok) process.exitCode=1;
