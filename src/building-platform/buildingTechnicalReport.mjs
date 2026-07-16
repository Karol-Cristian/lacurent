import {
  analyzeMonthlyUsefulDemandSeasonality
} from "../climate-platform/index.mjs";

const TECHNICAL_WORKSPACE_SCOPE = "building_technical_workspace_p2b_report_generation_only";

export const TECHNICAL_WORKSPACE_TABS = Object.freeze([
  { tabId: "building", label: "Cladire" },
  { tabId: "assemblies", label: "Anvelopa" },
  { tabId: "materials", label: "Materiale" },
  { tabId: "building_dna", label: "Building DNA" },
  { tabId: "chapter_2", label: "Calcul MC001" },
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

function formatFormulaNumber(value, digits = 4) {
  const number = Number(value);
  return Number.isFinite(number) ? number.toFixed(digits) : "--";
}

function formatFormulaValue(value, unit, digits = 4) {
  return `${formatFormulaNumber(value, digits)}${unit ? ` ${unit}` : ""}`;
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
  inputVariables = [],
  sourceReference,
  symbolicFormula,
  substitutedFormula,
  resultLine,
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
    inputVariables,
    sourceReference,
    normativeReference: readableNormativeReference(formulaId ?? sourceReference),
    symbolicFormula,
    substitutedFormula,
    resultLine: resultLine ?? `${resultSymbol} = ${formatFormulaValue(resultValue, resultUnit)}`,
    dependencies
  };
}

function formulaViews(assemblies, envelope, monthly, calculation) {
  const envelopeFormulaReferences = calculation.envelopeTransmissionResult?.formulaReferences ?? [];
  const htrFormulaReference = envelopeFormulaReferences.find(reference => reference.includes("2_15")) ??
    envelopeFormulaReferences[0] ??
    null;
  const assemblyFormulaViews = assemblies.flatMap((assembly) => {
    const layerTraces = assembly.layers.map(layer => formulaTrace({
      formulaId: layer.resistanceFormulaCode,
      formulaName: `Rezistenta strat - ${assembly.displayName} / ${layer.materialName}`,
      resultSymbol: "R_layer",
      resultValue: layer.resistanceM2KPerW,
      resultUnit: "m2*K/W",
      origin: layer.lambdaOrigin,
      inputVariables: [
        { symbol: "d", value: layer.thicknessM, unit: "m" },
        { symbol: "lambda_design", value: layer.lambdaWmK, unit: "W/(m*K)" }
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
      inputVariables: [
        { symbol: "Rsi", value: assembly.rsi, unit: assembly.totalResistanceUnit },
        ...assembly.layers.map(layer => ({
          symbol: `R_${layer.layerId}`,
          value: layer.resistanceM2KPerW,
          unit: "m2*K/W"
        })),
        { symbol: "Rse", value: assembly.rse, unit: assembly.totalResistanceUnit }
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
      inputVariables: [
        { symbol: "Rtotal", value: assembly.totalResistance, unit: assembly.totalResistanceUnit }
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

  const htrFormulaViews = [
    formulaTrace({
      formulaId: htrFormulaReference,
      formulaName: "Coeficient total de transfer termic prin transmisie",
      resultSymbol: envelope.htr?.symbol ?? "H_tr",
      resultValue: envelope.htr?.amount ?? null,
      resultUnit: envelope.htr?.unit ?? "W/K",
      origin: envelope.htr?.origin ?? null,
      inputVariables: envelope.components.map(component => ({
        symbol: component.componentId,
        value: component.amount,
        unit: component.unit
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
      formulaId: row.qHndFormulaCode,
      formulaName: `Necesar util lunar de incalzire - ${row.month}`,
      resultSymbol: "QHnd",
      resultValue: row.qHndKwh,
      resultUnit: "kWh",
      origin: row.qHndOrigin,
      inputVariables: [
        { symbol: "Qtr,H", value: row.heatingTransmissionKwh, unit: "kWh" },
        { symbol: "Qve,H", value: row.heatingVentilationKwh, unit: "kWh" },
        { symbol: "QHgn", value: row.qHgnKwh, unit: "kWh" }
      ],
      sourceReference: row.qHndFormulaCode,
      symbolicFormula: "QHnd = f(Qtr,H, Qve,H, QHgn, eta_Hgn)",
      substitutedFormula: `QHnd = f(${formatFormulaValue(row.heatingTransmissionKwh, "kWh")}, ${formatFormulaValue(row.heatingVentilationKwh, "kWh")}, ${formatFormulaValue(row.qHgnKwh, "kWh")})`,
      resultLine: `QHnd = ${formatFormulaValue(row.qHndKwh, "kWh")}`,
      dependencies: [`${row.month}.QtrH`, `${row.month}.QveH`, `${row.month}.QHgn`]
    }));
    monthFormulaViews.push(formulaTrace({
      formulaId: row.qCndFormulaCode,
      formulaName: `Necesar util lunar de racire - ${row.month}`,
      resultSymbol: "QCnd",
      resultValue: row.qCndKwh,
      resultUnit: "kWh",
      origin: row.qCndOrigin,
      inputVariables: [
        { symbol: "Qtr,C", value: row.coolingTransmissionKwh, unit: "kWh" },
        { symbol: "Qve,C", value: row.coolingVentilationKwh, unit: "kWh" },
        { symbol: "QCgn", value: row.qHgnKwh, unit: "kWh" }
      ],
      sourceReference: row.qCndFormulaCode,
      symbolicFormula: "QCnd = f(Qtr,C, Qve,C, QCgn, eta_Cht)",
      substitutedFormula: `QCnd = f(${formatFormulaValue(row.coolingTransmissionKwh, "kWh")}, ${formatFormulaValue(row.coolingVentilationKwh, "kWh")}, ${formatFormulaValue(row.qHgnKwh, "kWh")})`,
      resultLine: `QCnd = ${formatFormulaValue(row.qCndKwh, "kWh")}`,
      dependencies: [`${row.month}.QtrC`, `${row.month}.QveC`, `${row.month}.QCgn`]
    }));
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
    makeReportChapter("date_generale_ale_proiectului", "Date generale ale proiectului", "Identificarea modelului si contextul tehnic al calculului.", [
      { label: "Model", value: buildingDna.building?.buildingId },
      { label: "Tip cladire", value: buildingDna.building?.buildingType },
      { label: "Perioada constructie", value: buildingDna.building?.constructionPeriod },
      { label: "Sistem structural", value: buildingDna.building?.structuralSystem }
    ]),
    makeReportChapter("statutul_calculului", "Statutul calculului", "Starea calculului curent si amprenta folosita pentru verificarea valorilor afisate.", [
      { label: "Statut", value: buildingDna.calculationStatus },
      { label: "Amprenta calcul", value: fingerprint.fingerprintId },
      { label: "Luni calculate", value: chapter2.monthCount }
    ]),
    makeReportChapter("date_climatice_utilizate", "Date climatice utilizate", "Profilul lunar folosit ca intrare pentru transfer, ventilare si aporturi.", monthly.map(row => ({
      month: row.month,
      durationHours: row.durationHours,
      heatingOutdoorTemperatureC: row.heatingOutdoorTemperatureC,
      coolingOutdoorTemperatureC: row.coolingOutdoorTemperatureC,
      heatingTemperatureDifferenceK: row.heatingTemperatureDifferenceK,
      coolingTemperatureDifferenceK: row.coolingTemperatureDifferenceK,
      ventilationAirFlowRateM3PerS: row.ventilationAirFlowRateM3PerS,
      solarOrientation: row.solarOrientation,
      solarGainsSource: row.solarGainsSource,
      monthlyProfileOrigin: row.monthlyProfileOrigin
    }))),
    makeReportChapter("geometria_cladirii", "Geometria cladirii", "Arii si parametri geometrici folositi in elementele de anvelopa.", [
      ...Object.entries(buildingDna.geometry ?? {}).map(([label, value]) => ({ label, value })),
      ...Object.entries(buildingDna.buildingSpecificParameters ?? {}).map(([label, entry]) => ({
        label,
        value: entry?.value,
        unit: entry?.unit,
        origin: entry?.provenance?.origin
      }))
    ]),
    makeReportChapter("elemente_de_anvelopa", "Elemente de anvelopa", "Elementele prin care se calculeaza Hd, Hg, Hu si Ha.", envelope.elementRows.map(element => ({
      elementId: element.elementId,
      boundaryType: element.boundaryType,
      component: element.component,
      boundaryCorrectionFactor: element.boundaryCorrectionFactor,
      boundaryCorrectionOrigin: element.boundaryCorrectionOrigin,
      formulaCode: element.boundaryCorrectionFormulaCode ?? element.contributionFormulaCode
    }))),
    makeReportChapter("materiale_si_straturi", "Materiale si straturi", "Materiale, grosimi si conductivitati rezolvate din ansambluri.", assemblies.flatMap(assembly => assembly.layers.map(layer => ({
      assemblyId: assembly.assemblyId,
      assemblyName: assembly.displayName,
      ...layer
    })))),
    makeReportChapter("rezistente_termice", "Rezistente termice", "Rezistentele de strat, suprafata si ansamblu emise de calculul Chapter 2.", assemblies.map(assembly => ({
      assemblyId: assembly.assemblyId,
      totalResistance: assembly.totalResistance,
      totalResistanceUnit: assembly.totalResistanceUnit,
      rsi: assembly.rsi,
      rse: assembly.rse
    }))),
    makeReportChapter("coeficienti_u", "Coeficienti U", "Transmitantele termice calculate pentru ansamblurile folosite.", assemblies.map(assembly => ({
      assemblyId: assembly.assemblyId,
      uValue: assembly.uValue,
      unit: assembly.uValueUnit,
      origin: assembly.uValueOrigin,
      formulaCode: assembly.formulaCode
    }))),
    makeReportChapter("coeficienti_de_transfer_termic", "Coeficienti de transfer termic", "Hd, Hg, Hu, Ha si Htr citite din rezultatul de transmisie.", [
      ...envelope.components,
      { componentId: "Htr", amount: envelope.htr?.amount, unit: envelope.htr?.unit, origin: envelope.htr?.origin }
    ]),
    makeReportChapter("pierderi_prin_transmisie", "Pierderi prin transmisie", "Energii lunare de transmisie emise de motor.", monthly.map(row => ({
      month: row.month,
      heatingTransmissionKwh: row.heatingTransmissionKwh,
      coolingTransmissionKwh: row.coolingTransmissionKwh
    }))),
    makeReportChapter("pierderi_prin_ventilare", "Pierderi prin ventilare", "Transfer lunar prin ventilare emis de motor.", monthly.map(row => ({
      month: row.month,
      heatingVentilationKwh: row.heatingVentilationKwh,
      coolingVentilationKwh: row.coolingVentilationKwh,
      ventilationAirFlowRateM3PerS: row.ventilationAirFlowRateM3PerS
    }))),
    makeReportChapter("aporturi_interne", "Aporturi interne", "Aporturi interne lunare folosite in bilant.", monthly.map(row => ({
      month: row.month,
      internalGainsKwh: row.internalGainsKwh
    }))),
    makeReportChapter("aporturi_solare", "Aporturi solare", "Aporturi solare lunare si orientarea incidenta folosita.", monthly.map(row => ({
      month: row.month,
      solarOrientation: row.solarOrientation,
      solarGainsSource: row.solarGainsSource,
      solarGainsKwh: row.solarGainsKwh
    }))),
    makeReportChapter("calcul_lunar_incalzire", "Calcul lunar al necesarului de incalzire", "QHnd lunar emis de calculul util de incalzire.", monthly.map(row => ({
      month: row.month,
      qHndKwh: row.qHndKwh,
      formulaCode: row.qHndFormulaCode,
      origin: row.qHndOrigin
    }))),
    makeReportChapter("calcul_lunar_racire", "Calcul lunar al necesarului de racire", "QCnd lunar emis de calculul util de racire.", monthly.map(row => ({
      month: row.month,
      qCndKwh: row.qCndKwh,
      formulaCode: row.qCndFormulaCode,
      origin: row.qCndOrigin
    }))),
    makeReportChapter("rezultate_anuale", "Rezultate anuale", "Rezultate utile anuale separate. Nu se calculeaza energie finala, energie primara, CO2, CPE sau certificat.", [
      { label: "QHnd anual", value: chapter2.annualQHnd, unit: "kWh" },
      { label: "QCnd anual", value: chapter2.annualQCnd, unit: "kWh" },
      { label: "Numar luni", value: chapter2.monthCount }
    ]),
    makeReportChapter("ipoteze_si_confirmari", "Ipoteze si confirmari", "Ipotezele vizibile si confirmarile necesare inainte de calcul verificat.", [
      ...(buildingDna.assumptions ?? []).map(item => ({ label: "Assumption", value: item.text })),
      ...(buildingDna.missingConfirmations ?? []).map(item => ({ label: "Confirmation required", value: item }))
    ]),
    makeReportChapter("suprascrieri_ingineresti", "Suprascrieri ingineresti", "Override-uri upstream pastrate in Building DNA.", buildingDna.overrides ?? []),
    makeReportChapter("trasabilitate_matematica", "Trasabilitate matematica", "Formule simbolice, formule substituite si rezultate citite din modelul de trasabilitate.", formulas),
    makeReportChapter("referinte_normative", "Referinte normative", "Referinte MC001 raportate de motorul Chapter 2 validat.", traceability),
    makeReportChapter("anexa_tehnica_software_si_versiuni", "Anexa tehnica software si versiuni", "Identificatori tehnici si diagnostice pentru audit. Nu reprezinta continutul principal al raportului.", [
      { label: "Amprenta calcul", value: fingerprint.fingerprintId },
      { label: "Building DNA schema", value: fingerprint.inputs.buildingDnaSchema },
      { label: "Profil climatic", value: fingerprint.inputs.climateProfileId },
      { label: "Versiune profil climatic", value: fingerprint.inputs.climateProfileVersion },
      { label: "Adapter stage", value: fingerprint.inputs.adapterStage },
      { label: "Engine scope", value: fingerprint.inputs.engineScope },
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
      title: "Raport tehnic de calcul MC001-2022",
      source: "Building DNA si rezultate Chapter 2 validate",
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
