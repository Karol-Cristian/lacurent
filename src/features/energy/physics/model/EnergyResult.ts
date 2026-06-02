import type { EnvelopeElementType } from "./EnvelopeElement";
import type { PhysicsConfidence, PhysicsValue } from "./Material";

export interface EnvelopeElementResult {
  elementId: string;
  name: string;
  type: EnvelopeElementType;
  areaM2: PhysicsValue;
  rTotalM2KW: PhysicsValue;
  uValueWm2K: PhysicsValue;
  correctedUValueWm2K: PhysicsValue;
  heatTransferCoefficientWK: PhysicsValue;
}

export interface WeakEnvelopeElement {
  elementId: string;
  name: string;
  type: EnvelopeElementType;
  uValueWm2K: number;
  heatTransferCoefficientWK: number;
  reason: string;
}

export interface EnergySimulationResult {
  heatLossTransmission: PhysicsValue;
  heatLossVentilation: PhysicsValue;
  thermalBridgeLoss: PhysicsValue;
  totalHeatTransferCoefficient: PhysicsValue;
  heatingDemandKwhYear: PhysicsValue;
  coolingDemandKwhYear?: PhysicsValue;
  dhwDemandKwhYear: PhysicsValue;
  finalEnergyKwhYear: PhysicsValue;
  finalEnergyKwhM2Year: PhysicsValue;
  primaryEnergyKwhYear: PhysicsValue;
  primaryEnergyKwhM2Year: PhysicsValue;
  co2KgYear: PhysicsValue;
  co2KgM2Year: PhysicsValue;
  envelopeResults: EnvelopeElementResult[];
  weakestEnvelopeElements: WeakEnvelopeElement[];
  assumptions: string[];
  confidence: {
    level: PhysicsConfidence;
    score: number;
    reasons: string[];
  };
}

export interface PhysicsEnvelopeResult {
  rValuesByElement: Record<string, number>;
  uValuesByElement: Record<string, number>;
  correctedUValuesByElement: Record<string, number>;
  heatTransferByElement: Record<string, number>;
  heatTransferByCategory: {
    walls: number;
    roof: number;
    floor: number;
    windows: number;
    doors: number;
    thermalBridges: number;
    unconditionedZones: number;
  };
  totalTransmissionHeatTransferWPerK: number;
  totalVentilationHeatTransferWPerK: number;
  totalHeatTransferWPerK: number;
  estimatedHeatingDemandKwhYear: number;
  estimatedHeatingDemandKwhM2Year: number;
  weakestEnvelopeElements: Array<{
    elementId: string;
    category: string;
    heatLossSharePercent: number;
    reason: string;
  }>;
  assumptions: string[];
  confidence: "low" | "medium" | "high";
}
