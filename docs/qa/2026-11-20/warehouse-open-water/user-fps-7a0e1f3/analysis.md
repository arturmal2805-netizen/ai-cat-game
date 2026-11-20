# User M2 report of published7a0e1f3 — 2026-11-20

App1f35c6c1ed6c391f matches the actual verified published JavaScript. Same reported
M2/Chrome157, DPR2,1440×812 and19cats as the previous report; camera pose is absent.
No code/graphics/diagnostic change was made while analysing this upload.

| Measurement | Old f289 | New7a0e1f3 |
|---|---:|---:|
| Recent300-frame window |22.1s|12.133s|
| FPS in that window |13.53|24.64|
| GPU median |32.41ms|12.8ms|
| CPU simulation median |1.1ms|0.8ms|
| Renderer median |26.4ms|14.3ms|
| Longest recent frame gap |8.200s|3.066s|
| Largest gap since reset |8.917s|8.500s|
| Last submitted triangle counter |15,330,179|2,386,288|
| Last draw-call counter |1401|380|
| Last pose cats |28|4|

The current view is substantially lighter; these reports are NOT a controlled
code-speed comparison. Do not advertise an82% release FPS gain. A300-frame
window includes its long stalls;24.64 is not a clean steady-state FPS rate.
GPU p9518.58ms and renderer p9542.4ms still exceed a16.67ms frame budget.

Across the current reset session, renderer stalls3.512s and2.913s remain; logic
p95is1.2ms. First startup frame1.836s, JSheap~1.50GB, tracked geometry399.6MB.
No rapid geometry refaults in the recent window, so do not blame them for the
multi-second freeze without a trace. Shader status reads total~1.40s across the
whole session, not evidence that they caused a particular3.5s stall.

Resource loading also remains a distinct problem:coralNormal22.937s,reef
cache22.419s,marblecolour18.820s. Grass requests last15.001s and return reported
zero decoded bytes. Their duration matches the explicit15,000ms abort deadline
in public/meadow-patch.js:19; ResourceTiming alone does not confirm HTTP status
or exact timeout cause. Previous transferBytes0 vs current real transferred
bytes also makes cold/loading times unsuitable for a simple release comparison.

Follow-up targets: isolate a warm same-camera frame trace of long renderer work
and a cold network waterfall/status trace; preserve DPR, water, cats, shadows,
detail and save durability. Do not shorten the deadline or lower quality as an
unverified shortcut. This report is evidence, not artistic approval or a finished
performance fix. Immutable JSON/hash and the numeric comparison are retained.
