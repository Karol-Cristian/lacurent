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
    kind: "chapter_3_notebook_line"
  };
}

function section(sectionId, title, lines) {
  return {
    sectionId,
    title,
    lines
  };
}

function stageLine(monthId, service, stage) {
  const inputs = stage.inputEnergy.inputs;
  const recoveredAux = stage.inputEnergy.recoveredAuxiliaryKWh ?? 0;
  const recoveredLoss = stage.inputEnergy.recoveredLossKWh ?? 0;
  return line(
    `${monthId}.${service}.${stage.stageId}.input`,
    `Q_${service}_${stage.stageId},in,${monthId} := ${number(inputs.subsystemOutputKWh)} + ${number(inputs.subsystemLossKWh)} - ${number(recoveredAux)} - ${number(recoveredLoss)}\n` +
      `                              = ${value(stage.inputEnergy.valueKWh, "kWh")}`,
    stage.inputEnergy.valueKWh,
    "kWh",
    stage.inputEnergy.formulaId
  );
}

function monthlyServiceLines(month, serviceKey) {
  const service = month[serviceKey];
  if (!service) return [];
  const lines = [
    line(
      `${month.month}.${serviceKey}.useful`,
      `Q_${serviceKey},util,${month.month} := ${value(service.usefulDemandKWh, "kWh")} -- rezultat util furnizat explicit de lantul anterior`,
      service.usefulDemandKWh,
      "kWh",
      "MC001_CHAPTER_3_EXPLICIT_INPUT_BOUNDARY"
    ),
    ...service.stageResults.map(stage => stageLine(month.month, serviceKey, stage)),
    line(
      `${month.month}.${serviceKey}.final_stage`,
      `Q_${serviceKey},in,${month.month} := ${value(service.finalStageInputKWh, "kWh")}`,
      service.finalStageInputKWh,
      "kWh",
      "MC001_3_A_SUBSYSTEM_INPUT_ENERGY_BALANCE"
    )
  ];
  return lines;
}

export function buildChapter3NotebookSections(chapter3Result) {
  if (!chapter3Result || chapter3Result.status !== "calculated") {
    return [];
  }
  const annual = chapter3Result.annual ?? {};
  const annualLines = [
    line(
      "chapter3.annual.heating",
      `QH,sys,an := ${value(annual.heatingInputKWh, "kWh")}`,
      annual.heatingInputKWh,
      "kWh",
      "MC001_3_A_SUBSYSTEM_INPUT_ENERGY_BALANCE"
    ),
    line(
      "chapter3.annual.cooling",
      `QC,sys,an := ${value(annual.coolingInputKWh, "kWh")}`,
      annual.coolingInputKWh,
      "kWh",
      "MC001_3_A_SUBSYSTEM_INPUT_ENERGY_BALANCE"
    ),
    line(
      "chapter3.annual.dhw",
      `QW,sys,an := ${value(annual.dhwInputKWh, "kWh")}`,
      annual.dhwInputKWh,
      "kWh",
      "MC001_3_A_SUBSYSTEM_INPUT_ENERGY_BALANCE"
    ),
    line(
      "chapter3.annual.ventilation",
      `WV,aux,an := ${value(annual.ventilationAuxiliaryKWh, "kWh")}`,
      annual.ventilationAuxiliaryKWh,
      "kWh",
      "MC001_3_68_VENTILATION_AUXILIARY_TOTAL"
    ),
    line(
      "chapter3.annual.lighting",
      `WL,an := ${value(annual.lightingEnergyKWh, "kWh")}`,
      annual.lightingEnergyKWh,
      "kWh",
      "MC001_3_4_LIGHTING_EXPLICIT_INPUT_BOUNDARY"
    )
  ];

  const monthlySections = (chapter3Result.monthly ?? []).map(month =>
    section(`chapter3.month.${month.month}`, `Chapter 3 sisteme - ${month.month}`, [
      ...monthlyServiceLines(month, "heating"),
      ...monthlyServiceLines(month, "cooling"),
      ...monthlyServiceLines(month, "dhw"),
      ...(month.ventilation
        ? [
            line(
              `${month.month}.ventilation.aux`,
              `WV,aux,${month.month} := ${value(month.ventilation.valueKWh, "kWh")}`,
              month.ventilation.valueKWh,
              "kWh",
              "MC001_3_68_VENTILATION_AUXILIARY_TOTAL"
            )
          ]
        : []),
      line(
        `${month.month}.lighting`,
        `WL,${month.month} := ${value(month.lightingEnergyKWh, "kWh")} -- valoare lunara explicita sau rezultat SR EN 15193-1 furnizat`,
        month.lightingEnergyKWh,
        "kWh",
        "MC001_3_4_LIGHTING_EXPLICIT_INPUT_BOUNDARY"
      )
    ])
  );

  return [
    section("chapter3.annual", "Chapter 3 - totaluri sisteme", annualLines),
    ...monthlySections
  ];
}
