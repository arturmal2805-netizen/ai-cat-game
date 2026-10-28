import {test} from 'node:test';import assert from 'node:assert/strict';
import {newGame,saveGame,loadGame} from '../public/economy.js';import {gatherCats} from '../public/adoption.js';import {gatherCandidates,releaseGatherOverrides,gatherTrip,gatherFrame,gatherLanding} from '../public/gather-system.js';import {cityClock} from '../public/jobcity-system.js';
const now=1780000000000;
function seed(){const g=newGame(now);g.unlocked.push('magic-zoo');g.jobCity={epoch:now,profiles:{luna:{schedule:{day:0,job:'bank'}},moti:{schedule:{day:0,job:'rest'}}}};assert.equal(cityClock(g.jobCity,now).working,true);return g;}
test('recall includes free cats and respects assigned work, real sleep and builder work',()=>{const g=seed();assert.ok(!gatherCandidates(g,now).includes('luna'));assert.ok(gatherCandidates(g,now).includes('moti'));assert.ok(!gatherCandidates(g,now,id=>({sleeping:id==='moti'})).includes('moti'));assert.ok(!gatherCandidates(g,now,id=>({working:id==='moti'})).includes('moti'));g.care.resting={activityId:'chichi-bed'};assert.ok(!gatherCandidates(g,now).includes('chichi'));});
test('only invited cats get a saved destination; a sleeping Chichi and worker retain their places and rest',()=>{const g=seed();g.care.resting={activityId:'chichi-bed'};g.catDestinations.luna='moon';const before=structuredClone(g),n=gatherCats(g,'magic-zoo',{now});assert.deepEqual(g,before);assert.equal(n.catDestinations.moti,'magic-zoo');assert.equal(n.catDestinations.luna,'moon');assert.deepEqual(n.catPosition,g.catPosition);assert.deepEqual(n.care.resting,g.care.resting);assert.deepEqual(n.jobCity,g.jobCity);assert.equal(n.coins,g.coins);});
test('the live selected list also preserves sleeping residents and becomes available after work',()=>{const g=seed(),n=gatherCats(g,'magic-zoo',{ids:['chichi'],now});assert.equal(n.catDestinations.moti,undefined);assert.ok(gatherCandidates(g,now+6*60000).includes('luna'));});
test('manual recall releases stale evening island and idle anchor without changing a profession, balance or history',()=>{const actor={leisureBiome:'jobcity',manualAnchor:{x:1,z:2},manualUntil:1,profile:{job:'bank',coins:480,history:['old']}};releaseGatherOverrides(actor,90000);assert.equal(actor.leisureBiome,null);assert.equal(actor.manualAnchor,null);assert.equal(actor.manualUntil,90000);assert.deepEqual(actor.profile,{job:'bank',coins:480,history:['old']});});

test('a resident recall finishes at the giant park entrance in at most 18 seconds, continuously and exactly',()=>{
 const from={x:250,y:.16,z:40},to={x:0,y:.16,z:-550},v=gatherTrip(from,to,1000);
 assert.equal(v.duration,18000);assert.deepEqual(gatherFrame(v,1000).position,from);
 let last=from;for(let ms=0;ms<=18000;ms+=10){const f=gatherFrame(v,1000+ms);assert.ok(Object.values(f.position).every(Number.isFinite));assert.ok(Math.hypot(f.position.x-last.x,f.position.y-last.y,f.position.z-last.z)<2);last=f.position;}
 const end=gatherFrame(v,20000);assert.equal(end.done,true);assert.equal(end.walking,false);assert.equal(end.reaction,null);assert.deepEqual(end.position,to);
});
test('64 arrivals reserve different clear spots by rest radius near the authored park gate',()=>{
 const reserved=[],arrival={x:0,z:375},blocked={x:0,z:373,w:4,d:4};
 const clear=(p,r)=>Math.hypot(p.x,p.z)<390-r-.3&&!(Math.abs(p.x-blocked.x)<blocked.w/2+r&&Math.abs(p.z-blocked.z)<blocked.d/2+r);
 for(let i=0;i<64;i++){const r=i<8?1.633:.45,p=gatherLanding(arrival,r,reserved,clear,50);assert.ok(p,`cat ${i}`);assert.ok(clear(p,r));for(const q of reserved)assert.ok(Math.hypot(p.x-q.x,p.z-q.z)>=r+q.radius+.25-1e-8);assert.ok(Math.hypot(p.x,p.z-375)<25);reserved.push(p);}
});
test('a blocked tiny shore returns no landing rather than placing cats in water or another cat',()=>{
 assert.equal(gatherLanding({x:0,z:0},1,[],()=>false,5),null);
 const v=gatherTrip({x:0,y:.16,z:0},{x:1,y:.16,z:1},0);assert.equal(v.height,0);assert.equal(gatherFrame(v,300).walking,true);assert.deepEqual(gatherFrame(v,v.duration).position,v.to);
});
