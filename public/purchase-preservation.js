import {byItem} from './game-data.js';

// Reference attractions cannot be sold or consumed. Their total ownership and
// completed-copy count therefore never decrease when moving/storing/reloading.
export function referenceOwnership(game,now=Date.now()){
 const result={};
 for(const [id,v]of Object.entries(game.referenceOwnership||{}))if(byItem(id)?.referenceSlide&&Number.isSafeInteger(v?.count)&&v.count>0&&v.count<=100000)result[id]={count:v.count,built:Math.min(v.count,Math.max(0,Number.isSafeInteger(v.built)?v.built:0))};
 for(const id of game.progression?.discoveries||[])if(byItem(id)?.referenceSlide)result[id]||={count:1,built:0};
 const placed=new Map(),seen=new Set();for(const p of game.placements||[])if(byItem(p.item)?.referenceSlide&&!seen.has(p.id)){seen.add(p.id);const v=placed.get(p.item)||{count:0,built:0};v.count++;if(!p.readyAt||p.readyAt<=now)v.built++;placed.set(p.item,v);}
 for(const id of new Set([...Object.keys(result),...Object.keys(game.inventory||{}),...placed.keys()]))if(byItem(id)?.referenceSlide){
  const bag=Math.max(0,Math.floor(game.inventory?.[id]||0)),p=placed.get(id)||{count:0,built:0},count=Math.max(result[id]?.count||0,bag+p.count);
  if(count)result[id]={count,built:Math.min(count,Math.max(result[id]?.built||0,Math.min(bag,game.builtInventory?.[id]||0)+p.built))};
 }
 return result;
}
export function preserveReferenceOwnership(game,now=Date.now(),{repair=true,sources=[]}={}){
 const records=referenceOwnership(game,now),epoch=game.jobCity?.epoch;
 // Bare local backups can belong to a previous account. A matching persistent
 // world epoch AND the current purchase discovery are required before using one.
 if(epoch)for(const source of sources)if(source?.jobCity?.epoch===epoch){
  const evidence=referenceOwnership(source,now);
  for(const [id,v]of Object.entries(evidence))if(game.progression?.discoveries?.includes(id))records[id]={count:Math.max(records[id]?.count||0,v.count),built:Math.max(records[id]?.built||0,v.built)};
 }
 const old=game.referenceOwnership||{},same=Object.keys(records).length===Object.keys(old).length&&Object.entries(records).every(([id,v])=>old[id]?.count===v.count&&old[id]?.built===v.built);
 let result=same?game:{...game,referenceOwnership:records};
 if(!repair)return result;
 for(const [id,receipt]of Object.entries(records)){
  const placed=(result.placements||[]).filter(p=>p.item===id),bag=result.inventory?.[id]||0,missing=receipt.count-bag-placed.length;
  if(missing<=0)continue;
  const built=(result.builtInventory?.[id]||0)+placed.filter(p=>!p.readyAt||p.readyAt<=now).length,finished=Math.min(missing,Math.max(0,receipt.built-built));
  result={...result,inventory:{...result.inventory,[id]:bag+missing},builtInventory:{...result.builtInventory,[id]:(result.builtInventory?.[id]||0)+finished}};
 }
 return result;
}
export function missingReferenceOwnership(game,now=Date.now()){
 return Object.entries(referenceOwnership(game,now)).some(([id,v])=>v.count>(game.inventory?.[id]||0)+(game.placements||[]).filter(p=>p.item===id).length);
}
