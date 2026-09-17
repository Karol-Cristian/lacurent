const fs = require('node:fs');
const path = require('node:path');
const assert = require('node:assert/strict');
const { test } = require('node:test');

const runtime = fs.readFileSync(path.join(__dirname, '..', 'static', 'language-switch-runtime.js'), 'utf8');
const landing = fs.readFileSync(path.join(__dirname, '..', 'static', 'energy-home-language-toggle.js'), 'utf8');

test('language toggles never reload or navigate through the Worker', () => {
  assert.doesNotMatch(runtime, /window\.location\.(?:reload|assign|replace)/);
  assert.doesNotMatch(runtime, /location\.href\s*=/);
  assert.match(runtime, /applyLanguage\(language\)/);
  assert.match(runtime, /lacurent:languagechange/);
});

test('energy landing reacts to in-place language changes', () => {
  assert.match(landing, /lacurent:languagechange/);
  assert.match(landing, /applyEnglishLanding/);
  assert.match(landing, /Înțelege consumul casei înainte să investești\./);
});
