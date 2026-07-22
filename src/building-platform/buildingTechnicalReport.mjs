import {
  analyzeMonthlyUsefulDemandSeasonality
} from "../climate-platform/index.mjs";
import {
  buildChapter3NotebookSections
} from "../physics-engine/mc001Chapter3Notebook.mjs";

const TECHNICAL_WORKSPACE_SCOPE = "engineering_calculation_notebook_p3g_report_generation_only";

export const TECHNICAL_WORKSPACE_TABS = Object.freeze([
  { tabId: "building", label: "Cladire" },
  { tabId: "assemblies", label: "Anvelopa" },
  { tabId: "materials", label: "Materiale" },
  { tabId: "building_dna", label: "Building DNA" },
  { tabId: "chapter_2", label: "Calcul MC001" },
  { tabId: "installations", label: "Instalatii" },
  { tabId: "results", label: "Rezultate" },
  { tabId: "report", label: "Raport" },
  { tabId: "traceability", label: "Trasabilitate" }
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
      monthLabel: monthLabel(monthResult.month),
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
      heatingTransmissionHeatFlowW: monthResult.transmission?.heating?.heatFlow?.amount ?? null,
      coolingTransmissionHeatFlowW: monthResult.transmission?.cooling?.heatFlow?.amount ?? null,
      heatingTransmissionKwh: monthResult.transmission?.heating?.transmissionEnergy?.amount ?? null,
      coolingTransmissionKwh: monthResult.transmission?.cooling?.transmissionEnergy?.amount ?? null,
      heatingVentilationHeatTransferWPerK: monthResult.ventilation?.heating?.ventilationHeatTransferCoefficient?.amount ?? null,
      coolingVentilationHeatTransferWPerK: monthResult.ventilation?.cooling?.ventilationHeatTransferCoefficient?.amount ?? null,
      heatingVentilationHeatFlowW: monthResult.ventilation?.heating?.heatFlow?.amount ?? null,
      coolingVentilationHeatFlowW: monthResult.ventilation?.cooling?.heatFlow?.amount ?? null,
      heatingVentilationKwh: monthResult.ventilation?.heating?.ventilationEnergy?.amount ?? null,
      coolingVentilationKwh: monthResult.ventilation?.cooling?.ventilationEnergy?.amount ?? null,
      qHhtKwh: monthResult.totalHeatingTransfer?.amount ?? heating?.qHht ?? null,
      qChtKwh: cooling?.qCht ?? null,
      internalGainsKwh: monthResult.heatGains?.internalGains ?? null,
      solarGainsKwh: monthResult.heatGains?.solarGains ?? null,
      qHgnKwh: monthResult.heatGains?.qHgn ?? null,
      qCgnKwh: cooling?.qCgn ?? monthResult.heatGains?.qHgn ?? null,
      heatGainsFormulaCode: monthResult.heatGains?.formulaCode ?? heating?.heatGainsFormulaCode ?? cooling?.heatGainsFormulaCode ?? null,
      gammaH: heating?.gammaH ?? null,
      tauH: heating?.tauH ?? null,
      aH: heating?.aH ?? null,
      etaHgn: heating?.etaHgn ?? null,
      qHndBranch: heating?.qHndBranch ?? null,
      heatTransferCoefficientWK: heating?.heatTransferCoefficientWK ?? cooling?.heatTransferCoefficientWK ?? null,
      effectiveInternalHeatCapacityJPerK: heating?.effectiveInternalHeatCapacityJPerK ?? cooling?.effectiveInternalHeatCapacityJPerK ?? null,
      qHndKwh: heating?.qHnd ?? null,
      qHndFormulaCode: heating?.formulaCode ?? null,
      qHndOrigin: heating?.etaHgnOrigin ?? null,
      gammaC: cooling?.gammaC ?? null,
      tauC: cooling?.tauC ?? null,
      aC: cooling?.aC ?? null,
      etaCht: cooling?.etaCht ?? null,
      qCndBranch: cooling?.qCndBranch ?? null,
      qCndKwh: cooling?.qCnd ?? null,
      qCndFormulaCode: cooling?.formulaCode ?? null,
      qCndOrigin: cooling?.etaChtOrigin ?? null
    };
  });
}

function calculationFingerprint(buildingDna, calculation, monthly) {
  const chapter3Annual = calculation.chapter3Result?.annual ?? null;
  return {
    fingerprintId: stableFingerprint({
      buildingDnaSchema: buildingDna.schema,
      building: buildingDna.building,
      ...(buildingDna.technicalSystems ? { technicalSystems: buildingDna.technicalSystems } : {}),
      climateProfile: {
        locationClimate: buildingDna.climate ?? null,
        climateZoneRequirements: buildingDna.climateZoneRequirements ?? null,
        profileId: buildingDna.climateProfile?.profileId ?? null,
        datasetVersion: buildingDna.climateProfile?.datasetVersion ?? null,
        sourceType: buildingDna.climateProfile?.sourceType ?? null,
        datasetStatus: buildingDna.climateProfile?.datasetStatus ?? null,
        verificationStatus: buildingDna.climateProfile?.verificationStatus ?? null
      },
      climateEligibility: buildingDna.climateEligibility ?? null,
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
        envelopeScope: calculation.envelopeTransmissionResult?.scope ?? null,
        ...(calculation.chapter3Result?.calculationScope
          ? { chapter3Scope: calculation.chapter3Result.calculationScope }
          : {})
      },
      outputs: {
        htr: calculation.envelopeTransmissionResult?.result?.amount ?? null,
        annualQHnd: calculation.chapter2Result?.result?.annualQHnd ?? null,
        annualQCnd: calculation.chapter2Result?.result?.annualQCnd ?? null,
        ...(chapter3Annual ? { chapter3Annual } : {})
      }
    }),
    inputs: {
      buildingDnaSchema: buildingDna.schema,
      climateProfileId: buildingDna.climateProfile?.profileId ?? null,
      climateProfileVersion: buildingDna.climateProfile?.datasetVersion ?? null,
      climateDatasetStatus: buildingDna.climateProfile?.datasetStatus ?? null,
      adapterStage: calculation.stage ?? null,
      engineScope: calculation.chapter2Result?.scope ?? null,
      ...(calculation.chapter3Result?.calculationScope
        ? { chapter3Scope: calculation.chapter3Result.calculationScope }
        : {})
    },
    outputs: {
      annualQHnd: calculation.chapter2Result?.result?.annualQHnd ?? null,
      annualQCnd: calculation.chapter2Result?.result?.annualQCnd ?? null,
      htr: calculation.envelopeTransmissionResult?.result?.amount ?? null,
      ...(chapter3Annual ? { chapter3Annual } : {})
    }
  };
}

function formatFormulaNumber(value, digits = 4) {
  const number = Number(value);
  return Number.isFinite(number) ? number.toFixed(digits) : "--";
}

function formatFormulaValue(value, unit, digits = 4) {
  return `${formatFormulaNumber(value, digits)}${unit ? ` ${unit}` : ""}`;
}

function formatFormulaTerm(value, unit, digits = 4) {
  return formatFormulaValue(value, unit, digits);
}

const ROMANIAN_MONTH_LABELS = Object.freeze({
  january: "ianuarie",
  february: "februarie",
  march: "martie",
  april: "aprilie",
  may: "mai",
  june: "iunie",
  july: "iulie",
  august: "august",
  september: "septembrie",
  october: "octombrie",
  november: "noiembrie",
  december: "decembrie"
});

function monthLabel(month) {
  return ROMANIAN_MONTH_LABELS[month] ?? month ?? "--";
}

function isFiniteAmount(value) {
  return value !== null && value !== undefined && value !== "" && Number.isFinite(Number(value));
}

function formatNotebookNumber(value, digits = 4) {
  const number = Number(value);
  return Number.isFinite(number) ? number.toFixed(digits).replace(".", ",") : "--";
}

function formatNotebookValue(value, unit, digits = 4) {
  return `${formatNotebookNumber(value, digits)}${unit && unit !== "-" ? ` ${unit}` : ""}`;
}

function notebookName(value) {
  return String(value ?? "")
    .replace(/exterior/gi, "ext")
    .replace(/Masonry exterior wall with EPS insulation/gi, "perete exterior")
    .replace(/Timber roof with mineral wool insulation/gi, "acoperis")
    .replace(/Concrete ground floor with EPS insulation/gi, "planseu pe sol")
    .replace(/Wood and earth-fill ceiling with mineral wool/gi, "planseu spre pod")
    .replace(/PVC double-glazed window/gi, "fereastra")
    .replace(/Insulated exterior door/gi, "usa")
    .replace(/brick masonry/gi, "caramida")
    .replace(/EPS insulation/gi, "EPS")
    .replace(/timber board/gi, "lemn")
    .replace(/mineral wool/gi, "vata minerala")
    .replace(/reinforced concrete/gi, "beton armat")
    .replace(/earth fill/gi, "umplutura pamant")
    .replace(/[^A-Za-z0-9_\u0100-\u024F]+/g, "_")
    .replace(/^_+|_+$/g, "")
    .toLowerCase();
}

function absoluteValue(value) {
  const number = Number(value);
  return number < 0 ? -number : number;
}

function readableNormativeReference(reference) {
  if (!reference) return null;
  if (reference.includes("2_7")) return "MC001-2022, relatia 2.7";
  if (reference.includes("2_6")) return "MC001-2022, relatia 2.6";
  if (reference.includes("2_15")) return "MC001-2022, relatia 2.15";
  if (reference.includes("2_18")) return "MC001-2022, relatia 2.18 / Figura 2.18";
  if (reference.includes("2_19") || reference.includes("FIGURE_2_19")) return "MC001-2022, Figura 2.19";
  if (reference.startsWith("MC001")) return "MC001-2022, Capitolul 2";
  return reference;
}

function formulaTrace({
  formulaId,
  formulaName,
  resultSymbol,
  resultValue,
  resultUnit,
  origin,
  section = "caiet_calcul",
  inputVariables = [],
  sourceReference,
  symbolicFormula,
  substitutedFormula,
  resultLine,
  notebookLines = [],
  localVariables = [],
  numericVerification = null,
  dependencies = []
}) {
  return {
    traceNodeId: `${formulaId ?? formulaName}.${resultSymbol}`.replace(/\s+/g, "_"),
    formulaId,
    formulaName,
    resultSymbol,
    resultValue,
    resultUnit,
    origin,
    section,
    inputVariables,
    sourceReference,
    normativeReference: readableNormativeReference(formulaId ?? sourceReference),
    symbolicFormula,
    substitutedFormula,
    resultLine: resultLine ?? `${resultSymbol} = ${formatFormulaValue(resultValue, resultUnit)}`,
    notebookLines,
    localVariables,
    numericVerification,
    dependencies
  };
}

function formulaViews(assemblies, envelope, monthly, calculation) {
  const envelopeFormulaReferences = calculation.envelopeTransmissionResult?.formulaReferences ?? [];
  const htrFormulaReference = envelopeFormulaReferences.find(reference => reference.includes("2_15")) ??
    envelopeFormulaReferences[0] ??
    null;
  const materialFormulaViews = assemblies.flatMap(assembly => assembly.layers
    .filter(layer => isFiniteAmount(layer.lambdaNormatWmK) && isFiniteAmount(layer.correctionCoefficientA))
    .map(layer => formulaTrace({
      formulaId: layer.lambdaFormulaCode ?? "MC001_LAYER_DESIGN_LAMBDA_FROM_REFERENCE_AND_CORRECTION",
      formulaName: `Conductivitate de calcul - ${assembly.displayName} / ${layer.materialName}`,
      resultSymbol: `lambda_${layer.layerId}`,
      resultValue: layer.lambdaWmK,
      resultUnit: "W/(m*K)",
      origin: layer.lambdaOrigin,
      section: "materiale",
      inputVariables: [
        { symbol: "lambda_ref", value: layer.lambdaNormatWmK, unit: "W/(m*K)", meaning: "conductivitate de referinta" },
        { symbol: "a", value: layer.correctionCoefficientA, unit: "-", meaning: "coeficient de corectie" }
      ],
      sourceReference: layer.lambdaFormulaCode,
      symbolicFormula: "lambda_design = lambda_ref * a",
      substitutedFormula: `lambda_design = ${formatFormulaTerm(layer.lambdaNormatWmK, "W/(m*K)")} * ${formatFormulaNumber(layer.correctionCoefficientA)}`,
      resultLine: `lambda_design = ${formatFormulaValue(layer.lambdaWmK, "W/(m*K)")}`,
      dependencies: [
        `${assembly.assemblyId}.${layer.layerId}.lambda_ref`,
        `${assembly.assemblyId}.${layer.layerId}.correction`
      ]
    })));

  const assemblyFormulaViews = assemblies.flatMap((assembly) => {
    if ((assembly.layers ?? []).length === 0 && assembly.formulaCode === "EXPLICIT_ASSEMBLY_U_VALUE") {
      return [formulaTrace({
        formulaId: assembly.formulaCode,
        formulaName: `Coeficient U - ${assembly.displayName}`,
        resultSymbol: "U",
        resultValue: assembly.uValue,
        resultUnit: assembly.uValueUnit,
        origin: assembly.uValueOrigin,
        section: "coeficienti_u",
        inputVariables: [],
        sourceReference: assembly.sourceReference,
        symbolicFormula: "U = valoare introdusa explicit",
        substitutedFormula: `U = ${formatFormulaValue(assembly.uValue, assembly.uValueUnit)} -- valoare introdusa explicit`,
        resultLine: `U = ${formatFormulaValue(assembly.uValue, assembly.uValueUnit)}`,
        notebookLines: [
          { text: explicitLine(`U_${notebookName(assembly.role ?? assembly.displayName)}`, assembly.uValue, "W/(m²K)") }
        ],
        dependencies: []
      })];
    }
    const layerTraces = assembly.layers.map(layer => formulaTrace({
      formulaId: layer.resistanceFormulaCode,
      formulaName: `Rezistenta strat - ${assembly.displayName} / ${layer.materialName}`,
      resultSymbol: "R_layer",
      resultValue: layer.resistanceM2KPerW,
      resultUnit: "m2*K/W",
      origin: layer.lambdaOrigin,
      section: "straturi_si_rezistente",
      inputVariables: [
        { symbol: "d", value: layer.thicknessM, unit: "m", meaning: "grosime strat" },
        { symbol: "lambda_design", value: layer.lambdaWmK, unit: "W/(m*K)", meaning: "conductivitate de calcul" }
      ],
      sourceReference: layer.resistanceFormulaCode,
      symbolicFormula: "R_layer = d / lambda_design",
      substitutedFormula: `R_layer = ${formatFormulaValue(layer.thicknessM, "m")} / ${formatFormulaValue(layer.lambdaWmK, "W/(m*K)")}`,
      resultLine: `R_layer = ${formatFormulaValue(layer.resistanceM2KPerW, "m2*K/W")}`,
      dependencies: [
        `${assembly.assemblyId}.${layer.layerId}.thickness`,
        `${assembly.assemblyId}.${layer.layerId}.lambda_design`
      ]
    }));
    const layerTerms = assembly.layers
      .map(layer => formatFormulaNumber(layer.resistanceM2KPerW))
      .join(" + ");
    const totalResistanceTrace = formulaTrace({
      formulaId: "MC001_2_6_TOTAL_THERMAL_RESISTANCE",
      formulaName: `Rezistenta termica totala - ${assembly.displayName}`,
      resultSymbol: "R_total",
      resultValue: assembly.totalResistance,
      resultUnit: assembly.totalResistanceUnit,
      origin: assembly.uValueOrigin,
      section: "straturi_si_rezistente",
      inputVariables: [
        { symbol: "Rsi", value: assembly.rsi, unit: assembly.totalResistanceUnit, meaning: "rezistenta superficiala interioara" },
        ...assembly.layers.map(layer => ({
          symbol: `R_${layer.layerId}`,
          value: layer.resistanceM2KPerW,
          unit: "m2*K/W",
          meaning: `rezistenta strat ${layer.materialName}`
        })),
        { symbol: "Rse", value: assembly.rse, unit: assembly.totalResistanceUnit, meaning: "rezistenta superficiala exterioara" }
      ],
      sourceReference: assembly.sourceReference,
      symbolicFormula: "R_total = R_si + sum(R_layer) + R_se",
      substitutedFormula: `R_total = ${formatFormulaNumber(assembly.rsi)} + ${layerTerms} + ${formatFormulaNumber(assembly.rse)}`,
      resultLine: `R_total = ${formatFormulaValue(assembly.totalResistance, assembly.totalResistanceUnit)}`,
      dependencies: layerTraces.map(trace => trace.traceNodeId)
    });
    const uTrace = formulaTrace({
      formulaId: assembly.formulaCode,
      formulaName: `Coeficient U - ${assembly.displayName}`,
      resultSymbol: "U",
      resultValue: assembly.uValue,
      resultUnit: assembly.uValueUnit,
      origin: assembly.uValueOrigin,
      section: "coeficienti_u",
      inputVariables: [
        { symbol: "R_total", value: assembly.totalResistance, unit: assembly.totalResistanceUnit, meaning: "rezistenta termica totala" }
      ],
      sourceReference: assembly.sourceReference,
      symbolicFormula: "U = 1 / R_total",
      substitutedFormula: `U = 1 / ${formatFormulaNumber(assembly.totalResistance)}`,
      resultLine: `U = ${formatFormulaValue(assembly.uValue, assembly.uValueUnit)}`,
      dependencies: [totalResistanceTrace.traceNodeId]
    });
    return [
      ...layerTraces,
      totalResistanceTrace,
      uTrace
    ];
  });

  const envelopeElementViews = (envelope.elementRows ?? []).map(element => formulaTrace({
    formulaId: element.contributionFormulaCode,
    formulaName: `Transfer element anvelopa - ${element.elementId}`,
    resultSymbol: `H_${element.elementId}`,
    resultValue: element.contributionWK,
    resultUnit: "W/K",
    origin: element.uValueOrigin,
    section: "transfer_anvelopa",
    inputVariables: [
      { symbol: "U", value: element.uValue, unit: "W/(m2*K)", meaning: "coeficient U element" },
      { symbol: "A", value: element.area, unit: "m2", meaning: "arie element" },
      { symbol: "b", value: element.boundaryCorrectionFactor, unit: "-", meaning: "factor corectie limita" }
    ],
    sourceReference: element.contributionFormulaCode,
    symbolicFormula: "H_el = U * A * b",
    substitutedFormula: `H_el = ${formatFormulaTerm(element.uValue, "W/(m2*K)")} * ${formatFormulaTerm(element.area, "m2")} * ${formatFormulaNumber(element.boundaryCorrectionFactor)}`,
    resultLine: `H_el = ${formatFormulaValue(element.contributionWK, "W/K")}`,
    dependencies: [
      `${element.assemblyId}.U`,
      `${element.elementId}.area`,
      `${element.elementId}.boundary_factor`
    ]
  }));

  const thermalBridgeViews = (envelope.thermalBridgeRows ?? []).map(bridge => formulaTrace({
    formulaId: bridge.contributionFormulaCode,
    formulaName: `Punte termica - ${bridge.bridgeId}`,
    resultSymbol: `H_tb_${bridge.bridgeId}`,
    resultValue: bridge.contributionWK,
    resultUnit: "W/K",
    origin: "explicit_thermal_bridge_input",
    section: "transfer_anvelopa",
    inputVariables: [
      { symbol: "psi", value: bridge.psiWmK, unit: "W/(m*K)", meaning: "coeficient liniar punte" },
      { symbol: "l", value: bridge.lengthM, unit: "m", meaning: "lungime punte" }
    ],
    sourceReference: bridge.contributionFormulaCode,
    symbolicFormula: "H_tb = psi * l",
    substitutedFormula: `H_tb = ${formatFormulaTerm(bridge.psiWmK, "W/(m*K)")} * ${formatFormulaTerm(bridge.lengthM, "m")}`,
    resultLine: `H_tb = ${formatFormulaValue(bridge.contributionWK, "W/K")}`,
    dependencies: [`${bridge.bridgeId}.psi`, `${bridge.bridgeId}.length`]
  }));

  const componentFormulaViews = envelope.components.map(component => {
    const elementTerms = (envelope.elementRows ?? [])
      .filter(element => element.component === component.componentId)
      .map(element => formatFormulaNumber(element.contributionWK));
    const bridgeTerms = (envelope.thermalBridgeRows ?? [])
      .filter(bridge => bridge.component === component.componentId)
      .map(bridge => formatFormulaNumber(bridge.contributionWK));
    const terms = [...elementTerms, ...bridgeTerms];
    return formulaTrace({
      formulaId: `${component.componentId}_TRANSMISSION_COMPONENT_SUM`,
      formulaName: `Coeficient transmisie ${component.componentId}`,
      resultSymbol: component.componentId,
      resultValue: component.amount,
      resultUnit: component.unit,
      origin: "calculated_from_engine_component_breakdown",
      section: "transfer_anvelopa",
      inputVariables: [
        { symbol: "H_elements", value: component.elementAmount, unit: component.unit, meaning: "suma elemente" },
        { symbol: "H_tb", value: component.thermalBridgeAmount, unit: component.unit, meaning: "suma punti termice" }
      ],
      sourceReference: component.componentId,
      symbolicFormula: `${component.componentId} = sum(H_el) + sum(H_tb)`,
      substitutedFormula: `${component.componentId} = ${terms.length > 0 ? terms.join(" + ") : "0"}`,
      resultLine: `${component.componentId} = ${formatFormulaValue(component.amount, component.unit)}`,
      dependencies: [
        ...(envelope.elementRows ?? []).filter(element => element.component === component.componentId).map(element => `H_${element.elementId}`),
        ...(envelope.thermalBridgeRows ?? []).filter(bridge => bridge.component === component.componentId).map(bridge => `H_tb_${bridge.bridgeId}`)
      ]
    });
  });

  const htrFormulaViews = [
    formulaTrace({
      formulaId: htrFormulaReference,
      formulaName: "Coeficient total de transfer termic prin transmisie",
      resultSymbol: envelope.htr?.symbol ?? "H_tr",
      resultValue: envelope.htr?.amount ?? null,
      resultUnit: envelope.htr?.unit ?? "W/K",
      origin: envelope.htr?.origin ?? null,
      section: "transfer_anvelopa",
      inputVariables: envelope.components.map(component => ({
        symbol: component.componentId,
        value: component.amount,
        unit: component.unit,
        meaning: `componenta ${component.componentId}`
      })),
      sourceReference: htrFormulaReference,
      symbolicFormula: "H_tr = H_d + H_g + H_u + H_a",
      substitutedFormula: `H_tr = ${envelope.components.map(component => `${component.componentId} ${formatFormulaNumber(component.amount)}`).join(" + ")}`,
      resultLine: `H_tr = ${formatFormulaValue(envelope.htr?.amount, envelope.htr?.unit ?? "W/K")}`,
      dependencies: envelope.components.map(component => `envelope.${component.componentId}`)
    })
  ];

  const monthFormulaViews = [];
  for (const row of monthly.slice(0, 12)) {
    monthFormulaViews.push(formulaTrace({
      formulaId: "MC001_MONTHLY_TRANSMISSION_ENERGY_FROM_ENGINE_OUTPUT",
      formulaName: `Transfer prin transmisie pentru incalzire - ${row.month}`,
      resultSymbol: "Qtr,H",
      resultValue: row.heatingTransmissionKwh,
      resultUnit: "kWh",
      origin: "chapter_2_monthly_transmission_output",
      section: "calcul_lunar_transmisie_ventilare",
      inputVariables: [
        { symbol: "Phi_tr,H", value: row.heatingTransmissionHeatFlowW, unit: "W", meaning: "flux termic transmisie incalzire" },
        { symbol: "t", value: row.durationHours, unit: "h", meaning: "durata luna" }
      ],
      sourceReference: "MC001_MONTHLY_TRANSMISSION_ENERGY_FROM_ENGINE_OUTPUT",
      symbolicFormula: "Qtr,H = Phi_tr,H * t / 1000",
      substitutedFormula: `Qtr,H = ${formatFormulaTerm(row.heatingTransmissionHeatFlowW, "W")} * ${formatFormulaTerm(row.durationHours, "h", 0)} / 1000`,
      resultLine: `Qtr,H = ${formatFormulaValue(row.heatingTransmissionKwh, "kWh")}`,
      dependencies: [`${row.month}.Phi_tr,H`, `${row.month}.duration`]
    }));
    monthFormulaViews.push(formulaTrace({
      formulaId: "MC001_MONTHLY_VENTILATION_ENERGY_FROM_ENGINE_OUTPUT",
      formulaName: `Transfer prin ventilare pentru incalzire - ${row.month}`,
      resultSymbol: "Qve,H",
      resultValue: row.heatingVentilationKwh,
      resultUnit: "kWh",
      origin: "chapter_2_monthly_ventilation_output",
      section: "calcul_lunar_transmisie_ventilare",
      inputVariables: [
        { symbol: "Phi_ve,H", value: row.heatingVentilationHeatFlowW, unit: "W", meaning: "flux termic ventilare incalzire" },
        { symbol: "t", value: row.durationHours, unit: "h", meaning: "durata luna" }
      ],
      sourceReference: "MC001_MONTHLY_VENTILATION_ENERGY_FROM_ENGINE_OUTPUT",
      symbolicFormula: "Qve,H = Phi_ve,H * t / 1000",
      substitutedFormula: `Qve,H = ${formatFormulaTerm(row.heatingVentilationHeatFlowW, "W")} * ${formatFormulaTerm(row.durationHours, "h", 0)} / 1000`,
      resultLine: `Qve,H = ${formatFormulaValue(row.heatingVentilationKwh, "kWh")}`,
      dependencies: [`${row.month}.Phi_ve,H`, `${row.month}.duration`]
    }));
    monthFormulaViews.push(formulaTrace({
      formulaId: "MC001_MONTHLY_HEAT_GAINS_SUM_FROM_ENGINE_OUTPUT",
      formulaName: `Aporturi totale pentru incalzire - ${row.month}`,
      resultSymbol: "QHgn",
      resultValue: row.qHgnKwh,
      resultUnit: "kWh",
      origin: "chapter_2_monthly_heat_gains_output",
      section: "calcul_lunar_aporturi",
      inputVariables: [
        { symbol: "Qint", value: row.internalGainsKwh, unit: "kWh", meaning: "aporturi interne" },
        { symbol: "Qsol", value: row.solarGainsKwh, unit: "kWh", meaning: "aporturi solare" }
      ],
      sourceReference: row.heatGainsFormulaCode,
      symbolicFormula: "QHgn = Qint + Qsol",
      substitutedFormula: `QHgn = ${formatFormulaTerm(row.internalGainsKwh, "kWh")} + ${formatFormulaTerm(row.solarGainsKwh, "kWh")}`,
      resultLine: `QHgn = ${formatFormulaValue(row.qHgnKwh, "kWh")}`,
      dependencies: [`${row.month}.Qint`, `${row.month}.Qsol`]
    }));
    monthFormulaViews.push(formulaTrace({
      formulaId: "MC001_MONTHLY_TOTAL_HEATING_TRANSFER_FROM_ENGINE_OUTPUT",
      formulaName: `Transfer total pentru incalzire - ${row.month}`,
      resultSymbol: "QHht",
      resultValue: row.qHhtKwh,
      resultUnit: "kWh",
      origin: "chapter_2_monthly_total_transfer_output",
      section: "calcul_lunar_transmisie_ventilare",
      inputVariables: [
        { symbol: "Qtr,H", value: row.heatingTransmissionKwh, unit: "kWh", meaning: "transfer transmisie" },
        { symbol: "Qve,H", value: row.heatingVentilationKwh, unit: "kWh", meaning: "transfer ventilare" }
      ],
      sourceReference: "MC001_C5_DERIVED_TOTAL_HEATING_TRANSFER",
      symbolicFormula: "QHht = Qtr,H + Qve,H",
      substitutedFormula: `QHht = ${formatFormulaTerm(row.heatingTransmissionKwh, "kWh")} + ${formatFormulaTerm(row.heatingVentilationKwh, "kWh")}`,
      resultLine: `QHht = ${formatFormulaValue(row.qHhtKwh, "kWh")}`,
      dependencies: [`${row.month}.QtrH`, `${row.month}.QveH`]
    }));
    monthFormulaViews.push(formulaTrace({
      formulaId: "MC001_HEATING_GAIN_RATIO_FROM_ENGINE_OUTPUT",
      formulaName: `Raport castiguri / pierderi pentru incalzire - ${row.month}`,
      resultSymbol: "gamma_H",
      resultValue: row.gammaH,
      resultUnit: "-",
      origin: "chapter_2_heating_branch_output",
      section: "calcul_lunar_incalzire",
      inputVariables: [
        { symbol: "QHgn", value: row.qHgnKwh, unit: "kWh", meaning: "aporturi totale" },
        { symbol: "QHht", value: row.qHhtKwh, unit: "kWh", meaning: "transfer total" }
      ],
      sourceReference: row.qHndFormulaCode,
      symbolicFormula: "gamma_H = QHgn / QHht",
      substitutedFormula: `gamma_H = ${formatFormulaTerm(row.qHgnKwh, "kWh")} / ${formatFormulaTerm(row.qHhtKwh, "kWh")}`,
      resultLine: `gamma_H = ${formatFormulaValue(row.gammaH, "-")}`,
      dependencies: [`${row.month}.QHgn`, `${row.month}.QHht`]
    }));
    monthFormulaViews.push(formulaTrace({
      formulaId: "MC001_HEATING_UTILIZATION_FACTOR_FROM_ENGINE_OUTPUT",
      formulaName: `Factor de utilizare aporturi incalzire - ${row.month}`,
      resultSymbol: "eta_Hgn",
      resultValue: row.etaHgn,
      resultUnit: "-",
      origin: row.qHndOrigin,
      section: "calcul_lunar_incalzire",
      inputVariables: [
        { symbol: "gamma_H", value: row.gammaH, unit: "-", meaning: "raport aporturi/transfer" },
        { symbol: "a_H", value: row.aH, unit: "-", meaning: "parametru inertie" },
        { symbol: "tau_H", value: row.tauH, unit: "h", meaning: "constanta timp" }
      ],
      sourceReference: "MC001_FIGURE_2_14_HEATING_GAIN_UTILIZATION_FACTOR",
      symbolicFormula: "eta_Hgn = f(gamma_H, a_H, tau_H)",
      substitutedFormula: `eta_Hgn = f(${formatFormulaNumber(row.gammaH)}, ${formatFormulaNumber(row.aH)}, ${formatFormulaTerm(row.tauH, "h")})`,
      resultLine: `eta_Hgn = ${formatFormulaValue(row.etaHgn, "-")}`,
      dependencies: [`${row.month}.gammaH`, `${row.month}.aH`, `${row.month}.tauH`]
    }));
    monthFormulaViews.push(formulaTrace({
      formulaId: row.qHndFormulaCode,
      formulaName: `Necesar util lunar de incalzire - ${row.month}`,
      resultSymbol: "QHnd",
      resultValue: row.qHndKwh,
      resultUnit: "kWh",
      origin: row.qHndOrigin,
      section: "calcul_lunar_incalzire",
      inputVariables: [
        { symbol: "QHht", value: row.qHhtKwh, unit: "kWh" },
        { symbol: "Qtr,H", value: row.heatingTransmissionKwh, unit: "kWh" },
        { symbol: "Qve,H", value: row.heatingVentilationKwh, unit: "kWh" },
        { symbol: "QHgn", value: row.qHgnKwh, unit: "kWh" },
        { symbol: "eta_Hgn", value: row.etaHgn, unit: "-" }
      ],
      sourceReference: row.qHndFormulaCode,
      symbolicFormula: row.qHndBranch === "gammaH_greater_than_two_zero_demand"
        ? "QHnd = 0, pentru ramura gamma_H > 2"
        : "QHnd = QHht - eta_Hgn * QHgn",
      substitutedFormula: row.qHndBranch === "gammaH_greater_than_two_zero_demand"
        ? `QHnd = 0, gamma_H = ${formatFormulaNumber(row.gammaH)}`
        : `QHnd = ${formatFormulaTerm(row.qHhtKwh, "kWh")} - ${formatFormulaNumber(row.etaHgn)} * ${formatFormulaTerm(row.qHgnKwh, "kWh")}`,
      resultLine: `QHnd = ${formatFormulaValue(row.qHndKwh, "kWh")}`,
      dependencies: [`${row.month}.QHht`, `${row.month}.QHgn`, `${row.month}.etaHgn`]
    }));
    monthFormulaViews.push(formulaTrace({
      formulaId: "MC001_MONTHLY_COOLING_TRANSFER_FROM_ENGINE_OUTPUT",
      formulaName: `Transfer disponibil pentru racire - ${row.month}`,
      resultSymbol: "QCht",
      resultValue: row.qChtKwh,
      resultUnit: "kWh",
      origin: "chapter_2_cooling_transfer_output",
      section: "calcul_lunar_racire",
      inputVariables: [
        { symbol: "Qtr,C", value: row.coolingTransmissionKwh, unit: "kWh", meaning: "transfer transmisie racire" },
        { symbol: "Qve,C", value: row.coolingVentilationKwh, unit: "kWh", meaning: "transfer ventilare racire" }
      ],
      sourceReference: "MC001_COOLING_TRANSFER_FROM_ENGINE_OUTPUT",
      symbolicFormula: "QCht = abs(Qtr,C + Qve,C)",
      substitutedFormula: `QCht = valoare motor(${formatFormulaTerm(row.coolingTransmissionKwh, "kWh")}, ${formatFormulaTerm(row.coolingVentilationKwh, "kWh")})`,
      resultLine: `QCht = ${formatFormulaValue(row.qChtKwh, "kWh")}`,
      dependencies: [`${row.month}.QtrC`, `${row.month}.QveC`]
    }));
    monthFormulaViews.push(formulaTrace({
      formulaId: "MC001_COOLING_GAIN_RATIO_FROM_ENGINE_OUTPUT",
      formulaName: `Raport castiguri / transfer pentru racire - ${row.month}`,
      resultSymbol: "gamma_C",
      resultValue: row.gammaC,
      resultUnit: "-",
      origin: "chapter_2_cooling_branch_output",
      section: "calcul_lunar_racire",
      inputVariables: [
        { symbol: "QCgn", value: row.qCgnKwh, unit: "kWh", meaning: "aporturi racire" },
        { symbol: "QCht", value: row.qChtKwh, unit: "kWh", meaning: "transfer racire" }
      ],
      sourceReference: row.qCndFormulaCode,
      symbolicFormula: "gamma_C = QCgn / QCht",
      substitutedFormula: `gamma_C = ${formatFormulaTerm(row.qCgnKwh, "kWh")} / ${formatFormulaTerm(row.qChtKwh, "kWh")}`,
      resultLine: `gamma_C = ${formatFormulaValue(row.gammaC, "-")}`,
      dependencies: [`${row.month}.QCgn`, `${row.month}.QCht`]
    }));
    monthFormulaViews.push(formulaTrace({
      formulaId: "MC001_COOLING_UTILIZATION_FACTOR_FROM_ENGINE_OUTPUT",
      formulaName: `Factor de utilizare transfer racire - ${row.month}`,
      resultSymbol: "eta_Cht",
      resultValue: row.etaCht,
      resultUnit: "-",
      origin: row.qCndOrigin,
      section: "calcul_lunar_racire",
      inputVariables: [
        { symbol: "gamma_C", value: row.gammaC, unit: "-", meaning: "raport castiguri/transfer" },
        { symbol: "a_C", value: row.aC, unit: "-", meaning: "parametru inertie" },
        { symbol: "tau_C", value: row.tauC, unit: "h", meaning: "constanta timp" }
      ],
      sourceReference: "MC001_FIGURE_2_15_COOLING_HEAT_TRANSFER_UTILIZATION_FACTOR",
      symbolicFormula: "eta_Cht = f(gamma_C, a_C, tau_C)",
      substitutedFormula: `eta_Cht = f(${formatFormulaNumber(row.gammaC)}, ${formatFormulaNumber(row.aC)}, ${formatFormulaTerm(row.tauC, "h")})`,
      resultLine: `eta_Cht = ${formatFormulaValue(row.etaCht, "-")}`,
      dependencies: [`${row.month}.gammaC`, `${row.month}.aC`, `${row.month}.tauC`]
    }));
    monthFormulaViews.push(formulaTrace({
      formulaId: row.qCndFormulaCode,
      formulaName: `Necesar util lunar de racire - ${row.month}`,
      resultSymbol: "QCnd",
      resultValue: row.qCndKwh,
      resultUnit: "kWh",
      origin: row.qCndOrigin,
      section: "calcul_lunar_racire",
      inputVariables: [
        { symbol: "Qtr,C", value: row.coolingTransmissionKwh, unit: "kWh" },
        { symbol: "Qve,C", value: row.coolingVentilationKwh, unit: "kWh" },
        { symbol: "QCht", value: row.qChtKwh, unit: "kWh" },
        { symbol: "QCgn", value: row.qCgnKwh, unit: "kWh" },
        { symbol: "eta_Cht", value: row.etaCht, unit: "-" }
      ],
      sourceReference: row.qCndFormulaCode,
      symbolicFormula: "QCnd = QCgn - eta_Cht * QCht",
      substitutedFormula: `QCnd = ${formatFormulaTerm(row.qCgnKwh, "kWh")} - ${formatFormulaNumber(row.etaCht)} * ${formatFormulaTerm(row.qChtKwh, "kWh")}`,
      resultLine: `QCnd = ${formatFormulaValue(row.qCndKwh, "kWh")}`,
      dependencies: [`${row.month}.QCgn`, `${row.month}.etaCht`, `${row.month}.QCht`]
    }));
  }

  const annualFormulaViews = [
    formulaTrace({
      formulaId: "MC001_2_84_ANNUAL_HEATING_USEFUL_DEMAND",
      formulaName: "Necesar util anual de incalzire",
      resultSymbol: "QHnd_an",
      resultValue: calculation.chapter2Result?.result?.annualQHnd ?? null,
      resultUnit: "kWh",
      origin: "chapter_2_annual_output",
      section: "totaluri_anuale",
      inputVariables: monthly.map(row => ({
        symbol: `QHnd_${row.month}`,
        value: row.qHndKwh,
        unit: "kWh",
        meaning: `necesar incalzire ${row.month}`
      })),
      sourceReference: "MC001_2_84_ANNUAL_HEATING_USEFUL_DEMAND",
      symbolicFormula: "QHnd_an = sum(QHnd_m)",
      substitutedFormula: `QHnd_an = ${monthly.map(row => formatFormulaNumber(row.qHndKwh)).join(" + ")}`,
      resultLine: `QHnd_an = ${formatFormulaValue(calculation.chapter2Result?.result?.annualQHnd, "kWh")}`,
      dependencies: monthly.map(row => `${row.month}.QHnd`)
    }),
    formulaTrace({
      formulaId: "MC001_2_85_ANNUAL_COOLING_USEFUL_DEMAND",
      formulaName: "Necesar util anual de racire",
      resultSymbol: "QCnd_an",
      resultValue: calculation.chapter2Result?.result?.annualQCnd ?? null,
      resultUnit: "kWh",
      origin: "chapter_2_annual_output",
      section: "totaluri_anuale",
      inputVariables: monthly.map(row => ({
        symbol: `QCnd_${row.month}`,
        value: row.qCndKwh,
        unit: "kWh",
        meaning: `necesar racire ${row.month}`
      })),
      sourceReference: "MC001_2_85_ANNUAL_COOLING_USEFUL_DEMAND",
      symbolicFormula: "QCnd_an = sum(QCnd_m)",
      substitutedFormula: `QCnd_an = ${monthly.map(row => formatFormulaNumber(row.qCndKwh)).join(" + ")}`,
      resultLine: `QCnd_an = ${formatFormulaValue(calculation.chapter2Result?.result?.annualQCnd, "kWh")}`,
      dependencies: monthly.map(row => `${row.month}.QCnd`)
    })
  ];

  return [
    ...materialFormulaViews,
    ...assemblyFormulaViews,
    ...envelopeElementViews,
    ...thermalBridgeViews,
    ...componentFormulaViews,
    ...htrFormulaViews,
    ...monthFormulaViews,
    ...annualFormulaViews
  ];
}

function compactLine({
  lineId,
  text,
  resultValue = null,
  resultUnit = null,
  computedValue = undefined,
  variables = [],
  reference = null,
  kind = "calculation"
}) {
  return {
    lineId,
    text,
    resultValue,
    resultUnit,
    computedValue,
    variables,
    reference: readableNormativeReference(reference) ?? reference,
    kind
  };
}

function localVariables(lines) {
  const bySymbol = new Map();
  for (const line of lines) {
    for (const variable of line.variables ?? []) {
      if (!variable?.symbol || bySymbol.has(variable.symbol)) continue;
      bySymbol.set(variable.symbol, variable);
    }
  }
  return [...bySymbol.values()];
}

function section(sectionId, title, lines) {
  const visibleLines = lines.filter(Boolean);
  return {
    sectionId,
    title,
    localVariables: localVariables(visibleLines),
    lines: visibleLines
  };
}

function expressionLine(left, expression, value, unit, digits = 4) {
  return `${left} := ${expression} = ${formatNotebookValue(value, unit, digits)}`;
}

function explicitLine(left, value, unit, digits = 4) {
  return `${left} := ${formatNotebookValue(value, unit, digits)} -- valoare introdusa explicit`;
}

function sumExpression(values, unit, digits = 4) {
  const terms = values
    .filter(value => isFiniteAmount(value))
    .map(value => formatNotebookNumber(value, digits));
  return terms.length > 0 ? terms.join(" + ") : `0${unit ? ` ${unit}` : ""}`;
}

function compactAssemblySections(assemblies, envelope) {
  const elementsByAssembly = new Map();
  for (const element of envelope.elementRows ?? []) {
    if (!element.assemblyId) continue;
    const rows = elementsByAssembly.get(element.assemblyId) ?? [];
    rows.push(element);
    elementsByAssembly.set(element.assemblyId, rows);
  }

  const sections = assemblies.map((assembly) => {
    const name = notebookName(assembly.role ?? assembly.displayName ?? assembly.assemblyId);
    const lines = [];
    for (const layer of assembly.layers ?? []) {
      const layerName = notebookName(layer.materialName ?? layer.layerId);
      const lambdaSymbol = `λ_${layerName}`;
      if (isFiniteAmount(layer.lambdaNormatWmK) && isFiniteAmount(layer.correctionCoefficientA)) {
        lines.push(compactLine({
          lineId: `${assembly.assemblyId}.${layer.layerId}.lambda`,
          text: expressionLine(
            lambdaSymbol,
            `${formatNotebookNumber(layer.lambdaNormatWmK, 3)} × ${formatNotebookNumber(layer.correctionCoefficientA, 3)}`,
            layer.lambdaWmK,
            "W/(m·K)",
            3
          ),
          resultValue: layer.lambdaWmK,
          resultUnit: "W/(m·K)",
          computedValue: Number(layer.lambdaNormatWmK) * Number(layer.correctionCoefficientA),
          variables: [
            { symbol: lambdaSymbol, meaning: `conductivitate de calcul ${layer.materialName}` }
          ],
          reference: layer.lambdaFormulaCode
        }));
      } else {
        lines.push(compactLine({
          lineId: `${assembly.assemblyId}.${layer.layerId}.lambda.explicit`,
          text: explicitLine(lambdaSymbol, layer.lambdaWmK, "W/(m·K)", 3),
          resultValue: layer.lambdaWmK,
          resultUnit: "W/(m·K)",
          variables: [
            { symbol: lambdaSymbol, meaning: `conductivitate ${layer.materialName}` }
          ],
          kind: "explicit_value"
        }));
      }

      if (isFiniteAmount(layer.thicknessM) && isFiniteAmount(layer.lambdaWmK)) {
        lines.push(compactLine({
          lineId: `${assembly.assemblyId}.${layer.layerId}.r`,
          text: expressionLine(
            `R_${layerName}`,
            `${formatNotebookNumber(layer.thicknessM, 3)} / ${formatNotebookNumber(layer.lambdaWmK, 3)}`,
            layer.resistanceM2KPerW,
            "m²K/W"
          ),
          resultValue: layer.resistanceM2KPerW,
          resultUnit: "m²K/W",
          computedValue: Number(layer.thicknessM) / Number(layer.lambdaWmK),
          variables: [
            { symbol: `R_${layerName}`, meaning: `rezistenta strat ${layer.materialName}` },
            { symbol: lambdaSymbol, meaning: `conductivitate ${layer.materialName}` }
          ],
          reference: layer.resistanceFormulaCode
        }));
      }
    }

    if ((assembly.layers ?? []).length > 0) {
      const resistanceTerms = [
        assembly.rsi,
        ...assembly.layers.map(layer => layer.resistanceM2KPerW),
        assembly.rse
      ];
      lines.push(compactLine({
        lineId: `${assembly.assemblyId}.r_total`,
        text: `${`R_${name}`} := ${sumExpression(resistanceTerms, "m²K/W")}\n           = ${formatNotebookValue(assembly.totalResistance, "m²K/W")}`,
        resultValue: assembly.totalResistance,
        resultUnit: "m²K/W",
        computedValue: resistanceTerms.reduce((sum, value) => sum + Number(value), 0),
        variables: [
          { symbol: `R_${name}`, meaning: `rezistenta totala ${assembly.displayName}` }
        ],
        reference: "MC001_2_6_TOTAL_THERMAL_RESISTANCE"
      }));
      lines.push(compactLine({
        lineId: `${assembly.assemblyId}.u`,
        text: `${`U_${name}`} := 1 / ${formatNotebookNumber(assembly.totalResistance)}\n          = ${formatNotebookValue(assembly.uValue, "W/(m²K)")}`,
        resultValue: assembly.uValue,
        resultUnit: "W/(m²K)",
        computedValue: 1 / Number(assembly.totalResistance),
        variables: [
          { symbol: `U_${name}`, meaning: `coeficient U ${assembly.displayName}` },
          { symbol: `R_${name}`, meaning: `rezistenta totala ${assembly.displayName}` }
        ],
        reference: assembly.formulaCode
      }));
    } else if (isFiniteAmount(assembly.uValue)) {
      lines.push(compactLine({
        lineId: `${assembly.assemblyId}.u.explicit`,
        text: explicitLine(`U_${name}`, assembly.uValue, "W/(m²K)"),
        resultValue: assembly.uValue,
        resultUnit: "W/(m²K)",
        variables: [
          { symbol: `U_${name}`, meaning: `coeficient U ${assembly.displayName}` }
        ],
        kind: "explicit_value"
      }));
    }

    for (const element of elementsByAssembly.get(assembly.assemblyId) ?? []) {
      const elementName = notebookName(element.elementId);
      lines.push(compactLine({
        lineId: `${element.elementId}.h`,
        text: expressionLine(
          `H_${elementName}`,
          `${formatNotebookNumber(element.uValue)} × ${formatNotebookNumber(element.area)} × ${formatNotebookNumber(element.boundaryCorrectionFactor)}`,
          element.contributionWK,
          "W/K"
        ),
        resultValue: element.contributionWK,
        resultUnit: "W/K",
        computedValue: Number(element.uValue) * Number(element.area) * Number(element.boundaryCorrectionFactor),
        variables: [
          { symbol: `H_${elementName}`, meaning: `contributie transfer ${element.elementId}` },
          { symbol: `U_${name}`, meaning: `coeficient U ${assembly.displayName}` },
          { symbol: `A_${elementName}`, meaning: `arie ${element.elementId}` }
        ],
        reference: element.contributionFormulaCode
      }));
    }

    return section(`anvelopa_${assembly.assemblyId}`, assembly.displayName, lines);
  });

  const directElements = (envelope.elementRows ?? []).filter(element => !element.assemblyId);
  if (directElements.length > 0) {
    sections.push(section("anvelopa_u_direct", "Elemente cu U introdus direct", directElements.map(element => {
      const elementName = notebookName(element.elementId);
      return compactLine({
        lineId: `${element.elementId}.direct_u_h`,
        text: `${explicitLine(`U_${elementName}`, element.uValue, "W/(m²K)")}\n${expressionLine(
          `H_${elementName}`,
          `${formatNotebookNumber(element.uValue)} × ${formatNotebookNumber(element.area)} × ${formatNotebookNumber(element.boundaryCorrectionFactor)}`,
          element.contributionWK,
          "W/K"
        )}`,
        resultValue: element.contributionWK,
        resultUnit: "W/K",
        computedValue: Number(element.uValue) * Number(element.area) * Number(element.boundaryCorrectionFactor),
        variables: [
          { symbol: `U_${elementName}`, meaning: `coeficient U ${element.elementId}` },
          { symbol: `H_${elementName}`, meaning: `contributie transfer ${element.elementId}` }
        ],
        reference: element.contributionFormulaCode
      });
    })));
  }
  return sections;
}

function compactTransferSections(envelope) {
  const bridgeLines = (envelope.thermalBridgeRows ?? []).map(bridge => compactLine({
    lineId: `${bridge.bridgeId}.bridge`,
    text: expressionLine(
      `H_punte_${notebookName(bridge.bridgeId)}`,
      `${formatNotebookNumber(bridge.psiWmK)} × ${formatNotebookNumber(bridge.lengthM)}`,
      bridge.contributionWK,
      "W/K"
    ),
    resultValue: bridge.contributionWK,
    resultUnit: "W/K",
    computedValue: Number(bridge.psiWmK) * Number(bridge.lengthM),
    variables: [
      { symbol: `H_punte_${notebookName(bridge.bridgeId)}`, meaning: `contributie punte termica ${bridge.bridgeId}` }
    ],
    reference: bridge.contributionFormulaCode
  }));

  const componentLines = envelope.components.map(component => {
    const elementTerms = (envelope.elementRows ?? [])
      .filter(element => element.component === component.componentId)
      .map(element => element.contributionWK);
    const bridgeTerms = (envelope.thermalBridgeRows ?? [])
      .filter(bridge => bridge.component === component.componentId)
      .map(bridge => bridge.contributionWK);
    const terms = [...elementTerms, ...bridgeTerms];
    return compactLine({
      lineId: `${component.componentId}.sum`,
      text: `${component.componentId} := ${sumExpression(terms, "W/K")}\n     = ${formatNotebookValue(component.amount, "W/K")}`,
      resultValue: component.amount,
      resultUnit: "W/K",
      computedValue: terms.reduce((sum, value) => sum + Number(value), 0),
      variables: [
        { symbol: component.componentId, meaning: `coeficient transmisie ${component.componentId}` }
      ],
      reference: "MC001_R17_RELATION_2_15_TOTAL_TRANSMISSION_COEFFICIENT"
    });
  });

  const htrTerms = envelope.components.map(component => component.amount);
  const htrLine = compactLine({
    lineId: "htr.total",
    text: `Htr := Hd + Hg + Hu + Ha\n    := ${sumExpression(htrTerms, "W/K")}\n     = ${formatNotebookValue(envelope.htr?.amount, "W/K")}`,
    resultValue: envelope.htr?.amount,
    resultUnit: "W/K",
    computedValue: htrTerms.reduce((sum, value) => sum + Number(value), 0),
    variables: [
      { symbol: "Htr", meaning: "coeficient total de transfer prin transmisie" }
    ],
    reference: "MC001_R17_RELATION_2_15_TOTAL_TRANSMISSION_COEFFICIENT"
  });

  return [section("transfer_total", "Hd, Hg, Hu, Ha, punti termice si Htr", [
    ...bridgeLines,
    ...componentLines,
    htrLine
  ])];
}

function compactMonthlySections(monthly) {
  return monthly.slice(0, 12).map(row => {
    const label = row.monthLabel ?? monthLabel(row.month);
    const idLabel = notebookName(label);
    const lines = [
      compactLine({
        lineId: `${row.month}.qtrh`,
        text: expressionLine(
          `QtrH_${idLabel}`,
          `${formatNotebookNumber(row.heatingTransmissionHeatFlowW)} × ${formatNotebookNumber(row.durationHours, 0)} / 1000`,
          row.heatingTransmissionKwh,
          "kWh"
        ),
        resultValue: row.heatingTransmissionKwh,
        resultUnit: "kWh",
        computedValue: Number(row.heatingTransmissionHeatFlowW) * Number(row.durationHours) / 1000,
        variables: [
          { symbol: `QtrH_${idLabel}`, meaning: `pierdere transmisie incalzire ${label}` }
        ],
        reference: "MC001_MONTHLY_TRANSMISSION_ENERGY_FROM_ENGINE_OUTPUT"
      }),
      compactLine({
        lineId: `${row.month}.qveh`,
        text: expressionLine(
          `QveH_${idLabel}`,
          `${formatNotebookNumber(row.heatingVentilationHeatFlowW)} × ${formatNotebookNumber(row.durationHours, 0)} / 1000`,
          row.heatingVentilationKwh,
          "kWh"
        ),
        resultValue: row.heatingVentilationKwh,
        resultUnit: "kWh",
        computedValue: Number(row.heatingVentilationHeatFlowW) * Number(row.durationHours) / 1000,
        variables: [
          { symbol: `QveH_${idLabel}`, meaning: `pierdere ventilare incalzire ${label}` }
        ],
        reference: "MC001_MONTHLY_VENTILATION_ENERGY_FROM_ENGINE_OUTPUT"
      }),
      compactLine({
        lineId: `${row.month}.qhht`,
        text: expressionLine(
          `QHht_${idLabel}`,
          `${formatNotebookNumber(row.heatingTransmissionKwh)} + ${formatNotebookNumber(row.heatingVentilationKwh)}`,
          row.qHhtKwh,
          "kWh"
        ),
        resultValue: row.qHhtKwh,
        resultUnit: "kWh",
        computedValue: row.qHhtKwh,
        variables: [
          { symbol: `QHht_${idLabel}`, meaning: `transfer total incalzire ${label}` }
        ],
        reference: "MC001_C5_DERIVED_TOTAL_HEATING_TRANSFER"
      }),
      compactLine({
        lineId: `${row.month}.qhgn`,
        text: expressionLine(
          `QHgn_${idLabel}`,
          `${formatNotebookNumber(row.internalGainsKwh)} + ${formatNotebookNumber(row.solarGainsKwh)}`,
          row.qHgnKwh,
          "kWh"
        ),
        resultValue: row.qHgnKwh,
        resultUnit: "kWh",
        computedValue: Number(row.internalGainsKwh) + Number(row.solarGainsKwh),
        variables: [
          { symbol: `QHgn_${idLabel}`, meaning: `aporturi totale incalzire ${label}` }
        ],
        reference: row.heatGainsFormulaCode
      }),
      compactLine({
        lineId: `${row.month}.gammah`,
        text: expressionLine(
          `γH_${idLabel}`,
          `${formatNotebookNumber(row.qHgnKwh)} / ${formatNotebookNumber(row.qHhtKwh)}`,
          row.gammaH,
          "-"
        ),
        resultValue: row.gammaH,
        resultUnit: "-",
        computedValue: Number(row.qHgnKwh) / Number(row.qHhtKwh),
        variables: [
          { symbol: `γH_${idLabel}`, meaning: `raport aporturi/transfer incalzire ${label}` }
        ],
        reference: row.qHndFormulaCode
      })
    ];

    if (row.qHndBranch === "gammaH_greater_than_two_zero_demand") {
      lines.push(compactLine({
        lineId: `${row.month}.qhnd.zero_branch`,
        text: `γH_${idLabel} > 2 => QHnd_${idLabel} := ${formatNotebookValue(row.qHndKwh, "kWh")}`,
        resultValue: row.qHndKwh,
        resultUnit: "kWh",
        computedValue: 0,
        variables: [
          { symbol: `QHnd_${idLabel}`, meaning: `necesar util incalzire ${label}` }
        ],
        reference: row.qHndFormulaCode,
        kind: "branch"
      }));
    } else {
      lines.push(compactLine({
        lineId: `${row.month}.eta_hgn`,
        text: `ηHgn_${idLabel} := ${formatNotebookValue(row.etaHgn, "-")} -- coeficient furnizat de motor pentru ramura aplicata`,
        resultValue: row.etaHgn,
        resultUnit: "-",
        variables: [
          { symbol: `ηHgn_${idLabel}`, meaning: `factor utilizare aporturi incalzire ${label}` }
        ],
        reference: "MC001_FIGURE_2_14_HEATING_GAIN_UTILIZATION_FACTOR",
        kind: "engine_intermediate"
      }));
      lines.push(compactLine({
        lineId: `${row.month}.qhnd`,
        text: expressionLine(
          `QHnd_${idLabel}`,
          `${formatNotebookNumber(row.qHhtKwh)} - ${formatNotebookNumber(row.etaHgn)} × ${formatNotebookNumber(row.qHgnKwh)}`,
          row.qHndKwh,
          "kWh"
        ),
        resultValue: row.qHndKwh,
        resultUnit: "kWh",
        computedValue: Number(row.qHhtKwh) - Number(row.etaHgn) * Number(row.qHgnKwh),
        variables: [
          { symbol: `QHnd_${idLabel}`, meaning: `necesar util incalzire ${label}` }
        ],
        reference: row.qHndFormulaCode
      }));
    }

    lines.push(compactLine({
      lineId: `${row.month}.qcht`,
      text: expressionLine(
        `QCht_${idLabel}`,
        `abs(${formatNotebookNumber(row.coolingTransmissionKwh)} + ${formatNotebookNumber(row.coolingVentilationKwh)})`,
        row.qChtKwh,
        "kWh"
      ),
      resultValue: row.qChtKwh,
      resultUnit: "kWh",
      computedValue: absoluteValue(Number(row.coolingTransmissionKwh) + Number(row.coolingVentilationKwh)),
      variables: [
        { symbol: `QCht_${idLabel}`, meaning: `transfer disponibil racire ${label}` }
      ],
      reference: "MC001_COOLING_TRANSFER_FROM_ENGINE_OUTPUT"
    }));
    lines.push(compactLine({
      lineId: `${row.month}.gammac`,
      text: expressionLine(
        `γC_${idLabel}`,
        `${formatNotebookNumber(row.qCgnKwh)} / ${formatNotebookNumber(row.qChtKwh)}`,
        row.gammaC,
        "-"
      ),
      resultValue: row.gammaC,
      resultUnit: "-",
      computedValue: Number(row.qCgnKwh) / Number(row.qChtKwh),
      variables: [
        { symbol: `γC_${idLabel}`, meaning: `raport aporturi/transfer racire ${label}` }
      ],
      reference: row.qCndFormulaCode
    }));
    lines.push(compactLine({
      lineId: `${row.month}.eta_cht`,
      text: `ηCht_${idLabel} := ${formatNotebookValue(row.etaCht, "-")} -- coeficient furnizat de motor pentru ramura aplicata`,
      resultValue: row.etaCht,
      resultUnit: "-",
      variables: [
        { symbol: `ηCht_${idLabel}`, meaning: `factor utilizare transfer racire ${label}` }
      ],
      reference: "MC001_FIGURE_2_15_COOLING_HEAT_TRANSFER_UTILIZATION_FACTOR",
      kind: "engine_intermediate"
    }));
    lines.push(compactLine({
      lineId: `${row.month}.qcnd`,
      text: expressionLine(
        `QCnd_${idLabel}`,
        `${formatNotebookNumber(row.qCgnKwh)} - ${formatNotebookNumber(row.etaCht)} × ${formatNotebookNumber(row.qChtKwh)}`,
        row.qCndKwh,
        "kWh"
      ),
      resultValue: row.qCndKwh,
      resultUnit: "kWh",
      computedValue: Number(row.qCgnKwh) - Number(row.etaCht) * Number(row.qChtKwh),
      variables: [
        { symbol: `QCnd_${idLabel}`, meaning: `necesar util racire ${label}` }
      ],
      reference: row.qCndFormulaCode
    }));

    return section(`luna_${row.month}`, `Calcul lunar - ${label}`, lines);
  });
}

function compactAnnualSection(monthly, calculation) {
  const qhValues = monthly.map(row => row.qHndKwh);
  const qcValues = monthly.map(row => row.qCndKwh);
  return section("totaluri_anuale", "Totaluri anuale", [
    compactLine({
      lineId: "annual.qhnd",
      text: `QHnd_an := ${sumExpression(qhValues, "kWh")}\n        = ${formatNotebookValue(calculation.chapter2Result?.result?.annualQHnd, "kWh")}`,
      resultValue: calculation.chapter2Result?.result?.annualQHnd,
      resultUnit: "kWh",
      computedValue: qhValues.reduce((sum, value) => sum + Number(value), 0),
      variables: [
        { symbol: "QHnd_an", meaning: "necesar anual de incalzire" }
      ],
      reference: "MC001_2_84_ANNUAL_HEATING_USEFUL_DEMAND"
    }),
    compactLine({
      lineId: "annual.qcnd",
      text: `QCnd_an := ${sumExpression(qcValues, "kWh")}\n        = ${formatNotebookValue(calculation.chapter2Result?.result?.annualQCnd, "kWh")}`,
      resultValue: calculation.chapter2Result?.result?.annualQCnd,
      resultUnit: "kWh",
      computedValue: qcValues.reduce((sum, value) => sum + Number(value), 0),
      variables: [
        { symbol: "QCnd_an", meaning: "necesar anual de racire" }
      ],
      reference: "MC001_2_85_ANNUAL_COOLING_USEFUL_DEMAND"
    })
  ]);
}

function compactClimateSection(buildingDna, monthly) {
  const climate = buildingDna.climate ?? {};
  const location = buildingDna.building?.location ?? {};
  const climateProvider = buildingDna.climateProvider ?? null;
  const productionClimateProfile = buildingDna.productionClimateProfile ?? null;
  const providerMonthlyTemperature =
    climateProvider?.datasets?.monthlyExteriorTemperature?.monthlyRecords ?? [];
  const providerMonthlyHumidity =
    climateProvider?.datasets?.monthlyRelativeHumidity?.monthlyRecords ?? [];
  const providerMonthlySolar =
    climateProvider?.datasets?.monthlySolarIrradiation?.monthlyRecords ?? [];
  const providerTemperatureText = providerMonthlyTemperature
    .map(record => `${monthLabel(record.month)} ${formatNotebookValue(record.value, record.unit, 2)}`)
    .join("; ");
  const providerHumidityText = providerMonthlyHumidity
    .map(record => `${monthLabel(record.month)} ${formatNotebookValue(record.value, record.unit, 1)}`)
    .join("; ");
  const providerSolarText = providerMonthlySolar
    .map(record => {
      const total = record.totalIrradianceWPerM2 ?? {};
      const diffuse = record.diffuseIrradianceWPerM2 ?? {};
      return `${monthLabel(record.month)} I_T,S ${formatNotebookValue(total.south, record.unit, 1)}, ` +
        `I_T,E ${formatNotebookValue(total.east, record.unit, 1)}, ` +
        `I_T,V ${formatNotebookValue(total.west, record.unit, 1)}, ` +
        `I_T,N ${formatNotebookValue(total.north, record.unit, 1)}, ` +
        `I_T,oriz ${formatNotebookValue(total.horizontal, record.unit, 1)}, ` +
        `I_d,oriz ${formatNotebookValue(diffuse.horizontal, record.unit, 1)}`;
    })
    .join(" | ");
  const winterDesignTemperature = buildingDna.climateZoneRequirements?.winterDesignTemperature ?? null;
  const eligibility = buildingDna.climateEligibility ?? [];
  return section("amplasare_clima", "Amplasare si clima", [
    compactLine({
      lineId: "climate.zone",
      text: `Zona_climatica := ${climate.climateZone ?? "neselectata"} -- ${climate.assignmentOrigin ?? "fara atribuire automata"}`,
      resultValue: climate.climateZone ?? null,
      resultUnit: null,
      variables: [
        { symbol: "Zona_climatica", value: climate.climateZone ?? null, unit: "-", meaning: "zona climatica MC001 selectata" }
      ],
      reference: "MC001-2022, Tabel 2.5, Tabel 2.8, Tabel 2.10a si Tabel 2.10b",
      kind: "input"
    }),
    compactLine({
      lineId: "climate.location",
      text: `Localitate := ${location.localityName ?? location.city ?? "neselectata"}; Judet := ${location.countyName ?? location.county ?? "neselectat"}`,
      variables: [
        { symbol: "Localitate", value: location.localityName ?? location.city ?? null, unit: "-", meaning: "localitatea proiectului" },
        { symbol: "Judet", value: location.countyName ?? location.county ?? null, unit: "-", meaning: "judetul proiectului" }
      ],
      reference: climate.sourceReferences?.[0] ?? "MC001-2022, Chapter 2 climate-zone tables",
      kind: "input"
    }),
    compactLine({
      lineId: "climate.winter-design-temperature",
      text: `theta_e_design_H := ${winterDesignTemperature?.value ?? "indisponibil"} degC -- ${winterDesignTemperature?.sourceReference ?? "zona climatica neselectata"}`,
      resultValue: winterDesignTemperature?.value ?? null,
      resultUnit: "degC",
      variables: [
        {
          symbol: "theta_e_design_H",
          value: winterDesignTemperature?.value ?? null,
          unit: "degC",
          meaning: "temperatura exterioara de calcul pentru iarna, pe zona climatica"
        }
      ],
      reference: winterDesignTemperature?.sourceReference ?? "MC001-2022, Figura 2.1",
      kind: "lookup"
    }),
    compactLine({
      lineId: "climate.monthly-profile",
      text: `Profil_lunar := ${buildingDna.climateProfile?.profileId ?? "profil explicit"} -- ${buildingDna.climateProfile?.datasetStatus ?? buildingDna.climateProfile?.verificationStatus ?? climate.monthlyClimateStatus ?? "date lunare furnizate explicit"}`,
      variables: [
        { symbol: "Profil_lunar", value: buildingDna.climateProfile?.profileId ?? null, unit: "-", meaning: "profilul lunar folosit de calcul" }
      ],
      reference: buildingDna.climateProfile?.sourceReferences?.[0] ?? "monthlyProfiles.BuildingDNA",
      kind: "input"
    }),
    ...(climateProvider ? [
      compactLine({
        lineId: "climate.provider.station",
        text: `Statie_MC001_6_2013 := ${climateProvider.selection?.stationName ?? "neselectata"}; dataset := ${climateProvider.datasetVersion ?? "neselectat"}`,
        variables: [
          {
            symbol: "Statie_MC001_6_2013",
            value: climateProvider.selection?.stationName ?? null,
            unit: "-",
            meaning: "statia/localitatea din registrul climatic normativ MC001/6-2013"
          }
        ],
        reference:
          climateProvider.datasets?.monthlyExteriorTemperature?.sourceReference ?? "Mc001/6-2013",
        kind: "lookup"
      }),
      compactLine({
        lineId: "climate.provider.monthly-temperature",
        text: `theta_e_lunar_MC001_6_2013 := ${providerTemperatureText || "indisponibil"}`,
        variables: providerMonthlyTemperature.map(record => ({
          symbol: `theta_e_${record.month}`,
          value: record.value,
          unit: record.unit,
          meaning: `temperatura exterioara medie lunara MC001/6-2013 ${monthLabel(record.month)}`
        })),
        reference:
          climateProvider.datasets?.monthlyExteriorTemperature?.sourceReference ?? "Mc001/6-2013, Tabel II.1",
        kind: "lookup"
      }),
      compactLine({
        lineId: "climate.provider.monthly-humidity",
        text: `phi_e_lunar_MC001_6_2013 := ${providerHumidityText || "indisponibil"}`,
        variables: providerMonthlyHumidity.map(record => ({
          symbol: `phi_e_${record.month}`,
          value: record.value,
          unit: record.unit,
          meaning: `umiditate relativa medie lunara MC001/6-2013 ${monthLabel(record.month)}`
        })),
        reference:
          climateProvider.datasets?.monthlyRelativeHumidity?.sourceReference ?? "Mc001/6-2013, Tabel II.2",
        kind: "lookup"
      }),
      compactLine({
        lineId: "climate.provider.solar-boundary",
        text: providerMonthlySolar.length > 0
          ? `I_solar_lunar_A9_6 := ${providerSolarText}`
          : `I_solar_lunar := indisponibil pentru statia selectata -- ${climateProvider.datasets?.monthlySolarIrradiation?.diagnostic?.sourceReference ?? "Mc001/1-2006 Anexa nr. A9.6 necesara"}`,
        variables: providerMonthlySolar.length > 0
          ? providerMonthlySolar.flatMap(record => ([
              {
                symbol: `I_T_S_${record.month}`,
                value: record.totalIrradianceWPerM2?.south,
                unit: record.unit,
                meaning: `intensitate solara totala pe verticala sud ${monthLabel(record.month)}`
              },
              {
                symbol: `I_T_oriz_${record.month}`,
                value: record.totalIrradianceWPerM2?.horizontal,
                unit: record.unit,
                meaning: `intensitate solara totala pe plan orizontal ${monthLabel(record.month)}`
              },
              {
                symbol: `I_d_oriz_${record.month}`,
                value: record.diffuseIrradianceWPerM2?.horizontal,
                unit: record.unit,
                meaning: `intensitate solara difuza pe plan orizontal ${monthLabel(record.month)}`
              }
            ]))
          : [
              {
                symbol: "I_solar_lunar",
                value: null,
                unit: "W/m2",
                meaning: "intensitate/iradiere solara lunara normativa necesara pentru aporturi solare"
              }
            ],
        reference:
          climateProvider.datasets?.monthlySolarIrradiation?.sourceReference ??
          climateProvider.datasets?.monthlySolarIrradiation?.diagnostic?.sourceReference ??
          "Mc001/1-2006 Anexa nr. A9.6",
        kind: providerMonthlySolar.length > 0 ? "lookup" : "diagnostic"
      })
    ] : []),
    ...(productionClimateProfile ? [
      compactLine({
        lineId: "climate.production-profile.status",
        text: `Profil_climatic_productie := ${productionClimateProfile.status}; registru := ${productionClimateProfile.registryVersion}`,
        variables: [
          {
            symbol: "Profil_climatic_productie",
            value: productionClimateProfile.status,
            unit: "-",
            meaning: "statusul profilului climatic productie pentru localitatea/statie selectata"
          }
        ],
        reference: "validation-reference/romanian-climate-infrastructure-audit.json",
        kind: "diagnostic"
      }),
      ...((productionClimateProfile.fields ?? []).map(field => compactLine({
        lineId: `climate.production-profile.${field.parameterId}`,
        text: `${field.parameterId} := ${summarizeClimateProfileFieldValue(field)}${field.unit ? ` ${field.unit}` : ""} -- ${field.source?.sourceReference ?? field.dataset?.sourceReference ?? "sursa normativa"}`,
        variables: [
          {
            symbol: field.parameterId,
            value: typeof field.value === "object" ? summarizeClimateProfileFieldValue(field) : field.value,
            unit: field.unit ?? "-",
            meaning: field.label
          }
        ],
        reference: field.source?.sourceReference ?? field.dataset?.sourceReference ?? "registru climatic productie",
        kind: "lookup"
      }))),
      ...((productionClimateProfile.boundedFields ?? []).map(field => compactLine({
        lineId: `climate.production-profile.bounded.${field.parameterId}`,
        text: `${field.parameterId} := indisponibil -- necesita ${field.missingDocument}, ${field.missingTableOrClause}`,
        variables: [
          {
            symbol: field.parameterId,
            value: null,
            unit: field.unit ?? "-",
            meaning: field.label
          }
        ],
        reference: field.missingDocument,
        kind: "diagnostic"
      })))
    ] : []),
    ...eligibility.map(item => compactLine({
      lineId: `climate.eligibility.${item.calculationId}`,
      text: `${item.calculationId} := ${item.status}${item.diagnostic ? ` -- ${item.diagnostic}` : ""}`,
      variables: [
        {
          symbol: item.calculationId,
          value: item.status,
          unit: "-",
          meaning: item.label
        }
      ],
      reference: "validation-reference/romanian-climate-normative-dependencies.json",
      kind: "diagnostic"
    })),
    ...monthly.map(row => compactLine({
      lineId: `climate.month.${row.month}`,
      text: `${row.monthLabel} := theta_e,H ${formatNotebookValue(row.heatingOutdoorTemperatureC, "degC", 2)}; theta_e,C ${formatNotebookValue(row.coolingOutdoorTemperatureC, "degC", 2)}; t ${formatNotebookValue(row.durationHours, "h", 0)}; Qsol ${formatNotebookValue(row.solarGainsKwh, "kWh", 2)}`,
      variables: [
        { symbol: `theta_e_H_${row.month}`, value: row.heatingOutdoorTemperatureC, unit: "degC", meaning: `temperatura exterioara incalzire ${row.monthLabel}` },
        { symbol: `theta_e_C_${row.month}`, value: row.coolingOutdoorTemperatureC, unit: "degC", meaning: `temperatura exterioara racire ${row.monthLabel}` },
        { symbol: `Qsol_${row.month}`, value: row.solarGainsKwh, unit: "kWh", meaning: `aport solar lunar ${row.monthLabel}` }
      ],
      reference: row.monthlyProfileReference,
      kind: "input"
    }))
  ]);
}

function compactNotebookSections(buildingDna, assemblies, envelope, monthly, calculation) {
  return [
    compactClimateSection(buildingDna, monthly),
    ...compactAssemblySections(assemblies, envelope),
    ...compactTransferSections(envelope),
    ...compactMonthlySections(monthly),
    compactAnnualSection(monthly, calculation),
    ...buildChapter3NotebookSections(calculation.chapter3Result ?? calculation.chapter3Runtime)
  ];
}

function traceabilityRows(buildingDna, calculation, formulas) {
  const references = new Set([
    ...(calculation.assemblyResult?.formulaReferences ?? []),
    ...(calculation.envelopeTransmissionResult?.formulaReferences ?? []),
    ...(calculation.chapter2Result?.formulaReferences ?? []),
    ...(calculation.chapter3Result?.formulaReferences ?? []),
    ...(calculation.chapter3Runtime?.formulaReferences ?? []),
    ...(calculation.chapter2Result?.result?.combinedUsefulDemandResult?.formulaReferences ?? []),
    ...formulas.map(item => item.formulaId).filter(Boolean)
  ]);
  return [...references].map(reference => ({
    reference,
    chapter: reference?.startsWith("MC001_3") ? "MC001 Chapter 3" : reference?.startsWith("MC001") ? "MC001 Chapter 2" : null,
    source: reference?.startsWith("MC001_3")
      ? "validated_chapter_3_installations_runtime"
      : "validated_chapter_2_physics_engine",
    buildingDnaLink: buildingDna.schema
  }));
}

function installationRows(calculation) {
  const result = calculation.chapter3Result;
  if (!result) return [];
  const rows = [
    {
      service: "Incalzire",
      value: result.annual?.heatingInputKWh ?? 0,
      unit: "kWh/an",
      status: result.services?.heating?.enabled ? "calculat" : "inactiv",
      outputKey: "chapter3Result.annual.heatingInputKWh"
    },
    {
      service: "Racire",
      value: result.annual?.coolingInputKWh ?? 0,
      unit: "kWh/an",
      status: result.services?.cooling?.enabled ? "calculat" : "inactiv",
      outputKey: "chapter3Result.annual.coolingInputKWh"
    },
    {
      service: "Apa calda de consum",
      value: result.annual?.dhwInputKWh ?? 0,
      unit: "kWh/an",
      status: result.services?.dhw?.enabled ? "calculat" : "inactiv",
      outputKey: "chapter3Result.annual.dhwInputKWh"
    },
    {
      service: "Ventilatie/AHU auxiliar",
      value: result.annual?.ventilationAuxiliaryKWh ?? 0,
      unit: "kWh/an",
      status: result.services?.ventilationAhu?.enabled ? "calculat" : "inactiv",
      outputKey: "chapter3Result.annual.ventilationAuxiliaryKWh"
    },
    {
      service: "Iluminat - LENI explicit",
      value: result.annual?.lightingEnergyKWh ?? 0,
      unit: "kWh/an",
      status: result.services?.lighting?.enabled ? "input explicit" : "inactiv",
      outputKey: "chapter3Result.annual.lightingEnergyKWh"
    }
  ];
  if (result.services?.coolingStoragePcm?.enabled) {
    rows.push({
      service: "Stocare PCM racire",
      value: result.annual?.pcmInputEnergyLimitKWh ?? 0,
      unit: "kWh/an",
      status: "calculat",
      outputKey: "chapter3Result.annual.pcmInputEnergyLimitKWh"
    });
  }
  return rows;
}

function installationMonthlyRows(calculation) {
  return (calculation.chapter3Result?.monthly ?? []).map(month => ({
    month: month.month,
    monthLabel: monthLabel(month.month),
    heatingInputKWh: month.totals?.heatingInputKWh ?? 0,
    coolingInputKWh: month.totals?.coolingInputKWh ?? 0,
    dhwInputKWh: month.totals?.dhwInputKWh ?? 0,
    ventilationAuxiliaryKWh: month.totals?.ventilationAuxiliaryKWh ?? 0,
    lightingEnergyKWh: month.totals?.lightingEnergyKWh ?? 0,
    pcmInputEnergyLimitKWh: month.totals?.pcmInputEnergyLimitKWh ?? 0
  }));
}

function summarizeClimateProfileFieldValue(field) {
  const value = field?.value;
  if (value === null || value === undefined) return "indisponibil";
  if (typeof value !== "object") return String(value);
  if (Array.isArray(value)) return `${value.length} inregistrari`;
  if (field.parameterId === "locality_station_mapping") {
    return `${value.localityName ?? "localitate neselectata"} -> ${value.stationName ?? value.stationId ?? "statie neselectata"}`;
  }
  if (field.parameterId === "zone_dependent_requirements") {
    return [
      value.solarFactor?.recommendation
        ? `gn ${value.solarFactor.recommendation.comparator === "greater_than"
            ? `> ${value.solarFactor.recommendation.min}`
            : `${value.solarFactor.recommendation.min}-${value.solarFactor.recommendation.max}`}`
        : null,
      value.nzebLimit?.limit
        ? `NZEB ${value.nzebLimit.limit.primaryEnergyKwhM2Year} kWh/(m2*an)`
        : null,
      value.renovationLimit?.limit
        ? `renovare ${value.renovationLimit.limit.primaryEnergyKwhM2Year} kWh/(m2*an)`
        : null
    ].filter(Boolean).join("; ");
  }
  if (field.parameterId?.includes("design_day_temperature")) {
    return `media ${formatNotebookValue(value.meanDailyTemperatureC, field.unit ?? "degC", 2)}`;
  }
  if (field.parameterId?.includes("design_pentad_temperature")) {
    return `pentada disponibila (${Object.keys(value).length} grupe de selectie)`;
  }
  return Object.keys(value).slice(0, 6).join(", ");
}

function climateProfileFieldRows(productionClimateProfile) {
  if (!productionClimateProfile) return [];
  const available = (productionClimateProfile.fields ?? []).map(field => ({
    label: field.label,
    value: summarizeClimateProfileFieldValue(field),
    unit: field.unit ?? "-",
    source: field.source?.sourceReference ??
      field.dataset?.sourceReference ??
      field.dataset?.sourceDocument?.sourceReference ??
      field.dataset?.sourceDocument?.title ??
      "sursa normativa",
    status: field.status
  }));
  const bounded = (productionClimateProfile.boundedFields ?? []).map(field => ({
    label: field.label,
    value: `${field.reason} Sursa lipsa: ${field.missingDocument}; ${field.missingTableOrClause}.`,
    unit: field.unit ?? "-",
    source: field.missingDocument,
    status: field.status
  }));
  return [
    {
      label: "Versiune registru climatic productie",
      value: productionClimateProfile.registryVersion
    },
    {
      label: "Status profil climatic productie",
      value: productionClimateProfile.status
    },
    {
      label: "Acoperire profil climatic",
      value:
        `${productionClimateProfile.coverage?.availableFieldCount ?? 0} campuri disponibile; ` +
        `${productionClimateProfile.coverage?.boundedFieldCount ?? 0} campuri limitate explicit`
    },
    ...available,
    ...bounded
  ];
}

function climateRows(buildingDna, monthly) {
  const climate = buildingDna.climate ?? {};
  const location = buildingDna.building?.location ?? {};
  const climateProvider = buildingDna.climateProvider ?? null;
  const productionClimateProfile = buildingDna.productionClimateProfile ?? null;
  const providerMonthlyTemperature =
    climateProvider?.datasets?.monthlyExteriorTemperature?.monthlyRecords ?? [];
  const providerMonthlyHumidity =
    climateProvider?.datasets?.monthlyRelativeHumidity?.monthlyRecords ?? [];
  const providerMonthlySolar =
    climateProvider?.datasets?.monthlySolarIrradiation?.monthlyRecords ?? [];
  const solarFactor = buildingDna.climateZoneRequirements?.solarFactor?.recommendation ?? null;
  const nzebLimit = buildingDna.climateZoneRequirements?.nzebLimit?.limit ?? null;
  const renovationLimit = buildingDna.climateZoneRequirements?.renovationLimit?.limit ?? null;
  const winterDesignTemperature = buildingDna.climateZoneRequirements?.winterDesignTemperature ?? null;
  const eligibility = buildingDna.climateEligibility ?? [];
  return [
    { label: "Tara", value: location.country ?? "RO" },
    { label: "Judet", value: location.countyName ?? location.county ?? "neselectat" },
    { label: "Localitate", value: location.localityName ?? location.locality ?? location.city ?? "neselectat" },
    { label: "Zona climatica MC001", value: climate.climateZone ?? "neselectata" },
    { label: "Zona eoliana", value: climate.windZone ?? "neselectata" },
    { label: "Dataset zone", value: climate.datasetVersion ?? "neselectat" },
    { label: "Origine atribuire", value: climate.assignmentOrigin ?? "neselectat" },
    { label: "Suprascriere manuala", value: climate.manualOverride ? "da" : "nu" },
    { label: "Status mapare localitate", value: climate.localityMappingStatus ?? "nedefinit" },
    { label: "Status profil lunar", value: climate.monthlyClimateStatus ?? "nedefinit" },
    { label: "Status dataset lunar", value: buildingDna.climateProfile?.datasetStatus ?? "DATASET_UNAVAILABLE" },
    { label: "Sursa profil lunar", value: buildingDna.climateProfile?.sourceTitle ?? buildingDna.climateProfile?.sourceType ?? "neselectata" },
    { label: "Versiune profil lunar", value: buildingDna.climateProfile?.datasetVersion ?? "neselectata" },
    { label: "Statie/localitate dataset", value: buildingDna.climateProfile?.stationName ?? buildingDna.climateProfile?.locality ?? "neselectata" },
    ...(climateProvider ? [
      {
        label: "Statie normativa MC001/6-2013",
        value: climateProvider.selection?.stationName ?? climateProvider.selection?.stationId ?? "neselectata"
      },
      {
        label: "Versiune dataset MC001/6-2013",
        value: climateProvider.datasetVersion ?? "neselectata"
      },
      {
        label: "Sursa dataset MC001/6-2013",
        value: climateProvider.datasets?.monthlyExteriorTemperature?.sourceReference ?? "Mc001/6-2013"
      },
      {
        label: "Temperaturi exterioare lunare normative",
        value: providerMonthlyTemperature
          .map(record => `${monthLabel(record.month)} ${formatNotebookValue(record.value, record.unit, 2)}`)
          .join("; ") || "indisponibile"
      },
      {
        label: "Umiditati relative lunare normative",
        value: providerMonthlyHumidity
          .map(record => `${monthLabel(record.month)} ${formatNotebookValue(record.value, record.unit, 1)}`)
          .join("; ") || "indisponibile"
      },
      {
        label: "Iradiere solara lunara normativa",
        value: providerMonthlySolar.length > 0
          ? providerMonthlySolar
              .map(record =>
                `${monthLabel(record.month)} I_T,oriz ${formatNotebookValue(record.totalIrradianceWPerM2?.horizontal, record.unit, 1)}, ` +
                `I_T,S ${formatNotebookValue(record.totalIrradianceWPerM2?.south, record.unit, 1)}`
              )
              .join("; ")
          : climateProvider.datasets?.monthlySolarIrradiation?.diagnostic?.sourceReference ??
            "indisponibila fara Mc001/1-2006 Anexa nr. A9.6"
      },
      {
        label: "Sursa iradiere solara normativa",
        value:
          climateProvider.datasets?.monthlySolarIrradiation?.sourceReference ??
          climateProvider.datasets?.monthlySolarIrradiation?.diagnostic?.sourceReference ??
          "neselectata"
      },
      {
        label: "Versiune dataset solar",
        value:
          climateProvider.datasets?.monthlySolarIrradiation?.datasetVersion ??
          "indisponibila"
      },
      {
        label: "Status preprocesare Qsol",
        value: climateProvider.diagnostics?.find(
          item => item.code === "SOLAR_IRRADIATION_PREPROCESSING_STANDARD_REQUIRED_FOR_QSOL"
        )?.sourceReference ?? "Hsol/Qsky preprocesate sau input certificat disponibile"
      }
    ] : []),
    ...climateProfileFieldRows(productionClimateProfile),
    {
      label: "Temperatura exterioara de calcul iarna",
      value: winterDesignTemperature
        ? `${winterDesignTemperature.value} degC (${winterDesignTemperature.sourceReference})`
        : "indisponibila fara zona climatica"
    },
    {
      label: "Calcule climatice eligibile",
      value: eligibility
        .filter(item => item.status === "ELIGIBLE")
        .map(item => item.calculationId)
        .join(", ") || "niciun calcul climatic eligibil"
    },
    {
      label: "Calcule climatice indisponibile",
      value: eligibility
        .filter(item => item.status !== "ELIGIBLE")
        .map(item => `${item.calculationId}: ${item.diagnostic ?? item.status}`)
        .join("; ") || "niciun calcul indisponibil"
    },
    {
      label: "Factor solar recomandat gn",
      value: solarFactor
        ? (solarFactor.comparator === "greater_than"
            ? `> ${solarFactor.min}`
            : `${solarFactor.min} - ${solarFactor.max}`)
        : "indisponibil fara zona climatica"
    },
    {
      label: "Limita NZEB tabel 2.10a",
      value: nzebLimit
        ? `${nzebLimit.primaryEnergyKwhM2Year} kWh/(m2*an), ${nzebLimit.co2KgM2Year} kgCO2/(m2*an)`
        : "indisponibil fara zona climatica"
    },
    {
      label: "Limita renovare tabel 2.10b",
      value: renovationLimit
        ? `${renovationLimit.primaryEnergyKwhM2Year} kWh/(m2*an), ${renovationLimit.co2KgM2Year} kgCO2/(m2*an)`
        : "indisponibil fara zona climatica"
    },
    ...monthly.map(row => ({
      month: row.month,
      monthLabel: row.monthLabel,
      heatingOutdoorTemperatureC: row.heatingOutdoorTemperatureC,
      coolingOutdoorTemperatureC: row.coolingOutdoorTemperatureC,
      durationHours: row.durationHours,
      solarOrientation: row.solarOrientation,
      solarGainsKwh: row.solarGainsKwh,
      monthlyProfileOrigin: row.monthlyProfileOrigin,
      monthlyProfileReference: row.monthlyProfileReference
    }))
  ];
}

function reportChapters({ buildingDna, monthly, formulas, traceability, calculation, fingerprint, seasonalSanity }) {
  const chapter2 = calculation.chapter2Result?.result ?? {};
  const chapter3Rows = calculation.chapter3Result ? [
    ...installationRows(calculation),
    ...installationMonthlyRows(calculation),
    {
      label: "Limitare iluminat",
      value:
        "Calculul detaliat normativ al iluminatului conform SR EN 15193-1 nu este inclus fara sursa normativa completa. Valorile LENI introduse explicit sunt tratate ca date tehnice furnizate."
    }
  ] : [];
  return [
    makeReportChapter("rezultate_principale", "Rezultate principale", "Necesar util anual si valori lunare pentru incalzire si racire.", [
      { label: "Necesar anual de incalzire QHnd", value: chapter2.annualQHnd, unit: "kWh" },
      { label: "Necesar anual de racire QCnd", value: chapter2.annualQCnd, unit: "kWh" },
      ...monthly.map(row => ({
        month: row.month,
        monthLabel: row.monthLabel,
        qHndKwh: row.qHndKwh,
        qCndKwh: row.qCndKwh
      }))
    ]),
    makeReportChapter(
      "amplasare_si_clima",
      "Amplasare si date climatice utilizate",
      "Zona climatica, profilul lunar efectiv si lookup-urile dependente de zona sunt afisate separat de calculele software interne.",
      climateRows(buildingDna, monthly),
      [
        "MC001-2022, Tabel 2.5",
        "MC001-2022, Tabel 2.8",
        "MC001-2022, Tabel 2.10a",
        "MC001-2022, Tabel 2.10b"
      ]
    ),
    ...(calculation.chapter3Result ? [
      makeReportChapter(
        "instalatii_capitolul_3",
        "Instalatii tehnice - MC001 Capitolul 3",
        "Rezultatele folosesc cereri utile Chapter 2 si date explicite pentru sisteme: pierderi, auxiliari, recuperari, stocare si limita LENI explicita.",
        chapter3Rows,
        calculation.chapter3Result.formulaReferences ?? []
      )
    ] : []),
    makeReportChapter("caiet_de_calcule_ingineresti", "Caiet de calcule ingineresti", "Variabile, relatii, substitutii si rezultate in ordinea dependentelor.", formulas),
    makeReportChapter("anexa_tehnica_interna", "Anexa tehnica interna", "Identificatori tehnici si diagnostice pastrate separat de calculul principal.", [
      { label: "Model", value: buildingDna.building?.buildingId },
      { label: "Tip cladire", value: buildingDna.building?.buildingType },
      { label: "Perioada constructie", value: buildingDna.building?.constructionPeriod },
      { label: "Sistem structural", value: buildingDna.building?.structuralSystem },
      { label: "Amprenta calcul", value: fingerprint.fingerprintId },
      ...(buildingDna.assumptions ?? []).map(item => ({ label: "Assumption", value: item.text })),
      ...(buildingDna.missingConfirmations ?? []).map(item => ({ label: "Confirmation required", value: item })),
      ...(buildingDna.overrides ?? []),
      { label: "Profil climatic", value: fingerprint.inputs.climateProfileId },
      { label: "Versiune profil climatic", value: fingerprint.inputs.climateProfileVersion },
      { label: "Zona climatica", value: buildingDna.climate?.climateZone ?? null },
      { label: "Zona eoliana", value: buildingDna.climate?.windZone ?? null },
      { label: "Adapter stage", value: fingerprint.inputs.adapterStage },
      { label: "Engine scope", value: fingerprint.inputs.engineScope },
      ...traceability.map(item => ({ label: "Referinta", value: item.reference })),
      { label: "Summer QCnd", value: seasonalSanity.checks.summerCoolingKwh, unit: "kWh" },
      { label: "May + October QCnd", value: seasonalSanity.checks.shoulderCoolingKwh, unit: "kWh" },
      {
        label: "Warnings",
        value: seasonalSanity.diagnostics.warnings.map(item => item.code).join(", ") || "none"
      }
    ])
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
  const notebookSections = compactNotebookSections(buildingDna, assemblies, envelope, monthly, calculation);
  const traceability = traceabilityRows(buildingDna, calculation, formulas);
  const fingerprint = calculationFingerprint(buildingDna, calculation, monthly);
  const installations = calculation.chapter3Result ? {
    status: "ready",
    annual: calculation.chapter3Result.annual ?? {},
    monthly: installationMonthlyRows(calculation),
    services: calculation.chapter3Result.services ?? {},
    energyByService: calculation.chapter3Result.energyByService ?? {},
    energyByCarrier: calculation.chapter3Result.energyByCarrier ?? {},
    rows: installationRows(calculation),
    lightingBoundaryStatement:
      "Calculul detaliat normativ al iluminatului conform SR EN 15193-1 nu este inclus fara sursa normativa completa. Valorile LENI introduse explicit sunt tratate ca date tehnice furnizate."
  } : {
    status: "not_configured",
    annual: {},
    monthly: [],
    services: {},
    energyByService: {},
    energyByCarrier: {},
    rows: [],
    lightingBoundaryStatement: null
  };
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
    installations,
    monthly,
    seasonalSanity,
    calculationFingerprint: fingerprint,
    formulaViews: formulas,
    engineeringNotebook: {
      title: "Caiet de calcule ingineresti",
      sections: notebookSections,
      calculations: formulas
    },
    dependencyTrees: pipelineResult.review?.dependencyTrees ?? {},
    traceability,
    report: {
      reportId: "engineering_calculation_notebook_p3g_v1",
      title: "Caiet de calcul MC001-2022",
      source: calculation.chapter3Result
        ? "Model tehnic si rezultate Chapter 2 si Chapter 3 validate"
        : "Model tehnic si rezultate Chapter 2 validate",
      calculationFingerprint: fingerprint,
      mainResults: {
        annualQHnd: calculation.chapter2Result?.result?.annualQHnd ?? null,
        annualQCnd: calculation.chapter2Result?.result?.annualQCnd ?? null,
        installations: calculation.chapter3Result?.annual ?? null,
        monthly: monthly.map(row => ({
          month: row.month,
          monthLabel: row.monthLabel,
          qHndKwh: row.qHndKwh,
          qCndKwh: row.qCndKwh
        }))
      },
      engineeringNotebook: {
        sections: notebookSections,
        calculations: formulas
      },
      chapters
    },
    resultSummary: {
      annualQHnd: calculation.chapter2Result?.result?.annualQHnd ?? null,
      annualQCnd: calculation.chapter2Result?.result?.annualQCnd ?? null,
      chapter3Annual: calculation.chapter3Result?.annual ?? null,
      monthCount: calculation.chapter2Result?.result?.monthCount ?? null
    },
    diagnostics: {
      blockers: [],
      warnings: [],
      methodologyLimits: [
        "report_generation_only",
        calculation.chapter3Result
          ? "values_from_building_dna_chapter_2_and_chapter_3_results"
          : "values_from_building_dna_and_chapter_2_results",
        "chapter_2_physics_engine_is_calculation_authority",
        ...(calculation.chapter3Result ? ["chapter_3_installations_from_explicit_inputs"] : ["not_chapter_3"]),
        "no_duplicate_calculations",
        "no_hidden_defaults",
        "not_primary_energy",
        "not_CO2",
        "not_certificate"
      ]
    }
  };
}
