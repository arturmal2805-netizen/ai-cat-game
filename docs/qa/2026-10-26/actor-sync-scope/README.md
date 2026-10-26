# Avoid static-world refreshes for actor-only updates

The released scene key contains adoption and cat destinations together with
buildings/scenery. Receiving another cat destination unnecessarily recreates
all static navigation arrays, checks every island and serializes every static
batch material. It also invalidates obstacle-identity navigation caches.

The candidate retains the original static key fields and separates the actor
key. Actor-only changes run the unchanged actor synchronization block: existing
models/carriers stay in place, profiles update, new cats are created once and
removed actors are cleaned up normally. Builder eligibility still invalidates
on a roster/destination change. Structural updates and async model completions
retain the original full scene path. Housing, families, meals, income, current
game state and care synchronization before the key check still run normally.
No save schema, ownership, money, AI schedule, renderer, model or water changes.

## Focused native browser verification

Private SQLite, Linux WebKit software graphics, DPR 2, 24 adopted cats, eight
homes, four giant rides and sixteen extra businesses. A private-only hook
forces the released full scene path to compare against the actor-only path.
Both use the same live source functions and identical game state.

- Identical frozen native image: zero changed bytes, 613 draw calls and
  3,181,278 triangles in both paths. All 76 carriers retain their identity and
  exact positions; no context loss or GL errors.
- Four alternating batches of sixteen destination changes: original sync
  durations range 14–130 ms; candidate 1–2 ms. Static refreshes: 32 versus zero
  for the two original/candidate batches. These are component latency results,
  **not a claim of a corresponding FPS multiplier**.
- Adding, repeating and removing an adopted cat creates/removes one actor with
  no static refresh. Actual building rotation, construction and completion still
  trigger all three static refreshes and preserve the expected model state.
- JS/HTTP errors: zero. Full suite: 716 tests pass; build passes.

The completed native replay covers **17/17 islands, 42 orbit/zoom samples and
17 same-pose image comparisons**, all at original DPR 2. Changed image bytes:
zero. No JS/HTTP errors or context losses. In those native samples, 213 released
update events have median/p95/max 23/50/303 ms; 216 candidate events have
3/11/73 ms. Some candidate events still require the full path when an actual
model completes in the background. See `summary.json` and the raw frame data.

The software FPS pairs are mixed: 11 higher, 10 lower, median ratio 1.0106.
There are few frames per ten-second sample, live poses and four samples ending
with further shader preparation pending. First-view pixel checks also reset
the shadow cache, so first/second sample warmup differs. These samples retain
the full native pipeline and reveal stability/latency, but **do not establish
a general FPS improvement or justify a new device-FPS template**. The accepted
change removes unnecessary actor-update CPU work; the player's continuing
ordinary-render lag remains open pending a physical `?profile=1` report.

The larger private fixture includes **all 25 reference slides**, the four
existing giant rides, sixteen additional businesses, eight homes and 24
adopted cats. Its complete frozen frame is again identical: 724 calls,
3,526,675 triangles, zero changed bytes. Alternating sync batches are 14–52 ms
released and 1–4 ms candidate. Its adoption/construction checks pass again;
no JS/HTTP errors occur. The screenshot at
`/workspace/qa-actor-scope-all-slides/actor-scope-homestead.png` was inspected.

The actual aquarium path cache test demonstrates the secondary saving:
released actor updates replace all six static navigation collections and
discard a populated 20,449-byte walk mask. Candidate updates retain all six
identities and the warm mask. Both return the exact same route, with every
segment collision-checked. Real structural changes still refresh navigation.
Build, full suite (716 tests), final focused browser checks and Worker dry run
pass. The sculpt cache fingerprint remains unchanged.

Reproduce the focused check with `CHICHI_ACTOR_SCOPE_AUDIT=1
CHICHI_NATIVE_MAP_AUDIT=1 CHICHI_MAP_CHECK=1 CHICHI_SCENE_STRESS=1
CHICHI_QA_ROSTER=24 CHICHI_QA_HOMES=8 CHICHI_BROWSER=webkit
CHICHI_DESKTOP=1 node scripts/check-aquarium.cjs`. Add
`CHICHI_ALL_SLIDE_STRESS=1` for all 25 reference attractions.
Use `CHICHI_COMPARE_ACTOR_SCOPE=1` instead of `CHICHI_ACTOR_SCOPE_AUDIT=1`
for paired full native frames across the runtime BIOMES list.
