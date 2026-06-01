import type { MaterialLayer, ThermalCalculationResult } from "../schema/mc001TechnicalModel";

export function calculateThermalTransfer(
  layers: MaterialLayer[],
  options: {
    rsiM2KW?: number;
    rseM2KW?: number;
  } = {}
): ThermalCalculationResult {
  const rsiM2KW = options.rsiM2KW ?? 0.13;
  const rseM2KW = options.rseM2KW ?? 0.04;
  const assumptions: string[] = [];

  const layerResistances = layers.map(layer => {
    if (!layer.lambdaWmK || layer.lambdaWmK <= 0) {
      assumptions.push(`Lipseste lambda pentru ${layer.name}; stratul nu contribuie la R.`);
      return {
        materialId: layer.materialId,
        resistanceM2KW: 0
      };
    }
    return {
      materialId: layer.materialId,
      resistanceM2KW: layer.thicknessM / layer.lambdaWmK
    };
  });

  const totalResistanceM2KW = rsiM2KW + rseM2KW + layerResistances.reduce((sum, layer) => sum + layer.resistanceM2KW, 0);
  const uValueWm2K = totalResistanceM2KW > 0 ? 1 / totalResistanceM2KW : 0;
  const missingData = layers.some(layer => !layer.lambdaWmK || !layer.thicknessM);

  return {
    rsiM2KW,
    rseM2KW,
    layerResistances,
    totalResistanceM2KW,
    uValueWm2K,
    assumptions: assumptions.length ? assumptions : ["Calcul estimativ R/U pe baza straturilor disponibile."],
    confidence: missingData ? "low" : "medium"
  };
}
