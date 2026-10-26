# Whole-map investigation: preserve the release, require device evidence

The player reports only a 3–4% subjective improvement and severe whole-Mac
slowdown on Safari, M2, 8 GB. Closing the game tab restores normal operation.
The cause on that physical device remains **unresolved**. None of the following
software-browser results establishes M2/iPhone FPS or fixes that report.

Release `132f01a` was verified in all three successful CI jobs, the live Worker
revision and the exact Pages JS SHA. Its publication evidence is in
`../../2026-10-26/visible-preparation-guard/publication.json`. The current
production rendering, approved geometry, saves and prior independent fixes are
preserved. This investigation makes **no new default production render change**.

## Private-world resource inventory

Private SQLite save, 24 adopted cats, eight purchased homes, four large slides
and sixteen businesses, 76 mobile NPCs plus existing embedded venue characters.
This is a deliberately loaded fixture, not an assertion that the player's
entire 95-cat adoption catalogue is owned. No player world or paid AI was used.

Chromium/SwiftShader desktop, DPR 2: after visiting moon, Job City, capybaras,
aquarium, homestead and returning, retained scene geometry grew from 456 MB to
513 MB of unique CPU ArrayBuffers. Actual tracked GL buffer allocation ranged
from 30 MB to 268 MB peak and ended at 202 MB. Memory outside that inventory,
including renderer internals, retained templates and the physical OS/browser,
cannot be inferred from it. CPU samples were mostly idle while the software
GPU completed frames; this does not diagnose the physical Mac's processor.

`buffer-inventory.json` retains all aggregate measurements but only the eight
largest root records and the number of recorded compile logs. Raw profiles and
full inventories remain in `/workspace/qa-bottleneck-inventory`.

## Experiment 1: opaque front-to-back sort — rejected

Linux WebKit software graphics, unchanged DPR 2, actual rendered frozen frames
with complete GPU readback outside gameplay-FPS sampling. Reordering opaque
objects changed 1,001 framebuffer bytes on capybaras, 1,144 in Job City, 762 in
the aquarium and 171 on moon. Repeated candidate renders changed the same bytes;
returning to the original sort restored the reference exactly. Timing was mixed.
No production sorting code was changed. See `opaque-sort.json` (root listings
and compile logs condensed as above).

## Experiment 2: alpha-one scenery blending — isolated, not promoted

The candidate keeps scenery in its original transparent ordering and disables
destination blending only for verified alpha-one authored paint. Actual fading
uses ordinary blending on a private material; water, glass and approved cats
retain their released renderer. Two unit checks pass for alpha eligibility,
shared-paint isolation and fade/restore. Code is saved separately as
`experiment/alpha-one-scenery-20261027`, commit `585b2f1`.

All **17 runtime islands / 21 views** at desktop DPR 2 have **zero changed
framebuffer bytes**, equal calls/triangles and no context loss/GL errors. Every
comparison exercised real eligible paint: counts range from 27 to 230; an empty
comparison is now rejected by the checker. Browser JS/HTTP errors are zero.

Actual RAF, simulation, GPU fences and real orbit/zoom handlers remained enabled
for sixteen 15-second alternating native samples, including warm returns:

| View | Released median submitted FPS | Candidate median submitted FPS |
| --- | ---: | ---: |
| Moon | 3.007 | 3.023 |
| Job City | 1.109 | 1.183 |
| Capybaras | 0.800 | 0.779 |
| Aquarium | 1.043 | 1.052 |

These are **Linux software-WebKit** rates, not device performance. GPU pending
counts, frame gaps and completion lower bounds are retained in the raw rows.
The small, mixed gain does not establish the required general improvement.
The candidate therefore stays outside production and the common template.

To reproduce this experiment, switch to its dedicated branch before setting
`CHICHI_COMPARE_SCENERY_BLEND=1`; the harness now rejects the released paint
instead of measuring an unchanged scene as a candidate.

## Experiment 3: short offscreen index gaps — not promoted

QA-only range compaction bridges small wholly culled gaps without changing the
original index/attribute buffers or triangle order. Extra submitted indices are
bounded to 3% of selected indices. Existing frustum exclusion remains the proof
that those additional triangles cannot alter the image. Production has no import
of this helper.

Phone WebKit, original DPR 2, identical frozen Job City and capybara scenes:
all reference/candidate/repeat pixels match exactly and no errors occur. The
pre-submission range-request counter changes from 594 to 576 in Job City and
595 to 562 on capybaras. These counters inspect native renderer requests, not
Metal commands or GPU completion; zero/aborted native submissions can still
be counted. They must not be presented as an equivalent FPS improvement.

Job City full readback timings (ms) were 415/400, 407/403, 497/449, 393/404 in
released/candidate/candidate/released order. Capybaras were 813/829, 840/831,
784/768, 780/861. There is no convincing general time improvement, so the
helper stays QA-only. Eight focused tests pass for bounded range coverage and
the existing static-submission/fallback/triangle-order contracts.

## Next required measurement

The physical Safari report is requested through the opt-in, bounded URL:

`https://arturmal2805-netizen.github.io/ai-cat-game/?profile=1&pauseAfter=15&update=132f01a`

It automatically stops native 3D and preparation after fifteen seconds, while
retaining a copyable local report of frame gaps, CPU/native submission, queue
waits, buffer transfers and geometry evictions. Whether the rest of the Mac
recovers at that pause also matters. The report omits player tokens, names,
balances and save records. Browser storage should not be cleared. No physical
device report was received during this investigation; that evidence is pending.
