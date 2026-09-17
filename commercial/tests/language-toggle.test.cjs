const fs = require('node:fs');
const path = require('node:path');
const assert = require('node:assert/strict');
const { test } = require('node:test');

const runtime = fs.readFileSync(path.join(__dirname, '..', 'static', 'energy-i18n.js'), 'utf8');

test('language toggles are fully client-side and reversible', () => {
  assert.doesNotMatch(runtime, /window\.location\.(?:reload|assign|replace)/);
  assert.doesNotMatch(runtime, /location\.href\s*=/);
  assert.match(runtime, /setLanguage\(currentLanguage\(\)\)/);
  assert.match(runtime, /lacurent:languagechange/);
  assert.match(runtime, /originalText/);
  assert.match(runtime, /originalAttrs/);
});

test('one dictionary covers landing, calculator and report labels', () => {
  assert.match(runtime, /Înțelege consumul casei înainte să investești\./);
  assert.match(runtime, /Calculator energetic pentru locuințe/);
  assert.match(runtime, /Cost anual estimat al energiei/);
  assert.match(runtime, /Apă caldă menajeră/);
});
