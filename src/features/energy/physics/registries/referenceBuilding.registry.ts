import type { ReferenceBuilding } from "../model/ReferenceBuilding";

export const REFERENCE_BUILDING_REGISTRY: Record<string, Omit<ReferenceBuilding, "id" | "basedOnBuildingId">> = {
  single_family_house: {
    buildingCategory: "single_family_house",
    envelopeReferenceValues: {
      wallUValue: 0.35,
      roofUValue: 0.25,
      floorUValue: 0.35,
      windowUValue: 1.3,
      doorUValue: 1.7
    },
    systemReferenceValues: {
      heatingSystemEfficiency: 0.9,
      dhwSystemEfficiency: 0.85,
      coolingEfficiency: 3.1,
      ventilationHeatRecoveryEfficiency: 0
    },
    renewableShareRequirementPercent: 0,
    source: "internal_reference",
    confidence: "low",
    assumptions: ["Cladire de referinta interna LaCurent, nu prag oficial MC001."]
  },
  apartment: {
    buildingCategory: "apartment",
    envelopeReferenceValues: {
      wallUValue: 0.35,
      roofUValue: 0.25,
      floorUValue: 0.35,
      windowUValue: 1.3,
      doorUValue: 1.7
    },
    systemReferenceValues: {
      heatingSystemEfficiency: 0.9,
      dhwSystemEfficiency: 0.85,
      coolingEfficiency: 3.1
    },
    source: "internal_reference",
    confidence: "low",
    assumptions: ["Apartament de referinta intern, pregatit pentru calibrare normativa."]
  }
};
