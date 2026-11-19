# Gardens/cascades checkpoint, 2026-11-19 — publication requested

Continue from this branch, not old49513c4. User explicitly asks to finish and
publish this checked improvement; do not end at a WIP acknowledgement.
16 raised planted beds Aroma/Cafe/VIP, richer existing Cabana planter contents,
2 real three-tier Aroma cascades with actual basins/weirs/sheets. Shared water
core and local room reflections; fixed 6 native foliage batches,184 flower
instances/736 leaves, total new136576 triangles. Original21 bathing contacts,
14room IDs/cat models/wallets/saves preserved. No new room or LLM.

4 previous physical V6 cases PASS. New tests: cascade geometry/receiving basins
and fixed buffers/budget PASS. Full public-to-station route assertion initially
found pre-existing49513c4 failure Aroma0, not a new bed regression. Exact
before/after diagnosis saved. Old tree planter69,252 blocked real bridge mouth;
moved only that planter into side garden. Remaining failure was grid shortcut
across bridge edge56.1,244.55→56.95,244.55. SPA-only A* now caches rejected
swept-body edges and re-plans (bounded24), instead of discarding entire route.
Global default SPA route outputs20fixtures unchanged PASS. Radius/collisions
and real walls remain. Aroma6,Cafe8,VIP8 andCabana0..3 public routes now pass;
remaining Cabana4 is being diagnosed. Initial Cafe origin was inside a chair,
corrected to actual public stair landing. Do not weaken path/body checks.

Next finish Cabana path, run relevant tests, commit exact source. Need actual
visual reference frames + refreshed offline room probes (old assets predate
late art), full required checks underNode22. Then PR/CI/main publication and
actual live SHA/assets verification; keep user updated and do not claim publish
until full successful workflow/site. Existing main39708e3 unchanged so far.
Do not repeatedly run unchanged old procedures; current changed routes need
real private game validation. Logs/PNG/bundle/source/checksum to be archived.

## Physical path corrections completed
Aroma6/Cafe8/VIP8/Cabana6 paths now PASS from actual public stair/atrium
landings, sweeping the unchanged radius along every segment. Fixed missing
public connection between Cabana crosswalks with actual2.6m east gangway/rails;
front private cabins retain rear glass walls. Cabana ring pots now hang from
real cornice arms above body height, same containers retained. Root A* uses
cached failed-edge replanning; default20 old route fixtures remain byte-identical.
Source cascade geometry and150k budget/fixed buffer tests PASS.
Next exactNode22build/fulltests, actual room probes rebake and native all14room/
procedures plus public Aroma0/Cabana4 outward/return/privateSQLite. Then full
workflow and live publication as explicitly requested. Do not stop at this WIP.

## Refreshed actual room capture complete
Fresh15 layers on clean sourceca0813f3ec71232b427f4d98667a0e3fb153ad57,
302059PNGbytes, rawSHA256da49c948fe3bfaa711f85a1fc0cf05aa5f511949554ddfd9e4bdd350312eaf9c.
All actual static gardens/furniture/floors/galaxy included; all water masked.
Full exactsource/bundle/PNG/data/log archived in spa-v6-gardens-probes/native.
After capture corrected ONLY MASKED waterfall UV direction (downstream), and
ballistic sheet curvature; static visible contents unchanged, no fake producer
SHA updates. New actual final native will verify flowing water and fresharray.
Old immutable capture/proof assets retained. Tests read new provenance manifest.
