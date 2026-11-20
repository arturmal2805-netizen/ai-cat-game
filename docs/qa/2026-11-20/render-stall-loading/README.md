# Renderer stalls and immutable loading — 2026-11-20

Final source b9f681aadb42f7d89914fcc57da8b17f70605055, main
6ccec70440b551ff6c3c06a98945ff7d5d168db0, PR #11. Main workflow44804905460:
test PASS, deployment/live verification pending at this checkpoint.

Baseline 7a0e1f3: 451 public modules. Intermediate935 and finalb9:453 modules.
Every captured public module is SHA-verified against its exact Git source.
Source tarballs retain source, QA-only bundle and patch/status. The main/source
trees are identical. No private SQLite, tokens or player worlds are archived.

Each CPU profile uses the same four actual-game cameras, clock7, desktopDPR1,
Node22, Chromium156.0.8078.79/SwiftShader, private Worker/SQLite, CDP1000us.
No concurrent GPU jobs. Native lazy bounding sphere time under renderer:
baseline16661.90ms, intermediate120.54ms, final97.41ms. Preparation time:
intermediate17867.10ms, final7128.13ms. Sampled renderer-inclusive totals are
25006.12/6672.10/5943.84ms; driver waits must not be represented as pure JS.
This is diagnostic attribution, NOT physical M2 FPS or an acceleration ratio.
The final two fixed camera images are pixel-identical to baseline; the wide
and bank views differ by animated actors (mean absolute channel differences
<0.07/255). Exact images/profile/comparison scripts retained.

Native DPR2 all-map:19 islands plus two returns, actual mouse orbit/zoom PASS.
Phone/coarse390×844/DPR2 held-touch, deepdive, two private reloads pending.
An earlier wrong visual-idle mode waited for obsolete data-profile-pause;
that attempt is not a successful gate and is superseded by all-map-final.

35 intermediate regression tests + 11 final focused tests PASS, Node22 build
and full main CI test PASS. Exact hash HTTP-cache reuse fixture PASS: expired
content-addressed assets survive reload/new app URL with one network request;
API/explicit reload/abort semantics preserved. Cold first transfers still
network-dependent. Lossless WebP4–6% trial rejected; no art replacement.
All9 water-probe rebakes identical PNG bytes; only producer revisions change.
Main CI success/live publication and user visual approval remain distinct.
