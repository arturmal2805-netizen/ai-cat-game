import {test} from 'node:test';
import assert from 'node:assert/strict';
import * as T from 'three';
import {MALL_ICE_FLAVORS,mallIceEating} from '../public/mall-ice-data.js';
import {MALL_PRODUCTS,mallProduct} from '../public/mall-data.js';
import {buyMallProduct,useMallProduct,mallChoice,validateMallEconomy} from '../public/mall-system.js';
import {newGame,saveGame,loadGame} from '../public/economy.js';
import {ensureJobCity,catProducts} from '../public/jobcity-system.js';
import {createMallRuntime} from '../public/mall-runtime.js';
import {createCat,animateCat,reactCat} from '../public/cat-model.js';
import {applyAtollSit} from '../public/atoll-slide-acting.js';
import {applyMallIcePose} from '../public/mall-ice-pose.js';
import {mallIceServing} from '../public/mall-ice-serving.js';
const now=1794384000000;
function seed(){let g=newGame(now);g.unlocked.push('autumn','jobcity');g=ensureJobCity(g,now);g.jobCity.profiles.chichi.coins=5000;return g;}
function reload(g){const m=new Map(),storage={getItem:k=>m.get(k)||null,setItem:(k,v)=>m.set(k,v)};assert.ok(saveGame(storage,g));return loadGame(storage,now,{advance:false});}
function until(r,condition){for(let i=0;i<36000;i++){r.step(1/60,i/60);if(condition())return;}throw Error('Ice visit stalled '+JSON.stringify(r.get('chichi')));}
test('six distinct affordable flavors rotate after durable purchases, respect wishes and leave old receipts usable',()=>{
 let g=seed();const products=catProducts(g).filter(p=>p.storeId==='mall-ice');assert.equal(products.length,6);assert.equal(new Set(products.map(p=>p.iceFlavor)).size,6);
 const chosen=[];for(let i=0;i<6;i++){const choice=mallChoice(g,'chichi','mall-ice');assert.equal(mallChoice(g,'chichi','mall-ice').id,choice.id);chosen.push(choice.id);g=buyMallProduct(g,'chichi',choice.id,`mall-chichi-${i+1}`,now);}
 assert.equal(new Set(chosen).size,6);g.jobCity.profiles.chichi.wishes=[products[0].id];assert.equal(mallChoice(g,'chichi','mall-ice').id,products[0].id);
 g.jobCity.profiles.chichi.coins=40;assert.equal(mallChoice(g,'chichi','mall-ice').id,'mall-ice-vanilla-pearl');g.jobCity.profiles.chichi.coins=0;assert.equal(mallChoice(g,'chichi','mall-ice'),null);
 g=seed();const p=g.jobCity.profiles.chichi;p.coins-=45;p.purchaseCount=1;p.inventory['mall-ice-meal']=1;p.mall={version:1,receipts:{'mall-chichi-1':{product:'mall-ice-meal',price:45,at:now,sequence:1}},used:{}};
 for(const [id,price]of [['mall-ice-meal',45],['mall-ice-treat',27],['mall-ice-drink',18]])assert.equal(mallProduct(id).price,price);
 g=reload(reload(g));assert.equal(g.jobCity.profiles.chichi.inventory['mall-ice-meal'],1);assert.equal(buyMallProduct(g,'chichi','mall-ice-meal','mall-chichi-1',now),g);assert.throws(()=>buyMallProduct(g,'chichi','mall-ice-meal','mall-chichi-2',now));
 g=useMallProduct(g,'chichi','mall-ice-meal');assert.equal(g.jobCity.profiles.chichi.mall.used['mall-ice-meal'],1);validateMallEconomy(g);
});
test('every flavor reaches its real food seat and consumes exactly once, including paid/used checkpoints and cancellation',()=>{
 for(const flavor of MALL_ICE_FLAVORS)for(const checkpoint of ['paid','used']){
  let g=seed(),payments=0,uses=0;const id='mall-ice-'+flavor.key;
  const make=()=>createMallRuntime({getGame:()=>g,onGoal:(id,goal)=>{g.jobCity.profiles[id].mall??={};g.jobCity.profiles[id].mall.goal=goal;},onPurchase:(cat,p,r)=>{g=buyMallProduct(g,cat,p,r,now);payments++;return true;},onUse:(cat,p)=>{g=useMallProduct(g,cat,p);uses++;return true;}});
  const r=make();assert.ok(r.start('chichi','mall-ice',{x:0,y:.35,z:110},{productId:id}));until(r,()=>r.get('chichi')?.phase===(checkpoint==='paid'?'joy':'experience'));
  if(checkpoint==='used')r.step(1/60,99);
  assert.equal(r.frame('chichi').iceCream.flavor,flavor.key);assert.equal(r.frame('chichi').carrying,false);
  g=reload(g);const p=g.jobCity.profiles.chichi,goal=p.mall.goal,pos=r.safePosition('chichi'),balance=p.coins;const resumed=make();assert.ok(resumed.start('chichi','mall-ice',pos,{resume:goal}));if(checkpoint==='used')assert.equal(resumed.frame('chichi').iceCream,null,'Reloading an eaten cone cannot create a fresh serving');until(resumed,()=>!resumed.has('chichi'));
  assert.equal(g.jobCity.profiles.chichi.coins,balance);assert.equal(payments,1);assert.equal(uses,1);assert.equal(g.jobCity.profiles.chichi.mall.used[id],1);validateMallEconomy(reload(g));
 }
 let g=seed();const id='mall-ice-cosmic-rainbow',r=createMallRuntime({getGame:()=>g,onPurchase:(c,p,t)=>{g=buyMallProduct(g,c,p,t,now);return true;}});r.start('chichi','mall-ice',{x:0,y:.35,z:110},{productId:id});until(r,()=>r.get('chichi')?.phase==='joy');r.cancel('chichi');assert.equal(r.frame('chichi').iceCream,null);assert.equal(g.jobCity.profiles.chichi.inventory[id],1);
});
test('native cone grip, tongue and face reset after eating; reduced motion keeps a stable grip without licking',()=>{
 const cat=createCat('happy',{detail:'npc'});const snapshot=()=>({head:cat.userData.head.rotation.toArray(),jaw:cat.userData.jaw.rotation.toArray(),jawY:cat.userData.jaw.position.y,mouth:cat.userData.mouth.scale.toArray(),tongue:cat.userData.tongue.position.toArray(),visible:cat.userData.tongue.visible,legs:cat.userData.legs.map(l=>[...l.position.toArray(),...l.rotation.toArray()])});
 animateCat(cat,4,false,true);const ordinary=snapshot();
 for(const flavor of MALL_ICE_FLAVORS){
  const f=mallIceEating(.38,flavor.key),reaction={...f.reaction,iceHolding:true,iceLick:f.lick,rideSit:.8};animateCat(cat,4,false,true);reactCat(cat,reaction,false);applyAtollSit(cat,reaction,false);applyMallIcePose(cat,reaction,false);cat.updateMatrixWorld(true);
  const i=cat.userData.legs.findIndex(l=>l.position.z>0&&l.position.x>0),paw=cat.userData.legJoints[i].ankle.getWorldPosition(new T.Vector3());assert.ok(paw.toArray().every(Number.isFinite));assert.ok(cat.userData.tongue.visible);assert.ok(paw.z>.6,'The actual gripping paw reaches in front of the body');
  animateCat(cat,4,false,true);assert.deepEqual(snapshot(),ordinary);
  const reduced=mallIceEating(.38,flavor.key,true);assert.equal(reduced.lick,0);applyMallIcePose(cat,{iceHolding:true,iceLick:1},true);const a=snapshot();animateCat(cat,4,false,true);applyMallIcePose(cat,{iceHolding:true,iceLick:0},true);assert.deepEqual(snapshot(),a);animateCat(cat,4,false,true);assert.deepEqual(snapshot(),ordinary);
 }
});
test('bounded six-flavor templates retain real shared geometry while portions remain independent',()=>{
 const meshes=[];for(const flavor of MALL_ICE_FLAVORS){const a=mallIceServing(flavor.key),b=mallIceServing(flavor.key);assert.notEqual(a,b);assert.notEqual(a.userData.cream,b.userData.cream);const g=[];a.traverse(o=>{if(o.isMesh){g.push(o.geometry);assert.ok(o.geometry.attributes.position.count<5000);}});meshes.push(g);const other=[];b.traverse(o=>{if(o.isMesh)other.push(o.geometry);});assert.deepEqual(g,other);a.userData.cream.scale.y=.25;assert.equal(b.userData.cream.scale.y,1);}
 assert.equal(mallIceServing('not-a-flavor'),null);assert.equal(mallIceEating(1,'not-a-flavor'),null);assert.equal(mallIceEating(50,'blue-lagoon').progress,1);assert.equal(new Set(MALL_ICE_FLAVORS.map(f=>f.color)).size,6);
});
