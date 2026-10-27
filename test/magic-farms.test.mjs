import {test} from 'node:test';
import assert from 'node:assert/strict';
import * as T from 'three';
import {MAGIC_FARMS,MAGIC_FRUITS,magicFarmLayout} from '../public/magic-farms-data.js';
import {harvestOrchard,orchardCounts,newOrchard} from '../public/magic-farm-state.js';
import {createFarmHarvests,farmWalkable} from '../public/magic-farm-harvest.js';
import {magicFarmBiomeSteps} from '../public/magic-farm-biome.js';
import {runSceneSteps} from '../public/scene-tasks.js';
import {disposeScenery} from '../public/scenery-models.js';
import {newGame,unlockBiome,saveGame,loadGame,SAVE_KEY,worldSnapshot} from '../public/economy.js';
import {BIOMES,CROPS} from '../public/game-data.js';
import {xpForLevel} from '../public/progression.js';
import {worldRoads} from '../public/world-roads.js';
import {mergeSharedWorld} from '../shared-world.mjs';
import {fillBowl,eatFromBowl} from '../public/care-system.js';
const now=Date.UTC(2026,9,27,12),seed=()=>{const g=newGame(now);g.coins=1000000;g.progression.xp=xpForLevel(20);return g;};
const storage=()=>{const m=new Map();return {getItem:k=>m.get(k)||null,setItem:(k,v)=>m.set(k,v)};};
const reload=g=>{const s=storage();assert.equal(saveGame(s,g),true);return loadGame(s,now,{advance:false});};
const receipt=(game,f,p)=>({farm:f.id,plant:p.id,cycle:game.farm.orchards[f.id].plants[p.id].cycle});
test('four separate large farm islands have distinct layouts, twelve fruits and unchanged old roads',()=>{
 assert.equal(MAGIC_FARMS.length,4);assert.equal(MAGIC_FRUITS.length,12);assert.equal(new Set(MAGIC_FARMS.map(f=>JSON.stringify(magicFarmLayout(f.id).plants))).size,4);
 const old=BIOMES.filter(b=>!b.magicFarm),roads=worldRoads(BIOMES);assert.deepEqual(roads.filter(r=>!MAGIC_FARMS.some(f=>f.id===r.to)),worldRoads(old));
 for(const f of MAGIC_FARMS){assert.ok(f.radius>=88);assert.ok(f.price>0);assert.equal(magicFarmLayout(f.id).plants.length,18);assert.equal(MAGIC_FRUITS.filter(c=>c.biome===f.id).length,3);for(const b of BIOMES.filter(b=>b.id!==f.id))assert.ok(Math.hypot(b.center[0]-f.center[0],b.center[1]-f.center[1])>f.radius+(b.radius||11.65));}
 for(const fruit of MAGIC_FRUITS)assert.ok(CROPS.includes(fruit));
});
test('each paid unlock charges once, creates ready fields and survives five restarts without changing legacy crops',()=>{
 let g=seed();const fields=structuredClone(g.farm.fields);
 for(const f of MAGIC_FARMS){const before=g.coins;g=unlockBiome(g,f.id,now);assert.equal(g.coins,before-f.price);assert.equal(orchardCounts(g,f.id,now).ready,18);assert.throws(()=>unlockBiome(g,f.id,now));for(let i=0;i<5;i++)g=reload(g);assert.equal(orchardCounts(g,f.id,now).ready,18);assert.ok(worldSnapshot(g,now).activities.some(a=>a.id==='orchard-'+f.id));}
 assert.deepEqual(g.farm.fields,fields);const poor=seed();poor.coins=0;const original=structuredClone(poor);assert.throws(()=>unlockBiome(poor,MAGIC_FARMS[0].id,now));assert.deepEqual(poor,original);
});
test('ripe fruit is deposited once, stays in native stock after reload, regrows on its saved timer and feeds cats',()=>{
 for(const f of MAGIC_FARMS){let g=unlockBiome(seed(),f.id,now);
  for(const fruit of MAGIC_FRUITS.filter(x=>x.biome===f.id)){
   const p=magicFarmLayout(f.id).plants.find(p=>p.fruit===fruit.id),r=receipt(g,f,p),result=harvestOrchard(g,r,now);g=reload(result.game);assert.equal(g.farm.stock[fruit.id],1);assert.throws(()=>harvestOrchard(g,r,now));assert.throws(()=>harvestOrchard(g,receipt(g,f,p),now+fruit.seconds*1000-1));
   const timer=g.farm.orchards[f.id].plants[p.id].readyAt;for(let i=0;i<3;i++)g=reload(g);assert.equal(g.farm.orchards[f.id].plants[p.id].readyAt,timer);
   const fed=fillBowl(g,fruit.id);assert.equal(fed.farm.stock[fruit.id],0);assert.ok(eatFromBowl(fed,'chichi',now).game);
   g=harvestOrchard(g,receipt(g,f,p),now+fruit.seconds*1000).game;assert.equal(g.farm.stock[fruit.id],2);
  }
 }
});
test('two devices retain independent harvests, reject duplicate cycles and keep farms omitted by a cached client',()=>{
 const f=MAGIC_FARMS[0],base=unlockBiome(seed(),f.id,now),[p,q]=magicFarmLayout(f.id).plants;
 const a=harvestOrchard(base,receipt(base,f,p),now).game,b=harvestOrchard(base,receipt(base,f,q),now).game,merged=mergeSharedWorld(base,a,b);
 assert.equal(orchardCounts(merged,f.id,now).collected,2);assert.equal(Object.values(merged.farm.stock).reduce((s,x)=>s+x,0),2);assert.throws(()=>mergeSharedWorld(base,a,a));
 const cached=structuredClone(merged);delete cached.farm.orchards;for(const fruit of MAGIC_FRUITS)delete cached.farm.stock[fruit.id];cached.unlocked=cached.unlocked.filter(x=>x!==f.id);const restored=mergeSharedWorld(merged,merged,cached);assert.deepEqual(restored.farm.orchards,structuredClone(merged.farm.orchards));assert.deepEqual(restored.farm.stock,structuredClone(merged.farm.stock));assert.ok(restored.unlocked.includes(f.id));
});
test('invalid orchard records use a durable backup rather than erase harvested inventory',()=>{
 const f=MAGIC_FARMS[0],g=unlockBiome(seed(),f.id,now),s=storage();assert.equal(saveGame(s,g),true);const bought=harvestOrchard(g,receipt(g,f,magicFarmLayout(f.id).plants[0]),now).game;assert.equal(saveGame(s,bought),true);
 const bad=structuredClone(bought);bad.farm.orchards[f.id].plants['plant-0'].cycle=-1;s.setItem(SAVE_KEY,JSON.stringify(bad));assert.deepEqual(loadGame(s,now,{advance:false}).farm.orchards,g.farm.orchards);
});
test('four cats reserve different plants, follow dry routes, carry baskets and release every reservation',()=>{
 for(const f of MAGIC_FARMS){const state=newOrchard(f.id,now);let r;const picks=[];r=createFarmHarvests(f.id,{getState:()=>state,onPick:(id,on)=>picks.push([id,on]),getActors:id=>[...r.visits.values()].filter(v=>v.catId!==id).map(v=>({...v.last,radius:v.radius}))});
  const plans=Array.from({length:4},(_,i)=>r.reserve('cat-'+i,i===0?1.8:.6,now));assert.ok(plans.every(Boolean),f.id+' four accessible plants');assert.equal(new Set(plans.map(p=>p.plant.id)).size,4);assert.equal(r.reserve('full',.6,now),null);
  const phases=new Set();for(let t=0;t<700&&plans.some(p=>!p.finished);t+=.1)for(const p of plans.filter(p=>!p.finished)){const frame=p.frame(t);phases.add(frame.phase);assert.ok(frame.position.every(Number.isFinite));assert.ok(farmWalkable(f.id,{x:frame.position[0],z:frame.position[2]},p.radius),f.id+' dry path');}
  assert.ok(plans.every(p=>p.finished),f.id+' no deadlocked visitors');assert.ok(phases.has('pick')&&phases.has('carry')&&phases.has('deposit'));assert.ok(picks.some(x=>x[1]));for(const p of plans)r.release(p.catId);assert.equal(r.visits.size,0);assert.equal(picks.filter(x=>!x[1]).length,4);
 }
});
test('real farm geometry is cooperative and distinct; hidden farms retain a tiny proxy and fixed animation buffers',()=>{
 const signatures=new Set();for(const f of MAGIC_FARMS){const low=runSceneSteps(magicFarmBiomeSteps(f,{lowOnly:true}));assert.equal(low.userData.stats.fishCount,0);assert.equal(low.userData.detail.children.length,0);disposeScenery(low);
  const full=runSceneSteps(magicFarmBiomeSteps(f));let count=0,triangles=0;full.traverse(o=>{if(o.geometry){count++;triangles+=(o.geometry.index?.count||o.geometry.attributes.position.count)/3;}});signatures.add(count+':'+triangles);assert.equal(full.userData.stats.fishCount,8);assert.ok(triangles<600000);const buffers=new Set();full.traverse(o=>{if(o.geometry)buffers.add(o.geometry);});full.userData.syncOrchard(newOrchard(f.id,now));for(let i=0;i<30;i++)full.userData.update(i/10,false);full.userData.setPlantPicked('plant-0',true);full.userData.setPlantPicked('plant-0',false);const after=new Set();full.traverse(o=>{if(o.geometry)after.add(o.geometry);});assert.deepEqual(after,buffers);disposeScenery(full);
 }assert.equal(signatures.size,4);
});
