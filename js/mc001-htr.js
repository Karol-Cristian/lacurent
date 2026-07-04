document.addEventListener("DOMContentLoaded", () => {
  const COMPONENT_TYPES = [
    "external_wall",
    "roof",
    "floor",
    "window",
    "door",
    "other_envelope_component"
  ];

  const DEFAULT_SOURCE_REFERENCE = "manual_mvp_input";
  const HTR_SCOPE = "htr_transmission_only_not_full_mc001_certificate";

  const authRequired = document.getElementById("authRequired");
  const workspace = document.getElementById("htrWorkspace");
  const componentRows = document.getElementById("componentRows");
  const addComponentBtn = document.getElementById("addComponentBtn");
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

  function setText(id, value) {
    const element = document.getElementById(id);
    if (element) element.textContent = value ?? "--";
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

    const diagnostics = clearList("diagnosticsList");
    (result.diagnostics?.blockers || []).forEach(blocker => {
      appendArticle(diagnostics, blocker.code, "Blocaj Htr", blocker.severity);
    });
    (result.diagnostics?.missingForNextMethodologyScope || []).forEach(item => {
      appendArticle(diagnostics, item.code, "Domeniu metodologic neimplementat in acest MVP.", item.severity);
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
  runForm?.addEventListener("submit", runHtr);
  loadForm?.addEventListener("submit", loadHtr);

  boot();
});
