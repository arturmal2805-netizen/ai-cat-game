# Текущий статус

Обновлено20 ноября2026, Europe/Kyiv.

## Опубликованная стабильная версия

**9e26f331d91d3ad85e2c0f15b5a6a4e63106e5ce**, origin/main.
[Игра](https://arturmal2805-netizen.github.io/ai-cat-game/?v=9e26f33).
Workflow44612746706 SUCCESS: Node22/fulltests/Worker exactrelease/sharedsave/Pages.
Live JS593013c89da9d392e10c9a42a7ba7297e2073cccff5e3fc32951b930262e4dce;
CSS1ca6fd7d91d93d2434122de8b604f9e1f0306145487ece7434204f01d46492bc.
V11 опубликован:38SPA surfaces, единый bounded framebuffer copy, бесплатные
кнопки вызова Чичи и свободных жителей через настоящий лифт/ходьбу. Не повторять
этот merge. Полные SHA/live receipts/ограничения — history/2026-11-20-v12-status-evolution.md
и remote codex/spa-v11-release-evidence=2bf67d2e8c5a426f16ee7a279d72f587677e0959.
Ни V11, ни текущий V12 пока не получили visualapproval. Mac/iPhone FPS не измерен
на аппаратных устройствах. Не обещать его по SwiftShader.

## Активная задача: V12, один общий водоём

Код **1ec45e891c0eeb126462800106e83202ee4a7e4e**, remote
**codex/v12-island-warehouse**, worktree **/workspace/chichi-v12-island-warehouse**.
[PR#5 DRAFT](https://github.com/arturmal2805-netizen/ai-cat-game/pull/5).
Это WIP, пока НЕ опубликовано. Полный запрос:
docs/specifications/island-warehouse-v12-phase1-2026-11-20.md.
Подробный контракт: standards/island-warehouse-v12.md.

Последняя воля пользователя:
- Warehouse В2РАЗА ПО ШИРИНЕ И ДЛИНЕ:480×240м, платформа~529.4×298.7м actual.
- ОДНА огромная лагуна без малой полукруглой чаши/узкой перемычки.
- Пользователь ЯВНО выбрал оставить ТРЦ/SPA на прежних местах. НЕ переводить их
  roots, НЕ менять WORLD_CENTERS, интерьеры, воду, камеры/механику этих зданий.
- Берег разрешено свободно перекраивать; покупки/адреса/кошельки/модели защищены.
- Только ОДНА наружная герметичная оболочка Warehouse, без оборудованного
  интерьера/Squish/нового транспорта/AI/магазинов/экономики.
- Warehouse далеко: actual edge gap>=3его новых ширин платформы.

Warehouse local(2200,-177,450), root scale1; увеличена только новая геометрия.
Baseline Mall root(-450,0,500), SPA(-450,-165,480), scale1/identity unchanged.
MOSA_SEA/старые gameplay radii/фаунa/соседние центры и все исходники Mall/SPA/
cat/watercore/economy/server сохранены. Новый островный overview имеет отдельный
центр1250,-55,400/radius1980. Кнопка «Остров» также исправлена на этот bounds;
внутренние Mall/SPA far/zoom сохранили прежние ограничения.

Один исходный mesh воды дополнен геометрией: те же material/uniform/clock/fields/
wave equations/probe gain. Старый enclosing wall/rim удалён. Core до.95прежнего
нормализованного радиуса и подходы зданий защищены; бывший край прорезан.
Grid2:1transition использует ТОЧНУЮ старую boundary,160rows, строится сyield.
Общий contour охватывает старую и новую воду БЕЗ отдельной малой чаши. Простой
convexhull пересекает4соседних острова: северный берег отведён по реальнымBIOMES
с запасом38м; cliff protrusion<=1.5м. Cached radialLUT4096/O(1)lookup.
Проверены старые waterpoints, три точки бывшей перемычки и все neighbouring gaps.

384новых coral colonies/60fish/8reef pockets вокруг Warehouse. Рыбы над настоящим
дном, не внутри холмов. Coast instance cells320м/общие шаблоны/неизменные buffers.
Warehouse теперь вBASE, виден и при скрытой детализации в общем обзоре мира.
Старые оплаченные затопленные адреса получают drypads, их координаты/ID не меняются.
Подходы не растягиваются на километры. NPC используют оставшуюся сухую часть
старого save-domain; validation не расширена. Phase1 не вводит новую навигацию
к закрытому Warehouse. Корпус/neutralbase стоят на настоящем sea-floor shelf.

Новый actual offline probe tropical-coast-64adb6007c68.png:37046bytes/0.33MiB,
Runtime shader/field/opacity/gain4 прежние. Offlinecube far4000; старые PNG
6b3853/fde0da/5b0cf1 сохранены для cached клиентов. SPA probe atlas НЕ менялся.
Reference pixels находятся в сообщениях; не выдумывать сохранённые originals.

## Проверки и следующий шаг

30Node22 targeted/layout/ownership/performance checks PASS, diffcheck PASS.
Финальные source-fixed проверки сейчас:
- /workspace/qa/v12-unified-desktop.log — все реальные виды на1ec45e8;
- /workspace/qa/v12-unified-build.log — настоящий Node22 production build;
- затем отдельный touch context CHICHI_V12_PHONE_ONLY=1, настоящая кнопка
  #camera-island, DPR2 и project Warehouse bounds полностью внутри кадра.
- Полный GitHub CI для exact PR head, затем merge/mainCI/Worker/Pages/HTTP hashes.

512fc4c (меньший корпус) и5aa0bf9 (2×корпус, но прежняя малая чаша) СУПЕРСЕДЕД.
Их native desktop/phone PASS и CI не являются финальным proof.447модулей сравнили
сGit512; оба корпуса и measured gaps были проверены по actual3D boxes. Старый
Native front camera попал вreef mound: исправлены только ракурсы и добавлен
actualbed clearance assert. Invalid image не выдавать за финальное сравнение.
Old baseline PNG сfar1200 был обрезан; valid baseline9e сfar10000/desktop archived
в docs/qa/2026-11-20/v12-analysis/baseline-correct (remote628226d).

Архивы intermediate source/bundles/views:
docs/qa/2026-11-20/v12-release/smaller-intermediate/ и
v12-enlarged/intermediate-before-unifying/ (включены1ec45e8).
Финальный proof будет вv12-unified/. Перед публикацией сравнить каждый вид с
reference и valid baseline; GLSL/CI PASS не есть художественное одобрение.
Не запускать платный AI, не использовать live-world/token/SQLite дляQA.

## Работа и восстановление

Node22 PATH=/home/agent/.npm/_npx/52027bd8fc0022aa/node_modules/.bin:$PATH.
Playwright=/opt/codex/runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright;
Chromium=/usr/bin/chromium, один GPU run одновременно.
Sparse checkout исключаетdocs/qa: нужный tracked fixture материализовать точным
`git show HEAD:path`, не делать checkout всего дерева. Не удалять старые worktrees.
Удалялись ТОЛЬКО свои завершённые privateQA assets copies после проверки remote
source/receipt; уникальные PNG/source/SQLite/logs сохранены. Receipts /workspace/qa/.

Каноническая память — codex/ocean-recovery-memory. Её приложение старое, не
запускать его вместо активного source. Подтверждать полный SHA после push.
Worktree сейчас codebranch; послефинальных Native можно создать НОВУЮ evidence
ветку от1ec45e8 для PNG/source, оставив PR head неизменным радиCI. Не checkout
старую codex/v12-release-evidence=ce921de как актуальный продукт!
V11 /workspace/chichi-spa-water-v11 = codex/spa-v11-release-evidence2bf67d2;
V8 /workspace/chichi-emergency-save-recovery = codex/spa-v8-release-evidence16526f9.
Старые939b328/4ec3737/12d478e/d6fa805 — history, не current release.
