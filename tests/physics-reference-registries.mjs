import assert from "node:assert/strict";
import {
  compareElementToReference,
  getCo2Factor,
  getPrimaryEnergyFactor,
  getReferenceEnvelopeValue
} from "../src/features/energy/physics/calculators/referenceValues.mjs";
import { classifyEstimatedEnergyClass } from "../src/features/energy/physics/calculators/estimatedEnergyClass.mjs";
import { referenceBuildingRules } from "../src/features/energy/physics/registries/referenceBuildingRules.registry.mjs";
import {
  getMc001NormativeSourcePackByCode,
  validateMc001NormativeRegistry,
  getMc001NormativeRegistry
} from "../src/physics-engine/mc001NormativeRegistry.mjs";

function assertReferenceMeta(item) {
  assert.equal(item.source, "MC001-2022");
  assert.equal(item.sourceStatus, "user_provided_reference_values");
  assert.equal(item.requiresOfficialVerification, true);
  assert.equal(item.implementationStatus, "ready_for_registry_but_not_official_certificate");
}

const standardWall = getReferenceEnvelopeValue("residential_standard", "external_walls");
assert.equal(standardWall.value?.uMaxWPerM2K, 0.56);
assertReferenceMeta(standardWall.value);
assert.equal(standardWall.trace.formulaId, "GET_REFERENCE_ENVELOPE_VALUE");

const standardTopFloor = getReferenceEnvelopeValue("residential_standard", "top_floor_under_roof_or_terrace");
assert.equal(standardTopFloor.value?.uMaxWPerM2K, 0.20);

const nzebWall = getReferenceEnvelopeValue("residential_nzeb", "external_walls");
assert.equal(nzebWall.value?.uMaxWPerM2K, 0.20);

const nzebRoof = getReferenceEnvelopeValue("residential_nzeb", "roof");
assert.equal(nzebRoof.value?.uMaxWPerM2K, 0.12);

const worseEnvelope = compareElementToReference(0.50, { uMaxWPerM2K: 0.25, source: "MC001-2022" });
assert.equal(worseEnvelope.isBetterOrEqual, false);
assert.equal(worseEnvelope.percentAboveReference, 100);
assert.equal(worseEnvelope.trace.formulaId, "COMPARE_ELEMENT_TO_REFERENCE_U");

const betterEnvelope = compareElementToReference(0.20, { uMaxWPerM2K: 0.25, source: "MC001-2022" });
assert.equal(betterEnvelope.isBetterOrEqual, true);
assert.equal(betterEnvelope.percentAboveReference, 0);

assert.equal(getPrimaryEnergyFactor("natural_gas").value?.total, 1.17);
assert.equal(getPrimaryEnergyFactor("grid_electricity").value?.total, 2.62);
assert.equal(getPrimaryEnergyFactor("firewood").value?.total, 1.08);
assert.equal(getPrimaryEnergyFactor("electric_heat_pump_heat").value?.total, 1.53);
assertReferenceMeta(getPrimaryEnergyFactor("natural_gas").value);

assert.equal(getCo2Factor("natural_gas").value?.kgCO2PerKwh, 0.205);
assert.equal(getCo2Factor("grid_electricity").value?.kgCO2PerKwh, 0.145);
assert.equal(getCo2Factor("firewood").value?.kgCO2PerKwh, 0.019);
assert.equal(getCo2Factor("district_heating_cogeneration").value?.kgCO2PerKwh, 0.299);
assertReferenceMeta(getCo2Factor("natural_gas").value);

assert.equal(classifyEstimatedEnergyClass(91, "residential_individual").estimatedClass, "A+");
assert.equal(classifyEstimatedEnergyClass(91.01, "residential_individual").estimatedClass, "A");
assert.equal(classifyEstimatedEnergyClass(129, "residential_individual").estimatedClass, "A");
assert.equal(classifyEstimatedEnergyClass(129.01, "residential_individual").estimatedClass, "B");
assert.equal(classifyEstimatedEnergyClass(783, "residential_individual").estimatedClass, "F");
assert.equal(classifyEstimatedEnergyClass(783.01, "residential_individual").estimatedClass, "G");
assert.equal(classifyEstimatedEnergyClass(73, "residential_collective").estimatedClass, "A+");
assert.equal(classifyEstimatedEnergyClass(73.01, "residential_collective").estimatedClass, "A");
assert.equal(classifyEstimatedEnergyClass(595, "residential_collective").estimatedClass, "F");
assert.equal(classifyEstimatedEnergyClass(595.01, "residential_collective").estimatedClass, "G");

const missingClassInput = classifyEstimatedEnergyClass(null, "residential_individual");
assert.equal(missingClassInput.status, "cannot_classify");
assert.ok(missingClassInput.warnings.includes("MISSING_PRIMARY_ENERGY_KWH_M2_YEAR"));

const missingClassType = classifyEstimatedEnergyClass(120, null);
assert.equal(missingClassType.status, "needs_building_type");
assert.ok(missingClassType.warnings.includes("NEEDS_BUILDING_ENERGY_CLASS_TYPE"));

const negativeClassInput = classifyEstimatedEnergyClass(-1, "residential_individual");
assert.equal(negativeClassInput.status, "error");
assert.ok(negativeClassInput.warnings.includes("NEGATIVE_PRIMARY_ENERGY_KWH_M2_YEAR"));

assert.equal(referenceBuildingRules.mechanicalVentilation.numericHeatRecoveryEfficiency, null);
assert.ok(referenceBuildingRules.mechanicalVentilation.missingValueNote.includes("Nu inventa"));

const registryValidation = validateMc001NormativeRegistry(getMc001NormativeRegistry());
assert.equal(registryValidation.status, "valid");

const chapter2CoverageGate = getMc001NormativeSourcePackByCode(
  "MC001_R20_CHAPTER_2_EXHAUSTIVE_COVERAGE_MATRIX"
);
assert.equal(chapter2CoverageGate.status, "found");
assert.equal(chapter2CoverageGate.sourcePack.coverageMatrix.pageInspections.length, 86);
assert.equal(chapter2CoverageGate.sourcePack.coverageMatrix.relations.length, 87);
assert.equal(chapter2CoverageGate.sourcePack.coverageMatrix.tables.length, 21);
assert.equal(chapter2CoverageGate.sourcePack.coverageMatrix.figures.length, 21);
assert.equal(
  chapter2CoverageGate.sourcePack.completenessGate.closureStatus,
  "CHAPTER_2_NOT_CLOSED"
);
assert.deepEqual(chapter2CoverageGate.sourcePack.completenessGate.unresolvedItemIds, []);
assert.ok(
  chapter2CoverageGate.sourcePack.completenessGate.justifiedNonRuntimeItemIds.includes(
    "MC001_RELATION_2_2"
  )
);

console.log("PASS physics MC001-like reference registries and utility functions");
