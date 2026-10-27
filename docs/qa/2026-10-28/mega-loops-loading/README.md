# Finished Mega Loops must leave the construction placeholder

The player reported a finished Mega Loops still covered by the flat building
proxy, including after moving it. The passive preparation gate required a
camera distance at most 520 and a nearby look target. The attraction-camera
button in turn rejected the unprepared model, stranding finished purchases.

Finished/live construction transitions and built objects placed from the bag
now request preparation independently of that proximity gate. A cold saved
model can be requested by its card, inspection or manual ride; inspection uses
the real catalogue footprint/height until the exact full model is available.
The latest offline-completed paid complex receives one bounded startup request.
Passive work still retains visibility, selected-island, gesture and single
pending-task guards. No wholesale overview preparation or graphical reduction.

Geometry and shader warmup share one completion promise. Chichi/resident ride
requests wait for that promise instead of attempting to use the building
proxy. Resident cancellation invalidates pending requests and preserves leisure
tickets. The item card distinguishes actual construction from preparing a
finished attraction. Purchases, prices, balances, deadlines, approved models,
rendering quality, DPR and the sculpt cache key are unchanged.

Validation:

- 22 atoll, construction-crew and resident-play tests passed; production build
  passed. The streaming regression checks a requested object at distance 1500
  while retaining offscreen/gesture/concurrency restrictions.
- Real phone Chromium/SwiftShader + private Worker SQLite: a Mega Loops
  construction transition at camera distance 900 prepares the full real model;
  the camera accepts a finished cold model before preparation. Main/resident
  manual requests also prepare a cold Mega Loops and reserve two actual riders.
- Actual phone storage/bag/build form restores a new placement with readyAt=0,
  no second payment and a working ride route at distance 900. No browser/HTTP
  errors or lost WebGL context. Store-time accrued income remains legitimate;
  the no-payment comparison starts after storing, before re-placement.
- This is a functional loading test, not a physical Mac/iPhone FPS benchmark.
  The approved cache remains sculpt-v2-a496203fa13a037a7a10a927.
