import {test} from 'node:test';
import assert from 'node:assert/strict';
import {newGame,loadGame,saveGame,purchase,SAVE_KEY} from '../public/economy.js';
import {CATALOG} from '../public/game-data.js';
import {WATER_RIDES} from '../public/water-ride-data.js';
import {SHOWCASE_WATER_RIDES} from '../public/showcase-water-data.js';
import {migrateRetiredAttractions} from '../public/retired-attractions.js';
import {mergeSharedWorld,SharedConflict} from '../shared-world.mjs';
import {readSaveBody,SaveVault} from '../save-vault.mjs';

const now=1793700000000,id='ride-water-jungle-coaster',price=225000;
function legacy(){
 const g=newGame(now);g.coins=750000;g.unlocked.push('homestead');
 g.inventory[id]=1;g.builtInventory[id]=1;g.progression.discoveries.push(id);
 g.placements.push({id:'old-coaster',item:id,biome:'homestead',x:-100,z:-100,rotation:0,readyAt:now+3600000});
 g.referenceOwnership={[id]:{count:2,built:1}};
 g.business.accounts['old-coaster']={coins:0};g.business.levels['old-coaster']=2;
 g.relocatedPurchases=[{item:id,readyAt:0}];return g;
}
function reload(g){const data=new Map([[SAVE_KEY,JSON.stringify(g)]]),storage={getItem:k=>data.get(k)||null,setItem:(k,v)=>data.set(k,v)};return loadGame(storage,now,{advance:false});}
function absent(g){
 assert.ok(g.placements.every(p=>p.item!==id));assert.equal(g.inventory[id],undefined);
 assert.equal(g.builtInventory[id],undefined);assert.equal(g.referenceOwnership[id],undefined);
 assert.ok(g.relocatedPurchases.every(p=>p.item!==id));
 assert.equal(g.business.accounts['old-coaster'],undefined);assert.equal(g.business.levels['old-coaster'],undefined);
}
test('Jungle Coaster is absent from the catalogue/water registry and cannot be bought; eight released products retain their cells/deadlines',()=>{
 const g=newGame(now),snapshot=structuredClone(g);
 assert.equal(CATALOG.some(s=>s.id===id),false);assert.equal(WATER_RIDES.some(s=>s.id===id),false);
 assert.throws(()=>purchase(g,id,now),/предмета нет/);assert.deepEqual(g,snapshot);
 assert.deepEqual(SHOWCASE_WATER_RIDES.map(s=>s.referenceCell.index),[1,4,5,6,7,8,9,10]);
 assert.deepEqual(SHOWCASE_WATER_RIDES.map(s=>s.buildMinutes),[60,75,80,85,90,95,100,105]);
});
test('legacy bag and construction are removed, paid quantity is refunded once and unrelated progress stays exact through twenty reloads',()=>{
 const old=legacy(),snapshot=structuredClone(old),expected=reload(newGame(now));let g=reload(old);
 absent(g);assert.equal(g.coins,old.coins+price*2);assert.deepEqual(old,snapshot);
 assert.deepEqual(g.cat,expected.cat);assert.deepEqual(g.farm,expected.farm);assert.deepEqual(g.zoo,old.zoo);
 assert.deepEqual(g.placements,expected.placements);const stable=structuredClone(g);
 for(let i=0;i<20;i++){const data=new Map(),s={getItem:k=>data.get(k)||null,setItem:(k,v)=>data.set(k,v)};assert.equal(saveGame(s,g),true);g=loadGame(s,now,{advance:false});absent(g);assert.equal(g.coins,stable.coins);assert.deepEqual(g.retiredAttractions,stable.retiredAttractions);}
 assert.equal(migrateRetiredAttractions(g),g);
});
test('a receipt or historical purchase discovery recovers only proven ownership; never invent a refund for an unbought item',()=>{
 for(const proof of ['receipt','discovery','placement','bag']){
  const g=newGame(now);g.coins=0;
  if(proof==='receipt')g.referenceOwnership={[id]:{count:3,built:1}};
  if(proof==='discovery')g.progression.discoveries.push(id);
  if(proof==='placement')g.placements.push({id:'proof',item:id,biome:'homestead',x:0,z:0,rotation:0,readyAt:0});
  if(proof==='bag')g.inventory[id]=2;
  const r=reload(g),count=proof==='receipt'?3:proof==='bag'?2:1;
  assert.equal(r.coins,price*count);assert.equal(reload(r).coins,r.coins);absent(r);
 }
 const g=newGame(now);assert.equal(migrateRetiredAttractions(g),g);assert.equal(reload(g).retiredAttractions,undefined);
});
test('a full wallet retains unpaid refund credit and releases it only as room becomes available',()=>{
 const old=legacy();old.coins=10000000;let g=reload(old);
 assert.equal(g.coins,10000000);assert.equal(g.retiredAttractions[id].credited,0);absent(g);
 g.coins-=100000;g=reload(g);assert.equal(g.coins,10000000);assert.equal(g.retiredAttractions[id].credited,100000);
 g.coins-=400000;g=reload(g);assert.equal(g.coins,9950000);assert.equal(g.retiredAttractions[id].credited,450000);assert.equal(reload(g).coins,g.coins);
});
test('two cached devices cannot resurrect the removed placement or pay the same refund twice',()=>{
 const base=legacy(),one=reload(base),two=structuredClone(base);two.coins-=100;
 let merged=mergeSharedWorld(base,one,two);absent(merged);assert.equal(merged.coins,base.coins+price*2-100);
 assert.equal(merged.retiredAttractions[id].credited,price*2);
 const cached=structuredClone(merged);delete cached.retiredAttractions;cached.progression.discoveries.push(id);cached.coins-=200;
 merged=mergeSharedWorld(merged,merged,cached);assert.equal(merged.coins,base.coins+price*2-300);absent(reload(merged));
 const paidAgain=structuredClone(base);paidAgain.inventory[id]++;
 assert.throws(()=>mergeSharedWorld(base,one,paidAgain),SharedConflict);
});
test('concurrent partial refunds share one permanent credit ceiling',()=>{
 const base=reload({...legacy(),coins:10000000}),one=structuredClone(base),two=structuredClone(base);
 one.coins-=300000;two.coins-=300000;
 const merged=mergeSharedWorld(base,reload(one),reload(two));
 assert.equal(merged.coins,9850000);assert.equal(merged.retiredAttractions[id].credited,450000);assert.equal(reload(merged).coins,9850000);absent(merged);
});
test('corrupt retirement receipts choose a valid local backup and are rejected by both local and server writes',async()=>{
 const good=reload(legacy()),bad=structuredClone(good);bad.retiredAttractions[id].credited=999999;
 const data=new Map([[SAVE_KEY,JSON.stringify(bad)],[SAVE_KEY+':backup',JSON.stringify(good)]]),storage={getItem:k=>data.get(k)||null,setItem:(k,v)=>data.set(k,v)};
 assert.equal(loadGame(storage,now,{advance:false}).coins,good.coins);assert.equal(saveGame(storage,bad),false);
 assert.throws(()=>mergeSharedWorld(good,good,bad),SharedConflict);
 await assert.rejects(()=>readSaveBody(new Request('https://local.invalid/api/save',{method:'PUT',body:JSON.stringify({game:bad,expectedRevision:1,mutationId:'retired-test-1'})})),/SAVE_INVALID/);
});
test('legacy noncooperative cloud writes retain the current refund archive and lost acknowledgements never repay it',async()=>{
 const data=new Map(),get=async k=>structuredClone(data.get(k)),put=async(k,v)=>data.set(k,structuredClone(v)),vault=new SaveVault({storage:{get,transaction:fn=>fn({get,put})}});
 const send=(game,revision,mutationId)=>vault.fetch(new Request('https://local.invalid/internal-save',{method:'PUT',body:JSON.stringify({game,expectedRevision:revision,mutationId})})).then(r=>r.json());
 const original=legacy(),first=await send(original,0,'retirement-first');assert.equal(first.revision,1);
 const stored=await vault.fetch(new Request('https://local.invalid/internal-save')).then(r=>r.json()),cached=structuredClone(stored.game);
 delete cached.retiredAttractions;cached.progression.discoveries.push(id);cached.coins-=100;
 const next=await send(cached,1,'retirement-next');assert.equal(next.revision,2);
 await send(cached,1,'retirement-next');
 const after=await vault.fetch(new Request('https://local.invalid/internal-save')).then(r=>r.json());
 assert.equal(after.game.coins,original.coins+price*2-100);assert.deepEqual(after.game.retiredAttractions,stored.game.retiredAttractions);absent(after.game);
});
test('the photographed Crystal Vortex is retired independently; both original prices survive mixed ownership and twenty reloads',()=>{
 const vortex='ride-water-crystal-vortex',g=legacy();g.inventory[vortex]=1;g.referenceOwnership[vortex]={count:1,built:0};
 assert.equal(CATALOG.some(s=>s.id===vortex),false);assert.equal(WATER_RIDES.some(s=>s.id===vortex),false);assert.throws(()=>purchase(g,vortex,now),/предмета нет/);
 let loaded=reload(g);assert.equal(loaded.coins,1385000);assert.equal(loaded.inventory[vortex],undefined);assert.deepEqual(loaded.retiredAttractions[vortex],{count:1,credited:185000});
 for(let i=0;i<20;i++){loaded=reload(loaded);assert.equal(loaded.coins,1385000);assert.equal(loaded.retiredAttractions[vortex].credited,185000);absent(loaded);}
});
test('cached clients cannot buy a retired attraction underneath an already credited archive, including direct cloud saves',async()=>{
 for(const retired of [id,'ride-water-crystal-vortex']){
  const old=newGame(now);old.coins=750000;old.inventory[retired]=1;const base=reload(old),incoming=structuredClone(base);incoming.inventory[retired]=1;incoming.coins-=retired===id?225000:185000;
  assert.throws(()=>mergeSharedWorld(base,base,incoming),SharedConflict);
  const data=new Map(),get=async k=>structuredClone(data.get(k)),put=async(k,v)=>data.set(k,structuredClone(v)),vault=new SaveVault({storage:{get,transaction:fn=>fn({get,put})}}),send=(game,revision,mutationId)=>vault.fetch(new Request('https://local.invalid/internal-save',{method:'PUT',body:JSON.stringify({game,expectedRevision:revision,mutationId})})).then(r=>r.json());
  await send(base,0,'retired-current');const rejected=await send(incoming,1,'retired-stale-purchase');assert.equal(rejected.conflict,true);assert.equal(rejected.revision,1);assert.equal(rejected.game.coins,base.coins);
  const stored=await vault.fetch(new Request('https://local.invalid/internal-save')).then(r=>r.json());assert.equal(stored.revision,1);assert.equal(stored.game.coins,base.coins);assert.equal(stored.game.inventory[retired],undefined);
 }
});
test('two retirement ledgers preserve deferred mixed-price refunds across capped concurrent wallets',()=>{
 const g=legacy();g.coins=10000000;g.inventory['ride-water-crystal-vortex']=1;
 const base=reload(g),one=structuredClone(base),two=structuredClone(base);one.coins-=500000;two.coins-=500000;
 const merged=mergeSharedWorld(base,reload(one),reload(two));assert.equal(merged.coins,9550000);assert.equal(merged.retiredAttractions[id].credited,450000);assert.equal(merged.retiredAttractions['ride-water-crystal-vortex'].credited,100000);const restored=reload(merged);assert.equal(restored.coins,9635000);assert.equal(restored.retiredAttractions['ride-water-crystal-vortex'].credited,185000);assert.equal(reload(restored).coins,9635000);
});
