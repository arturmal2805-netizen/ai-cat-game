# Bikini Bottom

`bikini` is appended at `[-225, 80]`, with seven times an ordinary island's
playable area. It opens at level 5 for 2,400 ordinary coins. The fixture
`bikini-unaffected-biomes.json` captures all 25 previously published biome
records. No established centre, unlock, island ID, cat model or purchase moves.

The city is above the clouds. Its sand mesh and rocky foundation have real
openings for two swimmable lagoons. Houses include the pineapple, Patrick's
rock, the stone face, lighthouse and pipe buildings. Corals, shells, sea plants,
paving, lights, starfish and five animated falls frame broad walking areas.
Static scenery is batched; water reuses the existing shared shaders. No new
reflection render pass, shadow light or external texture download is needed.

`bikini-characters.js` builds articulated SpongeBob and Patrick rigs; approved
cat geometry is untouched. Both characters walk on city paths. Tapping either
opens the existing item dialog with a short action list. Tapping a cat on this
island opens the same list for that cat. Drag/drop and AI physical-target choices
also use the existing action system. Each action has approach, greeting,
continuous pose transitions and a farewell. SpongeBob offers greeting, five,
hug, petting, bubble chase and dance; Patrick offers greeting, photo and sitting.
Bubble play actually moves and jumps the cat, with paw and head reactions.

`bikini-life.js` owns the single SpongeBob. Orders reserve his time; he walks
through a staff aisle to the kitchen before the restaurant runtime can enter
preparation. His chef cap and spatula, a grilled burger and a handover show the
service. Patrick can reserve an ordinary restaurant table as a visitor. His
friendship interaction cancels that reservation before moving him elsewhere.

The Krusty Krab reuses the food-court queue, seat and collision runtime with
island-specific paths. It has a wooden roof, anchor, flags, clear storefront,
open door, indoor/outdoor tables and the regular interior camera/roof toggle.
There is no duplicate stationary SpongeBob on the grill. Cats carry the existing
burger/fries prop and eat at reserved tables. Ordinary coins/XP, business
upgrades, meals and final city positions use existing save transactions and
idempotent visit receipts. Unlocking adds a sea-grape crop through the standard
farm catalogue. Character poses and wandering routes are transient animation
state, with no timer requiring the browser to stay open.

Validation: `npm test`, `npm run build`, `npx wrangler deploy --dry-run`.
`scripts/check-bikini.cjs` uses a random private local SQLite world with mobile
touch input, all nine friendship actions, screenshots, cooking, food, roof and
camera restoration, and exact cloud wallet/XP/position/receipt comparisons.
`scripts/check-foodcourt.cjs` covers the established court and video cinema.
SwiftShader screenshots verify rendering correctness, not device frame rate.
