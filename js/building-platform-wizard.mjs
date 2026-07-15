import {
  buildBuildingKnowledgePlatformFromAssistedAnswers,
  buildBuildingTechnicalWorkspace,
  climateProfileToBuildingMonthlyProfiles,
  findRomanianClimateProfileById,
  listRomanianClimateProfiles
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
    climate_profile_id: "ro_synthetic_bucharest_seasonal_demo_v1",
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

function setFieldValue(form, name, value, provenance = {}) {
  const escapedName = globalThis.CSS?.escape
    ? globalThis.CSS.escape(name)
    : String(name).replace(/["\\]/g, "\\$&");
  const controls = form?.querySelectorAll?.(`[name="${escapedName}"]`) ?? [];
  const provenanceOrigin = provenance.origin ?? "demo_fixture";
  const confirmationStatus = provenance.confirmationStatus ?? "unconfirmed_demo";
  const confidence = provenance.confidence ?? ASSISTED_WIZARD_DEMO_FIXTURE.provenance.confidence;
  controls.forEach(control => {
    if (control.type === "checkbox") {
      control.checked = value === control.value || value === "yes" || value === true;
    } else if (control.type !== "file") {
      control.value = value ?? "";
    }
    control.dataset.provenanceOrigin = provenanceOrigin;
    control.dataset.confirmationStatus = confirmationStatus;
    control.dataset.editable = "true";
    control.dataset.confidence = confidence;
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

function quantityValue(source) {
  if (source && typeof source === "object" && "value" in source) return source.value;
  if (source && typeof source === "object" && "amount" in source) return source.amount;
  return source;
}

function constructionYearFromPeriod(period) {
  const yearsByPeriod = {
    before_1960: 1950,
    "1960_1977": 1970,
    "1978_1990": 1985,
    "1991_2005": 2000,
    after_2005: 2010
  };
  return yearsByPeriod[period] ?? 1985;
}

function assemblyIds(buildingDna) {
  return (buildingDna?.assemblies ?? []).map(assembly => String(assembly.assemblyId ?? ""));
}

function wallAssemblyIds(buildingDna) {
  return assemblyIds(buildingDna).filter(id => id.includes("wall"));
}

function inferWallMaterial(buildingDna) {
  const ids = assemblyIds(buildingDna).join(" ");
  if (ids.includes("bca") || ids.includes("aac")) return "bca";
  if (ids.includes("concrete")) return "concrete";
  if (ids.includes("timber") || ids.includes("wood")) return "wood";
  if (ids.includes("stone")) return "stone";
  if (buildingDna?.building?.structuralSystem === "timber") return "wood";
  return "brick";
}

function inferWindowType(buildingDna) {
  const ids = assemblyIds(buildingDna).join(" ");
  if (ids.includes("triple")) return "triple_glazing";
  if (ids.includes("pvc") || ids.includes("double_glazing")) return "modern_double_glazing";
  if (ids.includes("single")) return "single_glazing";
  return "unknown";
}

function hasIntervention(buildingDna, type) {
  return (buildingDna?.renovationInterventions ?? [])
    .some(intervention => intervention.interventionType === type || intervention.interventionId === type);
}

function inferWallInsulation(buildingDna) {
  const ids = wallAssemblyIds(buildingDna).join(" ");
  if (!hasIntervention(buildingDna, "external_wall_insulation") && !ids.includes("eps") && !ids.includes("mineral_wool")) {
    return "Fara";
  }
  if (ids.includes("200")) return "20cm+";
  if (ids.includes("150")) return "15cm";
  if (ids.includes("50")) return "5cm";
  return "10cm";
}

function inferRoofType(buildingDna) {
  const context = quantityValue(buildingDna?.buildingSpecificParameters?.atticContext);
  if (context === "heated") return "heated_attic";
  const roof = (buildingDna?.envelopeElements ?? []).find(element => element.assemblyRole === "roof");
  if (roof?.boundaryType === "outside_air") return "unheated_attic";
  return "unheated_attic";
}

function inferFloorType(buildingDna) {
  const context = quantityValue(buildingDna?.buildingSpecificParameters?.basementContext);
  if (context === "unheated") return "over_basement";
  const ground = (buildingDna?.envelopeElements ?? []).find(element => element.assemblyRole === "ground_floor");
  if (ground?.boundaryType === "ground") return "on_ground";
  if (ground?.boundaryType === "unheated_space") return "over_unheated_space";
  if (ground?.boundaryType === "adjacent_heated_space") return "over_heated_space";
  return "on_ground";
}

export function buildingDnaToWizardValues(buildingDna) {
  const parameters = buildingDna?.buildingSpecificParameters ?? {};
  const geometry = buildingDna?.geometry ?? {};
  const building = buildingDna?.building ?? {};
  return {
    display_name: building.buildingId ?? "Model termic Chapter 2 salvat",
    building_type: building.buildingType === "apartment" ? "apartment" : "house",
    city: building.location?.city ?? building.location?.locality ?? buildingDna?.climateProfile?.locality ?? "",
    climate_profile_id: building.location?.climateProfileId ?? buildingDna?.climateProfile?.profileId ?? "",
    construction_year: constructionYearFromPeriod(building.constructionPeriod),
    useful_area_m2: quantityValue(parameters.usefulFloorAreaM2 ?? geometry.usefulFloorAreaM2) ?? "",
    number_of_floors: quantityValue(parameters.numberOfFloors) ?? "",
    floor_height_m: quantityValue(parameters.averageRoomHeightM) ?? "",
    heated_volume_m3: quantityValue(parameters.heatedVolumeM3) ?? "",
    main_orientation: quantityValue(parameters.mainOrientation) ?? "unknown",
    exterior_wall_area_m2: quantityValue(parameters.exteriorWallAreaM2 ?? geometry.exteriorWallAreaM2) ?? "",
    roof_area_m2: quantityValue(parameters.roofAreaM2 ?? geometry.roofAreaM2) ?? "",
    ground_floor_area_m2: quantityValue(parameters.groundFloorAreaM2 ?? geometry.groundFloorAreaM2) ?? "",
    attic_ceiling_area_m2: quantityValue(parameters.atticCeilingAreaM2 ?? geometry.atticCeilingAreaM2) ?? "",
    adjacent_wall_area_m2: quantityValue(geometry.adjacentWallAreaM2) ?? "",
    structural_system: building.structuralSystem ?? "unknown",
    wall_material: inferWallMaterial(buildingDna),
    roof_type: inferRoofType(buildingDna),
    floor_type: inferFloorType(buildingDna),
    window_type: inferWindowType(buildingDna),
    window_area_m2: quantityValue(parameters.windowAreaM2 ?? geometry.windowAreaM2) ?? "",
    window_orientation: quantityValue(parameters.windowOrientation) ?? "unknown",
    door_area_m2: quantityValue(geometry.doorAreaM2) ?? "",
    ventilation_type: quantityValue(parameters.ventilationType) ?? "unknown",
    ventilation_ach: quantityValue(parameters.ventilationAch) ?? "",
    wall_insulation: inferWallInsulation(buildingDna),
    wall_insulation_material: wallAssemblyIds(buildingDna).join(" ").includes("mineral_wool") ? "mineral_wool" : "eps",
    roof_insulated: hasIntervention(buildingDna, "roof_insulation") ? "yes" : "unknown",
    floor_insulated: hasIntervention(buildingDna, "floor_insulation") ? "yes" : "unknown",
    windows_replaced: hasIntervention(buildingDna, "window_replacement") ? "yes" : "unknown"
  };
}

export function applyBuildingDnaToWizardForm(form, buildingDna, provenance = {}) {
  if (!form || !buildingDna) return { applied: false, reason: "missing_form_or_building_dna" };
  form.reset?.();
  clearFieldProvenance(form);
  const values = buildingDnaToWizardValues(buildingDna);
  const fieldProvenance = {
    origin: provenance.origin ?? "saved_building_dna",
    confirmationStatus: provenance.confirmationStatus ?? "loaded_saved_analysis",
    confidence: provenance.confidence ?? buildingDna.source?.confidence ?? "medium"
  };
  for (const [name, value] of Object.entries(values)) {
    setFieldValue(form, name, value, fieldProvenance);
  }
  form.dataset.demoMode = "";
  form.dataset.demoFixtureId = "";
  const hiddenDemoMode = form.querySelector?.('[name="building_platform_demo_mode"]');
  const hiddenFixtureId = form.querySelector?.('[name="building_platform_demo_fixture_id"]');
  if (hiddenDemoMode) hiddenDemoMode.value = "";
  if (hiddenFixtureId) hiddenFixtureId.value = "";
  dispatchFormRefresh(form);
  return {
    applied: true,
    fieldCount: Object.keys(values).length
  };
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
  const climateProfileId = formValue(formData, "climate_profile_id");
  const climateProfile = climateProfileId
    ? findRomanianClimateProfileById(climateProfileId)
    : null;
  const convertedClimate = climateProfile
    ? climateProfileToBuildingMonthlyProfiles(climateProfile)
    : { status: "blocked" };

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
      city: formValue(formData, "city") || null,
      climateProfileId: climateProfile?.profileId ?? null,
      climateProfileSourceType: climateProfile?.sourceType ?? null
    },
    ...(climateProfile === null ? {} : {
      climateProfile,
      climateProfileId: climateProfile.profileId,
      allowSyntheticClimate: climateProfile.sourceType === "synthetic_demo_profile",
      monthlyProfiles: convertedClimate.status === "ready"
        ? convertedClimate.monthlyProfiles
        : undefined
    }),
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
          <p>Climate profile: ${safeText(dna.climateProfile?.displayName ?? "missing")} / ${safeText(dna.climateProfile?.verificationStatus ?? "not_selected")}</p>
        </section>
        <section id="p2b-building_dna" class="technical-workspace-panel">
          <h4>Building DNA</h4>
          <p>Schema: ${safeText(dna.schema)} · Platform: ${safeText(dna.platformVersion)}</p>
          <p>Assumptions: ${safeText(dna.assumptions.length)} · Confirmations: ${safeText(dna.missingConfirmations.length)}</p>
        </section>
        <section id="p2b-chapter_2" class="technical-workspace-panel">
          <h4>Chapter 2 authority</h4>
          <p>Displayed values are read from Building DNA and validated Chapter 2 engine outputs.</p>
          <p>The active workspace is limited to envelope modelling, monthly useful demand, annual useful demand and the technical report.</p>
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
      ${dna.climateProfile?.sourceType === "synthetic_demo_profile" ? `
        <section class="technical-workspace-panel synthetic-climate-warning">
          <h4>Profil climatic sintetic</h4>
          <p>${safeText(dna.climateProfile.safetyLabel)}</p>
        </section>
      ` : ""}
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

function setSaveStatus(root, message, state = "info") {
  const target = root.getElementById?.("buildingPlatformSaveStatus");
  if (!target) return;
  target.textContent = message;
  target.dataset.state = state;
}

function currentHouseIdFromForm(form) {
  const raw = form?.dataset?.currentHouseId;
  const parsed = Number(raw);
  return Number.isInteger(parsed) && parsed > 0 ? parsed : null;
}

export function buildBuildingPlatformSavePayload(preview, formData, form = null) {
  if (preview?.status !== "ready" || !preview.buildingDna) {
    return {
      ok: false,
      code: "building_platform_preview_not_ready_for_save"
    };
  }
  return {
    ok: true,
    value: {
      project_name: formData.get?.("display_name") || preview.buildingDna.building?.buildingId || "Model termic Chapter 2",
      ...(currentHouseIdFromForm(form) === null ? {} : { house_id: currentHouseIdFromForm(form) }),
      building_dna: preview.buildingDna
    }
  };
}

function analysisIdFromRoot(root, options = {}) {
  const explicit = options.analysisId ?? root.getElementById?.("buildingPlatformLoadAnalysisId")?.value;
  const parsed = Number(explicit);
  return Number.isInteger(parsed) && parsed > 0 ? parsed : null;
}

function renderLoadedReportChapters(report) {
  const chapters = Array.isArray(report?.chapters) ? report.chapters : [];
  if (chapters.length === 0) return "<p>Raportul salvat nu contine capitole structurate.</p>";
  return chapters.map(chapter => `
    <details class="technical-report-chapter" open>
      <summary>${safeText(chapter.title ?? chapter.chapterId)}</summary>
      <p>${safeText(chapter.summary ?? "")}</p>
      ${Array.isArray(chapter.rows) && chapter.rows.length > 0
        ? renderTable(
          [
            { label: "Camp", value: row => row.label },
            { label: "Valoare", value: row => row.value }
          ],
          chapter.rows
        )
        : ""}
    </details>
  `).join("");
}

export function renderLoadedBuildingPlatformAnalysis(record) {
  const buildingDna = record?.building_dna ?? record?.technical_details?.buildingDna;
  const summary = record?.technical_details?.resultSummary ?? {};
  const report = record?.technical_report ?? record?.technical_details?.technicalReport;
  const version = record?.building_dna_version ?? record?.technical_details?.buildingDnaVersion ?? {};
  if (!buildingDna) {
    return `<p class="form-message error">Analiza salvata nu contine Building DNA.</p>`;
  }
  return `
    <div class="recommendation-detail-card" data-loaded-building-platform-analysis>
      <div>
        <h3>Analiza Building Platform incarcata</h3>
        <p>Proiect: ${safeText(record.house_id ?? "--")} · Analiza: ${safeText(record.analysis_id ?? "--")} · Versiune Building DNA: ${safeText(version.versionId ?? "--")}</p>
        <p>Status calcul: ${safeText(version.calculationStatus ?? buildingDna.calculationStatus ?? "requires_confirmation")}</p>
        <div class="technical-status-grid p2b-annual-summary">
          <article>
            <span>Annual QHnd</span>
            <strong>${formatNumber(summary.annualQHnd)} kWh</strong>
            <small>Citit din analiza salvata</small>
          </article>
          <article>
            <span>Annual QCnd</span>
            <strong>${formatNumber(summary.annualQCnd)} kWh</strong>
            <small>Citit din analiza salvata</small>
          </article>
          <article>
            <span>Luni</span>
            <strong>${safeText(summary.monthCount ?? buildingDna.monthlyProfiles?.length ?? "--")}</strong>
            <small>Profil lunar salvat</small>
          </article>
        </div>
        <section class="technical-workspace-panel" id="p2b-report">
          <h4>Raport tehnic salvat</h4>
          <div class="technical-report-success" data-technical-report-success>
            Raport tehnic incarcat din analiza persistenta. Recalculeaza pentru a crea o versiune noua.
          </div>
          <p>${safeText(report?.title ?? "Raport Chapter 2")} · ${safeText(report?.source ?? "saved_analysis_record")}</p>
          ${renderLoadedReportChapters(report)}
        </section>
      </div>
    </div>
  `;
}

export async function saveBuildingPlatformChapter2Analysis(root = document, options = {}) {
  const form = root.getElementById?.("houseForm");
  const previewTarget = root.getElementById?.("buildingModelReview");
  const formData = options.formData ?? (form ? new FormData(form) : null);
  if (!formData) {
    return { saved: false, reason: "missing_form_data" };
  }
  const apiClient = options.apiClient ?? globalThis.window?.LaCurentAuth?.api;
  if (typeof apiClient !== "function") {
    setSaveStatus(root, "Autentificarea este necesara pentru salvare.", "blocked");
    return { saved: false, reason: "missing_authenticated_api_client" };
  }

  const answers = mapWizardAnswersToAssistedAnswers(formData);
  const preview = buildWizardEngineeringPreview(answers);
  if (previewTarget) {
    previewTarget.innerHTML = renderEngineeringModelReview(preview, { openReport: true });
  }
  if (preview.status !== "ready") {
    setSaveStatus(root, "Modelul Building DNA nu este gata pentru salvare.", "blocked");
    return { saved: false, reason: "preview_not_ready", preview };
  }

  const payload = buildBuildingPlatformSavePayload(preview, formData, form);
  if (!payload.ok) {
    setSaveStatus(root, "Payload-ul de salvare nu este valid.", "blocked");
    return { saved: false, reason: payload.code, preview };
  }

  setSaveStatus(root, "Se salveaza analiza Chapter 2...", "pending");
  const response = await apiClient("/api/building-platform/chapter2/save", payload.value);
  if (!response?.success) {
    setSaveStatus(root, response?.error || "Analiza nu a putut fi salvata.", "blocked");
    return { saved: false, reason: "api_save_failed", response, preview };
  }
  if (form?.dataset) {
    form.dataset.currentHouseId = String(response.house_id ?? "");
    form.dataset.currentAnalysisId = String(response.analysis_id ?? "");
  }
  setSaveStatus(
    root,
    `Analiza salvata: proiect ${response.house_id}, analiza ${response.analysis_id}, versiune ${response.building_dna_version?.versionId ?? "necunoscuta"}.`,
    "ready"
  );
  return {
    saved: true,
    response,
    preview
  };
}

export async function loadBuildingPlatformChapter2Analysis(root = document, options = {}) {
  const form = root.getElementById?.("houseForm");
  const previewTarget = root.getElementById?.("buildingModelReview");
  const apiClient = options.apiClient ?? globalThis.window?.LaCurentAuth?.api;
  if (typeof apiClient !== "function") {
    setSaveStatus(root, "Autentificarea este necesara pentru incarcarea analizei.", "blocked");
    return { loaded: false, reason: "missing_authenticated_api_client" };
  }
  const analysisId = analysisIdFromRoot(root, options);
  if (analysisId === null) {
    setSaveStatus(root, "Introdu un analysis_id valid pentru incarcare.", "blocked");
    return { loaded: false, reason: "invalid_analysis_id" };
  }

  setSaveStatus(root, "Se incarca analiza Building Platform...", "pending");
  const response = await apiClient("/api/building-platform/chapter2/load", { analysis_id: analysisId });
  if (!response?.success) {
    setSaveStatus(root, response?.error || "Analiza nu a putut fi incarcata.", "blocked");
    return { loaded: false, reason: "api_load_failed", response };
  }
  const applied = applyBuildingDnaToWizardForm(form, response.building_dna, {
    origin: "saved_building_dna",
    confirmationStatus: "loaded_saved_analysis",
    confidence: response.building_dna?.source?.confidence ?? "medium"
  });
  if (form?.dataset) {
    form.dataset.currentHouseId = String(response.house_id ?? "");
    form.dataset.currentAnalysisId = String(response.analysis_id ?? "");
    form.dataset.loadedBuildingDnaVersionId = String(response.building_dna_version?.versionId ?? "");
  }
  if (previewTarget) {
    previewTarget.innerHTML = renderLoadedBuildingPlatformAnalysis(response);
  }
  setSaveStatus(
    root,
    `Analiza incarcata: proiect ${response.house_id}, analiza ${response.analysis_id}, versiune ${response.building_dna_version?.versionId ?? "necunoscuta"}.`,
    "ready"
  );
  root.getElementById?.("p2b-report")?.scrollIntoView?.({ behavior: "smooth", block: "start" });
  return {
    loaded: true,
    response,
    applied
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
  const climateSelect = form.querySelector?.('[name="climate_profile_id"]');
  if (climateSelect && climateSelect.options.length <= 1) {
    for (const profile of listRomanianClimateProfiles({ includeSynthetic: true })) {
      const option = root.createElement?.("option");
      if (!option) continue;
      option.value = profile.profileId;
      option.textContent = `${profile.locality}, ${profile.county} - ${profile.displayName}`;
      option.dataset.sourceType = profile.sourceType;
      option.dataset.verificationStatus = profile.verificationStatus;
      climateSelect.appendChild(option);
    }
  }
  const demoControls = attachDemoControls(root, form);
  previewButton.addEventListener("click", () => {
    generateBuildingPlatformTechnicalReport(root, {
      openReport: form.dataset.demoMode === "1",
      scrollToReport: true
    });
  });
  const saveButton = root.getElementById?.("saveBuildingPlatformAnalysisBtn");
  const recalculateButton = root.getElementById?.("recalculateBuildingPlatformAnalysisBtn");
  const loadButton = root.getElementById?.("loadBuildingPlatformAnalysisBtn");
  saveButton?.addEventListener("click", () => {
    saveBuildingPlatformChapter2Analysis(root);
  });
  recalculateButton?.addEventListener("click", () => {
    saveBuildingPlatformChapter2Analysis(root);
  });
  loadButton?.addEventListener("click", () => {
    loadBuildingPlatformChapter2Analysis(root);
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
    applyBuildingDnaToWizardForm,
    buildWizardEngineeringPreview,
    buildingDnaToWizardValues,
    clearAssistedWizardDemoFixture,
    constructionPeriodFromYear,
    demoModeFromSearch,
    generateBuildingPlatformTechnicalReport,
    getAssistedWizardDemoFixture,
    buildBuildingPlatformSavePayload,
    mapWizardAnswersToAssistedAnswers,
    renderEngineeringModelReview,
    renderLoadedBuildingPlatformAnalysis,
    loadBuildingPlatformChapter2Analysis,
    saveBuildingPlatformChapter2Analysis,
    structuralSystemFromWallMaterial
  };
  window.addEventListener("DOMContentLoaded", () => {
    attachBuildingPlatformWizard(document);
  });
}
