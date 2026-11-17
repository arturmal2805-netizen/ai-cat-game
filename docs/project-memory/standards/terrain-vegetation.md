# Грунт и растительность

**Ground037 — кандидат**, не одобрение всей растительности. Пользователь
требует низкие плотные куртины с просветами и тропами, подробные изогнутые
травинки близко, дешёвые группы вдали без резких переходов. Крупным листьям
нужны изгиб, контур, центральная жилка и разные положения. Котик неизменен.
Сезонная оливковая заливка и редкие одиночные пучки отклонены.

## Источники и каналы

- [Ground037](../../assets/meadow-ground037.md): ambientCG CC0-1.0, mirror
  TokisanGames/Terrain3D. Это почва/сор/редкие сорняки, а не дернина.
  [Immutable Git blobs/SHA256](../../assets/meadow-ground037-source.json).
  RGB color sRGB, A=height, НЕ opacity. Packed OpenGL normal RGB/roughness A —
  linear. Не брать roughness из normal B и не переворачивать G дважды.
- [Grass004](../../assets/meadow-grass004.md): ambientCG CC0, mirror Project
  Chrono, лицензия/source USDA сохранены. [Хеши](../../assets/meadow-grass004-source.json).
  Color sRGB; NormalGL/roughness linear. Rows flip один раз при decode,
  Texture.flipY=false. `python3 scripts/pack-meadow-turf.py` пакует normal RGB
  и roughness A: [входы/выход](../../assets/meadow-turf-packed.json).
  Оригинальные JPEG — docs/assets/meadow-originals/.

## Архитектура, единицы, воспроизведение

`meadow-patch.js` — prepared карты/mask/shader;
`meadow-surface.js`, `meadow-leaves.js` — объём/лист;
`meadow-coast-field.js` — общий soil/grass mask, берег/тропы/исключения;
`meadow-coast-surface.js` — cap без изменения пола/отверстий;
`meadow-coast-grass.js`, `meadow-cell-cache.js` — bounded streaming.
Повтор2.5м, normal strength.28, anisotropy4, trilinear mipmaps.

Исторический patch x275,z-25,rx27,rz23 относится к прежней геометрии:
после расширения это может быть вода. Выбирать настоящий сухой участок;
не двигать пользовательские покупки ради теста. Новые целевые shore-тесты
используют x367/368,z-25. Общий mask должен управлять и цветом, и размещением.
192 resident cells, максимум2 pending; фиксированные buffers, воспроизводимые
hash/placements, bounded caches/eviction, abort/late tasks безопасны.

`BufferGeometry.copy` разделяет userData: перед ownership change метаданные
отделять. Сохранять проходы, footprints, читаемость кота, native DPR/тени.
Генератор нового декоративного поля не означает визуального одобрения.

[Авторинг](../../art/meadow-patch-2026-11-16.md),
[технически проверенный этап](https://github.com/arturmal2805-netizen/ai-cat-game/blob/f5f89c75513c416d6713715b1ae0d568270fab20/docs/qa/2026-11-16/meadow.md),
[native/source/build/PNG hashes](https://github.com/arturmal2805-netizen/ai-cat-game/blob/f5f89c75513c416d6713715b1ae0d568270fab20/docs/qa/2026-11-16/meadow-native-summary.json).
Публикация d17001cdcec031e882f89cdf19ab8b540e7a481e технически проверена;
это не новое одобрение всей травы. Последний статус — CURRENT.

Проверять один участок в трёх состояниях: прежний материал → новый → с травой.
Близко, обычная игра, средне и широко; движение/LOD/мерцание/повторяемость.
close и close-hud — одна камера, не два ракурса. Старый PNG не подтверждает v2.
Relevant meadow/ownership/camera tests, actual native coast coverage/eviction/
reload, Node22/full CI. Полный frame time/хвосты/память при равных настройках;
не объявлять весь остров готовым по одному close-up или среднему FPS.

## Подводный риф (уточнение пользователя 2026-11-17)

Crimson Desert — ориентир также для плотности/разнообразия кораллов: ветви,
веера, губки/трубки, низкие обрастающие формы, морская трава и песчаные просветы.
Редкие отдельные пучки и пустая синяя плоскость отклонены. Дно должно иметь
правильный метрический материал и объём, не один удачный крупный план.
Малый кандидат проверять close/normal/wide/phone и в настоящей игре с Чичи,
до распространения на всю карту. Не смешивать с незавершённым расширением.
