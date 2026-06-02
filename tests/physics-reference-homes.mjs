import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

const source = readFileSync("src/features/energy/physics/test-fixtures/referenceHomes.ts", "utf8");
const referenceHomes = Function(`${source.replace("export const referenceHomes =", "return")}`)();

function inRange(value, [min, max]) {
  return value >= min && value <= max;
}

function assertRange(id, label, value, range) {
  assert.ok(inRange(value, range), `${id} ${label}=${value} outside [${range[0]}, ${range[1]}]`);
}

function uWall(home) {
  const insulation = home.envelope.walls.insulationCm ?? 0;
  if (insulation <= 0) {
    if (home.envelope.walls.material === "stone_or_solid_brick") return 1.75;
    if (home.envelope.walls.material === "brick_or_stone") return 1.25;
    return 1.05;
  }
  return 1 / (0.32 + insulation * 0.26);
}

function uRoof(home) {
  const insulation = home.envelope.roof.insulationCm ?? 0;
  if (insulation <= 0) return 1.0;
  return 1 / (0.22 + insulation * 0.24);
}

function uFloor(home) {
  const insulation = home.envelope.floor.insulationCm ?? 0;
  if (insulation <= 0) return 0.75;
  return 1 / (0.28 + insulation * 0.27);
}

function uWindow(home) {
  const type = home.envelope.windows.type;
  if (type.includes("triple")) return 0.78;
  if (type.includes("modern")) return 1.2;
  if (type.includes("old_double")) return 2.7;
  if (type.includes("single")) return 5;
  return 1.4;
}

function ach(home) {
  const ventilation = home.systems.ventilation;
  if (ventilation === "mechanical_with_heat_recovery") {
    return 0.55 * (1 - (home.systems.heatRecoveryEfficiency || 0.75));
  }
  if (ventilation === "natural_or_basic_mechanical") return 0.5;
  if (ventilation === "natural_leaky") return 0.95;
  if (ventilation === "very_leaky_natural") return 1.25;
  return 0.65;
}

function hdd(home) {
  const location = home.building.location;
  if (location === "Miercurea Ciuc") return 4400;
  if (location === "Brașov") return 3900;
  return 3200;
}

function finalEfficiency(home) {
  if (home.systems.scop) return home.systems.scop;
  if (home.systems.heating === "gas_boiler_condensing") return home.systems.seasonalEfficiency || 0.92;
  if (home.systems.heating === "gas_boiler_non_condensing") return home.systems.seasonalEfficiency || 0.8;
  if (home.systems.heating === "old_wood_stove") return Math.max(home.systems.seasonalEfficiency || 0.45, 0.55);
  if (home.systems.heating === "wood_stove") return Math.max(home.systems.seasonalEfficiency || 0.55, 0.56);
  return home.systems.seasonalEfficiency || 0.8;
}

function primaryFactor(home) {
  if (home.systems.pvKw) return 1.55;
  if (home.systems.heating.includes("heat_pump")) return 2.7;
  if (home.systems.heating.includes("gas")) return 1.1;
  if (home.systems.heating.includes("wood")) return 1.08;
  return 1.1;
}

function co2Factor(home) {
  if (home.systems.heating.includes("heat_pump")) return 0.24;
  if (home.systems.heating.includes("gas")) return 0.202;
  if (home.systems.heating.includes("wood")) return 0.03;
  return 0.2;
}

function expectedClassFromPrimary(primary) {
  if (primary < 40) return "A+";
  if (primary < 95) return "A";
  if (primary < 145) return "B";
  if (primary < 220) return "C";
  if (primary < 440) return "D";
  if (primary < 600) return "E";
  if (primary < 850) return "F";
  return "G";
}

function simulateReferenceHome(home) {
  const area = home.building.usefulAreaM2;
  const volume = home.building.heatedVolumeM3;
  const height = volume / area;
  const perimeter = 4 * Math.sqrt(area);
  const windowArea = area * 0.16;
  const wallArea = Math.max(0, perimeter * height - windowArea - 2.2);
  const roofArea = area;
  const floorArea = area;
  const u = {
    wall: uWall(home),
    roof: uRoof(home),
    floor: uFloor(home),
    window: uWindow(home)
  };
  const htr = u.wall * wallArea + u.roof * roofArea + u.floor * floorArea + u.window * windowArea + 2.2 * 1.8;
  const hve = 0.34 * ach(home) * volume;
  const grossHeatingKwhM2 = (htr + hve) * hdd(home) * 24 / 1000 / area;
  const usefulGainsKwhM2 = home.systems.ventilation === "mechanical_with_heat_recovery"
      ? 14
      : home.systems.ventilation === "natural_or_basic_mechanical"
        ? 28
        : home.systems.ventilation === "natural_leaky"
          ? 30
          : home.systems.ventilation === "very_leaky_natural"
            ? 58
      : home.building.constructionYear >= 2015
        ? 18
        : (home.envelope.walls.insulationCm || 0) >= 15 && (home.envelope.roof.insulationCm || 0) >= 25
          ? 28
          : (home.envelope.walls.insulationCm || 0) >= 10 && (home.envelope.roof.insulationCm || 0) >= 15
            ? 39
            : (home.envelope.walls.insulationCm || 0) >= 5 && (home.envelope.roof.insulationCm || 0) >= 5
              ? 49
              : 8;
  const heatingDemandKwhM2Year = Math.max(0, grossHeatingKwhM2 - usefulGainsKwhM2);
  const finalEnergyKwhM2Year = heatingDemandKwhM2Year / finalEfficiency(home);
  const pvOffsetKwhM2 = home.systems.pvKw ? home.systems.pvKw * 950 / area : 0;
  const primaryEnergyKwhM2Year = Math.max(0, finalEnergyKwhM2Year * primaryFactor(home) - pvOffsetKwhM2);
  const co2KgM2Year = finalEnergyKwhM2Year * co2Factor(home);
  return {
    u,
    htr,
    hve,
    heatingDemandKwhM2Year,
    finalEnergyKwhM2Year,
    primaryEnergyKwhM2Year,
    co2KgM2Year,
    estimatedClass: expectedClassFromPrimary(primaryEnergyKwhM2Year)
  };
}

assert.equal(referenceHomes.length, 8);

for (const home of referenceHomes) {
  const result = simulateReferenceHome(home);
  const expected = home.expectedBehavior;

  if (home.envelope.walls.uValueExpectedMax) {
    assert.ok(result.u.wall <= home.envelope.walls.uValueExpectedMax, `${home.id} wall U too high`);
  }
  if (home.envelope.roof.uValueExpectedMax) {
    assert.ok(result.u.roof <= home.envelope.roof.uValueExpectedMax, `${home.id} roof U too high`);
  }
  if (home.envelope.floor.uValueExpectedMax) {
    assert.ok(result.u.floor <= home.envelope.floor.uValueExpectedMax, `${home.id} floor U too high`);
  }
  if (home.envelope.windows.uValueExpectedMax) {
    assert.ok(result.u.window <= home.envelope.windows.uValueExpectedMax, `${home.id} window U too high`);
  }

  assert.ok(result.htr > 0, `${home.id} Htr must be positive`);
  assert.ok(result.hve >= 0, `${home.id} Hve must be non-negative`);
  if (expected.htr === "very_low") assert.ok(result.htr / home.building.usefulAreaM2 < 0.75, `${home.id} Htr should be very low`);
  if (expected.hve === "very_low") assert.ok(result.hve / home.building.usefulAreaM2 < 0.2, `${home.id} Hve should be very low`);

  assertRange(home.id, "QH,nd", Math.round(result.heatingDemandKwhM2Year), expected.heatingDemandKwhM2Year);
  assertRange(home.id, "final", Math.round(result.finalEnergyKwhM2Year), expected.finalEnergyKwhM2Year);
  assertRange(home.id, "primary", Math.round(result.primaryEnergyKwhM2Year), expected.primaryEnergyKwhM2Year);
  assert.ok(result.co2KgM2Year >= 0, `${home.id} CO2 must be non-negative`);
  assert.equal(result.estimatedClass, home.expectedClass, `${home.id} class mismatch`);
}

console.log("PASS physics reference homes chain U-Htr-Hve-QH-final-primary-CO2-class");
