import { mkdirSync, writeFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import {
  CLIMATE_AUDIT_REFINED_STATUSES,
  CLIMATE_DATASET_STATUSES,
  MC001_WINTER_DESIGN_TEMPERATURES_BY_ZONE,
  ROMANIAN_CLIMATE_ACQUISITION_LIST,
  ROMANIAN_CLIMATE_COVERAGE,
  ROMANIAN_CLIMATE_DATA_DOMAINS,
  ROMANIAN_CLIMATE_NORMATIVE_DEPENDENCIES,
  ROMANIAN_CLIMATE_REQUIREMENT_MATRIX,
  ROMANIAN_CLIMATE_SOURCE_INVENTORY,
  ROMANIAN_CLIMATE_ZONE_REGISTRY_VERSION
} from "../src/climate-platform/index.mjs";
import {
  chapter3ImplementationMatrix,
  chapter3MatrixSummary,
  chapter3LightingExternalImplementationPlan
} from "../src/physics-engine/tests/fixtures/mc001Chapter3ImplementationMatrixFixture.mjs";

const OUTPUT_JSON = resolve("validation-reference/mc001-subchapter-coverage.json");
const OUTPUT_MD = resolve("validation-reference/mc001-subchapter-coverage.md");

const allowedStatuses = Object.freeze([
  "IMPLEMENTED_CALCULATION",
  "IMPLEMENTED_LOOKUP",
  "IMPLEMENTED_VALIDATION",
  "IMPLEMENTED_WORKFLOW",
  "REPRESENTED_AS_INPUT",
  "REPRESENTED_AS_OUTPUT",
  "DOCUMENTED_NOT_APPLICABLE",
  "WORKED_EXAMPLE_ONLY",
  "EXTERNAL_NORMATIVE_DEPENDENCY"
]);

const commonChapter2Files = Object.freeze([
  "src/physics-engine/mc001Chapter2UsefulDemandCalculation.mjs",
  "src/building-platform/buildingChapter2Adapter.mjs",
  "src/building-platform/buildingDnaResolver.mjs",
  "src/building-platform/buildingTechnicalReport.mjs"
]);

const commonChapter2Tests = Object.freeze([
  "src/physics-engine/tests/mc001Chapter2UsefulDemandCalculation.test.mjs",
  "src/physics-engine/tests/mc001Chapter2IndependentValidationPack.test.mjs",
  "tests/p12a-product-rebuild.mjs"
]);

const commonChapter3Files = Object.freeze([
  "src/physics-engine/mc001Chapter3SystemEnergy.mjs",
  "src/physics-engine/mc001Chapter3HeatingSystems.mjs",
  "src/building-platform/buildingChapter3InstallationsAdapter.mjs",
  "src/physics-engine/mc001Chapter3Notebook.mjs",
  "src/building-platform/buildingTechnicalReport.mjs"
]);

const commonChapter3Tests = Object.freeze([
  "src/physics-engine/tests/mc001Chapter3SystemEnergy.test.mjs",
  "src/physics-engine/tests/mc001Chapter3HeatingSystems.test.mjs",
  "src/physics-engine/tests/mc001Chapter3IntegratedRuntime.test.mjs",
  "src/building-platform/tests/buildingChapter3InstallationsProduct.test.mjs"
]);

function parentOf(sectionNumber) {
  const parts = sectionNumber.split(".");
  if (parts.length <= 2) return sectionNumber.startsWith("ANEXA") ? "3.3" : null;
  return parts.slice(0, -1).join(".");
}

function treatmentFor(status) {
  const treatment = {
    IMPLEMENTED_CALCULATION:
      "Executat prin motorul fizic validat; UI-ul si raportul afiseaza iesirile motorului fara formule duplicate.",
    IMPLEMENTED_LOOKUP:
      "Valoare tabelara normativa implementata in registru sursa, cu versiune si referinta MC001.",
    IMPLEMENTED_VALIDATION:
      "Tratata ca regula/diagnostic de validare sau prag de verificare, nu ca formula energetica.",
    IMPLEMENTED_WORKFLOW:
      "Reprezentata ca procedura de colectare, normalizare si trasabilitate in Building DNA.",
    REPRESENTED_AS_INPUT:
      "Reprezentata ca input explicit/profesional; LaCurent nu fabrica valori cand MC001 cere masurare sau date externe.",
    REPRESENTED_AS_OUTPUT:
      "Reprezentata in rezultate, caiet sau raport ca marime calculata/afisata de lantul canonic.",
    DOCUMENTED_NOT_APPLICABLE:
      "Documentata ca neaplicabila pentru fluxul curent, fara a crea un calcul fals.",
    WORKED_EXAMPLE_ONLY:
      "Exemplu lucrat folosit doar ca material de audit; nu este tratat ca algoritm normativ separat.",
    EXTERNAL_NORMATIVE_DEPENDENCY:
      "MC001 trimite la sursa normativa externa sau la date nereproduse in PDF; fluxul foloseste o granita de input explicit."
  };
  return treatment[status];
}

const climateZoneRequirementSections = new Set([
  "2.2",
  "2.2.1",
  "2.2.1.1",
  "2.2.1.2",
  "2.2.2",
  "2.2.2.1",
  "2.2.2.2",
  "2.2.3",
  "2.2.3.1",
  "2.2.3.2",
  "2.2.3.3"
]);

const monthlyClimateSections = new Set([
  "2.6.2.1",
  "2.6.2.3",
  "2.7",
  "2.7.1",
  "2.7.1.1",
  "2.7.1.2",
  "2.7.2",
  "2.7.3",
  "2.7.3.1",
  "2.7.3.2",
  "2.7.4",
  "2.7.6",
  "2.8",
  "2.8.1",
  "2.8.2",
  "2.8.3",
  "2.8.4",
  "2.8.5",
  "2.8.6",
  "2.9",
  "2.9.1",
  "2.9.2",
  "2.10",
  "2.11",
  "3.1",
  "3.2",
  "3.2.2",
  "3.2.3",
  "3.2.3.1",
  "3.2.3.2",
  "3.2.4",
  "3.2.5",
  "3.2.6",
  "3.2.6.2",
  "3.2.6.3",
  "3.2.7"
]);

const solarPreprocessingSections = new Set([
  "2.7.3",
  "2.7.3.1",
  "2.7.3.2",
  "2.7.4"
]);

const coolingVentilationDesignSections = new Set([
  "3.2",
  "3.2.1",
  "3.2.2",
  "3.2.3",
  "3.2.5",
  "3.2.6",
  "3.2.6.2",
  "3.2.6.3",
  "3.2.7"
]);

function requirement(calculationId) {
  return ROMANIAN_CLIMATE_REQUIREMENT_MATRIX.find(item => item.calculationId === calculationId);
}

function climateAuditFor(input) {
  const refinedStatuses = new Set();
  const requiredDatasets = [];
  const runtimeEligibility = [];
  const exactDiagnostics = [];
  const externalSourceDependencies = [];

  if (climateZoneRequirementSections.has(input.sectionNumber)) {
    refinedStatuses.add("LOOKUP_IMPLEMENTED");
    refinedStatuses.add("REQUIRED_DATA_AVAILABLE");
    refinedStatuses.add("END_TO_END_CALCULATION_AVAILABLE");
    requiredDatasets.push("climate_zone_classification");
    runtimeEligibility.push(requirement("climate_zone_threshold_lookup"));
    runtimeEligibility.push(requirement("winter_design_temperature_lookup"));
  }

  if (monthlyClimateSections.has(input.sectionNumber)) {
    refinedStatuses.add("FORMULA_IMPLEMENTED");
    refinedStatuses.add("REQUIRED_DATA_AVAILABLE");
    requiredDatasets.push("monthly_energy_climate_data");
    runtimeEligibility.push(requirement("chapter2_monthly_transmission_ventilation"));
    exactDiagnostics.push("ROMANIAN_CLIMATE_STATION_SELECTION_REQUIRED");
    if (solarPreprocessingSections.has(input.sectionNumber)) {
      refinedStatuses.add("EXTERNAL_STANDARD_DEPENDENCY");
      runtimeEligibility.push(requirement("chapter2_solar_source_dataset_identity"));
      runtimeEligibility.push(requirement("chapter2_hsol_vertical_horizontal"));
      runtimeEligibility.push(requirement("chapter2_solar_gains"));
      exactDiagnostics.push("MONTHLY_SOLAR_IRRADIATION_NOT_AVAILABLE_FOR_SELECTED_STATION");
      exactDiagnostics.push("SOLAR_GAIN_QSKY_AND_ELEMENT_INPUTS_REQUIRED");
      externalSourceDependencies.push("sr_en_iso_52010_1_climate_preprocessing");
    } else {
      refinedStatuses.add("END_TO_END_CALCULATION_AVAILABLE");
    }
  }

  if (coolingVentilationDesignSections.has(input.sectionNumber)) {
    refinedStatuses.add("EXTERNAL_DATA_DEPENDENCY");
    requiredDatasets.push("cooling_ventilation_design_climate");
    runtimeEligibility.push(requirement("cooling_ventilation_design_conditions"));
    exactDiagnostics.push("COOLING_VENTILATION_DESIGN_CLIMATE_REQUIRED");
    externalSourceDependencies.push("mc001_6_2013_climate_parameters_volume");
  }

  if (requiredDatasets.length === 0) return null;

  return {
    refinedStatuses: [...refinedStatuses],
    requiredDatasets: [...new Set(requiredDatasets)],
    currentDatasetStatus: Object.fromEntries([...new Set(requiredDatasets)].map((datasetId) => {
      const domain = ROMANIAN_CLIMATE_DATA_DOMAINS.find(item => item.domainId === datasetId);
      return [datasetId, domain?.status ?? CLIMATE_DATASET_STATUSES.DATASET_UNAVAILABLE];
    })),
    runtimeEligibility: runtimeEligibility.filter(Boolean).map(item => ({
      calculationId: item.calculationId,
      requires: item.requires,
      eligibleWhen: item.eligibleWhen,
      missingDiagnostic: item.missingDiagnostic
    })),
    exactDiagnostics: [...new Set(exactDiagnostics)],
    externalSourceDependencies: [...new Set(externalSourceDependencies)],
    note:
      "Formula coverage is tracked separately from source-backed dataset availability; zone I-V is not treated as a monthly climate profile."
  };
}

function record(input) {
  const implementationFiles = input.implementationFiles ?? (
    input.chapter === 2 ? commonChapter2Files : commonChapter3Files
  );
  const testCoverage = input.testCoverage ?? (
    input.chapter === 2 ? commonChapter2Tests : commonChapter3Tests
  );
  const currentStatus = input.currentStatus;
  const output = {
    chapter: input.chapter,
    sectionNumber: input.sectionNumber,
    titleRo: input.titleRo,
    parentSection: input.parentSection ?? parentOf(input.sectionNumber),
    sourcePages: input.sourcePages,
    classification: input.classification,
    formulas: input.formulas ?? [],
    tables: input.tables ?? [],
    figures: input.figures ?? [],
    annexes: input.annexes ?? [],
    externalReferences: input.externalReferences ?? [],
    laCurentTreatment: input.laCurentTreatment ?? treatmentFor(currentStatus),
    implementationFiles,
    runtimeFunctions: input.runtimeFunctions ?? [],
    canonicalInputPaths: input.canonicalInputPaths ?? [],
    canonicalOutputPaths: input.canonicalOutputPaths ?? [],
    uiLocation: input.uiLocation ?? "pages/analiza-casa.html",
    notebookLocation: input.notebookLocation ?? "src/physics-engine/mc001Chapter3Notebook.mjs / src/building-platform/buildingTechnicalReport.mjs",
    reportLocation: input.reportLocation ?? "src/building-platform/buildingTechnicalReport.mjs",
    testCoverage,
    currentStatus,
    identifiedGaps: input.identifiedGaps ?? [],
    remediation: input.remediation ?? "Nu este necesara remediere suplimentara in P5A.",
    calculationPath: input.calculationPath ?? null
  };
  const climateAudit = input.climateAudit ?? climateAuditFor(input);
  if (climateAudit) output.climateAudit = climateAudit;
  return output;
}

function ch2(sectionNumber, titleRo, sourcePages, classification, currentStatus, details = {}) {
  return record({ chapter: 2, sectionNumber, titleRo, sourcePages, classification, currentStatus, ...details });
}

function ch3(sectionNumber, titleRo, sourcePages, classification, currentStatus, details = {}) {
  return record({ chapter: 3, sectionNumber, titleRo, sourcePages, classification, currentStatus, ...details });
}

const chapter2CalculationPath = Object.freeze({
  source: "MC001-2022 Capitolul 2",
  registrySourcePack: "src/physics-engine/mc001NormativeRegistry.mjs si P2V fixtures",
  buildingDnaInput: "building.geometry, building.assemblies, building.monthlyProfiles, building.climate",
  adapter: "src/building-platform/buildingChapter2Adapter.mjs",
  physicsFunction: "calculateMc001Chapter2UsefulDemand",
  aggregation: "monthly case results aggregated annually after the monthly runtime",
  notebook: "compact P3G notebook sections generated from engine traceability",
  report: "technical report main results, climate chapter, notebook and appendix",
  persistence: "versioned Building DNA and analysis/report fingerprints"
});

const chapter3CalculationPath = Object.freeze({
  source: "MC001-2022 Capitolul 3",
  registrySourcePack: "src/physics-engine/tests/fixtures/mc001Chapter3ImplementationMatrixFixture.mjs",
  buildingDnaInput: "building.technicalSystems and Chapter 2 useful monthly demand",
  adapter: "src/building-platform/buildingChapter3InstallationsAdapter.mjs",
  physicsFunction: "calculateMc001Chapter3IntegratedRuntime",
  aggregation: "monthly service/system stages aggregated annually",
  notebook: "src/physics-engine/mc001Chapter3Notebook.mjs",
  report: "technical installations report chapter and engineering notebook",
  persistence: "versioned Building DNA, analysis, report model and calculation fingerprint"
});

const chapter2Records = [
  ch2("2.1", "Elemente de clădire și parametrii termoenergetici asociați", ["MC001-2022 pp. 41-54"], ["input_definition", "geometry_rule", "material_rule"], "IMPLEMENTED_WORKFLOW", {
    canonicalInputPaths: ["building.geometry", "building.assemblies", "building.buildingSpecificParameters"],
    runtimeFunctions: ["resolveBuildingDna", "buildChapter2InputFromBuildingDna"]
  }),
  ch2("2.1.1", "Prevederi generale", ["MC001-2022 p. 41"], ["explanatory_text", "workflow_procedure"], "IMPLEMENTED_WORKFLOW"),
  ch2("2.1.2", "Elemente componente ale anvelopei termice a clădirii", ["MC001-2022 pp. 41-44"], ["input_definition", "geometry_rule"], "REPRESENTED_AS_INPUT", {
    canonicalInputPaths: ["building.envelope.elements", "building.geometry.envelopeElements"],
    canonicalOutputPaths: ["chapter2.envelope", "technicalReport.geometryRows"]
  }),
  ch2("2.1.3", "Convenții de stabilire a caracteristicilor dimensionale ale elementelor de anvelopă", ["MC001-2022 pp. 44-48"], ["geometry_rule", "input_definition"], "REPRESENTED_AS_INPUT", {
    canonicalInputPaths: ["geometry.source", "geometry.explicitUserInput", "geometry.derivedValues"],
    uiLocation: "pages/analiza-casa.html - Geometrie"
  }),
  ch2("2.1.4", "Parametri definitorii pentru caracterizarea higrotermică a materialelor", ["MC001-2022 pp. 48-54"], ["material_rule", "input_definition", "normative_lookup_table"], "IMPLEMENTED_LOOKUP", {
    tables: ["Tabel 2.1", "Tabel 2.2"],
    implementationFiles: ["src/physics-engine/materialsUValues.mjs", "src/building-platform/buildingTypologyEngine.mjs", "src/building-platform/buildingDnaResolver.mjs"]
  }),
  ch2("2.2", "Cerințe minime de performanță termică și energetică", ["MC001-2022 pp. 54-76"], ["normative_threshold", "validation_requirement"], "IMPLEMENTED_LOOKUP", {
    tables: ["Tabel 2.10a", "Tabel 2.10b"],
    implementationFiles: ["src/climate-platform/romanianClimateZones.mjs"]
  }),
  ch2("2.2.1", "Cerințe minime de performanță energetică pentru clădiri noi (NZEB)", ["MC001-2022 pp. 54-65"], ["normative_threshold", "classification_only"], "IMPLEMENTED_LOOKUP", { tables: ["Tabel 2.10a"] }),
  ch2("2.2.1.1", "Clădiri rezidențiale NZEB", ["MC001-2022 pp. 54-61"], ["normative_threshold"], "IMPLEMENTED_LOOKUP", { tables: ["Tabel 2.10a"] }),
  ch2("2.2.1.2", "Clădiri nerezidențiale NZEB", ["MC001-2022 pp. 61-65"], ["normative_threshold"], "IMPLEMENTED_LOOKUP", { tables: ["Tabel 2.10a"] }),
  ch2("2.2.2", "Cerințe minime de performanță energetică pentru clădiri existente renovate", ["MC001-2022 pp. 65-69"], ["normative_threshold"], "IMPLEMENTED_LOOKUP", { tables: ["Tabel 2.10b"] }),
  ch2("2.2.2.1", "Clădiri rezidențiale renovate", ["MC001-2022 pp. 65-67"], ["normative_threshold"], "IMPLEMENTED_LOOKUP", { tables: ["Tabel 2.10b"] }),
  ch2("2.2.2.2", "Clădiri nerezidențiale renovate", ["MC001-2022 pp. 67-69"], ["normative_threshold"], "IMPLEMENTED_LOOKUP", { tables: ["Tabel 2.10b"] }),
  ch2("2.2.3", "Cerințe minime de confort higrotermic în clădirile noi NZEB și existente renovate", ["MC001-2022 pp. 69-76"], ["normative_threshold", "validation_requirement"], "IMPLEMENTED_VALIDATION"),
  ch2("2.2.3.1", "Cerințele minime de confort higrotermic pentru elementele de clădire", ["MC001-2022 pp. 69-72"], ["normative_threshold"], "IMPLEMENTED_VALIDATION"),
  ch2("2.2.3.2", "Cerințele minime pe ansamblul clădirii; cazul clădirilor rezidențiale și asimilate acestora", ["MC001-2022 pp. 72-74"], ["normative_threshold"], "IMPLEMENTED_VALIDATION"),
  ch2("2.2.3.3", "Cerințele minime pe ansamblul clădirii; cazul clădirilor nerezidențiale", ["MC001-2022 pp. 74-76"], ["normative_threshold"], "IMPLEMENTED_VALIDATION"),
  ch2("2.3", "Considerente suplimentare privind cerințe minime NZEB", ["MC001-2022 pp. 76-77"], ["explanatory_text", "validation_requirement"], "IMPLEMENTED_VALIDATION"),
  ch2("2.4", "Rezistențe termice", ["MC001-2022 pp. 77-91"], ["normative_calculation", "normative_lookup_table"], "IMPLEMENTED_CALCULATION", { calculationPath: chapter2CalculationPath }),
  ch2("2.4.1", "Calculul rezistenței termice și al transmitanței termice ale elementelor opace", ["MC001-2022 pp. 77-84"], ["normative_calculation", "material_rule"], "IMPLEMENTED_CALCULATION", {
    formulas: ["R_layer = d/lambda", "R_total", "U = 1/R_total"],
    runtimeFunctions: ["calculateLayerResistance", "calculateAssemblyThermalResistance", "calculateAssemblyUValue"],
    calculationPath: chapter2CalculationPath
  }),
  ch2("2.4.2", "Transmitanța termică a elementelor vitrate (ferestre și uși)", ["MC001-2022 pp. 84-86"], ["input_definition", "normative_calculation"], "REPRESENTED_AS_INPUT", {
    canonicalInputPaths: ["building.assemblies.window.directUValue", "building.assemblies.door.directUValue"],
    remediation: "U pentru ferestre/usi este input explicit; raportul il marcheaza ca valoare introdusa direct."
  }),
  ch2("2.4.3", "Stabilirea prin calcul a parametrilor elementelor aflate în contact cu solul", ["MC001-2022 pp. 86-90"], ["external_standard_delegation", "input_definition"], "EXTERNAL_NORMATIVE_DEPENDENCY", {
    externalReferences: ["C107 / standarde de calcul pentru contact cu solul"],
    canonicalInputPaths: ["boundaryContext.groundBoundaryFactor"],
    remediation: "Calculul detaliat sol este granita de input explicit; nu se inventeaza factori."
  }),
  ch2("2.4.4", "Rezistența termică / transmitanța termică medie a anvelopei clădirii", ["MC001-2022 pp. 90-91"], ["normative_calculation"], "IMPLEMENTED_CALCULATION", {
    runtimeFunctions: ["calculateEnvelopeHeatTransfer"],
    calculationPath: chapter2CalculationPath
  }),
  ch2("2.5", "Permeabilitatea la aer a unei clădiri", ["MC001-2022 pp. 91-94"], ["input_definition", "measurement_method"], "REPRESENTED_AS_INPUT", {
    canonicalInputPaths: ["buildingSpecificParameters.ventilationAch", "chapter3.ventilation.airflow"],
    remediation: "Produsul accepta debite/ACH explicite; nu simuleaza test de presurizare."
  }),
  ch2("2.5.1", "Determinarea permeabilității la aer prin metoda presurizării", ["MC001-2022 pp. 91-93"], ["workflow_procedure", "validation_requirement"], "REPRESENTED_AS_INPUT"),
  ch2("2.5.2", "Estimarea calitativă a permeabilității la aer prin parametri caracteristici", ["MC001-2022 pp. 93-94"], ["input_definition", "validation_requirement"], "REPRESENTED_AS_INPUT"),
  ch2("2.6", "Etape pregătitoare calculului de necesar de energie pentru încălzirea și/sau răcirea clădirilor", ["MC001-2022 pp. 94-97"], ["workflow_procedure", "zoning_rule"], "IMPLEMENTED_WORKFLOW"),
  ch2("2.6.1", "Descriere a procedurii de calcul", ["MC001-2022 pp. 94-95"], ["workflow_procedure"], "IMPLEMENTED_WORKFLOW"),
  ch2("2.6.2", "Zonarea termică", ["MC001-2022 pp. 95-97"], ["zoning_rule"], "IMPLEMENTED_WORKFLOW"),
  ch2("2.6.2.1", "Temperatură calculată într-o zonă neîncălzită, nerăcită, neclimatizată adiacentă", ["MC001-2022 pp. 95-96"], ["input_definition", "zoning_rule"], "REPRESENTED_AS_INPUT"),
  ch2("2.6.2.2", "Factori de corecție și de distribuție", ["MC001-2022 pp. 96-97"], ["normative_lookup_table", "zoning_rule"], "IMPLEMENTED_LOOKUP"),
  ch2("2.6.2.3", "Clădiri sau unități rezidențiale, corecții pentru temperatura medie interioară", ["MC001-2022 p. 97"], ["input_definition", "normative_threshold"], "REPRESENTED_AS_INPUT"),
  ch2("2.7", "Calculul necesarului de energie pentru climatizare folosind metoda lunară", ["MC001-2022 pp. 97-117"], ["normative_calculation"], "IMPLEMENTED_CALCULATION", { calculationPath: chapter2CalculationPath }),
  ch2("2.7.1", "Transferul termic total", ["MC001-2022 pp. 97-101"], ["normative_calculation"], "IMPLEMENTED_CALCULATION", { formulas: ["Qtr", "Qve", "QHht"], calculationPath: chapter2CalculationPath }),
  ch2("2.7.1.1", "Transferul termic prin transmisie", ["MC001-2022 pp. 100-101"], ["normative_calculation"], "IMPLEMENTED_CALCULATION", { runtimeFunctions: ["calculateTransmissionMonthlyEnergy"], calculationPath: chapter2CalculationPath }),
  ch2("2.7.1.2", "Transferul termic prin ventilare", ["MC001-2022 pp. 101-103"], ["normative_calculation"], "IMPLEMENTED_CALCULATION", { runtimeFunctions: ["calculateVentilationMonthlyEnergy"], calculationPath: chapter2CalculationPath }),
  ch2("2.7.2", "Aporturi de căldură totale și aporturi interne", ["MC001-2022 pp. 103-105"], ["normative_calculation", "input_definition"], "IMPLEMENTED_CALCULATION", { runtimeFunctions: ["calculateInternalGains"], calculationPath: chapter2CalculationPath }),
  ch2("2.7.3", "Aporturi solare", ["MC001-2022 pp. 105-110"], ["normative_calculation"], "IMPLEMENTED_CALCULATION", { runtimeFunctions: ["calculateSolarGains"], calculationPath: chapter2CalculationPath }),
  ch2("2.7.3.1", "Energia transferată prin elemente transparente", ["MC001-2022 pp. 105-108"], ["normative_calculation"], "IMPLEMENTED_CALCULATION"),
  ch2("2.7.3.2", "Energia transferată prin elemente opace", ["MC001-2022 pp. 108-110"], ["normative_calculation"], "IMPLEMENTED_CALCULATION"),
  ch2("2.7.4", "Radiația termică către cer", ["MC001-2022 pp. 110-111"], ["normative_calculation", "input_definition"], "REPRESENTED_AS_INPUT", {
    remediation: "Datele de radiatie/cer sunt pastrate ca input climatic explicit cand sunt disponibile; profilul sintetic ramane numai demo/test."
  }),
  ch2("2.7.5", "Capacitatea termică eficace interioară a zonei", ["MC001-2022 pp. 111-113"], ["normative_calculation", "input_definition"], "IMPLEMENTED_CALCULATION"),
  ch2("2.7.6", "Factori de utilizare", ["MC001-2022 pp. 113-117"], ["normative_calculation", "normative_threshold"], "IMPLEMENTED_CALCULATION"),
  ch2("2.8", "Particularități ale calculului necesarului de energie propriu sistemului", ["MC001-2022 pp. 117-124"], ["normative_calculation", "workflow_procedure"], "IMPLEMENTED_CALCULATION"),
  ch2("2.8.1", "Încălzire sau răcire cu temperatură setată constantă", ["MC001-2022 pp. 117-120"], ["normative_calculation"], "IMPLEMENTED_CALCULATION"),
  ch2("2.8.2", "Corecție pentru încălzire intermitentă", ["MC001-2022 pp. 120-121"], ["normative_calculation"], "IMPLEMENTED_CALCULATION", { implementationFiles: ["src/physics-engine/mc001HeatingIntermittencyCalculation.mjs"] }),
  ch2("2.8.3", "Corecții pentru răcire intermitentă", ["MC001-2022 pp. 121-122"], ["normative_calculation"], "IMPLEMENTED_CALCULATION", { implementationFiles: ["src/physics-engine/mc001CoolingUsefulDemandCalculation.mjs"] }),
  ch2("2.8.4", "Corecții pentru perioada de neocupare", ["MC001-2022 pp. 122-123"], ["normative_calculation", "input_definition"], "REPRESENTED_AS_INPUT"),
  ch2("2.8.5", "Temperatură calculată într-o zonă climatizată, ca variabilă de ieșire", ["MC001-2022 p. 123"], ["input_definition", "reporting_requirement"], "REPRESENTED_AS_OUTPUT"),
  ch2("2.8.6", "Indicator de supraîncălzire", ["MC001-2022 pp. 123-124"], ["reporting_requirement", "validation_requirement"], "DOCUMENTED_NOT_APPLICABLE", {
    identifiedGaps: ["Nu este expus ca indicator de produs in fluxul actual, care evita clase/CPE si ore de disconfort fara profil orar."],
    remediation: "Ramane diagnostic documentat; implementarea necesita profil orar si context de raportare CPE, in afara P5A."
  }),
  ch2("2.9", "Necesar de energie pentru umidificare și dezumidificare", ["MC001-2022 pp. 124-126"], ["normative_calculation"], "IMPLEMENTED_CALCULATION", { implementationFiles: ["src/physics-engine/mc001LatentDemandCalculation.mjs"] }),
  ch2("2.9.1", "Umidificare", ["MC001-2022 pp. 124-125"], ["normative_calculation"], "IMPLEMENTED_CALCULATION", { implementationFiles: ["src/physics-engine/mc001LatentDemandCalculation.mjs"] }),
  ch2("2.9.2", "Dezumidificare", ["MC001-2022 pp. 125-126"], ["normative_calculation"], "IMPLEMENTED_CALCULATION", { implementationFiles: ["src/physics-engine/mc001LatentDemandCalculation.mjs"] }),
  ch2("2.10", "Necesarul anual de energie pentru încălzire, răcire și latent", ["MC001-2022 p. 126"], ["normative_calculation", "aggregation"], "IMPLEMENTED_CALCULATION", { formulas: ["2.84", "2.85", "2.86"], calculationPath: chapter2CalculationPath }),
  ch2("2.11", "Calcul simplificat al duratei perioadelor de încălzire/răcire", ["MC001-2022 pp. 126-127"], ["normative_calculation", "workflow_procedure"], "IMPLEMENTED_CALCULATION", {
    formulas: ["2.87"],
    implementationFiles: ["src/physics-engine/mc001NormativeRegistry.mjs", "docs/mc001-validation/EXTRACT_HEATING_PERIOD_BOUNDARY_METHOD.md"]
  }),
  ch2("2.12", "Calculul temperaturii interioare în regim liber", ["MC001-2022 pp. 127-132"], ["normative_calculation", "external_standard_delegation"], "DOCUMENTED_NOT_APPLICABLE"),
  ch2("2.12.1", "Prezentarea metodei", ["MC001-2022 p. 127"], ["workflow_procedure", "external_standard_delegation"], "DOCUMENTED_NOT_APPLICABLE"),
  ch2("2.12.2", "Modelul de calcul", ["MC001-2022 pp. 127-132"], ["normative_calculation", "external_standard_delegation"], "DOCUMENTED_NOT_APPLICABLE"),
  ch2("2.12.2.1", "Ecuația de bilanț termic pentru încăpere/zonă termică", ["MC001-2022 pp. 128-129"], ["normative_calculation", "external_standard_delegation"], "DOCUMENTED_NOT_APPLICABLE"),
  ch2("2.12.2.2", "Ecuații de bilanț termic în nodul de la suprafața interioară a unui element exterior", ["MC001-2022 pp. 130-131"], ["normative_calculation", "external_standard_delegation"], "DOCUMENTED_NOT_APPLICABLE"),
  ch2("2.12.2.3", "Bilanț termic în noduri dintre straturi și la exterior", ["MC001-2022 pp. 131-132"], ["normative_calculation", "external_standard_delegation"], "DOCUMENTED_NOT_APPLICABLE")
];

const chapter3Records = [
  ch3("3", "Evaluarea consumurilor de energie pentru sisteme de instalații fără surse regenerabile", ["MC001-2022 pp. 136-287"], ["workflow_procedure", "normative_calculation"], "IMPLEMENTED_CALCULATION", { calculationPath: chapter3CalculationPath }),
  ch3("3.1", "Instalații de încălzire", ["MC001-2022 pp. 136-153"], ["normative_calculation"], "IMPLEMENTED_CALCULATION", { formulas: ["3.1-3.39"], calculationPath: chapter3CalculationPath }),
  ch3("3.1.1", "Determinarea pierderilor energetice pentru emisie", ["MC001-2022 pp. 136-139"], ["normative_calculation"], "IMPLEMENTED_CALCULATION"),
  ch3("3.1.2", "Determinarea consumului de energie auxiliară", ["MC001-2022 pp. 139-141"], ["normative_calculation"], "IMPLEMENTED_CALCULATION"),
  ch3("3.1.3", "Determinarea consumului de energie și eficiența energetică a sistemelor de distribuție a apei", ["MC001-2022 pp. 141-145"], ["normative_calculation"], "IMPLEMENTED_CALCULATION"),
  ch3("3.1.4", "Energii auxiliare recuperabile și recuperate", ["MC001-2022 pp. 145-146"], ["normative_calculation"], "IMPLEMENTED_CALCULATION"),
  ch3("3.1.5", "Consumul de energie și eficiența energetică a sistemelor de generare pentru încălzire", ["MC001-2022 pp. 146-153"], ["normative_calculation", "normative_lookup_table"], "IMPLEMENTED_CALCULATION"),
  ch3("3.1.5.1", "Eficiența energetică a generatorului la sarcină integrală și parțială", ["MC001-2022 pp. 146-148"], ["normative_calculation", "normative_lookup_table"], "IMPLEMENTED_CALCULATION"),
  ch3("3.1.5.2", "Pierderile termice în stand-by", ["MC001-2022 pp. 148-149"], ["normative_calculation"], "IMPLEMENTED_CALCULATION"),
  ch3("3.1.5.3", "Energia auxiliară consumată", ["MC001-2022 p. 149"], ["normative_calculation"], "IMPLEMENTED_CALCULATION"),
  ch3("3.1.5.4", "Factorul de utilizare a energiei la nivelul cazanelor", ["MC001-2022 pp. 149-150"], ["normative_calculation"], "IMPLEMENTED_CALCULATION"),
  ch3("3.1.5.5", "Energia auxiliară consumată de subsistemul de generare", ["MC001-2022 p. 150"], ["normative_calculation"], "IMPLEMENTED_CALCULATION"),
  ch3("3.1.5.6", "Pierderi termice ale subsistemului de generare", ["MC001-2022 pp. 150-151"], ["normative_calculation"], "IMPLEMENTED_CALCULATION"),
  ch3("3.1.5.7", "Pierderi termice recuperabile și recuperate", ["MC001-2022 pp. 151-152"], ["normative_calculation"], "IMPLEMENTED_CALCULATION"),
  ch3("3.1.5.8", "Energia auxiliară", ["MC001-2022 p. 152"], ["normative_calculation"], "IMPLEMENTED_CALCULATION"),
  ch3("3.1.5.9", "Timpul de funcționare și factorul de sarcină specifică beta", ["MC001-2022 pp. 152-153"], ["normative_calculation"], "IMPLEMENTED_CALCULATION"),
  ch3("3.2", "Instalații de ventilare hibridă, mecanică și climatizare; cuplarea cu celelalte instalații", ["MC001-2022 pp. 155-245"], ["normative_calculation", "workflow_procedure"], "IMPLEMENTED_CALCULATION", { formulas: ["3.40-3.186"], calculationPath: chapter3CalculationPath }),
  ch3("3.2.1", "Domeniu de aplicare", ["MC001-2022 pp. 155-156"], ["explanatory_text", "classification_only"], "IMPLEMENTED_WORKFLOW"),
  ch3("3.2.2", "Calculul energetic al generării (al CTA)", ["MC001-2022 pp. 156-160"], ["normative_calculation"], "IMPLEMENTED_CALCULATION"),
  ch3("3.2.3", "Calcul energetic al distribuției", ["MC001-2022 pp. 160-163"], ["normative_calculation"], "IMPLEMENTED_CALCULATION"),
  ch3("3.2.3.1", "Pierderi de aer în conducte și în centrala de tratare a aerului", ["MC001-2022 pp. 160-161"], ["normative_calculation"], "IMPLEMENTED_CALCULATION"),
  ch3("3.2.3.2", "Pierderi termice ale conductelor de aer", ["MC001-2022 pp. 161-162"], ["normative_calculation"], "IMPLEMENTED_CALCULATION"),
  ch3("3.2.3.3", "Exemplu de calcul", ["MC001-2022 pp. 162-163"], ["worked_example"], "WORKED_EXAMPLE_ONLY"),
  ch3("3.2.4", "Consumuri energetice pentru stocarea căldurii/frigului", ["MC001-2022 pp. 193-210"], ["normative_calculation"], "IMPLEMENTED_CALCULATION", { formulas: ["3.94-3.123"] }),
  ch3("3.2.4.1", "Generalități, metode de calcul", ["MC001-2022 pp. 193-195"], ["workflow_procedure"], "IMPLEMENTED_WORKFLOW"),
  ch3("3.2.4.2", "Date de intrare", ["MC001-2022 pp. 195-196"], ["input_definition"], "REPRESENTED_AS_INPUT"),
  ch3("3.2.4.3", "Metoda de calcul orar; procedură de calcul, mărimi de ieșire", ["MC001-2022 pp. 196-205"], ["normative_calculation"], "IMPLEMENTED_CALCULATION"),
  ch3("3.2.4.4", "Metoda de calcul lunar", ["MC001-2022 pp. 205-210"], ["normative_calculation", "aggregation"], "IMPLEMENTED_CALCULATION"),
  ch3("3.2.4.5", "Exemplu de calcul", ["MC001-2022 pp. 210-214"], ["worked_example"], "WORKED_EXAMPLE_ONLY"),
  ch3("3.2.5", "Consumul de energie și eficiența energetică a sistemelor de climatizare de tip aer-apă sau aer-refrigerent", ["MC001-2022 pp. 214-219"], ["normative_calculation"], "IMPLEMENTED_CALCULATION", { formulas: ["3.136-3.155"] }),
  ch3("3.2.5.1", "Tipuri de sisteme", ["MC001-2022 p. 214"], ["classification_only"], "IMPLEMENTED_WORKFLOW"),
  ch3("3.2.5.2", "Date de intrare", ["MC001-2022 pp. 214-216"], ["input_definition"], "REPRESENTED_AS_INPUT"),
  ch3("3.2.5.3", "Calculul mărimilor de ieșire", ["MC001-2022 pp. 216-219"], ["normative_calculation"], "IMPLEMENTED_CALCULATION"),
  ch3("3.2.6", "Generarea frigului", ["MC001-2022 pp. 219-235"], ["normative_calculation", "normative_lookup_table"], "IMPLEMENTED_CALCULATION", { formulas: ["3.156-3.182"], tables: ["Tabel 3.18", "Tabel 3.19", "Tabel 3.20", "Tabel 3.21", "Tabel 3.22", "Tabel 3.23"] }),
  ch3("3.2.6.1", "Introducere", ["MC001-2022 pp. 219-220"], ["explanatory_text"], "IMPLEMENTED_WORKFLOW"),
  ch3("3.2.6.2", "Date de intrare", ["MC001-2022 pp. 220-223"], ["input_definition", "normative_lookup_table"], "REPRESENTED_AS_INPUT"),
  ch3("3.2.6.3", "Calculul mărimilor de ieșire ale metodei", ["MC001-2022 pp. 223-235"], ["normative_calculation"], "IMPLEMENTED_CALCULATION"),
  ch3("3.2.6.4", "Exemple de calcul", ["MC001-2022 pp. 235-245"], ["worked_example"], "WORKED_EXAMPLE_ONLY"),
  ch3("3.2.7", "Sinteză a calculului energetic al sistemelor de încălzire, răcire, ventilare și răcire", ["MC001-2022 pp. 245-249"], ["normative_calculation", "aggregation"], "IMPLEMENTED_CALCULATION", { formulas: ["3.183-3.186"] }),
  ch3("3.3", "Instalații pentru apa caldă de consum", ["MC001-2022 pp. 250-282"], ["normative_calculation", "workflow_procedure"], "IMPLEMENTED_CALCULATION", { formulas: ["3.188-3.228"], calculationPath: chapter3CalculationPath }),
  ch3("3.3.1", "Obiect și domeniu de aplicare", ["MC001-2022 pp. 250-251"], ["explanatory_text"], "IMPLEMENTED_WORKFLOW"),
  ch3("3.3.2", "Clasificarea instalațiilor de apă caldă de consum", ["MC001-2022 pp. 251-254"], ["classification_only"], "IMPLEMENTED_WORKFLOW"),
  ch3("3.3.2.1", "Definirea subsistemelor aferente instalației de apă caldă de consum", ["MC001-2022 pp. 251-252"], ["classification_only", "input_definition"], "IMPLEMENTED_WORKFLOW"),
  ch3("3.3.2.2", "Schemele de preparare a apei calde de consum adoptate", ["MC001-2022 pp. 252-253"], ["classification_only"], "IMPLEMENTED_WORKFLOW"),
  ch3("3.3.2.3", "Zonarea instalațiilor/sistemelor de apă caldă de consum", ["MC001-2022 pp. 253-254"], ["zoning_rule"], "IMPLEMENTED_WORKFLOW"),
  ch3("3.3.3", "Consumul de energie pentru instalațiile de apă caldă de consum", ["MC001-2022 pp. 254-256"], ["normative_calculation"], "IMPLEMENTED_CALCULATION"),
  ch3("3.3.4", "Perioadele de calcul", ["MC001-2022 p. 256"], ["workflow_procedure"], "IMPLEMENTED_WORKFLOW"),
  ch3("3.3.5", "Temperaturi specifice sistemului de apă caldă de consum", ["MC001-2022 pp. 256-258"], ["input_definition", "normative_threshold"], "IMPLEMENTED_LOOKUP"),
  ch3("3.3.6", "Necesarul de căldură pentru prepararea apei calde de consum furnizată utilizatorului", ["MC001-2022 pp. 258-264"], ["normative_calculation", "normative_lookup_table"], "IMPLEMENTED_CALCULATION", { formulas: ["3.188-3.197"], tables: ["Tabel 3.3.1"], implementationFiles: ["src/physics-engine/dhwUsefulDemand.mjs"] }),
  ch3("3.3.6.1", "Volumul necesar de apă caldă de consum calculat cu debite specifice și număr de consumatori", ["MC001-2022 pp. 258-261"], ["normative_calculation", "normative_lookup_table"], "IMPLEMENTED_CALCULATION"),
  ch3("3.3.6.2", "Necesarul de apă caldă aferent persoanelor în clădiri de locuit determinat în funcție de aria utilă", ["MC001-2022 pp. 261-264"], ["normative_calculation"], "IMPLEMENTED_CALCULATION"),
  ch3("3.3.7", "Metoda de calcul a consumurilor de energie pentru conductele de distribuție", ["MC001-2022 pp. 264-269"], ["normative_calculation"], "IMPLEMENTED_CALCULATION", { formulas: ["3.200-3.224"], implementationFiles: ["src/physics-engine/dhwDistributionLosses.mjs"] }),
  ch3("3.3.7.1", "Calculul pierderilor termice și a energiei auxiliare aferente subsistemului de distribuție", ["MC001-2022 pp. 264-265"], ["normative_calculation"], "IMPLEMENTED_CALCULATION"),
  ch3("3.3.7.2", "Determinarea pierderilor termice ale subsistemului de distribuție", ["MC001-2022 pp. 265-267"], ["normative_calculation"], "IMPLEMENTED_CALCULATION"),
  ch3("3.3.7.3", "Determinarea pierderilor termice recuperabile ale subsistemului de distribuție", ["MC001-2022 pp. 267-268"], ["normative_calculation"], "IMPLEMENTED_CALCULATION"),
  ch3("3.3.7.4", "Calculul consumului de energie auxiliară al subsistemului de distribuție", ["MC001-2022 pp. 268-269"], ["normative_calculation"], "IMPLEMENTED_CALCULATION"),
  ch3("3.3.8", "Pierderi termice aferente rezervoarelor de acumulare din sistemul de apă caldă de consum", ["MC001-2022 pp. 269-271"], ["normative_calculation", "input_definition"], "IMPLEMENTED_CALCULATION", { formulas: ["3.225-3.228"] }),
  ch3("3.3.9", "Pierderi termice aferente subsistemului de generare din sistemul de apă caldă de consum", ["MC001-2022 pp. 271-272"], ["input_definition", "normative_calculation"], "REPRESENTED_AS_INPUT"),
  ch3("ANEXA 3.3.A", "Exemplu de calcul - Necesarul de căldură pentru prepararea apei calde de consum", ["MC001-2022 pp. 273-278"], ["worked_example"], "WORKED_EXAMPLE_ONLY"),
  ch3("ANEXA 3.3.B", "Determinarea pierderilor termice aferente conductelor de distribuție", ["MC001-2022 pp. 278-282"], ["worked_example", "normative_calculation"], "IMPLEMENTED_CALCULATION", { implementationFiles: ["src/physics-engine/dhwDistributionLosses.mjs"] }),
  ch3("3.4", "Instalații pentru iluminat; cuplarea cu lumina naturală", ["MC001-2022 pp. 283-287"], ["external_standard_delegation", "input_definition"], "EXTERNAL_NORMATIVE_DEPENDENCY", {
    externalReferences: ["SR EN 15193-1"],
    implementationFiles: ["src/physics-engine/mc001Chapter3SystemEnergy.mjs", "src/building-platform/buildingChapter3InstallationsAdapter.mjs"],
    laCurentTreatment: "MC001 LENI agregat este acceptat numai ca input explicit; motorul complet SR EN 15193-1 nu este inventat.",
    identifiedGaps: ["SR EN 15193-1 equations 1-13 and 25-33 plus annex tables are absent from repository."],
    remediation: "Implementarea completa se face numai dupa furnizarea sursei normative SR EN 15193-1."
  }),
  ch3("3.4.1", "Informații generale; alte referințe tehnice aplicabile", ["MC001-2022 pp. 283-284"], ["external_standard_delegation", "explanatory_text"], "EXTERNAL_NORMATIVE_DEPENDENCY", { externalReferences: ["SR EN 15193-1", "SR EN 12464-1", "SR EN 12193", "SR EN 1838"] }),
  ch3("3.4.2", "Metode de calcul al indicatorului LENI totale a unei clădiri/zone", ["MC001-2022 pp. 284-287"], ["external_standard_delegation", "normative_calculation"], "EXTERNAL_NORMATIVE_DEPENDENCY", { externalReferences: ["SR EN 15193-1"] }),
  ch3("3.4.2.1", "Metoda complexă de calcul", ["MC001-2022 pp. 284-286"], ["external_standard_delegation", "normative_calculation"], "EXTERNAL_NORMATIVE_DEPENDENCY", { externalReferences: ["SR EN 15193-1 equations 1-13"] }),
  ch3("3.4.2.2", "Metoda simplificată de calcul", ["MC001-2022 pp. 286-287"], ["external_standard_delegation", "normative_calculation"], "EXTERNAL_NORMATIVE_DEPENDENCY", { externalReferences: ["SR EN 15193-1 equations 25-33 and annexes"] })
];

const records = [...chapter2Records, ...chapter3Records];

const audit = {
  schema: "mc001_subchapter_coverage_v1",
  generatedBy: "tools/generate-mc001-subchapter-coverage.mjs",
  source: {
    normativeDocument: "MC001-2022 official PDF",
    pdfPath: "docs/Mc_001-2022_-_Metodologie_calcul_performanta_energetica_caldiri.pdf",
    extractionBasis: "official PDF table of contents plus targeted body-heading checks",
    secondaryLegibilitySources: []
  },
  allowedStatuses,
  summary: {
    totalHeadings: records.length,
    chapter2Headings: chapter2Records.length,
    chapter3Headings: chapter3Records.length,
    statusCounts: Object.fromEntries(allowedStatuses.map(status => [
      status,
      records.filter(record => record.currentStatus === status).length
    ])),
    chapter3RelationCoverage: chapter3MatrixSummary(),
    climateCoverage: ROMANIAN_CLIMATE_COVERAGE,
    srEn15193Status: chapter3LightingExternalImplementationPlan.status
  },
  climate: {
    registryVersion: ROMANIAN_CLIMATE_ZONE_REGISTRY_VERSION,
    sourceInventory: ROMANIAN_CLIMATE_SOURCE_INVENTORY,
    coverage: ROMANIAN_CLIMATE_COVERAGE,
    refinedStatusLegend: CLIMATE_AUDIT_REFINED_STATUSES,
    datasetStatuses: CLIMATE_DATASET_STATUSES,
    dataDomains: ROMANIAN_CLIMATE_DATA_DOMAINS,
    winterDesignTemperatureByZone: MC001_WINTER_DESIGN_TEMPERATURES_BY_ZONE,
    requirementMatrix: ROMANIAN_CLIMATE_REQUIREMENT_MATRIX,
    normativeDependencies: ROMANIAN_CLIMATE_NORMATIVE_DEPENDENCIES,
    acquisitionList: ROMANIAN_CLIMATE_ACQUISITION_LIST,
    policy:
      "All five MC001 climate-zone identifiers are implemented. Complete locality/monthly temperature and solar datasets are not silently fabricated."
  },
  records
};

function mdTableRows(items) {
  return items.map(item => [
    item.sectionNumber,
    item.titleRo,
    item.classification.join(", "),
    item.currentStatus,
    item.implementationFiles.join("<br>"),
    item.testCoverage.join("<br>"),
    item.identifiedGaps.join("<br>") || "-"
  ].map(value => String(value).replace(/\|/g, "\\|")).join(" | "));
}

const markdown = `# MC001-2022 Chapter 2/3 Subchapter Functional Coverage

Source: official MC001-2022 PDF at \`${audit.source.pdfPath}\`.

Generated by: \`${audit.generatedBy}\`.

## Summary

- Total headings: ${audit.summary.totalHeadings}
- Chapter 2 headings: ${audit.summary.chapter2Headings}
- Chapter 3 headings: ${audit.summary.chapter3Headings}
- Climate-zone registry version: \`${audit.climate.registryVersion}\`
- Romanian climate zones implemented: ${audit.climate.coverage.coveredClimateZones}/${audit.climate.coverage.totalClimateZones}
- Source-backed locality mappings in MC001 PDF: ${audit.climate.coverage.totalSourceBackedLocalityMappings}
- SR EN 15193-1 lighting engine: ${audit.summary.srEn15193Status}

## Climate Source Audit

${audit.climate.sourceInventory.map(item =>
  `- ${item.inventoryId}: ${item.status}; source ${item.sourceLocation}; runtime use: ${item.runtimeUse}`
).join("\n")}

## Romanian Climate Dependency Boundary

- Climate-zone classification, wind-zone classification and winter exterior design-temperature lookup are separate domains.
- Selecting zone I-V never supplies monthly exterior temperatures or solar irradiation by itself.
- Monthly energy calculations require either a source-backed normative dataset or a user-supplied certified dataset.
- Main unavailable normative dataset: ${audit.climate.normativeDependencies.find(item => item.dependencyId === "mc001_6_2013_climate_parameters_volume").exactExternalDocument}.
- Preprocessing standard dependency: ${audit.climate.normativeDependencies.find(item => item.dependencyId === "sr_en_iso_52010_1_climate_preprocessing").exactExternalDocument}.

| Domain | Status | Purpose |
| --- | --- | --- |
${audit.climate.dataDomains.map(item => `${item.domainId} | ${item.status} | ${String(item.purpose).replace(/\|/g, "\\|")}`).join("\n")}

| Calculation | Requires | Missing diagnostic |
| --- | --- | --- |
${audit.climate.requirementMatrix.map(item => `${item.calculationId} | ${item.requires.join(", ")} | ${item.missingDiagnostic}`).join("\n")}

## Chapter 2

| Section | Title | Classification | Status | Implementation | Tests | Gaps |
| --- | --- | --- | --- | --- | --- | --- |
${mdTableRows(chapter2Records).join("\n")}

## Chapter 3

| Section | Title | Classification | Status | Implementation | Tests | Gaps |
| --- | --- | --- | --- | --- | --- | --- |
${mdTableRows(chapter3Records).join("\n")}

## Remaining External Dependencies

- SR EN 15193-1 remains required for a full normative lighting engine. MC001 LENI aggregation over explicit professional inputs is implemented, but this is not the complete lighting method.
- The official MC001 PDF available in the repository does not reproduce a complete Romanian locality-to-zone registry or complete monthly exterior-temperature/orientation-solar datasets. LaCurent therefore exposes explicit zone selection, source-backed zone lookup tables, explicit professional profiles, and diagnostics instead of hidden locality/monthly fallbacks.
`;

mkdirSync(dirname(OUTPUT_JSON), { recursive: true });
writeFileSync(OUTPUT_JSON, `${JSON.stringify(audit, null, 2)}\n`, "utf8");
writeFileSync(OUTPUT_MD, markdown, "utf8");
