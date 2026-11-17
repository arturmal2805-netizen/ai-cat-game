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
