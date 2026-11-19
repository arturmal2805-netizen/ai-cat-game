# SPA V7 — historical pre-publication handoff

This snapshot is superseded by CURRENT.md. Main c477057 subsequently passed
workflow44579271016 and actual public HTTP verification on19November17:54:13UTC.
Receipt: codex/spa-v7-release-evidence b91350c04fc29ad93c72e8cca38ab14c75f785e0.
Do not resume the pending gates below as though publication had not occurred.

Coverage note: the native V7 reload scenario waited for required scene readiness.
It does not certify an immediate manual-control click before a cold SPA model
finishes preparing. That edge was noted during read-only review, not reproduced
or established as a product defect; do not describe it as passed or fixed.

---

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

## V7: код слит, ожидается публикация

Main: `c477057b6eda6e251f02bc27735e4220d737112b`, PR#2 MERGED.
Родители: старый опубликованный `6e28f752291e65e7b51f7f093a004e5c81fd27b3`
и кандидат `1a32b17fe4ec66223f6e92904a9ad2f4443fd1e7`.
Обычное слияние без ручных конфликтов; итоговое дерево равно кандидату.
Product public/ побайтно равно финальному native/build исходнику
`f04365585a2f0183ce695e57269d298b73863fa0`. Весь code/WIP сохранён:
remote codex/spa-v7-consolidation=1a32b17, codex/spa-v7-visual-final=f043655.
Старые worktrees сохранены. Ничего не сбрасывать и не применять повторно.

**Единственный оставшийся gate:** полный main workflow
https://github.com/arturmal2805-netizen/ai-cat-game/actions/runs/44579271016
(tests → Worker deploy → exact release/shared saves → Pages) и реальные live bytes.
Сборка CI уже прошла, выполняется npm test. Повторный PR run44579260657 отменён,
поскольку тот же код проверяется main workflow; это не неудача продукта.
Предыдущий полный CI44573032188 на функциональном534f3a9 SUCCESS.
Не объявлять публикацию до полного результата и HTTP-проверки.

19 ноября17:42UTC (19:42 по Киеву) URL?v=c477057 ещё отдавал старый HTML:
SHA `d1423f0c0e37d4312509d8fc807cca5923e87e90d896dee9521183b44c7541d0`,
app key c006ed8238ebefbc. Это контроль до deploy, не ошибка нового релиза.
Параметр v не является доказательством публикации.

Активный путь `/workspace/chichi-emergency-save-recovery` теперь на новой ветке
`codex/spa-v7-release-evidence`, основанной на origin/main=c477057, дерево чистое.
Переключение не изменило product bytes; предыдущая ветка сохранена. После deploy
записать квитанцию в docs/qa/2026-11-19/spa-v7-release и отправить **только** в
codex/spa-v7-release-evidence (не запускать ещё один main deploy ради документов).

### Что реализовано и проверено

Единый корпус 300×132 м, три этажа с шагом14м, восемь зон,96контактов, реальные
лестницы по50ступеней, восемь VIP-ванн и верхний бассейн с прозрачным дном.
Midnight/Golden увеличены; своды минимум10.8м, крыша выше минимум0.9м по реальным
треугольникам. Service ceiling закрывает днища ванн, сохраняет sky aperture.
Public offers8, меню10 (обзор+8+выход);14 старых product/service IDs сохранены.
Amber→Midnight,Jacuzzi→VIP с единым физическим occupancy; четыре снятые услуги
принимают только прежние prepaid tickets как отдых в Midnight. Нет новых монет,
изменений цен, общего merge, моделей котиков, ТРЦ, океана, грунта или управления.
Тексты V7/VisualProtocol в docs/specifications; концепт уже получен в чате.

Сохранение elevated/wet процедуры записывает раздельные сухие поддержанные точки,
не перемещая живых котов; reload использует оплаченный билет без новой покупки.
Marker7 исключает повторную миграцию, более новая команда отменяет старую repair.
Точное восстановление лифта и существующая семантика shared-world сохранены.

Actual native доказательства и exact source/bundle/PNG находятся в main:
`docs/qa/2026-11-19/spa-v7/`. A/B/C/D/E/final регулярно сопоставлены с секциями
референса A–I; E включает все13 видов, final четыре вида освещения. Все просмотрены.
Исправлены настоящие пересечения сводов, Float32-стык бортика/пола, скачки света
по треугольникам и гранёные нормали сводов. Фасад и сады ещё проще/реже концепта;
это структурный V7 этап, а не завершённое художественное сходство или user approval.

Первый functional native прошёл8услуг/8VIPbaths/sky, затем нашёл Cafe seam.
Фаска underlap25мм/drop6мм исправила именно геометрию; радиус/коллизии сохранены.
Все14pool runtime/geometry вход→процедура→выход→возврат PASS. Остальные native
Cafe/prepaidJacuzzi/Nap/shore→lift→stairs→massage→shore/privateSQLite reload
посреди купания без двойной оплаты/desktopW/World/realCloudbackup PASS.
Все96контактов и обе лестницы в обе стороны PASS, включая новые проверки колонны.

Phone held touch PASS: native Chichi прошла4м в настоящем проходе0,238; pad136px
вviewport390×844/DPR2, сухой controller, World release. Первые два phone run
ошиблись стартовым fixture0,233 перед настоящей колонной0,234: .2м до остановки,
реальные pointerevents и allowed=true. Колонна сохранена; новый полный body sweep
доказывает обход/свободный участок. Это не поломка touch и не ослабленный тест.

Required OWNERSHIP_AUDIT PASS, exit0:750000 приватных fixturecoins неизменны,
legacyMegaLoops восстановлен/размещён без оплаты, одна копия после двух SQLite
reload,errors[]/httpErrors[]. Runner не сохранял instrumented bundle; manifest
честно содержит null и этот PNG не используется как художественное доказательство.
Workerd Brokenpipe при завершении не прервал assertions; процесс exit0.
Не выдумывать недостающий bundle hash задним числом. Живые user saves/AI не трогались.

189 файлов QA manifest проверены по staged Git bytes. Все30 нужных логов force-added
в main, несмотря на *.log. Не повторять успешно пройденные native проверки без
изменений/нового сбоя. Hardware phone/Mac FPS и все84motion sequences не заявлены.

### Точные ожидаемые assets после deploy

Node22.23.5 build PASS. HTML один app module:
`./dist/app.js?v=48922a7a2e2977b4`.
HTML SHA `b23ef7595b67953a77eb4b8cae0fe6e8738457e12f56cb0b5eabc866fed0b234`;
JS `48922a7a2e2977b430ade30da5577f97f23a822363c4d39ed754e6714c105508`;
CSS `1ca6fd7d91d93d2434122de8b604f9e1f0306145487ece7434204f01d46492bc`;
SPA atlas `bad2f1b8b9825eccdb7a334b55fb9b9f9dd710edf1653b570b4bb2c0cb6f505e`.
Последние9probes сняты на чистом56cb872; native-smooth-probes содержит все слои,
rawRGBA, PNG и полный источник. Runtime flat-layer/cachekeyv4 не добавляет pass/
sampler/scene lights. Native final bundle
`9a922bbe799ab3ff1bdc5a24e6a0cbd6f2ebd92270df7514a151b97eb9038930`.

После полного CI получить реальные HTML/JS/CSS/atlas по HTTP, сравнить SHA/ключи,
проверить одну app-загрузку и записать полный опубликованный c477057/workflow.
Прямой Worker GET в среде ранее tunnel403; exact release/shared saves подтверждает
главный workflow. Не объявлять проблему ключа из-за tunnel и не запускать paidAI.
Затем обновить стабильную запись выше/историю и дать пользователю ссылку.
