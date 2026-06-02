document.addEventListener("DOMContentLoaded", async () => {
  const params = new URLSearchParams(window.location.search);
  const isDemo = params.get("demo") === "1";
  const endpoint = isDemo ? "/api/demo-energy-report" : "/api/energy-report";

  function text(id, value) {
    const el = document.getElementById(id);
    if (el) el.textContent = value;
  }

  function money(value) {
    return value ? `${Math.round(value).toLocaleString("ro-RO")} lei` : "--";
  }

  function label(value) {
    return {
      low: "scazuta",
      medium: "medie",
      high: "ridicata",
      critical: "critica",
      urgent: "urgenta",
      very_high: "foarte ridicata",
      house: "Casa",
      apartment: "Apartament"
    }[value] || value || "--";
  }

  function dateLabel(value) {
    const date = value ? new Date(value) : new Date();
    return `Raport generat la ${date.toLocaleDateString("ro-RO", {
      day: "numeric",
      month: "long",
      year: "numeric"
    })}`;
  }

  function renderProblems(problems = []) {
    const list = document.getElementById("problemsList");
    if (!list) return;
    list.innerHTML = "";
    problems.slice(0, 3).forEach((problem, index) => {
      const article = document.createElement("article");
      article.innerHTML = `
        <span>${index + 1}</span>
        <div>
          <h3>${problem.title}</h3>
          <p>${problem.explanation}</p>
        </div>
      `;
      list.append(article);
    });
  }

  function renderStaticRecommendations(recommendations = []) {
    const list = document.getElementById("recommendationsList");
    if (!list) return;
    list.innerHTML = "";
    recommendations.slice(0, 3).forEach((recommendation, index) => {
      const article = document.createElement("article");
      article.innerHTML = `
        <span>${index + 1}</span>
        <div>
          <h3>${recommendation.title}</h3>
          <p>${recommendation.userFacingExplanation || recommendation.reason || recommendation.action}</p>
        </div>
      `;
      list.append(article);
    });
  }

  function renderFinancialLosses(losses) {
    const list = document.getElementById("lossCostBreakdown");
    if (!list) return;
    const items = losses?.items || [];
    text("lossCostTotal", money(losses?.totalAnnualLossRon));
    text("lossCostPrice", losses?.priceRonPerKwh ? `${losses.priceRonPerKwh} lei/kWh` : "--");
    text("lossCostSource", losses?.priceSource || "--");
    list.innerHTML = "";
    if (!items.length) {
      const article = document.createElement("article");
      article.innerHTML = `
        <span>--</span>
        <div>
          <h3>Nu avem inca destule date</h3>
          <p>Completeaza detaliile locuintei si sistemele de incalzire pentru a estima pierderile in lei/an.</p>
        </div>
      `;
      list.append(article);
      return;
    }
    items.forEach(item => {
      const article = document.createElement("article");
      article.innerHTML = `
        <span>${money(item.annualCostRon)}</span>
        <div>
          <h3>${item.label}</h3>
          <p>${item.explanation} ${item.energyKwhYear ? `Echivalent energetic: ${Math.round(item.energyKwhYear).toLocaleString("ro-RO")} kWh/an.` : ""}</p>
          <small>${item.group || "Estimare"} · ${losses.dominantCarrier || "energie"}</small>
        </div>
      `;
      list.append(article);
    });
  }

  function fallbackSnapshot(profile, result) {
    const assessment = profile.assessment;
    const derived = profile.derived;
    const demand = derived.demand;
    const input = profile.input || {};
    return {
      generatedAt: result.generated_at || new Date().toISOString(),
      energyScore: assessment.score,
      estimatedEnergyClass: assessment.estimatedEnergyClass,
      mainConclusion: assessment.mainConclusion,
      shortExplanation: assessment.shortExplanation,
      estimatedConsumptionKwhM2Year: demand.estimatedFinalEnergyKwhM2Year,
      estimatedAnnualCostRon: assessment.estimatedAnnualCostRon,
      estimatedCo2KgM2Year: derived.emissions.estimatedCo2KgM2Year,
      confidenceLevel: assessment.confidence.level,
      confidenceScore: assessment.confidence.score,
      confidenceReasons: assessment.confidence.reasons || [],
      missingData: assessment.confidence.missingData || [],
      topProblems: assessment.topProblems || [],
      staticRecommendations: profile.recommendations || [],
      financialLosses: null,
      home: {
        buildingType: input.general?.buildingType,
        location: input.general?.location?.cityOrVillage || input.general?.location?.county,
        constructionYear: input.general?.constructionYear,
        usefulAreaM2: input.geometry?.usefulAreaM2,
        heatingSystem: input.heating?.systemType || input.heating?.mainSource,
        envelopeSummary: input.envelope?.walls?.insulated
      },
      technicalDetails: {
        heatingDemandKwhYear: demand.heatingDemandKwhYear,
        heatingDemandKwhM2Year: demand.heatingDemandKwhM2Year,
        coolingDemandKwhYear: demand.coolingDemandKwhYear,
        dhwDemandKwhYear: demand.dhwDemandKwhYear,
        heatPumpCop: derived.systems?.heating?.estimatedCop,
        assumptions: [...(demand.assumptions || []), ...(derived.systems?.heating?.assumptions || [])]
      },
      benchmarkExplanation: assessment.benchmark?.explanation
    };
  }

  try {
    const result = await window.LaCurentAuth.api(endpoint, {
      house_id: window.LaCurentHomes?.activeHouseId?.()
    });

    if (!result.has_report) {
      document.getElementById("reportEmpty").hidden = false;
      return;
    }

    const profile = result.profile;
    const snapshot = result.report_snapshot || fallbackSnapshot(profile, result);
    document.getElementById("reportContent").hidden = false;

    text("reportGeneratedAt", dateLabel(snapshot.generatedAt));
    text("reportHomeMeta", snapshot.home?.location ? `Locuinta din ${snapshot.home.location}` : "Locuinta analizata");
    text("reportScore", snapshot.energyScore);
    text("reportClass", `Clasa estimata LaCurent: ${snapshot.estimatedEnergyClass}`);
    text("confidenceTitle", `Incredere ${label(snapshot.confidenceLevel)}`);
    text("confidenceScore", `${snapshot.confidenceScore || "--"}/100`);
    text("mainConclusion", snapshot.mainConclusion);
    text("shortExplanation", snapshot.shortExplanation);

    text("buildingType", label(snapshot.home?.buildingType));
    text("homeLocation", snapshot.home?.location || "--");
    text("constructionYear", snapshot.home?.constructionYear || "--");
    text("usefulArea", snapshot.home?.usefulAreaM2 ? `${snapshot.home.usefulAreaM2} m2` : "--");
    text("heatingSystem", label(snapshot.home?.heatingSystem));
    text("envelopeSummary", snapshot.home?.envelopeSummary ? `Izolatie pereti: ${label(snapshot.home.envelopeSummary)}` : "--");

    text("energyIntensity", snapshot.estimatedConsumptionKwhM2Year ? `${snapshot.estimatedConsumptionKwhM2Year} kWh/m2/an` : "--");
    text("annualCost", money(snapshot.estimatedAnnualCostRon));
    text("benchmarkText", snapshot.benchmarkExplanation || "--");
    text("co2Estimate", snapshot.estimatedCo2KgM2Year ? `${snapshot.estimatedCo2KgM2Year} kg CO2/m2/an` : "--");

    renderProblems(snapshot.topProblems);
    renderStaticRecommendations(snapshot.staticRecommendations);
    renderFinancialLosses(snapshot.financialLosses || snapshot.technicalDetails?.financialLosses);

    text("heatingDemand", snapshot.technicalDetails?.heatingDemandKwhYear ? `${snapshot.technicalDetails.heatingDemandKwhYear} kWh/an` : "--");
    text("heatingDemandSpecific", snapshot.technicalDetails?.heatingDemandKwhM2Year ? `${snapshot.technicalDetails.heatingDemandKwhM2Year} kWh/m2/an` : "--");
    text("coolingDemand", snapshot.technicalDetails?.coolingDemandKwhYear ? `${snapshot.technicalDetails.coolingDemandKwhYear} kWh/an` : "--");
    text("solarGains", snapshot.technicalDetails?.solarGainsKwhYear ? `${snapshot.technicalDetails.solarGainsKwhYear} kWh/an` : "--");
    text("internalGains", snapshot.technicalDetails?.internalGainsKwhYear ? `${snapshot.technicalDetails.internalGainsKwhYear} kWh/an` : "--");
    text("heatPumpCop", snapshot.technicalDetails?.heatPumpCop ? `${Number(snapshot.technicalDetails.heatPumpCop).toFixed(1)} estimat` : "--");
    text("dhwDemand", snapshot.technicalDetails?.dhwDemandKwhYear ? `${snapshot.technicalDetails.dhwDemandKwhYear} kWh/an` : "--");
    text("demandDiagnostics", snapshot.technicalDetails?.energyDemandV03?.diagnostics
      ? `${snapshot.technicalDetails.energyDemandV03.diagnostics.mainReasonForHighDemand} ${snapshot.technicalDetails.energyDemandV03.diagnostics.monthlyPattern}`
      : "");
    text("confidenceReasons", (snapshot.confidenceReasons || []).join(" "));
    text(
      "missingData",
      (snapshot.missingData || []).length
        ? `Pentru precizie mai buna, completeaza: ${snapshot.missingData.join(", ")}.`
        : "Datele principale sunt complete pentru o estimare orientativa."
    );
    text("technicalAssumptions", (snapshot.technicalDetails?.assumptions || []).join(" "));
  } catch {
    document.getElementById("reportEmpty").hidden = false;
  }
});
