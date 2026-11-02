import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
export async function checkZooGuests(page,dir){
 page.setDefaultTimeout(240000);
 await page.evaluate(()=>{__lagoonQA.cpuOnly=true;__lagoonQA.drawPaused=true;__lagoonSaveQA.getWorld().focus('magic-zoo');});
 await page.waitForFunction(()=>__lagoonQA.islands.get('magic-zoo')?.userData.zoo?.actors.size===5);
 await page.evaluate(()=>__lagoonQA.enterCourt('zoo-elephant',0));
 await page.waitForFunction(()=>Math.abs(__lagoonQA.getDistance()-__lagoonQA.getDesiredDistance())<.05);
 const tap=await page.evaluate(()=>{const q=__lagoonQA;q.freeze=true;const m=q.islands.get('magic-zoo').userData.zoo.actors.get('zoo-elephant'),p=q.islands.get('magic-zoo').userData.animalPoint('zoo-elephant',0,0,new q.THREE.Vector3());p.x+=207;p.z+=136;p.project(q.camera);const r=q.renderer.domElement.getBoundingClientRect();return {x:r.left+(p.x+1)*r.width/2,y:r.top+(1-p.y)*r.height/2};});
 await page.touchscreen.tap(tap.x,tap.y);await page.waitForFunction(()=>document.querySelector('#zoo-guest-start'));
 assert.equal(await page.locator('#zoo-guest-house option').count(),1);
 await page.locator('#zoo-guest-start').tap();
 await page.evaluate(()=>{__lagoonQA.freeze=false;});
 await page.waitForFunction(()=>__lagoonQA.animalGuests.views.size===1&&__lagoonQA.islands.get('cat-homes')?.userData.houses?.size===1);
 await page.waitForFunction(()=>[...__lagoonQA.housingLife.visits.values()].filter(v=>v.phase==='relax').length>=2,undefined,{timeout:180000});
 const first=await page.evaluate(()=>{const g=__lagoonSaveQA.getGame(),q=__lagoonQA;return {zoo:g.zoo,housing:g.housing,coins:g.coins,wallet:g.jobCity.profiles.chichi.coins,hosts:[...q.housingLife.visits.values()].map(v=>({id:v.catId,phase:v.phase,position:v.position})),away:q.islands.get('magic-zoo').userData.zoo.actors.get('zoo-elephant').userData.actors[0].away};});assert.equal(first.away,true);
 await page.waitForFunction(()=>Math.abs(__lagoonQA.getDistance()-__lagoonQA.getDesiredDistance())<.1&&__lagoonQA.look.distanceTo(__lagoonQA.desiredLook)<.05);await page.evaluate(()=>__lagoonQA.drawFrame());await page.screenshot({path:dir+'/elephant-house-guest-phone.png'});
 // All five exact species use the same UI and existing house identity.
 for(const species of ['axolotl','otter','polar','gorilla']){
  await page.evaluate(species=>__lagoonQA.callbacks.onSelectZooAnimal('zoo-'+species+'-0'),species);
  await page.locator('#zoo-guest-start').tap();
  await page.waitForFunction(n=>__lagoonQA.animalGuests.views.size===n,['axolotl','otter','polar','gorilla'].indexOf(species)+2);
 }
 // Real touch drag of the SECOND elephant across the map to the owned house.
 const drag=await page.evaluate(()=>{const q=__lagoonQA,g=__lagoonSaveQA.getGame();q.freeze=true;__lagoonSaveQA.getWorld().focus('magic-zoo');q.scene.updateMatrixWorld(true);const origin=q.islands.get('magic-zoo').position,home=q.islands.get('cat-homes').userData.houses.values().next().value,house=q.islands.get('cat-homes').position.clone().add(home.position),start=q.islands.get('magic-zoo').userData.animalPoint('zoo-elephant',1,0,new q.THREE.Vector3()).add(origin),end=house.clone();end.y=0;const middle=start.clone().add(end).multiplyScalar(.5),length=start.distanceTo(end);q.camera.position.copy(middle).add(new q.THREE.Vector3(0,length*5.5,length*.2));q.camera.lookAt(middle);q.camera.updateMatrixWorld(true);const rect=q.renderer.domElement.getBoundingClientRect(),project=p=>{p=p.clone().project(q.camera);return {x:rect.left+(p.x+1)*rect.width/2,y:rect.top+(1-p.y)*rect.height/2};};return {start:project(start),end:project(end)};});
 const touch=await page.context().newCDPSession(page);
 await touch.send('Input.dispatchTouchEvent',{type:'touchStart',touchPoints:[{...drag.start,id:17}]});
 await touch.send('Input.dispatchTouchEvent',{type:'touchMove',touchPoints:[{x:drag.start.x+8,y:drag.start.y,id:17}]});
 assert.equal(await page.evaluate(()=>__lagoonQA.getAnimalDragging()),'zoo-elephant-1');
 await touch.send('Input.dispatchTouchEvent',{type:'touchMove',touchPoints:[{...drag.end,id:17}]});
 await touch.send('Input.dispatchTouchEvent',{type:'touchEnd',touchPoints:[]});await touch.detach();
 await page.evaluate(()=>{__lagoonQA.freeze=false;});await page.waitForFunction(()=>__lagoonQA.animalGuests.views.size===6);
 const snapshot=()=>page.evaluate(()=>{const g=__lagoonSaveQA.getGame();return {zoo:g.zoo,housing:g.housing,coins:g.coins,wallet:g.jobCity.profiles.chichi.coins};});
 const saved=await snapshot();assert.equal(saved.coins,first.coins);assert.equal(saved.wallet,first.wallet);
 const resources=await page.evaluate(()=>[...__lagoonQA.animalGuests.views].map(([id,m])=>({id,geometry:m.geometry.uuid,sourceGeometry:__lagoonQA.islands.get('magic-zoo').userData.zoo.actors.get('zoo-'+m.userData.zooSpecies).geometry.uuid,instances:m.count,scale:m.scale.x,poseBytes:m.userData.poseData.values.byteLength,activity:m.userData.guestActivity})));assert.ok(resources.every(r=>r.geometry===r.sourceGeometry&&r.instances===1&&r.scale>0&&r.scale<1));
 await page.evaluate(()=>{const q=__lagoonQA;q.freeze=true;const game=__lagoonSaveQA.getGame(),start=Object.values(game.zoo.guestVisits)[0].startedAt;q.animalGuests.update(game,start+20000,20,true);q.drawFrame();});
 await page.screenshot({path:dir+'/five-species-house-guests-phone.png'});
 await page.evaluate(()=>{__lagoonQA.freeze=false;return __lagoonSaveQA.cloud.flush();});
 await page.waitForFunction(()=>!__lagoonSaveQA.cloud.pending&&!__lagoonSaveQA.cloud.retryEntry&&!__lagoonSaveQA.cloud.dirty);
 for(let i=0;i<2;i++){
  await page.evaluate(()=>__lagoonSaveQA.cloud.releaseEditor());await page.reload();await page.waitForFunction(()=>window.__lagoonQA&&__lagoonSaveQA.cloud.editable);
  assert.deepEqual(await snapshot(),saved);
  await page.evaluate(()=>{__lagoonQA.cpuOnly=true;__lagoonQA.drawPaused=true;__lagoonSaveQA.getWorld().showCatHome(Object.keys(__lagoonSaveQA.getGame().housing.homes)[0]);});
  await page.waitForFunction(()=>__lagoonQA.animalGuests.views.size===6);
 }
 await page.evaluate(()=>__lagoonQA.callbacks.onSelectZooAnimal('zoo-elephant-0'));
 await page.getByRole('button',{name:'Повернути у вольєр'}).tap();
 await page.waitForFunction(()=>!__lagoonQA.animalGuests.views.has('zoo-elephant-0'));
 // Deadline is absolute: an expired offline visit has no remaining proxy.
 const expired=await page.evaluate(()=>{const q=__lagoonQA,g=__lagoonSaveQA.getGame(),end=Math.max(...Object.values(g.zoo.guestVisits).map(v=>v.endsAt));q.freeze=true;q.animalGuests.update(g,end+1,1,true);return q.animalGuests.views.size;});assert.equal(expired,0);
 await fs.writeFile(dir+'/zoo-guests.json',JSON.stringify({actualAnimalPhoneTap:tap,actualTouchDrag:drag,paidHouse:first.housing,actualHosts:first.hosts,onceOnlyBalances:true,reloads:2,records:saved.zoo.guestVisits,sharedResources:resources,expiredViews:expired},null,2));
 console.log('ZOO GUESTS: real phone tap, five species, exact shared geometry, private SQLite cloud, two reloads, cancellation and expiry pass');
}
