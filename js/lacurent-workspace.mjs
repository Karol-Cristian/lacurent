import {
  BUILDING_VISUAL_TYPES,
  buildSimpleInputContract,
  collectFormValues,
  applyValuesToForm,
  createScenario,
  deriveGeometry,
  humanDiagnostic,
  loadWorkspaceState,
  readinessIssues,
  resolveBuildingVisualType,
  saveWorkspaceState
} from "./lacurent-contract.mjs";
import {
  loadClimateGeography,
  localityOptions,
  mapClientPointToClimateZone,
  renderClimateLegend,
  renderClimateMap,
  resolveLocalityClimate,
  setClimateMapInteractionState
} from "./lacurent-geography.mjs";

const form = document.getElementById("workspaceForm");
const nav = document.getElementById("workspaceNav");
const resultsGrid = document.getElementById("resultsGrid");
const blockerPanel = document.getElementById("blockerPanel");
const annexPreview = document.getElementById("technicalAnnexPreview");
const calculationState = document.getElementById("calculationState");
const serviceEnergyChart = document.getElementById("serviceEnergyChart");
const monthlyEnergyChart = document.getElementById("monthlyEnergyChart");
let state = loadWorkspaceState();
let geography = null;
let selectedMapZone = null;
let selectedMapPoint = null;
let hoveredMapZone = null;

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
  return Number.isFinite(value)
    ? `${value.toLocaleString("ro-RO", { maximumFractionDigits: 1 })}${unit ? ` ${unit}` : ""}`
    : "-";
}

function humanDiagnosticDetail(diagnostic) {
  const messages = {
    PYTHON_ENGINE_SERVICE_UNCONFIGURED: "Rezultatele reale vor fi afisate dupa configurarea serviciului Python in productie.",
    PYTHON_ENGINE_SERVICE_UNAVAILABLE: "Rezultatele reale vor fi afisate cand serviciul de calcul raspunde. Nu se foloseste calcul de rezerva.",
    PYTHON_ENGINE_SERVICE_TIMEOUT: "Calculul poate fi reluat fara a pierde datele introduse.",
    SOLAR_GAIN_QSKY_AND_ELEMENT_INPUTS_REQUIRED: "Domeniul solar ramane incomplet si nu este tratat ca zero.",
    SHARED_GENERATOR_ALLOCATION_REQUIRED: "Generatorul comun trebuie repartizat intre incalzire si ACM ca date tehnice."
  };
  return messages[diagnostic?.code] || "Vezi detaliile tehnice pentru codul complet.";
}

function escapeHtml(value) {
  return String(value ?? "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll("\"", "&quot;");
}

function field(name) {
  return form.querySelector(`[name="${CSS.escape(name)}"]`);
}

function setActiveSection(section) {
  document.querySelectorAll(".workspace-section").forEach((item) => {
    item.classList.toggle("active", item.dataset.section === section);
  });
  nav.querySelectorAll("button").forEach((button) => {
    button.classList.toggle("active", button.dataset.sectionTarget === section);
  });
}

function setEnvelopePanel(panel) {
  document.querySelectorAll("[data-envelope-target]").forEach((button) => {
    button.classList.toggle("active", button.dataset.envelopeTarget === panel);
  });
  document.querySelectorAll("[data-envelope-panel]").forEach((item) => {
    item.classList.toggle("active", item.dataset.envelopePanel === panel);
  });
}

function updateCalculationState(kind, title, message) {
  calculationState.dataset.state = kind;
  calculationState.querySelector("strong").textContent = title;
  calculationState.querySelector("span").textContent = message;
}

function updateBuildingSelection(values) {
  const building = resolveBuildingVisualType(values.building || {});
  const silhouette = document.getElementById("selectedBuildingSilhouette");
  const label = document.getElementById("selectedBuildingLabel");
  const note = document.getElementById("selectedBuildingNote");
  const preset = BUILDING_VISUAL_TYPES[building.visualType];
  silhouette.className = `building-silhouette ${preset?.silhouette || "p1"} large`;
  label.textContent = preset?.label || "Selecteaza tipul cladirii";
  note.textContent = preset?.levels
    ? `Niveluri propuse de tipul vizual: ${preset.levels}. Le poti corecta daca masuratoarea spune altceva.`
    : "Completeaza numarul real de niveluri incalzite.";
}

function syncLevelsFromVisual(radio) {
  const levelsField = field("building.levels");
  if (!radio?.checked || !levelsField) return;
  const visualLevels = radio.dataset.levels;
  if (!visualLevels) return;
  if (!levelsField.value || levelsField.dataset.autoFromVisual === "true") {
    levelsField.value = visualLevels;
    levelsField.dataset.autoFromVisual = "true";
  }
}

function updateDerived(values) {
  const geometry = deriveGeometry(values);
  document.getElementById("derivedFootprint").textContent = numberText(geometry.footprintM2, "m2");
  document.getElementById("derivedUsefulArea").textContent = numberText(geometry.usefulAreaM2, "m2");
  document.getElementById("derivedVolume").textContent = numberText(geometry.heatedVolumeM3, "m3");
  updateBuildingSelection(values);
}

function updateReadiness(values) {
  const issues = readinessIssues(values);
  const total = 10;
  const percent = Math.max(0, Math.round(((total - Math.min(issues.length, total)) / total) * 100));
  document.getElementById("readinessPercent").textContent = `${percent}%`;
  document.getElementById("readinessSummary").textContent = issues.length
    ? `${issues.length} elemente necesita atentie.`
    : "Modelul fizic principal este pregatit; serviciul de calcul poate returna limite normative.";
  const issueList = document.getElementById("readinessIssues");
  issueList.innerHTML = issues.slice(0, 4).map((issue) => `
    <button type="button" data-focus-path="${escapeHtml(issue.path)}">${escapeHtml(issue.message)}</button>
  `).join("");
}

function updateSystemFlow(values) {
  const heating = values.systems?.heating || {};
  const dhw = values.systems?.domesticHotWater || {};
  const generatorLabels = {
    condensing_boiler: "Centrala in condensare",
    gas_boiler: "Centrala pe gaz",
    electric_boiler: "Centrala electrica",
    heat_pump: "Pompa de caldura",
    district_heat: "Termoficare",
    biomass_boiler: "Cazan biomasa"
  };
  const carrierLabels = {
    natural_gas: "Gaz natural",
    electricity: "Electricitate",
    district_heat: "Termoficare",
    biomass: "Biomasa"
  };
  document.getElementById("heatingCarrierFlow").textContent = carrierLabels[heating.carrier] || "Purtator";
  document.getElementById("heatingGeneratorFlow").textContent = generatorLabels[heating.generator] || "Generator";
  document.querySelector(".system-card.featured")?.classList.toggle(
    "shared-active",
    heating.sameGeneratorAsDhw === true && dhw.enabled === true
  );
}

function updateDocuments(result) {
  const hasResult = Boolean(result);
  const hasBlocking = (result?.diagnostics || []).some((item) => item.severity === "blocking");
  document.getElementById("cpeReadinessStatus").textContent = hasResult && !hasBlocking ? "Partial pregatit" : "Incomplet";
  document.getElementById("professionalReportStatus").textContent = hasResult && !hasBlocking ? "Disponibil" : hasResult ? "Incomplet" : "In asteptare";
  document.getElementById("technicalAnnexStatus").textContent = hasResult ? "Disponibil" : "In asteptare";
  document.getElementById("documentReadinessList").innerHTML = `
    <article><strong>Identificare cladire</strong><span>${field("project.name")?.value ? "Disponibila" : "Lipseste numele proiectului"}</span></article>
    <article><strong>Rezultate calcul</strong><span>${hasResult ? (hasBlocking ? "Cu limitari" : "Disponibile") : "Necalculate"}</span></article>
    <article><strong>Layout legal CPE</strong><span>Necesita certificare oficiala separata</span></article>
  `;
}

function populateLocalities() {
  const select = document.getElementById("localitySelect");
  const current = select.value;
  const options = localityOptions(geography.oracle);
  select.innerHTML = `<option value="">Alege localitatea</option>` + options.map((item) => (
    `<option value="${escapeHtml(item.value)}">${escapeHtml(item.label)}</option>`
  )).join("");
  if (current) select.value = current;
}

function updateLocation(values) {
  const summary = document.getElementById("climateSummary");
  const technical = document.getElementById("climateTechnical");
  const status = document.getElementById("mapStatus");
  if (!geography) {
    summary.innerHTML = "<span>Harta indisponibila</span><strong>Date geografice neincarcate</strong><small>Calculul nu foloseste valori geografice false.</small>";
    return;
  }
  const resolved = resolveLocalityClimate(values.location?.locality, geography);
  const selectedZone = resolved?.zone || selectedMapZone;
  renderClimateMap(document.getElementById("climateMap"), geography, resolved || selectedMapPoint || { zone: selectedZone });
  renderClimateLegend(document.getElementById("climateLegend"), geography, selectedZone);
  status.textContent = geography.validation.ok
    ? "Harta climatica incarcata."
    : "Harta climatica are probleme de validare.";
  if (!resolved) {
    summary.innerHTML = selectedMapZone
      ? `<span>Zona selectata pe harta</span><strong>Zona climatica ${escapeHtml(selectedMapZone)}</strong><small>Temperatura exterioara de calcul: ${escapeHtml(selectedMapPoint?.designTemperatureC ?? "-")} °C. Nu a fost selectata o statie climatica. Alege localitatea pentru profilul climatic canonic.</small>`
      : "<span>Selecteaza localitatea</span><strong>Date climatice nealese</strong><small>Harta poate fi folosita fara rezultat inventat.</small>";
    const mapCoordinates = selectedMapPoint && Number.isFinite(selectedMapPoint.lat) && Number.isFinite(selectedMapPoint.lon)
      ? `${selectedMapPoint.lat.toFixed(4)}, ${selectedMapPoint.lon.toFixed(4)}`
      : "Zona selectata fara coordonate de punct";
    technical.innerHTML = `<article><strong>Sursa zona</strong><span>${escapeHtml(geography.provenance?.normative_source?.figure || "Figura normativa")}</span></article><article><strong>Selectie harta</strong><span>${escapeHtml(mapCoordinates)}</span></article><article><strong>Vant</strong><span>Strat neincarcat; nu se deriva din clima.</span></article>`;
    return;
  }
  summary.innerHTML = `
    <span>${escapeHtml(resolved.label)}</span>
    <strong>Zona ${escapeHtml(resolved.zone)}</strong>
    <small>Temperatura exterioara de calcul: ${escapeHtml(resolved.designTemperatureC)} °C. Statie climatica: ${escapeHtml(resolved.station)}. Date disponibile pentru fluxul climatic canonic.</small>
  `;
  technical.innerHTML = `
    <article><strong>Sursa zona</strong><span>${escapeHtml(geography.provenance?.normative_source?.figure)}</span></article>
    <article><strong>Geometrie</strong><span>${escapeHtml(geography.provenance?.geometry_source?.accuracy)}</span></article>
    <article><strong>Coordonate selectie</strong><span>${resolved.lat}, ${resolved.lon}</span></article>
    <article><strong>Relatie furnizor climatic</strong><span>Zona geografica informeaza localizarea; profilurile lunare vin din Climate Provider.</span></article>
  `;
}

function annualDeliveredEnergy(result) {
  const annual = result?.chapter3?.annual || {};
  const values = [
    annual.heatingInputKWh,
    annual.coolingInputKWh,
    annual.dhwInputKWh,
    annual.ventilationAuxiliaryKWh
  ].filter(Number.isFinite);
  return values.length ? values.reduce((sum, value) => sum + value, 0) : undefined;
}

function renderServiceChart(result) {
  const annual = result?.chapter3?.annual || {};
  const services = [
    ["Incalzire", annual.heatingInputKWh],
    ["Racire", annual.coolingInputKWh],
    ["ACM", annual.dhwInputKWh],
    ["Auxiliare", annual.ventilationAuxiliaryKWh],
    ["PV", result?.chapter4?.annualProductionKWh]
  ].filter(([, value]) => Number.isFinite(value));
  if (!services.length) {
    serviceEnergyChart.className = "bar-chart empty";
    serviceEnergyChart.textContent = "Nu exista rezultat calculat.";
    return;
  }
  const max = Math.max(...services.map(([, value]) => value), 1);
  serviceEnergyChart.className = "bar-chart";
  serviceEnergyChart.innerHTML = services.map(([label, value]) => `
    <div class="bar-row"><span>${label}</span><i style="width:${Math.max(4, (value / max) * 100)}%"></i><strong>${numberText(value, "kWh/an")}</strong></div>
  `).join("");
}

function renderMonthlyChart(result) {
  const monthly = result?.chapter2?.monthly || [];
  if (!monthly.length) {
    monthlyEnergyChart.className = "monthly-chart empty";
    monthlyEnergyChart.textContent = "Nu exista rezultat calculat.";
    return;
  }
  const max = Math.max(...monthly.flatMap((item) => [item.qHndKWh || 0, item.qCndKWh || 0]), 1);
  monthlyEnergyChart.className = "monthly-chart";
  monthlyEnergyChart.innerHTML = monthly.map((item) => `
    <div class="month-column">
      <i class="heat" style="height:${Math.max(2, ((item.qHndKWh || 0) / max) * 100)}%"></i>
      <i class="cool" style="height:${Math.max(2, ((item.qCndKWh || 0) / max) * 100)}%"></i>
      <span>${escapeHtml(String(item.month || "").slice(0, 3))}</span>
    </div>
  `).join("");
}

function renderResultCards(result) {
  const chapter2 = result?.chapter2 || {};
  const chapter3 = result?.chapter3 || {};
  const chapter4 = result?.chapter4 || {};
  const totalDelivered = annualDeliveredEnergy(result);
  resultsGrid.innerHTML = `
    <article class="result-card hero-metric"><span>Energie livrata</span><strong>${numberText(totalDelivered, "kWh/an")}</strong><small>Total servicii disponibile.</small></article>
    <article class="result-card"><span>Incalzire</span><strong>${numberText(chapter3.annual?.heatingInputKWh ?? chapter2.annual?.qHndKWh, "kWh/an")}</strong><small>Cerere si sistem unde sunt calculate.</small></article>
    <article class="result-card"><span>Racire</span><strong>${numberText(chapter3.annual?.coolingInputKWh ?? chapter2.annual?.qCndKWh, "kWh/an")}</strong><small>Include EER si capacitate daca exista.</small></article>
    <article class="result-card"><span>ACM</span><strong>${numberText(chapter3.annual?.dhwInputKWh, "kWh/an")}</strong><small>Apa calda menajera.</small></article>
    <article class="result-card"><span>PV</span><strong>${numberText(chapter4.annualProductionKWh, "kWh/an")}</strong><small>Productie fotovoltaica suportata.</small></article>
    <article class="result-card"><span>Necesar racire neacoperit</span><strong>${numberText(chapter3.annual?.coolingUnmetLoadKWh, "kWh/an")}</strong><small>Raportat explicit.</small></article>
    <article class="result-card"><span>Purtatori</span><strong>${Object.keys(result?.energyCarriers || {}).length || "-"}</strong><small>Agregare din componente fizice.</small></article>
    <article class="result-card"><span>Motor calcul</span><strong>${escapeHtml(result?.engine || "necunoscut")}</strong><small>${escapeHtml(result?.engineVersion || "versiune indisponibila")}</small></article>
  `;
}

function renderBlocker(result) {
  const diagnostics = result?.diagnostics || [];
  const blocking = diagnostics.find((item) => item.severity === "blocking") || diagnostics[0];
  blockerPanel.hidden = !blocking;
  blockerPanel.innerHTML = blocking
    ? `<strong>${escapeHtml(humanDiagnostic(blocking))}</strong><span>${escapeHtml(humanDiagnosticDetail(blocking))}</span><details><summary>Cod tehnic</summary><code>${escapeHtml(blocking.code || "")}</code><small>${escapeHtml(blocking.message || "")}</small></details>`
    : "";
  return blocking;
}

function renderScenarioComparison(result) {
  const body = document.getElementById("scenarioComparisonBody");
  const currentDelivered = annualDeliveredEnergy(result);
  const scenario = state.scenarios.at(-1);
  body.innerHTML = `
    <tr><td>Energie livrata</td><td>${numberText(currentDelivered, "kWh/an")}</td><td>-</td><td>${scenario ? "Calculeaza scenariul pentru comparatie" : "Adauga scenariu"}</td></tr>
    <tr><td>PV</td><td>${numberText(result?.chapter4?.annualProductionKWh, "kWh/an")}</td><td>-</td><td>Necesita rezultat de scenariu</td></tr>
    <tr><td>Necesar racire neacoperit</td><td>${numberText(result?.chapter3?.annual?.coolingUnmetLoadKWh, "kWh/an")}</td><td>-</td><td>Blocarea nu devine zero.</td></tr>
  `;
}

function renderResult(result) {
  state.lastResult = result;
  state.resultFresh = true;
  const blocking = renderBlocker(result);
  updateCalculationState(
    blocking ? "blocked" : "calculated",
    blocking ? "Calcul blocat" : "Calcul disponibil",
    blocking ? humanDiagnostic(blocking) : "Rezultatele sunt proaspete pentru modelul curent."
  );
  renderResultCards(result);
  renderServiceChart(result);
  renderMonthlyChart(result);
  renderScenarioComparison(result);
  updateDocuments(result);
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
    updateCalculationState("stale", "Necesita recalculare", "Ai schimbat modelul dupa ultimul calcul.");
    document.getElementById("professionalReportStatus").textContent = "Necesita recalculare";
  }
}

async function calculate() {
  const values = collectFormValues(form);
  const contract = buildSimpleInputContract(values, { projectId: state.projectId });
  blockerPanel.hidden = false;
  blockerPanel.innerHTML = "<strong>Se ruleaza analiza...</strong><span>Analiza este trimisa catre serviciul de calcul.</span>";
  updateCalculationState("calculating", "Se calculeaza", "Astept raspunsul serviciului de calcul.");
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
        chapter2: { annual: {}, monthly: [] },
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
      chapter2: { annual: {}, monthly: [] },
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
    blockerPanel.innerHTML = `<strong>Salvarea a esuat.</strong><span>${escapeHtml(error.message)}</span>`;
  }
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
      <strong>${escapeHtml(scenario.name)}</strong>
      <span>U perete propus: ${numberText(scenario.changes.wallUValueWPerM2K, "W/m2K")}</span>
      <small>Scenariul pastreaza restul modelului neschimbat.</small>
    `;
    list.append(card);
  });
}

function refreshAll({ stale = false } = {}) {
  const values = collectFormValues(form);
  state.values = values;
  updateDerived(values);
  updateReadiness(values);
  updateSystemFlow(values);
  updateLocation(values);
  annexPreview.textContent = JSON.stringify(buildSimpleInputContract(values, { projectId: state.projectId }), null, 2);
  if (stale) markStale();
}

async function bootGeography() {
  const map = document.getElementById("climateMap");
  const status = document.getElementById("mapStatus");
  try {
    geography = await loadClimateGeography();
    selectedMapZone = state.mapSelection?.zone || null;
    selectedMapPoint = state.mapSelection || null;
    populateLocalities();
    applyValuesToForm(form, state.values || {});
    renderClimateMap(map, geography, selectedMapPoint || {});
    renderClimateLegend(document.getElementById("climateLegend"), geography, selectedMapZone);
    status.textContent = geography.validation.ok
      ? "Harta climatica incarcata."
      : "Harta climatica are probleme de validare.";
    map.addEventListener("pointermove", (event) => {
      const hit = mapClientPointToClimateZone(map, geography, event.clientX, event.clientY);
      hoveredMapZone = hit?.zone || null;
      setClimateMapInteractionState(map, { selectedZone: selectedMapZone, hoveredZone: hoveredMapZone });
    });
    map.addEventListener("pointerleave", () => {
      hoveredMapZone = null;
      setClimateMapInteractionState(map, { selectedZone: selectedMapZone });
    });
    map.addEventListener("pointerup", (event) => {
      const hit = mapClientPointToClimateZone(map, geography, event.clientX, event.clientY);
      if (!hit?.zone) return;
      selectedMapZone = hit.zone;
      selectedMapPoint = hit;
      state.mapSelection = hit;
      const locality = field("location.locality");
      if (locality) locality.value = "";
      saveWorkspaceState(state);
      updateLocation(collectFormValues(form));
    });
    map.addEventListener("keydown", (event) => {
      if (event.key !== "Enter" && event.key !== " ") return;
      const zone = event.target.closest?.("[data-zone]")?.dataset.zone;
      if (!zone) return;
      event.preventDefault();
      selectedMapZone = zone;
      selectedMapPoint = { zone, designTemperatureC: geography.provenance?.normative_source?.temperature_c?.[zone] ?? null };
      state.mapSelection = selectedMapPoint;
      const locality = field("location.locality");
      if (locality) locality.value = "";
      saveWorkspaceState(state);
      updateLocation(collectFormValues(form));
    });
  } catch (error) {
    status.textContent = "Harta climatica nu s-a putut incarca.";
    map.innerHTML = "<div class=\"map-empty\">Harta climatica este indisponibila. Nu se folosesc valori geografice aproximative.</div>";
  }
}

function bindEvents() {
  nav.addEventListener("click", (event) => {
    const button = event.target.closest("button[data-section-target]");
    if (!button) return;
    setActiveSection(button.dataset.sectionTarget);
  });
  document.getElementById("readinessIssues").addEventListener("click", (event) => {
    const button = event.target.closest("button[data-focus-path]");
    if (!button) return;
    const section = button.dataset.focusPath.split(".")[0];
    const sectionMap = { location: "location", building: "building", envelope: "envelope", systems: "systems" };
    setActiveSection(sectionMap[section] || "location");
    field(button.dataset.focusPath)?.focus();
  });
  document.querySelectorAll("[data-envelope-target]").forEach((button) => {
    button.addEventListener("click", () => setEnvelopePanel(button.dataset.envelopeTarget));
  });
  document.querySelectorAll("input[name='building.visualType']").forEach((radio) => {
    radio.addEventListener("change", () => {
      syncLevelsFromVisual(radio);
      refreshAll({ stale: true });
    });
  });
  field("building.levels")?.addEventListener("input", () => {
    field("building.levels").dataset.autoFromVisual = "false";
  });
  form.addEventListener("input", (event) => {
    if (event.target.name === "building.visualType") return;
    refreshAll({ stale: true });
  });
  form.addEventListener("change", (event) => {
    if (event.target.name === "building.visualType") return;
    refreshAll({ stale: true });
  });
  document.getElementById("calculateBtn").addEventListener("click", calculate);
  document.getElementById("exportInputBtn").addEventListener("click", downloadInput);
  document.getElementById("saveProjectBtn").addEventListener("click", saveProject);
  document.getElementById("addScenarioBtn").addEventListener("click", () => {
    const values = collectFormValues(form);
    state.values = values;
    state.scenarios.push(createScenario(values, values.scenario || {}));
    updateScenarioList();
    renderScenarioComparison(state.lastResult);
    saveWorkspaceState(state);
  });
}

async function boot() {
  if (state.values) applyValuesToForm(form, state.values);
  await bootGeography();
  bindEvents();
  refreshAll();
  updateScenarioList();
  updateDocuments(state.lastResult);
  if (state.lastResult) {
    renderResultCards(state.lastResult);
    renderServiceChart(state.lastResult);
    renderMonthlyChart(state.lastResult);
    const blocking = renderBlocker(state.lastResult);
    renderScenarioComparison(state.lastResult);
    updateCalculationState(
      blocking ? "blocked" : state.resultFresh ? "calculated" : "stale",
      blocking ? "Calcul blocat" : state.resultFresh ? "Calcul disponibil" : "Necesita recalculare",
      blocking ? humanDiagnostic(blocking) : state.resultFresh ? "Rezultatele sunt proaspete pentru modelul curent." : "Ai schimbat modelul dupa ultimul calcul."
    );
  } else {
    renderResultCards({});
  }
}

boot();
