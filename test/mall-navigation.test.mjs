import {test} from 'node:test';
import assert from 'node:assert/strict';
import {createMallModel} from '../public/mall-model.js';
import {mallPath,mallWalkable,mallNavigationSteps,mallAccessibleService,mallSegmentClear} from '../public/mall-navigation.js';
import {MALL,MALL_STORES,mallServiceFrames} from '../public/mall-data.js';
import {runSceneSteps} from '../public/scene-tasks.js';
import {createMallRuntime,mallLanding} from '../public/mall-runtime.js';
import {newGame} from '../public/economy.js';
import {ensureJobCity} from '../public/jobcity-system.js';
const mall=createMallModel({includeGarden:false});
for(const boxes of mall.userData.obstacles.values())runSceneSteps(mallNavigationSteps(boxes,.75));
test('every shop, cashier and authored seat approach clears the actual built fixtures',()=>{
  for(const s of MALL_STORES){
    const boxes=mall.userData.obstacles.get(s.floor),f=mallServiceFrames(s),landing=mallLanding(s.floor,0);
    const points=[landing,{...s.entrance,y:s.y+.18},f.customer,f.approach,landing];
    for(let i=1;i<points.length;i++)assert.ok(mallPath(s.floor,points[i-1],points[i],.75,boxes),s.id+' segment '+i);
    assert.ok(mallWalkable({x:f.vendor.x,z:f.vendor.z-MALL.z},.65,boxes),s.id+' cashier');
  }
});
test('six large simultaneous restaurant visitors keep clearance with the real furniture and lift queue',()=>{
 const game=newGame();game.unlocked.push('autumn','jobcity');const state=ensureJobCity(game),ids=Object.keys(state.jobCity.profiles).slice(0,6),stores=MALL_STORES.filter(s=>s.floor===3),radius=1.633;
 for(const boxes of mall.userData.obstacles.values())runSceneSteps(mallNavigationSteps(boxes,radius));
 const r=createMallRuntime({getGame:()=>state,onPurchase:()=>true,onUse:()=>true,serviceFrames:(s,n,r)=>mallAccessibleService(s,n,r,mall.userData.obstacles.get(s.floor)),route:(f,a,b,radius,dynamic)=>mallPath(f,a,b,radius,mall.userData.obstacles.get(f),dynamic),canWalkSegment:(f,a,b,radius)=>mallSegmentClear(a,b,radius,mall.userData.obstacles.get(f))});
 ids.forEach((id,i)=>assert.ok(r.start(id,stores[i].id,{x:0,y:.35,z:110+i*4},{radius})));
 let min=Infinity;for(let t=0;t<1100&&r.visits.size;t+=1/30){r.step(1/30,t);const people=[...r.visits.values()];for(let i=0;i<people.length;i++)for(let j=0;j<i;j++)if(Math.abs(people[i].position.y-people[j].position.y)<1){const a=people[i].position,b=people[j].position,d=Math.hypot(a.x-b.x,a.z-b.z);min=Math.min(min,d);assert.ok(d>=radius*2,JSON.stringify({t,d,a:people[i].id,b:people[j].id,phases:[people[i].phase,people[j].phase]}));}}
 assert.equal(r.visits.size,0,'All restaurant guests finish without a stuck queue');assert.ok(min>=radius*2);
});
test('all destinations complete with furniture navigation enabled; food/cinema settle on their actual seats',()=>{
  for(const s of MALL_STORES){
    const game=newGame();game.unlocked.push('autumn','jobcity');const state=ensureJobCity(game);state.jobCity.profiles.chichi.coins=10000;
    const r=createMallRuntime({getGame:()=>state,onPurchase:()=>true,onUse:()=>true,route:(f,a,b,radius,dynamic)=>mallPath(f,a,b,radius,mall.userData.obstacles.get(f),dynamic)});
    assert.ok(r.start('chichi',s.id,{x:0,y:.35,z:110},{radius:.75}));
    let seen=false;
    for(let t=0;t<500&&r.has('chichi');t+=1/30){r.step(1/30,t);const v=r.get('chichi');if(v?.phase==='experience'){seen=true;const frames=mallServiceFrames(s,v.order,.75);assert.ok(Math.hypot(v.position.x-frames.seat.x,v.position.y-frames.seat.y,v.position.z-frames.seat.z)<.001,s.id);}}
    assert.ok(seen,s.id+' activity');assert.equal(r.has('chichi'),false,s.id+' return');
  }
});
