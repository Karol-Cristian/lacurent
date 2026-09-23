import { chromium } from "playwright";

const baseUrl = process.env.HOME_LAB_BASE_URL || process.env.STAGING_URL;
if (!baseUrl) throw new Error("HOME_LAB_BASE_URL or STAGING_URL is required");

const browser = await chromium.launch({headless:true});
const page = await browser.newPage({viewport:{width:1280,height:900}});
const pageErrors = [];
const consoleErrors = [];

page.on("pageerror", error => pageErrors.push(String(error?.stack || error)));
page.on("console", message => {
  if (message.type() === "error") consoleErrors.push(message.text());
});

async function expectVisible(selector) {
  await page.locator(selector).waitFor({state:"visible", timeout:15000});
}

async function waitCalculated(selector = "#hlnDockCost") {
  await page.waitForFunction(sel => {
    const node = document.querySelector(sel);
    const text = String(node?.textContent || "").trim();
    return text && text !== "—" && !/calculez|calculare/i.test(text);
  }, selector, {timeout:30000});
}

async function changeInput(selector, value) {
  const input = page.locator(selector);
  await input.fill(String(value));
  await input.dispatchEvent("change");
}

async function openEditor(name) {
  await page.locator(`.hln-config-row[data-hln-editor-open="${name}"]`).click();
  await expectVisible(`[data-hln-editor="${name}"]`);
}

async function closeEditor() {
  await page.locator("#hlnEditor .hln-editor-done").click();
  await page.locator("#hlnEditor").waitFor({state:"hidden", timeout:10000});
}

async function configureDiagnosticCase(config) {
  await page.evaluate(() => localStorage.clear());
  await page.reload({waitUntil:"networkidle"});
  await expectVisible('[data-hln-screen="home"].is-active');

  await openEditor("house");
  await changeInput("#hlnArea", config.area);
  await page.locator(`#hlnLevels [data-value="${config.levels}"]`).click();
  await changeInput("#hlnHeight", config.height);
  await changeInput("#hlnConstructionYear", config.year);
  await closeEditor();

  await openEditor("envelope");
  await page.locator("#hlnHomeWallStructure").selectOption(config.wallStructure);
  await changeInput("#hlnHomeWallStructureThickness", config.wallStructureThickness);
  await page.locator("#hlnHomeWallInsulationMaterial").selectOption("eps");
  await page.locator("#hlnHomeTopBoundary").selectOption("cold_attic");
  await page.locator("#hlnHomeFloorBoundary").selectOption("ground");
  await page.locator("#hlnHomeRoofInsulationMaterial").selectOption("mineral_wool");
  await page.locator("#hlnHomeFloorInsulationMaterial").selectOption("xps");
  await changeInput("#hlnHomeWallIns", config.wallIns);
  await changeInput("#hlnHomeRoofIns", config.roofIns);
  await changeInput("#hlnHomeFloorIns", config.floorIns);
  await changeInput("#hlnHomeWindows", config.windows);
  await page.locator("#hlnHomeGlazing").selectOption(config.glazing);
  await closeEditor();

  await openEditor("systems");
  await page.locator("#hlnHomeHeating").selectOption(config.heating);
  await page.locator("#hlnHomeHeatingEmitter").selectOption(config.emitter);
  await page.locator("#hlnHomeHeatingDistribution").selectOption(config.distribution);
  await page.locator("#hlnHomeHeatingStorage").selectOption("none");
  await page.locator("#hlnHomeHeatingControl").selectOption(config.control);
  await page.locator("#hlnHomeVentilation").selectOption(config.ventilation);
  await page.locator("#hlnHomeCooling").selectOption("none");
  await closeEditor();

  await waitCalculated("#hlnDockCost");
  await page.waitForTimeout(250);
}

async function snapshotForm() {
  return await page.evaluate(() => {
    const form = document.querySelector("#hlnTechnicalForm");
    return form ? Object.fromEntries(new FormData(form).entries()) : {};
  });
}

async function snapshotScenarioMetrics() {
  return {
    homeCost: (await page.locator("#hlnScenarioHomeCost").textContent())?.trim(),
    newCost: (await page.locator("#hlnScenarioNewCost").textContent())?.trim(),
    benefit: (await page.locator("#hlnScenarioBenefit").textContent())?.trim(),
    benefitLabel: (await page.locator("#hlnScenarioBenefitLabel").textContent())?.trim(),
    costCompare: (await page.locator("#hlnScenarioCostCompare").textContent())?.trim(),
    energyCompare: (await page.locator("#hlnScenarioEnergyCompare").textContent())?.trim(),
    co2Compare: (await page.locator("#hlnScenarioCo2Compare").textContent())?.trim(),
    powerCompare: (await page.locator("#hlnScenarioPowerCompare").textContent())?.trim(),
  };
}

async function navigateScenarioAndSnapshot() {
  await page.locator('[data-hln-go="scenario"]').click();
  await expectVisible('[data-hln-screen="scenario"].is-active');
  await page.waitForTimeout(200);
  const metrics = await snapshotScenarioMetrics();
  await page.locator('[data-hln-go="site"]').click();
  await expectVisible('[data-hln-screen="site"].is-active');
  return metrics;
}

async function runDiagnosticCase(config) {
  await configureDiagnosticCase(config);

  const baseline = {
    class: (await page.locator("#hlnDockClass").textContent())?.trim(),
    cost: (await page.locator("#hlnDockCost").textContent())?.trim(),
    energy: (await page.locator("#hlnDockEnergy").textContent())?.trim(),
    form: await snapshotForm(),
    visual: await page.evaluate(() => window.__homeLabVisualState || null),
  };

  await page.locator("#hlnDockCta").click();
  await expectVisible('[data-hln-screen="site"].is-active');

  const referenceResponse = page.waitForResponse(
    response => response.request().method() === "POST" && /calculate/.test(response.url()),
    {timeout:30000}
  ).catch(() => null);
  await page.locator('[data-hln-reference-house]').first().click();
  await referenceResponse;
  await page.waitForFunction(() => {
    const n = document.querySelector("#hlnReferenceSpec");
    const c = document.querySelector("#hlnLiveCost");
    return n && !n.hidden && c && String(c.textContent || "").trim() !== "—";
  }, null, {timeout:30000});

  const reference = {
    class: (await page.locator("#hlnLiveClass").textContent())?.trim(),
    cost: (await page.locator("#hlnLiveCost").textContent())?.trim(),
    saving: (await page.locator("#hlnLiveSaving").textContent())?.trim(),
    envelope: (await page.locator("#hlnReferenceEnvelope").textContent())?.trim(),
    wallIns: await page.locator("#hlnLiveWallIns").inputValue(),
    roofIns: await page.locator("#hlnLiveRoofIns").inputValue(),
    floorIns: await page.locator("#hlnLiveFloorIns").inputValue(),
    form: await snapshotForm(),
    visual: await page.evaluate(() => window.__homeLabVisualState || null),
  };
  reference.metrics = await navigateScenarioAndSnapshot();

  await page.locator('[data-hln-reset-home]').first().click();
  await page.waitForTimeout(300);

  const roiButton = page.locator('[data-hln-smart-config="roi"]');
  await roiButton.click();
  await page.waitForFunction(() => {
    const button = document.querySelector('[data-hln-smart-config="roi"]');
    const note = String(document.querySelector("#hlnOptimizationNote")?.textContent || "");
    return button && !button.disabled && note && !/Compar investițiile/.test(note);
  }, null, {timeout:120000});

  const roi = {
    note: (await page.locator("#hlnOptimizationNote").textContent())?.replace(/\s+/g," ").trim(),
    class: (await page.locator("#hlnLiveClass").textContent())?.trim(),
    cost: (await page.locator("#hlnLiveCost").textContent())?.trim(),
    saving: (await page.locator("#hlnLiveSaving").textContent())?.trim(),
    wallIns: await page.locator("#hlnLiveWallIns").inputValue(),
    roofIns: await page.locator("#hlnLiveRoofIns").inputValue(),
    floorIns: await page.locator("#hlnLiveFloorIns").inputValue(),
    glazing: await page.locator("#hlnLiveGlazing").inputValue(),
    heating: await page.locator("#hlnLiveHeating").inputValue(),
    ventilation: await page.locator("#hlnLiveVentilation").inputValue(),
    form: await snapshotForm(),
    visual: await page.evaluate(() => window.__homeLabVisualState || null),
  };
  roi.metrics = await navigateScenarioAndSnapshot();

  return {name:config.name, input:config, baseline, reference, roi};
}

try {
  await page.goto(baseUrl + "/home-lab-next", {waitUntil:"networkidle", timeout:30000});
  await expectVisible("[data-home-lab-next]");
  await expectVisible('[data-hln-screen="home"].is-active');

  await page.locator('.hln-config-row[data-hln-editor-open="house"]').click();
  await expectVisible('[data-hln-editor="house"]');
  await page.locator("#hlnArea").fill("130");
  await page.locator("#hlnArea").press("Tab");
  await page.locator(".hln-editor-done").click();

  await page.locator('.hln-config-row[data-hln-editor-open="envelope"]').click();
  await expectVisible('[data-hln-editor="envelope"]');
  await page.locator("#hlnHomeTopBoundary").selectOption("cold_attic");
  await page.locator("#hlnHomeRoofIns").fill("0");
  await page.locator("#hlnHomeRoofIns").press("Tab");
  await page.locator(".hln-editor-done").click();

  await page.waitForTimeout(1200);
  await expectVisible("#hlnDockCta");

  if (pageErrors.length) {
    throw new Error("Browser page errors:\n" + pageErrors.join("\n"));
  }
  if (consoleErrors.some(line => /TypeError|ReferenceError|SyntaxError/i.test(line))) {
    throw new Error("Browser console errors:\n" + consoleErrors.join("\n"));
  }


  const diagnosticCases = [
    {
      name:"veche_neizolata",
      area:120, levels:2, height:2.7, year:1975, windows:18,
      wallStructure:"solid_brick", wallStructureThickness:30,
      wallIns:0, roofIns:3, floorIns:0,
      glazing:"double_clear_glazing",
      heating:"gas_boiler", emitter:"radiators_high_temp",
      distribution:"hydronic_uninsulated", control:"manual", ventilation:"natural",
    },
    {
      name:"medie",
      area:120, levels:2, height:2.7, year:2005, windows:18,
      wallStructure:"efficient_brick", wallStructureThickness:30,
      wallIns:8, roofIns:10, floorIns:5,
      glazing:"double_low_e_face_3",
      heating:"condensing_gas_boiler", emitter:"radiators_high_temp",
      distribution:"hydronic_insulated", control:"room_thermostat", ventilation:"natural",
    },
    {
      name:"eficienta",
      area:120, levels:2, height:2.7, year:2022, windows:18,
      wallStructure:"efficient_brick", wallStructureThickness:30,
      wallIns:15, roofIns:25, floorIns:10,
      glazing:"triple_low_e_faces_2_and_5",
      heating:"condensing_gas_boiler", emitter:"radiators_low_temp",
      distribution:"hydronic_insulated", control:"weather_compensated", ventilation:"hrv",
    },
  ];
  const diagnosticResults = [];
  for (const diagnosticCase of diagnosticCases) {
    diagnosticResults.push(await runDiagnosticCase(diagnosticCase));
  }
  console.log("LACURENT_DIAGNOSTIC_JSON=" + JSON.stringify(diagnosticResults));
} finally {
  await browser.close();
}
