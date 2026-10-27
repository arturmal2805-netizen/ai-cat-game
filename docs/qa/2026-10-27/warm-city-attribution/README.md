# Ready Job City: work attribution and a controlled native-cat probe

Two further physical Chrome/Metal M2 reports use the same 1440 x 812 viewport,
2804 x 1384 drawing buffer, DPR 2 and 64 NPCs. Submitted rates are 2.45 and
0.6 FPS, with gaps up to 2.766 seconds. Both have **no shader preparation,
policy evictions or refaults during the frame window**. The second has no shader
compilation at all and none of its previously tracked GL entry points exceeds
19.1 ms, while main-thread tasks reach 696 ms. These are serious ready-scene
stalls. The excerpts in `physical-m2-report-excerpts.json` are explicitly not
the complete original reports. The prior smaller viewport is not an FPS control.

The available report cannot assign a cause to all of this lost time. Old GL
coverage omitted uniforms and VAO/framebuffer setup, frame p95 omitted peak
rows, application timers were unattributed, and submitted FPS does not measure
GPU execution. A full queue alone does not establish a GPU-only cause.

## Independently saved HUD resource fix

Commit `b552da6` preserves existing HUD text nodes until their strings change.
It also retains ordinary textContent flattening when an element has non-text
children. Prices, counters, needs, reward/boost deadlines, saves and actual
changed values still update synchronously. No saving operation is deferred.
The resource change applies to normal play on every island.

In the actual private application, four alternating blocks of forty same-state
HUD refreshes have **880 child/text mutations versus zero**, with identical
complete body markup and displayed values in both paths. Measurements of this
small synchronous helper do not establish gameplay FPS. This removes proven
redundant work; it is **not presented as the cause or resolution of the M2
stalls**. The player-approved renderer/FPS baseline is not advanced.

## Extended opt-in attribution

- Main-world sync, local persistence, commits, city ticks and HUD rendering have
  bounded elapsed-time counters and at most twelve slow events. Nested phases
  overlap and must not be added as independent CPU totals. Original function
  objects are retained in ordinary play; no frame clocks are added there.
- Reports include frame CPU/render maxima and totals, previously untracked
  uniforms/VAO/framebuffer calls, and up to five Long Animation Frames with
  three longest script descriptors. Script names/positions refer to public code;
  no URLs, arguments, private records or keys are retained.
- If EXT_disjoint_timer_query_webgl2 is available, a pool of at most four
  recycled queries measures elapsed GPU render spans. Availability is polled;
  results are never read before ready. No completion waits are introduced.
  Disjoint state is read only when copying a report, and invalid samples are
  discarded. These are elapsed GPU query spans, not utilization measurements.
  Unsupported browsers report `supported:false`. Context loss clears queries.

All attribution is local and explicit `profile=1` only. There are no network
uploads, extra AI requests, lower DPR, simplified geometry, reduced water,
lighting or animation, or changes to game ownership/economy/save data.

## Controlled rendering alternative

`profile=1&catDraw=native` selects the already existing individual cat draws,
retaining all approved native rig vertices, materials, poses and picking.
The shared buffers and all living pose/atlas registrations remain intact.
Normal play and ordinary diagnostics retain automatic colony rendering.
The explicit switch restores layers on the next frame and can return to sharing;
it is not a permanent renderer rollback or a claimed FPS fix. A private browser
confirms the report selects `individual` and the colony is inactive. A physical
ready-scene comparison at the same camera/viewport is still needed.

## Validation and limits

- Full test suite: **733 passed, zero failures**; targeted diagnostics and
  lifecycle tests pass, including switching back without losing cat slots.
- Actual Chromium report validates GPU queries, long-frame/app-work fields,
  clipboard and textarea fallback, original DPR and an intact context.
  Browser JS/HTTP errors are zero. Its SwiftShader timing is not M2 FPS.
- All 17 runtime islands retain exactly the same framebuffer after real GPU
  buffer retirement/re-upload, identical calls/triangles and cat/pose-slot
  registration totals. All 21 actual native orbit/zoom/return samples pass at
  original DPR 2 in a private phone-WebKit stress world with 64 mobile NPCs,
  embedded staff, eight homes, four large slides and sixteen businesses.
  Browser JS/HTTP errors are zero; software rates are not physical M2 FPS.
  Publication proof is recorded separately. No private player world or paid AI
  inference is used.
- A read-only geometry-reuse upper-bound estimate is retained for future work.
  No geometry reuse or shader change from that estimate is implemented.

The separate ready Job City Chromium check uses the physical report's exact
2804 x 1384 buffer / DPR 2 and 63 mobile NPCs plus embedded staff. Switching
from shared to individual rendering retains 3,086,353 triangles in a frozen
colour/shadow comparison. Out of 15,522,944 framebuffer channel bytes, 24
differ (maximum difference 40, mean absolute difference 0.0000203). The exact
source of these small differences between the existing pipelines was not
established; this alternative is not a zero-byte image claim.
The normal renderer's every-island return images remain exactly identical.
Four six-second orbit/zoom phases each submit only three frames on SwiftShader:
this is insufficient to establish a real-device speed win. The default renderer
and player-approved FPS template therefore stay unchanged. JS/HTTP errors are
zero. A physical M2 comparison is the purpose of the opt-in probe.

Final build and targeted fourteen checks pass. Construction cache version stays
`sculpt-v2-a496203fa13a037a7a10a927`. Production bundle SHA-256 is
`b50008f357899598e25aca8519182dd05f6dc6b11e24dcc9b000a3fc8e42f3e3`;
private QA globals are absent.
