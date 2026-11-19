import test from 'node:test';import assert from 'node:assert/strict';
import {SPA_V7_ZONES,SPA_V7_SERVICES,spaV7Service,spaV7Slots,spaV7Seat,SPA_V7_RUNTIME_CONTRACT} from '../public/resort-spa-services-v7.js';
import {createResortSpaBooking} from '../public/resort-spa-booking.js';
import {createResortSpaRuntime} from '../public/resort-spa-runtime.js';
import {RESORT_PRODUCTS} from '../public/resort-spa-data.js';
test('eight physical destinations retain fourteen historical prices and real shared contacts',()=>{
 assert.equal(SPA_V7_ZONES.length,8);assert.equal(SPA_V7_SERVICES.length,14);
 for(const s of SPA_V7_SERVICES){assert.equal(s.price,RESORT_PRODUCTS.find(p=>p.id===s.id+'-session').price);for(const i of spaV7Slots(s)){const c=spaV7Seat(s,i);assert([c.x,c.y,c.z,c.approach.x,c.approach.y,c.approach.z].every(Number.isFinite));}}
 const vip=spaV7Service('resort-vip'),wet=Array.from({length:30},(_,i)=>spaV7Seat(vip,i)).filter(c=>c.pool);assert.equal(wet.length,18);assert.equal(new Set(wet.map(c=>c.pool.id)).size,8);assert.equal(wet.filter(c=>c.pool.size==='group').length,8);assert.equal(wet.filter(c=>c.pool.size==='medium').length,8);assert.equal(wet.filter(c=>c.pool.size==='private').length,2);
});
test('alias reservations share real bath occupancy including occupied cleaning and unavailable states',()=>{
 const b=createResortSpaBooking({zones:SPA_V7_ZONES,zoneFor:spaV7Service,slotsFor:spaV7Slots});
 const first=b.reserve('old','resort-jacuzzi',0,[0]);assert.equal(first.zoneId,'resort-vip');assert.equal(first.serviceId,'resort-jacuzzi');assert.equal(first.slot,0);assert(b.occupy('old',0));
 assert.notEqual(b.reserve('new','resort-vip',0,[0]).slot,0);b.release('old',1);assert.equal(b.seats.get('resort-vip:0').state,'Cleaning');assert.notEqual(b.reserve('another','resort-jacuzzi',2,[0]).slot,0);b.step(9);assert.equal(b.reserve('after-clean','resort-jacuzzi',9,[0]).slot,0);
 const a=b.reserve('amber','resort-amber',9,[10]);assert.equal(a.zoneId,'resort-midnight');assert.equal(a.slot,10);assert.notEqual(b.reserve('midnight','resort-midnight',9,[10]).slot,10);
});
test('retired service redeems its original paid receipt without selling or rebilling',()=>{
 for(const id of ['resort-nap','resort-beauty','resort-sauna','resort-meditation']){let bills=0,uses=0;const z=spaV7Service(id),p=spaV7Seat(z,0).approach;
 const r=createResortSpaRuntime({contract:SPA_V7_RUNTIME_CONTRACT,route:(a,b)=>[a,b],segmentClear:()=>true,getPaidTicket:()=> 'original-'+id,onPurchase:()=>++bills,onUse:(cat,zone,receipt)=>{assert.equal(zone,id);assert.equal(receipt,'original-'+id);uses++;return true;}});assert(r.start({catId:'cat',zoneId:id,position:p}));for(let i=0;i<900;i++)r.step(.1);assert.equal(bills,0);assert.equal(uses,1);assert(!r.has('cat'));
 const unpaid=createResortSpaRuntime({contract:SPA_V7_RUNTIME_CONTRACT,route:(a,b)=>[a,b],segmentClear:()=>true,onPurchase:()=>++bills});unpaid.start({catId:'cat',zoneId:id,position:p});for(let i=0;i<100;i++)unpaid.step(.1);assert.equal(bills,0);assert(!unpaid.has('cat'));}
});
