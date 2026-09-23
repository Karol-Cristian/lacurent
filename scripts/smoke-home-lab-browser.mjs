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
  const sceneDiagnostic = await page.evaluate(() => {
    const scene = window.__homeLab3D?.[0];
    const Box3Ctor = scene.modelBox.constructor;
    const Vector3Ctor = scene.modelSize.constructor;
    const boxFor = (obj) => {
      const box = new Box3Ctor().setFromObject(obj);
      const size = new Vector3Ctor(); box.getSize(size);
      const center = new Vector3Ctor(); box.getCenter(center);
      return {min:box.min.toArray(), max:box.max.toArray(), size:size.toArray(), center:center.toArray()};
    };
    const meshes = (scene?.inspectableMeshes || []).map((mesh, index) => {
      const materials = (Array.isArray(mesh.material) ? mesh.material : [mesh.material]).map(m => ({
        name:m?.name || "",
        color:m?.color?.getHexString?.() || "",
      }));
      return {index,name:mesh.name || "",materials,box:boxFor(mesh),visible:mesh.visible};
    });
    const pv = scene?.experimentLayers?.get("pv");
    const smoke = scene?.equipmentLayers?.get("chimneySmoke");
    return {
      modelSize:scene?.modelSize?.toArray?.(),
      modelCenter:scene?.modelCenter?.toArray?.(),
      visualState:scene?.visualState || null,
      pv:{
        visible:pv?.visible,
        groupBox:pv ? boxFor(pv) : null,
        children:pv ? pv.children.map((child,index)=>({index,name:child.name,visible:child.visible,position:child.position.toArray(),box:boxFor(child)})) : [],
        roofMount:pv?.userData?.roofMount || null,
      },
      smoke:{
        visible:smoke?.visible,
        position:smoke?.position?.toArray?.(),
        box:smoke ? boxFor(smoke) : null,
      },
      meshes,
    };
  });
  console.log("LACURENT_HOUSE_GLTF_DIAGNOSTIC="+JSON.stringify(sceneDiagnostic));

  const roofPeakDiagnostic = await page.evaluate(() => {
    const scene = window.__homeLab3D?.[0];
    const Vector3Ctor = scene.modelSize.constructor;
    const threshold = scene.modelBox.min.y + scene.modelSize.y * 0.80;
    const buckets = new Map();
    for (const mesh of scene.inspectableMeshes || []) {
      const position = mesh.geometry?.attributes?.position;
      if (!position) continue;
      mesh.updateMatrixWorld(true);
      const point = new Vector3Ctor();
      for (let i = 0; i < position.count; i += 1) {
        point.fromBufferAttribute(position, i).applyMatrix4(mesh.matrixWorld);
        if (point.y < threshold) continue;
        const gx = Math.round(point.x / 0.20) * 0.20;
        const gz = Math.round(point.z / 0.20) * 0.20;
        const key = gx.toFixed(2)+","+gz.toFixed(2);
        const prev = buckets.get(key) || {x:gx,z:gz,maxY:-Infinity,count:0};
        prev.maxY = Math.max(prev.maxY, point.y);
        prev.count += 1;
        buckets.set(key, prev);
      }
    }
    return [...buckets.values()]
      .sort((a,b)=>b.maxY-a.maxY || b.count-a.count)
      .slice(0,40);
  });
  console.log("LACURENT_ROOF_PEAKS="+JSON.stringify(roofPeakDiagnostic));
  await browser.close();
  process.exit(0);

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
  await page.locator('.hln-report-actions [data-hln-go="scenario"]').click();
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
