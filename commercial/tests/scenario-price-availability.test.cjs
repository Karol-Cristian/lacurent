const fs = require('node:fs');
const path = require('node:path');
const assert = require('node:assert/strict');
const { test } = require('node:test');

const source = fs.readFileSync(path.join(__dirname, '..', 'static', 'scenario-price-availability-fix.js'), 'utf8');

test('district heat unknown tariff is not presented as zero cost', () => {
  assert.match(source, /district_heat/);
  assert.match(source, /Preț local necesar/);
  assert.match(source, /savingValue\.textContent = "—"/);
  assert.doesNotMatch(source, /pellet_boiler/);
});

test('price fallback observes simulator status instead of mutating observed price nodes', () => {
  assert.match(source, /observer\.observe\(status/);
  assert.doesNotMatch(source, /observer\.observe\(costValue/);
  assert.doesNotMatch(source, /observer\.observe\(costDelta/);
});
