import type { AiScenarioSuggestion } from "./schemas/AiScenarioSuggestion";
import type { AiExplanation } from "./schemas/AiExplanation";

interface ScenarioVerdictInput {
  id?: string;
  title: string;
  verdict?: string;
  category?: string;
  blockedByMissingData?: string[];
  confidence?: "low" | "medium" | "high";
  whyRelevant?: string;
}

export function explainScenarioVerdict(input: AiScenarioSuggestion | ScenarioVerdictInput): AiExplanation {
  const blocked = input.blockedByMissingData || [];
  const confidence = input.confidence || (blocked.length ? "low" : "medium");
  const verdict = input.verdict || (blocked.length ? "Necesita date suplimentare" : "Merita analizat in modelul fizic");
  const reason = input.whyRelevant || "Scenariul este relevant pentru ca atinge o zona care poate modifica performanta energetica.";
  const assumptions = (input as Partial<AiScenarioSuggestion>).assumptions || [];

  return {
    id: `ai.explain.scenario.${input.id || input.title.toLowerCase().replace(/[^a-z0-9]+/g, "_")}`,
    type: "scenario_verdict",
    title: verdict,
    message: blocked.length
      ? `${reason} Inainte de cifre finale lipsesc: ${blocked.join(", ")}.`
      : `${reason} Urmatorul pas este simularea in Physics Engine; AI-ul nu stabileste economia finala.`,
    confidence,
    basedOn: ["AiScenarioSuggestion", "NormalizedHomeInput"],
    assumptions,
    numericTruthPolicy: "physics_engine_is_source_of_truth"
  };
}
