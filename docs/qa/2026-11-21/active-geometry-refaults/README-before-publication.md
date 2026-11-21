# Active working set and returning-buffer cache — WIP,2026-11-21

New actualM2report1e0/app1a198981:54.167s session, worstframegap533ms, old8.9s
pause did not recur in this session. FPS24.85/12.033s is not a controlled gain:
newlastframe19.38Mtri/3908calls vs1.147M/496 before. GPUmedian24.32/p9537.32ms,
renderCPUmedian14.6/p9540.9ms/max417.8ms. Geometry609MB,JS2.126GB;1264refaults/
508.8MB and588rapid/174.4MB in rollingwindow. Userpositiveaboutbigpause; no
universal60FPS/artistic likeness claim. Next target is avoidable GPU uploads.

Native submission-only full real Mall+SPA/lagoon cachetrace:1.450GBrefaults,
1470 held pressureevictions observed in capped5000eventtrace, ages266.7–933.3ms.
Every observed held eviction is pressure. Virtual30Hz, draw raster suppressed
onlyinQA while nativeuploads/shaderdispatch/culling retained. No FPS/pixelclaim
fromthistrace. Actual GL/pixel/cat-return proofs separate and still running.

Sourceb67979f1880cc32985265e963ad70122a84ac683,branchcodex/active-geometry-refaults,
worktreechichi-v12-island-warehouse, baselinepublished1e0ea47.36focusedchecksPASS;
newtests failagainstpublishedoldpolicy(16vs2rapidreturns) and passwithnewpolicy
withoutraisingtheintrinsicuploadpeak. Shared-ownerfloorcountsuniqueattributes
ofwholepinnedcomponents.192MiBsoftbudget/250ms/2s/10s and64MiBidleallowance
unchanged; actualpinnedfloorcannotbereclaimedandnolongerconsumesthatallowance.
Cold/unheldsceneryfirst, abandoneddatareclaimed,2msretirementbudgetunchanged.
Latest runtime/Workerrebuilt aftermovingfloorbookkeepingbeforethatbudget;
fullNode22modelbuildprecededthebookkeepingrefinement. FinalmainCIstillrequired.
Sculpt-cacheversiona496203fa13a037a7a10a927 unchanged. No art/data/DPRchange.

Baselinecachecapturecomplete. Candidatecache+realGLproof session21711,
/workspace/qa/active-refault-candidate{,.log}. Need compare resources/peak/pixels,
then all19islands+returns/phonecontrols/deepdive/two privateSQLite reloads,
fullmainCI/actualHTTPoneapp/remote-memoryverification. Notpublishedyet.

Native candidate resourceproofcomplete:82,211,624 fewer refaultbytes, exactsame
616,583,450 trackedpeak.5.7%reductioninthisbroadcycle, legitimatecoldreturntraffic
remains; not ahardwareFPSgain. TinyrealGL:exactpixels/samepeak/lateuploads11760→0,
rapid16→2/reclaimtotarget. Fullwide19.2Mtri/3688calls:exactpixelsafterretire/return,
GPU611233198→3037076→611233198/cat81/slot2191unchanged/noGLerror/contextloss/DPR2.
PR#14mergedmain15cb5b4c20dd8acaf3a80818d9c1fb0ea0ce7992/sourceb67979f,
workflow44914901033 running. Nativeallmap/phone/live remain; CURRENT hassessions.
