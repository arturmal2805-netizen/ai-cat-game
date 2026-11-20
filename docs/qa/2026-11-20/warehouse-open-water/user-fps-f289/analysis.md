# User M2 report — previous published f28975b

Received2026-11-20 during publication of the open-water candidate. Original immutable
JSON and SHA receipt preserved here. It measures app1b15b0b20e8732f7 (f289), not
candidatec8a0000/main7a0e1f3. Hardware reports ANGLE Metal AppleM2, Chrome157,
DPR2,19visiblecats, native individual renderer. No graphical reduction authorized.

Measured window300samples/22.1s:13.53FPS; RAF23.02FPS. This window includes an
8.2second renderer freeze, so it is not a clean steady-state average. GPU300valid
samples median32.41ms,p9550.21ms,max110.28ms. Main simulation median1.1ms,
p952.3ms; renderer submission median26.4ms,p9533.6ms,max8193.3ms. GPU/cpu
submissions overlap; do not add these medians as a frame-time estimate.

Last rendered counters:1401calls,15,330,179triangles,~515.3MBtrackedgeometry,
~609.1MBpeak; JSheap~1.36GB.368renderersubmissions vs848RAF callbacks and480GPU
wait callbacks. Broad drawing work/driver load is the leading optimization target;
this report alone does not identify the cause of the8.2s stall.225programs were
created after reset; compilation status reads total1175.8ms. These figures do not
prove a specific shader, GC, texture or resource-eviction stall.

375geometryevictions/12rapidrefaults (~1.55MB);636.4MBbufferData after reset.
Resource fetches take up to1.99s, but transferBytes0 must not be treated as measured
zero network traffic or proof of a network bottleneck. Save requests~0.10–0.41s;
app.persist5.6ms/commitmax61.2ms do not explain the8.2s renderer stall.

After publication collect a same-view, same-DPR warm report of the new app and
trace the long renderer task if it recurs. Preserve cats, lighting, water, detail,
DPR and save durability. No performance claim for the geometry release. Do not
expand this already-running publication with an untested rendering experiment.
