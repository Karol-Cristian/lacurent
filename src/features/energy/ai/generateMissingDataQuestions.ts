import type { NormalizedHomeInput } from "./schemas/NormalizedHomeInput";

export interface MissingDataQuestion {
  id: string;
  field: string;
  question: string;
  reason: string;
  answerType: "number" | "single_choice" | "text" | "yes_no";
  options?: string[];
  priority: "low" | "medium" | "high";
  affects: Array<"geometry" | "envelope" | "systems" | "demand" | "confidence" | "scenarios">;
}

export function generateMissingDataQuestions(input: NormalizedHomeInput): MissingDataQuestion[] {
  const questions: MissingDataQuestion[] = [];

  if (!input.geometry?.usefulAreaM2) {
    questions.push({
      id: "missing.useful_area",
      field: "geometry.usefulAreaM2",
      question: "Care este suprafata utila aproximativa a locuintei?",
      reason: "Suprafata este baza pentru indicatorii pe metru patrat si pentru estimarea volumului.",
      answerType: "number",
      priority: "high",
      affects: ["geometry", "demand", "confidence"]
    });
  }

  if (!input.envelope?.walls?.material) {
    questions.push({
      id: "missing.wall_material",
      field: "envelope.walls.material",
      question: "Din ce sunt construiti peretii exteriori?",
      reason: "Materialul peretilor influenteaza rezistenta termica si pierderile prin transmisie.",
      answerType: "single_choice",
      options: ["caramida", "BCA", "beton", "piatra", "lemn", "nu stiu"],
      priority: "high",
      affects: ["envelope", "demand", "confidence"]
    });
  }

  if (!input.envelope?.walls?.insulationThicknessM) {
    questions.push({
      id: "missing.wall_insulation",
      field: "envelope.walls.insulationThicknessM",
      question: "Exista izolatie pe peretii exteriori? Daca da, cati centimetri?",
      reason: "Grosimea izolatiei schimba direct U-value-ul peretilor.",
      answerType: "number",
      priority: "high",
      affects: ["envelope", "demand", "confidence", "scenarios"]
    });
  }

  if (!input.envelope?.roofOrAttic?.insulationThicknessM && input.buildingType !== "apartment") {
    questions.push({
      id: "missing.roof_attic_insulation",
      field: "envelope.roofOrAttic.insulationThicknessM",
      question: "Podul sau acoperisul este izolat? Aproximativ cati centimetri?",
      reason: "Pentru case, podul/acoperisul este adesea una dintre cele mai importante zone de pierdere.",
      answerType: "number",
      priority: "high",
      affects: ["envelope", "demand", "confidence", "scenarios"]
    });
  }

  if (!input.envelope?.windows?.type || input.envelope.windows.type === "unknown") {
    questions.push({
      id: "missing.windows",
      field: "envelope.windows.type",
      question: "Ce tip de ferestre are locuinta?",
      reason: "Ferestrele influenteaza pierderile, confortul si scenariile de inlocuire.",
      answerType: "single_choice",
      options: ["geam simplu", "termopan vechi", "termopan modern", "tripan", "nu stiu"],
      priority: "medium",
      affects: ["envelope", "demand", "confidence", "scenarios"]
    });
  }

  if (!input.systems?.heating?.source || input.systems.heating.source === "unknown") {
    questions.push({
      id: "missing.heating_source",
      field: "systems.heating.source",
      question: "Care este sursa principala de incalzire?",
      reason: "Sistemul de incalzire transforma necesarul termic in energie finala consumata.",
      answerType: "single_choice",
      options: ["lemn", "gaz", "curent electric", "pompa de caldura", "peleti", "termoficare", "mixt"],
      priority: "high",
      affects: ["systems", "confidence", "scenarios"]
    });
  }

  if (!input.access?.hasThreePhaseElectricity && input.systems?.heating?.source === "heat_pump") {
    questions.push({
      id: "missing.three_phase",
      field: "access.hasThreePhaseElectricity",
      question: "Locuinta are curent trifazic sau posibilitate de upgrade electric?",
      reason: "Pentru scenarii cu pompa de caldura, accesul electric poate limita solutia tehnica.",
      answerType: "yes_no",
      priority: "medium",
      affects: ["systems", "scenarios"]
    });
  }

  return questions;
}
