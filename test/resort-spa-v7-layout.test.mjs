import test from 'node:test';
import assert from 'node:assert/strict';
import {SPA_PALACE,SPA_V6_ROOMS,SPA_V7_ROOMS,SPA_RETIRED_ROOMS,spaRoomDestination,spaTicketDestination,spaRoomMeasurement,spaPalaceContains} from '../public/resort-spa-layout-v7.js';

test('V7 has eight actual room destinations, preserving fourteen historical service addresses',()=>{
 assert.equal(SPA_V7_ROOMS.length,8);assert.equal(SPA_V6_ROOMS.length,14);
 assert.equal(new Set(SPA_V7_ROOMS.map(z=>z.id)).size,8);
 assert.equal(spaRoomDestination('resort-amber'),'resort-midnight');
 assert.equal(spaRoomDestination('resort-jacuzzi'),'resort-vip');
 for(const id of SPA_RETIRED_ROOMS){assert.equal(spaRoomDestination(id),null);assert.equal(spaTicketDestination(id),'resort-midnight');}
 assert.equal(spaTicketDestination('unrelated'),null);
 assert.deepEqual(SPA_V7_ROOMS.filter(z=>z.level===0).map(z=>z.key).sort(),['cafe','thermal','waterfall']);
 assert.deepEqual(SPA_V7_ROOMS.filter(z=>z.level===1).map(z=>z.key).sort(),['aroma','cabana','massage']);
});
test('the enlarged night halls have measured area and real vertical clearance',()=>{
 const midnight=spaRoomMeasurement('midnight'),vip=spaRoomMeasurement('vip');
 assert(midnight.areaRatio>=2&&midnight.areaRatio<2.4);assert(vip.areaRatio>=2);
 assert(midnight.after.minimumCeiling>=10);assert(vip.after.minimumCeiling>=10);
 assert(SPA_PALACE.rise-SPA_PALACE.ceilingMinimum>=.4);
 // The access shaft remains outside the main floor plates. New floors must
 // not cap a moving cabin merely because the façade became one building.
 assert(!spaPalaceContains(20,300));assert(!spaPalaceContains(20,294));
 for(const z of SPA_V7_ROOMS)assert(spaPalaceContains(z.x,z.z),z.id);
});
