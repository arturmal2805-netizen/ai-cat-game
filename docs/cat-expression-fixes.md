# Facial polish without redesigning the cats

The three saved AI moods remain `sleep`, `crazy hungry` and `happy`.
`cat-emotions.js` supplies short curiosity, delight, affectionate slow-blink and
drowsy transitions. They animate the existing head, eyes, ears, tail and paw;
no mesh or texture is added. Actions and mood changes trigger reactions, and
an idle happy Chichi occasionally shows one. Explicit reactions begin on their
first animated frame, so a loading pause cannot consume them before they appear.
The layer finishes at neutral,
does not accumulate transforms, and respects reduced motion. Other cats retain
their existing animation system.

The tongue's position is transformed back into the moving jaw's coordinates
each frame so its centre stays at the mouth opening, including in exported GLB
clips. The old position followed the lowered chin and left a visible gap.

All cats retain their eye geometry, iris, pupil and reflections. Only their
outer globe backing changes from mouth-dark to coat colour so a side view
cannot reveal a black socket wedge. Chichi's backing uses a separate material
so the fix never recolours her lips or rebatches the approved iris/lid geometry.
Her continuous face sculpt already includes a fully groomed chin: hiding the
redundant smooth cap exposes that original fur instead of adding another shape.
Adoption portraits are rerendered from the repaired rigs with content hashes.

Tests retain the frozen approved Chichi fingerprint after normalising only the
intentional tongue anchor, eye backing colours and chin-cap visibility. Every
other vertex, hair, material and transform remains exact in all three moods.
All 35 neighbours also retain a full frozen aggregate fingerprint.
Frozen Nimbus and Cloudberry fingerprints
exclude only the repaired eye-globe backing and tongue anchor. Every adoption
breed is checked for mouth alignment and coat-coloured socket backings. Optional
browser review in `scripts/check-cat-breeds.mjs` renders all moods, side views,
four expression closeups, and compares the neutral Chichi image with a baseline.
Its software-renderer timings are diagnostics, not physical phone FPS claims.
