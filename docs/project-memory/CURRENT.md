# Текущий статус

Обновлено 20 ноября 2026, Europe/Kyiv.

## Опубликованная версия

**9e26f331d91d3ad85e2c0f15b5a6a4e63106e5ce**, origin/main.
[Игра](https://arturmal2805-netizen.github.io/ai-cat-game/?v=9e26f33).
Workflow **44612746706 — SUCCESS**. V11: 38 поверхностей воды SPA и бесплатные
кнопки вызова Чичи и свободных жителей. V12 пока **НЕ опубликован**.
Старый live JS:593013c89da9d392e10c9a42a7ba7297e2073cccff5e3fc32951b930262e4dce.
CSS:1ca6fd7d91d93d2434122de8b604f9e1f0306145487ece7434204f01d46492bc.

## Кандидат V12 и ближайший шаг

PR **#5**, готов к слиянию после полного CI:
https://github.com/arturmal2805-netizen/ai-cat-game/pull/5
Источник: **ca08b43ecee9fcf94aeca81abfe390434687e049**, удалённая ветка
**codex/v12-island-warehouse**. Новый полный CI **44732308801 выполняется**.
Рабочее дерево:/workspace/chichi-v12-island-warehouse сейчас стоит на отдельной
ветке **codex/v12-final-release-evidence**, а не на ветке PR.

Геометрия/вся игра совпадают с9d81059d67249b024635a6c4d502c8d55a0e4d91.
Последний ca08b43 меняет ТОЛЬКО старый тест: raycast сравнивается с фактическим
expansionBedY при том же допуске0.15м. CI44730300724 на9d81059 завершилсяFAIL.
Локально воспроизвели старое ожидание mosaBedY у удалённого склона; после правки
все4legacy geometry/ownership/cave теста PASS. До этого57targeted checks PASS.
Логи GitHub скачать не удалось из-за transportForbidden; не утверждать, что
известен весь список ошибок старого полного CI. Новый полный PASS ещё требуется.

Далее: дождаться44732308801 SUCCESS → слить точный ca08b43 вmain → дождаться
main workflow с Worker exact-release/shared-save/Pages → проверить реальные
HTTP HTML/JS/CSS/probe bytes → записать полный опубликованный SHA и workflow.
Публикация уже разрешена пользователем; повторное согласие не нужно.
Не запускать платный AI и не использовать живой мир пользователя для QA.

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
**90dacb26d88d85d1888e8caae26472126c50d37e**, SHA проверен на сервере.
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
Exec session **22834** в /workspace/chichi-v12-island-warehouse:
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
