const commonSurface = { rsi: 0.13, rse: 0.04 };

function wallLayers(insulationM, masonryLambda = 0.6) {
  const layers = [{ materialId: "brick", thicknessM: 0.3, lambdaWmK: masonryLambda }];
  if (insulationM > 0) layers.push({ materialId: "eps", thicknessM: insulationM, lambdaWmK: 0.038 });
  return layers;
}

function insulatedLayer(materialId, thicknessM, lambdaWmK) {
  return [{ materialId, thicknessM, lambdaWmK }];
}

function homeFixture({
  id,
  expectedClass,
  area,
  volume,
  wallArea,
  roofArea,
  floorArea,
  windowArea,
  wallInsulationM,
  roofInsulationM,
  floorInsulationM,
  windowU,
  doorU = 1.7,
  ach,
  hdd,
  fuelCarrier,
  seasonalEfficiency,
  scop,
  primaryEnergyFactor,
  co2FactorKgKwh,
  constructionYear = 1980,
  location = "Cluj",
  thermalBridgePsi = 0.08,
  thermalBridgeLengthM = 20
}) {
  return {
    id,
    expectedClass,
    building: {
      type: "single_family_house",
      location,
      constructionYear,
      usefulAreaM2: area,
      heatedAreaM2: area,
      heatedVolumeM3: volume
    },
    climate: {
      heatingDegreeDays: hdd,
      source: "internal_estimate"
    },
    envelopeElements: [
      {
        id: "walls",
        category: "walls",
        areaM2: wallArea,
        rsi: commonSurface.rsi,
        rse: commonSurface.rse,
        layers: wallLayers(wallInsulationM),
        thermalBridges: [{ id: "wall_junctions", psiWmK: thermalBridgePsi, lengthM: thermalBridgeLengthM }]
      },
      {
        id: "roof",
        category: "roof",
        areaM2: roofArea,
        rsi: commonSurface.rsi,
        rse: commonSurface.rse,
        layers: roofInsulationM > 0
          ? insulatedLayer("mineral_wool", roofInsulationM, 0.039)
          : [{ materialId: "uninsulated_roof_equivalent", thicknessM: 0.04, lambdaWmK: 0.09 }]
      },
      {
        id: "floor",
        category: "floor",
        areaM2: floorArea,
        rsi: commonSurface.rsi,
        rse: commonSurface.rse,
        layers: floorInsulationM > 0
          ? insulatedLayer("xps", floorInsulationM, 0.035)
          : [{ materialId: "ground_slab_equivalent", thicknessM: 0.1, lambdaWmK: 0.2 }]
      },
      { id: "windows", category: "windows", areaM2: windowArea, uValueWm2K: windowU },
      { id: "doors", category: "doors", areaM2: 3, uValueWm2K: doorU }
    ],
    ventilation: { ach, heatRecoveryEfficiency: 0 },
    heatingSystem: {
      fuelCarrier,
      seasonalEfficiency,
      scop,
      confidence: "medium"
    },
    energyFactors: {
      primaryEnergyFactor,
      co2FactorKgKwh
    }
  };
}

export const saliceaDemoHome = {
  id: "DEMO_SALICEA_1964",
  expectedClass: "E",
  building: {
    type: "single_family_house",
    location: "Salicea / Cluj",
    constructionYear: 1964,
    usefulAreaM2: 64.8,
    heatedAreaM2: 64.8,
    heatedVolumeM3: 162
  },
  climate: {
    heatingDegreeDays: 3200,
    source: "internal_estimate"
  },
  envelopeElements: [
    {
      id: "external_walls",
      category: "walls",
      areaM2: 80,
      rsi: 0.13,
      rse: 0.04,
      layers: [
        { materialId: "brick_30cm", thicknessM: 0.3, lambdaWmK: 0.6 },
        { materialId: "eps_5cm", thicknessM: 0.05, lambdaWmK: 0.038 }
      ],
      thermalBridges: [{ id: "wall_junctions", psiWmK: 0.2, lengthM: 30 }]
    },
    { id: "attic_ceiling", category: "roof", areaM2: 65, uValueWm2K: 0.46 },
    { id: "ground_floor", category: "floor", areaM2: 65, uValueWm2K: 0.55 },
    { id: "windows", category: "windows", areaM2: 12, uValueWm2K: 2.3 },
    { id: "external_doors", category: "doors", areaM2: 3, uValueWm2K: 1.7 }
  ],
  ventilation: {
    ach: 0.7,
    heatRecoveryEfficiency: 0
  },
  heatingSystem: {
    fuelCarrier: "wood",
    seasonalEfficiency: 0.55,
    confidence: "medium"
  },
  energyFactors: {
    primaryEnergyFactor: 1.0,
    co2FactorKgKwh: 0.03
  }
};

export const criticalChainReferenceHomes = [
  homeFixture({
    id: "A_01_EFFICIENT_HEAT_PUMP",
    expectedClass: "A",
    area: 120,
    volume: 300,
    wallArea: 115,
    roofArea: 120,
    floorArea: 120,
    windowArea: 18,
    wallInsulationM: 0.2,
    roofInsulationM: 0.3,
    floorInsulationM: 0.15,
    windowU: 1,
    ach: 0.45,
    hdd: 3200,
    fuelCarrier: "natural_gas",
    seasonalEfficiency: 0.92,
    primaryEnergyFactor: 1.1,
    co2FactorKgKwh: 0.202,
    constructionYear: 2024
  }),
  homeFixture({
    id: "B_01_RENOVATED_CONDENSING_GAS",
    expectedClass: "B",
    area: 100,
    volume: 250,
    wallArea: 105,
    roofArea: 100,
    floorArea: 100,
    windowArea: 15,
    wallInsulationM: 0.15,
    roofInsulationM: 0.25,
    floorInsulationM: 0.1,
    windowU: 1.3,
    ach: 0.55,
    hdd: 3200,
    fuelCarrier: "natural_gas",
    seasonalEfficiency: 0.88,
    primaryEnergyFactor: 1.1,
    co2FactorKgKwh: 0.202,
    constructionYear: 1980
  }),
  homeFixture({
    id: "C_01_PARTIAL_RENOVATION_GAS",
    expectedClass: "C",
    area: 90,
    volume: 225,
    wallArea: 100,
    roofArea: 90,
    floorArea: 90,
    windowArea: 14,
    wallInsulationM: 0.1,
    roofInsulationM: 0.2,
    floorInsulationM: 0.06,
    windowU: 1.6,
    ach: 0.65,
    hdd: 3200,
    fuelCarrier: "natural_gas",
    seasonalEfficiency: 0.82,
    primaryEnergyFactor: 1.1,
    co2FactorKgKwh: 0.202,
    constructionYear: 1975
  }),
  {
    ...saliceaDemoHome,
    id: "D_01_SALICEA_LIGHT_RENOVATION",
    expectedClass: "D",
    energyFactors: {
      primaryEnergyFactor: 0.75,
      co2FactorKgKwh: 0.03
    }
  },
  homeFixture({
    id: "E_01_OLD_UNINSULATED_WOOD",
    expectedClass: "E",
    area: 80,
    volume: 200,
    wallArea: 90,
    roofArea: 80,
    floorArea: 80,
    windowArea: 13,
    wallInsulationM: 0,
    roofInsulationM: 0,
    floorInsulationM: 0,
    windowU: 2.8,
    ach: 0.9,
    hdd: 3200,
    fuelCarrier: "wood",
    seasonalEfficiency: 0.5,
    primaryEnergyFactor: 0.4,
    co2FactorKgKwh: 0.03,
    constructionYear: 1955
  }),
  homeFixture({
    id: "F_01_VERY_POOR_ENVELOPE",
    expectedClass: "F",
    area: 100,
    volume: 250,
    wallArea: 120,
    roofArea: 100,
    floorArea: 100,
    windowArea: 16,
    wallInsulationM: 0,
    roofInsulationM: 0,
    floorInsulationM: 0,
    windowU: 5,
    ach: 1.2,
    hdd: 3900,
    fuelCarrier: "wood",
    seasonalEfficiency: 0.45,
    primaryEnergyFactor: 0.35,
    co2FactorKgKwh: 0.03,
    constructionYear: 1940,
    location: "Brasov",
    thermalBridgePsi: 0.18,
    thermalBridgeLengthM: 35
  }),
  homeFixture({
    id: "G_01_EXTREME_COLD_LEAKY",
    expectedClass: "G",
    area: 120,
    volume: 300,
    wallArea: 145,
    roofArea: 120,
    floorArea: 120,
    windowArea: 20,
    wallInsulationM: 0,
    roofInsulationM: 0,
    floorInsulationM: 0,
    windowU: 5.2,
    ach: 1.35,
    hdd: 4400,
    fuelCarrier: "wood",
    seasonalEfficiency: 0.4,
    primaryEnergyFactor: 1.0,
    co2FactorKgKwh: 0.03,
    constructionYear: 1930,
    location: "Miercurea Ciuc",
    thermalBridgePsi: 0.22,
    thermalBridgeLengthM: 45
  })
];
