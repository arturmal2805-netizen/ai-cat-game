from pathlib import Path
import json,shutil,subprocess,datetime,zoneinfo,sys
main,run=sys.argv[1:3];previous='aac417141026eb58421d92f7b37f912cd5bb23da';source='5c198b50bbf986f1381d5090abfc8b9f2a93d4f9';r=Path('/workspace/chichi-shared-water');m=r/'docs/project-memory';q=r/'docs/qa/2026-11-21/venue-camera-latency';w=Path('/workspace/qa')
receipt=json.loads((w/'venue-camera-latency-live-final/live-verification.json').read_text());assert receipt['release']==main and receipt['candidate']==source and len(receipt['applicationScripts'])==1
rows=json.loads((w/'venue-camera-all-map/native-map-frames.json').read_text());assert len(rows)==21 and len({x['id'] for x in rows})==19
assert all(x['frames']>=3 and x['dpr']==2 and not x['contextLost'] and x['orbitRange']>.08 and x['zoomRange']>6 for x in rows)
phone=json.loads((w/'venue-camera-phone-world/warehouse-open-water-movement.json').read_text());assert len(phone['rows'])==8 and len(phone['restores'])==2
for folder,role,sha,state in [('venue-latency-baseline-final','baseline-15cb','15cb5b4c20dd8acaf3a80818d9c1fb0ea0ce7992','baseline-cold-preparation-gated-selection'),('venue-latency-candidate','candidate-failed-hidden-test-control',previous,'interrupted-after-camera-pass-test-erroneously-clicked-hidden-dialog-control'),('venue-latency-candidate-final','candidate-failed-follow-left-island',previous,'interrupted-after-follow-success-test-requested-hidden-autumn-venue'),('venue-latency-candidate-verified','desktop-before-eight-room-menu',previous,'camera-cancel-framing-pass-before-cold-menu-refinement'),('venue-camera-all-map-before-menu','all-map-interrupted-before-menu',previous,'interrupted-after-first-island-for-eight-room-menu-refinement'),('venue-latency-final','desktop-final',source,'cold8room-intent-cancellation-framing-pass'),('venue-camera-all-map','all-map-final',source,'native19islands+2returns-DPR2-pass'),('venue-camera-phone','phone-camera-final',source,'cold-intent-cancel-framing-pass-then-combined-fixture-V12-transition-timeout'),('venue-camera-phone-world','phone-world-final',source,'8heldtouch-deepdive-2SQLite-reloads-pass')]:
 subprocess.run(['python',str(w/'archive-venue-camera.py'),str(w/folder),role,sha,state],check=True)
for folder in ['venue-latency-final','venue-camera-phone']:
 x=json.loads((w/folder/'venue-latency.json').read_text());assert x['cold']['inspection'] and x['cold']['writes'][0]['atMs']<100 and not x['cancellation']['after']['mall'] and not x['cancellation']['after']['spa'];assert not x['errors'] and not x['httpErrors']
shutil.copytree(w/'venue-camera-latency-live-final',q/'live',dirs_exist_ok=True)
shutil.copy2(w/'venue-camera-expected-production.json',q/'expected-production.json')
for name in ['venue-camera-native-finish.log','venue-camera-native-startup-race.log','venue-camera-all-map.log-before-menu','venue-camera-final-regressions.log','venue-latency-final.log','venue-camera-expected-production.json','venue-latency-candidate.log','venue-latency-candidate-final.log','venue-latency-candidate-verified.log','audit-venue-latency-wrong-return.mjs','venue-camera-all-map.log','venue-camera-phone.log','venue-camera-phone-world.log','venue-camera-validation-regressions.log','venue-camera-protected-runtime-before.log','venue-camera-ci-failure-metadata.json','venue-camera-ci-download-blocked.txt','venue-camera-user-position-attribution.json','venue-camera-native-final.log','archive-venue-camera.py','venue-camera-validation-merge.json','venue-camera-merge.json','venue-camera-main-ci-watch.log','venue-camera-publication.log','venue-camera-live-verifier.log','audit-venue-latency-final.mjs','check-venue-latency-final.cjs','check-venue-map-helper.mjs','check-venue-map.cjs','check-native-map-fairness-ready.mjs','native-readonly-hardlinks.cjs','finish-venue-camera-native.py','verify-venue-camera-live.py','watch-venue-camera-release.py','finalize-venue-camera-memory.py']:
 p=w/name
 if p.exists():shutil.copy2(p,q/(name+'.txt' if p.suffix=='.log' else name))
old=(m/'CURRENT.md').read_text();hist=m/'history/CURRENT-before-toolbar-camera-publication-2026-11-21.md'
if not hist.exists():hist.write_text(old)
protected=old.split('## Защищённые предыдущие изменения')[1].split('## Новое сообщение игрока')[0].strip()
e=json.loads((w/'venue-camera-expected-production.json').read_text());t=datetime.datetime.fromisoformat(receipt['verifiedAt']).astimezone(zoneinfo.ZoneInfo('Europe/Kyiv')).strftime('%Y-%m-%d %H:%M')
(q/'README.md').rename(q/'README-before-publication.md')
(q/'README.md').write_text(f'''# Toolbar camera response — published, 2026-11-21

Main{main}, source{source}, ImplementationPR#15 + tests-onlyPR#16 normal merge. Official workflow{run}
test/deploy/pages SUCCESS and actual HTTP{t}Europe/Kyiv: exact bytes/oneapp.
See live/ and expected-production.json for complete JS/CSS/HTML/resource hashes.

User baseline15cb/appfec56d: no perceived FPS gain and upper-icon camera response
up to5s. Report29.12FPS,2.586Mtri/744calls,GPU10.66median/p9517.53ms;
worstsessiongap2099ms/eventloop1926ms. Camera workload differs from19.38Mtri prior
report. Zero refaults in this rollingwindow is not responsive camera proof.

Baseline cold actual SPA camera selection39936ms: ensure() gated camera until full
model/staff/assets/runtime preparation. Hot baseline dispatch+evaluation62–154ms,
no5s hot delay reproduced on this host. Baseline capture-listener microtask
handlerMs was invalid because browser can checkpoint between event listeners;
corrected candidate measures inside explicit onclick wrappers. Exact source,
rawJSON/CPUprofile/runners retained; not a physicalMac latency benchmark.

Candidate camera intent commits synchronously before ensure, with request versions
invalidated by every exit/newer selection; native preparation/service gates remain.
Cold menu contains the actual8 v7 rooms even before model readiness. Preview uses authored v7 palace; legacy room aliases resolve only for latest
request. Follow/manual release SPA. Warehouse exact immutable vertex bounds are
reused by model+worldtransform with cloned output; native bound tests cover
rotation/scale/parent movement/replacement and no second vertex scan. Graphics,
assets/rigs/buildings/DPR/physics/wallets/saves unchanged. 24focusedchecks/fullNode22
build PASS; mainCI rebuilds exactsource. Full localbuild preceded the final8-room-menu refinement, recording15cbWorkerSHA.
Finalruntime/Worker rebuilt and24focusedchecks rerun after refinement; exactmainCI
rebuilds the finalsource andWorker. An earlier all-map run interrupted after its
firstisland for this refinement is preserved, not counted as finalPASS.

Desktop andphone actualcold toolbar/follow/Mall/SPA/Island requests, stale-request
cancellation after complete preparation, warm handoffs/framing/8bboxcorners and
44px controls PASS. First intended target assignment <100ms in captured cold
handlers (exactvalues in venue-latency.json). Construction itself still takes
hostdependent time; early camera command is not faster asset/model readiness.
First mainworkflow44928862404 failed npmtest before any deployment; rawlogs were
networkblocked. Locally reproduced2 historical whole-file freeze failures for
authorized camera/controller changes. PR#16 narrows only these camera exclusions,
keeps historicalfixtures/buildingmodels/economy/saves immutable;24relatedchecksPASS.
The local fullsuite was interrupted after its initial passing cases for this
refinement, not counted as PASS. Final mainCI reruns the entire suite.
Phone camera substage passed before the combined fixture timed out re-entering
the autumn tab in auditV12. Dedicated unchanged world/phone/privateSQLite fixture
then verifies the movement/save gates separately. No runtime change between them.

First candidateattempt failed because QA selected #chichi-camera inside a CLOSED
care dialog; preserve failed logs/source. Second test followed a random cat to another island, then incorrectly waited for
the now-hidden Mall button. Final test uses the visible random-cat button last,
returns via the actual autumn tab, and keeps the product visibility rules.
Product source unchanged between attempts; both failed logs/source preserved.

All19islands+2returns native fullRAF/DPR2/realmouse orbitzoom PASS. Only preparatory
software-GPU warmup pauses QA drawing to avoid raster competition; original
sampled frames, queue, quality, controls/asserts and600s readiness unchanged.
Phone390×844/coarse/DPR2 fullWarehouseframing,8heldtouch sweeps/deepdivebelow-200m/
2privateSQLite reloads PASS; balances/inventory/placements/personalwallets retained.
Runtime public modules are byte-identical to de479 (the final source adds only
2 test corrections); all453 public modules per capture match finalsource. Raw
qa-build.json retains each original captureHEAD. 453publicmodules per capture exactsource; no JS/HTTP/GLerror/contextloss. Private
Worker/SQLite only and one GPUbrowser at a time. Not physicalMac/iPhoneFPS or
CrimsonDesert artistic approval. Newhardware report must match app{e['dist/app.js']['sha256'][:16]}.
''')
(m/'CURRENT.md').write_text(f'''# Текущий статус

21 ноября2026, Europe/Kyiv. Каноническая память — `codex/ocean-recovery-memory`;
код этой ветки старый, actual source/main ниже.
[Предыдущие checkpoint](history/CURRENT-before-toolbar-camera-publication-2026-11-21.md).

## Опубликовано и проверено

Main **{main}**, source **{source}**, branch`codex/venue-camera-validation`,
worktree`/workspace/chichi-v12-island-warehouse`. ImplementationPR#15 + validationPR#16 merged normally/noadmin.
Exact source/main tree `48ba046378769439b40426a0ff048f8056b44994`.
[Игра](https://arturmal2805-netizen.github.io/ai-cat-game/?v={main[:7]}) ·
[FPS](https://arturmal2805-netizen.github.io/ai-cat-game/?v={main[:7]}&profile=1).
Workflow **{run}** test/build/deploy/pages SUCCESS, exact Worker release/shared-save
checks PASS, routine paidAI не вызывается. PR workflows44927682063/44928626955 отменены после source update/merge и не являются
production deployment. External Workers Builds отдельно от official main workflow.
Actual HTTP **{t} Europe/Kyiv**: versioned HTML/JS/CSS/coast/reef/SPA/wind bytes
совпали; **одно подключение приложения**.
[Receipt/metadata](../qa/2026-11-21/venue-camera-latency/live/live-verification.json).

- JS SHA256 `{e['dist/app.js']['sha256']}`.
- CSS SHA256 `{e['style.css']['sha256']}`.
- HTML SHA256 `{e['index.html']['sha256']}`.
- App`./dist/app.js?v={e['dist/app.js']['sha256'][:16]}`,
  CSS`./style.css?v={e['style.css']['sha256'][:16]}`.
- Полные resourcehashes в receipt. Art/model/probes/sculpt cache version прежние.

## Устранено ожидание подготовки перед командой камере

Игрок на15cb/appfec56d сообщил: приростаFPS неощущает, верхниеиконки→камерадо5s.
Mall/SPA прежде awaitfullensure (models/assets/staff/navigation/runtime) ДОonCamera;
старый pending request послеexit могперехватитьновуюкамеру. Теперьacceptedintent
передаётсясинхронно, полнаяnativeподготовка иpurchases/service gates сохранены.
Exit/newrequest инвалидируетversion; позднийsuccess/failure не меняет новогоowner.
Cold SPA сразу использует реальныйpalacev7 framing, alias room уточняетсятолько
дляактуальногозапроса. Follow/manual освобождают SPAinspection. Warehouse exact
native bbox кэшируетсяпоimmutablemodel/worldtransform, cloneout иrecomputeпри
перемещении/замене. Графика/геометрия/DPR/вода/тени/котики/физика/data прежние.

Baseline cold selection39936ms наsoftwarehost. Candidate firsttarget <100ms в
реальном coldonclick; точныеdesktop/phoneзначения в rawJSON. Не сравнивать39s
постройки сFPS/физическимMac: models/assets всёещёготовятся, initialcameraintent
большеихнеждёт. Warmbaseline62–154ms dispatch, hot5s наhostнеповторено.
ПервыйcandidateQAошибочнонажалhidden#chichi-cameraвзакрытомcare-dialog; failed
attemptсохранён. ВторойQAпослеfollowушёлнаостровкотикаиневерножлалскрытыйMall. Finaltest
нажимаетверхнююrandomcatпоследней,возвращаетсянаautumnнастоящейвкладкой.
Productsourceтотже;обаfailedattemptсохранены.
Baseline microtaskcapturehandlerMsневалиден; correctedexplicitonclickwrapper.

24focusedtests/Node22fullbuild иfinalmainCI PASS. Nativecold requests/cancel/follow/
Mall/SPA/Island +desktop/phone framing/8bboxcorners/44px PASS. Native **19islands+
2returns**, fullRAF/DPR2/реальныйmouseorbitzoom PASS. Только QApreparationdrawpause
доsampling экономитsoftwareGPUcompetition; nativeframes/queue/controls/asserts
прежние. Phone390×844/coarse/DPR2/8heldtouch/deepdivebelow-200m/**2privateSQLite
reloads** PASS; balances/inventory/placements/personalwallets прежние.453public
modules каждогоcapture совпали сfinalsource. Runtimebytesтежеde479; finalsource
5cдобавляеттолькокоррекцию2tests. Rawqa-build хранитoriginalcaptureHEAD.
ПервыйmainCI44928862404failednpmtestдоdeploy; localrepro2историческихfilehash
freezeотклонялразрешённыеcamera/controllerchanges. PR#16уточняеттолькоэтуграницу,
buildingmodels/economy/saves иhistoricalfixturesпрежние.24relatedtestsPASS,
finalmainCIполностьюповторилsuite. PhonecamerasubstagePASS,посленегокомбинированный
fixturetimeoutнаповторномautumntab; movement/saveотдельнымnativefixturePASS. НетJS/HTTP/GLerrors/contextloss. QAprivate
Worker/SQLite, одинGPUjob зараз. [QA](../qa/2026-11-21/venue-camera-latency/README.md).

## Что пока не доказано

ПоследнийactualM2report — **15cb/appfec56d**:29.12FPS/10.267s,1266RAF/45.183s,
2.586Mtri/744calls,GPU10.66median/p9517.53ms; longestgapSinceStart2099ms,
eventloopmax1926ms, renderermax765.6ms.0refaultsвrollingwindow,shaderpending2.
Камерадругая,чемпрошлые19.38Mtri; нетконтролируемогоFPSроста. Usernoincrease
приняткакрезультат,необъявлятьидеал/60FPS/всезадержкиисчезли. Следующийшаг:
новыйhardware report с app{e['dist/app.js']['sha256'][:16]}, проверитьтежеверхниеиконки
послеполнойзагрузкииcold/transition. NativePASS/CIнехудожественноеодобрение.
Диагностикаopt-in/one-shot/закрываемая; обычнаяиграеёневключает.

Предыдущий **15cb5b4c20dd8acaf3a80818d9c1fb0ea0ce7992/sourceb67979f** сохранил
boundedidlecacheнадужеpinnedfloor: controlled82,211,624B fewerrefaultuploadsпри
томжепике616,583,450B/realGLpixels/catsцелы. Этоresourcefix,необещаниеFPS.
1e0ea476/sourceba2 сохранилWindowMessageChannelFIFOраньшеscheduler.yield;
8.9sпауза не повторялась в54s следующегосеанса, но меньшиепаузыостались.
Sculpt-cache`sculpt-v2-a496203fa13a037a7a10a927` прежний.

## Защищённые предыдущие изменения

{protected}
'''.rstrip()+'\n')
(m/'ROADMAP.md').write_text(f'''# Очередь

21 ноября2026: toolbarcamera release **{main}**, source{source}, PR#15+PR#16,
workflow{run}/actualHTTPoneappPASS.24focusedtests/fullmainbuild/nativecoldcancel/
desktop+phoneframing/19+2maps/8touch/deepdive/2privateSQLite reloadPASS.

Следующее: hardwareM2reportнаapp{e['dist/app.js']['sha256'][:16]}, проверитьтежеиконки
послеполнойзагрузки/coldtransition. UserreportednoFPSgainна15cbпринят, FPS60/идеал
необещать. Earlycameraintentнеускоряетсамупостройку/сеть. Сохранятькачество/DPR/
воду/тени/котиков/data. BroadSPAexcavationparked, редизайнТРЦисключён,
Warehouseinteriorнезапрошен. ПолныеSHA/hashes/QA — CURRENT.
''')
(m/'decisions.md').open('a').write(f'''\n## 2026-11-21 — toolbar intent без ожидания whole ensure\n\nUsernoFPSgain/до5siconresponseна15cb. Main{main}/source{source},PR#15+PR#16,\nworkflow{run}/actualHTTPoneappPASS. Mall/SPA synchronouscameraintent, fullnative\nprepare/servicegatesretained, versionedexit/latestrequestpreventsasynccamera\nstealing. Follow/manualreleasesSPA; exactimmutableWarehousebboxreuse.\nNativecoldintent/cancel/framing/19+2/phone2reloadPASS,24focusedtests/mainCIgreen.\nНеобъявлятьearlyintentускорениеммоделей/FPSнаMac; ждёмactualnewreport.\n[QA](../qa/2026-11-21/venue-camera-latency/README.md).\n''')
(m/'standards/controls-camera.md').open('a').write('''\n## Toolbar intent и async preparation — 2026-11-21\n\nКоманда камеры принимается синхронно при разрешённом нажатии на Mall/SPA.\nНе await whole ensure со staff/navigation/assets перед onCamera. Сама fullnative\nподготовка/service/purchase gates прежние; раннийtarget не означает модельготова.\nКаждыйexit (даже безактивнойinspection) иноваяselection инвалидирует pending\nrequest. Позднийsuccess/failure/legacyalias не возвращает старуюкамеру после\nIsland/world/follow/manual/другогоvenue. Cold SPA использует фактическийv7palace.\nExact Warehouse bbox можно reuseтолькоуimmutableauthoredmodel, сcloneout и\nпроверкойworldtransform/identity. Не заменять exactvertexbound приблизительным.\nNativeQA: реальные coldclicks, быстрыехэндоверыдоensurecompletion, отсутствие\nпозднегоперехвата, finaldesktop/phone bbox/framing/44px, all19+returns/reload.\nРазличатьphysicalinputdelay/cameraintent/modelready/первыйGPUframe. Capture\nmicrotask междуeventlisteners немеряетonclickcost; измерятьвнутриhandlerwrapper.\n''')
print('Final toolbar camera memory prepared',main,t)
