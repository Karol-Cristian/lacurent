const SOURCE_TABLE = "MC001-2022 Tabel 2.13";
const SOURCE_SECTION = "2.4.2";
const SOURCE_PAGES = Object.freeze([83, 84]);
const SCOPE = "solar_transmission_table_2_13_explicit_glazing_type_lookup";

function exactEntry({ id, glazingTypeRo, normalizedType, gglN }) {
  return Object.freeze({
    id,
    glazingTypeRo,
    normalizedType,
    valueKind: "exact",
    gglN,
    gglNRange: null,
    requiresExplicitRangeValue: false,
    sourceTable: SOURCE_TABLE,
    sourceSection: SOURCE_SECTION,
    sourcePages: SOURCE_PAGES,
    scope: SCOPE
  });
}

function rangeEntry({ id, glazingTypeRo, normalizedType, min, max }) {
  return Object.freeze({
    id,
    glazingTypeRo,
    normalizedType,
    valueKind: "range_by_coating_type",
    gglN: null,
    gglNRange: Object.freeze([min, max]),
    requiresExplicitRangeValue: true,
    sourceTable: SOURCE_TABLE,
    sourceSection: SOURCE_SECTION,
    sourcePages: SOURCE_PAGES,
    scope: SCOPE,
    note: "MC001 marks this as dependent on the multifunction coating type; runtime must provide an explicit value inside the source range."
  });
}

export const solarTransmissionTable2_13Entries = Object.freeze([
  exactEntry({
    id: "single_clear_glazing",
    glazingTypeRo: "Vitraj simplu",
    normalizedType: "single clear glazing",
    gglN: 0.85
  }),
  exactEntry({
    id: "double_clear_glazing",
    glazingTypeRo: "Vitraj dublu",
    normalizedType: "double clear glazing",
    gglN: 0.75
  }),
  exactEntry({
    id: "double_window",
    glazingTypeRo: "Fereastra dubla",
    normalizedType: "double window",
    gglN: 0.75
  }),
  exactEntry({
    id: "triple_clear_glazing",
    glazingTypeRo: "Vitraj triplu",
    normalizedType: "triple clear glazing",
    gglN: 0.7
  }),
  exactEntry({
    id: "double_low_e_face_3",
    glazingTypeRo: "Vitraj dublu, cu emisivitate redusa pe fata 3",
    normalizedType: "double low-e glazing on face 3",
    gglN: 0.65
  }),
  rangeEntry({
    id: "double_multifunction_low_e_solar_control",
    glazingTypeRo:
      "Vitraj dublu, tratare cu functie multipla (emisivitate redusa + control solar)",
    normalizedType: "double multifunction low-e and solar-control glazing",
    min: 0.21,
    max: 0.55
  }),
  exactEntry({
    id: "triple_low_e_faces_2_and_5",
    glazingTypeRo: "Vitraj triplu, cu emisivitate redusa pe 2 fete (2 si 5)",
    normalizedType: "triple low-e glazing on faces 2 and 5",
    gglN: 0.5
  }),
  rangeEntry({
    id: "triple_multifunction_face_2_low_e_face_5",
    glazingTypeRo:
      "Vitraj triplu, tratare pe o fata (2) cu functie multipla si tratare pe fata 5 cu emisivitate redusa",
    normalizedType: "triple multifunction face 2 and low-e face 5 glazing",
    min: 0.19,
    max: 0.45
  })
]);

export function listSolarTransmissionTable2_13Entries() {
  return solarTransmissionTable2_13Entries;
}

export function findSolarTransmissionTable2_13EntryById(id) {
  return solarTransmissionTable2_13Entries.find((entry) => entry.id === id) ?? null;
}

function finiteNumber(value) {
  return typeof value === "number" && Number.isFinite(value) ? value : null;
}

function blocker(code) {
  return { code, severity: "blocking" };
}

function blocked(code) {
  return Object.freeze({
    status: "blocked",
    scope: SCOPE,
    gglN: null,
    diagnostics: Object.freeze({
      blockers: Object.freeze([blocker(code)]),
      methodologyLimits: Object.freeze([
        "explicit_glazing_type_required",
        "no_default_glazing_type",
        "no_default_multifunction_coating_selection",
        "no_default_orientation",
        "no_default_shading",
        "no_default_solar_irradiation",
        "not_full_solar_gains",
        "not_QHnd",
        "not_QCnd",
        "not_final_energy",
        "not_certificate"
      ])
    })
  });
}

export function resolveSolarTransmissionTable2_13Value({
  glazingTypeId,
  explicitGglN
} = {}) {
  const entry = findSolarTransmissionTable2_13EntryById(glazingTypeId);
  if (!entry) {
    return blocked("solar_transmission_table_2_13_unknown_glazing_type");
  }

  if (entry.valueKind === "exact") {
    return Object.freeze({
      status: "ready",
      scope: SCOPE,
      glazingTypeId: entry.id,
      gglN: entry.gglN,
      gglNOrigin: "MC001_TABLE_2_13_EXPLICIT_GLAZING_TYPE_LOOKUP",
      sourceTable: entry.sourceTable,
      sourceSection: entry.sourceSection,
      sourcePages: entry.sourcePages,
      diagnostics: Object.freeze({
        blockers: Object.freeze([]),
        methodologyLimits: Object.freeze([
          "explicit_glazing_type_required",
          "no_default_glazing_type",
          "not_full_solar_gains",
          "not_QHnd",
          "not_QCnd",
          "not_final_energy",
          "not_certificate"
        ])
      })
    });
  }

  const selectedGglN = finiteNumber(explicitGglN);
  if (selectedGglN === null) {
    return blocked("solar_transmission_table_2_13_missing_explicit_range_value");
  }

  const [min, max] = entry.gglNRange;
  if (selectedGglN < min || selectedGglN > max) {
    return blocked("solar_transmission_table_2_13_explicit_range_value_out_of_bounds");
  }

  return Object.freeze({
    status: "ready",
    scope: SCOPE,
    glazingTypeId: entry.id,
    gglN: selectedGglN,
    gglNOrigin: "explicit_value_within_MC001_TABLE_2_13_RANGE",
    sourceRange: entry.gglNRange,
    sourceTable: entry.sourceTable,
    sourceSection: entry.sourceSection,
    sourcePages: entry.sourcePages,
    diagnostics: Object.freeze({
      blockers: Object.freeze([]),
      methodologyLimits: Object.freeze([
        "explicit_glazing_type_required",
        "explicit_multifunction_coating_value_required_for_range_rows",
        "no_default_glazing_type",
        "no_default_multifunction_coating_selection",
        "not_full_solar_gains",
        "not_QHnd",
        "not_QCnd",
        "not_final_energy",
        "not_certificate"
      ])
    })
  });
}
