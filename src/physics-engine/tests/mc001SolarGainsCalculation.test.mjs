import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import {
  calculateMc001MonthlySolarGainsExplicit,
  MC001_MONTHLY_SOLAR_GAINS_SCOPE
} from "../mc001SolarGainsCalculation.mjs";

function test(name, fn) {
  return Promise.resolve()
    .then(fn)
    .then(() => console.log(`PASS ${name}`))
    .catch((error) => {
      console.error(`FAIL ${name}`);
      throw error;
    });
}

function close(actual, expected, tolerance = 1e-9) {
  assert.ok(
    Math.abs(actual - expected) <= tolerance,
    `expected ${actual} to be within ${tolerance} of ${expected}`
  );
}

function source() {
  return { reference: "manual_explicit_solar_inputs" };
}

function transparentElement(overrides = {}) {
  return {
    elementId: "south-window",
    area: 10,
    frameFraction: 0.25,
    effectiveSolarTransmittance: 0.675,
    obstacleShadingFactor: 0.8,
    solarIrradiation: 100,
    qSky: 5,
    ...overrides
  };
}

function opaqueElement(overrides = {}) {
  return {
    elementId: "south-wall",
    area: 20,
    solarAbsorptance: 0.6,
    exteriorSurfaceResistance: 0.04,
    uValue: 0.3,
    obstacleShadingFactor: 0.9,
    solarIrradiation: 100,
    qSky: 1,
    ...overrides
  };
}

function sampleCase(overrides = {}) {
  return {
    caseId: "jan-solar-gains",
    month: "january",
    transparentElements: [transparentElement()],
    opaqueElements: [opaqueElement()],
    source: source(),
    ...overrides
  };
}

function input(cases = [sampleCase()], overrides = {}) {
  return {
    mode: "monthly_solar_gains_explicit_v1",
    cases,
    ...overrides
  };
}

function assertBlocked(result, code = null) {
  assert.equal(result.status, "blocked");
  assert.equal(result.diagnostics.blockers[0].severity, "blocking");
  if (code) {
    assert.equal(result.diagnostics.blockers[0].code, code);
  }
}

await test("calculates monthly solar gains from transparent and opaque explicit elements", () => {
  const result = calculateMc001MonthlySolarGainsExplicit(input());

  assert.equal(result.status, "ready");
  assert.equal(result.scope, MC001_MONTHLY_SOLAR_GAINS_SCOPE);
  const solarCase = result.caseResults[0];
  close(solarCase.transparentElementResults[0].solarGains, 400);
  close(solarCase.opaqueElementResults[0].solarGains, 11.96);
  close(solarCase.qSolDir, 411.96);
  close(solarCase.solarGains, 411.96);
  close(result.summary.annualSolarGains, 411.96);
  assert.equal(solarCase.formulaCode, "MC001_RELATION_2_36_2_38_MONTHLY_SOLAR_GAINS");
  assert.equal(
    solarCase.solarGainsOrigin,
    "calculated_from_MC001_2_36_2_38_explicit_solar_elements"
  );
});

await test("uses Table 2.13 relation 2.40 and Table 2.16 for shaded glazing", () => {
  const result = calculateMc001MonthlySolarGainsExplicit(input([
    sampleCase({
      transparentElements: [
        transparentElement({
          effectiveSolarTransmittance: undefined,
          qSky: 0,
          glazing: {
            glazingTypeId: "double_clear_glazing",
            shadingDeviceId: "white_venetian_blinds_abs_0_1_trans_0_05",
            mountingSide: "interior"
          }
        })
      ],
      opaqueElements: []
    })
  ]));

  assert.equal(result.status, "ready");
  const element = result.caseResults[0].transparentElementResults[0];
  close(element.effectiveSolarTransmittance, 0.16875);
  close(element.solarGains, 101.25);
  assert.equal(
    element.transmittanceOrigin,
    "MC001_TABLE_2_13_TABLE_2_16_AND_RELATION_2_40_EXPLICIT_LOOKUPS"
  );
  assert.equal(element.glazingTypeId, "double_clear_glazing");
  assert.equal(element.shadingDeviceId, "white_venetian_blinds_abs_0_1_trans_0_05");
});

await test("calculates qSky from explicit relation 2.54 inputs", () => {
  const result = calculateMc001MonthlySolarGainsExplicit(input([
    sampleCase({
      transparentElements: [
        transparentElement({
          qSky: undefined,
          skyRadiation: {
            skyViewFactor: 0.5,
            exteriorSurfaceResistance: 0.04,
            uValue: 1.2,
            area: 10,
            longwaveRadiationCoefficient: 5,
            skyTemperatureDifference: 11,
            durationHours: 744
          }
        })
      ],
      opaqueElements: []
    })
  ]));

  assert.equal(result.status, "ready");
  const element = result.caseResults[0].transparentElementResults[0];
  close(element.qSky, 9.8208);
  close(element.solarGains, 395.1792);
  assert.equal(element.qSkyOrigin, "calculated_from_MC001_2_54_explicit_inputs");
});

await test("aggregates multiple monthly solar cases", () => {
  const result = calculateMc001MonthlySolarGainsExplicit(input([
    sampleCase(),
    sampleCase({
      caseId: "feb-solar-gains",
      month: "february",
      transparentElements: [transparentElement({ qSky: 0 })],
      opaqueElements: []
    })
  ]));

  assert.equal(result.status, "ready");
  close(result.caseResults[0].solarGains, 411.96);
  close(result.caseResults[1].solarGains, 405);
  close(result.summary.annualSolarGains, 816.96);
  assert.equal(result.summary.caseCount, 2);
});

await test("rejects missing cases and invalid mode", () => {
  assertBlocked(
    calculateMc001MonthlySolarGainsExplicit({ mode: "monthly_solar_gains_explicit_v1" }),
    "monthly_solar_gains_missing_cases"
  );
  assertBlocked(
    calculateMc001MonthlySolarGainsExplicit(input([sampleCase()], { mode: "full_solar" })),
    "monthly_solar_gains_invalid_mode"
  );
});

await test("rejects missing solar elements and missing qSky source", () => {
  assertBlocked(
    calculateMc001MonthlySolarGainsExplicit(input([sampleCase({
      transparentElements: [],
      opaqueElements: []
    })])),
    "monthly_solar_gains_missing_solar_elements"
  );
  assertBlocked(
    calculateMc001MonthlySolarGainsExplicit(input([sampleCase({
      transparentElements: [transparentElement({ qSky: undefined })],
      opaqueElements: []
    })])),
    "monthly_solar_gains_missing_qsky_or_sky_radiation_inputs"
  );
});

await test("rejects invalid transparent and opaque element inputs", () => {
  assertBlocked(
    calculateMc001MonthlySolarGainsExplicit(input([sampleCase({
      transparentElements: [transparentElement({ frameFraction: 1 })],
      opaqueElements: []
    })])),
    "monthly_solar_gains_transparent_invalid_frame_fraction"
  );
  assertBlocked(
    calculateMc001MonthlySolarGainsExplicit(input([sampleCase({
      transparentElements: [],
      opaqueElements: [opaqueElement({ solarAbsorptance: -0.1 })]
    })])),
    "monthly_solar_gains_opaque_invalid_solar_absorptance"
  );
});

await test("rejects negative net solar gain result in restricted useful-demand path", () => {
  assertBlocked(
    calculateMc001MonthlySolarGainsExplicit(input([sampleCase({
      transparentElements: [transparentElement({ qSky: 500 })],
      opaqueElements: []
    })])),
    "monthly_solar_gains_negative_transparent_result_outside_scope"
  );
});

await test("rejects client-supplied derived solar result fields", () => {
  for (const payload of [
    input([sampleCase({ solarGains: 411.96 })]),
    input([sampleCase()], { annualSolarGains: 411.96 }),
    input([sampleCase()], { caseResults: [] }),
    input([sampleCase()], { summary: { annualSolarGains: 411.96 } })
  ]) {
    assertBlocked(
      calculateMc001MonthlySolarGainsExplicit(payload),
      "monthly_solar_gains_client_supplied_derived_result"
    );
  }
});

await test("diagnostics keep solar gains explicit and outside downstream energy scopes", () => {
  const result = calculateMc001MonthlySolarGainsExplicit(input());
  for (const limit of [
    "explicit_input_only",
    "solar_gains_only",
    "no_hidden_defaults",
    "no_default_solar_irradiation",
    "not_full_QHnd",
    "not_full_QCnd",
    "not_final_energy",
    "not_primary_energy",
    "not_CO2",
    "not_certificate"
  ]) {
    assert.equal(result.diagnostics.methodologyLimits.includes(limit), true, `missing ${limit}`);
  }
});

await test("module has no filesystem network or runtime PDF access", () => {
  const sourceText = readFileSync(
    new URL("../mc001SolarGainsCalculation.mjs", import.meta.url),
    "utf8"
  );
  for (const forbidden of [
    "node:fs",
    "readFile",
    "writeFile",
    "fetch(",
    "XMLHttpRequest",
    ".pdf",
    "PDF"
  ]) {
    assert.equal(sourceText.includes(forbidden), false, `found ${forbidden}`);
  }
});
