const SIMPLE_SCHEMA_VERSION = "lacurent_simple_input_v1";
const STORAGE_KEY = "lacurent_workspace_simple_v1";

const BUILDING_VISUAL_TYPES = Object.freeze({
  "house-single-storey": { type: "single_family_house", levels: 1, label: "Casa parter", silhouette: "single" },
  "house-p1": { type: "single_family_house", levels: 2, label: "Casa P+1", silhouette: "p1" },
  "house-mansard": { type: "single_family_house", levels: 2, label: "Casa cu mansarda", silhouette: "mansard" },
  "house-p2": { type: "single_family_house", levels: 3, label: "Casa P+2", silhouette: "p2" },
  "house-semi-detached": { type: "single_family_house", label: "Casa cuplata", silhouette: "semi" },
  "house-terraced": { type: "single_family_house", label: "Casa insiruita", silhouette: "terrace" },
  "apartment-small": { type: "apartment_block", label: "Bloc mic", silhouette: "small-block" },
  "apartment-block": { type: "apartment_block", label: "Bloc / apartament", silhouette: "block" }
});

function readNumber(value) {
  if (value === "" || value === null || value === undefined) return undefined;
  const number = Number(value);
  return Number.isFinite(number) ? number : undefined;
}

function writeNested(target, path, value) {
  const parts = path.split(".");
  let cursor = target;
  for (const part of parts.slice(0, -1)) {
    cursor[part] ||= {};
    cursor = cursor[part];
  }
  cursor[parts.at(-1)] = value;
}

function readNested(target, path) {
  return path.split(".").reduce((cursor, part) => cursor?.[part], target);
}

function generatedId() {
  return `project-${Date.now().toString(36)}`;
}

export function emptyWorkspaceState() {
  return {
    projectId: generatedId(),
    values: {},
    scenarios: [],
    lastResult: null,
    resultFresh: false
  };
}

export function collectFormValues(form) {
  const values = {};
  form.querySelectorAll("input[name],select[name],textarea[name]").forEach((field) => {
    if (field.type === "radio" && !field.checked) return;
    const rawValue = field.type === "checkbox" ? field.checked : field.value;
    const value = field.type === "number" ? readNumber(rawValue) : rawValue;
    writeNested(values, field.name, value);
  });
  return values;
}

export function applyValuesToForm(form, values) {
  form.querySelectorAll("input[name],select[name],textarea[name]").forEach((field) => {
    let value = readNested(values, field.name);
    if (field.name === "building.visualType" && value === undefined && values.building?.type) {
      value = Object.entries(BUILDING_VISUAL_TYPES).find(([, preset]) => preset.type === values.building.type)?.[0];
    }
    if (field.type === "checkbox") {
      field.checked = Boolean(value);
      return;
    }
    if (field.type === "radio") {
      field.checked = value === field.value;
      return;
    }
    field.value = value ?? "";
  });
}

export function resolveBuildingVisualType(building = {}) {
  const preset = BUILDING_VISUAL_TYPES[building.visualType] || null;
  return {
    visualType: building.visualType,
    type: building.type || preset?.type,
    levels: readNumber(building.levels) ?? preset?.levels,
    label: preset?.label,
    silhouette: preset?.silhouette
  };
}

export function deriveGeometry(values) {
  const building = values.building || {};
  const visual = resolveBuildingVisualType(building);
  const lengthM = readNumber(building.lengthM);
  const widthM = readNumber(building.widthM);
  const levels = visual.levels;
  const floorHeightM = readNumber(building.floorHeightM);
  const footprintM2 = lengthM && widthM ? lengthM * widthM : undefined;
  const usefulAreaM2 = footprintM2 && levels ? footprintM2 * levels : undefined;
  const heatedVolumeM3 = usefulAreaM2 && floorHeightM ? usefulAreaM2 * floorHeightM : undefined;
  return { footprintM2, usefulAreaM2, heatedVolumeM3 };
}

export function buildSimpleInputContract(values, options = {}) {
  const visualBuilding = resolveBuildingVisualType(values.building || {});
  const contract = {
    schemaVersion: SIMPLE_SCHEMA_VERSION,
    project: {
      projectId: options.projectId,
      name: values.project?.name || "Proiect LaCurent"
    },
    location: {
      locality: values.location?.locality || undefined,
      localityId: values.location?.localityId || undefined,
      localityName: values.location?.localityName || undefined,
      county: values.location?.county || undefined,
      lat: readNumber(values.location?.lat),
      lon: readNumber(values.location?.lon),
      climateZone: values.location?.climateZone || undefined,
      station: values.location?.station || undefined
    },
    building: {
      visualType: visualBuilding.visualType || undefined,
      type: visualBuilding.type || undefined,
      lengthM: readNumber(values.building?.lengthM),
      widthM: readNumber(values.building?.widthM),
      levels: visualBuilding.levels,
      floorHeightM: readNumber(values.building?.floorHeightM)
    },
    envelope: {
      wallAreaM2: readNumber(values.envelope?.wallAreaM2),
      roofAreaM2: readNumber(values.envelope?.roofAreaM2),
      floorAreaM2: readNumber(values.envelope?.floorAreaM2),
      windowAreaM2: readNumber(values.envelope?.windowAreaM2),
      wallUValueWPerM2K: readNumber(values.envelope?.wallUValueWPerM2K),
      roofUValueWPerM2K: readNumber(values.envelope?.roofUValueWPerM2K),
      floorUValueWPerM2K: readNumber(values.envelope?.floorUValueWPerM2K),
      windowUValueWPerM2K: readNumber(values.envelope?.windowUValueWPerM2K)
    },
    use: {
      category: values.use?.category || "residential"
    },
    systems: {
      technicalContractConfirmed: Boolean(values.systems?.technicalContractConfirmed),
      heating: {
        enabled: Boolean(values.systems?.heating?.enabled),
        generator: values.systems?.heating?.generator || undefined,
        carrier: values.systems?.heating?.carrier || undefined,
        sameGeneratorAsDhw: Boolean(values.systems?.heating?.sameGeneratorAsDhw),
        controlLossFactor: readNumber(values.systems?.heating?.controlLossFactor),
        operationHoursPerMonth: readNumber(values.systems?.heating?.operationHoursPerMonth),
        standbyLossPowerKW: readNumber(values.systems?.heating?.standbyLossPowerKW),
        auxiliaryPowerKW: readNumber(values.systems?.heating?.auxiliaryPowerKW)
      },
      domesticHotWater: {
        enabled: Boolean(values.systems?.domesticHotWater?.enabled),
        monthlyUsefulDemandKWh: readNumber(values.systems?.domesticHotWater?.monthlyUsefulDemandKWh)
      },
      cooling: {
        enabled: Boolean(values.systems?.cooling?.enabled),
        eer: readNumber(values.systems?.cooling?.eer),
        nominalCoolingPowerKW: readNumber(values.systems?.cooling?.nominalCoolingPowerKW),
        operationHoursPerMonth: readNumber(values.systems?.cooling?.operationHoursPerMonth)
      },
      ventilation: {
        enabled: Boolean(values.systems?.ventilation?.enabled)
      },
      sharedGeneratorAllocation: {
        heating: readNumber(values.systems?.sharedGeneratorAllocation?.heating),
        dhw: readNumber(values.systems?.sharedGeneratorAllocation?.dhw)
      }
    },
    renewables: {
      photovoltaic: {
        enabled: Boolean(values.renewables?.photovoltaic?.enabled),
        annualProductionKWh: readNumber(values.renewables?.photovoltaic?.annualProductionKWh),
        installedPowerKWp: readNumber(values.renewables?.photovoltaic?.installedPowerKWp)
      }
    },
    calculation: {
      monthlyProfiles: options.monthlyProfiles,
      climateMonthly: options.climateMonthly,
      solarGainPreprocessingStatus: options.solarGainPreprocessingStatus || "available_or_explicit"
    }
  };
  return JSON.parse(JSON.stringify(contract));
}

export function createScenario(baseValues, scenarioValues) {
  const values = structuredClone(baseValues);
  const wallU = readNumber(scenarioValues.wallUValueWPerM2K);
  if (wallU !== undefined) {
    values.envelope ||= {};
    values.envelope.wallUValueWPerM2K = wallU;
  }
  return {
    scenarioId: `scenario-${Date.now().toString(36)}`,
    name: scenarioValues.name || "Varianta",
    changes: {
      wallUValueWPerM2K: wallU
    },
    values
  };
}

export function readinessIssues(values) {
  const issues = [];
  const required = [
    ["location.locality", "Alege localitatea cladirii."],
    ["building.visualType", "Alege tipul vizual al cladirii."],
    ["building.lengthM", "Completeaza lungimea cladirii."],
    ["building.widthM", "Completeaza latimea cladirii."],
    ["building.floorHeightM", "Completeaza inaltimea de nivel."],
    ["envelope.wallAreaM2", "Completeaza aria peretilor exteriori."],
    ["envelope.wallUValueWPerM2K", "Completeaza valoarea U pentru perete."],
    ["envelope.roofUValueWPerM2K", "Completeaza valoarea U pentru acoperis."],
    ["envelope.floorUValueWPerM2K", "Completeaza valoarea U pentru planseu."]
  ];
  for (const [path, message] of required) {
    const value = readNested(values, path);
    if (value === "" || value === undefined || value === null) {
      issues.push({ path, message, type: "USER_INPUT_REQUIRED" });
    }
  }
  if (resolveBuildingVisualType(values.building || {}).levels === undefined) {
    issues.push({ path: "building.levels", message: "Completeaza numarul de niveluri incalzite.", type: "USER_INPUT_REQUIRED" });
  }
  if (values.systems?.heating?.enabled && !values.systems?.heating?.generator) {
    issues.push({ path: "systems.heating.generator", message: "Alege generatorul de incalzire.", type: "USER_INPUT_REQUIRED" });
  }
  if (values.systems?.heating?.sameGeneratorAsDhw && values.systems?.domesticHotWater?.enabled) {
    const heating = readNumber(values.systems?.sharedGeneratorAllocation?.heating);
    const dhw = readNumber(values.systems?.sharedGeneratorAllocation?.dhw);
    if (heating === undefined || dhw === undefined) {
      issues.push({ path: "systems.sharedGeneratorAllocation", message: "Introdu repartizarea generatorului comun.", type: "USER_INPUT_REQUIRED" });
    } else if (Math.abs(heating + dhw - 1) > 0.000001) {
      issues.push({ path: "systems.sharedGeneratorAllocation", message: "Repartizarea generatorului comun trebuie sa insumeze 1.", type: "USER_INPUT_REQUIRED" });
    }
  }
  return issues;
}

export function humanDiagnostic(diagnostic) {
  const code = diagnostic?.code || "CALCULATION_BLOCKED";
  const messages = {
    SIMPLE_INPUT_CONTRACT_INCOMPLETE: "Modelul este incomplet pentru calculatorul Python. Completeaza campul indicat sau furnizeaza profilul lunar sursa.",
    PYTHON_ENGINE_SERVICE_UNCONFIGURED: "Serviciul de calcul nu este disponibil momentan.",
    PYTHON_ENGINE_SERVICE_UNAVAILABLE: "Serviciul de calcul nu poate fi contactat momentan.",
    PYTHON_ENGINE_SERVICE_TIMEOUT: "Serviciul de calcul nu a raspuns in timpul acceptat.",
    SOLAR_GAIN_QSKY_AND_ELEMENT_INPUTS_REQUIRED: "Calculul complet al castigurilor solare necesita Qsky/Qsol si date de element solar; lipsa nu este tratata ca zero.",
    MISSING_ENGINE_INPUT: "Calculatorul are nevoie de o intrare fizica sau de produs care nu a fost furnizata."
  };
  return messages[code] || "Calculul nu poate continua cu datele curente.";
}

export function saveWorkspaceState(state) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
}

export function loadWorkspaceState() {
  try {
    const parsed = JSON.parse(localStorage.getItem(STORAGE_KEY) || "null");
    return parsed && typeof parsed === "object" ? parsed : emptyWorkspaceState();
  } catch {
    return emptyWorkspaceState();
  }
}

export { SIMPLE_SCHEMA_VERSION, STORAGE_KEY };
export { BUILDING_VISUAL_TYPES };

