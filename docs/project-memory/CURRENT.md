# Текущий статус — единственная очередь

Обновлено 2026-11-17. Приоритетная публикация ВОДЫ завершена.
Опубликован отдельный этап общего ядра на стабильной географии12d478e.
Экспериментальное расширение/новое дно/дополнительные512кораллов и64камня
оставлены отдельным WIP. Ничего не потеряно и не сброшено.

## Что опубликовано и фактически работает

**b8051f931c66608acd15ac41bb6043c7081b7605**, main и сайт:
https://arturmal2805-netizen.github.io/ai-cat-game/?v=b8051f9
CI https://github.com/arturmal2805-netizen/ai-cat-game/actions/runs/44063176067
завершён success: test, deploy (включая серверный release/shared-save verifier),
pages. [Workflow receipt](../qa/2026-11-17/shared-water-publication/workflow.json).

Проверка реальных HTTP assets 2026-11-17T10:29:48UTC:
JS `dcff015e221567268f2afadf90c80f8f402b30b4faf3bf2bcc9648d9621937d6`,
CSS `c14ce8408f8f3aed7a5e7991eca39663fe55377343421ff62e0600ada4c048ef`.
Скачаны и совпали также основной wind-field1024² и все9reflection PNG.
В HTML ровно одно подключение приложения. Параметр?v не использовался вместо
проверки байтов. [Live receipt](../qa/2026-11-17/shared-water-publication/live-verification.json).

Предыдущая опубликованная версия —12d478e82e8e5a2bd6ef3ec0cbb151ea1e473d1d,
JS507539ea7920b0489284d8572aef4481c8506e1d643a24a8becda9d79b7a8ca5,
CSSтотжеc14ce…, workflow43807080956. История её слияния ниже.

Слияние12d: water source `4ec37371e6b71a03050d4e2a14e8b8fbdc9ae6b3`,
release metadata `939b328304d4807506849a9fbeb866ea9f40703c` поверх4ec.
ТРЦ уже содержал4ec. Конфликт только JS URL edb0a1411d337a38 против507539…;
сохранён настоящий507539… с обоими этапами. CSS не конфликтовал.
939 CI43804714136 success. Нет незавершённого merge/индекса/маркеров.
[Происхождение/точный diff](../qa/2026-11-16/project-memory/merge-12d478e-audit.json).

## Активный следующий этап: небольшой настоящий риф (2026-11-17)

`/workspace/chichi-seabed-reef`, ветка `codex/seabed-reef-patch`, база b8051f9.
Source checkpoint217bc9a13bc8aaa52d5ca92c6bd4fe7e112bfcea сохранён в GitHub.
Кандидат НЕ опубликован и не одобрен. Локальный участок20×16м на существующем
дне x0,z−95:64колонии9форм,1024низкие куртины, песчаный проход; исходные1024
колонии и животные неизменны. Новая256²linear GL-normal/roughness — авторская
сантиметровая детализация, НЕ скан PolyHaven/не технология d6. Scanned CoastSand01
остаётся прежним sRGB albedo, только внутри участка вторая повёрнутая выборка.
Реальная геометрия/коллизии дна/остров/платные адреса не расширялись.
Общее ядро воды b805 сохранено. Референс плотных кораллов — Crimson Desert.
Первый36колоний/512трав QA оказался редким; уплотнён, требуется новый native QA.
PolyHaven API остаётся network403; отсутствующие карты не выдавать за полученные.
Запланировано: identical camera A/B, настоящий native Chichi/private SQLite,
счётчики/ограниченные SwiftShader frame+heap диагностики, Node22 full/CI/live.
Исходный большой WIP океана остаётся отдельно; его проблемы бюджета не решены
этим небольшим участком.

## Приоритет и активные деревья

1. Релиз воды **b8051f931c66608acd15ac41bb6043c7081b7605 завершён**.
   `/workspace/chichi-water-release`, `codex/shared-water-release`, чистый
   опубликованный source. Только общее водное ядро/оптика, настоящие9rebakes,
   39targeted+1070full tests, privateSQLite/native route и game A/B проверены,
   CI44063176067 и actual live JS/CSS/10water images подтверждены.
2. Следующий отдельный этап — реальное дно/низкие экосистемы, затем бюджет и
   физический объём2×water area, после этого детализация ТРЦ. Сохранить всю
   последующую опубликованную воду при переносе WIP-геометрии на новую основу.
3. Телефон/Mac hardware НЕ измерены; SwiftShader не выдавать за их FPS.
   Crimson Desert остаётся целью; текущий релиз не равен пользовательскому
   художественному одобрению. Новые плотные сады/камни/расширение НЕ опубликованы.

WIP расширения: `/workspace/chichi-shared-water`, `codex/shared-water-core`;
каноническая память дублируется в `codex/ocean-recovery-memory`.
Контроль core4dc: `/workspace/chichi-water-core-control` (чистый4dc).
Предыдущие `/workspace/chichi-ocean-expansion` и все исходные деревья сохранены.
`/workspace/ai-cat-game` — оригинальный незакоммиченный WIP, не сбрасывать.

## Общее ядро уже реализовано — не начинать заново

Проверенный runtime checkpoint `4dc98387b9d87ca80ecc4ae7df8b39a79cc25a24`.
`water-field.js` — один prepared1024² Texture для всех поверхностей/подводных
материалов; `water-core.js` — общий sampling2/Fresnel/GGX/medium/macro waves.
Wrappers задают физические размеры/глубину/течение/probe. Один source и startup
prepare, без realtime reflections и перекачки буферов. Реальные9bakes, единый
linear/ACES. Исторический128² d6 generator сохранён как fallback/контроль.
Crimson Desert — целевой вид ВСЕЙ карты; горки только ранний прототип, d6fa805
историческая техническая база. См.[стандарт воды](standards/water.md).

Core4dc прошёл полный CI44046315766: Node22 build, весь npm test, Wrangler
 dry-run success; deploy/pages skipped. [Workflow](../qa/2026-11-17/shared-water-core/ci-4dc9838.json).
29targeted, native visibility .785 desktop/phone против opaque .035.
18биомов×2версии прошли; primary1024² field один во всех найденных материалах.
68горок×2версии, normal/phone/flow/outlet/basin; кандидат ещё grazing/rider,
204static-pixel comparison (normal/grazing/phone) —0различий.
[Полные отчёты/bundles/ограничения](../qa/2026-11-17/shared-water-core/).
Whole-attraction baseline grazing PNG для всех68 пока отсутствует (есть basin
 grazing close-up); исправлен будущий capture. Не приписывать старому прогону
 новые кадры. Эти проверки относятся к4dc, не автоматически к новому релизу.

Одинаковые local eye/direction/up и light/shadow envelope теперь проверены
для7океанических видов; максимум погрешности направления~5.7e-14.
Первый QA запуск ошибся обращением к module-local waterPoint; ошибка сохранена,
явный window getter исправлен, отдельный v2 прошёл. [Кадры/asset bytes](../qa/2026-11-17/shared-water-core/stable-fixed-camera/summary.json).
Вид ещё далёк от Crimson Desert; CI не является пользовательским одобрением.

## Почему экспериментальное дно не входит в ближайший релиз

Выемка перед ТРЦ выравнивает все378проверенных точек до-190м, убирая relief.
Песок без normal/roughness, редкие островки растений и плоские скалы отклонены.
Не исправлять это только цветом; будущий relief вырезать НИЖЕ прежнего
безопасного потолка, сохранив весь проход корпуса/physics и ownership.
[Диагноз](../qa/2026-11-17/shared-water-core/forecourt-floor-diagnosis.json).

У4dc forecourt15.74M против стабильных2.78M треугольников — неприемлемый бюджет.
Новая WIP-правка камней: real garden LOD anchors, исходные Float32 instance rows,
все geometry/index buffers и сортировочные сферы сохранены. Дальний общий
batch3 сохранён, shadow casters не отключались. 6CPU tests passed;
9native colour/shadow tests at equal LOD —0различий (включая DPR2).
Первый split изменил1пиксель из-за sorting sphere — исправлен, порог не ослаблен.
V2 давал+90draws вдалеке; v3 оставляет прежние far draws/triangles.
В полной сцене forecourt15.84M→8.62M,300→390draws; underwater/phone unchanged.
Это улучшение WIP, но НЕ принятие бюджета/качества и НЕ доказательство FPS.
[Точные доказательства](../qa/2026-11-17/shared-water-core/benthic-rock-spatial-ocean-v3/).

## Независимое восстановление

R9: [скачать60 499 125байт](https://raw.githubusercontent.com/arturmal2805-netizen/ai-cat-game/501757e09370116b942248e392c6461211cb5632/backups/chichi-shared-water-wip-2026-11-17-r9.tar.gz),
SHA256 `aaaa3d9c257258a6dbc98a65271806d8a4805ea3d710d3830ddb1bff690d8af0`.
Архив13деревьев включает4dc и WIP camera harness; все13восстановлены в новом
clone: точные HEAD/cached patches/status/bytes. Удалённые60MB повторно скачаны
и hash совпал. Базаc9a2ac7 обязательна, это не полная Git-история.
Последующие code/QA/чистые контрольные деревья сохранены в Git отдельно, не
выдавать R9 за снимок ещё не существовавшего нового release.
[Restore/remote receipt](../qa/2026-11-17/shared-water-core/backup-r9-remote-verification.json).

Канонический индекс: https://github.com/arturmal2805-netizen/ai-cat-game/blob/codex/ocean-recovery-memory/docs/project-memory/README.md


## Релиз b8051f9: последняя проверенная подготовка

[Manifest/точные QA bundles/PNG/source overlays](https://github.com/arturmal2805-netizen/ai-cat-game/blob/b8051f931c66608acd15ac41bb6043c7081b7605/docs/qa/2026-11-17/shared-water-release/manifest.json).
JS SHA256 `dcff015e221567268f2afadf90c80f8f402b30b4faf3bf2bcc9648d9621937d6`,
CSS `c14ce8408f8f3aed7a5e7991eca39663fe55377343421ff62e0600ada4c048ef`.
В HTML одно приложение; размеры карты/1024коралла/модели/контроллеры/сохранения
взяты из12d. Глобальная вода — общий core/field из4dc, собственная настоящая
Mosa reflection rebaked01333a81c41d, восемь showcase PNG совпали побайтно.
68-ride evidence переиспользовано только после проверки тех же code/image
inputs, новый океан проверен заново. Каждая локация использует один1024² field.

Реальный полный app benchmark (последовательно, без CPU/GPU параллельной
нагрузки): p50 2633.3→2633.2ms, p95 3033.2→2916.5, max3199.8→3316.6;
интервалов>100ms53→59, endheap871.2→912.1MB, peakrows951.1→948.3MB.
Это SwiftShader приDPR2, НЕ скорость Mac/телефона и НЕ утверждение ускорения.
Draw counts те же; +24576surface triangles, без новых животных/декораций.
Пользовательское художественное одобрение не получено; Crimson Desert — цель.

Native route desktop adapter сначала ошибочно вызывалtap безhasTouch;
исправлен наclick. Полныйv2 прошёл все физические этапы, затем final job fixture
ошибочно менял app-only object без нормального commit/world sync. V3 Mall-route
повторно прошёл этажи/выход/возврат и нормальную работу до/послеSQLite reload
через реальный commit. Это QA-исправления, production controllers не менялись.
Не выдавать промежуточныйfailed лог за окончательный результат; все сохранены.

В main теперь есть AGENTS/index со ссылкой на эту каноническую memory-ветку.
CI и live verification завершены, полный SHA/workflow записаны выше.
Продолжать WIP дна/расширения отдельно. Исходный f5f89c7 сохранён.
