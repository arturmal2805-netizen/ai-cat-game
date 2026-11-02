import {test} from 'node:test';
import assert from 'node:assert/strict';
import * as T from 'three';
import {GROUP_WAIT_MS,groupApproach,groupBoardingFrame,boardingCandidates} from '../public/group-boarding.js';
import {SHOWCASE_WATER_RIDES} from '../public/showcase-water-data.js';
import {createShowcaseRoute} from '../public/showcase-water-motion.js';
import {reserveSlide,launchSlide,releaseSlide} from '../public/slide-riders.js';
import {rideGuests} from '../public/ride-guests.js';

const distance=(a,b)=>Math.hypot(...a.map((x,i)=>x-b[i]));
function fixture(spec=SHOWCASE_WATER_RIDES.find(s=>s.kind==='canyon-rafting')){
 const route=createShowcaseRoute(spec),ground={duration:()=>2000,frame:(a,b,u)=>a.map((x,i)=>x+(b[i]-x)*u),yaw:()=>0},approach=groupApproach(route,ground,spec.seats),g=new T.Group();
 g.userData={route,groupSeats:spec.seats,slideWater:{},duration:route.duration,rideFrame:route.frame,queueForSlot:i=>approach.queues[i],entryForSlot:i=>route.frame(0,false,i).position};
 return {g,route,approach};
}
test('15 seconds begin only after actual seating, stay fixed for later passengers, and drive one common clock',()=>{
 const {g,route}=fixture(),a=reserveSlide(g,'first'),b=reserveSlide(g,'second');
 assert.equal(a.launchAt,null);launchSlide(g,a,10000);assert.equal(a.launchAt,Infinity);
 groupBoardingFrame(g,a,11099);assert.equal(a.group.seatedAt,null);
 groupBoardingFrame(g,a,11100);assert.equal(a.group.seatedAt,11100);assert.equal(a.launchAt,11100+GROUP_WAIT_MS);
 launchSlide(g,b,13000);groupBoardingFrame(g,b,14100);assert.equal(b.group,a.group);assert.equal(b.launchAt,a.launchAt);
 const before=groupBoardingFrame(g,a,a.launchAt-1);assert.equal(before.departed,false);assert.equal(before.walking,false);
 for(const r of [a,b]){assert.equal(groupBoardingFrame(g,r,a.launchAt).departed,true);assert.equal(r.routeOffset,route.boardingEnd);}
 for(const r of [a,b]){const f=groupBoardingFrame(g,r,a.launchAt+3456);assert.ok(distance(f.position,route.frame(r.elapsed,false,r.lane).position)<1e-7,'even a late departure callback must put the cat on its moving boat in this same frame');}
 assert.equal(a.elapsed,b.elapsed);assert.equal(a.elapsed,route.boardingEnd+3.456);
 assert.ok(distance(before.position,route.frame(route.boardingEnd,false,a.lane).position)<1e-6);
});
test('a late arrival physically waits for the previous ride to return instead of joining a moving raft',()=>{
 const {g}=fixture(),a=reserveSlide(g,'first');launchSlide(g,a,0);groupBoardingFrame(g,a,1100);
 const b=reserveSlide(g,'late');launchSlide(g,b,a.launchAt+1);
 assert.notEqual(a.group,b.group);assert.ok(b.boardAt>=a.group.returnAt);
 const waiting=groupBoardingFrame(g,b,a.launchAt+1000);assert.deepEqual(waiting.position,b.queue);assert.equal(b.elapsed,null);assert.equal(b.group.seatedAt,null);
 groupBoardingFrame(g,b,b.boardAt+1100);assert.equal(b.group.departureAt,b.boardAt+1100+15000);
 releaseSlide(g,'first');assert.equal(g.userData.slideRiders.get('late'),b);releaseSlide(g,'late');assert.equal(g.userData.waterGroup,undefined);
});
test('an arrival too late to finish mounting waits, and cancellation releases the next physical boarding',()=>{
 const {g}=fixture(),a=reserveSlide(g,'first');launchSlide(g,a,0);groupBoardingFrame(g,a,1100);
 const b=reserveSlide(g,'nearly-late');launchSlide(g,b,a.launchAt-500);assert.notEqual(a.group,b.group);
 const cancellation=a.launchAt-250;releaseSlide(g,'first',cancellation);
 assert.equal(b.boardAt,cancellation);assert.equal(groupBoardingFrame(g,b,cancellation).walking,false);
 const f=groupBoardingFrame(g,b,cancellation+1100);assert.equal(f.departed,false);assert.equal(b.launchAt,cancellation+1100+15000);
});
test('every group slot follows its complete original dry route, joins continuously, and never changes wet geometry',()=>{
 for(const spec of SHOWCASE_WATER_RIDES.filter(s=>s.seats>1)){
  const {g,route,approach}=fixture(spec),from=[-60,.16,42];
  for(let lane=0;lane<spec.seats;lane++){
   const target=approach.queues[lane],duration=approach.duration(from,target),boundary=2000/duration;
   assert.ok(distance(approach.frame(from,target,0),from)<1e-7);
   assert.ok(distance(approach.frame(from,target,boundary-1e-9),approach.frame(from,target,boundary+1e-9))<1e-4);
   for(let t=0;t<approach.queueTime;t+=.2)assert.ok(distance(approach.frame(from,target,(2000+t*1000)/duration),route.frame(t,false,lane).position)<1e-6,spec.kind);
   const ticket=reserveSlide(g,'cat-'+lane);launchSlide(g,ticket,1000);const f=groupBoardingFrame(g,ticket,1000);
   assert.ok(distance(f.position,approach.frame(from,target,1))<1e-7);assert.equal(f.reaction.rideSit,0);
   assert.ok(distance(groupBoardingFrame(g,ticket,2100).position,route.frame(route.boardingStart+.6,false,lane).position)<1e-7);
  }
 }
});
test('automatic boarding selects only free local cats with time to walk, and cameras include seated waiting guests',()=>{
 const cats=[{id:'busy',sameIsland:true,busy:true,travelMs:20},{id:'remote',sameIsland:false,travelMs:20},{id:'slow',sameIsland:true,travelMs:18000},{id:'near',sameIsland:true,travelMs:1000},{id:'next',sameIsland:true,travelMs:2000}];
 assert.deepEqual(boardingCandidates(cats,{seats:4,now:1000,departureAt:16000}).map(c=>c.id),['near','next']);
 assert.deepEqual(boardingCandidates(cats,{seats:1,now:1000}).map(c=>c.id),['near']);
 assert.deepEqual(rideGuests('raft',{stage:'queue',rider:{seated:true},decision:{action:'ride',activityId:'raft'}},new Map([['waiting',{phase:'queue',rider:{seated:false},decision:{action:'ride',activityId:'raft'}}],['seated',{phase:'queue',rider:{seated:true},decision:{action:'ride',activityId:'raft'}}]])),['chichi','seated']);
});
