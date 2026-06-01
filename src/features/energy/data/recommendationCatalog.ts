import type { EnergyRecommendation } from "../schema/recommendations";

export const recommendationCatalog: EnergyRecommendation[] = [
  {
    id: "insulate_roof",
    title: "Izolează podul sau acoperișul",
    category: "insulation",
    priority: "high",
    costLevel: "medium",
    impactLevel: "high",
    reason: "Podul sau acoperișul este o zonă frecventă de pierdere a căldurii.",
    action: "Verifică izolația podului și adaugă strat suplimentar unde lipsește.",
    userFacingExplanation: "Casa poate pierde multă căldură prin pod. Izolarea lui este de obicei una dintre cele mai bune prime măsuri.",
    triggeredBy: ["roof"]
  },
  {
    id: "add_thermostat",
    title: "Adaugă un termostat",
    category: "controls",
    priority: "high",
    costLevel: "low",
    impactLevel: "medium",
    reason: "Fără control bun al temperaturii, încălzirea merge mai mult decât este necesar.",
    action: "Instalează un termostat simplu sau smart.",
    userFacingExplanation: "Un termostat te ajută să eviți consumul inutil când nu ai nevoie de aceeași temperatură.",
    triggeredBy: ["thermostat"]
  }
];
