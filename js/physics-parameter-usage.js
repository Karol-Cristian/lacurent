window.LaCurentPhysicsParameterUsage = {
  "generatedAt": "2026-06-04T12:21:46.348Z",
  "scope": "src/features/energy/physics/calculators + src/features/energy/physics/engine",
  "counts": {
    "total": 42,
    "used": 39,
    "genericMetadata": 2,
    "unused": 1
  },
  "usage": [
    {
      "parameterId": "area",
      "usedInCode": true,
      "usedInCalculatorOrEngine": true,
      "domainSpecificUse": true,
      "status": "used",
      "hitCount": 21,
      "hits": [
        {
          "alias": "areaM2",
          "file": "src/features/energy/physics/calculators/envelopeV02.ts",
          "generic": false
        },
        {
          "alias": "areaM2",
          "file": "src/features/energy/physics/calculators/lightingDemand.ts",
          "generic": false
        },
        {
          "alias": "areaM2",
          "file": "src/features/energy/physics/calculators/solarGains.ts",
          "generic": false
        },
        {
          "alias": "areaM2",
          "file": "src/features/energy/physics/calculators/transmissionHeatTransfer.ts",
          "generic": false
        },
        {
          "alias": "areaM2",
          "file": "src/features/energy/physics/engine/buildPhysicalModel.ts",
          "generic": false
        },
        {
          "alias": "areaM2",
          "file": "src/features/energy/physics/engine/demoEnvelopeV02.ts",
          "generic": false
        },
        {
          "alias": "areaM2",
          "file": "src/features/energy/physics/engine/runEnergyDemandV03.ts",
          "generic": false
        },
        {
          "alias": "area",
          "file": "src/features/energy/physics/calculators/dhwDemand.ts",
          "generic": true
        }
      ]
    },
    {
      "parameterId": "useful_floor_area",
      "usedInCode": true,
      "usedInCalculatorOrEngine": true,
      "domainSpecificUse": true,
      "status": "used",
      "hitCount": 14,
      "hits": [
        {
          "alias": "usefulAreaM2",
          "file": "src/features/energy/physics/engine/buildPhysicalModel.ts",
          "generic": false
        },
        {
          "alias": "usefulAreaM2",
          "file": "src/features/energy/physics/engine/demoEnvelopeV02.ts",
          "generic": false
        },
        {
          "alias": "heatedAreaM2",
          "file": "src/features/energy/physics/calculators/annualDemand.ts",
          "generic": false
        },
        {
          "alias": "heatedAreaM2",
          "file": "src/features/energy/physics/calculators/coolingDemand.ts",
          "generic": false
        },
        {
          "alias": "heatedAreaM2",
          "file": "src/features/energy/physics/calculators/dhwDemand.ts",
          "generic": false
        },
        {
          "alias": "heatedAreaM2",
          "file": "src/features/energy/physics/calculators/internalGains.ts",
          "generic": false
        },
        {
          "alias": "heatedAreaM2",
          "file": "src/features/energy/physics/calculators/primaryEnergyAndCo2V05.ts",
          "generic": false
        },
        {
          "alias": "heatedAreaM2",
          "file": "src/features/energy/physics/calculators/systemsLayerV04.ts",
          "generic": false
        }
      ]
    },
    {
      "parameterId": "volume",
      "usedInCode": true,
      "usedInCalculatorOrEngine": true,
      "domainSpecificUse": true,
      "status": "used",
      "hitCount": 6,
      "hits": [
        {
          "alias": "heatedVolumeM3",
          "file": "src/features/energy/physics/calculators/ventilationV02.ts",
          "generic": false
        },
        {
          "alias": "heatedVolumeM3",
          "file": "src/features/energy/physics/engine/buildPhysicalModel.ts",
          "generic": false
        },
        {
          "alias": "heatedVolumeM3",
          "file": "src/features/energy/physics/engine/demoEnvelopeV02.ts",
          "generic": false
        },
        {
          "alias": "volumeM3",
          "file": "src/features/energy/physics/calculators/ventilationHeatTransfer.ts",
          "generic": false
        },
        {
          "alias": "volumeM3",
          "file": "src/features/energy/physics/engine/buildPhysicalModel.ts",
          "generic": false
        },
        {
          "alias": "volumeM3",
          "file": "src/features/energy/physics/engine/demoEnvelopeV02.ts",
          "generic": false
        }
      ]
    },
    {
      "parameterId": "area_volume_ratio",
      "usedInCode": false,
      "usedInCalculatorOrEngine": false,
      "domainSpecificUse": false,
      "status": "unused",
      "hitCount": 0,
      "hits": []
    },
    {
      "parameterId": "thickness",
      "usedInCode": true,
      "usedInCalculatorOrEngine": true,
      "domainSpecificUse": true,
      "status": "used",
      "hitCount": 4,
      "hits": [
        {
          "alias": "thicknessM",
          "file": "src/features/energy/physics/calculators/envelopeV02.ts",
          "generic": false
        },
        {
          "alias": "thicknessM",
          "file": "src/features/energy/physics/calculators/resistance.ts",
          "generic": false
        },
        {
          "alias": "thicknessM",
          "file": "src/features/energy/physics/engine/buildPhysicalModel.ts",
          "generic": false
        },
        {
          "alias": "thicknessM",
          "file": "src/features/energy/physics/engine/demoEnvelopeV02.ts",
          "generic": false
        }
      ]
    },
    {
      "parameterId": "thermal_conductivity",
      "usedInCode": true,
      "usedInCalculatorOrEngine": true,
      "domainSpecificUse": true,
      "status": "used",
      "hitCount": 3,
      "hits": [
        {
          "alias": "lambdaWmK",
          "file": "src/features/energy/physics/calculators/resistance.ts",
          "generic": false
        },
        {
          "alias": "lambdaWmK",
          "file": "src/features/energy/physics/engine/buildPhysicalModel.ts",
          "generic": false
        },
        {
          "alias": "lambdaWPerMK",
          "file": "src/features/energy/physics/calculators/envelopeV02.ts",
          "generic": false
        }
      ]
    },
    {
      "parameterId": "layer_thermal_resistance",
      "usedInCode": true,
      "usedInCalculatorOrEngine": true,
      "domainSpecificUse": true,
      "status": "used",
      "hitCount": 1,
      "hits": [
        {
          "alias": "layerResistance",
          "file": "src/features/energy/physics/calculators/resistance.ts",
          "generic": false
        }
      ]
    },
    {
      "parameterId": "internal_surface_resistance",
      "usedInCode": true,
      "usedInCalculatorOrEngine": true,
      "domainSpecificUse": true,
      "status": "used",
      "hitCount": 2,
      "hits": [
        {
          "alias": "rsi",
          "file": "src/features/energy/physics/calculators/envelopeV02.ts",
          "generic": false
        },
        {
          "alias": "rsi",
          "file": "src/features/energy/physics/calculators/resistance.ts",
          "generic": false
        }
      ]
    },
    {
      "parameterId": "external_surface_resistance",
      "usedInCode": true,
      "usedInCalculatorOrEngine": true,
      "domainSpecificUse": true,
      "status": "used",
      "hitCount": 2,
      "hits": [
        {
          "alias": "rse",
          "file": "src/features/energy/physics/calculators/envelopeV02.ts",
          "generic": false
        },
        {
          "alias": "rse",
          "file": "src/features/energy/physics/calculators/resistance.ts",
          "generic": false
        }
      ]
    },
    {
      "parameterId": "total_thermal_resistance",
      "usedInCode": true,
      "usedInCalculatorOrEngine": true,
      "domainSpecificUse": true,
      "status": "used",
      "hitCount": 1,
      "hits": [
        {
          "alias": "rTotalM2KW",
          "file": "src/features/energy/physics/calculators/transmissionHeatTransfer.ts",
          "generic": false
        }
      ]
    },
    {
      "parameterId": "thermal_transmittance",
      "usedInCode": true,
      "usedInCalculatorOrEngine": true,
      "domainSpecificUse": true,
      "status": "used",
      "hitCount": 7,
      "hits": [
        {
          "alias": "uValueWm2K",
          "file": "src/features/energy/physics/calculators/envelopeV02.ts",
          "generic": false
        },
        {
          "alias": "uValueWm2K",
          "file": "src/features/energy/physics/calculators/transmissionHeatTransfer.ts",
          "generic": false
        },
        {
          "alias": "uValueWm2K",
          "file": "src/features/energy/physics/engine/buildPhysicalModel.ts",
          "generic": false
        },
        {
          "alias": "uValueWm2K",
          "file": "src/features/energy/physics/engine/runEnergySimulation.ts",
          "generic": false
        },
        {
          "alias": "declaredUValueWm2K",
          "file": "src/features/energy/physics/calculators/envelopeV02.ts",
          "generic": false
        },
        {
          "alias": "declaredUValueWm2K",
          "file": "src/features/energy/physics/calculators/transmissionHeatTransfer.ts",
          "generic": false
        },
        {
          "alias": "declaredUValueWm2K",
          "file": "src/features/energy/physics/engine/buildPhysicalModel.ts",
          "generic": false
        }
      ]
    },
    {
      "parameterId": "corrected_thermal_transmittance",
      "usedInCode": true,
      "usedInCalculatorOrEngine": true,
      "domainSpecificUse": true,
      "status": "used",
      "hitCount": 2,
      "hits": [
        {
          "alias": "correctedUValueWm2K",
          "file": "src/features/energy/physics/calculators/transmissionHeatTransfer.ts",
          "generic": false
        },
        {
          "alias": "correctedUValueWm2K",
          "file": "src/features/energy/physics/engine/runEnergySimulation.ts",
          "generic": false
        }
      ]
    },
    {
      "parameterId": "linear_thermal_bridge_transmittance",
      "usedInCode": true,
      "usedInCalculatorOrEngine": true,
      "domainSpecificUse": true,
      "status": "used",
      "hitCount": 5,
      "hits": [
        {
          "alias": "psiWmK",
          "file": "src/features/energy/physics/calculators/envelopeV02.ts",
          "generic": false
        },
        {
          "alias": "psiWmK",
          "file": "src/features/energy/physics/calculators/thermalBridgeLoss.ts",
          "generic": false
        },
        {
          "alias": "psiWmK",
          "file": "src/features/energy/physics/engine/buildPhysicalModel.ts",
          "generic": false
        },
        {
          "alias": "psiWPerMK",
          "file": "src/features/energy/physics/calculators/envelopeV02.ts",
          "generic": false
        },
        {
          "alias": "psiWPerMK",
          "file": "src/features/energy/physics/engine/demoEnvelopeV02.ts",
          "generic": false
        }
      ]
    },
    {
      "parameterId": "thermal_bridge_length",
      "usedInCode": true,
      "usedInCalculatorOrEngine": true,
      "domainSpecificUse": true,
      "status": "used",
      "hitCount": 4,
      "hits": [
        {
          "alias": "lengthM",
          "file": "src/features/energy/physics/calculators/envelopeV02.ts",
          "generic": false
        },
        {
          "alias": "lengthM",
          "file": "src/features/energy/physics/calculators/thermalBridgeLoss.ts",
          "generic": false
        },
        {
          "alias": "lengthM",
          "file": "src/features/energy/physics/engine/buildPhysicalModel.ts",
          "generic": false
        },
        {
          "alias": "lengthM",
          "file": "src/features/energy/physics/engine/demoEnvelopeV02.ts",
          "generic": false
        }
      ]
    },
    {
      "parameterId": "thermal_bridge_heat_transfer",
      "usedInCode": true,
      "usedInCalculatorOrEngine": true,
      "domainSpecificUse": true,
      "status": "used",
      "hitCount": 1,
      "hits": [
        {
          "alias": "thermalBridgeLoss",
          "file": "src/features/energy/physics/engine/runEnergySimulation.ts",
          "generic": false
        }
      ]
    },
    {
      "parameterId": "heat_transfer_coefficient",
      "usedInCode": true,
      "usedInCalculatorOrEngine": true,
      "domainSpecificUse": true,
      "status": "used",
      "hitCount": 7,
      "hits": [
        {
          "alias": "heatTransferCoefficientWK",
          "file": "src/features/energy/physics/calculators/transmissionHeatTransfer.ts",
          "generic": false
        },
        {
          "alias": "heatTransferCoefficientWK",
          "file": "src/features/energy/physics/engine/runEnergySimulation.ts",
          "generic": false
        },
        {
          "alias": "hTotal",
          "file": "src/features/energy/physics/calculators/coolingDemandMonthly.ts",
          "generic": false
        },
        {
          "alias": "hTotal",
          "file": "src/features/energy/physics/calculators/envelopeV02.ts",
          "generic": false
        },
        {
          "alias": "hTotal",
          "file": "src/features/energy/physics/engine/runEnergyDemandV03.ts",
          "generic": false
        },
        {
          "alias": "totalHeatTransferCoefficient",
          "file": "src/features/energy/physics/calculators/heatingDemand.ts",
          "generic": false
        },
        {
          "alias": "totalHeatTransferCoefficient",
          "file": "src/features/energy/physics/engine/runEnergySimulation.ts",
          "generic": false
        }
      ]
    },
    {
      "parameterId": "transmission_heat_transfer",
      "usedInCode": true,
      "usedInCalculatorOrEngine": true,
      "domainSpecificUse": true,
      "status": "used",
      "hitCount": 6,
      "hits": [
        {
          "alias": "Htr",
          "file": "src/features/energy/physics/calculators/envelopeV02.ts",
          "generic": false
        },
        {
          "alias": "Htr",
          "file": "src/features/energy/physics/engine/runEnergyDemandV03.ts",
          "generic": false
        },
        {
          "alias": "Htr",
          "file": "src/features/energy/physics/engine/runEnvelopePhysicsV02.ts",
          "generic": false
        },
        {
          "alias": "heatLossTransmission",
          "file": "src/features/energy/physics/engine/generateEnergyResult.ts",
          "generic": false
        },
        {
          "alias": "heatLossTransmission",
          "file": "src/features/energy/physics/engine/runEnergySimulation.ts",
          "generic": false
        },
        {
          "alias": "totalTransmissionHeatTransferWPerK",
          "file": "src/features/energy/physics/engine/runEnvelopePhysicsV02.ts",
          "generic": false
        }
      ]
    },
    {
      "parameterId": "air_change_rate",
      "usedInCode": true,
      "usedInCalculatorOrEngine": true,
      "domainSpecificUse": true,
      "status": "used",
      "hitCount": 5,
      "hits": [
        {
          "alias": "airChangeRateACH",
          "file": "src/features/energy/physics/calculators/ventilationHeatTransfer.ts",
          "generic": false
        },
        {
          "alias": "airChangeRateACH",
          "file": "src/features/energy/physics/calculators/ventilationV02.ts",
          "generic": false
        },
        {
          "alias": "airChangeRateACH",
          "file": "src/features/energy/physics/engine/buildPhysicalModel.ts",
          "generic": false
        },
        {
          "alias": "airChangeRateACH",
          "file": "src/features/energy/physics/engine/demoEnvelopeV02.ts",
          "generic": false
        },
        {
          "alias": "ach",
          "file": "src/features/energy/physics/calculators/ventilationV02.ts",
          "generic": false
        }
      ]
    },
    {
      "parameterId": "airflow",
      "usedInCode": true,
      "usedInCalculatorOrEngine": true,
      "domainSpecificUse": true,
      "status": "used",
      "hitCount": 1,
      "hits": [
        {
          "alias": "airflowM3PerH",
          "file": "src/features/energy/physics/calculators/ventilationV02.ts",
          "generic": false
        }
      ]
    },
    {
      "parameterId": "heat_recovery_efficiency",
      "usedInCode": true,
      "usedInCalculatorOrEngine": true,
      "domainSpecificUse": true,
      "status": "used",
      "hitCount": 2,
      "hits": [
        {
          "alias": "heatRecoveryEfficiency",
          "file": "src/features/energy/physics/calculators/ventilationHeatTransfer.ts",
          "generic": false
        },
        {
          "alias": "heatRecoveryEfficiency",
          "file": "src/features/energy/physics/calculators/ventilationV02.ts",
          "generic": false
        }
      ]
    },
    {
      "parameterId": "ventilation_heat_transfer",
      "usedInCode": true,
      "usedInCalculatorOrEngine": true,
      "domainSpecificUse": true,
      "status": "used",
      "hitCount": 3,
      "hits": [
        {
          "alias": "heatLossVentilation",
          "file": "src/features/energy/physics/engine/generateEnergyResult.ts",
          "generic": false
        },
        {
          "alias": "heatLossVentilation",
          "file": "src/features/energy/physics/engine/runEnergySimulation.ts",
          "generic": false
        },
        {
          "alias": "totalVentilationHeatTransferWPerK",
          "file": "src/features/energy/physics/engine/runEnvelopePhysicsV02.ts",
          "generic": false
        }
      ]
    },
    {
      "parameterId": "heating_degree_days",
      "usedInCode": true,
      "usedInCalculatorOrEngine": true,
      "domainSpecificUse": true,
      "status": "used",
      "hitCount": 4,
      "hits": [
        {
          "alias": "heatingDegreeDays",
          "file": "src/features/energy/physics/calculators/heatingDemand.ts",
          "generic": false
        },
        {
          "alias": "heatingDegreeDays",
          "file": "src/features/energy/physics/calculators/heatingDemandV02.ts",
          "generic": false
        },
        {
          "alias": "heatingDegreeDays",
          "file": "src/features/energy/physics/engine/demoEnvelopeV02.ts",
          "generic": false
        },
        {
          "alias": "hdd",
          "file": "src/features/energy/physics/calculators/heatingDemandV02.ts",
          "generic": false
        }
      ]
    },
    {
      "parameterId": "heating_demand",
      "usedInCode": true,
      "usedInCalculatorOrEngine": true,
      "domainSpecificUse": true,
      "status": "used",
      "hitCount": 7,
      "hits": [
        {
          "alias": "heatingDemandKwhYear",
          "file": "src/features/energy/physics/calculators/annualDemand.ts",
          "generic": false
        },
        {
          "alias": "heatingDemandKwhYear",
          "file": "src/features/energy/physics/calculators/heatingSystemLosses.ts",
          "generic": false
        },
        {
          "alias": "heatingDemandKwhYear",
          "file": "src/features/energy/physics/calculators/systemsLayerV04.ts",
          "generic": false
        },
        {
          "alias": "heatingDemandKwhYear",
          "file": "src/features/energy/physics/engine/generateEnergyResult.ts",
          "generic": false
        },
        {
          "alias": "heatingDemandKwhYear",
          "file": "src/features/energy/physics/engine/runEnergySimulation.ts",
          "generic": false
        },
        {
          "alias": "heatingDemandKwhYear",
          "file": "src/features/energy/physics/engine/runSystemsLayerV04.ts",
          "generic": false
        },
        {
          "alias": "estimatedHeatingDemandKwhYear",
          "file": "src/features/energy/physics/engine/runEnvelopePhysicsV02.ts",
          "generic": false
        }
      ]
    },
    {
      "parameterId": "cooling_demand",
      "usedInCode": true,
      "usedInCalculatorOrEngine": true,
      "domainSpecificUse": true,
      "status": "used",
      "hitCount": 5,
      "hits": [
        {
          "alias": "coolingDemandKwhYear",
          "file": "src/features/energy/physics/calculators/annualDemand.ts",
          "generic": false
        },
        {
          "alias": "coolingDemandKwhYear",
          "file": "src/features/energy/physics/calculators/coolingSystemConsumption.ts",
          "generic": false
        },
        {
          "alias": "coolingDemandKwhYear",
          "file": "src/features/energy/physics/calculators/systemsLayerV04.ts",
          "generic": false
        },
        {
          "alias": "coolingDemandKwhYear",
          "file": "src/features/energy/physics/engine/runEnergySimulation.ts",
          "generic": false
        },
        {
          "alias": "coolingDemandKwhYear",
          "file": "src/features/energy/physics/engine/runSystemsLayerV04.ts",
          "generic": false
        }
      ]
    },
    {
      "parameterId": "domestic_hot_water_demand",
      "usedInCode": true,
      "usedInCalculatorOrEngine": true,
      "domainSpecificUse": true,
      "status": "used",
      "hitCount": 4,
      "hits": [
        {
          "alias": "dhwDemandKwhYear",
          "file": "src/features/energy/physics/calculators/systemsLayerV04.ts",
          "generic": false
        },
        {
          "alias": "dhwDemandKwhYear",
          "file": "src/features/energy/physics/engine/runEnergySimulation.ts",
          "generic": false
        },
        {
          "alias": "dhwDemandKwhYear",
          "file": "src/features/energy/physics/engine/runSystemsLayerV04.ts",
          "generic": false
        },
        {
          "alias": "usefulDhwDemandKwhYear",
          "file": "src/features/energy/physics/calculators/dhwSystemLosses.ts",
          "generic": false
        }
      ]
    },
    {
      "parameterId": "solar_radiation",
      "usedInCode": true,
      "usedInCalculatorOrEngine": true,
      "domainSpecificUse": true,
      "status": "used",
      "hitCount": 1,
      "hits": [
        {
          "alias": "solarRadiationKwhM2",
          "file": "src/features/energy/physics/calculators/solarGains.ts",
          "generic": false
        }
      ]
    },
    {
      "parameterId": "solar_total_energy_transmittance",
      "usedInCode": true,
      "usedInCalculatorOrEngine": true,
      "domainSpecificUse": true,
      "status": "used",
      "hitCount": 2,
      "hits": [
        {
          "alias": "gValue",
          "file": "src/features/energy/physics/calculators/solarGains.ts",
          "generic": false
        },
        {
          "alias": "gValue",
          "file": "src/features/energy/physics/engine/runEnergyDemandV03.ts",
          "generic": false
        }
      ]
    },
    {
      "parameterId": "internal_gains",
      "usedInCode": true,
      "usedInCalculatorOrEngine": true,
      "domainSpecificUse": true,
      "status": "used",
      "hitCount": 6,
      "hits": [
        {
          "alias": "internalGainsKwh",
          "file": "src/features/energy/physics/calculators/annualDemand.ts",
          "generic": false
        },
        {
          "alias": "internalGainsKwh",
          "file": "src/features/energy/physics/calculators/heatBalance.ts",
          "generic": false
        },
        {
          "alias": "internalGainsKwh",
          "file": "src/features/energy/physics/calculators/heatingDemandMonthly.ts",
          "generic": false
        },
        {
          "alias": "totalInternalGainsKwh",
          "file": "src/features/energy/physics/calculators/annualDemand.ts",
          "generic": false
        },
        {
          "alias": "totalInternalGainsKwh",
          "file": "src/features/energy/physics/calculators/heatingDemandMonthly.ts",
          "generic": false
        },
        {
          "alias": "totalInternalGainsKwh",
          "file": "src/features/energy/physics/calculators/internalGains.ts",
          "generic": false
        }
      ]
    },
    {
      "parameterId": "gain_utilization_factor",
      "usedInCode": true,
      "usedInCalculatorOrEngine": true,
      "domainSpecificUse": true,
      "status": "used",
      "hitCount": 1,
      "hits": [
        {
          "alias": "utilizationFactor",
          "file": "src/features/energy/physics/calculators/heatBalance.ts",
          "generic": false
        }
      ]
    },
    {
      "parameterId": "system_efficiency",
      "usedInCode": true,
      "usedInCalculatorOrEngine": true,
      "domainSpecificUse": true,
      "status": "used",
      "hitCount": 11,
      "hits": [
        {
          "alias": "efficiency",
          "file": "src/features/energy/physics/calculators/dhwSystemLosses.ts",
          "generic": true
        },
        {
          "alias": "efficiency",
          "file": "src/features/energy/physics/calculators/heatingSystemLosses.ts",
          "generic": true
        },
        {
          "alias": "efficiency",
          "file": "src/features/energy/physics/calculators/systemLosses.ts",
          "generic": true
        },
        {
          "alias": "efficiency",
          "file": "src/features/energy/physics/calculators/systemsLayerV04.ts",
          "generic": true
        },
        {
          "alias": "seasonalEfficiency",
          "file": "src/features/energy/physics/calculators/systemLosses.ts",
          "generic": false
        },
        {
          "alias": "seasonalEfficiency",
          "file": "src/features/energy/physics/calculators/systemsLayerV04.ts",
          "generic": false
        },
        {
          "alias": "seasonalEfficiency",
          "file": "src/features/energy/physics/engine/buildPhysicalModel.ts",
          "generic": false
        },
        {
          "alias": "seasonalEfficiency",
          "file": "src/features/energy/physics/engine/demoEnvelopeV02.ts",
          "generic": false
        }
      ]
    },
    {
      "parameterId": "scop",
      "usedInCode": true,
      "usedInCalculatorOrEngine": true,
      "domainSpecificUse": true,
      "status": "used",
      "hitCount": 1,
      "hits": [
        {
          "alias": "scop",
          "file": "src/features/energy/physics/calculators/systemLosses.ts",
          "generic": false
        }
      ]
    },
    {
      "parameterId": "seer",
      "usedInCode": true,
      "usedInCalculatorOrEngine": true,
      "domainSpecificUse": true,
      "status": "used",
      "hitCount": 4,
      "hits": [
        {
          "alias": "seer",
          "file": "src/features/energy/physics/calculators/coolingSystemConsumption.ts",
          "generic": false
        },
        {
          "alias": "seer",
          "file": "src/features/energy/physics/calculators/systemsLayerV04.ts",
          "generic": false
        },
        {
          "alias": "eer",
          "file": "src/features/energy/physics/calculators/coolingSystemConsumption.ts",
          "generic": false
        },
        {
          "alias": "eer",
          "file": "src/features/energy/physics/calculators/systemsLayerV04.ts",
          "generic": false
        }
      ]
    },
    {
      "parameterId": "final_energy",
      "usedInCode": true,
      "usedInCalculatorOrEngine": true,
      "domainSpecificUse": true,
      "status": "used",
      "hitCount": 7,
      "hits": [
        {
          "alias": "finalEnergyKwhYear",
          "file": "src/features/energy/physics/calculators/auditScenariosV07.ts",
          "generic": false
        },
        {
          "alias": "finalEnergyKwhYear",
          "file": "src/features/energy/physics/calculators/heatingSystemLosses.ts",
          "generic": false
        },
        {
          "alias": "finalEnergyKwhYear",
          "file": "src/features/energy/physics/calculators/systemsLayerV04.ts",
          "generic": false
        },
        {
          "alias": "finalEnergyKwhYear",
          "file": "src/features/energy/physics/engine/generateEnergyResult.ts",
          "generic": false
        },
        {
          "alias": "finalEnergyKwhYear",
          "file": "src/features/energy/physics/engine/runEnergySimulation.ts",
          "generic": false
        },
        {
          "alias": "totalFinalEnergyKwhYear",
          "file": "src/features/energy/physics/calculators/systemsLayerV04.ts",
          "generic": false
        },
        {
          "alias": "totalFinalEnergyKwhYear",
          "file": "src/features/energy/physics/engine/buildEnergyAuditResultV08.ts",
          "generic": false
        }
      ]
    },
    {
      "parameterId": "final_energy_specific",
      "usedInCode": true,
      "usedInCalculatorOrEngine": true,
      "domainSpecificUse": true,
      "status": "used",
      "hitCount": 5,
      "hits": [
        {
          "alias": "finalEnergyKwhM2Year",
          "file": "src/features/energy/physics/calculators/classificationV06.ts",
          "generic": false
        },
        {
          "alias": "finalEnergyKwhM2Year",
          "file": "src/features/energy/physics/engine/generateEnergyResult.ts",
          "generic": false
        },
        {
          "alias": "finalEnergyKwhM2Year",
          "file": "src/features/energy/physics/engine/runEnergySimulation.ts",
          "generic": false
        },
        {
          "alias": "totalFinalEnergyKwhM2Year",
          "file": "src/features/energy/physics/calculators/systemsLayerV04.ts",
          "generic": false
        },
        {
          "alias": "totalFinalEnergyKwhM2Year",
          "file": "src/features/energy/physics/engine/buildEnergyAuditResultV08.ts",
          "generic": false
        }
      ]
    },
    {
      "parameterId": "primary_energy_factor",
      "usedInCode": true,
      "usedInCalculatorOrEngine": true,
      "domainSpecificUse": true,
      "status": "used",
      "hitCount": 6,
      "hits": [
        {
          "alias": "primaryEnergyFactor",
          "file": "src/features/energy/physics/calculators/co2.ts",
          "generic": false
        },
        {
          "alias": "primaryEnergyFactor",
          "file": "src/features/energy/physics/calculators/primaryEnergy.ts",
          "generic": false
        },
        {
          "alias": "primaryEnergyFactor",
          "file": "src/features/energy/physics/calculators/primaryEnergyAndCo2V05.ts",
          "generic": false
        },
        {
          "alias": "totalFactor",
          "file": "src/features/energy/physics/calculators/primaryEnergyAndCo2V05.ts",
          "generic": false
        },
        {
          "alias": "renewableFactor",
          "file": "src/features/energy/physics/calculators/primaryEnergyAndCo2V05.ts",
          "generic": false
        },
        {
          "alias": "nonRenewableFactor",
          "file": "src/features/energy/physics/calculators/primaryEnergyAndCo2V05.ts",
          "generic": false
        }
      ]
    },
    {
      "parameterId": "primary_energy",
      "usedInCode": true,
      "usedInCalculatorOrEngine": true,
      "domainSpecificUse": true,
      "status": "used",
      "hitCount": 5,
      "hits": [
        {
          "alias": "primaryEnergyKwhYear",
          "file": "src/features/energy/physics/calculators/auditScenariosV07.ts",
          "generic": false
        },
        {
          "alias": "primaryEnergyKwhYear",
          "file": "src/features/energy/physics/engine/buildEnergyAuditResultV08.ts",
          "generic": false
        },
        {
          "alias": "primaryEnergyKwhYear",
          "file": "src/features/energy/physics/engine/generateEnergyResult.ts",
          "generic": false
        },
        {
          "alias": "primaryEnergyKwhYear",
          "file": "src/features/energy/physics/engine/runEnergySimulation.ts",
          "generic": false
        },
        {
          "alias": "totalPrimaryEnergyKwhYear",
          "file": "src/features/energy/physics/calculators/primaryEnergyAndCo2V05.ts",
          "generic": false
        }
      ]
    },
    {
      "parameterId": "primary_energy_specific",
      "usedInCode": true,
      "usedInCalculatorOrEngine": true,
      "domainSpecificUse": true,
      "status": "used",
      "hitCount": 5,
      "hits": [
        {
          "alias": "primaryEnergyKwhM2Year",
          "file": "src/features/energy/physics/calculators/classificationV06.ts",
          "generic": false
        },
        {
          "alias": "primaryEnergyKwhM2Year",
          "file": "src/features/energy/physics/engine/buildEnergyAuditResultV08.ts",
          "generic": false
        },
        {
          "alias": "primaryEnergyKwhM2Year",
          "file": "src/features/energy/physics/engine/generateEnergyResult.ts",
          "generic": false
        },
        {
          "alias": "primaryEnergyKwhM2Year",
          "file": "src/features/energy/physics/engine/runEnergySimulation.ts",
          "generic": false
        },
        {
          "alias": "totalPrimaryEnergyKwhM2Year",
          "file": "src/features/energy/physics/calculators/primaryEnergyAndCo2V05.ts",
          "generic": false
        }
      ]
    },
    {
      "parameterId": "co2_emission_factor",
      "usedInCode": true,
      "usedInCalculatorOrEngine": true,
      "domainSpecificUse": true,
      "status": "used",
      "hitCount": 3,
      "hits": [
        {
          "alias": "kgCo2PerKwh",
          "file": "src/features/energy/physics/calculators/primaryEnergyAndCo2V05.ts",
          "generic": false
        },
        {
          "alias": "co2Factor",
          "file": "src/features/energy/physics/calculators/co2.ts",
          "generic": false
        },
        {
          "alias": "co2Factor",
          "file": "src/features/energy/physics/calculators/primaryEnergyAndCo2V05.ts",
          "generic": false
        }
      ]
    },
    {
      "parameterId": "co2_emissions",
      "usedInCode": true,
      "usedInCalculatorOrEngine": true,
      "domainSpecificUse": true,
      "status": "used",
      "hitCount": 5,
      "hits": [
        {
          "alias": "co2KgYear",
          "file": "src/features/energy/physics/calculators/auditScenariosV07.ts",
          "generic": false
        },
        {
          "alias": "co2KgYear",
          "file": "src/features/energy/physics/engine/buildEnergyAuditResultV08.ts",
          "generic": false
        },
        {
          "alias": "co2KgYear",
          "file": "src/features/energy/physics/engine/generateEnergyResult.ts",
          "generic": false
        },
        {
          "alias": "co2KgYear",
          "file": "src/features/energy/physics/engine/runEnergySimulation.ts",
          "generic": false
        },
        {
          "alias": "totalCo2KgYear",
          "file": "src/features/energy/physics/calculators/primaryEnergyAndCo2V05.ts",
          "generic": false
        }
      ]
    },
    {
      "parameterId": "co2_emissions_specific",
      "usedInCode": true,
      "usedInCalculatorOrEngine": true,
      "domainSpecificUse": true,
      "status": "used",
      "hitCount": 4,
      "hits": [
        {
          "alias": "co2KgM2Year",
          "file": "src/features/energy/physics/calculators/classificationV06.ts",
          "generic": false
        },
        {
          "alias": "co2KgM2Year",
          "file": "src/features/energy/physics/engine/generateEnergyResult.ts",
          "generic": false
        },
        {
          "alias": "co2KgM2Year",
          "file": "src/features/energy/physics/engine/runEnergySimulation.ts",
          "generic": false
        },
        {
          "alias": "totalCo2KgM2Year",
          "file": "src/features/energy/physics/calculators/primaryEnergyAndCo2V05.ts",
          "generic": false
        }
      ]
    },
    {
      "parameterId": "calculation_confidence",
      "usedInCode": true,
      "usedInCalculatorOrEngine": true,
      "domainSpecificUse": false,
      "status": "generic_metadata",
      "hitCount": 32,
      "hits": [
        {
          "alias": "confidence",
          "file": "src/features/energy/physics/calculators/annualDemand.ts",
          "generic": true
        },
        {
          "alias": "confidence",
          "file": "src/features/energy/physics/calculators/auditScenariosV07.ts",
          "generic": true
        },
        {
          "alias": "confidence",
          "file": "src/features/energy/physics/calculators/classificationV06.ts",
          "generic": true
        },
        {
          "alias": "confidence",
          "file": "src/features/energy/physics/calculators/co2.ts",
          "generic": true
        },
        {
          "alias": "confidence",
          "file": "src/features/energy/physics/calculators/coolingSystemConsumption.ts",
          "generic": true
        },
        {
          "alias": "confidence",
          "file": "src/features/energy/physics/calculators/correctedTransmittance.ts",
          "generic": true
        },
        {
          "alias": "confidence",
          "file": "src/features/energy/physics/calculators/dhwSystemLosses.ts",
          "generic": true
        },
        {
          "alias": "confidence",
          "file": "src/features/energy/physics/calculators/envelopeV02.ts",
          "generic": true
        }
      ]
    },
    {
      "parameterId": "calculation_source",
      "usedInCode": true,
      "usedInCalculatorOrEngine": true,
      "domainSpecificUse": false,
      "status": "generic_metadata",
      "hitCount": 11,
      "hits": [
        {
          "alias": "source",
          "file": "src/features/energy/physics/calculators/annualDemand.ts",
          "generic": true
        },
        {
          "alias": "source",
          "file": "src/features/energy/physics/calculators/envelopeV02.ts",
          "generic": true
        },
        {
          "alias": "source",
          "file": "src/features/energy/physics/calculators/heatingDemandV02.ts",
          "generic": true
        },
        {
          "alias": "source",
          "file": "src/features/energy/physics/calculators/internalGains.ts",
          "generic": true
        },
        {
          "alias": "source",
          "file": "src/features/energy/physics/calculators/monthlyClimate.ts",
          "generic": true
        },
        {
          "alias": "source",
          "file": "src/features/energy/physics/calculators/resistance.ts",
          "generic": true
        },
        {
          "alias": "source",
          "file": "src/features/energy/physics/calculators/solarGains.ts",
          "generic": true
        },
        {
          "alias": "source",
          "file": "src/features/energy/physics/calculators/systemsLayerV04.ts",
          "generic": true
        }
      ]
    }
  ]
};
