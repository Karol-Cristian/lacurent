import type { EnvelopeElement } from "../model/EnvelopeElement";
import type { EnvelopeElementResult } from "../model/EnergyResult";
import type { PhysicsValue } from "../model/Material";
import { calculateCorrectedTransmittance } from "./correctedTransmittance";
import { calculateTotalResistance } from "./resistance";
import { calculateTransmittance } from "./transmittance";
import { pv } from "./resistance";

export function calculateElementHeatTransfer(element: EnvelopeElement): EnvelopeElementResult {
  const resistance = calculateTotalResistance(element.layers);
  const rawU = element.declaredUValueWm2K || calculateTransmittance(resistance.total);
  const correctedU = calculateCorrectedTransmittance(element, rawU);
  const h = pv(correctedU.value * element.areaM2.value, "W/K", ["H = U' x A."], correctedU.confidence);
  return {
    elementId: element.id,
    name: element.name,
    type: element.type,
    areaM2: element.areaM2,
    rTotalM2KW: resistance.total,
    uValueWm2K: rawU,
    correctedUValueWm2K: correctedU,
    heatTransferCoefficientWK: h
  };
}

export function calculateTransmissionHeatTransfer(elements: EnvelopeElement[]): {
  heatTransfer: PhysicsValue;
  elementResults: EnvelopeElementResult[];
} {
  const elementResults = elements.map(calculateElementHeatTransfer);
  const value = elementResults.reduce((sum, element) => sum + element.heatTransferCoefficientWK.value, 0);
  const confidence = elementResults.some(element => element.correctedUValueWm2K.confidence === "low") ? "low" : "medium";
  return {
    heatTransfer: pv(value, "W/K", ["H_transmission = suma(U' x A) pentru elementele de anvelopa."], confidence),
    elementResults
  };
}
