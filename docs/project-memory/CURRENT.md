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
**codex/spa-v7-consolidation**, checkpoint **01d0ae4b5583c00bd92f448d7b670282d44d532a**.
Проверить remoteSHA. Старые worktrees и WIP не удалялись; отдельная безопасная
ветка создана с опубликованного6e28f75. Baseline Node22 build PASS без tracked
изменений; существующие16 native кадров4b72f2f имеют тот же полный tree, что6e28f75,
три baselinePNG/metadata сохранены в новом docs/qa/2026-11-19/spa-v7/baseline.
Это reuse точной базы, не объявление нового native baseline прогона.

**Сейчас идёт phaseA native**, не запускать второй GPU и не менять code HEAD:
/workspace/qa/spa-v7-mass-native.log, output /workspace/qa/spa-v7-mass.
Flags CHICHI_EXPLORER_AUDIT=1 CHICHI_RESORT_SPA_AUDIT=1
CHICHI_SPA_V7_MASS_AUDIT=1 CHICHI_DESKTOP=1. Session93923 (проверить существование).
Подготовлен настоящий SPA root с QA-only layoutVersion7, три архитектурных вида.
Public default пока6; V7 НЕ активирован и НЕ опубликован. Это намеренно phaseA:
сначала силуэт/реальная масса, затем фасад, планировка/миграция/интерьеры.

Реализовано в public/resort-spa-layout-v7.js и resort-spa-palace-structure.js:
единая оболочка,3 непрерывных slab, слитная крыша/центральный и встроенные купола,
настоящие отверстия лестниц/бассейнов,40ступеней на12м rise,14 водных объёмов
(8 VIP jacuzzis,4 café,thermal+sky), sky bed действительно transparent.
Защищённые night floors вставлены в slab без перекрывающихся z-fightingслоёв.
Original root name/id сохраняются.3 unit cases actual geometry/layout PASS.
Это ещё НЕ готовые8 функциональных зон или визуальная приёмка.

После измерений корпус300×132м, corner60; НЕ прежний набросок300×184, который
закрыл бы shaft/вышел в мелководье.961 coarse6m samples дают bedgap22.5м,
reef18.59м,Mallgap19м; actual native/collision проверки ещё нужны. Ничего в
terrain/Mall/мозазавре не изменено. Лифт(20,300) остаётся вне перекрытий.
Midnight:56×36ellipse1583.36→86×42rounded3488.39м² (2.203×), VIP40×38ellipse1193.81
→92×64rounded5764.39м² (4.829×, включает8jacuzzis). Room ceiling target10.8м
вместо старого4м, rise12 вместо9. Замерять реальную нижнюю балку/перекрытие.

Карта14old→8new/component/camera/navigation сохранена в
`docs/qa/2026-11-19/spa-v7/compatibility-map.md`, measurements.json рядом.
Amber→Midnight,Jacuzzi→VIP. Nap/Meditation/Beauty/Sauna убрать из публичных
комнат/AI offers;14 исторических адресов products/receipts сохранять. Pure
redirect map уже есть, но runtime prepaid/occupancy migration ещё НЕ подключена.
Не выдавать список aliases за завершённую миграцию.

Ближайшее после phaseA PNG: сравнить секции A/B/D нового концепта, выделить3
крупнейших отличия и исправить силуэт/фасад, только потом меблировка. Получить
фактические фото, не генерировать их и не использовать reference какbackground.
Runtime V7 дальше требует8-zone data/booking/sharedphysicaloccupancy для aliases,
prepaid historical tickets без потери ledger, saved-position layout migration
(не захватывать swimmer/другие локации), новые камеры/10menuitems, re-seat
существующих мебели/контактов на нужных этажах, tall ceilings/private canopies,
актуальный9-layer room+sky rebake вместо старого15. Общую merge/economy semantics
не менять. Не ставить старые circular galleries/low roofs обратно в новыйкорпус.
Старые luxury/interiors содержат hardcoded203/18/9; не просто переименовать!

После каждого существенного этапа сохранять exactsource/bundle/PNG/log/hash в
remote. Перед final publish: Native процедуры/старые билеты/SQLite/Cloudbackup/
камеры/полныйscope unchanged соседей, Node22/fullCI/live assets. Визуальная
готовность отдельна от загрузки/кнопок. Новыйuser protocol просит реальные
скриншоты стадий и итоговую таблицу файлов/объединений/размеров/ограничений.
Subagents не использовать: developer запрещает, пользователь делегирование
не просил. Не останавливаться на phaseA WIP; продолжать V7 до результата.

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
