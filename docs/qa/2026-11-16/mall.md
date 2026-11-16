# Mall material scale and physical finish response

> Historical technical release record. Current user acceptance and references are in [project memory](../../project-memory/CURRENT.md); this report is not artistic approval of a later candidate.

Large floor panels and furniture previously stretched unit UVs independently of
construction size. The same original surfaces now use metre-scaled charts,
including public slabs, shop interiors, bridges and aquarium fittings. Marble,
wood, cloth, painted fittings and metal have more restrained emission/roughness;
the existing reflection lookup follows each finish and glazing uses Fresnel.
No extra render pass, target, texture collection or per-frame buffer is added.

UV preparation uses independent immutable buffer copies and cooperative slices.
Their metadata is detached before ownership changes, preserving the shared
primitive owner. All original walking geometry, openings, furniture positions,
native cat models, circulation, clocks, prices and save semantics remain.
The complete construction graph retains 1,444 meshes, 1,428 geometries, 373
materials and 6,496,049 potential triangles. Compacted attribute storage is
269,204,355 bytes versus 271,115,715 in the published-water baseline; this is
construction storage, not a device FPS claim or measured GPU residency.

Native source: `b67d2f1ebcd6e0166d04a720ff7fa7348cb44441`.
39 Mall tests, Node 22.23.5 build and Worker dry run passed. The actual private
game passed phone and desktop exterior/interior views of six shops, including
food, cinema, books and furniture. One catalogue purchase charged 850 from a
5,000 wallet, retained the collar and one receipt after SQLite reload and
returned without another charge. The six-flavor ice-cream menu, two purchased
native cones, actual eating/tongue poses, unchanged machine buffers and two
SQLite reloads passed without duplicate meals or receipts.

All 14 native visitors passed the separate 15-degree observation camera, along
with portrait/landscape resize, floor overview, actual screen tap, world camera,
EXIT and reentry. These modes remain distinct from manual third-person movement.

The complete actual Explorer route passed: underwater submarine exit, visible
native Chichi swimming/moving/diving, compact phone and hidden-control gestures,
reboarding, swim reload, sequential physical airlock, walking inside, escalator,
Island/World release, physical return and save/reload. The initially cold Mall
was root:false, ready:false, paused:true and still completed required loading.
Expected docked state is retained; manual control clears and ordinary estate
work resumes before and after SQLite reload. Routes remain body-clear through
their continuous segments, without teleporting or reducing the cat radius.

All final browser/HTTP error lists are empty. The accompanying summary records
actual native PNG checksums, all tracked public JS hashes, exact production
bundle/style hashes, source version, construction counts and report paths.
Publication additionally requires successful CI/deployment and matching live
JS/CSS bytes. Water release documentation/cache URLs may merge afterward only
with the native runtime bytes retained.
