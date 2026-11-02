# Preserve the recent geometry working set

The player's M2/Chrome report records 54.36 FPS on `water`, with GPU median
10.01 ms / p95 13.97 ms. During its last window 215 rapid policy refaults
re-uploaded 48,646,051 bytes. Over the longer report, 31,763 buffer uploads
transferred 1,476,912,011 bytes; one `bufferData` call took 146.9 ms.
This is evidence of avoidable resource churn, not an instruction to lower detail.

The common residency controller now requires 250 milliseconds of actual disuse
as well as three absent native submissions before fast pressure retirement.
Colour/shadow submissions can advance the frame counter while a still-active
buffer is temporarily absent. Its actual recent use must win over this idle
cache policy. The original 192 MiB soft budget, capped learned-return allowance,
two-second return grace, shared-stream safety and two-millisecond cleanup budget
remain. Unused geometry is still reclaimed; CPU source/model owners survive.
Reports expose the active window and peak geometry bytes for device verification.

The controlled real WebGL five-buffer cycle exceeds the old idle allowance,
returns to each buffer every 200 ms, and repeats 180 frames. Before: 60 rapid
refaults, 260 uploads / 54,600 bytes. After: zero rapid refaults, 20 initial
uploads / 4,200 bytes. Both retain the same 4,200-byte peak working set, identical
RGBA pixels, zero GL errors, and return to the original 2,520-byte idle budget
when abandoned. Unit tests also cover an endless stream of unique abandoned
uploads and an active shared-attribute owner, rather than only this best case.

The isolated cycle is a resource reproduction. It does not establish a 13x FPS
gain or guarantee 60 FPS on a Mac/iPhone. Native all-island checks use Chromium
SwiftShader, the real RAF/simulation/GPU queue, full phone DPR 2 and original
models/water/shadows. Short software runs which submitted too few frames were
rejected as camera coverage; an explicit QA-only minimum-frame option extends
the same input trajectory without lowering any movement assertion. Production
cadence is unchanged. Timings remain software diagnostics, not device FPS.

Local full suite: **853 passed, zero failed**; Worker deployment dry-run passed.
Native camera/return coverage and publication hashes are recorded alongside.

All **19 distinct islands** pass exact full-DPR return-image and live-cat slot
checks. Twenty-one native orbit/zoom samples include return visits to water and
zoo. Every accepted sample moves the real camera; no GL context loss or browser/
HTTP errors in the completed run. Geometry peak during the completed sequence
is 351.39 MiB; abandoned buffers are still reclaimed under the unchanged policy.

Published `f452da68b22048de9df7b1e3a264495ab1a26800` through CI run
`41408165780`: test, deploy and Pages all pass. Both live sites serve exact app
`a42cd4572a376001`, the unchanged five animal buffers/previews/coat, and the
matching Worker release with shared saves enabled. See `publication.json`.
A fresh M2/phone report is still required to measure the device FPS result.
