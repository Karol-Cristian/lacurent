import { createHash } from "node:crypto";
import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import {
  CLIMATE_DATASET_STATUSES,
  MC001_1_2006_A9_6_HSOL_DATASET_VERSION,
  ROMANIAN_CLIMATE_ACQUISITION_LIST,
  ROMANIAN_CLIMATE_DATA_DOMAINS,
  ROMANIAN_CLIMATE_NORMATIVE_DEPENDENCIES,
  ROMANIAN_CLIMATE_REQUIREMENT_MATRIX,
  listRomanianNormativeClimateStations,
  listRomanianNormativeSolarIrradiationLocalities,
  listRomanianProductionClimateLocalities,
  resolveRomanianProductionClimateProfile
} from "../src/climate-platform/index.mjs";
import {
  MC001_6_2013_CLIMATE_DATASET_CHECKSUMS,
  MC001_6_2013_CLIMATE_DATASET_VERSION,
  MC001_6_2013_CLIMATE_SOURCE_DOCUMENT,
  MC001_6_2013_CLIMATE_STATIONS,
  MC001_6_2013_LOCALITY_REGISTRY,
  MC001_6_2013_MONTHLY_EXTERIOR_TEMPERATURES,
  MC001_6_2013_MONTHLY_RELATIVE_HUMIDITY,
  MC001_6_2013_SUMMER_DESIGN_DAY_TEMPERATURES,
  MC001_6_2013_SUMMER_DESIGN_PENTAD_TEMPERATURES,
  MC001_6_2013_WINTER_DESIGN_DAY_TEMPERATURES,
  MC001_6_2013_WINTER_DESIGN_PENTAD_TEMPERATURES
} from "../src/climate-platform/datasets/mc001_6_2013ClimateDataset.mjs";
import {
  MC001_1_2006_MONTHLY_SOLAR_IRRADIANCE,
  MC001_1_2006_SOLAR_IRRADIATION_DATASET_CHECKSUMS,
  MC001_1_2006_SOLAR_IRRADIATION_DATASET_VERSION,
  MC001_1_2006_SOLAR_IRRADIATION_SOURCE_DOCUMENT,
  MC001_1_2006_SOLAR_LOCALITY_REGISTRY
} from "../src/climate-platform/datasets/mc001_1_2006SolarIrradiationDataset.mjs";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const OUT_DIR = path.join(ROOT, "validation-reference");
const JSON_OUT = path.join(OUT_DIR, "romanian-climate-infrastructure-audit.json");
const MD_OUT = path.join(OUT_DIR, "romanian-climate-infrastructure-audit.md");

function readJson(relativePath) {
  return JSON.parse(readFileSync(path.join(ROOT, relativePath), "utf8"));
}

function fileInfo(relativePath, expectedSha256 = null) {
  const fullPath = path.join(ROOT, relativePath);
  if (!existsSync(fullPath)) {
    return {
      path: relativePath,
      present: false,
      sizeBytes: 0,
      sha256: null,
      expectedSha256,
      hashMatchesExpected: false
    };
  }
  const buffer = readFileSync(fullPath);
  const sha256 = createHash("sha256").update(buffer).digest("hex");
  return {
    path: relativePath,
    present: true,
    sizeBytes: buffer.length,
    sha256,
    expectedSha256,
    hashMatchesExpected: expectedSha256 ? sha256 === expectedSha256 : null
  };
}

function doc({
  documentId,
  title,
  edition,
  path,
  expectedSha256 = null,
  present = null,
  extracted,
  implemented,
  validated,
  sourcePack = null,
  notes = []
}) {
  const info = path ? fileInfo(path, expectedSha256) : null;
  return {
    documentId,
    title,
    edition,
    file: info,
    present: present ?? Boolean(info?.present),
    extracted,
    implemented,
    validated,
    sourcePack,
    notes
  };
}

const mc0016Extract = readJson("validation-reference/source-packs/mc001-6-2013-climate-extract.json");
const solarExtract = readJson("validation-reference/source-packs/mc001-1-2006-annex-a9-6-solar-extract.json");

const documents = [
  doc({
    documentId: "mc001_2022",
    title: "Metodologia de calcul al performantei energetice a cladirilor, MC001-2022",
    edition: "2022",
    path: "docs/Mc_001-2022_-_Metodologie_calcul_performanta_energetica_caldiri.pdf",
    extracted: true,
    implemented: true,
    validated: true,
    sourcePack: "validation-reference/mc001-subchapter-coverage.json",
    notes: [
      "Chapter 2/3 formula and heading audit is generated separately.",
      "Climate-zone identifiers, winter design-temperature legend and zone-dependent tables are implemented."
    ]
  }),
  doc({
    documentId: "mc001_6_2013",
    title: MC001_6_2013_CLIMATE_SOURCE_DOCUMENT.title,
    edition: MC001_6_2013_CLIMATE_SOURCE_DOCUMENT.edition,
    path: "docs/normative/MC001-6-2013-parametrii-climatici.pdf",
    expectedSha256: MC001_6_2013_CLIMATE_SOURCE_DOCUMENT.sha256,
    extracted: true,
    implemented: true,
    validated: true,
    sourcePack: "validation-reference/source-packs/mc001-6-2013-climate-extract.json",
    notes: [
      "Tabel II.1, II.2, III.1, III.2, IV.1 and IV.2 are source-packed.",
      "The official PDF hash matches the immutable source-pack source identity."
    ]
  }),
  doc({
    documentId: "mc001_1_2_3_2006_annex_a9_6",
    title: MC001_1_2006_SOLAR_IRRADIATION_SOURCE_DOCUMENT.title,
    edition: MC001_1_2006_SOLAR_IRRADIATION_SOURCE_DOCUMENT.edition,
    path: "docs/normative/MC001-1-2-3-2006-anexa-a9-6-solar.pdf",
    expectedSha256: MC001_1_2006_SOLAR_IRRADIATION_SOURCE_DOCUMENT.sha256,
    extracted: true,
    implemented: true,
    validated: true,
    sourcePack: "validation-reference/source-packs/mc001-1-2006-annex-a9-6-solar-extract.json",
    notes: [
      "Anexa A.9.6 source rows are canonical provider data.",
      "A.9.6 W/m2 rows are integrated to source-backed Hsol [kWh/m2] for tabulated vertical/horizontal planes.",
      "A.9.6 Hsol rows are not fed directly into Chapter 2 Qsol without Qsky and complete solar element inputs.",
      "The downloaded full official PDF identity and the historical extraction source identity are both recorded; dataset checksums validate the extracted A.9.6 values."
    ]
  }),
  doc({
    documentId: "sr_en_iso_52010_1",
    title: "SR EN ISO 52010-1 Performanta energetica a cladirilor. Conditii climatice exterioare",
    edition: "not bundled in repository",
    path: null,
    present: false,
    extracted: false,
    implemented: false,
    validated: false,
    notes: [
      "Required only for climate preprocessing not reproduced by MC001, including non-tabulated tilted-surface Hsol and selected Qsky-related branches.",
      "Do not invent unavailable preprocessing branches."
    ]
  }),
  doc({
    documentId: "official_locality_to_climate_wind_zone_registry",
    title: "Official Romanian locality/county to climate-zone and wind-zone assignment registry",
    edition: "not reproduced in MC001-2022 or MC001/6-2013 ingested sources",
    path: null,
    present: false,
    extracted: false,
    implemented: false,
    validated: false,
    notes: [
      "MC001/6-2013 provides locality/station rows for climate parameters, not automatic zone assignment.",
      "Runtime requires explicit zone selection until an official mapping source is acquired."
    ]
  }),
  doc({
    documentId: "degree_day_dataset",
    title: "Romanian degree-day dataset, if a degree-day method is explicitly selected",
    edition: "not reproduced in the ingested MC001 sources",
    path: null,
    present: false,
    extracted: false,
    implemented: false,
    validated: false,
    notes: [
      "Current production uses monthly MC001 calculations.",
      "No degree-day values are fabricated."
    ]
  })
];

const representativeLocalityIds = [
  "ro_bucuresti",
  "ro_cluj_napoca",
  "ro_iasi",
  "ro_timisoara",
  "ro_constanta",
  "ro_brasov"
];

const representativeProfiles = representativeLocalityIds.map(localityId => {
  const profile = resolveRomanianProductionClimateProfile({
    localityId,
    climateZone: "II",
    windZone: "II"
  });
  return {
    localityId,
    localityName: profile.localityName,
    stationId: profile.stationId,
    status: profile.status,
    coverage: profile.coverage,
    boundedFieldIds: profile.boundedFields.map(field => field.parameterId)
  };
});

const datasetCoverage = [
  {
    datasetId: "climate_zones_i_v",
    sourceDocument: "mc001_2022",
    present: true,
    extracted: true,
    implemented: true,
    validated: true,
    recordCount: 5,
    runtimeUse: "zone-dependent requirements and winter design-temperature by zone"
  },
  {
    datasetId: "wind_zones_i_iv",
    sourceDocument: "mc001_2022",
    present: true,
    extracted: true,
    implemented: true,
    validated: true,
    recordCount: 4,
    runtimeUse: "canonical metadata; no active Chapter 2/3 formula consumes wind-zone parameters yet"
  },
  {
    datasetId: "mc001_6_2013_locality_station_registry",
    sourceDocument: "mc001_6_2013",
    present: true,
    extracted: true,
    implemented: true,
    validated: true,
    recordCount: MC001_6_2013_LOCALITY_REGISTRY.length,
    checksum: MC001_6_2013_CLIMATE_DATASET_CHECKSUMS.localityRegistry,
    runtimeUse: "locality to MC001/6-2013 station selection"
  },
  {
    datasetId: "mc001_6_2013_monthly_exterior_temperature",
    sourceDocument: "mc001_6_2013",
    present: true,
    extracted: true,
    implemented: true,
    validated: true,
    recordCount: MC001_6_2013_MONTHLY_EXTERIOR_TEMPERATURES.rows.length,
    monthlyCardinality: 12,
    checksum: MC001_6_2013_CLIMATE_DATASET_CHECKSUMS.monthlyExteriorTemperature,
    runtimeUse: "monthly transmission and ventilation climate input eligibility"
  },
  {
    datasetId: "mc001_6_2013_monthly_relative_humidity",
    sourceDocument: "mc001_6_2013",
    present: true,
    extracted: true,
    implemented: true,
    validated: true,
    recordCount: MC001_6_2013_MONTHLY_RELATIVE_HUMIDITY.rows.length,
    monthlyCardinality: 12,
    checksum: MC001_6_2013_CLIMATE_DATASET_CHECKSUMS.monthlyRelativeHumidity,
    runtimeUse: "climate profile traceability and humidity-dependent future methods"
  },
  {
    datasetId: "mc001_6_2013_winter_design_day_temperature",
    sourceDocument: "mc001_6_2013",
    present: true,
    extracted: true,
    implemented: true,
    validated: true,
    recordCount: MC001_6_2013_WINTER_DESIGN_DAY_TEMPERATURES.rows.length,
    checksum: MC001_6_2013_CLIMATE_DATASET_CHECKSUMS.winterDesignDayTemperature,
    runtimeUse: "heating design climate profile field"
  },
  {
    datasetId: "mc001_6_2013_winter_design_pentad_temperature",
    sourceDocument: "mc001_6_2013",
    present: true,
    extracted: true,
    implemented: true,
    validated: true,
    recordCount: MC001_6_2013_WINTER_DESIGN_PENTAD_TEMPERATURES.rows.length,
    checksum: MC001_6_2013_CLIMATE_DATASET_CHECKSUMS.winterDesignPentadTemperature,
    runtimeUse: "heating design climate profile field"
  },
  {
    datasetId: "mc001_6_2013_summer_design_day_temperature",
    sourceDocument: "mc001_6_2013",
    present: true,
    extracted: true,
    implemented: true,
    validated: true,
    recordCount: MC001_6_2013_SUMMER_DESIGN_DAY_TEMPERATURES.rows.length,
    checksum: MC001_6_2013_CLIMATE_DATASET_CHECKSUMS.summerDesignDayTemperature,
    runtimeUse: "cooling/ventilation design climate profile field"
  },
  {
    datasetId: "mc001_6_2013_summer_design_pentad_temperature",
    sourceDocument: "mc001_6_2013",
    present: true,
    extracted: true,
    implemented: true,
    validated: true,
    recordCount: MC001_6_2013_SUMMER_DESIGN_PENTAD_TEMPERATURES.rows.length,
    checksum: MC001_6_2013_CLIMATE_DATASET_CHECKSUMS.summerDesignPentadTemperature,
    runtimeUse: "cooling/ventilation design climate profile field"
  },
  {
    datasetId: "mc001_1_2006_annex_a9_6_monthly_solar_irradiance",
    sourceDocument: "mc001_1_2_3_2006_annex_a9_6",
    present: true,
    extracted: true,
    implemented: true,
    validated: true,
    recordCount: MC001_1_2006_MONTHLY_SOLAR_IRRADIANCE.rows.length,
    monthlyCardinality: 12,
    cellCount: MC001_1_2006_MONTHLY_SOLAR_IRRADIANCE.cellCount,
    checksum: MC001_1_2006_SOLAR_IRRADIATION_DATASET_CHECKSUMS.monthlySolarIrradianceRows,
    runtimeUse: "source-backed solar irradiance identity and Hsol source rows for tabulated vertical/horizontal planes"
  },
  {
    datasetId: "mc001_1_2006_annex_a9_6_monthly_hsol_vertical_horizontal",
    sourceDocument: "mc001_1_2_3_2006_annex_a9_6",
    present: true,
    extracted: true,
    implemented: true,
    validated: true,
    recordCount: MC001_1_2006_MONTHLY_SOLAR_IRRADIANCE.rows.length,
    monthlyCardinality: 12,
    datasetVersion: MC001_1_2006_A9_6_HSOL_DATASET_VERSION,
    runtimeUse: "source-backed Hsol [kWh/m2] for A.9.6 tabulated vertical and horizontal planes"
  },
  {
    datasetId: "source_backed_qsol_qsky_completion",
    sourceDocument: "sr_en_iso_52010_1_or_explicit_qsky_solar_element_source",
    present: false,
    extracted: false,
    implemented: false,
    validated: false,
    recordCount: 0,
    runtimeUse: "bounded Qsol completion from source-backed Hsol, Qsky-compatible inputs and complete solar element inputs"
  }
];

const boundedGaps = [
  {
    gapId: "source_backed_qsol_qsky_completion",
    exactMissingDocument: "SR EN ISO 52010-1 sau sursa explicita pentru Qsky/elemente solare",
    exactMissingChapterOrTable:
      "MC001 relation 2.54 hlr;e;k/Qsky-compatible inputs plus complete glazing/shading/surface inputs; SR EN ISO 52010-1 for non-tabulated tilted Hsol",
    blockedRuntimeCalculation: "source-backed Qsol from Annex A.9.6 rows, and QHnd/QCnd solar effect from that source-backed Qsol",
    reasonImplementationCannotContinue:
      "P7B exposes source-backed Hsol from A.9.6 for tabulated vertical/horizontal planes. Automatic Qsol still requires Qsky-compatible inputs and complete solar element inputs; the repository does not contain a source-backed automatic contract for every required input."
  },
  {
    gapId: "automatic_locality_to_climate_zone_assignment",
    exactMissingDocument: "official locality/county to MC001 climate-zone assignment source",
    exactMissingChapterOrTable: "map/list behind MC001-2022 Figura 2.1 at locality or county resolution",
    blockedRuntimeCalculation: "automatic zone assignment; zone-dependent lookups still run with explicit zone selection",
    reasonImplementationCannotContinue:
      "MC001/6-2013 station rows do not encode climate zone. Inferring from geography would invent normative data."
  },
  {
    gapId: "automatic_locality_to_wind_zone_assignment",
    exactMissingDocument: "official locality/county to wind-zone assignment source",
    exactMissingChapterOrTable: "wind-zone map/list referenced by MC001 forms",
    blockedRuntimeCalculation: "automatic wind-zone assignment; no active Chapter 2/3 formula currently consumes wind zone",
    reasonImplementationCannotContinue:
      "The repository contains wind-zone identifiers I-IV but not source-backed locality assignment."
  },
  {
    gapId: "degree_day_dataset",
    exactMissingDocument: "degree-day table/source if a degree-day method is selected",
    exactMissingChapterOrTable: "locality/station, base temperature and annual/monthly degree-day values",
    blockedRuntimeCalculation: "degree-day method only; current production uses monthly MC001 runtime",
    reasonImplementationCannotContinue:
      "No degree-day values are reproduced in the ingested sources; production must not derive them from weather approximations."
  }
];

const audit = {
  schema: "romanian_climate_infrastructure_audit_p5c_v1",
  generatedBy: "tools/generate-romanian-climate-infrastructure-audit.mjs",
  generatedAt: "deterministic_static_generation",
  objective:
    "Complete Romanian production climate infrastructure using only source-backed normative data available in the repository.",
  documents,
  sourcePacks: {
    mc001_6_2013: {
      schema: mc0016Extract.schema,
      datasetVersion: mc0016Extract.datasetVersion,
      sourceDocumentSha256: mc0016Extract.sourceDocument.sha256,
      tables: Object.fromEntries(Object.entries(mc0016Extract.tables).map(([id, table]) => [
        id,
        { rowCount: table.rows.length, checksum: table.checksum ?? null }
      ]))
    },
    mc001_1_2006_annex_a9_6: {
      schema: solarExtract.schema,
      datasetVersion: solarExtract.datasetVersion,
      sourceDocumentSha256: solarExtract.sourceDocument.sha256,
      rows: solarExtract.tables.monthlySolarIrradiance.rows.length,
      cellCount: solarExtract.tables.monthlySolarIrradiance.cellCount,
      reviewedCells: solarExtract.extractionQuality.manuallyReviewedCells,
      checksum: solarExtract.checksums.monthlySolarIrradianceRows
    }
  },
  datasetCoverage,
  productionRegistry: {
    supportedLocalityStationMappings: listRomanianProductionClimateLocalities().length,
    normativeStationCount: listRomanianNormativeClimateStations().length,
    solarIrradiationLocalityCount: listRomanianNormativeSolarIrradiationLocalities().length,
    representativeProfiles,
    datasetStatus: CLIMATE_DATASET_STATUSES.NORMATIVE_DATASET
  },
  runtimeRequirementMatrix: ROMANIAN_CLIMATE_REQUIREMENT_MATRIX,
  dataDomains: ROMANIAN_CLIMATE_DATA_DOMAINS,
  normativeDependencies: ROMANIAN_CLIMATE_NORMATIVE_DEPENDENCIES,
  acquisitionPlan: ROMANIAN_CLIMATE_ACQUISITION_LIST,
  boundedGaps,
  coverageStatistics: {
    documentsTracked: documents.length,
    documentsPresent: documents.filter(item => item.present).length,
    documentsExtracted: documents.filter(item => item.extracted).length,
    datasetsTracked: datasetCoverage.length,
    datasetsImplemented: datasetCoverage.filter(item => item.implemented).length,
    datasetsValidated: datasetCoverage.filter(item => item.validated).length,
    stationMappings: MC001_6_2013_CLIMATE_STATIONS.length,
    monthlyTemperatureRows: MC001_6_2013_MONTHLY_EXTERIOR_TEMPERATURES.rows.length,
    monthlyHumidityRows: MC001_6_2013_MONTHLY_RELATIVE_HUMIDITY.rows.length,
    solarSourceRows: MC001_1_2006_MONTHLY_SOLAR_IRRADIANCE.rows.length,
    boundedGapCount: boundedGaps.length
  }
};

function writeMarkdown(value) {
  const lines = [
    "# Romanian Climate Infrastructure Audit",
    "",
    "This report is generated from source-pack metadata and provider registries. It does not invent climate values.",
    "",
    "## Coverage Summary",
    "",
    `- Documents tracked: ${value.coverageStatistics.documentsTracked}`,
    `- Documents present: ${value.coverageStatistics.documentsPresent}`,
    `- Documents extracted: ${value.coverageStatistics.documentsExtracted}`,
    `- Datasets tracked: ${value.coverageStatistics.datasetsTracked}`,
    `- Datasets implemented: ${value.coverageStatistics.datasetsImplemented}`,
    `- Datasets validated: ${value.coverageStatistics.datasetsValidated}`,
    `- MC001/6-2013 station mappings: ${value.coverageStatistics.stationMappings}`,
    `- Monthly temperature rows: ${value.coverageStatistics.monthlyTemperatureRows}`,
    `- Monthly humidity rows: ${value.coverageStatistics.monthlyHumidityRows}`,
    `- Annex A.9.6 solar source rows: ${value.coverageStatistics.solarSourceRows}`,
    `- Bounded gaps: ${value.coverageStatistics.boundedGapCount}`,
    "",
    "## Documents",
    "",
    "| Document | Edition | Present | Extracted | Implemented | Validated |",
    "| --- | --- | --- | --- | --- | --- |",
    ...value.documents.map(item =>
      `| ${item.documentId} | ${item.edition} | ${item.present ? "yes" : "no"} | ${item.extracted ? "yes" : "no"} | ${item.implemented ? "yes" : "no"} | ${item.validated ? "yes" : "no"} |`
    ),
    "",
    "## Dataset Coverage",
    "",
    "| Dataset | Source | Records | Implemented | Runtime use |",
    "| --- | --- | ---: | --- | --- |",
    ...value.datasetCoverage.map(item =>
      `| ${item.datasetId} | ${item.sourceDocument} | ${item.recordCount ?? 0} | ${item.implemented ? "yes" : "no"} | ${item.runtimeUse} |`
    ),
    "",
    "## Representative Localities",
    "",
    "| Locality | Station | Monthly temp | Humidity | A.9.6 solar | Winter design | Summer design |",
    "| --- | --- | --- | --- | --- | --- | --- |",
    ...value.productionRegistry.representativeProfiles.map(item =>
      `| ${item.localityName ?? item.localityId} | ${item.stationId ?? "-"} | ${item.coverage.hasMonthlyExteriorTemperature ? "yes" : "no"} | ${item.coverage.hasMonthlyRelativeHumidity ? "yes" : "no"} | ${item.coverage.hasMonthlySolarIrradianceSourceRows ? "yes" : "no"} | ${item.coverage.hasWinterDesignDay ? "yes" : "no"} | ${item.coverage.hasSummerDesignDay ? "yes" : "no"} |`
    ),
    "",
    "## Bounded Gaps",
    "",
    "| Gap | Missing document | Missing clause/table | Blocked runtime calculation |",
    "| --- | --- | --- | --- |",
    ...value.boundedGaps.map(item =>
      `| ${item.gapId} | ${item.exactMissingDocument} | ${item.exactMissingChapterOrTable} | ${item.blockedRuntimeCalculation} |`
    )
  ];
  return `${lines.join("\n")}\n`;
}

mkdirSync(OUT_DIR, { recursive: true });
writeFileSync(JSON_OUT, `${JSON.stringify(audit, null, 2)}\n`);
writeFileSync(MD_OUT, writeMarkdown(audit));
console.log(`Wrote ${path.relative(ROOT, JSON_OUT)}`);
console.log(`Wrote ${path.relative(ROOT, MD_OUT)}`);
