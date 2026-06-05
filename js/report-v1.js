document.addEventListener("DOMContentLoaded", async () => {
  const demo = window.LaCurentReportV1Demo;
  const params = new URLSearchParams(window.location.search);
  const requestedHouseId = params.get("house_id");
  const requestedAdminHouseId = params.get("admin_house_id");
  if (requestedHouseId) {
    window.LaCurentHomes?.setActiveHouseId(requestedHouseId);
  }

  function money(value) {
    const number = Number(value);
    return Number.isFinite(number) && number > 0
      ? `${Math.round(number).toLocaleString("ro-RO")} lei/an`
      : "--";
  }

  function setText(id, value) {
    const element = document.getElementById(id);
    if (element) element.textContent = value || "--";
  }

  function escapeHtml(value) {
    return String(value ?? "--")
      .replaceAll("&", "&amp;")
      .replaceAll("<", "&lt;")
      .replaceAll(">", "&gt;")
      .replaceAll('"', "&quot;")
      .replaceAll("'", "&#039;");
  }

  function label(value) {
    return {
      low: "scazuta",
      medium: "medie",
      high: "ridicata",
      critical: "critic",
      urgent: "urgent",
      very_high: "foarte mare",
      insulation: "izolatie",
      heating: "incalzire",
      windows: "ferestre",
      controls: "control",
      lighting: "iluminat",
      renewables: "regenerabile",
      behavior: "comportament",
      maintenance: "mentenanta"
    }[value] || value || "--";
  }

  function sourceLabelFor(source) {
    return source === "api-admin"
      ? "vizualizare admin read-only"
      : source === "api"
        ? "date din DB si calcule LaCurent"
        : source === "guest"
          ? "raport local fara cont"
          : "raport demo";
  }

  function textValue(value, fallback = "necompletat") {
    if (value === null || value === undefined || value === "" || value === "unknown") return fallback;
    if (value === "not_provided") return "neintroduse inca";
    return String(value);
  }

  function areaValue(value) {
    const number = Number(value);
    return Number.isFinite(number) && number > 0 ? `${number.toLocaleString("ro-RO")} m2` : "necompletat";
  }

  function volumeValue(value) {
    const number = Number(value);
    return Number.isFinite(number) && number > 0 ? `${number.toLocaleString("ro-RO")} m3` : "necompletat";
  }

  function kwhYear(value) {
    const number = valueOf(value);
    return Number.isFinite(number) && number > 0 ? `${Math.round(number).toLocaleString("ro-RO")} kWh/an` : "--";
  }

  function kwhM2Year(value) {
    const number = valueOf(value);
    return Number.isFinite(number) && number > 0 ? `${Math.round(number).toLocaleString("ro-RO")} kWh/m2/an` : "--";
  }

  function co2M2Year(value) {
    const number = valueOf(value);
    return Number.isFinite(number) && number > 0 ? `${number.toFixed(1)} kgCO2/m2/an` : "--";
  }

  function valueOf(physicsValue) {
    return typeof physicsValue === "number" ? physicsValue : Number(physicsValue?.value || 0);
  }

  function createBadge(title, value) {
    return `<span class="decision-badge"><b>${title}</b>${label(value)}</span>`;
  }

  function costRange(min, max) {
    if (!min && !max) return "necesita estimare";
    if (min && max && min !== max) return `${Math.round(min).toLocaleString("ro-RO")}-${Math.round(max).toLocaleString("ro-RO")} lei`;
    return `${Math.round(min || max).toLocaleString("ro-RO")} lei`;
  }

  function savingsRange(min, max) {
    if (!min && !max) return "necesita facturi reale";
    if (min && max && min !== max) return `${money(min).replace("/an", "")}-${money(max).replace(" lei/an", " lei/an")}`;
    return money(min || max);
  }

  function payback(costMin, costMax, savingsMin, savingsMax) {
    const investment = Number(costMin || costMax || 0);
    const savings = Number(savingsMax || savingsMin || 0);
    if (!investment || !savings) return "incert";
    const years = investment / savings;
    if (years < 1) return "sub 1 an";
    return `${Math.round(years)} ani`;
  }

  function scenarioVerdict(item) {
    if (item.priority === "urgent" || item.priority === "high") return "Merita analizat primul";
    if (item.category === "renewables") return "Merita doar dupa reducerea pierderilor";
    if (item.costLevel === "very_high" && item.impactLevel !== "very_high") return "Bun tehnic, payback lung";
    if (item.confidencePercent && item.confidencePercent < 55) return "Necesita date suplimentare";
    return "Merita analizat";
  }

  function buildDemoPayload() {
    return { source: "demo", report: demo };
  }

  function normalizeAnnualCosts(snapshot, physicalResult, profile) {
    const systems = physicalResult?.systemsLayerV04?.finalEnergyByUse || {};
    const assessment = profile?.assessment || {};
    const heating = valueOf(systems.heating) * (snapshot?.financialLosses?.priceRonPerKwh || 0.35);
    const dhw = valueOf(systems.dhw) * (snapshot?.financialLosses?.priceRonPerKwh || 0.35);
    const auxiliary = valueOf(systems.auxiliary) * 1.3;
    const annualCost = Number(snapshot?.estimatedAnnualCostRon || assessment.estimatedAnnualCostRon || 0);
    const heatingCost = heating || annualCost * 0.65;
    const dhwCost = dhw || annualCost * 0.16;
    const electricCost = auxiliary || annualCost * 0.12;
    const totalEnergyCost = heatingCost + dhwCost + electricCost;
    const rawAvoidable = Number(snapshot?.financialLosses?.totalAnnualLossRon || assessment.estimatedAnnualSavingsMaxRon || 0);
    const avoidable = Math.min(rawAvoidable || totalEnergyCost * 0.35, totalEnergyCost * 0.65);
    return [
      { label: "Incalzire", valueRon: heatingCost, note: "energie finala estimata pentru incalzire", tone: "critical" },
      { label: "Apa calda menajera", valueRon: dhwCost, note: "necesar ACM si pierderi sistem", tone: "medium" },
      { label: "Electric casnic", valueRon: electricCost, note: "auxiliare si consum electric estimativ", tone: "low" },
      { label: "Cost evitabil estimat", valueRon: avoidable, note: "parte din costurile de mai sus, nu se adauga la total", tone: "high" }
    ];
  }

  function normalizeCertificateOverview({ snapshot = {}, physicalResult = {}, profile = {}, result = {}, source = "demo", annualCosts = [] }) {
    const home = snapshot.home || {};
    const systems = physicalResult?.systemsLayerV04?.finalEnergyByUse || {};
    const technical = snapshot.technicalDetails || {};
    const consumptionKwhM2 = snapshot.estimatedConsumptionKwhM2Year || physicalResult?.finalEnergyKwhM2Year || profile?.derived?.demand?.estimatedFinalEnergyKwhM2Year;
    const totalCo2 = snapshot.estimatedCo2KgM2Year || physicalResult?.co2KgM2Year || technical.primaryEnergyAndCo2V05?.totalCo2KgM2Year;
    const heatingCost = annualCosts.find(item => item.label === "Incalzire")?.valueRon;
    const dhwCost = annualCosts.find(item => item.label === "Apa calda menajera")?.valueRon;
    const electricCost = annualCosts.find(item => item.label === "Electric casnic")?.valueRon;
    return [
      {
        title: "Identificare raport",
        note: "Echivalentul zonei de identificare, dar pentru evaluarea estimativa LaCurent.",
        items: [
          ["ID raport", snapshot.id || `report-${result.analysis_id || result.house_id || "local"}`],
          ["ID locuinta", home.homeId || result.house_id || "necompletat"],
          ["Data generarii", snapshot.generatedAt ? new Date(snapshot.generatedAt).toLocaleDateString("ro-RO", { day: "numeric", month: "long", year: "numeric" }) : textValue(result.generated_at)],
          ["Status", "Evaluare estimativa"],
          ["Sursa date", sourceLabelFor(source)]
        ]
      },
      {
        title: "Date cladire analizata",
        note: "Datele constructive sunt pastrate separat de verdict, ca in prima parte a unui certificat.",
        items: [
          ["Amplasare", [home.location, home.county].filter(value => value && value !== "unknown").join(", ") || "necompletat"],
          ["Adresa / reper", textValue(home.address)],
          ["Categorie cladire", textValue(home.buildingCategory || "residential")],
          ["Tip locuinta", textValue(home.buildingType)],
          ["An construire", textValue(home.constructionYear)],
          ["Suprafata utila", areaValue(home.usefulAreaM2)],
          ["Suprafata incalzita", areaValue(home.heatedAreaM2)],
          ["Suprafata construita", areaValue(home.builtSurfaceM2)],
          ["Suprafata desfasurata", areaValue(home.unfoldedSurfaceM2)],
          ["Volum incalzit", volumeValue(home.heatedVolumeM3)],
          ["Niveluri", textValue(home.numberOfFloors)],
          ["Fotografii caracteristice", textValue(home.characteristicPhotos)]
        ]
      },
      {
        title: "Performanta totala",
        note: "Rezumatul energetic total si emisiile estimate.",
        items: [
          ["Scor LaCurent", snapshot.energyScore ? `${snapshot.energyScore}/100` : "--"],
          ["Clasa estimata", textValue(snapshot.estimatedEnergyClass)],
          ["Consum specific estimat", kwhM2Year(consumptionKwhM2)],
          ["Cost anual estimat", money(snapshot.estimatedAnnualCostRon || profile?.assessment?.estimatedAnnualCostRon)],
          ["CO2 specific estimat", co2M2Year(totalCo2)],
          ["Comparatie", snapshot.benchmarkExplanation || "Benchmark in calibrare"]
        ]
      },
      {
        title: "Consum pe utilitati",
        note: "Aceeasi impartire de baza: incalzire, ACM, iluminat/electric, climatizare si ventilare.",
        items: [
          ["Incalzire", `${kwhYear(systems.heating)} / ${money(heatingCost)}`],
          ["Apa calda menajera", `${kwhYear(systems.dhw || technical.dhwDemandKwhYear)} / ${money(dhwCost)}`],
          ["Iluminat / electric casnic", `${kwhYear(systems.lighting || systems.auxiliary)} / ${money(electricCost)}`],
          ["Climatizare", kwhYear(systems.cooling || physicalResult?.coolingDemandKwhYear)],
          ["Ventilare", physicalResult?.heatLossVentilation ? `${valueOf(physicalResult.heatLossVentilation).toFixed(1)} W/K pierderi` : "necompletat"],
          ["CO2 pe utilitati", "agregat acum; detaliere pe utilitati in v0.5+"]
        ]
      }
    ];
  }

  function normalizeHeatingBreakdown(snapshot, annualCosts = []) {
    const items = snapshot?.financialLosses?.items || [];
    const relevant = items.filter(item => !String(item.id).startsWith("system_dhw") && item.id !== "auxiliary");
    const heatingCost = Number(annualCosts.find(item => item.label === "Incalzire")?.valueRon || 0);
    const rawTotal = relevant.reduce((sum, item) => sum + Number(item.annualCostRon || 0), 0);
    const scale = heatingCost && rawTotal ? heatingCost / rawTotal : 1;
    const normalized = relevant.map(item => ({
      label: item.label,
      valueRon: Number(item.annualCostRon || 0) * scale
    }));
    const max = Math.max(...normalized.map(item => Number(item.valueRon || 0)), 1);
    return normalized.map(item => ({
      label: item.label,
      valueRon: item.valueRon,
      percent: Math.max(6, Math.round(Number(item.valueRon || 0) / max * 100))
    }));
  }

  function normalizeDiagnostics(profile, snapshot) {
    const problems = snapshot?.topProblems || profile?.assessment?.topProblems || [];
    const recommendations = snapshot?.staticRecommendations || profile?.recommendations || [];
    const groups = [
      { group: "Critice", items: [] },
      { group: "Importante", items: [] },
      { group: "Secundare", items: [] },
      { group: "Analizate, dar fara prioritate acum", items: [] }
    ];
    problems.forEach(problem => {
      const target = problem.severity === "critical" ? groups[0] : problem.severity === "high" ? groups[1] : groups[2];
      target.items.push({
        title: problem.title,
        impact: problem.impact || "medium",
        certainty: snapshot?.confidenceLevel || "medium",
        cost: "necesita estimare",
        priority: problem.severity || "medium"
      });
    });
    recommendations.slice(0, 8).forEach(recommendation => {
      const target = recommendation.priority === "high" || recommendation.priority === "urgent" ? groups[1] : groups[3];
      target.items.push({
        title: recommendation.title,
        impact: recommendation.impactLevel || "medium",
        certainty: snapshot?.confidenceLevel || "medium",
        cost: recommendation.costLevel || "medium",
        priority: recommendation.priority || "medium"
      });
    });
    return groups.filter(group => group.items.length);
  }

  function normalizeScenarios(result, profile) {
    const insights = result?.algorithm_insights || [];
    const catalog = insights.length ? insights : (profile?.recommendations || []);
    return catalog.slice(0, 8).map(item => ({
      title: item.title,
      cost: costRange(item.estimatedCostRonMin || item.estimatedInvestmentRonMin, item.estimatedCostRonMax || item.estimatedInvestmentRonMax),
      savings: savingsRange(item.estimatedSavingsRonYearMin, item.estimatedSavingsRonYearMax),
      payback: payback(item.estimatedCostRonMin || item.estimatedInvestmentRonMin, item.estimatedCostRonMax || item.estimatedInvestmentRonMax, item.estimatedSavingsRonYearMin, item.estimatedSavingsRonYearMax),
      comfort: item.category === "insulation" || item.type === "insulation" ? "bun" : item.category === "heating" ? "bun, dependent de sistem" : "variabil",
      risk: item.confidencePercent && item.confidencePercent < 60 ? "mediu-ridicat" : item.category === "renewables" ? "mediu" : "scazut-mediu",
      complexity: item.costLevel === "high" || item.costLevel === "very_high" ? "mare" : "medie",
      verdict: item.verdict || scenarioVerdict(item)
    }));
  }

  function normalizeTechnical(snapshot, physicalResult) {
    const envelope = physicalResult?.envelopeResults || [];
    const byId = Object.fromEntries(envelope.map(item => [item.elementId, item]));
    const metric = (labelText, value, source = "LaCurent Physics Engine") => ({ label: labelText, value, source });
    return {
      metrics: [
        metric("U pereti", byId.external_walls ? `${valueOf(byId.external_walls.correctedUValueWm2K).toFixed(2)} W/m2K` : "--"),
        metric("U pod", byId.attic_ceiling ? `${valueOf(byId.attic_ceiling.correctedUValueWm2K).toFixed(2)} W/m2K` : "--"),
        metric("Htr", physicalResult?.heatLossTransmission ? `${valueOf(physicalResult.heatLossTransmission).toFixed(1)} W/K` : "--"),
        metric("Hve", physicalResult?.heatLossVentilation ? `${valueOf(physicalResult.heatLossVentilation).toFixed(1)} W/K` : "--"),
        metric("QH,nd", physicalResult?.heatingDemandKwhM2Year ? `${valueOf(physicalResult.heatingDemandKwhM2Year).toFixed(1)} kWh/m2/an` : "--"),
        metric("Energie finala", physicalResult?.finalEnergyKwhM2Year ? `${valueOf(physicalResult.finalEnergyKwhM2Year).toFixed(1)} kWh/m2/an` : "--")
      ],
      assumptions: (snapshot?.technicalDetails?.assumptions || physicalResult?.assumptions || []).join(" ")
    };
  }

  async function loadReportData() {
    if (!window.LaCurentAuth?.token()) {
      const guestReport = window.LaCurentGuest?.latestReport?.();
      if (guestReport?.result?.report_snapshot) {
        return normalizeApiResult(guestReport.result, "guest");
      }
      return buildDemoPayload();
    }
    const requestPayload = requestedAdminHouseId
      ? { admin_house_id: requestedAdminHouseId }
      : requestedHouseId
        ? { house_id: requestedHouseId }
        : window.LaCurentHomes?.activeHouseRequest?.() || {};
    const result = await window.LaCurentAuth.api("/api/energy-report", requestPayload);
    if (!result.has_report) return buildDemoPayload();
    return normalizeApiResult(result, result.admin_view ? "api-admin" : "api");
  }

  function normalizeApiResult(result, source) {
    const snapshot = result.report_snapshot;
    const profile = result.profile;
    const physicalResult = result.physical_result;
    const home = snapshot.home || {};
    const annualCosts = normalizeAnnualCosts(snapshot, physicalResult, profile);
    const avoidableCost = annualCosts.find(item => item.label === "Cost evitabil estimat")?.valueRon;
    const certificateOverview = normalizeCertificateOverview({ snapshot, physicalResult, profile, result, source, annualCosts });
    return {
      source,
      report: {
        certificateOverview,
        home: {
          title: snapshot.home?.location ? `Locuinta din ${snapshot.home.location}` : (source === "guest" ? "Locuinta analizata local" : `Locuinta #${result.house_id}`),
          generatedAt: new Date(snapshot.generatedAt || result.generated_at).toLocaleDateString("ro-RO", { day: "numeric", month: "long", year: "numeric" }),
          facts: [
            `Tip: ${home.buildingType || "--"}`,
            `An constructie: ${home.constructionYear || "--"}`,
            `Suprafata: ${home.usefulAreaM2 || "--"} m2`,
            `Incalzire: ${home.heatingSystem || "--"}`,
            `Anvelopa: ${home.envelopeSummary || "--"}`,
            `Clasa estimata: ${snapshot.estimatedEnergyClass || "--"}`,
            `Scor: ${snapshot.energyScore || "--"}/100`
          ]
        },
        verdict: {
          title: snapshot.mainConclusion || "Evaluare energetica estimativa",
          conclusion: snapshot.shortExplanation || "Raportul foloseste datele introduse si calculele LaCurent Physics Engine.",
          avoidableCostRange: money(avoidableCost),
          confidence: `Incredere evaluare: ${label(snapshot.confidenceLevel)}`,
          missingData: snapshot.missingData?.length ? snapshot.missingData : ["facturi reale", "detalii tehnice suplimentare"]
        },
        annualCosts,
        heatingBreakdown: normalizeHeatingBreakdown(snapshot, annualCosts),
        diagnostics: normalizeDiagnostics(profile, snapshot),
        scenarios: normalizeScenarios(result, profile),
        notRecommended: demo.notRecommended,
        technical: normalizeTechnical(snapshot, physicalResult),
        aiContext: {
          reportSnapshot: snapshot,
          physicsResult: physicalResult,
          mode: "owner"
        }
      }
    };
  }

  async function loadSidebar() {
    const sidebarHost = document.getElementById("sidebar");
    if (!sidebarHost) return;
    const response = await fetch("../components/sidebar.html");
    sidebarHost.innerHTML = await response.text();
    window.LaCurentHomes?.refresh?.();
    const menuButton = document.getElementById("menuBtn");
    if (menuButton) {
      menuButton.onclick = () => document.querySelector(".sidebar")?.classList.toggle("open");
    }
  }

  function demoCertificateOverview(report, source = "demo") {
    return [
      {
        title: "Identificare raport",
        note: "Evaluare demonstrativa, nu certificat oficial.",
        items: [
          ["ID raport", "demo-report-v1"],
          ["ID locuinta", "demo-salicea-1964"],
          ["Data generarii", report.home.generatedAt],
          ["Status", "Evaluare estimativa"],
          ["Sursa date", sourceLabelFor(source)]
        ]
      },
      {
        title: "Date cladire analizata",
        note: "Date demo pentru o casa veche individuala.",
        items: [
          ["Amplasare", "Salicea, Cluj"],
          ["Adresa / reper", "necompletat"],
          ["Categorie cladire", "rezidential"],
          ["Tip locuinta", "casa individuala"],
          ["An construire", "1964"],
          ["Suprafata utila", "64.8 m2"],
          ["Suprafata incalzita", "64.8 m2"],
          ["Suprafata construita", "necompletat"],
          ["Suprafata desfasurata", "necompletat"],
          ["Volum incalzit", "162 m3"],
          ["Niveluri", "1"],
          ["Fotografii caracteristice", "neintroduse inca"]
        ]
      },
      {
        title: "Performanta totala",
        note: "Indicatori demonstrativi pentru structura raportului.",
        items: [
          ["Scor LaCurent", "estimativ"],
          ["Clasa estimata", "D/E"],
          ["Consum specific estimat", "160-210 kWh/m2/an"],
          ["Cost anual estimat", "13.300 lei/an"],
          ["CO2 specific estimat", "necalculat demo"],
          ["Comparatie", "comparatie demo cu locuinte similare"]
        ]
      },
      {
        title: "Consum pe utilitati",
        note: "Impartire demonstrativa pe utilizari energetice.",
        items: [
          ["Incalzire", "9.400 lei/an"],
          ["Apa calda menajera", "1.800 lei/an"],
          ["Iluminat / electric casnic", "2.100 lei/an"],
          ["Climatizare", "necompletat"],
          ["Ventilare", "pierderi prin ventilatie naturala"],
          ["CO2 pe utilitati", "agregat acum; detaliere pe utilitati in v0.5+"]
        ]
      }
    ];
  }

  function renderAnnualCosts(items) {
    const container = document.getElementById("annualCosts");
    container.innerHTML = items.map(item => `
      <article class="cost-category-card ${item.tone}">
        <span>${item.label}</span>
        <strong>${money(item.valueRon)}</strong>
        <p>${item.note}</p>
      </article>
    `).join("");
  }

  function renderCertificateOverview(sections) {
    const container = document.getElementById("certificateOverview");
    if (!container) return;
    container.innerHTML = sections.map(section => `
      <article class="certificate-overview-card">
        <h3>${escapeHtml(section.title)}</h3>
        <p>${escapeHtml(section.note)}</p>
        <dl>
          ${section.items.map(([term, description]) => `
            <div>
              <dt>${escapeHtml(term)}</dt>
              <dd>${escapeHtml(description)}</dd>
            </div>
          `).join("")}
        </dl>
      </article>
    `).join("");
  }

  function renderBars(items) {
    const container = document.getElementById("heatingBreakdown");
    container.innerHTML = items.map(item => `
      <article class="bar-row">
        <div>
          <span>${item.label}</span>
          <strong>${money(item.valueRon)}</strong>
        </div>
        <div class="bar-track" aria-label="${item.label}: ${item.percent}%">
          <span style="width:${Math.min(100, item.percent)}%"></span>
        </div>
      </article>
    `).join("");
  }

  function renderDiagnostics(groups) {
    const container = document.getElementById("diagnosticGroups");
    container.innerHTML = groups.map(group => `
      <section class="diagnostic-group">
        <h3>${group.group}</h3>
        <div>
          ${group.items.map(item => `
            <article class="diagnostic-item">
              <h4>${item.title}</h4>
              <div class="badge-row">
                ${createBadge("Impact", item.impact)}
                ${createBadge("Certitudine", item.certainty)}
                ${createBadge("Cost", item.cost)}
                ${createBadge("Prioritate", item.priority)}
              </div>
            </article>
          `).join("")}
        </div>
      </section>
    `).join("");
  }

  function renderScenarios(items) {
    const container = document.getElementById("scenarioGrid");
    container.innerHTML = items.map(item => `
      <article class="scenario-card-v1">
        <div class="scenario-card-head">
          <h3>${item.title}</h3>
          <span>${item.verdict}</span>
        </div>
        <dl>
          <div><dt>Cost estimat</dt><dd>${item.cost}</dd></div>
          <div><dt>Economie anuala</dt><dd>${item.savings}</dd></div>
          <div><dt>Payback</dt><dd>${item.payback}</dd></div>
          <div><dt>Confort</dt><dd>${item.comfort}</dd></div>
          <div><dt>Risc tehnic</dt><dd>${item.risk}</dd></div>
          <div><dt>Complexitate</dt><dd>${item.complexity}</dd></div>
        </dl>
      </article>
    `).join("");
  }

  function renderNotRecommended(items) {
    const container = document.getElementById("notRecommended");
    container.innerHTML = items.map(item => `
      <article>
        <h3>${item.title}</h3>
        <p>${item.explanation}</p>
      </article>
    `).join("");
  }

  function renderTechnical(technical) {
    const container = document.getElementById("technicalDetails");
    container.innerHTML = technical.metrics.map(metric => `
      <article>
        <span>${metric.label}</span>
        <strong>${metric.value}</strong>
        <em>${metric.source}</em>
      </article>
    `).join("");
    setText("technicalAssumptions", technical.assumptions);
  }

  function renderAiInsights(report) {
    const container = document.getElementById("reportAiInsights");
    if (!container) return;
    const cards = window.LaCurentAiInsights?.generateValidatedInsightCards?.(report.aiContext || {
      reportSnapshot: report,
      mode: "owner"
    }) || [];
    const reportCards = cards
      .filter(card => card.target === "report" && (
        card.validationStatus === "validated" ||
        ["missing_data", "risk", "comfort"].includes(card.category)
      ))
      .sort((a, b) => {
        const statusScore = value => value.validationStatus === "validated" ? 0 : 1;
        const priorityScore = value => ({ urgent: 0, high: 1, medium: 2, low: 3 }[value.priority] ?? 4);
        return statusScore(a) - statusScore(b) || priorityScore(a) - priorityScore(b);
      })
      .slice(0, 7);

    container.innerHTML = reportCards.length
      ? reportCards.map(card => `
        <article class="validated-insight-card ${card.category}">
          <div class="validated-insight-head">
            <span>${card.display.statusLabel}</span>
            <strong>${label(card.priority)}</strong>
          </div>
          <h3>${card.title}</h3>
          <p>${card.summary}</p>
          <small>${card.explanation}</small>
        </article>
      `).join("")
      : `<article class="validated-insight-card missing_data">
          <div class="validated-insight-head"><span>Necesita date</span><strong>partial</strong></div>
          <h3>Nu avem inca suficiente analize validate pentru raport.</h3>
          <p>Completeaza datele lipsa si facturile pentru carduri mai stabile.</p>
        </article>`;
  }

  try {
    await loadSidebar();
    const { source, report } = await loadReportData();
    const sourceLabel = sourceLabelFor(source);
    setText("reportMeta", `${report.home.title} · ${sourceLabel} · ${report.home.generatedAt}`);
    const guestPrompt = document.getElementById("guestSavePrompt");
    if (guestPrompt) guestPrompt.hidden = source !== "guest";
    renderCertificateOverview(report.certificateOverview || demoCertificateOverview(report, source));
    setText("verdictTitle", report.verdict.title);
    setText("verdictConclusion", report.verdict.conclusion);
    setText("avoidableCost", report.verdict.avoidableCostRange);
    setText("confidenceLevel", report.verdict.confidence);
    document.getElementById("missingData").innerHTML = `
      <strong>Date lipsa importante</strong>
      <ul>${report.verdict.missingData.map(item => `<li>${item}</li>`).join("")}</ul>
    `;
    renderAnnualCosts(report.annualCosts);
    renderBars(report.heatingBreakdown);
    renderDiagnostics(report.diagnostics);
    renderScenarios(report.scenarios);
    renderAiInsights(report);
    renderNotRecommended(report.notRecommended);
    renderTechnical(report.technical);
  } catch (error) {
    const report = demo;
    setText("reportMeta", `${report.home.title} · fallback demo`);
    renderCertificateOverview(report.certificateOverview || demoCertificateOverview(report, "demo"));
    setText("verdictTitle", report.verdict.title);
    setText("verdictConclusion", report.verdict.conclusion);
    setText("avoidableCost", report.verdict.avoidableCostRange);
    setText("confidenceLevel", report.verdict.confidence);
    document.getElementById("missingData").innerHTML = `
      <strong>Date lipsa importante</strong>
      <ul>${report.verdict.missingData.map(item => `<li>${item}</li>`).join("")}</ul>
    `;
    renderAnnualCosts(report.annualCosts);
    renderBars(report.heatingBreakdown);
    renderDiagnostics(report.diagnostics);
    renderScenarios(report.scenarios);
    renderAiInsights(report);
    renderNotRecommended(report.notRecommended);
    renderTechnical(report.technical);
  }
});
