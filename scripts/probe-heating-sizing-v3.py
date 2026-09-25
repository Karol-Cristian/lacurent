from __future__ import annotations
import copy, json, urllib.parse, urllib.request, urllib.error, time

BASE="https://lacurent.com"
FORM={
  "project_name":"Heating V3 probe","locality_id":"siruta-54984","locality":"Cluj-Napoca",
  "building_type":"residential_individual","building_length_m":"10","building_width_m":"8",
  "heated_levels":"2","average_height_m":"2.7","house_window_area_m2":"20","house_door_area_m2":"2.2",
  "heated_floor_area_m2":"160","heated_volume_m3":"432","indoor_design_temperature_c":"20",
  "construction_year":"2005","insulation_profile":"average",
  "wall_area_m2":"171.8","wall_u_value":"0.55","roof_area_m2":"80","roof_u_value":"0.35",
  "floor_area_m2":"80","floor_u_value":"0.45","window_area_m2":"20","window_u_value":"1.6",
  "door_area_m2":"2.2","door_u_value":"1.8","thermal_bridge_length_m":"72","thermal_bridge_psi_w_mk":"0.08",
  "ventilation_type":"natural","air_changes_per_hour":"0.5","heat_recovery_efficiency":"0",
  "heating_choice":"condensing_gas_boiler","heating_system_type":"condensing_gas_boiler",
  "heating_efficiency":"0.94","heating_carrier":"natural_gas","heating_cost_profile":"natural_gas",
  "heating_chain_enabled":"on","heating_generator_type":"condensing_gas_boiler",
  "heating_emitter_type":"radiators_high_temp","heating_distribution_type":"hydronic_insulated",
  "heating_storage_type":"none","heating_control_type":"room_thermostat",
  "dhw_enabled":"on","dhw_occupants":"4","dhw_litres_per_person_day_at_60c":"50",
  "dhw_system_type":"same_as_heating","dhw_efficiency":"0.86","dhw_carrier":"natural_gas",
  "solar_mode":"normative_hsol","solar_orientation":"south","solar_glazing_type_id":"double_low_e_face_3",
  "solar_frame_fraction":"0.20","solar_obstacle_shading_factor":"1.0","solar_sky_view_factor":"0.5",
  "solar_exterior_surface_resistance_m2k_w":"0.04","solar_longwave_radiation_coefficient_w_m2k":"5.0",
  "solar_sky_temperature_difference_k":"11.0","pv_installed_power_kwp":"0","pv_orientation":"south",
  "pv_tilt_degrees":"30","pv_performance_ratio":"0.82","solar_thermal_collector_area_m2":"0",
  "solar_thermal_orientation":"south","solar_thermal_tilt_degrees":"45","solar_thermal_system_efficiency":"0.45",
  "expert_geometry_override":"on","expert_envelope_override":"on","expert_ventilation_override":"on","expert_heating_override":"on",
  "_optimization_mode":"auto_economic",
}

def post(path, form):
  data=urllib.parse.urlencode(form).encode()
  req=urllib.request.Request(BASE+path,data=data,method="POST",headers={"Content-Type":"application/x-www-form-urlencoded","User-Agent":"lacurent-v3-blackbox"})
  t=time.perf_counter()
  try:
    with urllib.request.urlopen(req,timeout=60) as r:
      return r.status, json.loads(r.read().decode()), time.perf_counter()-t
  except urllib.error.HTTPError as e:
    return e.code, {"raw":e.read().decode(errors="replace")}, time.perf_counter()-t

def run_case(label, form):
  plan_status, plan, plan_s = post("/api/optimization/home-lab/plan", form)
  assert plan_status == 200, (plan_status, plan)
  assert "heat-pump-air-water" in plan["runBranchIds"], plan
  payload=dict(form); payload["_heating_branch_id"]="heat-pump-air-water"
  status, body, seconds=post("/api/optimization/home-lab/branch", payload)
  assert status == 200, (status, body)
  selected=body["selection"]["selected"]
  assert selected
  line=next(x for x in selected["cost_breakdown"] if x["family"]=="heating")
  result={
    "case":label,
    "status":status,
    "seconds":round(seconds,3),
    "engine_evaluations":body["parametricEvaluations"],
    "design_heat_load_kw":selected["design_heat_load_kw"],
    "rated_power_kw":line["parameter_value"],
    "product_id":line["product_id"],
    "heating_capex_lei":line["capex_lei"],
    "note":line["note"],
  }
  print(json.dumps(result,ensure_ascii=False))
  return result

base=run_case("base", FORM)
improved=copy.deepcopy(FORM)
improved.update({"wall_u_value":"0.20","roof_u_value":"0.14","floor_u_value":"0.20","window_u_value":"0.8"})
better=run_case("improved_envelope", improved)

assert better["design_heat_load_kw"] < base["design_heat_load_kw"]
assert better["rated_power_kw"] <= base["rated_power_kw"]
assert base["rated_power_kw"] >= base["design_heat_load_kw"]
assert better["rated_power_kw"] >= better["design_heat_load_kw"]

# Repeat the heavier base branch to catch resource regressions.
for i in range(3):
  again=run_case(f"repeat_{i+1}", FORM)
  assert again["status"] == 200
