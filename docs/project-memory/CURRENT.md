# Текущий статус

Обновлено 19 ноября 2026, Europe/Kyiv. Публикация подтверждена в19:54 по Киеву.

## Активная работа — SPA V8, WIP без публикации

Remote код: `codex/spa-v8-visual-overhaul`, **`25e52c3`**.
Основа — опубликованный c477057; V7 структура не перестраивается повторно.
Точные V8 и новые Thermal/Golden/Cabana исправления: docs/specifications/ в
кодовой ветке. Новый фото-туториал сохраняет8комнат; поздние парные фото требуют
прозрачную воду/каустику, тёплый свет и реально заметное улучшение мебели/деталей.
Пользователь прямо отверг stage1/stage2: «их нету». Не считать их visualapproval.
Пиксели оригинальных reference пока в сообщениях; не объявлять их архивированными.

SPA_LAYOUT_BASELINE.json заморозил root(-450,-165,480),8 physical centers,
96 contacts,14 бассейнов, лестницы и подход. Room Group-маркеры identity,
их world position не равна физическому центру. Native actual matrices сверяются.
BEFORE9, stage1/2 PNG/source/QA bundle/бинарные patches/логи —
`docs/qa/2026-11-19/spa-v8/` в кодовой ветке. Все96 подходов/лестницы PASS;
после переносов отдельно Thermal16/Golden30/Cabana6 и14pool returns PASS.
На stage2 byte-check896 защищённых public files совпал с c477057; последующий
world.js изменён только для нового приглашения, а SPA файлы — для local art.

В25e52c3: SPA-only shallow water profile, реальная shared-field каустика,
подсветка ступеней/бортиков, прозрачнее пузырьки, подвесная растительность,
сакура/светильники Golden, тёмный public upper floor, округлая Cabana мебель.
Контакт.92м и прежние foot supports сохранены. Исправлен порядок hooks:
room-light мог затереть ранее установленную каустику. Тест actual final batch
проверяет сохранённые lamp+caustic shader и живой clock/физическую глубину PASS.
Большой тёмный полигон остаётся без водной поверхности: не установлен как баг
interface shader. Сейчас integrated native изолирует world shadows дна.
Нельзя заявлять причину или устранение до просмотра paired кадров.

Кнопка «Позвать Чичи в SPA» уже в коде. Бесплатный вызов, процедуры отдельно.
Между локациями — существующий magical recall, далее реальная ходьба/лифт/вход.
Работа/сон и simulation owner проверяются; повторного вызова/списания нет.
Первый native дошёл до dry(-450,-164.988,769.2), walk/riding/arrived, wallets/
inventory/receipts прежние. Repeat-клик timeout: focus закономерно закрыл панель.
QA исправлен: снова открыть SPA и проверить repeat + настоящий SQLite reload.
Не считать первый частичный прогон полным PASS. Новый integrated run идёт в
/workspace/qa/spa-v8-integrated(.log); затем8 процедур/transport/export.
Перезапуск среды прервал diagnostic2 до кадров; success нет. Один GPU run.

Local Node22 full tests1191/1191 завершился, но source менялся по новым правкам
во время прогона — это не exact-source release gate. Нужны clean final CI,
точный Node22 build,8+фасад matched DPR2 кадры/память/полное время кадра,
новые offline9 probes после art lock, phone/save/Cloud и live actual bytes.
Отражения не переснимать после каждой мелочи. Успешный CI не visualapproval,
SwiftShader не подтверждает Mac/phone FPS. Экономика/AI/котики/океан/ТРЦ сохранены.

## Стабильная опубликованная версия

**`c477057b6eda6e251f02bc27735e4220d737112b`**, origin/main.
[Игра](https://arturmal2805-netizen.github.io/ai-cat-game/?v=c477057) ·
[Диагностика по запросу](https://arturmal2805-netizen.github.io/ai-cat-game/?v=c477057&profile=1).
[Workflow44579271016](https://github.com/arturmal2805-netizen/ai-cat-game/actions/runs/44579271016)
полностью **SUCCESS**: Node22 tests/build/dry-run, Worker deploy, exact server
release/shared saves, Pages. Платный AI inference не запускался.
PR#2 MERGED. Родители: прежний live6e28f75 и кандидат1a32b17; дерево равно кандидату,
ручных конфликтов не было. Product public/ равно финальному native/build f043655.

Реальные HTTP bytes проверены19 ноября17:54:13UTC (19:54 по Киеву), не только v:

- HTML SHA256 `b23ef7595b67953a77eb4b8cae0fe6e8738457e12f56cb0b5eabc866fed0b234`.
- JS `48922a7a2e2977b430ade30da5577f97f23a822363c4d39ed754e6714c105508`.
- CSS `1ca6fd7d91d93d2434122de8b604f9e1f0306145487ece7434204f01d46492bc`.
- SPA atlas `bad2f1b8b9825eccdb7a334b55fb9b9f9dd710edf1653b570b4bb2c0cb6f505e`.

HTML содержит одно приложение `dist/app.js?v=48922a7a2e2977b4`; реально загруженный
JS ссылается на новый atlas. Native phone CSS совпал с live по байтам.
[Квитанция](https://github.com/arturmal2805-netizen/ai-cat-game/blob/b91350c04fc29ad93c72e8cca38ab14c75f785e0/docs/qa/2026-11-19/spa-v7-release/live-verification.json)
на ветке `codex/spa-v7-release-evidence`, commit
**`b91350c04fc29ad93c72e8cca38ab14c75f785e0`** (remote проверен).
Там actual HTML/CSS/atlas, gzip production JS, статусы workflow и контроль старого
HTML до deploy. Evidence не отправлялось в main и не запускало повторный релиз.
Прямой Worker GET из среды ранее блокировал tunnel403; сервер проверил workflow.
Не объявлять проблему ключа из-за tunnel. Annotation о runtime checkout/setup
GitHub Actions не означает смену проектного Node22 на Node24.

## Что опубликовано

Проверенный структурный SPA V7: один корпус300×132м,3 настоящих этажа по14м,
8 крупных зон,96контактов, реальные лестницы по50ступеней,8VIP-ванн и верхний
бассейн с прозрачным дном. Свободная высота ночных сводов минимум10.8м; actual
triangles внешней крыши выше минимум на0.9м. Днища ванн закрыты service ceiling,
настоящий sky aperture сохранён. Midnight/Golden увеличены, тёмные полы/звёзды/
Amber-сектор/фиолетовый контур сохранены. Нап/Meditation/Beauty/Sauna убраны из
физического меню и новых AI offers; остаются8зон и10кнопок (обзор+8+выход).

Исторические14product/service IDs, цены и квитанции сохранены. Amber→Midnight,
Jacuzzi→VIP используют общий physical occupancy; снятые услуги принимают только
старые prepaid tickets как отдых в Midnight. Миграция старых поддержанных позиций
работает один раз через SPA-only marker7, уступает новой команде/позиции.
Во время raised/wet процедуры сохраняется раздельная сухая опора, живой кот не
перемещается; после reload прежний билет используется без повторного списания.
Точное восстановление лифта и общая семантика merge/shared-world сохранены.
Океан, ТРЦ, грунт, модели котиков, кошельки/инвентарь и общий AI не переделывались.

Код/specs/все этапы: main `docs/qa/2026-11-19/spa-v7/`, тексты V7 и VisualProtocol
в `docs/specifications/`. Фабрика default6 и RESORT_ZONES14 остаются историческими
geometry/service реестрами; production world явно выбирает layoutVersion7.
Не переписывать старые receipt IDs или считать старые6-тесты проверкой нового7.

## Проверки и точные границы доказательств

Node22 build и финальный полный main CI PASS. Native private Worker/SQLite:
8канонических процедур,8VIP-ванн,sky pool; весь путь от причала через лифт и
лестницы к массажу и обратно; старые оплаченные Jacuzzi/Nap; reload посреди
купания без новой покупки; desktopW/World release; реальное Cloud-скачивание
с SHA; ownership recovery/размещение за0 и две SQLite reload без дубля/потери
fixturecoins. Все96подходов/лестницы в обе стороны и14pool returns PASS.

Реальные pointer held touch на телефоне390×844/DPR2 прошли4м в сухом проходе,
pad136px помещается в экран, World освобождает управление. Первые два phone
fixture0,233 корректно остановились перед колонной0,234; это не сломанный touch.
Колонна/радиус/коллизии сохранены, свободный участок0,238→242 проверен sweep.
Первый functional run выявил Float32-щель бортика Cafe: исправлена настоящей
фаской underlap25мм/drop6мм; failed checkpoint сохранён, оставшиеся native пройдены.

A/B/C/D/E/final сопоставлялись с референсами повторно. Просмотрены все13реальных
видов (корпус/8комнат/sky above/below) и4финальных вида света; camera/FOV/DPR/
scene lights сравниваемых E/final кадров совпадают. Нормали сводов непрерывные,
свет больших полов выбирается по общей вершине, слой probe дискретен на примитиве.
9offline probes пересняты на чистом56cb872, без движущихся котов/рыб/воды/feedback.
Никаких per-frame CubeCamera, дополнительных sampler/passes/PointLights.
Финальный native bundle:
`9a922bbe799ab3ff1bdc5a24e6a0cbd6f2ebd92270df7514a151b97eb9038930`.
189manifest файлов проверены по Git bytes,30нужныхлогов force-added несмотря на*.log.

Ownership runner не сохранял instrumented bundle: его manifest честно содержит
null, PNG используется только как функциональное доказательство. Не выдумывать
bundle hash задним числом. Workerd Brokenpipe при shutdown не прервал assertions;
процесс exit0, errors[]/httpErrors[]. Живые пользовательские save/token не трогались.
Не повторять пройденные проверки без изменения/нового сбоя. Предпубликационная
[история](history/spa-v7-release-2026-11-19.md) хранит детали, но больше не активна.

## Что не объявлено завершённым

Это публикация структурного V7 этапа, **не визуальное одобрение пользователя**.
Фасад/сады ещё проще и реже художественного концепта. Все84motion sequences,
полный телефонный маршрут через каждый этаж и hardware FPS телефона/Mac не
сертифицированы. Не обещать сходство или скорость только по CI/SwiftShader.
Следующая работа — по ROADMAP, с референсами и одинаковыми условиями сравнения;
не применять старые изменения повторно и не включать редизайн ТРЦ в очередь.

## Сохранение работы / текущая среда

`/workspace/chichi-emergency-save-recovery` сейчас на `codex/spa-v7-release-evidence`
с evidence b91350c; public-код равен опубликованному c477057. Дерево чистое.
WIP в remote: `codex/spa-v7-consolidation=1a32b17`, `codex/spa-v7-visual-final=f043655`.
Старые worktrees не удалены. Каноническая память — `codex/ocean-recovery-memory`;
она отдельна от кода релиза. Всегда читать её свежий CURRENT, не запускать её
старый app как текущий main. Предыдущие6e28f75/d259c32 — исторический V6 контроль.

В существующем окне «Аккаунт» (☁, облачное сохранение) остаются «Сохранить текущий
мир» / «Загрузить мир из файла». Download содержит полную game schema, прогресс,
покупки/кошельки и checksum, не исходники, storage/outbox или секреты. Legacy
сохранения принимаются с проверкой; до импорта сохраняется долговечная предыдущая
копия. Не подменять recovery-файлом чужой или новый пустой мир.
