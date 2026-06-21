import assert from "node:assert/strict";
import {
  checkEnvelopeRequirement,
  checkRPrimeAgainstMinimum,
  checkUPrimeAgainstMaximum
} from "../envelopeRequirementChecks.mjs";

function test(name, fn) {
  try {
    fn();
    console.log(`PASS ${name}`);
  } catch (error) {
    console.error(`FAIL ${name}`);
    throw error;
  }
}

const RESIDENTIAL_EXTERIOR_WALLS = "exterior_walls_residential_nzeb";

test("R prime passes at residential exterior wall minimum", () => {
  const result = checkRPrimeAgainstMinimum({
    thresholdId: RESIDENTIAL_EXTERIOR_WALLS,
    rPrimeM2KPerW: 4.0
  });

  assert.equal(result.status, "checked");
  assert.equal(result.passes, true);
  assert.equal(result.value, 4.0);
  assert.equal(result.requiredMinimum, 4.0);
  assert.equal(result.threshold.table, "MC001-2022 Tabel 2.4");
});

test("R prime fails below residential exterior wall minimum", () => {
  const result = checkRPrimeAgainstMinimum({
    thresholdId: RESIDENTIAL_EXTERIOR_WALLS,
    rPrimeM2KPerW: 3.99
  });

  assert.equal(result.status, "checked");
  assert.equal(result.passes, false);
  assert.equal(result.requiredMinimum, 4.0);
});

test("U prime passes at residential exterior wall maximum", () => {
  const result = checkUPrimeAgainstMaximum({
    thresholdId: RESIDENTIAL_EXTERIOR_WALLS,
    uPrimeWPerM2K: 0.25
  });

  assert.equal(result.status, "checked");
  assert.equal(result.passes, true);
  assert.equal(result.value, 0.25);
  assert.equal(result.requiredMaximum, 0.25);
  assert.equal(result.threshold.table, "MC001-2022 Tabel 2.4");
});

test("U prime fails above residential exterior wall maximum", () => {
  const result = checkUPrimeAgainstMaximum({
    thresholdId: RESIDENTIAL_EXTERIOR_WALLS,
    uPrimeWPerM2K: 0.26
  });

  assert.equal(result.status, "checked");
  assert.equal(result.passes, false);
  assert.equal(result.requiredMaximum, 0.25);
});

test("combined check passes when both R prime and U prime satisfy threshold", () => {
  const result = checkEnvelopeRequirement({
    thresholdId: RESIDENTIAL_EXTERIOR_WALLS,
    rPrimeM2KPerW: 4.1,
    uPrimeWPerM2K: 0.24
  });

  assert.equal(result.status, "checked");
  assert.equal(result.passes, true);
  assert.equal(result.checks.length, 2);
  assert.deepEqual(result.warnings, []);
});

test("combined check fails when one side fails", () => {
  const result = checkEnvelopeRequirement({
    thresholdId: RESIDENTIAL_EXTERIOR_WALLS,
    rPrimeM2KPerW: 4.1,
    uPrimeWPerM2K: 0.26
  });

  assert.equal(result.status, "checked");
  assert.equal(result.passes, false);
  assert.equal(result.checks.length, 2);
  assert.equal(result.checks[0].result.passes, true);
  assert.equal(result.checks[1].result.passes, false);
});

test("missing threshold returns missing table status", () => {
  const result = checkEnvelopeRequirement({
    thresholdId: "missing_threshold",
    rPrimeM2KPerW: 4.1
  });

  assert.equal(result.status, "cannot_validate_envelope_requirement_missing_table");
  assert.equal(result.passes, null);
  assert.ok(result.warnings.includes("cannot_validate_envelope_requirement_missing_table"));
});

test("missing value returns missing value status", () => {
  const result = checkEnvelopeRequirement({
    thresholdId: RESIDENTIAL_EXTERIOR_WALLS
  });

  assert.equal(result.status, "cannot_validate_envelope_requirement_missing_value");
  assert.equal(result.passes, null);
  assert.deepEqual(result.checks, []);
});

test("plain U valueType emits low-confidence warning", () => {
  const result = checkEnvelopeRequirement({
    thresholdId: RESIDENTIAL_EXTERIOR_WALLS,
    uPrimeWPerM2K: 0.25,
    valueType: "plain_U"
  });

  assert.equal(result.status, "checked");
  assert.equal(result.passes, true);
  assert.ok(
    result.warnings.includes("plain_U_compared_to_corrected_U_requirement_low_confidence")
  );
  assert.equal(result.checks[0].checkType, "plain_U_against_uPrime_threshold");
});

test("non-residential threshold lookup and check works", () => {
  const result = checkEnvelopeRequirement({
    thresholdId: "exterior_walls_non_residential_nzeb",
    rPrimeM2KPerW: 3.0,
    uPrimeWPerM2K: 0.33
  });

  assert.equal(result.status, "checked");
  assert.equal(result.passes, true);
  assert.equal(result.checks[0].result.threshold.table, "MC001-2022 Tabel 2.7");
  assert.equal(result.checks[0].result.requiredMinimum, 3.0);
  assert.equal(result.checks[1].result.requiredMaximum, 0.33);
});
