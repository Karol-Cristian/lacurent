import fs from "node:fs";

const baseUrl = process.env.RBPE_BASE_URL;
const payloadPath = process.env.RBPE_BUILDING_FILE;
if (!baseUrl || !payloadPath) throw new Error("RBPE_BASE_URL and RBPE_BUILDING_FILE are required");

const baseBuilding = JSON.parse(fs.readFileSync(payloadPath, "utf8"));
const orientations = ["south","south_west","west","north_west","north","north_east","east","south_east"];
const cycles = Number(process.env.RBPE_CYCLES || 12);
const delayMs = Number(process.env.RBPE_DELAY_MS || 100);
const sleep = ms => new Promise(resolve => setTimeout(resolve, ms));

let count = 0;
for (let cycle = 0; cycle < cycles; cycle += 1) {
  for (const orientation of orientations) {
    count += 1;
    const building = structuredClone(baseBuilding);
    building.renewables = building.renewables || {};
    building.renewables.pv = {
      ...(building.renewables.pv || {}),
      enabled:true,
      installed_power_kwp:5,
      orientation,
      tilt_degrees:30,
      performance_ratio:0.82,
    };
    const started = performance.now();
    const response = await fetch(baseUrl + "/live-calculation", {
      method:"POST",
      headers:{
        "Accept":"application/json",
        "Content-Type":"application/json",
        "User-Agent":"LaCurent-RBPE-Stress/1.0",
      },
      body:JSON.stringify({payload:building}),
    });
    const elapsed = performance.now() - started;
    const text = await response.text();
    let data = null;
    try { data = JSON.parse(text); } catch (_) {}
    console.log(JSON.stringify({
      count,cycle:cycle+1,orientation,status:response.status,
      elapsed_ms:Math.round(elapsed),
      energy_class:data?.energy_class ?? null,
      annual_cost_lei:data?.annual_cost_lei ?? null,
      monthly_rows:Array.isArray(data?.monthly) ? data.monthly.length : 0,
    }));
    if (!response.ok || !data?.energy_class || data?.annual_cost_lei == null) {
      console.error("RBPE_STRESS_FAILURE_BODY", text.slice(0, 1200));
      process.exit(1);
    }
    if (!Array.isArray(data.monthly) || data.monthly.length !== 12) {
      console.error("RBPE_STRESS_INVALID_MONTHLY", text.slice(0, 1200));
      process.exit(2);
    }
    await sleep(delayMs);
  }
}

console.log(JSON.stringify({status:"ok",total_requests:count}));
