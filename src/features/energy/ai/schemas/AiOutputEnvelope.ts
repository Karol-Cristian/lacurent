import type { AiAssumption, AiConfidence } from "./AiAssumption";

export type AiOutputStatus = "ok" | "needs_more_data" | "cannot_determine";

export interface AiOutputEnvelope<TResult> {
  status: AiOutputStatus;
  confidence: AiConfidence;
  assumptions: AiAssumption[];
  missingData: string[];
  warnings: string[];
  result: TResult;
}
