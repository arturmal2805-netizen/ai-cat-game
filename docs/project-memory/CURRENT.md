# Текущий статус — единственная очередь

Обновлено 2026-11-17. Порядок игрока выполнен: всё дно → публикация06a39cb →
первый performancefix1f96a1b → отдельный Mallfix0b38098. Все опубликованы.
Технический релиз не равен художественному одобрению или аппаратным60FPS.

## Текущая WIP-работа после третьего отчёта

/workspace/chichi-ocean-cache-trace, codex/ocean-cache-trace, база0b38098.
Ничего нового пока не опубликовано. Thirdreport JSdbe/0b подтверждён: GPU18.36ms,
FPS20.43 из300frames/14.633sec сgap5900.1ms,1%low0.4;153rapidrefaults58.7MB.
6secgap отсутствует вrecordedLongTask608ms/GPUMax223ms, причинностьcache не доказана.
Stationarytrace не воспроизводилrefault; новый submission-only camera-cycle
trace воспроизвёл1053returns527.8MB, преимущественно этажиMall. GPUdrawsтолько
вЭТОМQA подавлены, realuploads/shaders остаются; этоНЕFPS/nativepixelproof.

КандидатexactFloat32RGBdictionary152bakedMallgeometries:41.43MBcolour →
6.9MBUint16indices+64KiBFloat32table,34.46MBnetGPUэкономия, vertices/normal/UV/
index/colours32bits неизменны. Defaultdata coloursсохраненыCPU; толькоbakedfloor
holders, неcats/rigs/morphs/instancing/sharedunsupportedmaterials. Unitбитовая
точность+rayfaces+nativeStaticdispatch PASS. NativeV3 fullgame/DPR2interior/
overview/phone:0changedRGBA/0errors, buffers−30.9–34.47MB. V1/V2toggleQAбыли
биты: ThreegetProgram сохраняетОДИНuniformsetнаmaterial при возвратеcached
program. QA-модовое переключение теперьdispose-materialcache/recompile, не
трогаетcatmaterials. Defaultproduction ничего не переключаеткаждыйкадр.

Пользователь ДОБАВИЛ вэтотрелиз: видимаякнопка «Управлять Чичи» и ходьбаот3лица
ВЕЗДЕ, включаяобычныеострова. Уточнениеявно подтверждено пользователем.
Новыеchichi-manual.js/worldintegration иsubmarine.controlChichi вработе:
обычнаяходьбаизреальногоposition,существующиеwater/Mallowners, однаmodel,
WASD/dragcamera, compacttouch44px, desktopбезdirectionpad, world/islandrelease,
bridge-locationvalidationтолькоChichiсlegacyshorefallback. Sharedmergeнеизменён.
20unitincludingpurchasepreservation PASS. ПервыйactualentryтестНЕпрошёл:
buttondidnotactivate; диагностическийV2сfailure reasonвработе:
/workspace/qa/chichi-global-native-v2.log. Не выдаватьUIзаfinished/неpubдоnative.

## Текущий подтверждённый релиз

**0b38098a32e338a89b88efd784b184e9ac72c3f3** — main и работающий сайт.
Полный Node22 CI44104460487 SUCCESS: test/deploy/pages, включая release/server/
shared-save verification; paidAI не запускался.
https://github.com/arturmal2805-netizen/ai-cat-game/actions/runs/44104460487
Фактический HTTP2026-11-17T14:47:11UTC: одно подключение приложения,
JS **dbe5f20f39f2f67ab258a143614fba517f1588f0dd839d590b3fc90d5dfd71d9**,
CSS **c14ce8408f8f3aed7a5e7991eca39663fe55377343421ff62e0600ada4c048ef**.
Wavefield/all9reflectionPNG/reef.gz совпали с immutablebuild, а не толькоURLv.
[Workflow/live receipts](../qa/2026-11-17/mall-submit-publication/live-verification.json).
Игра https://arturmal2805-netizen.github.io/ai-cat-game/?v=0b38098
Одноразовая диагностика https://arturmal2805-netizen.github.io/ai-cat-game/?v=0b38098&profile=1

## Что именно оптимизировано

В1f96a1b6ce17435bc6aa845db1ba6e52d88a56cd исправлено отсечение54секций дна:
sharedattributes раньше раздували bounds каждой секции до всего floor. Native
sortsphere/всеvertices/index/shader/physicalrayproxy сохранены. Indexed metric
bounds проверяются после FINALcamera; castingfloor остаётсяnative. Native
underwater/overview/phoneDPR2:54→6/32/3секции,0changedRGBA.31targeted+12release
PASS, реальныйoceanrebakePNGнеизменён. Полный CI44101398484 иHTTP14:33:40UTC
успешны. [Receipt1f](../qa/2026-11-17/floor-culling-publication/live-verification.json).

В0b38098 исправлен Mall room-light/cutaway: они подключались ПОСЛЕbatching,
поэтому guard правильно выключал exactstaticranges после сменыhookidentity.
Теперь ТОЛЬКО два auditedposition-preservinghooks сохраняютdispatch. Roomlight
сохраняет только известный staticwrapper; старый reflectionfinish заменяется
как прежде, sharedmaterials идемпотентны. Unknown wind/refraction/geometry/key
changes по-прежнему nativefallback. Исходные vertices/index/triangleorder,
доступные geometry/picking, shadowкамеры, все модели/анимации/DPR сохранены.
8staticunit+26release PASS, actual fullgame/65residents/DPR2interior/overview/
phone:0shader/page/HTTPerrors,0changedRGBA. Triangle submissions11.2→5.46M,
13.38→10.02M,10.73→3.94M; GPUgeometrybuffers неизменны вкаждойA/Bпаре.
Обаbakers реально пересняты,9reflectionPNG неизменны; static-submissions
producer добавлен вобаспска. V1отклонён duplicateuMallProbe:0differenceу двух
битыхкартинокНЕуспех. Exactsource/QA/productionbundle/PNG:
https://github.com/arturmal2805-netizen/ai-cat-game/blob/0b38098a32e338a89b88efd784b184e9ac72c3f3/docs/qa/2026-11-17/mall-static-submit/manifest.json

Дополнительные selectedMcD/Vuittoncutaway иphoneinside прошли с полностью
nativeMeshDepthMaterial baseline. CutawayOpentrue/false подтверждены, всеpixels
совпали,0errors, privateSQLitecoins/inventory/placements точноравны послеreload.
Один phoneinsideGPUprobe был медленнее12.3%;3повторныепары сразнымпорядком
дали4290.4→4084.7,4524.6→4208,4097.4→4063.1ms. Slowdown не повторился.
SingleSwiftShaderpairs/3samples НЕ Mac/iPhoneFPS и неуниверсальнаягарантия.
Точный extraQA/source/PNG/SQLiteproof, productionнеизменён:
https://github.com/arturmal2805-netizen/ai-cat-game/blob/9176f420429b4d928184212c7ec04c725d0044e5/docs/qa/2026-11-17/mall-static-extra/manifest.json

Immutable runtime/assets: /workspace/chichi-mall-submit-performance,
codex/mall-submit-performance0b. Дополнительный QAвотдельной
/workspace/chichi-mall-submit-verification, codex/mall-submit-verification9176.
Source/qaсохраненыудалённо; не считать памятьчата/локальныефайлыединственнойкопией.

## Выполненные этапы и неизменные контракты

- 06a39cb0b1c92f104996ae315932885655f07a68: shared sand normal/roughness2m по
  всему исходному дну81920tri/54секции,118готовых stones/4batches. Все native
  vertices/normals/UV/colours/worldtransforms сохранены, originalbed hidden
  native rayproxy, visualsections неraycast. Первые18stonesизc44точны;
  новые небезопасные placements исключены, старые коллайдеры/радиус не ослаблены.
  118/118прежних savedposes свободны.40targeted + actual normal/remote/overview/
  phone,exit/swim/privateSQLiteownership/reload PASS. CI44094617737 и HTTP13:50:03.
  [Receipt](../qa/2026-11-17/whole-floor-publication/live-verification.json).
- c44bdc7e6a262dbe7cf356e629d7b45239a39330: прежний малый участок18stones,
  CI44088502846/HTTP13:14:02. Уже замещён wholefloor, повторять не нужно.
- c3f59b2a0568870936655bec3e308841a1952c41:13рифовых садов,1216НОВЫХ колоний
  9форм и19456куртин. Исходные1024corals/LOD/extras/fish byte-exact кb805;
  новые farLOD только у новых садов. Открытые centre radius28 и подходMall
  |x|<80,z>70 сохранены. CI44082509878/HTTP12:35:07.
- b8051f931c66608acd15ac41bb6043c7081b7605: единое ядро воды/общий1024²field,
  физические профили разных водоёмов, actual9reflectionprobes вlinear/ACES.
  CI44063176067. География released12d478e, НЕ неопубликованное2×расширение.

Монеты/инвентарь/ownership/catmodels/faunacounts/sizes/animations/DPR/shadow
quality/saveIDs сохранены. Не менять JOB_CAPACITY/merge/экономику ради FPS.
Node22 соответствует CI; не включать случайные Node24model artifacts.

## Диагностика FPS

`?profile=1` открывает одноразовое окно, queryпотребляется черезhistory,
вlocalStorageне сохраняется. Кнопки копирования и закрытия. Закрытие убирает
collectors/observers/timers/GLhooks иframeProfile; обычныйreloadбез окна.
Reportv3: GPU/CPU/FPS/1%low/паузы/loading/heap/bytes. Actualcopy→close→точные
исходныеfunctionidentities→SQLite reload подтвержденыc3. QAсам оборачивает
bufferData: не проверятьnativeчерезtoString, сравниватьисходные ссылки.
Для физического сравнения после публикации дать загрузке закончиться и
собрать30секунд в одинаковом виде/DPR, не сравнивать1.35sec/26frames с300frames.
APIplan17.4sec и resource8–10sec — observedtimings, не доказанный сбойAPI.

## Что делать дальше

1. Нужен новый аппаратный report ПОСЛЕ0b38098: дождаться загрузки,30секунд
   в одном ракурсе без открытых меню, затем «Скопировать отчёт». Сравнивать
   одинаковые camera/DPR/fullframes/longpauses/GPU/память, не26framesс300frames.
   Ни один старый report не измеряетопубликованный0b. Окнотолькопозапросу.
2. Следующее расследование — startup/loadingpriorities: во втором report
   textures8–10sec иAIplan17.4sec (observedtimings, не доказанныйсбойAPI).
   Первый reportM2:18.959Mtri/2462draws/211rapidrefaults. Stationary native24frame
   trace ихне повторил. Второй report JSf8/06:1.35sec26frames,18.52FPS,
   GPU28.24ms/15.718Mtri,zeroin-windowrefaults/bufferData. Safe summariesвQA.
   Не повышать budgetглобально/не обвинятьcacheбезtrace/не включатьcolonyrenderer
   вслепую/не гонять paidAI радибенчмарка/не уменьшатьмодели,DPR,тени,количество.
3. Художественно вода/песок/кораллы ещё НЕ приняты. Crimson Desert остаётся
   целью всей карты, не толькооднойлокации; physicalwave/depth/flowprofiles
   разные. После стабилизации продолжать поверхность/дно/реализм/экосистемы,
   сравнивая соstable И сCrimson при одинаковыхусловиях. Не выдаватьCIзаapproval.
4. Запрос2×WATERAREA/пространствауТРЦ остаётся отдельнымWIP. Не масштабировать
   животных/здания/ownedcoordinates и не переносить тяжёлыйчерновикцеликом.
   Управление/возврат/сохранения/инвентарь/монеты/назначения сохранять.

## Восстановление и сохранённые ветки

Канонический источник этой памяти — codex/ocean-recovery-memory. Прочитать
его перед возобновлением изстарого main; shared-water-coreможетотставать.
Все source/QA публикованныхэтапов вGitHub; exactbundle/sourceHEAD+cached+status
иnativePNG лежат вdocs/qa/2026-11-17 соответствующихsourceкоммитов. Это НЕ
полная Gitистория вtar. Предыдущие развёрнутые записи сохранены в
[архиве CURRENT](history/CURRENT-before-performance-status-cleanup-2026-11-17.md).

- /workspace/chichi-ocean-performance, codex/ocean-performance:1f96a1b,
  immutable expectedpublication assets.
- /workspace/chichi-mall-submit-performance, codex/mall-submit-performance:
  0b38098, immutableexpectedassets; QAnewin отдельной verificationветке.
- /workspace/chichi-seabed-floor-wide:06a39cb; /workspace/chichi-seabed-materials:
  c44; /workspace/chichi-seabed-release:c3. Не сбрасывать старые деревья.
- /workspace/chichi-seabed-reef содержит прежнийWIP90c4ff0+overlays; финальное
  содержимое сохранено вc3/c44/06, не считать файловыйtarегоединственнойкопией.
- /workspace/ai-cat-game — исходныйdirtyWIPb44f4ef; не удалять/не reset.
- 2×oceanWIP f5f89c75513c416d6713715b1ae0d568270fab20 вshared-water-core и
  прежнихдеревьях: waterarea2×,forecourt378points−190,старые64benthicrocks и
  тяжёлыеcorals. Его8.62Mtri forecourt НЕ приняты и не опубликованы.
- Исходныйsandcandidate fbd104987e89abea53c16a4dc35f6bc0462b0bf4 сохранён.
  Гипотеза «песок причина5secRAF» НЕ подтвердилась. Авторская256²GLnormal/
  roughness неPolyHavenscan и неd6. CoastSand01albedo прежнийsRGB; API403,
  отсутствующие карты не получены. Не обходитьallowlist и не подменятьprovenance.
- Три потерянные ветки codex/mall-visitor-camera, codex/ocean-render-stability,
  codex/underwater-cat-mall не были найдены/восстановлены. Не обещатьстарыйкод.

Архив R9: archive/project-memory-2026-11-16, commit501757e09370116b942248e392c6461211cb5632,
SHA256aaaa3d9c257258a6dbc98a65271806d8a4805ea3d710d3830ddb1bff690d8af0,
60499125B,13worktrees restore/hashchecked, требуетbasec9a2ac7a74dfad5f478464dd6cf62c072e4172a0.
НЕ fullGitистория, НЕ включаетпоследующиеc3/c44/06/performance. Новое сохранено
вGitHubsource/QA, не приписыватьегоR9. Скачать:
https://raw.githubusercontent.com/arturmal2805-netizen/ai-cat-game/501757e09370116b942248e392c6461211cb5632/backups/chichi-shared-water-wip-2026-11-17-r9.tar.gz

## Стандарты и история

[Вода](standards/water.md): горки VERYEARLYprototype; d6fa8056f18d2d738890cc9b477334e4cda81523
историческая техническая цепочка; Crimson Desert — новый визуальный ориентир
всей воды; stableSHA — отдельная техническая запись. [ТРЦ](standards/mall.md),
[грунт](standards/terrain-vegetation.md), [управление](standards/controls-camera.md),
[решения](decisions.md), [доказательства/backup](evidence-and-recovery.md).
Provenance merge939/источника4ec/историческогоlive12d сохранены вdecisions и
history; не создавать их повторно и не откатыватьпозднейшиеисправления.
