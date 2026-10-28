# One placeable bed, six magic crops

The revised request replaces the withdrawn four-island approach with one native
shop/bag object. No biome, centre, bridge or existing attraction is added or moved.
`farm-magic-fruits` is 10 × 4.8, versus the native 4 × 3 field: exactly four times
the area. Price 6,400 player coins; native level-six/four-minute construction.
Six seed packets cost 45/65/80/105/140/170 coins. Each packet plants one of two
cells in its designated row, producing two fruits after 90–300 game minutes.
One game minute follows the released one-real-second clock.

The wood, soil mounds and low plants are 3D meshes. Pink spun-candy curls,
orange lantern ribs, peach hearts, glassy blue drops, emerald/gold spirals and
golden curly tops are distinct models. Explicit emerald colour follows the
written requirement. The reference image is not used as a texture or plane.
Catalogue images are rendered from these models and shipped with the application.

Planting sets durable planted/ready timestamps and a cycle, consuming one owned
seed. A shared shader clock grows seed, sprout, foliage, bud, fruit and ripe stages
in both colour and shadows. Matrices and attribute buffers stay fixed during
growth. Cached immutable template geometry/materials are reused. The placed
model and its movable preview use the existing priority/cooperative preparation
and shader warmup; no renderer/DPR/shadow/cat detail policy changes.

At most three cats reserve distinct rows and clear exterior standing places.
Cats sniff, reach, pluck, hold a basket and celebrate; tiny cats hop onto the rim.
A temporary two-hinge reach targets the real fruit and resets with the native
pose. No sculpt/cache producer changes. The current cache remains
`sculpt-v2-a496203fa13a037a7a10a927`.

A validated field/cell/cycle receipt credits two fruits immediately to native
harvest stock at animation completion. Interrupted/replayed/concurrent attempts
cannot credit twice. Manual row buttons, dropped cats and autonomous local
visitors share that controller; work, care and manual actions retain priority.
The existing farm storage, feeding and sale functions handle the crops.
Moving/rotating/storing preserves all twelve cells. Corrupt growth selects a
backup. Cached clients missing these products, seeds or stock retain them.

Validation artifacts and final publication proof accompany this file. Browser
checks use a private local Worker/SQLite and Chromium SwiftShader, phone viewport
at DPR 2, with mocked AI. Deadlines/travel can be advanced only in that private
fixture; production shop, seed consumption, growth, animations and receipts run
unchanged. These are correctness/image/resource checks, not M2/iPhone FPS claims.

The final private phone run bought and planted all twelve cells, recorded all six
growth views, completed hero/tiny/giant picks and one automatic pick (8 fruits
credited), cancelled an intermediate pluck without credit, and retained exact
cells, coins, seeds and stock through two Worker/SQLite reloads. Browser and HTTP
errors were both empty. The independent paid-attraction audit recovered one
finished Mega Loops, placed it without payment, and kept exactly one copy over
two further SQLite reloads. No player world was accessed.

Ordinary walkers use the new bed's rotated footprint and continuous escape after
construction; harvesters use the exterior route/rim hop. Growth continues under
reduced motion, and automatic harvesting respects the existing shared simulation
owner/editor gate. Interleaved model preparation retains one winning immutable
template rather than replacing live owners. The existing renderer/cadence and
other islands remain unchanged.

Final local release gate: all **777 tests passed**, the application build and
Worker dry run succeeded. The phone run reported zero page/HTTP errors.
