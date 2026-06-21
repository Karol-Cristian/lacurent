const expected = "lacurent-production";

if (process.env.CONFIRM_PRODUCTION_DEPLOY !== expected) {
  console.error("Production deploy blocked.");
  console.error(`Set CONFIRM_PRODUCTION_DEPLOY=${expected} only when you intentionally deploy production.`);
  console.error("PowerShell example:");
  console.error(`  $env:CONFIRM_PRODUCTION_DEPLOY="${expected}"; npm.cmd run deploy:prod`);
  process.exit(1);
}
