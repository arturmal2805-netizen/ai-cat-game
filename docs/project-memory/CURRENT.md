# Текущий статус

Обновлено 19 ноября 2026, Europe/Kyiv (публикация 18 ноября 21:56 UTC).

## Стабильная опубликованная версия

**39708e32a6a4f86b9a6a09d777fc4c38526a7f33**, origin/main.
[Игра](https://arturmal2805-netizen.github.io/ai-cat-game/?v=39708e3),
[диагностика по запросу](https://arturmal2805-netizen.github.io/ai-cat-game/?v=39708e3&profile=1).
[Полный workflow 44403570410](https://github.com/arturmal2805-netizen/ai-cat-game/actions/runs/44403570410)
завершён SUCCESS: tests, Worker deploy, точный release/shared saves, Pages.
Actual HTTP 2026-11-18T21:56:48Z, одно подключение приложения:
JS SHA256 `0b3d5f0bd640400cbcd65c7efb9d0feafdef0b1b003cf9601d03a36e341acdc0`;
CSS SHA256 `9db4746b53b8da87077097c9238673ce7d6a6e4f45652fb7b5c92aed121e9fd1`.
[Квитанция](../qa/2026-11-18/cloud-backup-publication/cloud-backup-live-verification.json).

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

## Активная задача — публикация проверенного этапа SPA V6

Код /workspace/chichi-emergency-save-recovery, ветка codex/spa-v6-reconstruction.
Remote checkpoint **4b72f2fa04dfdcf045c0a211570524d4c89d6268**, source clean.
Node22 build готов; модели не изменились. Gardens16beds/2three-tier cascades,
184flower/736leaf instances,6native batches. Все28affected public routes и20old
route fixtures PASS с прежним радиусом. Реальные Aroma bridge/Cabana connector
исправлены; стены/кошельки/21bath contacts/shared water сохранились.

Fresh actual15room probes завершены наca0813f3ec71232b427f4d98667a0e3fb153ad57:
PNG302059bytes c3beaca169a6462a0622a42858c67eec7bc14d61722b12d3530295de9c3b2cc0;
rawda49c948fe3bfaa711f85a1fc0cf05aa5f511949554ddfd9e4bdd350312eaf9c.
Точный архив docs/qa/2026-11-19/spa-v6-gardens-probes/native. Послеcapture
изменены только MASKED water UV/curvature; статическая видимая геометрия таже.
6targeted finalasset/garden cases PASS. Старыеcaptures сохранены отдельно.

**Сейчас идёт финальный native**, не перезапускать без проверки процесса:
/workspace/qa/spa-v6-gardens-release-native.log;
/workspace/qa/spa-v6-gardens-release (exact source4b72f2f).
Flags CHICHI_EXPLORER_AUDIT=1 CHICHI_RESORT_SPA_AUDIT=1 CHICHI_SPA_V6_AUDIT=1
CHICHI_SPA_V6_STAGE=gardens-release CHICHI_SPA_V6_ALL=1
CHICHI_SPA_V6_PROCEDURES=1 CHICHI_SPA_GARDEN_WALK=1
CHICHI_SPA_REFLECTION_AUDIT=1 CHICHI_REVIEW_HOUR=12 CHICHI_DESKTOP=1.
Один GPU, HEAD не менять до завершения capture. Нужны14rooms+sky,
publicAroma0/Cabana4 actualwalk/return, freshGPUarray/процедуры/privateSQLite.
Localfulltestsconcurrency2 ещё без итога, log /workspace/qa/spa-v6-gardens-full-tests.log.
Он стартовал до позднегоassetupdate: exactfinalfullgate — GitHubCI.

PR#1 https://github.com/arturmal2805-netizen/ai-cat-game/pull/1 draft доQA;
CI44535236300 на4b72f2f in_progress. Отдельный Workers Builds check FAILURE,
причина ещё не установлена; не путать его с главным Test and deploy workflow.
Пользователь требует публикацию данного этапа. После native/CI PASS сохранить
точные PNG/source/bundle/log/hash, отметитьPRready и merge без удаленияWIPветки,
дождаться ВСЕХmain jobs и сверитьactualHTML/JS/CSS/Workerrelease. Не заканчивать
ещё одним WIP-only ответом. Уже есть авторизация на публикацию.

Это улучшенный промежуточный SPA, не закрытый весьV6 и не визуальное одобрение.
R1/R2/R4/R5 сверять по фактическим кадрам; R3duplicateR1. Originalpixels только
в сообщениях пользователя. Полный источникзадания docs/specifications/underwater-spa-v6-2026-11-18.md.
Исторический контекст/оставшиеся художественные расхождения —
[предыдущая передача](history/spa-v6-gardens-pre-release-2026-11-19.md),
[правилаSPA](standards/underwater-spa.md). Mac/phonehardwareFPS не проверены.
Старыеworktrees/privateSQLite/архивы не удалять. Не повторять компенсацию баланса.

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
