# Breed details and the cheek artifact

The white cheek patch in the supplied Adoption Center photograph was a hole,
not a coat marking. The same defect clipped some paw tips. MarchingCubes skips
its outer sampling rows: the compact crowd field ended before the protruding
muzzle and toes. Numeric crowd resolutions now receive two extra sampling rows
on either side, at the original voxel pitch. Cheeks, body and both paw sculpts
are closed, consistently wound surfaces. Materials remain front-sided; the fix
does not cover the hole with a patch or turn the whole cat double-sided.

Boolean hero quality follows the original construction path. Chichi's geometry,
hair, colours, materials, pose and eyes are unchanged in all three moods, guarded
by pre-update SHA-256 fingerprints. Her three existing portrait files are also
left untouched. `render-cat-portraits.mjs --adoption-only` refreshes the neighbours.

The other cats retain their reference-family face and eye rig. Maine Coons gain
lynx ear tufts, a slightly squarer lower muzzle, a shaped neck ruff and broader
tail plume. Sphynx cats have no geometric fur: shallow sculpted folds and a
derivative-filtered skin shader describe forehead, neck, body and limb wrinkles.
The shader changes normals and lighting, with no new texture or rendering pass.
Giant cats have a broader continuous belly, shorter slow steps, gentle waddling
and larger world sizes; they use the same mesh budget rather than adding spheres.

American Curl (Кренделёк) adds backward-curled ear tips. Turkish Van (Марципан)
has white fur, ginger head markings and ringed tail, plus different-coloured
eyes. Both are ordinary paid, level-gated adoptions. Existing profile IDs, prices,
ownership and care/save data remain valid. There is still just one Sphynx candidate.

Fur caches distinguish breed/shape/colour, so curled ears, long-haired cheeks
and rounded bodies receive their own correctly rooted strands. Ruff and tuft
surfaces batch with the existing head/ears. The catalogue contains 32 offline
portraits; opening it builds no extra GPU models.

Regression tests cover closed topology, rays into both cheeks of every candidate,
the frozen hero, breed-specific features, correctly rooted hair caches, and
paid adoption/save/reload alongside existing cats. The optional browser check is
`node scripts/check-cat-breeds.mjs`, with `PLAYWRIGHT_MODULE` and `CHROMIUM_PATH`
set as for portrait generation. `CHICHI_CAT_BASELINE` selects a prior checkout;
`CHICHI_CAT_REVIEW` selects screenshots. It checks every candidate in three moods,
side/back/walking views and hero pixel equality. Its phone-sized GPU timings use
software Chromium, so they do not establish FPS on a physical phone.

The release passed 257 Node tests, the production build, all 32 portrait renders,
venue preview regeneration and the full browser review. Its six-cat phone-sized
fixture retains 98 mesh draws before/after; submitted triangles rise from 92,610
to 98,361 to close the missing surfaces and add the breed shapes. This is an
explicit detail increase, not an unchanged triangle-count claim.

An actual 390×844/DPR 2 touch scenario adopted Curl and Van through the UI,
verified their prices, then read the private local Worker/SQLite save and reloaded
the page. Existing Maine Coon/Sphynx/giant cats, both new cats, coins, XP and the
centre survived. The restored scene used the new traits and unchanged hero with
no browser errors or horizontal overflow. The real player's world was untouched.
