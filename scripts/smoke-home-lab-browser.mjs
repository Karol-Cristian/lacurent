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
  await page.locator("[data-hln-editor-close]").click();

  await page.locator('.hln-config-row[data-hln-editor-open="envelope"]').click();
  await expectVisible('[data-hln-editor="envelope"]');
  await page.locator("#hlnHomeTopBoundary").selectOption("cold_attic");
  await page.locator("#hlnHomeRoofIns").fill("0");
  await page.locator("#hlnHomeRoofIns").press("Tab");
  await page.locator("[data-hln-editor-close]").click();

  await page.waitForTimeout(1200);
  await expectVisible("#hlnDockCta");

  if (pageErrors.length) {
    throw new Error("Browser page errors:\n" + pageErrors.join("\n"));
  }
  if (consoleErrors.some(line => /TypeError|ReferenceError|SyntaxError/i.test(line))) {
    throw new Error("Browser console errors:\n" + consoleErrors.join("\n"));
  }
} finally {
  await browser.close();
}
