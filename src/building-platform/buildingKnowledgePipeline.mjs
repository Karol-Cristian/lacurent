import {
  createBuildingDnaFromAdvancedModel,
  createBuildingDnaFromAssistedAnswers,
  getBuildingDnaDependencyTree
} from "./buildingDnaResolver.mjs";
import { calculateChapter2ForBuildingDna } from "./buildingChapter2Adapter.mjs";
import { resolveBuildingRenovationInterventions } from "./buildingRenovationInterventions.mjs";

const PIPELINE_SCOPE = "building_knowledge_platform_p2_review_mvp";

function stage(stageId, label, status, summary = {}) {
  return {
    stageId,
    label,
    status,
    summary
  };
}

function blocked(code, stages = [], causeBlockers = []) {
  const blockers = [
    { code, severity: "blocking" },
    ...causeBlockers
      .filter(item => item?.code && item.code !== code)
      .map(item => ({
        code: item.code,
        severity: item.severity ?? "blocking"
      }))
  ];
  return {
    status: "blocked",
    scope: PIPELINE_SCOPE,
    stages,
    buildingDna: null,
    chapter2Result: null,
    diagnostics: {
      blockers,
      warnings: [],
      methodologyLimits: [
        "platform_model_generation_only_until_physics_adapter",
        "chapter_2_physics_engine_is_calculation_authority",
        "no_ui_calculations",
        "no_hidden_defaults",
        "not_chapter_3",
        "not_final_energy",
        "not_primary_energy",
        "not_CO2",
        "not_certificate"
      ]
    }
  };
}

function materialSummary(buildingDna) {
  const materials = new Map();
  for (const assembly of buildingDna.assemblies) {
    for (const layer of assembly.layers ?? []) {
      materials.set(layer.materialId, {
        materialId: layer.materialId,
        displayName: layer.material.displayName,
        category: layer.material.category,
        provenance: layer.material.provenance
      });
    }
  }
  return [...materials.values()];
}

function assemblySummary(buildingDna) {
  return buildingDna.assemblies.map((assembly) => ({
    assemblyId: assembly.assemblyId,
    role: assembly.assemblyRole,
    displayName: assembly.displayName,
    layerStack: (assembly.layers ?? []).map((layer) => ({
      layerId: layer.layerId,
      materialId: layer.materialId,
      materialName: layer.material.displayName,
      thickness: layer.thickness,
      provenance: layer.provenance
    })),
    directUValue: assembly.directUValue,
    provenance: assembly.provenance
  }));
}

function resultSummary(calculation) {
  const result = calculation.chapter2Result?.result;
  return {
    annualQHnd: result?.annualQHnd ?? null,
    annualQCnd: result?.annualQCnd ?? null,
    chapter3Annual: calculation.chapter3Result?.annual ?? null,
    chapter3Services: calculation.chapter3Result?.services ?? null,
    monthCount: result?.summary?.monthCount ?? result?.heatingResult?.summary?.monthCount ?? null,
    heatingMonthlyCount: result?.heatingResult?.caseResults?.length ?? null,
    coolingMonthlyCount: result?.coolingResult?.caseResults?.length ?? null
  };
}

function methodologyLimitsForCalculation(calculation) {
  return [
    "platform_model_generation_until_physics_adapter",
    "chapter_2_physics_engine_is_calculation_authority",
    ...(calculation.chapter3Result
      ? ["chapter_3_installations_runtime_from_explicit_system_inputs"]
      : ["not_chapter_3"]),
    "no_ui_calculations",
    "no_hidden_defaults",
    "not_primary_energy",
    "not_CO2",
    "not_certificate"
  ];
}

function buildReview(buildingDna, calculation) {
  return {
    typologyProposal: buildingDna.typologyProposal,
    buildingSpecificParameters: buildingDna.buildingSpecificParameters,
    renovationInterventions: buildingDna.renovationInterventions,
    assemblies: assemblySummary(buildingDna),
    materials: materialSummary(buildingDna),
    assumptions: buildingDna.assumptions,
    warnings: buildingDna.warnings,
    missingConfirmations: buildingDna.missingConfirmations,
    dependencyTrees: {
      annualQHnd: getBuildingDnaDependencyTree(buildingDna, "annualQHnd"),
      annualQCnd: getBuildingDnaDependencyTree(buildingDna, "annualQCnd")
    },
    results: resultSummary(calculation)
  };
}

function buildStages({ mode, answers, buildingDna, calculation, interventions }) {
  return [
    stage("user_description", "User Description", "ready", {
      mode,
      buildingType: answers?.buildingType ?? buildingDna?.building?.buildingType ?? null,
      constructionPeriod: answers?.constructionPeriod ?? buildingDna?.building?.constructionPeriod ?? null
    }),
    stage("assisted_answers", "Assisted Answers", mode === "assisted" ? "ready" : "not_applicable", {
      ordinaryLanguageInputOnly: true
    }),
    stage("building_typology_proposal", "Building Typology Proposal", "ready", {
      proposalId: buildingDna.typologyProposal?.proposalId ?? null,
      confidence: buildingDna.typologyProposal?.provenance?.confidence ?? null
    }),
    stage("building_specific_parameters", "Building-Specific Parameters", "ready", {
      parameterCount: Object.keys(buildingDna.buildingSpecificParameters ?? {}).length
    }),
    stage("renovation_interventions", "Renovation Interventions", "ready", {
      interventionCount: interventions.length
    }),
    stage("construction_assemblies", "Construction Assemblies", "ready", {
      assemblyCount: buildingDna.assemblies.length
    }),
    stage("normative_material_catalogue", "Normative Material Catalogue", "ready", {
      materialCount: materialSummary(buildingDna).length
    }),
    stage("resolved_building_dna", "Resolved Building DNA", "ready", {
      schema: buildingDna.schema
    }),
    stage("chapter_2_physics_adapter", "Chapter 2 Physics Adapter", calculation.status, {
      adapterStage: calculation.stage,
      calculationAuthority: "validated_chapter_2_physics_engine"
    }),
    stage("validated_chapter_2_physics_engine", "Validated Chapter 2 Physics Engine", calculation.status, {
      annualQHnd: calculation.chapter2Result?.result?.annualQHnd ?? null,
      annualQCnd: calculation.chapter2Result?.result?.annualQCnd ?? null
    }),
    ...(calculation.chapter3Result ? [
      stage("chapter_3_installations_runtime", "Chapter 3 Installations Runtime", calculation.status, {
        calculationScope: calculation.chapter3Result.calculationScope,
        heatingInputKWh: calculation.chapter3Result.annual?.heatingInputKWh ?? null,
        coolingInputKWh: calculation.chapter3Result.annual?.coolingInputKWh ?? null,
        dhwInputKWh: calculation.chapter3Result.annual?.dhwInputKWh ?? null,
        ventilationAuxiliaryKWh: calculation.chapter3Result.annual?.ventilationAuxiliaryKWh ?? null,
        lightingEnergyKWh: calculation.chapter3Result.annual?.lightingEnergyKWh ?? null
      })
    ] : [])
  ];
}

export function buildBuildingKnowledgePlatformFromAssistedAnswers(answers = {}) {
  const interventions = resolveBuildingRenovationInterventions({
    renovations: answers.renovations ?? {},
    source: answers.source ?? { reference: "P2.assisted_answers" }
  });
  const dnaResult = createBuildingDnaFromAssistedAnswers(answers);
  if (dnaResult.status !== "ready") {
    return blocked("building_dna_not_ready", [
      stage("user_description", "User Description", "ready"),
      stage("resolved_building_dna", "Resolved Building DNA", "blocked")
    ], dnaResult.diagnostics?.blockers ?? []);
  }
  const calculation = calculateChapter2ForBuildingDna(dnaResult.buildingDna);
  const stages = buildStages({
    mode: "assisted",
    answers,
    buildingDna: dnaResult.buildingDna,
    calculation,
    interventions: interventions.interventions
  });
  if (calculation.status !== "ready") {
    return blocked(
      "chapter_2_physics_result_not_ready",
      stages,
      calculation.diagnostics?.blockers ?? []
    );
  }
  return {
    status: "ready",
    scope: PIPELINE_SCOPE,
    stages,
    buildingDna: dnaResult.buildingDna,
    chapter2Result: calculation.chapter2Result,
    calculation,
    review: buildReview(dnaResult.buildingDna, calculation),
    diagnostics: {
      blockers: [],
      warnings: [
        ...dnaResult.diagnostics.warnings,
        ...interventions.diagnostics.warnings
      ],
      methodologyLimits: [
        ...methodologyLimitsForCalculation(calculation)
      ]
    }
  };
}

export function buildBuildingKnowledgePlatformFromAdvancedModel(input = {}) {
  const dnaResult = createBuildingDnaFromAdvancedModel(input);
  if (dnaResult.status !== "ready") {
    return blocked("building_dna_not_ready", [
      stage("user_description", "User Description", "not_applicable"),
      stage("resolved_building_dna", "Resolved Building DNA", "blocked")
    ], dnaResult.diagnostics?.blockers ?? []);
  }
  const calculation = calculateChapter2ForBuildingDna(dnaResult.buildingDna);
  const stages = buildStages({
    mode: "advanced",
    answers: input.building,
    buildingDna: dnaResult.buildingDna,
    calculation,
    interventions: input.renovationInterventions ?? []
  });
  if (calculation.status !== "ready") {
    return blocked(
      "chapter_2_physics_result_not_ready",
      stages,
      calculation.diagnostics?.blockers ?? []
    );
  }
  return {
    status: "ready",
    scope: PIPELINE_SCOPE,
    stages,
    buildingDna: dnaResult.buildingDna,
    chapter2Result: calculation.chapter2Result,
    calculation,
    review: buildReview(dnaResult.buildingDna, calculation),
    diagnostics: {
      blockers: [],
      warnings: dnaResult.diagnostics.warnings,
      methodologyLimits: methodologyLimitsForCalculation(calculation)
    }
  };
}
