import { createHash } from "node:crypto";
import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { dirname, resolve } from "node:path";

const SOURCE_TXT = resolve("validation-reference/source-packs/mc001_6_2013_official.txt");
const SOURCE_PDF = resolve("validation-reference/source-packs/mc001_6_2013_official.pdf");
const OUTPUT_JSON = resolve("validation-reference/source-packs/mc001-6-2013-climate-extract.json");
const OUTPUT_MJS = resolve("src/climate-platform/datasets/mc001_6_2013ClimateDataset.mjs");

const SOURCE_URL = "https://www.mdlpa.ro/userfiles/reglementari/Domeniul_XXVII/27_11_MC_001_6_2013.pdf";
const EXPECTED_PDF_SHA256 = "74a67f87ae9da467ed76973e80b1002531d17b6532dcca26ece950ca5792c5b5";
const DATASET_VERSION = "mc001_6_2013_climate_dataset_p5b2_v1";

const MONTH_IDS = Object.freeze([
  "january",
  "february",
  "march",
  "april",
  "may",
  "june",
  "july",
  "august",
  "september",
  "october",
  "november",
  "december"
]);

const RAW_LOCALITY_NORMALIZATION = Object.freeze({
  "ALBA IULIA": ["alba_iulia", "Alba Iulia"],
  ALEXANDRIA: ["alexandria", "Alexandria"],
  ARAD: ["arad", "Arad"],
  "BAC\u0007U": ["bacau", "Bacau"],
  "Bac\u0002u": ["bacau", "Bacau"],
  "BAIA-MARE": ["baia_mare", "Baia Mare"],
  "Baia Mare": ["baia_mare", "Baia Mare"],
  "BISTRI\bA": ["bistrita", "Bistrita"],
  "Bistri\ba": ["bistrita", "Bistrita"],
  "BOTO ANI": ["botosani", "Botosani"],
  "Boto ani": ["botosani", "Botosani"],
  "BR\u0007ILA": ["braila", "Braila"],
  "Br\u0002ila": ["braila", "Braila"],
  "BRA OV": ["brasov", "Brasov"],
  "Bra ov": ["brasov", "Brasov"],
  "BUCURE TI": ["bucuresti", "Bucuresti"],
  "Bucure ti": ["bucuresti", "Bucuresti"],
  "BUZ\u0007U": ["buzau", "Buzau"],
  "Buz\u0002u": ["buzau", "Buzau"],
  "C\u0007L\u0007RA I": ["calarasi", "Calarasi"],
  "C\u0002l\u0002ra i": ["calarasi", "Calarasi"],
  "CLUJ-NAPOCA": ["cluj_napoca", "Cluj-Napoca"],
  Cluj: ["cluj_napoca", "Cluj-Napoca"],
  "CONSTAN\bA": ["constanta", "Constanta"],
  "Constan\ba": ["constanta", "Constanta"],
  CRAIOVA: ["craiova", "Craiova"],
  DEVA: ["deva", "Deva"],
  "DROBETA TURNU SEVERIN": ["drobeta_turnu_severin", "Drobeta Turnu Severin"],
  "Drobeta Tr. Severin": ["drobeta_turnu_severin", "Drobeta Turnu Severin"],
  "Dr. Tr. Severin": ["drobeta_turnu_severin", "Drobeta Turnu Severin"],
  "FOC ANI": ["focsani", "Focsani"],
  "Foc ani": ["focsani", "Focsani"],
  "GALA\bI": ["galati", "Galati"],
  "Gala\bi": ["galati", "Galati"],
  GIURGIU: ["giurgiu", "Giurgiu"],
  "GURA PORTI\bEI": ["gura_portitei", "Gura Portitei"],
  "IA I": ["iasi", "Iasi"],
  "Ia i": ["iasi", "Iasi"],
  "MIERCUREA CIUC": ["miercurea_ciuc", "Miercurea Ciuc"],
  "Miercurea Ciuc": ["miercurea_ciuc", "Miercurea Ciuc"],
  ORADEA: ["oradea", "Oradea"],
  "Piatra Neam\b": ["piatra_neamt", "Piatra Neamt"],
  "PIATRA NEAM\b": ["piatra_neamt", "Piatra Neamt"],
  "PITE TI": ["pitesti", "Pitesti"],
  "Pite ti": ["pitesti", "Pitesti"],
  "PLOIE TI": ["ploiesti", "Ploiesti"],
  "Ploie ti": ["ploiesti", "Ploiesti"],
  "RE I\bA": ["resita", "Resita"],
  "Re i\ba": ["resita", "Resita"],
  "R\u00c3\u201aMNICU V\u00c3\u201aLCEA": ["ramnicu_valcea", "Ramnicu Valcea"],
  "R\u00c2MNICU V\u00c2LCEA": ["ramnicu_valcea", "Ramnicu Valcea"],
  "R\u00c3\u00a2mnicu V\u00c3\u00a2lcea": ["ramnicu_valcea", "Ramnicu Valcea"],
  "RÂMNICU VÂLCEA": ["ramnicu_valcea", "Ramnicu Valcea"],
  "Râmnicu Vâlcea": ["ramnicu_valcea", "Ramnicu Valcea"],
  "SATU MARE": ["satu_mare", "Satu Mare"],
  "SF\u00c3\u201aNTU GHEORGHE": ["sfantu_gheorghe", "Sfantu Gheorghe"],
  "SF\u00c2NTU GHEORGHE": ["sfantu_gheorghe", "Sfantu Gheorghe"],
  "Sf\u00c3\u00a2ntu Gheorghe": ["sfantu_gheorghe", "Sfantu Gheorghe"],
  "SFÂNTU GHEORGHE": ["sfantu_gheorghe", "Sfantu Gheorghe"],
  "Sfântu Gheorghe": ["sfantu_gheorghe", "Sfantu Gheorghe"],
  SIBIU: ["sibiu", "Sibiu"],
  SLATINA: ["slatina", "Slatina"],
  SLOBOZIA: ["slobozia", "Slobozia"],
  SUCEAVA: ["suceava", "Suceava"],
  "T\u00c3\u201aRGU JIU": ["targu_jiu", "Targu Jiu"],
  "T\u00c2RGU JIU": ["targu_jiu", "Targu Jiu"],
  "T\u00c3\u00a2rgu Jiu": ["targu_jiu", "Targu Jiu"],
  "TÂRGU JIU": ["targu_jiu", "Targu Jiu"],
  "Târgu Jiu": ["targu_jiu", "Targu Jiu"],
  "T\u00c3\u201aRGU MURE": ["targu_mures", "Targu Mures"],
  "T\u00c2RGU MURE": ["targu_mures", "Targu Mures"],
  "T\u00c3\u00a2rgu Mure": ["targu_mures", "Targu Mures"],
  "TÂRGU MURE": ["targu_mures", "Targu Mures"],
  "Târgu Mure": ["targu_mures", "Targu Mures"],
  "TIMI OARA": ["timisoara", "Timisoara"],
  "Timi oara": ["timisoara", "Timisoara"],
  "T\u00c3\u201aRGOVI TE": ["targoviste", "Targoviste"],
  "T\u00c2RGOVI TE": ["targoviste", "Targoviste"],
  "T\u00c3\u00a2rgovi te": ["targoviste", "Targoviste"],
  "TÂRGOVI TE": ["targoviste", "Targoviste"],
  "Târgovi te": ["targoviste", "Targoviste"],
  TULCEA: ["tulcea", "Tulcea"],
  VASLUI: ["vaslui", "Vaslui"],
  "ZAL\u0007U": ["zalau", "Zalau"],
  "Zal\u0002u": ["zalau", "Zalau"]
});

function checksum(value) {
  return createHash("sha256").update(value).digest("hex");
}

function readRequired(path) {
  if (!existsSync(path)) {
    throw new Error(
      `Missing ${path}. Download ${SOURCE_URL} to validation-reference/source-packs/mc001_6_2013_official.pdf and run pdftotext -layout -enc UTF-8 before ingestion.`
    );
  }
  return readFileSync(path);
}

function decimalCommaToNumber(value) {
  return Number(value.replace(",", "."));
}

function normalizeSpaces(value) {
  return String(value ?? "").replace(/\s+/g, " ").trim();
}

function normalizeLocality(rawLabel) {
  const label = normalizeSpaces(rawLabel);
  const labelWithHyphens = label.replace(/\s+/g, "-");
  const mapped = [
    label,
    label.toUpperCase(),
    labelWithHyphens,
    labelWithHyphens.toUpperCase()
  ].map(candidate => RAW_LOCALITY_NORMALIZATION[candidate]).find(Boolean);
  if (!mapped) {
    throw new Error(`Missing locality normalization for "${label}"`);
  }
  return {
    localityId: `ro_${mapped[0]}`,
    stationId: `mc001_6_2013_${mapped[0]}`,
    localityName: mapped[1],
    sourceLabel: label
  };
}

function tableBounds(lines, startPattern, endPattern) {
  const start = lines.findIndex(line => line.includes(startPattern));
  if (start < 0) throw new Error(`Missing table start: ${startPattern}`);
  const end = lines.findIndex((line, index) => index > start && line.includes(endPattern));
  if (end < 0) throw new Error(`Missing table end after ${startPattern}: ${endPattern}`);
  return { start, end };
}

function isLikelyContinuationName(line) {
  const trimmed = normalizeSpaces(line);
  if (!trimmed) return false;
  if (trimmed.includes("Tabel") || trimmed.includes("Localitate") || trimmed.includes("Ora")) return false;
  if (trimmed.includes("Temp.") || trimmed.includes("Val.med") || trimmed.includes("Pentada")) return false;
  if (/^\d+$/.test(trimmed)) return false;
  return !/-?\d+,\d+/.test(trimmed) && /^[A-Za-zÀ-ž\u0002\u0007\b\u00c2\u00c3\u00a2\u201a\s.-]+$/.test(trimmed);
}

function parseRows(lines, bounds, tableId, expectedNumbers) {
  const rows = [];
  let pendingName = null;
  for (let lineIndex = bounds.start + 1; lineIndex < bounds.end; lineIndex += 1) {
    const originalLine = lines[lineIndex];
    const normalizedLine = normalizeSpaces(originalLine.replace(/\f/g, " "));
    if (!normalizedLine) continue;
    const numericMatches = [...normalizedLine.matchAll(/-?\d+,\d+/g)];
    if (numericMatches.length === 0) {
      if (isLikelyContinuationName(normalizedLine)) {
        pendingName = pendingName ? `${pendingName} ${normalizedLine}` : normalizedLine;
      }
      continue;
    }
    if (numericMatches.length < expectedNumbers) continue;
    const firstNumberIndex = numericMatches[0].index;
    const rawLabel = normalizeSpaces(
      `${pendingName ? `${pendingName} ` : ""}${normalizedLine.slice(0, firstNumberIndex)}`
    );
    pendingName = null;
    const locality = normalizeLocality(rawLabel);
    const values = numericMatches.slice(0, expectedNumbers).map(match => decimalCommaToNumber(match[0]));
    rows.push({
      ...locality,
      tableId,
      sourceLine: lineIndex + 1,
      values
    });
  }
  return rows;
}

function indexedByStation(rows, expectedValueCount, valueBuilder) {
  const records = rows.map((row) => {
    if (row.values.length !== expectedValueCount) {
      throw new Error(`${row.stationId} expected ${expectedValueCount} values for ${row.tableId}`);
    }
    return valueBuilder(row);
  });
  const ids = records.map(record => record.stationId);
  if (new Set(ids).size !== ids.length) {
    throw new Error(`Duplicate station ids in ${records[0]?.tableId ?? "table"}`);
  }
  return records;
}

function monthlyRecord(row, valueUnit, valuesKey, annualKey) {
  return {
    localityId: row.localityId,
    stationId: row.stationId,
    localityName: row.localityName,
    sourceLabel: row.sourceLabel,
    tableId: row.tableId,
    sourceLine: row.sourceLine,
    unit: valueUnit,
    monthly: MONTH_IDS.map((month, index) => ({
      month,
      value: row.values[index]
    })),
    [valuesKey]: MONTH_IDS.reduce((acc, month, index) => {
      acc[month] = row.values[index];
      return acc;
    }, {}),
    [annualKey]: row.values[12]
  };
}

function designDayRecord(row, kind) {
  return {
    localityId: row.localityId,
    stationId: row.stationId,
    localityName: row.localityName,
    sourceLabel: row.sourceLabel,
    tableId: row.tableId,
    sourceLine: row.sourceLine,
    kind,
    unit: "degC",
    meanDailyTemperatureC: row.values[0],
    hourlyOutdoorTemperatureC: Object.fromEntries(
      row.values.slice(1, 25).map((value, hour) => [String(hour).padStart(2, "0"), value])
    )
  };
}

function pentadRecord(row, kind) {
  const valueKeys = ["zMinus2", "zMinus1", "z", "zPlus1", "zPlus2", "meanPentad"];
  const firstKey = kind === "winter_design_pentad"
    ? "selectionByMinimumMeanTemperature"
    : "selectionByMaximumMeanTemperature";
  const secondKey = kind === "winter_design_pentad"
    ? "selectionContainingMinimumMeanDay"
    : "selectionContainingMaximumMeanDay";
  return {
    localityId: row.localityId,
    stationId: row.stationId,
    localityName: row.localityName,
    sourceLabel: row.sourceLabel,
    tableId: row.tableId,
    sourceLine: row.sourceLine,
    kind,
    unit: "degC",
    [firstKey]: Object.fromEntries(valueKeys.map((key, index) => [key, row.values[index]])),
    [secondKey]: Object.fromEntries(valueKeys.map((key, index) => [key, row.values[index + 6]]))
  };
}

function sourceReference(tableId) {
  const references = {
    "mc001_6_2013_table_ii_1_monthly_mean_air_temperature":
      "Mc001/6-2013, Capitolul II, Tabel II.1, Temperatura aerului medie lunara (degC) multianuala, PDF text p. 11-12",
    "mc001_6_2013_table_ii_2_monthly_mean_relative_humidity":
      "Mc001/6-2013, Capitolul II, Tabel II.2, Umiditatea relativa a aerului medie lunara (%) multianuala, PDF text p. 12-13",
    "mc001_6_2013_table_iii_1_winter_design_day_temperature":
      "Mc001/6-2013, Capitolul III, Tabel III.1, Temperatura in ziua de iarna de calcul, PDF text p. 14-15",
    "mc001_6_2013_table_iii_2_winter_design_pentad_temperature":
      "Mc001/6-2013, Capitolul III, Tabel III.2, Temperaturi medii zilnice ale pentadelor - iarna, PDF text p. 16-17",
    "mc001_6_2013_table_iv_1_summer_design_day_temperature":
      "Mc001/6-2013, Capitolul IV, Tabel IV.1, Temperatura de calcul de vara, PDF text p. 18-19",
    "mc001_6_2013_table_iv_2_summer_design_pentad_temperature":
      "Mc001/6-2013, Capitolul IV, Tabel IV.2, Temperaturi medii zilnice ale pentadelor - vara, PDF text p. 20"
  };
  return references[tableId] ?? tableId;
}

function makeDatasetChecksum(value) {
  return checksum(JSON.stringify(value));
}

const textBuffer = readRequired(SOURCE_TXT);
const text = textBuffer.toString("utf8");
const lines = text.split(/\r?\n/);
const pdfChecksum = existsSync(SOURCE_PDF) ? checksum(readFileSync(SOURCE_PDF)) : null;
if (pdfChecksum && pdfChecksum !== EXPECTED_PDF_SHA256) {
  throw new Error(`Unexpected PDF checksum ${pdfChecksum}`);
}

const tableRows = {
  monthlyTemperature: parseRows(
    lines,
    tableBounds(lines, "Tabel II.1 Temperatura", "Tabel II.2"),
    "mc001_6_2013_table_ii_1_monthly_mean_air_temperature",
    13
  ),
  monthlyRelativeHumidity: parseRows(
    lines,
    tableBounds(lines, "Tabel II.2 Umiditatea", "III.1 Parametri climatici"),
    "mc001_6_2013_table_ii_2_monthly_mean_relative_humidity",
    13
  ),
  winterDesignDay: parseRows(
    lines,
    tableBounds(lines, "Tabel III.1. Temperatura", "Tabel III.2"),
    "mc001_6_2013_table_iii_1_winter_design_day_temperature",
    25
  ),
  winterDesignPentad: parseRows(
    lines,
    tableBounds(lines, "Tabel III.2.", "Capitolul IV."),
    "mc001_6_2013_table_iii_2_winter_design_pentad_temperature",
    12
  ),
  summerDesignDay: parseRows(
    lines,
    tableBounds(lines, "Tabel IV.1 Temperatura", "Tabel IV.2"),
    "mc001_6_2013_table_iv_1_summer_design_day_temperature",
    25
  ),
  summerDesignPentad: parseRows(
    lines,
    tableBounds(lines, "Tabel IV.2 Temperaturi", "ALBA IULIA"),
    "mc001_6_2013_table_iv_2_summer_design_pentad_temperature",
    12
  )
};

const EXPECTED_TABLE_ROW_COUNTS = Object.freeze({
  monthlyTemperature: 42,
  monthlyRelativeHumidity: 42,
  winterDesignDay: 41,
  winterDesignPentad: 41,
  summerDesignDay: 41,
  summerDesignPentad: 41
});

for (const [name, rows] of Object.entries(tableRows)) {
  if (rows.length !== EXPECTED_TABLE_ROW_COUNTS[name]) {
    throw new Error(
      `${name} expected ${EXPECTED_TABLE_ROW_COUNTS[name]} rows, got ${rows.length}: ${rows.map(row => row.sourceLabel).join(" | ")}`
    );
  }
}

const monthlyStationIds = new Set(tableRows.monthlyTemperature.map(row => row.stationId));
for (const [name, rows] of Object.entries({
  monthlyRelativeHumidity: tableRows.monthlyRelativeHumidity,
  winterDesignDay: tableRows.winterDesignDay,
  winterDesignPentad: tableRows.winterDesignPentad,
  summerDesignDay: tableRows.summerDesignDay,
  summerDesignPentad: tableRows.summerDesignPentad
})) {
  for (const row of rows) {
    if (!monthlyStationIds.has(row.stationId)) {
      throw new Error(`${name} includes ${row.stationId}, which is absent from monthly temperature table`);
    }
  }
}

const stationRows = [
  ...tableRows.monthlyTemperature,
  ...tableRows.monthlyRelativeHumidity,
  ...tableRows.winterDesignDay,
  ...tableRows.winterDesignPentad,
  ...tableRows.summerDesignDay,
  ...tableRows.summerDesignPentad
];
const stationIds = [...new Set(stationRows.map(row => row.stationId))].sort();
const stationById = new Map(stationRows.map(row => [row.stationId, row]));
const stations = stationIds.map((stationId) => {
  const row = stationById.get(stationId);
  return {
    stationId,
    localityId: row.localityId,
    localityName: row.localityName,
    sourceLabel: row.sourceLabel,
    country: "RO",
    stationType: "mc001_6_2013_climate_parameter_locality",
    sourceReference: "Mc001/6-2013, Capitolul II-IV",
    sourceDocumentId: "mc001_6_2013"
  };
});

const extract = {
  schema: "mc001_6_2013_climate_extract_v1",
  generatedBy: "tools/ingest-mc001-6-2013-climate-datasets.mjs",
  datasetVersion: DATASET_VERSION,
  sourceDocument: {
    documentId: "mc001_6_2013",
    title:
      "Metodologie de calcul al performantei energetice a cladirilor. Partea a VI-a - Parametrii climatici necesari determinarii performantei energetice a cladirilor noi si existente, dimensionarii instalatiilor de climatizare a cladirilor si dimensionarii higrotermice a elementelor de anvelopa ale cladirilor",
    indicativ: "Mc 001/6-2013",
    edition: "2013",
    authority: "MDRAP / MDLPA",
    officialUrl: SOURCE_URL,
    sha256: pdfChecksum ?? EXPECTED_PDF_SHA256,
    textExtractionChecksum: checksum(textBuffer)
  },
  sourceScope: {
    includedTables: Object.freeze([
      sourceReference("mc001_6_2013_table_ii_1_monthly_mean_air_temperature"),
      sourceReference("mc001_6_2013_table_ii_2_monthly_mean_relative_humidity"),
      sourceReference("mc001_6_2013_table_iii_1_winter_design_day_temperature"),
      sourceReference("mc001_6_2013_table_iii_2_winter_design_pentad_temperature"),
      sourceReference("mc001_6_2013_table_iv_1_summer_design_day_temperature"),
      sourceReference("mc001_6_2013_table_iv_2_summer_design_pentad_temperature")
    ]),
    excludedTables: Object.freeze([
      {
        datasetId: "monthly_solar_irradiation",
        status: "external_source_not_reproduced_in_downloaded_mc001_6_2013_volume_i_text",
        sourceReference:
          "Mc001/6-2013, Capitolul II.3, states that monthly solar irradiation for 30 localities is in Anexa nr. A9.6 of Mc001/1-2006."
      },
      {
        datasetId: "degree_days",
        status: "not_found_as_explicit_table_in_ingested_mc001_6_2013_volume_i_text",
        sourceReference:
          "No source-backed degree-day table was found in the extracted official MC001/6-2013 Volume I text."
      }
    ])
  },
  tables: {
    monthlyExteriorTemperature: {
      tableId: "mc001_6_2013_table_ii_1_monthly_mean_air_temperature",
      sourceReference: sourceReference("mc001_6_2013_table_ii_1_monthly_mean_air_temperature"),
      unit: "degC",
      temporalResolution: "monthly",
      rows: indexedByStation(tableRows.monthlyTemperature, 13, row =>
        monthlyRecord(row, "degC", "monthlyMeanExteriorTemperatureC", "annualMeanExteriorTemperatureC")
      )
    },
    monthlyRelativeHumidity: {
      tableId: "mc001_6_2013_table_ii_2_monthly_mean_relative_humidity",
      sourceReference: sourceReference("mc001_6_2013_table_ii_2_monthly_mean_relative_humidity"),
      unit: "%",
      temporalResolution: "monthly",
      rows: indexedByStation(tableRows.monthlyRelativeHumidity, 13, row =>
        monthlyRecord(row, "%", "monthlyMeanRelativeHumidityPct", "annualMeanRelativeHumidityPct")
      )
    },
    winterDesignDayTemperature: {
      tableId: "mc001_6_2013_table_iii_1_winter_design_day_temperature",
      sourceReference: sourceReference("mc001_6_2013_table_iii_1_winter_design_day_temperature"),
      unit: "degC",
      temporalResolution: "hourly_design_day",
      rows: indexedByStation(tableRows.winterDesignDay, 25, row =>
        designDayRecord(row, "winter_design_day")
      )
    },
    winterDesignPentadTemperature: {
      tableId: "mc001_6_2013_table_iii_2_winter_design_pentad_temperature",
      sourceReference: sourceReference("mc001_6_2013_table_iii_2_winter_design_pentad_temperature"),
      unit: "degC",
      temporalResolution: "five_day_design_pentad",
      rows: indexedByStation(tableRows.winterDesignPentad, 12, row =>
        pentadRecord(row, "winter_design_pentad")
      )
    },
    summerDesignDayTemperature: {
      tableId: "mc001_6_2013_table_iv_1_summer_design_day_temperature",
      sourceReference: sourceReference("mc001_6_2013_table_iv_1_summer_design_day_temperature"),
      unit: "degC",
      temporalResolution: "hourly_design_day",
      rows: indexedByStation(tableRows.summerDesignDay, 25, row =>
        designDayRecord(row, "summer_design_day")
      )
    },
    summerDesignPentadTemperature: {
      tableId: "mc001_6_2013_table_iv_2_summer_design_pentad_temperature",
      sourceReference: sourceReference("mc001_6_2013_table_iv_2_summer_design_pentad_temperature"),
      unit: "degC",
      temporalResolution: "five_day_design_pentad",
      rows: indexedByStation(tableRows.summerDesignPentad, 12, row =>
        pentadRecord(row, "summer_design_pentad")
      )
    }
  },
  localityRegistry: stations.map(station => ({
    localityId: station.localityId,
    localityName: station.localityName,
    country: "RO",
    climateStationId: station.stationId,
    climateZone: null,
    windZone: null,
    climateZoneAssignmentStatus: "not_reproduced_as_locality_mapping_in_ingested_sources",
    windZoneAssignmentStatus: "not_reproduced_as_locality_mapping_in_ingested_sources",
    sourceReference: station.sourceReference
  })),
  climateStations: stations,
  datasetChecksums: {}
};

extract.datasetChecksums = {
  localityRegistry: makeDatasetChecksum(extract.localityRegistry),
  climateStations: makeDatasetChecksum(extract.climateStations),
  monthlyExteriorTemperature: makeDatasetChecksum(extract.tables.monthlyExteriorTemperature.rows),
  monthlyRelativeHumidity: makeDatasetChecksum(extract.tables.monthlyRelativeHumidity.rows),
  winterDesignDayTemperature: makeDatasetChecksum(extract.tables.winterDesignDayTemperature.rows),
  winterDesignPentadTemperature: makeDatasetChecksum(extract.tables.winterDesignPentadTemperature.rows),
  summerDesignDayTemperature: makeDatasetChecksum(extract.tables.summerDesignDayTemperature.rows),
  summerDesignPentadTemperature: makeDatasetChecksum(extract.tables.summerDesignPentadTemperature.rows)
};

function js(value) {
  return JSON.stringify(value, null, 2);
}

const moduleText = `// Generated by tools/ingest-mc001-6-2013-climate-datasets.mjs.
// Source: ${SOURCE_URL}
// Source PDF SHA-256: ${extract.sourceDocument.sha256}

export const MC001_6_2013_CLIMATE_DATASET_VERSION = ${js(DATASET_VERSION)};

export const MC001_6_2013_CLIMATE_SOURCE_DOCUMENT = Object.freeze(${js(extract.sourceDocument)});

export const MC001_6_2013_CLIMATE_DATASET_CHECKSUMS = Object.freeze(${js(extract.datasetChecksums)});

export const MC001_6_2013_CLIMATE_STATIONS = Object.freeze(${js(extract.climateStations)});

export const MC001_6_2013_LOCALITY_REGISTRY = Object.freeze(${js(extract.localityRegistry)});

export const MC001_6_2013_MONTHLY_EXTERIOR_TEMPERATURES = Object.freeze(${js(extract.tables.monthlyExteriorTemperature)});

export const MC001_6_2013_MONTHLY_RELATIVE_HUMIDITY = Object.freeze(${js(extract.tables.monthlyRelativeHumidity)});

export const MC001_6_2013_WINTER_DESIGN_DAY_TEMPERATURES = Object.freeze(${js(extract.tables.winterDesignDayTemperature)});

export const MC001_6_2013_WINTER_DESIGN_PENTAD_TEMPERATURES = Object.freeze(${js(extract.tables.winterDesignPentadTemperature)});

export const MC001_6_2013_SUMMER_DESIGN_DAY_TEMPERATURES = Object.freeze(${js(extract.tables.summerDesignDayTemperature)});

export const MC001_6_2013_SUMMER_DESIGN_PENTAD_TEMPERATURES = Object.freeze(${js(extract.tables.summerDesignPentadTemperature)});

export const MC001_6_2013_UNAVAILABLE_CLIMATE_DATASETS = Object.freeze(${js(extract.sourceScope.excludedTables)});
`;

mkdirSync(dirname(OUTPUT_JSON), { recursive: true });
mkdirSync(dirname(OUTPUT_MJS), { recursive: true });
writeFileSync(OUTPUT_JSON, `${JSON.stringify(extract, null, 2)}\n`, "utf8");
writeFileSync(OUTPUT_MJS, moduleText, "utf8");

console.log(`Extracted ${stationIds.length} MC001/6-2013 climate stations`);
console.log(`Wrote ${OUTPUT_JSON}`);
console.log(`Wrote ${OUTPUT_MJS}`);
