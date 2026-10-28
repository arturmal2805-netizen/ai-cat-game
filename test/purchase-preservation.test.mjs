import {test} from 'node:test';import assert from 'node:assert/strict';
import {newGame,purchase,placeItem,findSpace,storeItem,loadGame,saveGame,SAVE_KEY} from '../public/economy.js';
import {xpForLevel} from '../public/progression.js';import {mergeSharedWorld} from '../shared-world.mjs';import {preserveReferenceOwnership} from '../public/purchase-preservation.js';
import {ensureJobCity} from '../public/jobcity-system.js';
const now=Date.now(),item='slide-atoll-mega-loops',owned=g=>(g.inventory[item]||0)+g.placements.filter(p=>p.item===item).length;
function seed(){const g=newGame(now);g.coins=1000000;g.progression.xp=xpForLevel(30);g.unlocked.push('homestead');return g;}
function reload(g){const m=new Map(),s={getItem:k=>m.get(k)||null,setItem:(k,v)=>m.set(k,v)};assert.equal(saveGame(s,g),true);return loadGame(s,now,{advance:false});}
function built(){let g=purchase(seed(),item,now),p=findSpace(g,item,'homestead');g=placeItem(g,item,'homestead',p.x,p.z,0,now);g.placements.at(-1).readyAt=0;return g;}
test('a paid placement rejected by shore, locked land or collisions goes to the bag with its original timer instead of vanishing',()=>{
 for(const reason of ['shore','locked','collision']){const g=built(),p=g.placements.at(-1);if(reason==='shore')p.x=1000;if(reason==='locked')g.unlocked=g.unlocked.filter(id=>id!=='homestead');if(reason==='collision')g.placements.unshift({id:'older-mouse',item:'mouse',biome:'homestead',x:p.x,z:p.z,rotation:0,readyAt:0});const restored=reload(g);assert.equal(owned(restored),1,reason);assert.equal(restored.inventory[item],1);assert.equal(restored.builtInventory[item],1);assert.equal(restored.coins,g.coins);assert.equal(restored.relocatedPurchases.find(r=>r.id===p.id).item,item);assert.equal(reload(restored).inventory[item],1);}
 const g=built();g.placements.at(-1).x=1000;g.placements.at(-1).readyAt=now+100000;const r=reload(g);assert.equal(r.builtInventory[item],0);const q=findSpace(r,item,'homestead'),placed=placeItem(r,item,'homestead',q.x,q.z,0,now);assert.equal(placed.placements.at(-1).readyAt,now+100000);
});
test('forty store/replace/restart cycles preserve one finished Mega Loops, balance, XP and ownership receipt',()=>{
 let g=reload(built());const coins=g.coins,xp=g.progression.xp;
 for(let i=0;i<40;i++){g=reload(storeItem(g,g.placements.find(p=>p.item===item).id,now));assert.equal(owned(g),1);assert.equal(g.builtInventory[item],1);const p=findSpace(g,item,'homestead');g=reload(placeItem(g,item,'homestead',p.x,p.z,0,now));assert.equal(g.placements.find(p=>p.item===item).readyAt,0);assert.equal(owned(g),1);assert.equal(g.coins,coins);assert.equal(g.progression.xp,xp);assert.equal(g.referenceOwnership[item].count,1);}
});
test('legacy purchase proof recovers a missing attraction once without a charge or granting an unbought slide',()=>{
 const g=built();g.placements=g.placements.filter(p=>p.item!==item);g.inventory[item]=0;delete g.referenceOwnership;const r=reload(g);assert.equal(owned(r),1);assert.equal(r.coins,g.coins);assert.equal(r.progression.xp,g.progression.xp);for(let i=0;i<10;i++)assert.equal(owned(reload(r)),1);assert.equal(owned(reload(seed())),0);
});
test('durable receipts recover the exact owned and completed-copy counts after a filtered snapshot',()=>{
 const g=built();g.referenceOwnership={[item]:{count:2,built:2}};g.placements=g.placements.filter(p=>p.item!==item);g.inventory[item]=0;g.builtInventory[item]=0;const r=reload(g);assert.equal(r.inventory[item],2);assert.equal(r.builtInventory[item],2);assert.equal(owned(mergeSharedWorld(g,g,structuredClone(g))),2);assert.equal(owned(mergeSharedWorld(r,r,structuredClone(g))),2);
});
test('two phones buying the same attraction retain two copies and exact once-only payments',()=>{
 const base=seed(),one=purchase(base,item,now),two=purchase(base,item,now);const r=mergeSharedWorld(base,one,two);assert.equal(owned(r),2);assert.equal(r.referenceOwnership[item].count,2);assert.equal(r.coins,500000);assert.equal(owned(reload(r)),2);
});
test('a cached client dropping a placed slide keeps its original identity and cannot erase paid completion receipts',()=>{
 const base=reload(built()),old=structuredClone(base);old.placements=old.placements.filter(p=>p.item!==item);delete old.inventory[item];delete old.builtInventory[item];delete old.referenceOwnership;
 const r=mergeSharedWorld(base,base,old);assert.deepEqual(r.placements,base.placements);assert.equal(owned(r),1);assert.equal(r.referenceOwnership[item].built,1);
});
test('an unchanged healthy world is returned by identity and ownership bookkeeping never touches native graphics',()=>{
 const g=preserveReferenceOwnership(built(),now);assert.equal(preserveReferenceOwnership(g,now),g);const copy=structuredClone(g);assert.deepEqual(preserveReferenceOwnership(g,now),copy);
});
test('matching-world backups retain completed construction, while another accounts backup cannot invent ownership',()=>{
 let original=built();original.unlocked.push('jobcity');original=ensureJobCity(original,now);delete original.referenceOwnership;
 const missing=structuredClone(original);missing.placements=missing.placements.filter(p=>p.item!==item);missing.inventory[item]=0;missing.builtInventory[item]=0;
 const m=new Map([[SAVE_KEY,JSON.stringify(missing)],[SAVE_KEY+':backup',JSON.stringify(original)]]),storage={getItem:k=>m.get(k)||null};
 const restored=loadGame(storage,now,{advance:false});assert.equal(restored.inventory[item],1);assert.equal(restored.builtInventory[item],1);assert.equal(restored.coins,missing.coins);
 original.jobCity.epoch='another-world';m.set(SAVE_KEY+':backup',JSON.stringify(original));const unrelated=loadGame(storage,now,{advance:false});assert.equal(unrelated.inventory[item],1);assert.equal(unrelated.builtInventory[item],0);
});
