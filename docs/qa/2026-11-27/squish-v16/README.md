# Squish V16 / visual validation V17 — in progress

Protected production base541293e; unchanged exterior/dimensions/coordinates and
original cats/economy/saves. Exact user instructions are in docs/specifications.

- Engine audit and immutable reference registry: this directory.
- one-body-v1: actual desktop prototype, sourcec77a398. Real mouse PRESS/RELEASE,
  volume/locality/stability passed, but visual ears and native paw BLOCKERS OPEN.
  These are historical images, never final-art proof.
- Correction source062b7a8: short rounded triangular cat ears, deeper jelly,
  approved skinned paw markers, explicit nativecat recall and actual ballistic
  ascent/alternating knead/exit. Desktop actual full-path PASS; phone pending.
  A stale AttachedBindMode inverse was found by independent actual-mesh Node
  query, fixed and tested in translated deep-world coordinates; earlier GPU
  attempt22c5670 was stopped, never counted as success.

## Repeatable native capture

Use Node22 after npm run build, ONE GPU browser at a time, isolated local SQLite:

```
CHICHI_SQUISH_AUDIT=1 CHICHI_CHROMIUM=/usr/bin/chromium \
CHICHI_PLAYWRIGHT_MODULE=/opt/codex/runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright \
CHICHI_DESKTOP=1 CHICHI_REVIEW_DIR=/outside/qa/desktop node scripts/check-aquarium.cjs
```

Omit CHICHI_DESKTOP for390x844/DPR2 coarse touch. Audit uses actual production
Warehouse renderer/runtime inside real game, real controls, deterministic fixed
steps and original Chichi. Developer-only accessors live in private QA bundle,
not ordinary user HUD. No live save or paid inference. Capture JSON beside PNG
contains fixedcamera/FOV/aspect/DPR/tone/shadow/physicsmeasurements. Bundle and all
public source hashes/overlays are captured. Source must stay frozen during audit.

```
python3 scripts/compare-squish-references.py /outside/qa/desktop --review /outside/review.json
```

Pillow is already installed in this environment; no game/package dependency added.
The HTML/JSON report creates camera-validated actual-state differences, palette
measurements and explicit reviewer findings. Concept art is compared semantically,
never measured as pixel-identical. Reference image bytes are currently available
only as original inline images in the conversation, not mounted filesystem files:
manifest/report explicitly mark this missing slot, never replace it with generated
images or claim a complete side-by-side board. Performance here is Chromium
software rendering; no physical Mac/phone FPS claim.
