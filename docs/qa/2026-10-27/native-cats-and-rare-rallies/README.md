# Player-verified native cat draws, bounded cold eviction, rare rallies

## Physical reports supplied by the player

The two attached reports are retained in full (no player records or keys):

| Scene / renderer | FPS | frame gap p95 / max | CPU median | render median | drawing buffer |
| --- | ---: | ---: | ---: | ---: | --- |
| Job City / Safari Apple GPU | 44.11 | 29 / 144 ms | 2 ms | 17 ms | 2452 x 1226 |
| Built homestead / Chrome Metal M2 | 42.61 | 33.7 / 83.4 ms | 1.2 ms | 12.1 ms | 2804 x 1384 |

Both are the released `b50008f357899598` app with explicit individual cat
rendering, DPR 2, 64 NPCs and an intact diagnostic pause. The Chrome report's
elapsed GPU render span has median 12 ms / p95 18.6 ms, not GPU utilization.
Safari does not expose this timer. The scenes, visible cats and browsers differ;
these are not a controlled ratio against the earlier failing Job City reports.
The player explicitly reports the result is good and asks to keep improving.
They do **not** establish stable 60 FPS or zero frame gaps.

The report windows still contain 451 / 641 policy evictions and 81.9 / 97.5 MB
of refaulted geometry respectively. These counters describe resource churn,
not proof that every frame delay is caused by it. The `SinceReset` counters
cover a longer interval than the last 300 rendered samples. The last Chrome
frame also has four pending shader preparations.

An immutable source reference is saved remotely as
`baseline/player-verified-native-cats-20261027` at `edd3edf`; reproducing that
runtime requires its original `profile=1&catDraw=native` query. The earlier
approved smooth-world and capybara references remain unchanged.

## Separate changes

1. Ordinary play now selects the already approved individual cat renderer.
   Sharing remains explicit `profile=1&catDraw=shared` diagnostic comparison.
   Native uniform palettes, Chichi's renderer, original meshes, poses, materials
   and picking are unchanged. A lower call count alone no longer selects the
   problematic shared path.
2. In individual mode, do not construct unused colony BatchedMeshes or compile
   their shaders. Do not fill/upload shared pose texture rows that no rendered
   cat consumes. Retain living cat and joint slot registrations and native
   palette updates. This is independently checked with exact frozen images.
3. Under temporary memory overflow, trim cold idle scenery before protected
   buffers that recently returned to the camera. Only if cold reclamation
   cannot satisfy the existing allowance can a pressure pass retire protected
   idle geometry. Both passes share the original 2 ms budget. No memory limits,
   current-frame precedence, shared-owner safety or graphical data change.

No model, water, grass, coral, shadow, pixel ratio, animation, navigation or
save durability was reduced. Construction cache version is still
`sculpt-v2-a496203fa13a037a7a10a927`.

## Rare trading rallies

Newly opened weekly trades have a deterministic 5% local chance of a coin
rising 8–25x along its saved 65-point animated path. The rise starts 20–40%
through the trade and is shown in the live position/history only after then.
The UI reports the actual observed/exit multiplier, never a future target.
Winning LONG profits use ordinary margin, leverage and fees. SHORT positions
can liquidate at their first crossing; the loss is limited to escrow.

Events use no new inference, timers, live exchange feed or per-tick rerolls.
Existing open/legacy paths are never regenerated. Event metadata and all
prices persist with the original attempt; corrupt metadata selects a verified
save backup. Reloads, lost acknowledgements and concurrent settlement cannot
pay twice. Private cat coins and the player's wallet remain separate.

The deterministic distribution check finds 1,033 rallies out of 20,000 IDs
(5.165%) and all 18 integer multipliers. Accounting tests cover a substantial
profit, short liquidation, ten winning-result reloads, concurrent identical
settlements, corrupted backup recovery and every one of 148 eligible cat
profiles with mocked forecasts. The seven-day schedule is unchanged.

## Validation

Full local suite: **740 passed, zero failures**. Separate target checks cover
the actual cold-overflow regression, draw policy, unused preparation and pose
slot disposal. All browser tests use private local SQLite and mocked forecasts;
no live player save or paid inference is used.

The real private WebKit application places six approved cats in six distinct
crypto workplaces, opens the actual office interior, and runs one mocked
45-second forecast. A 17x coin rally changes the trader's wallet from 5,000 to
29,092 coins (24,092 PNL). Three actual app reloads preserve the same receipt,
wallet and event with one forecast, zero paid calls and zero active-document
or navigation errors. Phone dialog content width and scroll width both equal
350 CSS pixels. The live name dropdown shows 📈 only for the open trader,
keeps it when selecting another cat and removes it on settlement. Screen-reader
labels identify the open position. This is the existing personal-coins dropdown,
not a map badge or a new menu.

All **17 runtime islands** pass the native-RAF orbit/zoom audit (21 samples
including returns) in a private phone WebKit stress world with 64 mobile NPCs,
embedded staff, 8 homes, 4 large slides and 16 businesses, at original DPR 2.
All 17 frozen native frames are byte-identical with/without unused pose
preparation, with equal calls/triangles and preserved registrations. In this
fixture the homestead omits 180,224 pose bytes and Job City 98,304 pose bytes
in the captured update. These are logical dirty-row bytes, not a measured bus
bandwidth saving. No colony batches are prepared. All 17 buffer-retirement
return frames are also byte-identical, with living cat/pose slot totals intact.
There are zero browser JS/HTTP errors and no context losses.

The separate actual-WebGL cold-overflow comparison against `edd3edf` repeats
ten returning-camera cases: 8,400 bytes / 40 bufferData calls become zero
return uploads, with zero changed pixel bytes in either path and the same
bounded budget after pressure. This is a tiny isolated resource fixture, not
a claim that all physical refaults or frame delays are eliminated.

The approved native Chichi skinning probe has four same-pose colour/shadow
comparisons with zero changed bytes and identical triangles/calls.
Accompanying JSON records the exact checks. Publication proof follows separately. Linux WebKit/SwiftShader numbers
are diagnostic timings, never claims of physical MacBook/iPhone FPS. A fresh
physical report after publication is needed to measure progress toward 60 FPS.

Final targeted checks: **36 passed, zero failures**. Production bundle SHA-256:
`dd8a71705ddfa88fcdc9f27fb71049238a2071e03d46bbc4a26b3d0a25b206c5`. Private QA globals are absent.
