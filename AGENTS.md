# Working on Chichi

Preserve the approved Chichi and adoption cat meshes, existing save IDs, owned
buildings, inventory, balances and shared-world synchronization unless the user
explicitly requests a change. Use the existing rendering, interaction and save
systems. Do not replace the game with a separate mockup.

## Every water slide, including island attractions

- Register each water slide/channel in `public/water-ride-data.js`. Its catalogue
  entry must expose the water contract. Include every lane and every connecting
  section; a six-lane slide needs six working streams. Diving towers have impact
  effects but must not emit idle rider splashes.
- Build flowing water from the actual three-dimensional rider route with
  `public/slide-water.js`. A flat plane beneath a sloping slide, an opaque water
  tube, or an empty channel is not a finished implementation. Give the water
  longitudinal metre-based UVs and downhill motion. Retain the shared reflection
  and wave fields, the authored palette and stable smooth surface normals.
- Connect each wet outlet to its real receiving basin or next wet surface.
  Check the whole falling sheet/jet, contact foam, expanding rings and ballistic
  droplets. Water should run and make small outlet splashes while idle; an actual
  cat landing adds a separate larger burst and basin waves once per impact.
- Put rafts and cat paws above the actual channel/bowl floor. Tilt the raft and
  cat together on sloped surfaces. Inspect their real transformed mesh vertices,
  not just a route centreline. Keep support poles below bowl floors and open
  connecting mouths clear of riders. Keep entry, ride, drain and exit continuous. Hide
  unoccupied water rafts. Verify both main-cat and resident manual actions and
  autonomous resident visits, with manual actions and cat needs taking priority.
- Give riding cats choreography derived from the actual seat's speed, height,
  descent, acceleration and signed turns through `public/ride-acting.js`. Cover
  anticipation, bracing/grip, leaning, airtime, landing blink/shake and recovery.
  Reuse the approved cat rig and cached motion tables; keep the carrier on its
  seat. Main and resident cats use the same reactions. Verify cancellation and
  reduced motion restore the ordinary face and limbs without lasting changes.
- Reuse textures/material batches. Continuous effects use fixed GPU buffers;
  never rebuild geometry, upload all particle matrices, create render targets or
  perform scene-copy reflections each frame. Bound concurrent riders and bursts.
  Reduced motion must remain stable. Preserve mobile DPR and graphical detail.
- Extend `test/slide-water.test.mjs` and the water registry coverage check. Run
  relevant route/geometry/interaction/save tests, then the full test suite/build.
  Render every water attraction with `scripts/check-slide-water.mjs`; inspect
  normal, grazing and phone views. A successful build alone is insufficient.
  Use private local saves for browser tests. Never overwrite a live player world
  to test a model. When benchmarking, compare checkouts sequentially and separate
  software-browser diagnostics from claims about physical-phone FPS.

## Expanding buildable islands

Enlarge the terrain/usable area, rather than scaling the houses and decorations.
Preserve the island-local coordinates of owned objects. Maintain the themed core
and leave genuinely buildable outer land. Check all shore clearances, camera fit,
bridges, old and new placements, and repeated saves. Update only snapshots whose
records were explicitly changed by the user's request; add an independent test
that all other island records and existing save fields stay unchanged.
Test shared saves from cached clients using the previous island boundaries.
Their normalization must not silently delete new outer-land purchases; preserve
IDs and attached state while permitting actual storage/replacement without
duplicating or resurrecting a building removed on the other device.

## Map and aquarium performance

- Preserve the approved cats, fish counts/sizes, authored scenery, water,
  shadow quality and mobile pixel ratio. Batch identical rendering work instead
  of reducing those details. Keep CPU camera/picking poses aligned with the
  actual GPU animation, including frozen and reduced-motion frames.
- Navigation radii must come from rest anatomy with breathing clearance, never
  the current animated body scale. Keep pathfinding caches bounded.
- Continuous ambient/fish/bubble animation must keep fixed geometry and instance
  buffers. Use shared pose palettes or clocks, not per-frame matrix uploads.
  Hidden visual branches may defer matrices, but must refresh completely when
  shown; explicit world-space queries must still work.
- Check `test/world-performance.test.mjs`, the actual GPU pose/normal probe
  `scripts/check-aquarium-motion.mjs`, and the phone/save integration in
  `scripts/check-aquarium.cjs`. Separate software-renderer diagnostics from real
  phone frame-rate claims; report counts/bytes and retain equal detail/DPR.
- Whole-attraction culling must use the FINAL camera after face tracking and
  retain shadow casters and complete airborne/underwater rider bounds. Hidden
  active rides must continue simulation. Refresh matrices when shown again.
- Keep Chichi's approved native renderer. Other live cat rigs may batch draw
  submissions per original material, retaining all vertices, Float16 data,
  weighted bone transforms, coat coordinates and depth/shadow shaders. Original
  articulated meshes remain the picking targets on `CAT_PICK_LAYER`; raycasters
  must include it. Dispose custom depth materials along with regular materials.
  Run `test/cat-render-batch.test.mjs` for every adoption profile and
  `scripts/check-cat-render-batch.mjs` for actual same-pose colour/shadow images.
- Aquarium instance culling must preserve logical fish IDs for colour, picking
  and tracking. Compare full and culled frames pixel-for-pixel, including hall,
  close, overhead and phone views; never cull by apparent size or simplify fish.
- Preserve render deadlines through RAF jitter; do not restart the idle-frame
  interval from each late callback or replay missed GPU frames in a burst.
  Visible play, including a stationary camera, targets 60 FPS. Covered/offscreen
  simulation retains its slower cadence and hidden documents submit no frames.
  Test every initial phase of +/-2 ms jitter on 60 Hz RAF and 90–240 Hz displays.
  Bound the early allowance and consume that same deadline when advancing;
  duplicate callbacks and late recovery must not emit catch-up submissions.
  This cadence contract does not establish a physical-device rendering rate.
  Browser/SQLite checks must snapshot `.generated/worker.mjs` to their own temp
  directory: `npm test` rebuilds that file and otherwise hot-reloads QA servers.
- Keep GPU submissions bounded with nonblocking fences. Never wait for GPU
  completion on the UI thread, lower DPR, or skip visual details to relieve a
  busy frame queue. Preserve native Chichi skinning and zero-weight semantics;
  verify `CHICHI_NATIVE_SKIN_CHECK=1 node scripts/check-cat-render-batch.mjs`.
- Camera gestures must not initialize picking bounds by skinning every vertex
  of every cat. Use conservative current-joint bounds before exact raycasts;
  preserve hit positions/faces and test actual articulated mesh vertices.
- Native sphere calculation may reuse bone-matrix products within that single
  synchronous calculation. Preserve Three's vertex order, exact sphere centre
  and radius, native sorting and all custom vertex/skin callbacks. Restore a
  temporary method override even on errors; never cache transforms across
  animated poses or replace sorting spheres with conservative approximations.
  Verify exact posed spheres and actual colour/shadow pixels.
- Static range submissions must retain original index order and attribute
  buffers, and use the actual colour/shadow camera. Builders can install wind,
  reef sway or underwater refraction after merging: those meshes must remain
  native, including during shader precompilation. Compare actual frozen frames
  on both the aquarium and a heavily built homestead before publishing.
- Colony-wide sharing must retain original Float16 vertices, weighted joint
  palettes, material tints, exact CPU-combined model-view/normal matrices and
  separate colour/shadow camera data. Bound/reuse pose slots and reclaim only
  unused GPU draw buffers; GPU eviction must never unregister a living cat.
  Small scenes may keep individual draws when sharing adds overhead. CPU-only
  rig branches may be omitted from render traversal only after matrix updates;
  restore the original child arrays before callbacks/picking and on exceptions.
  Check same-pose images and full renderer work, not just simulation or draw
  counts. Never translate software-GPU diagnostics into device FPS claims.
  Outfit paint can be shared with static scenery: range-only materials that
  undefine Three's batching shader must remain native in colony rendering.

- Camera damping follows actual elapsed time while physics retains its capped
  step. Pinch must not eagerly raycast/cancel a cat; retain actual single-touch
  drag and tap selection. Test wheel, orbit and pinch on every island.
- Bound unused GPU geometry residency without touching CPU models, attributes,
  animation, materials or saves. Record both colour and shadow use; shared
  attribute owners retire together only when all are idle. Current rendering
  always wins over the cache budget. Compare real pixels after re-upload.

- GPU buffer retirement must use `retireGeometryBuffers`, not an unscoped
  geometry disposal: native cat disposal listeners also own atlas lifetimes.
  Check live registration AND joint-entry totals after repeated eviction/wake,
  then check that actual model destruction still frees every slot once.
- Hidden-leaf matrix deferral is limited to non-hero rigs. Never defer child
  bones or generated draw batches whose visibility is decided after matrix
  traversal. Explicit hidden skinned queries must refresh bind inverses. Test
  visible/waking poses, tongue transitions and exact native GPU images.
- Cloud queue performance changes must retain legacy journal bytes, synchronous
  durable writes/read-back and immutable owned merge snapshots. Do not defer a
  purchase save to hide a slow frame; test restart, lost ACK and cached clients.

- Shader preparation must retain the real light/environment layout and exact
  texture data. Reuse unchanged variants and uploads; custom animated shaders
  must keep native dispatch. Static traversal pruning restores original child
  arrays before callbacks, input and exception propagation.

## Permanent families and personal cat lives

- Preserve released `cat-sex.js` identity assignments: changing the hash or an
  existing cat's override invalidates lifelong couples. Sex badges belong only
  on cards, never on the map or approved meshes.
- Families are permanent AI choices in the after-work batch, reviewed every
  14 game days, with a quarter-roster introduction budget per review
  (two members per new couple). This is pacing, never a lifetime family cap: every
  compatible single cat remains eligible in future reviews. Keep existing
  partners, the calendar origin, shared active residence, personal ownership and
  private balances. A paired venue kitten must remain available after storage.
- Cached clients omitting `family` must not erase it. Conflicting partners and
  over-capacity concurrent proposals must fail atomically; progress merges must
  not replay a completed visit or a payment. Never test against a player world.
- Reuse native reserved seats, routes and animations for AI leisure. Bound active
  outings and give work/manual control priority. No additional per-cat AI calls,
  GPU portrait builds, altered approved rigs or reduced graphics.
- Run the family/leisure, housing and shared-save tests, full suite/build and
  `scripts/check-family.cjs`. Inspect real phone cards and the loaded shared
  house, not only transient simulation positions.

## Economic AI scheduling and reserve

- Professions are initial AI choices, not daily choices. Preserve established
  careers, history and wallets. Send only pending initial careers and one
  after-work batch of actual leisure/buying/family decisions. Never replay
  missed offline days as model calls or add per-cat inference timers.
- Reserve events durably on the client and per-world server ledger before
  inference. Coalesce concurrent devices, recover lost ACKs and retain initial
  career results. Failed providers must not create an immediate retry loop.
- Cloudflare stays primary; OpenRouter is a server-secret reserve only on
  failure. Never expose or log credentials. Routine deploy tests must not spend
  real AI credits; real inference checks are explicit, isolated and bounded.

### Capybara island standard for every future biome

- Preserve the approved capybara architecture: synchronous compatibility wrappers run the same cooperative generator as background island creation; retain all authored geometry, materials, animal poses, water, lighting and playable space. Use the shared priority scene scheduler for geometry, placement refreshes and housing templates. Selected work preempts at the next slice; remote work pauses during camera gestures and resumes without rebuilding completed steps.
- For static baking use `copyGeometryBuffers` (independent exact attributes/index/groups/bounds), not procedural subclass `.clone()` constructors. This avoids regenerating a default sphere/torus/rounded box before overwriting it. Do not apply this shortcut to editable procedural source models or change cat anatomy.
- Prepare exact colour/depth shaders and textures cooperatively before revealing a new model. Reuse immutable templates and native materials safely. Coalesce requests per model/purchase; bound concurrent house preparation and prioritize visible homes nearest the camera. A late background completion must not attach objects or retain templates after disposal.
- Offscreen decoration updates may sleep with their detail group; gameplay, active rides, residents, families, work, purchases and save receipts must continue. Base water/waterfalls visible at a distance must retain their original animation. Keep final-camera/shadow-frustum culling and explicit world-space queries correct.
- Expanding housing navigation uses per-section bounds, preserving exact original footprints and independent two-cat bed seats. Unchanged cloned saves reuse navigation objects; changed plots refresh them. Never cap permanent houses, delete ledger records to save memory, alter balances, or add per-cat AI requests.
- Compare a private, identical stress fixture against `baseline/capybara-standard` before accepting changes. Record loading, command-frame median/p95, memory/geometry/object counts and real full-resolution images. Software-renderer timings are not Mac/iPhone FPS. Run every-island camera/zoom and return checks plus housing/family/save tests. Reject a reproducible regression; do not trade graphical quality or durable writes for a benchmark number.

### Approved smooth-world template: objects, houses and islands

The user-approved baseline for all future content is now
`baseline/approved-smooth-world` (released code `b6e4287`, explicitly approved
again by the player on 2026-10-21). The immutable dated reference is
`baseline/approved-smooth-world-20261021`; the preceding approval is archived at
`baseline/approved-smooth-world-before-20261021` (`4e4f7e4`). Keep
`baseline/capybara-standard` as the older comparison. Do not discard subsequently
approved improvements when testing a new candidate.

- Save each successful, independently verified optimization in its own commit.
  Compare against the latest player-approved runtime, preserve its dated remote
  reference, and revert only a failed experiment. A subjective progress estimate
  is player feedback, not a measured FPS percentage. Never promote a combination
  before checking its individual contributions and regressions.

- Every new object, venue, home and biome must follow the same resource and
  loading contract: shared immutable geometry/material templates, cooperative
  preparation for large builds, selected-view priority, exact shader/texture
  warmup, bounded pending requests and explicit teardown. Preserve original
  interaction/picking objects and coordinate/save identities. New islands are
  not exempt because they have unique scenery or NPCs.
- Continuous effects reuse fixed buffers and clocks; active gameplay and durable
  state continue when decoration sleeps. Do not reduce anatomy, vegetation,
  water, animation quality, DPR or shadow quality as a shortcut.
- Durable saves remain synchronous with write/read-back and the released backup
  and outbox format. Queue merge bases may reuse only internally owned immutable
  snapshots. Always clone an incoming live game; never trust/reuse an arbitrary
  external object or cache serialized bytes across live mutations. Prepare a
  rollback lazily, but retain the exact verified prior state on every failure.
- New content and performance changes must pass relevant interaction, ownership,
  repeated save/reload, camera/return and disposal checks against this approved
  baseline. Record operation counts and actual images. Keep measured improvements
  and revert a reproducible regression before publication.

### Frame-rate regression gate

- This is a common standard for EVERY existing and future island, not an
  aquarium-only or selected-biome option. Use the runtime BIOMES list for the
  camera/orbit/zoom/return audit; include quiet islands and Job City as well as
  capybaras, aquarium, housing and a heavily built homestead. Repeated stalls
  during a single turn require frame-gap/long-task evidence, not only average
  FPS. Keep graphics and working two-cat family sleep unchanged.
- The player reports a regression across the map, including capybaras. A saved
  baseline is a rollback reference, not proof that every later optimization is
  beneficial. Investigate common rendering changes before simplifying a biome.
- Faster saves, fewer calls/triangles and command-only timings do not establish
  an FPS improvement. Before promoting a rendering optimization into the common
  template, compare identical worlds, cameras, DPR and detail using complete
  rendered frames and the native RAF/GPU-queue path, with warm repeats. Include
  every island and camera zoom/orbit. Report insufficient samples honestly and
  identify the browser/renderer; software-GPU numbers are not MacBook FPS.
- Keep exact-image and interaction/save checks alongside timing. Reject a
  repeatable slowdown; leave a candidate out of the template when its gain is
  unproven. Preserve previously useful independent fixes when reverting a
  specific experiment.
- Never query GPU pixel-unpack state or wait for GPU completion as part of a
  depth-target copy in a production frame. Use the renderer's tracked framebuffer
  bindings and an exact depth-only GPU blit; restore READ/DRAW state on failure.
  Completion waits/readbacks belong only in isolated QA measurements.
- Prepare the actual native shadow packing selected by the pinned renderer;
  retain explicit custom packing. Shared GL-program identity alone does not
  establish another material's initialization or ownership. Do not skip that
  preparation based only on fewer compile calls; verify first-draw readiness,
  disposal and full frame behavior before changing the per-material contract.
- Measure HUD content dimensions on actual resize/invalidation. Do not read
  layout after badge mutations every frame, and do not replace client content
  dimensions with rounded border-box dimensions.

### Persistent construction caches

- Version reusable model/geometry buffers by the complete construction dependency
  graph and pinned geometry libraries, not the whole app bundle URL or release.
  Unrelated UI, save and island updates must retain byte-identical cached models;
  actual producer/schema/library changes must invalidate them. Keep corruption
  fallback, original uncached construction and all graphical detail. Verify both
  same-app reloads and a changed app URL in the real browser. This is a loading
  optimization; do not present construction timing as camera FPS.
- Keep graphics-cache writer/decoder entry and byte limits compatible. Large
  colonies may contain hundreds of small variants within the byte budget; do
  not reject their entire useful cache because of a smaller legacy count cap.
  Bound metadata, validate original bytes, and retain uncached full construction.

### One home per permanent family

A couple keeps its earliest purchased home (timestamp, then stable ID), shares
its two resident seats, and cannot buy a second home manually or through AI.
Legacy duplicates move to `housing.retiredHomes`: preserve original purchase
receipts, balances and high-water sequence counters; never resurrect them from
a cached device. Conflicting simultaneous spouse purchases must reject the
second transaction atomically. Do not cap homes for unpaired cats or change
family pacing. Retire only the duplicate house's visual instance; retain shared
models, terrain and the surviving home.

### Crypto office and weekly investments

Use `CRYPTO_RULES.intervalDays` (seven game days) on client, server ledger and
UI; do not change the independent fourteen-day family pacing. Official crypto
employees only; skips/poor balances consume the cycle without AI. Reserve
before networking and coalesce per-world requests; no per-price-tick AI calls.
Keep escrow, signed PNL, fees, liquidation and terminal receipts durable and
idempotent. Corrupt investment records must select a backup rather than erase
escrow. Office screens share one fixed price array and instanced draw; preserve
native stairs, work seats and approved cat rigs. Routine checks use private
SQLite and mocked forecasts, never player worlds or paid inference.

Rare moonshot events are local deterministic draws per newly opened durable
attempt (5%, price 8–25x), not per-price-tick rolls or extra AI calls. Persist
the entire path and event once; never regenerate an existing/legacy position.
Show a rally only after its saved start time. Keep LONG/SHORT risk, first-crossing
liquidation, escrow and once-only settlement; verify reload and simultaneous
settlement cannot create a second payout.

### Working day 09:00–17:00

All work, attendance, wages and after-work AI use JOB_START/JOB_END. Preserve
JOB_CLOCK_ORIGIN (released 12:00 epoch origin) so changing work hours does not
reset the current game clock, day count, AI reservations or weekly trades.
The new eight-hour maximum is JOB_SHIFT_MINUTES; pay only attended time and
settle once at 17:00. Quiet cats may return home then; other cats retain their
chosen free-time itinerary until the existing evening curfew.

### Native-frame GPU resource bookkeeping

Player-verified individual cat rendering is the ordinary world path as of
2026-10-27 (physical Safari Job City 44.11 FPS and Chrome/Metal M2 attractions
42.61 FPS, both DPR 2; different views/browsers are not a controlled multiplier).
Keep the approved native per-cat palettes and Chichi renderer. Do not prepare
unused colony BatchedMeshes, shaders or shared pose uploads in this mode.
Retain live registrations, native picking and material/pose data. Colony sharing
is an explicit `profile=1&catDraw=shared` comparison, never a silent return based
only on fewer draw calls. Preserve the earlier immutable baseline references.
These reports approve the rendering choice, not a claim of universal 60 FPS.

Use one timestamp for each native renderer frame, retaining both colour and
shadow use, instead of reading the clock on every draw. Under memory pressure,
only geometry absent from the last three native frames may retire before the
legacy time grace. Protect every recent shared-attribute owner and current
rendering above the soft budget. Keep cleanup bounded, original CPU source,
cat atlas registrations and full-resolution re-upload. Never use model destruction
as GPU retirement. Verify actual GPU bytes, exact return images and repeated
camera transitions; resource savings do not establish a device FPS increase.

Native/colony cat draw buffers are reusable caches across camera visibility
thresholds. Never eagerly dispose native fallback buffers on entry to a shared
draw: a turn back can immediately need them again. Mark both representations
with `retainGeometryForGrace` so the residency controller applies the normal
time grace to them, while abandoned island buffers retain fast pressure
retirement. Test repeated threshold crossings, actual WebGL upload bytes,
colour/shadow pixels, live atlas registrations and the real RAF/GPU queue.

Rapid policy-eviction returns must retain a bounded working-set grace, using
weak history rather than a second owning model cache. Keep the original fast
retirement for cold remote geometry, shared-stream ownership and one clock read
per native frame. The current learned grace is two seconds of last use, with
at most 64 MiB / one third of the soft budget as an idle-cache allowance; current
rendering still wins and the existing sweep cadence is not a hard memory cap.
Check real bufferData transfers, over-cap reclamation, eventual idle release,
live cat registrations and exact return frames. Resource savings alone do not
establish physical-device FPS. Opt-in reports distinguish fresh transfers from
policy refaults and expose preparation state without player records or keys.

Trim cold idle geometry before breaking a learned returning-camera working set,
even when a new upload temporarily exceeds its allowance. If cold reclamation
cannot satisfy the allowance, pressure may retire idle protected buffers in a
second pass. Both passes share the same 2 ms cleanup budget; retain shared-owner
safety, current-frame precedence and the original memory limits.

### Static vertex reuse in the shared builders

Keep byte-identical attribute comparisons, independent copied indices, the
released triangle/cache order and cooperative preparation. Cache only immutable
shared primitive sources; consume temporary alias maps without serializing them.
Corners whose normals are generated later must retain the native path. A shader
depending on vertex IDs must retain original IDs rather than use aliases.
Do not apply this static-copy path to the approved native cat/fish rigs. The
2026-10-26 report records a modest, varied software-frame result, not a universal
FPS standard; every future island still needs the full native-frame gate.

### Catalogue images must not rebuild the world during play

Bundle the shipped preview manifest with its matching application and retain
the original versioned PNGs. A failed metadata request or one missing preview
must never discard valid images and synchronously rebuild every attraction
and island in another WebGL context. Development-only capture must stop when
the shop closes or the document hides, retain completed captures and dispose
its temporary renderer/models. Keep the explicit authoring capture path.
Verify the real close-and-zoom path with a failed metadata request; distinguish
this fault recovery from ordinary island FPS. Preserve the independent native
rendering, shader/cache versions and approved graphics.

### Approved M2 baseline and giant water worlds

Keep `performance/approved-m2-60fps-2026-10-27` as the immutable reference for
the player's approved native rendering. Its moving homestead report records
59.99 FPS, 64 cats and DPR 2 over 4.984 seconds; this is a measured window,
not a guarantee for every scene. Diagnostics must never pause the game:
the FPS panel has only a copy-report button, including with legacy pause links.

- Author a distinct physical route and measured-speed/height/turn choreography
  for every slide. Keep inversion through the complete last loop, true hollow
  cave/arch clearance, bowl exit openings and separate race-lane finishes.
  Verify real animated paw vertices for the largest approved cat, cancellation
  and reduced motion. Ride-only joint adjustments belong outside sculpt/cache
  producers; unrelated content must retain the approved cat cache version.
- Giant purchased complexes prepare cooperatively near the selected view,
  with bounded requests and no work during camera gestures. An overview must
  not initialize every owned complex. Once prepared, occupied offscreen rides
  retain their simulation and restore their full visuals on return.
- Bundle real model previews. Preserve every released island centre, road and
  placement ID when appending a park; protect unlocks and purchases against
  cached clients. Keep unpaid premium income in the existing register when
  the established wallet is full, rather than invalidating the save.
- Validate the complete collection in normal, grazing, phone and seated-rider
  views. Retain exact old-attraction image comparisons, fixed water buffers,
  and real private-SQLite shop/camera/rider/reload checks before publication.
- A finished or re-placed paid attraction must request its model even at the
  ordinary distant island camera. Opening its card/camera or requesting a ride
  must also prepare a cold model; inspection cannot require a model that only
  inspection would load. Await the coalesced geometry AND shader-warmup promise
  before assigning riders. Preserve cancellation and leisure tickets.
- Distinguish a finished asset being prepared from actual timed construction.
  Keep passive overview preparation bounded and gesture-aware, and test a real
  completion at distance 900, cold camera/manual requests and phone bag
  replacement without a second payment or construction deadline.

### Magical farm islands

The player withdrew all four large farm islands on 2026-10-28 pending revised
instructions. Keep their historical crop/ownership save records, but do not
register their biomes, roads or shop cards again without a new request.

- Append new biome centres and plant IDs without moving released islands or
  changing old scenery/save identities. Reuse the native land shop, crop stock,
  feeding, sale and shared-save journal; farms do not add currency or AI calls.
- Persist each plant's ripening cycle and deadline. Reserve plants and deposit
  bays transiently using actual rest-anatomy clearance. Award stock only after
  delivery with a validated farm/plant/cycle receipt; cancellation and reload
  must not duplicate a fruit. Cached clients omitting orchards must retain them.
- Build distinct fields cooperatively using the selected-view scheduler and
  native water/vegetation. Keep remote proxies cheap, static material batches
  immutable and ambient animation in fixed buffers. Update fruit instance
  matrices only when a saved growth stage or reservation appearance changes.
- Keep every plant reachable by large cats and retain room for simultaneous
  visitors. Bound local A* work to reservation, use live actor clearance while
  walking, and align real fruit branches, paws and carried baskets. Give work,
  care and manual control priority over local autonomous harvests.
- Verify all farms' purchase/regrowth/feeding/cancellation/shared saves and
  repeated reloads. Run `CHICHI_MAGIC_FARM_AUDIT=1` with the existing private
  phone/SQLite browser harness and inspect actual island and harvest images.
  Preserve approved cat cache bytes, graphics, DPR and renderer cadence.
