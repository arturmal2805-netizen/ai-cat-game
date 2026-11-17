# Текущий статус — единственная очередь

Обновлено 2026-11-17. ВСЁ ДНО ОПУБЛИКОВАНО. Сейчас оптимизация, как прямо
потребовал пользователь: сразу ПОСЛЕ дна, без уменьшения моделей/численности,
графики, DPR, теней, сохранений или покупок.

## Подтверждённый релиз всего дна

**06a39cb0b1c92f104996ae315932885655f07a68**, CI44094617737 SUCCESS всех3jobs.
HTTP assets проверены 2026-11-17T13:50:03UTC: ровно одно подключение приложения,
JS f8acc968a8e3eef63f4e6621cbfdacd5064f6cd744e84edec2580c137b83d162,
CSS c14ce8408f8f3aed7a5e7991eca39663fe55377343421ff62e0600ada4c048ef,
wave field/all9probes/reef.gz совпали с точной сборкой.
[Workflow/live receipts](../qa/2026-11-17/whole-floor-publication/live-verification.json).
Игра https://arturmal2805-netizen.github.io/ai-cat-game/?v=06a39cb
Одноразовая диагностика https://arturmal2805-netizen.github.io/ai-cat-game/?v=06a39cb&profile=1

81920 исходных triangles дна /54 static sections /118 готовых stones,
общая sand normal/roughness2m на всём дне. Исходные vertices/attributes,
world transforms и hidden native ray proxy сохранены. Все118 прежних
допустимых saved poses свободны после новых контактов.40targeted + native
normal/remote/overview/phone + privateSQLite reload/ownership PASS.
[Точная сборка/source/PNG](https://github.com/arturmal2805-netizen/ai-cat-game/blob/06a39cb0b1c92f104996ae315932885655f07a68/docs/qa/2026-11-17/whole-floor/manifest.json).
Это техническая публикация, не пользовательское одобрение внешнего вида.

## Активная оптимизация

Рабочая ветка codex/ocean-performance, /workspace/chichi-ocean-performance,
база06a39cb; пока только QA-инструментирование, production fix ещё не выбран.
Полный пользовательский report прочитан ПОСЛЕ release verification:
/workspace/qa/optimization-player-report-extract.json. Report относится к c3f59b2
(JSfe81b47a), AppleM2,1440x812,DPR2,68cats/29poseCats,individual renderer.
30.61FPS, GPU median26.74ms/P9534.08,18.959Mtri/2462draws,540.26MBgeometry,
211rapid refaults/59.54MB, максимальная пауза6383ms; CPU median1.5ms.
Это реальные пользовательские замеры; LinuxSwiftShader не аппаратный MacFPS.

Нужен полный реальный Mall: предыдущие floor/reef art audits не вызывали
mall.ensure(), поэтому нельзя сопоставлять их draw counts с report напрямую.
Первый trace ошибся, вернув из page.evaluate огромный Mall root: Playwright
ERR_STRING_TOO_LONG. Исправлено: await ensure() без возврата root; trace повторяется.
Логи /workspace/qa/ocean-performance-trace.log, результаты trace.json.
Не объявлять cache причиной, пока actual trace не показал какие buffers уходят.
Не включать вслепую colony renderer: раннее снижение draws не доказало AppleFPS.
Не повышать бюджет памяти глобально. Проверять точные pixels/shadows/poses,
полное время кадра/паузы/память, потом отдельный commit/CI/live verification.

## Предыдущий релиз: c44bdc7

**c44bdc7e6a262dbe7cf356e629d7b45239a39330** main/site проверен13:14:02UTC,
CI44088502846 SUCCESS все3jobs. JSd161948eacde20b0d138b996abf78aba933ab162dcd41efbc010eb0ec69b7cb4,
CSSc14ce840… .[Полный workflow/live](../qa/2026-11-17/sand-stones-publication/live-verification.json).
Сайт https://arturmal2805-netizen.github.io/ai-cat-game/?v=c44bdc7
Диагностика https://arturmal2805-netizen.github.io/ai-cat-game/?v=c44bdc7&profile=1
В c44 только пробный участок18stones/sand. Global06 опубликован и проверен выше.

## История этапа c44 (сейчас уже опубликован, см. выше)

Source **c44bdc7e6a262dbe7cf356e629d7b45239a39330**, codex/seabed-materials.
CI https://github.com/arturmal2805-netizen/ai-cat-game/actions/runs/44088502846
сейчас в работе. НЕ объявлять опубликованным до success и HTTP verification.
ОжидаемыйJS d161948eacde20b0d138b996abf78aba933ab162dcd41efbc010eb0ec69b7cb4,
CSS прежнийc14ce840… .40targeted PASS, native normal/phone exit/swim/SQLite
ownership/reload PASS. Дополнительно18/18старых допустимых saved floor poses
проверены: новые stone contacts не запирают кота. Native metrics DEFERRED по
прямому указанию пользователя: оптимизация только ПОСЛЕ песка/дна.

18готовых stones/pebbles,4immutable batches + новый sand detail ТОЛЬКО на
пробном участке x0,z−95 (не всё дно). Прежние source floor vertices и index
triangles сохранены ровно по одному, без overlay; дальний shader не изменён.
Готовые shapes взяты из boulderGeometry, НЕ заново моделировались. Реальные
капсулы используют те же Float32 центры и покрывают все rendered vertices;
bounded initial contact projection нужна только внутри новых rocks.
[Исходники/точные сборки/PNG/3 новых unit tests](https://github.com/arturmal2805-netizen/ai-cat-game/blob/c44bdc7e6a262dbe7cf356e629d7b45239a39330/docs/qa/2026-11-17/sand-stones/manifest.json).
Следом распространить общую систему песка по дну и готовые stones по зонам,
сохранить свободные пути, оригинальные animals/королей/1024reefs/ownership.
Не объявлять всю работу завершённой после одного участка.

## Подтверждённая работающая версия

**c3f59b2a0568870936655bec3e308841a1952c41** — main и сайт.
https://arturmal2805-netizen.github.io/ai-cat-game/?v=c3f59b2
Диагностика только по явной ссылке:
https://arturmal2805-netizen.github.io/ai-cat-game/?v=c3f59b2&profile=1

CI https://github.com/arturmal2805-netizen/ai-cat-game/actions/runs/44082509878
SUCCESS: test (Node22 build/full npm test/dry-run), deploy (сервер/shared saves,
без paid inference), pages. [Workflow](../qa/2026-11-17/seabed-publication/workflow.json).
Фактический HTTP 2026-11-17T12:35:07UTC: ровно один app script,
JS **fe81b47a2ab0e0bcf15b88bb4b457e7674bb69dccceefd6477753f125d5c4cb1**,
CSS **c14ce8408f8f3aed7a5e7991eca39663fe55377343421ff62e0600ada4c048ef**.
Совпали также wave field, все9reflection PNG и новый reef bin.gz.
[Live hashes](../qa/2026-11-17/seabed-publication/live-verification.json).
?v не использовался вместо проверки байтов. Успешный CI не равен художественному
одобрению: Crimson Desert всё ещё цель, новая вода/рифы не одобрены игроком.

Предыдущая стабильная: b8051f931c66608acd15ac41bb6043c7081b7605, общее водное
ядро, CI44063176067. JSdcff015e221567268f2afadf90c80f8f402b30b4faf3bf2bcc9648d9621937d6.
Её полные доказательства/ранние merge939/4ec/12d сохранены в history и decisions.

## Что изменилось в c3f59b2

13рифовых садов:1216НОВЫХ колоний9форм +19456куртин морской травы. Исходные1024
колонии, модели/размеры/численность животных и котов, география, старые коллайдеры,
сохранения/деньги/инвентарь не менялись. База географии12d:200м, ещё НЕ2×вода.
Готовые coral geometry/normal scans, фиксированные instance rows, общие assets.
Новые far indices применяются ТОЛЬКО к новым садам; все старые vertices/indices/
LOD/extras/fish/site bytes проверены golden hashes от b805 и настоящим loader.
Новый coral shader использует scanned polyp normal без второй procedural relief;
старые1024 сохраняют v5. Near→medium6м, новые grasses8м; исходные detail не снижены.
Центральный радиус28м и подход ТРЦ |x|<80,z>70 не застраивались.

Окно FPS: запрос ?profile=1 потребляется, в localStorage не сохраняется. Copy
report v3: FPS/1% low/CPU/GPU/worst frames/startup/12slowest resource durations/
bytes/heap при поддержке. Закрыть отключает collectors/observers/timers/GL hooks,
world освобождает frameProfile. Нормальный reload окно НЕ открывает. Настоящие
copy→close→точные исходные GL method identities→SQLite reload проверены.
Native QA wrapper сам меняет bufferData: проверка toString native была неверной,
заменена на более строгую проверку исходных функций по ссылке. Продукт не виноват.

[Source/build/PNG/native/контроль/ограничения](../qa/2026-11-17/seabed-reef/manifest.json).
Final game = release-game + release-game-wide, ранние candidate/pilot папки НЕ
выдавать за финальные. Exact production bundle отдельно от instrumented QA.
Node22 targeted и полный CI прошли. Native exit/swim/ownership/private SQLite,
1216/19456, wide/remote/phone, unchanged9water PNG подтверждены.
GPU readPixels probe, один кадр/вариант: neither2828.8ms, corals3111.4, grass2288,
both2917.1. Это НЕ статистический parity и НЕ hardware FPS. Старый gl.finish-only
probe непригоден для complete GPU time. RAF software fixture7samples: p504699.8,
p954849.9,max4916.4ms против более ранних19samples p502533.2,p952866.5,max3133.3.
Причина этого RAF slowdown не установлена; не обещать Mac/iPhone производительность.

## Сейчас делать: камни и песок, затем оптимизация

`/workspace/chichi-seabed-materials`, `codex/seabed-materials`, база c3f59b2.
Пользователь просит использовать готовые камни, не моделировать заново. Уже
локально:18готовых boulder forms/4immutable batches, existing scanned stone
colour/normal/roughness, реальная посадка на slope и те же capsule contacts.
Песок — отдельный материал ТОЛЬКО для выделенных настоящих треугольников:
разделение исходного index сохраняет каждую triangle ровно один раз, всеvertices
shared/не меняются, overlay/z-fight/изменения floor нет. Старый дальний shader не
усложняется. Общий clock/samplers/hooks сохраняются. Пока один проверяемый участок,
цель — тот же общий sand material на песчаных участках ВСЕГО дна, detail по
дистанции после проверки. Камни используют уже готовые формы/showcase-geology,
не копируется весь тяжёлый WIP расширения.
3новых unit tests PASS: triangle conservation/far shader, actual rock vertices
inside real contacts, ранее допустимый saved swimmer внутри нового камня
освобождается штатной bounded projection. Первый ошибочный тест ставил root
ниже старого floor — исправлена fixture, не радиус/столкновения. Native scene
preview сейчас в работе, ещё НЕТ публикации/одобрения этого материала.
После визуальной/геометрической проверки закончить сцену, Node22/CI/live,
затем оптимизация по переданному пользователем report. Не начинать общую FPS
переработку до песка/дна: это последнее явное требование.

Исходный авторский sand candidate сохранён в
fbd104987e89abea53c16a4dc35f6bc0462b0bf4:public/mosasaur-bed-optics.js и в
QA/seabed-sand-detail-candidate-deferred.js. В c3 bed optics БАЙТ В БАЙТ b805.
Предположение о причине slowdown именно в песке НЕ подтвердилось: удаление
песка сохраняло ~5сек RAF. Нельзя продавать эту гипотезу как установленный факт.
256² GL normal/roughness authored, НЕ новый PolyHaven scan/не d6. Scanned albedo
CoastSand01 прежний sRGB; API PolyHaven403, отсутствующие карты не получены.

## Сохранность и другие ветки

Релиз `/workspace/chichi-seabed-release`, `codex/seabed-release`: отдельный c3.
Feature WIP `/workspace/chichi-seabed-reef`, `codex/seabed-reef-patch`:
217bc9a→fbd1049→90c4ff0 + final overlays; c3 содержит финальный snapshot.
Исходный `/workspace/ai-cat-game` и все прежние worktrees НЕ сброшены/удалены.
Экспериментальное2×water/512colonies/64benthic rocks остаётся WIP f5f89c7…
в codex/shared-water-core и предыдущих деревьях. Его forecourt8.62Mtri и
выемка378points−190 НЕ приняты; не переносить весь WIP в стабильный мир.
Каноническая память — codex/ocean-recovery-memory (данная запись); shared-water-core
может содержать более старую память — сначала читать этот CURRENT.
Найденные ранее отсутствующие3ветки не восстановлены, не считать код возвращённым.

Архив R9 в archive/project-memory-2026-11-16, commit501757e09370116b942248e392c6461211cb5632,
SHA256aaaa3d9c257258a6dbc98a65271806d8a4805ea3d710d3830ddb1bff690d8af0,
60,499,125B,13worktrees restored/hash-checked. Требуетbasec9a2ac7a…, НЕ full Git
history и НЕ включает последующие c3/materials. Новое восстанавливается из
GitHub source + QA source overlays/HEAD+cached+status, не приписывать его R9.

## Постоянные ориентиры

[Water standard](standards/water.md): slides early prototype; d6fa8056f18d2d738890cc9b477334e4cda81523
historical chain; Crimson Desert NEW goal ALL water; stable full SHA отдельно.
[Terrain](standards/terrain-vegetation.md), [controls](standards/controls-camera.md),
[decisions](decisions.md), [evidence](evidence-and-recovery.md).
