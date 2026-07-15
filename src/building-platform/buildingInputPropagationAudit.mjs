function valueAt(object, path) {
  return path.split(".").reduce((current, segment) => current?.[segment], object);
}

function stableString(value) {
  return JSON.stringify(value ?? null);
}

function changed(before, after) {
  return stableString(before) !== stableString(after);
}

function assemblyByRole(buildingDna, role) {
  return buildingDna?.assemblies?.find((assembly) => assembly.assemblyRole === role) ?? null;
}

function assemblyResult(calculation, assemblyId) {
  return calculation?.assemblyResult?.assemblyResults?.find((assembly) => assembly.assemblyId === assemblyId) ?? null;
}

function htr(calculation) {
  return calculation?.envelopeTransmissionResult?.result?.amount ?? null;
}

function hd(calculation) {
  return calculation?.envelopeTransmissionResult?.components?.Hd?.amount ?? null;
}

function annualQHnd(calculation) {
  return calculation?.chapter2Result?.result?.annualQHnd ?? null;
}

function annualQCnd(calculation) {
  return calculation?.chapter2Result?.result?.annualQCnd ?? null;
}

function fingerprint(workspace) {
  return workspace?.calculationFingerprint?.fingerprintId ?? workspace?.report?.calculationFingerprint?.fingerprintId ?? null;
}

function monthlySolar(buildingDna, month = "january") {
  return buildingDna?.monthlyProfiles?.find((profile) => profile.month === month)?.heatGains?.solarGains?.amount ?? null;
}

function allMonthlySolar(buildingDna) {
  return (buildingDna?.monthlyProfiles ?? []).map((profile) => ({
    month: profile.month,
    solarGainsKwh: profile.heatGains?.solarGains?.amount ?? null,
    solarOrientation: profile.heatGains?.solarOrientation ?? null,
    solarGainsSource: profile.heatGains?.solarGainsSource ?? null
  }));
}

function firstMonthResult(calculation) {
  return calculation?.chapter2Result?.result?.monthlyResults?.[0] ?? null;
}

function diffField(path, before, after) {
  const beforeValue = valueAt(before, path);
  const afterValue = valueAt(after, path);
  return changed(beforeValue, afterValue)
    ? { path, before: beforeValue ?? null, after: afterValue ?? null }
    : null;
}

export function buildBuildingInputPropagationDiff(before = {}, after = {}) {
  const beforeDna = before.buildingDna;
  const afterDna = after.buildingDna;
  const beforeCalculation = before.calculation;
  const afterCalculation = after.calculation;
  const beforeWall = assemblyByRole(beforeDna, "exterior_wall");
  const afterWall = assemblyByRole(afterDna, "exterior_wall");
  const beforeWallResult = assemblyResult(beforeCalculation, beforeWall?.assemblyId);
  const afterWallResult = assemblyResult(afterCalculation, afterWall?.assemblyId);
  const beforeMonth = firstMonthResult(beforeCalculation);
  const afterMonth = firstMonthResult(afterCalculation);
  const dnaFields = [
    "building.structuralSystem",
    "buildingSpecificParameters.mainOrientation.value",
    "buildingSpecificParameters.windowOrientation.value",
    "buildingSpecificParameters.exteriorWallAreaM2.value",
    "buildingSpecificParameters.windowAreaM2.value",
    "climateProfile.profileId"
  ].map((path) => diffField(path, beforeDna, afterDna)).filter(Boolean);
  const assemblyChanges = [];
  if (changed(beforeWall?.assemblyId, afterWall?.assemblyId)) {
    assemblyChanges.push({
      path: "assemblies.exterior_wall.assemblyId",
      before: beforeWall?.assemblyId ?? null,
      after: afterWall?.assemblyId ?? null
    });
  }
  if (changed(beforeWall?.layers?.map((layer) => layer.materialId), afterWall?.layers?.map((layer) => layer.materialId))) {
    assemblyChanges.push({
      path: "assemblies.exterior_wall.materialIds",
      before: beforeWall?.layers?.map((layer) => layer.materialId) ?? [],
      after: afterWall?.layers?.map((layer) => layer.materialId) ?? []
    });
  }
  if (changed(beforeWall?.layers?.map((layer) => layer.thickness.amount), afterWall?.layers?.map((layer) => layer.thickness.amount))) {
    assemblyChanges.push({
      path: "assemblies.exterior_wall.layerThicknessM",
      before: beforeWall?.layers?.map((layer) => layer.thickness.amount) ?? [],
      after: afterWall?.layers?.map((layer) => layer.thickness.amount) ?? []
    });
  }

  const engineChanges = [
    ["assembly.exterior_wall.uValue", beforeWallResult?.uValue, afterWallResult?.uValue],
    ["envelope.Hd", hd(beforeCalculation), hd(afterCalculation)],
    ["envelope.Htr", htr(beforeCalculation), htr(afterCalculation)],
    ["monthly.january.solarGains", monthlySolar(beforeDna, "january"), monthlySolar(afterDna, "january")],
    ["monthly.first.qHnd", beforeMonth?.heating?.qHnd ?? null, afterMonth?.heating?.qHnd ?? null],
    ["monthly.first.qCnd", beforeMonth?.cooling?.qCnd ?? null, afterMonth?.cooling?.qCnd ?? null],
    ["annualQHnd", annualQHnd(beforeCalculation), annualQHnd(afterCalculation)],
    ["annualQCnd", annualQCnd(beforeCalculation), annualQCnd(afterCalculation)]
  ]
    .filter(([, beforeValue, afterValue]) => changed(beforeValue, afterValue))
    .map(([path, beforeValue, afterValue]) => ({ path, before: beforeValue, after: afterValue }));

  return {
    status: "ready",
    changed: dnaFields.length + assemblyChanges.length + engineChanges.length > 0,
    dnaFields,
    assemblyChanges,
    engineChanges,
    diagnostics: engineChanges.length === 0 && assemblyChanges.length === 0
      ? [{ code: "no_downstream_calculation_change_detected", severity: "warning" }]
      : []
  };
}

export function buildOrientationComparisonTable(runs = []) {
  return runs.map((run) => {
    const buildingDna = run.buildingDna;
    const calculation = run.calculation;
    const monthlySolarGains = allMonthlySolar(buildingDna);
    return {
      orientation: run.orientation ?? buildingDna?.monthlyProfiles?.[0]?.heatGains?.solarOrientation ?? null,
      finalAzimuth: buildingDna?.monthlyProfiles?.[0]?.heatGains?.solarOrientation ?? null,
      monthlySolarGainsKwh: monthlySolarGains,
      annualSolarGainsKwh: monthlySolarGains.reduce((sum, month) => sum + (month.solarGainsKwh ?? 0), 0),
      htr: htr(calculation),
      annualQHnd: annualQHnd(calculation),
      annualQCnd: annualQCnd(calculation),
      calculationFingerprint: fingerprint(run.workspace),
      status: calculation?.status ?? null
    };
  });
}
