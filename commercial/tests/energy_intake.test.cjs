const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');
const path = require('node:path');

const html = fs.readFileSync(path.join(__dirname, '../templates/instalatii.html'), 'utf8');
const script = html.match(/<script>([\s\S]*?)<\/script>/)[1];

function element(id) {
  return {
    value: '',
    hidden: id === 'energy-brief-preview',
    textContent: '',
    href: '',
    dataset: {},
    attributes: {},
    handlers: {},
    disabled: false,
    addEventListener(event, handler) {
      this.handlers[event] = handler;
    },
    focus() {
      this.focused = true;
    },
    select() {
      this.selected = true;
    },
    setAttribute(name, value) {
      this.attributes[name] = value;
    },
    removeAttribute(name) {
      delete this.attributes[name];
    },
    classList: {
      values: new Set(),
      add(name) {
        this.values.add(name);
      },
      remove(name) {
        this.values.delete(name);
      }
    }
  };
}

function choice(value, checked = true) {
  return {
    value,
    checked,
    handlers: {},
    addEventListener(event, handler) {
      this.handlers[event] = handler;
    }
  };
}

function setup({ search = '', choices = [], clipboard } = {}) {
  const ids = [...html.matchAll(/id="([^"]+)"/g)].map((match) => match[1]);
  const elements = Object.fromEntries(ids.map((id) => [id, element(id)]));
  const document = {
    getElementById: (id) => elements[id],
    querySelectorAll: (selector) => {
      if (selector.includes('input[name="need"]:checked')) {
        return choices.filter((item) => item.checked);
      }
      if (selector.includes('input[name="need"]')) {
        return choices;
      }
      return [];
    }
  };
  const context = {
    document,
    window: { location: { search } },
    URLSearchParams,
    console
  };
  if (clipboard) context.navigator = { clipboard };
  vm.runInNewContext(script, context);
  return { elements, choices };
}

test('prepares an empty evaluation request without opening email', () => {
  const { elements: e } = setup();

  e['prepare-energy-email'].handlers.click();

  assert.equal(e['energy-brief-preview'].hidden, false);
  assert.match(e['energy-brief-text'].value, /Nespecificată/);
  assert.match(e['energy-brief-text'].value, /Încă nu sunt sigur/);
  assert.equal(e['open-energy-email'].opened, undefined);
});

test('prefills calculator context and includes it in the editable brief', () => {
  const { elements: e } = setup({
    search: '?source=calculator&project=Casa%20Verde&locality=Cluj-Napoca%2C%20Cluj&area=160&energy_class=B&primary_energy=145%20kWh%2Fm%C2%B2%2Fan&co2=30%20kg%2Fm%C2%B2%2Fan&main_loss=Ferestre&main_loss_value=42%20W%2FK'
  });

  assert.equal(e['energy-locality'].value, 'Cluj-Napoca, Cluj');
  assert.equal(e['energy-area'].value, '160');
  assert.equal(e['energy-calculator-context'].hidden, false);
  assert.match(e['energy-calculator-context-text'].textContent, /Casa Verde/);

  e['prepare-energy-email'].handlers.click();

  assert.match(e['energy-brief-text'].value, /Rezumatul calculului:/);
  assert.match(e['energy-brief-text'].value, /Clasă energetică: B/);
  assert.match(e['energy-brief-text'].value, /Ferestre \(42 W\/K\)/);
});

test('edited brief stays synchronized with the mailto body', () => {
  const { elements: e } = setup({
    choices: [choice('Fotovoltaice'), choice('Modernizare & eficiență')],
  });
  e['energy-locality'].value = 'Brașov';
  e['energy-note'].value = 'Verificare 50% & cost';

  e['prepare-energy-email'].handlers.click();

  let url = new URL(e['open-energy-email'].href);
  assert.equal(url.searchParams.get('body'), e['energy-brief-text'].value);
  assert.match(url.searchParams.get('body'), /50% & cost/);
  assert.match(e['energy-brief-text'].value, /Fotovoltaice/);

  e['energy-brief-text'].value = 'Editat & verificat';
  e['energy-brief-text'].handlers.input();
  url = new URL(e['open-energy-email'].href);
  assert.equal(url.searchParams.get('body'), 'Editat & verificat');
});

test('source changes mark the brief stale until explicit regeneration', () => {
  const { elements: e } = setup();

  e['prepare-energy-email'].handlers.click();
  e['energy-locality'].value = 'Iași';
  e['energy-locality'].handlers.input();

  assert.equal(e['copy-energy-brief'].disabled, true);
  assert.match(e['energy-brief-status'].textContent, /s-au schimbat/);

  let prevented = false;
  e['open-energy-email'].handlers.click({
    preventDefault() {
      prevented = true;
    }
  });
  assert.equal(prevented, true);

  e['prepare-energy-email'].handlers.click();
  assert.equal(e['copy-energy-brief'].disabled, false);
  assert.equal(e['open-energy-email'].dataset.stale, undefined);
  assert.match(e['energy-brief-text'].value, /Iași/);
});

test('copy fallback selects the brief when clipboard is unavailable', async () => {
  const { elements: e } = setup();

  e['prepare-energy-email'].handlers.click();
  await e['copy-energy-brief'].handlers.click();

  assert.equal(e['energy-brief-text'].selected, true);
  assert.match(e['energy-brief-status'].textContent, /Textul este selectat/);
});
