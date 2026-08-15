import {
  calculateMc001EnvelopeAssemblyUValueExplicit,
  calculateMc001EnvelopeTransmissionCoefficientExplicit
} from "../physics-engine/mc001EnvelopePhysicsCalculation.mjs";
import { calculateMc001Chapter2UsefulDemandExplicit } from "../physics-engine/mc001Chapter2UsefulDemandCalculation.mjs";
import { calculateChapter3InstallationsForBuildingDna } from "./buildingChapter3InstallationsAdapter.mjs";

function deepClone(value) {
  return JSON.parse(JSON.stringify(value));
}

function sourceFromQuantity(quantity, fallbackReference) {
  return quantity?.source ?? {
    sourceType: "explicit_user_input",
    reference: fallbackReference
  };
}

function physicsValue(quantity, fallbackReference) {
  return {
    amount: quantity.amount,
    unit: quantity.unit,
    source: sourceFromQuantity(quantity, fallbackReference)
  };
}

const SOLAR_GAIN_QSKY_AND_ELEMENT_INPUTS_REQUIRED =
  "SOLAR_GAIN_QSKY_AND_ELEMENT_INPUTS_REQUIRED";
const INTERNAL_GAINS_TABLE_2_15_CATEGORY_AND_AREA_REQUIRED =
  "INTERNAL_GAINS_TABLE_2_15_CATEGORY_AND_AREA_REQUIRED";

function chapter2ClimateInputBlockers(buildingDna) {
  if (buildingDna?.calculationStatus !== "source_backed_climate_provider") {
    return [];
  }
  const blockedSolarMonths = (buildingDna.monthlyProfiles ?? [])
    .filter(profile =>
      profile?.heatGains?.solarGainsSource === "provider_climate_profile_without_qsol_preprocessing"
    )
    .map(profile => profile.month);
  if (blockedSolarMonths.length === 0) {
    return [];
  }
  return [{
    code: SOLAR_GAIN_QSKY_AND_ELEMENT_INPUTS_REQUIRED,
    severity: "blocking",
    reason:
      "MC001/1-2006 Annex A9.6 now provides source-backed Hsol for the tabulated vertical/horizontal planes, but automatic Chapter 2 Qsol still requires Qsky-compatible inputs and complete solar element inputs.",
    availableInputs: ["Hsol_vertical_horizontal_A9_6"],
    missingInputs: ["Qsky", "Qsol", "solarElementInputs"],
    contextDiagnostics: [
      "A9_6_VERTICAL_HORIZONTAL_HSOL_AVAILABLE_QSKY_REQUIRED_FOR_QSOL"
    ],
    productionEligible: false,
    affectedCalculations: [
      "chapter2_solar_gains",
      "chapter2_heating_useful_demand",
      "chapter2_cooling_useful_demand"
    ],
    months: blockedSolarMonths,
    prohibitedSubstitute: "Do not silently substitute provider solar gains with zero or omit Qsky."
  }];
}

function chapter2InternalGainInputBlockers(buildingDna) {
  const blockedInternalGainMonths = (buildingDna?.monthlyProfiles ?? [])
    .filter(profile =>
      profile?.heatGains?.internalGainsSource ===
        "internal_gains_table_2_15_category_or_area_missing" ||
      profile?.heatGains?.internalGainsProductionEligible === false
    )
    .map(profile => profile.month);
  if (blockedInternalGainMonths.length === 0) {
    return [];
  }
  return [{
    code: INTERNAL_GAINS_TABLE_2_15_CATEGORY_AND_AREA_REQUIRED,
    severity: "blocking",
    reason:
      "MC001 relation 2.35 can calculate monthly internal gains from Table 2.15 only when the building use category and useful floor area are explicit.",
    availableInputs: [],
    missingInputs: [
      "internalGainsTable2_15Category",
      "usefulFloorAreaM2"
    ],
    contextDiagnostics: [
      "TABLE_2_15_INTERNAL_GAINS_REQUIRES_BUILDING_USE_CATEGORY_AND_AUSE"
    ],
    productionEligible: false,
    affectedCalculations: [
      "chapter2_internal_gains",
      "chapter2_heating_useful_demand",
      "chapter2_cooling_useful_demand"
    ],
    months: blockedInternalGainMonths,
    prohibitedSubstitute:
      "Do not silently substitute unavailable internal gains with zero."
  }];
}

function physicsMaterial(layer) {
  const material = layer.material.physicsMaterial;
  const base = {
    materialId: material.materialId,
    name: material.name
  };
  if (material.lambda !== undefined) {
    base.lambda = physicsValue(material.lambda, `${layer.layerId}.lambda`);
  }
  if (material.lambdaNormat !== undefined) {
    base.lambdaNormat = physicsValue(material.lambdaNormat, `${layer.layerId}.lambda_normat`);
  }
  if (material.correctionCoefficientCode !== undefined) {
    base.correctionCoefficientCode = material.correctionCoefficientCode;
  }
  return base;
}

function assemblySource(assembly) {
  return {
    sourceType: "explicit_user_input",
    reference: assembly.provenance.reference
  };
}

export function buildEnvelopeAssemblyPhysicsInput(buildingDna) {
  return {
    mode: "envelope_assembly_u_value_explicit_v1",
    assemblies: buildingDna.assemblies.map((assembly) => {
      const output = {
        assemblyId: assembly.assemblyId,
        assemblyType: assembly.assemblyType,
        source: assemblySource(assembly)
      };
      if (assembly.directUValue !== undefined) {
        output.directUValue = physicsValue(assembly.directUValue, `${assembly.assemblyId}.direct_u`);
        return output;
      }
      output.layers = assembly.layers.map((layer) => ({
        layerId: layer.layerId,
        thickness: physicsValue(layer.thickness, `${assembly.assemblyId}.${layer.layerId}.thickness`),
        material: physicsMaterial(layer)
      }));
      output.surfaceResistances = {
        rsi: physicsValue(assembly.surfaceResistances.rsi, `${assembly.assemblyId}.rsi`),
        rse: physicsValue(assembly.surfaceResistances.rse, `${assembly.assemblyId}.rse`)
      };
      return output;
    })
  };
}

function assemblyByRole(assemblyResult, role, buildingDna) {
  const assembly = buildingDna.assemblies.find(item => item.assemblyRole === role);
  return assemblyResult.assemblyResults.find(item => item.assemblyId === assembly.assemblyId);
}

export function buildEnvelopeTransmissionPhysicsInput(buildingDna, assemblyResult) {
  return {
    mode: "envelope_transmission_coefficient_explicit_v1",
    elements: buildingDna.envelopeElements.map((element) => {
      const output = {
        elementId: element.elementId,
        elementType: element.elementType,
        boundaryType: element.boundaryType,
        area: physicsValue(element.area, `${element.elementId}.area`),
      source: {
          sourceType: "explicit_user_input",
          reference: element.area.provenance.reference
        }
      };
      if (element.assemblyRole !== undefined) {
        output.assemblyResult = assemblyByRole(assemblyResult, element.assemblyRole, buildingDna);
      }
      if (element.uValue !== undefined) {
        output.uValue = physicsValue(element.uValue, `${element.elementId}.u_value`);
      }
      if (element.boundaryCorrectionFactor !== undefined) {
        output.boundaryCorrectionFactor = physicsValue(
          element.boundaryCorrectionFactor,
          `${element.elementId}.boundary_factor`
        );
      }
      if (element.boundaryCorrection !== undefined) {
        output.boundaryCorrection = {
          mode: element.boundaryCorrection.mode,
          heatTransferToExterior: physicsValue(
            element.boundaryCorrection.heatTransferToExterior,
            `${element.elementId}.bztu.h_exterior`
          ),
          totalHeatTransfer: physicsValue(
            element.boundaryCorrection.totalHeatTransfer,
            `${element.elementId}.bztu.h_total`
          )
        };
      }
      return output;
    }),
    linearThermalBridges: buildingDna.thermalBridges.map((bridge) => ({
      bridgeId: bridge.bridgeId,
      component: bridge.component,
      length: physicsValue(bridge.length, `${bridge.bridgeId}.length`),
      psi: physicsValue(bridge.psi, `${bridge.bridgeId}.psi`),
      source: {
        sourceType: "explicit_user_input",
        reference: bridge.psi.provenance.reference
      }
    })),
    pointThermalBridges: [],
    noThermalBridges: buildingDna.thermalBridges.length === 0
  };
}

function ventilationComponents(profile) {
  return [
    {
      componentId: "building-dna-airflow",
      airFlowRate: physicsValue(profile.airFlowRate, `${profile.month}.ventilation.air_flow_rate`),
      temperatureCorrectionFactor: {
        amount: 1,
        unit: "dimensionless",
        source: {
          sourceType: "explicit_user_input",
          reference: `${profile.provenance.reference}.temperature_correction_factor`
        }
      },
      dynamicCorrectionFactor: {
        amount: 1,
        unit: "dimensionless",
        source: {
          sourceType: "explicit_user_input",
          reference: `${profile.provenance.reference}.dynamic_correction_factor`
        }
      },
      source: {
        sourceType: "explicit_user_input",
        reference: `${profile.provenance.reference}.ventilation_component`
      }
    }
  ];
}

function transmissionProfile(sideProfile) {
  return {
    indoorTemperature: physicsValue(sideProfile.indoorTemperature, "monthly.indoor"),
    outdoorTemperature: physicsValue(sideProfile.outdoorTemperature, "monthly.outdoor"),
    duration: physicsValue(sideProfile.duration, "monthly.duration")
  };
}

function ventilationProfile(sideProfile, profile) {
  return {
    airHeatCapacity: physicsValue(sideProfile.airHeatCapacity, "monthly.air_heat_capacity"),
    components: ventilationComponents({ ...sideProfile, month: profile.month, provenance: profile.provenance }),
    indoorTemperature: physicsValue(sideProfile.indoorTemperature, "monthly.vent.indoor"),
    outdoorTemperature: physicsValue(sideProfile.outdoorTemperature, "monthly.vent.outdoor"),
    duration: physicsValue(sideProfile.duration, "monthly.vent.duration")
  };
}

export function buildChapter2UsefulDemandPhysicsInput(buildingDna, envelopeTransmissionResult) {
  return {
    mode: "chapter_2_useful_demand_explicit_v1",
    envelopeTransmissionResult,
    monthlyCases: buildingDna.monthlyProfiles.map((profile) => ({
      caseId: `building-dna.${profile.month}`,
      month: profile.month,
      source: {
        reference: profile.provenance.reference
      },
      transmission: {
        heating: transmissionProfile(profile.transmission.heating),
        cooling: transmissionProfile(profile.transmission.cooling)
      },
      ventilation: {
        heating: ventilationProfile(profile.ventilation.heating, profile),
        cooling: ventilationProfile(profile.ventilation.cooling, profile)
      },
      heatGains: {
        internalGains: profile.heatGains.internalGains.amount,
        solarGains: profile.heatGains.solarGains.amount,
        ...(Array.isArray(profile.heatGains.adjacentUnconditionedZones) &&
          profile.heatGains.adjacentUnconditionedZones.length > 0
          ? {
              adjacentUnconditionedZones: deepClone(
                profile.heatGains.adjacentUnconditionedZones
              )
            }
          : {})
      },
      heating: {
        utilizationDependencies: deepClone(profile.heating.utilizationDependencies)
      },
      cooling: {
        utilizationDependencies: deepClone(profile.cooling.utilizationDependencies),
        aCred: profile.cooling.aCred
      }
    }))
  };
}

export function calculateChapter2ForBuildingDna(buildingDna) {
  const assemblyInput = buildEnvelopeAssemblyPhysicsInput(buildingDna);
  const assemblyResult = calculateMc001EnvelopeAssemblyUValueExplicit(assemblyInput);
  if (assemblyResult.status !== "ready") {
    return {
      status: "blocked",
      stage: "assembly",
      assemblyInput,
      assemblyResult
    };
  }
  const envelopeInput = buildEnvelopeTransmissionPhysicsInput(buildingDna, assemblyResult);
  const envelopeTransmissionResult = calculateMc001EnvelopeTransmissionCoefficientExplicit(envelopeInput);
  if (envelopeTransmissionResult.status !== "ready") {
    return {
      status: "blocked",
      stage: "envelope_transmission",
      assemblyInput,
      assemblyResult,
      envelopeInput,
      envelopeTransmissionResult
    };
  }
  const inputBlockers = [
    ...chapter2ClimateInputBlockers(buildingDna),
    ...chapter2InternalGainInputBlockers(buildingDna)
  ];
  if (inputBlockers.length > 0) {
    const diagnostics = {
      blockers: inputBlockers,
      warnings: [],
      methodologyLimits: [
        "chapter_2_useful_demand_requires_complete_heat_gain_inputs",
        "source_backed_solar_preprocessing_must_not_be_silently_replaced",
        "no_hidden_defaults"
      ]
    };
    return {
      status: "incomplete",
      stage: "chapter_2_climate_inputs",
      assemblyInput,
      assemblyResult,
      envelopeInput,
      envelopeTransmissionResult,
      chapter2Input: null,
      chapter2Result: {
        status: "incomplete",
        scope: "chapter_2_useful_demand_climate_input_eligibility",
        result: null,
        diagnostics
      },
      diagnostics
    };
  }
  const chapter2Input = buildChapter2UsefulDemandPhysicsInput(buildingDna, envelopeTransmissionResult);
  const chapter2Result = calculateMc001Chapter2UsefulDemandExplicit(chapter2Input);
  if (chapter2Result.status !== "ready") {
    return {
      status: chapter2Result.status,
      stage: "chapter_2_useful_demand",
      assemblyInput,
      assemblyResult,
      envelopeInput,
      envelopeTransmissionResult,
      chapter2Input,
      chapter2Result,
      diagnostics: chapter2Result.diagnostics
    };
  }

  const chapter3Calculation = calculateChapter3InstallationsForBuildingDna(
    buildingDna,
    chapter2Result
  );
  if (chapter3Calculation.status === "blocked") {
    return {
      status: "blocked",
      stage: "chapter_3_installations",
      assemblyInput,
      assemblyResult,
      envelopeInput,
      envelopeTransmissionResult,
      chapter2Input,
      chapter2Result,
      chapter3Input: chapter3Calculation.input ?? null,
      chapter3Result: null,
      diagnostics: chapter3Calculation.diagnostics
    };
  }
  const chapter3Ready = chapter3Calculation.status === "ready";
  return {
    status: "ready",
    stage: chapter3Ready ? "chapter_2_and_3_complete" : "chapter_2_complete",
    assemblyInput,
    assemblyResult,
    envelopeInput,
    envelopeTransmissionResult,
    chapter2Input,
    chapter2Result,
    ...(chapter3Ready ? {
      chapter3AdapterVersion: chapter3Calculation.adapterVersion,
      chapter3Input: chapter3Calculation.chapter3Input,
      chapter3Result: chapter3Calculation.chapter3Result,
      fullEngineInput: {
        chapter2Input,
        chapter3Input: chapter3Calculation.chapter3Input
      },
      fullEngineOutput: {
        chapter2Result,
        chapter3Result: chapter3Calculation.chapter3Result
      }
    } : {
      fullEngineInput: chapter2Input,
      fullEngineOutput: chapter2Result
    }),
    diagnostics: chapter2Result.diagnostics
  };
}
