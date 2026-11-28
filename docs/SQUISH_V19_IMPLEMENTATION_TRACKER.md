# Squish V19 implementation tracker

Updated 2026-11-28, Europe/Kyiv. Working branch `codex/warehouse-squish-v16`.
Production remains `541293e`; WIP is not published or accepted.

V19.0 all 41 sections and their nested requirements are retained verbatim below.
V19.1 changes ordering to breadth first; V19.2 requires measured contact diagnosis
and prohibits duplicate procedural pressure replacing the actual solver.

Statuses: NOT STARTED / IN PROGRESS / IMPLEMENTED / VERIFIED / BLOCKED / FAILED.
VERIFIED requires the running native game, not merely code or a unit assertion.
A section stays IN PROGRESS when even one mandatory nested requirement remains.

## Current evidence and next action

- Native manual takeover, two-touch jump, real deformed support, third-person camera and safe return PASS at `23ada02`: `/workspace/qa/squish-v19-manual-camera-fix`.
- Current normalization correction is unverified in the game. Controlled same-input A/B: old cloud 0.060143m vs corrected 0.283871m depth at local (-0.5,3.265,0), 42 game-force units, 90 fixed steps. Same 343 particles; min positive tet ratio 0.663 (rounded). No claim that an artistic mass is a real measured cat mass.
- Rejected secondary cloud/jelly surface field archived outside source at `/workspace/qa/squish-v19-secondary-field-rejected`; it must not duplicate primary contact pressure.
- Prior native PC/touch material/fracture/merge and failed attempts: `docs/qa/2026-11-28/squish-v16/`. Those are earlier-source evidence, not proof of the new normalization change.
- Next: core regression → actual same-object pressure/side/top/debug/recovery → all five-material interaction and LOD → final 20-state board, real cycles, save/full CI/live verification.

## All 41 original requirements

### 01. ГЛАВНАЯ ЗАДАЧА

- Status: **IN PROGRESS**.
- Module: `squish-soft-body.js, squish-model.js, squish-cat-contacts.js` (under `public/` unless stated).
- Concrete implementation / known issue / next action: Visible compression correction pending native proof; do not claim full V19.
- Test: Existing `test/squish-*.test.mjs` and native archives; new-load regression pending.
- Actual screenshot: Earlier-source native archive exists; V19 final state not verified.

<details><summary>All original nested requirements (V19.0)</summary>

Необходимо реализовать настоящую интерактивную деформацию сквишей внутри существующего CHICHI SQUISH WAREHOUSE.

Основной визуальный референс — приложенное изображение **«ПОШАГОВАЯ ДЕФОРМАЦИЯ СКВИШЕЙ В CHICHI WAREHOUSE»**.

На нём изображены пять различных материалов и четыре последовательных физических состояния каждого.

Текущая проблема игры: котик стоит или сидит на сквише, однако сам объект почти не деформируется. Он выглядит как обычная твёрдая 3D-модель.

Это необходимо исправить.

### Самое важное правило

**НЕ ИМИТИРУЙ ДЕФОРМАЦИЮ ТОЛЬКО ИЗМЕНЕНИЕМ SCALE.X, SCALE.Y И SCALE.Z.**

Требуется локальная деформация поверхности непосредственно в местах воздействия.

Если котик наступает на левую сторону сквиша, должна проминаться именно левая сторона.

Если он переносит вес вправо, давление и деформация должны перемещаться вправо.

Если котик отпускает поверхность, материал восстанавливается в соответствии с собственными физическими характеристиками.

Физическая деформация, внешний 3D-меш, коллизии и положение лап должны оставаться синхронизированными.

---

</details>

### 02. АБСОЛЮТНЫЕ ОГРАНИЧЕНИЯ

- Status: **IN PROGRESS**.
- Module: `warehouse-world.js; protected venue/save regression suites` (under `public/` unless stated).
- Concrete implementation / known issue / next action: Source boundaries preserved; final cross-venue/SQLite regression still pending.
- Test: Existing `test/squish-*.test.mjs` and native archives; new-load regression pending.
- Actual screenshot: Earlier-source native archive exists; V19 final state not verified.

<details><summary>All original nested requirements (V19.0)</summary>

Работа разрешена только над интерактивными сквишами внутри Warehouse.

Категорически запрещено:

- Перестраивать Warehouse.
- Изменять его внешний фасад.
- Менять купол.
- Изменять мировые координаты здания.
- Масштабировать всё здание.
- Перемещать существующие зоны.
- Удалять текущие коллекции.
- Изменять ТРЦ.
- Изменять SPA.
- Менять океан.
- Изменять другие игровые локации.
- Сбрасывать сохранения.
- Переписывать глобальную систему AI без необходимости.

Не заменяй существующих котиков новыми моделями.

Не заменяй существующие сквиши другими декоративными экземплярами, если их можно доработать.

Сохрани текущие ID объектов и связи с игровой логикой.

Перед работой проверь Git status, сохрани исходное состояние и создай безопасную контрольную точку без потери пользовательских изменений.

---

</details>

### 03. ПРОБЛЕМА ТЕКУЩЕЙ РЕАЛИЗАЦИИ

- Status: **IN PROGRESS**.
- Module: `squish-soft-body.js; native contact evidence` (under `public/` unless stated).
- Concrete implementation / known issue / next action: Contacts, mesh uploads and actual picked support exist. Hypothesis: low influence was applied twice; controlled A/B recorded ~0.060m vs ~0.284m for same 42-unit load.
- Test: Existing `test/squish-*.test.mjs` and native archives; new-load regression pending.
- Actual screenshot: Earlier-source native archive exists; V19 final state not verified.

<details><summary>All original nested requirements (V19.0)</summary>

На предоставленном игровом скриншоте виден маленький серый котик, стоящий на большом светло-розовом сквише в форме кошачьей головы.

Но:

1. Верхняя часть сквиша почти не промята.
2. Лапы котика не создают отчётливых углублений.
3. Вес персонажа визуально не передаётся материалу.
4. Отсутствуют локальные складки.
5. Сквиш сохраняет слишком правильную сферическую форму.
6. Не видно перераспределения объёма.
7. Не видно реакции поверхности на изменение позы котика.

### Целевое поведение

Когда котик становится на сквиш:

- Под лапами появляются две или четыре локальные вмятины.
- Верхняя поверхность опускается.
- Боковые части могут немного расширяться.
- Котик слегка опускается вместе с поверхностью.
- Его лапы сохраняют контакт с материалом.
- При изменении позы форма сквиша перестраивается.
- После ухода котика материал начинает восстанавливаться.

Это первая механика, которую необходимо довести до качества референса.

---

</details>

### 04. ПЯТЬ МАТЕРИАЛОВ И ИХ СОСТОЯНИЯ

- Status: **IN PROGRESS**.
- Module: `squish-materials.js` (under `public/` unless stated).
- Concrete implementation / known issue / next action: All five baseline responses exist; final 20-state proof incomplete.
- Test: Existing `test/squish-*.test.mjs` and native archives; new-load regression pending.
- Actual screenshot: Earlier-source native archive exists; V19 final state not verified.

<details><summary>All original nested requirements (V19.0)</summary>

Реализуй пять отдельных физических профилей.

## MATERIAL A — SOFT SQUISH / MEMORY FOAM

Четыре состояния:

1. NORMAL.
2. PAW PRESS.
3. DEEP COMPRESSION.
4. SLOW RECOVERY.

## MATERIAL B — JELLY

Четыре состояния:

1. NORMAL.
2. COMPRESSION.
3. WOBBLE.
4. RECOVERY.

## MATERIAL C — SLIME

Четыре состояния:

1. REST.
2. STRETCH.
3. TWIST / STRANDS.
4. MERGE / RELAX.

## MATERIAL D — CRUNCHY BUTTER

Четыре состояния:

1. INTACT.
2. STRONG COMPRESSION.
3. CRACK FORMATION.
4. LOCAL FRACTURE.

## MATERIAL E — CLOUD

Четыре состояния:

1. FLUFFY REST.
2. SOFT SINK.
3. WIDE COMPRESSION.
4. SLOW RECOVERY.

Эти состояния должны возникать вследствие действий и физической симуляции.

Не делай простую переключаемую галерею из четырёх разных заранее созданных моделей.

Один и тот же интерактивный объект должен последовательно изменять форму.

---

</details>

### 05. АРХИТЕКТУРА ДВИЖКА ДЕФОРМАЦИИ

- Status: **IN PROGRESS**.
- Module: `squish-soft-body.js` (under `public/` unless stated).
- Concrete implementation / known issue / next action: XPBD edges/tetrahedra/shape/contact/plastic rest exist; explicit bending constraints and load-unit calibration need audit.
- Test: Existing `test/squish-*.test.mjs` and native archives; new-load regression pending.
- Actual screenshot: Earlier-source native archive exists; V19 final state not verified.

<details><summary>All original nested requirements (V19.0)</summary>

Сначала изучи фактический репозиторий и текущий движок.

Определи:

- Используемый 3D renderer.
- Существующий physics engine.
- Структуру игровых мешей.
- Систему анимаций котиков.
- Скелет и доступные paw bones.
- Систему коллизий.
- Систему raycasting.
- Игровой render loop.
- Возможности текущего браузерного окружения.

После этого реализуй изолированный модуль SquishDeformationSystem.

### Предлагаемые компоненты

**SquishMaterialProfile**

Характеристики материала.

**SquishSoftBodySolver**

Расчёт деформации.

**SquishContactSystem**

Контакт с лапами, игроком и другими объектами.

**SquishMeshBinding**

Передача физических изменений в отображаемую геометрию.

**SquishCollisionAdapter**

Синхронизация физических и контактных поверхностей.

**CatPawContactController**

Положение лап и давление.

**SquishDamageSystem**

Трещины и разрушение.

**SquishRecoverySystem**

Восстановление формы.

**SquishInteractionController**

Взаимодействия мышью и AI.

**SquishPhysicsDebug**

Диагностика.

Названия условные. Адаптируй их под фактическую архитектуру проекта.

---

</details>

### 06. НАСТОЯЩАЯ ЛОКАЛЬНАЯ ДЕФОРМАЦИЯ

- Status: **IN PROGRESS**.
- Module: `squish-soft-body.js, squish-model.js` (under `public/` unless stated).
- Concrete implementation / known issue / next action: Fix actual normalized weighted target; reject duplicate procedural cloud/jelly pressure.
- Test: Existing `test/squish-*.test.mjs` and native archives; new-load regression pending.
- Actual screenshot: Earlier-source native archive exists; V19 final state not verified.

<details><summary>All original nested requirements (V19.0)</summary>

Вместо масштабирования всего объекта используй физическую или процедурно-физическую деформацию геометрии.

Предпочтительные подходы:

- XPBD.
- Position-Based Dynamics.
- Shape Matching.
- Volumetric Soft Body.
- Deformable Surface with Internal Constraints.

Выбор должен зависеть от того, какие возможности реально доступны в текущем движке.

### Внутренняя структура

Для главных интерактивных сквишей создай внутреннюю сетку частиц или кластеров.

Каждый активный элемент должен иметь:

- Position.
- Previous position.
- Velocity.
- Inverse mass.
- Rest position.
- Material properties.
- Active constraints.

### Основные ограничения

Structural constraints — удерживают целостность.

Volume constraints — препятствуют нереалистичной потере объёма.

Shape matching — возвращает объект к исходному силуэту.

Contact constraints — формируют деформацию при нажатии.

Bending constraints — регулируют изгиб.

Plastic deformation — позволяет сохранять складки и вмятины там, где это предусмотрено материалом.

### Критически важно

Не обязательно делать физическую решётку такой же плотной, как визуальная модель.

Используй грубую физическую структуру и качественную внешнюю геометрию, которая следует за ней.

Это позволит сохранить высокую детализацию при разумной нагрузке на браузер.

---

</details>

### 07. CAT PAW CONTACT SYSTEM

- Status: **IN PROGRESS**.
- Module: `squish-cat-contacts.js` (under `public/` unless stated).
- Concrete implementation / known issue / next action: Actual skinned toe world coordinates; current load estimate shared among support paws. Normals/durations/penetration diagnostics pending.
- Test: Existing `test/squish-*.test.mjs` and native archives; new-load regression pending.
- Actual screenshot: Earlier-source native archive exists; V19 final state not verified.

<details><summary>All original nested requirements (V19.0)</summary>

Каждая лапа котика должна стать отдельной точкой физического взаимодействия.

Определи фактические позиции лап через существующий риг.

Для каждой лапы отслеживай:

- World position.
- Contact point.
- Contact normal.
- Contact velocity.
- Surface penetration.
- Estimated supporting force.
- Contact duration.
- Current animation state.
- Material under paw.

### Взаимодействие

Когда лапа достигает поверхности:

1. Определяется точка контакта.
2. Проверяется материал.
3. Создаётся локальное контактное ограничение.
4. Вычисляется давление.
5. Деформируются соседние элементы.
6. Соседняя геометрия реагирует на изменение объёма.
7. Поверхность передаёт поддерживающее воздействие персонажу.
8. Положение лап корректируется относительно изменённой поверхности.

### Распределение нагрузки

При стоянии котика вес распределяется между опорными лапами.

При переходе из положения стоя в положение сидя часть нагрузки переносится на нижнюю часть тела.

При прыжке кратковременная нагрузка увеличивается из-за импульса приземления.

Не используй одну и ту же глубину вмятины для ходьбы, посадки и прыжка.

---

</details>

### 08. АДАПТАЦИЯ КОТИКА К МЯГКОЙ ПОВЕРХНОСТИ

- Status: **IN PROGRESS**.
- Module: `squish-cat-contacts.js, squish-cat-choreography.js` (under `public/` unless stated).
- Concrete implementation / known issue / next action: Actual manual landing/camera already PASS 23ada02; do not retest without relevant regression. Broader poses require final validation.
- Test: Existing `test/squish-*.test.mjs` and native archives; new-load regression pending.
- Actual screenshot: Earlier-source native archive exists; V19 final state not verified.

<details><summary>All original nested requirements (V19.0)</summary>

Сейчас основная проблема заключается в несоответствии положения котика и формы сквиша.

Реализуй Cat Paw IK или совместимую процедурную коррекцию существующих анимаций.

### При стоянии

Котик слегка опускается, когда сквиш проминается.

Лапы повторяют форму поверхности.

### При ходьбе

Каждый шаг создаёт новую область давления.

Старые вмятины постепенно исчезают.

### При сидении

Поверхность проминается широкой областью под телом.

### При прыжке

В момент приземления возникает динамическая деформация.

После этого котик амортизирует движение лапами.

### При уходе

Контактные ограничения освобождаются.

Материал восстанавливается.

Котик плавно переходит на следующую поверхность.

### Запрещено

- Проваливание котика внутрь без правильной поддержки.
- Парение лап над поверхностью.
- Резкие изменения высоты персонажа.
- Несогласованные анимации лап и геометрии.
- Телепортация котика при восстановлении материала.

---

# ЧАСТЬ I — MEMORY FOAM

</details>

### 09. СОСТОЯНИЕ 1 — NORMAL

- Status: **IN PROGRESS**.
- Module: `squish-foam.js, squish-model.js, squish-soft-body.js` (under `public/` unless stated).
- Concrete implementation / known issue / next action: Existing foam pad has held toe relief; reference cat-head foam and full four-state native sequence pending.
- Test: Existing `test/squish-*.test.mjs` and native archives; new-load regression pending.
- Actual screenshot: Earlier-source native archive exists; V19 final state not verified.

<details><summary>All original nested requirements (V19.0)</summary>

Референс показывает большой светло-розовый сквиш в форме кошачьей головы.

Силуэт:

- Округлая мягкая голова.
- Два мягких ушка.
- Небольшая улыбка.
- Розовые щёчки.
- Плавная поверхность.
- Никаких вмятин.

В этом состоянии физическая сетка должна соответствовать исходной форме.

Поверхность полностью расслаблена.

---

</details>

### 10. СОСТОЯНИЕ 2 — PAW PRESS

- Status: **IN PROGRESS**.
- Module: `squish-foam.js, squish-model.js, squish-soft-body.js` (under `public/` unless stated).
- Concrete implementation / known issue / next action: Existing 65² palm/toe relief real mesh test passes; recheck after core correction.
- Test: Existing `test/squish-*.test.mjs` and native archives; new-load regression pending.
- Actual screenshot: Earlier-source native archive exists; V19 final state not verified.

<details><summary>All original nested requirements (V19.0)</summary>

Котик поднимается на сквиш и начинает давить лапами.

### Визуальная реакция

- Под лапами появляются локальные вмятины.
- Поверхность вокруг них плавно изгибается.
- Боковые части слегка расширяются.
- Котик немного опускается.
- На мягкой поверхности появляются слабые складки.

Не делай сразу глубокую воронку.

На этом этапе давление умеренное.

### Технически

Создавай локальное поле воздействия с плавным спадом от точки контакта.

Возможно использование гауссова распределения влияния:

`influence(r) = exp(-r² / (2σ²))`

Где σ соответствует области контакта.

Само смещение должно рассчитываться с учётом свойств материала, нагрузки и физических ограничений, а не только по этой функции.

---

</details>

### 11. СОСТОЯНИЕ 3 — DEEP COMPRESSION

- Status: **IN PROGRESS**.
- Module: `squish-foam.js, squish-model.js, squish-soft-body.js` (under `public/` unless stated).
- Concrete implementation / known issue / next action: Deep body compression and head-shaped foam pending.
- Test: Existing `test/squish-*.test.mjs` and native archives; new-load regression pending.
- Actual screenshot: Earlier-source native archive exists; V19 final state not verified.

<details><summary>All original nested requirements (V19.0)</summary>

Котик садится на сквиш.

### Визуальная реакция

Верхняя часть заметно опускается.

Форма становится шире.

Соседние мягкие области слегка выпячиваются.

Ушки могут наклоняться, если в них передаётся деформация.

Котик немного погружается.

Главное: объект должен оставаться узнаваемым мягким котом.

### Дополнительные эффекты

- Плавные складки.
- Контактные тени.
- Небольшое изменение поверхностных бликов.
- Локальная компрессия материала.

---

</details>

### 12. СОСТОЯНИЕ 4 — SLOW RECOVERY

- Status: **IN PROGRESS**.
- Module: `squish-foam.js, squish-model.js, squish-soft-body.js` (under `public/` unless stated).
- Concrete implementation / known issue / next action: 2-second hold and slow rest recovery exist; full native recovery video pending.
- Test: Existing `test/squish-*.test.mjs` and native archives; new-load regression pending.
- Actual screenshot: Earlier-source native archive exists; V19 final state not verified.

<details><summary>All original nested requirements (V19.0)</summary>

Котик уходит.

Вмятина не должна исчезать мгновенно.

### Последовательность

1. Давление исчезает.
2. Глубокая вмятина остаётся.
3. Поверхность начинает медленно подниматься.
4. Складки постепенно разглаживаются.
5. Форма почти полностью восстанавливается.

### Главное отличие от Jelly

Memory Foam восстанавливается медленно и без сильных колебаний.

Не добавляй резкий пружинящий отскок.

---

# ЧАСТЬ II — JELLY

</details>

### 13. СОСТОЯНИЕ 1 — NORMAL JELLY

- Status: **IN PROGRESS**.
- Module: `squish-soft-body.js, squish-model.js, squish-materials.js` (under `public/` unless stated).
- Concrete implementation / known issue / next action: Actual jelly base model exists; normalized-pressure regression pending.
- Test: Existing `test/squish-*.test.mjs` and native archives; new-load regression pending.
- Actual screenshot: Earlier-source native archive exists; V19 final state not verified.

<details><summary>All original nested requirements (V19.0)</summary>

Создай полупрозрачный розовый желейный сквиш-кот.

Поверхность:

- Гладкая.
- Глянцевая.
- Полупрозрачная.
- С красивыми бликами.
- С видимой толщиной материала.

Оригинальный силуэт сохраняется.

---

</details>

### 14. СОСТОЯНИЕ 2 — COMPRESSION

- Status: **IN PROGRESS**.
- Module: `squish-soft-body.js, squish-model.js, squish-materials.js` (under `public/` unless stated).
- Concrete implementation / known issue / next action: Signed volume constraints present; measure actual rendered-mesh volume and new load.
- Test: Existing `test/squish-*.test.mjs` and native archives; new-load regression pending.
- Actual screenshot: Earlier-source native archive exists; V19 final state not verified.

<details><summary>All original nested requirements (V19.0)</summary>

Котик прыгает на желейного кота.

### Физическая последовательность

1. Котик приближается к поверхности.
2. Происходит контакт лап.
3. Верхняя часть желе проминается.
4. Боковые части расширяются.
5. Ушки слегка изгибаются.
6. Котик опускается вслед за поверхностью.
7. Напряжение внутри мягкого тела увеличивается.

Не сжимай всю модель равномерно.

---

</details>

### 15. СОСТОЯНИЕ 3 — WOBBLE

- Status: **IN PROGRESS**.
- Module: `squish-soft-body.js, squish-model.js, squish-materials.js` (under `public/` unless stated).
- Concrete implementation / known issue / next action: Native bounce exists; four-state damped-wave proof pending.
- Test: Existing `test/squish-*.test.mjs` and native archives; new-load regression pending.
- Actual screenshot: Earlier-source native archive exists; V19 final state not verified.

<details><summary>All original nested requirements (V19.0)</summary>

После приземления начинается колебание.

### Требования

- От места контакта расходится волна.
- Соседние части желе реагируют с небольшой задержкой.
- Уши могут колебаться независимо.
- Боковые части двигаются плавно.
- Амплитуда постепенно уменьшается.
- Объём приблизительно сохраняется.

Для визуальной реализации можно использовать внутреннюю решётку с elastic constraints и damping.

Для крупных объектов применяй shape matching, чтобы желе возвращалось к исходному силуэту.

---

</details>

### 16. СОСТОЯНИЕ 4 — RECOVERY

- Status: **IN PROGRESS**.
- Module: `squish-soft-body.js, squish-model.js, squish-materials.js` (under `public/` unless stated).
- Concrete implementation / known issue / next action: Unit recovery covered; final native full cycle pending.
- Test: Existing `test/squish-*.test.mjs` and native archives; new-load regression pending.
- Actual screenshot: Earlier-source native archive exists; V19 final state not verified.

<details><summary>All original nested requirements (V19.0)</summary>

Когда энергия колебаний уменьшается, желе постепенно возвращается к первоначальной форме.

### Важно

Jelly должен восстанавливаться быстрее, чем Memory Foam и Cloud.

Допустимы небольшие остаточные колебания.

Не допускай бесконечного дрожания объекта.

---

# ЧАСТЬ III — SLIME

</details>

### 17. СОСТОЯНИЕ 1 — REST

- Status: **IN PROGRESS**.
- Module: `squish-slime.js, squish-slime-merge.js, squish-soft-body.js` (under `public/` unless stated).
- Concrete implementation / known issue / next action: Existing slime mesh/viscosity/adhesion present.
- Test: Existing `test/squish-*.test.mjs` and native archives; new-load regression pending.
- Actual screenshot: Earlier-source native archive exists; V19 final state not verified.

<details><summary>All original nested requirements (V19.0)</summary>

В исходном состоянии слайм представляет собой мягкую полупрозрачную массу.

Цвета:

- Бирюзовый.
- Фиолетовый.
- Нежно-розовый.
- Голубой.

Поверхность:

- Глянцевая.
- Влажная.
- Плавная.
- С красивыми преломлениями.

Слайм не должен выглядеть как обычный резиновый шар.

---

</details>

### 18. СОСТОЯНИЕ 2 — STRETCH

- Status: **IN PROGRESS**.
- Module: `squish-slime.js, squish-slime-merge.js, squish-soft-body.js` (under `public/` unless stated).
- Concrete implementation / known issue / next action: Actual pointer stretch and XPBD filaments present; final native sequence pending.
- Test: Existing `test/squish-*.test.mjs` and native archives; new-load regression pending.
- Actual screenshot: Earlier-source native archive exists; V19 final state not verified.

<details><summary>All original nested requirements (V19.0)</summary>

Котик захватывает слайм лапами.

### Последовательность

1. Возникает точка сцепления.
2. Лапа начинает двигаться.
3. Ближайшая область материала следует за лапой.
4. Слайм удлиняется.
5. Средняя часть становится тоньше.
6. Появляются длинные эластичные участки.
7. При большем растяжении формируются нити.

### Физические свойства

- Вязкость.
- Упругость.
- Адгезия.
- Поверхностное натяжение.
- Ограниченная прочность нитей.

### Техническое требование

Введи временные attachment constraints между лапой и слаймом.

При растяжении усилие должно передаваться материалу локально.

Не перемещай всю массу вслед за курсором как один твёрдый объект.

---

</details>

### 19. СОСТОЯНИЕ 3 — TWIST & STRANDS

- Status: **IN PROGRESS**.
- Module: `squish-slime.js, squish-slime-merge.js, squish-soft-body.js` (under `public/` unless stated).
- Concrete implementation / known issue / next action: Twist and thinning pooled strands implemented; native visual polish incomplete.
- Test: Existing `test/squish-*.test.mjs` and native archives; new-load regression pending.
- Actual screenshot: Earlier-source native archive exists; V19 final state not verified.

<details><summary>All original nested requirements (V19.0)</summary>

Котик начинает закручивать вытянутый слайм.

### Визуальные эффекты

- Появляется спиральная форма.
- Части материала перекручиваются.
- Нити растягиваются.
- Толщина становится неравномерной.
- Возникают плавные поверхностные складки.

### Механика

Применяй тангенциальное воздействие к активной контактной области.

Учитывай:

- Направление движения.
- Скорость.
- Радиус взаимодействия.
- Вязкость.
- Сопротивление кручению.
- Предел растяжения.

Не вращай весь слайм вокруг единственной оси вместо реального скручивания материала.

---

</details>

### 20. СОСТОЯНИЕ 4 — MERGE

- Status: **IN PROGRESS**.
- Module: `squish-slime.js, squish-slime-merge.js, squish-soft-body.js` (under `public/` unless stated).
- Concrete implementation / known issue / next action: Volume-normalized implicit 2-centre merge approximation only. NOT full physical fluid merge; keep requirement open.
- Test: Existing `test/squish-*.test.mjs` and native archives; new-load regression pending.
- Actual screenshot: Earlier-source native archive exists; V19 final state not verified.

<details><summary>All original nested requirements (V19.0)</summary>

Котик отпускает слайм.

Материал начинает возвращаться к более компактной форме.

Если две массы соприкасаются, они могут соединяться.

### Последовательность

1. Две части приближаются.
2. Возникает контакт.
3. Между ними образуется соединение.
4. Граница становится плавной.
5. Материал формирует единую массу.
6. Колебания постепенно исчезают.

### Реализация

Если доступен подходящий particle-based solver, используй согласованную модель слияния.

Если нет, допускается локальная аппроксимация с непрерывной визуальной поверхностью и совместимой контактной логикой.

Не называй простое пересечение двух отдельных мешей настоящим физическим слиянием.

---

# ЧАСТЬ IV — CRUNCHY BUTTER

</details>

### 21. СОСТОЯНИЕ 1 — INTACT

- Status: **IN PROGRESS**.
- Module: `squish-butter.js, squish-soft-body.js` (under `public/` unless stated).
- Concrete implementation / known issue / next action: Butter core and owned damage rind present.
- Test: Existing `test/squish-*.test.mjs` and native archives; new-load regression pending.
- Actual screenshot: Earlier-source native archive exists; V19 final state not verified.

<details><summary>All original nested requirements (V19.0)</summary>

В исходном состоянии Butter Squish выглядит как мягкий кремовый кот.

Цвет:

- Светло-янтарный.
- Кремовый.
- Нежный золотистый.

Поверхность должна быть гладкой и цельной.

Под внешней оболочкой находится мягкая сердцевина.

---

</details>

### 22. СОСТОЯНИЕ 2 — STRONG COMPRESSION

- Status: **IN PROGRESS**.
- Module: `squish-butter.js, squish-soft-body.js` (under `public/` unless stated).
- Concrete implementation / known issue / next action: Plastic compression exists; retest normalized contact load.
- Test: Existing `test/squish-*.test.mjs` and native archives; new-load regression pending.
- Actual screenshot: Earlier-source native archive exists; V19 final state not verified.

<details><summary>All original nested requirements (V19.0)</summary>

Котик сильно нажимает лапами.

### Визуальные реакции

- Верхняя поверхность проминается.
- Материал расползается в стороны.
- Появляются складки.
- Котик опускается вместе с поверхностью.

Пока оболочка не разрушена.

---

</details>

### 23. СОСТОЯНИЕ 3 — CRACK FORMATION

- Status: **IN PROGRESS**.
- Module: `squish-butter.js, squish-soft-body.js` (under `public/` unless stated).
- Concrete implementation / known issue / next action: Local strain masks and accumulated damage have actual PC/touch captures.
- Test: Existing `test/squish-*.test.mjs` and native archives; new-load regression pending.
- Actual screenshot: Earlier-source native archive exists; V19 final state not verified.

<details><summary>All original nested requirements (V19.0)</summary>

При превышении порога нагрузки начинают появляться трещины.

### Требования

Трещины должны:

- Возникать возле напряжённых участков.
- Постепенно расширяться.
- Иметь разную длину.
- Следовать геометрии поверхности.
- Сохранять связь с текущей деформацией.

### Реализация

Используй damage field.

Повреждение должно накапливаться при превышении порога материала.

Пример:

`damage += max(0, stress - yieldThreshold) * rate * dt`

Фактические коэффициенты необходимо подобрать по результатам тестов.

Для изображения трещин применяй:

- Crack masks.
- Normal perturbations.
- Roughness changes.
- Локальные деформируемые границы.

Не используй случайную статичную текстуру трещин, которая не зависит от воздействия.

---

</details>

### 24. СОСТОЯНИЕ 4 — LOCAL FRACTURE

- Status: **IN PROGRESS**.
- Module: `squish-butter.js, squish-soft-body.js` (under `public/` unless stated).
- Concrete implementation / known issue / next action: 24 pooled colliding fragments have actual PC/touch captures; final V19 cycle pending.
- Test: Existing `test/squish-*.test.mjs` and native archives; new-load regression pending.
- Actual screenshot: Earlier-source native archive exists; V19 final state not verified.

<details><summary>All original nested requirements (V19.0)</summary>

Если нагрузка продолжает расти, тонкая оболочка локально разрушается.

### Внешний вид

- Появляются отдельные кремовые фрагменты.
- Трещины становятся шире.
- Края оболочки немного расходятся.
- Мягкая сердцевина остаётся видимой.
- Основной сквиш продолжает деформироваться.

### Физическая реализация

Используй сочетание:

- Мягкой внутренней структуры.
- Декоративной разрушаемой оболочки.
- Заранее подготовленных сегментов.
- Локального повреждения.
- Ограниченных физических фрагментов.

Не запускай дорогостоящие операции произвольного разрезания всей 3D-геометрии при каждом контакте.

### Важно

Разрушение — локальное.

Не уничтожай весь объект одним нажатием.

Если пользователь продолжает нажимать, повреждения могут распространяться.

---

# ЧАСТЬ V — CLOUD

</details>

### 25. СОСТОЯНИЕ 1 — FLUFFY REST

- Status: **IN PROGRESS**.
- Module: `squish-cloud-geometry.js, squish-model.js, squish-soft-body.js` (under `public/` unless stated).
- Concrete implementation / known issue / next action: Original groom authoring on NEW toy, existing native cats untouched.
- Test: Existing `test/squish-*.test.mjs` and native archives; new-load regression pending.
- Actual screenshot: Earlier-source native archive exists; V19 final state not verified.

<details><summary>All original nested requirements (V19.0)</summary>

Создай большой пушистый сквиш-кот.

Поверхность:

- Мягкая.
- Матовая.
- Объёмная.
- С пушистыми округлыми деталями.
- Без пластикового блеска.

---

</details>

### 26. СОСТОЯНИЕ 2 — SOFT SINK

- Status: **IN PROGRESS**.
- Module: `squish-cloud-geometry.js, squish-model.js, squish-soft-body.js` (under `public/` unless stated).
- Concrete implementation / known issue / next action: Core contact underloading correction now in progress; visual native proof pending.
- Test: Existing `test/squish-*.test.mjs` and native archives; new-load regression pending.
- Actual screenshot: Earlier-source native archive exists; V19 final state not verified.

<details><summary>All original nested requirements (V19.0)</summary>

Котик наступает на облачный сквиш.

Под лапами появляется неглубокая вмятина.

Материал медленно опускается.

Поверхность реагирует очень мягко.

Отскок минимальный.

---

</details>

### 27. СОСТОЯНИЕ 3 — WIDE COMPRESSION

- Status: **IN PROGRESS**.
- Module: `squish-cloud-geometry.js, squish-model.js, squish-soft-body.js` (under `public/` unless stated).
- Concrete implementation / known issue / next action: Body load shares total estimated game weight; broad sinking needs new capture.
- Test: Existing `test/squish-*.test.mjs` and native archives; new-load regression pending.
- Actual screenshot: Earlier-source native archive exists; V19 final state not verified.

<details><summary>All original nested requirements (V19.0)</summary>

Котик ложится.

### Ожидаемая реакция

- Возникает широкая область давления.
- Облако становится ниже.
- Соседние участки мягко расширяются.
- Материал немного облегает тело.
- Котик постепенно погружается.

### Важно

Погружение должно быть распределённым.

Не создавай узкую глубокую дырку непосредственно под центром модели.

Облако должно сохранять мягкие широкие формы.

---

</details>

### 28. СОСТОЯНИЕ 4 — SLOW RECOVERY

- Status: **IN PROGRESS**.
- Module: `squish-cloud-geometry.js, squish-model.js, squish-soft-body.js` (under `public/` unless stated).
- Concrete implementation / known issue / next action: Slow cloud recovery implemented; new actual cycle pending.
- Test: Existing `test/squish-*.test.mjs` and native archives; new-load regression pending.
- Actual screenshot: Earlier-source native archive exists; V19 final state not verified.

<details><summary>All original nested requirements (V19.0)</summary>

Котик уходит.

Облачная поверхность постепенно расправляется.

В отличие от Jelly, не должно быть резких колебаний.

В отличие от Butter, не должно быть трещин.

В отличие от Slime, не должно быть длинных нитей.

---

# ЧАСТЬ VI — ВЫБОР ФИЗИЧЕСКОЙ МОДЕЛИ

</details>

### 29. MATERIAL BEHAVIOR MATRIX

- Status: **IN PROGRESS**.
- Module: `squish-materials.js` (under `public/` unless stated).
- Concrete implementation / known issue / next action: Five profiles implemented, calibration matrix not final.
- Test: Existing `test/squish-*.test.mjs` and native archives; new-load regression pending.
- Actual screenshot: Earlier-source native archive exists; V19 final state not verified.

<details><summary>All original nested requirements (V19.0)</summary>

Каждый материал должен иметь разные свойства.

| Свойство | Foam | Jelly | Slime | Butter | Cloud |
|---|---|---|---|---|---|
| Локальное сжатие | Да | Да | Да | Да | Да |
| Сильный отскок | Нет | Да | Нет | Нет | Нет |
| Сохранение вмятины | Временно | Нет | Частично | Частично | Временно |
| Растяжение нитей | Нет | Обычно нет | Да | Нет | Нет |
| Скручивание | Умеренное | Упругое | Сильное | Пластичное | Слабое |
| Трещины | Нет | Нет | Нет | Да | Нет |
| Медленное восстановление | Да | Нет | Да | Частично | Да |
| Объёмные волны | Слабо | Выраженно | Вязкие | Слабо | Слабо |

Это качественные различия, которые требуется обеспечить в поведении реальных игровых объектов.

---

</details>

### 30. ВИЗУАЛЬНАЯ СИНХРОНИЗАЦИЯ

- Status: **IN PROGRESS**.
- Module: `squish-model.js` (under `public/` unless stated).
- Concrete implementation / known issue / next action: Same mesh vertices/normals/bounds and picked support update; final GL/update/contact diagnostic pending.
- Test: Existing `test/squish-*.test.mjs` and native archives; new-load regression pending.
- Actual screenshot: Earlier-source native archive exists; V19 final state not verified.

<details><summary>All original nested requirements (V19.0)</summary>

После каждого физического шага необходимо обновлять внешний меш.

Проверяй:

- Позиции вершин.
- Нормали.
- Тени.
- Bounding volumes.
- Контактные поверхности.
- Положение лап.
- Декоративные элементы на сквише.

Глаза, нос, рот и ушки должны оставаться правильно прикреплёнными к деформируемой поверхности.

### Пример

Если котик сильно сжимает Giant Jelly Cat, мордочка может немного изменить форму, но глаза не должны отрываться от поверхности и оставаться висеть в воздухе.

Используй skinning, surface attachments или аналогичное решение.

---

</details>

### 31. НЕ ДЕЛАЙ ЧЕТЫРЕ ОТДЕЛЬНЫЕ МОДЕЛИ

- Status: **IN PROGRESS**.
- Module: `squish-model.js` (under `public/` unless stated).
- Concrete implementation / known issue / next action: Same object/mesh continuously deforms, no four-model swap. Tested identity; final capture pending.
- Test: Existing `test/squish-*.test.mjs` and native archives; new-load regression pending.
- Actual screenshot: Earlier-source native archive exists; V19 final state not verified.

<details><summary>All original nested requirements (V19.0)</summary>

Это особенно важно.

На фото показаны четыре кадра каждого материала, но они предназначены для объяснения последовательности.

Не реализуй состояния исключительно через:

`normalMesh.visible = false`

`pressedMesh.visible = true`

Такая схема может использоваться для отдельных декоративных эффектов повреждения, но не должна заменять основную деформацию.

Основной сквиш обязан существовать как один непрерывно изменяющийся объект.

### Правильный принцип

NORMAL → PRESS → DEFORMATION → RECOVERY

Переходы должны выглядеть непрерывными.

---

</details>

### 32. ВЗАИМОДЕЙСТВИЕ МЫШЬЮ

- Status: **IN PROGRESS**.
- Module: `squish-player.js` (under `public/` unless stated).
- Concrete implementation / known issue / next action: Press/stretch/twist/knead/release exist; explicit HOLD/DRAG and interaction regressions pending.
- Test: Existing `test/squish-*.test.mjs` and native archives; new-load regression pending.
- Actual screenshot: Earlier-source native archive exists; V19 final state not verified.

<details><summary>All original nested requirements (V19.0)</summary>

Помимо AI котиков, добавь возможность напрямую проверять физику.

Используй существующий способ взаимодействия с объектами.

### PRESS

Игрок нажимает на сквиш.

Возникает локальная вмятина.

### HOLD

Удерживание увеличивает деформацию до допустимого предела.

### DRAG

Область контакта перемещается по поверхности.

### STRETCH

Для эластичных материалов создаётся вытягивание.

### TWIST

Для подходящих материалов включается кручение.

### RELEASE

Контакт освобождается.

Материал начинает восстановление.

Не блокируй существующее управление камерой. Используй отдельный режим взаимодействия с объектом или контекстное действие.

---

</details>

### 33. УРОВНИ ФИЗИЧЕСКОЙ ДЕТАЛИЗАЦИИ

- Status: **NOT STARTED**.
- Module: `squish-physics-lod.js (pending)` (under `public/` unless stated).
- Concrete implementation / known issue / next action: Sleeping/static instancing exist. Four explicit HERO/ACTIVE/VISUAL/STATIC tiers and smooth promotion pending.
- Test: Existing `test/squish-*.test.mjs` and native archives; new-load regression pending.
- Actual screenshot: No final native evidence yet.

<details><summary>All original nested requirements (V19.0)</summary>

Полная физика должна применяться не ко всем игрушкам Warehouse одновременно.

## HERO

Крупные интерактивные сквиши.

Детальная деформация.

## ACTIVE

Близкие объекты, с которыми взаимодействует котик или игрок.

Упрощённая физическая структура.

## VISUAL

Небольшие игрушки, для которых достаточно локальной shader-деформации.

## STATIC

Дальние коллекционные сквиши.

Без активной физической симуляции.

### Основное правило

Если котик подходит к объекту и начинает взаимодействие, его физический уровень повышается.

Если объект неактивен и удалён от камеры, симуляция упрощается.

Избегай заметных скачков формы при смене уровня детализации.

---

# ЧАСТЬ VII — АВТОМАТИЧЕСКАЯ ПРОВЕРКА

</details>

### 34. ОБЯЗАТЕЛЬНО СОЗДАЙ DEFORMATION TEST SCENE

- Status: **NOT STARTED**.
- Module: `developer QA harness (pending)` (under `public/` unless stated).
- Concrete implementation / known issue / next action: Existing native harness has private world/cameras; five side-by-side real models and deterministic cycles pending.
- Test: Existing `test/squish-*.test.mjs` and native archives; new-load regression pending.
- Actual screenshot: No final native evidence yet.

<details><summary>All original nested requirements (V19.0)</summary>

Внутри разработческого режима Warehouse создай специальную тестовую сцену или тестовый режим.

Он должен использовать реальные модели и материалы, но не изменять обычную планировку Warehouse.

### В тестовом режиме

Пять объектов стоят рядом:

1. Memory Foam.
2. Jelly.
3. Slime.
4. Crunchy Butter.
5. Cloud.

Для каждого объекта доступно четыре стандартных тестовых состояния.

Тестовый режим должен позволять:

- Установить фиксированную камеру.
- Использовать фиксированный timestep.
- Установить фиксированный random seed.
- Создать котика.
- Выполнить заданное действие.
- Сохранить скриншот.
- Записать физические параметры.
- Вернуться к исходному состоянию.

Этот режим нужен только для разработки и проверки.

Не добавляй его как отдельную новую локацию в обычную игру.

---

</details>

### 35. СТРОГОЕ СРАВНЕНИЕ С ПРИЛОЖЕННЫМ ФОТО

- Status: **IN PROGRESS**.
- Module: `scripts/compare-squish-references.py` (under `public/` unless stated).
- Concrete implementation / known issue / next action: Inline original seen; filesystem reference bytes unavailable. Existing comparison reports are not final 20-state acceptance.
- Test: Existing `test/squish-*.test.mjs` and native archives; new-load regression pending.
- Actual screenshot: Earlier-source native archive exists; V19 final state not verified.

<details><summary>All original nested requirements (V19.0)</summary>

После реализации каждого материала воспроизведи четыре последовательных состояния.

## MEMORY FOAM

NORMAL → PAW PRESS → DEEP COMPRESSION → SLOW RECOVERY.

## JELLY

NORMAL → COMPRESSION → WOBBLE → RECOVERY.

## SLIME

REST → STRETCH → TWIST → MERGE.

## CRUNCHY BUTTER

INTACT → COMPRESSION → CRACKS → FRACTURE.

## CLOUD

FLUFFY REST → SOFT SINK → WIDE COMPRESSION → SLOW RECOVERY.

### Для каждого состояния

1. Открой реальную игру.
2. Выбери соответствующий сквиш.
3. Выполни физическое действие.
4. Сделай скриншот.
5. Сравни с референсом.
6. Проверь глубину деформации.
7. Проверь правильность контакта котика.
8. Проверь форму мягкого тела.
9. Проверь визуальные свойства материала.
10. Исправь расхождения.

Не считай задачу завершённой на основании успешной компиляции.

---

</details>

### 36. ВИДЕОПРОВЕРКА АНИМАЦИЙ

- Status: **IN PROGRESS**.
- Module: `scripts/audit-squish-native.mjs` (under `public/` unless stated).
- Concrete implementation / known issue / next action: Jelly 37 real frames / 12 fps archived. Other full five-material cycles pending.
- Test: Existing `test/squish-*.test.mjs` and native archives; new-load regression pending.
- Actual screenshot: Earlier-source native archive exists; V19 final state not verified.

<details><summary>All original nested requirements (V19.0)</summary>

Кроме отдельных скриншотов, необходимы короткие реальные видеодемонстрации.

Для каждого материала запиши полный цикл.

### Memory Foam

Котик наступает → садится → уходит → вмятина исчезает.

### Jelly

Котик прыгает → поверхность прогибается → волны → восстановление.

### Slime

Захват → вытягивание → нити → закручивание → отпускание.

### Butter

Нажатие → углубление → трещины → локальное разрушение.

### Cloud

Наступание → посадка → погружение → уход → восстановление.

Не подменяй видеодемонстрации монтажом из концепт-артов.

---

</details>

### 37. ТЕХНИЧЕСКИЕ МЕТРИКИ

- Status: **IN PROGRESS**.
- Module: `squish-soft-body.js; QA metrics` (under `public/` unless stated).
- Concrete implementation / known issue / next action: Solver time/strain/volume/damage exist. Actual mesh compression/radius/recovery/load-unit metrics pending; software timings are not physical device FPS.
- Test: Existing `test/squish-*.test.mjs` and native archives; new-load regression pending.
- Actual screenshot: Earlier-source native archive exists; V19 final state not verified.

<details><summary>All original nested requirements (V19.0)</summary>

Для проверки качества измеряй:

**Contact depth**

Глубина локального давления.

**Deformation radius**

Радиус воздействия.

**Volume deviation**

Изменение объёма для материалов, где он должен приблизительно сохраняться.

**Recovery time**

Время восстановления.

**Oscillation amplitude**

Амплитуда колебаний.

**Strain**

Локальная деформация.

**Damage**

Накопленное повреждение.

**Solver time**

Время расчёта физического шага.

**FPS**

Частота кадров при активном взаимодействии.

### Важно

Не придумывай точные числовые значения из концепт-арта.

Референс задаёт визуальные состояния и качественные различия между материалами.

Физические параметры необходимо настраивать экспериментально в реальном масштабе игры.

---

</details>

### 38. ДИАГНОСТИКА ОШИБОК

- Status: **NOT STARTED**.
- Module: `scoped contact debug (pending)` (under `public/` unless stated).
- Concrete implementation / known issue / next action: No ordinary UI debug. Implement opt-in markers/normals/nodes/constraints/depth/timing/LOD.
- Test: Existing `test/squish-*.test.mjs` and native archives; new-load regression pending.
- Actual screenshot: No final native evidence yet.

<details><summary>All original nested requirements (V19.0)</summary>

Добавь developer-only Debug Squish Physics.

Показывай:

- Contact points.
- Collision bounds.
- Surface normals.
- Soft-body nodes.
- Active constraints.
- Local deformation.
- Damage values.
- Current physics LOD.
- Solver update time.

### Если котик стоит на сквише, а вмятины нет

Проверь:

1. Определяется ли контакт лапы.
2. Передаётся ли нагрузка.
3. Срабатывает ли contact constraint.
4. Обновляются ли физические узлы.
5. Привязан ли визуальный меш к физической структуре.
6. Обновляются ли вершины.
7. Не мешает ли старый твёрдый collider.
8. Не происходит ли принудительный сброс формы после каждого кадра.

### Если деформация есть, но котик висит сверху

Проверь адаптацию лап и положение поддерживающей поверхности.

### Если сквиш взрывается геометрически

Проверь устойчивость constraints, timestep, массу и величину внешнего воздействия.

### Если поверхность выглядит твёрдой

Проверь фактическую глубину деформации и материал.

---

</details>

### 39. ОБЯЗАТЕЛЬНАЯ ПОЭТАПНАЯ РЕАЛИЗАЦИЯ

- Status: **IN PROGRESS**.
- Module: `this phase table` (under `public/` unless stated).
- Concrete implementation / known issue / next action: All 12 phases below retained; proceed breadth-first after baseline works.
- Test: Existing `test/squish-*.test.mjs` and native archives; new-load regression pending.
- Actual screenshot: No final native evidence yet.

<details><summary>All original nested requirements (V19.0)</summary>

## PHASE 1 — CURRENT SQUISH FIX

Возьми существующий большой розовый сквиш, показанный на игровом скриншоте.

Не создавай новый.

Сделай так, чтобы он локально деформировался под лапами котика.

Это первая обязательная задача.

## PHASE 2 — PAW IK

Добейся синхронизации положения котика и поверхности.

## PHASE 3 — MEMORY FOAM

Реализуй все четыре состояния.

## PHASE 4 — JELLY

Добавь объёмное колебание и восстановление.

## PHASE 5 — SLIME

Добавь растяжение, нити и скручивание.

## PHASE 6 — BUTTER

Добавь пластическую деформацию, трещины и локальный разлом.

## PHASE 7 — CLOUD

Добавь широкое погружение и медленное восстановление.

## PHASE 8 — PLAYER INPUT

Добавь прямые взаимодействия мышью.

## PHASE 9 — MULTI-CONTACT

Проверь несколько одновременно действующих котиков.

## PHASE 10 — PHYSICS LOD

Оптимизируй симуляцию.

## PHASE 11 — REFERENCE VALIDATION

Сделай полную сравнительную панель из двадцати реальных игровых состояний.

## PHASE 12 — REGRESSION

Проверь стабильность игры и сохранность остальных локаций.

---

</details>

### 40. КРИТЕРИИ ПРИЁМКИ

- Status: **IN PROGRESS**.
- Module: `native, physics, save and CI regression` (under `public/` unless stated).
- Concrete implementation / known issue / next action: NOT accepted: final 20-state native proof, full tests/build/performance/save release remain.
- Test: Existing `test/squish-*.test.mjs` and native archives; new-load regression pending.
- Actual screenshot: No final native evidence yet.

<details><summary>All original nested requirements (V19.0)</summary>

Работа считается завершённой только тогда, когда:

- Существующий розовый сквиш реагирует на вес котика.
- Под лапами появляются локальные вмятины.
- Котик опускается вместе с деформируемой поверхностью.
- Сквиш реагирует на изменение положения персонажа.
- Memory Foam медленно восстанавливается.
- Jelly колеблется волнами.
- Slime вытягивается и скручивается.
- Butter образует трещины и локальные повреждения.
- Cloud мягко проседает под весом котика.
- Все пять материалов выглядят физически различными.
- Визуальные модели и коллизии согласованы.
- Физика не создаёт неконтролируемых скачков.
- FPS остаётся приемлемым.
- Сохранения работают.
- Warehouse не перестроен.
- ТРЦ и SPA не изменены.

---

</details>

### 41. ФИНАЛЬНОЕ КРИТИЧЕСКОЕ УКАЗАНИЕ

- Status: **IN PROGRESS**.
- Module: `this tracker and V19.1/V19.2 overlays` (under `public/` unless stated).
- Concrete implementation / known issue / next action: V19.1 breadth-first and V19.2 local pressure diagnostics are additive; no venue reconstruction.
- Test: Existing `test/squish-*.test.mjs` and native archives; new-load regression pending.
- Actual screenshot: No final native evidence yet.

<details><summary>All original nested requirements (V19.0)</summary>

**ПЕРВЫЙ ПРИОРИТЕТ — ИСПРАВИТЬ УЖЕ СУЩЕСТВУЮЩИЙ РОЗОВЫЙ СКВИШ, НА КОТОРОМ СТОИТ СЕРЫЙ КОТИК.**

В текущем состоянии он выглядит твёрдым.

Не начинай с создания сотен новых игрушек.

Не добавляй новые комнаты.

Не занимайся декором.

Не перестраивай фасад.

Не добавляй лишние аттракционы.

Сначала добейся видимой локальной деформации этого одного объекта.

Затем реализуй четыре стадии Memory Foam.

После этого последовательно реализуй Jelly, Slime, Crunchy Butter и Cloud.

На каждом этапе сравнивай реальные игровые результаты с приложенным фото-референсом.

**КЛЮЧЕВАЯ ЦЕЛЬ: КОГДА КОТИК НАСТУПАЕТ, САДИТСЯ, ПРЫГАЕТ ИЛИ ДАВИТ ЛАПАМИ — СКВИШ ДОЛЖЕН ФИЗИЧЕСКИ МЕНЯТЬ ФОРМУ ИМЕННО ПОД ЕГО ВОЗДЕЙСТВИЕМ.**

Никакой имитации исключительно общим масштабированием.

Никаких фальшивых четырёх статичных состояний.

Нужна непрерывная, убедительная, интерактивная деформация в реальном времени.

**CHICHI SQUISH WAREHOUSE — REAL SOFT BODY PHYSICS, NOT FAKE ANIMATIONS.**

</details>

## Required 12 phases — breadth-first pass

| Phase | Work | Status | Next proof |
|---|---|---|---|
| 1 | Existing pink squish pressure | IN PROGRESS | Correct single-solver normalization, same-object side/top/body/recovery |
| 2 | Native paw IK/load transfer | IN PROGRESS | Four actual contacts, actual normals, support shares, sit/walk/jump |
| 3 | Foam | IN PROGRESS | Cat-head foam plus held dent full cycle |
| 4 | Jelly | IN PROGRESS | Local compression, actual volume/wobble/recovery |
| 5 | Slime | IN PROGRESS | Stretch/twist/strand/release/merge; physical merge still incomplete |
| 6 | Butter | IN PROGRESS | Recheck plastic core/local cracks/fracture under corrected loads |
| 7 | Cloud | IN PROGRESS | Broad body sink and slow recovery, not jelly bounce |
| 8 | Player input | IN PROGRESS | Explicit six actions with native camera preserved |
| 9 | Multi-contact | IN PROGRESS | Two original cats/eight paws, opposite loads, landings/recovery |
| 10 | Four physics LODs | NOT STARTED | Detailed hero, active, shader visual, static, smooth promotion |
| 11 | Reference validation | IN PROGRESS | All 20 actual states + differences + 5 real-cycle videos |
| 12 | Regression/release | IN PROGRESS | Scope/native cats/saves/build/performance/CI/live bytes |

## Honest completeness matrix

`I` = implemented baseline, verification of final version incomplete.
`P` = partial; `N` = not yet validated. No VERIFIED claim in this matrix.

| Feature | Foam | Jelly | Slime | Butter | Cloud |
|---|---|---|---|---|---|
| Local pressure | I | I | I | I | I |
| Body contact | P | P | P | P | P |
| Recovery | I | I | I | I | I |
| Material-specific physics | I | I | P (merge approximation) | I | I |
| Cat interaction | P | P | P | P | P |
| Player interaction | P | P | P | P | P |
| Final visual validation | N | N | N | N | N |
| Device performance validation | N | N | N | N | N |

## Additional required systems

- Core: structural edges, signed tetra volume, shape and contacts implemented;
  plastic rest implemented; explicit bending audit remains open.
- Contacts: actual world toe coordinates, local transforms and velocity exist;
  normals/age/force/area/penetration overlays and physical load audit pending.
- Rendering: actual position/normal/bounds updates and deformed ray support exist;
  final contact shadows, ears/face and no-clipping proof pending.
- Stability: fixed 60 Hz, bounded six steps, max deformation, signed-volume
  barrier, release/reset/nonfinite guards implemented; final multicontact regression pending.
- Debugging: contacts/normals/nodes/constraints/deformation/damage/solver timing/FPS/LOD
  must be opt-in; no ordinary product debug clutter.

## V19.2 diagnostic hypotheses

| Hypothesis | Evidence / state |
|---|---|
| A Contact absent | Prior actual native trace contains 4 contacts; final corrected version pending |
| B Force small | Original ~22 per paw; now total effective game weight shared among planted supports |
| C Wrong point | Actual skinned-toe/deep translated coordinates unit/native proof exists; normals audit pending |
| D Too stiff | Isolated A/B isolates target normalization; no indiscriminate zero stiffness |
| E Clamp | Profile deformation bounds checked; mounted foam cap retained to prevent inversion |
| F Mesh disconnected | Actual CPU positions/normals/picking updated; final GL frame pending |
| G Reset later | Same geometry held through native frames; exact corrected-version audit pending |
| H Old collider | Support is raycast from deformed body/ear mesh, not a duplicate rigid collider |
| I Obscured view | Original-angle image obscures some pressure behind ear; side/top/debug captures required |

V19.2 23 sections remain in exact linked specification
`specifications/warehouse-contact-v19-2-2026-11-28.md`; its mandatory original,
side, top, debug and after-release views are not waived by breadth-first ordering.
