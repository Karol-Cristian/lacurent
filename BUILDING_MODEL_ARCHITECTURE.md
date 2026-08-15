# Production Building Model Architecture Baseline

Milestone: P6_PRODUCTION_BUILDING_MODEL_ARCHITECTURE_BASELINE

Source baseline: `origin/main` @ `66a2afd8b2c106b68c7fbf137d088182a990382f`

This document is the permanent baseline for the LaCurent production building model. It inventories engineering concepts, field ownership, dependencies, visible UI fields, legacy compatibility and the target architecture. It does not introduce new physics and does not modify Chapter 2 or Chapter 3 formulas.

## Core Rule

Primitive Inputs -> Providers -> Building DNA -> Physics Engine -> Engineering Runtime -> Reports -> UI.

Every production concept exists once, has exactly one owner and is extended through this baseline instead of parallel abstractions.

## Domain Inventory

| Domain | Concept | Owner | Source of truth | Lifecycle |
| --- | --- | --- | --- | --- |
| project_identity | Building Project | Versioned Building Backend | building_platform_projects | mutable metadata with immutable current-version pointers |
| local_project_session | Local-first editable project session | Browser session model | loaded canonical project payload plus local draft state | in-memory until explicit draft/permanent save |
| building_dna | Canonical Building DNA | Building DNA Resolver | building_dna_versions.complete_building_dna_json | immutable once saved as a version |
| location_and_climate | Location and climate | Romanian Climate Provider | source-backed climate registries and explicit manual zone override | provider-resolved at Building DNA creation; persisted inside Building DNA |
| geometry | Thermal building geometry | Building DNA Resolver | explicit user geometry plus documented resolver-derived seeds | editable primitive inputs normalized into Building DNA |
| envelope_and_materials | Envelope, assemblies and material catalogue | Building Platform Catalogue plus Building DNA Resolver | catalogue selections resolved into Building DNA assemblies and explicit envelope elements | catalogue-resolved inputs; physics engine calculates R, U and H coefficients |
| technical_systems | Chapter 3 technical systems | Technical Systems schema and Chapter 3 adapter | buildingDna.technicalSystems | explicit user engineering input; persisted with Building DNA |
| physics_engine | MC001 physics engine | Physics Engine | explicit adapter input | runtime calculation only; persisted as immutable analysis version output |
| technical_workspace_report | Engineering notebook and technical report | Technical Report Builder | Building DNA plus persisted engine output | generated model persisted as report version; presentation regenerated from structure |
| legacy_compatibility | Legacy saved-house compatibility | Legacy migration boundary | legacy houses/analyses/analysis_answers/report_snapshots until migrated | read and migration boundary only |

## Field Category Counts

| Category | Field count |
| --- | --- |
| primitive_user_input | 39 |
| provider_resolved | 8 |
| derived_engineering_value | 5 |
| physics_runtime_state | 4 |
| output | 4 |
| legacy | 6 |

## Field Inventory

| Field | Category | Owner | Source of truth | UI recommendation | Production usage |
| --- | --- | --- | --- | --- | --- |
| project.name | primitive_user_input | Versioned Building Backend | building_platform_projects.project_name | remain_editable | metadata_only_no_physics_effect |
| building.identity.type | primitive_user_input | Building DNA Resolver | buildingDna.building.buildingType | remain_editable | affects typology and Table 2.15 internal gains when applicable |
| building.identity.use_category | primitive_user_input | Building DNA Resolver | buildingDna.building.useCategory or buildingDna.building.internalGainsCategoryId | remain_editable | drives_source_backed_internal_gains_when_useful_area_and_monthly_duration_are_available |
| building.identity.construction_period | primitive_user_input | Building DNA Resolver | buildingDna.building.constructionPeriod | remain_editable | typology_input_may_affect_catalogue_selection |
| location.locality_id | primitive_user_input | User through Building DNA Resolver | buildingDna.building.location.localityId | remain_editable | drives station, monthly temperature, humidity, design climate and available solar source rows |
| location.county | primitive_user_input | User through Building DNA Resolver | buildingDna.building.location.countyName | remain_editable | metadata_traceability_currently_no_physics_effect |
| location.free_text_city | primitive_user_input | User through Building DNA Resolver | buildingDna.building.location.city | remain_editable | fallback_for_certified_or_name_lookup_not_primary_locality_source |
| climate.zone | primitive_user_input | User until source-backed locality-zone mapping is acquired | buildingDna.climate.climateZone | remain_editable | zone_dependent_thresholds_only_currently |
| climate.wind_zone | primitive_user_input | User until source-backed locality-wind mapping is acquired | buildingDna.climate.windZone | remain_editable | metadata_and_future_runtime_dependency |
| climate.manual_override | primitive_user_input | User/auditor through Building DNA Resolver | buildingDna.climate.manualOverride | remain_editable | validation_and_traceability |
| climate.override_reason | primitive_user_input | User/auditor through Building DNA Resolver | buildingDna.climate.overrideReason | remain_editable | required_when_manual_override_true |
| provider.climate_station | provider_resolved | Romanian Climate Provider | MC001/6-2013 locality-station registry | read_only | source_backed_climate_dataset_key |
| provider.monthly_exterior_temperature | provider_resolved | Romanian Climate Provider | Mc001/6-2013 Tabel II.1 | read_only | drives_transmission_ventilation_QHnd_QCnd |
| provider.monthly_relative_humidity | provider_resolved | Romanian Climate Provider | Mc001/6-2013 Tabel II.2 | read_only | available_not_currently_core_chapter2_useful_demand_driver |
| provider.winter_design_temperature | provider_resolved | Romanian Climate Provider | Mc001/6-2013 winter design tables | read_only | source_backed_design_metadata_current_runtime_reported |
| provider.summer_design_temperature | provider_resolved | Romanian Climate Provider | Mc001/6-2013 summer design tables | read_only | source_backed_design_metadata_current_runtime_reported |
| provider.monthly_solar_irradiation_source_rows | provider_resolved | Romanian Climate Provider | Mc001/1-2-3/2006 Anexa A.9.6 | read_only | source_dataset_available_Qsol_preprocessing_bounded |
| provider.production_climate_profile | provider_resolved | Romanian Production Climate Registry | Climate Provider plus bounded dependency registry | read_only | transparent_climate_profile_for_production |
| geometry.useful_floor_area | primitive_user_input | User through Building DNA Resolver | buildingDna.geometry.usefulFloorAreaM2 and buildingSpecificParameters.usefulFloorAreaM2 | remain_editable | geometry_seed_and_internal_gains_area |
| geometry.number_of_floors | primitive_user_input | User through Building DNA Resolver | buildingDna.buildingSpecificParameters.numberOfFloors | remain_editable | currently_traceability_metadata_not_direct_engine_driver |
| geometry.average_room_height | primitive_user_input | User through Building DNA Resolver | buildingDna.buildingSpecificParameters.averageRoomHeightM | remain_editable | currently_traceability_metadata_not_direct_engine_driver_when_volume_entered |
| geometry.heated_volume | primitive_user_input | User through Building DNA Resolver | buildingDna.buildingSpecificParameters.heatedVolumeM3 | remain_editable | affects_ventilation_Qve_when_ventilation_ach_present |
| geometry.exterior_wall_area | primitive_user_input | User through Building DNA Resolver | buildingDna.envelopeElements[exterior-walls].area | remain_editable | affects_Hd_Htr_Qtr_QHnd |
| geometry.roof_area | primitive_user_input | User through Building DNA Resolver | buildingDna.envelopeElements[roof].area | remain_editable | affects_Hd_Htr_Qtr_QHnd |
| geometry.ground_floor_area | primitive_user_input | User through Building DNA Resolver | buildingDna.envelopeElements[ground-floor].area | remain_editable | affects_Hg_or_boundary_component_Htr |
| geometry.attic_ceiling_area | primitive_user_input | User through Building DNA Resolver | buildingDna.envelopeElements[attic-ceiling].area | remain_editable | affects_Hu_or_Hd_boundary_component |
| geometry.window_area | primitive_user_input | User through Building DNA Resolver | buildingDna.envelopeElements[windows].area | remain_editable | affects_Hd_Htr_and_solar_gain_paths_when_available |
| geometry.door_area | primitive_user_input | User through Building DNA Resolver | buildingDna.envelopeElements[front-door].area | remain_editable | affects_Hd_Htr_Qtr |
| geometry.adjacent_wall_area | primitive_user_input | User through Building DNA Resolver | buildingDna.envelopeElements[adjacent-wall].area | remain_editable | affects_boundary_corrected_transmission_when_positive |
| orientation.main | primitive_user_input | User through Building DNA Resolver | buildingDna.buildingSpecificParameters.mainOrientation | remain_editable | solar_orientation_fallback_when_profile_supports_orientation_gains |
| orientation.window | primitive_user_input | User through Building DNA Resolver | buildingDna.buildingSpecificParameters.windowOrientation | remain_editable | affects_QHgn_QHnd_QCnd_when_Qsol_preprocessed_or_explicit_profile_available |
| envelope.structural_system | primitive_user_input | User and Building Typology Engine | buildingDna.building.structuralSystem | remain_editable | affects_assembly_selection |
| envelope.wall_material | primitive_user_input | User and Building Typology Engine | assisted answer wallMaterial plus resolved Building DNA assembly | remain_editable | affects_layers_R_U_Hd_Htr |
| envelope.roof_type | primitive_user_input | User through Building DNA Resolver | answers.context.attic then envelopeElements[attic-ceiling].boundaryType | remain_editable | affects_boundary_type_and_correction |
| envelope.floor_type | primitive_user_input | User through Building DNA Resolver | answers.context.basement then envelopeElements[ground-floor].boundaryType | remain_editable | affects_boundary_type_and_correction |
| envelope.window_type | primitive_user_input | User and Building Typology Engine | resolved Building DNA window assembly | remain_editable | affects_window_U_Hd_Htr |
| ventilation.type | primitive_user_input | User through Building DNA Resolver | buildingDna.buildingSpecificParameters.ventilationType | remain_editable | currently_metadata_unless_ach_and_volume_are_present |
| ventilation.ach | primitive_user_input | User through Building DNA Resolver | buildingDna.buildingSpecificParameters.ventilationAch | remain_editable | affects_Qve_when_heated_volume_present |
| derived.ventilation_airflow | derived_engineering_value | Building DNA Resolver | monthlyProfilesWithGeometryVentilation | calculated | direct_input_to_Hve_Qve |
| derived.monthly_profiles | derived_engineering_value | Building DNA Resolver | buildingDna.monthlyProfiles | read_only | primary_monthly_runtime_input |
| derived.internal_gains_table_2_15 | derived_engineering_value | Building DNA Resolver with Physics Engine source-formula helper | buildingDna.monthlyProfiles[*].heatGains.internalGains | read_only | source_backed_internal_gains_for_supported_Table_2_15_categories |
| derived.envelope_elements | derived_engineering_value | Building DNA Resolver | buildingDna.envelopeElements | calculated | primary_envelope_transmission_input |
| provider.assembly_catalogue_selection | provider_resolved | Building Platform Catalogue and Typology Engine | catalogue entries copied into Building DNA | read_only | material_layer_input_to_R_U_calculation |
| derived.thermal_bridges | derived_engineering_value | Building DNA Resolver | buildingDna.thermalBridges | calculated | affects_Hd_Htr |
| renovation.wall_insulation | primitive_user_input | User through Renovation Interventions and Typology Engine | buildingDna.renovationInterventions and assemblies[exterior_wall].layers | remain_editable | affects_R_U_Hd_Htr_QHnd |
| renovation.window_replacement | primitive_user_input | User through Renovation Interventions | buildingDna.renovationInterventions | remain_editable | traceability; assembly effect is via window_type |
| technical_systems.heating | primitive_user_input | User through Technical Systems schema | buildingDna.technicalSystems.heating | remain_editable | drives_Chapter3_heating_system_energy |
| technical_systems.cooling | primitive_user_input | User through Technical Systems schema | buildingDna.technicalSystems.cooling | remain_editable | drives_Chapter3_cooling_system_energy |
| technical_systems.ventilation_ahu | primitive_user_input | User through Technical Systems schema | buildingDna.technicalSystems.ventilationAhu | remain_editable | drives_Chapter3_AHU_auxiliary_energy |
| technical_systems.dhw | primitive_user_input | User through Technical Systems schema | buildingDna.technicalSystems.domesticHotWater | remain_editable | drives_Chapter3_DHW_system_energy |
| technical_systems.pcm_storage | primitive_user_input | User through Technical Systems schema | buildingDna.technicalSystems.coolingStoragePcm | remain_editable | drives_PCM_relations_3_111_3_113_and_storage_chain |
| technical_systems.lighting_boundary | primitive_user_input | User through Technical Systems schema | buildingDna.technicalSystems.lighting | remain_editable | explicit_input_boundary_only_SR_EN_15193_1_pending |
| runtime.assembly_u_values | physics_runtime_state | Physics Engine | calculateMc001EnvelopeAssemblyUValueExplicit output | read_only | intermediate_traceable_engine_result |
| runtime.hd_hg_hu_ha_htr | physics_runtime_state | Physics Engine | calculateMc001EnvelopeTransmissionCoefficientExplicit output | read_only | core_Chapter2_transfer_runtime_state |
| runtime.chapter2_monthly_useful_demand | physics_runtime_state | Physics Engine | calculateMc001Chapter2UsefulDemandExplicit output | read_only | core_Chapter2_output_and_Chapter3_input |
| runtime.chapter3_installation_energy | physics_runtime_state | Physics Engine | calculateMc001Chapter3IntegratedRuntime output | read_only | active_only_when_technicalSystems_enabled |
| output.annual_qhnd_qcnd | output | Physics Engine output persisted by Versioned Backend | building_platform_analysis_versions annual_qhnd/annual_qcnd | read_only | primary_product_result |
| output.chapter3_annual_summary | output | Physics Engine output persisted by Versioned Backend | building_platform_analysis_versions.complete_engine_output_json | read_only | primary_installation_result_when_available |
| output.report_model | output | Technical Report Builder | building_platform_report_versions.structured_report_model_json | read_only | authoritative_report_data_not_rendered_html_only |
| output.fingerprints | output | Versioned Building Backend | buildingPlatformFingerprints.mjs | read_only | persistence_integrity_and_duplicate_protection |
| legacy.climate_profile_id | legacy | Legacy compatibility boundary | hidden compatibility input or legacy saved Building DNA | hidden | demo_and_compatibility_only_not_primary_climate_path |
| legacy.synthetic_demo_profile | legacy | Demo fixture boundary | romanianClimateProfiles.mjs explicit demo profile | hidden | demo_only |
| legacy.length_width_geometry_inputs | legacy | Legacy/simplified UI compatibility | none in production UI; historical payloads only | hidden | removed_from_production_ui_no_runtime_effect |
| legacy.thermal_mass_class_ui | legacy | Legacy/simplified UI compatibility | none in production UI; historical payloads only | hidden | removed_from_production_ui_no_runtime_effect |
| legacy.unused_envelope_detail_inputs | legacy | Legacy/simplified UI compatibility | legacy payloads only unless future resolver consumes them | hidden | removed_from_production_ui_legacy_payload_compatibility_only |
| legacy.old_persistence_tables | legacy | Legacy migration boundary | existing database rows before canonical migration | hidden | compatibility_only_not_canonical_new_write_path |

## Dependency Graph

| Producer | Consumer | Owner | Issue |
| --- | --- | --- | --- |
| ui | local_project_session | Browser session | none |
| local_project_session | primitive_inputs | UI mapper | none |
| primitive_inputs | providers | Building DNA Resolver | none |
| providers | building_dna | Building DNA Resolver | none |
| primitive_inputs | building_dna | Building DNA Resolver | none |
| building_dna | chapter2_adapter | Chapter 2 Adapter | none |
| chapter2_adapter | chapter2_physics | Physics Engine | none |
| chapter2_physics | chapter3_adapter | Chapter 3 Adapter | none |
| building_dna | chapter3_adapter | Chapter 3 Adapter | none |
| chapter3_adapter | chapter3_physics | Physics Engine | none |
| chapter2_physics | engineering_runtime | Physics Engine | none |
| chapter3_physics | engineering_runtime | Physics Engine | optional_when_systems_active |
| engineering_runtime | technical_report | Technical Report Builder | none |
| building_dna | versioned_persistence | Versioned Backend | none |
| engineering_runtime | versioned_persistence | Versioned Backend | none |
| technical_report | versioned_persistence | Versioned Backend | none |
| versioned_persistence | reopen_payload | Versioned Backend | none |

Obsolete or bounded paths:

| Path | Status | Owning field | Description |
| --- | --- | --- | --- |
| hidden_climate_profile_override | bounded_legacy_compatibility | legacy.climate_profile_id | Hidden climate_profile_id must never override source-backed locality except demo or no station-backed locality. |
| ui_only_geometry_dimensions | remove_or_wire_later | legacy.length_width_geometry_inputs | building_length_m/building_width_m are visible but not consumed by Building DNA. |
| ui_only_thermal_mass | remove_or_wire_later | legacy.thermal_mass_class_ui | thermal_mass_class is visible but not mapped into Table 2.19/2.20 utilization dependencies. |

## UI Audit

| Section | Recommendation | Hide or remove |
| --- | --- | --- |
| Amplasare si clima | keep locality editable; keep zone/wind explicit until normative mappings exist; all resolved provider fields read-only | climate_profile_id visible selector already removed; hidden compatibility field remains only for demo/legacy |
| Geometrie | keep explicit area/volume fields editable and show direct/runtime impact | building_length_m removed in P6B, building_width_m removed in P6B, thermal_mass_class removed in P6B |
| Anvelopa | keep active fields; make bridge inventory explicit in a future milestone | wall_thickness removed in P6B until assembly selection consumes it |
| Renovari | keep intervention toggles; remove or wire detail fields | wall_insulation_year removed in P6B, roof_insulation_thickness_cm removed in P6B, floor_insulation_thickness_cm removed in P6B, window_age_years removed in P6B, door_replaced removed in P6B |
| Instalatii tehnice | keep editable with validation; continue showing explicit SR EN 15193-1 lighting boundary | - |
| Results/report | read-only calculated outputs only | - |

## Generic Building Audit

| Category | Current support | Architecture fit | Notes |
| --- | --- | --- | --- |
| detached_houses | production_supported | good | Current default geometry/envelope workflow is strongest for single-family houses. |
| apartments | partially_supported | requires_boundary_context_hardening | Building DNA can represent adjacent/heated/unheated boundaries, but assisted abstraction must avoid roof/ground questions when irrelevant. |
| apartment_buildings | model_ready_not_product_default | requires_multi_zone_and_shared_system_metadata | Project/building/technicalSystems model is generic enough; UI is currently residential-house biased. |
| offices_schools_hospitals_hotels_commercial | future_input_model_possible | requires_non_residential_occupancy_zoning_schedules_and_internal_gains_categories | Chapter 3 technical systems are generic; Chapter 2 input UI must generalize building use, zones, schedules and internal gains. |
| industrial_buildings | not_product_supported | requires_scope_decision | Architecture should keep category separate from residential presets and avoid assumptions until MC001 scope is confirmed for the target use. |

## Legacy Inventory

| Legacy area | Owner | Compatibility role | Target disposition |
| --- | --- | --- | --- |
| legacy_database_tables | Legacy migration boundary | read and controlled migration only | remove after canonical migration evidence |
| legacy_climate_profiles | Climate compatibility layer | demo and explicit profile fallback only | replace normal production usage with Climate Provider and certified import contract |
| assisted_typology_abstraction | Simplified secondary flow | secondary flow and assembly proposal | keep isolated; future redesign must update this architecture before changing defaults |

## Simplification Report

| Concept | Status | Action |
| --- | --- | --- |
| climate_profile_id vs locality-driven Climate Provider | legacy_compatibility_only | keep hidden until demo/legacy path is retired; never expose as production selector |
| buildingSpecificParameters.* duplicated with geometry.* | intentional_but_should_be_simplified | future milestone should choose one public geometry owner and keep alternate as provenance/seed metadata |
| visible dimensions length/width without resolver consumer | removed_from_production_ui | keep absent unless a source-backed geometry generator is introduced through the architecture registry |
| thermal_mass_class selector without utilization mapping | removed_from_production_ui | keep absent until Table 2.19/2.20 effective capacity mapping is integrated into Building DNA |
| renovation detail metadata not consumed | removed_from_production_ui | keep absent or add explicit intervention fields with downstream semantics |

Removable UI controls estimate: 0

Removed UI controls:

- building_length_m
- building_width_m
- thermal_mass_class
- wall_thickness
- wall_insulation_year
- roof_insulation_thickness_cm
- floor_insulation_thickness_cm
- window_age_years
- door_replaced

Automatically derivable fields:

- climate_station_id from locality_id
- monthly exterior temperatures from climate station
- monthly relative humidity from climate station
- design temperatures from climate station
- ventilation airflow from heated volume and ACH

Explicit future boundaries:

- locality to climate-zone mapping requires source-backed registry
- locality to wind-zone mapping requires source-backed registry
- Annex A.9.6 solar source rows require normative preprocessing to Qsol
- SR EN 15193-1 full lighting engine remains external

## Architecture Rules

- Every production field has exactly one authoritative owner.
- UI never calculates MC001 formulas.
- Providers resolve source-backed datasets and expose bounded diagnostics for unavailable data.
- Building DNA is the only persisted engineering input model.
- Adapters map Building DNA to physics input without duplicating formulas.
- Reports render persisted Building DNA and engine outputs without recalculation.
- Legacy fields remain explicitly classified until removed.

## Target Architecture

1. Primitive user inputs
2. Providers
3. Building DNA
4. Physics Engine
5. Engineering Runtime
6. Reports
7. UI

## Required Future Maintenance

Any future milestone that adds fields, providers, runtime concepts, report sections, persistence semantics or UI abstractions must update both:

- `building-model-registry.json`
- `BUILDING_MODEL_ARCHITECTURE.md`

No new production abstraction should bypass this registry.
