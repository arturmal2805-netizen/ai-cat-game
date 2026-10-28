import {test} from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import {BIOMES,byBiome,biomeReservations,CROPS} from '../public/game-data.js';
import {MAGIC_FARMS,MAGIC_FRUITS} from '../public/magic-farms-data.js';
import {newOrchard} from '../public/magic-farm-state.js';
import {newGame,loadGame,SAVE_KEY,saveGame} from '../public/economy.js';
import {migrateRetiredIsland} from '../public/world-migration.js';
import {mergeSharedWorld} from '../shared-world.mjs';
import {worldRoads} from '../public/world-roads.js';
const now=Date.UTC(2026,9,28,9),ids=MAGIC_FARMS.map(f=>f.id);
const restore=g=>loadGame({getItem:k=>k===SAVE_KEY?JSON.stringify(g):null},now,{advance:false});
function legacy(){const g=newGame(now);g.worldRevision=4;g.unlocked.push(...ids);g.coins=290000;g.farm.orchards=Object.fromEntries(ids.map(id=>[id,newOrchard(id,now)]));g.farm.stock.starberry=7;g.placements.push({id:'paid-farm-mouse',item:'mouse',biome:ids[0],x:2,z:3,rotation:0,readyAt:0});g.catPosition={biome:ids[0],x:0,z:0};g.catDestinations.luna=ids[1];return g;}
test('all four withdrawn farm islands, shops, colliders and connecting roads are absent',()=>{
 assert.equal(BIOMES.length,18);for(const id of ids){assert.equal(byBiome(id),undefined);assert.deepEqual(biomeReservations(id),[]);}assert.ok(worldRoads(BIOMES).every(r=>!ids.includes(r.to)&&!ids.includes(r.from)));
 const app=fs.readFileSync(new URL('../public/app.js',import.meta.url),'utf8'),html=fs.readFileSync(new URL('../public/index.html',import.meta.url),'utf8');assert.ok(!app.includes("name:'Магічні ферми'"));assert.ok(!html.includes('id="magic-farm-owned"'));
});
test('withdrawal retains paid objects, coins, fruit, ownership and growth records through thirty restarts',()=>{
 const old=legacy();let g=restore(old);assert.equal(g.coins,old.coins);assert.equal(g.farm.stock.starberry,7);assert.deepEqual(g.farm.orchards,old.farm.orchards);assert.deepEqual(g.withdrawnMagicFarms,ids);assert.ok(g.unlocked.every(id=>!ids.includes(id)));assert.equal(g.placements.find(p=>p.id==='paid-farm-mouse').biome,'homestead');assert.equal(g.catPosition.biome,'homestead');assert.equal(g.catDestinations.luna,'homestead');
 for(let i=0;i<30;i++){const next=restore(g);assert.deepEqual(next.placements,g.placements);assert.deepEqual(next.farm.orchards,g.farm.orchards);assert.deepEqual(next.withdrawnMagicFarms,ids);assert.equal(next.coins,g.coins);g=next;}
 for(const f of MAGIC_FRUITS)assert.ok(CROPS.some(c=>c.id===f.id));
});
test('cached devices cannot reopen retired farm islands or erase retained crops and ownership',()=>{
 const old=legacy(),current=restore(old),incoming=structuredClone(old);incoming.cat.happiness++;
 const merged=mergeSharedWorld(old,current,incoming);assert.ok(merged.unlocked.every(id=>!ids.includes(id)));assert.deepEqual(merged.withdrawnMagicFarms,ids);assert.deepEqual(merged.farm.orchards,current.farm.orchards);assert.equal(merged.coins,current.coins);
 const cached=structuredClone(current);delete cached.withdrawnMagicFarms;delete cached.farm.orchards;const again=mergeSharedWorld(current,current,cached);assert.deepEqual(again.withdrawnMagicFarms,ids);assert.deepEqual(again.farm.orchards,current.farm.orchards);
 cached.farm.orchards={};assert.deepEqual(mergeSharedWorld(current,current,cached).farm.orchards,current.farm.orchards);
});
