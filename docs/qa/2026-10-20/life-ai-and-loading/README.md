# Life AI, reserve provider and island preparation

Baseline: released `f10de361fe51e4c0d165f91c7a5d12aa485788e0`.
Tests use private generated worlds, never the player's account or save.

## Rendering changes and evidence

- Reuse unchanged shader variants, original texture uploads and exact live
  lighting. Selected islands take priority over cooperative background work.
- Share identical scenery paints/wind clocks; fading allocates a private paint
  without changing neighbouring objects. Prepare the actual RGB shadow variant
  before switching shared static props away from their native rendering.
- Ground-cover flowers retain all original attribute bytes and triangle order.
  Their 456 triangle vertices reference 165 byte-identical vertices. No flowers,
  triangles, textures, cats, fish, shadows or DPR are removed/reduced.
- Dense scenes may omit already-batched original leaves from CPU traversal;
  restore exact child arrays before callbacks and on exceptions. Sparse scenes
  with fewer than 64 eligible leaves retain native traversal to avoid overhead.

`all-camera-gestures.json` covers all 30 islands, plus a repeated aquarium visit:
31 exact colour/shadow framebuffer comparisons, zero changed bytes, original
DPR 2, native wheel/orbit/pinch, zero context loss. All three explicit GPU
retirement/re-upload comparisons also have zero changed bytes. Living-cat and
joint registrations remain intact. The subsequent warmup/readiness and sparse
traversal guard change preparation/CPU dispatch only, not submitted geometry.

Sequential software-Chromium diagnostics, 180 full JS/renderer frames per scene,
all 147 adoption profiles plus staff, and four large owned attractions:

| Measurement | Released baseline | Updated run |
| --- | ---: | ---: |
| Capybara island detail available | 9,282 ms | 6,766 ms |
| Capybara preparation plus first full draw | 15,710 ms | 14,119 ms |
| Built homestead preparation plus first full draw | 73,352 ms | 19,450 ms |

Both runs wait for all reference-attraction models and shader preparation, with
zero pending models. The repeated updated diagnostic recorded 5,597 ms for
capybara detail and 17,191 ms for homestead preparation. Raw results, including
long software-driver stalls and outliers, are retained. Across-release moving
simulation CPU medians were variable and not consistently lower; they are not
evidence of perfect frame rates. The final sparse-scene traversal guard follows
these timing runs. Physical Mac/iPhone performance still needs device feedback.

`same-pose-raster.json` records six actual full-resolution raster samples per
mode in three individual checks. Capybara medians were 30.25 → 21.2 ms, homestead
58.05 → 52.75 ms and Bikini 18.25 → 16.6 ms, with identical pixels. These are
software-GPU diagnostics with substantial outliers, not device FPS guarantees.
The environment reconnected after those individual checks, so the interrupted
overall diagnostic is not counted as a passing integration test.

## AI schedule and actual reserve request

Established professions are fixed. Only pending initial careers require a
career event. After-work activities, affordable house decisions and due 14-day
family reviews share one evening batch. Client markers and a per-world durable
ledger prevent concurrent/reloaded requests spending twice. Offline days do not
become a backlog of model calls. Routine deployment verification no longer makes
five to fifteen real inferences.

`ai-budget.json` retains the token counts, output limits and pricing assumptions
for the full roster. Estimated neurons: 399 for initial careers once, 216 for an
ordinary evening, 579 with every cat able to buy a house, 728 with that rich
evening plus family review. Manual Chichi requests are additional.

An actual OpenRouter key/model call succeeded at $0:
https://github.com/arturmal2805-netizen/ai-cat-game/actions/runs/39419618016.
`openrouter-key-verification.json` contains sanitized proof. The account is a
free tier; a key's $100 spending cap is not an account balance. Default reserve
routing uses `dots-studio/dots-3-note-preview:free` with reasoning disabled,
with Cloudflare primary. The initial random free router selected a reasoning
model that exhausted a small answer allowance with null content; a real request
exposed this and the reserve now uses the explicit verified model. Official free-model
limits are 50 requests/day without purchased credits, at most 20/minute; buying
at least $10 credits raises the daily free-model allowance to 1,000.

The deployed game's actual failover is checked once after publication with
`scripts/check-ai-backup.mjs`, a fresh private ledger token and one initial
career. That activation probe is deliberately excluded from routine deployment.

## Reproduction

- `npm test`, `npm run build`, `npx wrangler deploy --dry-run`.
- `CHICHI_GESTURE_ALL=1 CHICHI_MAP_CHECK=1 CHICHI_SCENE_STRESS=1
  CHICHI_MOSA_CAPTURE=0 node scripts/check-aquarium.cjs`.
- `CHICHI_FULL_FRAME_AUDIT=1 CHICHI_FULL_FRAME_BIOMES=summer,homestead
  CHICHI_MAP_CHECK=1 CHICHI_SCENE_STRESS=1 CHICHI_MOSA_CAPTURE=0
  node scripts/check-aquarium.cjs`; use `CHICHI_BASELINE_REF=f10de36` for baseline.
- Add `CHICHI_RASTER_AB=1` for the actual same-pose flower raster check.
- `scripts/check-aquarium-motion.mjs`, `scripts/check-cat-render-batch.mjs`,
  `CHICHI_NATIVE_SKIN_CHECK=1 scripts/check-cat-render-batch.mjs`,
  `scripts/check-aquarium.cjs`, `scripts/check-family.cjs`,
  `scripts/check-jobcity.cjs` cover displayed geometry, native Chichi, mobile
  input, work/family/housing, SQLite saves/reloads and older concurrent clients.

Browser scripts take `CHICHI_CHROMIUM` and `CHICHI_PLAYWRIGHT_MODULE`. GPU waits
and readback exist only in these QA scripts, never in the production frame loop.
