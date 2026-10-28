# Four magical farm islands

Append-only world extension: starlight orchard (120,000), sugar-cloud farm
(155,000), crystal jungle (195,000), moon-pumpkin farm (240,000 coins).
Existing biome positions, roads, paid objects and cat producers are retained.
The previously published Mega Loops loading correction is included.

Each farm has 18 persistent plant IDs and three native inventory fruits, with
common, rare and legendary variants. Cycles/deadlines survive restart. Only a
validated delivered farm/plant/cycle receipt deposits stock; repeated receipts
are rejected. Normal bowls/feeding and crop sales reuse the existing economy.

Fields use distinct routes and authored scenery, native lagoon water, eight
fish, four cascades, fixed-buffer fireflies and GPU meadow wind. Crystal fruit
has a translucent outer shell; pears, stars, peaches, cloud fruit, crystals and
pumpkins retain recognizable shapes. Actual low branches align with harvesting
stands, approved rig reactions and transient carried baskets.

Four concurrent visitors reserve separate plants and five alternate deposit
bays. Reservation A* and live rest-radius collision checks keep walks dry and
separate; work/care/manual control takes priority. There are no new AI timers.

`resources.json` records actual procedural geometry before rendering. Full
static fields combine 2,149–2,328 source meshes into 8–10 material batches;
distant farm proxies use eight meshes and no fish or prepared fields. Only the
selected farm's detail is visible. Continuous effects retain fixed buffers;
fruit matrices change on growth/pick state transitions, rather than each frame.
These counts are resource checks, not physical Mac/iPhone FPS measurements.

Validation commands:

```sh
node --test
npm run build
npx wrangler deploy --dry-run
CHICHI_MAGIC_FARM_AUDIT=1 node scripts/check-aquarium.cjs
```

The browser harness uses a private local Worker/SQLite world and phone viewport
at DPR 2. It never writes a player save or calls paid inference. Release evidence
and final results are recorded alongside this report after verification.

Verified locally: all 763 tests passed, production build and Worker deployment
dry-run passed. Targeted farm/purchase/preview checks passed 16/16; all 72
plants are reachable by a large cat, and four simultaneous visitors complete
without deadlock. The approved cat producer cache remains
`sculpt-v2-a496203fa13a037a7a10a927`. Existing island snapshots retain their
released bytes; new farms have independent geometry/navigation/save coverage.

Final real phone audit passed with no browser/HTTP errors or context loss:
all four actual shop purchases (710,000 total), one visible detailed farm,
Chichi picking/carrying/depositing, simultaneous tiny/giant approved visitors,
three native stock deposits, and two exact shared-SQLite reloads. DPR stayed 2;
the captured selected farm frame submitted 67 draws / 311,600 triangles.

Two earlier long probes hit Wrangler development ProxyWorker upstream
connection losses. The native durable retry journal retained every purchase
and deposit through both drops. The final audit uses the same actual bundled
Worker, workerd, asset router and private SQLite directly through Miniflare,
without Wrangler's extra development proxy. Production client/server save
behavior is unchanged; `browser-errors.json` records the final clean run.

Published source: `d68b5e40f1d457b775f5fa1cbc337709fd7e354f`. GitHub Actions
run `40651425362` passed test, Cloudflare deploy and Pages publication. The
actual Worker status and Pages bundle/preview/source hashes match the checked
checkout; see `publication.json`. No paid inference or player saves were used.

Primary changed files:

- `public/magic-farms-data.js`, `magic-farm-biome.js`, `magic-fruit-models.js`:
  farm identities, distinct landscapes, plants, fruit and cooperative geometry.
- `public/magic-farm-harvest.js`, `magic-farm-target.js`, `world.js`,
  `resident-play.js`: reservations, navigation, rig reactions and delivery.
- `public/magic-farm-state.js`, `economy.js`, `shared-world.mjs`, `save-vault.mjs`:
  native inventory, saved growth cycles, once-only receipts and cached clients.
- `public/app.js`, `magic-farm-ui.js`, `index.html`, `style.css`, catalogue
  previews: four shop cards, ownership, counters and manual harvest controls.
- `test/magic-farms.test.mjs`, `scripts/check-magic-farms.mjs` and existing
  phone harness: functional, geometry, shared-save and real browser coverage.
