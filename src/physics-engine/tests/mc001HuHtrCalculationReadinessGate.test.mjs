import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import {
  buildMc001HuHtrCalculationReadinessGate,
  MC001_HU_HTR_CALCULATION_READINESS_GATE_ID,
  MC001_HU_HTR_CALCULATION_READINESS_GATE_SCHEMA_VERSION,
  MC001_HU_HTR_CALCULATION_READINESS_INPUT_SCHEMA_VERSION,
  H3_BLOCKER_CODES
} from "../mc001HuHtrCalculationReadinessGate.mjs";

function test(name, fn) {
  try {
    fn();
    console.log(`PASS ${name}`);
  } catch (error) {
    console.error(`FAIL ${name}`);
    throw error;
  }
}

function clone(value) {
  return JSON.parse(JSON.stringify(value));
}

function deepFreeze(value) {
  if (value && typeof value === "object") {
    Object.freeze(value);
    for (const child of Object.values(value)) {
      deepFreeze(child);
    }
  }
  return value;
}

function validSource(id, sourceType = "calculation_record") {
  return {
    sourceType,
    sourceRecordId: `record:${id}`
  };
}

function validComponent(index = 1, extra = {}) {
  return {
    componentId: `hu-component:wall-00${index}`,
    componentType: "opaque_envelope_component",
    ztuZoneId: "ztu:heated-zone-001",
    adjacentZoneId: "ztu:unheated-zone-001",
    area: {
      value: index === 1 ? 12.5 : 8.75,
      unit: "m2",
      source: validSource(`area-00${index}`)
    },
    thermalTransmittance: {
      value: index === 1 ? 0.31 : 0.29,
      unit: "W/(m2*K)",
      source: validSource(`u-00${index}`)
    },
    bztu: {
      value: index === 1 ? 0.76 : 0.64,
      unit: "dimensionless",
      source: validSource(`bztu-00${index}`, "methodological_direct_input")
    },
    ...extra
  };
}

function validInput(extra = {}) {
  return {
    schemaVersion: MC001_HU_HTR_CALCULATION_READINESS_INPUT_SCHEMA_VERSION,
    isMc001HuHtrCalculationReadinessInput: true,
    inventoryReadiness: {
      isHuInventoryReady: true
    },
    components: [validComponent()],
    ...extra
  };
}

function build(input) {
  return buildMc001HuHtrCalculationReadinessGate(input);
}

function blockerCodes(result) {
  return result.blockers.map((entry) => entry.code);
}

function componentBlockerCodes(result, index = 0) {
  return result.componentReadiness[index].blockers.map((entry) => entry.code);
}

function assertH3Shape(result) {
  assert.equal(result.gateId, MC001_HU_HTR_CALCULATION_READINESS_GATE_ID);
  assert.equal(result.schemaVersion, MC001_HU_HTR_CALCULATION_READINESS_GATE_SCHEMA_VERSION);
  assert.equal(result.isMc001HuHtrCalculationReadinessGate, true);
  assert.ok(["ready", "blocked"].includes(result.status));
  assert.equal(result.readiness.isHuAggregationReady, false);
  assert.equal(result.readiness.isCompleteHuReady, false);
  assert.equal(result.readiness.isCompleteHtrReady, false);
  assert.equal(result.readiness.hasHuResult, false);
  assert.equal(result.readiness.hasHtrResult, false);
  assert.equal(result.readiness.downstreamReadiness, false);
}

function assertNoHuHtrResults(value) {
  const output = JSON.stringify(value);
  for (const forbidden of ["huResult", "htrResult"]) {
    assert.equal(output.includes(forbidden), false, `${forbidden} leaked`);
  }
}

function assertNoForbiddenOutput(value) {
  const output = JSON.stringify(value);
  for (const forbidden of [
    "owner-snapshot",
    "private-note",
    "person-name",
    "record-JohnDoe",
    "record-001",
    "John Doe",
    "Strada Exemplu 12",
    "person@example.com",
    "+40722111222",
    "sourceContext",
    "sourceTrace",
    "sourceLocator",
    "sourceRefs"
  ]) {
    assert.equal(output.includes(forbidden), false, `${forbidden} leaked`);
  }
}

function assertNoDownstreamReadiness(result) {
  assert.equal(result.readiness.isHuAggregationReady, false);
  assert.equal(result.readiness.isCompleteHuReady, false);
  assert.equal(result.readiness.isCompleteHtrReady, false);
  assert.equal(result.readiness.downstreamReadiness, false);
}

function assertOnlyAllowlistedBlockers(result) {
  const allowed = new Set(H3_BLOCKER_CODES);
  const allBlockers = [
    ...result.blockers,
    ...result.componentReadiness.flatMap((entry) => entry.blockers)
  ];
  for (const blocker of allBlockers) {
    assert.ok(allowed.has(blocker.code), `${blocker.code} is not allowlisted`);
    assert.equal(blocker.severity, "blocking");
  }
}

function expectBlocked(name, mutate, expectedCode) {
  test(name, () => {
    const input = clone(validInput());
    mutate(input);
    const result = build(input);

    assertH3Shape(result);
    assert.equal(result.status, "blocked");
    assert.equal(result.readiness.isHuComponentTermCalculationReady, false);
    assert.ok(
      blockerCodes(result).includes(expectedCode) ||
        result.componentReadiness.some((entry) =>
          entry.blockers.some((blocker) => blocker.code === expectedCode)
        ),
      `Expected ${expectedCode}; got ${JSON.stringify(result.blockers)}`
    );
    assertNoHuHtrResults(result);
    assertNoDownstreamReadiness(result);
    assertOnlyAllowlistedBlockers(result);
  });
}

test("invalid input blocks safely", () => {
  for (const input of [null, undefined, "not input", [], 42]) {
    const result = build(input);

    assertH3Shape(result);
    assert.equal(result.status, "blocked");
    assert.equal(result.readiness.isHuInventoryReady, false);
    assert.equal(result.readiness.isHuComponentTermCalculationReady, false);
    assert.deepEqual(blockerCodes(result), ["blocked_invalid_h3_input"]);
    assert.equal(result.counts.components, 0);
    assertNoForbiddenOutput(result);
  }
});

test("raw saved-analysis-like input is rejected", () => {
  const result = build({
    analysis: { id: "analysis:analysis-001" },
    building: { id: "building:building-001" },
    answers: [{ value: "ordinary saved app answer" }],
    mc001Readiness: {}
  });

  assertH3Shape(result);
  assert.equal(result.status, "blocked");
  assert.deepEqual(blockerCodes(result), ["blocked_raw_saved_analysis_input"]);
  assert.equal(result.readiness.isHuComponentTermCalculationReady, false);
  assertNoForbiddenOutput(result);
});

test("inventory not ready blocks calculation readiness", () => {
  const result = build(validInput({
    inventoryReadiness: {
      isHuInventoryReady: false
    }
  }));

  assertH3Shape(result);
  assert.equal(result.status, "blocked");
  assert.equal(result.readiness.isHuInventoryReady, false);
  assert.ok(blockerCodes(result).includes("blocked_hu_inventory_not_ready"));
  assert.equal(result.readiness.isHuComponentTermCalculationReady, false);
});

test("valid single component becomes component-term calculation ready only", () => {
  const result = build(validInput());

  assertH3Shape(result);
  assert.equal(result.status, "ready");
  assert.equal(result.readiness.isHuInventoryReady, true);
  assert.equal(result.readiness.isHuComponentTermCalculationReady, true);
  assertNoDownstreamReadiness(result);
  assert.equal(result.counts.components, 1);
  assert.equal(result.counts.readyComponents, 1);
  assert.equal(result.counts.blockedComponents, 0);
  assert.equal(result.counts.blockers, 0);
  assert.equal(result.componentReadiness[0].componentId, "hu-component:wall-001");
  assert.deepEqual(result.componentReadiness[0].requiredInputs, {
    zoneIdentity: true,
    area: true,
    thermalTransmittance: true,
    bztu: true,
    sourceProvenance: true
  });
  assertNoHuHtrResults(result);
});

test("valid multiple components become component-term calculation ready only", () => {
  const result = build(validInput({
    components: [validComponent(1), validComponent(2)]
  }));

  assertH3Shape(result);
  assert.equal(result.status, "ready");
  assert.equal(result.counts.components, 2);
  assert.equal(result.counts.readyComponents, 2);
  assert.equal(result.counts.blockedComponents, 0);
  assert.equal(result.componentReadiness.every((entry) => entry.status === "ready"), true);
  assertNoDownstreamReadiness(result);
});

expectBlocked(
  "missing component identity blocks",
  (input) => {
    delete input.components[0].componentId;
  },
  "blocked_missing_component_identity"
);

expectBlocked(
  "invalid unsafe component identity blocks",
  (input) => {
    input.components[0].componentId = "person-name";
  },
  "blocked_unsafe_private_identifier"
);

expectBlocked(
  "missing zone identity blocks",
  (input) => {
    delete input.components[0].ztuZoneId;
  },
  "blocked_missing_zone_identity"
);

expectBlocked(
  "invalid zone identity blocks",
  (input) => {
    input.components[0].ztuZoneId = "john-house-zone";
  },
  "blocked_unsafe_private_identifier"
);

expectBlocked(
  "missing area blocks",
  (input) => {
    delete input.components[0].area;
  },
  "blocked_missing_component_area"
);

for (const [name, value, unit] of [
  ["zero area blocks", 0, "m2"],
  ["negative area blocks", -1, "m2"],
  ["non-finite area blocks", Number.POSITIVE_INFINITY, "m2"],
  ["wrong area unit blocks", 12.5, "ft2"]
]) {
  expectBlocked(
    name,
    (input) => {
      input.components[0].area.value = value;
      input.components[0].area.unit = unit;
    },
    "blocked_invalid_component_area"
  );
}

expectBlocked(
  "missing thermal transmittance blocks",
  (input) => {
    delete input.components[0].thermalTransmittance;
  },
  "blocked_missing_thermal_transmittance"
);

for (const [name, value, unit] of [
  ["zero thermal transmittance blocks", 0, "W/(m2*K)"],
  ["negative thermal transmittance blocks", -0.1, "W/(m2*K)"],
  ["non-finite thermal transmittance blocks", Number.NaN, "W/(m2*K)"],
  ["wrong thermal transmittance unit blocks", 0.31, "W/K"]
]) {
  expectBlocked(
    name,
    (input) => {
      input.components[0].thermalTransmittance.value = value;
      input.components[0].thermalTransmittance.unit = unit;
    },
    "blocked_invalid_thermal_transmittance"
  );
}

test("corrected thermal transmittance equivalent can satisfy U primitive", () => {
  const input = validInput();
  input.components[0].correctedThermalTransmittance =
    input.components[0].thermalTransmittance;
  delete input.components[0].thermalTransmittance;

  const result = build(input);

  assert.equal(result.status, "ready");
  assert.equal(result.componentReadiness[0].requiredInputs.thermalTransmittance, true);
});

expectBlocked(
  "missing BZTU blocks",
  (input) => {
    delete input.components[0].bztu;
  },
  "blocked_missing_bztu"
);

for (const [name, value, unit] of [
  ["negative BZTU blocks", -0.1, "dimensionless"],
  ["BZTU greater than one blocks", 1.1, "dimensionless"],
  ["non-finite BZTU blocks", Number.POSITIVE_INFINITY, "dimensionless"],
  ["wrong BZTU unit blocks", 0.76, "-"]
]) {
  expectBlocked(
    name,
    (input) => {
      input.components[0].bztu.value = value;
      input.components[0].bztu.unit = unit;
    },
    "blocked_invalid_bztu"
  );
}

expectBlocked(
  "missing source provenance blocks",
  (input) => {
    delete input.components[0].area.source;
  },
  "blocked_missing_source_provenance"
);

expectBlocked(
  "invalid source provenance blocks",
  (input) => {
    input.components[0].bztu.source.sourceType = "raw_answer";
  },
  "blocked_invalid_source_provenance"
);

test("unsafe private IDs and content are sanitized and not emitted", () => {
  const input = validInput({
    components: [
      validComponent(1, {
        componentId: "person-name",
        ztuZoneId: "ztu:heated-zone-001",
        adjacentZoneId: "ztu:unheated-zone-001",
        area: {
          value: 12.5,
          unit: "m2",
          source: {
            sourceType: "calculation_record",
            sourceRecordId: "record-JohnDoe",
            sourceLocator: {
              note: "free text note about the owner"
            }
          }
        },
        thermalTransmittance: {
          value: 0.31,
          unit: "W/(m2*K)",
          source: {
            sourceType: "calculation_record",
            sourceRecordId: "record-001",
            sourceRefs: ["John Doe"]
          }
        },
        bztu: {
          value: 0.76,
          unit: "dimensionless",
          source: {
            sourceType: "methodological_direct_input",
            sourceRecordId: "person@example.com"
          }
        }
      })
    ],
    explicitBlockers: [
      {
        code: "private-note"
      }
    ]
  });

  const result = build(input);

  assertH3Shape(result);
  assert.equal(result.status, "blocked");
  assert.equal(result.componentReadiness[0].componentId, null);
  assert.ok(blockerCodes(result).includes("blocked_unsafe_private_identifier"));
  assert.ok(blockerCodes(result).includes("blocked_unsafe_private_content"));
  assertNoForbiddenOutput(result);
  assertOnlyAllowlistedBlockers(result);
});

test("unknown arbitrary input blocker strings are not passed through", () => {
  const result = build(validInput({
    blockers: [
      {
        code: "owner-snapshot",
        diagnosticCode: "private-note",
        message: "John Doe"
      }
    ]
  }));

  assert.equal(result.status, "ready");
  assert.equal(JSON.stringify(result).includes("owner-snapshot"), false);
  assert.equal(JSON.stringify(result).includes("private-note"), false);
  assert.equal(JSON.stringify(result).includes("John Doe"), false);
});

test("no Hu/Htr result is emitted and no downstream readiness escalates", () => {
  const result = build(validInput());

  assertNoHuHtrResults(result);
  assertNoDownstreamReadiness(result);
  assert.equal(result.readiness.isHuComponentTermCalculationReady, true);
});

test("H3 gate does not mutate the input object", () => {
  const input = validInput();
  const before = clone(input);
  deepFreeze(input);

  const result = build(input);

  assert.equal(result.status, "ready");
  assert.deepEqual(input, before);
});

test("runtime import boundary has no DB/API/UI/Worker/orchestrator imports or IO", () => {
  const moduleSource = readFileSync(
    new URL("../mc001HuHtrCalculationReadinessGate.mjs", import.meta.url),
    "utf8"
  );
  const importLines = moduleSource
    .split(/\r?\n/)
    .filter((line) => line.trim().startsWith("import "));

  assert.deepEqual(importLines, []);
  for (const forbidden of [
    "mc001ReadOnly",
    "mc001AuditorCoreReadinessOrchestrator",
    "DB",
    "fetch(",
    "readFile",
    "writeFile",
    "schema.sql",
    "workers/",
    "api/",
    "product",
    "report",
    "CPE"
  ]) {
    assert.equal(moduleSource.includes(forbidden), false, `${forbidden} leaked`);
  }
});

test("privacy adversarial output omits all forbidden sentinel values", () => {
  const input = validInput({
    components: [
      validComponent(1, {
        componentId: "person-name",
        adjacentZoneId: "Strada Exemplu 12",
        area: {
          value: 12.5,
          unit: "m2",
          source: {
            sourceType: "+40722111222",
            sourceRecordId: "record-JohnDoe"
          }
        },
        thermalTransmittance: {
          value: 0.31,
          unit: "W/(m2*K)",
          source: {
            sourceType: "calculation_record",
            sourceRecordId: "record-001"
          }
        },
        bztu: {
          value: 0.76,
          unit: "dimensionless",
          source: {
            sourceType: "methodological_direct_input",
            sourceRecordId: "owner-snapshot",
            note: "private-note"
          }
        }
      })
    ],
    sourceContext: {
      owner: "John Doe",
      email: "person@example.com"
    }
  });

  const result = build(input);

  assert.equal(result.status, "blocked");
  assertNoForbiddenOutput(result);
  assertOnlyAllowlistedBlockers(result);
  assertNoHuHtrResults(result);
  assertNoDownstreamReadiness(result);
});
