import type { NormalizedHomeInput } from "./schemas/NormalizedHomeInput";
import type { AiScenarioSuggestion } from "./schemas/AiScenarioSuggestion";

export function generateScenarioSuggestions(input: NormalizedHomeInput): AiScenarioSuggestion[] {
  const suggestions: AiScenarioSuggestion[] = [];
  const assumptions = input.assumptions || [];
  const roofInsulation = input.envelope?.roofOrAttic?.insulationThicknessM;
  const wallInsulation = input.envelope?.walls?.insulationThicknessM;
  const windows = input.envelope?.windows?.type;
  const heatingSource = input.systems?.heating?.source;
  const distribution = input.systems?.heating?.distribution;

  if (input.buildingType !== "apartment" && (!roofInsulation || roofInsulation < 0.15)) {
    suggestions.push({
      id: "ai.scenario.roof_insulation_first",
      title: "Izolare pod/acoperis ca prim scenariu",
      category: "insulation",
      whyRelevant: "AI-ul observa ca locuinta este casa si izolatia podului lipseste sau pare slaba.",
      affectedEnergyUses: ["heating", "comfort"],
      prerequisites: ["acces fizic la pod/acoperis"],
      solvesRootCause: true,
      requiredData: ["suprafata pod/acoperis", "grosime izolatie existenta", "acces pod"],
      blockedByMissingData: roofInsulation ? [] : ["grosime izolatie pod/acoperis"],
      suggestedNextStep: "Ruleaza scenariu fizic cu U acoperis imbunatatit, apoi compara costul anual estimat.",
      confidence: roofInsulation ? "medium" : "low",
      assumptions,
      verdict: roofInsulation ? "strong_candidate" : "needs_more_data",
      numericTruthPolicy: "no_final_numbers_from_ai"
    });
  }

  if (!wallInsulation || wallInsulation < 0.1) {
    suggestions.push({
      id: "ai.scenario.wall_insulation",
      title: "Scenariu de izolare pereti exteriori",
      category: "insulation",
      whyRelevant: "Izolatia peretilor este absenta, necunoscuta sau sub nivelul unei renovari moderne.",
      affectedEnergyUses: ["heating", "comfort"],
      prerequisites: ["material pereti confirmat", "arie pereti estimata"],
      solvesRootCause: true,
      requiredData: ["arie pereti", "material pereti", "grosime izolatie existenta"],
      blockedByMissingData: input.envelope?.walls?.material ? [] : ["material pereti"],
      suggestedNextStep: "Simuleaza reducerea transmitantei peretilor in Physics Engine.",
      confidence: input.envelope?.walls?.material ? "medium" : "low",
      assumptions,
      verdict: input.envelope?.walls?.material ? "worth_analyzing_first" : "needs_more_data",
      numericTruthPolicy: "no_final_numbers_from_ai"
    });
  }

  if (windows === "single" || windows === "old_double" || windows === "unknown") {
    suggestions.push({
      id: "ai.scenario.window_replacement",
      title: "Scenariu ferestre mai eficiente",
      category: "windows",
      whyRelevant: "Tipul ferestrelor poate contribui la pierderi si la disconfort.",
      affectedEnergyUses: ["heating", "cooling", "comfort", "ventilation"],
      prerequisites: ["arie ferestre", "strategie ventilatie dupa inlocuire"],
      solvesRootCause: true,
      requiredData: ["tip ferestre", "arie ferestre aproximativa"],
      blockedByMissingData: windows === "unknown" ? ["tip ferestre"] : [],
      suggestedNextStep: "Compara U fereastra actual cu un preset de fereastra moderna.",
      confidence: windows && windows !== "unknown" ? "medium" : "low",
      assumptions,
      verdict: windows === "unknown" ? "needs_more_data" : "worth_after_prerequisites",
      numericTruthPolicy: "no_final_numbers_from_ai"
    });
  }

  if (heatingSource === "heat_pump" || heatingSource === "electricity" || heatingSource === "gas" || heatingSource === "wood") {
    suggestions.push({
      id: "ai.scenario.heating_system_check",
      title: "Scenariu pentru sistemul de incalzire",
      category: "heating",
      whyRelevant: "Sistemul de incalzire trebuie evaluat dupa necesarul termic al cladirii, nu izolat.",
      affectedEnergyUses: ["heating", "dhw"],
      prerequisites: ["necesar termic stabil", "distributie interioara confirmata"],
      solvesRootCause: false,
      requiredData: ["sursa incalzire", "distributie", "temperatura agent termic daca exista"],
      blockedByMissingData: distribution ? [] : ["distributie incalzire"],
      suggestedNextStep: "Ruleaza scenariul in Systems Layer dupa ce demand-ul cladirii este stabil.",
      confidence: distribution ? "medium" : "low",
      assumptions,
      verdict: distribution ? "worth_after_prerequisites" : "needs_more_data",
      numericTruthPolicy: "no_final_numbers_from_ai"
    });
  }

  if (input.buildingType !== "apartment" && input.access?.hasRoofForPv !== false) {
    suggestions.push({
      id: "ai.scenario.pv_after_loads",
      title: "PV doar dupa clarificarea consumurilor",
      category: "renewables",
      whyRelevant: "PV poate reduce energie electrica cumparata, dar nu reduce pierderile termice ale cladirii.",
      affectedEnergyUses: ["electricity"],
      prerequisites: ["acoperis potrivit", "consum electric anual", "profil de autoconsum"],
      solvesRootCause: false,
      requiredData: ["orientare acoperis", "consum electric anual", "putere disponibila"],
      blockedByMissingData: ["consum electric anual"],
      suggestedNextStep: "Calculeaza separat autoconsum si impact financiar dupa facturi reale.",
      confidence: "low",
      assumptions,
      verdict: "worth_after_prerequisites",
      numericTruthPolicy: "no_final_numbers_from_ai"
    });
  }

  return suggestions;
}
