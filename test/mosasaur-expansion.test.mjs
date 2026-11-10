import {test} from 'node:test';import assert from 'node:assert/strict';import * as T from 'three';
import {BIOMES,byBiome} from '../public/game-data.js';import {MOSA_RADIUS,MOSA_PREVIOUS_RADIUS,MOSA_SEA,MOSA_SHORE_GATE,MOSA_DOCK,mosaBedY,mosaCoastFactor,mosaDryPoint} from '../public/mosasaur-data.js';
import {retainedMosaLand} from '../public/mosasaur-retained-land.js';import {createBiomeScene} from '../public/biome-scenes.js';
import {newGame,loadGame,purchase,placeItem,canPlace,storeItem} from '../public/economy.js';import {xpForLevel} from '../public/progression.js';import {mergeSharedWorld} from '../shared-world.mjs';
const now=Date.UTC(2026,10,4),restore=g=>loadGame({getItem:k=>k==='chichi-world-v2'?JSON.stringify(g):null},now,{advance:false});
function seed(){const g=newGame(now);g.unlocked.push('autumn');g.coins=8000000;g.progression.xp=xpForLevel(30);return g;}
test('five more times the master ocean area keeps a sloping physical bed, dry arrival and independent neighbouring shores',()=>{
 assert.ok(Math.abs(MOSA_SEA.rx*MOSA_SEA.rz/(105*100)-5)<1e-12);
 assert.ok(Math.abs(MOSA_RADIUS**2/MOSA_PREVIOUS_RADIUS**2-5)<1e-12);
 assert.deepEqual(MOSA_DOCK,{x:0,z:23});assert.deepEqual(mosaDryPoint(0,MOSA_SHORE_GATE.z),{x:0,z:MOSA_SHORE_GATE.z});
 const b=byBiome('autumn');for(const other of BIOMES.filter(x=>x.id!==b.id))assert.ok(Math.hypot(b.center[0]-other.center[0],b.center[1]-other.center[1])>MOSA_RADIUS+(other.radius||11.65)+3,other.id);
 const housing=byBiome('cat-homes');assert.ok(Math.abs(b.center[1]-housing.center[1])>MOSA_RADIUS+housing.radius+3,'all automatic residential sections along X stay clear, regardless of how many homes are built');
 const island=createBiomeScene(b);island.updateMatrixWorld(true);const bed=island.userData.ocean.sea.userData.bed;
 for(const [x,z] of [[0,0],[40,5],[70,0],[0,85],[MOSA_SEA.rx*.9,0]]){
  const hits=new T.Raycaster(new T.Vector3(x,5,z),new T.Vector3(0,-1,0)).intersectObject(bed);
  assert.ok(hits.length);assert.ok(Math.abs(hits[0].point.y-mosaBedY(x,z))<.15);
 }
 assert.ok(mosaBedY(MOSA_SEA.rx*mosaCoastFactor(0)*.99,0)>mosaBedY(0,0)+198);island.userData.dispose();
});
test('existing paid shoreline objects keep IDs, addresses, tiers, deadlines and dry platforms through reloads',()=>{
 let g=seed();g.placements.push({id:'paid-shore',item:'business-hotdog',biome:'autumn',x:24,z:0,rotation:0,readyAt:now+400000},{id:'previous-master-shore',item:'business-hotdog',biome:'autumn',x:130,z:0,rotation:0,readyAt:now+500000});g.business.levels['paid-shore']=3;
 const original=structuredClone(g.placements),coins=g.coins;
 for(let i=0;i<10;i++){g=restore(g);assert.deepEqual(g.placements,original);assert.equal(g.coins,coins);assert.equal(g.business.levels['paid-shore'],3);}
 const zones=retainedMosaLand(g.placements,g.scenery);for(const p of original.filter(p=>p.biome==='autumn'))assert.deepEqual(mosaDryPoint(p.x,p.z,1.3,zones),{x:p.x,z:p.z});
 const island=createBiomeScene(byBiome('autumn'),{placements:g.placements,scenery:g.scenery});island.updateMatrixWorld(true);
 const hit=new T.Raycaster(new T.Vector3(24,5,0),new T.Vector3(0,-1,0)).intersectObject(island.userData.navigationSurface);
 assert.ok(hit.some(h=>h.point.y>-.1));assert.ok(!canPlace(seed(),'business-hotdog','autumn',24,0).ok);island.userData.dispose();
});
test('new outer land survives cached-client merge; genuine storage remains effective',()=>{
 let g=seed();g=placeItem(purchase(g,'business-hotdog',now),'business-hotdog','autumn',0,MOSA_RADIUS-12,0,now);const p=g.placements.at(-1);
 assert.deepEqual(restore(g).placements,g.placements);const dropped=structuredClone(g);dropped.placements=dropped.placements.filter(x=>x.id!==p.id);
 assert.ok(mergeSharedWorld(g,g,dropped).placements.some(x=>x.id===p.id));
 assert.ok(!mergeSharedWorld(g,g,storeItem(g,p.id)).placements.some(x=>x.id===p.id));
});
test('caves are hollow real arches with usable floors and stable owned IDs, not a decorative decal',async()=>{
 const {MOSA_CAVES,mosaTerrainSteps}=await import('../public/mosasaur-terrain.js');const {runSceneSteps}=await import('../public/scene-tasks.js');
 const terrain=runSceneSteps(mosaTerrainSteps());assert.equal(terrain.userData.caves.length,2);assert.equal(terrain.userData.ruins.length,2);terrain.updateMatrixWorld(true);
 for(const cave of MOSA_CAVES){
  assert.ok(cave.y<-20);assert.ok(mosaBedY(cave.x,cave.z-cave.depth/2)<cave.y);
  const ray=new T.Raycaster(new T.Vector3(cave.x,cave.y+3,cave.z+2),new T.Vector3(0,0,-1),0,cave.depth+1);
  assert.equal(ray.intersectObject(terrain).length,0,'submarine-sized entrance remains open');
 }
 terrain.traverse(m=>{if(m.isMesh){m.geometry.dispose();m.material.dispose();}});
});
