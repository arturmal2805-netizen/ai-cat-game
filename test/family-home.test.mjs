import test from 'node:test';
import assert from 'node:assert/strict';
import {newGame,loadGame,saveGame,SAVE_KEY} from '../public/economy.js';
import {ensureJobCity} from '../public/jobcity-system.js';
import {buyCatHome,applyHousingDecisions,housingSnapshotValid} from '../public/housing-system.js';
import {applyFamilyDecisions,reconcileFamilyHomes,familyHome} from '../public/family-system.js';
import {cityLifeChoices} from '../city-life-ai.mjs';
import {jobAIState} from '../public/jobcity-system.js';
import {mergeSharedWorld} from '../shared-world.mjs';
const now=Date.UTC(2026,9,21,12),pair={male:'pixel',female:'chichi',reason:'Разом люблять затишок'};
function seed(){const g=newGame(now);g.unlocked.push('jobcity');const n=ensureJobCity(g,now);for(const p of Object.values(n.jobCity.profiles))p.coins=100000;return n;}
const buy=(g,id,at=now)=>buyCatHome(g,id,'home-sage',`buy-${id}-${g.jobCity.profiles[id].purchaseCount+1}`,{},at);
function legacy(){let g=buy(seed(),'chichi');g=buy(g,'pixel',now+1000);const family=applyFamilyDecisions(g,13,[pair]).family;g.family=family;return g;}
const reload=g=>loadGame({getItem:k=>k===SAVE_KEY?JSON.stringify(g):null},now,{advance:false});
test('Chichi and Pixel keep the first home; the extra house is archived, and balances and purchase history stay untouched through thirty reloads',()=>{
 const raw=legacy(),paid=structuredClone(raw.jobCity),first=raw.housing.homes['house-chichi-1'],removed=raw.housing.homes['house-pixel-1'];let g=reload(raw);
 assert.deepEqual(Object.keys(g.housing.homes),[first.id]);assert.equal(familyHome(g,'pixel').id,first.id);
 assert.equal(g.housing.residences.pixel,first.id);assert.equal(g.housing.residences.chichi,first.id);
 assert.equal(g.housing.homes[first.id].roommate,'pixel');assert.deepEqual(g.housing.retiredHomes[removed.id],{...removed,replacedBy:first.id});
 assert.deepEqual(g.jobCity,paid);const expected=structuredClone(g.housing);
 for(let i=0;i<30;i++){g=reload(g);assert.deepEqual(g.housing,expected);assert.deepEqual(g.jobCity,paid);assert.ok(housingSnapshotValid(g.housing));}
});
test('manual and repeated after-work AI requests from either spouse cannot charge or build a second family home',()=>{
 let g=applyFamilyDecisions(seed(),13,[pair]);g=buy(g,'pixel');const first=structuredClone(g.housing),money=Object.fromEntries(Object.values(g.jobCity.profiles).map(p=>[p.id,[p.coins,p.spentTotal,p.purchaseCount]]));
 for(const id of ['chichi','pixel'])assert.equal(buy(g,id),g);
 for(let day=14;day<35;day++)g=applyHousingDecisions(g,day,[{id:'chichi',house:{type:'home-sage'}},{id:'pixel',house:{type:'home-lavender'}}],now+day*1440000);
 assert.deepEqual(g.housing,first);for(const [id,values]of Object.entries(money))assert.deepEqual([g.jobCity.profiles[id].coins,g.jobCity.profiles[id].spentTotal,g.jobCity.profiles[id].purchaseCount],values);
});
test('both pre-existing homes merge at family formation by purchase time, independent of owner, active-home choice and object order',()=>{
 let g=buy(seed(),'pixel',now-1000);g=buy(g,'chichi',now);g.housing.homes=Object.fromEntries(Object.entries(g.housing.homes).reverse());g=applyFamilyDecisions(g,13,[pair]);
 assert.deepEqual(Object.keys(g.housing.homes),['house-pixel-1']);assert.equal(g.housing.residences.chichi,'house-pixel-1');
 assert.equal(reconcileFamilyHomes(g,'house-chichi-1'),g);assert.equal(g.housing.residences.pixel,'house-pixel-1');
});
test('a cached phone cannot resurrect an archived home or its former resident over twenty merges',()=>{
 const raw=legacy(),g=reload(raw),expected=structuredClone(g.housing),money=structuredClone(g.jobCity);let current=g;
 for(let i=0;i<20;i++){const old=structuredClone(raw);old.lastVisit=raw.lastVisit;current=mergeSharedWorld(raw,current,old);current=reload(current);assert.deepEqual(current.housing,expected);assert.deepEqual(current.jobCity,money);}
 const cached=structuredClone(raw);delete cached.family;delete cached.housing;
 assert.deepEqual(mergeSharedWorld(raw,current,cached).housing,expected);
});
test('simultaneous first purchases by different spouses reject the second entire transaction without mutating either wallet',()=>{
 const base=applyFamilyDecisions(seed(),13,[pair]),a=buy(base,'chichi'),b=buy(base,'pixel'),snapshots=[structuredClone(base),structuredClone(a),structuredClone(b)];
 for(const [one,two]of [[a,b],[b,a]])assert.throws(()=>mergeSharedWorld(base,one,two),/спільний дім/);
 assert.deepEqual([base,a,b],snapshots);
});
test('single cats retain unrelated property; a corrupted archive falls back to the verified backup',()=>{
 const raw=legacy();let g=buy(raw,'luna',now+5000);g=reload(g);assert.ok(g.housing.homes['house-luna-1']);
 const bad=structuredClone(g);bad.housing.retiredHomes['house-pixel-1'].replacedBy='missing-house';assert.equal(housingSnapshotValid(bad.housing),false);
 const storage={getItem:k=>k===SAVE_KEY?JSON.stringify(bad):k===SAVE_KEY+':backup'?JSON.stringify(g):null};assert.deepEqual(loadGame(storage,now,{advance:false}).housing,g.housing);
 const map=new Map(),local={getItem:k=>map.get(k)||null,setItem:(k,v)=>map.set(k,v)};assert.ok(saveGame(local,g));assert.deepEqual(loadGame(local,now,{advance:false}).housing,g.housing);
});

test('the existing evening batch excludes both members of a housed family from housing AI choices',()=>{
 let g=applyFamilyDecisions(seed(),13,[pair]);g=buy(g,'chichi');
 const request={...jobAIState(g,now+14*1440000),phase:'evening'};
 const choices=cityLifeChoices(request),buyers=choices.buyers.map(i=>request.cats[i].id);
 assert.ok(!buyers.includes('chichi'));assert.ok(!buyers.includes('pixel'));assert.ok(buyers.includes('luna'));
});

test('new residential sections are free, use paid cat purchase receipts, never unlock other biomes, and survive reload without charging for land',async()=>{
 const {housingSectionCount,housingSectionIndex,HOUSING_SECTION_PITCH}=await import('../public/housing-data.js');
 let g=seed();const playerCoins=g.coins,diamonds=g.diamonds,before=g.unlocked.slice(),wallet=g.jobCity.profiles.chichi.coins;
 for(let i=0;i<25;i++){g=buy(g,'chichi',now+i);assert.equal(housingSectionCount(g.housing),Math.floor(i/12)+1);}
 assert.equal(g.coins,playerCoins);assert.equal(g.diamonds,diamonds);assert.equal(g.jobCity.profiles.chichi.coins,wallet-25*1600);
 assert.deepEqual(g.unlocked,[...before,'cat-homes']);assert.equal(Object.values(g.housing.homes).every(h=>h.purchaseId.startsWith('buy-chichi-')&&h.price===1600),true);
 assert.equal(housingSectionIndex(-HOUSING_SECTION_PITCH,g.housing),1);assert.equal(housingSectionIndex(-2*HOUSING_SECTION_PITCH,g.housing),2);
 const snapshot=structuredClone(g.housing);for(let i=0;i<20;i++){g=reload(g);assert.deepEqual(g.housing,snapshot);assert.equal(g.coins,playerCoins);assert.equal(g.jobCity.profiles.chichi.coins,wallet-25*1600);}
 g=applyFamilyDecisions(g,13,[pair]);assert.equal(Object.keys(g.housing.homes).length,1);assert.equal(housingSectionCount(g.housing),3,'retiring duplicate houses never removes already expanded free land');
 assert.equal(housingSectionIndex(-2*HOUSING_SECTION_PITCH,reload(g).housing),2);
});
