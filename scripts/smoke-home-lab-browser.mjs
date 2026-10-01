import { chromium } from "playwright";

const baseUrl = process.env.HOME_LAB_BASE_URL || process.env.STAGING_URL;
if (!baseUrl) throw new Error("HOME_LAB_BASE_URL or STAGING_URL is required");

const browser = await chromium.launch({headless:true});
const page = await browser.newPage({viewport:{width:1280,height:900}});
const pageErrors = [];
const consoleErrors = [];
const sameOriginRequestFailures = [];
const sameOriginServerErrors = [];
const baseOrigin = new URL(baseUrl).origin;

page.on("pageerror", error => pageErrors.push(String(error?.stack || error)));
page.on("console", message => {
  if (message.type() === "error") consoleErrors.push(message.text());
});
page.on("requestfailed", request => {
  try {
    const url = new URL(request.url());
    const errorText = request.failure()?.errorText || "request failed";
    const benignClientAbort =
      errorText === "net::ERR_ABORTED"
      && (
        request.method() === "GET"
        || (
          request.method() === "POST"
          && url.pathname === "/api/home-lab-next/calculate"
        )
      );
    if (url.origin === baseOrigin && !benignClientAbort) {
      sameOriginRequestFailures.push(
        `${request.method()} ${request.url()} :: ${errorText}`
      );
    }
  } catch (_) {
    // Ignore malformed third-party request URLs; application-origin failures are
    // still captured because browser requests are absolute in normal operation.
  }
});
page.on("response", response => {
  try {
    const url = new URL(response.url());
    if (url.origin === baseOrigin && response.status() >= 500) {
      sameOriginServerErrors.push(
        `${response.request().method()} ${response.url()} :: HTTP ${response.status()}`
      );
    }
  } catch (_) {
    // Same rationale as requestfailed: malformed third-party URLs are irrelevant
    // to application-origin server health.
  }
});

function isKnownExternal3dFetchError(line) {
  const text = String(line || "").trim();
  return text.startsWith(
    "[Home Lab 3D] model load failed TypeError: Failed to fetch"
  );
}

async function expectVisible(selector) {
  await page.locator(selector).waitFor({state:"visible", timeout:15000});
}

async function fillFreshHouseInputs(targetPage) {
  await targetPage.locator("#heatedArea").fill("120");
  await targetPage.locator("#heatedLevels").selectOption("2");
  await targetPage.locator("#averageHeight").fill("2.7");
  await targetPage.locator('[name="indoor_design_temperature_c"]').selectOption("21");
  await targetPage.locator('[name="construction_year"]').fill("2005");
  await targetPage.locator('[name="dhw_occupants"]').selectOption("4");
}

async function fillFreshEnvelopeInputs(targetPage) {
  await targetPage.locator("#wallStructure").selectOption("efficient_brick");
  await targetPage.locator("#wallStructureThickness").fill("30");
  await targetPage.locator("#wallInsulationMaterial").selectOption("eps");
  await targetPage.locator("#wallIns").fill("10");
  await targetPage.locator("#topBoundary").selectOption("cold_attic");
  await targetPage.locator("#roofInsulationMaterial").selectOption("mineral_wool");
  await targetPage.locator("#roofIns").fill("20");
  await targetPage.locator("#floorBoundary").selectOption("ground");
  await targetPage.locator("#floorInsulationMaterial").selectOption("xps");
  await targetPage.locator("#floorIns").fill("10");
  await targetPage.locator("#windowArea").fill("18");
  await targetPage.locator("#glazing").selectOption("triple_low_e_faces_2_and_5");
  await targetPage.locator("#orientation").selectOption("south");
}

async function fillFreshSystemsInputs(targetPage, {waitForBaseline = false} = {}) {
  await targetPage.locator("#heatingChoice").selectOption("condensing_gas_boiler");
  await targetPage.locator("#heatingEmitter").selectOption("radiators_low_temp");
  await targetPage.locator("#heatingDistribution").selectOption("hydronic_insulated");
  await targetPage.locator("#heatingStorage").selectOption("none");
  await targetPage.locator("#heatingControl").selectOption("thermostatic_valves");
  await targetPage.locator("#dhwSystem").selectOption("same_as_heating");
  await targetPage.locator("#ventilation").selectOption("natural");
  if (!waitForBaseline) {
    await targetPage.locator("#cooling").selectOption("none");
    return null;
  }
  const responsePromise = targetPage.waitForResponse(
    response => {
      try {
        return new URL(response.url()).pathname === "/api/home-lab-next/calculate"
          && response.request().method() === "POST";
      } catch { return false; }
    },
    {timeout:45000},
  );
  await targetPage.locator("#cooling").selectOption("none");
  return responsePromise;
}

try {
  // Cross-device determinism regression: a legacy Editorial draft may contain
  // hidden manual geometry/advanced overrides that are not obvious in the
  // simple UI. The v2 migration must keep visible inputs but discard those
  // hidden overrides before RBPE receives the form.
  const statePage = await browser.newPage({viewport:{width:1280,height:900}});
  await statePage.addInitScript(() => {
    if (sessionStorage.getItem("lacurent-editorial-determinism-smoke-seeded") === "1") return;
    sessionStorage.setItem("lacurent-editorial-determinism-smoke-seeded", "1");
    localStorage.setItem("lacurent-privacy-v1", JSON.stringify({
      version:1,
      decided:true,
      localAutosave:true,
      analytics:false,
      marketing:false,
      decidedAt:"2026-09-29T00:00:00.000Z",
    }));
    localStorage.setItem("lacurent-home-lab-editorial-v1:official", JSON.stringify({
      version:1,
      fields:{
        "id:heatedArea":{value:"120"},
        "id:heatedLevels":{value:"2"},
        "id:averageHeight":{value:"2.6"},
        "id:windowArea":{value:"20"},
        "id:wallArea":{value:"999",geomAuto:"false"},
        "id:advWallU":{value:"9.99",advancedAuto:"false"},
      },
      savedAt:"2026-09-28T12:00:00.000Z",
    }));
    localStorage.setItem("lacurent-home-lab-editorial-v1:official:history", "[]");
    localStorage.setItem("lacurent-home-lab-next-v1:official", JSON.stringify({
      homeState:{wallAreaOverride:888,topAreaOverride:777,floorAreaOverride:666,volumeOverride:555},
    }));
  });
  await statePage.goto(baseUrl + "/home-lab-next", {waitUntil:"networkidle", timeout:30000});
  await statePage.locator("[data-editorial-lab]").waitFor({state:"visible", timeout:15000});
  const migratedEditorialState = await statePage.evaluate(() => {
    const current = JSON.parse(localStorage.getItem("lacurent-home-lab-editorial-v2:official") || "null");
    const wall = document.querySelector("#wallArea");
    const advancedWallU = document.querySelector("#advWallU");
    return {
      legacyDraft:localStorage.getItem("lacurent-home-lab-editorial-v1:official"),
      legacyHistory:localStorage.getItem("lacurent-home-lab-editorial-v1:official:history"),
      current,
      wallValue:wall?.value || "",
      wallAuto:wall?.dataset?.geomAuto || "",
      advancedWallUValue:advancedWallU?.value || "",
      advancedWallUAuto:advancedWallU?.dataset?.advancedAuto || "",
    };
  });
  if (migratedEditorialState.legacyDraft !== null ||
      migratedEditorialState.legacyHistory !== null ||
      migratedEditorialState.current?.version !== 2 ||
      migratedEditorialState.current?.calculationModelVersion !== "rbpe-editorial-2026-09-29.1" ||
      migratedEditorialState.wallValue === "999" ||
      migratedEditorialState.wallAuto !== "true" ||
      migratedEditorialState.advancedWallUValue === "9.99" ||
      migratedEditorialState.advancedWallUAuto !== "true") {
    throw new Error(
      "Editorial v1 migration preserved hidden calculation overrides: " +
      JSON.stringify(migratedEditorialState)
    );
  }

  await statePage.locator('[data-page="intro"] [data-next]').click();
  await statePage.locator('[data-page="house"].is-active').waitFor({state:"visible", timeout:15000});
  await statePage.locator("#heatedArea").fill("130");
  statePage.once("dialog", dialog => dialog.accept());
  await Promise.all([
    statePage.waitForNavigation({waitUntil:"domcontentloaded", timeout:15000}),
    statePage.locator("#edNewHouse").click(),
  ]);
  await statePage.locator("[data-editorial-lab]").waitFor({state:"visible", timeout:15000});
  const resetEditorialState = await statePage.evaluate(() => ({
    current:localStorage.getItem("lacurent-home-lab-editorial-v2:official"),
    currentHistory:localStorage.getItem("lacurent-home-lab-editorial-v2:official:history"),
    legacy:localStorage.getItem("lacurent-home-lab-editorial-v1:official"),
    legacyHistory:localStorage.getItem("lacurent-home-lab-editorial-v1:official:history"),
    classic:localStorage.getItem("lacurent-home-lab-next-v1:official"),
  }));
  if (Object.values(resetEditorialState).some(value => value !== null)) {
    throw new Error(
      "Editorial clean-house reset left calculation state behind: " +
      JSON.stringify(resetEditorialState)
    );
  }
  await statePage.close();

  await page.goto(baseUrl + "/home-lab-next", {waitUntil:"networkidle", timeout:30000});

  const editorialPrivacyFirstUse = page.locator("[data-lacurent-first-use-consent]");
  if (await editorialPrivacyFirstUse.isVisible()) {
    await editorialPrivacyFirstUse.locator("[data-lacurent-deny-local]").click();
    await editorialPrivacyFirstUse.waitFor({state:"hidden", timeout:5000});
  }

  await page.locator('[data-page="intro"] [data-next]').click();
  await expectVisible('[data-page="house"].is-active');
  await expectVisible("#edLocationMap svg.ed-location-map-svg");
  await expectVisible(".ed-map-legend");

  const legendItems = await page.locator(".ed-map-legend-item").allInnerTexts();
  const expectedLegend = ["I−12°C","II−15°C","III−18°C","IV−21°C","V−24°C"];
  const normalizedLegend = legendItems.map(text => text.replace(/\s+/g,""));
  for (const expected of expectedLegend) {
    if (!normalizedLegend.includes(expected)) {
      throw new Error("Editorial climate legend is incomplete: " + JSON.stringify(normalizedLegend));
    }
  }

  const editorialMap = page.locator("#edLocationMap svg.ed-location-map-svg");
  const initialViewBox = await editorialMap.getAttribute("viewBox");

  const defaultLocalityCount = await page.locator("#edLocationMap .ed-map-locality").count();
  const defaultTier2Count = await page.locator("#edLocationMap .ed-map-locality.tier-2").count();
  if (defaultLocalityCount < 8 || defaultTier2Count < 1) {
    throw new Error(`Editorial climate map lost default localities: total=${defaultLocalityCount}, tier2=${defaultTier2Count}`);
  }

  const mapCentering = await page.evaluate(() => {
    const svg = document.querySelector("#edLocationMap svg.ed-location-map-svg");
    const boundary = svg?.querySelector(".ed-map-boundaries");
    if (!svg || !boundary) return null;
    const viewBox = svg.viewBox.baseVal;
    const box = boundary.getBBox();
    return {
      viewCenterX:viewBox.x + viewBox.width / 2,
      viewCenterY:viewBox.y + viewBox.height / 2,
      mapCenterX:box.x + box.width / 2,
      mapCenterY:box.y + box.height / 2,
    };
  });
  if (!mapCentering ||
      Math.abs(mapCentering.viewCenterX - mapCentering.mapCenterX) > 8 ||
      Math.abs(mapCentering.viewCenterY - mapCentering.mapCenterY) > 8) {
    throw new Error("Editorial climate map is not centered: " + JSON.stringify(mapCentering));
  }

  const zoneThreeMarker = page.locator('#edLocationMap .ed-map-locality[data-climate-zone="III"]').first();
  await zoneThreeMarker.waitFor({state:"visible", timeout:5000});
  await zoneThreeMarker.dispatchEvent("click");
  const zoneThreeOutline = page.locator('#edLocationMap .ed-map-zone-outline[data-selected-zone="III"]');
  if (await zoneThreeOutline.count() !== 1) {
    throw new Error("Zone III selected outline is missing or duplicated");
  }
  const zoneThreePath = await zoneThreeOutline.getAttribute("d");
  const zoneThreeMoves = (zoneThreePath?.match(/M/g) || []).length;
  if (zoneThreeMoves !== 1) {
    throw new Error("Zone III outline includes internal rings instead of only its outer contour");
  }
  await page.locator('#edLocationMap [data-map-zoom="in"]').click();
  await page.waitForTimeout(80);
  await page.locator('#edLocationMap [data-map-zoom="in"]').click();
  await page.waitForTimeout(80);
  const zoomedViewBox = await editorialMap.getAttribute("viewBox");
  if (!initialViewBox || !zoomedViewBox || initialViewBox === zoomedViewBox) {
    throw new Error("Editorial climate map zoom did not change the SVG viewBox");
  }
  const progressiveLocalities = await page.locator("#edLocationMap .ed-map-locality.tier-2, #edLocationMap .ed-map-locality.tier-3").count();
  if (progressiveLocalities < 1) {
    throw new Error("Editorial climate map did not reveal additional locality tiers after zoom");
  }

  // Execute the complete Editorial TEO flow as a user would. This covers the
  // browser Halton + local-refinement worker, verification-plan, adaptive
  // 1–3 canonical VERIFY orchestration, Worker Flow pacing and browser-side
  // report finalization instead of merely checking that the UI renders.
  const selectedLocalityId = await page.locator("#localityId").inputValue();
  if (!selectedLocalityId) {
    throw new Error("Editorial map selection did not produce a canonical locality token");
  }

  // A fresh Home Lab must not fabricate user data on pages 1–3.
  const freshRequiredValues = await page.evaluate(() =>
    [...document.querySelectorAll('[data-page="house"] [data-baseline-required]')]
      .filter(field => !field.closest("[hidden]"))
      .map(field => String(field.value || ""))
  );
  if (freshRequiredValues.some(value => value !== "")) {
    throw new Error("Fresh house page contains silent defaults: " + JSON.stringify(freshRequiredValues));
  }

  await fillFreshHouseInputs(page);
  await page.locator('[data-page="house"] [data-next]').click();
  await expectVisible('[data-page="envelope"].is-active');
  await fillFreshEnvelopeInputs(page);
  await page.locator('[data-page="envelope"] [data-next]').click();
  await expectVisible('[data-page="systems"].is-active');
  const baselineResponse = await fillFreshSystemsInputs(page, {waitForBaseline:true});
  if (!baselineResponse || baselineResponse.status() !== 200) {
    throw new Error("Fresh explicit-input baseline RBPE did not return HTTP 200");
  }
  await page.locator('[data-page="systems"] [data-next]').click();
  await expectVisible('[data-page="renewables"].is-active');

  // Regression for the production 1101 sequence reported when repeatedly
  // changing PV orientation. Every change must complete one live RBPE request,
  // keep the HUD populated and route climate through the compact @lc2 token
  // instead of the large Python locality-registry fallback.
  await page.evaluate(() => {
    const pvEnabled = document.querySelector("#pvEnabled");
    if (!(pvEnabled instanceof HTMLInputElement)) {
      throw new Error("Editorial PV enable control is missing");
    }
    pvEnabled.checked = true;
    pvEnabled.dispatchEvent(new Event("change", {bubbles:true}));
  });

  const pvOrientation = page.locator('select[name="pv_orientation"]');
  const orientationSequence = [
    "south_west","west","north_west","north",
    "north_east","east","south_east","south"
  ];
  for (const orientation of orientationSequence) {
    const responsePromise = page.waitForResponse(
      response =>
        new URL(response.url()).pathname === "/api/home-lab-next/calculate"
        && response.request().method() === "POST"
        && (
          new URLSearchParams(response.request().postData() || "").get("pv_orientation") === orientation
          || (response.request().postData() || "").includes(
            'name="pv_orientation"\r\n\r\n' + orientation + "\r\n"
          )
        ),
      {timeout:30000}
    );
    await pvOrientation.selectOption(orientation);
    const response = await responsePromise;
    if (response.status() !== 200) {
      throw new Error(
        "Repeated PV orientation live RBPE failed for " + orientation +
        " with HTTP " + response.status()
      );
    }
    const payload = await response.json();
    if (payload.renewables?.pv?.orientation !== orientation) {
      throw new Error("PV response orientation mismatch for " + orientation);
    }
    const postData = response.request().postData() || "";
    if (!postData.includes("%40lc2%7C") && !postData.includes("@lc2|")) {
      throw new Error(
        "PV orientation request did not use the compact climate token: " +
        postData.slice(0, 1200)
      );
    }
    await page.waitForFunction(
      () => {
        const ids = [
          "#edBaselineClass",
          "#edBaselineCost",
          "#edBaselineHeatingDemand",
          "#edBaselineCoolingDemand",
          "#edBaselineFinalEnergy",
          "#edBaselinePrimaryEnergy",
        ];
        return ids.every(selector => {
          const value = String(document.querySelector(selector)?.textContent || "").trim();
          return value && value !== "—";
        });
      },
      null,
      {timeout:30000}
    );
  }

  const liveFaviconHref = await page.evaluate(
    () => document.querySelector('link[rel~="icon"]')?.getAttribute("href") || ""
  );
  if (liveFaviconHref !== "/static/favicon.svg?v=6") {
    throw new Error("Editorial must keep the unified LC favicon: " + liveFaviconHref);
  }

  const desktopEnergyHud = await page.evaluate(() => {
    const group = document.querySelector(".ed-baseline-energy-group");
    if (!(group instanceof HTMLElement)) return null;
    return {
      display:getComputedStyle(group).display,
      text:String(group.textContent || "").replace(/\\s+/g, " ").trim(),
    };
  });
  if (!desktopEnergyHud || desktopEnergyHud.display === "none" ||
      !desktopEnergyHud.text.includes("QH,nd") ||
      !desktopEnergyHud.text.includes("QC,nd") ||
      !desktopEnergyHud.text.includes("Efinal") ||
      !desktopEnergyHud.text.includes("Eprim")) {
    throw new Error("Editorial desktop energy HUD notation is missing: " + JSON.stringify(desktopEnergyHud));
  }

  const editorialDesktopViewport = page.viewportSize();
  await page.setViewportSize({width:390,height:844});
  const mobileEnergyHudDisplay = await page.evaluate(() =>
    getComputedStyle(document.querySelector(".ed-baseline-energy-group")).display
  );
  if (mobileEnergyHudDisplay !== "none") {
    throw new Error("Editorial mobile energy metrics must be hidden behind annual cost details.");
  }
  await page.locator("#edPriceReferencesOpen").click();
  await page.locator("#priceDialog").waitFor({state:"visible", timeout:5000});
  const modalScrollContract = await page.evaluate(() => {
    const dialog = document.querySelector("#priceDialog");
    const shell = dialog?.querySelector(".ed-price-dialog-shell");
    if (!(dialog instanceof HTMLElement) || !(shell instanceof HTMLElement)) return null;
    const dialogStyle = getComputedStyle(dialog);
    const shellStyle = getComputedStyle(shell);
    return {
      dialogOverflowX:dialogStyle.overflowX,
      dialogOverflowY:dialogStyle.overflowY,
      shellOverflowX:shellStyle.overflowX,
      shellOverflowY:shellStyle.overflowY,
    };
  });
  if (!modalScrollContract ||
      modalScrollContract.dialogOverflowX !== "hidden" ||
      modalScrollContract.dialogOverflowY !== "hidden" ||
      modalScrollContract.shellOverflowX !== "hidden" ||
      modalScrollContract.shellOverflowY !== "auto") {
    throw new Error("Editorial dialog must have exactly one scroll owner: " + JSON.stringify(modalScrollContract));
  }
  const mobileEnergyDetails = await page.locator("#edCostEnergySummary").innerText();
  for (const label of [
    "Necesar util anual de încălzire",
    "Necesar util anual de răcire",
    "Energie finală anuală",
    "Energie primară anuală",
  ]) {
    if (!mobileEnergyDetails.includes(label)) {
      throw new Error("Annual cost dialog is missing energy detail: " + label + " :: " + mobileEnergyDetails);
    }
  }
  if ((mobileEnergyDetails.match(/—/g) || []).length > 0) {
    throw new Error("Annual cost dialog contains unresolved live RBPE energy values: " + mobileEnergyDetails);
  }
  await page.locator("#closePriceReferences").click();
  if (editorialDesktopViewport) {
    await page.setViewportSize(editorialDesktopViewport);
  }

  await page.locator("#edHouseValuesConfirmed").check();
  await page.locator('[data-page="renewables"] [data-next]').click();
  await expectVisible('[data-page="goal"].is-active');

  // Visual contract for the approved TEO control-center composition.
  const goalDesktopLayout = await page.evaluate(() => {
    const grid = document.querySelector(".ed-goal-control-center");
    const root = document.documentElement;
    if (!(grid instanceof HTMLElement)) return null;
    const style = getComputedStyle(grid);
    const rect = grid.getBoundingClientRect();
    return {
      columns:style.gridTemplateColumns.split(" ").filter(Boolean).length,
      left:rect.left,
      right:rect.right,
      viewport:innerWidth,
      horizontalOverflow:root.scrollWidth > innerWidth + 1,
    };
  });
  if (!goalDesktopLayout ||
      goalDesktopLayout.columns !== 2 ||
      goalDesktopLayout.left < -1 ||
      goalDesktopLayout.right > goalDesktopLayout.viewport + 1 ||
      goalDesktopLayout.horizontalOverflow) {
    throw new Error(
      "Editorial desktop TEO control-center visual contract failed: " +
      JSON.stringify(goalDesktopLayout)
    );
  }

  const goalDesktopViewport = page.viewportSize();
  await page.setViewportSize({width:390,height:844});
  const goalMobileLayout = await page.evaluate(() => {
    const grid = document.querySelector(".ed-goal-control-center");
    const title = document.querySelector("#edNzebStatusTitle");
    const root = document.documentElement;
    if (!(grid instanceof HTMLElement) || !(title instanceof HTMLElement)) return null;
    const gridStyle = getComputedStyle(grid);
    const rect = grid.getBoundingClientRect();
    const titleRect = title.getBoundingClientRect();
    return {
      columns:gridStyle.gridTemplateColumns.split(" ").filter(Boolean).length,
      left:rect.left,
      right:rect.right,
      titleRight:titleRect.right,
      viewport:innerWidth,
      horizontalOverflow:root.scrollWidth > innerWidth + 1,
    };
  });
  if (!goalMobileLayout ||
      goalMobileLayout.columns !== 1 ||
      goalMobileLayout.left < -1 ||
      goalMobileLayout.right > goalMobileLayout.viewport + 1 ||
      goalMobileLayout.titleRight > goalMobileLayout.viewport + 1 ||
      goalMobileLayout.horizontalOverflow) {
    throw new Error(
      "Editorial mobile TEO control-center visual contract failed: " +
      JSON.stringify(goalMobileLayout)
    );
  }
  if (goalDesktopViewport) {
    await page.setViewportSize(goalDesktopViewport);
  }

  const liveRerText = String(await page.locator("#edNzebRerValue").innerText()).trim();
  if (!liveRerText || liveRerText === "—") {
    throw new Error("Editorial nZEB panel did not render the bounded RER indicator.");
  }

  // Each economic objective must alter only its own TEO parameter.
  const objectiveState = async () => page.evaluate(() => ({
    mode:document.querySelector('[name="_optimization_mode"]')?.value || "",
    budgetDisabled:Boolean(document.querySelector("#edGoalBudget")?.disabled),
    budgetName:document.querySelector("#edGoalBudget")?.getAttribute("name") || "",
    paybackDisabled:Boolean(document.querySelector("#edGoalPayback")?.disabled),
    paybackName:document.querySelector("#edGoalPayback")?.getAttribute("name") || "",
  }));
  let objective = await objectiveState();
  if (objective.mode !== "auto_economic" || !objective.budgetDisabled || !objective.paybackDisabled) {
    throw new Error("Default TEO objective wiring is invalid: " + JSON.stringify(objective));
  }

  await page.locator('[data-choice-group="_optimization_mode"] [data-value="investment_budget"]').click();
  objective = await objectiveState();
  if (objective.mode !== "investment_budget" ||
      objective.budgetDisabled ||
      objective.budgetName !== "_investment_budget_lei" ||
      !objective.paybackDisabled) {
    throw new Error("Budget TEO objective wiring is invalid: " + JSON.stringify(objective));
  }

  await page.locator('[data-choice-group="_optimization_mode"] [data-value="max_payback_years"]').click();
  objective = await objectiveState();
  if (objective.mode !== "max_payback_years" ||
      !objective.budgetDisabled ||
      objective.paybackDisabled ||
      objective.paybackName !== "_max_payback_years") {
    throw new Error("Payback TEO objective wiring is invalid: " + JSON.stringify(objective));
  }

  await page.locator('[data-choice-group="_optimization_mode"] [data-value="auto_economic"]').click();

  // A 2026 house must lock the nZEB rule in the Objectives page; an older
  // existing house can explicitly disable it. Restore the original state
  // before the expensive smoke optimization.
  const constructionYear = page.locator('[name="construction_year"]');
  const originalYear = await constructionYear.inputValue();
  await constructionYear.evaluate((field) => {
    field.value = "2026";
    field.dispatchEvent(new Event("input", {bubbles:true}));
  });
  const newBuildNzeb = await page.evaluate(() => ({
    enabled:document.querySelector("#edNzebConstraintValue")?.value,
    mandatory:document.querySelector("#edNzebConstraintToggle")?.classList.contains("is-mandatory"),
    ariaDisabled:document.querySelector("#edNzebConstraintToggle")?.getAttribute("aria-disabled"),
    badge:String(document.querySelector("#edNzebMandatoryBadge")?.textContent || "").trim(),
    step3:String(document.querySelector("#edTeoStep3Label")?.textContent || "").trim(),
    compliantLabel:String(document.querySelector("#edTeoCompliantLabel")?.textContent || "").trim(),
  }));
  if (newBuildNzeb.enabled !== "1" ||
      !newBuildNzeb.mandatory ||
      newBuildNzeb.ariaDisabled !== "true" ||
      newBuildNzeb.badge !== "OBLIGATORIU" ||
      !/frontiera nZEB/i.test(newBuildNzeb.step3) ||
      !/soluții conforme/i.test(newBuildNzeb.compliantLabel)) {
    throw new Error("2026 nZEB lock contract failed: " + JSON.stringify(newBuildNzeb));
  }

  await constructionYear.evaluate((field, value) => {
    field.value = value || "2005";
    field.dispatchEvent(new Event("input", {bubbles:true}));
  }, originalYear);
  const nzebToggle = page.locator("#edNzebConstraintToggle");
  if ((await page.locator("#edNzebConstraintValue").inputValue()) === "1") {
    await nzebToggle.click();
  }
  const existingNzeb = await page.evaluate(() => ({
    enabled:document.querySelector("#edNzebConstraintValue")?.value,
    mandatory:document.querySelector("#edNzebConstraintToggle")?.classList.contains("is-mandatory"),
    badge:String(document.querySelector("#edNzebMandatoryBadge")?.textContent || "").trim(),
    step3:String(document.querySelector("#edTeoStep3Label")?.textContent || "").trim(),
    step4:String(document.querySelector("#edTeoStep4Label")?.textContent || "").trim(),
    compliantLabel:String(document.querySelector("#edTeoCompliantLabel")?.textContent || "").trim(),
  }));
  if (existingNzeb.enabled !== "0" ||
      existingNzeb.mandatory ||
      existingNzeb.badge !== "OPȚIONAL" ||
      !/frontiera Pareto/i.test(existingNzeb.step3) ||
      !/candidații economici/i.test(existingNzeb.step4) ||
      !/candidați fezabili/i.test(existingNzeb.compliantLabel)) {
    throw new Error("Existing-home optional nZEB contract failed: " + JSON.stringify(existingNzeb));
  }

  const editorialProductRequests = [];
  const productRequestListener = request => {
    try {
      if (new URL(request.url()).pathname === "/api/optimization/home-lab/v3/product") {
        editorialProductRequests.push(request.url());
      }
    } catch (_) {}
  };
  page.on("request", productRequestListener);

  await page.locator("#runAnalysis").click();
  await page.waitForFunction(
    () => {
      const result = document.querySelector("#edTeoResult");
      const state = String(document.querySelector("#edTeoRunState")?.textContent || "").trim();
      return (result && !result.hasAttribute("hidden")) || state === "Eroare";
    },
    null,
    {timeout:180000}
  );
  page.off("request", productRequestListener);

  const editorialTeoState = String(
    await page.locator("#edTeoRunState").innerText()
  ).trim();
  if (editorialTeoState === "Eroare") {
    const editorialError = await page.locator("#edNzebMessage").innerText();
    const editorialLog = await page.locator("#runLog").innerText();
    throw new Error(
      "Editorial adaptive TEO flow failed: " + editorialError +
      " log=" + editorialLog
    );
  }
  if (!(await page.locator('[data-page="goal"].is-active').count())) {
    throw new Error("Editorial TEO result must remain on page 5 after optimization.");
  }
  await expectVisible("#edTeoResult");
  const teoMeasureLabels = await page.locator("#edTeoMeasures .ed-teo-measure b").allInnerTexts();
  const requiredMeasureLabels = [
    "Pereți",
    "Acoperiș / pod",
    "Pardoseală",
    "Ferestre",
    "Punți termice",
    "Ventilație",
    "Încălzire",
    "Fotovoltaice",
    "Solar termic",
  ];
  if (requiredMeasureLabels.some(label => !teoMeasureLabels.includes(label))) {
    throw new Error(
      "Page 5 TEO result is missing approved measure rows: " +
      JSON.stringify(teoMeasureLabels)
    );
  }
  const teoScopeLabel = String(await page.locator("#edNzebScopeLabel").innerText()).trim();
  if (teoScopeLabel !== "După optimizarea TEO") {
    throw new Error("nZEB summary did not switch from baseline to TEO result scope: " + teoScopeLabel);
  }

  const teoComplianceText = String(
    await page.locator("#edTeoComplianceBadge").innerText()
  ).trim();
  if (!teoComplianceText ||
      (!teoComplianceText.includes("dovadă GO") &&
       !teoComplianceText.includes("Optim economic"))) {
    throw new Error(
      "Editorial TEO result lost the renewable-evidence boundary: " +
      teoComplianceText
    );
  }
  if (editorialProductRequests.length) {
    throw new Error(
      "Editorial TEO unexpectedly entered PRODUCT discretization: " +
      JSON.stringify(editorialProductRequests)
    );
  }

  const editorialRunLog = await page.locator("#runLog").innerText();
  const verifyMatches = editorialRunLog.match(/VERIFY\s+\d+\/\d+/g) || [];
  if (!editorialRunLog.includes("WORKER FLOW") ||
      !editorialRunLog.includes("ADAPTIVE VERIFY") ||
      !editorialRunLog.includes("TEO PARAMETRIC") ||
      !editorialRunLog.includes("REPORT") ||
      verifyMatches.length < 2 ||
      verifyMatches.length > 3) {
    throw new Error(
      "Editorial adaptive TEO trace is incomplete: " +
      JSON.stringify({verifyCount:verifyMatches.length, log:editorialRunLog})
    );
  }

  await page.locator("#openReportFromGoal").click();
  await expectVisible('[data-page="report"].is-active');
  const editorialReportText = await page.locator("#reportBody").innerText();
  const editorialHudStatus = await page.locator("#edBaselineStatus").innerText();
  if (!editorialHudStatus.includes("Rezultat TEO verificat")) {
    throw new Error(
      "Editorial persistent HUD did not switch to the verified TEO result: " +
      editorialHudStatus
    );
  }
  const infiltrationValue = Number(
    await page.locator("#techInfiltrationAch").inputValue()
  );
  if (Math.abs(infiltrationValue - 0.15) > 1e-9) {
    throw new Error(
      "Editorial medium default infiltration did not remain in the canonical TEO input: " +
      infiltrationValue
    );
  }
  if (!editorialReportText.includes("Înainte vs. după investiție") ||
      !editorialReportText.includes("Impactul soluției TEO") ||
      !editorialReportText.includes("LISTĂ DE MATERIALE") ||
      !editorialReportText.includes("Produse și cantități din catalogul LaCurent")) {
    throw new Error(
      "Editorial visual report is missing comparison/BOM sections: " +
      editorialReportText.slice(0, 4000)
    );
  }
  if (editorialReportText.includes("Optim TEO · specificație inginerească") ||
      editorialReportText.includes("nZEB · verificare tehnică modelată") ||
      editorialReportText.includes("Rezumat economic al optimului TEO")) {
    throw new Error(
      "Editorial visual report still duplicates TEO engineering/recommendation sections."
    );
  }

  // Retired classic 3D Home Lab is intentionally outside production and
  // outside the maintained browser regression surface.
  const classicResponse = await page.request.get(baseUrl + "/home-lab-classic");
  if (classicResponse.status() !== 404) {
    throw new Error(
      "Retired classic 3D Home Lab is still exposed in production: HTTP " +
      classicResponse.status()
    );
  }
  const partnerClassicResponse = await page.request.get(
    baseUrl + "/embed/demo-store/next"
  );
  if (partnerClassicResponse.status() !== 404) {
    throw new Error(
      "Retired partner classic 3D Home Lab is still exposed: HTTP " +
      partnerClassicResponse.status()
    );
  }

  if (pageErrors.length) {
    throw new Error("Browser page errors:\n" + pageErrors.join("\n"));
  }
  if (sameOriginRequestFailures.length) {
    throw new Error(
      "Application-origin request failures:\n" + sameOriginRequestFailures.join("\n")
    );
  }
  if (sameOriginServerErrors.length) {
    throw new Error(
      "Application-origin server errors:\n" + sameOriginServerErrors.join("\n")
    );
  }
  const fatalConsoleErrors = consoleErrors.filter(
    line =>
      /TypeError|ReferenceError|SyntaxError/i.test(line)
      && !isKnownExternal3dFetchError(line)
  );
  if (fatalConsoleErrors.length) {
    throw new Error("Browser console errors:\n" + fatalConsoleErrors.join("\n"));
  }
} finally {
  await browser.close();
}
