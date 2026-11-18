# Текущий статус — единственная очередь

Обновлено 2026-11-17. ТРЦ полностью убран из очереди по указанию игрока.
Новый архитектурный WIP не включён в эти публикации.

## Текущий подтверждённый релиз

**fe9415cff8cdbb9dc20ed7def14fa71f6dbff968** — main и фактически работающий сайт.
[Workflow44176344655](https://github.com/arturmal2805-netizen/ai-cat-game/actions/runs/44176344655):
полный test/deploy/pages SUCCESS, серверная версия/shared saves подтверждены.
HTTP2026-11-17T21:18:40.630742+00:00: ровно одно приложение; реальные файлы совпали:
JS0ca625bd2ecf9aa7b3b766306bce047b5f27b882be64ab0f3261058b2ea46c88,
CSSd02068257c7b2b00ecdb80590c8a6bc5003849788f1400e69b6a6d6d91fb4356.
Wave field,9reflection PNG и reef.gz тоже совпали с immutable build.
[Квитанция CI и HTTP](../qa/2026-11-17/manual-input-publication/live-verification.json).
Игра: https://arturmal2805-netizen.github.io/ai-cat-game/?v=fe9415c
Одноразовая диагностика: https://arturmal2805-netizen.github.io/ai-cat-game/?v=fe9415c&profile=1
Кнопка «Управлять Чичи», затем W/S/A/D на ПК; на телефоне компактный44px pad.
Takeover занятой Чичи/pendingAI, отсутствие stale ответов, обычная жизнь после
World/Island, приватный SQLite reload, underwater exit/reboard проверены.
Эта публикация отдельная ПОСЛЕ водной f09c3f3 ниже. Модели/вода/сохранения
не потеряны; ТРЦ-архитектура не менялась. ПлатныйИИ не вызывался.

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

## Опубликованное исправление ручного управления Чичи

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
[Точная QA/сборка](https://github.com/arturmal2805-netizen/ai-cat-game/blob/fe9415cff8cdbb9dc20ed7def14fa71f6dbff968/docs/qa/2026-11-17/manual-input-fix/candidate-build.json).
JS кандидата0ca625bd2ecf9aa7b3b766306bce047b5f27b882be64ab0f3261058b2ea46c88,
CSS прежний; приложение одно. Модели/reef/reflection assets не менялись.
Native SwiftShader поведение не является физическим Mac/phone FPS.

Код исправления опубликован отдельным релизом fe9415cff8cdbb9dc20ed7def14fa71f6dbff968
после воды. CI44176344655 и actualHTTP assets SUCCESS. Ожидаемый root
/workspace/chichi-global-manual-input/public сохранён immutable, вода
/workspace/chichi-ocean-area-expansion/public тоже сохранена. Не изменять
эти проверенные assets для следующего этапа: использовать отдельную ветку.

## Дальше

1. Новый запрос игрока: немного расширить и разгладить участок глубокого дна
   ВПЕРЕДИ ТРЦ. Уточнено ответом: не вся водная чаша. Активно ниже.
2. Затем оптимизация по актуальному аппаратному отчёту новой версии после
   загрузки; одинаковые ракурс/настройки/DPR,30секунд.
2. Шестисекундные паузы Mac не
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

## Проверки и сохранённые исходники

Water f09c3f3: CI44173134773, HTTP21:06:09.199022UTC, все13actualassets PASS.
Input fe9415c: CI44176344655, HTTP receipt выше. Полный CI прошёл для обоих.
Исходники/QA исходного inputfix4d8f8f9, кандидатаc838986 и финальногоfe9415c
есть в codex/global-manual-input/main. Water source/QA в codex/ocean-area-expansion.
Локальные native результаты/логи: /workspace/qa/global-manual-desktop-final,
global-manual-touch-sqlite-v2, global-manual-underwater-final. Точный build
и82targeted tests в main docs/qa/2026-11-17/manual-input-fix/candidate-build.json.
Не считать старый GLOBALV7 rich-save доказательством: null-submarine fixture
раньше давал default490; новый private seed и actual loaded pose проверены.
Не выдавать software GPU timings за Mac/телефонFPS или art approval воды.

Каноническая память codex/ocean-recovery-memory обновлена ПОСЛЕ подтверждений.
CURRENT в исходном main-fe9415c фиксировал water live/inputpending на момент
отправки; более новая каноническая запись здесь подтверждает оба релиза.
Не дублировать публикацию/пройденные проверки без новых изменений/проблем.

## Активно — передний участок дна, база fe9415c

/workspace/chichi-ocean-forecourt-smoothing, codex/ocean-forecourt-smoothing,
WIP0bf98d5 отправлен удалённо. Изменения: передний глубокий край+18m, бока+12m,
MOSA_FORECOURT{z:170,rx:192,rz:84,floor:-190,shoulder:36}. C2quintic shoulder
заменяет24m cubic. Фундамент/архитектура/наружный берег/острова/водныйshader
не менялись. Проверена плотная сетка: нигде не поднято старое дно, не засыпаны
прежние swimming poses;3 новых unit PASS и30 другихtargeted PASS. Однаcache
проверка ожидаемо нашла старыйbin после измененияreef sites; Node22 fullbuild
уже регенерировал его, повтор этойпроверки /workspace/qa/forecourt-cache-release.log.
Не ослаблять сравнение реальныхF64sites/opticalfloor и историческихrock/coralbuffers.
Сохранены все12reef templates/counts/sizes/LODs; только4 мешавших края
отодвинуты. Offline fitter сначала сохраняет уже подходящие ТОЧНЫЕ offsets,
потом полныйvertex-check, поиск<=180m внутри прежнейграницы. Первая120m попытка
не нашла colony2; исправлен только offline search bound, без удаления/сжатиярифов.
Actual oceanprobe9b818f2f91cd переснят;8slide PNG иsharedwater неизменны.
Baseline native overview/underwater/phone PASS, точныеPNG/source/QA bundle
в WIP docs/qa/2026-11-17/forecourt-smoothing/before.
Native candidate идёт /workspace/qa/forecourt-after.log/.exit, session84961.
Он дополнительно проверяет реальную кнопку/плавание в новом глубоком front,
SQLite reload и физическое автономное возвращение.
FullNode22build exit0 /workspace/qa/forecourt-build.log/.exit. Модели не менялись,
только applicationHTML/reef manifest regenerated; покаdirty дофинальногоQA.
Нужны визуальный reviewafter, результаты/cachetests, exactQAmanifest, CI+live.
НЕ опубликовано, stablefe9415c не менять/не называть новым artwork approval.
