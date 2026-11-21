# Scene task fairness — published,2026-11-21

Main1e0ea4762167e0572c9c53121b975c6cd1ebbd70,sourceba2a3dd5131988cc1d001b9e97061e4174fe2985,PR#13 normalmerge.
Workflow44896468638attempt2test/deploy/pagesSUCCESS; actualHTTP2026-11-21 13:19Europe/Kyiv
verified bytes/exactlyoneapp,see live/. Earlier checkpoints in README-before-publication.md.

Userbaselinec199697/app0ce8e474:16.21FPS/18.45s,8883.8ms framegap/8922.5ms timerdelay.
Longtaskmax808ms, resourcesmax1551.5ms; userconfirmedloading/transition, ordinary
play withoutdiagnosticnotcompared. Preserve originalreport/hash; no controlled
FPScomparison across differingcamera/workload. Prior shaderfix did not remove pause.

Two sequential browserexperiments reproduce boosted continuation starvation.
Standalone3000x3ms:8877.1ms timerdelay/96RAF vsMessageChannel5.6ms/557RAF.
ActualproductionESM:9532.8ms/2timers/102RAF vs6.1ms/46timers/564RAF. The second
baseline overlapped focusedNodechecks, firstexperimentdidnot. Scheduling
attribution only; not physicalM2FPS or proof of the full Macgapremoval.
Exact modules/runners/hashes/rawJSON retained.35focusedchecks/Node22buildPASS.
Sculpt-cacheversiona496203fa13a037a7a10a927/graphics/assets/data unchanged.

Initial180s globalwarmup readiness expired onsoftwareGPU. Progress showed
selectedrootcompleted, liveframes/camera and ongoingbackgroundpreparation.
Mainattempt1cancelledbeforedeployment. FinalQA changes onlyreadinesswait600s,
keepingDPR2/fullRAF/mouse/touch/sampling/allasserts; exactQAhelper+wrappers saved.
Failed180s attempts/progress/sourceproof retained separately. LongerQAdeadline
is not a performance improvement or a physicaldevice estimate.

FinalNative19islands+2returns/DPR2 andphone390×844/coarse/DPR2 overview/8heldtouch/
deepdive/2privateSQLite reload PASS.453publicmodules per finalcaptureexactsource;
no JS/HTTP/GLerrors, balances/inventory/placements/personalwallets preserved.
OneGPUjob at a time; privateWorker/SQLiteonly. RawfullCIlogsblocked earlier by
networkpolicy; latestjob/stepmetadata in live/workflow.json. FinalmainCI rebuilds
andverifies exactWorker1e0ea47, localbuild ranprecommit atthenHEADc199697.
No newphysicalMacreport yet, artisticapproval not implied.
