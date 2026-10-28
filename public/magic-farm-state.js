import {MAGIC_FARMS,MAGIC_FRUITS,magicFarm,magicFarmLayout} from './magic-farms-data.js';
export function newOrchard(id,now){return {openedAt:now,plants:Object.fromEntries(magicFarmLayout(id).plants.map(p=>[p.id,{cycle:0,readyAt:now}]))};}
export function normalizeOrchards(raw,unlocked,now){
 const result={};for(const f of MAGIC_FARMS)if(unlocked.includes(f.id)||raw?.[f.id]){
  const old=raw?.[f.id],next=newOrchard(f.id,now);next.openedAt=Number.isFinite(old?.openedAt)?Math.max(0,old.openedAt):now;
  for(const p of magicFarmLayout(f.id).plants){const s=old?.plants?.[p.id];if(s&&Number.isSafeInteger(s.cycle)&&s.cycle>=0&&Number.isFinite(s.readyAt)&&s.readyAt>=0)next.plants[p.id]={cycle:s.cycle,readyAt:s.readyAt};}
  result[f.id]=next;
 }return result;
}
export function orchardSnapshotValid(raw){
 if(raw===undefined)return true;if(!raw||typeof raw!=='object'||Array.isArray(raw))return false;
 for(const f of MAGIC_FARMS){const o=raw[f.id];if(!o)continue;if(!Number.isFinite(o.openedAt)||o.openedAt<0||!o.plants)return false;
  for(const p of magicFarmLayout(f.id).plants){const s=o.plants[p.id];if(!s||!Number.isSafeInteger(s.cycle)||s.cycle<0||!Number.isFinite(s.readyAt)||s.readyAt<0)return false;}
 }return true;
}
export function orchardCounts(game,id,now=Date.now()){
 const o=game.farm?.orchards?.[id],fruits=MAGIC_FRUITS.filter(f=>f.biome===id);
 return {ready:Object.values(o?.plants||{}).filter(p=>p.readyAt<=now).length,collected:Object.values(o?.plants||{}).reduce((a,p)=>a+p.cycle,0),stock:fruits.reduce((a,f)=>a+(game.farm?.stock?.[f.id]||0),0)};
}
// Receipt identifies a single ripening cycle. Validate before any inventory
// mutation; late callbacks, repeated finishes and reloads cannot harvest twice.
export function harvestOrchard(game,receipt,now=Date.now()){
 const farm=magicFarm(receipt?.farm),plant=farm&&magicFarmLayout(farm.id).plants.find(p=>p.id===receipt.plant),state=game.farm?.orchards?.[farm?.id]?.plants?.[plant?.id];
 if(!farm||!game.unlocked.includes(farm.id)||!plant||!state||state.cycle!==receipt.cycle||state.readyAt>now)throw Error('Цей плід ще росте або його вже зібрали.');
 const fruit=MAGIC_FRUITS.find(f=>f.id===plant.fruit);if((game.farm.stock[fruit.id]||0)>=100000)throw Error('Сховище заповнене: пригостіть котиків або продайте врожай.');
 const next=structuredClone(game);next.farm.orchards[farm.id].plants[plant.id]={cycle:state.cycle+1,readyAt:now+fruit.seconds*1000};next.farm.stock[fruit.id]=(next.farm.stock[fruit.id]||0)+1;next.farm.harvests++;
 return {game:next,fruit:fruit.id,rare:fruit.rarity==='Легендарний',count:1};
}
