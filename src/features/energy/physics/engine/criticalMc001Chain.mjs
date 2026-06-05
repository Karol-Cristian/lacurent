import { FORMULA_REGISTRY } from "../registries/formulaRegistry.mjs";

export const DEFAULT_SURFACE_RESISTANCES = {
  rsi: 0.13,
  rse: 0.04,
  source: "registry_default",
  assumptions: ["Rsi/Rse sunt valori default configurabile pentru validarea lantului critic."]
};

export const DEFAULT_PRIMARY_ENERGY_FACTORS = {
  electricity: 2.5,
  natural_gas: 1.1,
  wood: 1.0,
  pellets: 1.0,
  district_heating: 1.3,
  lpg: 1.1,
  coal: 1.2
};

export const DEFAULT_CO2_FACTORS = {
  electricity: 0.24,
  natural_gas: 0.202,
  wood: 0.03,
  pellets: 0.04,
  district_heating: 0.18,
  lpg: 0.23,
  coal: 0.34
};

export const DEFAULT_CLASS_THRESHOLDS = [
  { className: "A+", maxPrimaryEnergyKwhM2Year: 90 },
  { className: "A", maxPrimaryEnergyKwhM2Year: 130 },
  { className: "B", maxPrimaryEnergyKwhM2Year: 180 },
  { className: "C", maxPrimaryEnergyKwhM2Year: 240 },
  { className: "D", maxPrimaryEnergyKwhM2Year: 320 },
  { className: "E", maxPrimaryEnergyKwhM2Year: 420 },
  { className: "F", maxPrimaryEnergyKwhM2Year: 560 },
  { className: "G", maxPrimaryEnergyKwhM2Year: Number.POSITIVE_INFINITY }
];

function confidenceFrom(values) {
  return values.includes("low") ? "low" : values.includes("medium") ? "medium" : "high";
}

function trace(value, unit, formulaId, inputs, steps, assumptions = [], warnings = [], confidence = "medium") {
  return { value, unit, formulaId, inputs, steps, assumptions, warnings, confidence };
}

function assertPositive(value, name) {
  if (!Number.isFinite(value) || value <= 0) {
    throw new Error(`${name} must be a positive number.`);
  }
}

export function calculateLayerResistance({ thicknessM, lambdaWmK, materialId = "unknown", confidence = "medium" }) {
  assertPositive(thicknessM, "thicknessM");
  assertPositive(lambdaWmK, "lambdaWmK");
  const value = thicknessM / lambdaWmK;
  return trace(
    value,
    FORMULA_REGISTRY.R_LAYER.unit,
    FORMULA_REGISTRY.R_LAYER.id,
    { thicknessM, lambdaWmK, materialId },
    [`${thicknessM} / ${lambdaWmK} = ${value}`],
    [`Material ${materialId} foloseste conductivitate declarata sau din registry.`],
    [],
    confidence
  );
}

export function calculateTotalResistance({ layers, rsi = DEFAULT_SURFACE_RESISTANCES.rsi, rse = DEFAULT_SURFACE_RESISTANCES.rse }) {
  const layerTraces = layers.map(calculateLayerResistance);
  const layerSum = layerTraces.reduce((sum, item) => sum + item.value, 0);
  const value = rsi + layerSum + rse;
  const resultTrace = trace(
    value,
    FORMULA_REGISTRY.R_TOTAL.unit,
    FORMULA_REGISTRY.R_TOTAL.id,
    { rsi, rse, layerResistances: layerTraces.map(item => item.value) },
    [`${rsi} + ${layerSum} + ${rse} = ${value}`],
    DEFAULT_SURFACE_RESISTANCES.assumptions,
    [],
    confidenceFrom(layerTraces.map(item => item.confidence))
  );
  return { value, trace: resultTrace, layerTraces };
}

export function calculateUValue({ rTotal }) {
  assertPositive(rTotal, "rTotal");
  const value = 1 / rTotal;
  return trace(
    value,
    FORMULA_REGISTRY.U_VALUE.unit,
    FORMULA_REGISTRY.U_VALUE.id,
    { rTotal },
    [`1 / ${rTotal} = ${value}`],
    [],
    [],
    "medium"
  );
}

export function calculateThermalBridgeHeatTransfer({ thermalBridges = [] }) {
  const terms = thermalBridges.map(item => ({
    id: item.id || item.type || "thermal_bridge",
    psiWmK: item.psiWmK,
    lengthM: item.lengthM,
    value: (item.psiWmK || 0) * (item.lengthM || 0)
  }));
  const value = terms.reduce((sum, item) => sum + item.value, 0);
  return trace(
    value,
    FORMULA_REGISTRY.H_THERMAL_BRIDGES.unit,
    FORMULA_REGISTRY.H_THERMAL_BRIDGES.id,
    { terms },
    terms.length ? terms.map(item => `${item.psiWmK} x ${item.lengthM} = ${item.value}`) : ["No thermal bridges declared; H_tb = 0."],
    thermalBridges.length ? ["Puntile termice sunt incluse prin psi x lungime."] : ["Nu au fost declarate punti termice pentru element."],
    [],
    thermalBridges.some(item => item.confidence === "low") ? "low" : "medium"
  );
}

export function calculateCorrectedUValue({ uValue, areaM2, hThermalBridges }) {
  assertPositive(areaM2, "areaM2");
  const value = (uValue * areaM2 + hThermalBridges) / areaM2;
  return trace(
    value,
    FORMULA_REGISTRY.U_CORRECTED.unit,
    FORMULA_REGISTRY.U_CORRECTED.id,
    { uValue, areaM2, hThermalBridges },
    [`(${uValue} x ${areaM2} + ${hThermalBridges}) / ${areaM2} = ${value}`],
    [],
    [],
    "medium"
  );
}

export function calculateElementHeatTransfer({ uCorrected, areaM2 }) {
  assertPositive(areaM2, "areaM2");
  const value = uCorrected * areaM2;
  return trace(
    value,
    FORMULA_REGISTRY.H_ELEMENT.unit,
    FORMULA_REGISTRY.H_ELEMENT.id,
    { uCorrected, areaM2 },
    [`${uCorrected} x ${areaM2} = ${value}`],
    [],
    [],
    "medium"
  );
}

export function calculateEnvelopeElement(element) {
  const traces = [];
  const warnings = [];
  const areaM2 = element.areaM2;
  assertPositive(areaM2, `${element.id}.areaM2`);

  let uTrace;
  let rTotal = null;
  let layerTraces = [];

  if (element.layers?.length) {
    const resistance = calculateTotalResistance({
      layers: element.layers,
      rsi: element.rsi ?? DEFAULT_SURFACE_RESISTANCES.rsi,
      rse: element.rse ?? DEFAULT_SURFACE_RESISTANCES.rse
    });
    rTotal = resistance.value;
    layerTraces = resistance.layerTraces;
    traces.push(...layerTraces, resistance.trace);
    uTrace = calculateUValue({ rTotal });
    traces.push(uTrace);
  } else if (Number.isFinite(element.uValueWm2K)) {
    uTrace = trace(
      element.uValueWm2K,
      FORMULA_REGISTRY.U_VALUE.unit,
      FORMULA_REGISTRY.U_VALUE.id,
      { declaredUValueWm2K: element.uValueWm2K },
      [`U declared for ${element.id}: ${element.uValueWm2K}`],
      ["Elementul foloseste U-value declarat; lantul R_layer/R_total nu este disponibil pentru acest element."],
      ["Declared U-value must be validated against product data or official tables."],
      element.confidence || "medium"
    );
    warnings.push(`Element ${element.id} uses declared U-value.`);
    traces.push(uTrace);
  } else {
    throw new Error(`Envelope element ${element.id} needs layers or uValueWm2K.`);
  }

  const bridgeTrace = calculateThermalBridgeHeatTransfer({ thermalBridges: element.thermalBridges || [] });
  const uCorrectedTrace = calculateCorrectedUValue({
    uValue: uTrace.value,
    areaM2,
    hThermalBridges: bridgeTrace.value
  });
  const hElementTrace = calculateElementHeatTransfer({
    uCorrected: uCorrectedTrace.value,
    areaM2
  });
  traces.push(bridgeTrace, uCorrectedTrace, hElementTrace);

  return {
    id: element.id,
    category: element.category || element.type || element.id,
    areaM2,
    rTotal,
    layerResistances: layerTraces,
    uValue: uTrace.value,
    hThermalBridges: bridgeTrace.value,
    uCorrected: uCorrectedTrace.value,
    hElement: hElementTrace.value,
    traces,
    warnings,
    assumptions: traces.flatMap(item => item.assumptions),
    confidence: confidenceFrom(traces.map(item => item.confidence))
  };
}

export function calculateHtr({ elements }) {
  const value = elements.reduce((sum, item) => sum + item.hElement, 0);
  return trace(
    value,
    FORMULA_REGISTRY.H_TR.unit,
    FORMULA_REGISTRY.H_TR.id,
    { hElements: elements.map(item => ({ id: item.id, hElement: item.hElement })) },
    [`sum(${elements.map(item => item.hElement).join(" + ")}) = ${value}`],
    [],
    [],
    confidenceFrom(elements.map(item => item.confidence))
  );
}

export function calculateAirflow({ ach, heatedVolumeM3 }) {
  assertPositive(heatedVolumeM3, "heatedVolumeM3");
  const value = ach * heatedVolumeM3;
  return trace(
    value,
    FORMULA_REGISTRY.AIRFLOW.unit,
    FORMULA_REGISTRY.AIRFLOW.id,
    { ach, heatedVolumeM3 },
    [`${ach} x ${heatedVolumeM3} = ${value}`],
    [],
    [],
    "medium"
  );
}

export function calculateHve({ ach, heatedVolumeM3, heatRecoveryEfficiency = 0 }) {
  const airflow = calculateAirflow({ ach, heatedVolumeM3 });
  const value = 0.34 * airflow.value * (1 - heatRecoveryEfficiency);
  const hve = trace(
    value,
    FORMULA_REGISTRY.H_VE.unit,
    FORMULA_REGISTRY.H_VE.id,
    { airflowM3h: airflow.value, heatRecoveryEfficiency },
    [`0.34 x ${airflow.value} x (1 - ${heatRecoveryEfficiency}) = ${value}`],
    ["0.34 este coeficient simplificat pentru aer in Wh/(m3K)."],
    [],
    "medium"
  );
  return { airflow, hve };
}

export function calculateHeatingDemand({ htr, hve, hdd, heatedAreaM2 }) {
  assertPositive(heatedAreaM2, "heatedAreaM2");
  const value = (htr + hve) * hdd * 24 / 1000;
  const perM2 = value / heatedAreaM2;
  const main = trace(
    value,
    FORMULA_REGISTRY.QH_ND.unit,
    FORMULA_REGISTRY.QH_ND.id,
    { htr, hve, hdd },
    [`(${htr} + ${hve}) x ${hdd} x 24 / 1000 = ${value}`],
    ["Metoda este anuala simplificata pe HDD; nu include inca bilant lunar complet cu aporturi si factori de utilizare oficiali."],
    ["QH,nd simplificat poate supraestima necesarul fata de metoda lunara MC001 completa."],
    "medium"
  );
  const specific = trace(
    perM2,
    "kWh/m2/year",
    FORMULA_REGISTRY.QH_ND.id,
    { heatingDemandKwhYear: value, heatedAreaM2 },
    [`${value} / ${heatedAreaM2} = ${perM2}`],
    ["Indicator specific derivat din QH,nd si aria incalzita."],
    [],
    "medium"
  );
  return { main, specific };
}

export function calculateFinalHeatingEnergy({ usefulHeatingDemandKwhYear, heatingSystem }) {
  const carrier = heatingSystem.fuelCarrier;
  if (heatingSystem.scop) {
    const value = usefulHeatingDemandKwhYear / heatingSystem.scop;
    return trace(
      value,
      FORMULA_REGISTRY.FINAL_HEATING_HEAT_PUMP.unit,
      FORMULA_REGISTRY.FINAL_HEATING_HEAT_PUMP.id,
      { usefulHeatingDemandKwhYear, scop: heatingSystem.scop, carrier },
      [`${usefulHeatingDemandKwhYear} / ${heatingSystem.scop} = ${value}`],
      ["Pompa de caldura foloseste SCOP pentru consum final electric."],
      [],
      heatingSystem.confidence || "medium"
    );
  }

  assertPositive(heatingSystem.seasonalEfficiency, "seasonalEfficiency");
  const value = usefulHeatingDemandKwhYear / heatingSystem.seasonalEfficiency;
  return trace(
    value,
    FORMULA_REGISTRY.FINAL_HEATING_EFFICIENCY.unit,
    FORMULA_REGISTRY.FINAL_HEATING_EFFICIENCY.id,
    { usefulHeatingDemandKwhYear, seasonalEfficiency: heatingSystem.seasonalEfficiency, carrier },
    [`${usefulHeatingDemandKwhYear} / ${heatingSystem.seasonalEfficiency} = ${value}`],
    ["Randamentul sezonier include simplificat generarea si utilizarea sistemului."],
    [],
    heatingSystem.confidence || "medium"
  );
}

export function calculatePrimaryEnergy({ finalEnergyKwhYear, primaryEnergyFactor, heatedAreaM2 }) {
  const value = finalEnergyKwhYear * primaryEnergyFactor;
  const perM2 = value / heatedAreaM2;
  const main = trace(
    value,
    FORMULA_REGISTRY.PRIMARY_ENERGY.unit,
    FORMULA_REGISTRY.PRIMARY_ENERGY.id,
    { finalEnergyKwhYear, primaryEnergyFactor },
    [`${finalEnergyKwhYear} x ${primaryEnergyFactor} = ${value}`],
    ["Factorul de energie primara este configurabil si trebuie validat fata de tabela oficiala folosita."],
    ["Factorii actuali sunt internal_estimate pentru lantul critic."],
    "low"
  );
  const specific = trace(
    perM2,
    "kWh/m2/year",
    FORMULA_REGISTRY.PRIMARY_ENERGY.id,
    { primaryEnergyKwhYear: value, heatedAreaM2 },
    [`${value} / ${heatedAreaM2} = ${perM2}`],
    ["Indicator specific derivat."],
    ["Depinde direct de factorul de energie primara."],
    "low"
  );
  return { main, specific };
}

export function calculateCo2({ finalEnergyKwhYear, co2Factor, heatedAreaM2 }) {
  const value = finalEnergyKwhYear * co2Factor;
  const perM2 = value / heatedAreaM2;
  const main = trace(
    value,
    FORMULA_REGISTRY.CO2.unit,
    FORMULA_REGISTRY.CO2.id,
    { finalEnergyKwhYear, co2Factor },
    [`${finalEnergyKwhYear} x ${co2Factor} = ${value}`],
    ["Factorul CO2 este configurabil si trebuie validat fata de sursa oficiala aleasa."],
    ["Factorii actuali sunt internal_estimate pentru lantul critic."],
    "low"
  );
  const specific = trace(
    perM2,
    "kgCO2/m2/year",
    FORMULA_REGISTRY.CO2.id,
    { co2KgYear: value, heatedAreaM2 },
    [`${value} / ${heatedAreaM2} = ${perM2}`],
    ["Indicator specific derivat."],
    [],
    "low"
  );
  return { main, specific };
}

export function estimateEnergyClass({ primaryEnergyKwhM2Year, thresholds = DEFAULT_CLASS_THRESHOLDS }) {
  const match = thresholds.find(item => primaryEnergyKwhM2Year <= item.maxPrimaryEnergyKwhM2Year) || thresholds.at(-1);
  return trace(
    match.className,
    FORMULA_REGISTRY.ESTIMATED_CLASS.unit,
    FORMULA_REGISTRY.ESTIMATED_CLASS.id,
    { primaryEnergyKwhM2Year, thresholds },
    [`${primaryEnergyKwhM2Year} <= ${match.maxPrimaryEnergyKwhM2Year} => ${match.className}`],
    ["Clasa este estimativa LaCurent, nu certificat oficial."],
    ["Pragurile de clasa sunt internal_estimate pana la validare oficiala."],
    "low"
  );
}

export function runCriticalMc001Chain(home) {
  const traces = [];
  const assumptions = [];
  const warnings = [];
  const elementResults = home.envelopeElements.map(calculateEnvelopeElement);
  for (const element of elementResults) {
    traces.push(...element.traces);
    assumptions.push(...element.assumptions);
    warnings.push(...element.warnings);
  }

  const htr = calculateHtr({ elements: elementResults });
  const ventilation = calculateHve({
    ach: home.ventilation.ach,
    heatedVolumeM3: home.building.heatedVolumeM3,
    heatRecoveryEfficiency: home.ventilation.heatRecoveryEfficiency || 0
  });
  const heatingDemand = calculateHeatingDemand({
    htr: htr.value,
    hve: ventilation.hve.value,
    hdd: home.climate.heatingDegreeDays,
    heatedAreaM2: home.building.heatedAreaM2 || home.building.usefulAreaM2
  });
  const finalHeating = calculateFinalHeatingEnergy({
    usefulHeatingDemandKwhYear: heatingDemand.main.value,
    heatingSystem: home.heatingSystem
  });
  const carrier = home.heatingSystem.fuelCarrier;
  const primaryFactor = home.energyFactors?.primaryEnergyFactor ?? DEFAULT_PRIMARY_ENERGY_FACTORS[carrier];
  const co2Factor = home.energyFactors?.co2FactorKgKwh ?? DEFAULT_CO2_FACTORS[carrier];
  const primary = calculatePrimaryEnergy({
    finalEnergyKwhYear: finalHeating.value,
    primaryEnergyFactor: primaryFactor,
    heatedAreaM2: home.building.heatedAreaM2 || home.building.usefulAreaM2
  });
  const co2 = calculateCo2({
    finalEnergyKwhYear: finalHeating.value,
    co2Factor,
    heatedAreaM2: home.building.heatedAreaM2 || home.building.usefulAreaM2
  });
  const estimatedClass = estimateEnergyClass({
    primaryEnergyKwhM2Year: primary.specific.value,
    thresholds: home.classThresholds || DEFAULT_CLASS_THRESHOLDS
  });

  traces.push(
    htr,
    ventilation.airflow,
    ventilation.hve,
    heatingDemand.main,
    heatingDemand.specific,
    finalHeating,
    primary.main,
    primary.specific,
    co2.main,
    co2.specific,
    estimatedClass
  );
  assumptions.push(...traces.flatMap(item => item.assumptions));
  warnings.push(...traces.flatMap(item => item.warnings));

  return {
    homeId: home.id,
    building: home.building,
    elements: elementResults,
    htr,
    airflow: ventilation.airflow,
    hve: ventilation.hve,
    heatingDemand,
    finalHeating,
    primary,
    co2,
    estimatedClass,
    summary: {
      htrWk: htr.value,
      hveWk: ventilation.hve.value,
      qhNdKwhYear: heatingDemand.main.value,
      qhNdKwhM2Year: heatingDemand.specific.value,
      finalEnergyKwhYear: finalHeating.value,
      finalEnergyKwhM2Year: finalHeating.value / (home.building.heatedAreaM2 || home.building.usefulAreaM2),
      primaryEnergyKwhYear: primary.main.value,
      primaryEnergyKwhM2Year: primary.specific.value,
      co2KgYear: co2.main.value,
      co2KgM2Year: co2.specific.value,
      estimatedClass: estimatedClass.value
    },
    traces,
    assumptions: [...new Set(assumptions)],
    warnings: [...new Set(warnings)],
    confidence: confidenceFrom(traces.map(item => item.confidence))
  };
}
