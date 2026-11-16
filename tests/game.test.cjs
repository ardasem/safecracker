// Dependency-free state-machine tests. UI rendering is verified separately in a browser.
const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');
class Element {
  constructor() { this.children = []; this.attributes = {}; this.hidden = true; this.style = {}; this.textContent = ''; this.listeners = {}; this.isConnected = true; const classes = new Set(); this.classList = { add: (...v) => v.forEach(x => classes.add(x)), remove: (...v) => v.forEach(x => classes.delete(x)), toggle: (x, yes) => yes ? classes.add(x) : classes.delete(x), contains: x => classes.has(x) }; }
  set innerHTML(v) { this.html = v; }
  get innerHTML() { return this.html || ''; }
  setAttribute(k, v) { this.attributes[k] = v; }
  addEventListener(k, fn) { this.listeners[k] = fn; }
  focus() {}
}
function setup(saved, blockStorage = false, demo = false) {
  const elements = new Map(); const get = id => { if (!elements.has(id)) elements.set(id, new Element()); return elements.get(id); };
  get('tumblers').children = Array.from({length: 3}, () => { const el = new Element(); el.firstElementChild = new Element(); el.lastElementChild = new Element(); return el; });
  get('signal-bars').children = Array.from({length: 24}, () => new Element());
  const windowListeners = {}; let storageAccesses = 0;
  const body = new Element(); let now = 100, timers = [], storage = saved ? JSON.stringify(saved) : null;
  const context = { console, Math, document: { getElementById: get, querySelector: get, body, addEventListener() {} }, window: { SafecrackerDemo:demo, parent:{}, addEventListener(type,fn) { windowListeners[type]=fn; }, scrollTo() {} }, performance: { now: () => now }, localStorage: { getItem() { storageAccesses++; if (blockStorage) throw Error('blocked'); return storage; }, setItem(k, v) { storageAccesses++; if (blockStorage) throw Error('blocked'); storage = v; } }, setTimeout: fn => { timers.push(fn); return fn; }, clearTimeout: id => { timers = timers.filter(x => x !== id); }, requestAnimationFrame() {} };
  const source = fs.readFileSync(require('node:path').join(__dirname, '../game.js'), 'utf8').replace('  buildDial(); workshop(); requestAnimationFrame(frame);', `  globalThis.test = { startJob, openWorkshopView, contractFor, turn, setTumbler, signal, tolerance, pause, resume, workshop, frame, timeText, wrap, distance, save, win, get run() { return run; }, get progress() { return progress; }, get mode() { return mode; }, get velocity() { return velocity; } }; buildDial(); workshop();`);
  context.window.SafecrackerEconomy = require('../economy.js');
  vm.runInNewContext(source, context);
  return { api: context.test, get, storageAccesses:()=>storageAccesses, message:(data,fromParent=true)=>windowListeners.message?.({data,source:fromParent?context.window.parent:{}}), flush: () => { const batch = timers; timers = []; batch.forEach(fn => fn()); }, tick: milliseconds => { now += milliseconds; context.test.frame(now); }, storage: () => JSON.parse(storage) };
}
let checks = 0;
function test(name, fn) { fn(); checks++; console.log('PASS ' + name); }
function align(a) { const r = a.run, direction = r.stage === 1 ? -1 : 1; const delta = direction === 1 ? a.wrap(r.targets[r.stage] - a.wrap(r.angle)) : -a.wrap(a.wrap(r.angle) - r.targets[r.stage]); a.turn(delta || direction * .01); }
test('minute boundary formatting and circular distance', () => { const {api:a} = setup(); assert.equal(a.timeText(59.9), '01:00'); assert.equal(a.timeText(60.1), '01:01'); assert.equal(a.timeText(0), '00:00'); assert.equal(a.distance(99, 1), 2); });
test('all tiers and randomized target sequences can be completed exactly once', () => { for(let tier=0;tier<3;tier++) for(let i=0;i<50;i++) { const h=setup(),a=h.api; a.startJob(tier); for(let stage=0;stage<3;stage++) { align(a); assert(a.signal().sweet); a.setTumbler(); h.flush(); } assert.equal(a.mode,'success'); assert.equal(a.progress.completed,1); assert.equal(a.run.hits,3); assert(a.progress.cash >= [100,350,1000][tier]); const earned=a.progress.cash; a.setTumbler(); h.flush(); assert.equal(a.progress.cash,earned); assert.equal(h.storage().completed,1); } });
test('wrong direction and low signal explain failure and deduct time', () => { const h=setup(),a=h.api; a.startJob(); a.turn(-1); a.setTumbler(); assert.equal(a.run.time,87); assert.match(h.get('feedback').textContent,/Wrong approach/); a.turn(1); a.setTumbler(); assert.equal(a.run.time,84); assert.equal(a.run.hits,0); assert.equal(a.run.attempts,2); });
test('timer waits for first movement, pauses, resumes, expires, and retries', () => { const h=setup(),a=h.api; a.startJob(2); h.tick(100); assert.equal(a.run.time,60); a.turn(1); h.tick(100); assert(a.run.time<60); a.pause(); const time=a.run.time; h.tick(100); assert.equal(a.run.time,time); a.resume(); a.run.time=.01; h.tick(100); assert.equal(a.mode,'failed'); assert.equal(a.progress.cash,0); a.startJob(2); assert.equal(a.mode,'playing'); assert.equal(a.run.time,60); assert.equal(a.run.attempts,0); });
test('tutorial tolerance and toolkit affect actual alignment', () => { const h=setup(),a=h.api; a.startJob(); assert.equal(a.tolerance(),4.5); a.progress.upgrades.push('kit'); assert.equal(a.tolerance(),5.15); a.startJob(2); assert(Math.abs(a.tolerance()-1.45)<1e-9); });
test('sensor expands detection and precision grip changes nudge amount', () => { const h=setup(),a=h.api; a.startJob(2); a.run.angle=a.run.targets[0]-15; assert.equal(a.signal().power,0); a.progress.upgrades.push('sensor'); assert(a.signal().power>0); const before=a.run.angle; h.get('nudge-right').listeners.click(); assert(Math.abs(a.run.angle-before-.35)<1e-9); a.progress.upgrades.push('grip'); const fine=a.run.angle; h.get('nudge-right').listeners.click(); assert(Math.abs(a.run.angle-fine-.2)<1e-9); });
test('upgrade purchases charge once and survive reload', () => { const h=setup({cash:2000,rep:120,completed:4,upgrades:[]}),a=h.api; const buy=id => h.get('upgrades').listeners.click({target:{closest:()=>({dataset:{upgrade:id}})}}); buy('grip'); assert.equal(a.progress.cash,1750); buy('grip'); assert.equal(a.progress.cash,1750); buy('sensor'); buy('kit'); assert.equal(a.progress.cash,250); const reload=setup(h.storage()); assert.equal(reload.api.progress.upgrades.length,3); assert.equal(reload.api.progress.cash,250); });
test('leave confirmation cancels without losing the active job', () => { const h=setup(),a=h.api; a.startJob(); a.turn(1); h.get('leave-job').listeners.click(); assert(a.run.paused); h.get('modal-cancel').listeners.click(); assert.equal(a.run.paused,false); assert.equal(a.mode,'playing'); });
test('reset is confirmed, clears saved purchases, and cancels pending animation', () => { const h=setup({cash:2000,rep:120,completed:4,upgrades:['kit']}),a=h.api; h.get('reset-progress').listeners.click(); assert.equal(a.progress.cash,2000); h.get('modal-confirm').listeners.click(); assert.equal(a.progress.cash,0); assert.equal(a.progress.upgrades.length,0); assert.equal(h.storage().completed,0); assert.equal(a.mode,'workshop'); });
test('unavailable storage leaves a fully playable session', () => { const h=setup(null,true),a=h.api; a.startJob(); for(let i=0;i<3;i++){align(a);a.setTumbler();h.flush();} assert.equal(a.mode,'success'); assert.match(h.get('save-status').textContent,/SESSION ONLY/); });

test('owned safe failure and retry retain the safe; success transfers finds without client pay', () => { const E=require('../economy.js'); const h=setup({cash:500,rep:0,completed:0,upgrades:[]}),a=h.api; const safe=E.buySafe(a.progress,0,()=>.2).safe; const contents=JSON.stringify(safe.contents),funds=a.progress.cash; a.startJob(0,safe.id); a.run.started=true; a.run.time=.01; h.tick(100); assert.equal(a.mode,'failed'); assert.equal(a.progress.economy.ownedSafes.length,1); assert.equal(JSON.stringify(a.progress.economy.ownedSafes[0].contents),contents); h.get('next-job').listeners.click(); assert.equal(a.run.ownedSafeId,safe.id); for(let i=0;i<3;i++){align(a);a.setTumbler();h.flush();} assert.equal(a.mode,'success'); assert.equal(a.progress.cash,funds); assert.equal(a.progress.completed,0); assert.equal(a.progress.economy.ownedSafes.length,0); assert.equal(a.progress.economy.items.length,safe.contents.length); assert.equal(h.get('result-total-label').textContent,'ESTIMATED HAMMER VALUE'); });
test('client jobs return contents and pay fees without adding player inventory', () => { const h=setup(),a=h.api; a.startJob(0); for(let i=0;i<3;i++){align(a);a.setTumbler();h.flush();} assert.equal(a.progress.economy.items.length,0); assert.equal(a.progress.economy.ownedSafes.length,0); assert(a.progress.cash>=100); assert.equal(h.get('result-total-label').textContent,'TOTAL EARNED'); assert.equal(a.progress.completed,1); });
test('nine client briefs rotate with completed work and preserve tier rewards', () => { const h=setup(),a=h.api,names=new Set(); for(let completed=0;completed<3;completed++){a.progress.completed=completed; for(let tier=0;tier<3;tier++){const job=a.contractFor(tier);names.add(job.title);assert.equal(job.pay,[100,350,1000][tier]);}} assert.equal(names.size,9); });
test('legacy progress keeps money and equipment when adding the collection', () => { const h=setup({cash:1240,rep:82,completed:6,upgrades:['grip']}),a=h.api; assert.equal(a.progress.cash,1240);assert.equal(a.progress.upgrades[0],'grip');assert.equal(a.progress.economy.items.length,0);a.save();const next=setup(h.storage());assert.equal(next.api.progress.cash,1240);assert.equal(next.api.progress.completed,6); });

test('embedded pitch uses session funds, never touches game saves, and pauses on exit', () => {
  const h=setup({cash:9999,completed:12},true,true),a=h.api;
  assert.equal(a.progress.cash,100);assert.equal(a.progress.completed,0);assert.equal(h.storageAccesses(),0);
  a.save();assert.equal(h.storageAccesses(),0);assert.match(h.get('save-status').textContent,/DEMO SESSION/);
  a.startJob();a.turn(1);h.message('safecracker:pause',false);assert.equal(a.run.paused,false);
  h.message('safecracker:pause');assert.equal(a.run.paused,true);a.resume();assert.equal(a.run.paused,false);
  h.get('reset-progress').listeners.click();h.get('modal-confirm').listeners.click();assert.equal(a.progress.cash,100);assert.equal(h.storageAccesses(),0);
});
console.log(`\n${checks} checks passed, including 150 randomized complete contracts.`);
