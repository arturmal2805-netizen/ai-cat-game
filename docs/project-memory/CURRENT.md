# Текущий статус

Обновлено2026-11-18, Europe/Kiev. [История перед публикацией](history/CURRENT-before-SPA-publication-2026-11-18.md).

## Последняя подтверждённая публикация — первый функциональный этап SPA

**55a9beb0aa27c6066817adc582828875d9809de5**, origin/main и codex/spa-functional-publication.
[Игра](https://arturmal2805-netizen.github.io/ai-cat-game/?v=55a9beb), [диагностика по запросу](https://arturmal2805-netizen.github.io/ai-cat-game/?v=55a9beb&profile=1).
[Workflow44340341336](https://github.com/arturmal2805-netizen/ai-cat-game/actions/runs/44340341336): полный test/deploy/pages SUCCESS;
точный release/shared-save verification step SUCCESS. Платный AI QA не запускался.
HTTP 2026-11-18T16:08:23.131278+00:00: одно подключение приложения, actualJS/CSS совпали.
JS SHA256 **afbdde4ba0c1f53e3f50dad82a032b0f6a128c6675a0120384018080f96de961**;
CSS SHA256 **9db4746b53b8da87077097c9238673ce7d6a6e4f45652fb7b5c92aed121e9fd1**.
[Квитанции](../qa/2026-11-18/resort-spa-publication/resort-spa-live-verification.json).
Прямой Workerhostname в этой среде получает tunnel403; это не ошибка APIключа.
Не обходился; release/sharedsaves подтверждены полным CI. ?v не единственный proof.

Опубликован ПЕРВЫЙ ФУНКЦИОНАЛЬНЫЙ ЭТАП, не полный референс/84действия и не
художественное одобрение.14зон/3уровня,6массажныхкабинетов/6стеклянныхкабан,
9водныхобъёмов, отдельные камеры, физические причал/боковойпроход/лифтовая
кабина/герметичные переходы/лестницы. Мебель, сакура/растения/фонари и садовые
каскады на общем watercore; исходная CatSPA и ТРЦ сохранены.

**Проверено:** реальный причал→новыйбоковойпроход→лифт→массаж→физический
обратныйлифт/выход→privateSQLite;11dry+3wet отдельных in-room/rim фикстур,
разные nativejoint циклы, реальные ступени/выход из воды, единичные receipts/used,
сохранность private/worldкошельков и inventory послеSQLite reload. Отдельно
coldmidlift reload наY=-65.05: точная высота/закрытые двери, физический подъём,
выход, World release и второйreload без списания. Body/paw контакты на лежаке
проверены настоящими native skinnedvertices, геометрия/модели прежние.
Телефон390×844,DPR2: реальный heldtouchW,4м по сухомуполу, submarineowner
неактивен, компактныйpad/inspectionhidden, World release. Не весь телефонный
маршрут/каждыйэтаж. Исходники408импортов и фактически отданныйCSS совпали с релизом.
Proof: [точная ветка](https://github.com/arturmal2805-netizen/ai-cat-game/tree/55a9beb0aa27c6066817adc582828875d9809de5/docs/qa/2026-11-18/resort-spa).
Все102архивныхproofхеша проверены. SwiftShader — не hardwareFPS.

**Что выявлено:** SPAorigin20м глубже (только новыйкурорт), реальная геометрия
мостиков/пересечений/причальныхrails; builderReservations нельзя считатьстенами.
Authoredfloor вместо nearestroom при batching; actualcamera checks сохраняют
полныйрадиус. Oceanprobe переснят существующим baker после измененияпричала.
Сухой SPA ниже уровняморя: проверять реальную опору ДО ocean-depth takeover.
Manualходьба снимает отдельныйSPAinspection, не удаляет физику.

**Остаётся:** полные84фазы/детальный groomingstaff/парные социальныепроцедуры,
сауна/звуки/богатаяархитектура; mid-procedure/water reload; полный autonomous
multi-cat/phone tour/передача ручного SPA нормальнойжизни, marinekeepout и
сравнение с референсом/полное времякадра/паузы/память. Не считать эти проверки
пройденными по roomfixture или одной смене флага. Старые Macфризы не объявлены
исправленными. Пользователь требует быстрее выпускать проверенные этапы.

## Исходники и следующая работа

Релизное дерево /workspace/chichi-spa-functional-publication, codex/spa-functional-publication.
Исходная WIP codex/underwater-spa-resort **a8ea3753c44068cb6940b21e7f0796c5394a4282**,
/workspace/chichi-underwater-spa-resort сохранена. После native/CI не было
изменения runtime: merge55a9beb идентичен a8ea375 по public/server/sharedworld.
Для следующего этапа ответвиться от актуального55a9beb; не повторять старыефиксы.
Конфликтовали только3add/add AI-QA файла: опубликованные остались в исходном
ai-context-compact, SPAкопии в ai-context-compact-spa-wip. App/HTML/runtime
конфликтов не было; unmergedpaths и markers отсутствуют.

Предыдущий stable **827e3708979cb95c4675e38caf6354364c733b64**,
CI44305576620 SUCCESS/actualassets: losslessAIpacking, без изменения числа
вызовов/кошельков/данных. Двери/дороги3914873; переднеедно+46м e8ab6ff;
вода×2 f09c3f3. Не применять заново. Mallart исключён из очереди.
ЦельwaterALLmap — CrimsonDesert, d6fa805 историческаяtechbase, slidesVERYEARLY.
Диагностика только по?profile=1, закрытие снимаетсборщики, reloadбезокна.

## Резервная копия и передача

Каноническая память — codex/ocean-recovery-memory, не кодактуальногоmain.
[Индекс](README.md), [очередь](ROADMAP.md), [решения](decisions.md),
[восстановление](evidence-and-recovery.md). Все исходные старые worktrees сохранены.
Последняя независимая R10: archive/project-memory-2026-11-18-r10,
**e38a822797b3a9c970c85ff5826f7b338fb35831**,263669636байт/6частей,
SHA256 1ddb1c75b512a5e2c55c724947e4a870d5b675d7fdcd5267b0ef5deadefd683c.
Скачана сGitHub/восстановлено30из30деревьев exactHEAD/index/status/files,
freshSPA Node22/npmci/19testsPASS. Требует39148734bd3f4a0265a6ec9aff8ab4b41f36c0b4,
не fullGit/не включает позднийSPA. ПозднийSPA теперь отдельные remoteкоммиты
и основнойрелиз55a9beb с exactQA. Три потерянные ранниеветки не объявленывосстановленными.
