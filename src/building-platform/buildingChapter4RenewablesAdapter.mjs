import { MONTH_IDS } from "../climate-platform/index.mjs";
import {
  MC001_CHAPTER4_PV_CORRECTION_TABLE_4_5_ID,
  MC001_CHAPTER4_PV_RUNTIME_VERSION,
  calculateMc001Chapter4PhotovoltaicMonthlyProduction
} from "../physics-engine/mc001Chapter4Photovoltaics.mjs";

export const CHAPTER4_RENEWABLES_ADAPTER_VERSION =
  "building_chapter_4_renewables_adapter_p7_v1";

export const CHAPTER4_RENEWABLES_PRODUCT_MAPPING_LEDGER = Object.freeze([
  {
    groupId: "photovoltaic_monthly",
    mc001RelationGroup: "MC001 Chapter 4.5 photovoltaic monthly method, relations 4.160-4.165",
    runtimeModule: "src/physics-engine/mc001Chapter4Photovoltaics.mjs",
    requiredInputFields: Object.freeze([
      "technicalSystems.renewableProduction.photovoltaic.systems[].panelCount",
      "technicalSystems.renewableProduction.photovoltaic.systems[].panelAreaM2",
      "technicalSystems.renewableProduction.photovoltaic.systems[].maximumPowerWAt1000",
      "technicalSystems.renewableProduction.photovoltaic.systems[].inverterEfficiency",
      "technicalSystems.renewableProduction.photovoltaic.systems[].mounting.correctionTableId",
      "buildingDna.climateProvider.datasets.monthlySolarIrradiation.monthlyRecords"
    ]),
    optionalInputFields: Object.freeze([
      "temperatureEfficiencyMode",
      "temperatureEfficiencyFactor",
      "temperatureEfficiencyFactors",
      "mounting.tiltDeg",
      "mounting.azimuthDegFromSouth"
    ]),
    units: Object.freeze(["m2", "W", "W/m2", "kWh/month", "kWh/year", "fraction"]),
    enumValues: Object.freeze({
      correctionTableId: Object.freeze([MC001_CHAPTER4_PV_CORRECTION_TABLE_4_5_ID]),
      temperatureEfficiencyMode: Object.freeze(["annex_a2_monocrystalline", "explicit_constant", "explicit_monthly"])
    }),
    outputs: Object.freeze([
      "chapter4Result.annual.photovoltaicElectricEnergyKWh",
      "chapter4Result.monthly[].photovoltaicElectricEnergyKWh",
      "chapter4Result.photovoltaic.systems[].monthly[].electricEnergyKWh"
    ]),
    notebookSection: "chapter4.photovoltaic",
    reportSection: "surse_regenerabile_capitolul_4.photovoltaic",
    uiSection: "installations.renewables.photovoltaic",
    persistencePath: "buildingDna.technicalSystems.renewableProduction.photovoltaic",
    testFixture: "buildingChapter4RenewablesProduct.test.mjs"
  }
]);

function deepClone(value) {
  return JSON.parse(JSON.stringify(value));
}

function isPlainObject(value) {
  return value !== null && typeof value === "object" && !Array.isArray(value);
}

function enabled(section) {
  return section?.enabled === true;
}

function diagnostic(code, path, message) {
  return { code, path, message, severity: "blocking" };
}

function photovoltaicSystems(technicalSystems = {}) {
  const renewableProduction = technicalSystems.renewableProduction ?? technicalSystems.renewables ?? {};
  const section = renewableProduction.photovoltaic ?? {};
  if (!enabled(renewableProduction) && !enabled(section)) return [];
  if (Array.isArray(section.systems)) {
    return section.systems.filter(system => system?.enabled !== false);
  }
  return enabled(section) ? [section] : [];
}

function monthlySolarIrradiance(buildingDna = {}, diagnostics) {
  const dataset = buildingDna.climateProvider?.datasets?.monthlySolarIrradiation ?? null;
  const records = dataset?.monthlyRecords ?? [];
  if (!Array.isArray(records) || records.length !== 12) {
    diagnostics.push(diagnostic(
      "chapter4_pv_monthly_solar_irradiance_unavailable",
      "climateProvider.datasets.monthlySolarIrradiation.monthlyRecords",
      dataset?.diagnostic?.sourceReference ??
        "MC001 Chapter 4.5 PV calculation requires source-backed monthly horizontal irradiance."
    ));
    return null;
  }
  return {
    dataset: {
      datasetId: dataset.datasetId ?? dataset.tableId ?? null,
      datasetVersion: dataset.datasetVersion ?? null,
      datasetStatus: dataset.datasetStatus ?? null,
      sourceReference: dataset.sourceReference ?? null,
      sourceDocument: dataset.sourceDocument ?? null
    },
    records: MONTH_IDS.map((month, index) => {
      const record = records[index] ?? {};
      return {
        month,
        horizontalIrradianceWPerM2: record.totalIrradianceWPerM2?.horizontal,
        sourceReference: record.sourceReference ?? dataset.sourceReference ?? null,
        sourcePdfPage: record.sourcePdfPage ?? null
      };
    })
  };
}

export function hasActiveChapter4RenewableSystems(buildingDna = {}) {
  return photovoltaicSystems(buildingDna.technicalSystems ?? {}).length > 0;
}

export function validateChapter4RenewableSystems(technicalSystems = {}) {
  if (technicalSystems === undefined || technicalSystems === null) return { ok: true, diagnostics: [] };
  if (!isPlainObject(technicalSystems)) {
    return {
      ok: false,
      diagnostics: [diagnostic("invalid_technical_systems_model", "technicalSystems")]
    };
  }
  return { ok: true, diagnostics: [] };
}

export function buildChapter4RuntimeInputFromBuildingDna(buildingDna = {}) {
  const technicalSystems = buildingDna.technicalSystems ?? {};
  const systems = photovoltaicSystems(technicalSystems);
  if (systems.length === 0) {
    return {
      status: "not_applicable",
      code: "chapter4_renewable_systems_not_enabled",
      diagnostics: []
    };
  }

  const diagnostics = [];
  const validation = validateChapter4RenewableSystems(technicalSystems);
  diagnostics.push(...validation.diagnostics);
  const solar = monthlySolarIrradiance(buildingDna, diagnostics);
  if (diagnostics.length > 0 || !solar) {
    return {
      status: "blocked",
      code: "chapter4_renewable_inputs_invalid",
      diagnostics
    };
  }

  return {
    status: "ready",
    input: {
      schema: "mc001_chapter4_renewable_runtime_input_v1",
      adapterVersion: CHAPTER4_RENEWABLES_ADAPTER_VERSION,
      services: {
        photovoltaicEnabled: true
      },
      photovoltaic: {
        solarDataset: solar.dataset,
        systems: systems.map((system, index) => ({
          systemId: system.systemId ?? `photovoltaic-system-${index + 1}`,
          enabled: true,
          panelCount: system.panelCount,
          panelAreaM2: system.panelAreaM2,
          maximumPowerWAt1000: system.maximumPowerWAt1000 ?? system.maximumPowerW,
          inverterEfficiency: system.inverterEfficiency,
          temperatureEfficiencyMode: system.temperatureEfficiencyMode,
          temperatureEfficiencyFactor: system.temperatureEfficiencyFactor,
          temperatureEfficiencyFactors: system.temperatureEfficiencyFactors,
          temperatureEfficiencySourceReference: system.temperatureEfficiencySourceReference,
          mounting: {
            tiltDeg: system.mounting?.tiltDeg ?? system.tiltDeg,
            azimuthDegFromSouth: system.mounting?.azimuthDegFromSouth ?? system.azimuthDegFromSouth,
            correctionTableId: system.mounting?.correctionTableId ?? system.correctionTableId
          },
          monthlyHorizontalIrradiance: solar.records,
          source: deepClone(system.source ?? null)
        }))
      }
    },
    diagnostics: []
  };
}

function aggregatePhotovoltaic(systems) {
  const monthly = MONTH_IDS.map(month => {
    const monthSystems = systems
      .map(system => system.monthly.find(item => item.month === month))
      .filter(Boolean);
    return {
      month,
      photovoltaicElectricEnergyKWh: monthSystems.reduce((sum, item) => sum + item.electricEnergyKWh, 0),
      photovoltaicIncidentEnergyKWh: monthSystems.reduce((sum, item) => sum + item.incidentEnergyKWh, 0)
    };
  });
  const annualElectricEnergyKWh = monthly.reduce(
    (sum, item) => sum + item.photovoltaicElectricEnergyKWh,
    0
  );
  const annualIncidentEnergyKWh = monthly.reduce(
    (sum, item) => sum + item.photovoltaicIncidentEnergyKWh,
    0
  );
  return {
    monthly,
    annual: {
      photovoltaicElectricEnergyKWh: annualElectricEnergyKWh,
      photovoltaicIncidentEnergyKWh: annualIncidentEnergyKWh,
      photovoltaicCaptureEfficiency:
        annualIncidentEnergyKWh > 0 ? annualElectricEnergyKWh / annualIncidentEnergyKWh : 0
    }
  };
}

export function calculateChapter4RenewableProductionForBuildingDna(buildingDna = {}) {
  const mapped = buildChapter4RuntimeInputFromBuildingDna(buildingDna);
  if (mapped.status !== "ready") {
    return mapped;
  }

  const photovoltaicResults = mapped.input.photovoltaic.systems.map(systemInput =>
    calculateMc001Chapter4PhotovoltaicMonthlyProduction({
      ...systemInput,
      solarDataset: mapped.input.photovoltaic.solarDataset
    })
  );
  const blockedResult = photovoltaicResults.find(result => result.status !== "calculated");
  if (blockedResult) {
    return {
      status: "blocked",
      code: blockedResult.code ?? "chapter4_pv_runtime_blocked",
      input: mapped.input,
      diagnostics: blockedResult.diagnostics ?? []
    };
  }

  const photovoltaic = aggregatePhotovoltaic(photovoltaicResults);
  const formulaReferences = [...new Set(photovoltaicResults.flatMap(result => result.formulaReferences ?? []))];
  return {
    status: "ready",
    adapterVersion: CHAPTER4_RENEWABLES_ADAPTER_VERSION,
    chapter4Input: mapped.input,
    chapter4Result: {
      status: "calculated",
      runtimeVersion: MC001_CHAPTER4_PV_RUNTIME_VERSION,
      calculationScope: "mc001_chapter_4_renewable_production_supported_p7_subset",
      services: {
        photovoltaic: {
          enabled: true,
          systemCount: photovoltaicResults.length
        }
      },
      annual: photovoltaic.annual,
      monthly: photovoltaic.monthly,
      photovoltaic: {
        systems: photovoltaicResults
      },
      formulaReferences,
      diagnostics: []
    },
    diagnostics: []
  };
}
