# Подготовка renderer и неизменяемые ресурсы

2026-11-20. Перед оптимизацией привязать пользовательский report к actual app
hash. Разные камеры/counters не являются контролируемым ускорением. CPU trace
с одинаковыми ракурсами нужен для причины; SwiftShader не доказывает M2 FPS.
Статические missing bounding spheres можно готовить до reveal кооперативно:
только точные native centre/radius/getters, без partial bounds, с mutation,
morph/custom/cancellation guards. Не менять позиции/индексы/material/DPR/тени.
Уже готовые bounds не пересчитывать. Общий pipeline warmup обязателен для всей
карты; выполнять native 19 islands+returns и phone controls/reload.

Force-cache допустим только same-origin GET с content-addressed public art/model
URL и без явного cache option. API/code/mutable URLs/cross-origin/POST обычные.
AbortSignal сохранять. Проверять в реальном браузере expired cache/new app URL,
original bytes, API/explicit reload/abort. Первая загрузка остаётся сетевой.
Не маскировать проблему изменением deadline. Если меняется producerdependency
водных probe, реально rebake и проверить bytes/сохранить прежние PNG.

Результаты baseline/intermediate/final, точные source/module hashes/QA bundle,
PNG/CDP traces/launch conditions и неуспешные attempts хранить отдельно.
Main CI, actual live bytes/одно app подключение и визуальное одобрение — разные
факты. Не обещать FPS по software traces и не выдавать CI за одобрение.

## 2026-11-21 — async roots и анимированные шейдеры

Завершённая async сборка court/building/Mosasaur ещё не готова к первому draw:
await warmup до помещения в опубликованный cache/scene. Сохранить foreground
priority, cancellation и cleanup при отказе; старый объект/покупка не теряются.
Исключение skinned/rig из static sphere scan НЕ должно исключать подготовку
их native colour/depth shader. Skeleton, rig-owned bounds/pose и callbacks
customDepthMaterial прежние. Не отключать shader errors для улучшения метрик.
Проверять exact-source native first-use GLtrace: какие roots отражаются внутри
реального draw, а какие вне кадра. Общая программа/floatbounds теста недостаточна.
Суммарное время getProgramInfoLog не объясняет больший RAFgap без trace;
не выдавать частичное исправление за устранение всей неподтверждённой паузы.

## 2026-11-21 — справедливость task turns, не только длина slice

3–4ms slices сами по себе не гарантируют отзывчивость: boosted scheduler.yield
continuation chain вChromium блокировала обычный200ms timer на8.9–9.5s при
отсутствии одиночного8s longtask. ExistingWindowMessageChannelFIFO в том же
productionESM workload держитdelayоколо6ms и регулярныйnativeRAF. ПоэтомуWindow
scene tasks выбираютMessageChannel раньшеscheduler.yield; workerfallback остаётся.
Не возвращать boost-first по одному названию «modern scheduler» без реальных
RAF/timer проверок под длинной модельной подготовкой. Это не MacFPSbenchmark.

При nativecorrectness QA различать низкийdetail/selectedrootготов и global
backgroundwarmupidle. SoftwareGPU теперь получает обычные кадры междуslices и
конкурирует заCPU с построением, поэтому старый180s globalidle testdeadline
может истечь при продолжающейся живой сцене. Сохранять failedattempt/progress;
QA-onlyreadinesswait600s допускается с явной фиксацией, без измененияDPR2/
graphics/fullnativeRAF/input/asserts. Не называть такой timeout gamecrash и не
выдавать продление за ускорение. Обязательны конечный PASS/actualsource и новый
physicalMacreport; не пропускать gates и не скрывать незавершённую сцену.

## 2026-11-21 — pinned floor и bounded returning-camera cache

При active/shared-owner working set выше soft192MiB fixed192+64MiBtarget
недостижим. Учитывать unique BufferAttribute bytes всего nonretireable owner
component: pressure target=max(softbudget,pinnedfloor)+ПРЕЖНИЙ idle allowance
<=64MiB и <=budget/3. Это не повышениеконстант/новый owning cache. Cold-first pass
по-прежнему стремится к originalbudget, abandoned data reclaim сохраняется,
250ms/3frames/learned2s/cat10s и общий2msretirementtimer прежние. Floor/sort/filter
bookkeeping вне cleanup timer; allsharedowners safe и currentdrawing wins.
Нужны old-policy failing regression, actualuploadbytes/sameintrinsicpeak, exact
GPU pixels/retire-return/livecat slots, all19+returns и phone2reloads. Resource
proof не hardwareFPS; capped event subset counts нельзя сравнивать междуролями.
См. [измеренный релиз и rawQA](../../qa/2026-11-21/active-geometry-refaults/README.md).
