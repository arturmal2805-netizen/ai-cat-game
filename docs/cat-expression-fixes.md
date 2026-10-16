# Facial polish without redesigning the cats

The three saved AI moods remain `sleep`, `crazy hungry` and `happy`.
`cat-emotions.js` supplies short curiosity, delight, affectionate slow-blink and
drowsy transitions. They animate the existing head, eyes, ears, tail and paw;
no mesh or texture is added. Actions and mood changes trigger reactions, and
an idle happy Chichi occasionally shows one. The layer finishes at neutral,
does not accumulate transforms, and respects reduced motion. Other cats retain
their existing animation system.

The tongue's position is transformed back into the moving jaw's coordinates
each frame so its centre stays at the mouth opening, including in exported GLB
clips. The old position followed the lowered chin and left a visible gap.

Neighbours retain their eye geometry, iris, pupil and reflections. Only their
outer globe backing changes from mouth-dark to coat colour so a side view
cannot reveal a black socket wedge. Chichi's eye materials are unchanged.
Adoption portraits are rerendered from the repaired rigs with content hashes.

Tests retain the frozen approved Chichi fingerprint after normalising only the
intentional tongue anchor correction. Frozen Nimbus and Cloudberry fingerprints
exclude only the repaired eye-globe backing and tongue anchor. Every adoption
breed is checked for mouth alignment and coat-coloured socket backings. Optional
browser review in `scripts/check-cat-breeds.mjs` renders all moods, side views,
four expression closeups, and compares the neutral Chichi image with a baseline.
Its software-renderer timings are diagnostics, not physical phone FPS claims.
