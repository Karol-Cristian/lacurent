const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');
const path = require('node:path');
const html = fs.readFileSync(path.join(__dirname, '../templates/software_testing.html'), 'utf8');
const script = html.match(/<script>([\s\S]*?)<\/script>/)[1];

function setup(clipboard) {
  const ids = [...html.matchAll(/id="([^"]+)"/g)].map(match => match[1]);
  const elements = Object.fromEntries(ids.map(id => [id, {
    value: '', hidden: id === 'brief-preview', textContent: '', handlers: {},
    addEventListener(event, handler) { this.handlers[event] = handler; },
    focus() { this.focused = true; }, select() { this.selected = true; }
  }]));
  const choices = { problem: [], impact: [], tool: [] };
  vm.runInNewContext(script, {
    document: {
      getElementById: id => elements[id],
      querySelectorAll: selector => choices[selector.match(/name="([^"]+)"/)[1]].map(value => ({ value }))
    },
    navigator: clipboard ? { clipboard } : {},
    window: { location: Object.freeze({}) }
  });
  return { elements, choices };
}

test('prepare previews an empty brief without opening email', () => {
  const { elements: e } = setup();
  e['prepare-email'].handlers.click();
  assert.equal(e['brief-preview'].hidden, false);
  assert.equal(e['brief-text'].focused, true);
  assert.match(e['brief-text'].value, /I am not sure yet/);
  assert.match(e['brief-text'].value, /Not quantified yet/);
});

test('selected answers and special characters survive email encoding and edits', async () => {
  let copied;
  const { elements: e, choices } = setup({ writeText: async text => { copied = text; } });
  choices.problem.push('Timing & recovery');
  choices.impact.push('Hours lost');
  choices.tool.push('CANoe / CAPL');
  e['bottleneck-note'].value = '  România & 50% #1\n<script>alert(1)</script>  ';
  e['prepare-email'].handlers.click();
  const url = new URL(e['open-email'].href);
  assert.equal(url.pathname, 'karol@lacurent.com');
  assert.equal(url.searchParams.get('body'), e['brief-text'].value);
  assert.match(e['brief-text'].value, /Timing & recovery/);
  assert.match(e['brief-text'].value, /România & 50% #1\n<script>/);
  e['brief-text'].value = 'Edited & reviewed';
  e['brief-text'].handlers.input();
  assert.equal(new URL(e['open-email'].href).searchParams.get('body'), 'Edited & reviewed');
  await e['copy-brief'].handlers.click();
  assert.equal(copied, 'Edited & reviewed');
  assert.equal(e['brief-status'].textContent, 'Brief copied.');
});

for (const clipboard of [undefined, { writeText: async () => { throw new Error('Denied'); } }]) {
  test(`manual copy fallback when clipboard is ${clipboard ? 'denied' : 'unavailable'}`, async () => {
    const { elements: e } = setup(clipboard);
    e['prepare-email'].handlers.click();
    await e['copy-brief'].handlers.click();
    assert.equal(e['brief-text'].selected, true);
    assert.match(e['brief-status'].textContent, /Copy command/);
  });
}

test('changing answers warns about stale preview and preparation refreshes it', () => {
  const { elements: e, choices } = setup();
  e['prepare-email'].handlers.click();
  choices.tool.push('Python');
  e['bottleneck-form'].handlers.input({ target: e['bottleneck-note'] });
  assert.match(e['brief-status'].textContent, /answers changed/);
  e['prepare-email'].handlers.click();
  assert.match(e['brief-text'].value, /Python/);
  assert.match(e['brief-status'].textContent, /Brief ready/);
});
