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

try {
  await page.goto(baseUrl + "/home-lab-next", {waitUntil:"networkidle", timeout:30000});
  await expectVisible("[data-home-lab-next]");
  await expectVisible('[data-hln-screen="home"].is-active');
  await expectVisible("#hlnPersistentClass");
  await expectVisible("#hlnPersistentCost");
  await expectVisible("#hlnPersistentEnergy");
  await expectVisible("#hlnStatus");

  const privacyFirstUse = page.locator("[data-lacurent-first-use-consent]");
  if (await privacyFirstUse.isVisible()) {
    await privacyFirstUse.locator("[data-lacurent-deny-local]").click();
    await privacyFirstUse.waitFor({state:"hidden", timeout:5000});
  }

  await page.waitForFunction(
    () => Array.isArray(window.__homeLab3D) && window.__homeLab3D[0]?.modelRoot,
    null,
    {timeout:30000}
  );
  const roofVisualCalibration = await page.evaluate(() => {
    const scene = window.__homeLab3D[0];
    scene.applyVisualState({
      ...(scene.visualState || {}),
      pvEnabled:true,
      pvKwp:20,
      solarThermalEnabled:true,
      solarThermalArea:12,
      heating:"condensing_gas_boiler",
    });

    const Box3Ctor = scene.modelBox.constructor;
    const Vector3Ctor = scene.modelSize.constructor;
    const RaycasterCtor = scene.raycaster.constructor;
    const pv = scene.experimentLayers.get("pv");
    const solarThermal = scene.experimentLayers.get("solarThermal");
    const heatPump = scene.experimentLayers.get("heatPump");
    const ac = scene.equipmentLayers.get("ac");
    const smoke = scene.equipmentLayers.get("chimneySmoke");
    const pvBox = new Box3Ctor().setFromObject(pv);
    const solarThermalBox = new Box3Ctor().setFromObject(solarThermal);
    const smokeWorld = scene.modelRoot.localToWorld(smoke.position.clone());
    const roofMeshes = scene.inspectableMeshes.filter(mesh => mesh?.visible !== false);

    scene.modelRoot.updateMatrixWorld(true);
    pv.updateMatrixWorld(true);
    solarThermal.updateMatrixWorld(true);

    const supportTolerance = scene.modelSize.y * 0.035;
    const roofSupport = (layer) => {
      const mountedRoofUuid = String(layer.userData?.roofMount?.objectUuid || "");
      const panels = layer.children
        .filter(panel => panel.visible)
        .map(panel => {
          const body = panel.children.find(child => {
            const params = child.geometry?.parameters;
            return Number.isFinite(params?.width) && Number.isFinite(params?.depth);
          });
          if (!body) return {name:panel.name, supported:false, reason:"panel-body-missing"};

          const width = body.geometry.parameters.width;
          const depth = body.geometry.parameters.depth;
          const samples = [
            [0, 0],
            [-width * 0.46, -depth * 0.46],
            [ width * 0.46, -depth * 0.46],
            [-width * 0.46,  depth * 0.46],
            [ width * 0.46,  depth * 0.46],
          ];

          const checks = samples.map(([x, z]) => {
            const panelPoint = panel.localToWorld(new Vector3Ctor(x, 0, z));
            const origin = panelPoint.clone();
            origin.y += scene.modelSize.y * 0.08;
            const ray = new RaycasterCtor(
              origin,
              new Vector3Ctor(0, -1, 0),
              0,
              scene.modelSize.y * 0.18
            );
            const hits = ray.intersectObjects(roofMeshes, true);
            const hit = hits.find(candidate => candidate.object?.uuid === mountedRoofUuid);
            const gap = hit ? Math.abs(panelPoint.y - hit.point.y) : null;
            const firstUuid = String(hits[0]?.object?.uuid || "");
            return {
              supported:Boolean(hit) && gap <= supportTolerance,
              gap,
              firstUuid,
              intercepted:Boolean(firstUuid) && firstUuid !== mountedRoofUuid,
            };
          });

          return {
            name:panel.name,
            supported:checks.every(check => check.supported),
            unobstructed:checks.every(check => !check.intercepted),
            maxGap:Math.max(...checks.map(check => check.gap ?? Number.POSITIVE_INFINITY)),
          };
        });
      return {mountedRoofUuid, panels};
    };

    const pvSupport = roofSupport(pv);
    const thermalSupport = roofSupport(solarThermal);
    const pvNormal = new Vector3Ctor(...(pv.userData?.roofMount?.worldNormal || [0, 1, 0])).normalize();
    const thermalNormal = new Vector3Ctor(...(solarThermal.userData?.roofMount?.worldNormal || [0, 1, 0])).normalize();
    const thermalCenter = solarThermalBox.getCenter(new Vector3Ctor());
    const pvCenter = pvBox.getCenter(new Vector3Ctor());

    return {
      pvVisible:pv.visible,
      pvVisibleChildren:pv.children.filter(child => child.visible).length,
      pvSupport,
      pvCenterY:pvCenter.y,
      solarThermalVisible:solarThermal.visible,
      solarThermalVisibleChildren:solarThermal.children.filter(child => child.visible).length,
      solarThermalAssetLoaded:Boolean(solarThermal.userData?.assetLoaded),
      solarThermalAssetFallback:Boolean(solarThermal.userData?.assetFallback),
      solarThermalAssetUrl:String(solarThermal.userData?.assetUrl || ""),
      heatPumpAssetLoaded:Boolean(heatPump?.userData?.assetLoaded),
      heatPumpAssetFallback:Boolean(heatPump?.userData?.assetFallback),
      heatPumpAssetUrl:String(heatPump?.userData?.assetUrl || ""),
      acAssetLoaded:Boolean(ac?.userData?.assetLoaded),
      acAssetFallback:Boolean(ac?.userData?.assetFallback),
      acAssetUrl:String(ac?.userData?.assetUrl || ""),
      thermalSupport,
      roofNormalDot:pvNormal.dot(thermalNormal),
      thermalCenterX:thermalCenter.x,
      modelCenterX:scene.modelCenter.x,
      smokeVisible:smoke.visible,
      smokeWorld:smokeWorld.toArray(),
    };
  });
  if (!roofVisualCalibration.pvVisible || roofVisualCalibration.pvVisibleChildren !== 8) {
    throw new Error("PV calibration did not expose the full eight-panel field");
  }
  if (!roofVisualCalibration.pvSupport.mountedRoofUuid ||
      roofVisualCalibration.pvSupport.panels.some(panel => !panel.supported)) {
    throw new Error("Lower PV field is not fully supported by the main GLB roof: " + JSON.stringify(roofVisualCalibration));
  }
  if (roofVisualCalibration.pvCenterY > 3.60) {
    throw new Error("PV field is still too high on the roof: " + JSON.stringify(roofVisualCalibration));
  }
  if (!roofVisualCalibration.solarThermalVisible || roofVisualCalibration.solarThermalVisibleChildren !== 1) {
    throw new Error("Solar thermal calibration did not expose the compact collector");
  }
  if (!roofVisualCalibration.solarThermalAssetLoaded ||
      roofVisualCalibration.solarThermalAssetFallback ||
      roofVisualCalibration.solarThermalAssetUrl !== "https://cdn.3dassets.dev/assets/2969/v1/model.glb") {
    throw new Error("Solar thermal collector did not load the imported GLB asset: " + JSON.stringify(roofVisualCalibration));
  }
  if (!roofVisualCalibration.thermalSupport.mountedRoofUuid ||
      roofVisualCalibration.thermalSupport.panels.some(panel => !panel.supported || !panel.unobstructed)) {
    throw new Error("Solar thermal field is unsupported or intercepted by another roof object: " + JSON.stringify(roofVisualCalibration));
  }
  if (roofVisualCalibration.roofNormalDot < 0.995) {
    throw new Error("Solar thermal collector is not aligned to the main roof plane: " + JSON.stringify(roofVisualCalibration));
  }
  if (roofVisualCalibration.thermalCenterX >= roofVisualCalibration.modelCenterX) {
    throw new Error("Solar thermal collector is not positioned on the lower-left roof area: " + JSON.stringify(roofVisualCalibration));
  }
  if (roofVisualCalibration.thermalSupport.mountedRoofUuid !== roofVisualCalibration.pvSupport.mountedRoofUuid) {
    throw new Error("Solar thermal collector mounted on a roof-window/non-main-roof mesh: " + JSON.stringify(roofVisualCalibration));
  }
  if (!roofVisualCalibration.heatPumpAssetLoaded ||
      roofVisualCalibration.heatPumpAssetFallback ||
      roofVisualCalibration.heatPumpAssetUrl !== "https://polyfork.dev/cdn/hvac-condenser-unit-a41b8d.glb") {
    throw new Error("Professional heat-pump/HVAC GLB did not load: " + JSON.stringify(roofVisualCalibration));
  }
  if (!roofVisualCalibration.acAssetLoaded ||
      roofVisualCalibration.acAssetFallback ||
      roofVisualCalibration.acAssetUrl !== "https://polyfork.dev/cdn/air-con-unit-9fadc2.glb") {
    throw new Error("Professional AC GLB did not load: " + JSON.stringify(roofVisualCalibration));
  }
  if (!roofVisualCalibration.smokeVisible) {
    throw new Error("Combustion plume is hidden for condensing gas");
  }
  const [smokeX, smokeY, smokeZ] = roofVisualCalibration.smokeWorld;
  if (Math.abs(smokeX - 0.80) > 0.30 || Math.abs(smokeZ - 0.40) > 0.30 || smokeY < 4.85) {
    throw new Error("Smoke is not anchored to the measured taller chimney: " + JSON.stringify(roofVisualCalibration));
  }

  await page.waitForFunction(() => {
    const badge = document.querySelector('[data-hln-3d-stage="home"] [data-hln-equipment="pv"]');
    return badge instanceof HTMLElement && !badge.hidden;
  });
  const pvBadge = page.locator('[data-hln-3d-stage="home"] [data-hln-equipment="pv"]');
  const pvBadgeText = await pvBadge.innerText();
  if (!/PV/i.test(pvBadgeText)) throw new Error("PV equipment badge is missing its visible label");
  await pvBadge.evaluate(button => button.click());
  try {
    await expectVisible("#hlnQuickEditOverlay");
  } catch (error) {
    throw new Error(
      "PV badge click did not open quick edit. pageErrors=" +
      JSON.stringify(pageErrors) +
      " consoleErrors=" +
      JSON.stringify(consoleErrors) +
      " cause=" + String(error)
    );
  }
  const quickEditTarget = await page.locator("#hlnQuickEditOverlay").getAttribute("data-hln-quick-edit-target");
  if (quickEditTarget !== "home") throw new Error("3D PV click did not open Casa mea quick edit");
  const quickEditTitle = await page.locator("#hlnQuickEditTitle").innerText();
  if (!/fotovoltaice/i.test(quickEditTitle)) throw new Error("3D PV click opened the wrong quick editor");
  const quickRange = page.locator("#hlnQuickEditRange");
  const beforeQuickValue = Number(await quickRange.inputValue());
  await quickRange.evaluate((input) => {
    const next = Math.min(Number(input.max || 50), Number(input.value || 0) + 0.5);
    input.value = String(next);
    input.dispatchEvent(new Event("input", {bubbles:true}));
    input.dispatchEvent(new Event("change", {bubbles:true}));
  });
  const afterQuickValue = Number(await quickRange.inputValue());
  if (!(afterQuickValue > beforeQuickValue)) throw new Error("PV quick editor did not accept the new power");
  if (await page.locator("#hlnQuickEditOverlay").getAttribute("hidden") !== null) {
    throw new Error("PV quick editor closed before the user pressed Gata");
  }
  await page.locator("[data-hln-quick-edit-commit]").click();
  await page.waitForFunction(() => document.querySelector("#hlnQuickEditOverlay")?.hidden === true);

  const compass = page.locator('[data-hln-3d-stage="home"] [data-hln-3d-compass]');
  await compass.waitFor({state:"visible", timeout:15000});
  const compassBox = await compass.boundingBox();
  if (!compassBox) throw new Error("Home Lab compass has no bounding box");
  await compass.click({position:{x:compassBox.width / 2, y:2}});
  await page.waitForFunction(() => document.querySelector("#hlnOrientation")?.value === "north");
  const orientationAfterCompass = await page.locator("#hlnOrientation").inputValue();
  if (orientationAfterCompass !== "north") throw new Error("Compass did not set semantic orientation");

  const canvas = page.locator('[data-hln-3d-stage="home"] canvas');
  const canvasBox = await canvas.boundingBox();
  if (canvasBox) {
    const startX = canvasBox.x + canvasBox.width * 0.58;
    const startY = canvasBox.y + canvasBox.height * 0.52;
    await page.mouse.move(startX, startY);
    await page.mouse.down();
    await page.mouse.move(startX + 90, startY + 12, {steps:6});
    await page.mouse.up();
  }
  const orientationAfterOrbit = await page.locator("#hlnOrientation").inputValue();
  if (orientationAfterOrbit !== "north") {
    throw new Error("Camera orbit changed the semantic house orientation");
  }

  await page.locator('.hln-config-row[data-hln-editor-open="house"]').click();
  try {
    await expectVisible('[data-hln-editor="house"]');
  } catch (error) {
    const editorState = await page.evaluate(() => {
      const editor = document.querySelector("#hlnEditor");
      return {
        editorHidden: editor?.hidden,
        editorMode: editor?.dataset?.hlnEditorMode || null,
        editorClass: editor?.className || null,
        visibleSections: [...document.querySelectorAll("[data-hln-editor]")].map(node => ({
          name: node.dataset.hlnEditor,
          hidden: node.hidden,
        })),
      };
    });
    throw new Error(
      "Technical house editor did not open. state=" + JSON.stringify(editorState) +
      " pageErrors=" + JSON.stringify(pageErrors) +
      " consoleErrors=" + JSON.stringify(consoleErrors) +
      " cause=" + String(error)
    );
  }
  const technicalSummaryLayout = await page.evaluate(() => {
    const stack = document.querySelector("[data-hln-persistent-stack]");
    const editor = document.querySelector("#hlnEditor");
    const card = editor?.querySelector(".hln-editor-card");
    if (!(stack instanceof HTMLElement) || !(card instanceof HTMLElement)) {
      throw new Error("Persistent summary or technical editor card is missing");
    }
    const stackBox = stack.getBoundingClientRect();
    const cardBox = card.getBoundingClientRect();
    const stackStyle = getComputedStyle(stack);
    const editorStyle = getComputedStyle(editor);
    return {
      bodyTechnical: document.body.classList.contains("hln-technical-open"),
      stackTop: stackBox.top,
      stackBottom: stackBox.bottom,
      cardTop: cardBox.top,
      stackZ:Number(stackStyle.zIndex || 0),
      editorZ:Number(editorStyle.zIndex || 0),
      stackFilter:stackStyle.filter,
      stackBackdrop:stackStyle.backdropFilter || stackStyle.webkitBackdropFilter || "none",
    };
  });
  if (!technicalSummaryLayout.bodyTechnical ||
      technicalSummaryLayout.stackTop > 1 ||
      technicalSummaryLayout.cardTop + 1 < technicalSummaryLayout.stackBottom ||
      technicalSummaryLayout.stackZ <= technicalSummaryLayout.editorZ ||
      technicalSummaryLayout.stackFilter !== "none" ||
      technicalSummaryLayout.stackBackdrop !== "none") {
    throw new Error("Persistent summary is not reserved above technical mode: " + JSON.stringify(technicalSummaryLayout));
  }

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

  // Save the baseline and run the new single-constraint budget optimizer.
  // Successful optimization goes directly from Step 2 to the report.
  await page.locator("#hlnDockCta").click();
  await expectVisible('[data-hln-screen="site"].is-active');
  await page.locator("#hlnRoiBudget").fill("50000");
  await page.locator('[data-hln-smart-config="economic-budget"]').click();
  await page.waitForFunction(
    () => {
      const button = document.querySelector('[data-hln-smart-config="economic-budget"]');
      const note = String(document.querySelector("#hlnOptimizationNote")?.textContent || "");
      return button && !button.disabled && note.includes("CAPEX");
    },
    null,
    {timeout:90000}
  );
  await expectVisible('[data-hln-screen="report"].is-active');

  const optimizerMeasures = await page.evaluate(() => window.__homeLabVisualState?.measures || []);
  if (!optimizerMeasures.length) throw new Error("Budget optimizer did not expose any selected measure");

  const optimizerReport = await page.evaluate(() => ({
    investment:String(document.querySelector("#hlnReportDecisionInvestment")?.textContent || ""),
    saving:String(document.querySelector("#hlnReportDecisionSaving")?.textContent || ""),
    raw:String(document.querySelector("#hlnReportRawSolution")?.textContent || ""),
    trace:String(document.querySelector("#hlnReportSearchTrace")?.textContent || ""),
    commercial:String(document.querySelector("#hlnReportCommercialSolution")?.textContent || ""),
  }));
  if (!/lei/i.test(optimizerReport.investment) ||
      !/lei\/an/i.test(optimizerReport.saving) ||
      !optimizerReport.raw.trim() ||
      !/configurații evaluate/i.test(optimizerReport.trace) ||
      !optimizerReport.commercial.trim()) {
    throw new Error("Direct optimizer report is incomplete: " + JSON.stringify(optimizerReport));
  }

  const persistentScenarioDeltas = await page.evaluate(() => {
    const summary = document.querySelector(".hln-live-summary");
    const cost = document.querySelector("#hlnPersistentCostDelta");
    const energy = document.querySelector("#hlnPersistentEnergyDelta");
    const energyClass = document.querySelector("#hlnPersistentClass");
    return {
      cost:String(cost?.textContent || ""),
      energy:String(energy?.textContent || ""),
      energyClass:String(energyClass?.textContent || ""),
      classColor:summary ? getComputedStyle(summary).getPropertyValue("--hln-class-color").trim() : "",
    };
  });
  if (!persistentScenarioDeltas.cost.includes("vs Casa mea") ||
      !persistentScenarioDeltas.energy.includes("vs Casa mea") ||
      !persistentScenarioDeltas.energyClass ||
      !persistentScenarioDeltas.classColor) {
    throw new Error("Persistent optimizer deltas/class color are missing: " + JSON.stringify(persistentScenarioDeltas));
  }

  const desktopReportDock = await page.evaluate(() => {
    const dock = document.querySelector(".hln-dock");
    const back = document.querySelector("#hlnDockBack");
    const cta = document.querySelector("#hlnDockCta");
    if (!(dock instanceof HTMLElement) || !(back instanceof HTMLElement) || !(cta instanceof HTMLElement)) {
      throw new Error("Desktop report dock is incomplete");
    }
    const backBox = back.getBoundingClientRect();
    return {
      dockState:dock.dataset.hlnDock,
      backVisible:backBox.width > 0 && backBox.height > 0,
      backLabel:String(back.textContent || "").trim(),
      ctaHidden:cta.hidden,
    };
  });
  if (desktopReportDock.dockState !== "report" ||
      desktopReportDock.backLabel !== "Înapoi la optimizare" ||
      !desktopReportDock.ctaHidden) {
    throw new Error("Desktop report navigation is incomplete: " + JSON.stringify(desktopReportDock));
  }

  // Returning to Casa mea through the global progress navigation must not
  // preserve the report's bottom scroll position.
  await page.evaluate(() => {
    document.querySelector('.hln-progress [data-hln-go="home"]')?.click();
  });
  await expectVisible('[data-hln-screen="home"].is-active');
  await page.waitForTimeout(50);
  const scrollAfterHome = await page.evaluate(() => window.scrollY);
  if (scrollAfterHome > 20) {
    throw new Error(`Home progress navigation did not reset scroll: ${scrollAfterHome}px`);
  }

  await page.locator('.hln-progress [data-hln-go="site"]').click();
  await expectVisible('[data-hln-screen="site"].is-active');
  await page.waitForFunction(
    () => !document.querySelector("#hlnDockCta")?.disabled,
    null,
    {timeout:30000}
  );
  await page.locator("#hlnDockCta").click();
  await expectVisible('[data-hln-screen="report"].is-active');
  await page.evaluate(() => window.scrollTo(0, document.body.scrollHeight));

  const reportEditClicked = await page.evaluate(() => {
    const button = document.querySelector('.hln-report-actions [data-hln-go="site"]');
    if (!(button instanceof HTMLElement)) return false;
    button.click();
    return true;
  });
  if (!reportEditClicked) throw new Error("Report edit-optimization control is missing");
  await expectVisible('[data-hln-screen="site"].is-active');
  await page.waitForTimeout(50);
  const scrollAfterReport = await page.evaluate(() => window.scrollY);
  if (scrollAfterReport > 20) {
    throw new Error(`Report navigation did not reset scroll immediately: ${scrollAfterReport}px`);
  }

  // Payback thresholds must be monotonic. A package found with a 7-year
  // ceiling whose actual payback is <= 6 years must also remain discoverable
  // when the ceiling is tightened to 6 years.
  await page.locator('.hln-progress [data-hln-go="site"]').click();
  await expectVisible('[data-hln-screen="site"].is-active');
  await page.locator('[data-hln-reset-home]').first().click();
  await page.locator("#hlnRoiPaybackYears").fill("7");
  await page.locator('[data-hln-smart-config="economic-payback"]').click();
  await page.waitForFunction(
    () => {
      const button = document.querySelector('[data-hln-smart-config="economic-payback"]');
      const note = String(document.querySelector("#hlnOptimizationNote")?.textContent || "");
      return button && !button.disabled &&
        (note.includes("CAPEX") || note.includes("Nu există") || note.includes("Optimizarea nu a putut"));
    },
    null,
    {timeout:90000}
  );
  const paybackNote7 = await page.locator("#hlnOptimizationNote").innerText();
  const actualMatch7 = paybackNote7.match(/amortizare\s+([0-9]+(?:[.,][0-9]+)?)\s+ani/i);
  if (actualMatch7) {
    const actualYears7 = Number(actualMatch7[1].replace(",", "."));
    if (actualYears7 <= 6.000001) {
      await page.locator('.hln-progress [data-hln-go="site"]').click();
      await expectVisible('[data-hln-screen="site"].is-active');
      await page.locator("#hlnRoiPaybackYears").fill("6");
      await page.locator('[data-hln-smart-config="economic-payback"]').click();
      await page.waitForFunction(
        () => {
          const button = document.querySelector('[data-hln-smart-config="economic-payback"]');
          const note = String(document.querySelector("#hlnOptimizationNote")?.textContent || "");
          return button && !button.disabled &&
            (note.includes("CAPEX") || note.includes("Nu există") || note.includes("Optimizarea nu a putut"));
        },
        null,
        {timeout:90000}
      );
      const paybackNote6 = await page.locator("#hlnOptimizationNote").innerText();
      if (!/CAPEX/i.test(paybackNote6)) {
        throw new Error(
          `Payback threshold is non-monotonic: 7-year search found ${actualYears7} years, but 6-year search did not. 6-year note: ${paybackNote6}`
        );
      }
    }
  }

  const privacyStorage = await page.evaluate(() => ({
    consent: JSON.parse(localStorage.getItem("lacurent-privacy-v1") || "null"),
    homeDraft: localStorage.getItem("lacurent-home-lab-next-v1:official"),
  }));
  if (privacyStorage.consent?.localAutosave !== false || privacyStorage.homeDraft !== null) {
    throw new Error("Home Lab wrote a local draft after local autosave was refused: " + JSON.stringify(privacyStorage));
  }

  // Issue #359 replacement: keep the normal house scale, reclaim intro space
  // only after the user starts working with the house.
  await page.setViewportSize({width:1024,height:768});
  await page.goto(baseUrl + "/home-lab-next", {waitUntil:"networkidle", timeout:30000});
  await expectVisible('[data-hln-screen="home"].is-active');
  const laptopIntroBefore = await page.evaluate(() => {
    const screen = document.querySelector('[data-hln-screen="home"]');
    const heading = screen?.querySelector(".hln-screen-heading");
    const board = screen?.querySelector(".hln-house-board");
    const visual = screen?.querySelector(".hln-house-visual");
    if (!(screen instanceof HTMLElement) || !(heading instanceof HTMLElement) ||
        !(board instanceof HTMLElement) || !(visual instanceof HTMLElement)) {
      throw new Error("Laptop adaptive intro elements are missing");
    }
    return {
      collapsed:screen.classList.contains("is-intro-collapsed"),
      headingHeight:heading.getBoundingClientRect().height,
      boardTop:board.getBoundingClientRect().top,
      visualHeight:visual.getBoundingClientRect().height,
    };
  });
  if (laptopIntroBefore.collapsed || laptopIntroBefore.headingHeight < 70) {
    throw new Error("Laptop intro should be visible on entry: " + JSON.stringify(laptopIntroBefore));
  }
  await page.locator('[data-hln-screen="home"] .hln-house-visual').dispatchEvent("pointerdown");
  await page.waitForFunction(
    () => document.querySelector('[data-hln-screen="home"]')?.classList.contains("is-intro-collapsed")
  );
  await page.waitForTimeout(280);
  const laptopIntroAfter = await page.evaluate(() => {
    const screen = document.querySelector('[data-hln-screen="home"]');
    const heading = screen?.querySelector(".hln-screen-heading");
    const board = screen?.querySelector(".hln-house-board");
    const visual = screen?.querySelector(".hln-house-visual");
    return {
      headingHeight:heading?.getBoundingClientRect().height ?? -1,
      boardTop:board?.getBoundingClientRect().top ?? -1,
      visualHeight:visual?.getBoundingClientRect().height ?? -1,
    };
  });
  if (laptopIntroAfter.headingHeight > 2 ||
      laptopIntroAfter.boardTop >= laptopIntroBefore.boardTop - 55 ||
      laptopIntroAfter.visualHeight < 390) {
    throw new Error("Laptop intro did not yield space to the normal-size house: " +
      JSON.stringify({before:laptopIntroBefore, after:laptopIntroAfter}));
  }

  await page.setViewportSize({width:390,height:844});
  await page.goto(baseUrl + "/home-lab-next", {waitUntil:"networkidle", timeout:30000});
  await expectVisible('[data-hln-screen="home"].is-active');
  const mobileIntroBefore = await page.evaluate(() => {
    const screen = document.querySelector('[data-hln-screen="home"]');
    const heading = screen?.querySelector(".hln-screen-heading");
    const visual = screen?.querySelector(".hln-house-visual");
    return {
      collapsed:screen?.classList.contains("is-intro-collapsed"),
      headingHeight:heading?.getBoundingClientRect().height ?? -1,
      visualHeight:visual?.getBoundingClientRect().height ?? -1,
    };
  });
  if (mobileIntroBefore.collapsed || mobileIntroBefore.headingHeight < 70) {
    throw new Error("Mobile intro should be visible after page entry: " + JSON.stringify(mobileIntroBefore));
  }
  await page.locator('[data-hln-screen="home"] .hln-house-visual').dispatchEvent("pointerdown");
  await page.waitForFunction(
    () => document.querySelector('[data-hln-screen="home"]')?.classList.contains("is-intro-collapsed")
  );
  await page.waitForTimeout(280);
  const mobileIntroAfter = await page.evaluate(() => {
    const screen = document.querySelector('[data-hln-screen="home"]');
    const heading = screen?.querySelector(".hln-screen-heading");
    const visual = screen?.querySelector(".hln-house-visual");
    return {
      headingHeight:heading?.getBoundingClientRect().height ?? -1,
      visualHeight:visual?.getBoundingClientRect().height ?? -1,
    };
  });
  if (mobileIntroAfter.headingHeight > 2 ||
      mobileIntroAfter.visualHeight < 465 ||
      mobileIntroAfter.visualHeight < mobileIntroBefore.visualHeight + 70) {
    throw new Error("Mobile intro space was not reassigned to the house: " +
      JSON.stringify({before:mobileIntroBefore, after:mobileIntroAfter}));
  }

  // A real reload starts a new UI session: the explanation must return.
  await page.reload({waitUntil:"networkidle", timeout:30000});
  await expectVisible('[data-hln-screen="home"].is-active');
  const introRestored = await page.evaluate(() => {
    const screen = document.querySelector('[data-hln-screen="home"]');
    const heading = screen?.querySelector(".hln-screen-heading");
    return {
      collapsed:screen?.classList.contains("is-intro-collapsed"),
      headingHeight:heading?.getBoundingClientRect().height ?? -1,
    };
  });
  if (introRestored.collapsed || introRestored.headingHeight < 70) {
    throw new Error("Adaptive intro did not return after refresh: " + JSON.stringify(introRestored));
  }

  await page.setViewportSize({width:390,height:844});
  await page.goto(baseUrl + "/home-lab-next", {waitUntil:"networkidle", timeout:30000});
  await expectVisible("[data-home-lab-next]");
  const mobileDock = await page.evaluate(() => {
    const dock = document.querySelector(".hln-dock");
    const benefits = document.querySelector(".hln-dock-benefits");
    const back = document.querySelector("#hlnDockBack");
    const cta = document.querySelector("#hlnDockCta");
    const ctaLabel = cta?.querySelector("span");
    if (!(dock instanceof HTMLElement) ||
        !(benefits instanceof HTMLElement) ||
        !(back instanceof HTMLElement) ||
        !(cta instanceof HTMLElement) ||
        !(ctaLabel instanceof HTMLElement)) {
      throw new Error("Mobile dock is incomplete");
    }
    const backBox = back.getBoundingClientRect();
    const ctaBox = cta.getBoundingClientRect();
    const dockStyle = getComputedStyle(dock);
    return {
      benefitsDisplay:getComputedStyle(benefits).display,
      backDisplay:getComputedStyle(back).display,
      backWidth:backBox.width,
      ctaVisible:ctaBox.width > 0 && ctaBox.height > 0,
      ctaWidth:ctaBox.width,
      ctaRight:ctaBox.right,
      mobileLabel:ctaLabel.dataset.mobileLabel,
      dockBackground:dockStyle.backgroundColor,
      dockBorder:dockStyle.borderTopWidth,
    };
  });
  if (mobileDock.benefitsDisplay !== "none" ||
      mobileDock.backDisplay !== "none" ||
      mobileDock.backWidth !== 0 ||
      !mobileDock.ctaVisible ||
      mobileDock.ctaWidth > 200 ||
      Math.abs(mobileDock.ctaRight - 376) > 2 ||
      mobileDock.mobileLabel !== "Îmbunătățiri" ||
      mobileDock.dockBackground !== "rgba(0, 0, 0, 0)" ||
      mobileDock.dockBorder !== "0px") {
    throw new Error("Mobile dock is not compact/right-aligned on Casa mea: " + JSON.stringify(mobileDock));
  }

  await page.waitForFunction(
    () => !document.querySelector("#hlnDockCta")?.disabled,
    null,
    {timeout:30000}
  );
  await page.locator("#hlnDockCta").click();
  await expectVisible('[data-hln-screen="site"].is-active');
  await page.waitForFunction(
    () => document.querySelector(".hln-live-summary")?.classList.contains("is-fresh"),
    null,
    {timeout:30000}
  );
  const mobileDeclutter = await page.evaluate(() => {
    const root = document.querySelector("[data-home-lab-next]");
    const homeReturn = document.querySelector('[data-hln-screen="site"] .hln-home-return');
    const mobileCopy = document.querySelector('[data-hln-screen="site"] .hln-copy-mobile');
    const desktopCopy = document.querySelector('[data-hln-screen="site"] .hln-copy-desktop');
    const energyPreview = document.querySelector(".hln-energy-preview");
    const status = document.querySelector(".hln-live-calc-status");
    const cta = document.querySelector("#hlnDockCta");
    const back = document.querySelector("#hlnDockBack");
    if (!(root instanceof HTMLElement) ||
        !(homeReturn instanceof HTMLElement) ||
        !(mobileCopy instanceof HTMLElement) ||
        !(desktopCopy instanceof HTMLElement) ||
        !(energyPreview instanceof HTMLElement) ||
        !(status instanceof HTMLElement) ||
        !(cta instanceof HTMLElement) ||
        !(back instanceof HTMLElement)) {
      throw new Error("Mobile declutter controls are incomplete");
    }
    const ctaBox = cta.getBoundingClientRect();
    const backBox = back.getBoundingClientRect();
    return {
      activeScreen:root.dataset.hlnActiveScreen,
      homeReturnDisplay:getComputedStyle(homeReturn).display,
      mobileCopyDisplay:getComputedStyle(mobileCopy).display,
      desktopCopyDisplay:getComputedStyle(desktopCopy).display,
      energyPreviewDisplay:getComputedStyle(energyPreview).display,
      statusDisplay:getComputedStyle(status).display,
      ctaHeight:ctaBox.height,
      backHeight:backBox.height,
    };
  });
  if (mobileDeclutter.activeScreen !== "site" ||
      mobileDeclutter.homeReturnDisplay !== "none" ||
      mobileDeclutter.mobileCopyDisplay === "none" ||
      mobileDeclutter.desktopCopyDisplay !== "none" ||
      mobileDeclutter.energyPreviewDisplay !== "none" ||
      mobileDeclutter.statusDisplay !== "none" ||
      mobileDeclutter.ctaHeight > 46 ||
      mobileDeclutter.backHeight > 42) {
    throw new Error("Mobile house-first declutter contract failed: " + JSON.stringify(mobileDeclutter));
  }

  const mobileBack = await page.evaluate(() => {
    const back = document.querySelector("#hlnDockBack");
    if (!(back instanceof HTMLElement)) throw new Error("Mobile back button is missing");
    const box = back.getBoundingClientRect();
    return {
      visible:box.width > 0 && box.height > 0 && getComputedStyle(back).display !== "none",
      left:box.left,
      label:String(back.textContent || "").trim(),
    };
  });
  if (!mobileBack.visible || mobileBack.left < 12 || mobileBack.left > 16 || mobileBack.label !== "Înapoi") {
    throw new Error("Mobile back navigation is not visible on step 2: " + JSON.stringify(mobileBack));
  }

  await page.waitForFunction(
    () => {
      const hotspot = document.querySelector('[data-hln-3d-hotspot="wall"]');
      const legacy = document.querySelector('.hln-zone-wall');
      const visible = (node) => {
        if (!(node instanceof HTMLElement)) return false;
        const box = node.getBoundingClientRect();
        return box.width > 0 && box.height > 0 && getComputedStyle(node).display !== "none";
      };
      // The semantic hotspot is authoritative when the external 3D model has
      // loaded. If that dependency is unavailable in CI, the HTML fallback
      // must remain usable instead of leaving Step 2 without an action.
      return visible(hotspot) || visible(legacy);
    },
    null,
    {timeout:30000}
  );
  await page.evaluate(() => {
    const hotspot = document.querySelector('[data-hln-3d-hotspot="wall"]');
    const legacy = document.querySelector('.hln-zone-wall');
    const visible = (node) => {
      if (!(node instanceof HTMLElement)) return false;
      const box = node.getBoundingClientRect();
      return box.width > 0 && box.height > 0 && getComputedStyle(node).display !== "none";
    };
    const target = visible(hotspot) ? hotspot : legacy;
    if (!(target instanceof HTMLElement)) throw new Error("No usable wall control on Step 2");
    target.click();
  });
  await expectVisible('[data-hln-screen="intervention"].is-active');
  const mobileInterventionNav = await page.evaluate(() => {
    const back = document.querySelector("#hlnDockBack");
    const cta = document.querySelector("#hlnDockCta");
    if (!(back instanceof HTMLElement) || !(cta instanceof HTMLElement)) {
      throw new Error("Mobile intervention navigation is incomplete");
    }
    const backBox = back.getBoundingClientRect();
    const ctaBox = cta.getBoundingClientRect();
    return {
      backLeft:backBox.left,
      backRight:backBox.right,
      ctaLeft:ctaBox.left,
      ctaRight:ctaBox.right,
      backOrder:getComputedStyle(back).order,
      ctaOrder:getComputedStyle(cta).order,
      overlap:backBox.right > ctaBox.left,
    };
  });
  if (mobileInterventionNav.backLeft < 12 ||
      mobileInterventionNav.backLeft > 16 ||
      Math.abs(mobileInterventionNav.ctaRight - 376) > 2 ||
      mobileInterventionNav.backOrder !== "0" ||
      mobileInterventionNav.ctaOrder !== "1" ||
      mobileInterventionNav.overlap) {
    throw new Error("Mobile back/forward controls overlap or are reversed: " + JSON.stringify(mobileInterventionNav));
  }

  await page.locator("#hlnDockCta").click();
  await expectVisible('[data-hln-screen="site"].is-active');
  await page.waitForFunction(
    () => !document.querySelector("#hlnDockCta")?.disabled,
    null,
    {timeout:30000}
  );
  await page.locator("#hlnDockCta").click();
  {
      const reportReady = await page.evaluate(() => {
        const report = document.querySelector('[data-hln-screen="report"]');
        if (!(report instanceof HTMLElement)) return false;
        const box = report.getBoundingClientRect();
        return report.classList.contains("is-active") &&
          getComputedStyle(report).display !== "none" &&
          getComputedStyle(report).visibility !== "hidden" &&
          box.width > 0 && box.height > 0;
      });
      if (!reportReady) throw new Error("Report screen did not become rendered after navigation");
    }
  const mobileReportNav = await page.evaluate(() => {
    const dock = document.querySelector(".hln-dock");
    const back = document.querySelector("#hlnDockBack");
    const cta = document.querySelector("#hlnDockCta");
    if (!(dock instanceof HTMLElement) || !(back instanceof HTMLElement) || !(cta instanceof HTMLElement)) {
      throw new Error("Mobile report navigation is incomplete");
    }
    const backBox = back.getBoundingClientRect();
    return {
      dockState:dock.dataset.hlnDock,
      dockDisplay:getComputedStyle(dock).display,
      backVisible:backBox.width > 0 && backBox.height > 0 && getComputedStyle(back).display !== "none",
      backLeft:backBox.left,
      backLabel:String(back.textContent || "").trim(),
      ctaHidden:cta.hidden,
    };
  });
  if (mobileReportNav.dockState !== "report" ||
      mobileReportNav.dockDisplay !== "flex" ||
      !mobileReportNav.backVisible ||
      mobileReportNav.backLeft < 12 ||
      mobileReportNav.backLeft > 16 ||
      mobileReportNav.backLabel !== "Înapoi la optimizare" ||
      !mobileReportNav.ctaHidden) {
    throw new Error("Mobile report remains a navigation dead end: " + JSON.stringify(mobileReportNav));
  }
  await page.locator("#hlnDockBack").click();
  await expectVisible('[data-hln-screen="site"].is-active');
  await page.locator('.hln-progress [data-hln-go="home"]').click();
  await expectVisible('[data-hln-screen="home"].is-active');
  const mobilePersistentLayout = await page.evaluate(() => {
    const stack = document.querySelector("[data-hln-persistent-stack]");
    const strip = document.querySelector(".hln-energy-strip");
    const summary = document.querySelector(".hln-live-summary");
    const status = document.querySelector("#hlnStatus");
    const quickOverlay = document.querySelector("#hlnQuickEditOverlay");
    const metrics = ["#hlnPersistentClass", "#hlnPersistentCost", "#hlnPersistentEnergy"]
      .map(selector => document.querySelector(selector));
    if (!(stack instanceof HTMLElement) ||
        !(strip instanceof HTMLElement) ||
        !(summary instanceof HTMLElement) ||
        !(status instanceof HTMLElement) ||
        !(quickOverlay instanceof HTMLElement) ||
        metrics.some(node => !(node instanceof HTMLElement))) {
      throw new Error("Mobile persistent Home Lab HUD is incomplete");
    }
    const stackBox = stack.getBoundingClientRect();
    const stripBox = strip.getBoundingClientRect();
    const summaryBox = summary.getBoundingClientRect();
    const statusBox = status.getBoundingClientRect();
    const stackStyle = getComputedStyle(stack);
    const quickStyle = getComputedStyle(quickOverlay);
    return {
      stackPosition:stackStyle.position,
      stackTop:stackBox.top,
      stripBottom:stripBox.bottom,
      summaryTop:summaryBox.top,
      summaryBottom:summaryBox.bottom,
      statusTop:statusBox.top,
      statusBottom:statusBox.bottom,
      stackZ:Number(stackStyle.zIndex || 0),
      quickZ:Number(quickStyle.zIndex || 0),
      stackFilter:stackStyle.filter,
      stackBackdrop:stackStyle.backdropFilter || stackStyle.webkitBackdropFilter || "none",
      metricsVisible:metrics.every(node => {
        const box = node.getBoundingClientRect();
        return box.width > 0 && box.height > 0;
      }),
    };
  });
  if (mobilePersistentLayout.stackPosition !== "fixed" ||
      mobilePersistentLayout.stackTop < 63 ||
      mobilePersistentLayout.stackTop > 65 ||
      mobilePersistentLayout.summaryTop + 1 < mobilePersistentLayout.stripBottom ||
      mobilePersistentLayout.statusTop + 1 < mobilePersistentLayout.summaryTop ||
      mobilePersistentLayout.statusBottom > mobilePersistentLayout.summaryBottom + 1 ||
      mobilePersistentLayout.stackZ <= mobilePersistentLayout.quickZ ||
      mobilePersistentLayout.stackFilter !== "none" ||
      mobilePersistentLayout.stackBackdrop !== "none" ||
      !mobilePersistentLayout.metricsVisible) {
    throw new Error("Mobile persistent result/status HUD is invalid: " + JSON.stringify(mobilePersistentLayout));
  }

  await page.evaluate(() => window.scrollTo(0, Math.max(document.body.scrollHeight, 1600)));
  await page.waitForTimeout(60);
  const mobileHudTopAfterScroll = await page.evaluate(
    () => document.querySelector("[data-hln-persistent-stack]")?.getBoundingClientRect().top
  );
  if (mobileHudTopAfterScroll == null || mobileHudTopAfterScroll < 63 || mobileHudTopAfterScroll > 65) {
    throw new Error("Mobile persistent HUD moved during scroll: " + mobileHudTopAfterScroll);
  }

  if (pageErrors.length) {
    throw new Error("Browser page errors:\n" + pageErrors.join("\n"));
  }
  if (consoleErrors.some(line => /TypeError|ReferenceError|SyntaxError/i.test(line))) {
    throw new Error("Browser console errors:\n" + consoleErrors.join("\n"));
  }
} finally {
  await browser.close();
}
