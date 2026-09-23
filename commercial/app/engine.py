from __future__ import annotations

from collections import defaultdict

from .methodology import (
    carrier_factors,
    default_heating_performance,
    methodology,
    resolve_climate,
    resolve_monthly_hsol,
    resolve_monthly_plane_hsol,
)
from .models import (
    BuildingInput,
    CalculationResult,
    Carrier,
    ComparisonResult,
    Contribution,
    Co2Result,
    EnergyServiceResult,
    EnvelopeBoundaryType,
    EnvelopeGeometryResult,
    EnvelopeUValuesResult,
    HeatingControlType,
    HeatingDistributionType,
    HeatingEmitterType,
    HeatingGeneratorType,
    HeatingStorageType,
    HeatingSystemPerformanceResult,
    HeatingSystemType,
    IndicatorResult,
    MonthlyRenewableBalance,
    PhotovoltaicResult,
    RenewableEnergyResult,
    SolarThermalResult,
    TransmissionComponent,
    TransmissionComponentsResult,
)


GAMMA_EQUALITY_TOLERANCE = 1e-12


def _round(value: float, digits: int = 3) -> float:
    return round(float(value), digits)


def _envelope_items(building: BuildingInput, kind: str):
    return [item for item in building.envelope if item.type.value == kind]


def _area_sum(building: BuildingInput, kind: str) -> float:
    return sum(float(item.area_m2) for item in _envelope_items(building, kind))


def _area_weighted_u(building: BuildingInput, kind: str) -> float | None:
    items = _envelope_items(building, kind)
    area = sum(float(item.area_m2) for item in items)
    if area <= 0:
        return None
    return _round(sum(float(item.area_m2) * float(item.u_value_w_m2k) for item in items) / area, 4)


def envelope_geometry(building: BuildingInput) -> EnvelopeGeometryResult:
    """Return the geometry actually used by the energy engine.

    net_wall_area_m2 is the opaque exterior-wall area represented in the
    envelope. gross_wall_area_m2 adds modeled windows and exterior doors.
    No commercial waste or purchase allowance is included.
    """
    net_wall = _area_sum(building, "exterior_wall")
    windows = _area_sum(building, "window")
    doors = _area_sum(building, "exterior_door")
    return EnvelopeGeometryResult(
        gross_wall_area_m2=_round(net_wall + windows + doors),
        window_area_m2=_round(windows),
        exterior_door_area_m2=_round(doors),
        net_wall_area_m2=_round(net_wall),
        roof_area_m2=_round(_area_sum(building, "roof")),
        floor_area_m2=_round(_area_sum(building, "floor")),
    )


def envelope_u_values(building: BuildingInput) -> EnvelopeUValuesResult:
    """Return area-weighted U-values for the modeled envelope groups."""
    return EnvelopeUValuesResult(
        wall_u_value_w_m2k=_area_weighted_u(building, "exterior_wall"),
        roof_u_value_w_m2k=_area_weighted_u(building, "roof"),
        floor_u_value_w_m2k=_area_weighted_u(building, "floor"),
        window_u_value_w_m2k=_area_weighted_u(building, "window"),
        exterior_door_u_value_w_m2k=_area_weighted_u(building, "exterior_door"),
    )


BOUNDARY_TO_TRANSMISSION_COMPONENT = {
    EnvelopeBoundaryType.outside_air: TransmissionComponent.Hd,
    EnvelopeBoundaryType.ground: TransmissionComponent.Hg,
    EnvelopeBoundaryType.unheated_space: TransmissionComponent.Hu,
    EnvelopeBoundaryType.unheated_attic: TransmissionComponent.Hu,
    EnvelopeBoundaryType.unheated_basement: TransmissionComponent.Hu,
    EnvelopeBoundaryType.adjacent_heated_space: TransmissionComponent.Ha,
    EnvelopeBoundaryType.adjacent_unheated_space: TransmissionComponent.Ha,
}


def transmission_heat_transfer_components(
    building: BuildingInput,
) -> tuple[TransmissionComponentsResult, list[Contribution], list[Contribution]]:
    """Return MC001 relation (2.15) components: Htr = Hd + Hg + Hu + Ha.

    Direct exterior elements use factor 1. Ground/unheated/adjacent elements
    carry an explicit boundary correction factor in the input contract.
    """

    element_rows: list[tuple[str, str, TransmissionComponent, EnvelopeBoundaryType, float, float]] = []
    totals = {component: 0.0 for component in TransmissionComponent}

    for item in building.envelope:
        component = BOUNDARY_TO_TRANSMISSION_COMPONENT[item.boundary_type]
        factor = float(item.boundary_correction_factor or 0.0)
        value = float(item.u_value_w_m2k) * float(item.area_m2) * factor
        totals[component] += value
        element_rows.append(
            (item.name, item.type.value, component, item.boundary_type, factor, value)
        )

    bridge_rows: list[tuple[str, str, TransmissionComponent, float]] = []
    for item in building.thermal_bridges:
        component = item.component
        value = float(item.psi_w_mk) * float(item.length_m)
        totals[component] += value
        bridge_rows.append((item.name, "thermal_bridge", component, value))

    htr = sum(totals.values())

    envelope_contributions = [
        Contribution(
            name=name,
            type=kind,
            value=_round(value),
            unit="W/K",
            percent=_round(100 * value / htr if htr else 0, 1),
            component=component,
            boundary_type=boundary,
            boundary_correction_factor=_round(factor, 3),
        )
        for name, kind, component, boundary, factor, value in element_rows
    ]
    bridge_contributions = [
        Contribution(
            name=name,
            type=kind,
            value=_round(value),
            unit="W/K",
            percent=_round(100 * value / htr if htr else 0, 1),
            component=component,
        )
        for name, kind, component, value in bridge_rows
    ]

    result = TransmissionComponentsResult(
        hd_w_k=_round(totals[TransmissionComponent.Hd]),
        hg_w_k=_round(totals[TransmissionComponent.Hg]),
        hu_w_k=_round(totals[TransmissionComponent.Hu]),
        ha_w_k=_round(totals[TransmissionComponent.Ha]),
        htr_w_k=_round(htr),
    )
    return result, envelope_contributions, bridge_contributions


def transmission_heat_transfer(building: BuildingInput) -> tuple[float, list[Contribution], list[Contribution]]:
    """Backward-compatible Htr wrapper around the explicit Hd/Hg/Hu/Ha model."""

    components, envelope, bridges = transmission_heat_transfer_components(building)
    return components.htr_w_k, envelope, bridges


def ventilation_heat_transfer(building: BuildingInput) -> float:
    """MC001 Hve helper: Hve = 0.34 * qv_m3h * (1 - eta_hr). Units: W/K."""

    airflow_m3h = building.ventilation.air_changes_per_hour * building.heated_volume_m3
    recovery_factor = 1 - building.ventilation.heat_recovery_efficiency
    return _round(0.34 * airflow_m3h * recovery_factor)


def _monthly_utilization_parameter(building: BuildingInput, total_h_w_k: float, mode: str) -> float:
    """Return aH/aC from Mc 001-2022 relations 2.55-2.58 for the configured thermal-mass class."""

    cfg = methodology()["monthly_method"]
    class_id = cfg["default_effective_internal_heat_capacity_class"]
    capacity_j_m2k = float(cfg["effective_internal_heat_capacity_j_m2k"][class_id])
    capacity_j_k = capacity_j_m2k * building.heated_floor_area_m2
    tau_h = (capacity_j_k / 3600.0) / max(total_h_w_k, 1e-12)
    if mode == "heating":
        return float(cfg["a_h0"]) + tau_h / float(cfg["tau_h0_h"])
    return float(cfg["a_c0"]) + tau_h / float(cfg["tau_c0_h"])


def _heating_gain_utilization_factor(gamma_h: float, a_h: float) -> float:
    """Mc 001-2022 Figure 2.14 / SR EN ISO 52016-1 monthly gain-utilization factor."""

    if abs(gamma_h - 1.0) <= GAMMA_EQUALITY_TOLERANCE:
        return a_h / (a_h + 1.0)
    return (1.0 - gamma_h**a_h) / (1.0 - gamma_h ** (a_h + 1.0))


def _monthly_heating_need(q_h_ht_kwh: float, q_h_gn_kwh: float, a_h: float) -> float:
    """Mc 001-2022 Figure 2.18 monthly useful heating demand for continuous operation."""

    if q_h_ht_kwh <= 0:
        return 0.0
    if q_h_gn_kwh <= 0:
        return q_h_ht_kwh
    gamma_h = q_h_gn_kwh / q_h_ht_kwh
    if gamma_h > 2.0:
        return 0.0
    eta_h_gn = _heating_gain_utilization_factor(gamma_h, a_h)
    return max(q_h_ht_kwh - eta_h_gn * q_h_gn_kwh, 0.0)


def _cooling_heat_transfer_utilization_factor(gamma_c: float, a_c: float) -> float:
    """Mc 001-2022 Figure 2.15 / SR EN ISO 52016-1 monthly heat-transfer utilization factor."""

    if gamma_c < 0:
        # Negative Q_C,ht means heat is transferred into the zone; such heat transfer
        # cannot reduce the cooling need and therefore has utilization factor 1.
        return 1.0
    if abs(gamma_c - 1.0) <= GAMMA_EQUALITY_TOLERANCE:
        return a_c / (a_c + 1.0)
    return (1.0 - gamma_c ** (-a_c)) / (1.0 - gamma_c ** (-(a_c + 1.0)))


def _monthly_cooling_need(
    q_c_ht_kwh: float,
    q_c_gn_kwh: float,
    a_c: float,
    a_c_red: float = 1.0,
) -> float:
    """Mc 001-2022 Figure 2.19 monthly useful cooling demand, continuous-operation branch."""

    if q_c_gn_kwh <= 0:
        return max(-q_c_ht_kwh, 0.0) * a_c_red
    if abs(q_c_ht_kwh) <= 1e-12:
        return q_c_gn_kwh * a_c_red

    gamma_c = q_c_gn_kwh / q_c_ht_kwh
    if gamma_c > 0 and (1.0 / gamma_c) > 2.0:
        return 0.0

    eta_c_ht = _cooling_heat_transfer_utilization_factor(gamma_c, a_c)
    return max(a_c_red * (q_c_gn_kwh - eta_c_ht * q_c_ht_kwh), 0.0)


def _window_solar_geometry(building: BuildingInput) -> tuple[float, float, float]:
    """Return total glazing area, sum(U*A), and area-weighted U-value."""

    windows = [item for item in building.envelope if item.type.value == "window"]
    area = sum(item.area_m2 for item in windows)
    ua = sum(item.area_m2 * item.u_value_w_m2k for item in windows)
    return area, ua, (ua / area if area > 0 else 0.0)


def _solar_glazing_groups(building: BuildingInput, window_area_m2: float) -> list[tuple[str, float]]:
    """Return orientation/area groups while keeping envelope and solar geometry consistent."""

    if not building.solar.glazing_groups:
        return [(building.solar.orientation, window_area_m2)] if window_area_m2 > 0 else []

    groups = [(item.orientation, float(item.area_m2)) for item in building.solar.glazing_groups]
    oriented_total = sum(area for _, area in groups)
    tolerance = max(0.5, 0.02 * window_area_m2)
    if abs(oriented_total - window_area_m2) > tolerance:
        raise ValueError(
            "Suma suprafețelor vitrate pe orientări trebuie să corespundă suprafeței totale a ferestrelor "
            f"(orientări {oriented_total:.1f} m² vs total {window_area_m2:.1f} m²)."
        )
    if oriented_total <= 0:
        return []
    # Small rounding differences are normalized to the envelope area so transmission
    # and solar models use exactly the same transparent surface.
    scale = window_area_m2 / oriented_total
    return [(orientation, area * scale) for orientation, area in groups]


def _solar_device_factor(building: BuildingInput) -> float:
    device = building.solar.shading_device_id
    side = building.solar.shading_mounting_side
    if not device:
        return 1.0
    entry = methodology()["solar"]["shading_table_2_16"].get(device)
    if not entry or side not in {"interior", "exterior"}:
        raise ValueError("Dispozitivul de umbrire selectat nu are un factor MC001 Tabel 2.16 valid.")
    return float(entry[side])


def _monthly_solar_gains(
    building: BuildingInput,
    climate: dict,
    month_index: int,
    hours: float,
) -> dict:
    """Calculate transparent-element solar gains for one month.

    Normative mode uses one source-backed Annex A.9.6 station per MC001/6-2013
    climate station. Glazing can be split across the eight A.9.6 orientations.
    Source Hsol rows are selected, never interpolated.
    """

    explicit_gain = building.solar_gains_kwh_m2_month * building.heated_floor_area_m2
    if building.solar.mode == "explicit":
        return {
            "gains_kwh": explicit_gain,
            "source": "explicit_equivalent_monthly_gain",
            "weighted_hsol_kwh_m2": None,
            "hsol_by_orientation_kwh_m2": {},
            "station_name": None,
            "station_resolution": None,
            "station_distance_km": None,
        }

    window_area_m2, window_ua_w_k, _window_u = _window_solar_geometry(building)
    groups = _solar_glazing_groups(building, window_area_m2)
    if not groups:
        hsol = resolve_monthly_hsol(climate, building.solar.orientation)
        return {
            "gains_kwh": 0.0,
            "source": "normative_A9_6_Hsol_no_transparent_area",
            "weighted_hsol_kwh_m2": None if hsol is None else float(hsol["values_kwh_m2_month"][month_index]),
            "hsol_by_orientation_kwh_m2": {},
            "station_name": None if hsol is None else hsol.get("solar_locality_name"),
            "station_resolution": None if hsol is None else hsol.get("station_resolution"),
            "station_distance_km": None if hsol is None else hsol.get("station_distance_km"),
        }

    cfg = methodology()["solar"]
    ggl_n = float(cfg["glazing_table_2_13_ggl_n"][building.solar.glazing_type_id])
    ggl = (
        float(cfg["angle_correction_factor_relation_2_40"])
        * ggl_n
        * _solar_device_factor(building)
    )

    gross_solar = 0.0
    weighted_hsol = 0.0
    hsol_by_orientation: dict[str, float] = {}
    source_meta = None
    for orientation, area_m2 in groups:
        hsol = resolve_monthly_hsol(climate, orientation)
        if hsol is None:
            return {
                "gains_kwh": explicit_gain,
                "source": "explicit_fallback_no_source_backed_A9_6_Hsol",
                "weighted_hsol_kwh_m2": None,
                "hsol_by_orientation_kwh_m2": {},
                "station_name": None,
                "station_resolution": None,
                "station_distance_km": None,
            }
        hsol_kwh_m2 = float(hsol["values_kwh_m2_month"][month_index])
        hsol_by_orientation[orientation] = hsol_kwh_m2
        weighted_hsol += area_m2 * hsol_kwh_m2
        gross_solar += (
            ggl
            * area_m2
            * (1.0 - building.solar.frame_fraction)
            * building.solar.obstacle_shading_factor
            * hsol_kwh_m2
        )
        source_meta = source_meta or hsol

    q_sky = (
        0.001
        * building.solar.sky_view_factor
        * building.solar.exterior_surface_resistance_m2k_w
        * window_ua_w_k
        * building.solar.longwave_radiation_coefficient_w_m2k
        * building.solar.sky_temperature_difference_k
        * hours
    )
    source_code = "MC001_2_39_2_40_2_54_with_source_backed_A9_6_oriented_Hsol"
    if building.solar.shading_device_id:
        source_code += "_TABLE_2_16_shading"

    return {
        "gains_kwh": gross_solar - q_sky,
        "source": source_code,
        "weighted_hsol_kwh_m2": weighted_hsol / window_area_m2,
        "hsol_by_orientation_kwh_m2": hsol_by_orientation,
        "station_name": source_meta.get("solar_locality_name") if source_meta else None,
        "station_resolution": source_meta.get("station_resolution") if source_meta else None,
        "station_distance_km": source_meta.get("station_distance_km") if source_meta else None,
    }

def _annual_outdoor_temperature_c(climate: dict) -> float:
    """Return the day-weighted annual exterior temperature from the selected climate station."""

    months = climate["monthly_temperatures"]
    total_days = sum(float(month["days"]) for month in months)
    if total_days <= 0:
        raise ValueError("Climate profile must contain a positive annual duration.")
    return sum(float(month["temperature_c"]) * float(month["days"]) for month in months) / total_days


def monthly_energy_balance(
    building: BuildingInput,
    transmission: TransmissionComponentsResult,
    h_ve_w_k: float,
) -> list[dict]:
    """Monthly quasi-steady balance with explicit exterior/ground boundary paths.

    MC001 Figure 2.11 keeps ground transfer separate: Hd/Hu/Ha use the monthly
    exterior temperature while Hg uses the annual exterior temperature. The
    current Light Engine keeps Hg constant through the year; a future ISO 13370
    implementation may replace it with monthly Hgr;an,m coefficients.
    """

    data = methodology()
    climate = resolve_climate(building.locality)
    internal_gain_w_m2 = (
        building.internal_gains_w_m2
        if building.internal_gains_w_m2 is not None
        else data["internal_gains_w_m2"][building.building_type.value]
    )
    total_h = transmission.htr_w_k + h_ve_w_k
    a_h = _monthly_utilization_parameter(building, total_h, "heating")
    a_c = _monthly_utilization_parameter(building, total_h, "cooling")
    a_c_red = float(data["monthly_method"]["cooling_reduction_factor_continuous"])
    annual_outdoor = _annual_outdoor_temperature_c(climate)
    h_excluding_ground = transmission.hd_w_k + transmission.hu_w_k + transmission.ha_w_k

    monthly = []
    for month in climate["monthly_temperatures"]:
        days = month["days"]
        hours = days * 24
        outdoor = month["temperature_c"]

        internal_gains = internal_gain_w_m2 * building.heated_floor_area_m2 * hours / 1000
        solar = _monthly_solar_gains(
            building,
            climate,
            len(monthly),
            hours,
        )
        solar_gains = float(solar["gains_kwh"])
        total_gains = internal_gains + solar_gains

        # MC001 Figure 2.11 sign convention: heat transfer is positive when it
        # leaves the conditioned zone. Ground is coupled to the annual exterior
        # temperature instead of the current month's outside-air temperature.
        q_h_tr_excl_ground = (
            h_excluding_ground
            * (building.indoor_design_temperature_c - outdoor)
            * hours
            / 1000
        )
        q_h_ground = (
            transmission.hg_w_k
            * (building.indoor_design_temperature_c - annual_outdoor)
            * hours
            / 1000
        )
        q_h_ve = (
            h_ve_w_k
            * (building.indoor_design_temperature_c - outdoor)
            * hours
            / 1000
        )
        q_h_ht = q_h_tr_excl_ground + q_h_ground + q_h_ve
        useful_heating = _monthly_heating_need(q_h_ht, total_gains, a_h)

        useful_cooling = 0.0
        if building.cooling.enabled:
            q_c_tr_excl_ground = (
                h_excluding_ground
                * (building.cooling.setpoint_c - outdoor)
                * hours
                / 1000
            )
            q_c_ground = (
                transmission.hg_w_k
                * (building.cooling.setpoint_c - annual_outdoor)
                * hours
                / 1000
            )
            q_c_ve = (
                h_ve_w_k
                * (building.cooling.setpoint_c - outdoor)
                * hours
                / 1000
            )
            q_c_ht = q_c_tr_excl_ground + q_c_ground + q_c_ve
            useful_cooling = _monthly_cooling_need(q_c_ht, total_gains, a_c, a_c_red)

        monthly.append({
            "month": month["id"],
            "days": days,
            "outdoor_temperature_c": outdoor,
            "heat_loss_kwh": _round(max(q_h_ht, 0.0)),
            "transmission_excluding_ground_kwh": _round(q_h_tr_excl_ground),
            "ground_transmission_kwh": _round(q_h_ground),
            "ventilation_heat_transfer_kwh": _round(q_h_ve),
            "internal_gains_kwh": _round(internal_gains),
            "solar_gains_kwh": _round(solar_gains),
            "solar_gains_source": solar["source"],
            "solar_hsol_kwh_m2": (
                None
                if solar["weighted_hsol_kwh_m2"] is None
                else _round(solar["weighted_hsol_kwh_m2"])
            ),
            "solar_hsol_by_orientation_kwh_m2": {
                key: _round(value)
                for key, value in solar["hsol_by_orientation_kwh_m2"].items()
            },
            "solar_station_name": solar["station_name"],
            "solar_station_resolution": solar["station_resolution"],
            "solar_station_distance_km": solar["station_distance_km"],
            "useful_heating_kwh": _round(useful_heating),
            "useful_cooling_kwh": _round(useful_cooling),
        })

    return monthly


def _default_heating_chain(building: BuildingInput) -> dict:
    heating = building.heating
    cost_profile = heating.cost_profile or ""

    if heating.system_type == HeatingSystemType.condensing_gas_boiler:
        generator = HeatingGeneratorType.condensing_gas_boiler
    elif heating.system_type == HeatingSystemType.gas_boiler:
        generator = HeatingGeneratorType.gas_boiler
    elif heating.system_type == HeatingSystemType.electric_resistance:
        generator = HeatingGeneratorType.electric_direct
    elif heating.system_type == HeatingSystemType.heat_pump:
        generator = HeatingGeneratorType.heat_pump_air_water
    elif heating.system_type == HeatingSystemType.district_heat:
        generator = HeatingGeneratorType.district_heat
    elif cost_profile == "pellets":
        generator = HeatingGeneratorType.pellet_boiler
    elif cost_profile == "firewood" and heating.efficiency is not None and heating.efficiency <= 0.76:
        generator = HeatingGeneratorType.wood_stove
    elif cost_profile == "firewood":
        generator = HeatingGeneratorType.wood_boiler
    else:
        generator = HeatingGeneratorType.custom
    if heating.system_type == HeatingSystemType.heat_pump:
        return {
            "generator_type": generator,
            "emitter_type": HeatingEmitterType.underfloor,
            "distribution_type": HeatingDistributionType.underfloor,
            "storage_type": HeatingStorageType.none,
            "control_type": HeatingControlType.zoned,
        }
    if heating.system_type == HeatingSystemType.electric_resistance:
        return {
            "generator_type": generator,
            "emitter_type": HeatingEmitterType.local,
            "distribution_type": HeatingDistributionType.local,
            "storage_type": HeatingStorageType.none,
            "control_type": HeatingControlType.room_thermostat,
        }
    if heating.system_type == HeatingSystemType.custom and cost_profile == "firewood" and heating.efficiency is not None and heating.efficiency <= 0.76:
        return {
            "generator_type": generator,
            "emitter_type": HeatingEmitterType.local,
            "distribution_type": HeatingDistributionType.local,
            "storage_type": HeatingStorageType.none,
            "control_type": HeatingControlType.manual,
        }
    return {
        "generator_type": generator,
        "emitter_type": HeatingEmitterType.radiators_high_temp,
        "distribution_type": HeatingDistributionType.hydronic_insulated,
        "storage_type": HeatingStorageType.none,
        "control_type": (
            HeatingControlType.thermostatic_valves
            if heating.system_type == HeatingSystemType.district_heat
            else HeatingControlType.room_thermostat
        ),
    }


def heating_system_performance(
    building: BuildingInput,
    useful_kwh: float,
) -> tuple[EnergyServiceResult, HeatingSystemPerformanceResult]:
    """Resolve the LaCurent Light heating chain.

    The subsystem topology mirrors MC001-2022 Chapter 3 (emission,
    distribution, storage, generation and auxiliaries). The automatic factors
    below come from the explicitly-labelled Light product registry and are not
    presented as normative MC001 table values.
    """

    heating = building.heating
    cfg = methodology()["heating_system_chain_light"]
    defaults = _default_heating_chain(building)
    details = heating.details

    if details is None:
        generator = defaults["generator_type"]
        emitter = defaults["emitter_type"]
        distribution = defaults["distribution_type"]
        storage = defaults["storage_type"]
        control = defaults["control_type"]
        emitter_cfg = cfg["emitters"][emitter.value]
        hydronic_temperatures = emitter not in {HeatingEmitterType.local, HeatingEmitterType.air}
        defaults_generator = default_heating_performance(heating.system_type.value)

        if heating.system_type == HeatingSystemType.heat_pump:
            generator_performance = float(heating.scop or defaults_generator["scop"])
            generator_kind = "scop"
            carrier = Carrier.electricity
        else:
            generator_performance = float(heating.efficiency or defaults_generator["efficiency"])
            generator_kind = "efficiency"
            carrier = heating.carrier
            if heating.system_type == HeatingSystemType.electric_resistance:
                carrier = Carrier.electricity
            elif heating.system_type == HeatingSystemType.district_heat:
                carrier = Carrier.district_heat
            elif heating.system_type in {HeatingSystemType.gas_boiler, HeatingSystemType.condensing_gas_boiler}:
                carrier = Carrier.natural_gas

        main_final = useful_kwh / max(generator_performance, 0.1)
        service = EnergyServiceResult(
            useful_kwh=_round(useful_kwh),
            final_kwh=_round(main_final),
            carrier=carrier,
        )
        performance = HeatingSystemPerformanceResult(
            generator_type=generator,
            emitter_type=emitter,
            distribution_type=distribution,
            storage_type=storage,
            control_type=control,
            design_flow_temperature_c=(_round(emitter_cfg["flow_c"], 1) if hydronic_temperatures else None),
            design_return_temperature_c=(_round(emitter_cfg["return_c"], 1) if hydronic_temperatures else None),
            emission_efficiency=1.0,
            distribution_efficiency=1.0,
            storage_efficiency=1.0,
            control_efficiency=1.0,
            generator_performance=_round(generator_performance, 4),
            generator_performance_kind=generator_kind,
            effective_system_performance=_round(generator_performance, 4),
            auxiliary_electricity_kwh=0.0,
            main_carrier_final_kwh=_round(main_final),
            total_heating_final_kwh=_round(main_final),
            performance_source="legacy_flat_compatibility",
            confidence="medium",
            assumptions=["No structured heating-system details were supplied; legacy flat seasonal performance is preserved."],
        )
        return service, performance

    generator = details.generator_type if details.generator_type else defaults["generator_type"]
    emitter = details.emitter_type if details else defaults["emitter_type"]
    distribution = details.distribution_type if details else defaults["distribution_type"]
    storage = details.storage_type if details else defaults["storage_type"]
    control = details.control_type if details else defaults["control_type"]

    emitter_cfg = cfg["emitters"][emitter.value]
    distribution_cfg = cfg["distribution"][distribution.value]
    storage_cfg = cfg["storage"][storage.value]
    control_cfg = cfg["control"][control.value]

    hydronic_temperatures = emitter not in {HeatingEmitterType.local, HeatingEmitterType.air}
    flow_c = (
        float(details.design_flow_temperature_c)
        if hydronic_temperatures and details.design_flow_temperature_c is not None
        else (float(emitter_cfg["flow_c"]) if hydronic_temperatures else None)
    )
    return_c = (
        float(details.design_return_temperature_c)
        if hydronic_temperatures and details.design_return_temperature_c is not None
        else (float(emitter_cfg["return_c"]) if hydronic_temperatures else None)
    )

    emission_eff = float(emitter_cfg["efficiency"])
    distribution_eff = float(distribution_cfg["efficiency"])
    storage_eff = float(storage_cfg["efficiency"])
    control_eff = float(control_cfg["efficiency"])
    downstream_eff = emission_eff * distribution_eff * storage_eff * control_eff

    source = "lacurent_light_product_estimate"
    confidence = "low"
    emitter_assumption = (
        f"Emitter preset: {emitter_cfg['label']} ({flow_c:.0f}/{return_c:.0f}°C)."
        if flow_c is not None and return_c is not None
        else f"Emitter preset: {emitter_cfg['label']} (no hydronic flow/return temperature)."
    )
    assumptions = [
        cfg["status"],
        emitter_assumption,
        f"Distribution preset: {distribution_cfg['label']}.",
        f"Storage preset: {storage_cfg['label']}.",
        f"Control preset: {control_cfg['label']}.",
    ]

    carrier = heating.carrier
    if heating.system_type == HeatingSystemType.heat_pump:
        generator_performance = (
            float(heating.scop)
            if heating.scop is not None
            else float(cfg["heat_pump_scop_by_emitter"][emitter.value])
            * float(cfg.get("heat_pump_generator_factor", {}).get(generator.value, 1.0))
        )
        generator_kind = "scop"
        carrier = Carrier.electricity
        if heating.scop is None:
            assumptions.append(cfg["heat_pump_scop_source"])
        else:
            source = "explicit_user_scop_plus_light_chain"
            confidence = "medium"
    else:
        defaults_generator = default_heating_performance(heating.system_type.value)
        generator_performance = float(heating.efficiency or defaults_generator["efficiency"])
        generator_kind = "efficiency"
        if heating.system_type == HeatingSystemType.condensing_gas_boiler and heating.efficiency is None and flow_c is not None:
            if flow_c <= 45:
                generator_performance = min(generator_performance + 0.02, 0.98)
            elif flow_c >= 60:
                generator_performance = max(generator_performance - 0.03, 0.80)
            assumptions.append(
                "Condensing-boiler Light adjustment uses emitter flow temperature; this is a LaCurent product estimate, not an MC001 table value."
            )
        if heating.efficiency is not None:
            source = "explicit_user_efficiency_plus_light_chain"
            confidence = "medium"

        if heating.system_type == HeatingSystemType.electric_resistance:
            carrier = Carrier.electricity
        elif heating.system_type == HeatingSystemType.district_heat:
            carrier = Carrier.district_heat
        elif heating.system_type in {HeatingSystemType.gas_boiler, HeatingSystemType.condensing_gas_boiler}:
            carrier = Carrier.natural_gas

    effective_system_performance = max(generator_performance * downstream_eff, 0.1)
    main_final = useful_kwh / effective_system_performance

    auxiliary = (
        float(details.auxiliary_electricity_kwh_year)
        if details and details.auxiliary_electricity_kwh_year is not None
        else float(cfg["auxiliary_electricity_kwh_year"].get(generator.value, 0))
    )

    service = EnergyServiceResult(
        useful_kwh=_round(useful_kwh),
        final_kwh=_round(main_final),
        carrier=carrier,
    )
    performance = HeatingSystemPerformanceResult(
        generator_type=generator,
        emitter_type=emitter,
        distribution_type=distribution,
        storage_type=storage,
        control_type=control,
        design_flow_temperature_c=(None if flow_c is None else _round(flow_c, 1)),
        design_return_temperature_c=(None if return_c is None else _round(return_c, 1)),
        emission_efficiency=_round(emission_eff, 4),
        distribution_efficiency=_round(distribution_eff, 4),
        storage_efficiency=_round(storage_eff, 4),
        control_efficiency=_round(control_eff, 4),
        generator_performance=_round(generator_performance, 4),
        generator_performance_kind=generator_kind,
        effective_system_performance=_round(effective_system_performance, 4),
        auxiliary_electricity_kwh=_round(auxiliary),
        main_carrier_final_kwh=_round(main_final),
        total_heating_final_kwh=_round(main_final + auxiliary),
        performance_source=source,
        confidence=confidence,
        assumptions=assumptions,
    )
    return service, performance


def heating_final_energy(building: BuildingInput, useful_kwh: float) -> EnergyServiceResult:
    return heating_system_performance(building, useful_kwh)[0]


def cooling_final_energy(building: BuildingInput, useful_kwh: float) -> EnergyServiceResult:
    if not building.cooling.enabled:
        return EnergyServiceResult(useful_kwh=0, final_kwh=0, carrier=None)
    return EnergyServiceResult(
        useful_kwh=_round(useful_kwh),
        final_kwh=_round(useful_kwh / (building.cooling.seer or 1)),
        carrier=Carrier.electricity,
    )


def _dhw_useful_for_days(building: BuildingInput, days: int) -> float:
    if not building.dhw.enabled:
        return 0.0
    data = methodology()
    litres = (
        building.dhw.litres_per_person_day_at_60c
        if building.dhw.litres_per_person_day_at_60c is not None
        else data["dhw"]["litres_per_person_day_at_60c"]
    )
    return (
        building.dhw.occupants
        * litres
        * days
        * data["dhw"]["kwh_per_litre_10_to_60c"]
    )


def dhw_energy(building: BuildingInput, useful_kwh: float | None = None) -> EnergyServiceResult:
    if not building.dhw.enabled:
        return EnergyServiceResult(useful_kwh=0, final_kwh=0, carrier=None)

    useful = (
        _dhw_useful_for_days(building, 365)
        if useful_kwh is None
        else max(float(useful_kwh), 0.0)
    )
    return EnergyServiceResult(
        useful_kwh=_round(useful),
        final_kwh=_round(useful / building.dhw.efficiency),
        carrier=building.dhw.carrier,
    )


def _renewable_resource_rows(building: BuildingInput, climate: dict) -> tuple[list[dict], float, float]:
    cfg = methodology()["renewables"]
    pv = building.renewables.pv
    solar_thermal = building.renewables.solar_thermal

    pv_pr = (
        float(pv.performance_ratio)
        if pv.performance_ratio is not None
        else float(cfg["photovoltaic"]["default_performance_ratio"])
    )
    thermal_efficiency = (
        float(solar_thermal.system_efficiency)
        if solar_thermal.system_efficiency is not None
        else float(cfg["solar_thermal"]["default_system_efficiency"])
    )

    pv_plane = None
    if pv.enabled:
        pv_plane = resolve_monthly_plane_hsol(climate, pv.orientation, pv.tilt_degrees)
        if pv_plane is None:
            raise ValueError("Nu există date Hsol pentru orientarea fotovoltaică selectată.")

    thermal_plane = None
    if solar_thermal.enabled:
        thermal_plane = resolve_monthly_plane_hsol(
            climate,
            solar_thermal.orientation,
            solar_thermal.tilt_degrees,
        )
        if thermal_plane is None:
            raise ValueError("Nu există date Hsol pentru orientarea solarului termic selectată.")

    rows: list[dict] = []
    for index, month in enumerate(climate["monthly_temperatures"]):
        days = int(month["days"])
        dhw_useful = _dhw_useful_for_days(building, days)

        pv_hsol = (
            float(pv_plane["values_kwh_m2_month"][index])
            if pv_plane is not None
            else 0.0
        )
        pv_generation = (
            pv_hsol * float(pv.installed_power_kwp) * pv_pr
            if pv.enabled
            else 0.0
        )

        thermal_hsol = (
            float(thermal_plane["values_kwh_m2_month"][index])
            if thermal_plane is not None
            else 0.0
        )
        thermal_available = (
            thermal_hsol
            * float(solar_thermal.collector_area_m2)
            * thermal_efficiency
            if solar_thermal.enabled
            else 0.0
        )
        thermal_used = min(thermal_available, dhw_useful) if building.dhw.enabled else 0.0

        rows.append(
            {
                "month": month["id"],
                "pv_plane_hsol_kwh_m2": pv_hsol,
                "pv_generation_kwh": pv_generation,
                "pv_self_consumed_kwh": 0.0,
                "pv_exported_kwh": pv_generation,
                "solar_thermal_plane_hsol_kwh_m2": thermal_hsol,
                "solar_thermal_available_kwh": thermal_available,
                "solar_thermal_used_dhw_kwh": thermal_used,
                "dhw_backup_useful_kwh": max(dhw_useful - thermal_used, 0.0),
            }
        )

    return rows, pv_pr, thermal_efficiency


def _service_final_per_useful(service: EnergyServiceResult) -> float:
    if service.useful_kwh <= 0:
        return 0.0
    return float(service.final_kwh) / float(service.useful_kwh)


def renewable_energy_result(
    building: BuildingInput,
    climate: dict,
    monthly_balance: list[dict],
    heating: EnergyServiceResult,
    cooling: EnergyServiceResult,
    dhw: EnergyServiceResult,
    renewable_rows: list[dict],
    pv_pr: float,
    thermal_efficiency: float,
    heating_auxiliary_kwh_year: float = 0.0,
) -> RenewableEnergyResult:
    pv = building.renewables.pv
    solar_thermal = building.renewables.solar_thermal
    heating_ratio = _service_final_per_useful(heating)
    cooling_ratio = _service_final_per_useful(cooling)
    dhw_ratio = _service_final_per_useful(dhw)

    annual_heating_useful = sum(float(row["useful_heating_kwh"]) for row in monthly_balance)

    for balance, renewable in zip(monthly_balance, renewable_rows):
        electric_load = 0.0
        if heating_auxiliary_kwh_year > 0:
            if annual_heating_useful > 0:
                electric_load += heating_auxiliary_kwh_year * float(balance["useful_heating_kwh"]) / annual_heating_useful
            else:
                electric_load += heating_auxiliary_kwh_year / max(len(monthly_balance), 1)
        if heating.carrier == Carrier.electricity:
            electric_load += float(balance["useful_heating_kwh"]) * heating_ratio
        if cooling.carrier == Carrier.electricity:
            electric_load += float(balance["useful_cooling_kwh"]) * cooling_ratio
        if dhw.carrier == Carrier.electricity:
            electric_load += float(renewable["dhw_backup_useful_kwh"]) * dhw_ratio

        generation = float(renewable["pv_generation_kwh"])
        self_consumed = min(generation, electric_load) if pv.enabled else 0.0
        renewable["pv_self_consumed_kwh"] = self_consumed
        renewable["pv_exported_kwh"] = max(generation - self_consumed, 0.0)

    pv_generation = sum(float(row["pv_generation_kwh"]) for row in renewable_rows)
    pv_self_consumed = sum(float(row["pv_self_consumed_kwh"]) for row in renewable_rows)
    pv_exported = sum(float(row["pv_exported_kwh"]) for row in renewable_rows)
    pv_plane_hsol = sum(float(row["pv_plane_hsol_kwh_m2"]) for row in renewable_rows)

    thermal_available = sum(float(row["solar_thermal_available_kwh"]) for row in renewable_rows)
    thermal_used = sum(float(row["solar_thermal_used_dhw_kwh"]) for row in renewable_rows)
    thermal_plane_hsol = sum(float(row["solar_thermal_plane_hsol_kwh_m2"]) for row in renewable_rows)
    total_dhw_useful = sum(
        float(row["solar_thermal_used_dhw_kwh"]) + float(row["dhw_backup_useful_kwh"])
        for row in renewable_rows
    )

    return RenewableEnergyResult(
        pv=PhotovoltaicResult(
            enabled=pv.enabled,
            installed_power_kwp=_round(pv.installed_power_kwp, 3),
            orientation=pv.orientation,
            tilt_degrees=_round(pv.tilt_degrees, 1),
            performance_ratio=_round(pv_pr, 3),
            annual_plane_hsol_kwh_m2=_round(pv_plane_hsol),
            annual_generation_kwh=_round(pv_generation),
            self_consumed_kwh=_round(pv_self_consumed),
            exported_kwh=_round(pv_exported),
            self_consumption_percent=_round(
                100.0 * pv_self_consumed / pv_generation if pv_generation else 0.0,
                1,
            ),
        ),
        solar_thermal=SolarThermalResult(
            enabled=solar_thermal.enabled,
            collector_area_m2=_round(solar_thermal.collector_area_m2, 2),
            orientation=solar_thermal.orientation,
            tilt_degrees=_round(solar_thermal.tilt_degrees, 1),
            system_efficiency=_round(thermal_efficiency, 3),
            annual_plane_hsol_kwh_m2=_round(thermal_plane_hsol),
            annual_available_kwh=_round(thermal_available),
            used_for_dhw_kwh=_round(thermal_used),
            dhw_solar_fraction_percent=_round(
                100.0 * thermal_used / total_dhw_useful if total_dhw_useful else 0.0,
                1,
            ),
        ),
        monthly=[
            MonthlyRenewableBalance(
                month=str(row["month"]),
                pv_plane_hsol_kwh_m2=_round(row["pv_plane_hsol_kwh_m2"]),
                pv_generation_kwh=_round(row["pv_generation_kwh"]),
                pv_self_consumed_kwh=_round(row["pv_self_consumed_kwh"]),
                pv_exported_kwh=_round(row["pv_exported_kwh"]),
                solar_thermal_plane_hsol_kwh_m2=_round(row["solar_thermal_plane_hsol_kwh_m2"]),
                solar_thermal_available_kwh=_round(row["solar_thermal_available_kwh"]),
                solar_thermal_used_dhw_kwh=_round(row["solar_thermal_used_dhw_kwh"]),
            )
            for row in renewable_rows
        ],
        plane_model=methodology()["renewables"]["plane_model"]["id"],
    )


def net_final_energy_by_carrier(
    gross_totals: dict[str, float],
    renewables: RenewableEnergyResult,
) -> dict[str, float]:
    totals = dict(gross_totals)
    if renewables.pv.enabled:
        electricity = float(totals.get(Carrier.electricity.value, 0.0))
        totals[Carrier.electricity.value] = max(
            electricity - float(renewables.pv.self_consumed_kwh),
            0.0,
        )
    return {
        carrier: _round(value)
        for carrier, value in totals.items()
        if value > 1e-9
    }


def final_energy_by_service(
    heating: EnergyServiceResult,
    cooling: EnergyServiceResult,
    dhw: EnergyServiceResult,
    heating_auxiliary_kwh: float = 0.0,
) -> dict[str, float]:
    return {
        "heating": _round(heating.final_kwh + heating_auxiliary_kwh),
        "cooling": cooling.final_kwh,
        "dhw": dhw.final_kwh,
    }


def final_energy_by_carrier(
    *services: EnergyServiceResult,
    additional_electricity_kwh: float = 0.0,
) -> dict[str, float]:
    totals: dict[str, float] = defaultdict(float)
    if additional_electricity_kwh > 0:
        totals[Carrier.electricity.value] += additional_electricity_kwh
    for service in services:
        if service.carrier and service.final_kwh:
            totals[service.carrier.value] += service.final_kwh
    return {carrier: _round(value) for carrier, value in totals.items()}


def primary_energy(carrier_totals: dict[str, float], area_m2: float) -> IndicatorResult:
    total = sum(value * carrier_factors(carrier)["primary_energy_factor"] for carrier, value in carrier_totals.items())
    return IndicatorResult(total_kwh=_round(total), specific_kwh_m2=_round(total / area_m2, 2))


def co2_emissions(carrier_totals: dict[str, float], area_m2: float) -> Co2Result:
    total = sum(value * carrier_factors(carrier)["co2_kg_per_kwh_final"] for carrier, value in carrier_totals.items())
    return Co2Result(total_kg=_round(total), specific_kg_m2=_round(total / area_m2, 2))


def classify_energy(building: BuildingInput, specific_primary_kwh_m2: float) -> str:
    thresholds = methodology()["energy_class_thresholds"][building.building_type.value]["total_primary_kwh_m2"]
    labels = ["A+", "A", "B", "C", "D", "E", "F"]
    for label, limit in zip(labels, thresholds):
        if specific_primary_kwh_m2 <= limit:
            return label
    return "G"


def calculate(building: BuildingInput, *, include_reference: bool = True) -> CalculationResult:
    h_tr, envelope_contributions, bridge_contributions = transmission_heat_transfer(building)
    h_ve = ventilation_heat_transfer(building)
    climate = resolve_climate(building.locality)
    monthly = monthly_energy_balance(building, h_tr, h_ve)
    annual_heating = sum(row["useful_heating_kwh"] for row in monthly)
    annual_cooling = sum(row["useful_cooling_kwh"] for row in monthly)

    renewable_rows, pv_pr, thermal_efficiency = _renewable_resource_rows(building, climate)
    heating, heating_system = heating_system_performance(building, annual_heating)
    cooling = cooling_final_energy(building, annual_cooling)
    dhw_backup_useful = sum(float(row["dhw_backup_useful_kwh"]) for row in renewable_rows)
    dhw = dhw_energy(building, dhw_backup_useful)
    renewables = renewable_energy_result(
        building,
        climate,
        monthly,
        heating,
        cooling,
        dhw,
        renewable_rows,
        pv_pr,
        thermal_efficiency,
        heating_auxiliary_kwh_year=heating_system.auxiliary_electricity_kwh,
    )

    by_service = final_energy_by_service(
        heating,
        cooling,
        dhw,
        heating_auxiliary_kwh=heating_system.auxiliary_electricity_kwh,
    )
    gross_by_carrier = final_energy_by_carrier(
        heating,
        cooling,
        dhw,
        additional_electricity_kwh=heating_system.auxiliary_electricity_kwh,
    )
    by_carrier = net_final_energy_by_carrier(gross_by_carrier, renewables)
    primary = primary_energy(by_carrier, building.heated_floor_area_m2)
    co2 = co2_emissions(by_carrier, building.heated_floor_area_m2)
    energy_class = classify_energy(building, primary.specific_kwh_m2)

    comparison = None
    if include_reference:
        from .reference import build_reference_input

        reference_result = calculate(build_reference_input(building), include_reference=False)
        reference_specific = reference_result.primary_energy.specific_kwh_m2
        diff = primary.specific_kwh_m2 - reference_specific
        comparison = ComparisonResult(
            actual_specific_primary_kwh_m2=primary.specific_kwh_m2,
            reference_specific_primary_kwh_m2=reference_specific,
            difference_kwh_m2=_round(diff, 2),
            difference_percent=_round(100 * diff / reference_specific if reference_specific else 0, 1),
        )

    return CalculationResult(
        input=building,
        climate=climate,
        h_tr_w_k=h_tr,
        h_ve_w_k=h_ve,
        heat_loss_w_k=_round(h_tr + h_ve),
        envelope_geometry=envelope_geometry(building),
        envelope_u_values=envelope_u_values(building),
        envelope_contributions=envelope_contributions,
        thermal_bridge_contributions=bridge_contributions,
        monthly=monthly,
        annual_heating_demand_kwh=_round(annual_heating),
        annual_cooling_demand_kwh=_round(annual_cooling),
        heating=heating,
        heating_system=heating_system,
        cooling=cooling,
        dhw=dhw,
        final_energy_by_service=by_service,
        gross_final_energy_by_carrier=gross_by_carrier,
        final_energy_by_carrier=by_carrier,
        total_service_final_energy_kwh=_round(sum(by_service.values())),
        total_final_energy_kwh=_round(sum(by_carrier.values())),
        renewables=renewables,
        primary_energy=primary,
        co2=co2,
        energy_class=energy_class,
        reference=comparison,
        methodology_version=methodology()["version"],
        assumptions=methodology()["assumptions"],
    )


def demo_building() -> BuildingInput:
    return BuildingInput(
        project_name="Casă demonstrativă Cluj",
        locality="Cluj-Napoca",
        heated_floor_area_m2=160,
        heated_volume_m3=432,
        indoor_design_temperature_c=20,
        building_type="residential_individual",
        construction_year=2004,
        solar_gains_kwh_m2_month=1.2,
        solar={"mode": "explicit"},
        envelope=[
            {"name": "Pereți exteriori", "type": "exterior_wall", "area_m2": 168, "u_value_w_m2k": 0.42},
            {"name": "Acoperiș", "type": "roof", "area_m2": 92, "u_value_w_m2k": 0.24},
            {"name": "Pardoseală spre sol", "type": "floor", "area_m2": 80, "u_value_w_m2k": 0.36},
            {"name": "Ferestre", "type": "window", "area_m2": 24, "u_value_w_m2k": 1.35},
            {"name": "Ușă exterioară", "type": "exterior_door", "area_m2": 3.2, "u_value_w_m2k": 1.7},
        ],
        thermal_bridges=[
            {"name": "Perimetrul pardoselii", "length_m": 42, "psi_w_mk": 0.05},
        ],
        ventilation={"air_changes_per_hour": 0.5, "heat_recovery_efficiency": 0},
        heating={"system_type": "condensing_gas_boiler", "efficiency": 0.94, "cost_profile": "natural_gas"},
        cooling={"enabled": True, "seer": 3.6, "setpoint_c": 26},
        dhw={"enabled": True, "occupants": 4, "efficiency": 0.86, "carrier": "natural_gas"},
    )
