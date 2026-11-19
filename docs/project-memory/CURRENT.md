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

## Активная задача — V7, объединение SPA в единый корпус

Пользователь прислал V7 и Visual Implementation Protocol V1, затем новый
концепт1536×1024 и пример низкого потолка на6e28f75. Это заменяет требование
14 самостоятельных комнат. Новый визуальный источник УЖЕ получен в чате;
локальные оригинальные байты inline картинок не доступны, не выдумывать их SHA.
Полные тексты: docs/specifications/underwater-spa-v7-2026-11-19.md и
spa-visual-implementation-protocol-v1-2026-11-19.md.

Активный код: /workspace/chichi-emergency-save-recovery,
**codex/spa-v7-consolidation**, remote checkpoint
**f85bc69b48cfae355dec2b21927775a68f8fd697** (проверен ls-remote).
Main/live всё ещё6e28f752291e65e7b51f7f093a004e5c81fd27b3.
Default model6; новый7 включается пока только в точном private QA bundle.
Не публиковать незавершённый корпус и не называть его готовыми8зонами.

PhaseA01d0ae4 и phaseB772a631 завершили реальные3кадра/ошибки[]/HTTPошибки[].
Архивы exact source/bundle/PNG/log: docs/qa/2026-11-19/spa-v7/native-{mass,facade}.
PhaseB bundlefb48fa4ed6df33680c84311c605af3f241220aa80a4cf12ed55e73fac7804593.
Референс A/B/D просмотрен повторно: каркас един,20 рёбер/главный портал есть,
но нет достаточного наполнения/читаемого стекла/внутреннего света. НЕ visualPASS.

Корпус300×132/corner60,3 непрерывных slab,rise12,10.8м minimumroomceiling.
Midnight1583.36→3488.39м²(2.203×);VIP1193.81→5764.39м²(4.829×с8ваннами).
961 coarse samples:bedgap22.5/reef18.59/Mall19м; terrain/Mall/мозазавр неизменны.
Лифт20,300 вне корпуса; новая физическая нижняя трасса20,293.2→0,293.2→0,289.2.
Арка40 individualsegments, радиус.571; body sweep portalPASS, соседняястена закрыта.

Теперь идёт **phaseC/D furnished native** на sourcef85bc69; sourcefreeze до конца.
Session4296 проверить; /workspace/qa/spa-v7-interiors-native.log,
output /workspace/qa/spa-v7-interiors. Flags какmass,PHASE=interiors,7кадров
(3общих+Midnight/Golden/Thermal/Massage). Один GPU, не запускать второй.
Новыйreport не подтверждает fullprocedures/старыеSQLite/recovery/deviceFPS.

Новая независимаяregistry resort-spa-services-v7:8 физических комнат,
14 исторических услуг.18wet+12dryVIP,16Midnight,остальныекакплан.
Booking/runtime принимают optionalcontract; aliases используют один canonical
seatMap. Jacuzzi ограничен18wet,Amber4warm; retired4 только с исходным оплач.
билетом погашаются как Midnightrest, не продаются/не конвертируются ввалюту.
15 targeted testsPASS:prepaid/occupied/cleaning/sharedseats плюс прежниеruntime/
booking/access/transit иactualgeometry. Не означает nativeфункциональности7.

Внутри7 уже furniture изтехжеконтактов,полновысотныемассажныекабины,
защищённыетёмныеполы,starvaultbase10.8 вместо4.15;нетстарыхlowpavilionroofs.
Luxuryhelper параметризован zones/seat/rise/palace; default6 сохранён.
Навигация7 берётrise12/40stairs,finishlights8rooms optional. Старая15-layer
reflection пока неrebaked под9; не выдавать этот interim вид за конечный.

Следующее: проверить ВСЕ7actualPNG/секции A/B/D/E/F/G/H; исправить3главных
различия. Затем подключить8-zone publicdata/menu(10buttons), runtimecontract/
appointments/staff/новуюlowerapproach transit, saved-positionlayoutmigration.
Последнее ещё НЕ сделано: отличатьlegacydryfloor отrealdiver, исключитьactive
submarine/explorer/lift, вернутьretiredpositions вsupportedhall, сохранить14
productprices/receiptIDs. Общийmergeалгоритм не менять. Новый9-layer room+sky
rebake послеgeometry/art. Потомnativeprocedures/SQLite/Cloudbackup/камеры/
scopeguardNode22/fullCI/live перед публикацией. Не завершать наWIPпрототипе.

Предыдущее опубликованное состояние — history/spa-v6-publication-2026-11-19.md.

## Предыдущее аварийное восстановление

0d21c0f исправил boot callback/TDZ при pending outbox, 4025f71 — strict loading,
read-only rescue, server fresh-reset guard, automatic SPA preparation и адресную
однократную компенсацию. После новой ссылки пользователь ответил «все збс красава»:
общее подтверждение успешного исправления; точных чисел живого баланса не прислал.
Не повторять компенсацию вручную. Permanent receipt и pre-award copies сохранены.
Raw recovery code — секрет, никогда не публиковать. Старая колония147/история не
восстановлена; разрешённая компенсация не является её реконструкцией.
Крипто mock long/short/reload/escrow тесты PASS; реальный remote AI inference
по-прежнему не подтверждён из-за tunnel403. Не обходить ограничение и не выдавать
configured/release за платный LLM ответ. Детали и QA — в предыдущей истории CURRENT.

Каноническая память codex/ocean-recovery-memory — документация, не код релиза.
Реконструкцию продолжать из названной WIP-ветки. [Индекс](README.md),
[стандарт SPA](standards/underwater-spa.md), [очередь](ROADMAP.md),
[решения](decisions.md), [recovery](evidence-and-recovery.md).
