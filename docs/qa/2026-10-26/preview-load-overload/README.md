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
Large-colony and phone browser results are recorded alongside this report when
complete. The prior release and its independent successful optimizations remain
preserved at `baseline/released-static-reuse-20261026`.
