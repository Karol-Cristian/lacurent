import { WorkerEntrypoint } from "cloudflare:workers";

const SHARDS = ["RBPE_A", "RBPE_B", "RBPE_C", "RBPE_D"];
const COOLDOWN_MS = 12000;
let cursor = 0;
const disabledUntil = new Map();

async function callRpc(env, key, method, args) {
  const binding = env[key];
  if (!binding) throw new Error(`missing_${key}`);
  if (method === "calculate_home_lab_api_json") {
    return await binding.calculate_home_lab_api_json(args[0], args[1]);
  }
  if (method === "calculate_home_lab_json") {
    return await binding.calculate_home_lab_json(args[0]);
  }
  if (method === "calculate_render_context_json") {
    return await binding.calculate_render_context_json(args[0]);
  }
  if (method === "calculate_home_lab_form_api_json") {
    return await binding.calculate_home_lab_form_api_json(args[0]);
  }
  if (method === "reference_comparison") {
    return await binding.reference_comparison(args[0], args[1]);
  }
  if (method === "build_wall_insulation_scenario_json") {
    return await binding.build_wall_insulation_scenario_json(
      args[0], args[1], args[2],
    );
  }
  if (method === "build_product_wall_insulation_scenario_json") {
    return await binding.build_product_wall_insulation_scenario_json(
      args[0], args[1], args[2],
    );
  }
  throw new Error("unsupported_rpc_method");
}

async function routeRpc(env, method, args) {
  const now = Date.now();
  const start = cursor++ % SHARDS.length;
  let lastError = null;

  for (let offset = 0; offset < SHARDS.length; offset += 1) {
    const key = SHARDS[(start + offset) % SHARDS.length];
    if ((disabledUntil.get(key) || 0) > now) continue;

    try {
      const result = await callRpc(env, key, method, args);
      disabledUntil.delete(key);
      return result;
    } catch (error) {
      lastError = error;
      disabledUntil.set(key, Date.now() + COOLDOWN_MS);
    }
  }

  // If every shard is cooling down, wait only for the earliest breaker.
  // This keeps transient 1102 isolation failures behind the service boundary.
  const earliest = [...SHARDS].sort(
    (a, b) => (disabledUntil.get(a) || 0) - (disabledUntil.get(b) || 0),
  )[0];
  const waitMs = Math.max(0, (disabledUntil.get(earliest) || 0) - Date.now());
  if (waitMs > 0 && waitMs <= COOLDOWN_MS) {
    await new Promise(resolve => setTimeout(resolve, waitMs));
  }

  try {
    const result = await callRpc(env, earliest, method, args);
    disabledUntil.delete(earliest);
    return result;
  } catch (error) {
    lastError = error;
    disabledUntil.set(earliest, Date.now() + COOLDOWN_MS);
  }

  throw new Error(
    "private_rbpe_all_shards_unavailable:" +
    String(lastError?.message || lastError || "unknown"),
  );
}

export default class extends WorkerEntrypoint {
  async calculate_home_lab_api_json(payload, optimizerCandidate = false) {
    return routeRpc(
      this.env,
      "calculate_home_lab_api_json",
      [payload, Boolean(optimizerCandidate)],
    );
  }

  async calculate_home_lab_json(payload) {
    return routeRpc(this.env, "calculate_home_lab_json", [payload]);
  }

  async calculate_render_context_json(payload) {
    return routeRpc(this.env, "calculate_render_context_json", [payload]);
  }

  async calculate_home_lab_form_api_json(encodedForm) {
    return routeRpc(
      this.env,
      "calculate_home_lab_form_api_json",
      [encodedForm],
    );
  }

  async reference_comparison(payload, actualSpecific) {
    return routeRpc(
      this.env,
      "reference_comparison",
      [payload, actualSpecific],
    );
  }

  async build_wall_insulation_scenario_json(
    payload,
    addedInsulationThicknessMm,
    insulationLambdaWMk,
  ) {
    return routeRpc(
      this.env,
      "build_wall_insulation_scenario_json",
      [payload, addedInsulationThicknessMm, insulationLambdaWMk],
    );
  }

  async build_product_wall_insulation_scenario_json(
    payload,
    requirementPayload,
    productPayload,
  ) {
    return routeRpc(
      this.env,
      "build_product_wall_insulation_scenario_json",
      [payload, requirementPayload, productPayload],
    );
  }

  async fetch() {
    return Response.json({
      status: "ok",
      service: "lacurent-rbpe-router",
      shards: SHARDS.length,
    });
  }
}
