import { chromium } from "playwright";
import fs from "node:fs";

const baseUrl = String(process.env.HOME_LAB_BASE_URL || "http://127.0.0.1:8765").replace(/\/$/, "");
const sequential = Number(process.env.RBPE_STRESS_SEQUENTIAL || 1000);
const burstBatches = Number(process.env.RBPE_STRESS_BURST_BATCHES || 20);
const burstConcurrency = Number(process.env.RBPE_STRESS_BURST_CONCURRENCY || 8);
const pvRounds = Number(process.env.RBPE_STRESS_PV_ROUNDS || 10);
const serverPid = Number(process.env.HOME_LAB_SERVER_PID || 0) || null;
const maxRssGrowthMb = Number(process.env.RBPE_STRESS_MAX_RSS_GROWTH_MB || 180);

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

function snapshot(payload) {
  const row = {};
  for (const key of metricKeys) row[key] = payload?.[key] ?? null;
  return row;
}

function equivalent(a, b) {
  for (const key of metricKeys) {
    const av = a?.[key];
    const bv = b?.[key];
    if (key === "energy_class") {
      if (String(av ?? "") !== String(bv ?? "")) return false;
      continue;
    }
    const an = Number(av);
    const bn = Number(bv);
    if (!Number.isFinite(an) || !Number.isFinite(bn)) {
      if (String(av ?? "") !== String(bv ?? "")) return false;
      continue;
    }
    const tolerance = Math.max(1e-7, 1e-9 * Math.max(Math.abs(an), Math.abs(bn), 1));
    if (Math.abs(an - bn) > tolerance) return false;
  }
  return true;
}

function percentile(values, p) {
  const sorted = [...values].sort((a,b) => a-b);
  if (!sorted.length) return 0;
  return sorted[Math.min(sorted.length - 1, Math.ceil((p / 100) * sorted.length) - 1)];
}

async function prepareCanonicalRequest(browser) {
  const context = await browser.newContext({viewport:{width:1280,height:900}});
  const page = await context.newPage();
  await page.goto(baseUrl + "/home-lab-next", {waitUntil:"networkidle", timeout:45000});
  const privacy = page.locator("[data-lacurent-first-use-consent]");
  if (await privacy.isVisible()) {
    await privacy.locator("[data-lacurent-deny-local]").click();
    await privacy.waitFor({state:"hidden", timeout:5000});
  }
  if (await page.locator('[data-page="intro"].is-active').count()) {
    await page.locator('[data-page="intro"] [data-next]').click();
  }
  await page.locator('[data-page="house"].is-active').waitFor({state:"visible", timeout:15000});
  const marker = page.locator('#edLocationMap .ed-map-locality[data-climate-zone="III"]').first();
  await marker.waitFor({state:"visible", timeout:10000});

  const responsePromise = page.waitForResponse(response => {
    try {
      return new URL(response.url()).pathname === "/api/home-lab-next/calculate"
        && response.request().method() === "POST";
    } catch {
      return false;
    }
  }, {timeout:45000});
  await marker.dispatchEvent("click");
  const response = await responsePromise;
  if (response.status() !== 200) throw new Error("Canonical RBPE setup HTTP " + response.status());

  const request = response.request();
  const body = request.postDataBuffer();
  const contentType = request.headers()["content-type"] || "";
  if (!body?.length || !contentType.toLowerCase().includes("multipart/form-data")) {
    throw new Error("Canonical Editorial request was not multipart/form-data");
  }
  const expected = snapshot(await response.json());
  return {context, page, body, contentType, expected};
}

async function calculate(body, contentType) {
  const started = performance.now();
  try {
    const response = await fetch(baseUrl + "/api/home-lab-next/calculate", {
      method:"POST",
      headers:{
        "content-type":contentType,
        "accept":"application/json",
        "cache-control":"no-cache",
        "user-agent":"LaCurent-RBPE-Release-Stress/1.0",
      },
      body,
      signal:AbortSignal.timeout(30000),
    });
    const text = await response.text();
    let payload = null;
    try { payload = JSON.parse(text); } catch {}
    return {
      status:response.status,
      ok:response.ok,
      durationMs:performance.now()-started,
      payload,
      body:text.slice(0,500),
    };
  } catch (error) {
    return {
      status:0,
      ok:false,
      durationMs:performance.now()-started,
      payload:null,
      body:String(error?.message || error),
    };
  }
}

async function stressPv(page) {
  for (const pageName of ["house","envelope","systems"]) {
    if (pageName === "house") {
      const confirmation = page.locator("#edHouseValuesConfirmed");
      if (await confirmation.count()) {
        await confirmation.check();
      }
    }
    await page.locator('[data-page="' + pageName + '"] [data-next]').click();
  }
  await page.locator('[data-page="renewables"].is-active').waitFor({state:"visible",timeout:15000});
  await page.evaluate(() => {
    const field = document.querySelector("#pvEnabled");
    if (!(field instanceof HTMLInputElement)) throw new Error("PV enable control missing");
    field.checked = true;
    field.dispatchEvent(new Event("change",{bubbles:true}));
  });

  const select = page.locator('select[name="pv_orientation"]');
  const orientations = ["south_west","west","north_west","north","north_east","east","south_east","south"];
  let requests = 0;
  for (let round=0; round<pvRounds; round++) {
    for (const orientation of orientations) {
      const wait = page.waitForResponse(response => {
        try {
          const url = new URL(response.url());
          const post = response.request().postData() || "";
          return url.pathname === "/api/home-lab-next/calculate"
            && response.request().method() === "POST"
            && (
              new URLSearchParams(post).get("pv_orientation") === orientation
              || post.includes('name="pv_orientation"\r\n\r\n' + orientation + "\r\n")
            );
        } catch {
          return false;
        }
      }, {timeout:30000});
      await select.selectOption(orientation);
      const response = await wait;
      requests++;
      if (response.status() !== 200) {
        throw new Error("PV stress HTTP " + response.status() + " orientation=" + orientation);
      }
      const payload = await response.json();
      if (payload?.renewables?.pv?.orientation !== orientation) {
        throw new Error("PV stress orientation mismatch " + orientation);
      }
    }
  }
  return requests;
}

const browser = await chromium.launch({headless:true});
const rssStartKb = readRssKb(serverPid);
const latencies = [];
const statuses = new Map();
let mismatches = 0;
let failures = 0;
let pvRequests = 0;

try {
  const prepared = await prepareCanonicalRequest(browser);
  const consume = result => {
    latencies.push(result.durationMs);
    statuses.set(result.status, (statuses.get(result.status) || 0) + 1);
    if (!result.ok) {
      failures++;
      if (failures <= 5) console.error("RBPE failure", result.status, result.body);
      return;
    }
    if (!equivalent(prepared.expected, snapshot(result.payload))) mismatches++;
  };

  for (let i=0; i<sequential; i++) {
    consume(await calculate(prepared.body, prepared.contentType));
  }

  for (let batch=0; batch<burstBatches; batch++) {
    const rows = await Promise.all(
      Array.from({length:burstConcurrency}, () => calculate(prepared.body, prepared.contentType))
    );
    rows.forEach(consume);
    await new Promise(resolve => setTimeout(resolve, 50));
  }

  pvRequests = await stressPv(prepared.page);
  await prepared.context.close();
} finally {
  await browser.close();
}

const rssEndKb = readRssKb(serverPid);
const rssGrowthMb =
  rssStartKb == null || rssEndKb == null
    ? null
    : (rssEndKb-rssStartKb)/1024;

const summary = {
  status: failures === 0 && mismatches === 0 ? "pass" : "fail",
  baseUrl,
  requests: sequential + burstBatches*burstConcurrency,
  pvRequests,
  failures,
  deterministicMismatches:mismatches,
  statuses:Object.fromEntries(statuses),
  p50Ms:Math.round(percentile(latencies,50)),
  p95Ms:Math.round(percentile(latencies,95)),
  p99Ms:Math.round(percentile(latencies,99)),
  maxMs:Math.round(Math.max(...latencies,0)),
  rssStartKb,
  rssEndKb,
  rssGrowthMb:rssGrowthMb == null ? null : Number(rssGrowthMb.toFixed(2)),
};
console.log("RBPE_RELEASE_STRESS=" + JSON.stringify(summary,null,2));

if (failures || mismatches) process.exitCode=1;
if (rssGrowthMb != null && rssGrowthMb > maxRssGrowthMb) {
  console.error(
    "RBPE local-server RSS growth exceeded release threshold: "
    + rssGrowthMb.toFixed(2) + " MB > " + maxRssGrowthMb + " MB"
  );
  process.exitCode=1;
}
