import {test} from 'node:test';import assert from 'node:assert/strict';
import {newGame,saveGame,loadGame} from '../public/economy.js';
import {newZoo,normalizeZoo,mergeZoo,openZooExhibit} from '../public/zoo-system.js';
import {ZOO_EXHIBITS,ZOO_ANIMALS,ZOO_ID} from '../public/zoo-data.js';
import {zooAnimalId,ZOO_GUEST_MS,mergeZooGuests,normalizeZooGuests} from '../public/zoo-guest-data.js';
import {startZooGuest,endZooGuest,activeZooGuests} from '../public/zoo-guest-visits.js';
import {zooGuestFrame,zooHostPlayFrame} from '../public/zoo-guest-motion.js';
import {pickZooGuestHouse} from '../public/zoo-picking.js';
import {housingPlot,HOUSING_CENTER} from '../public/housing-data.js';
const now=1780000000000;
const seed=()=>{let g=newGame(now);g.unlocked.push(ZOO_ID);g.coins=300000;for(const e of ZOO_EXHIBITS.slice(1))g=openZooExhibit(g,e.id,now+e.index);g.housing={version:1,homes:{h:{id:'h',owner:'chichi',roommate:'cat2',plot:0}},residences:{chichi:'h',cat2:'h'}};return g;};
test('all 21 individual animals can visit without payments, extra copies or renewed deadlines',()=>{let g=seed();const base=structuredClone(g);for(const e of ZOO_EXHIBITS)for(let i=0;i<ZOO_ANIMALS[e.species].count;i++){const key=zooAnimalId(e.species,i);g=startZooGuest(g,key,'h','visit-'+key,now);const retry=startZooGuest(g,key,'h','visit-'+key,now+600);assert.equal(retry,g);assert.equal(g.zoo.guestVisits[key].endsAt,now+ZOO_GUEST_MS);assert.throws(()=>startZooGuest(g,key,'h','second-'+key,now+700));}assert.equal(activeZooGuests(g,now+1).length,21);assert.equal(activeZooGuests(g,now+ZOO_GUEST_MS).length,0);assert.equal(g.coins,base.coins);assert.deepEqual(g.housing,base.housing);assert.deepEqual(base.zoo.receipts,g.zoo.receipts);assert.equal(Object.keys(g.zoo.guestVisits).length,21);});
test('closed habitats, unknown animals and uninhabited investment houses cannot bypass rules',()=>{const g=seed();delete g.zoo.receipts['zoo-gorilla'];assert.throws(()=>startZooGuest(g,'zoo-gorilla-0','h','a',now));assert.throws(()=>startZooGuest(g,'zoo-elephant-99','h','a',now));delete g.housing.residences.chichi;delete g.housing.residences.cat2;assert.throws(()=>startZooGuest(g,'zoo-elephant-0','h','a',now));});
test('legacy saves/clients retain visits; retries and concurrent destinations cannot create a second visit',()=>{const b=seed().zoo,game=seed(),one=startZooGuest(game,'zoo-elephant-0','h','one',now);assert.deepEqual(mergeZoo(b,one.zoo,b),one.zoo);assert.deepEqual(mergeZoo(b,one.zoo,one.zoo),one.zoo);const two=startZooGuest(game,'zoo-elephant-0','h','two',now);assert.throws(()=>mergeZoo(b,one.zoo,two.zoo));const cancelled=endZooGuest(one,'zoo-elephant-0',now+1);assert.deepEqual(mergeZoo(b,cancelled.zoo,one.zoo),cancelled.zoo);assert.deepEqual(normalizeZoo(null),newZoo());assert.equal(Object.keys(normalizeZooGuests({bad:{}})).length,0);});
test('cancellation, removed houses, moving residents and elapsed offline time restore the enclosure',()=>{const g=startZooGuest(seed(),'zoo-elephant-0','h','one',now);assert.equal(activeZooGuests(endZooGuest(g,'zoo-elephant-0',now+2),now+3).length,0);delete g.housing.homes.h;assert.equal(activeZooGuests(g,now+1).length,0);});
test('every species has play, sleep, bath and work waiting with bounded household slots and no new AI',()=>{const g=seed(),home=g.housing.homes.h;for(const e of ZOO_EXHIBITS){const v=startZooGuest(g,zooAnimalId(e.species,0),'h','v',now).zoo.guestVisits[zooAnimalId(e.species,0)];const frames=[20,65,115].map(t=>zooGuestFrame(v,home,now+t*1000));assert.deepEqual(frames.map(f=>f.kind),['play','sleep','bath']);for(const f of frames){assert.ok(Number.isFinite(f.frame)&&f.frame>=0&&f.frame<400);assert.ok(f.fit>0);}assert.equal(zooGuestFrame(v,home,now+115000,{working:true}).kind,'wait');}const v={startedAt:now},p=housingPlot(0),seat={x:p.x-3,y:1.12,z:p.z+.65},visit={phase:'relax',seatIndex:0,seat};let previous=null;for(let t=0;t<42;t+=.016){const f=zooHostPlayFrame(visit,0,now+t*1000,v);if(!f)break;if(previous)assert.ok(Math.hypot(f.position.x-previous.x,f.position.y-previous.y,f.position.z-previous.z)<.04);previous=f.position;}assert.equal(zooHostPlayFrame(visit,0,now+42000,v),null);});
test('house drops use actual owned plot footprints, including expanded sections',()=>{const g=seed(),h=g.housing.homes.h;h.plot=37;const p=housingPlot(h.plot);assert.equal(pickZooGuestHouse({x:HOUSING_CENTER[0]+p.x,z:HOUSING_CENTER[1]+p.z},g),'h');assert.equal(pickZooGuestHouse({x:HOUSING_CENTER[0]+p.x+6,z:HOUSING_CENTER[1]+p.z},g),null);});

test('real paid house and visit survive repeated storage loads and shared merges without changing balances',async()=>{
 const {ensureJobCity}=await import('../public/jobcity-system.js'),{buyCatHome}=await import('../public/housing-system.js'),{HOUSE_TYPES}=await import('../public/housing-data.js'),{mergeSharedWorld}=await import('../shared-world.mjs');
 let g=newGame(now);g.unlocked.push('jobcity',ZOO_ID);g=ensureJobCity(g,now);g.jobCity.profiles.chichi.coins=10000;g=buyCatHome(g,'chichi',HOUSE_TYPES[0].id,'paid-guest-home-1',{},now);const h=Object.values(g.housing.homes)[0],base=structuredClone(g);g=startZooGuest(g,'zoo-elephant-0',h.id,'saved-guest',now);const expected=structuredClone(g),m=new Map(),storage={getItem:k=>m.get(k)||null,setItem:(k,v)=>m.set(k,v)};
 for(let i=0;i<12;i++){assert.equal(saveGame(storage,g),true);g=loadGame(storage,now,{advance:false});assert.deepEqual(g.zoo,expected.zoo);assert.deepEqual(g.housing,expected.housing);assert.equal(g.jobCity.profiles.chichi.coins,expected.jobCity.profiles.chichi.coins);}
 assert.deepEqual(mergeSharedWorld(base,g,base).zoo,g.zoo);
 const finished=endZooGuest(g,'zoo-elephant-0',now+1);assert.deepEqual(mergeSharedWorld(g,finished,g).zoo,finished.zoo);assert.equal(activeZooGuests(g,now+ZOO_GUEST_MS).length,0);
});

test('all guest phase boundaries have continuous positions, bounded poses and smooth blend weights',()=>{
 const g=seed(),h=g.housing.homes.h;
 for(const e of ZOO_EXHIBITS){const v={animalId:zooAnimalId(e.species,0),startedAt:now};for(const edge of [42,50,91,99,136,144,186,235]){const a=zooGuestFrame(v,h,now+(edge-.001)*1000),b=zooGuestFrame(v,h,now+(edge+.001)*1000);assert.ok(Math.hypot(a.position.x-b.position.x,a.position.y-b.position.y,a.position.z-b.position.z)<.01,e.species+':'+edge);assert.ok(a.blend>=0&&a.blend<=1&&b.blend>=0&&b.blend<=1);}}
});

test('asynchronously invited animals never share the household bathtub',()=>{
 const h=seed().housing.homes.h,records=[{animalId:'zoo-elephant-0',startedAt:now},{animalId:'zoo-otter-0',startedAt:now+150000},{animalId:'zoo-gorilla-0',startedAt:now+330000}];
 for(let age=330;age<720;age+=.25){const time=now+age*1000,bathSlot=Math.floor((time-now)/144000)%records.length,frames=records.map((v,slot)=>zooGuestFrame(v,h,time,{slot,count:records.length,bathSlot}));assert.ok(frames.filter(f=>f.kind==='bath').length<=1);}
});
