export const ENERGY_ASSESSMENT_DISCLAIMER =
  "Această evaluare este estimativă și are rol informativ. Nu înlocuiește un certificat de performanță energetică emis de un auditor energetic atestat.";

const UNKNOWN = "unknown";

const DEFAULTS = {
  electricityRonKwh: 1.3,
  gasRonKwh: 0.32,
  gasKwhM3: 10.55,
  woodKwhM3: 1900,
  pelletsKwhKg: 4.8,
  co2: {
    electricityKgKwh: 0.24,
    gasKgKwh: 0.202,
    woodKgKwh: 0.03,
    pelletsKgKwh: 0.04
  }
};

const CLIMATE_ZONES = {
  cluj: {
    climateZone: "transilvania_deal",
    designOutdoorTemperatureC: -18,
    heatingDegreeDays: 3400,
    coolingDegreeDays: 140,
    averageAnnualTemperatureC: 9,
    confidence: "medium"
  },
  bucuresti: {
    climateZone: "campie_sud",
    designOutdoorTemperatureC: -15,
    heatingDegreeDays: 2850,
    coolingDegreeDays: 320,
    averageAnnualTemperatureC: 11.5,
    confidence: "medium"
  },
  brasov: {
    climateZone: "montan_depresionar",
    designOutdoorTemperatureC: -21,
    heatingDegreeDays: 3900,
    coolingDegreeDays: 80,
    averageAnnualTemperatureC: 7.8,
    confidence: "medium"
  }
};

function hasValue(value) {
  return value !== undefined && value !== null && value !== "" && value !== UNKNOWN;
}

function pick(body, keys, fallback = UNKNOWN) {
  for (const key of keys) {
    if (hasValue(body[key])) return body[key];
  }
  return fallback;
}

function num(body, keys, fallback = undefined) {
  const raw = pick(body, keys, undefined);
  const parsed = Number(raw);
  return Number.isFinite(parsed) ? parsed : fallback;
}

function yn(value) {
  if (value === "Da" || value === "yes") return "yes";
  if (value === "Nu" || value === "no") return "no";
  if (value === "Parțial" || value === "partial") return "partial";
  return UNKNOWN;
}

function normalizeText(value) {
  return String(value || "")
    .trim()
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "");
}

function clamp(value, min, max) {
  return Math.max(min, Math.min(max, value));
}

function estimateHeatPumpPerformance(input, climate, envelope) {
  const source = input.heating.mainSource;
  const system = input.heating.systemType;
  const distribution = input.heating.distribution;
  const usesHeatPump = source === "heat_pump" || system === "heat_pump_air_water" || system === "heat_pump_air_air" ||
    input.heating.sources?.some(item => item.source === "heat_pump");
  if (!usesHeatPump) return null;

  const isAirAir = system === "heat_pump_air_air" || distribution === "air";
  const isUnderfloor = system === "underfloor_heating" || distribution === "underfloor";
  const isRadiators = distribution === "radiators" || (!isAirAir && !isUnderfloor);
  const poorEnvelope = ["very_poor", "poor"].includes(envelope.wall.quality) ||
    ["very_poor", "poor"].includes(envelope.roof.quality) ||
    ["very_poor", "poor"].includes(envelope.windows.quality);

  const heatingSeasonOutdoorC = (climate.averageAnnualTemperatureC ?? 9) - 3;
  let supplyTemperatureC = 45;
  if (isAirAir) supplyTemperatureC = 38;
  if (isUnderfloor) supplyTemperatureC = 35;
  if (isRadiators) supplyTemperatureC = poorEnvelope ? 58 : 50;

  const temperatureLift = supplyTemperatureC - heatingSeasonOutdoorC;
  let estimatedCop = 4.6 - temperatureLift * 0.055;
  if (isRadiators && poorEnvelope) estimatedCop -= 0.25;
  if ((climate.designOutdoorTemperatureC || -15) <= -20 && isRadiators) estimatedCop -= 0.15;
  estimatedCop = clamp(estimatedCop, 1.2, 3.8);

  const quality =
    estimatedCop >= 3 ? "very_good" :
    estimatedCop >= 2.4 ? "good" :
    estimatedCop >= 1.8 ? "average" : "poor";

  const assumptions = [
    `COP sezonier estimat: ${estimatedCop.toFixed(1)}.`,
    isUnderfloor
      ? "Distributia la temperatura joasa ajuta pompa de caldura sa lucreze eficient."
      : isRadiators
        ? "Caloriferele cer temperatura mai mare pe agentul termic, ceea ce poate cobori COP-ul si economia reala."
        : "Sistemul aer-aer este evaluat separat de instalatia hidraulica.",
    poorEnvelope
      ? "Pierderile mari ale casei cresc temperatura necesara si reduc eficienta pompei de caldura."
      : "Anvelopa nu indica pierderi majore care sa penalizeze puternic pompa de caldura."
  ];

  return {
    estimatedCop,
    supplyTemperatureC,
    distribution: isUnderfloor ? "underfloor" : isAirAir ? "air" : "radiators",
    quality,
    assumptions
  };
}

export function normalizeUserInputs(body = {}) {
  const buildingTypeRaw = normalizeText(pick(body, ["building_type", "house_type"], "house"));
  const buildingType = buildingTypeRaw.includes("apart") ? "apartment" : "house";
  const city = pick(body, ["city", "cityOrVillage"], UNKNOWN);
  const constructionYear = num(body, ["construction_year", "year", "building_year"], undefined);
  const usefulArea = num(body, ["useful_area_m2", "surface"], undefined);
  const floors = num(body, ["number_of_floors", "floors"], buildingType === "apartment" ? 1 : undefined);

  return {
    general: {
      buildingType,
      usageType: pick(body, ["usage_type", "occupancy_pattern"], UNKNOWN),
      location: {
        country: "RO",
        county: pick(body, ["county"], UNKNOWN),
        cityOrVillage: city,
        altitudeM: num(body, ["altitude_m"], UNKNOWN)
      },
      constructionYear: constructionYear || UNKNOWN,
      lastMajorRenovation: pick(body, ["last_major_renovation", "rehabilitation_status"], UNKNOWN),
      occupants: num(body, ["occupants", "people_count"], UNKNOWN)
    },
    geometry: {
      usefulAreaM2: usefulArea || UNKNOWN,
      heatedAreaM2: num(body, ["heated_area_m2"], usefulArea || UNKNOWN),
      buildingFootprintM2: num(body, ["building_footprint_m2", "built_surface"], UNKNOWN),
      numberOfFloors: floors || UNKNOWN,
      floorHeightM: num(body, ["floor_height_m", "ceiling_height"], 2.5),
      volumeM3: num(body, ["volume_m3"], UNKNOWN),
      attachedBuilding: pick(body, ["attached_building"], buildingType === "apartment" ? "apartment_middle" : "detached"),
      mainOrientation: pick(body, ["main_orientation", "orientation"], UNKNOWN)
    },
    envelope: {
      walls: {
        material: mapWallMaterial(pick(body, ["wall_material"], UNKNOWN)),
        approximateThicknessCm: num(body, ["wall_thickness"], UNKNOWN),
        insulated: mapInsulationState(pick(body, ["walls_insulated", "wall_insulation"], UNKNOWN)),
        insulationThicknessCm: num(body, ["wall_insulation_thickness_cm"], parseInsulationThickness(pick(body, ["wall_insulation"], UNKNOWN))),
        insulationMaterial: pick(body, ["wall_insulation_material"], UNKNOWN)
      },
      roof: {
        type: pick(body, ["roof_type"], yn(pick(body, ["attic"], UNKNOWN)) === "yes" ? "unheated_attic" : UNKNOWN),
        insulated: mapInsulationState(pick(body, ["roof_insulated", "attic_insulated"], UNKNOWN)),
        insulationThicknessCm: num(body, ["roof_insulation_thickness_cm"], UNKNOWN),
        insulationMaterial: pick(body, ["roof_insulation_material"], UNKNOWN)
      },
      floor: {
        type: pick(body, ["floor_type"], UNKNOWN),
        insulated: mapInsulationState(pick(body, ["floor_insulated"], UNKNOWN)),
        insulationThicknessCm: num(body, ["floor_insulation_thickness_cm"], UNKNOWN)
      },
      windows: {
        type: mapWindowType(pick(body, ["window_type", "windows"], UNKNOWN)),
        frameMaterial: pick(body, ["window_frame_material"], UNKNOWN),
        approximateAgeYears: num(body, ["window_age_years"], UNKNOWN),
        hasLowEGlass: yn(pick(body, ["has_low_e_glass"], UNKNOWN))
      },
      doors: {
        exteriorDoorType: pick(body, ["exterior_door_type"], UNKNOWN)
      },
      thermalBridges: {
        visibleIssues: pick(body, ["thermal_bridge_issues"], UNKNOWN)
      }
    },
    heating: {
      mainSource: mapHeatingSource(pick(body, ["heating_source", "heating"], UNKNOWN)),
      systemType: mapHeatingSystem(pick(body, ["heating_system_type", "heating"], UNKNOWN)),
      equipmentAgeYears: num(body, ["heating_equipment_age_years"], UNKNOWN),
      distribution: heatingDistributionFromBody(body),
      sources: heatingSourcesFromBody(body),
      stovePowerKw: num(body, ["stove_power_kw"], UNKNOWN),
      boilerPowerKw: num(body, ["boiler_power_kw"], UNKNOWN),
      control: {
        thermostat: yn(pick(body, ["thermostat"], pick(body, ["smart_thermostat"], UNKNOWN))),
        smartThermostat: yn(pick(body, ["smart_thermostat"], UNKNOWN)),
        thermostaticValves: yn(pick(body, ["thermostatic_valves"], UNKNOWN)),
        zoning: yn(pick(body, ["zoning"], UNKNOWN))
      }
    },
    cooling: {
      hasCooling: yn(pick(body, ["has_cooling"], UNKNOWN)),
      systemType: pick(body, ["cooling_system_type"], UNKNOWN),
      equipmentAgeYears: num(body, ["cooling_equipment_age_years"], UNKNOWN)
    },
    ventilation: {
      type: pick(body, ["ventilation_type"], "natural"),
      hasHeatRecovery: yn(pick(body, ["has_heat_recovery"], UNKNOWN))
    },
    dhw: {
      source: dhwSourceFromBody(body),
      sources: dhwSourcesFromBody(body),
      storageTank: yn(pick(body, ["dhw_storage_tank"], UNKNOWN)),
      recirculation: yn(pick(body, ["dhw_recirculation"], UNKNOWN))
    },
    lighting: {
      dominantType: pick(body, ["lighting_type"], UNKNOWN)
    },
    renewables: {
      photovoltaic: {
        installed: buildingType === "apartment" ? "no" : yn(pick(body, ["solar_panels", "pv_installed"], UNKNOWN)),
        capacityKw: buildingType === "apartment" ? 0 : num(body, ["installed_power", "pv_capacity_kw"], UNKNOWN),
        annualProductionKwh: num(body, ["pv_annual_production_kwh"], UNKNOWN)
      },
      solarThermal: {
        installed: yn(pick(body, ["solar_thermal_installed"], UNKNOWN))
      },
      batteryStorage: {
        installed: yn(pick(body, ["battery_installed"], UNKNOWN)),
        capacityKwh: num(body, ["battery_capacity_kwh"], UNKNOWN)
      }
    },
    realConsumption: {
      mode: pick(body, ["real_consumption_mode"], "simple"),
      simple: {
        averageMonthlyElectricityCostRon: num(body, ["monthly_electricity_cost", "average_monthly_electricity_cost_ron"], UNKNOWN),
        averageMonthlyGasCostRon: num(body, ["monthly_gas_cost", "average_monthly_gas_cost_ron"], UNKNOWN),
        annualWoodCostRon: num(body, ["annual_wood_cost"], UNKNOWN),
        annualPelletsCostRon: num(body, ["annual_pellets_cost"], UNKNOWN),
        annualOtherFuelCostRon: num(body, ["annual_other_fuel_cost"], UNKNOWN),
        annualElectricityKwh: num(body, ["annual_electricity_kwh", "monthly_kwh"], UNKNOWN),
        annualGasKwh: num(body, ["annual_gas_kwh"], UNKNOWN),
        annualGasM3: num(body, ["annual_gas_m3"], UNKNOWN),
        annualWoodM3: num(body, ["annual_wood_m3"], UNKNOWN),
        annualPelletsKg: num(body, ["annual_pellets_kg"], UNKNOWN)
      },
      detailed: []
    }
  };
}

function mapWallMaterial(value) {
  const text = normalizeText(value);
  if (text.includes("caramid")) return "brick";
  if (text.includes("bca")) return "bca";
  if (text.includes("beton") || text.includes("concrete")) return "concrete";
  if (text.includes("lemn") || text.includes("wood")) return "wood";
  if (text.includes("piatra") || text.includes("stone")) return "stone";
  if (text.includes("mixt")) return "mixed";
  return UNKNOWN;
}

function mapWindowType(value) {
  const text = normalizeText(value);
  if (text.includes("single") || text.includes("simpl")) return "single_glazing";
  if (text.includes("tripan") || text.includes("triple")) return "triple_glazing";
  if (text.includes("modern")) return "modern_double_glazing";
  if (text.includes("termopan") || text.includes("double")) return "old_double_glazing";
  if (text.includes("vechi")) return "old_double_glazing";
  return UNKNOWN;
}

function mapHeatingSource(value) {
  const text = normalizeText(value);
  if (text.includes("mixt") || text.includes("mixed")) return "mixed";
  if (text.includes("gaz") || text.includes("gas")) return "gas";
  if (text.includes("lemn") || text.includes("wood")) return "wood";
  if (text.includes("pelet") || text.includes("pellet")) return "pellets";
  if (text.includes("electric")) return "electric";
  if (text.includes("pompa") || text.includes("heat_pump")) return "heat_pump";
  if (text.includes("termoficare") || text.includes("district")) return "district_heating";
  if (text.includes("carbune") || text.includes("coal")) return "coal";
  return UNKNOWN;
}

function heatingSourcesFromBody(body) {
  const source = mapHeatingSource(pick(body, ["heating_source", "heating"], UNKNOWN));
  if (source !== "mixed") return [];
  return ["gas", "wood", "pellets", "electric", "heat_pump", "district_heating"]
    .filter(key => yn(body[`heating_${key}_enabled`]) === "yes")
    .map(key => ({
      source: key,
      areaM2: num(body, [`heating_${key}_area_m2`], UNKNOWN)
    }));
}

function heatingDistributionFromBody(body) {
  const explicit = pick(body, ["heating_distribution"], UNKNOWN);
  if (explicit !== UNKNOWN) return explicit;
  const system = mapHeatingSystem(pick(body, ["heating_system_type", "heating"], UNKNOWN));
  if (system === "underfloor_heating") return "underfloor";
  if (system === "stove") return "local_stoves";
  if (system === "heat_pump_air_air") return "air";
  if (["individual_boiler", "condensing_boiler", "wood_boiler", "pellet_boiler", "heat_pump_air_water"].includes(system)) {
    return "radiators";
  }
  return UNKNOWN;
}

function dhwSourcesFromBody(body) {
  const entries = [
    ["same_as_heating", "dhw_source_heating"],
    ["electric_boiler", "dhw_source_electric"],
    ["gas_boiler", "dhw_source_gas"],
    ["solar_thermal", "dhw_source_solar"],
    ["heat_pump", "dhw_source_heat_pump"]
  ].filter(([, key]) => yn(body[key]) === "yes").map(([source]) => source);
  if (entries.length) return entries;
  const source = pick(body, ["dhw_source"], "same_as_heating");
  return source === UNKNOWN ? [] : [source];
}

function dhwSourceFromBody(body) {
  const sources = dhwSourcesFromBody(body);
  if (sources.length > 1) return "mixed";
  return sources[0] || "same_as_heating";
}

function mapHeatingSystem(value) {
  const text = normalizeText(value);
  if (text.includes("soba") || text.includes("stove")) return "stove";
  if (text.includes("pelet") || text.includes("pellet")) return "pellet_boiler";
  if (text.includes("lemn") || text.includes("wood_boiler")) return "wood_boiler";
  if (text.includes("condens")) return "condensing_boiler";
  if (text.includes("centrala")) return "individual_boiler";
  if (text.includes("electric")) return "electric_radiators";
  if (text.includes("pardoseala") || text.includes("underfloor")) return "underfloor_heating";
  if (text.includes("heat_pump_air_air")) return "heat_pump_air_air";
  if (text.includes("pompa") || text.includes("heat_pump_air_water")) return "heat_pump_air_water";
  if (text.includes("termoficare") || text.includes("district")) return "district_heating";
  return UNKNOWN;
}

function mapInsulationState(value) {
  const text = normalizeText(value);
  if (text === "yes" || text.includes("da")) return "yes";
  if (text === "no" || text.includes("nu") || text.includes("fara")) return "no";
  if (text.includes("partial")) return "partial";
  if (parseInsulationThickness(value) > 0) return "yes";
  return UNKNOWN;
}

function parseInsulationThickness(value) {
  const match = String(value || "").match(/(\d+)/);
  return match ? Number(match[1]) : undefined;
}

export function deriveBuilding(input, nowYear = new Date().getFullYear()) {
  const year = input.general.constructionYear;
  const age = Number.isFinite(Number(year)) ? nowYear - Number(year) : undefined;
  let period = UNKNOWN;
  if (Number.isFinite(Number(year))) {
    if (year < 1945) period = "before_1945";
    else if (year <= 1977) period = "1945_1977";
    else if (year <= 1990) period = "1978_1990";
    else if (year <= 2000) period = "1991_2000";
    else if (year <= 2010) period = "2001_2010";
    else if (year <= 2020) period = "2011_2020";
    else period = "after_2020";
  }

  const standardByPeriod = {
    before_1945: "pre_energy_standards",
    "1945_1977": "pre_energy_standards",
    "1978_1990": "basic_energy_standards",
    "1991_2000": "basic_energy_standards",
    "2001_2010": "improved_energy_standards",
    "2011_2020": "modern_energy_standards",
    after_2020: "nZEB_or_recent",
    unknown: UNKNOWN
  };

  const renovationRaw = input.general.lastMajorRenovation;
  const renovationStatus =
    renovationRaw === "less_than_5_years" || renovationRaw === "5_10_years" || renovationRaw === "Reabilitat"
      ? "recently_renovated"
      : renovationRaw === "10_20_years" || renovationRaw === "partial" || renovationRaw === "Parțial"
        ? "partially_renovated"
        : renovationRaw === "never"
          ? "not_renovated"
          : UNKNOWN;

  return {
    estimatedBuildingAgeYears: age,
    constructionPeriod: period,
    likelyCodeStandard: standardByPeriod[period],
    renovationStatus
  };
}

export function deriveClimate(input) {
  const cityKey = normalizeText(input.general.location.cityOrVillage);
  return CLIMATE_ZONES[cityKey] || {
    climateZone: "romania_default",
    designOutdoorTemperatureC: -15,
    heatingDegreeDays: 3200,
    coolingDegreeDays: 180,
    averageAnnualTemperatureC: 10,
    confidence: "low"
  };
}

export function deriveGeometry(input) {
  const area = input.geometry.usefulAreaM2 !== UNKNOWN ? Number(input.geometry.usefulAreaM2) : undefined;
  const floors = input.geometry.numberOfFloors !== UNKNOWN ? Number(input.geometry.numberOfFloors) : 1;
  const floorHeight = input.geometry.floorHeightM !== UNKNOWN ? Number(input.geometry.floorHeightM) : 2.5;
  const footprint = input.geometry.buildingFootprintM2 !== UNKNOWN
    ? Number(input.geometry.buildingFootprintM2)
    : area && floors ? area / floors : undefined;
  const volume = input.geometry.volumeM3 !== UNKNOWN
    ? Number(input.geometry.volumeM3)
    : area ? area * floorHeight : undefined;
  const windowRatio = input.general.buildingType === "apartment" ? 0.14 : 0.16;
  const windowArea = area ? area * windowRatio : undefined;
  const roofArea = footprint;
  const floorArea = footprint;
  const wallArea = area ? Math.sqrt(footprint || area) * 4 * floorHeight * floors : undefined;
  const envelopeArea = [wallArea, roofArea, floorArea, windowArea].filter(Number.isFinite).reduce((sum, val) => sum + val, 0) || undefined;

  return {
    usefulAreaM2: area,
    heatedAreaM2: input.geometry.heatedAreaM2 !== UNKNOWN ? Number(input.geometry.heatedAreaM2) : area,
    estimatedVolumeM3: volume,
    estimatedEnvelopeAreaM2: envelopeArea,
    estimatedWallAreaM2: wallArea,
    estimatedRoofAreaM2: roofArea,
    estimatedFloorAreaM2: floorArea,
    estimatedWindowAreaM2: windowArea,
    compactnessRatio: volume && envelopeArea ? volume / envelopeArea : undefined,
    formFactor: volume && envelopeArea ? envelopeArea / volume : undefined
  };
}

function envelopeQuality(element, thickness = 0, type = "") {
  if (element === "windows") {
    if (type === "single_glazing") return quality(4.8, "very_poor", "Geam simplu sau foarte vechi.");
    if (type === "old_double_glazing") return quality(2.7, "average", "Termopan vechi estimat.");
    if (type === "modern_double_glazing") return quality(1.4, "good", "Termopan modern estimat.");
    if (type === "triple_glazing") return quality(0.9, "very_good", "Tripan estimat.");
    return quality(undefined, UNKNOWN, "Tipul ferestrelor nu este cunoscut.", "low");
  }

  if (element === "roof") {
    if (thickness >= 20) return quality(0.18, "very_good", "Pod/acoperiș cu izolație consistentă.");
    if (thickness >= 10) return quality(0.28, "good", "Pod/acoperiș cu izolație medie.");
    if (thickness > 0) return quality(0.45, "average", "Pod/acoperiș cu izolație redusă.");
    return quality(1.2, "very_poor", "Pod/acoperiș neizolat sau necunoscut.", "low");
  }

  if (element === "floor") {
    if (thickness >= 10) return quality(0.3, "good", "Podea izolată estimativ.");
    if (thickness > 0) return quality(0.5, "average", "Podea parțial izolată.");
    return quality(0.8, "poor", "Podea neizolată sau necunoscută.", "low");
  }

  if (thickness >= 15) return quality(0.22, "very_good", "Pereți cu izolație peste 15 cm.");
  if (thickness >= 10) return quality(0.32, "good", "Pereți cu izolație de aproximativ 10 cm.");
  if (thickness >= 5) return quality(0.55, "average", "Pereți cu izolație sub nivel modern.");
  return quality(1.1, "poor", "Pereți fără izolație confirmată.", "low");
}

function quality(uValue, qualityValue, assumption, confidence = "medium") {
  return {
    estimatedUValueWm2K: uValue,
    quality: qualityValue,
    confidence,
    assumptions: [assumption]
  };
}

export function deriveEnvelope(input) {
  const wall = envelopeQuality("wall", Number(input.envelope.walls.insulationThicknessCm || 0));
  const roof = envelopeQuality("roof", Number(input.envelope.roof.insulationThicknessCm || 0));
  const floor = envelopeQuality("floor", Number(input.envelope.floor.insulationThicknessCm || 0));
  const windows = envelopeQuality("windows", 0, input.envelope.windows.type);
  const doors = quality(undefined, UNKNOWN, "Ușa exterioară nu este evaluată detaliat.", "low");
  const elements = { wall, roof, floor, windows, doors };
  const weakestElements = Object.entries(elements)
    .filter(([, data]) => ["very_poor", "poor", "average"].includes(data.quality))
    .map(([element, data]) => ({
      element,
      severity: data.quality === "very_poor" ? "critical" : data.quality === "poor" ? "high" : "medium",
      reason: data.assumptions[0]
    }));

  return {
    wall,
    roof,
    floor,
    windows,
    doors,
    globalHeatLossIndicator: [wall, roof, floor, windows]
      .map(item => item.estimatedUValueWm2K || 0)
      .reduce((sum, val) => sum + val, 0),
    weakestElements
  };
}

export function deriveSystems(input, climate = {}, envelope = {}) {
  const source = input.heating.mainSource;
  const system = input.heating.systemType;
  const heatPump = estimateHeatPumpPerformance(input, climate, envelope);
  let estimatedEfficiency = 0.75;
  let heatQuality = "average";
  const assumptions = [];

  if (source === "mixed" || input.heating.sources?.length) {
    estimatedEfficiency = 0.78;
    heatQuality = "average";
    assumptions.push("Sistemul mixt este estimat ca medie intre sursele declarate.");
  } else if (source === "wood" && system === "stove") {
    estimatedEfficiency = 0.55;
    heatQuality = "poor";
    assumptions.push("Soba pe lemne este estimată ca sistem cu eficiență redusă.");
  } else if (system === "wood_boiler") {
    estimatedEfficiency = 0.72;
    heatQuality = "average";
    assumptions.push("Centrala pe lemne este estimata cu eficienta medie, dependenta de exploatare si combustibil.");
  } else if (system === "pellet_boiler") {
    estimatedEfficiency = 0.85;
    heatQuality = "good";
    assumptions.push("Centrala pe peleti este estimata ca sistem eficient daca este intretinuta corect.");
  } else if (system === "condensing_boiler") {
    estimatedEfficiency = 0.94;
    heatQuality = "good";
    assumptions.push("Centrala în condensare este estimată ca eficientă.");
  } else if (heatPump) {
    estimatedEfficiency = heatPump.estimatedCop;
    heatQuality = heatPump.quality;
    assumptions.push(...heatPump.assumptions);
  } else if (source === "electric") {
    estimatedEfficiency = 1;
    heatQuality = "average";
    assumptions.push("Încălzirea electrică este eficientă la punctul de consum, dar poate fi costisitoare.");
  } else {
    assumptions.push("Sistemul de încălzire este estimat din răspunsurile disponibile.");
  }

  const control = input.heating.control;
  const controlQuality =
    control.smartThermostat === "yes" ? "smart" :
    control.thermostat === "yes" || control.thermostaticValves === "yes" ? "good" :
    control.thermostat === "no" ? "none" : "unknown";

  return {
    heating: {
      estimatedEfficiency,
      estimatedCop: heatPump?.estimatedCop,
      estimatedSupplyTemperatureC: heatPump?.supplyTemperatureC,
      quality: heatQuality,
      fuelType: source,
      controlQuality,
      assumptions
    },
    cooling: {
      quality: input.cooling.hasCooling === "yes" ? "average" : "unknown",
      assumptions: ["Răcirea este estimată simplificat."]
    },
    domesticHotWater: {
      quality: input.dhw.source === "solar_thermal" || input.dhw.source === "heat_pump" ? "good" : "average",
      assumptions: ["Apa caldă menajeră este estimată pe baza sursei declarate."]
    },
    ventilation: {
      quality: input.ventilation.hasHeatRecovery === "yes" ? "very_good" : "average",
      assumptions: ["Ventilația este evaluată orientativ."]
    },
    lighting: {
      quality: input.lighting.dominantType === "led" ? "very_good" : input.lighting.dominantType === "mixed" ? "average" : "poor",
      assumptions: ["Iluminatul este estimat din tipul dominant declarat."]
    },
    renewables: {
      photovoltaicInstalled: input.renewables.photovoltaic.installed,
      solarThermalInstalled: input.renewables.solarThermal.installed,
      batteryInstalled: input.renewables.batteryStorage?.installed,
      assumptions: ["Producția regenerabilă este estimată orientativ."]
    }
  };
}

export function deriveRealConsumption(input, estimatedFinalEnergyKwhYear) {
  const simple = input.realConsumption.simple || {};
  const annualElectricity = hasValue(simple.annualElectricityKwh)
    ? Number(simple.annualElectricityKwh) * (Number(simple.annualElectricityKwh) < 2000 && hasValue(pick(simple, ["annualElectricityKwh"])) ? 12 : 1)
    : undefined;
  const annualGas = hasValue(simple.annualGasKwh)
    ? Number(simple.annualGasKwh)
    : hasValue(simple.annualGasM3) ? Number(simple.annualGasM3) * DEFAULTS.gasKwhM3 : undefined;
  const annualWood = hasValue(simple.annualWoodM3) ? Number(simple.annualWoodM3) * DEFAULTS.woodKwhM3 : undefined;
  const annualPellets = hasValue(simple.annualPelletsKg) ? Number(simple.annualPelletsKg) * DEFAULTS.pelletsKwhKg : undefined;
  const annualTotal = [annualElectricity, annualGas, annualWood, annualPellets].filter(Number.isFinite).reduce((sum, val) => sum + val, 0) || undefined;

  const annualCost = [
    hasValue(simple.averageMonthlyElectricityCostRon) ? Number(simple.averageMonthlyElectricityCostRon) * 12 : undefined,
    hasValue(simple.averageMonthlyGasCostRon) ? Number(simple.averageMonthlyGasCostRon) * 12 : undefined,
    hasValue(simple.annualWoodCostRon) ? Number(simple.annualWoodCostRon) : undefined,
    hasValue(simple.annualPelletsCostRon) ? Number(simple.annualPelletsCostRon) : undefined,
    hasValue(simple.annualOtherFuelCostRon) ? Number(simple.annualOtherFuelCostRon) : undefined
  ].filter(Number.isFinite).reduce((sum, val) => sum + val, 0) || undefined;

  let comparison = UNKNOWN;
  if (annualTotal && estimatedFinalEnergyKwhYear) {
    const ratio = annualTotal / estimatedFinalEnergyKwhYear;
    comparison =
      ratio > 1.35 ? "much_higher_than_model" :
      ratio > 1.12 ? "higher_than_model" :
      ratio < 0.65 ? "much_lower_than_model" :
      ratio < 0.88 ? "lower_than_model" : "aligned_with_model";
  }

  return {
    annualCostRon: annualCost,
    monthlyAverageCostRon: annualCost ? annualCost / 12 : undefined,
    annualElectricityKwh: annualElectricity,
    annualGasKwh: annualGas,
    annualWoodKwhEquivalent: annualWood,
    annualPelletsKwhEquivalent: annualPellets,
    annualTotalDeliveredEnergyKwh: annualTotal,
    costCompleteness: annualCost ? "partial" : "none",
    consumptionCompleteness: annualTotal ? "partial_quantities" : annualCost ? "cost_only" : "none",
    comparisonToModel: comparison,
    explanation: annualTotal
      ? "Ai introdus cel puțin o cantitate reală de energie, deci modelul poate fi calibrat orientativ."
      : annualCost
        ? "Ai introdus costuri reale. Le folosim pentru estimări financiare, nu ca măsurare tehnică exactă."
        : "Nu există consum real introdus; estimarea se bazează pe caracteristicile locuinței."
  };
}

export function estimateDemand(input, derived) {
  const area = derived.geometry.heatedAreaM2 || derived.geometry.usefulAreaM2 || 80;
  const periodBase = {
    before_1945: 230,
    "1945_1977": 210,
    "1978_1990": 185,
    "1991_2000": 160,
    "2001_2010": 125,
    "2011_2020": 95,
    after_2020: 65,
    unknown: 170
  };
  let heatingKwhM2 = periodBase[derived.building.constructionPeriod] || 170;
  const climateFactor = (derived.climate.heatingDegreeDays || 3200) / 3200;
  heatingKwhM2 *= climateFactor;

  const envelopeFactors = {
    very_poor: 1.25,
    poor: 1.15,
    average: 1,
    good: 0.82,
    very_good: 0.68,
    unknown: 1.08
  };
  heatingKwhM2 *= envelopeFactors[derived.envelope.wall.quality] || 1;
  heatingKwhM2 *= envelopeFactors[derived.envelope.roof.quality] || 1;
  heatingKwhM2 *= envelopeFactors[derived.envelope.windows.quality] || 1;

  const usefulHeatingDemand = area * heatingKwhM2;
  const heatingEfficiency = Number(derived.systems.heating.estimatedEfficiency) || 1;
  const heatingDemand = usefulHeatingDemand / Math.max(0.45, heatingEfficiency);
  const dhwDemand = area * 18;
  const lightingDemand = area * (input.lighting.dominantType === "led" ? 5 : input.lighting.dominantType === "mixed" ? 9 : 14);
  const coolingDemand = input.cooling.hasCooling === "yes" ? area * 8 : area * 2;
  const renewableProduction = hasValue(input.renewables.photovoltaic.annualProductionKwh)
    ? Number(input.renewables.photovoltaic.annualProductionKwh)
    : hasValue(input.renewables.photovoltaic.capacityKw)
      ? Number(input.renewables.photovoltaic.capacityKw) * 1050
      : 0;

  const finalEnergy = heatingDemand + dhwDemand + lightingDemand + coolingDemand;
  const primaryEnergy = finalEnergy * (input.heating.mainSource === "electric" ? 1.7 : 1.15);

  return {
    estimatedFinalEnergyKwhYear: Math.round(finalEnergy),
    estimatedFinalEnergyKwhM2Year: Math.round(finalEnergy / area),
    estimatedPrimaryEnergyKwhYear: Math.round(primaryEnergy),
    estimatedPrimaryEnergyKwhM2Year: Math.round(primaryEnergy / area),
    heatingDemandKwhYear: Math.round(heatingDemand),
    heatingDemandKwhM2Year: Math.round(heatingDemand / area),
    coolingDemandKwhYear: Math.round(coolingDemand),
    coolingDemandKwhM2Year: Math.round(coolingDemand / area),
    dhwDemandKwhYear: Math.round(dhwDemand),
    dhwDemandKwhM2Year: Math.round(dhwDemand / area),
    lightingDemandKwhYear: Math.round(lightingDemand),
    lightingDemandKwhM2Year: Math.round(lightingDemand / area),
    renewableProductionKwhYear: Math.round(renewableProduction),
    netEnergyKwhYear: Math.round(Math.max(0, finalEnergy - renewableProduction)),
    confidence: derived.climate.confidence === "low" ? "low" : "medium",
    assumptions: [
      "Calculul este estimativ și folosește anul construcției, izolația, ferestrele, sistemele și zona climatică.",
      "Nu se aplică metodologia oficială pentru certificat energetic."
    ]
  };
}

export function estimateCosts(input, demand, realConsumption) {
  if (realConsumption.annualCostRon) {
    return {
      annualCostRon: Math.round(realConsumption.annualCostRon),
      monthlyCostRon: Math.round(realConsumption.annualCostRon / 12),
      assumptions: ["Costul este bazat pe valorile introduse de utilizator."]
    };
  }

  const electricity = demand.lightingDemandKwhYear + demand.coolingDemandKwhYear;
  const heatingCost = demand.heatingDemandKwhYear * (input.heating.mainSource === "gas" ? DEFAULTS.gasRonKwh : 0.28);
  const electricityCost = electricity * DEFAULTS.electricityRonKwh;
  const annual = heatingCost + electricityCost + demand.dhwDemandKwhYear * 0.35;

  return {
    annualCostRon: Math.round(annual),
    monthlyCostRon: Math.round(annual / 12),
    assumptions: ["Costul este estimat din consumul modelat și tarife implicite."]
  };
}

export function estimateCo2(input, demand, realConsumption) {
  const source = input.heating.mainSource;
  const factor =
    source === "gas" ? DEFAULTS.co2.gasKgKwh :
    source === "wood" ? DEFAULTS.co2.woodKgKwh :
    source === "pellets" ? DEFAULTS.co2.pelletsKgKwh :
    DEFAULTS.co2.electricityKgKwh;
  const total = (realConsumption.annualTotalDeliveredEnergyKwh || demand.estimatedFinalEnergyKwhYear || 0) * factor;
  const area = demand.estimatedFinalEnergyKwhYear && demand.estimatedFinalEnergyKwhM2Year
    ? demand.estimatedFinalEnergyKwhYear / demand.estimatedFinalEnergyKwhM2Year
    : 80;
  const perM2 = total / area;

  return {
    estimatedCo2KgYear: Math.round(total),
    estimatedCo2KgM2Year: Math.round(perM2),
    emissionClass: perM2 < 10 ? "A" : perM2 < 20 ? "B" : perM2 < 35 ? "C" : perM2 < 50 ? "D" : perM2 < 70 ? "E" : perM2 < 90 ? "F" : "G",
    assumptions: ["Emisiile folosesc factori configurabili orientativi."]
  };
}

export function calculateConfidence(input, derived) {
  const important = [
    input.geometry.usefulAreaM2,
    input.general.constructionYear,
    input.envelope.walls.material,
    input.envelope.walls.insulated,
    input.envelope.windows.type,
    input.heating.mainSource,
    input.realConsumption.simple?.averageMonthlyElectricityCostRon,
    input.realConsumption.simple?.averageMonthlyGasCostRon,
    input.realConsumption.simple?.annualWoodCostRon,
    input.realConsumption.simple?.annualPelletsCostRon
  ];
  const completed = important.filter(hasValue).length;
  const score = Math.round((completed / important.length) * 100);
  const missingData = [];
  if (!hasValue(input.geometry.usefulAreaM2)) missingData.push("suprafața utilă");
  if (!hasValue(input.general.constructionYear)) missingData.push("anul construcției");
  if (!hasValue(input.heating.mainSource)) missingData.push("sursa de încălzire");
  if (!hasValue(input.realConsumption.simple?.averageMonthlyElectricityCostRon) && !hasValue(input.realConsumption.simple?.averageMonthlyGasCostRon) && !hasValue(input.realConsumption.simple?.annualWoodCostRon)) {
    missingData.push("costuri reale din ultimele facturi");
  }
  const level = score >= 75 ? "high" : score >= 45 ? "medium" : "low";
  const reasons = [
    level === "high"
      ? "Ai introdus atât caracteristicile locuinței, cât și date reale de consum."
      : level === "medium"
        ? "Ai introdus datele principale, dar lipsesc unele cantități exacte."
        : "Evaluarea se bazează pe multe estimări. Completează mai multe date pentru rezultate mai precise."
  ];
  if (derived.climate.confidence === "low") {
    reasons.push("Localitatea nu a putut fi mapată precis, deci s-a folosit o zonă climatică implicită.");
  }
  return { level, score, reasons, missingData };
}

export function calculateScore(input, derived, realConsumption) {
  let score = 100;
  const problems = [];

  function penalize(condition, amount, problem) {
    if (condition) {
      score -= amount;
      problems.push(problem);
    }
  }

  penalize(["poor", "very_poor"].includes(derived.envelope.wall.quality), derived.envelope.wall.quality === "very_poor" ? 20 : 14, problem("walls", "high", "Pereții pierd căldură", "Izolația pereților pare sub nivelul unei locuințe moderne."));
  penalize(["poor", "very_poor"].includes(derived.envelope.roof.quality), derived.envelope.roof.quality === "very_poor" ? 22 : 15, problem("roof", "high", "Podul sau acoperișul pierde căldură", "Acoperișul/podul pare insuficient izolat."));
  penalize(["poor", "very_poor"].includes(derived.envelope.floor.quality), 8, problem("floor", "medium", "Podeaua poate pierde căldură", "Podeaua nu pare izolată suficient."));
  penalize(["poor", "very_poor", "average"].includes(derived.envelope.windows.quality), derived.envelope.windows.quality === "very_poor" ? 16 : 10, problem("windows", "medium", "Ferestrele pot crește pierderile", "Ferestrele sunt estimate sub nivelul unor ferestre moderne."));
  penalize(["poor", "very_poor"].includes(derived.systems.heating.quality), 18, problem("heating", "high", "Încălzirea pare ineficientă", "Sistemul de încălzire poate consuma mai mult decât este necesar."));
  penalize(derived.systems.heating.controlQuality === "none", 5, problem("behavior", "medium", "Lipsește controlul încălzirii", "Fără termostat, consumul este mai greu de controlat."));
  penalize(derived.systems.lighting.quality === "poor", 4, problem("lighting", "low", "Iluminatul poate consuma inutil", "Becurile vechi cresc consumul electric."));

  if (input.renewables.photovoltaic.installed === "yes") score += 7;
  if (input.renewables.solarThermal.installed === "yes") score += 4;
  if (input.heating.mainSource === "heat_pump") {
    const cop = Number(derived.systems.heating.estimatedCop || derived.systems.heating.estimatedEfficiency);
    score += cop >= 2.8 ? 10 : cop >= 2.2 ? 5 : 0;
    if (cop && cop < 1.8) {
      score -= 5;
      problems.push(problem("heating", "high", "Pompa de caldura poate lucra in regim slab", "Fara distributie la temperatura joasa sau izolare buna, COP-ul poate scadea mult."));
    }
  }

  if (realConsumption.comparisonToModel === "much_higher_than_model") score -= 8;
  if (realConsumption.comparisonToModel === "higher_than_model") score -= 4;
  if (realConsumption.comparisonToModel === "lower_than_model") score += 2;

  score = clamp(Math.round(score), 0, 100);
  return { score, problems: problems.slice(0, 5) };
}

function problem(area, severity, title, explanation) {
  return {
    id: `${area}_${severity}`,
    area,
    severity,
    impact: severity === "critical" || severity === "high" ? "high" : severity,
    title,
    explanation
  };
}

export function estimatedEnergyClass(score) {
  if (score >= 90) return "A+";
  if (score >= 80) return "A";
  if (score >= 70) return "B";
  if (score >= 60) return "C";
  if (score >= 50) return "D";
  if (score >= 40) return "E";
  if (score >= 30) return "F";
  return "G";
}

export function generateRecommendations(input, derived, problems, costs) {
  const recommendations = [];
  const add = item => recommendations.push(item);

  if (["very_poor", "poor", "average"].includes(derived.envelope.roof.quality)) {
    add(rec("insulate_roof", "Izolează podul sau acoperișul", "insulation", "high", "medium", "high", 500, 1200, "Acoperișul este una dintre cele mai frecvente surse de pierderi.", "Verifică izolația podului și adaugă strat suplimentar unde lipsește.", ["roof"]));
  }
  if (["poor", "very_poor", "average"].includes(derived.envelope.wall.quality)) {
    add(rec("insulate_walls", "Îmbunătățește izolația pereților", "insulation", "high", "high", "very_high", 700, 1800, "Pereții par sub nivelul unei locuințe moderne.", "Planifică izolarea pereților exteriori sau verifică grosimea izolației existente.", ["walls"]));
  }
  if (["single_glazing", "old_double_glazing"].includes(input.envelope.windows.type)) {
    add(rec("replace_windows", "Înlocuiește ferestrele vechi", "windows", "medium", "high", "medium", 300, 900, "Ferestrele vechi pot pierde multă căldură.", "Compară costul înlocuirii cu impactul în confort și consum.", ["windows"]));
  }
  if (["poor", "very_poor"].includes(derived.systems.heating.quality)) {
    add(rec("modernize_heating", "Modernizează sistemul de încălzire", "heating", "high", "high", "high", 600, 1600, "Sistemul actual pare ineficient.", "Cere o evaluare pentru centrală eficientă, pompă de căldură sau alt sistem potrivit.", ["heating"]));
  }
  if (input.heating.mainSource === "heat_pump" && Number(derived.systems.heating.estimatedCop || 0) < 2.2) {
    add(rec("heat_pump_low_temperature_check", "Verifica regimul pompei de caldura", "heating", "high", "medium", "high", 300, 1200, "Pompa de caldura pare sa lucreze cu COP redus.", "Inainte de investitii mari, verifica daca poti reduce temperatura agentului prin izolatie, calorifere dimensionate mai mare sau incalzire in pardoseala.", ["heat_pump", "cop"]));
  }
  if (input.heating.control.thermostat === "no" || derived.systems.heating.controlQuality === "none") {
    add(rec("add_thermostat", "Adaugă un termostat", "controls", "high", "low", "medium", 150, 500, "Controlul temperaturii reduce consumul inutil.", "Instalează un termostat simplu sau smart pentru programarea încălzirii.", ["thermostat"]));
  }
  if (input.heating.distribution === "radiators" && input.heating.control.thermostaticValves !== "yes") {
    add(rec("thermostatic_valves", "Montează robineți termostatați", "controls", "medium", "low", "medium", 150, 450, "Camerele pot avea nevoi diferite de temperatură.", "Adaugă robineți termostatați pentru control pe camere.", ["radiators"]));
  }
  if (input.lighting.dominantType !== "led") {
    add(rec("switch_led", "Treci la iluminat LED", "lighting", "medium", "low", "low", 80, 250, "Iluminatul vechi consumă mai mult decât LED.", "Înlocuiește treptat becurile folosite frecvent.", ["lighting"]));
  }
  if (input.general.buildingType !== "apartment" && input.renewables.photovoltaic.installed !== "yes") {
    add(rec("consider_pv", "Analizează panouri fotovoltaice", "renewables", "medium", "high", "medium", 500, 1500, "Panourile pot reduce costul electric, dar depind de acoperiș și consum.", "Verifică orientarea, umbrirea și profilul de consum înainte de investiție.", ["photovoltaic"]));
  }
  if (input.dhw.source === "electric_boiler") {
    add(rec("dhw_efficiency", "Optimizează apa caldă", "maintenance", "medium", "medium", "medium", 250, 700, "Apa caldă electrică poate avea cost ridicat.", "Verifică boilerul, izolarea țevilor și alternative mai eficiente.", ["dhw"]));
  }
  if (problems.length >= 4) {
    add(rec("professional_audit", "Discută cu un auditor energetic", "maintenance", "medium", "medium", "medium", undefined, undefined, "Mai multe zone au incertitudine sau performanță slabă.", "Cere o verificare profesională înainte de investiții mari.", ["confidence"]));
  }

  return recommendations
    .sort((a, b) => priorityWeight(b.priority) + impactWeight(b.impactLevel) - priorityWeight(a.priority) - impactWeight(a.impactLevel))
    .slice(0, 6);
}

function rec(id, title, category, priority, costLevel, impactLevel, min, max, reason, action, triggeredBy) {
  const investment = investmentRange(category, costLevel);
  const paybackMin = min && investment.min ? investment.min / min : undefined;
  const paybackMax = max && investment.max ? investment.max / max : undefined;
  return {
    id,
    title,
    category,
    priority,
    costLevel,
    impactLevel,
    estimatedSavingsRonYearMin: min,
    estimatedSavingsRonYearMax: max,
    estimatedSavingsPercentMin: min ? 5 : undefined,
    estimatedSavingsPercentMax: max ? 18 : undefined,
    estimatedInvestmentRonMin: investment.min,
    estimatedInvestmentRonMax: investment.max,
    investmentEstimateSource: "internal_estimate",
    paybackYearsMin: paybackMin ? Math.max(0.5, Number(paybackMin.toFixed(1))) : undefined,
    paybackYearsMax: paybackMax ? Math.max(0.5, Number(paybackMax.toFixed(1))) : undefined,
    reason,
    action,
    userFacingExplanation: `${reason} ${action}`,
    triggeredBy
  };
}

function investmentRange(category, costLevel) {
  const byCategory = {
    insulation: { low: [1500, 3500], medium: [3500, 9000], high: [9000, 26000], very_high: [18000, 45000] },
    windows: { low: [2500, 5000], medium: [5000, 12000], high: [10000, 24000], very_high: [18000, 40000] },
    heating: { low: [700, 1800], medium: [1800, 6000], high: [8000, 35000], very_high: [25000, 60000] },
    controls: { low: [250, 900], medium: [900, 2500], high: [2500, 6000], very_high: [6000, 12000] },
    lighting: { low: [150, 800], medium: [800, 2000], high: [2000, 5000], very_high: [5000, 10000] },
    renewables: { low: [3000, 7000], medium: [7000, 18000], high: [18000, 38000], very_high: [38000, 80000] },
    maintenance: { low: [300, 1000], medium: [1000, 3500], high: [3500, 9000], very_high: [9000, 20000] }
  };
  const range = byCategory[category]?.[costLevel] || [1000, 5000];
  return { min: range[0], max: range[1] };
}

function priorityWeight(value) {
  return { urgent: 4, high: 3, medium: 2, low: 1 }[value] || 0;
}

function impactWeight(value) {
  return { very_high: 4, high: 3, medium: 2, low: 1 }[value] || 0;
}

export function buildEnergyProfile(rawInput = {}) {
  const input = normalizeUserInputs(rawInput);
  const derived = {};
  derived.building = deriveBuilding(input);
  derived.climate = deriveClimate(input);
  derived.geometry = deriveGeometry(input);
  derived.envelope = deriveEnvelope(input);
  derived.systems = deriveSystems(input, derived.climate, derived.envelope);
  derived.demand = estimateDemand(input, derived);
  derived.realConsumption = deriveRealConsumption(input, derived.demand.estimatedFinalEnergyKwhYear);
  derived.emissions = estimateCo2(input, derived.demand, derived.realConsumption);

  const costs = estimateCosts(input, derived.demand, derived.realConsumption);
  const confidence = calculateConfidence(input, derived);
  const scoring = calculateScore(input, derived, derived.realConsumption);
  const recommendations = generateRecommendations(input, derived, scoring.problems, costs);
  const totalSavingsMin = recommendations.slice(0, 3).reduce((sum, item) => sum + (item.estimatedSavingsRonYearMin || 0), 0);
  const totalSavingsMax = recommendations.slice(0, 3).reduce((sum, item) => sum + (item.estimatedSavingsRonYearMax || 0), 0);
  const assessment = {
    score: scoring.score,
    estimatedEnergyClass: estimatedEnergyClass(scoring.score),
    mainConclusion: mainConclusion(scoring.score),
    shortExplanation: shortExplanation(scoring.score, scoring.problems),
    estimatedAnnualCostRon: costs.annualCostRon,
    estimatedAnnualSavingsMinRon: totalSavingsMin || undefined,
    estimatedAnnualSavingsMaxRon: totalSavingsMax || undefined,
    estimatedSavingsPercentMin: costs.annualCostRon && totalSavingsMin ? Math.round((totalSavingsMin / costs.annualCostRon) * 100) : undefined,
    estimatedSavingsPercentMax: costs.annualCostRon && totalSavingsMax ? Math.round((totalSavingsMax / costs.annualCostRon) * 100) : undefined,
    benchmark: {
      comparedTo: "similar_homes",
      result: scoring.score >= 80 ? "better" : scoring.score >= 60 ? "average" : "worse",
      explanation: scoring.score >= 70
        ? "Locuința pare apropiată sau peste media unei locuințe comparabile."
        : "Locuința pare să consume mai mult decât o locuință modernă similară."
    },
    topProblems: scoring.problems.slice(0, 3),
    confidence
  };

  return {
    input,
    derived,
    assessment,
    recommendations,
    metadata: {
      calculationVersion: "lacurent-residential-v1",
      generatedAt: new Date().toISOString(),
      disclaimer: ENERGY_ASSESSMENT_DISCLAIMER
    }
  };
}

function mainConclusion(score) {
  if (score >= 80) return "Locuința are o eficiență bună.";
  if (score >= 60) return "Locuința are eficiență medie, cu potențial clar de îmbunătățire.";
  if (score >= 40) return "Locuința pare să piardă energie în zone importante.";
  return "Locuința are nevoie de măsuri prioritare pentru reducerea consumului.";
}

function shortExplanation(score, problems) {
  if (!problems.length) return "Datele introduse indică o locuință relativ eficientă pentru profilul analizat.";
  const areas = problems.map(item => item.title.toLowerCase()).slice(0, 2).join(" și ");
  return `Scorul este influențat în principal de: ${areas}.`;
}

export const demoOldHouseInput = {
  user_type: "residential",
  building_type: "house",
  usage_type: "permanent",
  city: "Sat rural",
  construction_year: 1964,
  useful_area_m2: 65,
  number_of_floors: 1,
  occupants: 2,
  wall_material: "Cărămidă",
  wall_insulation: "5cm",
  roof_type: "unheated_attic",
  roof_insulated: "unknown",
  floor_type: "on_ground",
  floor_insulated: "unknown",
  window_type: "old_double_glazing",
  heating_source: "wood",
  heating_system_type: "stove",
  thermostat: "no",
  thermostatic_valves: "no",
  ventilation_type: "natural",
  dhw_source: "same_as_heating",
  lighting_type: "mixed",
  pv_installed: "no",
  solar_thermal_installed: "no",
  annual_wood_cost: 2800,
  annual_wood_m3: 7,
  monthly_electricity_cost: 160
};
