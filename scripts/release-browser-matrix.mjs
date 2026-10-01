import { chromium, firefox, webkit } from "playwright";

const baseUrl = String(process.env.HOME_LAB_BASE_URL || "http://127.0.0.1:8765").replace(/\/$/, "");

const engines = [
  ["chromium", chromium, {width:1366,height:768}],
  ["firefox", firefox, {width:1280,height:900}],
  ["webkit", webkit, {width:390,height:844}],
];

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

async function fillRequiredHouse(page) {
  await page.locator("#heatedArea").fill("120");
  await page.locator("#heatedLevels").selectOption("2");
  await page.locator("#averageHeight").fill("2.7");
  await page.locator('[name="indoor_design_temperature_c"]').selectOption("21");
  await page.locator('[name="construction_year"]').fill("2005");
  await page.locator('[name="dhw_occupants"]').selectOption("4");
}

async function fillRequiredEnvelope(page) {
  await page.locator("#wallStructure").selectOption("efficient_brick");
  await page.locator("#wallStructureThickness").fill("30");
  await page.locator("#wallInsulationMaterial").selectOption("eps");
  await page.locator("#wallIns").fill("10");
  await page.locator("#topBoundary").selectOption("cold_attic");
  await page.locator("#roofInsulationMaterial").selectOption("mineral_wool");
  await page.locator("#roofIns").fill("20");
  await page.locator("#floorBoundary").selectOption("ground");
  await page.locator("#floorInsulationMaterial").selectOption("xps");
  await page.locator("#floorIns").fill("10");
  await page.locator("#windowArea").fill("18");
  await page.locator("#glazing").selectOption("triple_low_e_faces_2_and_5");
  await page.locator("#orientation").selectOption("south");
}

async function fillRequiredSystems(page) {
  await page.locator("#heatingChoice").selectOption("condensing_gas_boiler");
  await page.locator("#heatingEmitter").selectOption("radiators_low_temp");
  await page.locator("#heatingDistribution").selectOption("hydronic_insulated");
  await page.locator("#heatingStorage").selectOption("none");
  await page.locator("#heatingControl").selectOption("thermostatic_valves");
  await page.locator("#dhwSystem").selectOption("same_as_heating");
  await page.locator("#ventilation").selectOption("natural");
  const wait = page.waitForResponse(response => {
    try {
      return new URL(response.url()).pathname === "/api/home-lab-next/calculate"
        && response.request().method() === "POST";
    } catch { return false; }
  }, {timeout:45000});
  await page.locator("#cooling").selectOption("split");
  return wait;
}

function snapshot(payload) {
  const out = {};
  for (const key of metricKeys) out[key] = payload?.[key] ?? null;
  return out;
}

function equivalent(a,b) {
  for (const key of metricKeys) {
    if (key === "energy_class") {
      if (String(a?.[key] ?? "") !== String(b?.[key] ?? "")) return false;
      continue;
    }
    const av = Number(a?.[key]);
    const bv = Number(b?.[key]);
    if (!Number.isFinite(av) || !Number.isFinite(bv)) {
      if (String(a?.[key] ?? "") !== String(b?.[key] ?? "")) return false;
      continue;
    }
    const tolerance = Math.max(1e-7, 1e-9*Math.max(Math.abs(av),Math.abs(bv),1));
    if (Math.abs(av-bv) > tolerance) return false;
  }
  return true;
}

async function runEngine(name, engine, viewport) {
  const browser = await engine.launch({headless:true});
  const context = await browser.newContext({viewport});
  const page = await context.newPage();
  const serverErrors = [];
  const requestFailures = [];
  const pageErrors = [];

  page.on("pageerror", error => pageErrors.push(String(error?.stack || error)));
  page.on("response", response => {
    try {
      const url = new URL(response.url());
      if (url.origin === new URL(baseUrl).origin && response.status() >= 500) {
        serverErrors.push(response.request().method()+" "+url.pathname+" :: "+response.status());
      }
    } catch {}
  });
  page.on("requestfailed", request => {
    try {
      const url = new URL(request.url());
      const failure = request.failure()?.errorText || "failed";
      const benign =
        failure === "net::ERR_ABORTED"
        && (
          request.method() === "GET"
          || url.pathname === "/api/home-lab-next/calculate"
        );
      if (url.origin === new URL(baseUrl).origin && !benign) {
        requestFailures.push(request.method()+" "+url.pathname+" :: "+failure);
      }
    } catch {}
  });

  await page.addInitScript(() => {
    localStorage.setItem("lacurent-privacy-v1", JSON.stringify({
      version:1,
      decided:true,
      localAutosave:true,
      analytics:false,
      marketing:false,
      decidedAt:"2026-10-01T00:00:00.000Z",
    }));
  });

  try {
    await page.goto(baseUrl+"/home-lab-next", {waitUntil:"networkidle", timeout:45000});
    await page.locator("[data-editorial-lab]").waitFor({state:"visible",timeout:15000});
    if (await page.locator('[data-page="intro"].is-active').count()) {
      await page.locator('[data-page="intro"] [data-next]').click();
    }
    await page.locator('[data-page="house"].is-active').waitFor({state:"visible",timeout:15000});

    const marker = page.locator('#edLocationMap .ed-map-locality[data-climate-zone="III"]').first();
    await marker.waitFor({state:"visible",timeout:10000});
    await marker.dispatchEvent("click");
    await fillRequiredHouse(page);

    const localityId = await page.locator("#localityId").inputValue();
    if (!localityId) throw new Error(name+" did not persist canonical locality id");

    await page.locator('[data-page="house"] [data-next]').click();
    await page.locator('[data-page="envelope"].is-active').waitFor({state:"visible",timeout:10000});
    await fillRequiredEnvelope(page);
    await page.locator('[data-page="envelope"] [data-next]').click();
    await page.locator('[data-page="systems"].is-active').waitFor({state:"visible",timeout:10000});
    const calc = await fillRequiredSystems(page);
    if (calc.status() !== 200) throw new Error(name+" baseline HTTP "+calc.status());
    const baseline = snapshot(await calc.json());

    await page.waitForFunction(() => {
      const ids=["#edBaselineClass","#edBaselineCost","#edBaselineFinalEnergy","#edBaselinePrimaryEnergy"];
      return ids.every(selector => {
        const text=String(document.querySelector(selector)?.textContent || "").trim();
        return text && text !== "—";
      });
    },null,{timeout:30000});

    // Internal back navigation must not lose the explicitly entered house.
    await page.locator('[data-page="systems"] [data-back]').click();
    await page.locator('[data-page="envelope"].is-active').waitFor({state:"visible",timeout:10000});
    await page.locator('[data-page="envelope"] [data-back]').click();
    await page.locator('[data-page="house"].is-active').waitFor({state:"visible",timeout:10000});
    if ((await page.locator("#localityId").inputValue()) !== localityId) {
      throw new Error(name+" internal back navigation changed locality");
    }

    // Decimal state must survive a hard reload when local autosave is allowed.
    const area = page.locator("#heatedArea");
    await area.fill("137.5");
    await area.dispatchEvent("input");
    await page.waitForTimeout(900);
    await page.reload({waitUntil:"networkidle",timeout:45000});
    await page.locator("[data-editorial-lab]").waitFor({state:"visible",timeout:15000});
    const restoredArea = await page.locator("#heatedArea").inputValue();
    if (restoredArea !== "137.5") {
      throw new Error(name+" reload lost decimal house state: "+restoredArea);
    }
    const restoredLocality = await page.locator("#localityId").inputValue();
    if (restoredLocality !== localityId) {
      throw new Error(name+" reload lost locality identity");
    }

    const layout = await page.evaluate(() => ({
      viewport:innerWidth,
      scrollWidth:document.documentElement.scrollWidth,
    }));
    if (layout.scrollWidth > layout.viewport + 1) {
      throw new Error(name+" horizontal overflow "+JSON.stringify(layout));
    }

    if (serverErrors.length || requestFailures.length || pageErrors.length) {
      throw new Error(name+" browser diagnostics "+JSON.stringify({
        serverErrors,requestFailures,pageErrors,
      }));
    }

    return {
      name,
      baseline,
      localityId,
      restoredArea,
      viewport,
    };
  } finally {
    await context.close();
    await browser.close();
  }
}

const results=[];
for (const [name,engine,viewport] of engines) {
  const row=await runEngine(name,engine,viewport);
  results.push(row);
  console.log("BROWSER_MATRIX_RUN="+JSON.stringify(row));
}

const canonical=results[0].baseline;
for (const row of results.slice(1)) {
  if (!equivalent(canonical,row.baseline)) {
    throw new Error(
      "Cross-browser RBPE result mismatch: "
      +JSON.stringify({chromium:canonical,[row.name]:row.baseline})
    );
  }
}

console.log("BROWSER_MATRIX_SUMMARY="+JSON.stringify({
  status:"pass",
  browsers:results.map(row=>row.name),
  canonical,
},null,2));
