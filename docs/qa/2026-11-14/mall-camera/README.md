# Mall camera native audit — 2026-11-14

The actual game runs in Chromium/SwiftShader at DPR 2 against an isolated local workerd/SQLite world. No production player data or paid AI is used.

The audit passed: phone touch on the actual Mall opens floor-one atrium overhead; two random existing native bench guests differ and select their actual floors; the floor menu remains available; guest near=.15/FOV=40 survive portrait/landscape resize; a runtime shopper returning to floor zero releases tracking; floor selection, world overview, EXIT and reentry release the camera correctly. Browser and HTTP error arrays are empty. Inspect the accompanying actual screenshots and camera-results.json.

Guest camera uses the existing native head camera, raised over bench backs. The statue and cashiers are not guests. Surface queues/elevator passengers and other-island cats are excluded. Existing ambient bench cats retain their original geometry/animation and receive stable camera IDs; no extra population or AI calls are created.

Run:
```
CHICHI_PLAYWRIGHT_MODULE=/opt/codex/runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright CHICHI_CHROMIUM=/usr/bin/chromium CHICHI_MALL_AUDIT=1 CHICHI_MALL_CAMERA_AUDIT=1 node scripts/check-mosasaur.cjs
```

Build and Worker dry-run passed under Node 22 (CI version). Node 24 initially changed two generated model hashes; rebuilding under Node 22 restored the original manifests. Those model changes are excluded from this release.

These software-renderer captures establish functional camera behavior, not physical M2/iPhone FPS. Historical WIP directories/branches were absent; this implementation was made from current main, not recovered source. Broader Mall art, vacations, swimming/airlock, ocean performance and water polish remain separate tasks.

Full Node 22 suite: 1013 tests passed, zero failures/cancellations/skips. `git diff --check` passed.
