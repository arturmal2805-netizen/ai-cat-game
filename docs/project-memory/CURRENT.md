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

## Активная задача — дождаться развёртывания SPA и проверить live

PR#1 уже MERGED вmain **6e28f752291e65e7b51f7f093a004e5c81fd27b3**,
19 ноября14:01:47UTC. Полный tree идентичен проверенному
**4b72f2fa04dfdcf045c0a211570524d4c89d6268**, без конфликтов/новых правок.
Merge сохранил всю checkpoint историю: родители stable39708e3 и source4b72f2f.
WIP codex/spa-v6-reconstruction и старые worktrees сохранены, не удалять/reset.
Код в /workspace/chichi-emergency-save-recovery остаётся наclean4b72f2f;
не начинать разработку заново. Дополнительные code changes сейчас НЕ нужны.

**Главный publication workflow44539374765 сейчас in_progress**:
https://github.com/arturmal2805-netizen/ai-cat-game/actions/runs/44539374765
Не объявлять сайт обновлённым по одному merge/URLv. Дождаться всех test/deploy/
Verifyrelease/sharedsaves/Pages jobs SUCCESS, затем actual HTML/JS/CSS/atlas bytes.
Verifier /tmp/verify-spa-publication.py; постоянная копия в evidence branch.
Node22 какCI; не rebuild Node24, не запускать paidAI. Прямой Worker host здесь
ранее tunnel403; успешный exact-release/shared-save CI — отдельное доказательство,
не выдавать403 за успешный directGET или за realLLM inference.

Проверки завершены: exactPRCI44535236300 SUCCESS; localbroad1171/1171 PASS
(стартовал до позднегоprobeupdate, exactfullgate — CI); final6targeted PASS.
Native clean4b72f2f:16views(overview+14rooms+sky),5arraylayer byte-exactGLSL/
21pool mappings,actualpublicAroma0/Cabana4 outward/return,11dry/4wetservices,
poses/receipts/privateSQLite reload/World release PASS; errors[]/httpErrors[],
одно приложение. Phone390×844/DPR2 actual heldtouch/compactbounds/originalChichi/
Worldrelease PASS; все423 publicsource hashes и QA bundle identicaldesktop.
HardwareMac/phoneFPS и полный84motion/everycontact/shore tour не сертифицированы.

Доказательства remote **codex/spa-v6-release-evidence**, checkpoint395c03f4f65173e5abdbd257a1c6c9d47aa1da2c:
docs/qa/2026-11-19/spa-v6-gardens-release/{native,phone}, exact source/bundle/
PNG/log/manifests + comparison/reference-review/CI. /workspace/chichi-spa-release-evidence
— отдельный sparse worktree артефактов; это НЕ другой runtimeкод.
Не перепутать его с основным checkout. Финальный publication receipt добавить
сюда после deploy. Полная проверка всехmanifest bytes/Gittracking обязательна.

Свежие actual15roomprobes sourceca0813f, PNG302059bytes c3beaca169a6462a0622a42858c67eec7bc14d61722b12d3530295de9c3b2cc0,
rawda49c948fe3bfaa711f85a1fc0cf05aa5f511949554ddfd9e4bdd350312eaf9c.
Архив в коде docs/qa/2026-11-19/spa-v6-gardens-probes/native;27entries bytes/Gittracking PASS.
Late UV/curvature меняли onlymaskedwater, видимыеstaticcapturecontents сохранены.
16beds/2three-tiercascades/6nativefoliagebatches;28affectedpublicroutes+20default
fixtures PASS. FixedrealAroma bridge/Cabana connector; unchangedradius/walls,
originalmodels/economy/shared-save/watercore intact.

Внешний Workers Builds Gitcheck FAILURE присутствовал и наstable39708e3;
причина не установлена, пустойGitHuboutput. Не заявлять этотcheckSUCCESS.
Настоящую публикацию подтверждать главным Test and deploy workflow иlivebytes.
Это промежуточный художественный SPA, НЕ visualapproval/fullV6. R1/R2/R4/R5
сверены опять, R3duplicateR1; сохраняется отставание по плотности сада/свету/
связному palace silhouette. Референсы не подменены картинкой в игре.
Цель/ограничения — standards/underwater-spa.md; прошлое — history/. Не повторять
компенсацию монет, не трогать живое сохранение. Пользователь требует публикацию,
не заканчивать WIP-only ответом и не просить разрешение повторно.

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
