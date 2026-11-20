# Текущий статус

20 ноября 2026, Europe/Kyiv. Каноническая память — codex/ocean-recovery-memory.
Старое приложение этой ветки не является текущей игрой. Предыдущий CURRENT:
[история перед исправлением зависаний](history/CURRENT-before-stall-loading-publication-2026-11-20.md).

## Исправление зависаний: main готов, публикация проверяется

Source **b9f681aadb42f7d89914fcc57da8b17f70605055**, ветка
codex/ocean-stall-loading-fix, /workspace/chichi-v12-island-warehouse.
PR #11 merged обычным merge. Main **6ccec70440b551ff6c3c06a98945ff7d5d168db0**,
дерево идентично source: ccb1e5780f8d753a322efd25e988b7f3d5f8f735ab.
[Workflow 44804905460](https://github.com/arturmal2805-netizen/ai-cat-game/actions/runs/44804905460):
полный test/build/dry-run PASS, deploy/pages ещё проверяются. Это пока НЕ
подтверждение обновления live. Последний подтверждённый live —
7a0e1f3daf8afd0629d60d7a3cb0aa147b2a02f4, workflow 44794849010.

В native baseline trace найдено 16661.90мс вычисления geometry bounding spheres
внутри renderer/projectObject на четырёх одинаковых ракурсах. Теперь точная
статическая sphere готовится порциями до показа root; Float16 читается точно
через lookup, нормализованные/custom getters остаются native. Частичные bounds
не публикуются; mutation/morph/custom/cancellation guards проверены.
Final b9 trace: 97.41мс этого же lazy renderer path, 7128.13мс кооперативной
подготовки. Это CPU-диагностика Chromium/SwiftShader, НЕ прирост FPS на M2.
Промежуточный 935a375 переносил работу, но подготовка занимала 17867.10мс;
он заменён финальным b9, никогда не объявлять его финальным опубликованным.

Хешированные same-origin art/model GET используют native force-cache для
повторного использования устаревшей HTTP cache записи. Нет service worker/новой
БД; API/code/явный cache/AbortSignal сохраняют поведение. Реальный Chromium
expiry fixture: один asset request за три загрузки приложения с разными URL;
API и explicit reload по-прежнему идут в сеть. Первая cold загрузка остаётся
зависимой от сети; таймауты не сокращены и не увеличены.

Геометрия/материалы/вода/DPR/тени/котики/сохранения не изменены. Все 9 probe PNG
после реального rebake совпали побайтно; изменились только producer revisions.
Lossless WebP экономил лишь 4–6% и отклонён. Final4view capture: 453 public
modules exactsource, без JS/HTTP/GL ошибок; Warehouse-front/open-water-gap
пиксели идентичны baseline. Два других ракурса имеют очень малые различия
анимированных объектов; исходные PNG/profile сохранены.

Проверено: 35 focused regression до финальной оптимизации чтения, затем 11
focused bounds/cache/warmup tests на final b9; полный main CI test PASS.
Native DPR2: 19 островов + 2 возврата с реальным mouse orbit/zoom PASS.
Телефон 390×844/coarse/DPR2, held touch/deep dive/2 private SQLite reload —
ещё выполняется. Один GPU job за раз. Неверный ранний QA mode visual-idle
остановился на удалённой кнопке data-profile-pause; это superseded QA-fixture
ошибка, НЕ production regression. Финальный all-map запуск правильный.

[QA и точные источники](../qa/2026-11-20/render-stall-loading/README.md).
Ожидаемые production hashes: JS
0e305ce4212c504f7e2b40fb9dff8d55f093b70a136e5cb809c8b708f12fac0c;
CSS 1fd2857ef1fbaedd5e7a34a5082a77ff49bcf7f1c7030d5292502753b86967d0;
HTML 27d48bbe9ad72f2b7dd19b00ec008b29a620c6e8b32e1642fa11812c3cd96444.
Live verifier должен подтвердить реальные bytes и одно подключение приложения.
Monitor /workspace/qa/watch-stall-loading-release.py, receipt
/workspace/qa/stall-loading-live/live-verification.json. Затем обновить этот
CURRENT, завершить телефон/архив и remote memory verification. Публикация
разрешена пользователем; художественного одобрения/FPS обещаний не делать.

## Завершённое изменение по последнему фото

Удалены ВСЕ8отмеченных поднятых участков вокруг Warehouse и72камня на вершинах.
384коралла с прежними ID/X/Z сидят на реальномровномдне,60рыб сохранены.
Конусы убраны из physical bed и водной optical depth, без ghost contacts.
Общая лагуна расширена в обе стороны: rz750→1100, исходный берег объединён с
новым без срезания прежней воды. Плавный localZ>=-350 защищает жилой ряд;
контур обходит соседние острова. Площадь воды4.539→5.848км². При X2200 ширина
1.267→1.712км: +158м севернее и+286м южнее. [Измерения](../qa/2026-11-20/warehouse-open-water/measurements.json).
Warehouse, ТРЦ и SPA — прежние исходники/координаты/размеры/фасады/комнаты;
интерьер/магазины/экономика/форматsaveне добавлялись. Shared water/material/clock
прежние; фактический coast probe перебейкан после изменения геометрии.

Старая малая ellipse мешала swimmer/submarine, ручной кнопке, камере и restore.
Новый ocean-water-domain использует реальную общую лагуну, сохраняя прежде
допустимый эллипс для старых позиций. Camera floor следует expansionBedY.
Save cutoff -198м заменён реальным минимальным bedY-5: корректное плавание
у глубокого дна теперь переживает reload. Это поддержка разрешённого движения,
не изменение покупок/балансов.

61focused Node22 checks PASS; полный main build/test PASS. Native desktop:
10views, реальные heldkeys через все8объёмов, dive ниже-200м,2SQLite reload.
Native phone390×844/coarse/DPR2: полный product overview/кадрирование, реальные
heldtouch через8объёмов, dive и2reload. Coin/inventory/placements/profilebalances
прежние. Дополнительно CHICHI_OWNERSHIP_AUDIT phone PASS:paid recovery/re-place
безcharge/deadline, realmodel и2reload/exactlyonecopy. Все451publicmodules каждого finalcapture совпали с source.
Baseline сравнение и точные исходники/bundles/camera/PNG/запуски сохранены в
[QA](../qa/2026-11-20/warehouse-open-water/README.md).

Source **c8a0000a020d236bc6a4f6dd28d6b7e3644cdab1**, PR#10 merged обычным merge.
Ветка codex/warehouse-open-water, worktree /workspace/chichi-v12-island-warehouse.
Tree исходника совпадает с опубликованным main. PR-дубли отменены после обновления/
merge; они не production proof. Промежуточный262 сохранён как superseded:
картинки были корректны, реальное inputиспытание выявило старую camera границу.
Окончательные Native PASS относятся к c8a0000, а не к этому промежуточному bundle.

Художественное одобрение этого выпуска пользователем ещё не получено.
Получен реальный пользовательский M2/DPR2 report именно нового app1f35/7a:
24.64FPS за12.133с, GPUmedian12.8мс, recentgap3.066с и rendererstall3.512с
за reset-session; gapSinceStart8.5с. Загрузкидо22.94с. Прежний f289 report:
13.53FPS/GPU32.41мс/15.33Mtriangles, новый lastframe2.386Mtriangles/380calls.
Камера неизвестна, кадры существенно разные: НЕ заявлять82%ускорениякода.
[Новый отчёт/сравнение](../qa/2026-11-20/warehouse-open-water/user-fps-7a0e1f3/analysis.md).
Сохраняются две проблемы: длительные rendererstalls и медленные coldresources.
Исторический статус до CPU-профиля: точная причина ещё не была установлена; источник meadowgrass содержит15сabortdeadline,
совпадающий с длительностью двухзапросов, но status/trace отчёт не содержит.
Разбор отчёта завершён; код/качество/FPSдиагностика не менялись.

## Сохранённые предыдущие этапы

f28975b: Warehouse ×2,5 по ширине/высоте относительно b995, глубина/центр прежние,
подробный стеклянно-золотой фасад. b995: компактные3SVGvenuebuttons/44px и camera.
407e427: старые reef-terrace-0/1/11 удалены, остальные9скал прежние; декоративная
grey underside опущена12м под прежнее дно. Не возвращать удалённое каменье.
Широкая выемка подходаSPA приостановлена: codex/v12-spa-approach-visibility@18c1e57,
PR#6 CLOSED безmerge; не включать её в другие задачи. Старые исходные worktrees
и архивы сохранены. Диагностика только по запросу, QA толькоprivateWorker/SQLite.

