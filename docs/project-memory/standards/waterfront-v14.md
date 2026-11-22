# Waterfront V14: ресторан, мост и батут

Контракт пользователя22ноября2026: новый ресторан «Лагуна» и большой фиолетовый
батут с лапкой на другой стороне общей лагуны напротив Warehouse. Полный текст
в source `docs/specifications/waterfront-v14-2026-11-21.md`; точные116protected hashes
в соседнем protection.json. Inline reference доступен в чате, original bytes нет.
Не заменять reference генерацией/выдуманным hash. Сравнивать на каждом art stage.

Старые ТРЦ/SPA/Warehouse, native approved cats, water core, берег/старые маршруты,
свет, экономика/сохранения защищены. Новый центр autumn-local `[1140,-342]`,
world `[690,0,158]`. Самостоятельные `waterfront-*.js` модули; новые параметры
water core применяются только к новым бассейнам/фонтанам. Не добавлять глобальный
свет/postprocess и не уменьшать old detail/DPR для новой сцены. Все старые
native geometry buffers/materials/world matrices сравнивать при одинаковом
animation time7/mood/skeleton update, иначе staff/fish poses дают ложные diff.

Пирс и ресторан имеют настоящие отверстия под112×48 и2×32×24glass panes;
никакого opaque floor под ними. Подводный habitat настоящий. Проходы/мост имеют
body-radius support, входы открыты, стены/rails/мебель остаются физическими.
Батутradius74, рабочаясетка68, обод с реальными входом/четырьмя лестницами.
Concentric net6145vertices: counterclockwise front normals +Y, matching colour/
shadow/CPUheight. Backface winding затемнял верх; geometry+actual ray test обязателен.

Непрерывные8damped spring nodes хранят displacement/velocity; bounded120Hz steps,
подготовка перед отрывом, баллистика9.81без ускорения времени, landing на текущую
сетку. Held Space/phonejump усиливает successive jumps до cap60m, WASD мягко
рулит в безопасной области. Не сбрасывать mesh deformation скачком при отрыве.
Pooled320spray/bubble/drip и12rings реагируют один раз на физическое касание;
water drag/buoyancy/swim/climb возвращают гостя. Одна очередь существующих actors,
до6активных; все free NPC + обязательнаяЧичи дажеbusy, без per-cat AI вызовов.
Paid AI/профессии/кошельки не изменять.6compact offers идут в existing afterwork.

После уточнения пользователя default — ТРЕТЬЕ лицо,7.2mbehind/.28radpitch.
Первое лицо только optionalпоV — от настоящих native eyes, без удаления
головы/двойника; горизонтworld-up, точная высота полёта без chase lag, FOV70,
near.045. V/кнопка1↔3; при возврате ограничить обычный third-person pitch, чтобы
после look-down камера не оказалась строго над котом. Обычные режимы мира
сохраняют third person. Water action сохраняет camera owner через splash/swim.
Phonehit44px, jump/view/dive в фактически видимом viewport с footer/safearea.

Airborne save получает свой отдельный dry reservation; standing net save —
валидную restheight. QA: real keyboard/touch,7progressive hops, local spring
contact, eye mount/look/V/water, all19native views/daynight и2privateSQLite
reloads. Перед первым autonomous RAF проверять native restored координаты/yaw,
затем полные wallets/inventory/ownership. Сравнение после обычного roaming не
доказывает поломку загрузки; raw failed attempts сохранять. Live player world
не использовать. One GPU; frozen raster допустим только для QA подготовки/
deterministic captures, не как performance результат.

Актуальные SHA/CI/live/QA — CURRENT. 1:1/GTA6/60FPS не считать достигнутыми без
проверки. NativePASS/CI/deploy не являются user visual approval.
