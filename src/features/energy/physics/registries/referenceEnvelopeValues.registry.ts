export type ReferenceEnvelopeProfile = "residential_standard" | "residential_nzeb";

export type ReferenceEnvelopeElementType =
  | "external_walls"
  | "external_joinery"
  | "top_floor_under_roof_or_terrace"
  | "floor_over_unheated_basement"
  | "walls_adjacent_to_closed_joints"
  | "floor_over_exterior"
  | "slab_on_ground_above_cts"
  | "basement_floor_below_cts"
  | "basement_external_walls_below_cts"
  | "windows"
  | "roof"
  | "floor_over_unheated_basement_or_slab_on_ground";

export interface ReferenceEnvelopeValue {
  profile: ReferenceEnvelopeProfile;
  elementType: ReferenceEnvelopeElementType;
  labelRo: string;
  rMinM2KPerW: number;
  uMaxWPerM2K: number;
  source: "MC001-2022";
  sourceTable: "Tabel 2.2" | "Tabel 2.7";
  sourceStatus: "user_provided_reference_values";
  requiresOfficialVerification: true;
  implementationStatus: "ready_for_registry_but_not_official_certificate";
}

export const residentialStandardReferenceEnvelopeValues = [
  { profile: "residential_standard", elementType: "external_walls", labelRo: "Pereti exteriori, exclusiv suprafetele vitrate, inclusiv peretii adiacenti rosturilor deschise", rMinM2KPerW: 1.80, uMaxWPerM2K: 0.56, source: "MC001-2022", sourceTable: "Tabel 2.2", sourceStatus: "user_provided_reference_values", requiresOfficialVerification: true, implementationStatus: "ready_for_registry_but_not_official_certificate" },
  { profile: "residential_standard", elementType: "external_joinery", labelRo: "Tamplarie exterioara", rMinM2KPerW: 0.77, uMaxWPerM2K: 1.30, source: "MC001-2022", sourceTable: "Tabel 2.2", sourceStatus: "user_provided_reference_values", requiresOfficialVerification: true, implementationStatus: "ready_for_registry_but_not_official_certificate" },
  { profile: "residential_standard", elementType: "top_floor_under_roof_or_terrace", labelRo: "Plansee peste ultimul nivel, sub terase sau poduri", rMinM2KPerW: 5.00, uMaxWPerM2K: 0.20, source: "MC001-2022", sourceTable: "Tabel 2.2", sourceStatus: "user_provided_reference_values", requiresOfficialVerification: true, implementationStatus: "ready_for_registry_but_not_official_certificate" },
  { profile: "residential_standard", elementType: "floor_over_unheated_basement", labelRo: "Plansee peste subsoluri neincalzite si pivnite", rMinM2KPerW: 2.90, uMaxWPerM2K: 0.35, source: "MC001-2022", sourceTable: "Tabel 2.2", sourceStatus: "user_provided_reference_values", requiresOfficialVerification: true, implementationStatus: "ready_for_registry_but_not_official_certificate" },
  { profile: "residential_standard", elementType: "walls_adjacent_to_closed_joints", labelRo: "Pereti adiacenti rosturilor inchise", rMinM2KPerW: 1.10, uMaxWPerM2K: 0.90, source: "MC001-2022", sourceTable: "Tabel 2.2", sourceStatus: "user_provided_reference_values", requiresOfficialVerification: true, implementationStatus: "ready_for_registry_but_not_official_certificate" },
  { profile: "residential_standard", elementType: "floor_over_exterior", labelRo: "Plansee care delimiteaza cladirea la partea inferioara catre exterior", rMinM2KPerW: 4.50, uMaxWPerM2K: 0.22, source: "MC001-2022", sourceTable: "Tabel 2.2", sourceStatus: "user_provided_reference_values", requiresOfficialVerification: true, implementationStatus: "ready_for_registry_but_not_official_certificate" },
  { profile: "residential_standard", elementType: "slab_on_ground_above_cts", labelRo: "Placi pe sol peste cota terenului sistematizat", rMinM2KPerW: 4.50, uMaxWPerM2K: 0.22, source: "MC001-2022", sourceTable: "Tabel 2.2", sourceStatus: "user_provided_reference_values", requiresOfficialVerification: true, implementationStatus: "ready_for_registry_but_not_official_certificate" },
  { profile: "residential_standard", elementType: "basement_floor_below_cts", labelRo: "Placi la partea inferioara a demisolurilor sau subsolurilor incalzite sub CTS", rMinM2KPerW: 4.80, uMaxWPerM2K: 0.21, source: "MC001-2022", sourceTable: "Tabel 2.2", sourceStatus: "user_provided_reference_values", requiresOfficialVerification: true, implementationStatus: "ready_for_registry_but_not_official_certificate" },
  { profile: "residential_standard", elementType: "basement_external_walls_below_cts", labelRo: "Pereti exteriori sub CTS la demisoluri sau subsoluri incalzite", rMinM2KPerW: 2.90, uMaxWPerM2K: 0.35, source: "MC001-2022", sourceTable: "Tabel 2.2", sourceStatus: "user_provided_reference_values", requiresOfficialVerification: true, implementationStatus: "ready_for_registry_but_not_official_certificate" }
] as const satisfies readonly ReferenceEnvelopeValue[];

export const residentialNzebReferenceEnvelopeValues = [
  { profile: "residential_nzeb", elementType: "external_walls", labelRo: "Pereti exteriori", uMaxWPerM2K: 0.20, rMinM2KPerW: 5.00, source: "MC001-2022", sourceTable: "Tabel 2.7", sourceStatus: "user_provided_reference_values", requiresOfficialVerification: true, implementationStatus: "ready_for_registry_but_not_official_certificate" },
  { profile: "residential_nzeb", elementType: "windows", labelRo: "Ferestre, vitraj triplu", uMaxWPerM2K: 1.00, rMinM2KPerW: 1.00, source: "MC001-2022", sourceTable: "Tabel 2.7", sourceStatus: "user_provided_reference_values", requiresOfficialVerification: true, implementationStatus: "ready_for_registry_but_not_official_certificate" },
  { profile: "residential_nzeb", elementType: "roof", labelRo: "Acoperis", uMaxWPerM2K: 0.12, rMinM2KPerW: 8.33, source: "MC001-2022", sourceTable: "Tabel 2.7", sourceStatus: "user_provided_reference_values", requiresOfficialVerification: true, implementationStatus: "ready_for_registry_but_not_official_certificate" },
  { profile: "residential_nzeb", elementType: "floor_over_unheated_basement_or_slab_on_ground", labelRo: "Planseu peste subsol neincalzit / placa pe sol", uMaxWPerM2K: 0.33, rMinM2KPerW: 3.03, source: "MC001-2022", sourceTable: "Tabel 2.7", sourceStatus: "user_provided_reference_values", requiresOfficialVerification: true, implementationStatus: "ready_for_registry_but_not_official_certificate" }
] as const satisfies readonly ReferenceEnvelopeValue[];

export const referenceEnvelopeValues = [
  ...residentialStandardReferenceEnvelopeValues,
  ...residentialNzebReferenceEnvelopeValues
] as const;
