'use strict';
(() => {
  const $ = id => document.getElementById(id);
  const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
  const wrap = v => ((v % 100) + 100) % 100;
  const distance = (a, b) => Math.abs(((a - b + 150) % 100) - 50);
  const currency = n => '$' + Math.round(n).toLocaleString('en-US');
  const timeText = n => { const seconds = Math.ceil(Math.max(0, n)); return `${String(Math.floor(seconds / 60)).padStart(2, '0')}:${String(seconds % 60).padStart(2, '0')}`; };
  const Economy = window.SafecrackerEconomy;
  const demo = window.SafecrackerDemo === true;
  let workshopView = 'jobs';
  const STORAGE = 'safecracker.progress.v1';
  const jobs = [
    { title: 'Forgotten Combination', client: 'Old apartment owner', time: 90, pay: 100, tolerance: 3.5, range: 22, rep: 15, level: 'EASY', series: 'A', note: 'A familiar keepsake, a forgotten number. A forgiving mechanism makes this a good place to begin.' },
    { title: 'Antique Safe', client: 'Antique shop', time: 75, pay: 350, tolerance: 1.65, range: 15, rep: 30, level: 'MEDIUM', series: 'B', note: 'Decades of secrets behind a delicate mechanism. Slow down when the signal starts to climb.' },
    { title: 'Private Vault', client: 'Wealthy collector', time: 60, pay: 1000, tolerance: .8, range: 11, rep: 50, level: 'EXPERT', series: 'C', note: 'A demanding commission. Narrow sweet spots reward a steady hand and careful listening.' }
  ];
  const upgrades = [
    { id: 'grip', title: 'Precision Dial Grip', cost: 250, icon: '◎', text: 'Smoother stops. Finer control.', detail: 'Precision grip fitted. Gentler acceleration and reduced drift near a target.' },
    { id: 'sensor', title: 'Acoustic Sensor', cost: 500, icon: '≋', text: 'Hear the subtle differences.', detail: 'Acoustic sensor fitted. Wider detection range and a precise distance readout.' },
    { id: 'kit', title: 'Professional Toolkit', cost: 1000, icon: '⚒', text: 'A little more room for precision.', detail: 'Toolkit fitted. Every sweet spot is 0.65 positions wider on each side.' }
  ];
  const discoveries = [
    { name: 'A neatly bundled rainy-day fund', kind: 'cash', bonus: 20, story: '“I knew I put it somewhere safe.” Your client can finally breathe again.' },
    { name: 'A gold watch, still ticking', kind: 'watch', bonus: 35, story: 'An inscription on the back: “For all the time we have.” Some things are priceless.' },
    { name: 'An heirloom emerald necklace', kind: 'jewel', bonus: 45, story: 'A little tarnished, a little extraordinary. A family story finds its way home.' },
    { name: 'Letters tied with a faded ribbon', kind: 'letters', bonus: 15, story: 'Forty years of letters, carefully kept. Your client asks for a moment alone.' },
    { name: 'A rare, beautifully worn coin', kind: 'coin', bonus: 30, story: 'A collector’s favorite, missing for years. That smile is worth the work.' },
    { name: 'A brass key marked “Room 09”', kind: 'key', bonus: 60, story: 'No address. No explanation. Just a small key, and the beginning of another mystery.' }
  ];
  const fresh = () => ({ cash: demo ? 100 : 0, rep: 0, completed: 0, upgrades: [], sound: true, tutorialDone: false, economy: Economy.fresh() });
  let progress = fresh(), storageAvailable = true;
  try {
    const saved = demo ? null : JSON.parse(localStorage.getItem(STORAGE));
    if (saved && typeof saved === 'object') {
      for (const key of ['cash', 'rep', 'completed']) if (Number.isFinite(saved[key]) && saved[key] >= 0) progress[key] = Math.floor(saved[key]);
      progress.upgrades = Array.isArray(saved.upgrades) ? saved.upgrades.filter(x => upgrades.some(u => u.id === x)) : [];
      progress.sound = saved.sound !== false;
      progress.tutorialDone = saved.tutorialDone === true;
      progress.economy = Economy.restore(saved.economy);
    }
  } catch { storageAvailable = false; }
  let selected = 0, mode = 'workshop', run = null, velocity = 0, keys = new Set(), drag = null;
  let lastFrame = performance.now(), lastTick = 0, lastResonance = 0, feedbackUntil = 0;
  let pendingTimers = [], toastTimer, modalAction, modalReturnFocus;
  let audioContext;
  const scene = document.querySelector('.scene');
  const has = id => progress.upgrades.includes(id);
  function save() {
    if (demo) { $('save-status').textContent = 'DEMO SESSION · STARTING FUNDS $100'; return; }
    try { localStorage.setItem(STORAGE, JSON.stringify(progress)); storageAvailable = true; }
    catch { storageAvailable = false; }
    $('save-status').textContent = demo ? 'DEMO SESSION · STARTING FUNDS $100' : storageAvailable ? 'PROGRESS SAVED LOCALLY' : 'STORAGE UNAVAILABLE · SESSION ONLY';
  }
  function toast(message) { $('toast').textContent = message; $('toast').classList.add('visible'); clearTimeout(toastTimer); toastTimer = setTimeout(() => $('toast').classList.remove('visible'), 3500); }
  function initAudio() {
    if (!progress.sound) return;
    try { const Audio = window.AudioContext || window.webkitAudioContext; if (!Audio) return; audioContext ||= new Audio(); if (audioContext.state === 'suspended') audioContext.resume().catch(() => {}); } catch { /* Visual feedback remains fully usable without audio. */ }
  }
  function tone(freq, duration, type = 'sine', volume = .08, delay = 0, endFreq = freq) {
    if (!progress.sound || !audioContext || audioContext.state !== 'running') return;
    const start = audioContext.currentTime + delay;
    const oscillator = audioContext.createOscillator(), gain = audioContext.createGain();
    oscillator.type = type; oscillator.frequency.setValueAtTime(freq, start); oscillator.frequency.exponentialRampToValueAtTime(Math.max(20, endFreq), start + duration);
    gain.gain.setValueAtTime(.0001, start); gain.gain.exponentialRampToValueAtTime(volume, start + .004); gain.gain.exponentialRampToValueAtTime(.0001, start + duration);
    oscillator.connect(gain); gain.connect(audioContext.destination); oscillator.start(start); oscillator.stop(start + duration + .02);
  }
  function tick(strength = 0) { tone(320 + strength * 950, .023 + strength * .015, 'triangle', .025 + strength * .06, 0, 160 + strength * 360); }
  function clunk() { tone(145, .18, 'triangle', .2, 0, 35); tone(900, .04, 'square', .045, .045, 150); }
  function errorSound() { tone(130, .18, 'sawtooth', .04, 0, 80); }
  function successSound() { [392, 494, 587, 784].forEach((n, i) => tone(n, .6, 'sine', .09, i * .12)); }
  function later(fn, delay) { const id = setTimeout(fn, delay); pendingTimers.push(id); }
  function clearTimers() { pendingTimers.forEach(clearTimeout); pendingTimers = []; }
  function shake(className) { scene.classList.remove(className); void scene.offsetWidth; scene.classList.add(className); later(() => scene.classList.remove(className), 350); }
  function updateAccount() {
    $('funds').textContent = currency(progress.cash);
    const level = 1 + Math.floor(progress.rep / 100);
    const rank = level < 3 ? 'APPRENTICE' : level < 6 ? 'CRAFTSPERSON' : 'MASTER';
    $('reputation').innerHTML = `${String(level).padStart(2, '0')} <small>${rank}</small>`;
    $('reputation').title = `${progress.rep} reputation · ${100 - progress.rep % 100} to next level`;
    $('collection-count').textContent = String(progress.economy.ownedSafes.length + progress.economy.items.length);
    $('completed').textContent = `${String(progress.completed).padStart(2, '0')} JOBS COMPLETED`;
    $('sound').setAttribute('aria-pressed', String(progress.sound));
    $('sound').setAttribute('aria-label', progress.sound ? 'Mute sound' : 'Enable sound');
    $('sound').textContent = progress.sound ? '♪' : '♩';
    $('save-status').textContent = demo ? 'DEMO SESSION · STARTING FUNDS $100' : storageAvailable ? 'PROGRESS SAVED LOCALLY' : 'STORAGE UNAVAILABLE · SESSION ONLY';
  }
  const clientBriefs = [
    [
      { title:'Forgotten Combination', client:'Mrs. Bell · apartment owner', note:'“My husband kept our letters in there. I would like to read them again.”', expectedKind:'letters', outcome:'Mrs. Bell recognizes the faded ribbon immediately. The letters are returned, and she leaves a small tip with your fee.' },
      { title:'The station retirement', client:'Arthur Pike · retired stationmaster', note:'“They gave me a watch on my last day. Then I forgot where I put the combination.”', expectedKind:'watch', outcome:'The retirement watch is back with its owner. Arthur winds it, smiles, and insists you take a little extra.' },
      { title:'A room to remember', client:'Nora Vale · former hotel keeper', note:'“It is only an old room key. But I promised I would never lose it.”', expectedKind:'key', outcome:'Nora turns the key over in her hand. Room 09 meant more than she ever said. Your fee and tip are paid.' }
    ],
    [
      { title:'The silver consignment', client:'Mara Bell · antique dealer', note:'“The coin belongs to a customer. The safe belongs to a maker who disappeared in 1912.”', expectedKind:'coin', outcome:'Mara checks the silver crown against her consignment sheet. Everything is accounted for; your fee and tip are paid.' },
      { title:'The family emerald', client:'The Whitmore estate', note:'“The pendant must reach our granddaughter before the estate is settled.”', expectedKind:'jewel', outcome:'The emerald pendant is packed for the granddaughter. The estate pays your invoice with a generous gratuity.' },
      { title:'Curtain call', client:'June Finch · theatre archivist', note:'“There may be the only surviving copy of the original final act inside.”', expectedKind:'letters', outcome:'June finds the missing pages and carefully returns them to their folder. The archive pays your fee and a discovery tip.' }
    ],
    [
      { title:'The private collection', client:'Elias Voss · wealthy collector', note:'“A presentation coin. I would prefer that no one else handle it.”', expectedKind:'coin', outcome:'Voss verifies the presentation coin under a loupe. Satisfied, he pays the agreed fee and a discreet tip.' },
      { title:'The midnight necklace', client:'Calder Gallery · curator', note:'“The sapphire piece opens our exhibition tomorrow. The vault has other plans.”', expectedKind:'jewel', outcome:'The sapphire necklace can finally take its place in the exhibition. The gallery pays your fee and a rush-job tip.' },
      { title:'The navigator’s legacy', client:'Northern Star Maritime Society', note:'“Our founder’s chronometer is sealed inside. Please bring its story back.”', expectedKind:'watch', outcome:'The society identifies the chronometer by its engraved ship number. Your work earns the full commission and a thank-you tip.' }
    ]
  ];
  function contractFor(tier) {
    return { ...jobs[tier], ...clientBriefs[tier][progress.completed % clientBriefs[tier].length] };
  }
  const escapeHtml = value => String(value).replace(/[&<>"']/g, ch => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[ch]));
  const rangeText = bounds => `${currency(bounds[0])}–${currency(bounds[1])}`;
  function tradeArt(kind, tier = 0) {
    const art = window.SafecrackerArt;
    if (kind === 'safe' && art?.safeIcon) return `<img src="${art.safeIcon(tier)}" alt="" class="trade-sprite safe-sprite">`;
    if (art?.itemIcon) return `<img src="${art.itemIcon(kind)}" alt="" class="trade-sprite item-sprite">`;
    return `<span class="trade-art-fallback" aria-hidden="true">${kind === 'safe' ? '▣' : '◇'}</span>`;
  }
  function openWorkshopView(view) {
    if (mode !== 'workshop' || !['jobs','market','auction','collection'].includes(view)) return;
    workshopView = view; $('workshop-nav').hidden = false;
    for (const button of $('workshop-nav').children) button.setAttribute('aria-pressed', String(button.dataset.view === view));
    $('workbench').hidden = view !== 'jobs'; $('trade-hub').hidden = view === 'jobs'; $('equipment').hidden = view !== 'jobs';
    const headings = { jobs:['YOUR WORKSHOP','Every lock has a story.','Work for clients. Build your funds. Find something worth keeping.'], market:['THE SAFE DEALER','Buy the mystery.','Sealed safes, honest clues. Everything inside belongs to you.'], auction:['TOWN AUCTION HOUSE','Know when to raise.','Bid for unopened safes, or put your own discoveries under the hammer.'], collection:['YOUR COLLECTION','Finders, keepers.','Unopened safes and the stories you have uncovered.'] };
    $('chapter').textContent = 'EST. 1984 / ' + headings[view][0]; $('headline').textContent = headings[view][1]; $('subhead').textContent = headings[view][2];
    if (view === 'auction' && !progress.economy.auction) { Economy.newAuction(progress, 0); save(); }
    if (view !== 'jobs') renderTrade();
    updateAccount(); window.scrollTo(0, 0);
  }
  function emptyCollection(title, copy, action, button, compact = false) {
    return `<div class="empty-collection ${compact ? 'compact' : ''}"><span class="empty-icon" aria-hidden="true">▧</span><h3>${title}</h3><p>${copy}</p><button class="secondary" data-action="${action}">${button} ↗</button></div>`;
  }
  function renderMarket() {
    const count = progress.economy.ownedSafes.length;
    return `<div class="trade-intro"><div><span class="eyebrow brass">MERCER’S SALVAGE & ESTATES</span><h2>Three doors. Different stories.</h2></div><span class="trade-stamp">SEALED STOCK<br>KEEP ALL CONTENTS</span></div>
      <div class="trade-grid">${Economy.safes.map(offer => `<article class="market-card"><div class="card-number">SERIES ${'ABC'[offer.tier]} <span>${offer.level} MECHANISM</span></div><div class="safe-showcase tier-${offer.tier}">${tradeArt('safe', offer.tier)}<span class="seal">SEALED</span></div><div class="market-copy"><h3>${offer.name}</h3><p>${offer.origin}</p><blockquote>${offer.clue}</blockquote><div class="valuation"><span>POSSIBLE HAMMER VALUE</span><strong>${rangeText(offer.estimate)}</strong></div><p class="trade-small">${offer.note} Estimates are a guide, not a guarantee.</p><button class="primary wide" data-action="buy-safe" data-tier="${offer.tier}" ${progress.cash < offer.price || count >= 8 ? 'disabled' : ''}>BUY SAFE <span>${currency(offer.price)}</span></button>${progress.cash < offer.price ? `<p class="trade-small shortfall">Earn ${currency(offer.price - progress.cash)} more from client jobs.</p>` : ''}</div></article>`).join('')}</div>
      <div class="trade-footnote"><span>STORAGE ${count}/8 SAFES</span><p>One-time purchase. Free opening retries. Contents are fixed when you acquire a safe. Successful sales carry a 10% auction commission.</p><button class="secondary" data-action="view-collection">MY COLLECTION ↗</button></div>`;
  }
  function logMarkup(log) { return `<ol class="bid-log" aria-label="Bid history">${log.slice(-6).map(x => `<li>${escapeHtml(x.text)}</li>`).join('')}</ol>`; }
  function renderBuyAuction() {
    const a = progress.economy.auction, offer = Economy.safes[a.tier], active = a.status === 'active';
    const owner = a.leader === 'you' ? 'YOU' : a.leader === null ? 'NO BIDS YET' : Economy.buyers[a.leader];
    const owned = progress.economy.ownedSafes.find(x => x.id === a.safeId);
    return `<div class="auction-grid"><article class="auction-lot"><div class="panel-heading"><span class="eyebrow brass">SEALED SAFE / ${escapeHtml(a.id.toUpperCase())}</span><span class="small-tag">${active ? 'BIDDING OPEN' : a.status === 'won' ? 'LOT WON' : 'LOT CLOSED'}</span></div><div class="auction-showcase">${tradeArt('safe', a.tier)}<span class="auction-plaque">${offer.level} / SERIES ${'ABC'[a.tier]}</span></div><h2>${offer.name}</h2><p>${offer.origin}</p><blockquote>${offer.clue}</blockquote><div class="valuation"><span>POSSIBLE HAMMER VALUE</span><strong>${rangeText(offer.estimate)}</strong></div><p class="trade-small">You are bidding against three NPC collectors. Payment is taken only if you win. A passed lot costs nothing.</p></article>
      <section class="bid-console"><p class="eyebrow brass">THE AUCTIONEER’S DESK</p><div class="current-bid"><span>${a.price ? 'CURRENT BID' : 'OPENING BID'}</span><strong>${currency(a.price || offer.opening)}</strong><small>${escapeHtml(owner)}</small></div>${logMarkup(a.log)}
      ${active ? `<button class="primary wide" data-action="bid" ${progress.cash < Economy.nextBid(a) || progress.economy.ownedSafes.length >= 8 ? 'disabled' : ''}>BID ${currency(Economy.nextBid(a))} <span>↑</span></button><button class="secondary wide" data-action="pass">PASS ON THIS LOT</button><p class="trade-small">Each raise lets a rival respond. Win when they withdraw. No countdown; take your time.${progress.cash < Economy.nextBid(a) ? ' Not enough funds for the next bid.' : ''}${progress.economy.ownedSafes.length >= 8 ? ' Safe storage is full.' : ''}</p>` : `<div class="auction-outcome ${a.status === 'won' ? 'won' : ''}">${a.status === 'won' ? `SOLD TO YOU · ${currency(a.price)}` : a.status === 'lost' ? 'SOLD TO ANOTHER COLLECTOR' : 'LOT WITHDRAWN'}</div>${owned ? `<button class="primary wide" data-action="open-safe" data-id="${owned.id}">OPEN YOUR SAFE <span>↗</span></button>` : ''}<div class="next-lot"><label for="next-lot-tier">NEXT LOT</label><select id="next-lot-tier"><option value="0">Tenement lockbox · from $35</option><option value="1">Estate strongbox · from $130</option><option value="2">Collector’s vault · from $390</option></select><button class="secondary wide" data-action="new-lot">BRING OUT THE NEXT LOT →</button></div>`}</section></div>`;
  }
  function renderSale() {
    const a = progress.economy.sale;
    if (!a) return `<section class="consignment-section"><div><span class="eyebrow brass">YOUR CONSIGNMENTS</span><h2>Let your finds find a buyer.</h2><p>Discover an item in a safe you own, choose a reserve, then invite three rounds of bids. Commission: 10% on successful sales only.</p></div><button class="secondary" data-action="view-collection">CHOOSE AN ITEM ↗</button></section>`;
    const item = Economy.lookup(a.key), active = a.status === 'active';
    return `<section class="sale-panel"><div class="sale-object">${tradeArt(item.kind)}<div><span class="eyebrow brass">YOUR CONSIGNMENT / ${a.status.toUpperCase()}</span><h2>${item.name}</h2><p>Reserve ${currency(a.reserve)} · Round ${a.round}/3 · 10% commission</p></div></div><div class="sale-detail">${logMarkup(a.log)}<div class="sale-action">${active ? `<strong>${a.price ? currency(a.price) : 'AWAITING BIDS'}</strong><button class="primary wide" data-action="advance-sale">${a.round === 2 ? 'FINAL CALL' : 'CALL FOR BIDS'} <span>↗</span></button><p class="trade-small">${3 - a.round} call${a.round === 2 ? '' : 's'} to go. An unsold item returns to your collection for free.</p>` : `<strong>${a.status === 'sold' ? '+' + currency(a.net) : 'RESERVE NOT MET'}</strong><p>${a.status === 'sold' ? `${currency(a.price)} hammer − ${currency(a.fee)} commission. Payment already added to your funds.` : 'Your item is back in the collection. Keep it or try a lower reserve.'}</p><button class="secondary wide" data-action="view-collection">BACK TO COLLECTION →</button>`}</div></div></section>`;
  }
  function renderCollection() {
    const s = progress.economy;
    return `<div class="trade-intro"><div><span class="eyebrow brass">THE BACK ROOM</span><h2>Your safes & discoveries.</h2></div><div class="collection-totals"><span>${s.opened} SAFE${s.opened === 1 ? '' : 'S'} OPENED</span><span>${s.sold} ITEM${s.sold === 1 ? '' : 'S'} SOLD</span><strong>${currency(s.revenue)} SALES EARNED</strong></div></div>
      <div class="collection-heading"><h3>Waiting on the workbench</h3><span>${s.ownedSafes.length} / 8 SAFES</span></div>
      ${s.ownedSafes.length ? `<div class="collection-grid">${s.ownedSafes.map(safe => { const offer = Economy.safes[safe.tier]; return `<article class="owned-card"><div class="owned-safe-art">${tradeArt('safe', safe.tier)}</div><div><span class="eyebrow brass">${safe.source === 'auction' ? 'AUCTION FIND' : 'DEALER PURCHASE'} / ${safe.id.toUpperCase()}</span><h3>${offer.name}</h3><p>${offer.level} · Paid ${currency(safe.cost)} · Contents sealed</p><button class="primary wide" data-action="open-safe" data-id="${safe.id}">CRACK THIS SAFE <span>↗</span></button></div></article>`; }).join('')}</div>` : emptyCollection('A little room for mystery.','Buy a sealed safe from the dealer or win one at auction. Client jobs are always available to earn the starting funds.','view-market','VISIT THE SAFE DEALER',s.items.length > 0)}
      <div class="collection-heading"><h3>The display cabinet</h3><span>${s.items.length} ITEM${s.items.length === 1 ? '' : 'S'} / YOUR PROPERTY</span></div>
      ${s.items.length ? `<div class="item-grid">${s.items.map(item => { const data = Economy.lookup(item.key), condition = Economy.conditions[item.condition]; return `<article class="item-card"><div class="item-art"><span class="rarity rarity-${data.rarity.toLowerCase()}">${data.rarity}</span>${tradeArt(data.kind)}<span class="item-condition">${condition.name}</span></div><div class="item-copy"><h3>${data.name}</h3><p>${data.story}</p><div class="valuation"><span>ESTIMATED VALUE</span><strong>${currency(item.value)}</strong></div>${item.status === 'listed' ? `<p class="consigned-tag">CURRENTLY AT AUCTION</p><button class="secondary wide" data-action="view-auction">VIEW CONSIGNMENT ↗</button>` : `<label class="reserve-label" for="reserve-${item.id}">YOUR RESERVE PRICE</label><select id="reserve-${item.id}"><option value="quick">Quick sale · ${currency(Math.max(5, Math.round(item.value * .55 / 5) * 5))}</option><option value="fair" selected>Fair reserve · ${currency(Math.max(5, Math.round(item.value * .85 / 5) * 5))}</option><option value="bold">Ambitious · ${currency(Math.max(5, Math.round(item.value * 1.25 / 5) * 5))}</option></select><button class="primary wide" data-action="list-item" data-id="${item.id}" ${s.sale?.status === 'active' ? 'disabled' : ''}>SEND TO AUCTION <span>↗</span></button>${s.sale?.status === 'active' ? '<p class="trade-small">Finish your active consignment first.</p>' : '<p class="trade-small">Keep it here for free, or sell with a 10% commission.</p>'}`}</div></article>`; }).join('')}</div>` : emptyCollection('Every object starts with a lock.','Open one of your own safes to reveal collectible objects. Items recovered on client jobs are returned to their owners.','view-jobs','TAKE A CLIENT JOB')}`;
  }
  function renderTrade() {
    const s = progress.economy;
    $('trade-hub').innerHTML = workshopView === 'market' ? renderMarket() : workshopView === 'collection' ? renderCollection() : `<div class="trade-intro"><div><span class="eyebrow brass">HARTWELL AUCTIONS / EST. 1926</span><h2>Going once. Going twice.</h2></div><span class="trade-stamp">LOCAL NPC BIDDERS<br>NO TIME PRESSURE</span></div>${renderBuyAuction()}${renderSale()}${s.ledger.length ? `<div class="ledger"><h3>Your recent dealings</h3>${s.ledger.slice(-5).reverse().map(x => `<div><span>${escapeHtml(x.title)}</span><strong>${x.amount > 0 ? '+' : x.amount < 0 ? '−' : ''}${currency(Math.abs(x.amount))}</strong></div>`).join('')}</div>` : ''}`;
    updateAccount();
  }
  $('workshop-nav').addEventListener('click', e => { const button = e.target.closest('[data-view]'); if (button) openWorkshopView(button.dataset.view); });
  $('trade-hub').addEventListener('click', e => {
    const button = e.target.closest('[data-action]'); if (!button || mode !== 'workshop' || button.disabled) return;
    const action = button.dataset.action, id = button.dataset.id;
    if (action.startsWith('view-')) { openWorkshopView(action.slice(5)); return; }
    if (action === 'open-safe') { startJob(0, id); return; }
    initAudio(); let outcome;
    if (action === 'buy-safe') outcome = Economy.buySafe(progress, Number(button.dataset.tier));
    if (action === 'bid') outcome = Economy.bid(progress);
    if (action === 'pass') outcome = Economy.pass(progress);
    if (action === 'new-lot') outcome = Economy.newAuction(progress, Number($('next-lot-tier').value));
    if (action === 'list-item') outcome = Economy.listItem(progress, id, $('reserve-' + id).value);
    if (action === 'advance-sale') outcome = Economy.advanceSale(progress);
    if (!outcome) return;
    if (outcome.ok) { save(); clunk(); } else errorSound();
    if (outcome.ok && action === 'buy-safe') openWorkshopView('collection');
    else if (outcome.ok && action === 'list-item') { openWorkshopView('auction'); $('trade-hub').querySelector('.sale-panel')?.scrollIntoView({ block: 'start', behavior: 'smooth' }); }
    else renderTrade();
    toast(outcome.message);
    if (action === 'bid' || action === 'advance-sale') $('trade-hub').querySelector(`[data-action="${action}"]`)?.focus({ preventScroll: true });
  });

  function renderWorkshop() {
    $('contracts').innerHTML = jobs.map((baseJob, i) => { const job = contractFor(i); return `<button class="contract ${selected === i ? 'selected' : ''}" data-job="${i}" aria-pressed="${selected === i}"><div class="contract-top"><span>CONTRACT 0${i + 1} · ${job.level}</span><b>${currency(job.pay)}</b></div><div class="contract-title">${job.title}<i class="selection-dot" aria-hidden="true"></i></div><div class="contract-client"><span>${job.client}</span><small>${job.time} SEC / 3 TUMBLERS</small></div></button>`; }).join('');
    $('contract-description').textContent = contractFor(selected).note + ' Contents returned to the client. Your fee + a tip are yours.';
    $('safe-serial').textContent = `NO. ${String(progress.completed + 1).padStart(3, '0')} / SERIES ${jobs[selected].series}`;
    $('upgrades').innerHTML = upgrades.map(u => `<article class="upgrade"><div class="upgrade-icon" aria-hidden="true">${u.icon}</div><div><h3>${u.title}</h3><p>${u.text}</p></div><button data-upgrade="${u.id}" class="buy-upgrade ${has(u.id) ? 'owned' : ''}" ${has(u.id) || progress.cash < u.cost ? 'disabled' : ''} aria-label="${has(u.id) ? 'Installed' : 'Buy'} ${u.title}${has(u.id) ? '' : ' for ' + currency(u.cost)}" title="${has(u.id) ? 'Installed' : progress.cash < u.cost ? 'Earn ' + currency(u.cost - progress.cash) + ' more to purchase' : u.detail}">${has(u.id) ? '✓ FITTED' : currency(u.cost)}</button></article>`).join('');
    updateAccount();
  }
  function showPanel(id) { ['workshop-panel', 'game-panel', 'result-panel'].forEach(p => $(p).hidden = p !== id); }
  function stopControls() { keys.clear(); velocity = 0; drag = null; }
  function workshop() {
    clearTimers(); closeModal(); stopControls(); mode = 'workshop'; run = null;
    document.body.classList.remove('playing'); scene.classList.remove('retracting', 'open', 'failed', 'unlock-shake');
    $('dial-assembly').classList.remove('resonating'); $('dial').style.transform = 'rotate(0deg)'; $('dial').setAttribute('aria-disabled', 'true'); $('dial').setAttribute('aria-valuenow', '0');
    $('equipment').hidden = false; $('opening-caption').textContent = ''; showPanel('workshop-panel');
    $('chapter').textContent = 'EST. 1984 / YOUR WORKSHOP'; $('headline').textContent = 'Every lock has a story.'; $('subhead').textContent = 'Steady hands. A good ear. A little patience.';
    $('shop-status').textContent = 'OPEN FOR BUSINESS'; $('bench-label').textContent = 'ON THE WORKBENCH'; $('scene-caption').textContent = 'BUILT TO KEEP SECRETS.'; $('scene-note').textContent = 'Handcrafted mechanisms. Human intuition.';
    renderWorkshop(); openWorkshopView(workshopView); window.scrollTo(0, 0);
  }
  function randomBetween(a, b) { return a + Math.random() * (b - a); }
  function startJob(tier = selected, ownedSafeId = null) {
    const ownedSafe = ownedSafeId ? progress.economy.ownedSafes.find(x => x.id === ownedSafeId) : null;
    if (ownedSafeId && !ownedSafe) { toast('That safe has already been opened.'); return; }
    if (ownedSafe) tier = ownedSafe.tier;
    clearTimers(); closeModal(); stopControls(); initAudio(); selected = tier;
    const job = ownedSafe ? { ...jobs[tier], title: Economy.safes[tier].name, client: 'Your safe · contents belong to you', pay: 0 } : contractFor(tier), tutorial = tier === 0 && !progress.tutorialDone;
    const first = randomBetween(tutorial ? 12 : 16, tutorial ? 19 : 36);
    const second = wrap(first - randomBetween(23, 42));
    const third = wrap(second + randomBetween(23, 42));
    run = { tier, job, tutorial, ownedSafeId, ownedSafe, targets: [first, second, third], stage: 0, angle: 0, time: job.time, elapsed: 0, started: false, paused: false, attempts: 0, hits: 0, direction: 0, travel: 0, locked: false, completed: false, hint: '' };
    mode = 'playing'; feedbackUntil = 0;
    $('workshop-nav').hidden = true; $('trade-hub').hidden = true; $('workbench').hidden = false;
    document.body.classList.add('playing'); $('equipment').hidden = true; $('pause').disabled = false; showPanel('game-panel'); scene.classList.remove('open', 'retracting', 'failed', 'unlock-shake');
    $('opening-caption').textContent = ''; $('dial').setAttribute('aria-disabled', 'false'); $('set-tumbler').disabled = false;
    $('chapter').textContent = `CONTRACT 0${tier + 1} / ${tutorial ? 'YOUR FIRST COMMISSION' : job.level + ' MECHANISM'}`;
    $('headline').textContent = 'Listen. Feel. Find the moment.'; $('subhead').textContent = 'One tumbler at a time.'; $('shop-status').textContent = 'CONTRACT IN PROGRESS';
    $('job-tier').textContent = `CONTRACT 0${tier + 1} · ${job.level}`; $('job-title').textContent = job.title; $('job-client').textContent = job.client + (tutorial ? ' · Guided first job' : ' · ' + job.time + (ownedSafe ? '-second attempt' : '-second commission'));
    $('payment').innerHTML = ownedSafe ? `YOURS<span>KEEP ALL FINDS</span>` : `${currency(job.pay)}<span>PAYMENT</span>`; $('bench-label').textContent = 'MECHANISM ENGAGED'; $('safe-serial').textContent = `NO. ${String(progress.completed + 1).padStart(3, '0')} / SERIES ${job.series}`;
    $('scene-caption').textContent = 'DRAG THE DIAL TO BEGIN'; $('scene-note').textContent = 'Your timer starts with the first turn.';
    if (ownedSafe) { $('safe-serial').textContent = ownedSafe.id.toUpperCase() + ' / SERIES ' + job.series; $('chapter').textContent = 'YOUR COLLECTION / SEALED SAFE'; $('job-tier').textContent = 'OWNED SAFE · ' + job.level; $('shop-status').textContent = 'OPENING YOUR SAFE'; }
    updateGame(); window.scrollTo(0, 0); $('dial').focus({ preventScroll: true });
  }
  const required = () => run.stage === 1 ? -1 : 1;
  function tolerance() { return run.job.tolerance + (run.tutorial ? 1 : 0) + (has('kit') ? .65 : 0); }
  function signal() {
    const diff = distance(wrap(run.angle), run.targets[run.stage]);
    const tol = tolerance(), range = run.job.range + (has('sensor') ? 7 : 0);
    return { diff, sweet: diff <= tol, power: diff <= tol ? 1 : clamp(1 - (diff - tol) / range, 0, .98) };
  }
  function turn(amount) {
    if (mode !== 'playing' || run.paused || run.locked || !Number.isFinite(amount) || !amount) return;
    run.started = true; run.angle += amount;
    const direction = Math.sign(amount);
    if (Math.abs(amount) > .001) { if (direction !== run.direction) run.travel = 0; run.direction = direction; run.travel += Math.abs(amount); }
    const now = performance.now(), s = signal();
    if (Math.floor(run.angle) !== lastTick) { tick(s.power); lastTick = Math.floor(run.angle); }
    if (s.sweet && run.direction === required() && now - lastResonance > 400) { tone(1540, .13, 'sine', .055); lastResonance = now; }
  }
  function updateGame() {
    if (!run) return;
    const s = signal(), dir = required(), correctDirection = run.direction === dir && run.travel >= .1;
    $('dial').style.transform = `rotate(${run.angle * 3.6}deg)`;
    $('dial').setAttribute('aria-valuenow', String(Math.floor(wrap(run.angle))));
    $('position').textContent = wrap(run.angle).toFixed(1).padStart(4, '0');
    $('timer').textContent = timeText(run.time); $('timer').classList.toggle('urgent', run.time <= 15);
    $('direction').textContent = dir === 1 ? 'CLOCKWISE' : 'COUNTERCLOCKWISE'; $('direction-icon').textContent = dir === 1 ? '↻' : '↺';
    [...$('tumblers').children].forEach((el, i) => { el.className = i < run.stage ? 'done' : i === run.stage ? 'active' : ''; el.firstElementChild.textContent = i < run.stage ? '✓' : '0' + (i + 1); el.lastElementChild.textContent = i < run.stage ? 'SET' : i === run.stage ? 'SEEKING' : 'WAITING'; });
    [...$('signal-bars').children].forEach((bar, i) => bar.classList.toggle('on', i < Math.round(s.power * 24)));
    $('signal-bars').classList.toggle('sweet', s.sweet && correctDirection); $('signal-bars').setAttribute('aria-valuenow', String(Math.round(s.power * 100)));
    $('dial-assembly').classList.toggle('resonating', s.sweet && correctDirection && !run.paused && !run.locked);
    $('signal-label').textContent = s.sweet ? (correctDirection ? 'SWEET SPOT' : 'CHECK DIRECTION') : s.power > .65 ? 'GETTING CLOSER' : s.power > .15 ? 'SIGNAL DETECTED' : 'LISTEN CLOSELY';
    if (has('sensor') && run.started) $('signal-label').textContent += ` · Δ ${s.diff.toFixed(1)}`;
    if (performance.now() > feedbackUntil && !run.locked) {
      let text = !run.started ? 'Turn clockwise. The timer begins when you move.' : run.direction !== dir ? `Reverse direction: turn ${dir === 1 ? 'clockwise (right)' : 'counterclockwise (left)'} for this tumbler.` : s.sweet ? 'That’s the spot. Stop the dial and SET TUMBLER.' : s.power > .7 ? 'Very close. Ease off and use small movements.' : s.power > .2 ? 'You can hear it. Keep turning slowly.' : `Keep turning ${dir === 1 ? 'clockwise' : 'counterclockwise'}. Watch the signal rise.`;
      $('feedback').textContent = text; $('feedback').className = 'feedback' + (s.sweet && correctDirection ? ' good' : '');
    }
    if (run.started) { $('scene-caption').textContent = `TUMBLER 0${run.stage + 1} / 03`; $('scene-note').textContent = 'Slow is smooth. Smooth is fast.'; }
  }
  function feedback(text, kind = 'error', duration = 2200) { $('feedback').textContent = text; $('feedback').className = `feedback ${kind}`; feedbackUntil = performance.now() + duration; }
  function setTumbler() {
    if (mode !== 'playing' || run.paused || run.locked) return;
    initAudio();
    // Pressing SET deliberately brakes the dial, making touch and keyboard equally precise.
    velocity = 0;
    if (!run.started) { feedback('Turn the dial clockwise first. Follow the rising signal.', '', 2200); return; }
    const s = signal(); run.attempts++;
    if (run.direction !== required() || run.travel < .1) {
      miss(`Wrong approach. Turn ${required() === 1 ? 'clockwise' : 'counterclockwise'} before setting. −3 seconds.`); return;
    }
    if (!s.sweet) { miss(s.power > .65 ? 'Almost there. Find a full green signal before setting. −3 seconds.' : 'No alignment yet. Follow the signal as it grows stronger. −3 seconds.'); return; }
    run.hits++; run.locked = true; stopControls(); clunk(); shake('unlock-shake');
    $('set-tumbler').disabled = true; $('dial-assembly').classList.remove('resonating');
    feedback(`Tumbler ${run.stage + 1} set. ${run.stage < 2 ? 'Reverse direction for the next one.' : 'All three aligned. Opening the safe…'}`, 'good', 1800);
    if (run.stage === 2) { win(); return; }
    later(() => { if (mode !== 'playing') return; run.stage++; run.direction = 0; run.travel = 0; run.locked = false; $('set-tumbler').disabled = false; updateGame(); }, 450);
  }
  function miss(message) { run.time = Math.max(0, run.time - 3); errorSound(); shake('failed'); feedback(message); if (!run.time) lose(); else updateGame(); }
  function lootSvg(kind) {
    const start = '<svg viewBox="0 0 220 130" xmlns="http://www.w3.org/2000/svg"><defs><linearGradient id="gold" x2=".8" y2="1"><stop stop-color="#edd697"/><stop offset=".5" stop-color="#b68c45"/><stop offset="1" stop-color="#725323"/></linearGradient><linearGradient id="paper" x2="1" y2="1"><stop stop-color="#d9cfad"/><stop offset="1" stop-color="#968e6c"/></linearGradient></defs>';
    const art = {
      cash: '<g transform="rotate(-9 110 65)"><path d="M25 43h158v65H25z" fill="#526442" stroke="#95a67a" stroke-width="3"/><path d="M30 38h158v59H30z" fill="#74855c" stroke="#b0b68a" stroke-width="3"/><rect x="39" y="46" width="140" height="43" rx="7" fill="none" stroke="#abb58b"/><ellipse cx="109" cy="68" rx="24" ry="18" fill="#4b5e3b"/><text x="109" y="75" text-anchor="middle" fill="#b4c094" font-size="21" font-family="Georgia">$</text><path d="M92 37h31v62H92z" fill="#c5b98d" opacity=".85"/></g>',
      watch: '<path d="M88 7h43l9 110H78z" fill="#66502d" stroke="#9c7a40" stroke-width="3"/><path d="M93 8h32v109H90z" fill="url(#gold)"/><circle cx="110" cy="64" r="39" fill="url(#gold)" stroke="#e6d5a0" stroke-width="3"/><circle cx="110" cy="64" r="31" fill="#eee4c5" stroke="#7f704f"/><g stroke="#4c4938" stroke-width="2"><path d="M110 37v5m0 45v5m-27-28h5m45 0h5M110 64V44m0 20 16 9"/></g><circle cx="110" cy="64" r="3" fill="#a08a52"/>',
      jewel: '<path d="M43 14c-10 100 144 100 134 0" fill="none" stroke="url(#gold)" stroke-width="7"/><path d="m110 68 23 22-23 32-23-32z" fill="#5f8c69" stroke="url(#gold)" stroke-width="5"/><path d="m110 76 15 15-15 23-15-23z" fill="#b7d5a1"/><path d="m110 76 3 20-18-5m18 5-3 18 15-23" fill="#3a7251"/>',
      letters: '<g transform="rotate(-10 110 65)"><rect x="33" y="28" width="150" height="80" fill="#aaa17d"/><rect x="29" y="22" width="150" height="80" fill="url(#paper)" stroke="#e1d5ad"/><path d="m30 23 74 53 75-53M29 102l55-42m95 42-55-42" fill="none" stroke="#968969" stroke-width="2"/><path d="M97 21h15v83H97zM28 62h153v12H28z" fill="#765044"/><circle cx="104" cy="68" r="14" fill="#845044" stroke="#ae7360"/><path d="m97 70 7-11 7 11-7-3z" fill="#c39774"/></g>',
      coin: '<ellipse cx="111" cy="75" rx="48" ry="45" fill="#654f2a"/><circle cx="110" cy="66" r="47" fill="url(#gold)" stroke="#e2ca8a" stroke-width="3"/><circle cx="110" cy="66" r="38" fill="none" stroke="#796335" stroke-width="2" stroke-dasharray="2 4"/><path d="m110 39 7 17 19 2-15 13 4 19-15-10-16 10 4-19-14-13 19-2z" fill="#e2c57a" stroke="#886e35"/><text x="110" y="104" text-anchor="middle" fill="#5d4a23" font-size="10" font-family="serif">1894</text>',
      key: '<g transform="rotate(-30 110 65)" stroke="url(#gold)" stroke-width="12" fill="none"><circle cx="67" cy="65" r="24"/><path d="M91 65h86m-10 0v20m-20-20v15"/></g><path d="m106 20 42 4-3 32-42-4z" fill="#b4a67a" stroke="#ded0a1"/><text x="125" y="43" fill="#4c4b36" font-size="17" text-anchor="middle" font-family="serif">09</text>'
    };
    return start + art[kind] + '</svg>';
  }
  function win() {
    mode = 'opening'; run.completed = true; run.locked = true; stopControls();
    $('dial').setAttribute('aria-disabled', 'true'); $('pause').disabled = true;
    if (run.ownedSafeId) {
      const claim = Economy.claimSafe(progress, run.ownedSafeId);
      if (!claim.ok) { workshop(); toast(claim.message); return; }
      const first = Economy.lookup(claim.items[0].key);
      run.result = { loot: { ...first, story: `${claim.items.length} find${claim.items.length === 1 ? '' : 's'} added to your collection. Keep them or consign them at the auction house.` }, bonus: 0, total: claim.estimate, claim };
    } else {
      const loot = discoveries.find(x => x.kind === run.job.expectedKind) || discoveries[Math.floor(Math.random() * discoveries.length)];
      const bonus = loot.bonus * (run.tier + 1), total = run.job.pay + bonus;
      run.result = { loot: { ...loot, story: run.job.outcome || loot.story }, bonus, total };
      progress.cash += total; progress.rep += run.job.rep; progress.completed++;
    }
    // Save both ownership transfers and earnings before the reveal, exactly once.
    if (run.tutorial) progress.tutorialDone = true; save();
    const loot = run.result.loot;
    $('loot-art').innerHTML = lootSvg(loot.kind);
    [...$('tumblers').children].forEach(el => { el.className = 'done'; el.firstElementChild.textContent = '✓'; el.lastElementChild.textContent = 'SET'; });
    $('bench-label').textContent = 'ALL TUMBLERS ALIGNED'; $('scene-caption').textContent = 'THE MOMENT OF TRUTH.';
    later(() => { scene.classList.add('retracting'); clunk(); $('opening-caption').textContent = 'Some stories are worth opening.'; }, 350);
    later(() => { scene.classList.add('open'); tone(65, 1.2, 'triangle', .11, 0, 30); }, 1000);
    later(() => { successSound(); showResult(true); }, 2550);
  }
  function lose() {
    if (mode !== 'playing') return;
    mode = 'failed'; run.locked = true; stopControls(); errorSound(); $('dial-assembly').classList.remove('resonating'); $('dial').setAttribute('aria-disabled', 'true'); showResult(false);
  }
  function showResult(success) {
    mode = success ? 'success' : 'failed'; showPanel('result-panel'); updateAccount(); $('pause').disabled = false;
    $('chapter').textContent = success ? 'CONTRACT COMPLETE / A JOB WELL DONE' : 'CONTRACT INCOMPLETE / KEEP PRACTICING';
    $('headline').textContent = success ? 'Another secret, revealed.' : 'Every craft takes practice.';
    $('shop-status').textContent = success ? 'COMMISSION COMPLETE' : 'READY WHEN YOU ARE';
    $('result-eyebrow').textContent = success ? 'STEADY HANDS. WELL EARNED.' : 'THE SAFE CAN WAIT';
    $('result-mark').textContent = success ? '✓' : '↻'; $('result-mark').style.color = success ? 'var(--green)' : 'var(--brass)';
    const owned = !!run.ownedSafeId;
    if (owned) { $('chapter').textContent = success ? 'SAFE OPENED / YOUR COLLECTION' : 'YOUR SAFE / TRY AGAIN'; $('shop-status').textContent = success ? 'DISCOVERIES ADDED' : 'SAFE RETAINED'; }
    $('result-title').textContent = success ? (owned ? 'Finders, keepers.' : 'Job completed.') : 'Out of time.';
    $('result-description').textContent = success ? run.result.loot.story : (owned ? 'Your safe is still in your collection, with the same contents. Retry for free when you are ready.' : 'Nothing lost. Listen for the signal, slow down near the sweet spot, and follow the required direction.');
    $('found-item').hidden = !success; $('found-item').textContent = success ? run.result.loot.name : '';
    $('result-time').textContent = `${run.elapsed.toFixed(1)} SEC`;
    $('result-accuracy').textContent = `${run.attempts ? Math.round(run.hits / run.attempts * 100) : 0}% (${run.hits}/${run.attempts} SETS)`;
    $('result-payment').textContent = currency(success ? run.job.pay : 0); $('result-bonus').textContent = success ? '+' + currency(run.result.bonus) : '—';
    $('total-reward').hidden = !success; $('rep-earned').textContent = success ? `+${run.job.rep} REPUTATION · CONTENTS RETURNED TO CLIENT` : 'NO FEE. NO PENALTY. ANOTHER CHANCE.';
    $('result-payment-label').textContent = owned ? 'SAFE PURCHASE COST' : 'CONTRACT PAYMENT';
    $('result-bonus-label').textContent = owned ? 'ITEMS ADDED' : 'CLIENT TIP';
    $('result-total-label').textContent = owned ? 'ESTIMATED HAMMER VALUE' : 'TOTAL EARNED';
    if (owned) {
      $('result-payment').textContent = currency(run.ownedSafe.cost);
      $('result-bonus').textContent = success ? String(run.result.claim.items.length) : '0';
      $('rep-earned').textContent = success ? `+${run.result.claim.rep} REPUTATION · SELL ITEMS TO EARN CASH` : 'SAFE RETAINED · FREE RETRIES';
      if (success) $('found-item').textContent = run.result.claim.items.map(x => `${Economy.lookup(x.key).name} (${Economy.conditions[x.condition].name.toLowerCase()})`).join(' + ');
    }
    $('next-job').innerHTML = success ? (owned ? 'VIEW COLLECTION <span>↗</span>' : 'NEXT JOB <span>↗</span>') : 'RETRY SAFE <span>↻</span>';
    $('scene-caption').textContent = success ? (owned ? 'THESE STORIES ARE YOURS.' : 'TRUST, RESTORED.') : 'TIME’S UP. YOUR NEXT TRY AWAITS.';
    if (success) { const began = performance.now(), total = run.result.total; const animate = now => { if (mode !== 'success') return; const t = clamp((now - began) / 1100, 0, 1); $('reward-count').textContent = currency(total * (1 - Math.pow(1 - t, 3))); if (t < 1) requestAnimationFrame(animate); }; requestAnimationFrame(animate); }
    $('next-job').focus({ preventScroll: true });
  }
  function openModal(title, copy, confirmLabel, action, cancelLabel = 'CANCEL') {
    modalReturnFocus = document.activeElement; stopControls();
    $('modal-title').textContent = title; $('modal-copy').textContent = copy; $('modal-confirm').textContent = confirmLabel; $('modal-cancel').textContent = cancelLabel;
    modalAction = action; $('modal').hidden = false; $('modal-confirm').focus();
  }
  function closeModal() { $('modal').hidden = true; modalAction = null; if (modalReturnFocus?.isConnected) modalReturnFocus.focus({ preventScroll: true }); modalReturnFocus = null; }
  function resume() { if (run && mode === 'playing') run.paused = false; closeModal(); lastFrame = performance.now(); }
  function pause() { if (mode !== 'playing' || run.paused) return; run.paused = true; $('dial-assembly').classList.remove('resonating'); openModal('On a short break.', 'The timer is paused. The mechanism will be exactly where you left it.', 'RESUME JOB', resume, 'RETURN TO WORKSHOP'); }
  if (demo) window.addEventListener('message', event => { if (event.source === window.parent && event.data === 'safecracker:pause') pause(); });
  function buildDial() {
    let markup = '<circle cx="150" cy="150" r="117" fill="none" stroke="#9fa385" stroke-opacity=".35" stroke-width=".7"/>';
    for (let n = 0; n < 100; n++) { const angle = -n * 3.6; const major = n % 10 === 0, mid = n % 5 === 0; markup += `<g transform="rotate(${angle} 150 150)"><line x1="150" y1="${major ? 14 : mid ? 17 : 20}" x2="150" y2="${major ? 32 : 28}" stroke="${major ? '#d2c9a6' : '#a8ae90'}" stroke-width="${major ? 1.7 : .85}"/>${major ? `<text x="150" y="51" text-anchor="middle" fill="#ded5b2" font-family="Georgia,serif" font-size="15">${String(n).padStart(2, '0')}</text>` : ''}</g>`; }
    $('dial-face').innerHTML = markup;
    $('signal-bars').innerHTML = Array.from({ length: 24 }, (_, i) => `<i style="height:${35 + i / 23 * 65}%"></i>`).join('');
  }
  $('contracts').addEventListener('click', e => { const button = e.target.closest('[data-job]'); if (!button) return; selected = Number(button.dataset.job); renderWorkshop(); $('contracts').querySelector(`[data-job="${selected}"]`).focus({ preventScroll: true }); });
  $('upgrades').addEventListener('click', e => { const button = e.target.closest('[data-upgrade]'); if (!button) return; const u = upgrades.find(x => x.id === button.dataset.upgrade); if (!u || has(u.id) || progress.cash < u.cost || mode !== 'workshop') return; progress.cash -= u.cost; progress.upgrades.push(u.id); initAudio(); clunk(); save(); renderWorkshop(); toast(u.detail); });
  $('start-job').addEventListener('click', () => startJob()); $('set-tumbler').addEventListener('click', setTumbler);
  $('sound').addEventListener('click', () => { progress.sound = !progress.sound; initAudio(); save(); updateAccount(); if (progress.sound) tick(.5); });
  $('pause').addEventListener('click', pause);
  $('leave-job').addEventListener('click', () => { if (mode !== 'playing') return; run.paused = true; openModal(run.ownedSafeId ? 'Put this safe aside?' : 'Leave this commission?', run.ownedSafeId ? 'Your safe stays in your collection. Its contents are preserved and you can try again for free.' : 'Your workshop funds are safe. Returning now will end this attempt without payment.', 'RETURN TO WORKSHOP', workshop, 'KEEP WORKING'); });
  $('next-job').addEventListener('click', () => { if (mode === 'failed') startJob(selected, run.ownedSafeId); else { if (run?.ownedSafeId) workshopView = 'collection'; workshop(); } });
  $('result-workshop').addEventListener('click', workshop);
  $('reset-progress').addEventListener('click', () => { if (mode === 'opening') return; if (mode === 'playing') run.paused = true; openModal('A fresh set of keys?', demo ? 'Restart this demo with $100 and an empty workshop?' : 'This clears your saved money, reputation, completed jobs, safes, items, auctions, and equipment purchases on this browser.', 'RESET MY WORKSHOP', () => { progress = fresh(); workshopView = 'jobs'; save(); workshop(); toast('A new beginning. Your first commission is waiting.'); }); });
  $('modal-confirm').addEventListener('click', () => { const action = modalAction; if (action) action(); });
  $('modal-cancel').addEventListener('click', () => { if ($('modal-cancel').textContent === 'RETURN TO WORKSHOP') workshop(); else resume(); });
  document.querySelector('.brand').addEventListener('click', e => { e.preventDefault(); if (mode === 'playing') $('leave-job').click(); else if (mode !== 'opening') workshop(); });
  const pointerAngle = e => { const rect = $('dial').getBoundingClientRect(); return Math.atan2(e.clientY - rect.top - rect.height / 2, e.clientX - rect.left - rect.width / 2) * 180 / Math.PI; };
  $('dial').addEventListener('pointerdown', e => {
    if (mode !== 'playing' || run.paused || run.locked || (e.pointerType === 'mouse' && e.button !== 0) || drag) return;
    e.preventDefault(); initAudio(); velocity = 0; drag = { id: e.pointerId, angle: pointerAngle(e), time: performance.now(), lastMove: performance.now() }; $('dial').setPointerCapture(e.pointerId); $('dial').focus({ preventScroll: true });
  });
  $('dial').addEventListener('pointermove', e => {
    if (!drag || drag.id !== e.pointerId || mode !== 'playing' || run.paused || run.locked) return;
    const angle = pointerAngle(e); const delta = ((angle - drag.angle + 540) % 360) - 180; const now = performance.now();
    const fine = e.shiftKey ? .22 : has('grip') && signal().power > .6 ? .65 : 1;
    const amount = delta / 3.6 * fine; turn(amount); velocity = clamp(amount / Math.max((now - drag.time) / 1000, .012), -42, 42) * (has('grip') ? .12 : .22);
    drag.angle = angle; drag.time = now; if (Math.abs(delta) > .1) drag.lastMove = now; updateGame();
  });
  function release(e) { if (!drag || e.pointerId !== drag.id) return; if (performance.now() - drag.lastMove > 80 || e.type !== 'pointerup') velocity = 0; drag = null; }
  $('dial').addEventListener('pointerup', release); $('dial').addEventListener('pointercancel', release); $('dial').addEventListener('lostpointercapture', release);
  function nudge(dir) { if (mode !== 'playing' || run.paused || run.locked) return; initAudio(); velocity = 0; turn(dir * (has('grip') ? .2 : .35)); updateGame(); }
  $('nudge-left').addEventListener('click', () => nudge(-1)); $('nudge-right').addEventListener('click', () => nudge(1));
  document.addEventListener('keydown', e => {
    if (!$('modal').hidden) {
      if (e.key === 'Escape') { e.preventDefault(); resume(); }
      if (e.key === 'Tab') { const first = $('modal-confirm'), last = $('modal-cancel'); if (e.shiftKey && document.activeElement === first) { e.preventDefault(); last.focus(); } else if (!e.shiftKey && document.activeElement === last) { e.preventDefault(); first.focus(); } }
      return;
    }
    if (mode !== 'playing') return;
    const key = e.key.toLowerCase();
    if (key === 'escape' || key === 'p') { e.preventDefault(); pause(); return; }
    if (['arrowleft', 'arrowright', 'a', 'd'].includes(key)) { e.preventDefault(); if (!keys.has(key)) { initAudio(); nudge(key === 'a' || key === 'arrowleft' ? -1 : 1); } keys.add(key); }
    if (key === 'shift') keys.add('shift');
    if ((key === 'enter' || key === ' ') && (e.target === $('dial') || e.target === document.body)) { e.preventDefault(); if (!e.repeat) setTumbler(); }
  });
  document.addEventListener('keyup', e => { keys.delete(e.key.toLowerCase()); if (['arrowleft', 'arrowright', 'a', 'd'].includes(e.key.toLowerCase())) velocity = 0; });
  window.addEventListener('blur', () => { stopControls(); if (mode === 'playing') pause(); });
  document.addEventListener('visibilitychange', () => { if (document.hidden && mode === 'playing') pause(); });
  function frame(now) {
    const dt = Math.min((now - lastFrame) / 1000, .1); lastFrame = now;
    if (mode === 'playing' && !run.paused) {
      if (!run.locked) {
        const dir = Number(keys.has('arrowright') || keys.has('d')) - Number(keys.has('arrowleft') || keys.has('a'));
        if (dir && !drag) { const speed = keys.has('shift') ? 2.5 : has('grip') && signal().power > .65 ? 10 : 19; velocity += (dir * speed - velocity) * Math.min(dt * 12, 1); turn(velocity * dt); }
        else if (!drag && Math.abs(velocity) > .02) { velocity *= Math.exp(-dt * (has('grip') ? 22 : 16)); turn(velocity * dt); }
        if (run.started) { run.time = Math.max(0, run.time - dt); run.elapsed += dt; if (run.time <= 0) lose(); }
      }
      if (mode === 'playing') updateGame();
    }
    if (window.SafecrackerArt && !$('workbench').hidden) window.SafecrackerArt.draw({ owned: !!run?.ownedSafeId, angle: run?.angle || 0, stage: run?.completed ? 3 : run?.stage || 0, loot: run?.result?.loot.kind, sweet: mode === 'playing' && !run.paused && signal().sweet && run.direction === required() });
    requestAnimationFrame(frame);
  }
  buildDial(); workshop(); requestAnimationFrame(frame);
})();
