# Deploy SAFECRACKER to the lab

This repository contains the Turkish game pitch and a playable demo using the original workshop UI. Serve the pitch as the site's entry point.

## Build from source

Requires Python 3, with no third-party packages:

```sh
python3 tools/build_site.py
```

- Build command: `python3 tools/build_site.py`
- Publish directory: `dist`
- Default document: `index.html`
- Runtime: static HTML, no backend or environment variables

Upload the **contents** of `dist/` to the lab's chosen directory, for example `/safecracker/`. The resulting URL would be `https://lab.baylel.games/safecracker/` if that is the path configured by the lab team. This is a proposed path, not an already published site.

The output is a single HTML file containing all CSS, JavaScript, fonts and artwork. It works under a subdirectory without base-path configuration. No SPA routing or rewrite rules are needed. The demo uses inline scripts/styles, embedded fonts and a sandboxed `srcdoc` iframe; any hosting Content Security Policy must permit these features.

## Deploy without a build environment

Copy the committed `pitch.html` into the destination directory as `index.html`. No other files are needed. When source files change, rebuild before deploying this copy.

Do not use the repository-root `index.html` as the lab entry point: it is the separate full game with external CSS/JS/assets and persistent saves.

## Local preview and checks

```sh
python3 tools/build_site.py
node tests/pitch.test.cjs
node tests/game.test.cjs
node tests/economy.test.cjs
node tests/pixel-art.test.cjs
python3 -m http.server 8080 --directory dist
```

Open `http://localhost:8080`. Node is only required for the optional automated checks.

After deployment, check that the pitch opens, “Atölyeye gir” launches the workshop, buying a safe works with the initial $100, and the return control brings you back to the pitch. Demo progress lasts for the current page session and resets on reload.
