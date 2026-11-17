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
Категорически не считать кандидат опубликованным/визуально проверенным.
Требуются Node22 build, актуальные probes/reef asset, native day/night/phone,
субмарина/ходьба/возврат, privateSQLiteownership/reload, CI и HTTP hashes.

## Что делать дальше

1. Завершить текущую публикацию ТОЛЬКО острова и воды: полный CI и HTTP
   сверка фактически загруженных JS/CSS/reef/probes. Native water/outer-control,
   физический return и ownership/SQLite прошли. Точный QA в
   docs/qa/2026-11-17/ocean-area-expansion/manifest.json. 33+5+11+14+8 tests PASS; дополнительно18 coast/fauna guards PASS.
   Две проверки травы используют новую сухую береговую точку вместо затопленной.
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
