# Diamond mine and builder boost

The existing business shop contains **Алмазная шахта Мур-копа** at level 4,
2,200 coins, 20 minutes to build, with a 4×4 footprint. A permanent small
approved cat mines translucent purple crystals. The rock/timber scenery is
batched, crystals are one shared instanced draw, and the miner uses the normal
NPC animation rig. No lights, transmission pass, or new cat design is required.

The mine uses the existing income badges, business menu, eight-hour register,
upgrades, fractional remainder and XP ledger. Its base output is **2 diamonds
per hour**. Diamonds have a separate persistent wallet and cannot accidentally
increase ordinary coin income. All-income collection returns both currencies.

The diamond wallet opens the existing business menu. **8 diamonds** buys
**10× construction for one real hour**. It accelerates existing and newly
started shop, food-court and cotton-island projects, including while offline.
It does not accelerate farm crops or mint business income. Builders run and
hammer faster with a temporary purple three-instance aura; their approved
model stays intact. Swept collision checks prevent fast steps through helpers.

`builderBoosts` stores immutable ID/start/end intervals. Construction keeps its
original deadline as `boostBaseReadyAt`, then integrates normal and accelerated
work exactly once. Expiry does not restore the old deadline, reload does not
restart the hour, and overlapping intervals never multiply beyond 10×.
Cloud merges preserve independent income/building actions and reject overlapping
boost purchases from two devices before a second debit. Older tabs missing the
new wallet fields preserve the current diamonds and boost history.

`test/diamond-boost.test.mjs` covers payouts, fractional income, capacity,
repeat collection, old/new projects, expiry, repeated reloads, concurrent phones,
legacy snapshots, physical speed, temporary glow and the real mine model.
`scripts/check-bikini.cjs` additionally exercises the real mobile buttons and
private local SQLite cloud, including collection, activation and reload.

The page uses `touch-action: manipulation` to remove browser double-tap zoom.
The canvas retains `touch-action: none` and its existing two-finger game camera.
Deliberate browser pinch and ordinary page scrolling remain available.
