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
  let activeMeasure = null;
  let interventionOriginal = null;
  let quickEditType = null;
  let quickEditOriginal = null;
  let screen = "home";
  let localities = [];
  let localityMap = new Map();
  let calculateToken = 0;
  let calculateTimer = 0;
  let calculateAbortController = null;
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

    const occlusion = Math.max(0, Math.round(mobileViewportBaseline - visibleBottom));
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

  function toggleHeatPumpSourceControls() {
    const home = $("[data-hln-home-heat-pump-source]");
    const scenario = $("[data-hln-scenario-heat-pump-source]");
    if (home) home.hidden = homeState.heating !== "heat_pump";
    if (scenario) scenario.hidden = scenarioState.heating !== "heat_pump";

    // Local heat sources already imply local emission, no distribution network,
    // no thermal buffer and their fixed control preset. Do not expose selectors
    // that cannot change the resolved system.
    const homeLocalFixed = ["wood_stove", "electric_resistance"].includes(homeState.heating);
    const scenarioLocalFixed = ["wood_stove", "electric_resistance"].includes(scenarioState.heating);
    $("[data-hln-home-heating-chain]").forEach(node => {
      node.hidden = homeLocalFixed;
    });
    $("[data-hln-scenario-heating-chain]").forEach(node => {
      node.hidden = scenarioLocalFixed;
    });
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
    scenarioState = { ...homeState };
    scenarioResult = homeResult;
    currentResult = homeResult;
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

  function populateTechnicalForm(state) {
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

    formSet("locality_id", state.localityId);
    formSet("locality", state.locality);
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
    const overrides = state === scenarioState ? (scenarioOverrides || {}) : {};
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

  async function calculateState(state, target) {
    const token = ++calculateToken;
    if (calculateAbortController) calculateAbortController.abort();
    const controller = new AbortController();
    calculateAbortController = controller;

    populateTechnicalForm(state);
    const body = new FormData(form);
    setStatus("Recalculare live…");

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
        // Consume the body so transient edge responses do not leave the
        // connection hanging; the text is intentionally not surfaced raw.
        await response.text();
      }

      if (!response.ok || !payload || payload.error) {
        const retryable = response.status === 429 || response.status >= 500;
        if (retryable && attempt < 2 && token === calculateToken) {
          await new Promise(resolve => window.setTimeout(resolve, 220));
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
      if (!payload || token !== calculateToken) return null;
      if (target === "home") homeResult = payload;
      if (target === "scenario") scenarioResult = payload;
      currentResult = payload;
      setStatus("Calcul actualizat", "ok");
      renderAll();
      emitVisualState();
      return payload;
    } catch (error) {
      if (error?.name === "AbortError" || token !== calculateToken) return null;
      setStatus(error?.message || "Calcul indisponibil momentan.", "error");
      return null;
    } finally {
      if (calculateAbortController === controller) calculateAbortController = null;
    }
  }

  function scheduleCalculate(target = baselineSaved && screen !== "home" ? "scenario" : "home", delay = 180) {
    clearTimeout(calculateTimer);
    calculateTimer = window.setTimeout(() => {
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
    if (value == null) return {text: "—", good: null};
    if (Math.abs(value) < 0.05) return {text: "0" + suffix, good: null};
    return {
      text: `${value > 0 ? "+" : "−"}${fmt(Math.abs(value), 0)}${suffix}`,
      good: value > 0
    };
  }

  function signedSavingText(current, baseline, unit = "") {
    const now = Number(current);
    const base = Number(baseline);
    if (!Number.isFinite(now) || !Number.isFinite(base)) return {text: "—", good: null};
    const saving = base - now;
    if (Math.abs(saving) < 0.05) return {text: `0${unit}`, good: null};
    return {
      text: `${saving > 0 ? "+" : "−"}${fmt(Math.abs(saving), unit === " kW" ? 1 : 0)}${unit}`,
      good: saving > 0
    };
  }

  function renderImpactPanel() {
    if (!homeResult || !scenarioResult) return;

    const cost = signedSavingText(scenarioResult.annual_cost_lei, homeResult.annual_cost_lei, " lei/an");
    const energy = benefitText(scenarioResult.final_energy_kwh, homeResult.final_energy_kwh);
    const co2 = benefitText(scenarioResult.co2_kg, homeResult.co2_kg);
    const loadNode = $("#hlnImpactLoad");

    [
      ["#hlnImpactCost", cost],
      ["#hlnImpactEnergy", energy],
      ["#hlnImpactCo2", co2]
    ].forEach(([selector, item]) => {
      const node = $(selector);
      if (!node) return;
      node.textContent = item.text;
      node.classList.toggle("is-bad", item.good === false);
    });

    if (loadNode) {
      loadNode.textContent = `${fmt(homeResult.design_heat_load_kw, 1)} → ${fmt(scenarioResult.design_heat_load_kw, 1)} kW`;
      loadNode.classList.toggle("is-bad", Number(scenarioResult.design_heat_load_kw) > Number(homeResult.design_heat_load_kw));
    }
  }

  function renderDock() {
    const dock = $(".hln-dock");
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
      const cost = benefitText(scenarioResult.annual_cost_lei, homeResult.annual_cost_lei);
      const energy = benefitText(scenarioResult.final_energy_kwh, homeResult.final_energy_kwh);
      const co2 = benefitText(scenarioResult.co2_kg, homeResult.co2_kg);
      [
        ["#hlnDockCostBenefit", cost],
        ["#hlnDockEnergyBenefit", energy],
        ["#hlnDockCo2Benefit", co2]
      ].forEach(([selector, item]) => {
        const node = $(selector);
        node.textContent = item.text;
        node.classList.toggle("is-bad", item.good === false);
      });
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
    } else {
      cta.hidden = false;
      ctaLabel.textContent = "Salvează scenariul";
    }
  }

  function renderHome() {
    const state = baselineSaved ? homeState : homeState;
    $("#hlnLocationSummary").textContent = state.locality || "—";
    $("#hlnHouseSummary").textContent = `${fmt(state.area)} m² · ${state.levels} nivel${Number(state.levels) === 1 ? "" : "uri"}`;
    $("#hlnHouseMeta").textContent = `${fmt(state.height, 1)} m · ${fmt(state.temperature, 1)}°C`;
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
    const renewableParts = [];
    if (state.pvEnabled) renewableParts.push(`PV ${fmt(state.pvKwp,1)} kWp`);
    if (state.solarThermalEnabled) renewableParts.push(`solar termic ${fmt(state.solarThermalArea,1)} m²`);
    $("#hlnSystemsMeta").textContent = [
      ...heatingParts,
      labels.ventilation[state.ventilation] || state.ventilation,
      ...renewableParts
    ].join(" · ");
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
        performanceNode.textContent =
          `Tur/retur ${fmt(performance.design_flow_temperature_c,0)}/${fmt(performance.design_return_temperature_c,0)}°C · ${kind} ${shown} · auxiliare ${fmt(performance.auxiliary_electricity_kwh)} kWh/an`;
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

    const costBenefit = benefitText(scenarioResult.annual_cost_lei, homeResult.annual_cost_lei);
    const benefitNode = $("#hlnScenarioBenefit");
    benefitNode.textContent = costBenefit.text;
    benefitNode.parentElement.classList.toggle("is-bad", costBenefit.good === false);

    $("#hlnScenarioCostCompare").textContent = `${fmt(homeResult.annual_cost_lei)} → ${fmt(scenarioResult.annual_cost_lei)} lei/an`;
    $("#hlnScenarioEnergyCompare").textContent = `${fmt(homeResult.final_energy_kwh)} → ${fmt(scenarioResult.final_energy_kwh)} kWh/an`;
    $("#hlnScenarioCo2Compare").textContent = `${fmt(homeResult.co2_kg)} → ${fmt(scenarioResult.co2_kg)} kg/an`;
    $("#hlnScenarioPowerCompare").textContent = `${fmt(homeResult.design_heat_load_kw,1)} → ${fmt(scenarioResult.design_heat_load_kw,1)} kW`;

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

  function renderProgress() {
    const stage = screen === "home" ? "home" : screen === "site" || screen === "intervention" ? "site" : "scenario";
    $$("[data-hln-go]").forEach(button => {
      button.classList.toggle("is-active", button.dataset.hlnGo === stage);
    });
  }

  function renderAll() {
    renderHome();
    renderProgress();
    renderDock();
    renderLiveConfigurator();
    if (screen === "intervention") renderIntervention();
    if (screen === "scenario") renderScenario();
  }

  function showScreen(next) {
    if (next === "site" && !baselineSaved) return;
    if (next === "scenario" && !baselineSaved) return;
    screen = next;
    $$("[data-hln-screen]").forEach(node => node.classList.toggle("is-active", node.dataset.hlnScreen === next));
    renderAll();
    emitVisualState();
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
        scenarioOverrides
      }));
    } catch (_) {}
  }

  function saveHomeAndOpenSite() {
    if (!currentResult && !homeResult) return;
    homeResult = currentResult || homeResult;
    baselineSaved = true;
    referenceMode = false;
    scenarioOverrides = {};
    scenarioState = {...homeState};
    scenarioResult = homeResult;
    measures = [];
    persist();
    showScreen("site");
  }

  function openEditor(name) {
    const titles = {location:"Locația",house:"Casa",envelope:"Anvelopa",systems:"Instalațiile"};
    $("#hlnEditorTitle").textContent = titles[name] || "Editează";
    $$("[data-hln-editor]").forEach(section => section.hidden = section.dataset.hlnEditor !== name);
    $("#hlnEditor").hidden = false;
    document.body.style.overflow = "hidden";
    syncHomeEditorControls();
  }

  function closeEditor() {
    $("#hlnEditor").hidden = true;
    document.body.style.overflow = "";
    renderHome();
    scheduleCalculate("home", 20);
  }

  function syncHomeEditorControls() {
    $("#hlnLocalitySearch").value = homeState.locality;
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
    $("#hlnLevels [data-value]").forEach(button => button.classList.toggle("is-active", Number(button.dataset.value) === Number(homeState.levels)));
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
      homeState.heatPumpSource = $("#hlnHomeHeatPumpSource").value;
      homeState.heatingEmitter = $("#hlnHomeHeatingEmitter").value;
      homeState.heatingDistribution = $("#hlnHomeHeatingDistribution").value;
      homeState.heatingStorage = $("#hlnHomeHeatingStorage").value;
      homeState.heatingControl = $("#hlnHomeHeatingControl").value;
      if (homeState.heating === "heat_pump" && homeState.heatPumpSource === "heat_pump_air_air") {
        homeState.heatingEmitter = "air";
        homeState.heatingDistribution = "air";
        homeState.heatingStorage = "none";
      }
      if (homeState.heatingEmitter === "local") homeState.heatingDistribution = "local";
      if (homeState.heatingEmitter === "air") homeState.heatingDistribution = "air";
      if (homeState.heatingEmitter === "underfloor") homeState.heatingDistribution = "underfloor";
    }
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
        scenarioState.heatPumpSource = $("#hlnScenarioHeatPumpSource").value;
        scenarioState.heatingEmitter = $("#hlnScenarioHeatingEmitter").value;
        scenarioState.heatingDistribution = $("#hlnScenarioHeatingDistribution").value;
        scenarioState.heatingStorage = $("#hlnScenarioHeatingStorage").value;
        scenarioState.heatingControl = $("#hlnScenarioHeatingControl").value;
        if (scenarioState.heating === "heat_pump" && scenarioState.heatPumpSource === "heat_pump_air_air") {
          scenarioState.heatingEmitter = "air";
          scenarioState.heatingDistribution = "air";
          scenarioState.heatingStorage = "none";
        }
        if (scenarioState.heatingEmitter === "local") scenarioState.heatingDistribution = "local";
        if (scenarioState.heatingEmitter === "air") scenarioState.heatingDistribution = "air";
        if (scenarioState.heatingEmitter === "underfloor") scenarioState.heatingDistribution = "underfloor";
      }
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

  ["#hlnArea","#hlnHeight","#hlnTemperature","#hlnOccupants","#hlnHomeWallIns","#hlnHomeRoofIns","#hlnHomeFloorIns","#hlnHomeWindows","#hlnHomeGlazing","#hlnOrientation","#hlnHomeHeating","#hlnHomeHeatPumpSource","#hlnHomeHeatingEmitter","#hlnHomeHeatingDistribution","#hlnHomeHeatingStorage","#hlnHomeHeatingControl","#hlnHomeVentilation","#hlnHomeCooling","#hlnHomePvEnabled","#hlnHomePvKwp","#hlnHomePvOrientation","#hlnHomePvTilt","#hlnHomeSolarThermalEnabled","#hlnHomeSolarThermalArea","#hlnHomeSolarThermalOrientation","#hlnHomeSolarThermalTilt"]
    .forEach(selector => $(selector).addEventListener("change", updateHomeFromEditors));

  $$("#hlnLevels [data-value]").forEach(button => button.addEventListener("click", () => {
    homeState.levels = Number(button.dataset.value);
    $$("#hlnLevels [data-value]").forEach(item => item.classList.toggle("is-active", item === button));
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
    const locality = localityMap.get(button.dataset.localityId);
    if (!locality) return;
    homeState.localityId = locality.id;
    homeState.locality = locality.name;
    $("#hlnLocalitySearch").value = locality.name;
    $("#hlnEditorClimate").textContent = `${locality.county || ""} · profil climatic automat`;
    $("#hlnClimateSummary").textContent = `${locality.county || ""} · profil climatic automat`;
    $("#hlnLocalityResults").hidden = true;
    baselineSaved = false;
    referenceMode = false;
    scenarioOverrides = {};
    measures = [];
    scenarioState = {...homeState};
    renderHome();
    emitVisualState();
    scheduleCalculate("home", 20);
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
        $("[data-hln-screen]").forEach(node => node.classList.toggle("is-active", node.dataset.hlnScreen === "home"));
        renderAll();
        emitVisualState();
        return;
      }
      if (target === "site" && baselineSaved) showScreen("site");
      if (target === "scenario" && baselineSaved) showScreen("scenario");
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
  $("[data-hln-quick-edit-close]").forEach(button => button.addEventListener("click", cancelQuickMeasureEditor));
  $("[data-hln-quick-edit-details]").addEventListener("click", openQuickMeasureDetails);

  $("#hlnDockCta").addEventListener("click", () => {
    if (screen === "home") {
      if (!baselineSaved) saveHomeAndOpenSite();
      else showScreen("site");
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
      const button = $("#hlnDockCta");
      const label = button?.querySelector("span") || button;
      label.textContent = "Scenariu salvat ✓";
      window.setTimeout(renderDock, 1200);
    }
  });

  $("[data-hln-save-scenario]").addEventListener("click", event => {
    persist();
    const label = event.currentTarget.querySelector("span") || event.currentTarget;
    label.textContent = "Scenariu salvat ✓";
    window.setTimeout(() => {
      label.textContent = "Salvează scenariul";
    }, 1200);
  });

  fetch("/api/location-data")
    .then(response => response.ok ? response.json() : Promise.reject(new Error("Localități indisponibile")))
    .then(data => {
      localities = data.localities || [];
      localityMap = new Map(localities.map(item => [item.id, item]));
    })
    .catch(() => {});

  syncHomeEditorControls();
  renderAll();
  emitVisualState();

  if (baselineSaved && homeResult) {
    currentResult = homeResult;
    calculateState(scenarioState, "scenario");
  } else {
    calculateState(homeState, "home");
  }
})();