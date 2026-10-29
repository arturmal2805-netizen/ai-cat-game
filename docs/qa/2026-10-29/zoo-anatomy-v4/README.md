# Zoo anatomy, surface detail and independent animal lives

[Open the side-by-side comparison](comparison.html). The before images are the
actual released c5f265d models. The after images are the new real meshes under
the same lights, distance, resolution and front/side angles, with each silhouette
centred. They are not image-generated mockups or a claim of RDR 2 equivalence.

| Species | Before | New model |
| --- | --- | --- |
| White tiger | [Front](tiger-before-front.png) | [Front](tiger-after-front.png) · [Side](tiger-after-side.png) |
| Elephant | [Front](elephant-before-front.png) | [Front](elephant-after-front.png) · [Side](elephant-after-side.png) |
| Gorilla | [Front](gorilla-before-front.png) | [Front](gorilla-after-front.png) · [Side](gorilla-after-side.png) |
| Polar bear | [Front](polar-before-front.png) | [Front](polar-after-front.png) · [Side](polar-after-side.png) |
| Otter | [Front](otter-before-front.png) | [Front](otter-after-front.png) · [Side](otter-after-side.png) |
| Axolotl | [Front](axolotl-before-front.png) | [Front](axolotl-after-front.png) · [Side](axolotl-after-side.png) |

Mammals now have smaller inset eyes, species-specific muzzle/skull proportions,
longer anatomical bodies, actual knees/wrists/hocks and articulated feet. The
trunk is part of the continuous elephant sculpt rather than an intersecting
tube. Fine static fur fibres retain their own cutout silhouette; filtered coat,
skin pores, wet noses, ear/knee/trunk folds and branching tiger stripes stay
attached to the animated skin. Axolotls retain cute large glossy eyes, four
short limbs, six feathered gill trees and a small smile.

## Motion and inspection

Each animal independently selects a shuffled set of five authored actions:

- Elephant: walk, spray, rest, flap ears and curl trunk.
- Tiger: walk, stretch, groom, play with its toy and lie down.
- Otter: swim, roll onto its back, rest on a rock, dive and look around.
- Polar bear: swim/dive, snowball play, shore walk, look around and rest.
- Gorilla: chest beat, climb, sit, look around and wave.
- Axolotl: swim, glide, inspect the glass, fan gills and peek/breathe.

All clip endpoints converge offline to the same rest pose. Real transformed
vertices were checked across randomized action boundaries for every animal.
Closed gates no longer freeze the other five species; they still restrict
visitor access and retain the same permanent purchase receipts. Opening a gate
does not reset the animal clock. No new paid AI calls are made.

All six enclosures offer native close inspection. It tracks the actual head
position/direction, preserves manual orbit and temporarily hides only its
obstructing gate. Exit restores the gate and island camera. The bear/otter close
view is nearer and slightly higher to avoid their foreground scenery.

## Mobile resource safeguards

- Detailed animal assets prepare only for the selected zoo. Other islands,
  animal counts, water, lighting, DPR and approved native cat models are intact.
- One fixed batch per species; static instance and geometry buffers; shared
  512² filtered material fields and a 128² fur cutout. Cold texture preparation
  yields in small steps rather than blocking one long synchronous operation.
- Shared baked pose textures total 3,558,400 bytes across all six templates.
  Animation updates eight scalar frame uniforms per species and still samples
  only two palette frames per vertex. It does not rebuild bones or upload pose
  or instance matrices every frame.
- All six exact models total 23,229,236 raw bytes / 6,517,879 gzip bytes, including
  poses. Geometry attributes/index streams total 19,653,724 bytes. More detail
  costs resources; this report does not label that cost an FPS improvement.
- Existing exact vertex-cache ordering is now applied to zoo meshes. Compared
  with these SAME detailed meshes before reordering, a simulated 16/32-entry
  post-transform cache performs 28.92% / 20.48% fewer vertex invocations across
  all 24 animals. Every vertex attribute, oriented triangle and pose float is
  preserved. All 24 actual front/side/rest/action frames were pixel-identical
  before and after this ordering: zero changed pixels.
- `cache-reuse.json` and `cache-pixels.json` contain the evidence. These are
  resource/renderer diagnostics, not a physical M2/iPhone FPS claim.
- The binary model codec rejects stale anatomy/material layouts and incomplete
  pose buffers. Source and downloaded geometry/poses compare byte-for-byte.
- The approved native cat cache remains
  `sculpt-v2-a496203fa13a037a7a10a927`.

## Validation

All 821 tests passed in publication CI, including the final anatomy, behavior,
cooperative texture preparation and exact model codec checks. The 28 affected
checks also passed locally on the final source. Production build and Worker
dry-run passed. `ci-test-result.txt` records the successful complete run.

The real private phone/SQLite audit purchased the zoo and five gates, observed
motion behind unpaid gates, checked all six close cameras, actual tiny/giant cat
visits and photos, native recall and two durable reloads. It retained every
receipt, balance and placement. Final visual checks additionally exercise the
latest downloaded models and all six native close views. QA never accesses a
player's world or uses paid inference.

Changed source: `zoo-anatomy*.js`, `zoo-behavior.js`, `zoo-eyes.js`, `zoo-fur.js`,
`zoo-coat-pattern.js`, `zoo-surface.js`, `zoo-sculpt.js`, `zoo-animals.js`, model
codec/manifest, zoo gate/biome, native world camera and the existing court card.
Only the seven zoo catalogue images were refreshed. Checks and the reusable
animal/mobile standard are recorded alongside these changes in `AGENTS.md`.

## Verified publication

Source `dd25508f73547ade8dba57602af621224432d137`;
[CI 40849137036](https://github.com/arturmal2805-netizen/ai-cat-game/actions/runs/40849137036)
passed test, deploy and Pages. Both public sites serve
`./dist/app.js?v=169b8aefb5ea1191`, verified against its actual SHA-256. All six
gzip model hashes, schema 2/anatomy revision, 400-frame pose palettes and seven
new preview images match the built files on both sites. Worker release matches
the source commit and cloud-save readiness remains true. See `publication.json`.

`native-final-models.json` records a second final-asset native phone-viewport
check: all six downloaded templates, movement behind unpaid gates and six close
cameras passed without browser or HTTP errors. The full save/visitor audit is
in `native-phone.json`; these browser checks do not measure physical-phone FPS.
