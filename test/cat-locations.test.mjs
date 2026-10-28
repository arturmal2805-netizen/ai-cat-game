import {test} from 'node:test';
import assert from 'node:assert/strict';
import {newGame,loadGame,SAVE_KEY} from '../public/economy.js';
import {BIOMES,byBiome} from '../public/game-data.js';
import {activeCats} from '../public/cat-roster.js';
import {captureCatLocations,normalizeCatLocations} from '../public/cat-locations.js';
import {mergeSharedWorld} from '../shared-world.mjs';
const now=Date.UTC(2026,9,21,12);
function seed(){const g=newGame(now);g.unlocked=BIOMES.map(b=>b.id);return g;}
test('the hero and residents restore their actual last local coordinates through thirty saves, without changing money or owners',()=>{
 const g=seed(),ids=['chichi',...activeCats(g).slice(0,2).map(c=>c.id)],
 actors=ids.map((id,i)=>({id,position:{x:-6+i*4,y:.16,z:-3},yaw:i*.4}));
 let saved=captureCatLocations(g,g,actors,now);
 const expected=structuredClone(saved.catLocations);
 assert.equal(captureCatLocations(saved,saved,actors,now+10),saved,'unchanged positions must not create another exit save');
 for(let i=0;i<30;i++){
  saved=loadGame({getItem:k=>k===SAVE_KEY?JSON.stringify(saved):null},now,{advance:false});
  assert.deepEqual(saved.catLocations,expected);assert.equal(saved.coins,g.coins);
 }
});
test('a new manual destination wins over the previous rendered position; temporary airborne rides do not overwrite a safe point',()=>{
 const g=seed(),id=activeCats(g)[0].id,actors=[{id,position:{x:1,y:.16,z:2},yaw:0}],
  saved=captureCatLocations(g,g,actors,now),next=structuredClone(saved);
 next.catDestinations[id]='winter';
 const moved=captureCatLocations(next,saved,actors,now+1);
 assert.equal(moved.catDestinations[id],'winter');assert.equal(moved.catLocations[id],undefined);
 const riding=captureCatLocations(saved,saved,[{...actors[0],transient:true,position:{x:1,y:50,z:2}}],now+2);
 assert.deepEqual(riding.catLocations,saved.catLocations);
 const malformed={...saved.catLocations,unknown:{...saved.catLocations[id]},[id]:{...saved.catLocations[id],x:NaN}};
 assert.deepEqual(normalizeCatLocations(malformed,g,now),{});
});
test('cached clients omitting positions preserve them, and stale atomic positions cannot mix or overwrite a newer location',()=>{
 const g=seed(),id=activeCats(g)[0].id,base=captureCatLocations(g,g,[{id,position:{x:1,y:.16,z:2},yaw:0}],now),
  current=captureCatLocations(base,base,[{id,position:{x:3,y:.16,z:4},yaw:1}],now+10),cached=structuredClone(base);
 delete cached.catLocations;
 assert.deepEqual(mergeSharedWorld(base,current,cached).catLocations,current.catLocations);
 const stale=captureCatLocations(base,base,[{id,position:{x:8,y:.16,z:5},yaw:2}],now+5);
 assert.deepEqual(mergeSharedWorld(base,current,stale).catLocations,current.catLocations);
});
test('saving a venue kitten in the same island does not mark it released or detach it from its working stand',()=>{
 const g=seed(),b=byBiome('homestead');
 g.placements.push({id:'owned-hotdog',item:'business-hotdog',biome:b.id,x:0,z:0,rotation:0,readyAt:0});
 const helper=activeCats(g).find(n=>n.venue==='business-hotdog');assert.ok(helper.venueHome);
 const saved=captureCatLocations(g,g,[{id:helper.id,position:{x:b.center[0]+1.7,y:.16,z:b.center[1]+2.1},yaw:0}],now);
 assert.equal(saved.catDestinations[helper.id],undefined);
 const restored=loadGame({getItem:k=>k===SAVE_KEY?JSON.stringify(saved):null},now,{advance:false});
 assert.equal(restored.catDestinations[helper.id],undefined);
 assert.ok(activeCats(restored).find(n=>n.id===helper.id).venueHome);
});

test('a manual island command clears the previous saved shore even when the old actor is still on a transient ride',()=>{
 const g=seed(),id=activeCats(g)[0].id,base=captureCatLocations(g,g,[{id,position:{x:1,y:.16,z:2},yaw:0}],now),next=structuredClone(base);
 next.catDestinations[id]='homestead';const moved=captureCatLocations(next,base,[{id,position:{x:1,y:5,z:2},yaw:0,transient:true}],now+1);
 assert.equal(moved.catDestinations[id],'homestead');assert.equal(moved.catLocations[id],undefined);
 const hero=structuredClone(base);hero.catPosition={biome:'homestead',x:0,z:5};hero.catLocations.chichi={biome:'moon',x:0,y:.16,z:0,yaw:0,at:now};
 const invited=captureCatLocations(hero,base,[{id:'chichi',position:{x:0,y:4,z:0},yaw:0,transient:true}],now+1);assert.equal(invited.catLocations.chichi,undefined);assert.deepEqual(invited.catPosition,hero.catPosition);
});

test('cloud merging cannot resurrect an old shore after recall or from a cached client omitting new locations',()=>{
 const g=seed(),id=activeCats(g)[0].id,base=captureCatLocations(g,g,[{id,position:{x:1,y:.16,z:2},yaw:0},{id:'chichi',position:{x:0,y:.16,z:0},yaw:0}],now),command=structuredClone(base);
 command.catDestinations[id]='atoll-park';command.catPosition={biome:'atoll-park',x:0,z:375};delete command.catLocations[id];delete command.catLocations.chichi;
 const first=mergeSharedWorld(base,base,command);assert.equal(first.catDestinations[id],'atoll-park');assert.equal(first.catLocations[id],undefined);assert.equal(first.catLocations.chichi,undefined);
 const restored=loadGame({getItem:k=>k===SAVE_KEY?JSON.stringify(first):null},now,{advance:false});assert.equal(restored.catDestinations[id],'atoll-park');assert.equal(restored.catPosition.biome,'atoll-park');
 const stale=structuredClone(base);delete stale.catLocations;
 const second=mergeSharedWorld(base,first,stale);assert.equal(second.catDestinations[id],'atoll-park');assert.equal(second.catLocations[id],undefined);
 const cached=mergeSharedWorld(base,first,base);assert.equal(cached.catDestinations[id],'atoll-park');assert.equal(cached.catLocations[id],undefined);
});

test('recall stays on the requested island through cloud acknowledgements, completed-position saves and reloads',async()=>{
 const {gatherCats}=await import('../public/adoption.js');const original=seed(),id=activeCats(original)[0].id,b=byBiome('atoll-park');
 const base=captureCatLocations(original,original,[{id,position:{x:1,y:.16,z:2},yaw:0}],now);
 const command=captureCatLocations(gatherCats(base,b.id,{ids:[id],now}),base,[{id,position:{x:1,y:5,z:2},yaw:0,transient:true}],now+1);
 let server=mergeSharedWorld(base,base,command),client=loadGame({getItem:k=>k===SAVE_KEY?JSON.stringify(server):null},now+2,{advance:false});assert.equal(client.catDestinations[id],b.id);
 const incoming=captureCatLocations(client,client,[{id,position:{x:1,y:80,z:-100},yaw:0,transient:true}],now+1000);server=mergeSharedWorld(server,server,incoming);assert.equal(server.catDestinations[id],b.id);
 const arrived=captureCatLocations(server,server,[{id,position:{x:b.center[0]+2,y:.16,z:b.center[1]+375},yaw:.5}],now+20000);
 server=mergeSharedWorld(server,server,arrived);for(let i=0;i<5;i++)server=loadGame({getItem:k=>k===SAVE_KEY?JSON.stringify(server):null},now+20000+i,{advance:false});assert.equal(server.catDestinations[id],b.id);assert.equal(server.catLocations[id].x,2);assert.equal(server.catLocations[id].z,375);
});
