import {
  buildBuildingKnowledgePlatformFromAssistedAnswers,
  buildBuildingTechnicalWorkspace
} from "../src/building-platform/index.mjs";

export const BUILDING_PLATFORM_WIZARD_STEPS = Object.freeze([
  {
    stepId: "building_type",
    title: "Ce fel de locuinta ai?",
    assistedPrompt: "Alege casa sau apartament. Modelul tehnic ramane editabil in pasul de verificare."
  },
  {
    stepId: "construction_period",
    title: "Cand a fost construita?",
    assistedPrompt: "Un interval aproximativ este suficient pentru prima propunere."
  },
  {
    stepId: "location",
    title: "Unde este locuinta?",
    assistedPrompt: "Localitatea ajuta la organizarea profilului climatic explicit."
  },
  {
    stepId: "geometry",
    title: "Cat de mare este locuinta?",
    assistedPrompt: "Suprafata, ferestrele si inaltimea camerelor devin parametri editabili."
  },
  {
    stepId: "exterior_walls",
    title: "Din ce sunt peretii exteriori?",
    assistedPrompt: "Alege materialul vizibil si spune daca exista izolatie."
  },
  {
    stepId: "roof_attic",
    title: "Cum este podul sau acoperisul?",
    assistedPrompt: "Pod incalzit, pod neincalzit sau acoperis fara pod."
  },
  {
    stepId: "ground_basement",
    title: "Ce se afla sub locuinta?",
    assistedPrompt: "Sol, subsol sau spatiu incalzit dedesubt."
  },
  {
    stepId: "windows",
    title: "Ce ferestre ai?",
    assistedPrompt: "Tipul si aria aproximativa a ferestrelor raman verificabile."
  },
  {
    stepId: "insulation",
    title: "Ce a fost izolat?",
    assistedPrompt: "Interventiile modifica modelul propus, nu creeaza un arhetip separat."
  },
  {
    stepId: "ventilation",
    title: "Cum se ventileaza locuinta?",
    assistedPrompt: "Raspunsurile raman parametri expliciti, editabili ulterior."
  },
  {
    stepId: "engineering_review",
    title: "Verifica modelul tehnic propus",
    assistedPrompt: "Vezi propunerea, ipotezele si ce trebuie confirmat."
  },
  {
    stepId: "calculate",
    title: "Calculeaza cererea utila",
    assistedPrompt: "Motorul Chapter 2 validat calculeaza incalzirea si racirea."
  }
]);

const YEAR_PERIODS = [
  { period: "before_1960", max: 1959 },
  { period: "1960_1977", min: 1960, max: 1977 },
  { period: "1978_1990", min: 1978, max: 1990 },
  { period: "1991_2005", min: 1991, max: 2005 },
  { period: "after_2005", min: 2006 }
];

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

function renderReportChapters(workspace) {
  return `
    <div class="technical-report-chapter-list">
      ${workspace.report.chapters.map(chapter => `
        <details class="technical-report-chapter">
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

  return {
    buildingId: "building-platform-wizard-preview",
    buildingType,
    constructionPeriod: constructionPeriodFromYear(formValue(formData, "construction_year")),
    structuralSystem: structuralSystemFromWallMaterial(formValue(formData, "wall_material")),
    renovations: {
      wallInsulation: wallInsulationSelected ? "eps" : false,
      roofInsulated: roofInsulated === "yes" || roofInsulated === "partial",
      floorInsulated: floorInsulated === "yes" || floorInsulated === "partial",
      windowsReplaced: [
        "modern_double_glazing",
        "triple_glazing"
      ].includes(windowType)
    },
    buildingSpecificParameters: {
      ...(usefulFloorAreaM2 === undefined ? {} : { usefulFloorAreaM2 }),
      ...(windowAreaM2 === undefined ? {} : { windowAreaM2 }),
      ...(averageRoomHeightM === undefined ? {} : { averageRoomHeightM }),
      ...(numberOfFloors === undefined ? {} : { numberOfFloors }),
      ...(ventilationAch === undefined ? {} : { ventilationAch }),
      mainOrientation: formValue(formData, "main_orientation") || "unknown",
      windowOrientation: formValue(formData, "window_orientation") || "unknown",
      ventilationType: formValue(formData, "ventilation_type") || "unknown",
      atticContext: roofType === "heated_attic" ? "heated" : "unheated",
      basementContext: floorType === "over_basement" ? "unheated" : "none"
    },
    context: {
      attic: roofType === "heated_attic" ? "heated" : "unheated",
      basement: floorType === "over_basement" ? "unheated" : "none"
    },
    location: {
      city: formValue(formData, "city") || null
    },
    source: {
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

export function renderEngineeringModelReview(preview) {
  if (preview.status !== "ready") {
    const code = preview.diagnostics?.blockers?.[0]?.code ?? "model_incomplet";
    return `<p class="form-message error">Modelul tehnic nu este gata: ${safeText(code)}</p>`;
  }
  const dna = preview.buildingDna;
  const workspace = preview.technicalWorkspace;
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
        <p>${safeText(workspace.report.title)} · ${safeText(workspace.report.source)}</p>
        ${renderReportChapters(workspace)}
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

export function attachBuildingPlatformWizard(root = document) {
  const form = root.getElementById?.("houseForm");
  const previewTarget = root.getElementById?.("buildingModelReview");
  const previewButton = root.getElementById?.("buildingModelPreviewBtn");
  if (!form || !previewTarget || !previewButton) {
    return { attached: false };
  }
  previewButton.addEventListener("click", () => {
    const answers = mapWizardAnswersToAssistedAnswers(new FormData(form));
    const preview = buildWizardEngineeringPreview(answers);
    previewTarget.innerHTML = renderEngineeringModelReview(preview);
  });
  return { attached: true };
}

if (typeof window !== "undefined") {
  window.LaCurentBuildingPlatformWizard = {
    BUILDING_PLATFORM_WIZARD_STEPS,
    attachBuildingPlatformWizard,
    buildWizardEngineeringPreview,
    constructionPeriodFromYear,
    mapWizardAnswersToAssistedAnswers,
    renderEngineeringModelReview,
    structuralSystemFromWallMaterial
  };
  window.addEventListener("DOMContentLoaded", () => {
    attachBuildingPlatformWizard(document);
  });
}
