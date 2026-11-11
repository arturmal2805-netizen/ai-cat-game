import {test} from 'node:test';
import assert from 'node:assert/strict';
import {createMallModel} from '../public/mall-model.js';
import {mallPath,mallWalkable,mallNavigationSteps} from '../public/mall-navigation.js';
import {MALL,MALL_STORES,mallServiceFrames} from '../public/mall-data.js';
import {runSceneSteps} from '../public/scene-tasks.js';
import {createMallRuntime} from '../public/mall-runtime.js';
import {newGame} from '../public/economy.js';
import {ensureJobCity} from '../public/jobcity-system.js';
const mall=createMallModel({includeGarden:false});
for(const boxes of mall.userData.obstacles.values())runSceneSteps(mallNavigationSteps(boxes,.75));
test('every shop, cashier and authored seat approach clears the actual built fixtures',()=>{
  for(const s of MALL_STORES){
    const boxes=mall.userData.obstacles.get(s.floor),f=mallServiceFrames(s),landing={x:2.3,y:s.y+.18,z:79};
    const points=[landing,{...s.entrance,y:s.y+.18},f.customer,f.approach,landing];
    for(let i=1;i<points.length;i++)assert.ok(mallPath(s.floor,points[i-1],points[i],.75,boxes),s.id+' segment '+i);
    assert.ok(mallWalkable({x:f.vendor.x,z:f.vendor.z-MALL.z},.65,boxes),s.id+' cashier');
  }
});
test('all destinations complete with furniture navigation enabled; food/cinema settle on their actual seats',()=>{
  for(const s of MALL_STORES){
    const game=newGame();game.unlocked.push('autumn','jobcity');const state=ensureJobCity(game);state.jobCity.profiles.chichi.coins=10000;
    const r=createMallRuntime({getGame:()=>state,onPurchase:()=>true,onUse:()=>true,route:(f,a,b,radius)=>mallPath(f,a,b,radius,mall.userData.obstacles.get(f))});
    assert.ok(r.start('chichi',s.id,{x:0,y:.35,z:110},{radius:.75}));
    let seen=false;
    for(let t=0;t<500&&r.has('chichi');t+=1/30){r.step(1/30,t);const v=r.get('chichi');if(v?.phase==='experience'){seen=true;const frames=mallServiceFrames(s,v.order,.75);assert.ok(Math.hypot(v.position.x-frames.seat.x,v.position.y-frames.seat.y,v.position.z-frames.seat.z)<.001,s.id);}}
    assert.ok(seen,s.id+' activity');assert.equal(r.has('chichi'),false,s.id+' return');
  }
});
