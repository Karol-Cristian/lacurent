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

  if (pageErrors.length) {
    throw new Error("Browser page errors:\n" + pageErrors.join("\n"));
  }
  if (consoleErrors.some(line => /TypeError|ReferenceError|SyntaxError/i.test(line))) {
    throw new Error("Browser console errors:\n" + consoleErrors.join("\n"));
  }
} finally {
  await browser.close();
}
