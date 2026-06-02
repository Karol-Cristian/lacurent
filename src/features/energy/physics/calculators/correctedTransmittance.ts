import type { EnvelopeElement } from "../model/EnvelopeElement";
import type { PhysicsValue } from "../model/Material";
import { pv } from "./resistance";

export function calculateCorrectedTransmittance(element: EnvelopeElement, uValue: PhysicsValue): PhysicsValue {
  const correction = element.correctionFactor?.value ?? 1;
  const boundaryFactor = element.boundary === "ground" ? 0.75 : element.boundary.startsWith("unconditioned") ? 0.85 : 1;
  return pv(
    uValue.value * correction * boundaryFactor,
    "W/m2K",
    [
      "U' = U x factor corectie x factor spatiu adiacent.",
      element.boundary === "ground" ? "Placa pe sol foloseste factor simplificat v0.1." : "",
      element.boundary.startsWith("unconditioned") ? "Zona neincalzita foloseste factor de reducere simplificat." : ""
    ].filter(Boolean),
    uValue.confidence
  );
}
