(() => {
  const payloadField = document.querySelector('.actions-footer form[action="/certificate"] input[name="payload"]');
  const resultsHero = document.querySelector('.results-hero');
  if (!payloadField || !resultsHero) return;

  let baseline;
  try {
    baseline = JSON.parse(payloadField.value);
  } catch (_) {
    return;
  }

  const PROFILE_ORDER = ["actual", "poor", "average", "good", "very_good"];
  const ENVELOPE_PROFILES = {
    poor: { exterior_wall: 1.30, roof: 1.00, floor: 0.90, window: 2.80, exterior_door: 2.50, psi: 0.15 },
    average: { exterior_wall: 0.55, roof: 0.35, floor: 0.45, window: 1.60, exterior_door: 1.80, psi: 0.08 },
    good: { exterior_wall: 0.30, roof: 0.20, floor: 0.30, window: 1.10, exterior_door: 1.40, psi: 0.05 },
    very_good: { exterior_wall: 0.18, roof: 0.15, floor: 0.20, window: 0.85, exterior_door: 1.10, psi: 0.03 }
  };
  const HEATING_PROFILES = {
    condensing_gas_boiler: { system_type: "condensing_gas_boiler", carrier: "natural_gas", efficiency: 0.94, scop: 3.2, cost_profile: "natural_gas" },
    gas_boiler: { system_type: "gas_boiler", carrier: "natural_gas", efficiency: 0.85, scop: 3.2, cost_profile: "natural_gas" },
    electric_resistance: { system_type: "electric_resistance", carrier: "electricity", efficiency: 1.0, scop: 3.2, cost_profile: "electricity" },
    heat_pump: { system_type: "heat_pump", carrier: "electricity", efficiency: 1.0, scop: 3.2, cost_profile: "electricity" },
    wood_stove: { system_type: "custom", carrier: "biomass", efficiency: 0.75, scop: 3.2, cost_profile: "firewood" },
    wood_boiler: { system_type: "custom", carrier: "biomass", efficiency: 0.80, scop: 3.2, cost_profile: "firewood" },
    pellet_boiler: { system_type: "custom", carrier: "biomass", efficiency: 0.88, scop: 3.2, cost_profile: "pellets" },
    district_heat: { system_type: "district_heat", carrier: "district_heat", efficiency: 0.95, scop: 3.2, cost_profile: "district_heat" }
  };
  const CLIMATE_SCENARIOS = {
    1: { zone: "I", station: "oradea", label: "Oradea", design: -12 },
    2: { zone: "II", station: "arad", label: "Arad", design: -15 },
    3: { zone: "III", station: "iasi", label: "Iași", design: -18 },
    4: { zone: "IV", station: "sfantu_gheorghe", label: "Sfântu Gheorghe", design: -21 },
    5: { zone: "V", station: "miercurea_ciuc", label: "Miercurea Ciuc", design: -24 }
  };
  const COMPONENT_FIELDS = {
    exterior_wall: ["wall_area_m2", "wall_u_value"],
    roof: ["roof_area_m2", "roof_u_value"],
    floor: ["floor_area_m2", "floor_u_value"],
    window: ["window_area_m2", "window_u_value"],
    exterior_door: ["door_area_m2", "door_u_value"]
  };

  const ro = () => document.documentElement.lang !== "en";
  const txt = (roText, enText) => ro() ? roText : enText;
  const fmt0 = (value) => `${Math.round(Number(value) || 0).toLocaleString(ro() ? "ro-RO" : "en-US")} `;
  const parseNumber = (value) => {
    const cleaned = String(value || "").replace(/\s/g, "").replace(/[^0-9,.-]/g, "").replace(",", ".");
    const parsed = Number.parseFloat(cleaned);
    return Number.isFinite(parsed) ? parsed : 0;
  };

  function inferInsulation() {
    const values = Object.fromEntries((baseline.envelope || []).map((item) => [item.type, Number(item.u_value_w_m2k)]));
    let best = "average";
    let bestScore = Infinity;
    Object.entries(ENVELOPE_PROFILES).forEach(([name, profile]) => {
      let score = 0;
      let count = 0;
      Object.entries(values).forEach(([kind, actual]) => {
        if (!(kind in profile)) return;
        score += ((actual - profile[kind]) / Math.max(profile[kind], 0.01)) ** 2;
        count += 1;
      });
      if (count && score < bestScore) {
        best = name;
        bestScore = score;
      }
    });
    return best;
  }

  function inferHeating() {
    const h = baseline.heating || {};
    if (h.system_type === "heat_pump") return "heat_pump";
    if (h.system_type === "electric_resistance") return "electric_resistance";
    if (h.system_type === "condensing_gas_boiler") return "condensing_gas_boiler";
    if (h.system_type === "gas_boiler") return "gas_boiler";
    if (h.system_type === "district_heat") return "district_heat";
    if (h.cost_profile === "pellets") return "pellet_boiler";
    if (h.cost_profile === "firewood") return Number(h.efficiency || 0.75) >= 0.78 ? "wood_boiler" : "wood_stove";
    return "condensing_gas_boiler";
  }

  function currentZone() {
    const match = String(baseline.locality || "").match(/^@lc\|[^|]+\|([^|]*)\|/);
    return match?.[1] || "";
  }

  const inferredInsulation = inferInsulation();
  const inferredHeating = inferHeating();
  const baseArea = Number(baseline.heated_floor_area_m2) || 100;
  const baseTemp = Number(baseline.indoor_design_temperature_c) || 20;
  const baseFinalEnergy = parseNumber(document.querySelector('.metric-grid article:nth-child(2) strong')?.textContent);
  const baseAnnualCost = parseNumber(document.querySelector('.cost-headline-grid .cost-total strong')?.textContent);
  const baseClass = document.querySelector('.class-badge strong')?.textContent?.trim() || "—";
  const baseChart = document.querySelector('.monthly-panel .monthly-chart')?.outerHTML || "";

  const section = document.createElement("section");
  section.className = "scenario-lab";
  section.id = "scenario-lab";
  section.innerHTML = `
    <div class="scenario-lab-head">
      <div>
        <span class="scenario-lab-kicker" data-sim="kicker"></span>
        <h2 data-sim="title"></h2>
        <p data-sim="intro"></p>
      </div>
      <button class="scenario-reset" type="button" data-sim-reset></button>
    </div>
    <div class="scenario-grid">
      <div class="scenario-controls">
        <div class="scenario-control">
          <div class="scenario-control-head"><strong data-sim="insulation-title"></strong><output id="simInsulationOutput"></output></div>
          <input id="simInsulation" type="range" min="0" max="4" step="1" value="0">
          <div class="scenario-scale"><span data-sim="actual"></span><span data-sim="insulation-max"></span></div>
        </div>
        <div class="scenario-control">
          <div class="scenario-control-head"><strong data-sim="heating-title"></strong></div>
          <select id="simHeating"></select>
        </div>
        <div class="scenario-control">
          <div class="scenario-control-head"><strong data-sim="area-title"></strong><output id="simAreaOutput"></output></div>
          <input id="simArea" type="range" min="${Math.max(20, Math.round(baseArea * 0.5))}" max="${Math.max(40, Math.round(baseArea * 1.5))}" step="1" value="${Math.round(baseArea)}">
          <small data-sim="area-note"></small>
        </div>
        <div class="scenario-control">
          <div class="scenario-control-head"><strong data-sim="climate-title"></strong><output id="simClimateOutput"></output></div>
          <input id="simClimate" type="range" min="0" max="5" step="1" value="0">
          <div class="scenario-scale"><span data-sim="actual"></span><span>V</span></div>
          <small data-sim="climate-note"></small>
        </div>
        <div class="scenario-control">
          <div class="scenario-control-head"><strong data-sim="temp-title"></strong><output id="simTempOutput"></output></div>
          <input id="simTemp" type="range" min="16" max="24" step="0.5" value="${baseTemp}">
        </div>
      </div>
      <div class="scenario-results">
        <div class="scenario-status" id="scenarioStatus" aria-live="polite"></div>
        <div class="scenario-metrics">
          <div class="scenario-metric"><span data-sim="energy-label"></span><strong id="simEnergyValue"></strong><em id="simEnergyDelta"></em></div>
          <div class="scenario-metric"><span data-sim="cost-label"></span><strong id="simCostValue"></strong><em id="simCostDelta"></em></div>
          <div class="scenario-metric"><span data-sim="class-label"></span><strong id="simClassValue"></strong><em data-sim="class-note"></em></div>
          <div class="scenario-metric"><span data-sim="saving-label"></span><strong id="simSavingValue"></strong><em data-sim="saving-note"></em></div>
        </div>
        <div class="scenario-chart-card">
          <div class="scenario-chart-head"><h3 data-sim="chart-title"></h3><span data-sim="chart-note"></span></div>
          <div class="scenario-chart-host" id="scenarioChartHost"></div>
        </div>
        <p class="scenario-note" data-sim="method-note"></p>
      </div>
    </div>`;

  const anchor = document.querySelector('.results-layout') || document.querySelector('.monthly-panel');
  if (anchor) anchor.before(section);
  else resultsHero.after(section);

  const insulationInput = section.querySelector("#simInsulation");
  const heatingInput = section.querySelector("#simHeating");
  const areaInput = section.querySelector("#simArea");
  const climateInput = section.querySelector("#simClimate");
  const tempInput = section.querySelector("#simTemp");
  const status = section.querySelector("#scenarioStatus");
  const chartHost = section.querySelector("#scenarioChartHost");
  const energyValue = section.querySelector("#simEnergyValue");
  const energyDelta = section.querySelector("#simEnergyDelta");
  const costValue = section.querySelector("#simCostValue");
  const costDelta = section.querySelector("#simCostDelta");
  const classValue = section.querySelector("#simClassValue");
  const savingValue = section.querySelector("#simSavingValue");

  const heatingNames = {
    condensing_gas_boiler: ["Centrală în condensare pe gaz", "Condensing gas boiler"],
    gas_boiler: ["Centrală convențională pe gaz", "Conventional gas boiler"],
    heat_pump: ["Pompă de căldură", "Heat pump"],
    electric_resistance: ["Încălzire electrică directă", "Direct electric heating"],
    wood_stove: ["Sobă / șemineu pe lemne", "Wood stove / fireplace"],
    wood_boiler: ["Centrală pe lemne", "Wood boiler"],
    pellet_boiler: ["Centrală pe peleți", "Pellet boiler"],
    district_heat: ["Termoficare", "District heating"]
  };
  const insulationNames = {
    actual: ["Actual", "Current"],
    poor: ["Slabă", "Poor"],
    average: ["Medie", "Average"],
    good: ["Bună", "Good"],
    very_good: ["Foarte bună", "Very good"]
  };

  function setText(key, roText, enText) {
    section.querySelectorAll(`[data-sim="${key}"]`).forEach((node) => { node.textContent = txt(roText, enText); });
  }

  function renderLanguage() {
    setText("kicker", "Laborator de scenarii", "Scenario lab");
    setText("title", "Ce se întâmplă dacă investești aici?", "What happens if you invest here?");
    setText("intro", "Modifică parametrii și compară imediat scenariul cu locuința introdusă. Casa ta rămâne baseline-ul și nu este suprascrisă.", "Change the parameters and compare the scenario immediately with the home you entered. Your home remains the baseline and is not overwritten.");
    setText("actual", "Actual", "Current");
    setText("insulation-title", "Nivelul termoizolației", "Insulation level");
    setText("insulation-max", "Foarte bună", "Very good");
    setText("heating-title", "Sursa principală de încălzire", "Main heating source");
    setText("area-title", "Suprafața încălzită", "Heated area");
    setText("area-note", "Scenariu de sensibilitate: geometria anvelopei este scalată păstrând proporțiile casei.", "Sensitivity scenario: envelope geometry is scaled while preserving the home's proportions.");
    setText("climate-title", "Zona climatică", "Climate zone");
    setText("climate-note", "Actual păstrează localitatea ta. Zonele I–V folosesc o stație MC001 reprezentativă pentru comparație.", "Current keeps your location. Zones I–V use a representative MC001 station for comparison.");
    setText("temp-title", "Temperatura interioară", "Indoor temperature");
    setText("energy-label", "Energie finală anuală", "Annual final energy");
    setText("cost-label", "Cost anual estimat", "Estimated annual cost");
    setText("class-label", "Clasă energetică", "Energy class");
    setText("class-note", "scenariul recalculat", "recalculated scenario");
    setText("saving-label", "Diferență de cost", "Cost difference");
    setText("saving-note", "față de casa mea", "versus my home");
    setText("chart-title", "Profil lunar recalculat", "Recalculated monthly profile");
    setText("chart-note", "încălzire + răcire", "heating + cooling");
    setText("method-note", "Scenariul folosește același motor de calcul ca raportul. Nu reprezintă o recomandare de investiție până când nu adăugăm costul lucrării și durata de amortizare.", "The scenario uses the same calculation engine as the report. It is not an investment recommendation until project cost and payback are added.");
    section.querySelector("[data-sim-reset]").textContent = txt("Revino la casa mea", "Reset to my home");
    renderHeatingOptions();
    updateOutputs();
  }

  function renderHeatingOptions() {
    const current = heatingInput.value || "actual";
    const options = [`<option value="actual">${txt("Actual", "Current")} · ${txt(...heatingNames[inferredHeating])}</option>`];
    Object.entries(heatingNames).forEach(([value, labels]) => {
      options.push(`<option value="${value}">${txt(...labels)}</option>`);
    });
    heatingInput.innerHTML = options.join("");
    heatingInput.value = current;
    if (!heatingInput.value) heatingInput.value = "actual";
  }

  function insulationLabel() {
    const value = PROFILE_ORDER[Number(insulationInput.value)] || "actual";
    if (value === "actual") return `${txt("Actual", "Current")} · ${txt(...insulationNames[inferredInsulation])}`;
    return txt(...insulationNames[value]);
  }

  function climateLabel() {
    const index = Number(climateInput.value);
    if (!index) {
      const zone = currentZone();
      return zone ? `${txt("Actual", "Current")} · ${txt("Zona", "Zone")} ${zone}` : txt("Actual", "Current");
    }
    return `${txt("Zona", "Zone")} ${CLIMATE_SCENARIOS[index].zone}`;
  }

  function updateOutputs() {
    section.querySelector("#simInsulationOutput").textContent = insulationLabel();
    section.querySelector("#simAreaOutput").textContent = `${Math.round(Number(areaInput.value))} m²`;
    section.querySelector("#simClimateOutput").textContent = climateLabel();
    section.querySelector("#simTempOutput").textContent = `${Number(tempInput.value).toFixed(1).replace(".0", "")} °C`;
  }

  function add(fd, key, value) {
    if (value === null || value === undefined || value === "") return;
    fd.append(key, String(value));
  }

  function selectedHeating() {
    if (heatingInput.value === "actual") return { ...(baseline.heating || {}) };
    return { ...HEATING_PROFILES[heatingInput.value] };
  }

  function selectedLocality() {
    const index = Number(climateInput.value);
    if (!index) return baseline.locality;
    const scenario = CLIMATE_SCENARIOS[index];
    return `@lc|${scenario.station}|${scenario.zone}|${scenario.design}|${scenario.label}`;
  }

  function buildScenarioForm() {
    const fd = new FormData();
    const area = Number(areaInput.value);
    const ratio = area / baseArea;
    const linearRatio = Math.sqrt(ratio);
    const insulationKey = PROFILE_ORDER[Number(insulationInput.value)] || "actual";
    const insulation = insulationKey === "actual" ? null : ENVELOPE_PROFILES[insulationKey];
    const heating = selectedHeating();

    add(fd, "project_name", baseline.project_name || "Scenariu");
    add(fd, "locality", selectedLocality());
    add(fd, "heated_floor_area_m2", area);
    add(fd, "heated_volume_m3", Number(baseline.heated_volume_m3) * ratio);
    add(fd, "indoor_design_temperature_c", Number(tempInput.value));
    add(fd, "building_type", baseline.building_type);
    add(fd, "construction_year", baseline.construction_year);
    add(fd, "solar_gains_kwh_m2_month", baseline.solar_gains_kwh_m2_month || 0);

    (baseline.envelope || []).forEach((component) => {
      const fields = COMPONENT_FIELDS[component.type];
      if (!fields) return;
      const [areaField, uField] = fields;
      const scale = ["roof", "floor"].includes(component.type) ? ratio : linearRatio;
      add(fd, areaField, Number(component.area_m2) * scale);
      add(fd, uField, insulation ? insulation[component.type] : component.u_value_w_m2k);
    });

    const bridge = baseline.thermal_bridges?.[0];
    if (bridge) {
      add(fd, "thermal_bridge_length_m", Number(bridge.length_m) * linearRatio);
      add(fd, "thermal_bridge_psi_w_mk", insulation ? insulation.psi : bridge.psi_w_mk);
    }

    add(fd, "air_changes_per_hour", baseline.ventilation?.air_changes_per_hour);
    add(fd, "heat_recovery_efficiency", baseline.ventilation?.heat_recovery_efficiency || 0);
    add(fd, "heating_system_type", heating.system_type);
    add(fd, "heating_carrier", heating.carrier);
    add(fd, "heating_efficiency", heating.efficiency);
    add(fd, "heating_scop", heating.scop);
    add(fd, "heating_cost_profile", heating.cost_profile);

    if (baseline.cooling?.enabled) fd.append("cooling_enabled", "on");
    add(fd, "cooling_seer", baseline.cooling?.seer);
    add(fd, "cooling_setpoint_c", baseline.cooling?.setpoint_c || 26);

    if (baseline.dhw?.enabled) fd.append("dhw_enabled", "on");
    add(fd, "dhw_occupants", baseline.dhw?.occupants || 0);
    add(fd, "dhw_litres_per_person_day_at_60c", baseline.dhw?.litres_per_person_day_at_60c);
    add(fd, "dhw_efficiency", baseline.dhw?.efficiency || 0.85);
    add(fd, "dhw_carrier", baseline.dhw?.carrier || "natural_gas");
    return fd;
  }

  function deltaClass(value, inverse = false) {
    if (Math.abs(value) < 0.5) return "";
    const good = inverse ? value > 0 : value < 0;
    return good ? "better" : "worse";
  }

  function renderMetrics(finalEnergy, annualCost, energyClass, chartHtml, partialCost = false) {
    const energyChange = baseFinalEnergy ? ((finalEnergy - baseFinalEnergy) / baseFinalEnergy) * 100 : 0;
    const saving = baseAnnualCost - annualCost;
    energyValue.textContent = `${fmt0(finalEnergy)}kWh/an`;
    energyDelta.textContent = `${energyChange > 0 ? "+" : ""}${energyChange.toFixed(0)}% ${txt("față de casa mea", "vs my home")}`;
    energyDelta.className = deltaClass(energyChange);
    costValue.textContent = `${fmt0(annualCost)}lei/an${partialCost ? "*" : ""}`;
    costDelta.textContent = partialCost ? txt("total parțial calculabil", "partial priceable total") : txt("prețuri de referință actuale", "current reference prices");
    costDelta.className = "";
    classValue.textContent = energyClass || "—";
    if (saving > 1) {
      savingValue.textContent = `${fmt0(saving)}lei/an`;
      savingValue.className = "better";
    } else if (saving < -1) {
      savingValue.textContent = `+${fmt0(Math.abs(saving))}lei/an`;
      savingValue.className = "worse";
    } else {
      savingValue.textContent = `0 lei/an`;
      savingValue.className = "";
    }
    if (chartHtml) chartHost.innerHTML = chartHtml;
  }

  renderMetrics(baseFinalEnergy, baseAnnualCost, baseClass, baseChart);
  status.textContent = txt("Casa ta este baseline-ul. Mișcă un control pentru a testa un scenariu.", "Your home is the baseline. Move a control to test a scenario.");

  let timer = null;
  let controller = null;
  let requestId = 0;

  async function recalculate() {
    const myId = ++requestId;
    controller?.abort();
    controller = new AbortController();
    status.className = "scenario-status is-loading";
    status.textContent = txt("Se recalculează scenariul…", "Recalculating scenario…");
    try {
      const response = await fetch("/calculate", { method: "POST", body: buildScenarioForm(), signal: controller.signal });
      const html = await response.text();
      if (!response.ok) throw new Error(txt("Scenariul nu a putut fi calculat.", "The scenario could not be calculated."));
      if (myId !== requestId) return;
      const doc = new DOMParser().parseFromString(html, "text/html");
      const finalEnergy = parseNumber(doc.querySelector('.metric-grid article:nth-child(2) strong')?.textContent);
      const annualCost = parseNumber(doc.querySelector('.cost-headline-grid .cost-total strong')?.textContent);
      const energyClass = doc.querySelector('.class-badge strong')?.textContent?.trim() || "—";
      const chart = doc.querySelector('.monthly-panel .monthly-chart');
      const costLabel = doc.querySelector('.cost-headline-grid .cost-total span')?.textContent || "";
      const partialCost = /calculabil|priceable/i.test(costLabel);
      renderMetrics(finalEnergy, annualCost, energyClass, chart?.outerHTML || "", partialCost);
      status.className = "scenario-status";
      status.textContent = txt("Scenariu actualizat cu același motor de calcul ca raportul.", "Scenario updated with the same calculation engine as the report.");
    } catch (error) {
      if (error?.name === "AbortError") return;
      status.className = "scenario-status is-error";
      status.textContent = error?.message || txt("Eroare la recalculare.", "Recalculation error.");
    }
  }

  function scheduleRecalculation() {
    updateOutputs();
    status.className = "scenario-status is-loading";
    status.textContent = txt("Pregătesc scenariul…", "Preparing scenario…");
    clearTimeout(timer);
    timer = setTimeout(recalculate, 240);
  }

  [insulationInput, areaInput, climateInput, tempInput].forEach((input) => input.addEventListener("input", scheduleRecalculation));
  heatingInput.addEventListener("change", scheduleRecalculation);
  section.querySelector("[data-sim-reset]").addEventListener("click", () => {
    insulationInput.value = "0";
    heatingInput.value = "actual";
    areaInput.value = String(Math.round(baseArea));
    climateInput.value = "0";
    tempInput.value = String(baseTemp);
    clearTimeout(timer);
    controller?.abort();
    updateOutputs();
    renderMetrics(baseFinalEnergy, baseAnnualCost, baseClass, baseChart);
    status.className = "scenario-status";
    status.textContent = txt("Ai revenit la datele casei tale.", "Back to your home's baseline data.");
  });

  document.querySelectorAll("[data-site-language]").forEach((button) => {
    button.addEventListener("click", () => setTimeout(renderLanguage, 0));
  });

  renderLanguage();
})();
