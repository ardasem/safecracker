# SAFECRACKER

A complete, offline, vanilla HTML/CSS/JavaScript game about a fictional locksmith workshop. No dependencies, build step, server, accounts, or downloaded assets.

## Lab deployment

To publish the **pitch with its integrated playable demo**, run `python3 tools/build_site.py` and serve the contents of `dist/`. The generated `dist/index.html` is self-contained. The repository-root `index.html` is the separate full game, not the pitch entry point. See [DEPLOYMENT.md](DEPLOYMENT.md) for the handoff instructions and a no-build option.

## Run

Open `index.html` in a modern browser. Keep `style.css`, `game.js`, `economy.js`, `pixel-art.js`, and the `assets/` folder beside it. Sound starts after your first interaction.

For an optional local web preview, run `python3 -m http.server 8080` from this directory and visit `http://localhost:8080`.

## Play

1. Choose one of three contracts and accept it. The timer starts with your first dial movement.
2. Drag around the dial, use **A/D** or **left/right arrows**, or tap the small arrow buttons. Hold **Shift** for fine control.
3. Follow the required direction: **clockwise → counterclockwise → clockwise**. The signal grows as you approach the hidden target; a full green signal means you are in the sweet spot.
4. Stop and press **SET TUMBLER**. **Enter** or **Space** also sets it when the dial is focused. Setting deliberately brakes the dial. Incorrect attempts cost three seconds and explain what went wrong.
5. Set all three tumblers to retract the bolts, open the safe, reveal its contents, and collect your payment and discovery bonus. Contents are returned to the client.

**P / Escape** pauses a job. Switching tabs or windows pauses automatically. Return to the workshop at any time; incomplete jobs do not cost money. Retry failed jobs with a fresh combination. NEXT JOB returns to the job board.

The first easy contract includes extra tolerance and live guidance. Higher tiers offer narrower sweet spots and larger payments. All three tiers are always available.

## Workshop

- **Precision Dial Grip ($250):** finer arrow-button steps, gentler motion near targets, and less drift after releasing a drag.
- **Acoustic Sensor ($500):** detects targets farther away and displays the distance from alignment.
- **Professional Toolkit ($1,000):** adds 0.65 positions of tolerance on each side of every sweet spot.

Money, reputation, completed jobs, tutorial completion, equipment, and sound preferences persist in `localStorage`. Reputation increases your workshop rank every 100 points. Progress is scoped to the browser and origin; `file:` storage behavior depends on the browser. If storage is blocked, the game works for the current session and displays that limitation. Reset Progress requires confirmation.

## Implementation

The workshop, safe, spinning wheel, animated bolts, opening door, and rewards are drawn as original low-resolution Canvas pixel art, enlarged without image smoothing. The UI uses beveled metal panels, parchment contracts, and the bundled original Workshop Pixel font. Accessible HTML controls drive the same game state behind the artwork; all sounds are synthesized through Web Audio. The dial has 100 positions, wraparound detection, pointer capture, controlled inertia, and keyboard/touch support. Target positions are generated along the required direction; every combination is reachable. Rewards are saved exactly once before the reveal animation, so closing during the reveal cannot lose a completed job's payment. Reduced-motion preferences shorten decorative CSS animations.

This is an invented precision game, not an instruction system for opening real locks or safes.

## Validation

Optional developer checks (Node is only needed for tests, never to play):

```sh
node --check game.js
node --check pixel-art.js
node tests/game.test.cjs
node tests/pixel-art.test.cjs
```

The dependency-free state tests cover 150 randomized completed contracts across all tiers, timer boundaries, failure/retry, pause/resume, tutorial and upgrade effects, purchases, persistence, reset, and blocked storage. Browser QA also checks a full keyboard-driven completion, drag interaction, and the responsive phone layout.

The optional `tools/create_pixel_font.py` script reproduces the original 5×7 font using fontTools. It is an asset-authoring tool only; Python and fontTools are not needed to play.

## Trading & content

The workshop now has four destinations: **Client Jobs**, **Safe Dealer**, **Auction House**, and **My Collection**. All money and bidders are fictional, local game state; there is no multiplayer server or real-money transaction.

- **Client jobs:** nine rotating client briefs across the three original difficulty tiers. Each has its own request and conclusion. You earn a service fee and client tip; the recovered object goes back to the client. Jobs are always free to attempt, so an empty wallet never prevents progress.
- **Safe dealer:** buy sealed safes for **$90 / $280 / $800**. Clues describe their provenance, and estimates communicate the potential contents. Each purchase creates a distinct safe with fixed, hidden contents. A failed or abandoned attempt keeps that safe in your collection, with free retries and unchanged contents. Storage holds eight unopened safes.
- **Safe auctions:** compete with three NPC collectors by raising the current bid. Rivals respond to each raise; win when they withdraw, or pass without paying. Only the winning hammer price is deducted. The lot, bids, and rival budgets survive reloading. After a lot closes, select another tier to auction.
- **Discoveries:** 18 collectible objects, from tram tokens and letters to a sapphire necklace and a royal mint proof. Each has a story, rarity, and condition (worn, well kept, pristine), which affects its estimated value. A safe you own transfers its contents to your collection; opening it does not pay a client fee.
- **Selling:** choose a quick, fair, or ambitious reserve (55%, 85%, or 125% of estimated value, rounded to $5). One consignment can run at a time. Call for three rounds of bids; the final round settles automatically. A successful sale pays the hammer price minus a **10% commission**, rounded up to a whole dollar. An unmet reserve returns the same item without a fee. Keeping an item is free. Prices are not guaranteed, and you can lose money on a purchase.
- **Persistence:** existing saves retain money, reputation, and upgrades. Safes, items, active auctions, sale progress, and recent dealings are saved alongside them. Completed purchases, ownership transfers, and payouts are applied only once.

Keep `economy.js` beside the other game files. Additional economy checks:

```sh
node --check economy.js
node tests/economy.test.cjs
```

The economy suite exercises 300 complete purchase → opening → sale cycles, wallet and capacity limits, auction wins/losses, reserve failures, reloads, and duplicate-operation protection. Game integration tests also verify that client and player-owned safes have different reward/ownership behavior.

## Playable pitch

Open or share **`pitch.html` alone** for the Turkish introduction and original playable workshop. The pitch menu keeps the pixel-art overview and journey/flow diagrams. “Atölyeye gir” opens the actual `index.html` workshop UI inside the same file: safe workbench, job board, signal/tumbler panel, dealer, safe auctions, collection, item sales, and equipment. There is no separate simplified game or trading interface.

All CSS, scripts, artwork and both fonts are embedded. No companion files, build, server or network access are required to open the delivered file. The sandboxed workshop uses `game.js` with an explicit demo mode: $100 initial funds, session-only progress, and no access to the main game's stored save. Returning to the pitch pauses an active job; reopening the workshop preserves that demo session. Reloading the file resets the session. A return-to-pitch control stays above the workshop, and the workshop's About link returns to the same pitch menu.

Authoring sources are `pitch.template.html`, `pitch.css`, `pitch.js`, plus the original `index.html`, `style.css`, `pixel-art.js`, `economy.js` and `game.js`. Rebuild the single HTML with `python3 tools/build_pitch.py`. Checks: `node tests/pitch.test.cjs` verifies bundling and source reuse, and `node tests/game.test.cjs` covers gameplay plus isolated demo funds/storage/pause behavior.
