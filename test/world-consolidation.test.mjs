import {test} from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import {BIOMES,byBiome,NEIGHBORS} from '../public/game-data.js';
import {newGame,loadGame,saveGame,SAVE_KEY} from '../public/economy.js';
import {migrateRetiredIsland} from '../public/world-migration.js';
import {RETIRED_BIOME_IDS,isRetiredBiome,retiredDistrict} from '../public/world-layout.js';
import {worldRoads,WORLD_ROAD_WIDTH} from '../public/world-roads.js';
import {activeCats} from '../public/cat-roster.js';
import {mergeSharedWorld} from '../shared-world.mjs';
const before=JSON.parse(fs.readFileSync(new URL('./fixtures/pre-consolidation-biomes.json',import.meta.url))),now=Date.UTC(2026,9,21,12);
test('exactly the ten requested islands disappear and every remaining theme/property stays intact',()=>{
 assert.equal(BIOMES.length,20);
 assert.deepEqual(before.filter(b=>!byBiome(b.id)).map(b=>b.id).sort(),[...RETIRED_BIOME_IDS].sort());
 for(const old of before.filter(b=>!isRetiredBiome(b.id))){
  const {center:oc,radius:or,...oldTheme}=old,{center:nc,radius:nr,...newTheme}=byBiome(old.id);
  assert.deepEqual(newTheme,oldTheme);
  if(old.id==='homestead')assert.ok(Math.abs(nr*nr/(or*or)-3)<1e-12);
  else assert.equal(nr,or);
 }
 for(let i=0;i<BIOMES.length;i++)for(const b of BIOMES.slice(i+1)){
  const a=BIOMES[i];assert.ok(Math.hypot(a.center[0]-b.center[0],a.center[1]-b.center[1])-(a.radius||11.65)-(b.radius||11.65)>4.3);
 }
});
test('all twenty islands have wide unobstructed shore roads, with no retired nodes or aquarium transit',()=>{
 const roads=worldRoads(BIOMES),seen=new Set(['moon']);assert.equal(roads.length,19);assert.ok(WORLD_ROAD_WIDTH>=4.4);
 for(const r of roads){assert.ok(seen.has(r.from));assert.ok(!seen.has(r.to));seen.add(r.to);
  assert.ok(byBiome(r.from)&&byBiome(r.to));assert.notEqual(r.from,'aquarium');
  if(r.to==='aquarium')assert.ok(r.end.z>byBiome('aquarium').center[1]+25,'cars arrive at the actual front gate');
  assert.ok(Math.hypot(r.start.x-r.end.x,r.start.z-r.end.z)<30);
 }
 assert.equal(seen.size,20);
});
function legacy(){
 const g=newGame(now);g.worldRevision=2;g.unlocked=before.map(b=>b.id);
 g.coins=50000;g.placements=[{id:'existing-center',item:'adoption-center',biome:'homestead',x:0,z:0,rotation:0,readyAt:0},
  ...RETIRED_BIOME_IDS.map((biome,i)=>({id:'old-'+biome,item:i%2?'yarn':'business-hotdog',biome,x:0,z:0,rotation:0,readyAt:0}))];
 g.catPosition={biome:'nature',x:2,z:3};
 return g;
}
function restore(g){return loadGame({getItem:k=>k===SAVE_KEY?JSON.stringify(g):null},now,{advance:false});}
test('old purchases and residents migrate once, without charges, duplicates or movement of existing homestead purchases',()=>{
 const old=legacy(),g=migrateRetiredIsland(old);
 assert.equal(g.coins,old.coins);assert.deepEqual(g.placements[0],old.placements[0]);
 for(const p of old.placements.slice(1)){
  const moved=g.placements.find(q=>q.id===p.id),offset=retiredDistrict(p.biome);
  assert.deepEqual(moved,{...p,biome:'homestead',x:p.x+offset.x,z:p.z+offset.z});
 }
 for(const cat of NEIGHBORS.filter(n=>isRetiredBiome(n.originBiome)))assert.ok(activeCats(g).some(n=>n.id===cat.id));
 assert.deepEqual(migrateRetiredIsland(g),g);let saved=g;
 for(let i=0;i<30;i++){
  saved=restore(saved);assert.equal(saved.placements.length,old.placements.length);
  assert.deepEqual(saved.placements,g.placements);assert.equal(saved.coins,old.coins);
 }
});
test('cached phones cannot erase relocated outer purchases, and deliberate moves still merge',()=>{
 const old=legacy(),base=restore(old),current=structuredClone(base),cached=structuredClone(base);
 cached.placements=cached.placements.filter(p=>Math.hypot(p.x,p.z)<130);
 const merged=mergeSharedWorld(base,current,cached);
 assert.deepEqual(merged.placements,base.placements);
 const move=structuredClone(old);move.placements.find(p=>p.id==='old-lotus').x+=2;
 const result=mergeSharedWorld(old,current,move);
 assert.equal(result.placements.find(p=>p.id==='old-lotus').x,retiredDistrict('lotus').x+2);
 assert.equal(result.placements.length,base.placements.length);
});
