import { mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

import { getMc001NormativeRegistry } from "../src/physics-engine/mc001NormativeRegistry.mjs";
import {
  ROMANIAN_CLIMATE_COVERAGE,
  ROMANIAN_CLIMATE_REQUIREMENT_MATRIX,
  listRomanianNormativeSolarIrradiationLocalities,
  listRomanianProductionClimateLocalities
} from "../src/climate-platform/index.mjs";

const __dirname = dirname(fileURLToPath(import.meta.url));
const rootDir = join(__dirname, "..");

const BASE_COMMIT = "c4a26b05b2e7aead145be2c7174b0916169c7bb3";
const MATRIX_PATH = join(rootDir, "validation-reference", "chapter2-coverage-matrix.json");
const REPORT_PATH = join(rootDir, "docs", "validation", "P7C_CHAPTER2_COVERAGE_AUDIT.md");
const P7A_MAPPING_PATH = join(rootDir, "validation-reference", "p7a-chapter2-ui-runtime-mapping.json");

const STATUS = Object.freeze(["COMPLETE", "PARTIAL", "BOUNDED", "NOT_IMPLEMENTED"]);

const NUMBERING_GAPS = new Set(["2.2", "2.5"]);
const PARTIAL_RELATIONS = new Set([
  "2.1",
  "2.25",
  "2.26",
  "2.36",
  "2.38",
  "2.39",
  "2.50",
  "2.54",
  "2.87"
]);
const NOT_IMPLEMENTED_RELATIONS = new Set([
  "2.44",
  "2.45",
  "2.46"
]);

const RELATION_EVIDENCE = Object.freeze({
  "2.1": {
    implementationFile: "src/building-platform/buildingChapter2Adapter.mjs",
    tests: ["src/building-platform/tests/buildingInputPropagationAudit.test.mjs"],
    executionTraceSupport: "represented_as_input_provenance",
    reportSupport: "geometry/report metadata",
    productionEligibility: "represented_as_explicit_geometry_input",
    limitation:
      "Relation 2.1 envelope/volume definitions are represented as explicit Building DNA geometry; no independent measured-geometry workflow is implemented."
  },
  "2.4": {
    status: "COMPLETE",
    implementationFile: "src/physics-engine/mc001Chapter2SupplementaryRelations.mjs",
    tests: ["src/physics-engine/tests/mc001Chapter2SupplementaryRelations.test.mjs"],
    executionTraceSupport: "execution_trace",
    reportSupport: "surface condensation diagnostic helper when supplied",
    productionEligibility: "production_ready_with_explicit_temperature_or_resistance_inputs",
    limitation:
      "Relation 2.4 is a surface-temperature factor/condensation-risk helper; it does not modify the useful-demand balance."
  },
  "2.3": {
    implementationFile: "src/physics-engine/materialsUValues.mjs",
    tests: [
      "src/physics-engine/tests/materialsUValues.test.mjs",
      "src/physics-engine/tests/mc001Chapter2IndependentValidationPack.test.mjs"
    ],
    executionTraceSupport: "formula_result_metadata",
    reportSupport: "materials/layers notebook",
    productionEligibility: "production_ready"
  },
  "2.6": {
    implementationFile: "src/physics-engine/materialsUValues.mjs",
    tests: ["src/physics-engine/tests/materialsUValues.test.mjs"],
    executionTraceSupport: "formula_result_metadata",
    reportSupport: "R total notebook",
    productionEligibility: "production_ready"
  },
  "2.7": {
    implementationFile: "src/physics-engine/materialsUValues.mjs",
    tests: ["src/physics-engine/tests/materialsUValues.test.mjs"],
    executionTraceSupport: "formula_result_metadata",
    reportSupport: "U-value notebook",
    productionEligibility: "production_ready"
  },
  "2.8": {
    implementationFile: "src/physics-engine/mc001EnvelopePhysicsCalculation.mjs",
    tests: ["src/physics-engine/tests/mc001EnvelopePhysicsCalculation.test.mjs"],
    executionTraceSupport: "formula_result_metadata",
    reportSupport: "transparent element thermal resistance/U reporting",
    productionEligibility: "production_ready_with_explicit_window_inputs"
  },
  "2.9": {
    implementationFile: "src/physics-engine/mc001EnvelopePhysicsCalculation.mjs",
    tests: ["src/physics-engine/tests/mc001EnvelopePhysicsCalculation.test.mjs"],
    executionTraceSupport: "formula_result_metadata",
    reportSupport: "special element thermal resistance/U reporting",
    productionEligibility: "production_ready_with_explicit_inputs"
  },
  "2.10": {
    implementationFile: "src/physics-engine/mc001EnvelopePhysicsCalculation.mjs",
    tests: ["src/physics-engine/tests/mc001EnvelopePhysicsCalculation.test.mjs"],
    executionTraceSupport: "formula_result_metadata",
    reportSupport: "thermal transmittance correction reporting",
    productionEligibility: "production_ready_with_explicit_inputs"
  },
  "2.11": {
    implementationFile: "src/physics-engine/transmissionCoefficients.mjs",
    tests: ["src/physics-engine/tests/transmissionCoefficients.test.mjs"],
    executionTraceSupport: "formula_result_metadata",
    reportSupport: "envelope transmission notebook",
    productionEligibility: "production_ready"
  },
  "2.12": {
    implementationFile: "src/physics-engine/transmissionCoefficients.mjs",
    tests: [
      "src/physics-engine/tests/transmissionCoefficients.test.mjs",
      "src/physics-engine/tests/validation/fixture004TransmissionLossTotals.validation.test.mjs"
    ],
    executionTraceSupport: "formula_result_metadata",
    reportSupport: "envelope transmission notebook",
    productionEligibility: "production_ready"
  },
  "2.13": {
    implementationFile: "src/physics-engine/transmissionCoefficients.mjs",
    tests: ["src/physics-engine/tests/transmissionCoefficients.test.mjs"],
    executionTraceSupport: "formula_result_metadata",
    reportSupport: "thermal bridge notebook",
    productionEligibility: "production_ready_with_explicit_bridge_geometry"
  },
  "2.14": {
    implementationFile: "src/physics-engine/mc001TransmissionFormulaCalculations.mjs",
    tests: ["src/physics-engine/tests/mc001TransmissionFormulaCalculations.test.mjs"],
    executionTraceSupport: "formula_result_metadata",
    reportSupport: "monthly transmission notebook",
    productionEligibility: "production_ready"
  },
  "2.15": {
    implementationFile: "src/physics-engine/transmissionCoefficients.mjs",
    tests: [
      "src/physics-engine/tests/transmissionCoefficients.test.mjs",
      "src/physics-engine/tests/mc001HtrTotalCalculation.test.mjs"
    ],
    executionTraceSupport: "formula_result_metadata",
    reportSupport: "Htr notebook/report",
    productionEligibility: "production_ready"
  },
  "2.16": {
    status: "COMPLETE",
    implementationFile: "src/physics-engine/mc001Chapter2SupplementaryRelations.mjs",
    tests: ["src/physics-engine/tests/mc001Chapter2SupplementaryRelations.test.mjs"],
    executionTraceSupport: "execution_trace",
    reportSupport: "average corrected element U/R diagnostic helper when supplied",
    productionEligibility: "production_ready_with_explicit_surface_areas_and_corrected_u_values"
  },
  "2.17": {
    status: "COMPLETE",
    implementationFile: "src/physics-engine/mc001Chapter2SupplementaryRelations.mjs",
    tests: ["src/physics-engine/tests/mc001Chapter2SupplementaryRelations.test.mjs"],
    executionTraceSupport: "execution_trace",
    reportSupport: "average corrected envelope U/R diagnostic helper when supplied",
    productionEligibility: "production_ready_with_explicit_surface_areas_and_corrected_u_values"
  },
  "2.18": {
    status: "COMPLETE",
    implementationFile: "src/physics-engine/mc001Chapter2SupplementaryRelations.mjs",
    tests: ["src/physics-engine/tests/mc001Chapter2SupplementaryRelations.test.mjs"],
    executionTraceSupport: "execution_trace",
    reportSupport: "thermal coupling diagnostic helper when supplied",
    productionEligibility: "production_ready_with_explicit_area_and_corrected_u_value"
  },
  "2.19": {
    status: "COMPLETE",
    implementationFile: "src/physics-engine/mc001Chapter2SupplementaryRelations.mjs",
    tests: ["src/physics-engine/tests/mc001Chapter2SupplementaryRelations.test.mjs"],
    executionTraceSupport: "execution_trace",
    reportSupport: "heat-flow diagnostic helper when supplied",
    productionEligibility: "production_ready_with_explicit_coupling_and_temperature_difference"
  },
  "2.20": {
    implementationFile: "src/physics-engine/datasets/mc001VentilationInfiltrationTable2_14.mjs",
    tests: ["src/physics-engine/tests/mc001VentilationInfiltrationTable2_14.test.mjs"],
    executionTraceSupport: "lookup_result_metadata",
    reportSupport: "ventilation source trace",
    productionEligibility: "production_ready_for_table_2_14_lookup_paths"
  },
  "2.21": {
    implementationFile: "src/physics-engine/mc001BztuDirectInputGate.mjs",
    tests: ["src/physics-engine/tests/mc001BztuDirectInputGate.test.mjs"],
    executionTraceSupport: "formula_result_metadata",
    reportSupport: "unconditioned-zone boundary diagnostics",
    productionEligibility: "production_ready_with_explicit_bztu_inputs"
  },
  "2.22": {
    implementationFile: "src/physics-engine/mc001BztuDirectInputGate.mjs",
    tests: ["src/physics-engine/tests/mc001BztuDirectInputGate.test.mjs"],
    executionTraceSupport: "formula_result_metadata",
    reportSupport: "unconditioned-zone boundary diagnostics",
    productionEligibility: "production_ready_with_explicit_bztu_balance_inputs"
  },
  "2.23": {
    implementationFile: "src/physics-engine/mc001BztuDirectInputGate.mjs",
    tests: ["src/physics-engine/tests/mc001BztuDirectInputGate.test.mjs"],
    executionTraceSupport: "formula_result_metadata",
    reportSupport: "unconditioned-zone boundary diagnostics",
    productionEligibility: "production_ready_with_explicit_bztu_balance_inputs"
  },
  "2.24": {
    implementationFile: "src/physics-engine/mc001BztuDirectInputGate.mjs",
    tests: ["src/physics-engine/tests/mc001BztuDirectInputGate.test.mjs"],
    executionTraceSupport: "formula_result_metadata",
    reportSupport: "unconditioned-zone boundary diagnostics",
    productionEligibility: "production_ready_with_explicit_cztu_ve_or_source_backed_factor"
  },
  "2.25": {
    implementationFile: "src/physics-engine/mc001TransmissionFormulaCalculations.mjs",
    tests: ["src/physics-engine/tests/mc001TransmissionFormulaCalculations.test.mjs"],
    executionTraceSupport: "formula_result_metadata",
    reportSupport: "boundary correction diagnostics",
    productionEligibility: "explicit_input_boundary",
    limitation:
      "Detailed delegated ground-contact methods are not reproduced by MC001 Chapter 2; runtime accepts explicit source-backed factors."
  },
  "2.26": {
    implementationFile: "src/physics-engine/mc001TransmissionFormulaCalculations.mjs",
    tests: ["src/physics-engine/tests/mc001TransmissionFormulaCalculations.test.mjs"],
    executionTraceSupport: "formula_result_metadata",
    reportSupport: "boundary correction diagnostics",
    productionEligibility: "explicit_input_boundary",
    limitation:
      "Detailed delegated adjacent/ground correction paths are represented through explicit source-backed factors."
  },
  "2.27": {
    implementationFile: "src/physics-engine/mc001TransmissionFormulaCalculations.mjs",
    tests: ["src/physics-engine/tests/mc001TransmissionFormulaCalculations.test.mjs"],
    executionTraceSupport: "formula_result_metadata",
    reportSupport: "monthly Htr notebook",
    productionEligibility: "production_ready"
  },
  "2.28": {
    implementationFile: "src/physics-engine/mc001TransmissionFormulaCalculations.mjs",
    tests: ["src/physics-engine/tests/mc001TransmissionFormulaCalculations.test.mjs"],
    executionTraceSupport: "formula_result_metadata",
    reportSupport: "thermal bridge notebook",
    productionEligibility: "production_ready_with_explicit_bridge_geometry"
  },
  "2.29": {
    implementationFile: "src/physics-engine/ventilationCoefficients.mjs",
    tests: ["src/physics-engine/tests/ventilationCoefficients.test.mjs"],
    executionTraceSupport: "formula_result_metadata",
    reportSupport: "monthly ventilation notebook",
    productionEligibility: "production_ready"
  },
  "2.30": {
    implementationFile: "src/physics-engine/ventilationCoefficients.mjs",
    tests: ["src/physics-engine/tests/ventilationCoefficients.test.mjs"],
    executionTraceSupport: "formula_result_metadata",
    reportSupport: "ventilation coefficient notebook",
    productionEligibility: "production_ready"
  },
  "2.31": {
    implementationFile: "src/physics-engine/ventilationCoefficients.mjs",
    tests: ["src/physics-engine/tests/ventilationCoefficients.test.mjs"],
    executionTraceSupport: "formula_result_metadata",
    reportSupport: "ventilation correction diagnostics",
    productionEligibility: "production_ready_with_explicit_temperatures"
  },
  "2.32": {
    implementationFile: "src/physics-engine/ventilationCoefficients.mjs",
    tests: ["src/physics-engine/tests/ventilationCoefficients.test.mjs"],
    executionTraceSupport: "formula_result_metadata",
    reportSupport: "ventilation correction diagnostics",
    productionEligibility: "production_ready_with_explicit_temperatures"
  },
  "2.33": {
    implementationFile: "src/physics-engine/mc001MonthlyHeatGainsCalculation.mjs",
    tests: ["src/physics-engine/tests/mc001MonthlyHeatGainsCalculation.test.mjs"],
    executionTraceSupport: "formula_result_metadata",
    reportSupport: "monthly gains notebook",
    productionEligibility: "production_ready_when_Qint_and_Qsol_are_available"
  },
  "2.34": {
    status: "COMPLETE",
    implementationFile: "src/physics-engine/mc001MonthlyHeatGainsCalculation.mjs",
    tests: [
      "src/physics-engine/tests/mc001MonthlyHeatGainsCalculation.test.mjs",
      "src/physics-engine/tests/mc001Chapter2UsefulDemandCalculation.test.mjs"
    ],
    executionTraceSupport: "execution_trace",
    reportSupport: "adjacent-zone gains trace through monthly heat-gains runtime",
    productionEligibility: "production_ready_with_explicit_source_backed_adjacent_zone_inputs",
    limitation:
      "P7E closes the runtime/report/test chain for explicit/source-backed bztu, distribution and reduction inputs; hidden adjacent-zone defaults remain prohibited."
  },
  "2.35": {
    status: "COMPLETE",
    implementationFile: "src/physics-engine/mc001InternalGainsCalculation.mjs",
    tests: [
      "src/physics-engine/tests/mc001InternalGainsCalculation.test.mjs",
      "src/physics-engine/tests/mc001MonthlyHeatGainsCalculation.test.mjs",
      "src/physics-engine/tests/mc001InternalGainsTable2_15.test.mjs",
      "src/building-platform/tests/buildingDnaResolver.test.mjs",
      "src/building-platform/tests/buildingTechnicalReport.test.mjs"
    ],
    executionTraceSupport: "execution_trace",
    reportSupport: "internal gains notebook/report via runtime trace",
    productionEligibility: "production_ready_for_table_2_15_category_area_duration_or_explicit_monthly_input",
    limitation:
      "P7E implements Table 2.15 category-area-duration derivation and explicit monthly input contracts; source-specific occupant/equipment schedules outside owned MC001 tables remain explicit expert inputs, not hidden defaults."
  },
  "2.36": {
    implementationFile: "src/physics-engine/mc001SolarGainsCalculation.mjs",
    tests: ["src/physics-engine/tests/mc001SolarGainsCalculation.test.mjs"],
    executionTraceSupport: "formula_result_metadata",
    reportSupport: "solar gains notebook when eligible",
    productionEligibility: "explicit_monthly_Qsol_or_source_backed_Hsol_with_Qsky_and_complete_solar_element_inputs",
    limitation:
      "P7B provides source-backed A.9.6 Hsol for tabulated vertical/horizontal planes; automatic Qsol still requires Qsky-compatible inputs and complete solar element inputs."
  },
  "2.37": {
    status: "COMPLETE",
    implementationFile: "src/physics-engine/mc001MonthlyHeatGainsCalculation.mjs",
    tests: [
      "src/physics-engine/tests/mc001MonthlyHeatGainsCalculation.test.mjs",
      "src/physics-engine/tests/mc001Chapter2UsefulDemandCalculation.test.mjs"
    ],
    executionTraceSupport: "execution_trace",
    reportSupport: "adjacent-zone solar gains trace",
    productionEligibility: "production_ready_with_explicit_source_backed_adjacent_zone_solar_inputs",
    limitation:
      "P7E closes the adjacent-zone distribution/reduction contract; automatic direct Qsol generation remains tracked under relations 2.36, 2.38, 2.39, 2.50 and 2.54."
  },
  "2.38": {
    implementationFile: "src/physics-engine/mc001SolarGainsCalculation.mjs",
    tests: ["src/physics-engine/tests/mc001SolarGainsCalculation.test.mjs"],
    executionTraceSupport: "formula_result_metadata",
    reportSupport: "solar gains notebook when eligible",
    productionEligibility: "explicit_monthly_Qsol_or_source_backed_Hsol_with_Qsky_and_complete_solar_element_inputs",
    limitation: "Direct solar gains require source-backed transparent/opaque component inputs; P7B supplies Hsol but not Qsky or full element data."
  },
  "2.39": {
    implementationFile: "src/physics-engine/mc001SolarGainsCalculation.mjs",
    tests: ["src/physics-engine/tests/mc001SolarGainsCalculation.test.mjs"],
    executionTraceSupport: "formula_result_metadata",
    reportSupport: "transparent solar notebook when eligible",
    productionEligibility: "source_backed_A9_6_vertical_horizontal_Hsol_available_Qsky_and_element_inputs_required",
    limitation: "Hsol from A.9.6 is production-integrated for vertical/horizontal tabulated planes; Qsky and complete transparent-element inputs remain required before automatic Qsol can be claimed."
  },
  "2.40": {
    implementationFile: "src/physics-engine/datasets/mc001SolarTransmissionTable2_13.mjs",
    tests: ["src/physics-engine/tests/mc001SolarTransmissionTable2_13.test.mjs"],
    executionTraceSupport: "lookup_result_metadata",
    reportSupport: "transparent solar input provenance",
    productionEligibility: "production_ready_for_table_2_13_lookup_paths",
    limitation: null
  },
  "2.41": {
    status: "COMPLETE",
    implementationFile: "src/physics-engine/mc001Chapter2SupplementaryRelations.mjs",
    tests: ["src/physics-engine/tests/mc001Chapter2SupplementaryRelations.test.mjs"],
    executionTraceSupport: "execution_trace",
    reportSupport: "diffuse glazing transmittance helper when supplied",
    productionEligibility: "production_ready_with_explicit_altitude_and_diffuse_glazing_transmittance"
  },
  "2.42": {
    status: "COMPLETE",
    implementationFile: "src/physics-engine/mc001Chapter2SupplementaryRelations.mjs",
    tests: ["src/physics-engine/tests/mc001Chapter2SupplementaryRelations.test.mjs"],
    executionTraceSupport: "execution_trace",
    reportSupport: "monthly shutter U-value helper when supplied",
    productionEligibility: "production_ready_with_explicit_window_shutter_and_use_fraction_inputs",
    limitation:
      "Uw;sht and fsht;with remain explicit/source-backed inputs; delegated SR EN ISO 13789 and schedule derivation are not inferred."
  },
  "2.43": {
    status: "COMPLETE",
    implementationFile: "src/physics-engine/mc001Chapter2SupplementaryRelations.mjs",
    tests: ["src/physics-engine/tests/mc001Chapter2SupplementaryRelations.test.mjs"],
    executionTraceSupport: "execution_trace",
    reportSupport: "monthly movable-shading transmittance helper when supplied",
    productionEligibility: "production_ready_with_explicit_unshaded_shaded_and_use_fraction_inputs"
  },
  "2.47": {
    status: "COMPLETE",
    implementationFile: "src/physics-engine/mc001Chapter2SupplementaryRelations.mjs",
    tests: [
      "src/physics-engine/tests/mc001Chapter2SupplementaryRelations.test.mjs",
      "src/physics-engine/tests/mc001SolarShadingTables.test.mjs"
    ],
    executionTraceSupport: "execution_trace",
    reportSupport: "obstacle shading helper when supplied",
    productionEligibility: "production_ready_with_explicit_direct_shading_and_table_2_17_2_18_fsol_dir"
  },
  "2.48": {
    status: "COMPLETE",
    implementationFile: "src/physics-engine/mc001Chapter2SupplementaryRelations.mjs",
    tests: ["src/physics-engine/tests/mc001Chapter2SupplementaryRelations.test.mjs"],
    executionTraceSupport: "execution_trace",
    reportSupport: "unconditioned-zone solar reduction helper when supplied",
    productionEligibility: "production_ready_with_explicit_unconditioned_zone_glazing_and_frame_fraction"
  },
  "2.49": {
    status: "COMPLETE",
    implementationFile: "src/physics-engine/mc001Chapter2SupplementaryRelations.mjs",
    tests: ["src/physics-engine/tests/mc001Chapter2SupplementaryRelations.test.mjs"],
    executionTraceSupport: "execution_trace",
    reportSupport: "unconditioned-zone solar gains helper when supplied",
    productionEligibility: "production_ready_with_explicit_reduction_shading_absorptance_area_and_Hsol"
  },
  "2.50": {
    implementationFile: "src/physics-engine/mc001SolarGainsCalculation.mjs",
    tests: ["src/physics-engine/tests/mc001SolarGainsCalculation.test.mjs"],
    executionTraceSupport: "formula_result_metadata",
    reportSupport: "opaque solar notebook when eligible",
    productionEligibility: "source_backed_A9_6_vertical_horizontal_Hsol_available_Qsky_and_element_inputs_required",
    limitation: "Hsol from A.9.6 is production-integrated for vertical/horizontal tabulated planes; Qsky and complete opaque-element inputs remain required before automatic Qsol can be claimed."
  },
  "2.51": {
    status: "COMPLETE",
    implementationFile: "src/physics-engine/mc001MonthlyHeatGainsCalculation.mjs",
    tests: [
      "src/physics-engine/tests/mc001MonthlyHeatGainsCalculation.test.mjs",
      "src/physics-engine/tests/mc001Chapter2UsefulDemandCalculation.test.mjs"
    ],
    executionTraceSupport: "execution_trace",
    reportSupport: "adjacent-zone gain trace",
    productionEligibility: "production_ready_with_explicit_single_adjacent_zone_inputs",
    limitation: "No hidden adjacent-zone coefficients are inferred; required inputs must be explicit or source-backed."
  },
  "2.52": {
    status: "COMPLETE",
    implementationFile: "src/physics-engine/mc001MonthlyHeatGainsCalculation.mjs",
    tests: [
      "src/physics-engine/tests/mc001MonthlyHeatGainsCalculation.test.mjs",
      "src/physics-engine/tests/mc001Chapter2UsefulDemandCalculation.test.mjs"
    ],
    executionTraceSupport: "execution_trace",
    reportSupport: "adjacent-zone gain trace",
    productionEligibility: "production_ready_with_explicit_multiple_adjacent_zone_inputs",
    limitation: "No hidden adjacent-zone coefficients are inferred; required inputs must be explicit or source-backed."
  },
  "2.53": {
    status: "COMPLETE",
    implementationFile: "src/physics-engine/mc001MonthlyHeatGainsCalculation.mjs",
    tests: [
      "src/physics-engine/tests/mc001MonthlyHeatGainsCalculation.test.mjs",
      "src/physics-engine/tests/mc001Chapter2UsefulDemandCalculation.test.mjs"
    ],
    executionTraceSupport: "execution_trace",
    reportSupport: "adjacent-zone internal gain trace",
    productionEligibility: "production_ready_with_explicit_internal_unconditioned_zone_inputs",
    limitation: "The insignificant-gain branch must be explicitly confirmed; hidden adjacent-zone defaults remain prohibited."
  },
  "2.54": {
    implementationFile: "src/physics-engine/mc001SolarGainsCalculation.mjs",
    tests: ["src/physics-engine/tests/mc001SolarGainsCalculation.test.mjs"],
    executionTraceSupport: "formula_result_metadata",
    reportSupport: "sky-radiation trace when eligible",
    productionEligibility: "explicit_input_boundary",
    limitation: "Qsky may be supplied explicitly; automatic source-backed sky-radiation preprocessing remains a bounded dependency."
  },
  "2.55": {
    implementationFile: "src/physics-engine/mc001HeatingGainUtilizationFactorCalculation.mjs",
    tests: ["src/physics-engine/tests/mc001HeatingGainUtilizationFactorCalculation.test.mjs"],
    executionTraceSupport: "execution_trace",
    reportSupport: "heating utilization notebook",
    productionEligibility: "production_ready"
  },
  "2.56": {
    implementationFile: "src/physics-engine/mc001CoolingHeatTransferUtilizationFactorCalculation.mjs",
    tests: ["src/physics-engine/tests/mc001CoolingHeatTransferUtilizationFactorCalculation.test.mjs"],
    executionTraceSupport: "execution_trace",
    reportSupport: "cooling utilization notebook",
    productionEligibility: "production_ready"
  },
  "2.57": {
    implementationFile: "src/physics-engine/mc001HeatingGainUtilizationFactorCalculation.mjs",
    tests: ["src/physics-engine/tests/mc001HeatingGainUtilizationFactorCalculation.test.mjs"],
    executionTraceSupport: "execution_trace",
    reportSupport: "heating time-constant notebook",
    productionEligibility: "production_ready"
  },
  "2.58": {
    implementationFile: "src/physics-engine/mc001CoolingHeatTransferUtilizationFactorCalculation.mjs",
    tests: ["src/physics-engine/tests/mc001CoolingHeatTransferUtilizationFactorCalculation.test.mjs"],
    executionTraceSupport: "execution_trace",
    reportSupport: "cooling time-constant notebook",
    productionEligibility: "production_ready"
  },
  "2.59-2.73": {
    implementationFile: "src/physics-engine/mc001HeatingIntermittencyCalculation.mjs",
    tests: ["src/physics-engine/tests/mc001HeatingIntermittencyCalculation.test.mjs"],
    executionTraceSupport: "execution_trace",
    reportSupport: "restricted heating branch notebook",
    productionEligibility: "production_ready_for_restricted_intermitency_inputs"
  },
  "2.74-2.75": {
    implementationFile: "src/physics-engine/mc001CoolingIntermittencyCalculation.mjs",
    tests: ["src/physics-engine/tests/mc001CoolingIntermittencyCalculation.test.mjs"],
    executionTraceSupport: "execution_trace",
    reportSupport: "restricted cooling branch notebook",
    productionEligibility: "production_ready_for_restricted_intermitency_inputs"
  },
  "2.76": {
    implementationFile: "src/physics-engine/mc001RestrictedHeatingQhndCalculation.mjs",
    tests: ["src/physics-engine/tests/mc001RestrictedHeatingQhndCalculation.test.mjs"],
    executionTraceSupport: "execution_trace",
    reportSupport: "heating long-unoccupied branch notebook",
    productionEligibility: "production_ready"
  },
  "2.77": {
    implementationFile: "src/physics-engine/mc001CoolingUsefulDemandCalculation.mjs",
    tests: ["src/physics-engine/tests/mc001CoolingUsefulDemandCalculation.test.mjs"],
    executionTraceSupport: "execution_trace",
    reportSupport: "cooling long-unoccupied branch notebook",
    productionEligibility: "production_ready"
  },
  "2.78": {
    status: "COMPLETE",
    implementationFile: "src/physics-engine/mc001Chapter2SupplementaryRelations.mjs",
    tests: ["src/physics-engine/tests/mc001Chapter2SupplementaryRelations.test.mjs"],
    executionTraceSupport: "execution_trace",
    reportSupport: "cooling operative-temperature metadata helper when supplied",
    productionEligibility: "production_ready_after_QCnd_with_explicit_month_duration_and_HCht"
  },
  "2.79": {
    status: "COMPLETE",
    implementationFile: "src/physics-engine/mc001Chapter2SupplementaryRelations.mjs",
    tests: ["src/physics-engine/tests/mc001Chapter2SupplementaryRelations.test.mjs"],
    executionTraceSupport: "execution_trace",
    reportSupport: "cooling heat-transfer coefficient metadata helper when supplied",
    productionEligibility: "production_ready_from_QCht_setpoint_exterior_temperature_and_month_duration"
  },
  "2.80": {
    status: "COMPLETE",
    implementationFile: "src/physics-engine/mc001Chapter2SupplementaryRelations.mjs",
    tests: ["src/physics-engine/tests/mc001Chapter2SupplementaryRelations.test.mjs"],
    executionTraceSupport: "execution_trace",
    reportSupport: "annual overheating indicator helper when OH monthly values are supplied",
    productionEligibility: "production_ready_with_explicit_monthly_overheating_indicators"
  },
  "2.81": {
    status: "COMPLETE",
    implementationFile: "src/physics-engine/mc001Chapter2SupplementaryRelations.mjs",
    tests: ["src/physics-engine/tests/mc001Chapter2SupplementaryRelations.test.mjs"],
    executionTraceSupport: "execution_trace",
    reportSupport: "monthly overheating indicator helper when OH inputs are supplied",
    productionEligibility: "production_ready_with_explicit_overheating_gains_transfer_and_coefficients"
  },
  "2.82": {
    implementationFile: "src/physics-engine/mc001LatentDemandCalculation.mjs",
    tests: ["src/physics-engine/tests/mc001LatentDemandCalculation.test.mjs"],
    executionTraceSupport: "formula_result_metadata",
    reportSupport: "latent humidification notebook/report",
    productionEligibility: "production_ready_with_explicit_humidity_inputs"
  },
  "2.83": {
    implementationFile: "src/physics-engine/mc001LatentDemandCalculation.mjs",
    tests: ["src/physics-engine/tests/mc001LatentDemandCalculation.test.mjs"],
    executionTraceSupport: "formula_result_metadata",
    reportSupport: "latent dehumidification notebook/report",
    productionEligibility: "production_ready_with_explicit_humidity_inputs"
  },
  "2.87": {
    status: "PARTIAL",
    implementationFile: "src/physics-engine/mc001Chapter2SupplementaryRelations.mjs",
    tests: ["src/physics-engine/tests/mc001Chapter2SupplementaryRelations.test.mjs"],
    executionTraceSupport: "execution_trace",
    reportSupport: "season-boundary threshold helper when supplied",
    productionEligibility: "explicit_threshold_equation_ready_graphic_period_intersection_bounded",
    limitation:
      "P7D implements the explicit theta_emz threshold equation; the full graphic annual heating/cooling period intersection remains a procedural bounded gap."
  },
  "2.84": {
    implementationFile: "src/physics-engine/mc001Chapter2UsefulDemandCalculation.mjs",
    tests: ["src/physics-engine/tests/mc001Chapter2UsefulDemandCalculation.test.mjs"],
    executionTraceSupport: "formula_result_metadata",
    reportSupport: "annual heating notebook/report",
    productionEligibility: "production_ready_when_12_months_are_complete"
  },
  "2.85": {
    implementationFile: "src/physics-engine/mc001Chapter2UsefulDemandCalculation.mjs",
    tests: ["src/physics-engine/tests/mc001Chapter2UsefulDemandCalculation.test.mjs"],
    executionTraceSupport: "formula_result_metadata",
    reportSupport: "annual cooling notebook/report",
    productionEligibility: "production_ready_when_12_months_are_complete"
  },
  "2.86": {
    implementationFile: "src/physics-engine/mc001LatentDemandCalculation.mjs",
    tests: ["src/physics-engine/tests/mc001LatentDemandCalculation.test.mjs"],
    executionTraceSupport: "formula_result_metadata",
    reportSupport: "annual latent notebook/report",
    productionEligibility: "production_ready_when_12_months_are_complete"
  }
});

const TABLE_OVERRIDES = Object.freeze({
  "2.1": {
    status: "BOUNDED",
    classification: "input_definition_table",
    implementationFile: "src/building-platform/buildingChapter2Adapter.mjs",
    tests: ["src/building-platform/tests/buildingInputPropagationAudit.test.mjs"],
    reportSupport: "geometry report section",
    productionEligibility: "represented_as_explicit_project_geometry"
  },
  "2.2": {
    status: "COMPLETE",
    classification: "normative_lookup_table",
    implementationFile: "src/physics-engine/datasets/mc001Table2_2MaterialCorrectionCoefficients.mjs",
    tests: ["src/physics-engine/tests/mc001Table2_2MaterialCorrectionCoefficients.test.mjs"],
    reportSupport: "materials/layers notebook",
    productionEligibility: "production_ready"
  },
  "2.3": {
    status: "BOUNDED",
    classification: "external_example_or_appendix_table",
    implementationFile: null,
    tests: ["src/physics-engine/tests/validation/fixture002EnvelopeBridges.validation.test.mjs"],
    reportSupport: "explicit bridge provenance only",
    productionEligibility: "explicit_input_boundary",
    limitation: "Table 2.3 bridge values are source-inspected but missing numeric L2D context; runtime uses explicit/source-backed bridge inputs."
  },
  "2.4": {
    status: "BOUNDED",
    classification: "external_example_or_appendix_table",
    implementationFile: null,
    tests: ["src/physics-engine/tests/validation/fixture001Envelope.validation.test.mjs"],
    reportSupport: "explicit envelope provenance only",
    productionEligibility: "explicit_input_boundary"
  },
  "2.5": {
    status: "COMPLETE",
    classification: "climate_zone_lookup_table",
    implementationFile: "src/climate-platform/romanianClimateZones.mjs",
    tests: ["src/climate-platform/tests/romanianClimateProfiles.test.mjs"],
    reportSupport: "climate requirements appendix",
    productionEligibility: "production_ready_with_climate_zone"
  },
  "2.6": {
    status: "BOUNDED",
    classification: "requirement_or_context_table",
    implementationFile: null,
    tests: [],
    reportSupport: "not a current calculator output",
    productionEligibility: "classified_not_current_runtime_dependency"
  },
  "2.7": {
    status: "BOUNDED",
    classification: "requirement_or_context_table",
    implementationFile: null,
    tests: [],
    reportSupport: "not a current calculator output",
    productionEligibility: "classified_not_current_runtime_dependency"
  },
  "2.8": {
    status: "COMPLETE",
    classification: "climate_zone_lookup_table",
    implementationFile: "src/climate-platform/romanianClimateZones.mjs",
    tests: ["src/climate-platform/tests/romanianClimateProfiles.test.mjs"],
    reportSupport: "climate requirements appendix",
    productionEligibility: "production_ready_with_climate_zone"
  },
  "2.9": {
    status: "BOUNDED",
    classification: "requirement_or_context_table",
    implementationFile: null,
    tests: [],
    reportSupport: "not a current calculator output",
    productionEligibility: "classified_not_current_runtime_dependency"
  },
  "2.10": {
    status: "PARTIAL",
    classification: "climate_zone_threshold_table",
    implementationFile: "src/climate-platform/romanianClimateZones.mjs",
    tests: ["src/climate-platform/tests/romanianClimateProfiles.test.mjs"],
    reportSupport: "climate requirements appendix",
    productionEligibility:
      "lookup_ready; primary_energy_CO2_certificate_outputs_are_outside_current_chapter_2_runtime"
  }
});

const FIGURE_OVERRIDES = Object.freeze({
  "2.1": {
    status: "PARTIAL",
    classification: "climate_zone_map",
    implementationFile: "src/climate-platform/romanianClimateZones.mjs",
    tests: ["src/climate-platform/tests/romanianClimateProfiles.test.mjs"],
    reportSupport: "climate section",
    productionEligibility:
      "zone identifiers and design-temperature legend implemented; automatic locality-zone map remains external"
  },
  "2.8": {
    status: "COMPLETE",
    classification: "adjacent_zone_distribution_logic",
    implementationFile: "src/physics-engine/mc001MonthlyHeatGainsCalculation.mjs",
    tests: ["src/physics-engine/tests/mc001MonthlyHeatGainsCalculation.test.mjs"],
    reportSupport: "adjacent-zone gain trace",
    productionEligibility: "explicit_input_boundary"
  },
  "2.10": {
    status: "COMPLETE",
    classification: "monthly_total_heat_transfer",
    implementationFile: "src/physics-engine/mc001Chapter2UsefulDemandCalculation.mjs",
    tests: ["src/physics-engine/tests/mc001Chapter2UsefulDemandCalculation.test.mjs"],
    reportSupport: "monthly heat transfer notebook",
    productionEligibility: "production_ready"
  },
  "2.11": {
    status: "COMPLETE",
    classification: "monthly_transmission_transfer",
    implementationFile: "src/physics-engine/monthlyTransmissionTransfer.mjs",
    tests: ["src/physics-engine/tests/monthlyTransmissionTransfer.test.mjs"],
    reportSupport: "monthly transmission notebook",
    productionEligibility: "production_ready"
  },
  "2.12": {
    status: "COMPLETE",
    classification: "element_transmission_components",
    implementationFile: "src/physics-engine/mc001HuComponentTermCalculation.mjs",
    tests: ["src/physics-engine/tests/mc001HuComponentTermCalculation.test.mjs"],
    reportSupport: "envelope component notebook",
    productionEligibility: "production_ready_with_explicit_boundary_inputs"
  },
  "2.13": {
    status: "COMPLETE",
    classification: "monthly_total_gains",
    implementationFile: "src/physics-engine/mc001MonthlyHeatGainsCalculation.mjs",
    tests: ["src/physics-engine/tests/mc001MonthlyHeatGainsCalculation.test.mjs"],
    reportSupport: "monthly gains notebook",
    productionEligibility: "production_ready_when_internal_and_solar_gains_available"
  },
  "2.14": {
    status: "COMPLETE",
    classification: "heating_gain_utilization_branch",
    implementationFile: "src/physics-engine/mc001HeatingGainUtilizationFactorCalculation.mjs",
    tests: ["src/physics-engine/tests/mc001HeatingGainUtilizationFactorCalculation.test.mjs"],
    reportSupport: "executed branch trace",
    productionEligibility: "production_ready"
  },
  "2.15": {
    status: "COMPLETE",
    classification: "cooling_heat_transfer_utilization_branch",
    implementationFile: "src/physics-engine/mc001CoolingHeatTransferUtilizationFactorCalculation.mjs",
    tests: ["src/physics-engine/tests/mc001CoolingHeatTransferUtilizationFactorCalculation.test.mjs"],
    reportSupport: "executed branch trace",
    productionEligibility: "production_ready"
  },
  "2.18": {
    status: "COMPLETE",
    classification: "monthly_heating_useful_demand_branch",
    implementationFile: "src/physics-engine/mc001RestrictedHeatingQhndCalculation.mjs",
    tests: ["src/physics-engine/tests/mc001RestrictedHeatingQhndCalculation.test.mjs"],
    reportSupport: "executed branch trace",
    productionEligibility: "production_ready"
  },
  "2.19": {
    status: "COMPLETE",
    classification: "monthly_cooling_useful_demand_branch",
    implementationFile: "src/physics-engine/mc001CoolingUsefulDemandCalculation.mjs",
    tests: ["src/physics-engine/tests/mc001CoolingUsefulDemandCalculation.test.mjs"],
    reportSupport: "executed branch trace",
    productionEligibility: "production_ready"
  }
});

const FORMULA_TITLES = Object.freeze({
  "2.1": "Envelope area and heated/useful volume definitions",
  "2.4": "Surface temperature factor fRsi",
  "2.3": "Corrected design thermal conductivity",
  "2.6": "Total thermal resistance",
  "2.7": "Thermal transmittance from total resistance",
  "2.11": "Direct transmission including bridge terms",
  "2.12": "Direct transmission with corrected U values",
  "2.13": "Linear thermal bridge coefficient",
  "2.14": "Transmission heat flow",
  "2.15": "Total transmission coefficient Htr",
  "2.16": "Average corrected thermal resistance/transmittance of one envelope element",
  "2.17": "Average corrected thermal resistance/transmittance of the building envelope",
  "2.18": "Thermal coupling coefficient",
  "2.19": "Heat flow from thermal coupling and temperature difference",
  "2.20": "Weighted ventilation/infiltration lookup aggregation",
  "2.21": "Monthly unconditioned-zone temperature",
  "2.22": "Unconditioned-zone correction factor",
  "2.23": "Unconditioned-zone total heat transfer",
  "2.24": "Unconditioned-zone exterior heat transfer",
  "2.27": "Global transmission excluding ground",
  "2.28": "Thermal bridge global coefficient",
  "2.29": "Monthly ventilation transfer",
  "2.30": "Ventilation heat-transfer coefficient",
  "2.31": "Ventilation temperature correction factor",
  "2.32": "Unconditioned-zone ventilation correction factor",
  "2.33": "Total monthly internal plus solar gains",
  "2.34": "Adjacent unconditioned-zone internal gains",
  "2.35": "Direct internal gains from source components",
  "2.36": "Single-zone monthly solar gains",
  "2.37": "Adjacent unconditioned-zone solar gains",
  "2.38": "Direct solar gains from transparent and opaque components",
  "2.39": "Transparent-element solar gains",
  "2.40": "Effective glazing solar transmittance",
  "2.41": "Diffuse glazing solar transmittance correction",
  "2.42": "Monthly effective window U-value with shutter",
  "2.43": "Monthly effective solar transmittance with movable shading",
  "2.44": "Dynamic transparent-element monthly U weighted average",
  "2.45": "Dynamic transparent-element monthly g weighted average",
  "2.46": "Dynamic transparent-element monthly tau_sol weighted average",
  "2.47": "External obstacle shading factor",
  "2.48": "Unconditioned-zone exterior enclosure solar reduction factor",
  "2.49": "Unconditioned-zone internal solar gains from opaque surfaces",
  "2.50": "Opaque-element solar gains",
  "2.51": "Single adjacent-zone gain reduction",
  "2.52": "Multiple adjacent-zone gain reduction",
  "2.53": "Unconditioned-zone internal gain reduction",
  "2.54": "Sky radiation correction",
  "2.55": "Heating utilization exponent aH",
  "2.56": "Cooling utilization exponent aC",
  "2.57": "Heating time constant tauH",
  "2.58": "Cooling time constant tauC",
  "2.76": "Long-unoccupied heating interpolation",
  "2.77": "Long-unoccupied cooling interpolation",
  "2.78": "Cooling operative temperature output",
  "2.79": "Cooling heat-transfer coefficient from monthly cooling transfer",
  "2.80": "Annual overheating indicator",
  "2.81": "Monthly overheating indicator",
  "2.82": "Monthly humidification latent demand",
  "2.83": "Monthly dehumidification latent demand",
  "2.84": "Annual heating useful-demand sum",
  "2.85": "Annual cooling useful-demand sum",
  "2.86": "Annual latent demand sum",
  "2.87": "Season-boundary exterior temperature threshold"
});

const GENERIC_NOT_IMPLEMENTED_REASON = Object.freeze({
  "2.44": "Dynamic transparent-element monthly U weighted average is delegated by MC001 to the SR EN ISO 52016-1 Annex G special procedure; P7E does not invent the state/hourly preprocessing.",
  "2.45": "Dynamic transparent-element monthly g weighted average is delegated by MC001 to the SR EN ISO 52016-1 Annex G special procedure; P7E does not invent the state/hourly preprocessing.",
  "2.46": "Dynamic transparent-element monthly tau_sol weighted average is delegated by MC001 to the SR EN ISO 52016-1 Annex G special procedure; P7E does not invent the state/hourly preprocessing.",
  "2.87": "P7D implements the explicit theta_emz threshold equation; graphic annual heating/cooling period intersection remains bounded."
});

const RECOMMENDED_MILESTONES = Object.freeze([
  {
    milestone: "P7F",
    title: "Complete automatic Chapter 2 Qsol/Qsky production path",
    scope: [
      "source-backed Qsky inputs or calculation path",
      "complete transparent/opaque solar element input contracts",
      "provider-backed Qsol into relations 2.36-2.39 and 2.50-2.54 after P7B Hsol availability"
    ],
    priority: "highest"
  },
  {
    milestone: "P7G",
    title: "Dynamic transparent elements and seasonal-period procedure",
    scope: [
      "relations 2.44-2.46 after SR EN ISO 52016-1 Annex G source is available",
      "complete graphic annual heating/cooling period intersection procedure downstream of relation 2.87"
    ],
    priority: "high"
  },
  {
    milestone: "P7H",
    title: "Expand optional building-use schedules and expert source contracts",
    scope: [
      "project-specific occupant/equipment/lighting/appliance schedules beyond Table 2.15 where owned sources permit",
      "production UI refinements for expert source-backed adjacent-zone inputs",
      "generic building-category workflows beyond the current Table 2.15 supported categories"
    ],
    priority: "medium"
  }
]);

function gapCategoryForFormula(entry) {
  if (entry.id.match(/2_(44|45|46)$/)) {
    return "External standard dependency";
  }
  if (entry.id.match(/2_87$/)) {
    return "Intentional future milestone";
  }
  if (entry.status === "NOT_IMPLEMENTED") {
    return entry.id.match(/2_(4|78|79|80|81|87)$/)
      ? "Intentional future milestone"
      : "Implementation work";
  }
  if (entry.id.match(/2_(25|26|54)$/)) {
    return "External standard dependency";
  }
  return "Implementation work";
}

function relationNumberFromIdentifier(identifier) {
  return identifier.replace("MC001_RELATION_", "").replace("_", ".");
}

function itemNumberFromIdentifier(identifier) {
  return identifier.replace(/^MC001_(TABLE|FIGURE)_/, "").replace("_", ".");
}

function qualifyDatasetModule(moduleName) {
  if (!moduleName || moduleName.includes("/")) return moduleName;
  return `src/physics-engine/datasets/${moduleName}`;
}

function qualifyPhysicsTest(testFile) {
  if (!testFile || testFile.includes("/")) return testFile;
  return `src/physics-engine/tests/${testFile}`;
}

function relationGroupEvidence(number) {
  if (RELATION_EVIDENCE[number]) return RELATION_EVIDENCE[number];
  const numeric = Number(number.slice(2));
  if (numeric >= 59 && numeric <= 73) return RELATION_EVIDENCE["2.59-2.73"];
  if (numeric >= 74 && numeric <= 75) return RELATION_EVIDENCE["2.74-2.75"];
  return null;
}

function relationStatus(number, r20Status) {
  if (NUMBERING_GAPS.has(number)) return "BOUNDED";
  const evidenceStatus = RELATION_EVIDENCE[number]?.status;
  if (STATUS.includes(evidenceStatus)) return evidenceStatus;
  if (NOT_IMPLEMENTED_RELATIONS.has(number)) return "NOT_IMPLEMENTED";
  if (PARTIAL_RELATIONS.has(number)) return "PARTIAL";
  if (r20Status === "golden_covered" || r20Status === "runtime_implemented") return "COMPLETE";
  return "BOUNDED";
}

function relationClassification(number, status) {
  if (NUMBERING_GAPS.has(number)) return "numbering_gap_not_a_formula";
  if (RELATION_EVIDENCE[number]?.classification) return RELATION_EVIDENCE[number].classification;
  if (status === "NOT_IMPLEMENTED") return "owned_formula_or_procedure_not_integrated";
  if (status === "PARTIAL") return "implemented_with_explicit_input_or_limited_production_contract";
  return "normative_calculation";
}

function coveragePercent(complete, total) {
  return Number(((complete / total) * 100).toFixed(1));
}

function makeFormulaEntry(relation) {
  const number = relationNumberFromIdentifier(relation.identifier);
  const status = relationStatus(number, relation.implementationStatus);
  const evidence = relationGroupEvidence(number);
  const title = FORMULA_TITLES[number] ?? relation.title;
  const isNormativeFormula = !NUMBERING_GAPS.has(number);
  return {
    id: relation.identifier,
    formulaIdentifier: number,
    chapter: "2",
    section: relation.section,
    title,
    source: {
      authority: "MC001-2022 official local PDF",
      sourcePack: relation.sourcePack,
      page: relation.page,
      sourceStatus: isNormativeFormula ? "classified_from_owned_source" : "numbering_gap_absent_from_owned_source"
    },
    classification: relationClassification(number, status),
    status,
    implementationFile: evidence?.implementationFile ?? relation.runtimeModule,
    tests: evidence?.tests ?? (relation.testFile ? [relation.testFile] : []),
    executionTraceSupport: evidence?.executionTraceSupport ?? "none",
    reportSupport: evidence?.reportSupport ?? "none",
    productionEligibility: evidence?.productionEligibility ?? (status === "NOT_IMPLEMENTED" ? "not_available" : "classified_only"),
    limitation:
      evidence?.limitation ??
      GENERIC_NOT_IMPLEMENTED_REASON[number] ??
      relation.remainingBlocker ??
      null
  };
}

function makeTableEntry(table) {
  const number = itemNumberFromIdentifier(table.identifier);
  const override = TABLE_OVERRIDES[number];
  const status = override?.status ?? (table.implementationStatus === "table_machine_encoded" ? "COMPLETE" : "BOUNDED");
  return {
    id: table.identifier,
    tableIdentifier: number,
    chapter: "2",
    section: table.section,
    title: table.title,
    source: {
      authority: "MC001-2022 official local PDF",
      sourcePack: table.sourcePack,
      page: table.page
    },
    classification: override?.classification ?? "normative_lookup_table",
    status,
    implementationFile: override?.implementationFile ?? qualifyDatasetModule(table.runtimeModule),
    tests: override?.tests ?? (table.testFile ? [qualifyPhysicsTest(table.testFile)] : []),
    reportSupport: override?.reportSupport ?? "lookup provenance where consumed",
    productionEligibility: override?.productionEligibility ?? "production_ready_when_consumed",
    limitation: override?.limitation ?? table.remainingBlocker ?? null
  };
}

function makeFigureEntry(figure) {
  const number = itemNumberFromIdentifier(figure.identifier);
  const override = FIGURE_OVERRIDES[number];
  const status = override?.status ?? "BOUNDED";
  return {
    id: figure.identifier,
    figureIdentifier: number,
    chapter: "2",
    section: figure.section,
    title: figure.title,
    source: {
      authority: "MC001-2022 official local PDF",
      sourcePack: figure.sourcePack,
      page: figure.page
    },
    classification: override?.classification ?? "explanatory_or_context_figure",
    status,
    implementationFile: override?.implementationFile ?? figure.runtimeModule,
    tests: override?.tests ?? (figure.testFile ? [figure.testFile] : []),
    reportSupport: override?.reportSupport ?? "not directly reportable",
    productionEligibility: override?.productionEligibility ?? "context_only",
    limitation: override?.limitation ?? figure.remainingBlocker ?? null
  };
}

function postP7BClimateFieldMapping(fields) {
  const mapped = fields.map((field) => {
    if (field.field !== "solarGains") return field;
    return {
      ...field,
      uiSource: "explicit monthly Qsol profile, or future source-backed Hsol plus Qsky and complete solar element inputs",
      providerPath:
        "climateProvider.datasets.monthlySolarIrradiation and climateProvider.datasets.monthlyHsolVerticalHorizontal",
      runtimeInputPath:
        "chapter2Input.monthlyCases[*].heatGains.solarGains only when explicit/preprocessed Qsol is present; Hsol remains climate-provider input until Qsol can be completed",
      reportPath: "monthly[*].solarGainsKwh plus climate appendix Hsol rows",
      status: "hsol_connected_qsol_qsky_bounded",
      diagnostic: "SOLAR_GAIN_QSKY_AND_ELEMENT_INPUTS_REQUIRED",
      availableInputs: ["Hsol_vertical_horizontal_A9_6"],
      missingInputs: ["Qsky", "Qsol", "solarElementInputs"]
    };
  });
  if (!mapped.some((field) => field.field === "monthlyHsolVerticalHorizontal")) {
    mapped.push({
      field: "monthlyHsolVerticalHorizontal",
      uiSource: "resolved by selected locality/station from Mc001/1-2-3/2006 Annex A.9.6",
      buildingDnaPath: "climateProvider.datasets.monthlyHsolVerticalHorizontal.monthlyRecords",
      providerPath: "climateProvider.datasets.monthlyHsolVerticalHorizontal.monthlyRecords",
      runtimeInputPath:
        "available to solar-gain preprocessing for A.9.6 tabulated vertical/horizontal planes; not a direct Qsol substitute",
      reportPath: "climate appendix and engineering notebook Hsol A.9.6 rows",
      status: "connected",
      diagnostic: null
    });
  }
  return mapped;
}

function countByStatus(items) {
  return STATUS.reduce((acc, status) => {
    acc[status] = items.filter((item) => item.status === status).length;
    return acc;
  }, {});
}

function writeJson(filePath, value) {
  mkdirSync(dirname(filePath), { recursive: true });
  writeFileSync(filePath, `${JSON.stringify(value, null, 2)}\n`, "utf8");
}

function markdownTable(rows, columns) {
  const header = `| ${columns.map((c) => c.label).join(" | ")} |`;
  const separator = `| ${columns.map(() => "---").join(" | ")} |`;
  const body = rows.map((row) => `| ${columns.map((c) => String(row[c.key] ?? "").replaceAll("|", "\\|")).join(" | ")} |`);
  return [header, separator, ...body].join("\n");
}

function makeReport(matrix) {
  const formulaRows = matrix.formulas.map((entry) => ({
    id: entry.formulaIdentifier,
    title: entry.title,
    status: entry.status,
    implementation: entry.implementationFile ?? "-",
    tests: entry.tests.join(", ") || "-",
    eligibility: entry.productionEligibility
  }));
  const tableRows = matrix.tables.map((entry) => ({
    id: entry.tableIdentifier,
    status: entry.status,
    implementation: entry.implementationFile ?? "-",
    tests: entry.tests.join(", ") || "-",
    eligibility: entry.productionEligibility
  }));
  const figureRows = matrix.figures.map((entry) => ({
    id: entry.figureIdentifier,
    status: entry.status,
    classification: entry.classification,
    implementation: entry.implementationFile ?? "-",
    eligibility: entry.productionEligibility
  }));
  const gapRows = matrix.remainingGaps.map((gap) => ({
    id: gap.id,
    category: gap.category,
    class: gap.gapClass,
    status: gap.status,
    reason: gap.reason,
    milestone: gap.recommendedMilestone
  }));
  const commandRows = matrix.baselineValidation.commands.map((command) => ({
    command: command.command,
    result: command.result,
    note: command.note ?? ""
  }));

  return `# P7C Chapter 2 Coverage Audit

Generated by \`tools/generate-chapter2-coverage-matrix.mjs\`.

## Scope

- Base commit: \`${matrix.baseCommit}\`
- Source basis: MC001-2022 official local PDF inventory from \`MC001_R20_CHAPTER_2_EXHAUSTIVE_COVERAGE_MATRIX\`, P7A UI/runtime mapping, runtime modules and existing tests.
- Runtime behavior changes: P7E closes source-backed Table 2.15 internal-gain derivation and adjacent-zone gain contracts with execution traces. Validated Chapter 2 useful-demand formulas and numerical oracles are unchanged.

## Coverage Summary

| Metric | Value |
| --- | ---: |
| Official Chapter 2 relation slots tracked | ${matrix.summary.officialRelationSlots} |
| Formula-bearing relation slots | ${matrix.summary.formulaBearingRelationSlots} |
| Formula statuses COMPLETE | ${matrix.summary.formulaStatusCounts.COMPLETE} |
| Formula statuses PARTIAL | ${matrix.summary.formulaStatusCounts.PARTIAL} |
| Formula statuses BOUNDED | ${matrix.summary.formulaStatusCounts.BOUNDED} |
| Formula statuses NOT_IMPLEMENTED | ${matrix.summary.formulaStatusCounts.NOT_IMPLEMENTED} |
| Complete formula coverage | ${matrix.summary.completeFormulaCoveragePercent}% |
| Complete or partial formula coverage | ${matrix.summary.completeOrPartialFormulaCoveragePercent}% |
| Tables tracked | ${matrix.summary.tablesTracked} |
| Tables complete | ${matrix.summary.tableStatusCounts.COMPLETE} |
| Figures tracked | ${matrix.summary.figuresTracked} |
| Figures complete | ${matrix.summary.figureStatusCounts.COMPLETE} |

Coverage percentages exclude relation-number gaps \`2.2\` and \`2.5\`, which the owned-source R20 audit classifies as absent formula numbers rather than formulas.

## Baseline Validation

${markdownTable(commandRows, [
  { key: "command", label: "Command" },
  { key: "result", label: "Result" },
  { key: "note", label: "Note" }
])}

## Formula Matrix

${markdownTable(formulaRows, [
  { key: "id", label: "Formula" },
  { key: "title", label: "Subject" },
  { key: "status", label: "Status" },
  { key: "implementation", label: "Implementation" },
  { key: "tests", label: "Tests" },
  { key: "eligibility", label: "Production eligibility" }
])}

## Table Matrix

${markdownTable(tableRows, [
  { key: "id", label: "Table" },
  { key: "status", label: "Status" },
  { key: "implementation", label: "Implementation" },
  { key: "tests", label: "Tests" },
  { key: "eligibility", label: "Production eligibility" }
])}

## Figure Matrix

${markdownTable(figureRows, [
  { key: "id", label: "Figure" },
  { key: "status", label: "Status" },
  { key: "classification", label: "Classification" },
  { key: "implementation", label: "Implementation" },
  { key: "eligibility", label: "Production eligibility" }
])}

## Climate Coverage

- Production climate localities/stations exposed by the Climate Provider: ${matrix.climate.productionLocalityCount}.
- Annex A.9.6 solar-source localities available in owned source packs: ${matrix.climate.solarSourceLocalityCount}.
- Climate zones implemented: ${matrix.climate.climateZonesImplemented}/5.
- Wind zones implemented: ${matrix.climate.windZonesImplemented}/4.
- Chapter 2 monthly exterior temperatures are connected through the Climate Provider.
- P7B source-backed A.9.6 monthly \`Hsol\` is connected through the Climate Provider for tabulated vertical and horizontal planes.
- Chapter 2 solar-gain formulas accept explicit/preprocessed solar inputs; automatic source-backed \`Qsol/Qsky\` completion remains bounded by \`SOLAR_GAIN_QSKY_AND_ELEMENT_INPUTS_REQUIRED\`.

## Solar Climate Pipeline

${markdownTable(matrix.climate.solarClimatePipeline.map((entry) => ({
  id: entry.id,
  status: entry.status,
  implementation: entry.implementationFile ?? "-",
  diagnostic: entry.diagnosticCode ?? "-",
  note: entry.note
})), [
  { key: "id", label: "Pipeline item" },
  { key: "status", label: "Status" },
  { key: "implementation", label: "Implementation" },
  { key: "diagnostic", label: "Diagnostic" },
  { key: "note", label: "Note" }
])}

## Post-P7B Production-Path Diagnostic

${markdownTable(matrix.climate.postP7BProductionDiagnostics.map((entry) => ({
  locality: entry.locality,
  station: entry.stationId,
  hsolJanuarySouth: entry.hsolJanuarySouthKwhPerM2,
  hsolJulyHorizontal: entry.hsolJulyHorizontalKwhPerM2,
  diagnostics: entry.expectedDiagnostics.join(", ")
})), [
  { key: "locality", label: "Locality" },
  { key: "station", label: "Resolved station" },
  { key: "hsolJanuarySouth", label: "January south Hsol (kWh/m2)" },
  { key: "hsolJulyHorizontal", label: "July horizontal Hsol (kWh/m2)" },
  { key: "diagnostics", label: "Expected diagnostics" }
])}

## Remaining Gaps

${markdownTable(gapRows, [
  { key: "id", label: "Item" },
  { key: "category", label: "P7C category" },
  { key: "class", label: "Gap class" },
  { key: "status", label: "Status" },
  { key: "reason", label: "Reason" },
  { key: "milestone", label: "Recommended milestone" }
])}

## Recommended Milestone Order

${matrix.recommendedMilestoneOrder
  .map((item) => `1. ${item.milestone} - ${item.title}: ${item.scope.join("; ")}.`)
  .join("\n")}

## Conclusion

Chapter 2 useful-demand runtime coverage is strong for the explicit-input production path and is backed by P2V/P3V regression suites. After P7E, internal gains can be derived from MC001 Tabel 2.15 for the supported building-use categories, adjacent-zone gain relations 2.34/2.37/2.51/2.52/2.53 are traceable through the runtime, and Annex A.9.6 tabulated vertical/horizontal \`Hsol\` remains source-backed, provider-backed and report-visible. The main bounded production gap is automatic \`Qsol/Qsky\` completion for project solar elements plus the externally delegated dynamic transparent-element procedure.
`;
}

function main() {
  const registry = getMc001NormativeRegistry();
  const r20 = registry.sourcePacks.find(
    (pack) => pack.sourcePackCode === "MC001_R20_CHAPTER_2_EXHAUSTIVE_COVERAGE_MATRIX"
  );
  if (!r20?.coverageMatrix) {
    throw new Error("Missing MC001_R20_CHAPTER_2_EXHAUSTIVE_COVERAGE_MATRIX source pack.");
  }

  const p7aMapping = JSON.parse(readFileSync(P7A_MAPPING_PATH, "utf8"));
  const postP7BFieldMapping = postP7BClimateFieldMapping(p7aMapping.fields);
  const formulas = r20.coverageMatrix.relations.map(makeFormulaEntry);
  const tables = r20.coverageMatrix.tables.map(makeTableEntry);
  const figures = r20.coverageMatrix.figures.map(makeFigureEntry);
  const formulaBearingRelations = formulas.filter((entry) => entry.classification !== "numbering_gap_not_a_formula");
  const formulaStatusCounts = countByStatus(formulaBearingRelations);
  const tableStatusCounts = countByStatus(tables);
  const figureStatusCounts = countByStatus(figures);
  const remainingGaps = [
    ...formulas
      .filter((entry) => ["PARTIAL", "BOUNDED", "NOT_IMPLEMENTED"].includes(entry.status))
      .filter((entry) => entry.classification !== "numbering_gap_not_a_formula")
      .map((entry) => ({
        id: entry.id,
        category: gapCategoryForFormula(entry),
        gapClass:
          entry.status === "PARTIAL"
            ? "implementation_work_or_limited_explicit_input_contract"
            : entry.status === "NOT_IMPLEMENTED"
              ? "implementation_work"
              : "bounded_or_contextual",
        status: entry.status,
        reason: entry.limitation ?? "Classified by P7C audit as not complete end-to-end production coverage.",
        recommendedMilestone:
          entry.id.includes("2_36") ||
          entry.id.includes("2_38") ||
          entry.id.includes("2_39") ||
          entry.id.includes("2_50") ||
          entry.id.includes("2_54")
            ? "P7F"
            : entry.id.includes("2_44") ||
                entry.id.includes("2_45") ||
                entry.id.includes("2_46") ||
                entry.id.includes("2_87")
              ? "P7G"
            : "P7F/P7G"
      })),
    {
      id: "CHAPTER_2_QSOL_QSKY_COMPLETION_BOUNDED",
      category: "Implementation work",
      gapClass: "missing_Qsol_Qsky_or_solar_element_runtime_inputs",
      status: "BOUNDED",
      reason:
        "P7B transforms Annex A.9.6 source rows into production Hsol for tabulated vertical/horizontal planes. Automatic source-backed Qsol still requires Qsky-compatible inputs and complete transparent/opaque solar element inputs.",
      diagnosticCode: "SOLAR_GAIN_QSKY_AND_ELEMENT_INPUTS_REQUIRED",
      availableInputs: ["Hsol_vertical_horizontal_A9_6"],
      missingInputs: ["Qsky", "Qsol", "solarElementInputs"],
      recommendedMilestone: "P7F"
    },
    {
      id: "OFFICIAL_LOCALITY_TO_CLIMATE_ZONE_MAPPING",
      category: "Missing owned normative source",
      gapClass: "missing_owned_normative_dataset",
      status: "BOUNDED",
      reason:
        "The owned MC001 material does not include a complete official locality-to-climate-zone map; supported production localities resolve via station-backed climate profiles where available, with explicit diagnostics for unsupported locality mapping.",
      recommendedMilestone: "Romanian climate acquisition package"
    }
  ];

  const matrix = {
    schema: "p7c_chapter2_coverage_matrix_v1",
    baseCommit: BASE_COMMIT,
    generatedBy: "tools/generate-chapter2-coverage-matrix.mjs",
    sourceBasis: {
      officialPdfCoveragePack: "MC001_R20_CHAPTER_2_EXHAUSTIVE_COVERAGE_MATRIX",
      officialPdfPageRange: r20.coverageMatrix.pageRange,
      p7aMapping: "validation-reference/p7a-chapter2-ui-runtime-mapping.json",
      p7aMappingFieldCount: p7aMapping.fields.length,
      p7cPostP7BMappingFieldCount: postP7BFieldMapping.length,
      p7bSolarAudit: "validation-reference/p7b-solar-preprocessing-audit.json",
      extractionDocs: [
        "docs/mc001-extraction/01_geometry_envelope_definitions.md",
        "docs/mc001-extraction/02_materials_lambda_R_U.md",
        "docs/mc001-extraction/03_thermal_bridges.md",
        "docs/mc001-extraction/05_transmission_heat_transfer.md",
        "docs/mc001-extraction/06_ventilation_and_infiltration.md",
        "docs/mc001-extraction/07_monthly_heating_cooling_demand.md",
        "docs/mc001-extraction/08_internal_and_solar_gains.md",
        "docs/mc001-extraction/17_climate_annex.md"
      ]
    },
    summary: {
      officialRelationSlots: formulas.length,
      formulaBearingRelationSlots: formulaBearingRelations.length,
      formulaStatusCounts,
      completeFormulaCoveragePercent: coveragePercent(formulaStatusCounts.COMPLETE, formulaBearingRelations.length),
      completeOrPartialFormulaCoveragePercent: coveragePercent(
        formulaStatusCounts.COMPLETE + formulaStatusCounts.PARTIAL,
        formulaBearingRelations.length
      ),
      tablesTracked: tables.length,
      tableStatusCounts,
      figuresTracked: figures.length,
      figureStatusCounts
    },
    baselineValidation: {
      note: "Executed from the clean P7E worktree before implementation and re-run after P7E changes.",
      commands: [
        { command: "git diff --check", result: "PASS" },
        { command: "node --check on 344 JS/MJS files excluding node_modules/.git/dist", result: "PASS" },
        { command: "all src/building-platform/tests/*.mjs", result: "PASS", note: "14 files" },
        { command: "all workers/tests/*.mjs", result: "PASS", note: "3 files" },
        { command: "all src/physics-engine/tests/*.test.mjs", result: "PASS", note: "75 files" },
        { command: "npm.cmd run test:physics", result: "PASS" },
        { command: "npm.cmd run test:mc001", result: "PASS", note: "46 passed, 0 failures" },
        { command: "npm.cmd run test:p3v", result: "PASS" },
        { command: "node tests/physics-source-of-truth-parity.mjs", result: "PASS" },
        { command: "node tests/physics-reference-registries.mjs", result: "PASS" },
        { command: "node tests/smoke.mjs", result: "PASS", note: "local static server on 127.0.0.1:4173" },
        { command: "npm.cmd run build", result: "PASS" },
        { command: "npm.cmd run deploy:dev:dry-run", result: "PASS" }
      ]
    },
    formulas,
    tables,
    figures,
    climate: {
      productionLocalityCount: listRomanianProductionClimateLocalities().length,
      solarSourceLocalityCount: listRomanianNormativeSolarIrradiationLocalities().length,
      climateZonesImplemented: ROMANIAN_CLIMATE_COVERAGE.coveredClimateZones,
      windZonesImplemented: ROMANIAN_CLIMATE_COVERAGE.coveredWindZones,
      p7aFieldMapping: postP7BFieldMapping,
      requirementMatrix: ROMANIAN_CLIMATE_REQUIREMENT_MATRIX,
      solarClimatePipeline: [
        {
          id: "annex_a9_6_monthly_solar_irradiance_source_rows",
          status: "COMPLETE",
          implementationFile: "src/climate-platform/datasets/mc001_1_2006SolarIrradiationDataset.mjs",
          tests: [
            "src/climate-platform/tests/romanianNormativeClimateProvider.test.mjs",
            "tests/p7b-solar-preprocessing-audit.mjs"
          ],
          productionPath: "climateProvider.datasets.monthlySolarIrradiation.monthlyRecords",
          note: "30 A.9.6 localities expose source-backed monthly total/diffuse irradiance rows."
        },
        {
          id: "annex_a9_6_monthly_hsol_vertical_horizontal",
          status: "COMPLETE",
          implementationFile: "src/climate-platform/romanianNormativeClimateProvider.mjs",
          tests: [
            "src/climate-platform/tests/romanianNormativeClimateProvider.test.mjs",
            "src/building-platform/tests/buildingDnaResolver.test.mjs",
            "src/building-platform/tests/buildingTechnicalReport.test.mjs",
            "tests/p7b-solar-preprocessing-audit.mjs"
          ],
          productionPath: "climateProvider.datasets.monthlyHsolVerticalHorizontal.monthlyRecords",
          formulaId: "P7B_A9_6_MEAN_DAILY_IRRADIANCE_TO_MONTHLY_HSOL_UNIT_INTEGRATION",
          note:
            "P7B source-backed unit integration: Hsol_m = I_T,A9.6,m * deltaT_m / 1000 for A.9.6 tabulated vertical and horizontal planes."
        },
        {
          id: "non_tabulated_tilted_surface_hsol",
          status: "BOUNDED",
          implementationFile: null,
          tests: ["src/climate-platform/tests/romanianNormativeClimateProvider.test.mjs"],
          productionPath: null,
          missingSource: "SR EN ISO 52010-1 or another owned normative source for non-tabulated tilted-surface preprocessing",
          note: "P7B rejects unsupported tilted orientations instead of inferring them."
        },
        {
          id: "source_backed_qsol_qsky_completion",
          status: "BOUNDED",
          implementationFile: "src/physics-engine/mc001SolarGainsCalculation.mjs",
          tests: [
            "src/physics-engine/tests/mc001SolarGainsCalculation.test.mjs",
            "src/building-platform/tests/buildingDnaResolver.test.mjs",
            "src/building-platform/tests/buildingTechnicalReport.test.mjs"
          ],
          productionPath: "Chapter 2 solar gains only when explicit/preprocessed Qsol or Hsol+Qsky+complete solar element inputs exist",
          diagnosticCode: "SOLAR_GAIN_QSKY_AND_ELEMENT_INPUTS_REQUIRED",
          availableInputs: ["Hsol_vertical_horizontal_A9_6"],
          missingInputs: ["Qsky", "Qsol", "solarElementInputs"],
          note: "The remaining blocker is not Hsol. It is automatic Qsol/Qsky completion for the selected project solar elements."
        }
      ],
      postP7BProductionDiagnostics: [
        {
          locality: "Bucuresti",
          stationId: "mc001_6_2013_bucuresti",
          status: "ready_with_bounded_gaps",
          sourceBackedHsolResolved: true,
          hsolJanuarySouthKwhPerM2: 57.0648,
          hsolJulyHorizontalKwhPerM2: 149.3952,
          expectedDiagnostics: [
            "A9_6_VERTICAL_HORIZONTAL_HSOL_AVAILABLE_QSKY_REQUIRED_FOR_QSOL",
            "SOLAR_GAIN_QSKY_AND_ELEMENT_INPUTS_REQUIRED"
          ],
          note:
            "Changing the demo locality to Bucuresti resolves Bucuresti-specific A.9.6 Hsol. Any remaining Chapter 2 solar-gain blocker must name Qsol/Qsky/solarElementInputs instead of a broad preprocessing gap."
        },
        {
          locality: "Cluj-Napoca",
          stationId: "mc001_6_2013_cluj_napoca",
          status: "ready_with_bounded_gaps",
          sourceBackedHsolResolved: true,
          hsolJanuarySouthKwhPerM2: 52.9728,
          hsolJulyHorizontalKwhPerM2: 172.608,
          expectedDiagnostics: [
            "A9_6_VERTICAL_HORIZONTAL_HSOL_AVAILABLE_QSKY_REQUIRED_FOR_QSOL",
            "SOLAR_GAIN_QSKY_AND_ELEMENT_INPUTS_REQUIRED"
          ],
          note:
            "Changing the demo locality to Cluj-Napoca resolves Cluj-specific A.9.6 Hsol. Values differ from Bucuresti, proving the source-backed provider path is locality-sensitive after P7B."
        }
      ]
    },
    remainingGaps,
    recommendedMilestoneOrder: RECOMMENDED_MILESTONES
  };

  writeJson(MATRIX_PATH, matrix);
  mkdirSync(dirname(REPORT_PATH), { recursive: true });
  writeFileSync(REPORT_PATH, makeReport(matrix), "utf8");
}

main();
