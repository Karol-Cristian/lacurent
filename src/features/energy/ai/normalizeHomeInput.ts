import type { UserEnergyInputs } from "../schema/userInputs";
import type { AiAssumption, AiConfidence } from "./schemas/AiAssumption";
import type { NormalizedHomeInput } from "./schemas/NormalizedHomeInput";

type RawHomeInput = Partial<UserEnergyInputs> | Record<string, unknown>;

function rawValue(input: RawHomeInput, key: string): unknown {
  const direct = (input as Record<string, unknown>)[key];
  if (direct !== undefined && direct !== "") return direct;

  const userInput = input as Partial<UserEnergyInputs>;
  const mapped: Record<string, unknown> = {
    building_type: userInput.general?.buildingType,
    usage_mode: (input as Record<string, unknown>).mode,
    city: userInput.general?.location?.cityOrVillage,
    county: userInput.general?.location?.county,
    useful_area_m2: userInput.geometry?.usefulAreaM2,
    heated_area_m2: userInput.geometry?.heatedAreaM2,
    heated_volume_m3: userInput.geometry?.volumeM3,
    floors: userInput.geometry?.numberOfFloors,
    wall_material: userInput.envelope?.walls?.material,
    wall_thickness_cm: userInput.envelope?.walls?.approximateThicknessCm,
    wall_insulation_cm: userInput.envelope?.walls?.insulationThicknessCm,
    wall_insulation_material: userInput.envelope?.walls?.insulationMaterial,
    roof_insulation_cm: userInput.envelope?.roof?.insulationThicknessCm,
    floor_type: userInput.envelope?.floor?.type,
    floor_insulation_cm: userInput.envelope?.floor?.insulationThicknessCm,
    window_type: userInput.envelope?.windows?.type,
    window_frame: userInput.envelope?.windows?.frameMaterial,
    heating_source: userInput.heating?.mainSource,
    heating_generator: userInput.heating?.systemType,
    heating_distribution: userInput.heating?.distribution,
    dhw_source: userInput.dhw?.source,
    ventilation_type: userInput.ventilation?.type,
    heat_recovery: userInput.ventilation?.hasHeatRecovery,
    pv_installed: userInput.renewables?.photovoltaic?.installed
  };
  return mapped[key];
}

function text(input: RawHomeInput, key: string): string | undefined {
  const value = rawValue(input, key);
  if (value === undefined || value === null || value === "unknown") return undefined;
  return String(value).trim() || undefined;
}

function number(input: RawHomeInput, key: string): number | undefined {
  const value = rawValue(input, key);
  if (value === undefined || value === null || value === "" || value === "unknown") return undefined;
  if (typeof value === "number") return Number.isFinite(value) ? value : undefined;
  const cleaned = String(value).replace(",", ".");
  const match = cleaned.match(/-?\d+(\.\d+)?/);
  const parsed = match ? Number(match[0]) : Number(cleaned);
  return Number.isFinite(parsed) ? parsed : undefined;
}

function yesNo(input: RawHomeInput, key: string): boolean | undefined {
  const value = text(input, key)?.toLowerCase();
  if (!value) return undefined;
  if (["yes", "da", "true", "1"].includes(value)) return true;
  if (["no", "nu", "false", "0"].includes(value)) return false;
  return undefined;
}

function confidence(requiredValues: Array<unknown>): AiConfidence {
  const known = requiredValues.filter(value => value !== undefined && value !== null && value !== "" && value !== "unknown").length;
  const ratio = requiredValues.length ? known / requiredValues.length : 0;
  if (ratio >= 0.75) return "high";
  if (ratio >= 0.4) return "medium";
  return "low";
}

function assumption(id: string, field: string, label: string, reason: string, value?: string | number | boolean): AiAssumption {
  return {
    id,
    field,
    label,
    value,
    reason,
    confidence: value === undefined ? "low" : "medium",
    source: value === undefined ? "missing_data" : "ai_normalization",
    numericTruthSource: typeof value === "number" ? "user_input" : "not_numeric"
  };
}

function normalizeBuildingType(value?: string): NormalizedHomeInput["buildingType"] {
  const lower = value?.toLowerCase();
  if (!lower) return undefined;
  if (["house", "casa", "casă"].includes(lower)) return "house";
  if (["apartment", "apartament"].includes(lower)) return "apartment";
  if (["duplex"].includes(lower)) return "duplex";
  return "other";
}

function normalizeWindowType(value?: string): "single" | "old_double" | "modern_double" | "triple" | "unknown" | undefined {
  const lower = value?.toLowerCase();
  if (!lower) return undefined;
  if (lower.includes("single") || lower.includes("simplu")) return "single";
  if (lower.includes("old") || lower.includes("vechi")) return "old_double";
  if (lower.includes("triple") || lower.includes("tripan")) return "triple";
  if (lower.includes("double") || lower.includes("termopan") || lower.includes("modern")) return "modern_double";
  return "unknown";
}

function normalizeHeatingSource(value?: string): "wood" | "gas" | "electricity" | "heat_pump" | "pellet" | "district" | "unknown" | undefined {
  const lower = value?.toLowerCase();
  if (!lower) return undefined;
  if (lower.includes("lemn") || lower.includes("wood")) return "wood";
  if (lower.includes("gaz") || lower.includes("gas")) return "gas";
  if (lower.includes("electric")) return "electricity";
  if (lower.includes("pompa") || lower.includes("pump")) return "heat_pump";
  if (lower.includes("pelet") || lower.includes("pellet")) return "pellet";
  if (lower.includes("termoficare") || lower.includes("district")) return "district";
  return "unknown";
}

function normalizeDistribution(value?: string): "none_local" | "radiators" | "underfloor" | "air" | "unknown" | undefined {
  const lower = value?.toLowerCase();
  if (!lower) return undefined;
  if (lower.includes("soba") || lower.includes("stove") || lower.includes("local")) return "none_local";
  if (lower.includes("radiator") || lower.includes("calorifer")) return "radiators";
  if (lower.includes("pardose")) return "underfloor";
  if (lower.includes("air") || lower.includes("aer")) return "air";
  return "unknown";
}

export function normalizeHomeInput(input: RawHomeInput): NormalizedHomeInput {
  const assumptions: AiAssumption[] = [];
  const missingData: string[] = [];

  const buildingType = normalizeBuildingType(text(input, "building_type") || text(input, "house_type"));
  const usefulAreaM2 = number(input, "useful_area_m2") || number(input, "surface");
  const heatedAreaM2 = number(input, "heated_area_m2") || usefulAreaM2;
  const floors = number(input, "floors");
  const heatedVolumeM3 = number(input, "heated_volume_m3") || (heatedAreaM2 ? heatedAreaM2 * 2.5 : undefined);

  if (heatedVolumeM3 && !number(input, "heated_volume_m3")) {
    assumptions.push(assumption("ai.volume_from_area", "geometry.heatedVolumeM3", "Volum incalzit estimat", "Volumul este estimat din aria incalzita si o inaltime implicita de 2.5 m.", heatedVolumeM3));
  }

  const wallThicknessCm = number(input, "wall_thickness_cm") || number(input, "wall_thickness");
  const wallInsulationCm = number(input, "wall_insulation_cm") || number(input, "wall_insulation");
  const roofInsulationCm = number(input, "roof_insulation_cm") || number(input, "attic_insulation_cm");
  const floorInsulationCm = number(input, "floor_insulation_cm");

  const normalized: NormalizedHomeInput = {
    buildingType,
    mode: text(input, "analysis_purpose") === "purchase" || text(input, "mode") === "buyer" ? "buyer" : "owner",
    location: {
      locality: text(input, "city") || text(input, "locality"),
      county: text(input, "county"),
      climateZoneId: text(input, "climate_zone_id"),
      confidence: confidence([text(input, "city") || text(input, "locality"), text(input, "county")])
    },
    geometry: {
      usefulAreaM2,
      heatedAreaM2,
      heatedVolumeM3,
      floors,
      confidence: confidence([usefulAreaM2, heatedAreaM2, floors])
    },
    envelope: {
      walls: {
        material: text(input, "wall_material"),
        thicknessM: wallThicknessCm ? wallThicknessCm / 100 : undefined,
        insulationMaterial: text(input, "wall_insulation_material"),
        insulationThicknessM: wallInsulationCm ? wallInsulationCm / 100 : undefined,
        confidence: confidence([text(input, "wall_material"), wallThicknessCm, wallInsulationCm])
      },
      roofOrAttic: {
        insulationMaterial: text(input, "roof_insulation_material") || text(input, "attic_insulation_material"),
        insulationThicknessM: roofInsulationCm ? roofInsulationCm / 100 : undefined,
        condition: roofInsulationCm === undefined ? "unknown" : roofInsulationCm < 10 ? "poor" : roofInsulationCm < 25 ? "medium" : "good",
        confidence: confidence([roofInsulationCm])
      },
      floor: {
        type: text(input, "floor_type")?.includes("basement") ? "basement" : text(input, "floor_type")?.includes("ground") ? "ground" : "unknown",
        insulationThicknessM: floorInsulationCm ? floorInsulationCm / 100 : undefined,
        confidence: confidence([text(input, "floor_type"), floorInsulationCm])
      },
      windows: {
        type: normalizeWindowType(text(input, "window_type") || text(input, "windows")),
        frame: text(input, "window_frame")?.toLowerCase().includes("pvc") ? "pvc" : text(input, "window_frame")?.toLowerCase().includes("alum") ? "aluminium" : text(input, "window_frame")?.toLowerCase().includes("wood") ? "wood" : "unknown",
        confidence: confidence([text(input, "window_type") || text(input, "windows")])
      }
    },
    systems: {
      heating: {
        source: normalizeHeatingSource(text(input, "heating_source") || text(input, "heating")),
        generatorType: text(input, "heating_generator") || text(input, "heating_system_type"),
        distribution: normalizeDistribution(text(input, "heating_distribution")),
        confidence: confidence([text(input, "heating_source") || text(input, "heating"), text(input, "heating_generator") || text(input, "heating_system_type")])
      },
      dhw: {
        source: text(input, "dhw_source")?.includes("electric") ? "electric_boiler" : text(input, "dhw_source")?.includes("gas") ? "gas_boiler" : text(input, "dhw_source")?.includes("heat") ? "heat_pump" : text(input, "dhw_source") ? "same_as_heating" : "unknown",
        confidence: confidence([text(input, "dhw_source")])
      },
      ventilation: {
        type: text(input, "ventilation_type")?.includes("heat") || yesNo(input, "heat_recovery") ? "heat_recovery" : text(input, "ventilation_type")?.includes("mechanical") ? "mechanical" : text(input, "ventilation_type") ? "natural" : "unknown",
        confidence: confidence([text(input, "ventilation_type"), yesNo(input, "heat_recovery")])
      }
    },
    access: {
      hasGasAccess: yesNo(input, "has_gas_access"),
      hasWoodAccess: yesNo(input, "has_wood_access"),
      hasTechnicalRoom: yesNo(input, "has_technical_room"),
      hasRoofForPv: buildingType === "apartment" ? false : yesNo(input, "has_roof_for_pv") ?? yesNo(input, "pv_installed"),
      hasThreePhaseElectricity: yesNo(input, "has_three_phase_electricity")
    },
    assumptions,
    missingData
  };

  const required: Array<[string, unknown]> = [
    ["localitate", normalized.location?.locality],
    ["suprafata utila", usefulAreaM2],
    ["material pereti", normalized.envelope?.walls?.material],
    ["izolatie pod/acoperis", normalized.envelope?.roofOrAttic?.insulationThicknessM],
    ["tip ferestre", normalized.envelope?.windows?.type],
    ["sistem incalzire", normalized.systems?.heating?.source]
  ];
  required.forEach(([label, value]) => {
    if (value === undefined || value === "unknown") missingData.push(label);
  });

  if (!normalized.envelope?.roofOrAttic?.insulationThicknessM) {
    assumptions.push(assumption("ai.missing_roof_insulation", "envelope.roofOrAttic.insulationThicknessM", "Izolatie pod necunoscuta", "AI-ul poate cere clarificare, dar Physics Engine trebuie sa foloseasca un fallback explicit.", undefined));
  }

  return normalized;
}
