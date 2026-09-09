# GRID — public site

Pre-launch site for GRID: a persistent address for every place on Earth, and
one engine for modelling what happens there.

This repository holds a **built artefact**. It is generated from a private
source tree and force-pushed here on each deploy, so its history is not a
development history and pull requests against it will be overwritten.

## Serving it

Static files, no build step. GitHub Pages, from this branch at the root:

> Settings → Pages → Source: *Deploy from a branch* → `main` / `/ (root)`

`.nojekyll` is present so paths are served verbatim.

## What's here

| Path | What it is |
|---|---|
| `index.html` | The site. |
| `access.html` | Password-protected brief. Its content ships encrypted, not hidden. |
| `assets/globe.js` | three.js hero — an address resolving down its hierarchy. |
| `assets/panels.js` | Canvas 2D diagrams, one per capability. |
| `assets/gate.js` | WebCrypto decryption for the brief. |
| `assets/vendor/` | three.js r160, vendored from npm. MIT — licence included. |

Nothing on this site depicts a real location. The globe and the panels are
diagrams of what the system does, not readings from live data.
