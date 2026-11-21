# Текущий статус

21 ноября2026, Europe/Kyiv. Каноническая память — codex/ocean-recovery-memory.
Старое приложение ветки памяти не является текущим main. Предыдущий CURRENT:
[история перед fairness-релизом](history/CURRENT-before-scene-fairness-publication-2026-11-21.md).

## Опубликовано и проверено

Main **1e0ea4762167e0572c9c53121b975c6cd1ebbd70**, source **ba2a3dd5131988cc1d001b9e97061e4174fe2985**,
PR#13 normal merge/noadmin. Branch codex/scene-task-fairness,
/workspace/chichi-v12-island-warehouse. Source/main trees совпали.
[Игра](https://arturmal2805-netizen.github.io/ai-cat-game/?v=1e0ea47) ·
[FPS](https://arturmal2805-netizen.github.io/ai-cat-game/?v=1e0ea47&profile=1).
Workflow **44896468638 attempt2** test/build/dry-run/deploy/pages SUCCESS, точный Worker
release/shared-save checks PASS, paidAI в routine deploy не вызывался.
Actual HTTP verification **2026-11-21 13:19 Europe/Kyiv**:HTML/JS/CSS/probe/reef/SPA/wind
bytes совпали, одно подключение приложения. [Receipt](../qa/2026-11-21/scene-task-fairness/live/live-verification.json).

- JS:1a198981ae54d9d020864efbfafb41cefc9f6726a3b315fd4c9b7732fad3e52c.
- CSS:1fd2857ef1fbaedd5e7a34a5082a77ff49bcf7f1c7030d5292502753b86967d0.
- HTML:0d704b4ae57d413e8d6fb7abba5ba551d1f76465e812cb3109f3df20a4793cc5.
- App`./dist/app.js?v=1a198981ae54d9d0`;
  CSS`./style.css?v=1fd2857ef1fbaedd`.
- Coastafc536509c5b98ea660eb1a4baa3a608653168e3083dd6673ce7c82ad36c5b6e,
  reefgzip70d7512296dbb20dbb2f6468b558db374dfdbc0232810118b54a1c81c5cec395.
  Полные SPA/wind/resource hashes в receipt. Art/model/geometry прежние.

## Исправлено: starvation boosted continuations

Window yieldSceneTask прежде предпочитал scheduler.yield. Длинная цепь его
boosted continuations задерживала обычные задачи/таймеры и уменьшала RAF даже
при3ms slices. Теперь первым используется уже существующий MessageChannelFIFO;
worker/scheduler/timerfallback прежние. Порядок builder steps, бюджеты,
priority/cancel/ошибки не меняются. Нет новых renderpasses/loadingoverlay или
отключения диагностик. Water/material/DPR/тени/котики/позы/сохранения прежние.
Sculpt-cache version прежняя:sculpt-v2-a496203fa13a037a7a10a927.

35focused scheduler/loading/crowd/warmup/bounds tests и Node22fullbuild PASS.
Реальный Chromium156/productionESM3000x3ms: до9532.8ms max200ms-timer delay,
2timer/102RAF; после6.1ms,46timer/564RAF. Отдельный uncontended эксперимент:
8877.1→5.6ms delay/96→557RAF. В productionESM baseline одновременно выполнялись
Nodechecks; самостоятельный первый опыт не имел этой нагрузки. Это CPU task
fairness attribution, НЕ physicalM2FPS или доказательство устранения всей
пользовательской8.9s паузы. Исходные оба модуля/хеши/runners/rawJSON сохранены.

NativeDPR2:19islands+2returns/fullRAF/realmouseorbitzoom PASS. Phone390×844/coarse/
DPR2 productoverview/8heldtouch crossings/deepdivebelow-200m/2privateSQLite reload
PASS. Balances/inventory/placements/personalwallets сохранены; JS/HTTP/GL ошибок
нет. Все453publicmodules каждого capture совпали с source.
[QA](../qa/2026-11-21/scene-task-fairness/README.md). ОдинGPUjob за раз;
QA толькоprivateWorker/SQLite, никаких живыхplayerworlds.
Первый native readiness deadline180s истёк на softwareGPU; mainattempt1 отменён
до публикации. Progress showed selectedrootready/кадрыидут/backgroundprepещёидёт.
Finalfixture увеличивает только QA globalidle ожидание до600s; source/графика/DPR2/
RAFs/controls/sampling/asserts прежние. Всеfailedattempts/точныеrunners сохранены. PRduplicate44896465884
отменён послеmerge и не является productionproof. Localfullbuild выполнялся
доcommit при тогдаHEADc199; finalmainCI пересобрал/проверил Worker1e0ea47.

## Аппаратный результат ещё нужен

Последний полученный report — **c199697/app0ce8e474**, до этого исправления:
16.21FPS/18.45s, framegap8883.8ms/eventloop8922.5ms, maxlongtask808ms,
GPUmedian10.65/p9514.32ms, lastframe1.147Mtri/496calls, loadingmax1551.5ms.
[Rawreport/hash](../qa/2026-11-21/scene-task-fairness/user-c199-report.json).
Пользователь подтвердил: пауза при загрузке/переходе; безFPSдиагностики ещё не
сравнивал. Предыдущий shaderfix действительно не убрал большуюпаузу.
Новый1e0ea47 проверен локально/CI/live, но физический M2/iPhone FPS/сходство и
устранение всех пауз не обещать до нового report того же cold/transition пути.
CI/Native не художественное одобрение пользователя. Диагностика толькоopt-in,
one-shot и закрываемая; не добавлять паузу мира или quality downgrade.

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
