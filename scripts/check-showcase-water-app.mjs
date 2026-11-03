// Actual production UI/runtime, isolated local SQLite, native phone renderer.
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import {SHOWCASE_WATER_RIDES} from '../public/showcase-water-data.js';

export async function checkShowcaseWaterApp(page,review){
 const report={purchases:[],rides:[],reloads:0};
 const checkpoint=()=>fs.writeFileSync(path.join(review,'showcase-water-progress.json'),JSON.stringify(report,null,2));
 await page.waitForFunction(()=>__lagoonSaveQA.cloud.editable&&__lagoonQA.npcs.has('adopt-crumb'));
 assert.equal(await page.evaluate(()=>__lagoonQA.renderer.getPixelRatio()),2);
 const snapshot=()=>page.evaluate(()=>{const g=__lagoonSaveQA.getGame();return{coins:g.coins,placements:g.placements.filter(p=>p.item.startsWith('ride-water-')),inventory:Object.fromEntries(Object.entries(g.inventory).filter(([id])=>id.startsWith('ride-water-'))),receipts:Object.fromEntries(Object.entries(g.referenceOwnership).filter(([id])=>id.startsWith('ride-water-')))};});
 for(const spec of SHOWCASE_WATER_RIDES){
  const before=await page.evaluate(()=>__lagoonSaveQA.getGame().coins);
  await page.locator('#shop-open').tap();await page.getByRole('tab',{name:/Водні пригоди/}).tap();
  assert.equal(await page.locator('#shop-grid [data-product]').count(),10);
  const card=page.locator('[data-product="'+spec.id+'"]');
  assert.match(await card.innerText(),new RegExp(spec.name.replace(/[.*+?^${}()|[\]\\]/g,'\\$&')));
  const image=card.locator('img');await image.evaluate(img=>img.decode());
  await card.locator('button').tap();
  assert.equal(await page.evaluate(()=>__lagoonSaveQA.getGame().coins),before-spec.price);
  await page.locator('#build-confirm').tap();
  const p=await page.evaluate(id=>__lagoonSaveQA.getGame().placements.find(p=>p.item===id),spec.id);
  assert.ok(p&&p.readyAt>Date.now());report.purchases.push({id:spec.id,price:spec.price,placement:p});checkpoint();
 }
 const bought=await snapshot();assert.equal(bought.placements.length,10);
 await page.evaluate(()=>__lagoonSaveQA.cloud.flush());await page.waitForFunction(()=>!__lagoonSaveQA.cloud.pending&&!__lagoonSaveQA.cloud.dirty&&!__lagoonSaveQA.cloud.retryEntry);
 for(let i=0;i<2;i++){
  await page.evaluate(()=>__lagoonSaveQA.cloud.releaseEditor());await page.reload();await page.waitForFunction(()=>window.__lagoonQA&&__lagoonSaveQA.cloud.editable);
  assert.deepEqual(await snapshot(),bought);report.reloads++;checkpoint();
 }
 // Finish construction only in this private fixture. No live world is opened.
 await page.evaluate(()=>{const g=structuredClone(__lagoonSaveQA.getGame());for(const p of g.placements)if(p.item.startsWith('ride-water-'))p.readyAt=0;__lagoonSaveQA.commit(g,false);for(const n of __lagoonQA.npcs.values())n.manualUntil=performance.now()+1e8;});
 for(const spec of SHOWCASE_WATER_RIDES.filter(s=>!process.env.CHICHI_WATER_TEN_ONLY||process.env.CHICHI_WATER_TEN_ONLY.split(',').includes(s.kind))){
  console.log('WATER_TEN_APP: real ride '+spec.kind);
  const target=await page.evaluate(item=>{const q=__lagoonQA,p=__lagoonSaveQA.getGame().placements.find(p=>p.item===item),b=q.islands.get(p.biome);__lagoonSaveQA.getWorld().focus(p.biome);q.reviewView(b.position.x+p.x,b.position.z+p.z,160);return p.id;},spec.id);
  await page.waitForFunction(id=>__lagoonQA.itemGroups.get(id)?.userData.built,target,{timeout:240000});
  await page.evaluate(({target,groupTest})=>{const q=__lagoonQA;q.pinnedRide=undefined;
   if(groupTest){const g=q.itemGroups.get(target),game=__lagoonSaveQA.getGame();for(const id of ['adopt-crumb','adopt-marshmallow']){const n=q.npcs.get(id),p=game.jobCity?.profiles[id];if(p){p.manualUntil=0;p.trip=null;p.schedule={...p.schedule,job:'rest',outings:[]};}n.manualUntil=0;n.manualAnchor=null;n.profile.biome=g.userData.placement.biome;n.carrier.position.copy(g.localToWorld(new q.THREE.Vector3(...g.userData.route.entry)));q.setCatMood(n.model,'happy',{immediate:true});if(game.care?.residents[id])Object.assign(game.care.residents[id],{hunger:0,energy:100});}}
   window.__waterHero=q.perform({mood:'happy',action:'ride',activityId:target,thought:'Екстримальна водна пригода!'});
  },{target,groupTest:spec.kind==='canyon-rafting'});
  if(spec.kind==='canyon-rafting'){
   await page.waitForFunction(()=>['adopt-crumb','adopt-marshmallow'].every(id=>__lagoonQA.residentPlay.get(id)?.autonomous),null,{timeout:30000});
   await page.evaluate(()=>{for(const id of ['adopt-crumb','adopt-marshmallow']){const v=__lagoonQA.residentPlay.get(id);v.started=performance.now()-v.travel-20;__lagoonQA.npcs.get(id).manualUntil=performance.now()+1e8;}});
  }
  await page.waitForFunction(()=>__lagoonQA.getOperation()?.stage==='travel');
  await page.evaluate(()=>{const op=__lagoonQA.getOperation();op.start=performance.now()-op.duration-20;});
  await page.waitForFunction(()=>__lagoonQA.getOperation()?.stage==='queue');
  if(spec.seats>1){
   await page.waitForFunction(()=>__lagoonQA.getOperation()?.rider.seated);
   const clock=await page.evaluate(()=>{const op=__lagoonQA.getOperation();return{seatedAt:op.rider.group.seatedAt,departureAt:op.rider.group.departureAt,stage:op.stage};});
   assert.ok(Math.abs(clock.departureAt-clock.seatedAt-15000)<1e-6,'15 seconds from actual first seating');assert.equal(clock.stage,'queue');
   if(spec.kind==='canyon-rafting')await page.waitForFunction(()=>['adopt-crumb','adopt-marshmallow'].every(id=>__lagoonQA.residentPlay.get(id)?.rider.seated));
   await page.evaluate(()=>{const d=__lagoonQA.getOperation().attraction.userData,group=__lagoonQA.getOperation().rider.group;group.departureAt=performance.now()-20;for(const r of d.slideRiders.values())if(r.group===group)r.launchAt=group.departureAt;});
  }else await page.evaluate(()=>{__lagoonQA.getOperation().rider.launchAt=performance.now()-2000;});
  await page.waitForFunction(()=>__lagoonQA.getOperation()?.stage==='activity');
  const sample=await page.evaluate(target=>{const q=__lagoonQA,d=q.itemGroups.get(target).userData,leg=d.route.legs.find(l=>['ride','rafting','drop','flight','surf','float','carousel','swing','vortex'].includes(l.phase));return leg.start+leg.duration*.46;},target);
  await page.evaluate(t=>{__lagoonQA.pinnedRide=t;},sample);
  await page.waitForFunction(t=>{const op=__lagoonQA.getOperation();return op?.stage==='activity'&&Math.abs((op.rider?.elapsed??-1)-t)<.001;},sample);
  await page.evaluate(()=>__lagoonQA.drawFrame());
  if(spec.kind==='canyon-rafting'){
   await page.waitForFunction(()=>['adopt-crumb','adopt-marshmallow'].every(id=>__lagoonQA.residentPlay.get(id)?.phase==='activity'));
   await page.evaluate(time=>{__lagoonQA.atollPinnedResidents=['adopt-crumb','adopt-marshmallow'].map(id=>({id,time}));},sample);
   await page.waitForFunction(()=>__lagoonQA.residentPlay.visits.size===2);
  }
  const actual=await page.evaluate(({target,t})=>{const q=__lagoonQA,g=q.itemGroups.get(target),f=g.userData.rideFrame(t,false,0),expected=g.localToWorld(new q.THREE.Vector3(...f.position));return{phase:f.phase,error:q.chichiCarrier.position.distanceTo(expected),reaction:g.userData.rideReaction(t,false,0),riders:g.userData.slideRiders.size,boats:g.userData.slideVehicles.filter(v=>v.visible).length,contextLost:q.renderer.getContext().isContextLost()};},{target,t:sample});
  assert.ok(actual.error<.03,spec.kind+' actual carrier/seat mismatch '+actual.error);assert.equal(actual.contextLost,false);assert.ok(actual.reaction.weight>.9);assert.equal(actual.boats,1);if(spec.kind==='canyon-rafting')assert.equal(actual.riders,3);
  await page.evaluate(id=>__lagoonQA.callbacks.onSelectItem(id),target);assert.equal(await page.locator('#item-guest-camera').isDisabled(),false);await page.locator('#item-guest-camera').tap();
  await page.waitForFunction(()=>__lagoonQA.faceCamera.enabled);await page.screenshot({path:path.join(review,spec.kind+'-guest-phone.png')});
  await page.evaluate(id=>__lagoonQA.callbacks.onSelectItem(id),target);await page.locator('#item-attraction-camera').tap();
  const walking=await page.evaluate(target=>{const d=__lagoonQA.itemGroups.get(target).userData,legs=d.route.legs.filter(l=>l.phase==='exit'&&l.fn(.5).walking),leg=legs[Math.floor(legs.length/2)];return leg.start+leg.duration*.5;},target);
  await page.evaluate(t=>{__lagoonQA.pinnedRide=t;for(const p of __lagoonQA.atollPinnedResidents||[])p.time=t;},walking);
  await page.waitForFunction(t=>Math.abs((__lagoonQA.getOperation()?.rider.elapsed??-1)-t)<.001,walking);
  actual.returnWalk=await page.evaluate(({target,t})=>{const q=__lagoonQA,g=q.itemGroups.get(target),f=g.userData.rideFrame(t,false,0);return{walking:f.walking,error:q.chichiCarrier.position.distanceTo(g.localToWorld(new q.THREE.Vector3(...f.position))),boats:g.userData.slideVehicles.filter(v=>v.visible).length,phase:f.phase};},{target,t:walking});
  assert.equal(actual.returnWalk.walking,true);assert.ok(actual.returnWalk.error<.03);assert.equal(actual.returnWalk.boats,0);
  await page.evaluate(id=>__lagoonQA.callbacks.onSelectItem(id),target);await page.locator('#item-guest-camera').tap();
  await page.screenshot({path:path.join(review,spec.kind+'-return-phone.png')});
  await page.evaluate(()=>{const q=__lagoonQA;delete q.pinnedRide;q.atollPinnedResidents=[];const op=q.getOperation();op.activityStart=performance.now()-op.attraction.userData.duration*1000-100;for(const v of q.residentPlay.visits.values())v.activityStart=performance.now()-v.object.userData.duration*1000-100;});
  await page.waitForFunction(()=>!__lagoonQA.getOperation()&&!__lagoonQA.residentPlay.visits.size);report.rides.push({id:spec.id,...actual});checkpoint();
 }
 const after=await snapshot();assert.equal(after.placements.length,10);assert.equal(after.coins,bought.coins);
 await page.evaluate(()=>__lagoonSaveQA.cloud.flush());await page.waitForFunction(()=>!__lagoonSaveQA.cloud.pending&&!__lagoonSaveQA.cloud.dirty&&!__lagoonSaveQA.cloud.retryEntry);
 await page.evaluate(()=>__lagoonSaveQA.cloud.releaseEditor());await page.reload();await page.waitForFunction(()=>window.__lagoonQA&&__lagoonSaveQA.cloud.editable);assert.deepEqual(await snapshot(),after);report.reloads++;
 fs.writeFileSync(path.join(review,'showcase-water-app.json'),JSON.stringify(report,null,2));
 console.log(`WATER_TEN_APP: ${report.purchases.length} phone purchases, ${report.rides.length} native rides/returns, both cameras and ${report.reloads} SQLite reloads passed.`);
}
