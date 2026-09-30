import { chromium } from "playwright";

const baseUrl = String(process.env.HOME_LAB_BASE_URL || "https://lacurent.com").replace(/\/$/, "");
const stickyRuns = Number(process.env.TEO_STICKY_RUNS || 8);
const freshRuns = Number(process.env.TEO_FRESH_RUNS || 4);

function routeSummary(rows) {
  return rows.map(row => ({
    path:row.path,
    status:row.status,
    route:row.route,
    shard:row.shard,
    retryAfter:row.retryAfter,
    cfRay:row.cfRay,
    body:row.body,
  }));
}

async function preparePage(context, label) {
  const page = await context.newPage();
  const routes = [];
  const assetInfo = {};
  page.on("response", async response => {
    try {
      const url = new URL(response.url());
      if (url.origin !== new URL(baseUrl).origin) return;
      if (url.pathname === "/home-lab-next") {
        assetInfo.html = {
          status:response.status(),
          cacheControl:response.headers()["cache-control"] || "",
          cfRay:response.headers()["cf-ray"] || "",
        };
      }
      if (url.pathname === "/static/home-lab-editorial.js") {
        assetInfo.js = {
          url:response.url(),
          status:response.status(),
          cacheControl:response.headers()["cache-control"] || "",
          cfCacheStatus:response.headers()["cf-cache-status"] || "",
          age:response.headers()["age"] || "",
          cfRay:response.headers()["cf-ray"] || "",
        };
      }
      if (
        url.pathname.startsWith("/api/optimization/home-lab/v3/")
        || url.pathname.startsWith("/api/optimization/home-lab/v4/")
      ) {
        let body = "";
        if (response.status() >= 400) {
          body = (await response.text().catch(() => "")).slice(0,800);
        }
        routes.push({
          path:url.pathname,
          status:response.status(),
          route:response.headers()["x-lacurent-teo"] || "",
          shard:response.headers()["x-lacurent-teo-shard"] || "",
          retryAfter:response.headers()["retry-after"] || "",
          cfRay:response.headers()["cf-ray"] || "",
          body,
        });
      }
    } catch {}
  });

  await page.goto(baseUrl + "/home-lab-next", {waitUntil:"networkidle", timeout:45000});
  const privacy = page.locator("[data-lacurent-first-use-consent]");
  if (await privacy.isVisible()) {
    await privacy.locator("[data-lacurent-deny-local]").click();
    await privacy.waitFor({state:"hidden",timeout:5000});
  }
  await page.locator('[data-page="intro"] [data-next]').click();
  await page.locator('[data-page="house"].is-active').waitFor({state:"visible",timeout:15000});

  const marker = page.locator('#edLocationMap .ed-map-locality[data-climate-zone="III"]').first();
  await marker.waitFor({state:"visible",timeout:10000});
  const calcPromise = page.waitForResponse(response => {
    try {
      return new URL(response.url()).pathname === "/api/home-lab-next/calculate"
        && response.request().method() === "POST";
    } catch { return false; }
  }, {timeout:45000});
  await marker.dispatchEvent("click");
  const calc = await calcPromise;
  if (calc.status() !== 200) throw new Error(label + " baseline setup HTTP " + calc.status());

  for (const pageName of ["house","envelope","systems","renewables"]) {
    await page.locator('[data-page="' + pageName + '"] [data-next]').click();
    const nextName =
      pageName === "house" ? "envelope"
      : pageName === "envelope" ? "systems"
      : pageName === "systems" ? "renewables"
      : "goal";
    await page.locator('[data-page="' + nextName + '"].is-active').waitFor({state:"visible",timeout:15000});
  }
  return {page,routes,assetInfo};
}

async function runTeo(prepared, ordinal, mode) {
  const {page,routes} = prepared;
  const startIndex = routes.length;
  const started = Date.now();
  await page.locator("#runAnalysis").click();
  await page.waitForFunction(() => {
    const result = document.querySelector("#edTeoResult");
    const state = String(document.querySelector("#edTeoRunState")?.textContent || "").trim();
    return (result && !result.hasAttribute("hidden")) || state === "Eroare";
  }, null, {timeout:210000});

  const state = String(await page.locator("#edTeoRunState").innerText()).trim();
  const logTail = (await page.locator("#runLog").innerText())
    .split("\n").filter(Boolean).slice(-20);
  const currentRoutes = routes.slice(startIndex);
  const failures = currentRoutes.filter(row => row.status >= 400);
  const planRows = currentRoutes.filter(row => row.path.endsWith("/v4/plan"));
  const verifyRows = currentRoutes.filter(row => row.path.endsWith("/v3/verify"));
  const result = {
    mode,
    ordinal,
    state,
    durationMs:Date.now()-started,
    plan:routeSummary(planRows),
    verify:routeSummary(verifyRows),
    failures:routeSummary(failures),
    logTail,
  };
  console.log("TEO_DEVICE_DIAG_RUN=" + JSON.stringify(result));
  return result;
}

const browser = await chromium.launch({headless:true});
const output = {baseUrl,sticky:[],fresh:[],assets:null};
try {
  const stickyContext = await browser.newContext({viewport:{width:1366,height:768}});
  const sticky = await preparePage(stickyContext, "sticky");
  output.assets = sticky.assetInfo;
  for (let i=1; i<=stickyRuns; i+=1) {
    output.sticky.push(await runTeo(sticky, i, "sticky_same_page_context"));
    await new Promise(resolve => setTimeout(resolve, 250));
  }
  await stickyContext.close();

  for (let i=1; i<=freshRuns; i+=1) {
    const context = await browser.newContext({viewport:{width:390,height:844}});
    const prepared = await preparePage(context, "fresh-" + i);
    output.fresh.push(await runTeo(prepared, i, "fresh_context"));
    await context.close();
    await new Promise(resolve => setTimeout(resolve, 250));
  }
} finally {
  await browser.close();
}

const summarize = rows => ({
  runs:rows.length,
  success:rows.filter(row => row.state !== "Eroare").length,
  errors:rows.filter(row => row.state === "Eroare").length,
  plan5xx:rows.flatMap(row => row.plan).filter(row => row.status >= 500).length,
  verify5xx:rows.flatMap(row => row.verify).filter(row => row.status >= 500).length,
  all5xx:rows.flatMap(row => row.failures).filter(row => row.status >= 500).length,
  planShards:[...new Set(rows.flatMap(row => row.plan.map(item => item.shard)).filter(Boolean))],
  verifyShards:[...new Set(rows.flatMap(row => row.verify.map(item => item.shard)).filter(Boolean))],
});
output.summary = {
  sticky:summarize(output.sticky),
  fresh:summarize(output.fresh),
};
console.log("TEO_DEVICE_DIAG_SUMMARY=" + JSON.stringify(output, null, 2));
