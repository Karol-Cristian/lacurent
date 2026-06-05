import type { NormalizedHomeInput } from "./schemas/NormalizedHomeInput";
import type { AiInsightCandidate } from "./schemas/AiInsightCandidate";
import type { ValidatedInsightCard } from "./schemas/ValidatedInsightCard";
import type { AiTraceableNumber } from "./schemas/AiCalculationEstimate";

export interface AiInsightContext {
  normalizedHome?: NormalizedHomeInput;
  physicsResult?: Record<string, unknown>;
  reportSnapshot?: Record<string, unknown>;
  scenarioResults?: Array<Record<string, unknown>>;
  mode: "owner" | "buyer";
}

function assumption(id: string, label: string, reason: string) {
  return {
    id,
    field: "insight",
    label,
    reason,
    confidence: "medium" as const,
    source: "rule_based_inference" as const,
    numericTruthSource: "not_numeric" as const
  };
}

function has(context: AiInsightContext, path: string): boolean {
  const roots: Record<string, unknown> = {
    normalizedHome: context.normalizedHome,
    physicsResult: context.physicsResult,
    reportSnapshot: context.reportSnapshot,
    scenarioResults: context.scenarioResults
  };
  const [root, ...parts] = path.split(".");
  let current = roots[root];
  for (const part of parts) {
    if (current === undefined || current === null) return false;
    current = (current as Record<string, unknown>)[part];
  }
  return current !== undefined && current !== null && current !== "";
}

function humanizeInput(path: string): string {
  return {
    "normalizedHome.envelope.roofOrAttic.insulationThicknessM": "grosimea izolatiei din pod/acoperis",
    "normalizedHome.systems.heating.distribution": "tipul distributiei incalzirii",
    "normalizedHome.systems.dhw.source": "sursa pentru apa calda menajera",
    "normalizedHome.geometry.usefulAreaM2": "suprafata utila",
    "normalizedHome.systems.heating.source": "sursa principala de incalzire",
    "normalizedHome.envelope.windows.type": "tipul ferestrelor",
    "physicsResult.heatLossTransmission": "pierderile prin transmisie",
    "physicsResult.heatLossVentilation": "pierderile prin ventilatie",
    "physicsResult.demandLayerV03.annual.heatingDemandKwhM2Year": "necesarul anual de incalzire pe metru patrat",
    "physicsResult.demandLayerV03.annual.heatingDemandKwhYear": "necesarul anual de incalzire",
    "reportSnapshot.realConsumption": "facturile sau consumul real"
  }[path] || path.replace(/^normalizedHome\./, "").replace(/^physicsResult\./, "").replace(/^reportSnapshot\./, "").replaceAll(".", " / ");
}

function numberMetric(label: string, value: number | undefined, unit: string, sourceType: AiTraceableNumber["sourceType"]): AiTraceableNumber | null {
  if (!Number.isFinite(value)) return null;
  return {
    value,
    unit,
    sourceType,
    confidence: sourceType === "deterministic_calculation" ? "high" : "medium",
    assumptions: [],
    validationNeeded: sourceType === "ai_estimate"
  };
}

function candidate(base: Omit<AiInsightCandidate, "assumptions" | "warnings" | "validationStatus">): AiInsightCandidate {
  return {
    ...base,
    assumptions: [assumption(`${base.id}.assumption`, "Propunere de analiza", "AI propune analiza, dar nu produce adevar numeric final.")],
    warnings: [],
    validationStatus: "proposed"
  };
}

export function generateAiInsightCandidates(context: AiInsightContext): AiInsightCandidate[] {
  const home = context.normalizedHome;
  const candidates: AiInsightCandidate[] = [];
  const missing = home?.missingData || [];
  const heatingSource = home?.systems?.heating?.source;
  const distribution = home?.systems?.heating?.distribution;
  const roofInsulation = home?.envelope?.roofOrAttic?.insulationThicknessM;
  const windowsType = home?.envelope?.windows?.type;
  const dhwSource = home?.systems?.dhw?.source;
  const hasPvRoof = home?.access?.hasRoofForPv !== false;
  const isApartment = home?.buildingType === "apartment";
  const isHouse = home?.buildingType === "house" || home?.buildingType === "duplex";
  const hasTransmissionAndVentilation = has(context, "physicsResult.heatLossTransmission") && has(context, "physicsResult.heatLossVentilation");
  const hasHeatingDemand = has(context, "physicsResult.demandLayerV03.annual.heatingDemandKwhM2Year") || has(context, "physicsResult.heatingDemandKwhM2Year");
  const hasRealConsumption = has(context, "reportSnapshot.realConsumption") || has(context, "reportSnapshot.realConsumptionSummary");

  if (hasTransmissionAndVentilation) {
    candidates.push(candidate({
      id: "ai.insight.envelope_vs_supplier",
      target: "report",
      type: "money_leak",
      title: "Factura mare pare mai degraba problema de anvelopa decat de furnizor",
      hypothesis: "Pierderile prin transmisie si ventilatie indica o problema fizica a locuintei, nu doar un pret mare la energie.",
      requiredInputs: ["physicsResult.heatLossTransmission", "physicsResult.heatLossVentilation"],
      relatedPhysicsOutputs: ["Htr", "Hve", "QH,nd"],
      suggestedCalculation: "compare Htr + Hve with final heating cost share",
      proposedPlacement: "report.after_money_breakdown",
      priority: "high",
      confidence: "medium",
      reason: "Ajuta utilizatorul sa separe problema fizica a casei de pretul energiei."
    }));
  }

  if (isHouse && (!roofInsulation || roofInsulation < 0.15)) {
    candidates.push(candidate({
      id: "ai.insight.attic_missing_data",
      target: "report",
      type: "missing_data",
      title: "Datele despre pod pot schimba verdictul",
      hypothesis: "Grosimea izolatiei podului poate schimba semnificativ pierderile estimate.",
      requiredInputs: ["normalizedHome.envelope.roofOrAttic.insulationThicknessM"],
      relatedPhysicsOutputs: ["roof U-value", "roof heat loss"],
      proposedPlacement: "report.after_verdict",
      priority: "high",
      confidence: roofInsulation ? "medium" : "low",
      reason: "Podul este frecvent o zona critica pentru case vechi."
    }));
  }

  if (isHouse && hasPvRoof) {
    candidates.push(candidate({
      id: "ai.insight.pv_not_root_cause",
      target: "report",
      type: "negative_recommendation",
      title: "PV poate reduce factura electrica, dar nu rezolva pierderile termice",
      hypothesis: "Panourile fotovoltaice nu reduc necesarul termic al cladirii.",
      requiredInputs: ["normalizedHome.buildingType"],
      relatedPhysicsOutputs: ["QH,nd", "final electricity"],
      proposedPlacement: "report.negative_recommendations",
      priority: "medium",
      confidence: "medium",
      reason: "Este o recomandare negativa utila ca utilizatorul sa nu confunde energia electrica cu pierderile termice."
    }));
  } else if (isApartment) {
    candidates.push(candidate({
      id: "ai.insight.apartment_pv_not_individual_first",
      target: "report",
      type: "negative_recommendation",
      title: "PV individual nu este de obicei primul pas pentru apartament",
      hypothesis: "Pentru apartamente, decizia PV depinde de acoperis comun, asociatie si consum electric, nu doar de locuinta individuala.",
      requiredInputs: ["normalizedHome.buildingType"],
      relatedPhysicsOutputs: ["final electricity"],
      proposedPlacement: "report.negative_recommendations",
      priority: "medium",
      confidence: "medium",
      reason: "Cardul evita o recomandare comerciala nepotrivita pentru un apartament."
    }));
  }

  if (heatingSource === "heat_pump" || (hasHeatingDemand && !distribution)) {
    candidates.push(candidate({
      id: "ai.insight.heat_pump_risk_before_envelope",
      target: "report",
      type: "risk",
      title: "Pompa de caldura poate fi riscanta inainte de reducerea necesarului",
      hypothesis: "Daca necesarul termic este mare sau distributia cere temperaturi ridicate, eficienta poate scadea.",
      requiredInputs: ["physicsResult.demandLayerV03.annual.heatingDemandKwhM2Year", "normalizedHome.systems.heating.distribution"],
      relatedPhysicsOutputs: ["QH,nd", "final energy", "system efficiency"],
      proposedPlacement: "report.risks",
      priority: "high",
      confidence: distribution ? "medium" : "low",
      reason: "Ajuta utilizatorul sa nu aleaga un generator inainte de a intelege cladirea."
    }));
  }

  if (has(context, "physicsResult.heatLossVentilation")) {
    candidates.push(candidate({
      id: "ai.insight.ventilation_hidden_loss",
      target: "report",
      type: "ventilation",
      title: "Ventilatia poate explica o parte din pierderi",
      hypothesis: "Locuinta poate pierde energie si prin aer schimbat necontrolat, nu doar prin elemente constructive.",
      requiredInputs: ["physicsResult.heatLossVentilation"],
      relatedPhysicsOutputs: ["Hve", "air changes", "ventilation heat loss"],
      suggestedCalculation: "compare Hve share against total heat transfer",
      proposedPlacement: "report.after_heating_breakdown",
      priority: "medium",
      confidence: context.physicsResult ? "medium" : "low",
      reason: "Cardul ajuta utilizatorul sa inteleaga pierderile invizibile prin infiltratii si aerisire."
    }));
  }

  if (heatingSource && heatingSource !== "unknown") {
    candidates.push(candidate({
      id: "ai.insight.controls_before_generator",
      target: "report",
      type: "automation",
      title: "Reglajele pot fi testate inaintea schimbarii generatorului",
      hypothesis: "Daca sistemul actual nu are control bun, termostatul si reglajele pot reduce risipa fara renovare majora.",
      requiredInputs: ["normalizedHome.systems.heating.source"],
      relatedPhysicsOutputs: ["systems layer", "control efficiency"],
      proposedPlacement: "report.low_risk_actions",
      priority: "medium",
      confidence: "medium",
      reason: "Este o analiza cu risc mic care nu promite economii exacte fara simulare."
    }));
  }

  if (!windowsType || ["unknown", "single", "old_double"].includes(windowsType)) {
    candidates.push(candidate({
      id: "ai.insight.windows_maybe_comfort_not_first_roi",
      target: "report",
      type: "comfort",
      title: "Ferestrele pot fi mai importante pentru confort decat pentru primul ROI",
      hypothesis: "Ferestrele vechi pot crea disconfort, dar investitia trebuie comparata cu alte pierderi inainte de prioritizare.",
      requiredInputs: ["normalizedHome.envelope.windows.type"],
      relatedPhysicsOutputs: ["window U-value", "window heat loss"],
      proposedPlacement: "report.comfort",
      priority: "medium",
      confidence: windowsType && windowsType !== "unknown" ? "medium" : "low",
      reason: "Cardul separa confortul de recuperarea investitiei, fara sa vanda automat ferestre noi."
    }));
  }

  if (!dhwSource || dhwSource === "unknown" || dhwSource === "electric_boiler" || dhwSource === "same_as_heating") {
    candidates.push(candidate({
      id: "ai.insight.dhw_can_change_system_choice",
      target: "report",
      type: "dhw",
      title: "Apa calda menajera poate schimba alegerea sistemului",
      hypothesis: "Daca ACM este produsa electric sau separat, scenariile de incalzire trebuie comparate impreuna cu apa calda.",
      requiredInputs: ["normalizedHome.systems.dhw.source"],
      relatedPhysicsOutputs: ["DHW demand", "final DHW energy"],
      proposedPlacement: "report.system_context",
      priority: "medium",
      confidence: dhwSource && dhwSource !== "unknown" ? "medium" : "low",
      reason: "In unele case, apa calda poate schimba costul real al unei solutii de incalzire."
    }));
  }

  if (!hasRealConsumption) {
    candidates.push(candidate({
      id: "ai.insight.real_bills_before_strong_ranking",
      target: "report",
      type: "missing_data",
      title: "Facturile reale pot schimba ordinea interventiilor",
      hypothesis: "Fara facturi reale, raportul poate estima fizic locuinta, dar prioritizarea financiara ramane partiala.",
      requiredInputs: ["reportSnapshot.realConsumption"],
      relatedPhysicsOutputs: ["confidence", "financial calibration"],
      proposedPlacement: "report.missing_data",
      priority: "high",
      confidence: "high",
      reason: "Facturile ajuta la diferentierea dintre pierderi fizice, comportament si preturi."
    }));
  }

  if (isApartment) {
    candidates.push(candidate({
      id: "ai.insight.apartment_position_matters",
      target: "report",
      type: "comparison",
      title: "La apartament conteaza mult pozitia in bloc",
      hypothesis: "Etajul, peretii exteriori si vecinii incalziti pot schimba pierderile fata de o casa individuala.",
      requiredInputs: ["normalizedHome.buildingType"],
      relatedPhysicsOutputs: ["apartment adjacency", "heated boundary conditions"],
      proposedPlacement: "report.apartment_context",
      priority: "high",
      confidence: "medium",
      reason: "Cardul schimba analiza de la logica de casa la logica de apartament."
    }));
  }

  if (heatingSource === "wood") {
    candidates.push(candidate({
      id: "ai.insight.wood_heating_comfort_and_effort",
      target: "report",
      type: "heating_source",
      title: "Incalzirea pe lemn trebuie analizata si prin confort, nu doar cost",
      hypothesis: "Costul combustibilului poate parea bun, dar alimentarea, randamentul si distributia caldurii pot schimba verdictul.",
      requiredInputs: ["normalizedHome.systems.heating.source"],
      relatedPhysicsOutputs: ["systems layer", "generation efficiency"],
      proposedPlacement: "report.system_context",
      priority: "medium",
      confidence: "medium",
      reason: "Cardul evita comparatia strict pe lei si introduce confortul operational."
    }));
  }

  candidates.push(candidate({
    id: "ai.insight.compare_heat_pump_emitters",
    target: "algorithms",
    type: "scenario",
    title: "Compara pompa de caldura + calorifere cu pompa de caldura + pardoseala",
    hypothesis: "Temperatura agentului termic poate schimba COP/SCOP si costul anual.",
    requiredInputs: ["normalizedHome.systems.heating.distribution", "physicsResult.demandLayerV03.annual.heatingDemandKwhYear"],
    relatedPhysicsOutputs: ["heating demand", "systems layer"],
    suggestedCalculation: "simulate heat pump SCOP by emitter temperature",
    proposedPlacement: "algorithms.scenario_lab",
    priority: "high",
    confidence: distribution ? "medium" : "low",
    reason: "Este una dintre deciziile cu risc tehnic mare daca se dimensioneaza gresit."
  }));

  candidates.push(candidate({
    id: "ai.insight.dhw_heat_pump_vs_boiler",
    target: "algorithms",
    type: "dhw",
    title: "Simuleaza ACM pe pompa de caldura vs boiler electric",
    hypothesis: "Apa calda menajera poate schimba consumul electric si dimensionarea sistemului.",
    requiredInputs: ["normalizedHome.systems.dhw.source", "normalizedHome.geometry.usefulAreaM2"],
    relatedPhysicsOutputs: ["DHW demand", "final DHW energy"],
    suggestedCalculation: "compare DHW final energy by system efficiency",
    proposedPlacement: "algorithms.scenario_lab",
    priority: "medium",
    confidence: "medium",
    reason: "ACM este separata de incalzire si poate schimba verdictul sistemelor."
  }));

  if (missing.length) {
    candidates.push(candidate({
      id: "ai.insight.questions_that_change_verdict",
      target: "algorithms",
      type: "missing_data",
      title: "Intrebari care pot schimba verdictul",
      hypothesis: "Unele date lipsa pot schimba ordinea scenariilor.",
      requiredInputs: missing,
      relatedPhysicsOutputs: ["confidence", "scenario ranking"],
      proposedPlacement: "algorithms.data_quality",
      priority: "high",
      confidence: "high",
      reason: "Algoritmi trebuie sa arate explicit ce date lipsesc inainte de prioritizari agresive."
    }));
  }

  return candidates;
}

export function validateInsightCandidate(candidate: AiInsightCandidate, context: AiInsightContext): ValidatedInsightCard {
  const missingPaths = candidate.requiredInputs.filter(input => !has(context, input));
  const missingData = missingPaths.map(humanizeInput);
  const hasDeterministic = candidate.relatedPhysicsOutputs.some(output =>
    ["Htr", "Hve", "QH,nd", "final energy", "DHW demand"].includes(output) && Boolean(context.physicsResult || context.reportSnapshot)
  );
  const status = missingPaths.length ? "needs_more_data" : "validated";
  const validatedBy = status === "validated"
    ? (hasDeterministic ? "physics_engine" : "rules_engine")
    : "ai_estimate_only";
  const stableForReport = candidate.target === "report" && status === "validated" && validatedBy !== "ai_estimate_only";
  const metric = numberMetric("Incredere", candidate.confidence === "high" ? 85 : candidate.confidence === "medium" ? 65 : 40, "%", "ai_estimate");

  return {
    id: `card.${candidate.id}`,
    sourceCandidateId: candidate.id,
    target: candidate.target,
    title: candidate.title,
    summary: candidate.hypothesis,
    category: candidate.type === "money_leak" ? "financial"
      : candidate.type === "negative_recommendation" ? "negative_recommendation"
        : candidate.type === "missing_data" ? "missing_data"
          : candidate.type === "scenario" ? "scenario"
            : candidate.type === "comfort" ? "comfort"
              : candidate.type === "risk" ? "risk"
      : "diagnosis",
    severity: candidate.priority === "urgent" ? "critical" : candidate.priority === "high" ? "high" : candidate.priority === "medium" ? "medium" : "low",
    priority: candidate.priority,
    metrics: metric ? [{ label: "Confidence", value: metric }] : [],
    explanation: missingPaths.length
      ? `${candidate.reason} Pentru validare mai buna lipsesc: ${missingData.join(", ")}.`
      : candidate.reason,
    assumptions: candidate.assumptions,
    missingData,
    warnings: candidate.warnings,
    display: {
      statusLabel: missingData.length ? "Necesita date" : hasDeterministic ? "Verificat" : "Ipoteza",
      stableForReport,
      experimental: candidate.target === "algorithms" || validatedBy === "ai_estimate_only"
    },
    validatedBy,
    confidence: missingData.length ? "low" : candidate.confidence
  };
}

export function generateValidatedInsightCards(context: AiInsightContext): ValidatedInsightCard[] {
  return generateAiInsightCandidates(context).map(candidate => validateInsightCandidate(candidate, context));
}
