(() => {
  const root = document.querySelector("[data-editorial-lab]");
  const form = document.getElementById("edForm");
  if (!root || !form) return;

  const $ = selector => document.querySelector(selector);
  const EDITORIAL_DRAFT_VERSION = 2;
  const CALCULATION_MODEL_VERSION = "rbpe-editorial-2026-09-29.1";
  const storageKey = `lacurent-home-lab-editorial-v2:${root.dataset.partnerId || "official"}`;
  const storageHistoryKey = `${storageKey}:history`;
  const legacyStorageKey = `lacurent-home-lab-editorial-v1:${root.dataset.partnerId || "official"}`;
  const legacyStorageHistoryKey = `${legacyStorageKey}:history`;
  const classicStorageKey = `lacurent-home-lab-next-v1:${root.dataset.partnerId || "official"}`;
  const impactProjectStorageKey = `${storageKey}:impact-project-id`;
  const authTokenStorageKey = "lacurent_auth_token";
  const accountProjectStorageKey = `${storageKey}:account-project-id`;
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
  const baselineHeatingDemand = $("#edBaselineHeatingDemand");
  const baselineCoolingDemand = $("#edBaselineCoolingDemand");
  const baselineFinalEnergy = $("#edBaselineFinalEnergy");
  const baselinePrimaryEnergy = $("#edBaselinePrimaryEnergy");
  const baselineStatus = $("#edBaselineStatus");
  const priceDialog = $("#priceDialog");
  const priceReferenceOpen = $("#edPriceReferencesOpen");
  const priceReferenceGrid = $("#edPriceReferenceGrid");
  const priceReferenceBody = $("#edPriceReferenceBody");
  const costEnergySummary = $("#edCostEnergySummary");
  const priceRetrievedOn = $("#edPriceRetrievedOn");
  const priceReferenceFallbackHtml = priceReferenceGrid?.innerHTML || "";
  const priceReferenceFallbackIntro = priceReferenceBody?.querySelector(".ed-price-reference-intro")?.textContent || "";
  const classDialog = $("#classDialog");
  const classReferenceOpen = $("#edClassReferenceOpen");
  const classReferenceBody = $("#edClassReferenceBody");
  const accountDialog = $("#edAccountDialog");
  const accountOpen = $("#edAccountOpen");
  const accountQuickSave = $("#edProjectQuickSave");
  const accountSignedOut = $("#edAccountSignedOut");
  const accountSignedIn = $("#edAccountSignedIn");
  const accountSignedOutState = $("#edAccountSignedOutState");
  const projectSaveState = $("#edProjectSaveState");
  const projectsList = $("#edProjectsList");
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
  const DEFAULT_INFILTRATION_ACH = 0.15;

  // Temporary Cloudflare low-resource profile. Deep TEO search remains in the
  // browser; only canonical Python passes are capped. TEO itself uses:
  // 1 BASELINE + 1 PLAN kernel baseline + VERIFY. PRODUCT is a later workflow.
  // Raise maxCanonicalPasses later when the execution environment has more headroom.
  const TEO_SERVER_PROFILE = Object.freeze({
    name:"cloudflare-adaptive-flow",
    maxCanonicalPasses:5,
    minVerifyPasses:1,
    maxVerifyPasses:3,
    maxProductPasses:0,
    heavyRetries:2,
    cooldownMs:1800,
    flowPollMs:450,
  });

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
  let baselineInputFingerprint = "";
  let teoInputFingerprint = "";
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
  let draftDirty = false;
  let suppressLocalAutosave = false;
  let volatileImpactProjectId = "";
  let currentProjectId = "";
  let accountUser = null;
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
      return field.id === "localityId" || field.name === "_optimization_mode" || field.name === "_nzeb_constraint";
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
      version:EDITORIAL_DRAFT_VERSION,
      calculationModelVersion:CALCULATION_MODEL_VERSION,
      fields,
      savedAt:new Date().toISOString(),
    };
  }

  function draftHasFields(draft) {
    return Boolean(
      draft
      && draft.fields
      && typeof draft.fields === "object"
      && Object.keys(draft.fields).length >= 5
    );
  }

  function draftLooksUsable(draft) {
    return Boolean(
      draftHasFields(draft)
      && draft.version === EDITORIAL_DRAFT_VERSION
      && draft.calculationModelVersion === CALCULATION_MODEL_VERSION
    );
  }

  function readDraftHistory() {
    try {
      const parsed = JSON.parse(localStorage.getItem(storageHistoryKey) || "[]");
      return Array.isArray(parsed) ? parsed.filter(draftLooksUsable) : [];
    } catch (_) {
      return [];
    }
  }

  function writeDraftHistory(entries) {
    try {
      localStorage.setItem(storageHistoryKey, JSON.stringify(entries.slice(-8)));
      return true;
    } catch (_) {
      return false;
    }
  }

  function preserveDraftInHistory(draft) {
    if (!draftLooksUsable(draft)) return;
    const history = readDraftHistory();
    const serialized = JSON.stringify(draft);
    if (!history.some(item => JSON.stringify(item) === serialized)) {
      history.push(draft);
      writeDraftHistory(history);
    }
  }

  function markDraftDirty() {
    draftDirty = true;
  }

  function persistEditorialDraft({force = false} = {}) {
    if (suppressLocalAutosave || !localAutosaveAllowed()) return false;
    if (!force && !draftDirty) return false;
    try {
      const current = JSON.parse(localStorage.getItem(storageKey) || "null");
      preserveDraftInHistory(current);
      const next = editorialDraftSnapshot();
      localStorage.setItem(storageKey, JSON.stringify(next));
      preserveDraftInHistory(next);
      draftDirty = false;
      return true;
    } catch (_) {
      return false;
    }
  }

  function scheduleEditorialDraftSave(delay = 120) {
    window.clearTimeout(autosaveTimer);
    autosaveTimer = window.setTimeout(() => persistEditorialDraft(), delay);
  }

  function clearEditorialLocalState() {
    [
      storageKey,
      storageHistoryKey,
      legacyStorageKey,
      legacyStorageHistoryKey,
      classicStorageKey,
      impactProjectStorageKey,
      accountProjectStorageKey,
    ].forEach(key => localStorage.removeItem(key));
  }

  function startNewHouse() {
    const confirmed = window.confirm("Pornești o casă nouă? Datele salvate local și override-urile tehnice de pe acest dispozitiv vor fi șterse.");
    if (!confirmed) return;
    suppressLocalAutosave = true;
    draftDirty = false;
    window.clearTimeout(autosaveTimer);
    clearEditorialLocalState();
    currentProjectId = "";
    window.location.reload();
  }

  function resolvePersistedField(key) {
    if (key.startsWith("id:")) return document.getElementById(key.slice(3));
    if (key.startsWith("name:")) {
      const name = key.slice(5);
      return [...form.elements].find(field => field.name === name) || null;
    }
    return null;
  }

  function applyEditorialDraft(draft, {preserveOverrides = true} = {}) {
    if (!draftHasFields(draft)) return false;
    let applied = false;
    Object.entries(draft.fields).forEach(([key, saved]) => {
      const field = resolvePersistedField(key);
      if (!field || !isPersistableField(field) || !saved || typeof saved !== "object") return;

      const isGeometryOverride = field.dataset.geomAuto !== undefined;
      const isAdvancedOverride = field.matches?.("[data-optional-advanced]");
      if (!preserveOverrides && (isGeometryOverride || isAdvancedOverride)) {
        if (isGeometryOverride) field.dataset.geomAuto = "true";
        if (isAdvancedOverride) field.dataset.advancedAuto = "true";
        return;
      }

      if (field.type === "checkbox" || field.type === "radio") {
        field.checked = Boolean(saved.checked);
      } else if (Object.prototype.hasOwnProperty.call(saved, "value")) {
        if (field.tagName === "SELECT") {
          const hasOption = [...field.options].some(option => option.value === String(saved.value));
          if (!hasOption) return;
        }
        field.value = String(saved.value);
      }
      if (preserveOverrides && saved.geomAuto !== undefined && field.dataset.geomAuto !== undefined) {
        field.dataset.geomAuto = String(saved.geomAuto);
      }
      if (preserveOverrides && saved.advancedAuto !== undefined) {
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

      // Legacy geometry overrides are intentionally not migrated. They lived in
      // collapsed UI and could make two visually identical houses send different
      // RBPE payloads on different devices. Geometry is recomputed from the
      // visible house dimensions during the v2 migration.

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

      persistEditorialDraft({force:true});
      return true;
    } catch (_) {
      return false;
    }
  }

  function migrateLegacyEditorialDraft() {
    try {
      const legacyDraft = JSON.parse(localStorage.getItem(legacyStorageKey) || "null");
      if (!draftHasFields(legacyDraft)) return false;
      const applied = applyEditorialDraft(legacyDraft, {preserveOverrides:false});
      if (!applied) return false;
      draftDirty = true;
      persistEditorialDraft({force:true});
      localStorage.removeItem(legacyStorageKey);
      localStorage.removeItem(legacyStorageHistoryKey);
      return true;
    } catch (_) {
      return false;
    }
  }

  function restoreEditorialDraft() {
    if (!localAutosaveAllowed()) return false;
    try {
      const ownDraft = JSON.parse(localStorage.getItem(storageKey) || "null");
      if (draftLooksUsable(ownDraft) && applyEditorialDraft(ownDraft, {preserveOverrides:true})) {
        preserveDraftInHistory(ownDraft);
        draftDirty = false;
        return true;
      }
      if (draftHasFields(ownDraft) && applyEditorialDraft(ownDraft, {preserveOverrides:false})) {
        draftDirty = true;
        persistEditorialDraft({force:true});
        return true;
      }
      const history = readDraftHistory();
      for (let index = history.length - 1; index >= 0; index -= 1) {
        if (applyEditorialDraft(history[index], {preserveOverrides:true})) {
          localStorage.setItem(storageKey, JSON.stringify(history[index]));
          draftDirty = false;
          return true;
        }
      }
    } catch (_) {}
    if (migrateLegacyEditorialDraft()) return true;
    return migrateClassicDraft();
  }


  function accountToken() {
    try {
      return String(localStorage.getItem(authTokenStorageKey) || "").trim();
    } catch (_) {
      return "";
    }
  }

  function setAccountState(node, message = "", kind = "") {
    if (!node) return;
    node.textContent = message;
    node.classList.toggle("is-error", kind === "error");
    node.classList.toggle("is-ok", kind === "ok");
  }

  function rememberAccountToken(token) {
    try {
      if (token) localStorage.setItem(authTokenStorageKey, String(token));
      else localStorage.removeItem(authTokenStorageKey);
    } catch (_) {}
  }

  function rememberCurrentProject(projectId) {
    currentProjectId = String(projectId || "").trim();
    try {
      if (currentProjectId) {
        localStorage.setItem(accountProjectStorageKey, currentProjectId);
        localStorage.setItem(impactProjectStorageKey, currentProjectId);
      } else {
        localStorage.removeItem(accountProjectStorageKey);
        localStorage.removeItem(impactProjectStorageKey);
      }
    } catch (_) {}
  }

  function restoreCurrentProjectId() {
    try {
      currentProjectId = String(localStorage.getItem(accountProjectStorageKey) || "").trim();
    } catch (_) {
      currentProjectId = "";
    }
  }

  async function accountRequest(path, {method = "GET", body = null, auth = true} = {}) {
    const headers = {"Accept":"application/json"};
    if (body !== null) headers["Content-Type"] = "application/json";
    if (auth) {
      const token = accountToken();
      if (!token) {
        const error = new Error("Autentificare necesară.");
        error.status = 401;
        throw error;
      }
      headers.Authorization = "Bearer " + token;
    }
    const response = await fetch(path, {
      method,
      headers,
      cache:"no-store",
      body:body === null ? undefined : JSON.stringify(body),
    });
    const data = await response.json().catch(() => ({}));
    if (!response.ok || data?.success === false) {
      const error = new Error(data?.error || data?.detail || ("HTTP " + response.status));
      error.status = response.status;
      error.payload = data;
      throw error;
    }
    return data;
  }

  function projectNameSuggestion() {
    const explicit = String($("#edProjectName")?.value || "").trim();
    if (explicit && explicit !== "Casa mea") return explicit;
    const locality = String($("#localityInput")?.value || "").trim();
    return locality ? "Casa " + locality : "Casa mea";
  }

  function accountWorkspaceSnapshot() {
    return {
      schemaVersion:"home_lab_editorial_workspace_v1",
      draft:editorialDraftSnapshot(),
      page:current,
      furthestWizardIndex,
      baselineResult:baselineResult || null,
      optimizationResult:optimizationResult || null,
      baselineInputFingerprint:baselineInputFingerprint || "",
      teoInputFingerprint:teoInputFingerprint || "",
      savedAt:new Date().toISOString(),
    };
  }

  function syncAccountChrome() {
    const signedIn = Boolean(accountUser && accountToken());
    if (accountSignedOut) accountSignedOut.hidden = signedIn;
    if (accountSignedIn) accountSignedIn.hidden = !signedIn;
    if (accountQuickSave) accountQuickSave.hidden = !signedIn;
    if (accountOpen) {
      const firstName = String(accountUser?.name || "").trim().split(/\s+/)[0];
      accountOpen.textContent = signedIn && firstName ? firstName : "Cont";
    }
    if (signedIn) {
      if ($("#edAccountUserName")) $("#edAccountUserName").textContent = accountUser.name || "Cont Home Lab";
      if ($("#edAccountUserEmail")) $("#edAccountUserEmail").textContent = accountUser.email || "";
    }
  }

  function setAccountSession(result) {
    rememberAccountToken(result?.token || "");
    accountUser = result?.user || null;
    syncAccountChrome();
  }

  function clearAccountSession() {
    rememberAccountToken("");
    accountUser = null;
    syncAccountChrome();
  }

  async function refreshAccountSession() {
    if (!accountToken()) {
      accountUser = null;
      syncAccountChrome();
      return false;
    }
    try {
      const result = await accountRequest("/api/me");
      accountUser = result.user || null;
      syncAccountChrome();
      return Boolean(accountUser);
    } catch (error) {
      if (Number(error?.status) === 401) {
        clearAccountSession();
      } else {
        setAccountState(accountSignedOutState, error?.message || "Contul nu poate fi verificat momentan.", "error");
      }
      return false;
    }
  }

  function formatProjectUpdatedAt(value) {
    if (!value) return "salvat";
    const date = new Date(String(value).replace(" ", "T") + (String(value).includes("Z") ? "" : "Z"));
    if (Number.isNaN(date.getTime())) return "salvat";
    try {
      return new Intl.DateTimeFormat("ro-RO", {dateStyle:"medium",timeStyle:"short"}).format(date);
    } catch (_) {
      return "salvat";
    }
  }

  function renderAccountProjects(projects) {
    if (!projectsList) return;
    projectsList.replaceChildren();
    const rows = Array.isArray(projects) ? projects : [];
    if (!rows.length) {
      const empty = document.createElement("p");
      empty.className = "ed-account-empty";
      empty.textContent = "Nu ai încă nicio casă salvată în cont.";
      projectsList.appendChild(empty);
      return;
    }
    rows.forEach(project => {
      const projectId = String(project.project_id || project.projectId || "");
      const button = document.createElement("button");
      button.type = "button";
      button.className = "ed-account-project";
      button.classList.toggle("is-current", projectId === currentProjectId);

      const title = document.createElement("strong");
      title.textContent = String(project.project_name || project.name || "Casa mea");
      const meta = document.createElement("small");
      meta.textContent = formatProjectUpdatedAt(project.updated_at || project.updatedAt);
      const action = document.createElement("span");
      action.textContent = projectId === currentProjectId ? "Deschisă" : "Deschide";

      button.append(title, meta, action);
      button.addEventListener("click", () => loadAccountProject(projectId));
      projectsList.appendChild(button);
    });
  }

  async function refreshAccountProjects() {
    if (!accountUser) return;
    if (projectsList) projectsList.innerHTML = '<p class="ed-hint">Se încarcă…</p>';
    try {
      const result = await accountRequest("/api/projects/list");
      renderAccountProjects(result.projects || []);
    } catch (error) {
      if (projectsList) {
        projectsList.replaceChildren();
        const message = document.createElement("p");
        message.className = "ed-account-empty";
        message.textContent = error?.message || "Casele salvate nu pot fi încărcate.";
        projectsList.appendChild(message);
      }
    }
  }

  function refreshUiAfterLoadedDraft(workspace) {
    normalizeHeatingUi();
    syncRenewableVisibility();
    updateGeometryDisplay(false);
    syncGoalField();
    syncChoiceGroupSelections();
    syncNzebPolicy();
    syncDerivedAdvancedFields();
    form.querySelectorAll("[data-optional-advanced]").forEach(refreshAdvancedFieldState);
    syncTechnicalForm();

    baselineResult = workspace?.baselineResult || null;
    optimizationResult = workspace?.optimizationResult || null;
    baselineInputFingerprint = String(workspace?.baselineInputFingerprint || "");
    teoInputFingerprint = String(workspace?.teoInputFingerprint || "");
    lastPlan = null;
    branchResults = [];
    furthestWizardIndex = Math.max(
      -1,
      Math.min(
        wizardOrder.length - 1,
        Number.isFinite(Number(workspace?.furthestWizardIndex))
          ? Number(workspace.furthestWizardIndex)
          : 0
      )
    );

    resetTeoControlUi();
    if (baselineResult) {
      paintBaselineSummary(baselineResult, "Casă redeschisă din cont.");
    }
    if (optimizationResult) {
      renderTeoResult();
    }

    const requestedPage = String(workspace?.page || "");
    if (requestedPage === "report" && baselineResult && optimizationResult) {
      renderReport();
      showPage("report");
    } else if (requestedPage === "goal" && optimizationResult) {
      showPage("goal");
    } else {
      showPage("house");
    }
    if (!baselineResult) scheduleBaselineSummary(150);
  }

  async function loadAccountProject(projectId) {
    if (!projectId) return;
    setAccountState(projectSaveState, "Deschid casa…");
    try {
      const result = await accountRequest("/api/projects/load", {
        method:"POST",
        body:{projectId},
      });
      const project = result.project || {};
      const workspace = project.workspace || {};
      const draft = workspace.draft;
      if (!draftHasFields(draft)) {
        throw new Error("Casa salvată nu conține un draft Home Lab compatibil.");
      }

      suppressLocalAutosave = true;
      const applied = applyEditorialDraft(draft, {preserveOverrides:true})
        || applyEditorialDraft(draft, {preserveOverrides:false});
      suppressLocalAutosave = false;
      if (!applied) throw new Error("Casa salvată nu poate fi aplicată în această versiune Home Lab.");

      rememberCurrentProject(project.projectId || projectId);
      if ($("#edProjectName")) $("#edProjectName").value = String(project.name || "Casa mea");
      draftDirty = true;
      persistEditorialDraft({force:true});
      refreshUiAfterLoadedDraft(workspace);
      setAccountState(projectSaveState, "Casa a fost redeschisă.", "ok");
      await refreshAccountProjects();
      accountDialog?.close();
    } catch (error) {
      suppressLocalAutosave = false;
      setAccountState(projectSaveState, error?.message || "Casa nu a putut fi deschisă.", "error");
    }
  }

  async function saveCurrentAccountProject({quiet = false} = {}) {
    if (!accountUser || !accountToken()) {
      accountDialog?.showModal?.();
      setAccountState(accountSignedOutState, "Conectează-te înainte de salvare.");
      return false;
    }
    const name = projectNameSuggestion();
    if ($("#edProjectName")) $("#edProjectName").value = name;
    if (accountQuickSave) {
      accountQuickSave.disabled = true;
      accountQuickSave.textContent = "Salvez…";
    }
    setAccountState(projectSaveState, quiet ? "" : "Salvez casa în cont…");
    try {
      syncTechnicalForm();
      const result = await accountRequest("/api/projects/save", {
        method:"POST",
        body:{
          projectId:currentProjectId || undefined,
          name,
          workspace:accountWorkspaceSnapshot(),
        },
      });
      rememberCurrentProject(result.projectId);
      markDraftDirty();
      persistEditorialDraft({force:true});
      setAccountState(projectSaveState, "Proiectul Home Lab este salvat în cont.", "ok");
      if (accountQuickSave) accountQuickSave.textContent = "Salvat ✓";
      await refreshAccountProjects();
      window.setTimeout(() => {
        if (accountQuickSave) accountQuickSave.textContent = "Salvează proiectul";
      }, 1400);
      return true;
    } catch (error) {
      setAccountState(projectSaveState, error?.message || "Salvarea nu a reușit.", "error");
      if (accountQuickSave) accountQuickSave.textContent = "Salvează proiectul";
      return false;
    } finally {
      if (accountQuickSave) accountQuickSave.disabled = false;
    }
  }

  async function handleAccountAuthentication(event, mode) {
    event.preventDefault();
    const source = event.currentTarget;
    const fields = Object.fromEntries(new FormData(source).entries());
    setAccountState(accountSignedOutState, mode === "register" ? "Creez contul…" : "Verific datele…");
    try {
      const result = await accountRequest(
        mode === "register" ? "/api/register" : "/api/login",
        {method:"POST",body:fields,auth:false}
      );
      setAccountSession(result);
      source.reset();
      setAccountState(accountSignedOutState, "", "");
      setAccountState(projectSaveState, "Cont conectat. Poți salva proiectul Home Lab.", "ok");
      await refreshAccountProjects();
    } catch (error) {
      setAccountState(accountSignedOutState, error?.message || "Autentificarea nu a reușit.", "error");
    }
  }

  function initializeAccountUi() {
    restoreCurrentProjectId();
    syncAccountChrome();

    accountOpen?.addEventListener("click", async () => {
      if (typeof accountDialog?.showModal === "function") accountDialog.showModal();
      else accountDialog?.setAttribute("open", "");
      const signedIn = await refreshAccountSession();
      if (signedIn) await refreshAccountProjects();
    });
    $("#edAccountClose")?.addEventListener("click", () => accountDialog?.close());
    accountDialog?.addEventListener("click", event => {
      if (event.target === accountDialog) accountDialog.close();
    });
    $("#edLoginForm")?.addEventListener("submit", event => handleAccountAuthentication(event, "login"));
    $("#edRegisterForm")?.addEventListener("submit", event => handleAccountAuthentication(event, "register"));
    $("#edAccountLogout")?.addEventListener("click", async () => {
      try {
        if (accountToken()) await accountRequest("/api/logout", {method:"POST"});
      } catch (_) {}
      clearAccountSession();
      setAccountState(projectSaveState, "");
      renderAccountProjects([]);
    });
    $("#edProjectSave")?.addEventListener("click", () => saveCurrentAccountProject());
    accountQuickSave?.addEventListener("click", () => saveCurrentAccountProject({quiet:true}));
    $("#edProjectsRefresh")?.addEventListener("click", refreshAccountProjects);

    refreshAccountSession().then(signedIn => {
      if (signedIn && accountDialog?.open) refreshAccountProjects();
    });
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

  const ADVANCED_DEPENDENCY_RESETS = Object.freeze({
    wallStructure:["advWallU"],
    wallStructureThickness:["advWallU"],
    wallInsulationMaterial:["advWallU"],
    wallIns:["advWallU"],
    topBoundary:["advRoofU"],
    roofInsulationMaterial:["advRoofU"],
    roofIns:["advRoofU"],
    floorBoundary:["advFloorU","advGroundConductivity"],
    floorInsulationMaterial:["advFloorU"],
    floorIns:["advFloorU"],
    glazing:["advWindowU","advSolarGn"],
    ventilation:["advAch","advHeatRecovery"],
    heatingChoice:["advHeatingEfficiency","advHeatingScop","advHeatingAux","advHeatingFlow","advHeatingReturn"],
    heatPumpSource:["advHeatingScop","advHeatingAux","advHeatingFlow","advHeatingReturn"],
    heatingEmitter:["advHeatingFlow","advHeatingReturn","advHeatingScop"],
    cooling:["advCoolingSeer","advCoolingSetpoint"],
    dhwSystem:["advDhwEfficiency","advDhwCop"],
  });

  function refreshAdvancedDetailsState(details) {
    if (!details?.matches?.(".ed-advanced-details")) return;
    const manualCount = [...details.querySelectorAll("[data-optional-advanced]")]
      .filter(field => advancedFieldIsManual(field.id)).length;
    details.classList.toggle("has-manual-overrides", manualCount > 0);
    details.dataset.manualOverrideCount = String(manualCount);
  }

  function resetAdvancedDerivedFields(ids = []) {
    [...new Set(ids)].forEach(id => {
      const field = document.getElementById(id);
      if (!field?.matches?.("[data-optional-advanced]")) return;
      field.dataset.advancedAuto = "true";
      field.value = "";
      refreshAdvancedFieldState(field);
    });
  }

  function resetAdvancedDependents(field) {
    if (!field || field.matches?.("[data-optional-advanced]")) return;
    const key = String(field.id || field.name || "");
    const ids = [...(ADVANCED_DEPENDENCY_RESETS[key] || [])];
    if (key === "heatingChoice" && $("#dhwSystem")?.value === "same_as_heating") {
      ids.push("advDhwEfficiency","advDhwCop");
    }
    if (!ids.length) return;
    resetAdvancedDerivedFields(ids);
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
    refreshAdvancedDetailsState(field.closest(".ed-advanced-details"));
  }

  function refreshAdvancedFieldState(field) {
    if (!field?.matches?.("[data-optional-advanced]")) return;
    const hasValue = String(field.value ?? "").trim() !== "";
    const auto = field.dataset.advancedAuto === "true";
    const wrapper = field.closest(".ed-field");
    wrapper?.classList.toggle("is-derived-value", hasValue && auto);
    wrapper?.classList.toggle("is-manual-value", hasValue && !auto);
    refreshAdvancedDetailsState(field.closest(".ed-advanced-details"));
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
    const previous = current;
    current = name;
    const wizardIndex = wizardOrder.indexOf(name);
    if (wizardIndex >= 0) furthestWizardIndex = Math.max(furthestWizardIndex, wizardIndex);
    pages.forEach(page => page.classList.toggle("is-active", page.dataset.page === name));
    stepNumber.textContent = stepNumbers[name] || "—";
    stepName.textContent = stepNames[name] || name;
    renderProgressHistory();
    if (name === "goal") syncTeoRecalculationCue();
    if ((name === "report" || name === "goal") && optimizationResult) {
      paintBaselineSummary(
        optimizationSummaryForPersistentBar(),
        "Rezultat TEO verificat · după intervenții."
      );
    } else if (previous === "report" && baselineResult) {
      paintBaselineSummary(baselineResult);
    }
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
    if (name === "renewables") {
      const confirmation = $("#edHouseValuesConfirmed");
      if (confirmation) {
        confirmation.setCustomValidity(
          confirmation.checked
            ? ""
            : "Confirmă datele introduse înainte de a continua la obiectivul TEO."
        );
      }
    }
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
    // The generator is an explicit user choice. Do not silently pre-fill the
    // rest of page 3; only normalize combinations that are physically fixed.
    normalizeHeatingUi();
  }

  function normalizeHeatingUi() {
    const type = $("#heatingChoice").value;
    const source = $("#heatPumpSource").value;
    const localFixed = type === "wood_stove" || type === "electric_resistance";
    $("#heatPumpSourceField").hidden = type !== "heat_pump";

    const chainFields = [...document.querySelectorAll("[data-heating-chain-field]")];
    chainFields.forEach(el => { el.hidden = localFixed; });

    const emitterField = $("#heatingEmitter").closest(".ed-field");
    const distributionField = $("#heatingDistribution").closest(".ed-field");
    const storageField = $("#heatingStorage").closest(".ed-field");

    if (!type) {
      emitterField.hidden = false;
      distributionField.hidden = false;
      storageField.hidden = false;
      return;
    }

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
      const emitter = $("#heatingEmitter").value;
      if (emitter === "underfloor") {
        $("#heatingDistribution").value = "underfloor";
      } else if (emitter && $("#heatingDistribution").value === "underfloor") {
        $("#heatingDistribution").value = "";
      }
    }

    emitterField.hidden = airToAir;
    distributionField.hidden = airToAir;
    storageField.hidden = airToAir;
  }

  function heatingGeneratorType() {
    const type = $("#heatingChoice").value;
    if (type === "heat_pump") return $("#heatPumpSource").value || "";
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
    const wallReady = [
      $("#wallStructure").value,
      $("#wallStructureThickness").value,
      $("#wallInsulationMaterial").value,
      $("#wallIns").value,
    ].every(value => String(value ?? "").trim() !== "");
    const roofReady = [
      $("#topBoundary").value,
      $("#roofInsulationMaterial").value,
      $("#roofIns").value,
    ].every(value => String(value ?? "").trim() !== "");
    const floorReady = [
      $("#floorBoundary").value,
      $("#floorInsulationMaterial").value,
      $("#floorIns").value,
    ].every(value => String(value ?? "").trim() !== "");
    const glazing = $("#glazing").value;

    const glazingU = {
      single_clear_glazing:5.0,
      double_clear_glazing:2.8,
      double_low_e_face_3:1.6,
      triple_low_e_faces_2_and_5:0.9,
    };
    const glazingG = {
      single_clear_glazing:0.85,
      double_clear_glazing:0.75,
      double_low_e_face_3:0.65,
      triple_low_e_faces_2_and_5:0.50,
    };

    setAdvancedDerivedValue(
      "advWallU",
      wallReady
        ? insulationU(wallBaseU(), $("#wallIns").value, insulationLambda($("#wallInsulationMaterial").value))
        : NaN,
      3
    );
    setAdvancedDerivedValue(
      "advRoofU",
      roofReady
        ? insulationU(
            Number(TOP_BOUNDARY_BASE_U[$("#topBoundary").value]) || TOP_BOUNDARY_BASE_U.unknown,
            $("#roofIns").value,
            insulationLambda($("#roofInsulationMaterial").value)
          )
        : NaN,
      3
    );
    setAdvancedDerivedValue(
      "advFloorU",
      floorReady
        ? insulationU(0.90, $("#floorIns").value, insulationLambda($("#floorInsulationMaterial").value))
        : NaN,
      3
    );
    setAdvancedDerivedValue("advWindowU", glazing ? glazingU[glazing] : NaN, 2);
    setAdvancedDerivedValue("advBridgePsi", wallReady ? 0.08 : NaN, 2);
    setAdvancedDerivedValue(
      "advGroundConductivity",
      floorReady && $("#floorBoundary").value === "ground" ? 2.0 : NaN,
      1
    );
    setAdvancedDerivedValue("advSolarGn", glazing ? glazingG[glazing] : NaN, 2);

    const ventilation = $("#ventilation").value;
    const heating = $("#heatingChoice").value;
    const cooling = $("#cooling").value;
    const dhw = $("#dhwSystem").value;

    setAdvancedDerivedValue("advAch", ventilation ? (ventilation === "natural" ? 0.50 : ventilation === "mechanical" ? 0.45 : 0.35) : NaN, 2);
    setAdvancedDerivedValue("advInfiltrationAch", ventilation ? 0.15 : NaN, 2);
    setAdvancedDerivedValue("advHeatRecovery", ventilation ? (ventilation === "hrv" ? 80 : 0) : NaN, 0);

    const heatProfile = heating ? heatingExpertProfile() : null;
    setAdvancedDerivedValue(
      "advHeatingEfficiency",
      heatProfile && heating !== "heat_pump" ? Number(heatProfile.efficiency) * 100 : NaN,
      0
    );
    setAdvancedDerivedValue(
      "advHeatingScop",
      heatProfile && heating === "heat_pump" ? Number(heatProfile.scop) : NaN,
      2
    );
    setAdvancedDerivedValue("advHeatingAux", heating ? Number(heatProfile?.auxiliaryElectricityKwhYear) : NaN, 0);
    setAdvancedDerivedValue("advHeatingFlow", heating ? Number(heatProfile?.flowTemperatureC) : NaN, 0);
    setAdvancedDerivedValue("advHeatingReturn", heating ? Number(heatProfile?.returnTemperatureC) : NaN, 0);

    setAdvancedDerivedValue(
      "advCoolingSeer",
      cooling ? (cooling === "none" ? NaN : cooling === "split" ? 4.2 : 4.0) : NaN,
      1
    );
    setAdvancedDerivedValue("advCoolingSetpoint", cooling ? 26 : NaN, 0);

    const dhwProfile = dhw ? dhwExpertProfile() : null;
    setAdvancedDerivedValue(
      "advDhwEfficiency",
      dhwProfile?.efficiency != null ? Number(dhwProfile.efficiency) * 100 : NaN,
      0
    );
    setAdvancedDerivedValue("advDhwCop", dhwProfile?.cop != null ? Number(dhwProfile.cop) : NaN, 2);
    setAdvancedDerivedValue("advDhwLitres", dhw ? 50 : NaN, 0);
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
    setValue("techInfiltrationAch", optionalAdvancedNumber("advInfiltrationAch") ?? DEFAULT_INFILTRATION_ACH);
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
        syncTeoRecalculationCue();
        markDraftDirty();
        scheduleEditorialDraftSave();
      });
    });
  });

  const goalBudget = $("#edGoalBudget");
  const goalPayback = $("#edGoalPayback");
  const goalBudgetWrap = $("#edGoalBudgetWrap");
  const goalPaybackWrap = $("#edGoalPaybackWrap");
  const nzebConstraintToggle = $("#edNzebConstraintToggle");
  const nzebConstraintValue = $("#edNzebConstraintValue");

  function isNewBuildYearProxy() {
    const year = Number(form.elements["construction_year"]?.value || 0);
    return Number.isFinite(year) && year >= 2021;
  }

  function nzebConstraintEnabled() {
    return String(nzebConstraintValue?.value || "0") === "1";
  }

  function syncNzebPolicy() {
    if (!nzebConstraintToggle || !nzebConstraintValue) return;
    const mandatory = isNewBuildYearProxy();
    if (mandatory) nzebConstraintValue.value = "1";
    const enabled = nzebConstraintEnabled();
    nzebConstraintToggle.classList.toggle("is-enabled", enabled);
    nzebConstraintToggle.classList.toggle("is-mandatory", mandatory);
    nzebConstraintToggle.setAttribute("aria-pressed", enabled ? "true" : "false");
    nzebConstraintToggle.setAttribute("aria-disabled", mandatory ? "true" : "false");
    nzebConstraintToggle.title = mandatory
      ? "Conformarea nZEB este blocată activ pentru o casă nouă."
      : enabled
        ? "Dezactivează ținta nZEB pentru această analiză."
        : "Activează ținta nZEB pentru această analiză.";

    const badge = $("#edNzebMandatoryBadge");
    if (badge) {
      badge.textContent = mandatory ? "OBLIGATORIU" : (enabled ? "ACTIV" : "OPȚIONAL");
    }

    const note = $("#edNzebLegalNote");
    if (note) {
      note.querySelector("span").textContent = mandatory
        ? "Pentru o casă cu anul construcției după 2020, Home Lab activează conformarea ca regulă de siguranță. Anul este un proxy de produs; statutul juridic real depinde de autorizația clădirii."
        : enabled
          ? "Ținta nZEB este activă pentru această analiză. TEO o tratează ca o constrângere tehnică, nu ca pe un certificat legal."
          : "Pentru clădirile existente, ținta nZEB este opțională și poate fi activată aici.";
    }

    const step3 = $("#edTeoStep3Label");
    const step4 = $("#edTeoStep4Label");
    const compliantLabel = $("#edTeoCompliantLabel");
    if (step3) step3.innerHTML = enabled
      ? "Caut<br>frontiera nZEB"
      : "Construiesc<br>frontiera Pareto";
    if (step4) step4.innerHTML = enabled
      ? "Reoptimizez<br>soluțiile conforme"
      : "Rafinez<br>candidații economici";
    if (compliantLabel) compliantLabel.textContent = enabled
      ? "soluții conforme*"
      : "candidați fezabili";

    renderNzebStatus(
      optimizationResult ? optimizationSummaryForPersistentBar() : baselineResult
    );
  }

  function syncGoalField() {
    const mode = form.elements["_optimization_mode"].value;
    if (goalBudget) {
      goalBudget.disabled = mode !== "investment_budget";
      goalBudget.name = mode === "investment_budget" ? "_investment_budget_lei" : "";
    }
    if (goalPayback) {
      goalPayback.disabled = mode !== "max_payback_years";
      goalPayback.name = mode === "max_payback_years" ? "_max_payback_years" : "";
    }
    goalBudgetWrap?.classList.toggle("is-inactive", mode !== "investment_budget");
    goalPaybackWrap?.classList.toggle("is-inactive", mode !== "max_payback_years");
  }

  nzebConstraintToggle?.addEventListener("click", () => {
    if (isNewBuildYearProxy()) return;
    nzebConstraintValue.value = nzebConstraintEnabled() ? "0" : "1";
    syncNzebPolicy();
    syncTeoRecalculationCue();
    markDraftDirty();
    scheduleEditorialDraftSave();
  });

  form.elements["construction_year"]?.addEventListener("change", syncNzebPolicy);
  form.elements["construction_year"]?.addEventListener("input", syncNzebPolicy);

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

  let localitySuggestionIndex = -1;

  function resetLocalitySuggestionActive() {
    localitySuggestionIndex = -1;
    const input = $("#localityInput");
    input?.removeAttribute("aria-activedescendant");
    $("#edLocalitySuggestions")?.querySelectorAll("[data-locality-id]").forEach(button => {
      button.classList.remove("is-keyboard-active");
      button.setAttribute("aria-selected", "false");
    });
  }

  function setLocalitySuggestionActive(index) {
    const target = $("#edLocalitySuggestions");
    const input = $("#localityInput");
    const buttons = Array.from(target?.querySelectorAll("[data-locality-id]") || []);
    if (!buttons.length) {
      resetLocalitySuggestionActive();
      return;
    }
    localitySuggestionIndex = Math.max(0, Math.min(Number(index) || 0, buttons.length - 1));
    buttons.forEach((button, buttonIndex) => {
      const active = buttonIndex === localitySuggestionIndex;
      button.classList.toggle("is-keyboard-active", active);
      button.setAttribute("aria-selected", active ? "true" : "false");
    });
    const active = buttons[localitySuggestionIndex];
    if (active) {
      input?.setAttribute("aria-activedescendant", active.id);
      active.scrollIntoView({block:"nearest"});
    }
  }

  function closeLocalitySuggestions() {
    const target = $("#edLocalitySuggestions");
    if (!target) return;
    target.hidden = true;
    $("#localityInput")?.setAttribute("aria-expanded", "false");
    resetLocalitySuggestionActive();
  }

  function renderLocalitySuggestions(query) {
    const target = $("#edLocalitySuggestions");
    const input = $("#localityInput");
    if (!target) return;
    const q = normalizeSearch(query);
    if (q.length < 2 || !localities.length) {
      target.innerHTML = "";
      closeLocalitySuggestions();
      return;
    }
    const hits = localities
      .filter(item => normalizeSearch(item.search || `${item.name} ${item.county || ""} ${item.uatName || ""}`).includes(q))
      .sort((a,b) => Number(b.importance || 0) - Number(a.importance || 0))
      .slice(0,8);
    target.innerHTML = hits.map((item, index) => `
      <button type="button" id="ed-locality-option-${index}" role="option" aria-selected="false" data-locality-id="${escapeHtml(item.id)}">
        <span><strong>${escapeHtml(item.name)}</strong><small>${escapeHtml(item.county || "")}${item.uatName && item.uatName !== item.name ? " · " + escapeHtml(item.uatName) : ""}</small></span>
        <em>${item.climateZone ? "Zona " + escapeHtml(item.climateZone) : ""}</em>
      </button>
    `).join("");
    target.hidden = !hits.length;
    input?.setAttribute("aria-expanded", hits.length ? "true" : "false");
    resetLocalitySuggestionActive();
  }

  function selectLocality(locality) {
    if (!locality) return;
    $("#localityId").value = locality.id;
    $("#localityInput").value = locality.name;
    $("#edLocationMeta").textContent =
      `${locality.county || ""}${locality.climateZone ? " · zona climatică " + locality.climateZone : ""}${locality.stationName ? " · " + locality.stationName : ""}`;
    closeLocalitySuggestions();
    $("#edMapSuggestions").hidden = true;
    renderLocationMap();
    scheduleBaselineSummary(120);
    scheduleEditorialDraftSave();
  }

  function climateTokenForSelectedLocality() {
    const rawId = String($("#localityId")?.value || "").trim();
    const selected = localityMap.get(rawId);
    if (!selected) return rawId || String($("#localityInput")?.value || "");

    const stationId = String(selected.stationId || "");
    const zone = String(selected.climateZone || "");
    if (!stationId || !zone) return rawId || String(selected.name || "");

    const shortStationId = stationId.replace(/^mc001_6_2013_/, "");
    const temperature = Number.isFinite(Number(selected.winterDesignTemperatureC))
      ? String(Number(selected.winterDesignTemperatureC))
      : "";
    const encode = value => encodeURIComponent(String(value ?? ""));

    return `@lc2|${shortStationId}|${zone}|${temperature}|${encode(selected.id)}|${encode(selected.name)}|${encode(selected.county || "")}`;
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

  $("#localityInput").addEventListener("keydown", event => {
    const target = $("#edLocalitySuggestions");
    if (event.key === "ArrowDown" || event.key === "ArrowUp") {
      if (target.hidden) renderLocalitySuggestions(event.currentTarget.value);
      const buttons = Array.from(target.querySelectorAll("[data-locality-id]"));
      if (!buttons.length) return;
      event.preventDefault();
      const nextIndex = event.key === "ArrowDown"
        ? (localitySuggestionIndex < buttons.length - 1 ? localitySuggestionIndex + 1 : 0)
        : (localitySuggestionIndex > 0 ? localitySuggestionIndex - 1 : buttons.length - 1);
      setLocalitySuggestionActive(nextIndex);
      return;
    }
    if (event.key === "Enter" && !target.hidden && localitySuggestionIndex >= 0) {
      const button = target.querySelectorAll("[data-locality-id]")[localitySuggestionIndex];
      if (!button) return;
      event.preventDefault();
      markDraftDirty();
      selectLocality(localityMap.get(String(button.dataset.localityId)));
      return;
    }
    if (event.key === "Escape" && !target.hidden) {
      event.preventDefault();
      closeLocalitySuggestions();
    }
  });
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
    markDraftDirty();
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
      markDraftDirty();
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
    markDraftDirty();
    selectLocality(localityMap.get(String(button.dataset.mapLocalityId)));
  });

  form.addEventListener("input", event => {
    if (event.isTrusted) markDraftDirty();
    scheduleEditorialDraftSave();
  });
  form.addEventListener("change", event => {
    if (event.isTrusted) markDraftDirty();
    scheduleEditorialDraftSave();
  });
  window.addEventListener("lacurent:privacy-change", event => {
    if (event.detail?.localAutosave === true) persistEditorialDraft({force:true});
  });
  window.addEventListener("pagehide", () => persistEditorialDraft());
  $("#edNewHouse")?.addEventListener("click", startNewHouse);

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
    // Keep the raw locality ID in the form/local draft for UI restoration, but
    // never send it through the live RBPE path. The compact browser token keeps
    // the selected MC001 station/zone/locality/county without forcing Python to
    // parse and cache the ~6.5 MB Romanian locality registry on every isolate.
    data.set("locality_id", climateTokenForSelectedLocality());
    return data;
  }

  function impactProjectId() {
    try {
      const existing = String(localStorage.getItem(impactProjectStorageKey) || "").trim();
      if (existing) return existing;
      const created = typeof window.crypto?.randomUUID === "function"
        ? window.crypto.randomUUID()
        : `editorial-${Date.now()}-${Math.random().toString(16).slice(2)}`;
      localStorage.setItem(impactProjectStorageKey, created);
      return created;
    } catch (_) {
      if (!volatileImpactProjectId) {
        volatileImpactProjectId = `editorial-session-${Date.now()}-${Math.random().toString(16).slice(2)}`;
      }
      return volatileImpactProjectId;
    }
  }

  function impactAuthToken() {
    try {
      return String(localStorage.getItem(authTokenStorageKey) || "").trim();
    } catch (_) {
      return "";
    }
  }

  function impactCo2TotalKg(result, heatedArea) {
    const direct = Number(result?.co2_total_kg ?? result?.co2TotalKg);
    if (Number.isFinite(direct) && direct >= 0) return direct;
    const specific = Number(result?.co2_specific_kg_m2 ?? result?.co2SpecificKgM2);
    return Number.isFinite(specific) && Number.isFinite(heatedArea) && heatedArea > 0
      ? specific * heatedArea
      : null;
  }

  function buildImpactSavePayload() {
    if (!baselineResult || !optimizationResult) return null;
    const opt = optimizationResult.optimization || {};
    const parametric = opt.parametricEvaluation || {};
    const scenario = optimizationResult.scenario || {};
    const heatedArea = parseDecimal($("#heatedArea")?.value);
    const optimizedFinalEnergy = Number(
      parametric.finalEnergyKwh
      ?? scenario.final_energy_kwh
    );
    const optimizedAnnualCost = Number(
      parametric.annualBillLei
      ?? scenario.annual_cost_lei
    );
    const baselineFinalEnergy = Number(baselineResult.final_energy_kwh);
    const baselineAnnualCost = Number(baselineResult.annual_cost_lei);
    const capex = Number(opt.capexLei);
    if (![optimizedFinalEnergy, optimizedAnnualCost, baselineFinalEnergy, baselineAnnualCost, capex].every(Number.isFinite)) {
      return null;
    }
    const optimizedCo2 = Number.isFinite(Number(parametric.co2TotalKg))
      ? Number(parametric.co2TotalKg)
      : impactCo2TotalKg(
          {
            co2_total_kg:scenario.co2_total_kg,
            co2_specific_kg_m2:parametric.co2SpecificKgM2 ?? scenario.co2_specific_kg_m2,
          },
          heatedArea
        );

    return {
      projectId:impactProjectId(),
      projectName:`Casa ${String(baselineResult.locality || $("#localityInput")?.value || "mea").trim() || "mea"}`,
      baselineInputFingerprint,
      teoInputFingerprint,
      calculationModelVersion:CALCULATION_MODEL_VERSION,
      methodologyVersion:String(scenario.methodology_version || baselineResult.methodology_version || ""),
      heatedAreaM2:Number.isFinite(heatedArea) ? heatedArea : null,
      baseline:{
        finalEnergyKwh:baselineFinalEnergy,
        annualCostLei:baselineAnnualCost,
        co2KgYear:impactCo2TotalKg(baselineResult, heatedArea),
      },
      optimized:{
        finalEnergyKwh:optimizedFinalEnergy,
        annualCostLei:optimizedAnnualCost,
        capexLei:capex,
        co2KgYear:optimizedCo2,
      },
      source:{
        locality:String(baselineResult.locality || $("#localityInput")?.value || ""),
      },
    };
  }

  async function saveImpactSnapshotFromReport() {
    const button = $("#edImpactSave");
    const state = $("#edImpactSaveState");
    const token = impactAuthToken();
    if (!button || !state) return;
    if (!token) {
      state.textContent = "Autentificarea Home Lab este necesară. Agregatul public include numai analizele salvate în cont.";
      return;
    }
    const payload = buildImpactSavePayload();
    if (!payload) {
      state.textContent = "Rezultatul nu conține încă toate valorile necesare pentru salvarea impactului.";
      return;
    }
    button.disabled = true;
    state.textContent = "Salvez ultima versiune a acestei case…";
    try {
      const response = await fetch("/api/home-lab/impact/save", {
        method:"POST",
        headers:{
          "Accept":"application/json",
          "Content-Type":"application/json",
          "Authorization":`Bearer ${token}`,
        },
        body:JSON.stringify(payload),
      });
      const result = await response.json();
      if (!response.ok || !result?.saved) {
        throw new Error(result?.detail || result?.error || "Salvarea nu a reușit.");
      }
      button.textContent = "Analiză salvată ✓";
      state.textContent = "Această casă contribuie o singură dată la agregat; o salvare ulterioară îi înlocuiește snapshot-ul.";
    } catch (error) {
      button.disabled = false;
      state.textContent = error?.message || "Salvarea nu a reușit.";
    }
  }

  function wireImpactSaveButton() {
    const button = $("#edImpactSave");
    const state = $("#edImpactSaveState");
    if (!button || !state) return;
    const token = impactAuthToken();
    button.disabled = !token;
    state.textContent = token
      ? "Salvarea folosește ultima analiză TEO și înlocuiește versiunea anterioară a aceleiași case."
      : "Conectează contul Home Lab pentru a salva. Simulările nesalvate nu intră în agregatul public.";
    button.addEventListener("click", saveImpactSnapshotFromReport);
  }

  function calculationInputFingerprint(data) {
    const entries = [...data.entries()]
      .map(([key,value]) => [String(key), String(value)])
      .sort((a,b) => {
        if (a[0] !== b[0]) return a[0] < b[0] ? -1 : 1;
        if (a[1] !== b[1]) return a[1] < b[1] ? -1 : 1;
        return 0;
      });
    const canonical = JSON.stringify({
      calculationModelVersion:CALCULATION_MODEL_VERSION,
      entries,
    });
    const bytes = new TextEncoder().encode(canonical);
    let hash = 0xcbf29ce484222325n;
    const prime = 0x100000001b3n;
    const mask = 0xffffffffffffffffn;
    for (const byte of bytes) {
      hash ^= BigInt(byte);
      hash = (hash * prime) & mask;
    }
    return `rbpe:${CALCULATION_MODEL_VERSION}:${hash.toString(16).padStart(16, "0")}:${bytes.length}`;
  }

  function shortInputFingerprint(value) {
    const parts = String(value || "").split(":");
    const hash = parts.length >= 3 ? parts[2] : "";
    return hash ? hash.slice(-8).toUpperCase() : "—";
  }

  function syncTeoRecalculationCue() {
    const panel = $(".ed-teo-control-panel");
    const state = $("#edTeoRunState");
    const runButton = $("#runAnalysis");
    if (!panel || !state || !runButton) return false;

    if (!optimizationResult || !teoInputFingerprint) {
      panel.classList.remove("is-recalculation-needed");
      runButton.classList.remove("is-recalculation-needed");
      runButton.innerHTML = 'Rulează optimizarea TEO <svg><use href="#ed-i-arrow"></use></svg>';
      return false;
    }

    let currentFingerprint = "";
    try {
      currentFingerprint = calculationInputFingerprint(baseFormData());
    } catch {
      currentFingerprint = "";
    }
    const stale = Boolean(currentFingerprint && currentFingerprint !== teoInputFingerprint);
    panel.classList.toggle("is-recalculation-needed", stale);
    runButton.classList.toggle("is-recalculation-needed", stale);
    runButton.innerHTML = stale
      ? 'Recalculează optimizarea TEO <svg><use href="#ed-i-arrow"></use></svg>'
      : 'Rulează optimizarea TEO <svg><use href="#ed-i-arrow"></use></svg>';

    if (stale) {
      state.textContent = "Recalculare disponibilă";
      state.title = "Datele casei sau obiectivul s-au schimbat după ultima optimizare TEO.";
    } else if (panel.classList.contains("is-done")) {
      state.textContent = "Finalizat";
      state.removeAttribute("title");
    }
    return stale;
  }

  function formObject() {
    const out = {};
    for (const [key, value] of baseFormData().entries()) out[key] = String(value);
    return out;
  }

  function serviceNoticeMessage(error, stageName = "") {
    const status = Number(error?.status || 0);
    const payload = error?.payload || {};
    const explicit = String(
      payload.maintenance_message
      || payload.detail
      || payload.error
      || ""
    ).trim();
    if (explicit && explicit.length <= 180) return explicit;
    if (status === 0) {
      return "Conexiunea cu serviciul de calcul a fost întreruptă. Datele introduse rămân în pagină și reîncercăm automat.";
    }
    if ([500, 502, 503, 504].includes(status)) {
      return stageName
        ? `${stageName} este temporar indisponibil. Datele introduse rămân în pagină și reîncercăm automat.`
        : "Calculul este temporar indisponibil. Datele introduse rămân în pagină și reîncercăm automat.";
    }
    return "";
  }

  function showServiceNotice(error, stageName = "") {
    if (error?.name === "AbortError") return;
    const status = Number(error?.status || 0);
    if (status !== 0 && ![500, 502, 503, 504].includes(status)) return;
    const notice = $("#edServiceNotice");
    const text = $("#edServiceNoticeText");
    if (!notice || !text) return;
    text.textContent = serviceNoticeMessage(error, stageName);
    notice.hidden = false;
  }

  function clearServiceNotice() {
    const notice = $("#edServiceNotice");
    if (notice) notice.hidden = true;
  }

  async function readJson(response) {
    const data = await response.json().catch(() => ({}));
    if (!response.ok || data.error) {
      const error = new Error(data.error || data.detail || `HTTP ${response.status}`);
      error.status = response.status;
      error.payload = data;
      const retryAfterSeconds = Number(response.headers.get("retry-after") || 0);
      error.retryAfterMs = Number.isFinite(retryAfterSeconds) && retryAfterSeconds > 0
        ? retryAfterSeconds * 1000
        : 0;
      showServiceNotice(error);
      throw error;
    }
    clearServiceNotice();
    return data;
  }

  const sleep = ms => new Promise(resolve => window.setTimeout(resolve, ms));

  async function requestJsonWithRetry(url, init, {stageName = "request", runId = "", retries = 2} = {}) {
    let lastError = null;
    for (let attempt = 0; attempt <= retries; attempt += 1) {
      try {
        const response = await fetch(url, init);
        return await readJson(response);
      } catch (error) {
        lastError = error;
        const status = Number(error?.status || 0);
        const retryable = status === 0 || [500, 502, 503, 504].includes(status);
        if (!retryable || attempt >= retries) break;
        const backoff = attempt === 0 ? 700 : 1600;
        const delay = Math.max(backoff, Number(error?.retryAfterMs || 0));
        log(`RETRY · ${stageName} · HTTP ${status || "network"} · ${attempt + 1}/${retries} · aștept ${(delay / 1000).toFixed(1)} s · run ${runId || "—"}`);
        await sleep(delay);
      }
    }
    showServiceNotice(lastError || new Error("Request failed."), stageName);
    throw lastError || new Error("Request failed.");
  }

  async function postForm(url, data, options = {}) {
    return requestJsonWithRetry(
      url,
      {method:"POST", body:data, headers:{"Accept":"application/json"}},
      options
    );
  }

  async function postJson(url, data, options = {}) {
    return requestJsonWithRetry(
      url,
      {
        method:"POST",
        body:JSON.stringify(data),
        headers:{"Content-Type":"application/json","Accept":"application/json"}
      },
      options
    );
  }

  async function startTeoWorkerFlow(runId, plannedVerifications) {
    return postJson(
      "/api/optimization/home-lab/v4/flow/start",
      {runId, plannedVerifications},
      {stageName:"TEO Worker Flow start", runId, retries:3}
    );
  }

  async function teoWorkerFlowStatus(runId) {
    return requestJsonWithRetry(
      `/api/optimization/home-lab/v4/flow/${encodeURIComponent(runId)}`,
      {method:"GET", headers:{"Accept":"application/json"}},
      {stageName:"TEO Worker Flow status", runId, retries:3}
    );
  }

  async function finishTeoWorkerFlow(runId) {
    try {
      return await postJson(
        `/api/optimization/home-lab/v4/flow/${encodeURIComponent(runId)}/finish`,
        {},
        {stageName:"TEO Worker Flow finish", runId, retries:2}
      );
    } catch (_) {
      return null;
    }
  }

  async function waitForTeoWorkerFlowReady(runId) {
    for (let probe=0; probe<40; probe++) {
      const state = await teoWorkerFlowStatus(runId);
      if (state?.ready) return state;
      if (state?.status === "complete") return state;
      const retryAfterMs = Math.max(
        TEO_SERVER_PROFILE.flowPollMs,
        Math.min(Number(state?.retryAfterMs || TEO_SERVER_PROFILE.cooldownMs), 2500)
      );
      log(
        `WORKER FLOW · ${state?.status || "așteaptă"} · următorul VERIFY în ~${(retryAfterMs / 1000).toFixed(1)} s.`
      );
      await sleep(retryAfterMs);
    }
    throw new Error("TEO Worker Flow nu a devenit disponibil în intervalul așteptat.");
  }

  async function verifyWithTeoWorkerFlow({
    runId,
    formPayload,
    target,
    baselineAnnualBillLei,
    ordinal,
    total,
  }) {
    for (let gateAttempt=0; gateAttempt<8; gateAttempt++) {
      const state = await waitForTeoWorkerFlowReady(runId);
      if (state?.status === "complete") {
        throw new Error("TEO Worker Flow a fost închis înaintea verificării planificate.");
      }
      try {
        return await postJson(
          "/api/optimization/home-lab/v3/verify",
          {
            form:formPayload,
            runId,
            branchId:target.branchId,
            candidate:target.candidate,
            baselineAnnualBillLei,
          },
          {stageName:`verify ${ordinal}/${total}`, runId, retries:2}
        );
      } catch (error) {
        if (Number(error?.status || 0) !== 409 || gateAttempt >= 7) throw error;
        const retryMs = Math.max(
          TEO_SERVER_PROFILE.flowPollMs,
          Math.min(
            Number(error?.payload?.workerFlow?.retryAfterMs || TEO_SERVER_PROFILE.cooldownMs),
            5000
          )
        );
        await sleep(retryMs);
      }
    }
    throw new Error("TEO Worker Flow nu a putut acorda slot pentru verificare.");
  }

  function makeOptimizerRunId() {
    if (window.crypto?.randomUUID) return window.crypto.randomUUID();
    return `hl-${Date.now().toString(36)}-${Math.floor(performance.now()).toString(36)}`;
  }

  function paybackDisplay(opt) {
    if (opt.paybackStatus === "immediate") return "Imediată";
    if (opt.paybackStatus === "not_applicable_no_investment") return "Fără investiție";
    if (opt.paybackStatus === "never_at_current_prices") return "Nu se recuperează";
    if (opt.paybackYears != null) return fmt(opt.paybackYears, 1) + " ani";
    return "Nedeterminată";
  }

  function economicStatusText(opt) {
    if (opt.economicStatus === "no_positive_intervention") {
      return "În condițiile de preț și cost curente, optimizerul nu a găsit o intervenție cu beneficiu economic pozitiv față de casa actuală.";
    }
    if (opt.economicStatus === "non_positive_saving") {
      return "Soluția reduce alte criterii tehnice, dar nu reduce factura anuală în condițiile curente; recuperarea economică nu există la prețurile folosite.";
    }
    if (opt.economicStatus === "positive_saving_zero_capex") {
      return "Modelul indică o economie pozitivă fără CAPEX suplimentar în configurația analizată.";
    }
    return "";
  }

  function priceReferenceStatusLabel(status) {
    if (status === "stale") return "Referință expirată";
    if (status === "not_yet_valid") return "Referință viitoare";
    return "Referință";
  }

  function renderCostEnergySummary(result = baselineResult) {
    if (!costEnergySummary) return;
    const metrics = [
      ["QH,nd", "Necesar util anual de încălzire", result?.annual_heating_demand_kwh],
      ["QC,nd", "Necesar util anual de răcire", result?.annual_cooling_demand_kwh],
      ["Efinal", "Energie finală anuală", result?.final_energy_kwh],
      ["Eprim", "Energie primară anuală", result?.primary_energy_kwh],
    ];
    costEnergySummary.innerHTML = metrics.map(([symbol, label, value]) =>
      '<article class="ed-cost-energy-card">' +
        '<div><b>' + escapeHtml(symbol) + '</b><small>' + escapeHtml(label) + '</small></div>' +
        '<strong>' + escapeHtml(value == null ? "—" : energy(value)) + '</strong>' +
      '</article>'
    ).join("");
  }

  function renderPriceReferences(result = baselineResult) {
    if (!priceReferenceGrid || !priceReferenceBody) return;
    renderCostEnergySummary(result);
    const rows = Array.isArray(result?.price_reference_rows)
      ? result.price_reference_rows.filter(row => Number(row?.final_kwh || 0) > 0.0001)
      : [];

    const intro = priceReferenceBody.querySelector(".ed-price-reference-intro");
    if (!rows.length) {
      priceReferenceGrid.innerHTML = priceReferenceFallbackHtml;
      if (intro) intro.textContent = priceReferenceFallbackIntro;
      return;
    }

    const retrievedOn = String(result?.price_retrieved_on || "").trim();
    if (priceRetrievedOn && retrievedOn) {
      priceRetrievedOn.textContent = retrievedOn;
      priceRetrievedOn.setAttribute("datetime", retrievedOn);
    }
    if (intro) {
      intro.textContent = result?._summary_scope === "teo_final"
        ? "Acestea sunt referințele unitare de preț folosite pentru rezultatul TEO afișat. Contribuția pe purtător este omisă aici deoarece raportul parametric păstrează doar totalul verificat."
        : "Mai jos sunt exact referințele folosite în costul anual afișat pentru configurația curentă.";
    }

    priceReferenceGrid.innerHTML = rows.map(row => {
      const status = String(row.price_status || "current");
      const statusClass = status === "current" ? "" : " is-stale";
      const sourceName = escapeHtml(row.source_name || "Sursă neprecizată");
      const rawUrl = String(row.source_url || "");
      const source = /^https?:\/\//i.test(rawUrl)
        ? '<a href="' + escapeHtml(rawUrl) + '" target="_blank" rel="noopener noreferrer">' + sourceName + ' ↗</a>'
        : sourceName;
      const validFrom = row.valid_from ? escapeHtml(row.valid_from) : "—";
      const validUntil = row.valid_until ? escapeHtml(row.valid_until) : "prezent";
      const basis = row.basis
        ? '<div><dt>Bază</dt><dd>' + escapeHtml(row.basis) + '</dd></div>'
        : "";
      const note = row.note
        ? '<p class="ed-price-reference-note">' + escapeHtml(row.note) + '</p>'
        : "";
      const annual = row.annual_cost_lei == null
        ? ""
        : '<p class="ed-price-reference-contribution">Contribuție în estimare: <b>' + escapeHtml(money(row.annual_cost_lei)) + '/an</b></p>';
      const validity = (row.valid_from || row.valid_until)
        ? '<div><dt>Valabilitate</dt><dd>' + validFrom + ' → ' + validUntil + '</dd></div>'
        : "";

      return (
        '<article class="ed-price-reference-card">' +
          '<div class="ed-price-reference-card-head">' +
            '<strong>' + escapeHtml(row.label || row.carrier || "Energie") + '</strong>' +
            '<span class="ed-price-reference-status' + statusClass + '">' + escapeHtml(priceReferenceStatusLabel(status)) + '</span>' +
          '</div>' +
          '<p class="ed-price-reference-value">' + escapeHtml(fmt(row.unit_price_lei_per_kwh, 3)) + ' <small>lei/kWh</small></p>' +
          annual +
          '<dl>' +
            '<div><dt>Sursă</dt><dd>' + source + '</dd></div>' +
            basis +
            validity +
          '</dl>' +
          note +
        '</article>'
      );
    }).join("");
  }

  function energyClassRangeText(interval) {
    const lower = interval?.min_exclusive_kwh_m2;
    const upper = interval?.max_inclusive_kwh_m2;
    if (lower == null && upper != null) return "EP ≤ " + fmt(upper, 0);
    if (lower != null && upper == null) return "EP > " + fmt(lower, 0);
    if (lower != null && upper != null) {
      return fmt(lower, 0) + " < EP ≤ " + fmt(upper, 0);
    }
    return "—";
  }

  function referenceEnvelopeRow(label, item, fallbackU) {
    const targetU = item?.target_u_prime_w_m2k ?? fallbackU;
    const details = [];
    if (item?.material_label && item?.insulation_cm != null) {
      details.push(item.material_label + " · " + fmt(item.insulation_cm, 1) + " cm echivalent");
    } else if (item?.product_description) {
      details.push(item.product_description);
    }
    if (item?.solar_gn != null) {
      details.push("gₙ " + fmt(item.solar_gn, 2) + (item.solar_climate_zone ? " · zona " + item.solar_climate_zone : ""));
    }
    return (
      '<div class="ed-reference-house-row">' +
        '<span>' + escapeHtml(label) + '</span>' +
        '<b>' + (targetU == null ? "—" : escapeHtml(fmt(targetU, 2)) + ' W/m²K') + '</b>' +
        '<small>' + escapeHtml(details.join(" · ") || "valoare de referință") + '</small>' +
      '</div>'
    );
  }

  function renderClassReference(result = baselineResult) {
    if (!classReferenceBody) return;
    const classRef = result?.energy_class_reference;
    const reference = result?.reference_parameters;
    if (!classRef || !reference) {
      classReferenceBody.innerHTML =
        '<p class="ed-class-reference-placeholder">Completează localitatea și datele casei. După primul calcul apar aici pragurile exacte, poziția casei tale și parametrii casei de referință folosiți de model.</p>';
      return;
    }

    const currentClass = String(result.energy_class || "—").trim().toUpperCase();
    const currentPrimary = Number(result.primary_specific_kwh_m2);
    const intervals = Array.isArray(classRef.intervals) ? classRef.intervals : [];
    const thresholdRows = intervals.map(interval => {
      const label = String(interval?.class || "");
      const active = label === currentClass ? " is-current" : "";
      return (
        '<div class="ed-class-threshold-row' + active + '">' +
          '<span class="ed-class-chip" data-energy-class="' + escapeHtml(label) + '">' + escapeHtml(label) + '</span>' +
          '<b>' + escapeHtml(energyClassRangeText(interval)) + '</b>' +
          (active ? '<em>' + (result?._summary_scope === "teo_final" ? "Rezultat TEO" : "Casa ta") + '</em>' : '') +
        '</div>'
      );
    }).join("");

    const physical = reference.physical_mapping || {};
    const u = reference.u_values_w_m2k || {};
    const wall = referenceEnvelopeRow("Pereți exteriori", physical.wall, u.exterior_wall);
    const roof = referenceEnvelopeRow("Acoperiș / planșeu", physical.roof, u.roof);
    const floor = referenceEnvelopeRow("Pardoseală", physical.floor, u.floor);
    const window = referenceEnvelopeRow("Ferestre", physical.window, u.window);
    const door = referenceEnvelopeRow("Ușă exterioară", physical.exterior_door, u.exterior_door);

    const referenceComparison = result?.reference?.reference_specific_primary_kwh_m2 != null
      ? (
          '<div class="ed-reference-comparison">' +
            '<small>Energia primară specifică a casei de referință</small>' +
            '<strong>' + escapeHtml(fmt(result.reference.reference_specific_primary_kwh_m2, 1)) + ' kWh/(m²·an)</strong>' +
          '</div>'
        )
      : "";

    classReferenceBody.innerHTML =
      '<section class="ed-class-reference-section">' +
        '<div class="ed-class-current-summary">' +
          '<div>' +
            '<span class="ed-class-chip ed-class-chip-large" data-energy-class="' + escapeHtml(currentClass) + '">' + escapeHtml(currentClass) + '</span>' +
            '<div><small>' + (result?._summary_scope === "teo_final" ? "După intervențiile TEO" : "Casa ta") + '</small><strong>' + (Number.isFinite(currentPrimary) ? escapeHtml(fmt(currentPrimary, 1)) : "—") + ' kWh/(m²·an)</strong></div>' +
          '</div>' +
          '<p>Clasificarea folosește energia primară specifică totală. Intervalele sunt deschise la stânga și închise la dreapta.</p>' +
        '</div>' +
        '<div class="ed-class-thresholds">' + thresholdRows + '</div>' +
        '<p class="ed-reference-source"><b>Sursă praguri:</b> ' + escapeHtml(classRef.source || "—") + '</p>' +
      '</section>' +
      '<section class="ed-class-reference-section ed-reference-house">' +
        '<div class="ed-reference-house-heading">' +
          '<div><p class="ed-eyebrow">Model comparativ</p><h3>Casa de referință</h3></div>' +
          '<span>Aceeași geometrie și localitate</span>' +
        '</div>' +
        '<p class="ed-reference-house-intro">Home Lab păstrează geometria, amplasarea și orientarea casei tale și înlocuiește parametrii tehnici cu valorile de referință de mai jos. Anvelopa este source-backed; parametrii de sisteme sunt ipoteze explicite LaCurent Light.</p>' +
        referenceComparison +
        '<div class="ed-reference-envelope-grid">' + wall + roof + floor + window + door + '</div>' +
        '<div class="ed-reference-systems-grid">' +
          '<article><small>Ventilație</small><strong>' + escapeHtml(fmt(reference.air_changes_per_hour, 2)) + ' ACH</strong><span>recuperare ' + escapeHtml(fmt(Number(reference.heat_recovery_efficiency || 0) * 100, 0)) + '%</span></article>' +
          '<article><small>Încălzire</small><strong>' + escapeHtml(reference.heating_system_label || "Centrală în condensare") + '</strong><span>η ' + escapeHtml(fmt(Number(reference.heating_efficiency || 0) * 100, 0)) + '%</span></article>' +
          '<article><small>Răcire</small><strong>SEER ' + escapeHtml(fmt(reference.cooling_seer, 1)) + '</strong><span>dacă există răcire în casa reală</span></article>' +
          '<article><small>ACM</small><strong>η ' + escapeHtml(fmt(Number(reference.dhw_efficiency || 0) * 100, 0)) + '%</strong><span>aceiași ocupanți și necesar</span></article>' +
          '<article><small>Punți termice</small><strong>0 în modelul de referință</strong><span>politica Light curentă</span></article>' +
          '<article><small>Regenerabile</small><strong>Fără aport implicit</strong><span>politica Light curentă</span></article>' +
        '</div>' +
        '<div class="ed-reference-provenance">' +
          '<p><b>Sursă anvelopă:</b> ' + escapeHtml(reference.envelope_source || "—") + '</p>' +
          '<p><b>Context:</b> ' + escapeHtml(reference.reference_context || "—") + '</p>' +
          '<p><b>Sisteme:</b> ' + escapeHtml(reference.systems_source_status || "—") + '</p>' +
        '</div>' +
      '</section>' +
      '<p class="ed-class-reference-footnote">Această afișare explică modelul tehnic folosit de Home Lab și nu reprezintă un Certificat de Performanță Energetică emis legal.</p>';
  }

  function optimizationSummaryForPersistentBar() {
    const opt = optimizationResult?.optimization || {};
    const parametric = opt.parametricEvaluation || {};
    const scenario = optimizationResult?.scenario || {};
    const branchId = String(opt?.engineeringSpec?.heating?.technology_branch || "");
    const branchProfile = (lastPlan?.kernel?.branches || []).find(
      item => String(item?.branch_id || "") === branchId
    );
    const carrierLabels = {
      electricity:"Electricitate",
      natural_gas:"Gaz natural",
      district_heat:"Termoficare",
      biomass:"Biomasă",
    };
    const finalPriceRows = Object.entries(branchProfile?.prices || {})
      .filter(([, value]) => value?.reference)
      .map(([carrier, value]) => ({
        carrier,
        label:carrierLabels[carrier] || carrier,
        final_kwh:1,
        annual_cost_lei:null,
        price_status:"current",
        ...value.reference,
      }));
    const fallbackPriceRows = Array.isArray(baselineResult?.price_reference_rows)
      ? baselineResult.price_reference_rows.map(row => ({
          ...row,
          final_kwh:Math.max(Number(row?.final_kwh || 0), 1),
          annual_cost_lei:null,
        }))
      : [];

    const primarySpecific =
      parametric.primarySpecificKwhM2
      ?? scenario.primary_specific_kwh_m2
      ?? null;
    const heatedArea = parseDecimal($("#heatedArea")?.value);
    return {
      ...(baselineResult || {}),
      energy_class:parametric.energyClass ?? scenario.energy_class ?? baselineResult?.energy_class,
      annual_cost_lei:parametric.annualBillLei ?? scenario.annual_cost_lei ?? null,
      annual_heating_demand_kwh:scenario.annual_heating_demand_kwh ?? null,
      annual_cooling_demand_kwh:scenario.annual_cooling_demand_kwh ?? null,
      final_energy_kwh:parametric.finalEnergyKwh ?? scenario.final_energy_kwh ?? null,
      primary_energy_kwh:
        scenario.primary_energy_kwh
        ?? (
          Number.isFinite(Number(primarySpecific)) && Number.isFinite(heatedArea)
            ? Number(primarySpecific) * heatedArea
            : null
        ),
      primary_specific_kwh_m2:primarySpecific,
      co2_specific_kg_m2:
        parametric.co2SpecificKgM2
        ?? scenario.co2_specific_kg_m2
        ?? baselineResult?.co2_specific_kg_m2
        ?? null,
      rer_percent:
        parametric.rerPercent
        ?? scenario.rer_percent
        ?? baselineResult?.rer_percent
        ?? null,
      onsite_renewable_percent:
        parametric.onsiteRenewablePercent
        ?? scenario.onsite_renewable_percent
        ?? baselineResult?.onsite_renewable_percent
        ?? null,
      price_reference_rows:finalPriceRows.length ? finalPriceRows : fallbackPriceRows,
      _summary_scope:"teo_final",
    };
  }

  function candidateAvailableNzebPass(candidate, target = baselineResult?.nzeb_target) {
    if (!target || !candidate) return false;
    const primary = Number(
      candidate.primary_specific_kwh_m2
      ?? candidate.primarySpecificKwhM2
    );
    const co2 = Number(
      candidate.co2_specific_kg_m2
      ?? candidate.co2SpecificKgM2
    );
    const rer = Number(
      candidate.rer_percent
      ?? candidate.rerPercent
    );
    const onsite = Number(
      candidate.onsite_renewable_percent
      ?? candidate.onsiteRenewablePercent
    );
    const primaryLimit = Number(target.primary_energy_kwh_m2_year);
    const co2Limit = Number(target.co2_kg_m2_year);
    const rerMinimum = Number(target.renewable_total_minimum_percent ?? 30);
    const onsiteMinimum = Number(target.renewable_onsite_minimum_percent ?? 10);
    return [
      primary, co2, rer, onsite,
      primaryLimit, co2Limit, rerMinimum, onsiteMinimum
    ].every(Number.isFinite)
      && primary <= primaryLimit + 1e-6
      && co2 <= co2Limit + 1e-6
      && onsite + 1e-6 >= onsiteMinimum;
  }

  function setNzebMetric(metricName, actual, limit, unit) {
    const card = document.querySelector(`[data-nzeb-metric="${metricName}"]`);
    const title = metricName === "primary" ? $("#edNzebPrimaryValue") : $("#edNzebCo2Value");
    const limitNode = metricName === "primary" ? $("#edNzebPrimaryLimit") : $("#edNzebCo2Limit");
    const bar = metricName === "primary" ? $("#edNzebPrimaryBar") : $("#edNzebCo2Bar");
    const state = metricName === "primary" ? $("#edNzebPrimaryState") : $("#edNzebCo2State");
    if (!card || !title || !limitNode || !bar || !state) return null;
    const valid = Number.isFinite(Number(actual)) && Number.isFinite(Number(limit)) && Number(limit) > 0;
    const pass = valid ? Number(actual) <= Number(limit) + 1e-6 : null;
    card.classList.toggle("is-pass", pass === true);
    card.classList.toggle("is-fail", pass === false);
    title.textContent = valid ? `${fmt(actual,1)} / ${fmt(limit,1)}` : "—";
    limitNode.textContent = valid
      ? `Limită: ${fmt(limit,1)} ${unit}`
      : "Limită indisponibilă";
    const ratio = valid ? Math.min(100, Math.max(4, 100 * Number(actual) / Number(limit))) : 0;
    bar.style.width = `${ratio}%`;
    state.innerHTML = pass === true
      ? '<svg><use href="#ed-i-check"></use></svg>'
      : pass === false
        ? '<svg><use href="#ed-i-x"></use></svg>'
        : '<svg><use href="#ed-i-info"></use></svg>';
    return pass;
  }

  function renderNzebStatus(result = baselineResult) {
    const panel = $(".ed-nzeb-status-panel");
    if (!panel) return;
    const scope = $("#edNzebScopeLabel");
    if (scope) {
      scope.textContent = result?._summary_scope === "teo_final"
        ? "După optimizarea TEO"
        : "Situație inițială";
    }
    const target = result?.nzeb_target || baselineResult?.nzeb_target || null;
    const zone = target?.climate_zone || result?.climate_zone || "—";
    const zoneNode = $("#edNzebZone");
    if (zoneNode) zoneNode.textContent = zone || "—";

    const primaryPass = setNzebMetric(
      "primary",
      result?.primary_specific_kwh_m2,
      target?.primary_energy_kwh_m2_year,
      "kWh/m²·an"
    );
    const co2Pass = setNzebMetric(
      "co2",
      result?.co2_specific_kg_m2,
      target?.co2_kg_m2_year,
      "kgCO₂/m²·an"
    );

    const rerCard = document.querySelector('[data-nzeb-metric="rer"]');
    rerCard?.classList.remove("is-pass","is-fail","is-rer-pending");
    const rerValue = $("#edNzebRerValue");
    const rerBar = $("#edNzebRerBar");
    const rerState = $("#edNzebRerState");
    const rer = Number(
      result?.rer_percent
      ?? result?.renewable_share?.rer_percent
    );
    const onsite = Number(
      result?.onsite_renewable_percent
      ?? result?.renewable_share?.onsite_percent
    );
    const rerMinimum = Number(target?.renewable_total_minimum_percent ?? 30);
    const onsiteMinimum = Number(target?.renewable_onsite_minimum_percent ?? 10);
    const goMinimum = Number(
      target?.renewable_guarantee_of_origin_minimum_percent ?? 20
    );
    const rerValid = [rer, onsite, rerMinimum, onsiteMinimum].every(Number.isFinite);
    const rerTotalPass = rerValid
      ? rer + 1e-6 >= rerMinimum
      : null;
    const onsitePass = rerValid
      ? onsite + 1e-6 >= onsiteMinimum
      : null;
    rerCard?.classList.toggle("is-pass", rerTotalPass === true && onsitePass === true);
    rerCard?.classList.toggle("is-fail", onsitePass === false);
    rerCard?.classList.toggle(
      "is-rer-pending",
      rerValid === false || (onsitePass === true && rerTotalPass === false)
    );
    if (rerValue) {
      rerValue.textContent = rerValid
        ? `${fmt(rer,1)}% · onsite ${fmt(onsite,1)}%`
        : "—";
    }
    if (rerBar) {
      rerBar.style.width = rerValid
        ? `${Math.min(100, Math.max(4, 100 * rer / Math.max(rerMinimum, 1)))}%`
        : "0%";
    }
    if (rerState) {
      rerState.innerHTML = onsitePass === false
        ? '<svg><use href="#ed-i-x"></use></svg>'
        : rerTotalPass === true && onsitePass === true
          ? '<svg><use href="#ed-i-info"></use></svg>'
          : '<svg><use href="#ed-i-info"></use></svg>';
    }
    const rerLimit = $("#edNzebRerLimit");
    if (rerLimit) {
      rerLimit.textContent = `Țintă modelată: ≥${fmt(rerMinimum,0)}% total · ≥${fmt(onsiteMinimum,0)}% onsite · ≥${fmt(goMinimum,0)}% GO de dovedit`;
    }

    const message = $("#edNzebMessage");
    if (!message) return;
    const constrained = nzebConstraintEnabled();
    const technicalPass = (
      target
      && primaryPass === true
      && co2Pass === true
      && onsitePass === true
    );
    let text = "Completează casa pentru a verifica pragurile aplicabile.";
    if (technicalPass) {
      text = constrained
        ? `TEO poate verifica tehnic Eprim, CO₂ și partea SRE onsite ≥${fmt(onsiteMinimum,0)}%. RER modelat este ${fmt(rer,1)}%; cerința totală ≥${fmt(rerMinimum,0)}% se închide juridic numai împreună cu dovada pentru ≥${fmt(goMinimum,0)}% prin garanții de origine și cu orice prag suplimentar 2026 stabilit oficial.`
        : "Indicatorii tehnici nZEB modelați sunt atinși, dar constrângerea nZEB este momentan dezactivată.";
    } else if (target && [primaryPass, co2Pass, onsitePass].some(value => value === false)) {
      text = constrained
        ? "Clădirea nu respectă încă toate pragurile tehnice pe care TEO le poate proiecta. TEO caută economic, apoi reoptimizează în domeniul Eprim + CO₂ + SRE onsite; RER total și dovada GO rămân raportate separat."
        : "Cel puțin un prag tehnic nZEB modelat nu este atins. Activează conformarea pentru a-l trata drept restricție.";
    } else if (!target) {
      text = "Pragurile nZEB nu sunt disponibile până când localitatea și zona climatică nu sunt rezolvate.";
    }
    message.querySelector("span").textContent = text;
  }

  function setTeoControlPhase(step, label = "") {
    const panel = $(".ed-teo-control-panel");
    if (!panel) return;
    const requested = Math.max(0, Math.min(5, Number(step) || 0));
    const activeValues = [...document.querySelectorAll("[data-teo-step]")]
      .filter(node => node.classList.contains("is-active") || node.classList.contains("is-done"))
      .map(node => Number(node.dataset.teoStep || 0));
    const currentMax = activeValues.length ? Math.max(...activeValues) : 0;
    const numeric = requested > 0 ? Math.max(requested, currentMax) : 0;
    panel.classList.toggle("is-running", numeric > 0 && numeric < 6);
    panel.classList.remove("is-done");
    document.querySelectorAll("[data-teo-step]").forEach(node => {
      const value = Number(node.dataset.teoStep || 0);
      node.classList.toggle("is-done", numeric > 0 && value < numeric);
      node.classList.toggle("is-active", value === numeric);
    });
    const state = $("#edTeoRunState");
    if (state) state.textContent = label || (numeric ? `Pas ${numeric}/5` : "Pregătit");
  }

  function resetTeoControlUi() {
    const panel = $(".ed-teo-control-panel");
    panel?.classList.remove("is-running","is-done");
    document.querySelectorAll("[data-teo-step]").forEach(node => node.classList.remove("is-active","is-done"));
    const state = $("#edTeoRunState");
    if (state) state.textContent = "Pregătit";
    if ($("#edTeoEvaluated")) $("#edTeoEvaluated").textContent = "0";
    if ($("#edTeoCompliant")) $("#edTeoCompliant").textContent = "0";
    if ($("#edTeoFinalists")) $("#edTeoFinalists").textContent = "0";
    const result = $("#edTeoResult");
    if (result) result.hidden = true;
  }

  function updateTeoStats({evaluated, compliant, finalists} = {}) {
    if (evaluated != null && $("#edTeoEvaluated")) $("#edTeoEvaluated").textContent = fmt(evaluated);
    if (compliant != null && $("#edTeoCompliant")) $("#edTeoCompliant").textContent = fmt(compliant);
    if (finalists != null && $("#edTeoFinalists")) $("#edTeoFinalists").textContent = fmt(finalists);
  }

  function renderTeoResult() {
    const root = $("#edTeoResult");
    if (!root || !optimizationResult) return;
    const opt = optimizationResult.optimization || {};
    const engineering = opt.engineeringSpec || {};
    const env = engineering.envelope || {};
    const bridges = engineering.thermal_bridges || {};
    const ventilation = engineering.ventilation || {};
    const heat = engineering.heating || {};
    const pv = engineering.pv || {};
    const solarThermal = engineering.solar_thermal || {};
    const rows = [];
    const add = (icon, label, value, muted = false) => rows.push(
      `<div class="ed-teo-measure"><svg><use href="#${icon}"></use></svg><b>${escapeHtml(label)}</b><span class="${muted ? "is-muted" : ""}">${escapeHtml(value)}</span></div>`
    );

    const wallCm = Number(env.wall?.equivalent_insulation_thickness_cm || 0);
    const roofCm = Number(env.roof?.equivalent_insulation_thickness_cm || 0);
    const floorCm = Number(env.floor?.equivalent_insulation_thickness_cm || 0);
    add("ed-i-wall","Pereți",wallCm > .05 ? `+${fmt(wallCm,1)} cm izolație` : "Fără intervenție", wallCm <= .05);
    add("ed-i-roof","Acoperiș / pod",roofCm > .05 ? `+${fmt(roofCm,1)} cm izolație` : "Fără intervenție", roofCm <= .05);
    add("ed-i-floor","Pardoseală",floorCm > .05 ? `+${fmt(floorCm,1)} cm izolație` : "Fără intervenție", floorCm <= .05);

    const windowFraction = Number(env.windows?.replacement_fraction || 0);
    const windowU = Number(env.windows?.final_u_w_m2k || 0);
    add(
      "ed-i-window",
      "Ferestre",
      windowFraction > .005
        ? `${fmt(windowFraction * 100,0)}% înlocuire · Uw ${fmt(windowU,2)}`
        : `Fără înlocuire · Uw ${fmt(windowU,2)}`,
      windowFraction <= .005
    );

    const psiMean = Number(bridges.weighted_mean_psi_w_mk);
    add(
      "ed-i-bridge",
      "Punți termice",
      Number.isFinite(psiMean)
        ? `ψ mediu ${fmt(psiMean,3)} W/mK`
        : "Nemodificate",
      !bridges.optimized
    );

    const hrv = Number(ventilation.heat_recovery_efficiency || 0);
    add("ed-i-air","Ventilație",hrv > .01 ? `HRV ${fmt(hrv * 100,0)}% · ACH ${fmt(ventilation.air_changes_per_hour || 0,2)}` : "Fără intervenție", hrv <= .01);

    const branch = String(heat.technology_branch || heat.generator_type || "sistem existent");
    add("ed-i-heat","Încălzire",`${branch} · ${fmt(heat.design_required_power_kw || 0,1)} kW`,false);

    const pvAdded = Number(pv.added_power_kwp || 0);
    add("ed-i-pv","Fotovoltaice",pvAdded > .01 ? `+${fmt(pvAdded,1)} kWp · total ${fmt(pv.installed_power_kwp || 0,1)} kWp` : "Fără intervenție", pvAdded <= .01);

    const solarAdded = Number(solarThermal.added_area_m2 || 0);
    add(
      "ed-i-solar",
      "Solar termic",
      solarAdded > .01
        ? `+${fmt(solarAdded,1)} m² · total ${fmt(solarThermal.collector_area_m2 || 0,1)} m²`
        : "Fără intervenție",
      solarAdded <= .01
    );

    $("#edTeoMeasures").innerHTML = rows.join("");

    $("#edTeoCapex").textContent = money(opt.capexLei);
    $("#edTeoSaving").textContent = opt.annualSavingLei == null ? "—" : `${money(opt.annualSavingLei)}/an`;
    $("#edTeoPayback").textContent = opt.paybackYears == null ? "—" : `${fmt(opt.paybackYears,1)} ani`;

    const badge = $("#edTeoComplianceBadge");
    const selected = opt.parametricEvaluation || {};
    const availablePass = candidateAvailableNzebPass(selected);
    if (badge) {
      badge.classList.toggle("is-pending", nzebConstraintEnabled() && availablePass);
      badge.classList.toggle("is-fail", nzebConstraintEnabled() && !availablePass);
      badge.innerHTML = nzebConstraintEnabled()
        ? availablePass
          ? '<svg><use href="#ed-i-info"></use></svg> nZEB tehnic modelat · dovadă GO necesară'
          : '<svg><use href="#ed-i-x"></use></svg> Prag tehnic nZEB neatins'
        : '<svg><use href="#ed-i-check"></use></svg> Optim economic';
    }
    root.hidden = false;
    const panel = $(".ed-teo-control-panel");
    panel?.classList.remove("is-running");
    panel?.classList.add("is-done");
    const state = $("#edTeoRunState");
    if (state) state.textContent = "Finalizat";
    document.querySelectorAll("[data-teo-step]").forEach(node => {
      node.classList.remove("is-active");
      node.classList.add("is-done");
    });
  }

  function paintBaselineSummary(result, statusText = "Estimare pentru configurația curentă.") {
    if (!result) return;
    const energyClass = String(result.energy_class || "—").trim().toUpperCase() || "—";
    baselineClass.textContent = energyClass;
    if (["A+","A","B","C","D","E","F","G"].includes(energyClass)) {
      baselineClass.dataset.energyClass = energyClass;
    } else {
      delete baselineClass.dataset.energyClass;
    }
    baselineCost.textContent = result.annual_cost_lei == null ? "—" : money(result.annual_cost_lei) + "/an";
    baselineHeatingDemand.textContent =
      result.annual_heating_demand_kwh == null ? "—" : energy(result.annual_heating_demand_kwh);
    baselineCoolingDemand.textContent =
      result.annual_cooling_demand_kwh == null ? "—" : energy(result.annual_cooling_demand_kwh);
    baselineFinalEnergy.textContent =
      result.final_energy_kwh == null ? "—" : energy(result.final_energy_kwh);
    baselinePrimaryEnergy.textContent =
      result.primary_energy_kwh == null ? "—" : energy(result.primary_energy_kwh);
    baselineStatus.textContent = statusText;
    baselineBar.classList.remove("is-updating");
    if (priceDialog?.open) renderPriceReferences(result);
    if (classDialog?.open) renderClassReference(result);
    renderNzebStatus(result);
  }

  function baselineSummaryReady() {
    const locality = ($("#localityInput")?.value || "").trim();
    const localityToken = ($("#localityId")?.value || "").trim();
    const clearBaseline = message => {
      baselineClass.textContent = "—";
      delete baselineClass.dataset.energyClass;
      baselineCost.textContent = "—";
      baselineHeatingDemand.textContent = "—";
      baselineCoolingDemand.textContent = "—";
      baselineFinalEnergy.textContent = "—";
      baselinePrimaryEnergy.textContent = "—";
      baselineStatus.textContent = message;
      baselineBar.classList.remove("is-updating");
      return false;
    };

    if (!localityToken) {
      return clearBaseline(locality ? "Alege localitatea din sugestii sau de pe hartă." : "Completează localitatea.");
    }

    const missing = [...form.querySelectorAll("[data-baseline-required]")]
      .filter(field => !field.disabled && !field.closest("[hidden]"))
      .filter(field => String(field.value ?? "").trim() === "");
    if (missing.length) {
      return clearBaseline("Completează datele obligatorii din pașii 1–3 pentru prima estimare.");
    }
    return true;
  }

  async function refreshBaselineSummary() {
    if (current === "run" || current === "report" || !baselineSummaryReady()) return;
    const revision = ++baselineSummaryRevision;
    baselineSummaryController?.abort();
    baselineSummaryController = new AbortController();
    baselineBar.classList.add("is-updating");
    baselineStatus.textContent = "Actualizare…";
    try {
      syncTechnicalForm();
      const payload = baseFormData();
      const inputFingerprint = calculationInputFingerprint(payload);
      const response = await fetch("/api/home-lab-next/calculate", {
        method:"POST",
        body:payload,
        headers:{"Accept":"application/json"},
        signal:baselineSummaryController.signal,
      });
      const data = await readJson(response);
      if (revision !== baselineSummaryRevision) return;
      baselineResult = data;
      baselineInputFingerprint = inputFingerprint;
      paintBaselineSummary(data, `Estimare curentă · Input ${shortInputFingerprint(inputFingerprint)}`);
    } catch (error) {
      if (error?.name === "AbortError" || revision !== baselineSummaryRevision) return;
      showServiceNotice(error, "Serviciul RBPE");
      baselineBar.classList.remove("is-updating");
      baselineStatus.textContent = "Estimarea se actualizează după revenirea serviciului.";
    }
  }

  function scheduleBaselineSummary(delay = 650) {
    window.clearTimeout(baselineSummaryTimer);
    if (!baselineSummaryReady()) return;
    baselineBar.classList.add("is-updating");
    baselineSummaryTimer = window.setTimeout(refreshBaselineSummary, delay);
  }

  function runTeoV4Worker({kernel, searchSpec, searchBounds, branchIds, mode, goals, baselineAnnualBillLei, compliancePolicy}) {
    return new Promise((resolve, reject) => {
      if (!("Worker" in window)) {
        reject(new Error("Browserul nu suportă Web Worker pentru TEO V4."));
        return;
      }
      const worker = new Worker("/static/teo-v4-worker.js?v=6");
      let settled = false;
      const finish = (fn, value) => {
        if (settled) return;
        settled = true;
        worker.terminate();
        fn(value);
      };
      worker.onerror = event => {
        finish(reject, new Error(event?.message || "TEO V4 Web Worker a eșuat."));
      };
      worker.onmessage = event => {
        const message = event.data || {};
        if (message.type === "progress") {
          const completed = Number(message.completed || 0);
          const total = Number(message.total || 0);
          const branchIndex = Number(message.branchIndex || 0);
          const branchCount = Number(message.branchCount || 0);
          const phase = String(message.phase || "global");
          if (phase === "refine") {
            stage("branches","active",`refine ${completed}/${total}`);
            setTeoControlPhase(completed >= total ? 4 : 3, completed >= total ? "Reoptimizare conformă" : "Frontieră nZEB");
            log(
              `TEO refine local · rundă ${completed}/${total} · ramură ${branchIndex}/${branchCount} · ${Number(message.refinementEvaluations || 0)} evaluări locale suplimentare.`
            );
          } else {
            stage("branches","active",`${completed} / ${total}`);
            setTeoControlPhase(2,"Explorare economică");
            updateTeoStats({evaluated:completed});
            if (completed === total || completed % 1000 === 0) {
              log(
                `TEO V4 global · ${completed}/${total} evaluări · ramură ${branchIndex}/${branchCount} · ${Number(message.accepted || 0)} candidați valizi.`
              );
            }
          }
          return;
        }
        if (message.type === "error") {
          finish(reject, new Error(message.message || "TEO V4 Web Worker a eșuat."));
          return;
        }
        if (message.type === "done") {
          finish(resolve, message);
        }
      };
      worker.postMessage({
        type:"run",
        kernel,
        searchSpec,
        branchIds,
        searchBounds,
        mode,
        goals,
        baselineAnnualBillLei,
        compliancePolicy,
      });
    });
  }

  const OPTIMIZER_FINALIZE_HORIZONS = [5, 10, 15, 20, 25];

  function uniqueCandidatesLocal(candidates) {
    const byId = new Map();
    for (const candidate of candidates || []) {
      const id = String(candidate?.candidate_id || "");
      if (id) byId.set(id, candidate);
    }
    return [...byId.values()];
  }

  function paretoFrontierLocal(candidates) {
    const rows = uniqueCandidatesLocal(candidates);
    return rows
      .filter(candidate => !rows.some(other => {
        if (String(other?.candidate_id || "") === String(candidate?.candidate_id || "")) return false;
        const otherCapex = Number(other?.capex_lei || 0);
        const otherBill = Number(other?.annual_bill_lei || 0);
        const capex = Number(candidate?.capex_lei || 0);
        const bill = Number(candidate?.annual_bill_lei || 0);
        return (
          otherCapex <= capex + 1e-9
          && otherBill <= bill + 1e-9
          && (otherCapex < capex - 1e-9 || otherBill < bill - 1e-9)
        );
      }))
      .sort((a,b) =>
        Number(a?.capex_lei || 0) - Number(b?.capex_lei || 0)
        || Number(a?.annual_bill_lei || 0) - Number(b?.annual_bill_lei || 0)
      );
  }

  function robustRegretMetricsLocal(candidates) {
    const net = new Map();
    for (const candidate of candidates) {
      const id = String(candidate.candidate_id);
      const saving = Number(candidate.annual_saving_lei || 0);
      const capex = Number(candidate.capex_lei || 0);
      const byHorizon = {};
      for (const horizon of OPTIMIZER_FINALIZE_HORIZONS) {
        byHorizon[horizon] = saving * horizon - capex;
      }
      net.set(id, byHorizon);
    }
    const best = {};
    for (const horizon of OPTIMIZER_FINALIZE_HORIZONS) {
      best[horizon] = Math.max(...candidates.map(candidate =>
        Number(net.get(String(candidate.candidate_id))?.[horizon] ?? -Infinity)
      ));
    }
    const metrics = new Map();
    for (const candidate of candidates) {
      const id = String(candidate.candidate_id);
      const relative = [];
      const absolute = [];
      for (const horizon of OPTIMIZER_FINALIZE_HORIZONS) {
        const value = Number(net.get(id)?.[horizon] ?? 0);
        const regret = Number(best[horizon]) - value;
        const denominator = Math.max(Math.abs(Number(best[horizon])), 1);
        relative.push(regret / denominator);
        absolute.push(regret);
      }
      metrics.set(id, {
        worstRelative:Math.max(...relative),
        meanRelative:relative.reduce((sum,value) => sum + value, 0) / relative.length,
        absolute: absolute.reduce((sum,value) => sum + value, 0),
      });
    }
    return metrics;
  }

  function compareTupleLocal(left, right) {
    const count = Math.max(left.length, right.length);
    for (let i = 0; i < count; i++) {
      const a = Number(left[i] ?? 0);
      const b = Number(right[i] ?? 0);
      if (a < b) return -1;
      if (a > b) return 1;
    }
    return 0;
  }

  function selectOptimizationCandidateLocal(candidates, mode, goals, compliancePolicy = null) {
    const allUnique = uniqueCandidatesLocal(candidates);
    const target = compliancePolicy?.target || null;
    const complianceEnabled = Boolean(compliancePolicy?.enabled && target);
    const compliant = complianceEnabled
      ? allUnique.filter(candidate => candidateAvailableNzebPass(candidate, target))
      : [];
    if (complianceEnabled && !compliant.length) {
      throw new Error("Niciun finalist verificat RBPE nu respectă simultan pragurile nZEB disponibile pentru Eprim și CO₂.");
    }
    const unique = complianceEnabled ? compliant : allUnique;
    const frontier = paretoFrontierLocal(unique);
    if (!unique.length) throw new Error("Nu există finaliști locali pentru selecția economică.");

    let feasible = [];
    let selected = null;
    let rationale = "";

    if (mode === "investment_budget") {
      const budget = Number(goals?.investment_budget_lei || 0);
      feasible = unique.filter(item => Number(item.capex_lei || 0) <= budget + 1e-6);
      if (feasible.length) {
        selected = [...feasible].sort((a,b) => compareTupleLocal(
          [-Number(a.annual_saving_lei || 0), Number(a.capex_lei || 0), Number(a.annual_bill_lei || 0)],
          [-Number(b.annual_saving_lei || 0), Number(b.capex_lei || 0), Number(b.annual_bill_lei || 0)]
        ))[0];
      }
      rationale = `A fost selectată economia anuală maximă fără depășirea bugetului de ${budget.toFixed(2)} lei; egalitățile preferă investiția mai mică.`;
    } else if (mode === "annual_bill_target") {
      const target = Number(goals?.annual_bill_target_lei || 0);
      feasible = unique.filter(item => Number(item.annual_bill_lei || 0) <= target + 1e-6);
      if (feasible.length) {
        selected = [...feasible].sort((a,b) => compareTupleLocal(
          [Number(a.capex_lei || 0), Number(a.annual_bill_lei || 0), -Number(a.annual_saving_lei || 0)],
          [Number(b.capex_lei || 0), Number(b.annual_bill_lei || 0), -Number(b.annual_saving_lei || 0)]
        ))[0];
      }
      rationale = `A fost selectat CAPEX-ul minim care atinge factura anuală țintă de maximum ${target.toFixed(2)} lei.`;
    } else if (mode === "max_payback_years") {
      const limit = Number(goals?.max_payback_years || 0);
      feasible = unique.filter(item =>
        item.payback_years != null
        && Number(item.payback_years) <= limit + 1e-6
        && Number(item.annual_saving_lei || 0) > 0
      );
      if (feasible.length) {
        selected = [...feasible].sort((a,b) => compareTupleLocal(
          [-Number(a.annual_saving_lei || 0), Number(a.capex_lei || 0), Number(a.payback_years ?? Infinity)],
          [-Number(b.annual_saving_lei || 0), Number(b.capex_lei || 0), Number(b.payback_years ?? Infinity)]
        ))[0];
      }
      rationale = `Au fost acceptați numai candidații cu recuperare simplă ≤ ${limit.toFixed(2)} ani, apoi a fost aleasă economia anuală maximă.`;
    } else {
      const pool = frontier.length ? frontier : unique;
      feasible = pool;
      const metrics = robustRegretMetricsLocal(pool);
      selected = [...pool].sort((a,b) => {
        const ma = metrics.get(String(a.candidate_id));
        const mb = metrics.get(String(b.candidate_id));
        return compareTupleLocal(
          [
            ma?.worstRelative ?? Infinity,
            ma?.meanRelative ?? Infinity,
            -(Number(a.annual_saving_lei || 0) * 20 - Number(a.capex_lei || 0)),
            Number(a.capex_lei || 0),
          ],
          [
            mb?.worstRelative ?? Infinity,
            mb?.meanRelative ?? Infinity,
            -(Number(b.annual_saving_lei || 0) * 20 - Number(b.capex_lei || 0)),
            Number(b.capex_lei || 0),
          ]
        );
      })[0] || null;
      rationale = "TEO minimizează regretul economic relativ maxim pe orizonturile 5, 10, 15, 20 și 25 ani, folosind beneficiul net simplu (economie anuală × orizont − CAPEX).";
    }

    if (!selected) {
      throw new Error("Niciun finalist verificat nu satisface regula economică aleasă.");
    }
    return {
      selected,
      candidateCount:unique.length,
      feasibleCount:feasible.length,
      paretoCount:frontier.length,
      rationale:complianceEnabled
        ? `Conformarea disponibilă (Eprim + CO₂) este tratată ca restricție; dintre candidații verificați care o respectă, ${rationale}`
        : rationale,
      complianceEnabled,
      availableCompliantCount:compliant.length,
    };
  }

  function optimizerMeasureRowsLocal(candidate) {
    const labels = {
      wall:"Izolație pereți",
      roof:"Izolație acoperiș / pod",
      floor:"Izolație pardoseală",
      windows:"Ferestre",
      ventilation:"Ventilație cu recuperare",
      pv:"Fotovoltaice",
      solar_thermal:"Solar termic",
      heating:"Sistem de încălzire",
    };
    return (candidate?.cost_breakdown || [])
      .filter(line => Number(line?.capex_lei || 0) > 0)
      .map(line => ({
        family:line.family,
        label:labels[line.family] || String(line.family || "").replaceAll("_"," "),
        capexLei:Number(line.capex_lei || 0),
        parameterValue:Number(line.parameter_value || 0),
        parameterUnit:line.parameter_unit,
        sourceKind:line.source_kind,
        productId:line.product_id,
        sku:line.sku,
        quantity:line.quantity,
        quantityUnit:line.quantity_unit,
        materialSubtotalLei:line.material_subtotal_lei,
        nonmaterialSubtotalLei:line.nonmaterial_subtotal_lei,
        note:line.note,
      }));
  }

  function selectedHeatingLocal(candidate, productRow) {
    const line = (candidate?.cost_breakdown || []).find(item => item?.family === "heating");
    if (!line) return null;
    const basis = String(line.capacity_basis || "");
    const capacityVerified = Boolean(
      line.product_id
      && !["unverified","unavailable","missing"].some(marker => basis.includes(marker))
    );
    const required = candidate?.design_heat_load_kw == null ? null : Number(candidate.design_heat_load_kw);
    const available = line.design_available_capacity_kw == null ? null : Number(line.design_available_capacity_kw);
    const rated = line.product_id ? Number(line.parameter_value || 0) : null;
    const oversizeKw = (
      capacityVerified && required != null
        ? Math.max(Number(available ?? rated ?? 0) - required, 0)
        : null
    );
    const matched = productRow?.matchedProduct || null;
    return {
      label:String(line.note || matched?.label || "Sistem de încălzire").split(":",1)[0],
      capexLei:Number(line.capex_lei || 0),
      requiredPowerKw:required,
      planningPowerKw:Number(line.parameter_value || 0),
      ratedPowerKw:rated,
      availableDesignCapacityKw:capacityVerified ? available : null,
      provisionalCapacityKw:available ?? rated,
      capacityBasis:line.capacity_basis,
      capacityVerified,
      oversizeKw,
      oversizePercent:(
        oversizeKw == null || required == null || required <= 1e-9
          ? null
          : 100 * oversizeKw / required
      ),
      sourceKind:line.source_kind,
      sourceUrl:line.source_url,
      confidence:line.confidence,
      optionId:line.product_id,
      quantity:Number(line.quantity || productRow?.matchedProductQuantity || 1),
      quantityUnit:line.quantity_unit || null,
      technologyId:matched?.technology_id || productRow?.branchId || null,
      equipmentPriceLei:line.material_subtotal_lei,
      installationAllowanceLei:line.nonmaterial_subtotal_lei,
      sizingBasis:"design_heat_load_at_normative_winter_design_temperature",
    };
  }

  function candidateScenarioSnapshotLocal(candidate, formPayload) {
    return {
      locality:String(formPayload?.locality || formPayload?.locality_id || ""),
      annual_cost_lei:Number(candidate?.annual_bill_lei || 0),
      final_energy_kwh:Number(candidate?.final_energy_kwh || 0),
      primary_specific_kwh_m2:Number(candidate?.primary_specific_kwh_m2 || 0),
      co2_total_kg:Number(candidate?.co2_total_kg || 0),
      co2_specific_kg_m2:Number(candidate?.co2_specific_kg_m2 || 0),
      rer_percent:Number(candidate?.rer_percent || 0),
      onsite_renewable_percent:Number(candidate?.onsite_renewable_percent || 0),
      rer_status:candidate?.rer_status || null,
      energy_class:candidate?.energy_class || "—",
      design_heat_load_kw:candidate?.design_heat_load_kw ?? null,
      annual_fuel_use:{},
      assumptions:Array.isArray(candidate?.assumptions) ? [...candidate.assumptions] : [],
      scenario_detail:"canonical_scalar_snapshot_browser_finalize",
    };
  }

  function weightedEnvelopeU(config, type) {
    const rows = (config?.envelope || []).filter(item => String(item?.type || "") === type);
    const area = rows.reduce((sum,item) => sum + Number(item?.area_m2 || 0), 0);
    if (area <= 0) return null;
    return rows.reduce(
      (sum,item) => sum + Number(item?.area_m2 || 0) * Number(item?.u_value_w_m2k || 0),
      0
    ) / area;
  }

  function verificationErrorEnvelopeLocal(verifiedRows, targets) {
    const targetById = new Map(
      (targets || []).map(target => [
        String(target?.candidate?.candidate_id || ""),
        target?.candidate || null,
      ])
    );
    let billErrorLei = 0;
    let loadErrorKw = 0;
    let capexErrorLei = 0;
    for (const row of (verifiedRows || [])) {
      billErrorLei = Math.max(
        billErrorLei,
        Math.abs(Number(row?.annualBillDeltaLei || 0))
      );
      loadErrorKw = Math.max(
        loadErrorKw,
        Math.abs(Number(row?.designLoadDeltaKw || 0))
      );
      const source = targetById.get(String(row?.sourceCandidateId || ""));
      if (source && row?.candidate) {
        capexErrorLei = Math.max(
          capexErrorLei,
          Math.abs(
            Number(row.candidate.capex_lei || 0)
            - Number(source.capex_lei || 0)
          )
        );
      }
    }
    return {billErrorLei, loadErrorKw, capexErrorLei};
  }

  function predictedCompetitorCloseLocal({
    selected,
    unverifiedTargets,
    mode,
    goals,
    envelope,
  }) {
    if (!selected || !unverifiedTargets.length) return false;
    const billError = Math.max(Number(envelope.billErrorLei || 0), 50);
    const capexError = Math.max(Number(envelope.capexErrorLei || 0), 250);

    if (mode === "investment_budget") {
      const budget = Number(goals?.investment_budget_lei || 0);
      return unverifiedTargets.some(target => {
        const candidate = target?.candidate || {};
        return (
          Number(candidate.capex_lei || 0) <= budget + capexError
          && Number(candidate.annual_saving_lei || 0)
            >= Number(selected.annual_saving_lei || 0) - billError
        );
      });
    }

    if (mode === "annual_bill_target") {
      const targetBill = Number(goals?.annual_bill_target_lei || 0);
      return unverifiedTargets.some(target => {
        const candidate = target?.candidate || {};
        return (
          Number(candidate.annual_bill_lei || Infinity) <= targetBill + billError
          && Number(candidate.capex_lei || Infinity)
            <= Number(selected.capex_lei || 0) + capexError + 500
        );
      });
    }

    if (mode === "max_payback_years") {
      const limit = Number(goals?.max_payback_years || 0);
      return unverifiedTargets.some(target => {
        const candidate = target?.candidate || {};
        const payback = candidate.payback_years == null
          ? Infinity
          : Number(candidate.payback_years);
        return (
          payback <= limit + 0.5
          && Number(candidate.annual_saving_lei || 0)
            >= Number(selected.annual_saving_lei || 0) - billError
        );
      });
    }

    return unverifiedTargets.some(target => {
      const candidate = target?.candidate || {};
      let closeHorizons = 0;
      for (const years of OPTIMIZER_FINALIZE_HORIZONS) {
        const exactNet =
          Number(selected.annual_saving_lei || 0) * years
          - Number(selected.capex_lei || 0);
        const predictedNet =
          Number(candidate.annual_saving_lei || 0) * years
          - Number(candidate.capex_lei || 0);
        const uncertainty =
          years * billError
          + capexError
          + Math.max(250, 0.01 * Math.abs(exactNet));
        if (predictedNet >= exactNet - uncertainty) closeHorizons += 1;
      }
      return closeHorizons >= 2;
    });
  }

  function adaptiveVerificationDecisionLocal({
    verifiedRows,
    targets,
    mode,
    goals,
    compliancePolicy,
    maxVerifications,
  }) {
    const count = Number(verifiedRows?.length || 0);
    if (!count) {
      return {continueVerification:true, reason:"no_verified_candidate"};
    }
    if (count >= maxVerifications || count >= targets.length) {
      return {continueVerification:false, reason:"adaptive_limit_reached"};
    }

    let selection = null;
    try {
      selection = selectOptimizationCandidateLocal(
        verifiedRows.map(row => row?.candidate).filter(Boolean),
        mode,
        goals,
        compliancePolicy
      );
    } catch (_) {
      return {
        continueVerification:true,
        reason:"no_verified_candidate_satisfies_objective_yet",
      };
    }

    const envelope = verificationErrorEnvelopeLocal(verifiedRows, targets);
    const selected = selection.selected;
    const billTolerance = Math.max(
      75,
      0.01 * Math.max(Number(selected?.annual_bill_lei || 0), 1)
    );
    const loadTolerance = Math.max(
      0.05,
      0.01 * Math.max(Number(selected?.design_heat_load_kw || 0), 1)
    );
    const capexTolerance = Math.max(
      500,
      0.015 * Math.max(Number(selected?.capex_lei || 0), 1)
    );
    const surrogateStable = (
      envelope.billErrorLei <= billTolerance
      && envelope.loadErrorKw <= loadTolerance
      && envelope.capexErrorLei <= capexTolerance
    );

    const verifiedSourceIds = new Set(
      verifiedRows.map(row => String(row?.sourceCandidateId || ""))
    );
    const unverifiedTargets = targets.filter(
      target => !verifiedSourceIds.has(
        String(target?.candidate?.candidate_id || "")
      )
    );
    const competitorClose = predictedCompetitorCloseLocal({
      selected,
      unverifiedTargets,
      mode,
      goals,
      envelope,
    });

    if (mode === "auto_economic" && count < 2) {
      return {
        continueVerification:true,
        reason:"auto_mode_requires_two_exact_points",
        surrogateStable,
        competitorClose,
        envelope,
      };
    }
    if (!surrogateStable) {
      return {
        continueVerification:true,
        reason:"surrogate_error_requires_more_exact_checks",
        surrogateStable,
        competitorClose,
        envelope,
      };
    }
    if (competitorClose) {
      return {
        continueVerification:true,
        reason:"economic_competitor_inside_uncertainty_band",
        surrogateStable,
        competitorClose,
        envelope,
      };
    }
    return {
      continueVerification:false,
      reason:"exact_winner_stable_outside_uncertainty_band",
      surrogateStable,
      competitorClose,
      envelope,
    };
  }

  function engineeringSpecLocal(candidate, verifiedRow) {
    const config = candidate?.resulting_configuration || {};
    const parameters = candidate?.parameters || {};
    const lambda = lastPlan?.kernel?.normalization_lambda || {};
    const envelopeFamily = (family, type, addedRKey) => {
      const addedR = Number(parameters?.[addedRKey] || 0);
      const lambdaValue = Number(lambda?.[family] || 0);
      return {
        family,
        final_u_w_m2k:weightedEnvelopeU(config, type),
        added_r_m2k_w:addedR,
        reference_lambda_w_mk:lambdaValue > 0 ? lambdaValue : null,
        equivalent_insulation_thickness_cm:(
          lambdaValue > 0 ? addedR * lambdaValue * 100 : null
        ),
        lambda_is_optimized:false,
        optimized_quantity:"thermal_resistance_and_resulting_u_value",
      };
    };

    const bridges = Array.isArray(config?.thermal_bridges)
      ? config.thermal_bridges
      : [];
    const psiL = bridges.reduce(
      (sum,item) => sum + Number(item?.psi_w_mk || 0) * Number(item?.length_m || 0),
      0
    );
    const bridgeLength = bridges.reduce(
      (sum,item) => sum + Number(item?.length_m || 0),
      0
    );
    const heatingLine = (candidate?.cost_breakdown || []).find(
      item => item?.family === "heating"
    ) || null;
    const heating = config?.heating || {};
    const details = heating?.details || {};
    const branchId = String(verifiedRow?.branchId || "");
    const branchProfile = (lastPlan?.kernel?.branches || []).find(
      item => String(item?.branch_id || "") === branchId
    ) || {};
    const pv = config?.renewables?.pv || {};
    const solarThermal = config?.renewables?.solar_thermal || {};

    return {
      envelope:{
        wall:envelopeFamily("wall", "exterior_wall", "wall_added_r_m2k_w"),
        roof:envelopeFamily("roof", "roof", "roof_added_r_m2k_w"),
        floor:envelopeFamily("floor", "floor", "floor_added_r_m2k_w"),
        windows:{
          final_u_w_m2k:weightedEnvelopeU(config, "window"),
          replacement_fraction:Number(parameters?.window_replacement_fraction || 0),
          target_u_w_m2k:Number(parameters?.window_target_u_w_m2k || 0),
        },
      },
      thermal_bridges:{
        sum_psi_l_w_k:psiL,
        total_length_m:bridgeLength,
        weighted_mean_psi_w_mk:bridgeLength > 0 ? psiL / bridgeLength : null,
        optimized:false,
        rows:bridges.map(item => ({
          name:item?.name || "",
          length_m:Number(item?.length_m || 0),
          psi_w_mk:Number(item?.psi_w_mk || 0),
          component:item?.component || null,
        })),
      },
      ventilation:{
        air_changes_per_hour:Number(config?.ventilation?.air_changes_per_hour || 0),
        infiltration_air_changes_per_hour:Number(
          config?.ventilation?.infiltration_air_changes_per_hour || 0
        ),
        heat_recovery_efficiency:Number(
          config?.ventilation?.heat_recovery_efficiency || 0
        ),
        optimized_heat_recovery_target:Number(
          parameters?.ventilation_heat_recovery_efficiency_target || 0
        ),
      },
      heating:{
        technology_branch:String(verifiedRow?.branchId || ""),
        design_required_power_kw:Number(
          candidate?.design_heat_load_kw
          ?? heatingLine?.parameter_value
          ?? 0
        ),
        installed_power_target_kw:Number(
          heatingLine?.parameter_value
          ?? candidate?.design_heat_load_kw
          ?? 0
        ),
        design_flow_temperature_c:details?.design_flow_temperature_c ?? null,
        design_return_temperature_c:details?.design_return_temperature_c ?? null,
        scop_model:(
          String(branchProfile?.heating_generator_performance_kind || "") === "scop"
            ? Number(branchProfile?.heating_generator_performance)
            : (heating?.scop ?? null)
        ),
        effective_system_performance:branchProfile?.heating_effective_system_performance ?? null,
        performance_source:branchProfile?.heating_performance_source || null,
        performance_confidence:branchProfile?.heating_performance_confidence || null,
        generator_performance_kind:branchProfile?.heating_generator_performance_kind || null,
        generator_performance_value:branchProfile?.heating_generator_performance ?? null,
        efficiency_target:heating?.efficiency ?? null,
        system_type:heating?.system_type || null,
        generator_type:details?.generator_type || null,
        product_selected:false,
      },
      pv:{
        installed_power_kwp:Number(pv?.installed_power_kwp || 0),
        added_power_kwp:Number(parameters?.pv_added_kwp || 0),
        performance_ratio:pv?.performance_ratio ?? parameters?.pv_performance_ratio ?? null,
        orientation:pv?.orientation || null,
        tilt_degrees:pv?.tilt_degrees ?? null,
      },
      solar_thermal:{
        collector_area_m2:Number(solarThermal?.collector_area_m2 || 0),
        added_area_m2:Number(parameters?.solar_thermal_added_m2 || 0),
        system_efficiency:solarThermal?.system_efficiency
          ?? parameters?.solar_thermal_system_efficiency
          ?? null,
        orientation:solarThermal?.orientation || null,
        tilt_degrees:solarThermal?.tilt_degrees ?? null,
      },
    };
  }

  function buildBrowserFinalization({
    formPayload,
    mode,
    goals,
    verifiedRows,
    branchStats,
    branchPlan,
    backendElapsedMs,
    sourceCandidateCount,
    branchFastEvaluations,
    searchPointCount,
    verificationFrontierCount,
    refinementEvaluations,
    browserSearchMethod,
    adaptiveVerification,
    compliancePolicy,
    runId,
  }) {
    const verifiedCandidates = (verifiedRows || [])
      .map(row => row?.candidate)
      .filter(Boolean);
    const selection = selectOptimizationCandidateLocal(
      verifiedCandidates,
      mode,
      goals,
      compliancePolicy
    );
    const selected = selection.selected;
    const selectedVerifiedRow = (verifiedRows || []).find(
      row => String(row?.candidate?.candidate_id || "") === String(selected?.candidate_id || "")
    ) || null;
    const scenario = candidateScenarioSnapshotLocal(selected, formPayload);
    const engineeringSpec = engineeringSpecLocal(selected, selectedVerifiedRow);
    const capex = Number(selected.capex_lei || 0);
    const saving = Number(selected.annual_saving_lei || 0);
    let economicStatus = "incomplete_economic_result";
    let paybackStatus = "unavailable";
    if (capex <= 1e-9 && saving <= 1e-9) {
      economicStatus = "no_positive_intervention";
      paybackStatus = "not_applicable_no_investment";
    } else if (capex <= 1e-9 && saving > 1e-9) {
      economicStatus = "positive_saving_zero_capex";
      paybackStatus = "immediate";
    } else if (saving > 1e-9 && selected.payback_years != null) {
      economicStatus = "positive_saving";
      paybackStatus = "finite";
    } else if (saving <= 0) {
      economicStatus = "non_positive_saving";
      paybackStatus = "never_at_current_prices";
    }

    const netBenefit = {};
    for (const years of OPTIMIZER_FINALIZE_HORIZONS) {
      netBenefit[String(years)] = Math.round((saving * years - capex) * 100) / 100;
    }

    const branches = (branchPlan || []).map(branch => {
      const stats = (branchStats || []).find(
        item => String(item?.branchId || "") === String(branch?.branch_id || "")
      );
      if (!stats) return branch;
      return {
        ...branch,
        evaluated_candidates:Number(stats.evaluatedCandidates || 0),
        accepted_candidates:Number(stats.acceptedCandidates || 0),
        feasible_candidates:Number(stats.feasibleCandidates || 0),
      };
    });
    const feasibleTotal = branches.reduce(
      (sum,item) => sum + Number(item?.feasible_candidates || 0),
      0
    );
    const warnings = [
      "TEO produce exclusiv optimul parametric tehnico-economic; produsele comerciale nu participă la alegerea soluției.",
      "Discretizarea în SKU-uri reale este o etapă separată, ulterioară rezultatului TEO.",
      "TEO Worker Flow serializează verificările canonice și aplică 1–3 VERIFY adaptiv, cu cooldown persistent în D1 între calculele RBPE grele.",
      "Căutarea TEO combină explorarea globală Halton cu două runde de rafinare locală în jurul zonelor economice/Pareto promițătoare.",
      "λ-urile afișate pentru anvelopă sunt valorile de calcul/reference folosite la transformarea R↔grosime; în această versiune TEO optimizează R și U rezultat, nu λ ca material comercial independent.",
      "Valorile ψ provin din modelul clădirii și sunt raportate inginerește; optimizarea explicită a punților termice va necesita o variabilă TEO separată.",
      "RER Home Lab este un indicator tehnic conservator pe perimetrul explicit al serviciilor reglementate: include fPren/fPnren pentru energia livrată, PV onsite autoconsumat reglementat și solar termic utilizat la ACM; exclude exportul PV, consumul casnic și, până la validarea metodei generale, energia de mediu a pompelor de căldură.",
      "Un rezultat tehnic nZEB nu este promovat ca verdict juridic: garanțiile de origine și orice cerință suplimentară 2026 stabilită oficial trebuie verificate documentar.",
    ];
    for (const row of (verifiedRows || [])) {
      for (const warning of (row?.warnings || [])) {
        if (warning) warnings.push(String(warning));
      }
    }

    return {
      scenario,
      optimization:{
        kind:"parametric_economic",
        mode:"parametric_economic",
        economicMode:mode,
        label:lastPlan?.label || "Optimizare economică",
        rationale:selection.rationale,
        capexLei:capex,
        baselineAnnualBillLei:Number(selected.baseline_annual_bill_lei || 0),
        annualBillLei:Number(selected.annual_bill_lei || 0),
        annualSavingLei:saving,
        economicStatus,
        paybackStatus,
        simpleNetBenefitLeiByHorizon:netBenefit,
        economicHorizonsYears:[...OPTIMIZER_FINALIZE_HORIZONS],
        roiPercentPerYear:selected.roi_percent_per_year == null ? null : Number(selected.roi_percent_per_year),
        paybackYears:selected.payback_years == null ? null : Number(selected.payback_years),
        selected:optimizerMeasureRowsLocal(selected),
        selectedHeating:null,
        heatPumpPerformanceProfile:null,
        engineeringSpec,
        evaluatedCandidates:Number(sourceCandidateCount || 0),
        calculationTimeMs:Number(backendElapsedMs || 0),
        parametricEvaluations:Number(branchFastEvaluations || 0),
        heatingBranchEvaluations:Number(branchFastEvaluations || 0),
        feasibleCandidates:Number(feasibleTotal || selection.feasibleCount || 0),
        paretoSolutions:Number(selection.paretoCount || 0),
        paretoScope:"verified_parametric_teo_only",
        compliancePolicy:compliancePolicy || {enabled:false,target:null},
        availableCompliantFinalists:Number(selection.availableCompliantCount || 0),
        technicalNzebPass:Boolean(
          compliancePolicy?.enabled
          && candidateAvailableNzebPass(selected, compliancePolicy?.target)
        ),
        fullLegalNzebCompliance:false,
        rerStatus:compliancePolicy?.enabled
          ? "bounded_technical_model_go_evidence_required"
          : "not_requested",
        heatingBranches:branches,
        technicalHeatingAlternatives:[],
        rawSolution:selected?.parameters || {},
        rawEvaluation:{
          candidateId:selected?.candidate_id,
          annualBillLei:Number(selected?.annual_bill_lei || 0),
          baselineAnnualBillLei:Number(selected?.baseline_annual_bill_lei || 0),
          finalEnergyKwh:Number(selected?.final_energy_kwh || 0),
          primarySpecificKwhM2:Number(selected?.primary_specific_kwh_m2 || 0),
          co2TotalKg:Number(selected?.co2_total_kg || 0),
          co2SpecificKgM2:Number(selected?.co2_specific_kg_m2 || 0),
          rerPercent:Number(selected?.rer_percent || 0),
          onsiteRenewablePercent:Number(selected?.onsite_renewable_percent || 0),
          rerStatus:selected?.rer_status || null,
          energyClass:selected?.energy_class,
          designHeatLoadKw:selected?.design_heat_load_kw ?? null,
        },
        parametricEvaluation:{
          candidateId:selected?.candidate_id,
          annualBillLei:Number(selected?.annual_bill_lei || 0),
          capexLei:capex,
          annualSavingLei:saving,
          finalEnergyKwh:Number(selected?.final_energy_kwh || 0),
          primarySpecificKwhM2:Number(selected?.primary_specific_kwh_m2 || 0),
          co2SpecificKgM2:Number(selected?.co2_specific_kg_m2 || 0),
          rerPercent:Number(selected?.rer_percent || 0),
          onsiteRenewablePercent:Number(selected?.onsite_renewable_percent || 0),
          rerStatus:selected?.rer_status || null,
          energyClass:selected?.energy_class,
          designHeatLoadKw:selected?.design_heat_load_kw ?? null,
        },
        resultingConfiguration:selected?.resulting_configuration || null,
        commercialSolution:null,
        commercializationStatus:"deferred_after_teo",
        commercialReady:false,
        commercialMessage:"Discretizarea comercială este intenționat separată de TEO și se execută numai după acceptarea optimului parametric.",
        discretization:[],
        costSource:selected?.cost_source,
        costCatalogVersion:selected?.cost_catalog_version,
        warnings,
        autoHorizonsYears:mode === "auto_economic" ? [...OPTIMIZER_FINALIZE_HORIZONS] : [],
        executionMode:"browser_refine_adaptive_verify_parametric_teo",
        optimizerVersion:"teo-v4-adaptive-parametric",
        searchMethod:browserSearchMethod || lastPlan?.searchMethod || "teo_v4_halton_plus_local_refinement",
        representativeEvaluations:Number(lastPlan?.representativeEvaluations || 0),
        branchFastEvaluations:Number(branchFastEvaluations || 0),
        refinementEvaluations:Number(refinementEvaluations || 0),
        fullEngineVerifications:Number(verifiedRows.length || 0),
        adaptiveVerificationReason:String(adaptiveVerification?.reason || ""),
        adaptiveVerificationStable:Boolean(adaptiveVerification && !adaptiveVerification.continueVerification),
        commercialRechecks:0,
        commercialMatches:0,
        commercialRecheckTargetCount:0,
        commercialRecheckFailures:0,
        searchPointCount:Number(searchPointCount || 0),
        branchBatchSize:0,
        verificationFrontierCount:Number(verificationFrontierCount || 0),
        runId:String(runId || ""),
        heatingCatalogSource:"not_loaded_in_teo_finalize",
        finalizeRecalculations:0,
        finalizeCatalogReads:0,
        finalizeHttpRequests:0,
      },
    };
  }

  function focusTeoProgressOnMobile() {
    if (!window.matchMedia("(max-width: 720px)").matches) return;
    const target = $("#edTeoSteps");
    if (!target) return;
    const reducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    requestAnimationFrame(() => {
      target.scrollIntoView({
        behavior:reducedMotion ? "auto" : "smooth",
        block:"center",
        inline:"nearest",
      });
    });
  }

  async function runAnalysis() {
    syncTechnicalForm();
    syncGoalField();
    syncNzebPolicy();
    if (!validatePage("goal")) return;
    resetRunUi();
    resetTeoControlUi();
    baselineResult = null;
    optimizationResult = null;
    teoInputFingerprint = "";
    syncTeoRecalculationCue();
    lastPlan = null;
    branchResults = [];
    const runId = makeOptimizerRunId();
    const runButton = $("#runAnalysis");
    if (runButton) runButton.disabled = true;
    setTeoControlPhase(1,"Analizez configurația");
    focusTeoProgressOnMobile();
    log(`RUN · ${runId}`);

    try {
      stage("baseline","active","rulează");
      log("Construiesc modelul termic al casei actuale din setul complet de inputuri Home Lab.");
      const baselinePayload = baseFormData();
      const runInputFingerprint = calculationInputFingerprint(baselinePayload);
      baselineInputFingerprint = runInputFingerprint;
      log(`INPUT RBPE · ${shortInputFingerprint(runInputFingerprint)} · model ${CALCULATION_MODEL_VERSION}`);
      baselineResult = await postForm(
        "/api/home-lab-next/calculate",
        baselinePayload,
        // A Cloudflare 500/1101 at baseline can mean the current Python
        // isolate is already resource-exhausted. Immediate retry against the
        // same isolate only raises peak pressure and hides the first failure.
        {stageName:"baseline", runId, retries:0}
      );
      paintBaselineSummary(baselineResult, `Baseline optimizare · Input ${shortInputFingerprint(baselineInputFingerprint)}`);
      stage("baseline","done","gata");
      setTeoControlPhase(2,"Pregătesc explorarea");
      log(`Baseline gata: ${fmt(baselineResult.final_energy_kwh)} kWh/an · necesar ${fmt(baselineResult.design_heat_load_kw,1)} kW.`);
      log(`WORKER FLOW · pauză ${(TEO_SERVER_PROFILE.cooldownMs / 1000).toFixed(1)} s înainte de PLAN pentru a reduce presiunea cumulată pe Python Worker.`);
      await sleep(TEO_SERVER_PROFILE.cooldownMs);

      stage("plan","active","rulează");
      log("Generez TEO V4: mii de puncte parametrice pentru execuție locală în Web Worker; Python rămâne autoritatea pentru finaliști.");
      const planData = baseFormData();
      planData.set("_optimizer_run_id", runId);
      lastPlan = await postForm(
        "/api/optimization/home-lab/v4/plan",
        planData,
        {stageName:"plan TEO V4", runId, retries:TEO_SERVER_PROFILE.heavyRetries}
      );
      const searchSpec = lastPlan.searchSpec || {};
      const searchPointCount = Number(lastPlan.searchPointCount || 0);
      const branchIds = Array.isArray(lastPlan.runBranchIds) ? lastPlan.runBranchIds : [];
      if (!branchIds.length || !searchPointCount || !lastPlan.kernel) {
        throw new Error("TEO V4 nu a construit kernelul sau specificația locală de căutare.");
      }
      stage("plan","done", `${searchPointCount} puncte locale`);
      log(`TEO V4: ${searchPointCount} puncte/ramură generate în browser · ${lastPlan.deterministicAxisPoints || 0} axe deterministe · ${lastPlan.lowDiscrepancyPoints || 0} low-discrepancy · ${lastPlan.serverGeneratedSearchPoints || 0} puncte materializate pe server.`);
      log(`Metodă: ${lastPlan.searchMethod || "teo_v4_browser_worker_mc001_kernel"} · execuție ${lastPlan.executionMode || "browser_web_worker_v4"}.`);
      const catalogStats = lastPlan.heatingCatalogStats || {};
      log(`Catalog încălzire: ${catalogStats.products ?? "?"} SKU-uri comerciale · ${catalogStats.parametric_nodes ?? "?"} noduri parametrice · ${catalogStats.performance_points ?? "?"} puncte COP/capacitate · sursă ${lastPlan.heatingCatalogSource || "?"}.`);

      stage("branches","active","pornește Web Worker");
      const formPayload = formObject();
      formPayload._optimizer_run_id = runId;
      let backendElapsedMs = Number(lastPlan.calculationTimeMs || 0);
      const goals = {
        investment_budget_lei:Number(formPayload._investment_budget_lei || 0),
        annual_bill_target_lei:Number(formPayload._annual_bill_target_lei || 0),
        max_payback_years:Number(formPayload._max_payback_years || 0),
      };
      const compliancePolicy = {
        enabled:nzebConstraintEnabled(),
        target:lastPlan?.kernel?.compliance_target || baselineResult?.nzeb_target || null,
      };
      if (compliancePolicy.enabled && !compliancePolicy.target) {
        throw new Error(
          "Ținta nZEB este activă, dar pragurile normative nu au putut fi determinate pentru localitatea/clădirea selectată."
        );
      }
      log(
        compliancePolicy.enabled
          ? "CONSTRAINT · nZEB activ: TEO explorează economic, apoi reoptimizează în domeniul Eprim + CO₂ + SRE onsite. RER total este calculat, iar garanțiile de origine rămân dovadă externă."
          : "CONSTRAINT · nZEB dezactivat: TEO optimizează strict obiectivul economic ales."
      );
      log(`TEO V4 local: ${searchPointCount * branchIds.length} evaluări planificate în browser, fără request HTTP per candidat.`);
      const localSearch = await runTeoV4Worker({
        kernel:lastPlan.kernel,
        searchSpec,
        searchBounds:lastPlan.searchBounds || {},
        branchIds,
        mode:lastPlan.economicMode || formPayload._optimization_mode || "auto_economic",
        goals,
        baselineAnnualBillLei:Number(baselineResult?.annual_cost_lei || 0),
        compliancePolicy,
      });
      const candidateRows = Array.isArray(localSearch.candidateRows)
        ? localSearch.candidateRows
        : [];
      const branchStats = Array.isArray(localSearch.branchStats)
        ? localSearch.branchStats
        : [];
      const branchFastEvaluations = Number(localSearch.fastEvaluations || 0);
      const refinementEvaluations = Number(localSearch.refinementEvaluations || 0);
      const browserSearchMethod = String(
        localSearch.searchMethod || lastPlan.searchMethod || "teo_v4_halton_plus_local_refinement"
      );
      const localSourceCandidateCount = Number(
        localSearch.sourceCandidateCount || candidateRows.length
      );
      if (!candidateRows.length) {
        throw new Error("TEO V4 nu a produs candidați valizi pentru verificarea canonică.");
      }
      updateTeoStats({
        evaluated:branchFastEvaluations,
        compliant:Number(localSearch.availableCompliantCount || 0),
        finalists:Number(localSearch.verificationCount || localSearch.verificationRows?.length || 0),
      });
      setTeoControlPhase(compliancePolicy.enabled ? 4 : 3, compliancePolicy.enabled ? "Reoptimizez soluțiile conforme" : "Construiesc frontiera");
      stage("branches","done",`${branchFastEvaluations} evaluări locale`);
      log(
        `TEO V4 local gata în ${Number(localSearch.calculationTimeMs || 0).toFixed(1)} ms · ${localSourceCandidateCount} candidați valizi · ${refinementEvaluations} evaluări de rafinare · frontiera locală ${Number(localSearch.frontierCount || 0)} · ${candidateRows.length} candidați diverși trimiși la verificare.`
      );

      stage("finalize","active","selectează");
      const targets = Array.isArray(localSearch.verificationRows)
        ? localSearch.verificationRows
        : [];
      if (!targets.length) {
        throw new Error("TEO V4 nu a selectat local finaliști pentru verificare canonică.");
      }
      log(
        `Shortlist canonic selectat local: ${targets.length} finaliști din ${candidateRows.length} candidați diverși · Pareto ${Number(localSearch.frontierCount || 0)} · fără request Python pentru ranking.`
      );
      updateTeoStats({finalists:targets.length});
      setTeoControlPhase(5,"Verific finalistul cu RBPE");

      const verifiedRows = [];
      let verifyFailures = 0;
      const verifyLimit = Math.max(
        1,
        Math.min(targets.length, TEO_SERVER_PROFILE.maxVerifyPasses)
      );
      const verifyTargets = targets.slice(0, verifyLimit);
      let adaptiveVerification = {
        continueVerification:true,
        reason:"not_started",
      };

      const flowStart = await startTeoWorkerFlow(runId, verifyLimit);
      log(
        `WORKER FLOW · ${flowStart.storage || "runtime"} · VERIFY adaptiv 1–${verifyLimit} · max ${TEO_SERVER_PROFILE.maxCanonicalPasses} treceri canonice = BASELINE + PLAN + până la ${verifyLimit} VERIFY.`
      );

      for (let i = 0; i < verifyTargets.length; i++) {
        const target = verifyTargets[i];
        log(`VERIFY ${i + 1}/${verifyTargets.length} · ${target.branchId} · RBPE complet într-un slot serializat.`);
        try {
          const verified = await verifyWithTeoWorkerFlow({
            runId,
            formPayload,
            target,
            baselineAnnualBillLei:Number(baselineResult?.annual_cost_lei || 0),
            ordinal:i + 1,
            total:verifyTargets.length,
          });
          verifiedRows.push(verified);
          backendElapsedMs += Number(verified.calculationTimeMs || 0);

          adaptiveVerification = adaptiveVerificationDecisionLocal({
            verifiedRows,
            targets,
            mode:lastPlan.economicMode || formPayload._optimization_mode || "auto_economic",
            goals,
            compliancePolicy,
            maxVerifications:verifyLimit,
          });
          log(
            `ADAPTIVE VERIFY · ${adaptiveVerification.reason} · exact ${verifiedRows.length}/${verifyLimit}.`
          );
          if (!adaptiveVerification.continueVerification) break;
          if (
            verified?.workerFlow?.storage === "none"
            && i + 1 < verifyTargets.length
          ) {
            log(
              `WORKER FLOW · fără D1 persistent; aplic cooldown local de ${(TEO_SERVER_PROFILE.cooldownMs / 1000).toFixed(1)} s înainte de următorul VERIFY.`
            );
            await sleep(TEO_SERVER_PROFILE.cooldownMs);
          }
        } catch (error) {
          verifyFailures += 1;
          log(
            `VERIFY ${i + 1}/${verifyTargets.length} eșuat după retry/failover · ${error?.message || String(error)} · rezultatul NU este publicat dintr-un subset parțial.`
          );
          throw new Error(
            `Verificarea RBPE a finalistului ${i + 1}/${verifyTargets.length} nu a reușit. TEO oprește finalizarea pentru a păstra determinismul.`
          );
        }
      }
      await finishTeoWorkerFlow(runId);

      if (!verifiedRows.length || verifyFailures > 0) {
        throw new Error("Setul de verificări RBPE este incomplet. TEO nu publică un rezultat dintr-un subset parțial.");
      }

      log(
        `TEO PARAMETRIC · ${verifiedRows.length} verificări canonice adaptive gata · ${adaptiveVerification.reason}. Discretizarea comercială rămâne separată.`
      );

      log("REPORT · selecție finală + asamblare raport direct în browser; 0 request-uri suplimentare către Python Worker.");
      optimizationResult = buildBrowserFinalization({
        formPayload,
        mode:lastPlan.economicMode || formPayload._optimization_mode || "auto_economic",
        goals,
        verifiedRows,
        branchStats,
        branchPlan:Array.isArray(lastPlan.branches) ? lastPlan.branches : [],
        backendElapsedMs,
        sourceCandidateCount:localSourceCandidateCount,
        branchFastEvaluations,
        searchPointCount:Number(localSearch.searchPointCount || searchPointCount),
        verificationFrontierCount:Number(localSearch.frontierCount || 0),
        refinementEvaluations,
        browserSearchMethod,
        adaptiveVerification,
        compliancePolicy,
        runId,
      });
      stage("finalize","done","gata");
      teoInputFingerprint = runInputFingerprint;
      const opt = optimizationResult.optimization || {};
      log(`Finalizat: ${opt.evaluatedCandidates || 0} candidați economici · ${opt.fullEngineVerifications || 0} verificări complete · status economic ${opt.economicStatus || "necunoscut"}.`);

      renderReport();
      paintBaselineSummary(
        optimizationSummaryForPersistentBar(),
        "Rezultat TEO verificat · după intervenții."
      );
      renderTeoResult();
      syncTeoRecalculationCue();
      renderProgressHistory();
      const finalSummary = {
        ...(baselineResult || {}),
        primary_specific_kwh_m2:opt.parametricEvaluation?.primarySpecificKwhM2,
        co2_specific_kg_m2:opt.parametricEvaluation?.co2SpecificKgM2,
        rer_percent:opt.parametricEvaluation?.rerPercent,
        onsite_renewable_percent:opt.parametricEvaluation?.onsiteRenewablePercent,
        _summary_scope:"teo_final",
      };
      renderNzebStatus(finalSummary);
      log("UI · rezultatul TEO rămâne pe pagina 5; raportul complet este disponibil în pasul 6.");
    } catch (error) {
      Object.entries(stageEls).forEach(([name, el]) => {
        if (el.classList.contains("is-active")) stage(name,"error","eroare");
      });
      log("EROARE · " + (error?.message || String(error)));
      const panel = $(".ed-teo-control-panel");
      panel?.classList.remove("is-running","is-done");
      const state = $("#edTeoRunState");
      if (state) state.textContent = "Eroare";
      const message = $("#edNzebMessage");
      if (message) message.querySelector("span").textContent = error?.message || "Optimizarea TEO nu a putut fi finalizată.";
      showPage("goal");
    } finally {
      if (runButton) runButton.disabled = false;
    }
  }

  function escapeHtml(value) {
    return String(value ?? "").replace(/[&<>"']/g, ch => ({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#039;"}[ch]));
  }

  function metric(label, value) {
    return `<div class="ed-metric"><small>${escapeHtml(label)}</small><strong>${escapeHtml(value)}</strong></div>`;
  }

  const MONTH_SHORT_LABELS = Object.freeze({
    "1":"Ian","01":"Ian","jan":"Ian","january":"Ian","ian":"Ian","ianuarie":"Ian",
    "2":"Feb","02":"Feb","feb":"Feb","february":"Feb","februarie":"Feb",
    "3":"Mar","03":"Mar","mar":"Mar","march":"Mar","martie":"Mar",
    "4":"Apr","04":"Apr","apr":"Apr","april":"Apr","aprilie":"Apr",
    "5":"Mai","05":"Mai","may":"Mai","mai":"Mai",
    "6":"Iun","06":"Iun","jun":"Iun","june":"Iun","iun":"Iun","iunie":"Iun",
    "7":"Iul","07":"Iul","jul":"Iul","july":"Iul","iul":"Iul","iulie":"Iul",
    "8":"Aug","08":"Aug","aug":"Aug","august":"Aug",
    "9":"Sep","09":"Sep","sep":"Sep","september":"Sep","septembrie":"Sep",
    "10":"Oct","oct":"Oct","october":"Oct","octombrie":"Oct",
    "11":"Nov","nov":"Nov","november":"Nov","noiembrie":"Nov",
    "12":"Dec","dec":"Dec","december":"Dec","decembrie":"Dec",
  });

  function shortMonthLabel(value, index) {
    const key = String(value ?? "").trim().toLowerCase();
    return MONTH_SHORT_LABELS[key] || ["Ian","Feb","Mar","Apr","Mai","Iun","Iul","Aug","Sep","Oct","Nov","Dec"][index] || String(value || "—");
  }

  function monthlyBillProfile(result) {
    const annualBill = Number(result?.annual_cost_lei);
    if (!Number.isFinite(annualBill) || annualBill < 0) return [];

    const pricedRows = Array.isArray(result?.monthly_costs) ? result.monthly_costs : [];
    if (
      pricedRows.length === 12
      && pricedRows.every(row => row?.cost_lei != null && row?.complete !== false)
    ) {
      return pricedRows.map((row,index) => ({
        month:shortMonthLabel(row?.month, index),
        costLei:Number(row?.cost_lei || 0),
        exact:true,
      }));
    }

    const rows = Array.isArray(result?.monthly) ? result.monthly : [];
    if (rows.length !== 12) return [];

    const annualHeatingUseful = rows.reduce((sum,row) => sum + Math.max(Number(row?.useful_heating_kwh || 0), 0), 0);
    const annualCoolingUseful = rows.reduce((sum,row) => sum + Math.max(Number(row?.useful_cooling_kwh || 0), 0), 0);
    const heatingFinal = Math.max(Number(result?.heating?.final_kwh || 0), 0);
    const coolingFinal = Math.max(Number(result?.cooling?.final_kwh || 0), 0);
    const totalFinal = Math.max(Number(result?.final_energy_kwh ?? result?.total_final_energy_kwh ?? 0), 0);
    const otherFinal = Math.max(totalFinal - heatingFinal - coolingFinal, 0);
    const totalDays = Math.max(rows.reduce((sum,row) => sum + Math.max(Number(row?.days || 0), 0), 0), 1);
    const heatingRatio = annualHeatingUseful > 1e-9 ? heatingFinal / annualHeatingUseful : 0;
    const coolingRatio = annualCoolingUseful > 1e-9 ? coolingFinal / annualCoolingUseful : 0;

    const proxies = rows.map(row => (
      Math.max(Number(row?.useful_heating_kwh || 0), 0) * heatingRatio
      + Math.max(Number(row?.useful_cooling_kwh || 0), 0) * coolingRatio
      + otherFinal * Math.max(Number(row?.days || 0), 0) / totalDays
    ));
    let proxyTotal = proxies.reduce((sum,value) => sum + value, 0);
    if (proxyTotal <= 1e-9) {
      for (let index=0; index<proxies.length; index++) {
        proxies[index] = Math.max(Number(rows[index]?.days || 0), 1);
      }
      proxyTotal = proxies.reduce((sum,value) => sum + value, 0);
    }

    return rows.map((row,index) => ({
      month:shortMonthLabel(row?.month, index),
      costLei:annualBill * proxies[index] / proxyTotal,
    }));
  }

  function renderMonthlyBillSection(result, optimizedResult, optimizedAnnualBill) {
    const before = monthlyBillProfile(result);
    if (!before.length) return "";
    const afterExact = monthlyBillProfile(optimizedResult);
    const baselineAnnual = Math.max(Number(result?.annual_cost_lei || 0), 0);
    const finalAnnual = Math.max(Number(optimizedAnnualBill || 0), 0);
    const factor = baselineAnnual > 1e-9 ? finalAnnual / baselineAnnual : 0;
    const hasExactAfter = afterExact.length === 12;
    const rows = before.map((row,index) => ({
      month:row.month,
      before:Number(row.costLei || 0),
      after:hasExactAfter
        ? Number(afterExact[index]?.costLei || 0)
        : Number(row.costLei || 0) * factor,
    }));
    const peak = Math.max(1, ...rows.flatMap(row => [row.before,row.after]));
    return `
      <section class="ed-report-section ed-monthly-bills">
        <div class="ed-report-section-heading">
          <div>
            <p class="ed-eyebrow">COST LUNAR</p>
            <h2>Înainte vs. după investiție</h2>
          </div>
          <span>total anual verificat</span>
        </div>
        <div class="ed-monthly-bill-legend">
          <span><i class="is-current"></i> Înainte · ${escapeHtml(money(baselineAnnual))}/an</span>
          <span><i class="is-teo-average"></i> După TEO · ${escapeHtml(money(finalAnnual))}/an</span>
        </div>
        <div class="ed-monthly-bill-chart" role="img" aria-label="Cost lunar estimat înainte și după investiția recomandată de TEO">
          ${rows.map(row => {
            const beforeHeight = Math.max(2, Math.min(100, 100 * row.before / peak));
            const afterHeight = Math.max(2, Math.min(100, 100 * row.after / peak));
            return `
              <div class="ed-monthly-bill-column">
                <div class="ed-monthly-bill-bars">
                  <i class="is-current" style="height:${fmt(beforeHeight,1)}%"></i>
                  <i class="is-teo-average" style="height:${fmt(afterHeight,1)}%"></i>
                </div>
                <b>${escapeHtml(row.month)}</b>
                <small>${escapeHtml(money(row.before))} → ${escapeHtml(money(row.after))}</small>
              </div>
            `;
          }).join("")}
        </div>
        <p class="ed-chart-note">${hasExactAfter
          ? "Profilurile lunare provin direct din calculul energetic și de cost."
          : "Profilul lunar actual folosește costurile lunare RBPE. Pentru rezultatul TEO, totalul anual este verificat, iar distribuția pe luni păstrează forma profilului actual până când este disponibil un profil lunar final complet."
        }</p>
      </section>
    `;
  }

  function reportComparisonBar(label, beforeValue, afterValue, formatter) {
    const before = Math.max(Number(beforeValue || 0), 0);
    const after = Math.max(Number(afterValue || 0), 0);
    const peak = Math.max(before, after, 1);
    return `
      <article class="ed-report-compare-row">
        <header><span>${escapeHtml(label)}</span><b>${escapeHtml(formatter(before))} → ${escapeHtml(formatter(after))}</b></header>
        <div class="ed-report-compare-track">
          <i class="is-before" style="width:${fmt(100 * before / peak,1)}%"></i>
          <i class="is-after" style="width:${fmt(100 * after / peak,1)}%"></i>
        </div>
      </article>
    `;
  }

  function normalizedPerformanceMetric(kind, value) {
    const numeric = Number(value);
    if (!Number.isFinite(numeric) || numeric <= 0) return null;
    if (String(kind || "").toLowerCase() === "scop") {
      return {label:"SCOP generator",value:numeric,display:fmt(numeric,2),scale:Math.max(5,numeric)};
    }
    const percent = numeric <= 1.5 ? numeric * 100 : numeric;
    return {label:"Randament generator",value:percent,display:fmt(percent,0) + "%",scale:100};
  }

  function reportHeatingPerformance(engineering) {
    const beforeSystem = baselineResult?.heating_system || {};
    const heat = engineering?.heating || {};
    const before = normalizedPerformanceMetric(
      beforeSystem?.generator_performance_kind,
      beforeSystem?.generator_performance
    );

    let afterKind = heat?.generator_performance_kind;
    let afterValue = heat?.generator_performance_value;
    if (afterValue == null && Number.isFinite(Number(heat?.scop_model)) && Number(heat.scop_model) > 1) {
      afterKind = "scop";
      afterValue = Number(heat.scop_model);
    }
    if (afterValue == null && heat?.efficiency_target != null) {
      afterKind = "efficiency";
      afterValue = Number(heat.efficiency_target);
    }
    const after = normalizedPerformanceMetric(afterKind, afterValue);
    if (!before && !after) return null;
    return {
      before,
      after,
      beforeEffective:Number(beforeSystem?.effective_system_performance),
      afterEffective:Number(heat?.effective_system_performance),
    };
  }

  function renderHeatingPerformanceSection(engineering) {
    const perf = reportHeatingPerformance(engineering);
    if (!perf) return "";
    const card = (title, metric, effective, after = false) => {
      const width = metric ? Math.max(0, Math.min(100, 100 * metric.value / metric.scale)) : 0;
      const effectiveText = Number.isFinite(effective) && effective > 0
        ? '<small>Performanță efectivă sistem: ' + escapeHtml(fmt(effective,2)) + '</small>'
        : "";
      return `
        <article>
          <span>${escapeHtml(title)}</span>
          <small>${escapeHtml(metric?.label || "Performanță generator")}</small>
          <strong>${escapeHtml(metric?.display || "—")}</strong>
          <div><i class="${after ? "is-after" : ""}" style="width:${fmt(width,1)}%"></i></div>
          ${effectiveText}
        </article>
      `;
    };
    return `
      <section class="ed-report-section">
        <div class="ed-report-section-heading">
          <div>
            <p class="ed-eyebrow">SISTEM TERMIC</p>
            <h2>Performanța generatorului</h2>
          </div>
        </div>
        <div class="ed-performance-compare">
          ${card("Înainte", perf.before, perf.beforeEffective, false)}
          ${card("După TEO", perf.after, perf.afterEffective, true)}
        </div>
      </section>
    `;
  }

  function catalogBomRequirements(engineering, opt) {
    const selected = Array.isArray(opt?.selected) ? opt.selected : [];
    const active = new Set(selected.map(row => String(row?.family || "")));
    const geometry = baselineResult?.envelope_geometry || {};
    const env = engineering?.envelope || {};
    const ventilation = engineering?.ventilation || {};
    const heating = engineering?.heating || {};
    const pv = engineering?.pv || {};
    const solar = engineering?.solar_thermal || {};
    const heatedVolume = Number(
      baselineResult?.input?.heated_volume_m3
      ?? parseDecimal($("#heatedVolume")?.value, 0)
      ?? 0
    );
    const rows = [];

    const insulation = (family, categoryId, spec, area) => {
      if (!active.has(family) || Number(spec?.added_r_m2k_w || 0) <= 1e-9) return;
      rows.push({
        family,
        categoryId,
        requiredAreaM2:Number(area || 0),
        targetThicknessMm:10 * Number(spec?.equivalent_insulation_thickness_cm || 0),
      });
    };
    insulation("wall","wall_insulation",env.wall,geometry.net_wall_area_m2);
    insulation("roof","roof_insulation",env.roof,geometry.roof_area_m2);
    insulation("floor","floor_insulation",env.floor,geometry.floor_area_m2);

    const replacement = Number(env.windows?.replacement_fraction || 0);
    if (active.has("windows") && replacement > 1e-9) {
      rows.push({
        family:"windows",
        categoryId:"window_system",
        requiredAreaM2:Number(geometry.window_area_m2 || 0) * replacement,
        targetUw:Number(env.windows?.target_u_w_m2k || env.windows?.final_u_w_m2k || 0),
      });
    }

    if (active.has("ventilation") && Number(ventilation.heat_recovery_efficiency || 0) > 0) {
      rows.push({
        family:"ventilation",
        categoryId:"hrv_unit",
        requiredAirflowM3h:Math.max(0, heatedVolume * Number(ventilation.air_changes_per_hour || 0)),
        targetEfficiency:Number(ventilation.heat_recovery_efficiency || 0),
      });
    }

    if (active.has("heating")) {
      rows.push({
        family:"heating",
        technologyBranch:String(heating.technology_branch || heating.generator_type || ""),
        requiredPowerKw:Number(heating.installed_power_target_kw || heating.design_required_power_kw || 0),
      });
    }

    if (active.has("pv") && Number(pv.added_power_kwp || 0) > 1e-9) {
      rows.push({
        family:"pv",
        categoryId:"pv_module",
        requiredPowerKwp:Number(pv.added_power_kwp || 0),
      });
    }

    if (active.has("solar_thermal") && Number(solar.added_area_m2 || 0) > 1e-9) {
      rows.push({
        family:"solar_thermal",
        categoryId:"solar_thermal_collector",
        requiredAreaM2:Number(solar.added_area_m2 || 0),
      });
    }
    return rows;
  }

  function renderCatalogBomShell() {
    return `
      <section class="ed-report-section ed-technical-bom" id="edTechnicalBom">
        <div class="ed-report-section-heading">
          <div>
            <p class="ed-eyebrow">LISTĂ DE MATERIALE</p>
            <h2>Produse și cantități din catalogul LaCurent</h2>
          </div>
          <span>D1 · post-TEO</span>
        </div>
        <div id="edCatalogBom" class="ed-catalog-bom" data-state="loading">
          <p class="ed-hint">Potrivesc specificația TEO cu produsele source-backed din baza de date…</p>
        </div>
      </section>
    `;
  }

  function bomQuantityLabel(item) {
    const value = Number(item?.quantity);
    if (!Number.isFinite(value)) return "—";
    const unit = String(item?.quantityUnit || "buc");
    return fmt(value, Number.isInteger(value) ? 0 : 1) + " " + unit;
  }

  function renderCatalogBomItems(items) {
    const node = $("#edCatalogBom");
    if (!node) return;
    node.dataset.state = "ready";
    const rows = Array.isArray(items) ? items : [];
    if (!rows.length) {
      node.innerHTML = '<p class="ed-hint">TEO nu a selectat materiale sau echipamente noi pentru această configurație.</p>';
      return;
    }
    node.innerHTML = rows.map(item => {
      if (!item?.matched) {
        const family = String(item?.family || "intervenție").replaceAll("_"," ");
        const reason = item?.reason === "no_new_product_required"
          ? "Sistemul existent rămâne în soluție."
          : "Catalogul D1 nu are încă un SKU source-backed care să satisfacă această cerință.";
        return `
          <article class="ed-bom-product is-unmatched">
            <div class="ed-bom-product-image"><span>—</span></div>
            <div class="ed-bom-product-main">
              <small>${escapeHtml(family)}</small>
              <h3>Cerință tehnică fără SKU validat</h3>
              <p>${escapeHtml(reason)}</p>
            </div>
          </article>
        `;
      }
      const image = /^https?:\/\//i.test(String(item.imageUrl || ""))
        ? '<img src="' + escapeHtml(item.imageUrl) + '" alt="' + escapeHtml(item.label || "Produs") + '" loading="lazy">'
        : '<span>' + escapeHtml(String(item.manufacturer || "LC").slice(0,2).toUpperCase()) + '</span>';
      const source = /^https?:\/\//i.test(String(item.sourceUrl || ""))
        ? '<a href="' + escapeHtml(item.sourceUrl) + '" target="_blank" rel="noopener noreferrer">Sursa produsului ↗</a>'
        : "";
      return `
        <article class="ed-bom-product">
          <div class="ed-bom-product-image">${image}</div>
          <div class="ed-bom-product-main">
            <small>${escapeHtml(item.manufacturer || item.categoryId || "Produs")}</small>
            <h3>${escapeHtml(item.label || item.model || item.productId)}</h3>
            <p>${escapeHtml(item.selectionBasis || "")}</p>
            <div class="ed-bom-product-meta">
              <b>${escapeHtml(bomQuantityLabel(item))}</b>
              ${item.subtotalLei == null ? "" : '<span>' + escapeHtml(money(item.subtotalLei)) + '</span>'}
              ${item.supplier ? '<span>' + escapeHtml(item.supplier) + '</span>' : ""}
            </div>
            ${source}
          </div>
        </article>
      `;
    }).join("");
  }

  async function loadCatalogBom(engineering, opt) {
    const node = $("#edCatalogBom");
    if (node) node.dataset.state = "loading";
    const requirements = catalogBomRequirements(engineering, opt);
    if (!requirements.length) {
      renderCatalogBomItems([]);
      return;
    }
    try {
      const response = await fetch("/api/home-lab/bom", {
        method:"POST",
        headers:{"Content-Type":"application/json","Accept":"application/json"},
        body:JSON.stringify({requirements}),
      });
      const payload = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(payload?.detail || "Lista de materiale nu poate fi încărcată.");
      renderCatalogBomItems(payload.items || []);
    } catch (error) {
      const node = $("#edCatalogBom");
      if (node) {
        node.dataset.state = "error";
        node.innerHTML = '<p class="ed-hint">' + escapeHtml(error?.message || "Lista de materiale nu poate fi încărcată.") + '</p>';
      }
    }
  }

  function renderReport() {
    if (!baselineResult || !optimizationResult) return;
    const scenario = optimizationResult.scenario || {};
    const opt = optimizationResult.optimization || {};
    const parametric = opt.parametricEvaluation || {};
    const engineering = opt.engineeringSpec || {};
    const baselineBill = Number(baselineResult.annual_cost_lei || 0);
    const finalBill = Number(parametric.annualBillLei ?? scenario.annual_cost_lei ?? baselineBill);
    const baselineFinal = Number(baselineResult.final_energy_kwh || 0);
    const finalEnergy = Number(parametric.finalEnergyKwh ?? scenario.final_energy_kwh ?? baselineFinal);

    $("#reportIntro").textContent =
      "Raportul nu repetă recomandările de pe pagina TEO. Aici vezi numai diferențele măsurabile și lista comercială rezultată.";

    let html = "";
    html += renderMonthlyBillSection(baselineResult, scenario, finalBill);
    html += `
      <section class="ed-report-section">
        <div class="ed-report-section-heading">
          <div>
            <p class="ed-eyebrow">ÎNAINTE / DUPĂ</p>
            <h2>Impactul soluției TEO</h2>
          </div>
        </div>
        <div class="ed-report-compare">
          ${reportComparisonBar("Cost anual", baselineBill, finalBill, money)}
          ${reportComparisonBar("Energie finală", baselineFinal, finalEnergy, energy)}
        </div>
      </section>
    `;
    html += renderHeatingPerformanceSection(engineering);
    html += renderCatalogBomShell();

    $("#reportBody").innerHTML = html;
    loadCatalogBom(engineering, opt);
  }

  $("#runAnalysis").addEventListener("click", runAnalysis);
  $("#openReport").addEventListener("click", () => showPage("report"));
  $("#openReportFromGoal")?.addEventListener("click", () => {
    if (!optimizationResult) return;
    renderReport();
    showPage("report");
  });
  $("#openBomFromGoal")?.addEventListener("click", () => {
    if (!optimizationResult) return;
    renderReport();
    showPage("report");
    window.requestAnimationFrame(() => {
      document.querySelector("#edTechnicalBom")?.scrollIntoView({behavior:"smooth",block:"start"});
    });
  });
  $("#reportBack").addEventListener("click", () => showPage("goal"));
  $("#tryAgain").addEventListener("click", () => showPage("goal"));
  $("#edReportEditHouse")?.addEventListener("click", () => showPage("house"));
  $("#edReportSaveProject")?.addEventListener("click", () => saveCurrentAccountProject());
  $("#edReportBom")?.addEventListener("click", () => {
    document.querySelector("#edTechnicalBom")?.scrollIntoView({behavior:"smooth", block:"start"});
  });

  function openLog() {
    logDialogBody.textContent = logLines.join("\n");
    if (typeof logDialog.showModal === "function") logDialog.showModal();
    else logDialog.setAttribute("open","");
  }
  $("#showLog").addEventListener("click", openLog);
  $("#errorLog").addEventListener("click", openLog);
  $("#closeLog").addEventListener("click", () => logDialog.close());
  logDialog.addEventListener("click", event => { if (event.target === logDialog) logDialog.close(); });

  priceReferenceOpen?.addEventListener("click", () => {
    renderPriceReferences(
      current === "report" && optimizationResult
        ? optimizationSummaryForPersistentBar()
        : baselineResult
    );
    if (typeof priceDialog?.showModal === "function") priceDialog.showModal();
    else priceDialog?.setAttribute("open", "");
  });
  $("#closePriceReferences")?.addEventListener("click", () => priceDialog?.close());
  priceDialog?.addEventListener("click", event => {
    if (event.target === priceDialog) priceDialog.close();
  });

  classReferenceOpen?.addEventListener("click", () => {
    renderClassReference(
      current === "report" && optimizationResult
        ? optimizationSummaryForPersistentBar()
        : baselineResult
    );
    if (typeof classDialog?.showModal === "function") classDialog.showModal();
    else classDialog?.setAttribute("open", "");
  });
  $("#closeClassReference")?.addEventListener("click", () => classDialog?.close());
  classDialog?.addEventListener("click", event => {
    if (event.target === classDialog) classDialog.close();
  });

  form.addEventListener("input", event => {
    if (event.target?.type === "hidden") return;
    if (
      event.isTrusted
      && event.target?.closest?.('.ed-page[data-page="house"],.ed-page[data-page="envelope"],.ed-page[data-page="systems"]')
    ) {
      const confirmation = $("#edHouseValuesConfirmed");
      if (confirmation) {
        confirmation.checked = false;
        confirmation.setCustomValidity("");
      }
    }
    if (event.target?.matches?.("[data-optional-advanced]") && event.isTrusted) {
      markAdvancedManual(event.target);
    } else if (event.isTrusted) {
      resetAdvancedDependents(event.target);
    }
    syncDerivedAdvancedFields();
    syncTeoRecalculationCue();
    scheduleBaselineSummary();
  });
  form.addEventListener("change", event => {
    if (event.target?.type === "hidden") return;
    if (
      event.isTrusted
      && event.target?.closest?.('.ed-page[data-page="house"],.ed-page[data-page="envelope"],.ed-page[data-page="systems"]')
    ) {
      const confirmation = $("#edHouseValuesConfirmed");
      if (confirmation) {
        confirmation.checked = false;
        confirmation.setCustomValidity("");
      }
    }
    if (event.target?.matches?.("[data-optional-advanced]") && event.isTrusted) {
      markAdvancedManual(event.target);
    } else if (event.isTrusted) {
      resetAdvancedDependents(event.target);
    }
    syncDerivedAdvancedFields();
    syncTeoRecalculationCue();
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

  initializeAccountUi();
  syncGoalField();
  syncNzebPolicy();
  resetTeoControlUi();
  updateGeometryDisplay(true);

  const restoredDraft = restoreEditorialDraft();
  if (restoredDraft) {
    normalizeHeatingUi();
    syncRenewableVisibility();
    updateGeometryDisplay(false);
    syncGoalField();
    syncChoiceGroupSelections();
    syncNzebPolicy();
  } else {
    normalizeHeatingUi();
    syncRenewableVisibility();
  }

  syncDerivedAdvancedFields();
  form.querySelectorAll("[data-optional-advanced]").forEach(refreshAdvancedFieldState);
  syncTechnicalForm();
  showPage("intro");
  scheduleBaselineSummary(150);
})();
