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

## Завершённая публикация SPA; следующий этап не начат

PR#1 слит обычным merge6e28f752291e65e7b51f7f093a004e5c81fd27b3.
Родители: stable39708e3 и проверенный4b72f2f; полный tree совпадает с4b72f2f,
конфликтов и новых правок при merge не было. История checkpoints сохранена.
Основной checkout /workspace/chichi-emergency-save-recovery, ветка
codex/spa-v6-reconstruction, после публикации продвинута fast-forward к6e28f75.
Никакие старые worktrees или пользовательские изменения не сбрасывались.

Проверки: точный PR CI44535236300 SUCCESS; финальный main workflow44539374765
SUCCESS. Local broad1171/1171 PASS стартовал до позднего probe update, поэтому
точное полное подтверждение финального кода — CI, а не только local log.
Final6 targeted cases PASS. Все28 подходов и20 прежних маршрутов PASS.
Native на clean4b72f2f:16 видов, пять слоёв byte-exact GLSL/21pool mappings,
publicAroma0/Cabana4 туда и обратно,11 сухих/4 водных процедуры, реальные позы,
оплата/квитанции/privateSQLite reload/World release. Errors[]/httpErrors[],
одно приложение. Phone390×844/DPR2 удержание кнопки и освобождение управления
PASS; все423 imported source hashes и QA bundle совпадают с desktop.
Это не сертификация всех84 движений/каждого контакта/пути от берега или
аппаратного FPS настоящего Mac/телефона.

Полный evidence remote codex/spa-v6-release-evidence, commit **d259c323876187606fa9512baff0b59c7d83845c**:
[Артефакты](https://github.com/arturmal2805-netizen/ai-cat-game/tree/d259c323876187606fa9512baff0b59c7d83845c/docs/qa/2026-11-19/spa-v6-gardens-release).
Native/phone source, QA bundle, настройки, PNG, логи, CI и live receipt;
все86 entries финального manifest сверены по байтам и Git tracking.
/workspace/chichi-spa-release-evidence — sparse worktree артефактов,
не другой runtime. Браузерные проверки и наблюдение workflow завершены.

Свежий capture15 комнат снят наca0813f после мебели/полов/галактики/садов.
Provenance в runtime manifest и docs/qa/2026-11-19/spa-v6-gardens-probes/native;
27 entries bytes/Gittracking PASS. Поздние UV/curvature меняли только скрытую
при capture воду; статическая видимая геометрия не менялась.

Далее продолжать оставшиеся художественные расхождения по R1/R2/R4/R5,
сохраняя сделанное; R3 — дубль R1. Не начинать реконструкцию заново.
Журнал новой сверки находится в release evidence/reference-review.md.
Пока уступают цельность силуэта, плотность водных садов, слои света и деталей.
Обычный кадр Aroma почти не показывает каскады и не подтверждает их close-up
motion quality. Полное задание — docs/specifications/underwater-spa-v6-2026-11-18.md;
устойчивые контракты — standards/underwater-spa.md. Редизайн ТРЦ исключён.

Отдельный Workers Builds Git check ранее падал и на stable39708e3; причина
по пустому GitHub output не установлена. Не объявлять этот check успешным:
настоящий deploy и версия подтверждены главным workflow и live bytes.
Нельзя повторять компенсацию монет, трогать живой мир или выдавать routine
release verification за платный ответ LLM. Прежняя история — history/.

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
