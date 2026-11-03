// Historical ownership stays durable, but retired objects never enter the
// active catalogue/scene again. Prices are the original fixed purchase prices.
export const RETIRED_ATTRACTIONS={'ride-water-jungle-coaster':225000,'ride-water-crystal-vortex':185000};
const quantity=v=>Number.isSafeInteger(v)&&v>=0&&v<=100000?v:0;
export function retiredCount(game,id){
 const placed=new Set((game?.placements||[]).filter(p=>p.item===id).map(p=>p.id)).size;
 return Math.max(quantity(game?.retiredAttractions?.[id]?.count),quantity(game?.referenceOwnership?.[id]?.count),quantity(game?.inventory?.[id])+placed,game?.progression?.discoveries?.includes(id)?1:0);
}
export function retirementPurchaseAdvanced(base,incoming){
 const live=(g,id)=>Math.max(quantity(g?.referenceOwnership?.[id]?.count),quantity(g?.inventory?.[id])+new Set((g?.placements||[]).filter(p=>p.item===id).map(p=>p.id)).size);
 return Object.keys(RETIRED_ATTRACTIONS).some(id=>live(incoming,id)>live(base,id)||retiredCount(incoming,id)>retiredCount(base,id));
}
export function retirementSnapshotValid(raw){
 return raw==null||!Array.isArray(raw)&&typeof raw==='object'&&Object.entries(raw).every(([id,r])=>RETIRED_ATTRACTIONS[id]&&r&&quantity(r.count)===r.count&&r.count>0&&Number.isSafeInteger(r.credited)&&r.credited>=0&&r.credited<=r.count*RETIRED_ATTRACTIONS[id]);
}
// Cached catalogues omit the archive while retaining the already-credited
// wallet. Restore their merge-base receipt BEFORE considering any refund.
export function inheritRetirement(base,incoming){
 let result=incoming;
 for(const [id,r]of Object.entries(base?.retiredAttractions||{})){
  const n=result.retiredAttractions?.[id];
  if((n?.count||0)>=r.count&&(n?.credited||0)>=r.credited)continue;
  result={...result,retiredAttractions:{...result.retiredAttractions,[id]:{count:Math.max(r.count,n?.count||0),credited:Math.max(r.credited,n?.credited||0)}}};
 }
 return result;
}
export function migrateRetiredAttractions(raw){
 let result=raw;
 for(const [id,price]of Object.entries(RETIRED_ATTRACTIONS)){
  const count=retiredCount(result,id);if(!count)continue;
  const old=result.retiredAttractions?.[id],credited=old?.credited||0,
   credit=Math.max(0,Math.min(count*price-credited,10000000-result.coins)),
   active=(result.placements||[]).some(p=>p.item===id)||id in (result.inventory||{})||id in (result.builtInventory||{})||!!result.referenceOwnership?.[id]||(result.relocatedPurchases||[]).some(p=>p.item===id)||result.progression?.discoveries?.includes(id);
  if(!active&&old?.count===count&&!credit)continue;
  if(result===raw)result=structuredClone(raw);
  const removed=new Set((result.placements||[]).filter(p=>p.item===id).map(p=>p.id));
  result.placements=(result.placements||[]).filter(p=>p.item!==id);
  for(const key of ['inventory','builtInventory','referenceOwnership'])if(result[key])delete result[key][id];
  result.relocatedPurchases=(result.relocatedPurchases||[]).filter(p=>p.item!==id);
  if(result.progression?.discoveries)result.progression.discoveries=result.progression.discoveries.filter(item=>item!==id);
  for(const key of ['accounts','levels'])for(const pid of removed)if(result.business?.[key])delete result.business[key][pid];
  result.retiredAttractions={...result.retiredAttractions,[id]:{count,credited:credited+credit}};
  result.coins+=credit;
 }
 return result;
}
// Concurrent devices can claim the same pending credit. Combine their deltas
// once, then remove any overlapping credit from the ordinary additive wallet.
export function mergeRetirement(base,current,incoming,result){
 let overlap=0;const records={};
 for(const [id,price]of Object.entries(RETIRED_ATTRACTIONS)){
  const count=Math.max(retiredCount(base,id),retiredCount(current,id),retiredCount(incoming,id));if(!count)continue;
  const b=base?.retiredAttractions?.[id]?.credited||0,c=Math.max(b,current?.retiredAttractions?.[id]?.credited||0),n=Math.max(b,incoming?.retiredAttractions?.[id]?.credited||0),sum=c+n-b,credited=Math.min(count*price,sum);
  overlap+=sum-credited;records[id]={count,credited};
 }
 if(Object.keys(records).length)result.retiredAttractions=records;
 result.coins-=overlap;return result;
}
