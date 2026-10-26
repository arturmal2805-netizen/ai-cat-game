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

The native every-island orbit/zoom/pixel comparison is in progress before
promotion/publication. The all-25-slide load case and final Worker dry run are
recorded when complete. Do not turn partial software-frame samples into claims
about the affected M2 MacBook. Physical-device diagnostics are available from
the independently published `?profile=1` report.

Reproduce the focused check with `CHICHI_ACTOR_SCOPE_AUDIT=1
CHICHI_NATIVE_MAP_AUDIT=1 CHICHI_MAP_CHECK=1 CHICHI_SCENE_STRESS=1
CHICHI_QA_ROSTER=24 CHICHI_QA_HOMES=8 CHICHI_BROWSER=webkit
CHICHI_DESKTOP=1 node scripts/check-aquarium.cjs`. Add
`CHICHI_ALL_SLIDE_STRESS=1` for all 25 reference attractions.
Use `CHICHI_COMPARE_ACTOR_SCOPE=1` instead of `CHICHI_ACTOR_SCOPE_AUDIT=1`
for paired full native frames across the runtime BIOMES list.
