# Текущий статус

Обновлено **2026-11-18, Europe/Kiev**. История: [архив](history/CURRENT-before-handoff-2026-11-18.md).

## Последняя подтверждённая публикация

**827e3708979cb95c4675e38caf6354364c733b64**, origin/main.
[Игра](https://arturmal2805-netizen.github.io/ai-cat-game/?v=827e370),
[workflow44305576620](https://github.com/arturmal2805-netizen/ai-cat-game/actions/runs/44305576620):
полный test/deploy/pages SUCCESS; сервер/release/sharedsaves проверены CI.
HTTP2026-11-18T12:53:03.520067+00:00: одно приложение, реальные JS/CSS совпали.
JS5681cfb381526eddc877a80448535fecf0272a52c95da9744ad8edfd43a44be2;
CSSeb9e72f520559ea58aefb78c10bbe4c2990e345caff015428b04e81f6ed141d2.
Прямой Worker/api/status из этой среды: HTTP-tunnel403; не ошибка токена,
не свидетельство отказа игровогоAI. Прямую проверку не считать выполненной;
release/sharedsaves подтверждены соответствующим успешным шагом CI.
[Квитанция](../qa/2026-11-18/ai-context-publication/live-verification.json).

Релиз только упаковывает повторяющиеся строки AI-запросов; число вызовов,
котики/данные, схемы ответов/валидация/бюджеты сохранены. На147котиках текст
плана19281→15620символов; карьеры5734→4090; вечер+покупки+семьи30661→21175.
Это символы/байты, не измеренные токены/стоимость/latency. ПлатныйQAневызывался.
Публичная карта/JS/CSS прежние39148734bd3f4a0265a6ec9aff8ab4b41f36c0b4.
Проходы/двери опубликованы3914873; переднее дно+46м — e8ab6ffc24453e1e3ead9acf5190f90acff88730.

## Активная работа и WIP

Активная работа — SPA. Последний сохранённый remoteWIP: **d4659e05eecb3329a06a6e3f1304f3d67bc51c85**,
ветка **codex/underwater-spa-resort**, /workspace/chichi-underwater-spa-resort.
Предыдущие проверенные этапы:24cfec41907b802942440febb716a897681c5f0f (лифт/массаж/возврат),
0f5f71185c55ed5879adc0173fc888991778bbc8 (бассейн/джакузи/VIP). RemoteSHA проверен.
Основа3914873, упаковкаAI уже есть; не копировать заново. Ветка памяти — документация.

**Native PASS:** верхняя площадка→лифт→массаж→лифт→площадка→SQLite,2000→1700;
3водных сервиса: реальные6ступеней/плавание/сухойвыход/отряхивание,2000→1000;
11сухих сервисов: разные nativejoint-последовательности, настоящий cafeстакан
у рта через courtFood/placeCourtFood,2000→420. Личные receipts/used пережили
SQLite reload, worldwallet/inventory сохранены. Это14 ОТДЕЛЬНЫХ in-room/rim
фикстур, не84завершённых действия и не готовый курорт. Все сборки/PNG/overlays:
[QA ветки](https://github.com/arturmal2805-netizen/ai-cat-game/tree/d4659e05eecb3329a06a6e3f1304f3d67bc51c85/docs/qa/2026-11-18/resort-spa).
1124fullsuite PASS до поздних изменений; затем целевые26wet/7dry PASS, Node22wetbuildPASS.
Новый итоговый full CI и build после dry/shell ещё требуются.

Исправлены реальные дефекты: новаяSPAorigin20м глубже из-за пересечения дна;
реальные лестницы/отверстия этажей; missingmassagebridge; мосты перекрывают
кривые края пола. Финансовый отказ безопасен. Водная отмена идёт через сухой
выход, оставляя paidticket неиспользованным. Общие merge/кошельки не менялись.

**Послеd4659e0 есть НОВЫЙ DIRTY WIP, НЕ сбрасывать.**
- Authoredfloor в model/finishes вместо nearest-room: верхний пол ошибочно
  получал levelкафе и закрывал вид. Fallback теперь bboxcentregeometry.
- Новые enclosure/corridors: настоящие стеклянные стены/крытые мосты/клинический
  купол; clippingтолько внутренних сегментов реальных T/Yпересечений по полигонам,
  чтобы сохранить проходы/внешние стены. Пол массажного павильона теперьellipse.
- Nativebodyradius неизменён; cameraпроверяет обе стороны настоящих полов,
  атриумныйпроём/стены/динамические дверилифта. 5целевых PASS; весьновыйnativeещёpending.
- Новый боковой шлюз ПРИЧАЛА z289,width5 в resort-pier-link-data; остальнойпирс/
  субмаринныйпроём сохранены. Physicalrails/poles общие для геометрии/коллизий.
  Верхний мостик clippedтолько внутри реального пирса, иначе Tугол закрыл вход.
  ActualMosa-пол/пирс unitshore→lift PASS. Oceanreflection ПЕРЕПЕЧЁН существующим
  baker с новым sourceinput,36538байт; не старая/случайная картинка.
- Native shore-проверка выявила, что builderObstacles содержит reservations
  всей воды/пирса (запрет размещения, не стену). accessClear должен брать ТОЛЬКО
  manualPhysicalObstacles, реальныеограждения проверяются отдельно. Исправлено.
  Активный прогон: /workspace/qa/resort-spa-native-shore-physical.log (session93031).

**Дальше:** дождаться native shore→gate→lift→sealedcorridor→massage→return/reload;
сохранить exactsnapshot и remoteWIP. Затем mid-lift/mid-procedure restore через
существующие catLocations/mall.goal/receipt (без общей mergeреформы), автономный
вход/возврат, phone. Интерьеры всё ещё ОЧЕНЬ пустые/примитивные: нужны реальные
кабаны/сакура/фонари/садовые каскады/растения/сауна/салон, реальные контакты/
социальные сцены/все84действия, проверка референса и deviceperformance.
В текущих action-названиях cascade-gaze/fur-care ещё НЕТ соответствующих
полных объектов/персонала — не выдавать их за завершённые взаимодействия.
Последний пользователь снова требует ускорения и разных милых детальных анимаций
КАЖДОЙ зоны. Не заканчивать на пустых платформах/общем idle.

SPA НЕопубликован/НЕодобрен. Main/live всё ещё827e370. Все старые WIPдеревья
сохранены. Один GPUbrowser одновременно; текущий nativeявляетсяим. Node22обязателен.
Диагностика только?profile=1; реальные Macфризы не объявлены исправленными.
[Индекс](README.md), [очередь](ROADMAP.md), [решения](decisions.md),
[восстановление](evidence-and-recovery.md).

## Проверенная независимая резервная копия R10

[Архив/инструкция/квитанции](https://github.com/arturmal2805-netizen/ai-cat-game/tree/archive/project-memory-2026-11-18-r10/backups),
commit **e38a822797b3a9c970c85ff5826f7b338fb35831**.263669636байт в6частях; общийSHA256
1ddb1c75b512a5e2c55c724947e4a870d5b675d7fdcd5267b0ef5deadefd683c.
Снова скачан сGitHub безlocalalternates; SHA256/всеpartbytes совпали.
В новомGitrepo восстановлены30/30worktrees: HEADdiff/indexdiff/status/files exact.
Только тестовыекопии удалялись после проверки; оригинальные деревья не тронуты.
Fresh restoredSPA4adcbd3: npmci/Node22.23.5 и19targetedtests PASS.
Backupинкрементальный: требует39148734bd3f4a0265a6ec9aff8ab4b41f36c0b4.
Не fullGit; ignoreddeps/caches/liveDB/credentials исключены. LFSfilter не обнаружен
на trackedfiles всех30деревьев. Snapshotпамятиced69e712a7838431a5aec779181c8e11053b88d;
эти финальные квитанции сохранены отдельным последующим doccommit.
[Локальные копии квитанций](../qa/2026-11-18/project-memory-handoff/).
