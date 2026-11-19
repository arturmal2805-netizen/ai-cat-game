# Текущий статус

Обновлено19 ноября2026, Europe/Kyiv. Публикация проверена22:04 по Киеву.

## Стабильная опубликованная сборка

**812c8a6723dcbe106b567da88e1c3e1b1e4e399d** — origin/main, PR#3 MERGED.
[Игра](https://arturmal2805-netizen.github.io/ai-cat-game/?v=812c8a6) ·
[Диагностика по запросу](https://arturmal2805-netizen.github.io/ai-cat-game/?v=812c8a6&profile=1).
[Workflow44601625796](https://github.com/arturmal2805-netizen/ai-cat-game/actions/runs/44601625796)
полностью SUCCESS: Node22 build/fulltests/dryrun, Worker deploy, exact release и
shared-save checks, Pages. Платный AI inference не запускался.
Родители: прежний livec477057b6eda6e251f02bc27735e4220d737112b + кандидат
4d686b540b23278dc6ea10725d3726f650c0d84e. Дерево main равно кандидату,
ручных конфликтов нет. Не делать повторное слияние/публикацию этого этапа.

Реальные HTTP bytes проверены2026-11-19T20:04:13UTC:

- HTML SHA256 bb63c10e537c681c0f105dd130a1f02c08f437fbf065796a5673bcc985620474.
- JS SHA256 17fb011e9dc66129ccbbdc47da645188c161b25f941d64c59a9eff336ae8f65a.
- CSS SHA256 1ca6fd7d91d93d2434122de8b604f9e1f0306145487ece7434204f01d46492bc.
- SPA atlas ffabc732b641d70c2894ca97ebff1ab83ba4fecbf6da71e5d0251efd19648d6f.

HTML содержит ровно одно приложение ./dist/app.js?v=17fb011e9dc66129,
реальный JS ссылается на spa-interiors-ffabc732b641.png. Проверяли bytes, не v.
HTTP/CI receipt и actual assets в remote codex/spa-v8-release-evidence,
**16526f9c8dc7334d7622ac44099fdc1e598a4a45**, docs/qa/2026-11-19/spa-v8-release/live.
Там же final-visual9PNG и phone heldtouch.438импортированных модулей обоих QA
сверены с main по SHA;9camera/FOV/scene lights совпали с BEFORE. CPU submission
samples не являются GPU FPS. SwiftShader не сертификат скорости телефона/Mac.

## Что входит в публикацию

Сохранена V7 структура: один300×132м корпус,3этажа по14м,8комнат,96контактов,
14бассейнов, реальные лестницы/лифт/подход, минимальная высота10.8м.
V8 — текущий корректирующий этап материалов/мебели/декора/локальной воды и
новые9room probes после art lock. Линейный atlas radiance/4, NoColorSpace,
без воды/котиков/feedback; исходныйcapturef026b778ab7a6ac22696dfa974d7efeda47ea5e3.

Причина Thermal тёмного полигона была exterior shadow map actual render batch.
Без интерфейса воды пятно оставалось, без receiveShadow дна исчезало.
114f sourcefalse не хватало: общий batcher ставил true снова. **f026b77** сохраняет
false на actual SPA-only liner batches; финальный Thermal PNG без пятна.
Глобальный batcher и океан не меняли. В V11 это исправление не переписывать.

«🐈 Позвать Чичи в SPA» уже LIVE в меню SPA. Вызов бесплатный, процедуры отдельно.
Между локациями native magical recall, затем физические ходьба/лифт/вход.
Проверены работа/сон/owner, реальный приход, повтор без дубля, SQLite reload,
неизменные coins/inventory/receipts. Полный native:8процедур/8VIP/sky/Cafe,
старые оплаченные tickets, shorelift/лестницы, прерванное купание/reload, Cloud
export и desktopW. Phone390×844/DPR2 heldtouch4м + World release PASS.

Пользователь отверг stage1/stage2 «их нету». Финальные9видов просмотрены:
водный узор ещё слишком мелкий/густой, роскошное наполнение и фасад проще
референсов. **Это не завершение всего V8 и не visualapproval пользователя.**

## Активная работа — V11 вода + новое приглашение свободных жителей

Отдельный worktree **/workspace/chichi-spa-water-v11**, ветка **codex/spa-water-v11**.
Последний remote checkpoint **2a1927d**: все38реальных водных поверхностей
подключены к SPA-only profiles, metric absorption/refraction/stepdepth,
soft liner/step caustics; первый actual native8видов PASS, но визуально не принят.
Архив stage1 — docs/qa/2026-11-19/spa-v11/stage1. Это phone390×844/DPR2,
НЕ desktop matched comparison. Source/bundle/PNG/лог сохранены; не пересниматьстарое.

На диске stage2 WIP: укрупнённые каустики, stronger bounded room reflections,
реальные медленные vertex waves + micro normal +6wake slots; ornamental liner
caustics с настоящими уровнями; Café bubbles из того же fixed pool, hidden-level
updates пропускаются. Один framebuffer copy всегоSPA закадр, без дополнительного
scene render/per-pool RT, после sRGB output без doubleACES. Нужен actualGPU
stats/полный frame completion A/B; не обещать аппаратный FPS.

Новый запрос пользователя: **кнопка позвать всех свободных котиков в SPA**.
Stage2 содержит кнопку, bounded queue (до4 simultaneous guest journeys),
реальный лифт и пеший подход к distinct сухим точкам без покупки/AI-вызова.
Работающие/спящие/занятые/другая manual-команда исключены, free-state перепроверяется.
Повтор дедуплицируется; новый work/owner отменяет hold. Это ещё НЕ LIVE.
Native actual resident group test входит в scripts/audit-spa-water-v11.mjs.
CPU8targeted tests PASS; stage2 build идёт. Нужны native7water zones/sky,
реальный group arrival/repeat/неизменные wallets, full CI и HTTP перед публикацией.

Полный V11 файл сохранён docs/specifications/spa-water-quality-v11-2026-11-19.md.
Вода ONLY: не переносить8комнат/14бассейнов, не менять интерьеры/потолки/фасад,
ТРЦ/океан/мозазавра/модели/экономику/AI. Новый UI group invite отдельно разрешён.
Cabana не имеет бассейна: новый не придумывать. Последний пользовательский
Thermal кадр: ясно видимые дно/ступени, мягкая рябь, редкие крупные каустики,
вытянутые золотые отражения. Оригинальные пиксели остаются в сообщении, не
объявлять архивированными без фактического файла. Сравнивать каждый этап.

## Передача / защита

V8 product/evidence checkout /workspace/chichi-emergency-save-recovery сейчас
codex/spa-v8-release-evidence; public равен live812. Не редактировать его радиV11.
Каноническая память remote codex/ocean-recovery-memory; старый CURRENT в main
устарел и не является источником активного WIP. Один GPU run одновременно.
Node22. Старые worktrees не удалять. Диск почти заполнен: лишь assets-копии
своих завершённых privateQA допустимо убрать после архива, сохранив SQLite/логи.
Архивы allow-list, без usertokens/SQLite/worldexports; *.log force-add.
Все существенные checkpoints в remote проверять точным SHA.

Cloud/«Облако» уже содержит «Сохранить текущий мир»/«Загрузить мир из файла»:
полная игровая схема/кошельки/покупки + checksum, без секретов/исходников;
до импорта долговечная резервная копия. Не подменять мир пустым recoveryfixture.
Более ранние слияния939b328/вода4ec3737/исторический12d478e и d6fa805 — история
и standards/water.md; не выбирать их вместо актуального main по короткому названию.
