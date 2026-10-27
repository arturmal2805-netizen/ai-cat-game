import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
export async function checkAtollLoading(page,review){
 page.setDefaultTimeout(90000);console.log('ATOLL_LOADING: distant construction transition');
 await page.evaluate(()=>{const q=__lagoonQA,b=q.islands.get('homestead');__lagoonSaveQA.getWorld().focus('homestead');q.reviewView(b.position.x,b.position.z,900);for(const n of q.npcs.values())n.manualUntil=performance.now()+1e7;});
 await page.waitForFunction(()=>__lagoonQA.getDistance()>800&&__lagoonQA.itemGroups.has('mega-cold'));
 const initial=await page.evaluate(()=>({cold:__lagoonQA.itemGroups.get('mega-cold').userData.loadingReference,building:__lagoonQA.itemGroups.get('mega-finishes').userData.built,distance:__lagoonQA.getDistance()}));
 assert.equal(initial.cold,true);assert.equal(initial.building,false);
 // Real transition from unfinished construction at an ordinary, distant
 // homestead camera: no artificial close view and no first model click.
 await page.evaluate(()=>{const g=structuredClone(__lagoonSaveQA.getGame());g.placements.find(p=>p.id==='mega-finishes').readyAt=Date.now()-1;__lagoonSaveQA.commit(g,false);});
 await page.waitForFunction(()=>__lagoonQA.itemGroups.get('mega-finishes')?.userData.built,{},{timeout:240000});
 const finished=await page.evaluate(()=>{const d=__lagoonQA.itemGroups.get('mega-finishes').userData;return{built:d.built,loading:d.loadingReference,lanes:d.route.lanes.length,geometry:d.route.geometry.length,distance:__lagoonQA.getDistance()};});
 assert.equal(finished.loading,false);assert.ok(finished.geometry>=1);assert.ok(finished.distance>520);
 console.log('ATOLL_LOADING: main and resident request an unprepared real ride');
 await page.evaluate(()=>{const q=__lagoonQA,d={action:'ride',activityId:'mega-cold-ride',mood:'happy',thought:'На Мега-петлі!'};window.__megaRide=q.perform(d);window.__megaResident=q.performResident('luna',d);});
 assert.equal(await page.evaluate(()=>__megaResident),true);
 await page.waitForFunction(()=>__lagoonQA.getOperation()&&__lagoonQA.residentPlay.get('luna'),{},{timeout:240000});
 await page.evaluate(()=>{const q=__lagoonQA,op=q.getOperation(),v=q.residentPlay.get('luna');op.start=performance.now()-op.duration-20;v.started=performance.now()-v.travel-20;});
 await page.waitForFunction(()=>__lagoonQA.getOperation()?.stage==='queue'&&__lagoonQA.residentPlay.get('luna')?.phase==='queue');
 await page.evaluate(()=>{const q=__lagoonQA;q.getOperation().rider.launchAt=performance.now()-2000;q.residentPlay.get('luna').rider.launchAt=performance.now()-2000;});
 await page.waitForFunction(()=>__lagoonQA.getOperation()?.stage==='activity'&&__lagoonQA.residentPlay.get('luna')?.phase==='activity');
 const manual=await page.evaluate(()=>{const q=__lagoonQA,d=q.itemGroups.get('mega-cold-ride').userData;return{built:d.built,riders:d.slideRiders.size,hero:!!q.getOperation().rider,resident:!!q.residentPlay.get('luna').rider};});assert.equal(manual.riders,2);assert.equal(manual.built,true);
 await page.evaluate(()=>{const q=__lagoonQA,op=q.getOperation(),v=q.residentPlay.get('luna');op.activityStart=performance.now()-op.attraction.userData.duration*1000-100;v.activityStart=performance.now()-v.object.userData.duration*1000-100;});
 await page.waitForFunction(()=>!__lagoonQA.getOperation()&&!__lagoonQA.residentPlay.get('luna'));
 await page.evaluate(()=>{const q=__lagoonQA,b=q.islands.get('homestead');q.reviewView(b.position.x,b.position.z,900);});
 await page.waitForFunction(()=>__lagoonQA.getDistance()>800);
 console.log('ATOLL_LOADING: cold-model camera');
 // A completed cold model must accept its camera button BEFORE preparation.
 await page.evaluate(()=>__lagoonQA.callbacks.onSelectItem('mega-cold'));
 assert.equal(await page.locator('#item-attraction-camera').isDisabled(),false);
 assert.match(await page.locator('#item-construction').innerText(),/Постройка готова/);
 await page.locator('#item-attraction-camera').tap();
 assert.equal(await page.locator('#item-dialog').evaluate(e=>e.open),false);
 await page.waitForFunction(()=>__lagoonQA.itemGroups.get('mega-cold')?.userData.built,{},{timeout:240000});
 await page.screenshot({path:path.join(review,'mega-loaded-inspection-phone.png')});
 assert.equal(await page.evaluate(()=>__lagoonQA.renderer.getContext().isContextLost()),false);
 // Store/re-place through the actual phone bag and build form. Paid ownership
 // survives, no new charge/deadline, and the distant camera cannot strand it.
 console.log('ATOLL_LOADING: phone storage and replacement');
 await page.evaluate(()=>__lagoonQA.callbacks.onSelectItem('mega-cold'));await page.locator('#item-store').tap();
 const balance=await page.evaluate(()=>__lagoonSaveQA.getGame().coins);
 await page.locator('#shop-open').tap();await page.getByRole('tab',{name:/сумка/i}).tap();
 await page.locator('[data-product="slide-atoll-mega-loops"] button').tap();
 await page.locator('#build-biome').selectOption('homestead');
 await page.evaluate(()=>{const q=__lagoonQA,b=q.islands.get('homestead');q.reviewView(b.position.x,b.position.z,900);});
 await page.locator('#build-confirm').tap();
 const placed=await page.evaluate(()=>__lagoonSaveQA.getGame().placements.find(p=>p.item==='slide-atoll-mega-loops'&&!['mega-finishes','mega-cold-ride'].includes(p.id)));
 assert.ok(placed);assert.equal(placed.readyAt,0);assert.equal(await page.evaluate(()=>__lagoonSaveQA.getGame().coins),balance);
 await page.waitForFunction(id=>__lagoonQA.itemGroups.get(id)?.userData.built,placed.id,{timeout:240000});
 const final=await page.evaluate(id=>{const d=__lagoonQA.itemGroups.get(id).userData;return{built:d.built,loading:d.loadingReference,route:!!d.rideFrame,distance:__lagoonQA.getDistance(),contextLost:__lagoonQA.renderer.getContext().isContextLost()};},placed.id);
 assert.equal(final.route,true);assert.equal(final.loading,false);assert.equal(final.contextLost,false);
 fs.writeFileSync(path.join(review,'atoll-loading.json'),JSON.stringify({initial,finished,manual,placed,final,balance},null,2));
 console.log('ATOLL_LOADING: finished Mega Loops prepares at distance 900, cold camera works, phone bag replacement prepares without a second payment.');
}
