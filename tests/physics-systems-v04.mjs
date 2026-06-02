import assert from "node:assert/strict";

const generation = {
  wood_stove: 0.55,
  gas_boiler_non_condensing: 0.82,
  gas_boiler_condensing: 0.92,
  pellet_boiler: 0.84,
  electric_direct: 0.98,
  air_water_heat_pump_radiators: 2.3,
  air_water_heat_pump_underfloor: 3.2,
  air_air_heat_pump: 3,
  district_heating: 0.98
};

const emission = {
  local_stove: 0.92,
  radiators: 0.94,
  underfloor: 0.97,
  air: 0.95
};

const distribution = {
  local: 1,
  radiators_uninsulated: 0.9,
  radiators_insulated: 0.94,
  underfloor: 0.96,
  district_heating: 0.88
};

const storage = {
  none: 1,
  buffer_small: 0.96,
  dhw_tank: 0.9
};

const control = {
  none: 0.88,
  manual: 0.92,
  room_thermostat: 0.96,
  thermostatic_valves: 0.97,
  zoned_control: 0.98,
  smart_control: 0.99
};

const aux = {
  none: 0,
  local_stove: 0,
  boiler_pumps_basic: 120,
  pellet_boiler_aux: 180,
  heat_pump_aux: 220,
  split_ac_aux: 30
};

const carrier = {
  wood: "wood",
  natural_gas: "natural_gas",
  electricity: "electricity",
  heat_pump: "electricity",
  pellets: "pellets",
  district_heating: "district_heating"
};

const systems = {
  wood_stove: {
    fuel: "wood",
    emission: "local_stove",
    distribution: "local",
    storage: "none",
    generation: "wood_stove",
    control: "manual",
    aux: "local_stove"
  },
  gas_condensing: {
    fuel: "natural_gas",
    emission: "radiators",
    distribution: "radiators_insulated",
    storage: "none",
    generation: "gas_boiler_condensing",
    control: "room_thermostat",
    aux: "boiler_pumps_basic"
  },
  heat_pump_underfloor: {
    fuel: "heat_pump",
    emission: "underfloor",
    distribution: "underfloor",
    storage: "none",
    generation: "air_water_heat_pump_underfloor",
    control: "zoned_control",
    aux: "heat_pump_aux"
  }
};

function totalEfficiency(system) {
  return emission[system.emission] *
    distribution[system.distribution] *
    storage[system.storage] *
    generation[system.generation] *
    control[system.control];
}

function delivered(useful, system) {
  return useful / Math.max(0.1, totalEfficiency(system));
}

function dhwDemand({ occupants, area }) {
  return (occupants || Math.max(1, Math.round(area / 32))) * 850;
}

function coolingFinal(coolingDemand, seer = 3.1) {
  return coolingDemand / Math.max(0.5, seer);
}

function runV04({ area, occupants, heatingDemand, coolingDemand, heatingSystem, dhwSystem = heatingSystem }) {
  const heatingFinal = delivered(heatingDemand, heatingSystem);
  const dhwUseful = dhwDemand({ occupants, area });
  const dhwFinal = delivered(dhwUseful, dhwSystem);
  const cooling = coolingFinal(coolingDemand, 3.1);
  const auxiliary = aux[heatingSystem.aux] + aux.split_ac_aux;
  const byCarrier = {
    electricity: 0,
    natural_gas: 0,
    wood: 0,
    pellets: 0,
    district_heating: 0
  };
  byCarrier[carrier[heatingSystem.fuel]] += heatingFinal;
  byCarrier[carrier[dhwSystem.fuel]] += dhwFinal;
  byCarrier.electricity += cooling + auxiliary;
  return {
    finalEnergyByCarrier: byCarrier,
    finalEnergyByUse: {
      heating: heatingFinal,
      cooling,
      dhw: dhwFinal,
      auxiliary
    },
    systemLosses: {
      heating: Math.max(0, heatingFinal - heatingDemand),
      dhw: Math.max(0, dhwFinal - dhwUseful)
    },
    total: heatingFinal + cooling + dhwFinal + auxiliary,
    specific: (heatingFinal + cooling + dhwFinal + auxiliary) / area
  };
}

const stoveEfficiency = totalEfficiency(systems.wood_stove);
assert.ok(stoveEfficiency < 0.6);

const heatPumpEfficiency = totalEfficiency(systems.heat_pump_underfloor);
assert.ok(heatPumpEfficiency > 2.7);

const wood = runV04({
  area: 64.8,
  occupants: 2,
  heatingDemand: 14000,
  coolingDemand: 300,
  heatingSystem: systems.wood_stove
});

const heatPump = runV04({
  area: 64.8,
  occupants: 2,
  heatingDemand: 14000,
  coolingDemand: 300,
  heatingSystem: systems.heat_pump_underfloor
});

assert.ok(wood.finalEnergyByCarrier.wood > 25000);
assert.ok(heatPump.finalEnergyByCarrier.electricity < wood.finalEnergyByCarrier.wood);
assert.equal(dhwDemand({ occupants: 3, area: 64.8 }), 2550);
assert.equal(dhwDemand({ area: 64.8 }), 1700);
assert.ok(coolingFinal(930, 3.1) === 300);
assert.ok(wood.systemLosses.heating > 10000);
assert.ok(wood.finalEnergyByUse.auxiliary >= 30);
assert.ok(wood.total > wood.finalEnergyByUse.heating);
assert.ok(wood.specific > 0);

const gas = runV04({
  area: 100,
  occupants: 4,
  heatingDemand: 10000,
  coolingDemand: 0,
  heatingSystem: systems.gas_condensing
});
assert.ok(gas.finalEnergyByCarrier.natural_gas > 10000);
assert.ok(gas.finalEnergyByCarrier.electricity >= 150);

console.log("PASS physics v0.4 systems layer calculations");
