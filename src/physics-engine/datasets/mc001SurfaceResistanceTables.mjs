const SOURCE_TABLE_2_11 = "MC001-2022 Tabel 2.11";
const SOURCE_TABLE_2_12 = "MC001-2022 Tabel 2.12";

function surfaceEntry({
  id,
  heatFlowDirection,
  boundaryGroup,
  hi,
  rsi,
  he,
  rse
}) {
  return Object.freeze({
    id,
    heatFlowDirection,
    boundaryGroup,
    hiWPerM2K: hi,
    rsiM2KPerW: rsi,
    heWPerM2K: he,
    rseM2KPerW: rse,
    sourceTable: SOURCE_TABLE_2_11,
    sourcePage: 78
  });
}

function exteriorEntry({ id, windSpeedMPerS, rse }) {
  return Object.freeze({
    id,
    windSpeedMPerS,
    rseM2KPerW: rse,
    sourceTable: SOURCE_TABLE_2_12,
    sourcePage: 78
  });
}

export const surfaceResistanceTable2_11Entries = Object.freeze([
  surfaceEntry({
    id: "outside_horizontal_heat_flow",
    heatFlowDirection: "horizontal_i_to_e_u",
    boundaryGroup: "exterior_or_open_passage",
    hi: 8,
    rsi: 0.125,
    he: 24,
    rse: 0.042
  }),
  surfaceEntry({
    id: "outside_upward_heat_flow",
    heatFlowDirection: "upward_i_to_e_u",
    boundaryGroup: "exterior_or_open_passage",
    hi: 8,
    rsi: 0.125,
    he: 24,
    rse: 0.042
  }),
  surfaceEntry({
    id: "outside_downward_heat_flow",
    heatFlowDirection: "downward_i_to_e_u",
    boundaryGroup: "exterior_or_open_passage",
    hi: 6,
    rsi: 0.167,
    he: 24,
    rse: 0.042
  }),
  surfaceEntry({
    id: "ventilated_unheated_horizontal_heat_flow",
    heatFlowDirection: "horizontal_i_to_e_u",
    boundaryGroup: "ventilated_unheated_space",
    hi: 8,
    rsi: 0.125,
    he: 12,
    rse: 0.084
  }),
  surfaceEntry({
    id: "ventilated_unheated_upward_heat_flow",
    heatFlowDirection: "upward_i_to_e_u",
    boundaryGroup: "ventilated_unheated_space",
    hi: 8,
    rsi: 0.125,
    he: 12,
    rse: 0.084
  }),
  surfaceEntry({
    id: "ventilated_unheated_downward_heat_flow",
    heatFlowDirection: "downward_i_to_e_u",
    boundaryGroup: "ventilated_unheated_space",
    hi: 6,
    rsi: 0.167,
    he: 12,
    rse: 0.084
  })
]);

export const exteriorSurfaceResistanceTable2_12Entries = Object.freeze([
  exteriorEntry({ id: "wind_1_m_per_s", windSpeedMPerS: 1, rse: 0.08 }),
  exteriorEntry({ id: "wind_2_m_per_s", windSpeedMPerS: 2, rse: 0.06 }),
  exteriorEntry({ id: "wind_3_m_per_s", windSpeedMPerS: 3, rse: 0.05 }),
  exteriorEntry({ id: "wind_5_m_per_s", windSpeedMPerS: 5, rse: 0.04 }),
  exteriorEntry({ id: "wind_7_m_per_s", windSpeedMPerS: 7, rse: 0.03 }),
  exteriorEntry({ id: "wind_10_m_per_s", windSpeedMPerS: 10, rse: 0.02 })
]);

export function findSurfaceResistanceTable2_11EntryById(id) {
  return surfaceResistanceTable2_11Entries.find((entry) => entry.id === id) ?? null;
}

export function findExteriorSurfaceResistanceTable2_12EntryById(id) {
  return exteriorSurfaceResistanceTable2_12Entries.find((entry) => entry.id === id) ?? null;
}
