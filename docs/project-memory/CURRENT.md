# Текущий статус

Обновлено 19 ноября 2026, Europe/Kyiv. Публикация подтверждена в16:20 по Киеву.

## Стабильная опубликованная версия

**6e28f752291e65e7b51f7f093a004e5c81fd27b3**, origin/main.
[Игра](https://arturmal2805-netizen.github.io/ai-cat-game/?v=6e28f75),
[диагностика по запросу](https://arturmal2805-netizen.github.io/ai-cat-game/?v=6e28f75&profile=1).
[Workflow44539374765](https://github.com/arturmal2805-netizen/ai-cat-game/actions/runs/44539374765) — **SUCCESS**:
Node22 tests/build, Worker deploy, exact release/shared saves, Pages.
Проверено HTTP19 ноября14:20:35UTC (16:20 по Киеву).
HTML совпал с проверенной сборкой по байтам; одно подключение приложения.
JS SHA256 `c006ed8238ebefbcd77d246f69a9dd8765107618bfcfee285662a44a0bc5feea`;
CSS SHA256 `1ca6fd7d91d93d2434122de8b604f9e1f0306145487ece7434204f01d46492bc`;
SPA atlas `c3beaca169a6462a0622a42858c67eec7bc14d61722b12d3530295de9c3b2cc0`.
[Квитанция](https://github.com/arturmal2805-netizen/ai-cat-game/blob/d259c323876187606fa9512baff0b59c7d83845c/docs/qa/2026-11-19/spa-v6-gardens-release/live-verification.json).

Опубликован промежуточный этап SPA: интерьеры, настоящий верхний бассейн со
стеклянным дном, кафе/аквариум, мягкая мебель, сады/каскады и реальные проходы.
Это НЕ завершение художественного V6 и НЕ визуальное одобрение пользователя.
Прежний опубликованный39708e3 и квитанция cloud-backup остаются историей.
Прямой GET Worker здесь блокирует tunnel403; точную серверную версию и shared
saves проверил главный workflow. Платный AI inference не выполнялся.

В существующем окне «Аккаунт» (☁, оно же облачное сохранение) добавлены кнопки
«Сохранить текущий мир» / «Загрузить мир из файла». Никакой отдельной новой вкладки
или сервиса нет. Имя скачивания CHICHI_WORLD_BACKUP_YYYY-MM-DD_HH-MM-SS.json.
Полная существующая game schema, без storage/account/outbox/секретов/исходников.
Новый envelope formatVersion1/gameVersion2/SHA256; legacy version2 принимается
со структурной проверкой, без заявления о проверенной checksum старого файла.
До замены: preview/подтверждение, отдельная долговечная локальная копия и download,
account archive; потом обычный commit без подмешивания старых actor coordinates.
Копия до импорта доступна и в read-only rescue. Node22/12 targeted cases и настоящий
Chromium/private Worker/SQLite download/cancel/restore/reload PASS. **Mac напрямую
не проверен**; не называть Chromium аппаратным Mac тестом. Новую ссылку пользователь получил.

## Активная задача — единый SPA V7

Код: `/workspace/chichi-emergency-save-recovery`, ветка `codex/spa-v7-consolidation`.
Ветка PR пока на `534f3a954643a0a1fda1632ab1dee762a07bf3d6`.
Последний code HEAD `f04365585a2f0183ce695e57269d298b73863fa0` сохранён отдельно
в remote `codex/spa-v7-visual-final` (ls-remote проверен); это актуальный код.
Не начинать заново со старого remote consolidation.
Draft PR: https://github.com/arturmal2805-netizen/ai-cat-game/pull/2.
Main и сайт пока остаются на `6e28f752291e65e7b51f7f093a004e5c81fd27b3`.
Публикация после проверок уже разрешена. Не завершать работу на WIP или плане.

Пользователь прислал V7, Visual Implementation Protocol и новый концепт
1536×1024. Тексты сохранены в `docs/specifications/`. Концепт уже получен в чате,
но оригинальные байты inline картинки локально не предоставлены; SHA не выдумывать.
Он заменяет четырнадцать раздельных комнат восемью зонами единого здания.

Реализованы общий корпус 300×132 м, три этажа с шагом 14 м, реальные лестницы
по 50 ступеней, восемь VIP-ванн и прозрачный верхний бассейн. Midnight и Golden
увеличены; минимальная высота их сводов 10.8 м, внешняя крыша начинается на 46 м
над нижним полом. Service ceiling на 12 м над средним этажом закрывает днища
ванн, но сохраняет настоящий проём верхнего бассейна. Соседние ТРЦ, дно, вода,
модели котиков и общие правила экономики/слияния не изменены.

Production world явно выбирает layoutVersion7; public offers содержит 8 зон,
меню — 10 кнопок (обзор + 8 + выход). Исторические 14 product/service IDs остаются
для квитанций. Amber → Midnight, Jacuzzi → VIP. Четыре удалённые услуги принимают
только уже оплаченные билеты для отдыха в Midnight; новых продаж или валюты нет.
Старые default6 geometry tests являются историческим контролем, не доказательством
текущего production7. Актуальная геометрия проверена отдельными V7 тестами.

Реальные этапы A/B/C/D сохранены с исходниками, bundle, PNG и логами в
`docs/qa/2026-11-19/spa-v7/`. D на 4f69 выявил пересечения крыши и сводов,
зубчатый стык бортика/пола и открытые днища ванн. Геометрия исправлена в 4d85624;
32 целевых проверки прошли, включая все 96 контактов и лестницы в обе стороны.
Девять отражений сняты на точном 4d85624 и подключены в 664a7c7:
atlas SHA256 `01443cd814ef1222ea2ccef537e5cb97989269428d4833cc9ebcdc7093fb6997`,
bundle `cc69072f01663062f94b096784929339f76b6cbef2e7a39b6f35e0efdf3e11ca`.
Полная цепочка и исходные слои — `native-nine-probes`. Старый atlas сохранён.

Сохранение во время wet/elevated процедуры записывает сухую поддержанную точку,
не перемещая живого кота. Одновременные гости получают разные точки. После reload
прерванный оплаченный билет используется без повторной оплаты. Завершённые
квитанции остаются использованными; точное восстановление лифта сохранено.
Устаревшая асинхронная миграция уступает новой команде/позиции. Общая семантика
shared-world/merge и баланс не менялись. Девять reflection/recovery тестов PASS.

Первый native run на 664a7c7 прошёл 8 канонических услуг, 8 VIP-ванн и sky pool,
но нашёл застревание выхода водного кафе на Float32-стыке. Его полный failed
checkpoint сохранён в `native-functional-first`; не выдавать весь run за PASS.
534f3a9 добавляет настоящий наружный скос бортика: underlap 2.5 см, drop 6 мм,
только V7. Радиус/столкновения не ослаблены. Все 14 бассейнов прошли реальный
geometry/runtime вход → процедура → выход → возвращение.

Оставшиеся native сценарии на 534f3a9 теперь PASS, архив `native-functional-remaining`,
bundle `4ca1c81178b86edb4c64cdae007dba0845849ea3104f30ca5d12c5422d198ac3`:
водное кафе, старые оплаченные Jacuzzi/Nap, настоящий путь от причала через лифт
и лестницы к массажу и обратно, private SQLite reload посреди купания без повторной
оплаты, W/World release и действительное скачивание Cloud backup с проверкой SHA.
Это дополнение к успешным частям первого run, не повторная проверка всех 8 зон.

Все13 кадров E завершены и просмотрены; точный архив `native-all-rooms-e`.
Выявлены треугольные пятна света и грани сводов. 56cb872 исправляет непрерывные
vertex-параметры света и нормали из поля высот. 5 проверок геометрии/нормалей PASS.
Отражения повторно сняты на точном чистом 56cb872, source-state guard PASS,
`native-smooth-probes`: atlas
`bad2f1b8b9825eccdb7a334b55fb9b9f9dd710edf1653b570b4bb2c0cb6f505e`,
raw `1bcdb047a6322bdd99fbdbbfe84a7ffb41eff533c07dd0579d6042d84abfa09d`,
bundle `1b2beaa26597cc2826bcaa8bc87c7caca13cd518037bb78e3ea106aa3f31d41c`.
f043655 подключает новый atlas, flat probe layer/cachekeyv4, Node22 exact build.
6 дополнительных reflection/continuity checks PASS. HTML содержит один app module.
JS `48922a7a2e2977b430ade30da5577f97f23a822363c4d39ed754e6714c105508`;
CSS остаётся `1ca6fd7d91d93d2434122de8b604f9e1f0306145487ece7434204f01d46492bc`.
Модели котиков не менялись. Build и targeted logs игнорируются *.log: необходимо
force-add ровно проверенные QA logs перед итоговым evidence commit, а затем
проверить каждый manifest path по Git tree. Только native-mass log уже tracked;
остальные локально имеются, но их прежние commits пропустили из-за gitignore.

Сейчас единственный GPU — 4 финальных вида освещения на f043655, session52473,
`/workspace/qa/spa-v7-final-shading.log`, output `/workspace/qa/spa-v7-final-shading`.
Флаги EXPLORER_AUDIT=1 RESORT_SPA_AUDIT=1 SPA_V7_MASS_AUDIT=1
SPA_V7_PHASE=interiors SPA_V7_VIEWS=midnight-interior,golden-interior,thermal-interior,aroma-interior
DESKTOP=1. Потом phone held touch и обязательный OWNERSHIP_AUDIT; последний
полный CI на main и live bytes до объявления публикации. Не запускать два GPU run.

CI https://github.com/arturmal2805-netizen/ai-cat-game/actions/runs/44573032188
на 534f3a9 завершён SUCCESS (tests/build/wrangler dryrun, без deploy). Лог скачать
не удалось (Forbidden), не выдавать пустой файл за полный test log. Структурный
статус успешный. Изменения после него только отображение света/probes/QA/HTML;
финальный exact main CI всё равно обязателен перед deploy. Первый CI44572028855
отменён новым push. Отдельный Workers Builds ошибается и на стабильной версии;
главный Test and deploy должен закончиться целиком. Native/CI не означают
визуального одобрения или аппаратного FPS. Детализация фасада/садов ещё уступает
концепту; не объявлять художественную реконструкцию завершённой.
