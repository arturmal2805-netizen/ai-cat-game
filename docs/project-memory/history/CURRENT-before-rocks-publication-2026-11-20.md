# Текущий статус

Обновлено 20 ноября 2026, Europe/Kyiv.

## Опубликовано и проверено

Main **1ebc94cb7c38d26aca2d87c7404d1380a8df33ac**, workflow **44734816312 SUCCESS**.
https://arturmal2805-netizen.github.io/ai-cat-game/?v=1ebc94c
HTTP проверен2026-11-20T12:34:01Z. Одно подключение приложения.
JS eee88668a2689f000b143998a1a405723c77ecd596e4559cd4abbe165dcc8fa3;
CSS 1ca6fd7d91d93d2434122de8b604f9e1f0306145487ece7434204f01d46492bc;
HTML c23806a4baf706ca00a73c97de6c9b4bfd55b5a65016347f79e92f8e110ea552.
Локальные HTTP receipts:/workspace/qa/v12-smooth-final-live/.
Native evidence:codex/v12-final-release-evidence@2a0dd26d6d1ef5dacff96d61dc4a608fe75171a8.
Не означает художественное одобрение или аппаратный FPS.

## Только три отмеченные скалы — текущая задача

Пользователь2026-11-20 прислал IMG_0790.heic и явно потребовал убрать ТОЛЬКО
три обведённые скалы справа/восточнее ТРЦ для ручного движения Чичи.
IDs:reef-terrace-0,reef-terrace-1,reef-terrace-11. Остальные9,дно,ТРЦ,SPA,
Warehouse и всё остальное должны остаться прежними.
Ветка **codex/mosa-remove-three-marked-reefs**, worktree
/workspace/chichi-v12-island-warehouse, база опубликованный1ebc94c.
Код сохранён в remote: **6ca4c3c8503b55b90e49550634b18d227f27df4a**, PR#7.
FullCI **44740442266 SUCCESS** для6ca4c3c; прошлый44740268700 заменён test-only
поправкой decoder expected names. RuntimePublic неизменен относительноd460aef.
Node22 build/42targeted PASS; 4final opening/cache checks PASS с настоящими
terrain obstacles. Native desktop2ракурса и phone390×844/coarse/DPR2 PASS;447public modules
каждого из2прогонов точно совпадают сcandidate. [QA](../qa/2026-11-20/three-marked-rocks/README.md).
Архив опубликованного1eb: [HTTP receipts](../qa/2026-11-20/v12-published-live/README.md).
WIP:отдельный active reef field для renderer/player/camera/submarine/opticaldepth;
исходный authored field сохранён для неизменности остальных flora/fauna anchors.
Raw1024corals SHA256e560902adc642a96b8b7c01468eca5f2f2c3de81d572577fd5be53dbb32b4f41
прежний;166колоний на удалённой тройке пропускаются,858остаются.
Проверки движения по бывшим объёмам/защищённых файлов, build и Native PASS.
ПолныйCI/новая публикация ещё pending. Не объявлять текущий WIP опубликованным.

Предыдущая широкая выемка дна перед SPA ПРИОСТАНОВЛЕНА:ветка
codex/v12-spa-approach-visibility@18c1e57, PR#6 CLOSED безmerge, CI44737410238
отменён. Не включать её в новую узкую задачу, не восстанавливать expansion.js из неё.
Правильное фото: /workspace/qa/user-IMG_0790-single.jpg. HEICдекодировать с
heif-convert --tile-threads 1 --codec-threads 1; стандартный декодер дал цветные
плитки, это артефакт декодирования, не дефект игры. Оригинал сохранён вattachments.
Исходное указание:sediment://file_000000003d34821092a5f0fd014351f7.

## Новое уточнение: серая зона под скалой

После просмотра Native пользователь подтвердил «а так все топ» относительно
удаления тройки и указал серую зону справа; ответил «го» на исправление.
Raycast4точных пикселей показал: старый декоративный ConeGeometry cap(color828c99)
наY=-200 был ВЫШЕ неизменённого expansionBedY~-200.5..-204.3. Это не вода,
не новый материал и не отсутствующий кусок геометрии дна.
WIP:только декоративная нижняя основа опускается12м, capY=-212; физическое дно,
ТРЦ/SPA/Warehouse/остальные9скал не меняются.9targeted tests PASS, включая реальные
rays в бывшие серые пиксели, Node22 build/3optics PASS; Native нового финала desktop2views/phone390×844/coarse/DPR2 PASS;
447public modules в каждом прогоне совпадают с9bf328c.145защищённых файлов
прежние. [Финальное QA](../qa/2026-11-20/three-marked-rocks-gray-cap/README.md).
Предыдущий автоматический merge остановлен ДОmerge. После локализованной правки
PR#7 MERGED:source9bf328cda3da2fd066a36675e93a43a0ff33d691 → main
407e4274128e86644619d022978e6d5fd16cd969. Workflow44742914000 выполняется;
новый выпуск ещё НЕ опубликован, подтверждённый live всё ещё1ebc94c.
Параллельно финальному полному mainCI выполняется exact-source Native серой
правки. Производственная публикация всё равно проходит полные main tests.
Полный CI44740442266 для6ca4c3c SUCCESS. Новый main всё равно обязан пройти
полные tests/release/saves перед публикацией. Не путать одобрение удаления скал
с одобрением всей воды/карты или обещанием FPS.

## Что реализовано

Последний выбор пользователя: ОДНА большая лагуна без малой чаши. ТРЦ/SPA
оставить неподвижными и невредимыми; берег можно перекраивать свободно.
На фото пользователь правильно заметил, что candidate1ec45e8 сохранял старый
внутренний скальный обод. Объяснение про старый live было ошибкой, её признали.

Удалены10внутренних headlands и их высокие подпорки; два headlands остались
ТОЛЬКО на настоящем внешнем берегу. Старый склон сглажен наq=.7..1; за точным
protected building bed есть90мплавный стык без вертикальной прямоугольной стенки.
Старые камни и сады кораллов лежат приq<.7 и сохраняют прежние anchors.
Вода — один дополненный released mesh с теми же material/clock/fields/shader.
Контакты плавания/подлодки следуют новому дну, без невидимого старого rim.
Границы сохранённых координат не расширялись, новый транспорт не добавлялся.

Warehouse: одна закрытая ВНЕШНЯЯ оболочка в воде,480×240м — вдвое по каждой
стороне; платформа~529.4×298.7м, root scale1, local(2200,-177,450).
Actual edge gaps:1773.6948454461558м до ТРЦ и1785.0894594514284м доSPA,
то есть3.3504/3.3719новых ширин платформы. Внутри нет оборудования/Squish/AI/магазинов.
Вокруг384coral colonies/60fish/8reef pockets; статические общие буферы/LOD.
ТРЦ root[-450,0,500], SPA[-450,-165,480], scale1/identity совпадают с baseline.
149защищённых файлов ТРЦ/SPA/котов/сохранений/экономики и server entries прежние.
Покупки/ID/кошельки сохранены. Проверки всех соседних островов и жилья PASS.

## Доказательства

Удалённая ветка **codex/v12-final-release-evidence**:
**2a0dd26d6d1ef5dacff96d61dc4a608fe75171a8**, SHA проверен на сервере.
Также сохраненыmerge-receipt.json/merge-verification.json/pr-workflow.json.
Каталог:docs/qa/2026-11-20/v12-final-release/.
Десктоп9ракурсов и отдельный touch390×844/coarse/DPR2/настоящая кнопка«Остров»
PASS: errors[]/httpErrors[]/GLlostfalse/failedprograms0. Все8углов Warehouse
внутри мобильного кадра. По447captured modules обеих проверок совпали сca08b43:
894побайтовых сравнений; test-only-candidate-verification.json.
Source/QA bundle/PNG/camera/report сохранены; source-prooftar повторно скачаны
черезGitBlobs и побайтово проверены. Промежуточные неудачные стадии не удалены.

Ожидаемые production bytes (пока НЕ live receipt):
HTML:c23806a4baf706ca00a73c97de6c9b4bfd55b5a65016347f79e92f8e110ea552.
JS:eee88668a2689f000b143998a1a405723c77ecd596e4559cd4abbe165dcc8fa3.
CSS:1ca6fd7d91d93d2434122de8b604f9e1f0306145487ece7434204f01d46492bc.
Probe:4fa4e0cc0c7f63e1a3063f46a827bb458114a2cebe271e29ce81bbfac3beda4e,
36525bytes/0.33MiB GPU, revision0e4355d282ef35fc. Реальный offline bake.
Один app script:./dist/app.js?v=eee88668a2689f00. SPA atlas/общий wavefield прежние.
Проверка публикации:/workspace/qa/verify-v12-live.py MAIN_SHA WORKFLOW_ID;
переносимая копия verify-live.py находится в удалённом каталоге доказательств.

## Правила продолжения

Не повторять строительство и не брать приложение старой ветки памяти какmain.
Каноническая память — codex/ocean-recovery-memory. История:decisions.md и
history/2026-11-20-v12-status-evolution.md. Старые source/QA/worktrees сохранить.
Удалены только свои duplicate assets/qa-app.js ПОСЛЕ проверки удалённых tar;
все исходные bytes остаются в независимых Git/tar. SQLite и уникальные PNG не удаляли.
Native/CI PASS не означает визуальное одобрение или аппаратный Mac/iPhone FPS.

Node22 PATH=/home/agent/.npm/_npx/52027bd8fc0022aa/node_modules/.bin:$PATH.
Playwright=/opt/codex/runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright;
Chromium=/usr/bin/chromium. Один GPU run одновременно.
Sparse checkout исключаетdocs/qa: читать нужные файлы черезgitshow или точечно
материализовать их. После switch они могут отсутствовать; это не потеря вGit.
Не checkout всего дерева и не удалять старые worktrees.


## Уже запущенная публикационная цепочка

Не запускать второе слияние или дублирующее развёртывание.
Exec session **22834** в /workspace/chichi-v12-island-warehouse уже прошла
PRCI иmerge, сейчас ожидает основной workflow44734816312:
`gh run watch44732308801 --exit-status` →
/workspace/qa/merge-v12-after-ci.py. Скрипт проверяет SUCCESS точногоca08b43,
894сравнения public modules, неизменныйbase9e26f33 и headPR5; только после этого
выполняет обычный REST merge без force/admin. Затем находит main workflow,
ждёт его SUCCESS и запускает actualHTTP verifier с повтором только при CDNcache.
При любом FAIL останавливается; это не основание объявлять публикацию успешной.

Текущие файлы состояния:
/workspace/qa/v12-pr-ci-watch.log — ожидание PR CI;
/workspace/qa/v12-merge.json — появится после фактического слияния;
/workspace/qa/v12-main-workflow.json — полныйmainSHA и workflowID;
/workspace/qa/v12-main-ci-watch.log — main test/deploy/Pages;
/workspace/qa/v12-live-verifier.log и v12-smooth-final-live/live-verification.json
— появятся после реальной проверки сайта. Дождаться и проверить, затем обновить
этотCURRENT/ROADMAP/decisions и сохранить live receipt в evidencebranch.
