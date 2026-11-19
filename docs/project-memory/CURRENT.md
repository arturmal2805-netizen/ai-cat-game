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
**codex/spa-v7-consolidation**, remote
**4f69e9f3c48926789de20439b38be1565c1cfa8a** (ls-remote подтверждён).
Main/live остаётся6e28f752291e65e7b51f7f093a004e5c81fd27b3.
Пользователь снова просит ускорить; не добавлять новые задачи в этап.

**Сейчас идёт13кадров actual native**, sourcefreeze до конца, один GPU:
session66889 проверить; /workspace/qa/spa-v7-interiors-d-native.log,
output /workspace/qa/spa-v7-interiors-d. Flags EXPLORER_AUDIT=1,
RESORT_SPA_AUDIT=1,SPA_V7_MASS_AUDIT=1,SPA_V7_PHASE=interiors,DESKTOP=1.
Фабрика по умолчанию пока6, privateQA явновключает7; production7 ещё НЕ активирован.
После capture просмотреть ВСЕ13PNG:3architecture+8rooms+sky above/below.
Не редактировать исходники/HEAD параллельно capture. Не завершать на WIP.

PhaseA01d0,PhaseB772a native3views и PhaseCf85bc69 native7views/errors[]
завершены и сохранены exactsource/bundle/PNG/log в active code branch:
docs/qa/2026-11-19/spa-v7/native-{mass,facade,interiors-c}.
PhaseC bundle3d46f71115d5749c633800e05fffcaedbd73cf7f35567945c74aefa526970f96.
В visual-review-c.md записаны реальные3расхождения, не visualapproval:
плоский Thermal, овальные старые nightcaps, VIPcamera за занавесью.
Следующие исправления4f69 ЕЩЁ ждут новыхPNG.

Реальный общий корпус300×132/corner60,3этажапо12м,не14павильонов.
Midnight1583.36→3488.39м²(2.203×),VIP1193.81→5764.39(4.829×с8ваннами).
Новые full-outline starvaults имеют spring10.8м,нестарые4.15;1600stars каждый,
continuousvioletLED. Тёмныеполы Midnight/VIP сохраняются. ВThermal actual
middlefloorvoid создаёт23.6м надводой;2балконныхкаскада физическипадают через
проём в существующий нижний бассейн,4садовыхкаскада/плотныецветы/листья.
Aroma/privateglass canopybase10.8,6Cabana fronts также10.8. Room supports,
мебель/квитанции/workercontact изоднихпозиционныхданных. Skybed/wall/water
оставлены3native transparentfaces для camera-depthsort сверху/снизу, неслиты
сwholefaçadeglass. Новыеabove/below кадры проверятреальныйвид.

**96контактов +2лестницывобестороны PASS**, final-geometry-stage.log9tests,
включаяactualweirs/vaults/migration/prepaid. Newpalacelift roundtrip сначала
поймал реальныйнеподдержанныйoldwaitingpoint; исправленыsupportedwaits
16.4/13.8,293.2; прежниеassertreturnнеослаблены. New7 и old6 транзитPASS.
Комбинированный28run дал27PASS/1ReferenceError вlegacy6 изширокойвставки;
ошибкаcascadesremoved иlegacytransitretеstPASS. Всеfailedlogs сохранены.
Node22stagebuildPASS;моделикотовнеизменены,indexимеетодноappподключение.
Не называть этоfullCI/release; finalexactCI/live ещёобязательны.

Root7 serviceContract подключён кappointments/staff/booking/transit и10itemmenu.
14историческихproducts/IDs/prices/receipts остаются;8canonicalphysicalrooms
вresort-spa-services-v7.js. Jacuzzi18wet VIPslots,Amber4warmMidnightslots,
retired4 толькоprepaidMidnightrest сoriginalreceipt, без новыхмонет/продаж.
Зоныпо3этажам. Factorydefault и RESORT_ZONES покаисторические14; приactivation
можно явно вызватьmodel({layoutVersion:7}) вworld и publicoffers вывести из
SPA_V7_ZONES, сохранив историческийregistry дляledger. Не менять14receiptIDs.
Доказатьactualroot7, ане считатьlegacy6 Nodegeometrytests production7 audit.

SPA-only catLocations.spaLayout=7 добавлен normalize/capture/world hook;
shared-world/merge semantics НЕ менялись. Layoutrecovery исключает hero
submarine/explorer,lift,otherbiomes/arbitrarydiver/newmarker. Retiredpositions
вближайшийSUPPORTEDPUBLICHALL, всеbodyplacesраздельные; clearrecoveryBEFORE
onGoal, чтобы синхронныйsave получилmarker7.12oldCatLocation+3newreload/stale/
walletchecksPASS; native OWNERSHIP_AUDIT и старыйprivateSQLite ещёОБЯЗАТЕЛЬНЫ.
World.js имеетТОЛЬКО2SPAhooks:cameraoptions иpositionstamp,необщийредизайн.

После13PNG: исправитьпо3существеннымвидимымотличиям. Замеченоpotential:
commoncontinuousslab сейчас получает один lampID поcentroid; разным комнатам
нужно boundedпервершинное назначение приprepare, безshaderloop8/perframecost.
УвеличитьV7A*gridextent от160cells(.85м=>±136м) под±150мширину, сохранивold6.
Актуальный9layer(8rooms+sky) native reflectionrebake, нестарые15. Выставить
skyprobe8, shaderclamp7/manifestderived; bakehelperпокаspecsold14/rows4.
Не вызывать второйGPU пока13runидёт. Потом activation8offers/root7, native
все8процедур/8VIPванн/legacyprepaid/SQLite/reload/Cloudbackup/phone/manual/
Worldrelease/scopeguard,Node22fullCI/live. ПлатныйAIQAневызывать. Сохранения
пользователянеиспользовать. Полный V7 ещё НЕ готов/НЕ опубликован/НЕ одобрен.

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
