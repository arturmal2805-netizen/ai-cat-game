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
chooses attendance locally from the permanent professions. AI chooses an initial
profession once and evening activities after work. Established careers are not
sent for daily re-selection; existing historical career changes are preserved.

The elected shared-world simulator sends a `careers` event only for new cats
still awaiting their first AI profession, from noon onward, then one `evening`
batch after 19:00. The evening prompt contains only workers choosing leisure,
cats able to afford a house, and singles when the 14-day family review is due.
It does not re-submit everyone's career, skills and work schedule. No AI calls
are replayed for days spent offline. Initial-provider failures retain a local
provisional career and can be attempted once on a later game day.

Both client markers and the server-side `CityAIRequestLedger` reserve an event
before inference. Concurrent devices, reloads and lost acknowledgements reuse
the stored response rather than spending another request. Initial profession
results remain recoverable after the short response cache expires. Daily quota
exhaustion blocks further primary attempts until the next UTC day. Old clients
with established professions receive a complete local schedule without an AI
call. IDs, capacities, house affordability, family proposals and owned cars are
validated before applying a response. Failures retain the local plan; manual
commands and dragging keep priority. Numbered compact rows keep the full 147-cat
roster within the model context. Initial/long-idle cats
receive available shifts in their AI-selected profession; overbooked requests
reserve only the six actual seats, prioritizing the oldest paid shift. Career
choice stays with AI, while seat and schedule rules stay in the game.

Cloudflare is primary. `BACKUP_AI_API_KEY`, supplied by GitHub Actions as a Worker
secret, enables automatic OpenRouter fallback with the verified free
`dots-studio/dots-3-note-preview:free` model and reasoning disabled. Neither
provider key reaches the browser. A successful primary response never calls the
reserve. Routine deployment checks exercise release and save integrity without
AI inference; live inference requires an explicit manual verification.

At published 70B rates, the 147-cat estimates in
`docs/qa/2026-10-20/life-ai-and-loading/ai-budget.json` are 399 neurons for first
careers once, 216 for an ordinary evening, 579 when every cat can afford a house,
and 728 for that rich evening plus the rare family review. These use the maximum
output allowance, not measured billing. At 2.5 game days per active real hour,
six rich hours cost about 8,685 neurons before initial careers and manual Chichi
requests. The free 10,000-neuron allowance is not unlimited around-the-clock AI.
OpenRouter's documented free-model allowance is 50 requests/day without purchased
credits, at most 20/minute; buying at least $10 in credits raises it to 1,000/day.
Availability and account balance still apply. A key spending cap is not a credit
balance. See https://openrouter.ai/docs/api/reference/limits.

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

## Full life-cycle regression

`test/cat-life-cycle.test.mjs` covers all 147 available cats over 120 simulated
game days, actual attendance/payment functions, different earned totals and
private balances, automatic houses, desired cars and reloads. Captured responses
from the real 147-cat Cloudflare AI request cover both first career selection
and established careers. A homeowner choosing a walk or drive has evening free
time until 22:00; quiet cats can go home at 19:00. Everyone with an active home
can return after 22:00, and work starts again at 12:00. Manual play and trips
retain priority. The planner's bounded timeout accommodates the full roster
without freezing the immediate local provisional plan or issuing extra calls.
