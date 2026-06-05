(function () {
  function confidenceScore(value) {
    return value === "high" ? 85 : value === "medium" ? 65 : 40;
  }

  function get(obj, path) {
    return String(path || "").split(".").reduce((current, part) => {
      if (current === undefined || current === null) return undefined;
      return current[part];
    }, obj);
  }

  function has(context, path) {
    const value = get(context, path);
    return value !== undefined && value !== null && value !== "";
  }

  function humanizeInput(path) {
    return {
      "normalizedHome.envelope.roofOrAttic.insulationThicknessM": "grosimea izolatiei din pod/acoperis",
      "normalizedHome.systems.heating.distribution": "tipul distributiei incalzirii",
      "normalizedHome.systems.dhw.source": "sursa pentru apa calda menajera",
      "normalizedHome.geometry.usefulAreaM2": "suprafata utila",
      "normalizedHome.systems.heating.source": "sursa principala de incalzire",
      "normalizedHome.envelope.windows.type": "tipul ferestrelor",
      "physicsResult.heatLossTransmission": "pierderile prin transmisie",
      "physicsResult.heatLossVentilation": "pierderile prin ventilatie",
      "physicsResult.demandLayerV03.annual.heatingDemandKwhM2Year": "necesarul anual de incalzire pe metru patrat",
      "physicsResult.demandLayerV03.annual.heatingDemandKwhYear": "necesarul anual de incalzire",
      "reportSnapshot.realConsumption": "facturile sau consumul real"
    }[path] || String(path || "").replace(/^normalizedHome\./, "").replace(/^physicsResult\./, "").replace(/^reportSnapshot\./, "").replaceAll(".", " / ");
  }

  function assumption(id) {
    return {
      id,
      field: "ai_insight",
      label: "Ipoteza AI",
      reason: "AI propune analiza; calculele finale trebuie validate de motorul determinist.",
      confidence: "medium",
      source: "rule_based_inference",
      numericTruthSource: "not_numeric"
    };
  }

  function candidate(base) {
    return {
      assumptions: [assumption(`${base.id}.assumption`)],
      warnings: [],
      validationStatus: "proposed",
      ...base
    };
  }

  function buildNormalizedHome(context) {
    const snapshot = context.reportSnapshot || {};
    const home = snapshot.home || {};
    const physical = context.physicsResult || {};
    return {
      buildingType: String(home.buildingType || "").toLowerCase().includes("apart") ? "apartment" : "house",
      mode: context.mode || "owner",
      geometry: {
        usefulAreaM2: Number(home.usefulAreaM2 || snapshot.usefulAreaM2 || 0) || undefined,
        confidence: home.usefulAreaM2 ? "medium" : "low"
      },
      envelope: {
        roofOrAttic: {
          insulationThicknessM: Number(home.roofInsulationM || 0) || undefined,
          confidence: "low"
        },
        walls: {
          material: home.wallMaterial,
          insulationThicknessM: Number(home.wallInsulationM || 0) || undefined,
          confidence: home.wallMaterial ? "medium" : "low"
        },
        windows: {
          type: home.windowsType || "unknown",
          confidence: home.windowsType ? "medium" : "low"
        }
      },
      systems: {
        heating: {
          source: String(home.heatingSystem || "").toLowerCase().includes("gaz") ? "gas"
            : String(home.heatingSystem || "").toLowerCase().includes("lemn") ? "wood"
              : String(home.heatingSystem || "").toLowerCase().includes("pompa") ? "heat_pump"
                : "unknown",
          distribution: home.heatingDistribution || undefined,
          confidence: home.heatingSystem ? "medium" : "low"
        },
        dhw: {
          source: home.dhwSystem || "unknown",
          confidence: home.dhwSystem ? "medium" : "low"
        }
      },
      access: {
        hasRoofForPv: home.buildingType !== "apartment"
      },
      assumptions: [],
      missingData: snapshot.missingData || physical.missingData || []
    };
  }

  function generateAiInsightCandidates(context) {
    const normalizedHome = context.normalizedHome || buildNormalizedHome(context);
    const missing = normalizedHome.missingData || [];
    const roofInsulation = normalizedHome.envelope?.roofOrAttic?.insulationThicknessM;
    const distribution = normalizedHome.systems?.heating?.distribution;
    const heatingSource = normalizedHome.systems?.heating?.source;
    const windowsType = normalizedHome.envelope?.windows?.type;
    const dhwSource = normalizedHome.systems?.dhw?.source;
    const isApartment = normalizedHome.buildingType === "apartment";
    const isHouse = normalizedHome.buildingType === "house" || normalizedHome.buildingType === "duplex";
    const hasPhysics = Boolean(context.physicsResult);
    const hasTransmissionAndVentilation = has(context, "physicsResult.heatLossTransmission") && has(context, "physicsResult.heatLossVentilation");
    const hasHeatingDemand = has(context, "physicsResult.demandLayerV03.annual.heatingDemandKwhM2Year") || has(context, "physicsResult.heatingDemandKwhM2Year");
    const hasRealConsumption = has(context, "reportSnapshot.realConsumption") || has(context, "reportSnapshot.realConsumptionSummary");
    const candidates = [];

    if (hasTransmissionAndVentilation) {
      candidates.push(candidate({
        id: "ai.insight.envelope_vs_supplier",
        target: "report",
        type: "money_leak",
        title: "Factura mare pare mai degraba problema de anvelopa decat de furnizor",
        hypothesis: "Pierderile prin transmisie si ventilatie indica o problema fizica a locuintei, nu doar un pret mare la energie.",
        requiredInputs: ["physicsResult.heatLossTransmission", "physicsResult.heatLossVentilation"],
        relatedPhysicsOutputs: ["Htr", "Hve", "QH,nd"],
        suggestedCalculation: "compare Htr + Hve with heating cost share",
        proposedPlacement: "report.after_money_breakdown",
        priority: "high",
        confidence: "medium",
        reason: "Cardul separa problema fizica a casei de pretul energiei."
      }));
    }

    if (isHouse && (!roofInsulation || roofInsulation < 0.15)) {
      candidates.push(candidate({
        id: "ai.insight.attic_data_can_change_verdict",
        target: "report",
        type: "missing_data",
        title: "Datele despre pod pot schimba verdictul",
        hypothesis: "Grosimea izolatiei podului poate schimba semnificativ pierderile estimate.",
        requiredInputs: ["normalizedHome.envelope.roofOrAttic.insulationThicknessM"],
        relatedPhysicsOutputs: ["roof U-value", "roof heat loss"],
        proposedPlacement: "report.after_verdict",
        priority: "high",
        confidence: roofInsulation ? "medium" : "low",
        reason: "Podul este adesea una dintre cele mai importante zone de pierdere pentru case."
      }));
    }

    if (isHouse) {
      candidates.push(candidate({
        id: "ai.insight.pv_not_root_cause",
        target: "report",
        type: "negative_recommendation",
        title: "PV poate reduce factura electrica, dar nu rezolva pierderile termice",
        hypothesis: "Panourile fotovoltaice nu reduc necesarul termic al cladirii.",
        requiredInputs: ["normalizedHome.buildingType"],
        relatedPhysicsOutputs: ["QH,nd", "final electricity"],
        proposedPlacement: "report.negative_recommendations",
        priority: "medium",
        confidence: "medium",
        reason: "Este important sa nu confundam reducerea facturii electrice cu reducerea pierderilor prin anvelopa."
      }));
    } else if (isApartment) {
      candidates.push(candidate({
        id: "ai.insight.apartment_pv_not_individual_first",
        target: "report",
        type: "negative_recommendation",
        title: "PV individual nu este de obicei primul pas pentru apartament",
        hypothesis: "Pentru apartamente, decizia PV depinde de acoperis comun, asociatie si consum electric, nu doar de locuinta individuala.",
        requiredInputs: ["normalizedHome.buildingType"],
        relatedPhysicsOutputs: ["final electricity"],
        proposedPlacement: "report.negative_recommendations",
        priority: "medium",
        confidence: "medium",
        reason: "Cardul evita o recomandare comerciala nepotrivita pentru un apartament."
      }));
    }

    if (heatingSource === "heat_pump" || (hasHeatingDemand && !distribution)) {
      candidates.push(candidate({
        id: "ai.insight.heat_pump_risk_before_envelope",
        target: "report",
        type: "risk",
        title: "Pompa de caldura poate fi riscanta inainte de reducerea necesarului",
        hypothesis: "Daca necesarul termic este mare sau distributia cere temperaturi ridicate, eficienta poate scadea.",
        requiredInputs: ["physicsResult.demandLayerV03.annual.heatingDemandKwhM2Year", "normalizedHome.systems.heating.distribution"],
        relatedPhysicsOutputs: ["QH,nd", "systems layer"],
        proposedPlacement: "report.risks",
        priority: "high",
        confidence: distribution ? "medium" : "low",
        reason: "Generatorul trebuie evaluat dupa cladire, nu invers."
      }));
    }

    if (has(context, "physicsResult.heatLossVentilation")) {
      candidates.push(candidate({
        id: "ai.insight.ventilation_hidden_loss",
        target: "report",
        type: "ventilation",
        title: "Ventilatia poate explica o parte din pierderi",
        hypothesis: "Locuinta poate pierde energie si prin aer schimbat necontrolat, nu doar prin elemente constructive.",
        requiredInputs: ["physicsResult.heatLossVentilation"],
        relatedPhysicsOutputs: ["Hve", "air changes", "ventilation heat loss"],
        suggestedCalculation: "compare Hve share against total heat transfer",
        proposedPlacement: "report.after_heating_breakdown",
        priority: "medium",
        confidence: hasPhysics ? "medium" : "low",
        reason: "Cardul ajuta utilizatorul sa inteleaga pierderile invizibile prin infiltratii si aerisire."
      }));
    }

    if (heatingSource && heatingSource !== "unknown") {
      candidates.push(candidate({
        id: "ai.insight.controls_before_generator",
        target: "report",
        type: "automation",
        title: "Reglajele pot fi testate inaintea schimbarii generatorului",
        hypothesis: "Daca sistemul actual nu are control bun, termostatul si reglajele pot reduce risipa fara renovare majora.",
        requiredInputs: ["normalizedHome.systems.heating.source"],
        relatedPhysicsOutputs: ["systems layer", "control efficiency"],
        proposedPlacement: "report.low_risk_actions",
        priority: "medium",
        confidence: "medium",
        reason: "Este o analiza cu risc mic care nu promite economii exacte fara simulare."
      }));
    }

    if (!windowsType || ["unknown", "single", "old_double"].includes(windowsType)) {
      candidates.push(candidate({
        id: "ai.insight.windows_maybe_comfort_not_first_roi",
        target: "report",
        type: "comfort",
        title: "Ferestrele pot fi mai importante pentru confort decat pentru primul ROI",
        hypothesis: "Ferestrele vechi pot crea disconfort, dar investitia trebuie comparata cu alte pierderi inainte de prioritizare.",
        requiredInputs: ["normalizedHome.envelope.windows.type"],
        relatedPhysicsOutputs: ["window U-value", "window heat loss"],
        proposedPlacement: "report.comfort",
        priority: "medium",
        confidence: windowsType && windowsType !== "unknown" ? "medium" : "low",
        reason: "Cardul separa confortul de recuperarea investitiei, fara sa vanda automat ferestre noi."
      }));
    }

    if (!dhwSource || dhwSource === "unknown" || dhwSource === "electric_boiler" || dhwSource === "same_as_heating") {
      candidates.push(candidate({
        id: "ai.insight.dhw_can_change_system_choice",
        target: "report",
        type: "dhw",
        title: "Apa calda menajera poate schimba alegerea sistemului",
        hypothesis: "Daca ACM este produsa electric sau separat, scenariile de incalzire trebuie comparate impreuna cu apa calda.",
        requiredInputs: ["normalizedHome.systems.dhw.source"],
        relatedPhysicsOutputs: ["DHW demand", "final DHW energy"],
        proposedPlacement: "report.system_context",
        priority: "medium",
        confidence: dhwSource && dhwSource !== "unknown" ? "medium" : "low",
        reason: "In unele case, apa calda poate schimba costul real al unei solutii de incalzire."
      }));
    }

    if (!hasRealConsumption) {
      candidates.push(candidate({
        id: "ai.insight.real_bills_before_strong_ranking",
        target: "report",
        type: "missing_data",
        title: "Facturile reale pot schimba ordinea interventiilor",
        hypothesis: "Fara facturi reale, raportul poate estima fizic locuinta, dar prioritizarea financiara ramane partiala.",
        requiredInputs: ["reportSnapshot.realConsumption"],
        relatedPhysicsOutputs: ["confidence", "financial calibration"],
        proposedPlacement: "report.missing_data",
        priority: "high",
        confidence: "high",
        reason: "Facturile ajuta la diferentierea dintre pierderi fizice, comportament si preturi."
      }));
    }

    if (isApartment) {
      candidates.push(candidate({
        id: "ai.insight.apartment_position_matters",
        target: "report",
        type: "comparison",
        title: "La apartament conteaza mult pozitia in bloc",
        hypothesis: "Etajul, peretii exteriori si vecinii incalziti pot schimba pierderile fata de o casa individuala.",
        requiredInputs: ["normalizedHome.buildingType"],
        relatedPhysicsOutputs: ["apartment adjacency", "heated boundary conditions"],
        proposedPlacement: "report.apartment_context",
        priority: "high",
        confidence: "medium",
        reason: "Cardul schimba analiza de la logica de casa la logica de apartament."
      }));
    }

    if (heatingSource === "wood") {
      candidates.push(candidate({
        id: "ai.insight.wood_heating_comfort_and_effort",
        target: "report",
        type: "heating_source",
        title: "Incalzirea pe lemn trebuie analizata si prin confort, nu doar cost",
        hypothesis: "Costul combustibilului poate parea bun, dar alimentarea, randamentul si distributia caldurii pot schimba verdictul.",
        requiredInputs: ["normalizedHome.systems.heating.source"],
        relatedPhysicsOutputs: ["systems layer", "generation efficiency"],
        proposedPlacement: "report.system_context",
        priority: "medium",
        confidence: "medium",
        reason: "Cardul evita comparatia strict pe lei si introduce confortul operational."
      }));
    }

    candidates.push(candidate({
      id: "ai.insight.compare_heat_pump_emitters",
      target: "algorithms",
      type: "scenario",
      title: "Compara pompa de caldura + calorifere cu pompa de caldura + pardoseala",
      hypothesis: "Temperatura agentului termic poate schimba COP/SCOP si costul anual.",
      requiredInputs: ["normalizedHome.systems.heating.distribution", "physicsResult.demandLayerV03.annual.heatingDemandKwhYear"],
      relatedPhysicsOutputs: ["heating demand", "systems layer"],
      suggestedCalculation: "simulate heat pump SCOP by emitter temperature",
      proposedPlacement: "algorithms.scenario_lab",
      priority: "high",
      confidence: distribution ? "medium" : "low",
      reason: "Este o decizie cu risc tehnic mare daca se dimensioneaza gresit."
    }));

    candidates.push(candidate({
      id: "ai.insight.dhw_heat_pump_vs_boiler",
      target: "algorithms",
      type: "dhw",
      title: "Simuleaza ACM pe pompa de caldura vs boiler electric",
      hypothesis: "Apa calda menajera poate schimba consumul electric si dimensionarea sistemului.",
      requiredInputs: ["normalizedHome.systems.dhw.source", "normalizedHome.geometry.usefulAreaM2"],
      relatedPhysicsOutputs: ["DHW demand", "final DHW energy"],
      suggestedCalculation: "compare DHW final energy by system efficiency",
      proposedPlacement: "algorithms.scenario_lab",
      priority: "medium",
      confidence: "medium",
      reason: "ACM este separata de incalzire si poate schimba verdictul sistemelor."
    }));

    candidates.push(candidate({
      id: "ai.insight.simple_automation_before_big_investments",
      target: "algorithms",
      type: "automation",
      title: "Testeaza automatizari simple inainte de investitii mari",
      hypothesis: "Reglajele si controlul pot reduce risipa fara schimbari majore de sistem.",
      requiredInputs: ["normalizedHome.systems.heating.source"],
      relatedPhysicsOutputs: ["systems layer", "control efficiency"],
      proposedPlacement: "algorithms.scenario_lab",
      priority: "medium",
      confidence: "medium",
      reason: "Automatizarea nu repara anvelopa, dar poate fi un prim pas cu risc mic."
    }));

    if (missing.length) {
      candidates.push(candidate({
        id: "ai.insight.questions_that_change_verdict",
        target: "algorithms",
        type: "missing_data",
        title: "Intrebari care pot schimba verdictul",
        hypothesis: "Unele date lipsa pot schimba ordinea scenariilor.",
        requiredInputs: missing,
        relatedPhysicsOutputs: ["confidence", "scenario ranking"],
        proposedPlacement: "algorithms.data_quality",
        priority: "high",
        confidence: "high",
        reason: "Algoritmi trebuie sa arate clar ce lipseste inainte de prioritizari agresive."
      }));
    }

    return candidates;
  }

  function validateInsightCandidate(item, context) {
    const missingPaths = (item.requiredInputs || []).filter(path => !has(context, path));
    const missingData = missingPaths.map(humanizeInput);
    const deterministic = Boolean(context.physicsResult || context.reportSnapshot);
    const validatedBy = missingPaths.length ? "ai_estimate_only" : deterministic ? "physics_engine" : "rules_engine";
    const statusLabel = missingPaths.length ? "Necesita date" : deterministic ? "Verificat" : "Ipoteza";
    const stableForReport = item.target === "report" && !missingPaths.length && validatedBy !== "ai_estimate_only";

    return {
      id: `card.${item.id}`,
      sourceCandidateId: item.id,
      target: item.target,
      title: item.title,
      summary: item.hypothesis,
      category: item.type === "money_leak" ? "financial"
        : item.type === "negative_recommendation" ? "negative_recommendation"
          : item.type === "missing_data" ? "missing_data"
            : item.type === "scenario" ? "scenario"
              : item.type === "risk" ? "risk"
                : "diagnosis",
      severity: item.priority === "urgent" ? "critical" : item.priority === "high" ? "high" : item.priority === "medium" ? "medium" : "low",
      priority: item.priority,
      metrics: [{
        label: "Incredere",
        value: {
          value: confidenceScore(item.confidence),
          unit: "%",
          sourceType: "ai_estimate",
          confidence: item.confidence,
          assumptions: item.assumptions,
          validationNeeded: true
        }
      }],
      explanation: missingPaths.length
        ? `${item.reason} Pentru validare mai buna lipsesc: ${missingData.join(", ")}.`
        : item.reason,
      assumptions: item.assumptions,
      missingData,
      warnings: item.warnings,
      display: {
        statusLabel,
        stableForReport,
        experimental: item.target === "algorithms" || validatedBy === "ai_estimate_only"
      },
      validatedBy,
      confidence: missingPaths.length ? "low" : item.confidence,
      validationStatus: missingPaths.length ? "needs_more_data" : "validated"
    };
  }

  function generateValidatedInsightCards(context) {
    const normalizedHome = context.normalizedHome || buildNormalizedHome(context);
    const fullContext = { ...context, normalizedHome };
    return generateAiInsightCandidates(fullContext).map(candidate => validateInsightCandidate(candidate, fullContext));
  }

  window.LaCurentAiInsights = {
    buildNormalizedHome,
    generateAiInsightCandidates,
    validateInsightCandidate,
    generateValidatedInsightCards
  };
})();
