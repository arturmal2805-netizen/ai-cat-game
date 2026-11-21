# Bound returning-camera buffers relative to the non-retireable working set

The M2 report of1e0ea47 confirms the8.9s pause did not recur in a54.167s session
(max submitted gap533ms). This is not a controlled FPS comparison: the latest
view draws19.38Mtriangles/3908calls vs1.147M/496 previously. The remaining issue
includes508.8MB policy refaults/174.4MB rapid refaults in12s; active geometry
already occupies609MB despite the192MiB soft budget. Quality/DPR2 stay intact.

A native submission-only camera cycle on the full real Mall+SPA reproduces
1.45GB refaults. In the capped event trace1470 evictions break an unexpired
learned hold; every one is a pressure eviction, starting at266.7ms since use.
The fixed192+64MiB pressure target is unreachable while the protected working
set itself exceeds it, so returning buffers are sacrificed without satisfying
that target. Raster suppression/virtual30Hz clock are QA-only attribution,
not rendering performance or pixel proof; retain exact runners/source.

Keep the original192MiB soft budget,250ms/three-frame active rule,2s learned
hold,10s legacy grace,shared-owner safety and2ms retirement budget. Count the
unique attributes in non-retireable shared-owner components and apply the same
capped idle allowance(max64MiB/one-third budget) above max(soft budget,pinned).
Cold unheld buffers are reclaimed first; abandoned buffers return to the old
budget. No speculative whole-map cache, geometry/material/animation/LOD/DPR/
shadow/save changes. Compute owner snapshot before the existing retirement
budget, only when pressure/learned holds require it.

Two new camera/shared-owner regression tests fail against the published policy
(16 rapid returns instead of2), pass with the fix, preserve the required upload
peak and reclaim abandoned memory. All36 targeted checks pass. Node22 full
build preceded the final bookkeeping placement refinement; latest runtime
bundle/Worker were rebuilt and sculpt versiona496203fa13a037a7a10a927 stays the
same. Final main CI must rebuild/test the exact release.

Before publication compare full native resource cycles, actual GL uploads and
pixels with the old policy, full-world pixel return/cat palette registrations,
all19islands+returns, phonecontrols/deepdive/privateSQLitereloads, finalmainCI
and actual HTTP bytes/oneappscript. A fresh M2report is required for deviceFPS;
this change does not claim universal60FPS or eliminate the GPU shading cost.
