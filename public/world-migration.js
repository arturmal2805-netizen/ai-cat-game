import { byItem, byBiome, NEIGHBORS } from "./game-data.js";
import { sceneryBounds } from './scenery-data.js';
import { isRetiredBiome, retiredDistrict } from './world-layout.js';
export const WORLD_REVISION = 4;
function relocatedPlot(p, occupied) {
  const spec=byItem(p.item),size=spec?.footprint || [2,2],
    [w,d]=p.rotation%2?[size[1],size[0]]:size,
    limit=byBiome('homestead').radius-.7;
  const clear=(x,z)=>Math.hypot(Math.abs(x)+w/2,Math.abs(z)+d/2)<=limit&&
    !occupied.some(q=>q.rx&&q.rz
      ? (Math.max(0,Math.abs(x-q.x)-w/2)/q.rx)**2+(Math.max(0,Math.abs(z-q.z)-d/2)/q.rz)**2<1
      : Math.abs(x-q.x)<(w+q.w)/2+.2&&Math.abs(z-q.z)<(d+q.d)/2+.2);
  if(clear(p.x,p.z))return{x:p.x,z:p.z,w,d};
  // Search only during this one-time migration. Existing buildings never
  // move; deterministic rings keep shared/cached copies at the same address.
  for(let r=4;r<=limit*2;r+=4){
    const count=Math.ceil(Math.PI*2*r/4);
    for(let i=0;i<count;i++){
      const angle=i*Math.PI*2/count,x=Math.round((p.x+Math.sin(angle)*r)*1e6)/1e6,z=Math.round((p.z+Math.cos(angle)*r)*1e6)/1e6;
      if(clear(x,z))return{x,z,w,d};
    }
  }
  return null;
}
export function migrateRetiredIsland(raw, now = Date.now()) {
  let saved=raw.worldRevision>=2 ? raw : migrateWizard(raw);
  if(saved.worldRevision>=WORLD_REVISION &&
      !saved.unlocked?.some(isRetiredBiome) &&
      !saved.placements?.some(p=>isRetiredBiome(p.biome)) &&
      !saved.scenery?.some(p=>isRetiredBiome(p.biome)) &&
      !Object.values(saved.catLocations||{}).some(p=>isRetiredBiome(p?.biome)))return saved;
  saved=structuredClone(saved);
  const oldUnlocked=new Set(saved.unlocked || []),
    moving=(saved.placements || []).some(p=>isRetiredBiome(p.biome)),
    needsLand=moving || [...oldUnlocked].some(isRetiredBiome);
  saved.worldRevision=WORLD_REVISION;
  saved.unlocked=(saved.unlocked || []).filter(id=>!isRetiredBiome(id));
  if(needsLand&&!saved.unlocked.includes('homestead'))saved.unlocked.push('homestead');
  const occupied=(saved.placements||[]).filter(p=>p.biome==='homestead').map(p=>{
    const size=byItem(p.item)?.footprint||[2,2],[w,d]=p.rotation%2?[size[1],size[0]]:size;return{...p,w,d};
  });
  occupied.push(...(saved.scenery||[]).filter(p=>p.biome==='homestead'&&!p.stored).map(sceneryBounds));
  const stored=new Set();
  for(const p of saved.placements || [])if(isRetiredBiome(p.biome)){
    const offset=retiredDistrict(p.biome);
    p.x+=offset.x;p.z+=offset.z;p.biome='homestead';
    const free=relocatedPlot(p,occupied);
    if(free){p.x=free.x;p.z=free.z;occupied.push(free);}
    else{
      // A fully occupied destination must not make loadGame silently reject
      // a paid object. Retain its original receipt/timer/crops/tier in the bag.
      saved.inventory||={};saved.builtInventory||={};saved.relocatedPurchases||=[];
      if(!saved.relocatedPurchases.some(r=>r.id===p.id)){
        saved.inventory[p.item]=(saved.inventory[p.item]||0)+1;
        if(!p.readyAt||p.readyAt<=now)saved.builtInventory[p.item]=(saved.builtInventory[p.item]||0)+1;
        saved.relocatedPurchases.push({...p,businessLevel:saved.business?.levels?.[p.id]||1,fieldCells:saved.farm?.fields?.[p.id],businessAccount:saved.business?.accounts?.[p.id]});
      }
      stored.add(p.id);
    }
  }
  if(stored.size)saved.placements=saved.placements.filter(p=>!stored.has(p.id));
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
  for(const p of Object.values(saved.catLocations||{}))if(isRetiredBiome(p?.biome)){
    const offset=retiredDistrict(p.biome);
    p.biome='homestead';p.x+=offset.x;p.z+=offset.z;
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
