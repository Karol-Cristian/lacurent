export const ROMANIAN_CLIMATE_ZONE_REGISTRY_VERSION = "mc001_2022_climate_zones_p5a_v1";

export const ROMANIAN_CLIMATE_ZONE_IDS = Object.freeze(["I", "II", "III", "IV", "V"]);
export const ROMANIAN_WIND_ZONE_IDS = Object.freeze(["I", "II", "III", "IV"]);

const MC001_PDF = "docs/Mc_001-2022_-_Metodologie_calcul_performanta_energetica_caldiri.pdf";

function deepClone(value) {
  return JSON.parse(JSON.stringify(value));
}

function zoneRecord(zoneId) {
  return Object.freeze({
    zoneId,
    label: `Zona climatică ${zoneId}`,
    country: "RO",
    datasetId: "mc001_2022_climate_zone_identifiers",
    datasetVersion: ROMANIAN_CLIMATE_ZONE_REGISTRY_VERSION,
    sourceType: "mc001_2022_official_pdf",
    sourceReferences: Object.freeze([
      "MC001-2022, Capitolul 2.2.1.1, Tabel 2.5, pagina PDF text 62",
      "MC001-2022, Capitolul 2.2.1.2, Tabel 2.8, pagina PDF text 64",
      "MC001-2022, Capitolul 2.2.1-2.2.2, Tabel 2.10a/2.10b, pagini PDF text 73-74"
    ]),
    monthlyClimateStatus: "monthly_temperature_and_solar_dataset_not_reproduced_in_mc001_pdf_body",
    localityMappingStatus: "locality_mapping_not_available_in_mc001_pdf_body"
  });
}

export const ROMANIAN_CLIMATE_ZONES = Object.freeze(
  ROMANIAN_CLIMATE_ZONE_IDS.map(zoneRecord)
);

export const ROMANIAN_LOCALITY_CLIMATE_REGISTRY = Object.freeze([]);

export const ROMANIAN_CLIMATE_COVERAGE = Object.freeze({
  coverageId: "romanian_climate_zone_coverage_p5a_v1",
  datasetVersion: ROMANIAN_CLIMATE_ZONE_REGISTRY_VERSION,
  country: "RO",
    totalClimateZones: 5,
    coveredClimateZones: 5,
    totalWindZonesIdentifiedInMc001Forms: 4,
    coveredWindZones: 4,
    sourceBackedLocalityStationMappings: 42,
    totalSourceBackedLocalityMappings: 0,
    exactLocalityProfiles: 0,
    stationMappings: 42,
    zoneMappings: 0,
    unsupportedLocalities: "not_enumerated_in_mc001_pdf_body",
  externalSourceDependencies: Object.freeze([
    Object.freeze({
      dependencyId: "official_romanian_locality_to_climate_zone_mapping",
      status: "not_reproduced_in_ingested_mc001_6_2013_tables",
      requiredFor: "automatic county/locality climate-zone and wind-zone assignment"
    }),
    Object.freeze({
      dependencyId: "official_monthly_temperature_and_solar_climate_dataset",
      status: "monthly_temperature_and_mc001_1_2006_a9_6_solar_source_packed_where_station_is_covered",
      requiredFor:
        "normative monthly exterior temperature and irradiation profiles by location/zone"
    })
  ])
});

function range(min, max, comparator = "between_inclusive") {
  return Object.freeze({ min, max, comparator });
}

export const MC001_SOLAR_FACTOR_GN_RECOMMENDATIONS = Object.freeze({
  datasetId: "mc001_2022_tables_2_5_2_8_solar_factor_gn",
  datasetVersion: ROMANIAN_CLIMATE_ZONE_REGISTRY_VERSION,
  unit: "dimensionless",
  source: MC001_PDF,
  sourceReferences: Object.freeze([
    "MC001-2022, Tabel 2.5, pagina PDF text 62",
    "MC001-2022, Tabel 2.8, pagina PDF text 64"
  ]),
  residential: Object.freeze({
    exposedToDirectSolarRadiation: Object.freeze({
      I: range(0.30, 0.37),
      II: range(0.33, 0.43),
      III: range(0.37, 0.47),
      IV: range(0.43, 0.50),
      V: range(0.50, null, "greater_than")
    }),
    notExposedToDirectSolarRadiation: Object.freeze({
      I: range(0.50, null, "greater_than"),
      II: range(0.50, null, "greater_than"),
      III: range(0.50, null, "greater_than"),
      IV: range(0.50, null, "greater_than"),
      V: range(0.50, null, "greater_than")
    })
  }),
  nonResidential: Object.freeze({
    exposedToDirectSolarRadiation: Object.freeze({
      I: range(0.18, 0.35),
      II: range(0.21, 0.38),
      III: range(0.24, 0.40),
      IV: range(0.27, 0.43),
      V: range(0.40, null, "greater_than")
    }),
    notExposedToDirectSolarRadiation: Object.freeze({
      I: range(0.50, null, "greater_than"),
      II: range(0.50, null, "greater_than"),
      III: range(0.50, null, "greater_than"),
      IV: range(0.50, null, "greater_than"),
      V: range(0.50, null, "greater_than")
    })
  })
});

const ENERGY_LIMIT_BUILDING_TYPES = Object.freeze([
  "office",
  "education",
  "residential_collective",
  "residential_individual",
  "healthcare",
  "tourism",
  "commercial",
  "sports"
]);

function limit(primaryEnergyKwhM2Year, co2KgM2Year) {
  return Object.freeze({
    primaryEnergyKwhM2Year,
    co2KgM2Year,
    sourceStatus: "source_backed_lookup_only_not_certificate_engine"
  });
}

export const MC001_NZEB_LIMITS_TABLE_2_10A = Object.freeze({
  datasetId: "mc001_2022_table_2_10a_nzeb_primary_co2_limits",
  datasetVersion: ROMANIAN_CLIMATE_ZONE_REGISTRY_VERSION,
  source: MC001_PDF,
  sourceReference: "MC001-2022, Tabel 2.10a, pagini PDF text 73-74",
  yearFrom: 2022,
  unit: Object.freeze({
    specificEnergyLimit: "kWh/(m2*an)",
    co2Limit: "kg/(m2*an)"
  }),
  buildingTypes: ENERGY_LIMIT_BUILDING_TYPES,
  values: Object.freeze({
    I: Object.freeze({
      office: limit(94.7, 10.1),
      education: limit(61.6, 7.3),
      residential_collective: limit(99.1, 12.0),
      residential_individual: limit(120.1, 14.7),
      healthcare: limit(162.5, 19.0),
      tourism: limit(96.5, 11.7),
      commercial: limit(95.5, 11.0),
      sports: limit(93.4, 10.4)
    }),
    II: Object.freeze({
      office: limit(98.4, 10.9),
      education: limit(66.8, 8.1),
      residential_collective: limit(103.7, 12.8),
      residential_individual: limit(127.9, 16.0),
      healthcare: limit(168.8, 20.2),
      tourism: limit(101.0, 12.5),
      commercial: limit(102.9, 12.2),
      sports: limit(98.2, 11.3)
    }),
    III: Object.freeze({
      office: limit(98.9, 11.5),
      education: limit(71.0, 8.8),
      residential_collective: limit(105.9, 13.5),
      residential_individual: limit(133.3, 17.1),
      healthcare: limit(170.9, 21.1),
      tourism: limit(103.7, 13.1),
      commercial: limit(107.7, 13.3),
      sports: limit(100.3, 12.0)
    }),
    IV: Object.freeze({
      office: limit(100.6, 12.2),
      education: limit(76.5, 9.7),
      residential_collective: limit(109.5, 14.3),
      residential_individual: limit(140.6, 18.5),
      healthcare: limit(174.8, 22.3),
      tourism: limit(107.4, 13.9),
      commercial: limit(114.5, 14.6),
      sports: limit(103.8, 12.9)
    }),
    V: Object.freeze({
      office: limit(102.6, 13.0),
      education: limit(82.0, 10.6),
      residential_collective: limit(113.1, 15.1),
      residential_individual: limit(147.9, 19.9),
      healthcare: limit(179.3, 23.5),
      tourism: limit(111.6, 14.7),
      commercial: limit(121.4, 16.0),
      sports: limit(107.5, 13.7)
    })
  })
});

export const MC001_RENOVATION_LIMITS_TABLE_2_10B = Object.freeze({
  datasetId: "mc001_2022_table_2_10b_renovation_primary_co2_limits",
  datasetVersion: ROMANIAN_CLIMATE_ZONE_REGISTRY_VERSION,
  source: MC001_PDF,
  sourceReference: "MC001-2022, Tabel 2.10b, pagina PDF text 74",
  yearFrom: 2022,
  unit: Object.freeze({
    specificEnergyLimit: "kWh/(m2*an)",
    co2Limit: "kg/(m2*an)"
  }),
  buildingTypes: ENERGY_LIMIT_BUILDING_TYPES,
  values: Object.freeze({
    I: Object.freeze({
      office: limit(113.5, 15.4),
      education: limit(72.5, 10.9),
      residential_collective: limit(116.4, 17.9),
      residential_individual: limit(143.2, 22.1),
      healthcare: limit(191.9, 28.4),
      tourism: limit(113.0, 17.4),
      commercial: limit(113.1, 16.5),
      sports: limit(111.2, 15.7)
    }),
    II: Object.freeze({
      office: limit(117.3, 16.5),
      education: limit(78.2, 12.0),
      residential_collective: limit(121.2, 19.1),
      residential_individual: limit(149.1, 26.3),
      healthcare: limit(198.4, 30.1),
      tourism: limit(117.8, 18.5),
      commercial: limit(121.1, 18.3),
      sports: limit(116.2, 16.9)
    }),
    III: Object.freeze({
      office: limit(116.9, 17.2),
      education: limit(82.7, 13.1),
      residential_collective: limit(123.1, 19.9),
      residential_individual: limit(156.8, 25.5),
      healthcare: limit(199.6, 31.3),
      tourism: limit(120.4, 19.4),
      commercial: limit(125.8, 19.7),
      sports: limit(117.9, 17.9)
    }),
    IV: Object.freeze({
      office: limit(117.7, 18.2),
      education: limit(88.6, 14.4),
      residential_collective: limit(126.4, 21.1),
      residential_individual: limit(164.1, 27.5),
      healthcare: limit(202.9, 32.9),
      tourism: limit(124.3, 20.6),
      commercial: limit(132.7, 21.6),
      sports: limit(121.3, 19.1)
    }),
    V: Object.freeze({
      office: limit(119.3, 19.2),
      education: limit(94.4, 15.6),
      residential_collective: limit(130.0, 22.3),
      residential_individual: limit(171.6, 29.5),
      healthcare: limit(206.8, 34.5),
      tourism: limit(128.4, 21.7),
      commercial: limit(139.8, 23.5),
      sports: limit(124.6, 20.3)
    })
  })
});

export const ROMANIAN_CLIMATE_SOURCE_INVENTORY = Object.freeze([
  Object.freeze({
    inventoryId: "mc001_climate_zone_identifiers_i_v",
    source: MC001_PDF,
    sourceLocation: "MC001-2022, Figura 2.1 plus Chapter 2.2, Tabel 2.5, 2.8, 2.10a, 2.10b",
    status: "implemented_lookup",
    runtimeUse: "Building DNA climate-zone identity, winter design-temperature lookup and zone-dependent requirement lookups",
    containsMonthlyClimateInputs: false
  }),
  Object.freeze({
    inventoryId: "mc001_figure_2_1_winter_design_temperature_by_zone",
    source: MC001_PDF,
    sourceLocation: "MC001-2022, Figura 2.1, pagina Monitorul Oficial 43",
    status: "implemented_lookup",
    runtimeUse: "heating exterior design-temperature identity by climate zone I-V",
    containsMonthlyClimateInputs: false
  }),
  Object.freeze({
    inventoryId: "mc001_wind_zone_identifiers_i_iv",
    source: MC001_PDF,
    sourceLocation: "MC001-2022 certificate/audit forms list wind zones I-IV",
    status: "represented_as_input",
    runtimeUse: "canonical location/climate metadata; no Chapter 2/3 formula in current runtime consumes it",
    containsMonthlyClimateInputs: false
  }),
  Object.freeze({
    inventoryId: "mc001_table_2_5_residential_gn_by_climate_zone",
    source: MC001_PDF,
    sourceLocation: "MC001-2022, Tabel 2.5, pagina PDF text 62",
    status: "implemented_lookup",
    runtimeUse: "zone-dependent solar-factor recommendation diagnostic",
    containsMonthlyClimateInputs: false
  }),
  Object.freeze({
    inventoryId: "mc001_table_2_8_non_residential_gn_by_climate_zone",
    source: MC001_PDF,
    sourceLocation: "MC001-2022, Tabel 2.8, pagina PDF text 64",
    status: "implemented_lookup",
    runtimeUse: "zone-dependent solar-factor recommendation diagnostic",
    containsMonthlyClimateInputs: false
  }),
  Object.freeze({
    inventoryId: "mc001_table_2_10a_nzeb_limits_by_climate_zone",
    source: MC001_PDF,
    sourceLocation: "MC001-2022, Tabel 2.10a, pagini PDF text 73-74",
    status: "implemented_lookup_not_active_energy_certificate",
    runtimeUse: "threshold registry only; product does not calculate primary energy or CO2 certificate outputs",
    containsMonthlyClimateInputs: false
  }),
  Object.freeze({
    inventoryId: "mc001_table_2_10b_renovation_limits_by_climate_zone",
    source: MC001_PDF,
    sourceLocation: "MC001-2022, Tabel 2.10b, pagina PDF text 74",
    status: "implemented_lookup_not_active_energy_certificate",
    runtimeUse: "threshold registry only; product does not calculate primary energy or CO2 certificate outputs",
    containsMonthlyClimateInputs: false
  }),
  Object.freeze({
    inventoryId: "mc001_monthly_temperature_and_solar_climate_annex",
    source: MC001_PDF,
    sourceLocation:
      "MC001-2022, Anexa D, pagina Monitorul Oficial 597; delegates climate parameters to Mc001/6-2013",
    status: "implemented_temperature_and_a9_6_solar_where_source_locality_is_covered",
    runtimeUse:
      "monthly exterior temperature is source-packed from Mc001/6-2013 Tabel II.1; monthly mean daily solar irradiance source rows are source-packed from Mc001/1-2-3/2006 Anexa A.9.6 for the 30 localities reproduced there; source-backed Hsol is exposed for tabulated vertical/horizontal planes; source-backed Qsol still requires Qsky and complete solar-element inputs or certified explicit input",
    containsMonthlyClimateInputs: true,
    implementedArtifacts: Object.freeze([
      "Mc001/6-2013 Tabel II.1 monthly mean exterior temperature for 42 localities",
      "Mc001/6-2013 Tabel II.2 monthly mean relative humidity for 42 localities",
      "Mc001/6-2013 Tabel III.1 winter design-day temperature for 41 localities",
      "Mc001/6-2013 Tabel III.2 winter design-pentad temperature for 41 localities",
      "Mc001/6-2013 Tabel IV.1 summer design-day temperature for 41 localities",
      "Mc001/6-2013 Tabel IV.2 summer design-pentad temperature for 41 localities",
      "P7B source-backed Hsol integration from A.9.6 W/m2 rows to kWh/m2 for tabulated vertical/horizontal planes"
    ]),
    solarArtifact:
      "Mc001/1-2-3/2006 Anexa A.9.6 monthly mean daily total and diffuse solar irradiance source rows for 30 localities",
    solarPreprocessingBoundary:
      "A.9.6 W/m2 rows are exposed as Hsol [kWh/m2] for tabulated vertical/horizontal planes; Qsol remains bounded by Qsky-compatible inputs, complete solar element inputs, and SR EN ISO 52010-1 for non-tabulated tilted surfaces."
  })
]);

export function validateRomanianClimateZone(zoneId) {
  return ROMANIAN_CLIMATE_ZONE_IDS.includes(zoneId);
}

export function validateRomanianWindZone(windZone) {
  return windZone == null || windZone === "" || ROMANIAN_WIND_ZONE_IDS.includes(windZone);
}

export function listRomanianClimateZones() {
  return ROMANIAN_CLIMATE_ZONES.map(deepClone);
}

export function getRomanianClimateZone(zoneId) {
  const zone = ROMANIAN_CLIMATE_ZONES.find(entry => entry.zoneId === zoneId);
  return zone ? deepClone(zone) : null;
}

export function resolveRomanianLocationClimate({
  country = "RO",
  countyCode = null,
  countyName = null,
  localityId = null,
  localityName = null,
  climateZone = null,
  windZone = null,
  manualOverride = false,
  overrideReason = null
} = {}) {
  const normalizedZone = String(climateZone ?? "").trim().toUpperCase();
  const normalizedWindZone = String(windZone ?? "").trim().toUpperCase();
  const diagnostics = [];

  if (country !== "RO") {
    diagnostics.push({
      code: "romanian_climate_registry_supports_ro_only",
      severity: "blocking"
    });
  }
  if (normalizedZone && !validateRomanianClimateZone(normalizedZone)) {
    diagnostics.push({
      code: "invalid_romanian_climate_zone",
      severity: "blocking"
    });
  }
  if (normalizedWindZone && !validateRomanianWindZone(normalizedWindZone)) {
    diagnostics.push({
      code: "invalid_romanian_wind_zone",
      severity: "blocking"
    });
  }
  if (!normalizedZone) {
    diagnostics.push({
      code: "CLIMATE_SELECTION_REQUIRED",
      severity: "warning"
    });
  }
  if ((countyCode || countyName || localityId || localityName) && !normalizedZone) {
    diagnostics.push({
      code: "locality_mapping_not_available_in_mc001",
      severity: "warning"
    });
  }
  if (manualOverride && !overrideReason) {
    diagnostics.push({
      code: "climate_manual_override_reason_required",
      severity: "blocking"
    });
  }

  const blockers = diagnostics.filter(item => item.severity === "blocking");
  return {
    status: blockers.length === 0 ? "ready" : "blocked",
    location: {
      country,
      countyCode,
      countyName,
      localityId,
      localityName
    },
    climate: {
      schema: "building_dna_location_climate_v1",
      climateZone: normalizedZone || null,
      windZone: normalizedWindZone || null,
      datasetId: "mc001_2022_climate_zone_identifiers",
      datasetVersion: ROMANIAN_CLIMATE_ZONE_REGISTRY_VERSION,
      assignmentOrigin: normalizedZone
        ? (manualOverride ? "manual_override" : "manual_zone_selection")
        : "not_selected",
      manualOverride: manualOverride === true,
      overrideReason: manualOverride ? overrideReason : null,
      localityMappingStatus: "locality_mapping_not_available_in_mc001",
      monthlyClimateStatus:
        "monthly_temperature_and_solar_dataset_not_reproduced_in_mc001_pdf_body",
      sourceReferences: [
        "MC001-2022, Chapter 2.2 climate-zone dependent tables",
        "docs/mc001-extraction/17_climate_annex.md"
      ]
    },
    diagnostics
  };
}

export function getSolarFactorRecommendation({
  climateZone,
  buildingUse = "residential",
  exposedToDirectSolarRadiation = true
} = {}) {
  if (!validateRomanianClimateZone(climateZone)) {
    return { status: "blocked", code: "invalid_romanian_climate_zone" };
  }
  const useKey = buildingUse === "non_residential" ? "nonResidential" : "residential";
  const exposureKey = exposedToDirectSolarRadiation
    ? "exposedToDirectSolarRadiation"
    : "notExposedToDirectSolarRadiation";
  return {
    status: "ready",
    climateZone,
    buildingUse: useKey,
    exposedToDirectSolarRadiation,
    recommendation: deepClone(
      MC001_SOLAR_FACTOR_GN_RECOMMENDATIONS[useKey][exposureKey][climateZone]
    ),
    unit: "dimensionless",
    sourceReference:
      useKey === "residential"
        ? "MC001-2022, Tabel 2.5"
        : "MC001-2022, Tabel 2.8"
  };
}

export function getMc001PrimaryCo2Limit({
  climateZone,
  buildingType,
  status = "nzeb"
} = {}) {
  if (!validateRomanianClimateZone(climateZone)) {
    return { status: "blocked", code: "invalid_romanian_climate_zone" };
  }
  if (!ENERGY_LIMIT_BUILDING_TYPES.includes(buildingType)) {
    return { status: "blocked", code: "unsupported_mc001_limit_building_type" };
  }
  const table = status === "renovation"
    ? MC001_RENOVATION_LIMITS_TABLE_2_10B
    : MC001_NZEB_LIMITS_TABLE_2_10A;
  return {
    status: "ready",
    climateZone,
    buildingType,
    buildingStatus: status,
    limit: deepClone(table.values[climateZone][buildingType]),
    unit: deepClone(table.unit),
    sourceReference: table.sourceReference,
    productScope:
      "lookup_only_current_product_does_not_calculate_primary_energy_or_co2_certificate_values"
  };
}

export function getClimateZoneDependentRequirements({ climateZone, buildingUse = "residential" } = {}) {
  if (!validateRomanianClimateZone(climateZone)) {
    return { status: "blocked", code: "invalid_romanian_climate_zone" };
  }
  const buildingType = buildingUse === "non_residential" ? "office" : "residential_individual";
  return {
    status: "ready",
    climateZone,
    solarFactor: getSolarFactorRecommendation({ climateZone, buildingUse }),
    nzebLimit: getMc001PrimaryCo2Limit({
      climateZone,
      buildingType,
      status: "nzeb"
    }),
    renovationLimit: getMc001PrimaryCo2Limit({
      climateZone,
      buildingType,
      status: "renovation"
    })
  };
}
