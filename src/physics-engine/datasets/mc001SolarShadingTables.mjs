const TABLE_2_16 = "MC001-2022 Tabel 2.16";
const TABLE_2_17 = "MC001-2022 Tabel 2.17";
const TABLE_2_18 = "MC001-2022 Tabel 2.18";

const TABLE_2_16_SCOPE = "solar_shading_table_2_16_explicit_device_lookup";
const TABLE_2_17_18_SCOPE =
  "obstacle_shading_tables_2_17_2_18_explicit_month_orientation_lookup";
const RELATION_2_40_SCOPE = "solar_transmittance_relation_2_40_explicit_ggl_n";

const MONTH_TO_SEASON = Object.freeze({
  january: "winter",
  february: "winter",
  march: "winter",
  april: "winter",
  may: "winter",
  june: "summer",
  july: "summer",
  august: "summer",
  september: "summer",
  october: "winter",
  november: "winter",
  december: "winter"
});

function shadingDeviceEntry({
  id,
  deviceRo,
  absorption,
  transmission,
  fshInterior,
  fshExterior
}) {
  return Object.freeze({
    id,
    deviceRo,
    absorption,
    transmission,
    fshInterior,
    fshExterior,
    sourceTable: TABLE_2_16,
    sourceSection: "2.7.3",
    sourcePage: 105,
    scope: TABLE_2_16_SCOPE
  });
}

export const shadingReductionTable2_16Entries = Object.freeze([
  shadingDeviceEntry({
    id: "white_venetian_blinds_abs_0_1_trans_0_05",
    deviceRo: "Storuri venetiene albe",
    absorption: 0.1,
    transmission: 0.05,
    fshInterior: 0.25,
    fshExterior: 0.1
  }),
  shadingDeviceEntry({
    id: "white_venetian_blinds_abs_0_1_trans_0_1",
    deviceRo: "Storuri venetiene albe",
    absorption: 0.1,
    transmission: 0.1,
    fshInterior: 0.3,
    fshExterior: 0.15
  }),
  shadingDeviceEntry({
    id: "white_venetian_blinds_abs_0_1_trans_0_3",
    deviceRo: "Storuri venetiene albe",
    absorption: 0.1,
    transmission: 0.3,
    fshInterior: 0.45,
    fshExterior: 0.35
  }),
  shadingDeviceEntry({
    id: "white_curtains_abs_0_1_trans_0_5",
    deviceRo: "Perdele albe",
    absorption: 0.1,
    transmission: 0.5,
    fshInterior: 0.65,
    fshExterior: 0.55
  }),
  shadingDeviceEntry({
    id: "white_curtains_abs_0_1_trans_0_7",
    deviceRo: "Perdele albe",
    absorption: 0.1,
    transmission: 0.7,
    fshInterior: 0.8,
    fshExterior: 0.75
  }),
  shadingDeviceEntry({
    id: "white_curtains_abs_0_1_trans_0_9",
    deviceRo: "Perdele albe",
    absorption: 0.1,
    transmission: 0.9,
    fshInterior: 0.95,
    fshExterior: 0.95
  }),
  shadingDeviceEntry({
    id: "colored_textiles_abs_0_3_trans_0_1",
    deviceRo: "Textile colorate",
    absorption: 0.3,
    transmission: 0.1,
    fshInterior: 0.42,
    fshExterior: 0.17
  }),
  shadingDeviceEntry({
    id: "colored_textiles_abs_0_3_trans_0_3",
    deviceRo: "Textile colorate",
    absorption: 0.3,
    transmission: 0.3,
    fshInterior: 0.57,
    fshExterior: 0.37
  }),
  shadingDeviceEntry({
    id: "colored_textiles_abs_0_3_trans_0_5",
    deviceRo: "Textile colorate",
    absorption: 0.3,
    transmission: 0.5,
    fshInterior: 0.77,
    fshExterior: 0.57
  }),
  shadingDeviceEntry({
    id: "aluminium_coated_textiles_abs_0_2_trans_0_05",
    deviceRo: "Textile acoperite cu aluminiu",
    absorption: 0.2,
    transmission: 0.05,
    fshInterior: 0.2,
    fshExterior: 0.08
  })
]);

function obstacleEntry({ season, table, orientation, weights, solarAltitudesDegrees, fsolDir }) {
  return Object.freeze({
    id: `${season}_${orientation.toLowerCase()}`,
    season,
    table,
    orientation,
    weights: Object.freeze(weights),
    solarAltitudesDegrees: Object.freeze(solarAltitudesDegrees),
    fsolDir,
    sourceTable: table === "2.17" ? TABLE_2_17 : TABLE_2_18,
    sourceSection: "2.7.3",
    sourcePages: Object.freeze(table === "2.17" ? [108] : [108, 109]),
    scope: TABLE_2_17_18_SCOPE,
    latitudeReference: "40_degrees_north"
  });
}

const winterRows = [
  ["N", [0, 0, 0, 0], [null, null, null, null], 0],
  ["NE", [0, 0, 0, 1], [null, null, null, 7.6], 0.1],
  ["E", [0, 0, 0.31, 0.69], [null, null, 9, 20.8], 0.5],
  ["SE", [0, 0.14, 0.58, 0.28], [null, 9.2, 22.2, 24], 0.7],
  ["S", [0.06, 0.4, 0.47, 0.07], [9.4, 22.8, 22.6, 9.7], 0.75],
  ["SV", [0.22, 0.63, 0.15, 0], [24.2, 22, 9.6, null], 0.7],
  ["V", [0.7, 0.3, 0, 0], [20.6, 9.5, null, null], 0.5],
  ["NV", [1, 0, 0, 0], [8.7, null, null, null], 0.1]
];

const summerRows = [
  ["N", [0, 0, 0, 1], [null, null, null, 17.4], 0.1],
  ["NE", [0, 0, 0.62, 0.38], [null, null, 20.9, 50.2], 0.3],
  ["E", [0, 0.48, 0.48, 0.04], [null, 21.8, 52.5, 74.4], 0.45],
  ["SE", [0.33, 0.53, 0.1, 0.03], [23.2, 54, 74.4, 74.4], 0.55],
  ["S", [0.3, 0.2, 0.21, 0.29], [60.5, 74.4, 74.4, 60.7], 0.5],
  ["SV", [0.03, 0.11, 0.52, 0.34], [74.4, 74.4, 54.2, 23.1], 0.55],
  ["V", [0.04, 0.47, 0.49, 0], [74.4, 52.7, 21.8, null], 0.45],
  ["NV", [0.37, 0.63, 0, 0], [50.3, 20.9, null, null], 0.3]
];

export const obstacleShadingTable2_17_2_18Entries = Object.freeze([
  ...winterRows.map(([orientation, weights, solarAltitudesDegrees, fsolDir]) =>
    obstacleEntry({
      season: "winter",
      table: "2.17",
      orientation,
      weights,
      solarAltitudesDegrees,
      fsolDir
    })
  ),
  ...summerRows.map(([orientation, weights, solarAltitudesDegrees, fsolDir]) =>
    obstacleEntry({
      season: "summer",
      table: "2.18",
      orientation,
      weights,
      solarAltitudesDegrees,
      fsolDir
    })
  )
]);

export function listShadingReductionTable2_16Entries() {
  return shadingReductionTable2_16Entries;
}

export function findShadingReductionTable2_16EntryById(id) {
  return shadingReductionTable2_16Entries.find((entry) => entry.id === id) ?? null;
}

export function listObstacleShadingTable2_17_2_18Entries() {
  return obstacleShadingTable2_17_2_18Entries;
}

export function findObstacleShadingTableEntry({ season, orientation } = {}) {
  return obstacleShadingTable2_17_2_18Entries.find(
    (entry) => entry.season === season && entry.orientation === orientation
  ) ?? null;
}

function finiteNumber(value) {
  return typeof value === "number" && Number.isFinite(value) ? value : null;
}

function blocker(code) {
  return Object.freeze({ code, severity: "blocking" });
}

function diagnostics(blockers = []) {
  return Object.freeze({
    blockers: Object.freeze(blockers.map(blocker)),
    methodologyLimits: Object.freeze([
      "explicit_input_only",
      "explicit_table_selection_required",
      "no_default_shading_device",
      "no_default_orientation",
      "no_default_month",
      "no_default_solar_irradiation",
      "not_full_solar_gains",
      "not_QHnd",
      "not_QCnd",
      "not_final_energy",
      "not_certificate"
    ])
  });
}

function blocked(scope, code) {
  return Object.freeze({
    status: "blocked",
    scope,
    diagnostics: diagnostics([code])
  });
}

export function resolveShadingReductionTable2_16Value({
  shadingDeviceId,
  mountingSide
} = {}) {
  const selected = findShadingReductionTable2_16EntryById(shadingDeviceId);
  if (!selected) {
    return blocked(TABLE_2_16_SCOPE, "solar_shading_table_2_16_unknown_device");
  }
  if (!["interior", "exterior"].includes(mountingSide)) {
    return blocked(TABLE_2_16_SCOPE, "solar_shading_table_2_16_invalid_mounting_side");
  }

  const fsh = mountingSide === "interior" ? selected.fshInterior : selected.fshExterior;
  return Object.freeze({
    status: "ready",
    scope: TABLE_2_16_SCOPE,
    shadingDeviceId: selected.id,
    mountingSide,
    absorption: selected.absorption,
    transmission: selected.transmission,
    fsh,
    fshOrigin: "MC001_TABLE_2_16_EXPLICIT_SHADING_DEVICE_LOOKUP",
    sourceTable: selected.sourceTable,
    sourceSection: selected.sourceSection,
    sourcePage: selected.sourcePage,
    diagnostics: diagnostics()
  });
}

export function calculateAngleCorrectedSolarTransmittance2_40({ gglN } = {}) {
  const normalIncidenceValue = finiteNumber(gglN);
  if (normalIncidenceValue === null || normalIncidenceValue < 0 || normalIncidenceValue > 1) {
    return blocked(RELATION_2_40_SCOPE, "solar_transmittance_2_40_invalid_ggl_n");
  }

  return Object.freeze({
    status: "ready",
    scope: RELATION_2_40_SCOPE,
    gglN: normalIncidenceValue,
    ggl: 0.9 * normalIncidenceValue,
    gglOrigin: "MC001_RELATION_2_40_EXPLICIT_GGL_N",
    formulaCode: "MC001_RELATION_2_40_GGL_EQUALS_0_9_GGL_N",
    sourceRelation: "2.40",
    sourceSection: "2.7.3",
    sourcePage: 105,
    diagnostics: diagnostics()
  });
}

export function calculateShadedSolarTransmittanceWithTable2_16({
  gglN,
  shadingDeviceId,
  mountingSide
} = {}) {
  const base = calculateAngleCorrectedSolarTransmittance2_40({ gglN });
  if (base.status !== "ready") {
    return base;
  }

  const reduction = resolveShadingReductionTable2_16Value({
    shadingDeviceId,
    mountingSide
  });
  if (reduction.status !== "ready") {
    return reduction;
  }

  return Object.freeze({
    status: "ready",
    scope: TABLE_2_16_SCOPE,
    gglN: base.gglN,
    shadingDeviceId: reduction.shadingDeviceId,
    mountingSide: reduction.mountingSide,
    fsh: reduction.fsh,
    gglSh: base.ggl * reduction.fsh,
    gglShOrigin: "MC001_TABLE_2_16_AND_RELATION_2_40_EXPLICIT_INPUTS",
    formulaCode: "ggl_sh_wi = 0.9 * ggl_n_wi * fsh",
    sourceTables: Object.freeze([TABLE_2_16]),
    sourceRelations: Object.freeze(["2.40"]),
    sourcePages: Object.freeze([105]),
    diagnostics: diagnostics()
  });
}

export function resolveObstacleShadingParameters({ month, orientation } = {}) {
  const season = MONTH_TO_SEASON[month];
  if (!season) {
    return blocked(TABLE_2_17_18_SCOPE, "obstacle_shading_table_invalid_month");
  }
  const selected = findObstacleShadingTableEntry({ season, orientation });
  if (!selected) {
    return blocked(TABLE_2_17_18_SCOPE, "obstacle_shading_table_unknown_orientation");
  }

  return Object.freeze({
    status: "ready",
    scope: TABLE_2_17_18_SCOPE,
    month,
    season,
    orientation: selected.orientation,
    weights: selected.weights,
    solarAltitudesDegrees: selected.solarAltitudesDegrees,
    fsolDir: selected.fsolDir,
    obstacleParametersOrigin:
      "MC001_TABLES_2_17_2_18_EXPLICIT_MONTH_ORIENTATION_LOOKUP",
    sourceTable: selected.sourceTable,
    sourceSection: selected.sourceSection,
    sourcePages: selected.sourcePages,
    diagnostics: diagnostics()
  });
}
