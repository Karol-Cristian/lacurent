function source(sourceRecordId, sourceType = "validation_fixture_import") {
  return Object.freeze({
    sourceType,
    sourceRecordId: `record:${sourceRecordId}`
  });
}

function component({
  componentId,
  area,
  thermalTransmittance,
  sourceCode
}) {
  return Object.freeze({
    componentId,
    componentType: "opaque_envelope_component",
    ztuZoneId: "ztu:synthetic-heated-zone-001",
    adjacentZoneId: "ztu:synthetic-external-zone-001",
    area: Object.freeze({
      value: area,
      unit: "m2",
      source: source(`h12a-${sourceCode}-area`)
    }),
    thermalTransmittance: Object.freeze({
      value: thermalTransmittance,
      unit: "W/(m2*K)",
      source: source(`h12a-${sourceCode}-u`)
    }),
    bztu: Object.freeze({
      value: 1,
      unit: "dimensionless",
      source: source(`h12a-${sourceCode}-bztu`, "methodological_direct_input")
    })
  });
}

function prerequisite(prerequisiteType, sourceCode) {
  return Object.freeze({
    prerequisiteId: `htr-prerequisite:h12a-${sourceCode}`,
    prerequisiteType,
    applicability: "required",
    readinessStatus: "metadata_ready",
    source: source(`h12a-prerequisite-${sourceCode}`)
  });
}

function scopeContribution(contributionType, requirementStatus, sourceCode) {
  return Object.freeze({
    contributionType,
    requirementStatus,
    source: source(`h12a-scope-${sourceCode}`)
  });
}

function contract(contributionType, sourceCode) {
  return Object.freeze({
    contributionType,
    contractStatus: "numeric_contract_mapped",
    valueAvailabilityStatus: "source_backed_value_available",
    requiredUnit: "W/K",
    source: source(`h12a-contract-${sourceCode}`)
  });
}

function contributionValue(contributionType, amount, sourceCode) {
  return Object.freeze({
    contributionType,
    valueStatus: "explicit_source_backed_value",
    contributionValue: Object.freeze({
      amount,
      unit: "W/K"
    }),
    source: source(`h12a-value-${sourceCode}`, "upstream_calculation_output")
  });
}

const syntheticHuBridgeInput = Object.freeze({
  schemaVersion: "mc001-h3-hu-htr-calculation-readiness-input-v1",
  isMc001HuHtrCalculationReadinessInput: true,
  inventoryReadiness: Object.freeze({
    isHuInventoryReady: true
  }),
  components: Object.freeze([
    component({
      componentId: "component:synthetic-wall-001",
      area: 50,
      thermalTransmittance: 0.3,
      sourceCode: "wall-001"
    }),
    component({
      componentId: "component:synthetic-roof-001",
      area: 80,
      thermalTransmittance: 0.2,
      sourceCode: "roof-001"
    }),
    component({
      componentId: "component:synthetic-window-001",
      area: 12,
      thermalTransmittance: 1.3,
      sourceCode: "window-001"
    })
  ])
});

export const syntheticHtrTransmissionGoldenPipelineInput = Object.freeze({
  schemaVersion: "mc001-h12-htr-total-calculation-input-v1",
  isMc001HtrTotalCalculationInput: true,
  compositionInput: Object.freeze({
    schemaVersion: "mc001-h11-htr-total-input-composition-input-v1",
    isMc001HtrTotalInputCompositionInput: true,
    valueValidationInput: Object.freeze({
      schemaVersion: "mc001-h10-htr-non-hu-numeric-value-validation-input-v1",
      isMc001HtrNonHuNumericValueValidationInput: true,
      contractReadinessInput: Object.freeze({
        schemaVersion: "mc001-h9-htr-non-hu-numeric-contribution-contracts-input-v1",
        isMc001HtrNonHuNumericContributionContractsInput: true,
        htrTotalReadinessInput: Object.freeze({
          schemaVersion: "mc001-h8-htr-total-calculation-readiness-input-v1",
          isMc001HtrTotalCalculationReadinessInput: true,
          htrPrerequisitesInput: Object.freeze({
            schemaVersion: "mc001-h7-htr-non-hu-prerequisites-input-v1",
            isMc001HtrNonHuPrerequisitesInput: true,
            huBridgeInput: syntheticHuBridgeInput,
            htrNonHuPrerequisites: Object.freeze({
              expectedPrerequisites: Object.freeze([
                prerequisite(
                  "non_hu_transmission_component_inventory",
                  "non-hu-inventory-001"
                ),
                prerequisite(
                  "thermal_bridge_transmission_inventory",
                  "thermal-bridge-001"
                ),
                prerequisite(
                  "ground_transmission_inventory",
                  "ground-001"
                ),
                prerequisite(
                  "adjacent_space_transmission_inventory",
                  "adjacent-space-001"
                )
              ])
            })
          }),
          htrTotalCalculationScope: Object.freeze({
            scopeCode: "mc001-htr-total-calculation-scope-v1",
            expectedContributions: Object.freeze([
              scopeContribution(
                "hu_aggregated_transmission_contribution",
                "available_from_hu_bridge",
                "hu-001"
              ),
              scopeContribution(
                "thermal_bridge_transmission_contribution",
                "missing_numeric_calculation",
                "thermal-bridge-001"
              ),
              scopeContribution(
                "ground_transmission_contribution",
                "missing_numeric_calculation",
                "ground-001"
              ),
              scopeContribution(
                "adjacent_space_transmission_contribution",
                "missing_numeric_calculation",
                "adjacent-space-001"
              )
            ])
          })
        }),
        nonHuNumericContributionContracts: Object.freeze({
          contractSetCode: "mc001-htr-non-hu-numeric-contribution-contracts-v1",
          contributionContracts: Object.freeze([
            contract(
              "thermal_bridge_transmission_contribution",
              "thermal-bridge-001"
            ),
            contract("ground_transmission_contribution", "ground-001"),
            contract(
              "adjacent_space_transmission_contribution",
              "adjacent-space-001"
            )
          ])
        })
      }),
      nonHuNumericContributionValues: Object.freeze({
        valueSetCode: "mc001-htr-non-hu-numeric-contribution-values-v1",
        contributionValues: Object.freeze([
          contributionValue(
            "thermal_bridge_transmission_contribution",
            8,
            "thermal-bridge-001"
          ),
          contributionValue("ground_transmission_contribution", 12, "ground-001"),
          contributionValue(
            "adjacent_space_transmission_contribution",
            3,
            "adjacent-space-001"
          )
        ])
      })
    }),
    htrTotalInputCompositionPolicy: Object.freeze({
      compositionSetCode: "mc001-htr-total-input-composition-v1",
      compositionMode: "compose_hu_bridge_and_validated_non_hu_values",
      requiredInputTypes: Object.freeze([
        "hu_aggregated_transmission_contribution",
        "validated_non_hu_transmission_contributions"
      ])
    })
  }),
  htrTotalCalculationPolicy: Object.freeze({
    calculationSetCode: "mc001-htr-total-calculation-v1",
    formulaCode: "MC001_HTR_TOTAL_SUM_COMPOSED_TRANSMISSION_INPUTS",
    calculationMode: "calculate_htr_total_from_h11_composed_inputs",
    requiredInputSetStatus: "inputs_composed_not_htr_total_calculated",
    resultUnit: "W/K"
  })
});

export const syntheticHtrTransmissionGoldenPipelineExpected = Object.freeze({
  componentTerms: Object.freeze([
    Object.freeze({
      syntheticComponentId: "synthetic-wall-001",
      runtimeComponentId: "component:synthetic-wall-001",
      amount: 15,
      unit: "W/K"
    }),
    Object.freeze({
      syntheticComponentId: "synthetic-roof-001",
      runtimeComponentId: "component:synthetic-roof-001",
      amount: 16,
      unit: "W/K"
    }),
    Object.freeze({
      syntheticComponentId: "synthetic-window-001",
      runtimeComponentId: "component:synthetic-window-001",
      amount: 15.6,
      unit: "W/K"
    })
  ]),
  huAggregation: Object.freeze({
    amount: 46.6,
    unit: "W/K"
  }),
  nonHuValues: Object.freeze([
    Object.freeze({
      contributionType: "thermal_bridge_transmission_contribution",
      amount: 8,
      unit: "W/K"
    }),
    Object.freeze({
      contributionType: "ground_transmission_contribution",
      amount: 12,
      unit: "W/K"
    }),
    Object.freeze({
      contributionType: "adjacent_space_transmission_contribution",
      amount: 3,
      unit: "W/K"
    })
  ]),
  h11ComposedInputs: Object.freeze([
    Object.freeze({
      contributionType: "hu_aggregated_transmission_contribution",
      amount: 46.6,
      unit: "W/K"
    }),
    Object.freeze({
      contributionType: "thermal_bridge_transmission_contribution",
      amount: 8,
      unit: "W/K"
    }),
    Object.freeze({
      contributionType: "ground_transmission_contribution",
      amount: 12,
      unit: "W/K"
    }),
    Object.freeze({
      contributionType: "adjacent_space_transmission_contribution",
      amount: 3,
      unit: "W/K"
    })
  ]),
  htrTotal: Object.freeze({
    amount: 69.6,
    unit: "W/K"
  }),
  h12Readiness: Object.freeze({
    status: "ready",
    isHtrTotalCalculationReady: true,
    hasHtrResult: true,
    areHtrTotalInputsComposed: true,
    areHtrTotalInputsNumericallyReady: true,
    areNonHuHtrNumericValuesValidated: true,
    isCompleteHuReady: false,
    isCompleteHtrReady: false,
    hasHuResult: false,
    downstreamReadiness: false
  })
});
