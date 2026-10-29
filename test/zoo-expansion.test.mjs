import {test} from 'node:test';import assert from 'node:assert/strict';import fs from 'node:fs';
import {ZOO_BIOME,ZOO_EXHIBITS,ZOO_ANIMALS,ZOO_GATE,zooObstacles,zooSeats} from '../public/zoo-data.js';import {BIOMES} from '../public/game-data.js';import {worldRoads} from '../public/world-roads.js';import {courtPath,courtWalkable} from '../public/foodcourt-navigation.js';import {newGame,saveGame,loadGame} from '../public/economy.js';import {openZooExhibit} from '../public/zoo-system.js';
const old=JSON.parse(fs.readFileSync(new URL('./fixtures/before-zoo-expansion.json',import.meta.url)));
test('zoo and each retained habitat gains at least four times the released area without scaling or adding animals',()=>{
 assert.ok(Math.abs(ZOO_BIOME.radius**2/old.biome.radius**2-4)<1e-12);assert.deepEqual(ZOO_BIOME.center,old.biome.center);assert.equal(ZOO_BIOME.price,old.biome.price);assert.deepEqual(ZOO_ANIMALS,Object.fromEntries(Object.entries(old.animals).filter(([id])=>id!=='tiger')));
 for(const e of ZOO_EXHIBITS){const b=old.exhibits.find(b=>b.id===e.id);assert.ok(e.radius**2/b.radius**2>=4);assert.ok(e.w*e.d/(b.w*b.d)>=4);assert.equal(e.price,b.price);assert.ok(Math.hypot(e.x,e.z)+e.radius<ZOO_BIOME.radius);for(const other of ZOO_EXHIBITS)if(other!==e)assert.ok(Math.hypot(e.x-other.x,e.z-other.z)>e.radius+other.radius);}
});
test('the expanded road arrival and all fifteen viewing places remain reachable by the largest native cats',()=>{
 const road=worldRoads(BIOMES).find(r=>r.to==='magic-zoo'),arrival={x:road.end.x-ZOO_BIOME.center[0],z:road.end.z-ZOO_BIOME.center[1]},obs=zooObstacles();
 for(const radius of [.48,.65,1.633])for(const e of ZOO_EXHIBITS)for(const seat of zooSeats(e)){assert.ok(courtWalkable(seat,radius,obs,'magic-zoo'));assert.ok(courtPath(arrival,seat,radius,obs,'magic-zoo'));assert.ok(courtPath(ZOO_GATE,seat,radius,obs,'magic-zoo'));}
});
test('expansion needs no second island purchase and preserves all paid habitats, balances and owned placements through reloads',()=>{
 const now=Date.now();let g=newGame(now);g.unlocked.push('magic-zoo');g.coins=300000;for(const e of ZOO_EXHIBITS.slice(1))g=openZooExhibit(g,e.id,now+e.index);const m=new Map(),store={getItem:k=>m.get(k)||null,setItem:(k,v)=>m.set(k,v)};assert.equal(saveGame(store,g),true);g=loadGame(store,now,{advance:false});const before=structuredClone({coins:g.coins,zoo:g.zoo,placements:g.placements,inventory:g.inventory});
 for(let i=0;i<10;i++){assert.equal(saveGame(store,g),true);g=loadGame(store,now,{advance:false});assert.deepEqual({coins:g.coins,zoo:g.zoo,placements:g.placements,inventory:g.inventory},before);}
});

test('valid saved zoo positions stay exact while old ground swallowed by a larger habitat restores safely once',async()=>{
 const {safeZooRestoredPosition}=await import('../public/zoo-navigation.js'),valid={...zooSeats(ZOO_EXHIBITS[0])[0],yaw:1.2},old={x:0,y:.16,z:17.9,yaw:.8},copy=structuredClone(old);
 assert.equal(safeZooRestoredPosition(valid,.65),valid);const clear=safeZooRestoredPosition(old,.65);assert.ok(courtWalkable(clear,.65,zooObstacles(),'magic-zoo'));assert.equal(safeZooRestoredPosition(clear,.65),clear);assert.deepEqual(old,copy);assert.equal(clear.yaw,old.yaw);
});
