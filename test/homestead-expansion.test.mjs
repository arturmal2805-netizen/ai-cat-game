import { test } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import { BIOMES, byBiome } from '../public/game-data.js';
import { HOMESTEAD_EXPANSION } from '../public/homestead-expansion.js';
import { newGame, purchase, placeItem, saveGame, loadGame, canPlace, storeItem } from '../public/economy.js';
import { xpForLevel } from '../public/progression.js';
import { mergeSharedWorld } from '../shared-world.mjs';
const now=1792587600000;
function seed(){const g=newGame(now);g.unlocked.push('homestead');g.coins=8000000;g.progression.xp=xpForLevel(30);return g;}
const restore=g=>loadGame({getItem:k=>k==='chichi-world-v2'?JSON.stringify(g):null},now,{advance:false});
test('only Our Island changes, with four times the previous buildable area and open shores',()=>{
 assert.deepEqual(BIOMES.filter(b=>b.id!=='homestead'),JSON.parse(fs.readFileSync(new URL('./fixtures/homestead-expansion-unaffected.json',import.meta.url))));
 const b=byBiome('homestead');assert.equal((b.radius/HOMESTEAD_EXPANSION.originalRadius)**2,4);
 for(const other of BIOMES.filter(x=>x.id!==b.id))assert.ok(Math.hypot(b.center[0]-other.center[0],b.center[1]-other.center[1])>b.radius+(other.radius||11.65)+3,other.id);
});
test('existing buildings retain exact coordinates and multiple giant rides fit on new land through 30 reloads',()=>{
 let g=seed();g=placeItem(purchase(g,'adoption-center',now),'adoption-center','homestead',0,0,0,now);
 const original=structuredClone(g.placements);
 for(const [item,x,z] of [['slide-glass-corkscrew',90,0],['slide-titan-funnel',-90,0],['slide-sky-cannon',0,90],['slide-rainbow-tsunami',0,-90]]){
  assert.ok(canPlace(g,item,'homestead',x,z).ok,item);g=placeItem(purchase(g,item,now),item,'homestead',x,z,0,now);
 }
 for(let i=0;i<30;i++) {const loaded=restore(g);assert.deepEqual(loaded.placements,g.placements);assert.deepEqual(loaded.placements.filter(p=>original.some(o=>o.id===p.id)),original);g=loaded;}
 assert.equal(new Set(g.placements.map(p=>p.id)).size,g.placements.length);
});
test('cached phone with old shoreline cannot erase outer purchases, but real storage still works',()=>{
 let base=seed();base=placeItem(purchase(base,'adoption-center',now),'adoption-center','homestead',90,0,0,now);
 const id=base.placements.at(-1).id, incoming=structuredClone(base);incoming.placements=incoming.placements.filter(p=>p.id!==id);
 const current=structuredClone(base);current.coins+=17;
 for(let i=0;i<20;i++)assert.deepEqual(mergeSharedWorld(base,current,incoming).placements,current.placements);
 const stored=storeItem(base,id);assert.ok(!mergeSharedWorld(base,base,stored).placements.some(p=>p.id===id));
});
