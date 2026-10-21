import { byItem, NEIGHBORS } from "./game-data.js";
import { isRetiredBiome, retiredDistrict } from './world-layout.js';
export const WORLD_REVISION = 3;
export function migrateRetiredIsland(raw, now = Date.now()) {
  let saved=raw.worldRevision>=2 ? raw : migrateWizard(raw);
  if(saved.worldRevision>=WORLD_REVISION &&
      !saved.unlocked?.some(isRetiredBiome) &&
      !saved.placements?.some(p=>isRetiredBiome(p.biome)) &&
      !saved.scenery?.some(p=>isRetiredBiome(p.biome)))return saved;
  saved=structuredClone(saved);
  const oldUnlocked=new Set(saved.unlocked || []),
    moving=(saved.placements || []).some(p=>isRetiredBiome(p.biome)),
    needsLand=moving || [...oldUnlocked].some(isRetiredBiome);
  saved.worldRevision=WORLD_REVISION;
  saved.unlocked=(saved.unlocked || []).filter(id=>!isRetiredBiome(id));
  if(needsLand&&!saved.unlocked.includes('homestead'))saved.unlocked.push('homestead');
  for(const p of saved.placements || [])if(isRetiredBiome(p.biome)){
    const offset=retiredDistrict(p.biome);
    p.x+=offset.x;p.z+=offset.z;p.biome='homestead';
  }
  // Keep decorative belongings in the bag, not as invisible scene objects.
  for(const r of saved.scenery || [])if(isRetiredBiome(r.biome)){
    r.biome='homestead';r.stored=true;
  }
  saved.catDestinations ||= {};
  for(const n of NEIGHBORS)if(isRetiredBiome(n.originBiome)&&oldUnlocked.has(n.originBiome))
    saved.catDestinations[n.id]='homestead';
  for(const [id,biome] of Object.entries(saved.catDestinations))
    if(isRetiredBiome(biome))saved.catDestinations[id]='homestead';
  for(const a of saved.adoption?.cats || [])if(isRetiredBiome(a.homeBiome))a.homeBiome='homestead';
  if(isRetiredBiome(saved.catPosition?.biome)){
    const offset=retiredDistrict(saved.catPosition.biome);
    saved.catPosition={...saved.catPosition,biome:'homestead',
      x:saved.catPosition.x+offset.x,z:saved.catPosition.z+offset.z};
  }
  return saved;
}
function migrateWizard(raw) {
  const saved = structuredClone(raw);
  saved.worldRevision = 2;
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
