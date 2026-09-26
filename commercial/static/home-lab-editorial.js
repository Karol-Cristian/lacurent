(() => {
  const root = document.querySelector("[data-editorial-lab]");
  const form = document.getElementById("edForm");
  if (!root || !form) return;

  const $ = selector => document.querySelector(selector);
  const storageKey = `lacurent-home-lab-editorial-v1:${root.dataset.partnerId || "official"}`;
  const classicStorageKey = `lacurent-home-lab-next-v1:${root.dataset.partnerId || "official"}`;
  const localAutosaveAllowed = () => window.LaCurentPrivacy?.allowsLocalAutosave?.() === true;
  const pages = [...root.querySelectorAll("[data-page]")];
  const wizardOrder = ["intro", "house", "envelope", "systems", "renewables", "goal"];
  const progressOrder = ["house", "envelope", "systems", "renewables", "goal", "report"];
  const stepNames = {intro:"Start",house:"Casa",envelope:"Anvelopa",systems:"Instalații",renewables:"Regenerabile",goal:"Obiectiv",run:"Rezultat",done:"Rezultat",report:"Rezultat",error:"Eroare"};
  const stepNumbers = {intro:"—",house:"01",envelope:"02",systems:"03",renewables:"04",goal:"05",run:"06",done:"06",report:"06",error:"—"};
  const stepNumber = $("#edStepNumber");
  const stepName = $("#edStepName");
  const runLog = $("#runLog");
  const logDialog = $("#logDialog");
  const logDialogBody = $("#logDialogBody");
  const baselineBar = document.querySelector(".ed-baseline-bar");
  const baselineClass = $("#edBaselineClass");
  const baselineCost = $("#edBaselineCost");
  const baselineStatus = $("#edBaselineStatus");
  const stageEls = Object.fromEntries([...document.querySelectorAll("[data-run-stage]")].map(el => [el.dataset.runStage, el]));

  const WALL_STRUCTURE_PRESETS = Object.freeze({
    unknown:{lambda:null,defaultThicknessCm:30,fallbackU:1.30},
    solid_brick:{lambda:0.72,defaultThicknessCm:30},
    efficient_brick:{lambda:0.32,defaultThicknessCm:30},
    bca:{lambda:0.18,defaultThicknessCm:30},
    concrete:{lambda:1.70,defaultThicknessCm:20},
    wood:{lambda:0.18,defaultThicknessCm:20},
    stone:{lambda:1.80,defaultThicknessCm:45},
  });
  const INSULATION_LAMBDA_W_MK = Object.freeze({
    generic_040:0.040,eps:0.040,xps:0.035,mineral_wool:0.039,cellulose:0.040,wood_fiber:0.045,
  });
  const TOP_BOUNDARY_BASE_U = Object.freeze({
    unknown:1.00,cold_attic:3.25,heated_attic:1.00,flat_roof:2.25,
  });
  const WALL_SURFACE_RESISTANCE_M2K_W = 0.17;

  let current = "intro";
  let furthestWizardIndex = -1;
  let baselineResult = null;
  let optimizationResult = null;
  let lastPlan = null;
  let branchResults = [];
  let logLines = [];
  let baselineSummaryTimer = 0;
  let baselineSummaryController = null;
  let baselineSummaryRevision = 0;
  let locationData = null;
  let localities = [];
  let localityMap = new Map();
  let locationProjection = null;
  let projectedLocalities = [];
  let mapRenderFrame = 0;
  let mapSuppressClickUntil = 0;
  let mapDrag = null;
  let mapPinch = null;
  let autosaveTimer = 0;
  const MAP_MIN_ZOOM = 1;
  const MAP_MAX_ZOOM = 6;
  const mapView = {zoom:1, centerX:null, centerY:null};

  function persistedFieldKey(field) {
    if (field.id) return `id:${field.id}`;
    if (field.name) return `name:${field.name}`;
    return "";
  }

  function isPersistableField(field) {
    if (!field || field.disabled) return false;
    if (field.type === "hidden") {
      return field.id === "localityId" || field.name === "_optimization_mode";
    }
    return Boolean(field.id || field.name);
  }

  function editorialDraftSnapshot() {
    const fields = {};
    form.querySelectorAll("input,select,textarea").forEach(field => {
      if (!isPersistableField(field)) return;
      const key = persistedFieldKey(field);
      if (!key) return;
      fields[key] = field.type === "checkbox" || field.type === "radio"
        ? {checked:Boolean(field.checked)}
        : {value:String(field.value ?? "")};
      if (field.dataset.geomAuto !== undefined) {
        fields[key].geomAuto = field.dataset.geomAuto;
      }
      if (field.dataset.advancedAuto !== undefined) {
        fields[key].advancedAuto = field.dataset.advancedAuto;
      }
    });
    return {
      version:1,
      fields,
      savedAt:new Date().toISOString(),
    };
  }

  function persistEditorialDraft() {
    if (!localAutosaveAllowed()) return false;
    try {
      localStorage.setItem(storageKey, JSON.stringify(editorialDraftSnapshot()));
      return true;
    } catch (_) {
      return false;
    }
  }

  function scheduleEditorialDraftSave(delay = 120) {
    window.clearTimeout(autosaveTimer);
    autosaveTimer = window.setTimeout(() => persistEditorialDraft(), delay);
  }

  function resolvePersistedField(key) {
    if (key.startsWith("id:")) return document.getElementById(key.slice(3));
    if (key.startsWith("name:")) {
      const name = key.slice(5);
      return [...form.elements].find(field => field.name === name) || null;
    }
    return null;
  }

  function applyEditorialDraft(draft) {
    if (!draft || draft.version !== 1 || !draft.fields || typeof draft.fields !== "object") return false;
    let applied = false;
    Object.entries(draft.fields).forEach(([key, saved]) => {
      const field = resolvePersistedField(key);
      if (!field || !isPersistableField(field) || !saved || typeof saved !== "object") return;
      if (field.type === "checkbox" || field.type === "radio") {
        field.checked = Boolean(saved.checked);
      } else if (Object.prototype.hasOwnProperty.call(saved, "value")) {
        if (field.tagName === "SELECT") {
          const hasOption = [...field.options].some(option => option.value === String(saved.value));
          if (!hasOption) return;
        }
        field.value = String(saved.value);
      }
      if (saved.geomAuto !== undefined && field.dataset.geomAuto !== undefined) {
        field.dataset.geomAuto = String(saved.geomAuto);
      }
      if (saved.advancedAuto !== undefined) {
        field.dataset.advancedAuto = String(saved.advancedAuto);
      }
      applied = true;
    });
    return applied;
  }

  function setMigratedField(selector, value, checked = false) {
    if (value === undefined || value === null) return;
    const field = selector.startsWith("#")
      ? document.getElementById(selector.slice(1))
      : form.querySelector(selector);
    if (!field) return;
    if (checked || field.type === "checkbox") {
      field.checked = Boolean(value);
      return;
    }
    if (field.tagName === "SELECT") {
      const next = String(value);
      if (![...field.options].some(option => option.value === next)) return;
    }
    field.value = String(value);
  }

  function migrateClassicDraft() {
    if (!localAutosaveAllowed()) return false;
    try {
      const saved = JSON.parse(localStorage.getItem(classicStorageKey) || "null");
      const state = saved?.homeState;
      if (!state || typeof state !== "object") return false;

      setMigratedField("#localityId", state.localityId);
      setMigratedField("#localityInput", state.locality);
      setMigratedField("#heatedArea", state.area);
      setMigratedField("#heatedLevels", state.levels);
      setMigratedField("#averageHeight", state.height);
      setMigratedField('[name="indoor_design_temperature_c"]', state.temperature);
      setMigratedField('[name="construction_year"]', state.constructionYear);
      setMigratedField('[name="dhw_occupants"]', state.occupants);
      setMigratedField("#windowArea", state.windows);

      const geometryOverrides = [
        ["#wallArea", state.wallAreaOverride],
        ["#roofArea", state.topAreaOverride],
        ["#floorArea", state.floorAreaOverride],
        ["#heatedVolume", state.volumeOverride],
      ];
      geometryOverrides.forEach(([selector,value]) => {
        if (value === undefined || value === null) return;
        setMigratedField(selector, value);
        const field = document.querySelector(selector);
        if (field?.dataset.geomAuto !== undefined) field.dataset.geomAuto = "false";
      });

      setMigratedField("#wallStructure", state.wallStructure);
      setMigratedField("#wallStructureThickness", state.wallStructureThickness);
      setMigratedField("#wallInsulationMaterial", state.wallInsulationMaterial);
      setMigratedField("#wallIns", state.wallIns);
      setMigratedField("#topBoundary", state.topBoundary);
      setMigratedField("#roofInsulationMaterial", state.roofInsulationMaterial);
      setMigratedField("#roofIns", state.roofIns);
      setMigratedField("#floorBoundary", state.floorBoundary);
      setMigratedField("#floorInsulationMaterial", state.floorInsulationMaterial);
      setMigratedField("#floorIns", state.floorIns);
      setMigratedField("#glazing", state.glazing);
      setMigratedField("#orientation", state.orientation);

      setMigratedField("#heatingChoice", state.heating);
      setMigratedField("#heatPumpSource", state.heatPumpSource);
      setMigratedField("#heatingEmitter", state.heatingEmitter);
      setMigratedField("#heatingDistribution", state.heatingDistribution);
      setMigratedField("#heatingStorage", state.heatingStorage);
      setMigratedField("#heatingControl", state.heatingControl);
      setMigratedField("#dhwSystem", state.dhwSystem);
      setMigratedField("#ventilation", state.ventilation);
      setMigratedField("#cooling", state.cooling);

      setMigratedField("#pvEnabled", state.pvEnabled, true);
      setMigratedField('[name="pv_installed_power_kwp"]', state.pvKwp);
      setMigratedField('[name="pv_orientation"]', state.pvOrientation);
      setMigratedField('[name="pv_tilt_degrees"]', state.pvTilt);
      setMigratedField("#solarThermalEnabled", state.solarThermalEnabled, true);
      setMigratedField('[name="solar_thermal_collector_area_m2"]', state.solarThermalArea);
      setMigratedField('[name="solar_thermal_orientation"]', state.solarThermalOrientation);
      setMigratedField('[name="solar_thermal_tilt_degrees"]', state.solarThermalTilt);

      persistEditorialDraft();
      return true;
    } catch (_) {
      return false;
    }
  }

  function restoreEditorialDraft() {
    if (!localAutosaveAllowed()) return false;
    try {
      const ownDraft = JSON.parse(localStorage.getItem(storageKey) || "null");
      if (applyEditorialDraft(ownDraft)) return true;
    } catch (_) {}
    return migrateClassicDraft();
  }

  function syncChoiceGroupSelections() {
    document.querySelectorAll("[data-choice-group]").forEach(group => {
      const field = form.querySelector(`[name="${group.dataset.choiceGroup}"]`);
      if (!field) return;
      group.querySelectorAll("button[data-value]").forEach(button => {
        button.classList.toggle("is-selected", button.dataset.value === field.value);
      });
    });
  }

  const fmt = (value, digits = 0) => {
    if (value === null || value === undefined || Number.isNaN(Number(value))) return "—";
    return new Intl.NumberFormat("ro-RO", {maximumFractionDigits:digits, minimumFractionDigits:digits}).format(Number(value));
  };
  const money = value => value === null || value === undefined ? "—" : fmt(value, 0) + " lei";
  const energy = value => value === null || value === undefined ? "—" : fmt(value, 0) + " kWh/an";
  const setValue = (id, value) => { const node = document.getElementById(id); if (node) node.value = value == null ? "" : String(value); };

  function parseDecimal(value, fallback = NaN) {
    const normalized = String(value ?? "").trim().replace(/\s+/g, "").replace(",", ".");
    const parsed = Number(normalized);
    return Number.isFinite(parsed) ? parsed : fallback;
  }

  function optionalAdvancedNumber(id) {
    const field = document.getElementById(id);
    if (!field || field.dataset.advancedAuto === "true" || String(field.value ?? "").trim() === "") return null;
    const value = parseDecimal(field.value);
    return Number.isFinite(value) ? value : null;
  }

  function advancedFieldIsManual(id) {
    const field = document.getElementById(id);
    return Boolean(field && field.dataset.advancedAuto !== "true" && String(field.value ?? "").trim() !== "");
  }

  function setAdvancedDerivedValue(id, value, digits = 2) {
    const field = document.getElementById(id);
    if (!field || advancedFieldIsManual(id)) return;
    const numeric = Number(value);
    if (!Number.isFinite(numeric)) {
      field.value = "";
      field.dataset.advancedAuto = "true";
    } else {
      field.value = decimalForDisplay(numeric, digits);
      field.dataset.advancedAuto = "true";
    }
    const wrapper = field.closest(".ed-field");
    wrapper?.classList.toggle("is-derived-value", Number.isFinite(numeric));
    wrapper?.classList.remove("is-manual-value");
  }

  function refreshAdvancedFieldState(field) {
    if (!field?.matches?.("[data-optional-advanced]")) return;
    const hasValue = String(field.value ?? "").trim() !== "";
    const auto = field.dataset.advancedAuto === "true";
    const wrapper = field.closest(".ed-field");
    wrapper?.classList.toggle("is-derived-value", hasValue && auto);
    wrapper?.classList.toggle("is-manual-value", hasValue && !auto);
  }

  function markAdvancedManual(field) {
    if (!field?.matches?.("[data-optional-advanced]")) return;
    field.dataset.advancedAuto = "false";
    refreshAdvancedFieldState(field);
  }

  function decimalForForm(value) {
    const parsed = parseDecimal(value);
    return Number.isFinite(parsed) ? String(parsed) : String(value ?? "").trim();
  }

  function decimalForDisplay(value, digits = 1) {
    if (!Number.isFinite(Number(value))) return "";
    return Number(value).toFixed(digits).replace(".", ",");
  }

  function normalizeSearch(value) {
    return String(value ?? "")
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "")
      .toLowerCase()
      .trim();
  }

  function renderProgressHistory() {
    const visualCurrent = ["run","done","report"].includes(current) ? "report" : current;
    document.querySelectorAll("[data-progress-step]").forEach(button => {
      const step = button.dataset.progressStep;
      const index = progressOrder.indexOf(step);
      const wizardIndex = wizardOrder.indexOf(step);
      const reached = step === "report"
        ? Boolean(optimizationResult)
        : wizardIndex >= 0 && wizardIndex <= furthestWizardIndex;
      const isCurrent = step === visualCurrent;
      button.disabled = !reached;
      button.classList.toggle("is-reached", reached);
      button.classList.toggle("is-current", isCurrent);
      button.setAttribute("aria-current", isCurrent ? "step" : "false");
      if (index >= 0) button.setAttribute("aria-label", `Pasul ${index + 1}: ${stepNames[step] || step}`);
    });
  }

  function showPage(name) {
    current = name;
    const wizardIndex = wizardOrder.indexOf(name);
    if (wizardIndex >= 0) furthestWizardIndex = Math.max(furthestWizardIndex, wizardIndex);
    pages.forEach(page => page.classList.toggle("is-active", page.dataset.page === name));
    stepNumber.textContent = stepNumbers[name] || "—";
    stepName.textContent = stepNames[name] || name;
    renderProgressHistory();
    window.scrollTo({top:0, behavior:"instant"});
  }

  document.querySelectorAll("[data-progress-step]").forEach(button => {
    button.addEventListener("click", () => {
      const target = button.dataset.progressStep;
      if (target === "report") {
        if (!optimizationResult) return;
        renderReport();
        showPage("report");
        return;
      }
      const index = wizardOrder.indexOf(target);
      if (index < 0 || index > furthestWizardIndex) return;
      syncTechnicalForm();
      scheduleEditorialDraftSave(0);
      showPage(target);
    });
  });

  function validatePage(name) {
    const page = pages.find(p => p.dataset.page === name);
    if (!page) return true;
    const fields = [...page.querySelectorAll("input:not([type=hidden]),select")].filter(el => !el.disabled && !el.closest("[hidden]"));
    for (const field of fields) {
      if (field.matches("[data-decimal-input]")) {
        if (field.matches("[data-optional-advanced]") && String(field.value ?? "").trim() === "") {
          field.setCustomValidity("");
          continue;
        }
        const value = parseDecimal(field.value);
        const min = parseDecimal(field.dataset.min);
        const max = parseDecimal(field.dataset.max);
        field.setCustomValidity("");
        if (!Number.isFinite(value)) field.setCustomValidity("Introdu o valoare numerică.");
        else if (Number.isFinite(min) && value < min) field.setCustomValidity("Valoarea este prea mică.");
        else if (Number.isFinite(max) && value > max) field.setCustomValidity("Valoarea este prea mare.");
      }
      if (!field.checkValidity()) {
        const details = field.closest("details");
        if (details) details.open = true;
        field.reportValidity();
        return false;
      }
    }

    if (name === "systems") {
      const flow = optionalAdvancedNumber("advHeatingFlow");
      const ret = optionalAdvancedNumber("advHeatingReturn");
      const returnField = document.getElementById("advHeatingReturn");
      if (returnField) returnField.setCustomValidity("");
      if (flow !== null && ret !== null && ret >= flow) {
        const details = returnField?.closest("details");
        if (details) details.open = true;
        returnField?.setCustomValidity("Temperatura de retur trebuie să fie mai mică decât temperatura de tur.");
        returnField?.reportValidity();
        return false;
      }
    }
    return true;
  }

  function insulationLambda(materialId) {
    return INSULATION_LAMBDA_W_MK[materialId] || INSULATION_LAMBDA_W_MK.generic_040;
  }

  function insulationU(baseU, centimetres, lambda = 0.040) {
    const safeLambda = Number(lambda) > 0 ? Number(lambda) : 0.040;
    const baseR = 1 / Number(baseU);
    const addedR = Math.max(0, parseDecimal(centimetres, 0)) / 100 / safeLambda;
    return 1 / (baseR + addedR);
  }

  function wallBaseU() {
    const preset = WALL_STRUCTURE_PRESETS[$("#wallStructure").value] || WALL_STRUCTURE_PRESETS.unknown;
    if (!preset.lambda) return preset.fallbackU;
    const rawThickness = parseDecimal($("#wallStructureThickness").value);
    const thicknessCm = Number.isFinite(rawThickness) && rawThickness > 0
      ? Math.max(5, Math.min(80, rawThickness))
      : preset.defaultThicknessCm;
    return 1 / (WALL_SURFACE_RESISTANCE_M2K_W + (thicknessCm / 100) / preset.lambda);
  }

  function geometryValues() {
    const area = Math.max(parseDecimal($("#heatedArea").value, 0), 1);
    const levels = Math.max(1, Number($("#heatedLevels").value) || 1);
    const height = Math.max(parseDecimal($("#averageHeight").value, 0), 0.1);
    const windows = Math.max(parseDecimal($("#windowArea").value, 0), 0);
    const doors = 2.2;
    const footprint = area / levels;
    const aspect = 1.25;
    const width = Math.sqrt(footprint / aspect);
    const length = width * aspect;
    const perimeter = 2 * (length + width);
    const grossWalls = perimeter * height * levels;
    return {
      area,levels,height,windows,doors,footprint,width,length,perimeter,grossWalls,
      derivedWallArea:Math.max(1,grossWalls-windows-doors),
      derivedTopArea:footprint,
      derivedFloorArea:footprint,
      derivedVolume:area*height,
    };
  }

  function updateGeometryDisplay(force = false) {
    const g = geometryValues();
    const mappings = [
      ["#wallArea", g.derivedWallArea, 1],
      ["#roofArea", g.derivedTopArea, 1],
      ["#floorArea", g.derivedFloorArea, 1],
      ["#heatedVolume", g.derivedVolume, 0],
    ];
    mappings.forEach(([selector, value, digits]) => {
      const input = $(selector);
      if (!input) return;
      if (force || input.dataset.geomAuto !== "false") {
        input.dataset.geomAuto = "true";
        input.value = decimalForDisplay(value, digits);
      }
    });
    $("#derivedFootprint").textContent = fmt(g.footprint,1) + " m²";
    $("#derivedPerimeter").textContent = fmt(g.perimeter,1) + " m";
    $("#derivedGrossWalls").textContent = fmt(g.grossWalls,1) + " m²";
    $("#derivedOpenings").textContent = fmt(g.windows + g.doors,1) + " m²";
    return g;
  }

  function heatingChainDefaults(type) {
    if (type === "heat_pump") return {source:"heat_pump_air_water",emitter:"underfloor",distribution:"underfloor",storage:"none",control:"zoned"};
    if (type === "wood_stove") return {source:"",emitter:"local",distribution:"local",storage:"none",control:"manual"};
    if (type === "electric_resistance") return {source:"",emitter:"local",distribution:"local",storage:"none",control:"room_thermostat"};
    if (type === "pellet_boiler") return {source:"",emitter:"radiators_high_temp",distribution:"hydronic_insulated",storage:"buffer_small",control:"room_thermostat"};
    if (type === "district_heat") return {source:"",emitter:"radiators_high_temp",distribution:"hydronic_insulated",storage:"none",control:"thermostatic_valves"};
    return {source:"",emitter:"radiators_high_temp",distribution:"hydronic_insulated",storage:"none",control:"room_thermostat"};
  }

  function applyHeatingDefaults() {
    const type = $("#heatingChoice").value;
    const d = heatingChainDefaults(type);
    if (type === "heat_pump") $("#heatPumpSource").value = d.source;
    $("#heatingEmitter").value = d.emitter;
    $("#heatingDistribution").value = d.distribution;
    $("#heatingStorage").value = d.storage;
    $("#heatingControl").value = d.control;
    normalizeHeatingUi();
  }

  function normalizeHeatingUi() {
    const type = $("#heatingChoice").value;
    const source = $("#heatPumpSource").value;
    const localFixed = type === "wood_stove" || type === "electric_resistance";
    $("#heatPumpSourceField").hidden = type !== "heat_pump";

    const chainFields = [...document.querySelectorAll("[data-heating-chain-field]")];
    chainFields.forEach(el => { el.hidden = localFixed; });

    if (localFixed) {
      const d = heatingChainDefaults(type);
      $("#heatingEmitter").value = d.emitter;
      $("#heatingDistribution").value = d.distribution;
      $("#heatingStorage").value = d.storage;
      $("#heatingControl").value = d.control;
      return;
    }

    const airToAir = type === "heat_pump" && source === "heat_pump_air_air";
    if (airToAir) {
      $("#heatingEmitter").value = "air";
      $("#heatingDistribution").value = "air";
      $("#heatingStorage").value = "none";
    } else {
      const validEmitters = new Set(["radiators_high_temp","radiators_low_temp","underfloor","fan_coils"]);
      if (!validEmitters.has($("#heatingEmitter").value)) {
        $("#heatingEmitter").value = heatingChainDefaults(type).emitter;
      }
      if ($("#heatingEmitter").value === "underfloor") {
        $("#heatingDistribution").value = "underfloor";
      } else if (!["hydronic_insulated","hydronic_uninsulated"].includes($("#heatingDistribution").value)) {
        $("#heatingDistribution").value = "hydronic_insulated";
      }
    }

    const emitterField = $("#heatingEmitter").closest(".ed-field");
    const distributionField = $("#heatingDistribution").closest(".ed-field");
    const storageField = $("#heatingStorage").closest(".ed-field");
    emitterField.hidden = airToAir;
    distributionField.hidden = airToAir;
    storageField.hidden = airToAir;
  }

  function heatingGeneratorType() {
    const type = $("#heatingChoice").value;
    if (type === "heat_pump") return $("#heatPumpSource").value || "heat_pump_air_water";
    return {
      condensing_gas_boiler:"condensing_gas_boiler",
      gas_boiler:"gas_boiler",
      electric_resistance:"electric_direct",
      electric_boiler:"electric_boiler",
      district_heat:"district_heat",
      wood_stove:"wood_stove",
      wood_boiler:"wood_boiler",
      pellet_boiler:"pellet_boiler",
    }[type] || "custom";
  }

  function syncRenewableVisibility() {
    $("#pvFields").classList.toggle("is-disabled", !$("#pvEnabled").checked);
    $("#solarThermalFields").classList.toggle("is-disabled", !$("#solarThermalEnabled").checked);
  }

  function syncDerivedAdvancedFields() {
    const topBoundary = $("#topBoundary").value;
    const glazingU = {
      single_clear_glazing:5.0,
      double_clear_glazing:2.8,
      double_low_e_face_3:1.6,
      triple_low_e_faces_2_and_5:0.9,
    };
    // MC001-2022 Table 2.13 exact entries used by the project dataset.
    const glazingG = {
      single_clear_glazing:0.85,
      double_clear_glazing:0.75,
      double_low_e_face_3:0.65,
      triple_low_e_faces_2_and_5:0.50,
    };

    setAdvancedDerivedValue("advWallU", insulationU(
      wallBaseU(),
      $("#wallIns").value,
      insulationLambda($("#wallInsulationMaterial").value)
    ), 3);
    setAdvancedDerivedValue("advRoofU", insulationU(
      Number(TOP_BOUNDARY_BASE_U[topBoundary]) || TOP_BOUNDARY_BASE_U.unknown,
      $("#roofIns").value,
      insulationLambda($("#roofInsulationMaterial").value)
    ), 3);
    setAdvancedDerivedValue("advFloorU", insulationU(
      0.90,
      $("#floorIns").value,
      insulationLambda($("#floorInsulationMaterial").value)
    ), 3);
    setAdvancedDerivedValue("advWindowU", glazingU[$("#glazing").value] || 1.6, 2);
    setAdvancedDerivedValue("advBridgePsi", 0.08, 2);
    setAdvancedDerivedValue("advGroundConductivity", $("#floorBoundary").value === "ground" ? 2.0 : NaN, 1);
    setAdvancedDerivedValue("advSolarGn", glazingG[$("#glazing").value], 2);

    const ventilation = $("#ventilation").value;
    const ach = ventilation === "mechanical" ? 0.65 : 0.5;
    const recovery = ventilation === "hrv" ? 75 : 0;
    setAdvancedDerivedValue("advAch", ach, 2);
    setAdvancedDerivedValue("advInfiltrationAch", 0, 2);
    setAdvancedDerivedValue("advHeatRecovery", recovery, 0);

    const emitter = $("#heatingEmitter").value;
    const emitterTemperatures = {
      radiators_high_temp:[60,45],
      radiators_low_temp:[45,35],
      underfloor:[35,30],
      fan_coils:[45,40],
    };
    const temps = emitterTemperatures[emitter] || null;
    setAdvancedDerivedValue("advHeatingFlow", temps ? temps[0] : NaN, 0);
    setAdvancedDerivedValue("advHeatingReturn", temps ? temps[1] : NaN, 0);

    const choice = $("#heatingChoice").value;
    const generator = heatingGeneratorType();
    const auxByGenerator = {
      gas_boiler:120,
      condensing_gas_boiler:120,
      electric_direct:0,
      electric_boiler:120,
      heat_pump_air_water:220,
      heat_pump_ground_water:220,
      heat_pump_air_air:30,
      district_heat:120,
      wood_stove:0,
      wood_boiler:120,
      pellet_boiler:180,
    };
    setAdvancedDerivedValue("advHeatingAux", auxByGenerator[generator] ?? 0, 0);

    if (choice === "heat_pump") {
      const scopByEmitter = {
        local:3.0,
        radiators_high_temp:2.3,
        radiators_low_temp:2.8,
        underfloor:3.2,
        fan_coils:2.8,
        air:3.0,
      };
      const sourceFactor = {
        heat_pump_air_water:1.0,
        heat_pump_ground_water:1.2,
        heat_pump_air_air:1.0,
      };
      setAdvancedDerivedValue(
        "advHeatingScop",
        (scopByEmitter[emitter] || 3.0) * (sourceFactor[generator] || 1.0),
        2
      );
      setAdvancedDerivedValue("advHeatingEfficiency", NaN, 0);
    } else {
      const efficiencyPct = {
        condensing_gas_boiler:94,
        gas_boiler:85,
        electric_resistance:100,
        electric_boiler:98,
        district_heat:95,
        wood_stove:75,
        wood_boiler:80,
        pellet_boiler:88,
      };
      setAdvancedDerivedValue("advHeatingEfficiency", efficiencyPct[choice], 0);
      setAdvancedDerivedValue("advHeatingScop", NaN, 2);
    }

    const cooling = $("#cooling").value;
    setAdvancedDerivedValue("advCoolingSeer", cooling === "none" ? NaN : (cooling === "split" ? 4.2 : 4.0), 1);
    setAdvancedDerivedValue("advCoolingSetpoint", cooling === "none" ? NaN : 26, 0);

    const dhw = $("#dhwSystem").value;
    let dhwEfficiency = NaN;
    let dhwCop = NaN;
    if (dhw === "electric_boiler") dhwEfficiency = 98;
    else if (dhw === "gas_boiler") dhwEfficiency = 88;
    else if (dhw === "heat_pump_water_heater") dhwCop = 2.4;
    else if (dhw === "district_heat") dhwEfficiency = 95;
    else if (dhw === "same_as_heating") {
      if (choice === "heat_pump") dhwCop = 2.4;
      else {
        dhwEfficiency = {
          condensing_gas_boiler:88,
          gas_boiler:88,
          electric_resistance:98,
          electric_boiler:98,
          district_heat:95,
          wood_stove:75,
          wood_boiler:80,
          pellet_boiler:88,
        }[choice];
      }
    }
    setAdvancedDerivedValue("advDhwEfficiency", dhwEfficiency, 0);
    setAdvancedDerivedValue("advDhwCop", dhwCop, 1);
    setAdvancedDerivedValue("advDhwLitres", 50, 0);

    setAdvancedDerivedValue("advPvPerformanceRatio", 82, 0);
    setAdvancedDerivedValue("advSolarThermalEfficiency", 45, 0);
  }

  function heatingExpertProfile() {
    const choice = $("#heatingChoice").value;
    return {
      condensing_gas_boiler:{systemType:"condensing_gas_boiler",carrier:"natural_gas",costProfile:"natural_gas"},
      gas_boiler:{systemType:"gas_boiler",carrier:"natural_gas",costProfile:"natural_gas"},
      heat_pump:{systemType:"heat_pump",carrier:"electricity",costProfile:"electricity"},
      district_heat:{systemType:"district_heat",carrier:"district_heat",costProfile:"district_heat"},
      electric_resistance:{systemType:"electric_resistance",carrier:"electricity",costProfile:"electricity"},
      electric_boiler:{systemType:"custom",carrier:"electricity",costProfile:"electricity"},
      wood_stove:{systemType:"custom",carrier:"biomass",costProfile:"firewood"},
      wood_boiler:{systemType:"custom",carrier:"biomass",costProfile:"firewood"},
      pellet_boiler:{systemType:"custom",carrier:"biomass",costProfile:"pellets"},
    }[choice] || {systemType:"custom",carrier:"other",costProfile:"other"};
  }

  function dhwCarrierFromUi() {
    const dhw = $("#dhwSystem").value;
    if (dhw === "electric_boiler" || dhw === "heat_pump_water_heater") return "electricity";
    if (dhw === "gas_boiler") return "natural_gas";
    if (dhw === "district_heat") return "district_heat";
    return heatingExpertProfile().carrier;
  }

  function syncTechnicalForm() {
    syncDerivedAdvancedFields();
    const g = updateGeometryDisplay(false);
    setValue("techLength", g.length.toFixed(3));
    setValue("techWidth", g.width.toFixed(3));
    setValue("techHouseWindows", g.windows);
    setValue("techGroundPerimeter", g.perimeter.toFixed(3));
    setValue("techGroundWallThickness", (Math.max(parseDecimal($("#wallStructureThickness").value, 30), 1) / 100).toFixed(3));
    setValue("techBridgeLength", (g.perimeter * g.levels).toFixed(3));

    const topBoundary = $("#topBoundary").value;
    const floorBoundary = $("#floorBoundary").value;
    setValue("techRoofBoundary", topBoundary === "cold_attic" ? "unheated_attic" : "outside_air");
    setValue("techFloorBoundary", {
      ground:"ground",
      unheated_basement:"unheated_basement",
      outside_air:"outside_air",
      heated_space:"adjacent_heated_space",
    }[floorBoundary] || "ground");

    const glazingU = {
      single_clear_glazing:5.0,
      double_clear_glazing:2.8,
      double_low_e_face_3:1.6,
      triple_low_e_faces_2_and_5:0.9,
    };
    const derivedWallU = insulationU(
      wallBaseU(),
      $("#wallIns").value,
      insulationLambda($("#wallInsulationMaterial").value)
    );
    const derivedRoofU = insulationU(
      Number(TOP_BOUNDARY_BASE_U[topBoundary]) || TOP_BOUNDARY_BASE_U.unknown,
      $("#roofIns").value,
      insulationLambda($("#roofInsulationMaterial").value)
    );
    const derivedFloorU = insulationU(
      0.90,
      $("#floorIns").value,
      insulationLambda($("#floorInsulationMaterial").value)
    );

    setValue("techWallU", (optionalAdvancedNumber("advWallU") ?? derivedWallU).toFixed(4));
    setValue("techRoofU", (optionalAdvancedNumber("advRoofU") ?? derivedRoofU).toFixed(4));
    setValue("techFloorU", (optionalAdvancedNumber("advFloorU") ?? derivedFloorU).toFixed(4));
    setValue("techWindowU", optionalAdvancedNumber("advWindowU") ?? (glazingU[$("#glazing").value] || 1.6));
    setValue("techBridgePsi", optionalAdvancedNumber("advBridgePsi") ?? 0.08);
    setValue("techGroundConductivity", optionalAdvancedNumber("advGroundConductivity") ?? "");
    setValue("techSolarGn", optionalAdvancedNumber("advSolarGn") ?? "");

    const ventilation = $("#ventilation").value;
    let ach = 0.5;
    let recovery = 0;
    if (ventilation === "hrv") {
      ach = 0.5; recovery = 0.75;
    } else if (ventilation === "mechanical") {
      ach = 0.65; recovery = 0;
    }
    setValue("techAch", optionalAdvancedNumber("advAch") ?? ach);
    setValue("techInfiltrationAch", optionalAdvancedNumber("advInfiltrationAch") ?? 0);
    const advancedRecovery = optionalAdvancedNumber("advHeatRecovery");
    setValue("techHeatRecovery", advancedRecovery === null ? recovery : advancedRecovery / 100);

    normalizeHeatingUi();
    setValue("techHeatingGenerator", heatingGeneratorType());
    setValue("techHeatingEmitter", $("#heatingEmitter").value);
    setValue("techHeatingDistribution", $("#heatingDistribution").value);
    setValue("techHeatingStorage", $("#heatingStorage").value);
    setValue("techHeatingControl", $("#heatingControl").value);
    setValue("techHeatingFlow", optionalAdvancedNumber("advHeatingFlow") ?? "");
    setValue("techHeatingReturn", optionalAdvancedNumber("advHeatingReturn") ?? "");
    setValue("techHeatingAux", optionalAdvancedNumber("advHeatingAux") ?? "");

    const heatingProfile = heatingExpertProfile();
    const advancedEfficiency = optionalAdvancedNumber("advHeatingEfficiency");
    const advancedScop = optionalAdvancedNumber("advHeatingScop");
    const useHeatingExpert = $("#heatingChoice").value === "heat_pump"
      ? advancedScop !== null
      : advancedEfficiency !== null;
    setValue("techHeatingExpert", useHeatingExpert ? "on" : "");
    setValue("techHeatingSystemType", useHeatingExpert ? heatingProfile.systemType : "");
    setValue("techHeatingCarrier", useHeatingExpert ? heatingProfile.carrier : "");
    setValue("techHeatingCostProfile", useHeatingExpert ? heatingProfile.costProfile : "");
    setValue("techHeatingEfficiency", useHeatingExpert && $("#heatingChoice").value !== "heat_pump" ? advancedEfficiency / 100 : "");
    setValue("techHeatingScop", useHeatingExpert && $("#heatingChoice").value === "heat_pump" ? advancedScop : "");

    const cooling = $("#cooling").value;
    setValue("techCoolingEnabled", cooling === "none" ? "" : "on");
    setValue("techCoolingSeer", optionalAdvancedNumber("advCoolingSeer") ?? (cooling === "split" ? 4.2 : 4.0));
    setValue("techCoolingSetpoint", optionalAdvancedNumber("advCoolingSetpoint") ?? 26);

    const advancedDhwEfficiency = optionalAdvancedNumber("advDhwEfficiency");
    const advancedDhwCop = optionalAdvancedNumber("advDhwCop");
    const useDhwExpert = advancedDhwEfficiency !== null || advancedDhwCop !== null;
    setValue("techDhwExpert", useDhwExpert ? "on" : "");
    setValue("techDhwEfficiency", useDhwExpert && advancedDhwCop === null ? advancedDhwEfficiency / 100 : "");
    setValue("techDhwCop", useDhwExpert && advancedDhwCop !== null ? advancedDhwCop : "");
    setValue("techDhwCarrier", useDhwExpert ? dhwCarrierFromUi() : "");
    setValue("techDhwLitres", optionalAdvancedNumber("advDhwLitres") ?? 50);

    const advancedPvPr = optionalAdvancedNumber("advPvPerformanceRatio");
    setValue("techPvPerformanceRatio", advancedPvPr === null ? 0.82 : advancedPvPr / 100);
    const advancedSolarThermal = optionalAdvancedNumber("advSolarThermalEfficiency");
    setValue("techSolarThermalEfficiency", advancedSolarThermal === null ? 0.45 : advancedSolarThermal / 100);

    setValue("techSolarGlazing", $("#glazing").value);
    setValue("techSolarOrientation", $("#orientation").value);
  }

  document.querySelectorAll("[data-next]").forEach(button => {
    button.addEventListener("click", () => {
      syncTechnicalForm();
      if (!validatePage(current)) return;
      const i = wizardOrder.indexOf(current);
      if (i >= 0 && i < wizardOrder.length - 1) showPage(wizardOrder[i + 1]);
    });
  });
  document.querySelectorAll("[data-back]").forEach(button => {
    button.addEventListener("click", () => {
      const i = wizardOrder.indexOf(current);
      if (i > 0) showPage(wizardOrder[i - 1]);
    });
  });

  document.querySelectorAll("[data-choice-group]").forEach(group => {
    const field = form.querySelector(`[name="${group.dataset.choiceGroup}"]`);
    group.querySelectorAll("button[data-value]").forEach(button => {
      button.addEventListener("click", () => {
        group.querySelectorAll("button").forEach(x => x.classList.remove("is-selected"));
        button.classList.add("is-selected");
        field.value = button.dataset.value;
        if (group.dataset.choiceGroup === "_optimization_mode") syncGoalField();
        scheduleEditorialDraftSave();
      });
    });
  });

  const goalWrap = $("#goalValueWrap");
  const goalValue = $("#goalValue");
  const goalLabel = $("#goalValueLabel");
  const goalUnit = $("#goalValueUnit");

  function syncGoalField() {
    const mode = form.elements["_optimization_mode"].value;
    goalValue.removeAttribute("name");
    goalWrap.hidden = mode === "auto_economic";
    if (mode === "investment_budget") {
      goalValue.name = "_investment_budget_lei";
      goalLabel.textContent = "Buget maxim";
      goalUnit.textContent = "lei";
      goalValue.step = "1000"; goalValue.min = "1000"; goalValue.removeAttribute("max");
      if (!goalValue.value) goalValue.value = "50000";
    } else if (mode === "annual_bill_target") {
      goalValue.name = "_annual_bill_target_lei";
      goalLabel.textContent = "Factură anuală țintă";
      goalUnit.textContent = "lei/an";
      goalValue.step = "100"; goalValue.min = "0"; goalValue.removeAttribute("max");
      if (!goalValue.value) goalValue.value = "3000";
    } else if (mode === "max_payback_years") {
      goalValue.name = "_max_payback_years";
      goalLabel.textContent = "Recuperare în maximum";
      goalUnit.textContent = "ani";
      goalValue.step = "0.5"; goalValue.min = "0.5"; goalValue.max = "50";
      if (!goalValue.value) goalValue.value = "10";
    }
  }

  function walkMapCoordinates(value, visit) {
    if (Array.isArray(value) && value.length >= 2 && Number.isFinite(value[0]) && Number.isFinite(value[1])) {
      visit(value);
      return;
    }
    if (Array.isArray(value)) value.forEach(item => walkMapCoordinates(item, visit));
  }

  function createLocationProjection(data) {
    const bounds = {minLon:Infinity,maxLon:-Infinity,minLat:Infinity,maxLat:-Infinity};
    [data?.climateZones, data?.romaniaBoundary].forEach(collection => {
      (collection?.features || []).forEach(feature => {
        walkMapCoordinates(feature.geometry?.coordinates, ([lon, lat]) => {
          bounds.minLon = Math.min(bounds.minLon, lon);
          bounds.maxLon = Math.max(bounds.maxLon, lon);
          bounds.minLat = Math.min(bounds.minLat, lat);
          bounds.maxLat = Math.max(bounds.maxLat, lat);
        });
      });
    });
    if (!Number.isFinite(bounds.minLon)) return null;
    const width = 760;
    const height = 390;
    const pad = 15;
    const midLat = (bounds.minLat + bounds.maxLat) / 2;
    const lonScale = Math.cos(midLat * Math.PI / 180);
    const spanX = Math.max((bounds.maxLon - bounds.minLon) * lonScale, 0.01);
    const spanY = Math.max(bounds.maxLat - bounds.minLat, 0.01);
    const scale = Math.min((width - 2 * pad) / spanX, (height - 2 * pad) / spanY);
    const projectedWidth = spanX * scale;
    const projectedHeight = spanY * scale;
    const offsetX = (width - projectedWidth) / 2;
    const offsetY = (height - projectedHeight) / 2;
    return {
      width,height,
      project(lon,lat) {
        return [
          offsetX + (lon - bounds.minLon) * lonScale * scale,
          offsetY + (bounds.maxLat - lat) * scale,
        ];
      },
    };
  }

  function mapGeometryPath(geometry, projection) {
    const polygons = geometry?.type === "Polygon"
      ? [geometry.coordinates || []]
      : geometry?.type === "MultiPolygon"
        ? geometry.coordinates || []
        : [];
    const parts = [];
    polygons.forEach(polygon => polygon.forEach(ring => {
      if (!ring.length) return;
      parts.push(ring.map((point,index) => {
        const [x,y] = projection.project(point[0],point[1]);
        return `${index ? "L" : "M"}${x.toFixed(1)} ${y.toFixed(1)}`;
      }).join(" ") + " Z");
    }));
    return parts.join(" ");
  }

  function mapGeometryOuterOutlinePath(geometry, projection) {
    const polygons = geometry?.type === "Polygon"
      ? [geometry.coordinates || []]
      : geometry?.type === "MultiPolygon"
        ? geometry.coordinates || []
        : [];
    const parts = [];
    polygons.forEach(polygon => {
      const ring = polygon?.[0] || [];
      if (!ring.length) return;
      parts.push(ring.map((point,index) => {
        const [x,y] = projection.project(point[0],point[1]);
        return `${index ? "L" : "M"}${x.toFixed(1)} ${y.toFixed(1)}`;
      }).join(" ") + " Z");
    });
    return parts.join(" ");
  }

  function localityTier(locality) {
    const population = Number(locality.population2002) || 0;
    const rank = String(locality.rank ?? "");
    if (rank === "0" || rank === "I" || population >= 200000) return 1;
    if (rank === "II" || population >= 55000) return 2;
    if (rank === "III" || population >= 12000) return 3;
    return 4;
  }

  function initializeProjectedLocalities() {
    if (!locationProjection) {
      projectedLocalities = [];
      return;
    }
    projectedLocalities = localities
      .filter(item => Number.isFinite(item.lon) && Number.isFinite(item.lat))
      .map(item => {
        const [x,y] = locationProjection.project(item.lon,item.lat);
        return {item,x,y,tier:localityTier(item)};
      });
  }

  function resetMapView() {
    if (!locationProjection) return;
    mapView.zoom = MAP_MIN_ZOOM;
    mapView.centerX = locationProjection.width / 2;
    mapView.centerY = locationProjection.height / 2;
  }

  function clampMapView() {
    if (!locationProjection) return;
    mapView.zoom = Math.max(MAP_MIN_ZOOM, Math.min(MAP_MAX_ZOOM, Number(mapView.zoom) || MAP_MIN_ZOOM));
    const width = locationProjection.width / mapView.zoom;
    const height = locationProjection.height / mapView.zoom;
    const halfWidth = width / 2;
    const halfHeight = height / 2;
    mapView.centerX = Math.max(halfWidth, Math.min(locationProjection.width - halfWidth, Number(mapView.centerX) || locationProjection.width / 2));
    mapView.centerY = Math.max(halfHeight, Math.min(locationProjection.height - halfHeight, Number(mapView.centerY) || locationProjection.height / 2));
  }

  function currentMapViewBox() {
    if (!locationProjection) return {x:0,y:0,width:760,height:390};
    if (!Number.isFinite(mapView.centerX) || !Number.isFinite(mapView.centerY)) resetMapView();
    clampMapView();
    const width = locationProjection.width / mapView.zoom;
    const height = locationProjection.height / mapView.zoom;
    return {
      x:mapView.centerX - width / 2,
      y:mapView.centerY - height / 2,
      width,
      height,
    };
  }

  function localityTierLimitForZoom() {
    if (mapView.zoom < 1.6) return 2;
    if (mapView.zoom < 3.2) return 3;
    return 4;
  }

  function visibleMapLocalities(selectedId) {
    if (!locationProjection) return [];
    if (!projectedLocalities.length) initializeProjectedLocalities();
    const box = currentMapViewBox();
    const maxTier = localityTierLimitForZoom();
    const selectedKey = String(selectedId ?? "");
    const margin = 26 / mapView.zoom;
    const candidates = projectedLocalities
      .filter(entry =>
        String(entry.item.id) === selectedKey ||
        (
          entry.tier <= maxTier &&
          entry.x >= box.x - margin &&
          entry.x <= box.x + box.width + margin &&
          entry.y >= box.y - margin &&
          entry.y <= box.y + box.height + margin
        )
      )
      .sort((a,b) => {
        if (String(a.item.id) === selectedKey) return -1;
        if (String(b.item.id) === selectedKey) return 1;
        return a.tier - b.tier || Number(b.item.importance || 0) - Number(a.item.importance || 0);
      });

    const mobile = window.innerWidth <= 720;
    const maxMarkers = mobile
      ? (mapView.zoom < 1.6 ? 40 : mapView.zoom < 3.2 ? 110 : 220)
      : (mapView.zoom < 1.6 ? 70 : mapView.zoom < 3.2 ? 190 : 360);
    const cellSize = (mobile ? 22 : 18) / mapView.zoom;
    const occupied = new Set();
    const accepted = [];

    function cellKey(cx,cy) {
      return `${cx}:${cy}`;
    }

    for (const entry of candidates) {
      const selectedEntry = String(entry.item.id) === selectedKey;
      const cx = Math.floor((entry.x - box.x) / cellSize);
      const cy = Math.floor((entry.y - box.y) / cellSize);
      const blocked = !selectedEntry && occupied.has(cellKey(cx,cy));
      if (blocked) continue;
      occupied.add(cellKey(cx,cy));
      accepted.push({...entry, showLabel:selectedEntry || entry.tier < maxTier || mapView.zoom >= 4.4});
      if (accepted.length >= maxMarkers && !selectedEntry) break;
    }
    return accepted;
  }

  function climateZoneLegendEntries() {
    const order = ["I","II","III","IV","V"];
    const byZone = new Map();
    (locationData?.climateZones?.features || []).forEach(feature => {
      const zone = String(feature.properties?.zone || "");
      if (!zone || byZone.has(zone)) return;
      byZone.set(zone, {
        zone,
        temperature:Number(feature.properties?.design_temperature_c),
      });
    });
    return order.map(zone => byZone.get(zone)).filter(Boolean);
  }

  function scheduleMapRender() {
    if (mapRenderFrame) return;
    mapRenderFrame = requestAnimationFrame(() => {
      mapRenderFrame = 0;
      renderLocationMap();
    });
  }

  function applyMapZoom(nextZoom, clientX = null, clientY = null) {
    if (!locationProjection) return;
    const target = $("#edLocationMap");
    const svg = target?.querySelector("svg.ed-location-map-svg");
    const oldBox = currentMapViewBox();
    let ratioX = 0.5;
    let ratioY = 0.5;
    if (svg && Number.isFinite(clientX) && Number.isFinite(clientY)) {
      const rect = svg.getBoundingClientRect();
      if (rect.width && rect.height) {
        ratioX = Math.max(0, Math.min(1, (clientX - rect.left) / rect.width));
        ratioY = Math.max(0, Math.min(1, (clientY - rect.top) / rect.height));
      }
    }
    const worldX = oldBox.x + ratioX * oldBox.width;
    const worldY = oldBox.y + ratioY * oldBox.height;
    mapView.zoom = Math.max(MAP_MIN_ZOOM, Math.min(MAP_MAX_ZOOM, nextZoom));
    const width = locationProjection.width / mapView.zoom;
    const height = locationProjection.height / mapView.zoom;
    mapView.centerX = worldX + (0.5 - ratioX) * width;
    mapView.centerY = worldY + (0.5 - ratioY) * height;
    clampMapView();
    scheduleMapRender();
  }

  function panMapFromDrag(clientX, clientY) {
    if (!mapDrag || !locationProjection) return;
    const svg = $("#edLocationMap")?.querySelector("svg.ed-location-map-svg");
    if (!svg) return;
    const rect = svg.getBoundingClientRect();
    if (!rect.width || !rect.height) return;
    const dx = clientX - mapDrag.startX;
    const dy = clientY - mapDrag.startY;
    if (Math.hypot(dx,dy) > 3) mapDrag.moved = true;
    mapView.centerX = mapDrag.startCenterX - dx * (mapDrag.startBox.width / rect.width);
    mapView.centerY = mapDrag.startCenterY - dy * (mapDrag.startBox.height / rect.height);
    clampMapView();
    const box = currentMapViewBox();
    svg.setAttribute("viewBox", `${box.x.toFixed(2)} ${box.y.toFixed(2)} ${box.width.toFixed(2)} ${box.height.toFixed(2)}`);
  }

  function touchDistance(touchA, touchB) {
    return Math.hypot(touchB.clientX - touchA.clientX, touchB.clientY - touchA.clientY);
  }

  function touchMidpoint(touchA, touchB) {
    return {
      x:(touchA.clientX + touchB.clientX) / 2,
      y:(touchA.clientY + touchB.clientY) / 2,
    };
  }

  function beginMapPinch(event) {
    if (!locationProjection || event.touches.length < 2) return;
    const svg = $("#edLocationMap")?.querySelector("svg.ed-location-map-svg");
    if (!svg) return;
    const rect = svg.getBoundingClientRect();
    if (!rect.width || !rect.height) return;
    const midpoint = touchMidpoint(event.touches[0], event.touches[1]);
    const box = currentMapViewBox();
    const ratioX = Math.max(0, Math.min(1, (midpoint.x - rect.left) / rect.width));
    const ratioY = Math.max(0, Math.min(1, (midpoint.y - rect.top) / rect.height));
    mapPinch = {
      startDistance:Math.max(touchDistance(event.touches[0], event.touches[1]), 1),
      startZoom:mapView.zoom,
      worldX:box.x + ratioX * box.width,
      worldY:box.y + ratioY * box.height,
    };
    mapDrag = null;
    svg.classList.add("is-panning");
  }

  function updateMapPinch(event) {
    if (!mapPinch || !locationProjection || event.touches.length < 2) return;
    const svg = $("#edLocationMap")?.querySelector("svg.ed-location-map-svg");
    if (!svg) return;
    const rect = svg.getBoundingClientRect();
    if (!rect.width || !rect.height) return;
    const midpoint = touchMidpoint(event.touches[0], event.touches[1]);
    const distance = Math.max(touchDistance(event.touches[0], event.touches[1]), 1);
    const nextZoom = Math.max(MAP_MIN_ZOOM, Math.min(MAP_MAX_ZOOM, mapPinch.startZoom * distance / mapPinch.startDistance));
    const ratioX = Math.max(0, Math.min(1, (midpoint.x - rect.left) / rect.width));
    const ratioY = Math.max(0, Math.min(1, (midpoint.y - rect.top) / rect.height));
    const width = locationProjection.width / nextZoom;
    const height = locationProjection.height / nextZoom;
    mapView.zoom = nextZoom;
    mapView.centerX = mapPinch.worldX + (0.5 - ratioX) * width;
    mapView.centerY = mapPinch.worldY + (0.5 - ratioY) * height;
    clampMapView();
    const box = currentMapViewBox();
    svg.setAttribute("viewBox", `${box.x.toFixed(2)} ${box.y.toFixed(2)} ${box.width.toFixed(2)} ${box.height.toFixed(2)}`);
  }

  function finishMapPinch() {
    if (!mapPinch) return;
    mapPinch = null;
    mapSuppressClickUntil = performance.now() + 260;
    $("#edLocationMap")?.querySelector("svg.ed-location-map-svg")?.classList.remove("is-panning");
    scheduleMapRender();
  }

  function renderLocationMap() {
    const target = $("#edLocationMap");
    if (!target) return;
    if (!locationData || !locationProjection) {
      target.innerHTML = "<p>Se încarcă harta…</p>";
      return;
    }
    if (!Number.isFinite(mapView.centerX)) resetMapView();
    const box = currentMapViewBox();
    const selected = localityMap.get(String($("#localityId").value));
    const selectedId = selected?.id;
    const selectedZone = String(selected?.climateZone || "");
    const climateFeatures = locationData.climateZones?.features || [];
    const zonePaths = climateFeatures.map(feature => {
      const zone = String(feature.properties?.zone || "");
      const temp = Number(feature.properties?.design_temperature_c);
      const title = Number.isFinite(temp) ? `Zona ${zone} · ${String(temp).replace("-", "−")}°C` : `Zona ${zone}`;
      return `<path class="ed-map-zone zone-${escapeHtml(zone)}${zone === selectedZone ? " is-selected" : ""}" data-climate-zone="${escapeHtml(zone)}" d="${mapGeometryPath(feature.geometry,locationProjection)}"><title>${escapeHtml(title)}</title></path>`;
    }).join("");
    const boundary = (locationData.romaniaBoundary?.features || []).map(feature =>
      `<path class="ed-map-boundary" d="${mapGeometryPath(feature.geometry,locationProjection)}"></path>`
    ).join("");
    const selectedOutline = selectedZone
      ? climateFeatures
          .filter(feature => String(feature.properties?.zone || "") === selectedZone)
          .map(feature => `<path class="ed-map-zone-outline" data-selected-zone="${escapeHtml(selectedZone)}" d="${mapGeometryOuterOutlinePath(feature.geometry,locationProjection)}"></path>`)
          .join("")
      : "";
    const markers = visibleMapLocalities(selectedId).map(marker => {
      const selectedMarker = String(marker.item.id) === String(selectedId);
      const inverseZoom = 1 / mapView.zoom;
      const baseRadius = selectedMarker ? 5.2 : marker.tier === 1 ? 3.6 : marker.tier === 2 ? 3.0 : 2.5;
      const radius = baseRadius * inverseZoom;
      const textX = (baseRadius + 5) * inverseZoom;
      const textY = -2 * inverseZoom;
      const fontSize = 9 * inverseZoom;
      const textStroke = 3 * inverseZoom;
      const label = marker.showLabel
        ? `<text x="${textX.toFixed(2)}" y="${textY.toFixed(2)}" style="font-size:${fontSize.toFixed(2)}px;stroke-width:${textStroke.toFixed(2)}px">${escapeHtml(marker.item.name)}</text>`
        : "";
      return `<g class="ed-map-locality tier-${marker.tier}${selectedMarker ? " is-selected" : ""}" data-map-locality-id="${escapeHtml(marker.item.id)}" data-climate-zone="${escapeHtml(marker.item.climateZone || "")}" transform="translate(${marker.x.toFixed(1)} ${marker.y.toFixed(1)})"><circle r="${radius.toFixed(2)}"></circle>${label}</g>`;
    }).join("");
    const legend = climateZoneLegendEntries().map(entry => {
      const temperature = Number.isFinite(entry.temperature)
        ? String(entry.temperature).replace("-", "−") + "°C"
        : "—";
      return `<span class="ed-map-legend-item zone-${escapeHtml(entry.zone)}"><i aria-hidden="true"></i><b>${escapeHtml(entry.zone)}</b><em>${escapeHtml(temperature)}</em></span>`;
    }).join("");
    const zoomLabel = Math.abs(mapView.zoom - 1) < 0.05 ? "1×" : mapView.zoom.toFixed(1).replace(".0","") + "×";
    target.innerHTML = `
      <div class="ed-map-stage">
        <svg class="ed-location-map-svg" viewBox="${box.x.toFixed(2)} ${box.y.toFixed(2)} ${box.width.toFixed(2)} ${box.height.toFixed(2)}" preserveAspectRatio="xMidYMid meet" aria-label="Harta climatică a României" tabindex="0">
          <g class="ed-map-zones">${zonePaths}</g>
          <g class="ed-map-boundaries">${boundary}</g>
          <g class="ed-map-selected-zone">${selectedOutline}</g>
          <g class="ed-map-localities">${markers}</g>
        </svg>
        <div class="ed-map-controls" aria-label="Zoom hartă">
          <button type="button" data-map-zoom="in" aria-label="Mărește harta">+</button>
          <button type="button" data-map-zoom="reset" class="ed-map-zoom-value" aria-label="Resetează harta">${zoomLabel}</button>
          <button type="button" data-map-zoom="out" aria-label="Micșorează harta">−</button>
        </div>
        <div class="ed-map-nav-hint">Trage pentru deplasare · două degete / rotiță / ± pentru zoom</div>
      </div>
      <div class="ed-map-caption">
        <div class="ed-map-legend" aria-label="Legendă zone climatice">${legend}</div>
      </div>
    `;
  }

  function renderLocalitySuggestions(query) {
    const target = $("#edLocalitySuggestions");
    if (!target) return;
    const q = normalizeSearch(query);
    if (q.length < 2 || !localities.length) {
      target.hidden = true;
      target.innerHTML = "";
      return;
    }
    const hits = localities
      .filter(item => normalizeSearch(item.search || `${item.name} ${item.county || ""} ${item.uatName || ""}`).includes(q))
      .sort((a,b) => Number(b.importance || 0) - Number(a.importance || 0))
      .slice(0,8);
    target.innerHTML = hits.map(item => `
      <button type="button" data-locality-id="${escapeHtml(item.id)}">
        <span><strong>${escapeHtml(item.name)}</strong><small>${escapeHtml(item.county || "")}${item.uatName && item.uatName !== item.name ? " · " + escapeHtml(item.uatName) : ""}</small></span>
        <em>${item.climateZone ? "Zona " + escapeHtml(item.climateZone) : ""}</em>
      </button>
    `).join("");
    target.hidden = !hits.length;
  }

  function selectLocality(locality) {
    if (!locality) return;
    $("#localityId").value = locality.id;
    $("#localityInput").value = locality.name;
    $("#edLocationMeta").textContent =
      `${locality.county || ""}${locality.climateZone ? " · zona climatică " + locality.climateZone : ""}${locality.stationName ? " · " + locality.stationName : ""}`;
    $("#edLocalitySuggestions").hidden = true;
    $("#edMapSuggestions").hidden = true;
    renderLocationMap();
    scheduleBaselineSummary(120);
    scheduleEditorialDraftSave();
  }

  function nearestMapLocalities(event, limit = 5) {
    const svg = event.target.closest("svg.ed-location-map-svg");
    if (!svg || !locationProjection) return [];
    const rect = svg.getBoundingClientRect();
    if (!rect.width || !rect.height) return [];
    const box = currentMapViewBox();
    const x = box.x + ((event.clientX - rect.left) / rect.width) * box.width;
    const y = box.y + ((event.clientY - rect.top) / rect.height) * box.height;
    if (!projectedLocalities.length) initializeProjectedLocalities();
    return projectedLocalities
      .map(entry => ({item:entry.item,distance:Math.hypot(entry.x-x,entry.y-y)}))
      .sort((a,b) => a.distance-b.distance || Number(b.item.importance || 0)-Number(a.item.importance || 0))
      .slice(0,limit)
      .map(entry => entry.item);
  }

  function renderMapSuggestions(items) {
    const target = $("#edMapSuggestions");
    target.innerHTML = items.map(item => `<button type="button" data-map-locality-id="${escapeHtml(item.id)}"><strong>${escapeHtml(item.name)}</strong><small>${escapeHtml(item.county || "")}</small></button>`).join("");
    target.hidden = !items.length;
  }

  $("#localityInput").addEventListener("input", event => {
    $("#localityId").value = "";
    $("#edLocationMeta").textContent = "Alege o sugestie pentru a fixa profilul climatic.";
    renderLocalitySuggestions(event.target.value);
    renderLocationMap();
  });
  $("#localityInput").addEventListener("focus", event => renderLocalitySuggestions(event.target.value));
  $("#edLocalitySuggestions").addEventListener("click", event => {
    const button = event.target.closest("[data-locality-id]");
    if (!button) return;
    selectLocality(localityMap.get(String(button.dataset.localityId)));
  });
  $("#edLocationMap").addEventListener("click", event => {
    const zoomControl = event.target.closest("[data-map-zoom]");
    if (zoomControl) {
      const action = zoomControl.dataset.mapZoom;
      if (action === "in") applyMapZoom(mapView.zoom * 1.45);
      else if (action === "out") applyMapZoom(mapView.zoom / 1.45);
      else {
        resetMapView();
        scheduleMapRender();
      }
      return;
    }
    if (performance.now() < mapSuppressClickUntil) return;
    const marker = event.target.closest("[data-map-locality-id]");
    if (marker) {
      selectLocality(localityMap.get(String(marker.dataset.mapLocalityId)));
      return;
    }
    if (event.target.closest("svg.ed-location-map-svg")) renderMapSuggestions(nearestMapLocalities(event));
  });
  $("#edLocationMap").addEventListener("wheel", event => {
    if (!event.target.closest("svg.ed-location-map-svg")) return;
    event.preventDefault();
    const factor = event.deltaY < 0 ? 1.18 : 1 / 1.18;
    applyMapZoom(mapView.zoom * factor, event.clientX, event.clientY);
  }, {passive:false});
  $("#edLocationMap").addEventListener("dblclick", event => {
    if (!event.target.closest("svg.ed-location-map-svg")) return;
    event.preventDefault();
    applyMapZoom(mapView.zoom * 1.6, event.clientX, event.clientY);
  });
  $("#edLocationMap").addEventListener("touchstart", event => {
    if (!event.target.closest("svg.ed-location-map-svg") || event.touches.length < 2) return;
    event.preventDefault();
    beginMapPinch(event);
  }, {passive:false});
  $("#edLocationMap").addEventListener("touchmove", event => {
    if (!mapPinch || event.touches.length < 2) return;
    event.preventDefault();
    updateMapPinch(event);
  }, {passive:false});
  $("#edLocationMap").addEventListener("touchend", event => {
    if (mapPinch && event.touches.length < 2) finishMapPinch();
  }, {passive:false});
  $("#edLocationMap").addEventListener("touchcancel", () => finishMapPinch(), {passive:false});

  $("#edLocationMap").addEventListener("pointerdown", event => {
    const svg = event.target.closest("svg.ed-location-map-svg");
    if (!svg || mapPinch || event.target.closest("[data-map-locality-id]") || (event.pointerType === "mouse" && event.button !== 0)) return;
    const box = currentMapViewBox();
    mapDrag = {
      pointerId:event.pointerId,
      startX:event.clientX,
      startY:event.clientY,
      startCenterX:mapView.centerX,
      startCenterY:mapView.centerY,
      startBox:box,
      moved:false,
    };
    svg.setPointerCapture?.(event.pointerId);
    svg.classList.add("is-panning");
  });
  $("#edLocationMap").addEventListener("pointermove", event => {
    if (mapPinch || !mapDrag || event.pointerId !== mapDrag.pointerId) return;
    event.preventDefault();
    panMapFromDrag(event.clientX,event.clientY);
  });
  function finishMapDrag(event) {
    if (!mapDrag || event.pointerId !== mapDrag.pointerId) return;
    const moved = mapDrag.moved;
    mapDrag = null;
    $("#edLocationMap")?.querySelector("svg.ed-location-map-svg")?.classList.remove("is-panning");
    if (moved) {
      mapSuppressClickUntil = performance.now() + 220;
      scheduleMapRender();
    }
  }
  $("#edLocationMap").addEventListener("pointerup", finishMapDrag);
  $("#edLocationMap").addEventListener("pointercancel", finishMapDrag);
  $("#edMapSuggestions").addEventListener("click", event => {
    const button = event.target.closest("[data-map-locality-id]");
    if (!button) return;
    selectLocality(localityMap.get(String(button.dataset.mapLocalityId)));
  });

  form.addEventListener("input", () => scheduleEditorialDraftSave());
  form.addEventListener("change", () => scheduleEditorialDraftSave());
  window.addEventListener("lacurent:privacy-change", event => {
    if (event.detail?.localAutosave === true) persistEditorialDraft();
  });
  window.addEventListener("pagehide", () => persistEditorialDraft());

  ["#heatedArea","#heatedLevels","#averageHeight","#windowArea"].forEach(selector => {
    $(selector).addEventListener("input", () => { updateGeometryDisplay(false); });
  });
  document.querySelectorAll("[data-geom-auto]").forEach(input => {
    input.dataset.geomAuto = "true";
    input.addEventListener("input", () => { input.dataset.geomAuto = "false"; });
  });
  $("#resetGeometry").addEventListener("click", () => {
    document.querySelectorAll("[data-geom-auto]").forEach(input => { input.dataset.geomAuto = "true"; });
    updateGeometryDisplay(true);
    scheduleBaselineSummary(250);
  });

  $("#heatingChoice").addEventListener("change", applyHeatingDefaults);
  $("#heatPumpSource").addEventListener("change", normalizeHeatingUi);
  $("#heatingEmitter").addEventListener("change", normalizeHeatingUi);
  $("#pvEnabled").addEventListener("change", syncRenewableVisibility);
  $("#solarThermalEnabled").addEventListener("change", syncRenewableVisibility);

  function log(message) {
    const now = new Date();
    const stamp = now.toLocaleTimeString("ro-RO", {hour:"2-digit", minute:"2-digit", second:"2-digit"});
    logLines.push(`[${stamp}] ${message}`);
    const row = document.createElement("div");
    row.innerHTML = `<time>${stamp}</time>${escapeHtml(message)}`;
    runLog.appendChild(row);
    runLog.scrollTop = runLog.scrollHeight;
  }

  function stage(name, status, text) {
    const el = stageEls[name];
    if (!el) return;
    el.classList.remove("is-active","is-done","is-error");
    if (status) el.classList.add("is-" + status);
    el.querySelector("b").textContent = text || (status === "done" ? "gata" : status === "active" ? "rulează" : status === "error" ? "eroare" : "în așteptare");
  }

  function resetRunUi() {
    logLines = [];
    runLog.innerHTML = "";
    Object.keys(stageEls).forEach(key => stage(key, "", "în așteptare"));
  }

  function baseFormData() {
    syncTechnicalForm();
    const data = new FormData(form);
    form.querySelectorAll("[data-decimal-input][name]").forEach(input => {
      data.set(input.name, decimalForForm(input.value));
    });
    return data;
  }

  function formObject() {
    const out = {};
    for (const [key, value] of baseFormData().entries()) out[key] = String(value);
    return out;
  }

  async function readJson(response) {
    const data = await response.json().catch(() => ({}));
    if (!response.ok || data.error) throw new Error(data.error || `HTTP ${response.status}`);
    return data;
  }

  async function postForm(url, data) {
    return readJson(await fetch(url, {method:"POST", body:data, headers:{"Accept":"application/json"}}));
  }

  async function postJson(url, data) {
    return readJson(await fetch(url, {
      method:"POST",
      body:JSON.stringify(data),
      headers:{"Content-Type":"application/json","Accept":"application/json"}
    }));
  }

  function paintBaselineSummary(result, statusText = "Estimare pentru configurația curentă.") {
    if (!result) return;
    const energyClass = String(result.energy_class || "—").trim() || "—";
    baselineClass.textContent = energyClass;
    baselineCost.textContent = result.annual_cost_lei == null ? "—" : money(result.annual_cost_lei) + "/an";
    baselineStatus.textContent = statusText;
    baselineBar.classList.remove("is-updating");
  }

  function baselineSummaryReady() {
    const locality = ($("#localityInput")?.value || "").trim();
    const localityToken = ($("#localityId")?.value || "").trim();
    if (!localityToken) {
      baselineClass.textContent = "—";
      baselineCost.textContent = "—";
      baselineStatus.textContent = locality ? "Alege localitatea din sugestii sau de pe hartă." : "Completează localitatea.";
      baselineBar.classList.remove("is-updating");
      return false;
    }
    return true;
  }

  async function refreshBaselineSummary() {
    if (current === "run" || !baselineSummaryReady()) return;
    const revision = ++baselineSummaryRevision;
    baselineSummaryController?.abort();
    baselineSummaryController = new AbortController();
    baselineBar.classList.add("is-updating");
    baselineStatus.textContent = "Actualizare…";
    try {
      syncTechnicalForm();
      const response = await fetch("/api/home-lab-next/calculate", {
        method:"POST",
        body:baseFormData(),
        headers:{"Accept":"application/json"},
        signal:baselineSummaryController.signal,
      });
      const data = await readJson(response);
      if (revision !== baselineSummaryRevision) return;
      baselineResult = data;
      paintBaselineSummary(data);
    } catch (error) {
      if (error?.name === "AbortError" || revision !== baselineSummaryRevision) return;
      baselineBar.classList.remove("is-updating");
      baselineStatus.textContent = "Estimarea se actualizează după completarea datelor.";
    }
  }

  function scheduleBaselineSummary(delay = 650) {
    window.clearTimeout(baselineSummaryTimer);
    if (!baselineSummaryReady()) return;
    baselineBar.classList.add("is-updating");
    baselineSummaryTimer = window.setTimeout(refreshBaselineSummary, delay);
  }

  async function runAnalysis() {
    syncTechnicalForm();
    if (!validatePage("goal")) return;
    resetRunUi();
    baselineResult = null;
    optimizationResult = null;
    lastPlan = null;
    branchResults = [];
    showPage("run");

    try {
      stage("baseline","active","rulează");
      log("Construiesc modelul termic al casei actuale din setul complet de inputuri Home Lab.");
      baselineResult = await postForm("/api/home-lab-next/calculate", baseFormData());
      paintBaselineSummary(baselineResult, "Baseline folosit în optimizare.");
      stage("baseline","done","gata");
      log(`Baseline gata: ${fmt(baselineResult.final_energy_kwh)} kWh/an · necesar ${fmt(baselineResult.design_heat_load_kw,1)} kW.`);

      stage("plan","active","rulează");
      log("Generez shortlist-ul parametric și ramurile tehnice eligibile.");
      lastPlan = await postForm("/api/optimization/home-lab/v2/plan", baseFormData());
      stage("plan","done", `${lastPlan.shortlistSize || 0} configurații`);
      log(`Shortlist: ${lastPlan.shortlistSize || 0} configurații din ${lastPlan.representativePoolSize || 0} puncte reprezentative.`);

      const branchIds = lastPlan.runBranchIds || [];
      if (!branchIds.length) throw new Error("Optimizerul nu a returnat nicio ramură economică eligibilă.");

      stage("branches","active",`0 / ${branchIds.length}`);
      const formPayload = formObject();
      for (let i = 0; i < branchIds.length; i++) {
        const branchId = branchIds[i];
        const branchMeta = (lastPlan.branches || []).find(x => (x.branch_id || x.branchId) === branchId);
        const label = branchMeta?.label || branchId;
        log(`${i + 1}/${branchIds.length} · ${label}: evaluare parametrică.`);
        const result = await postJson("/api/optimization/home-lab/v2/branch", {
          form:formPayload,
          branchId,
          shortlist:lastPlan.shortlist
        });
        branchResults.push(result);
        stage("branches","active",`${i + 1} / ${branchIds.length}`);
        log(`   ${result.candidateCount || 0} candidați · ${result.fastEvaluations || 0} evaluări.`);
      }
      stage("branches","done",`${branchIds.length} / ${branchIds.length}`);

      stage("finalize","active","verifică");
      log("Verific finaliștii cu motorul complet și aplic discretizarea comercială disponibilă.");
      optimizationResult = await postJson("/api/optimization/home-lab/v2/finalize", {
        form:formPayload,
        branchResults,
        representativeEvaluations:lastPlan.representativeEvaluations || 0,
        representativePoolSize:lastPlan.representativePoolSize || 0,
        shortlistSize:lastPlan.shortlistSize || 0,
        priorCalculationTimeMs:Number(lastPlan.calculationTimeMs || 0)
      });
      stage("finalize","done","gata");
      const opt = optimizationResult.optimization || {};
      log(`Finalizat: ${opt.evaluatedCandidates || 0} candidați economici · ${opt.fullEngineVerifications || 0} verificări complete.`);

      renderReport();
      const doneBits = [];
      if (opt.evaluatedCandidates != null) doneBits.push(`${opt.evaluatedCandidates} candidați evaluați`);
      if (opt.fullEngineVerifications != null) doneBits.push(`${opt.fullEngineVerifications} verificări finale`);
      $("#doneMeta").textContent = doneBits.length ? doneBits.join(" · ") + "." : "Configurațiile au fost evaluate și rezultatul a fost verificat.";
      showPage("done");
    } catch (error) {
      Object.entries(stageEls).forEach(([name, el]) => {
        if (el.classList.contains("is-active")) stage(name,"error","eroare");
      });
      log("EROARE · " + (error?.message || String(error)));
      $("#errorText").textContent = error?.message || "A apărut o eroare neașteptată.";
      showPage("error");
    }
  }

  function escapeHtml(value) {
    return String(value ?? "").replace(/[&<>"']/g, ch => ({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#039;"}[ch]));
  }

  function metric(label, value) {
    return `<div class="ed-metric"><small>${escapeHtml(label)}</small><strong>${escapeHtml(value)}</strong></div>`;
  }

  function renderReport() {
    if (!baselineResult || !optimizationResult) return;
    const scenario = optimizationResult.scenario || {};
    const opt = optimizationResult.optimization || {};
    const commercial = opt.commercialEvaluation || {};
    const heating = opt.selectedHeating || null;
    const hp = opt.heatPumpPerformanceProfile || null;
    const measures = opt.selected || [];
    const baselineBill = baselineResult.annual_cost_lei;
    const finalBill = commercial.annualBillLei ?? scenario.annual_cost_lei;
    const locality = baselineResult.locality || $("#localityInput").value;

    $("#reportIntro").textContent =
      `Analiza pornește de la locuința din ${locality}. Geometria, anvelopa, instalațiile și regenerabilele sunt introduse cu aceeași granularitate ca în Home Lab-ul tehnic.`;

    let html = `
      <section class="ed-report-section">
        <h2>Situația actuală</h2>
        <p>Modelul folosește clima locală, geometria, straturile anvelopei și configurația instalațiilor declarate.</p>
        <div class="ed-metrics">
          ${metric("Energie finală", energy(baselineResult.final_energy_kwh))}
          ${metric("Cost anual estimat", money(baselineBill))}
          ${metric("Putere de calcul încălzire spații", baselineResult.design_heat_load_kw == null ? "—" : fmt(baselineResult.design_heat_load_kw,1) + " kW")}
          ${metric("Clasă energetică", baselineResult.energy_class || "—")}
        </div>
      </section>

      <section class="ed-report-section">
        <h2>Ce a găsit optimizerul</h2>
        <p>${escapeHtml(opt.rationale || "Soluția de mai jos este rezultatul selecției economice și al verificării finale.")}</p>
        <div class="ed-report-callout">
          <small>Investiție estimată</small><br>
          <strong>${money(opt.capexLei)}</strong>
        </div>
        <div class="ed-metrics">
          ${metric("Economii estimate", opt.annualSavingLei == null ? "—" : money(opt.annualSavingLei) + "/an")}
          ${metric("Cost după intervenții", money(finalBill))}
          ${metric("Recuperare", opt.paybackYears == null ? "—" : fmt(opt.paybackYears,1) + " ani")}
          ${metric("Putere finală necesară · spații", commercial.designHeatLoadKw == null ? "—" : fmt(commercial.designHeatLoadKw,1) + " kW")}
        </div>
        <h3>Intervențiile selectate</h3>
        ${measures.length ? measures.map(row => `
          <div class="ed-measure">
            <div><b>${escapeHtml(row.label)}</b><br><span>${escapeHtml(row.note || (fmt(row.parameterValue,2) + " " + (row.parameterUnit || "")))}</span></div>
            <b>${money(row.capexLei)}</b>
          </div>`).join("") : "<p>Optimizerul nu a selectat intervenții cu CAPEX pozitiv.</p>"}
      </section>
    `;

    if (heating) {
      html += `
        <section class="ed-report-section">
          <h2>Dimensionarea încălzirii</h2>
          <p>Sistemul finalist este dimensionat față de necesarul termic de calcul al configurației rezultate, nu față de o putere nominală aleasă arbitrar.</p>
          <div class="ed-metrics">
            ${metric("Necesar încălzire spații", heating.requiredPowerKw == null ? "—" : fmt(heating.requiredPowerKw,2) + " kW")}
            ${metric(
              heating.capacityVerified ? "Capacitate disponibilă la proiect" : "Capacitate la proiect",
              heating.capacityVerified && heating.availableDesignCapacityKw != null
                ? fmt(heating.availableDesignCapacityKw,2) + " kW"
                : "Neverificată"
            )}
            ${metric("Putere nominală catalog", heating.ratedPowerKw == null ? (heating.label || "—") : fmt(heating.ratedPowerKw,2) + " kW")}
          </div>
          <p><b>${escapeHtml(heating.label || "Sistem de încălzire")}</b>${heating.oversizePercent == null ? "" : ` · rezervă la punctul de proiect ${fmt(heating.oversizePercent,1)}%`}.</p>
          ${heating.capacityVerified ? "" : '<p class="ed-hint">Curba de capacitate publicată nu acoperă punctul exact de proiect; puterea nominală poate fi folosită doar ca reper provizoriu, nu ca dovadă că echipamentul acoperă necesarul.</p>'}
          <p class="ed-hint">Necesarul de mai sus este pentru încălzirea spațiilor. Dacă același generator prepară ACM, puterea de reîncălzire a boilerului trebuie verificată separat în funcție de volumul de stocare și timpul de reîncălzire.</p>
        </section>
      `;
    }

    if (hp) {
      html += `
        <section class="ed-report-section">
          <h2>Performanța pompei de căldură</h2>
          <p>${escapeHtml(hp.note || "")}</p>
          <div class="ed-metrics">
            ${metric("Tip performanță", hp.profile_kind === "cop_curve" ? "COP lunar + SCOP" : "SCOP sezonier")}
            ${metric("SCOP declarat", hp.declared_scop == null ? "—" : fmt(hp.declared_scop,2))}
            ${metric("SCOP modelat", hp.modeled_scop_from_monthly_cop == null ? "—" : fmt(hp.modeled_scop_from_monthly_cop,2))}
            ${metric("COP la +7 °C", hp.reference_cop_at_7c == null ? "—" : fmt(hp.reference_cop_at_7c,2))}
          </div>
          ${Array.isArray(hp.monthly) && hp.monthly.some(x => x.cop != null) ? `
            <h3>COP lunar raportat la sarcina casei</h3>
            ${hp.monthly.map(row => `<div class="ed-measure"><span>${escapeHtml(row.month)} · ${fmt(row.outdoor_temperature_c,1)} °C · ${fmt(row.useful_heating_kwh,0)} kWh utili</span><b>${row.cop == null ? "—" : "COP " + fmt(row.cop,2)}</b></div>`).join("")}
          ` : ""}
        </section>
      `;
    }

    if (scenario.annual_fuel_use && Object.keys(scenario.annual_fuel_use).length) {
      html += `
        <section class="ed-report-section">
          <h2>Combustibil anual</h2>
          <p>Necesarul fizic anual rezultat din configurația finală:</p>
          ${Object.entries(scenario.annual_fuel_use).map(([key,val]) => `<div class="ed-measure"><span>${escapeHtml(key.replaceAll("_"," "))}</span><b>${typeof val === "number" ? fmt(val,1) : escapeHtml(JSON.stringify(val))}</b></div>`).join("")}
        </section>
      `;
    }

    html += `
      <section class="ed-report-section">
        <h2>Cum a fost verificat rezultatul</h2>
        <p>Optimizerul a folosit un shortlist fizic, a evaluat separat ramurile de încălzire și a verificat finaliștii cu motorul energetic complet înainte de selecția comercială.</p>
        <div class="ed-metrics">
          ${metric("Candidați evaluați", fmt(opt.evaluatedCandidates || 0))}
          ${metric("Evaluări parametrice", fmt(opt.parametricEvaluations || 0))}
          ${metric("Verificări motor complet", fmt(opt.fullEngineVerifications || 0))}
          ${metric("Timp calcul server", opt.calculationTimeMs == null ? "—" : fmt(opt.calculationTimeMs / 1000,1) + " s")}
        </div>
      </section>

      <section class="ed-report-section">
        <h2>Metodologie și ipoteze</h2>
        <p><b>Metodologie:</b> ${escapeHtml(scenario.methodology_version || baselineResult.methodology_version || "—")}. ${escapeHtml(scenario.methodology_source || baselineResult.methodology_source || "")}</p>
        <p><b>Date de preț:</b> ${scenario.price_retrieved_on ? "referință " + escapeHtml(scenario.price_retrieved_on) : "conform surselor active ale motorului"}.</p>
        ${Array.isArray(scenario.assumptions) && scenario.assumptions.length ? `<h3>Ipoteze declarate de motor</h3><ul>${scenario.assumptions.map(x => `<li>${escapeHtml(x)}</li>`).join("")}</ul>` : ""}
        ${Array.isArray(opt.warnings) && opt.warnings.length ? `<h3>Limitări / avertismente</h3><ul>${opt.warnings.map(x => `<li>${escapeHtml(x)}</li>`).join("")}</ul>` : ""}
      </section>
    `;
    $("#reportBody").innerHTML = html;
  }

  $("#runAnalysis").addEventListener("click", runAnalysis);
  $("#openReport").addEventListener("click", () => showPage("report"));
  $("#reportBack").addEventListener("click", () => showPage("done"));
  $("#tryAgain").addEventListener("click", () => showPage("goal"));

  function openLog() {
    logDialogBody.textContent = logLines.join("\n");
    if (typeof logDialog.showModal === "function") logDialog.showModal();
    else logDialog.setAttribute("open","");
  }
  $("#showLog").addEventListener("click", openLog);
  $("#errorLog").addEventListener("click", openLog);
  $("#closeLog").addEventListener("click", () => logDialog.close());
  logDialog.addEventListener("click", event => { if (event.target === logDialog) logDialog.close(); });

  form.addEventListener("input", event => {
    if (event.target?.type === "hidden") return;
    if (event.target?.matches?.("[data-optional-advanced]") && event.isTrusted) {
      markAdvancedManual(event.target);
    }
    syncDerivedAdvancedFields();
    scheduleBaselineSummary();
  });
  form.addEventListener("change", event => {
    if (event.target?.type === "hidden") return;
    if (event.target?.matches?.("[data-optional-advanced]") && event.isTrusted) {
      markAdvancedManual(event.target);
    }
    syncDerivedAdvancedFields();
    scheduleBaselineSummary(350);
  });

  fetch("/api/location-data", {headers:{"Accept":"application/json"}})
    .then(readJson)
    .then(data => {
      locationData = data;
      localities = Array.isArray(data.localities) ? data.localities : [];
      localityMap = new Map(localities.map(item => [String(item.id), item]));
      locationProjection = createLocationProjection(data);
      initializeProjectedLocalities();
      resetMapView();
      const selected = localityMap.get(String($("#localityId").value));
      if (selected) selectLocality(selected);
      else renderLocationMap();
    })
    .catch(error => {
      $("#edLocationMap").innerHTML = "<p>Harta nu a putut fi încărcată. Căutarea localității rămâne disponibilă.</p>";
      $("#edLocationMap").dataset.mapError = error?.message || "location-map-error";
    });

  syncGoalField();
  updateGeometryDisplay(true);
  applyHeatingDefaults();

  const restoredDraft = restoreEditorialDraft();
  if (restoredDraft) {
    normalizeHeatingUi();
    syncRenewableVisibility();
    updateGeometryDisplay(false);
    syncGoalField();
    syncChoiceGroupSelections();
  } else {
    syncRenewableVisibility();
  }

  syncDerivedAdvancedFields();
  form.querySelectorAll("[data-optional-advanced]").forEach(refreshAdvancedFieldState);
  syncTechnicalForm();
  showPage("intro");
  scheduleBaselineSummary(150);
})();
