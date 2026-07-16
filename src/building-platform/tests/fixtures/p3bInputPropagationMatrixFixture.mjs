export const P3B_PROPAGATION_MATRIX_STATUS = "P3B_PR1_PROPAGATION_MATRIX_ACTIVE";

export const P3B_INPUT_PROPAGATION_FIELDS = Object.freeze([
  Object.freeze({
    fieldId: "structural_system",
    uiField: "structural_system",
    assistedAnswerPath: "structuralSystem",
    buildingDnaPath: "building.structuralSystem",
    resolverPath: "typologyProposal.assemblySelections.exteriorWall",
    adapterPath: "assemblyInput.assemblies[exterior_wall]",
    engineOutputDependencies: Object.freeze(["assembly.uValue", "Hd", "Htr", "Qtr,H", "QHnd", "QCnd"]),
    reportPath: "technicalWorkspace.assemblies",
    propagationStatus: "fully_propagated"
  }),
  Object.freeze({
    fieldId: "wall_material",
    uiField: "wall_material",
    assistedAnswerPath: "wallMaterial",
    buildingDnaPath: "typologyProposal.assemblySelections.exteriorWall",
    resolverPath: "buildingTypologyEngine.exteriorWallSelectionFor",
    adapterPath: "assemblyInput.assemblies[exterior_wall].layers.material",
    engineOutputDependencies: Object.freeze(["assembly.uValue", "Hd", "Htr", "Qtr,H", "QHnd", "QCnd"]),
    reportPath: "technicalWorkspace.materials",
    propagationStatus: "fully_propagated"
  }),
  Object.freeze({
    fieldId: "wall_insulation",
    uiField: "wall_insulation",
    assistedAnswerPath: "renovations.wallInsulation",
    buildingDnaPath: "assemblies[exterior_wall].layers",
    resolverPath: "buildingTypologyEngine.epsThicknessCode",
    adapterPath: "assemblyInput.assemblies[exterior_wall].layers.thickness",
    engineOutputDependencies: Object.freeze(["Rlayer", "Rtotal", "U", "Hd", "Htr", "Qtr,H", "QHnd"]),
    reportPath: "technicalWorkspace.layerStacks",
    propagationStatus: "fully_propagated"
  }),
  Object.freeze({
    fieldId: "window_orientation",
    uiField: "window_orientation",
    assistedAnswerPath: "buildingSpecificParameters.windowOrientation",
    buildingDnaPath: "monthlyProfiles[*].heatGains.solarOrientation",
    resolverPath: "climateProfileToBuildingMonthlyProfiles.options.solarOrientation",
    adapterPath: "chapter2Input.monthlyCases[*].heatGains.solarGains",
    engineOutputDependencies: Object.freeze(["QHgn", "QHnd", "QCnd"]),
    reportPath: "technicalWorkspace.monthly.solarGainsKwh",
    propagationStatus: "fully_propagated_for_profiles_with_orientation_solar_gains"
  }),
  Object.freeze({
    fieldId: "main_orientation",
    uiField: "main_orientation",
    assistedAnswerPath: "buildingSpecificParameters.mainOrientation",
    buildingDnaPath: "buildingSpecificParameters.mainOrientation",
    resolverPath: "climateProfileToBuildingMonthlyProfiles.options.mainOrientation",
    adapterPath: "chapter2Input.monthlyCases[*].source",
    engineOutputDependencies: Object.freeze(["QHgn", "QHnd", "QCnd"]),
    reportPath: "technicalWorkspace.buildingSummary",
    propagationStatus: "fully_propagated_when_window_orientation_is_unknown"
  }),
  Object.freeze({
    fieldId: "climate_profile_id",
    uiField: "climate_profile_id",
    assistedAnswerPath: "climateProfileId",
    buildingDnaPath: "climateProfile.profileId",
    resolverPath: "resolveClimateProfileSelection",
    adapterPath: "chapter2Input.monthlyCases[*]",
    engineOutputDependencies: Object.freeze(["Qtr,H", "Qve,H", "QHgn", "QCgn", "QHnd", "QCnd"]),
    reportPath: "technicalWorkspace.report.climate",
    propagationStatus: "fully_propagated"
  }),
  Object.freeze({
    fieldId: "window_area_m2",
    uiField: "window_area_m2",
    assistedAnswerPath: "buildingSpecificParameters.windowAreaM2",
    buildingDnaPath: "envelopeElements[windows].area",
    resolverPath: "makeEnvelopeElements",
    adapterPath: "envelopeInput.elements[windows].area",
    engineOutputDependencies: Object.freeze(["Hd", "Htr", "Qtr,H", "QHnd", "QCnd"]),
    reportPath: "technicalWorkspace.envelope.components",
    propagationStatus: "fully_propagated"
  }),
  Object.freeze({
    fieldId: "exterior_wall_area_m2",
    uiField: "exterior_wall_area_m2",
    assistedAnswerPath: "buildingSpecificParameters.exteriorWallAreaM2",
    buildingDnaPath: "envelopeElements[exterior-walls].area",
    resolverPath: "makeEnvelopeElements",
    adapterPath: "envelopeInput.elements[exterior-walls].area",
    engineOutputDependencies: Object.freeze(["Hd", "Htr", "Qtr,H", "QHnd"]),
    reportPath: "technicalWorkspace.envelope.elementRows",
    propagationStatus: "fully_propagated"
  }),
  Object.freeze({
    fieldId: "heated_volume_m3",
    uiField: "heated_volume_m3",
    assistedAnswerPath: "buildingSpecificParameters.heatedVolumeM3",
    buildingDnaPath: "monthlyProfiles[*].ventilation.airFlowRate",
    resolverPath: "monthlyProfilesWithGeometryVentilation",
    adapterPath: "chapter2Input.monthlyCases[*].ventilation.components.airFlowRate",
    engineOutputDependencies: Object.freeze(["Qve,H", "Qve,C", "QHnd", "QCnd"]),
    reportPath: "technicalWorkspace.monthly.ventilationAirFlowRateM3PerS",
    propagationStatus: "fully_propagated_when_ventilation_ach_is_present"
  })
]);
