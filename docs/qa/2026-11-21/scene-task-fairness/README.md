# Scene task fairness — WIP,2026-11-21

Published baselinec199697/sourcefef3924. UserM2newapp0ce8e474 confirms remaining
pause:16.21FPS/18.45s, gap8883.8ms, eventloop8922.5ms, maxlongtask808ms;
GPUmedian10.65/p9514.32ms. Resource max1551.5ms. Different lastframeworkload
1.147Mtri/496calls prevents a controlled FPS comparison with previous630ktri/
36calls. User confirms loading/transition; no comparison with diagnostics off.
Keep rawreport/hash. Prior shaderfix did not remove this pause.

Existing scheduler.yield continuation priority can starve ordinary timers.
Standalone sequential Chromium156:3000x3ms sameCPU slices, scheduler maxdelay
8877.1ms/96RAF vsMessageChannel5.6ms/557RAF. Actual production ESM import:
baseline2391613b...9532.8ms/2timer callbacks/102RAF; candidate3349093a...
6.1ms/46timers/564RAF. Actual-module baseline overlapped focusedNodechecks;
standalone comparison did not. This is scheduling attribution, NOT physicalM2
FPS, nor proof the entire Macgap is removed. Both exactmodulebytes/runners/
rawJSON retained. No app diagnostic instrumentation used in the experiment.

Candidateprefers existingWindowMessageChannelFIFO before scheduler.yield,
retaining worker/fallback/timer paths. Builderinstructions/budgets/priority/
cancellation and graphics/cats/DPR/water/shadows/data unchanged.35focusedchecks
PASS. FullNode22build session8390 pending. Sourcebranchcodex/scene-task-fairness,
/workspace/chichi-v12-island-warehouse. Needcommit/push/nativewholemap/phone/mainCI/
actualhashes and finalMacreport. Do not claim newpublication beforeverification.
