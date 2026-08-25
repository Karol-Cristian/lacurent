import {
  buildSimpleInputContract,
  collectFormValues,
  applyValuesToForm,
  createScenario,
  deriveGeometry,
  humanDiagnostic,
  loadWorkspaceState,
  readinessIssues,
  saveWorkspaceState
} from "./lacurent-contract.mjs";

const form = document.getElementById("workspaceForm");
const nav = document.getElementById("workspaceNav");
const resultsGrid = document.getElementById("resultsGrid");
const blockerPanel = document.getElementById("blockerPanel");
const annexPreview = document.getElementById("technicalAnnexPreview");
let state = loadWorkspaceState();

function apiBase() {
  const explicitBase = window.LA_CURENT_API_BASE || window.LaCurentConfig?.apiBase;
  if (explicitBase) return String(explicitBase).replace(/\/$/, "");
  const origin = window.location.origin;
  if (!origin || origin === "null" || origin.includes("127.0.0.1") || origin.includes("localhost")) {
    return "http://127.0.0.1:8787";
  }
  return origin.replace(/\/$/, "");
}

function numberText(value, unit = "") {
  return Number.isFinite(value) ? `${value.toLocaleString("ro-RO", { maximumFractionDigits: 1 })}${unit ? ` ${unit}` : ""}` : "-";
}

function setActiveSection(section) {
  document.querySelectorAll(".workspace-section").forEach((item) => {
    item.classList.toggle("active", item.dataset.section === section);
  });
  nav.querySelectorAll("button").forEach((button) => {
    button.classList.toggle("active", button.dataset.sectionTarget === section);
  });
}

function updateDerived(values) {
  const geometry = deriveGeometry(values);
  document.getElementById("derivedFootprint").textContent = numberText(geometry.footprintM2, "m2");
  document.getElementById("derivedVolume").textContent = numberText(geometry.heatedVolumeM3, "m3");
  const climateStatus = document.getElementById("climateStatus");
  climateStatus.textContent = values.location?.locality
    ? `${values.location.locality}: localitatea este pregatita pentru rezolvare climatica prin contract sursa.`
    : "Selecteaza localitatea. Motorul Python primeste numai date climatice sursa, nu valori de umplutura.";
}

function updateReadiness(values) {
  const issues = readinessIssues(values);
  const total = 10;
  const percent = Math.max(0, Math.round(((total - Math.min(issues.length, total)) / total) * 100));
  document.getElementById("readinessPercent").textContent = `${percent}%`;
  document.getElementById("readinessSummary").textContent = issues.length
    ? `${issues.length} elemente necesita atentie.`
    : "Modelul fizic principal este complet; calculul poate cere profiluri lunare sursa.";
}

function updateScenarioList() {
  const list = document.getElementById("scenarioList");
  list.innerHTML = "";
  if (!state.scenarios.length) {
    list.innerHTML = "<p class=\"muted\">Nu exista scenarii. Adauga o interventie ca delta fata de baza.</p>";
    return;
  }
  state.scenarios.forEach((scenario) => {
    const card = document.createElement("article");
    card.innerHTML = `
      <strong>${scenario.name}</strong>
      <span>U perete propus: ${numberText(scenario.changes.wallUValueWPerM2K, "W/m2K")}</span>
      <small>Scenariul pastreaza restul modelului neschimbat.</small>
    `;
    list.append(card);
  });
}

function renderResult(result) {
  state.lastResult = result;
  state.resultFresh = true;
  const diagnostics = result?.diagnostics || [];
  const blocking = diagnostics.find((item) => item.severity === "blocking") || diagnostics[0];
  blockerPanel.hidden = !blocking;
  blockerPanel.innerHTML = blocking
    ? `<strong>${humanDiagnostic(blocking)}</strong><span>${blocking.message || ""}</span><code>${blocking.code || ""}</code>`
    : "";
  const chapter2 = result?.chapter2 || {};
  const chapter3 = result?.chapter3 || {};
  const chapter4 = result?.chapter4 || {};
  resultsGrid.innerHTML = `
    <article class="result-card"><span>Status</span><strong>${result?.status || "necalculat"}</strong><small>Autoritate: ${result?.engine || "python service"}</small></article>
    <article class="result-card"><span>Incalzire utila</span><strong>${numberText(chapter2.annual?.qHndKWh, "kWh/an")}</strong><small>QHnd anual.</small></article>
    <article class="result-card"><span>Racire utila</span><strong>${numberText(chapter2.annual?.qCndKWh, "kWh/an")}</strong><small>QCnd anual.</small></article>
    <article class="result-card"><span>PV</span><strong>${numberText(chapter4.annualProductionKWh, "kWh/an")}</strong><small>Productie fotovoltaica suportata.</small></article>
    <article class="result-card"><span>Incalzire sistem</span><strong>${numberText(chapter3.annual?.heatingInputKWh, "kWh/an")}</strong><small>Energie livrata calculata.</small></article>
    <article class="result-card"><span>Racire sistem</span><strong>${numberText(chapter3.annual?.coolingInputKWh, "kWh/an")}</strong><small>Include capacitate si EER unde exista.</small></article>
    <article class="result-card"><span>ACM</span><strong>${numberText(chapter3.annual?.dhwInputKWh, "kWh/an")}</strong><small>Apa calda menajera.</small></article>
    <article class="result-card"><span>Necesar neacoperit</span><strong>${numberText(chapter3.annual?.coolingUnmetLoadKWh, "kWh/an")}</strong><small>Nu este ascuns ca zero.</small></article>
  `;
  document.getElementById("professionalReportStatus").textContent = blocking ? "Incomplet" : "Disponibil";
  document.getElementById("technicalAnnexStatus").textContent = "Disponibil";
  annexPreview.textContent = JSON.stringify({
    inputContract: buildSimpleInputContract(collectFormValues(form), { projectId: state.projectId }),
    result
  }, null, 2);
  saveWorkspaceState(state);
}

function markStale() {
  state.resultFresh = false;
  saveWorkspaceState(state);
  if (state.lastResult) {
    document.getElementById("professionalReportStatus").textContent = "Necesita recalculare";
  }
}

async function calculate() {
  const values = collectFormValues(form);
  const contract = buildSimpleInputContract(values, { projectId: state.projectId });
  blockerPanel.hidden = false;
  blockerPanel.innerHTML = "<strong>Se trimite catre calculatorul Python...</strong>";
  try {
    const response = await fetch(`${apiBase()}/api/python/calculate`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        ...(window.LaCurentAuth?.token() ? { Authorization: `Bearer ${window.LaCurentAuth.token()}` } : {})
      },
      body: JSON.stringify({ input: contract })
    });
    const result = await response.json();
    if (!response.ok || result.success === false) {
      renderResult({
        schemaVersion: "lacurent_engine_output_v1",
        engine: "python",
        status: "blocked",
        chapter2: { annual: {} },
        chapter3: { annual: {} },
        chapter4: {},
        diagnostics: [result.diagnostic || { code: "PYTHON_ENGINE_SERVICE_UNCONFIGURED", severity: "blocking", message: result.error }]
      });
      return;
    }
    renderResult(result.output || result);
  } catch (error) {
    renderResult({
      schemaVersion: "lacurent_engine_output_v1",
      engine: "python",
      status: "blocked",
      chapter2: { annual: {} },
      chapter3: { annual: {} },
      chapter4: {},
      diagnostics: [{
        code: "PYTHON_ENGINE_SERVICE_UNAVAILABLE",
        severity: "blocking",
        message: error.message
      }]
    });
  }
}

function downloadInput() {
  const contract = buildSimpleInputContract(collectFormValues(form), { projectId: state.projectId });
  const blob = new Blob([JSON.stringify(contract, null, 2)], { type: "application/json" });
  const link = document.createElement("a");
  link.href = URL.createObjectURL(blob);
  link.download = `${contract.project.name || "lacurent"}-input.json`;
  link.click();
  URL.revokeObjectURL(link.href);
}

async function saveProject() {
  const values = collectFormValues(form);
  state.values = values;
  saveWorkspaceState(state);
  if (!window.LaCurentAuth?.token()) {
    blockerPanel.hidden = false;
    blockerPanel.innerHTML = "<strong>Proiect salvat local.</strong><span>Autentifica-te pentru persistenta in cont.</span>";
    return;
  }
  try {
    await window.LaCurentAuth.api("/api/projects/save", {
      projectId: state.projectId,
      name: values.project?.name || "Proiect LaCurent",
      workspace: state
    });
    blockerPanel.hidden = false;
    blockerPanel.innerHTML = "<strong>Proiect salvat in cont.</strong>";
  } catch (error) {
    blockerPanel.hidden = false;
    blockerPanel.innerHTML = `<strong>Salvarea a esuat.</strong><span>${error.message}</span>`;
  }
}

function boot() {
  if (state.values) {
    applyValuesToForm(form, state.values);
  }
  updateDerived(collectFormValues(form));
  updateReadiness(collectFormValues(form));
  updateScenarioList();
  annexPreview.textContent = JSON.stringify(buildSimpleInputContract(collectFormValues(form), { projectId: state.projectId }), null, 2);

  nav.addEventListener("click", (event) => {
    const button = event.target.closest("button[data-section-target]");
    if (!button) return;
    setActiveSection(button.dataset.sectionTarget);
  });
  form.addEventListener("input", () => {
    const values = collectFormValues(form);
    state.values = values;
    updateDerived(values);
    updateReadiness(values);
    annexPreview.textContent = JSON.stringify(buildSimpleInputContract(values, { projectId: state.projectId }), null, 2);
    markStale();
  });
  document.getElementById("calculateBtn").addEventListener("click", calculate);
  document.getElementById("exportInputBtn").addEventListener("click", downloadInput);
  document.getElementById("saveProjectBtn").addEventListener("click", saveProject);
  document.getElementById("addScenarioBtn").addEventListener("click", () => {
    const values = collectFormValues(form);
    state.values = values;
    state.scenarios.push(createScenario(values, values.scenario || {}));
    updateScenarioList();
    saveWorkspaceState(state);
  });
}

boot();
