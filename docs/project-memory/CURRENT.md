# Текущий статус

21 ноября 2026, Europe/Kyiv. Каноническая память — `codex/ocean-recovery-memory`.
Приложение в ветке памяти старое: актуальный код указан ниже.
[Предыдущие checkpoint и неуспешные попытки](history/CURRENT-before-toolbar-camera-publication-2026-11-21.md).

## Активная работа — V14 (ещё не опубликовано)

22 ноября2026, Europe/Kyiv. Source `/workspace/chichi-v12-island-warehouse`,
ветка `codex/v14-waterfront`, remote HEAD **56f305e21abf87a1be8f40ee2c3761a6a840d110**,
runtime producer **8e3a4d321f253f7ea5b39a2877bec849a0e21c52**. PR#17draft.
Full request `docs/specifications/waterfront-v14-2026-11-21.md`; contract ac99f40.
Новая зона autumn-local `[1140,-342]`, старые комплексы/их камеры не менять.
116 source hashes совпали; native exact buffers/materials/transforms/light/DPR
старых3зданий при общем animation time7 совпали с опубликованным d0d944a.
Inline reference просмотрен; байты недоступны, не выдумывать original image hash.

First-person от настоящих глаз Чичи, V/кнопка1↔3, реальный WASD/touch, held Space/
кнопка для возрастающих прыжков, подготовка/полёт/контакт/приземление approved rig.
Water action сохраняет first-person через погружение/swim/автовозврат. UI44px в
видимом viewport. Уникальные dry reservations для airborne saves/rest-height на
деформируемой сетке. Все свободные + forced busy Чичи, очередь6активных, без дублей.
Persistent8-node springs/120Hz, единая CPU/colour/depth деформация. Corrected
upward triangle winding: старая сине-чёрная сетка была backface shading defect;
независимый normal/triangle/ray test воспроизвёл ошибку и теперь PASS. Third-person
pitch ограничен при возврате после look-down, остальные режимы прежние.

**62related checks PASS**, Node22fullbuild PASS. App JS SHA256
**aa2a920989f5f7a5bc63c487218f4cf2b7daa7752adcbbbd7b29f1b15ee01b2f**,
CSS **ed0f6fc4c986acd5e3ad1ee3d6d70ad7e36cea229f266afc45c618feab881f7a**,
одно app. Final native `/workspace/qa/waterfront-v14-release-desktop`, session64178,
идёт на clean56f305e. Не изменять public/build до окончания hardlinked QA.
Затем подготовленный `check-waterfront-v14-phone.cjs`/`waterfront-v14-phone.mjs`:
реальные held touch/look/V/dive/44px, один GPU за раз. Full CI/обычный merge/main
workflow/actual live HTML+JS+CSS+assets+Worker SHA ещё впереди; PRskipped не publish.

Предыдущий d2e9native дал19views/exactprotection/group13active6/реальныйWASD/
7hops2.60→43.69m/V/nativeeye/waterentry/swim и24framesvideo. Балансы/инвентарь/
личные кошельки прошли reload. CatLocations equality после автономногоRAF FAIL:
котики успели начать обычное движение, занятая Чичи работу. Не считать этот run
полнымPASS. Следующий audit останавливает только autonomousRAF ДО первого кадра
reload и сравнивает initialnative координаты/yaw/полные game locations и банки.
Нормальную автономию в product не отключать. Raw failed attempt/source/helpers/
PNG/video/timedbaseline сохранены [в QAархивах](../qa/2026-11-22/waterfront-v14/).
GTA6/точное сходство/60FPS — не подтверждённые обещания, user visual approval нет.

## Опубликовано

- Main: **d0d944acdc83ab69c1337d85e77c0471b044cb7a**.
- Итоговый source: **5c198b50bbf986f1381d5090abfc8b9f2a93d4f9**, ветка `codex/venue-camera-validation`,
  worktree `/workspace/chichi-v12-island-warehouse`.
- Реализация камер: `de479f16eaaefac390110a4dd284f7a63a11bcc4`, PR #15.
  Source `5c198b5` добавляет только исправление двух тестов, PR #16.
  Оба PR объединены обычным merge без admin/bypass.
- Source/main tree: `48ba046378769439b40426a0ff048f8056b44994`.
  Public tree реализации de479, итогового source и main полностью совпал.
- Workflow **44930181677**: test/build/deploy/pages SUCCESS, проверки точного
  Worker release и shared saves PASS. Routine deploy не вызывает платный AI.
- Actual HTTP: **2026-11-21 19:45 Europe/Kyiv**, HTML/JS/CSS/coast/reef/SPA/wind совпали с
  ожидаемыми байтами; **одно подключение приложения**, правильные versioned URL.

[Игра](https://arturmal2805-netizen.github.io/ai-cat-game/?v=d0d944a) ·
[FPS-диагностика](https://arturmal2805-netizen.github.io/ai-cat-game/?v=d0d944a&profile=1) ·
[Workflow](https://github.com/arturmal2805-netizen/ai-cat-game/actions/runs/44930181677) ·
[HTTP receipt](../qa/2026-11-21/venue-camera-latency/live/live-verification.json).

- JS SHA256: `21fc1aa9e5cc509119d0d4e914216f970c5326cb370ac2c364ed317da309b95a`.
- CSS SHA256: `1fd2857ef1fbaedd5e7a34a5082a77ff49bcf7f1c7030d5292502753b86967d0`.
- HTML SHA256: `4085bc29c681fd0efa0e3c602855f00ddc8083abab806d27ccc6582beda7e634`.
- App: `./dist/app.js?v=21fc1aa9e5cc5091`.
- CSS: `./style.css?v=1fd2857ef1fbaedd`.
- Полные хеши остальных ресурсов — в receipt. Исходники моделей/текстур прежние.

## Исправление задержки верхних кнопок

Игрок на 15cb/appfec56d сообщил: прироста FPS не ощущает, камера после нажатия
верхней иконки иногда наводится только через 5 секунд. Mall/SPA ожидали весь
ensure() — модели, assets, staff, navigation и runtime — до передачи команды
камере. Кроме того, старый pending request мог завершиться после выхода и
перехватить уже выбранную новую камеру.

Теперь разрешённый camera intent передаётся синхронно; полная native подготовка
моделей и ограничения услуг/покупок сохранены. Каждый новый запрос и exit
инвалидируют предыдущую версию: поздний success/failure не возвращает старый
ракурс. Cold SPA сразу использует актуальные 8 зон и palace-v7 framing; legacy
alias уточняется после подготовки только для последнего запроса. Follow/manual
освобождают SPA inspection. Warehouse повторно использует точный native vertex
bbox по immutable model identity и world transform; выдаёт clone, пересчитывает
при перемещении/замене модели. Геометрия, материалы, DPR, вода, тени, котики,
физика, AI, экономика и формат сохранений не менялись.

## Что проверено

24 связанных Node-теста PASS: камеры, v7 services, exact cached bounds без
повторного vertex scan, фасад/исходные размеры/координаты, рифы и open water.
Full Node22 build был выполнен до небольшого уточнения cold menu; финальные
runtime/Worker пересобраны. Итоговый main CI заново выполнил полный build/test.
Sculpt cache остался `sculpt-v2-a496203fa13a037a7a10a927`.

Native desktop/phone: реальные cold toolbar clicks до готовности модели,
Mall/SPA/follow/Island handoffs и отсутствие позднего перехвата после подготовки
PASS. Cold camera intent в финальных captures: desktop0.7ms/phone0.5ms внутри
обработчика. Это задержка команды, а не время загрузки моделей/первого GPU кадра
и не аппаратный Mac benchmark. Warm bbox/framing/8 углов и 44px targets PASS.

Все 19 островов + 2 возврата: full native RAF/DPR2/реальные mouse orbit/zoom PASS.
Только предварительный QA warmup выполнялся с paused raster для software GPU;
измеряемые кадры, очередь, качество, input и проверки не упрощались.
Phone 390×844/coarse/DPR2: product overview/полный Warehouse, 8 held-touch
crossings, dive ниже -200m и 2 private SQLite reloads PASS. Балансы, inventory,
placements и личные кошельки сохранены. Нет JS/HTTP/GL ошибок/context loss.
Каждый из 453 public modules каждого capture совпал с итоговым source; исходный
capture HEAD оставлен в qa-build.json. Добавленные позднее изменения касались
только тестов. QA использует private Worker/SQLite, один GPU browser за раз.
[Все исходники QA, JSON, PNG, хеши и неуспешные попытки](../qa/2026-11-21/venue-camera-latency/README.md).

Первый main workflow44928862404 завершился ошибкой npm test до deploy; deploy/
pages были skipped, новая версия тогда не публиковалась. Raw CI logs недоступны
из-за сети; локально воспроизведены два старых file-hash freeze checks, запрещавших
разрешённые изменения camera/controller modules. PR #16 уточнил только эту
границу; исторические fixtures и проверки самих моделей/экономики/saves сохранены.
Локальный первый full suite был прерван для этого уточнения и не считается PASS.

Две ранние QA попытки использовали скрытый dialog control, затем скрытую кнопку
Mall после ухода за котиком на другой остров. Их логи сохранены; corrected test
использует реальные видимые кнопки и возврат на autumn tab. Phone camera substage
прошёл; затем combined fixture получил locator timeout при повторном входе в V12.
Движение и сохранения проверены отдельным исходным phone-world fixture без
изменения runtime. Эти отдельные статусы не выдавать за успешный combined run.

## Что пока не подтверждено на устройстве

Последний физический M2 report — 15cb/appfec56d: 29.12FPS за10.267s,
1266RAF за45.183s; 2.586Mtri/744calls, GPU10.66median/17.53p95ms;
worst session framegap2099ms/eventloop1926ms, renderer max765.6ms, shader pending2.
В rolling window нет refaults, но это не доказательство быстрой камеры. Камера
отличается от прежних19.38Mtri; не заявлять контролируемый FPS gain. Отзыв
«прироста не было» принят как результат. Новый аппаратный report ещё нужен.

Следующее: те же верхние кнопки на Mac после полной загрузки и при cold/transition,
отчёт с app`21fc1aa9e5cc5091`. Не обещать 60FPS/идеал/отсутствие всех пауз.
Early intent не ускоряет саму постройку или сеть. Native/CI PASS не является
визуальным одобрением Crimson Desert. Диагностика только opt-in, one-shot,
закрываемая; обычная игра её сама не включает. Новые изменения без новых данных
не начинать автоматически.

## Сохранённые прежние решения

15cb5b4/sourceb679: bounded idle cache над уже pinned working set; controlled
82,211,624B меньше refault uploads при том же пике616,583,450B и сохранных pixels/
cats. Это resource fix, не обещание FPS. 1e0/sourceba2: Window MessageChannel FIFO
раньше scheduler.yield; прежняя8.9s пауза не повторилась в следующем54s сеансе,
но меньшие задержки остались. Эти изменения не откатывать без доказательств.

c199/sourcefef: async root/shader preparation и анимированные native cat shaders.
6ccec/sourceb9: exact static bounds и force-cache только hashed public assets.
7a0e1f3: удалены8 Warehouse mounds/72 crown rocks, сохранены384 corals/60 fish;
лагуна4.539→5.848км², исправлены common water/camera/save depth границы.
f28975b: Warehouse×2.5 width/height, исходные depth/centre и glass/gold facade.
b995a82: три компактных44px SVG venue кнопки. 407e427: удалены old reefs0/1/11,
остальные9 сохранены, grey underside заглублён на12m. ТРЦ/SPA/Warehouse не двигать.
Broad SPA excavation parked: `codex/v12-spa-approach-visibility@18c1e57`, PR#6
closed/unmerged; редизайн ТРЦ исключён, Warehouse interior не запрошен.
Crimson Desert — visual target, stable release — regression baseline,
d6fa805 — historical technical base. Не удалять старые worktrees и существующий
`scripts/__pycache__/` в ветке памяти. Подробная история — ссылка в начале.
