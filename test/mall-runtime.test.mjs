import {test} from 'node:test';
import assert from 'node:assert/strict';
import {newGame} from '../public/economy.js';
import {ensureJobCity} from '../public/jobcity-system.js';
import {createMallRuntime} from '../public/mall-runtime.js';
import {MALL_STORES,MALL_PRODUCTS} from '../public/mall-data.js';
import {buyMallProduct,useMallProduct,normalizeMallProfile,validateMallEconomy} from '../public/mall-system.js';
function fixture(){let game=newGame();game.unlocked.push('autumn','jobcity');game=ensureJobCity(game);for(const p of Object.values(game.jobCity.profiles))p.coins=10000;return game;}
function create(g){const getGame=()=>g.game;return createMallRuntime({getGame,
 onGoal:(id,goal)=>{const p=g.game.jobCity.profiles[id];p.mall=normalizeMallProfile(p.mall);p.mall.goal=goal;},
 onPurchase:(id,p,r)=>{g.game=buyMallProduct(g.game,id,p,r);g.payments++;return true;},
 onUse:(id,p)=>{g.game=useMallProduct(g.game,id,p);g.uses++;return true;},
});}
function until(r,condition,seconds=400){for(let t=0;t<seconds;t+=1/60){r.step(1/60,t);if(condition())return t;}throw Error('Unfinished native mall journey: '+JSON.stringify([...r.visits.values()].map(v=>[v.id,v.storeId,v.phase,v.next])));}
test('all 34 destinations physically finish through their floor, private checkout, activity and original dry pier',()=>{
 for(const store of MALL_STORES){const g={game:fixture(),payments:0,uses:0},r=create(g);assert.ok(r.start('chichi',store.id,{x:0,y:.35,z:110}));let visited=false,paid=false;
  until(r,()=>{const v=r.get('chichi');if(v?.phase==='experience'){assert.equal(v.floor,store.floor);visited=true;paid=v.bought;}return !v;});
  assert.ok(visited,store.id);assert.equal(g.payments,store.price?1:0,store.id);assert.equal(g.uses,g.payments);assert.equal(paid,!!store.price);validateMallEconomy(g.game);
 }
});
test('six largest cats retain distinct waiting places, four-seat capacity, physical separation and finite return',()=>{
 const g={game:fixture(),payments:0,uses:0},r=create(g),ids=Object.keys(g.game.jobCity.profiles).slice(0,6),stores=['mall-vuitton','mall-mcd','mall-cinema','mall-ikea','mall-restaurant','mall-observatory'];
 ids.forEach((id,i)=>assert.ok(r.start(id,stores[i],{x:0,y:.35,z:110+i*4},{radius:1.633})));
 let max=0,min=99;
 until(r,()=>{max=Math.max(max,r.lift.passengers.length);const people=[...r.visits.values()];for(let i=0;i<people.length;i++)for(let j=0;j<i;j++){const a=people[i].position,b=people[j].position;if(Math.abs(a.y-b.y)<1)min=Math.min(min,Math.hypot(a.x-b.x,a.z-b.z));}return !people.length;},900);
 assert.equal(max,4);assert.ok(min>3.266,`Actual root clearance ${min}`);
});
test('a checkpoint after paying or using a meal resumes the same goal without another debit or meal consumption',()=>{
 for(const checkpoint of ['joy','experience']){const g={game:fixture(),payments:0,uses:0},r=create(g),p=MALL_PRODUCTS.find(p=>p.storeId==='mall-mcd'&&p.use==='eat');
  r.start('chichi','mall-mcd',{x:0,y:.35,z:110},{productId:p.id});until(r,()=>r.get('chichi')?.phase===checkpoint);
  if(checkpoint==='experience')r.step(1/60,99);
  const state=structuredClone(g.game),goal=state.jobCity.profiles.chichi.mall.goal,pos=r.safePosition('chichi');assert.ok(goal.purchased);const paid=state.jobCity.profiles.chichi.coins;
  const restored={game:state,payments:0,uses:0},again=create(restored);assert.ok(again.start('chichi',goal.storeId,pos,{resume:goal}));until(again,()=>!again.has('chichi'));
  assert.equal(restored.game.jobCity.profiles.chichi.coins,paid);assert.equal(restored.payments,0);assert.equal(restored.game.jobCity.profiles.chichi.mall.used[p.id],1);validateMallEconomy(restored.game);
 }
});
test('failed durable intent cannot leave a running unrecorded visitor; failed consumption has one bounded attempt',()=>{
 const game=fixture(),bad=createMallRuntime({getGame:()=>game,onGoal:()=>{throw Error('Storage unavailable');}});assert.throws(()=>bad.start('chichi','mall-mcd',{x:0,y:.35,z:110}));assert.equal(bad.visits.size,0);
 const g={game:fixture(),payments:0,uses:0};let attempts=0;const r=createMallRuntime({getGame:()=>g.game,onPurchase:()=>true,onUse:()=>{attempts++;throw Error('Storage unavailable');}});r.start('chichi','mall-mcd',{x:0,y:.35,z:110});until(r,()=>!r.has('chichi'));assert.equal(attempts,1);
});
