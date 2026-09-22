(() => {
  "use strict";

  const root = document.querySelector("[data-home-lab-next]");
  if (!root) return;

  const $ = selector => root.querySelector(selector);
  const $$ = selector => Array.from(root.querySelectorAll(selector));
  const form = $("#hlnTechnicalForm");
  const calcUrl = root.dataset.calculateUrl;
  const storageKey = `lacurent-home-lab-next-v1:${root.dataset.partnerId || "official"}`;
  const SOLAR_THERMAL_NOMINAL_KW_PER_M2 = 0.70;

  const labels = {
    glazing: {
      reference_mc001: "Fereastră de referință MC001",
      single_clear_glazing: "Geam simplu",
      double_clear_glazing: "Geam dublu clar",
      double_low_e_face_3: "Geam dublu Low-E",
      triple_low_e_faces_2_and_5: "Tripan Low-E"
    },
    heating: {
      reference_mc001: "Încălzire de referință MC001",
      condensing_gas_boiler: "Centrală gaz",
      gas_boiler: "Centrală gaz convențională",
      heat_pump: "Pompă de căldură",
      district_heat: "Termoficare",
      wood_stove: "Șemineu / sobă",
      electric_resistance: "Încălzire electrică",
      electric_boiler: "Centrală electrică",
      wood_boiler: "Centrală pe lemne",
      pellet_boiler: "Centrală pe peleți"
    },
    ventilation: {
      reference_mc001: "Ventilație de referință MC001",
      natural: "Ventilație naturală",
      mechanical: "Ventilație mecanică",
      hrv: "Recuperare de căldură"
    },
    cooling: {
      reference_mc001: "Răcire de referință MC001",
      none: "Fără răcire",
      split: "Aer condiționat",
      heat_pump: "Pompă reversibilă"
    },
    heatingEmitter: {
      local: "Sursă locală",
      radiators_high_temp: "Calorifere clasice",
      radiators_low_temp: "Calorifere joasă temperatură",
      underfloor: "Pardoseală",
      fan_coils: "Ventiloconvectoare",
      air: "Aer"
    },
    heatingStorage: {
      none: "fără puffer",
      buffer_small: "puffer mic",
      buffer_large: "puffer mare"
    },
    heatingControl: {
      manual: "manual",
      room_thermostat: "termostat",
      thermostatic_valves: "robineți termostatici",
      zoned: "control pe zone",
      weather_compensated: "compensare climatică"
    }
  };

  const defaultState = {
    localityId: form.elements.locality_id.value,
    locality: form.elements.locality.value,
    climateZone: null,
    climateStationId: null,
    winterDesignTemperatureC: null,
    buildingType: "residential_individual",
    constructionYear: 2005,
    area: 120,
    levels: 2,
    height: 2.7,
    temperature: 21,
    occupants: 4,
    windows: 18,
    wallIns: 5,
    roofIns: 10,
    floorIns: 5,
    glazing: "triple_low_e_faces_2_and_5",
    orientation: "south",
    heating: "condensing_gas_boiler",
    heatPumpSource: "heat_pump_air_water",
    heatingEmitter: "radiators_high_temp",
    heatingDistribution: "hydronic_insulated",
    heatingStorage: "none",
    heatingControl: "room_thermostat",
    ventilation: "natural",
    cooling: "none",
    pvEnabled: false,
    pvKwp: 5,
    pvOrientation: "south",
    pvTilt: 30,
    solarThermalEnabled: false,
    solarThermalArea: 4,
    solarThermalOrientation: "south",
    solarThermalTilt: 45
  };

  let homeState = {...defaultState};
  let scenarioState = {...defaultState};
  let homeResult = null;
  let scenarioResult = null;
  let currentResult = null;
  let baselineSaved = false;
  let measures = [];
  let referenceMode = false;
  let scenarioOverrides = {};
  let optimizationMeta = null;
  let activeMeasure = null;
  let interventionOriginal = null;
  let quickEditType = null;
  let quickEditOriginal = null;
  let screen = "home";
  let localities = [];
  let localityMap = new Map();
  let locationMapData = null;
  let locationProjection = null;
  let calculateToken = 0;
  let calculateTimer = 0;
  let calculateAbortController = null;
  let optimizerAbortController = null;
  let optimizerRunToken = 0;
  let optimizerEvaluationCount = 0;
  const OPTIMIZER_MAX_ENGINE_EVALUATIONS = 16;
  const optimizerCandidateCache = new Map();
  const OPTIMIZER_CANDIDATE_CACHE_MAX = 192;
  let homeResultState = homeResult ? "stale" : "empty";
  let scenarioResultState = scenarioResult ? "stale" : "empty";
  let projectMode = "existing_standard";
  const DEFAULT_ROI_COST_BASIS = Object.freeze({
    wall: null,
    roof: null,
    floor: null,
    windows: null,
    door: null,
    ventilation: null,
    heating_control: null,
    heating: null,
    pv: null,
    solar_thermal: null,
  });
  let roiCostBasis = {...DEFAULT_ROI_COST_BASIS};
  let roiCostBasisMeta = null;
  let roiCostBasisPromise = null;
  let mobileViewportBaseline = 0;

  function syncMobileViewportBottomInset(resetBaseline = false) {
    const viewport = window.visualViewport;
    if (!viewport || window.innerWidth > 760 || viewport.scale !== 1) {
      root.style.setProperty("--hln-mobile-bottom-occlusion", "0px");
      if (window.innerWidth > 760) mobileViewportBaseline = 0;
      return;
    }

    const visibleBottom = viewport.offsetTop + viewport.height;
    if (resetBaseline || mobileViewportBaseline <= 0) {
      mobileViewportBaseline = Math.max(visibleBottom, window.innerHeight || 0, document.documentElement.clientHeight || 0);
    } else {
      mobileViewportBaseline = Math.max(
        mobileViewportBaseline,
        window.innerHeight || 0,
        document.documentElement.clientHeight || 0
      );
    }

    // Browser chrome on iOS can report a large VisualViewport delta even
    // though only a modest lift is needed to keep the primary CTA tappable.
    // Cap the correction so the dock stays near the bottom instead of jumping
    // far up the screen when Chrome/Safari expands its bottom controls.
    const rawOcclusion = Math.max(0, Math.round(mobileViewportBaseline - visibleBottom));
    const occlusion = Math.min(rawOcclusion, 48);
    root.style.setProperty("--hln-mobile-bottom-occlusion", `${occlusion}px`);
  }

  syncMobileViewportBottomInset(true);
  window.visualViewport?.addEventListener("resize", () => syncMobileViewportBottomInset());
  window.visualViewport?.addEventListener("scroll", () => syncMobileViewportBottomInset());
  window.addEventListener("resize", () => syncMobileViewportBottomInset());
  window.addEventListener("orientationchange", () => {
    mobileViewportBaseline = 0;
    window.setTimeout(() => syncMobileViewportBottomInset(true), 120);
  });
  window.addEventListener("pageshow", () => syncMobileViewportBottomInset(true));

  function migrateStoredHeatingState(rawState, fallbackState) {
    const raw = rawState && typeof rawState === "object" ? rawState : {};
    const state = {...fallbackState, ...raw};
    const chainKeys = [
      "heatPumpSource",
      "heatingEmitter",
      "heatingDistribution",
      "heatingStorage",
      "heatingControl",
    ];
    const hasCompleteStoredChain = chainKeys.every(key =>
      Object.prototype.hasOwnProperty.call(raw, key)
    );

    // States saved before the structured-heating release only contained the
    // generator choice. Build the new chain from that generator instead of
    // combining it with the default gas/radiator chain.
    if (!hasCompleteStoredChain) {
      Object.assign(state, heatingChainDefaults(state.heating));
    }

    // Repair stale/partial combinations left by older UI builds. This keeps
    // persisted houses usable without forcing the user to press Reset.
    if (state.heating === "wood_stove" || state.heating === "electric_resistance") {
      state.heatingEmitter = "local";
      state.heatingDistribution = "local";
      state.heatingStorage = "none";
    }
    if (state.heating === "heat_pump" && state.heatPumpSource === "heat_pump_air_air") {
      state.heatingEmitter = "air";
      state.heatingDistribution = "air";
      state.heatingStorage = "none";
    }
    if (state.heatingEmitter === "local") state.heatingDistribution = "local";
    if (state.heatingEmitter === "air") state.heatingDistribution = "air";
    if (state.heatingEmitter === "underfloor") state.heatingDistribution = "underfloor";

    return state;
  }

  try {
    const saved = JSON.parse(localStorage.getItem(storageKey) || "null");
    if (saved?.homeState) {
      homeState = migrateStoredHeatingState(saved.homeState, defaultState);
      scenarioState = migrateStoredHeatingState(saved.scenarioState || {}, homeState);
      homeResult = saved.homeResult || null;
      scenarioResult = saved.scenarioResult || null;
      measures = Array.isArray(saved.measures) ? saved.measures : [];
      baselineSaved = Boolean(saved.baselineSaved);
      referenceMode = Boolean(saved.referenceMode);
      scenarioOverrides = saved.scenarioOverrides && typeof saved.scenarioOverrides === "object" ? {...saved.scenarioOverrides} : {};
      optimizationMeta = saved.optimizationMeta && typeof saved.optimizationMeta === "object" ? {...saved.optimizationMeta} : null;
      projectMode = ["existing_standard", "existing_major", "new_nzeb"].includes(saved.projectMode)
        ? saved.projectMode
        : "existing_standard";
      homeResultState = homeResult ? "stale" : "empty";
      scenarioResultState = scenarioResult ? "stale" : "empty";
      // Rewrite the persisted state once so the migration is permanent.
      persist();
    }
  } catch (_) {}

  function fmt(value, digits = 0) {
    const number = Number(value);
    if (!Number.isFinite(number)) return "—";
    return number.toLocaleString("ro-RO", {maximumFractionDigits: digits, minimumFractionDigits: digits});
  }

  function formSet(name, value) {
    const field = form.elements[name];
    if (field) field.value = value == null ? "" : String(value);
  }

  function insulationU(baseU, centimetres) {
    const lambda = 0.040;
    const baseR = 1 / baseU;
    const addedR = Math.max(0, Number(centimetres) || 0) / 100 / lambda;
    return 1 / (baseR + addedR);
  }

  const clamp = (value, min, max) => Math.max(min, Math.min(max, value));

  function heatingChainDefaults(type) {
    if (type === "heat_pump") return {
      heatPumpSource: "heat_pump_air_water",
      heatingEmitter: "underfloor",
      heatingDistribution: "underfloor",
      heatingStorage: "none",
      heatingControl: "zoned",
    };
    if (type === "wood_stove") return {
      heatingEmitter: "local",
      heatingDistribution: "local",
      heatingStorage: "none",
      heatingControl: "manual",
    };
    if (type === "electric_resistance") return {
      heatingEmitter: "local",
      heatingDistribution: "local",
      heatingStorage: "none",
      heatingControl: "room_thermostat",
    };
    if (type === "pellet_boiler") return {
      heatingEmitter: "radiators_high_temp",
      heatingDistribution: "hydronic_insulated",
      heatingStorage: "buffer_small",
      heatingControl: "room_thermostat",
    };
    if (type === "district_heat") return {
      heatingEmitter: "radiators_high_temp",
      heatingDistribution: "hydronic_insulated",
      heatingStorage: "none",
      heatingControl: "thermostatic_valves",
    };
    return {
      heatingEmitter: "radiators_high_temp",
      heatingDistribution: "hydronic_insulated",
      heatingStorage: "none",
      heatingControl: "room_thermostat",
    };
  }

  function heatingGeneratorType(state) {
    if (state.heating === "heat_pump") return state.heatPumpSource || "heat_pump_air_water";
    return {
      condensing_gas_boiler: "condensing_gas_boiler",
      gas_boiler: "gas_boiler",
      electric_resistance: "electric_direct",
      electric_boiler: "electric_boiler",
      district_heat: "district_heat",
      wood_stove: "wood_stove",
      wood_boiler: "wood_boiler",
      pellet_boiler: "pellet_boiler",
    }[state.heating] || "custom";
  }

  function applyHeatingDefaults(state, type) {
    const defaults = heatingChainDefaults(type);
    Object.assign(state, defaults);
  }

  function normalizeHeatingState(state) {
    if (["wood_stove", "electric_resistance"].includes(state.heating)) {
      const fixed = heatingChainDefaults(state.heating);
      Object.assign(state, fixed);
      return;
    }

    if (state.heating === "heat_pump" && state.heatPumpSource === "heat_pump_air_air") {
      state.heatingEmitter = "air";
      state.heatingDistribution = "air";
      state.heatingStorage = "none";
      return;
    }

    const hydronicEmitters = new Set([
      "radiators_high_temp",
      "radiators_low_temp",
      "underfloor",
      "fan_coils",
    ]);
    if (!hydronicEmitters.has(state.heatingEmitter)) {
      state.heatingEmitter = heatingChainDefaults(state.heating).heatingEmitter;
      if (!hydronicEmitters.has(state.heatingEmitter)) state.heatingEmitter = "radiators_high_temp";
    }

    if (state.heatingEmitter === "underfloor") {
      state.heatingDistribution = "underfloor";
    } else if (!["hydronic_insulated", "hydronic_uninsulated"].includes(state.heatingDistribution)) {
      state.heatingDistribution = "hydronic_insulated";
    }
  }

  function setHeatingFieldDisabled(label, disabled) {
    if (!label) return;
    label.classList.toggle("is-disabled", disabled);
    label.setAttribute("aria-disabled", disabled ? "true" : "false");
    const control = label.querySelector("select, input");
    if (control) control.disabled = disabled;
  }

  function syncHeatingControlAvailability() {
    normalizeHeatingState(homeState);
    normalizeHeatingState(scenarioState);

    const homePump = $("[data-hln-home-heat-pump-source]");
    const scenarioPump = $("[data-hln-scenario-heat-pump-source]");
    setHeatingFieldDisabled(homePump, homeState.heating !== "heat_pump");
    setHeatingFieldDisabled(scenarioPump, scenarioState.heating !== "heat_pump");

    const homeLocalFixed = ["wood_stove", "electric_resistance"].includes(homeState.heating);
    const scenarioLocalFixed = ["wood_stove", "electric_resistance"].includes(scenarioState.heating);
    root.querySelectorAll("[data-hln-home-heating-chain]").forEach(node => {
      node.hidden = homeLocalFixed;
    });
    root.querySelectorAll("[data-hln-scenario-heating-chain]").forEach(node => {
      node.hidden = scenarioLocalFixed;
    });

    const configureHydronicFields = (state, prefix, localFixed) => {
      if (localFixed) return;
      const emitter = $("#" + prefix + "HeatingEmitter");
      const distribution = $("#" + prefix + "HeatingDistribution");
      const storage = $("#" + prefix + "HeatingStorage");
      const isAirToAir = state.heating === "heat_pump" && state.heatPumpSource === "heat_pump_air_air";

      if (emitter) {
        Array.from(emitter.options).forEach(option => {
          option.disabled = isAirToAir
            ? option.value !== "air"
            : !["radiators_high_temp", "radiators_low_temp", "underfloor", "fan_coils"].includes(option.value);
        });
        emitter.value = state.heatingEmitter;
      }
      setHeatingFieldDisabled(emitter ? emitter.closest("label") : null, isAirToAir);
      setHeatingFieldDisabled(storage ? storage.closest("label") : null, isAirToAir);

      if (distribution) {
        Array.from(distribution.options).forEach(option => {
          if (isAirToAir) {
            option.disabled = option.value !== "air";
          } else if (state.heatingEmitter === "underfloor") {
            option.disabled = option.value !== "underfloor";
          } else {
            option.disabled = !["hydronic_insulated", "hydronic_uninsulated"].includes(option.value);
          }
        });
        distribution.value = state.heatingDistribution;
        setHeatingFieldDisabled(
          distribution.closest("label"),
          isAirToAir || state.heatingEmitter === "underfloor"
        );
      }
      if (storage) storage.value = state.heatingStorage;
    };

    configureHydronicFields(homeState, "hlnHome", homeLocalFixed);
    configureHydronicFields(scenarioState, "hlnScenario", scenarioLocalFixed);
  }

  // Backward-compatible name used by existing render paths.
  function toggleHeatPumpSourceControls() {
    syncHeatingControlAvailability();
  }

  function solarThermalKwFromArea(areaM2) {
    return Math.max(0, Number(areaM2) || 0) * SOLAR_THERMAL_NOMINAL_KW_PER_M2;
  }

  function solarThermalAreaFromKw(powerKw) {
    return Math.max(0, Number(powerKw) || 0) / SOLAR_THERMAL_NOMINAL_KW_PER_M2;
  }

  function insulationCmForU(baseU, targetU) {
    const target = Number(targetU);
    if (!Number.isFinite(target) || target <= 0) return 0;
    const addedR = Math.max(0, 1 / target - 1 / baseU);
    return Math.round(addedR * 0.040 * 1000) / 10;
  }

  function referenceTargets() {
    const reference = homeResult?.reference_parameters || currentResult?.reference_parameters;
    if (!reference?.u_values_w_m2k) return null;
    const u = reference.u_values_w_m2k;
    return {
      wallIns: insulationCmForU(1.30, u.exterior_wall),
      roofIns: insulationCmForU(1.00, u.roof),
      floorIns: insulationCmForU(0.90, u.floor),
      windows: Number(homeState.windows),
      glazing: "reference_mc001",
      heating: "reference_mc001",
      ventilation: "reference_mc001",
      cooling: homeState.cooling === "none" ? "none" : "reference_mc001",
      pvEnabled: false,
      solarThermalEnabled: false,
    };
  }

  function clearScenarioOverrideForKey(key) {
    const next = { ...scenarioOverrides };
    if (key === "wallIns") delete next.wallU;
    if (key === "roofIns") delete next.roofU;
    if (key === "floorIns") delete next.floorU;
    if (key === "glazing") delete next.windowU;
    if (key === "heating") {
      delete next.heatingEfficiency;
      delete next.heatingSystemType;
      delete next.heatingCarrier;
      delete next.heatingCostProfile;
    }
    if (key === "ventilation") {
      delete next.airChanges;
      delete next.heatRecovery;
    }
    if (key === "cooling") delete next.coolingSeer;
    scenarioOverrides = next;
  }

  function clearScenarioOverrideForMeasure(type) {
    if (type === "wall") clearScenarioOverrideForKey("wallIns");
    if (type === "roof") clearScenarioOverrideForKey("roofIns");
    if (type === "floor") clearScenarioOverrideForKey("floorIns");
    if (type === "windows") clearScenarioOverrideForKey("glazing");
    if (type === "heating") clearScenarioOverrideForKey("heating");
    if (type === "ventilation") {
      clearScenarioOverrideForKey("ventilation");
      clearScenarioOverrideForKey("cooling");
    }
  }

  function syncMeasuresFromScenario() {
    const next = [];
    if (
      Math.abs(Number(scenarioState.wallIns) - Number(homeState.wallIns)) > 0.01 ||
      Number.isFinite(Number(scenarioOverrides.wallU))
    ) next.push("wall");
    if (
      Math.abs(Number(scenarioState.roofIns) - Number(homeState.roofIns)) > 0.01 ||
      Number.isFinite(Number(scenarioOverrides.roofU))
    ) next.push("roof");
    if (
      Math.abs(Number(scenarioState.floorIns) - Number(homeState.floorIns)) > 0.01 ||
      Number.isFinite(Number(scenarioOverrides.floorU))
    ) next.push("floor");
    if (
      scenarioState.glazing !== homeState.glazing ||
      Math.abs(Number(scenarioState.windows) - Number(homeState.windows)) > 0.01 ||
      Number.isFinite(Number(scenarioOverrides.windowU)) ||
      referenceMode
    ) next.push("windows");
    if (
      scenarioState.heating !== homeState.heating ||
      scenarioState.heatPumpSource !== homeState.heatPumpSource ||
      scenarioState.heatingEmitter !== homeState.heatingEmitter ||
      scenarioState.heatingDistribution !== homeState.heatingDistribution ||
      scenarioState.heatingStorage !== homeState.heatingStorage ||
      scenarioState.heatingControl !== homeState.heatingControl ||
      Number.isFinite(Number(scenarioOverrides.heatingEfficiency)) ||
      referenceMode
    ) next.push("heating");
    if (
      scenarioState.ventilation !== homeState.ventilation ||
      scenarioState.cooling !== homeState.cooling ||
      Number.isFinite(Number(scenarioOverrides.airChanges)) ||
      Number.isFinite(Number(scenarioOverrides.heatRecovery)) ||
      Number.isFinite(Number(scenarioOverrides.coolingSeer)) ||
      referenceMode
    ) next.push("ventilation");
    const pvEnabledChanged = Boolean(scenarioState.pvEnabled) !== Boolean(homeState.pvEnabled);
    const pvConfiguredChanged = (scenarioState.pvEnabled || homeState.pvEnabled) && (
      Math.abs(Number(scenarioState.pvKwp) - Number(homeState.pvKwp)) > 0.01 ||
      scenarioState.pvOrientation !== homeState.pvOrientation ||
      Math.abs(Number(scenarioState.pvTilt) - Number(homeState.pvTilt)) > 0.01
    );
    if (pvEnabledChanged || pvConfiguredChanged || (referenceMode && homeState.pvEnabled)) next.push("pv");

    const solarThermalEnabledChanged = Boolean(scenarioState.solarThermalEnabled) !== Boolean(homeState.solarThermalEnabled);
    const solarThermalConfiguredChanged = (scenarioState.solarThermalEnabled || homeState.solarThermalEnabled) && (
      Math.abs(Number(scenarioState.solarThermalArea) - Number(homeState.solarThermalArea)) > 0.01 ||
      scenarioState.solarThermalOrientation !== homeState.solarThermalOrientation ||
      Math.abs(Number(scenarioState.solarThermalTilt) - Number(homeState.solarThermalTilt)) > 0.01
    );
    if (
      solarThermalEnabledChanged ||
      solarThermalConfiguredChanged ||
      (referenceMode && homeState.solarThermalEnabled)
    ) next.push("solar_thermal");
    measures = next;
  }

  function emitVisualState(focus = null) {
    const state = screen === "home" ? homeState : scenarioState;
    const detail = {
      orientation: state.orientation,
      wallIns: Number(state.wallIns),
      roofIns: Number(state.roofIns),
      floorIns: Number(state.floorIns),
      windows: Number(state.windows),
      glazing: state.glazing,
      ventilation: state.ventilation,
      cooling: state.cooling,
      heating: state.heating,
      heatPumpSource: state.heatPumpSource,
      heatingEmitter: state.heatingEmitter,
      heatingDistribution: state.heatingDistribution,
      heatingStorage: state.heatingStorage,
      heatingControl: state.heatingControl,
      pvEnabled: Boolean(state.pvEnabled),
      pvKwp: Number(state.pvKwp || 0),
      pvTilt: Number(state.pvTilt || 0),
      solarThermalEnabled: Boolean(state.solarThermalEnabled),
      solarThermalArea: Number(state.solarThermalArea || 0),
      solarThermalTilt: Number(state.solarThermalTilt || 0),
      pvOrientation: state.pvOrientation,
      solarThermalOrientation: state.solarThermalOrientation,
      measures: screen === "home" ? [] : [...measures],
      baselineSaved,
      screen,
      referenceMode,
      focus,
    };
    window.__homeLabVisualState = detail;
    window.dispatchEvent(new CustomEvent("hln:visual-state", { detail }));
  }

  function setReferenceHouse() {
    if (!baselineSaved) return;
    const target = referenceTargets();
    if (!target) return;
    scenarioState = {
      ...scenarioState,
      ...target,
      orientation: homeState.orientation,
      area: homeState.area,
      levels: homeState.levels,
      height: homeState.height,
      temperature: homeState.temperature,
      occupants: homeState.occupants,
      localityId: homeState.localityId,
      locality: homeState.locality,
    };
    const ref = homeResult?.reference_parameters || currentResult?.reference_parameters;
    const u = ref?.u_values_w_m2k || {};
    scenarioOverrides = {
      wallU: Number(u.exterior_wall),
      roofU: Number(u.roof),
      floorU: Number(u.floor),
      windowU: Number(u.window),
      doorU: Number(u.exterior_door),
      thermalBridgesOff: true,
      airChanges: Number(ref?.air_changes_per_hour),
      heatRecovery: Number(ref?.heat_recovery_efficiency),
      heatingEfficiency: Number(ref?.heating_efficiency),
      heatingSystemType: "condensing_gas_boiler",
      heatingCarrier: "natural_gas",
      heatingCostProfile: "natural_gas",
      coolingSeer: Number(ref?.cooling_seer),
      dhwEfficiency: Number(ref?.dhw_efficiency),
    };
    referenceMode = true;
    optimizationMeta = {mode:"reference", label:"Casa de referință MC001"};
    setOptimizationNote("");
    syncMeasuresFromScenario();
    renderAll();
    persist();
    emitVisualState("reference");
    scheduleCalculate("scenario", 20);
  }

  function resetScenarioToHome() {
    if (!baselineSaved) return;
    referenceMode = false;
    scenarioOverrides = {};
    optimizationMeta = null;
    scenarioState = { ...homeState };
    scenarioResult = homeResult;
    currentResult = homeResult;
    scenarioResultState = homeResultState === "fresh" ? "fresh" : "stale";
    measures = [];
    renderAll();
    persist();
    emitVisualState("home");
  }

  function liveRangePercent(value, input) {
    if (!input) return 0;
    const min = Number(input.min || 0);
    const max = Number(input.max || 100);
    if (!Number.isFinite(value) || max <= min) return 0;
    return clamp(100 * (Number(value) - min) / (max - min), 0, 100);
  }

  function roiCostUnitLabel(unit) {
    return {
      lei_per_m2_per_cm:"lei/m²/cm",
      lei_per_m2:"lei/m²",
      lei_total:"lei total",
      lei_per_kwp:"lei/kWp",
    }[unit] || unit || "lei";
  }

  function renderRoiCostSource() {
    const source = $("#hlnRoiCostSource");
    const meta = $("#hlnRoiCostSourceMeta");
    const list = $("#hlnRoiCostAssumptions");
    if (!source || !meta || !list) return;

    if (!roiCostBasisMeta) {
      source.textContent = "Se încarcă automat din catalogul LaCurent…";
      meta.textContent = "Nu trebuie să introduci costuri manual.";
      list.innerHTML = "";
      return;
    }

    const isD1 = roiCostBasisMeta.source === "d1";
    source.textContent = isD1
      ? "Catalog D1 · bază de cost activă"
      : "Catalog local de rezervă · bază de cost activă";
    meta.textContent = [
      roiCostBasisMeta.catalog_version || "versiune necunoscută",
      roiCostBasisMeta.observed_on ? `actualizat ${roiCostBasisMeta.observed_on}` : "",
    ].filter(Boolean).join(" · ");

    const costs = roiCostBasisMeta.costs || {};
    list.innerHTML = Object.entries(costs).map(([family, item]) => {
      const value = Number(item?.cost_lei);
      if (!Number.isFinite(value) || value <= 0) return "";
      return `
        <article>
          <div><strong>${escapeHtml(item.label || family)}</strong><small>${escapeHtml(item.confidence || "—")} confidence · ${escapeHtml(item.source_kind || "catalog")}</small></div>
          <b>${fmt(value, value < 100 ? 1 : 0)} ${escapeHtml(roiCostUnitLabel(item.unit))}</b>
        </article>
      `;
    }).join("");
  }

  async function loadRoiCostBasis() {
    if (roiCostBasisMeta && Object.values(roiCostBasis).some(value => Number(value) > 0)) {
      return roiCostBasis;
    }
    if (roiCostBasisPromise) return roiCostBasisPromise;

    roiCostBasisPromise = fetch("/api/market-cost-basis", {
      headers:{Accept:"application/json"},
    })
      .then(async response => {
        if (!response.ok) throw new Error(`HTTP ${response.status}`);
        const payload = await response.json();
        const next = {...DEFAULT_ROI_COST_BASIS};
        Object.entries(payload?.costs || {}).forEach(([family, item]) => {
          const value = Number(item?.cost_lei);
          if (Object.prototype.hasOwnProperty.call(next, family) && Number.isFinite(value) && value > 0) {
            next[family] = value;
          }
        });
        roiCostBasis = next;
        roiCostBasisMeta = payload;
        renderRoiCostSource();
        return roiCostBasis;
      })
      .catch(error => {
        roiCostBasisMeta = {
          source:"unavailable",
          catalog_version:null,
          observed_on:null,
          costs:{},
          error:error?.message || "catalog unavailable",
        };
        renderRoiCostSource();
        throw new Error("Catalogul de costuri nu este disponibil momentan.");
      })
      .finally(() => {
        roiCostBasisPromise = null;
      });
    return roiCostBasisPromise;
  }

  function syncOptimizerInputs() {
    const project = $("#hlnProjectMode");
    if (project) project.value = projectMode;
    renderRoiCostSource();
  }

  function renderProjectGuardrailSummary() {
    const node = $("#hlnProjectGuardrailSummary");
    if (!node) return;
    const target = regulatoryTargetForProjectMode();
    if (projectMode === "existing_standard") {
      node.textContent = "Renovare obișnuită: Best ROI optimizează financiar fără a inventa un prag global 2.10a/2.10b. Cerințele punctuale aplicabile intervențiilor se verifică separat.";
      return;
    }
    if (!target) {
      node.textContent = `${projectModeLabel()}: pragul metodologic nu este disponibil încă pentru această configurație.`;
      return;
    }
    const table = projectMode === "new_nzeb" ? "MC001 Tabel 2.10a" : "MC001 Tabel 2.10b";
    const suffix = projectMode === "new_nzeb"
      ? " · plus anvelopa modelată; RER rămâne de verificat separat"
      : "";
    node.textContent =
      `${table}: EP ≤ ${fmt(target.primary_energy_kwh_m2_year,1)} kWh/m²·an · CO₂ ≤ ${fmt(target.co2_kg_m2_year,1)} kg/m²·an${suffix}.`;
  }

  function renderLiveConfigurator() {
    const live = $("#hlnLiveConfigurator");
    if (!live) return;

    const targets = referenceTargets();
    const rows = {
      wallIns: {
        selector: "#hlnLiveWallIns",
        unit: "cm",
        reference: targets?.wallIns,
        value: () => Number(scenarioState.wallIns),
        homeValue: () => Number(homeState.wallIns),
      },
      roofIns: {
        selector: "#hlnLiveRoofIns",
        unit: "cm",
        reference: targets?.roofIns,
        value: () => Number(scenarioState.roofIns),
        homeValue: () => Number(homeState.roofIns),
      },
      floorIns: {
        selector: "#hlnLiveFloorIns",
        unit: "cm",
        reference: targets?.floorIns,
        value: () => Number(scenarioState.floorIns),
        homeValue: () => Number(homeState.floorIns),
      },
      windows: {
        selector: "#hlnLiveWindows",
        unit: "m²",
        reference: Number(homeState.windows),
        digits: 1,
        value: () => Number(scenarioState.windows),
        homeValue: () => Number(homeState.windows),
      },
      pvKwp: {
        selector: "#hlnLivePvKwp",
        unit: "kWp",
        reference: 0,
        digits: 1,
        value: () => scenarioState.pvEnabled ? Number(scenarioState.pvKwp) : 0,
        homeValue: () => homeState.pvEnabled ? Number(homeState.pvKwp) : 0,
        caption: homeValue => {
          const pv = scenarioResult?.renewables?.pv;
          if (scenarioState.pvEnabled && pv?.enabled) {
            return `Producție ${fmt(pv.annual_generation_kwh)} kWh/an · autoconsum ${fmt(pv.self_consumed_kwh)} · export ${fmt(pv.exported_kwh)}`;
          }
          return `Casa mea: ${fmt(homeValue, 1)} kWp · 0 = fără PV`;
        },
      },
      solarThermalKw: {
        selector: "#hlnLiveSolarThermalKw",
        unit: "kWth",
        reference: 0,
        digits: 1,
        value: () => scenarioState.solarThermalEnabled ? solarThermalKwFromArea(scenarioState.solarThermalArea) : 0,
        homeValue: () => homeState.solarThermalEnabled ? solarThermalKwFromArea(homeState.solarThermalArea) : 0,
        caption: homeValue => {
          const currentKw = scenarioState.solarThermalEnabled ? solarThermalKwFromArea(scenarioState.solarThermalArea) : 0;
          const currentArea = scenarioState.solarThermalEnabled ? Number(scenarioState.solarThermalArea) : 0;
          return `Casa mea: ${fmt(homeValue, 1)} kWth · ${fmt(currentKw,1)} kWth ≈ ${fmt(currentArea,1)} m² colector`;
        },
      },
    };

    Object.entries(rows).forEach(([key, config]) => {
      const row = live.querySelector(`[data-hln-tune="${key}"]`);
      const input = $(config.selector);
      if (!row || !input) return;
      const value = Number(config.value());
      const homeValue = Number(config.homeValue());
      input.value = String(value);
      const valueNode = row.querySelector("[data-hln-tune-value]");
      const digits = config.digits ?? (value % 1 ? 1 : 0);
      if (valueNode) valueNode.textContent = `${fmt(value, digits)} ${config.unit}`;

      const homeMarker = row.querySelector("[data-hln-home-marker]");
      const referenceMarker = row.querySelector("[data-hln-reference-marker]");
      if (homeMarker) homeMarker.style.left = `${liveRangePercent(homeValue, input)}%`;
      if (referenceMarker) {
        const referenceValue = Number(config.reference);
        referenceMarker.style.left = `${liveRangePercent(referenceValue, input)}%`;
        referenceMarker.hidden = !Number.isFinite(referenceValue);
      }
      const caption = row.querySelector("[data-hln-tune-caption]");
      if (caption) {
        if (typeof config.caption === "function") {
          caption.textContent = config.caption(homeValue);
        } else if (key === "windows") {
          caption.textContent = `Casa mea: ${fmt(homeState.windows, 1)} m² · referința păstrează aceeași geometrie`;
        } else if (Number.isFinite(Number(config.reference))) {
          caption.textContent = `Casa mea: ${fmt(homeValue, 1)} cm · Referință: ${fmt(config.reference, 1)} cm`;
        } else {
          caption.textContent = `Casa mea: ${fmt(homeValue, 1)} cm`;
        }
      }
    });

    [
      ["#hlnLiveGlazing", "glazing"],
      ["#hlnLiveHeating", "heating"],
      ["#hlnLiveVentilation", "ventilation"],
      ["#hlnLiveCooling", "cooling"],
    ].forEach(([selector, key]) => {
      const node = $(selector);
      if (node) node.value = scenarioState[key];
    });

    const result = scenarioResult || homeResult;
    const costNode = $("#hlnLiveCost");
    const savingNode = $("#hlnLiveSaving");
    const classNode = $("#hlnLiveClass");
    if (costNode) costNode.textContent = result?.annual_cost_lei == null ? "—" : `${fmt(result.annual_cost_lei)} lei/an`;
    if (classNode) classNode.textContent = result?.energy_class || "—";

    if (savingNode) {
      const base = Number(homeResult?.annual_cost_lei);
      const now = Number(result?.annual_cost_lei);
      if (Number.isFinite(base) && Number.isFinite(now)) {
        const delta = base - now;
        if (Math.abs(delta) < 0.5) savingNode.textContent = "La nivelul Casei mele";
        else savingNode.textContent = `${delta > 0 ? "−" : "+"}${fmt(Math.abs(delta))} lei/an față de Casa mea`;
        savingNode.classList.toggle("is-bad", delta < 0);
      } else {
        savingNode.textContent = "față de Casa mea";
        savingNode.classList.remove("is-bad");
      }
    }

    $$("#hlnEnergyScale [data-energy-class]").forEach(node => {
      node.classList.toggle("is-active", node.dataset.energyClass === result?.energy_class);
    });

    const referenceDerived = Object.keys(scenarioOverrides || {}).length > 0;
    root.querySelectorAll("[data-hln-reference-house]").forEach(button => {
      button.classList.toggle("is-active", referenceMode);
      button.classList.toggle("is-derived", !referenceMode && referenceDerived);
      button.setAttribute("aria-pressed", referenceMode ? "true" : "false");
      if (button.classList.contains("hln-reference-button")) {
        button.textContent = referenceMode
          ? "Referință activă ✓"
          : referenceDerived
            ? "Referință modificată"
            : "Casa de referință";
      }
    });

    const referenceSpec = $("#hlnReferenceSpec");
    const reference = homeResult?.reference_parameters || currentResult?.reference_parameters;
    if (referenceSpec) {
      referenceSpec.hidden = !referenceDerived;
      if (referenceDerived && reference?.u_values_w_m2k) {
        const u = reference.u_values_w_m2k;
        $("#hlnReferenceEnvelope").textContent =
          `U perete ${fmt(u.exterior_wall,2)} · pod ${fmt(u.roof,2)} · pardoseală ${fmt(u.floor,2)} · ferestre ${fmt(u.window,2)} · uși ${fmt(u.exterior_door,2)} W/m²K · punți termice 0`;
        $("#hlnReferenceAir").textContent =
          `n = ${fmt(reference.air_changes_per_hour,2)} h⁻¹ · recuperare ${fmt(100 * Number(reference.heat_recovery_efficiency || 0),0)}%`;
        $("#hlnReferenceHeating").textContent =
          `centrală gaz de referință · η ${fmt(100 * Number(reference.heating_efficiency || 0),0)}%`;
        $("#hlnReferenceServices").textContent =
          homeState.cooling === "none"
            ? `fără răcire, ca în Casa mea · ACM η ${fmt(100 * Number(reference.dhw_efficiency || 0),0)}%`
            : `răcire SEER ${fmt(reference.cooling_seer,1)} · ACM η ${fmt(100 * Number(reference.dhw_efficiency || 0),0)}%`;
      }
    }

    live.classList.toggle("is-reference", referenceMode);
    live.classList.toggle("is-reference-derived", !referenceMode && referenceDerived);
  }

  function climateTokenForState(state) {
    const stationId = String(state.climateStationId || "");
    const zone = String(state.climateZone || "");
    if (!stationId || !zone) return String(state.localityId || state.locality || "");
    const shortStationId = stationId.replace(/^mc001_6_2013_/, "");
    const temperature = Number.isFinite(Number(state.winterDesignTemperatureC))
      ? String(Number(state.winterDesignTemperatureC))
      : "";
    return `@lc|${shortStationId}|${zone}|${temperature}|${state.locality || ""}`;
  }

  function populateTechnicalForm(state, explicitOverrides = null) {
    const area = Number(state.area);
    const levels = Math.max(1, Number(state.levels));
    const height = Number(state.height);
    const windows = Number(state.windows);
    const doors = 2.2;
    const footprint = area / levels;
    const aspect = 1.25;
    const width = Math.sqrt(footprint / aspect);
    const length = width * aspect;
    const perimeter = 2 * (length + width);
    const grossWalls = perimeter * height * levels;
    const wallArea = Math.max(1, grossWalls - windows - doors);

    formSet("locality_id", climateTokenForState(state));
    formSet("locality", state.locality);
    formSet("building_type", state.buildingType || "residential_individual");
    formSet("construction_year", state.constructionYear || 2005);
    formSet("building_length_m", length.toFixed(3));
    formSet("building_width_m", width.toFixed(3));
    formSet("heated_levels", levels);
    formSet("average_height_m", height);
    formSet("house_window_area_m2", windows);
    formSet("heated_floor_area_m2", area);
    formSet("heated_volume_m3", (area * height).toFixed(3));
    formSet("wall_area_m2", wallArea.toFixed(3));
    formSet("roof_area_m2", footprint.toFixed(3));
    formSet("floor_area_m2", footprint.toFixed(3));
    formSet("window_area_m2", windows);
    formSet("thermal_bridge_length_m", (perimeter * levels).toFixed(3));

    const glazingU = {
      single_clear_glazing: 5.0,
      double_clear_glazing: 2.8,
      double_low_e_face_3: 1.6,
      triple_low_e_faces_2_and_5: 0.9
    };
    const overrides = explicitOverrides ?? (state === scenarioState ? (scenarioOverrides || {}) : {});
    const finiteOverride = (key) => {
      const raw = overrides[key];
      return raw != null && raw !== "" && Number.isFinite(Number(raw)) ? Number(raw) : null;
    };

    const wallU = finiteOverride("wallU");
    const roofU = finiteOverride("roofU");
    const floorU = finiteOverride("floorU");
    const windowU = finiteOverride("windowU");
    const doorU = finiteOverride("doorU");

    formSet("wall_u_value", wallU ?? insulationU(1.30, state.wallIns).toFixed(4));
    formSet("roof_u_value", roofU ?? insulationU(1.00, state.roofIns).toFixed(4));
    formSet("floor_u_value", floorU ?? insulationU(0.90, state.floorIns).toFixed(4));
    formSet("window_u_value", windowU ?? (glazingU[state.glazing] || 1.6));
    formSet("door_u_value", doorU ?? 1.8);

    if (overrides.thermalBridgesOff) {
      formSet("thermal_bridge_length_m", 0);
      formSet("thermal_bridge_psi_w_mk", 0);
    } else {
      formSet("thermal_bridge_length_m", (perimeter * levels).toFixed(3));
      formSet("thermal_bridge_psi_w_mk", 0.08);
    }

    const overrideAch = finiteOverride("airChanges");
    const overrideRecovery = finiteOverride("heatRecovery");
    if (overrideAch != null || overrideRecovery != null) {
      formSet("air_changes_per_hour", overrideAch ?? 0.5);
      formSet("heat_recovery_efficiency", overrideRecovery ?? 0);
    } else if (state.ventilation === "hrv") {
      formSet("air_changes_per_hour", 0.5);
      formSet("heat_recovery_efficiency", 0.75);
    } else if (state.ventilation === "mechanical") {
      formSet("air_changes_per_hour", 0.65);
      formSet("heat_recovery_efficiency", 0);
    } else {
      formSet("air_changes_per_hour", 0.5);
      formSet("heat_recovery_efficiency", 0);
    }

    const overrideHeatingEfficiency = finiteOverride("heatingEfficiency");
    if (overrideHeatingEfficiency != null) {
      formSet("expert_heating_override", "on");
      formSet("heating_chain_enabled", "");
      formSet("heating_system_type", overrides.heatingSystemType || "condensing_gas_boiler");
      formSet("heating_carrier", overrides.heatingCarrier || "natural_gas");
      formSet("heating_efficiency", overrideHeatingEfficiency);
      formSet("heating_scop", "");
      formSet("heating_cost_profile", overrides.heatingCostProfile || "natural_gas");
      formSet("heating_choice", overrides.heatingSystemType || "condensing_gas_boiler");
    } else {
      formSet("expert_heating_override", "");
      formSet("heating_chain_enabled", "on");
      formSet("heating_choice", state.heating);
      formSet("heating_generator_type", heatingGeneratorType(state));
      formSet("heating_emitter_type", state.heatingEmitter);
      formSet("heating_distribution_type", state.heatingDistribution);
      formSet("heating_storage_type", state.heatingStorage);
      formSet("heating_control_type", state.heatingControl);
      formSet("heating_design_flow_temperature_c", "");
      formSet("heating_design_return_temperature_c", "");
      formSet("heating_auxiliary_electricity_kwh_year", "");
    }

    const overrideCoolingSeer = finiteOverride("coolingSeer");
    formSet("cooling_seer", overrideCoolingSeer ?? (state.cooling === "split" ? 4.2 : 4.0));

    const overrideDhwEfficiency = finiteOverride("dhwEfficiency");
    formSet("dhw_efficiency", overrideDhwEfficiency ?? 0.86);

    formSet("pv_enabled", state.pvEnabled ? "on" : "");
    formSet("pv_installed_power_kwp", state.pvKwp);
    formSet("pv_orientation", state.pvOrientation);
    formSet("pv_tilt_degrees", state.pvTilt);
    formSet("pv_performance_ratio", 0.82);
    formSet("solar_thermal_enabled", state.solarThermalEnabled ? "on" : "");
    formSet("solar_thermal_collector_area_m2", state.solarThermalArea);
    formSet("solar_thermal_orientation", state.solarThermalOrientation);
    formSet("solar_thermal_tilt_degrees", state.solarThermalTilt);
    formSet("solar_thermal_system_efficiency", 0.45);

    formSet("solar_glazing_type_id", state.glazing === "reference_mc001" ? homeState.glazing : state.glazing);
    formSet("solar_orientation", state.orientation);
    formSet("indoor_design_temperature_c", state.temperature);
    formSet("dhw_occupants", state.occupants);
    formSet("cooling_enabled", state.cooling === "none" ? "" : "on");
  }

  function setStatus(message, kind = "") {
    const node = $("#hlnStatus");
    if (!node) return;
    node.textContent = message;
    node.classList.toggle("is-error", kind === "error");
    node.classList.toggle("is-ok", kind === "ok");
  }

  function resultStateFor(target) {
    return target === "home" ? homeResultState : scenarioResultState;
  }

  function setResultState(target, state) {
    if (target === "home") homeResultState = state;
    else scenarioResultState = state;
  }

  function cancelOptimizerRun() {
    optimizerRunToken += 1;
    if (optimizerAbortController) {
      optimizerAbortController.abort();
      optimizerAbortController = null;
    }
  }

  function invalidateCalculation(target, message = "Se recalculează…") {
    clearTimeout(calculateTimer);
    calculateTimer = 0;
    calculateToken += 1;
    if (calculateAbortController) {
      calculateAbortController.abort();
      calculateAbortController = null;
    }
    cancelOptimizerRun();
    setResultState(target, "pending");
    setStatus(message);
    renderAll();
  }

  function pendingTextFor(target) {
    const state = resultStateFor(target);
    if (state === "error") return "Rezultat indisponibil";
    if (state === "stale") return "Actualizare necesară";
    return "Se recalculează…";
  }

  function renderResultFreshness() {
    const target = screen === "home" ? "home" : "scenario";
    const state = resultStateFor(target);
    const live = $("#hlnLiveConfigurator");
    if (live) live.classList.toggle("is-calculating", target === "scenario" && state !== "fresh");

    const allCalculatedSelectors = [
      "#hlnDockClass",
      "#hlnDockCost",
      "#hlnDockEnergy",
      "#hlnLiveCost",
      "#hlnLiveClass",
      "#hlnDockScenarioClass",
      "#hlnDockScenarioCost",
      "#hlnDockCostBenefit",
      "#hlnScenarioNewCost",
      "#hlnScenarioBenefit",
      "#hlnScenarioCostCompare",
      "#hlnScenarioEnergyCompare",
      "#hlnScenarioCo2Compare",
      "#hlnScenarioPowerCompare",
      "#hlnImpactCost",
      "#hlnImpactEnergy",
      "#hlnImpactEfficiency",
      "#hlnImpactCo2",
      "#hlnImpactLoad",
    ];
    if (state === "fresh") {
      allCalculatedSelectors.forEach(selector => $(selector)?.classList.remove("hln-calculating-value"));
      const cta = $("#hlnDockCta");
      if (cta) cta.disabled = false;
      return;
    }

    const pending = pendingTextFor(target);
    if (target === "home") {
      ["#hlnDockClass", "#hlnDockCost", "#hlnDockEnergy"].forEach(selector => {
        const node = $(selector);
        if (!node) return;
        node.textContent = pending;
        node.classList.remove("is-good", "is-bad");
        node.classList.add("hln-calculating-value");
      });
      const cta = $("#hlnDockCta");
      if (cta && screen === "home") cta.disabled = true;
      return;
    }

    const valueSelectors = allCalculatedSelectors.filter(selector =>
      !["#hlnDockClass", "#hlnDockCost", "#hlnDockEnergy"].includes(selector)
    );
    valueSelectors.forEach(selector => {
      const node = $(selector);
      if (!node) return;
      node.textContent = pending;
      node.classList.remove("is-good", "is-bad");
      node.classList.add("hln-calculating-value");
    });

    const saving = $("#hlnLiveSaving");
    if (saving) {
      saving.textContent = "Valorile vor fi actualizate pentru configurația curentă";
      saving.classList.remove("is-bad");
    }
    const dockLabel = $("#hlnDockSavingLabel");
    if (dockLabel) dockLabel.textContent = "Recalculare";
    const scenarioLabel = $("#hlnScenarioBenefitLabel");
    if (scenarioLabel) scenarioLabel.textContent = "rezultat în curs";

    $$("#hlnEnergyScale [data-energy-class]").forEach(node => node.classList.remove("is-active"));
    const pvCaption = live?.querySelector('[data-hln-tune="pvKwp"] [data-hln-tune-caption]');
    if (pvCaption && scenarioState.pvEnabled) pvCaption.textContent = "Se recalculează producția și autoconsumul…";

    const cta = $("#hlnDockCta");
    if (cta && screen === "scenario") cta.disabled = true;
  }

  async function calculateState(state, target) {
    const token = ++calculateToken;
    if (calculateAbortController) calculateAbortController.abort();
    const controller = new AbortController();
    calculateAbortController = controller;
    setResultState(target, "pending");

    populateTechnicalForm(state);
    const body = new FormData(form);
    if (target === "scenario") body.set("_skip_reference", "1");
    setStatus("Recalculare live…");
    renderAll();

    const request = async (attempt = 1) => {
      const response = await fetch(calcUrl, {
        method: "POST",
        body,
        signal: controller.signal,
      });
      const contentType = response.headers.get("content-type") || "";
      let payload = null;
      if (contentType.includes("application/json")) {
        payload = await response.json();
      } else {
        await response.text();
      }

      if (!response.ok || !payload || payload.error) {
        // Do not immediately retry generic HTTP 500 responses: a Cloudflare
        // 1102 resource-limit failure can surface as 500 and retrying it would
        // create more pressure. Retry only clearly transient edge statuses.
        const retryable = [429, 502, 503, 504].includes(response.status);
        if (retryable && attempt < 2 && token === calculateToken) {
          await new Promise(resolve => window.setTimeout(resolve, 420));
          if (token !== calculateToken || controller.signal.aborted) return null;
          return request(attempt + 1);
        }
        if (payload?.error) throw new Error(payload.error);
        throw new Error(`Calcul indisponibil momentan (HTTP ${response.status || "?"}).`);
      }
      return payload;
    };

    try {
      const payload = await request();
      if (!payload || token !== calculateToken || controller.signal.aborted) return null;
      if (target === "home") homeResult = payload;
      if (target === "scenario") scenarioResult = payload;
      currentResult = payload;
      setResultState(target, "fresh");
      setStatus("Calcul actualizat", "ok");
      renderAll();
      emitVisualState();
      return payload;
    } catch (error) {
      if (error?.name === "AbortError" || token !== calculateToken) return null;
      setResultState(target, "error");
      setStatus(error?.message || "Calcul indisponibil momentan.", "error");
      renderAll();
      return null;
    } finally {
      if (calculateAbortController === controller) calculateAbortController = null;
    }
  }

  function optimizerCandidateCacheKey(body, compact) {
    const entries = [];
    for (const [key, rawValue] of body.entries()) {
      const value = typeof rawValue === "string"
        ? rawValue
        : `${rawValue?.name || "file"}:${rawValue?.size || 0}:${rawValue?.type || ""}`;
      entries.push(`${key}=${value}`);
    }
    entries.sort();
    return `${compact ? "compact" : "full"}|${entries.join("&")}`;
  }

  function rememberOptimizerCandidate(key, payload) {
    if (optimizerCandidateCache.has(key)) optimizerCandidateCache.delete(key);
    optimizerCandidateCache.set(key, payload);
    while (optimizerCandidateCache.size > OPTIMIZER_CANDIDATE_CACHE_MAX) {
      const oldest = optimizerCandidateCache.keys().next().value;
      optimizerCandidateCache.delete(oldest);
    }
  }

  async function calculateCandidate(state, overrides = {}, options = {}) {
    const compact = options.compact !== false;
    populateTechnicalForm(state, overrides);
    const body = new FormData(form);
    body.set("_skip_reference", "1");
    if (compact) body.set("_optimizer_candidate", "1");

    const cacheKey = optimizerCandidateCacheKey(body, compact);
    if (optimizerCandidateCache.has(cacheKey)) {
      return optimizerCandidateCache.get(cacheKey);
    }

    if (optimizerEvaluationCount >= OPTIMIZER_MAX_ENGINE_EVALUATIONS) {
      throw new Error(`Bugetul de calcul al optimizerului a fost atins (${OPTIMIZER_MAX_ENGINE_EVALUATIONS} evaluări). Ajustează datele sau costurile și încearcă din nou.`);
    }
    optimizerEvaluationCount += 1;

    const response = await fetch(calcUrl, {
      method: "POST",
      body,
      signal: optimizerAbortController?.signal,
    });
    const contentType = response.headers.get("content-type") || "";
    const payload = contentType.includes("application/json") ? await response.json() : null;
    if (!response.ok || !payload || payload.error) {
      throw new Error(payload?.error || `Calcul candidat indisponibil (HTTP ${response.status || "?"}).`);
    }
    rememberOptimizerCandidate(cacheKey, payload);
    return payload;
  }

  function equivalentInsulationCm(baseU, targetU) {
    const lambda = 0.040;
    const target = Number(targetU);
    if (!Number.isFinite(target) || target <= 0) return 0;
    const centimetres = Math.max(0, (1 / target - 1 / baseU) * lambda * 100);
    return Math.ceil(centimetres);
  }

  function currentEnvelopeU(state, key, overrides = {}) {
    const explicit = Number(overrides?.[key]);
    if (Number.isFinite(explicit) && explicit > 0) return explicit;
    if (key === "wallU") return insulationU(1.30, state.wallIns);
    if (key === "roofU") return insulationU(1.00, state.roofIns);
    if (key === "floorU") return insulationU(0.90, state.floorIns);
    if (key === "windowU") {
      return {
        single_clear_glazing: 5.0,
        double_clear_glazing: 2.8,
        double_low_e_face_3: 1.6,
        triple_low_e_faces_2_and_5: 0.9,
      }[state.glazing] || 1.6;
    }
    if (key === "doorU") return 1.8;
    return null;
  }

  function nzebEnvelopeStatus(state, overrides, target) {
    const limits = target?.envelope_u_max_w_m2k || {};
    const checks = [
      ["wall", "Pereți exteriori", "wallU", Number(limits.exterior_wall)],
      ["roof", "Acoperiș / planșeu superior", "roofU", Number(limits.roof)],
      ["floor", "Pardoseală", "floorU", Number(limits.floor_generic_conservative)],
      ["windows", "Ferestre", "windowU", Number(limits.window)],
      ["door", "Ușă exterioară", "doorU", Number(limits.exterior_door)],
    ].filter(([, , , limit]) => Number.isFinite(limit) && limit > 0)
      .map(([id, label, key, limit]) => {
        const actual = Number(currentEnvelopeU(state, key, overrides));
        return {id, label, key, limit, actual, ok:Number.isFinite(actual) && actual <= limit + 1e-9};
      });
    return {checks, meets:checks.every(item => item.ok)};
  }

  function nzebEnvelopeActions(state, overrides, target) {
    const status = nzebEnvelopeStatus(state, overrides, target);
    return status.checks.filter(item => !item.ok).map(item => ({
      id:item.id,
      label:`${item.label} · U ≤ ${fmt(item.limit,2)} W/m²K`,
      kind:"mc001-envelope",
      apply(baseState, baseOverrides) {
        const nextState = {...baseState};
        const nextOverrides = {...baseOverrides};
        if (item.id === "wall") {
          nextState.wallIns = Math.max(Number(nextState.wallIns || 0), equivalentInsulationCm(1.30, item.limit));
          nextOverrides.wallU = item.limit;
        }
        if (item.id === "roof") {
          nextState.roofIns = Math.max(Number(nextState.roofIns || 0), equivalentInsulationCm(1.00, item.limit));
          nextOverrides.roofU = item.limit;
        }
        if (item.id === "floor") {
          nextState.floorIns = Math.max(Number(nextState.floorIns || 0), equivalentInsulationCm(0.90, item.limit));
          nextOverrides.floorU = item.limit;
        }
        if (item.id === "windows") {
          nextState.glazing = "triple_low_e_faces_2_and_5";
          nextOverrides.windowU = Math.min(0.9, item.limit);
        }
        if (item.id === "door") nextOverrides.doorU = item.limit;
        return {state:nextState, overrides:nextOverrides};
      },
    }));
  }

  function regulatoryResultScore(result, target) {
    if (!target) return 0;
    const primaryLimit = Number(target?.primary_energy_kwh_m2_year);
    const co2Limit = Number(target?.co2_kg_m2_year);
    const primary = Number(result?.primary_specific_kwh_m2);
    const co2 = Number(result?.co2_specific_kg_m2);
    if (![primaryLimit, co2Limit, primary, co2].every(Number.isFinite)) return Infinity;
    return Math.max(primary / primaryLimit, co2 / co2Limit);
  }

  function regulatoryMeetsTarget(result, target, state = null, overrides = {}) {
    if (!target) return true;
    if (regulatoryResultScore(result, target) > 1.000001) return false;
    if (target.target_kind === "new_nzeb" && target.envelope_u_max_w_m2k && state) {
      return nzebEnvelopeStatus(state, overrides, target).meets;
    }
    return true;
  }

  function regulatoryTargetForProjectMode() {
    if (projectMode === "new_nzeb") return homeResult?.nzeb_target || null;
    if (projectMode === "existing_major") return homeResult?.renovation_target || null;
    return null;
  }

  function projectModeLabel() {
    return {
      existing_standard:"Clădire existentă · renovare obișnuită",
      existing_major:"Clădire existentă · renovare majoră",
      new_nzeb:"Clădire nouă · nZEB",
    }[projectMode] || "Clădire existentă";
  }

  function nzebResultScore(result, target) {
    return regulatoryResultScore(result, target);
  }

  function nzebMeetsTarget(result, target) {
    return regulatoryMeetsTarget(result, target);
  }

  function optimizerHeatPumpState(baseState) {
    const next = {...baseState, heating:"heat_pump"};
    const hasHydronicDistribution = !["local", "air"].includes(baseState.heatingDistribution)
      && !["local", "air"].includes(baseState.heatingEmitter);
    if (hasHydronicDistribution) {
      Object.assign(next, {
        heatPumpSource:"heat_pump_air_water",
        heatingEmitter:baseState.heatingEmitter === "underfloor" ? "underfloor" : "radiators_low_temp",
        heatingDistribution:baseState.heatingEmitter === "underfloor" ? "underfloor" : "hydronic_insulated",
        heatingStorage:"none",
        heatingControl:"weather_compensated",
      });
    } else {
      Object.assign(next, {
        heatPumpSource:"heat_pump_air_air",
        heatingEmitter:"air",
        heatingDistribution:"air",
        heatingStorage:"none",
        heatingControl:"zoned",
      });
    }
    return next;
  }

  function optimizerAction({
    id,
    family = id,
    label,
    kind = "lacurent-option",
    complexity = 1,
    magnitude = 1,
    apply,
  }) {
    return {id, family, label, kind, complexity, magnitude, apply};
  }

  function adaptiveOptimizerActions(state, overrides, target, mode) {
    const actions = [];
    const envelopeLimits = target?.envelope_u_max_w_m2k || {};

    if (mode === "roi") {
      const envelopeVariants = [
        {family:"roof", baseU:1.00, stateKey:"roofIns", targetU:Number(envelopeLimits.roof), step:10, label:"Izolație suplimentară pod"},
        {family:"wall", baseU:1.30, stateKey:"wallIns", targetU:Number(envelopeLimits.exterior_wall), step:10, label:"Izolație suplimentară fațadă"},
        {family:"floor", baseU:0.90, stateKey:"floorIns", targetU:Number(envelopeLimits.floor_generic_conservative), step:5, label:"Izolație suplimentară pardoseală"},
      ];
      for (const item of envelopeVariants) {
        const currentCm = Math.max(Number(state[item.stateKey] || 0), 0);
        const actualU = Number(currentEnvelopeU(state, {
          wallIns:"wallU",
          roofIns:"roofU",
          floorIns:"floorU",
        }[item.stateKey] || "", overrides));
        const alreadyStrong = Number.isFinite(item.targetU)
          && item.targetU > 0
          && Number.isFinite(actualU)
          && actualU <= item.targetU + 1e-9;
        if (alreadyStrong) continue;

        const level = Math.ceil(
          Number.isFinite(item.targetU) && item.targetU > 0
            ? Math.max(currentCm, equivalentInsulationCm(item.baseU, item.targetU))
            : currentCm + item.step
        );
        if (level <= currentCm + 0.1) continue;
        actions.push(optimizerAction({
          id:`${item.family}_${level}`,
          family:item.family,
          label:`${item.label} la ${fmt(level)} cm`,
          kind:"envelope",
          magnitude:level,
          apply(baseState, baseOverrides) {
            return {
              state:{...baseState, [item.stateKey]:Math.max(Number(baseState[item.stateKey] || 0), level)},
              overrides:{...baseOverrides},
            };
          },
        }));
      }

      if (state.glazing !== "triple_low_e_faces_2_and_5") {
        actions.push(optimizerAction({
          id:"windows_triple",
          family:"windows",
          label:"Ferestre tripan Low-E",
          kind:"envelope",
          apply(baseState, baseOverrides) {
            return {
              state:{...baseState, glazing:"triple_low_e_faces_2_and_5"},
              overrides:{...baseOverrides},
            };
          },
        }));
      }

      if (
        target?.target_kind === "new_nzeb" &&
        Number(envelopeLimits.exterior_door) > 0 &&
        Number(currentEnvelopeU(state, "doorU", overrides)) > Number(envelopeLimits.exterior_door) + 1e-9
      ) {
        actions.push(optimizerAction({
          id:"door_nzeb",
          family:"door",
          label:`Ușă exterioară · U ≤ ${fmt(envelopeLimits.exterior_door,2)} W/m²K`,
          kind:"mc001-envelope",
          apply(baseState, baseOverrides) {
            return {
              state:{...baseState},
              overrides:{...baseOverrides, doorU:Number(envelopeLimits.exterior_door)},
            };
          },
        }));
      }
    }

    if (state.ventilation !== "hrv") {
      actions.push(optimizerAction({
        id:"ventilation_hrv",
        family:"ventilation",
        label:"Ventilație cu recuperare",
        apply(baseState, baseOverrides) {
          const nextOverrides = {...baseOverrides};
          delete nextOverrides.airChanges;
          delete nextOverrides.heatRecovery;
          return {state:{...baseState, ventilation:"hrv"}, overrides:nextOverrides};
        },
      }));
    }

    const hydronic = !["local", "air"].includes(state.heatingDistribution)
      && !["local", "air"].includes(state.heatingEmitter);
    if (hydronic && state.heatingControl !== "weather_compensated") {
      actions.push(optimizerAction({
        id:"heating_control_weather",
        family:"heating_control",
        label:"Control cu compensare climatică",
        apply(baseState, baseOverrides) {
          return {
            state:{...baseState, heatingControl:"weather_compensated"},
            overrides:{...baseOverrides},
          };
        },
      }));
    }

    if (state.heating !== "heat_pump") {
      actions.push(optimizerAction({
        id:"heating_heat_pump",
        family:"heating",
        label:"Pompă de căldură compatibilă cu distribuția existentă",
        apply(baseState, baseOverrides) {
          return {
            state:optimizerHeatPumpState(baseState),
            overrides:{...baseOverrides},
          };
        },
      }));
    }

    const currentPv = state.pvEnabled ? Math.max(Number(state.pvKwp || 0), 0) : 0;
    const pvLevels = mode === "nzeb" ? [5, 15] : [3, 5];
    for (const level of pvLevels.filter(value => value > currentPv + 0.01)) {
      actions.push(optimizerAction({
        id:`pv_${level}`,
        family:"pv",
        label:`${state.pvEnabled ? "Extinde" : "Adaugă"} PV la ${fmt(level,1)} kWp`,
        magnitude:level,
        apply(baseState, baseOverrides) {
          return {
            state:{
              ...baseState,
              pvEnabled:true,
              pvKwp:Math.max(Number(baseState.pvKwp || 0), level),
              pvOrientation:baseState.pvEnabled ? baseState.pvOrientation : "south",
              pvTilt:baseState.pvEnabled ? baseState.pvTilt : 30,
            },
            overrides:{...baseOverrides},
          };
        },
      }));
    }

    const currentSolar = state.solarThermalEnabled ? Math.max(Number(state.solarThermalArea || 0), 0) : 0;
    const solarLevels = mode === "nzeb" ? [4, 8] : [4];
    for (const level of solarLevels.filter(value => value > currentSolar + 0.01)) {
      actions.push(optimizerAction({
        id:`solar_thermal_${level}`,
        family:"solar_thermal",
        label:`${state.solarThermalEnabled ? "Extinde" : "Adaugă"} solar termic la ${fmt(level,1)} m²`,
        magnitude:level,
        apply(baseState, baseOverrides) {
          return {
            state:{
              ...baseState,
              solarThermalEnabled:true,
              solarThermalArea:Math.max(Number(baseState.solarThermalArea || 0), level),
              solarThermalOrientation:baseState.solarThermalEnabled ? baseState.solarThermalOrientation : "south",
              solarThermalTilt:baseState.solarThermalEnabled ? baseState.solarThermalTilt : 45,
            },
            overrides:{...baseOverrides},
          };
        },
      }));
    }

    return actions;
  }

  function roiGeometry(state) {
    const area = Math.max(Number(state.area) || 0, 1);
    const levels = Math.max(Number(state.levels) || 1, 1);
    const height = Math.max(Number(state.height) || 0, 0.1);
    const windows = Math.max(Number(state.windows) || 0, 0);
    const doors = 2.2;
    const footprint = area / levels;
    const aspect = 1.25;
    const width = Math.sqrt(footprint / aspect);
    const length = width * aspect;
    const perimeter = 2 * (length + width);
    const wallArea = Math.max(1, perimeter * height * levels - windows - doors);
    return {area, levels, height, windows, doors, footprint, wallArea};
  }

  function positiveRoiCost(family) {
    const value = Number(roiCostBasis?.[family]);
    return Number.isFinite(value) && value > 0 ? value : null;
  }

  function roiCapexForAction(action, baseState, candidateState) {
    const family = action.family || action.id;
    const rate = positiveRoiCost(family);
    if (rate == null) return null;
    const geometry = roiGeometry(baseState);

    if (family === "wall") {
      const deltaCm = Math.max(Number(candidateState.wallIns || 0) - Number(baseState.wallIns || 0), 0);
      return deltaCm > 0 ? geometry.wallArea * deltaCm * rate : null;
    }
    if (family === "roof") {
      const deltaCm = Math.max(Number(candidateState.roofIns || 0) - Number(baseState.roofIns || 0), 0);
      return deltaCm > 0 ? geometry.footprint * deltaCm * rate : null;
    }
    if (family === "floor") {
      const deltaCm = Math.max(Number(candidateState.floorIns || 0) - Number(baseState.floorIns || 0), 0);
      return deltaCm > 0 ? geometry.footprint * deltaCm * rate : null;
    }
    if (family === "windows") return geometry.windows * rate;
    if (family === "door") return rate;
    if (family === "ventilation") return rate;
    if (family === "heating_control") return rate;
    if (family === "heating") return rate;
    if (family === "pv") {
      const before = baseState.pvEnabled ? Math.max(Number(baseState.pvKwp || 0), 0) : 0;
      const after = candidateState.pvEnabled ? Math.max(Number(candidateState.pvKwp || 0), 0) : 0;
      const delta = Math.max(after - before, 0);
      return delta > 0 ? delta * rate : null;
    }
    if (family === "solar_thermal") {
      const before = baseState.solarThermalEnabled ? Math.max(Number(baseState.solarThermalArea || 0), 0) : 0;
      const after = candidateState.solarThermalEnabled ? Math.max(Number(candidateState.solarThermalArea || 0), 0) : 0;
      const delta = Math.max(after - before, 0);
      return delta > 0 ? delta * rate : null;
    }
    return null;
  }

  function roiEconomics(baselineResult, result, capexLei) {
    const baselineCost = Number(baselineResult?.annual_cost_lei);
    const newCost = Number(result?.annual_cost_lei);
    const capex = Number(capexLei);
    const annualSavingLei = Number.isFinite(baselineCost) && Number.isFinite(newCost)
      ? baselineCost - newCost
      : NaN;
    const roiPercentPerYear = Number.isFinite(annualSavingLei) && Number.isFinite(capex) && capex > 0
      ? 100 * annualSavingLei / capex
      : NaN;
    const paybackYears = Number.isFinite(annualSavingLei) && annualSavingLei > 0 && capex > 0
      ? capex / annualSavingLei
      : null;
    return {
      capexLei:capex,
      annualSavingLei,
      roiPercentPerYear,
      paybackYears,
      positive:Number.isFinite(roiPercentPerYear) && roiPercentPerYear > 0,
    };
  }

  async function evaluateActionVariants(baseState, baseOverrides, baseResult, actions, mode, target) {
    const rows = [];
    for (const action of actions) {
      const candidate = action.apply(baseState, baseOverrides);
      const result = await calculateCandidate(candidate.state, candidate.overrides);
      if (mode === "nzeb") {
        const before = regulatoryResultScore(baseResult, target);
        const after = regulatoryResultScore(result, target);
        const improvement = before - after;
        rows.push({
          action,
          ...candidate,
          result,
          improvement,
          objective:improvement,
          meetsTarget:regulatoryMeetsTarget(result, target, candidate.state, candidate.overrides),
        });
      } else {
        const capexLei = roiCapexForAction(action, baseState, candidate.state);
        const economics = roiEconomics(baseResult, result, capexLei);
        const before = regulatoryResultScore(baseResult, target);
        const after = regulatoryResultScore(result, target);
        rows.push({
          action,
          ...candidate,
          result,
          ...economics,
          regulatoryImprovement:target ? before - after : 0,
          meetsTarget:regulatoryMeetsTarget(result, target, candidate.state, candidate.overrides),
          costKnown:Number.isFinite(capexLei) && capexLei > 0,
          objective:Number.isFinite(economics.roiPercentPerYear) ? economics.roiPercentPerYear : -Infinity,
        });
      }
    }
    return rows;
  }

  function bestVariantPerFamily(rows, mode) {
    const families = new Map();
    for (const row of rows) {
      const previous = families.get(row.action.family);
      if (!previous) {
        families.set(row.action.family, row);
        continue;
      }
      if (mode === "nzeb") {
        if (
          row.meetsTarget && !previous.meetsTarget ||
          row.meetsTarget === previous.meetsTarget && (
            row.improvement > previous.improvement + 1e-9 ||
            Math.abs(row.improvement - previous.improvement) <= 1e-9
              && row.action.magnitude < previous.action.magnitude
          )
        ) families.set(row.action.family, row);
      } else if (
        row.objective > previous.objective + 1e-9 ||
        Math.abs(row.objective - previous.objective) <= 1e-9
          && row.annualSavingLei > previous.annualSavingLei
      ) {
        families.set(row.action.family, row);
      }
    }
    return [...families.values()];
  }

  function setOptimizationNote(html, kind = "") {
    const node = $("#hlnOptimizationNote");
    if (!node) return;
    node.hidden = !html;
    node.innerHTML = html || "";
    node.classList.toggle("is-good", kind === "good");
    node.classList.toggle("is-warn", kind === "warn");
  }

  function beginOptimizerRun() {
    clearTimeout(calculateTimer);
    calculateTimer = 0;
    if (calculateAbortController) {
      calculateAbortController.abort();
      calculateAbortController = null;
    }
    calculateToken += 1;
    cancelOptimizerRun();
    optimizerEvaluationCount = 0;
    optimizerAbortController = new AbortController();
    scenarioResultState = "pending";
    renderAll();
    return optimizerRunToken;
  }

  function applyOptimizerResult(state, result, overrides, meta) {
    scenarioState = migrateStoredHeatingState(state, homeState);
    scenarioOverrides = {...overrides};
    scenarioResult = result;
    currentResult = result;
    scenarioResultState = "fresh";
    referenceMode = false;
    optimizationMeta = meta;
    syncMeasuresFromScenario();
    renderAll();
    persist();
    emitVisualState(meta?.mode || "optimizer");
  }

  function roiRowSummary(row) {
    return {
      id:row.action.id,
      family:row.action.family,
      label:row.action.label,
      kind:row.action.kind,
      capexLei:row.capexLei,
      annualSavingLei:row.annualSavingLei,
      roiPercentPerYear:row.roiPercentPerYear,
      paybackYears:row.paybackYears,
      regulatoryImprovement:row.regulatoryImprovement,
    };
  }

  function applyOptimizerRows(rows) {
    let state = migrateStoredHeatingState({...homeState}, defaultState);
    let overrides = {};
    for (const row of rows) {
      const candidate = row.action.apply(state, overrides);
      state = candidate.state;
      overrides = candidate.overrides;
    }
    return {state, overrides};
  }

  async function configureNzeb() {
    if (!baselineSaved || !homeResult?.nzeb_target) {
      setOptimizationNote("<strong>Ținta nZEB nu este disponibilă.</strong><span>Lipsește zona climatică sau lookup-ul MC001 2.10a.</span>", "warn");
      return;
    }
    const runToken = beginOptimizerRun();
    const buttons = $$("[data-hln-smart-config]");
    buttons.forEach(button => button.disabled = true);
    setStatus("Caut o configurație fezabilă spre nZEB…");
    setOptimizationNote("<strong>Optimizer nZEB în lucru…</strong><span>Aplic cerințele de anvelopă împreună, apoi evaluez doar familiile de instalații/regenerabile care pot îmbunătăți ținta.</span>");

    try {
      const target = homeResult.nzeb_target;
      let state = migrateStoredHeatingState({...homeState}, defaultState);
      let overrides = {};
      let current = homeResult;
      const selected = [];
      let evaluatedCandidates = 0;

      // MC001 envelope limits are mandatory constraints, not competing commercial
      // options. Apply all missing envelope requirements in one deterministic
      // package instead of spending one Worker request per element.
      const envelopeActions = nzebEnvelopeActions(state, overrides, target);
      for (const action of envelopeActions) {
        const candidate = action.apply(state, overrides);
        state = candidate.state;
        overrides = candidate.overrides;
        selected.push({id:action.id, label:action.label, kind:action.kind});
      }
      if (envelopeActions.length) {
        current = await calculateCandidate(state, overrides);
        evaluatedCandidates += 1;
      }

      if (!nzebMeetsTarget(current, target)) {
        const actions = adaptiveOptimizerActions(state, overrides, target, "nzeb");
        const evaluated = await evaluateActionVariants(
          state,
          overrides,
          current,
          actions,
          "nzeb",
          target
        );
        evaluatedCandidates += actions.length;

        const familyWinners = bestVariantPerFamily(evaluated, "nzeb")
          .filter(item => item.improvement > 1e-6 || item.meetsTarget)
          .sort((a, b) => {
            if (a.meetsTarget !== b.meetsTarget) return a.meetsTarget ? -1 : 1;
            if (Math.abs(b.objective - a.objective) > 1e-9) return b.objective - a.objective;
            return a.action.complexity - b.action.complexity;
          });

        for (const row of familyWinners) {
          if (nzebMeetsTarget(current, target)) break;
          const candidate = row.action.apply(state, overrides);
          const result = await calculateCandidate(candidate.state, candidate.overrides);
          evaluatedCandidates += 1;
          const before = nzebResultScore(current, target);
          const after = nzebResultScore(result, target);
          if (!(after < before - 1e-6 || nzebMeetsTarget(result, target))) continue;
          state = candidate.state;
          overrides = candidate.overrides;
          current = result;
          selected.push({
            id:row.action.id,
            label:row.action.label,
            kind:row.action.kind,
          });
        }

        // One bounded intensification pass. This handles cases where a modest PV
        // or solar variant ranked best alone but the combined package still needs
        // more renewable contribution. It does not reopen the full search tree.
        if (!nzebMeetsTarget(current, target)) {
          const intensifiers = [
            optimizerAction({
              id:"pv_15_intensify",
              family:"pv",
              label:"PV până la 15 kWp",
              complexity:8,
              magnitude:15,
              apply(baseState, baseOverrides) {
                return {
                  state:{
                    ...baseState,
                    pvEnabled:true,
                    pvKwp:Math.max(Number(baseState.pvKwp || 0), 15),
                    pvOrientation:baseState.pvEnabled ? baseState.pvOrientation : "south",
                    pvTilt:baseState.pvEnabled ? baseState.pvTilt : 30,
                  },
                  overrides:{...baseOverrides},
                };
              },
            }),
            optimizerAction({
              id:"solar_thermal_8_intensify",
              family:"solar_thermal",
              label:"Solar termic până la 8 m²",
              complexity:4,
              magnitude:8,
              apply(baseState, baseOverrides) {
                return {
                  state:{
                    ...baseState,
                    solarThermalEnabled:true,
                    solarThermalArea:Math.max(Number(baseState.solarThermalArea || 0), 8),
                    solarThermalOrientation:baseState.solarThermalEnabled ? baseState.solarThermalOrientation : "south",
                    solarThermalTilt:baseState.solarThermalEnabled ? baseState.solarThermalTilt : 45,
                  },
                  overrides:{...baseOverrides},
                };
              },
            }),
          ];

          for (const action of intensifiers) {
            if (nzebMeetsTarget(current, target)) break;
            const candidate = action.apply(state, overrides);
            const unchanged = JSON.stringify(candidate.state) === JSON.stringify(state);
            if (unchanged) continue;
            const result = await calculateCandidate(candidate.state, candidate.overrides);
            evaluatedCandidates += 1;
            if (nzebResultScore(result, target) >= nzebResultScore(current, target) - 1e-6) continue;
            state = candidate.state;
            overrides = candidate.overrides;
            current = result;
            selected.push({id:action.id, label:action.label, kind:action.kind});
          }
        }
      }

      const envelopeStatus = nzebEnvelopeStatus(state, overrides, target);
      current = await calculateCandidate(state, overrides, {compact:false});
      evaluatedCandidates += 1;
      const meetsEnergyCo2 = nzebMeetsTarget(current, target);
      applyOptimizerResult(state, current, overrides, {
        mode:"nzeb",
        label:"Țintă nZEB · configurație adaptivă",
        meetsEnergyCo2,
        envelopeMeets:envelopeStatus.meets,
        source:target.source,
        envelopeSource:target.envelope_source,
        note:target.renewable_requirement_status,
        selected,
        evaluatedCandidates:optimizerEvaluationCount,
      });

      const resultHeadline = meetsEnergyCo2
        ? "Țintă nZEB atinsă pentru energie primară și CO₂ · verificarea completă RER este necesară."
        : "Configurația fezabilă testată rămâne peste ținta energetică/CO₂ din Tabelul 2.10a.";
      setOptimizationNote(
        `<strong>${escapeHtml(resultHeadline)}</strong>
         <span>${selected.length} intervenții în pachet · EP ${fmt(current.primary_specific_kwh_m2,1)}/${fmt(target.primary_energy_kwh_m2_year,1)} kWh/m²·an · CO₂ ${fmt(current.co2_specific_kg_m2,1)}/${fmt(target.co2_kg_m2_year,1)} kg/m²·an.</span>
         <small>Optimizer bounded: ${optimizerEvaluationCount} evaluări ale motorului, fără limită artificială la numărul de intervenții. Anvelopa urmează pragurile metodologice; instalațiile și regenerabilele sunt selectate numai dacă îmbunătățesc ținta.</small>`,
        meetsEnergyCo2 && envelopeStatus.meets ? "good" : "warn"
      );
      setStatus("Configurație nZEB calculată", meetsEnergyCo2 ? "ok" : "");
    } catch (error) {
      if (error?.name === "AbortError" || runToken !== optimizerRunToken) return;
      scenarioResultState = scenarioResult ? "stale" : "empty";
      setOptimizationNote(`<strong>Optimizer nZEB indisponibil.</strong><span>${escapeHtml(error?.message || "Eroare necunoscută")}</span>`, "warn");
      setStatus(error?.message || "Optimizer nZEB indisponibil.", "error");
      renderAll();
    } finally {
      buttons.forEach(button => button.disabled = false);
      populateTechnicalForm(scenarioState, scenarioOverrides);
      if (runToken === optimizerRunToken) optimizerAbortController = null;
    }
  }

  async function configureBestRoi() {
    if (!baselineSaved || !homeResult) return;

    const target = regulatoryTargetForProjectMode();
    if (projectMode !== "existing_standard" && !target) {
      setOptimizationNote("<strong>Best ROI nu poate aplica guardrail-ul selectat.</strong><span>Lipsește pragul metodologic pentru zona climatică / tipul clădirii.</span>", "warn");
      return;
    }

    const actions = adaptiveOptimizerActions(
      migrateStoredHeatingState({...homeState}, defaultState),
      {},
      target,
      "roi"
    );
    const mandatoryFamilies = new Set(
      projectMode === "new_nzeb"
        ? nzebEnvelopeActions(homeState, {}, target).map(action => action.id)
        : []
    );

    const missingMandatoryCosts = [...mandatoryFamilies].filter(family => positiveRoiCost(family) == null);
    const knownActions = actions.filter(action => positiveRoiCost(action.family) != null);
    const missingFamilies = [...new Set(
      actions
        .filter(action => positiveRoiCost(action.family) == null)
        .map(action => action.family)
    )];

    if (missingMandatoryCosts.length) {
      const details = $("#hlnRoiCostDetails");
      if (details) details.open = true;
      setOptimizationNote(
        `<strong>CAPEX incomplet pentru Best ROI nZEB.</strong><span>Lipsesc costuri pentru: ${escapeHtml(missingMandatoryCosts.join(", "))}. Nu inventez aceste costuri și nu pot calcula un ROI nZEB corect fără ele.</span>`,
        "warn"
      );
      return;
    }
    if (!knownActions.length) {
      const details = $("#hlnRoiCostDetails");
      if (details) details.open = true;
      setOptimizationNote(
        "<strong>Introdu costurile investiției pentru Best ROI.</strong><span>ROI-ul real are nevoie de CAPEX. Câmpurile goale sunt excluse, nu estimate automat.</span>",
        "warn"
      );
      return;
    }

    const runToken = beginOptimizerRun();
    const buttons = $$("[data-hln-smart-config]");
    buttons.forEach(button => button.disabled = true);
    setStatus("Calculez Best ROI…");
    setOptimizationNote(
      `<strong>Best ROI în lucru…</strong><span>Recalculez soluțiile tehnice cu CAPEX cunoscut și caut randamentul maxim sub guardrail-ul „${escapeHtml(projectModeLabel())}”. Interfața rămâne activă.</span>`
    );

    try {
      const baseState = migrateStoredHeatingState({...homeState}, defaultState);
      const evaluated = await evaluateActionVariants(
        baseState,
        {},
        homeResult,
        knownActions,
        "roi",
        target
      );
      if (runToken !== optimizerRunToken) return;

      const familyWinners = bestVariantPerFamily(evaluated, "roi");
      const rankedOpportunities = familyWinners
        .filter(row => row.costKnown && Number.isFinite(row.roiPercentPerYear))
        .sort((a, b) => b.roiPercentPerYear - a.roiPercentPerYear);

      if (!rankedOpportunities.length) {
        setOptimizationNote(
          "<strong>Nu există încă o soluție cu ROI calculabil.</strong><span>Costurile introduse există, dar economia anuală nu poate fi evaluată pozitiv pentru candidații disponibili.</span>",
          "warn"
        );
        setStatus("Best ROI fără candidat financiar pozitiv");
        scenarioResultState = scenarioResult ? "stale" : "empty";
        renderAll();
        return;
      }

      let selectedRows = [];
      let state = baseState;
      let overrides = {};
      let current = null;
      let economics = null;

      if (!target) {
        const positive = rankedOpportunities.filter(row => row.positive);
        if (!positive.length) {
          setOptimizationNote(
            "<strong>Nicio intervenție nu are ROI pozitiv cu datele curente.</strong><span>Nu forțez o recomandare doar pentru a produce un rezultat.</span>",
            "warn"
          );
          setStatus("Best ROI fără investiție cu randament pozitiv");
          scenarioResultState = scenarioResult ? "stale" : "empty";
          renderAll();
          return;
        }

        selectedRows = [positive[0]];
        state = selectedRows[0].state;
        overrides = selectedRows[0].overrides;
        current = selectedRows[0].result;
        economics = roiEconomics(homeResult, current, selectedRows[0].capexLei);

        // Testează sinergiile cumulativ, dar numai cât timp rămâne un slot
        // rezervat pentru rezultatul final complet. Nu există limită pe numărul
        // de măsuri; limita este exclusiv numărul de evaluări ale motorului.
        for (const row of positive.slice(1)) {
          if (optimizerEvaluationCount >= OPTIMIZER_MAX_ENGINE_EVALUATIONS - 1) break;
          const candidate = row.action.apply(state, overrides);
          const result = await calculateCandidate(candidate.state, candidate.overrides);
          const packageCapex = selectedRows.reduce((sum, item) => sum + item.capexLei, 0) + row.capexLei;
          const packageEconomics = roiEconomics(homeResult, result, packageCapex);
          if (
            packageEconomics.positive &&
            packageEconomics.roiPercentPerYear > economics.roiPercentPerYear + 1e-6
          ) {
            selectedRows.push(row);
            state = candidate.state;
            overrides = candidate.overrides;
            current = result;
            economics = packageEconomics;
          }
        }
      } else {
        // Pentru un proiect cu prag global, pornește de la toate familiile cu
        // CAPEX cunoscut. Apoi elimină măsuri dacă pachetul rămâne conform și
        // ROI-ul pachetului crește. Astfel numărul de intervenții nu este plafonat.
        selectedRows = [...familyWinners].filter(row => row.costKnown);
        const mandatoryMissingFromPackage = [...mandatoryFamilies].filter(
          family => !selectedRows.some(row => row.action.family === family)
        );
        if (mandatoryMissingFromPackage.length) {
          throw new Error(`Nu pot construi pachetul obligatoriu: lipsesc familiile ${mandatoryMissingFromPackage.join(", ")}.`);
        }

        ({state, overrides} = applyOptimizerRows(selectedRows));
        current = await calculateCandidate(state, overrides);
        let packageCapex = selectedRows.reduce((sum, row) => sum + row.capexLei, 0);
        economics = roiEconomics(homeResult, current, packageCapex);

        if (!regulatoryMeetsTarget(current, target, state, overrides)) {
          setOptimizationNote(
            `<strong>Nu am găsit un pachet care să treacă guardrail-ul „${escapeHtml(projectModeLabel())}”.</strong><span>Am testat toate familiile cu CAPEX cunoscut în bugetul bounded. Nu declar conformitate dacă pragurile nu sunt atinse.</span><small>Evaluări motor: ${optimizerEvaluationCount}/${OPTIMIZER_MAX_ENGINE_EVALUATIONS}.</small>`,
            "warn"
          );
          setStatus("Best ROI: guardrail neîndeplinit");
          scenarioResultState = scenarioResult ? "stale" : "empty";
          renderAll();
          return;
        }

        const removalOrder = [...selectedRows]
          .filter(row => !mandatoryFamilies.has(row.action.family))
          .sort((a, b) => a.roiPercentPerYear - b.roiPercentPerYear);

        for (const row of removalOrder) {
          if (optimizerEvaluationCount >= OPTIMIZER_MAX_ENGINE_EVALUATIONS - 1) break;
          const trialRows = selectedRows.filter(item => item !== row);
          const trialPackage = applyOptimizerRows(trialRows);
          const trialResult = await calculateCandidate(trialPackage.state, trialPackage.overrides);
          if (!regulatoryMeetsTarget(trialResult, target, trialPackage.state, trialPackage.overrides)) continue;
          const trialCapex = trialRows.reduce((sum, item) => sum + item.capexLei, 0);
          const trialEconomics = roiEconomics(homeResult, trialResult, trialCapex);
          if (
            Number.isFinite(trialEconomics.roiPercentPerYear) &&
            (!Number.isFinite(economics.roiPercentPerYear) ||
              trialEconomics.roiPercentPerYear > economics.roiPercentPerYear + 1e-6)
          ) {
            selectedRows = trialRows;
            state = trialPackage.state;
            overrides = trialPackage.overrides;
            current = trialResult;
            economics = trialEconomics;
            packageCapex = trialCapex;
          }
        }
      }

      current = await calculateCandidate(state, overrides, {compact:false});
      if (runToken !== optimizerRunToken) return;
      const capexLei = selectedRows.reduce((sum, row) => sum + row.capexLei, 0);
      economics = roiEconomics(homeResult, current, capexLei);
      const guardrailPass = regulatoryMeetsTarget(current, target, state, overrides);
      const selected = selectedRows.map(roiRowSummary);
      const regulatoryNote = !target
        ? "Renovare obișnuită: nu aplic un prag global 2.10a/2.10b; cerințele punctuale aplicabile intervențiilor rămân separate."
        : projectMode === "new_nzeb"
          ? "Pragurile modelate nZEB pentru energie primară, CO₂ și anvelopă sunt respectate; RER și verificarea completă de conformitate rămân de verificat."
          : "Pachetul respectă pragurile energetice/CO₂ modelate din MC001 Tabel 2.10b pentru renovare majoră; verificarea completă a proiectului rămâne separată.";

      applyOptimizerResult(state, current, overrides, {
        mode:"roi",
        label:"Best ROI",
        projectMode,
        projectModeLabel:projectModeLabel(),
        regulatoryTarget:target,
        guardrailPass,
        selected,
        rankedOpportunities:rankedOpportunities.map(roiRowSummary),
        capexLei:economics.capexLei,
        annualSavingLei:economics.annualSavingLei,
        roiPercentPerYear:economics.roiPercentPerYear,
        paybackYears:economics.paybackYears,
        evaluatedCandidates:optimizerEvaluationCount,
        costSource:"user_input",
        excludedCostFamilies:missingFamilies,
        note:regulatoryNote,
      });

      const roiText = Number.isFinite(economics.roiPercentPerYear)
        ? `${fmt(economics.roiPercentPerYear,1)}%/an`
        : "n/a";
      const paybackText = economics.paybackYears == null ? "n/a" : `${fmt(economics.paybackYears,1)} ani`;
      setOptimizationNote(
        `<strong>Best ROI: ${roiText} · recuperare ${paybackText}</strong>
         <span>CAPEX ${fmt(economics.capexLei)} lei · economie anuală ${economics.annualSavingLei >= 0 ? "+" : "−"}${fmt(Math.abs(economics.annualSavingLei))} lei/an · ${selected.length} intervenții în pachet.</span>
         <small>${optimizerEvaluationCount}/${OPTIMIZER_MAX_ENGINE_EVALUATIONS} evaluări motor. ${escapeHtml(regulatoryNote)}${missingFamilies.length ? ` Familii fără CAPEX, excluse din ranking: ${escapeHtml(missingFamilies.join(", "))}.` : ""}</small>`,
        guardrailPass && economics.positive ? "good" : "warn"
      );
      setStatus("Best ROI calculat", "ok");
    } catch (error) {
      if (error?.name === "AbortError" || runToken !== optimizerRunToken) return;
      scenarioResultState = scenarioResult ? "stale" : "empty";
      setOptimizationNote(`<strong>Best ROI indisponibil.</strong><span>${escapeHtml(error?.message || "Eroare necunoscută")}</span>`, "warn");
      setStatus(error?.message || "Best ROI indisponibil.", "error");
      renderAll();
    } finally {
      buttons.forEach(button => button.disabled = false);
      populateTechnicalForm(scenarioState, scenarioOverrides);
      if (runToken === optimizerRunToken) optimizerAbortController = null;
    }
  }

  function scheduleCalculate(target = baselineSaved && screen !== "home" ? "scenario" : "home", delay = 180) {
    invalidateCalculation(target);
    calculateTimer = window.setTimeout(() => {
      calculateTimer = 0;
      const state = target === "home" ? homeState : scenarioState;
      calculateState(state, target);
    }, delay);
  }

  function activeState() {
    return screen === "home" && !baselineSaved ? homeState : scenarioState;
  }

  function benefit(current, baseline) {
    const now = Number(current);
    const base = Number(baseline);
    if (!Number.isFinite(now) || !Number.isFinite(base) || Math.abs(base) < 1e-9) return null;
    return 100 * (base - now) / Math.abs(base);
  }

  function benefitText(current, baseline, suffix = "%") {
    const value = benefit(current, baseline);
    if (value == null) return {text: "—", good: null, value: null};
    if (Math.abs(value) < 0.05) return {text: "0" + suffix, good: null, value: 0};
    return {
      text: `${value > 0 ? "+" : "−"}${fmt(Math.abs(value), 0)}${suffix}`,
      good: value > 0,
      value
    };
  }

  function costOutcomeText(current, baseline, options = {}) {
    const now = Number(current);
    const base = Number(baseline);
    const percent = Boolean(options.percent);
    const unit = options.unit || "";
    if (!Number.isFinite(now) || !Number.isFinite(base)) {
      return {text:"—", good:null, label:"Diferență", value:null};
    }
    if (percent && Math.abs(base) < 1e-9) {
      return {text:"—", good:null, label:"Diferență", value:null};
    }
    const rawSaving = base - now;
    const magnitude = percent ? 100 * Math.abs(rawSaving) / Math.abs(base) : Math.abs(rawSaving);
    if (magnitude < (percent ? 0.05 : 0.0005)) {
      return {text:`0${unit}`, good:null, label:"Fără diferență", value:0};
    }
    const good = rawSaving > 0;
    return {
      text: `+${fmt(magnitude, percent ? 0 : 0)}${unit}`,
      good,
      label: good ? "Economie" : "Cost suplimentar",
      value: rawSaving
    };
  }

  function directChangeText(current, baseline, options = {}) {
    const now = Number(current);
    const base = Number(baseline);
    const percent = Boolean(options.percent);
    const unit = options.unit || "";
    const digits = options.digits ?? 0;
    const lowerIsBetter = options.lowerIsBetter !== false;
    if (!Number.isFinite(now) || !Number.isFinite(base)) return {text: "—", good: null, value: null};
    if (percent && Math.abs(base) < 1e-9) return {text: "—", good: null, value: null};
    const delta = percent ? (100 * (now - base) / Math.abs(base)) : (now - base);
    if (Math.abs(delta) < (percent ? 0.05 : 0.0005)) return {text: `0${unit}`, good: null, value: 0};
    const good = lowerIsBetter ? delta < 0 : delta > 0;
    return {
      text: `${delta > 0 ? "+" : "−"}${fmt(Math.abs(delta), digits)}${unit}`,
      good,
      value: delta
    };
  }

  function applyDeltaState(node, item) {
    if (!node) return;
    node.classList.toggle("is-good", item?.good === true);
    node.classList.toggle("is-bad", item?.good === false);
  }

  function energyClassRank(value) {
    return {"A+":0,A:1,B:2,C:3,D:4,E:5,F:6,G:7}[String(value || "").toUpperCase()] ?? null;
  }

  function renderImpactPanel() {
    if (!homeResult || !scenarioResult) return;

    const cost = directChangeText(
      scenarioResult.annual_cost_lei,
      homeResult.annual_cost_lei,
      {unit:" lei/an", digits:0}
    );
    const energy = directChangeText(
      scenarioResult.final_energy_kwh,
      homeResult.final_energy_kwh,
      {unit:"%", digits:0, percent:true}
    );
    const efficiency = benefitText(
      scenarioResult.final_energy_kwh,
      homeResult.final_energy_kwh
    );
    const co2 = directChangeText(
      scenarioResult.co2_kg,
      homeResult.co2_kg,
      {unit:"%", digits:0, percent:true}
    );
    const load = directChangeText(
      scenarioResult.design_heat_load_kw,
      homeResult.design_heat_load_kw,
      {unit:" kW", digits:1}
    );

    [
      ["#hlnImpactCost", cost],
      ["#hlnImpactEnergy", energy],
      ["#hlnImpactEfficiency", efficiency],
      ["#hlnImpactCo2", co2],
      ["#hlnImpactLoad", load]
    ].forEach(([selector, item]) => {
      const node = $(selector);
      if (!node) return;
      node.textContent = item.text;
      applyDeltaState(node, item);
    });
  }

  function renderDock() {
    const dock = $(".hln-dock");
    if (dock) dock.hidden = screen === "report";
    if (screen === "report") return;
    const metrics = $(".hln-dock-metrics");
    const benefits = $(".hln-dock-benefits");
    const cta = $("#hlnDockCta");
    const ctaLabel = cta?.querySelector("span") || cta;
    const result = screen === "home" ? (baselineSaved ? homeResult : currentResult || homeResult) : scenarioResult || currentResult || homeResult;

    $("#hlnDockClass").textContent = result?.energy_class || "—";
    $("#hlnDockCost").textContent = result?.annual_cost_lei == null ? "—" : `${fmt(result.annual_cost_lei)} lei`;
    $("#hlnDockEnergy").textContent = result?.final_energy_kwh == null ? "—" : `${fmt(result.final_energy_kwh)} kWh`;

    const scenarioMode = baselineSaved && ["site", "intervention", "scenario"].includes(screen);
    metrics.hidden = scenarioMode;
    benefits.hidden = !scenarioMode;

    if (scenarioMode && homeResult && scenarioResult) {
      $("#hlnDockHomeClass").textContent = homeResult.energy_class || "—";
      $("#hlnDockHomeCost").textContent =
        homeResult.annual_cost_lei == null ? "—" : `${fmt(homeResult.annual_cost_lei)} lei/an`;
      $("#hlnDockScenarioClass").textContent = scenarioResult.energy_class || "—";
      $("#hlnDockScenarioCost").textContent =
        scenarioResult.annual_cost_lei == null ? "—" : `${fmt(scenarioResult.annual_cost_lei)} lei/an`;

      const saving = costOutcomeText(
        scenarioResult.annual_cost_lei,
        homeResult.annual_cost_lei,
        {unit:" lei/an"}
      );
      const savingNode = $("#hlnDockCostBenefit");
      const savingLabel = $("#hlnDockSavingLabel");
      savingNode.textContent = saving.text;
      applyDeltaState(savingNode, saving);
      if (savingLabel) savingLabel.textContent = saving.label;

      const baseClassRank = energyClassRank(homeResult.energy_class);
      const scenarioClassRank = energyClassRank(scenarioResult.energy_class);
      const scenarioClassNode = $("#hlnDockScenarioClass");
      if (scenarioClassNode) {
        const classChange = baseClassRank == null || scenarioClassRank == null
          ? {good:null}
          : {good:scenarioClassRank < baseClassRank ? true : scenarioClassRank > baseClassRank ? false : null};
        applyDeltaState(scenarioClassNode, classChange);
      }
    }

    renderImpactPanel();
    dock.dataset.hlnDock = screen;
    cta.classList.toggle("is-home", screen === "home");

    if (screen === "home") {
      cta.hidden = false;
      ctaLabel.textContent = baselineSaved ? "Mergi la renovare" : "Salvează Casa mea și începe renovarea";
    } else if (screen === "site") {
      cta.hidden = measures.length === 0;
      ctaLabel.textContent = "Vezi Scenariul meu";
    } else if (screen === "intervention") {
      cta.hidden = false;
      ctaLabel.textContent = "Păstrează intervenția";
    } else if (screen === "scenario") {
      cta.hidden = false;
      ctaLabel.textContent = "Generează raportul";
    } else {
      cta.hidden = true;
    }
  }

  function renderHome() {
    const state = baselineSaved ? homeState : homeState;
    $("#hlnLocationSummary").textContent = state.locality || "—";
    $("#hlnHouseSummary").textContent = `${fmt(state.area)} m² · ${state.levels} nivel${Number(state.levels) === 1 ? "" : "uri"}`;
    const buildingTypeLabel = state.buildingType === "residential_collective" ? "Apartament / colectiv" : "Casă individuală";
    $("#hlnHouseMeta").textContent = `${buildingTypeLabel} · ${state.constructionYear || "an necunoscut"} · ${fmt(state.height, 1)} m`;
    $("#hlnEnvelopeSummary").textContent = `${state.wallIns} cm pereți · ${state.roofIns} cm pod`;
    $("#hlnEnvelopeMeta").textContent = `${labels.glazing[state.glazing] || state.glazing} · ${fmt(state.windows, 1)} m²`;
    $("#hlnSystemsSummary").textContent = labels.heating[state.heating] || state.heating;
    const heatingParts = [
      labels.heatingEmitter[state.heatingEmitter] || state.heatingEmitter,
      labels.heatingStorage[state.heatingStorage] || state.heatingStorage
    ];
    const performance = homeResult?.heating_system;
    if (performance?.generator_performance_kind === "scop") {
      heatingParts.push(`SCOP ${fmt(performance.generator_performance,2)}`);
    }
    $("#hlnSystemsMeta").textContent = [
      ...heatingParts,
      labels.ventilation[state.ventilation] || state.ventilation,
      labels.cooling[state.cooling] || state.cooling
    ].join(" · ");

    const renewableParts = [];
    if (state.pvEnabled) renewableParts.push(`PV ${fmt(state.pvKwp,1)} kWp`);
    if (state.solarThermalEnabled) renewableParts.push(`solar termic ${fmt(state.solarThermalArea,1)} m²`);
    $("#hlnRenewablesSummary").textContent = renewableParts.length ? renewableParts.join(" · ") : "Fără regenerabile";
    $("#hlnRenewablesMeta").textContent = state.pvEnabled || state.solarThermalEnabled
      ? [state.pvEnabled ? `${renewableOrientationLabel(state.pvOrientation)} · ${fmt(state.pvTilt)}°` : null,
         state.solarThermalEnabled ? `solar termic ${renewableOrientationLabel(state.solarThermalOrientation)}` : null].filter(Boolean).join(" · ")
      : "PV · solar termic";
    $("#hlnConfirmedCount").textContent = baselineSaved ? "✓" : "8";
  }

  function measureSummary(type) {
    const base = homeState;
    const now = scenarioState;
    const ref = homeResult?.reference_parameters;
    if (referenceMode) {
      if (type === "wall") return `${fmt(base.wallIns,1)} → ${fmt(now.wallIns,1)} cm · U ref. ${fmt(ref?.u_values_w_m2k?.exterior_wall,2)}`;
      if (type === "roof") return `${fmt(base.roofIns,1)} → ${fmt(now.roofIns,1)} cm · U ref. ${fmt(ref?.u_values_w_m2k?.roof,2)}`;
      if (type === "floor") return `${fmt(base.floorIns,1)} → ${fmt(now.floorIns,1)} cm · U ref. ${fmt(ref?.u_values_w_m2k?.floor,2)}`;
      if (type === "windows") return `Uw de referință ${fmt(ref?.u_values_w_m2k?.window,2)} W/m²K`;
      if (type === "heating") return `Centrală în condensare · η ${fmt(100 * Number(ref?.heating_efficiency || 0),0)}%`;
      if (type === "ventilation") return `ACH ${fmt(ref?.air_changes_per_hour,2)} · fără recuperare`;
      if (type === "pv") return homeState.pvEnabled ? "PV dezactivat în referința simplificată" : "Fără PV";
      if (type === "solar_thermal") return homeState.solarThermalEnabled ? "Solar termic dezactivat în referința simplificată" : "Fără solar termic";
    }
    if (type === "wall") return `${base.wallIns} → ${now.wallIns} cm pereți`;
    if (type === "roof") return `${base.roofIns} → ${now.roofIns} cm pod`;
    if (type === "floor") return `${base.floorIns} → ${now.floorIns} cm pardoseală`;
    if (type === "windows") return `${labels.glazing[base.glazing]} → ${labels.glazing[now.glazing]}`;
    if (type === "heating") {
      const perf = scenarioResult?.heating_system;
      const detail = perf
        ? ` · ${labels.heatingEmitter[now.heatingEmitter] || now.heatingEmitter} · ${fmt(perf.design_flow_temperature_c,0)}/${fmt(perf.design_return_temperature_c,0)}°C · ${perf.generator_performance_kind === "scop" ? "SCOP " + fmt(perf.generator_performance,2) : "η " + fmt(100 * Number(perf.generator_performance),0) + "%"}`
        : ` · ${labels.heatingEmitter[now.heatingEmitter] || now.heatingEmitter}`;
      return `${labels.heating[base.heating]} → ${labels.heating[now.heating]}${detail}`;
    }
    if (type === "ventilation") return `${labels.ventilation[base.ventilation]} → ${labels.ventilation[now.ventilation]}`;
    if (type === "pv") {
      if (!now.pvEnabled) return "PV dezactivat";
      const pv = scenarioResult?.renewables?.pv;
      const production = pv?.annual_generation_kwh == null ? "" : ` · producție ${fmt(pv.annual_generation_kwh)} kWh/an`;
      const selfUse = pv?.self_consumed_kwh == null ? "" : ` · autoconsum ${fmt(pv.self_consumed_kwh)} kWh`;
      return `${base.pvEnabled ? fmt(base.pvKwp,1) + " → " : ""}${fmt(now.pvKwp,1)} kWp · ${now.pvOrientation} · ${fmt(now.pvTilt)}°${production}${selfUse}`;
    }
    if (type === "solar_thermal") {
      if (!now.solarThermalEnabled) return "Solar termic dezactivat";
      const solarThermal = scenarioResult?.renewables?.solar_thermal;
      const used = solarThermal?.used_for_dhw_kwh == null ? "" : ` · ACM solar ${fmt(solarThermal.used_for_dhw_kwh)} kWh/an`;
      return `${base.solarThermalEnabled ? fmt(base.solarThermalArea,1) + " → " : ""}${fmt(now.solarThermalArea,1)} m² · ${now.solarThermalOrientation} · ${fmt(now.solarThermalTilt)}°${used}`;
    }
    return "";
  }

  function measureTitle(type) {
    return {
      wall: "Izolează fațada",
      roof: "Izolează podul",
      floor: "Izolează pardoseala",
      windows: "Schimbă ferestrele",
      heating: "Schimbă încălzirea",
      ventilation: "Ventilație & răcire",
      pv: "Panouri fotovoltaice",
      solar_thermal: "Panouri solare termice"
    }[type] || "Intervenție";
  }

  function measureIcon(type) {
    const icon = {
      wall: "wall",
      roof: "roof",
      floor: "floor",
      windows: "window",
      heating: "flame",
      ventilation: "air",
      pv: "sun",
      solar_thermal: "sun"
    }[type] || "layers";
    return `<svg aria-hidden="true"><use href="#hln-i-${icon}"></use></svg>`;
  }

  const renewableOrientationLabel = value => ({
    south: "Sud",
    south_west: "Sud-vest",
    west: "Vest",
    north_west: "Nord-vest",
    north: "Nord",
    north_east: "Nord-est",
    east: "Est",
    south_east: "Sud-est",
  }[value] || value || "—");

  function quickEditConfig(type) {
    if (type === "pv") {
      return {
        title: "Panouri fotovoltaice",
        unit: "kWp",
        min: 0,
        max: 30,
        step: 0.5,
        value: scenarioState.pvEnabled ? Number(scenarioState.pvKwp) : 0,
        meta: `${renewableOrientationLabel(scenarioState.pvOrientation)} · ${fmt(scenarioState.pvTilt)}°`,
      };
    }
    if (type === "solar_thermal") {
      return {
        title: "Panouri solare termice",
        unit: "kWth",
        min: 0,
        max: 30,
        step: 0.5,
        value: scenarioState.solarThermalEnabled ? solarThermalKwFromArea(scenarioState.solarThermalArea) : 0,
        meta: `${renewableOrientationLabel(scenarioState.solarThermalOrientation)} · ${fmt(scenarioState.solarThermalTilt)}°`,
      };
    }
    return null;
  }

  function renderQuickMeasureEditor() {
    if (!quickEditType) return;
    const config = quickEditConfig(quickEditType);
    if (!config) return;
    const range = $("#hlnQuickEditRange");
    $("#hlnQuickEditTitle").textContent = config.title;
    $("#hlnQuickEditValue").textContent = `${fmt(config.value, 1)} ${config.unit}`;
    $("#hlnQuickEditMeta").textContent = config.meta;
    $("#hlnQuickEditMaxLabel").textContent = `${fmt(config.max)} ${config.unit}`;
    range.min = String(config.min);
    range.max = String(config.max);
    range.step = String(config.step);
    range.value = String(config.value);
    range.setAttribute("aria-label", `${config.title} · ${config.unit}`);
  }

  function openQuickMeasureEditor(type) {
    const config = quickEditConfig(type);
    if (!config) return false;
    quickEditType = type;
    quickEditOriginal = {...scenarioState};
    renderQuickMeasureEditor();
    const overlay = $("#hlnQuickEditOverlay");
    overlay.hidden = false;
    overlay.setAttribute("aria-hidden", "false");
    window.requestAnimationFrame(() => $("#hlnQuickEditRange")?.focus());
    return true;
  }

  function applyQuickMeasureValue(rawValue) {
    if (!quickEditType) return;
    const value = clamp(Number(rawValue) || 0, 0, 30);
    referenceMode = false;
    optimizationMeta = null;
    setOptimizationNote("");

    if (quickEditType === "pv") {
      scenarioState.pvKwp = value;
      scenarioState.pvEnabled = value > 0;
    } else if (quickEditType === "solar_thermal") {
      scenarioState.solarThermalArea = solarThermalAreaFromKw(value);
      scenarioState.solarThermalEnabled = value > 0;
    }

    syncMeasuresFromScenario();
    renderQuickMeasureEditor();
    renderScenario();
    renderDock();
    emitVisualState(quickEditType === "solar_thermal" ? "solarThermal" : quickEditType);
    scheduleCalculate("scenario", 90);
  }

  function hideQuickMeasureEditor() {
    const overlay = $("#hlnQuickEditOverlay");
    overlay.hidden = true;
    overlay.setAttribute("aria-hidden", "true");
  }

  function commitQuickMeasureEditor() {
    if (!quickEditType) return;
    scheduleCalculate("scenario", 20);
    syncMeasuresFromScenario();
    quickEditType = null;
    quickEditOriginal = null;
    hideQuickMeasureEditor();
    persist();
    renderScenario();
    renderDock();
  }

  function cancelQuickMeasureEditor() {
    if (!quickEditType) return;
    if (quickEditOriginal) scenarioState = {...quickEditOriginal};
    const focus = quickEditType === "solar_thermal" ? "solarThermal" : quickEditType;
    quickEditType = null;
    quickEditOriginal = null;
    hideQuickMeasureEditor();
    syncMeasuresFromScenario();
    scheduleCalculate("scenario", 20);
    renderScenario();
    renderDock();
    emitVisualState(focus);
  }

  function openQuickMeasureDetails() {
    if (!quickEditType) return;
    const type = quickEditType;
    quickEditType = null;
    quickEditOriginal = null;
    hideQuickMeasureEditor();
    openMeasure(type);
  }

  function interventionValue(type, state) {
    if (type === "wall") return `${state.wallIns} cm`;
    if (type === "roof") return `${state.roofIns} cm`;
    if (type === "floor") return `${state.floorIns} cm`;
    if (type === "windows") return `${labels.glazing[state.glazing]} · ${fmt(state.windows,1)} m²`;
    if (type === "heating") {
      const generator = labels.heating[state.heating] || state.heating;
      const emitter = labels.heatingEmitter[state.heatingEmitter] || state.heatingEmitter;
      return `${generator} · ${emitter}`;
    }
    if (type === "ventilation") return `${labels.ventilation[state.ventilation]} · ${labels.cooling[state.cooling]}`;
    if (type === "pv") return state.pvEnabled ? `${fmt(state.pvKwp,1)} kWp · ${state.pvOrientation} · ${fmt(state.pvTilt)}°` : "Fără PV";
    if (type === "solar_thermal") return state.solarThermalEnabled ? `${fmt(state.solarThermalArea,1)} m² · ${state.solarThermalOrientation} · ${fmt(state.solarThermalTilt)}°` : "Fără solar termic";
    return "—";
  }

  function renderIntervention() {
    if (!activeMeasure) return;
    $("#hlnInterventionTitle").textContent = measureTitle(activeMeasure);
    $("#hlnBeforeValue").textContent = interventionValue(activeMeasure, homeState);
    $("#hlnAfterValue").textContent = interventionValue(activeMeasure, scenarioState);
    $$("[data-hln-intervention-panel]").forEach(panel => {
      panel.hidden = panel.dataset.hlnInterventionPanel !== activeMeasure;
    });

    $("#hlnWallIns").value = scenarioState.wallIns;
    $("#hlnRoofIns").value = scenarioState.roofIns;
    $("#hlnFloorIns").value = scenarioState.floorIns;
    $("#hlnScenarioGlazing").value = scenarioState.glazing;
    $("#hlnScenarioWindows").value = scenarioState.windows;
    $("#hlnScenarioHeating").value = scenarioState.heating;
    $("#hlnScenarioHeatPumpSource").value = scenarioState.heatPumpSource || "heat_pump_air_water";
    $("#hlnScenarioHeatingEmitter").value = scenarioState.heatingEmitter;
    $("#hlnScenarioHeatingDistribution").value = scenarioState.heatingDistribution;
    $("#hlnScenarioHeatingStorage").value = scenarioState.heatingStorage;
    $("#hlnScenarioHeatingControl").value = scenarioState.heatingControl;
    toggleHeatPumpSourceControls();
    const performance = scenarioResult?.heating_system;
    const performanceNode = $("#hlnScenarioHeatingPerformance");
    if (performanceNode && activeMeasure === "heating") {
      if (performance) {
        const generatorValue = Number(performance.generator_performance);
        const kind = performance.generator_performance_kind === "scop" ? "SCOP" : "η generator";
        const shown = performance.generator_performance_kind === "scop"
          ? fmt(generatorValue, 2)
          : `${fmt(generatorValue * 100, 0)}%`;
        const hydronicTemperatures =
          Number.isFinite(Number(performance.design_flow_temperature_c)) &&
          Number.isFinite(Number(performance.design_return_temperature_c));
        const temperatureText = hydronicTemperatures
          ? `Tur/retur ${fmt(performance.design_flow_temperature_c,0)}/${fmt(performance.design_return_temperature_c,0)}°C · `
          : "";
        performanceNode.textContent =
          `${temperatureText}${kind} ${shown} · auxiliare ${fmt(performance.auxiliary_electricity_kwh)} kWh/an`;
      } else {
        performanceNode.textContent = "Motorul Light va deriva temperatura de tur și performanța din configurația selectată.";
      }
    }
    $("#hlnScenarioVentilation").value = scenarioState.ventilation;
    $("#hlnScenarioCooling").value = scenarioState.cooling;
    $("#hlnScenarioPvKwp").value = scenarioState.pvKwp;
    $("#hlnScenarioPvOrientation").value = scenarioState.pvOrientation;
    $("#hlnScenarioPvTilt").value = scenarioState.pvTilt;
    $("#hlnScenarioSolarThermalArea").value = scenarioState.solarThermalArea;
    $("#hlnScenarioSolarThermalOrientation").value = scenarioState.solarThermalOrientation;
    $("#hlnScenarioSolarThermalTilt").value = scenarioState.solarThermalTilt;
  }

  function renderScenario() {
    if (!homeResult || !scenarioResult) return;
    $("#hlnScenarioHomeCost").textContent = homeResult.annual_cost_lei == null ? "—" : `${fmt(homeResult.annual_cost_lei)} lei`;
    $("#hlnScenarioNewCost").textContent = scenarioResult.annual_cost_lei == null ? "—" : `${fmt(scenarioResult.annual_cost_lei)} lei`;

    const costBenefit = costOutcomeText(
      scenarioResult.annual_cost_lei,
      homeResult.annual_cost_lei,
      {unit:"%", percent:true}
    );
    const benefitNode = $("#hlnScenarioBenefit");
    const benefitLabel = $("#hlnScenarioBenefitLabel");
    benefitNode.textContent = costBenefit.text;
    benefitNode.parentElement.classList.toggle("is-bad", costBenefit.good === false);
    benefitNode.parentElement.classList.toggle("is-good", costBenefit.good === true);
    if (benefitLabel) benefitLabel.textContent = costBenefit.label.toLowerCase() + " estimat";

    const costChange = directChangeText(scenarioResult.annual_cost_lei, homeResult.annual_cost_lei, {unit:" lei/an"});
    const energyChange = directChangeText(scenarioResult.final_energy_kwh, homeResult.final_energy_kwh, {unit:"%", percent:true});
    const co2Change = directChangeText(scenarioResult.co2_kg, homeResult.co2_kg, {unit:"%", percent:true});
    const loadChange = directChangeText(scenarioResult.design_heat_load_kw, homeResult.design_heat_load_kw, {unit:" kW", digits:1});

    const scenarioMetrics = [
      ["#hlnScenarioCostCompare", `${fmt(homeResult.annual_cost_lei)} → ${fmt(scenarioResult.annual_cost_lei)} lei/an · ${costChange.text}`, costChange],
      ["#hlnScenarioEnergyCompare", `${fmt(homeResult.final_energy_kwh)} → ${fmt(scenarioResult.final_energy_kwh)} kWh/an · ${energyChange.text}`, energyChange],
      ["#hlnScenarioCo2Compare", `${fmt(homeResult.co2_kg)} → ${fmt(scenarioResult.co2_kg)} kg/an · ${co2Change.text}`, co2Change],
      ["#hlnScenarioPowerCompare", `${fmt(homeResult.design_heat_load_kw,1)} → ${fmt(scenarioResult.design_heat_load_kw,1)} kW · ${loadChange.text}`, loadChange]
    ];
    scenarioMetrics.forEach(([selector, text, item]) => {
      const node = $(selector);
      node.textContent = text;
      applyDeltaState(node, item);
    });

    const list = $("#hlnSelectedMeasures");
    if (!measures.length) {
      list.innerHTML = '<div class="hln-home-note"><span>i</span><p>Nu ai păstrat încă nicio intervenție. Revino în Șantier și testează una.</p></div>';
      return;
    }
    list.innerHTML = measures.map(type => `
      <article class="hln-selected-row">
        <span>${measureIcon(type)}</span>
        <div><strong>${measureTitle(type)}</strong><small>${measureSummary(type)}</small></div>
        <button type="button" data-hln-measure-edit="${type}">Editează</button>
        <button type="button" data-hln-measure-remove="${type}" aria-label="Elimină">×</button>
      </article>
    `).join("");
  }

  function reportComparisonRow(label, homeValue, scenarioValue, unit, digits = 0) {
    const base = Number(homeValue);
    const now = Number(scenarioValue);
    const max = Math.max(Math.abs(base), Math.abs(now), 1);
    const change = directChangeText(now, base, {unit:"%", percent:true});
    return `
      <div class="hln-report-bar-row">
        <div class="hln-report-bar-copy">
          <strong>${escapeHtml(label)}</strong>
          <span>${fmt(base,digits)} → ${fmt(now,digits)} ${escapeHtml(unit)}</span>
          <em class="${change.good === true ? "is-good" : change.good === false ? "is-bad" : ""}">${change.text}</em>
        </div>
        <div class="hln-report-bar-track">
          <i class="is-home" style="width:${Math.max(2,100*Math.abs(base)/max)}%"></i>
          <i class="is-after" style="width:${Math.max(2,100*Math.abs(now)/max)}%"></i>
        </div>
      </div>`;
  }

  function renderReport() {
    if (!homeResult || !scenarioResult) return;

    $("#hlnReportHomeClass").textContent = homeResult.energy_class || "—";
    $("#hlnReportScenarioClass").textContent = scenarioResult.energy_class || "—";
    $("#hlnReportHomeCost").textContent =
      homeResult.annual_cost_lei == null ? "—" : `${fmt(homeResult.annual_cost_lei)} lei/an`;
    $("#hlnReportScenarioCost").textContent =
      scenarioResult.annual_cost_lei == null ? "—" : `${fmt(scenarioResult.annual_cost_lei)} lei/an`;

    const outcome = costOutcomeText(scenarioResult.annual_cost_lei, homeResult.annual_cost_lei, {unit:" lei/an"});
    $("#hlnReportSaving").textContent = outcome.text;
    $("#hlnReportSavingLabel").textContent = outcome.label;
    applyDeltaState($("#hlnReportSaving"), outcome);

    $("#hlnReportBars").innerHTML = [
      reportComparisonRow("Cost anual", homeResult.annual_cost_lei, scenarioResult.annual_cost_lei, "lei/an"),
      reportComparisonRow("Energie finală", homeResult.final_energy_kwh, scenarioResult.final_energy_kwh, "kWh/an"),
      reportComparisonRow("Energie primară specifică", homeResult.primary_specific_kwh_m2, scenarioResult.primary_specific_kwh_m2, "kWh/m²·an", 1),
      reportComparisonRow("CO₂", homeResult.co2_kg, scenarioResult.co2_kg, "kg/an"),
      reportComparisonRow("Necesar termic", homeResult.design_heat_load_kw, scenarioResult.design_heat_load_kw, "kW", 1),
    ].join("");

    const target = regulatoryTargetForProjectMode();
    const primary = Number(scenarioResult.primary_specific_kwh_m2);
    const co2Specific = Number(scenarioResult.co2_specific_kg_m2);
    const primaryLimit = Number(target?.primary_energy_kwh_m2_year);
    const co2Limit = Number(target?.co2_kg_m2_year);
    const targetKnown = target != null && Number.isFinite(primaryLimit) && Number.isFinite(co2Limit);
    const primaryOk = targetKnown && Number.isFinite(primary) && primary <= primaryLimit;
    const co2Ok = targetKnown && Number.isFinite(co2Specific) && co2Specific <= co2Limit;
    const envelopeStatus = projectMode === "new_nzeb" && target
      ? nzebEnvelopeStatus(scenarioState, scenarioOverrides, target)
      : {checks:[], meets:true};
    const guardrailPass = targetKnown
      ? primaryOk && co2Ok && envelopeStatus.meets
      : projectMode === "existing_standard";

    const nzebStatus = $("#hlnReportNzebStatus");
    nzebStatus.classList.toggle("is-good", guardrailPass);
    nzebStatus.classList.toggle("is-warn", !guardrailPass && projectMode !== "existing_standard");
    if (projectMode === "existing_standard") {
      nzebStatus.textContent =
        "Renovare obișnuită: nu se aplică aici un prag global MC001 Tabel 2.10a/2.10b. Cerințele punctuale ale intervențiilor se verifică separat.";
    } else if (!targetKnown) {
      nzebStatus.textContent = "Pragul metodologic selectat nu este disponibil pentru această configurație.";
    } else if (guardrailPass && projectMode === "new_nzeb") {
      nzebStatus.textContent =
        "Pragurile modelate nZEB pentru energie primară, CO₂ și anvelopă sunt atinse · RER și conformitatea completă rămân de verificat.";
    } else if (guardrailPass) {
      nzebStatus.textContent =
        "Pragurile energetice/CO₂ modelate pentru renovare majoră (MC001 Tabel 2.10b) sunt atinse.";
    } else {
      nzebStatus.textContent =
        projectMode === "new_nzeb"
          ? "Scenariul este peste cel puțin una dintre limitele modelate nZEB."
          : "Scenariul este peste cel puțin una dintre limitele modelate pentru renovare majoră.";
    }

    $("#hlnReportPrimary").textContent = Number.isFinite(primary) ? `${fmt(primary,1)} kWh/m²·an` : "—";
    $("#hlnReportPrimaryTarget").textContent = targetKnown ? `limită ≤ ${fmt(primaryLimit,1)}` : "fără prag global selectat";
    $("#hlnReportCo2Specific").textContent = Number.isFinite(co2Specific) ? `${fmt(co2Specific,1)} kg/m²·an` : "—";
    $("#hlnReportCo2Target").textContent = targetKnown ? `limită ≤ ${fmt(co2Limit,1)}` : "fără prag global selectat";

    const envelopeNode = $("#hlnReportEnvelopeStatus");
    if (envelopeNode) {
      if (projectMode !== "new_nzeb") {
        envelopeNode.classList.remove("is-good", "is-warn");
        envelopeNode.textContent =
          projectMode === "existing_major"
            ? "Anvelopa este raportată separat; guardrail-ul global curent pentru renovare majoră folosește energia primară și CO₂ din Tabelul 2.10b."
            : "Cerințele elementelor renovate se verifică separat de acest rezumat economic.";
      } else {
        const failed = envelopeStatus.checks.filter(item => !item.ok);
        envelopeNode.classList.toggle("is-good", targetKnown && envelopeStatus.meets);
        envelopeNode.classList.toggle("is-warn", targetKnown && !envelopeStatus.meets);
        envelopeNode.textContent = !targetKnown
          ? "Pragurile de anvelopă nu sunt disponibile."
          : envelopeStatus.meets
            ? "Anvelopă: pragurile rezidențiale MC001 modelate sunt în limite."
            : `Anvelopă: peste prag la ${failed.map(item => item.label.toLowerCase()).join(", ")}.`;
      }
    }
    $("#hlnReportNzebNote").textContent =
      projectMode === "new_nzeb"
        ? "Verificarea nZEB Light separă energia primară, CO₂ și anvelopa modelată. Ponderea regenerabilă RER și conformitatea legală completă rămân neverificate."
        : projectMode === "existing_major"
          ? "Tabelul 2.10b este folosit ca guardrail energetic/CO₂ al optimizării. Raportul nu substituie verificarea completă a cerințelor proiectului."
          : "Best ROI pentru renovare obișnuită nu inventează o obligație nZEB sau 2.10b doar din anul construcției.";

    $("#hlnReportVisualTitle").textContent = `${scenarioResult.locality || homeState.locality || "Locuință"} · scenariul final`;
    $("#hlnReportVisualMeta").textContent =
      `Clasa ${scenarioResult.energy_class || "—"} · ${labels.heating[scenarioState.heating] || scenarioState.heating} · ${optimizationMeta?.label || "configurare manuală"}`;

    const reportMeasures = $("#hlnReportMeasures");
    const activeMeasures = measures.length ? measures : [];
    const activeIds = new Set(activeMeasures);
    const extraOptimizerMeasures = Array.isArray(optimizationMeta?.selected)
      ? optimizationMeta.selected.filter(item => item?.id && !activeIds.has(item.id))
      : [];
    const measureRows = [
      ...activeMeasures.map(type => `
        <article>
          <span>${measureIcon(type)}</span>
          <div><strong>${escapeHtml(measureTitle(type))}</strong><small>${escapeHtml(measureSummary(type))}</small></div>
        </article>`),
      ...extraOptimizerMeasures.map(item => `
        <article>
          <span><svg><use href="#hln-i-check"></use></svg></span>
          <div><strong>${escapeHtml(item.label || item.id)}</strong><small>${item.kind === "mc001-envelope" ? "Prag MC001 aplicat condițional" : "Măsură selectată de optimizer"}</small></div>
        </article>`)
    ];
    reportMeasures.innerHTML = measureRows.length
      ? measureRows.join("")
      : '<p class="hln-report-empty">Scenariul nu conține intervenții față de Casa mea.</p>';

    const losses = Array.isArray(scenarioResult.heat_loss_breakdown) ? scenarioResult.heat_loss_breakdown.slice(0,6) : [];
    const lossMax = Math.max(...losses.map(item => Number(item.percent) || 0),1);
    $("#hlnReportLosses").innerHTML = losses.map(item => `
      <div class="hln-loss-row">
        <span><strong>${escapeHtml(item.name)}</strong><em>${fmt(item.percent,0)}%</em></span>
        <i><b style="width:${100*(Number(item.percent)||0)/lossMax}%"></b></i>
      </div>`
    ).join("");

    const months = Array.isArray(scenarioResult.monthly) ? scenarioResult.monthly : [];
    const homeMonths = new Map((homeResult.monthly || []).map(row => [row.month,row]));
    const maxMonthly = Math.max(...months.flatMap(row => {
      const baseline = homeMonths.get(row.month) || {};
      return [
        Number(baseline.useful_heating_kwh || 0) + Number(baseline.useful_cooling_kwh || 0),
        Number(row.useful_heating_kwh || 0) + Number(row.useful_cooling_kwh || 0),
      ];
    }),1);
    $("#hlnReportMonthlyChart").innerHTML = months.map(row => {
      const baseline = homeMonths.get(row.month) || {};
      const homeKwh = Number(baseline.useful_heating_kwh || 0) + Number(baseline.useful_cooling_kwh || 0);
      const scenarioKwh = Number(row.useful_heating_kwh || 0) + Number(row.useful_cooling_kwh || 0);
      return `
        <div class="hln-month-column" title="${escapeHtml(row.month)} · Casa mea ${fmt(homeKwh)} kWh · Renovare ${fmt(scenarioKwh)} kWh">
          <div class="hln-month-bars">
            <i class="is-home" style="height:${Math.max(homeKwh ? 3 : 0,100*homeKwh/maxMonthly)}%"></i>
            <i class="is-after" style="height:${Math.max(scenarioKwh ? 3 : 0,100*scenarioKwh/maxMonthly)}%"></i>
          </div>
          <small>${escapeHtml(String(row.month).slice(0,3))}</small>
        </div>`;
    }).join("");

    const scenarioCosts = Array.isArray(scenarioResult.monthly_costs) ? scenarioResult.monthly_costs : [];
    const homeCosts = new Map((homeResult.monthly_costs || []).map(row => [row.month,row]));
    const maxMonthlyCost = Math.max(...scenarioCosts.flatMap(row => [
      Number(homeCosts.get(row.month)?.cost_lei || 0),
      Number(row.cost_lei || 0),
    ]),1);
    $("#hlnReportMonthlyCostChart").innerHTML = scenarioCosts.map(row => {
      const baseline = homeCosts.get(row.month) || {};
      const homeCost = Number(baseline.cost_lei || 0);
      const scenarioCost = Number(row.cost_lei || 0);
      const energy = Number(row.final_energy_kwh || 0);
      return `
        <div class="hln-month-cost-column" title="${escapeHtml(row.month)} · Casa mea ${fmt(homeCost)} lei · Renovare ${fmt(scenarioCost)} lei · ${fmt(energy)} kWh finali">
          <div class="hln-month-cost-bars">
            <i class="is-home" style="height:${Math.max(homeCost ? 3 : 0,100*homeCost/maxMonthlyCost)}%"></i>
            <i class="is-after" style="height:${Math.max(scenarioCost ? 3 : 0,100*scenarioCost/maxMonthlyCost)}%"></i>
          </div>
          <small>${escapeHtml(String(row.month).slice(0,3))}</small>
          <strong>${fmt(scenarioCost)} lei</strong>
          <em>${fmt(energy)} kWh</em>
        </div>`;
    }).join("");

    const pv = scenarioResult.renewables?.pv || {};
    const solarThermal = scenarioResult.renewables?.solar_thermal || {};
    $("#hlnReportPvGeneration").textContent = pv.enabled ? `${fmt(pv.annual_generation_kwh)} kWh/an` : "Fără PV";
    $("#hlnReportPvSelf").textContent = pv.enabled ? `${fmt(pv.self_consumed_kwh)} kWh · ${fmt(pv.self_consumption_percent,0)}%` : "—";
    $("#hlnReportPvExport").textContent = pv.enabled ? `${fmt(pv.exported_kwh)} kWh/an` : "—";
    $("#hlnReportSolarThermal").textContent = solarThermal.enabled
      ? `${fmt(solarThermal.used_for_dhw_kwh)} kWh/an · ${fmt(solarThermal.dhw_solar_fraction_percent,0)}% ACM`
      : "Fără solar termic";
    $("#hlnReportRenewablesNote").textContent = [
      pv.enabled ? `PV ${fmt(pv.installed_power_kwp,1)} kWp · ${renewableOrientationLabel(pv.orientation)} · ${fmt(pv.tilt_degrees,0)}°` : null,
      solarThermal.enabled ? `solar termic ${fmt(solarThermal.collector_area_m2,1)} m² · ${renewableOrientationLabel(solarThermal.orientation)}` : null,
      scenarioResult.renewables?.plane_model ? `model radiație: ${scenarioResult.renewables.plane_model}` : null,
    ].filter(Boolean).join(" · ") || "Scenariul nu include surse regenerabile locale.";

    const heating = scenarioResult.heating_system || {};
    const distributionLabels = {
      hydronic_insulated:"conducte izolate",
      hydronic_uninsulated:"conducte neizolate",
      underfloor:"pardoseală",
      air:"aer",
      local:"fără rețea",
    };
    $("#hlnReportHeatingSystem").textContent = labels.heating[scenarioState.heating] || String(heating.generator_type || scenarioState.heating || "—").replaceAll("_"," ");
    $("#hlnReportHeatingPerformance").textContent = heating.generator_performance_kind === "scop"
      ? `SCOP ${fmt(heating.generator_performance,2)} · performanță efectivă ${fmt(heating.effective_system_performance,2)}`
      : `η generator ${fmt(100*Number(heating.generator_performance||0),0)}% · sistem efectiv ${fmt(100*Number(heating.effective_system_performance||0),0)}%`;
    $("#hlnReportHeatingChain").textContent = [
      labels.heatingEmitter[scenarioState.heatingEmitter] || scenarioState.heatingEmitter,
      distributionLabels[scenarioState.heatingDistribution] || scenarioState.heatingDistribution,
      labels.heatingStorage[scenarioState.heatingStorage] || scenarioState.heatingStorage,
      labels.heatingControl[scenarioState.heatingControl] || scenarioState.heatingControl,
    ].join(" · ");
    $("#hlnReportHeatingSource").textContent =
      `LaCurent Light · ${heating.confidence || "—"} confidence · ${String(heating.performance_source || "model intern").replaceAll("_"," ")}`;

    $("#hlnReportLocation").textContent = scenarioResult.locality || homeState.locality || "—";
    $("#hlnReportClimate").textContent =
      `Zona ${scenarioResult.climate_zone || "—"} · ${scenarioResult.climate_station || "stație climatică"}`;
    $("#hlnReportOptimizer").textContent = optimizationMeta?.label || "Scenariu configurat manual";
    $("#hlnReportPriceDate").textContent =
      scenarioResult.price_retrieved_on ? `referințe ${scenarioResult.price_retrieved_on}` : "referințe de preț curente";
    $("#hlnReportNzebSource").textContent = target?.source || "Nu este selectat un prag global pentru regimul curent.";
    $("#hlnReportEnvelopeSource").textContent =
      projectMode === "new_nzeb"
        ? (target?.envelope_source || "Pragurile de anvelopă nu sunt disponibile.")
        : "Anvelopa se verifică separat pentru regimul proiectului.";
    $("#hlnReportMethodologySource").textContent =
      scenarioResult.methodology_source || "Datele climatice și metoda lunară sunt documentate în metodologia aplicației.";
    $("#hlnReportMethodologyVersion").textContent =
      scenarioResult.methodology_version ? `Motor ${scenarioResult.methodology_version}` : "LaCurent Light";
    const assumptions = Array.isArray(scenarioResult.assumptions) ? scenarioResult.assumptions : [];
    $("#hlnReportAssumptions").innerHTML = assumptions.length
      ? assumptions.slice(0,8).map(item => `<li>${escapeHtml(item)}</li>`).join("")
      : "<li>Nu sunt declarate ipoteze suplimentare pentru acest scenariu.</li>";

    const strategy = $("#hlnReportStrategy");
    if (strategy) {
      if (optimizationMeta?.mode === "roi" && Array.isArray(optimizationMeta.selected)) {
        const selected = optimizationMeta.selected;
        const ranked = Array.isArray(optimizationMeta.rankedOpportunities)
          ? optimizationMeta.rankedOpportunities
          : [];
        const payback = optimizationMeta.paybackYears == null
          ? "n/a"
          : `${fmt(optimizationMeta.paybackYears,1)} ani`;
        strategy.innerHTML = `
          <div class="hln-strategy-lead">
            <strong>Best ROI · ${fmt(optimizationMeta.roiPercentPerYear,1)}%/an</strong>
            <span>CAPEX ${fmt(optimizationMeta.capexLei)} lei · economie anuală ${fmt(optimizationMeta.annualSavingLei)} lei/an · recuperare simplă ${payback}. Guardrail: ${escapeHtml(optimizationMeta.projectModeLabel || projectModeLabel())}.</span>
          </div>
          <div class="hln-strategy-list">
            ${selected.map((item,index) => `
              <article>
                <b>${index + 1}</b>
                <div><strong>${escapeHtml(item.label)}</strong><small>CAPEX ${fmt(item.capexLei)} lei · ROI individual ${fmt(item.roiPercentPerYear,1)}%/an · ${item.paybackYears == null ? "fără payback pozitiv" : "payback " + fmt(item.paybackYears,1) + " ani"}</small></div>
              </article>
            `).join("")}
          </div>
          ${ranked.length ? `<p>Oportunități individuale evaluate: ${ranked.map(item => `${escapeHtml(item.label)} (${fmt(item.roiPercentPerYear,1)}%/an)`).join(" · ")}.</p>` : ""}
          <p>${escapeHtml(optimizationMeta.note || "")} Costurile de investiție folosite în această versiune provin din intrările explicite ale utilizatorului; câmpurile fără CAPEX nu sunt inventate.</p>
        `;
      } else if (optimizationMeta?.mode === "nzeb") {
        const selected = Array.isArray(optimizationMeta.selected) ? optimizationMeta.selected : [];
        strategy.innerHTML = `
          <div class="hln-strategy-lead">
            <strong>Țintă nZEB · energie primară + CO₂</strong>
            <span>Optimizerul a pornit din Casa mea; a aplicat condițional pragurile de anvelopă și a reevaluat apoi opțiunile de instalații/regenerabile.</span>
          </div>
          ${selected.length ? `<div class="hln-strategy-list">${selected.map((item,index) => `
            <article><b>${index + 1}</b><div><strong>${escapeHtml(item.label)}</strong><small>${item.kind === "mc001-envelope" ? "MC001 Tabel 2.4" : "opțiune LaCurent evaluată prin motor"}</small></div></article>
          `).join("")}</div>` : ""}
          <p>Nu se creează un racord nou la gaz. O schimbare de generator, când este utilă, folosește pompă de căldură compatibilă cu distribuția modelată. RER rămâne de verificat separat.</p>
        `;
      } else {
        strategy.innerHTML = `
          <div class="hln-strategy-lead">
            <strong>Scenariu configurat manual</strong>
            <span>Intervențiile au fost selectate și ajustate direct în Home Lab; rezultatele sunt recalculate de motorul Python.</span>
          </div>
        `;
      }
    }

    const report = $("[data-hln-screen='report']");
    report?.classList.toggle("is-nzeb-target", optimizationMeta?.mode === "nzeb");
    report?.classList.toggle("is-roi-target", optimizationMeta?.mode === "roi");
  }

  function renderProgress() {
    const stage = screen === "home" ? "home" : screen === "site" || screen === "intervention" ? "site" : screen === "report" ? "report" : "scenario";
    $$("[data-hln-go]").forEach(button => {
      button.classList.toggle("is-active", button.dataset.hlnGo === stage);
    });
  }

  function renderAll() {
    renderHome();
    renderProgress();
    renderDock();
    renderLiveConfigurator();
    renderProjectGuardrailSummary();
    if (screen === "intervention") renderIntervention();
    if (screen === "scenario") renderScenario();
    if (screen === "report") renderReport();
    renderResultFreshness();
  }

  function showScreen(next) {
    if (next === "site" && !baselineSaved) return;
    if (next === "scenario" && !baselineSaved) return;
    if (next === "report" && (!baselineSaved || !scenarioResult || scenarioResultState !== "fresh")) return;
    screen = next;
    root.querySelectorAll("[data-hln-screen]").forEach(node => node.classList.toggle("is-active", node.dataset.hlnScreen === next));
    renderAll();
    emitVisualState();
    if (next === "report") {
      window.requestAnimationFrame(() => window.dispatchEvent(new Event("resize")));
    }
    window.scrollTo({top: 0, behavior: "smooth"});
  }

  function persist() {
    try {
      localStorage.setItem(storageKey, JSON.stringify({
        baselineSaved,
        homeState,
        scenarioState,
        homeResult,
        scenarioResult,
        measures,
        referenceMode,
        scenarioOverrides,
        optimizationMeta,
        projectMode
      }));
    } catch (_) {}
  }

  async function saveHomeAndOpenSite() {
    let result = homeResultState === "fresh" ? homeResult : null;
    if (!result) {
      setStatus("Calculez Casa mea înainte de renovare…");
      result = await calculateState(homeState, "home");
    }
    if (!result) {
      setStatus("Casa nu a putut fi salvată încă. Verifică valorile introduse.", "error");
      return false;
    }
    homeResult = result;
    currentResult = result;
    baselineSaved = true;
    referenceMode = false;
    scenarioOverrides = {};
    optimizationMeta = null;
    setOptimizationNote("");
    scenarioState = {...homeState};
    scenarioResult = homeResult;
    scenarioResultState = "fresh";
    measures = [];
    persist();
    showScreen("site");
    return true;
  }

  function openEditor(name) {
    const titles = {location:"Locația",house:"Casa",envelope:"Anvelopa",systems:"Instalațiile",renewables:"Regenerabile"};
    $("#hlnEditorTitle").textContent = titles[name] || "Editează";
    $$("[data-hln-editor]").forEach(section => section.hidden = section.dataset.hlnEditor !== name);
    $("#hlnEditor").hidden = false;
    document.body.style.overflow = "hidden";
    syncHomeEditorControls();
    if (name === "location") renderHomeLocationMap();
  }

  function closeEditor() {
    $("#hlnEditor").hidden = true;
    document.body.style.overflow = "";
    renderHome();
    scheduleCalculate("home", 20);
  }

  function syncHomeEditorControls() {
    $("#hlnLocalitySearch").value = homeState.locality;
    $("#hlnBuildingType").value = homeState.buildingType || "residential_individual";
    $("#hlnConstructionYear").value = homeState.constructionYear || 2005;
    $("#hlnArea").value = homeState.area;
    $("#hlnHeight").value = homeState.height;
    $("#hlnTemperature").value = homeState.temperature;
    $("#hlnOccupants").value = homeState.occupants;
    $("#hlnHomeWallIns").value = homeState.wallIns;
    $("#hlnHomeRoofIns").value = homeState.roofIns;
    $("#hlnHomeFloorIns").value = homeState.floorIns;
    $("#hlnHomeWindows").value = homeState.windows;
    $("#hlnHomeGlazing").value = homeState.glazing;
    $("#hlnOrientation").value = homeState.orientation;
    $("#hlnHomeHeating").value = homeState.heating;
    $("#hlnHomeHeatPumpSource").value = homeState.heatPumpSource || "heat_pump_air_water";
    $("#hlnHomeHeatingEmitter").value = homeState.heatingEmitter;
    $("#hlnHomeHeatingDistribution").value = homeState.heatingDistribution;
    $("#hlnHomeHeatingStorage").value = homeState.heatingStorage;
    $("#hlnHomeHeatingControl").value = homeState.heatingControl;
    toggleHeatPumpSourceControls();
    $("#hlnHomeVentilation").value = homeState.ventilation;
    $("#hlnHomeCooling").value = homeState.cooling;
    $("#hlnHomePvEnabled").checked = Boolean(homeState.pvEnabled);
    $("#hlnHomePvKwp").value = homeState.pvKwp;
    $("#hlnHomePvOrientation").value = homeState.pvOrientation;
    $("#hlnHomePvTilt").value = homeState.pvTilt;
    $("#hlnHomeSolarThermalEnabled").checked = Boolean(homeState.solarThermalEnabled);
    $("#hlnHomeSolarThermalArea").value = homeState.solarThermalArea;
    $("#hlnHomeSolarThermalOrientation").value = homeState.solarThermalOrientation;
    $("#hlnHomeSolarThermalTilt").value = homeState.solarThermalTilt;
    root.querySelectorAll("#hlnLevels [data-value]").forEach(button => button.classList.toggle("is-active", Number(button.dataset.value) === Number(homeState.levels)));
  }

  function updateHomeFromEditors() {
    const previous = {
      orientation: homeState.orientation,
      cooling: homeState.cooling,
      heating: homeState.heating,
      pvEnabled: Boolean(homeState.pvEnabled),
      pvOrientation: homeState.pvOrientation,
      solarThermalEnabled: Boolean(homeState.solarThermalEnabled),
      solarThermalOrientation: homeState.solarThermalOrientation,
    };
    homeState.buildingType = $("#hlnBuildingType").value;
    homeState.constructionYear = Number($("#hlnConstructionYear").value) || 2005;
    homeState.area = Number($("#hlnArea").value);
    homeState.height = Number($("#hlnHeight").value);
    homeState.temperature = Number($("#hlnTemperature").value);
    homeState.occupants = Number($("#hlnOccupants").value);
    homeState.wallIns = Number($("#hlnHomeWallIns").value);
    homeState.roofIns = Number($("#hlnHomeRoofIns").value);
    homeState.floorIns = Number($("#hlnHomeFloorIns").value);
    homeState.windows = Number($("#hlnHomeWindows").value);
    homeState.glazing = $("#hlnHomeGlazing").value;
    homeState.orientation = $("#hlnOrientation").value;
    const selectedHeating = $("#hlnHomeHeating").value;
    const heatingChanged = selectedHeating !== homeState.heating;
    homeState.heating = selectedHeating;
    if (heatingChanged) {
      applyHeatingDefaults(homeState, selectedHeating);
    } else {
      if (homeState.heating === "heat_pump") {
        homeState.heatPumpSource = $("#hlnHomeHeatPumpSource").value;
      }
      homeState.heatingEmitter = $("#hlnHomeHeatingEmitter").value;
      homeState.heatingDistribution = $("#hlnHomeHeatingDistribution").value;
      homeState.heatingStorage = $("#hlnHomeHeatingStorage").value;
      homeState.heatingControl = $("#hlnHomeHeatingControl").value;
    }
    normalizeHeatingState(homeState);
    homeState.ventilation = $("#hlnHomeVentilation").value;
    homeState.cooling = $("#hlnHomeCooling").value;
    homeState.pvEnabled = $("#hlnHomePvEnabled").checked;
    homeState.pvKwp = Number($("#hlnHomePvKwp").value);
    homeState.pvOrientation = $("#hlnHomePvOrientation").value;
    homeState.pvTilt = Number($("#hlnHomePvTilt").value);
    homeState.solarThermalEnabled = $("#hlnHomeSolarThermalEnabled").checked;
    homeState.solarThermalArea = Number($("#hlnHomeSolarThermalArea").value);
    homeState.solarThermalOrientation = $("#hlnHomeSolarThermalOrientation").value;
    homeState.solarThermalTilt = Number($("#hlnHomeSolarThermalTilt").value);
    syncHomeEditorControls();
    renderHome();
    baselineSaved = false;
    referenceMode = false;
    scenarioOverrides = {};
    optimizationMeta = null;
    setOptimizationNote("");
    measures = [];
    scenarioState = {...homeState};
    const focus =
      previous.cooling !== homeState.cooling ? "cooling" :
      previous.heating !== homeState.heating ? "heating" :
      previous.orientation !== homeState.orientation ? "orientation" :
      previous.pvEnabled !== Boolean(homeState.pvEnabled) || previous.pvOrientation !== homeState.pvOrientation ? "pv" :
      previous.solarThermalEnabled !== Boolean(homeState.solarThermalEnabled) || previous.solarThermalOrientation !== homeState.solarThermalOrientation ? "solarThermal" : null;
    emitVisualState(focus);
    scheduleCalculate("home");
  }

  function openMeasure(type) {
    if (!baselineSaved) return;
    referenceMode = false;
    interventionOriginal = {...scenarioState};
    activeMeasure = type;

    if (!measures.includes(type)) {
      if (type === "wall") scenarioState.wallIns = Math.min(30, Number(homeState.wallIns) + 10);
      if (type === "roof") scenarioState.roofIns = Math.min(40, Number(homeState.roofIns) + 10);
      if (type === "floor") scenarioState.floorIns = Math.min(25, Number(homeState.floorIns) + 5);
      if (type === "windows" && homeState.glazing !== "triple_low_e_faces_2_and_5") scenarioState.glazing = "triple_low_e_faces_2_and_5";
      if (type === "heating" && homeState.heating !== "heat_pump") {
        scenarioState.heating = "heat_pump";
        applyHeatingDefaults(scenarioState, "heat_pump");
      }
      if (type === "ventilation" && homeState.ventilation !== "hrv") scenarioState.ventilation = "hrv";
      if (type === "pv") {
        scenarioState.pvEnabled = true;
        if (!homeState.pvEnabled) {
          scenarioState.pvKwp = 5;
          scenarioState.pvOrientation = "south";
          scenarioState.pvTilt = 30;
        }
      }
      if (type === "solar_thermal") {
        scenarioState.solarThermalEnabled = true;
        if (!homeState.solarThermalEnabled) {
          scenarioState.solarThermalArea = 4;
          scenarioState.solarThermalOrientation = "south";
          scenarioState.solarThermalTilt = 45;
        }
      }
    }

    showScreen("intervention");
    renderIntervention();
    scheduleCalculate("scenario", 20);
  }

  function cancelIntervention() {
    if (interventionOriginal) scenarioState = {...interventionOriginal};
    activeMeasure = null;
    interventionOriginal = null;
    scheduleCalculate("scenario", 20);
    showScreen("site");
  }

  function keepIntervention() {
    if (!activeMeasure) return;
    if (!measures.includes(activeMeasure)) measures.push(activeMeasure);
    activeMeasure = null;
    interventionOriginal = null;
    persist();
    showScreen("scenario");
  }

  function resetMeasure(type) {
    referenceMode = false;
    optimizationMeta = null;
    setOptimizationNote("");
    clearScenarioOverrideForMeasure(type);
    if (type === "wall") scenarioState.wallIns = homeState.wallIns;
    if (type === "roof") scenarioState.roofIns = homeState.roofIns;
    if (type === "floor") scenarioState.floorIns = homeState.floorIns;
    if (type === "windows") {
      scenarioState.glazing = homeState.glazing;
      scenarioState.windows = homeState.windows;
    }
    if (type === "heating") {
      scenarioState.heating = homeState.heating;
      scenarioState.heatPumpSource = homeState.heatPumpSource;
      scenarioState.heatingEmitter = homeState.heatingEmitter;
      scenarioState.heatingDistribution = homeState.heatingDistribution;
      scenarioState.heatingStorage = homeState.heatingStorage;
      scenarioState.heatingControl = homeState.heatingControl;
    }
    if (type === "ventilation") {
      scenarioState.ventilation = homeState.ventilation;
      scenarioState.cooling = homeState.cooling;
    }
    if (type === "pv") {
      scenarioState.pvEnabled = homeState.pvEnabled;
      scenarioState.pvKwp = homeState.pvKwp;
      scenarioState.pvOrientation = homeState.pvOrientation;
      scenarioState.pvTilt = homeState.pvTilt;
    }
    if (type === "solar_thermal") {
      scenarioState.solarThermalEnabled = homeState.solarThermalEnabled;
      scenarioState.solarThermalArea = homeState.solarThermalArea;
      scenarioState.solarThermalOrientation = homeState.solarThermalOrientation;
      scenarioState.solarThermalTilt = homeState.solarThermalTilt;
    }
    measures = measures.filter(item => item !== type);
    scheduleCalculate("scenario", 20);
    persist();
    renderScenario();
  }

  function syncInterventionFromControls() {
    if (!activeMeasure) return;
    referenceMode = false;
    optimizationMeta = null;
    setOptimizationNote("");
    clearScenarioOverrideForMeasure(activeMeasure);
    if (activeMeasure === "wall") scenarioState.wallIns = Number($("#hlnWallIns").value);
    if (activeMeasure === "roof") scenarioState.roofIns = Number($("#hlnRoofIns").value);
    if (activeMeasure === "floor") scenarioState.floorIns = Number($("#hlnFloorIns").value);
    if (activeMeasure === "windows") {
      scenarioState.glazing = $("#hlnScenarioGlazing").value;
      scenarioState.windows = Number($("#hlnScenarioWindows").value);
    }
    if (activeMeasure === "heating") {
      const selected = $("#hlnScenarioHeating").value;
      const generatorChanged = selected !== scenarioState.heating;
      scenarioState.heating = selected;
      if (generatorChanged) {
        applyHeatingDefaults(scenarioState, selected);
      } else {
        if (scenarioState.heating === "heat_pump") {
          scenarioState.heatPumpSource = $("#hlnScenarioHeatPumpSource").value;
        }
        scenarioState.heatingEmitter = $("#hlnScenarioHeatingEmitter").value;
        scenarioState.heatingDistribution = $("#hlnScenarioHeatingDistribution").value;
        scenarioState.heatingStorage = $("#hlnScenarioHeatingStorage").value;
        scenarioState.heatingControl = $("#hlnScenarioHeatingControl").value;
      }
      normalizeHeatingState(scenarioState);
    }
    if (activeMeasure === "ventilation") {
      scenarioState.ventilation = $("#hlnScenarioVentilation").value;
      scenarioState.cooling = $("#hlnScenarioCooling").value;
    }
    if (activeMeasure === "pv") {
      scenarioState.pvEnabled = true;
      scenarioState.pvKwp = Number($("#hlnScenarioPvKwp").value);
      scenarioState.pvOrientation = $("#hlnScenarioPvOrientation").value;
      scenarioState.pvTilt = Number($("#hlnScenarioPvTilt").value);
    }
    if (activeMeasure === "solar_thermal") {
      scenarioState.solarThermalEnabled = true;
      scenarioState.solarThermalArea = Number($("#hlnScenarioSolarThermalArea").value);
      scenarioState.solarThermalOrientation = $("#hlnScenarioSolarThermalOrientation").value;
      scenarioState.solarThermalTilt = Number($("#hlnScenarioSolarThermalTilt").value);
    }
    renderIntervention();
    emitVisualState(activeMeasure === "solar_thermal" ? "solarThermal" : activeMeasure);
    scheduleCalculate("scenario");
  }

  function applyLiveScenarioChange(key, value, focus = null) {
    if (!baselineSaved) return;
    referenceMode = false;
    optimizationMeta = null;
    setOptimizationNote("");
    clearScenarioOverrideForKey(key);

    if (key === "pvKwp") {
      const power = clamp(Number(value) || 0, 0, 30);
      scenarioState.pvKwp = power;
      scenarioState.pvEnabled = power > 0;
      focus = "pv";
    } else if (key === "solarThermalKw") {
      const power = clamp(Number(value) || 0, 0, 30);
      scenarioState.solarThermalArea = solarThermalAreaFromKw(power);
      scenarioState.solarThermalEnabled = power > 0;
      focus = "solarThermal";
    } else if (key === "heating") {
      scenarioState.heating = value;
      applyHeatingDefaults(scenarioState, value);
      focus = "heating";
    } else {
      scenarioState[key] = value;
    }

    syncMeasuresFromScenario();
    // Queue the calculation before repainting the UI so a rendering problem
    // cannot prevent the changed scenario from reaching the engine.
    scheduleCalculate("scenario", 90);
    renderAll();
    persist();
    emitVisualState(focus);
  }

  function nudgeLiveRange(row, delta) {
    const input = row?.querySelector('input[type="range"]');
    if (!input) return;
    const key = row.dataset.hlnTune;
    const min = Number(input.min || -Infinity);
    const max = Number(input.max || Infinity);
    const step = Math.abs(Number(delta)) || Number(input.step || 1);
    const next = clamp(Number(input.value || 0) + Number(delta || step), min, max);
    input.value = String(next);
    applyLiveScenarioChange(key, next);
  }

  function normalized(text) {
    return String(text || "").normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase();
  }

  function escapeHtml(value) {
    return String(value ?? "")
      .replaceAll("&", "&amp;")
      .replaceAll("<", "&lt;")
      .replaceAll(">", "&gt;")
      .replaceAll('"', "&quot;");
  }

  function walkMapCoordinates(value, visit) {
    if (Array.isArray(value) && value.length >= 2 && Number.isFinite(value[0]) && Number.isFinite(value[1])) {
      visit(value);
      return;
    }
    if (Array.isArray(value)) value.forEach(item => walkMapCoordinates(item, visit));
  }

  function createHomeLocationProjection(data) {
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
    const height = 470;
    const pad = 18;
    const midLat = (bounds.minLat + bounds.maxLat) / 2;
    const lonScale = Math.cos(midLat * Math.PI / 180);
    const spanX = Math.max((bounds.maxLon - bounds.minLon) * lonScale, 0.01);
    const spanY = Math.max(bounds.maxLat - bounds.minLat, 0.01);
    const scale = Math.min((width - 2 * pad) / spanX, (height - 2 * pad) / spanY);
    return {
      width,
      height,
      project(lon, lat) {
        return [
          pad + (lon - bounds.minLon) * lonScale * scale,
          pad + (bounds.maxLat - lat) * scale
        ];
      }
    };
  }

  function mapGeometryPath(geometry, projection) {
    const polygons = geometry?.type === "Polygon"
      ? [geometry.coordinates || []]
      : geometry?.type === "MultiPolygon"
        ? geometry.coordinates || []
        : [];
    const parts = [];
    polygons.forEach(polygon => {
      polygon.forEach(ring => {
        if (!ring.length) return;
        parts.push(ring.map((point, index) => {
          const [x, y] = projection.project(point[0], point[1]);
          return `${index ? "L" : "M"}${x.toFixed(1)} ${y.toFixed(1)}`;
        }).join(" ") + " Z");
      });
    });
    return parts.join(" ");
  }

  function selectHomeLocality(locality) {
    if (!locality) return;
    homeState.localityId = locality.id;
    homeState.locality = locality.name;
    homeState.climateZone = locality.climateZone || null;
    homeState.climateStationId = locality.stationId || null;
    homeState.winterDesignTemperatureC = locality.winterDesignTemperatureC ?? null;
    $("#hlnLocalitySearch").value = locality.name;
    $("#hlnEditorClimate").textContent =
      `${locality.county || ""}${locality.climateZone ? " · zona " + locality.climateZone : ""} · ${locality.stationName || "profil climatic automat"}`;
    $("#hlnClimateSummary").textContent =
      `${locality.county || ""} · ${locality.stationName || "profil climatic automat"}`;
    $("#hlnLocalityResults").hidden = true;
    $("#hlnMapLocalityResults").hidden = true;
    baselineSaved = false;
    referenceMode = false;
    scenarioOverrides = {};
    optimizationMeta = null;
    setOptimizationNote("");
    measures = [];
    scenarioState = {...homeState};
    renderHomeLocationMap();
    renderHome();
    emitVisualState();
    scheduleCalculate("home", 20);
  }

  function homeMapLocalityTier(locality) {
    const population = Number(locality.population2002) || 0;
    const rank = String(locality.rank ?? "");
    if (rank === "0" || rank === "I" || population >= 200000) return 1;
    if (rank === "II" || population >= 55000) return 2;
    if (rank === "III" || population >= 12000) return 3;
    return 4;
  }

  function homeMapLabelWidth(name, fontSize) {
    return Math.min(150, Math.max(34, (String(name || "").length * fontSize * 0.58) + 12));
  }

  function homeMapLabels(items, projection, selectedId) {
    const accepted = [];
    const labels = new Map();
    const sorted = [...items].sort((a, b) => {
      if (a.item.id === selectedId) return -1;
      if (b.item.id === selectedId) return 1;
      return a.tier - b.tier || Number(b.item.importance || 0) - Number(a.item.importance || 0);
    });
    const limit = window.innerWidth <= 760 ? 18 : 30;

    for (const marker of sorted) {
      const selected = marker.item.id === selectedId;
      if (!selected && labels.size >= limit) continue;
      const fontSize = selected ? 12 : marker.tier === 1 ? 10.5 : marker.tier === 2 ? 9.5 : 8.5;
      const width = homeMapLabelWidth(marker.item.name, fontSize);
      const radius = selected ? 5.8 : marker.tier === 1 ? 4.2 : marker.tier === 2 ? 3.4 : 2.6;
      const x = marker.x + radius + 5;
      const y = marker.y - 2;
      const box = {x1:x, x2:x+width, y1:y-fontSize, y2:y+4};
      if (!selected && accepted.some(other => !(box.x2 + 4 < other.x1 || box.x1 - 4 > other.x2 || box.y2 + 3 < other.y1 || box.y1 - 3 > other.y2))) {
        continue;
      }
      accepted.push(box);
      labels.set(marker.item.id, {x:radius+5,y:-2,fontSize});
    }
    return labels;
  }

  function homeMapVisibleLocalities(projection, selectedId) {
    const candidates = localities
      .filter(item => Number.isFinite(item.lon) && Number.isFinite(item.lat))
      .map(item => {
        const [x,y] = projection.project(item.lon,item.lat);
        return {item,x,y,tier:homeMapLocalityTier(item)};
      })
      .filter(entry => entry.tier <= 3 || entry.item.id === selectedId)
      .sort((a,b) => {
        if (a.item.id === selectedId) return -1;
        if (b.item.id === selectedId) return 1;
        return a.tier - b.tier || Number(b.item.importance || 0) - Number(a.item.importance || 0);
      });
    return candidates.slice(0, window.innerWidth <= 760 ? 70 : 120);
  }

  function renderHomeLocationMap() {
    const target = $("#hlnHomeLocationMap");
    if (!target) return;
    if (!locationMapData || !locationProjection) {
      target.innerHTML = "<p>Se încarcă harta României…</p>";
      return;
    }
    const projection = locationProjection;
    const selected = localityMap.get(String(homeState.localityId));
    const selectedZone = String(selected?.climateZone || "");
    const selectedId = selected?.id;

    const zonePaths = (locationMapData.climateZones?.features || []).map(feature => {
      const zone = String(feature.properties?.zone || "");
      return `<path class="hln-map-zone zone-${escapeHtml(zone)}${zone === selectedZone ? " is-selected" : ""}" d="${mapGeometryPath(feature.geometry, projection)}"></path>`;
    }).join("");
    const boundary = (locationMapData.romaniaBoundary?.features || []).map(feature =>
      `<path class="hln-map-boundary" d="${mapGeometryPath(feature.geometry, projection)}"></path>`
    ).join("");

    const markers = homeMapVisibleLocalities(projection, selectedId);
    const labels = homeMapLabels(markers, projection, selectedId);
    const localityMarkup = markers.map(marker => {
      const isSelected = marker.item.id === selectedId;
      const label = labels.get(marker.item.id);
      const radius = isSelected ? 5.8 : marker.tier === 1 ? 4.2 : marker.tier === 2 ? 3.4 : 2.6;
      return `
        <g class="hln-map-locality tier-${marker.tier}${isSelected ? " is-selected" : ""}" data-map-locality-id="${escapeHtml(marker.item.id)}" transform="translate(${marker.x.toFixed(1)} ${marker.y.toFixed(1)})">
          <circle r="${radius}"></circle>
          ${label ? `<text x="${label.x}" y="${label.y}" style="font-size:${label.fontSize}px">${escapeHtml(marker.item.name)}</text>` : ""}
        </g>
      `;
    }).join("");

    const temperatureByZone = {I:"−12°C",II:"−15°C",III:"−18°C",IV:"−21°C",V:"−24°C"};
    const legend = ["I","II","III","IV","V"].map(zone =>
      `<span class="${zone === selectedZone ? "is-selected" : ""}"><i class="zone-${zone}"></i>Zona ${zone} · ${temperatureByZone[zone]}</span>`
    ).join("");

    target.innerHTML = `
      <svg class="hln-location-map-svg" viewBox="0 0 ${projection.width} ${projection.height}" preserveAspectRatio="xMidYMid meet" aria-label="Hartă climatică și localități din România">
        <rect class="hln-map-sea" x="0" y="0" width="${projection.width}" height="${projection.height}"></rect>
        <g class="hln-map-zones">${zonePaths}</g>
        <g class="hln-map-boundaries">${boundary}</g>
        <g class="hln-map-localities">${localityMarkup}</g>
      </svg>
      <div class="hln-map-legend" aria-label="Legendă zone climatice">${legend}</div>
      <span class="hln-map-hint">Atinge harta pentru localitățile din apropiere</span>
    `;
  }

  function nearestHomeMapLocalities(event, limit = 6) {
    const svg = event.target.closest("svg.hln-location-map-svg");
    if (!svg || !locationProjection || !localities.length) return [];
    const rect = svg.getBoundingClientRect();
    if (!rect.width || !rect.height) return [];
    const x = ((event.clientX - rect.left) / rect.width) * locationProjection.width;
    const y = ((event.clientY - rect.top) / rect.height) * locationProjection.height;
    return localities
      .filter(item => Number.isFinite(item.lon) && Number.isFinite(item.lat))
      .map(item => {
        const [px, py] = locationProjection.project(item.lon, item.lat);
        return {item, distance:Math.hypot(px - x, py - y)};
      })
      .sort((a,b) => a.distance - b.distance || Number(b.item.importance || 0) - Number(a.item.importance || 0))
      .slice(0, limit)
      .map(entry => entry.item);
  }

  function renderHomeMapCandidates(items) {
    const target = $("#hlnMapLocalityResults");
    if (!target) return;
    target.innerHTML = items.map(item => `
      <button type="button" data-map-locality-id="${escapeHtml(item.id)}">
        <strong>${escapeHtml(item.name)}</strong>
        <small>${escapeHtml(item.county || "")}${item.uatName && item.uatName !== item.name ? " · " + escapeHtml(item.uatName) : ""}</small>
      </button>
    `).join("");
    target.hidden = !items.length;
  }

  function renderLocalities(query) {
    const target = $("#hlnLocalityResults");
    const q = normalized(query).trim();
    if (q.length < 2 || !localities.length) {
      target.hidden = true;
      return;
    }
    const hits = localities
      .filter(item => normalized(item.search || `${item.name} ${item.county}`).includes(q))
      .slice(0, 8);
    target.innerHTML = hits.map(item => `
      <button type="button" data-locality-id="${item.id}">
        <strong>${item.name}</strong>
        <small>${item.county || ""}${item.uatName && item.uatName !== item.name ? " · " + item.uatName : ""}</small>
      </button>
    `).join("");
    target.hidden = !hits.length;
  }

  $$("[data-hln-editor-open]").forEach(button => button.addEventListener("click", () => openEditor(button.dataset.hlnEditorOpen)));
  $$("[data-hln-editor-close]").forEach(button => button.addEventListener("click", closeEditor));
  $("#hlnEditor").addEventListener("click", event => {
    if (event.target === $("#hlnEditor")) closeEditor();
  });

  ["#hlnBuildingType","#hlnConstructionYear","#hlnArea","#hlnHeight","#hlnTemperature","#hlnOccupants","#hlnHomeWallIns","#hlnHomeRoofIns","#hlnHomeFloorIns","#hlnHomeWindows","#hlnHomeGlazing","#hlnOrientation","#hlnHomeHeating","#hlnHomeHeatPumpSource","#hlnHomeHeatingEmitter","#hlnHomeHeatingDistribution","#hlnHomeHeatingStorage","#hlnHomeHeatingControl","#hlnHomeVentilation","#hlnHomeCooling","#hlnHomePvEnabled","#hlnHomePvKwp","#hlnHomePvOrientation","#hlnHomePvTilt","#hlnHomeSolarThermalEnabled","#hlnHomeSolarThermalArea","#hlnHomeSolarThermalOrientation","#hlnHomeSolarThermalTilt"]
    .forEach(selector => {
      const node = $(selector);
      if (node) node.addEventListener("change", updateHomeFromEditors);
    });

  root.querySelectorAll("#hlnLevels [data-value]").forEach(button => button.addEventListener("click", () => {
    homeState.levels = Number(button.dataset.value);
    root.querySelectorAll("#hlnLevels [data-value]").forEach(item => item.classList.toggle("is-active", item === button));
    baselineSaved = false;
    referenceMode = false;
    scenarioOverrides = {};
    measures = [];
    scenarioState = {...homeState};
    renderHome();
    emitVisualState();
    scheduleCalculate("home");
  }));

  $("#hlnLocalitySearch").addEventListener("input", event => renderLocalities(event.target.value));
  $("#hlnLocalityResults").addEventListener("click", event => {
    const button = event.target.closest("[data-locality-id]");
    if (!button) return;
    selectHomeLocality(localityMap.get(String(button.dataset.localityId)));
  });

  $("#hlnHomeLocationMap").addEventListener("click", event => {
    const localityNode = event.target.closest("[data-map-locality-id]");
    if (localityNode) {
      selectHomeLocality(localityMap.get(String(localityNode.dataset.mapLocalityId)));
      return;
    }
    if (!event.target.closest("svg.hln-location-map-svg")) return;
    renderHomeMapCandidates(nearestHomeMapLocalities(event));
  });

  $("#hlnMapLocalityResults").addEventListener("click", event => {
    const button = event.target.closest("[data-map-locality-id]");
    if (!button) return;
    selectHomeLocality(localityMap.get(String(button.dataset.mapLocalityId)));
  });

  const liveRangeBindings = [
    ["#hlnLiveWallIns", "wallIns"],
    ["#hlnLiveRoofIns", "roofIns"],
    ["#hlnLiveFloorIns", "floorIns"],
    ["#hlnLiveWindows", "windows"],
    ["#hlnLivePvKwp", "pvKwp"],
    ["#hlnLiveSolarThermalKw", "solarThermalKw"],
  ];

  liveRangeBindings.forEach(([selector, key]) => {
    const input = $(selector);
    if (!input) return;
    const commitRangeValue = () => {
      applyLiveScenarioChange(key, Number(input.value));
    };
    input.addEventListener("input", commitRangeValue);
    // iOS/Safari and embedded contexts are more reliable when the released
    // range value is also committed on change.
    input.addEventListener("change", commitRangeValue);
    input.addEventListener("wheel", event => {
      if (Math.abs(event.deltaY) < 1) return;
      event.preventDefault();
      const step = Number(input.step || 1);
      const delta = event.deltaY < 0 ? step : -step;
      const row = input.closest("[data-hln-tune]");
      nudgeLiveRange(row, delta);
    }, { passive: false });
  });

  [
    ["#hlnLiveGlazing", "glazing", "windows"],
    ["#hlnLiveHeating", "heating", "heating"],
    ["#hlnLiveVentilation", "ventilation", "ventilation"],
    ["#hlnLiveCooling", "cooling", "cooling"],
  ].forEach(([selector, key, focus]) => {
    const input = $(selector);
    if (!input) return;
    input.addEventListener("change", () => applyLiveScenarioChange(key, input.value, focus));
  });

  $$("[data-hln-reference-house]").forEach(button => {
    button.addEventListener("click", setReferenceHouse);
  });

  const projectModeInput = $("#hlnProjectMode");
  if (projectModeInput) {
    projectModeInput.addEventListener("change", () => {
      projectMode = projectModeInput.value;
      cancelOptimizerRun();
      optimizationMeta = null;
      setOptimizationNote("");
      persist();
      renderProjectGuardrailSummary();
    });
  }

  $$("[data-hln-smart-config]").forEach(button => {
    button.addEventListener("click", async () => {
      if (button.dataset.hlnSmartConfig === "nzeb") await configureNzeb();
      if (button.dataset.hlnSmartConfig === "roi") await configureBestRoi();
    });
  });

  $$("[data-hln-reset-home]").forEach(button => {
    button.addEventListener("click", resetScenarioToHome);
  });

  $$("#hlnLiveConfigurator [data-hln-tune-step]").forEach(button => {
    button.addEventListener("click", () => {
      const row = button.closest("[data-hln-tune]");
      nudgeLiveRange(row, Number(button.dataset.hlnTuneStep));
    });
  });

  $$("[data-hln-measure]").forEach(button => button.addEventListener("click", () => openMeasure(button.dataset.hlnMeasure)));
  $$("[data-hln-intervention-cancel]").forEach(button => button.addEventListener("click", cancelIntervention));
  $("[data-hln-intervention-keep]").addEventListener("click", keepIntervention);

  ["#hlnWallIns","#hlnRoofIns","#hlnFloorIns","#hlnScenarioGlazing","#hlnScenarioWindows","#hlnScenarioHeating","#hlnScenarioHeatPumpSource","#hlnScenarioHeatingEmitter","#hlnScenarioHeatingDistribution","#hlnScenarioHeatingStorage","#hlnScenarioHeatingControl","#hlnScenarioVentilation","#hlnScenarioCooling","#hlnScenarioPvKwp","#hlnScenarioPvOrientation","#hlnScenarioPvTilt","#hlnScenarioSolarThermalArea","#hlnScenarioSolarThermalOrientation","#hlnScenarioSolarThermalTilt"]
    .forEach(selector => $(selector).addEventListener("change", syncInterventionFromControls));

  $$(".hln-stepper [data-step]").forEach(button => button.addEventListener("click", () => {
    const input = button.parentElement.querySelector("input");
    const next = Math.max(Number(input.min || -Infinity), Math.min(Number(input.max || Infinity), Number(input.value || 0) + Number(button.dataset.step)));
    input.value = String(next);
    syncInterventionFromControls();
  }));

  $$(".hln-quick-values [data-quick-add]").forEach(button => button.addEventListener("click", () => {
    if (!activeMeasure) return;
    const baseValue = activeMeasure === "wall" ? homeState.wallIns : activeMeasure === "roof" ? homeState.roofIns : homeState.floorIns;
    const input = activeMeasure === "wall" ? $("#hlnWallIns") : activeMeasure === "roof" ? $("#hlnRoofIns") : $("#hlnFloorIns");
    input.value = String(Number(baseValue) + Number(button.dataset.quickAdd));
    syncInterventionFromControls();
  }));

  root.addEventListener("click", event => {
    const go = event.target.closest("[data-hln-go]");
    if (go) {
      const target = go.dataset.hlnGo;
      if (target === "home") {
        screen = "home";
        root.querySelectorAll("[data-hln-screen]").forEach(node => node.classList.toggle("is-active", node.dataset.hlnScreen === "home"));
        renderAll();
        emitVisualState();
        return;
      }
      if (target === "site" && baselineSaved) showScreen("site");
      if (target === "scenario" && baselineSaved) showScreen("scenario");
      if (target === "report" && baselineSaved && scenarioResult) showScreen("report");
      return;
    }

    const edit = event.target.closest("[data-hln-measure-edit]");
    if (edit) {
      const type = edit.dataset.hlnMeasureEdit;
      if (!openQuickMeasureEditor(type)) openMeasure(type);
      return;
    }

    const remove = event.target.closest("[data-hln-measure-remove]");
    if (remove) resetMeasure(remove.dataset.hlnMeasureRemove);
  });

  const quickEditRange = $("#hlnQuickEditRange");
  quickEditRange.addEventListener("input", event => {
    applyQuickMeasureValue(event.target.value);
  });
  quickEditRange.addEventListener("change", event => {
    applyQuickMeasureValue(event.target.value);
    commitQuickMeasureEditor();
  });
  quickEditRange.addEventListener("pointerup", () => {
    if (quickEditType) commitQuickMeasureEditor();
  });
  quickEditRange.addEventListener("touchend", () => {
    if (quickEditType) commitQuickMeasureEditor();
  }, { passive: true });

  $("#hlnQuickEditOverlay").addEventListener("click", event => {
    if (event.target === $("#hlnQuickEditOverlay")) cancelQuickMeasureEditor();
  });
  root.querySelectorAll("[data-hln-quick-edit-close]").forEach(button => button.addEventListener("click", cancelQuickMeasureEditor));
  $("[data-hln-quick-edit-details]").addEventListener("click", openQuickMeasureDetails);

  $("#hlnDockCta").addEventListener("click", async () => {
    if (screen === "home") {
      const button = $("#hlnDockCta");
      if (button) button.disabled = true;
      try {
        if (!baselineSaved) await saveHomeAndOpenSite();
        else showScreen("site");
      } finally {
        if (button) button.disabled = false;
      }
      return;
    }
    if (screen === "site") {
      if (measures.length) showScreen("scenario");
      return;
    }
    if (screen === "intervention") {
      keepIntervention();
      return;
    }
    if (screen === "scenario") {
      persist();
      showScreen("report");
    }
  });

  const printReportButton = $("[data-hln-print-report]");
  if (printReportButton) {
    printReportButton.addEventListener("click", () => {
      renderReport();
      window.print();
    });
  }

  fetch("/api/location-data")
    .then(response => response.ok ? response.json() : Promise.reject(new Error("Localități indisponibile")))
    .then(data => {
      locationMapData = data;
      localities = Array.isArray(data.localities) ? data.localities : [];
      localityMap = new Map(localities.map(item => [String(item.id), item]));
      locationProjection = createHomeLocationProjection(data);
      if (!locationProjection) throw new Error("Geometria hărții nu este disponibilă.");

      const selected = localityMap.get(String(homeState.localityId));
      if (selected) {
        const climateMetadata = {
          climateZone: selected.climateZone || null,
          climateStationId: selected.stationId || null,
          winterDesignTemperatureC: selected.winterDesignTemperatureC ?? null,
        };
        Object.assign(homeState, climateMetadata);
        Object.assign(scenarioState, climateMetadata);
        if (!homeState.locality) homeState.locality = selected.name;
        if (!scenarioState.locality) scenarioState.locality = selected.name;
        window.setTimeout(() => {
          if (baselineSaved) calculateState(scenarioState, "scenario");
          else calculateState(homeState, "home");
        }, 0);
      }
      renderHomeLocationMap();
    })
    .catch(error => {
      const map = $("#hlnHomeLocationMap");
      if (map) {
        map.innerHTML = "<p>Harta nu a putut fi încărcată. Căutarea localității rămâne disponibilă.</p>";
        map.dataset.mapError = error?.message || "location-map-error";
      }
    });

  syncHomeEditorControls();
  syncOptimizerInputs();
  loadRoiCostBasis().catch(() => {});
  renderAll();
  emitVisualState();

  if (baselineSaved && homeResult) {
    currentResult = homeResult;
    (async () => {
      const refreshedHome = await calculateState(homeState, "home");
      if (!refreshedHome || !baselineSaved) return;
      homeResult = refreshedHome;
      await calculateState(scenarioState, "scenario");
    })();
  } else {
    calculateState(homeState, "home");
  }
})();