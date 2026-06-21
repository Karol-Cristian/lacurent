export const fixture009DhwDistributionLossComponent = Object.freeze({
  fixtureId: "FIXTURE_009_DHW_DISTRIBUTION_LOSS_COMPONENT",
  exampleId: "MC001_ANEXA_3_3_B_DHW_DISTRIBUTION_COMPONENTS",
  description:
    "MC001 Anexa 3.3.B DHW distribution-loss component formulas with complete displayed inputs",
  source: Object.freeze({
    document: "docs/Mc_001-2022_-_Metodologie_calcul_performanta_energetica_caldiri.pdf",
    mc001Section:
      "MC001-2022 section 3.3.7.2 and Anexa 3.3.B distribution-loss component example",
    pages: Object.freeze([260, 261, 269, 270, 272, 273, 274, 277, 278]),
    formulaReferences: Object.freeze([
      "MC001 relation (3.200) mean DHW distribution temperature",
      "MC001 relation (3.201) insulated pipe linear thermal transmittance",
      "MC001 relation (3.202) buried pipe linear thermal transmittance",
      "MC001 relation (3.203) uninsulated pipe linear thermal transmittance",
      "MC001 relation (3.204) approximate uninsulated pipe linear thermal transmittance"
    ])
  }),
  tolerances: Object.freeze({
    exactAbs: 1e-12,
    sourceRoundedTwoDecimalsAbs: 0.005
  }),
  expectedRows: Object.freeze([
    Object.freeze({
      rowKey: "mean_dhw_distribution_temperature",
      formulaId: "MC001_3_200_DHW_MEAN_DISTRIBUTION_TEMPERATURE",
      source:
        "Anexa 3.3.B page 274 thetaW = 50 C and deltaThetaW = 5 K; page 278 displays thetaW,em,mean = 47.5 C.",
      inputs: Object.freeze({
        thetaWDistributionC: 50,
        deltaThetaWLoopK: 5
      }),
      expected: 47.5,
      expectedUnit: "degC",
      expectedBasis: "exact_display",
      toleranceAbs: 1e-12
    }),
    Object.freeze({
      rowKey: "insulated_pipe_linear_transmittance",
      formulaId: "MC001_3_201_DHW_LINEAR_TRANSMITTANCE_INSULATED_PIPE",
      source:
        "Anexa 3.3.B page 270 di = 0.02 m, da = 0.06 m, lambdaD = 0.04 W/mK; page 277 ha = 8 W/m2K for insulated pipes; page 272 displays Psi = 0.20 W/mK.",
      inputs: Object.freeze({
        innerDiameterM: 0.02,
        outerDiameterM: 0.06,
        insulationThermalConductivityWPerMK: 0.04,
        externalHeatTransferCoefficientWPerM2K: 8
      }),
      expected: 0.2,
      expectedUnit: "W/(mK)",
      expectedBasis: "source_rounded_two_decimals",
      toleranceAbs: 0.005
    }),
    Object.freeze({
      rowKey: "buried_pipe_linear_transmittance",
      formulaId: "MC001_3_202_DHW_LINEAR_TRANSMITTANCE_BURIED_PIPE",
      source:
        "Anexa 3.3.B page 270 di = 0.02 m, da = 0.06 m, lambdaD = 0.04 W/mK, lambdaem = 1 W/mK, z = 0.15 m; page 272 displays Psiem = 0.21 W/mK.",
      inputs: Object.freeze({
        innerDiameterM: 0.02,
        outerDiameterM: 0.06,
        insulationThermalConductivityWPerMK: 0.04,
        burialMaterialThermalConductivityWPerMK: 1,
        burialDepthM: 0.15
      }),
      expected: 0.21,
      expectedUnit: "W/(mK)",
      expectedBasis: "source_rounded_two_decimals",
      toleranceAbs: 0.005
    }),
    Object.freeze({
      rowKey: "uninsulated_pipe_linear_transmittance_exact",
      formulaId: "MC001_3_203_DHW_LINEAR_TRANSMITTANCE_UNINSULATED_PIPE",
      source:
        "Anexa 3.3.B page 270 dp,i = 0.019 m, dp,a = 0.022 m, lambdap = 380 W/mK; page 277 ha = 14 W/m2K for uninsulated pipes; page 273 displays Psinon = 0.97 W/mK for the exact formula.",
      inputs: Object.freeze({
        innerDiameterM: 0.019,
        outerDiameterM: 0.022,
        pipeThermalConductivityWPerMK: 380,
        externalHeatTransferCoefficientWPerM2K: 14
      }),
      expected: 0.97,
      expectedUnit: "W/(mK)",
      expectedBasis: "source_rounded_two_decimals",
      toleranceAbs: 0.005
    }),
    Object.freeze({
      rowKey: "uninsulated_pipe_linear_transmittance_approx",
      formulaId: "MC001_3_204_DHW_LINEAR_TRANSMITTANCE_UNINSULATED_APPROX",
      source:
        "Anexa 3.3.B page 270 dp,a = 0.022 m; page 277 ha = 14 W/m2K for uninsulated pipes; page 273 displays Psinon = 0.97 W/mK for the approximation.",
      inputs: Object.freeze({
        outerDiameterM: 0.022,
        externalHeatTransferCoefficientWPerM2K: 14
      }),
      expected: 0.97,
      expectedUnit: "W/(mK)",
      expectedBasis: "source_rounded_two_decimals",
      toleranceAbs: 0.005
    })
  ]),
  blockedRows: Object.freeze([
    Object.freeze({
      rowKey: "dhw_distribution_loss_with_recirculation_energy",
      source: "Anexa 3.3.B page 278 `QW,dis,ls = 0.225 kWh`.",
      reason:
        "The expected output is visible, but the exact effective length/equivalent-length basis for the DHW distribution and recirculation circuit is not cleanly traceable from the visible Anexa 3.3.B rows without relying on external SR EN 15316-3 length approximation details."
    }),
    Object.freeze({
      rowKey: "dhw_stub_loss_without_recirculation",
      source: "Anexa 3.3.B page 279 `QW,dis,stub = 135.8 kWh`.",
      reason:
        "The row depends on open-circuit volume, draw-off/use profile, timestep basis, and mass-flow interpretation that are not all cleanly mapped to MC001 relation (3.206) from the displayed rows."
    }),
    Object.freeze({
      rowKey: "dhw_recirculation_loss_without_drawoff",
      source: "Anexa 3.3.B page 279 `QW,dis,nom = 7.3 kWh`.",
      reason:
        "Relation (3.207) remains visually/symbolically sensitive and the row depends on the no-consumption recirculation profile and average-temperature path."
    }),
    Object.freeze({
      rowKey: "recoverable_or_recovered_distribution_losses",
      source: "Anexa 3.3.B page 279 recoverable/recovered rows.",
      reason:
        "Recovery factors and conditioned-space allocation are outside this component fixture and are not needed to validate the selected transmittance formulas."
    })
  ])
});
