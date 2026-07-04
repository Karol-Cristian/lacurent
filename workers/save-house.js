import { ENERGY_ASSESSMENT_DISCLAIMER, buildEnergyProfile, demoOldHouseInput } from "./energy-model.js";
import { inferFinalEnergyCarrierFromHeatingInput, resolveMc001Carrier } from "../src/features/energy/physics/calculators/carrierMapping.mjs";
import { classifyEstimatedEnergyClass as classifyEstimatedEnergyClassFromRegistry } from "../src/features/energy/physics/calculators/estimatedEnergyClass.mjs";
import { getCo2Factor, getPrimaryEnergyFactor } from "../src/features/energy/physics/calculators/referenceValues.mjs";
import { calculateMc001HtrTotal } from "../src/physics-engine/mc001HtrTotalCalculation.mjs";
import {
  calculateMc001DirectTransmissionCoefficient,
  calculateMc001GlobalTransmissionExcludingGround,
  calculateMc001LinearThermalBridgePsi,
  calculateMc001ThermalBridgeGlobalCoefficient,
  calculateMc001TransmissionEnergyFromHeatFlow,
  calculateMc001TransmissionHeatFlow,
  calculateMc001TransmissionTotalCoefficient
} from "../src/physics-engine/mc001TransmissionFormulaCalculations.mjs";

const SESSION_DAYS = 30;
const RESET_MINUTES = 30;
const PASSWORD_ITERATIONS = 100000;
const ENERGY_CLASS_DISCLAIMER =
  "Estimare energetică generată automat. Nu reprezintă certificat energetic oficial.";

function value(body, key) {
  return body[key] === undefined || body[key] === "" ? null : body[key];
}

function numberValue(body, key) {
  const raw = value(body, key);
  if (raw === null) return null;
  const parsed = Number(raw);
  return Number.isFinite(parsed) ? parsed : null;
}

function boolValue(body, key) {
  const raw = value(body, key);
  if (raw === null) return null;
  return raw === "Da" ? 1 : 0;
}

function jsonResponse(data, init = {}) {
  return new Response(JSON.stringify(data), {
    ...init,
    headers: {
      ...init.headers,
      "Content-Type": "application/json"
    }
  });
}

function displayNameForHouse(body, houseId) {
  return value(body, "display_name") ||
    value(body, "home_name") ||
    value(body, "house_name") ||
    value(body, "site_name") ||
    `${value(body, "city") || "Locuință"} #${houseId || ""}`.trim();
}

function savingsHistory(profile, implementedRows = []) {
  const implementedById = new Map(implementedRows.map(row => [row.recommendation_id, row]));
  return (profile.recommendations || [])
    .filter(item => implementedById.has(item.id))
    .map(item => ({
      recommendation_id: item.id,
      title: item.title,
      estimatedSavingsRonYearMin: item.estimatedSavingsRonYearMin,
      estimatedSavingsRonYearMax: item.estimatedSavingsRonYearMax,
      implemented_at: implementedById.get(item.id)?.implemented_at
    }));
}

function billTotal(row) {
  return [
    "electricity_cost_ron",
    "gas_cost_ron",
    "wood_cost_ron",
    "pellets_cost_ron",
    "other_cost_ron"
  ].reduce((sum, key) => sum + (Number(row[key]) || 0), 0);
}

function monthNumber(value) {
  const month = Number(String(value || "").slice(5, 7));
  return Number.isFinite(month) ? month : 0;
}

function stdev(values) {
  if (values.length < 2) return 0;
  const average = values.reduce((sum, item) => sum + item, 0) / values.length;
  const variance = values.reduce((sum, item) => sum + ((item - average) ** 2), 0) / values.length;
  return Math.sqrt(variance);
}

function analyzeBillingHistory(rows = [], profile = null, baseScore = null) {
  const sorted = [...rows].sort((a, b) => String(a.billing_month).localeCompare(String(b.billing_month)));
  const actualRows = sorted.filter(row => {
    const readingType = row.reading_type || "actual";
    return readingType === "actual" && Number(row.is_regularization || 0) !== 1;
  });
  const averageActual = actualRows.length
    ? actualRows.reduce((sum, row) => sum + billTotal(row), 0) / actualRows.length
    : 0;

  const monthly = sorted.map(row => {
    const rawTotal = billTotal(row);
    const readingType = row.reading_type || "actual";
    const isRegularization = Number(row.is_regularization || 0) === 1;
    const normalizedTotal = readingType === "actual" && !isRegularization
      ? rawTotal
      : averageActual || rawTotal;
    return {
      ...row,
      total_cost_ron: Math.round(rawTotal),
      normalized_cost_ron: Math.round(normalizedTotal),
      reading_type: readingType,
      is_regularization: isRegularization ? 1 : 0
    };
  });

  const totals = monthly.reduce((acc, row) => {
    acc.electricity += Number(row.electricity_cost_ron) || 0;
    acc.gas += Number(row.gas_cost_ron) || 0;
    acc.wood += Number(row.wood_cost_ron) || 0;
    acc.pellets += Number(row.pellets_cost_ron) || 0;
    acc.other += Number(row.other_cost_ron) || 0;
    acc.total += row.total_cost_ron || 0;
    acc.normalized += row.normalized_cost_ron || 0;
    return acc;
  }, { electricity: 0, gas: 0, wood: 0, pellets: 0, other: 0, total: 0, normalized: 0 });

  const normalizedValues = monthly.map(row => row.normalized_cost_ron).filter(value => value > 0);
  const normalizedAverage = normalizedValues.length
    ? normalizedValues.reduce((sum, value) => sum + value, 0) / normalizedValues.length
    : 0;
  const volatility = normalizedAverage ? stdev(normalizedValues) / normalizedAverage : 0;
  const regularizedMonths = monthly.filter(row => row.is_regularization || row.reading_type !== "actual").length;
  const winter = monthly.filter(row => [11, 12, 1, 2, 3].includes(monthNumber(row.billing_month)));
  const summer = monthly.filter(row => [6, 7, 8, 9].includes(monthNumber(row.billing_month)));
  const winterAverage = winter.length ? winter.reduce((sum, row) => sum + row.normalized_cost_ron, 0) / winter.length : 0;
  const summerAverage = summer.length ? summer.reduce((sum, row) => sum + row.normalized_cost_ron, 0) / summer.length : 0;
  const dominantCarrier = Object.entries({
    electricity: totals.electricity,
    gas: totals.gas,
    wood: totals.wood,
    pellets: totals.pellets,
    other: totals.other
  }).sort((a, b) => b[1] - a[1])[0] || ["unknown", 0];

  const modelMonthly = profile?.assessment?.estimatedAnnualCostRon
    ? profile.assessment.estimatedAnnualCostRon / 12
    : 0;
  let scoreDelta = 0;
  const conclusions = [];
  if (monthly.length >= 10) {
    scoreDelta += 2;
    conclusions.push("Ai introdus aproape un an de facturi, deci estimarea devine mai credibila.");
  } else if (monthly.length >= 4) {
    scoreDelta += 1;
    conclusions.push("Exista cateva luni de facturi, dar un an complet ar clarifica sezonalitatea.");
  } else if (monthly.length > 0) {
    conclusions.push("Istoricul este inca scurt; scorul foloseste prudent facturile introduse.");
  }
  if (modelMonthly && normalizedAverage > modelMonthly * 1.25) {
    scoreDelta -= 3;
    conclusions.push("Costul lunar normalizat este peste estimarea modelului, posibil din cauza consumului real mai ridicat sau a preturilor energiei.");
  } else if (modelMonthly && normalizedAverage < modelMonthly * 0.85 && monthly.length >= 4) {
    scoreDelta += 1;
    conclusions.push("Facturile normalizate sunt sub estimarea modelului; poate fi eficienta mai buna sau utilizare mai redusa.");
  }
  if (regularizedMonths) {
    scoreDelta -= 1;
    conclusions.push("Unele luni sunt estimari sau regularizari, deci le tratam ca semnal mai slab in curba normalizata.");
  }
  if (volatility > 0.45) {
    conclusions.push("Curba are variatii mari; merita separat consumul real de regularizari si facturi estimate.");
  }
  if (winterAverage && summerAverage && winterAverage > summerAverage * 1.35) {
    conclusions.push("Iarna costurile cresc vizibil, semn ca incalzirea domina consumul anual.");
  }
  if (dominantCarrier[1] > 0) {
    const labels = { electricity: "curent", gas: "gaz", wood: "lemn", pellets: "peleti", other: "alte surse" };
    conclusions.push(`Cea mai mare parte a banilor merge catre ${labels[dominantCarrier[0]]}.`);
  }

  const adjustedScore = baseScore === null || baseScore === undefined
    ? null
    : clampScore(baseScore + scoreDelta);

  return {
    months_count: monthly.length,
    complete_year: monthly.length >= 12,
    total_cost_ron: Math.round(totals.total),
    normalized_monthly_average_ron: Math.round(normalizedAverage),
    regularized_months: regularizedMonths,
    volatility: Number(volatility.toFixed(2)),
    dominant_carrier: dominantCarrier[0],
    score_delta: scoreDelta,
    adjusted_score: adjustedScore,
    conclusions,
    monthly
  };
}

function buildMoneyWallet(profile, benchmark, implementedRows = []) {
  const recommendations = profile.recommendations || [];
  const implementedIds = new Set(implementedRows.map(row => row.recommendation_id));
  const implementedSavings = recommendations
    .filter(item => implementedIds.has(item.id))
    .reduce((sum, item) => sum + (Number(item.estimatedSavingsRonYearMin) || 0), 0);
  const potentialMin = profile.assessment.estimatedAnnualSavingsMinRon || 0;
  const potentialMax = profile.assessment.estimatedAnnualSavingsMaxRon || 0;
  const remainingMin = Math.max(0, potentialMin - implementedSavings);
  const remainingMax = Math.max(0, potentialMax - implementedSavings);
  const lostMonth = remainingMin / 12;
  const percentile = benchmark?.percentile ? clampScore(benchmark.percentile) : null;
  return {
    implementedSavingsRonYear: Math.round(implementedSavings),
    potentialSavingsMinRon: Math.round(remainingMin),
    potentialSavingsMaxRon: Math.round(remainingMax),
    lostMoneyRonMonth: Math.round(lostMonth),
    lostMoneyRonFiveYears: Math.round(remainingMin * 5),
    benchmarkPercentile: percentile,
    message: remainingMin
      ? `Daca amani recomandarile prioritare, modelul estimeaza ca pierzi cel putin ${Math.round(lostMonth).toLocaleString("ro-RO")} lei/luna.`
      : implementedSavings
        ? "Ai marcat recomandarile prioritare ca implementate. Urmatorul pas este validarea cu facturi reale."
        : "Completeaza mai multe date sau facturi pentru a estima banii pierduti lunar."
  };
}

function offersByRecommendation(rows = []) {
  return rows.reduce((acc, row) => {
    const id = row.recommendation_id;
    if (!acc[id]) {
      acc[id] = {
        recommendation_id: id,
        offers_count: 0,
        lowest_offer_ron: null,
        contact_requested_count: 0
      };
    }
    acc[id].offers_count += 1;
    if (row.status === "contact_requested") acc[id].contact_requested_count += 1;
    const amount = Number(row.offer_amount_ron);
    if (Number.isFinite(amount) && amount > 0) {
      acc[id].lowest_offer_ron = acc[id].lowest_offer_ron === null
        ? amount
        : Math.min(acc[id].lowest_offer_ron, amount);
    }
    return acc;
  }, {});
}

function physicsValue(value, unit, assumptions = [], confidence = "medium", source = "internal_estimate") {
  return { value, unit, source, confidence, assumptions };
}

function physicalNumber(raw, fallback) {
  const parsed = Number(raw);
  return Number.isFinite(parsed) && parsed > 0 ? parsed : fallback;
}

function physicalClimate(rawInput = {}) {
  const location = normalizeEmail(`${rawInput.county || ""} ${rawInput.city || ""}`);
  const isCluj = location.includes("cluj") || location.includes("salicea");
  return {
    climateZone: isCluj ? "transilvania_deal" : "romania_default",
    heatingDegreeDays: physicsValue(isCluj ? 3400 : 3200, "Kday", ["Valoare climatica aproximativa pentru physics v0.1."], isCluj ? "medium" : "low", "estimated"),
    coolingDegreeDays: physicsValue(isCluj ? 140 : 180, "Kday", ["Valoare climatica aproximativa pentru physics v0.1."], "low", "estimated")
  };
}

function materialLambda(materialId) {
  return {
    solid_brick: 0.72,
    efficient_brick: 0.32,
    bca: 0.18,
    concrete: 1.7,
    plaster: 0.7,
    eps: 0.04,
    xps: 0.035,
    mineral_wool: 0.039,
    wood: 0.18,
    soil_equivalent: 1.5
  }[materialId] || 0.7;
}

function layerR(materialId, thicknessM) {
  const lambda = materialLambda(materialId);
  return thicknessM / lambda;
}

function elementU(layers, declaredU = null, correctionFactor = 1) {
  if (declaredU) return declaredU * correctionFactor;
  const rTotal = 0.13 + 0.04 + layers.reduce((sum, item) => sum + layerR(item.materialId, item.thicknessM), 0);
  return rTotal > 0 ? (1 / rTotal) * correctionFactor : 0;
}

function mapPhysicalWallMaterial(value) {
  const normalized = normalizeEmail(value);
  if (normalized.includes("bca")) return "bca";
  if (normalized.includes("beton")) return "concrete";
  if (normalized.includes("eficient")) return "efficient_brick";
  return "solid_brick";
}

function parsePhysicalInsulationM(value, fallbackM = 0) {
  const parsed = Number(String(value || "").replace(",", ".").match(/\d+(\.\d+)?/)?.[0]);
  if (!Number.isFinite(parsed)) return fallbackM;
  return parsed > 1 ? parsed / 100 : parsed;
}

function physicalHeatingSystem(rawInput = {}) {
  const heating = normalizeEmail(rawInput.heating || rawInput.heating_source || "");
  if (heating.includes("gaz")) {
    return { fuel: "natural_gas", efficiency: 0.86, carrier: "natural_gas", label: "gaz natural" };
  }
  if (heating.includes("pelet")) {
    return { fuel: "pellets", efficiency: 0.78, carrier: "pellets", label: "peleti" };
  }
  if (heating.includes("pompa")) {
    return { fuel: "heat_pump", efficiency: 2.3, carrier: "electricity", label: "pompa de caldura" };
  }
  if (heating.includes("electric")) {
    return { fuel: "electricity", efficiency: 0.98, carrier: "electricity", label: "electricitate" };
  }
  return { fuel: "wood", efficiency: 0.55, carrier: "wood", label: "lemn/sobe" };
}

const SYSTEM_V04_PRESETS = {
  wood_stove: { carrier: "wood", emission: 0.92, distribution: 1, storage: 1, generation: 0.55, control: 0.92, auxiliary: 0 },
  gas_boiler_non_condensing: { carrier: "natural_gas", emission: 0.94, distribution: 0.9, storage: 1, generation: 0.82, control: 0.96, auxiliary: 120 },
  gas_boiler_condensing: { carrier: "natural_gas", emission: 0.94, distribution: 0.94, storage: 1, generation: 0.92, control: 0.96, auxiliary: 120 },
  pellet_boiler: { carrier: "pellets", emission: 0.94, distribution: 0.94, storage: 0.96, generation: 0.84, control: 0.96, auxiliary: 180 },
  electric_direct: { carrier: "electricity", emission: 0.92, distribution: 1, storage: 1, generation: 0.98, control: 0.92, auxiliary: 0 },
  air_water_heat_pump_radiators: { carrier: "electricity", emission: 0.94, distribution: 0.94, storage: 1, generation: 2.3, control: 0.96, auxiliary: 220 },
  air_water_heat_pump_underfloor: { carrier: "electricity", emission: 0.97, distribution: 0.96, storage: 1, generation: 3.2, control: 0.98, auxiliary: 220 },
  air_air_heat_pump: { carrier: "electricity", emission: 0.95, distribution: 1, storage: 1, generation: 3, control: 0.96, auxiliary: 30 },
  district_heating: { carrier: "district_heating", emission: 0.94, distribution: 0.88, storage: 1, generation: 0.98, control: 0.97, auxiliary: 120 }
};

const ENERGY_PRICE_RON_KWH = {
  electricity: 1.3,
  natural_gas: 0.35,
  wood: 0.25,
  pellets: 0.55,
  district_heating: 0.45,
  lpg: 0.6,
  coal: 0.32,
  unknown: 0.45
};

function inferredBuildingEnergyClassType(rawInput = {}) {
  const type = normalizeEmail(rawInput.building_type || rawInput.buildingType || rawInput.house_type || rawInput.houseType || "");
  if (type.includes("apart") || type.includes("bloc") || type.includes("collective")) return "residential_collective";
  if (type.includes("casa") || type.includes("casă") || type.includes("house") || type.includes("villa") || type.includes("vila") || type.includes("duplex")) {
    return "residential_individual";
  }
  return null;
}

function calculationTrace({
  value,
  unit,
  formulaId,
  formulaText,
  inputs,
  steps,
  assumptions = [],
  warnings = [],
  confidence = "medium",
  source,
  sourceType
}) {
  return { value, unit, formulaId, formulaText, inputs, steps, assumptions, warnings, confidence, source, sourceType };
}

function buildPrimaryEnergyAndCo2V05(systemsLayerV04, area = 65) {
  const byCarrier = systemsLayerV04?.finalEnergyByCarrier || {};
  const primaryEnergyByCarrier = {};
  const co2ByCarrierKgYear = {};
  const co2FactorDetailsByCarrier = {};
  const warnings = [];
  const calculationTraces = [];
  let renewable = 0;
  let nonRenewable = 0;
  let totalPrimary = 0;
  let totalCo2 = 0;
  for (const [carrier, data] of Object.entries(byCarrier)) {
    const finalKwh = Number(byCarrier[carrier]?.value || 0);
    if (finalKwh <= 0) {
      primaryEnergyByCarrier[carrier] = {
        renewableKwh: 0,
        nonRenewableKwh: 0,
        totalKwh: 0,
        mappedPrimaryCarrier: null,
        factorSource: null,
        warnings: []
      };
      co2ByCarrierKgYear[carrier] = 0;
      co2FactorDetailsByCarrier[carrier] = {
        mappedCo2Carrier: null,
        factorSource: null,
        warnings: []
      };
      continue;
    }
    const carrierMapping = resolveMc001Carrier(carrier);
    calculationTraces.push(carrierMapping.trace);
    warnings.push(...carrierMapping.warnings);
    const primaryLookup = carrierMapping.primaryEnergyCarrier
      ? getPrimaryEnergyFactor(carrierMapping.primaryEnergyCarrier)
      : { value: null, warnings: ["MISSING_PRIMARY_ENERGY_CARRIER"], assumptions: [], trace: null };
    const co2Lookup = carrierMapping.co2Carrier
      ? getCo2Factor(carrierMapping.co2Carrier)
      : { value: null, warnings: ["MISSING_CO2_CARRIER"], assumptions: [], trace: null };
    if (finalKwh > 0) {
      if (primaryLookup.trace) calculationTraces.push(primaryLookup.trace);
      if (co2Lookup.trace) calculationTraces.push(co2Lookup.trace);
      warnings.push(...primaryLookup.warnings.map(item => `${item}:${carrier}`));
      warnings.push(...co2Lookup.warnings.map(item => `${item}:${carrier}`));
    }
    const primaryFactor = primaryLookup.value;
    const co2Factor = co2Lookup.value;
    const renewableKwh = primaryFactor ? finalKwh * primaryFactor.renewable : 0;
    const nonRenewableKwh = primaryFactor ? finalKwh * primaryFactor.nonRenewable : 0;
    const totalKwh = primaryFactor ? finalKwh * primaryFactor.total : 0;
    const co2Kg = co2Factor ? finalKwh * co2Factor.kgCO2PerKwh : 0;
    calculationTraces.push(calculationTrace({
      value: Math.round(totalKwh),
      unit: "kWh/an",
      formulaId: "PRIMARY_ENERGY_BY_CARRIER",
      formulaText: "primaryEnergy = finalEnergy x primaryEnergyFactor",
      inputs: {
        finalEnergyKwhYear: finalKwh,
        finalEnergyCarrier: carrier,
        primaryEnergyCarrier: carrierMapping.primaryEnergyCarrier,
        primaryEnergyFactor: primaryFactor?.total ?? null
      },
      steps: primaryFactor
        ? [`${finalKwh} x ${primaryFactor.total} = ${totalKwh}`]
        : [`Primary energy not calculated for ${carrier}; missing factor.`],
      assumptions: primaryLookup.assumptions,
      warnings: primaryLookup.warnings,
      confidence: primaryFactor ? "medium" : "low",
      source: primaryFactor?.source || "primaryEnergyFactors.registry",
      sourceType: primaryFactor ? "mc001" : "registry_default"
    }));
    calculationTraces.push(calculationTrace({
      value: Math.round(co2Kg),
      unit: "kgCO2/an",
      formulaId: "CO2_BY_CARRIER",
      formulaText: "co2 = finalEnergy x co2Factor",
      inputs: {
        finalEnergyKwhYear: finalKwh,
        finalEnergyCarrier: carrier,
        co2Carrier: carrierMapping.co2Carrier,
        co2FactorKgPerKwh: co2Factor?.kgCO2PerKwh ?? null
      },
      steps: co2Factor
        ? [`${finalKwh} x ${co2Factor.kgCO2PerKwh} = ${co2Kg}`]
        : [`CO2 not calculated for ${carrier}; missing factor.`],
      assumptions: co2Lookup.assumptions,
      warnings: co2Lookup.warnings,
      confidence: co2Factor ? "medium" : "low",
      source: co2Factor?.source || "co2Factors.registry",
      sourceType: co2Factor ? "mc001" : "registry_default"
    }));
    primaryEnergyByCarrier[carrier] = {
      renewableKwh: Math.round(renewableKwh),
      nonRenewableKwh: Math.round(nonRenewableKwh),
      totalKwh: Math.round(totalKwh),
      mappedPrimaryCarrier: carrierMapping.primaryEnergyCarrier,
      factorSource: primaryFactor?.source,
      warnings: primaryLookup.warnings
    };
    co2ByCarrierKgYear[carrier] = Math.round(co2Kg);
    co2FactorDetailsByCarrier[carrier] = {
      mappedCo2Carrier: carrierMapping.co2Carrier,
      factorSource: co2Factor?.source,
      warnings: co2Lookup.warnings
    };
    renewable += renewableKwh;
    nonRenewable += nonRenewableKwh;
    totalPrimary += totalKwh;
    totalCo2 += co2Kg;
  }
  return {
    version: "Physics Layer v0.5 Primary Energy + CO2",
    primaryEnergyByCarrier,
    totalPrimaryEnergyKwhYear: Math.round(totalPrimary),
    totalPrimaryEnergyKwhM2Year: Number((totalPrimary / Math.max(1, area)).toFixed(1)),
    renewablePrimaryEnergyKwhYear: Math.round(renewable),
    nonRenewablePrimaryEnergyKwhYear: Math.round(nonRenewable),
    renewableEnergyRatioPercent: totalPrimary > 0 ? Math.round(renewable / totalPrimary * 100) : 0,
    co2ByCarrierKgYear,
    co2FactorDetailsByCarrier,
    totalCo2KgYear: Math.round(totalCo2),
    totalCo2KgM2Year: Number((totalCo2 / Math.max(1, area)).toFixed(1)),
    assumptions: [
      "v0.5 transforma energia finala in energie primara si CO2.",
      "Factorii vin din registries MC001-like introduse manual si necesita verificare oficiala.",
      "Nu se foloseste fallback numeric daca lipseste un carrier/factor."
    ],
    warnings: [...new Set(warnings)],
    calculationTraces,
    confidence: warnings.length ? "low" : "medium"
  };
}

function buildClassificationV06(primaryAndCo2, systemsLayerV04, rawInput = {}) {
  const primaryWarnings = primaryAndCo2?.warnings || [];
  const primaryEnergyIncomplete = primaryWarnings.some(item =>
    String(item).includes("MISSING_PRIMARY_ENERGY_FACTOR")
    || String(item).includes("MISSING_PRIMARY_ENERGY_CARRIER")
    || String(item).includes("UNMAPPED_FINAL_ENERGY_CARRIER")
  );
  const primaryM2 = primaryEnergyIncomplete ? null : Number(primaryAndCo2?.totalPrimaryEnergyKwhM2Year || 0);
  const finalM2 = Number(systemsLayerV04?.totalFinalEnergyKwhM2Year?.value || 0);
  const co2M2 = Number(primaryAndCo2?.totalCo2KgM2Year || 0);
  const buildingEnergyClassType = inferredBuildingEnergyClassType(rawInput);
  const energyClassResult = classifyEstimatedEnergyClassFromRegistry(primaryM2, buildingEnergyClassType);
  const missingReasons = [
    ...primaryWarnings,
    ...energyClassResult.warnings,
    "TODO_CO2_ENVIRONMENTAL_CLASS_REGISTRY_MISSING",
    "PRIMARY_ENERGY_FACTORS_REQUIRE_OFFICIAL_VALIDATION"
  ];
  return {
    version: "Physics Layer v0.6 Classification + Reference Building",
    estimatedEnergyClass: energyClassResult.estimatedClass,
    estimatedEnvironmentalClass: "unknown",
    classCalculationStatus: energyClassResult.status === "classified" ? "calculated_from_estimated_threshold_registry" : energyClassResult.status,
    missingReasons,
    buildingEnergyClassType,
    estimatedEnergyClassSource: energyClassResult.thresholdSetUsed?.source,
    thresholdSetUsed: energyClassResult.thresholdSetUsed,
    calculationTrace: energyClassResult.trace,
    primaryEnergyKwhM2Year: primaryM2,
    finalEnergyKwhM2Year: finalM2,
    co2KgM2Year: co2M2,
    comparedToReference: null,
    assumptions: [
      ...energyClassResult.assumptions,
      "Clasa de mediu CO2 nu este calculata inca; lipseste registry separat de praguri.",
      "Metricile fizice raman disponibile: energie finala, energie primara si CO2 estimat.",
      "Nu se folosesc clase derivate din scor.",
      "Clasele sunt estimari LaCurent, nu certificat energetic oficial."
    ],
    confidence: energyClassResult.confidence
  };
}

function selectedSystemPresetV04(rawInput = {}) {
  const source = normalizeEmail(rawInput.heating_source || rawInput.heating);
  const type = normalizeEmail(rawInput.heating_system_type || rawInput.systemType);
  const distribution = normalizeEmail(rawInput.heating_distribution);
  if (source.includes("pelet") || type.includes("pellet")) return "pellet_boiler";
  if (source.includes("gaz") || source.includes("gas") || type.includes("boiler") || type.includes("centrala")) {
    return type.includes("condens") ? "gas_boiler_condensing" : "gas_boiler_non_condensing";
  }
  if (source.includes("pump") || source.includes("pompa") || type.includes("heat_pump")) {
    if (type.includes("air_air") || type.includes("aer-aer")) return "air_air_heat_pump";
    return distribution.includes("underfloor") || distribution.includes("pardoseala")
      ? "air_water_heat_pump_underfloor"
      : "air_water_heat_pump_radiators";
  }
  if (source.includes("electric") || type.includes("electric")) return "electric_direct";
  if (source.includes("district") || source.includes("termo")) return "district_heating";
  return "wood_stove";
}

function booleanInput(value) {
  const normalized = normalizeEmail(value);
  return normalized === "yes" || normalized === "da" || normalized === "true" || normalized === "1" || normalized === "on";
}

function selectedDhwPresetV04(rawInput = {}, heatingPresetId = "wood_stove") {
  const source = normalizeEmail(rawInput.dhw_source || rawInput.dhwSource || rawInput.domestic_hot_water_source || rawInput.hot_water_source);
  const warnings = [];
  if (booleanInput(rawInput.dhw_source_electric) || source.includes("electric") || source.includes("boiler electric")) {
    return { presetId: "electric_direct", source: "electric_boiler", warnings };
  }
  if (booleanInput(rawInput.dhw_source_gas) || source.includes("gaz") || source.includes("gas")) {
    return { presetId: "gas_boiler_condensing", source: "gas_boiler", warnings };
  }
  if (booleanInput(rawInput.dhw_source_heat_pump) || source.includes("pompa") || source.includes("heat_pump")) {
    warnings.push("DHW_HEAT_PUMP_MODELED_WITH_EXISTING_HEAT_PUMP_PRESET");
    return { presetId: "air_water_heat_pump_radiators", source: "heat_pump", warnings };
  }
  if (booleanInput(rawInput.dhw_source_solar) || source.includes("solar")) {
    warnings.push("DHW_SOLAR_THERMAL_NOT_MODELED_SEPARATELY_USING_HEATING_BACKUP");
    return { presetId: heatingPresetId, source: "solar_thermal_with_backup", warnings };
  }
  if (booleanInput(rawInput.dhw_source_heating) || source.includes("same_as_heating") || source.includes("incalz")) {
    return { presetId: heatingPresetId, source: "same_as_heating", warnings };
  }
  return { presetId: heatingPresetId, source: "same_as_heating", warnings: ["DHW_SOURCE_MISSING_USING_HEATING_SYSTEM"] };
}

function buildSystemsLayerV04(rawInput = {}, demand = {}, context = {}) {
  const area = context.area || 65;
  const heatingDemand = Number(demand.heatingDemandKwhYear) || 0;
  const coolingDemand = Number(demand.coolingDemandKwhYear) || 0;
  const occupants = physicalNumber(rawInput.occupants || rawInput.people_count, Math.max(1, Math.round(area / 32)));
  const dhwDemand = physicalNumber(rawInput.dhw_demand_kwh_year, occupants * 850);
  const presetId = selectedSystemPresetV04(rawInput);
  const preset = SYSTEM_V04_PRESETS[presetId] || SYSTEM_V04_PRESETS.wood_stove;
  const carrierInference = inferFinalEnergyCarrierFromHeatingInput({
    heatingSource: rawInput.heating_source || rawInput.heating,
    systemType: rawInput.heating_system_type || rawInput.systemType,
    generatorType: rawInput.generator_type
  });
  const carrierWarnings = [...carrierInference.warnings];
  if (carrierInference.finalEnergyCarrier && carrierInference.finalEnergyCarrier !== preset.carrier) {
    carrierWarnings.push("CARRIER_MAPPING_PRESET_MISMATCH");
  }
  const totalEfficiency = preset.emission * preset.distribution * preset.storage * preset.generation * preset.control;
  const heatingFinal = heatingDemand / Math.max(0.1, totalEfficiency);
  const dhwSelection = selectedDhwPresetV04(rawInput, presetId);
  const dhwPreset = SYSTEM_V04_PRESETS[dhwSelection.presetId] || preset;
  carrierWarnings.push(...dhwSelection.warnings);
  const dhwEfficiency = dhwPreset.emission * dhwPreset.distribution * (rawInput.dhw_storage_l ? 0.9 : dhwPreset.storage) * dhwPreset.generation * dhwPreset.control;
  const dhwFinal = dhwDemand / Math.max(0.1, dhwEfficiency);
  const seer = physicalNumber(rawInput.cooling_seer || rawInput.cooling_eer, 3.1);
  const coolingFinal = coolingDemand / Math.max(0.5, seer);
  const auxiliary = preset.auxiliary + (coolingFinal > 0 ? 30 : 0);
  const byCarrier = {
    electricity: 0,
    natural_gas: 0,
    wood: 0,
    pellets: 0,
    district_heating: 0,
    lpg: 0,
    coal: 0,
    unknown: 0
  };
  byCarrier[preset.carrier] = (byCarrier[preset.carrier] || 0) + heatingFinal;
  byCarrier[dhwPreset.carrier] = (byCarrier[dhwPreset.carrier] || 0) + dhwFinal;
  byCarrier.electricity += coolingFinal + auxiliary;
  const byUse = { heating: heatingFinal, cooling: coolingFinal, dhw: dhwFinal, auxiliary };
  const carrierByUse = { heating: preset.carrier, cooling: "electricity", dhw: dhwPreset.carrier, auxiliary: "electricity" };
  const total = Object.values(byUse).reduce((sum, value) => sum + value, 0);
  const mapValue = (value, assumptions) => physicsValue(Math.round(value), "kWh/an", assumptions, "low");
  return {
    version: "Physics Layer v0.4 Systems",
    heatingSystemPreset: presetId,
    dhwSystemPreset: dhwSelection.presetId,
    dhwSource: dhwSelection.source,
    finalEnergyByCarrier: Object.fromEntries(Object.entries(byCarrier).map(([key, value]) => [key, mapValue(value, [`Energie finala pe carrier: ${key}.`])])),
    finalEnergyByUse: Object.fromEntries(Object.entries(byUse).map(([key, value]) => [key, mapValue(value, [`Energie finala pe utilizare: ${key}.`])])),
    finalEnergyCarrierByUse: carrierByUse,
    systemLosses: [
      {
        use: "heating",
        usefulDemandKwhYear: physicsValue(Math.round(heatingDemand), "kWh/an", ["Necesar util incalzire din Energy Demand v0.3."], "medium"),
        finalEnergyKwhYear: mapValue(heatingFinal, ["finalEnergy = usefulDemand / totalSystemEfficiency."]),
        lossesKwhYear: mapValue(Math.max(0, heatingFinal - heatingDemand), ["Pierderi incalzire = energie finala - necesar util."]),
        totalSystemEfficiency: physicsValue(Number(totalEfficiency.toFixed(3)), "-", ["emission x distribution x storage x generation x control."], "low")
      },
      {
        use: "dhw",
        usefulDemandKwhYear: physicsValue(Math.round(dhwDemand), "kWh/an", ["Necesar ACM din ocupanti sau fallback pe suprafata."], "low"),
        finalEnergyKwhYear: mapValue(dhwFinal, ["ACM final = necesar ACM / eficienta sistem ACM."]),
        lossesKwhYear: mapValue(Math.max(0, dhwFinal - dhwDemand), ["Pierderi ACM = energie finala - necesar util."]),
        totalSystemEfficiency: physicsValue(Number(dhwEfficiency.toFixed(3)), "-", ["Eficienta ACM cu stocare optionala."], "low")
      }
    ],
    auxiliaryEnergy: {
      heatingKwhYear: mapValue(preset.auxiliary, ["Auxiliar incalzire: pompe, ventilatoare, automatizari."]),
      coolingKwhYear: mapValue(coolingFinal > 0 ? 30 : 0, ["Auxiliar racire estimativ."]),
      dhwKwhYear: mapValue(0, ["Auxiliar ACM inclus doar daca exista preset dedicat."]),
      totalKwhYear: mapValue(auxiliary, ["Suma energie auxiliara."])
    },
    totalFinalEnergyKwhYear: mapValue(total, ["Total final = incalzire + racire + ACM + auxiliar."]),
    totalFinalEnergyKwhM2Year: physicsValue(Number((total / Math.max(1, area)).toFixed(1)), "kWh/m2/an", ["Energie finala specifica v0.4."], "low"),
    assumptions: [
      "v0.4 transforma Energy Demand in Final Energy Consumption.",
      "Nu calculeaza energie primara, CO2 sau clase energetice.",
      "Valorile sunt internal_estimate si trebuie calibrate ulterior cu date reale."
    ],
    warnings: carrierWarnings,
    calculationTraces: [carrierInference.trace],
    confidence: "low"
  };
}

function hoursInMonth(month) {
  return [744, 672, 744, 720, 744, 720, 744, 744, 720, 744, 720, 744][Math.max(0, Math.min(11, month - 1))] || 730;
}

function monthlyClimateV03(rawInput = {}) {
  const city = normalizeEmail(rawInput.city || rawInput.locality || rawInput.cityOrVillage);
  const county = normalizeEmail(rawInput.county || rawInput.judet);
  const isCluj = city.includes("salicea") || city.includes("cluj") || county.includes("cluj");
  const temperatures = isCluj
    ? [-2.2, 0.1, 5.1, 10.4, 15.2, 18.7, 20.6, 20.1, 15.8, 10.2, 4.6, -0.4]
    : [-1.0, 1.0, 6.0, 11.0, 16.0, 20.0, 22.0, 21.5, 17.0, 11.0, 5.0, 0.5];
  const radiationSouth = isCluj
    ? [42, 57, 88, 111, 132, 142, 149, 134, 103, 72, 46, 36]
    : [45, 61, 94, 121, 146, 157, 165, 150, 116, 80, 50, 39];
  const factors = { north: 0.38, east: 0.68, west: 0.66, horizontal: 0.82 };
  return {
    climateZoneId: isCluj ? "RO-CJ-estimated" : "RO-default-estimated",
    locationName: isCluj ? "Cluj / Salicea" : "Romania default",
    source: "internal_estimate",
    confidence: isCluj ? "medium" : "low",
    months: temperatures.map((temperature, index) => {
      const month = index + 1;
      const heatingDegreeDays = Math.max(0, 20 - temperature) * (hoursInMonth(month) / 24);
      const coolingDegreeDays = Math.max(0, temperature - 26) * (hoursInMonth(month) / 24);
      return {
        month,
        averageOutdoorTemperatureC: temperature,
        heatingDegreeDays: Number(heatingDegreeDays.toFixed(1)),
        coolingDegreeDays: Number(coolingDegreeDays.toFixed(1)),
        solarRadiationKwhM2: {
          south: radiationSouth[index],
          north: Number((radiationSouth[index] * factors.north).toFixed(1)),
          east: Number((radiationSouth[index] * factors.east).toFixed(1)),
          west: Number((radiationSouth[index] * factors.west).toFixed(1)),
          horizontal: Number((radiationSouth[index] * factors.horizontal).toFixed(1))
        }
      };
    })
  };
}

function normalizedOrientation(rawInput = {}) {
  const value = normalizeEmail(rawInput.window_orientation || rawInput.main_orientation);
  if (["north", "south", "east", "west"].includes(value)) return value;
  if (value.includes("nord")) return "north";
  if (value.includes("sud")) return "south";
  if (value.includes("est")) return "east";
  if (value.includes("vest")) return "west";
  return "unknown";
}

function windowSolarPreset(rawInput = {}) {
  const type = normalizeEmail(rawInput.window_type || rawInput.windows);
  if (type.includes("trip")) return { gValue: 0.5, frameFactor: 0.78, shadingFactor: 0.9 };
  if (type.includes("modern")) return { gValue: 0.58, frameFactor: 0.8, shadingFactor: 0.9 };
  if (type.includes("simpl")) return { gValue: 0.75, frameFactor: 0.85, shadingFactor: 0.9 };
  return { gValue: 0.65, frameFactor: 0.8, shadingFactor: 0.9 };
}

function monthlyInternalGainsV03(rawInput = {}, area = 65) {
  const occupants = physicalNumber(rawInput.occupants || rawInput.people_count, Math.max(1, Math.round(area / 35)));
  const peopleGainW = 70;
  const hoursHomePerDay = normalizeEmail(rawInput.usage_type).includes("season") ? 8 : 14;
  const lightingPowerWm2 = physicalNumber(rawInput.lighting_power_wm2, 2.5);
  const appliancePowerWm2 = physicalNumber(rawInput.appliance_power_wm2, 3);
  return Array.from({ length: 12 }, (_, index) => {
    const month = index + 1;
    const days = hoursInMonth(month) / 24;
    const peopleGainsKwh = occupants * peopleGainW * hoursHomePerDay * days / 1000;
    const lightingGainsKwh = area * lightingPowerWm2 * 4 * days / 1000;
    const appliancesGainsKwh = area * appliancePowerWm2 * 8 * days / 1000;
    return {
      month,
      peopleGainsKwh: Number(peopleGainsKwh.toFixed(1)),
      lightingGainsKwh: Number(lightingGainsKwh.toFixed(1)),
      appliancesGainsKwh: Number(appliancesGainsKwh.toFixed(1)),
      totalInternalGainsKwh: Number((peopleGainsKwh + lightingGainsKwh + appliancesGainsKwh).toFixed(1)),
      assumptions: [
        "Aporturi interne v0.3: 70 W/persoana, iluminat 2.5 W/m2, aparate 3 W/m2.",
        "Valorile sunt internal_estimate si pot fi calibrate ulterior cu profiluri reale."
      ]
    };
  });
}

function monthlySolarGainsV03(rawInput = {}, climateYear, windowArea = 9.8) {
  const orientation = normalizedOrientation(rawInput);
  const preset = windowSolarPreset(rawInput);
  return climateYear.months.map(month => {
    const radiation = orientation === "unknown" || orientation === "mixed"
      ? ((month.solarRadiationKwhM2.south || 0) * 0.65)
      : (month.solarRadiationKwhM2[orientation] || month.solarRadiationKwhM2.south || 0);
    const gain = radiation * windowArea * preset.gValue * preset.frameFactor * preset.shadingFactor;
    return {
      month: month.month,
      gainsByElement: { windows: Number(gain.toFixed(1)) },
      totalSolarGainsKwh: Number(gain.toFixed(1)),
      assumptions: [
        `Aport solar v0.3 pentru ferestre cu orientare ${orientation}.`,
        `g=${preset.gValue}, frameFactor=${preset.frameFactor}, shadingFactor=${preset.shadingFactor}.`
      ]
    };
  });
}

function heatingGainUtilizationFactorV03(heatLossKwh, gainsKwh, thermalMassClass = "unknown") {
  const base = { light: 0.55, medium: 0.7, heavy: 0.82, unknown: 0.7 }[thermalMassClass] || 0.7;
  if (!gainsKwh || !heatLossKwh) return base;
  const ratio = gainsKwh / heatLossKwh;
  return Number(Math.max(0.15, Math.min(0.95, base - Math.max(0, ratio - 0.5) * 0.15)).toFixed(2));
}

function buildEnergyDemandV03(rawInput = {}, context = {}) {
  const area = context.area || 65;
  const hTransmission = context.hTransmission || 0;
  const hVentilation = context.hVentilation || 0;
  const hTotal = hTransmission + hVentilation;
  const heatingSetpointC = physicalNumber(rawInput.heating_setpoint_c || rawInput.temperature_day, 20);
  const coolingSetpointC = physicalNumber(rawInput.cooling_setpoint_c, 26);
  const thermalMassClass = normalizeEmail(rawInput.thermal_mass_class) || "unknown";
  const climateYear = monthlyClimateV03(rawInput);
  const internalGains = monthlyInternalGainsV03(rawInput, area);
  const solarGains = monthlySolarGainsV03(rawInput, climateYear, context.windowArea || area * 0.15);
  const monthly = climateYear.months.map(month => {
    const hours = hoursInMonth(month.month);
    const heatDelta = Math.max(0, heatingSetpointC - month.averageOutdoorTemperatureC);
    const coolDelta = Math.max(0, month.averageOutdoorTemperatureC - coolingSetpointC);
    const transmissionLossKwh = hTransmission * heatDelta * hours / 1000;
    const ventilationLossKwh = hVentilation * heatDelta * hours / 1000;
    const grossHeatLossKwh = transmissionLossKwh + ventilationLossKwh;
    const internal = internalGains[month.month - 1];
    const solar = solarGains[month.month - 1];
    const totalGainsKwh = internal.totalInternalGainsKwh + solar.totalSolarGainsKwh;
    const utilizationFactor = heatingGainUtilizationFactorV03(grossHeatLossKwh, totalGainsKwh, thermalMassClass);
    const usableGainsKwh = utilizationFactor * totalGainsKwh;
    const externalHeatLoadApprox = hTotal * coolDelta * hours / 1000;
    const coolingDemandKwh = Math.max(0, externalHeatLoadApprox + Math.max(0, totalGainsKwh - grossHeatLossKwh * 0.25) * (month.coolingDegreeDays > 0 ? 0.35 : 0.1));
    return {
      month: month.month,
      averageOutdoorTemperatureC: month.averageOutdoorTemperatureC,
      transmissionLossKwh: Number(transmissionLossKwh.toFixed(1)),
      ventilationLossKwh: Number(ventilationLossKwh.toFixed(1)),
      grossHeatLossKwh: Number(grossHeatLossKwh.toFixed(1)),
      internalGainsKwh: internal.totalInternalGainsKwh,
      solarGainsKwh: solar.totalSolarGainsKwh,
      totalGainsKwh: Number(totalGainsKwh.toFixed(1)),
      utilizationFactor,
      usableGainsKwh: Number(usableGainsKwh.toFixed(1)),
      heatingDemandKwh: Number(Math.max(0, grossHeatLossKwh - usableGainsKwh).toFixed(1)),
      coolingDemandKwh: Number(coolingDemandKwh.toFixed(1))
    };
  });
  const sum = key => monthly.reduce((total, item) => total + (Number(item[key]) || 0), 0);
  const annualHeating = sum("heatingDemandKwh");
  const annualCooling = sum("coolingDemandKwh");
  const totalTransmission = sum("transmissionLossKwh");
  const totalVentilation = sum("ventilationLossKwh");
  const totalSolar = sum("solarGainsKwh");
  const totalInternal = sum("internalGainsKwh");
  const coldestMonth = [...monthly].sort((a, b) => a.averageOutdoorTemperatureC - b.averageOutdoorTemperatureC)[0]?.month || 1;
  const highestHeatingDemandMonth = [...monthly].sort((a, b) => b.heatingDemandKwh - a.heatingDemandKwh)[0]?.month || 1;
  const highestCoolingDemandMonth = [...monthly].sort((a, b) => b.coolingDemandKwh - a.coolingDemandKwh)[0]?.month || undefined;
  const lossTotal = totalTransmission + totalVentilation || 1;
  const gainsTotal = totalSolar + totalInternal || 1;
  return {
    monthly,
    annual: {
      heatingDemandKwhYear: Math.round(annualHeating),
      heatingDemandKwhM2Year: Number((annualHeating / area).toFixed(1)),
      coolingDemandKwhYear: Math.round(annualCooling),
      coolingDemandKwhM2Year: Number((annualCooling / area).toFixed(1)),
      totalInternalGainsKwhYear: Math.round(totalInternal),
      totalSolarGainsKwhYear: Math.round(totalSolar),
      totalTransmissionLossKwhYear: Math.round(totalTransmission),
      totalVentilationLossKwhYear: Math.round(totalVentilation)
    },
    peakIndicators: { coldestMonth, highestHeatingDemandMonth, highestCoolingDemandMonth },
    diagnostics: {
      heatingLossBreakdown: {
        transmissionPercent: Math.round(totalTransmission / lossTotal * 100),
        ventilationPercent: Math.round(totalVentilation / lossTotal * 100)
      },
      gainsBreakdown: {
        solarPercent: Math.round(totalSolar / gainsTotal * 100),
        internalPercent: Math.round(totalInternal / gainsTotal * 100)
      },
      monthlyPattern: `Luna cu necesar maxim de incalzire este ${highestHeatingDemandMonth}.`,
      mainReasonForHighDemand: totalTransmission > totalVentilation
        ? "Cea mai mare parte a necesarului vine din pierderile prin transmisie ale anvelopei."
        : "Ventilatia are o contributie semnificativa la pierderi."
    },
    unit: "kWh",
    source: climateYear.source,
    assumptions: [
      "Energy Demand v0.3 separa necesarul util al cladirii de energia finala a sistemelor.",
      `Tin=${heatingSetpointC} C, Tcool=${coolingSetpointC} C, masa termica=${thermalMassClass || "unknown"}.`,
      "Qloss_month = H x (Tin - Tout_avg) x ore_luna / 1000.",
      "Heating demand = max(0, pierderi brute - aporturi utile)."
    ],
    confidence: climateYear.confidence
  };
}

function buildPhysicalEnergyResult(rawInput = {}) {
  const area = physicalNumber(rawInput.heated_area_m2 || rawInput.useful_area_m2, physicalNumber(rawInput.surface, 65));
  const floors = physicalNumber(rawInput.floors || rawInput.number_of_floors, 1);
  const height = physicalNumber(rawInput.ceiling_height || rawInput.floor_height_m, 2.5);
  const footprint = area / floors;
  const volume = area * height;
  const wallGross = Math.sqrt(footprint) * 4 * height * floors;
  const windowArea = physicalNumber(rawInput.window_area_m2, area * 0.15);
  const doorArea = 2.2;
  const wallArea = Math.max(0, wallGross - windowArea - doorArea);
  const climate = physicalClimate(rawInput);
  const wallInsulationM = parsePhysicalInsulationM(rawInput.wall_insulation, parsePhysicalInsulationM(rawInput.wall_insulation_thickness_cm, 0));
  const roofInsulationM = parsePhysicalInsulationM(rawInput.roof_insulation_thickness_cm || rawInput.attic_insulation, 0.06);
  const windowType = normalizeEmail(rawInput.windows || rawInput.window_type);
  const windowU = windowType.includes("trip") ? 0.8 : windowType.includes("modern") ? 1.3 : windowType.includes("simpl") ? 5 : 2.8;
  const wallU = elementU([
    { materialId: "plaster", thicknessM: 0.02 },
    { materialId: mapPhysicalWallMaterial(rawInput.wall_material), thicknessM: physicalNumber(rawInput.wall_thickness, 30) / 100 },
    ...(wallInsulationM ? [{ materialId: "eps", thicknessM: wallInsulationM }] : []),
    { materialId: "plaster", thicknessM: 0.02 }
  ]);
  const roofU = elementU([
    { materialId: "wood", thicknessM: 0.025 },
    { materialId: "mineral_wool", thicknessM: roofInsulationM }
  ], null, 0.85);
  const floorU = elementU([
    { materialId: "concrete", thicknessM: 0.12 },
    { materialId: "soil_equivalent", thicknessM: 1 }
  ], null, 0.75);
  const doorU = elementU([{ materialId: "wood", thicknessM: 0.05 }]);
  const elements = [
    { id: "external_walls", name: "Pereti exteriori", type: "external_wall", area: wallArea, u: wallU },
    { id: "attic_ceiling", name: "Planseu pod/acoperis", type: "ceiling_to_attic", area: footprint, u: roofU },
    { id: "floor_on_ground", name: "Pardoseala pe sol", type: "floor_on_ground", area: footprint, u: floorU },
    { id: "windows", name: "Ferestre", type: "window", area: windowArea, u: windowU },
    { id: "external_doors", name: "Usi exterioare", type: "external_door", area: doorArea, u: doorU }
  ];
  const envelopeResults = elements.map(element => ({
    elementId: element.id,
    name: element.name,
    type: element.type,
    areaM2: physicsValue(Number(element.area.toFixed(1)), "m2", ["Arie estimata de physics engine v0.1."], "low"),
    uValueWm2K: physicsValue(Number(element.u.toFixed(2)), "W/m2K", ["U calculat sau preset estimativ."], "low"),
    correctedUValueWm2K: physicsValue(Number(element.u.toFixed(2)), "W/m2K", ["U' v0.1 include corectii simplificate."], "low"),
    heatTransferCoefficientWK: physicsValue(Number((element.u * element.area).toFixed(1)), "W/K", ["H = U' x A."], "low")
  }));
  const hTransmission = envelopeResults.reduce((sum, element) => sum + element.heatTransferCoefficientWK.value, 0);
  const hBridge = Math.sqrt(footprint) * 4 * 0.25;
  const ach = physicalNumber(rawInput.ventilation_ach, normalizeEmail(rawInput.ventilation_type).includes("mechanical") ? 0.5 : 0.75);
  const airflow = physicalNumber(rawInput.airflow_m3h, ach * volume);
  const recoveryRaw = physicalNumber(rawInput.heat_recovery_efficiency, 0);
  const heatRecoveryEfficiency = Math.max(0, Math.min(0.95, recoveryRaw > 1 ? recoveryRaw / 100 : recoveryRaw));
  const hVentilation = 0.34 * airflow * (1 - heatRecoveryEfficiency);
  const energyDemand = buildEnergyDemandV03(rawInput, { area, hTransmission: hTransmission + hBridge, hVentilation, windowArea });
  const heatingDemand = energyDemand.annual.heatingDemandKwhYear;
  const dhwDemand = Math.max(1, Math.round(area / 32)) * 850;
  const heatingSystem = physicalHeatingSystem(rawInput);
  const systemsLayerV04 = buildSystemsLayerV04(rawInput, {
    heatingDemandKwhYear: heatingDemand,
    coolingDemandKwhYear: energyDemand.annual.coolingDemandKwhYear
  }, { area });
  const primaryEnergyAndCo2V05 = buildPrimaryEnergyAndCo2V05(systemsLayerV04, area);
  const classificationV06 = buildClassificationV06(primaryEnergyAndCo2V05, systemsLayerV04, rawInput);
  const finalEnergy = systemsLayerV04.totalFinalEnergyKwhYear.value || (heatingDemand / heatingSystem.efficiency + dhwDemand / Math.max(0.1, heatingSystem.efficiency));
  const primaryEnergy = primaryEnergyAndCo2V05.totalPrimaryEnergyKwhYear || 0;
  const co2 = primaryEnergyAndCo2V05.totalCo2KgYear || 0;
  const weakestEnvelopeElements = [...envelopeResults]
    .sort((a, b) => b.heatTransferCoefficientWK.value - a.heatTransferCoefficientWK.value)
    .slice(0, 3)
    .map(element => ({
      elementId: element.elementId,
      name: element.name,
      type: element.type,
      uValueWm2K: element.correctedUValueWm2K.value,
      heatTransferCoefficientWK: element.heatTransferCoefficientWK.value,
      reason: "Element cu contributie mare la pierderile prin transmisie."
    }));
  const assumptions = [
    "LaCurent Physics Engine v0.3: casa este modelata ca o singura zona termica incalzita.",
    "Podul, solul si puntile termice folosesc factori simplificati estimativi.",
    "R = d/lambda, U = 1/R_total, H = U x A.",
    "Necesarul de incalzire se calculeaza lunar cu temperatura medie, aporturi solare, aporturi interne si factor de utilizare.",
    "Rezultatul este estimativ si nu reprezinta certificat energetic oficial."
  ];
  const confidenceScore = wallInsulationM && rawInput.wall_material && rawInput.surface ? 58 : 42;
  return {
    heatLossTransmission: physicsValue(Number(hTransmission.toFixed(1)), "W/K", ["H_transmission = suma(U' x A)."], "low"),
    heatLossVentilation: physicsValue(Number(hVentilation.toFixed(1)), "W/K", ["H_ventilation = 0.34 x ACH x volum."], "low"),
    thermalBridgeLoss: physicsValue(Number(hBridge.toFixed(1)), "W/K", ["Punti termice estimate pe perimetru."], "low"),
    heatingDemandKwhYear: physicsValue(Math.round(heatingDemand), "kWh/an", ["Necesar util de incalzire estimativ."], "low"),
    heatingDemandKwhM2Year: physicsValue(energyDemand.annual.heatingDemandKwhM2Year, "kWh/m2/an", ["Necesar util specific v0.3."], energyDemand.confidence),
    coolingDemandKwhYear: physicsValue(energyDemand.annual.coolingDemandKwhYear, "kWh/an", ["Necesar util de racire v0.3, incredere mai redusa."], "low"),
    solarGainsKwhYear: physicsValue(energyDemand.annual.totalSolarGainsKwhYear, "kWh/an", ["Aporturi solare prin ferestre."], energyDemand.confidence),
    internalGainsKwhYear: physicsValue(energyDemand.annual.totalInternalGainsKwhYear, "kWh/an", ["Aporturi interne: persoane, iluminat, aparate."], "low"),
    finalEnergyKwhYear: physicsValue(Math.round(finalEnergy), "kWh/an", [`Energie finala pentru ${heatingSystem.label}.`], "low"),
    finalEnergyKwhM2Year: physicsValue(Math.round(finalEnergy / area), "kWh/m2/an", ["Energie finala specifica."], "low"),
    primaryEnergyKwhYear: physicsValue(Math.round(primaryEnergy), "kWh/an", ["Energie primara cu factor configurabil."], "low"),
    primaryEnergyKwhM2Year: physicsValue(Math.round(primaryEnergy / area), "kWh/m2/an", ["Energie primara specifica."], "low"),
    co2KgYear: physicsValue(Math.round(co2), "kgCO2/an", ["Emisii calculate cu factor configurabil."], "low"),
    co2KgM2Year: physicsValue(Number((co2 / area).toFixed(1)), "kgCO2/m2/an", ["Emisii specifice."], "low"),
    envelopeResults,
    energyDemand,
    systemsLayerV04,
    primaryEnergyAndCo2V05,
    classificationV06,
    weakestEnvelopeElements,
    assumptions,
    confidence: {
      level: confidenceScore >= 65 ? "high" : confidenceScore >= 50 ? "medium" : "low",
      score: confidenceScore,
      reasons: ["Model fizic v0.1 cu arii si coeficienti partial estimati."]
    }
  };
}

function physicsNumber(value, fallback = 0) {
  if (typeof value === "number" && Number.isFinite(value)) return value;
  if (value && typeof value.value === "number" && Number.isFinite(value.value)) return value.value;
  return fallback;
}

function dominantEnergyCarrier(systemsLayerV04) {
  const entries = Object.entries(systemsLayerV04?.finalEnergyByCarrier || {})
    .map(([carrier, data]) => [carrier, physicsNumber(data)])
    .filter(([, value]) => value > 0)
    .sort((a, b) => b[1] - a[1]);
  return entries[0]?.[0] || "unknown";
}

function categoryFromEnvelopeType(type) {
  if (type === "external_wall") return { key: "walls", label: "Pereti exteriori", group: "Anvelopa" };
  if (type === "ceiling_to_attic" || type === "roof") return { key: "roof", label: "Pod / acoperis", group: "Anvelopa" };
  if (type === "floor_on_ground" || type === "floor_over_unconditioned_space") return { key: "floor", label: "Pardoseala / sol", group: "Anvelopa" };
  if (type === "window") return { key: "windows", label: "Ferestre", group: "Anvelopa" };
  if (type === "external_door") return { key: "doors", label: "Usi exterioare", group: "Anvelopa" };
  return { key: type || "other", label: "Element anvelopa", group: "Anvelopa" };
}

function buildFinancialLossBreakdown(physicalResult = {}, estimatedAnnualCostRon = null) {
  const systems = physicalResult.systemsLayerV04 || {};
  const dominantCarrier = dominantEnergyCarrier(systems);
  const totalFinalKwh = physicsNumber(systems.totalFinalEnergyKwhYear);
  const calibratedPrice = estimatedAnnualCostRon && totalFinalKwh
    ? estimatedAnnualCostRon / totalFinalKwh
    : null;
  const priceRonPerKwh = Number((calibratedPrice || ENERGY_PRICE_RON_KWH[dominantCarrier] || ENERGY_PRICE_RON_KWH.unknown).toFixed(3));
  const usefulHeatPriceRonPerKwh = (() => {
    const heatingLoss = systems.systemLosses?.find(item => item.use === "heating");
    const useful = physicsNumber(heatingLoss?.usefulDemandKwhYear);
    const final = physicsNumber(heatingLoss?.finalEnergyKwhYear);
    return final && useful ? priceRonPerKwh * final / useful : priceRonPerKwh;
  })();
  const source = calibratedPrice
    ? "calibrat din costul anual estimat al locuintei"
    : `pret estimativ pentru ${dominantCarrier}`;
  const totalTransmissionLoss = Number(physicalResult.energyDemand?.annual?.totalTransmissionLossKwhYear || 0);
  const totalVentilationLoss = Number(physicalResult.energyDemand?.annual?.totalVentilationLossKwhYear || 0);
  const envelopeElements = physicalResult.envelopeResults || [];
  const hEnvelope = envelopeElements.reduce((sum, item) => sum + physicsNumber(item.heatTransferCoefficientWK), 0);
  const hBridge = physicsNumber(physicalResult.thermalBridgeLoss);
  const hTransmissionTotal = hEnvelope + hBridge;
  const items = [];
  const pushItem = (item) => {
    if (!item || !(item.annualCostRon > 0)) return;
    items.push({
      ...item,
      annualCostRon: Math.round(item.annualCostRon),
      energyKwhYear: Math.round(item.energyKwhYear || 0)
    });
  };

  const byCategory = {};
  envelopeElements.forEach(element => {
    const meta = categoryFromEnvelopeType(element.type);
    const h = physicsNumber(element.heatTransferCoefficientWK);
    const lossKwh = hTransmissionTotal > 0 ? totalTransmissionLoss * h / hTransmissionTotal : 0;
    byCategory[meta.key] = byCategory[meta.key] || { ...meta, h: 0, energyKwhYear: 0 };
    byCategory[meta.key].h += h;
    byCategory[meta.key].energyKwhYear += lossKwh;
  });
  Object.values(byCategory).forEach(item => {
    pushItem({
      id: item.key,
      label: item.label,
      group: item.group,
      energyKwhYear: item.energyKwhYear,
      annualCostRon: item.energyKwhYear * usefulHeatPriceRonPerKwh,
      explanation: `Cost echivalent al caldurii pierdute prin ${item.label.toLowerCase()}.`
    });
  });
  const bridgeLossKwh = hTransmissionTotal > 0 ? totalTransmissionLoss * hBridge / hTransmissionTotal : 0;
  pushItem({
    id: "thermal_bridges",
    label: "Punti termice",
    group: "Anvelopa",
    energyKwhYear: bridgeLossKwh,
    annualCostRon: bridgeLossKwh * usefulHeatPriceRonPerKwh,
    explanation: "Pierderi estimate prin colturi, imbinari si zone greu de izolat continuu."
  });
  pushItem({
    id: "ventilation",
    label: "Ventilatie si infiltratii",
    group: "Aer si confort",
    energyKwhYear: totalVentilationLoss,
    annualCostRon: totalVentilationLoss * usefulHeatPriceRonPerKwh,
    explanation: "Cost echivalent al aerului cald evacuat sau pierdut prin neetanseitati."
  });
  (systems.systemLosses || []).forEach(loss => {
    const lossKwh = physicsNumber(loss.lossesKwhYear);
    const label = loss.use === "dhw" ? "Pierderi apa calda" : "Pierderi sistem incalzire";
    pushItem({
      id: `system_${loss.use}`,
      label,
      group: "Instalatii",
      energyKwhYear: lossKwh,
      annualCostRon: lossKwh * priceRonPerKwh,
      explanation: loss.use === "dhw"
        ? "Diferenta dintre necesarul util de apa calda si energia consumata de sistem."
        : "Diferenta dintre caldura utila livrata casei si energia consumata de sistem."
    });
  });
  const auxiliaryKwh = physicsNumber(systems.auxiliaryEnergy?.totalKwhYear);
  pushItem({
    id: "auxiliary",
    label: "Pompe, ventilatoare, automatizari",
    group: "Instalatii",
    energyKwhYear: auxiliaryKwh,
    annualCostRon: auxiliaryKwh * ENERGY_PRICE_RON_KWH.electricity,
    explanation: "Consum auxiliar estimat pentru circulatoare, ventilatoare si automatizari."
  });

  items.sort((a, b) => b.annualCostRon - a.annualCostRon);
  return {
    version: "Financial Loss Breakdown v0.1",
    totalAnnualLossRon: items.reduce((sum, item) => sum + item.annualCostRon, 0),
    priceRonPerKwh,
    usefulHeatPriceRonPerKwh: Number(usefulHeatPriceRonPerKwh.toFixed(3)),
    dominantCarrier,
    priceSource: source,
    items,
    assumptions: [
      "Pierderile prin anvelopa si ventilatie sunt convertite in lei/an ca energie utila de incalzire.",
      "Pierderile de sistem sunt convertite pe energia finala a purtatorului dominant.",
      "Valorile sunt estimative si depind de pretul energiei si de datele introduse."
    ]
  };
}

function homeSummaryFromInput(rawInput = {}, profile = {}) {
  const input = profile.input || {};
  const usefulAreaM2 = input.geometry?.usefulAreaM2 || rawInput.surface || rawInput.useful_area_m2 || "unknown";
  const heatedAreaM2 = input.geometry?.heatedAreaM2 || rawInput.heated_area_m2 || usefulAreaM2;
  const floors = input.geometry?.numberOfFloors || rawInput.number_of_floors || rawInput.floors || "unknown";
  return {
    homeId: rawInput.house_id || null,
    buildingType: input.general?.buildingType || rawInput.house_type || "unknown",
    buildingCategory: rawInput.building_category || rawInput.analysis_type || "residential",
    location: input.general?.location?.cityOrVillage || rawInput.city || "unknown",
    county: input.general?.location?.county || rawInput.county || rawInput.judet || "unknown",
    address: rawInput.address || rawInput.street || rawInput.city || "unknown",
    constructionYear: input.general?.constructionYear || rawInput.year || "unknown",
    usefulAreaM2,
    heatedAreaM2,
    builtSurfaceM2: rawInput.built_surface || rawInput.building_footprint_m2 || "unknown",
    unfoldedSurfaceM2: rawInput.unfolded_surface || rawInput.gross_floor_area_m2 || rawInput.total_floor_area_m2 || "unknown",
    numberOfFloors: floors,
    heatedVolumeM3: rawInput.heated_volume_m3 || (usefulAreaM2 !== "unknown" && rawInput.floor_height_m
      ? Math.round(Number(usefulAreaM2) * Number(rawInput.floor_height_m))
      : "unknown"),
    heatingSystem: input.heating?.systemType || input.heating?.mainSource || rawInput.heating || "unknown",
    envelopeSummary: input.envelope?.walls?.insulated || rawInput.wall_insulation || "unknown",
    climateRegion: rawInput.climate_region || rawInput.climate_zone_id || "unknown",
    characteristicPhotos: rawInput.characteristic_photos || rawInput.photo_count || "not_provided"
  };
}

function buildReportSnapshot(profile, rawInput = {}, benchmark = null, generatedAt = null, physicalResult = null) {
  const assessment = profile.assessment;
  const derived = profile.derived;
  const demand = derived.demand || {};
  const confidence = assessment.confidence || {};
  const financialLosses = buildFinancialLossBreakdown(physicalResult, assessment.estimatedAnnualCostRon);
  const physicsClassification = physicalResult?.classificationV06 || {};
  const reportEnergyClass = physicsClassification.estimatedEnergyClass || "unknown";
  return {
    id: `report-${generatedAt || new Date().toISOString()}`,
    homeId: rawInput.house_id || null,
    generatedAt: generatedAt || new Date().toISOString(),
    energyScore: assessment.score,
    estimatedEnergyClass: reportEnergyClass,
    estimatedEnergyClassSource: "physics_v06",
    estimatedEnergyClassBasis: {
      status: physicsClassification.classCalculationStatus || "blocked_missing_validated_methodology",
      missingReasons: physicsClassification.missingReasons || []
    },
    estimatedEnergyClassMissingReasons: physicsClassification.missingReasons || [],
    mainConclusion: assessment.mainConclusion,
    shortExplanation: assessment.shortExplanation,
    estimatedConsumptionKwhM2Year: physicalResult?.heatingDemandKwhM2Year?.value || physicalResult?.finalEnergyKwhM2Year?.value || demand.estimatedFinalEnergyKwhM2Year,
    estimatedAnnualCostRon: assessment.estimatedAnnualCostRon,
    estimatedCo2KgM2Year: physicalResult?.co2KgM2Year?.value || derived.emissions?.estimatedCo2KgM2Year,
    confidenceLevel: physicalResult?.confidence?.level || confidence.level || "low",
    confidenceScore: physicalResult?.confidence?.score || confidence.score || 0,
    confidenceReasons: physicalResult?.confidence?.reasons || confidence.reasons || [],
    missingData: confidence.missingData || [],
    topProblems: (assessment.topProblems || []).slice(0, 3),
    staticRecommendations: (profile.recommendations || []).slice(0, 3),
    financialLosses,
    home: homeSummaryFromInput(rawInput, profile),
    benchmarkExplanation: assessment.benchmark?.explanation || (benchmark?.percentile
      ? `Comparatie estimativa cu locuinte similare: percentila ${Math.round(benchmark.percentile)}.`
      : "Benchmark-ul se calibreaza pe masura ce apar mai multe locuinte similare."),
    technicalDetails: {
      physicsEngineVersion: "LaCurent Physics Engine v0.3",
      heatLossTransmission: physicalResult?.heatLossTransmission,
      heatLossVentilation: physicalResult?.heatLossVentilation,
      thermalBridgeLoss: physicalResult?.thermalBridgeLoss,
      heatingDemandKwhYear: physicalResult?.heatingDemandKwhYear?.value || demand.heatingDemandKwhYear,
      heatingDemandKwhM2Year: physicalResult?.heatingDemandKwhM2Year?.value,
      coolingDemandKwhYear: physicalResult?.coolingDemandKwhYear?.value,
      solarGainsKwhYear: physicalResult?.solarGainsKwhYear?.value,
      internalGainsKwhYear: physicalResult?.internalGainsKwhYear?.value,
      energyDemandV03: physicalResult?.energyDemand,
      systemsLayerV04: physicalResult?.systemsLayerV04,
      primaryEnergyAndCo2V05: physicalResult?.primaryEnergyAndCo2V05,
      classificationV06: physicalResult?.classificationV06,
      dhwDemandKwhYear: demand.dhwDemandKwhYear,
      finalEnergyKwhYear: physicalResult?.finalEnergyKwhYear,
      primaryEnergyKwhYear: physicalResult?.primaryEnergyKwhYear,
      financialLosses,
      heatPumpCop: derived.systems?.heating?.estimatedCop,
      weakestEnvelopeElements: physicalResult?.weakestEnvelopeElements || [],
      assumptions: [
        ...(physicalResult?.assumptions || []),
        ...(demand.assumptions || []),
        ...(derived.systems?.heating?.assumptions || [])
      ]
    }
  };
}

function buildAlgorithmInsights(profile, benchmark = null, offerMap = {}, billAnalysis = {}, updatedAt = null, physicalResult = null) {
  const score = Number(profile.assessment?.score) || 0;
  const similarHomesCount = benchmark?.percentile ? 1284 : 0;
  const weakByType = new Map((physicalResult?.weakestEnvelopeElements || []).map(item => [item.type, item]));
  return (profile.recommendations || []).slice(0, 6).map((item, index) => {
    const offer = offerMap[item.id] || {};
    const savingsMin = Number(item.estimatedSavingsRonYearMin) || 0;
    const savingsMax = Number(item.estimatedSavingsRonYearMax) || savingsMin;
    const costMin = Number(item.estimatedInvestmentRonMin) || 0;
    const costMax = Number(item.estimatedInvestmentRonMax) || costMin;
    const scoreImpact = item.impactLevel === "very_high" ? 12 : item.impactLevel === "high" ? 9 : item.impactLevel === "medium" ? 5 : 2;
    const confidenceBase = profile.assessment?.confidence?.score || 55;
    const confidence = clampScore(confidenceBase + (billAnalysis.months_count || 0) + (offer.offers_count ? 6 : 0) - index * 3);
    const weakElement = weakByType.get(item.category === "windows" ? "window" : item.category === "insulation" ? "ceiling_to_attic" : "");
    return {
      id: item.id,
      homeId: null,
      updatedAt: updatedAt || new Date().toISOString(),
      type: item.category || "insulation",
      title: item.title,
      priority: item.priority || "medium",
      estimatedScoreImpact: scoreImpact,
      estimatedScoreAfter: clampScore(score + scoreImpact),
      estimatedSavingsRonYearMin: savingsMin,
      estimatedSavingsRonYearMax: savingsMax,
      estimatedCostRonMin: costMin,
      estimatedCostRonMax: costMax,
      estimatedPaybackYearsMin: item.paybackYearsMin,
      estimatedPaybackYearsMax: item.paybackYearsMax,
      confidencePercent: confidence,
      basedOn: {
        similarHomesCount,
        comparableProjectsCount: similarHomesCount ? Math.max(18, Math.round(similarHomesCount * 0.04)) : 0,
        offersCount: offer.offers_count || 0,
        materialPriceSourcesCount: costMin ? 6 : 0,
        laborPriceSourcesCount: costMin ? 4 : 0,
        lastMarketUpdate: updatedAt || new Date().toISOString()
      },
      explanation: weakElement
        ? `${item.userFacingExplanation || item.reason} Motorul fizic indica ${weakElement.name} ca element slab: H ${weakElement.heatTransferCoefficientWK} W/K.`
        : item.userFacingExplanation || item.reason || "Recomandare calculata din profilul energetic al locuintei.",
      nextActionLabel: "Marcheaza implementata"
    };
  });
}

function normalizeEmail(email) {
  return String(email || "").trim().toLowerCase();
}

function addMinutes(date, minutes) {
  return new Date(date.getTime() + minutes * 60 * 1000).toISOString();
}

function addDays(date, days) {
  return new Date(date.getTime() + days * 24 * 60 * 60 * 1000).toISOString();
}

function bytesToBase64Url(bytes) {
  let raw = "";
  bytes.forEach(byte => {
    raw += String.fromCharCode(byte);
  });
  return btoa(raw).replaceAll("+", "-").replaceAll("/", "_").replaceAll("=", "");
}

function base64UrlToBytes(value) {
  const padded = value.replaceAll("-", "+").replaceAll("_", "/").padEnd(
    Math.ceil(value.length / 4) * 4,
    "="
  );
  const binary = atob(padded);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) {
    bytes[i] = binary.charCodeAt(i);
  }
  return bytes;
}

function randomToken(byteLength = 32) {
  const bytes = new Uint8Array(byteLength);
  crypto.getRandomValues(bytes);
  return bytesToBase64Url(bytes);
}

async function sha256(text) {
  const digest = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(text));
  return bytesToBase64Url(new Uint8Array(digest));
}

async function hashPassword(password) {
  const saltBytes = new Uint8Array(16);
  crypto.getRandomValues(saltBytes);
  const key = await crypto.subtle.importKey(
    "raw",
    new TextEncoder().encode(password),
    "PBKDF2",
    false,
    ["deriveBits"]
  );
  const bits = await crypto.subtle.deriveBits(
    {
      name: "PBKDF2",
      hash: "SHA-256",
      salt: saltBytes,
      iterations: PASSWORD_ITERATIONS
    },
    key,
    256
  );
  return `pbkdf2_sha256$${PASSWORD_ITERATIONS}$${bytesToBase64Url(saltBytes)}$${bytesToBase64Url(new Uint8Array(bits))}`;
}

async function verifyPassword(password, storedHash) {
  if (!storedHash) return false;
  const [algorithm, iterationsText, salt, expectedHash] = storedHash.split("$");
  if (algorithm !== "pbkdf2_sha256" || !iterationsText || !salt || !expectedHash) {
    return false;
  }
  const key = await crypto.subtle.importKey(
    "raw",
    new TextEncoder().encode(password),
    "PBKDF2",
    false,
    ["deriveBits"]
  );
  const bits = await crypto.subtle.deriveBits(
    {
      name: "PBKDF2",
      hash: "SHA-256",
      salt: base64UrlToBytes(salt),
      iterations: Number(iterationsText)
    },
    key,
    256
  );
  return bytesToBase64Url(new Uint8Array(bits)) === expectedHash;
}

async function readJson(request) {
  try {
    return await request.json();
  } catch {
    return {};
  }
}

function bearerToken(request) {
  const header = request.headers.get("Authorization") || "";
  return header.startsWith("Bearer ") ? header.slice(7).trim() : null;
}

function clampScore(score) {
  return Math.max(0, Math.min(100, Math.round(score)));
}

function requireAdmin(user) {
  return user && user.role === "admin";
}

function estimateEnergyClass(score) {
  return "unknown";
}

function inferAnalysisType(body, user) {
  if (user?.role === "business" || body.user_type === "business") return "business";
  if (user?.role === "industry" || body.user_type === "industry") return "industry";
  if (user?.role === "institution" || body.user_type === "institution") return "institution";
  if (user?.role === "auditor") return "auditor";
  return "residential";
}

function calculateScore(body, analysisType) {
  if (analysisType === "business" || analysisType === "industry" || analysisType === "institution") {
    const consumptionEfficiency = numberValue(body, "monthly_kwh") ? 62 : 52;
    const equipment = value(body, "energy_consumers") ? 64 : 48;
    const overall = clampScore((consumptionEfficiency + equipment + 58) / 3);
    return {
      overall_score: overall,
      building_efficiency: 58,
      consumption_efficiency: consumptionEfficiency,
      behavior: 55,
      equipment,
      green_energy: 45,
      smart_optimization: equipment,
      estimated_energy_class: estimateEnergyClass(overall)
    };
  }

  const insulation = value(body, "wall_insulation");
  const windows = value(body, "windows");
  const heating = value(body, "heating");
  const solarPanels = value(body, "solar_panels");
  const smartThermostat = value(body, "smart_thermostat");
  const monthlyBill = numberValue(body, "monthly_bill") || 0;
  const area = numberValue(body, "surface") || 100;
  const costPerSquareMeter = monthlyBill && area ? monthlyBill / area : 0;

  const buildingEfficiency = clampScore(
    45 +
    (insulation && insulation !== "Fără" ? 18 : 0) +
    (windows === "Tripan" ? 14 : windows === "Termopan" ? 8 : 0)
  );
  const consumptionEfficiency = clampScore(82 - costPerSquareMeter * 7);
  const behavior = clampScore(62 + (value(body, "work_from_home") === "Nu" ? 6 : 0));
  const equipment = clampScore(58 + (heating === "Pompă căldură" ? 16 : 0));
  const greenEnergy = clampScore(45 + (solarPanels === "Da" ? 30 : 0));
  const smartOptimization = clampScore(50 + (smartThermostat === "Da" ? 22 : 0));
  const overall = clampScore(
    buildingEfficiency * 0.24 +
    consumptionEfficiency * 0.22 +
    behavior * 0.12 +
    equipment * 0.18 +
    greenEnergy * 0.12 +
    smartOptimization * 0.12
  );

  return {
    overall_score: overall,
    building_efficiency: buildingEfficiency,
    consumption_efficiency: consumptionEfficiency,
    behavior,
    equipment,
    green_energy: greenEnergy,
    smart_optimization: smartOptimization,
    estimated_energy_class: estimateEnergyClass(overall)
  };
}

async function createSession(env, userId) {
  const token = randomToken();
  const expiresAt = addDays(new Date(), SESSION_DAYS);
  await env.DB.prepare(`
    INSERT INTO user_sessions(user_id, token_hash, expires_at)
    VALUES(?, ?, ?)
  `)
    .bind(userId, await sha256(token), expiresAt)
    .run();
  return { token, expires_at: expiresAt };
}

async function getCurrentUser(request, env) {
  const token = bearerToken(request);
  if (!token) return null;
  return env.DB.prepare(`
    SELECT users.id, users.email, users.name, users.role, users.account_type
    FROM user_sessions
    JOIN users ON users.id = user_sessions.user_id
    WHERE user_sessions.token_hash = ?
      AND datetime(user_sessions.expires_at) > datetime('now')
    LIMIT 1
  `)
    .bind(await sha256(token))
    .first();
}

async function register(request, env, corsHeaders) {
  const body = await readJson(request);
  const email = normalizeEmail(body.email);
  const name = String(body.name || "").trim();
  const password = String(body.password || "");
  const allowedRoles = ["residential", "business", "industry", "institution", "auditor"];
  const role = allowedRoles.includes(body.role) ? body.role : "residential";
  const accountType = role === "residential" ? "registered" : role;

  if (!email || !name || password.length < 8) {
    return jsonResponse(
      { success: false, error: "Completeaza numele, emailul si o parola de minimum 8 caractere." },
      { status: 400, headers: corsHeaders }
    );
  }

  try {
    const result = await env.DB.prepare(`
      INSERT INTO users(email, name, password_hash, role, account_type)
      VALUES(?, ?, ?, ?, ?)
    `)
      .bind(email, name, await hashPassword(password), role, accountType)
      .run();
    const userId = result.meta?.last_row_id;
    let organization = null;

    if (role !== "residential") {
      const organizationName = value(body, "organization_name") || name;
      const organizationType = value(body, "organization_type") || role;
      const orgResult = await env.DB.prepare(`
        INSERT INTO organizations(owner_user_id, name, organization_type)
        VALUES(?, ?, ?)
      `)
        .bind(userId, organizationName, organizationType)
        .run();
      const organizationId = orgResult.meta?.last_row_id;
      organization = {
        id: organizationId,
        name: organizationName,
        organization_type: organizationType
      };

      await env.DB.prepare(`
        INSERT INTO sites(organization_id, user_id, name, city, address)
        VALUES(?, ?, ?, ?, ?)
      `)
        .bind(
          organizationId,
          userId,
          value(body, "site_name") || "Sediu principal",
          value(body, "city"),
          value(body, "address")
        )
        .run();
    }

    const session = await createSession(env, userId);
    return jsonResponse(
      {
        success: true,
        token: session.token,
        expires_at: session.expires_at,
        user: { id: userId, email, name, role, account_type: accountType, organization }
      },
      { headers: corsHeaders }
    );
  } catch {
    return jsonResponse(
      { success: false, error: "Emailul exista deja sau contul nu poate fi creat." },
      { status: 409, headers: corsHeaders }
    );
  }
}

async function login(request, env, corsHeaders) {
  const body = await readJson(request);
  const identifier = normalizeEmail(body.email || body.username);
  const user = await env.DB.prepare(`
    SELECT id, email, name, password_hash, role, account_type
    FROM users
    WHERE email = ? OR lower(name) = ?
    ORDER BY CASE WHEN email = ? THEN 0 ELSE 1 END
    LIMIT 1
  `)
    .bind(identifier, identifier, identifier)
    .first();

  if (!user || !(await verifyPassword(String(body.password || ""), user.password_hash))) {
    return jsonResponse(
      { success: false, error: "Email sau parola incorecta." },
      { status: 401, headers: corsHeaders }
    );
  }

  const session = await createSession(env, user.id);
  return jsonResponse(
    {
      success: true,
      token: session.token,
      expires_at: session.expires_at,
      user: {
        id: user.id,
        email: user.email,
        name: user.name,
        role: user.role,
        account_type: user.account_type
      }
    },
    { headers: corsHeaders }
  );
}

async function me(request, env, corsHeaders) {
  const user = await getCurrentUser(request, env);
  if (!user) {
    return jsonResponse({ success: false, error: "Not authenticated" }, { status: 401, headers: corsHeaders });
  }
  return jsonResponse({ success: true, user }, { headers: corsHeaders });
}

async function logout(request, env, corsHeaders) {
  const token = bearerToken(request);
  if (token) {
    await env.DB.prepare("DELETE FROM user_sessions WHERE token_hash = ?")
      .bind(await sha256(token))
      .run();
  }
  return jsonResponse({ success: true }, { headers: corsHeaders });
}

async function forgotPassword(request, env, corsHeaders, url) {
  const body = await readJson(request);
  const email = normalizeEmail(body.email);
  const user = email
    ? await env.DB.prepare("SELECT id FROM users WHERE email = ? LIMIT 1").bind(email).first()
    : null;
  let resetUrl = null;

  if (user) {
    const token = randomToken();
    await env.DB.prepare(`
      INSERT INTO password_reset_tokens(user_id, token_hash, expires_at)
      VALUES(?, ?, ?)
    `)
      .bind(user.id, await sha256(token), addMinutes(new Date(), RESET_MINUTES))
      .run();
    resetUrl = `${url.origin}/pages/reset-password.html?token=${encodeURIComponent(token)}`;
  }

  return jsonResponse(
    {
      success: true,
      message: "Daca emailul exista, vei primi instructiuni de resetare.",
      reset_url: resetUrl
    },
    { headers: corsHeaders }
  );
}

async function resetPassword(request, env, corsHeaders) {
  const body = await readJson(request);
  const token = String(body.token || "");
  const password = String(body.password || "");
  if (!token || password.length < 8) {
    return jsonResponse({ success: false, error: "Token invalid sau parola prea scurta." }, { status: 400, headers: corsHeaders });
  }

  const reset = await env.DB.prepare(`
    SELECT id, user_id
    FROM password_reset_tokens
    WHERE token_hash = ?
      AND used_at IS NULL
      AND datetime(expires_at) > datetime('now')
    LIMIT 1
  `)
    .bind(await sha256(token))
    .first();

  if (!reset) {
    return jsonResponse({ success: false, error: "Linkul de resetare este invalid sau expirat." }, { status: 400, headers: corsHeaders });
  }

  await env.DB.batch([
    env.DB.prepare("UPDATE users SET password_hash = ? WHERE id = ?").bind(await hashPassword(password), reset.user_id),
    env.DB.prepare("UPDATE password_reset_tokens SET used_at = ? WHERE id = ?").bind(new Date().toISOString(), reset.id),
    env.DB.prepare("DELETE FROM user_sessions WHERE user_id = ?").bind(reset.user_id)
  ]);
  return jsonResponse({ success: true }, { headers: corsHeaders });
}

const MC001_HTR_VERTICAL_ANALYSIS_TYPE = "mc001_htr_vertical_v1";
const MC001_HTR_INPUT_ANSWER_KEY = "mc001_htr_input_json";
const MC001_HTR_RESULT_SCOPE =
  "htr_transmission_only_not_full_mc001_certificate";
const MC001_HTR_REGISTRY_SOURCE_PACK_CODES = Object.freeze([
  "MC001_R0_BZTU_FORMULA_SOURCE_PACK",
  "MC001_R2_HTR_TRANSMISSION_SPINE_SOURCE_PACK",
  "MC001_R2_MONTHLY_TRANSMISSION_SOURCE_PACK"
]);
const MC001_HTR_REGISTRY_FORMULA_CODES = Object.freeze([
  "MC001_2_15_HTR_TOTAL_TRANSMISSION"
]);
const MC001_HTR_MISSING_NEXT_SCOPE = Object.freeze([
  "QHnd_monthly_not_implemented",
  "final_energy_not_implemented",
  "primary_energy_not_implemented",
  "co2_not_implemented",
  "certificate_not_implemented"
]);
const MC001_HTR_COMPONENT_TYPES = Object.freeze([
  "external_wall",
  "roof",
  "floor",
  "window",
  "door",
  "other_envelope_component"
]);
const MC001_HTR_NON_HU_INPUTS = Object.freeze([
  Object.freeze({
    requestKey: "thermal_bridge_w_k",
    contributionType: "thermal_bridge_transmission_contribution",
    sourceCode: "thermal-bridge"
  }),
  Object.freeze({
    requestKey: "ground_w_k",
    contributionType: "ground_transmission_contribution",
    sourceCode: "ground"
  }),
  Object.freeze({
    requestKey: "adjacent_space_w_k",
    contributionType: "adjacent_space_transmission_contribution",
    sourceCode: "adjacent-space"
  })
]);

function isPlainObject(value) {
  return value !== null && typeof value === "object" && !Array.isArray(value);
}

function mc001HtrPrivateContentLooksUnsafe(value) {
  const normalized = String(value || "")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase();
  return (
    normalized.includes("@") ||
    normalized.includes("+40722111222") ||
    normalized.includes("person@example.com") ||
    normalized.includes("strada exemplu") ||
    normalized.includes("john doe") ||
    normalized.includes("record-johndoe") ||
    normalized.includes("record-001") ||
    normalized.includes("owner-snapshot") ||
    normalized.includes("private-note") ||
    normalized.includes("person-name") ||
    normalized.includes("sourcecontext") ||
    normalized.includes("sourcetrace") ||
    normalized.includes("sourcerefs") ||
    normalized.includes("sourcerecordid") ||
    normalized.includes("token") ||
    normalized.includes("session")
  );
}

function safeShortToken(value, maxLength = 80) {
  return typeof value === "string" &&
    value.length > 0 &&
    value.length <= maxLength &&
    /^[a-zA-Z0-9_.:-]+$/.test(value) &&
    !mc001HtrPrivateContentLooksUnsafe(value);
}

function safeOptionalLabel(value) {
  return value === null ||
    value === undefined ||
    (
      typeof value === "string" &&
      value.length <= 80 &&
      !/[<>{}]/.test(value) &&
      !mc001HtrPrivateContentLooksUnsafe(value)
    );
}

function mc001HtrPayloadHasUnsafeContent(value) {
  if (value === null || value === undefined) return false;
  if (typeof value === "string") return mc001HtrPrivateContentLooksUnsafe(value);
  if (typeof value === "number" || typeof value === "boolean") return false;
  if (Array.isArray(value)) return value.some(mc001HtrPayloadHasUnsafeContent);
  if (!isPlainObject(value)) return true;
  return Object.entries(value).some(([key, child]) => (
    mc001HtrPrivateContentLooksUnsafe(key) ||
    mc001HtrPayloadHasUnsafeContent(child)
  ));
}

function mc001HtrPayloadHasForbiddenDerivedFields(value) {
  const forbiddenKeys = new Set([
    "htr_total",
    "htrTotal",
    "totalHtr",
    "htrResult",
    "htrValue",
    "htrFormulaResult",
    "formulaResult",
    "resultValue",
    "calculatedHtr",
    "calculationTerms",
    "composedInputs",
    "htrTotalResult",
    "calculatedTotal",
    "transmissionFormulaResults",
    "directTransmission",
    "thermalBridgeGlobal",
    "globalTransmissionExcludingGround",
    "psiCases",
    "heatFlowCases",
    "timeIntegratedTransmissionCases",
    "htrTotalRelation215",
    "formulaCode",
    "relationCode",
    "result",
    "results",
    "terms",
    "finalEnergy",
    "primaryEnergy",
    "CO2",
    "QHnd"
  ]);
  if (value === null || value === undefined || typeof value !== "object") {
    return false;
  }
  if (Array.isArray(value)) {
    return value.some(mc001HtrPayloadHasForbiddenDerivedFields);
  }
  return Object.entries(value).some(([key, child]) => (
    forbiddenKeys.has(key) || mc001HtrPayloadHasForbiddenDerivedFields(child)
  ));
}

function mc001HtrFiniteNumber(value) {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : null;
}

function mc001HtrSourceIssue(source) {
  if (!isPlainObject(source)) {
    return "Lipseste sursa explicita pentru una dintre valorile Htr.";
  }
  if (source.source_type !== "explicit_user_input") {
    return "Sursa valorilor Htr trebuie sa fie explicit_user_input.";
  }
  if (!safeShortToken(source.reference, 80)) {
    return "Referinta sursei Htr este invalida.";
  }
  return null;
}

function mc001HtrFormulaSource(source) {
  return {
    sourceType: "explicit_user_input",
    reference: source.reference
  };
}

function mc001HtrOptionalArray(value, label) {
  if (value === undefined || value === null) return { ok: true, value: [] };
  if (!Array.isArray(value) || value.length > 50) {
    return { ok: false, error: `${label} trebuie sa fie o lista valida.` };
  }
  return { ok: true, value };
}

function sanitizeMc001TransmissionFormulaInputs(input) {
  const formulaInput = input.transmission_formula_inputs;
  if (formulaInput === undefined || formulaInput === null) {
    return { ok: true, value: null };
  }
  if (!isPlainObject(formulaInput)) {
    return { ok: false, error: "Inputurile avansate de transmisie sunt invalide." };
  }

  const directArray = mc001HtrOptionalArray(
    formulaInput.direct_transmission_elements,
    "direct_transmission_elements"
  );
  if (!directArray.ok) return directArray;
  const bridgeArray = mc001HtrOptionalArray(
    formulaInput.linear_thermal_bridges,
    "linear_thermal_bridges"
  );
  if (!bridgeArray.ok) return bridgeArray;
  const psiArray = mc001HtrOptionalArray(
    formulaInput.psi_calculation_cases,
    "psi_calculation_cases"
  );
  if (!psiArray.ok) return psiArray;
  const heatArray = mc001HtrOptionalArray(
    formulaInput.heat_flow_cases,
    "heat_flow_cases"
  );
  if (!heatArray.ok) return heatArray;
  const timeArray = mc001HtrOptionalArray(
    formulaInput.time_integrated_transmission_cases,
    "time_integrated_transmission_cases"
  );
  if (!timeArray.ok) return timeArray;

  const directTransmissionElements = [];
  for (const [index, element] of directArray.value.entries()) {
    if (!isPlainObject(element) || !safeShortToken(element.element_id, 64)) {
      return { ok: false, error: `Elementul direct ${index + 1} are id invalid.` };
    }
    if (!safeOptionalLabel(element.label)) {
      return { ok: false, error: `Elementul direct ${index + 1} are eticheta invalida.` };
    }
    const area = mc001HtrFiniteNumber(element.area_m2);
    const correctedU = mc001HtrFiniteNumber(element.corrected_u_w_m2k);
    if (area === null || area <= 0 || correctedU === null || correctedU <= 0) {
      return { ok: false, error: "Valorile Hd direct trebuie sa fie finite si pozitive." };
    }
    const sourceIssue = mc001HtrSourceIssue(element.source);
    if (sourceIssue) return { ok: false, error: sourceIssue };
    directTransmissionElements.push({
      element_id: element.element_id,
      label: element.label || null,
      area_m2: area,
      corrected_u_w_m2k: correctedU,
      source: {
        source_type: "explicit_user_input",
        reference: element.source.reference
      }
    });
  }

  const linearThermalBridges = [];
  for (const [index, bridge] of bridgeArray.value.entries()) {
    if (!isPlainObject(bridge) || !safeShortToken(bridge.bridge_id, 64)) {
      return { ok: false, error: `Puntea termica ${index + 1} are id invalid.` };
    }
    if (!safeOptionalLabel(bridge.label)) {
      return { ok: false, error: `Puntea termica ${index + 1} are eticheta invalida.` };
    }
    const length = mc001HtrFiniteNumber(bridge.length_m);
    const psi = mc001HtrFiniteNumber(bridge.psi_w_mk);
    if (length === null || length < 0 || psi === null) {
      return { ok: false, error: "Valorile puntilor termice trebuie sa fie finite." };
    }
    const sourceIssue = mc001HtrSourceIssue(bridge.source);
    if (sourceIssue) return { ok: false, error: sourceIssue };
    linearThermalBridges.push({
      bridge_id: bridge.bridge_id,
      label: bridge.label || null,
      length_m: length,
      psi_w_mk: psi,
      source: {
        source_type: "explicit_user_input",
        reference: bridge.source.reference
      }
    });
  }

  const psiCalculationCases = [];
  for (const [index, psiCase] of psiArray.value.entries()) {
    if (!isPlainObject(psiCase) || !safeShortToken(psiCase.case_id, 64)) {
      return { ok: false, error: `Cazul psi ${index + 1} are id invalid.` };
    }
    const length = mc001HtrFiniteNumber(psiCase.length_m);
    const l2d = mc001HtrFiniteNumber(psiCase.l2d_w_k);
    if (length === null || length <= 0 || l2d === null || l2d < 0) {
      return { ok: false, error: "Valorile cazului psi trebuie sa fie finite." };
    }
    const refs = mc001HtrOptionalArray(psiCase.reference_elements, "reference_elements");
    if (!refs.ok || refs.value.length === 0) {
      return { ok: false, error: "Cazul psi are nevoie de cel putin un element de referinta." };
    }
    const sourceIssue = mc001HtrSourceIssue(psiCase.source);
    if (sourceIssue) return { ok: false, error: sourceIssue };
    const referenceElements = [];
    for (const [refIndex, ref] of refs.value.entries()) {
      if (!isPlainObject(ref) || !safeShortToken(ref.element_id, 64)) {
        return { ok: false, error: `Elementul de referinta psi ${refIndex + 1} are id invalid.` };
      }
      const area = mc001HtrFiniteNumber(ref.area_m2);
      const u = mc001HtrFiniteNumber(ref.u_w_m2k);
      if (area === null || area <= 0 || u === null || u <= 0) {
        return { ok: false, error: "Elementele de referinta psi trebuie sa aiba valori pozitive." };
      }
      referenceElements.push({
        element_id: ref.element_id,
        area_m2: area,
        u_w_m2k: u
      });
    }
    psiCalculationCases.push({
      case_id: psiCase.case_id,
      length_m: length,
      l2d_w_k: l2d,
      reference_elements: referenceElements,
      source: {
        source_type: "explicit_user_input",
        reference: psiCase.source.reference
      }
    });
  }

  const heatFlowCases = [];
  for (const [index, heatCase] of heatArray.value.entries()) {
    if (!isPlainObject(heatCase) || !safeShortToken(heatCase.case_id, 64)) {
      return { ok: false, error: `Cazul flux ${index + 1} are id invalid.` };
    }
    const htr = mc001HtrFiniteNumber(heatCase.htr_w_k);
    const indoor = mc001HtrFiniteNumber(heatCase.theta_i_c);
    const outdoor = mc001HtrFiniteNumber(heatCase.theta_e_c);
    if (htr === null || htr < 0 || indoor === null || outdoor === null) {
      return { ok: false, error: "Cazul de flux termic are valori invalide." };
    }
    heatFlowCases.push({
      case_id: heatCase.case_id,
      htr_w_k: htr,
      theta_i_c: indoor,
      theta_e_c: outdoor
    });
  }

  const timeIntegratedTransmissionCases = [];
  for (const [index, timeCase] of timeArray.value.entries()) {
    if (!isPlainObject(timeCase) || !safeShortToken(timeCase.case_id, 64)) {
      return { ok: false, error: `Cazul energetic ${index + 1} are id invalid.` };
    }
    const htr = mc001HtrFiniteNumber(timeCase.htr_w_k);
    const indoor = mc001HtrFiniteNumber(timeCase.theta_i_c);
    const outdoor = mc001HtrFiniteNumber(timeCase.theta_e_c);
    const duration = mc001HtrFiniteNumber(timeCase.duration_h);
    if (htr === null || htr < 0 || indoor === null || outdoor === null || duration === null || duration <= 0) {
      return { ok: false, error: "Cazul de energie transmisie are valori invalide." };
    }
    timeIntegratedTransmissionCases.push({
      case_id: timeCase.case_id,
      htr_w_k: htr,
      theta_i_c: indoor,
      theta_e_c: outdoor,
      duration_h: duration
    });
  }

  let htrTotal215Case = null;
  if (formulaInput.htr_total_2_15_case !== undefined && formulaInput.htr_total_2_15_case !== null) {
    const htrCase = formulaInput.htr_total_2_15_case;
    if (!isPlainObject(htrCase)) {
      return { ok: false, error: "Cazul Htr 2.15 este invalid." };
    }
    const hd = mc001HtrFiniteNumber(htrCase.hd_w_k);
    const hg = mc001HtrFiniteNumber(htrCase.hg_w_k);
    const hu = mc001HtrFiniteNumber(htrCase.hu_w_k);
    const ha = mc001HtrFiniteNumber(htrCase.ha_w_k);
    if (hd === null || hd < 0 || hg === null || hg < 0 || hu === null || hu < 0 || ha === null || ha < 0) {
      return { ok: false, error: "Componentele Htr 2.15 trebuie sa fie finite si pozitive sau zero." };
    }
    const sourceIssue = mc001HtrSourceIssue(htrCase.source);
    if (sourceIssue) return { ok: false, error: sourceIssue };
    htrTotal215Case = {
      hd_w_k: hd,
      hg_w_k: hg,
      hu_w_k: hu,
      ha_w_k: ha,
      source: {
        source_type: "explicit_user_input",
        reference: htrCase.source.reference
      }
    };
  }

  const sanitized = {
    direct_transmission_elements: directTransmissionElements,
    linear_thermal_bridges: linearThermalBridges,
    psi_calculation_cases: psiCalculationCases,
    heat_flow_cases: heatFlowCases,
    time_integrated_transmission_cases: timeIntegratedTransmissionCases
  };
  if (htrTotal215Case) sanitized.htr_total_2_15_case = htrTotal215Case;
  return { ok: true, value: sanitized };
}

function sanitizeMc001HtrInput(body = {}) {
  const input = body?.htr_input;
  if (!isPlainObject(input)) {
    return { ok: false, error: "Lipseste htr_input." };
  }
  if (mc001HtrPayloadHasUnsafeContent(input) || mc001HtrPayloadHasUnsafeContent(body.label)) {
    return { ok: false, error: "Inputul MC001 Htr contine continut nesigur." };
  }
  if (mc001HtrPayloadHasForbiddenDerivedFields(input) || mc001HtrPayloadHasForbiddenDerivedFields(body)) {
    return { ok: false, error: "Inputul MC001 Htr nu poate contine rezultate calculate." };
  }
  if (!safeOptionalLabel(body.label)) {
    return { ok: false, error: "Eticheta analizei Htr este invalida." };
  }
  if (!Array.isArray(input.envelope_components) || input.envelope_components.length === 0) {
    return { ok: false, error: "Adauga cel putin un element de anvelopa pentru Htr." };
  }
  if (input.envelope_components.length > 50) {
    return { ok: false, error: "Prea multe elemente de anvelopa pentru MVP-ul Htr." };
  }

  const componentIds = new Set();
  const envelopeComponents = [];
  for (const component of input.envelope_components) {
    if (!isPlainObject(component)) {
      return { ok: false, error: "Element de anvelopa invalid." };
    }
    if (!safeShortToken(component.component_id, 64)) {
      return { ok: false, error: "ID-ul elementului de anvelopa este invalid." };
    }
    if (componentIds.has(component.component_id)) {
      return { ok: false, error: "ID duplicat pentru elementele de anvelopa." };
    }
    componentIds.add(component.component_id);
    if (!MC001_HTR_COMPONENT_TYPES.includes(component.component_type)) {
      return { ok: false, error: "Tipul elementului de anvelopa nu este acceptat." };
    }
    if (!safeOptionalLabel(component.label)) {
      return { ok: false, error: "Eticheta elementului de anvelopa este invalida." };
    }
    const area = mc001HtrFiniteNumber(component.area_m2);
    if (area === null || area <= 0) {
      return { ok: false, error: "Suprafata elementului de anvelopa trebuie sa fie pozitiva." };
    }
    const thermalTransmittance = mc001HtrFiniteNumber(
      component.thermal_transmittance_w_m2k
    );
    if (thermalTransmittance === null || thermalTransmittance <= 0) {
      return { ok: false, error: "Transmitanta termica trebuie sa fie pozitiva." };
    }
    const bztu = mc001HtrFiniteNumber(component.bztu);
    if (bztu === null || bztu < 0 || bztu > 1) {
      return { ok: false, error: "bztu trebuie sa fie un numar finit intre 0 si 1." };
    }
    const sourceIssue = mc001HtrSourceIssue(component.source);
    if (sourceIssue) {
      return { ok: false, error: sourceIssue };
    }
    envelopeComponents.push({
      component_id: component.component_id,
      component_type: component.component_type,
      label: component.label || null,
      area_m2: area,
      thermal_transmittance_w_m2k: thermalTransmittance,
      bztu,
      source: {
        source_type: "explicit_user_input",
        reference: component.source.reference
      }
    });
  }

  if (!isPlainObject(input.non_hu_contributions)) {
    return { ok: false, error: "Lipsesc contributiile non-Hu pentru Htr." };
  }
  const nonHuContributions = {};
  for (const entry of MC001_HTR_NON_HU_INPUTS) {
    const contribution = input.non_hu_contributions[entry.requestKey];
    if (!isPlainObject(contribution)) {
      return { ok: false, error: "Lipseste o contributie non-Hu pentru Htr." };
    }
    const amount = mc001HtrFiniteNumber(contribution.value);
    if (amount === null || amount < 0) {
      return {
        ok: false,
        error: "Contributiile non-Hu trebuie sa fie numere finite pozitive sau zero."
      };
    }
    const sourceIssue = mc001HtrSourceIssue(contribution.source);
    if (sourceIssue) {
      return { ok: false, error: sourceIssue };
    }
    nonHuContributions[entry.requestKey] = {
      value: amount,
      source: {
        source_type: "explicit_user_input",
        reference: contribution.source.reference
      }
    };
  }

  const transmissionFormulaInputs = sanitizeMc001TransmissionFormulaInputs(input);
  if (!transmissionFormulaInputs.ok) {
    return { ok: false, error: transmissionFormulaInputs.error };
  }

  return {
    ok: true,
    input: {
      label: body.label || null,
      htr_input: {
        envelope_components: envelopeComponents,
        non_hu_contributions: nonHuContributions,
        ...(transmissionFormulaInputs.value
          ? { transmission_formula_inputs: transmissionFormulaInputs.value }
          : {})
      }
    }
  };
}

function validateMc001HtrInput(body = {}) {
  return sanitizeMc001HtrInput(body);
}

function mc001HtrInternalSource(sourceCode, sourceType = "expert_override_with_source") {
  return {
    sourceType,
    sourceRecordId: `record:mc001-htr-v2-${sourceCode}`
  };
}

function buildMc001HtrComponent(component, index) {
  const sourceCode = `component-${index + 1}`;
  return {
    componentId: `component:${component.component_id.toLowerCase()}`,
    componentType: component.component_type,
    ztuZoneId: "ztu:mc001-htr-v2-heated-zone",
    adjacentZoneId: "ztu:mc001-htr-v2-exterior-zone",
    area: {
      value: component.area_m2,
      unit: "m2",
      source: mc001HtrInternalSource(`${sourceCode}-area`)
    },
    thermalTransmittance: {
      value: component.thermal_transmittance_w_m2k,
      unit: "W/(m2*K)",
      source: mc001HtrInternalSource(`${sourceCode}-u`)
    },
    bztu: {
      value: component.bztu,
      unit: "dimensionless",
      source: mc001HtrInternalSource(`${sourceCode}-bztu`, "methodological_direct_input")
    }
  };
}

function mc001HtrPrerequisite(prerequisiteType, sourceCode) {
  return {
    prerequisiteId: `htr-prerequisite:mc001-htr-v2-${sourceCode}`,
    prerequisiteType,
    applicability: "required",
    readinessStatus: "metadata_ready",
    source: mc001HtrInternalSource(`prerequisite-${sourceCode}`)
  };
}

function mc001HtrScopeContribution(contributionType, requirementStatus, sourceCode) {
  return {
    contributionType,
    requirementStatus,
    source: mc001HtrInternalSource(`scope-${sourceCode}`)
  };
}

function mc001HtrContract(contributionType, sourceCode) {
  return {
    contributionType,
    contractStatus: "numeric_contract_mapped",
    valueAvailabilityStatus: "source_backed_value_available",
    requiredUnit: "W/K",
    source: mc001HtrInternalSource(`contract-${sourceCode}`)
  };
}

function mc001HtrContributionValue(contributionType, amount, sourceCode) {
  return {
    contributionType,
    valueStatus: "explicit_source_backed_value",
    contributionValue: {
      amount,
      unit: "W/K"
    },
    source: mc001HtrInternalSource(`value-${sourceCode}`)
  };
}

function buildMc001H12InputFromVerticalInput(verticalInput) {
  const huBridgeInput = {
    schemaVersion: "mc001-h3-hu-htr-calculation-readiness-input-v1",
    isMc001HuHtrCalculationReadinessInput: true,
    inventoryReadiness: {
      isHuInventoryReady: true
    },
    components: verticalInput.htr_input.envelope_components.map(buildMc001HtrComponent)
  };
  const contributionContracts = MC001_HTR_NON_HU_INPUTS.map((entry) => (
    mc001HtrContract(entry.contributionType, entry.sourceCode)
  ));
  const contributionValues = MC001_HTR_NON_HU_INPUTS.map((entry) => (
    mc001HtrContributionValue(
      entry.contributionType,
      verticalInput.htr_input.non_hu_contributions[entry.requestKey].value,
      entry.sourceCode
    )
  ));

  return {
    schemaVersion: "mc001-h12-htr-total-calculation-input-v1",
    isMc001HtrTotalCalculationInput: true,
    compositionInput: {
      schemaVersion: "mc001-h11-htr-total-input-composition-input-v1",
      isMc001HtrTotalInputCompositionInput: true,
      valueValidationInput: {
        schemaVersion: "mc001-h10-htr-non-hu-numeric-value-validation-input-v1",
        isMc001HtrNonHuNumericValueValidationInput: true,
        contractReadinessInput: {
          schemaVersion: "mc001-h9-htr-non-hu-numeric-contribution-contracts-input-v1",
          isMc001HtrNonHuNumericContributionContractsInput: true,
          htrTotalReadinessInput: {
            schemaVersion: "mc001-h8-htr-total-calculation-readiness-input-v1",
            isMc001HtrTotalCalculationReadinessInput: true,
            htrPrerequisitesInput: {
              schemaVersion: "mc001-h7-htr-non-hu-prerequisites-input-v1",
              isMc001HtrNonHuPrerequisitesInput: true,
              huBridgeInput,
              htrNonHuPrerequisites: {
                expectedPrerequisites: [
                  mc001HtrPrerequisite("non_hu_transmission_component_inventory", "non-hu-inventory"),
                  mc001HtrPrerequisite("thermal_bridge_transmission_inventory", "thermal-bridge"),
                  mc001HtrPrerequisite("ground_transmission_inventory", "ground"),
                  mc001HtrPrerequisite("adjacent_space_transmission_inventory", "adjacent-space")
                ]
              }
            },
            htrTotalCalculationScope: {
              scopeCode: "mc001-htr-total-calculation-scope-v1",
              expectedContributions: [
                mc001HtrScopeContribution(
                  "hu_aggregated_transmission_contribution",
                  "available_from_hu_bridge",
                  "hu"
                ),
                ...MC001_HTR_NON_HU_INPUTS.map((entry) => (
                  mc001HtrScopeContribution(
                    entry.contributionType,
                    "missing_numeric_calculation",
                    entry.sourceCode
                  )
                ))
              ]
            }
          },
          nonHuNumericContributionContracts: {
            contractSetCode: "mc001-htr-non-hu-numeric-contribution-contracts-v1",
            contributionContracts
          }
        },
        nonHuNumericContributionValues: {
          valueSetCode: "mc001-htr-non-hu-numeric-contribution-values-v1",
          contributionValues
        }
      },
      htrTotalInputCompositionPolicy: {
        compositionSetCode: "mc001-htr-total-input-composition-v1",
        compositionMode: "compose_hu_bridge_and_validated_non_hu_values",
        requiredInputTypes: [
          "hu_aggregated_transmission_contribution",
          "validated_non_hu_transmission_contributions"
        ]
      }
    },
    htrTotalCalculationPolicy: {
      calculationSetCode: "mc001-htr-total-calculation-v1",
      formulaCode: "MC001_HTR_TOTAL_SUM_COMPOSED_TRANSMISSION_INPUTS",
      calculationMode: "calculate_htr_total_from_h11_composed_inputs",
      requiredInputSetStatus: "inputs_composed_not_htr_total_calculated",
      resultUnit: "W/K"
    }
  };
}

function sanitizeMc001HtrCalculationTerms(result) {
  const terms = result?.htrTotalCalculation?.calculationTerms;
  if (!Array.isArray(terms)) return [];
  return terms.map((term) => {
    const sanitized = {
      contributionType: term.contributionType,
      termStatus: term.termStatus
    };
    if (
      term.contributionValue &&
      typeof term.contributionValue.amount === "number" &&
      Number.isFinite(term.contributionValue.amount) &&
      term.contributionValue.unit === "W/K"
    ) {
      sanitized.contributionValue = {
        amount: term.contributionValue.amount,
        unit: "W/K"
      };
    }
    return sanitized;
  });
}

function sanitizeMc001HtrBlockers(result) {
  const blockers = Array.isArray(result?.blockers) ? result.blockers : [];
  return blockers
    .filter((entry) => isPlainObject(entry) && safeShortToken(entry.code, 96))
    .map((entry) => ({
      code: entry.code,
      severity: entry.severity === "blocking" ? "blocking" : "warning"
    }));
}

function sanitizeMc001HtrResult(result) {
  const isReady = result?.status === "ready";
  const total = result?.htrTotalCalculation?.htrTotalResult;
  const htrTotalResult = (
    isReady &&
    total &&
    typeof total.amount === "number" &&
    Number.isFinite(total.amount) &&
    total.unit === "W/K"
  )
    ? {
        amount: total.amount,
        unit: "W/K"
      }
    : null;

  return {
    status: isReady ? "ready" : "blocked",
    scope: MC001_HTR_RESULT_SCOPE,
    htrTotalResult,
    calculationTerms: sanitizeMc001HtrCalculationTerms(result),
    diagnostics: {
      blockers: sanitizeMc001HtrBlockers(result),
      missingForNextMethodologyScope: [...MC001_HTR_MISSING_NEXT_SCOPE]
    },
    registryReferences: {
      sourcePackCodes: [...MC001_HTR_REGISTRY_SOURCE_PACK_CODES],
      formulaCodes: [...MC001_HTR_REGISTRY_FORMULA_CODES]
    }
  };
}

function mc001EnsureFormulaReady(result) {
  return result?.status === "ready";
}

function buildMc001TransmissionFormulaResults(transmissionInputs) {
  if (!transmissionInputs) return { ok: true, value: null };

  const results = {};
  let directTransmission = null;
  if (transmissionInputs.direct_transmission_elements.length > 0) {
    directTransmission = calculateMc001DirectTransmissionCoefficient({
      elements: transmissionInputs.direct_transmission_elements.map((element) => ({
        elementId: element.element_id,
        label: element.label,
        area: { amount: element.area_m2, unit: "m2" },
        correctedThermalTransmittance: { amount: element.corrected_u_w_m2k, unit: "W/(m2*K)" },
        source: mc001HtrFormulaSource(element.source)
      }))
    });
    if (!mc001EnsureFormulaReady(directTransmission)) {
      return { ok: false, error: "Inputurile Hd direct sunt invalide." };
    }
    results.directTransmission = directTransmission;
  }

  let thermalBridgeGlobal = null;
  if (transmissionInputs.linear_thermal_bridges.length > 0) {
    thermalBridgeGlobal = calculateMc001ThermalBridgeGlobalCoefficient({
      bridges: transmissionInputs.linear_thermal_bridges.map((bridge) => ({
        bridgeId: bridge.bridge_id,
        label: bridge.label,
        length: { amount: bridge.length_m, unit: "m" },
        psi: { amount: bridge.psi_w_mk, unit: "W/(m*K)" },
        source: mc001HtrFormulaSource(bridge.source)
      }))
    });
    if (!mc001EnsureFormulaReady(thermalBridgeGlobal)) {
      return { ok: false, error: "Inputurile puntilor termice sunt invalide." };
    }
    results.thermalBridgeGlobal = thermalBridgeGlobal;
  }

  if (directTransmission && thermalBridgeGlobal) {
    const source = { sourceType: "explicit_user_input", reference: "manual_mvp_input" };
    const globalTransmissionExcludingGround = calculateMc001GlobalTransmissionExcludingGround({
      elementTransmissionCoefficients: [{
        elementId: "direct_transmission_hd",
        amount: directTransmission.result.amount,
        unit: "W/K",
        source
      }],
      thermalBridgeCoefficient: {
        amount: thermalBridgeGlobal.result.amount,
        unit: "W/K",
        source
      }
    });
    if (!mc001EnsureFormulaReady(globalTransmissionExcludingGround)) {
      return { ok: false, error: "Inputurile transmisiei globale fara sol sunt invalide." };
    }
    results.globalTransmissionExcludingGround = globalTransmissionExcludingGround;
  }

  if (transmissionInputs.psi_calculation_cases.length > 0) {
    results.psiCases = [];
    for (const psiCase of transmissionInputs.psi_calculation_cases) {
      const result = calculateMc001LinearThermalBridgePsi({
        bridgeId: psiCase.case_id,
        length: { amount: psiCase.length_m, unit: "m" },
        l2d: { amount: psiCase.l2d_w_k, unit: "W/K" },
        referenceElements: psiCase.reference_elements.map((element) => ({
          elementId: element.element_id,
          area: { amount: element.area_m2, unit: "m2" },
          thermalTransmittance: { amount: element.u_w_m2k, unit: "W/(m2*K)" }
        })),
        source: mc001HtrFormulaSource(psiCase.source)
      });
      if (!mc001EnsureFormulaReady(result)) {
        return { ok: false, error: "Inputurile calculului psi sunt invalide." };
      }
      results.psiCases.push({ caseId: psiCase.case_id, ...result });
    }
  }

  if (transmissionInputs.heat_flow_cases.length > 0) {
    results.heatFlowCases = [];
    for (const heatCase of transmissionInputs.heat_flow_cases) {
      const result = calculateMc001TransmissionHeatFlow({
        htr: { amount: heatCase.htr_w_k, unit: "W/K" },
        indoorTemperature: { amount: heatCase.theta_i_c, unit: "degC" },
        outdoorTemperature: { amount: heatCase.theta_e_c, unit: "degC" }
      });
      if (!mc001EnsureFormulaReady(result)) {
        return { ok: false, error: "Inputurile fluxului de transmisie sunt invalide." };
      }
      results.heatFlowCases.push({ caseId: heatCase.case_id, ...result });
    }
  }

  if (transmissionInputs.time_integrated_transmission_cases.length > 0) {
    results.timeIntegratedTransmissionCases = [];
    for (const timeCase of transmissionInputs.time_integrated_transmission_cases) {
      const result = calculateMc001TransmissionEnergyFromHeatFlow({
        htr: { amount: timeCase.htr_w_k, unit: "W/K" },
        indoorTemperature: { amount: timeCase.theta_i_c, unit: "degC" },
        outdoorTemperature: { amount: timeCase.theta_e_c, unit: "degC" },
        duration: { amount: timeCase.duration_h, unit: "h" }
      });
      if (!mc001EnsureFormulaReady(result)) {
        return { ok: false, error: "Inputurile energiei de transmisie sunt invalide." };
      }
      results.timeIntegratedTransmissionCases.push({ caseId: timeCase.case_id, ...result });
    }
  }

  if (transmissionInputs.htr_total_2_15_case) {
    const htrCase = transmissionInputs.htr_total_2_15_case;
    const htrTotalRelation215 = calculateMc001TransmissionTotalCoefficient({
      hd: { amount: htrCase.hd_w_k, unit: "W/K" },
      hg: { amount: htrCase.hg_w_k, unit: "W/K" },
      hu: { amount: htrCase.hu_w_k, unit: "W/K" },
      ha: { amount: htrCase.ha_w_k, unit: "W/K" }
    });
    if (!mc001EnsureFormulaReady(htrTotalRelation215)) {
      return { ok: false, error: "Inputurile Htr 2.15 sunt invalide." };
    }
    results.htrTotalRelation215 = htrTotalRelation215;
  }

  return {
    ok: true,
    value: Object.keys(results).length > 0 ? results : null
  };
}

function parseMc001HtrStoredJson(text, fallback) {
  try {
    return JSON.parse(text);
  } catch {
    return fallback;
  }
}

async function verifyMc001HtrHouseOwnership(env, userId, houseId) {
  if (houseId === null || houseId === undefined || houseId === "") {
    return null;
  }
  const parsedHouseId = Number(houseId);
  if (!Number.isInteger(parsedHouseId) || parsedHouseId <= 0) {
    return { ok: false, error: "house_id invalid." };
  }
  const house = await env.DB.prepare(`
    SELECT id
    FROM houses
    WHERE id = ? AND user_id = ? AND COALESCE(active, 1) = 1
    LIMIT 1
  `)
    .bind(parsedHouseId, userId)
    .first();
  if (!house) {
    return { ok: false, error: "Locuinta nu apartine contului curent." };
  }
  return { ok: true, houseId: parsedHouseId };
}

async function saveMc001HtrAnalysis(env, userId, houseId, sanitizedInput, mc001Htr) {
  const completedAt = new Date().toISOString();
  const analysisResult = await env.DB.prepare(`
    INSERT INTO analyses(user_id, house_id, analysis_type, status, completed_at)
    VALUES(?, ?, ?, 'completed', ?)
  `)
    .bind(userId, houseId, MC001_HTR_VERTICAL_ANALYSIS_TYPE, completedAt)
    .run();
  const analysisId = analysisResult.meta?.last_row_id;
  if (!analysisId) {
    throw new Error("MC001 Htr analysis insert failed");
  }

  await env.DB.prepare(`
    INSERT INTO analysis_answers(analysis_id, question_key, answer_value, answer_group)
    VALUES(?, ?, ?, ?)
  `)
    .bind(
      analysisId,
      MC001_HTR_INPUT_ANSWER_KEY,
      JSON.stringify(sanitizedInput),
      MC001_HTR_VERTICAL_ANALYSIS_TYPE
    )
    .run();

  await env.DB.prepare(`
    INSERT INTO report_snapshots(home_id, analysis_id, generated_at, technical_details_json, confidence_level)
    VALUES(?, ?, ?, ?, ?)
  `)
    .bind(
      houseId,
      analysisId,
      completedAt,
      JSON.stringify({ mc001_htr: mc001Htr, scope: MC001_HTR_RESULT_SCOPE }),
      mc001Htr.status
    )
    .run();

  await env.DB.prepare(`
    INSERT INTO reports(analysis_id, report_type, status)
    VALUES(?, 'mc001_htr_transmission_module', 'completed')
  `)
    .bind(analysisId)
    .run();

  return analysisId;
}

async function loadMc001HtrAnalysis(env, userId, analysisId) {
  const parsedAnalysisId = Number(analysisId);
  if (!Number.isInteger(parsedAnalysisId) || parsedAnalysisId <= 0) {
    return { ok: false, error: "analysis_id invalid." };
  }
  const analysis = await env.DB.prepare(`
    SELECT id, house_id
    FROM analyses
    WHERE id = ? AND user_id = ? AND analysis_type = ?
    LIMIT 1
  `)
    .bind(parsedAnalysisId, userId, MC001_HTR_VERTICAL_ANALYSIS_TYPE)
    .first();
  if (!analysis) {
    return { ok: false, error: "Analiza MC001 Htr nu apartine contului curent." };
  }
  const answer = await env.DB.prepare(`
    SELECT answer_value
    FROM analysis_answers
    WHERE analysis_id = ? AND question_key = ? AND answer_group = ?
    LIMIT 1
  `)
    .bind(parsedAnalysisId, MC001_HTR_INPUT_ANSWER_KEY, MC001_HTR_VERTICAL_ANALYSIS_TYPE)
    .first();
  const snapshot = await env.DB.prepare(`
    SELECT technical_details_json
    FROM report_snapshots
    WHERE analysis_id = ?
    ORDER BY generated_at DESC, id DESC
    LIMIT 1
  `)
    .bind(parsedAnalysisId)
    .first();
  const htrInput = parseMc001HtrStoredJson(answer?.answer_value, null);
  const storedTechnicalDetails = parseMc001HtrStoredJson(
    snapshot?.technical_details_json,
    {}
  );
  const mc001Htr = storedTechnicalDetails.mc001_htr || null;
  if (!htrInput || !mc001Htr) {
    return { ok: false, error: "Analiza MC001 Htr nu are datele salvate complet." };
  }
  return { ok: true, analysis, htrInput, mc001Htr };
}

async function handleMc001HtrRun(request, env, corsHeaders) {
  try {
    const user = await getCurrentUser(request, env);
    if (!user) {
      return jsonResponse(
        { success: false, error: "Trebuie sa fii autentificat pentru a rula MC001 Htr." },
        { status: 401, headers: corsHeaders }
      );
    }

    const body = await readJson(request);
    const ownership = await verifyMc001HtrHouseOwnership(env, user.id, body.house_id);
    if (ownership?.ok === false) {
      return jsonResponse(
        { success: false, error: ownership.error },
        { status: 403, headers: corsHeaders }
      );
    }
    const validation = validateMc001HtrInput(body);
    if (!validation.ok) {
      return jsonResponse(
        { success: false, error: validation.error },
        { status: 400, headers: corsHeaders }
      );
    }

    const h12Input = buildMc001H12InputFromVerticalInput(validation.input);
    const h12Result = calculateMc001HtrTotal(h12Input);
    const mc001Htr = sanitizeMc001HtrResult(h12Result);
    const formulaResults = buildMc001TransmissionFormulaResults(
      validation.input.htr_input.transmission_formula_inputs
    );
    if (!formulaResults.ok) {
      return jsonResponse(
        { success: false, error: formulaResults.error },
        { status: 400, headers: corsHeaders }
      );
    }
    if (formulaResults.value) {
      mc001Htr.transmissionFormulaResults = formulaResults.value;
    }
    const houseId = ownership?.houseId ?? null;
    const analysisId = await saveMc001HtrAnalysis(
      env,
      user.id,
      houseId,
      validation.input,
      mc001Htr
    );

    return jsonResponse(
      {
        success: true,
        analysis_id: analysisId,
        house_id: houseId,
        mc001_htr: mc001Htr
      },
      { headers: corsHeaders }
    );
  } catch {
    return jsonResponse(
      { success: false, error: "Nu am putut rula modulul MC001 Htr." },
      { status: 500, headers: corsHeaders }
    );
  }
}

async function handleMc001HtrLoad(request, env, corsHeaders) {
  try {
    const user = await getCurrentUser(request, env);
    if (!user) {
      return jsonResponse(
        { success: false, error: "Trebuie sa fii autentificat pentru a incarca analiza MC001 Htr." },
        { status: 401, headers: corsHeaders }
      );
    }
    const body = await readJson(request);
    const loaded = await loadMc001HtrAnalysis(env, user.id, body.analysis_id);
    if (!loaded.ok) {
      return jsonResponse(
        { success: false, error: loaded.error },
        { status: 404, headers: corsHeaders }
      );
    }
    return jsonResponse(
      {
        success: true,
        analysis_id: loaded.analysis.id,
        house_id: loaded.analysis.house_id ?? null,
        htr_input: loaded.htrInput.htr_input,
        mc001_htr: loaded.mc001Htr
      },
      { headers: corsHeaders }
    );
  } catch {
    return jsonResponse(
      { success: false, error: "Nu am putut incarca analiza MC001 Htr." },
      { status: 500, headers: corsHeaders }
    );
  }
}

async function saveHouse(request, env, corsHeaders) {
  const user = await getCurrentUser(request, env);
  if (!user) {
    return jsonResponse(
      { success: false, error: "Trebuie sa fii autentificat pentru a salva analiza." },
      { status: 401, headers: corsHeaders }
    );
  }

  const body = await readJson(request);
  const analysisType = inferAnalysisType(body, user);
  if (analysisType === "auditor") {
    return jsonResponse(
      { success: false, error: "Auditorii folosesc portalul dedicat, nu fluxul standard de analiză." },
      { status: 403, headers: corsHeaders }
    );
  }

  const houseResult = await env.DB.prepare(`
    INSERT INTO houses(user_id, house_type, surface, rooms, year, city, display_name, active, analysis_purpose)
    VALUES(?, ?, ?, ?, ?, ?, ?, 1, ?)
  `)
    .bind(
      user.id,
      value(body, "house_type") || value(body, "business_type") || value(body, "industry_type") || value(body, "institution_type"),
      numberValue(body, "surface") || numberValue(body, "useful_area_m2") || numberValue(body, "building_area"),
      numberValue(body, "rooms"),
      numberValue(body, "year") || numberValue(body, "construction_year") || numberValue(body, "building_year"),
      value(body, "city"),
      displayNameForHouse(body),
      value(body, "analysis_purpose")
    )
    .run();
  const houseId = houseResult.meta?.last_row_id;
  if (!houseId) throw new Error("House insert did not return an id");

  const siteResult = await env.DB.prepare("INSERT INTO sites(user_id, name, city) VALUES(?, ?, ?)")
    .bind(user.id, value(body, "site_name") || "Locuință principală", value(body, "city"))
    .run();
  const siteId = siteResult.meta?.last_row_id;

  const buildingResult = await env.DB.prepare(`
    INSERT INTO buildings(site_id, house_id, building_type, area, construction_year, heating_type, climate_region)
    VALUES(?, ?, ?, ?, ?, ?, ?)
  `)
    .bind(
      siteId,
      houseId,
      value(body, "house_type") || value(body, "business_type") || value(body, "industry_type") || value(body, "institution_type"),
      numberValue(body, "surface") || numberValue(body, "useful_area_m2") || numberValue(body, "building_area"),
      numberValue(body, "year") || numberValue(body, "construction_year") || numberValue(body, "building_year"),
      value(body, "heating") || value(body, "heating_source"),
      value(body, "climate_region")
    )
    .run();
  const buildingId = buildingResult.meta?.last_row_id;

  const analysisResult = await env.DB.prepare(`
    INSERT INTO analyses(user_id, site_id, building_id, house_id, analysis_type, status, completed_at)
    VALUES(?, ?, ?, ?, ?, 'completed', ?)
  `)
    .bind(user.id, siteId, buildingId, houseId, analysisType, new Date().toISOString())
    .run();
  const analysisId = analysisResult.meta?.last_row_id;
  const energyProfile = analysisType === "residential" ? buildEnergyProfile(body) : null;
  const scorePhysicalResult = analysisType === "residential"
    ? safeBuildPhysicalEnergyResult({ ...body, house_id: houseId })
    : null;
  const scoreEnergyClass = scorePhysicalResult?.classificationV06?.estimatedEnergyClass;
  const score = energyProfile
    ? {
      overall_score: energyProfile.assessment.score,
      building_efficiency: clampScore(100 - energyProfile.assessment.topProblems.filter(item => ["walls", "roof", "floor", "windows"].includes(item.area)).length * 15),
      consumption_efficiency: clampScore(100 - ((energyProfile.derived.demand.estimatedFinalEnergyKwhM2Year || 160) - 80) / 2),
      behavior: energyProfile.derived.systems.heating.controlQuality === "smart" ? 85 : energyProfile.derived.systems.heating.controlQuality === "none" ? 45 : 65,
      equipment: energyProfile.derived.systems.heating.quality === "very_good" ? 90 : energyProfile.derived.systems.heating.quality === "good" ? 75 : energyProfile.derived.systems.heating.quality === "poor" ? 40 : 60,
      green_energy: energyProfile.input.renewables.photovoltaic.installed === "yes" ? 80 : 45,
      smart_optimization: energyProfile.derived.systems.heating.controlQuality === "smart" ? 85 : 55,
      estimated_energy_class: scoreEnergyClass || "unknown"
    }
    : calculateScore(body, analysisType);
  const percentile = clampScore(100 - score.overall_score + 44);

  const batch = [
    env.DB.prepare(`
      INSERT INTO household_profiles(
        house_id, consumer_type, people_count, children_count, senior_count,
        work_from_home, work_from_home_days, occupancy_pattern, frequent_travel
      )
      VALUES(?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).bind(
      houseId,
      value(body, "consumer_type"),
      numberValue(body, "people_count"),
      numberValue(body, "children_count"),
      numberValue(body, "senior_count"),
      value(body, "work_from_home"),
      numberValue(body, "work_from_home_days"),
      value(body, "occupancy_pattern"),
      value(body, "frequent_travel")
    ),
    env.DB.prepare(`
      INSERT INTO building_features(
        house_id, built_surface, floors, bathrooms, ceiling_height,
        basement, attic, mansard, garage
      )
      VALUES(?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).bind(
      houseId,
      numberValue(body, "built_surface"),
      numberValue(body, "floors"),
      numberValue(body, "bathrooms"),
      numberValue(body, "ceiling_height"),
      value(body, "basement"),
      value(body, "attic"),
      value(body, "mansard"),
      value(body, "garage")
    ),
    env.DB.prepare("INSERT INTO envelope_profiles(house_id, wall_material, wall_thickness, wall_insulation, windows) VALUES(?, ?, ?, ?, ?)")
      .bind(houseId, value(body, "wall_material"), numberValue(body, "wall_thickness"), value(body, "wall_insulation"), value(body, "windows")),
    env.DB.prepare(`
      INSERT INTO energy_profiles(
        house_id, heating, temperature_day, temperature_night,
        smart_thermostat, provider, monthly_bill, monthly_kwh
      )
      VALUES(?, ?, ?, ?, ?, ?, ?, ?)
    `).bind(
      houseId,
      value(body, "heating"),
      numberValue(body, "temperature_day"),
      numberValue(body, "temperature_night"),
      value(body, "smart_thermostat"),
      value(body, "provider"),
      numberValue(body, "monthly_bill"),
      numberValue(body, "monthly_kwh")
    ),
    env.DB.prepare("INSERT INTO appliances(house_id, fridge_class, washer_class, dryer, dishwasher) VALUES(?, ?, ?, ?, ?)")
      .bind(houseId, value(body, "fridge_class"), value(body, "washer_class"), boolValue(body, "dryer"), null),
    env.DB.prepare("INSERT INTO billing_documents(house_id, invoice_file_name) VALUES(?, ?)")
      .bind(houseId, value(body, "invoice_pdf")),
    env.DB.prepare("INSERT INTO green_mobility_profiles(house_id, solar_panels, installed_power, electric_car) VALUES(?, ?, ?, ?)")
      .bind(houseId, value(body, "solar_panels"), numberValue(body, "installed_power"), value(body, "electric_car")),
    ...Object.entries(body).map(([key, answer]) =>
      env.DB.prepare("INSERT INTO analysis_answers(analysis_id, question_key, answer_value, answer_group) VALUES(?, ?, ?, ?)")
        .bind(analysisId, key, answer === null || answer === undefined ? null : String(answer), analysisType)
    ),
    env.DB.prepare(`
      INSERT INTO scores(
        analysis_id, overall_score, building_efficiency, consumption_efficiency,
        behavior, equipment, green_energy, smart_optimization,
        estimated_energy_class, disclaimer
      )
      VALUES(?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).bind(
      analysisId,
      score.overall_score,
      score.building_efficiency,
      score.consumption_efficiency,
      score.behavior,
      score.equipment,
      score.green_energy,
      score.smart_optimization,
      score.estimated_energy_class,
      energyProfile?.metadata.disclaimer || ENERGY_CLASS_DISCLAIMER
    ),
    env.DB.prepare("INSERT INTO benchmark_results(analysis_id, benchmark_group_id, percentile, cluster_average, score_comparison) VALUES(?, NULL, ?, ?, ?)")
      .bind(analysisId, percentile, 68, score.overall_score - 68),
    env.DB.prepare("INSERT INTO reports(analysis_id, report_type, status) VALUES(?, 'energy_intelligence_pdf', 'planned')")
      .bind(analysisId)
  ];

  await env.DB.batch(batch);
  return jsonResponse({ success: true, house_id: houseId, analysis_id: analysisId, score: score.overall_score }, { headers: corsHeaders });
}

async function latestAnalysisForHouse(env, userId, houseId) {
  return env.DB.prepare(`
    SELECT analyses.id, analyses.house_id, analyses.analysis_type
    FROM analyses
    JOIN houses ON houses.id = analyses.house_id
    WHERE analyses.user_id = ? AND analyses.house_id = ?
      AND analyses.status = 'completed'
      AND COALESCE(houses.active, 1) = 1
    ORDER BY analyses.completed_at DESC, analyses.id DESC
    LIMIT 1
  `)
    .bind(userId, houseId)
    .first();
}

async function latestAnswers(env, analysisId) {
  const answers = await env.DB.prepare(`
    SELECT question_key, answer_value
    FROM analysis_answers
    WHERE analysis_id = ?
  `)
    .bind(analysisId)
    .all();
  return Object.fromEntries((answers.results || []).map(row => [row.question_key, row.answer_value]));
}

async function houseProfile(request, env, corsHeaders) {
  const user = await getCurrentUser(request, env);
  if (!user) {
    return jsonResponse({ success: false, error: "Trebuie sa fii autentificat." }, { status: 401, headers: corsHeaders });
  }

  const body = await readJson(request);
  const houseId = numberValue(body, "house_id");
  if (!houseId) {
    return jsonResponse({ success: false, error: "Lipseste locuinta." }, { status: 400, headers: corsHeaders });
  }

  const house = await env.DB.prepare(`
    SELECT id, display_name, city, surface, year, house_type, analysis_purpose
    FROM houses
    WHERE id = ? AND user_id = ? AND COALESCE(active, 1) = 1
    LIMIT 1
  `)
    .bind(houseId, user.id)
    .first();
  if (!house) {
    return jsonResponse({ success: false, error: "Locuinta nu apartine contului curent." }, { status: 403, headers: corsHeaders });
  }

  const analysis = await latestAnalysisForHouse(env, user.id, houseId);
  const answers = analysis ? await latestAnswers(env, analysis.id) : {};
  const bills = await env.DB.prepare(`
    SELECT billing_month, electricity_cost_ron, gas_cost_ron, wood_cost_ron, pellets_cost_ron, other_cost_ron, reading_type, is_regularization, notes
    FROM house_monthly_bills
    WHERE user_id = ? AND house_id = ?
    ORDER BY billing_month DESC
    LIMIT 12
  `)
    .bind(user.id, houseId)
    .all();

  return jsonResponse({ success: true, house, analysis, answers, bills: bills.results || [] }, { headers: corsHeaders });
}

async function createAnalysisVersion(env, user, body, houseId, analysisType, changeSummary = "Profil locuinta actualizat") {
  const siteResult = await env.DB.prepare("INSERT INTO sites(user_id, name, city) VALUES(?, ?, ?)")
    .bind(user.id, value(body, "site_name") || displayNameForHouse(body, houseId), value(body, "city"))
    .run();
  const siteId = siteResult.meta?.last_row_id;

  const buildingResult = await env.DB.prepare(`
    INSERT INTO buildings(site_id, house_id, building_type, area, construction_year, heating_type, climate_region)
    VALUES(?, ?, ?, ?, ?, ?, ?)
  `)
    .bind(
      siteId,
      houseId,
      value(body, "house_type") || value(body, "building_type"),
      numberValue(body, "surface") || numberValue(body, "useful_area_m2"),
      numberValue(body, "year") || numberValue(body, "construction_year"),
      value(body, "heating") || value(body, "heating_source"),
      value(body, "climate_region")
    )
    .run();
  const buildingId = buildingResult.meta?.last_row_id;

  const analysisResult = await env.DB.prepare(`
    INSERT INTO analyses(user_id, site_id, building_id, house_id, analysis_type, status, completed_at)
    VALUES(?, ?, ?, ?, ?, 'completed', ?)
  `)
    .bind(user.id, siteId, buildingId, houseId, analysisType, new Date().toISOString())
    .run();
  const analysisId = analysisResult.meta?.last_row_id;
  const energyProfile = analysisType === "residential" ? buildEnergyProfile(body) : null;
  const scorePhysicalResult = analysisType === "residential"
    ? safeBuildPhysicalEnergyResult({ ...body, house_id: houseId })
    : null;
  const scoreEnergyClass = scorePhysicalResult?.classificationV06?.estimatedEnergyClass;
  const score = energyProfile
    ? {
      overall_score: energyProfile.assessment.score,
      building_efficiency: clampScore(100 - energyProfile.assessment.topProblems.filter(item => ["walls", "roof", "floor", "windows"].includes(item.area)).length * 15),
      consumption_efficiency: clampScore(100 - ((energyProfile.derived.demand.estimatedFinalEnergyKwhM2Year || 160) - 80) / 2),
      behavior: energyProfile.derived.systems.heating.controlQuality === "smart" ? 85 : energyProfile.derived.systems.heating.controlQuality === "none" ? 45 : 65,
      equipment: energyProfile.derived.systems.heating.quality === "very_good" ? 90 : energyProfile.derived.systems.heating.quality === "good" ? 75 : energyProfile.derived.systems.heating.quality === "poor" ? 40 : 60,
      green_energy: energyProfile.input.renewables.photovoltaic.installed === "yes" ? 80 : 45,
      smart_optimization: energyProfile.derived.systems.heating.controlQuality === "smart" ? 85 : 55,
      estimated_energy_class: scoreEnergyClass || "unknown"
    }
    : calculateScore(body, analysisType);
  const percentile = clampScore(100 - score.overall_score + 44);

  const answerStatements = Object.entries(body).map(([key, answer]) =>
    env.DB.prepare("INSERT INTO analysis_answers(analysis_id, question_key, answer_value, answer_group) VALUES(?, ?, ?, ?)")
      .bind(analysisId, key, answer === null || answer === undefined ? null : String(answer), analysisType)
  );

  await env.DB.batch([
    ...answerStatements,
    env.DB.prepare(`
      INSERT INTO scores(
        analysis_id, overall_score, building_efficiency, consumption_efficiency,
        behavior, equipment, green_energy, smart_optimization,
        estimated_energy_class, disclaimer
      )
      VALUES(?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).bind(
      analysisId,
      score.overall_score,
      score.building_efficiency,
      score.consumption_efficiency,
      score.behavior,
      score.equipment,
      score.green_energy,
      score.smart_optimization,
      score.estimated_energy_class,
      energyProfile?.metadata.disclaimer || ENERGY_CLASS_DISCLAIMER
    ),
    env.DB.prepare("INSERT INTO benchmark_results(analysis_id, benchmark_group_id, percentile, cluster_average, score_comparison) VALUES(?, NULL, ?, ?, ?)")
      .bind(analysisId, percentile, 68, score.overall_score - 68),
    env.DB.prepare("INSERT INTO reports(analysis_id, report_type, status) VALUES(?, 'energy_intelligence_pdf', 'planned')")
      .bind(analysisId),
    env.DB.prepare("INSERT INTO house_change_log(user_id, house_id, change_type, summary) VALUES(?, ?, 'profile_update', ?)")
      .bind(user.id, houseId, changeSummary)
  ]);

  return { analysisId, score: score.overall_score, profile: energyProfile };
}

async function updateHouse(request, env, corsHeaders) {
  const user = await getCurrentUser(request, env);
  if (!user) {
    return jsonResponse({ success: false, error: "Trebuie sa fii autentificat pentru a edita locuinta." }, { status: 401, headers: corsHeaders });
  }

  const body = await readJson(request);
  const houseId = numberValue(body, "house_id");
  if (!houseId) {
    return jsonResponse({ success: false, error: "Lipseste locuinta." }, { status: 400, headers: corsHeaders });
  }

  const house = await env.DB.prepare("SELECT id FROM houses WHERE id = ? AND user_id = ? AND COALESCE(active, 1) = 1 LIMIT 1")
    .bind(houseId, user.id)
    .first();
  if (!house) {
    return jsonResponse({ success: false, error: "Locuinta nu apartine contului curent." }, { status: 403, headers: corsHeaders });
  }

  await env.DB.prepare(`
    UPDATE houses
    SET display_name = ?, city = ?, surface = ?, year = ?, house_type = ?, analysis_purpose = ?
    WHERE id = ? AND user_id = ?
  `)
    .bind(
      displayNameForHouse(body, houseId),
      value(body, "city"),
      numberValue(body, "surface") || numberValue(body, "useful_area_m2"),
      numberValue(body, "year") || numberValue(body, "construction_year"),
      value(body, "house_type") || value(body, "building_type"),
      value(body, "analysis_purpose"),
      houseId,
      user.id
    )
    .run();

  const result = await createAnalysisVersion(env, user, body, houseId, inferAnalysisType(body, user), "Datele locuintei au fost revizuite");
  return jsonResponse({ success: true, house_id: houseId, analysis_id: result.analysisId, score: result.score }, { headers: corsHeaders });
}

async function simulateHouse(request, env, corsHeaders) {
  const user = await getCurrentUser(request, env);
  const body = await readJson(request);
  const houseId = numberValue(body, "house_id");
  const newProfile = buildEnergyProfile(body);
  let oldProfile = null;

  if (user && houseId) {
    const analysis = await latestAnalysisForHouse(env, user.id, houseId);
    if (analysis) {
      oldProfile = buildEnergyProfile(await latestAnswers(env, analysis.id));
    }
  }

  const comparison = oldProfile
    ? {
      oldScore: oldProfile.assessment.score,
      newScore: newProfile.assessment.score,
      scoreDelta: newProfile.assessment.score - oldProfile.assessment.score,
      oldSavingsMinRon: oldProfile.assessment.estimatedAnnualSavingsMinRon,
      oldSavingsMaxRon: oldProfile.assessment.estimatedAnnualSavingsMaxRon,
      newSavingsMinRon: newProfile.assessment.estimatedAnnualSavingsMinRon,
      newSavingsMaxRon: newProfile.assessment.estimatedAnnualSavingsMaxRon,
      savingsDeltaMinRon: (newProfile.assessment.estimatedAnnualSavingsMinRon || 0) - (oldProfile.assessment.estimatedAnnualSavingsMinRon || 0),
      savingsDeltaMaxRon: (newProfile.assessment.estimatedAnnualSavingsMaxRon || 0) - (oldProfile.assessment.estimatedAnnualSavingsMaxRon || 0)
    }
    : null;

  const generatedAt = new Date().toISOString();
  const physicalResult = buildPhysicalEnergyResult(body);
  const reportSnapshot = buildReportSnapshot(newProfile, body, null, generatedAt, physicalResult);
  const algorithmInsights = buildAlgorithmInsights(newProfile, null, {}, {}, generatedAt, physicalResult);

  return jsonResponse({
    success: true,
    simulated: true,
    guest: !user,
    has_report: true,
    generated_at: generatedAt,
    profile: newProfile,
    old_profile: oldProfile,
    comparison,
    physical_result: physicalResult,
    report_snapshot: reportSnapshot,
    algorithm_insights: algorithmInsights
  }, { headers: corsHeaders });
}

async function monthlyBill(request, env, corsHeaders) {
  const user = await getCurrentUser(request, env);
  if (!user) {
    return jsonResponse({ success: false, error: "Trebuie sa fii autentificat pentru a salva factura." }, { status: 401, headers: corsHeaders });
  }
  const body = await readJson(request);
  const houseId = numberValue(body, "house_id");
  const billingMonth = value(body, "billing_month");
  if (!houseId || !billingMonth) {
    return jsonResponse({ success: false, error: "Lipseste locuinta sau luna facturii." }, { status: 400, headers: corsHeaders });
  }
  const house = await env.DB.prepare("SELECT id FROM houses WHERE id = ? AND user_id = ? AND COALESCE(active, 1) = 1 LIMIT 1")
    .bind(houseId, user.id)
    .first();
  if (!house) {
    return jsonResponse({ success: false, error: "Locuinta nu apartine contului curent." }, { status: 403, headers: corsHeaders });
  }

  await env.DB.prepare(`
    INSERT INTO house_monthly_bills(
      user_id, house_id, billing_month, electricity_cost_ron, gas_cost_ron,
      wood_cost_ron, pellets_cost_ron, other_cost_ron, reading_type, is_regularization, notes
    )
    VALUES(?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `)
    .bind(
      user.id,
      houseId,
      billingMonth,
      numberValue(body, "electricity_cost_ron") || 0,
      numberValue(body, "gas_cost_ron") || 0,
      numberValue(body, "wood_cost_ron") || 0,
      numberValue(body, "pellets_cost_ron") || 0,
      numberValue(body, "other_cost_ron") || 0,
      value(body, "reading_type") || "actual",
      value(body, "is_regularization") === "yes" ? 1 : 0,
      value(body, "notes")
    )
    .run();

  await env.DB.prepare("INSERT INTO house_change_log(user_id, house_id, change_type, summary) VALUES(?, ?, 'monthly_bill', ?)")
    .bind(user.id, houseId, `Factura adaugata pentru ${billingMonth}`)
    .run();

  const bills = await env.DB.prepare(`
    SELECT billing_month, electricity_cost_ron, gas_cost_ron, wood_cost_ron, pellets_cost_ron, other_cost_ron, reading_type, is_regularization, notes
    FROM house_monthly_bills
    WHERE user_id = ? AND house_id = ?
    ORDER BY billing_month DESC
    LIMIT 12
  `)
    .bind(user.id, houseId)
    .all();

  return jsonResponse({ success: true, bill_analysis: analyzeBillingHistory(bills.results || []) }, { headers: corsHeaders });
}

async function adminOverview(request, env, corsHeaders) {
  const user = await getCurrentUser(request, env);
  if (!requireAdmin(user)) {
    return jsonResponse(
      { success: false, error: "Accesul este disponibil doar pentru administratori." },
      { status: 403, headers: corsHeaders }
    );
  }

  const [usersCount, housesCount, analysesCount, billsCount, pendingOffersCount] = await Promise.all([
    env.DB.prepare("SELECT COUNT(*) AS count FROM users").first(),
    env.DB.prepare("SELECT COUNT(*) AS count FROM houses WHERE COALESCE(active, 1) = 1").first(),
    env.DB.prepare("SELECT COUNT(*) AS count FROM analyses WHERE status = 'completed'").first(),
    env.DB.prepare("SELECT COUNT(*) AS count FROM house_monthly_bills").first(),
    env.DB.prepare("SELECT COUNT(*) AS count FROM provider_offers WHERE status = 'submitted'").first()
  ]);

  const houses = await env.DB.prepare(`
    SELECT
      houses.id,
      houses.display_name,
      houses.city,
      houses.surface,
      houses.year,
      houses.house_type,
      houses.analysis_purpose,
      users.email AS user_email,
      latest.analysis_id,
      latest.completed_at,
      scores.overall_score,
      scores.estimated_energy_class
    FROM houses
    LEFT JOIN users ON users.id = houses.user_id
    LEFT JOIN (
      SELECT house_id, MAX(id) AS analysis_id, MAX(completed_at) AS completed_at
      FROM analyses
      WHERE status = 'completed'
      GROUP BY house_id
    ) latest ON latest.house_id = houses.id
    LEFT JOIN scores ON scores.analysis_id = latest.analysis_id
    WHERE COALESCE(houses.active, 1) = 1
    ORDER BY houses.id DESC
    LIMIT 200
  `).all();

  const analysisIds = (houses.results || []).map(row => row.analysis_id).filter(Boolean);
  let answers = [];
  if (analysisIds.length) {
    const placeholders = analysisIds.map(() => "?").join(",");
    const result = await env.DB.prepare(`
      SELECT analysis_id, question_key, answer_value
      FROM analysis_answers
      WHERE analysis_id IN (${placeholders})
        AND question_key IN (
          'heating_source', 'heating_system_type', 'building_type', 'wall_insulation',
          'roof_insulated', 'window_type', 'pv_installed', 'monthly_electricity_cost',
          'monthly_gas_cost', 'annual_wood_cost', 'analysis_purpose'
        )
    `).bind(...analysisIds).all();
    answers = result.results || [];
  }

  const answersByAnalysis = new Map();
  answers.forEach(row => {
    if (!answersByAnalysis.has(row.analysis_id)) answersByAnalysis.set(row.analysis_id, {});
    answersByAnalysis.get(row.analysis_id)[row.question_key] = row.answer_value;
  });

  const rows = (houses.results || []).map(row => ({
    ...row,
    answers: answersByAnalysis.get(row.analysis_id) || {}
  }));

  function distribution(key, values) {
    const counts = {};
    values.forEach(value => {
      const normalized = value || "unknown";
      counts[normalized] = (counts[normalized] || 0) + 1;
    });
    return Object.entries(counts)
      .map(([label, count]) => ({ label, count }))
      .sort((a, b) => b.count - a.count);
  }

  const validScores = rows.map(row => Number(row.overall_score)).filter(Number.isFinite);
  const scoreAverage = validScores.length
    ? Math.round(validScores.reduce((sum, score) => sum + score, 0) / validScores.length)
    : null;

  const monthlyBills = await env.DB.prepare(`
    SELECT billing_month, SUM(electricity_cost_ron + gas_cost_ron + wood_cost_ron + pellets_cost_ron + other_cost_ron) AS total_cost
    FROM house_monthly_bills
    GROUP BY billing_month
    ORDER BY billing_month DESC
    LIMIT 12
  `).all();

  return jsonResponse(
    {
      success: true,
      admin: user,
      metrics: {
        users: usersCount?.count || 0,
        houses: housesCount?.count || 0,
        analyses: analysesCount?.count || 0,
        bills: billsCount?.count || 0,
        pendingOffers: pendingOffersCount?.count || 0,
        scoreAverage
      },
      distributions: {
        classes: distribution("estimated_energy_class", rows.map(row => row.estimated_energy_class)),
        heatingSources: distribution("heating_source", rows.map(row => row.answers.heating_source)),
        buildingTypes: distribution("building_type", rows.map(row => row.answers.building_type || row.house_type)),
        analysisPurpose: distribution("analysis_purpose", rows.map(row => row.analysis_purpose || row.answers.analysis_purpose))
      },
      monthlyBills: monthlyBills.results || [],
      houses: rows
    },
    { headers: corsHeaders }
  );
}

async function adminDataset(request, env, corsHeaders) {
  const user = await getCurrentUser(request, env);
  if (!requireAdmin(user)) {
    return jsonResponse(
      { success: false, error: "Accesul este disponibil doar pentru administratori." },
      { status: 403, headers: corsHeaders }
    );
  }

  const body = await readJson(request);
  const limit = Math.max(1, Math.min(1000, numberValue(body, "limit") || 500));
  const tableQueries = {
    users: `
      SELECT id, email, name, role, account_type, created_at
      FROM users
      ORDER BY id DESC
      LIMIT ?
    `,
    houses: `
      SELECT *
      FROM houses
      ORDER BY id DESC
      LIMIT ?
    `,
    analyses: `
      SELECT *
      FROM analyses
      ORDER BY id DESC
      LIMIT ?
    `,
    analysis_answers: `
      SELECT *
      FROM analysis_answers
      ORDER BY id DESC
      LIMIT ?
    `,
    scores: `
      SELECT *
      FROM scores
      ORDER BY id DESC
      LIMIT ?
    `,
    benchmark_results: `
      SELECT *
      FROM benchmark_results
      ORDER BY id DESC
      LIMIT ?
    `,
    reports: `
      SELECT *
      FROM reports
      ORDER BY id DESC
      LIMIT ?
    `,
    monthly_bills: `
      SELECT *
      FROM house_monthly_bills
      ORDER BY id DESC
      LIMIT ?
    `,
    recommendation_actions: `
      SELECT *
      FROM recommendation_actions
      ORDER BY id DESC
      LIMIT ?
    `,
    savings_events: `
      SELECT *
      FROM savings_events
      ORDER BY id DESC
      LIMIT ?
    `,
    service_providers: `
      SELECT *
      FROM service_providers
      ORDER BY id DESC
      LIMIT ?
    `,
    provider_offers: `
      SELECT
        provider_offers.*,
        service_providers.company_name,
        service_providers.provider_type,
        service_providers.service_area
      FROM provider_offers
      LEFT JOIN service_providers ON service_providers.id = provider_offers.provider_id
      ORDER BY provider_offers.id DESC
      LIMIT ?
    `,
    house_change_log: `
      SELECT *
      FROM house_change_log
      ORDER BY id DESC
      LIMIT ?
    `,
    joined_houses: `
      SELECT
        houses.id AS house_id,
        houses.user_id,
        users.email AS user_email,
        houses.display_name,
        houses.city,
        houses.surface,
        houses.year,
        houses.house_type,
        houses.active,
        houses.analysis_purpose,
        latest.analysis_id,
        latest.completed_at,
        scores.overall_score,
        scores.building_efficiency,
        scores.consumption_efficiency,
        scores.behavior,
        scores.equipment,
        scores.green_energy,
        scores.smart_optimization,
        scores.estimated_energy_class
      FROM houses
      LEFT JOIN users ON users.id = houses.user_id
      LEFT JOIN (
        SELECT house_id, MAX(id) AS analysis_id, MAX(completed_at) AS completed_at
        FROM analyses
        GROUP BY house_id
      ) latest ON latest.house_id = houses.id
      LEFT JOIN scores ON scores.analysis_id = latest.analysis_id
      ORDER BY houses.id DESC
      LIMIT ?
    `
  };

  const tableNames = Object.keys(tableQueries);
  const datasets = {};
  for (const table of tableNames) {
    const result = await env.DB.prepare(tableQueries[table]).bind(limit).all();
    datasets[table] = result.results || [];
  }

  const answerKeys = await env.DB.prepare(`
    SELECT question_key, COUNT(*) AS count
    FROM analysis_answers
    GROUP BY question_key
    ORDER BY count DESC, question_key ASC
    LIMIT 200
  `).all();

  return jsonResponse(
    {
      success: true,
      limit,
      tables: tableNames,
      datasets,
      answerKeys: answerKeys.results || [],
      notes: [
        "password_hash si tokenurile de sesiune nu sunt expuse in admin UI.",
        "Seturile sunt limitate pentru performanta; creste limit pana la 1000 daca ai nevoie."
      ]
    },
    { headers: corsHeaders }
  );
}

async function dashboardSummary(request, env, corsHeaders) {
  const user = await getCurrentUser(request, env);
  const body = await readJson(request);
  const requestedHouseId = numberValue(body, "house_id");
  const locked = {
    success: true,
    authenticated: Boolean(user),
    has_analysis: false,
    user,
    message: "Completează analiza pentru a debloca scorul energetic, benchmark-ul și recomandările personalizate."
  };

  if (!user) return jsonResponse(locked, { headers: corsHeaders });

  const houseFilter = requestedHouseId ? "AND analyses.house_id = ?" : "";
  const summaryStatement = env.DB.prepare(`
    SELECT
      analyses.id AS analysis_id,
      analyses.house_id,
      analyses.analysis_type,
      houses.display_name,
      scores.overall_score,
      scores.building_efficiency,
      scores.consumption_efficiency,
      scores.behavior,
      scores.equipment,
      scores.green_energy,
      scores.smart_optimization,
      scores.estimated_energy_class,
      scores.disclaimer,
      benchmark_results.percentile,
      benchmark_results.cluster_average,
      benchmark_results.score_comparison,
      COUNT(recommendation_actions.id) AS implemented_actions
    FROM analyses
    LEFT JOIN houses ON houses.id = analyses.house_id
    LEFT JOIN scores ON scores.analysis_id = analyses.id
    LEFT JOIN benchmark_results ON benchmark_results.analysis_id = analyses.id
    LEFT JOIN recommendation_actions ON recommendation_actions.house_id = analyses.house_id
      AND recommendation_actions.user_id = analyses.user_id
      AND recommendation_actions.status = 'implemented'
    WHERE analyses.user_id = ? AND analyses.status = 'completed' ${houseFilter}
      AND COALESCE(houses.active, 1) = 1
    GROUP BY analyses.id
    ORDER BY analyses.completed_at DESC, analyses.id DESC
    LIMIT 1
  `);
  const summary = requestedHouseId
    ? await summaryStatement.bind(user.id, requestedHouseId).first()
    : await summaryStatement.bind(user.id).first();

  if (!summary || summary.overall_score === null) {
    return jsonResponse(locked, { headers: corsHeaders });
  }
  summary.overall_score = clampScore(summary.overall_score + (summary.implemented_actions || 0) * 3);
  const summaryAnswersByAnalysis = await answersByAnalysisIds(env, [summary.analysis_id]);
  const summaryAnswers = summaryAnswersByAnalysis.get(summary.analysis_id) || {};
  const summaryPhysicsClass = physicsClassFromRawInput({
    ...summaryAnswers,
    house_id: summary.house_id
  }, "unknown");
  summary.estimated_energy_class = summaryPhysicsClass.className;
  summary.estimated_energy_class_source = summaryPhysicsClass.source;

  return jsonResponse({ success: true, authenticated: true, has_analysis: true, user, summary }, { headers: corsHeaders });
}

async function energyReport(request, env, corsHeaders) {
  const user = await getCurrentUser(request, env);
  if (!user) {
    return jsonResponse(
      { success: false, error: "Trebuie să fii autentificat pentru a vedea raportul." },
      { status: 401, headers: corsHeaders }
    );
  }

  const body = await readJson(request);
  const requestedHouseId = numberValue(body, "house_id");
  const adminHouseId = numberValue(body, "admin_house_id");
  if (adminHouseId && !requireAdmin(user)) {
    return jsonResponse(
      { success: false, error: "Acces disponibil doar pentru administratori." },
      { status: 403, headers: corsHeaders }
    );
  }
  const selectedHouseId = adminHouseId || requestedHouseId;
  const analysisStatement = adminHouseId
    ? env.DB.prepare(`
      SELECT analyses.id, analyses.user_id, analyses.house_id, analyses.analysis_type
      FROM analyses
      LEFT JOIN houses ON houses.id = analyses.house_id
      WHERE analyses.house_id = ? AND analyses.status = 'completed'
        AND COALESCE(houses.active, 1) = 1
      ORDER BY analyses.completed_at DESC, analyses.id DESC
      LIMIT 1
    `)
    : env.DB.prepare(`
      SELECT analyses.id, analyses.user_id, analyses.house_id, analyses.analysis_type
      FROM analyses
      LEFT JOIN houses ON houses.id = analyses.house_id
      WHERE analyses.user_id = ? AND analyses.status = 'completed' ${requestedHouseId ? "AND analyses.house_id = ?" : ""}
        AND COALESCE(houses.active, 1) = 1
      ORDER BY analyses.completed_at DESC, analyses.id DESC
      LIMIT 1
    `);
  const analysis = adminHouseId
    ? await analysisStatement.bind(adminHouseId).first()
    : requestedHouseId
      ? await analysisStatement.bind(user.id, requestedHouseId).first()
      : await analysisStatement.bind(user.id).first();

  if (!analysis) {
    return jsonResponse(
      { success: true, has_report: false, message: "Completează analiza locuinței pentru a genera raportul estimativ." },
      { headers: corsHeaders }
    );
  }

  const answers = await env.DB.prepare(`
    SELECT question_key, answer_value
    FROM analysis_answers
    WHERE analysis_id = ?
  `)
    .bind(analysis.id)
    .all();
  const dataOwnerUserId = adminHouseId ? analysis.user_id : user.id;
  const rawInput = Object.fromEntries((answers.results || []).map(row => [row.question_key, row.answer_value]));
  const profile = buildEnergyProfile(rawInput);
  const implemented = await env.DB.prepare(`
    SELECT recommendation_id, implemented_at
    FROM recommendation_actions
    WHERE user_id = ? AND house_id = ? AND status = 'implemented'
  `)
    .bind(dataOwnerUserId, selectedHouseId || analysis.house_id)
    .all();
  const implementedRows = implemented.results || [];
  const implementedIds = implementedRows.map(row => row.recommendation_id);
  if (implementedIds.length) {
    profile.assessment.score = clampScore(profile.assessment.score + implementedIds.length * 3);
    profile.assessment.estimatedEnergyClass = estimateEnergyClass(profile.assessment.score);
    profile.assessment.mainConclusion = `${profile.assessment.mainConclusion} Ai implementat ${implementedIds.length} decizie${implementedIds.length === 1 ? "" : "i"} din recomandări.`;
  }

  const benchmark = await env.DB.prepare(`
    SELECT percentile, cluster_average, score_comparison
    FROM benchmark_results
    WHERE analysis_id = ?
    ORDER BY id DESC
    LIMIT 1
  `)
    .bind(analysis.id)
    .first();

  const reportBills = await env.DB.prepare(`
    SELECT billing_month, electricity_cost_ron, gas_cost_ron, wood_cost_ron, pellets_cost_ron, other_cost_ron, reading_type, is_regularization, notes
    FROM house_monthly_bills
    WHERE user_id = ? AND house_id = ?
    ORDER BY billing_month DESC
    LIMIT 12
  `)
    .bind(dataOwnerUserId, selectedHouseId || analysis.house_id)
    .all();
  const billAnalysis = analyzeBillingHistory(reportBills.results || [], profile, profile.assessment.score);
  if (billAnalysis.adjusted_score !== null && billAnalysis.score_delta !== 0) {
    profile.assessment.score = billAnalysis.adjusted_score;
    profile.assessment.estimatedEnergyClass = estimateEnergyClass(profile.assessment.score);
  }
  const providerOffers = await env.DB.prepare(`
    SELECT recommendation_id, offer_amount_ron, status
    FROM provider_offers
    WHERE house_id = ? AND status IN ('approved', 'contact_requested')
  `)
    .bind(selectedHouseId || analysis.house_id)
    .all();
  const generatedAt = new Date().toISOString();
  rawInput.house_id = selectedHouseId || analysis.house_id;
  const physicalResult = buildPhysicalEnergyResult(rawInput);
  const offerMap = offersByRecommendation(providerOffers.results || []);
  const reportSnapshot = buildReportSnapshot(profile, rawInput, benchmark, generatedAt, physicalResult);
  const algorithmInsights = buildAlgorithmInsights(profile, benchmark, offerMap, billAnalysis, generatedAt, physicalResult);

  return jsonResponse(
    {
      success: true,
      has_report: true,
      admin_view: Boolean(adminHouseId),
      owner_user_id: dataOwnerUserId,
      analysis_id: analysis.id,
      house_id: selectedHouseId || analysis.house_id,
      generated_at: generatedAt,
      implemented_recommendations: implementedIds,
      savings_history: savingsHistory(profile, implementedRows),
      money_wallet: buildMoneyWallet(profile, benchmark, implementedRows),
      benchmark,
      provider_offers: offerMap,
      bill_analysis: billAnalysis,
      physical_result: physicalResult,
      report_snapshot: reportSnapshot,
      algorithm_insights: algorithmInsights,
      profile
    },
    { headers: corsHeaders }
  );
}

async function demoEnergyReport(request, env, corsHeaders) {
  const profile = buildEnergyProfile(demoOldHouseInput);
  const generatedAt = new Date().toISOString();
  const physicalResult = buildPhysicalEnergyResult(demoOldHouseInput);
  return jsonResponse(
    {
      success: true,
      has_report: true,
      demo: true,
      generated_at: generatedAt,
      physical_result: physicalResult,
      report_snapshot: buildReportSnapshot(profile, demoOldHouseInput, null, generatedAt, physicalResult),
      algorithm_insights: buildAlgorithmInsights(profile, null, {}, {}, generatedAt, physicalResult),
      profile
    },
    { headers: corsHeaders }
  );
}

async function answersByAnalysisIds(env, analysisIds = []) {
  const uniqueIds = [...new Set(analysisIds.filter(Boolean).map(Number))];
  if (!uniqueIds.length) return new Map();
  const placeholders = uniqueIds.map(() => "?").join(",");
  const result = await env.DB.prepare(`
    SELECT analysis_id, question_key, answer_value
    FROM analysis_answers
    WHERE analysis_id IN (${placeholders})
  `).bind(...uniqueIds).all();
  const byAnalysis = new Map();
  (result.results || []).forEach(row => {
    if (!byAnalysis.has(row.analysis_id)) byAnalysis.set(row.analysis_id, {});
    byAnalysis.get(row.analysis_id)[row.question_key] = row.answer_value;
  });
  return byAnalysis;
}

function physicsClassFromRawInput(rawInput = {}, fallbackClass = null) {
  const physicalResult = safeBuildPhysicalEnergyResult(rawInput);
  return {
    className: physicalResult?.classificationV06?.estimatedEnergyClass || "unknown",
    source: physicalResult?.classificationV06 ? "physics_v06" : "physics_unavailable",
    missingReasons: physicalResult?.classificationV06?.missingReasons || ["PHYSICS_ENGINE_UNAVAILABLE"]
  };
}

function safeBuildPhysicalEnergyResult(rawInput = {}) {
  try {
    return buildPhysicalEnergyResult(rawInput);
  } catch {
    return null;
  }
}

async function homes(request, env, corsHeaders) {
  const user = await getCurrentUser(request, env);
  if (!user) {
    return jsonResponse(
      { success: false, error: "Trebuie să fii autentificat pentru a vedea locuințele." },
      { status: 401, headers: corsHeaders }
    );
  }

  const adminMode = requireAdmin(user);
  const result = adminMode
    ? await env.DB.prepare(`
    SELECT
      houses.id,
      houses.user_id AS owner_user_id,
      users.email AS owner_email,
      users.name AS owner_name,
      houses.display_name,
      houses.house_type,
      houses.surface,
      houses.city,
      latest.analysis_id,
      latest.completed_at,
      scores.overall_score,
      scores.estimated_energy_class,
      COUNT(recommendation_actions.id) AS implemented_actions
    FROM houses
    LEFT JOIN users ON users.id = houses.user_id
    LEFT JOIN (
      SELECT house_id, MAX(id) AS analysis_id, MAX(completed_at) AS completed_at
      FROM analyses
      WHERE status = 'completed'
      GROUP BY house_id
    ) latest ON latest.house_id = houses.id
    LEFT JOIN scores ON scores.analysis_id = latest.analysis_id
    LEFT JOIN recommendation_actions ON recommendation_actions.house_id = houses.id
      AND recommendation_actions.user_id = houses.user_id
      AND recommendation_actions.status = 'implemented'
    WHERE COALESCE(houses.active, 1) = 1
    GROUP BY houses.id
    ORDER BY houses.id DESC
  `).all()
    : await env.DB.prepare(`
    SELECT
      houses.id,
      houses.user_id AS owner_user_id,
      houses.display_name,
      houses.house_type,
      houses.surface,
      houses.city,
      latest.analysis_id,
      latest.completed_at,
      scores.overall_score,
      scores.estimated_energy_class,
      COUNT(recommendation_actions.id) AS implemented_actions
    FROM houses
    LEFT JOIN (
      SELECT house_id, MAX(id) AS analysis_id, MAX(completed_at) AS completed_at
      FROM analyses
      WHERE user_id = ? AND status = 'completed'
      GROUP BY house_id
    ) latest ON latest.house_id = houses.id
    LEFT JOIN scores ON scores.analysis_id = latest.analysis_id
    LEFT JOIN recommendation_actions ON recommendation_actions.house_id = houses.id
      AND recommendation_actions.user_id = houses.user_id
      AND recommendation_actions.status = 'implemented'
    WHERE houses.user_id = ? AND COALESCE(houses.active, 1) = 1
    GROUP BY houses.id
    ORDER BY houses.id DESC
  `)
    .bind(user.id, user.id)
    .all();

  const answersByAnalysis = await answersByAnalysisIds(env, (result.results || []).map(home => home.analysis_id));
  const normalizedHomes = (result.results || []).map(home => ({
    ...home
  })).map(home => {
    const adjustedScore = home.overall_score === null || home.overall_score === undefined
      ? home.overall_score
      : clampScore(home.overall_score + (home.implemented_actions || 0) * 3);
    const answers = answersByAnalysis.get(home.analysis_id) || {};
    const physicsClass = physicsClassFromRawInput({
      ...answers,
      surface: answers.surface || home.surface,
      useful_area_m2: answers.useful_area_m2 || home.surface,
      city: answers.city || home.city,
      house_type: answers.house_type || home.house_type,
      house_id: home.id
    }, "unknown");
    return {
      ...home,
      overall_score: adjustedScore,
      estimated_energy_class: physicsClass.className,
      estimated_energy_class_source: physicsClass.source,
      estimated_energy_class_missing_reasons: physicsClass.missingReasons
    };
  });

  return jsonResponse({ success: true, admin_view: adminMode, homes: normalizedHomes }, { headers: corsHeaders });
}

async function recommendations(request, env, corsHeaders) {
  return energyReport(request, env, corsHeaders);
}

async function archiveHome(request, env, corsHeaders) {
  const user = await getCurrentUser(request, env);
  if (!user) {
    return jsonResponse(
      { success: false, error: "Trebuie sa fii autentificat pentru a modifica locuinta." },
      { status: 401, headers: corsHeaders }
    );
  }

  const body = await readJson(request);
  const houseId = numberValue(body, "house_id");
  if (!houseId) {
    return jsonResponse({ success: false, error: "Lipseste locuinta." }, { status: 400, headers: corsHeaders });
  }

  await env.DB.prepare(`
    UPDATE houses
    SET active = 0, archived_at = ?
    WHERE id = ? AND user_id = ?
  `)
    .bind(new Date().toISOString(), houseId, user.id)
    .run();

  return jsonResponse({ success: true, house_id: houseId }, { headers: corsHeaders });
}

async function recommendationAction(request, env, corsHeaders) {
  const user = await getCurrentUser(request, env);
  if (!user) {
    return jsonResponse(
      { success: false, error: "Trebuie să fii autentificat pentru a salva decizia." },
      { status: 401, headers: corsHeaders }
    );
  }

  const body = await readJson(request);
  const houseId = numberValue(body, "house_id");
  const recommendationId = value(body, "recommendation_id");
  const implemented = value(body, "status") !== "planned";

  if (!houseId || !recommendationId) {
    return jsonResponse(
      { success: false, error: "Lipsește locuința sau recomandarea." },
      { status: 400, headers: corsHeaders }
    );
  }

  const house = await env.DB.prepare("SELECT id FROM houses WHERE id = ? AND user_id = ? LIMIT 1")
    .bind(houseId, user.id)
    .first();
  if (!house) {
    return jsonResponse(
      { success: false, error: "Locuința nu aparține contului curent." },
      { status: 403, headers: corsHeaders }
    );
  }

  await env.DB.prepare("DELETE FROM recommendation_actions WHERE user_id = ? AND house_id = ? AND recommendation_id = ?")
    .bind(user.id, houseId, recommendationId)
    .run();

  if (implemented) {
    await env.DB.prepare(`
      INSERT INTO recommendation_actions(user_id, house_id, recommendation_id, status, notes)
      VALUES(?, ?, ?, 'implemented', ?)
    `)
      .bind(user.id, houseId, recommendationId, value(body, "notes"))
      .run();

    await env.DB.prepare(`
      INSERT INTO savings_events(user_id, house_id, event_type, amount_ron, source)
      VALUES(?, ?, 'recommendation_implemented', NULL, ?)
    `)
      .bind(user.id, houseId, recommendationId)
      .run();
  }

  return jsonResponse({ success: true, implemented }, { headers: corsHeaders });
}

async function providerForUser(env, userId) {
  return env.DB.prepare("SELECT * FROM service_providers WHERE user_id = ? ORDER BY id DESC LIMIT 1")
    .bind(userId)
    .first();
}

async function providerRegister(request, env, corsHeaders) {
  const user = await getCurrentUser(request, env);
  if (!user) {
    return jsonResponse({ success: false, error: "Trebuie sa fii autentificat pentru a inscrie o firma." }, { status: 401, headers: corsHeaders });
  }
  const body = await readJson(request);
  const companyName = value(body, "company_name");
  if (!companyName) {
    return jsonResponse({ success: false, error: "Lipseste numele firmei." }, { status: 400, headers: corsHeaders });
  }

  const existing = await providerForUser(env, user.id);
  if (existing) {
    await env.DB.prepare(`
      UPDATE service_providers
      SET company_name = ?, provider_type = ?, service_area = ?, certifications = ?
      WHERE id = ? AND user_id = ?
    `)
      .bind(companyName, value(body, "provider_type"), value(body, "service_area"), value(body, "certifications"), existing.id, user.id)
      .run();
    return jsonResponse({ success: true, provider_id: existing.id }, { headers: corsHeaders });
  }

  const result = await env.DB.prepare(`
    INSERT INTO service_providers(user_id, company_name, provider_type, service_area, certifications)
    VALUES(?, ?, ?, ?, ?)
  `)
    .bind(user.id, companyName, value(body, "provider_type"), value(body, "service_area"), value(body, "certifications"))
    .run();

  await env.DB.prepare("UPDATE users SET account_type = 'provider' WHERE id = ?")
    .bind(user.id)
    .run();

  return jsonResponse({ success: true, provider_id: result.meta?.last_row_id }, { headers: corsHeaders });
}

async function providerOpportunities(request, env, corsHeaders) {
  const user = await getCurrentUser(request, env);
  if (!user) {
    return jsonResponse({ success: false, error: "Trebuie sa fii autentificat." }, { status: 401, headers: corsHeaders });
  }
  const provider = await providerForUser(env, user.id);
  if (!provider && !requireAdmin(user)) {
    return jsonResponse({ success: false, error: "Inscrie firma inainte de a vedea oportunitati." }, { status: 403, headers: corsHeaders });
  }

  const rows = await env.DB.prepare(`
    SELECT
      houses.id AS house_id,
      houses.house_type,
      houses.surface,
      houses.city,
      houses.year,
      latest.analysis_id,
      scores.overall_score,
      scores.estimated_energy_class
    FROM houses
    JOIN (
      SELECT house_id, MAX(id) AS analysis_id
      FROM analyses
      WHERE status = 'completed'
      GROUP BY house_id
    ) latest ON latest.house_id = houses.id
    LEFT JOIN scores ON scores.analysis_id = latest.analysis_id
    WHERE COALESCE(houses.active, 1) = 1
    ORDER BY latest.analysis_id DESC
    LIMIT 20
  `).all();

  const opportunities = [];
  for (const row of rows.results || []) {
    const answers = await latestAnswers(env, row.analysis_id);
    const profile = buildEnergyProfile(answers);
    opportunities.push({
      opportunity_id: row.house_id,
      area_bucket: row.surface ? `${Math.round(Number(row.surface) / 25) * 25} m2 +/-` : "necunoscut",
      building_type: profile.input.general.buildingType,
      city_hint: row.city ? String(row.city).split(" ")[0] : "zona anonima",
      estimated_class: "unknown",
      score_bucket: row.overall_score ? `${Math.floor(Number(row.overall_score) / 10) * 10}-${Math.floor(Number(row.overall_score) / 10) * 10 + 9}` : "necunoscut",
      recommendations: profile.recommendations.slice(0, 3).map(item => ({
        id: item.id,
        title: item.title,
        estimatedSavingsRonYearMin: item.estimatedSavingsRonYearMin,
        estimatedSavingsRonYearMax: item.estimatedSavingsRonYearMax,
        estimatedInvestmentRonMin: item.estimatedInvestmentRonMin,
        estimatedInvestmentRonMax: item.estimatedInvestmentRonMax
      }))
    });
  }

  return jsonResponse({ success: true, provider, opportunities }, { headers: corsHeaders });
}

async function providerOffer(request, env, corsHeaders) {
  const user = await getCurrentUser(request, env);
  if (!user) {
    return jsonResponse({ success: false, error: "Trebuie sa fii autentificat." }, { status: 401, headers: corsHeaders });
  }
  const provider = await providerForUser(env, user.id);
  if (!provider && !requireAdmin(user)) {
    return jsonResponse({ success: false, error: "Inscrie firma inainte de a trimite oferte." }, { status: 403, headers: corsHeaders });
  }
  const body = await readJson(request);
  const houseId = numberValue(body, "opportunity_id");
  const recommendationId = value(body, "recommendation_id");
  const amount = numberValue(body, "offer_amount_ron");
  if (!houseId || !recommendationId) {
    return jsonResponse({ success: false, error: "Lipseste oportunitatea sau recomandarea." }, { status: 400, headers: corsHeaders });
  }

  const result = await env.DB.prepare(`
    INSERT INTO provider_offers(provider_id, house_id, recommendation_id, offer_amount_ron, estimated_duration_days, message)
    VALUES(?, ?, ?, ?, ?, ?)
  `)
    .bind(provider?.id || null, houseId, recommendationId, amount, numberValue(body, "estimated_duration_days"), value(body, "message"))
    .run();

  return jsonResponse({ success: true, offer_id: result.meta?.last_row_id }, { headers: corsHeaders });
}

async function adminProviderOfferAction(request, env, corsHeaders) {
  const user = await getCurrentUser(request, env);
  if (!requireAdmin(user)) {
    return jsonResponse({ success: false, error: "Acces disponibil doar pentru administratori." }, { status: 403, headers: corsHeaders });
  }
  const body = await readJson(request);
  const offerId = numberValue(body, "offer_id");
  const status = value(body, "status");
  if (!offerId || !["approved", "rejected", "submitted"].includes(status)) {
    return jsonResponse({ success: false, error: "Status invalid pentru oferta." }, { status: 400, headers: corsHeaders });
  }

  await env.DB.prepare("UPDATE provider_offers SET status = ? WHERE id = ?")
    .bind(status, offerId)
    .run();

  return jsonResponse({ success: true, offer_id: offerId, status }, { headers: corsHeaders });
}

async function providerContactRequest(request, env, corsHeaders) {
  const user = await getCurrentUser(request, env);
  if (!user) {
    return jsonResponse({ success: false, error: "Trebuie sa fii autentificat." }, { status: 401, headers: corsHeaders });
  }
  const body = await readJson(request);
  const houseId = numberValue(body, "house_id");
  const recommendationId = value(body, "recommendation_id");
  if (!houseId || !recommendationId) {
    return jsonResponse({ success: false, error: "Lipseste locuinta sau recomandarea." }, { status: 400, headers: corsHeaders });
  }

  const house = await env.DB.prepare("SELECT id FROM houses WHERE id = ? AND user_id = ? AND COALESCE(active, 1) = 1 LIMIT 1")
    .bind(houseId, user.id)
    .first();
  if (!house) {
    return jsonResponse({ success: false, error: "Locuinta nu apartine contului curent." }, { status: 403, headers: corsHeaders });
  }

  const result = await env.DB.prepare(`
    UPDATE provider_offers
    SET status = 'contact_requested'
    WHERE house_id = ? AND recommendation_id = ? AND status = 'approved'
  `)
    .bind(houseId, recommendationId)
    .run();

  return jsonResponse({ success: true, requested: result.meta?.changes || 0 }, { headers: corsHeaders });
}

export default {
  async fetch(request, env) {
    const corsHeaders = {
      "Access-Control-Allow-Origin": "*",
      "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
      "Access-Control-Allow-Headers": "Content-Type, Authorization"
    };

    if (request.method === "OPTIONS") {
      return new Response(null, { headers: corsHeaders });
    }

    const url = new URL(request.url);
    if (request.method === "GET" && (url.pathname === "/admin" || url.pathname === "/admin/")) {
      return Response.redirect(`${url.origin}/pages/admin.html`, 302);
    }
    if (request.method === "GET" && (url.pathname === "/furnizori" || url.pathname === "/furnizori/")) {
      return Response.redirect(`${url.origin}/pages/furnizori.html`, 302);
    }
    if (request.method === "GET" && (url.pathname === "/algoritmi" || url.pathname === "/algoritmi/")) {
      return Response.redirect(`${url.origin}/pages/algoritmi.html`, 302);
    }

    const routes = {
      "/api/register": register,
      "/api/login": login,
      "/api/me": me,
      "/api/logout": logout,
      "/api/forgot-password": forgotPassword,
      "/api/reset-password": resetPassword,
      "/api/save-house": saveHouse,
      "/api/update-house": updateHouse,
      "/api/house-profile": houseProfile,
      "/api/simulate-house": simulateHouse,
      "/api/monthly-bill": monthlyBill,
      "/api/admin/overview": adminOverview,
      "/api/admin/dataset": adminDataset,
      "/api/admin/provider-offer-action": adminProviderOfferAction,
      "/api/dashboard-summary": dashboardSummary,
      "/api/energy-report": energyReport,
      "/api/demo-energy-report": demoEnergyReport,
      "/api/mc001/htr/run": handleMc001HtrRun,
      "/api/mc001/htr/load": handleMc001HtrLoad,
      "/api/homes": homes,
      "/api/recommendations": recommendations,
      "/api/recommendation-action": recommendationAction,
      "/api/provider/register": providerRegister,
      "/api/provider/opportunities": providerOpportunities,
      "/api/provider/offer": providerOffer,
      "/api/provider/contact-request": providerContactRequest,
      "/api/archive-home": archiveHome
    };
    const handler = routes[url.pathname];

    if (!handler) {
      return new Response("Not found", { status: 404, headers: corsHeaders });
    }
    if (request.method !== "POST") {
      return jsonResponse({ success: false, error: "Method not allowed" }, { status: 405, headers: corsHeaders });
    }

    try {
      return await handler(request, env, corsHeaders, url);
    } catch (e) {
      return jsonResponse({ success: false, error: e.toString() }, { status: 500, headers: corsHeaders });
    }
  }
};
