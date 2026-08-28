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
  clampMapViewBox,
  fullMapViewBox,
  loadClimateGeography,
  localityDisplayLabel,
  localityShortLabel,
  mapClientPointToProjectedPoint,
  mapClientPointToClimateZone,
  mapZoomLevel,
  nearestVisibleLocality,
  projectGeographicPoint,
  renderClimateLegend,
  renderClimateMap,
  resolveLocalityClimate,
  searchLocalities,
  setClimateMapInteractionState,
  zoomMapViewBox
} from "./lacurent-geography.mjs?v=p12e2";

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
let selectedLocality = null;
let mapViewBox = null;
let localityResults = [];
let activeLocalityIndex = -1;
const mapPointers = new Map();
let mapPointerSession = null;
let pinchSession = null;
let lastMapControlPointerAt = 0;

const SECTION_LABELS = Object.freeze({
  overview: "Prezentare",
  location: "Localizare",
  building: "Cladire",
  envelope: "Anvelopa",
  systems: "Instalatii",
  scenarios: "Variante",
  results: "Rezultate",
  documents: "Documente"
});

const SECTION_META = Object.freeze({
  overview: {
    number: "0",
    title: "Prezentare proiect",
    subtitle: "Privire de ansamblu asupra cladirii, modelului si urmatorului pas."
  },
  location: {
    number: "1",
    title: "Localizare",
    subtitle: "Alege localitatea sau selecteaza zona pe harta climatica a Romaniei."
  },
  building: {
    number: "2",
    title: "Cladire",
    subtitle: "Selecteaza tipologia si defineste dimensiunile fizice principale."
  },
  envelope: {
    number: "3",
    title: "Anvelopa",
    subtitle: "Modeleaza elementele fizice care separa interiorul de exterior."
  },
  systems: {
    number: "4",
    title: "Instalatii",
    subtitle: "Configureaza echipamentele reale pentru incalzire, ACM, racire si regenerabile."
  },
  scenarios: {
    number: "5",
    title: "Variante",
    subtitle: "Compara modificari fata de cladirea curenta fara a reconstrui modelul."
  },
  results: {
    number: "6",
    title: "Rezultate",
    subtitle: "Citeste performanta cladirii; detaliile tehnice raman intr-un nivel separat."
  },
  documents: {
    number: "7",
    title: "Documente",
    subtitle: "Pregateste iesirile pentru auditor, beneficiar si anexa tehnica."
  }
});

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
    PYTHON_ENGINE_SERVICE_UNCONFIGURED: "Rezultatele reale vor fi afisate dupa configurarea serviciului de calcul in productie.",
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

function getNested(target, path) {
  return path.split(".").reduce((cursor, part) => cursor?.[part], target);
}

function setHiddenValue(id, value) {
  const item = document.getElementById(id);
  if (item) item.value = value ?? "";
}

function writeLocationHiddenFields(resolved) {
  setHiddenValue("localityValue", resolved?.value);
  setHiddenValue("localityIdValue", resolved?.id || resolved?.value);
  setHiddenValue("localityNameValue", resolved?.name || resolved?.label);
  setHiddenValue("localityCountyValue", resolved?.county);
  setHiddenValue("localityLatValue", resolved?.lat);
  setHiddenValue("localityLonValue", resolved?.lon);
  setHiddenValue("localityClimateZoneValue", resolved?.zone);
  setHiddenValue("localityStationValue", resolved?.stationValue);
}

function collectSynchronizedValues() {
  if (selectedLocality) {
    writeLocationHiddenFields(selectedLocality);
  } else if (selectedMapPoint) {
    setHiddenValue("localityLatValue", selectedMapPoint.lat);
    setHiddenValue("localityLonValue", selectedMapPoint.lon);
    setHiddenValue("localityClimateZoneValue", selectedMapPoint.zone);
  }
  return collectFormValues(form);
}

function selectedLocalityFromValues(values) {
  return resolveLocalityClimate(values.location?.localityId || values.location?.locality, geography)
    || (selectedLocality ? resolveLocalityClimate(selectedLocality.id || selectedLocality.value || selectedLocality.name, geography) : null);
}

function setLocalityFields(locality) {
  const resolved = locality ? resolveLocalityClimate(locality.id || locality.value || locality.name, geography) : null;
  selectedLocality = resolved;
  writeLocationHiddenFields(resolved);
  const search = document.getElementById("localitySearch");
  if (search) search.value = resolved ? localityShortLabel(resolved) : "";
  if (resolved) {
    selectedMapZone = resolved.zone;
    selectedMapPoint = {
      designTemperatureC: resolved.designTemperatureC,
      lat: resolved.lat,
      localityId: resolved.id || resolved.value,
      lon: resolved.lon,
      zone: resolved.zone
    };
    const projected = projectGeographicPoint(geography, resolved.lon, resolved.lat);
    mapViewBox = zoomMapViewBox(geography, fullMapViewBox(geography), 0.32, projected);
    state.mapSelection = selectedMapPoint;
    state.selectedLocalityId = resolved.id || resolved.value;
  } else {
    state.selectedLocalityId = null;
  }
}

function hideLocalityResults() {
  const results = document.getElementById("localityResults");
  if (!results) return;
  results.hidden = true;
  results.innerHTML = "";
  activeLocalityIndex = -1;
  const search = document.getElementById("localitySearch");
  search?.setAttribute("aria-expanded", "false");
  search?.removeAttribute("aria-activedescendant");
}

function renderLocalityResults(query) {
  const results = document.getElementById("localityResults");
  const search = document.getElementById("localitySearch");
  if (!results || !geography?.localities) return;
  localityResults = searchLocalities(geography.localities, query, { limit: 14 });
  if (!localityResults.length) {
    results.hidden = false;
    results.innerHTML = "<div class=\"locality-no-results\">Nu am gasit localitati pentru cautarea introdusa.</div>";
    search?.setAttribute("aria-expanded", "true");
    return;
  }
  results.hidden = false;
  results.innerHTML = localityResults.map((locality, index) => `
    <button type="button" class="locality-option${index === activeLocalityIndex ? " active" : ""}" role="option" id="locality-option-${index}" data-locality-id="${escapeHtml(locality.id)}" aria-selected="${index === activeLocalityIndex ? "true" : "false"}">
      <strong>${escapeHtml(locality.name)}</strong>
      <em>${escapeHtml(locality.countyMnemonic || locality.county)}</em>
      <span>${escapeHtml(locality.localityType)}${locality.uatName && locality.uatName !== locality.name ? `, UAT ${escapeHtml(locality.uatName)}` : ""} - ${escapeHtml(locality.county)}</span>
    </button>
  `).join("");
  search?.setAttribute("aria-expanded", "true");
  if (activeLocalityIndex >= 0) search?.setAttribute("aria-activedescendant", `locality-option-${activeLocalityIndex}`);
}

function selectLocality(locality, { stale = true } = {}) {
  if (!locality) return;
  setLocalityFields(locality);
  hideLocalityResults();
  const countySelect = document.getElementById("countySelect");
  const countyLocalitySelect = document.getElementById("countyLocalitySelect");
  if (countySelect && selectedLocality?.county) countySelect.value = selectedLocality.county;
  populateCountyLocalities(selectedLocality?.county, selectedLocality?.id || selectedLocality?.value);
  state.values = collectSynchronizedValues();
  saveWorkspaceState(state);
  refreshAll({ stale });
  state.values = collectSynchronizedValues();
  saveWorkspaceState(state);
}

function selectMapPoint(hit) {
  selectedMapZone = hit.zone;
  selectedMapPoint = hit;
  selectedLocality = null;
  state.mapSelection = hit;
  state.selectedLocalityId = null;
  setLocalityFields(null);
  setHiddenValue("localityLatValue", hit.lat);
  setHiddenValue("localityLonValue", hit.lon);
  setHiddenValue("localityClimateZoneValue", hit.zone);
  state.values = collectSynchronizedValues();
  saveWorkspaceState(state);
  updateLocation(state.values);
  state.values = collectSynchronizedValues();
  saveWorkspaceState(state);
  updateOverview(state.values);
}

function setActiveSection(section) {
  document.querySelectorAll(".workspace-section").forEach((item) => {
    item.classList.toggle("active", item.dataset.section === section);
  });
  nav.querySelectorAll("button").forEach((button) => {
    button.classList.toggle("active", button.dataset.sectionTarget === section);
    button.toggleAttribute("aria-current", button.dataset.sectionTarget === section);
  });
  const meta = SECTION_META[section] || SECTION_META.overview;
  const number = document.getElementById("workspaceStepNumber");
  const title = document.getElementById("workspaceStepTitle");
  const subtitle = document.getElementById("workspaceStepSubtitle");
  const eyebrow = document.getElementById("workspaceStepEyebrow");
  if (number) number.textContent = meta.number;
  if (title) title.textContent = meta.title;
  if (subtitle) subtitle.textContent = meta.subtitle;
  if (eyebrow) eyebrow.textContent = "PROJECT";
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
  document.getElementById("topbarReadiness").textContent = `${percent}% complet`;
  document.getElementById("readinessSummary").textContent = issues.length
    ? `${issues.length} elemente necesita atentie.`
    : "Modelul fizic principal este pregatit; serviciul de calcul poate returna limite normative.";
  const issueList = document.getElementById("readinessIssues");
  issueList.innerHTML = issues.slice(0, 4).map((issue) => `
    <button type="button" data-focus-path="${escapeHtml(issue.path)}">${escapeHtml(issue.message)}</button>
  `).join("");
}

function updateOverview(values) {
  const issues = readinessIssues(values);
  const total = 10;
  const percent = Math.max(0, Math.round(((total - Math.min(issues.length, total)) / total) * 100));
  const geometry = deriveGeometry(values);
  const visual = resolveBuildingVisualType(values.building || {});
  const locality = selectedLocalityFromValues(values);
  const selectedZone = locality?.zone || selectedMapZone || values.location?.climateZone;
  const blocking = (state.lastResult?.diagnostics || []).some((item) => item.severity === "blocking");
  const calculationLabel = !state.lastResult
    ? "Necalculat"
    : blocking
      ? "Blocat"
      : state.resultFresh
        ? "Calculat"
        : "Necesita recalculare";
  const setText = (id, text) => {
    const item = document.getElementById(id);
    if (item) item.textContent = text;
  };
  setText("overviewProjectName", values.project?.name || "Proiect LaCurent");
  setText("overviewSubtitle", issues.length
    ? "Continua cu datele fizice lipsa. LaCurent pastreaza calculul si diagnosticele in fundal."
    : "Modelul principal este pregatit; calculul poate confirma domeniile suportate si limitele normative.");
  setText("overviewReadiness", `${percent}%`);
  setText("overviewStatusText", issues.length ? `${issues.length} elemente necesita atentie.` : "Model pregatit pentru calcul.");
  setText("overviewCalculation", calculationLabel);
  setText("overviewBuilding", visual.label || "Tip neales");
  setText("overviewGeometry", [
    numberText(geometry.usefulAreaM2, "m2 utili"),
    numberText(geometry.heatedVolumeM3, "m3 incalziti")
  ].filter((item) => item !== "-").join(" / ") || "Dimensiunile nu sunt complete.");
  setText("overviewLocation", locality ? localityDisplayLabel(locality) : selectedZone ? `Punct pe harta - zona ${selectedZone}` : "Neselectata");
  setText("overviewClimate", selectedZone
    ? `Zona climatica ${selectedZone}${locality?.station ? ` / statie ${locality.station}` : ""}`
    : "Zona climatica apare dupa localizare sau selectie pe harta.");
  setText("overviewEnvelope", issues.some((issue) => issue.path.startsWith("envelope.")) ? "Incompleta" : "Definita");
  setText("overviewSystems", issues.some((issue) => issue.path.startsWith("systems.")) ? "Necesita date" : "Configurate");
  const issueList = document.getElementById("overviewIssues");
  if (!issueList) return;
  issueList.innerHTML = issues.length
    ? issues.slice(0, 5).map((issue) => `
      <button type="button" data-focus-path="${escapeHtml(issue.path)}">
        <strong>${escapeHtml(issue.message)}</strong>
        <span>${escapeHtml(SECTION_LABELS[issue.path.split(".")[0]] || "Completeaza")}</span>
      </button>
    `).join("")
    : "<article><strong>Modelul este coerent pentru calcul.</strong><span>Rezultatul final poate include in continuare limite normative explicite.</span></article>";
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

function populateCounties() {
  const select = document.getElementById("countySelect");
  if (!select || !geography?.localities) return;
  const current = select.value;
  select.innerHTML = `<option value="">Alege judetul</option>` + geography.localities.counties.map((county) => (
    `<option value="${escapeHtml(county.name)}">${escapeHtml(county.name)} (${escapeHtml(county.mnemonic)})</option>`
  )).join("");
  if (current) select.value = current;
}

function populateCountyLocalities(countyName, selectedId = "") {
  const select = document.getElementById("countyLocalitySelect");
  if (!select) return;
  const localities = countyName && geography?.localities?.byCounty?.get(countyName) || [];
  select.disabled = !localities.length;
  select.innerHTML = `<option value="">Alege localitatea</option>` + localities.map((locality) => (
    `<option value="${escapeHtml(locality.id)}">${escapeHtml(locality.name)} - ${escapeHtml(locality.localityType)}${locality.uatName !== locality.name ? `, UAT ${escapeHtml(locality.uatName)}` : ""}</option>`
  )).join("");
  if (selectedId) select.value = selectedId;
}

function updateLocation(values) {
  const summary = document.getElementById("climateSummary");
  const technical = document.getElementById("climateTechnical");
  const status = document.getElementById("mapStatus");
  if (!geography) {
    summary.innerHTML = "<span>Harta indisponibila</span><strong>Date geografice neincarcate</strong><small>Calculul nu foloseste valori geografice false.</small>";
    return;
  }
  const resolved = selectedLocalityFromValues(values);
  selectedLocality = resolved;
  if (resolved) writeLocationHiddenFields(resolved);
  const selectedZone = resolved?.zone || selectedMapZone;
  renderClimateMap(document.getElementById("climateMap"), geography, {
    ...(resolved || selectedMapPoint || { zone: selectedZone }),
    localityId: resolved?.id || resolved?.value || selectedMapPoint?.localityId,
    viewBox: mapViewBox || fullMapViewBox(geography)
  });
  renderClimateLegend(document.getElementById("climateLegend"), geography, selectedZone);
  status.textContent = geography.validation.ok
    ? `Harta climatica incarcata. ${geography.localities?.validation?.localityCount || 0} localitati disponibile. Zoom ${mapZoomLevel(geography, mapViewBox || fullMapViewBox(geography)).toFixed(1)}x.`
    : "Harta climatica are probleme de validare.";
  if (!resolved) {
    summary.innerHTML = selectedMapZone
      ? `<span>Zona selectata pe harta</span><strong>Zona climatica ${escapeHtml(selectedMapZone)}</strong><small>Temperatura exterioara de calcul: ${escapeHtml(selectedMapPoint?.designTemperatureC ?? "-")} °C. Nu a fost selectata o statie climatica. Alege localitatea pentru profilul climatic canonic.</small>`
      : "<span>Selecteaza localitatea</span><strong>Date climatice nealese</strong><small>Harta poate fi folosita fara rezultat inventat.</small>";
    const mapCoordinates = selectedMapPoint && Number.isFinite(selectedMapPoint.lat) && Number.isFinite(selectedMapPoint.lon)
      ? `${selectedMapPoint.lat.toFixed(4)}, ${selectedMapPoint.lon.toFixed(4)}`
      : "Zona selectata fara coordonate de punct";
    technical.innerHTML = `<article><strong>Sursa zona</strong><span>${escapeHtml(geography.provenance?.normative_source?.figure || "Figura normativa")}</span></article><article><strong>Selectie harta</strong><span>${escapeHtml(mapCoordinates)}</span></article><article><strong>Localitati</strong><span>${escapeHtml(geography.localityProvenance?.sourceLayerDate || "data sursa")} / ${escapeHtml(geography.localities?.validation?.localityCount || 0)} puncte active</span></article><article><strong>Vant</strong><span>Strat neincarcat; nu se deriva din clima.</span></article>`;
    return;
  }
  const stationText = resolved.station
    ? `Statie climatica: ${escapeHtml(resolved.station)}. Date disponibile pentru fluxul climatic canonic.`
    : "Nu exista inca o statie climatica directa pentru aceasta localitate; zona geografica este rezolvata, iar profilul lunar necesita regula Climate Provider.";
  summary.innerHTML = `
    <span>${escapeHtml(resolved.label)}</span>
    <strong>Zona ${escapeHtml(resolved.zone)}</strong>
    <small>Temperatura exterioara de calcul: ${escapeHtml(resolved.designTemperatureC)} °C. ${stationText}</small>
  `;
  technical.innerHTML = `
    <article><strong>Sursa zona</strong><span>${escapeHtml(geography.provenance?.normative_source?.figure)}</span></article>
    <article><strong>Geometrie</strong><span>${escapeHtml(geography.provenance?.geometry_source?.accuracy)}</span></article>
    <article><strong>Localitate</strong><span>${escapeHtml(localityDisplayLabel(resolved))}</span></article>
    <article><strong>Coordonate selectie</strong><span>${resolved.lat}, ${resolved.lon}</span></article>
    <article><strong>Identificator</strong><span>${escapeHtml(resolved.id || resolved.value)} / UAT ${escapeHtml(resolved.uatSiruta || "-")}</span></article>
    <article><strong>Relatie furnizor climatic</strong><span>Zona geografica informeaza localizarea; profilurile lunare vin din Climate Provider. ${resolved.station ? "Statie directa rezolvata." : "Statie directa nerezolvata."}</span></article>
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
    <article class="result-card"><span>Purtatori</span><strong>${Object.keys(result?.energyCarriers || {}).length || "-"}</strong><small>Agregare din componente fizice. Identitatea motorului este in detalii tehnice.</small></article>
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
    <tr><td>Energie livrata</td><td>${numberText(currentDelivered, "kWh/an")}</td><td>-</td><td>${scenario ? "Calculeaza varianta pentru comparatie" : "Adauga varianta"}</td></tr>
    <tr><td>PV</td><td>${numberText(result?.chapter4?.annualProductionKWh, "kWh/an")}</td><td>-</td><td>Necesita rezultat de varianta</td></tr>
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
  updateOverview(collectFormValues(form));
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
    updateOverview(collectFormValues(form));
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
    list.innerHTML = "<p class=\"muted\">Nu exista variante. Adauga o interventie ca delta fata de baza.</p>";
    return;
  }
  state.scenarios.forEach((scenario) => {
    const card = document.createElement("article");
    card.innerHTML = `
      <strong>${escapeHtml(scenario.name)}</strong>
      <span>U perete propus: ${numberText(scenario.changes.wallUValueWPerM2K, "W/m2K")}</span>
      <small>Varianta pastreaza restul modelului neschimbat.</small>
    `;
    list.append(card);
  });
}

function refreshAll({ stale = false } = {}) {
  let values = collectSynchronizedValues();
  state.values = values;
  updateLocation(values);
  values = collectSynchronizedValues();
  state.values = values;
  updateDerived(values);
  updateReadiness(values);
  updateSystemFlow(values);
  updateOverview(values);
  annexPreview.textContent = JSON.stringify(buildSimpleInputContract(values, { projectId: state.projectId }), null, 2);
  if (stale) markStale();
}

function pointerDistance(a, b) {
  return Math.hypot(a.clientX - b.clientX, a.clientY - b.clientY);
}

function pointerMidpoint(a, b) {
  return {
    clientX: (a.clientX + b.clientX) / 2,
    clientY: (a.clientY + b.clientY) / 2
  };
}

function selectedMapCenter() {
  if (selectedLocality?.lon && selectedLocality?.lat) {
    return projectGeographicPoint(geography, selectedLocality.lon, selectedLocality.lat);
  }
  if (selectedMapPoint?.lon && selectedMapPoint?.lat) {
    return projectGeographicPoint(geography, selectedMapPoint.lon, selectedMapPoint.lat);
  }
  const current = mapViewBox || fullMapViewBox(geography);
  return { x: current.x + (current.width / 2), y: current.y + (current.height / 2) };
}

function applyMapViewBox(nextViewBox) {
  mapViewBox = clampMapViewBox(geography, nextViewBox);
  state.mapViewBox = mapViewBox;
  saveWorkspaceState(state);
  updateLocation(collectFormValues(form));
}

function handleMapControl(action) {
  try {
    if (!geography) return;
    if (action === "zoom-in") {
      applyMapViewBox(zoomMapViewBox(geography, mapViewBox, 0.72, selectedMapCenter()));
    }
    if (action === "zoom-out") {
      applyMapViewBox(zoomMapViewBox(geography, mapViewBox, 1.28, selectedMapCenter()));
    }
    if (action === "reset") {
      applyMapViewBox(fullMapViewBox(geography));
    }
  } catch (error) {
    const status = document.getElementById("mapStatus");
    if (status) status.textContent = `Control harta indisponibil: ${error.message}`;
  }
}

function mapControlActionFromEvent(event) {
  const target = event.target?.nodeType === 1 ? event.target : event.target?.parentElement;
  const button = target?.closest?.("[data-map-control]");
  return button?.dataset.mapControl || null;
}

function bindMapInteraction(map) {
  map.addEventListener("wheel", (event) => {
    if (!geography) return;
    event.preventDefault();
    const point = mapClientPointToProjectedPoint(map, event.clientX, event.clientY) || selectedMapCenter();
    applyMapViewBox(zoomMapViewBox(geography, mapViewBox, event.deltaY < 0 ? 0.78 : 1.24, point));
  }, { passive: false });

  map.addEventListener("pointerdown", (event) => {
    if (!geography) return;
    map.setPointerCapture?.(event.pointerId);
    mapPointers.set(event.pointerId, { clientX: event.clientX, clientY: event.clientY });
    const current = mapViewBox || fullMapViewBox(geography);
    if (mapPointers.size === 2) {
      const [first, second] = [...mapPointers.values()];
      const midpoint = pointerMidpoint(first, second);
      pinchSession = {
        distance: pointerDistance(first, second),
        startViewBox: current,
        center: mapClientPointToProjectedPoint(map, midpoint.clientX, midpoint.clientY) || selectedMapCenter()
      };
      mapPointerSession = null;
      map.classList.add("dragging");
      return;
    }
    const projected = mapClientPointToProjectedPoint(map, event.clientX, event.clientY);
    const localityHit = projected
      ? nearestVisibleLocality(geography, current, projected.x, projected.y, (projected.viewBox.width / projected.rect.width) * 14)
      : null;
    mapPointerSession = {
      dragged: false,
      pointerId: event.pointerId,
      startClientX: event.clientX,
      startClientY: event.clientY,
      startViewBox: current,
      targetLocalityId: localityHit?.locality?.id || null
    };
    map.classList.add("dragging");
  });

  map.addEventListener("pointermove", (event) => {
    if (!geography) return;
    if (mapPointers.has(event.pointerId)) {
      mapPointers.set(event.pointerId, { clientX: event.clientX, clientY: event.clientY });
    }
    if (pinchSession && mapPointers.size >= 2) {
      const [first, second] = [...mapPointers.values()];
      const distance = pointerDistance(first, second);
      if (distance > 4) {
        applyMapViewBox(zoomMapViewBox(geography, pinchSession.startViewBox, pinchSession.distance / distance, pinchSession.center));
      }
      return;
    }
    if (mapPointerSession?.pointerId === event.pointerId) {
      const dxPx = event.clientX - mapPointerSession.startClientX;
      const dyPx = event.clientY - mapPointerSession.startClientY;
      if (Math.hypot(dxPx, dyPx) > 5) mapPointerSession.dragged = true;
      if (mapPointerSession.dragged) {
        const svg = map.querySelector("svg");
        const rect = svg?.getBoundingClientRect();
        if (rect?.width && rect?.height) {
          applyMapViewBox(clampMapViewBox(geography, {
            ...mapPointerSession.startViewBox,
            x: mapPointerSession.startViewBox.x - ((dxPx / rect.width) * mapPointerSession.startViewBox.width),
            y: mapPointerSession.startViewBox.y - ((dyPx / rect.height) * mapPointerSession.startViewBox.height)
          }));
        }
      }
      return;
    }
    const hit = mapClientPointToClimateZone(map, geography, event.clientX, event.clientY);
    hoveredMapZone = hit?.zone || null;
    setClimateMapInteractionState(map, { hoveredZone: hoveredMapZone, selectedZone: selectedMapZone });
  });

  map.addEventListener("pointerleave", () => {
    if (mapPointerSession || pinchSession) return;
    hoveredMapZone = null;
    setClimateMapInteractionState(map, { selectedZone: selectedMapZone });
  });

  map.addEventListener("pointerup", (event) => {
    const session = mapPointerSession;
    mapPointers.delete(event.pointerId);
    if (mapPointers.size < 2) pinchSession = null;
    map.releasePointerCapture?.(event.pointerId);
    map.classList.remove("dragging");
    if (!geography || !session || session.pointerId !== event.pointerId) {
      mapPointerSession = null;
      return;
    }
    mapPointerSession = null;
    if (session.dragged) return;
    if (session.targetLocalityId) {
      selectLocality(geography.localities.byId.get(session.targetLocalityId));
      return;
    }
    const hit = mapClientPointToClimateZone(map, geography, event.clientX, event.clientY);
    if (hit?.zone) selectMapPoint(hit);
  });

  map.addEventListener("pointercancel", (event) => {
    mapPointers.delete(event.pointerId);
    mapPointerSession = null;
    pinchSession = null;
    map.classList.remove("dragging");
  });

  map.addEventListener("keydown", (event) => {
    if (event.key !== "Enter" && event.key !== " ") return;
    const localityId = event.target.closest?.(".locality-marker")?.dataset.localityId;
    if (localityId) {
      event.preventDefault();
      selectLocality(geography.localities.byId.get(localityId));
      return;
    }
    const zone = event.target.closest?.("[data-zone]")?.dataset.zone;
    if (!zone) return;
    event.preventDefault();
    selectedMapZone = zone;
    selectedMapPoint = { designTemperatureC: geography.provenance?.normative_source?.temperature_c?.[zone] ?? null, zone };
    state.mapSelection = selectedMapPoint;
    setLocalityFields(null);
    saveWorkspaceState(state);
    updateLocation(collectFormValues(form));
  });
}

async function bootGeography() {
  const map = document.getElementById("climateMap");
  const status = document.getElementById("mapStatus");
  try {
    geography = await loadClimateGeography();
    selectedMapZone = state.mapSelection?.zone || null;
    selectedMapPoint = state.mapSelection || null;
    mapViewBox = state.mapViewBox ? clampMapViewBox(geography, state.mapViewBox) : fullMapViewBox(geography);
    populateCounties();
    applyValuesToForm(form, state.values || {});
    setLocalityFields(resolveLocalityClimate(field("location.localityId")?.value || field("location.locality")?.value, geography));
    renderClimateMap(map, geography, {
      ...(selectedLocality || selectedMapPoint || {}),
      localityId: selectedLocality?.id || selectedLocality?.value,
      viewBox: mapViewBox
    });
    renderClimateLegend(document.getElementById("climateLegend"), geography, selectedMapZone);
    status.textContent = geography.validation.ok
      ? `Harta climatica incarcata. ${geography.localities.validation.localityCount} localitati disponibile.`
      : "Harta climatica are probleme de validare.";
    bindMapInteraction(map);
  } catch (error) {
    status.textContent = "Harta climatica nu s-a putut incarca.";
    map.innerHTML = "<div class=\"map-empty\">Harta climatica este indisponibila. Nu se folosesc valori geografice aproximative.</div>";
  }
}

function bindEvents() {
  const search = document.getElementById("localitySearch");
  const results = document.getElementById("localityResults");
  search?.addEventListener("input", () => {
    activeLocalityIndex = -1;
    renderLocalityResults(search.value);
  });
  search?.addEventListener("focus", () => {
    if (search.value.trim().length >= 2) renderLocalityResults(search.value);
  });
  search?.addEventListener("keydown", (event) => {
    if (event.key === "Escape") {
      hideLocalityResults();
      return;
    }
    if (!["ArrowDown", "ArrowUp", "Enter"].includes(event.key)) return;
    if (event.key === "Enter" && activeLocalityIndex >= 0) {
      event.preventDefault();
      selectLocality(localityResults[activeLocalityIndex]);
      return;
    }
    if (!localityResults.length) renderLocalityResults(search.value);
    if (!localityResults.length) return;
    event.preventDefault();
    if (event.key === "ArrowDown") activeLocalityIndex = Math.min(localityResults.length - 1, activeLocalityIndex + 1);
    if (event.key === "ArrowUp") activeLocalityIndex = Math.max(0, activeLocalityIndex - 1);
    renderLocalityResults(search.value);
  });
  results?.addEventListener("click", (event) => {
    const option = event.target.closest("button[data-locality-id]");
    if (!option) return;
    selectLocality(geography.localities.byId.get(option.dataset.localityId));
  });
  document.addEventListener("click", (event) => {
    if (event.target.closest(".locality-selector")) return;
    hideLocalityResults();
  });
  document.getElementById("countySelect")?.addEventListener("change", (event) => {
    populateCountyLocalities(event.target.value);
  });
  document.getElementById("countyLocalitySelect")?.addEventListener("change", (event) => {
    if (!event.target.value) return;
    selectLocality(geography.localities.byId.get(event.target.value));
  });
  const mapControls = document.querySelector(".map-controls");
  mapControls?.addEventListener("pointerup", (event) => {
    const action = mapControlActionFromEvent(event);
    if (!action) return;
    event.preventDefault();
    lastMapControlPointerAt = Date.now();
    handleMapControl(action);
  });
  mapControls?.addEventListener("click", (event) => {
    const action = mapControlActionFromEvent(event);
    if (!action) return;
    if (Date.now() - lastMapControlPointerAt < 250) return;
    handleMapControl(action);
  });
  document.querySelector("[data-lacurent-workspace]")?.addEventListener("click", (event) => {
    const button = event.target.closest("button[data-section-target]");
    if (!button) return;
    setActiveSection(button.dataset.sectionTarget);
  });
  const focusIssue = (event) => {
    const button = event.target.closest("button[data-focus-path]");
    if (!button) return;
    const section = button.dataset.focusPath.split(".")[0];
    const sectionMap = { location: "location", building: "building", envelope: "envelope", systems: "systems" };
    setActiveSection(sectionMap[section] || "location");
    field(button.dataset.focusPath)?.focus();
  };
  document.getElementById("readinessIssues")?.addEventListener("click", focusIssue);
  document.getElementById("overviewIssues")?.addEventListener("click", focusIssue);
  document.getElementById("continueAnalysisBtn")?.addEventListener("click", () => setActiveSection("location"));
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
  setActiveSection("overview");
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
