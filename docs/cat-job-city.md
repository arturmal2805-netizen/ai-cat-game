# Cat Job City

Cat Job City is a separate level 8 destination (6,500 player coins). Existing
island records, cat meshes, purchases and island-local save coordinates are
unchanged. Six 25 × 20 metre open-front, three-storey buildings share ordinary
sized furniture and the approved resident cat rigs. The city has its own street
network, stairs, central fountain, gardens, clouds and edge waterfalls.

## Careers and daily plans

The game clock starts at 12:00 when the city first opens; one real second is one
game minute. Work runs from 12:00 to 19:00. Each cat has a permanent profession,
individual preferences, skills, career history and private wallet. A daily plan
chooses attendance and evening activities; it does not reset professions.
An established career can change at most three times, with at least three game
days between changes and a circumstance for a review. Local fallback never
changes an established career.

The elected shared-world simulator makes one batch POST to
`/api/jobcity/plan` per game day. The request marker and validated plan survive
reload. The Worker uses the existing `AI` binding, validates IDs, capacities,
professions and car ownership, and bounds inference time. No Cloudflare secret
is sent to the client. Failed, missing or malformed AI responses leave a complete
local plan in place. Manual commands and dragging take priority over work.

Workers have individually reserved seats on all three floors; visitors use
separate seats across the desks. Ground paths avoid the six footprints; authored
interior corridors and stairs lead to the seats. Work motions differ for cashiers,
computer staff, factory operators, furniture consultants, agents and car sales.
The factory conveyor and graph displays animate through fixed GPU buffers.

## Private cat coins

Wages are credited once at 19:00 for recorded attendance, at the rate shown in
the cat's profile. Pauses retain earned credit. Shift high-water marks prevent
repeat payments after reload, including after the short transaction log expires.
These balances never deduct from the player's coin or diamond wallets. Existing
business income and XP collection also includes the six city businesses.

Open the existing coins panel and choose **Монетки котиків**, or use the city
clock button. The profile shows the profession, current private balance, lifetime
earnings, skills, shift rate, career changes, purchase history and inventory.
Purchases use the selected cat's coins and a monotonic purchase sequence. Older
purchase receipts cannot be replayed after history pruning. Occasional wish-list
purchases happen at most once per evening and no more often than every three
game days.

Five convertible cars have distinct colours and body details. After buying one,
choose it in the cat's inventory, then click a city road. Cats walk to the car,
enter, accelerate, steer through rounded junctions, brake, park and exit. Traffic
uses separate directional lanes. Manual trips take precedence over the AI plan;
parking location and the last car persist.

## Saves and rendering

`jobCity.version = 1` is initialized lazily, preserving old saves. Private wallet
updates for different cats merge independently. Competing changes to the same
wallet fail atomically with a synchronization message. Cached clients that do not
know the city cannot erase its unlock, wallets or professions. The save byte limit
is 800,000; a world with all 147 available cats, owned cars and full recent private
transaction histories is approximately 406 KB.

Static interiors, roofs and showroom cars use shared material batches; live cars
reuse cached models. Continuous charts and conveyor parcels update uniforms,
without rebuilding geometry or uploading instance matrices every frame. Approved
cat anatomy, fish, old scenery, water, shadows and mobile DPR are retained.

## Verification

- `npm test` includes permanent-career, AI validation/fallback/timeout, attendance,
  purchase replay, multi-device wallet, old-island fixture, stair/seat, multi-car
  route and fixed GPU-buffer checks.
- `npm run build` and `npx wrangler deploy --dry-run` validate both entry points.
- `CHICHI_CHROMIUM=/usr/bin/chromium CHICHI_PLAYWRIGHT_MODULE=<playwright-module>
  node scripts/check-jobcity.cjs` runs the actual app against an isolated local
  Worker and private SQLite world. It checks working cats, six real buildings,
  failed AI fallback, private purchases, a clicked road trip, reload persistence
  and mobile layout. Review images and counts are written under the system temp
  directory. No production account is used. Software-renderer timings are not
  physical-device FPS claims.
