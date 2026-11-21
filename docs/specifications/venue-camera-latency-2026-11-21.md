# Toolbar camera response — 2026-11-21

Player: no perceived FPS gain on published15cb5b4/appfec56d9990ec8549 and up to5s
between an upper toolbar icon click and camera response. This task addresses
that input delay, preserving graphic quality, cats, buildings, saves and economy.
The new M2report has29.12FPS/10.267s and1266RAF/45.183s; camera2.586Mtri/744calls,
GPU10.66median/17.53p95ms, framegapSinceStart2099ms/eventloop1926ms. Different
camera from previous19.38Mtri prevents a controlled FPS gain claim. Zero cache
refaults in this rolling window do not establish responsive venue switching.

Mall/SPA previously awaited their whole ensure() before even committing a camera
request; this includes assets/model warmup/staff/navigation and service setup.
A pending request also survived switching back to Island/follow and could steal
the camera on resolution. Native software-browser cold baseline selected SPA
only after39936ms; this is host-specific construction timing, not physicalMac.
Warm toolbar dispatch+evaluation was62–154ms in that baseline, not a5s hot repro.
Initial capture microtask handler measurements are invalid (browser checkpoints
between event listeners); use the corrected explicit onclick wrapper for costs.

Commit camera intent synchronously on accepted Mall/SPA inspection, keeping full
native ensure preparation and service/purchase gates. Each inspection tracks a
version; exit always invalidates pending requests, same-venue latest wins, stale
failure/completion cannot restore or replace a newer owner. Cold SPA preview/menu uses the actual8 v7 rooms and service aliases, so exposing
the panel before preparation does not revive the14 legacy rooms. It uses
the actual v7 palace framing; resolve legacy room aliases after preparation only
for the current request. Chichi follow/manual also release SPA inspection.
Warehouse reuses its exact native vertex bounds by immutable model identity and
world transform; return cloned bounds and recompute after transform/replacement.
No geometry/material/asset/quality/physics/save changes or faster-FPS promise.

Validate exact bound parity/no repeated vertex reads/moved parent/replacement;
real cold clicks before full preparation, rapid SPA/follow/Mall/Island cancellation
and final framing/ownership on desktop+phone; full native19islands+returns,
private2reload save checks, Node22/fullCI and actual live bytes/exactoneapp.
Record physical device results only after a fresh report with the new app hash.
