// Run with Node.js 18+: node tests/dashboard.cjs (no dependencies or network).
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const root = path.resolve(__dirname, '..');
const bundle = fs.readFileSync(path.join(root, 'assets/page-bundle.txt'), 'utf8');
const applyPageUpdates = require('../page-updates.js');
const pages = JSON.parse(bundle.match(/const pages=(.*?);const lang=/s)[1]);
const retired = /\$MICRO|\$BIO|Bio Protocol|BioAgents|stonkfun|href=["']#(?:token|eco)["']/i;

// Minimal DOM for renderer and polling regressions. This does not test layout.
class Element {
  constructor(tag = 'div') { this.tagName = tag; this.children = []; this.style = {}; this.attributes = {}; this._text = ''; this._html = ''; }
  set textContent(value) { this._text = String(value); this.children = []; }
  get textContent() { return this._text + this.children.map(c => c.textContent).join(''); }
  set innerHTML(value) { this._html = value; this.children = []; this._text = ''; }
  get innerHTML() { return this._html; }
  append(...children) { this.children.push(...children); }
  appendChild(child) { this.append(child); }
  replaceChildren(...children) { this.children = children; this._text = ''; this._html = ''; }
  setAttribute(key, value) { this.attributes[key] = value; }
}
const slice = (source, start, end) => {
  const a = source.indexOf(start), b = source.indexOf(end, a);
  assert.ok(a >= 0 && b > a, `Missing source boundaries: ${start}`);
  return source.slice(a, b);
};
const all = element => [element, ...element.children.flatMap(all)];
const now = 1790015523;
const keys = ['elegans', 'ciona', 'platynereis'];
const reason = 'unresolved order intent; manual reconciliation required';
const state = {
  ts: now, mode: 'testnet', market: {universe: 'BTC, ETH', mids: {}},
  creatures: keys.map((key, i) => ({key, name: key, neurons: 279 + i, equity: [951.88, 982, 926.47][i],
    position: {side: 'FLAT'}, brain: {}, data_fresh: true, blocked_reason: reason,
    pipeline: {gates: [], depth: 0, execution: {action: 'blocked', reason: 'pending intent or open exchange orders'}, stop_reason: 'pending intent or open exchange orders'}})),
  ledger: keys.map((organism, i) => ({organism, ts: now - 10 + i, side: 'LONG', action: 'blocked', result: {reason}}))
};
const archive = keys.map((organism, i) => ({organism, ts: now - 9 + i, action: 'decision', result: {ts: now - 10 + i, symbol: 'ETH', side: 'LONG'}}));
archive.push({organism: 'elegans', ts: now - 1800, action: 'decision', result: {symbol: 'BTC', side: 'SHORT'}});

(async () => {
  for (const [lang, data] of Object.entries(pages)) {
    const html = applyPageUpdates(Buffer.from(data, 'base64').toString('utf8'), lang);
    assert.ok(!retired.test(html), `${lang}: retired content still shipped`);
    const scripts = [...html.matchAll(/<script\b[^>]*>(.*?)<\/script>/gs)].map(m => m[1]);
    scripts.forEach(s => new vm.Script(s));
    const source = scripts.find(s => s.includes('const HIST ='));
    const elements = new Map();
    const get = id => { if (!elements.has(id)) elements.set(id, new Element()); return elements.get(id); };
    let failState = false, failLedger = false;
    const context = vm.createContext({
      document: {getElementById: get, createElement: tag => new Element(tag), createTextNode: text => {const n = new Element('#text'); n.textContent = text; return n;}},
      window: {}, console: {warn() {}}, Date, AbortSignal, tr: s => s,
      drawLog() {}, pullVerifiedHistory() {}, dkPushPx() {}, dkUpdate() {}, dkDrawChart() {}, drawLB() {}, updateBrainStats() {},
      fetch: async url => {
        if (url.includes('/api/state')) { if (failState) throw Error('offline'); return {ok: true, json: async () => structuredClone(state)}; }
        assert.ok(url.includes('/api/ledger'));
        if (failLedger) throw Error('offline');
        return {ok: true, json: async () => ({entries: archive})};
      }
    });
    const run = code => vm.runInContext(code, context);
    run(slice(source, 'const HIST =', 'const P4=') +
      `const C=${JSON.stringify(keys.map((key, i) => ({key, name: key, nn: '302 N', col: '#5DCAA5', sw: '#5DCAA5'})))};` +
      slice(source, 'function drawRace(){', 'function drawLB(){') +
      slice(source, 'const GATES=', '// ---------- TRADE TIMELINE') +
      slice(source, 'const TL_HOURS=', 'function drawLog(') +
      slice(source, "const API =", '// ---------- INDEPENDENT VERIFICATION'));
    run('drawRace()'); assert.match(get('race-svg').innerHTML, /Awaiting account data/);
    await run('pull()'); await new Promise(resolve => setImmediate(resolve));
    assert.equal((get('race-svg').innerHTML.match(/<circle/g) || []).length, 3, 'first poll renders every account');
    assert.equal((get('race-svg').innerHTML.match(/<polyline/g) || []).length, 0, 'one sample is a point, not invented history');
    await run('pull()');
    assert.equal((get('race-svg').innerHTML.match(/<polyline/g) || []).length, 3, 'subsequent polls redraw the curves');
    assert.match(get('race-status').textContent, /Live account samples/);
    const gates = all(get('gwrap'));
    assert.equal(gates.filter(n => n.className === 'gcell gfail').length, 0, 'an empty gate trace never becomes failed G1');
    assert.equal(gates.filter(n => n.className === 'gcell gskip').length, 24);
    assert.match(get('gwrap').textContent, /Execution blocked/);
    assert.match(get('gwrap').textContent, /manual reconciliation required/);
    assert.equal(run('TRADES.length'), 4, 'signal and execution outcome merge into one event');
    assert.equal(run('TRADES.filter(e=>e.action==="blocked").length'), 3);
    assert.equal(run('TRADES.filter(e=>e.sym==="ETH").length'), 3, 'archive supplies actual symbols');
    assert.equal(get('tlcount').textContent, '4 decision events');
    run(`mergeDecisions([{organism:'elegans',ts:null},{organism:'elegans',ts:${now - 13*3600}},{organism:'unknown',ts:${now}}]);drawTimeline()`);
    assert.equal(run('TRADES.length'), 4, 'invalid, unknown and expired events excluded');
    assert.match(get('tlfeed').textContent, /earlier events may not be retained/);
    assert.match(get('tlfeed').textContent, /manual reconciliation required/);
    // Replaying the persistent signal must not erase a known blocked outcome.
    run('decisionHistoryAt=0'); await run('pullDecisionHistory()');
    assert.equal(run('TRADES.filter(e=>e.action==="blocked").length'), 3);
    run('C[0].pipe={gates:[{id:"G1",passed:true},{id:"G2",passed:false}],depth:1};C[0].blockedReason=null;drawGates()');
    assert.equal(all(get('gwrap')).filter(n => n.className === 'gcell gpass').length, 1);
    assert.equal(all(get('gwrap')).filter(n => n.className === 'gcell gfail').length, 1);
    failState = true; await run('pull()');
    assert.match(get('race-status').textContent, /may be stale/);
    assert.equal((get('race-svg').innerHTML.match(/<polyline/g) || []).length, 3, 'failure preserves previous curves');
    failLedger = true; run('decisionHistoryAt=0'); await run('pullDecisionHistory()');
    assert.match(get('tlfeed').textContent, /unavailable/);
    assert.equal(get('tlcount').textContent, '4 decision events', 'a failed history request does not erase events');
    // Real empty history is distinct from loading and failure.
    run('decisionEvents.clear();TRADES=[];decisionLoaded=true;decisionHistoryFailed=false;drawTimeline()');
    assert.equal(get('tlcount').textContent, '0 decision events');
    assert.match(get('tlfeed').textContent, /No recorded decision events/);
    console.log(`${lang}: polling, charts, gate traces, timeline, deduplication and failure states passed`);
  }
  for (const name of fs.readdirSync(path.join(root, 'locales'))) {
    const source = fs.readFileSync(path.join(root, 'locales', name), 'utf8');
    new vm.Script(source); assert.ok(!retired.test(source), `${name}: retired catalog entry`);
    if (name !== 'en.js') {
      const context = {window: {}}; vm.runInNewContext(source, context);
      for (const key of ['Execution blocked', 'Checks not reported', 'Awaiting account data', 'Loading decisions…'])
        assert.ok(context.window.MICRO_MESSAGES[key], `${name}: missing ${key}`);
    }
  }
  console.log('All eight locale catalogs passed');
})().catch(error => {console.error(error); process.exitCode = 1;});
