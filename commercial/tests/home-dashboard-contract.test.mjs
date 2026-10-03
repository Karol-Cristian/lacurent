import test from "node:test";
import assert from "node:assert/strict";
import {
  dashboardRefreshMs,
  extractEditorialHomeDashboard,
  pvOrientationAzimuth,
  solarPowerForecastUrl,
} from "../static/home-dashboard-contract.mjs";

function project() {
  return {
    projectId:"house-1",
    name:"Casa Cluj",
    workspace:{
      schemaVersion:"home_lab_editorial_workspace_v1",
      draft:{
        fields:{
          "id:localityId":{value:"siruta-cluj"},
          "id:localityInput":{value:"Cluj-Napoca"},
          "id:heatedArea":{value:"145"},
          "id:heatedLevels":{value:"2"},
          "id:heatingChoice":{value:"wood_boiler"},
          "id:cooling":{value:"none"},
          "id:ventilation":{value:"hrv"},
          "id:windowArea":{value:"21,5"},
          "id:orientation":{value:"south_west"},
          "id:glazing":{value:"triple_low_e_faces_2_and_5"},
          "id:advSolarGn":{value:"0,5"},
          "id:pvEnabled":{checked:true},
          "name:pv_installed_power_kwp":{value:"7.2"},
          "name:pv_orientation":{value:"south_west"},
          "name:pv_tilt_degrees":{value:"35"},
          "id:solarThermalEnabled":{checked:true},
          "name:solar_thermal_collector_area_m2":{value:"4"},
          "name:solar_thermal_orientation":{value:"south"},
          "name:solar_thermal_tilt_degrees":{value:"45"},
        },
      },
      baselineResult:{
        diagnostics:[{code:"SOLAR_GAIN_QSKY_AND_ELEMENT_INPUTS_REQUIRED"}],
      },
    },
  };
}

test("Editorial saved project maps to Casa mea without assuming missing Qsol", () => {
  const model=extractEditorialHomeDashboard(project(), {
    id:"siruta-cluj",name:"Cluj-Napoca",county:"Cluj",lat:46.7712,lon:23.6236,
  });
  assert.equal(model.project_name,"Casa Cluj");
  assert.equal(model.location.ready,true);
  assert.equal(model.pv.forecast_ready,true);
  assert.equal(model.systems.heating,"wood_boiler");
  assert.equal(model.systems.ventilation,"hrv");
  assert.equal(model.pv.installed_kwp,7.2);
  assert.equal(model.pv.azimuth_deg,45);
  assert.equal(model.solar_thermal.collector_area_m2,4);
  assert.equal(model.envelope_solar.static_status,"blocked_missing_qsol_inputs");
  assert.equal(model.envelope_solar.live_15_min_ready,false);
});

test("PV orientation mapping follows SolarPowerAPI south-zero convention", () => {
  assert.equal(pvOrientationAzimuth("south"),0);
  assert.equal(pvOrientationAzimuth("west"),90);
  assert.equal(pvOrientationAzimuth("east"),-90);
  assert.equal(pvOrientationAzimuth("north"),180);
});

test("SolarPowerAPI URL uses saved PV geometry and kWp to MWp conversion", () => {
  const model=extractEditorialHomeDashboard(project(), {
    name:"Cluj-Napoca",county:"Cluj",lat:46.7712,lon:23.6236,
  });
  const url=new URL(solarPowerForecastUrl(model));
  assert.equal(url.hostname,"api.solarpowerapi.com");
  assert.equal(url.searchParams.get("capacity_mwp"),"0.0072");
  assert.equal(url.searchParams.get("tilt"),"35");
  assert.equal(url.searchParams.get("azimuth"),"45");
  assert.equal(dashboardRefreshMs(),900000);
});

test("Dashboard can fetch irradiance for a saved house without PV", () => {
  const input=project();
  input.workspace.draft.fields["id:pvEnabled"]={checked:false};
  const model=extractEditorialHomeDashboard(input,{lat:44.4,lon:26.1,name:"București"});
  const url=new URL(solarPowerForecastUrl(model));
  assert.equal(model.pv.forecast_ready,false);
  assert.equal(url.searchParams.get("capacity_mwp"),"0.001");
  assert.equal(url.searchParams.get("tilt"),"30");
  assert.equal(url.searchParams.get("azimuth"),"0");
});
