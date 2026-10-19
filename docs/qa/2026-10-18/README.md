# Publication and performance checkpoint

The 25 additional reference water slides are published on main at `35ff676`.
GitHub run 39165145766 passed test/deploy/pages. The live JS matched the local
bundle byte for byte, contained all 25 recipe kinds, and all 25 PNG previews
were served. Full Node suite: 492/492; all 40 water rendering checks passed.
Real phone browser checks covered all 25 models, hero/tiny/giant seats, both
camera buttons, four concurrent riders, and private SQLite shared save/reload.

Main subsequently received the isolated picking fix at `7aecbaa`; GitHub run
39167235203 owns its gated publication. Its 13 targeted rendering/bounds tests,
production build and Wrangler dry-run passed before push. The private full
phone check subsequently passed. Chichi, fish, cat geometry and rendering are not
changed by that fix. Do not replace or test with the real account/save 1427.

This checkpoint preserved the spatial rendering experiment before validation.
The initial aquarium framebuffer comparisons passed, but the crowded homestead
comparison failed (see the historical JSON). The subsequent fix and repeated
comparisons are documented in ../2026-10-19/README.md. The helper
uses contiguous original index ranges, fixed command buffers, unchanged
vertices/materials, and WebGL multi-draw with a native fallback. The final transparent-material variant is covered by the later GPU proofs.

The ablation timings are software Chromium diagnostics at 776×1464, not real
MacBook/phone FPS. The user reports severe aquarium and camera lag even on a
MacBook; the browser name was asked but not yet provided. Do not claim this
problem is solved from draw counts alone. Several local trials (fish meshlets,
pose textures, a depth prepass and uniform native skinning) had no dependable
speed win and were deliberately not integrated. Preserve approved model detail,
DPR, fish counts, water and shadows.

Useful checks: `CHICHI_STATIC_PROOF=1 node scripts/check-aquarium.cjs`, plus
`CHICHI_SCENE_STRESS=1` for homestead. Do not run timing comparisons concurrently.
`CHICHI_GPU_ABLATE=1` and `CHICHI_PICK_AUDIT=1` isolate work on private saves.
Continue from the saved WIP instead of recreating the 25 slides.
