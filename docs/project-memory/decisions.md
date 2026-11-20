# Решения и известные ошибки

## Последнее уточнение 2026-11-16: общий стандарт воды для ВСЕЙ карты

Пользователь уточнил: сейчас вода различается в океане, на горках и у капибар;
нужны одна общая текстура волн и единое ядро, чтобы улучшалась вся карта сразу.
Референс Crimson Desert относится ко всем водоёмам. Это заменяет прежнее
ограничение итоговой архитектуры только океаном. Допустимы физически нужные
параметры глубины/течения/масштаба и отражения реального окружения. Ещё более позднее уточнение: горки — лишь ОЧЕНЬ РАННИЙ ПРОТОТИП,
сравнение художественного результата должно идти с Crimson Desert. d6fa805
остаётся исторически одобренным исходником, но не целевым уровнем финальной
воды. Обязательны A/B и сохранность поведения, а не вечный lock старого shader. Изменять
защитные проверки осмысленно под новый контракт, а не удалять ради зелёного CI.

## Предыдущее решение — что считать эталоном воды

**Требование →** d6fa805 прямо указан в правилах как исторически одобренный
источник. **Уточнение пользователя →** нынешние горки выглядят нормально,
регресс относится к острову мозазавра. **Решение →** защитить текущие горки
точными хешами и изображениями, менять только профиль океана. Нельзя откатить
весь проект или реконструировать «эталон» по фотографии.

## Пустое дно не исправляется одной оптикой

Подводный кадр с большими голыми скалами и редкими колониями отклонён.
Часть колоний опиралась на старые центры рифов до их подгонки от ТРЦ; их
размещение переведено на финальные поверхности. Затем 16 рядов колоний
выглядели как посадки: заменены асимметричными участками и реальными камнями.
Пользователь снова отклонил кадр: между участками пусто, материал дна плох.
Следствие: этот черновик НЕ является утверждённым художественным результатом.
Нужны полноценные переходы песок/осыпь/низкая растительность и проверенный PBR.

## Ошибка общего центра глубокого LOD

Отдельная группа из 512 колоний получила центр в пустом проходе ближе к
камере, чем реальные растения. Она выбирала полный near LOD сразу для всей
глубокой растительности: 16.55M треугольников в проверенном виде.
Правка делит растения по настоящим участкам; её эффект ещё не измерен.
Не уменьшать детализацию близкого растения или DPR ради «зелёного» бюджета.

## Геометрия и архивы

Свободная точка по другую сторону стены не доказывает проход тела между ними.
Стекло/ограждение нельзя удалять до установления исходного объекта, этажа и
преобразования координат. Исправлять реальный проход/сегменты общего bbox.
Сохранять ожидаемый docked при физическом возвращении, а не менять строку на
mall ради теста. Нужны ручное освобождение, автономное действие и reload.

Файловый tar без patch не сохраняет удаления/staged-only; bundle без overlay
не сохраняет WIP. Для linked worktrees нужна общая история и отдельные
HEAD/index/worktree каждого дерева. Только проверенная внешняя копия является
независимой от машины.

## Ошибки доказательств, которые нельзя повторять

- Старый PNG не подтверждает v2; если исходники грязные, нужен точный overlay.
- Успешная компиляция шейдера не доказывает визуальное качество.
- Средний FPS не исключает длинных фризов; считать полное время кадра и хвосты.
- Header «полночь» не доказывает ночное освещение: текущие основные lights
  постоянны. Сначала проверить реальные значения.
- A/B должен обслуживать assets каждого собственного checkout. Старый harness
  выдавал новые assets для старого source: исправлены отдельные URL roots.
- `BufferGeometry.copy` разделяет userData: перед сменой ownership метаданные
  надо отделить. Не мутировать shared-оригинал.
- Эффект на FPS нельзя выводить из числа атрибутов/фрагмента CPU submission;
  отличать конструкционную память, GPU residency и полный frame time.

Устойчивые требования находятся в стандартах. **Очередь и последняя точка
продолжения находятся только в CURRENT.md.**

## Проверенное происхождение слияния12d478e

939b328 — release metadata/QA и index URL поверх water source4ec3737. Ветка
ТРЦ уже содержала4ec3737; common ancestor подтверждён. Слияние объединило
историю опубликованного этапа и отчёты. Единственный конфликт — app.js URL
edb0a1411d337a38 против507539ea7920b048; сохранён настоящий итоговый Mall bundle
507539…, содержащий оба этапа. CSSc14ce… не конфликтовал. Нет unmerged index,
MERGE_HEAD или маркеров в runtime. 12d478e уже опубликован, CI43807080956
success, actual live bytes повторно совпали. Нынешний WIP отдельно и не live.
[Точный remerge diff и проверка](../qa/2026-11-16/project-memory/merge-12d478e-audit.json).

Дополнительная проверка HTML12d478e: ровно одно подключение приложения
`./dist/app.js?v=507539ea7920b048`. Полный source воды —
`4ec37371e6b71a03050d4e2a14e8b8fbdc9ae6b3`, release checkpoint —
`939b328304d4807506849a9fbeb866ea9f40703c`, опубликованное слияние —
`12d478e82e8e5a2bd6ef3ec0cbb151ea1e473d1d`. Полные JS/CSS хеши и workflows
в CURRENT и связанном machine-readable audit. Внешний вид пользователь
отклонил несмотря на технически успешную публикацию.


## 2026-11-17 — единое ядро действительно реализовано и сохранено

Причина: пользователь требует одновременного развития всей воды, а отдельные
Mosa/showcase fragment overrides расходились по оттенкам и прозрачности.
`water-field.js` владеет одним prepared Texture; `water-core.js` содержит
sampling2, Fresnel/GGX, scatter/extinction и теперь общий macro-wave расчёт.
Showcase/Mosa wrappers передают размеры, реальные depths/probes и route fade,
не отдельные художественные fragment shaders. Оба reflection bakers приведены
к настоящему linear-radiance/4 с gain4, runtime tone mapping единый.

Native A/B на одной геометрии подтвердил один Texture1024² вместо двух,
те же geometry/draws, отсутствие static-pixel regressions на двух горках,
работающие animation/reduced motion/rider/outlets и контраст .785. Полный CI
b2baec2 успешен, deploy/pages skipped. Macro extraction после b2 имеет29/29
локальных тестов + новую сборку/native, и полный CI44046315766. PNG показывают
оставшиеся пустоту дна и повторяемость ряби. Поэтому решение архитектуры
сохранено, художественный результат не принят и публикация не выполнена.
[Точные промежуточные доказательства](../qa/2026-11-17/shared-water-core/manifest.json).


## 2026-11-17 — одинаковая камера после расширения и R9

Обзор, автоматически fit к размеру острова, изменял ракурс при удвоении воды.
Поэтому broad18-biome coverage не является чистым океаническим optical A/B.
Harness теперь повторяет local water centre/radius стабильной версии и
shadow/light envelope; same-geometry A/B при одинаковом размере уже корректен.
Не использовать старый общий обзор как доказательство отсутствия регрессии.

Независимый R9 сохраняет общее ядро4dc и13worktrees. В новом clone проверены
HEAD/cached patches, status и bytes всех13; удалённые60MB скачаны и hash совпал.
Полный CI4dc success, публикационные jobs skipped; сайт по-прежнему12d478e.
Внешний вид этим не одобрен. Результаты и ссылки — в CURRENT/QA2026-11-17.


## 2026-11-17 — срочный отдельный релиз общей воды

Пользователь требует скоро опубликовать воду. Решение: собрать общий core4dc
на стабильной географии12d; WIP расширения/1536кораллов/64камней оставить отдельно.
Это не rollback опубликованного управления/сохранений: основа — текущий main.
Так релиз воды не получает непроверенный художественный/геометрический бюджет.
Реальные reflections переснимаются под собственные stable inputs.

WIP64rocks использовали общий LOD origin в пустом проходе; исправлены реальные
садовые anchors при прежних Float32 rows и geometry. Native1pixel sorting
regression исправлена сохранением исходных spheres, не изменением допуска.
Far views получили исходные3combined batches (v2 лишние90draws устранены).
CPU6tests/native9pixelcomparisons passed, whole forecourt15.84M→8.62M, far
counts unchanged. Но это всё ещё не подтверждённый бюджет/реализм и не FPS;
не включать WIP в срочную оптическую публикацию. Подробности — CURRENT/QA.


## 2026-11-17 — вода опубликована и подтверждена

b8051f931c66608acd15ac41bb6043c7081b7605 опубликован как отдельный общий
оптический этап на стабильной географии. Основной draft новой геометрии
f5f89c7 сохранён отдельно. CI44063176067 test/deploy/server save verifier/pages
success. Реально скачанные JSdcff015e…/CSSc14ce…/wind1024²/9probes совпали;
в HTML одно приложение. Полные хеши и HTTP receipt — CURRENT/QA publication.
Это не визуальное одобрение и не доказательство Mac/iPhoneFPS. Следом дно,
низкие экосистемы и отдельно проверенное расширение. Код/прогресс не потеряны.

## 2026-11-17 — опубликован c3f59b2, следующий песок/камни

После общего ядра воды опубликованы13рифовых садов и явная одноразовая FPS
диагностика. Полный CI44082509878 и реальные HTTP assets подтверждены. Ранний
sand-material отложен; причинность его slowdown не доказана. Локальные новые
sand triangles отделяются от прежнего floor index без overlay/двойной геометрии;
при успешной проверке один общий материал распространить на песчаное дно.
Камни брать из готовой геометрии и scanned material, не строить заново весь
океан. Пользователь передал FPS report и явно отложил оптимизацию ДО завершения
песка/дна. Raw report хранится локально, секреты/полный save в GitHub не публикуются.

## 2026-11-17 — опубликовано всё дно, оптимизация начинается после него

06a39cb подтверждён полным CI44094617737 и HTTP13:50:03UTC,54секции/118stones.
Пользовательская очередь соблюдена: report AppleM2 разобран после публикации.
Реальные18.959Mtri/2462draws/211rapid refaults требуют полного Mall в QA.
Первые reef-кадры не включали mall.ensure(), поэтому не являются сопоставимым
performance baseline. No visual approval/hardware improvement claimed.

## 2026-11-17 — первое точное отсечение секций дна

Shared attributes сохраняются, но прежняя sphere каждой из54секций содержала
всё дно и раздувалась nonuniform bed.scale. LOD теперь проверяет sphere по
полным индексированным треугольникам в metre space после FINAL camera.
Native sort sphere/LOD/shader/vertices/picking неизменны. Casting floor
остается native, чтобы main camera не выключала тени.31targeted PASS; полные
colour/shadow/DPR2 underwater/overview/phone pixels проверяются отдельно.
Полный Mall trace подтвердил существенную triangle нагрузку Mall; refaults
в неподвижном сценарии не повторились. Бюджет не повышать на основании догадки.

## 2026-11-17 — отклонён первый эксперимент Mall static

V1 сохранял любой previous hook, в том числе старый Mall reflection finish.
Получены duplicate uMallProbe/mallR GLSL errors;0pixel differences между двумя
битым изображениями НЕ делает тест успешным. Ошибки в assertion errors[]
остановили проверку. V2 сохраняет только известный static-submission wrapper,
старый Mall finish заменяется по прежнему контракту. Новый unit ловит duplicate
uniform/reflection,8unitPASS. NativeV2 ещё не подтверждён. Никогда не ослаблять
проверку console/shadererrors ради выигрыша в triangles.

## 2026-11-17 — exact Mall RGB dictionary and global Chichi entry

Report3 identifies published0b/JSdbe, not an earlier release. Camera-cycle
submission-only trace reproduced Mall re-upload pressure; it is not GPU/FPS
measurement. Baked floor RGB uses a lossless Float32 dictionary with Uint16
indices, saving34,461,284B GPU for152 geometries without changing triangles,
positions, normals, UVs, order, picking, cats or the cache budget. Native V3
interior/overview/phone DPR2 pixel comparisons have zero changed RGBA channels
and zero errors. The 5900ms physical-device gap is still unproven cache-related.

Rejected QA V1/V2 used a cached Three program with a different uniform set on
one reused material. Material-local uniforms do not track each cached program.
Comparative mode switching now disposes/recompiles that material; production
initializes once. Failed captures are not visual evidence of correctness.

Player explicitly added global «Управлять Чичи» including ordinary islands.
Reuse one real carrier and existing water/Mall physics; guard all ordinary hero
owners while land manual is active. Native V7 keyboard, actual touch, camera
release and SQLite reload pass. Node22 build/50 targeted tests and ownership
phone audit pass. This records verified WIP, not publication or art approval.

## 2026-11-17 — water-only expansion; explicit next bug is global WASD

The player authorized publishing the island/water increment, then reported that
third-person W/A/D movement does not work throughout the world. This supersedes
the initial home-only report. Fix immediately after this publication. The prior
short native A-key fixture does not establish live whole-world input correctness.
Check mode ownership, permissions/busy-AI coupling and actual input/frame state.
Mall development is explicitly removed from the queue; d3ecc7a is archival WIP.

Native expanded-water entry/movement/reload and physical autonomous dock return
passed, as did the separate phone ownership/two-SQLite-reload audit. The ocean
received an actual new coast probe; all eight attraction PNGs are unchanged.
Soil rows adapt inside the recovered narrower shore, retaining boundaries,
walk height, cap area and up-facing triangles. The old >60m assertion correctly
exposed that an unadapted grid would overshoot; do not just suppress that guard.

Offline geographic PNG comparisons are not an exact whole-scene FPS A/B: the
hero fixture differs, and the new deep-phone camera is below the former floor.
Do not derive a hardware FPS claim from these timings. Existing global scene
lights are constant across the two game hours; no fake QA night light is used.
Exact triangle/vertex/LOD hashes remain for rock/coral templates. Their cached
anchors and optical depth are now checked against regenerated expanded geometry,
not stale b805 world-position hashes. No historical source fixture was rewritten.

## 2026-11-17 — CI188 and reliable manual-input physical fixture

Water f09c3f3 corrects only historical guards; complete Node22 run had1089/1091
PASS and corrected three guard files15/15PASS. New CI44173134773 must pass
with actualHTTP assets before water publication is claimed.
Desktop and phone each moved W/S/A/D in native game, and mocked pendingAI
was aborted without stale commit. A subsequent SQLite-extended phone run hit
a genuinely blocked reverse path as a resident walked into the tiny moon test
area; do not removeNPCs, loosen collisions, or lower movement assertions.
Seed actual saved homestead195,-20 to separate input regression from dynamic
path availability, retain all residents and verify loaded seed/no default reset.

## 2026-11-17 — ocean expansion confirmed live, input fix released separately

Water f09c3f3d64be85a0394049e59877711d066db733: CI44173134773 all test/deploy/
pages SUCCESS including server/shared-save verification. HTTP21:06:09.199022UTC
matched one app script, JSfbb0341f1dd1f67adab0b0003dc00305e7e549bd6bb1318eaa50a16a45aaad29,
CSSd02068257c7b2b00ecdb80590c8a6bc5003849788f1400e69b6a6d6d91fb4356, all actual
wave/probe/reef assets. GitHub transient503 stopped the first verifier; bounded
retry confirmed full success and exactassets. This is not artwork approval.
Only AFTER that receipt, input fe9415cff8cdbb9dc20ed7def14fa71f6dbff968 was
pushed to main/codex/global-manual-input. CI44176344655 pending/in progress,
not yet published. Exact native/SQLite82test/build proof exists in that commit.
Initial promotion failed before file changes because history directory absent;
mkdir fixed the helper. No reset/rebase/graphics reductions/MallWIP merged.

## 2026-11-17 — manual takeover fix confirmed published

Release fe9415cff8cdbb9dc20ed7def14fa71f6dbff968, CI44176344655 complete test/deploy/pages
SUCCESS including actual server/shared-save verification. HTTP2026-11-17T21:18:40.630742+00:00
confirmed ONE app script, JS0ca625bd2ecf9aa7b3b766306bce047b5f27b882be64ab0f3261058b2ea46c88,
CSSd02068257c7b2b00ecdb80590c8a6bc5003849788f1400e69b6a6d6d91fb4356 plus all
wave/probe/reef resources. Source/public models, water profiles, collider sizes
and economy merge semantics retained. Native desktop/phone/pendingAI/SQLite/
underwater route subsets and82targeted tests passed before this fullCI.
Publication followed water f09c3f3 only after its complete CI+HTTP receipt.
Mall WIP remains off queue. This proves behavior/release, not hardware FPS or
user art acceptance. Expected release public roots remain immutable.

## 2026-11-17 — local front bay rather than another whole-island expansion

Player clarified the screenshot refers to deep seabed IN FRONT of the Mall.
Isolated worktree from livefe9415c, WIP0bf98d5 remote. Modest ellipse extension
adds18m forward/12m each side;36m C2quintic outer shoulder, unchanged foundation
mask. Grid guards reject raising released swimming space and preserve actual
foundation. Keep all12reef models/scales/LODs; four interfering rims move,
exact unchanged offsets retained. Offline search expands120→180m when colony2
has no valid original bounded fit; full-vertex and shoreline limits unchanged.
Old cache guard correctly failed before regeneration, not a reason to loosen
it. Node22 rebuild completed; candidate native/derivedcache retests pending.

## 2026-11-18 — front-bay final published; next is physical paths and doors

e8ab6ffc24453e1e3ead9acf5190f90acff88730, workflow44185424944 complete SUCCESS and
HTTP2026-11-17T22:12:26.233244+00:00 actual13assets matched/oneapp. Final46mfront
extension preserves approved C2shoulder and oldfreewater; nativez270swim,
SQLite and physicaldockreturn passed separately. Finalmatchedoverview same
2804×1384/camera/FOV40/DPR2/exposure1:1634→1633calls,14975258→14973242tri,
single softwareframe24249.2→22587.3ms. No deviceFPS or artisticwater guarantee.
After publication user explicitly queued paths/doors including JobCityroads,
allhouse/officeentrances and Mallgate. WIPcad6214 uses actualprimitive
bounds/surfaces prebatch, retaining13models byteexact; do not confuse
placement roadreservations with physicalwalls. Newcheckpoint/remainingQA
recorded inCURRENT. No economic/save/merge/radius reductions.


## 2026-11-18 — Проверенные проходы отправлены в main

39148734bd3f4a0265a6ec9aff8ab4b41f36c0b4; CI44194305867 pending.
Дорога City больше не строительная стена; реальные отдельные OBB сохраняют
проёмы всех6офисов и7домов. Native City/home/phone/real Mall airlock PASS,
Node22build и regression guards PASS. Full evidence in source docs/qa/2026-11-18/manual-paths-doors.
13models byteexact to e8. Art Mall redesign excluded. No live claim until receipt.


## 2026-11-18 — Проходы опубликованы и проверены HTTP

39148734bd3f4a0265a6ec9aff8ab4b41f36c0b4, workflow44194305867 SUCCESS.
JS/CSS и13 assets совпали с immutable public /workspace/chichi-manual-paths-doors.
Квитанция в docs/qa/2026-11-18/manual-paths-publication. Одно приложение.
Далее самостоятельный SPA в codex/underwater-spa-resort; не включён в релиз.


## 2026-11-18 — Input length is not API call count

Internal20klegacy character guard does not count Cloudflare requests. User asked
for further compression; shared dictionaries losslessly encode repeated string
columns in both legacy full plans and scheduled career/evening events. Keep
147cats,allvenues,needs,balances,personality,wishes,families and original strict
output contracts. No extra model call, cadence reduction or promised billing.
Separate release candidate827e370 and workflow44305576620; SPA excluded.


## 2026-11-18 — Передача и независимый R10

КороткийAGENTS ссылается на обязательные полные правила без удаления требований;
CURRENTсокращён, старыйстатус архивирован. ROADMAP — приоритеты/критерии.
READMEисправлен поактуальному Node22/AIevents/opt-inpaidCI. Режимыthirdperson/
guest/floor и historicald6 vsCrimsonref сохранены. Оригинальныеinlineimageбайты
неполучены: пробел отмечен, хеши/лицензии не выдуманы.
R10 всех30linkedtrees содержитincremental bundle+working/cached/status/new/deleted;
удалённыебайты проверены и восстановлены30/30. Для дискового бюджета тестовые
копии удалялись ТОЛЬКОпослеexactпроверки; оригиналы не тронуты. НоваякопияSPA
извосстановленногоGit установилаNode22deps/прошла19checks. RemoteURL/SHAвCURRENT.

## 2026-11-18 — Физический доступ SPA и отдельные процедуры

WIP24cfec41907b802942440febb716a897681c5f0f сохранён в codex/underwater-spa-resort;
site/main всё ещё827e3708979cb95c4675e38caf6354364c733b64. Native верхняя
площадка→лифт→массаж→лифт→площадка→SQLite PASS,2000→1700, одинчек/used.
Source/overlays/bundle/PNG/logs: docs/qa/2026-11-18/resort-spa/native-transit в этой
ветке. Это не полный берег/субмарина/phone/все процедуры/художественное одобрение.

Реальные причины блокировки: геометрияSPA пересекала дно (только новая origin
сдвинута20м); нижний miter-угол закрыл pressure-port; massage-specificcontinue
пропускал мостик; tangent-ended мост оставлял неподдерживаемые кусочки между
прямоугольником и круглым полом. Исправлены сами реальные меши и проходы,
без уменьшения кота/отключения столкновений/телепорта. Последнее выявил native
возврат, а не проверка только начальной/конечной точки. Финансовый отказ
обработан без падения worldloop; баланс проверяется до поездки/процедуры.

Пользователь уточнил:14зон должны иметь разные классные милые проработанные
анимации. Подтверждён только массаж; теперь приоритет бассейны/джакузи, далее
остальные процедуры. Одна поза с разными названиями не84состояния.

## 2026-11-18 — Разные водные/сухие процедуры и ловушки реальной геометрии

WIP0f5f71185c55ed5879adc0173fc888991778bbc8 проверил3водных сервиса/SQLite,
WIPd4659e05eecb3329a06a6e3f1304f3d67bc51c85 —11dryposeциклов/SQLite.
Все14 имеют отдельные фазы; это не84полныханимации и не художественное одобрение.
Sparseinteriors, отсутствующие каскады/полный groomingstaff/props отмечены в QA.
Водная отмена возвращается физически по ступеням, paidticket не потребляется.

Authoredfloor обязателен при батчинге: nearestzone ошибочно назначал верхнюю
плиту атриума уровнюкафе. Meshposition недостаточен для геометрии с ужеавторскими
вершинами; fallback должен учитывать boundingboxcentre. Скрывать рендер можно,
удалять физические опоры/логику нельзя.

При добавлении стеклянных переходов реальная Yразвилка с подходом отлифта
закрылась sidewall соседнего мостика. Решение — точные polygon-intersections
и разбиение только внутренних фрагментов; внешние стены/полный радиускота
сохраняются. То же на Tвходе со старого пирса: полмостика начинался напирсе,
но его боковина перекрыла продольное движение; clipточно внутри ширины2.2м.

Отдельный боковой проём z289,width5; старый субмаринный проём92..99 сохранён.
Пирсовые rails/poles имеют единый source для модели/коллизий; reflectionbaker
пересчитал настоящую сцену после sourceизменения. builderObstacles включает
большие reservationsразмещения ВСЕЙводы/пирса и не является физическимcollisionlist;
приходSPA использует manualPhysicalObstacles плюс реальные rails/poles.
Новый native shore-route на момент записи идёт; не считать его PASS заранее.


## 2026-11-18 — Первый функциональный этап SPA и восстановление лифта

Пользователь настойчиво просит отдельную публикацию проверенного этапа.
Не выдавать это за завершение художественного референса или84полныханимаций.
Новый actualphysical shore gate требует actualrails/poles, не reservation
всейводы; источник отражения переснят существующим baker.
Реальный coldSQLite test восстанавливает существующие catLocations и кабину
наY=-65.05 с закрытыми дверями и физически возвращает наверх; нет телепорта,
новой save schema/общегоmerge/повторного списания.
Нативные rest контакты проверяются по настоящим skinnedvertices; перед CPU
запросом обновляются bindMatrixInverse (updateMatrixWorld), а не только matrixWorld.

Слияние release ветки с опубликованным827e370 нужно для сохранения последней
упаковки AI и ancestry main. Runtimeконфликтов не было.3конфликта add/add только
в ai-context-compact QA: main измерения остаются в оригинальном пути, SPAкопии
в ai-context-compact-spa-wip. Не заменять этими числами опубликованные измерения.
Финальный Node22/fullCI/nativephone/live pending записан в CURRENT, не успех заранее.


Телефонный dryfloor input прошёл фактический heldtouch:4м вперёд по SPA при
Y=-164.988, без перехвата submarine, независимыйinspection скрыт, World
снимаетmanualowner. Первый phonecontrols fail выявил реальный порядок
controlChichi доactualdrysupport; исправление a8ea3753c44068cb6940b21e7f0796c5394a4282.
Релиз55a9beb0aa27c6066817adc582828875d9809de5 — первыйфункциональный этап,
не готовность всего референса/84behaviors; mainpush сделалполныйCI44340341336,
его финального результата и реальных assets ещё требуется дождаться.


## 2026-11-18 — Подтверждённая публикация первого этапа SPA

ПолныйSHA 55a9beb0aa27c6066817adc582828875d9809de5; workflow44340341336 test/deploy/pages SUCCESS,
release/sharedsaves verified. ActualHTTP 2026-11-18T16:08:23.131278+00:00, одноapp, JS/CSS
соответствуютNode22кандидату. Квитанции docs/qa/2026-11-18/resort-spa-publication.
408publicimports и actualphoneCSS совпали с mergedruntime;102архивныххеша
подтверждены. Не объявлять визуальноеодобрение/84complete/hardwareFPS.
Следующийэтап берёт55a9beb, сохраняетстарыйa8ea375WIP и перечисленные
в CURRENT незавершённые сценарии; не повторяет опубликованные фиксы.


## 2026-11-18 — Аварийное восстановление, не художественные доработки

Пользовательские JSON подтверждают490coins/0diamonds/19profiles и потерю
unlocked autumn в текущем новоммире. Причина первичного сброса ещёнеустановлена.
Вводимый ключвосстановления некоммитить. Не публиковать личныеJSON/непридумывать
миллионы или147котиков по картинке. Предыдущаязапись об успешномCI/HTTP не
подтверждает сохранность настоящего playerworld. Полноевосстановлениеpending.
Отдельный offline tool меняет ТОЛЬКО unlocked autumn на пользовательскомПК,
ноль сетевыхзапросов, ZIPGitHub проверен. Источникfa872ec/веткаrecovery/offline-location-tool.
Strictload/readonlyrescue WIP в codex/emergency-save-recovery не опубликован.


## 2026-11-18 — Явно разрешённая компенсация и защита от сброса

Пользователь потребовал начислить средства вместо ожиданиястаройкопии и
проверитьcryptoAI. ScopedодномуworldSHA компенсация/постоянныйreceipt/backupbefore
в4025f713cea3b8ecfea72128275398af8d3dabc3; fullCI44388536452 pending.
РеальныйnativeautoloadSPA безкнопки PASS; отделятьотсовместногоначисления,
которое вреальномworld подтвердитследующийbootвбраузерепользователя.
Crypto mockforecasts, repeat/reload/liquidation/short/long иpaidpurchase/escrow
послекомпенсации PASS. ActualremoteAI не подтверждёниз-заtunnel403.
Не объявлятьвосстановленнойпрошлуюколонию147/историю. Не повторятьgrant
внепостояннойсервернойквитанции. Никогда не хранитьrawrecoverykeyвGit.


## 2026-11-18 — Проверенная публикация аварийного исправления

4025f713cea3b8ecfea72128275398af8d3dabc3 fullCI44388536452 test/deploy/pages SUCCESS, actualHTTP
2026-11-18T20:26:29.321591+00:00 oneapp/JS/CSSmatch. Компенсацияодномуworldпостояннымreceipt,
защитаотfreshreset, readonlybackups, nativeSPAautoload. Useractualбалансы
ещёнеподтверждены доегоboot; не выдаватьпубликациюзаприменениеличногогранта.
Crypto mocktests иescrow/purchasepreservationPASS, actualremoteLLM НЕподтверждён.
Старые147профилей/прошлаяистория не восстановлены,начислениеразрешенопользователем
каккомпенсациявместождания. Резервныеснимки beforeawardоставленынасервере.


## 2026-11-18 — Boot hotfix опубликован, приватный SQLite аудит завершён

Пользователь сообщил, что 4025f71 не изменил кошельки, и подтвердил identity.
Найден воспроизводимый вызов CloudBackup callbacks до инициализации app при
pending outbox. 0d21c0f0773d756790facf75cc35574376263f60 откладывает эти callbacks
только на время адресной операции, возвращая их в finally. Полный workflow
44391975714 SUCCESS; live JS/CSS и одно подключение приложения проверены.
Квитанции: docs/qa/2026-11-18/recovery-boot-publication/.

Приватный настоящий браузер/Worker/SQLite подтвердил queued boot, начисление,
все 20 кошельков, reload, старые копии, идемпотентность и SPA autoload.
QA использует новый приватный ключ и замену eligibility hash, не реальный мир.
Точная QA-ветка codex/recovery-credit-native-audit на
1b5c8bfc9c28dd1eb7ec5dbf26546d1a987b9b80; не отправлять её в main.
Получение денег живым пользователем после новой ссылки пока не подтверждено.
Не путать компенсацию с восстановлением 147 старых профилей, mock crypto с
реальным inference, успешную публикацию с визуальным одобрением.


## 19 ноября 2026 Kyiv — опубликованы Cloud backup кнопки, SPA V6 отдельно

39708e32a6a4f86b9a6a09d777fc4c38526a7f33, fullCI44403570410 SUCCESS, live JS/CSS/одно app
проверены. Пользователь уточнил: нужен скачиваемый файл текущего мира в существующем
«Облаке», для компьютера на случай потери данных. Реализован envelope/checksum,
строгий импорт, preview/подтверждение, локальная копия/download до замены, без секретов.
Native Chromium/private SQLite проверены; настоящий Mac нет. SPA в этот релиз не вошёл.

Полный V6 сохранён как спецификация, WIP ed3ae4d в codex/spa-v6-reconstruction.
Пользователь требует повторных сверок каждого референса на многих этапах.
Baseline и architecture реальные кадры просмотрены, не приняты как финал;
исходный общий обзор был внутри грунта, второй перекрыт ТРЦ. Менять локальную
камеру SPA, не скрывать ТРЦ/не телепортировать котов/не отменять столкновения.
Третья серия и полноценные процедуры ещё выполняются, последние логи в CURRENT.


## 19 ноября 2026 — checkpoints SPA по каждому этапу

Пользователь: дорабатывать и сравнивать, разрыв с референсом видит; сохранять
каждый этап, чтобы после токенов не начинать заново. Три завершённых серии и
точные импортированные исходники/bundle/PNG в удалённом codex/spa-v6-reconstruction.
WIP0ffa10fca9b7d3df2a263f1f40d0d68efb79a9a0, production39708e3 не затронут.
Материалы: все14 услуги/верхнее плавание/SQLite PASS, визуального одобрения нет.
Новые кресла/SPA-only light shader/обрезка внутренних pressure walls требуют
следующего native кадра; unit41 PASS. Четвёртый прогон уже идёт, путь в CURRENT.
Не повторять заново старые процедуры, не принимать старый PNG за новый код.

## 19 ноября 2026 — сохранять каждый этап SPA V6 до следующей итерации

Пользователь подтвердил значительный разрыв с референсами и потребовал удалённые
контрольные точки на случай потери контекста/токенов. Код WIP и native доказательства
сохраняются отдельно от стабильного main; CURRENT содержит точный SHA и next step.
Четвёртая серия9be301e: actual W/World/sky pool/SQLite PASS, visual rejected.
Пятая6f2d87a: VIP реальные лежаки и отдельные native действия, локальная архитектура,
арома-навесы, анатомия рыб. Native ещё идёт, среды перезапуск прервал unit suite
после31 PASS — остаток проверяется отдельно, не подменяется общим PASS.
Стабильный опубликованный39708e3 с кнопками копии мира остаётся отдельным релизом.

## 19 ноября — пятый native checkpoint и физическое водное кафе

WIP b38f5a3 содержит завершённую пятую серию (VIP native/SQLite PASS, visual WIP).
Шестой f668b06 сохраняет4 wet/4 dry Café места, физические столы/отверстия/ступени,
промежуточные пути и безопасный reverse только пройденного при отмене. Закрытый
аквариум теперь реально блокирует камеру; открытый задний сектор атриума сохранён
геометрией переднего сервисного пола и проверен в обе стороны. Failure не спрятан.
QA-only clock lock добавлен для будущих сравнения кадров; production clock не менялся.
Native шестой серии ещё выполняется, точная команда/логи в CURRENT и WIP NEXT.md.

## 19 ноября — шестая серия завершена, седьмая сохранена

cd4bd52: native Café water cup/полный вход-выход/платёж/SQLite PASS; visual WIP.
6397605: три уровня реальных карнизов/галерей, fixed native flowers,36м sky pool
с настоящим отверстием/мостиком. Native идёт;18+2+1 targeted PASS.
Исследование света: часы HUD не управляют фиксированными Hemisphere/sun/rim.
В SPA finish clone потерял castShadow; reproducer отдельный, исправление и
визуальную проверку не выдавать за уже выполненные. Reflection probe пока не
содержит новый SPA, требуется настоящий offline capture на следующем этапе.

## 19 ноября — тени/свободный верхний бассейн и начало настоящих probes

Восьмой2125531 сохраняет исходные shadow flags через bake и устраняет дублирующие
Cafe элементы из воды. Native d72d101: реальные контактные тени/шесть кадров/World
PASS, visual всё ещё WIP. Девятый4e8bb85 — только offline QA capture, runtime probe
не внедрён. Actual prepared scene/14rooms+sky/HDR128/linear÷4, фиксируется source
state/биты/позиции/свет. Bake72278 идёт; нельзя менять source worktree до конца.
Материалы CC0 просмотрены; существующий beige tiled marble не Calacatta. API
новых PolyHaven ресурсов tunnel403, обход не делать. Историю/данные не трогали;
byte-identical temp QA art связаны hardlinks, освобождены2GiB без потери байтов.

### 2026-11-19 — SPA actual-scene reflection checkpoint
Третий15-layer capture на3ab73cd завершён, точные source/bundle/probes/log
сохранены WIP bbab0e6. Две неуспешные попытки сохранены отдельно; причина
QA drawPaused wrapper, не productionwater. Новые probes пока не подключены.
Продолжить с byte-checked DataArrayTexture и локальными SPA hooks, повторить
сверку каждого референса. Native/CI не является пользовательским одобрением.

### 2026-11-19 — Сохранение V6 пережило перезапуск среды
Reflection proof bd6195e; soft-art source992355c/partialc294dde; mounting
sourcebe2676c/interruptedprooff88adeb сохранены с точными PNG/source/bundle/log.
Рестарт оборвал только последнее продолжение после3комнат; код и результат
не потеряны.30467bf запускает только sky/Nap/SQLite оставшиеся шаги.
QA wallet failure сохранён отдельно, productionбалансы не затрагивались.
Долговечная технология/provenance/ограничения добавлены в SPA standard,
не только в чат. Все новые art этапы пока WIP, без публикации/visual approval.

### 2026-11-19 — SPA native продолжение завершено без потери этапа
49513c41a5aa555d0e92b55db9b11ef9fdb9a48f сохраняет actual sky/Nap/SQLite/
errors PASS и exact source/bundle parity421файла с interruptedbe2676c.
Три комнатных PNG не переснимались. Все97 evidence entries проверены/отслежены.
CURRENT очищен от старых pending-команд: историческая передача вынесена
в history/spa-v6-checkpoints-2026-11-19.md, технология — в SPA standard.
Следующее art: плотные сады/каскады и связный дворец; текущие references
по-прежнему не достигнуты, V6 не опубликована. Перед релизом новый probe bake.

### 2026-11-19 — пользователь поручил публикацию после текущей доработки
WIP d9ab6a6/fd3fb4f:16клумб/2каскада и реальная связь Cabana crosswalks.
28publicstation paths и20старыхdefaultpathfixtures PASS; сохранили радиус/стены.
Новый native public route audit должен проверить Aroma0/Cabana4 туда/обратно.
СледомNode22build/probe refresh/native/fullCI/main/live. Не завершать задачу
после очередного WIP-only checkpoint; публикация явно разрешена пользователем.

## 2026-11-19 — SPA checked stage merged, deployment still pending

PR#1 regular merge6e28f752291e65e7b51f7f093a004e5c81fd27b3 joins published39708e3
and exact checked4b72f2f. Complete tree equality verified; no conflict resolution
or application changes during merge. Regular merge retains exact QA/checkpoint
ancestry; WIP branch and oldworktrees remain. Native/phone proof lives in
codex/spa-v6-release-evidence so adding artifacts does not invalidate immutable
application CI. Publication workflow44539374765 is the next gate; merge alone
is not live publication. Artwork still has documented reference gaps.

## 2026-11-19 — SPA publication verified

Published full SHA 6e28f752291e65e7b51f7f093a004e5c81fd27b3. Main workflow44539374765 succeeded in test,
deploy and Pages, including exact Worker release/shared-save verification.
At14:20:35UTC actual HTML/JS/CSS/atlas matched the checked build; one app script.
Direct Worker GET remains blocked by this environment's tunnel403; no paid AI
inference or hardware FPS claim. Final evidence commit d259c323876187606fa9512baff0b59c7d83845c,86 entries
byte/Git-tracking verified. This incremental art release is not fullV6 or user
visual approval. WIP branch fast-forwarded without file changes to published
main, retaining checkpoint history and all old worktrees.

## 2026-11-19 — V7 supersedes fourteen independent rooms

The user supplied the full V7 consolidation and visual implementation protocol,
a new1536×1024 façade/8-room concept and a screenshot showing low room roofs.
Eight rooms replace14 physical pavilions, while historical services/ledgers
remain compatible. Higher real ceilings and protected Midnight/Golden materials
are explicit requirements. Branch codex/spa-v7-consolidation starts from6e28f75.
PhaseA prototype01d0ae4 has a connected shell/three slabs/real basin and stair
openings; defaultproduction6 remains until compatibility/runtime stages pass.
Coarse layout clearance allowed300×132 within existing bay, no terrain/Mall
change. Active native capture and next actions are in CURRENT.

### 2026-11-19 — V7 physical occupancy and visual checkpoints
PhaseB actual native on772a631 shows a real common shell/entry but remains bare,
not approved. Three frames and exact bundle/source archived in active code branch.
V7 aliases reserve canonical physical seats, with historical service IDs separate
for the existing ledger. Retired paid services redeem one Midnight rest admission
using their own original receipt; they are not sold or credited new coins.
Runtime accepts this optional contract; existing production6 remains unchanged.
15 targeted checks pass; furnished seven-view nativef85bc69 is running.

### 2026-11-19 — V7 ceiling/route and compatibility checkpoint4f69e9f
Actual C screenshots exposed flat Thermal/oval room caps/curtain obstruction.
Candidate now has true double-height void and two real balcony receivers,
full-outline high starvaults and independently sorted three sky-pool optical
faces.96contact/stairs sweepsPASS. Actual lift test caught unsupported waiting
location after lateral entry reroute; supported physical waitingpoints fixed
without reducing radius/returnassertions. SPA-specific spaLayout7 marker keeps
existing atomic timestamp merge; removed-room recovery uses a supported public
hall.13actual reference views are running, not accepted/published.

### 2026-11-19 — V7 exact9probe bake and safe interrupted procedure saves
D13frames revealed real roof/coping defects;4d85624 fixes realgeometry with14m
rise/10.8mroomminimum/roofspring46 and true skyaperture.32targetedchecksPASS.
Nine-room+sky probes captured exact4d85624, no moving actors/feedback, promoted
with01443cd814ef atlas and complete native-nine-probes source/byte evidence.
664a7c7 preserves interrupted raised/wet procedures using dry supported save
approaches, without moving live cats or changing original receipt ledgers.
Asynchronous layout repair yields to newer commands; nine reflection/reload
checksPASS. Required actual functional/native/ownership/finalimages/CI pending.

### 2026-11-19 — Actual V7 services and interrupted SQLite session verified
The first real run on664a7c7 completed eight canonical services, eight VIP baths
and the sky pool, then exposed a Float32 coping/floor seam at the wet Cafe exit.
534f3a9 repairs the physical seam with a 25mm underlap and 6mm recessed outer bevel,
only in V7. Full-body collision remains enabled. All14 pool runtime/geometry exits
pass; the remaining native Cafe/prepaid/shore lift/stairs/interrupted pool reload/
desktop W/Cloud download scenarios also pass. Exact evidence is in the code branch.
Final visual views, phone/ownership and complete release gates remain pending.

### 2026-11-19 — V7 release merged, publication still gated
PR#2 regular merge c477057 has parents6e28f75 and1a32b17; exact tree equals the
checked candidate, public sources equal f043655. All native procedure/transport/
reload/backup/phone/ownership checks completed. Phone's first fixture hit a real
column0,234; the collision was retained and the real open hall0,238 passed4m.
189 manifest entries and30 explicitly retained logs are in Git. Main workflow
44579271016 is the publication gate; predeploy HTTP still showed the stable old
bundle, so no publication claim is made yet. Release evidence stays off main.

### 2026-11-19 — SPA V7 publication verified
Main c477057b6eda6e251f02bc27735e4220d737112b completed workflow44579271016
SUCCESS for test/deploy/Pages, exact Worker release and shared saves. Actual public
HTTP17:54:13UTC matched Node22 HTML/JS/CSS/new9probe bytes, one application module.
Receipt b91350c04fc29ad93c72e8cca38ab14c75f785e0 on separate release-evidence branch.
Native phone CSS also matched live. No extra main deploy for documentation. This
publishes the checked structural8room/3floor SPA stage, not artistic completion
or user visual approval, hardware phone/Mac FPS or all84motion certification.

### 2026-11-19 — V8 freezes V7 layout and concentrates on authored interiors
User V8 and the new photo tutorial preserve the existing eight rooms, their
positions and entrances. Code WIP ae0e7ba on codex/spa-v8-visual-overhaul freezes
actual physical centers and all96 contacts/14 basins/stairs/approach against
published c477057. Room marker world transforms and physical centers are distinct.
Reusable authored art, affected-route checks and repeated native reference review
reduce iteration cost; final offline probes follow art lock. No V8 publication yet.

## 2026-11-19 — V8 actual batch shadow fix и отдельный V11

PR#3 merged812c8a6; workflow44601625796 пока pending. Не путать merge/live/approval.
Actual final9PNG+phone и source matching сохранены fce0867 на release-evidence.
Пятно на дне было exterior shadow receive actual batch; f026 сохраняет SPA-only
sourcefalse после batcher. Финальный Thermal кадр без полигона. Общий batcher/океан
не изменены. Stage1/2 отвергнуты пользователем; final далёк от референса.
V11water-only изолирован codex/spa-water-v11: profiles+refraction utility remote97b6b1d.
Дальнейшая интеграция38поверхностей пока WIP. Один framebuffercopy для рефракции
всегоSPA закадр, без дополнительных scene renders/per-pool RT; надо измерять.
Текущая стабильная публикация всё ещё c477057 до exact HTTP подтверждения812.

## 2026-11-19 22:04 Kyiv — V8 опубликован, V11 и group-call отдельно

812c8a6723dcbe106b567da88e1c3e1b1e4e399d LIVE; workflow44601625796 SUCCESS всех jobs.
Фактические HTTP HTML/JS/CSS/atlas и одно подключение приложения проверены.
Receipt remote16526f9 на codex/spa-v8-release-evidence; хеши в CURRENT.
Бесплатный вызов Чичи уже live. Последующий group-call свободных жителей
разрешён пользователем и включён в отдельный V11 WIP1e6d6fd; не приписывать812.
V11 stage1 native8views технически PASS, художественно всё ещё не принято.
По новому Thermal кадру укрупняем caustics/делаем мягкие отражения и метрику.
Group-call исключает work/sleep/manual/занятость, делает конечную очередь с4
активными journey и native lift/physical dry parking, без покупки/LLM.
Текущая stage2 native проверяет actual38profiles/copy/frame completion и2
живых жителей. Не объявлять результаты до завершения и просмотра.

## 2026-11-19 — V11 проверен и слит, ожидает полного deploy gate

PR#4 main9e26f331d91d3ad85e2c0f15b5a6a4e63106e5ce, кандидатd24d343, treeequal.
Workflow44612746706 идёт; до actualHTTP stable812.12targetedchecks/build PASS,
actual8water views/2final lamp views и2native residents through lift PASS.
Failedgroup fixtures отдельно заархивированы; причина jobs.has vs actualjob/
manual + private rest setup/runtime mismatch. Парковка physical path со stairs,
acceptedqueue hold, continuous supported idle до новогоowner. Никаких fees/LLM.
Все443 finalphone modules match main; heldtouch/World PASS. Камера/свет/DPR двух
matched views равны812.0 extra scene renders, один measured desktopcopy11.55MB.
Частицы VIP+Cafe в прежних192/96, no hardwareFPS/visualapproval claim.
Staticroom probes не являются dynamiccatreflection, SSR живых котов не добавлен.
Code/evidence/checkpoints remote. После fullSUCCESS проверитьHTML/JS/CSS/atlas
bytes и лишь затем отправить9e26f33 ссылку пользователю.

## 2026-11-19 23:11 Kyiv — V11 опубликован и actualbytes подтверждены

main9e26f331d91d3ad85e2c0f15b5a6a4e63106e5ce LIVE, workflow44612746706
SUCCESS всех GHA jobs. HTTP HTML/JS/CSS/roomatlas/sharedfield verified, одно
app подключение. Полные hashes и receipt 2bf67d2e8c5a426f16ee7a279d72f587677e0959 в CURRENT/evidencebranch.
Проверены finalphone443sourcehashes, group2nativearrivals/repeat/nocharges,
matched camera/light/DPR Thermal/Golden.12targets/build/fullCI PASS.
Не утверждать artist likeness/user approval или hardwareFPS. DynamiccatSSR
не добавлен, retained V8 atlas не свежий V11liner capture. Продолжать с этого
этапа по конкретному feedback, не перестраивать весьSPA.

## 2026-11-20 — V12: дальний Warehouse, берег можно перекроить

WIP codex/v12-island-warehouse от live9e26f33. Один exterior без интерьера/AI/
транспорта. Реальный edgegap2–3Warehousewidth. Последнее уточнение пользователя
отменяет сохранение кольца: берег можно менять как угодно, именно ТРЦ и SPA
должны остаться невредимыми. Покупки/кошельки/сохранения защищены независимо
от новой географии. Пока не опубликовано и не visualapproval.

## 2026-11-20 — окончательный общий контур, здания на месте

Пользователь выбрал2×ширину/длину Warehouse, затем подтвердил: главное одна
лагуна без малой полукруглой чаши; ТРЦ/SPA можно оставить на месте.1ec45e8
содержит единый enclosing contour, реальные neighbour guards, cached radialLUT,
исходные roots сохранены. Только новое здание увеличено. Малые варианты512/5aa
не публиковать как финал. Полная промежуточная история сохранена отдельно.


## 2026-11-20 — одна лагуна без малой чаши, финальная проверка

Последнее явное решение пользователя: общая лагуна; Mall/SPA можно оставить на
месте. Реализовано1ec45e891c0eeb126462800106e83202ee4a7e4e: один enclosing contour
без малого cup/neck, внешний берег большого водоёма сохранён. Warehouse480×240м,
edge gaps1773.7/1785.1м (>3новых платформенных ширин). Это exterior-only phase1.
Desktop9ракурсов и отдельный touch390×844/DPR2/настоящая кнопкаОстров PASS;
447publicmodules совпали сsource,149защищённых файлов совпали сrelease9e.
Evidence37c208e6e65f4c7dc66c24572d3072dab3ab83ad вcodex/v12-unified-evidence.

Во время ожидания fullCI44713392228 пользователь сообщил, что видит кольцо.
ActualHTTP подтвердил: Pages ещё отдаёт./dist/app.js?v=593013c89da9d392,
то есть прежние production bytes. Сообщили это пользователю прямо: новая
геометрия пока НЕlive, внутренний разделяющий берег удалён вcandidate, внешний
берег большой лагуны остаётся. Не объявлять визуальное одобрение или hardwareFPS.


## 2026-11-20 — пользователь подтвердил проблему на новом screenshot

Предыдущее объяснение об oldlive оказалось ошибочным: фото в чате показывало
candidate1ec45e8, где12старыхheadlands всё ещё окружали Mall/SPA. Ошибку признали.
Вa615133 удалены10внутреннихcrown и ихподпорки, сглажен старый q=.7..1 slope,
контакты плавания/подлодки используютactualbed. Native9views обнаружил резкий
стык с protectedbuildingbed;9d81059d67249b024635a6c4d502c8d55a0e4d91 добавил
90мsmoothshoulder с точными прежними высотами внутри foundation. Новые57checks
PASS, offlineprobe4fa4e0cc0c7f. FullCI и finaldesktop/touch ещё pending — CURRENT.
Не выдавать intermediate0ba9e549ed5221f61435679625719dbabc4d23fa за финальное
одобрение. Старые истории/исходники/PNGs сохранены в remote.


## 2026-11-20 — V12 слит, публикация ещё выполняется

Полный CI44732308801 наca08b43ecee9fcf94aeca81abfe390434687e049 SUCCESS.
PR5 слит2026-11-20T12:19:24Z, origin/main теперь
1ebc94cb7c38d26aca2d87c7404d1380a8df33ac. Проверен одинаковый trackedtree
63a12037f735a6d502ed2534e15e28218d39dd39. Никакие новые правки игры не вошли
при слиянии. Основной workflow44734816312 ещё работает; liveпубликация не
подтверждена. После успеха обязательныactualHTTP hashes и запись полногоSHA.
Evidence2a0dd26d6d1ef5dacff96d61dc4a608fe75171a8 вcodex/v12-final-release-evidence.
Существующаяsession22834 сама ждётmainCI и запускаетGETverifier; не дублировать
merge/deploy. Native/source/ошибочные стадии сохранены отдельно.

## 2026-11-20 — ограничить следующий выпуск тремя отмеченными скалами

V12 опубликован1ebc94c, HTTPassets проверены. Новая фотография/прямая просьба
пользователя ограничивает scope IDs0,1,11:убрать геометрию и реальные коллизии,
не менять дно/здания/остальные9скал. Authored field оставляем для стабильных
адресов декора, active field используем для видимости/движения/оптики.
Широкая выемка перед SPA сохранена в отдельной ветке18c1e57, PR#6закрыт.
Это не удаление SPA и не перенос зданий. Следующие проверки/публикация — CURRENT.

## 2026-11-20 — убрать выступающий серый cap старой декоративной основы

Новое уточнение пользователя после одобренного удаления3скал:видна серая зона
справа под скалой, «го» на исправление. Node/native camera rays точно попали в
старый cone capY=-200 перед настоящим дном~-204. Решение:опустить ТОЛЬКО
декоративную нижнюю основу12м. Высоты/геометрия физического дна,здания и9скал
не меняются. Новый тест проверяет actual mesh intersections в4серых пикселях.
Обновление staticprobe выполняется по настоящим producers. Статус — CURRENT.

## 2026-11-20 — публикация407e427 и компактные venue buttons

Удаление3скал+сераяcone-зона опубликованы407e427:workflow44742914000весьSUCCESS,
actualHTTPbytes/одноappподключение проверены. Source9bf328c.Native/145protectedexact.
Следующая явно запрошенная задача:3компактных SVGлоготипа ТРЦ/SPA/Warehouse с44pxhit
и подсказками; Warehousebutton реальнонаводиткамеру,не добавляет интерьер/покупки.
Камера строится поactualbbox,подходитсзападачерезводу,приhandoffотпускаетстарыйowner.

## 2026-11-20 — компактные кнопки и камера Warehouse опубликованы

Main b995a82d21dbc788357a9c048e12dfcf2bcbd4fb, source c4d2f18cb4ba541398378d23c10ad3ffce608f49,
PR #8. Workflow 44746802316: test/deploy/pages SUCCESS; actual HTTP и одно
подключение приложения проверены. Три SVG-логотипа с 44px hit areas, ARIA/title;
Warehouse camera использует настоящий bbox. 18 targeted + 3 optics + Node22
build, полный main CI и Native desktop/phone с реальными кликами PASS.
449 модулей каждого прогона совпали с source. Сохранения и геометрия прежние,
исправления скал/серой основы из 407e427 сохранены. Художественное одобрение
новых кнопок пользователем ещё не получено; физический FPS не измерялся.

## 2026-11-20 — расширить и детализировать фасад Warehouse

Новая прямая просьба заменяет раннее «Warehouse не менять»: ×2,5 по ширине и
высоте вместо первоначального ×1,5. Глубина и центр прежние, стеклянная форма
служит одобренной основой. Рамы/фонари/портал/карнизы — статические общие batches,
без новых point lights, интерьера, AI или покупок. Защищены ТРЦ/SPA/котики/сохранения.
Увеличенная основа накрывала2сада: отодвинуть только их, сохраняя ID и количества.
Старый относительный зазор3ширины несовместим с новым ×2,5 при прежних центре и
лагуне, поэтому новый фактический критерий >=1300м записан явно, а не скрыт.

## 2026-11-20 — Warehouse ×2,5 и подробный фасад опубликованы

Main f28975bd8c2cf1cd7d94c61239ab8f98f7dbc96f, source139c68af0dabcacb76d47d3bd83f5f722ca7fa01,
PR#9. Workflow44755743721: test/deploy/pages SUCCESS, actual HTTP hashes и одно
приложение проверены. 27focused checks, Node22 build/full main CI и реальные
Native desktop/phone проверки PASS;450modules каждого прогона exactsource.
Сохранены глубина/центр/стеклянная форма; ширина/высота ×2,5 относительно b995.
Фасад усилен статическими деталями и отдельным fog cap.32; глобальная вода/туман
не изменены. Только два сада с прежними ID отодвинуты от большей основы.
Новый фасад ещё не одобрен пользователем; аппаратный FPS не измерялся.

## 2026-11-20 — очищенная широкая вода вокруг Warehouse опубликована

Фото f28975b отмечало8конусов и расширение обоихберегов. Sourcec8a0000, PR#10,
main7a0e1f3daf8afd0629d60d7a3cb0aa147b2a02f4, workflow44794849010 SUCCESS, actualbytes/одинapp verified.
8mounds/72crownrocks удалены;384corals/60fish/3buildings сохранены. Общая площадь
4.539→5.848км². ПриX2200 вода шире на445м, с обеихсторон. Housing/neighbours
сохранены. Old+newcontour union исключает уменьшение прежней воды.
Nativeheldinput выявил пропущенную старуюграницу explorercamera; исправлена
вместе со swimmer/submarine/restore/manualentry. -198мsavecutoff не позволял
сохраниться у actualdeepfloor, теперь bound=bedY-5.61focusedtests/fullCI и
реальные desktop/touch/deepdive/2reloads накаждом PASS. ТочныеQA/source/bundle
и промежуточная failedстадия сохранены. Новыйвид не одобрен пользователем;
hardwareFPS неизмерялся. PaidAI/liveplayerworlds не использовались.

## 2026-11-20 — новый M2 FPS report привязан к опубликованным байтам

App1f35c6c1ed6c391f соответствует7a0e1f3.24.64FPS vs13.53, но lastframe triangles
2.386M vs15.33M иcalls380vs1401 при неизвестнойкамере — это не контролируемый
приростскоростикода. Rendererstalls3.512/2.913с иcoldloadsдо22.94с остаются.
ИсходныйJSON/hash/таблица сохранены вQA/user-fps-7a0e1f3. Новый runtimechange
не делался. Не выдавать этот разбор за устранение зависаний или одобрениевида.

## 2026-11-20 — измеренное исправление renderer stalls и cache revalidation

По прямому «фиксь» опубликованная7a стала baseline. Полные CPU traces выявили
native geometry sphere scans в renderer/projectObject:16661.90мс/4views.
Выбрана точная кооперативная подготовка до root reveal, без изменения geometry,
DPR, воды, котиков или culling semantics. Intermediate935 подготовка17867.10мс
заменена finalb9 Float16 lookup/typed reads:7128.13мс; lazy renderer97.41мс.
Это software CPU diagnostic, не физический M2 FPS. Lossless WebP4–6% отклонён.
Для неизменяемых hashed public assets выбран native force-cache; API, abort и
explicit cache сохраняются, новая DB/service worker не добавляются. Coldnetwork
всё ещё может быть медленной. PR#11 merged main6ccec70440b551ff6c3c06a98945ff7d5d168db0,
workflow44804905460 test PASS; deploy/live/phone на момент записи ещё ожидаются.
Exact sources/profiles/PNG сохранены. Нет обхода branch checks/admin merge.

## 2026-11-20 — исправление stalls/cache опубликовано и сверено

Main6ccec70440b551ff6c3c06a98945ff7d5d168db0, sourceb9f681aadb42f7d89914fcc57da8b17f70605055,
workflow44804905460 test/deploy/pages SUCCESS. Actual HTTP22:03Europe/Kyiv:
JS0e305ce4212c504f7e2b40fb9dff8d55f093b70a136e5cb809c8b708f12fac0c,
CSS1fd2857ef1fbaedd5e7a34a5082a77ff49bcf7f1c7030d5292502753b86967d0,
HTML27d48bbe9ad72f2b7dd19b00ec008b29a620c6e8b32e1642fa11812c3cd96444,
одно app подключение. Assets/вода/котики/тени/DPR не менялись.
Final native19+2islands/phone8heldtouch/deepdive/2SQLite reload PASS, exact453
publicmodules каждого capture. Кошельки/inventory/placements прежние.
Полная QAдоказательная база и failed wrongmode attempt сохранены отдельно.
M2FPS ещё не проверен новым report, художественного одобрения не получено.
