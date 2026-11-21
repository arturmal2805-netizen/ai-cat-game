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
