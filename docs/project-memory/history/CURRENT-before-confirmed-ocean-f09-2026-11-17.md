# Текущий статус — единственная очередь

Обновлено 2026-11-17. Порядок игрока выполнен: всё дно → публикация06a39cb →
первый performancefix1f96a1b → отдельный Mallfix0b38098. Все опубликованы.
Технический релиз не равен художественному одобрению или аппаратным60FPS.

## Текущий подтверждённый релиз

**e25f6ffd3ab4cab2d3595a337573699bbaa4d3c2** — main и фактически работающий сайт.
[Workflow 44134464517](https://github.com/arturmal2805-netizen/ai-cat-game/actions/runs/44134464517): test/deploy/pages SUCCESS,
включая проверку серверной версии и shared saves. Платный ИИ не вызывался.
HTTP-проверка 2026-11-17T17:25:55.519754+00:00: одно подключение приложения, настоящие файлы:
JS **89f628b72c238b0390dc38ef142b98511d6efc2eb390d0980554f40839185856**,
CSS **d02068257c7b2b00ecdb80590c8a6bc5003849788f1400e69b6a6d6d91fb4356**.
Все 9 reflection PNG, общий wave field и reef.gz совпали с неизменной сборкой.
[Квитанции workflow и HTTP](../qa/2026-11-17/global-control-publication/live-verification.json).
Игра: https://arturmal2805-netizen.github.io/ai-cat-game/?v=e25f6ff
Одноразовая диагностика: https://arturmal2805-netizen.github.io/ai-cat-game/?v=e25f6ff&profile=1

Видимая кнопка «Управлять Чичи» включает третье лицо на обычных островах,
мостах, в воде и ТРЦ. Одна настоящая модель; WASD/мышь на ПК, компактные
44px кнопки на телефоне. «Остров» и «Весь мир» освобождают контроллер.
Фактическая поза сохраняется; после reload обычная жизнь, без второго владельца.
Проверены настоящие клавиши, удержание touch, вход/выход из воды, повторная
посадка, включение ходьбы в ТРЦ, camera release, приватные SQLite reload.
Отдельный ownership-аудит восстановил Mega Loops в сумку, бесплатно поставил,
сохранил ровно одну оплаченную копию после двух перезагрузок.

Точный словарь Float32 RGB для 152 запечённых геометрий ТРЦ заменяет
41,432,184 байта цветов на 6,905,364 байта индексов и 65,536 байт таблицы:
экономия **34,461,284 байта (~32.9 МиБ)** GPU. Позиции, нормали, UV, индексы,
все 32 бита цветов, коллизии и picking сохранены. Полная игра: interior,
overview, phone DPR2 — 0 изменённых RGBA, 0 ошибок shader/page/HTTP.
Node22 build и 50 целевых тестов, финальные 30 после cleanup и 17 release/world
guards прошли. SwiftShader-сравнение не является измерением FPS телефона/Mac.
[Точный код, QA-сборки, PNG и хеши](https://github.com/arturmal2805-netizen/ai-cat-game/blob/e25f6ffd3ab4cab2d3595a337573699bbaa4d3c2/docs/qa/2026-11-17/cache-and-global-control/manifest.json).

Третий аппаратный отчёт уже относится к 0b38098/JSdbe: 300 кадров за14.633s,
20.43FPS, GPU median18.36ms, пауза5900.1ms и153rapid refaults58.7MB.
Camera-cycle trace воспроизвёл повторные загрузки Mall, но шестисекундная
пауза не объяснена recorded JS/GPU tasks. НЕ объявлять её устранённой.
Не повышать глобальный GPU budget и не снижать fauna/detail/DPR/shadows.
Предыдущий stable 0b38098a32e338a89b88efd784b184e9ac72c3f3 и его HTTP/CI
остаются контролем; этот релиз не художественное одобрение воды.

## Что именно оптимизировано

В1f96a1b6ce17435bc6aa845db1ba6e52d88a56cd исправлено отсечение54секций дна:
sharedattributes раньше раздували bounds каждой секции до всего floor. Native
sortsphere/всеvertices/index/shader/physicalrayproxy сохранены. Indexed metric
bounds проверяются после FINALcamera; castingfloor остаётсяnative. Native
underwater/overview/phoneDPR2:54→6/32/3секции,0changedRGBA.31targeted+12release
PASS, реальныйoceanrebakePNGнеизменён. Полный CI44101398484 иHTTP14:33:40UTC
успешны. [Receipt1f](../qa/2026-11-17/floor-culling-publication/live-verification.json).

В0b38098 исправлен Mall room-light/cutaway: они подключались ПОСЛЕbatching,
поэтому guard правильно выключал exactstaticranges после сменыhookidentity.
Теперь ТОЛЬКО два auditedposition-preservinghooks сохраняютdispatch. Roomlight
сохраняет только известный staticwrapper; старый reflectionfinish заменяется
как прежде, sharedmaterials идемпотентны. Unknown wind/refraction/geometry/key
changes по-прежнему nativefallback. Исходные vertices/index/triangleorder,
доступные geometry/picking, shadowкамеры, все модели/анимации/DPR сохранены.
8staticunit+26release PASS, actual fullgame/65residents/DPR2interior/overview/
phone:0shader/page/HTTPerrors,0changedRGBA. Triangle submissions11.2→5.46M,
13.38→10.02M,10.73→3.94M; GPUgeometrybuffers неизменны вкаждойA/Bпаре.
Обаbakers реально пересняты,9reflectionPNG неизменны; static-submissions
producer добавлен вобаспска. V1отклонён duplicateuMallProbe:0differenceу двух
битыхкартинокНЕуспех. Exactsource/QA/productionbundle/PNG:
https://github.com/arturmal2805-netizen/ai-cat-game/blob/0b38098a32e338a89b88efd784b184e9ac72c3f3/docs/qa/2026-11-17/mall-static-submit/manifest.json

Дополнительные selectedMcD/Vuittoncutaway иphoneinside прошли с полностью
nativeMeshDepthMaterial baseline. CutawayOpentrue/false подтверждены, всеpixels
совпали,0errors, privateSQLitecoins/inventory/placements точноравны послеreload.
Один phoneinsideGPUprobe был медленнее12.3%;3повторныепары сразнымпорядком
дали4290.4→4084.7,4524.6→4208,4097.4→4063.1ms. Slowdown не повторился.
SingleSwiftShaderpairs/3samples НЕ Mac/iPhoneFPS и неуниверсальнаягарантия.
Точный extraQA/source/PNG/SQLiteproof, productionнеизменён:
https://github.com/arturmal2805-netizen/ai-cat-game/blob/9176f420429b4d928184212c7ec04c725d0044e5/docs/qa/2026-11-17/mall-static-extra/manifest.json

Immutable runtime/assets: /workspace/chichi-mall-submit-performance,
codex/mall-submit-performance0b. Дополнительный QAвотдельной
/workspace/chichi-mall-submit-verification, codex/mall-submit-verification9176.
Source/qaсохраненыудалённо; не считать памятьчата/локальныефайлыединственнойкопией.

## Выполненные этапы и неизменные контракты

- 06a39cb0b1c92f104996ae315932885655f07a68: shared sand normal/roughness2m по
  всему исходному дну81920tri/54секции,118готовых stones/4batches. Все native
  vertices/normals/UV/colours/worldtransforms сохранены, originalbed hidden
  native rayproxy, visualsections неraycast. Первые18stonesизc44точны;
  новые небезопасные placements исключены, старые коллайдеры/радиус не ослаблены.
  118/118прежних savedposes свободны.40targeted + actual normal/remote/overview/
  phone,exit/swim/privateSQLiteownership/reload PASS. CI44094617737 и HTTP13:50:03.
  [Receipt](../qa/2026-11-17/whole-floor-publication/live-verification.json).
- c44bdc7e6a262dbe7cf356e629d7b45239a39330: прежний малый участок18stones,
  CI44088502846/HTTP13:14:02. Уже замещён wholefloor, повторять не нужно.
- c3f59b2a0568870936655bec3e308841a1952c41:13рифовых садов,1216НОВЫХ колоний
  9форм и19456куртин. Исходные1024corals/LOD/extras/fish byte-exact кb805;
  новые farLOD только у новых садов. Открытые centre radius28 и подходMall
  |x|<80,z>70 сохранены. CI44082509878/HTTP12:35:07.
- b8051f931c66608acd15ac41bb6043c7081b7605: единое ядро воды/общий1024²field,
  физические профили разных водоёмов, actual9reflectionprobes вlinear/ACES.
  CI44063176067. География released12d478e, НЕ неопубликованное2×расширение.

Монеты/инвентарь/ownership/catmodels/faunacounts/sizes/animations/DPR/shadow
quality/saveIDs сохранены. Не менять JOB_CAPACITY/merge/экономику ради FPS.
Node22 соответствует CI; не включать случайные Node24model artifacts.

## Диагностика FPS

`?profile=1` открывает одноразовое окно, queryпотребляется черезhistory,
вlocalStorageне сохраняется. Кнопки копирования и закрытия. Закрытие убирает
collectors/observers/timers/GLhooks иframeProfile; обычныйreloadбез окна.
Reportv3: GPU/CPU/FPS/1%low/паузы/loading/heap/bytes. Actualcopy→close→точные
исходныеfunctionidentities→SQLite reload подтвержденыc3. QAсам оборачивает
bufferData: не проверятьnativeчерезtoString, сравниватьисходные ссылки.
Для физического сравнения после публикации дать загрузке закончиться и
собрать30секунд в одинаковом виде/DPR, не сравнивать1.35sec/26frames с300frames.
APIplan17.4sec и resource8–10sec — observedtimings, не доказанный сбойAPI.

## Активная работа — остров и вода, ТРЦ отложен

Последнее уточнение игрока2026-11-17: следующая публикация ТОЛЬКО остров
мозазавра и вода. Доработка ТРЦ полностью УБРАНА из очереди последующим сообщением игрока.
WIP только архивировать; не возобновлять без нового запроса.
GalleryWIP сохранён удалённо d3ecc7a в codex/mall-cyberpunk-detail, native
candidate не проверен и не опубликован. 120/120 физических маршрутов PASS,
+8.1MB construction storage, не аппаратныйFPS и не принятый artwork.

Активная ветка codex/ocean-area-expansion, /workspace/chichi-ocean-area-expansion,
база e25f6ff. Из старого f5f89c взяты ТОЛЬКО расширение площади воды2×,
неизменный физический размер headlands/reef widths, защита released береговых
покупок. Не перенесены тяжёлые 8.62Mtri forecourt/64 benthic rocks/старыеcorals.
Обнаружено, что старый WIP пересекал бесконечную полосу будущего жилья:
outer-radius416.3 не помещается в445m gap с43m housing. Теперь реальный берег
397.7m, water rx332.039/rz316.228 даёт ровно2×water area и сухой внешний край;
используются действительные centres/radii/shore margins. Покупки не двигаются.
Сетка дна/поверхности масштабируется поsqrt2 для прежней детализации на метр,
общие текстуры/шейдер/профили остальных водоёмов остаются прежними.
Новый mosasaur-forecourt.js задаёт глубокую bay до−190 ВНЕ здания, сохраняет
его основание; это вода/дно, не изменение геометрии ТРЦ. Офлайн fitting всех
реальных вершин12reefs очищает весь столб до−190, не только верхние ярусы.
Код отправлен в main c8788238e67207b9f4f30df45aaeb57900bbbe2e.
CI44145586059 (#186) отменён после уточнения координат двух grass fixtures.
Новая water source 0c636b86b40af399fcc50a43fb5dfccffc7871a1, CI44147306627
(#187) завершился FAILURE на npm test; deploy/pages SKIPPED. НЕ опубликован.
Доставка logs с results-receiver.actions.githubusercontent.com запрещена
окружением; annotations дают только exit1. Локальный полный прогон запущен:
/workspace/qa/ocean-area-full-local.log и .exit, session27088, Node22.
Нужно найти реальную ошибку, исправить, проверить полный результат и CI.
Native/production bytes fbb0341f... не изменены test-only followup.
Старый отменённый CI: https://github.com/arturmal2805-netizen/ai-cat-game/actions/runs/44145586059
Native day/night/phone/outer-control/return/ownership PASS; НЕ считать live
до завершения CI и /workspace/qa/ocean-area-publication/live-verification.json.
Ожидаемые JSfbb0341f1dd1f67adab0b0003dc00305e7e549bd6bb1318eaa50a16a45aaad29,
CSSd02068257c7b2b00ecdb80590c8a6bc5003849788f1400e69b6a6d6d91fb4356.
Verifier для0c /tmp/verify-ocean-area-release-0c.py (уже остановился на FAILURE), старый /tmp/verify-ocean-area-release.py сравнивает неизменный public в
/workspace/chichi-ocean-area-expansion. Не править эти assets во время CI.
Исходники/QA: https://github.com/arturmal2805-netizen/ai-cat-game/blob/c8788238e67207b9f4f30df45aaeb57900bbbe2e/docs/qa/2026-11-17/ocean-area-expansion/manifest.json
После публикации: СРАЗУ global third-person WASD bug. ТРЦ УДАЛЁН из очереди.
Требуются Node22 build, актуальные probes/reef asset, native day/night/phone,
субмарина/ходьба/возврат, privateSQLiteownership/reload, CI и HTTP hashes.

## WIP ввода — следующий после воды, не опубликован

/workspace/chichi-global-manual-input, codex/global-manual-input,
4d8f8f9: canControlChichi отделён от app.busy/drag permission, takeover
отменяет обычное занятие; версия запроса+AbortController не позволяют старому
AI перезаписать ручной режим. Routine care не конкурирует с владельцем.
NativeV4 (private fixture, no paidAI): реальный demo click→takeover→все
W/S/A/D двигают настоящую Чичи→World release PASS. Pending-response mock
проверяется в /workspace/qa/global-manual-pending-after.log, session12590.
Ещё нужны phone touch/SQLite/build/tests/CI/live. В main не отправлять до
успешной публикации воды и завершения своих проверок.

В старом GLOBAL_MANUAL QA нашли null submarine→loadGame fallback default490
coins/-6,-3. Исправлен ТОЛЬКО новый QA: delete отсутствующее поле, проверять
реальную загруженную стартовую позу0,-7. Не считать старыйV7 проверкой rich
seed. Water/ownership/Mall-palette не используют GLOBAL флаг и не затронуты.
Немонотонный виртуальный QA clock искажал 2/3/4 удержание; V4 использует один
монотонный clock и доказывает все четыре клавиши. Коллизии/радиусы не ослаблены.

## Что делать дальше

1. Завершить текущую публикацию ТОЛЬКО острова и воды: полный CI и HTTP
   сверка фактически загруженных JS/CSS/reef/probes. Native water/outer-control,
   физический return и ownership/SQLite прошли. Точный QA в
   docs/qa/2026-11-17/ocean-area-expansion/manifest.json. 33+5+11+14+8 tests PASS.
2. СРАЗУ ПОСЛЕ водной публикации исправить ручное управление Чичи ОТ ТРЕТЬЕГО
   ЛИЦА ПО ВСЕМУ МИРУ. Игрок уточнил: W, A и D не двигают Чичи; это НЕ только
   дом. Не считать прежний короткий A-key fixture достаточной проверкой.
   Проверить активацию/владельца, весь WASD, focus/layout/input, реальные коллизии,
   занятость AI и canControl/canDragCat, freeze/dialog/game-loop и обычный live
   сценарий. Не отключать коллизии/не уменьшать радиус/не телепортировать героя.
3. Продолжать оптимизацию по аппаратным отчётам. Не объявлять исправленными
   все паузы или гарантировать60FPS по SwiftShader. Окно диагностики только
   по запросу. Художественное качество воды не равно successful workflow.

ДОРАБОТКА ТРЦ УДАЛЕНА ИЗ ОЧЕРЕДИ по явному последнему указанию игрока.
Черновик d3ecc7a/codex/mall-cyberpunk-detail сохранён и не включён в воду.
Существующие ТРЦ, покупки и маршруты продолжают работать; не удалять системы.

## Восстановление и сохранённые ветки

Канонический источник этой памяти — codex/ocean-recovery-memory. Прочитать
его перед возобновлением изстарого main; shared-water-coreможетотставать.
Все source/QA публикованныхэтапов вGitHub; exactbundle/sourceHEAD+cached+status
иnativePNG лежат вdocs/qa/2026-11-17 соответствующихsourceкоммитов. Это НЕ
полная Gitистория вtar. Предыдущие развёрнутые записи сохранены в
[архиве CURRENT](history/CURRENT-before-performance-status-cleanup-2026-11-17.md).

- /workspace/chichi-ocean-performance, codex/ocean-performance:1f96a1b,
  immutable expectedpublication assets.
- /workspace/chichi-mall-submit-performance, codex/mall-submit-performance:
  0b38098, immutableexpectedassets; QAnewin отдельной verificationветке.
- /workspace/chichi-seabed-floor-wide:06a39cb; /workspace/chichi-seabed-materials:
  c44; /workspace/chichi-seabed-release:c3. Не сбрасывать старые деревья.
- /workspace/chichi-seabed-reef содержит прежнийWIP90c4ff0+overlays; финальное
  содержимое сохранено вc3/c44/06, не считать файловыйtarегоединственнойкопией.
- /workspace/ai-cat-game — исходныйdirtyWIPb44f4ef; не удалять/не reset.
- 2×oceanWIP f5f89c75513c416d6713715b1ae0d568270fab20 вshared-water-core и
  прежнихдеревьях: waterarea2×,forecourt378points−190,старые64benthicrocks и
  тяжёлыеcorals. Его8.62Mtri forecourt НЕ приняты и не опубликованы.
- Исходныйsandcandidate fbd104987e89abea53c16a4dc35f6bc0462b0bf4 сохранён.
  Гипотеза «песок причина5secRAF» НЕ подтвердилась. Авторская256²GLnormal/
  roughness неPolyHavenscan и неd6. CoastSand01albedo прежнийsRGB; API403,
  отсутствующие карты не получены. Не обходитьallowlist и не подменятьprovenance.
- Три потерянные ветки codex/mall-visitor-camera, codex/ocean-render-stability,
  codex/underwater-cat-mall не были найдены/восстановлены. Не обещатьстарыйкод.

Архив R9: archive/project-memory-2026-11-16, commit501757e09370116b942248e392c6461211cb5632,
SHA256aaaa3d9c257258a6dbc98a65271806d8a4805ea3d710d3830ddb1bff690d8af0,
60499125B,13worktrees restore/hashchecked, требуетbasec9a2ac7a74dfad5f478464dd6cf62c072e4172a0.
НЕ fullGitистория, НЕ включаетпоследующиеc3/c44/06/performance. Новое сохранено
вGitHubsource/QA, не приписыватьегоR9. Скачать:
https://raw.githubusercontent.com/arturmal2805-netizen/ai-cat-game/501757e09370116b942248e392c6461211cb5632/backups/chichi-shared-water-wip-2026-11-17-r9.tar.gz

## Стандарты и история

[Вода](standards/water.md): горки VERYEARLYprototype; d6fa8056f18d2d738890cc9b477334e4cda81523
историческая техническая цепочка; Crimson Desert — новый визуальный ориентир
всей воды; stableSHA — отдельная техническая запись. [ТРЦ](standards/mall.md),
[грунт](standards/terrain-vegetation.md), [управление](standards/controls-camera.md),
[решения](decisions.md), [доказательства/backup](evidence-and-recovery.md).
Provenance merge939/источника4ec/историческогоlive12d сохранены вdecisions и
history; не создавать их повторно и не откатыватьпозднейшиеисправления.

## 2026-11-17 — water CI follow-up and input native progress

Water test-only follow-up f09c3f3d64be85a0394049e59877711d066db733 pushed to
main/codex/ocean-area-expansion. CI44173134773 running; NOT yet published.
Full local previous run1089/1091 PASS: only historic reference-slide map hash
and world-consolidation uniform-radius expectation failed. Both corrected
without changing runtime/native/assets; all15 tests in the three relevant files
PASS. Immutable expectedJSfbb0341f..., CSSd0206825... retained.
Verifier /tmp/verify-ocean-area-release-f09.py, log
/workspace/qa/ocean-area-publication-f09.log. Old CI187 failed;188 is new run.

Input4d8f8f9 desktop actualW/S/A/D PASS; phone touch same four PASS; pending
mockAI takeover/abort/stale-result guard PASS, no paidAI. NewSQLite extension
exposed a flaky moon fixture where an independently moving resident blocked
the reverse path: native collisions correctly retained. Do not weaken test or
collisions. Use actual private saved homestead195,-20 clear region (same saved
address style as cat-location QA), preserve allNPCs and check start pose.
Current rerun /workspace/qa/global-manual-touch-sqlite-v2.log/.exit.
Production fix unchanged. Mall WIP remains removed from queue.

## Input candidate ready after water (2026-11-17)

Remote codex/global-manual-input c838986e7910e125ad32bfb85e836e51199eb535.
Full Node22 build, Wrangler dry-run,82 relevant tests PASS. Native desktop
(no screen pad) and phone W/S/A/D, busy takeover, pending mockAI abort without
stale commit, World/Island release and SQLite economy/position reload PASS.
Underwater global button exit/swim/dive/rise/reboard/camera release PASS.
Exact source overlays/QA bundle/PNGs/logs:
docs/qa/2026-11-17/manual-input-fix/candidate-build.json in candidate branch.
ProductionJS0ca625bd2ecf9aa7b3b766306bce047b5f27b882be64ab0f3261058b2ea46c88,
CSSd0206825 unchanged; no models/reef/probes changes. No paidAI.

Promotion waiter /tmp/promote-chichi-manual-after-water.py running, foreground
session68834, log /workspace/qa/global-manual-promotion.log. It gates all native
/build/test exits and complete waterHTTPreceipt; checks main stillf09c3f3 and
input stillclean candidate; copies waterreceipt, archives/rewritesCURRENT and
commits/pushes input separately to main only after water is fully verified.
Then discovers its CI and runs actualasset verifier. On independent main
change/failure it stops rather than overwrites. Do not edit input worktree or
immutable expected assets while waiter/release CI runs. Check real process and
receipts after environment restart; a persisted script does not prove it runs.
Input final workflow/SHA: /workspace/qa/global-manual-promotion.json once sent.
Input live proof: /workspace/qa/global-manual-input-publication/live-verification.json
and verification.exit. NOT yet published now. WaterCI44173134773 still running.
