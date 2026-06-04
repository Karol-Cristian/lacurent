import type { AiAssumption, AiConfidence } from "./AiAssumption";

export type AiExplanationType =
  | "report_summary"
  | "missing_data"
  | "scenario_verdict"
  | "assumption"
  | "data_quality";

export interface AiExplanation {
  id: string;
  type: AiExplanationType;
  title: string;
  message: string;
  confidence: AiConfidence;
  basedOn: string[];
  assumptions: AiAssumption[];
  numericTruthPolicy: "physics_engine_is_source_of_truth";
}
