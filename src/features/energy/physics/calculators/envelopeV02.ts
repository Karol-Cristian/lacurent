import type { Building } from "../model/Building";
import type { EnvelopeElement } from "../model/EnvelopeElement";
import type { PhysicsCalculation } from "../model/Material";
import type { ThermalBridge } from "../model/ThermalBridge";
import type { UnconditionedZone } from "../model/ThermalZone";
import { MATERIALS_REGISTRY } from "../registries/materials.registry";
import { SURFACE_RESISTANCES_REGISTRY } from "../registries/surfaceResistances.registry";
import { WINDOWS_REGISTRY } from "../registries/windows.registry";

export interface UnconditionedZoneCorrection {
  unconditionedZoneId: string;
  month?: number;
  hToExteriorWPerK: number;
  hTotalWPerK: number;
  correctionFactor: number;
}

export interface TransmissionHeatTransferResult {
  totalHtrWPerK: number;
  byElement: Record<string, number>;
  byCategory: {
    walls: number;
    roof: number;
    floor: number;
    windows: number;
    doors: number;
    thermalBridges: number;
    unconditionedZones: number;
  };
  rValuesByElement: Record<string, number>;
  uValuesByElement: Record<string, number>;
  correctedUValuesByElement: Record<string, number>;
  assumptions: string[];
  confidence: "low" | "medium" | "high";
}

function result(value: number, unit: string, assumptions: string[], confidence: PhysicsCalculation["confidence"] = "medium"): PhysicsCalculation {
  return {
    value,
    unit,
    source: "internal_estimate",
    confidence,
    assumptions
  };
}

function numeric(value: number | { value: number } | undefined, fallback = 0): number {
  if (typeof value === "number") return value;
  if (value && typeof value.value === "number") return value.value;
  return fallback;
}

function elementArea(element: EnvelopeElement): number {
  return numeric(element.areaM2);
}

function elementCategory(element: EnvelopeElement): keyof TransmissionHeatTransferResult["byCategory"] {
  if (element.type === "external_wall" || element.type === "internal_partition_to_unconditioned") return "walls";
  if (element.type === "roof" || element.type === "ceiling_to_attic") return "roof";
  if (element.type === "floor_on_ground" || element.type === "floor_over_basement" || element.type === "floor_over_unconditioned_space") return "floor";
  if (element.type === "window") return "windows";
  if (element.type === "external_door") return "doors";
  return "walls";
}

function surfaceResistancePreset(element: EnvelopeElement) {
  if (element.to?.type === "ground" || element.boundary === "ground") return SURFACE_RESISTANCES_REGISTRY.ground_contact;
  if (element.orientation === "horizontal" || element.tiltDeg === 0) return SURFACE_RESISTANCES_REGISTRY.default_horizontal;
  return SURFACE_RESISTANCES_REGISTRY.default_vertical;
}

export function calculateLayerResistance(
  layer: { materialId: string; thicknessM: number | { value: number } },
  materialRegistry = MATERIALS_REGISTRY
): PhysicsCalculation {
  const material = materialRegistry[layer.materialId];
  const thicknessM = numeric(layer.thicknessM);
  if (!material || !material.lambdaWPerMK || material.lambdaWPerMK <= 0 || thicknessM <= 0) {
    return result(0, "m2K/W", [`Date insuficiente pentru stratul ${layer.materialId}.`], "low");
  }
  return {
    value: thicknessM / material.lambdaWPerMK,
    unit: "m2K/W",
    source: material.source || "internal_estimate",
    confidence: material.confidence || "medium",
    assumptions: [`R_layer = thickness / lambda pentru ${material.name}.`]
  };
}

export function calculateElementResistance(element: EnvelopeElement): PhysicsCalculation {
  const preset = surfaceResistancePreset(element);
  const layers = element.layers || [];
  const layerResults = layers.map(layer => calculateLayerResistance({
    materialId: layer.materialId,
    thicknessM: layer.thicknessM
  }));
  const total = preset.rsiM2KPerW.value + preset.rseM2KPerW.value + layerResults.reduce((sum, layer) => sum + layer.value, 0);
  const confidence = layerResults.some(layer => layer.confidence === "low") ? "low" : "medium";
  return result(
    total,
    "m2K/W",
    [
      "R_total = Rsi + suma R_layer + Rse.",
      ...preset.rsiM2KPerW.assumptions,
      ...preset.rseM2KPerW.assumptions,
      ...layerResults.flatMap(layer => layer.assumptions)
    ],
    confidence
  );
}

export function calculateElementUValue(element: EnvelopeElement): PhysicsCalculation {
  if (element.declaredUValueWm2K) {
    return result(
      element.declaredUValueWm2K.value,
      "W/m2K",
      ["U-value declarat/preset pentru element."],
      element.declaredUValueWm2K.confidence
    );
  }
  if (element.windowSystemId) {
    const window = WINDOWS_REGISTRY[element.windowSystemId];
    if (window) return result(window.uValueWm2K.value, "W/m2K", ["U-value din registry ferestre."], window.uValueWm2K.confidence);
  }
  const resistance = calculateElementResistance(element);
  return result(
    resistance.value > 0 ? 1 / resistance.value : 0,
    "W/m2K",
    ["U = 1 / R_total.", ...resistance.assumptions],
    resistance.confidence
  );
}

export function calculateThermalBridgeHeatLoss(bridges: ThermalBridge[] = []): PhysicsCalculation {
  const value = bridges.reduce((sum, bridge) => {
    const length = numeric(bridge.lengthM);
    const psi = bridge.psiWPerMK ?? numeric(bridge.psiWmK);
    return sum + length * psi;
  }, 0);
  const confidence = bridges.some(bridge => (bridge.confidence || "low") === "low") ? "low" : "medium";
  return result(value, "W/K", ["H_tb = suma(psi x length)."], confidence);
}

export function calculateCorrectedUValue(element: EnvelopeElement): PhysicsCalculation {
  const area = elementArea(element);
  const u = calculateElementUValue(element);
  const hTb = calculateThermalBridgeHeatLoss(element.thermalBridges || []);
  const corrected = area > 0 ? ((u.value * area) + hTb.value) / area : u.value;
  return result(
    corrected,
    "W/m2K",
    ["U_corrected = (U x A + H_tb) / A.", ...u.assumptions, ...hTb.assumptions],
    u.confidence === "low" || hTb.confidence === "low" ? "low" : "medium"
  );
}

export function calculateElementHeatTransferCoefficient(element: EnvelopeElement): PhysicsCalculation {
  const correctedU = calculateCorrectedUValue(element);
  return result(
    correctedU.value * elementArea(element),
    "W/K",
    ["H_element = U_corrected x A.", ...correctedU.assumptions],
    correctedU.confidence
  );
}

export function calculateUnconditionedZoneCorrection(
  zone: UnconditionedZone,
  elements: EnvelopeElement[]
): UnconditionedZoneCorrection {
  const exteriorElements = elements.filter(element => zone.adjacentExteriorElements.includes(element.id));
  const hToExterior = exteriorElements.reduce((sum, element) => sum + calculateElementHeatTransferCoefficient(element).value, 0);
  const adjacentToHeated = elements
    .filter(element => element.to?.type === "unconditioned_zone" && element.to.zoneId === zone.id)
    .reduce((sum, element) => sum + calculateElementHeatTransferCoefficient(element).value, 0);
  const hTotal = hToExterior + adjacentToHeated;
  return {
    unconditionedZoneId: zone.id,
    hToExteriorWPerK: hToExterior,
    hTotalWPerK: hTotal,
    correctionFactor: hTotal > 0 ? hToExterior / hTotal : 0.85
  };
}

export function calculateTransmissionHeatTransfer(building: Building): TransmissionHeatTransferResult {
  const byElement: Record<string, number> = {};
  const rValuesByElement: Record<string, number> = {};
  const uValuesByElement: Record<string, number> = {};
  const correctedUValuesByElement: Record<string, number> = {};
  const byCategory = {
    walls: 0,
    roof: 0,
    floor: 0,
    windows: 0,
    doors: 0,
    thermalBridges: 0,
    unconditionedZones: 0
  };
  const assumptions = ["H_tr = suma H_element_corectat."];
  const corrections = new Map((building.unconditionedZones || []).map(zone => [
    zone.id,
    calculateUnconditionedZoneCorrection(zone, building.envelope)
  ]));

  for (const element of building.envelope) {
    const r = calculateElementResistance(element);
    const u = calculateElementUValue(element);
    const correctedU = calculateCorrectedUValue(element);
    let h = calculateElementHeatTransferCoefficient(element).value;
    if (element.to?.type === "unconditioned_zone") {
      const correction = corrections.get(element.to.zoneId);
      if (correction) {
        h *= correction.correctionFactor;
        byCategory.unconditionedZones += h;
        assumptions.push(`Elementul ${element.name} este corectat cu b_ztu=${correction.correctionFactor.toFixed(2)}.`);
      } else {
        h *= 0.85;
        byCategory.unconditionedZones += h;
        assumptions.push(`Elementul ${element.name} foloseste fallback b_ztu=0.85.`);
      }
    }
    const hTb = calculateThermalBridgeHeatLoss(element.thermalBridges || []);
    byCategory.thermalBridges += hTb.value;
    byCategory[elementCategory(element)] += h;
    byElement[element.id] = h;
    rValuesByElement[element.id] = r.value;
    uValuesByElement[element.id] = u.value;
    correctedUValuesByElement[element.id] = correctedU.value;
  }

  return {
    totalHtrWPerK: Object.values(byElement).reduce((sum, value) => sum + value, 0),
    byElement,
    byCategory,
    rValuesByElement,
    uValuesByElement,
    correctedUValuesByElement,
    assumptions,
    confidence: assumptions.length > 2 ? "low" : "medium"
  };
}
