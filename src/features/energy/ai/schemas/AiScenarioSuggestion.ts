import type { AiAssumption, AiConfidence } from "./AiAssumption";

export type AiScenarioCategory =
  | "insulation"
  | "windows"
  | "heating"
  | "controls"
  | "ventilation"
  | "renewables"
  | "data_quality";

export interface AiScenarioSuggestion {
  id: string;
  title: string;
  category: AiScenarioCategory;
  whyRelevant: string;
  affectedEnergyUses?: string[];
  prerequisites?: string[];
  solvesRootCause?: boolean;
  requiredData: string[];
  blockedByMissingData: string[];
  suggestedNextStep: string;
  confidence: AiConfidence;
  assumptions: AiAssumption[];
  verdict?:
    | "worth_analyzing_first"
    | "worth_after_prerequisites"
    | "good_for_comfort_not_roi"
    | "technically_possible_but_risky"
    | "not_recommended_now"
    | "needs_more_data"
    | "poor_roi"
    | "long_payback"
    | "strong_candidate";
  numericTruthPolicy: "no_final_numbers_from_ai";
}
