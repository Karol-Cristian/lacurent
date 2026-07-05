import assert from "node:assert/strict";
import worker from "../save-house.js";

function test(name, fn) {
  return Promise.resolve()
    .then(fn)
    .then(() => console.log(`PASS ${name}`))
    .catch((error) => {
      console.error(`FAIL ${name}`);
      throw error;
    });
}

class FakeStatement {
  constructor(db, sql) {
    this.db = db;
    this.sql = sql;
    this.params = [];
  }

  bind(...params) {
    this.params = params;
    return this;
  }

  first() {
    return this.db.first(this.sql, this.params);
  }

  all() {
    return this.db.all(this.sql, this.params);
  }

  run() {
    return this.db.run(this.sql, this.params);
  }
}

class FakeDb {
  constructor() {
    this.user = {
      id: 1,
      email: "safe-user.local",
      name: "Safe User",
      role: "residential",
      account_type: "registered"
    };
    this.houses = [{ id: 7, user_id: 1, active: 1 }];
    this.analyses = [];
    this.answers = [];
    this.snapshots = [];
    this.reports = [];
    this.nextAnalysisId = 100;
    this.nextSnapshotId = 500;
  }

  prepare(sql) {
    return new FakeStatement(this, sql);
  }

  first(sql, params) {
    if (sql.includes("FROM user_sessions")) {
      return this.user;
    }
    if (sql.includes("FROM houses")) {
      const [houseId, userId] = params;
      return this.houses.find((house) => (
        house.id === houseId &&
        house.user_id === userId &&
        house.active === 1
      )) || null;
    }
    if (sql.includes("FROM analyses")) {
      const [analysisId, userId, analysisType] = params;
      return this.analyses.find((analysis) => (
        analysis.id === analysisId &&
        analysis.user_id === userId &&
        analysis.analysis_type === analysisType
      )) || null;
    }
    if (sql.includes("FROM analysis_answers")) {
      const [analysisId, key, group] = params;
      return this.answers.find((answer) => (
        answer.analysis_id === analysisId &&
        answer.question_key === key &&
        answer.answer_group === group
      )) || null;
    }
    if (sql.includes("FROM report_snapshots")) {
      const [analysisId] = params;
      return [...this.snapshots]
        .reverse()
        .find((snapshot) => snapshot.analysis_id === analysisId) || null;
    }
    return null;
  }

  all() {
    return { results: [] };
  }

  run(sql, params) {
    if (sql.includes("INSERT INTO analyses")) {
      const id = this.nextAnalysisId;
      this.nextAnalysisId += 1;
      this.analyses.push({
        id,
        user_id: params[0],
        house_id: params[1],
        analysis_type: params[2],
        status: "completed",
        completed_at: params[3]
      });
      return { meta: { last_row_id: id, changes: 1 } };
    }
    if (sql.includes("INSERT INTO analysis_answers")) {
      this.answers.push({
        analysis_id: params[0],
        question_key: params[1],
        answer_value: params[2],
        answer_group: params[3]
      });
      return { meta: { changes: 1 } };
    }
    if (sql.includes("INSERT INTO report_snapshots")) {
      const id = this.nextSnapshotId;
      this.nextSnapshotId += 1;
      this.snapshots.push({
        id,
        home_id: params[0],
        analysis_id: params[1],
        generated_at: params[2],
        technical_details_json: params[3],
        confidence_level: params[4]
      });
      return { meta: { last_row_id: id, changes: 1 } };
    }
    if (sql.includes("INSERT INTO reports")) {
      this.reports.push({
        analysis_id: params[0],
        report_type: "mc001_htr_transmission_module",
        status: "completed"
      });
      return { meta: { changes: 1 } };
    }
    return { meta: { changes: 0 } };
  }
}

function validPayload(overrides = {}) {
  return {
    house_id: null,
    label: "manual-htr-mvp",
    htr_input: {
      envelope_components: [
        {
          component_id: "wall-1",
          component_type: "external_wall",
          label: "Wall 1",
          area_m2: 10,
          thermal_transmittance_w_m2k: 0.3,
          bztu: 1,
          source: {
            source_type: "explicit_user_input",
            reference: "manual_mvp_input"
          }
        }
      ],
      non_hu_contributions: {
        thermal_bridge_w_k: {
          value: 2,
          source: {
            source_type: "explicit_user_input",
            reference: "manual_mvp_input"
          }
        },
        ground_w_k: {
          value: 4,
          source: {
            source_type: "explicit_user_input",
            reference: "manual_mvp_input"
          }
        },
        adjacent_space_w_k: {
          value: 1,
          source: {
            source_type: "explicit_user_input",
            reference: "manual_mvp_input"
          }
        }
      }
    },
    ...overrides
  };
}

function c1FormulaPayload(overrides = {}) {
  return validPayload({
    htr_input: {
      ...validPayload().htr_input,
      transmission_formula_inputs: {
        direct_transmission_elements: [
          {
            element_id: "direct-wall-1",
            label: "Direct wall",
            area_m2: 10,
            corrected_u_w_m2k: 0.3,
            source: {
              source_type: "explicit_user_input",
              reference: "manual_mvp_input"
            }
          }
        ],
        linear_thermal_bridges: [
          {
            bridge_id: "bridge-1",
            label: "Linear bridge",
            length_m: 5,
            psi_w_mk: 0.1,
            source: {
              source_type: "explicit_user_input",
              reference: "manual_mvp_input"
            }
          }
        ],
        psi_calculation_cases: [
          {
            case_id: "psi-case-1",
            length_m: 5,
            l2d_w_k: 4,
            reference_elements: [
              {
                element_id: "ref-wall-1",
                area_m2: 10,
                u_w_m2k: 0.3
              }
            ],
            source: {
              source_type: "explicit_user_input",
              reference: "manual_mvp_input"
            }
          }
        ],
        heat_flow_cases: [
          {
            case_id: "heat-flow-1",
            htr_w_k: 10,
            theta_i_c: 20,
            theta_e_c: 0
          }
        ],
        time_integrated_transmission_cases: [
          {
            case_id: "time-case-1",
            htr_w_k: 10,
            theta_i_c: 20,
            theta_e_c: 0,
            duration_h: 24
          }
        ],
        htr_total_2_15_case: {
          hd_w_k: 7,
          hg_w_k: 2,
          hu_w_k: 3,
          ha_w_k: 1,
          source: {
            source_type: "explicit_user_input",
            reference: "manual_mvp_input"
          }
        },
        ...overrides
      }
    }
  });
}

function c2IntegratedPayload(overrides = {}) {
  return validPayload({
    htr_input: {
      ...validPayload().htr_input,
      integrated_transmission_input: {
        mode: "explicit_input_integrated_transmission_v1",
        direct_transmission_elements: [
          {
            element_id: "direct-wall-1",
            label: "Direct wall",
            area_m2: 10,
            corrected_u_w_m2k: 0.3,
            source: {
              source_type: "explicit_user_input",
              reference: "manual_mvp_input"
            }
          }
        ],
        linear_thermal_bridges: [
          {
            bridge_id: "bridge-1",
            label: "Linear bridge",
            length_m: 5,
            psi_w_mk: 0.1,
            source: {
              source_type: "explicit_user_input",
              reference: "manual_mvp_input"
            }
          }
        ],
        explicit_no_thermal_bridges: false,
        ground_w_k: {
          value: 2,
          source: {
            source_type: "explicit_user_input",
            reference: "manual_mvp_input"
          }
        },
        hu_w_k: {
          value: 3,
          source: {
            source_type: "explicit_user_input",
            reference: "manual_mvp_input"
          }
        },
        ha_w_k: {
          value: 1,
          source: {
            source_type: "explicit_user_input",
            reference: "manual_mvp_input"
          }
        },
        ...overrides
      }
    }
  });
}

function c3MonthlyPayload(overrides = {}) {
  return validPayload({
    htr_input: {
      ...validPayload().htr_input,
      monthly_transmission_energy_input: {
        mode: "explicit_monthly_transmission_energy_v1",
        cases: [
          {
            case_id: "jan-heating",
            month: "january",
            calculation_mode: "heating",
            htr_w_k: 9,
            theta_i_c: 20,
            theta_e_c: 0,
            duration_h: 744,
            source: {
              source_type: "explicit_user_input",
              reference: "manual_mvp_input"
            }
          }
        ],
        ...overrides
      }
    }
  });
}

function c2AndC3MonthlyPayload(monthlyOverrides = {}) {
  const payload = c2IntegratedPayload();
  payload.htr_input.monthly_transmission_energy_input = {
    mode: "explicit_monthly_transmission_energy_v1",
    cases: [
      {
        case_id: "jan-heating",
        month: "january",
        calculation_mode: "heating",
        theta_i_c: 20,
        theta_e_c: 0,
        duration_h: 744,
        source: {
          source_type: "explicit_user_input",
          reference: "manual_mvp_input"
        }
      }
    ],
    htr_source: "integrated_htr_2_15",
    ...monthlyOverrides
  };
  return payload;
}

function c4VentilationPayload(overrides = {}) {
  return validPayload({
    htr_input: {
      ...validPayload().htr_input,
      ventilation_transfer_input: {
        mode: "explicit_monthly_ventilation_transfer_v1",
        cases: [
          {
            case_id: "jan-ventilation",
            month: "january",
            calculation_mode: "heating",
            air_heat_capacity_j_m3k: {
              value: 1200,
              source: {
                source_type: "explicit_user_input",
                reference: "manual_mvp_input"
              }
            },
            components: [
              {
                component_id: "infiltration-1",
                label: "Infiltration",
                air_flow_rate_m3_s: 0.05,
                temperature_correction_factor: 1,
                dynamic_correction_factor: 1,
                source: {
                  source_type: "explicit_user_input",
                  reference: "manual_mvp_input"
                }
              }
            ],
            theta_i_c: 20,
            theta_e_c: 0,
            duration_h: 744,
            source: {
              source_type: "explicit_user_input",
              reference: "manual_mvp_input"
            }
          }
        ],
        ...overrides
      }
    }
  });
}

function c3AndC4Payload() {
  const payload = c3MonthlyPayload();
  payload.htr_input.ventilation_transfer_input = c4VentilationPayload()
    .htr_input.ventilation_transfer_input;
  return payload;
}

async function post(path, db, body, token = "test-token") {
  const headers = { "Content-Type": "application/json" };
  if (token) headers.Authorization = `Bearer ${token}`;
  const response = await worker.fetch(
    new Request(`https://example.test${path}`, {
      method: "POST",
      headers,
      body: JSON.stringify(body)
    }),
    { DB: db }
  );
  return {
    status: response.status,
    body: await response.json()
  };
}

function assertNoMc001HtrPersistence(db, body) {
  assert.equal(db.analyses.length, 0);
  assert.equal(db.answers.length, 0);
  assert.equal(db.snapshots.length, 0);
  assert.equal(db.reports.length, 0);
  assert.equal(Object.prototype.hasOwnProperty.call(body, "mc001_htr"), false);
}

await test("run endpoint requires authentication", async () => {
  const db = new FakeDb();
  const result = await post("/api/mc001/htr/run", db, validPayload(), null);
  assert.equal(result.status, 401);
  assert.equal(result.body.success, false);
  assert.equal(db.analyses.length, 0);
});

await test("run endpoint rejects missing htr_input without persistence", async () => {
  const db = new FakeDb();
  const payload = validPayload();
  delete payload.htr_input;
  const result = await post("/api/mc001/htr/run", db, payload);
  assert.equal(result.status, 400);
  assert.equal(result.body.success, false);
  assert.equal(typeof result.body.error, "string");
  assertNoMc001HtrPersistence(db, result.body);
});

await test("run endpoint rejects empty envelope components without persistence", async () => {
  const db = new FakeDb();
  const payload = validPayload({
    htr_input: {
      ...validPayload().htr_input,
      envelope_components: []
    }
  });
  const result = await post("/api/mc001/htr/run", db, payload);
  assert.equal(result.status, 400);
  assert.equal(result.body.success, false);
  assert.equal(typeof result.body.error, "string");
  assertNoMc001HtrPersistence(db, result.body);
});

await test("run endpoint calculates and persists a sanitized Htr result", async () => {
  const db = new FakeDb();
  const result = await post("/api/mc001/htr/run", db, validPayload());
  assert.equal(result.status, 200);
  assert.equal(result.body.success, true);
  assert.equal(result.body.analysis_id, 100);
  assert.equal(result.body.house_id, null);
  assert.equal(result.body.mc001_htr.status, "ready");
  assert.deepEqual(result.body.mc001_htr.htrTotalResult, {
    amount: 10,
    unit: "W/K"
  });
  assert.equal(db.analyses.length, 1);
  assert.equal(db.answers.length, 1);
  assert.equal(db.snapshots.length, 1);
  assert.equal(db.reports.length, 1);
});

await test("V2 minimal payload still works without C1 formula results", async () => {
  const db = new FakeDb();
  const result = await post("/api/mc001/htr/run", db, validPayload());
  assert.equal(result.status, 200);
  assert.equal(result.body.success, true);
  assert.equal(result.body.mc001_htr.htrTotalResult.amount, 10);
  assert.equal(
    Object.prototype.hasOwnProperty.call(result.body.mc001_htr, "transmissionFormulaResults"),
    false
  );
});

await test("C1 direct transmission returns relation 2.12 result", async () => {
  const db = new FakeDb();
  const result = await post("/api/mc001/htr/run", db, c1FormulaPayload({
    linear_thermal_bridges: [],
    psi_calculation_cases: [],
    heat_flow_cases: [],
    time_integrated_transmission_cases: [],
    htr_total_2_15_case: null
  }));
  assert.equal(result.status, 200);
  assert.equal(result.body.mc001_htr.transmissionFormulaResults.directTransmission.result.amount, 3);
  assert.equal(result.body.mc001_htr.transmissionFormulaResults.directTransmission.result.unit, "W/K");
});

await test("C1 thermal bridge global returns relation 2.28 result", async () => {
  const db = new FakeDb();
  const result = await post("/api/mc001/htr/run", db, c1FormulaPayload({
    direct_transmission_elements: [],
    psi_calculation_cases: [],
    heat_flow_cases: [],
    time_integrated_transmission_cases: [],
    htr_total_2_15_case: null
  }));
  assert.equal(result.status, 200);
  assert.equal(result.body.mc001_htr.transmissionFormulaResults.thermalBridgeGlobal.result.amount, 0.5);
});

await test("C1 direct plus bridge returns global excluding ground result", async () => {
  const db = new FakeDb();
  const result = await post("/api/mc001/htr/run", db, c1FormulaPayload({
    psi_calculation_cases: [],
    heat_flow_cases: [],
    time_integrated_transmission_cases: [],
    htr_total_2_15_case: null
  }));
  assert.equal(result.status, 200);
  assert.equal(
    result.body.mc001_htr.transmissionFormulaResults.globalTransmissionExcludingGround.result.amount,
    3.5
  );
});

await test("C1 psi case returns expected psi result", async () => {
  const db = new FakeDb();
  const result = await post("/api/mc001/htr/run", db, c1FormulaPayload({
    direct_transmission_elements: [],
    linear_thermal_bridges: [],
    heat_flow_cases: [],
    time_integrated_transmission_cases: [],
    htr_total_2_15_case: null
  }));
  assert.equal(result.status, 200);
  assert.equal(result.body.mc001_htr.transmissionFormulaResults.psiCases[0].result.amount, 0.2);
});

await test("C1 heat flow case returns expected flux", async () => {
  const db = new FakeDb();
  const result = await post("/api/mc001/htr/run", db, c1FormulaPayload({
    direct_transmission_elements: [],
    linear_thermal_bridges: [],
    psi_calculation_cases: [],
    time_integrated_transmission_cases: [],
    htr_total_2_15_case: null
  }));
  assert.equal(result.status, 200);
  assert.equal(result.body.mc001_htr.transmissionFormulaResults.heatFlowCases[0].result.amount, 200);
});

await test("C1 time-integrated case returns expected kWh and not-QHnd scope", async () => {
  const db = new FakeDb();
  const result = await post("/api/mc001/htr/run", db, c1FormulaPayload({
    direct_transmission_elements: [],
    linear_thermal_bridges: [],
    psi_calculation_cases: [],
    heat_flow_cases: [],
    htr_total_2_15_case: null
  }));
  assert.equal(result.status, 200);
  assert.equal(
    result.body.mc001_htr.transmissionFormulaResults.timeIntegratedTransmissionCases[0].result.amount,
    4.8
  );
  assert.equal(
    result.body.mc001_htr.transmissionFormulaResults.timeIntegratedTransmissionCases[0].scope,
    "transmission_heat_flow_time_integration_only_not_QHnd"
  );
});

await test("C1 Htr relation 2.15 case returns expected total", async () => {
  const db = new FakeDb();
  const result = await post("/api/mc001/htr/run", db, c1FormulaPayload({
    direct_transmission_elements: [],
    linear_thermal_bridges: [],
    psi_calculation_cases: [],
    heat_flow_cases: [],
    time_integrated_transmission_cases: []
  }));
  assert.equal(result.status, 200);
  assert.equal(result.body.mc001_htr.transmissionFormulaResults.htrTotalRelation215.result.amount, 13);
});

await test("C1 expanded result persists and reloads", async () => {
  const db = new FakeDb();
  await post("/api/mc001/htr/run", db, c1FormulaPayload());
  const result = await post("/api/mc001/htr/load", db, { analysis_id: 100 });
  assert.equal(result.status, 200);
  assert.equal(result.body.htr_input.transmission_formula_inputs.direct_transmission_elements.length, 1);
  assert.equal(result.body.mc001_htr.transmissionFormulaResults.directTransmission.result.amount, 3);
  assert.equal(result.body.mc001_htr.transmissionFormulaResults.globalTransmissionExcludingGround.result.amount, 3.5);
});

await test("load endpoint returns saved sanitized input and result for owner", async () => {
  const db = new FakeDb();
  await post("/api/mc001/htr/run", db, validPayload({ house_id: 7 }));
  const result = await post("/api/mc001/htr/load", db, { analysis_id: 100 });
  assert.equal(result.status, 200);
  assert.equal(result.body.success, true);
  assert.equal(result.body.house_id, 7);
  assert.equal(result.body.htr_input.envelope_components.length, 1);
  assert.equal(result.body.mc001_htr.htrTotalResult.amount, 10);
});

await test("run endpoint rejects client-provided Htr totals", async () => {
  const db = new FakeDb();
  const payload = validPayload({
    htr_input: {
      ...validPayload().htr_input,
      htrTotal: 10
    }
  });
  const result = await post("/api/mc001/htr/run", db, payload);
  assert.equal(result.status, 400);
  assert.equal(result.body.success, false);
  assert.equal(db.analyses.length, 0);
});

await test("C1 rejects client-provided transmission formula results", async () => {
  const db = new FakeDb();
  const payload = c1FormulaPayload();
  payload.htr_input.transmissionFormulaResults = {
    directTransmission: { result: { amount: 999, unit: "W/K" } }
  };
  const result = await post("/api/mc001/htr/run", db, payload);
  assert.equal(result.status, 400);
  assert.equal(result.body.success, false);
  assert.equal(db.analyses.length, 0);
});

await test("C1 rejects invalid negative direct transmission area", async () => {
  const db = new FakeDb();
  const payload = c1FormulaPayload();
  payload.htr_input.transmission_formula_inputs.direct_transmission_elements[0].area_m2 = -10;
  const result = await post("/api/mc001/htr/run", db, payload);
  assert.equal(result.status, 400);
  assert.equal(result.body.success, false);
  assert.equal(db.analyses.length, 0);
});

await test("C1 rejects missing explicit source for source-required formula inputs", async () => {
  const db = new FakeDb();
  const payload = c1FormulaPayload();
  delete payload.htr_input.transmission_formula_inputs.direct_transmission_elements[0].source;
  const result = await post("/api/mc001/htr/run", db, payload);
  assert.equal(result.status, 400);
  assert.equal(result.body.success, false);
  assert.equal(db.analyses.length, 0);
});

await test("C2 integrated payload returns expected explicit transmission results", async () => {
  const db = new FakeDb();
  const result = await post("/api/mc001/htr/run", db, c2IntegratedPayload());
  const c2 = result.body.mc001_htr.integratedTransmissionResult;
  assert.equal(result.status, 200);
  assert.equal(c2.status, "ready");
  assert.equal(c2.results.hd.result.amount, 3);
  assert.equal(c2.results.thermalBridgeGlobal.result.amount, 0.5);
  assert.equal(c2.results.transmissionExcludingGround.result.amount, 3.5);
  assert.equal(c2.results.htrTotal215.result.amount, 9);
});

await test("C2 integrated result persists and reloads", async () => {
  const db = new FakeDb();
  await post("/api/mc001/htr/run", db, c2IntegratedPayload());
  const result = await post("/api/mc001/htr/load", db, { analysis_id: 100 });
  assert.equal(result.status, 200);
  assert.equal(
    result.body.htr_input.integrated_transmission_input.mode,
    "explicit_input_integrated_transmission_v1"
  );
  assert.equal(result.body.mc001_htr.integratedTransmissionResult.results.htrTotal215.result.amount, 9);
});

await test("C2 rejects client-provided integrated transmission result", async () => {
  const db = new FakeDb();
  const payload = c2IntegratedPayload();
  payload.htr_input.integratedTransmissionResult = {
    results: { htrTotal215: { result: { amount: 999, unit: "W/K" } } }
  };
  const result = await post("/api/mc001/htr/run", db, payload);
  assert.equal(result.status, 400);
  assert.equal(result.body.success, false);
  assert.equal(db.analyses.length, 0);
});

await test("C2 rejects missing bridge list when no-bridge flag is not true", async () => {
  const db = new FakeDb();
  const result = await post("/api/mc001/htr/run", db, c2IntegratedPayload({
    linear_thermal_bridges: [],
    explicit_no_thermal_bridges: false
  }));
  assert.equal(result.status, 400);
  assert.equal(result.body.success, false);
  assert.equal(db.analyses.length, 0);
});

await test("C2 accepts explicit no thermal bridges and returns zero Htr,tb", async () => {
  const db = new FakeDb();
  const result = await post("/api/mc001/htr/run", db, c2IntegratedPayload({
    linear_thermal_bridges: [],
    explicit_no_thermal_bridges: true
  }));
  assert.equal(result.status, 200);
  assert.equal(
    result.body.mc001_htr.integratedTransmissionResult.results.thermalBridgeGlobal.result.amount,
    0
  );
  assert.equal(
    result.body.mc001_htr.integratedTransmissionResult.results.transmissionExcludingGround.result.amount,
    3
  );
});

await test("C2 rejects negative ground Hu or Ha", async () => {
  for (const override of [
    { ground_w_k: { value: -1, source: { source_type: "explicit_user_input", reference: "manual_mvp_input" } } },
    { hu_w_k: { value: -1, source: { source_type: "explicit_user_input", reference: "manual_mvp_input" } } },
    { ha_w_k: { value: -1, source: { source_type: "explicit_user_input", reference: "manual_mvp_input" } } }
  ]) {
    const db = new FakeDb();
    const result = await post("/api/mc001/htr/run", db, c2IntegratedPayload(override));
    assert.equal(result.status, 400);
    assert.equal(result.body.success, false);
    assert.equal(db.analyses.length, 0);
  }
});

await test("C2 response includes bridge-separation warning", async () => {
  const db = new FakeDb();
  const result = await post("/api/mc001/htr/run", db, c2IntegratedPayload());
  assert.equal(
    result.body.mc001_htr.integratedTransmissionResult.diagnostics.warnings.includes(
      "thermal_bridge_not_auto_added_to_2_15_total_in_c2"
    ),
    true
  );
});

await test("C2 does not mutate existing V2 H12 total result", async () => {
  const db = new FakeDb();
  const result = await post("/api/mc001/htr/run", db, c2IntegratedPayload());
  assert.equal(result.status, 200);
  assert.equal(result.body.mc001_htr.htrTotalResult.amount, 10);
  assert.equal(result.body.mc001_htr.integratedTransmissionResult.results.htrTotal215.result.amount, 9);
});

await test("C3 monthly payload returns January heat flow and energy", async () => {
  const db = new FakeDb();
  const result = await post("/api/mc001/htr/run", db, c3MonthlyPayload());
  const c3 = result.body.mc001_htr.monthlyTransmissionEnergyResult;
  assert.equal(result.status, 200);
  assert.equal(c3.status, "ready");
  assert.equal(c3.caseResults[0].heatFlow.amount, 180);
  assert.equal(c3.caseResults[0].transmissionEnergy.amount, 133.92);
  assert.equal(c3.scope, "monthly_transmission_energy_explicit_input_only_not_QHnd");
});

await test("C3 monthly result persists and reloads", async () => {
  const db = new FakeDb();
  await post("/api/mc001/htr/run", db, c3MonthlyPayload());
  const result = await post("/api/mc001/htr/load", db, { analysis_id: 100 });
  assert.equal(result.status, 200);
  assert.equal(result.body.htr_input.monthly_transmission_energy_input.cases.length, 1);
  assert.equal(result.body.mc001_htr.monthlyTransmissionEnergyResult.caseResults[0].heatFlow.amount, 180);
  assert.equal(
    result.body.mc001_htr.monthlyTransmissionEnergyResult.summary.annualSignedTransmissionEnergy.amount,
    133.92
  );
});

await test("C3 rejects client-provided monthly transmission result", async () => {
  const db = new FakeDb();
  const payload = c3MonthlyPayload();
  payload.htr_input.monthlyTransmissionEnergyResult = {
    summary: { annualSignedTransmissionEnergy: { amount: 999, unit: "kWh" } }
  };
  const result = await post("/api/mc001/htr/run", db, payload);
  assert.equal(result.status, 400);
  assert.equal(result.body.success, false);
  assert.equal(db.analyses.length, 0);
});

await test("C3 rejects invalid month", async () => {
  const db = new FakeDb();
  const payload = c3MonthlyPayload();
  payload.htr_input.monthly_transmission_energy_input.cases[0].month = "jan";
  const result = await post("/api/mc001/htr/run", db, payload);
  assert.equal(result.status, 400);
  assert.equal(result.body.success, false);
  assert.equal(db.analyses.length, 0);
});

await test("C3 rejects missing explicit source", async () => {
  const db = new FakeDb();
  const payload = c3MonthlyPayload();
  delete payload.htr_input.monthly_transmission_energy_input.cases[0].source;
  const result = await post("/api/mc001/htr/run", db, payload);
  assert.equal(result.status, 400);
  assert.equal(result.body.success, false);
  assert.equal(db.analyses.length, 0);
});

await test("C3 rejects zero duration", async () => {
  const db = new FakeDb();
  const payload = c3MonthlyPayload();
  payload.htr_input.monthly_transmission_energy_input.cases[0].duration_h = 0;
  const result = await post("/api/mc001/htr/run", db, payload);
  assert.equal(result.status, 400);
  assert.equal(result.body.success, false);
  assert.equal(db.analyses.length, 0);
});

await test("C3 does not mutate V2 C1 or C2 response fields", async () => {
  const db = new FakeDb();
  const payload = c2IntegratedPayload();
  payload.htr_input.transmission_formula_inputs = c1FormulaPayload().htr_input.transmission_formula_inputs;
  payload.htr_input.monthly_transmission_energy_input = c3MonthlyPayload()
    .htr_input.monthly_transmission_energy_input;
  const result = await post("/api/mc001/htr/run", db, payload);
  assert.equal(result.status, 200);
  assert.equal(result.body.mc001_htr.htrTotalResult.amount, 10);
  assert.equal(result.body.mc001_htr.transmissionFormulaResults.directTransmission.result.amount, 3);
  assert.equal(result.body.mc001_htr.integratedTransmissionResult.results.htrTotal215.result.amount, 9);
  assert.equal(result.body.mc001_htr.monthlyTransmissionEnergyResult.caseResults[0].transmissionEnergy.amount, 133.92);
});

await test("C3 response says not QHnd", async () => {
  const db = new FakeDb();
  const result = await post("/api/mc001/htr/run", db, c3MonthlyPayload());
  const serialized = JSON.stringify(result.body.mc001_htr.monthlyTransmissionEnergyResult);
  assert.equal(serialized.includes("not_QHnd"), true);
  assert.equal(serialized.includes("monthly_transmission_energy_explicit_input_only_not_QHnd"), true);
});

await test("C3 can explicitly use C2 Htr 2.15 as monthly Htr source", async () => {
  const db = new FakeDb();
  const result = await post("/api/mc001/htr/run", db, c2AndC3MonthlyPayload());
  assert.equal(result.status, 200);
  assert.equal(result.body.mc001_htr.integratedTransmissionResult.results.htrTotal215.result.amount, 9);
  assert.equal(result.body.mc001_htr.monthlyTransmissionEnergyResult.caseResults[0].heatFlow.amount, 180);
  assert.equal(result.body.mc001_htr.monthlyTransmissionEnergyResult.caseResults[0].transmissionEnergy.amount, 133.92);
});

await test("C4 ventilation payload returns Hve Phi and Qve", async () => {
  const db = new FakeDb();
  const result = await post("/api/mc001/htr/run", db, c4VentilationPayload());
  const c4 = result.body.mc001_htr.ventilationTransferResult;
  assert.equal(result.status, 200);
  assert.equal(c4.status, "ready");
  assert.equal(c4.caseResults[0].ventilationHeatTransferCoefficient.amount, 60);
  assert.equal(c4.caseResults[0].heatFlow.amount, 1200);
  assert.equal(c4.caseResults[0].ventilationEnergy.amount, 892.8);
  assert.equal(c4.scope, "monthly_ventilation_transfer_explicit_input_only_not_QHnd");
});

await test("C4 result persists and reloads", async () => {
  const db = new FakeDb();
  await post("/api/mc001/htr/run", db, c4VentilationPayload());
  const result = await post("/api/mc001/htr/load", db, { analysis_id: 100 });
  assert.equal(result.status, 200);
  assert.equal(result.body.htr_input.ventilation_transfer_input.cases.length, 1);
  assert.equal(
    result.body.mc001_htr.ventilationTransferResult.summary.annualSignedVentilationEnergy.amount,
    892.8
  );
});

await test("C4 rejects client-provided ventilation transfer result", async () => {
  const db = new FakeDb();
  const payload = c4VentilationPayload();
  payload.htr_input.ventilationTransferResult = {
    summary: { annualSignedVentilationEnergy: { amount: 999, unit: "kWh" } }
  };
  const result = await post("/api/mc001/htr/run", db, payload);
  assert.equal(result.status, 400);
  assert.equal(result.body.success, false);
  assert.equal(db.analyses.length, 0);
});

await test("C4 rejects client-provided explicit heat transfer summary", async () => {
  const db = new FakeDb();
  const payload = c3AndC4Payload();
  payload.htr_input.explicitHeatTransferSummary = {
    combinedTransmissionAndVentilationKWh: { amount: 1, unit: "kWh" }
  };
  const result = await post("/api/mc001/htr/run", db, payload);
  assert.equal(result.status, 400);
  assert.equal(result.body.success, false);
  assert.equal(db.analyses.length, 0);
});

await test("C4 rejects missing air heat capacity source", async () => {
  const db = new FakeDb();
  const payload = c4VentilationPayload();
  delete payload.htr_input.ventilation_transfer_input.cases[0].air_heat_capacity_j_m3k.source;
  const result = await post("/api/mc001/htr/run", db, payload);
  assert.equal(result.status, 400);
  assert.equal(result.body.success, false);
  assert.equal(db.analyses.length, 0);
});

await test("C4 rejects invalid month", async () => {
  const db = new FakeDb();
  const payload = c4VentilationPayload();
  payload.htr_input.ventilation_transfer_input.cases[0].month = "jan";
  const result = await post("/api/mc001/htr/run", db, payload);
  assert.equal(result.status, 400);
  assert.equal(result.body.success, false);
  assert.equal(db.analyses.length, 0);
});

await test("C4 rejects negative airflow", async () => {
  const db = new FakeDb();
  const payload = c4VentilationPayload();
  payload.htr_input.ventilation_transfer_input.cases[0].components[0].air_flow_rate_m3_s = -0.05;
  const result = await post("/api/mc001/htr/run", db, payload);
  assert.equal(result.status, 400);
  assert.equal(result.body.success, false);
  assert.equal(db.analyses.length, 0);
});

await test("C4 response says not QHnd", async () => {
  const db = new FakeDb();
  const result = await post("/api/mc001/htr/run", db, c4VentilationPayload());
  const serialized = JSON.stringify(result.body.mc001_htr.ventilationTransferResult);
  assert.equal(serialized.includes("not_QHnd"), true);
  assert.equal(serialized.includes("monthly_ventilation_transfer_explicit_input_only_not_QHnd"), true);
});

await test("C3 and C4 return explicit non-QHnd combined heat transfer summary", async () => {
  const db = new FakeDb();
  const result = await post("/api/mc001/htr/run", db, c3AndC4Payload());
  const summary = result.body.mc001_htr.explicitHeatTransferSummary;
  assert.equal(result.status, 200);
  assert.equal(summary.status, "ready");
  assert.equal(summary.transmissionEnergyKWh.amount, 133.92);
  assert.equal(summary.ventilationEnergyKWh.amount, 892.8);
  assert.equal(summary.combinedTransmissionAndVentilationKWh.amount, 1026.72);
  assert.equal(summary.scope, "explicit_transmission_plus_ventilation_only_not_QHnd");
});

await test("C4 does not mutate V2 C1 C2 or C3 response fields", async () => {
  const db = new FakeDb();
  const payload = c2IntegratedPayload();
  payload.htr_input.transmission_formula_inputs = c1FormulaPayload().htr_input.transmission_formula_inputs;
  payload.htr_input.monthly_transmission_energy_input = c3MonthlyPayload()
    .htr_input.monthly_transmission_energy_input;
  payload.htr_input.ventilation_transfer_input = c4VentilationPayload()
    .htr_input.ventilation_transfer_input;
  const result = await post("/api/mc001/htr/run", db, payload);
  assert.equal(result.status, 200);
  assert.equal(result.body.mc001_htr.htrTotalResult.amount, 10);
  assert.equal(result.body.mc001_htr.transmissionFormulaResults.directTransmission.result.amount, 3);
  assert.equal(result.body.mc001_htr.integratedTransmissionResult.results.htrTotal215.result.amount, 9);
  assert.equal(result.body.mc001_htr.monthlyTransmissionEnergyResult.caseResults[0].transmissionEnergy.amount, 133.92);
  assert.equal(result.body.mc001_htr.ventilationTransferResult.caseResults[0].ventilationEnergy.amount, 892.8);
});

await test("run endpoint rejects private sentinel content and does not echo it", async () => {
  const db = new FakeDb();
  const payload = validPayload({ label: "person@example.com" });
  const result = await post("/api/mc001/htr/run", db, payload);
  const serialized = JSON.stringify(result.body);
  assert.equal(result.status, 400);
  assert.equal(result.body.success, false);
  assert.equal(serialized.includes("person@example.com"), false);
  assert.equal(db.analyses.length, 0);
});

await test("responses do not expose raw auth or source provenance internals", async () => {
  const db = new FakeDb();
  const result = await post("/api/mc001/htr/run", db, c1FormulaPayload());
  const serialized = JSON.stringify(result.body);
  for (const forbidden of [
    "sourceRecordId",
    "sourceContext",
    "sourceTrace",
    "sourceRefs",
    "test-token",
    "safe-user.local"
  ]) {
    assert.equal(serialized.includes(forbidden), false, `leaked ${forbidden}`);
  }
});

await test("C2 response does not expose token session email or private data", async () => {
  const db = new FakeDb();
  const result = await post("/api/mc001/htr/run", db, c2IntegratedPayload());
  const serialized = JSON.stringify(result.body);
  for (const forbidden of [
    "sourceRecordId",
    "sourceContext",
    "sourceTrace",
    "sourceRefs",
    "test-token",
    "safe-user.local",
    "person@example.com",
    "private-note"
  ]) {
    assert.equal(serialized.includes(forbidden), false, `leaked ${forbidden}`);
  }
});

await test("C3 response does not expose token session email or private data", async () => {
  const db = new FakeDb();
  const result = await post("/api/mc001/htr/run", db, c3MonthlyPayload());
  const serialized = JSON.stringify(result.body);
  for (const forbidden of [
    "sourceRecordId",
    "sourceContext",
    "sourceTrace",
    "sourceRefs",
    "test-token",
    "safe-user.local"
  ]) {
    assert.equal(serialized.includes(forbidden), false, `leaked ${forbidden}`);
  }
});

await test("C4 response does not expose token session email or private data", async () => {
  const db = new FakeDb();
  const result = await post("/api/mc001/htr/run", db, c4VentilationPayload());
  const serialized = JSON.stringify(result.body);
  for (const forbidden of [
    "sourceRecordId",
    "sourceContext",
    "sourceTrace",
    "sourceRefs",
    "test-token",
    "safe-user.local"
  ]) {
    assert.equal(serialized.includes(forbidden), false, `leaked ${forbidden}`);
  }
});

await test("C1 response does not expose stack traces or mutate V2 result contract", async () => {
  const db = new FakeDb();
  const result = await post("/api/mc001/htr/run", db, c1FormulaPayload());
  const serialized = JSON.stringify(result.body);
  assert.equal(result.status, 200);
  assert.equal(result.body.mc001_htr.htrTotalResult.amount, 10);
  assert.equal(Array.isArray(result.body.mc001_htr.calculationTerms), true);
  assert.equal(serialized.includes("Error:"), false);
  assert.equal(serialized.includes("at "), false);
});

await test("C3 response does not expose stack traces", async () => {
  const db = new FakeDb();
  const result = await post("/api/mc001/htr/run", db, c3MonthlyPayload());
  const serialized = JSON.stringify(result.body);
  assert.equal(result.status, 200);
  assert.equal(serialized.includes("Error:"), false);
  assert.equal(serialized.includes("at "), false);
});

await test("C4 response does not expose stack traces", async () => {
  const db = new FakeDb();
  const result = await post("/api/mc001/htr/run", db, c4VentilationPayload());
  const serialized = JSON.stringify(result.body);
  assert.equal(result.status, 200);
  assert.equal(serialized.includes("Error:"), false);
  assert.equal(serialized.includes("at "), false);
});

await test("C2 response does not expose stack traces", async () => {
  const db = new FakeDb();
  const result = await post("/api/mc001/htr/run", db, c2IntegratedPayload());
  const serialized = JSON.stringify(result.body);
  assert.equal(result.status, 200);
  assert.equal(serialized.includes("Error:"), false);
  assert.equal(serialized.includes("at "), false);
});
