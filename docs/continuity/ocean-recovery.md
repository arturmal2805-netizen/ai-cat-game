# Ocean recovery: start here after a context reset

Updated 2026-11-16. **WORK IN PROGRESS. NOT ACCEPTED. NOT A RELEASE.**

## User requirements and current priority

Repair ONLY Mosasaur Ocean (`autumn`) first. The user explicitly says the
CURRENT slide water is fine. Preserve it. The earlier request to restore all
slides was superseded. Finish ocean before the paused mall architecture work.

- Double the released WATER AREA, predominantly adding navigable water; do not
  scale cats, animals, buildings or purchased objects.
- Clear real deep space in front of the underwater mall. Move obstructing reef
  meshes using full authored geometry; excavate the bed and retain collisions.
- Clear blue/turquoise water, readable shallow bottom, visible animated waves,
  coherent reflections and highlights; no opaque dark blue film.
- Substantially improve seabed geometry, material and ecosystems. Large empty
  smooth floor with isolated decorative coral circles is explicitly rejected.
- Crimson Desert GAME water and underwater footage are the user-provided visual
  target: dense varied foreground reefs, rocks, sediment transitions, refraction
  and reflected light. This identifies the reference, not an equivalence claim.
- Preserve cats/models, fauna counts/sizes, wallets, jobs/vacations, inventory,
  all purchase IDs/deadlines/ownership, saves, controls, mobile DPR and shadows.
- Do not publish unverified changes or call a partial screenshot the full audit.

## Immutable sources and evidence rules

The explicitly approved historical water source is
`d6fa8056f18d2d738890cc9b477334e4cda81523`, identified by AGENTS.md's approval,
not the commit title. Inspect the COMPLETE image chain before copying code:
water-shading.js, showcase-water-optics.js, showcase-bottom-light.js,
water-environment.js, slide-water.js, slide-basin-optics.js, showcase-water-assets.js,
showcase-probe-assets.js, generators, real reflection inputs, colour spaces,
lighting and native clocks. Never invent a replacement and call it d6fa805.

Last verified published baseline:
`12d478e82e8e5a2bd6ef3ec0cbb151ea1e473d1d`.
Actual live JS SHA256:
`507539ea7920b0489284d8572aef4481c8506e1d643a24a8becda9d79b7a8ca5`.
Actual CSS SHA256:
`c14ce8408f8f3aed7a5e7991eca39663fe55377343421ff62e0600ada4c048ef`.
The URL parameter alone does not establish the loaded version.

The CURRENT accepted slides are pinned by
`test/fixtures/approved-slide-and-wave-field.json`: seven exact source hashes,
eight real reflection PNG URLs, and the exact original d6fa805 128px wave-field
byte hash. Source-revision metadata may change after a GENUINE recapture;
slide image bytes/URLs must remain unchanged during this ocean-only task.

Main world sun/hemi/rim intensities are currently constant, with exposure 1.
The header saying midnight does NOT establish different scene lighting. Native
comparisons must record both actual game clock and actual lights/fog/exposure.

## Current implementation and limitations

Source history contains separate ocean surface work through `4392a96`, physical
expansion `54eb617`, and combined merge `a8344b7`, followed by the saved draft.
Read the actual working tree/HEAD and diffs: these IDs are checkpoints, not a
claim that their appearance is accepted. Nothing after 12d478e is production.

Implemented: ellipse area exactly twice 12d478e, same metre shore width, same
individual reef/headland size, old pickup at (0,23). Only autumn world centre
moves from (-450,500) to (-450,600), keeping the infinite housing strip clear.
`MOSA_RELEASED_SEA` preserves paid addresses on the previous shoreline. Strict
comparison against `pre-ocean-expansion-12d478e.json` protects every OTHER biome.

Forecourt is a real excavation (ellipse x0,z164,rx180,rz72,floor-190), shared
with whole-mesh reef fitting and the collision field. Twelve large reefs remain;
five are refitted, seven keep their authored object identity. Do not shrink
cat radii, disable collisions or teleport through a wall. Tests sweep entire
submarine-sized routes, not just endpoints.

Seabed channels/dunes, broken cliff crowns, 1536 colonies (1024 original plus
512), 16 asymmetrical deep gardens and 64 small real rocks are present.
Small rocks share the three detailed cliff geometries and the physical signed
field. Instance buffers stay immutable. Actual Three.js ray hits are checked
against collider support. Root finding was refined rather than weakening the
0.15m support tolerance. Deep coral LOD was just split into 16 additional LOCAL
groups; it is NOT YET verified after this last edit.

Ocean optics use the actual original wave field, a local approved highlight
lobe, real coastal reflection, metre-depth scattering, and resolved swells up
to +/-0.83m. No global exposure/light/slide edits or realtime reflection pass.
Ocean sand no longer receives a baked blue-by-depth vertex tint on top of
water extinction. Instanced triplanar mapping uses real instance transforms.

### Explicitly rejected drafts: DO NOT ship these as finished

See `../qa/ocean-recovery/rejected-forecourt.png` and
`../qa/ocean-recovery/rejected-coral-close.png`.
User: slightly better, still much too empty, seabed texture unacceptable.
The 16-garden placement alone does NOT satisfy the reference. Avoid repeating
that approach and merely changing colour, fog, screenshot angle or exposure.

Last measured standalone forecourt draft was **16,546,144 triangles / 345 draws**
versus baseline **2,778,073 / 229**, both 32 textures. This is a FAILING resource
result. Its deep colonies shared an empty central LOD centroid closer than the
actual gardens, selecting excessive near detail. New per-garden LOD code is
unmeasured. Do not quote a different camera's triangle count as a comparison.

Current floor scan is Coast Sand 01 ALBEDO ONLY, sampled at two-metre scale;
there is no proper sand normal/roughness hookup. Stone and coral already have
real OpenGL normal/roughness maps. Investigate actual source images/packing and
visible scale before choosing new material. Do not label a derived normal as a
source scan. Poly Haven access currently fails with proxy 403; configured hosts
allow GitHub/Cloudflare/package services, not api.polyhaven.com/dl.polyhaven.org.
Respect that boundary; use environment network configuration if needed.

## Verification state (honest, not a release certificate)

- Expansion/corals/world consolidation targeted 12/12 passed.
- Whole mesh forecourt, full-body approach, dense mixed garden/clear passage
  checks passed. Actual mesh/rock/collider/immutable-buffer set 7/7 passed.
- Initial surface-only native visibility: retained contrast ~0.751 desktop and
  phone, opaque control ~0.036; unchanged guard requires >0.65.
- Initial full Node22 suite: 1071 tests, 1057 passed, 14 old boundary expectations
  failed. Then 1072 tests, 1071 passed, ONE failure: old autumn road endpoint in
  before-magic-zoo fixture. Only that road was subsequently updated, unrerun.
- Only requested autumn fields in nine snapshots changed; other records remain
  strict. Historical catalogue hash stays unchanged via the frozen old record.
  Grass tests move from newly flooded x269/270 to the new real shore x367/368.
- Eight slide probes were genuinely recaptured; their PNGs remain byte-identical.
  Ocean probe was genuinely recaptured. Latest renderer/LOD edits make producer
  metadata stale again: REBAKE, do not update hashes without rendering.
- Current Node22 build exists but is NOT final after latest edits.
- Full actual game day/night, frame timing/memory, private SQLite and Explorer
  route audits are still pending for the final draft. No CI/release verification
  for this draft. Do not claim otherwise after a context reset.

## Repeatable workflow and publication gate

1. Inspect current files, git status, main, remote draft and full source diffs.
   Never reset / delete other worktrees. Missing historical branches are not
   recovered merely because similarly named code exists.
2. Finish physical seabed/material/dressing, prove acceptable native views and
   bounded LOD/resource costs. Keep the central approach genuinely traversable.
3. Under Node22: genuinely bake scripts/bake-water-reflections.mjs and
   scripts/bake-mosasaur-reflection.mjs from FROZEN producers, then npm run build.
   Never hash-only a stale probe. Keep original model sources intact.
4. Run relevant checks and full npm test; Wrangler deploy --dry-run. All green.
5. Native `scripts/check-global-water.mjs` uses separate /before/ and /after/
   asset roots; NEVER serve new assets under the old source. Equal local camera,
   clock/settings/save; separate scenery changes from shader attribution.
6. Full native app: `CHICHI_EXPLORER_AUDIT=1 CHICHI_OCEAN_ART_AUDIT=1
   CHICHI_DESKTOP=1 node scripts/check-aquarium.cjs`. New art helper is written
   but unrun: fix the harness if needed, never weaken behaviour assertions.
   Baseline adds `CHICHI_BASELINE_REF=<full12dSHA>` and
   `CHICHI_BASELINE_ASSETS=<baseline-worktree>/public`.
   Run sources sequentially with ONE GPU browser and NO heavy CPU test/build
   contending during full-frame timings. Preserve exact build/hash/PNG/settings.
7. Full Explorer route uses CHICHI_EXPLORER_AUDIT=1 without art flag: exit boat,
   third-person swim, reboard, genuine airlock/walk/escalator, world/island camera
   release, autonomous life, private SQLite reload. Keep real collision checks.
8. Verify accepted slide images, visibility guard, phone DPR, clocks, fixed GPU
   buffers and teardown. Record complete frame intervals, pauses and memory.
   SwiftShader timings are diagnostics, not physical phone FPS.
9. Separate production ocean commit only AFTER audit. Wait for every CI job,
   server release/save verification and actual live HTML/JS/CSS byte hashes.
10. Refresh continuity records and WIP backup (HEAD binary diff, cached binary
    diff, porcelain status, changed/untracked files and an appropriate Git
    bundle). Test archive readability. A file tar is not full Git history.

## Local evidence / recovery pointers

Current tree: /workspace/chichi-ocean-expansion. Original WIP:
/workspace/ai-cat-game, never reset. Historical exact source checkout:
/workspace/chichi-water-approved-d6. Accepted current slides:
/workspace/chichi-mall-realism (12d478e). Paused architecture tree:
/workspace/chichi-mall-architecture, no architecture implementation yet.

Latest local detailed log: /workspace/qa/chichi-active-work.md.
Draft QA: /workspace/qa/ocean-expanded-refined-preview, refined.log,
refined-tests.log, ocean-refined-collider-tests.log. These are local artifacts,
not guaranteed to exist in a new environment; the repository records above
are the portable source of truth.

WIP r7 archive: /workspace/artifacts/chichi-realism-all-wip-2026-11-16-r7.tar.gz,
SHA256 2b40338d76644fd175c509fa0351ae502267de5c4f4b62b4ccaeb3c2e58dd127.
97 readable members, incremental history requiring published c9a2ac7, NOT full
Git history. It predates some latest edits: regenerate before final handoff.

On EVERY future stage, update this record with accepted/rejected outcome,
actual source/asset provenance, exact source/build IDs, checks and next step.
Never record an intended action as completed.
