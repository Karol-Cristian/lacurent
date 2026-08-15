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

function systemLines(monthId, serviceKey, system) {
  return [
    line(
      `${monthId}.${serviceKey}.${system.systemId}.allocation`,
      `Q_${serviceKey},util,${system.systemId},${monthId} := ${value(system.allocatedUsefulDemandKWh, "kWh")} (f=${number(system.allocationFraction, 4)})`,
      system.allocatedUsefulDemandKWh,
      "kWh",
      "MC001_CHAPTER_3_EXPLICIT_PARALLEL_SYSTEM_ALLOCATION"
    ),
    ...(system.stageResults ?? []).map(stage =>
      stageLine(monthId, `${serviceKey}_${system.systemId}`, stage)
    ),
    line(
      `${monthId}.${serviceKey}.${system.systemId}.final_stage`,
      `Q_${serviceKey},in,${system.systemId},${monthId} := ${value(system.finalStageInputKWh, "kWh")}`,
      system.finalStageInputKWh,
      "kWh",
      "MC001_3_A_SUBSYSTEM_INPUT_ENERGY_BALANCE"
    )
  ];
}

function sourceLabel(source) {
  if (!source) return "sursa nedeclarata";
  if (source.classification === "NUMERICALLY_IMPLEMENTED") return "calculat normativ";
  if (source.classification === "PROCEDURALLY_IMPLEMENTED") return "procedural normativ";
  if (source.classification === "EXPLICIT_INPUT_BOUNDARY") return "input tehnic explicit";
  if (source.classification === "EXTERNAL_STANDARD_BLOCKED") return "standard extern";
  return source.classification ?? "sursa nedeclarata";
}

function sourceReference(source, fallback) {
  return source?.formulaIds?.[source.formulaIds.length - 1] ?? fallback;
}

function monthlyServiceLines(month, serviceKey) {
  const service = month[serviceKey];
  if (!service) return [];
  const parallelSystemLines = (service.systemResults?.length ?? 0) > 1
    ? service.systemResults.flatMap(system => systemLines(month.month, serviceKey, system))
    : [];
  const lines = [
    line(
      `${month.month}.${serviceKey}.useful`,
      `Q_${serviceKey},util,${month.month} := ${value(service.usefulDemandKWh, "kWh")} -- ${sourceLabel(service.usefulDemandSource)}`,
      service.usefulDemandKWh,
      "kWh",
      sourceReference(service.usefulDemandSource, "MC001_CHAPTER_3_INPUT_BOUNDARY")
    ),
    ...parallelSystemLines,
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
    ...(monthHasPcmStorage(chapter3Result)
      ? [
          line(
            "chapter3.annual.pcm_sensible",
            `ΔQC,sto,senssld,an := ${value(annual.pcmSensibleSolidStorageEnergyKWh, "kWh")}`,
            annual.pcmSensibleSolidStorageEnergyKWh,
            "kWh",
            "MC001_3_111_COOLING_STORAGE_PCM_SENSIBLE_SOLID_STORAGE_ENERGY"
          ),
          line(
            "chapter3.annual.pcm_limit",
            `ΔQC,sto,limit,an := ${value(annual.pcmInputEnergyLimitKWh, "kWh")}`,
            annual.pcmInputEnergyLimitKWh,
            "kWh",
            "MC001_3_112_COOLING_STORAGE_PCM_INPUT_ENERGY_LIMIT"
          ),
          line(
            "chapter3.annual.pcm_mass_decrease",
            `ΔmC,sto,sld,an := ${value(annual.pcmSolidMassDecreaseKg, "kg")}`,
            annual.pcmSolidMassDecreaseKg,
            "kg",
            "MC001_3_113_COOLING_STORAGE_PCM_SOLID_MASS_DECREASE_VARIATION"
          )
        ]
      : []),
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
      ...(month.coolingStoragePcm
        ? [
            line(
              `${month.month}.pcm.sensible`,
              `ΔQC,sto,senssld,${month.month} := ${value(month.coolingStoragePcm.sensibleStorage.valueKWh, "kWh")}`,
              month.coolingStoragePcm.sensibleStorage.valueKWh,
              "kWh",
              month.coolingStoragePcm.sensibleStorage.formulaId
            ),
            line(
              `${month.month}.pcm.limit`,
              `ΔQC,sto,limit,${month.month} := ${value(month.coolingStoragePcm.inputLimit.valueKWh, "kWh")}`,
              month.coolingStoragePcm.inputLimit.valueKWh,
              "kWh",
              month.coolingStoragePcm.inputLimit.formulaId
            ),
            line(
              `${month.month}.pcm.mass_decrease`,
              `ΔmC,sto,sld,${month.month} := ${value(month.coolingStoragePcm.solidMassDecrease.valueKg, "kg")}`,
              month.coolingStoragePcm.solidMassDecrease.valueKg,
              "kg",
              month.coolingStoragePcm.solidMassDecrease.formulaId
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

function monthHasPcmStorage(chapter3Result) {
  return (chapter3Result.monthly ?? []).some(month => month.coolingStoragePcm);
}
