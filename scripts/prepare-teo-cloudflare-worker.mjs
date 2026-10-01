import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const repoRoot = path.resolve(__dirname, "..");
const commercialRoot = path.join(repoRoot, "commercial");
const appRoot = path.join(commercialRoot, "app");
const configRoot = path.join(commercialRoot, "teo-worker");
const outputDir = path.join(repoRoot, ".wrangler", "teo-worker");
const srcDir = path.join(outputDir, "src");
const targetAppDir = path.join(srcDir, "app");

function copyDirectory(source, target) {
  fs.mkdirSync(target, { recursive: true });
  for (const entry of fs.readdirSync(source, { withFileTypes: true })) {
    if (entry.name === "__pycache__" || entry.name === ".venv") continue;
    const sourcePath = path.join(source, entry.name);
    const targetPath = path.join(target, entry.name);
    if (entry.isDirectory()) copyDirectory(sourcePath, targetPath);
    else if (entry.isFile()) fs.copyFileSync(sourcePath, targetPath);
  }
}

function extractMarkedBlock(source, name) {
  const startMarker = `# --- TEO_SLIM_${name}_START ---`;
  const endMarker = `# --- TEO_SLIM_${name}_END ---`;
  const start = source.indexOf(startMarker);
  const end = source.indexOf(endMarker);
  if (start < 0 || end < 0 || end <= start) {
    throw new Error(`Missing or invalid TEO slim markers for ${name}`);
  }
  return source
    .slice(start + startMarker.length, end)
    .trim()
    .concat("\n");
}

function discoverLocalModules(source) {
  const modules = new Set();
  const patterns = [
    /^\s*from\s+\.([A-Za-z_][\w.]*)\s+import\s+/gm,
    /^\s*from\s+app\.([A-Za-z_][\w.]*)\s+import\s+/gm,
    /^\s*from\s+commercial\.app\.([A-Za-z_][\w.]*)\s+import\s+/gm,
    /^\s*import\s+app\.([A-Za-z_][\w.]*)/gm,
    /^\s*import\s+commercial\.app\.([A-Za-z_][\w.]*)/gm,
  ];
  for (const pattern of patterns) {
    for (const match of source.matchAll(pattern)) modules.add(match[1]);
  }

  for (const match of source.matchAll(/^\s*from\s+\.\s+import\s+([^\n#]+)/gm)) {
    for (const raw of match[1].split(",")) {
      const name = raw.trim().split(/\s+as\s+/)[0];
      if (/^[A-Za-z_]\w*$/.test(name)) modules.add(name);
    }
  }
  return modules;
}

function copyModuleClosure(entrySource) {
  fs.mkdirSync(targetAppDir, { recursive: true });
  const packageInit = path.join(appRoot, "__init__.py");
  if (fs.existsSync(packageInit)) {
    fs.copyFileSync(packageInit, path.join(targetAppDir, "__init__.py"));
  }

  const seen = new Set();
  const queue = [...discoverLocalModules(entrySource)];
  while (queue.length) {
    const moduleName = queue.shift();
    if (!moduleName || seen.has(moduleName) || moduleName === "teo_service") continue;
    seen.add(moduleName);

    const relative = moduleName.split(".").join(path.sep);
    const moduleFile = path.join(appRoot, relative + ".py");
    const packageFile = path.join(appRoot, relative, "__init__.py");
    let sourcePath;
    let targetPath;

    if (fs.existsSync(moduleFile)) {
      sourcePath = moduleFile;
      targetPath = path.join(targetAppDir, relative + ".py");
    } else if (fs.existsSync(packageFile)) {
      sourcePath = packageFile;
      targetPath = path.join(targetAppDir, relative, "__init__.py");
    } else {
      throw new Error(`Unresolved local TEO dependency: app.${moduleName}`);
    }

    fs.mkdirSync(path.dirname(targetPath), { recursive: true });
    fs.copyFileSync(sourcePath, targetPath);
    const nested = fs.readFileSync(sourcePath, "utf8");
    for (const dependency of discoverLocalModules(nested)) {
      if (!seen.has(dependency)) queue.push(dependency);
    }
  }
  return [...seen].sort();
}

const mainSource = fs.readFileSync(path.join(appRoot, "main.py"), "utf8");
const formBlock = extractMarkedBlock(mainSource, "FORM");
const infraBlock = extractMarkedBlock(mainSource, "INFRA");
const apiBlock = extractMarkedBlock(mainSource, "API");

const serviceHeader = `from __future__ import annotations

import asyncio
import gc
import json
import math
from functools import lru_cache
from pathlib import Path
import time
from typing import Any

from fastapi import FastAPI, Request
from fastapi.responses import JSONResponse
from pydantic import ValidationError

from .engine import calculate
from .home_lab_payload import embed_lab_result_payload
from .methodology import climate_data, methodology, resolve_locality
from .models import BuildingInput, model_to_dict
from .optimization import (
    CandidateEvaluationV1,
    OptimizationMode,
    OptimizationRequestV1,
    ParametricMeasuresV1,
    OptimizationSearchBoundsV1,
    clear_baseline_evaluation_cache,
)
from .optimization_v2 import (
    evaluate_worker_safe_branch_v2,
    select_optimization_candidate_v2,
)
from .optimization_v3 import (
    V3_BRANCH_BATCH_SIZE,
    build_verification_plan_v3,
    build_worker_safe_plan_v3,
    verify_one_candidate_v3,
)
from .heating_optimization import (
    HeatingBranchSummaryV1,
    commercialize_heating_finalist,
    heating_branch_plan,
    heating_planning_options,
    heat_pump_monthly_performance_profile,
)
from .heating_catalog_store import (
    cached_heating_branch_catalog_from_d1,
    cached_heating_catalog_from_d1,
    cached_heating_catalog_summary_from_d1,
    clear_heating_optimizer_runtime_caches,
    read_heating_commercial_candidate_catalog_from_d1,
    read_heating_public_catalog_from_d1,
    read_heating_public_products_from_d1,
    seed_heating_branch_catalog_payload,
    seed_heating_catalog_payload,
    seed_heating_catalog_summary_payload,
    seed_heating_commercial_candidate_catalog_payload,
    seed_heating_public_catalog_payload,
)
from .teo_v4 import build_teo_v4_kernel


BASE_DIR = Path(__file__).resolve().parents[1]
DATA_DIR = BASE_DIR / "data"
ROI_COST_BASIS_PATH = DATA_DIR / "roi-cost-basis.seed.json"
ROI_COST_BASIS_CACHE_SECONDS = 900
ROI_COST_BASIS_RETRY_SECONDS = 30

_roi_cost_basis_lock = asyncio.Lock()
_roi_cost_basis_cached_payload: dict[str, Any] | None = None
_roi_cost_basis_cache_expires_at = 0.0
_roi_cost_basis_retry_after = 0.0

TEO_FLOW_MAX_VERIFICATIONS = 3
TEO_FLOW_COOLDOWN_MS = 1800
TEO_FLOW_LEASE_MS = 30000
_teo_flow_schema_lock = asyncio.Lock()
_teo_flow_schema_ready = False
TEO_FLOW_CREATE_SQL = """
CREATE TABLE IF NOT EXISTS teo_verification_runs (
    run_id TEXT PRIMARY KEY,
    status TEXT NOT NULL DEFAULT 'ready',
    planned_verifications INTEGER NOT NULL DEFAULT 1,
    verified_count INTEGER NOT NULL DEFAULT 0,
    next_allowed_at_ms INTEGER NOT NULL DEFAULT 0,
    in_flight INTEGER NOT NULL DEFAULT 0,
    lease_token TEXT,
    lease_expires_at_ms INTEGER NOT NULL DEFAULT 0,
    updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
)
"""

app = FastAPI(
    title="LaCurent TEO Private",
    version="1.0.0",
    docs_url=None,
    redoc_url=None,
    openapi_url=None,
)


@app.get("/health")
async def health() -> dict[str, str]:
    return {"status": "ok", "service": "lacurent-teo-private"}


`;

const serviceSource = [
  serviceHeader,
  formBlock,
  infraBlock,
  apiBlock,
].join("\n");

fs.rmSync(outputDir, { recursive:true, force:true });
fs.mkdirSync(targetAppDir, { recursive:true });

fs.writeFileSync(path.join(targetAppDir, "teo_service.py"), serviceSource, "utf8");
const modules = copyModuleClosure(serviceSource);
copyDirectory(path.join(commercialRoot, "data"), path.join(srcDir, "data"));

fs.copyFileSync(
  path.join(configRoot, "worker.py"),
  path.join(srcDir, "worker.py"),
);
fs.copyFileSync(
  path.join(configRoot, "pyproject.toml"),
  path.join(outputDir, "pyproject.toml"),
);
fs.copyFileSync(
  path.join(configRoot, "wrangler.toml"),
  path.join(outputDir, "wrangler.toml"),
);

const pythonBytes = fs.readdirSync(targetAppDir, { recursive:true, withFileTypes:true })
  .filter(entry => entry.isFile() && entry.name.endsWith(".py"))
  .reduce((total, entry) => {
    const full = path.join(entry.parentPath || entry.path, entry.name);
    return total + fs.statSync(full).size;
  }, 0);

console.log(JSON.stringify({
  status:"prepared",
  output:".wrangler/teo-worker",
  workerName:"lacurent-teo-private",
  executionMode:"private_sharded_python_worker_slim",
  pythonModuleCount:modules.length + 1,
  pythonSourceBytes:pythonBytes,
  copiedModules:modules,
  excludedPublicRuntime:["static","templates","app.main","app.account","app.impact"],
}, null, 2));
