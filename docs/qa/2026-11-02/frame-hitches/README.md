# Startup hitches and near-60 average FPS

The player's new M2 reports distinguish cold startup from steady rendering.
The nearly empty moon island still initializes the world's residents; its
`world.sync` peak was **1,871.3 ms**, with a **1,583.3 ms** frame gap. Ordinary
CPU/render medians were only **1.3/4.9 ms**. The zoo report had a **217.5 ms**
maximum gap and a **75.8 ms** city-tick peak, including a save commit. Both raw
reports are retained here. These samples do not prove that all ongoing hitches
share a single cause, or that graphics-cache eviction is still responsible.

## Accepted loading change

`resident-preparation.js` builds each original non-venue-bound native cat and its
original draw arrays in a separate browser task before opening the world. The
existing loading indicator shows progress. The world takes a rig once, validates
its original appearance/size, and attaches the actual pose atlas once. Remaining
unused/error/cancelled rigs are released. Hidden tabs pause preparation. The same
single WebGL renderer is retained; its options, DPR and shadows are unchanged.

The native model producer/cache version remains
`sculpt-v2-a496203fa13a037a7a10a927`. Approved gorilla geometry, facial material,
all five zoo model files, scenery, saved positions and saves are unchanged.

`startup-ab.json` records a warm sequential A/B/B/A test of **66 actual rigs**:

| Measure | Original synchronous path | Cooperative path |
| --- | --- | --- |
| Longest construction task | 1,538.2 / 1,542.6 ms | 33.1 / 29.5 ms |
| Total construction elapsed | 1,538.2 / 1,542.6 ms | 1,562.2 / 1,383.4 ms |
| Maximum UI RAF gap | 1,533.2 / 1,533.3 ms | 133.3 / 116.8 ms |
| Exact geometry arrays | yes / yes | yes / yes |

This is CPU preparation and UI responsiveness evidence in automated Chromium.
It is **not** a 60 FPS claim for the player's M2 or an iPhone, nor a guarantee
that cold shader/texture work or later save commits cannot stall.

## Honest stutter reporting

The diagnostic panel labels its existing FPS as an average. It adds 1% low FPS
(after enough samples), counts of gaps above 50/100 ms and the worst gap since
startup. Cumulative counters retain a real pause after it leaves the rolling
300-frame window. Menu/hidden intervals start a new sampling window without
inventing a pause or erasing an earlier real one. First-world-frame time and
resident preparation cost are recorded separately. Only the copy button remains.

A deterministic test demonstrates **57–58 average FPS with a 250 ms freeze**.
Consequently the old near-60 average was compatible with the player's visible
stutter; averaging alone cannot establish smoothness.

## Rejected alternative

A frozen snapshot-JSON reuse experiment reduced encoding counts (240 to 96),
but repeated warm save/ACK work regressed. It was removed completely. Durable
save, outbox and transport source files are unchanged in this release.

## Rendering checks and a pre-existing control limitation

The deferred atlas path has twelve actual same-pose colour/shadow comparisons
with **zero changed components** (`native-deferred-atlas.json`). Comparing against
the original articulated renderer passes its existing strict normal/Float16
rounding tolerances (`native-deferred-original.json`). Unit coverage also checks
exact attributes, indices, rest/bind transforms, original scale, cancellation,
background pause, atlas lifetime, buffer retirement and eventual model disposal.

The geometry-return investigation reached 18 islands with zero changed
components and unchanged cats/atlas slots. At the zoo a tiny gorilla-face area
changed even between two synchronous **control draws without any eviction**.
The previously published approved baseline `1146193` reproduces the same issue:
28 control components / 34 return components, maximum channel delta 6; candidate
35 / 23, maximum delta 2. Both retained identical draw/triangle/resource counts,
68 cats, 1,844 slots and no GL/context errors. Raw control evidence is included.
The strict zero-difference assertion was not relaxed, and this investigation is
not labelled a passing zoo pixel-return proof. The approved face is unchanged.

## Final validation

The full suite passed **865 / 865**, with zero failures. Build and Worker dry-run
passed. Native skinning retained four exact same-pose images (zero differences).
The real HUD/copy/fallback integration passed with 66 prepared residents, one
copy button, full DPR 2 and no browser/HTTP errors. This cold automated run still
had a 249.5 ms maximum preparation slice and a 977.6 ms maximum first `world.sync`;
those remaining cold costs are retained in `device-profile.json`, not hidden by
the smaller warm A/B figure.

The full native RAF/GPU-queue camera test covered **all 19 current islands**,
then returned to moon and zoo (21 samples). Every view completed real orbit and
zoom, at least six submitted frames, unchanged DPR 2, at most two pending frames,
and no context loss or browser/HTTP error. This software-GPU run is camera and
resource coverage, not a physical-device frame-rate comparison. Publication
verification is recorded separately after deployment.
