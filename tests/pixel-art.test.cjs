// Renderer lifecycle smoke test. Actual artwork and hit alignment are checked in-browser.
const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');
const path = require('node:path');
let now = 0, resizeObserver, canvas, draws = 0, reduced = false;
const classes = new Set();
const context = { fillRect() {}, clearRect() {}, drawImage() { draws++; }, save() {}, restore() {}, scale() {}, translate() {} };
const scene = { classList: { contains: name => classes.has(name) }, prepend(el) { canvas = el; }, getBoundingClientRect: () => ({width:720,height:646,left:0,top:0}) };
const safe = { getBoundingClientRect: () => ({width:448,height:469,left:130,top:80}) };
const scope = {
  console, performance: { now: () => now },
  window: { innerWidth:1280, addEventListener() {}, matchMedia: () => ({ matches: reduced }) },
  document: { activeElement:null, querySelector: () => scene, getElementById: () => safe, createElement: () => ({ width:0,height:0,setAttribute() {},getContext: () => context }) },
  ResizeObserver: class { constructor(fn) { resizeObserver=fn; } observe() {} }
};
vm.runInNewContext(fs.readFileSync(path.join(__dirname,'../pixel-art.js'),'utf8'),scope);
const state = { angle:0,stage:0,loot:'key',sweet:false };
const render = () => scope.window.SafecrackerArt.draw(state);
render(); assert(canvas.width>0&&canvas.height>0); assert(draws>0);
const initial=draws; render(); assert.equal(draws,initial,'Unchanged scenes should use the cached frame.');
resizeObserver(); render(); assert(draws>initial,'A resize must redraw even when dimensions and game state match.');
const resized=draws; state.angle=25; render(); assert(draws>resized,'Dial movement must redraw.');
classes.add('retracting'); render(); now=500; render();
classes.add('open'); render(); now=2000; render(); assert(draws>resized+4,'Unlock animation must advance.');
reduced=true; now=2100; render();
classes.clear();state.angle=0;render();
reduced=false; state.animationTime=0; classes.clear(); render(); classes.add('open'); render(); state.animationTime=500; render(); const pausedDraws=draws; now+=5000; render(); assert.equal(draws,pausedDraws,'The pitch preview clock must pause door animation independently of wall time.');
console.log('PASS pixel renderer: first paint, static caching, resize repaint, dial motion, unlock animation, reduced motion, reset, and paused preview clock.');
