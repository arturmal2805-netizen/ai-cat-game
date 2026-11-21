# Текущий статус

21 ноября2026, Europe/Kyiv. Каноническая память — codex/ocean-recovery-memory.
Старый app этой ветки не является текущей игрой. Предыдущий CURRENT сохранён в
[истории](history/CURRENT-before-visible-model-shader-publication-2026-11-21.md).

## Опубликовано и сверено

Main **c199697c2bcf3d18efc3b250f71c1171badc8516**.
[Игра](https://arturmal2805-netizen.github.io/ai-cat-game/?v=c199697) ·
[FPS-диагностика](https://arturmal2805-netizen.github.io/ai-cat-game/?v=c199697&profile=1).
Source **fef392422062766450651067ea2eeb7f6d1112d6**, PR#12 normal merge/noadmin,
ветка codex/visible-model-shader-preparation, /workspace/chichi-v12-island-warehouse.
Tree source/main идентичен:7416427ee5bbeb65c45a98589a3b5c90bea165bc.
[Workflow44894584877](https://github.com/arturmal2805-netizen/ai-cat-game/actions/runs/44894584877):
полный test/build/dry-run, deploy и pages SUCCESS, release/shared-save checks PASS.
Actual HTTP verification 2026-11-21 12:44 Europe/Kyiv:HTML/JS/CSS/coast/reef/SPAatlas/wind
совпали с ожидаемыми bytes, в HTML ровно одно подключение приложения.
[Квитанция](../qa/2026-11-21/visible-model-shaders/live/live-verification.json).

- JS:0ce8e474cf059c73ee94dadc1b86abdab08157006e7b54ef1ac066ad53de35c7.
- CSS:1fd2857ef1fbaedd5e7a34a5082a77ff49bcf7f1c7030d5292502753b86967d0.
- HTML:83748883a1d020dbfbea368fdd66864b2e39c1c41f31955ec19c8a955c2dd2aa.
- App`./dist/app.js?v=0ce8e474cf059c73`; CSS`./style.css?v=1fd2857ef1fbaedd`.
- Coast probeafc536509c5b98ea660eb1a4baa3a608653168e3083dd6673ce7c82ad36c5b6e,
  reef gzip70d7512296dbb20dbb2f6468b558db374dfdbc0232810118b54a1c81c5cec395;
  SPAatlas/wind/все art/model assets прежние. Producerinputs не менялись.

## Исправление и доказательства

Deferred court/bank/Mosasaur async roots публиковались без await shaderwarmup.
Теперь тот же native pipeline готовит их до cache/scene publication с прежними
priority/cancel/dispose; старый объект/ownership не теряются. Skinned/rig котики
готовят native colour/depth shaders, но static sphere scan их не затрагивает.
Skeleton/rig bounds/позы/material/geometry/DPR/тени/общая вода/кошельки прежние.
Shadererror checks не отключены, renderpasses не добавлены.

27focusedtests и fullNode22build PASS. Native exact-source samecamera comparison
(Chromium156/SwiftShader,desktopDPR1,clock7,privateWorker)88→75first-use program
reflections внутри draw; целевыеMosasaur/deferredbuilding/mallguestcat paths
исчезли. Суммы1969.7→1601.5ms — software diagnostic, НЕ M2FPS и не причинное
объяснение всего8.6s gap. Rendered triangles19206975 прежние; venue transforms/
точные bbox совпали. ПолныйPNG не pixelidentical; небольшие differences могут
включать async/actor timing, их нельзя скрывать или объявлять exact.

NativeDPR2 full RAF/mouse:19islands+2returns PASS. Phone390×844/coarse/DPR2:
полныйproductoverview,8realheldtouch crossings,deepdiveниже-200м,2privateSQLite
reload PASS; balances/inventory/placements/personalwallets сохранены. Нет JS/HTTP/
GL ошибок. Все453publicmodules каждого финального capture совпали с source.
[QA/trace/source/PNG/launch scripts](../qa/2026-11-21/visible-model-shaders/README.md).
PRduplicate44894283893 отменён послеmerge, не deployment evidence. RawCI
log download ранее блокировался networkpolicy; completed job/stepmetadata в
live/workflow.json, выдуманный testcount не указывать. PaidAI/liveplayerworlds вQAнет.

## Остаётся проверить на M2

Report предыдущего6ccec70/app0e305ce4212c504f:19.04FPS/15.7s, gap8599.9ms,
eventloop8650.5ms, GPUmedian9.48/p9513.79ms. Renderer867.5/508.8ms,97programlog
queries1208.5ms, maxlongtask913ms/LoAF523.7ms. Эти числа не объясняют весь8.6s
пробел; не приписывать его целиком шейдерам/GC/фону без нового trace.
[Оригинальный report/hash/анализ](../qa/2026-11-20/render-stall-loading/user-fps-6ccec70/analysis.md).
Последний workload630912tri/36calls/3preparing отличается от прежнего2.386Mtri/
380calls; FPSверсий не является контролируемым сравнением. Для текущегоc199697
физический M2/iPhone FPS ещё не измерен. Публикация подтверждена; устранение
всех зависаний и пользовательское художественное одобрение НЕ подтверждены.
Пользователь уточнил21ноября: длинная пауза при загрузке или переходе к локации,
не после полного прогрева. Это уточняет сценарий, но не доказывает устранение
всех8.6s данным patch; проверить тот же переход на физическом M2.

## Сохранённые предыдущие выпуски и ограничения

6ccec70440b551ff6c3c06a98945ff7d5d168db0/sourceb9f681a: exactcooperative static
spheres/Float16 lookup и nativeforcecache content-addressed sameorigin assets.
Предыдущая CPUдиагностика16.662s→97.41ms lazybounds в renderer, подготовка7.128s
распределена; это НЕ physicalFPS. Coldfirstload по-прежнему зависит от сети.
LosslessWebP4–6%trial отклонён; assets/таймауты не заменяли.9probePNG bytes exact.

7a0e1f3daf8afd0629d60d7a3cb0aa147b2a02f4/sourcec8a0000: удалены8отмеченных
Warehousemounds/72crownrocks,384corals с прежнимиID/XZ на actualbed и60fish прежние.
Лагуна4.539→5.848км²; приX2200 ширина1.267→1.712км, housing/neighbours сохранены.
Общий waterdomain/camera actualbed/deep save cutoffbedY-5 поддерживают движение
ниже-200м/2reload. Warehouse/ТРЦ/SPA прежние. Old+new contourunion защищает воду.
f28975b:Warehouse×2.5width/height,depth/центр прежние, glass/gold detailedfacade.
b995a82:3compactSVG44pxvenuebuttons+actualWarehousecamera.
407e427:oldreef-terrace0/1/11удалены,9остальныхскал прежние,greyunderside-12м.
Широкая выемкаSPA parkedcodex/v12-spa-approach-visibility@18c1e57,PR#6CLOSED
unmerged; не включать её/редизайнТРЦ/интерьерWarehouse/AI/покупки самовольно.
Диагностика opt-in/one-shot/закрываемая, QAтолькоprivateWorker/SQLite. Не удалять
старые worktrees; pre-existing scripts/__pycache__/ в памяти не трогать.

## 2026-11-21 — новый report и воспроизведённая starvation очереди

Получен report именноc199/app0ce8e474:16.21FPS,8883.8ms gap/8922.5ms timerdelay.
Shaderfix не устранил большуюпаузу. Loading<=1551.5ms, maxlongtask808ms, поэтому
не приписывать8.9s целиком сети/одному rendercall. User:загрузка/переход;
безFPSдиагностики пока не сравнивал. Полныйreport/базовоеQA:
[scene-task-fairness](../qa/2026-11-21/scene-task-fairness/README.md).
Воспроизведена отдельная системная причина: boosted scheduler.yield chain
3000x3ms даёт8.877s timerdelay; тот жеCPU черезMessageChannel5.6ms. Actualmodule
ESMпроверка:9.533s→6.1ms timerdelay,102→564nativeRAF. Не физическийM2FPS!
35focusedtests PASS. НовыйruntimeWIP:codex/scene-task-fairness, тот жеworktree,
basec199; public/scene-tasks.js выбираетexistingMessageChannelвWindow раньше
scheduler.yield. Worker/timerfallback/budgets/cancel и всеgraphics прежние.
Buildsession8390,/workspace/qa/scene-fairness-build.log. NativeGPUjobs сейчаснет.
Actualmodule experiment10940 завершёнPASS; test86826 завершён35PASS.
Довести build/commit/source/PR/нативные19+returns/phone/CI/live/memory; публикация
уже разрешена. ФизическийMacрезультат ещё непроверен. Новыйsourceнеопубликован.

Scene fairness source **ba2a3dd5131988cc1d001b9e97061e4174fe2985**, PR#13MERGED
normal/noadmin. Main **1e0ea4762167e0572c9c53121b975c6cd1ebbd70**. Exacttreechecked
source/main; capture receipt in /workspace/qa/scene-fairness-merge.json.
35focusedtests/fullNode22build/actualmodulebrowserfairness PASS. Cache version
sculpt-v2-a496203fa13a037a7a10a927 прежняя. Assets/geometry/visuals не менялись.
Mainworkflow **44896468638** test выполняется; PRduplicate44896465884 отменён.
Live покаc199697: новыйpatch ещё не подтверждён опубликованным.
Nativeallmap session **31063**, /workspace/qa/scene-fairness-all-map{,.log},
runnercheck-stall-map.cjs unchanged +sourcecapture,19islands+2returns/DPR2.
Phone автоматически после21samples/mapGPUexit: session **3818**,
/workspace/qa/finish-scene-fairness-native.py, logs scene-fairness-native-finish.log
иscene-fairness-phone.log; outputs /workspace/qa/scene-fairness-phone.
Publication watcher session **80505**, watch-scene-fairness-release.py.
ExpectedJS1a198981ae54d9d020864efbfafb41cefc9f6726a3b315fd4c9b7732fad3e52c,
CSS1fd2857ef1fbaedd5e7a34a5082a77ff49bcf7f1c7030d5292502753b86967d0.
Expectedfile scene-fairness-expected-production.json; actualHTTPreceipt будет
/workspace/qa/scene-fairness-live/live-verification.json. После всехPASS:
archive-scene-fairness.py дляall-map/phone exactsourceba2, archive live receipt,
обновить CURRENT/ROADMAP/decisions/standards, pushremote+verifyexactSHA.
Дать немедленно игру?v=1e0ea47 иFPS?v=1e0ea47&profile=1 толькопослеactualHTTP,
не обещать физическийMacFPS/устранениевсехпауз без нового report.

ВАЖНО: scene fairness initialnative31063 FAILED readiness180s наautumn,
послеmoonPASS. Phone3818не запускался:monitorkорректноотклонил1из21rows.
Main44896468638attempt1 отменён доdeploy/pages; watcher80505exit1, неliveproof.
Отдельное наблюдение64398 такжедошло до180s, но selectedrootlowOnly=false,
кадры/движениекамерыидут, shaderpending14/preparing2:ждётглобальныеbackground
модели, не падение. Новый fairness позволяет большеsoftwareGPUdraws во время
строительства; rawprogress сохранён, не выдаватьsoftwaretimeзаM2FPS.
Sourceba2НЕ менялся. FinalQA runner /workspace/qa/check-scene-fairness-map.cjs
использует exacthelper copy check-native-map-fairness-ready.mjs с единственным
QAизменением180000→600000readiness timeout. ВсеDPR2/fullRAF/camera/touch/data/
asserts прежние. Никаких graphics cuts/manualdrawpause. Finalallmap session73553,
/workspace/qa/scene-fairness-all-map-final{,.log}. Phoneautoafterjobexit session16794,
finish-scene-fairness-native-final.py, logfile scene-fairness-native-final-finish.log.
Mainworkflow44896468638 RERUN **attempt2** сейчас test; publicationwatcher1440,
тот жеwatch-scene-fairness-release.py/expectedhash. Только finalsourceexact21+phone
и actualreceipt позволяютфинальноеclaim. Finalmemoryhelperподготовлен:
/workspace/qa/finalize-scene-fairness-memory.py (не запускатьдоreceipt/phonePASS).
Сохранитьfailed180s evidence, указатьизменениеQAdeadline/attempt2 вCURRENT.
