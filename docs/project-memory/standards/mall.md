# Стандарт ТРЦ

Нужен настоящий подробно заполненный торговый центр: покупки, еда, мороженое,
кино и разнообразная самостоятельная жизнь котиков. Одни материалы не решают
задачу. Пустые этажи и каркасный купол опубликованного12d478e не являются
утверждённым художественным результатом.

## Источники и архитектура

[Геометрический контракт](../../specifications/underwater-cat-mall-rebuild-2026-11-11.md)
и [спецификация](../../specifications/underwater-cat-mall-2026-11-11.md).
`mall-layout.js` — общий ocean-local план/этажи/envelope;
`mall-airlock-data.js`, `mall-pressure.js` — настоящий шлюз/оболочка;
`mall-interiors.js`, `mall-signature-interiors.js`, `mall-data.js` — здание/веню;
`mall-system.js` и связанные runtime — покупки/назначения/самостоятельная жизнь;
`mall-guest-camera.js` — независимая камера посетителя;
`mall-surfaces.js`, `mall-surface-uv.js`, `mall-art.js` — карты/отделка/ownership.
Проверять актуальные экспорты/вызовы перед изменением; имена не заменяют исходник.

7 этажей, ground y=-165м, rise8.5м, главный x0,z65,r60. Определять исходный
объект, этаж и world/local transforms препятствия. Общий bbox объединённого
меша не должен закрывать настоящий проём: разделять реальные сегменты.
Настоящее стекло сохранять, обходить через реальный проход/лестницу/эскалатор.
Свободный endpoint не доказывает swept BODY на всём маршруте.

## Материалы и владение

[Отделка](../../art/mall-finishes-2026-11-16.md): marble repeat2.4м, wood1.5,
metal.75, cloth.25, leather.45. UV из настоящих construction transforms в
независимых buffer copies до immutable batching, yield каждые1024vertices.
Shared geometry/userData оригинального примитива не мутировать.
Color sRGB, normal/roughness linear; источники/собственные генераторы в mall-art
и соответствующих manifest, не приписывать им произвольную CC0-фотографию.
Существующий probe, Fresnel/roughness/metal response и native room lights;
без новых reflection passes/targets/runtime texture generation.

Покупки/еда/кино/мороженое используют существующие IDs/receipts/capacity.
После reload нет повторного списания, дубликата еды или рабочего маршрута.
При возврате из manual требуются снятое управление, обычная камера, автономное
действие и reload; другая строка phase не исправление. Ожидаемый docked не
менять на mall ради зелёного теста.

Root:false/ready:false/paused:true не должен создавать deadlock. Различать
needed/background/moving и shader warmup: необходимые tasks получают bounded
progress даже при скрытом render. Постоянная faceCamera не означает вечное
фактическое движение. Не отключать загрузочные ограничения глобально.

## Проверки и статус

[Последний технический этап](../../qa/2026-11-16/mall.md),
[native/source/build/PNG hashes](../../qa/2026-11-16/mall-native-summary.json).
Источник b67d2f1ebcd6e0166d04a720ff7fa7348cb44441, публикация12d478e:
39целевых тестов, реальные шесть магазинов/14посетителей, покупка850монет,
два мороженых/SQLite reload, разные камеры и полный Explorer были проверены.
Это не проверка будущей геометрии и не визуальное одобрение архитектуры.
Граф построения:1444meshes/1428geometries/373materials/6 496 049potential tris,
269 204 355attribute bytes — construction storage, не GPU residency/FPS.

После изменений: реальные walking/collision/airlock/storeys/return+autonomy,
private SQLite ownership, phone/desktop views, полные кадры/паузы/память,
Node22/full CI/live assets. Камеры описаны отдельным controls-camera стандартом.

## Static range submissions и материалы (2026-11-17)

Room-light/cutaway устанавливаются после batching. Эти два position-preserving
hooks могут сохранить exact static ranges через registerPositionPreservingShader,
связывающий реальные function/cache-key identities. Не отмечать wind/refraction/
displacement как static: unknown mutation по-прежнему nativefallback.
Room lighting раньше ЗАМЕНЯЛ older Mall reflection finish. Сохранять только
известный static wrapper (#undef USE_BATCHING), иначе дублируются uMallProbe и
reflection locals. Shared materials получают room hook один раз.
Native audit обязан проверять errors[] вместе с pixel equality: две одинаково
битые картинки тоже дают0difference. Reference failedV1 и исправленныйV2
сохранены в ветке codex/mall-submit-performance/QA2026-11-17/mall-static-submit.
