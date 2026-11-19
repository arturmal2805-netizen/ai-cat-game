# CHICHI CAT SPA & WELLNESS RESORT

Новый запрос2026-11-18: самостоятельный живой подводный курорт перед ТРЦ,
не редизайн ТРЦ и не замена старого Cat SPA (biome water).
Полное исходное задание: [specification](../../specifications/underwater-spa-resort-2026-11-18.md).

Референсы: два оригинальных изображения из сообщения пользователя2026-11-18:
1536×1024 «СКРИПТ: СОЗДАНИЕ МЕГА-СПА», 1672×941 общий янтарный SPA с ТРЦ
справа сзади. Оригинальные пиксели пока существуют в сообщении, не в Git;
не выдавать новый рендер за сохранённый исходный reference. Сохранён полный
текст пользовательского документа (Sediment file_0000000006a08210a3b0f82f63909184).

Цель: холодный бирюзовый океан/бассейны, тёплые янтарные настоящие интерьеры,
мрамор, металл, прозрачные кошачьи купола/уши, розово-лиловые акценты, сакура,
звёздные потолки. Не превращать всё в розовую заливку/эмиссию. Композиция
многоуровневая, с наполненными комнатами, террасами/мостиками/водопадами.
Не обещать сходство и deviceFPS до реальных кадров/замеров.

Минимум12 функциональных зон,6 массажных кабинетов,4–6 стеклянных кабин,
3 основных уровня, отдельные Amber/Midnight/Golden Galaxy звёздные помещения.
Одна настоящая утверждённая модель каждого кота; без декоративных двойников.
Внутри герметичных комнат сухая ходьба; бассейны — собственные водные объёмы.
Морские существа остаются снаружи. Реальные входы/выходы/лестницы и full-body
проверки маршрутов/мебели, никакого отключения столкновений/телепорта.

Расширять существующие leisure/runtime/AI намерения и кошачьи кошельки,
покупки, receipts и потребление услуг. Никакого отдельного LLM/платных QA-вызовов.
Проверять баланс/занятость до процедуры. Бронь Reserved→Occupied→Cleaning→
Available; Unavailable при недоступности. Прерывание освобождает место.
Покупка/эффект идемпотентны при reload/повторе. Не менять глобальный merge
ради нового поля. Обычные работа/дом/ручной режим имеют единственного owner.

84 перечисленных действия — плавные фазы реальных процедур, не84 случайных
названий одного idle. Поддержка лап/стола, синхронный массажист, вход/выход
из воды/отряхивание, социальные контакты, сон/просыпание, reduced motion.
Фиксированные GPU buffers, shared materials и water core, bounded прозрачность,
локальные эффекты и свет. Не менять глобально DPR/кошачьи модели/качество теней.

Готовность требует настоящих browser кадров всех перечисленных помещений,
полных процедур и ожидания/отмены/повтора/reload с приватным SQLite, camera
isolation, Node22/full CI/live assets. Пустая архитектура не завершённый SPA.

Уточнение пользователя2026-11-18: в КАЖДОЙ зоне нужны разные милые подробные
анимации и собственный цикл. Бассейн: проверить воду→реальные ступени→гребки→
бортик→выход/отряхивание; джакузи: посадка/пузырьки/лапка/спокойный отдых;
массаж: приветствие/поддержка стола/согласованные лапы массажиста/потягивание;
сон: укладывание/дыхание/уши/пробуждение; сауна: скамья/дыхание/пар/охлаждение;
салон: зеркало/расчёсывание/лапки/реакция. Это требуемые циклы, НЕ отметка
об их реализации. Проверять нативные позы, контакты и плавные переходы.


## Интеграционные правила из нативных проверок 2026-11-18

- Авторский z SPA и ocean-local z различаются на RESORT_SPA.offsetZ. Высоты
  сохранений/runtime абсолютные, навигация root-local (p.y-RESORT_SPA.y).
  Сдвигать только новый SPA; не менять координаты старого ТРЦ/островов/покупок.
- Вход с пирса использует actual navigationSurface/rails/poles и физические
  placement obstacles. builderObstacles включает water/pier reservations и
  не годится как список стен. Делить только настоящие пересекающиеся сегменты
  pressureglass по polygon-intersections; сохранять внешнюю оболочку/радиус.
- Dryfloor под водой нужно распознавать реальной опорой ДО ocean-depth
  takeover. Отдельный inspection освобождается при ручной ходьбе, рендерный
  cutaway не удаляет пол/стены/логику. Native heldtouchW проверяет движение,
  но World-owner=false ещё не доказывает самостоятельное следующее действие.
- Rest support работает только временными родными суставами/трансформами.
  Проверять реальные skinnedvertices и контакт при укладывании/пробуждении;
  перед CPUзапросом обновить nativebindMatrixInverse через updateMatrixWorld.
  Не менять модель/геометрию/cacheversion ради позы. Подготовка hull/probes
  идёт кооперативно, continuouspose не загружает GPUvertices.
- Coldlift recovery использует существующие catLocations: точные кресла,
  согласованная высота, уникальные IDs/места. Проверять атомарно ДО изменения
  моторного состояния, сохранять высоту/закрытые двери во время подготовки,
  затем настоящий подъём/проход наружу. Nativehero test не подтверждает
  четыре одновременных гостя, midprocedure/water restore или полный автономныйтур.
- Каждый архивный nativeпрогон закрепляет свои фактические source/bundle/PNG.
  Более поздние material/UI/controller правки требуют нужного нового сценария;
  не повторять все незатронутые процедуры и не приписывать старому PNG новыйкод.


## V6.0 — действующее уточнение 18 ноября 2026

Полный новый документ: [V6](../../specifications/underwater-spa-v6-2026-11-18.md).
Он заменяет ранний художественный объём задания: 14 существующих IDs сохраняются,
горизонтальный дворец с центральным прозрачным куполом, тремя уровнями, крыльями,
разными интерьерами и верхним закрытым бассейном с настоящим стеклянным дном.
Root, navigation/runtime, кошачьи модели и покупки сохраняются. Территорию расширять
только если реальная планировка не помещается; не глобальным scale и не за счёт ТРЦ.

Новые изображения в сообщении V6: R1 Wellness Café с центральным аквариумом/рыбой,
R2 Aroma Therapy Garden с приватными стеклянными беседками, R3 повтор R1,
R4 Golden Galaxy VIP с тёмным звёздным потолком, R5 общий трёхуровневый курорт.
Оригинальные пиксели доступны в сообщении; локальные оригиналы пока не получены.
Не выдавать новый рендер/описание за сохранённые байты референса. Реальные фотографии
SPA, упомянутые в тексте, в новом сообщении не приложены; не придумывать их.

Уточнение пользователя: смотреть КАЖДЫЙ референс на многих этапах строительства,
потом тщательно сверять и дорабатывать каждый. Требуется журнал R1/R2/R4/R5 ×
силуэт/планировка/материалы-свет/наполнение/финальный проход, с реальными PNG
кандидата и конкретными расхождениями. Удачный общий кадр не закрывает комнаты.
Кнопки «Сохранить текущий мир» / «Загрузить мир из файла» — в существующем «Облаке»;
полная поддерживаемая игровая схема, без секретов/исходников, checksum нового
формата, строгая валидация, подтверждение и резервная копия ДО замены.

## Зафиксированная технология V6, 19 ноября 2026

Отражения снимает scripts/bake-resort-spa-native-probes.mjs из настоящего
приватного native game scene:14room+верхний бассейн,128px HDR, octahedral
linear radiance/4, PNG sheet512px/15слоёв. Персонажи/SPA fish/вода скрыты только
для offline capture; renderer/light/visibility возвращаются в finally.
QA manualFrames останавливает simulation, но drawPaused должен быть false
для явных offscreen draws: иначе QA wrapper возвращает пустые captures.
Проверять реальные draw calls/nonempty RGB/GL errors, не только root.ready.
Не запускать второй GPU и не менять HEAD/diff/imported source во время capture.

Runtime public/resort-spa-reflections.js: одна selected-only/coalesced загрузка,
PNG и unpacked raw SHA256, decode без gamma/flip/premultiply. Независимые
слои DataArrayTexture128×128×15 RGBA8 (~1.25MiB с mipmaps), NoColorSpace,
общая immutable/sharedScenery текстура; нет gameplay CubeCamera/render targets
или per-frame upload. Недоступный/битый asset сохраняет предыдущий fallback.
Файл манифеста public/resort-spa-probe-assets.js содержит реальные SHA/order/
source revision. Room lamp ID1..56: каждая комната резервирует4, слой
floor((aMallRoom-1)/4); при изменении порядка зон проверить mapping и rebake.
Sky — отдельный слой14. Тот же core волн/Fresnel/глубины, только свой probe
для21SPA basins. Общие water-core/Mall/cats не менять. Сохранять прежние
shader hooks, native instancing isolation и уникальный program cache variant.

Первый реальный capture source3ab73cd, архив bbab0e6. Actual GPU/readback/
GLSL proof5adfcdb сохранён bd6195e. Это исторические captures ДО поздней мягкой мебели/галактики/новых полов.
Текущий capture уже ОБНОВЛЁН на sourceca0813f после gardens/furniture/floors:15layers,
PNG302059bytes c3beaca169a6462a0622a42858c67eec7bc14d61722b12d3530295de9c3b2cc0,
rawda49c948fe3bfaa711f85a1fc0cf05aa5f511949554ddfd9e4bdd350312eaf9c.
Реальная captureprovenance лежит в runtime manifest; исходный bake архив
docs/qa/2026-11-19/spa-v6-gardens-probes/native. Late waterUV/curvature меняли
толькоMASKEDводу, неstaticcapturecontents. Fresh actualGLSL/readback на4b72f2f
PASS; не переписывать sourceHead задним числом на новый runtimeSHA.
Будущий private baker обходит свой SPA probe loader, чтобы не отражать себя
рекурсивно. Все exact source/bundle/hash/PNG/log — docs/qa/2026-11-19/spa-v6-*.

Материалы: shipped CC0 Mall marble01 — бежевые плитки, не Calacatta.
Новые источники AmbientCG/PolyHaven API здесь blocked403; не выдумывать download.
Штатный velour normal/roughness можно переиспользовать через собственные clone
textures, с data NoColorSpace/GL normal, нейтральным SPA albedo и normalScale.32.
Walnut maps имеют kind warm, не несуществующий wood. Color всегдаsRGB,
normal/roughness без gamma; использовать metre UVs через существующий stamp.
Декоративные puffed pillows/tied curtains не меняют опорную геометрию кресла
или радиус/маршрут кота. Нижний край драпировки+.08м, высотаAroma2.7/Cabana2.8/
обычная3.6; проверять навес/рейку и пол визуально. VIP256px spiral chart —
собственная процедурная живопись на настоящем своде, не reference photograph.

Восстановление после рестарта: сначала branch/SHA/status/CURRENT и последние
логи. Готовые PNG/source/bundle сохранять отдельно от failed/interrupted,
недополученный итог не объявлять PASS. Продолжать только отсутствующие шаги,
сопоставив реальные source-files и bundle SHA, не переснимать всё автоматически.
Paid V6 audit fixtures фондируются только в приватном SQLite (6000хватает
полным процедурам). Нехватка тестового кошелька — precondition failure,
не повод менять настоящие кошельки/цены/проверки. Архив не включает SQLite,
секреты или world credentials; log force-add и manifest bytes/tracking обязательны.

Native/CI остаются техническими доказательствами, не художественным одобрением.
Все R1/R2/R4/R5 ещё требуют плотных садов/каскадов/связного дворцового силуэта;
проверять каждый на этапах. Mac/phone FPS не подтверждать по SwiftShader.

## Gardens/cascades и настоящие проходы — закреплённые контракты

16protectedraisedbeds и2three-tiercascades — новый ограниченный art слой.
Сохранять original21 bathingcontacts/14roomIDs и оригинальные модели. Цветы/листья
используют6fixednativeInstancedMesh batches, отдельные vertex/instance colours.
Присоединять после общего staticbake; не наследовать aMallRoom/staticrange hooks.
Не перестраивать geometry/instancebuffer perframe. Sourcebudget136576newtriangles
проверен, это не гарантия hardwareFPS. Не выдавать draw-trianglecounter зачисло
авторских треугольников: он включает повторныеpasses и движущиесяобъекты.

Каскады: реальные stonefoundations/linerbasins, frontcopingnotch иweir; sheet
начинается в настоящем водном крае, проходитнадweir, падает вне своейfoundation
и всей шириной попадает в следующуючашу. UV идёт downstream с общим flowclock.
Оставлять общийwatercore/roomreflection, отдельные масштабы/глубину, bounded4
impactvector updates. Нельзя waterplane поверхсплошногокамня или водопадчерезстену.

Aroma старыйplanter69,252 блокировалbridge mouth: перенос только этогоpot в
боковойсад, не удалениеполосы. Cabana frontpods4/5 требуют реального2.6m public
gangway междуcrosswalks; private rear glasswalls сохраняются. Potson3mкольце
подвешены на actual cornicearms abovebodyheight; не ставитьих назад впроход.
Навигация сохраняетradius.571/fullbody sweeps: lazy failed-edge cache/replan
bounded24, не costlysweep everyexpandednode и не discardingwholepath onfirstbadedge.
Проверять весьотрезок иreturn, не только свободнуюцель. Все28publicapproaches и
20defaultfixtures PASS; actualpublicAroma0/Cabana4 outward/return такжеPASS.

Проверенный4b72f2f native:16views,11dry+4wet, оплаты/receipts/privateSQLite reload,
Worldrelease иerrors[]/httpErrors[]; phone390×844/DPR2 heldtouch такжеPASS.
Это не полный84motion/everycontact/shoretour/hardwarecertificate. Артефакты
отдельно codex/spa-v6-release-evidence/docs/qa/2026-11-19/spa-v6-gardens-release;
добавлениеPNG в этуветку не запускаетновыйapplicationCI. Сравнивая source-files.json,
сравнивать key→hash mappings (insertionorder может отличаться), а actualQA bundle
— по байтам/SHA. Всефайлы/логи должны входить вmanifest иGittracking.

Повторная R1/R2/R4/R5 сверка оставляет явные art gaps: сады пока уступают
referenceплотности, общийsilhouette fragmented, Aromaобычныйкадр barelyexposes
cascades. Не выдавать такойкадр за close-up motionquality водопада. Следующий
art этап продолжает этиразличия, не начинает заново и не объявляетвесьV6готовым.
