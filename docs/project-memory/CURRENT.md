# Текущий статус

20 ноября2026, Europe/Kyiv. Каноническая память — codex/ocean-recovery-memory.
Её старый app не является текущей игрой. Предыдущая история —
[до публикации](history/CURRENT-before-open-water-publication-2026-11-20.md).

## Опубликовано и фактически проверено

Main **7a0e1f3daf8afd0629d60d7a3cb0aa147b2a02f4**. [Игра](https://arturmal2805-netizen.github.io/ai-cat-game/?v=7a0e1f3).
Workflow **44794849010 SUCCESS**: полный test/deploy/pages, точный Worker release
и shared-save checks. ПлатныеAIвQAневызывались. Actual HTTP HTML/JS/CSS/probe/
reef-cache совпали с ожидаемыми байтами, в HTML одно подключение приложения.
[Полная квитанция](../qa/2026-11-20/warehouse-open-water/live/live-verification.json).

- JS: 1f35c6c1ed6c391fe4560b3962ffd3cb5cbb0e139532623f131601134712400f.
- CSS: 1fd2857ef1fbaedd5e7a34a5082a77ff49bcf7f1c7030d5292502753b86967d0.
- HTML: 8c4b1c4fc7e098bb930c24a3ea80003409462dc3cbd4b562c2085ce738db37c5.
- Probe: afc536509c5b98ea660eb1a4baa3a608653168e3083dd6673ce7c82ad36c5b6e.
- Reef binary 1b90309ff46a4537, SPA atlas и общий wind field прежние.

## Завершённое изменение по последнему фото

Удалены ВСЕ8отмеченных поднятых участков вокруг Warehouse и72камня на вершинах.
384коралла с прежними ID/X/Z сидят на реальномровномдне,60рыб сохранены.
Конусы убраны из physical bed и водной optical depth, без ghost contacts.
Общая лагуна расширена в обе стороны: rz750→1100, исходный берег объединён с
новым без срезания прежней воды. Плавный localZ>=-350 защищает жилой ряд;
контур обходит соседние острова. Площадь воды4.539→5.848км². При X2200 ширина
1.267→1.712км: +158м севернее и+286м южнее. [Измерения](../qa/2026-11-20/warehouse-open-water/measurements.json).
Warehouse, ТРЦ и SPA — прежние исходники/координаты/размеры/фасады/комнаты;
интерьер/магазины/экономика/форматsaveне добавлялись. Shared water/material/clock
прежние; фактический coast probe перебейкан после изменения геометрии.

Старая малая ellipse мешала swimmer/submarine, ручной кнопке, камере и restore.
Новый ocean-water-domain использует реальную общую лагуну, сохраняя прежде
допустимый эллипс для старых позиций. Camera floor следует expansionBedY.
Save cutoff -198м заменён реальным минимальным bedY-5: корректное плавание
у глубокого дна теперь переживает reload. Это поддержка разрешённого движения,
не изменение покупок/балансов.

61focused Node22 checks PASS; полный main build/test PASS. Native desktop:
10views, реальные heldkeys через все8объёмов, dive ниже-200м,2SQLite reload.
Native phone390×844/coarse/DPR2: полный product overview/кадрирование, реальные
heldtouch через8объёмов, dive и2reload. Coin/inventory/placements/profilebalances
прежние. Дополнительно CHICHI_OWNERSHIP_AUDIT phone PASS:paid recovery/re-place
безcharge/deadline, realmodel и2reload/exactlyonecopy. Все451publicmodules каждого finalcapture совпали с source.
Baseline сравнение и точные исходники/bundles/camera/PNG/запуски сохранены в
[QA](../qa/2026-11-20/warehouse-open-water/README.md).

Source **c8a0000a020d236bc6a4f6dd28d6b7e3644cdab1**, PR#10 merged обычным merge.
Ветка codex/warehouse-open-water, worktree /workspace/chichi-v12-island-warehouse.
Tree исходника совпадает с опубликованным main. PR-дубли отменены после обновления/
merge; они не production proof. Промежуточный262 сохранён как superseded:
картинки были корректны, реальное inputиспытание выявило старую camera границу.
Окончательные Native PASS относятся к c8a0000, а не к этому промежуточному bundle.

Художественное одобрение этого выпуска пользователем ещё не получено.
Получен реальный пользовательский M2/DPR2 report именно нового app1f35/7a:
24.64FPS за12.133с, GPUmedian12.8мс, recentgap3.066с и rendererstall3.512с
за reset-session; gapSinceStart8.5с. Загрузкидо22.94с. Прежний f289 report:
13.53FPS/GPU32.41мс/15.33Mtriangles, новый lastframe2.386Mtriangles/380calls.
Камера неизвестна, кадры существенно разные: НЕ заявлять82%ускорениякода.
[Новый отчёт/сравнение](../qa/2026-11-20/warehouse-open-water/user-fps-7a0e1f3/analysis.md).
Сохраняются две проблемы: длительные rendererstalls и медленные coldresources.
Точная причина ещё не установлена; источник meadowgrass содержит15сabortdeadline,
совпадающий с длительностью двухзапросов, но status/trace отчёт не содержит.
Разбор отчёта завершён; код/качество/FPSдиагностика не менялись.

## Сохранённые предыдущие этапы

f28975b: Warehouse ×2,5 по ширине/высоте относительно b995, глубина/центр прежние,
подробный стеклянно-золотой фасад. b995: компактные3SVGvenuebuttons/44px и camera.
407e427: старые reef-terrace-0/1/11 удалены, остальные9скал прежние; декоративная
grey underside опущена12м под прежнее дно. Не возвращать удалённое каменье.
Широкая выемка подходаSPA приостановлена: codex/v12-spa-approach-visibility@18c1e57,
PR#6 CLOSED безmerge; не включать её в другие задачи. Старые исходные worktrees
и архивы сохранены. Диагностика только по запросу, QA толькоprivateWorker/SQLite.

## В работе — исправление зависаний и загрузок (2026-11-20)

Пользователь явно попросил «фиксь». Рабочая ветка codex/ocean-stall-loading-fix,
/workspace/chichi-v12-island-warehouse, база опубликованный7a0e1f3. Пока runtime
не менялся. Сначала baseline CPUprofile и совпадающие native камеры; нельзя
объявлять меньший trianglecounter контролируемым ускорением. Сохранять DPR2,
графику/воду/котиков/тени/сохранения. Публикация исправления уже разрешена.

Профилирование session33029, /workspace/qa/render-stall-baseline.log,
точный QA-only runner /workspace/qa/check-render-stall-profile.cjs. Один GPU.
CHICHI_EXPLORER_AUDIT/V12_AUDIT,4ракурса, frozenclock7,desktopDPR1, приватный
Worker/SQLite, CDP Profiler1000µs. Это диагностика CPU, не M2FPSбенчмарк.

Загрузка Mosa одновременно стартует meadow(4карты),rock(5карт,11.5MB),reef.gz
7.86MB,общиеshowcaseкарты имодели. Grassdeadline15000мс совпадает с отчётом;
не увеличивать/уменьшать таймаут как неподтверждённое исправление. Рассматриваются
точные losslesspack/cache варианты после измерения, не снижение детализации.
