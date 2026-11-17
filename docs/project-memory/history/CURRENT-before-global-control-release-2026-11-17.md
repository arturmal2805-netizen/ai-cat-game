## Текущая WIP-работа после третьего отчёта

/workspace/chichi-ocean-cache-trace, codex/ocean-cache-trace, база0b38098.
Код отправлен в main e25f6ffd3ab4cab2d3595a337573699bbaa4d3c2.
CI44134464517 запущен, ещё НЕ подтверждённый live-релиз.
https://github.com/arturmal2805-netizen/ai-cat-game/actions/runs/44134464517
Ожидаемые JS89f628b72c238b0390dc38ef142b98511d6efc2eb390d0980554f40839185856,
CSSd02068257c7b2b00ecdb80590c8a6bc5003849788f1400e69b6a6d6d91fb4356.
Verifier /tmp/verify-chichi-global-release.py →
/workspace/qa/chichi-global-publication/live-verification.json.
Не править public в source worktree пока verifier сравнивает immutable assets.
[Exact source/QA](https://github.com/arturmal2805-netizen/ai-cat-game/blob/e25f6ffd3ab4cab2d3595a337573699bbaa4d3c2/docs/qa/2026-11-17/cache-and-global-control/manifest.json).
Не запускать второй push main до окончания CI. Thirdreport JSdbe/0b подтверждён: GPU18.36ms,
FPS20.43 из300frames/14.633sec сgap5900.1ms,1%low0.4;153rapidrefaults58.7MB.
6secgap отсутствует вrecordedLongTask608ms/GPUMax223ms, причинностьcache не доказана.
Stationarytrace не воспроизводилrefault; новый submission-only camera-cycle
trace воспроизвёл1053returns527.8MB, преимущественно этажиMall. GPUdrawsтолько
вЭТОМQA подавлены, realuploads/shaders остаются; этоНЕFPS/nativepixelproof.

КандидатexactFloat32RGBdictionary152bakedMallgeometries:41.43MBcolour →
6.9MBUint16indices+64KiBFloat32table,34.46MBnetGPUэкономия, vertices/normal/UV/
index/colours32bits неизменны. Defaultdata coloursсохраненыCPU; толькоbakedfloor
holders, неcats/rigs/morphs/instancing/sharedunsupportedmaterials. Unitбитовая
точность+rayfaces+nativeStaticdispatch PASS. NativeV3 fullgame/DPR2interior/
overview/phone:0changedRGBA/0errors, buffers−30.9–34.47MB. V1/V2toggleQAбыли
биты: ThreegetProgram сохраняетОДИНuniformsetнаmaterial при возвратеcached
program. QA-модовое переключение теперьdispose-materialcache/recompile, не
трогаетcatmaterials. Defaultproduction ничего не переключаеткаждыйкадр.

Пользователь ДОБАВИЛ вэтотрелиз: видимаякнопка «Управлять Чичи» и ходьбаот3лица
ВЕЗДЕ, включаяобычныеострова. Уточнениеявно подтверждено пользователем.
Новыеchichi-manual.js/worldintegration иsubmarine.controlChichi вработе:
обычнаяходьбаизреальногоposition,существующиеwater/Mallowners, однаmodel,
WASD/dragcamera, compacttouch44px, desktopбезdirectionpad, world/islandrelease,
bridge-locationvalidationтолькоChichiсlegacyshorefallback. Sharedmergeнеизменён.
Node22 full build PASS; 50 targeted tests PASS; final 30 tests after cleanup PASS.
Native V7: real keyboard entry/movement, desktop no direction pad, real held
phone touch44px, Island/World release, private SQLite position/balances/items
reload PASS. Ordinary rest is unchanged. New land controller is not persisted:
reload returns the same real cat to autonomous life. Native ownership audit
recovered Mega Loops, re-placed for zero charge, retained one copy after TWO
SQLite reloads PASS. No shared-world merge changes. Final direct-button water/Mall
entry audits both PASS (exit/swim/dive/rise/reboard; Mall release/resume/walk); do not mark this WIP published until CI+HTTP receipts.
Final source e25f6ffd3ab4cab2d3595a337573699bbaa4d3c2 on main and codex/ocean-cache-trace.
QA: docs/qa/2026-11-17/cache-and-global-control; local native-v7, palette-v3,
chichi-global-ownership, final button-water/button-mall in /workspace/qa.

## Текущий подтверждённый релиз

**0b38098a32e338a89b88efd784b184e9ac72c3f3** — main и работающий сайт.
Полный Node22 CI44104460487 SUCCESS: test/deploy/pages, включая release/server/
shared-save verification; paidAI не запускался.
https://github.com/arturmal2805-netizen/ai-cat-game/actions/runs/44104460487
Фактический HTTP2026-11-17T14:47:11UTC: одно подключение приложения,
JS **dbe5f20f39f2f67ab258a143614fba517f1588f0dd839d590b3fc90d5dfd71d9**,
CSS **c14ce8408f8f3aed7a5e7991eca39663fe55377343421ff62e0600ada4c048ef**.
Wavefield/all9reflectionPNG/reef.gz совпали с immutablebuild, а не толькоURLv.
[Workflow/live receipts](../qa/2026-11-17/mall-submit-publication/live-verification.json).
Игра https://arturmal2805-netizen.github.io/ai-cat-game/?v=0b38098
Одноразовая диагностика https://arturmal2805-netizen.github.io/ai-cat-game/?v=0b38098&profile=1

