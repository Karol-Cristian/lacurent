function isFiniteAmount(value) {
  return value !== null && value !== undefined && Number.isFinite(Number(value));
}

function number(value, digits = 4) {
  return isFiniteAmount(value) ? Number(value).toFixed(digits).replace(".", ",") : "--";
}

function value(valueToFormat, unit, digits = 4) {
  return `${number(valueToFormat, digits)}${unit ? ` ${unit}` : ""}`;
}

function line(lineId, text, resultValue, resultUnit, reference) {
  return {
    lineId,
    text,
    resultValue,
    resultUnit,
    reference,
    kind: "chapter_4_notebook_line"
  };
}

function section(sectionId, title, lines, localVariables = []) {
  return {
    sectionId,
    title,
    localVariables,
    lines
  };
}

function monthLines(system, month) {
  const suffix = month.month;
  return [
    line(
      `${system.systemId}.${suffix}.i_tilted`,
      `I_PV,${suffix} := ${number(month.horizontalIrradianceWPerM2, 4)} x ${number(month.correctionFactor, 4)} = ${value(month.tiltedIrradianceWPerM2, "W/m2", 4)}`,
      month.tiltedIrradianceWPerM2,
      "W/m2",
      "MC001-2022, Tabel 4.5"
    ),
    line(
      `${system.systemId}.${suffix}.electric`,
      `El,${suffix} := (1 / 1000) x 24 x ${number(month.daysInMonth, 0)} x ${number(month.totalCollectorAreaM2, 4)} x ${number(month.horizontalIrradianceWPerM2, 4)} x ${number(month.correctionFactor, 4)} x ${number(month.temperatureEfficiencyFactor, 4)} x ${number(month.inverterEfficiency, 4)} x ${number(month.collectorEfficiency, 4)}\n` +
        `       = ${value(month.electricEnergyKWh, "kWh", 4)}`,
      month.electricEnergyKWh,
      "kWh",
      "MC001_4_162_PV_MONTHLY_ELECTRIC_ENERGY"
    ),
    line(
      `${system.systemId}.${suffix}.incident`,
      `Einc,${suffix} := (${number(month.horizontalIrradianceWPerM2, 4)} x ${number(month.correctionFactor, 4)} x ${number(month.totalCollectorAreaM2, 4)} x 24 x ${number(month.daysInMonth, 0)}) / 1000\n` +
        `         = ${value(month.incidentEnergyKWh, "kWh", 4)}`,
      month.incidentEnergyKWh,
      "kWh",
      "MC001_4_164_PV_MONTHLY_INCIDENT_ENERGY"
    ),
    line(
      `${system.systemId}.${suffix}.capture`,
      `eta_captare,${suffix} := ${number(month.electricEnergyKWh, 4)} / ${number(month.incidentEnergyKWh, 4)} = ${value(month.captureEfficiency, "-", 4)}`,
      month.captureEfficiency,
      "-",
      "MC001_4_165_PV_MONTHLY_CAPTURE_EFFICIENCY"
    )
  ];
}
function photovoltaicSystemSections(system) {
  const variables = [
    { symbol: "Np", value: system.inputs?.panelCount, unit: "-", meaning: "numar panouri fotovoltaice" },
    { symbol: "Apanou", value: system.inputs?.panelAreaM2, unit: "m2", meaning: "suprafata echivalenta panou" },
    { symbol: "Pmax,1000", value: system.inputs?.maximumPowerWAt1000, unit: "W", meaning: "putere maxima la 1000 W/m2" },
    { symbol: "eta_inv", value: system.inputs?.inverterEfficiency, unit: "-", meaning: "randament invertor" },
    { symbol: "fcap", value: system.inputs?.correction?.mode, unit: "-", meaning: "factor corectie orientare/inclinare" },
    { symbol: "eta_t", value: system.inputs?.temperatureEfficiency?.mode, unit: "-", meaning: "randament temperatura" }
  ];
  const setupLines = [
    line(
      `${system.systemId}.area`,
      `Atot := ${number(system.inputs?.panelCount, 0)} x ${number(system.inputs?.panelAreaM2, 4)} = ${value(system.derived?.totalCollectorAreaM2, "m2", 4)}`,
      system.derived?.totalCollectorAreaM2,
      "m2",
      "MC001_4_160_PV_TOTAL_COLLECTOR_AREA"
    ),
    line(
      `${system.systemId}.efficiency`,
      `epsilon_PV := (${number(system.inputs?.maximumPowerWAt1000, 4)} / ${number(system.inputs?.panelAreaM2, 4)}) / ${number(system.inputs?.referenceIrradianceWPerM2, 4)} = ${value(system.derived?.collectorEfficiency, "-", 4)}`,
      system.derived?.collectorEfficiency,
      "-",
      "MC001_4_161_PV_COLLECTOR_EFFICIENCY"
    )
  ];
  const monthlyLines = (system.monthly ?? []).flatMap(month => monthLines(system, month));
  const annualLines = [
    line(
      `${system.systemId}.annual`,
      `Etot,PV := suma(El,i) = ${value(system.annual?.electricEnergyKWh, "kWh/an", 4)}`,
      system.annual?.electricEnergyKWh,
      "kWh/an",
      "MC001_4_163_PV_ANNUAL_ELECTRIC_ENERGY_SUM"
    )
  ];
  return section(
    `chapter4.photovoltaic.${system.systemId}`,
    `Chapter 4.5 - panouri fotovoltaice (${system.systemId})`,
    [...setupLines, ...monthlyLines, ...annualLines],
    variables
  );
}

export function buildChapter4NotebookSections(chapter4Result) {
  if (!chapter4Result || chapter4Result.status !== "calculated") {
    return [];
  }
  const systems = chapter4Result.photovoltaic?.systems ?? [];
  if (systems.length === 0) return [];
  const annual = chapter4Result.annual ?? {};
  return [
    section("chapter4.annual", "Chapter 4 - energie produsa din surse regenerabile", [
      line(
        "chapter4.annual.photovoltaic",
        `EPV,an := ${value(annual.photovoltaicElectricEnergyKWh, "kWh/an", 4)}`,
        annual.photovoltaicElectricEnergyKWh,
        "kWh/an",
        "MC001_4_163_PV_ANNUAL_ELECTRIC_ENERGY_SUM"
      )
    ]),
    ...systems.map(photovoltaicSystemSections)
  ];
}
