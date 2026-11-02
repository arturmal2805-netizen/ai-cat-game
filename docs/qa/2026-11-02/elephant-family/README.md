# Elephant redesign and affectionate trunk greeting

The player's Asian-elephant reference prompted a new continuous sculpt: broad
ribcage/shoulders, a shorter compact skull, smaller inset dark eyes, folded ears
closer to the neck, thick lower legs with flat soles, small juvenile tusks and a
tapered trunk. Warm-grey skin keeps the shared immutable textures, with larger
anatomical forehead, temple, neck, knee and trunk folds. Inspect the front,
profile, clay and actual full-DPR phone renders here. This is a reference-led
game model, not a claim of a literal photographic or RDR 2 match.

The three original elephants retain their scales and identities. Gorilla,
axolotl, otter and grizzly model hashes remain **exactly** those in the verified
release `7511536`. The approved gorilla facial material and all non-zoo islands,
roads, homes, owned buildings and save source files are unchanged.

## Smooth family choreography

The two adults turn towards each other, raise their trunks, touch their actual
tips, briefly blink, separate and return to independent activities. Their calf
remains independent. Each 64-second local cycle has a 20-second performance.
Only existing fixed pose/offset uniforms change while the selected habitat runs.

An initial five-link experiment produced angular zigzags and was rejected. Nine
trunk links, continuous arc-length skin weights and a smooth-curve-seeded,
length-preserving IK solution remove those corners. All solving and pose
authoring happen **offline**, into the shared texture. The original public
`trunk4` tip identifier stays valid for water/camera queries.

The exact-source test checks 1/60-second samples across start and finish, actual
tip contact at multiple intermediate times, a common 2.15-metre contact height,
body clearance, fixed buffers, reduced motion, cancellation and codec reload.
It caught a genuine **0.457-metre** completion jump caused by resetting the
ambient clock. That reset was removed, preserving the running ambient phase.

A busy real-habitat test supplies visitors throughout 80 simulated seconds.
The calf provides their water play during the parents' greeting, using its real
articulated tip, so repeated greetings cannot prevent the family interaction.
Standalone visitor cancellation fades over 0.6 seconds and cannot replay the
middle of its cancelled cycle. Geometry/instance buffers stay unchanged.

## Resource limits

| Per elephant template | Before | Current |
| --- | ---: | ---: |
| Vertices | 23,179 | 23,315 |
| Triangles | 42,856 | 43,464 |
| Shared pose bytes | 998,400 | 1,629,184 |
| Pose frames / joints | 400 / 39 | 592 / 43 |
| Model draws in isolated colour + shadow view | 2 | 2 |

Geometry stays below the existing **24,027-vertex / 44,604-triangle** ceilings.
The deliberate extra 630,784 pose bytes serve all three instances; no extra
diffuse texture, renderer, per-frame pose texture or instance-matrix upload is
introduced. This added animation/detail is not described as a measured FPS gain.
The native cat producer/cache key remains
`sculpt-v2-a496203fa13a037a7a10a927`. `resources.json` records all five model hashes.

## Validation

**867 tests passed**, zero failed; build and Worker dry-run passed. Two older
checks were updated for the intended new 592-row palette and distributed trunk
articulation: geometry ceilings remain unchanged, and the spray test now checks
the actual articulated tip's raised position rather than one old joint angle.
The focused 32-test family/water/interaction checks also passed.

The actual phone/SQLite audit buys the separate island and four gates, checks
five mouse/touch habitat picks, five enclosure and animal cameras, axolotl
overhead blinking, real tiny/giant gorilla carry, guest/world/island camera
transitions, visiting cats and two durable reloads. It uses native models and
full DPR 2, with explicit draws for captures; it is not a timing/FPS benchmark.
Browser and HTTP error arrays are empty. An initial attempt used an incompatible
all-islands-unlocked fixture, so its purchase-button wait was invalid; it was
rerun with the correct paid-island fixture, retaining the real purchase checks.

A separate continuous native RAF/GPU-queue check covers moon, Job City, zoo and
a zoo return, with real orbit/zoom, six or more frames per view, full DPR 2 and
bounded pending frames. Software-GPU numbers are coverage evidence, not a Mac
or iPhone FPS claim. The previous independent startup release retains its full
19-island camera audit. Publication hashes are added after deployment.

The final live verification uses the CI-pinned Node 22 build. Node 24 encoded
a few trunk-pivot metadata doubles differently at the final decimal place;
all geometry and Float32 pose arrays were byte-identical. The Node 22 rebuild
matched both served bundles and every model/material/preview byte exactly.
`publication.json` records both sites, shared saves and the three successful
CI jobs; the published elephant asset is `elephant-ddbef27260f73b04.bin`.
