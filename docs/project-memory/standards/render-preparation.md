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
