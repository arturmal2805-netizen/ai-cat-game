# Approved performance baseline and copy-only FPS panel

The user's physical Apple M2 report for released application
`0fef7db1295474d0` records 59.99 FPS over 4.984 seconds while moving the
camera on homestead, 64 cats, DPR 2, 1,817,730 triangles. GPU median/p95
12.91/13.26 ms; maximum frame gap 17.7 ms. This is a measured window,
not a guarantee for every island, save or device. Preserve the released
rendering/cadence/geometry-residency/native-pose optimizations.

The requested UI change only removes diagnostic manual and automatic 3D
pausing. Old `pauseAfter` links cannot stop the game. The FPS panel retains
one copy button, bounded samples, clipboard fallback and disposal. Normal
hidden-tab/context-loss/GPU-queue guards remain intact. No render quality,
DPR, model, gameplay, save or simulation policy was modified.

Validation:

- 745 Node tests passed (one obsolete pause-controller test was removed).
- `scripts/check-fps-panel.mjs`: real isolated Chromium WebGL/RAF continues
  past an old five-second deadline; one button, clipboard, textarea fallback,
  no errors, proper disposal. This fixture is a functional UI test, not a
  whole-game hardware benchmark.
- Production build and Worker dry run passed.

The unfinished twenty-slide collection is in a separate worktree and is
excluded from this release, so this patch preserves the user's approved game.
