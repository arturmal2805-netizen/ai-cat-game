# Текущий статус — единственная очередь

Обновлено 2026-11-17. Выполнен порядок игрока: всё дно → публикация06a39cb →
оптимизация. Первый performance fix опубликован1f96a1b; следующий0b38098 вCI.
Статусы ниже не равны художественному одобрению или аппаратному FPS.

## Подтверждённый первый performance release

**1f96a1b6ce17435bc6aa845db1ba6e52d88a56cd** опубликован, полный CI44101398484
SUCCESS всех3jobs. Actual HTTP14:33:40UTC: JSb762b19233cfc25b514f49ecb335200116b5f77494d7030c6326e221d0310095,
CSS c14ce8408f8f3aed7a5e7991eca39663fe55377343421ff62e0600ada4c048ef,
wavefield/all9probes/reef.gz совпали; HTMLoneappscript.
[Workflow/live receipts](../qa/2026-11-17/floor-culling-publication/live-verification.json).
https://arturmal2805-netizen.github.io/ai-cat-game/?v=1f96a1b&profile=1
Native actual fullMall/65residents/DPR2 floor A/B сохранил все pixels;
54floorsections →6/32/3. Это первая небольшая экономия, не обещание60FPSMac.
Runtime immutable /workspace/chichi-ocean-performance, веткаcodex/ocean-performance.

## Следующий Mall fix в main/CI, ЕЩЁ НЕ опубликован

**0b38098a32e338a89b88efd784b184e9ac72c3f3** отправлен в main ТОЛЬКО после
HTTPverification1f. CI44104460487 в работе:
https://github.com/arturmal2805-netizen/ai-cat-game/actions/runs/44104460487
ExpectedJSdbe5f20f39f2f67ab258a143614fba517f1588f0dd839d590b3fc90d5dfd71d9,
CSS прежнийc14ce840… . Verifier /tmp/verify-mall-submit-release.py пишет
/workspace/qa/mall-submit-publication/verification.exit. Latestlive пока1f.
Immutable source/assets /workspace/chichi-mall-submit-performance,
веткаcodex/mall-submit-performance. Source9499bc9 + release0b38098.

Найден rootcause: room-light/cutaway устанавливаются ПОСЛЕ batchModelSteps;
прежний guard корректно выключал multi-draw после сменыhookidentity. Теперь
только эти два auditedposition-preservinghooks сохраняют exactranges. Room
lighting сохраняет ТОЛЬКО известный staticwrapper, старыйreflectionfinish
заменяется как прежде; sharedmaterials идемпотентны. Unknown wind/refraction/
geometry/key changes остаютсяnativefallback.8unit+26releasePASS, NativeV2
actualfullgame/65residents/DPR2 interior/overview/phone:0shader/page/HTTPerrors,
ZEROchangedRGBA. Tri11.2→5.46M,13.38→10.02M,10.73→3.94M; GPUbuffersнеизменны.
SingleSwiftShaderpairs неMacFPS: interior/phone быстрее,overview+.53%noise,
не статистическая гарантия. Обаbakers реально пересняты,9PNG неизменны;
static-submissions producer включён в обаinputlists. V1отклонён заdouble
uMallProbe —0pixeldifference у двух битых кадров НЕ успех. Все исходники/QA/PNG:
https://github.com/arturmal2805-netizen/ai-cat-game/blob/0b38098a32e338a89b88efd784b184e9ac72c3f3/docs/qa/2026-11-17/mall-static-submit/manifest.json

Дополнительный nativeQA без изменения production — PASS:
/workspace/chichi-mall-submit-verification, codex/mall-submit-verification,
база0b. ВыбранныеMcD/Vuittoncutaway + phoneinside сравниваются с полностью
native MeshDepthMaterial (не толькоbatchoff), затемprivateSQLitecoins/inventory/
placements reload. /workspace/qa/mall-static-store-native.log/.exit0.
Все pixels0difference,shader/page/HTTPerrors0,ownershipточный послеreload.
Phoneinside одиночная пара+12.3% была медленнее; ПО ПРИЧИНЕ этого сомнения
выполнены3повторные пары сразнымпорядком:4290.4→4084.7,4524.6→4208,
4097.4→4063.1ms; slowdownне повторился. Median4290.4→4084.7, НЕhardwareFPS.
Точный QA/source/PNG/SQLiteproof вverificationветке9176f420429b4d928184212c7ec04c725d0044e5:
https://github.com/arturmal2805-netizen/ai-cat-game/blob/9176f420429b4d928184212c7ec04c725d0044e5/docs/qa/2026-11-17/mall-static-extra/manifest.json

Второй report игрока: JSf8/06a39cb,26frames1.35s,18.52FPSне сравнивать с
прежними300frames. GPU28.24ms/15.718Mtri,zeroin-windowrefaults/bufferData.
Loadingtextures8–10s иAIplan17.4s — отдельное будущее расследование; не гонять
paidAI заново радибенчмарка. Safe summary docs/qa/2026-11-17/player-fps-report-2-summary.json.

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

1. Закончить полный CI/live0b38098 и native selected-store/SQLiteaudit выше.
   Не повышать pending доpublished по имени коммита/URLv. Дать игроку ссылку.
2. Следующая оптимизация — по новому физическому report после этой версии:
   fullframe/longpauses/GPU/память, отдельная проверка loadingpriorities.
   Не повышать geometrybudget глобально и не выдавать cache за причину без
   actualtrace. Не включать colonyrenderer вслепую; меньшеdraws раньше не
   доказали лучший AppleFPS. Не гонять платныйAI для нагрузочных тестов.
3. Художественно вода/песок/кораллы ещё НЕ приняты. Crimson Desert остаётся
   целью всей карты, не только одной локации; физические wave/depth/flowprofiles
   разные. После стабилизации продолжать качественную поверхность/дно/реализм
   и осмысленные экосистемы, сравнивая соstable И сCrimson при одинаковыхусловиях.
4. Запрос2×WATERAREA/свободного пространства уТРЦ остаётся отдельным WIP.
   Не масштабировать животных/здания/ownedcoordinates; не переносить тяжёлый
   черновик целиком встабильную игру. Управление/возврат/сохранения сохранить.

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
