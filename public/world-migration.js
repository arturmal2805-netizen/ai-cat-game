import { byItem } from "./game-data.js";
export const WORLD_REVISION = 2;
export function migrateRetiredIsland(raw, now = Date.now()) {
  if (raw.worldRevision >= WORLD_REVISION) return raw;
  const saved = structuredClone(raw);
  saved.worldRevision = WORLD_REVISION;
  if (Array.isArray(saved.unlocked) && saved.unlocked.includes("wizard")) {
    saved.coins = Math.min(10000000, saved.coins + 3630);
    saved.retiredIslandRefund = 3630;
  }
  saved.unlocked = (Array.isArray(saved.unlocked) ? saved.unlocked : []).filter(
    (id) => id !== "wizard",
  );
  saved.inventory ||= {};
  saved.builtInventory ||= {};
  saved.relocatedPurchases ||= [];
  const removed = (
    Array.isArray(saved.placements) ? saved.placements : []
  ).filter((p) => p.biome === "wizard" && byItem(p.item));
  for (const p of removed) {
    saved.inventory[p.item] = (saved.inventory[p.item] || 0) + 1;
    saved.relocatedPurchases.push({
      ...p,
      fieldCells: saved.farm?.fields?.[p.id] || null,
    });
    if (saved.farm?.fields) delete saved.farm.fields[p.id];
  }
  saved.placements = (
    Array.isArray(saved.placements) ? saved.placements : []
  ).filter((p) => p.biome !== "wizard");
  for (const r of Array.isArray(saved.scenery) ? saved.scenery : [])
    if (r && (r.biome === "wizard" || r.originBiome === "wizard")) {
      r.biome = "moon";
      r.originBiome = "moon";
      r.stored = true;
    }
  for (const [id, destination] of Object.entries(saved.catDestinations || {}))
    if (destination === "wizard") saved.catDestinations[id] = "moon";
  if (saved.catPosition?.biome === "wizard") saved.catPosition = null;
  return saved;
}
