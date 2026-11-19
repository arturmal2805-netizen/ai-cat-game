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

## Активная задача — SPA V6, НЕ опубликована и НЕ одобрена визуально

Код: /workspace/chichi-emergency-save-recovery, **codex/spa-v6-reconstruction**.
Удалённый checkpoint **49513c41a5aa555d0e92b55db9b11ef9fdb9a48f**, рабочее дерево чистое.
Последняя художественная/renderer правка **be2676c31f1b73fe5e1215a288c44738f95c3caa**.
Завершённое native продолжение — source30467bf3545cebf4db8112b912fbda9f1617d628.
**Активных QA/GPU процессов нет.** Не начинать заново: все этапы сохранены в remote.
Старые worktrees/исходники/SQLite не удалялись.

[Полное задание](https://github.com/arturmal2805-netizen/ai-cat-game/blob/49513c41a5aa555d0e92b55db9b11ef9fdb9a48f/docs/specifications/underwater-spa-v6-2026-11-18.md),
[журнал каждого референса](https://github.com/arturmal2805-netizen/ai-cat-game/blob/49513c41a5aa555d0e92b55db9b11ef9fdb9a48f/docs/qa/2026-11-18/spa-v6/reference-review.md),
[последние точные доказательства](https://github.com/arturmal2805-netizen/ai-cat-game/tree/49513c41a5aa555d0e92b55db9b11ef9fdb9a48f/docs/qa/2026-11-19/spa-v6-soft-polish),
[NEXT](https://github.com/arturmal2805-netizen/ai-cat-game/blob/49513c41a5aa555d0e92b55db9b11ef9fdb9a48f/docs/qa/2026-11-19/spa-v6-soft-polish/NEXT.md).
Оригинальные пиксели R1/R2/R4/R5 пока только в сообщениях, R3 — дубль R1.
Не выдумывать локальные оригиналы/ссылки. Пользователь считает результат далёким.

Сделано в последних этапах: реальные offline отражения14комнат+sky из настоящей
сцены; verified linear DataArrayTexture128×128×15, одна загрузка299711байт,
без runtime capture. SPA-only floors/21basins; общие вода/Mall/модели/сохранения
не менялись. GPU sampling пятислоёв byte-exact/GLSL PASS; raw всех15 сверены.
Технология/provenance/cache/fallback в [стандарте SPA](standards/underwater-spa.md).
Первый capture на3ab73cd, архивbbab0e6; native GPU proof5adfcdb сохранёнbd6195e.

Мягкая мебель: curved tied curtains с нижним краем+.08/реальными рейками
(Aroma2.7/Cabana2.8/обычная3.6), puffed decorative pillows, исходные контактные
сиденья/подставки сохранены. Реальный shipped velour normal/roughness, neutral
SPA albedo, правильный warm walnut key. Различимые тёмные polished floors
ночных комнат, собственная256px VIP spiral galaxy на настоящем своде, brighter
fixed stars. Чрезмерное broad amber reflection rough ceiling ослаблено локально.
5targeted reflection/shadow и4physical cases PASS под Node22.

Сверка: полная серия992355c — шесть R1/R2/R4/R5/cabana/sky PNG и NapW PASS,
потом private QA wallet precondition fail ДО sky покупки. PARTIAL сохранёнc294dde.
Это ошибка подготовки тестового мира, не потеря liveмонет; production не менялся.
be2676c — три affected R2/R4/cabana PNG, прервано рестартом среды, сохраненоf88adeb.
Продолжение30467bf меняет ТОЛЬКО Node harness budget/выбор оставшегося кадра.
**Все421 public source files И QA bundle идентичны** прерванной серии:
SHA256 bb5d43d1d5ffb0243313224dc633451a6b6b8957f5f087e1ee4b5ed0caeeaaae.
Оставшийся sky/Nap W/footstool/World, настоящие ступени/плавание/игра/возврат/
сухой выход/отряхивание/одна150плата/receipt/privateSQLite reload PASS,
финальные errors[]/httpErrors[]; одно подключение приложения. Полный результат
сохранён49513c4, native-completion/continuation-parity.json. Исходные PARTIAL
и INTERRUPTED архивы сохранены отдельно, не подменены общим all-PASS.
Все97 manifest entries проверены по байтам и Git tracking, логи force-added.

**Следующий шаг — полноценные сады/каскады и цельная архитектурная композиция.**
R1/R3 пока слабые аквариум/бар/сервис и цветы; R2 не хватает плотного водного
сада; R4 — богатой композиции света/растений; R5 — связного дворцового силуэта,
павильоны пока слишком разрознены. Не закрывать весь этап по крупному плану.
Смотреть каждый reference на следующих этапах и сохранять каждый проверенный
checkpoint с точным source/bundle/settings/PNG/log в remote. Не дублировать
уже пройденные неизменённые сценарии без причины.

Текущие reflection assets сняты ДО новых полов/мебели/галактики. После финальных
geometry/light правок пере-снять через существующий native baker; не выдавать
старый probe за точное соответствие новой геометрии. Затем native14комнат/
84фазы/отмена/занятость/reload/phone/performance, Node22/fullCI/actual live
перед публикацией. Физические Mac/phone FPS НЕ проверены; SwiftShader не замена.
В production world lighting фиксирован; HUD час сам не меняет Hemisphere/sun/rim.
Не объяснять разницу «ночью» без реальной цепочки света.

Нельзя просто развернуть overview к фасаду: readonly az0/d200/e.4 попадает за
реальную чашу и под берег (waterRadius1.27,bed-.495,eye-73); существующий
az1.35/d210/e.5 свободен, min terrain clearance39м. Проверять реальную
геометрию, не прятать скалы/не выключать коллизии ради ракурса.
Архитектурный редизайн ТРЦ исключён,14room IDs/сиденья/кошельки/инвентарь/
покупки/модели и единственного owner сохранять. Существующий SPA footprint226×137
помещается в248×144 без глобального scale. PaidQA толькоprivateSQLite, без LLM.

Подробная предыстория — [историческая передача](history/spa-v6-checkpoints-2026-11-19.md).
Вспомогательный sparse worktree /workspace/chichi-spa-reflection-runtime остаётся
чистым наd8b3b03; это НЕ текущий runtime код. Не продолжать из него по ошибке.

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
