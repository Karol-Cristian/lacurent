import {
  analyzeMonthlyUsefulDemandSeasonality
} from "../climate-platform/index.mjs";

const TECHNICAL_WORKSPACE_SCOPE = "building_technical_workspace_p2b_report_generation_only";

export const TECHNICAL_WORKSPACE_TABS = Object.freeze([
  { tabId: "building", label: "Building" },
  { tabId: "assemblies", label: "Assemblies" },
  { tabId: "materials", label: "Materials" },
  { tabId: "building_dna", label: "Building DNA" },
  { tabId: "chapter_2", label: "Chapter 2" },
  { tabId: "results", label: "Results" },
  { tabId: "report", label: "Report" },
  { tabId: "traceability", label: "Traceability" }
]);

function blocked(code) {
  return {
    status: "blocked",
    scope: TECHNICAL_WORKSPACE_SCOPE,
    tabs: [],
    report: { chapters: [] },
    diagnostics: {
      blockers: [{ code, severity: "blocking" }],
      warnings: [],
      methodologyLimits: [
        "report_generation_only",
        "values_from_building_dna_and_chapter_2_results",
        "no_duplicate_calculations",
        "not_chapter_3",
        "not_final_energy",
        "not_primary_energy",
        "not_CO2",
        "not_certificate"
      ]
    }
  };
}

function byId(items = [], key = "assemblyId") {
  return new Map(items.map(item => [item?.[key], item]));
}

function byMonth(items = []) {
  return new Map(items.map(item => [item?.month, item]));
}

function provenanceFields(provenance = {}) {
  return {
    origin: provenance.origin ?? null,
    reference: provenance.reference ?? null,
    confidence: provenance.confidence ?? null,
    normativeReference: provenance.normativeReference ?? null,
    calculationSource: provenance.calculationSource ?? null,
    confirmationRequired: provenance.confirmationRequired ?? null
  };
}

function stableNormalize(value) {
  if (Array.isArray(value)) {
    return value.map(stableNormalize);
  }
  if (value && typeof value === "object") {
    return Object.keys(value)
      .sort()
      .reduce((normalized, key) => {
        normalized[key] = stableNormalize(value[key]);
        return normalized;
      }, {});
  }
  return value;
}

function stableString(value) {
  return JSON.stringify(stableNormalize(value));
}

function stableFingerprint(value) {
  const text = stableString(value);
  let hash = 0x811c9dc5;
  for (let index = 0; index < text.length; index += 1) {
    hash ^= text.charCodeAt(index);
    hash += (hash << 1) + (hash << 4) + (hash << 7) + (hash << 8) + (hash << 24);
    hash >>>= 0;
  }
  return hash.toString(16).padStart(8, "0");
}

function makeReportChapter(chapterId, title, summary, rows = [], references = []) {
  return {
    chapterId,
    title,
    summary,
    rows,
    references
  };
}

function assemblyRows(buildingDna, calculation) {
  const dnaAssembliesById = byId(buildingDna.assemblies ?? []);
  return (calculation.assemblyResult?.assemblyResults ?? []).map((assemblyResult) => {
    const dnaAssembly = dnaAssembliesById.get(assemblyResult.assemblyId);
    return {
      assemblyId: assemblyResult.assemblyId,
      displayName: dnaAssembly?.displayName ?? assemblyResult.assemblyId,
      role: dnaAssembly?.assemblyRole ?? null,
      assemblyType: assemblyResult.assemblyType,
      uValue: assemblyResult.uValue,
      uValueUnit: assemblyResult.uValueUnit,
      uValueOrigin: assemblyResult.uValueOrigin,
      totalResistance: assemblyResult.totalResistance,
      totalResistanceUnit: assemblyResult.totalResistanceUnit,
      rsi: assemblyResult.rsi,
      rse: assemblyResult.rse,
      formulaCode: assemblyResult.formulaCode,
      sourceReference: assemblyResult.sourceReference,
      provenance: provenanceFields(dnaAssembly?.provenance),
      layers: (assemblyResult.layers ?? []).map(layer => ({
        layerId: layer.layerId,
        materialId: layer.materialId,
        materialName: layer.materialName,
        thicknessM: layer.thicknessM,
        lambdaWmK: layer.lambdaWmK,
        lambdaNormatWmK: layer.lambdaNormatWmK ?? null,
        correctionCoefficientA: layer.correctionCoefficientA ?? null,
        correctionCoefficientCode: layer.correctionCoefficientCode ?? null,
        lambdaOrigin: layer.lambdaOrigin,
        lambdaFormulaCode: layer.lambdaFormulaCode,
        resistanceM2KPerW: layer.resistanceM2KPerW,
        resistanceFormulaCode: layer.resistanceFormulaCode
      })),
      airLayers: assemblyResult.airLayers ?? []
    };
  });
}

function materialRows(buildingDna, assemblies) {
  const rows = new Map();
  for (const assembly of buildingDna.assemblies ?? []) {
    for (const layer of assembly.layers ?? []) {
      const material = layer.material ?? {};
      const physicsMaterial = material.physicsMaterial ?? {};
      rows.set(material.materialId, {
        materialId: material.materialId,
        physicsMaterialId: physicsMaterial.materialId ?? null,
        displayName: material.displayName,
        category: material.category,
        referenceLambda: physicsMaterial.lambda?.amount ?? physicsMaterial.lambdaNormat?.amount ?? null,
        referenceLambdaUnit: physicsMaterial.lambda?.unit ?? physicsMaterial.lambdaNormat?.unit ?? null,
        correctionCoefficientCode: physicsMaterial.correctionCoefficientCode ?? null,
        provenance: provenanceFields(material.provenance),
        assemblyUsage: []
      });
    }
  }

  for (const assembly of assemblies) {
    for (const layer of assembly.layers ?? []) {
      const matchingDnaAssembly = (buildingDna.assemblies ?? []).find(item => item.assemblyId === assembly.assemblyId);
      const matchingDnaLayer = (matchingDnaAssembly?.layers ?? []).find(item => item.layerId === layer.layerId);
      const materialId = matchingDnaLayer?.materialId ?? layer.materialId;
      const row = rows.get(materialId) ?? {
        materialId,
        physicsMaterialId: layer.materialId,
        displayName: layer.materialName,
        category: null,
        referenceLambda: null,
        referenceLambdaUnit: null,
        correctionCoefficientCode: null,
        provenance: {},
        assemblyUsage: []
      };
      row.designLambdaWmK = layer.lambdaWmK;
      row.lambdaNormatWmK = layer.lambdaNormatWmK ?? row.lambdaNormatWmK ?? null;
      row.lambdaOrigin = layer.lambdaOrigin ?? row.lambdaOrigin ?? null;
      row.lambdaFormulaCode = layer.lambdaFormulaCode ?? row.lambdaFormulaCode ?? null;
      row.correctionCoefficientA = layer.correctionCoefficientA ?? row.correctionCoefficientA ?? null;
      row.correctionCoefficientCode = layer.correctionCoefficientCode ?? row.correctionCoefficientCode ?? null;
      row.assemblyUsage.push({
        assemblyId: assembly.assemblyId,
        displayName: assembly.displayName,
        layerId: layer.layerId,
        thicknessM: layer.thicknessM,
        resistanceM2KPerW: layer.resistanceM2KPerW
      });
      rows.set(materialId, row);
    }
  }
  return [...rows.values()];
}

function envelopeBreakdown(calculation) {
  const envelope = calculation.envelopeTransmissionResult ?? {};
  const components = envelope.components ?? {};
  return {
    htr: envelope.result ?? null,
    components: ["Hd", "Hg", "Hu", "Ha"].map(componentId => ({
      componentId,
      amount: components[componentId]?.amount ?? null,
      unit: components[componentId]?.unit ?? "W/K",
      elementAmount: components[componentId]?.elementAmount ?? null,
      thermalBridgeAmount: components[componentId]?.thermalBridgeAmount ?? null
    })),
    elementRows: envelope.elementResults ?? [],
    thermalBridgeRows: envelope.thermalBridgeResults ?? []
  };
}

function quantityAmount(value) {
  return value?.amount ?? null;
}

function temperatureDelta(indoor, outdoor) {
  return Number.isFinite(indoor) && Number.isFinite(outdoor)
    ? indoor - outdoor
    : null;
}

function monthlyRows(calculation, buildingDna) {
  const chapter2 = calculation.chapter2Result?.result ?? {};
  const heatingByMonth = byMonth(chapter2.heatingResult?.caseResults ?? []);
  const coolingByMonth = byMonth(chapter2.coolingResult?.caseResults ?? []);
  const dnaByMonth = byMonth(buildingDna.monthlyProfiles ?? []);
  return (chapter2.monthlyResults ?? []).map((monthResult) => {
    const heating = heatingByMonth.get(monthResult.month);
    const cooling = coolingByMonth.get(monthResult.month);
    const dnaMonth = dnaByMonth.get(monthResult.month);
    const heatingIndoor = quantityAmount(dnaMonth?.transmission?.heating?.indoorTemperature);
    const heatingOutdoor = quantityAmount(dnaMonth?.transmission?.heating?.outdoorTemperature);
    const coolingIndoor = quantityAmount(dnaMonth?.transmission?.cooling?.indoorTemperature);
    const coolingOutdoor = quantityAmount(dnaMonth?.transmission?.cooling?.outdoorTemperature);
    return {
      caseId: monthResult.caseId,
      month: monthResult.month,
      durationHours: quantityAmount(dnaMonth?.transmission?.heating?.duration),
      heatingIndoorTemperatureC: heatingIndoor,
      heatingOutdoorTemperatureC: heatingOutdoor,
      heatingTemperatureDifferenceK: temperatureDelta(heatingIndoor, heatingOutdoor),
      coolingIndoorTemperatureC: coolingIndoor,
      coolingOutdoorTemperatureC: coolingOutdoor,
      coolingTemperatureDifferenceK: temperatureDelta(coolingOutdoor, coolingIndoor),
      ventilationAirFlowRateM3PerS: quantityAmount(dnaMonth?.ventilation?.heating?.airFlowRate),
      ventilationAirHeatCapacityJPerM3K: quantityAmount(dnaMonth?.ventilation?.heating?.airHeatCapacity),
      solarOrientation: dnaMonth?.heatGains?.solarOrientation ?? null,
      solarGainsSource: dnaMonth?.heatGains?.solarGainsSource ?? null,
      monthlyProfileOrigin: dnaMonth?.provenance?.origin ?? null,
      monthlyProfileReference: dnaMonth?.provenance?.reference ?? null,
      heatingTransmissionKwh: monthResult.transmission?.heating?.transmissionEnergy?.amount ?? null,
      coolingTransmissionKwh: monthResult.transmission?.cooling?.transmissionEnergy?.amount ?? null,
      heatingVentilationKwh: monthResult.ventilation?.heating?.ventilationEnergy?.amount ?? null,
      coolingVentilationKwh: monthResult.ventilation?.cooling?.ventilationEnergy?.amount ?? null,
      internalGainsKwh: monthResult.heatGains?.internalGains ?? null,
      solarGainsKwh: monthResult.heatGains?.solarGains ?? null,
      qHgnKwh: monthResult.heatGains?.qHgn ?? null,
      qHndKwh: heating?.qHnd ?? null,
      qHndFormulaCode: heating?.formulaCode ?? null,
      qHndOrigin: heating?.etaHgnOrigin ?? null,
      qCndKwh: cooling?.qCnd ?? null,
      qCndFormulaCode: cooling?.formulaCode ?? null,
      qCndOrigin: cooling?.etaChtOrigin ?? null
    };
  });
}

function calculationFingerprint(buildingDna, calculation, monthly) {
  return {
    fingerprintId: stableFingerprint({
      buildingDnaSchema: buildingDna.schema,
      building: buildingDna.building,
      climateProfile: {
        profileId: buildingDna.climateProfile?.profileId ?? null,
        datasetVersion: buildingDna.climateProfile?.datasetVersion ?? null,
        sourceType: buildingDna.climateProfile?.sourceType ?? null,
        verificationStatus: buildingDna.climateProfile?.verificationStatus ?? null
      },
      assemblies: (buildingDna.assemblies ?? []).map(assembly => ({
        assemblyId: assembly.assemblyId,
        role: assembly.assemblyRole,
        layers: (assembly.layers ?? []).map(layer => ({
          materialId: layer.materialId,
          thicknessM: quantityAmount(layer.thickness)
        }))
      })),
      envelopeElements: (buildingDna.envelopeElements ?? []).map(element => ({
        elementId: element.elementId,
        assemblyId: element.assemblyId,
        component: element.component,
        area: quantityAmount(element.area),
        orientation: quantityAmount(element.orientation) ?? element.orientation ?? null,
        boundaryType: element.boundaryType
      })),
      thermalBridges: buildingDna.thermalBridges ?? [],
      monthly: monthly.map(row => ({
        month: row.month,
        durationHours: row.durationHours,
        heatingOutdoorTemperatureC: row.heatingOutdoorTemperatureC,
        coolingOutdoorTemperatureC: row.coolingOutdoorTemperatureC,
        ventilationAirFlowRateM3PerS: row.ventilationAirFlowRateM3PerS,
        internalGainsKwh: row.internalGainsKwh,
        solarGainsKwh: row.solarGainsKwh,
        solarOrientation: row.solarOrientation
      })),
      engine: {
        chapter2Scope: calculation.chapter2Result?.scope ?? null,
        envelopeScope: calculation.envelopeTransmissionResult?.scope ?? null
      },
      outputs: {
        htr: calculation.envelopeTransmissionResult?.result?.amount ?? null,
        annualQHnd: calculation.chapter2Result?.result?.annualQHnd ?? null,
        annualQCnd: calculation.chapter2Result?.result?.annualQCnd ?? null
      }
    }),
    inputs: {
      buildingDnaSchema: buildingDna.schema,
      climateProfileId: buildingDna.climateProfile?.profileId ?? null,
      climateProfileVersion: buildingDna.climateProfile?.datasetVersion ?? null,
      adapterStage: calculation.stage ?? null,
      engineScope: calculation.chapter2Result?.scope ?? null
    },
    outputs: {
      annualQHnd: calculation.chapter2Result?.result?.annualQHnd ?? null,
      annualQCnd: calculation.chapter2Result?.result?.annualQCnd ?? null,
      htr: calculation.envelopeTransmissionResult?.result?.amount ?? null
    }
  };
}

function formulaViews(assemblies, envelope, monthly, calculation) {
  const envelopeFormulaReferences = calculation.envelopeTransmissionResult?.formulaReferences ?? [];
  const htrFormulaReference = envelopeFormulaReferences.find(reference => reference.includes("2_15")) ??
    envelopeFormulaReferences[0] ??
    null;
  const assemblyFormulaViews = assemblies.map(assembly => ({
    formulaId: assembly.formulaCode,
    formulaName: `U-value for ${assembly.displayName}`,
    resultSymbol: "U",
    resultValue: assembly.uValue,
    resultUnit: assembly.uValueUnit,
    origin: assembly.uValueOrigin,
    inputVariables: [
      { symbol: "Rsi", value: assembly.rsi, unit: assembly.totalResistanceUnit },
      { symbol: "Rse", value: assembly.rse, unit: assembly.totalResistanceUnit },
      { symbol: "Rtotal", value: assembly.totalResistance, unit: assembly.totalResistanceUnit }
    ],
    sourceReference: assembly.sourceReference
  }));

  const htrFormulaViews = [
    {
      formulaId: htrFormulaReference,
      formulaName: "Total transmission heat transfer coefficient",
      resultSymbol: envelope.htr?.symbol ?? "H_tr",
      resultValue: envelope.htr?.amount ?? null,
      resultUnit: envelope.htr?.unit ?? "W/K",
      origin: envelope.htr?.origin ?? null,
      inputVariables: envelope.components.map(component => ({
        symbol: component.componentId,
        value: component.amount,
        unit: component.unit
      })),
      sourceReference: envelopeFormulaReferences.join(", ") || null
    }
  ];

  const monthFormulaViews = [];
  for (const row of monthly.slice(0, 12)) {
    monthFormulaViews.push({
      formulaId: row.qHndFormulaCode,
      formulaName: `Monthly heating useful demand - ${row.month}`,
      resultSymbol: "QHnd",
      resultValue: row.qHndKwh,
      resultUnit: "kWh",
      origin: row.qHndOrigin,
      inputVariables: [
        { symbol: "Qtr,H", value: row.heatingTransmissionKwh, unit: "kWh" },
        { symbol: "Qve,H", value: row.heatingVentilationKwh, unit: "kWh" },
        { symbol: "QHgn", value: row.qHgnKwh, unit: "kWh" }
      ],
      sourceReference: row.caseId
    });
    monthFormulaViews.push({
      formulaId: row.qCndFormulaCode,
      formulaName: `Monthly cooling useful demand - ${row.month}`,
      resultSymbol: "QCnd",
      resultValue: row.qCndKwh,
      resultUnit: "kWh",
      origin: row.qCndOrigin,
      inputVariables: [
        { symbol: "Qtr,C", value: row.coolingTransmissionKwh, unit: "kWh" },
        { symbol: "Qve,C", value: row.coolingVentilationKwh, unit: "kWh" },
        { symbol: "QCgn", value: row.qHgnKwh, unit: "kWh" }
      ],
      sourceReference: row.caseId
    });
  }

  return [
    ...assemblyFormulaViews,
    ...htrFormulaViews,
    ...monthFormulaViews
  ];
}

function traceabilityRows(buildingDna, calculation, formulas) {
  const references = new Set([
    ...(calculation.assemblyResult?.formulaReferences ?? []),
    ...(calculation.envelopeTransmissionResult?.formulaReferences ?? []),
    ...(calculation.chapter2Result?.formulaReferences ?? []),
    ...(calculation.chapter2Result?.result?.combinedUsefulDemandResult?.formulaReferences ?? []),
    ...formulas.map(item => item.formulaId).filter(Boolean)
  ]);
  return [...references].map(reference => ({
    reference,
    chapter: reference?.startsWith("MC001") ? "MC001 Chapter 2" : null,
    source: "validated_chapter_2_physics_engine",
    buildingDnaLink: buildingDna.schema
  }));
}

function reportChapters({ buildingDna, assemblies, materials, envelope, monthly, formulas, traceability, calculation, fingerprint, seasonalSanity }) {
  const chapter2 = calculation.chapter2Result?.result ?? {};
  return [
    makeReportChapter("general_project_information", "General Project Information", "Building DNA technical report generated from the current engineering model.", [
      { label: "Building ID", value: buildingDna.building?.buildingId },
      { label: "Building type", value: buildingDna.building?.buildingType },
      { label: "Construction period", value: buildingDna.building?.constructionPeriod },
      { label: "Structural system", value: buildingDna.building?.structuralSystem },
      { label: "Calculation fingerprint", value: fingerprint.fingerprintId }
    ]),
    makeReportChapter("building_description", "Building Description", "Typology proposal and building-specific parameters.", [
      { label: "Typology proposal", value: buildingDna.typologyProposal?.typologyId ?? buildingDna.typologyProposal?.proposalId },
      { label: "User mode", value: buildingDna.userMode },
      { label: "Geometry fields", value: Object.keys(buildingDna.geometry ?? {}).join(", ") }
    ]),
    makeReportChapter("building_dna", "Building DNA", "Canonical engineering model consumed by the physics adapter.", [
      { label: "Schema", value: buildingDna.schema },
      { label: "Assemblies", value: assemblies.length },
      { label: "Envelope elements", value: buildingDna.envelopeElements?.length ?? 0 },
      { label: "Monthly profiles", value: buildingDna.monthlyProfiles?.length ?? 0 }
    ]),
    makeReportChapter("engineering_assumptions", "Engineering Assumptions", "Assumptions and confirmations preserved from Building DNA.", [
      ...(buildingDna.assumptions ?? []).map(item => ({ label: "Assumption", value: item.text })),
      ...(buildingDna.missingConfirmations ?? []).map(item => ({ label: "Confirmation required", value: item }))
    ]),
    makeReportChapter("envelope_assemblies", "Envelope Assemblies", "Resolved assemblies passed to the Chapter 2 assembly engine.", assemblies),
    makeReportChapter("materials", "Materials", "Material catalogue selections and resolved design conductivities.", materials),
    makeReportChapter("layer_stacks", "Layer Stacks", "Layer thickness, conductivity, and resistance values from assembly results.", assemblies.flatMap(assembly => assembly.layers.map(layer => ({
      assemblyId: assembly.assemblyId,
      assemblyName: assembly.displayName,
      ...layer
    })))),
    makeReportChapter("thermal_resistances", "Thermal Resistances", "Surface, layer, and total thermal resistance values emitted by Chapter 2 assembly results.", assemblies.map(assembly => ({
      assemblyId: assembly.assemblyId,
      totalResistance: assembly.totalResistance,
      totalResistanceUnit: assembly.totalResistanceUnit,
      rsi: assembly.rsi,
      rse: assembly.rse
    }))),
    makeReportChapter("u_values", "U-values", "Thermal transmittance values emitted by Chapter 2 assembly results.", assemblies.map(assembly => ({
      assemblyId: assembly.assemblyId,
      uValue: assembly.uValue,
      unit: assembly.uValueUnit,
      origin: assembly.uValueOrigin,
      formulaCode: assembly.formulaCode
    }))),
    makeReportChapter("boundary_conditions", "Boundary Conditions", "Envelope element boundaries and correction origins.", envelope.elementRows.map(element => ({
      elementId: element.elementId,
      boundaryType: element.boundaryType,
      component: element.component,
      boundaryCorrectionFactor: element.boundaryCorrectionFactor,
      boundaryCorrectionOrigin: element.boundaryCorrectionOrigin,
      formulaCode: element.boundaryCorrectionFormulaCode ?? element.contributionFormulaCode
    }))),
    makeReportChapter("heat_transfer_coefficients", "Heat Transfer Coefficients", "Hd, Hg, Hu, Ha, bridges, and total Htr emitted by the envelope engine.", [
      ...envelope.components,
      { componentId: "Htr", amount: envelope.htr?.amount, unit: envelope.htr?.unit, origin: envelope.htr?.origin }
    ]),
    makeReportChapter("monthly_input_transparency", "Monthly Input Transparency", "Explicit monthly inputs preserved in Building DNA before Chapter 2 calculation.", monthly.map(row => ({
      month: row.month,
      durationHours: row.durationHours,
      heatingIndoorTemperatureC: row.heatingIndoorTemperatureC,
      heatingOutdoorTemperatureC: row.heatingOutdoorTemperatureC,
      heatingTemperatureDifferenceK: row.heatingTemperatureDifferenceK,
      coolingIndoorTemperatureC: row.coolingIndoorTemperatureC,
      coolingOutdoorTemperatureC: row.coolingOutdoorTemperatureC,
      coolingTemperatureDifferenceK: row.coolingTemperatureDifferenceK,
      ventilationAirFlowRateM3PerS: row.ventilationAirFlowRateM3PerS,
      ventilationAirHeatCapacityJPerM3K: row.ventilationAirHeatCapacityJPerM3K,
      solarOrientation: row.solarOrientation,
      solarGainsSource: row.solarGainsSource,
      monthlyProfileOrigin: row.monthlyProfileOrigin,
      monthlyProfileReference: row.monthlyProfileReference
    }))),
    makeReportChapter("monthly_seasonal_sanity", "Monthly Seasonal Sanity", "Non-blocking review diagnostics for seasonal climate/result patterns. Explicit unusual profiles remain calculable but must be explainable.", [
      { label: "Summer QCnd", value: seasonalSanity.checks.summerCoolingKwh, unit: "kWh" },
      { label: "May + October QCnd", value: seasonalSanity.checks.shoulderCoolingKwh, unit: "kWh" },
      {
        label: "Warnings",
        value: seasonalSanity.diagnostics.warnings.map(item => item.code).join(", ") || "none"
      }
    ]),
    makeReportChapter("transmission_losses", "Transmission Losses", "Monthly transmission energy emitted by the Chapter 2 result.", monthly.map(row => ({
      month: row.month,
      heatingTransmissionKwh: row.heatingTransmissionKwh,
      coolingTransmissionKwh: row.coolingTransmissionKwh
    }))),
    makeReportChapter("ventilation_losses", "Ventilation Losses", "Monthly ventilation transfer emitted by the Chapter 2 result.", monthly.map(row => ({
      month: row.month,
      heatingVentilationKwh: row.heatingVentilationKwh,
      coolingVentilationKwh: row.coolingVentilationKwh
    }))),
    makeReportChapter("solar_gains", "Solar Gains", "Monthly solar gains emitted by the Chapter 2 heat-gains result.", monthly.map(row => ({
      month: row.month,
      solarGainsKwh: row.solarGainsKwh
    }))),
    makeReportChapter("internal_gains", "Internal Gains", "Monthly internal gains emitted by the Chapter 2 heat-gains result.", monthly.map(row => ({
      month: row.month,
      internalGainsKwh: row.internalGainsKwh
    }))),
    makeReportChapter("monthly_heating_demand", "Monthly Heating Demand", "Monthly QHnd emitted by the Chapter 2 heating useful-demand result.", monthly.map(row => ({
      month: row.month,
      qHndKwh: row.qHndKwh,
      formulaCode: row.qHndFormulaCode,
      origin: row.qHndOrigin
    }))),
    makeReportChapter("monthly_cooling_demand", "Monthly Cooling Demand", "Monthly QCnd emitted by the Chapter 2 cooling useful-demand result.", monthly.map(row => ({
      month: row.month,
      qCndKwh: row.qCndKwh,
      formulaCode: row.qCndFormulaCode,
      origin: row.qCndOrigin
    }))),
    makeReportChapter("annual_results", "Annual Results", "Separate useful-demand annual outputs. No final energy, primary energy, CO2, CPE, or certificate result is generated here.", [
      { label: "Annual QHnd", value: chapter2.annualQHnd, unit: "kWh" },
      { label: "Annual QCnd", value: chapter2.annualQCnd, unit: "kWh" },
      { label: "Month count", value: chapter2.monthCount }
    ]),
    makeReportChapter("calculation_fingerprint", "Calculation Fingerprint", "Stable diagnostic fingerprint used to detect stale Building DNA, adapter input, engine output, or report data.", [
      { label: "Fingerprint", value: fingerprint.fingerprintId },
      { label: "Building DNA schema", value: fingerprint.inputs.buildingDnaSchema },
      { label: "Climate profile", value: fingerprint.inputs.climateProfileId },
      { label: "Climate profile version", value: fingerprint.inputs.climateProfileVersion },
      { label: "Adapter stage", value: fingerprint.inputs.adapterStage },
      { label: "Engine scope", value: fingerprint.inputs.engineScope },
      { label: "Htr", value: fingerprint.outputs.htr, unit: "W/K" },
      { label: "Annual QHnd", value: fingerprint.outputs.annualQHnd, unit: "kWh" },
      { label: "Annual QCnd", value: fingerprint.outputs.annualQCnd, unit: "kWh" }
    ]),
    makeReportChapter("engineering_traceability", "Engineering Traceability", "Formula viewer entries and dependency-tree references.", formulas),
    makeReportChapter("normative_references", "Normative References", "MC001 references reported by the validated Chapter 2 engine.", traceability)
  ];
}

export function buildBuildingTechnicalWorkspace(pipelineResult = {}) {
  if (pipelineResult.status !== "ready") {
    return blocked("pipeline_result_not_ready");
  }
  const buildingDna = pipelineResult.buildingDna;
  const calculation = pipelineResult.calculation;
  if (!buildingDna || calculation?.status !== "ready") {
    return blocked("building_dna_or_chapter_2_result_missing");
  }

  const assemblies = assemblyRows(buildingDna, calculation);
  const materials = materialRows(buildingDna, assemblies);
  const envelope = envelopeBreakdown(calculation);
  const monthly = monthlyRows(calculation, buildingDna);
  const seasonalSanity = analyzeMonthlyUsefulDemandSeasonality(monthly);
  const formulas = formulaViews(assemblies, envelope, monthly, calculation);
  const traceability = traceabilityRows(buildingDna, calculation, formulas);
  const fingerprint = calculationFingerprint(buildingDna, calculation, monthly);
  const chapters = reportChapters({
    buildingDna,
    assemblies,
    materials,
    envelope,
    monthly,
    formulas,
    traceability,
    calculation,
    fingerprint,
    seasonalSanity
  });

  return {
    status: "ready",
    scope: TECHNICAL_WORKSPACE_SCOPE,
    tabs: TECHNICAL_WORKSPACE_TABS.map(tab => ({
      ...tab,
      status: "ready"
    })),
    buildingSummary: {
      buildingId: buildingDna.building?.buildingId,
      buildingType: buildingDna.building?.buildingType,
      constructionPeriod: buildingDna.building?.constructionPeriod,
      structuralSystem: buildingDna.building?.structuralSystem,
      typologyId: buildingDna.typologyProposal?.typologyId ?? buildingDna.typologyProposal?.proposalId ?? null,
      userMode: buildingDna.userMode
    },
    assemblies,
    materials,
    envelope,
    monthly,
    seasonalSanity,
    calculationFingerprint: fingerprint,
    formulaViews: formulas,
    dependencyTrees: pipelineResult.review?.dependencyTrees ?? {},
    traceability,
    report: {
      reportId: "technical_chapter_2_report_v1",
      title: "Chapter 2 Technical Engineering Report",
      source: "Building DNA + validated Chapter 2 physics engine",
      calculationFingerprint: fingerprint,
      chapters
    },
    resultSummary: {
      annualQHnd: calculation.chapter2Result?.result?.annualQHnd ?? null,
      annualQCnd: calculation.chapter2Result?.result?.annualQCnd ?? null,
      monthCount: calculation.chapter2Result?.result?.monthCount ?? null
    },
    diagnostics: {
      blockers: [],
      warnings: [],
      methodologyLimits: [
        "report_generation_only",
        "values_from_building_dna_and_chapter_2_results",
        "chapter_2_physics_engine_is_calculation_authority",
        "no_duplicate_calculations",
        "no_hidden_defaults",
        "not_chapter_3",
        "not_final_energy",
        "not_primary_energy",
        "not_CO2",
        "not_certificate"
      ]
    }
  };
}
