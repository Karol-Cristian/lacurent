const SEGMENT_CONFIG = {
  residential: {
    label: "Locuințe",
    analysisLabel: "Analiza Locuinței",
    dashboardEyebrow: "COPILOT ENERGETIC PENTRU CASA TA",
    dashboardTitle: "Află cât de eficientă este locuința ta.",
    dashboardSubtitle:
      "Primești un scor energetic, comparații cu locuințe similare și recomandări personalizate pentru reducerea costurilor.",
    dashboardCta: "Analizează locuința gratuit",
    lockedMessage:
      "Completează analiza pentru a debloca scorul energetic, benchmark-ul și recomandările personalizate.",
    costLabel: "Cost lunar estimat",
    savingsLabel: "Economii potențiale",
    rankingLabel: "Ranking locuință",
    rankingHelp: "Clasă energetică estimată",
    benchmarkHelp:
      "Comparația folosește locuințe cu suprafață, an de construcție și tip de încălzire apropiate.",
    recommendationsTitle: "Primele acțiuni cu impact financiar.",
    analysisTitle: "Analiza energetică a locuinței",
    analysisSubtitle:
      "Completează informațiile pentru estimări și recomandări personalizate.",
    authAnalysisTitle: "Autentifică-te pentru a genera analiza",
    authAnalysisText:
      "Analiza se salvează în profilul tău, ca să o poți consulta și actualiza ulterior."
  },
  business: {
    label: "Afaceri",
    analysisLabel: "Analiza Afacerii",
    dashboardEyebrow: "COPILOT ENERGETIC PENTRU AFACEREA TA",
    dashboardTitle: "Înțelege unde pierde bani afacerea ta.",
    dashboardSubtitle:
      "Primești o analiză a costurilor energetice, comparații operaționale și recomandări cu impact financiar.",
    dashboardCta: "Analizează afacerea",
    lockedMessage:
      "Completează analiza afacerii pentru a debloca scorul operațional, benchmark-ul și recomandările.",
    costLabel: "Cost energetic lunar",
    savingsLabel: "Economii operaționale",
    rankingLabel: "Eficiență operațională",
    rankingHelp: "Estimare pe baza profilului afacerii",
    benchmarkHelp:
      "Comparația folosește afaceri cu tip, suprafață, program și consumatori similari.",
    recommendationsTitle: "Primele măsuri cu impact în costuri.",
    analysisTitle: "Analiza energetică a afacerii",
    analysisSubtitle:
      "Completează profilul operațional pentru recomandări adaptate afacerii.",
    authAnalysisTitle: "Autentifică-te cu un cont de afacere",
    authAnalysisText:
      "Analiza se leagă de profilul afacerii, locație și tipul de activitate."
  },
  industry: {
    label: "Industrie",
    analysisLabel: "Analiza Facilității",
    dashboardEyebrow: "COPILOT ENERGETIC PENTRU INDUSTRIE",
    dashboardTitle: "Identifică pierderile energetice din facilitate.",
    dashboardSubtitle:
      "Primești o analiză orientată pe procese, consumatori majori și priorități de eficientizare.",
    dashboardCta: "Analizează facilitatea",
    lockedMessage:
      "Completează analiza facilității pentru a debloca scorul, benchmark-ul și recomandările industriale.",
    costLabel: "Cost operațional energetic",
    savingsLabel: "Pierderi evitabile",
    rankingLabel: "Eficiență proces",
    rankingHelp: "Estimare pe baza profilului industrial",
    benchmarkHelp:
      "Comparația folosește facilități cu profil operațional și consumatori majori similari.",
    recommendationsTitle: "Primele măsuri pentru reducerea pierderilor.",
    analysisTitle: "Analiza energetică a facilității",
    analysisSubtitle:
      "Completează datele despre procese, program și consumatori majori.",
    authAnalysisTitle: "Autentifică-te cu un cont industrial",
    authAnalysisText:
      "Analiza se leagă de facilitate, procese și datele operaționale relevante."
  },
  institution: {
    label: "Instituții",
    analysisLabel: "Analiza Instituției",
    dashboardEyebrow: "COPILOT ENERGETIC PENTRU INSTITUȚII",
    dashboardTitle: "Vezi ce clădiri trebuie prioritizate.",
    dashboardSubtitle:
      "Primești o analiză pentru monitorizare, raportare și prioritizarea investițiilor energetice.",
    dashboardCta: "Analizează instituția",
    lockedMessage:
      "Completează analiza instituției pentru a debloca scorul, benchmark-ul și recomandările.",
    costLabel: "Buget energetic",
    savingsLabel: "Economii estimate",
    rankingLabel: "Prioritate clădiri",
    rankingHelp: "Estimare pentru portofoliul analizat",
    benchmarkHelp:
      "Comparația folosește instituții și clădiri cu profil energetic similar.",
    recommendationsTitle: "Primele investiții de prioritizat.",
    analysisTitle: "Analiza energetică a instituției",
    analysisSubtitle:
      "Completează datele despre clădiri, buget și planuri de renovare.",
    authAnalysisTitle: "Autentifică-te cu un cont de instituție",
    authAnalysisText:
      "Analiza se leagă de instituție, portofoliu de clădiri și obiectivele de raportare."
  },
  auditor: {
    label: "Auditor energetic",
    analysisLabel: "Portal Auditor",
    dashboardEyebrow: "PORTAL PENTRU AUDITORI ENERGETICI",
    dashboardTitle: "Gestionează clienți, rapoarte și validări.",
    dashboardSubtitle:
      "Conturile de auditor folosesc un flux dedicat pentru clienți, note și recomandări validate.",
    dashboardCta: "Deschide portalul auditor",
    lockedMessage:
      "Conturile de auditor folosesc portalul dedicat, nu analiza standard.",
    costLabel: "Clienți activi",
    savingsLabel: "Rapoarte planificate",
    rankingLabel: "Validări",
    rankingHelp: "Flux dedicat auditorilor",
    benchmarkHelp:
      "Auditorii pot valida analize și recomandări pentru clienții lor.",
    recommendationsTitle: "Activități recente pentru clienți.",
    analysisTitle: "Portal auditor energetic",
    analysisSubtitle:
      "Gestionează clienți, rapoarte, note și recomandări validate.",
    authAnalysisTitle: "Autentifică-te ca auditor",
    authAnalysisText:
      "Auditorii folosesc portalul dedicat pentru clienți și rapoarte."
  }
};

function normalizeSegment(role) {
  return SEGMENT_CONFIG[role] ? role : "residential";
}

function currentSegment() {
  const user = window.LaCurentAuth?.currentUser?.();
  return normalizeSegment(user?.role || "residential");
}

function applySegmentContext(segment = currentSegment()) {
  const config = SEGMENT_CONFIG[normalizeSegment(segment)];
  document.documentElement.dataset.segment = normalizeSegment(segment);

  document.querySelectorAll("[data-segment-key]").forEach(element => {
    const key = element.dataset.segmentKey;
    if (config[key]) {
      element.textContent = config[key];
    }
  });

  const analysisLink = document.querySelector("[data-sidebar-analysis]");
  if (analysisLink) {
    analysisLink.textContent = config.analysisLabel;
    analysisLink.href = normalizeSegment(segment) === "auditor"
      ? "/pages/auditor-portal.html"
      : "/pages/analiza-casa.html";
  }

  return config;
}

window.LaCurentSegments = {
  all: SEGMENT_CONFIG,
  apply: applySegmentContext,
  current: currentSegment,
  normalize: normalizeSegment
};

window.addEventListener("DOMContentLoaded", () => {
  applySegmentContext();
});
