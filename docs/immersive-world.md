# Immersive controls, mobile scrolling and colossal cats

The canvas now fills the world frame, including the previous header and footer
bands. All existing controls float over the scene with individual backplates.
Island-name billboards are removed. The horizontal island list sits immediately
above the page footer; a chip both focuses that island and scrolls back to the
world. Reduced-motion preferences bypass the page-scroll animation.

## The black-frame regression

The former ResizeObserver called `renderer.setSize` outside the render loop.
Changing canvas dimensions clears its drawing buffer, so mobile toolbar/layout
changes could expose a blank frame before the throttled animation loop drew.
`world-viewport.js` now coalesces layout measurements and commits the final size
immediately before drawing. Canvas CSS dimensions remain independent of its
buffer attributes. The world uses stable `svh` height and an opaque WebGL canvas;
its DPR cap of 2, antialiasing, shadows and landscape details are unchanged.

`scripts/check-world-scroll.mjs` extracts the former resize block from an optional
`CHICHI_SCROLL_BASELINE` checkout and compares real WebGL readbacks. Twelve
resizes reproduced 12 cleared buffers before the change and zero after, at full
DPR 2. Run it with `PLAYWRIGHT_MODULE` and `CHROMIUM_PATH`, as for the portrait
renderer. Node tests cover deferred changes, coalescing, reversed/jittering sizes,
orientation, zero-size observations, invalidation and disposal.

GPU draws pause when the map is more than 160 pixels outside the viewport. The
simulation continues, and re-entry requests a fresh frame. Resizing beneath a
modal waits until the first complete uncovered frame. Context loss pauses the
world behind a recovery panel; the panel disappears after the restored scene
has drawn. No recovery route clears or replaces the save.

## New adoption candidates

Плюшкин (Exotic Shorthair), Пончик (Selkirk Rex) and Зефир (Ragamuffin) use a new
colossal build: a continuous broad belly, short slow steps and a soft waddle.
Their world body widths are between 1.8 and 2.2 times Морошка's. They are paid,
level-gated adoptions, not automatically spawned cats. All existing breed/profile
settings remain unchanged. Frozen geometry/material fingerprints protect Чичи,
Морошка and Нимбус; all 35 pre-existing PNGs (32 adoption plus three hero moods)
remain byte-identical. The menu uses three new cached portraits rather than
constructing additional GPU scenes.

All 35 candidates retain the per-cat limits of 18,500 visible happy-pose triangles,
19 mesh draws and 410,000 buffer bytes. The aggregate catalogue still fits the
previous draw/memory ceilings. These are geometry budgets, not FPS claims for
every phone.

## Release validation

The complete Node suite passes 263 tests. Browser review renders every candidate
in three moods and from side/back/walking views, and compares the hero against
the preceding checkout. A 390×844/DPR 2 touch scenario checks the full-frame
layout, rotation-size transitions, repeated scrolling, off-screen suspension,
island-chip navigation, physical yarn dragging, actual WebGL context loss and
restoration, and the three paid adoptions. It reads the private local Worker/SQLite
save back and reloads the game to verify cats, placements, coins, XP and activity
history. The real player's shared world is not used by these tests.

Chromium software rendering provides repeatable regression evidence; it does
not certify frame rates or reproduce every Safari/device compositor condition.
