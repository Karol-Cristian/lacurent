const {test} = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');
const path = require('node:path');

const source = fs.readFileSync(path.join(__dirname, '../static/home-lab-next.js'), 'utf8');
const helper = source.slice(source.indexOf('  async function fetchWithTimeout('), source.indexOf('  async function calculateState('));

function harness() {
  let calls = 0;
  let signal;
  let release;
  const timers = new Set();
  const request = vm.runInNewContext(helper + '\nfetchWithTimeout;', {
    AbortController, Error, LIVE_REQUEST_TIMEOUT_MS: 20,
    window: {
      setTimeout(fn, ms) { const timer = setTimeout(fn, ms); timers.add(timer); return timer; },
      clearTimeout(timer) { clearTimeout(timer); timers.delete(timer); },
    },
    fetch: async (_url, options) => {
      calls += 1;
      signal = options.signal;
      // Headers arrive immediately; the response body is independently delayed.
      const body = new Promise((resolve, reject) => {
        release = resolve;
        const abort = () => reject(Object.assign(new Error('aborted'), {name:'AbortError'}));
        if (signal.aborted) abort();
        else signal.addEventListener('abort', abort, {once:true});
      });
      body.catch(() => {});
      return {ok:true, status:200, headers:{get:() => 'application/json'}, json:() => body};
    },
  });
  return {request, timers, get calls() { return calls; }, get signal() { return signal; }, release(value) { release(value); }};
}

test('body stalled after headers times out; next explicit request recovers without retry', async () => {
  const h = harness();
  await assert.rejects(h.request('/calculate', {}, null, 20), {name:'TimeoutError'});
  assert.equal(h.signal.aborted, true);
  assert.equal(h.calls, 1);
  assert.equal(h.timers.size, 0);
  const next = h.request('/calculate', {}, null, 100);
  h.release({annual_cost_lei:123});
  const result = await next;
  assert.equal(result.payload.annual_cost_lei, 123);
  assert.equal(h.calls, 2);
  assert.equal(h.timers.size, 0);
});

test('parent cancellation still reaches body after headers arrive', async () => {
  const h = harness();
  const parent = new AbortController();
  const pending = h.request('/calculate', {}, parent.signal, 100);
  await new Promise(resolve => setImmediate(resolve));
  parent.abort();
  await assert.rejects(pending, {name:'AbortError'});
  assert.equal(h.signal.aborted, true);
  assert.equal(h.timers.size, 0);
  assert.equal(h.calls, 1);
});

test('successful body clears timer and detaches parent listener', async () => {
  const h = harness();
  const parent = new AbortController();
  const pending = h.request('/calculate', {}, parent.signal, 100);
  h.release({ok:true});
  const result = await pending;
  assert.equal(result.payload.ok, true);
  assert.equal(h.timers.size, 0);
  parent.abort();
  assert.equal(h.signal.aborted, false);
});


test('optimizer transient 500/503 responses are retried and eventually succeed', async () => {
  let calls = 0;
  const timers = new Set();
  const helperSource = source.slice(
    source.indexOf('  async function fetchWithTimeout('),
    source.indexOf('  async function calculateState(')
  );
  const request = vm.runInNewContext(helperSource + '\nfetchOptimizerWithRetry;', {
    AbortController, Error, Set,
    LIVE_REQUEST_TIMEOUT_MS: 20,
    OPTIMIZER_REQUEST_TIMEOUT_MS: 100,
    window: {
      setTimeout(fn, ms) {
        const timer = setTimeout(fn, Math.min(ms, 1));
        timers.add(timer);
        return timer;
      },
      clearTimeout(timer) { clearTimeout(timer); timers.delete(timer); },
    },
    fetch: async () => {
      calls += 1;
      const status = calls === 1 ? 503 : calls === 2 ? 500 : 200;
      return {
        ok: status === 200,
        status,
        headers:{get:() => 'application/json'},
        json: async () => status === 200 ? {ok:true} : {error:'transient'},
      };
    },
  });

  const result = await request('/api/optimization/home-lab/branch', {}, null, 100, 4);
  assert.equal(result.response.status, 200);
  assert.equal(result.payload.ok, true);
  assert.equal(result.attemptCount, 3);
  assert.equal(calls, 3);
});

test('optimizer does not retry logical 422 responses', async () => {
  let calls = 0;
  const helperSource = source.slice(
    source.indexOf('  async function fetchWithTimeout('),
    source.indexOf('  async function calculateState(')
  );
  const request = vm.runInNewContext(helperSource + '\nfetchOptimizerWithRetry;', {
    AbortController, Error, Set,
    LIVE_REQUEST_TIMEOUT_MS: 20,
    OPTIMIZER_REQUEST_TIMEOUT_MS: 100,
    window: {
      setTimeout,
      clearTimeout,
    },
    fetch: async () => {
      calls += 1;
      return {
        ok:false,
        status:422,
        headers:{get:() => 'application/json'},
        json: async () => ({error:'invalid input'}),
      };
    },
  });

  const result = await request('/api/optimization/home-lab/branch', {}, null, 100, 4);
  assert.equal(result.response.status, 422);
  assert.equal(result.attemptCount, 1);
  assert.equal(calls, 1);
});
