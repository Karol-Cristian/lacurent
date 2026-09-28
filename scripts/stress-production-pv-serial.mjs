const baseUrl = process.env.STRESS_BASE_URL || "https://lacurent-commercial-v2.lemnarukarol.workers.dev";
const orientations = ["south","south_west","west","north_west","north","north_east","east","south_east"];
const cycles = Number(process.env.STRESS_CYCLES || 6);
const delayMs = Number(process.env.STRESS_DELAY_MS || 150);

const base = {
  project_name:"PV serial stress",
  locality_id:"@lc2|alba_iulia|III|-18|siruta-stress|Stress%20Locality|Alba",
  locality:"Stress Locality",
  heated_floor_area_m2:"160",
  heated_volume_m3:"432",
  indoor_design_temperature_c:"20",
  building_type:"residential_individual",
  construction_year:"2004",
  wall_area_m2:"168",
  wall_u_value:"0.42",
  roof_area_m2:"92",
  roof_u_value:"0.24",
  floor_area_m2:"80",
  floor_u_value:"0.36",
  floor_boundary_type:"ground",
  ground_exposed_perimeter_m:"36",
  ground_wall_thickness_m:"0.30",
  ground_conductivity_w_mk:"2.0",
  window_area_m2:"24",
  window_u_value:"1.35",
  door_area_m2:"3.2",
  door_u_value:"1.7",
  thermal_bridge_length_m:"42",
  thermal_bridge_psi_w_mk:"0.05",
  air_changes_per_hour:"0.5",
  infiltration_air_changes_per_hour:"0.15",
  heat_recovery_efficiency:"0",
  heating_system_type:"condensing_gas_boiler",
  heating_efficiency:"0.94",
  heating_carrier:"natural_gas",
  dhw_enabled:"on",
  dhw_occupants:"4",
  dhw_litres_per_person_day_at_60c:"50",
  dhw_efficiency:"0.86",
  dhw_carrier:"natural_gas",
  pv_enabled:"on",
  pv_installed_power_kwp:"5",
  pv_tilt_degrees:"30",
  pv_performance_ratio:"0.82",
};

const sleep = ms => new Promise(resolve => setTimeout(resolve, ms));
let count = 0;
for (let cycle = 0; cycle < cycles; cycle += 1) {
  for (const orientation of orientations) {
    count += 1;
    const body = new URLSearchParams({...base, pv_orientation:orientation});
    const started = performance.now();
    const response = await fetch(baseUrl + "/api/home-lab-next/calculate", {
      method:"POST",
      headers:{"Accept":"application/json","Content-Type":"application/x-www-form-urlencoded"},
      body,
    });
    const elapsed = performance.now() - started;
    const text = await response.text();
    let payload = null;
    try { payload = JSON.parse(text); } catch (_) {}
    const cls = payload?.energy_class ?? null;
    const cost = payload?.annual_cost_lei ?? null;
    console.log(JSON.stringify({count,cycle:cycle+1,orientation,status:response.status,elapsed_ms:Math.round(elapsed),energy_class:cls,annual_cost_lei:cost}));
    if (!response.ok || !payload || !cls || cost == null) {
      console.error("STRESS_FAILURE_BODY", text.slice(0, 1200));
      process.exit(1);
    }
    await sleep(delayMs);
  }

  const health = await fetch(baseUrl + "/health", {headers:{"Accept":"application/json"}});
  const healthText = await health.text();
  console.log(JSON.stringify({after_cycle:cycle+1,health_status:health.status,health:healthText.slice(0,200)}));
  if (!health.ok) process.exit(2);
}

const page = await fetch(baseUrl + "/home-lab-next", {headers:{"Accept":"text/html"}});
console.log(JSON.stringify({final_page_status:page.status,total_requests:count}));
if (!page.ok) {
  console.error((await page.text()).slice(0,1200));
  process.exit(3);
}
