import assert from "node:assert/strict";
import { createMc001EnvelopeInputBuilder } from "../../mc001EnvelopeInputBuilder.mjs";
import { fixture021EnvelopeFromAuditorInput as fixture } from "./fixture021EnvelopeFromAuditorInput.mjs";

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

function build(inputPack = fixture.inputPack) {
  return createMc001EnvelopeInputBuilder(inputPack, { registry: fixture.registry });
}

test("documents Fixture 021 Phase D scope without adding product behavior", () => {
  assert.equal(fixture.fixtureId, "FIXTURE_021_ENVELOPE_FROM_AUDITOR_INPUT");
  assert.ok(fixture.exclusions.includes("no Level 2 full MC001 auditor"));
  assert.ok(fixture.exclusions.includes("no complete Htr readiness"));
  assert.ok(fixture.exclusions.includes("no CPE/report/certificate workflow"));
  assert.ok(fixture.exclusions.includes("no UI/API/DB/Worker/deploy/product integration"));
  assert.ok(fixture.exclusions.includes("no new MC001 physics formulas"));
});

test("accepts raw envelope input only with source provenance", () => {
  const result = build();

  assert.equal(result.phaseCGate.status, "accepted_input_builder_gate");
  assert.equal(result.elementResults.length, fixture.expected.acceptedElementCount);
  assert.equal(result.bridgeResults.length, fixture.expected.acceptedBridgeCount);
  for (const element of result.elementResults) {
    assert.ok(element.area.provenance.sourceRefs.length > 0);
    assert.ok(element.uValue.provenance.sourceRefs.length > 0);
  }
});

test("rejects derived values submitted as normal envelope auditor input", () => {
  const inputPack = clone(fixture.inputPack);
  inputPack.envelope.Htr = {
    value: 10,
    unit: "W/K",
    owner: "auditor_entered",
    sourceRefs: ["FIELD_NOTE_ENV_001"],
    confidence: "reviewed",
    status: "ready"
  };

  assert.throws(
    () => build(inputPack),
    /Derived value envelope\.Htr must be submitted as validationImports or expertOverrides/
  );
});

test("prepares direct exterior envelope transmission from raw input", () => {
  const result = build();
  const wall = result.elementResults.find((element) => element.elementId === "EXT_WALL_001");

  assert.equal(wall.method, "source_backed_layer_u_value");
  assert.equal(result.directTransmissionSubtotal.unit, "W/K");
  assert.ok(
    Math.abs(
      result.directTransmissionSubtotal.value -
        fixture.expected.directTransmissionSubtotalWPerK
    ) < 1e-12
  );
});

test("blocks unsupported envelope areas with diagnostics", () => {
  const result = build();
  const blocked = result.blockedItems.find(
    (item) => item.elementId === "GROUND_SLAB_001"
  );

  assert.equal(blocked.boundaryType, "ground");
  assert.match(blocked.reason, /Phase D does not implement/);
  assert.ok(
    result.diagnostics.some(
      (diagnostic) => diagnostic.path === "envelope.elements[2]"
    )
  );
});

test("keeps readiness flags conservative", () => {
  const result = build();

  assert.equal(result.readinessClaims.isDirectTransmissionSubtotalReady, true);
  assert.equal(result.readinessClaims.isCompleteHtrReady, false);
  assert.equal(result.readinessClaims.isCompleteEnvelopeReady, false);
  assert.equal(result.readinessClaims.isLevel2Ready, false);
  assert.equal(result.readinessClaims.isCertificateCpeWorkflowReady, false);
  assert.equal(result.readinessClaims.isProductionIntegrationReady, false);
});

