import {
  calculateChapter2ForBuildingDna,
  createBuildingDnaFromAssistedAnswers,
  getBuildingDnaDependencyTree
} from "../src/building-platform/index.mjs";

export const BUILDING_PLATFORM_WIZARD_STEPS = Object.freeze([
  {
    stepId: "building_type",
    title: "Ce fel de locuinta ai?",
    assistedPrompt: "Alege casa sau apartament. Modelul tehnic ramane editabil in pasul de verificare."
  },
  {
    stepId: "construction_period",
    title: "Cand a fost construita?",
    assistedPrompt: "Un interval aproximativ este suficient pentru prima propunere."
  },
  {
    stepId: "envelope",
    title: "Din ce sunt peretii si ce ai renovat?",
    assistedPrompt: "Spune materialul principal, izolatia si daca ferestrele au fost schimbate."
  },
  {
    stepId: "boundaries",
    title: "Ce se afla sub si peste locuinta?",
    assistedPrompt: "Podul, subsolul si vecinatatile ajuta modelul sa aleaga limitele corecte."
  },
  {
    stepId: "review",
    title: "Verifica modelul tehnic propus",
    assistedPrompt: "Vezi ce a fost presupus automat, confirma sau cere editare avansata."
  }
]);

const YEAR_PERIODS = [
  { period: "before_1960", max: 1959 },
  { period: "1960_1977", min: 1960, max: 1977 },
  { period: "1978_1990", min: 1978, max: 1990 },
  { period: "1991_2005", min: 1991, max: 2005 },
  { period: "after_2005", min: 2006 }
];

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

function formValue(formData, name) {
  return typeof formData?.get === "function" ? formData.get(name) : formData?.[name];
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
  const buildingType = formValue(formData, "building_type") === "apartment"
    ? "apartment"
    : "detached_house";
  const wallInsulation = formValue(formData, "wall_insulation");
  const windowType = formValue(formData, "window_type");
  const roofType = formValue(formData, "roof_type");
  const floorType = formValue(formData, "floor_type");

  return {
    buildingId: "building-platform-wizard-preview",
    buildingType,
    constructionPeriod: constructionPeriodFromYear(formValue(formData, "construction_year")),
    structuralSystem: structuralSystemFromWallMaterial(formValue(formData, "wall_material")),
    renovations: {
      wallInsulation: wallInsulation && wallInsulation !== "unknown" && wallInsulation !== "Fara"
        ? "eps"
        : false,
      windowsReplaced: [
        "modern_double_glazing",
        "triple_glazing"
      ].includes(windowType)
    },
    context: {
      attic: roofType === "heated_attic" ? "heated" : "unheated",
      basement: floorType === "over_basement" ? "unheated" : "none"
    },
    location: {
      city: formValue(formData, "city") || null
    },
    source: {
      reference: "building_platform_wizard_answers"
    }
  };
}

export function buildWizardEngineeringPreview(assistedAnswers) {
  const dnaResult = createBuildingDnaFromAssistedAnswers(assistedAnswers);
  if (dnaResult.status !== "ready") {
    return {
      status: "blocked",
      stage: "building_dna",
      diagnostics: dnaResult.diagnostics
    };
  }
  const calculation = calculateChapter2ForBuildingDna(dnaResult.buildingDna);
  const annualQHnd = calculation.chapter2Result?.result?.annualQHnd ?? null;
  const annualQCnd = calculation.chapter2Result?.result?.annualQCnd ?? null;
  return {
    status: calculation.status,
    stage: calculation.stage,
    buildingDna: dnaResult.buildingDna,
    calculation,
    dependencyTree: getBuildingDnaDependencyTree(dnaResult.buildingDna, "annualQHnd"),
    summary: {
      annualQHnd,
      annualQCnd
    }
  };
}

export function renderEngineeringModelReview(preview) {
  if (preview.status !== "ready") {
    const code = preview.diagnostics?.blockers?.[0]?.code ?? "model_incomplet";
    return `<p class="form-message error">Modelul tehnic nu este gata: ${safeText(code)}</p>`;
  }
  const dna = preview.buildingDna;
  const assemblies = dna.assemblies.map(assembly => `
    <li>
      <strong>${safeText(assembly.displayName)}</strong>
      <span>Origine: ${safeText(assembly.provenance.origin)}</span>
      <span>Incredere: ${safeText(assembly.provenance.confidence)}</span>
    </li>
  `).join("");
  const confirmations = dna.missingConfirmations.map(item => `<li>${safeText(item)}</li>`).join("");
  return `
    <div class="recommendation-detail-card" data-building-platform-review>
      <div>
        <h3>Model tehnic propus</h3>
        <p>Locuinta: ${safeText(dna.building.buildingType)} / ${safeText(dna.building.constructionPeriod)}</p>
        <p>Incalzire anuala utila: <strong>${preview.summary.annualQHnd?.toFixed(2) ?? "--"} kWh</strong></p>
        <p>Racire anuala utila: <strong>${preview.summary.annualQCnd?.toFixed(2) ?? "--"} kWh</strong></p>
        <p>Rezultatele vin din motorul Chapter 2 validat. Modelul propus ramane editabil.</p>
        <h4>Ansambluri propuse</h4>
        <ul>${assemblies}</ul>
        <h4>Confirmari necesare</h4>
        <ul>${confirmations}</ul>
      </div>
    </div>
  `;
}

export function attachBuildingPlatformWizard(root = document) {
  const form = root.getElementById?.("houseForm");
  const previewTarget = root.getElementById?.("buildingModelReview");
  const previewButton = root.getElementById?.("buildingModelPreviewBtn");
  if (!form || !previewTarget || !previewButton) {
    return { attached: false };
  }
  previewButton.addEventListener("click", () => {
    const answers = mapWizardAnswersToAssistedAnswers(new FormData(form));
    const preview = buildWizardEngineeringPreview(answers);
    previewTarget.innerHTML = renderEngineeringModelReview(preview);
  });
  return { attached: true };
}

if (typeof window !== "undefined") {
  window.LaCurentBuildingPlatformWizard = {
    BUILDING_PLATFORM_WIZARD_STEPS,
    attachBuildingPlatformWizard,
    buildWizardEngineeringPreview,
    constructionPeriodFromYear,
    mapWizardAnswersToAssistedAnswers,
    renderEngineeringModelReview,
    structuralSystemFromWallMaterial
  };
  window.addEventListener("DOMContentLoaded", () => {
    attachBuildingPlatformWizard(document);
  });
}
