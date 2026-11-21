# Текущий статус

21 ноября 2026, Europe/Kyiv. Каноническая память: `codex/ocean-recovery-memory`.
Приложение этой ветки памяти старое; актуальный код — main и source ниже.
[Предыдущий CURRENT со всеми checkpoint](history/CURRENT-before-active-geometry-publication-2026-11-21.md).

## Опубликовано и проверено

Main **15cb5b4c20dd8acaf3a80818d9c1fb0ea0ce7992**, source **b67979f1880cc32985265e963ad70122a84ac683**,
branch `codex/active-geometry-refaults`, worktree `/workspace/chichi-v12-island-warehouse`.
[PR #14](https://github.com/arturmal2805-netizen/ai-cat-game/pull/14) merged normally,
без admin/bypass. Exact source/main tree `a2edf381fc9e4f958ef21a0c3bc2387e94ba05c9`.
[Игра](https://arturmal2805-netizen.github.io/ai-cat-game/?v=15cb5b4) ·
[FPS](https://arturmal2805-netizen.github.io/ai-cat-game/?v=15cb5b4&profile=1).
[Workflow 44914901033](https://github.com/arturmal2805-netizen/ai-cat-game/actions/runs/44914901033):
test/build/deploy/pages SUCCESS; точный Worker release/shared-save checks PASS.
Paid AI routine deploy не вызывает. PR duplicate 44914690669 отменён после merge;
отдельный external Workers Builds не подменяет результат этого official workflow.
Actual HTTP **2026-11-21 16:52 Europe/Kyiv**: HTML/JS/CSS/coast/reef/SPA/wind совпали с expected
bytes, **одно подключение приложения** и корректные versioned JS/CSS URL.
[Receipt](../qa/2026-11-21/active-geometry-refaults/live/live-verification.json).

- JS SHA256: `fec56d9990ec8549b9bf147e5ae063e742fab6993601ef7b0417cb8c050a58cf`.
- CSS SHA256: `1fd2857ef1fbaedd5e7a34a5082a77ff49bcf7f1c7030d5292502753b86967d0`.
- HTML SHA256: `3fc41c5ab820878daa05f01795a38f2480c3bbbfcfeeb6eca67eb19c42e1f935`.
- App URL: `./dist/app.js?v=fec56d9990ec8549`.
- CSS URL: `./style.css?v=1fd2857ef1fbaedd`.
- Coast/reef/SPA/wind полные хеши в receipt; art/model bytes не менялись.

## Исправление повторных GPU uploads

Fixed pressure target 192+64 MiB был недостижим, когда уже используемые и
защищённые общими attributes буферы сами занимали больше. Контроллер преждевременно
выбрасывал возвращающиеся в камеру буферы даже внутри learned grace.
Теперь pressure floor = max(192 MiB, unique bytes уже non-retireable shared-owner
components) плюс ПРЕЖНИЙ bounded idle allowance <=64 MiB и <=budget/3.
Это учёт уже защищённой памяти, без нового owning model cache/повышения констант.
Cold-first reclaim, 250ms/3 absent frames, learned 2s, cat time grace 10s,
2ms retirement budget и совместная безопасность owners прежние. Floor bookkeeping
вне 2ms sweep timer, как существующие candidate filter/sort. Abandoned data
освобождаются. Вода/DPR/тени/материалы/геометрия/позы/котики/AI/сохранения прежние.
Sculpt cache version: `sculpt-v2-a496203fa13a037a7a10a927` неизменна.

## Доказательства и ограничения

36 focused tests PASS; два новых regression cases FAIL на опубликованной старой
policy и PASS на новой. Full Node22 build PASS до финального перемещения bookkeeping;
после него runtime/Worker rebuilt и 36 tests повторно PASS. Official main CI
собрал и проверил exact final source. Не выдумывать общее число CI tests из blocked raw logs.

Native full Mall+SPA/lagoon camera cycle: refault bytes **1,450,375,695 → 1,368,164,071**,
**82,211,624 bytes / около 5.7% меньше**, tracked peak ровно **616,583,450** в обоих.
Это submission-only resource trace: raster suppressed только в QA, virtual30Hz,
нативные culling/shader dispatch/uploads сохранены; НЕ FPS или pixel benchmark.
Events capped5000 с разным coverage, raw held-event counts между ролями не сравнивать.
Cold returns остаются при bounded cache. Separate actual isolated64x64 realGL:
exact pixels, same8400B peak, late uploads11760→0B, rapid returns16→2,
abandonment reclaim2520B=originalbudget; actual game DPR2 прежний.
Actual fullwide GPU retirement/return: **0 changed pixels**, 19,206,975tri/3688calls,
GPU611,233,198→3,037,076→611,233,198 bytes; cats81/atlas slots2191 сохранены,
GLerror0/contextnotlost/DPR2. Не выдавать маленький isolated proof за full-game FPS.

Final native **19 islands+2 returns**, full RAF/DPR2/real mouse orbit/zoom PASS.
Phone390×844/coarse/DPR2/product overview/full Warehouse bbox: **8 held-touch
crossings, deep dive below-200m, 2 private SQLite reloads PASS**; balances,
inventory/placements/personal wallets сохранены. JS/HTTP/GL errors отсутствуют.
Все453 public modules каждого capture совпали с exact source. QA only private
Worker/SQLite, один GPU job за раз. SoftwareGPU correctness не physicalM2/iPhone FPS.
All-map QA global readiness600s — ранее обоснованный explicit helper только для
software background warmup, не изменение продукта/графики/asserts и не ускорение.
[Raw reports, hashes, source archives, runners, PNG and results](../qa/2026-11-21/active-geometry-refaults/README.md).

## Последний физический M2 report и следующий шаг

Baseline 1e0ea4762167e0572c9c53121b975c6cd1ebbd70/app1a198981:
54.167s session; worst framegap533.334ms/rolling432.6ms — прежняя8.9s пауза не
повторилась в этом сеансе. Eventloop max1523.4ms, то есть все задержки не исчезли.
FPS24.85 за12.033s, current19.38Mtri/3908calls/GPU24.32median/p9537.32ms,
CPU render14.6median/p9540.9/max417.8ms, geometry608.9MB/JS2.126GB;
1264refaults/508.8MB и588rapid/174.4MB. Это не контролируемый FPS рост относительно
старого1.147Mtri/496calls report. User«красава осталось довести до идеала» —
положительный отзыв о предыдущем результате, не visual approval Crimson Desert.
Новый cache fix опубликован; следующий шаг — свежий M2 report той же камеры/
loading/transition с новым app hashfec56d9990ec8549. Не обещать60FPS/«идеал»/полное
исчезновение пауз. Не расширять scope/снижать качество без новых измерений.
Диагностика opt-in, one-shot, закрываемая; обычная игра не открывает её сама.
Предыдущий release1e0 сохранил Window MessageChannel FIFO раньше scheduler.yield;
это устранение boosted continuation starvation не откатывать.

## Защищённые предыдущие изменения


c199697c2bcf3d18efc3b250f71c1171badc8516/sourcefef3924: deferredMosasaur/bank/court
root warmup до публикации; animatedcat colour/depth prep без изменения rigbounds/
skeleton. Nativefirstuse88→75, это partialfix, не устранение8.9s паузы.
6ccec70440b551ff6c3c06a98945ff7d5d168db0/sourceb9:exactstaticboundscooperatively,
Float16lookup и nativeforcecache content-addressed publicassets. Coldfirstload
остаётся сетевой. LosslessWebP4–6% rejected,9probePNG bytes identical.
7a0e1f3daf8afd0629d60d7a3cb0aa147b2a02f4:8Warehousemounds/72crownrocks удалены,
384corals с прежнимиID/XZ наbed/60fish сохранены. Лагуна4.539→5.848км²,
приX2200 ширина1.267→1.712км. Общий waterdomain/camera actualbed/deepsavebedY-5
исправлены, housing/neighbours/ТРЦ/SPA/Warehouse прежние.
f28975b:Warehouse×2.5widthheight/glassgoldfacade,depth/центр прежние;
b995a82:3compactSVG44pxvenuebuttons+actualWarehousecamera;
407e427:oldreef0/1/11удалены,9остальных прежние,greyunderside-12м.
Широкая выемкаSPA parkedcodex/v12-spa-approach-visibility@18c1e57,PR#6CLOSED
unmerged. Не включать её/редизайнТРЦ/интерьерWarehouse/AI/экономику самовольно.
CrimsonDesert — visualtarget, stable — regressionbaseline, d6fa805 — historicalbase.
Не удалять старые worktrees/pre-existing scripts/__pycache__/ в ветке памяти.

## Новое сообщение игрока — toolbar camera WIP

Report15cb/appfec56d: user no perceived FPS gain; верхниеиконки→cameraдо5s.
Новаязадача codex/venue-camera-latency в chichi-v12-island-warehouse,
неопубликована. Mall/SPA awaitfullensure до camera, pendingrequestнеотменяется
приexit иможетперехватитькамерупозже. WIP synchronousintent+versioncancel,
SPA follow/manualhandoff, exactimmutableWarehousebboxcache. Coldnativebaseline
39936ms selection, warm62–154ms dispatch, НЕhardwaretiming. Newreport/rawQA:
docs/qa/2026-11-21/venue-camera-latency. Source/всеfinalchecks ещёнужны.

Source **aac417141026eb58421d92f7b37f912cd5bb23da**, PR#15,
branchcodex/venue-camera-latency.9focusedtests/Node22fullbuildPASS; localbuild
Worker recordedpreviousHEAD15cb (sourcefinalmainCIещёнужен). CandidatecoldSPA
firstcameraintent0.4ms/onclick0.5ms while rootnotready; finalcoldcancellation/
framingdesktop98438 thencontroller69125 runsallmap→phone. All-map pauseONLY
preparation toavoidSwiftShaderCPUcompetition; finalsampling fullRAF/DPR2/input
unchanged, deadline600s inherited. Logs/runners /workspace/qa/venue-camera*.
PRworkflow44927682063 testinprogress, deploy/pages correctlyskipforPR. Live15cb.

Finalcandidate **de479f16eaaefac390110a4dd284f7a63a11bcc4** after coldmenu
refinement: actual8v7zones/services beforemodelready, no14legacyroomflash.
12focusedchecksPASS; exactcacheversiona496unchanged. FullNode22buildpreceded
thissmallrefinement,finalruntime/Workerrebuilt. Desktopactualcoldintent0.7ms,
cancel/follow/Mall/SPA/Island andframingPASS. EarlierQAwronghiddencontrol,then
wrongreturnafterrandomcatleftautumn preservedfailed;productcodeunchangedbetween
thoseattempts. Oldallmapinterruptedafterfirstmoonforsmall8menu refinement;
finalnativecontroller25808 allmap→phone fullRAF/DPR2 sampling, prep-onlypause.
PR#15normalmerge requestedtooverlapmainCIwithremainingnativegates; cancelmain
workflowifnativefailsbeforepublication. Livecurrently15cb,notclaimnewdeploy.

PR#15 MERGED normally: main **abd2305e6234f42e9bcc5e0be41ca5dd8c6d9561**,
source **de479f16eaaefac390110a4dd284f7a63a11bcc4**, exacttree
afe1933dac0b7dd893d8e491a0f20547983db458. Official mainworkflow **44928862404**
running/test, PRduplicate44928626955cancelledaftermerge. Publicationwatch
session23794 watchesmain+actualHTTP (verify-venue-camera-live.py). Nativecontroller
25808 /workspace/qa/finish-venue-camera-native.py; /workspace/qa/venue-camera-native-finish.log,
fullmap→combinedphonecold/cancel/framing/8touch/2reload. Watcher cancelsmainifnative
controllerfails. LiveSTILL15cb untilreceipt exists. Expectedfinalapp
21fc1aa9e5cc509119d0d4e914216f970c5326cb370ac2c364ed317da309b95a/CSSsame1fd.
Finalmemorywriter /workspace/qa/finalize-venue-camera-memory.py MAIN RUN,
requiresallnative/liveproofs. No further sourcechangesneeded; finishexistinggates,
archivefailedandfinalexactsource, actualHTTP/oneapp, memorypush/remoteSHA, thenlinks.

Finalnativeallmap **21rows/19islands+2returns PASS**, allDPR2/frame>=3,
minorbit0.09467/minzoom15.9994, noJS/HTTPerrors/contextloss. Exact453modules
verifiedsource de479. QApausedONLYpreparationbeforefullnativeRAF samples;
oldbefore-menu interruptedrun preserved separately/sourceaac. Phonecombined
running, coldintent0.5ms/8roommenuPASS; final2reload andCI/live pending.
Previousmainworkflowtestphase normally~12min; do not bypass whilewaiting.

## Validation correction and all native gates complete

Firstmain **abd2305/workflow44928862404FAILEDnpmtest**, deploy/pagesSKIPPED;
notpublished. RawCIlogsblocked(resultsreceiver); metadata+localrepro retained:
2whole-filehashguards rejectedauthorizedcamera/runtimefiles. Historicalfixtures
notchanged; narrowexceptionsforMall/SPAcamera controllers/Warehousecamera,
buildingmodels/economy/saves assertions retained.24relatedtestsPASS.
Tests-onlysource **5c198b50bbf986f1381d5090abfc8b9f2a93d4f9**, PR#16normalmerge
main **d0d944acdc83ab69c1337d85e77c0471b044cb7a**, exacttree
48ba046378769439b40426a0ff048f8056b44994. Newmainworkflow **44930181677**running.
PRduplicate44930178385cancelledaftermerge. Watchsession **2231**,
/workspace/qa/watch-venue-camera-release.py → venue-camera-publication.log;
actualreceipt /workspace/qa/venue-camera-live/live-verification.json.
Publictree de479==5c==d0dverified; actualruntimeunchangedafter24testfix.
Nativeallmap21/cold8room/cancel/framingdesktop+phoneALLPASS. Combinedphoneafter
cameraPASS timedoutre-enteringautumntabinV12fixture; keptfailedlog; separate
originalphone-worldfixture **21140** PASS8touch/deepdive/2SQLite reloads.
Finalnativegatelog /workspace/qa/venue-camera-native-final.log. No moreGPUwork
needed. OnlyfullmainCI/livebytes/finalmemory/remoteSHA remain. Finalizer source
5c andseparatephone-world pathupdated. LiveSTILL15cbuntilverifiedreceipt;
expectedJS21fc1aa9e5cc509119d0d4e914216f970c5326cb370ac2c364ed317da309b95a.

## CI tests PASS; final publication remaining

Mainworkflow44930181677 fulltest/build/dryrunSUCCESS; deploycurrentlybuilding.
Allnativecheckscomplete, do not repeat or expandcode. ActualNEWlive receiptpath:
`/workspace/qa/venue-camera-latency-live-final/live-verification.json`.
Old `/workspace/qa/venue-camera-live/` belongs to historicalb995 release; do not
use existence alone. Assert receipt.release==d0d944acdc83ab69c1337d85e77c0471b044cb7a.
Watcher2231 updatesnewuniquefolder afterwholeworkflowPASS. Then run
`python /workspace/qa/finalize-venue-camera-memory.py d0d944acdc83ab69c1337d85e77c0471b044cb7a 44930181677`
followed by `python /workspace/qa/polish-venue-camera-memory.py`; archive/helper
excludes its own manifest from hashentries. Verifyallartifacthashes, gitdiffcheck,
pushmemory/remoteSHA, PRbodyupdate. Givegame/FPS?v=d0d944a onlyafterHTTPproof.
