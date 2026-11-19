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
Последний удалённый код **30467bf3545cebf4db8112b912fbda9f1617d628**; art/renderer остаётсяbe2676c31f1b73fe5e1215a288c44738f95c3caa. Архив15actual probes **bbab0e60e65a30b4aea2c4fd76a7717e9ebbda86**.
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

Седьмая native серия завершена: **d0a2e9f4f7b93498d799cd333ecab50dee4e56c8**
сохраняет шесть кадров, настоящую W/Nap/World и расширенный36м sky со ступенями/
процедурой/выходом/дном снизу/одной оплатой/SQLite PASS. Visual review нашёл
дублирующие Cafe арки13–19м и люстру до17.2м внутри настоящей воды16.2–18м.
Не выдавать этот успешный behavioural audit за готовый внешний вид.

Восьмой исходник **212553143cc8ba1e29f8a42be6a0c95643d3ab14** исправил сохранение
source.castShadow/receiveShadow в finishResortSpaSteps; прозрачное стекло/вода
не стали opaque casters. Исходный воспроизводимый failure и2 corrected cases
сохранены. Cafe уже использует главный купол: дублирующие низкие арки убраны,
люстра опущена под стеклянное дно. Vertex test подтверждает свободный объём воды.
Native восьмой серии завершён и сохранён в remote **d72d101137ecfc24b7c3e36536c5f868b37ccdf8**:
шесть кадров/реальные тени/World release PASS. Непотревоженные процедуры заново
не объявлялись проверенными. Визуально видны контактные тени и чистая вода без
арок, но ещё далеко от R1/R2/R4/R5. Сравнение camera/light/DPR и log/source/PNG
в WIP docs/qa/2026-11-19/spa-v6-shadow-fix/.

СЕЙЧАС девятый этап — offline actual-scene reflection capture. Код/команда/next
step сохранены в remote **4e8bb85f3b6646e740a9263744260449754a9bfa**. Никакого нового
probe в production/runtime ещё нет. scripts/bake-resort-spa-native-probes.mjs
в приватном native runner снимает настоящий готовый SPA:14комнат+sky,128px HDR,
linear radiance/4, точные native light/material, персонажи/SPA fish/water
маскированы, finally восстанавливает renderer/visibility.15 octahedral layers,
PNG sheet512px, raw layers/hash и source/art/baker provenance; не случайная картинка.

Третий bake ЗАВЕРШЁН SUCCESS:15 реальных128px слоёв, draw calls>0,
RGB nonempty, GLerror0; исходник3ab73cd32383a1a06c31b890b3d046e1127086e8.
Причина двух пустых попыток: QA renderer wrapper блокировал offscreen draws
при drawPaused=true. Исправлено authoring-only; это не live-регрессия воды.
Полный success/failed/source/bundle/log в WIP docs/qa/2026-11-19/spa-v6-probes/.
Sheet PNG SHA256 c40feac8f87aa9b675f2429a5867b109ad6c4070771abdf90c34528b7f5696d2,
raw layers74df01edbe5923cea6b3105f7056c7a8f58a68928f9ba14d081840a1320de679.
Sheet просмотрен: реальные янтарные светильники/тёмные комнаты/голубой экстерьер;
явных котов-ghosts при128px не видно, не гарантия идеальных отражений.
Runtime loader реализован в5adfcdb: PNG/rawSHA256 проверяются,15слоёв без sRGB/flip,
coalesced selected-only загрузка, immutable mipmapped DataArrayTexture(~1.25MiB),
SPA floors и21pool profiles. Shared water/Mall/AI/save/models не менялись.
3 unit cases PASS: actual PNG/raw parity, corrupt/offline fallback/coalescing,
shader hook composition. Это пока НЕ actual GPU/pass или визуальное одобрение.
Нативный прогон5adfcdb ЗАВЕРШЁН PASS: actual GLSL/data-array readback
пятислоёв byte-exact,21pool profiles, шесть reference views и World release.
Proof удалённый **bd6195ee5f318b1bc6c3c5538af99de808d89df0**, WIP
docs/qa/2026-11-19/spa-v6-room-reflections/. Сверка всехR1/R2/R4/R5 сохраняет
visual WIP: слишком плоские шторы/подушки/светлые полы/редкие сады.
Особенно VIP: широкое янтарное пятно отражения на rough ceiling;
следом калибровать roughness response, не глобальный свет. FOV отличается
≤0.00124°, eye≤5.4mm; не exact pixel A/B. Mac/phone FPS не проверен.

Одиннадцатый material/soft-furnishing этап сохранён remote992355c:
изогнутые tied curtains, пухлые decorative pillows, actual existing velour
normal/roughness, разные marble floors ночных комнат, свой256px VIP galaxy.
Не меняются station/support/cat/save/collisions. Существующие capture probes
сняты ДО этого art этапа; перед финальным релизом обновить их после геометрии.
5reflection/shadow cases и4physical cases (glass sky, curved supports,
Nap step-down/camera, VIP4wet+4dry full-floor routes) PASS подNode22.
Первый native992355c: шесть visual views и реальная Nap W/footstool/World
завершены. Потом assert(before.coins>=cost) — QA CONTACTS не фондировал
приватный тестовый кошелёк. До покупки/sky/SQLite; не live потеря монет.
Полный PARTIAL исходник/bundle/PNG/log сохранён remote
**c294ddeae8a6776700df4d21b6c9f12aecc0e55a**, native-partial/.
R4 galaxy/dark floor заметны, но все references ещё далеки.
be2676c исправляет только QA funding и mounting drapes: bottom+.08,
Aroma top2.7/Cabana2.8/обычный3.6 и реальные gold rods.
Второй native прерван рестартом среды ПОСЛЕ трёх R2/R4/cabana PNG.
Source/be2676c/bundle/log/3frames сохранились и удалённо архивированы
**f88adeb6ceb8f7b93b6efd20ab5c117e3cef08a3**, mounted-interrupted/.
Старый process37747 больше не существует; не ждать его.
Продолжение exec**9039**, лог /workspace/qa/spa-v6-soft-completion-native.log,
результаты /workspace/qa/spa-v6-soft-completion: ONLY_SKY=1/CONTACTS=1/
SKY_ONLY=1, один оставшийся вид+Nap W/World+верхнийpool/SQLite+finalerrors.
30467bf меняет только private runner: budget6000 и ONLY_SKY, чтобы не повторять
три уже снятых комнаты. До объединения доказательств сравнить настоящие
source-files/bundle SHA. НЕ считать прогон завершённым до результата.
Основной worktree frozen на30467bf, второй GPU не запускать.
Технология capture/loader/material/restart сохранена в стандартеunderwater-spa.

Readonly camera finding: front eye az0,d200,e.4 оказался за water radius1.27
и внутри реального берега (bed-.495,eye-73). Не менять overview на такой
ракурс ради красивой картинки и не скрывать скалы. Текущий az1.35/d210/e.5
свободен (waterRadius.939, минимум terrain clearance39м). Это геометрическая
проверка, не новый native camera acceptance.
Новый вспомогательный sparse checkout /workspace/chichi-spa-reflection-runtime,
ветка codex/spa-reflection-runtime, база d8b3b03 — чистый, без loader правок.
Не считать создание checkout реализацией и не начинать capture заново.

Следом проверить реальные изображения/GLSL/возвратrenderer/нежелательные ghosts,
сохранить PNG/data/provenance в remote. Только затем loader DataArrayTexture
128×128×15(~1.25MiB mipmapped), linear byte/orientation checks, independent
layer mips; SPA-only existing lamp IDs→layer и shared water profile. Нет runtime
CubeCamera/ежекадровых render targets. Не обещать mirror quality или device FPS.
Более подробный проект loader в WIP shadow-fix/NEXT.md и probes/NEXT.md; это
предложение, НЕ реализованный код. Существующий fallback остаётся до проверки.

Уточнение материалов: реальные shipped Mall CC0 marble/fabric просмотрены;
marble01 — бежевые плитки, не белый Calacatta, нельзя выдавать за reference match.
Velour maps можно переиспользовать в SPA. Новая PolyHaven API попытка blocked
CONNECT403 (как ранее AmbientCG); не обходить через прокси/не выдумыватьdownload.

Архиватор scripts/archive-spa-stage.py проверяет bundle/imported source hashes
и сохраняет allow-list без privateSQLite/секретов; force-add логи, проверить
manifest tracking, push WIP/обновить память на каждом этапе. Не начинать заново.
Все старые worktrees/source/SQLite сохранены.2GiB места освобождены дедупликацией
ТОЛЬКО byte-identical временных QA art файлов через hardlinks (все байты сохранены);
source/история/пользовательские данные не удалялись.

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
