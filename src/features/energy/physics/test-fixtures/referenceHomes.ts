export const referenceHomes = [
  {
    id: "A_PLUS_01_NZEB_COMPACT",
    expectedClass: "A+",
    description: "Casă nouă foarte eficientă, compactă, izolație foarte bună, pompă de căldură, PV.",
    building: {
      type: "single_family_house",
      location: "Cluj",
      usefulAreaM2: 120,
      heatedVolumeM3: 300,
      constructionYear: 2024
    },
    envelope: {
      walls: { material: "brick", insulationCm: 25, uValueExpectedMax: 0.15 },
      roof: { insulationCm: 35, uValueExpectedMax: 0.12 },
      floor: { insulationCm: 20, uValueExpectedMax: 0.18 },
      windows: { type: "triple_low_e", uValueExpectedMax: 0.8 }
    },
    systems: {
      heating: "air_to_water_heat_pump",
      scop: 4.2,
      ventilation: "mechanical_with_heat_recovery",
      heatRecoveryEfficiency: 0.85,
      pvKw: 6
    },
    expectedBehavior: {
      htr: "very_low",
      hve: "very_low",
      heatingDemandKwhM2Year: [10, 35],
      finalEnergyKwhM2Year: [5, 30],
      primaryEnergyKwhM2Year: [0, 60]
    }
  },

  {
    id: "A_01_MODERN_EFFICIENT",
    expectedClass: "A",
    description: "Casă modernă eficientă, izolație bună, pompă de căldură, fără PV mare.",
    building: {
      type: "single_family_house",
      location: "Cluj",
      usefulAreaM2: 140,
      heatedVolumeM3: 350,
      constructionYear: 2020
    },
    envelope: {
      walls: { insulationCm: 20 },
      roof: { insulationCm: 30 },
      floor: { insulationCm: 15 },
      windows: { type: "triple_or_modern_double" }
    },
    systems: {
      heating: "air_to_water_heat_pump",
      scop: 3.6,
      ventilation: "natural_or_basic_mechanical"
    },
    expectedBehavior: {
      heatingDemandKwhM2Year: [25, 55],
      finalEnergyKwhM2Year: [15, 45],
      primaryEnergyKwhM2Year: [40, 90]
    }
  },

  {
    id: "B_01_RENOVATED_OLD_HOUSE",
    expectedClass: "B",
    description: "Casă veche renovată bine: pereți izolați, pod izolat, ferestre bune, centrală condensare.",
    building: {
      type: "single_family_house",
      location: "Cluj",
      usefulAreaM2: 100,
      heatedVolumeM3: 250,
      constructionYear: 1980
    },
    envelope: {
      walls: { material: "brick", insulationCm: 15 },
      roof: { insulationCm: 25 },
      floor: { insulationCm: 10 },
      windows: { type: "modern_double_low_e" }
    },
    systems: {
      heating: "gas_boiler_condensing",
      seasonalEfficiency: 0.92,
      ventilation: "natural"
    },
    expectedBehavior: {
      heatingDemandKwhM2Year: [45, 85],
      finalEnergyKwhM2Year: [55, 110],
      primaryEnergyKwhM2Year: [70, 140]
    }
  },

  {
    id: "C_01_PARTIALLY_RENOVATED",
    expectedClass: "C",
    description: "Casă parțial renovată: pereți izolați modest, pod mediu, termopan vechi, centrală gaz.",
    building: {
      type: "single_family_house",
      location: "Cluj",
      usefulAreaM2: 90,
      heatedVolumeM3: 225,
      constructionYear: 1975
    },
    envelope: {
      walls: { insulationCm: 10 },
      roof: { insulationCm: 15 },
      floor: { insulationCm: 5 },
      windows: { type: "old_double_glazing" }
    },
    systems: {
      heating: "gas_boiler_non_condensing",
      seasonalEfficiency: 0.8,
      ventilation: "natural"
    },
    expectedBehavior: {
      heatingDemandKwhM2Year: [75, 130],
      finalEnergyKwhM2Year: [100, 170],
      primaryEnergyKwhM2Year: [120, 210]
    }
  },

  {
    id: "D_01_OLD_HOUSE_LIGHT_RENOVATION",
    expectedClass: "D",
    description: "Casă veche cu izolație slabă, similară cu exemplul de certificat: cărămidă, 5 cm izolație, lemne/sobe.",
    building: {
      type: "single_family_house",
      location: "Sălicea",
      usefulAreaM2: 64.8,
      heatedVolumeM3: 162,
      constructionYear: 1964
    },
    envelope: {
      walls: { material: "brick_30cm", insulationCm: 5 },
      roof: { insulationCm: 5 },
      floor: { insulationCm: 0 },
      windows: { type: "old_double_glazing" }
    },
    systems: {
      heating: "wood_stove",
      seasonalEfficiency: 0.55,
      ventilation: "natural"
    },
    expectedBehavior: {
      heatingDemandKwhM2Year: [120, 210],
      finalEnergyKwhM2Year: [200, 380],
      primaryEnergyKwhM2Year: [220, 430]
    }
  },

  {
    id: "E_01_OLD_UNINSULATED",
    expectedClass: "E",
    description: "Casă veche aproape neizolată, termopan vechi sau geam simplu, centrală/sobă ineficientă.",
    building: {
      type: "single_family_house",
      location: "Cluj",
      usefulAreaM2: 80,
      heatedVolumeM3: 200,
      constructionYear: 1955
    },
    envelope: {
      walls: { material: "brick_30cm", insulationCm: 0 },
      roof: { insulationCm: 0 },
      floor: { insulationCm: 0 },
      windows: { type: "single_or_old_double" }
    },
    systems: {
      heating: "wood_stove",
      seasonalEfficiency: 0.5,
      ventilation: "natural_leaky"
    },
    expectedBehavior: {
      heatingDemandKwhM2Year: [180, 280],
      finalEnergyKwhM2Year: [300, 500],
      primaryEnergyKwhM2Year: [320, 580]
    }
  },

  {
    id: "F_01_VERY_POOR_ENVELOPE",
    expectedClass: "F",
    description: "Casă foarte slabă energetic: fără izolație, infiltrații mari, sistem ineficient.",
    building: {
      type: "single_family_house",
      location: "Brașov",
      usefulAreaM2: 100,
      heatedVolumeM3: 250,
      constructionYear: 1940
    },
    envelope: {
      walls: { material: "brick_or_stone", insulationCm: 0 },
      roof: { insulationCm: 0 },
      floor: { insulationCm: 0 },
      windows: { type: "single_glazing" }
    },
    systems: {
      heating: "old_wood_stove",
      seasonalEfficiency: 0.45,
      ventilation: "very_leaky_natural"
    },
    expectedBehavior: {
      heatingDemandKwhM2Year: [250, 380],
      finalEnergyKwhM2Year: [450, 700],
      primaryEnergyKwhM2Year: [480, 800]
    }
  },

  {
    id: "G_01_EXTREME_CASE",
    expectedClass: "G",
    description: "Caz extrem pentru test: anvelopă foarte slabă, geam simplu, pod neizolat, pardoseală rece, infiltrații mari.",
    building: {
      type: "single_family_house",
      location: "Miercurea Ciuc",
      usefulAreaM2: 120,
      heatedVolumeM3: 300,
      constructionYear: 1930
    },
    envelope: {
      walls: { material: "stone_or_solid_brick", insulationCm: 0 },
      roof: { insulationCm: 0 },
      floor: { insulationCm: 0 },
      windows: { type: "single_glazing_old_wood" }
    },
    systems: {
      heating: "old_wood_stove",
      seasonalEfficiency: 0.4,
      ventilation: "very_leaky_natural"
    },
    expectedBehavior: {
      heatingDemandKwhM2Year: [320, 500],
      finalEnergyKwhM2Year: [600, 900],
      primaryEnergyKwhM2Year: [650, 1000]
    }
  }
];
