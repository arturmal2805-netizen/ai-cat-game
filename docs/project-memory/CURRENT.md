# Текущий статус — единственная очередь

Обновлено 2026-11-17. Пользователь требует скорее опубликовать ВОДУ.
Отдельный ближайший релиз: общее ядро на стабильной географии12d478e.
Экспериментальное расширение/новое дно/дополнительные512кораллов и64камня
оставлены отдельным WIP. Ничего не потеряно и не сброшено.

## Что опубликовано

`12d478e82e8e5a2bd6ef3ec0cbb151ea1e473d1d`, main и фактический сайт:
https://arturmal2805-netizen.github.io/ai-cat-game/
JS `507539ea7920b0489284d8572aef4481c8506e1d643a24a8becda9d79b7a8ca5`,
CSS `c14ce8408f8f3aed7a5e7991eca39663fe55377343421ff62e0600ada4c048ef`.
Workflow43807080956 success. [Повторная проверка17ноября](../qa/2026-11-17/shared-water-core/live-stable-recheck.json):
байты совпали, в HTML ровно одно подключение приложения. Новый WIP НЕ live.

Слияние12d: water source `4ec37371e6b71a03050d4e2a14e8b8fbdc9ae6b3`,
release metadata `939b328304d4807506849a9fbeb866ea9f40703c` поверх4ec.
ТРЦ уже содержал4ec. Конфликт только JS URL edb0a1411d337a38 против507539…;
сохранён настоящий507539… с обоими этапами. CSS не конфликтовал.
939 CI43804714136 success. Нет незавершённого merge/индекса/маркеров.
[Происхождение/точный diff](../qa/2026-11-16/project-memory/merge-12d478e-audit.json).

## Приоритет и активные деревья

1. **Релиз воды сейчас**: `/workspace/chichi-water-release`, ветка
   `codex/shared-water-release`, база12d. Только shared-water files из4dc,
   корректная linear-radiance/4 цепочка, волны, прозрачность и подводная оптика.
   Никаких новых рифов/покупок/смены размеров мира. Настоящие9rebakes+Node22build
   уже запущены: `/workspace/qa/shared-water-release-check.log/.exit`.
   Далее targeted tests, native visibility, одинаковые океанические камеры,
   реальный Explorer/private SQLite, полный npm test, CI/deploy и live hashes.
   Запущенное не считать завершённым; читать результат файлов.
2. После водного релиза — дно/низкие экосистемы, затем бюджет и реальный объём
   расширения океана, затем детализация ТРЦ. Не задерживать воду всем контентом.
3. Телефон/Mac hardware пока НЕ измерены; SwiftShader не выдавать за их FPS.

WIP расширения: `/workspace/chichi-shared-water`, `codex/shared-water-core`;
каноническая память дублируется в `codex/ocean-recovery-memory`.
Контроль core4dc: `/workspace/chichi-water-core-control` (чистый4dc).
Предыдущие `/workspace/chichi-ocean-expansion` и все исходные деревья сохранены.
`/workspace/ai-cat-game` — оригинальный незакоммиченный WIP, не сбрасывать.

## Общее ядро уже реализовано — не начинать заново

Проверенный runtime checkpoint `4dc98387b9d87ca80ecc4ae7df8b39a79cc25a24`.
`water-field.js` — один prepared1024² Texture для всех поверхностей/подводных
материалов; `water-core.js` — общий sampling2/Fresnel/GGX/medium/macro waves.
Wrappers задают физические размеры/глубину/течение/probe. Один source и startup
prepare, без realtime reflections и перекачки буферов. Реальные9bakes, единый
linear/ACES. Исторический128² d6 generator сохранён как fallback/контроль.
Crimson Desert — целевой вид ВСЕЙ карты; горки только ранний прототип, d6fa805
историческая техническая база. См.[стандарт воды](standards/water.md).

Core4dc прошёл полный CI44046315766: Node22 build, весь npm test, Wrangler
 dry-run success; deploy/pages skipped. [Workflow](../qa/2026-11-17/shared-water-core/ci-4dc9838.json).
29targeted, native visibility .785 desktop/phone против opaque .035.
18биомов×2версии прошли; primary1024² field один во всех найденных материалах.
68горок×2версии, normal/phone/flow/outlet/basin; кандидат ещё grazing/rider,
204static-pixel comparison (normal/grazing/phone) —0различий.
[Полные отчёты/bundles/ограничения](../qa/2026-11-17/shared-water-core/).
Whole-attraction baseline grazing PNG для всех68 пока отсутствует (есть basin
 grazing close-up); исправлен будущий capture. Не приписывать старому прогону
 новые кадры. Эти проверки относятся к4dc, не автоматически к новому релизу.

Одинаковые local eye/direction/up и light/shadow envelope теперь проверены
для7океанических видов; максимум погрешности направления~5.7e-14.
Первый QA запуск ошибся обращением к module-local waterPoint; ошибка сохранена,
явный window getter исправлен, отдельный v2 прошёл. [Кадры/asset bytes](../qa/2026-11-17/shared-water-core/stable-fixed-camera/summary.json).
Вид ещё далёк от Crimson Desert; CI не является пользовательским одобрением.

## Почему экспериментальное дно не входит в ближайший релиз

Выемка перед ТРЦ выравнивает все378проверенных точек до-190м, убирая relief.
Песок без normal/roughness, редкие островки растений и плоские скалы отклонены.
Не исправлять это только цветом; будущий relief вырезать НИЖЕ прежнего
безопасного потолка, сохранив весь проход корпуса/physics и ownership.
[Диагноз](../qa/2026-11-17/shared-water-core/forecourt-floor-diagnosis.json).

У4dc forecourt15.74M против стабильных2.78M треугольников — неприемлемый бюджет.
Новая WIP-правка камней: real garden LOD anchors, исходные Float32 instance rows,
все geometry/index buffers и сортировочные сферы сохранены. Дальний общий
batch3 сохранён, shadow casters не отключались. 6CPU tests passed;
9native colour/shadow tests at equal LOD —0различий (включая DPR2).
Первый split изменил1пиксель из-за sorting sphere — исправлен, порог не ослаблен.
V2 давал+90draws вдалеке; v3 оставляет прежние far draws/triangles.
В полной сцене forecourt15.84M→8.62M,300→390draws; underwater/phone unchanged.
Это улучшение WIP, но НЕ принятие бюджета/качества и НЕ доказательство FPS.
[Точные доказательства](../qa/2026-11-17/shared-water-core/benthic-rock-spatial-ocean-v3/).

## Независимое восстановление

R9: [скачать60 499 125байт](https://raw.githubusercontent.com/arturmal2805-netizen/ai-cat-game/501757e09370116b942248e392c6461211cb5632/backups/chichi-shared-water-wip-2026-11-17-r9.tar.gz),
SHA256 `aaaa3d9c257258a6dbc98a65271806d8a4805ea3d710d3830ddb1bff690d8af0`.
Архив13деревьев включает4dc и WIP camera harness; все13восстановлены в новом
clone: точные HEAD/cached patches/status/bytes. Удалённые60MB повторно скачаны
и hash совпал. Базаc9a2ac7 обязательна, это не полная Git-история.
Последующие code/QA/чистые контрольные деревья сохранены в Git отдельно, не
выдавать R9 за снимок ещё не существовавшего нового release.
[Restore/remote receipt](../qa/2026-11-17/shared-water-core/backup-r9-remote-verification.json).

Канонический индекс: https://github.com/arturmal2805-netizen/ai-cat-game/blob/codex/ocean-recovery-memory/docs/project-memory/README.md
