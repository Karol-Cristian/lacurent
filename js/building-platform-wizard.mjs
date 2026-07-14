import {
  buildBuildingKnowledgePlatformFromAssistedAnswers,
  buildBuildingTechnicalWorkspace
} from "../src/building-platform/index.mjs";

export const BUILDING_PLATFORM_WIZARD_STEPS = Object.freeze([
  {
    stepId: "geometry",
    title: "Geometrie",
    assistedPrompt: "Definește tipul cladirii, localitatea, suprafetele si volumele care devin Building DNA."
  },
  {
    stepId: "envelope",
    title: "Anvelopa",
    assistedPrompt: "Descrie elementele constructive, ariile, orientarea si conditiile la limita."
  },
  {
    stepId: "renovations",
    title: "Renovari",
    assistedPrompt: "Interventiile modifica ansamblurile in modelul canonic, fara arhetipuri rigide."
  },
  {
    stepId: "building_dna",
    title: "Building DNA",
    assistedPrompt: "Verifica tipologia, ansamblurile, materialele, provenienta si confirmarile necesare."
  },
  {
    stepId: "technical_report",
    title: "Raport tehnic",
    assistedPrompt: "Raportul documentar este generat din Building DNA si din motorul Chapter 2 validat."
  },
  {
    stepId: "results",
    title: "Rezultate",
    assistedPrompt: "Afiseaza numai QHnd, QCnd si transferurile validate in Chapter 2."
  }
]);

const YEAR_PERIODS = [
  { period: "before_1960", max: 1959 },
  { period: "1960_1977", min: 1960, max: 1977 },
  { period: "1978_1990", min: 1978, max: 1990 },
  { period: "1991_2005", min: 1991, max: 2005 },
  { period: "after_2005", min: 2006 }
];

export const ASSISTED_WIZARD_DEMO_FIXTURE = Object.freeze({
  fixtureId: "demo_detached_masonry_1985_eps_pvc_bucharest",
  label: "Casa demonstrativa: locuinta individuala 1985, zidarie, EPS, PVC",
  provenance: {
    origin: "demo_fixture",
    confirmationStatus: "unconfirmed_demo",
    editable: true,
    confidence: "medium",
    reference: "P2B.demo.detached_masonry_1985_eps_pvc_bucharest"
  },
  values: Object.freeze({
    building_platform_demo_mode: "1",
    building_platform_demo_fixture_id: "demo_detached_masonry_1985_eps_pvc_bucharest",
    display_name: "Demo tehnic - casa zidarie 1985",
    analysis_purpose: "technical_chapter_2_report",
    building_type: "house",
    city: "Bucharest",
    construction_year: "1985",
    structural_system: "masonry",
    useful_area_m2: "120",
    number_of_floors: "1",
    floor_height_m: "2.6",
    heated_volume_m3: "312",
    building_length_m: "12",
    building_width_m: "10",
    exterior_wall_area_m2: "50",
    roof_area_m2: "120",
    ground_floor_area_m2: "120",
    attic_ceiling_area_m2: "120",
    adjacent_wall_area_m2: "10",
    main_orientation: "south",
    thermal_mass_class: "heavy",
    wall_material: "brick",
    wall_thickness: "30",
    roof_type: "unheated_attic",
    floor_type: "on_ground",
    window_type: "modern_double_glazing",
    window_area_m2: "8",
    window_orientation: "south",
    door_area_m2: "2",
    ventilation_type: "natural",
    ventilation_ach: "0.6",
    airflow_m3h: "216",
    thermal_bridge_mode: "platform_supported_explicit",
    wall_insulation: "10cm",
    wall_insulation_material: "eps",
    wall_insulation_year: "2014",
    roof_insulated: "no",
    roof_insulation_thickness_cm: "0",
    floor_insulated: "no",
    floor_insulation_thickness_cm: "0",
    windows_replaced: "yes",
    window_age_years: "8",
    door_replaced: "unknown"
  })
});

function safeText(value) {
  return String(value ?? "")
    .replace(/[&<>"']/g, character => ({
      "&": "&amp;",
      "<": "&lt;",
      ">": "&gt;",
      "\"": "&quot;",
      "'": "&#39;"
    })[character]);
}

function formatNumber(value, digits = 2) {
  const number = Number(value);
  return Number.isFinite(number) ? number.toFixed(digits) : "--";
}

function setFieldValue(form, name, value) {
  const escapedName = globalThis.CSS?.escape
    ? globalThis.CSS.escape(name)
    : String(name).replace(/["\\]/g, "\\$&");
  const controls = form?.querySelectorAll?.(`[name="${escapedName}"]`) ?? [];
  controls.forEach(control => {
    if (control.type === "checkbox") {
      control.checked = value === control.value || value === "yes" || value === true;
    } else if (control.type !== "file") {
      control.value = value ?? "";
    }
    control.dataset.provenanceOrigin = "demo_fixture";
    control.dataset.confirmationStatus = "unconfirmed_demo";
    control.dataset.editable = "true";
    control.dataset.confidence = ASSISTED_WIZARD_DEMO_FIXTURE.provenance.confidence;
  });
}

function clearFieldProvenance(form) {
  form?.querySelectorAll?.("input,select,textarea")?.forEach(control => {
    delete control.dataset.provenanceOrigin;
    delete control.dataset.confirmationStatus;
    delete control.dataset.editable;
    delete control.dataset.confidence;
  });
}

function dispatchFormRefresh(form) {
  form?.dispatchEvent?.(new Event("change", { bubbles: true }));
  form?.dispatchEvent?.(new Event("input", { bubbles: true }));
}

export function demoModeFromSearch(search = "") {
  return new URLSearchParams(search).get("demo") === "1";
}

export function getAssistedWizardDemoFixture() {
  return {
    ...ASSISTED_WIZARD_DEMO_FIXTURE,
    values: { ...ASSISTED_WIZARD_DEMO_FIXTURE.values },
    provenance: { ...ASSISTED_WIZARD_DEMO_FIXTURE.provenance }
  };
}

export function applyAssistedWizardDemoFixture(form, fixture = ASSISTED_WIZARD_DEMO_FIXTURE) {
  if (!form) return { applied: false };
  form.reset?.();
  clearFieldProvenance(form);
  for (const [name, value] of Object.entries(fixture.values ?? {})) {
    setFieldValue(form, name, value);
  }
  form.dataset.demoMode = "1";
  form.dataset.demoFixtureId = fixture.fixtureId;
  dispatchFormRefresh(form);
  return {
    applied: true,
    fixtureId: fixture.fixtureId,
    fieldCount: Object.keys(fixture.values ?? {}).length
  };
}

export function clearAssistedWizardDemoFixture(form) {
  if (!form) return { cleared: false };
  form.reset?.();
  clearFieldProvenance(form);
  form.dataset.demoMode = "";
  form.dataset.demoFixtureId = "";
  const hiddenDemoMode = form.querySelector?.('[name="building_platform_demo_mode"]');
  const hiddenFixtureId = form.querySelector?.('[name="building_platform_demo_fixture_id"]');
  if (hiddenDemoMode) hiddenDemoMode.value = "";
  if (hiddenFixtureId) hiddenFixtureId.value = "";
  dispatchFormRefresh(form);
  return { cleared: true };
}

function renderTable(headers, rows) {
  const headerHtml = headers.map(header => `<th>${safeText(header.label)}</th>`).join("");
  const rowHtml = rows.map(row => `
    <tr>
      ${headers.map(header => `<td>${safeText(header.value(row))}</td>`).join("")}
    </tr>
  `).join("");
  return `
    <div class="technical-table-wrap">
      <table class="technical-table">
        <thead><tr>${headerHtml}</tr></thead>
        <tbody>${rowHtml}</tbody>
      </table>
    </div>
  `;
}

function renderTechnicalTabs(workspace) {
  return `
    <nav class="technical-workspace-tabs" aria-label="Technical workspace sections">
      ${workspace.tabs.map(tab => `<a href="#p2b-${safeText(tab.tabId)}">${safeText(tab.label)}</a>`).join("")}
    </nav>
  `;
}

function renderAnnualSummary(workspace) {
  return `
    <div class="technical-status-grid p2b-annual-summary">
      <article>
        <span>Annual QHnd</span>
        <strong>${formatNumber(workspace.resultSummary.annualQHnd)} kWh</strong>
        <small>Chapter 2 heating useful demand</small>
      </article>
      <article>
        <span>Annual QCnd</span>
        <strong>${formatNumber(workspace.resultSummary.annualQCnd)} kWh</strong>
        <small>Chapter 2 cooling useful demand</small>
      </article>
      <article>
        <span>Htr</span>
        <strong>${formatNumber(workspace.envelope.htr?.amount)} ${safeText(workspace.envelope.htr?.unit ?? "W/K")}</strong>
        <small>${safeText(workspace.envelope.htr?.origin)}</small>
      </article>
      <article>
        <span>Months</span>
        <strong>${formatNumber(workspace.resultSummary.monthCount, 0)}</strong>
        <small>explicit monthly result set</small>
      </article>
    </div>
  `;
}

function renderAssemblies(workspace) {
  return renderTable([
    { label: "Assembly", value: row => `${row.displayName} (${row.assemblyId})` },
    { label: "Role", value: row => row.role ?? row.assemblyType },
    { label: "R total", value: row => `${formatNumber(row.totalResistance, 4)} ${row.totalResistanceUnit}` },
    { label: "U-value", value: row => `${formatNumber(row.uValue, 4)} ${row.uValueUnit}` },
    { label: "Origin", value: row => row.uValueOrigin },
    { label: "Formula", value: row => row.formulaCode }
  ], workspace.assemblies);
}

function renderMaterials(workspace) {
  return renderTable([
    { label: "Material", value: row => `${row.displayName} (${row.materialId})` },
    { label: "Category", value: row => row.category ?? "--" },
    { label: "Lambda ref", value: row => `${formatNumber(row.referenceLambda, 4)} ${row.referenceLambdaUnit ?? ""}` },
    { label: "Lambda design", value: row => `${formatNumber(row.designLambdaWmK, 4)} W/(m*K)` },
    { label: "Correction", value: row => row.correctionCoefficientCode ?? row.correctionCoefficientA ?? "--" },
    { label: "Origin", value: row => row.provenance?.origin ?? row.lambdaOrigin ?? "--" }
  ], workspace.materials);
}

function renderLayerStacks(workspace) {
  const layers = workspace.assemblies.flatMap(assembly => assembly.layers.map(layer => ({
    ...layer,
    assemblyName: assembly.displayName
  })));
  return renderTable([
    { label: "Assembly", value: row => row.assemblyName },
    { label: "Layer", value: row => `${row.layerId} / ${row.materialName}` },
    { label: "Thickness", value: row => `${formatNumber(row.thicknessM, 3)} m` },
    { label: "Lambda", value: row => `${formatNumber(row.lambdaWmK, 4)} W/(m*K)` },
    { label: "R layer", value: row => `${formatNumber(row.resistanceM2KPerW, 4)} m2*K/W` },
    { label: "Formula", value: row => row.resistanceFormulaCode }
  ], layers);
}

function renderHtrBreakdown(workspace) {
  const rows = [
    ...workspace.envelope.components,
    {
      componentId: "Htr",
      amount: workspace.envelope.htr?.amount,
      unit: workspace.envelope.htr?.unit,
      elementAmount: "--",
      thermalBridgeAmount: "--"
    }
  ];
  return renderTable([
    { label: "Component", value: row => row.componentId },
    { label: "Amount", value: row => `${formatNumber(row.amount, 4)} ${row.unit ?? "W/K"}` },
    { label: "Elements", value: row => Number.isFinite(Number(row.elementAmount)) ? formatNumber(row.elementAmount, 4) : row.elementAmount },
    { label: "Bridges", value: row => Number.isFinite(Number(row.thermalBridgeAmount)) ? formatNumber(row.thermalBridgeAmount, 4) : row.thermalBridgeAmount },
    { label: "Origin", value: row => row.componentId === "Htr" ? workspace.envelope.htr?.origin : "Chapter 2 envelope result" }
  ], rows);
}

function renderMonthlyResults(workspace) {
  return renderTable([
    { label: "Month", value: row => row.month },
    { label: "Qtr H", value: row => `${formatNumber(row.heatingTransmissionKwh)} kWh` },
    { label: "Qve H", value: row => `${formatNumber(row.heatingVentilationKwh)} kWh` },
    { label: "Internal", value: row => `${formatNumber(row.internalGainsKwh)} kWh` },
    { label: "Solar", value: row => `${formatNumber(row.solarGainsKwh)} kWh` },
    { label: "QHnd", value: row => `${formatNumber(row.qHndKwh)} kWh` },
    { label: "QCnd", value: row => `${formatNumber(row.qCndKwh)} kWh` }
  ], workspace.monthly);
}

function renderFormulaViewer(workspace) {
  return renderTable([
    { label: "Formula", value: row => row.formulaId },
    { label: "Name", value: row => row.formulaName },
    { label: "Inputs", value: row => row.inputVariables.map(item => `${item.symbol}=${formatNumber(item.value, 4)} ${item.unit ?? ""}`).join("; ") },
    { label: "Result", value: row => `${row.resultSymbol}=${formatNumber(row.resultValue, 4)} ${row.resultUnit ?? ""}` },
    { label: "Origin", value: row => row.origin ?? "--" }
  ], workspace.formulaViews.slice(0, 18));
}

function renderTraceability(workspace) {
  return renderTable([
    { label: "Reference", value: row => row.reference },
    { label: "Chapter", value: row => row.chapter ?? "--" },
    { label: "Source", value: row => row.source },
    { label: "Building DNA", value: row => row.buildingDnaLink }
  ], workspace.traceability);
}

function renderReportChapters(workspace, options = {}) {
  return `
    <div class="technical-report-chapter-list">
      ${workspace.report.chapters.map(chapter => `
        <details class="technical-report-chapter"${options.openReport ? " open" : ""}>
          <summary>${safeText(chapter.title)}</summary>
          <p>${safeText(chapter.summary)}</p>
          <small>${safeText(chapter.chapterId)} · ${safeText(chapter.rows.length)} entries</small>
        </details>
      `).join("")}
    </div>
  `;
}

function formValue(formData, name) {
  return typeof formData?.get === "function" ? formData.get(name) : formData?.[name];
}

function positiveNumber(formData, name) {
  const value = Number(formValue(formData, name));
  return Number.isFinite(value) && value > 0 ? value : undefined;
}

export function constructionPeriodFromYear(yearValue) {
  const year = Number(yearValue);
  if (!Number.isFinite(year)) return "1978_1990";
  return YEAR_PERIODS.find(period => (
    (period.min === undefined || year >= period.min) &&
    (period.max === undefined || year <= period.max)
  ))?.period ?? "1978_1990";
}

export function structuralSystemFromWallMaterial(wallMaterial) {
  if (wallMaterial === "wood") return "timber";
  if (wallMaterial === "concrete") return "reinforced_concrete_frames";
  return "masonry";
}

export function mapWizardAnswersToAssistedAnswers(formData) {
  const isDemoFixture = formValue(formData, "building_platform_demo_mode") === "1";
  const demoFixtureId = formValue(formData, "building_platform_demo_fixture_id") ||
    ASSISTED_WIZARD_DEMO_FIXTURE.fixtureId;
  const buildingType = formValue(formData, "building_type") === "apartment"
    ? "apartment"
    : "detached_house";
  const wallInsulation = formValue(formData, "wall_insulation");
  const windowType = formValue(formData, "window_type");
  const roofType = formValue(formData, "roof_type");
  const floorType = formValue(formData, "floor_type");
  const wallInsulationSelected = wallInsulation &&
    wallInsulation !== "unknown" &&
    wallInsulation !== "Fara";
  const roofInsulated = formValue(formData, "roof_insulated");
  const floorInsulated = formValue(formData, "floor_insulated");
  const usefulFloorAreaM2 = positiveNumber(formData, "useful_area_m2");
  const windowAreaM2 = positiveNumber(formData, "window_area_m2");
  const averageRoomHeightM = positiveNumber(formData, "floor_height_m");
  const numberOfFloors = positiveNumber(formData, "number_of_floors");
  const ventilationAch = positiveNumber(formData, "ventilation_ach");
  const heatedVolumeM3 = positiveNumber(formData, "heated_volume_m3");
  const exteriorWallAreaM2 = positiveNumber(formData, "exterior_wall_area_m2");
  const roofAreaM2 = positiveNumber(formData, "roof_area_m2");
  const groundFloorAreaM2 = positiveNumber(formData, "ground_floor_area_m2");
  const atticCeilingAreaM2 = positiveNumber(formData, "attic_ceiling_area_m2");
  const adjacentWallAreaM2 = positiveNumber(formData, "adjacent_wall_area_m2");
  const doorAreaM2 = positiveNumber(formData, "door_area_m2");
  const explicitStructuralSystem = formValue(formData, "structural_system");
  const windowsReplaced = formValue(formData, "windows_replaced");

  return {
    buildingId: "building-platform-wizard-preview",
    buildingType,
    constructionPeriod: constructionPeriodFromYear(formValue(formData, "construction_year")),
    structuralSystem: explicitStructuralSystem && explicitStructuralSystem !== "unknown"
      ? explicitStructuralSystem
      : structuralSystemFromWallMaterial(formValue(formData, "wall_material")),
    renovations: {
      wallInsulation: wallInsulationSelected ? "eps" : false,
      roofInsulated: roofInsulated === "yes" || roofInsulated === "partial",
      floorInsulated: floorInsulated === "yes" || floorInsulated === "partial",
      windowsReplaced: windowsReplaced === "yes" ||
        (windowsReplaced !== "no" && [
          "modern_double_glazing",
          "triple_glazing"
        ].includes(windowType))
    },
    buildingSpecificParameters: {
      ...(usefulFloorAreaM2 === undefined ? {} : { usefulFloorAreaM2 }),
      ...(windowAreaM2 === undefined ? {} : { windowAreaM2 }),
      ...(averageRoomHeightM === undefined ? {} : { averageRoomHeightM }),
      ...(numberOfFloors === undefined ? {} : { numberOfFloors }),
      ...(ventilationAch === undefined ? {} : { ventilationAch }),
      ...(heatedVolumeM3 === undefined ? {} : { heatedVolumeM3 }),
      ...(exteriorWallAreaM2 === undefined ? {} : { exteriorWallAreaM2 }),
      ...(roofAreaM2 === undefined ? {} : { roofAreaM2 }),
      ...(groundFloorAreaM2 === undefined ? {} : { groundFloorAreaM2 }),
      ...(atticCeilingAreaM2 === undefined ? {} : { atticCeilingAreaM2 }),
      mainOrientation: formValue(formData, "main_orientation") || "unknown",
      windowOrientation: formValue(formData, "window_orientation") || "unknown",
      ventilationType: formValue(formData, "ventilation_type") || "unknown",
      atticContext: roofType === "heated_attic" ? "heated" : "unheated",
      basementContext: floorType === "over_basement" ? "unheated" : "none"
    },
    geometry: {
      ...(exteriorWallAreaM2 === undefined ? {} : { exteriorWallAreaM2 }),
      ...(roofAreaM2 === undefined ? {} : { roofAreaM2 }),
      ...(groundFloorAreaM2 === undefined ? {} : { groundFloorAreaM2 }),
      ...(atticCeilingAreaM2 === undefined ? {} : { atticCeilingAreaM2 }),
      ...(windowAreaM2 === undefined ? {} : { windowAreaM2 }),
      ...(doorAreaM2 === undefined ? {} : { doorAreaM2 }),
      ...(adjacentWallAreaM2 === undefined ? {} : { adjacentWallAreaM2 }),
      ...(usefulFloorAreaM2 === undefined ? {} : { usefulFloorAreaM2 })
    },
    context: {
      attic: roofType === "heated_attic" ? "heated" : "unheated",
      basement: floorType === "over_basement" ? "unheated" : "none"
    },
    location: {
      city: formValue(formData, "city") || null
    },
    source: isDemoFixture ? {
      reference: `P2B.demo.${demoFixtureId}`,
      origin: "demo_fixture",
      fixtureId: demoFixtureId,
      confirmationStatus: "unconfirmed_demo",
      editable: true,
      confidence: "medium"
    } : {
      reference: "building_platform_wizard_answers"
    }
  };
}

export function buildWizardEngineeringPreview(assistedAnswers) {
  const pipeline = buildBuildingKnowledgePlatformFromAssistedAnswers(assistedAnswers);
  const technicalWorkspace = buildBuildingTechnicalWorkspace(pipeline);
  const annualQHnd = pipeline.review?.results?.annualQHnd ?? null;
  const annualQCnd = pipeline.review?.results?.annualQCnd ?? null;
  return {
    ...pipeline,
    technicalWorkspace,
    dependencyTree: pipeline.review?.dependencyTrees?.annualQHnd ?? null,
    summary: {
      annualQHnd,
      annualQCnd
    }
  };
}

export function renderEngineeringModelReview(preview, options = {}) {
  if (preview.status !== "ready") {
    const code = preview.diagnostics?.blockers?.[0]?.code ?? "model_incomplet";
    return `<p class="form-message error">Modelul tehnic nu este gata: ${safeText(code)}</p>`;
  }
  const dna = preview.buildingDna;
  const workspace = preview.technicalWorkspace;
  const openReport = options.openReport === true || dna.source?.origin === "demo_fixture";
  const stages = preview.stages.map(item => `
    <li>
      <strong>${safeText(item.label)}</strong>
      <span>${safeText(item.status)}</span>
    </li>
  `).join("");
  const interventions = preview.review.renovationInterventions.length === 0
    ? "<li>Nu a fost selectata nicio interventie. Propunerea ramane editabila.</li>"
    : preview.review.renovationInterventions.map(item => `
      <li>
        <strong>${safeText(item.interventionType)}</strong>
        <span>${safeText(item.selectedOption)} · ${safeText(item.provenance.origin)}</span>
      </li>
    `).join("");
  const assemblies = preview.review.assemblies.map(assembly => `
    <li>
      <strong>${safeText(assembly.displayName)}</strong>
      <span>Origine: ${safeText(assembly.provenance.origin)}</span>
      <span>Incredere: ${safeText(assembly.provenance.confidence)}</span>
      <span>Straturi: ${safeText(assembly.layerStack.map(layer => layer.materialName).join(" / ") || "valoare directa editabila")}</span>
    </li>
  `).join("");
  const assumptions = dna.assumptions.map(item => `<li>${safeText(item.text)}</li>`).join("");
  const confirmations = dna.missingConfirmations.map(item => `<li>${safeText(item)}</li>`).join("");
  const technicalWorkspaceHtml = workspace?.status === "ready" ? `
    <section class="technical-workspace" id="p2b-technical-workspace">
      <div class="section-heading">
        <span class="small-label">TECHNICAL WORKSPACE</span>
        <h3>Building DNA, Chapter 2 results and technical report</h3>
      </div>
      ${renderTechnicalTabs(workspace)}
      ${renderAnnualSummary(workspace)}
      <div class="technical-workspace-grid">
        <section id="p2b-building" class="technical-workspace-panel">
          <h4>Building</h4>
          <p>${safeText(workspace.buildingSummary.buildingType)} / ${safeText(workspace.buildingSummary.constructionPeriod)} / ${safeText(workspace.buildingSummary.structuralSystem)}</p>
          <p>Typology: ${safeText(workspace.buildingSummary.typologyId)} · Mode: ${safeText(workspace.buildingSummary.userMode)}</p>
        </section>
        <section id="p2b-building_dna" class="technical-workspace-panel">
          <h4>Building DNA</h4>
          <p>Schema: ${safeText(dna.schema)} · Platform: ${safeText(dna.platformVersion)}</p>
          <p>Assumptions: ${safeText(dna.assumptions.length)} · Confirmations: ${safeText(dna.missingConfirmations.length)}</p>
        </section>
        <section id="p2b-chapter_2" class="technical-workspace-panel">
          <h4>Chapter 2 authority</h4>
          <p>Displayed values are read from Building DNA and validated Chapter 2 engine outputs.</p>
          <p>No Chapter 3, final energy, primary energy, CO2, CPE or certificate calculation is generated here.</p>
        </section>
      </div>
      <section id="p2b-assemblies" class="technical-workspace-panel">
        <h4>Assemblies and U-values</h4>
        ${renderAssemblies(workspace)}
      </section>
      <section id="p2b-materials" class="technical-workspace-panel">
        <h4>Materials</h4>
        ${renderMaterials(workspace)}
      </section>
      <section class="technical-workspace-panel">
        <h4>Layer stacks</h4>
        ${renderLayerStacks(workspace)}
      </section>
      <section class="technical-workspace-panel">
        <h4>Htr breakdown</h4>
        ${renderHtrBreakdown(workspace)}
      </section>
      <section id="p2b-results" class="technical-workspace-panel">
        <h4>Monthly QHnd / QCnd</h4>
        ${renderMonthlyResults(workspace)}
      </section>
      <section id="p2b-report" class="technical-workspace-panel">
        <h4>Technical report</h4>
        <div class="technical-report-success" data-technical-report-success>
          Raport tehnic generat din Building DNA si rezultatele Chapter 2 validate.
        </div>
        <p>${safeText(workspace.report.title)} · ${safeText(workspace.report.source)}</p>
        ${renderReportChapters(workspace, { openReport })}
      </section>
      <section id="p2b-traceability" class="technical-workspace-panel">
        <h4>Formula viewer</h4>
        ${renderFormulaViewer(workspace)}
      </section>
      <section class="technical-workspace-panel">
        <h4>Traceability</h4>
        ${renderTraceability(workspace)}
      </section>
    </section>
  ` : `<p class="form-message error">Technical workspace unavailable: ${safeText(workspace?.diagnostics?.blockers?.[0]?.code)}</p>`;
  return `
    <div class="recommendation-detail-card" data-building-platform-review>
      <div>
        <h3>Platforma de cunostinte a cladirii</h3>
        <p>Locuinta: ${safeText(dna.building.buildingType)} / ${safeText(dna.building.constructionPeriod)}</p>
        <p>Incalzire anuala utila: <strong>${preview.summary.annualQHnd?.toFixed(2) ?? "--"} kWh</strong></p>
        <p>Racire anuala utila: <strong>${preview.summary.annualQCnd?.toFixed(2) ?? "--"} kWh</strong></p>
        <p>Rezultatele vin din motorul Chapter 2 validat. Modelul propus ramane editabil si explica fiecare ipoteza.</p>
        <h4>Flux verificabil</h4>
        <ul>${stages}</ul>
        <h4>Interventii identificate</h4>
        <ul>${interventions}</ul>
        <h4>Ansambluri propuse</h4>
        <ul>${assemblies}</ul>
        <h4>Ipoteze afisate</h4>
        <ul>${assumptions}</ul>
        <h4>Confirmari necesare</h4>
        <ul>${confirmations}</ul>
        ${technicalWorkspaceHtml}
      </div>
    </div>
  `;
}

export function generateBuildingPlatformTechnicalReport(root = document, options = {}) {
  const form = root.getElementById?.("houseForm");
  const previewTarget = root.getElementById?.("buildingModelReview");
  if (!form || !previewTarget) {
    return { generated: false, reason: "missing_form_or_preview_target" };
  }
  const answers = mapWizardAnswersToAssistedAnswers(new FormData(form));
  const preview = buildWizardEngineeringPreview(answers);
  previewTarget.innerHTML = renderEngineeringModelReview(preview, {
    openReport: options.openReport === true
  });
  if (options.scrollToReport === true) {
    const report = root.getElementById?.("p2b-report") ?? previewTarget;
    report?.scrollIntoView?.({ behavior: "smooth", block: "start" });
  }
  return {
    generated: preview.status === "ready",
    preview,
    reportOpened: options.openReport === true || preview.buildingDna?.source?.origin === "demo_fixture"
  };
}

function setDemoUiState(root, enabled) {
  const banner = root.getElementById?.("demoModeBanner");
  const resetButton = root.getElementById?.("resetDemoModeBtn");
  if (banner) banner.hidden = !enabled;
  if (resetButton) resetButton.disabled = !enabled;
  root.body?.classList?.toggle("demo-mode-active", enabled);
}

function replaceDemoSearchParam(enabled) {
  if (typeof window === "undefined" || !window.history?.replaceState) return;
  const url = new URL(window.location.href);
  if (enabled) {
    url.searchParams.set("demo", "1");
    url.searchParams.set("new", "1");
  } else {
    url.searchParams.delete("demo");
  }
  window.history.replaceState({}, "", url);
}

function attachDemoControls(root, form) {
  const loadButton = root.getElementById?.("loadDemoModeBtn");
  const blankButton = root.getElementById?.("startBlankProjectBtn");
  const resetButton = root.getElementById?.("resetDemoModeBtn");
  const exitButton = root.getElementById?.("exitDemoModeBtn");

  function loadDemo({ updateUrl = true, scrollToReport = false } = {}) {
    const result = applyAssistedWizardDemoFixture(form);
    setDemoUiState(root, true);
    if (updateUrl) replaceDemoSearchParam(true);
    generateBuildingPlatformTechnicalReport(root, {
      openReport: true,
      scrollToReport
    });
    return result;
  }

  function startBlank({ updateUrl = true } = {}) {
    const result = clearAssistedWizardDemoFixture(form);
    setDemoUiState(root, false);
    if (updateUrl) replaceDemoSearchParam(false);
    const previewTarget = root.getElementById?.("buildingModelReview");
    if (previewTarget) {
      previewTarget.innerHTML = `
        <div class="section-heading">
          <span class="small-label">REVIZUIRE MODEL</span>
          <h2>Building DNA, rezultate Chapter 2 si raportul tehnic vor aparea aici.</h2>
        </div>
        <p>Apasa previzualizare dupa ce completezi datele principale. Vei vedea ansamblurile, materialele, straturile, U-values, Htr, QHnd, QCnd, formulele si trasabilitatea citite din Building DNA si motorul Chapter 2.</p>
      `;
    }
    return result;
  }

  loadButton?.addEventListener("click", () => loadDemo({ scrollToReport: true }));
  resetButton?.addEventListener("click", () => loadDemo({ scrollToReport: true }));
  blankButton?.addEventListener("click", () => startBlank());
  exitButton?.addEventListener("click", () => startBlank());

  return {
    loadDemo,
    startBlank
  };
}

export function attachBuildingPlatformWizard(root = document) {
  const form = root.getElementById?.("houseForm");
  const previewTarget = root.getElementById?.("buildingModelReview");
  const previewButton = root.getElementById?.("buildingModelPreviewBtn");
  if (!form || !previewTarget || !previewButton) {
    return { attached: false };
  }
  const demoControls = attachDemoControls(root, form);
  previewButton.addEventListener("click", () => {
    generateBuildingPlatformTechnicalReport(root, {
      openReport: form.dataset.demoMode === "1",
      scrollToReport: true
    });
  });
  if (typeof window !== "undefined" && demoModeFromSearch(window.location.search)) {
    demoControls.loadDemo({ updateUrl: false, scrollToReport: false });
  } else {
    setDemoUiState(root, false);
  }
  return { attached: true };
}

if (typeof window !== "undefined") {
  window.LaCurentBuildingPlatformWizard = {
    BUILDING_PLATFORM_WIZARD_STEPS,
    ASSISTED_WIZARD_DEMO_FIXTURE,
    applyAssistedWizardDemoFixture,
    attachBuildingPlatformWizard,
    buildWizardEngineeringPreview,
    clearAssistedWizardDemoFixture,
    constructionPeriodFromYear,
    demoModeFromSearch,
    generateBuildingPlatformTechnicalReport,
    getAssistedWizardDemoFixture,
    mapWizardAnswersToAssistedAnswers,
    renderEngineeringModelReview,
    structuralSystemFromWallMaterial
  };
  window.addEventListener("DOMContentLoaded", () => {
    attachBuildingPlatformWizard(document);
  });
}
