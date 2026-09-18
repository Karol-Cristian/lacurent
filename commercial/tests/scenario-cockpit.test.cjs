const fs = require('node:fs');
const path = require('node:path');
const assert = require('node:assert/strict');
const { test } = require('node:test');

const source = fs.readFileSync(path.join(__dirname, '..', 'static', 'scenario-cockpit.js'), 'utf8');

test('scenario cockpit uses real baseline positions rather than duplicate Current positions', () => {
  assert.match(source, /ins\.value=String\(baseProfileIndex\)/);
  assert.match(source, /zone\.value=String\(baseZone\)/);
  assert.match(source, /area\.value=String\(Math\.round\(baseArea\)\)/);
  assert.match(source, /heating\.value=baseHeating/);
  assert.doesNotMatch(source, /PROFILE_KEYS\s*=\s*\["actual"/);
  assert.doesNotMatch(source, /min="0" max="5"[^>]*id="cpZone"/);
});

test('scenario cockpit includes summer cooling and ventilation controls', () => {
  for (const id of ['cpCooling','cpCoolSet','cpSeer','cpAch','cpRecovery','cpSolar','cpHeatPerf']) {
    assert.match(source, new RegExp(id));
  }
  assert.match(source, /cooling_enabled/);
  assert.match(source, /cooling_setpoint_c/);
  assert.match(source, /cooling_seer/);
  assert.match(source, /cost-monthly-table/);
});

test('scenario changes are debounced and use the correct calculate route', () => {
  assert.match(source, /fetch\('\/calculate'/);
  assert.match(source, /setTimeout\(calculateScenario,280\)/);
  assert.match(source, /AbortController/);
});


test('scenario cockpit preserves oriented glazing and shading from the baseline', () => {
  assert.match(source, /solar_shading_device_id/);
  assert.match(source, /solar_shading_mounting_side/);
  assert.match(source, /glazing_groups/);
  assert.match(source, /solar_window_area_south_m2/);
  assert.match(source, /solar_window_area_north_m2/);
});
