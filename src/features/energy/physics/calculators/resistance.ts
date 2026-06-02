import type { LayerResistance, MaterialLayer, PhysicsValue } from "../model/Material";

export interface ResistanceResult {
  layerResistances: LayerResistance[];
  rsi: PhysicsValue;
  rse: PhysicsValue;
  total: PhysicsValue;
}

export function pv(value: number, unit: string, assumptions: string[] = [], confidence: PhysicsValue["confidence"] = "medium"): PhysicsValue {
  return { value, unit, source: "internal_estimate", confidence, assumptions };
}

export function calculateLayerResistance(layer: MaterialLayer): LayerResistance {
  const lambda = layer.lambdaWmK?.value;
  const thickness = layer.thicknessM.value;
  if (!lambda || lambda <= 0 || thickness <= 0) {
    return {
      materialId: layer.materialId,
      name: layer.name,
      resistance: pv(0, "m2K/W", [`Date insuficiente pentru stratul ${layer.name}.`], "low")
    };
  }
  return {
    materialId: layer.materialId,
    name: layer.name,
    resistance: pv(thickness / lambda, "m2K/W", [`R = d/lambda pentru ${layer.name}.`], layer.lambdaWmK.confidence)
  };
}

export function calculateTotalResistance(
  layers: MaterialLayer[],
  options: { rsi?: number; rse?: number } = {}
): ResistanceResult {
  const rsi = pv(options.rsi ?? 0.13, "m2K/W", ["Rezistenta superficiala interioara estimativa."]);
  const rse = pv(options.rse ?? 0.04, "m2K/W", ["Rezistenta superficiala exterioara estimativa."]);
  const layerResistances = layers.map(calculateLayerResistance);
  const totalValue = rsi.value + rse.value + layerResistances.reduce((sum, layer) => sum + layer.resistance.value, 0);
  const confidence = layers.some(layer => !layer.lambdaWmK || layer.thicknessM.confidence === "low") ? "low" : "medium";
  return {
    layerResistances,
    rsi,
    rse,
    total: pv(totalValue, "m2K/W", ["R_total = Rsi + suma R_strat + Rse."], confidence)
  };
}
