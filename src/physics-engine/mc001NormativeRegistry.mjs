const SCHEMA_VERSION = "mc001-normative-registry-v1";
const R0_BZTU_SOURCE_PACK_CODE = "MC001_R0_BZTU_FORMULA_SOURCE_PACK";
const R2_HTR_SPINE_SOURCE_PACK_CODE =
  "MC001_R2_HTR_TRANSMISSION_SPINE_SOURCE_PACK";
const R2_MONTHLY_TRANSMISSION_SOURCE_PACK_CODE =
  "MC001_R2_MONTHLY_TRANSMISSION_SOURCE_PACK";
const SOURCE_PACK_TYPE = "formula_backed_normative_source_pack";
const R0_VERIFICATION_STATUS = "human_verified_from_official_pdf";
const R2_VERIFICATION_STATUS = "human_verified_from_official_pdf_visual_review";
const IMPLEMENTATION_STATUS = "registry_ready_not_calculator_ready";
const REGISTRY_STATUS = "pilot_registry_with_verified_bztu_source_pack";
const METHODOLOGY_CODE = "MC001";
const METHODOLOGY_VERSION = "2022";
const TECHNICAL_REGULATION_CODE = "Mc 001-2022";
const OFFICIAL_SOURCE_TYPE = "official_normative_document";
const BZTU_DEFAULT_CANDIDATE_CODE =
  "bztu_default_values_with_internal_or_solar_gains";
const C_ZTU_VE_CONSTANT_CODE = "MC001_2_24_C_ZTU_VE_RECOMMENDED";

const ALLOWED_STATUSES = new Set(["valid", "blocked", "found"]);
const ALLOWED_SEVERITIES = new Set(["info", "warning", "blocking"]);
const ALLOWED_BLOCKER_CODES = new Set([
  "blocked_invalid_registry",
  "blocked_invalid_schema_version",
  "blocked_invalid_methodology_metadata",
  "blocked_invalid_official_document_metadata",
  "blocked_invalid_source_pack",
  "blocked_unknown_source_pack_code",
  "blocked_invalid_source_scope",
  "blocked_invalid_verification_status",
  "blocked_invalid_implementation_status",
  "blocked_invalid_concept",
  "blocked_invalid_zone_type",
  "blocked_invalid_entry",
  "blocked_unknown_entry_code",
  "blocked_invalid_formula",
  "blocked_unknown_formula_code",
  "blocked_invalid_formula_code",
  "blocked_invalid_relation_code",
  "blocked_invalid_formula_unit",
  "blocked_invalid_source_locator",
  "blocked_invalid_constant",
  "blocked_invalid_figure",
  "blocked_invalid_distribution_rule",
  "blocked_invalid_applicability_rule",
  "blocked_invalid_default_value_candidate",
  "blocked_unknown_default_value_candidate_code",
  "blocked_default_numeric_values_not_available",
  "blocked_unsafe_private_content",
  "blocked_mutation_not_allowed"
]);

const SOURCE_PACK_CODES = new Set([
  R0_BZTU_SOURCE_PACK_CODE,
  R2_HTR_SPINE_SOURCE_PACK_CODE,
  R2_MONTHLY_TRANSMISSION_SOURCE_PACK_CODE
]);

const ENTRY_CODES = new Set([
  "MC001_CONCEPT_BZTU_CORRECTION_FACTOR",
  "MC001_ZONE_TYPE_ZTUI",
  "MC001_ZONE_TYPE_ZTUE",
  "MC001_FORMULA_2_21_ZTU_MONTHLY_TEMPERATURE",
  "MC001_FORMULA_2_22_BZTU_CORRECTION_FACTOR",
  "MC001_FORMULA_2_23_ZTU_TOTAL_HEAT_TRANSFER",
  "MC001_FORMULA_2_24_ZTU_TO_EXTERIOR_HEAT_TRANSFER",
  "MC001_CONSTANT_2_24_C_ZTU_VE_RECOMMENDED",
  "MC001_FIGURE_2_8_ZTC_ZTU_DISTRIBUTION_FACTOR",
  "MC001_DISTRIBUTION_RULE_MULTIPLE_ADJACENT_CONDITIONED_ZONES",
  "MC001_DISTRIBUTION_RULE_SINGLE_ADJACENT_CONDITIONED_ZONE",
  "MC001_RULE_BZTU_FORMULA_VALIDITY_LIMIT",
  "MC001_RULE_ADJACENT_UNCONDITIONED_ZONES_REQUIRE_THERMAL_BALANCES",
  "MC001_RULE_ZTU_TEMPERATURE_IGNORES_INTERNAL_AND_SOLAR_GAINS",
  "MC001_DEFAULT_CANDIDATE_BZTU_VALUES_WITH_GAINS",
  "MC001_CONCEPT_HTR_TRANSMISSION_COEFFICIENT",
  "MC001_FORMULA_2_12_HD_DIRECT_TRANSMISSION",
  "MC001_FORMULA_2_13_LINEAR_THERMAL_BRIDGE_PSI",
  "MC001_FORMULA_2_14_TRANSMISSION_HEAT_FLOW",
  "MC001_FORMULA_2_15_HTR_TOTAL_TRANSMISSION",
  "MC001_CONCEPT_MONTHLY_TRANSMISSION_TRANSFER",
  "MC001_FIGURE_2_10_TOTAL_HEAT_TRANSFER",
  "MC001_FIGURE_2_11_TOTAL_TRANSMISSION_HEAT_TRANSFER",
  "MC001_FIGURE_2_12_GLOBAL_TRANSMISSION_COEFFICIENT",
  "MC001_FORMULA_2_27_GLOBAL_TRANSMISSION_EXCLUDING_GROUND",
  "MC001_FORMULA_2_28_THERMAL_BRIDGE_GLOBAL_COEFFICIENT",
  "MC001_RULE_TRANSMISSION_POSITIVE_INTERIOR_TO_EXTERIOR",
  "MC001_RULE_MONTHLY_TRANSMISSION_SEPARATES_GROUND_CONTACT"
]);

const FORMULA_CODES = new Set([
  "MC001_2_21_ZTU_MONTHLY_TEMPERATURE",
  "MC001_2_22_BZTU_CORRECTION_FACTOR",
  "MC001_2_23_ZTU_TOTAL_HEAT_TRANSFER",
  "MC001_2_24_ZTU_TO_EXTERIOR_HEAT_TRANSFER",
  "MC001_2_12_HD_DIRECT_TRANSMISSION",
  "MC001_2_13_LINEAR_THERMAL_BRIDGE_PSI",
  "MC001_2_14_TRANSMISSION_HEAT_FLOW",
  "MC001_2_15_HTR_TOTAL_TRANSMISSION",
  "MC001_2_27_GLOBAL_TRANSMISSION_EXCLUDING_GROUND",
  "MC001_2_28_THERMAL_BRIDGE_GLOBAL_COEFFICIENT"
]);

const R0_FORMULA_CODES = new Set([
  "MC001_2_21_ZTU_MONTHLY_TEMPERATURE",
  "MC001_2_22_BZTU_CORRECTION_FACTOR",
  "MC001_2_23_ZTU_TOTAL_HEAT_TRANSFER",
  "MC001_2_24_ZTU_TO_EXTERIOR_HEAT_TRANSFER"
]);

const HTR_SPINE_FORMULA_CODES = new Set([
  "MC001_2_12_HD_DIRECT_TRANSMISSION",
  "MC001_2_13_LINEAR_THERMAL_BRIDGE_PSI",
  "MC001_2_14_TRANSMISSION_HEAT_FLOW",
  "MC001_2_15_HTR_TOTAL_TRANSMISSION"
]);

const MONTHLY_TRANSMISSION_FORMULA_CODES = new Set([
  "MC001_2_27_GLOBAL_TRANSMISSION_EXCLUDING_GROUND",
  "MC001_2_28_THERMAL_BRIDGE_GLOBAL_COEFFICIENT"
]);

const FORMULA_RELATION_BY_CODE = Object.freeze({
  MC001_2_21_ZTU_MONTHLY_TEMPERATURE: "2.21",
  MC001_2_22_BZTU_CORRECTION_FACTOR: "2.22",
  MC001_2_23_ZTU_TOTAL_HEAT_TRANSFER: "2.23",
  MC001_2_24_ZTU_TO_EXTERIOR_HEAT_TRANSFER: "2.24",
  MC001_2_12_HD_DIRECT_TRANSMISSION: "2.12",
  MC001_2_13_LINEAR_THERMAL_BRIDGE_PSI: "2.13",
  MC001_2_14_TRANSMISSION_HEAT_FLOW: "2.14",
  MC001_2_15_HTR_TOTAL_TRANSMISSION: "2.15",
  MC001_2_27_GLOBAL_TRANSMISSION_EXCLUDING_GROUND: "2.27",
  MC001_2_28_THERMAL_BRIDGE_GLOBAL_COEFFICIENT: "2.28"
});

const FORMULA_RESULT_UNIT_BY_CODE = Object.freeze({
  MC001_2_21_ZTU_MONTHLY_TEMPERATURE: "degC",
  MC001_2_22_BZTU_CORRECTION_FACTOR: "dimensionless",
  MC001_2_23_ZTU_TOTAL_HEAT_TRANSFER: "W/K",
  MC001_2_24_ZTU_TO_EXTERIOR_HEAT_TRANSFER: "W/K",
  MC001_2_12_HD_DIRECT_TRANSMISSION: "W/K",
  MC001_2_13_LINEAR_THERMAL_BRIDGE_PSI: "W/(m*K)",
  MC001_2_14_TRANSMISSION_HEAT_FLOW: "W",
  MC001_2_15_HTR_TOTAL_TRANSMISSION: "W/K",
  MC001_2_27_GLOBAL_TRANSMISSION_EXCLUDING_GROUND: "W/K",
  MC001_2_28_THERMAL_BRIDGE_GLOBAL_COEFFICIENT: "W/K"
});

const FORMULA_PAGE_BY_CODE = Object.freeze({
  MC001_2_21_ZTU_MONTHLY_TEMPERATURE: 94,
  MC001_2_22_BZTU_CORRECTION_FACTOR: 95,
  MC001_2_23_ZTU_TOTAL_HEAT_TRANSFER: 95,
  MC001_2_24_ZTU_TO_EXTERIOR_HEAT_TRANSFER: 96,
  MC001_2_12_HD_DIRECT_TRANSMISSION: 81,
  MC001_2_13_LINEAR_THERMAL_BRIDGE_PSI: 81,
  MC001_2_14_TRANSMISSION_HEAT_FLOW: 81,
  MC001_2_15_HTR_TOTAL_TRANSMISSION: 81,
  MC001_2_27_GLOBAL_TRANSMISSION_EXCLUDING_GROUND: 100,
  MC001_2_28_THERMAL_BRIDGE_GLOBAL_COEFFICIENT: 100
});

const FIGURE_CODES = new Set([
  "MC001_FIGURE_2_8_ZTC_ZTU_DISTRIBUTION_FACTOR",
  "MC001_FIGURE_2_10_TOTAL_HEAT_TRANSFER",
  "MC001_FIGURE_2_11_TOTAL_TRANSMISSION_HEAT_TRANSFER",
  "MC001_FIGURE_2_12_GLOBAL_TRANSMISSION_COEFFICIENT"
]);

const FIGURE_PAGE_BY_CODE = Object.freeze({
  MC001_FIGURE_2_10_TOTAL_HEAT_TRANSFER: 99,
  MC001_FIGURE_2_11_TOTAL_TRANSMISSION_HEAT_TRANSFER: 99,
  MC001_FIGURE_2_12_GLOBAL_TRANSMISSION_COEFFICIENT: 100
});

const FIGURE_NUMBER_BY_CODE = Object.freeze({
  MC001_FIGURE_2_10_TOTAL_HEAT_TRANSFER: "2.10",
  MC001_FIGURE_2_11_TOTAL_TRANSMISSION_HEAT_TRANSFER: "2.11",
  MC001_FIGURE_2_12_GLOBAL_TRANSMISSION_COEFFICIENT: "2.12"
});

const ZONE_TYPE_CODES = new Set(["ztui", "ztue"]);
const APPLICABILITY_RULE_CODES = new Set([
  "bztu_formula_validity_limit",
  "adjacent_unconditioned_zones_require_thermal_balances",
  "ztu_temperature_ignores_internal_and_solar_gains",
  "transmission_positive_from_interior_to_exterior",
  "monthly_transmission_separates_ground_contact"
]);
const R0_APPLICABILITY_RULE_CODES = new Set([
  "bztu_formula_validity_limit",
  "adjacent_unconditioned_zones_require_thermal_balances",
  "ztu_temperature_ignores_internal_and_solar_gains"
]);
const MONTHLY_APPLICABILITY_RULE_CODES = new Set([
  "transmission_positive_from_interior_to_exterior",
  "monthly_transmission_separates_ground_contact"
]);
const DISTRIBUTION_RULE_CODES = new Set([
  "multiple_adjacent_conditioned_zones",
  "single_adjacent_conditioned_zone"
]);
const SOURCE_SCOPE_PAGES = Object.freeze([81, 82, 94, 95, 96, 99, 100, 109]);

const PRIVATE_CONTENT_TERMS = Object.freeze([
  "@",
  "+407" + "22111222",
  "person" + "@example.com",
  "john",
  "doe",
  "strada",
  "owner",
  "private",
  "person",
  "record-" + "JohnDoe",
  "record-" + "001",
  "owner-" + "snapshot",
  "private-" + "note",
  "person-" + "name",
  "source" + "Context",
  "source" + "Trace",
  "source" + "Refs",
  "source" + "RecordId",
  "s" + "\u0103" + "licea"
]);

function deepFreeze(value) {
  if (value && typeof value === "object" && !Object.isFrozen(value)) {
    Object.freeze(value);
    for (const child of Object.values(value)) {
      deepFreeze(child);
    }
  }
  return value;
}

function clone(value) {
  return JSON.parse(JSON.stringify(value));
}

function cloneAndFreeze(value) {
  return deepFreeze(clone(value));
}

function isObject(value) {
  return value !== null && typeof value === "object" && !Array.isArray(value);
}

function hasRequiredString(value) {
  return typeof value === "string" && value.trim() !== "";
}

function blocker(code) {
  const safeCode = ALLOWED_BLOCKER_CODES.has(code)
    ? code
    : "blocked_invalid_registry";
  return Object.freeze({
    code: safeCode,
    severity: "blocking"
  });
}

function resultWithBlocker(code) {
  return Object.freeze({
    status: "blocked",
    blockers: Object.freeze([blocker(code)])
  });
}

function containsPrivateContent(value) {
  if (value === null || value === undefined) {
    return false;
  }
  if (typeof value === "string") {
    const normalized = value.toLowerCase();
    return PRIVATE_CONTENT_TERMS.some((term) => (
      normalized.includes(term.toLowerCase())
    ));
  }
  if (typeof value === "number" || typeof value === "boolean") {
    return false;
  }
  if (Array.isArray(value)) {
    return value.some(containsPrivateContent);
  }
  if (!isObject(value)) {
    return true;
  }
  return Object.entries(value).some(([key, child]) => (
    containsPrivateContent(key) || containsPrivateContent(child)
  ));
}

function arraysMatchExactly(actual, expected) {
  if (!Array.isArray(actual) || actual.length !== expected.length) {
    return false;
  }
  for (let index = 0; index < expected.length; index += 1) {
    if (actual[index] !== expected[index]) {
      return false;
    }
  }
  return true;
}

function setMatchesExactly(values, expectedSet) {
  if (!Array.isArray(values) || values.length !== expectedSet.size) {
    return false;
  }
  const seen = new Set();
  for (const value of values) {
    if (!expectedSet.has(value) || seen.has(value)) {
      return false;
    }
    seen.add(value);
  }
  return true;
}

function sourceLocatorLooksValid(locator, expectedPage = null) {
  if (!isObject(locator)) {
    return false;
  }
  if (expectedPage !== null && locator.page !== expectedPage) {
    return false;
  }
  if (typeof locator.page !== "number" || !SOURCE_SCOPE_PAGES.includes(locator.page)) {
    return false;
  }
  return (
    hasRequiredString(locator.subsection) ||
    hasRequiredString(locator.relation) ||
    hasRequiredString(locator.figure)
  );
}

function registrySourcePacks(registry) {
  return Array.isArray(registry?.sourcePacks) ? registry.sourcePacks : [];
}

function findSourcePackByCode(registry, sourcePackCode) {
  return registrySourcePacks(registry).find((sourcePack) => (
    sourcePack.sourcePackCode === sourcePackCode
  ));
}

function countRegistryEntries(registry) {
  const sourcePacks = registrySourcePacks(registry);
  const counts = {
    sourcePacks: sourcePacks.length,
    formulas: 0,
    constants: 0,
    concepts: 0,
    zoneTypes: 0,
    figures: 0,
    distributionRules: 0,
    applicabilityRules: 0,
    defaultValueCandidates: 0
  };
  for (const sourcePack of sourcePacks) {
    const formulas = Array.isArray(sourcePack?.formulas) ? sourcePack.formulas : [];
    const figures = Array.isArray(sourcePack?.figures) ? sourcePack.figures : [];
    counts.formulas += formulas.length;
    counts.concepts += isObject(sourcePack?.concept) ? 1 : 0;
    counts.zoneTypes += Array.isArray(sourcePack?.zoneTypes)
      ? sourcePack.zoneTypes.length
      : 0;
    counts.figures += figures.length;
    counts.applicabilityRules += Array.isArray(sourcePack?.applicabilityRules)
      ? sourcePack.applicabilityRules.length
      : 0;
    counts.defaultValueCandidates += Array.isArray(sourcePack?.defaultValueCandidates)
      ? sourcePack.defaultValueCandidates.length
      : 0;
    for (const formula of formulas) {
      counts.constants += Array.isArray(formula.constants) ? formula.constants.length : 0;
    }
    for (const figure of figures) {
      counts.distributionRules += Array.isArray(figure.rules) ? figure.rules.length : 0;
    }
  }
  return Object.freeze(counts);
}

function expectedCounts() {
  return Object.freeze({
    sourcePacks: 3,
    formulas: 10,
    constants: 1,
    concepts: 3,
    zoneTypes: 2,
    figures: 4,
    distributionRules: 2,
    applicabilityRules: 5,
    defaultValueCandidates: 1
  });
}

export const mc001NormativeRegistryV1 = deepFreeze({
  schemaVersion: SCHEMA_VERSION,
  isMc001NormativeRegistry: true,

  registryStatus: REGISTRY_STATUS,

  methodology: {
    methodologyCode: METHODOLOGY_CODE,
    methodologyVersion: METHODOLOGY_VERSION,
    technicalRegulationCode: TECHNICAL_REGULATION_CODE
  },

  officialDocument: {
    title: "Metodologie de calcul al performanței energetice a clădirilor, indicativ Mc 001-2022",
    publication: "Monitorul Oficial al României, Partea I, nr. 46 bis/17.I.2023",
    order: "Ordinul nr. 16/2023",
    sourceType: OFFICIAL_SOURCE_TYPE
  },

  sourcePacks: [
    {
      sourcePackCode: R0_BZTU_SOURCE_PACK_CODE,
      sourcePackType: SOURCE_PACK_TYPE,
      verificationStatus: R0_VERIFICATION_STATUS,
      implementationStatus: IMPLEMENTATION_STATUS,

      sourceScope: {
        chapter: "Capitolul 2. Anvelopa termică a clădirii",
        section: "2.6.2. Zonarea termică",
        subsection: "2.6.2.2. Factori de corecție și de distribuție",
        pagesVerified: [94, 95, 96, 109]
      },

      concept: {
        entryCode: "MC001_CONCEPT_BZTU_CORRECTION_FACTOR",
        entryType: "concept",
        conceptCode: "bztu_correction_factor",
        targetSymbol: "b_ztu,m",
        registryKind: "formula_backed_registry",
        name: "factor de corecție pentru zona neîncălzită / nerăcită / neclimatizată adiacentă",
        unit: "dimensionless",
        purpose: "corectează transferul termic dintre zona climatizată și zona neclimatizată adiacentă",
        appliesTo: [
          "casa_scarii",
          "subsol",
          "pod",
          "alte_spatii_neincalzite_sau_mai_putin_incalzite_adiacente"
        ],
        sourceLocator: {
          page: 95,
          subsection: "2.6.2.2"
        }
      },

      zoneTypes: [
        {
          entryCode: "MC001_ZONE_TYPE_ZTUI",
          entryType: "zone_type",
          zoneTypeCode: "ztui",
          label: "zonă neclimatizată interioară",
          boundaryRule: "frontiera pentru transmisia termică este considerată închiderea exterioară",
          applicability: [
            "proprietatile_termice_si_geometrice_ale_elementelor_exterioare_pot_fi_determinate_mai_precis",
            "aporturile_interne_si_solare_in_spatiul_adiacent_nu_sunt_foarte_mari"
          ],
          sourceLocator: {
            page: 94,
            subsection: "2.6.2.1"
          }
        },
        {
          entryCode: "MC001_ZONE_TYPE_ZTUE",
          entryType: "zone_type",
          zoneTypeCode: "ztue",
          label: "zonă neclimatizată exterioară",
          boundaryRule: "frontiera pentru transmisia căldurii este considerată închiderea interioară",
          applicability: [
            "tipul_de_zona_considerat_de_obicei_daca_nu_sunt_indeplinite_conditiile_pentru_ztui"
          ],
          sourceLocator: {
            page: 94,
            subsection: "2.6.2.1"
          }
        }
      ],

      formulas: [
        {
          entryCode: "MC001_FORMULA_2_21_ZTU_MONTHLY_TEMPERATURE",
          entryType: "formula",
          formulaCode: "MC001_2_21_ZTU_MONTHLY_TEMPERATURE",
          relationCode: "2.21",
          equationText: "theta_ztu,k,H/C,m = theta_int,calc,H/C,ztc,j,m - b_ztu,k,m * (theta_int,calc,H/C,ztc,j,m - theta_e,a,m)",
          result: {
            symbol: "theta_ztu,k,H/C,m",
            unit: "degC",
            meaning: "temperatura medie lunară în zona neîncălzită / nerăcită / neclimatizată"
          },
          sourceLocator: {
            page: 94,
            relation: "2.21",
            subsection: "2.6.2.1"
          }
        },
        {
          entryCode: "MC001_FORMULA_2_22_BZTU_CORRECTION_FACTOR",
          entryType: "formula",
          formulaCode: "MC001_2_22_BZTU_CORRECTION_FACTOR",
          relationCode: "2.22",
          equationText: "b_ztu,m = H_ztu,e,m / H_ztu,tot,m",
          result: {
            symbol: "b_ztu,m",
            unit: "dimensionless",
            meaning: "factorul de corecție pentru zona neîncălzită / nerăcită în luna m"
          },
          sourceLocator: {
            page: 95,
            relation: "2.22",
            subsection: "2.6.2.2"
          }
        },
        {
          entryCode: "MC001_FORMULA_2_23_ZTU_TOTAL_HEAT_TRANSFER",
          entryType: "formula",
          formulaCode: "MC001_2_23_ZTU_TOTAL_HEAT_TRANSFER",
          relationCode: "2.23",
          equationText: "H_ztu,tot,m = sum_j(H_ztc,j,ztu,m) + H_ztu,e,m",
          result: {
            symbol: "H_ztu,tot,m",
            unit: "W/K",
            meaning: "suma coeficienților de transfer termic dintre zona neclimatizată, zonele climatizate alăturate și exterior"
          },
          sourceLocator: {
            page: 95,
            relation: "2.23",
            subsection: "2.6.2.2"
          }
        },
        {
          entryCode: "MC001_FORMULA_2_24_ZTU_TO_EXTERIOR_HEAT_TRANSFER",
          entryType: "formula",
          formulaCode: "MC001_2_24_ZTU_TO_EXTERIOR_HEAT_TRANSFER",
          relationCode: "2.24",
          equationText: "H_ztu,e,k,m = (1 + c_ztu,ve) * H_tr,ue,k,m",
          result: {
            symbol: "H_ztu,e,k,m",
            unit: "W/K",
            meaning: "coeficientul de transfer termic între zona neclimatizată și exterior"
          },
          constants: [
            {
              entryCode: "MC001_CONSTANT_2_24_C_ZTU_VE_RECOMMENDED",
              entryType: "constant",
              constantCode: C_ZTU_VE_CONSTANT_CODE,
              symbol: "c_ztu,ve",
              recommendedValue: 0.5,
              unit: "dimensionless",
              meaning: "coeficient care exprimă efectul ventilării prin închiderea exterioară"
            }
          ],
          sourceLocator: {
            page: 96,
            relation: "2.24",
            subsection: "2.6.2.2"
          }
        }
      ],

      figures: [
        {
          entryCode: "MC001_FIGURE_2_8_ZTC_ZTU_DISTRIBUTION_FACTOR",
          entryType: "figure",
          figureCode: "MC001_FIGURE_2_8_ZTC_ZTU_DISTRIBUTION_FACTOR",
          title: "Determinarea factorului de distribuție",
          page: 95,
          status: "source_metadata_only",
          rules: [
            {
              entryCode: "MC001_DISTRIBUTION_RULE_MULTIPLE_ADJACENT_CONDITIONED_ZONES",
              entryType: "distribution_rule",
              caseCode: "multiple_adjacent_conditioned_zones",
              equationText: "F_ztc,i,ztu,m = H_ztc,i,ztu,m / sum_i(H_ztc,i,ztu,m)",
              unit: "dimensionless"
            },
            {
              entryCode: "MC001_DISTRIBUTION_RULE_SINGLE_ADJACENT_CONDITIONED_ZONE",
              entryType: "distribution_rule",
              caseCode: "single_adjacent_conditioned_zone",
              equationText: "F_ztc,ztu,m = 1",
              unit: "dimensionless"
            }
          ],
          sourceLocator: {
            page: 95,
            subsection: "2.6.2.2"
          }
        }
      ],

      applicabilityRules: [
        {
          entryCode: "MC001_RULE_BZTU_FORMULA_VALIDITY_LIMIT",
          entryType: "applicability_rule",
          ruleCode: "bztu_formula_validity_limit",
          ruleText: "Formula de calcul pentru b este valabilă doar dacă zona neîncălzită nu este adiacentă altei zone neîncălzite.",
          sourceLocator: {
            page: 95,
            subsection: "2.6.2.2"
          }
        },
        {
          entryCode: "MC001_RULE_ADJACENT_UNCONDITIONED_ZONES_REQUIRE_THERMAL_BALANCES",
          entryType: "applicability_rule",
          ruleCode: "adjacent_unconditioned_zones_require_thermal_balances",
          ruleText: "În cazul zonelor climatizate aflate în contact cu zone neîncălzite sau mai puțin încălzite sunt necesare bilanțuri termice pentru toate zonele.",
          sourceLocator: {
            page: 95,
            subsection: "2.6.2.1"
          }
        },
        {
          entryCode: "MC001_RULE_ZTU_TEMPERATURE_IGNORES_INTERNAL_AND_SOLAR_GAINS",
          entryType: "applicability_rule",
          ruleCode: "ztu_temperature_ignores_internal_and_solar_gains",
          ruleText: "Temperatura din zona neclimatizată nu ia în considerare efectul aporturilor interne sau solare; acestea se atribuie zonelor climatizate alăturate.",
          sourceLocator: {
            page: 95,
            subsection: "2.6.2.1"
          }
        }
      ],

      defaultValueCandidates: [
        {
          entryCode: "MC001_DEFAULT_CANDIDATE_BZTU_VALUES_WITH_GAINS",
          entryType: "default_value_candidate",
          candidateCode: BZTU_DEFAULT_CANDIDATE_CODE,
          status: "mentioned_but_not_extracted_as_numeric_table",
          page: 109,
          note: "Metodologia spune că pot fi utilizate valori prin lipsă ale bztu,m în funcție de tipul și/sau dimensiunea spațiului neclimatizat adiacent, incluzând efectul aporturilor.",
          implementationDecision: "Nu se introduc valori implicite până nu este identificat și verificat un tabel numeric explicit sau o sursă normativă exactă pentru aceste valori.",
          numericDefaultsAvailable: false,
          sourceLocator: {
            page: 109,
            subsection: "2.7.3"
          }
        }
      ]
    },
    {
      sourcePackCode: R2_HTR_SPINE_SOURCE_PACK_CODE,
      sourcePackType: SOURCE_PACK_TYPE,
      verificationStatus: R2_VERIFICATION_STATUS,
      implementationStatus: IMPLEMENTATION_STATUS,

      sourceScope: {
        chapter: "Capitolul 2. Anvelopa termică a clădirii",
        section: "2.4. Rezistențe termice",
        pagesVerified: [81, 82],
        relationsVerified: ["2.12", "2.13", "2.14", "2.15"]
      },

      concept: {
        entryCode: "MC001_CONCEPT_HTR_TRANSMISSION_COEFFICIENT",
        entryType: "concept",
        conceptCode: "htr_transmission_coefficient",
        targetSymbol: "H_tr",
        registryKind: "formula_backed_registry",
        name: "coeficient de transfer termic prin transmisie",
        unit: "W/K",
        purpose: "definește coeficientul total de transfer termic prin transmisie al clădirii"
      },

      formulas: [
        {
          entryCode: "MC001_FORMULA_2_12_HD_DIRECT_TRANSMISSION",
          entryType: "formula",
          formulaCode: "MC001_2_12_HD_DIRECT_TRANSMISSION",
          relationCode: "2.12",
          equationText: "H_d = sum_j(U'_j * A_j)",
          result: {
            symbol: "H_d",
            unit: "W/K",
            meaning: "coeficientul de transfer termic direct între spațiile încălzite/răcite și exterior"
          },
          sourceLocator: {
            page: 81,
            relation: "2.12"
          }
        },
        {
          entryCode: "MC001_FORMULA_2_13_LINEAR_THERMAL_BRIDGE_PSI",
          entryType: "formula",
          formulaCode: "MC001_2_13_LINEAR_THERMAL_BRIDGE_PSI",
          relationCode: "2.13",
          equationText: "psi_j = (1 / l_j) * (L_2D - sum_j(U_j * A_j))",
          result: {
            symbol: "psi_j",
            unit: "W/(m*K)",
            meaning: "transmitanța termică liniară a punții termice liniare j"
          },
          sourceLocator: {
            page: 81,
            relation: "2.13"
          }
        },
        {
          entryCode: "MC001_FORMULA_2_14_TRANSMISSION_HEAT_FLOW",
          entryType: "formula",
          formulaCode: "MC001_2_14_TRANSMISSION_HEAT_FLOW",
          relationCode: "2.14",
          equationText: "Phi_tr = H_tr * (theta_i - theta_e)",
          result: {
            symbol: "Phi_tr",
            unit: "W",
            meaning: "fluxul termic disipat prin transmisie prin anvelopa clădirii"
          },
          sourceLocator: {
            page: 81,
            relation: "2.14"
          }
        },
        {
          entryCode: "MC001_FORMULA_2_15_HTR_TOTAL_TRANSMISSION",
          entryType: "formula",
          formulaCode: "MC001_2_15_HTR_TOTAL_TRANSMISSION",
          relationCode: "2.15",
          equationText: "H_tr = H_d + H_g + H_u + H_a",
          result: {
            symbol: "H_tr",
            unit: "W/K",
            meaning: "coeficientul total de transfer termic prin transmisie"
          },
          components: [
            {
              symbol: "H_d",
              meaning: "coeficient de transfer termic direct",
              unit: "W/K"
            },
            {
              symbol: "H_g",
              meaning: "coeficient de transfer termic prin sol",
              unit: "W/K"
            },
            {
              symbol: "H_u",
              meaning: "coeficient de transfer termic prin spații neîncălzite",
              unit: "W/K"
            },
            {
              symbol: "H_a",
              meaning: "coeficient de transfer termic către clădiri adiacente",
              unit: "W/K"
            }
          ],
          sourceLocator: {
            page: 81,
            relation: "2.15"
          }
        }
      ]
    },
    {
      sourcePackCode: R2_MONTHLY_TRANSMISSION_SOURCE_PACK_CODE,
      sourcePackType: SOURCE_PACK_TYPE,
      verificationStatus: R2_VERIFICATION_STATUS,
      implementationStatus: IMPLEMENTATION_STATUS,

      sourceScope: {
        chapter: "Capitolul 2. Anvelopa termică a clădirii",
        section: "2.7.1. Transferul termic total",
        subsection: "2.7.1.1. Transferul termic prin transmisie",
        pagesVerified: [99, 100],
        figuresVerified: ["2.10", "2.11", "2.12"],
        relationsVerified: ["2.27", "2.28"]
      },

      concept: {
        entryCode: "MC001_CONCEPT_MONTHLY_TRANSMISSION_TRANSFER",
        entryType: "concept",
        conceptCode: "monthly_transmission_transfer",
        registryKind: "formula_backed_registry",
        name: "transfer termic lunar prin transmisie",
        unit: "kWh",
        purpose: "definește transferul termic lunar prin transmisie pentru încălzire/răcire"
      },

      figures: [
        {
          entryCode: "MC001_FIGURE_2_10_TOTAL_HEAT_TRANSFER",
          entryType: "figure",
          figureCode: "MC001_FIGURE_2_10_TOTAL_HEAT_TRANSFER",
          title: "Transferul total de căldură",
          page: 99,
          status: "source_metadata_only",
          sourceLocator: {
            page: 99,
            figure: "2.10",
            subsection: "2.7.1"
          }
        },
        {
          entryCode: "MC001_FIGURE_2_11_TOTAL_TRANSMISSION_HEAT_TRANSFER",
          entryType: "figure",
          figureCode: "MC001_FIGURE_2_11_TOTAL_TRANSMISSION_HEAT_TRANSFER",
          title: "Transferul termic total prin transmisie",
          page: 99,
          status: "source_metadata_only",
          note: "Figure 2.11 contains monthly heating/cooling transmission transfer equations. R2 stores figure metadata only; calculator implementation is out of scope.",
          sourceLocator: {
            page: 99,
            figure: "2.11",
            subsection: "2.7.1.1"
          }
        },
        {
          entryCode: "MC001_FIGURE_2_12_GLOBAL_TRANSMISSION_COEFFICIENT",
          entryType: "figure",
          figureCode: "MC001_FIGURE_2_12_GLOBAL_TRANSMISSION_COEFFICIENT",
          title: "Coeficientul global de transfer termic prin transmisie",
          page: 100,
          status: "source_metadata_only",
          note: "Figure 2.12 contains element-level transmission coefficient cases. R2 stores figure metadata only; calculator implementation is out of scope.",
          sourceLocator: {
            page: 100,
            figure: "2.12",
            subsection: "2.7.1.1"
          }
        }
      ],

      formulas: [
        {
          entryCode: "MC001_FORMULA_2_27_GLOBAL_TRANSMISSION_EXCLUDING_GROUND",
          entryType: "formula",
          formulaCode: "MC001_2_27_GLOBAL_TRANSMISSION_EXCLUDING_GROUND",
          relationCode: "2.27",
          equationText: "H_H/C;tr(excl.gf);ztc;m = sum_k(H_H/C;el,k;m) + H_tr;tb;ztc",
          notationAliases: [
            "H_H/C;tr(excl.grnd flr);ztc;m",
            "H_H/C;tr(excl.gf);ztc;m"
          ],
          result: {
            symbol: "H_H/C;tr(excl.gf);ztc;m",
            unit: "W/K",
            meaning: "coeficientul de transfer termic global prin transmisie pentru încălzire/răcire, pentru toate elementele fără legătură cu solul"
          },
          sourceLocator: {
            page: 100,
            relation: "2.27",
            subsection: "2.7.1.1"
          }
        },
        {
          entryCode: "MC001_FORMULA_2_28_THERMAL_BRIDGE_GLOBAL_COEFFICIENT",
          entryType: "formula",
          formulaCode: "MC001_2_28_THERMAL_BRIDGE_GLOBAL_COEFFICIENT",
          relationCode: "2.28",
          equationText: "H_tr;tb;zt = sum_k(l_tb;k * Psi_tb;k)",
          result: {
            symbol: "H_tr;tb;zt",
            unit: "W/K",
            meaning: "coeficientul de transfer termic global pentru punțile termice, pentru zona termică zt"
          },
          terms: [
            {
              symbol: "l_tb;k",
              meaning: "lungimea unei punți termice liniare k",
              unit: "m"
            },
            {
              symbol: "Psi_tb;k",
              meaning: "transmitanța termică a unei punți termice liniare k",
              unit: "W/(m*K)"
            }
          ],
          sourceLocator: {
            page: 100,
            relation: "2.28",
            subsection: "2.7.1.1"
          }
        }
      ],

      applicabilityRules: [
        {
          entryCode: "MC001_RULE_TRANSMISSION_POSITIVE_INTERIOR_TO_EXTERIOR",
          entryType: "applicability_rule",
          ruleCode: "transmission_positive_from_interior_to_exterior",
          ruleText: "Prin convenție, transferul de căldură este pozitiv de la interior către exterior; dacă transferul are semn negativ, căldura este adăugată zonei ca aport de căldură.",
          sourceLocator: {
            page: 100,
            subsection: "2.7.1.1"
          }
        },
        {
          entryCode: "MC001_RULE_MONTHLY_TRANSMISSION_SEPARATES_GROUND_CONTACT",
          entryType: "applicability_rule",
          ruleCode: "monthly_transmission_separates_ground_contact",
          ruleText: "Transferul prin transmisie se detaliază separat pentru elementele fără legătură cu solul și pentru elementele în legătură cu solul.",
          sourceLocator: {
            page: 99,
            subsection: "2.7.1.1"
          }
        }
      ]
    }
  ]
});

function validateMethodology(registry) {
  return (
    registry?.methodology?.methodologyCode === METHODOLOGY_CODE &&
    registry.methodology.methodologyVersion === METHODOLOGY_VERSION &&
    registry.methodology.technicalRegulationCode === TECHNICAL_REGULATION_CODE
  );
}

function validateOfficialDocument(registry) {
  return (
    hasRequiredString(registry?.officialDocument?.title) &&
    registry.officialDocument.publication ===
      "Monitorul Oficial al României, Partea I, nr. 46 bis/17.I.2023" &&
    registry.officialDocument.order === "Ordinul nr. 16/2023" &&
    registry.officialDocument.sourceType === OFFICIAL_SOURCE_TYPE
  );
}

function validateBztuSourceScope(sourceScope) {
  return (
    isObject(sourceScope) &&
    sourceScope.chapter === "Capitolul 2. Anvelopa termică a clădirii" &&
    sourceScope.section === "2.6.2. Zonarea termică" &&
    sourceScope.subsection === "2.6.2.2. Factori de corecție și de distribuție" &&
    arraysMatchExactly(sourceScope.pagesVerified, [94, 95, 96, 109])
  );
}

function validateHtrSpineSourceScope(sourceScope) {
  return (
    isObject(sourceScope) &&
    sourceScope.chapter === "Capitolul 2. Anvelopa termică a clădirii" &&
    sourceScope.section === "2.4. Rezistențe termice" &&
    arraysMatchExactly(sourceScope.pagesVerified, [81, 82]) &&
    arraysMatchExactly(sourceScope.relationsVerified, ["2.12", "2.13", "2.14", "2.15"])
  );
}

function validateMonthlyTransmissionSourceScope(sourceScope) {
  return (
    isObject(sourceScope) &&
    sourceScope.chapter === "Capitolul 2. Anvelopa termică a clădirii" &&
    sourceScope.section === "2.7.1. Transferul termic total" &&
    sourceScope.subsection === "2.7.1.1. Transferul termic prin transmisie" &&
    arraysMatchExactly(sourceScope.pagesVerified, [99, 100]) &&
    arraysMatchExactly(sourceScope.figuresVerified, ["2.10", "2.11", "2.12"]) &&
    arraysMatchExactly(sourceScope.relationsVerified, ["2.27", "2.28"])
  );
}

function validateBztuConcept(concept) {
  return (
    isObject(concept) &&
    concept.entryCode === "MC001_CONCEPT_BZTU_CORRECTION_FACTOR" &&
    concept.entryType === "concept" &&
    concept.conceptCode === "bztu_correction_factor" &&
    concept.targetSymbol === "b_ztu,m" &&
    concept.registryKind === "formula_backed_registry" &&
    concept.unit === "dimensionless" &&
    sourceLocatorLooksValid(concept.sourceLocator, 95)
  );
}

function validateHtrSpineConcept(concept) {
  return (
    isObject(concept) &&
    concept.entryCode === "MC001_CONCEPT_HTR_TRANSMISSION_COEFFICIENT" &&
    concept.entryType === "concept" &&
    concept.conceptCode === "htr_transmission_coefficient" &&
    concept.targetSymbol === "H_tr" &&
    concept.registryKind === "formula_backed_registry" &&
    concept.unit === "W/K" &&
    hasRequiredString(concept.name) &&
    hasRequiredString(concept.purpose)
  );
}

function validateMonthlyTransmissionConcept(concept) {
  return (
    isObject(concept) &&
    concept.entryCode === "MC001_CONCEPT_MONTHLY_TRANSMISSION_TRANSFER" &&
    concept.entryType === "concept" &&
    concept.conceptCode === "monthly_transmission_transfer" &&
    concept.registryKind === "formula_backed_registry" &&
    concept.unit === "kWh" &&
    hasRequiredString(concept.name) &&
    hasRequiredString(concept.purpose)
  );
}

function validateZoneTypes(zoneTypes) {
  if (!Array.isArray(zoneTypes) || zoneTypes.length !== 2) {
    return false;
  }
  if (!setMatchesExactly(zoneTypes.map((entry) => entry.zoneTypeCode), ZONE_TYPE_CODES)) {
    return false;
  }
  for (const entry of zoneTypes) {
    if (
      !ENTRY_CODES.has(entry.entryCode) ||
      entry.entryType !== "zone_type" ||
      !sourceLocatorLooksValid(entry.sourceLocator, 94)
    ) {
      return false;
    }
  }
  return true;
}

function validateConstant(constant) {
  return (
    isObject(constant) &&
    constant.entryCode === "MC001_CONSTANT_2_24_C_ZTU_VE_RECOMMENDED" &&
    constant.entryType === "constant" &&
    constant.constantCode === C_ZTU_VE_CONSTANT_CODE &&
    constant.symbol === "c_ztu,ve" &&
    constant.recommendedValue === 0.5 &&
    constant.unit === "dimensionless"
  );
}

function validateFormulaBase(formula) {
  const relationCode = FORMULA_RELATION_BY_CODE[formula?.formulaCode];
  return (
    isObject(formula) &&
    ENTRY_CODES.has(formula.entryCode) &&
    formula.entryType === "formula" &&
    FORMULA_CODES.has(formula.formulaCode) &&
    relationCode === formula.relationCode &&
    FORMULA_RESULT_UNIT_BY_CODE[formula.formulaCode] === formula.result?.unit &&
    !Object.hasOwn(formula, "value") &&
    !Object.hasOwn(formula, "values") &&
    !Object.hasOwn(formula, "defaultValue") &&
    !Object.hasOwn(formula, "defaultValues") &&
    !hasForbiddenNumericValueField(formula) &&
    hasRequiredString(formula.equationText) &&
    sourceLocatorLooksValid(formula.sourceLocator, FORMULA_PAGE_BY_CODE[formula.formulaCode]) &&
    formula.sourceLocator.relation === formula.relationCode
  );
}

function validateBztuFormulas(formulas) {
  if (!Array.isArray(formulas) || formulas.length !== 4) {
    return false;
  }
  if (!setMatchesExactly(formulas.map((entry) => entry.formulaCode), R0_FORMULA_CODES)) {
    return false;
  }
  for (const formula of formulas) {
    if (!validateFormulaBase(formula)) {
      return false;
    }
    if (formula.formulaCode === "MC001_2_24_ZTU_TO_EXTERIOR_HEAT_TRANSFER") {
      if (
        !Array.isArray(formula.constants) ||
        formula.constants.length !== 1 ||
        !validateConstant(formula.constants[0])
      ) {
        return false;
      }
    } else if (Object.hasOwn(formula, "constants")) {
      return false;
    }
  }
  return true;
}

function validateHtrSpineComponents(components) {
  const expected = [
    ["H_d", "W/K"],
    ["H_g", "W/K"],
    ["H_u", "W/K"],
    ["H_a", "W/K"]
  ];
  if (!Array.isArray(components) || components.length !== expected.length) {
    return false;
  }
  for (let index = 0; index < expected.length; index += 1) {
    if (
      components[index].symbol !== expected[index][0] ||
      components[index].unit !== expected[index][1] ||
      !hasRequiredString(components[index].meaning)
    ) {
      return false;
    }
  }
  return true;
}

function validateHtrSpineFormulas(formulas) {
  if (!Array.isArray(formulas) || formulas.length !== 4) {
    return false;
  }
  if (!setMatchesExactly(
    formulas.map((entry) => entry.formulaCode),
    HTR_SPINE_FORMULA_CODES
  )) {
    return false;
  }
  for (const formula of formulas) {
    if (!validateFormulaBase(formula)) {
      return false;
    }
    if (formula.formulaCode === "MC001_2_15_HTR_TOTAL_TRANSMISSION") {
      if (!validateHtrSpineComponents(formula.components)) {
        return false;
      }
    } else if (Object.hasOwn(formula, "components")) {
      return false;
    }
  }
  return true;
}

function validateMonthlyFormulaAliases(formula) {
  return (
    formula.formulaCode === "MC001_2_27_GLOBAL_TRANSMISSION_EXCLUDING_GROUND" &&
    arraysMatchExactly(formula.notationAliases, [
      "H_H/C;tr(excl.grnd flr);ztc;m",
      "H_H/C;tr(excl.gf);ztc;m"
    ])
  );
}

function validateMonthlyFormulaTerms(formula) {
  if (formula.formulaCode !== "MC001_2_28_THERMAL_BRIDGE_GLOBAL_COEFFICIENT") {
    return false;
  }
  if (formula.equationText.toLowerCase().includes("chi")) {
    return false;
  }
  const expected = [
    ["l_tb;k", "m"],
    ["Psi_tb;k", "W/(m*K)"]
  ];
  if (!Array.isArray(formula.terms) || formula.terms.length !== expected.length) {
    return false;
  }
  for (let index = 0; index < expected.length; index += 1) {
    if (
      formula.terms[index].symbol !== expected[index][0] ||
      formula.terms[index].unit !== expected[index][1] ||
      !hasRequiredString(formula.terms[index].meaning)
    ) {
      return false;
    }
  }
  return true;
}

function validateMonthlyTransmissionFormulas(formulas) {
  if (!Array.isArray(formulas) || formulas.length !== 2) {
    return false;
  }
  if (!setMatchesExactly(
    formulas.map((entry) => entry.formulaCode),
    MONTHLY_TRANSMISSION_FORMULA_CODES
  )) {
    return false;
  }
  for (const formula of formulas) {
    if (!validateFormulaBase(formula)) {
      return false;
    }
    if (formula.formulaCode === "MC001_2_27_GLOBAL_TRANSMISSION_EXCLUDING_GROUND") {
      if (!validateMonthlyFormulaAliases(formula) || Object.hasOwn(formula, "terms")) {
        return false;
      }
    }
    if (formula.formulaCode === "MC001_2_28_THERMAL_BRIDGE_GLOBAL_COEFFICIENT") {
      if (
        !validateMonthlyFormulaTerms(formula) ||
        Object.hasOwn(formula, "notationAliases")
      ) {
        return false;
      }
    }
  }
  return true;
}

function validateBztuFigures(figures) {
  if (!Array.isArray(figures) || figures.length !== 1) {
    return false;
  }
  const figure = figures[0];
  if (
    !ENTRY_CODES.has(figure.entryCode) ||
    figure.entryType !== "figure" ||
    figure.figureCode !== "MC001_FIGURE_2_8_ZTC_ZTU_DISTRIBUTION_FACTOR" ||
    !FIGURE_CODES.has(figure.figureCode) ||
    figure.page !== 95 ||
    figure.status !== "source_metadata_only" ||
    !sourceLocatorLooksValid(figure.sourceLocator, 95) ||
    !Array.isArray(figure.rules) ||
    figure.rules.length !== 2 ||
    !setMatchesExactly(figure.rules.map((entry) => entry.caseCode), DISTRIBUTION_RULE_CODES)
  ) {
    return false;
  }
  for (const rule of figure.rules) {
    if (
      !ENTRY_CODES.has(rule.entryCode) ||
      rule.entryType !== "distribution_rule" ||
      rule.unit !== "dimensionless" ||
      !hasRequiredString(rule.equationText)
    ) {
      return false;
    }
  }
  return true;
}

function validateMonthlyTransmissionFigures(figures) {
  if (!Array.isArray(figures) || figures.length !== 3) {
    return false;
  }
  if (!setMatchesExactly(figures.map((entry) => entry.figureCode), new Set([
    "MC001_FIGURE_2_10_TOTAL_HEAT_TRANSFER",
    "MC001_FIGURE_2_11_TOTAL_TRANSMISSION_HEAT_TRANSFER",
    "MC001_FIGURE_2_12_GLOBAL_TRANSMISSION_COEFFICIENT"
  ]))) {
    return false;
  }
  for (const figure of figures) {
    if (
      !ENTRY_CODES.has(figure.entryCode) ||
      figure.entryType !== "figure" ||
      !FIGURE_CODES.has(figure.figureCode) ||
      FIGURE_PAGE_BY_CODE[figure.figureCode] !== figure.page ||
      figure.status !== "source_metadata_only" ||
      !sourceLocatorLooksValid(figure.sourceLocator, figure.page) ||
      figure.sourceLocator.figure !== FIGURE_NUMBER_BY_CODE[figure.figureCode]
    ) {
      return false;
    }
  }
  return true;
}

function validateApplicabilityRules(rules, expectedSet) {
  if (!Array.isArray(rules) || rules.length !== expectedSet.size) {
    return false;
  }
  if (!setMatchesExactly(rules.map((entry) => entry.ruleCode), expectedSet)) {
    return false;
  }
  for (const rule of rules) {
    if (
      !ENTRY_CODES.has(rule.entryCode) ||
      rule.entryType !== "applicability_rule" ||
      !APPLICABILITY_RULE_CODES.has(rule.ruleCode) ||
      !hasRequiredString(rule.ruleText) ||
      !sourceLocatorLooksValid(rule.sourceLocator)
    ) {
      return false;
    }
  }
  return true;
}

function validateDefaultValueCandidates(candidates) {
  if (!Array.isArray(candidates) || candidates.length !== 1) {
    return false;
  }
  const candidate = candidates[0];
  return (
    candidate.entryCode === "MC001_DEFAULT_CANDIDATE_BZTU_VALUES_WITH_GAINS" &&
    candidate.entryType === "default_value_candidate" &&
    candidate.candidateCode === BZTU_DEFAULT_CANDIDATE_CODE &&
    candidate.status === "mentioned_but_not_extracted_as_numeric_table" &&
    candidate.page === 109 &&
    candidate.numericDefaultsAvailable === false &&
    !Object.hasOwn(candidate, "value") &&
    !Object.hasOwn(candidate, "values") &&
    !Object.hasOwn(candidate, "defaultValue") &&
    !Object.hasOwn(candidate, "defaultValues") &&
    !Object.hasOwn(candidate, "numericValue") &&
    !Object.hasOwn(candidate, "amount") &&
    sourceLocatorLooksValid(candidate.sourceLocator, 109)
  );
}

function hasForbiddenNumericValueField(value) {
  if (value === null || typeof value !== "object") {
    return false;
  }
  if (Array.isArray(value)) {
    return value.some(hasForbiddenNumericValueField);
  }
  for (const [key, child] of Object.entries(value)) {
    if (["value", "values", "defaultValue", "defaultValues", "numericValue", "amount"].includes(key)) {
      return true;
    }
    if (hasForbiddenNumericValueField(child)) {
      return true;
    }
  }
  return false;
}

function sourcePackBaseIssue(sourcePack, verificationStatus) {
  if (!isObject(sourcePack) || !SOURCE_PACK_CODES.has(sourcePack.sourcePackCode)) {
    return "blocked_invalid_source_pack";
  }
  if (sourcePack.sourcePackType !== SOURCE_PACK_TYPE) {
    return "blocked_invalid_source_pack";
  }
  if (sourcePack.verificationStatus !== verificationStatus) {
    return "blocked_invalid_verification_status";
  }
  if (sourcePack.implementationStatus !== IMPLEMENTATION_STATUS) {
    return "blocked_invalid_implementation_status";
  }
  return null;
}

function bztuSourcePackIssue(sourcePack) {
  const baseIssue = sourcePackBaseIssue(sourcePack, R0_VERIFICATION_STATUS);
  if (baseIssue) {
    return baseIssue;
  }
  if (!validateBztuSourceScope(sourcePack.sourceScope)) {
    return "blocked_invalid_source_scope";
  }
  if (!validateBztuConcept(sourcePack.concept)) {
    return "blocked_invalid_concept";
  }
  if (!validateZoneTypes(sourcePack.zoneTypes)) {
    return "blocked_invalid_zone_type";
  }
  if (!validateBztuFormulas(sourcePack.formulas)) {
    return "blocked_invalid_formula";
  }
  if (!validateBztuFigures(sourcePack.figures)) {
    return "blocked_invalid_figure";
  }
  if (!validateApplicabilityRules(sourcePack.applicabilityRules, R0_APPLICABILITY_RULE_CODES)) {
    return "blocked_invalid_applicability_rule";
  }
  if (!validateDefaultValueCandidates(sourcePack.defaultValueCandidates)) {
    return "blocked_invalid_default_value_candidate";
  }
  return null;
}

function htrSpineSourcePackIssue(sourcePack) {
  const baseIssue = sourcePackBaseIssue(sourcePack, R2_VERIFICATION_STATUS);
  if (baseIssue) {
    return baseIssue;
  }
  if (!validateHtrSpineSourceScope(sourcePack.sourceScope)) {
    return "blocked_invalid_source_scope";
  }
  if (!validateHtrSpineConcept(sourcePack.concept)) {
    return "blocked_invalid_concept";
  }
  if (!validateHtrSpineFormulas(sourcePack.formulas)) {
    return "blocked_invalid_formula";
  }
  if (
    Object.hasOwn(sourcePack, "figures") ||
    Object.hasOwn(sourcePack, "zoneTypes") ||
    Object.hasOwn(sourcePack, "defaultValueCandidates") ||
    Object.hasOwn(sourcePack, "applicabilityRules")
  ) {
    return "blocked_invalid_source_pack";
  }
  return null;
}

function monthlyTransmissionSourcePackIssue(sourcePack) {
  const baseIssue = sourcePackBaseIssue(sourcePack, R2_VERIFICATION_STATUS);
  if (baseIssue) {
    return baseIssue;
  }
  if (!validateMonthlyTransmissionSourceScope(sourcePack.sourceScope)) {
    return "blocked_invalid_source_scope";
  }
  if (!validateMonthlyTransmissionConcept(sourcePack.concept)) {
    return "blocked_invalid_concept";
  }
  if (!validateMonthlyTransmissionFigures(sourcePack.figures)) {
    return "blocked_invalid_figure";
  }
  if (!validateMonthlyTransmissionFormulas(sourcePack.formulas)) {
    return "blocked_invalid_formula";
  }
  if (!validateApplicabilityRules(sourcePack.applicabilityRules, MONTHLY_APPLICABILITY_RULE_CODES)) {
    return "blocked_invalid_applicability_rule";
  }
  if (
    Object.hasOwn(sourcePack, "zoneTypes") ||
    Object.hasOwn(sourcePack, "defaultValueCandidates")
  ) {
    return "blocked_invalid_source_pack";
  }
  return null;
}

function sourcePackIssue(sourcePack) {
  if (!isObject(sourcePack) || !SOURCE_PACK_CODES.has(sourcePack.sourcePackCode)) {
    return "blocked_invalid_source_pack";
  }
  if (sourcePack.sourcePackCode === R0_BZTU_SOURCE_PACK_CODE) {
    return bztuSourcePackIssue(sourcePack);
  }
  if (sourcePack.sourcePackCode === R2_HTR_SPINE_SOURCE_PACK_CODE) {
    return htrSpineSourcePackIssue(sourcePack);
  }
  if (sourcePack.sourcePackCode === R2_MONTHLY_TRANSMISSION_SOURCE_PACK_CODE) {
    return monthlyTransmissionSourcePackIssue(sourcePack);
  }
  return "blocked_invalid_source_pack";
}

function validationCountsMatch(counts) {
  const expected = expectedCounts();
  return Object.keys(expected).every((key) => counts[key] === expected[key]);
}

function allEntriesFromSourcePack(sourcePack) {
  const entries = [];
  if (isObject(sourcePack?.concept)) {
    entries.push(sourcePack.concept);
  }
  if (Array.isArray(sourcePack?.zoneTypes)) {
    entries.push(...sourcePack.zoneTypes);
  }
  if (Array.isArray(sourcePack?.formulas)) {
    for (const formula of sourcePack.formulas) {
      entries.push(formula);
      if (Array.isArray(formula.constants)) {
        entries.push(...formula.constants);
      }
    }
  }
  if (Array.isArray(sourcePack?.figures)) {
    for (const figure of sourcePack.figures) {
      entries.push(figure);
      if (Array.isArray(figure.rules)) {
        entries.push(...figure.rules);
      }
    }
  }
  if (Array.isArray(sourcePack?.applicabilityRules)) {
    entries.push(...sourcePack.applicabilityRules);
  }
  if (Array.isArray(sourcePack?.defaultValueCandidates)) {
    entries.push(...sourcePack.defaultValueCandidates);
  }
  return entries;
}

function allEntriesFromRegistry(registry) {
  return registrySourcePacks(registry).flatMap(allEntriesFromSourcePack);
}

function allFormulasFromRegistry(registry) {
  return registrySourcePacks(registry).flatMap((sourcePack) => (
    Array.isArray(sourcePack?.formulas) ? sourcePack.formulas : []
  ));
}

function sourcePackIsValid(sourcePack) {
  return sourcePackIssue(sourcePack) === null;
}

function registryIsValid(registry) {
  return validateMc001NormativeRegistry(registry).status === "valid";
}

export function getMc001NormativeRegistry(options = {}) {
  void options;
  return cloneAndFreeze(mc001NormativeRegistryV1);
}

export function validateMc001NormativeRegistry(registry, options = {}) {
  void options;

  if (!isObject(registry)) {
    return Object.freeze({
      status: "blocked",
      blockers: Object.freeze([blocker("blocked_invalid_registry")]),
      counts: expectedCounts()
    });
  }
  if (containsPrivateContent(registry)) {
    return Object.freeze({
      status: "blocked",
      blockers: Object.freeze([blocker("blocked_unsafe_private_content")]),
      counts: expectedCounts()
    });
  }
  if (
    registry.schemaVersion !== SCHEMA_VERSION ||
    registry.isMc001NormativeRegistry !== true ||
    registry.registryStatus !== REGISTRY_STATUS
  ) {
    return Object.freeze({
      status: "blocked",
      blockers: Object.freeze([blocker("blocked_invalid_schema_version")]),
      counts: expectedCounts()
    });
  }
  if (!validateMethodology(registry)) {
    return Object.freeze({
      status: "blocked",
      blockers: Object.freeze([blocker("blocked_invalid_methodology_metadata")]),
      counts: expectedCounts()
    });
  }
  if (!validateOfficialDocument(registry)) {
    return Object.freeze({
      status: "blocked",
      blockers: Object.freeze([blocker("blocked_invalid_official_document_metadata")]),
      counts: expectedCounts()
    });
  }
  if (
    !Array.isArray(registry.sourcePacks) ||
    !setMatchesExactly(
      registry.sourcePacks.map((sourcePack) => sourcePack.sourcePackCode),
      SOURCE_PACK_CODES
    )
  ) {
    return Object.freeze({
      status: "blocked",
      blockers: Object.freeze([blocker("blocked_invalid_source_pack")]),
      counts: countRegistryEntries(registry)
    });
  }

  for (const sourcePack of registry.sourcePacks) {
    const issue = sourcePackIssue(sourcePack);
    if (issue) {
      return Object.freeze({
        status: "blocked",
        blockers: Object.freeze([blocker(issue)]),
        counts: countRegistryEntries(registry)
      });
    }
  }
  const counts = countRegistryEntries(registry);
  if (!validationCountsMatch(counts)) {
    return Object.freeze({
      status: "blocked",
      blockers: Object.freeze([blocker("blocked_invalid_registry")]),
      counts
    });
  }
  return Object.freeze({
    status: "valid",
    blockers: Object.freeze([]),
    counts
  });
}

export function getMc001NormativeSourcePackByCode(sourcePackCode, options = {}) {
  void options;
  if (!SOURCE_PACK_CODES.has(sourcePackCode)) {
    return resultWithBlocker("blocked_unknown_source_pack_code");
  }
  if (!registryIsValid(mc001NormativeRegistryV1)) {
    return resultWithBlocker("blocked_invalid_registry");
  }
  const sourcePack = findSourcePackByCode(mc001NormativeRegistryV1, sourcePackCode);
  if (!sourcePack || !sourcePackIsValid(sourcePack)) {
    return resultWithBlocker("blocked_invalid_source_pack");
  }
  return Object.freeze({
    status: "found",
    sourcePack: cloneAndFreeze(sourcePack)
  });
}

export function getMc001NormativeEntryByCode(entryCode, options = {}) {
  void options;
  if (!ENTRY_CODES.has(entryCode)) {
    return resultWithBlocker("blocked_unknown_entry_code");
  }
  if (!registryIsValid(mc001NormativeRegistryV1)) {
    return resultWithBlocker("blocked_invalid_registry");
  }
  const entry = allEntriesFromRegistry(mc001NormativeRegistryV1).find((candidate) => (
    candidate.entryCode === entryCode
  ));
  if (!entry) {
    return resultWithBlocker("blocked_unknown_entry_code");
  }
  return Object.freeze({
    status: "found",
    entry: cloneAndFreeze(entry)
  });
}

export function getMc001NormativeFormulaByCode(formulaCode, options = {}) {
  void options;
  if (!FORMULA_CODES.has(formulaCode)) {
    return resultWithBlocker("blocked_unknown_formula_code");
  }
  if (!registryIsValid(mc001NormativeRegistryV1)) {
    return resultWithBlocker("blocked_invalid_registry");
  }
  const formula = allFormulasFromRegistry(mc001NormativeRegistryV1).find((candidate) => (
    candidate.formulaCode === formulaCode
  ));
  if (!formula) {
    return resultWithBlocker("blocked_unknown_formula_code");
  }
  return Object.freeze({
    status: "found",
    formula: cloneAndFreeze(formula)
  });
}

export function getMc001NormativeDefaultValueCandidateByCode(
  candidateCode,
  options = {}
) {
  void options;
  if (candidateCode !== BZTU_DEFAULT_CANDIDATE_CODE) {
    return resultWithBlocker("blocked_unknown_default_value_candidate_code");
  }
  if (!registryIsValid(mc001NormativeRegistryV1)) {
    return resultWithBlocker("blocked_invalid_registry");
  }
  const sourcePack = findSourcePackByCode(
    mc001NormativeRegistryV1,
    R0_BZTU_SOURCE_PACK_CODE
  );
  if (!sourcePack || !sourcePackIsValid(sourcePack)) {
    return resultWithBlocker("blocked_invalid_source_pack");
  }
  const candidate = sourcePack.defaultValueCandidates[0];
  if (!validateDefaultValueCandidates(sourcePack.defaultValueCandidates)) {
    return resultWithBlocker("blocked_invalid_default_value_candidate");
  }
  return Object.freeze({
    status: "found",
    defaultValueCandidate: cloneAndFreeze(candidate)
  });
}

void ALLOWED_STATUSES;
void ALLOWED_SEVERITIES;
