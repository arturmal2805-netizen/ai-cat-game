# Cat Food Court

The new `foodcourt` island is appended after the established map layout. Its
radius is `11.65 * sqrt(8)`: eight times the ordinary island's playable area.
All 24 previous biome records are frozen in the regression fixture. No player
cat model, breed, purchased plot or existing unlock is replaced.

Five permanent venues use the normal catalogue/interaction and business systems:
McDonald's, Boba Cloud, Murrbucks, the cat-cookie bakery and an outdoor cinema.
Coffee and cinema are initially open. Three explicit, paid construction sites
persist write-once start timestamps in `islandConstruction`. Their real-world
40/70/100 minute deadlines continue while the game is closed. Existing cat
builders work on paid projects; unpaid blueprints never recruit builders or earn
income. Buildings collect ordinary coins and XP, and use existing business
upgrades. Shared saves reject a second concurrent payment for the same site.

`foodcourt-runtime.js` reserves seats and a short ordering queue. A shared door
lock coordinates entering/leaving. Routes clear the actual walls, fountain,
counters and tables for normal and giant cats. Visits cover approach, order,
preparation, handover, walking with food, eating/drinking, watching and departure.
Cancellation releases both seats and door locks. Completed visits use the
existing idempotent SPA receipt ledger and usual shared save transaction.

`foodcourt-assets.js` builds approved cat chefs, glass storefronts, distinct
roofs/signs, interior equipment, shelves, tables and detailed food. Static
geometry is combined by compatible material; food templates share buffers.
Venue construction and island gardens run through the cooperative scene
scheduler instead of a single blocking geometry merge. The custom navigation
uses a binary heap, cached collision masks and waypoint simplification; it does
not run a complete path search every frame. Distant chefs do not update their
rigs. The AI snapshot omits rendering-only island fields, keeping the full
25-island scene below the existing request limit.

Tapping a ready venue enters a closer overhead interior camera and hides its
separate roof. The exit button, island navigation and Chichi face camera restore
it. The small order button sends Chichi through the same physical interaction.

## Cinema content

`cinema-playlist.js` contains three original mini-stories starring SpongeBob:
“Пузырь для Гэри” (18 s), “Большой крабсбургер” (20 s), and “Танец медуз” (18 s).
These are newly authored animations, not official television episode excerpts.
The committed MP4s contain moving characters, story beats, Russian captions,
original synthesized music and cartoon sounds. They use H.264/AAC, 960×540 at
24 fps, with fast-start metadata. Together they are about 2.2 MB; only the
current movie is decoded. Nothing is rendered to a canvas every game frame.

Regenerate offline with `python3 scripts/render-cinema.py` (Pillow, NumPy,
FFmpeg and Open Sans fonts); `--stills` writes a review storyboard to `/tmp`.
The in-world screen uses `THREE.VideoTexture` at the movie's 16:9 aspect ratio.
The video source is attached lazily when the cinema scene becomes available.
Seated viewers start the playlist automatically, muted for mobile autoplay.
Controls offer play/pause, next story, sound and a local MP4/WebM file. Local
files stay on that device and are never uploaded to the shared save.

Leaving the interior camera keeps a seated audience watching. Leaving the
island, backgrounding the page, opening a dialog or scrolling the world away
pauses decoding. Explicit user pause stays paused. Every story loops through
the playlist; viewers count only actual decoded playing time toward their
30-second visit. Seats remain reserved while paused. Cats turn toward the
physical screen and react to timed story cues with brief curious/delighted
expressions, ears, tail and paw motion, staggered by seat. Their approved
geometry is unchanged; expressions recover through the existing cat rig.

The cinema uses the existing ordinary business account: 480 coins and 182 XP
per hour at level one, collected from its coin badge or the Business menu.
Existing upgrades increase both rates and shared-save guards prevent duplicate
collection. The cinema controls show the current upgraded hourly rates.

The browser QA decodes all three shipped movies, advances the playlist,
checks pause/resume and an interested manually seated cat outside the interior
camera, then verifies exact coins/XP/receipts in a private cloud save.

## Validation

`node --test test/foodcourt.test.mjs` checks the unchanged map, construction,
repeated reloads, two-phone merging, income/XP, food receipts, normal/giant paths,
twenty concurrent customers, cancellation and cooperative scene/model assembly.

`scripts/check-foodcourt.cjs` uses a random private local SQLite-backed save,
real mobile touch input, physical blueprint payment, all five interior cameras,
Chichi ordering/eating, real video decoding and exact cloud persistence. Its
construction clocks are advanced only in the private test world. It never uses
the players' account code or production save. Chromium's software renderer
validates graphics and input; its FPS is not an iPhone hardware benchmark.

The final contact regression raycasts the actual batched cushions and poufs;
reserved seat heights match their surfaces. `settle`/`stand` transitions animate
climbing onto and leaving the seat, and indoor walking follows the real floor
height. The chef's working height belongs to a separate carrier so the existing
cat animation's local bob cannot push the barista behind the counter.

Carried food is positioned after the current frame's cat pose. `court-food-pose.js`
anchors coffee's near rim (or bubble tea's straw tip) to the actual animated
mouth, with a small forward gap, visible outward tilt and a lower carrying pose.
Cup scale follows the cat's real world scale. It no longer uses a fixed carrier
offset that clips into a large head. Regression tests cover Chichi, kittens,
Maine coons, hairless cats and giant breeds; browser QA checks a real coffee
order and the face-camera drinking view.

In a host CPU sample of 12,000 simulation steps with twenty simultaneous mixed
visitors, all visits completed; the 99th percentile was below 0.05 ms. A separate
same-layout navigation sample reduced a cold route from about 55 ms with the
existing grid search to about 12 ms with the new heap search and two smoothed
waypoints. These are CPU measurements on the development host, not mobile GPU
FPS claims. The artwork, geometry detail, water shader and approved pet rigs
remain intact.
