import type { EnergyProfile } from "./energyProfile";

export interface EnergyReport {
  profile: EnergyProfile;
  visibleSections: [
    "score",
    "main_conclusion",
    "energy_class",
    "cost_summary",
    "top_problems",
    "recommendations",
    "confidence",
    "technical_details"
  ];
}
