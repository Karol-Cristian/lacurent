const fs = require('node:fs');
const assert = require('node:assert/strict');
const { test } = require('node:test');

const source = fs.readFileSync(new URL('../static/scenario-price-availability-fix.js', import.meta.url), 'utf8');

test('unknown scenario tariffs are not presented as zero savings', () => {
  assert.match(source, /pellet_boiler/);
  assert.match(source, /district_heat/);
  assert.match(source, /Preț indisponibil/);
  assert.match(source, /savingValue\.textContent = "—"/);
});
