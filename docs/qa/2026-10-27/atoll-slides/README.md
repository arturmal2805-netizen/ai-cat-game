# Twenty giant playable water worlds

Published release: `1e54a861b4129f3be19c23b5afe1e425ccca6dd1`.
`publication.json` verifies successful test/deploy/pages jobs, the live Worker
release, the exact deployed app SHA-256 and all twenty shipped preview PNGs.
Play: https://arturmal2805-netizen.github.io/ai-cat-game/?update=1e54a86

This adds a separate collection, retaining the released twenty-five dream
slides and every previous island/road/placement identity. `ATOLL_SLIDES` has
exactly twenty authored entries in the requested row-major order; the final
entry is Mega Loops, following the user's text rather than the final funnel
in the picture. Models use the existing stylized 3D renderer, not image planes.

The shop's “Водні світи · 20” tab uses shipped model previews, shows prices
before payment and a persistent “Придбано” badge. The existing catalogue
supports additional copies; owned items explicitly say “Купить ещё”. Prices
are 2,112,000–5,376,000 coins, all at least eight times the released maximum
water-slide price of 240,000. Large registers retain unpaid income when the
established ten-million wallet is full, including room for level-up bonuses.

The free, level-20 “Великий аквапарк” annex opens with the first purchase.
Its twenty full-size 112×108 plots have separate walkways, a new connecting
road and no movement/scaling of existing islands or owned buildings. The
placement extension allows sixty legacy objects plus twenty new complexes;
the ordinary sixty-object allowance is unchanged. Cached clients cannot drop
the annex unlock or lose new paid objects. Construction uses existing saves,
coins, builders and deadlines; this collection does not add AI calls.

Each route includes boarding, an actual stair climb, its authored course,
receiving water and a dry return. Curves, lane colours, invertible loops,
wide wave/halfpipe floors, open bowl exits, terrace pools, hollow arch/cave
portals and suspended islets are physical geometry. Seated poses and distinct
per-type reactions extend the approved rig, using measured speed, height,
signed turns and acceleration. Cancellation and reduced motion restore it.
No approved cat/sculpt producer was changed; its cache key remains
`sculpt-v2-a496203fa13a037a7a10a927`.

Preparation uses the approved cooperative scheduler and shader warmup. Giant
complexes are requested one at a time near the selected view, pause preparation
during gestures and retain existing occupied-ride simulation. Static materials
and immutable raft buffers are shared; continuous water/effects keep fixed
buffers. No lower DPR, shadow/detail settings, replacement cat renderer or
change to the approved GPU queue/cadence/residency policies was introduced.
The copy-only FPS release and its dated performance tag remain in place.

## Validation

- `unit-tests.txt`: all 756 tests passed, including economy, shared saves,
  progression, family/housing/work and legacy navigation/graphics tests.
  Subsequent new-only landmark refinements were checked by the final route
  and geometry suite below and by actual WebGL renders.
- `final-route-acting-tests.txt`: 27 tests passed on final models/routes.
  Includes all twenty purchases, insufficient-fund atomicity, dry approaches,
  four repeated save normalizations and stale-client merging, unchanged old
  island/road records, unique continuous choreography, actual largest-cat
  animated paw clearance, hollow portal clearance and floating-islet bounds.
- `water-webgl.json`: real isolated Chromium/SwiftShader render checks for
  all sixty water attractions. All preserve animated flow, reduced-motion
  stability, fixed buffers and actual impacts. Slides have idle outlet spray;
  the diving tower correctly has no idle rider splash. Every tested normal,
  grazing and phone static-batch comparison has zero changed pixel bytes.
  The twenty new models also have sixty actual seated-rider captures.
- `released-images.json`: all 68 comparable released-attraction PNGs are
  byte-identical against the separately published copy-only FPS checkout.
  Old scene snapshot fixtures were not regenerated to hide unrelated changes.
- Final models use 18–31 draw submissions and 217,819–335,573 triangles per
  isolated complex in this diagnostic view. This is resource accounting,
  **not a physical MacBook/iPhone FPS measurement**. Whole-world physical
  performance still depends on the player's view and save. The independently
  approved M2 59.99 FPS window is archived in `../fps-copy-only/`.
- The production phone shop/camera/rider check uses private local Worker
  SQLite, never a real player's world or paid inference. Its JSON records
  the exact single payment, construction deadline, three simultaneous main/
  tiny/giant riders, camera switches and two durable reloads.

Primary source files: `public/atoll-slide-data.js`,
`public/atoll-slide-recipes.js`, `public/atoll-slide-props.js`,
`public/atoll-slide-acting.js`, `public/atoll-slide-navigation.js`,
`public/atoll-streaming.js`, `public/atoll-park-biome.js` and
`public/premium-income.js`; shared route/render, catalogue, economy,
placement and save modules integrate them. `AGENTS.md` records the same
requirements for future content.
