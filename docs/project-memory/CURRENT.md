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

## Активная задача — полная реконструкция SPA V6, НЕ опубликована

[Полное задание](../../specifications/underwater-spa-v6-2026-11-18.md).
Код /workspace/chichi-emergency-save-recovery, ветка **codex/spa-v6-reconstruction**.
Последний удалённый код **63976055337663d736dad265b8e10e16eefceae9**.
Старые worktrees не удалены. archive/pre-spa-v6-2026-11-18 сохраняет
0d21c0f0773d756790facf75cc35574376263f60. Не отправлять художественный WIP в main.

Пользователь требует продолжать тщательную сверку КАЖДОГО R1/R2/R4/R5 на многих
этапах и сохранять КАЖДЫЙ этап в remote на случай токенов. R3 — дубль R1.
Оригинальные пиксели пока только в сообщении, не в локальных файлах. Журнал:
WIP docs/qa/2026-11-18/spa-v6/reference-review.md. Все серии ещё далеки от цели;
native/CI PASS не означает визуальное одобрение. Не начинать заново.

Завершённые точные native серии (source/bundle/overlay/PNG/log/manifest в WIP):
- baseline/architecture/materials: all14room fixtures, 11dry, thermal/jacuzzi/VIP/
  sky/SQLite PASS. Не полный береговой тур/84фазы/аппаратный FPS.
- sealed-light: **9be301eb242e77f25d0d26f79cae59e898854c12**, Nap seat6 настоящая W
  через footstool, World-owner release, sky/transparent underside/SQLite PASS.
- furnishing: **b38f5a379dced02e123a5620155c037933855b6a**, 4 настоящих VIP dry
  лежака рядом с4 wet, своя хореография/плата/возврат/SQLite PASS. Все31+12unit
  случаи той версии завершены отдельно после рестарта. Полный поздний suite
  не объявлять по прерванному логy. Реальные рыбы/навесы/цветы, visual WIP.
- water-dining: **cd4bd52621ba80baf3842764a20737bbd6ad38fd**, 4Cafe wet/4dry
  места с прежними8 reservations/product/ценой/ledger. Реальные отверстия, столы,
  подводные скамьи, ступени/waypoints/безопасная отмена. Native cup/drink/lick/
  treat/сухой возврат/одна оплата/SQLite PASS. 21 actual basins. Закрытый glass
  cap аквариума блокирует камеру; настоящий задний проём атриума x0,z194
  сохранён геометрией пола передней дуги бара. Тест обеих сторон и исходный
  failure сохранены. 10 targeted и3 corrected PASS;9 прочих V6/camera PASS.

Текущий седьмой код6397605: верхний стеклянный бассейн36м вместо20м, настоящее
отверстие верхнего пола/мостик/лампы/камера следуют размеру, те же4 thermal seats.
Три уровня карнизов/bridge fascia по точным clipped контурам. Плантеры и6
фиксированных native instance batches цветов/листьев добавлены ПОСЛЕ static bake;
их собственные clone-material не наследуют range/aMallRoom shaders. 18physical
unit PASS,2cutaway/buffer PASS и1native instance material isolation PASS.
Графика/радиус кота/коллизии/ТРЦ/общая вода/экономика/AI/save schema сохранены.

СЕЙЧАС native **galleries**, exec67185, лог /workspace/qa/spa-v6-galleries-native.log,
результаты /workspace/qa/spa-v6-galleries. Шесть кадров (каждый референс+sky), затем
настоящая W/Nap→World, расширенный sky/ступени/процедура/выход/дно снизу/SQLite.
Сначала читать прогресс, не перезапускать долгий успешный run. One GPU browser.
Точная команда/next step: WIP docs/qa/2026-11-19/spa-v6-galleries/NEXT.md.
По завершении scripts/archive-spa-stage.py проверяет hashes и сохраняет allow-list
без privateSQLite/секретов; force-add логи, проверить все manifest entries tracked,
push WIP и обновить эту память. Сохранять результаты и не приписывать старым PNG
новый код. Текущий dirty test/resort-spa-shadow-bake.test.mjs воспроизводит
следующий дефект, сам public код пока не менялся после6397605.

НАЙДЕНО для следующей итерации: finishResortSpaSteps создаёт временный Mesh clone
без копирования source.castShadow; batchModelSteps берёт parts.some(castShadow),
поэтому мебель/непрозрачные потолки SPA теряют тени. Новый тест запущен отдельно
(ожидаемый failure), лог /workspace/qa/spa-v6-missing-shadow-reproduction.log.
Это конкретный дефект; ещё не проверенное объяснение всего внешнего вида.
Исправить сохранение flags отдельным этапом и сравнить реальные те же ракурсы.
Также текущие probe отражения — ocean/Mall/sky, они не содержат новые интерьеры.
Нужен настоящий offline scene-derived SPA bake, не случайная reference картинка
и не полный пересчёт отражений каждый кадр. Сначала завершить текущий native.

QA clock: reviewHour12 сбрасывает epoch перед loop; post-render getter читает
12:15–18 после software render stalls. Седьмая серия отдельно записывает clock
начала кадра и реальные light colors/intensities/FOV/aspect. В production world.js
Hemisphere1.2/sun2.2/rim.9 фиксированы; HUD час сам по себе НЕ меняет этот свет.
Не приписывать шейдеру «день/ночь» без фактической проверки световой цепочки.

Дальше: сверка каждого референса; тени/реальные интерьерные отражения, полноценные
сады/каскады/мягкий декор/свет, финальный проход14комнат/анимаций, phone/performance,
Node22/fullCI/actual live перед публикацией. Не обещать Mac/phone FPS по SwiftShader.
Планировка226×137м в резервации248×144м пока помещается без глобального scale.
Модели/монеты/инвентарь/покупки не менять. Архитектурный редизайн ТРЦ исключён.

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
