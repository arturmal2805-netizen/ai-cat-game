// Production app + isolated SQLite, real phone shop/buttons/camera/riders.
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import {ATOLL_SLIDES,ATOLL_PARK_ID} from '../public/atoll-slide-data.js';

export async function checkAtollApp(page,review){
 await page.waitForFunction(()=>__lagoonSaveQA.cloud.editable&&__lagoonQA.npcs.has('adopt-crumb'));
 const initial=await page.evaluate(()=>({
   prepared:[...__lagoonQA.itemGroups.values()].filter(g=>g.userData.premiumWater).length,
   cats:[...__lagoonQA.npcs.keys()],dpr:__lagoonQA.renderer.getPixelRatio(),
 }));
 assert.equal(initial.dpr,2);
 // The boot camera is a park overview, never twenty synchronous model builds.
 assert.ok(initial.prepared<=6);
 const last=ATOLL_SLIDES.at(-1),wallet=await page.evaluate(()=>__lagoonSaveQA.getGame().coins);
 await page.locator('#shop-open').tap();
 await page.getByRole('tab',{name:/Водні світи/}).tap();
 assert.equal(await page.locator('#shop-grid [data-product]').count(),20);
 assert.equal(await page.locator('#shop-grid .owned').count(),19);
 const card=page.locator('[data-product="'+last.id+'"]');
 assert.ok((await card.locator('button').innerText()).includes('Купить'));
 await card.locator('button').tap();
 assert.equal(await page.evaluate(()=>__lagoonSaveQA.getGame().coins),wallet-last.price);
 assert.equal(await page.locator('#build-biome').inputValue(),ATOLL_PARK_ID);
 await page.locator('#build-confirm').tap();
 const paid=await page.evaluate(id=>__lagoonSaveQA.getGame().placements.find(p=>p.item===id),last.id);
 assert.ok(paid?.readyAt>Date.now());
 await page.locator('#shop-open').tap();await page.getByRole('tab',{name:/Водні світи/}).tap();
 assert.equal(await page.locator('#shop-grid .owned').count(),20);
 assert.ok((await page.locator('[data-product="'+last.id+'"] .owned').innerText()).includes('Придбано'));
 await page.locator('[data-close="shop-dialog"]').tap();
 const target=await page.evaluate(item=>{
  const q=__lagoonQA,p=__lagoonSaveQA.getGame().placements.find(p=>p.item===item),b=q.islands.get(p.biome);
  __lagoonSaveQA.getWorld().focus(p.biome);q.reviewView(b.position.x+p.x,b.position.z+p.z,150);
  for(const n of q.npcs.values())n.manualUntil=performance.now()+1e7;
  return p.id;
 },ATOLL_SLIDES[0].id);
 await page.waitForFunction(id=>__lagoonQA.itemGroups.get(id)?.userData.built,target,{timeout:240000});
 const elapsed=await page.evaluate(id=>{const g=__lagoonQA.itemGroups.get(id),l=g.userData.route.lanes[0].legs.find(l=>l.phase==='ride');return l.start+l.duration*.5;},target);
 await page.evaluate(({target,elapsed})=>{
  const q=__lagoonQA;q.pinnedRide=elapsed;
  window.__atollHeroPromise=q.perform({mood:'happy',action:'ride',activityId:target,thought:'Прокачусь на хвилі!'});
  const op=q.getOperation();if(op?.stage==='travel')op.start=performance.now()-op.duration-20;
 },{target,elapsed});
 await page.waitForFunction(()=>__lagoonQA.getOperation()?.stage==='queue');
 await page.evaluate(()=>__lagoonQA.getOperation().rider.launchAt=performance.now()-2000);
 await page.waitForFunction(()=>__lagoonQA.getOperation()?.stage==='activity');
 const residents=['adopt-crumb','adopt-marshmallow'];
 for(const [i,id] of residents.entries()){
  assert.equal(await page.evaluate(({id,target})=>__lagoonQA.performResident(id,{mood:'happy',action:'ride',activityId:target,thought:'Їду з друзями!'}),{id,target}),true,id);
  await page.evaluate(id=>{const v=__lagoonQA.residentPlay.get(id);v.started=performance.now()-v.travel-20;},id);
  await page.waitForFunction(id=>__lagoonQA.residentPlay.get(id)?.phase==='queue',id);
  await page.evaluate(id=>__lagoonQA.residentPlay.get(id).rider.launchAt=performance.now()-2000,id);
  await page.waitForFunction(id=>__lagoonQA.residentPlay.get(id)?.phase==='activity',id);
  await page.evaluate(({id,time})=>{(__lagoonQA.atollPinnedResidents||=[]).push({id,time});},{id,time:elapsed+(i+1)*2});
 }
 await page.waitForTimeout(1000);
 const riding=await page.evaluate(({target,elapsed,residents})=>{
  const q=__lagoonQA,g=q.itemGroups.get(target),T=q.THREE;
  const rows=residents.map(id=>{const v=q.residentPlay.get(id),n=q.npcs.get(id),f=g.userData.rideFrame(v.elapsed,false,v.rider.lane),expected=g.localToWorld(new T.Vector3(...f.position));return{id,error:n.carrier.position.distanceTo(expected),sit:g.userData.rideReaction(v.elapsed,false,v.rider.lane).rideSit,phase:f.phase};});
  const expected=g.localToWorld(new T.Vector3(...g.userData.rideFrame(elapsed).position));
  return{heroError:q.chichiCarrier.position.distanceTo(expected),residents:rows,riders:g.userData.slideRiders.size,rafts:g.userData.slideVehicles.filter(v=>v.visible).length,contextLost:q.renderer.getContext().isContextLost()};
 },{target,elapsed,residents});
 assert.ok(riding.heroError<.001);for(const r of riding.residents){assert.ok(r.error<.001,r.id);assert.ok(r.sit>0);}
 assert.equal(riding.riders,3);assert.equal(riding.rafts,3);assert.equal(riding.contextLost,false);
 await page.evaluate(id=>__lagoonQA.callbacks.onSelectItem(id),target);
 assert.equal(await page.locator('#item-guest-camera').isDisabled(),false);
 await page.locator('#item-guest-camera').tap();await page.waitForTimeout(1800);
 await page.screenshot({path:path.join(review,'atoll-guest-phone.png')});
 assert.equal(await page.evaluate(()=>__lagoonQA.faceCamera.enabled),true);
 await page.evaluate(id=>__lagoonQA.callbacks.onSelectItem(id),target);await page.locator('#item-attraction-camera').tap();
 await page.waitForFunction(()=>__lagoonQA.look.distanceTo(__lagoonQA.desiredLook)<.025&&Math.abs(__lagoonQA.getDistance()-__lagoonQA.getDesiredDistance())<.05);
 await page.screenshot({path:path.join(review,'atoll-attraction-phone.png')});
 // Complete through the actual activity runtime, then verify durable reloads.
 await page.evaluate(()=>{const q=__lagoonQA;delete q.pinnedRide;q.atollPinnedResidents=[];const op=q.getOperation();if(op)op.activityStart=performance.now()-op.attraction.userData.duration*1000-100;for(const v of q.residentPlay.visits.values())v.activityStart=performance.now()-v.object.userData.duration*1000-100;});
 await page.waitForFunction(()=>!__lagoonQA.getOperation()&&__lagoonQA.residentPlay.visits.size===0);
 await page.evaluate(()=>__lagoonSaveQA.cloud.flush());
 await page.waitForFunction(()=>!__lagoonSaveQA.cloud.pending&&!__lagoonSaveQA.cloud.dirty&&!__lagoonSaveQA.cloud.retryEntry);
 const saved=await page.evaluate(()=>({coins:__lagoonSaveQA.getGame().coins,placements:__lagoonSaveQA.getGame().placements.filter(p=>p.item.startsWith('slide-atoll-')),unlocked:__lagoonSaveQA.getGame().unlocked}));
 assert.equal(saved.placements.length,20);assert.equal(new Set(saved.placements.map(p=>p.id)).size,20);
 for(let i=0;i<2;i++){
  await page.evaluate(()=>__lagoonSaveQA.cloud.releaseEditor());await page.reload();await page.waitForFunction(()=>window.__lagoonQA&&__lagoonSaveQA.cloud.editable);
  const restored=await page.evaluate(()=>({coins:__lagoonSaveQA.getGame().coins,placements:__lagoonSaveQA.getGame().placements.filter(p=>p.item.startsWith('slide-atoll-')),unlocked:__lagoonSaveQA.getGame().unlocked}));
  assert.equal(restored.coins,saved.coins);assert.deepEqual(restored.placements,saved.placements);assert.ok(restored.unlocked.includes(ATOLL_PARK_ID));
 }
 fs.writeFileSync(path.join(review,'atoll-app.json'),JSON.stringify({initial,shopCards:20,boughtBadges:20,price:last.price,paidConstruction:paid,riding,reloads:2,purchases:saved.placements.map(p=>({id:p.id,item:p.item})),dpr:2},null,2));
 console.log('ATOLL_APP: phone shop, one payment, all twenty saved plots, main/tiny/giant real riders, guest/attraction cameras and two SQLite reloads passed.');
}
