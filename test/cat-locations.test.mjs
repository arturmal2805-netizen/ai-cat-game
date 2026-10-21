import {test} from 'node:test';
import assert from 'node:assert/strict';
import {newGame,loadGame,SAVE_KEY} from '../public/economy.js';
import {BIOMES} from '../public/game-data.js';
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
