# Shop-preview overload recovery

The released catalogue loader in `73db649` requested uncached preview metadata
on first shop opening. A failed request or one absent key discarded all valid
PNGs and synchronously rebuilt the entire catalogue, including every biome,
through a second WebGL renderer. That asynchronous loop continued after the
shop closed and competed with the main renderer. This is a reproduced failure
path, not a confirmed diagnosis of the player's current device.

The candidate bundles the original manifest with the application, keeps the
same PNG URLs/version and avoids that request. Partial development catalogues
retain every shipped image and capture only missing entries while the shop is
visible. Closing/hiding cancels further capture, releases temporary resources
and retains already captured entries for reopening. Explicit authoring capture
still works. No world rendering, detail, DPR, shadows, cat/fish models, gameplay,
AI scheduling or durable save code changes. The sculpt cache fingerprint remains
`sculpt-v2-a496203fa13a037a7a10a927`.

## Reproduced network fault

Sequential Linux WebKit software-renderer probes used identical private worlds,
Job City, four adopted cats, DPR 2 and native RAF/GPU fences. The metadata request
was deliberately answered with 503. The old capture list was bounded to five
representative models to avoid rebuilding the entire actual catalogue. The
player opened and closed the actual shop, then native wheel input varied the
camera for 20 seconds. No live saves or paid inference were used.

| Observation after closing | Released | Candidate |
| --- | ---: | ---: |
| Additional preview WebGL contexts | 1 | 0 |
| Preview GPU draws after close | 5 | 0 |
| Failed metadata requests | 1 | 0 |
| Main submitted frames | 11 | 23 |
| Maximum recorded frame gap | 4,633 ms | 1,066 ms |
| Native DPR | 2 | 2 |
| Context losses | 0 | 0 |

The structural regression is eliminated: no second renderer or capture loop
starts, even with the failed route present. These short software-only samples
demonstrate the fault and its recovery; they are not MacBook/iPhone FPS or a
claim of a general twofold frame-rate gain. Original screenshots were inspected
at `/workspace/qa-preview-after/after-shop-close.png`. Baseline errors include
only the deliberately injected 503; the candidate has no JS/HTTP errors.

Reproduce with `CHICHI_PREVIEW_LOAD_AUDIT=1 CHICHI_NATIVE_MAP_AUDIT=1
CHICHI_MAP_CHECK=1 CHICHI_CITY_MINIMAL=1 CHICHI_QA_ROSTER=4
CHICHI_BROWSER=webkit CHICHI_DESKTOP=1 LP_NUM_THREADS=4
node scripts/check-aquarium.cjs`; add `CHICHI_BASELINE_REF=73db649` for the old
path. `scripts/check-preview-load.mjs` contains the bounded fault injection.

## Validation

All **714 tests pass**, including failed/offline metadata, closed-shop handling,
partial-manifest preservation and cancellation before graphics allocation.
Build, Worker dry run and syntax/diff checks pass. The broader suite retains
career, trading, family, housing and repeated/shared-save checks.
The extra large-colony fixture adopted all 95 catalogue cats, for 147 mobile
NPCs including the existing residents, plus eight purchased homes, four giant
water rides and sixteen additional businesses. Six native orbit/zoom samples
cover Job City, capybaras, aquarium, built homestead, Bikini Bottom and return to
Job City. Every sample retains DPR 2, the exact original details, completed
frames and no context loss; all six keep 147 NPCs without duplication.
`large-colony.json` records the software timings and resource counts, not device
FPS. It is a capacity/stability check rather than an old/new performance proof.
The user clarified that the 5×20 table was the catalogue, not an owned roster.
Browser JS/HTTP errors: zero. The Job City, aquarium and homestead screenshots
were inspected in `/workspace/qa-95-cats/`.

The phone WebKit viewport checks the same injected failure and real shop-close
path, then six real touch taps alternating world/island camera buttons. No
second preview renderer, context loss, JS/HTTP errors or DPR reduction occurs;
see `phone.json`. Routine CI test/deploy/pages and exact live bundle checks are
recorded in `publication.json`. The prior release and its independent successful
optimizations remain preserved at `baseline/released-static-reuse-20261026`.

The player reports continuing severe lag after this release. This patch fixes
the reproduced preview failure only. It must not be presented as resolution of
the underlying steady-render performance problem; further native profiling is
required.
