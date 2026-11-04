import {test} from 'node:test';import assert from 'node:assert/strict';import * as T from 'three';
import {BIOMES,byBiome} from '../public/game-data.js';import {MOSA_RADIUS,MOSA_SEA,mosaBedY,mosaDryPoint} from '../public/mosasaur-data.js';
import {retainedMosaLand} from '../public/mosasaur-retained-land.js';import {createBiomeScene} from '../public/biome-scenes.js';
import {newGame,loadGame,purchase,placeItem,canPlace,storeItem} from '../public/economy.js';import {xpForLevel} from '../public/progression.js';import {mergeSharedWorld} from '../shared-world.mjs';
const now=Date.UTC(2026,10,4),restore=g=>loadGame({getItem:k=>k==='chichi-world-v2'?JSON.stringify(g):null},now,{advance:false});
function seed(){const g=newGame(now);g.unlocked.push('autumn');g.coins=8000000;g.progression.xp=xpForLevel(30);return g;}
test('four times the actual water area has a sloping physical bed and no neighbouring shore intersection',()=>{
 assert.equal(MOSA_SEA.rx*MOSA_SEA.rz,4*21*20);
 const b=byBiome('autumn');for(const other of BIOMES.filter(x=>x.id!==b.id))assert.ok(Math.hypot(b.center[0]-other.center[0],b.center[1]-other.center[1])>MOSA_RADIUS+(other.radius||11.65)+3,other.id);
 const island=createBiomeScene(b);island.updateMatrixWorld(true);const bed=island.userData.ocean.sea.userData.bed;
 for(const [x,z] of [[0,0],[15,5],[30,0],[0,35],[40,0]]){
  const hits=new T.Raycaster(new T.Vector3(x,5,z),new T.Vector3(0,-1,0)).intersectObject(bed);
  assert.ok(hits.length);assert.ok(Math.abs(hits[0].point.y-mosaBedY(x,z))<.15);
 }
 assert.ok(mosaBedY(40,0)>mosaBedY(0,0)+28);island.userData.dispose();
});
test('existing paid shoreline objects keep IDs, addresses, tiers, deadlines and dry platforms through reloads',()=>{
 let g=seed();g.placements.push({id:'paid-shore',item:'business-hotdog',biome:'autumn',x:24,z:0,rotation:0,readyAt:now+400000});g.business.levels['paid-shore']=3;
 const original=structuredClone(g.placements),coins=g.coins;
 for(let i=0;i<10;i++){g=restore(g);assert.deepEqual(g.placements,original);assert.equal(g.coins,coins);assert.equal(g.business.levels['paid-shore'],3);}
 const zones=retainedMosaLand(g.placements,g.scenery),p=original.at(-1);assert.deepEqual(mosaDryPoint(p.x,p.z,1.3,zones),{x:p.x,z:p.z});
 const island=createBiomeScene(byBiome('autumn'),{placements:g.placements,scenery:g.scenery});island.updateMatrixWorld(true);
 const hit=new T.Raycaster(new T.Vector3(24,5,0),new T.Vector3(0,-1,0)).intersectObject(island.userData.navigationSurface);
 assert.ok(hit.some(h=>h.point.y>-.1));assert.ok(!canPlace(seed(),'business-hotdog','autumn',24,0).ok);island.userData.dispose();
});
test('new outer land survives cached-client merge; genuine storage remains effective',()=>{
 let g=seed();g=placeItem(purchase(g,'business-hotdog',now),'business-hotdog','autumn',46,0,0,now);const p=g.placements.at(-1);
 assert.deepEqual(restore(g).placements,g.placements);const dropped=structuredClone(g);dropped.placements=dropped.placements.filter(x=>x.id!==p.id);
 assert.ok(mergeSharedWorld(g,g,dropped).placements.some(x=>x.id===p.id));
 assert.ok(!mergeSharedWorld(g,g,storeItem(g,p.id)).placements.some(x=>x.id===p.id));
});
