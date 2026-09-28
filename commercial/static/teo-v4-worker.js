/* TEO V4 browser-search worker.
 *
 * Deep parametric exploration runs off the Cloudflare Python isolate. Python
 * remains authoritative: only a bounded, diverse shortlist is sent back for
 * canonical verification. Commercial product matching is intentionally later.
 */
"use strict";

const EPS = 1e-9;
const AUTO_HORIZONS = [5, 10, 15, 20, 25];

const SEARCH_DIMENSIONS = Object.freeze([
  ["wall_added_r_m2k_w", "wall_added_r_m2k_w_max"],
  ["roof_added_r_m2k_w", "roof_added_r_m2k_w_max"],
  ["floor_added_r_m2k_w", "floor_added_r_m2k_w_max"],
  ["window_replacement_fraction", "window_replacement_fraction_max"],
  ["ventilation_heat_recovery_efficiency_target", "ventilation_heat_recovery_efficiency_target_max"],
  ["pv_added_kwp", "pv_added_kwp_max"],
  ["solar_thermal_added_m2", "solar_thermal_added_m2_max"],
]);
const LOCAL_REFINEMENT_ROUNDS = Object.freeze([
  {seedCount:8, steps:[0.125, 0.0625], pairwiseStep:0.0625},
  {seedCount:6, steps:[0.03125, 0.015625], pairwiseStep:null},
]);

function num(value, fallback = 0) {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : fallback;
}

function round(value, digits = 3) {
  const scale = 10 ** digits;
  return Math.round((num(value) + Number.EPSILON) * scale) / scale;
}

function clamp(value, low, high) {
  return Math.min(high, Math.max(low, value));
}

function slabEffectiveU(u, area, perimeter, wallThickness, groundLambda) {
  if (Math.min(u, area, perimeter, groundLambda) <= 0 || wallThickness < 0) return null;
  const characteristic = 2 * area / perimeter;
  const resistance = 1 / u;
  const equivalentThickness = wallThickness + groundLambda * resistance;
  if (equivalentThickness < characteristic) {
    return (
      2 * groundLambda /
      (Math.PI * characteristic + equivalentThickness) *
      Math.log(Math.PI * characteristic / equivalentThickness + 1)
    );
  }
  return groundLambda / (0.457 * characteristic + equivalentThickness);
}

function adjustedU(item, measures) {
  let u = num(item.u_value_w_m2k);
  let addedR = 0;
  if (item.type === "exterior_wall") addedR = num(measures.wall_added_r_m2k_w);
  if (item.type === "roof") addedR = num(measures.roof_added_r_m2k_w);
  if (item.type === "floor") addedR = num(measures.floor_added_r_m2k_w);
  if (addedR > 0) u = 1 / (1 / u + addedR);
  if (item.type === "window") {
    const fraction = clamp(num(measures.window_replacement_fraction), 0, 1);
    if (fraction > 0) {
      u = (1 - fraction) * u + fraction * num(measures.window_target_u_w_m2k, 0.9);
    }
  }
  return u;
}

function transmission(kernel, measures) {
  const totals = {Hd:0, Hg:0, Hu:0, Ha:0};
  let windowUA = 0;
  for (const item of kernel.envelope || []) {
    const u = adjustedU(item, measures);
    const area = num(item.area_m2);
    let value = 0;
    if (item.boundary_type === "ground" && item.ground_contact) {
      const g = item.ground_contact;
      const effectiveU = slabEffectiveU(
        u,
        area,
        num(g.exposed_perimeter_m),
        num(g.wall_thickness_m),
        num(g.ground_conductivity_w_mk)
      );
      if (effectiveU == null) return null;
      value =
        effectiveU * area +
        num(g.exposed_perimeter_m) * num(g.edge_psi_w_mk);
    } else {
      value = u * num(item.boundary_factor) * area;
    }
    const component = item.component || "Hd";
    totals[component] = num(totals[component]) + value;
    if (item.type === "window") windowUA += u * area;
  }
  for (const bridge of kernel.thermal_bridges || []) {
    const component = bridge.component || "Hd";
    totals[component] = num(totals[component]) + num(bridge.value_w_k);
  }
  totals.htr = totals.Hd + totals.Hg + totals.Hu + totals.Ha;
  totals.windowUA = windowUA;
  return totals;
}

function airflow(kernel, measures) {
  const v = kernel.ventilation || {};
  const volume = num(kernel.volume_m3);
  const baselineRecovery = num(v.heat_recovery_efficiency);
  const target = num(measures.ventilation_heat_recovery_efficiency_target);
  const recovery = target > baselineRecovery ? target : baselineRecovery;
  const ventilation = 0.34 * num(v.air_changes_per_hour) * volume * (1 - recovery);
  const infiltration = 0.34 * num(v.infiltration_air_changes_per_hour) * volume;
  return {ventilation, infiltration, total:ventilation + infiltration, recovery};
}

function heatingUtilization(gamma, a) {
  if (Math.abs(gamma - 1) <= 1e-12) return a / (a + 1);
  if (gamma === 0) return 1;
  const logGamma = Math.log(gamma);
  if (gamma > 1) {
    return Math.expm1(-a * logGamma) / Math.expm1(-(a + 1) * logGamma) / gamma;
  }
  return Math.expm1(a * logGamma) / Math.expm1((a + 1) * logGamma);
}

function monthlyHeatingNeed(qHt, gains, aH) {
  if (qHt <= 0) return 0;
  if (gains <= 0) return qHt;
  const gamma = gains / qHt;
  if (gamma > 2) return 0;
  return Math.max(qHt - heatingUtilization(gamma, aH) * gains, 0);
}

function coolingTransferUtilization(gamma, aC) {
  if (gamma < 0) return 1;
  if (Math.abs(gamma - 1) <= 1e-12) return aC / (aC + 1);
  return heatingUtilization(1 / gamma, aC);
}

function monthlyCoolingNeed(qHt, gains, aC, reduction) {
  if (gains <= 0) return Math.max(-qHt, 0) * reduction;
  if (Math.abs(qHt) <= 1e-12) return gains * reduction;
  const gamma = gains / qHt;
  if (gamma > 0 && 1 / gamma > 2) return 0;
  return Math.max(reduction * (gains - coolingTransferUtilization(gamma, aC) * qHt), 0);
}

function monthlyBalance(kernel, measures, trans, air, branch) {
  const mm = kernel.monthly_method || {};
  const area = num(kernel.area_m2);
  const totalH = trans.htr + air.total;
  const capacityJ = num(mm.effective_internal_heat_capacity_j_m2k) * area;
  const tauH = (capacityJ / 3600) / Math.max(totalH, 1e-12);
  const aH = num(mm.a_h0) + tauH / num(mm.tau_h0_h, 1);
  const aC = num(mm.a_c0) + tauH / num(mm.tau_c0_h, 1);
  const reduction = num(mm.cooling_reduction_factor_continuous, 1);
  const indoor = num(kernel.indoor_temperature_c);
  const annualOutdoor = num(kernel.annual_outdoor_temperature_c);
  const excludingGround = trans.Hd + trans.Hu + trans.Ha;
  const rows = [];
  let annualHeating = 0;
  let annualCooling = 0;

  for (const month of kernel.monthly || []) {
    const hours = num(month.days) * 24;
    const outdoor = num(month.outdoor_temperature_c);
    const solar =
      num(month.gross_solar_gains_kwh) -
      num(month.sky_loss_kwh_per_window_ua) * trans.windowUA;
    const gains = num(month.internal_gains_kwh) + solar;

    const qHeating =
      excludingGround * (indoor - outdoor) * hours / 1000 +
      trans.Hg * (indoor - annualOutdoor) * hours / 1000 +
      air.total * (indoor - outdoor) * hours / 1000;
    const usefulHeating = monthlyHeatingNeed(qHeating, gains, aH);

    let usefulCooling = 0;
    if (branch.cooling_enabled) {
      const setpoint = num(branch.cooling_setpoint_c, 26);
      const qCooling =
        excludingGround * (setpoint - outdoor) * hours / 1000 +
        trans.Hg * (setpoint - annualOutdoor) * hours / 1000 +
        air.total * (setpoint - outdoor) * hours / 1000;
      usefulCooling = monthlyCoolingNeed(qCooling, gains, aC, reduction);
    }
    annualHeating += usefulHeating;
    annualCooling += usefulCooling;
    rows.push({
      usefulHeating,
      usefulCooling,
      dhwUseful:num(month.dhw_useful_kwh),
      days:num(month.days)
    });
  }
  return {rows, annualHeating, annualCooling};
}

function interpolateCurve(points, target, xName, yName, activation = 0, extrapolate = false) {
  if (target <= 0) return 0;
  if (!Array.isArray(points) || !points.length) return null;
  const sorted = points.slice().sort((a,b) => num(a[xName]) - num(b[xName]));
  if (!extrapolate && target > num(sorted[sorted.length - 1][xName]) + 1e-9) return null;

  if (target <= num(sorted[0][xName]) + 1e-9) {
    if (extrapolate) return num(sorted[0][yName]);
    const upperX = num(sorted[0][xName]);
    const upperY = num(sorted[0][yName]);
    return activation + (upperX <= EPS ? upperY : target / upperX * upperY);
  }

  let low = sorted[0];
  let high = sorted[sorted.length - 1];
  if (target > num(high[xName]) + 1e-9 && extrapolate) {
    low = sorted[Math.max(0, sorted.length - 2)];
  } else {
    for (let i=1;i<sorted.length;i++) {
      if (target <= num(sorted[i][xName]) + 1e-9) {
        low = sorted[i-1];
        high = sorted[i];
        break;
      }
    }
  }
  const x0 = num(low[xName]);
  const y0 = num(low[yName]);
  const x1 = num(high[xName]);
  const y1 = num(high[yName]);
  let variable = y1;
  if (Math.abs(x1 - x0) > 1e-12) {
    const slope = (y1 - y0) / (x1 - x0);
    if (extrapolate && target > x1 && slope < 0) {
      // Match Python _planning_heating_capex(): a negative terminal
      // market slope is flattened at the last observed CAPEX, not at
      // the penultimate point.
      variable = y1;
    } else {
      variable = y0 + (target - x0) * slope;
    }
  }
  return (extrapolate ? 0 : activation) + Math.max(variable, 0);
}

function interventionCapex(kernel, measures) {
  const catalog = kernel.cost_catalog || {};
  const costs = catalog.costs || catalog;
  const parametric = catalog.parametric_curves || {};
  const systems = catalog.system_curves || {};
  const geometry = kernel.geometry || {};
  const lambdas = kernel.normalization_lambda || {};
  let total = 0;

  const insulation = [
    ["wall", "wall_added_r_m2k_w", "net_wall_area_m2"],
    ["roof", "roof_added_r_m2k_w", "roof_area_m2"],
    ["floor", "floor_added_r_m2k_w", "floor_area_m2"],
  ];
  for (const [family, key, areaKey] of insulation) {
    const addedR = num(measures[key]);
    if (addedR <= 0) continue;
    const area = num(geometry[areaKey]);
    const curve = parametric[family];
    if (curve) {
      const unit = interpolateCurve(
        curve.points,
        addedR,
        "parameter_value",
        "variable_cost_per_basis_lei",
        num(curve.activation_cost_per_basis_lei),
        false
      );
      if (unit == null) return null;
      total += area * unit;
    } else {
      const item = costs[family] || {};
      const cm = addedR * num(lambdas[family], 0.04) * 100;
      total += area * cm * num(item.cost_lei);
    }
  }

  const fraction = num(measures.window_replacement_fraction);
  if (fraction > 0) {
    const affected = num(geometry.window_area_m2) * fraction;
    const curve = parametric.windows;
    if (curve) {
      const resistance = 1 / num(measures.window_target_u_w_m2k, 0.9);
      const unit = interpolateCurve(
        curve.points,
        resistance,
        "parameter_value",
        "variable_cost_per_basis_lei",
        num(curve.activation_cost_per_basis_lei),
        false
      );
      if (unit == null) return null;
      total += affected * unit;
    } else {
      total += affected * num((costs.windows || {}).cost_lei);
    }
  }

  const baselineRecovery = num(kernel.ventilation?.heat_recovery_efficiency);
  const targetRecovery = num(measures.ventilation_heat_recovery_efficiency_target);
  if (targetRecovery > baselineRecovery + EPS) {
    total += num((costs.ventilation || {}).cost_lei);
  }

  const pvAdded = num(measures.pv_added_kwp);
  if (pvAdded > 0) {
    const curve = systems.pv;
    if (curve) {
      const value = interpolateCurve(
        curve.points,
        pvAdded,
        "parameter_value",
        "variable_total_cost_lei",
        num(curve.activation_cost_lei),
        false
      );
      if (value == null) return null;
      total += value;
    } else {
      total += pvAdded * num((costs.pv || {}).cost_lei);
    }
  }

  const thermalAdded = num(measures.solar_thermal_added_m2);
  if (thermalAdded > 0) {
    const curve = systems.solar_thermal;
    if (curve) {
      const value = interpolateCurve(
        curve.points,
        thermalAdded,
        "parameter_value",
        "variable_total_cost_lei",
        num(curve.activation_cost_lei),
        false
      );
      if (value == null) return null;
      total += value;
    } else {
      total += thermalAdded * num((costs.solar_thermal || {}).cost_lei);
    }
  }
  return total;
}

function heatingCapex(branch, requiredPowerKw) {
  if (branch.branch_id === "keep-current-heating") return 0;
  const points = branch.planning_nodes || [];
  return interpolateCurve(
    points,
    requiredPowerKw,
    "required_power_kw",
    "planning_capex_lei",
    0,
    true
  );
}

function renewableAndCarriers(kernel, measures, branch, balance) {
  const renew = kernel.renewables || {};
  const currentPv = renew.pv_enabled ? num(renew.pv_installed_kwp) : 0;
  const pvPower = currentPv + num(measures.pv_added_kwp);
  const pvPr =
    measures.pv_performance_ratio == null
      ? num(renew.pv_performance_ratio)
      : num(measures.pv_performance_ratio);

  const currentThermal = renew.solar_thermal_enabled ? num(renew.solar_thermal_area_m2) : 0;
  const thermalArea = currentThermal + num(measures.solar_thermal_added_m2);
  const thermalEfficiency =
    measures.solar_thermal_system_efficiency == null
      ? num(renew.solar_thermal_efficiency)
      : num(measures.solar_thermal_system_efficiency);

  const heatingFinal = balance.annualHeating * num(branch.heating_final_per_useful);
  const coolingFinal = balance.annualCooling * num(branch.cooling_final_per_useful);
  const auxiliary = num(branch.heating_auxiliary_kwh_year);

  let dhwFinal = 0;
  let pvSelf = 0;
  let pvRegulatedSelf = 0;
  let pvHouseholdSelf = 0;
  let pvExport = 0;
  let householdGridImport = 0;
  const householdAnnual = Math.max(num(renew.pv_household_electricity_kwh_year), 0);
  const totalDays = Math.max(
    balance.rows.reduce((sum, row) => sum + Math.max(num(row.days), 0), 0),
    365
  );
  const gross = {};
  function add(carrier, value) {
    if (!carrier || value <= 0) return;
    gross[carrier] = num(gross[carrier]) + value;
  }
  add(branch.heating_carrier, heatingFinal);
  add("electricity", auxiliary);
  add("electricity", coolingFinal);

  const annualHeating = Math.max(balance.annualHeating, 0);
  for (let i=0;i<balance.rows.length;i++) {
    const row = balance.rows[i];
    const thermalHsol = num(renew.solar_thermal_hsol_kwh_m2_month?.[i]);
    const thermalAvailable = thermalHsol * thermalArea * thermalEfficiency;
    const thermalUsed = Math.min(thermalAvailable, row.dhwUseful);
    const dhwBackupUseful = Math.max(row.dhwUseful - thermalUsed, 0);
    const monthDhwFinal = dhwBackupUseful * num(branch.dhw_final_per_useful);
    dhwFinal += monthDhwFinal;

    let regulatedElectricLoad = 0;
    if (auxiliary > 0) {
      regulatedElectricLoad += annualHeating > 0
        ? auxiliary * row.usefulHeating / annualHeating
        : auxiliary / Math.max(balance.rows.length, 1);
    }
    if (branch.heating_carrier === "electricity") {
      regulatedElectricLoad += row.usefulHeating * num(branch.heating_final_per_useful);
    }
    regulatedElectricLoad += row.usefulCooling * num(branch.cooling_final_per_useful);
    if (branch.dhw_carrier === "electricity") regulatedElectricLoad += monthDhwFinal;

    const householdLoad = householdAnnual * Math.max(num(row.days), 0) / totalDays;
    const pvGeneration =
      num(renew.pv_hsol_kwh_m2_month?.[i]) * pvPower * pvPr;
    const regulatedSelf = pvPower > 0
      ? Math.min(pvGeneration, regulatedElectricLoad)
      : 0;
    const householdSelf = pvPower > 0
      ? Math.min(Math.max(pvGeneration - regulatedSelf, 0), householdLoad)
      : 0;
    const totalSelf = regulatedSelf + householdSelf;

    pvRegulatedSelf += regulatedSelf;
    pvHouseholdSelf += householdSelf;
    pvSelf += totalSelf;
    householdGridImport += Math.max(householdLoad - householdSelf, 0);
    pvExport += Math.max(pvGeneration - totalSelf, 0);
  }
  add(branch.dhw_carrier, dhwFinal);

  const net = {...gross};
  if (pvPower > 0 && net.electricity) {
    net.electricity = Math.max(num(net.electricity) - pvRegulatedSelf, 0);
  }
  return {
    gross,
    net,
    pvSelf,
    pvRegulatedSelf,
    pvHouseholdSelf,
    pvExport,
    householdGridImport,
    heatingFinal,
    coolingFinal,
    dhwFinal
  };
}

function annualBill(branch, carriers, economics = null) {
  let total = 0;
  for (const [carrier, valueRaw] of Object.entries(carriers)) {
    const value = num(valueRaw);
    if (value <= EPS) continue;
    const price = branch.prices?.[carrier];
    const ref = price?.reference;
    if (!ref) return null;
    total += value * num(ref.unit_price_lei_per_kwh);
    if (ref.delivery_cost_group && num(ref.energy_kwh_per_package) > 0) {
      const packages = value / num(ref.energy_kwh_per_package);
      const batchSize = Math.max(1, Math.trunc(num(ref.delivery_batch_size_packages, 1)));
      total += Math.ceil(packages / batchSize) * num(ref.delivery_cost_lei_per_batch);
    }
  }

  const householdGridImport = Math.max(num(economics?.householdGridImport), 0);
  if (householdGridImport > EPS) {
    const electricityRef = branch.prices?.electricity?.reference;
    if (!electricityRef) return null;
    total += householdGridImport * num(electricityRef.unit_price_lei_per_kwh);
  }
  const exportCreditRate = Math.max(num(economics?.exportCreditLeiPerKwh), 0);
  const exported = Math.max(num(economics?.pvExport), 0);
  total -= exported * exportCreditRate;
  return Math.max(total, 0);
}

function primaryAndCo2(kernel, carriers) {
  let primary = 0;
  let co2 = 0;
  for (const [carrier, value] of Object.entries(carriers)) {
    const factors = kernel.carrier_factors?.[carrier];
    if (!factors) return null;
    primary += num(value) * num(factors.primary_energy_factor);
    co2 += num(value) * num(factors.co2_kg_per_kwh_final);
  }
  return {
    primarySpecific: primary / Math.max(num(kernel.area_m2), EPS),
    co2Total: co2,
    co2Specific: co2 / Math.max(num(kernel.area_m2), EPS),
  };
}

function energyClass(kernel, primarySpecific) {
  const labels = ["A+", "A", "B", "C", "D", "E", "F"];
  const thresholds = kernel.energy_class_thresholds || [];
  for (let i=0;i<labels.length;i++) {
    if (primarySpecific <= num(thresholds[i], -Infinity)) return labels[i];
  }
  return "G";
}

function designLoad(kernel, trans, air) {
  const winter = Number(kernel.winter_design_temperature_c);
  if (!Number.isFinite(winter)) return null;
  const indoor = num(kernel.indoor_temperature_c);
  const annualOutdoor = num(kernel.annual_outdoor_temperature_c);
  const deltaOutdoor = Math.max(indoor - winter, 0);
  const deltaGround = Math.max(indoor - annualOutdoor, 0);
  return (
    (trans.Hd + trans.Hu + trans.Ha) * deltaOutdoor / 1000 +
    trans.Hg * deltaGround / 1000 +
    air.total * deltaOutdoor / 1000
  );
}

function evaluate(kernel, branch, measures, baselineBill, id) {
  const trans = transmission(kernel, measures);
  if (!trans) return null;
  const air = airflow(kernel, measures);
  const balance = monthlyBalance(kernel, measures, trans, air, branch);
  const load = designLoad(kernel, trans, air);
  if (load == null) return null;

  const intervention = interventionCapex(kernel, measures);
  if (intervention == null) return null;
  const generator = heatingCapex(branch, load);
  if (generator == null) return null;
  const capex = intervention + generator;

  const energy = renewableAndCarriers(kernel, measures, branch, balance);
  const bill = annualBill(branch, energy.net, {
    householdGridImport:energy.householdGridImport,
    pvExport:energy.pvExport,
    exportCreditLeiPerKwh:num(kernel.renewables?.pv_export_credit_lei_per_kwh)
  });
  if (bill == null || !Number.isFinite(bill)) return null;
  const indicators = primaryAndCo2(kernel, energy.net);
  if (!indicators) return null;

  const saving = baselineBill - bill;
  const payback = capex > EPS && saving > EPS ? capex / saving : null;
  const roi = capex > EPS ? 100 * saving / capex : null;
  const finalEnergy = Object.values(energy.net).reduce((a,b) => a + num(b), 0);

  return {
    branchId:branch.branch_id,
    candidate:{
      schema_version:"1.0",
      candidate_id:id,
      parameters:measures,
      capex_lei:round(capex, 2),
      baseline_annual_bill_lei:round(baselineBill, 2),
      annual_bill_lei:round(bill, 2),
      annual_saving_lei:round(saving, 2),
      payback_years:payback == null ? null : round(payback, 4),
      roi_percent_per_year:roi == null ? null : round(roi, 4),
      final_energy_kwh:round(finalEnergy, 3),
      design_heat_load_kw:round(load, 4),
      primary_specific_kwh_m2:round(indicators.primarySpecific, 3),
      co2_total_kg:round(indicators.co2Total, 3),
      co2_specific_kg_m2:round(indicators.co2Specific, 3),
      energy_class:energyClass(kernel, indicators.primarySpecific),
      cost_catalog_version:kernel.cost_catalog?.catalog_version || null,
      cost_source:"teo_v4_browser_surrogate",
      commercialization_status:capex > EPS ? "pending_product_catalog" : "raw_only"
    }
  };
}

function addTop(set, rows, sorter, count) {
  rows.slice().sort(sorter).slice(0, count).forEach(row => set.set(row.candidate.candidate_id, row));
}

function paretoRows(rows) {
  const EPS_PARETO = 1e-9;
  const sorted = rows.slice().sort((a,b) =>
    num(a.candidate.capex_lei) - num(b.candidate.capex_lei) ||
    num(a.candidate.annual_bill_lei) - num(b.candidate.annual_bill_lei) ||
    String(a.candidate.candidate_id || "").localeCompare(String(b.candidate.candidate_id || ""))
  );
  const frontier = [];
  let bestBillFromLowerCapex = Infinity;
  let index = 0;

  while (index < sorted.length) {
    const groupCapex = num(sorted[index].candidate.capex_lei, Infinity);
    let end = index + 1;
    while (
      end < sorted.length
      && Math.abs(num(sorted[end].candidate.capex_lei, Infinity) - groupCapex) <= EPS_PARETO
    ) {
      end += 1;
    }

    const group = sorted.slice(index, end);
    const groupBestBill = Math.min(
      ...group.map(row => num(row.candidate.annual_bill_lei, Infinity))
    );
    for (const row of group) {
      const bill = num(row.candidate.annual_bill_lei, Infinity);
      const dominatedWithinSameCapex = bill > groupBestBill + EPS_PARETO;
      const dominatedByLowerCapex = bestBillFromLowerCapex <= bill + EPS_PARETO;
      if (!dominatedWithinSameCapex && !dominatedByLowerCapex) {
        frontier.push(row);
      }
    }
    bestBillFromLowerCapex = Math.min(bestBillFromLowerCapex, groupBestBill);
    index = end;
  }

  return frontier;
}

function evenlySample(rows, limit) {
  if (rows.length <= limit) return rows;
  const out = [];
  for (let i=0;i<limit;i++) {
    const index = Math.round(i * (rows.length - 1) / Math.max(limit - 1, 1));
    out.push(rows[index]);
  }
  return out;
}

function shortlist(rows, mode, goals) {
  const selected = new Map();
  const frontier = paretoRows(rows);
  evenlySample(frontier, 256).forEach(row => selected.set(row.candidate.candidate_id, row));

  addTop(selected, rows, (a,b) => num(a.candidate.annual_bill_lei) - num(b.candidate.annual_bill_lei), 40);
  addTop(selected, rows, (a,b) => num(b.candidate.annual_saving_lei) - num(a.candidate.annual_saving_lei), 40);
  addTop(selected, rows.filter(r => r.candidate.annual_saving_lei > 0), (a,b) =>
    num(a.candidate.payback_years, Infinity) - num(b.candidate.payback_years, Infinity), 40);

  for (const years of AUTO_HORIZONS) {
    addTop(selected, rows, (a,b) => {
      const na = num(a.candidate.annual_saving_lei) * years - num(a.candidate.capex_lei);
      const nb = num(b.candidate.annual_saving_lei) * years - num(b.candidate.capex_lei);
      return nb - na;
    }, 24);
  }

  if (mode === "auto_economic") {
    const regretPool = frontier.length ? frontier : rows;
    const regretMetrics = robustRegretMetricsRows(regretPool);
    addTop(selected, regretPool, (a,b) => {
      const am = regretMetrics.get(String(a.candidate.candidate_id));
      const bm = regretMetrics.get(String(b.candidate.candidate_id));
      return (
        num(am?.worstRelative, Infinity) - num(bm?.worstRelative, Infinity)
        || num(am?.meanRelative, Infinity) - num(bm?.meanRelative, Infinity)
        || num(bm?.net20, -Infinity) - num(am?.net20, -Infinity)
        || num(a.candidate.capex_lei) - num(b.candidate.capex_lei)
      );
    }, 64);
  }

  const branchIds = [...new Set(rows.map(row => row.branchId))];
  for (const branchId of branchIds) {
    const branchRows = rows.filter(row => row.branchId === branchId);
    addTop(selected, branchRows, (a,b) => num(a.candidate.annual_bill_lei) - num(b.candidate.annual_bill_lei), 20);
    addTop(selected, branchRows, (a,b) => num(a.candidate.capex_lei) - num(b.candidate.capex_lei), 12);
  }

  if (mode === "investment_budget") {
    const budget = num(goals.investment_budget_lei, Infinity);
    addTop(selected, rows.filter(r => num(r.candidate.capex_lei) <= budget + 0.01),
      (a,b) => num(a.candidate.annual_bill_lei) - num(b.candidate.annual_bill_lei), 64);
  } else if (mode === "annual_bill_target") {
    const target = num(goals.annual_bill_target_lei, -Infinity);
    addTop(selected, rows.filter(r => num(r.candidate.annual_bill_lei) <= target + 0.01),
      (a,b) => num(a.candidate.capex_lei) - num(b.candidate.capex_lei), 64);
  } else if (mode === "max_payback_years") {
    const limit = num(goals.max_payback_years, -Infinity);
    addTop(selected, rows.filter(r => r.candidate.payback_years != null && num(r.candidate.payback_years) <= limit + 1e-6),
      (a,b) => num(b.candidate.annual_saving_lei) - num(a.candidate.annual_saving_lei), 64);
  }

  let output = [...selected.values()];
  if (output.length > 512) {
    const mustKeep = evenlySample(frontier, 256);
    const keep = new Map(mustKeep.map(row => [row.candidate.candidate_id, row]));
    output.forEach(row => {
      if (keep.size < 512) keep.set(row.candidate.candidate_id, row);
    });
    output = [...keep.values()];
  }
  return {rows:output, frontierCount:frontier.length};
}


function verificationPlanRows(rows, mode, goals, minCount = 4, maxCount = 8) {
  const uniqueRows = [...new Map(
    (rows || [])
      .filter(row => row?.candidate?.candidate_id)
      .map(row => [String(row.candidate.candidate_id), row])
  ).values()];
  if (!uniqueRows.length) {
    return {rows:[], frontierCount:0, requestedCount:0};
  }

  const frontier = paretoRows(uniqueRows);
  let ranked = [];

  if (mode === "investment_budget") {
    const budget = num(goals?.investment_budget_lei, 0);
    const feasible = uniqueRows.filter(
      row => num(row.candidate.capex_lei) <= budget + 1e-6
    );
    ranked = (feasible.length ? feasible : uniqueRows).slice().sort((a,b) =>
      num(b.candidate.annual_saving_lei) - num(a.candidate.annual_saving_lei)
      || num(a.candidate.capex_lei) - num(b.candidate.capex_lei)
      || num(a.candidate.annual_bill_lei) - num(b.candidate.annual_bill_lei)
    );
  } else if (mode === "annual_bill_target") {
    const target = num(goals?.annual_bill_target_lei, 0);
    const feasible = uniqueRows.filter(
      row => num(row.candidate.annual_bill_lei) <= target + 1e-6
    );
    ranked = (feasible.length ? feasible : uniqueRows).slice().sort((a,b) =>
      num(a.candidate.capex_lei) - num(b.candidate.capex_lei)
      || num(a.candidate.annual_bill_lei) - num(b.candidate.annual_bill_lei)
      || num(b.candidate.annual_saving_lei) - num(a.candidate.annual_saving_lei)
    );
  } else if (mode === "max_payback_years") {
    const limit = num(goals?.max_payback_years, 0);
    const feasible = uniqueRows.filter(row =>
      row.candidate.payback_years != null
      && num(row.candidate.payback_years) <= limit + 1e-6
      && num(row.candidate.annual_saving_lei) > 0
    );
    ranked = (feasible.length ? feasible : uniqueRows).slice().sort((a,b) =>
      num(b.candidate.annual_saving_lei) - num(a.candidate.annual_saving_lei)
      || num(a.candidate.capex_lei) - num(b.candidate.capex_lei)
      || num(a.candidate.payback_years, Infinity) - num(b.candidate.payback_years, Infinity)
    );
  } else {
    const pool = frontier.length ? frontier : uniqueRows;
    const metrics = robustRegretMetricsRows(pool);
    ranked = pool.slice().sort((a,b) => {
      const am = metrics.get(String(a.candidate.candidate_id));
      const bm = metrics.get(String(b.candidate.candidate_id));
      const anet20 = num(a.candidate.annual_saving_lei) * 20 - num(a.candidate.capex_lei);
      const bnet20 = num(b.candidate.annual_saving_lei) * 20 - num(b.candidate.capex_lei);
      return (
        num(am?.worstRelative, Infinity) - num(bm?.worstRelative, Infinity)
        || num(am?.meanRelative, Infinity) - num(bm?.meanRelative, Infinity)
        || bnet20 - anet20
        || num(a.candidate.capex_lei) - num(b.candidate.capex_lei)
      );
    });
  }

  const requestedCount = Math.min(
    maxCount,
    Math.max(
      minCount,
      Math.min(maxCount, frontier.length + 2)
    )
  );
  const ordered = [...ranked, ...frontier];
  const selected = [];
  const seen = new Set();
  for (const row of ordered) {
    const id = String(row?.candidate?.candidate_id || "");
    if (!id || seen.has(id)) continue;
    seen.add(id);
    selected.push(row);
    if (selected.length >= requestedCount) break;
  }
  return {
    rows:selected,
    frontierCount:frontier.length,
    requestedCount:selected.length,
  };
}

function measureSignature(measures) {
  return SEARCH_DIMENSIONS
    .map(([key]) => round(num(measures?.[key]), 7))
    .concat([round(num(measures?.window_target_u_w_m2k, 0.9), 7)])
    .join("|");
}

function normalizedFromMeasures(measures, bounds) {
  return SEARCH_DIMENSIONS.map(([key, boundKey]) => {
    const upper = Math.max(num(bounds?.[boundKey]), EPS);
    return clamp(num(measures?.[key]) / upper, 0, 1);
  });
}

function measuresFromNormalized(vector, bounds, template = {}) {
  const out = {...template};
  SEARCH_DIMENSIONS.forEach(([key, boundKey], index) => {
    out[key] = clamp(num(vector[index]), 0, 1) * Math.max(num(bounds?.[boundKey]), 0);
  });
  if (out.window_target_u_w_m2k == null) {
    out.window_target_u_w_m2k = num(bounds?.window_target_u_w_m2k, 0.9);
  }
  return out;
}

function radicalInverse(index, base) {
  if (index <= 0) return 0;
  const inverse = 1 / base;
  let factor = inverse;
  let value = 0;
  let current = Math.floor(index);
  while (current > 0) {
    const digit = current % base;
    current = Math.floor(current / base);
    value += digit * factor;
    factor *= inverse;
  }
  return value;
}

function buildSearchPoints(bounds, spec = {}) {
  const dimensions = Math.max(
    1,
    Math.min(Number(spec.dimensions || SEARCH_DIMENSIONS.length), SEARCH_DIMENSIONS.length)
  );
  const axisLevels = Array.isArray(spec.axisLevels) && spec.axisLevels.length
    ? spec.axisLevels.map(value => clamp(num(value), 0, 1))
    : [0.5, 1.0];
  const haltonBases = Array.isArray(spec.haltonBases) && spec.haltonBases.length >= dimensions
    ? spec.haltonBases.slice(0, dimensions).map(value => Math.max(2, Math.floor(num(value, 2))))
    : [2, 3, 5, 7, 11, 13, 17].slice(0, dimensions);
  const haltonSamples = Math.max(0, Math.floor(num(spec.haltonSamples, 0)));
  const haltonStartIndex = Math.max(1, Math.floor(num(spec.haltonStartIndex, 1)));
  const rows = [];
  const seen = new Set();
  const add = measures => {
    const signature = measureSignature(measures);
    if (seen.has(signature)) return false;
    seen.add(signature);
    rows.push(measures);
    return true;
  };

  let deterministicAxisPoints = 0;
  if (spec.includeOrigin !== false) {
    if (add(measuresFromNormalized(new Array(dimensions).fill(0), bounds))) {
      deterministicAxisPoints += 1;
    }
  }
  for (let dimension = 0; dimension < dimensions; dimension++) {
    for (const level of axisLevels) {
      const vector = new Array(dimensions).fill(0);
      vector[dimension] = level;
      if (add(measuresFromNormalized(vector, bounds))) {
        deterministicAxisPoints += 1;
      }
    }
  }

  let lowDiscrepancyPoints = 0;
  for (let offset = 0; offset < haltonSamples; offset++) {
    const index = haltonStartIndex + offset;
    const vector = haltonBases.map(base => radicalInverse(index, base));
    if (add(measuresFromNormalized(vector, bounds))) {
      lowDiscrepancyPoints += 1;
    }
  }

  let maxCornerPoints = 0;
  if (spec.includeMaxCorner !== false) {
    if (add(measuresFromNormalized(new Array(dimensions).fill(1), bounds))) {
      maxCornerPoints = 1;
    }
  }

  return {
    points:rows,
    deterministicAxisPoints,
    lowDiscrepancyPoints,
    maxCornerPoints,
  };
}

function robustRegretMetricsRows(rows) {
  const unique = [...new Map(
    (rows || []).map(row => [String(row?.candidate?.candidate_id || ""), row])
  ).values()].filter(row => row?.candidate);
  const net = new Map();
  for (const row of unique) {
    const candidate = row.candidate;
    const id = String(candidate.candidate_id);
    const saving = num(candidate.annual_saving_lei);
    const capex = num(candidate.capex_lei);
    const byHorizon = {};
    for (const horizon of AUTO_HORIZONS) {
      byHorizon[horizon] = saving * horizon - capex;
    }
    net.set(id, byHorizon);
  }

  const best = {};
  for (const horizon of AUTO_HORIZONS) {
    best[horizon] = unique.length
      ? Math.max(...unique.map(row => num(net.get(String(row.candidate.candidate_id))?.[horizon], -Infinity)))
      : 0;
  }

  const metrics = new Map();
  for (const row of unique) {
    const id = String(row.candidate.candidate_id);
    const relatives = [];
    for (const horizon of AUTO_HORIZONS) {
      const value = num(net.get(id)?.[horizon]);
      const regret = num(best[horizon]) - value;
      relatives.push(regret / Math.max(Math.abs(num(best[horizon])), 1));
    }
    metrics.set(id, {
      worstRelative:relatives.length ? Math.max(...relatives) : Infinity,
      meanRelative:relatives.length
        ? relatives.reduce((sum, value) => sum + value, 0) / relatives.length
        : Infinity,
      net20:num(net.get(id)?.[20]),
    });
  }
  return metrics;
}

function objectiveSeedSorter(mode, goals) {
  return (left, right) => {
    const a = left.candidate;
    const b = right.candidate;
    if (mode === "investment_budget") {
      const budget = num(goals?.investment_budget_lei, Infinity);
      const ap = num(a.capex_lei) > budget + 0.01 ? 1 : 0;
      const bp = num(b.capex_lei) > budget + 0.01 ? 1 : 0;
      return ap - bp
        || num(b.annual_saving_lei) - num(a.annual_saving_lei)
        || num(a.capex_lei) - num(b.capex_lei);
    }
    if (mode === "annual_bill_target") {
      const target = num(goals?.annual_bill_target_lei, -Infinity);
      const ap = num(a.annual_bill_lei) > target + 0.01 ? 1 : 0;
      const bp = num(b.annual_bill_lei) > target + 0.01 ? 1 : 0;
      return ap - bp
        || num(a.capex_lei) - num(b.capex_lei)
        || num(a.annual_bill_lei) - num(b.annual_bill_lei);
    }
    if (mode === "max_payback_years") {
      const limit = num(goals?.max_payback_years, -Infinity);
      const ap = a.payback_years == null || num(a.payback_years) > limit + 1e-6 ? 1 : 0;
      const bp = b.payback_years == null || num(b.payback_years) > limit + 1e-6 ? 1 : 0;
      return ap - bp
        || num(b.annual_saving_lei) - num(a.annual_saving_lei)
        || num(a.capex_lei) - num(b.capex_lei);
    }
    const aNet = AUTO_HORIZONS.reduce(
      (sum, years) => sum + num(a.annual_saving_lei) * years - num(a.capex_lei),
      0
    );
    const bNet = AUTO_HORIZONS.reduce(
      (sum, years) => sum + num(b.annual_saving_lei) * years - num(b.capex_lei),
      0
    );
    return bNet - aNet || num(a.capex_lei) - num(b.capex_lei);
  };
}

function hasSearchBounds(bounds) {
  return Boolean(
    bounds
    && SEARCH_DIMENSIONS.every(([, boundKey]) => num(bounds?.[boundKey]) > 0)
  );
}

function refinementSeeds(rows, mode, goals, count) {
  const chosen = new Map();
  const frontier = paretoRows(rows);
  evenlySample(frontier, Math.min(4, count)).forEach(row => {
    chosen.set(row.candidate.candidate_id, row);
  });

  let ranked = rows.slice();
  if (mode === "auto_economic") {
    const pool = frontier.length ? frontier : rows;
    const metrics = robustRegretMetricsRows(pool);
    ranked = pool.slice().sort((left, right) => {
      const lm = metrics.get(String(left.candidate.candidate_id));
      const rm = metrics.get(String(right.candidate.candidate_id));
      return (
        num(lm?.worstRelative, Infinity) - num(rm?.worstRelative, Infinity)
        || num(lm?.meanRelative, Infinity) - num(rm?.meanRelative, Infinity)
        || num(rm?.net20, -Infinity) - num(lm?.net20, -Infinity)
        || num(left.candidate.capex_lei) - num(right.candidate.capex_lei)
      );
    });
  } else {
    ranked.sort(objectiveSeedSorter(mode, goals));
  }

  ranked.slice(0, count).forEach(row => {
    chosen.set(row.candidate.candidate_id, row);
  });
  return [...chosen.values()].slice(0, count);
}

function refineBranch({
  kernel,
  branch,
  rows,
  bounds,
  mode,
  goals,
  seen,
  roundIndex,
  baselineBill,
}) {
  const cfg = LOCAL_REFINEMENT_ROUNDS[roundIndex];
  if (!cfg || !hasSearchBounds(bounds) || !rows.length) return {rows:[], attempts:0};
  const seeds = refinementSeeds(rows, mode, goals, cfg.seedCount);
  const generated = [];
  let ordinal = 0;
  let attempts = 0;

  const tryVector = (vector, template, label) => {
    const measures = measuresFromNormalized(vector, bounds, template);
    const signature = measureSignature(measures);
    if (seen.has(signature)) return;
    seen.add(signature);
    attempts += 1;
    const row = evaluate(
      kernel,
      branch,
      measures,
      baselineBill,
      `V4R-${roundIndex + 1}-${branch.branch_id}-${label}-${++ordinal}`
    );
    if (row) generated.push(row);
  };

  for (const seed of seeds) {
    const origin = normalizedFromMeasures(seed.candidate.parameters || {}, bounds);
    for (const step of cfg.steps) {
      for (let dim=0; dim<SEARCH_DIMENSIONS.length; dim++) {
        for (const direction of [-1, 1]) {
          const vector = origin.slice();
          vector[dim] = clamp(vector[dim] + direction * step, 0, 1);
          tryVector(vector, seed.candidate.parameters || {}, `d${dim}`);
        }
      }
    }
  }

  if (cfg.pairwiseStep) {
    for (const seed of seeds.slice(0, 3)) {
      const origin = normalizedFromMeasures(seed.candidate.parameters || {}, bounds);
      for (let left=0; left<SEARCH_DIMENSIONS.length; left++) {
        for (let right=left + 1; right<SEARCH_DIMENSIONS.length; right++) {
          for (const leftDirection of [-1, 1]) {
            for (const rightDirection of [-1, 1]) {
              const vector = origin.slice();
              vector[left] = clamp(vector[left] + leftDirection * cfg.pairwiseStep, 0, 1);
              vector[right] = clamp(vector[right] + rightDirection * cfg.pairwiseStep, 0, 1);
              tryVector(vector, seed.candidate.parameters || {}, `p${left}-${right}`);
            }
          }
        }
      }
    }
  }
  return {rows:generated, attempts};
}

self.onmessage = event => {
  const data = event.data || {};
  if (data.type !== "run") return;
  const started = performance.now();
  try {
    const kernel = data.kernel || {};
    const suppliedSearchPoints = Array.isArray(data.searchPoints) ? data.searchPoints : [];
    const branchIds = Array.isArray(data.branchIds) ? data.branchIds : [];
    const searchBounds = data.searchBounds || {};
    const generatedSearch = suppliedSearchPoints.length
      ? {
          points:suppliedSearchPoints,
          deterministicAxisPoints:num(data.deterministicAxisPoints),
          lowDiscrepancyPoints:num(data.lowDiscrepancyPoints),
          maxCornerPoints:0,
        }
      : buildSearchPoints(searchBounds, data.searchSpec || {});
    const searchPoints = generatedSearch.points;
    if (!searchPoints.length) {
      throw new Error("TEO V4 nu are puncte de căutare locale.");
    }
    const baselineBill = num(data.baselineAnnualBillLei);
    const branches = new Map((kernel.branches || []).map(branch => [branch.branch_id, branch]));
    const allRows = [];
    const branchStats = [];
    let total = 0;
    let globalEvaluations = 0;
    let refinementEvaluations = 0;
    const expectedGlobal = searchPoints.length * branchIds.length;

    for (let b=0;b<branchIds.length;b++) {
      const branchId = branchIds[b];
      const branch = branches.get(branchId);
      if (!branch) continue;

      const branchRows = [];
      const seen = new Set(searchPoints.map(measureSignature));
      let accepted = 0;

      for (let i=0;i<searchPoints.length;i++) {
        const row = evaluate(
          kernel,
          branch,
          searchPoints[i],
          baselineBill,
          `V4-G-${b + 1}-${i + 1}`
        );
        total += 1;
        globalEvaluations += 1;
        if (row) {
          allRows.push(row);
          branchRows.push(row);
          accepted += 1;
        }
        if (globalEvaluations % 250 === 0 || globalEvaluations === expectedGlobal) {
          self.postMessage({
            type:"progress",
            phase:"global",
            completed:globalEvaluations,
            total:expectedGlobal,
            branchId,
            branchIndex:b + 1,
            branchCount:branchIds.length,
            accepted:allRows.length,
          });
        }
      }

      let branchRefinementEvaluations = 0;
      for (let roundIndex=0; roundIndex<LOCAL_REFINEMENT_ROUNDS.length; roundIndex++) {
        const refined = refineBranch({
          kernel,
          branch,
          rows:branchRows,
          bounds:searchBounds,
          mode:data.mode || "auto_economic",
          goals:data.goals || {},
          seen,
          roundIndex,
          baselineBill,
        });
        branchRefinementEvaluations += refined.attempts;
        refinementEvaluations += refined.attempts;
        total += refined.attempts;
        refined.rows.forEach(row => {
          allRows.push(row);
          branchRows.push(row);
          accepted += 1;
        });
        self.postMessage({
          type:"progress",
          phase:"refine",
          completed:roundIndex + 1,
          total:LOCAL_REFINEMENT_ROUNDS.length,
          branchId,
          branchIndex:b + 1,
          branchCount:branchIds.length,
          accepted:allRows.length,
          refinementEvaluations,
        });
      }

      branchStats.push({
        branchId,
        evaluatedCandidates:searchPoints.length + branchRefinementEvaluations,
        globalEvaluations:searchPoints.length,
        refinementEvaluations:branchRefinementEvaluations,
        acceptedCandidates:accepted,
        feasibleCandidates:accepted,
      });
    }

    const reduced = shortlist(allRows, data.mode || "auto_economic", data.goals || {});
    const verificationPlan = verificationPlanRows(
      reduced.rows,
      data.mode || "auto_economic",
      data.goals || {},
      4,
      8
    );
    self.postMessage({
      type:"done",
      candidateRows:reduced.rows,
      verificationRows:verificationPlan.rows,
      verificationCount:verificationPlan.requestedCount,
      verificationStrategy:"browser_rank_plus_pareto_v4",
      sourceCandidateCount:allRows.length,
      frontierCount:verificationPlan.frontierCount,
      branchStats,
      fastEvaluations:total,
      globalEvaluations,
      refinementEvaluations,
      refinementRounds:LOCAL_REFINEMENT_ROUNDS.length,
      calculationTimeMs:round(performance.now() - started, 1),
      searchMethod:"teo_v4_halton_plus_local_refinement",
      searchGeneration:suppliedSearchPoints.length ? "supplied" : "browser",
      searchPointCount:searchPoints.length,
      deterministicAxisPoints:generatedSearch.deterministicAxisPoints,
      lowDiscrepancyPoints:generatedSearch.lowDiscrepancyPoints,
      maxCornerPoints:generatedSearch.maxCornerPoints,
    });
  } catch (error) {
    self.postMessage({
      type:"error",
      message:String(error?.stack || error?.message || error),
    });
  }
};
