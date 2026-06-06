document.addEventListener("DOMContentLoaded", async () => {
  const demo = window.LaCurentReportV1Demo;
  const params = new URLSearchParams(window.location.search);
  const requestedHouseId = params.get("house_id");
  const requestedAdminHouseId = params.get("admin_house_id");
  const explicitDemo = params.get("demo") === "1";
  const explicitGuest = params.get("guest") === "1";
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

  function reportEnergyClassInfo(snapshot = {}, physicalResult = {}) {
    const classification = physicalResult?.classificationV06 || snapshot?.technicalDetails?.classificationV06 || {};
    const snapshotFromPhysics = snapshot.estimatedEnergyClassSource === "physics_v06";
    const value = classification.estimatedEnergyClass || (snapshotFromPhysics ? snapshot.estimatedEnergyClass : "unknown");
    return {
      value,
      source: classification.estimatedEnergyClass ? "physics_v06" : (snapshotFromPhysics ? snapshot.estimatedEnergyClassSource : "physics_required"),
      status: classification.classCalculationStatus || snapshot.estimatedEnergyClassBasis?.status || "blocked_missing_validated_methodology",
      missingReasons: classification.missingReasons || snapshot.estimatedEnergyClassMissingReasons || snapshot.estimatedEnergyClassBasis?.missingReasons || []
    };
  }

  function classBasisLabel(status) {
    if (status === "calculated_from_estimated_threshold_registry") return "estimativa";
    if (status === "blocked_missing_validated_methodology" || status === "cannot_classify" || status === "needs_building_type" || status === "error") return "blocata";
    return "estimativa";
  }

  function valueOf(physicsValue) {
    return typeof physicsValue === "number" ? physicsValue : Number(physicsValue?.value || 0);
  }

  function valueOrNull(physicsValue) {
    if (typeof physicsValue === "number" && Number.isFinite(physicsValue)) return physicsValue;
    const number = Number(physicsValue?.value);
    return Number.isFinite(number) ? number : null;
  }

  function numberLabel(value, unit, decimals = 0) {
    const number = valueOrNull(value);
    if (number === null || number <= 0) return "--";
    const rounded = decimals ? number.toFixed(decimals) : Math.round(number).toLocaleString("ro-RO");
    return `${rounded} ${unit}`;
  }

  function percentLabel(value) {
    const number = Number(value);
    return Number.isFinite(number) ? `${Math.round(number)}%` : "--";
  }

  function carrierLabel(value) {
    return {
      electricity: "electricitate",
      natural_gas: "gaz natural",
      wood: "lemn",
      pellets: "peleti",
      district_heating: "termoficare",
      lpg: "GPL",
      coal: "carbune",
      unknown: "necunoscut"
    }[value] || value || "necunoscut";
  }

  function utilityLabel(value) {
    return {
      heating: "Incalzire",
      dhw: "Apa calda menajera",
      lighting: "Iluminat interior",
      cooling: "Climatizare",
      ventilation: "Ventilare",
      auxiliary: "Auxiliare"
    }[value] || value || "--";
  }

  function dominantCarrier(finalByCarrier = {}) {
    return Object.entries(finalByCarrier)
      .map(([carrier, data]) => [carrier, valueOf(data)])
      .filter(([, value]) => value > 0)
      .sort((a, b) => b[1] - a[1])[0]?.[0] || "unknown";
  }

  function carrierFactors(carrier, finalByCarrier = {}, primary = {}) {
    const final = valueOf(finalByCarrier[carrier]);
    const primaryTotal = Number(primary.primaryEnergyByCarrier?.[carrier]?.totalKwh || 0);
    const co2 = Number(primary.co2ByCarrierKgYear?.[carrier] || 0);
    return {
      primaryFactor: final > 0 && primaryTotal > 0 ? primaryTotal / final : null,
      co2Factor: final > 0 && co2 > 0 ? co2 / final : null
    };
  }

  function uniqueList(items = []) {
    return [...new Set(items.filter(Boolean).map(item => String(item)))];
  }

  function factorSourceLabel(source) {
    if (!source) return "fara sursa";
    if (source === "MC001-2022") return "MC001-2022";
    if (source.includes?.("registry")) return source;
    return String(source);
  }

  function traceTitle(trace = {}) {
    return trace.formulaId || trace.id || trace.formulaText || "trace";
  }

  function estimateUsePrimaryAndCo2(finalKwh, carrier, finalByCarrier = {}, primary = {}) {
    const { primaryFactor, co2Factor } = carrierFactors(carrier, finalByCarrier, primary);
    return {
      primaryKwh: finalKwh > 0 && primaryFactor ? finalKwh * primaryFactor : null,
      co2Kg: finalKwh > 0 && co2Factor ? finalKwh * co2Factor : null
    };
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

  function emptyPayload(type, title, message, actions = []) {
    return { empty: { type, title, message, actions } };
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
    const classInfo = reportEnergyClassInfo(snapshot, physicalResult);
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
          ["Clasa estimata", textValue(classInfo.value)],
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

  function normalizeCertificateDetails({ snapshot = {}, physicalResult = {}, profile = {} }) {
    const systems = physicalResult?.systemsLayerV04 || {};
    const primary = physicalResult?.primaryEnergyAndCo2V05 || systems.primaryEnergyAndCo2V05 || {};
    const classification = physicalResult?.classificationV06 || primary.classificationV06 || {};
    const classInfo = reportEnergyClassInfo(snapshot, physicalResult);
    const finalByUse = systems.finalEnergyByUse || {};
    const finalByCarrier = systems.finalEnergyByCarrier || {};
    const carrierByUse = systems.finalEnergyCarrierByUse || {};
    const mainCarrier = dominantCarrier(finalByCarrier);
    const electricCarrier = valueOf(finalByCarrier.electricity) > 0 ? "electricity" : mainCarrier;
    const utilityRows = [
      {
        key: "heating",
        label: "Incalzire",
        finalKwh: valueOf(finalByUse.heating),
        carrier: carrierByUse.heating || mainCarrier,
        note: "necesar util transformat prin randamentul sistemului"
      },
      {
        key: "dhw",
        label: "Apa calda menajera",
        finalKwh: valueOf(finalByUse.dhw),
        carrier: carrierByUse.dhw || mainCarrier,
        note: carrierByUse.dhw
          ? "ACM foloseste carrier-ul sistemului de apa calda selectat"
          : "ACM estimata din ocupanti; carrier fallback pe sistemul principal"
      },
      {
        key: "lighting",
        label: "Iluminat interior",
        finalKwh: valueOf(finalByUse.lighting),
        carrier: "electricity",
        note: valueOf(finalByUse.lighting) > 0 ? "calcul separat iluminat" : "necalculat separat in engine; de extras din consum electric"
      },
      {
        key: "cooling",
        label: "Climatizare",
        finalKwh: valueOf(finalByUse.cooling),
        carrier: "electricity",
        note: valueOf(finalByUse.cooling) > 0 ? "racire transformata prin SEER/EER" : "nu exista racire sau lipsesc date"
      },
      {
        key: "ventilation",
        label: "Ventilare",
        finalKwh: 0,
        carrier: electricCarrier,
        note: physicalResult?.heatLossVentilation
          ? `${numberLabel(physicalResult.heatLossVentilation, "W/K", 1)} pierdere termica; energia ventilatoarelor nu este separata inca`
          : "necalculat separat"
      }
    ].map(row => {
      const estimated = estimateUsePrimaryAndCo2(row.finalKwh, row.carrier, finalByCarrier, primary);
      return {
        ...row,
        finalEnergy: row.finalKwh > 0 ? `${Math.round(row.finalKwh).toLocaleString("ro-RO")} kWh/an` : "--",
        primaryEnergy: estimated.primaryKwh ? `${Math.round(estimated.primaryKwh).toLocaleString("ro-RO")} kWh/an` : "de implementat pe utilitate",
        co2: estimated.co2Kg ? `${Math.round(estimated.co2Kg).toLocaleString("ro-RO")} kg/an` : "de implementat pe utilitate",
        carrierLabel: carrierLabel(row.carrier)
      };
    });

    const carrierRows = Object.entries(finalByCarrier)
      .map(([carrier, value]) => {
        const finalKwh = valueOf(value);
        if (!finalKwh) return null;
        const factors = carrierFactors(carrier, finalByCarrier, primary);
        const primaryDetail = primary.primaryEnergyByCarrier?.[carrier] || {};
        const co2Detail = primary.co2FactorDetailsByCarrier?.[carrier] || {};
        const factorWarnings = uniqueList([...(primaryDetail.warnings || []), ...(co2Detail.warnings || [])]);
        return {
          carrier: carrierLabel(carrier),
          finalEnergy: `${Math.round(finalKwh).toLocaleString("ro-RO")} kWh/an`,
          primaryEnergy: `${Math.round(primaryDetail.totalKwh || 0).toLocaleString("ro-RO")} kWh/an`,
          renewable: `${Math.round(primaryDetail.renewableKwh || 0).toLocaleString("ro-RO")} kWh/an`,
          nonRenewable: `${Math.round(primaryDetail.nonRenewableKwh || 0).toLocaleString("ro-RO")} kWh/an`,
          co2: `${Math.round(primary.co2ByCarrierKgYear?.[carrier] || 0).toLocaleString("ro-RO")} kg/an`,
          primaryFactor: factors.primaryFactor ? factors.primaryFactor.toFixed(2) : "--",
          co2Factor: factors.co2Factor ? factors.co2Factor.toFixed(3) : "--",
          primarySource: factorSourceLabel(primaryDetail.factorSource),
          co2Source: factorSourceLabel(co2Detail.factorSource),
          mappedPrimaryCarrier: primaryDetail.mappedPrimaryCarrier || carrier,
          mappedCo2Carrier: co2Detail.mappedCo2Carrier || carrier,
          factorWarnings
        };
      })
      .filter(Boolean);

    const systemRows = (systems.systemLosses || []).map(row => ({
      title: utilityLabel(row.use),
      useful: numberLabel(row.usefulDemandKwhYear, "kWh/an"),
      final: numberLabel(row.finalEnergyKwhYear, "kWh/an"),
      losses: numberLabel(row.lossesKwhYear, "kWh/an"),
      efficiency: valueOrNull(row.totalSystemEfficiency) ? valueOrNull(row.totalSystemEfficiency).toFixed(3) : "--"
    }));
    if (systems.auxiliaryEnergy) {
      systemRows.push({
        title: "Energie auxiliara",
        useful: "--",
        final: numberLabel(systems.auxiliaryEnergy.totalKwhYear, "kWh/an"),
        losses: "--",
        efficiency: "consum direct"
      });
    }

    const missing = [
      { label: "Numar certificat, auditor atestat, semnatura/stampila", status: "nu se aplica LaCurent", reason: "Raportul nu este certificat oficial." },
      { label: "Fotografii caracteristice", status: snapshot.home?.characteristicPhotos && snapshot.home.characteristicPhotos !== "not_provided" ? "prezent" : "lipsa", reason: "Formularul nu cere inca fotografii." },
      { label: "Suprafata construita si desfasurata", status: snapshot.home?.builtSurfaceM2 && snapshot.home.builtSurfaceM2 !== "unknown" ? "partial/prezent" : "lipsa", reason: "Avem suprafata utila; restul trebuie cerut explicit." },
      { label: "Iluminat interior separat", status: valueOf(finalByUse.lighting) > 0 ? "prezent" : "lipsa engine", reason: "Momentan este inclus in electric/auxiliare." },
      { label: "CO2 si energie primara pe fiecare utilitate", status: "partial", reason: "Engine-ul calculeaza sigur pe carrier; alocarea pe utilitati este estimativa." },
      { label: "Factori oficiali MC001 exacti", status: "de calibrat", reason: "Factorii v0.5 sunt internal_estimate." },
      { label: "Cladire de referinta oficiala", status: classification.comparedToReference ? "estimativ" : "lipsa", reason: "v0.6 foloseste referinta interna configurabila." }
    ];

    return {
      global: [
        { label: "Clasa energetica estimata", value: textValue(classInfo.value), note: classInfo.source === "physics_v06" ? "clasa estimativa din physics engine v0.6" : "indisponibila din physics engine" },
        { label: "Baza clasei", value: classBasisLabel(classInfo.status), note: classInfo.missingReasons?.slice(0, 2).join(", ") || "praguri estimative pe energie primara specifica" },
        { label: "Clasa mediu/CO2 estimata", value: textValue(classification.estimatedEnvironmentalClass), note: "Scala A - G" },
        { label: "Energie finala specifica", value: numberLabel(systems.totalFinalEnergyKwhM2Year || physicalResult?.finalEnergyKwhM2Year, "kWh/m2/an", 1), note: "total pe m2" },
        { label: "Energie primara specifica", value: numberLabel(primary.totalPrimaryEnergyKwhM2Year || physicalResult?.primaryEnergyKwhM2Year, "kWh/m2/an", 1), note: "cu factori de conversie" },
        { label: "Emisii CO2 specifice", value: numberLabel(primary.totalCo2KgM2Year || physicalResult?.co2KgM2Year, "kgCO2/m2/an", 1), note: "estimare LaCurent" },
        { label: "Pondere energie regenerabila", value: percentLabel(primary.renewableEnergyRatioPercent), note: "energie primara regenerabila" },
        { label: "Total energie primara", value: numberLabel(primary.totalPrimaryEnergyKwhYear || physicalResult?.primaryEnergyKwhYear, "kWh/an"), note: "toate carrier-ele" },
        { label: "Total CO2", value: numberLabel(primary.totalCo2KgYear || physicalResult?.co2KgYear, "kgCO2/an"), note: "toate carrier-ele" }
      ],
      activeClass: classInfo.value,
      utilityRows,
      systemRows,
      carrierRows,
      missing
    };
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
    const systems = physicalResult?.systemsLayerV04 || {};
    const primary = physicalResult?.primaryEnergyAndCo2V05 || {};
    const classification = physicalResult?.classificationV06 || {};
    const carrierWarnings = uniqueList([
      ...(systems.warnings || []),
      ...(primary.warnings || []),
      ...(classification.warnings || []),
      ...(classification.missingReasons || [])
    ]);
    const traces = [
      ...(systems.calculationTraces || []),
      ...(primary.calculationTraces || []),
      classification.calculationTrace
    ].filter(Boolean);
    const metric = (labelText, value, source = "LaCurent Physics Engine") => ({ label: labelText, value, source });
    return {
      metrics: [
        metric("U pereti", byId.external_walls ? `${valueOf(byId.external_walls.correctedUValueWm2K).toFixed(2)} W/m2K` : "--"),
        metric("U pod", byId.attic_ceiling ? `${valueOf(byId.attic_ceiling.correctedUValueWm2K).toFixed(2)} W/m2K` : "--"),
        metric("Htr", physicalResult?.heatLossTransmission ? `${valueOf(physicalResult.heatLossTransmission).toFixed(1)} W/K` : "--"),
        metric("Hve", physicalResult?.heatLossVentilation ? `${valueOf(physicalResult.heatLossVentilation).toFixed(1)} W/K` : "--"),
        metric("QH,nd", physicalResult?.heatingDemandKwhM2Year ? `${valueOf(physicalResult.heatingDemandKwhM2Year).toFixed(1)} kWh/m2/an` : "--"),
        metric("Energie finala", physicalResult?.finalEnergyKwhM2Year ? `${valueOf(physicalResult.finalEnergyKwhM2Year).toFixed(1)} kWh/m2/an` : "--"),
        metric("Energie primara", primary.totalPrimaryEnergyKwhM2Year ? `${valueOf(primary.totalPrimaryEnergyKwhM2Year).toFixed(1)} kWh/m2/an` : "--", "primaryEnergyFactors.registry"),
        metric("CO2", primary.totalCo2KgM2Year ? `${valueOf(primary.totalCo2KgM2Year).toFixed(1)} kgCO2/m2/an` : "--", "co2Factors.registry"),
        metric("Clasa estimata", classification.estimatedEnergyClass || "--", classification.thresholdSetUsed?.id || "energyClassThresholds.registry"),
        metric("Trace-uri calcul", traces.length ? `${traces.length} trace-uri` : "--", "CalculationTrace")
      ],
      assumptions: (snapshot?.technicalDetails?.assumptions || physicalResult?.assumptions || []).join(" "),
      warnings: carrierWarnings,
      traces: traces.slice(0, 8)
    };
  }

  async function loadReportData() {
    if (explicitDemo) {
      return buildDemoPayload();
    }
    if (!window.LaCurentAuth?.token()) {
      const guestReport = window.LaCurentGuest?.latestReport?.();
      if (guestReport?.result?.report_snapshot) {
        return normalizeApiResult(guestReport.result, "guest");
      }
      if (explicitGuest) {
        return emptyPayload(
          "guest_missing",
          "Raportul local nu a fost gasit",
          "Completeaza analiza in acest browser pentru a genera un raport local sau autentifica-te pentru rapoartele salvate in DB.",
          [{ href: "analiza-casa.html?new=1", label: "Completeaza analiza" }, { href: "profil.html?mode=login", label: "Autentificare" }]
        );
      }
      return emptyPayload(
        "auth_required",
        "Autentifica-te pentru raportul locuintei tale",
        "Raportul real se genereaza din locuintele si analizele salvate in baza de date. Demo-ul este disponibil doar din linkul dedicat.",
        [{ href: "profil.html?mode=login", label: "Autentificare" }, { href: "profil.html?mode=register", label: "Creeaza cont" }]
      );
    }
    const requestPayload = requestedAdminHouseId
      ? { admin_house_id: requestedAdminHouseId }
      : requestedHouseId
        ? { house_id: requestedHouseId }
        : window.LaCurentHomes?.activeHouseRequest?.() || {};
    const result = await window.LaCurentAuth.api("/api/energy-report", requestPayload);
    if (!result.has_report) {
      return emptyPayload(
        "missing_report",
        "Nu exista inca raport pentru locuinta selectata",
        result.message || "Adauga o locuinta si completeaza analiza pentru ca raportul sa fie calculat din date reale din DB.",
        [{ href: "analiza-casa.html?new=1", label: "Adauga locuinta" }]
      );
    }
    return normalizeApiResult(result, result.admin_view ? "api-admin" : "api");
  }

  function normalizeApiResult(result, source) {
    const snapshot = result.report_snapshot;
    const profile = result.profile;
    const physicalResult = result.physical_result;
    const classInfo = reportEnergyClassInfo(snapshot, physicalResult);
    const home = snapshot.home || {};
    const annualCosts = normalizeAnnualCosts(snapshot, physicalResult, profile);
    const avoidableCost = annualCosts.find(item => item.label === "Cost evitabil estimat")?.valueRon;
    const certificateOverview = normalizeCertificateOverview({ snapshot, physicalResult, profile, result, source, annualCosts });
    const certificateDetails = normalizeCertificateDetails({ snapshot, physicalResult, profile });
    return {
      source,
      report: {
        certificateOverview,
        certificateDetails,
        home: {
          title: snapshot.home?.location ? `Locuinta din ${snapshot.home.location}` : (source === "guest" ? "Locuinta analizata local" : `Locuinta #${result.house_id}`),
          generatedAt: new Date(snapshot.generatedAt || result.generated_at).toLocaleDateString("ro-RO", { day: "numeric", month: "long", year: "numeric" }),
          facts: [
            `Tip: ${home.buildingType || "--"}`,
            `An constructie: ${home.constructionYear || "--"}`,
            `Suprafata: ${home.usefulAreaM2 || "--"} m2`,
            `Incalzire: ${home.heatingSystem || "--"}`,
            `Anvelopa: ${home.envelopeSummary || "--"}`,
            `Clasa estimata: ${classInfo.value || "--"}`,
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

  function demoCertificateDetails() {
    return {
      global: [
        { label: "Clasa energetica estimata", value: "D/E", note: "demo orientativ" },
        { label: "Clasa mediu/CO2 estimata", value: "necalculata demo", note: "lipseste factorul complet" },
        { label: "Energie finala specifica", value: "300-420 kWh/m2/an", note: "interval demo" },
        { label: "Energie primara specifica", value: "de calculat", note: "v0.5 in API" },
        { label: "Emisii CO2 specifice", value: "de calculat", note: "v0.5 in API" },
        { label: "Pondere energie regenerabila", value: "partial biomasa", note: "lemn / estimativ" },
        { label: "Total energie primara", value: "de calculat", note: "necesita factori" },
        { label: "Total CO2", value: "de calculat", note: "necesita factori" }
      ],
      activeClass: "D",
      utilityRows: [
        { label: "Incalzire", finalEnergy: "dominant", primaryEnergy: "de calculat", co2: "de calculat", carrierLabel: "lemn", note: "sobe, randament scazut" },
        { label: "Apa calda menajera", finalEnergy: "estimativ", primaryEnergy: "de calculat", co2: "de calculat", carrierLabel: "necunoscut", note: "necesar pe ocupanti" },
        { label: "Iluminat interior", finalEnergy: "necalculat separat", primaryEnergy: "de implementat", co2: "de implementat", carrierLabel: "electricitate", note: "inclus in electric casnic demo" },
        { label: "Climatizare", finalEnergy: "--", primaryEnergy: "--", co2: "--", carrierLabel: "electricitate", note: "nu exista date" },
        { label: "Ventilare", finalEnergy: "--", primaryEnergy: "--", co2: "--", carrierLabel: "natural", note: "pierdere termica prin ventilatie naturala" }
      ],
      systemRows: [
        { title: "Incalzire", useful: "160-210 kWh/m2/an", final: "ridicata", losses: "ridicate", efficiency: "scazut" },
        { title: "Apa calda menajera", useful: "estimativ", final: "estimativ", losses: "necunoscut", efficiency: "necunoscut" }
      ],
      carrierRows: [
        { carrier: "lemn", finalEnergy: "dominant", primaryEnergy: "de calculat", renewable: "partial", nonRenewable: "partial", co2: "de calculat", primaryFactor: "de calibrat", co2Factor: "de calibrat" },
        { carrier: "electricitate", finalEnergy: "electric casnic", primaryEnergy: "de calculat", renewable: "de calculat", nonRenewable: "de calculat", co2: "de calculat", primaryFactor: "de calibrat", co2Factor: "de calibrat" }
      ],
      missing: [
        { label: "Numar certificat, auditor atestat, semnatura/stampila", status: "nu se aplica LaCurent", reason: "Raportul este estimativ." },
        { label: "Fotografii caracteristice", status: "lipsa", reason: "Demo fara upload foto." },
        { label: "Suprafata construita si desfasurata", status: "lipsa", reason: "Demo are doar suprafata utila." },
        { label: "Iluminat, climatizare, ventilare cu CO2 separat", status: "partial", reason: "Necesita extindere engine si formular." }
      ]
    };
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

  function renderCertificateDetails(details) {
    const data = details || demoCertificateDetails();
    const global = document.getElementById("certificateGlobal");
    if (global) {
      global.innerHTML = data.global.map(item => `
        <article>
          <span>${escapeHtml(item.label)}</span>
          <strong>${escapeHtml(item.value)}</strong>
          <p>${escapeHtml(item.note)}</p>
        </article>
      `).join("");
    }

    const scale = document.getElementById("certificateClassScale");
    if (scale) {
      const classes = ["A+", "A", "B", "C", "D", "E", "F", "G"];
      scale.innerHTML = `
        <span>Scala clase energetice estimate</span>
        <div>
          ${classes.map(className => `<b class="${className === data.activeClass ? "active" : ""}">${className}</b>`).join("")}
        </div>
      `;
    }

    const utilityRows = document.getElementById("certificateUtilityRows");
    if (utilityRows) {
      utilityRows.innerHTML = data.utilityRows.map(row => `
        <tr>
          <td><strong>${escapeHtml(row.label)}</strong></td>
          <td>${escapeHtml(row.finalEnergy)}</td>
          <td>${escapeHtml(row.primaryEnergy)}</td>
          <td>${escapeHtml(row.co2)}</td>
          <td><span>${escapeHtml(row.carrierLabel)}</span><small>${escapeHtml(row.note)}</small></td>
        </tr>
      `).join("");
    }

    const systemRows = document.getElementById("certificateSystemRows");
    if (systemRows) {
      systemRows.innerHTML = data.systemRows.length
        ? data.systemRows.map(row => `
          <article>
            <strong>${escapeHtml(row.title)}</strong>
            <span>util: ${escapeHtml(row.useful)}</span>
            <span>final: ${escapeHtml(row.final)}</span>
            <span>pierderi: ${escapeHtml(row.losses)}</span>
            <span>randament: ${escapeHtml(row.efficiency)}</span>
          </article>
        `).join("")
        : `<article><strong>Necompletat</strong><span>Nu exista inca date de sistem.</span></article>`;
    }

    const carrierRows = document.getElementById("certificateCarrierRows");
    if (carrierRows) {
      carrierRows.innerHTML = data.carrierRows.length
        ? data.carrierRows.map(row => `
          <article>
            <strong>${escapeHtml(row.carrier)}</strong>
            <span>final: ${escapeHtml(row.finalEnergy)}</span>
            <span>primara: ${escapeHtml(row.primaryEnergy)}</span>
            <span>CO2: ${escapeHtml(row.co2)}</span>
            <span>fp=${escapeHtml(row.primaryFactor)} · fCO2=${escapeHtml(row.co2Factor)}</span>
            <span>surse: ${escapeHtml(row.primarySource)} / ${escapeHtml(row.co2Source)}</span>
            <span>mapping: ${escapeHtml(row.mappedPrimaryCarrier)} / ${escapeHtml(row.mappedCo2Carrier)}</span>
            ${row.factorWarnings?.length ? `<span class="technical-warning-inline">${escapeHtml(row.factorWarnings.join("; "))}</span>` : ""}
          </article>
        `).join("")
        : `<article><strong>Necompletat</strong><span>Nu exista inca energie finala pe combustibil.</span></article>`;
    }

    const completeness = document.getElementById("certificateCompleteness");
    if (completeness) {
      completeness.innerHTML = `
        <h3>Acoperire fata de certificatul energetic oficial</h3>
        <div>
          ${data.missing.map(item => `
            <article>
              <span>${escapeHtml(item.status)}</span>
              <strong>${escapeHtml(item.label)}</strong>
              <p>${escapeHtml(item.reason)}</p>
            </article>
          `).join("")}
        </div>
      `;
    }
  }

  function setReportSectionsHidden(hidden) {
    document.querySelectorAll(".decision-report > .decision-section, .decision-report > .decision-disclaimer")
      .forEach(section => {
        if (section.id !== "reportEmptyState") section.hidden = hidden;
      });
  }

  function renderEmptyReport(empty) {
    const container = document.getElementById("reportEmptyState");
    if (!container) return;
    setReportSectionsHidden(true);
    container.hidden = false;
    setText("reportMeta", "Raport disponibil doar din date reale salvate");
    container.innerHTML = `
      <div class="section-heading-v1">
        <span class="report-v1-eyebrow">RAPORT REAL</span>
        <h2>${escapeHtml(empty.title)}</h2>
        <p>${escapeHtml(empty.message)}</p>
      </div>
      <div class="report-empty-actions">
        ${(empty.actions || []).map(action => `<a class="secondary-btn" href="${escapeHtml(action.href)}">${escapeHtml(action.label)}</a>`).join("")}
        <a class="secondary-btn muted-action" href="raport-v1.html?demo=1">Vezi raport demo separat</a>
      </div>
    `;
  }

  function renderCalibrationReportPlaceholder() {
    const container = document.getElementById("reportEmptyState");
    if (!container) return;
    setReportSectionsHidden(true);
    container.hidden = false;
    setText("reportMeta", "Raport temporar in calibrare");
    container.innerHTML = `
      <div class="calibration-placeholder">
        <span class="report-v1-eyebrow">MOTOR IN CALIBRARE</span>
        <h2>LaCurent Physics Engine este in curs de calibrare si testare.</h2>
        <p>
          Am oprit temporar afisarea valorilor energetice calculate in productie pentru ca reconstruim motorul fizic
          pe o baza determinista, trasabila si verificabila. Preferam sa afisam mai putine cifre acum decat sa lasam
          proprietarii sa ia decizii pe rezultate care nu sunt inca validate suficient.
        </p>
        <div class="placeholder-stage" aria-label="Vizual LaCurent Physics Engine in calibrare">
          <svg viewBox="0 0 480 300" aria-hidden="true">
            <defs>
              <radialGradient id="physicsCoreGradient" cx="50%" cy="50%" r="50%">
                <stop offset="0%" stop-color="#e0faff" stop-opacity="1" />
                <stop offset="42%" stop-color="#7dd3fc" stop-opacity=".82" />
                <stop offset="100%" stop-color="#2563eb" stop-opacity="0" />
              </radialGradient>
              <linearGradient id="physicsWaveGradient" x1="0%" x2="100%">
                <stop offset="0%" stop-color="#5eead4" stop-opacity=".12" />
                <stop offset="48%" stop-color="#7dd3fc" stop-opacity=".95" />
                <stop offset="100%" stop-color="#c4b5fd" stop-opacity=".14" />
              </linearGradient>
            </defs>
            <path class="placeholder-dash" d="M26 54 H148 L176 88" fill="none" stroke="#7dd3fc" stroke-width="1" />
            <path class="placeholder-dash" d="M454 66 H338 L304 101" fill="none" stroke="#7dd3fc" stroke-width="1" />
            <path class="placeholder-dash" d="M42 246 H158 L184 214" fill="none" stroke="#5eead4" stroke-width="1" />
            <foreignObject x="22" y="34" width="190" height="24"><div class="placeholder-hud-label">MODEL IN CALIBRARE</div></foreignObject>
            <foreignObject x="314" y="46" width="178" height="24"><div class="placeholder-hud-label">BILANT ENERGETIC</div></foreignObject>
            <foreignObject x="34" y="250" width="190" height="24"><div class="placeholder-hud-label">VERIFICARE FLUX TERMIC</div></foreignObject>
            <path class="placeholder-sine" d="M78 150 C104 106 132 106 158 150 S212 194 238 150 S292 106 318 150 S372 194 402 150" fill="none" stroke="url(#physicsWaveGradient)" stroke-width="3" stroke-linecap="round" />
            <g class="placeholder-core">
              <circle cx="240" cy="150" r="76" fill="url(#physicsCoreGradient)" opacity=".82" />
              <circle cx="240" cy="150" r="38" fill="#08111f" stroke="#7dd3fc" stroke-width="1.5" />
              <circle cx="240" cy="150" r="20" fill="#7dd3fc" opacity=".85" />
            </g>
            <g class="placeholder-ring" fill="none">
              <ellipse cx="240" cy="150" rx="94" ry="34" stroke="#7dd3fc" stroke-opacity=".42" />
              <ellipse cx="240" cy="150" rx="34" ry="94" stroke="#5eead4" stroke-opacity=".36" />
            </g>
            <g class="placeholder-orbit">
              <circle cx="334" cy="150" r="4.5" fill="#7dd3fc" />
              <circle cx="146" cy="150" r="3.5" fill="#5eead4" />
            </g>
            <g class="placeholder-orbit slow">
              <circle cx="240" cy="56" r="4" fill="#c4b5fd" />
              <circle cx="240" cy="244" r="3.5" fill="#7dd3fc" />
            </g>
            <foreignObject x="76" y="88" width="136" height="28"><div class="placeholder-equation">R = d / lambda</div></foreignObject>
            <foreignObject x="318" y="108" width="108" height="28"><div class="placeholder-equation">U = 1 / R</div></foreignObject>
            <foreignObject x="62" y="188" width="132" height="28"><div class="placeholder-equation">Htr = U x A</div></foreignObject>
            <foreignObject x="314" y="198" width="136" height="28"><div class="placeholder-equation">QH = H x HDD</div></foreignObject>
          </svg>
        </div>
        <div class="placeholder-grid">
          <article>
            <span>Ce va afisa raportul</span>
            <strong>Pierderi, consumuri, emisii si clase estimative</strong>
            <p>Pierderi prin pereti, pod, pardoseala, ferestre si ventilatie, consum util/final/primar, CO2 si ipotezele folosite.</p>
          </article>
          <article>
            <span>Ce calibram acum</span>
            <strong>Lantul fizic de calcul</strong>
            <p>Geometrie, anvelopa, R/U/U corectat, Htr, Hve, QH, energie finala, energie primara, CO2 si clasificare estimativa.</p>
          </article>
          <article>
            <span>Ce nu pretindem</span>
            <strong>Nu este certificat energetic oficial</strong>
            <p>Rezultatul LaCurent va ramane o evaluare informativa si nu inlocuieste certificatul emis de un auditor energetic atestat.</p>
          </article>
        </div>
        <div class="placeholder-note">
          <strong>Urmatorul pas:</strong>
          cand Physics Engine v1 este validat, raportul va afisa unde se pierd banii, ce date lipsesc,
          cat de sigura este estimarea si ce valori sunt comparabile cu o cladire de referinta.
        </div>
        <div class="report-empty-actions">
          <a class="secondary-btn" href="analiza-casa.html">Revizuieste datele locuintei</a>
          <a class="secondary-btn muted-action" href="energy-data-hub.html">Vezi modelul tehnic</a>
        </div>
      </div>
    `;
  }

  function prepareReportContent() {
    setReportSectionsHidden(false);
    const empty = document.getElementById("reportEmptyState");
    if (empty) empty.hidden = true;
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
    const warningHtml = technical.warnings?.length
      ? `<article class="technical-v1-wide technical-warning-card">
          <span>Warnings</span>
          <strong>${technical.warnings.length} verificari de clarificat</strong>
          <ul>${technical.warnings.map(item => `<li>${escapeHtml(item)}</li>`).join("")}</ul>
        </article>`
      : "";
    const traceHtml = technical.traces?.length
      ? `<article class="technical-v1-wide technical-trace-card">
          <span>CalculationTrace</span>
          <strong>Formule folosite in lantul curent</strong>
          <div class="technical-trace-list">
            ${technical.traces.map(trace => `
              <div>
                <b>${escapeHtml(traceTitle(trace))}</b>
                <small>${escapeHtml(trace.formulaText || trace.expression || "--")}</small>
                <em>${escapeHtml(trace.unit || trace.outputUnit || "")} ${trace.source ? ` / ${escapeHtml(trace.source)}` : ""}</em>
              </div>
            `).join("")}
          </div>
        </article>`
      : "";
    container.innerHTML = technical.metrics.map(metric => `
      <article>
        <span>${metric.label}</span>
        <strong>${metric.value}</strong>
        <em>${metric.source}</em>
      </article>
    `).join("") + warningHtml + traceHtml;
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
    renderCalibrationReportPlaceholder();
    return;
    const payload = await loadReportData();
    if (payload.empty) {
      renderEmptyReport(payload.empty);
      return;
    }
    prepareReportContent();
    const { source, report } = payload;
    const sourceLabel = sourceLabelFor(source);
    setText("reportMeta", `${report.home.title} · ${sourceLabel} · ${report.home.generatedAt}`);
    const guestPrompt = document.getElementById("guestSavePrompt");
    if (guestPrompt) guestPrompt.hidden = source !== "guest";
    renderCertificateOverview(report.certificateOverview || demoCertificateOverview(report, source));
    renderCertificateDetails(report.certificateDetails || demoCertificateDetails());
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
    if (!explicitDemo) {
      renderEmptyReport({
        type: "load_error",
        title: "Raportul real nu a putut fi incarcat",
        message: "Nu afisez demo in locul datelor reale. Verifica autentificarea, conexiunea la API sau locuinta selectata.",
        actions: [{ href: "profil.html?mode=login", label: "Autentificare" }, { href: "analiza-casa.html?new=1", label: "Adauga locuinta" }]
      });
      return;
    }
    const report = demo;
    prepareReportContent();
    setText("reportMeta", `${report.home.title} · fallback demo`);
    renderCertificateOverview(report.certificateOverview || demoCertificateOverview(report, "demo"));
    renderCertificateDetails(report.certificateDetails || demoCertificateDetails());
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
