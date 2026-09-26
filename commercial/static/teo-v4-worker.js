/* TEO V4 browser-search worker.
 *
 * Deep parametric exploration runs off the Cloudflare Python isolate. Python
 * remains authoritative: only a bounded, diverse shortlist is sent back for
 * canonical verification and commercial product matching.
 */
"use strict";

const EPS = 1e-9;
const AUTO_HORIZONS = [5, 10, 15, 20, 25];

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
    rows.push({usefulHeating, usefulCooling, dhwUseful:num(month.dhw_useful_kwh)});
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

    let electricLoad = 0;
    if (auxiliary > 0) {
      electricLoad += annualHeating > 0
        ? auxiliary * row.usefulHeating / annualHeating
        : auxiliary / Math.max(balance.rows.length, 1);
    }
    if (branch.heating_carrier === "electricity") {
      electricLoad += row.usefulHeating * num(branch.heating_final_per_useful);
    }
    electricLoad += row.usefulCooling * num(branch.cooling_final_per_useful);
    if (branch.dhw_carrier === "electricity") electricLoad += monthDhwFinal;

    const pvGeneration =
      num(renew.pv_hsol_kwh_m2_month?.[i]) * pvPower * pvPr;
    pvSelf += Math.min(pvGeneration, electricLoad);
  }
  add(branch.dhw_carrier, dhwFinal);

  const net = {...gross};
  if (pvPower > 0 && net.electricity) {
    net.electricity = Math.max(num(net.electricity) - pvSelf, 0);
  }
  return {gross, net, pvSelf, heatingFinal, coolingFinal, dhwFinal};
}

function annualBill(branch, carriers) {
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
  return total;
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
  const bill = annualBill(branch, energy.net);
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
  const sorted = rows.slice().sort((a,b) =>
    num(a.candidate.capex_lei) - num(b.candidate.capex_lei) ||
    num(a.candidate.annual_bill_lei) - num(b.candidate.annual_bill_lei)
  );
  const frontier = [];
  let bestBill = Infinity;
  for (const row of sorted) {
    const bill = num(row.candidate.annual_bill_lei, Infinity);
    if (bill < bestBill - 0.01) {
      frontier.push(row);
      bestBill = bill;
    }
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

self.onmessage = event => {
  const data = event.data || {};
  if (data.type !== "run") return;
  const started = performance.now();
  try {
    const kernel = data.kernel || {};
    const searchPoints = Array.isArray(data.searchPoints) ? data.searchPoints : [];
    const branchIds = Array.isArray(data.branchIds) ? data.branchIds : [];
    const baselineBill = num(data.baselineAnnualBillLei);
    const branches = new Map((kernel.branches || []).map(branch => [branch.branch_id, branch]));
    const allRows = [];
    const branchStats = [];
    let total = 0;
    const expected = searchPoints.length * branchIds.length;

    for (let b=0;b<branchIds.length;b++) {
      const branchId = branchIds[b];
      const branch = branches.get(branchId);
      if (!branch) continue;
      let accepted = 0;
      for (let i=0;i<searchPoints.length;i++) {
        const row = evaluate(
          kernel,
          branch,
          searchPoints[i],
          baselineBill,
          `V4-${b + 1}-${i + 1}`
        );
        total += 1;
        if (row) {
          allRows.push(row);
          accepted += 1;
        }
        if (total % 250 === 0 || total === expected) {
          self.postMessage({
            type:"progress",
            completed:total,
            total:expected,
            branchId,
            branchIndex:b + 1,
            branchCount:branchIds.length,
            accepted:allRows.length,
          });
        }
      }
      branchStats.push({
        branchId,
        evaluatedCandidates:searchPoints.length,
        acceptedCandidates:accepted,
        feasibleCandidates:accepted,
      });
    }

    const reduced = shortlist(allRows, data.mode || "auto_economic", data.goals || {});
    self.postMessage({
      type:"done",
      candidateRows:reduced.rows,
      sourceCandidateCount:allRows.length,
      frontierCount:reduced.frontierCount,
      branchStats,
      fastEvaluations:total,
      calculationTimeMs:round(performance.now() - started, 1),
      searchMethod:"teo_v4_browser_worker_mc001_kernel",
    });
  } catch (error) {
    self.postMessage({
      type:"error",
      message:String(error?.stack || error?.message || error),
    });
  }
};
