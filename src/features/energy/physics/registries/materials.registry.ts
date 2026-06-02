import type { MaterialPreset, PhysicsValue } from "../model/Material";

function value(value: number, unit: string, assumptions: string[] = []): PhysicsValue {
  return { value, unit, source: "estimated", confidence: "medium", assumptions };
}

function material(
  id: string,
  name: string,
  category: MaterialPreset["category"],
  lambdaWPerMK: number,
  assumptions: string[] = []
): MaterialPreset {
  return {
    id,
    name,
    category,
    lambdaWPerMK,
    lambdaWmK: value(lambdaWPerMK, "W/mK", assumptions),
    source: "internal_estimate",
    confidence: "medium"
  };
}

export const MATERIALS_REGISTRY: Record<string, MaterialPreset> = {
  solid_brick: material("solid_brick", "Caramida plina", "masonry", 0.72, ["Valoare placeholder estimativa; se va calibra cu tabele normative."]),
  efficient_brick: material("efficient_brick", "Caramida eficienta", "masonry", 0.32),
  bca: material("bca", "BCA", "masonry", 0.18),
  concrete: material("concrete", "Beton", "concrete", 1.7),
  plaster: material("plaster", "Tencuiala", "plaster", 0.7),
  eps: material("eps", "Polistiren EPS", "insulation", 0.04),
  xps: material("xps", "Polistiren XPS", "insulation", 0.035),
  mineral_wool: material("mineral_wool", "Vata minerala", "insulation", 0.039),
  wood: material("wood", "Lemn", "wood", 0.18),
  soil_equivalent: material("soil_equivalent", "Sol echivalent", "other", 1.5, ["Model simplificat pentru placa pe sol in v0.2."])
};
