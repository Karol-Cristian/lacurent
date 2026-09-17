const fs = require('node:fs');
const path = require('node:path');
const assert = require('node:assert/strict');
const { test } = require('node:test');

const source = fs.readFileSync(path.join(__dirname, '..', 'static', 'scenario-price-availability-fix.js'), 'utf8');

test('unknown scenario tariffs are not presented as zero savings', () => {
  assert.match(source, /pellet_boiler/);
  assert.match(source, /district_heat/);
  assert.match(source, /Preț indisponibil/);
  assert.match(source, /savingValue\.textContent = "—"/);
});
