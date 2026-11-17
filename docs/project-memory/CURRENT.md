# Текущий статус — единственная очередь

Обновлено 2026-11-17. ТРЦ полностью убран из очереди по указанию игрока.
Новый архитектурный WIP не включён в эти публикации.

## Подтверждённая публикация воды и острова

**f09c3f3d64be85a0394049e59877711d066db733** — main и реально загруженный сайт.
Workflow44173134773: test/deploy/pages SUCCESS, серверная версия/shared saves
проверены. HTTP подтвердил одно подключение приложения, фактические ресурсы:
JSfbb0341f1dd1f67adab0b0003dc00305e7e549bd6bb1318eaa50a16a45aaad29,
CSSd02068257c7b2b00ecdb80590c8a6bc5003849788f1400e69b6a6d6d91fb4356.
[Полная квитанция](../qa/2026-11-17/ocean-area-publication/live-verification.json).
Игра: https://arturmal2805-netizen.github.io/ai-cat-game/?v=f09c3f3
Диагностика по запросу: https://arturmal2805-netizen.github.io/ai-cat-game/?v=f09c3f3&profile=1

Площадь воды2× относительно e25/12d; не масштабированы животные/дома/покупки.
MOSA_SEA rx332.03915431767985,rz316.22776601683796; сухой берег397.7m сохраняет
постоянную полосу жилья. Добавлен реальный глубокий подход до−190m вне здания,
12рифов подогнаны по всем вершинам; сохранены основание ТРЦ и его архитектура.
Шаг сеток сохранён на метр; shader/textures других водоёмов не менялись.
Все8reflection PNG горок байт-в-байт прежние, океан получил актуальный probe.
Native outer-water swim/physical autonomous dock return/phone ownership/two
privateSQLite reload PASS. Это технический релиз, НЕ одобрение artwork/FPS.
Точные build/PNG/настройки/ограничения сравнений: ocean-area-expansion/manifest.json.
Предыдущий stablee25f6ffd3ab4cab2d3595a337573699bbaa4d3c2 остаётся контролем.

## Следующая отдельная публикация — ручное управление Чичи

Игрок сообщил: W/A/D не работают во всём мире, не только дома.
Причина воспроизведена: app.busy держался на всём awaited занятии/AI и через
canDragCat запрещал start manual, поэтому клавиши отбрасывались.
Исправление public/app.js/world.js из4d8f8f91ae614069e6af971dc095912b20195956:
отдельное canControlChichi сохраняет editable/conflict/build guards; takeover
отменяет занятие/AI fetch, версия не допускает stale UI/effects/cloud commits.
Обычная care/leisure уступает ручному владельцу/физическому возврату.
Экономика/merge/схема saves/коллизии/радиус/модели не менялись.

Node22 build, Wrangler dry-run,82 целевых теста PASS. Настоящие desktopW/S/A/D
при busy demo, без экранного pad; phone held-touchW/S/A/D на44px; pending mockAI
abort без stale commit; World/Island release; privateSQLite reload сохраняет
позицию/монеты/items/placements и снимает manual; повторный start PASS.
Под водой: global button exit/swim/dive/rise/reboard/World camera release PASS.
[Точная QA/сборка](../qa/2026-11-17/manual-input-fix/candidate-build.json).
JS кандидата0ca625bd2ecf9aa7b3b766306bce047b5f27b882be64ab0f3261058b2ea46c88,
CSS прежний; приложение одно. Модели/reef/reflection assets не менялись.
Native SwiftShader поведение не является физическим Mac/phone FPS.

Этот коммит отправляется после подтверждённой воды. Исправление управления
ещё НЕ считать опубликованным до собственного полного CI и HTTP receipt.
Актуальная квитанция и полный release SHA будут записаны в канонической памяти
codex/ocean-recovery-memory. Ожидаемый root /workspace/chichi-global-manual-input/public
после подготовки immutable до завершения проверки.

## Дальше

1. Завершить собственный CI/live фикс управления и выдать ссылку.
2. Оптимизация по реальным аппаратным отчётам; шестисекундные паузы Mac не
   объявлены исправленными. Не снижать fauna/detail/DPR/shadows/качество воды.
3. Не возвращать доработку ТРЦ в очередь без нового запроса.

## Постоянные стандарты и восстановление

Каноническая самая свежая память: codex/ocean-recovery-memory; прочитать её перед
возобновлением старого main. [Индекс](README.md), [water](standards/water.md),
[controls](standards/controls-camera.md), [решения](decisions.md).
Вода горок VERYEARLYprototype; d6fa8056f18d2d738890cc9b477334e4cda81523 —
историческая техническая база; Crimson Desert — цель всей воды. CI не art approval.
Диагностика только ?profile=1, запрос потребляется, закрытие снимает сбор,
обычный reload без окна. Монеты/ownership/inventory/native cats/saves сохранены.

[Предыдущая полная очередь/история публикаций/WIP/архивов](history/CURRENT-before-manual-input-publication-2026-11-17.md).
Старую dirty /workspace/ai-cat-game и worktrees НЕ удалять/не reset.
MallWIPd3ecc7a/codex/mall-cyberpunk-detail архивирован, не включён.
Три старые пропавшие ветки не восстановлены. R9 не полнаяGitистория и не
содержит позднейшие релизы; новые source/QA сохранены в удалённых ветках.
