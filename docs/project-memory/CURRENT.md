# Текущий статус

21 ноября 2026, Europe/Kyiv. Каноническая память — `codex/ocean-recovery-memory`.
Приложение в ветке памяти старое: актуальный код указан ниже.
[Предыдущие checkpoint и неуспешные попытки](history/CURRENT-before-toolbar-camera-publication-2026-11-21.md).

## V14 опубликован; следующая задача — Warehouse ещё ×3

27 ноября 2026: main **970800ccf7e53d1e4a128ecefe8fd2e491787a9c** опубликован.
Source **2254018f6abbfd32da0e678bc895a340497964df**; PR #17, workflow **45016375295**:
test/deploy/pages SUCCESS. Actual HTTP HTML/JS/CSS/assets повторно совпали 27 ноября,
одно приложение; actual deployed Worker source через разрешённый Cloudflare management API
содержит полный main SHA. Прямой workers.dev /api/status ограничен сетевой политикой среды;
сам workflow проверил status/shared saves. Платный inference не вызывался.
[Квитанция](../qa/2026-11-27/waterfront-v14-live/live-verification.json).
[Игра](https://arturmal2805-netizen.github.io/ai-cat-game/?v=970800c).

Пользователь явно уточнил: Warehouse **ещё ×3 по ширине и высоте**, глубина прежняя.
WIP ветка `codex/warehouse-scale-three`, worktree `/workspace/chichi-warehouse-scale-three`.
Checkpoint Warehouse2e8ebff; controlfix724601a; текущий source **985b436d92b42f721b8ad2c59b1acef09a899364**,
PR#18, worktree `/workspace/chichi-warehouse-scale-three`. Width3600/platform3960,
heightScale7.5, depth240/296 прежняя. x3520/y-453/z450 сохраняет открытый подход и
крышу ниже-30м. Сначала shelf400 скрывал низ корпуса; реальный PNG это выявил.
985b436: shelf1400 с fade shore/core/protected-building shoulder; CPU sight-line
регрессия + actual native bed ray проходят. Final reflection53b97df97494, старые PNG
сохранены. 23currentfloor/camera tests, прежние29terrain/save и26control/physics PASS.

Desktop724601a: auto4растущихпрыжка2.5/5.5/11/20→dive/splash/swim/climb PASS;
реальная верхняя «Управлять Чичи» во время approach→manual PASS,7heldSpace hops
2.5→43.3096m, nativepeak40.58m, compression/landing/dive/splash/swim screenshots.
Mall/SPA native geometry/material/poses exact, DPR2/lights at same target exact.
Warehouse product view был визуально отклонён из-за короткого slope, не публиковать724.
Final985 desktop native сейчас идёт; PNG product показывает полный корпус, bedray0.
QAroot `/workspace/qa/warehouse-threefold-native-desktop`, helper
`/workspace/qa/check-warehouse-threefold.cjs`, env как в log scripts/session summary.
One GPU at a time, не менять public/build пока QA идёт. Следом phone с реальными
кнопками и двумя privateSQLite deep saves (helperwarehouse-threefold-deep-save.mjs).
CI PR985 **46001305748** идёт; старый724CI отменён новым push. Ещё НЕ опубликовано.

## Новый запрос: функциональный Warehouse — следующий выпуск сразу после текущего

Пользователь27ноября: адекватный рабочий вход **без нового лифта**. Котики, выбравшие
Warehouse через обычное AI-решение, садятся в маленькие субмарины и плывут ко входу.
Для Чичи тот же транспорт; при нажатии Warehouse показать кнопку «Відправити Чічі
до Warehouse». Добавить Warehouse в возможные посещения/активности котиков.
Пользователю прямо сообщён порядок: сначала опубликовать текущий bugfix+scale,
сразу затем транспорт/вход. Не останавливать задачу после первого выпуска.
Новый запрос явно supersedes прежнее exterior-only/no-interactions ограничение
для следующего выпуска; интерьер Squish/магазины/новая экономика не запрошены.
Сохранять ТРЦ/SPA/ресторан/батут, модели котов, кошельки/владение и shared saves.
Использовать существующие native submarine/seat/airlock/navigation, bounded queue,
один simulation owner и существующий compact AI leisure batch без новых per-cat
AI calls. Новые save enum опасны для старых клиентов — проверить совместимость,
никаких live-player QA/paid inference. Точные архитектурные решения ещё не приняты.

User исправил запрос FIRST→**THIRD PERSON**. Default батут thirdperson7.2m/.28rad;
whole native кот/лапки/landing видны. V остаётся optional. Сохраненыspring-v3,
подготовка/полёт/приземление,9.81gravity,высокиерастущиепрыжки,6active/очередь,
всеfree+forcedbusyЧичи,большойвсплеск/swim/climb. Новаяwaterbutton использует
boundedtrustedtouchrelease/capture/cancel: raw enabled-touch trace не имелclick.
Mouse/keyboardclick сохранён; duplicate compatibility click не запускает дважды.

Final phone+desktop native PASS наclean2254018,466source modulesexact;
7hops2.5→43.31m, actualpeak40.78m, полныйвидимыйnativebody вкадре, реальные
WASD/Space/heldtouch/look/water действия,0JS/HTTP/GLerrors. Старые3nativebuffers/
materials/transforms/globallights/DPR сноваexact0diff. [Phone](../qa/2026-11-22/waterfront-v14/third-person-phone/) ·
[Desktop](../qa/2026-11-22/waterfront-v14/third-person-desktop/).
Текущая privatefixture имеет0freeNPC: проверенывсеeligible+Чичи; earlier13/6positive
иpure30queuePASS сохранены. Failedbbox probe включалhiddenbranches/матрицыдоdraw;
correctedизмеряетtraverseVisible nativeverticesпослеdraw. Failedattempts хранить.

[19nativeviews+2privateSQLite restores](../qa/2026-11-22/waterfront-v14/release-desktop/)
на56f305e сохранены: rendering/physics/economy/persistence sources unchanged,
после них изменялись толькоnewUI/defaultcameraentry/world/manual иCSS. Все34
initialrestorednativeposes/yaws/locations/banks/inventory/placements/personalcoins
exact. Currentprimarycamera/body/contact/water смотрены вfinalcaptures выше.
36currenttargetedNode22checks/fullbuildPASS,62relatedtouchchecksPASS; прежнийfull
CI44960985278PASS. PR CI45015643305 и main CI45016375295 завершились SUCCESS.
JS **0e47a2b458e7d21c3ba8aeaa729fd14b48eee7a036056d92cd1a54ecc43f9f06**;
CSS **6009872ae8865f57fb8d358ee2e71be2eac6ad5bdac240cba496a6664983b2d3**; oneapp.
Не добавлять новые этапы до релиза. Исторический прежний релиз ниже сохранён только как rollback reference.
GTA6/1:1/physical60FPS/userartapproval не заявлять. Source/fullspec/protection116
вdocs/specifications; originalinlineimagebytes недоступны, не выдумыватьhash.

## Исторический прежний релиз

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
