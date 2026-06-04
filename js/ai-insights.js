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
    const candidates = [];

    candidates.push(candidate({
      id: "ai.insight.envelope_vs_supplier",
      target: "report",
      type: "money_leak",
      title: "Factura mare pare mai degraba problema de anvelopa decat de furnizor",
      hypothesis: "Daca pierderile prin transmisie si ventilatie sunt ridicate, schimbarea furnizorului nu rezolva cauza principala.",
      requiredInputs: ["physicsResult.heatLossTransmission", "physicsResult.heatLossVentilation"],
      relatedPhysicsOutputs: ["Htr", "Hve", "QH,nd"],
      suggestedCalculation: "compare Htr + Hve with heating cost share",
      proposedPlacement: "report.after_money_breakdown",
      priority: "high",
      confidence: context.physicsResult ? "medium" : "low",
      reason: "Cardul separa problema fizica a casei de pretul energiei."
    }));

    if (normalizedHome.buildingType !== "apartment" && (!roofInsulation || roofInsulation < 0.15)) {
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

    if (["heat_pump", "electricity", "wood", "gas", "unknown"].includes(heatingSource)) {
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
    const missingData = (item.requiredInputs || []).filter(path => !has(context, path));
    const deterministic = Boolean(context.physicsResult || context.reportSnapshot);
    const validatedBy = missingData.length ? "ai_estimate_only" : deterministic ? "physics_engine" : "rules_engine";
    const statusLabel = missingData.length ? "Necesita date" : deterministic ? "Verificat de motor" : "Ipoteza";
    const stableForReport = item.target === "report" && !missingData.length && validatedBy !== "ai_estimate_only";

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
      explanation: missingData.length
        ? `${item.reason} Pentru validare lipsesc: ${missingData.join(", ")}.`
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
      confidence: missingData.length ? "low" : item.confidence,
      validationStatus: missingData.length ? "needs_more_data" : "validated"
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
