# Управление и камеры

## Последний пользовательский контракт

**Чичи ходит и плавает ОТ ТРЕТЬЕГО ЛИЦА.** Это отменяет прежнее первое лицо.
Камера сзади/немного сверху, видны кот и путь, небольшой наклон. Одна настоящая
утверждённая модель, без декоративного двойника и скрытия тела.
W/S — вперёд/назад относительно камеры, A/D — боковое движение; плавный
поворот кота. В воде остаются подъём/погружение. Следование независимо от FPS,
без дрожи на остановке; locomotion отвечает реальной скорости.

На **ПК экранные кнопки движения убрать** и для Чичи, и для субмарины.
На телефоне — компактный блок в свободном удобном месте, hit areas не меньше
44px, safe-area и фактическая высота footer/inventory. Это заменяет прежнее
«полностью скрыть везде». Жест камеры не мешает движению/UI. Не показывать
debug-подсказки как продуктовый интерфейс.

Независимые режимы: ручная Чичи; близкий случайный посетитель ТРЦ немного
спереди/сбоку (примерно15° elevation, не потолок); верхний обзор этажа.
Их ракурсы/настройки/controllers не перезаписывают друг друга.

## Архитектура и границы

`ocean-explorer-state.js` — save/normalize;
`submarine-physics.js` — физический корпус/вода/препятствия;
`explorer-camera.js` — actual floor polygons/OBBs и camera-body clearance;
`explorer-locomotion.js` — настоящий approved rig;
`mall-airlock-data.js` и runtime — последовательный реальный шлюз.
Уточнять владельцев и exports по актуальным исходникам перед изменениями.

Камера приближается по свободному отрезку при стене/мебели/скале/перекрытии и
плавно возвращает расстояние. Camera radius независим от body capsule. Нельзя
уменьшать кота, отключать столкновения, видеть сквозь стены или телепортироваться.
«Остров»/«Весь мир» освобождают управление/камеру; Чичи продолжает обычную жизнь.
После reload нет пленения или конкурирующих controllers. Одного manual=false
или phase=mall без поведения недостаточно.

## Воспроизведение и проверка

Node22, `CHICHI_EXPLORER_AUDIT=1 node scripts/check-aquarium.cjs` на приватной
SQLite; сохранить точный QA build/hash. `audit-ocean-explorer-native.mjs`:
выход под водой → third-person swim/dive/rise → reboard → swim reload → world
release → настоящий шлюз → ходьба → exit/reboard/reentry → floor2/escalator →
cold-load island release → физическое docked → обычная работа → SQLite reload.
Сохранять phone/desktop input helpers и sweeps всего тела.

Последний полный успешный источник/сборка записаны в
[QA12d478e](https://github.com/arturmal2805-netizen/ai-cat-game/blob/f5f89c75513c416d6713715b1ae0d568270fab20/docs/qa/2026-11-16/mall.md). Старый Explorer pass не считать
пройденным для новой геометрии. Очередь/текущая степень готовности — CURRENT.

## Диагностика — только по явному запросу (2026-11-17)

Специальная ссылка ?profile=1 открывает одноразовое окно, обычная игра не
включает его. Запрос потребляется, не хранится в localStorage. Явное закрытие
удаляет окно и сбор/наблюдателей/таймеры/GL wrappers; reload не открывает снова.
Copy report: FPS/1% low, CPU/GPU/длинные паузы, startup и худшие ресурсы загрузки.
Отчёт локальный, без секретов/игровых записей и автоматической отправки.

## Global entry (player clarification, 2026-11-17)

The visible «Управлять Чичи» map button must enter real third-person control
where the actual Chichi is: ordinary islands/bridges, swimming or Mall walking.
Do not make it a Mall-only control or teleport a decorative duplicate. Use
chichi-manual.js for dry islands and existing submarine explorer for water/Mall.
There is one owner at a time; ordinary jobs/home/leisure cannot move a manually
controlled hero. Land manual mode is transient, but actual catLocations persist.
Old clients receive a valid legacy shore position when the new client is on a
bridge; only Chichi may save a bridge pose, with both endpoint islands unlocked.
Never loosen NPC validation or the shared-world merge for this field.

An authored default spawn may already overlap a coarse scenery reservation.
Retain full navigation radius and every obstacle: bounded substeps may keep or
reduce existing penetration (including tangent escape), never increase it or
enter a new obstacle. A clear endpoint does not justify crossing a wall.
Desktop controls remain keyboard/mouse; phone arrows are44px and stay above the
actual visible footer/safe area. Disposal removes input, resize and scroll hooks.

## Manual takeover vs ordinary activity (2026-11-17)

`app.busy` covers the whole awaited activity and pending AI request. It is a
drag/decision guard, not permission to take third-person control. Keep
`canControlChichi` separate, retaining editable-world/conflict/build-mode gates.
Taking control cancels the existing hero action/route and pending fetch, clears
rest through the existing save commit, and advances the hero-decision version.
A late promise/fetch must not commit effects, reset a newer action UI or accept
a stale cloud snapshot. Routine food/leisure must defer while manual/physical
return owns Chichi; explicit new activity releases manual control first.

Native regression helper `scripts/audit-manual-busy-native.mjs` uses the real
demo button, actual WASD or phone-held touch, an intercepted pending AI request
(no provider spend), and private SQLite reload. Keep exact loaded-pose checks,
full body collisions and all residents. Use a clear seeded area for input
checks: a resident independently entering the tested path is a collision, not
evidence of dropped keyboard input. Do not lower movement assertions or remove
colliders to pass. Desktop has no pad; phone targets >=44px inside the viewport.

## Компактные кнопки мест — 2026-11-20

Три SVG-логотипа ТРЦ (киця), SPA (лотос), Warehouse (купол) создаёт venue-buttons.js.
На ПК и телефоне сохранять область нажатия 44px, title/ARIA и фокус клавиатуры.
Геометрию зданий ради UI не менять. warehouse-camera.js строит кадр по настоящему
мировому bbox и подходит с запада через воду; учитывать portrait/landscape/resize.
Владельцы камеры освобождают друг друга; «Остров», follow и manual снимают
Warehouse mode. Проверять реальные клики и проекции 8 углов в полной игре,
включая phone/coarse/DPR2. В offline QA останавливать рисование на время
подготовки, затем рисовать настоящий кадр; убирать осиротевший GPU-процесс
прерванного прогона. SwiftShader не подтверждает FPS физического устройства.
[Проверенный выпуск](../../qa/2026-11-20/venue-camera/README.md).
