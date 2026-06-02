import type { ThermalBridge } from "../model/ThermalBridge";

export const THERMAL_BRIDGES_REGISTRY: Record<string, Omit<ThermalBridge, "id" | "lengthM">> = {
  foundation_medium: {
    type: "foundation",
    psiWmK: {
      value: 0.25,
      unit: "W/mK",
      source: "estimated",
      confidence: "low",
      assumptions: ["Corectie simplificata pentru fundatie in lipsa detaliilor constructive."]
    },
    severity: "medium"
  },
  window_reveal_medium: {
    type: "window_reveal",
    psiWmK: {
      value: 0.12,
      unit: "W/mK",
      source: "estimated",
      confidence: "low",
      assumptions: ["Corectie estimativa pentru glafuri si contur ferestre."]
    },
    severity: "medium"
  }
};
