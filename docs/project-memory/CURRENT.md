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

Память/передача завершены и проверены; активная разработка — SPA. КодSPA: **4adcbd3427d43c0c3e622361ea03fe076592e356**,
ветка **codex/underwater-spa-resort**, /workspace/chichi-underwater-spa-resort;
база3914873. УпаковкаAI уже есть в этой ветке из WIP6def03b: повторно не копировать.
Ветка памяти **codex/ocean-recovery-memory** — документация, не текущий игровой код.
Сначала сверить git status/log/ls-remote; не reset старые деревья.

Сделано:14зон/3уровня-кандидат, реальные вырезы/дно1.8м/ступени5бассейнов,
6массажных кабин, bounded roomlights/старые finishes/батчинг, независимая SPAкамера,
существующий кошелёк/чеки/usedledger, реальные nativeChichi+6массажистов.
[Точный исходник и QA](https://github.com/arturmal2805-netizen/ai-cat-game/tree/4adcbd3427d43c0c3e622361ea03fe076592e356/docs/qa/2026-11-18/resort-spa/native-appointment).
Проверено:26целевых unit/ledger/geometry cases; native сцена/камеры/World release;
**in-room** массаж: inspect→mount→procedure→dismount→walk,2000→1700,
одинчек/эффект; privateSQLite reload сохранил1700/used/позицию[-547,-164.82,717.1].
Последнийпозныйпрогон native-appointment-pose завершён exit0; sourceoverlay,
исходныеbundleбайты, кадры и hashmanifest сохранены. Это не полный вход с берега.

НЕготово: реальный доступ/лифтовый маршрут/шлюз, герметичные переходы/лестницы,
все остальные процедуры/84фазы, полный автономный цикл/home и отмены,
художественное соответствие референсу, phone/аппаратная performanceпроверка.
SPA НЕопубликован/НЕодобрен. Последний fullSPA suite1110:1109PASS/1FAIL (длина
старого AIконтекста); причина исправлена и целевой147casePASS. Не объявлять
весь SPA fullsuiteпройденным после последующих изменений без нового прогона.

**Следующий шаг:** в веткеSPA соединить проверенный liftmotor и кабинетный runtime настоящим
физическим входом/сухими маршрутами. Не подменять вход QAперестановкой персонажа.
Старая /workspace/ai-cat-game и остальные WIPдеревья сохранены. Удалённые старые
ветки не считать восстановленными; R9 — историческийincrementalархив, не новаяработа.

[Стандарты/индекс](README.md), [очередь](ROADMAP.md), [решения](decisions.md),
[восстановление](evidence-and-recovery.md). Референсыводы иSPA имеют явно
отмеченные недостающие оригинальные inlineбайты; не выдумыватьиххеши/лицензию.
Диагностика только?profile=1, закрытие/reload скрывают её. Старыефризы не закрыты.

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
