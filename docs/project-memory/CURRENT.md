# Текущий статус

20 ноября2026, Europe/Kyiv. Каноническая память — эта удалённая ветка;
её app старый, актуальные исходники брать из рабочей ветки ниже.

## Последняя подтверждённая публикация

**f28975bd8c2cf1cd7d94c61239ab8f98f7dbc96f**, workflow44755743721 SUCCESS:
test/deploy/pages, Worker release/sharedsaves, actual HTTP и одно приложение.
JS1b15b0b20e8732f762568abdb9a11e26d539ee316b2c662b4fe409edb2fa2032;
CSS1fd2857ef1fbaedd5e7a34a5082a77ff49bcf7f1c7030d5292502753b86967d0.
[Квитанция](../qa/2026-11-20/warehouse-facade-2_5x/live/live-verification.json).
Warehouse ×2,5 по ширине/высоте; глубина/центр прежние, подробный стеклянно-золотой
фасад. ТРЦ/SPA не изменялись. Новый фасад ещё не одобрен пользователем.

## Сейчас публикуется — 8 отмеченных скал и ширина воды

Фото пользователя f28975b: убрать все8конусов вокруг Warehouse и раздвинуть оба
берега. Исходник **c8a0000a020d236bc6a4f6dd28d6b7e3644cdab1**,
ветка codex/warehouse-open-water, worktree /workspace/chichi-v12-island-warehouse.
PR#10 merged обычным merge, без bypass. Main **7a0e1f3daf8afd0629d60d7a3cb0aa147b2a02f4**.
Workflow **44794849010 выполняется**: не считать опубликованным до test/deploy/pages
SUCCESS и actual HTTP receipt. PR-дубликат44794698913 отменён после merge;
старые PR-runs262/e370 отменены при обновлении ветки, не являются production proof.

Удалены8height mounds и72верхнихкамня.384коралла на тех же X/Z опущены на
реальныйровныйпол,60рыб сохранены. Внешний эллипс rz750→1100, плавный лимит
localZ=-350 защищает бесконечный жилой ряд; обход соседних островов и точное
объединение с прежним radial contour. Прежняя вода не сокращается.
Исходники Warehouse/Mall/SPA, их координаты/размеры/фасады прежние. Нет интерьера,
AI, покупки/балансы/saveformat не менялись. Реальный общий probe перебейкан:
afc536509c5b98ea660eb1a4baa3a608653168e3083dd6673ce7c82ad36c5b6e.
Общий shader/clock/field и reef binarycache прежние.

Найдены и исправлены связанные блокировки: swimmer, submarine, explorer restore,
кнопка управления И камера третьего лица ограничивали движение старым эллипсом.
Новый ocean-water-domain использует общую лагуну и сохраняет допустимый старый
эллипс для совместимости. Camera physical bed теперь actual expansionBedY.
Старый -198м save cutoff не включал новый глубокий пол: нижняя граница следует
реальному bedY-5. Native должен проверить held input, dive ниже-200м и2reload.

61focused Node22 checks PASS: production floor rays/все8sweep/реальные runtimekeys,
old3rocks/caves/purchases/camera/optics. Full Node22 build базового этапаPASS;
после depth/camera edits app/Worker rebuilt теми же функциями без изменения model
producers. Полный main CI проверит окончательную сборку. Desktop final native PASS:10views, realW sweep всех8объёмов, dive ниже-200м и
2privateSQLite reload с прежними coin/inventory/profilebalances. Phone PASS: real heldtouch/dive ниже-200м/2SQLite reload и product overview.
Baseline f289 capture в двух совпадающих ракурсах также PASS. GPU только один за раз.

QA [warehouse-open-water](../qa/2026-11-20/warehouse-open-water/README.md).
Промежуточный262 имел реальные10views, но heldinputFAIL выявил старую camera
границу; сохранён как superseded, не финальныйproof. Актуальные команды/логи:
/workspace/qa/warehouse-open-water-desktop-final.log; завершён; phone session98991 завершён.
Release monitor session31987, /workspace/qa/watch-warehouse-open-water-release.py.
Он требует финальные desktop+phone v12-native.json/movement.json и livehashes.
Expected bytes: /workspace/qa/warehouse-open-water-expected-production.json.
Не запускать повторныйdeploy, не ждать userapproval уже разрешённой публикации.

## Ограничения и сохранённое

407e427: старые reef-terrace-0/1/11 удалены, другие9скал прежние; grey underside
опущен12м, физический старый пол не тронут. b995: компактные3SVGкнопки с44px
областями и actualbbox Warehouse camera. Широкая выемка подходаSPA приостановлена
(codex/v12-spa-approach-visibility@18c1e57, PR#6 CLOSED безmerge). Не включать её.
Не трогать пользовательские сохранения/коины/риги. Диагностика только по запросу.
Нативный QA — private Worker/SQLite и software Chromium, без paidAI. Физический
Mac/iPhone FPS не измерялся. История перед этапом — history/CURRENT-before-open-water-release-2026-11-20.md.

Пользователь прислал M2/DPR2 FPSreport старого app1b15/f289:13.53FPS за22.1с,
8.2srenderstall, GPUmedian32.41ms,15.33Mtriangles. Это НЕ новыйрелиз.
Сохранены исходныйJSON/hash/анализ в QA/user-fps-f289; не обещать FPSулучшения.
