# Cat business upgrades and the little hot-dog helper

The existing Business dialog offers five paid levels for every income-producing
venue, including coffee shops, hot-dog stands, the SPA bar and attractions. Each
level shows the next coin/XP rate and visual additions before purchase. Lanterns,
awnings, goods, flowers, flags and a final floral arch/crown accumulate by tier.
Decoration uses two batched material families and no extra shadow-casting lights.
The original venue and cat models are retained when applying a tier.

`business.levels[placementId]` uses the usual local backups and transactional
shared-world save. Old saves start at level one. Income before an upgrade is
settled at its original rate; the remaining coin fraction carries into the new
clock. Future income and collected XP use the new rate and existing daily cap.
The shared merge rejects two competing upgrades/collections on the same register;
older clients cannot erase a retained building's paid level. Storing a building
moves its tier through the existing `relocatedPurchases` inventory metadata, and
replacing it restores that tier with no second build timer or payment.

The hot-dog munchkin `hotdog-bun` (Булочка) is the existing small visitor model,
reparented into the normal resident rig. The cook and another visitor remain at
the stand. A stable identity prevents duplicates if multiple stands are built.
Before the first manual move, he stays close to the first finished stand. His
first move saves `catDestinations` and he remains a resident even if the stand is
subsequently stored. He uses normal care, friendship, dragging, activities and
communal SPA/Chill reservations. Chichi and all approved cat meshes are unchanged.

Checks: `npm test`, `npm run build`. Optional real mobile pointer / private SQLite
integration: `scripts/check-chill-land.cjs`, with Playwright and Chromium supplied
through `CHICHI_PLAYWRIGHT_MODULE` and `CHICHI_CHROMIUM`. No production save is used.
