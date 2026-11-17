import test from 'node:test';
import assert from 'node:assert/strict';
import {jobBuilding} from '../public/jobcity-assets.js';
import {JOB_BUSINESSES,jobReservations} from '../public/jobcity-data.js';
import {cityGroundClear} from '../public/jobcity-navigation.js';
import {spaClear} from '../public/spa-navigation.js';
import {CHILL_HOUSES} from '../public/chill-data.js';
import {chillHouseModel} from '../public/chill-assets.js';
import {stepChichiWalk} from '../public/chichi-manual.js';
import {manualBuildingSupport,manualBuildingCameraClear} from '../public/manual-building-navigation.js';
const radius=.571;
function walk(nav,start,target,n=200){const s={...start,yaw:0};for(let i=0;i<n&&Math.hypot(s.x-target.x,s.z-target.z)>.06;i++){const distance=Math.hypot(s.x-target.x,s.z-target.z);stepChichiWalk(s,Math.min(.03,distance/5),{heading:Math.atan2(target.x-s.x,target.z-s.z),forward:1,side:0},(p,r,from)=>{const support=manualBuildingSupport(nav,p,r,{from});return support&&{...support,biome:'test'};},radius);}return s;}
test('the reported city-road reservation is not a physical wall',()=>{const p={x:16,z:12,y:.32};assert.equal(spaClear(p,radius,jobReservations()),false);assert.equal(cityGroundClear(p,{...p,z:9},radius),true);});
test('all six actual office models retain a traversable entrance and solid side/back walls',()=>{
 for(const b of JOB_BUSINESSES){const g=jobBuilding(b.id),nav=g.userData.getManualNavigation();assert.ok(nav.boxes.length>100);const inside=walk(nav,{x:0,y:.16,z:13},{x:0,z:6});assert.ok(inside.z<6.1,b.id+' physical doorway');assert.ok(inside.y>.15&&inside.y<.2);
 const side=walk(nav,inside,{x:16,z:6});assert.ok(side.x<12,b.id+' side wall remains solid');
 assert.equal(manualBuildingCameraClear(nav,{x:0,y:1.3,z:12},{x:0,y:1.3,z:7}),true,b.id+' camera sees actual doorway');
 assert.equal(manualBuildingCameraClear(nav,{x:0,y:1.3,z:-8},{x:0,y:1.3,z:-12}),false,b.id+' camera cannot cross back wall');}
});
test('all seven approved house shapes admit walking up their real porch through the open front',()=>{
 for(const h of CHILL_HOUSES){const g=chillHouseModel(h),nav=g.userData.getManualNavigation(),inside=walk(nav,{x:0,y:.16,z:6},{x:0,z:3.1});assert.ok(inside.z<3.2,h.id+' enters');assert.ok(inside.y>.49&&inside.y<.54,h.id+' uses actual raised floor without hovering');assert.equal(manualBuildingCameraClear(nav,{x:0,y:1.3,z:-2.5},{x:0,y:1.3,z:-4}),false,h.id+' back wall stays solid');}
});
