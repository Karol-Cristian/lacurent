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

    const solarAnchorProbeCandidates = [
      [-0.16, 0.78, 0.08],
      [-0.14, 0.78, 0.08],
      [-0.12, 0.78, 0.08],
      [-0.10, 0.78, 0.08],
      [-0.08, 0.78, 0.08],
      [-0.06, 0.78, 0.08],
      [-0.04, 0.78, 0.08],
      [-0.02, 0.78, 0.08],
      [ 0.00, 0.78, 0.08],
      [ 0.02, 0.78, 0.08],
      [ 0.04, 0.78, 0.08],
      [ 0.05, 0.78, 0.08],
      [-0.08, 0.78, 0.05],
      [-0.06, 0.78, 0.05],
      [-0.04, 0.78, 0.05],
      [-0.02, 0.78, 0.05],
      [ 0.00, 0.78, 0.05],
      [ 0.02, 0.78, 0.05],
      [ 0.04, 0.78, 0.05],
      [-0.06, 0.78, 0.02],
      [-0.04, 0.78, 0.02],
      [-0.02, 0.78, 0.02],
      [ 0.00, 0.78, 0.02],
      [ 0.02, 0.78, 0.02],
    ];
    const solarAnchorProbe = solarAnchorProbeCandidates.map(anchor => {
      scene.mountLayerOnRoof(solarThermal, anchor);
      solarThermal.updateMatrixWorld(true);
      const support = roofSupport(solarThermal);
      const box = new Box3Ctor().setFromObject(solarThermal);
      const center = box.getCenter(new Vector3Ctor());
      const projected = center.clone().project(scene.camera);
      return {
        anchor,
        fallback:Boolean(solarThermal.userData?.roofMountFallback),
        mountedRoofUuid:String(solarThermal.userData?.roofMount?.objectUuid || ""),
        support,
        screenNdc:[projected.x, projected.y],
      };
    });
    scene.mountLayerOnRoof(solarThermal, [0.05, 0.78, 0.08]);
    solarThermal.updateMatrixWorld(true);

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
      solarAnchorProbe,
      thermalSupport,
      roofNormalDot:pvNormal.dot(thermalNormal),
      thermalCenterX:thermalCenter.x,
      modelCenterX:scene.modelCenter.x,
      smokeVisible:smoke.visible,
      smokeWorld:smokeWorld.toArray(),
    };
  });
  console.log("SOLAR_ANCHOR_PROBE " + JSON.stringify(roofVisualCalibration.solarAnchorProbe));
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
  if (!roofVisualCalibration.smokeVisible) {
    throw new Error("Combustion plume is hidden for condensing gas");
  }
  const [smokeX, smokeY, smokeZ] = roofVisualCalibration.smokeWorld;
  if (Math.abs(smokeX - 0.80) > 0.30 || Math.abs(smokeZ - 0.40) > 0.30 || smokeY < 4.85) {
    throw new Error("Smoke is not anchored to the measured taller chimney: " + JSON.stringify(roofVisualCalibration));
  }

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

  // Save the baseline, run the budget-constrained economic optimizer, and
  // require the visible Scenario economics to reconcile with the optimizer.
  await page.locator("#hlnDockCta").click();
  await expectVisible('[data-hln-screen="site"].is-active');
  await page.locator("#hlnRoiBudget").fill("50000");
  await page.locator('[data-hln-smart-config="roi-budget"]').click();
  await page.waitForFunction(
    () => {
      const button = document.querySelector('[data-hln-smart-config="roi-budget"]');
      const note = String(document.querySelector("#hlnOptimizationNote")?.textContent || "");
      return button && !button.disabled && note.includes("Best ROI · buget") && note.includes("CAPEX");
    },
    null,
    {timeout:90000}
  );
  const optimizerMeasures = await page.evaluate(() => window.__homeLabVisualState?.measures || []);
  if (!optimizerMeasures.length) throw new Error("Budget Best ROI did not expose any selected measure");

  await page.locator("#hlnDockCta").click();
  await expectVisible('[data-hln-screen="scenario"].is-active');
  await expectVisible("#hlnScenarioInvestmentSummary");
  const investmentText = await page.locator("#hlnScenarioInvestmentSummary").innerText();
  if (!/BEST ROI · BUGET/i.test(investmentText) || !/CAPEX total/i.test(investmentText) || !/lei\/an/i.test(investmentText)) {
    throw new Error("Scenario budget ROI reconciliation is incomplete: " + investmentText);
  }

  await page.locator('.hln-scenario-actions [data-hln-go="report"]').click();
  await expectVisible('[data-hln-screen="report"].is-active');
  await page.evaluate(() => window.scrollTo(0, document.body.scrollHeight));
  // This control lives inside the report heading while the smoke has just
  // scrolled to the document bottom. Its viewport/actionability state is
  // intentionally irrelevant here: validate the navigation handler directly.
  const reportEditClicked = await page.evaluate(() => {
    const button = document.querySelector('.hln-report-actions [data-hln-go="scenario"]');
    if (!(button instanceof HTMLElement)) return false;
    button.click();
    return true;
  });
  if (!reportEditClicked) throw new Error("Report edit-scenario control is missing");
  await expectVisible('[data-hln-screen="scenario"].is-active');
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
  await page.locator('[data-hln-smart-config="roi-payback"]').click();
  await page.waitForFunction(
    () => {
      const button = document.querySelector('[data-hln-smart-config="roi-payback"]');
      const note = String(document.querySelector("#hlnOptimizationNote")?.textContent || "");
      return button && !button.disabled &&
        (note.includes("CAPEX") || note.includes("Niciun pachet") || note.includes("Nu am găsit"));
    },
    null,
    {timeout:90000}
  );
  const paybackNote7 = await page.locator("#hlnOptimizationNote").innerText();
  const actualMatch7 = paybackNote7.match(/amortizare\s+([0-9]+(?:[.,][0-9]+)?)\s+ani\s+·\s+ROI/i);
  if (actualMatch7) {
    const actualYears7 = Number(actualMatch7[1].replace(",", "."));
    if (actualYears7 <= 6.000001) {
      await page.locator("#hlnRoiPaybackYears").fill("6");
      await page.locator('[data-hln-smart-config="roi-payback"]').click();
      await page.waitForFunction(
        () => {
          const button = document.querySelector('[data-hln-smart-config="roi-payback"]');
          const note = String(document.querySelector("#hlnOptimizationNote")?.textContent || "");
          return button && !button.disabled &&
            (note.includes("CAPEX") || note.includes("Niciun pachet") || note.includes("Nu am găsit"));
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

  if (pageErrors.length) {
    throw new Error("Browser page errors:\n" + pageErrors.join("\n"));
  }
  if (consoleErrors.some(line => /TypeError|ReferenceError|SyntaxError/i.test(line))) {
    throw new Error("Browser console errors:\n" + consoleErrors.join("\n"));
  }
} finally {
  await browser.close();
}
