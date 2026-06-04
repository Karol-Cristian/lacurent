import type { EnergyProfile } from "../schema/energyProfile";
import type { AiExplanation } from "./schemas/AiExplanation";

interface ReportLikeSnapshot {
  energyScore?: number;
  estimatedEnergyClass?: string;
  mainConclusion?: string;
  shortExplanation?: string;
  confidenceLevel?: "low" | "medium" | "high";
  topProblems?: Array<{ title?: string; explanation?: string; severity?: string; area?: string }>;
  missingData?: string[];
}

export function explainReportFindings(input: EnergyProfile | ReportLikeSnapshot): AiExplanation[] {
  const profile = "assessment" in input ? input : null;
  const snapshot = profile
    ? {
        energyScore: profile.assessment.score,
        estimatedEnergyClass: profile.assessment.estimatedEnergyClass,
        mainConclusion: profile.assessment.mainConclusion,
        shortExplanation: profile.assessment.shortExplanation,
        confidenceLevel: profile.assessment.confidence.level,
        topProblems: profile.assessment.topProblems,
        missingData: profile.assessment.confidence.missingData
      }
    : input;

  const problems = snapshot.topProblems || [];
  const missingData = snapshot.missingData || [];
  const explanations: AiExplanation[] = [];

  explanations.push({
    id: "ai.explain.report_summary",
    type: "report_summary",
    title: "Ce inseamna raportul",
    message: snapshot.shortExplanation || snapshot.mainConclusion || "Raportul sintetizeaza datele introduse si rezultatele calculate de motorul energetic.",
    confidence: snapshot.confidenceLevel || "medium",
    basedOn: ["EnergyAssessment", "ReportSnapshot"],
    assumptions: [],
    numericTruthPolicy: "physics_engine_is_source_of_truth"
  });

  if (problems.length) {
    const mainProblems = problems.slice(0, 3).map(problem => problem.title || problem.area || "problema energetica").join(", ");
    explanations.push({
      id: "ai.explain.main_problems",
      type: "report_summary",
      title: "Unde pare sa fie problema principala",
      message: `Cele mai importante semnale sunt: ${mainProblems}. AI-ul doar formuleaza explicatia; severitatea vine din analiza structurata.`,
      confidence: snapshot.confidenceLevel || "medium",
      basedOn: ["EnergyProblem[]"],
      assumptions: [],
      numericTruthPolicy: "physics_engine_is_source_of_truth"
    });
  }

  if (missingData.length) {
    explanations.push({
      id: "ai.explain.missing_data",
      type: "missing_data",
      title: "Ce ar creste increderea raportului",
      message: `Pentru o evaluare mai stabila lipsesc: ${missingData.slice(0, 5).join(", ")}.`,
      confidence: "high",
      basedOn: ["AssessmentConfidence.missingData"],
      assumptions: [],
      numericTruthPolicy: "physics_engine_is_source_of_truth"
    });
  }

  return explanations;
}
