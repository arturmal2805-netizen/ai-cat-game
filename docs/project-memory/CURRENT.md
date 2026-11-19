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

## Активная задача — V7, единый SPA

Код /workspace/chichi-emergency-save-recovery, codex/spa-v7-consolidation,
remote664a7c7 (проверитьполныйSHA черезls-remote). Main/live всёещё6e28f75.
V7/VisualProtocol тексты лежатвdocs/specifications; новыйконцепт1536×1024
УЖЕполученвчате. Inlineбайтынедоступны:невыдумыватьhashкартинки.
Пользовательпроситускоритьпубликацию,никакихновыхпобочныхзадач.

A/B/C/D native завершены:3+3+7+13реальныхPNG сexactsource/bundle/log в
code docs/qa/2026-11-19/spa-v7/native-{mass,facade,interiors-c,interiors-d}.
D4f69 нашёлпересеченияреальнойкрыши(VIP-1.426m/Midnight-.713m),зубчатый
coping/пол,открытыеднищаванн. Исправленыв4d85624,НЕмаскировкой:
3этажапо14м(ранее12),50реальныхступеней×.28,roofspring46,nightvaultmax45,
минимум10.8мвкомнатах;serviceceiling12мнадсреднимэтажомскрываетднищаванн,
ноимеетреальныйskyhole19м. Poolholesссовпадающим192samplecopingboundary.
НастоящиедиваныWaterfall,масла/свет/8ограниченныхJacuzzieffectsсохранены.
Footprint300×132/corner60,реальные96контактов/лестницы/лифт;Mall/днонеизменены.

ProductionworldтеперьЯВНОmodel({layoutVersion:7}),offers8activeIDs.
RESORT_ZONES/products14остаютсяисторическимреестромквитанций/default6тестов;
новаяиграневызываетdefault6. Menu10=overview+8+exit. AliasAmber/Jacuzzi
используютизначальныеквитанции,retired4толькостарыйprepaidrestбезпродажи.

32targetedNode22PASSвpre-probe-tests.log.9/9newrealreflectionbakeна4d85624
завершён,source-stateguardPASS. Atlas01443cd814ef1222ea2ccef537e5cb97989269428d4833cc9ebcdc7093fb6997,
raw5a05a2493adaaa6112fea0adc41b86fbdd7e76671522119d369afb54c73c3264,
bundlecc69072f01663062f94b096784929339f76b6cbef2e7a39b6f35e0efdf3e11ca.
Полнаяцепочкаnative-nine-probesархивирована,новыйatlas/9manifestподключены.
Старый15atlasсохранёнкакhistory/cachedclient. Sky8,finishclamp7,cachekeyrevision.

664a7c7:9targetedreflection/recoveryPASS. Staleasyncmigrationотменяетсяпри
новойкоманде/позиции;manualheroзаблокировантольковrestoring-phase. Savehook
во времяwet/elevatedпроцедуры сохраняетdrysupportapproach,неперемещаяживого
кота. Несколькокотовполучаютраздельныеточки;еслинетопоры—предыдущаяпозиция.
Прерванныйpaidticketпослеreloadиспользуетсябезновойоплаты;completedconsumed
необнуляется. Общийmerge/shared-world/баланснетронуты. Exactliftreloadсохранён.

СейчасОДИНGPUactualnativefunctional/session17221 (проверитьзавершение),
/workspace/qa/spa-v7-functional-native.log,outputspa-v7-functional.
ФлагиEXPLORER_AUDIT=1 RESORT_SPA_AUDIT=1 SPA_V7_FUNCTIONAL_AUDIT=1 DESKTOP=1.
Harnessпроверяет8услуг,8VIPbaths,sky/Cafewet,историческиеpaidtickets,
реальныйshore→lift→14mstairs→procedure→shore,SQLiteinterruptedpoolreload,
W/Worldrelease/Cloudbackup. Нередактироватькодпокаrunснимаетsource-state.
Потомfinal13actualimagesсновымиprobes,phoneheldtouch,OWNERSHIP_AUDITrequired,
Node22exactbuild/fullCI/Pages/livebytes. НЕзаканчиватьнаWIP/плане.
НепутатьnativePASS/CIсвизуальнымодобрениемилиhardwareFPS. Всёещёдальшефоторефа.
