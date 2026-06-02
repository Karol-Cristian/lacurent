import type { Building } from "../model/Building";
import type { PhysicsValue } from "../model/Material";
import type { InternalGainsInput, MonthlyInternalGains } from "../model/Gains";
import { INTERNAL_GAINS_REGISTRY } from "../registries/internalGains.registry";
import { OCCUPANCY_PROFILES_REGISTRY } from "../registries/occupancyProfiles.registry";
import { hoursInMonth } from "./monthlyClimate";
import { pv } from "./resistance";

export function estimateInternalGains(building: Building): PhysicsValue {
  const area = building.geometry.heatedAreaM2.value;
  return pv(area * 8, "kWh/an", ["Aport intern orientativ pentru locuire: 8 kWh/m2/an."], "low");
}

export function calculateMonthlyInternalGains(input: InternalGainsInput): MonthlyInternalGains[] {
  const defaults = INTERNAL_GAINS_REGISTRY.residential_default;
  const profile = OCCUPANCY_PROFILES_REGISTRY[input.occupancyProfileId || "residential_default"];
  const occupants = input.occupants || Math.max(1, Math.round(input.heatedAreaM2 / 32));
  const lightingPower = input.lightingPowerWPerM2 ?? defaults.lightingPowerWPerM2;
  const appliancePower = input.appliancePowerWPerM2 ?? defaults.appliancePowerWPerM2;

  return Array.from({ length: 12 }, (_, index) => {
    const month = index + 1;
    const peopleGainsKwh = occupants * defaults.occupantSensibleGainW * profile.hoursHomePerDay * profile.activeDaysPerMonth / 1000;
    const lightingGainsKwh = input.heatedAreaM2 * lightingPower * defaults.lightingEquivalentHoursPerDay * profile.activeDaysPerMonth / 1000;
    const appliancesGainsKwh = input.heatedAreaM2 * appliancePower * defaults.applianceEquivalentHoursPerDay * profile.activeDaysPerMonth / 1000;
    return {
      month,
      peopleGainsKwh,
      lightingGainsKwh,
      appliancesGainsKwh,
      totalInternalGainsKwh: peopleGainsKwh + lightingGainsKwh + appliancesGainsKwh,
      unit: "kWh",
      source: defaults.source,
      confidence: defaults.confidence,
      assumptions: [
        ...defaults.assumptions,
        `Luna ${month} are ${hoursInMonth(month)} ore; aporturile interne folosesc profil lunar mediu.`
      ]
    };
  });
}
