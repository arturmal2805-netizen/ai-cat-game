# M2 report:6ccec70,2026-11-20

Actual app0e305ce4212c504f matches published6ccec70. Chrome157/M2/DPR2,
1440×812,19cats. FPS19.04 over300completed frames/15.7s, rawRAF39.36 since
reset27.717s; worst framegap8599.9ms, eventloop delay8650.5ms. P95gap17.3ms,
P99gap84.1ms, 7stutters>50ms/3>100ms in rolling window. Do not dismiss this as
successful performance or omit the8.6s gap from reported FPS.

GPUmedian9.48ms/p9513.79ms/max46.31ms(last300GPU samples); rolling render
median3.3ms/p955.7ms/max7.8ms. Fullreset work769renders includes867.5ms,
508.8ms,71.1ms renderer calls. Native getProgramInfoLog97calls totals1208.5ms,
max89.1ms; texture uploadmax71.2ms. Shader checks are a measured remaining
cost, not proven cause of the whole8.6secondgap. Longtaskmax913ms and longest
animationframe523.7ms do NOT account for that whole gap. Background visibility/
OS scheduling/GPU waiting or missing instrumentation still need attribution.
No geometry evictions/refaults.162MBGPUgeometry and~1.745GBJSheap. Last frame
630912triangles/36calls/0poseCats while3shader preparations ongoing. This view
is different from last report2.386Mtriangles/380calls; not a controlled FPS
regression comparison and not proof of graphics removal.

Observed resource maximum6.36s vs old22.94s, but asset selection/cache/network
state differ. Native hashed-cache fix remains bytepreserving; cannot claim a
controlled network speedup. First transfer and plain-name cat art still use
network. No unrequested quality/DPR/cat/shadow reduction permitted.

Next: exact-source native first-use shader trace distinguishing preparation
from actual render paths; reproduce unexpected variants before changing code.
No new runtime patch or publication is implied by this report analysis.

## User clarification2026-11-21

The long pause occurs during loading or moving to a location, rather than
ordinary play after everything has loaded. This establishes the reproduction
scenario; it does not attribute the entire8.6s to shader first-use or prove the
new fix removes it. Repeat the same cold/transition scenario on physicalM2.
