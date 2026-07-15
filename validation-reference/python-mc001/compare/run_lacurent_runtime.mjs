import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

import {
  calculateMc001EnvelopeAssemblyUValueExplicit,
  calculateMc001EnvelopeTransmissionCoefficientExplicit
} from "../../../src/physics-engine/mc001EnvelopePhysicsCalculation.mjs";
import { calculateMc001MonthlyTransmissionEnergyExplicit } from "../../../src/physics-engine/mc001MonthlyTransmissionEnergyCalculation.mjs";
import { calculateMc001MonthlyVentilationTransferExplicit } from "../../../src/physics-engine/mc001VentilationTransferCalculation.mjs";
import { calculateMc001MonthlyHeatGainsExplicit } from "../../../src/physics-engine/mc001MonthlyHeatGainsCalculation.mjs";
import { calculateMc001RestrictedHeatingQhndExplicit } from "../../../src/physics-engine/mc001RestrictedHeatingQhndCalculation.mjs";
import { calculateMc001CoolingUsefulDemandExplicit } from "../../../src/physics-engine/mc001CoolingUsefulDemandCalculation.mjs";

const MONTHS = [
  "january",
  "february",
  "march",
  "april",
  "may",
  "june",
  "july",
  "august",
  "september",
  "october",
  "november",
  "december"
];

const FORMULAS = {
  design_lambda: {
    source: "MC001-2022 2.1.4, relation (2.3)",
    unit: "W/(m*K)",
    formula: "lambda = a * lambda_normat"
  },
  layer_resistance: {
    source: "MC001-2022 2.4.1 thermal resistance method",
    unit: "m2*K/W",
    formula: "Rj = dj / lambda_j"
  },
  assembly_resistance: {
    source: "MC001-2022 2.4.1, relation (2.6)",
    unit: "m2*K/W",
    formula: "R = Rsi + sum(Rj) + sum(Ra) + Rse"
  },
  u_value: {
    source: "MC001-2022 2.4.1, relation (2.7)",
    unit: "W/(m2*K)",
    formula: "U = 1 / R"
  },
  direct_transmission: {
    source: "MC001-2022 2.4.1, relation (2.11)",
    unit: "W/K",
    formula: "Hd = sum(Uj * Aj) + sum(psi_k * l_k) + sum(chi_j)"
  },
  htr: {
    source: "MC001-2022 2.4.1, relation (2.15)",
    unit: "W/K",
    formula: "Htr = Hd + Hg + Hu + Ha"
  },
  monthly_transmission: {
    source: "MC001-2022 2.4.1 relation (2.14), time integrated for current explicit runtime path",
    unit: "kWh",
    formula: "Qtr = Htr * (theta_i - theta_e) * hours / 1000"
  },
  hve: {
    source: "MC001-2022 2.7.1.2, relation (2.30)",
    unit: "W/K",
    formula: "Hve = ca_air_volume * sum(qv * bve * fve_dyn)"
  },
  monthly_ventilation: {
    source: "MC001-2022 2.7.1.2, relation (2.29)",
    unit: "kWh",
    formula: "Qve = Hve * (theta_i - theta_e) * hours / 1000"
  },
  monthly_gains: {
    source: "MC001-2022 2.7.2 Figure 2.13; 2.7.2/2.7.3 relations (2.34), (2.37)",
    unit: "kWh",
    formula: "Qgn = Qint + Qsol, with explicit adjacent unconditioned-zone gain terms when supplied"
  },
  tau_h: {
    source: "MC001-2022 relation (2.57)",
    unit: "h",
    formula: "tauH = (Cm_eff / 3600) / (Htr + Hve)"
  },
  a_h: {
    source: "MC001-2022 relation (2.55)",
    unit: "-",
    formula: "aH = aH0 + tauH / tauH0"
  },
  eta_hgn: {
    source: "MC001-2022 Figure 2.14",
    unit: "-",
    formula: "etaHgn = (1 - gammaH^aH) / (1 - gammaH^(aH + 1)); gammaH=1 branch aH/(aH+1)"
  },
  qhnd: {
    source: "MC001-2022 2.8.1 Figure 2.18",
    unit: "kWh",
    formula: "QHnd = 0 for gammaH <= 0 with gains or gammaH > 2; otherwise QHht - etaHgn * QHgn"
  },
  tau_c: {
    source: "MC001-2022 relation (2.58)",
    unit: "h",
    formula: "tauC = (Cm_eff / 3600) / (Htr + Hve)"
  },
  a_c: {
    source: "MC001-2022 relation (2.56)",
    unit: "-",
    formula: "aC = aC0 + tauC / tauC0"
  },
  eta_cht: {
    source: "MC001-2022 Figure 2.15",
    unit: "-",
    formula: "etaCht = (1 - gammaC^(-aC)) / (1 - gammaC^(-(aC + 1))); gammaC=1 branch aC/(aC+1)"
  },
  qcnd: {
    source: "MC001-2022 2.8.1 Figure 2.19",
    unit: "kWh",
    formula: "QCnd = 0 for 1/gammaC > 2; otherwise aCred * (QCgn - etaCht * QCht)"
  },
  annual_sums: {
    source: "MC001-2022 2.10, relations (2.84), (2.85)",
    unit: "kWh/year",
    formula: "annual demand = sum of 12 monthly demands"
  }
};

function readJson(filePath) {
  return JSON.parse(fs.readFileSync(filePath, "utf8"));
}

function deterministic(value) {
  if (Array.isArray(value)) {
    return value.map(item => deterministic(item));
  }
  if (value && typeof value === "object") {
    return Object.fromEntries(
      Object.keys(value)
        .sort()
        .map(key => [key, deterministic(value[key])])
    );
  }
  return value;
}

function source(reference, sourceType = "explicit_user_input") {
  return { sourceType, reference };
}

function amount(amountValue, unit, reference) {
  return { amount: amountValue, unit, source: source(reference) };
}

function demandSource(reference) {
  return {
    reference,
    notes: "P3V synthetic validation fixture; explicit test-only source"
  };
}

function assertReady(result, label) {
  if (result?.status !== "ready") {
    const blockers = result?.diagnostics?.blockers?.map(item => item.code).join(", ") || "unknown";
    throw new Error(`${label} blocked: ${blockers}`);
  }
  return result;
}

function assemblyInput(fixture, assembly) {
  const base = {
    assemblyId: assembly.assembly_id,
    assemblyType: assembly.assembly_type,
    source: source(`${fixture.fixture_id}.assembly.${assembly.assembly_id}`)
  };
  if (assembly.direct_u_w_m2k !== undefined) {
    return {
      ...base,
      directUValue: amount(
        assembly.direct_u_w_m2k,
        "W/(m2*K)",
        `${fixture.fixture_id}.assembly.${assembly.assembly_id}.direct_u`
      )
    };
  }
  return {
    ...base,
    surfaceResistances: {
      rsi: amount(assembly.rsi_m2k_w, "m2*K/W", `${fixture.fixture_id}.assembly.${assembly.assembly_id}.rsi`),
      rse: amount(assembly.rse_m2k_w, "m2*K/W", `${fixture.fixture_id}.assembly.${assembly.assembly_id}.rse`)
    },
    layers: assembly.layers.map(layer => {
      const material = fixture.materials[layer.material_id];
      const materialBase = {
        materialId: layer.material_id,
        name: layer.material_id
      };
      const materialInput = material.lambda_w_mk !== undefined
        ? {
            ...materialBase,
            lambda: amount(
              material.lambda_w_mk,
              "W/(m*K)",
              material.source_reference || `${fixture.fixture_id}.material.${layer.material_id}`
            )
          }
        : {
            ...materialBase,
            lambdaNormat: amount(
              material.lambda_normat_w_mk,
              "W/(m*K)",
              material.source_reference || `${fixture.fixture_id}.material.${layer.material_id}.lambda_normat`
            ),
            correctionCoefficientA: amount(
              material.correction_coefficient,
              "dimensionless",
              material.source_reference || `${fixture.fixture_id}.material.${layer.material_id}.correction`
            )
          };
      return {
        layerId: layer.layer_id,
        thickness: amount(
          layer.thickness_m,
          "m",
          `${fixture.fixture_id}.assembly.${assembly.assembly_id}.layer.${layer.layer_id}.thickness`
        ),
        material: materialInput
      };
    }),
    airLayers: (assembly.air_layers || []).map(airLayer => ({
      airLayerId: airLayer.air_layer_id,
      resistance: amount(
        airLayer.resistance_m2k_w,
        "m2*K/W",
        airLayer.source_reference || `${fixture.fixture_id}.assembly.${assembly.assembly_id}.air.${airLayer.air_layer_id}`
      )
    }))
  };
}

function normalizeMaterialRuntime(fixture, assemblyResults) {
  const materials = {};
  for (const [materialId, material] of Object.entries(fixture.materials)) {
    materials[materialId] = {
      material_id: materialId,
      lambda_design_w_mk: material.lambda_w_mk ?? null,
      lambda_origin: material.lambda_w_mk !== undefined ? "explicit_lambda" : "MC001_2_3_relation",
      source_reference: material.source_reference
    };
    if (material.lambda_normat_w_mk !== undefined) {
      materials[materialId].lambda_normat_w_mk = material.lambda_normat_w_mk;
      materials[materialId].correction_coefficient = material.correction_coefficient;
      materials[materialId].correction_source = material.correction_source;
    }
  }
  for (const assembly of assemblyResults) {
    for (const layer of assembly.layers || []) {
      const target = materials[layer.materialId];
      if (!target) continue;
      target.lambda_design_w_mk = layer.lambdaWmK;
      target.lambda_origin = layer.lambdaOrigin === "explicit_material_lambda"
        ? "explicit_lambda"
        : "MC001_2_3_relation";
      if (layer.lambdaNormatWmK !== undefined) target.lambda_normat_w_mk = layer.lambdaNormatWmK;
      if (layer.correctionCoefficientA !== undefined) target.correction_coefficient = layer.correctionCoefficientA;
    }
  }
  return materials;
}

function normalizeAssembly(result) {
  const direct = result.uValueOrigin === "explicit_direct_u_value" ||
    result.uValueOrigin === "explicit_corrected_u_prime";
  return {
    assembly_id: result.assemblyId,
    assembly_type: result.assemblyType,
    u_value_w_m2k: result.uValue,
    u_value_origin: result.uValueOrigin === "calculated_from_explicit_layers_and_surfaces"
      ? "calculated_from_layers_surfaces_and_air_layers"
      : result.uValueOrigin,
    total_resistance_m2k_w: result.totalResistance,
    layers: (result.layers || []).map(layer => ({
      layer_id: layer.layerId,
      material_id: layer.materialId,
      thickness_m: layer.thicknessM,
      lambda_w_mk: layer.lambdaWmK,
      resistance_m2k_w: layer.resistanceM2KPerW
    })),
    air_layers: (result.airLayers || []).map(layer => ({
      air_layer_id: layer.airLayerId,
      resistance_m2k_w: layer.resistanceM2KPerW,
      source_reference: layer.sourceReference || null
    })),
    rsi_m2k_w: result.rsi ?? null,
    rse_m2k_w: result.rse ?? null,
    branch: direct ? "direct_u_override" : "layered_assembly"
  };
}

function envelopeInput(fixture, assemblyById) {
  return {
    mode: "envelope_transmission_coefficient_explicit_v1",
    elements: fixture.envelope.elements.map(element => {
      const component = {
        elementId: element.element_id,
        elementType: element.element_type,
        boundaryType: element.boundary_type,
        area: amount(element.area_m2, "m2", `${fixture.fixture_id}.envelope.${element.element_id}.area`),
        source: source(`${fixture.fixture_id}.envelope.${element.element_id}`),
        assemblyResult: assemblyById.get(element.assembly_id)
      };
      if (element.boundary_type !== "outside_air") {
        component.boundaryCorrectionFactor = amount(
          element.boundary_correction_factor,
          "dimensionless",
          `${fixture.fixture_id}.envelope.${element.element_id}.boundary_factor`
        );
      }
      return component;
    }),
    linearThermalBridges: (fixture.envelope.linear_bridges || []).map(bridge => ({
      bridgeId: bridge.bridge_id,
      component: bridge.component,
      length: amount(bridge.length_m, "m", bridge.source_reference || `${fixture.fixture_id}.bridge.${bridge.bridge_id}.length`),
      psi: amount(bridge.psi_w_mk, "W/(m*K)", bridge.source_reference || `${fixture.fixture_id}.bridge.${bridge.bridge_id}.psi`),
      source: source(bridge.source_reference || `${fixture.fixture_id}.bridge.${bridge.bridge_id}`)
    })),
    pointThermalBridges: (fixture.envelope.point_bridges || []).map(bridge => ({
      bridgeId: bridge.bridge_id,
      component: bridge.component,
      chi: amount(bridge.chi_w_k, "W/K", bridge.source_reference || `${fixture.fixture_id}.bridge.${bridge.bridge_id}.chi`),
      source: source(bridge.source_reference || `${fixture.fixture_id}.bridge.${bridge.bridge_id}`)
    })),
    noThermalBridges: (fixture.envelope.linear_bridges || []).length === 0 &&
      (fixture.envelope.point_bridges || []).length === 0
  };
}

function normalizeEnvelope(result, fixture) {
  const bridgeSourceReferences = new Map([
    ...(fixture.envelope.linear_bridges || []).map(bridge => [bridge.bridge_id, bridge.source_reference || null]),
    ...(fixture.envelope.point_bridges || []).map(bridge => [bridge.bridge_id, bridge.source_reference || null])
  ]);
  return {
    elements: result.elementResults.map(element => ({
      element_id: element.elementId,
      element_type: element.elementType,
      boundary_type: element.boundaryType,
      component: element.component,
      area_m2: element.area,
      u_value_w_m2k: element.uValue,
      u_value_origin: element.uValueOrigin === "calculated_from_explicit_layers_and_surfaces"
        ? "calculated_from_layers_surfaces_and_air_layers"
        : element.uValueOrigin,
      assembly_id: element.assemblyId ?? null,
      boundary_correction_factor: element.boundaryCorrectionFactor,
      boundary_correction_origin: element.boundaryCorrectionOrigin === "direct_exterior_boundary_factor_one"
        ? element.boundaryCorrectionOrigin
        : "explicit_boundary_correction_factor",
      contribution_w_k: element.contributionWK
    })),
    thermal_bridges: result.thermalBridgeResults.map(bridge => ({
      bridge_id: bridge.bridgeId,
      bridge_type: bridge.bridgeType,
      component: bridge.component,
      ...(bridge.lengthM === undefined ? {} : { length_m: bridge.lengthM }),
      ...(bridge.psiWmK === undefined ? {} : { psi_w_mk: bridge.psiWmK }),
      ...(bridge.chiWK === undefined ? {} : { chi_w_k: bridge.chiWK }),
      contribution_w_k: bridge.contributionWK,
      source_reference: bridgeSourceReferences.get(bridge.bridgeId) || null
    })),
    components: Object.fromEntries(["Hd", "Hg", "Hu", "Ha"].map(key => [
      key,
      {
        element_w_k: result.components[key].elementAmount,
        bridge_w_k: result.components[key].thermalBridgeAmount,
        total_w_k: result.components[key].amount
      }
    ])),
    htr_w_k: result.result.amount,
    branch: "explicit_elements_boundaries_and_bridges"
  };
}

function orderMonths(monthly) {
  const byMonth = new Map(monthly.map(month => [month.month, month]));
  return MONTHS.map(month => byMonth.get(month));
}

function monthlyTransmission(fixture, htr, kind) {
  return assertReady(
    calculateMc001MonthlyTransmissionEnergyExplicit({
      mode: "explicit_monthly_transmission_energy_v1",
      cases: orderMonths(fixture.monthly).map(month => ({
        caseId: `${fixture.fixture_id}.${month.month}.${kind}.transmission`,
        month: month.month,
        calculationMode: "explicit_signed",
        htr: { amount: htr, unit: "W/K" },
        indoorTemperature: {
          amount: kind === "heating"
            ? month.heating_indoor_temperature_c
            : month.cooling_indoor_temperature_c,
          unit: "degC"
        },
        outdoorTemperature: { amount: month.outdoor_temperature_c, unit: "degC" },
        duration: { amount: month.duration_hours, unit: "h" },
        source: source(`${fixture.fixture_id}.${month.month}.${kind}.transmission`)
      }))
    }),
    `${kind} monthly transmission`
  );
}

function monthlyVentilation(fixture, kind) {
  return assertReady(
    calculateMc001MonthlyVentilationTransferExplicit({
      mode: "explicit_monthly_ventilation_transfer_v1",
      cases: orderMonths(fixture.monthly).map(month => ({
        caseId: `${fixture.fixture_id}.${month.month}.${kind}.ventilation`,
        month: month.month,
        calculationMode: "explicit_signed",
        airHeatCapacity: amount(
          month.ventilation.air_heat_capacity_j_m3k,
          "J/(m3*K)",
          `${fixture.fixture_id}.${month.month}.air_heat_capacity`
        ),
        components: [
          {
            componentId: "explicit_ventilation",
            label: "explicit ventilation",
            airFlowRate: { amount: month.ventilation.airflow_m3s, unit: "m3/s" },
            temperatureCorrectionFactor: { amount: month.ventilation.bve, unit: "dimensionless" },
            dynamicCorrectionFactor: { amount: month.ventilation.fve_dyn, unit: "dimensionless" },
            source: source(`${fixture.fixture_id}.${month.month}.ventilation`)
          }
        ],
        indoorTemperature: {
          amount: kind === "heating"
            ? month.heating_indoor_temperature_c
            : month.cooling_indoor_temperature_c,
          unit: "degC"
        },
        outdoorTemperature: { amount: month.outdoor_temperature_c, unit: "degC" },
        duration: { amount: month.duration_hours, unit: "h" },
        source: source(`${fixture.fixture_id}.${month.month}.${kind}.ventilation`)
      }))
    }),
    `${kind} monthly ventilation`
  );
}

function monthlyGains(fixture) {
  return assertReady(
    calculateMc001MonthlyHeatGainsExplicit({
      mode: "monthly_heat_gains_explicit_v1",
      cases: orderMonths(fixture.monthly).map(month => {
        const adjacentUnconditionedZones = (month.adjacent_unconditioned_zones || []).map(zone => ({
          zoneId: zone.zone_id,
          internalGains: zone.internal_gains_kwh,
          solarGains: zone.solar_gains_kwh,
          bztu: zone.bztu,
          distributionFactor: zone.distribution_factor,
          gainReductionFactor: zone.gain_reduction_factor
        }));
        return {
          caseId: `${fixture.fixture_id}.${month.month}.gains`,
          month: month.month,
          internalGains: month.internal_gains_kwh,
          solarGains: month.solar_gains_kwh,
          ...(adjacentUnconditionedZones.length === 0 ? {} : { adjacentUnconditionedZones }),
          source: demandSource(`${fixture.fixture_id}.${month.month}.gains`)
        };
      })
    }),
    "monthly gains"
  );
}

function singleGainsResult(gainsResult, gainsCase) {
  return {
    ...gainsResult,
    caseResults: [gainsCase],
    summary: {
      annualQHgn: gainsCase.qHgn,
      caseCount: 1
    }
  };
}

function heatingDemand(fixture, month, qHht, gainsResult, gainsCase, htr, hve) {
  if (!month.heating?.applicable || qHht <= 0) {
    return {
      gamma_h: null,
      tau_h: null,
      a_h: null,
      eta_hgn: null,
      q_hnd_kwh: 0,
      heating_branch: "heating_not_applicable_or_no_positive_transfer"
    };
  }
  const utilization = fixture.utilization;
  const result = assertReady(
    calculateMc001RestrictedHeatingQhndExplicit({
      mode: "restricted_heating_qhnd_explicit_v1",
      cases: [
        {
          caseId: `${fixture.fixture_id}.${month.month}.heating_demand`,
          month: month.month,
          qHht,
          monthlyHeatGainsResult: singleGainsResult(gainsResult, gainsCase),
          utilizationDependencies: {
            effectiveInternalHeatCapacityJPerK: utilization.effective_internal_heat_capacity_j_k,
            totalHeatTransferCoefficientWK: htr + hve,
            aH0: utilization.a_h0 ?? 1,
            tauH0: utilization.tau_h0 ?? 15
          },
          source: demandSource(`${fixture.fixture_id}.${month.month}.heating_demand`)
        }
      ]
    }),
    `${month.month} heating demand`
  );
  const item = result.caseResults[0];
  return {
    gamma_h: item.gammaH,
    tau_h: item.tauH ?? null,
    a_h: item.aH ?? null,
    eta_hgn: item.etaHgn ?? null,
    eta_hgn_branch: item.etaHgnOrigin?.includes("time_constant") || item.etaHgnOrigin?.includes("aH")
      ? "gammaH_not_equal_one"
      : undefined,
    q_hnd_kwh: item.qHnd,
    heating_branch: item.qHndBranch || "figure_2_18_standard_balance"
  };
}

function coolingDemand(fixture, month, qCht, gainsResult, gainsCase, htr, hve) {
  const aCred = month.cooling?.a_cred ?? fixture.utilization.a_cred ?? 1;
  if (!month.cooling?.applicable || qCht <= 0) {
    return {
      gamma_c: null,
      tau_c: null,
      a_c: null,
      eta_cht: null,
      a_cred: aCred,
      q_cnd_kwh: 0,
      cooling_branch: "cooling_not_applicable_or_no_positive_cooling_transfer"
    };
  }
  const utilization = fixture.utilization;
  const result = assertReady(
    calculateMc001CoolingUsefulDemandExplicit({
      mode: "restricted_cooling_qcnd_explicit_v1",
      cases: [
        {
          caseId: `${fixture.fixture_id}.${month.month}.cooling_demand`,
          month: month.month,
          qCht,
          monthlyHeatGainsResult: singleGainsResult(gainsResult, gainsCase),
          utilizationDependencies: {
            effectiveInternalHeatCapacityJPerK: utilization.effective_internal_heat_capacity_j_k,
            totalHeatTransferCoefficientWK: htr + hve,
            aC0: utilization.a_c0 ?? 1,
            tauC0: utilization.tau_c0 ?? 15
          },
          aCred,
          source: demandSource(`${fixture.fixture_id}.${month.month}.cooling_demand`)
        }
      ]
    }),
    `${month.month} cooling demand`
  );
  const item = result.caseResults[0];
  return {
    gamma_c: item.gammaC,
    tau_c: item.tauC ?? null,
    a_c: item.aC ?? null,
    eta_cht: item.etaCht ?? null,
    eta_cht_branch: item.etaChtOrigin?.includes("time_constant") || item.etaChtOrigin?.includes("aC")
      ? "gammaC_not_equal_one"
      : undefined,
    a_cred: item.aCred,
    q_cnd_kwh: item.qCnd,
    cooling_branch: item.qCndBranch || "figure_2_19_cooling_utilized_transfer_branch"
  };
}

function normalizeMonthly(fixture, htr, transmissionHeating, transmissionCooling, ventilationHeating, ventilationCooling, gainsResult) {
  const transmissionHeatingCases = new Map(transmissionHeating.caseResults.map(item => [item.month, item]));
  const transmissionCoolingCases = new Map(transmissionCooling.caseResults.map(item => [item.month, item]));
  const ventilationHeatingCases = new Map(ventilationHeating.caseResults.map(item => [item.month, item]));
  const ventilationCoolingCases = new Map(ventilationCooling.caseResults.map(item => [item.month, item]));
  const gainsCases = new Map(gainsResult.caseResults.map(item => [item.month, item]));
  return orderMonths(fixture.monthly).map(month => {
    const qtrH = transmissionHeatingCases.get(month.month).transmissionEnergy.amount;
    const qtrC = transmissionCoolingCases.get(month.month).transmissionEnergy.amount;
    const qveH = ventilationHeatingCases.get(month.month).ventilationEnergy.amount;
    const qveC = ventilationCoolingCases.get(month.month).ventilationEnergy.amount;
    const hve = ventilationHeatingCases.get(month.month).ventilationHeatTransferCoefficient.amount;
    const qhht = month.heating?.applicable ? Math.max(0, qtrH + qveH) : 0;
    const qcht = month.cooling?.applicable ? Math.max(0, -(qtrC + qveC)) : 0;
    const gainsCase = gainsCases.get(month.month);
    const heating = heatingDemand(fixture, month, qhht, gainsResult, gainsCase, htr, hve);
    const cooling = coolingDemand(fixture, month, qcht, gainsResult, gainsCase, htr, hve);
    const adjacentZones = (gainsCase.adjacentUnconditionedZoneResults || []).map(zone => ({
      zone_id: zone.zoneId,
      bztu: zone.bztu,
      distribution_factor: zone.distributionFactor,
      gain_reduction_factor: zone.gainReductionFactor,
      internal_gain_contribution_kwh: zone.internalGainContribution,
      solar_gain_contribution_kwh: zone.solarGainContribution,
      branch: "explicit_adjacent_unconditioned_zone"
    }));
    return {
      month: month.month,
      duration_hours: month.duration_hours,
      outdoor_temperature_c: month.outdoor_temperature_c,
      heating_indoor_temperature_c: month.heating_indoor_temperature_c,
      cooling_indoor_temperature_c: month.cooling_indoor_temperature_c,
      heating_applicable: Boolean(month.heating?.applicable),
      cooling_applicable: Boolean(month.cooling?.applicable),
      hve_w_k: hve,
      qtr_heating_kwh: qtrH,
      qve_heating_kwh: qveH,
      qht_heating_kwh: qhht,
      qtr_cooling_signed_kwh: qtrC,
      qve_cooling_signed_kwh: qveC,
      qct_transfer_kwh: qcht,
      direct_internal_gains_kwh: gainsCase.directInternalGains,
      direct_solar_gains_kwh: gainsCase.directSolarGains,
      adjacent_internal_gains_kwh: gainsCase.adjacentInternalGains || 0,
      adjacent_solar_gains_kwh: gainsCase.adjacentSolarGains || 0,
      adjacent_zones: adjacentZones,
      internal_gains_kwh: gainsCase.internalGains,
      solar_gains_kwh: gainsCase.solarGains,
      qgn_kwh: gainsCase.qHgn,
      ...heating,
      ...cooling
    };
  });
}

export function calculateRuntimeFixture(fixture) {
  const assemblyRuntime = assertReady(
    calculateMc001EnvelopeAssemblyUValueExplicit({
      mode: "envelope_assembly_u_value_explicit_v1",
      assemblies: fixture.assemblies.map(item => assemblyInput(fixture, item))
    }),
    "assembly U-value"
  );
  const assemblyById = new Map(assemblyRuntime.assemblyResults.map(result => [result.assemblyId, result]));
  const envelopeRuntime = assertReady(
    calculateMc001EnvelopeTransmissionCoefficientExplicit(envelopeInput(fixture, assemblyById)),
    "envelope transmission"
  );
  const normalizedAssemblies = Object.fromEntries(
    assemblyRuntime.assemblyResults.map(result => [result.assemblyId, normalizeAssembly(result)])
  );
  const normalizedEnvelope = normalizeEnvelope(envelopeRuntime, fixture);
  const htr = normalizedEnvelope.htr_w_k;
  const transmissionHeating = monthlyTransmission(fixture, htr, "heating");
  const transmissionCooling = monthlyTransmission(fixture, htr, "cooling");
  const ventilationHeating = monthlyVentilation(fixture, "heating");
  const ventilationCooling = monthlyVentilation(fixture, "cooling");
  const gains = monthlyGains(fixture);
  const monthly = normalizeMonthly(
    fixture,
    htr,
    transmissionHeating,
    transmissionCooling,
    ventilationHeating,
    ventilationCooling,
    gains
  );
  return deterministic({
    schema: "p3v.normalized.v1",
    engine: "lacurent_runtime",
    fixture: {
      fixture_id: fixture.fixture_id,
      description: fixture.description,
      fixture_status: fixture.fixture_status,
      profile_provenance: fixture.profile_provenance
    },
    materials: normalizeMaterialRuntime(fixture, assemblyRuntime.assemblyResults),
    assemblies: normalizedAssemblies,
    envelope: normalizedEnvelope,
    monthly,
    annual: {
      q_hnd_kwh: monthly.reduce((sum, month) => sum + month.q_hnd_kwh, 0),
      q_cnd_kwh: monthly.reduce((sum, month) => sum + month.q_cnd_kwh, 0)
    },
    latent: {
      annual_dehumidification_kwh: 0,
      annual_humidification_kwh: 0,
      branch: "latent_not_in_selected_reference_fixtures",
      included: false
    },
    units: {
      lambda: "W/(m*K)",
      resistance: "m2*K/W",
      u_value: "W/(m2*K)",
      heat_transfer_coefficient: "W/K",
      monthly_energy: "kWh",
      annual_energy: "kWh/year"
    },
    formulas: FORMULAS,
    diagnostics: {
      input_findings: [],
      hidden_input_findings: [],
      status: "PASS"
    }
  });
}

function main() {
  const fixtureArg = process.argv[2];
  if (!fixtureArg) {
    console.error("Usage: node validation-reference/python-mc001/compare/run_lacurent_runtime.mjs fixtures/rb001.json");
    process.exit(2);
  }
  const cwd = path.dirname(fileURLToPath(import.meta.url));
  const fixturePath = path.isAbsolute(fixtureArg)
    ? fixtureArg
    : path.resolve(process.cwd() || cwd, fixtureArg);
  const result = calculateRuntimeFixture(readJson(fixturePath));
  process.stdout.write(`${JSON.stringify(result, null, 2)}\n`);
}

const invokedPath = process.argv[1] ? path.resolve(process.argv[1]) : "";
if (invokedPath && fileURLToPath(import.meta.url) === invokedPath) {
  main();
}
