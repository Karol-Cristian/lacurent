import { chromium } from "playwright";

const baseUrl = process.env.HOME_LAB_BASE_URL;
if (!baseUrl) throw new Error("HOME_LAB_BASE_URL is required");
const desktop = process.env.HOME_LAB_VIEWPORT === "desktop";

const browser = await chromium.launch({headless:true});
const page = await browser.newPage({
  viewport:desktop ? {width:1280,height:900} : {width:390,height:844},
});
const pageErrors = [];
page.on("pageerror", error => pageErrors.push(String(error?.stack || error)));

async function visible(selector) {
  await page.locator(selector).waitFor({state:"visible", timeout:15000});
}

try {
  await page.goto(baseUrl + "/home-lab-next", {waitUntil:"domcontentloaded", timeout:30000});
  await visible('[data-hln-screen="home"].is-active');
  await page.waitForFunction(() => {
    const button = document.querySelector("#hlnDockCta");
    return button && !button.disabled && !String(button.textContent).includes("recalculează");
  });

  await page.locator("#hlnDockCta").click();
  await visible('[data-hln-screen="site"].is-active');
  await page.locator('.hln-zone[data-hln-measure="wall"]').click();
  await visible('[data-hln-screen="intervention"].is-active');
  await page.waitForFunction(() => !document.querySelector("#hlnDockCta")?.disabled);
  await page.locator("[data-hln-intervention-keep]").click();
  await visible('[data-hln-screen="scenario"].is-active');
  await page.waitForFunction(() => !document.querySelector("#hlnDockCta")?.disabled);

  await page.locator('.hln-scenario-actions [data-hln-go="report"]').click();
  await visible('[data-hln-screen="report"].is-active');
  await page.evaluate(() => window.scrollTo(0, document.body.scrollHeight));
  const reportScroll = await page.evaluate(() => window.scrollY);
  if (reportScroll <= 20) throw new Error("Report did not create a meaningful scroll position");

  await page.evaluate(() => {
    document.querySelector('.hln-progress [data-hln-go="home"]')?.click();
  });
  await visible('[data-hln-screen="home"].is-active');
  await page.waitForTimeout(50);
  const homeScroll = await page.evaluate(() => window.scrollY);
  if (homeScroll > 20) {
    throw new Error(`Home progress navigation preserved report scroll: ${homeScroll}px`);
  }
  if (pageErrors.length) throw new Error(pageErrors.join("\n"));
} finally {
  await browser.close();
}
