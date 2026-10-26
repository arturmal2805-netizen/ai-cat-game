# Local profiling on the affected device

The player still reports severe ordinary-view lag after the shop-preview fix.
This change adds diagnostics, **not an accepted FPS optimization or a claim
that the remaining lag is resolved**. Existing successful rendering, detail,
saves and AI pacing remain unchanged.

Open the normal same-origin game with `?profile=1`, let it load, orbit/zoom the
affected island for 10–15 seconds and press **Скопировать отчёт**. Paste the
text in the chat. The panel and clipboard fallback appear only with that opt-in
parameter; ordinary play creates neither a panel nor its sampling timer.

The report holds at most 300 frame records and 300 event-loop delay samples.
It records submitted-frame cadence/gaps, CPU simulation and CPU render-call
durations, time spent checking the nonblocking frame queue, waiting callbacks,
timer delay, graphics-buffer dimensions/DPR, geometry residency estimates,
pending shader work, draw/triangle counts and visible-pose counts. Queue/timer
fields since reset are diagnostic context, not GPU execution timings. Opening
a modal, leaving the world viewport or changing document visibility resets the
sample window. World teardown clears the optional timer and panel.

One optional startup query records the renderer string exposed by WebGL, along
with browser and app versions. It does not query the driver every frame.
Browser-provided renderer strings can be generic or masked; the Linux software
WebKit fixture reports `Apple GPU`, which **does not make it an Apple hardware
benchmark**. Render-call times measure CPU submission, not GPU execution.

No network upload, token, cat name, wallet, save record or paid inference is
part of the report. The player chooses whether to paste the locally copied
text. The clipboard fallback selects a local textarea if browser permission
is unavailable.

## Verification

Full local suite: 716 passing tests. Focused final sampling tests pass for
bounded storage, correct cadence/CPU/wait separation, copied report isolation,
reset and a disabled mode that does not access DOM/graphics resources. Build
and Worker dry run pass. The model-construction fingerprint remains
`sculpt-v2-a496203fa13a037a7a10a927`.

Actual WebKit browser checks use private SQLite, a small colony and mocked AI:
the opt-in panel samples native frames, copies a report, preserves DPR 2 and
the actual buffer dimensions, excludes the private token and survives a denied
clipboard with the selectable-text fallback. JS/HTTP errors: zero. The final
desktop report is in `browser-report.json`; the initial phone-view probe is
available at `/workspace/qa-device-profile/`. Screenshots were inspected.

Reproduce with `CHICHI_DEVICE_PROFILE_AUDIT=1 CHICHI_NATIVE_MAP_AUDIT=1
CHICHI_MAP_CHECK=1 CHICHI_CITY_MINIMAL=1 CHICHI_QA_ROSTER=4
CHICHI_BROWSER=webkit node scripts/check-aquarium.cjs`; add
`CHICHI_DESKTOP=1` for the desktop viewport.

## Rejected experiment

Caching the scene root looked promising in an isolated default-Scene unit
fixture. The real game already sets `scene.matrixAutoUpdate = false`.
Two native pixel probes retained identical images and **identical matrix
multiplication counts** with the additional wrapper: 9,569 in Job City and
1,937 on capybaras. The wrapper and its isolated tests were removed; this
is not added to the optimization template. Partial native-frame measurements
under `/workspace/qa-root-pilot/` are not a passed all-island FPS gate.
