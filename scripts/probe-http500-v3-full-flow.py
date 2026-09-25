from __future__ import annotations
import json, time, urllib.parse, urllib.request, urllib.error

BASE="https://lacurent.com"
FORM={
  "project_name":"HTTP500 V3 full flow","locality_id":"siruta-54984","locality":"Cluj-Napoca",
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

def post(path, form, timeout=60):
  data=urllib.parse.urlencode(form).encode()
  req=urllib.request.Request(BASE+path,data=data,method="POST",
    headers={"Content-Type":"application/x-www-form-urlencoded","User-Agent":"lacurent-http500-diagnostic"})
  t=time.perf_counter()
  try:
    with urllib.request.urlopen(req,timeout=timeout) as r:
      raw=r.read().decode()
      try: body=json.loads(raw)
      except Exception: body={"raw":raw[:1000]}
      return r.status, body, round(time.perf_counter()-t,3)
  except urllib.error.HTTPError as e:
    raw=e.read().decode(errors="replace")
    try: body=json.loads(raw)
    except Exception: body={"raw":raw[:2000]}
    return e.code, body, round(time.perf_counter()-t,3)
  except Exception as e:
    return "EXC", {"error":repr(e)}, round(time.perf_counter()-t,3)

def one_run(run_no):
  print(json.dumps({"run":run_no,"phase":"start"}))
  st, plan, sec=post("/api/optimization/home-lab/plan",FORM)
  print(json.dumps({"run":run_no,"phase":"plan","status":st,"seconds":sec,"body":plan if st!=200 else {"runBranchIds":plan.get("runBranchIds"),"branches":len(plan.get("branches",[]))}},ensure_ascii=False))
  if st!=200:return
  results=[{"branch":b,"selection":{"selected":None},"candidateCount":0,"parametricEvaluations":0,"calculationTimeMs":0,"warnings":[]} for b in plan.get("branches",[]) if not b.get("eligible")]
  for bid in plan.get("runBranchIds",[]):
    form=dict(FORM); form["_heating_branch_id"]=bid
    st,b,sec=post("/api/optimization/home-lab/branch",form)
    print(json.dumps({"run":run_no,"phase":"branch","branch":bid,"status":st,"seconds":sec,"summary":({"eval":b.get("parametricEvaluations"),"selected":bool((b.get("selection") or {}).get("selected"))} if st==200 else b)},ensure_ascii=False))
    if st!=200:return
    results.append(b)
  form=dict(FORM); form["_branch_results_json"]=json.dumps(results)
  st,b,sec=post("/api/optimization/home-lab/finalize",form)
  print(json.dumps({"run":run_no,"phase":"finalize","status":st,"seconds":sec,"summary":({"capex":(b.get("optimization") or {}).get("capexLei"),"heat":(b.get("optimization") or {}).get("selectedHeating")} if st==200 else b)},ensure_ascii=False))

for i in range(1,6):
  one_run(i)
