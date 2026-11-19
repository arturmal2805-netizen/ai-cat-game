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

## Активная работа — V11 уже в main, публикация выполняется

**9e26f331d91d3ad85e2c0f15b5a6a4e63106e5ce**, PR#4 MERGED.
Родители: предыдущий опубликованный812c8a6 + кандидат
**d24d343037f08c9e94a89487928dbbf222a5e8d6**. Дерево main равно кандидату;
ручных конфликтов не было. НЕ делать повторный merge.
[Workflow44612746706](https://github.com/arturmal2805-netizen/ai-cat-game/actions/runs/44612746706)
сейчас выполняет full npm test; Node22 build уже PASS. До полного SUCCESS и
HTTP byte check нельзя говорить LIVE9e26f33. Stable live выше пока812c8a6.
Публикация пользователем уже многократно разрешена, разрешение не спрашивать.
Повторный PR workflow44612653709 отменён после merge; основной gate не ослаблен.

Ожидаемые реальные output bytes финального Node22 build:
HTML7d8e29b489c6522e341085f6729878b80a662cbad0ffc8383b34bff9e4a62a5e;
JS593013c89da9d392e10c9a42a7ba7297e2073cccff5e3fc32951b930262e4dce;
CSS1ca6fd7d91d93d2434122de8b604f9e1f0306145487ece7434204f01d46492bc.
SPA atlas прежний ffabc732b641d70c2894ca97ebff1ab83ba4fecbf6da71e5d0251efd19648d6f:
статическая архитектура/room lamp table сохранены. Это прежние V8 probes, не новые V11 captures; подводная caustic/liner shading изменилась, поэтому точный новый вид дна в них не переснят.
Проверить actual HTTP HTML/JS/CSS/atlas после Pages, одно приложение и matching
cache query. v в URL не доказательство. Worker exactrelease/save checks — workflow.

V11: все38реальных водных поверхностей (14basins+20garden+4weir/falls),
SPA-only physical profiles, metric absorption/scatter/stepdepth, slow vertexwaves,
micro-normal и6wake slots; caustics дна/стен/ступеней с правильным порядком hooks;
один shared framebuffer copy для рефракции после colour output без doubleACES,
без дополнительного scene render/per-pool RT. Существующие room probes +3 bounded
room lamps дают локальные highlights, новых PointLights нет. Комнаты/геометрия,
океан/ТРЦ/коты/AI/crypto/server/save schema не менялись. Native external-shadow
fixf026 сохранён. Статических отражений живых котиков нет; screen refraction
показывает подводные части. Не выдавать эту технику за полноценный dynamicSSR.

VIP+Cafe частицы теперь делят прежний бюджет <=192bubbles/96steam (12groups,
скрытые уровни не обновляют clock). Финальная count-only коррекция проверена
CPU отдельно; shader/controller/контакты прежние. Не обещать hardware FPS.
Измеренный desktop framebuffer11,554,560bytes, один allocation/resize,0 extra
scene renders.4gl.finish samples/mode сохранены, этого мало для p95/device claims.

Бесплатная «Позвать свободных котиков в SPA» входит в9e26f33, ещё НЕ live.
Существующая «Позвать Чичи» ужеlive812. Новый group-call: конечная rosterqueue,
до4simultaneousjourneys, настоящий pressurelift/ходьба к distinct dry points,
без покупки/LLM. Работа/сон/manual/занятость исключены, повтор дедуплицируется.
Accepted queued guests получают hold сразу; actual newowner/work отменяет его.
Пришедший idle сохраняет реальный сухой floor support до другой команды,
а не падает в обычный наружный NPCwander после90s.

Найденные ошибки и проверки НЕ повторять заново:
- parking должен использовать navigation.path (с лестницами), не толькоfloorPath;
  lower-floor места выбираются первыми, fixed seats не переносятся.
- jobs.has включает idle runtime, проверять настоящий job/manual и при принятии
  freeguest отменять лишь accepted idle state. Работающих не отменять.
- QA initial p.schedule rest не очищает уже активный runtime; как singlehero
  аудит, только privatefixture вызывает jobs.cancel для двух выбранных гостей.
- после manual timing frames панель может быть закрыта; reopen actual SPA,
  update SPA UI, настоящий locator click. Не forceclick/не обходить disabled.
- empty reserved destination не физическая стена: проверять на шагах actual
  actor positions; reservations нужны для distinct parking.

Доказательства main docs/qa/2026-11-19/spa-v11/:
stage1phone8views; stage2desktop8views+actual38profiles/copy/GL-completed samples;
stage3finalThermal/Golden highlights. group-pass: Luna+Moti реально прошли
walk/boarding/riding/отдельные сухие arrivals, повтор без дубля, все wallets/
inventory/receipts неизменны.12targeted tests +Node22 final build PASS.
Все failed/interrupted стадии сохранены отдельно, не принимать их за PASS.
Group-only log раньше печатал общий38label, но optics проверены stage2/3 отдельно.

Final phone на product main9e26f33: actual390×844/DPR2 heldtouch4м + World release
PASS, все443 imported modules совпали с main по SHA256. Ветка evidence
**codex/spa-v11-release-evidence** в /workspace/chichi-spa-water-v11;
там docs/qa/2026-11-19/spa-v11-release/comparison.json и phone evidence.
Thermal/Golden BEFORE812 vs AFTER42aa water source: camera/look/FOV/lighting/DPR
все совпали. Последующие group-controller edits не меняют графику; финальный
particlecap уменьшает только count. Остальные6 водных видов проверены stage2.

Reference likeness всё ещё неполна и **нет visualapproval**. Не называть весьSPA
законченным или равным artist image. Последний Thermal кадр пользователя:
ясные дно/ступени, мягкая рябь, редкие крупные caustics, золотые отражения.
Оригинальные pixels остаются в сообщении, не выдумывать их архивирование.
Полный V11 пользовательский текст сохранён docs/specifications/spa-water-quality-v11-2026-11-19.md.
Cabana не имеет бассейна: новых водных объектов не добавляли.

Внешний check «Workers Builds: chichi-cat-world» FAILED уже на прежнемlive812;
отдельный GHA Worker deploy/exactrelease/sharedsave тогда SUCCESS. Не путать этот
существующий внешний integration check с реальной недоступностью AI/сохранений;
не говорить «все GitHub checks зелёные», проверять именно полный GHA и actual bytes.

## Передача / защита

V8 product/evidence checkout /workspace/chichi-emergency-save-recovery сейчас
codex/spa-v8-release-evidence; public равен live812. Не редактировать его радиV11. V11 /workspace/chichi-spa-water-v11 теперь release-evidence; код уже в main9e26f33, runtime не править без нового основания.
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
