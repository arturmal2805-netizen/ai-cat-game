# Текущий статус — единственная очередь

Обновлено2026-11-18, Europe/Kiev. Архитектурная/художественная доработка ТРЦ
по-прежнему внеочереди. Новый запрос на ФУНКЦИОНАЛЬНЫЕ входы и проходы разрешён.

## Текущий подтверждённый релиз — проходы и двери

**39148734bd3f4a0265a6ec9aff8ab4b41f36c0b4** опубликован в main и на сайте.
Полный workflow44194305867 test/deploy/pages SUCCESS, release/shared saves verified.
HTTP assets matched; одно подключение приложения. JS5681cfb381526eddc877a80448535fecf0272a52c95da9744ad8edfd43a44be2,
CSSeb9e72f520559ea58aefb78c10bbe4c2990e345caff015428b04e81f6ed141d2.
Квитанция: docs/qa/2026-11-18/manual-paths-publication/live-verification.json.
Игра https://arturmal2805-netizen.github.io/ai-cat-game/?v=3914873
Диагностика https://arturmal2805-netizen.github.io/ai-cat-game/?v=3914873&profile=1
Native City/home/phone/portal PASS. Не утверждать обход каждого верхнего этажа.

## Предыдущий подтверждённый релиз — расширение

**e8ab6ffc24453e1e3ead9acf5190f90acff88730** — предыдущая опубликованная версия.
Workflow44185424944: полныйtest/deploy/pages SUCCESS, server/sharedsaves verified.
HTTP2026-11-17T22:12:26.233244+00:00: одно приложение; actualassets matched.
JSdb3df27ba3a6df07bf24b076f86f1b8e2d74e262468fd79f060e261322321acf,
CSSd02068257c7b2b00ecdb80590c8a6bc5003849788f1400e69b6a6d6d91fb4356.
[Квитанция](../qa/2026-11-18/forecourt-publication/live-verification.json).
Игра: https://arturmal2805-netizen.github.io/ai-cat-game/?v=e8ab6ff
Одноразовая диагностика: https://arturmal2805-netizen.github.io/ai-cat-game/?v=e8ab6ff&profile=1
Публикация подтверждена2026-11-18 00:12:26 Киев, пользователь получил ссылку.

Передняя глубокая площадка ТРЦ удлинена на46m:282 вместо236; xradius192
вместо180, глубина−190. Игрок одобрил плавную форму0bf98d5, но попросил ещё
места. Сохранён её C2shoulder и добавлен forward ellipse через bounded union
(a+b-a*b): не засыпан ни прежний, ни одобренный промежуточный свободный объём.
Внешний берег/другие острова/архитектура/фундамент/модели/сейвы прежние.
Сохранены12reef templates/scale/count/LODs; мешавшиеfrontreefs перемещены в
реальную воду, полныйvertex/shore proof, offline bounded search<=360m.
Общийводныйshader/8slideprobes прежние, actualMOSAprobe509a62f9c210 переснят.

Node22build,25targeted+8cache/water tests PASS, полныйCI PASS.
Native finalswim сz270 →SQLite reload →physical autonomous dock return PASS.
Первый совмещённыйrender+save run поймалpiloting послеreload; его НЕ считать
полнымPASS. Отдельнаякорректнаясессия legitimatelyclaimEditor прошла весь
поведенческий сценарий. Production save/schema/collision tests не ослаблялись.
[Точный source/QA/manifest](https://github.com/arturmal2805-netizen/ai-cat-game/blob/e8ab6ffc24453e1e3ead9acf5190f90acff88730/docs/qa/2026-11-17/forecourt-smoothing/manifest.json).
Финальныйmatchedoverview переснят отдельно:2804×1384, samecamera/FOV40/DPR2/
exposure1. Calls1634→1633, triangles14975258→14973242. Один synchronized
SwiftShader frame24249.2→22587.3ms НЕ Mac/phone FPS/гарантия прироста.
Source/QA этого дополнительного захвата сохранены рядом с новой квитанцией.

## Завершено — дорожки, двери домов/офисов, вход ТРЦ

Последний запрос: после расширения исправить хождение везде, дорожки и входы
вТРЦ/все дома/офисы. На фото CatJobCity нельзя перейти через дорожку.
Ветка codex/manual-paths-doors, /workspace/chichi-manual-paths-doors,
remoteWIPcad6214 (полныйSHA смотретьgit). Базаe8ab6ff, фикс опубликован3914873.

ПричинаCity подтверждена: manualSurface использовалbuilderObstacles с
jobReservations, где самиroad/parking являются placementexclusions.
Нельзя считать ихстенами и нельзя просто удалить настоящие стены.
WIP отделяетactualplacement/scenery blockers иcityGroundClear отстроительных
резервов; реальные здания используют примитивыДОбатчинга.
Новыйmanual-building-navigation.js хранит реальные отдельныеOBBs/полы/ступени,
необщийAABB mergedmesh. Sharednav натипдома, малый ownerboardoverlay наinstance.
Door/camera неразрушают walls/furniture. Radius.571 прежний. RestnativeCat
maxY2.0890767, heightguard2.15; радиус/ростнеменьшены.
ModelrootY учтён отдельно: offices.16, houses0; footOffset.01, безпарения.
Production economy/schema/merge/coin/inventory/catmodels неизменны.

Все6офисныхдверей и7домов проходятunitсbody-sweep, back/sidewalls remain solid.
13models byteexact vertices/indices/UV/normals/colours/groups/worldmatrices кe8.
КвитанциявWIP docs/qa/2026-11-18/manual-paths-doors/manual-paths-exact-models.json.
Финальные native City, bought-home-v3, held-touch phone и desktop Mall portal PASS.
Проверены дорога, реальная дверь офиса/дома и выход, освобождение камеры,
приватный SQLite reload; шлюз ТРЦ проходит последовательные двери123 шага
в каждую сторону, затем настоящая ходьба и World release. Desktop pad скрыт.
Node22 build PASS; unit3, explorer12 и housing/chill/manual36 PASS; предыдущие
незатронутые targeted cases пройдены. Все13 моделей byteexact к e8.
Доказательства и точные QA bundles: docs/qa/2026-11-18/manual-paths-doors/manifest.json.
Кандидат39148734bd3f4a0265a6ec9aff8ab4b41f36c0b4 отправлен в main отдельно от расширения.
Workflow44194305867 и actualHTTP assets теперь подтверждены SUCCESS.
Не утверждать проверку каждого верхнего этажа офисов/каждой точки мира.

## Следующие шаги

1. Проходы завершены и опубликованы. Неослаблятьbodyradius/столкновения и не
   исправлять маршрутытелепортом. Не менятьэкономику/назначения/домовладение.
2. Новый запрос2026-11-18: самостоятельный CHICHI CAT SPA & WELLNESS RESORT перед ТРЦ.
   Полный документ сохранён docs/specifications/underwater-spa-resort-2026-11-18.md;
   standard standards/underwater-spa.md. Отдельный worktree /workspace/chichi-underwater-spa-resort,
   remote codex/underwater-spa-resort, initial081fb13. WIP:14 planned zones, exclusive booking и six-cabin furnished massage module.
   4 Node22 state/full-body geometry tests PASS; docs/qa/2026-11-18/resort-spa/status.md.
   Нет native browser/полного runtime/интеграции/публикации. Не считать полноценным SPA.
   14 plannedzones, actual metre scale, no replacement of old water-island SPA/Mall.
3. Оптимизация поактуальному аппаратному отчёту новойверсии после загрузки,
   samecamera/settings/DPR,30секунд. Старые6secMacpauses не объявленыисправленными.
4. Не возвращать эстетическую/архитектурную доработкуТРЦ безновогозапроса.

## Сохранённые исходники и неизменные стандарты

Каноническая самая свежая память: codex/ocean-recovery-memory. MainCURRENT
можетфиксироватьpredeploy pending; читать эту ветку перед возобновлением.
Предыдущийstablefe9415cff8cdbb9dc20ed7def14fa71f6dbff968: глобальныйentry,
busy-activity/pendingAI takeover, actualdesktop/phoneWASD,SQLite иunderwater
проверены, CI44176344655/actualHTTP successful. Runtimefix4d8f8f9, кандидатc838986.
Вода×2 опубликована отдельноf09c3f3d64be85a0394049e59877711d066db733,
CI44173134773/HTTP21:06:09UTC successful, сохранилисьузлы/покупки/ownership.
История и WIP/архивR9: [предыдущая CURRENT](history/CURRENT-before-confirmed-forecourt-2026-11-18.md).

Immutableexpected publicroots /workspace/chichi-ocean-forecourt-smoothing,
/workspace/chichi-global-manual-input, /workspace/chichi-ocean-area-expansion
не менять дляновыхпубликаций. Старуюdirty /workspace/ai-cat-game/worktrees
не удалять/неreset. MallWIPd3ecc7a/codex/mall-cyberpunk-detail архивирован,
не включён. Трипропавшиеветки не восстановлены. R9 неfullGit и не позднийкод.

[Индекс](README.md), [вода](standards/water.md), [controls](standards/controls-camera.md),
[решения](decisions.md). SlidesVERYEARLYprototype, d6fa8056f18d2d738890cc9b477334e4cda81523
историческаяtechbase; CrimsonDesert — новаяцель. Одобрение localформы не равно
одобрению всейводы илиhardwareFPS. Диагностика только?profile=1, query
потребляется, close снимаетcollectors; reload безокна. ПлатныйAI невызывался.

### SPA continuation — composed model and controller WIP

Worktree /workspace/chichi-underwater-spa-resort, branch codex/underwater-spa-resort.
New resort-spa-model.js:14 zones/three-level atrium,907meshes/60567triangles before
batching, no production attachment. New resort-spa-runtime.js: full appointment
phase flow via injected existing route/ledger/staff callbacks,7targeted Node22tests
PASS. Actual live integration/native art/SQLite checks are NOT complete.
Known next tasks/limitations explicitly in docs/qa/2026-11-18/resort-spa/status.md,
especially recessed pool volumes, sealed openings, mount clearance, all84actions,
existing economy/AI wiring and camera. Do not call WIP a finished SPA.
