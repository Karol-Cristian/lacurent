from __future__ import annotations
import json, time, urllib.request, urllib.error

BASE="https://lacurent.com"
FORM={
  "project_name":"Compact refine live probe","locality_id":"siruta-54984","locality":"Cluj-Napoca",
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
}

def post(payload):
  raw=json.dumps(payload,separators=(",",":")).encode()
  req=urllib.request.Request(BASE+"/api/optimization/home-lab/branch",data=raw,method="POST",
    headers={"Content-Type":"application/json","User-Agent":"lacurent-compact-refine-live-probe"})
  t=time.perf_counter()
  try:
    with urllib.request.urlopen(req,timeout=60) as r:
      body=json.loads(r.read().decode())
      return r.status,body,round(time.perf_counter()-t,3),len(raw)
  except urllib.error.HTTPError as e:
    rawbody=e.read().decode(errors="replace")
    try: body=json.loads(rawbody)
    except Exception: body={"raw":rawbody[:1200]}
    return e.code,body,round(time.perf_counter()-t,3),len(raw)

def run(mode, budget=None, repeats=10):
  form=dict(FORM)
  form["_optimization_mode"]=mode
  if budget is not None: form["_investment_budget_lei"]=str(budget)
  for i in range(1,repeats+1):
    summaries=[]
    ok=True
    for phase in ("axis","halton"):
      st,b,sec,n=post({"form":form,"branchId":"electric-boiler","searchPhase":phase,"priorCandidates":[]})
      print(json.dumps({"mode":mode,"run":i,"phase":phase,"status":st,"seconds":sec,"bytes":n,
        "eval":b.get("parametricEvaluations"),"summaries":len(b.get("candidateSummaries") or [])},ensure_ascii=False))
      if st!=200:
        print(json.dumps({"error_body":b},ensure_ascii=False));ok=False;break
      summaries.extend(b.get("candidateSummaries") or [])
    if not ok: continue
    st,b,sec,n=post({"form":form,"branchId":"electric-boiler","searchPhase":"refine","priorCandidates":summaries})
    print(json.dumps({"mode":mode,"run":i,"phase":"refine","status":st,"seconds":sec,"bytes":n,
      "prior":len(summaries),"eval":b.get("parametricEvaluations"),"summaries":len(b.get("candidateSummaries") or []),
      "error_body":None if st==200 else b},ensure_ascii=False))

run("auto_economic", repeats=12)
run("investment_budget", budget=30000, repeats=12)
