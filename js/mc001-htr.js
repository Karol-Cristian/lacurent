document.addEventListener("DOMContentLoaded", () => {
  const COMPONENT_TYPES = [
    "external_wall",
    "roof",
    "floor",
    "window",
    "door",
    "other_envelope_component"
  ];
  const MONTHS = [
    "january",
    "february",
    "march",
    "april",
    "may",
    "june",
    "july",
    "august",
    "september",
    "october",
    "november",
    "december"
  ];
  const MONTHLY_CALCULATION_MODES = [
    "heating",
    "cooling",
    "explicit_signed"
  ];

  const DEFAULT_SOURCE_REFERENCE = "manual_mvp_input";
  const HTR_SCOPE = "htr_transmission_only_not_full_mc001_certificate";

  const authRequired = document.getElementById("authRequired");
  const workspace = document.getElementById("htrWorkspace");
  const componentRows = document.getElementById("componentRows");
  const addComponentBtn = document.getElementById("addComponentBtn");
  const smokePresetBtn = document.getElementById("smokePresetBtn");
  const runForm = document.getElementById("mc001HtrForm");
  const loadForm = document.getElementById("loadForm");
  const runMessage = document.getElementById("runMessage");
  const loadMessage = document.getElementById("loadMessage");

  function setMessage(element, message, isError = false) {
    if (!element) return;
    element.textContent = message || "";
    element.classList.toggle("error", Boolean(isError));
  }

  function safeLabel(value) {
    const text = String(value || "").trim();
    return text.length <= 80 && !/[<>{}]/.test(text);
  }

  function safeShortCode(value, maxLength = 80) {
    const text = String(value || "").trim();
    return text.length > 0 &&
      text.length <= maxLength &&
      /^[a-zA-Z0-9_.:-]+$/.test(text);
  }

  function finiteNumber(value) {
    if (value === null || value === undefined || String(value).trim() === "") return null;
    const number = Number(value);
    return Number.isFinite(number) ? number : null;
  }

  function inputValue(id) {
    return document.getElementById(id)?.value.trim() || "";
  }

  function hasAnyValue(ids) {
    return ids.some(id => inputValue(id) !== "");
  }

  function isChecked(id) {
    return Boolean(document.getElementById(id)?.checked);
  }

  function setText(id, value) {
    const element = document.getElementById(id);
    if (element) element.textContent = value ?? "--";
  }

  function setInputValue(id, value) {
    const element = document.getElementById(id);
    if (element) element.value = value;
  }

  function setCheckboxValue(id, value) {
    const element = document.getElementById(id);
    if (element) element.checked = Boolean(value);
  }

  function clearList(id) {
    const element = document.getElementById(id);
    if (element) element.innerHTML = "";
    return element;
  }

  function appendArticle(container, title, body, meta = "") {
    if (!container) return;
    const article = document.createElement("article");
    const index = document.createElement("span");
    const content = document.createElement("div");
    const heading = document.createElement("h3");
    const paragraph = document.createElement("p");
    index.textContent = String(container.children.length + 1);
    heading.textContent = title || "--";
    paragraph.textContent = body || "--";
    content.append(heading, paragraph);
    if (meta) {
      const small = document.createElement("small");
      small.textContent = meta;
      content.append(small);
    }
    article.append(index, content);
    container.append(article);
  }

  function componentRowTemplate(index) {
    const fieldset = document.createElement("fieldset");
    fieldset.dataset.componentRow = "true";
    fieldset.innerHTML = `
      <legend>Element anvelopa ${index}</legend>
      <div class="form-grid">
        <div>
          <label>component_id</label>
          <input name="component_id" placeholder="component_001">
        </div>
        <div>
          <label>component_type</label>
          <select name="component_type">
            <option value="">Alege tipul</option>
            ${COMPONENT_TYPES.map(type => `<option value="${type}">${type}</option>`).join("")}
          </select>
        </div>
        <div>
          <label>label</label>
          <input name="label" placeholder="Perete nord">
        </div>
        <div>
          <label>area_m2</label>
          <input name="area_m2" type="number" min="0" step="0.001">
        </div>
        <div>
          <label>thermal_transmittance_w_m2k</label>
          <input name="thermal_transmittance_w_m2k" type="number" min="0" step="0.001">
        </div>
        <div>
          <label>bztu</label>
          <input name="bztu" type="number" min="0" max="1" step="0.001">
        </div>
        <div>
          <label>source.reference</label>
          <input name="source_reference" value="${DEFAULT_SOURCE_REFERENCE}">
        </div>
      </div>
      <button class="secondary-btn" type="button" data-remove-component>Sterge element</button>
    `;
    return fieldset;
  }

  function refreshComponentRows() {
    const rows = [...componentRows.querySelectorAll("[data-component-row]")];
    rows.forEach((row, index) => {
      const legend = row.querySelector("legend");
      const remove = row.querySelector("[data-remove-component]");
      if (legend) legend.textContent = `Element anvelopa ${index + 1}`;
      if (remove) remove.disabled = rows.length === 1;
    });
  }

  function addComponentRow() {
    componentRows.append(componentRowTemplate(componentRows.children.length + 1));
    refreshComponentRows();
  }

  function ensureSingleComponentRow() {
    componentRows.innerHTML = "";
    addComponentRow();
    return componentRows.querySelector("[data-component-row]");
  }

  function setComponentField(row, name, value) {
    const field = row?.querySelector(`[name="${name}"]`);
    if (field) field.value = value;
  }

  function applyC2SmokePreset() {
    setInputValue("analysisLabel", "smoke-c2-integrated");
    setInputValue("houseId", "");

    const row = ensureSingleComponentRow();
    setComponentField(row, "component_id", "smoke-wall-1");
    setComponentField(row, "component_type", "external_wall");
    setComponentField(row, "label", "Smoke wall");
    setComponentField(row, "area_m2", "10");
    setComponentField(row, "thermal_transmittance_w_m2k", "0.3");
    setComponentField(row, "bztu", "1");
    setComponentField(row, "source_reference", DEFAULT_SOURCE_REFERENCE);

    setInputValue("thermalBridgeValue", "0");
    setInputValue("groundValue", "0");
    setInputValue("adjacentValue", "0");
    setInputValue("nonHuSource", DEFAULT_SOURCE_REFERENCE);

    setInputValue("directElementId", "direct-wall-1");
    setInputValue("directLabel", "Direct wall");
    setInputValue("directArea", "10");
    setInputValue("directCorrectedU", "0.3");
    setInputValue("directSource", DEFAULT_SOURCE_REFERENCE);

    setInputValue("bridgeId", "bridge-1");
    setInputValue("bridgeLabel", "Linear bridge");
    setInputValue("bridgeLength", "5");
    setInputValue("bridgePsi", "0.1");
    setInputValue("bridgeSource", DEFAULT_SOURCE_REFERENCE);

    setInputValue("psiCaseId", "psi-case-1");
    setInputValue("psiLength", "5");
    setInputValue("psiL2d", "4");
    setInputValue("psiRefElementId", "ref-wall-1");
    setInputValue("psiRefArea", "10");
    setInputValue("psiRefU", "0.3");
    setInputValue("psiSource", DEFAULT_SOURCE_REFERENCE);

    setInputValue("heatFlowCaseId", "heat-flow-1");
    setInputValue("heatFlowHtr", "10");
    setInputValue("heatFlowThetaI", "20");
    setInputValue("heatFlowThetaE", "0");

    setInputValue("timeCaseId", "time-case-1");
    setInputValue("timeHtr", "10");
    setInputValue("timeThetaI", "20");
    setInputValue("timeThetaE", "0");
    setInputValue("timeDuration", "24");

    setInputValue("htr215Hd", "7");
    setInputValue("htr215Hg", "2");
    setInputValue("htr215Hu", "3");
    setInputValue("htr215Ha", "1");
    setInputValue("htr215Source", DEFAULT_SOURCE_REFERENCE);

    setInputValue("c2DirectElementId", "direct-wall-1");
    setInputValue("c2DirectLabel", "Direct wall");
    setInputValue("c2DirectArea", "10");
    setInputValue("c2DirectCorrectedU", "0.3");
    setInputValue("c2DirectSource", DEFAULT_SOURCE_REFERENCE);

    setInputValue("c2BridgeId", "bridge-1");
    setInputValue("c2BridgeLabel", "Linear bridge");
    setInputValue("c2BridgeLength", "5");
    setInputValue("c2BridgePsi", "0.1");
    setInputValue("c2BridgeSource", DEFAULT_SOURCE_REFERENCE);
    setCheckboxValue("c2ExplicitNoThermalBridges", false);

    setInputValue("c2Ground", "2");
    setInputValue("c2GroundSource", DEFAULT_SOURCE_REFERENCE);
    setInputValue("c2Hu", "3");
    setInputValue("c2HuSource", DEFAULT_SOURCE_REFERENCE);
    setInputValue("c2Ha", "1");
    setInputValue("c2HaSource", DEFAULT_SOURCE_REFERENCE);

    setInputValue("monthlyCaseId", "jan-heating");
    setInputValue("monthlyMonth", "january");
    setInputValue("monthlyCalculationMode", "heating");
    setInputValue("monthlyHtr", "9");
    setInputValue("monthlyThetaI", "20");
    setInputValue("monthlyThetaE", "0");
    setInputValue("monthlyDuration", "744");
    setInputValue("monthlySource", DEFAULT_SOURCE_REFERENCE);
    setCheckboxValue("monthlyUseC2Htr", false);

    setInputValue("ventilationCaseId", "jan-ventilation");
    setInputValue("ventilationMonth", "january");
    setInputValue("ventilationCalculationMode", "heating");
    setInputValue("ventilationAirHeatCapacity", "1200");
    setInputValue("ventilationAirHeatSource", DEFAULT_SOURCE_REFERENCE);
    setInputValue("ventilationComponentId", "infiltration-1");
    setInputValue("ventilationComponentLabel", "Infiltration");
    setInputValue("ventilationAirFlowRate", "0.05");
    setInputValue("ventilationTemperatureFactor", "1");
    setInputValue("ventilationDynamicFactor", "1");
    setInputValue("ventilationComponentSource", DEFAULT_SOURCE_REFERENCE);
    setInputValue("ventilationThetaI", "20");
    setInputValue("ventilationThetaE", "0");
    setInputValue("ventilationDuration", "744");
    setInputValue("ventilationCaseSource", DEFAULT_SOURCE_REFERENCE);

    setMessage(
      runMessage,
      "Exemplul sintetic smoke transmisie a fost completat. Verifica valorile si apasa Calculeaza Htr."
    );
  }

  function collectComponent(row, index) {
    const id = row.querySelector('[name="component_id"]')?.value.trim();
    const type = row.querySelector('[name="component_type"]')?.value;
    const label = row.querySelector('[name="label"]')?.value.trim();
    const area = finiteNumber(row.querySelector('[name="area_m2"]')?.value);
    const thermalTransmittance = finiteNumber(
      row.querySelector('[name="thermal_transmittance_w_m2k"]')?.value
    );
    const bztu = finiteNumber(row.querySelector('[name="bztu"]')?.value);
    const reference = row.querySelector('[name="source_reference"]')?.value.trim() ||
      DEFAULT_SOURCE_REFERENCE;

    if (!safeShortCode(id, 64)) {
      throw new Error(`Elementul ${index + 1}: component_id trebuie sa fie un cod scurt sigur.`);
    }
    if (!COMPONENT_TYPES.includes(type)) {
      throw new Error(`Elementul ${index + 1}: component_type trebuie ales din lista.`);
    }
    if (!safeLabel(label)) {
      throw new Error(`Elementul ${index + 1}: label este prea lung sau contine caractere nepermise.`);
    }
    if (area === null || area <= 0) {
      throw new Error(`Elementul ${index + 1}: area_m2 trebuie sa fie un numar pozitiv.`);
    }
    if (thermalTransmittance === null || thermalTransmittance <= 0) {
      throw new Error(`Elementul ${index + 1}: thermal_transmittance_w_m2k trebuie sa fie pozitiv.`);
    }
    if (bztu === null || bztu < 0 || bztu > 1) {
      throw new Error(`Elementul ${index + 1}: bztu trebuie sa fie intre 0 si 1.`);
    }
    if (!safeShortCode(reference, 80)) {
      throw new Error(`Elementul ${index + 1}: source.reference trebuie sa fie un cod scurt sigur.`);
    }

    return {
      component_id: id,
      component_type: type,
      label: label || null,
      area_m2: area,
      thermal_transmittance_w_m2k: thermalTransmittance,
      bztu,
      source: {
        source_type: "explicit_user_input",
        reference
      }
    };
  }

  function contribution(name, valueId, reference) {
    const amount = finiteNumber(document.getElementById(valueId)?.value);
    if (amount === null || amount < 0) {
      throw new Error(`${name} trebuie sa fie un numar finit pozitiv sau zero.`);
    }
    return {
      value: amount,
      source: {
        source_type: "explicit_user_input",
        reference
      }
    };
  }

  function explicitSource(referenceId, label) {
    const reference = inputValue(referenceId) || DEFAULT_SOURCE_REFERENCE;
    if (!safeShortCode(reference, 80)) {
      throw new Error(`${label}: source.reference trebuie sa fie un cod scurt sigur.`);
    }
    return {
      source_type: "explicit_user_input",
      reference
    };
  }

  function positiveNumber(id, label) {
    const value = finiteNumber(inputValue(id));
    if (value === null || value <= 0) {
      throw new Error(`${label} trebuie sa fie un numar pozitiv.`);
    }
    return value;
  }

  function nonNegativeNumber(id, label) {
    const value = finiteNumber(inputValue(id));
    if (value === null || value < 0) {
      throw new Error(`${label} trebuie sa fie un numar pozitiv sau zero.`);
    }
    return value;
  }

  function anyFiniteNumber(id, label) {
    const value = finiteNumber(inputValue(id));
    if (value === null) {
      throw new Error(`${label} trebuie sa fie un numar finit.`);
    }
    return value;
  }

  function collectTransmissionFormulaInputs() {
    const formulaInputs = {};

    if (hasAnyValue(["directElementId", "directLabel", "directArea", "directCorrectedU"])) {
      const elementId = inputValue("directElementId");
      const label = inputValue("directLabel");
      if (!safeShortCode(elementId, 64)) throw new Error("Hd direct: element_id este invalid.");
      if (!safeLabel(label)) throw new Error("Hd direct: label este invalid.");
      formulaInputs.direct_transmission_elements = [{
        element_id: elementId,
        label: label || null,
        area_m2: positiveNumber("directArea", "Hd direct: area_m2"),
        corrected_u_w_m2k: positiveNumber("directCorrectedU", "Hd direct: corrected_u_w_m2k"),
        source: explicitSource("directSource", "Hd direct")
      }];
    }

    if (hasAnyValue(["bridgeId", "bridgeLabel", "bridgeLength", "bridgePsi"])) {
      const bridgeId = inputValue("bridgeId");
      const label = inputValue("bridgeLabel");
      if (!safeShortCode(bridgeId, 64)) throw new Error("Punte termica: bridge_id este invalid.");
      if (!safeLabel(label)) throw new Error("Punte termica: label este invalid.");
      formulaInputs.linear_thermal_bridges = [{
        bridge_id: bridgeId,
        label: label || null,
        length_m: nonNegativeNumber("bridgeLength", "Punte termica: length_m"),
        psi_w_mk: anyFiniteNumber("bridgePsi", "Punte termica: psi_w_mk"),
        source: explicitSource("bridgeSource", "Punte termica")
      }];
    }

    if (hasAnyValue(["psiCaseId", "psiLength", "psiL2d", "psiRefElementId", "psiRefArea", "psiRefU"])) {
      const caseId = inputValue("psiCaseId");
      const refId = inputValue("psiRefElementId");
      if (!safeShortCode(caseId, 64)) throw new Error("Calcul Psi: case_id este invalid.");
      if (!safeShortCode(refId, 64)) throw new Error("Calcul Psi: reference element_id este invalid.");
      formulaInputs.psi_calculation_cases = [{
        case_id: caseId,
        length_m: positiveNumber("psiLength", "Calcul Psi: length_m"),
        l2d_w_k: nonNegativeNumber("psiL2d", "Calcul Psi: l2d_w_k"),
        reference_elements: [{
          element_id: refId,
          area_m2: positiveNumber("psiRefArea", "Calcul Psi: reference area_m2"),
          u_w_m2k: positiveNumber("psiRefU", "Calcul Psi: reference u_w_m2k")
        }],
        source: explicitSource("psiSource", "Calcul Psi")
      }];
    }

    if (hasAnyValue(["heatFlowCaseId", "heatFlowHtr", "heatFlowThetaI", "heatFlowThetaE"])) {
      const caseId = inputValue("heatFlowCaseId");
      if (!safeShortCode(caseId, 64)) throw new Error("Flux transmisie: case_id este invalid.");
      formulaInputs.heat_flow_cases = [{
        case_id: caseId,
        htr_w_k: nonNegativeNumber("heatFlowHtr", "Flux transmisie: htr_w_k"),
        theta_i_c: anyFiniteNumber("heatFlowThetaI", "Flux transmisie: theta_i_c"),
        theta_e_c: anyFiniteNumber("heatFlowThetaE", "Flux transmisie: theta_e_c")
      }];
    }

    if (hasAnyValue(["timeCaseId", "timeHtr", "timeThetaI", "timeThetaE", "timeDuration"])) {
      const caseId = inputValue("timeCaseId");
      if (!safeShortCode(caseId, 64)) throw new Error("Energie transmisie: case_id este invalid.");
      formulaInputs.time_integrated_transmission_cases = [{
        case_id: caseId,
        htr_w_k: nonNegativeNumber("timeHtr", "Energie transmisie: htr_w_k"),
        theta_i_c: anyFiniteNumber("timeThetaI", "Energie transmisie: theta_i_c"),
        theta_e_c: anyFiniteNumber("timeThetaE", "Energie transmisie: theta_e_c"),
        duration_h: positiveNumber("timeDuration", "Energie transmisie: duration_h")
      }];
    }

    if (hasAnyValue(["htr215Hd", "htr215Hg", "htr215Hu", "htr215Ha"])) {
      formulaInputs.htr_total_2_15_case = {
        hd_w_k: nonNegativeNumber("htr215Hd", "Htr 2.15: hd_w_k"),
        hg_w_k: nonNegativeNumber("htr215Hg", "Htr 2.15: hg_w_k"),
        hu_w_k: nonNegativeNumber("htr215Hu", "Htr 2.15: hu_w_k"),
        ha_w_k: nonNegativeNumber("htr215Ha", "Htr 2.15: ha_w_k"),
        source: explicitSource("htr215Source", "Htr 2.15")
      };
    }

    return Object.keys(formulaInputs).length ? formulaInputs : null;
  }

  function collectIntegratedTransmissionInput() {
    const hasDirect = hasAnyValue([
      "c2DirectElementId",
      "c2DirectLabel",
      "c2DirectArea",
      "c2DirectCorrectedU"
    ]);
    const hasBridge = hasAnyValue([
      "c2BridgeId",
      "c2BridgeLabel",
      "c2BridgeLength",
      "c2BridgePsi"
    ]);
    const explicitNoThermalBridges = isChecked("c2ExplicitNoThermalBridges");
    const hasComponents = hasAnyValue(["c2Ground", "c2Hu", "c2Ha"]);
    if (!hasDirect && !hasBridge && !explicitNoThermalBridges && !hasComponents) {
      return null;
    }
    if (!hasDirect) {
      throw new Error("C2: completeaza elementul Hd direct.");
    }
    if (hasBridge && explicitNoThermalBridges) {
      throw new Error("C2: alege fie punte termica explicita, fie fara punti termice.");
    }
    if (!hasBridge && !explicitNoThermalBridges) {
      throw new Error("C2: adauga o punte termica sau bifeaza fara punti termice.");
    }

    const elementId = inputValue("c2DirectElementId");
    const label = inputValue("c2DirectLabel");
    if (!safeShortCode(elementId, 64)) throw new Error("C2 Hd: element_id este invalid.");
    if (!safeLabel(label)) throw new Error("C2 Hd: label este invalid.");

    const linearThermalBridges = [];
    if (hasBridge) {
      const bridgeId = inputValue("c2BridgeId");
      const bridgeLabel = inputValue("c2BridgeLabel");
      if (!safeShortCode(bridgeId, 64)) throw new Error("C2 punte: bridge_id este invalid.");
      if (!safeLabel(bridgeLabel)) throw new Error("C2 punte: label este invalid.");
      linearThermalBridges.push({
        bridge_id: bridgeId,
        label: bridgeLabel || null,
        length_m: nonNegativeNumber("c2BridgeLength", "C2 punte: length_m"),
        psi_w_mk: anyFiniteNumber("c2BridgePsi", "C2 punte: psi_w_mk"),
        source: explicitSource("c2BridgeSource", "C2 punte")
      });
    }

    return {
      mode: "explicit_input_integrated_transmission_v1",
      direct_transmission_elements: [{
        element_id: elementId,
        label: label || null,
        area_m2: positiveNumber("c2DirectArea", "C2 Hd: area_m2"),
        corrected_u_w_m2k: positiveNumber("c2DirectCorrectedU", "C2 Hd: corrected_u_w_m2k"),
        source: explicitSource("c2DirectSource", "C2 Hd")
      }],
      linear_thermal_bridges: linearThermalBridges,
      explicit_no_thermal_bridges: explicitNoThermalBridges,
      ground_w_k: {
        value: nonNegativeNumber("c2Ground", "C2 ground_w_k"),
        source: explicitSource("c2GroundSource", "C2 ground")
      },
      hu_w_k: {
        value: nonNegativeNumber("c2Hu", "C2 hu_w_k"),
        source: explicitSource("c2HuSource", "C2 Hu")
      },
      ha_w_k: {
        value: nonNegativeNumber("c2Ha", "C2 ha_w_k"),
        source: explicitSource("c2HaSource", "C2 Ha")
      }
    };
  }

  function collectMonthlyTransmissionEnergyInput() {
    const hasMonthly = hasAnyValue([
      "monthlyCaseId",
      "monthlyMonth",
      "monthlyCalculationMode",
      "monthlyHtr",
      "monthlyThetaI",
      "monthlyThetaE",
      "monthlyDuration"
    ]) || isChecked("monthlyUseC2Htr");
    if (!hasMonthly) return null;

    const caseId = inputValue("monthlyCaseId");
    const month = inputValue("monthlyMonth");
    const calculationMode = inputValue("monthlyCalculationMode");
    if (!safeShortCode(caseId, 64)) throw new Error("C3 lunar: case_id este invalid.");
    if (!MONTHS.includes(month)) throw new Error("C3 lunar: month trebuie ales din lista.");
    if (!MONTHLY_CALCULATION_MODES.includes(calculationMode)) {
      throw new Error("C3 lunar: calculation_mode trebuie ales din lista.");
    }
    const useIntegratedHtr = isChecked("monthlyUseC2Htr");
    const htrValue = finiteNumber(inputValue("monthlyHtr"));
    if (!useIntegratedHtr && (htrValue === null || htrValue < 0)) {
      throw new Error("C3 lunar: htr_w_k trebuie sa fie finit si pozitiv sau zero.");
    }
    const monthlyCase = {
      case_id: caseId,
      month,
      calculation_mode: calculationMode,
      theta_i_c: anyFiniteNumber("monthlyThetaI", "C3 lunar: theta_i_c"),
      theta_e_c: anyFiniteNumber("monthlyThetaE", "C3 lunar: theta_e_c"),
      duration_h: positiveNumber("monthlyDuration", "C3 lunar: duration_h"),
      source: explicitSource("monthlySource", "C3 lunar")
    };
    if (htrValue !== null) {
      if (htrValue < 0) throw new Error("C3 lunar: htr_w_k trebuie sa fie pozitiv sau zero.");
      monthlyCase.htr_w_k = htrValue;
    }

    return {
      mode: "explicit_monthly_transmission_energy_v1",
      ...(useIntegratedHtr ? { htr_source: "integrated_htr_2_15" } : {}),
      cases: [monthlyCase]
    };
  }

  function collectVentilationTransferInput() {
    const hasVentilation = hasAnyValue([
      "ventilationCaseId",
      "ventilationMonth",
      "ventilationCalculationMode",
      "ventilationAirHeatCapacity",
      "ventilationComponentId",
      "ventilationComponentLabel",
      "ventilationAirFlowRate",
      "ventilationTemperatureFactor",
      "ventilationDynamicFactor",
      "ventilationThetaI",
      "ventilationThetaE",
      "ventilationDuration"
    ]);
    if (!hasVentilation) return null;

    const caseId = inputValue("ventilationCaseId");
    const month = inputValue("ventilationMonth");
    const calculationMode = inputValue("ventilationCalculationMode");
    const componentId = inputValue("ventilationComponentId");
    const label = inputValue("ventilationComponentLabel");
    if (!safeShortCode(caseId, 64)) throw new Error("C4 ventilare: case_id este invalid.");
    if (!MONTHS.includes(month)) throw new Error("C4 ventilare: month trebuie ales din lista.");
    if (!MONTHLY_CALCULATION_MODES.includes(calculationMode)) {
      throw new Error("C4 ventilare: calculation_mode trebuie ales din lista.");
    }
    if (!safeShortCode(componentId, 64)) {
      throw new Error("C4 ventilare: component_id este invalid.");
    }
    if (!safeLabel(label)) throw new Error("C4 ventilare: label este invalid.");

    return {
      mode: "explicit_monthly_ventilation_transfer_v1",
      cases: [{
        case_id: caseId,
        month,
        calculation_mode: calculationMode,
        air_heat_capacity_j_m3k: {
          value: positiveNumber("ventilationAirHeatCapacity", "C4 ventilare: air_heat_capacity_j_m3k"),
          source: explicitSource("ventilationAirHeatSource", "C4 ventilare aer")
        },
        components: [{
          component_id: componentId,
          label: label || null,
          air_flow_rate_m3_s: nonNegativeNumber("ventilationAirFlowRate", "C4 ventilare: air_flow_rate_m3_s"),
          temperature_correction_factor: nonNegativeNumber(
            "ventilationTemperatureFactor",
            "C4 ventilare: temperature_correction_factor"
          ),
          dynamic_correction_factor: nonNegativeNumber(
            "ventilationDynamicFactor",
            "C4 ventilare: dynamic_correction_factor"
          ),
          source: explicitSource("ventilationComponentSource", "C4 ventilare componenta")
        }],
        theta_i_c: anyFiniteNumber("ventilationThetaI", "C4 ventilare: theta_i_c"),
        theta_e_c: anyFiniteNumber("ventilationThetaE", "C4 ventilare: theta_e_c"),
        duration_h: positiveNumber("ventilationDuration", "C4 ventilare: duration_h"),
        source: explicitSource("ventilationCaseSource", "C4 ventilare caz")
      }]
    };
  }

  function buildRunPayload() {
    const rows = [...componentRows.querySelectorAll("[data-component-row]")];
    if (!rows.length) throw new Error("Adauga cel putin un element de anvelopa.");

    const houseIdRaw = document.getElementById("houseId")?.value.trim();
    let houseId = null;
    if (houseIdRaw) {
      const parsed = Number(houseIdRaw);
      if (!Number.isInteger(parsed) || parsed <= 0) {
        throw new Error("house_id trebuie sa fie gol sau un numar intreg pozitiv.");
      }
      houseId = parsed;
    }

    const label = document.getElementById("analysisLabel")?.value.trim() || null;
    if (!safeLabel(label)) throw new Error("Eticheta analizei este prea lunga sau contine caractere nepermise.");

    const nonHuReference = document.getElementById("nonHuSource")?.value.trim() ||
      DEFAULT_SOURCE_REFERENCE;
    if (!safeShortCode(nonHuReference, 80)) {
      throw new Error("Referinta sursei non-Hu trebuie sa fie un cod scurt sigur.");
    }

    const htrInput = {
      envelope_components: rows.map(collectComponent),
      non_hu_contributions: {
        thermal_bridge_w_k: contribution("thermal_bridge_w_k", "thermalBridgeValue", nonHuReference),
        ground_w_k: contribution("ground_w_k", "groundValue", nonHuReference),
        adjacent_space_w_k: contribution("adjacent_space_w_k", "adjacentValue", nonHuReference)
      }
    };
    const transmissionFormulaInputs = collectTransmissionFormulaInputs();
    if (transmissionFormulaInputs) {
      htrInput.transmission_formula_inputs = transmissionFormulaInputs;
    }
    const integratedTransmissionInput = collectIntegratedTransmissionInput();
    if (integratedTransmissionInput) {
      htrInput.integrated_transmission_input = integratedTransmissionInput;
    }
    const monthlyTransmissionEnergyInput = collectMonthlyTransmissionEnergyInput();
    if (monthlyTransmissionEnergyInput) {
      htrInput.monthly_transmission_energy_input = monthlyTransmissionEnergyInput;
    }
    const ventilationTransferInput = collectVentilationTransferInput();
    if (ventilationTransferInput) {
      htrInput.ventilation_transfer_input = ventilationTransferInput;
    }

    return {
      house_id: houseId,
      label,
      htr_input: htrInput
    };
  }

  function renderSavedInput(input) {
    const panel = document.getElementById("savedInputPanel");
    const list = clearList("savedInputSummary");
    if (!panel || !list || !input) return;
    panel.hidden = false;
    const components = input.envelope_components || [];
    components.forEach(component => {
      appendArticle(
        list,
        component.component_id,
        `${component.component_type}: A=${component.area_m2} m2, U=${component.thermal_transmittance_w_m2k} W/m2K, bztu=${component.bztu}`,
        component.label || ""
      );
    });
    const nonHu = input.non_hu_contributions || {};
    Object.entries(nonHu).forEach(([key, value]) => {
      appendArticle(list, key, `${value?.value ?? "--"} W/K`, "input non-Hu explicit");
    });
    const formulaInputs = input.transmission_formula_inputs || {};
    if (formulaInputs.direct_transmission_elements?.length) {
      appendArticle(list, "Hd direct 2.12", `${formulaInputs.direct_transmission_elements.length} element explicit`);
    }
    if (formulaInputs.linear_thermal_bridges?.length) {
      appendArticle(list, "Punti 2.28", `${formulaInputs.linear_thermal_bridges.length} punte explicite`);
    }
    if (formulaInputs.psi_calculation_cases?.length) {
      appendArticle(list, "Psi 2.13", `${formulaInputs.psi_calculation_cases.length} caz explicit`);
    }
    if (formulaInputs.heat_flow_cases?.length) {
      appendArticle(list, "Flux 2.14", `${formulaInputs.heat_flow_cases.length} caz explicit`);
    }
    if (formulaInputs.time_integrated_transmission_cases?.length) {
      appendArticle(list, "Integrare 2.14", `${formulaInputs.time_integrated_transmission_cases.length} caz explicit`);
    }
    if (formulaInputs.htr_total_2_15_case) {
      appendArticle(list, "Htr 2.15", "Componente explicite Hd/Hg/Hu/Ha");
    }
    const c2Input = input.integrated_transmission_input;
    if (c2Input) {
      appendArticle(
        list,
        "C2 transmisie integrata",
        `Hd=${c2Input.direct_transmission_elements?.length || 0} element, punti=${c2Input.linear_thermal_bridges?.length || 0}, fara punti=${c2Input.explicit_no_thermal_bridges === true}`,
        "input explicit pentru rezultat integrat"
      );
    }
    const c3Input = input.monthly_transmission_energy_input;
    if (c3Input) {
      appendArticle(
        list,
        "C3 energie transmisie lunara",
        `${c3Input.cases?.length || 0} caz explicit`,
        c3Input.htr_source ? `htr_source=${c3Input.htr_source}` : "htr_w_k explicit"
      );
    }
    const c4Input = input.ventilation_transfer_input;
    if (c4Input) {
      appendArticle(
        list,
        "C4 ventilare explicita",
        `${c4Input.cases?.length || 0} caz explicit`,
        "debit, temperatura si durata explicite"
      );
    }
  }

  function renderFormulaResult(list, title, result, meta = "") {
    if (!result) return;
    appendArticle(
      list,
      title,
      `${result.result?.symbol || "--"} = ${result.result?.amount ?? "--"} ${result.result?.unit || ""}`,
      `${result.formulaCode || ""} ${result.relationCode ? `relatia ${result.relationCode}` : ""} ${meta}`.trim()
    );
  }

  function renderIntegratedTransmissionResult(list, integrated) {
    if (!integrated) {
      appendArticle(
        list,
        "Fara rezultat integrat C2",
        "Nu a fost transmis input explicit pentru compozitia integrata C2."
      );
      return;
    }
    renderFormulaResult(list, "C2 Hd", integrated.results?.hd);
    renderFormulaResult(list, "C2 Htr,tb", integrated.results?.thermalBridgeGlobal);
    renderFormulaResult(
      list,
      "C2 transmisie fara sol",
      integrated.results?.transmissionExcludingGround
    );
    renderFormulaResult(list, "C2 Htr 2.15", integrated.results?.htrTotal215);
    (integrated.diagnostics?.warnings || []).forEach(code => {
      appendArticle(list, "Avertisment C2", code, "diagnostic");
    });
    (integrated.diagnostics?.methodologyLimits || []).forEach(code => {
      appendArticle(list, "Limita metodologica C2", code, "explicit-input only");
    });
  }

  function renderMonthlyTransmissionResult(list, monthly) {
    if (!monthly) {
      appendArticle(
        list,
        "Fara rezultat C3",
        "Nu a fost transmis input explicit pentru energia lunara de transmisie."
      );
      return;
    }
    (monthly.caseResults || []).forEach(item => {
      appendArticle(
        list,
        `C3 ${item.caseId || item.month || "caz"}`,
        `Phi=${item.heatFlow?.amount ?? "--"} ${item.heatFlow?.unit || "W"}; Q=${item.transmissionEnergy?.amount ?? "--"} ${item.transmissionEnergy?.unit || "kWh"}`,
        `${item.month || ""} ${item.calculationMode || ""}`.trim()
      );
    });
    const summary = monthly.summary || {};
    appendArticle(
      list,
      "C3 anual semnat",
      `${summary.annualSignedTransmissionEnergy?.amount ?? "--"} ${summary.annualSignedTransmissionEnergy?.unit || "kWh"}`,
      `caseCount=${summary.caseCount ?? "--"}`
    );
    appendArticle(
      list,
      "C3 incalzire pozitiva",
      `${summary.annualPositiveHeatingTransmissionEnergy?.amount ?? "--"} ${summary.annualPositiveHeatingTransmissionEnergy?.unit || "kWh"}`
    );
    appendArticle(
      list,
      "C3 directie racire",
      `${summary.annualCoolingDirectionTransmissionEnergy?.amount ?? "--"} ${summary.annualCoolingDirectionTransmissionEnergy?.unit || "kWh"}`
    );
    (monthly.diagnostics?.methodologyLimits || []).forEach(code => {
      appendArticle(list, "Limita metodologica C3", code, "explicit-input only");
    });
  }

  function renderVentilationTransferResult(list, ventilation) {
    if (!ventilation) {
      appendArticle(
        list,
        "Fara rezultat C4",
        "Nu a fost transmis input explicit pentru transferul prin ventilare."
      );
      return;
    }
    (ventilation.caseResults || []).forEach(item => {
      appendArticle(
        list,
        `C4 ${item.caseId || item.month || "caz"}`,
        `Hve=${item.ventilationHeatTransferCoefficient?.amount ?? "--"} ${item.ventilationHeatTransferCoefficient?.unit || "W/K"}; Phi=${item.heatFlow?.amount ?? "--"} ${item.heatFlow?.unit || "W"}; Q=${item.ventilationEnergy?.amount ?? "--"} ${item.ventilationEnergy?.unit || "kWh"}`,
        `${item.month || ""} ${item.calculationMode || ""}`.trim()
      );
    });
    const summary = ventilation.summary || {};
    appendArticle(
      list,
      "C4 anual semnat",
      `${summary.annualSignedVentilationEnergy?.amount ?? "--"} ${summary.annualSignedVentilationEnergy?.unit || "kWh"}`,
      `caseCount=${summary.caseCount ?? "--"}`
    );
    appendArticle(
      list,
      "C4 incalzire pozitiva",
      `${summary.annualPositiveHeatingVentilationEnergy?.amount ?? "--"} ${summary.annualPositiveHeatingVentilationEnergy?.unit || "kWh"}`
    );
    appendArticle(
      list,
      "C4 directie racire",
      `${summary.annualCoolingDirectionVentilationEnergy?.amount ?? "--"} ${summary.annualCoolingDirectionVentilationEnergy?.unit || "kWh"}`
    );
    (ventilation.diagnostics?.methodologyLimits || []).forEach(code => {
      appendArticle(list, "Limita metodologica C4", code, "explicit-input only");
    });
  }

  function renderExplicitHeatTransferSummary(list, summary) {
    if (!summary) {
      appendArticle(
        list,
        "Fara sumar combinat",
        "Sumarul apare numai cand C3 transmisie si C4 ventilare sunt ambele calculate explicit."
      );
      return;
    }
    appendArticle(
      list,
      "Transmisie explicita",
      `${summary.transmissionEnergyKWh?.amount ?? "--"} ${summary.transmissionEnergyKWh?.unit || "kWh"}`,
      "C3, semnat"
    );
    appendArticle(
      list,
      "Ventilare explicita",
      `${summary.ventilationEnergyKWh?.amount ?? "--"} ${summary.ventilationEnergyKWh?.unit || "kWh"}`,
      "C4, semnat"
    );
    appendArticle(
      list,
      "Transmisie + ventilare",
      `${summary.combinedTransmissionAndVentilationKWh?.amount ?? "--"} ${summary.combinedTransmissionAndVentilationKWh?.unit || "kWh"}`,
      summary.scope || "explicit only, not QHnd"
    );
    (summary.diagnostics?.methodologyLimits || []).forEach(code => {
      appendArticle(list, "Limita sumar explicit", code, "not QHnd");
    });
  }

  function renderExplicitTotalHeatTransferResult(list, total) {
    if (!total) {
      appendArticle(
        list,
        "Fara rezultat C5",
        "Rezultatul C5 apare numai cand C3 transmisie si C4 ventilare sunt ambele calculate explicit."
      );
      return;
    }
    appendArticle(
      list,
      "Transmisie explicita",
      `${total.components?.transmissionEnergy?.amount ?? "--"} ${total.components?.transmissionEnergy?.unit || "kWh"}`,
      "C3, semnat"
    );
    appendArticle(
      list,
      "Ventilare explicita",
      `${total.components?.ventilationEnergy?.amount ?? "--"} ${total.components?.ventilationEnergy?.unit || "kWh"}`,
      "C4, semnat"
    );
    appendArticle(
      list,
      total.result?.symbol || "Q_total_transfer_explicit",
      `${total.result?.amount ?? "--"} ${total.result?.unit || "kWh"}`,
      total.scope || "not QHnd"
    );
    (total.diagnostics?.warnings || []).forEach(warning => {
      appendArticle(list, "Avertisment C5", warning.code || warning, warning.severity || "warning");
    });
    (total.diagnostics?.methodologyLimits || []).forEach(code => {
      appendArticle(list, "Limita metodologica C5", code, "not QHnd");
    });
  }

  function renderResult(payload) {
    const panel = document.getElementById("resultPanel");
    const result = payload?.mc001_htr || {};
    panel.hidden = false;

    setText("resultStatus", result.status || "blocked");
    setText(
      "resultTotal",
      result.htrTotalResult
        ? `${result.htrTotalResult.amount} ${result.htrTotalResult.unit}`
        : "--"
    );
    setText("resultAnalysisId", payload?.analysis_id ?? "--");
    setText("resultHouseId", payload?.house_id ?? "--");
    setText("resultScope", result.scope || HTR_SCOPE);

    const terms = clearList("termsList");
    (result.calculationTerms || []).forEach(term => {
      appendArticle(
        terms,
        term.contributionType,
        `${term.contributionValue?.amount ?? "--"} ${term.contributionValue?.unit || "W/K"}`,
        term.termStatus || ""
      );
    });
    if (terms && !terms.children.length) {
      appendArticle(terms, "Fara termeni publici", "Rezultatul este blocat sau API-ul nu a returnat termeni.");
    }

    const formulaResults = clearList("formulaResultsList");
    const c1 = result.transmissionFormulaResults || {};
    renderFormulaResult(formulaResults, "Hd direct", c1.directTransmission);
    renderFormulaResult(formulaResults, "Punti termice globale", c1.thermalBridgeGlobal);
    renderFormulaResult(formulaResults, "Transmisie globala fara sol", c1.globalTransmissionExcludingGround);
    (c1.psiCases || []).forEach(item => renderFormulaResult(formulaResults, `Psi ${item.caseId || ""}`, item));
    (c1.heatFlowCases || []).forEach(item => renderFormulaResult(formulaResults, `Flux ${item.caseId || ""}`, item));
    (c1.timeIntegratedTransmissionCases || []).forEach(item => {
      renderFormulaResult(formulaResults, `Energie transmisie ${item.caseId || ""}`, item, item.scope || "");
    });
    renderFormulaResult(formulaResults, "Htr total 2.15", c1.htrTotalRelation215);
    if (formulaResults && !formulaResults.children.length) {
      appendArticle(
        formulaResults,
        "Fara formule avansate",
        "Nu au fost transmise inputuri explicite pentru calculele C1."
      );
    }

    const integratedResults = clearList("integratedResultsList");
    renderIntegratedTransmissionResult(integratedResults, result.integratedTransmissionResult);

    const monthlyResults = clearList("monthlyTransmissionResultsList");
    renderMonthlyTransmissionResult(monthlyResults, result.monthlyTransmissionEnergyResult);

    const ventilationResults = clearList("ventilationResultsList");
    renderVentilationTransferResult(ventilationResults, result.ventilationTransferResult);

    const explicitSummary = clearList("explicitHeatTransferSummaryList");
    renderExplicitHeatTransferSummary(explicitSummary, result.explicitHeatTransferSummary);

    const explicitTotal = clearList("explicitTotalHeatTransferList");
    renderExplicitTotalHeatTransferResult(explicitTotal, result.explicitTotalHeatTransferResult);

    const diagnostics = clearList("diagnosticsList");
    (result.diagnostics?.blockers || []).forEach(blocker => {
      appendArticle(diagnostics, blocker.code, "Blocaj Htr", blocker.severity);
    });
    (result.diagnostics?.missingForNextMethodologyScope || []).forEach(item => {
      const code = typeof item === "string" ? item : item.code;
      const severity = typeof item === "string" ? "blocking" : item.severity;
      appendArticle(diagnostics, code, "Domeniu metodologic neimplementat in acest MVP.", severity);
    });
    if (diagnostics && !diagnostics.children.length) {
      appendArticle(diagnostics, "Fara blocaje", "Htr a fost calculat pentru inputul transmis.");
    }

    const registry = clearList("registryList");
    (result.registryReferences?.sourcePackCodes || []).forEach(code => {
      appendArticle(registry, code, "Source pack MC001 folosit doar ca metadata.");
    });
    (result.registryReferences?.formulaCodes || []).forEach(code => {
      appendArticle(registry, code, "Formula MC001 referita ca metadata.");
    });
  }

  async function runHtr(event) {
    event.preventDefault();
    setMessage(runMessage, "Se calculeaza Htr...");
    try {
      const payload = buildRunPayload();
      const result = await window.LaCurentAuth.api("/api/mc001/htr/run", payload);
      document.getElementById("savedInputPanel").hidden = true;
      renderResult(result);
      setMessage(runMessage, "Analiza Htr a fost salvata.");
    } catch (error) {
      setMessage(runMessage, error.message || "Nu am putut rula Htr.", true);
    }
  }

  async function loadHtr(event) {
    event.preventDefault();
    setMessage(loadMessage, "Se incarca analiza...");
    try {
      const analysisId = finiteNumber(document.getElementById("analysisId")?.value);
      if (!Number.isInteger(analysisId) || analysisId <= 0) {
        throw new Error("analysis_id este obligatoriu si trebuie sa fie pozitiv.");
      }
      const result = await window.LaCurentAuth.api("/api/mc001/htr/load", {
        analysis_id: analysisId
      });
      renderSavedInput(result.htr_input);
      renderResult(result);
      setMessage(loadMessage, "Analiza salvata a fost incarcata.");
    } catch (error) {
      setMessage(loadMessage, error.message || "Nu am putut incarca analiza Htr.", true);
    }
  }

  function prefillHouseId() {
    const params = new URLSearchParams(window.location.search);
    const queryHouseId = params.get("house_id");
    const activeHouseId = window.LaCurentHomes?.activeHouseId?.();
    const value = queryHouseId || activeHouseId || "";
    if (value) document.getElementById("houseId").value = value;
  }

  function boot() {
    const isAuthenticated = Boolean(window.LaCurentAuth?.currentUser?.());
    authRequired.hidden = isAuthenticated;
    workspace.hidden = !isAuthenticated;
    if (!isAuthenticated) return;
    prefillHouseId();
    addComponentRow();
  }

  addComponentBtn?.addEventListener("click", addComponentRow);
  componentRows?.addEventListener("click", event => {
    const button = event.target.closest("[data-remove-component]");
    if (!button) return;
    const rows = componentRows.querySelectorAll("[data-component-row]");
    if (rows.length <= 1) return;
    button.closest("[data-component-row]")?.remove();
    refreshComponentRows();
  });
  smokePresetBtn?.addEventListener("click", applyC2SmokePreset);
  runForm?.addEventListener("submit", runHtr);
  loadForm?.addEventListener("submit", loadHtr);

  boot();
});
