import {
  CHAPTER3_DHW_STAGE_IDS,
  CHAPTER3_INSTALLATION_STAGE_IDS,
  TECHNICAL_SYSTEMS_SCHEMA,
  buildBuildingPlatformVersionMetadata,
  buildBuildingKnowledgePlatformFromAssistedAnswers,
  buildBuildingTechnicalWorkspace,
  findRomanianClimateProfileById,
  findRomanianNormativeStationByLocalityId,
  listRomanianClimateZones,
  listRomanianProductionClimateLocalities
} from "../src/building-platform/index.mjs";

// assisted abstraction pending redesign: keep it as a secondary view over the canonical model.
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
    stepId: "installations",
    title: "Instalatii",
    assistedPrompt: "Introdu date explicite pentru sistemele Capitolului 3: pierderi, auxiliari, stocare si limita LENI."
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
    locality_id: "ro_bucuresti",
    climate_station_id: "mc001_6_2013_bucuresti",
    county: "Bucuresti",
    climate_zone: "II",
    wind_zone: "II",
    climate_assignment_origin: "manual_zone_selection",
    climate_manual_override: "",
    climate_override_reason: "",
    display_name: "Demo tehnic - casa zidarie 1985",
    analysis_purpose: "technical_chapter_2_3_report",
    building_type: "house",
    city: "Bucuresti",
    construction_year: "1985",
    structural_system: "masonry",
    useful_area_m2: "120",
    number_of_floors: "1",
    floor_height_m: "2.6",
    heated_volume_m3: "312",
    exterior_wall_area_m2: "50",
    roof_area_m2: "120",
    ground_floor_area_m2: "120",
    attic_ceiling_area_m2: "120",
    adjacent_wall_area_m2: "10",
    main_orientation: "south",
    wall_material: "brick",
    roof_type: "unheated_attic",
    floor_type: "on_ground",
    window_type: "modern_double_glazing",
    window_area_m2: "8",
    window_orientation: "south",
    door_area_m2: "2",
    ventilation_type: "natural",
    ventilation_ach: "0.6",
    thermal_bridge_mode: "platform_supported_explicit",
    wall_insulation: "10cm",
    wall_insulation_material: "eps",
    roof_insulated: "no",
    floor_insulated: "no",
    windows_replaced: "yes",
    chapter3_installations_enabled: "yes",
    chapter3_heating_enabled: "yes",
    chapter3_heating_generator_type: "condensing_boiler",
    chapter3_heating_energy_carrier: "natural_gas",
    chapter3_heating_emission_loss_kwh_month: "1.2",
    chapter3_heating_emission_aux_kwh_month: "0.2",
    chapter3_heating_distribution_loss_kwh_month: "2.4",
    chapter3_heating_distribution_aux_kwh_month: "0.3",
    chapter3_heating_storage_loss_kwh_month: "0.8",
    chapter3_heating_storage_aux_kwh_month: "0.1",
    chapter3_heating_generation_loss_kwh_month: "3.6",
    chapter3_heating_generation_aux_kwh_month: "0.4",
    chapter3_cooling_enabled: "yes",
    chapter3_cooling_generator_type: "split_system",
    chapter3_cooling_energy_carrier: "electricity",
    chapter3_cooling_emission_loss_kwh_month: "0.4",
    chapter3_cooling_emission_aux_kwh_month: "0.1",
    chapter3_cooling_distribution_loss_kwh_month: "0.5",
    chapter3_cooling_distribution_aux_kwh_month: "0.1",
    chapter3_cooling_storage_loss_kwh_month: "0.2",
    chapter3_cooling_storage_aux_kwh_month: "0.05",
    chapter3_cooling_generation_loss_kwh_month: "1.1",
    chapter3_cooling_generation_aux_kwh_month: "0.2",
    chapter3_ventilation_ahu_enabled: "yes",
    chapter3_supply_airflow_m3h: "300",
    chapter3_supply_pressure_pa: "220",
    chapter3_supply_fan_efficiency: "0.55",
    chapter3_extract_airflow_m3h: "280",
    chapter3_extract_pressure_pa: "180",
    chapter3_extract_fan_efficiency: "0.55",
    chapter3_fan_hours_month: "120",
    chapter3_heat_recovery_aux_kwh_month: "0.2",
    chapter3_preheat_aux_kwh_month: "0.1",
    chapter3_control_aux_kwh_month: "0.05",
    chapter3_dhw_enabled: "yes",
    chapter3_dhw_energy_carrier: "natural_gas",
    chapter3_dhw_component_mode: "explicit_monthly",
    chapter3_dhw_useful_kwh_month: "95",
    chapter3_dhw_distribution_loss_kwh_month: "2.0",
    chapter3_dhw_distribution_aux_kwh_month: "0.1",
    chapter3_dhw_storage_loss_kwh_month: "4.0",
    chapter3_dhw_storage_aux_kwh_month: "0.2",
    chapter3_dhw_generation_loss_kwh_month: "3.0",
    chapter3_dhw_generation_aux_kwh_month: "0.2",
    chapter3_pcm_enabled: "yes",
    chapter3_pcm_transformable_kwh: "1.5",
    chapter3_pcm_solid_mass_kg: "40",
    chapter3_pcm_specific_heat_kwh_kgk: "0.000392",
    chapter3_pcm_generator_outlet_c: "32.7551020408",
    chapter3_pcm_transition_c: "20",
    chapter3_pcm_generator_delta_k: "12.7551020408",
    chapter3_pcm_mass_decrease_transformable_kwh: "-0.5",
    chapter3_pcm_latent_heat_kwh_kg: "0.0271",
    chapter3_pcm_initial_solid_mass_kg: "20",
    chapter3_lighting_enabled: "yes",
    chapter3_lighting_monthly_kwh: "20",
    chapter3_lighting_leni_kwh_m2_year: "20"
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

function createOption(root, value, textContent) {
  const option = root?.createElement?.("option") ?? globalThis.document?.createElement?.("option");
  if (!option) return null;
  option.value = value;
  option.textContent = textContent;
  return option;
}

function ensureProductionLocalityOption(form, localityId) {
  const select = form?.querySelector?.('[name="locality_id"]');
  if (!select?.appendChild || !localityId) return;
  const existing = [...(select.options ?? [])].some(option => option.value === localityId);
  if (existing) return;
  const locality = listRomanianProductionClimateLocalities()
    .find(item => item.localityId === localityId);
  const option = createOption(globalThis.document, localityId, locality
    ? `${locality.localityName} - statia ${locality.stationId}`
    : localityId);
  if (!option) return;
  if (locality) {
    option.dataset.stationId = locality.stationId;
    option.dataset.localityName = locality.localityName;
    option.dataset.datasetVersion = locality.datasetVersion;
    option.dataset.climateZone = locality.climateZone ?? "";
    option.dataset.windZone = locality.windZone ?? "";
    option.dataset.hasMonthlyTemperature = String(locality.coverage?.monthlyExteriorTemperature === true);
    option.dataset.hasMonthlySolarIrradiation = String(locality.coverage?.monthlySolarIrradiation === true);
  }
  select.appendChild(option);
}

function selectedSelectOption(select) {
  if (!select) return null;
  if (select.selectedOptions?.length) return select.selectedOptions[0];
  const selectedIndex = Number.isInteger(select.selectedIndex) ? select.selectedIndex : -1;
  return selectedIndex >= 0 ? select.options?.[selectedIndex] ?? null : null;
}

function setResolvedClimateField(panel, field, value) {
  const node = panel?.querySelector?.(`[data-resolved-climate-field="${field}"]`);
  if (node) node.textContent = value || "Neselectat";
}

function setNamedControlValue(form, name, value) {
  const control = form?.querySelector?.(`[name="${name}"]`);
  if (control) control.value = value ?? "";
}

function updateResolvedClimateProfilePanel(form) {
  const panel = form?.querySelector?.("[data-resolved-climate-profile]");
  if (!panel) return;
  const localitySelect = form?.querySelector?.('[name="locality_id"]');
  const selected = selectedSelectOption(localitySelect);
  const localityId = selected?.value ?? "";
  const station = localityId ? findRomanianNormativeStationByLocalityId(localityId) : null;
  const localityName = station?.localityName ?? selected?.dataset?.localityName ?? "";
  const stationId = station?.stationId ?? selected?.dataset?.stationId ?? "";
  const datasetVersion = selected?.dataset?.datasetVersion ?? station?.datasetVersion ?? "";
  const climateZone = selected?.dataset?.climateZone ?? station?.climateZone ?? "";
  const windZone = selected?.dataset?.windZone ?? station?.windZone ?? "";
  const hasTemperature = selected?.dataset?.hasMonthlyTemperature === "true" ||
    station?.coverage?.monthlyExteriorTemperature === true;
  const hasSolar = selected?.dataset?.hasMonthlySolarIrradiation === "true" ||
    station?.coverage?.monthlySolarIrradiation === true;

  setResolvedClimateField(panel, "locality", localityName || "Neselectata");
  setResolvedClimateField(panel, "station", stationId || "Neselectata");
  setResolvedClimateField(panel, "climateZone", climateZone || "Nereprodusa in sursa localitatii");
  setResolvedClimateField(panel, "windZone", windZone || "Nereprodusa in sursa localitatii");
  setResolvedClimateField(panel, "dataset", datasetVersion || "Neselectat");
  setResolvedClimateField(
    panel,
    "temperature",
    hasTemperature ? "Disponibile prin Climate Provider" : "Indisponibile pentru localitatea selectata"
  );
  setResolvedClimateField(
    panel,
    "solar",
    hasSolar ? "Disponibila prin Climate Provider" : "Limitata la date sursa sau set certificat"
  );
  setResolvedClimateField(
    panel,
    "note",
    localityId
      ? "Localitatea selectata este sursa unica pentru profilul climatic folosit la calcul."
      : "Selecteaza o localitate pentru rezolvarea automata a profilului climatic."
  );
}

function syncSelectedProductionLocality(
  form,
  { preserveClimateProfileId = false, preserveExplicitZoneSelection = false } = {}
) {
  const localitySelect = form?.querySelector?.('[name="locality_id"]');
  const selected = selectedSelectOption(localitySelect);
  if (!selected) {
    updateResolvedClimateProfilePanel(form);
    return;
  }
  const stationInput = form?.querySelector?.('[name="climate_station_id"]');
  const cityInput = form?.querySelector?.('[name="city"]');
  if (stationInput) stationInput.value = selected?.dataset?.stationId ?? "";
  if (cityInput && selected?.dataset?.localityName) {
    cityInput.value = selected.dataset.localityName;
  }
  const climateProfileInput = form?.querySelector?.('[name="climate_profile_id"]');
  if (climateProfileInput && !preserveClimateProfileId) climateProfileInput.value = "";
  const manualOverride = form?.querySelector?.('[name="climate_manual_override"]')?.value === "yes";
  if (!manualOverride && !preserveExplicitZoneSelection) {
    const climateZone = selected?.dataset?.climateZone ?? "";
    const windZone = selected?.dataset?.windZone ?? "";
    setNamedControlValue(form, "climate_zone", climateZone);
    setNamedControlValue(form, "wind_zone", windZone);
    setNamedControlValue(
      form,
      "climate_assignment_origin",
      climateZone || windZone ? "source_backed_locality_assignment" : "not_selected"
    );
  }
  updateResolvedClimateProfilePanel(form);
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
  ensureProductionLocalityOption(form, fixture.values?.locality_id);
  for (const [name, value] of Object.entries(fixture.values ?? {})) {
    setFieldValue(form, name, value);
  }
  syncSelectedProductionLocality(form, {
    preserveClimateProfileId: true,
    preserveExplicitZoneSelection: true
  });
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

function firstSystem(section) {
  return Array.isArray(section?.systems) ? section.systems[0] : null;
}

function stageValue(section, stageId, field) {
  const stage = firstSystem(section)?.stages?.find(item => item.stageId === stageId);
  const value = stage?.[field];
  return Array.isArray(value) ? value[0] ?? "" : value ?? "";
}

function stageObject(section, stageId) {
  return firstSystem(section)?.stages?.find(item => item.stageId === stageId) ?? null;
}

function systemValue(section, field, fallback = "") {
  return firstSystem(section)?.[field] ?? fallback;
}

function fanValue(section, field) {
  return firstSystem(section)?.fanElectricEnergyInput?.[field] ?? "";
}

function technicalSystemsToWizardValues(technicalSystems = {}) {
  const values = {
    chapter3_installations_enabled: technicalSystems && Object.values(technicalSystems).some(value => value?.enabled === true) ? "yes" : "no"
  };
  const sections = [
    ["heating", "chapter3_heating", CHAPTER3_INSTALLATION_STAGE_IDS],
    ["cooling", "chapter3_cooling", CHAPTER3_INSTALLATION_STAGE_IDS],
    ["domesticHotWater", "chapter3_dhw", CHAPTER3_DHW_STAGE_IDS]
  ];
  for (const [sectionKey, prefix, stageIds] of sections) {
    const section = technicalSystems?.[sectionKey] ?? {};
    values[`${prefix}_enabled`] = section.enabled ? "yes" : "no";
    values[`${prefix}_generator_type`] = systemValue(section, "generatorType", "explicit_other");
    values[`${prefix}_energy_carrier`] = systemValue(section, "energyCarrier", "explicit_other");
    for (const stageId of stageIds) {
      values[`${prefix}_${stageId}_loss_kwh_month`] = stageValue(section, stageId, "lossKWhPerMonth");
      values[`${prefix}_${stageId}_aux_kwh_month`] = stageValue(section, stageId, "auxiliaryKWhPerMonth");
      values[`${prefix}_${stageId}_aux_recovered_fraction`] = stageValue(section, stageId, "auxiliaryRecoveredFraction");
      values[`${prefix}_${stageId}_loss_recovered_fraction`] = stageValue(section, stageId, "lossRecoveredFraction");
    }
  }
  const ventilation = technicalSystems?.ventilationAhu ?? {};
  values.chapter3_ventilation_ahu_enabled = ventilation.enabled ? "yes" : "no";
  values.chapter3_supply_airflow_m3h = fanValue(ventilation, "supplyAirFlowM3PerH");
  values.chapter3_supply_pressure_pa = fanValue(ventilation, "supplyPressureDropPa");
  values.chapter3_supply_fan_efficiency = fanValue(ventilation, "supplyFanEfficiency");
  values.chapter3_extract_airflow_m3h = fanValue(ventilation, "extractAirFlowM3PerH");
  values.chapter3_extract_pressure_pa = fanValue(ventilation, "extractPressureDropPa");
  values.chapter3_extract_fan_efficiency = fanValue(ventilation, "extractFanEfficiency");
  values.chapter3_fan_hours_month = fanValue(ventilation, "calculationHours");
  values.chapter3_heat_recovery_aux_kwh_month = firstSystem(ventilation)?.heatRecoveryAuxiliaryKWhPerMonth ?? "";
  values.chapter3_preheat_aux_kwh_month = firstSystem(ventilation)?.preheatAuxiliaryKWhPerMonth ?? "";
  values.chapter3_control_aux_kwh_month = firstSystem(ventilation)?.controlAuxiliaryKWhPerMonth ?? "";

  const dhw = technicalSystems?.domesticHotWater ?? {};
  values.chapter3_dhw_useful_mode = dhw.usefulDemandSource?.mode ?? "explicit_monthly";
  values.chapter3_dhw_dwelling_type = dhw.usefulDemandSource?.dwellingType ?? "single_family_or_terraced";
  values.chapter3_dhw_useful_kwh_month = Array.isArray(dhw.monthlyUsefulDemandKWh)
    ? dhw.monthlyUsefulDemandKWh[0] ?? ""
    : dhw.monthlyUsefulDemandKWh ?? "";
  const dhwDistribution = stageObject(dhw, "distribution");
  const dhwStorage = stageObject(dhw, "storage");
  const dhwDistributionLossContract = dhwDistribution?.lossCalculation;
  const dhwDistributionAuxiliaryContract = dhwDistribution?.auxiliaryCalculation;
  const dhwStorageLossContract = dhwStorage?.lossCalculation;
  const dhwPipeSegment = dhwDistributionLossContract?.distributionPipeSegments?.[0];
  const dhwRecoverablePipeSegment = dhwDistributionLossContract?.recoverablePipeSegments?.[0];
  values.chapter3_dhw_component_mode =
    dhwDistributionLossContract?.mode || dhwDistributionAuxiliaryContract?.mode || dhwStorageLossContract?.mode
      ? "component_contract"
      : "explicit_monthly";
  values.chapter3_dhw_pipe_length_m = dhwPipeSegment?.lengthM ?? "";
  values.chapter3_dhw_pipe_equivalent_length_m = dhwPipeSegment?.equivalentLengthM ?? "";
  values.chapter3_dhw_recoverable_pipe_length_m = dhwRecoverablePipeSegment?.lengthM ?? "";
  values.chapter3_dhw_distribution_hours_month = Array.isArray(dhwDistributionLossContract?.operationTimeHours)
    ? dhwDistributionLossContract.operationTimeHours[0] ?? ""
    : dhwDistributionLossContract?.operationTimeHours ?? "";
  values.chapter3_dhw_distribution_temp_c =
    dhwPipeSegment?.meanTemperatureInput?.thetaWDistributionC ??
    dhwPipeSegment?.thetaWMeanC ??
    "";
  values.chapter3_dhw_distribution_delta_k =
    dhwPipeSegment?.meanTemperatureInput?.deltaThetaWLoopK ?? "";
  values.chapter3_dhw_pipe_ambient_c = dhwPipeSegment?.thetaWAmbientC ?? "";
  values.chapter3_dhw_pipe_inner_d_m =
    dhwPipeSegment?.linearTransmittanceInput?.innerDiameterM ?? "";
  values.chapter3_dhw_pipe_outer_d_m =
    dhwPipeSegment?.linearTransmittanceInput?.outerDiameterM ?? "";
  values.chapter3_dhw_pipe_lambda_w_mk =
    dhwPipeSegment?.linearTransmittanceInput?.insulationThermalConductivityWPerMK ?? "";
  values.chapter3_dhw_pipe_ha_w_m2k =
    dhwPipeSegment?.linearTransmittanceInput?.externalHeatTransferCoefficientWPerM2K ?? "";
  values.chapter3_dhw_pump_flow_m3h = dhwDistributionAuxiliaryContract?.designFlowRateM3PerH ?? "";
  values.chapter3_dhw_pump_pressure_kpa =
    dhwDistributionAuxiliaryContract?.pressureDropKPa ??
    dhwDistributionAuxiliaryContract?.pressureDropInput?.additionalPressureDropKPa ??
    "";
  values.chapter3_dhw_pump_load_factor = dhwDistributionAuxiliaryContract?.operationLoadFactor ?? "";
  values.chapter3_dhw_pump_eei = dhwDistributionAuxiliaryContract?.energyEfficiencyIndex ?? "";
  values.chapter3_dhw_pump_correction_factor = dhwDistributionAuxiliaryContract?.correctionFactor ?? "";
  values.chapter3_dhw_pump_cp1 = dhwDistributionAuxiliaryContract?.controlConstantCp1 ?? "";
  values.chapter3_dhw_pump_cp2 = dhwDistributionAuxiliaryContract?.controlConstantCp2 ?? "";
  values.chapter3_dhw_storage_h_w_k = dhwStorageLossContract?.storageHeatTransferCoefficientWPerK ?? "";
  values.chapter3_dhw_storage_setpoint_c = dhwStorageLossContract?.storageSetpointTemperatureC ?? "";
  values.chapter3_dhw_storage_ambient_c = dhwStorageLossContract?.storageAmbientTemperatureC ?? "";
  values.chapter3_dhw_storage_hours_month = Array.isArray(dhwStorageLossContract?.calculationHours)
    ? dhwStorageLossContract.calculationHours[0] ?? ""
    : dhwStorageLossContract?.calculationHours ?? "";
  values.chapter3_dhw_storage_accessible_factor = dhwStorageLossContract?.accessibleStorageVolumeFactor ?? "";
  values.chapter3_dhw_storage_distribution_factor = dhwStorageLossContract?.distributionStorageLossFactor ?? "";

  const pcm = technicalSystems?.coolingStoragePcm ?? {};
  const pcmTemplate = Array.isArray(pcm.monthly) ? pcm.monthly[0] : pcm.monthlyTemplate;
  values.chapter3_pcm_enabled = pcm.enabled ? "yes" : "no";
  values.chapter3_pcm_transformable_kwh = pcmTemplate?.sensibleStorageTransformableEnergyKWh ?? "";
  values.chapter3_pcm_solid_mass_kg = pcmTemplate?.solidMassKg ?? "";
  values.chapter3_pcm_specific_heat_kwh_kgk = pcmTemplate?.solidSpecificHeatKWhPerKgK ?? "";
  values.chapter3_pcm_generator_outlet_c = pcmTemplate?.generatorOutletFlowTemperatureC ?? "";
  values.chapter3_pcm_transition_c = pcmTemplate?.transitionTemperatureC ?? "";
  values.chapter3_pcm_generator_delta_k = pcmTemplate?.generatorOutletFlowDeltaK ?? "";
  values.chapter3_pcm_mass_decrease_transformable_kwh = pcmTemplate?.massDecreaseTransformableEnergyKWh ?? "";
  values.chapter3_pcm_latent_heat_kwh_kg = pcmTemplate?.latentHeatKWhPerKg ?? "";
  values.chapter3_pcm_initial_solid_mass_kg = pcmTemplate?.initialSolidMassKg ?? "";

  const lighting = technicalSystems?.lighting ?? {};
  values.chapter3_lighting_enabled = lighting.enabled ? "yes" : "no";
  values.chapter3_lighting_monthly_kwh = Array.isArray(lighting.explicitMonthlyEnergyKWh)
    ? lighting.explicitMonthlyEnergyKWh[0] ?? ""
    : lighting.monthlyEnergyKWh?.[0] ?? "";
  values.chapter3_lighting_leni_kwh_m2_year = lighting.leniSubspaces?.[0]?.leniKWhPerM2Year ?? "";
  return values;
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
  const climateSelection = buildingDna?.climateProvider?.selection ?? {};
  const productionClimateProfile = buildingDna?.productionClimateProfile ?? {};
  return {
    display_name: building.buildingId ?? "Model termic Chapter 2 salvat",
    building_type: building.buildingType === "apartment" ? "apartment" : "house",
    locality_id:
      building.location?.localityId ??
      climateSelection.localityId ??
      productionClimateProfile.localityId ??
      "",
    climate_station_id:
      building.location?.climateStationId ??
      building.location?.stationId ??
      climateSelection.stationId ??
      productionClimateProfile.stationId ??
      "",
    city:
      building.location?.localityName ??
      building.location?.city ??
      building.location?.locality ??
      climateSelection.localityName ??
      productionClimateProfile.localityName ??
      buildingDna?.climateProfile?.locality ??
      "",
    county: building.location?.countyName ?? building.location?.county ?? buildingDna?.climateProfile?.county ?? "",
    climate_zone: buildingDna?.climate?.climateZone ?? building.location?.climateZone ?? "",
    wind_zone: buildingDna?.climate?.windZone ?? building.location?.windZone ?? "",
    climate_assignment_origin: buildingDna?.climate?.assignmentOrigin ?? building.location?.climateAssignmentOrigin ?? "",
    climate_manual_override: buildingDna?.climate?.manualOverride ? "yes" : "",
    climate_override_reason: buildingDna?.climate?.overrideReason ?? "",
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
    windows_replaced: hasIntervention(buildingDna, "window_replacement") ? "yes" : "unknown",
    ...technicalSystemsToWizardValues(buildingDna?.technicalSystems ?? {})
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
    if (name === "locality_id") ensureProductionLocalityOption(form, value);
    setFieldValue(form, name, value, fieldProvenance);
  }
  syncSelectedProductionLocality(form, {
    preserveClimateProfileId: true,
    preserveExplicitZoneSelection: true
  });
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
  const chapter3 = workspace.resultSummary?.chapter3Annual;
  return `
    <div class="technical-status-grid p2b-annual-summary">
      <article>
        <span>QHnd anual</span>
        <strong>${formatNumber(workspace.resultSummary.annualQHnd)} kWh</strong>
        <small>Necesar util de incalzire Chapter 2</small>
      </article>
      <article>
        <span>QCnd anual</span>
        <strong>${formatNumber(workspace.resultSummary.annualQCnd)} kWh</strong>
        <small>Necesar util de racire Chapter 2</small>
      </article>
      <article>
        <span>Htr</span>
        <strong>${formatNumber(workspace.envelope.htr?.amount)} ${safeText(workspace.envelope.htr?.unit ?? "W/K")}</strong>
        <small>${safeText(workspace.envelope.htr?.origin)}</small>
      </article>
      <article>
        <span>Luni</span>
        <strong>${formatNumber(workspace.resultSummary.monthCount, 0)}</strong>
        <small>profil lunar explicit</small>
      </article>
      <article>
        <span>Amprenta calcul</span>
        <strong>${safeText(workspace.calculationFingerprint?.fingerprintId ?? "--")}</strong>
        <small>model tehnic + rezultat Chapter 2${chapter3 ? " + Chapter 3" : ""}</small>
      </article>
      ${chapter3 ? `
        <article>
          <span>Instalatii incalzire</span>
          <strong>${formatNumber(chapter3.heatingInputKWh)} kWh</strong>
          <small>MC001 Capitolul 3</small>
        </article>
        <article>
          <span>Instalatii racire</span>
          <strong>${formatNumber(chapter3.coolingInputKWh)} kWh</strong>
          <small>MC001 Capitolul 3</small>
        </article>
      ` : ""}
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
    { label: "Hours", value: row => formatNumber(row.durationHours, 0) },
    { label: "T ext H", value: row => `${formatNumber(row.heatingOutdoorTemperatureC, 1)} C` },
    { label: "dT H", value: row => `${formatNumber(row.heatingTemperatureDifferenceK, 1)} K` },
    { label: "T ext C", value: row => `${formatNumber(row.coolingOutdoorTemperatureC, 1)} C` },
    { label: "dT C", value: row => `${formatNumber(row.coolingTemperatureDifferenceK, 1)} K` },
    { label: "Qtr H", value: row => `${formatNumber(row.heatingTransmissionKwh)} kWh` },
    { label: "Qve H", value: row => `${formatNumber(row.heatingVentilationKwh)} kWh` },
    { label: "Internal", value: row => `${formatNumber(row.internalGainsKwh)} kWh` },
    { label: "Solar", value: row => `${formatNumber(row.solarGainsKwh)} kWh` },
    { label: "Solar source", value: row => row.solarOrientation ?? row.solarGainsSource ?? "--" },
    { label: "QHnd", value: row => `${formatNumber(row.qHndKwh)} kWh` },
    { label: "QCnd", value: row => `${formatNumber(row.qCndKwh)} kWh` }
  ], workspace.monthly);
}

function renderInstallationsResults(workspace) {
  if (workspace.installations?.status !== "ready") {
    return `
      <div class="monthly-sanity-panel" data-chapter3-installations-status>
        <strong>Instalatii Chapter 3</strong>
        <span>Nu sunt configurate sisteme tehnice explicite pentru acest model.</span>
      </div>
    `;
  }
  const carrierRows = Object.entries(workspace.installations.energyByCarrier ?? {})
    .map(([carrier, value]) => ({ carrier, value }));
  return `
    <section class="technical-workspace-panel" id="p2b-installations">
      <h4>Instalatii tehnice - MC001 Capitolul 3</h4>
      <p>Rezultatele de mai jos provin din runtime-ul Chapter 3 si din datele explicite de sistem salvate in Building DNA.</p>
      ${renderTable([
        { label: "Serviciu", value: row => row.service },
        { label: "Valoare", value: row => `${formatNumber(row.value)} ${row.unit}` },
        { label: "Stare", value: row => row.status },
        { label: "Cheie output", value: row => row.outputKey }
      ], workspace.installations.rows ?? [])}
      ${carrierRows.length ? renderTable([
        { label: "Purtator energie", value: row => row.carrier },
        { label: "Total anual", value: row => `${formatNumber(row.value)} kWh/an` }
      ], carrierRows) : ""}
      ${(workspace.installations.systemTopology ?? []).length ? renderTable([
        { label: "Serviciu", value: row => row.service },
        { label: "Sistem", value: row => row.systemId },
        { label: "Alocare", value: row => formatNumber(row.allocationFraction, 4) },
        { label: "Generator", value: row => row.generatorType ?? "--" },
        { label: "Purtator", value: row => row.energyCarrier ?? "--" },
        { label: "Total anual", value: row => `${formatNumber(row.annualInputKWh)} kWh/an` }
      ], workspace.installations.systemTopology) : ""}
      ${renderTable([
        { label: "Luna", value: row => row.monthLabel ?? row.month },
        { label: "Incalzire [kWh]", value: row => formatNumber(row.heatingInputKWh) },
        { label: "Racire [kWh]", value: row => formatNumber(row.coolingInputKWh) },
        { label: "ACM [kWh]", value: row => formatNumber(row.dhwInputKWh) },
        { label: "Vent. aux [kWh]", value: row => formatNumber(row.ventilationAuxiliaryKWh) },
        { label: "Iluminat [kWh]", value: row => formatNumber(row.lightingEnergyKWh) },
        { label: "PCM limita [kWh]", value: row => formatNumber(row.pcmInputEnergyLimitKWh) }
      ], workspace.installations.monthly ?? [])}
      <p class="section-description">${safeText(workspace.installations.lightingBoundaryStatement ?? "")}</p>
    </section>
  `;
}

function renderMonthlyClimateInspector(workspace) {
  return renderTable([
    { label: "Month", value: row => row.month },
    { label: "Ore", value: row => formatNumber(row.durationHours, 0) },
    { label: "T exterior incalzire", value: row => `${formatNumber(row.heatingOutdoorTemperatureC, 1)} C` },
    { label: "Delta T incalzire", value: row => `${formatNumber(row.heatingTemperatureDifferenceK, 1)} K` },
    { label: "T exterior racire", value: row => `${formatNumber(row.coolingOutdoorTemperatureC, 1)} C` },
    { label: "Delta T racire", value: row => `${formatNumber(row.coolingTemperatureDifferenceK, 1)} K` },
    { label: "Orientare solara", value: row => row.solarOrientation ?? "--" },
    { label: "Aport solar lunar (nu factor g)", value: row => `${formatNumber(row.solarGainsKwh)} kWh` },
    { label: "Sursa aport/iradiere", value: row => row.solarGainsSource ?? "--" },
    { label: "Aport intern", value: row => `${formatNumber(row.internalGainsKwh)} kWh` },
    { label: "Provenienta", value: row => row.monthlyProfileOrigin ?? "--" }
  ], workspace.monthly);
}

function renderSeasonalSanity(workspace) {
  const warnings = workspace.seasonalSanity?.diagnostics?.warnings ?? [];
  return `
    <div class="monthly-sanity-panel" data-monthly-seasonal-sanity>
      <strong>Control coerenta sezoniera lunara</strong>
      <span>QCnd vara: ${formatNumber(workspace.seasonalSanity?.checks?.summerCoolingKwh)} kWh</span>
      <span>QCnd mai + octombrie: ${formatNumber(workspace.seasonalSanity?.checks?.shoulderCoolingKwh)} kWh</span>
      <span>Avertizari: ${safeText(warnings.map(item => item.code).join(", ") || "none")}</span>
    </div>
  `;
}

function renderFormulaViewer(workspace) {
  return renderTable([
    { label: "Marime", value: row => row.formulaName },
    { label: "Formula", value: row => row.symbolicFormula ?? row.formulaId },
    { label: "Substitutie", value: row => row.substitutedFormula ?? row.inputVariables.map(item => `${item.symbol}=${formatNumber(item.value, 4)} ${item.unit ?? ""}`).join("; ") },
    { label: "Rezultat", value: row => row.resultLine ?? `${row.resultSymbol}=${formatNumber(row.resultValue, 4)} ${row.resultUnit ?? ""}` },
    { label: "Referinta", value: row => row.normativeReference ?? row.formulaId ?? "--" }
  ], workspace.formulaViews);
}

function renderTraceability(workspace) {
  return renderTable([
    { label: "Reference", value: row => row.reference },
    { label: "Chapter", value: row => row.chapter ?? "--" },
    { label: "Source", value: row => row.source },
    { label: "Model", value: row => row.buildingDnaLink }
  ], workspace.traceability);
}

function renderReportChapters(workspace, options = {}) {
  return `
    <div class="technical-report-document" data-pdf-like-report>
      ${workspace.report.chapters.map(chapter => `
        <section class="technical-report-chapter">
          <h2>${safeText(chapter.title)}</h2>
          <p>${safeText(chapter.summary)}</p>
          <small>${safeText(chapter.chapterId)} · ${safeText(chapter.rows.length)} entries</small>
        </section>
      `).join("")}
    </div>
  `;
}

function renderChapterRows(chapter) {
  const rows = Array.isArray(chapter.rows) ? chapter.rows.slice(0, 12) : [];
  if (rows.length === 0) return "";
  const keys = [...new Set(rows.flatMap(row => Object.keys(row ?? {})))]
    .filter(key => !["traceNodeId", "dependencies"].includes(key))
    .slice(0, 6);
  if (keys.length === 0) return "";
  return renderTable(
    keys.map(key => ({
      label: key,
      value: row => {
        const value = row?.[key];
        if (Array.isArray(value)) return value.map(item => item?.symbol ?? item).join(", ");
        if (value && typeof value === "object") return value.label ?? value.reference ?? value.origin ?? JSON.stringify(value);
        return value;
      }
    })),
    rows
  );
}

function renderTechnicalReportDocument(workspace, options = {}) {
  void options;
  return renderEngineeringNotebookReport(workspace);
}

function sectionTitle(sectionId) {
  const titles = {
    materiale: "Materiale si conductivitati",
    straturi_si_rezistente: "Straturi, rezistente R si coeficienti U",
    coeficienti_u: "Coeficienti U",
    transfer_anvelopa: "Transfer prin anvelopa si Htr",
    calcul_lunar_transmisie_ventilare: "Calcul lunar: transmisie si ventilare",
    calcul_lunar_aporturi: "Calcul lunar: aporturi interne si solare",
    calcul_lunar_incalzire: "Calcul lunar: QHnd",
    calcul_lunar_racire: "Calcul lunar: QCnd",
    totaluri_anuale: "Totaluri anuale"
  };
  return titles[sectionId] ?? sectionId ?? "Calcul";
}

function renderLocalVariables(variables = []) {
  if (!variables.length) return "";
  return `
    <dl class="notebook-local-variables">
      ${variables.map(variable => `
        <div>
          <dt><code>${safeText(variable.symbol)}</code></dt>
          <dd>${safeText(variable.meaning ?? "--")}</dd>
        </div>
      `).join("")}
    </dl>
  `;
}

function renderCalculationSheet(sections = []) {
  return sections.map(group => `
    <section class="calculation-notebook-section">
      <h3>${safeText(group.title ?? sectionTitle(group.sectionId))}</h3>
      ${renderLocalVariables(group.localVariables ?? [])}
      <div class="calculation-compact-lines">
        ${(group.lines ?? []).map(line => `
          <div class="calculation-compact-line" data-line-kind="${safeText(line.kind ?? "calculation")}">
            <code>${safeText(line.text ?? "")}</code>
          </div>
        `).join("")}
      </div>
      ${(group.lines ?? []).some(line => line.reference) ? `
        <p class="calculation-section-reference">${safeText((group.lines ?? []).find(line => line.reference)?.reference ?? "")}</p>
      ` : ""}
    </section>
  `).join("");
}

function renderLegacyCalculationSheet(calculations = []) {
  const sections = [];
  for (const calculation of calculations) {
    const section = calculation.section ?? "caiet_calcul";
    let current = sections.find(item => item.section === section);
    if (!current) {
      current = { section, title: sectionTitle(section), localVariables: [], lines: [] };
      sections.push(current);
    }
    current.lines.push({
      text: [
        calculation.substitutedFormula,
        calculation.resultLine
      ].filter(Boolean).join("\n"),
      reference: calculation.normativeReference ?? null
    });
  }
  return renderCalculationSheet(sections);
}

function renderCalculationNotebook(notebook = {}) {
  if (Array.isArray(notebook.sections) && notebook.sections.length > 0) {
    return renderCalculationSheet(notebook.sections);
  }
  return renderLegacyCalculationSheet(notebook.calculations ?? []);
}

function renderMainResultsDocument(report) {
  const mainResults = report?.mainResults ?? {};
  return `
    <section class="report-main-results">
      <h2>1. Rezultate principale</h2>
      <table class="technical-table report-results-table">
        <tbody>
          <tr><th>Necesar anual de incalzire QHnd</th><td>${formatNumber(mainResults.annualQHnd, 4)} kWh</td></tr>
          <tr><th>Necesar anual de racire QCnd</th><td>${formatNumber(mainResults.annualQCnd, 4)} kWh</td></tr>
        </tbody>
      </table>
      ${renderTable([
        { label: "Luna", value: row => row.monthLabel ?? row.month },
        { label: "QHnd [kWh]", value: row => formatNumber(row.qHndKwh, 4) },
        { label: "QCnd [kWh]", value: row => formatNumber(row.qCndKwh, 4) }
      ], mainResults.monthly ?? [])}
    </section>
  `;
}

function renderClimateReportChapter(report) {
  const chapter = (report?.chapters ?? []).find(item => item.chapterId === "amplasare_si_clima");
  if (!chapter) return "";
  const identityRows = (chapter.rows ?? []).filter(row => row.label);
  const monthlyRows = (chapter.rows ?? []).filter(row => row.month);
  return `
    <section class="report-climate-chapter">
      <h2>2. Amplasare si date climatice utilizate</h2>
      <p>${safeText(chapter.summary)}</p>
      ${renderTable([
        { label: "Parametru", value: row => row.label },
        { label: "Valoare", value: row => row.value }
      ], identityRows)}
      ${renderTable([
        { label: "Luna", value: row => row.monthLabel ?? row.month },
        { label: "theta e,H [degC]", value: row => formatNumber(row.heatingOutdoorTemperatureC, 4) },
        { label: "theta e,C [degC]", value: row => formatNumber(row.coolingOutdoorTemperatureC, 4) },
        { label: "Ore [h]", value: row => formatNumber(row.durationHours, 0) },
        { label: "Orientare solara", value: row => row.solarOrientation ?? "--" },
        { label: "Aport solar [kWh]", value: row => formatNumber(row.solarGainsKwh, 4) },
        { label: "Origine", value: row => row.monthlyProfileOrigin ?? "--" }
      ], monthlyRows)}
      ${(chapter.references ?? []).length ? `
        <p class="section-description">${safeText((chapter.references ?? []).join("; "))}</p>
      ` : ""}
    </section>
  `;
}

function hasReportChapter(report, chapterId) {
  return (report?.chapters ?? []).some(chapter => chapter.chapterId === chapterId);
}

function reportChapterNumbers(report) {
  const hasClimate = hasReportChapter(report, "amplasare_si_clima");
  const hasInstallations = hasReportChapter(report, "instalatii_capitolul_3");
  const installations = hasClimate ? 3 : 2;
  const notebook = 2 + (hasClimate ? 1 : 0) + (hasInstallations ? 1 : 0);
  return {
    installations,
    notebook,
    appendix: notebook + 1
  };
}

function renderInstallationsReportChapter(report) {
  const chapter = (report?.chapters ?? []).find(item => item.chapterId === "instalatii_capitolul_3");
  if (!chapter) return "";
  const numbers = reportChapterNumbers(report);
  const serviceRows = (chapter.rows ?? []).filter(row => row.service);
  const monthlyRows = (chapter.rows ?? []).filter(row => row.month);
  const limitation = (chapter.rows ?? []).find(row => row.label === "Limitare iluminat")?.value;
  return `
    <section class="report-installations-chapter">
      <h2>${numbers.installations}. Instalatii tehnice - MC001 Capitolul 3</h2>
      <p>${safeText(chapter.summary)}</p>
      ${renderTable([
        { label: "Serviciu", value: row => row.service },
        { label: "Valoare", value: row => `${formatNumber(row.value, 4)} ${row.unit ?? ""}` },
        { label: "Stare", value: row => row.status },
        { label: "Cheie trasabilitate", value: row => row.outputKey }
      ], serviceRows)}
      ${renderTable([
        { label: "Luna", value: row => row.monthLabel ?? row.month },
        { label: "Incalzire [kWh]", value: row => formatNumber(row.heatingInputKWh, 4) },
        { label: "Racire [kWh]", value: row => formatNumber(row.coolingInputKWh, 4) },
        { label: "ACM [kWh]", value: row => formatNumber(row.dhwInputKWh, 4) },
        { label: "Ventilatie aux [kWh]", value: row => formatNumber(row.ventilationAuxiliaryKWh, 4) },
        { label: "Iluminat [kWh]", value: row => formatNumber(row.lightingEnergyKWh, 4) },
        { label: "PCM limita [kWh]", value: row => formatNumber(row.pcmInputEnergyLimitKWh, 4) }
      ], monthlyRows)}
      ${limitation ? `<p class="section-description">${safeText(limitation)}</p>` : ""}
    </section>
  `;
}

function renderTechnicalAppendix(report, workspace = null) {
  const appendix = (report?.chapters ?? []).find(chapter => chapter.chapterId === "anexa_tehnica_interna");
  if (!appendix) return "";
  const numbers = reportChapterNumbers(report);
  return `
    <section class="technical-report-appendix">
      <h2>${numbers.appendix}. Anexa tehnica interna</h2>
      <p>Informatii pentru audit tehnic intern si depanare. Continutul principal de calcul este in caietul de mai sus.</p>
      ${renderChapterRows(appendix)}
      ${workspace ? renderTraceability(workspace) : ""}
    </section>
  `;
}

function renderEngineeringNotebookReport(workspace) {
  const report = workspace.report ?? {};
  const notebook = report.engineeringNotebook ?? workspace.engineeringNotebook ?? { sections: [], calculations: [] };
  const numbers = reportChapterNumbers(report);
  return `
    <div class="technical-report-document" data-pdf-like-report>
      <header class="technical-report-title-block">
        <p class="small-label">Raport tehnic MC001-2022</p>
        <h1>${safeText(report.title ?? "Caiet de calcul")}</h1>
        <p>Rezultatele si calculele de mai jos afiseaza valorile curente furnizate de motorul validat.</p>
      </header>
      ${renderMainResultsDocument(report)}
      ${renderClimateReportChapter(report)}
      ${renderInstallationsReportChapter(report)}
      <section class="engineering-calculation-notebook" data-engineering-calculation-notebook>
        <h2>${numbers.notebook}. Caiet de calcule ingineresti</h2>
        <p>Variabilele sunt definite local in fiecare sectiune, iar liniile de calcul sunt afisate continuu, in ordinea dependentelor.</p>
        <section class="notebook-calculation-steps">
          <h3>Calcule in ordinea dependentelor</h3>
          ${renderCalculationNotebook(notebook)}
        </section>
      </section>
      ${renderTechnicalAppendix(report, workspace)}
    </div>
  `;
}

function renderSavedTechnicalReportDocument(report) {
  const notebook = report?.engineeringNotebook ?? { sections: [], calculations: [] };
  const numbers = reportChapterNumbers(report);
  return `
    <div class="technical-report-document" data-pdf-like-report>
      <header class="technical-report-title-block">
        <p class="small-label">Raport tehnic MC001-2022</p>
        <h1>${safeText(report?.title ?? "Caiet de calcul")}</h1>
      </header>
      ${renderMainResultsDocument(report)}
      ${renderClimateReportChapter(report)}
      ${renderInstallationsReportChapter(report)}
      <section class="engineering-calculation-notebook" data-engineering-calculation-notebook>
        <h2>${numbers.notebook}. Caiet de calcule ingineresti</h2>
        <section class="notebook-calculation-steps">
          <h3>Calcule in ordinea dependentelor</h3>
          ${renderCalculationNotebook(notebook)}
        </section>
      </section>
      ${renderTechnicalAppendix(report)}
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

function numberValue(formData, name) {
  const raw = formValue(formData, name);
  if (raw === null || raw === undefined || raw === "") return undefined;
  const value = Number(raw);
  return Number.isFinite(value) ? value : undefined;
}

function nonNegativeNumber(formData, name) {
  const value = numberValue(formData, name);
  return value !== undefined && value >= 0 ? value : undefined;
}

function fractionValue(formData, name, fallback = 0) {
  const value = numberValue(formData, name);
  if (value === undefined) return fallback;
  return value >= 0 && value <= 1 ? value : undefined;
}

function yesValue(formData, name) {
  return formValue(formData, name) === "yes";
}

function stageInput(formData, prefix, stageId) {
  return {
    stageId,
    lossKWhPerMonth: nonNegativeNumber(formData, `${prefix}_${stageId}_loss_kwh_month`),
    auxiliaryKWhPerMonth: nonNegativeNumber(formData, `${prefix}_${stageId}_aux_kwh_month`),
    auxiliaryRecoveredFraction: fractionValue(formData, `${prefix}_${stageId}_aux_recovered_fraction`, 0),
    lossRecoveredFraction: fractionValue(formData, `${prefix}_${stageId}_loss_recovered_fraction`, 0),
    auxiliaryRecoverableFractionToHeating: fractionValue(formData, `${prefix}_${stageId}_aux_recoverable_fraction`, 0),
    lossRecoverableFractionToHeating: fractionValue(formData, `${prefix}_${stageId}_loss_recoverable_fraction`, 0)
  };
}

function dhwComponentMode(formData) {
  return formValue(formData, "chapter3_dhw_component_mode") === "component_contract"
    ? "component_contract"
    : "explicit_monthly";
}

function dhwPipeComponentFromForm(
  formData,
  {
    lengthField = "chapter3_dhw_pipe_length_m",
    equivalentLengthField = "chapter3_dhw_pipe_equivalent_length_m"
  } = {}
) {
  return {
    lengthM: nonNegativeNumber(formData, lengthField),
    equivalentLengthM: nonNegativeNumber(formData, equivalentLengthField),
    thetaWAmbientC: numberValue(formData, "chapter3_dhw_pipe_ambient_c"),
    meanTemperatureInput: {
      mode: "mean_distribution_temperature",
      thetaWDistributionC: numberValue(formData, "chapter3_dhw_distribution_temp_c"),
      deltaThetaWLoopK: nonNegativeNumber(formData, "chapter3_dhw_distribution_delta_k"),
      source: {
        origin: "expert_override",
        reference: "chapter3_dhw_distribution_temp_c"
      }
    },
    linearTransmittanceInput: {
      mode: "insulated_pipe",
      innerDiameterM: positiveNumber(formData, "chapter3_dhw_pipe_inner_d_m"),
      outerDiameterM: positiveNumber(formData, "chapter3_dhw_pipe_outer_d_m"),
      insulationThermalConductivityWPerMK: positiveNumber(formData, "chapter3_dhw_pipe_lambda_w_mk"),
      externalHeatTransferCoefficientWPerM2K: positiveNumber(formData, "chapter3_dhw_pipe_ha_w_m2k"),
      source: {
        origin: "product_data",
        reference: "chapter3_dhw_pipe_geometry_and_insulation"
      }
    },
    source: {
      origin: "product_data",
      reference: "chapter3_dhw_pipe_component_contract"
    }
  };
}

function applyDhwComponentContracts(formData, system) {
  if (dhwComponentMode(formData) !== "component_contract") return system;

  const distributionHours = nonNegativeNumber(formData, "chapter3_dhw_distribution_hours_month");
  const distributionPipe = dhwPipeComponentFromForm(formData);
  const recoverablePipeLength = nonNegativeNumber(formData, "chapter3_dhw_recoverable_pipe_length_m");
  const recoverablePipe = recoverablePipeLength === undefined
    ? null
    : dhwPipeComponentFromForm(formData, {
        lengthField: "chapter3_dhw_recoverable_pipe_length_m"
      });
  const stages = system.stages.map(stage => {
    if (stage.stageId === "distribution") {
      return {
        ...stage,
        lossKWhPerMonth: undefined,
        auxiliaryKWhPerMonth: undefined,
        lossCalculation: {
          mode: "dhw_distribution_loss_components",
          operationTimeHours: distributionHours,
          distributionPipeSegments: [distributionPipe],
          ...(recoverablePipe ? { recoverablePipeSegments: [recoverablePipe] } : {}),
          source: {
            origin: "product_data",
            reference: "chapter3_dhw_distribution_component_contract"
          }
        },
        auxiliaryCalculation: {
          mode: "dhw_recirculation_pump_auxiliary",
          pressureDropKPa: nonNegativeNumber(formData, "chapter3_dhw_pump_pressure_kpa"),
          designFlowRateM3PerH: nonNegativeNumber(formData, "chapter3_dhw_pump_flow_m3h"),
          operationLoadFactor: nonNegativeNumber(formData, "chapter3_dhw_pump_load_factor"),
          operationTimeHours: distributionHours,
          correctionFactor: nonNegativeNumber(formData, "chapter3_dhw_pump_correction_factor"),
          controlConstantCp1: numberValue(formData, "chapter3_dhw_pump_cp1"),
          controlConstantCp2: numberValue(formData, "chapter3_dhw_pump_cp2"),
          energyEfficiencyIndex: nonNegativeNumber(formData, "chapter3_dhw_pump_eei"),
          recoverableFraction: stage.auxiliaryRecoverableFractionToHeating,
          source: {
            origin: "product_data",
            reference: "chapter3_dhw_pump_component_contract"
          }
        }
      };
    }
    if (stage.stageId === "storage") {
      return {
        ...stage,
        lossKWhPerMonth: undefined,
        lossCalculation: {
          mode: "dhw_storage_standing_loss_single_volume",
          accessibleStorageVolumeFactor: fractionValue(
            formData,
            "chapter3_dhw_storage_accessible_factor",
            undefined
          ),
          distributionStorageLossFactor: positiveNumber(
            formData,
            "chapter3_dhw_storage_distribution_factor"
          ),
          storageHeatTransferCoefficientWPerK: nonNegativeNumber(
            formData,
            "chapter3_dhw_storage_h_w_k"
          ),
          storageSetpointTemperatureC: numberValue(
            formData,
            "chapter3_dhw_storage_setpoint_c"
          ),
          storageAmbientTemperatureC: numberValue(
            formData,
            "chapter3_dhw_storage_ambient_c"
          ),
          calculationHours: nonNegativeNumber(formData, "chapter3_dhw_storage_hours_month"),
          source: {
            origin: "product_data",
            reference: "chapter3_dhw_storage_component_contract"
          }
        }
      };
    }
    return stage;
  });

  return {
    ...system,
    stages,
    source: {
      ...system.source,
      componentContractMode: "dhw_component_contract_p8c"
    }
  };
}

function serviceSystem(formData, prefix, stageIds, metadata = {}) {
  return {
    systemId: metadata.systemId,
    enabled: true,
    servedScope: "whole_building",
    generatorType: formValue(formData, `${prefix}_generator_type`) || metadata.generatorType || "explicit_other",
    energyCarrier: formValue(formData, `${prefix}_energy_carrier`) || metadata.energyCarrier || "explicit_other",
    stages: stageIds.map(stageId => stageInput(formData, prefix, stageId)),
    source: {
      origin: "explicit_engineering_input",
      reference: `${prefix}.chapter3_installations_form`
    }
  };
}

function buildTechnicalSystemsFromForm(formData, usefulFloorAreaM2) {
  if (!yesValue(formData, "chapter3_installations_enabled")) {
    return undefined;
  }
  const systems = {
    schema: TECHNICAL_SYSTEMS_SCHEMA,
    source: {
      origin: "explicit_engineering_input",
      reference: "P4.installations_product_workflow"
    },
    heating: {
      enabled: yesValue(formData, "chapter3_heating_enabled"),
      systems: yesValue(formData, "chapter3_heating_enabled")
        ? [serviceSystem(formData, "chapter3_heating", CHAPTER3_INSTALLATION_STAGE_IDS, { systemId: "heating-main" })]
        : []
    },
    cooling: {
      enabled: yesValue(formData, "chapter3_cooling_enabled"),
      systems: yesValue(formData, "chapter3_cooling_enabled")
        ? [serviceSystem(formData, "chapter3_cooling", CHAPTER3_INSTALLATION_STAGE_IDS, { systemId: "cooling-main" })]
        : []
    },
    ventilationAhu: {
      enabled: yesValue(formData, "chapter3_ventilation_ahu_enabled"),
      systems: yesValue(formData, "chapter3_ventilation_ahu_enabled")
        ? [{
            systemId: "ventilation-ahu-main",
            enabled: true,
            configuration: formValue(formData, "chapter3_ventilation_configuration") || "balanced",
            fanElectricEnergyInput: {
              supplyAirFlowM3PerH: nonNegativeNumber(formData, "chapter3_supply_airflow_m3h"),
              supplyPressureDropPa: nonNegativeNumber(formData, "chapter3_supply_pressure_pa"),
              supplyFanEfficiency: fractionValue(formData, "chapter3_supply_fan_efficiency", undefined),
              extractAirFlowM3PerH: nonNegativeNumber(formData, "chapter3_extract_airflow_m3h"),
              extractPressureDropPa: nonNegativeNumber(formData, "chapter3_extract_pressure_pa"),
              extractFanEfficiency: fractionValue(formData, "chapter3_extract_fan_efficiency", undefined),
              calculationHours: nonNegativeNumber(formData, "chapter3_fan_hours_month")
            },
            heatRecoveryAuxiliaryKWhPerMonth: nonNegativeNumber(formData, "chapter3_heat_recovery_aux_kwh_month") ?? 0,
            preheatAuxiliaryKWhPerMonth: nonNegativeNumber(formData, "chapter3_preheat_aux_kwh_month") ?? 0,
            controlAuxiliaryKWhPerMonth: nonNegativeNumber(formData, "chapter3_control_aux_kwh_month") ?? 0,
            source: {
              origin: "explicit_engineering_input",
              reference: "chapter3_ventilation_ahu.chapter3_installations_form"
            }
          }]
        : []
    },
    domesticHotWater: {
      enabled: yesValue(formData, "chapter3_dhw_enabled"),
      ...(formValue(formData, "chapter3_dhw_useful_mode") === "residential_normative"
        ? {
            usefulDemandSource: {
              mode: "residential_normative",
              dwellingType:
                formValue(formData, "chapter3_dhw_dwelling_type") ||
                "single_family_or_terraced",
              source: {
                origin: "building_dna_derived",
                reference: "buildingSpecificParameters.usefulFloorAreaM2"
              }
            }
          }
        : {
            monthlyUsefulDemandKWh: nonNegativeNumber(formData, "chapter3_dhw_useful_kwh_month"),
            usefulDemandSource: {
              mode: "explicit_monthly",
              source: {
                origin: "expert_explicit_monthly_input",
                reference: "chapter3_dhw_useful_kwh_month"
              }
            }
          }),
      systems: yesValue(formData, "chapter3_dhw_enabled")
        ? [applyDhwComponentContracts(
            formData,
            serviceSystem(formData, "chapter3_dhw", CHAPTER3_DHW_STAGE_IDS, { systemId: "dhw-main" })
          )]
        : []
    },
    coolingStoragePcm: {
      enabled: yesValue(formData, "chapter3_pcm_enabled"),
      monthlyTemplate: yesValue(formData, "chapter3_pcm_enabled")
        ? {
            sensibleStorageTransformableEnergyKWh: numberValue(formData, "chapter3_pcm_transformable_kwh"),
            solidMassKg: numberValue(formData, "chapter3_pcm_solid_mass_kg"),
            solidSpecificHeatKWhPerKgK: numberValue(formData, "chapter3_pcm_specific_heat_kwh_kgk"),
            generatorOutletFlowTemperatureC: numberValue(formData, "chapter3_pcm_generator_outlet_c"),
            transitionTemperatureC: numberValue(formData, "chapter3_pcm_transition_c"),
            generatorOutletFlowDeltaK: numberValue(formData, "chapter3_pcm_generator_delta_k"),
            massDecreaseTransformableEnergyKWh: numberValue(formData, "chapter3_pcm_mass_decrease_transformable_kwh"),
            latentHeatKWhPerKg: numberValue(formData, "chapter3_pcm_latent_heat_kwh_kg"),
            initialSolidMassKg: numberValue(formData, "chapter3_pcm_initial_solid_mass_kg")
          }
        : null
    },
    lighting: {
      enabled: yesValue(formData, "chapter3_lighting_enabled"),
      totalAreaM2: usefulFloorAreaM2,
      explicitMonthlyEnergyKWh: yesValue(formData, "chapter3_lighting_enabled")
        ? Array.from({ length: 12 }, () => nonNegativeNumber(formData, "chapter3_lighting_monthly_kwh"))
        : [],
      leniSubspaces: yesValue(formData, "chapter3_lighting_enabled")
        ? [{
            subspaceId: "lighting-whole-building",
            areaM2: usefulFloorAreaM2,
            leniKWhPerM2Year: nonNegativeNumber(formData, "chapter3_lighting_leni_kwh_m2_year"),
            source: {
              origin: "explicit_engineering_input",
              reference: "chapter3_lighting_leni_explicit_boundary"
            }
          }]
        : [],
      boundaryStatus: "explicit_input_boundary_sr_en_15193_1"
    }
  };
  return systems;
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
  const wallMaterial = formValue(formData, "wall_material") || "unknown";
  const windowsReplaced = formValue(formData, "windows_replaced");
  const localityId = formValue(formData, "locality_id");
  const stationFromLocality = localityId
    ? findRomanianNormativeStationByLocalityId(localityId)
    : null;
  const legacyClimateProfileId = formValue(formData, "climate_profile_id");
  const climateProfileId = legacyClimateProfileId && (isDemoFixture || !stationFromLocality)
    ? legacyClimateProfileId
    : "";
  const climateProfile = climateProfileId
    ? findRomanianClimateProfileById(climateProfileId)
    : null;
  const climateStationId =
    formValue(formData, "climate_station_id") ||
    stationFromLocality?.stationId ||
    null;
  const localityName =
    stationFromLocality?.localityName ??
    (formValue(formData, "city") || null);
  const climateManualOverride = formValue(formData, "climate_manual_override") === "yes";
  const wallInsulationThicknessByOption = {
    "5cm": 0.05,
    "10cm": 0.1,
    "15cm": 0.15,
    "20cm+": 0.2
  };
  const wallInsulationThicknessM = wallInsulationThicknessByOption[wallInsulation];
  const technicalSystems = buildTechnicalSystemsFromForm(formData, usefulFloorAreaM2);

  return {
    buildingId: "building-platform-wizard-preview",
    buildingType,
    constructionPeriod: constructionPeriodFromYear(formValue(formData, "construction_year")),
    structuralSystem: explicitStructuralSystem && explicitStructuralSystem !== "unknown"
      ? explicitStructuralSystem
      : structuralSystemFromWallMaterial(wallMaterial),
    wallMaterial,
    renovations: {
      wallInsulation: wallInsulationSelected ? "eps" : false,
      ...(wallInsulationThicknessM === undefined ? {} : { wallInsulationThicknessM }),
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
    ...(technicalSystems === undefined ? {} : { technicalSystems }),
    context: {
      attic: roofType === "heated_attic" ? "heated" : "unheated",
      basement: floorType === "over_basement" ? "unheated" : "none"
    },
    location: {
      country: "RO",
      city: localityName,
      localityId: localityId || stationFromLocality?.localityId || null,
      localityName,
      climateStationId,
      stationId: climateStationId,
      countyName: formValue(formData, "county") || null,
      climateZone: formValue(formData, "climate_zone") || null,
      windZone: formValue(formData, "wind_zone") || null,
      manualOverride: climateManualOverride,
      overrideReason: formValue(formData, "climate_override_reason") || null,
      climateProfileId: climateProfile?.profileId ?? null,
      climateProfileSourceType: climateProfile?.sourceType ?? null
    },
    climate: {
      climateZone: formValue(formData, "climate_zone") || null,
      windZone: formValue(formData, "wind_zone") || null,
      assignmentOrigin: formValue(formData, "climate_assignment_origin") || null,
      manualOverride: climateManualOverride,
      overrideReason: formValue(formData, "climate_override_reason") || null
    },
    ...(climateProfile === null ? {} : {
      climateProfile,
      climateProfileId: climateProfile.profileId,
      allowSyntheticClimate: isDemoFixture && climateProfile.sourceType === "synthetic_demo_profile"
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
  const versionMetadata = pipeline.status === "ready" && pipeline.calculation
    ? buildBuildingPlatformVersionMetadata({
        buildingDna: pipeline.buildingDna,
        calculation: pipeline.calculation
      })
    : null;
  const annualQHnd = pipeline.review?.results?.annualQHnd ?? null;
  const annualQCnd = pipeline.review?.results?.annualQCnd ?? null;
  return {
    ...pipeline,
    technicalWorkspace,
    versionMetadata,
    dependencyTree: pipeline.review?.dependencyTrees?.annualQHnd ?? null,
    summary: {
      annualQHnd,
      annualQCnd
    }
  };
}

function renderBlockedEngineeringModelReview(preview) {
  const blockers = preview.diagnostics?.blockers ?? [];
  const solarBlocker = blockers.find(item => item.code === "SOLAR_GAIN_QSKY_AND_ELEMENT_INPUTS_REQUIRED");
  if (solarBlocker) {
    const contextDiagnostics = solarBlocker.contextDiagnostics ?? [];
    const technicalCodes = [
      solarBlocker.code,
      ...contextDiagnostics
    ].filter(Boolean);
    return `
      <section class="form-message error" data-solar-qsol-qsky-blocker>
        <p><strong>Calculul energetic nu poate fi finalizat inca.</strong></p>
        <p>Datele lunare de radiatie solara Hsol pentru localitatea selectata au fost incarcate din sursa normativa disponibila.</p>
        <p>Pentru calculul complet al aporturilor solare din MC001 Capitolul 2 mai sunt necesare datele si relatiile pentru Qsky, Qsol si elementele solare.</p>
        <p>Nu a fost generat un rezultat normativ incomplet.</p>
        <details class="technical-diagnostic-details">
          <summary>Detalii tehnice</summary>
          <p>Diagnostic activ: ${safeText(solarBlocker.code)}</p>
          <p>Diagnostic context: ${safeText(contextDiagnostics.join(", ") || "n/a")}</p>
          <p>Date disponibile: ${safeText((solarBlocker.availableInputs ?? []).join(", ") || "n/a")}</p>
          <p>Date lipsa: ${safeText((solarBlocker.missingInputs ?? []).join(", ") || "n/a")}</p>
          <p>Calcule afectate: ${safeText((solarBlocker.affectedCalculations ?? []).join(", ") || "n/a")}</p>
          <p>Eligibil productie: ${safeText(String(solarBlocker.productionEligible === true))}</p>
          <p>Coduri: ${safeText(technicalCodes.join(", "))}</p>
        </details>
      </section>
    `;
  }
  const codes = blockers
    .map(item => item.code)
    .filter(Boolean);
  const message = codes.length > 0 ? codes.join(", ") : "model_incomplet";
  return `<p class="form-message error">Modelul tehnic nu este gata: ${safeText(message)}</p>`;
}

export function renderEngineeringModelReview(preview, options = {}) {
  if (preview.status !== "ready") {
    return renderBlockedEngineeringModelReview(preview);
  }
  const dna = preview.buildingDna;
  const workspace = preview.technicalWorkspace;
  const openReport = options.openReport === true || dna.source?.origin === "demo_fixture";
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
        <span class="small-label">RAPORT TEHNIC</span>
        <h3>Document de calcul si tabele de verificare</h3>
      </div>
      ${renderTechnicalTabs(workspace)}
      ${renderAnnualSummary(workspace)}
      <div class="technical-workspace-grid">
        <section id="p2b-building" class="technical-workspace-panel">
          <h4>Cladire</h4>
          <p>${safeText(workspace.buildingSummary.buildingType)} / ${safeText(workspace.buildingSummary.constructionPeriod)} / ${safeText(workspace.buildingSummary.structuralSystem)}</p>
          <p>Typology: ${safeText(workspace.buildingSummary.typologyId)} · Mode: ${safeText(workspace.buildingSummary.userMode)}</p>
          <p>Climate profile: ${safeText(dna.climateProfile?.displayName ?? "missing")} / ${safeText(dna.climateProfile?.verificationStatus ?? "not_selected")}</p>
        </section>
        <section id="p2b-building_dna" class="technical-workspace-panel">
          <h4>Model canonic</h4>
          <p>Schema: ${safeText(dna.schema)} · Platform: ${safeText(dna.platformVersion)}</p>
          <p>Assumptions: ${safeText(dna.assumptions.length)} · Confirmations: ${safeText(dna.missingConfirmations.length)}</p>
        </section>
        <section id="p2b-chapter_2" class="technical-workspace-panel">
          <h4>Calcul MC001-2022 Capitolul 2</h4>
          <p>Valorile afisate sunt citite din modelul canonic si din rezultatele motorului validat.</p>
          <p>Domeniul activ este anvelopa, transferul lunar, QHnd/QCnd si, cand sunt introduse date explicite, instalatiile Capitolului 3.</p>
        </section>
      </div>
      <section id="p2b-assemblies" class="technical-workspace-panel">
        <h4>Ansambluri si coeficienti U</h4>
        ${renderAssemblies(workspace)}
      </section>
      <section id="p2b-materials" class="technical-workspace-panel">
        <h4>Materiale</h4>
        ${renderMaterials(workspace)}
      </section>
      ${dna.climateProfile?.sourceType === "synthetic_demo_profile" ? `
        <section class="technical-workspace-panel synthetic-climate-warning">
          <h4>Profil climatic sintetic</h4>
          <p>${safeText(dna.climateProfile.safetyLabel)}</p>
        </section>
      ` : ""}
      <section class="technical-workspace-panel">
        <h4>Straturi</h4>
        ${renderLayerStacks(workspace)}
      </section>
      <section class="technical-workspace-panel">
        <h4>Descompunere Htr</h4>
        ${renderHtrBreakdown(workspace)}
      </section>
      <section id="p2b-results" class="technical-workspace-panel">
        <h4>Date climatice lunare utilizate</h4>
        ${renderMonthlyClimateInspector(workspace)}
        ${renderSeasonalSanity(workspace)}
      </section>
      <section class="technical-workspace-panel">
        <h4>QHnd / QCnd lunar</h4>
        ${renderMonthlyResults(workspace)}
      </section>
      ${renderInstallationsResults(workspace)}
      <section id="p2b-report" class="technical-workspace-panel">
        <h4>Raport tehnic</h4>
        <div class="technical-report-success" data-technical-report-success>
          Raport tehnic generat din modelul curent si rezultatele validate.
        </div>
        <p>${safeText(workspace.report.title)} · ${safeText(workspace.report.source)}</p>
        ${renderTechnicalReportDocument(workspace, { openReport })}
      </section>
      <section id="p2b-traceability" class="technical-workspace-panel">
        <h4>Trasabilitate matematica</h4>
        ${renderFormulaViewer(workspace)}
      </section>
      <section class="technical-workspace-panel">
        <h4>Referinte normative</h4>
        ${renderTraceability(workspace)}
      </section>
    </section>
  ` : `<p class="form-message error">Technical workspace unavailable: ${safeText(workspace?.diagnostics?.blockers?.[0]?.code)}</p>`;
  const p3fTechnicalWorkspaceHtml = workspace?.status === "ready" ? `
    <section class="technical-workspace p3f-report-sheet" id="p2b-technical-workspace">
      <div class="section-heading">
        <span class="small-label">RAPORT TEHNIC</span>
        <h3>Rezultate principale si caiet complet de calcule</h3>
      </div>
      ${dna.climateProfile?.sourceType === "synthetic_demo_profile" ? `
        <section class="technical-workspace-panel synthetic-climate-warning">
          <h4>Profil climatic sintetic</h4>
          <p>${safeText(dna.climateProfile.safetyLabel)}</p>
        </section>
      ` : ""}
      <section id="p2b-report" class="technical-workspace-panel">
        <div class="technical-report-success" data-technical-report-success>
          Raport tehnic generat din modelul curent si rezultatele validate.
        </div>
        ${renderInstallationsResults(workspace)}
        ${renderTechnicalReportDocument(workspace)}
      </section>
    </section>
  ` : `<p class="form-message error">Raport indisponibil: ${safeText(workspace?.diagnostics?.blockers?.[0]?.code)}</p>`;
  return `
    <div class="recommendation-detail-card" data-building-platform-review>
      <div>
        ${p3fTechnicalWorkspaceHtml}
      </div>
    </div>
  `;
}

function formInputSnapshot(form) {
  if (!form) return "";
  let entries = [];
  if (typeof FormData === "function") {
    try {
      entries = [...new FormData(form).entries()];
    } catch {
      entries = [];
    }
  }
  if (entries.length === 0 && Array.isArray(form.controls)) {
    entries = form.controls
      .filter(control => control.name)
      .map(control => [control.name, control.type === "checkbox" ? String(control.checked) : String(control.value ?? "")]);
  }
  return JSON.stringify(
    entries
      .map(([key, value]) => [key, String(value)])
      .sort(([left], [right]) => left.localeCompare(right))
  );
}

function removeStaleNotice(previewTarget) {
  const existing = previewTarget?.querySelector?.("#buildingPlatformStaleNotice");
  existing?.remove?.();
}

function markBuildingPlatformResultsFresh(root, preview) {
  const form = root.getElementById?.("houseForm");
  const previewTarget = root.getElementById?.("buildingModelReview");
  const fingerprint =
    preview?.versionMetadata?.fingerprints?.analysisFingerprint ??
    preview?.technicalWorkspace?.calculationFingerprint?.fingerprintId ??
    "";
  const reportFingerprint =
    preview?.versionMetadata?.fingerprints?.reportFingerprint ??
    preview?.technicalWorkspace?.calculationFingerprint?.fingerprintId ??
    "";
  if (form?.dataset) {
    form.dataset.currentInputSnapshot = formInputSnapshot(form);
    form.dataset.currentCalculationFingerprint = fingerprint;
    form.dataset.currentReportFingerprint = reportFingerprint;
    form.dataset.currentResultStale = "0";
  }
  if (previewTarget?.dataset) {
    previewTarget.dataset.resultState = "fresh";
    previewTarget.dataset.calculationFingerprint = fingerprint;
  }
  removeStaleNotice(previewTarget);
}

export function markBuildingPlatformResultsStale(root = document, reason = "upstream_input_changed") {
  const form = root.getElementById?.("houseForm");
  const previewTarget = root.getElementById?.("buildingModelReview");
  if (!form?.dataset?.currentCalculationFingerprint) {
    return { stale: false, reason: "no_current_calculation" };
  }
  if (formInputSnapshot(form) === form.dataset.currentInputSnapshot) {
    return { stale: false, reason: "input_snapshot_unchanged" };
  }
  form.dataset.currentResultStale = "1";
  form.dataset.currentStaleReason = reason;
  if (previewTarget?.dataset) {
    previewTarget.dataset.resultState = "stale";
  }
  setSaveStatus(root, "Date modificate - rezultatele si raportul trebuie recalculate.", "pending");
  if (
    previewTarget &&
    typeof previewTarget.insertAdjacentHTML === "function" &&
    !previewTarget.querySelector?.("#buildingPlatformStaleNotice")
  ) {
    previewTarget.insertAdjacentHTML(
      "afterbegin",
      `<div id="buildingPlatformStaleNotice" class="building-platform-stale-notice" role="status">Date modificate - rezultatele trebuie recalculate. Raportul afisat apartine amprentei anterioare.</div>`
    );
  }
  return { stale: true, reason };
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
  if (preview.status === "ready") {
    markBuildingPlatformResultsFresh(root, preview);
  }
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

function setActionButtonBusy(root, buttonId, label) {
  const button = root.getElementById?.(buttonId);
  if (!button) return () => {};
  const previousText = button.textContent;
  const previousDisabled = button.disabled;
  button.disabled = true;
  button.dataset.busy = "1";
  button.setAttribute?.("aria-busy", "true");
  button.textContent = label;
  return () => {
    button.disabled = previousDisabled;
    button.dataset.busy = "0";
    button.setAttribute?.("aria-busy", "false");
    button.textContent = previousText;
  };
}

function currentHouseIdFromForm(form) {
  const raw = form?.dataset?.currentHouseId;
  const parsed = Number(raw);
  return Number.isInteger(parsed) && parsed > 0 ? parsed : null;
}

function currentVersionedProjectIdFromForm(form) {
  return form?.dataset?.currentVersionedProjectId || null;
}

function currentProjectTokenFromForm(form) {
  return form?.dataset?.currentProjectToken || null;
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

async function ensureBuildingPlatformV1Project(root, form, formData, apiClient) {
  const existingProjectId = currentVersionedProjectIdFromForm(form);
  const existingToken = currentProjectTokenFromForm(form);
  if (existingProjectId && existingToken) {
    return {
      ok: true,
      projectId: existingProjectId,
      concurrencyToken: existingToken,
      created: false
    };
  }
  const response = await apiClient("/api/building-platform/v1/projects/create", {
    project_name: formData.get?.("display_name") || "Model termic al cladirii",
    idempotency_key: `project-create-${Date.now()}`
  });
  if (!response?.success) {
    setSaveStatus(root, response?.error || "Proiectul versionat nu a putut fi creat.", "blocked");
    return { ok: false, response };
  }
  if (form?.dataset) {
    form.dataset.currentVersionedProjectId = response.project?.project_id ?? "";
    form.dataset.currentProjectToken = response.concurrency_token ?? "";
  }
  return {
    ok: true,
    projectId: response.project?.project_id,
    concurrencyToken: response.concurrency_token,
    created: true,
    response
  };
}

function analysisIdFromRoot(root, options = {}) {
  const explicit = options.analysisId ?? root.getElementById?.("buildingPlatformLoadAnalysisId")?.value;
  const parsed = Number(explicit);
  return Number.isInteger(parsed) && parsed > 0 ? parsed : null;
}

export function analysisIdFromSearch(search = "") {
  const parsed = Number(new URLSearchParams(search).get("analysis_id"));
  return Number.isInteger(parsed) && parsed > 0 ? parsed : null;
}

export function projectIdFromSearch(search = "") {
  const value = new URLSearchParams(search).get("project_id");
  return value && /^[a-zA-Z0-9_.:-]+$/.test(value) ? value : null;
}

function renderLoadedReportChapters(report) {
  if (report?.engineeringNotebook) {
    return renderSavedTechnicalReportDocument(report);
  }
  const chapters = Array.isArray(report?.chapters) ? report.chapters : [];
  if (chapters.length === 0) return "<p>Raportul salvat nu contine capitole structurate.</p>";
  return chapters.map(chapter => `
    <section class="technical-report-chapter">
      <h4>${safeText(chapter.title ?? chapter.chapterId)}</h4>
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
    </section>
  `).join("");
}

export function renderLoadedBuildingPlatformAnalysis(record) {
  const buildingDna =
    record?.building_dna ??
    record?.technical_details?.buildingDna ??
    record?.buildingDnaVersion?.complete_building_dna;
  const summary = record?.technical_details?.resultSummary ?? {
    annualQHnd: record?.analysisVersion?.annual_qhnd,
    annualQCnd: record?.analysisVersion?.annual_qcnd,
    monthCount: record?.analysisVersion?.monthly_qhnd?.length
  };
  const report =
    record?.technical_report ??
    record?.technical_details?.technicalReport ??
    record?.reportVersion?.structured_report_model;
  const version =
    record?.building_dna_version ??
    record?.technical_details?.buildingDnaVersion ??
    record?.buildingDnaVersion ??
    {};
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
  if (preview.status === "ready") {
    markBuildingPlatformResultsFresh(root, preview);
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

  const hadVersionedProjectBeforeSave = Boolean(currentVersionedProjectIdFromForm(form));
  const project = await ensureBuildingPlatformV1Project(root, form, formData, apiClient);
  if (!project.ok) {
    return { saved: false, reason: "project_create_failed", response: project.response, preview };
  }
  const fingerprints = preview.versionMetadata?.fingerprints;
  if (!fingerprints?.analysisFingerprint || !fingerprints?.reportFingerprint) {
    setSaveStatus(root, "Recalculeaza modelul inainte de salvarea versiunii permanente.", "blocked");
    return { saved: false, reason: "missing_current_fingerprint", preview };
  }

  setSaveStatus(root, "Se salveaza versiunea calculata...", "pending");
  const response = await apiClient("/api/building-platform/v1/permanent-save", {
    project_id: project.projectId,
    expected_project_token: project.concurrencyToken,
    idempotency_key: `permanent-save-${Date.now()}`,
    creation_reason: hadVersionedProjectBeforeSave ? "user_edit" : "initial_project_creation",
    building_dna: payload.value.building_dna,
    calculation_fingerprint: fingerprints.analysisFingerprint,
    report_fingerprint: fingerprints.reportFingerprint
  });
  if (!response?.success) {
    setSaveStatus(root, response?.error || "Versiunea calculata nu a putut fi salvata.", "blocked");
    return { saved: false, reason: "api_save_failed", response, preview };
  }
  if (form?.dataset) {
    form.dataset.currentVersionedProjectId = String(response.project?.project_id ?? project.projectId ?? "");
    form.dataset.currentProjectToken = String(response.concurrency_token ?? "");
    form.dataset.loadedBuildingDnaVersionId = String(response.buildingDnaVersion?.building_dna_version_id ?? "");
    form.dataset.currentAnalysisId = String(response.analysisVersion?.analysis_version_id ?? "");
    form.dataset.currentResultStale = "0";
  }
  setSaveStatus(
    root,
    `Versiune salvata: proiect ${response.project?.project_id ?? project.projectId}, analiza ${response.analysisVersion?.analysis_version_id ?? "necunoscuta"}.`,
    "ready"
  );
  return {
    saved: true,
    response,
    preview
  };
}

export async function saveBuildingPlatformDraft(root = document, options = {}) {
  const form = root.getElementById?.("houseForm");
  const previewTarget = root.getElementById?.("buildingModelReview");
  const formData = options.formData ?? (form ? new FormData(form) : null);
  if (!formData) {
    return { saved: false, reason: "missing_form_data" };
  }
  const apiClient = options.apiClient ?? globalThis.window?.LaCurentAuth?.api;
  if (typeof apiClient !== "function") {
    setSaveStatus(root, "Autentificarea este necesara pentru salvarea draftului.", "blocked");
    return { saved: false, reason: "missing_authenticated_api_client" };
  }

  const answers = mapWizardAnswersToAssistedAnswers(formData);
  const preview = buildWizardEngineeringPreview(answers);
  if (previewTarget) {
    previewTarget.innerHTML = renderEngineeringModelReview(preview, { openReport: false });
  }
  if (preview.status === "ready") {
    markBuildingPlatformResultsFresh(root, preview);
  }
  if (preview.status !== "ready") {
    setSaveStatus(root, "Modelul Building DNA nu este gata pentru draft.", "blocked");
    return { saved: false, reason: "preview_not_ready", preview };
  }

  const project = await ensureBuildingPlatformV1Project(root, form, formData, apiClient);
  if (!project.ok) {
    return { saved: false, reason: "project_create_failed", response: project.response, preview };
  }

  setSaveStatus(root, "Se salveaza draftul editabil...", "pending");
  const response = await apiClient("/api/building-platform/v1/drafts/save", {
    project_id: project.projectId,
    expected_project_token: project.concurrencyToken,
    building_dna: preview.buildingDna,
    last_calculation_fingerprint: preview.versionMetadata?.fingerprints?.analysisFingerprint ?? null
  });
  if (!response?.success) {
    setSaveStatus(root, response?.error || "Draftul nu a putut fi salvat.", "blocked");
    return { saved: false, reason: "api_draft_save_failed", response, preview };
  }
  if (form?.dataset) {
    form.dataset.currentVersionedProjectId = String(project.projectId ?? "");
    form.dataset.currentProjectToken = String(project.concurrencyToken ?? "");
    form.dataset.currentDraftId = String(response.draft?.draft_id ?? "");
  }
  setSaveStatus(root, `Draft salvat: ${response.draft?.draft_id ?? "draft activ"}.`, "ready");
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
    if (previewTarget.dataset) {
      previewTarget.dataset.resultState = "historical_saved_analysis";
    }
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

export async function loadBuildingPlatformV1Project(root = document, options = {}) {
  const form = root.getElementById?.("houseForm");
  const previewTarget = root.getElementById?.("buildingModelReview");
  const apiClient = options.apiClient ?? globalThis.window?.LaCurentAuth?.api;
  if (typeof apiClient !== "function") {
    setSaveStatus(root, "Autentificarea este necesara pentru incarcarea proiectului.", "blocked");
    return { loaded: false, reason: "missing_authenticated_api_client" };
  }
  const projectId = options.projectId ?? projectIdFromSearch(globalThis.window?.location?.search ?? "");
  if (!projectId) {
    setSaveStatus(root, "Lipseste project_id pentru redeschidere.", "blocked");
    return { loaded: false, reason: "invalid_project_id" };
  }
  setSaveStatus(root, "Se incarca proiectul versionat...", "pending");
  const response = await apiClient("/api/building-platform/v1/projects/open", { project_id: projectId });
  if (!response?.success) {
    setSaveStatus(root, response?.error || "Proiectul versionat nu a putut fi incarcat.", "blocked");
    return { loaded: false, reason: "api_project_open_failed", response };
  }
  const buildingDna = response.buildingDnaVersion?.complete_building_dna;
  if (!buildingDna) {
    setSaveStatus(root, "Proiectul nu are inca o versiune Building DNA permanenta.", "blocked");
    return { loaded: false, reason: "missing_permanent_building_dna_version", response };
  }
  const applied = applyBuildingDnaToWizardForm(form, buildingDna, {
    origin: "saved_building_dna",
    confirmationStatus: "loaded_saved_project",
    confidence: buildingDna?.source?.confidence ?? "medium"
  });
  if (form?.dataset) {
    form.dataset.currentVersionedProjectId = String(response.project?.project_id ?? projectId);
    form.dataset.currentProjectToken = String(response.concurrency_token ?? "");
    form.dataset.loadedBuildingDnaVersionId = String(response.buildingDnaVersion?.building_dna_version_id ?? "");
    form.dataset.currentAnalysisId = String(response.analysisVersion?.analysis_version_id ?? "");
    form.dataset.currentResultStale = "0";
  }
  if (previewTarget) {
    previewTarget.innerHTML = renderLoadedBuildingPlatformAnalysis(response);
    if (previewTarget.dataset) {
      previewTarget.dataset.resultState = "historical_saved_analysis";
      previewTarget.dataset.calculationFingerprint = response.analysisVersion?.calculation_fingerprint ?? "";
    }
  }
  setSaveStatus(root, `Proiect incarcat: ${response.project?.project_name ?? projectId}.`, "ready");
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
  const localitySelect = form.querySelector?.('[name="locality_id"]');
  if (localitySelect && localitySelect.options.length <= 1) {
    for (const locality of listRomanianProductionClimateLocalities()) {
      const option = createOption(
        root,
        locality.localityId,
        `${locality.localityName} - statia ${locality.stationId}`
      );
      if (!option) continue;
      option.dataset.stationId = locality.stationId;
      option.dataset.localityName = locality.localityName;
      option.dataset.datasetVersion = locality.datasetVersion;
      option.dataset.climateZone = locality.climateZone ?? "";
      option.dataset.windZone = locality.windZone ?? "";
      option.dataset.hasMonthlyTemperature =
        String(locality.coverage?.monthlyExteriorTemperature === true);
      option.dataset.hasMonthlySolarIrradiation =
        String(locality.coverage?.monthlySolarIrradiation === true);
      localitySelect.appendChild(option);
    }
  }
  const climateZoneSelect = form.querySelector?.('[name="climate_zone"]');
  if (climateZoneSelect && climateZoneSelect.options.length <= 1) {
    for (const zone of listRomanianClimateZones()) {
      const option = root.createElement?.("option");
      if (!option) continue;
      option.value = zone.zoneId;
      option.textContent = zone.label;
      option.dataset.datasetVersion = zone.datasetVersion;
      climateZoneSelect.appendChild(option);
    }
  }
  localitySelect?.addEventListener?.("change", () => {
    syncSelectedProductionLocality(form);
  });
  updateResolvedClimateProfilePanel(form);
  const demoControls = attachDemoControls(root, form);
  previewButton.addEventListener("click", () => {
    generateBuildingPlatformTechnicalReport(root, {
      openReport: form.dataset.demoMode === "1",
      scrollToReport: true
    });
  });
  const markStale = () => {
    markBuildingPlatformResultsStale(root);
  };
  form.addEventListener?.("input", markStale);
  form.addEventListener?.("change", markStale);
  const saveButton = root.getElementById?.("saveBuildingPlatformAnalysisBtn");
  const draftButton = root.getElementById?.("saveBuildingPlatformDraftBtn");
  const recalculateButton = root.getElementById?.("recalculateBuildingPlatformAnalysisBtn");
  const printButton = root.getElementById?.("printTechnicalReportBtn");
  const simplifiedModeButton = root.getElementById?.("toggleSimplifiedModeBtn");
  const loadButton = root.getElementById?.("loadBuildingPlatformAnalysisBtn");
  const loadInput = root.getElementById?.("buildingPlatformLoadAnalysisId");
  saveButton?.addEventListener("click", async () => {
    const restore = setActionButtonBusy(root, "saveBuildingPlatformAnalysisBtn", "Se salveaza versiunea...");
    try {
      await saveBuildingPlatformChapter2Analysis(root);
    } finally {
      restore();
    }
  });
  draftButton?.addEventListener("click", async () => {
    const restore = setActionButtonBusy(root, "saveBuildingPlatformDraftBtn", "Se salveaza draftul...");
    try {
      await saveBuildingPlatformDraft(root);
    } finally {
      restore();
    }
  });
  recalculateButton?.addEventListener("click", () => {
    const restore = setActionButtonBusy(root, "recalculateBuildingPlatformAnalysisBtn", "Se recalculeaza...");
    const result = generateBuildingPlatformTechnicalReport(root, {
      openReport: true,
      scrollToReport: true
    });
    if (result.generated) {
      setSaveStatus(root, "Rezultate recalculate, dar nesalvate.", "pending");
    }
    restore();
  });
  printButton?.addEventListener("click", () => {
    globalThis.window?.print?.();
  });
  simplifiedModeButton?.addEventListener("click", () => {
    root.querySelector?.(".p2c-technical-analysis")?.classList?.toggle("simplified-mode-active");
  });
  loadButton?.addEventListener("click", () => {
    loadBuildingPlatformChapter2Analysis(root);
  });
  if (typeof window !== "undefined") {
    const requestedAnalysisId = analysisIdFromSearch(window.location.search);
    const requestedProjectId = projectIdFromSearch(window.location.search);
    if (requestedProjectId !== null && !demoModeFromSearch(window.location.search)) {
      if (globalThis.window?.LaCurentAuth?.token?.()) {
        queueMicrotask(() => {
          loadBuildingPlatformV1Project(root, { projectId: requestedProjectId });
        });
      } else {
        setSaveStatus(root, "Autentifica-te pentru a redeschide proiectul salvat din Proiectele mele.", "blocked");
      }
    } else if (requestedAnalysisId !== null && !demoModeFromSearch(window.location.search)) {
      if (loadInput) loadInput.value = String(requestedAnalysisId);
      if (globalThis.window?.LaCurentAuth?.token?.()) {
        queueMicrotask(() => {
          loadBuildingPlatformChapter2Analysis(root, { analysisId: requestedAnalysisId });
        });
      } else {
        setSaveStatus(root, "Autentifica-te pentru a redeschide analiza salvata din Proiectele mele.", "blocked");
      }
    }
    window.addEventListener("beforeunload", (event) => {
      if (form?.dataset?.currentResultStale !== "1") return;
      event.preventDefault();
      event.returnValue = "Exista modificari nesalvate in proiect.";
    });
  }
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
    analysisIdFromSearch,
    projectIdFromSearch,
    buildBuildingPlatformSavePayload,
    mapWizardAnswersToAssistedAnswers,
    renderEngineeringModelReview,
    renderLoadedBuildingPlatformAnalysis,
    loadBuildingPlatformChapter2Analysis,
    loadBuildingPlatformV1Project,
    saveBuildingPlatformDraft,
    saveBuildingPlatformChapter2Analysis,
    structuralSystemFromWallMaterial,
    markBuildingPlatformResultsStale
  };
  window.addEventListener("DOMContentLoaded", () => {
    attachBuildingPlatformWizard(document);
  });
}
