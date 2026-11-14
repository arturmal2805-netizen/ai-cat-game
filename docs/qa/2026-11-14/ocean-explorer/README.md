# Native submarine exit and Mall explorer audit — 2026-11-14

The existing game runs in Chromium/SwiftShader at DPR 2 with a private local workerd/SQLite world. No production player data or paid inference is used. The full explorer audit passed on the candidate; see explorer-results.json and actual game screenshots.

Verified in the actual runtime with keyboard and phone buttons: underwater exit; first-person swimming, forward/back and vertical movement; reboarding the real nearby submarine; reload while swimming; World/Island buttons releasing the forced camera; automatic return without camera theft; sequential physical pressure-airlock entry into the existing Mall; dry first-person walking; floor-one reload; the real 27-metre escalator to floor two; floor-two reload and automatic descent/airlock exit/swim back to the pier. Original coins, inventory and placements match the initial fixture. Browser and HTTP error arrays are empty.

QA accelerates isolated simulation steps, yielding to the same cooperative navigation preparation. It pauses GPU submissions between actual captures to avoid overloading the software renderer; production has no pause controls or new render loop. These checks do not establish physical-device FPS.

The airlock's dynamic doors are outside static obstacle collection. Ordinary walking/shop navigation reserves the pressure chamber; only the sequential transit moves through its actual opening. Doors never open together. A reload during transit restores the last safe approach point with closed doors. Swimming and Mall positions use the existing submarine save field with optional explorerVersion=1; explicit explorer:null distinguishes completion from a cached client's unknown-field omission. Wallets, professions, ownership and save IDs are unchanged.

A native test caught the return route crossing the upper escalator's side handrail. Return now goes around the real handrail end before entering the ramp. The actual-model regression covers both sides on all six storey transitions. Another combined test caught a previous trip's automatic-return flag leaking into a new trip; boarding and underwater exit now clear it. Releasing the camera during underwater reboarding finishes boarding and navigates home, rather than interpolating straight through the world.

Node 22 checks: full suite 1020 passed; final runtime/boat regression 18 passed; shared-save/ownership group 26 passed; actual Mall navigation regression 5 passed. Node 22 build and Worker dry-run passed. Native phone/SQLite ownership integration also passed: Mega Loops was recovered from purchase proof, re-placed fully built for zero charge, its actual model prepared, and two reloads retained exactly one copy with unchanged wallet. See ownership.json.

Run:
```
CHICHI_PLAYWRIGHT_MODULE=/opt/codex/runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright CHICHI_CHROMIUM=/usr/bin/chromium CHICHI_MALL_AUDIT=1 CHICHI_EXPLORER_AUDIT=1 node scripts/check-mosasaur.cjs
```

The historical WIP was not recovered. This uses the released native models, current physics/collision, navigation, camera and saving systems. Vacations, broader water/Mall art and proven ocean performance improvements remain separate work.
