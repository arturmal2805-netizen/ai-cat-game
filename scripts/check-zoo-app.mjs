import assert from 'node:assert/strict';import fs from 'node:fs/promises';import {ZOO_GATE,ZOO_BIOME,ZOO_LINEAR_SCALE,ZOO_EXHIBITS,zooSeats} from '../public/zoo-data.js';
export async function checkZooApp(page,dir){
 page.setDefaultTimeout(180000);
 const fast=!!process.env.CHICHI_ZOO_FIXED_DRAWS;
 if(fast)await page.evaluate(()=>{__lagoonQA.cpuOnly=true;__lagoonQA.drawPaused=true;});
 const capture=async options=>{if(fast)await page.evaluate(()=>__lagoonQA.drawFrame());return page.screenshot(options);};
 const ids=ZOO_EXHIBITS.map(e=>e.id);
 console.log('ZOO: purchase island in native phone shop');await page.locator('#shop-open').tap();await page.getByRole('tab',{name:/Биомы/}).tap();const product=page.locator('[data-product="magic-zoo"]');assert.equal(await product.count(),1);await product.getByRole('button',{name:/^Открыть/}).tap();
 await page.evaluate(()=>__lagoonSaveQA.getWorld().focus('magic-zoo'));
 console.log('ZOO: waiting for cooperative island geometry');try{await page.waitForFunction(()=>__lagoonQA.islands.get('magic-zoo')?.userData.zoo?.actors?.size===5,undefined,{timeout:180000});}catch(error){console.log(await page.evaluate(()=>({focused:__lagoonQA.focused(),distance:__lagoonQA.getDesiredDistance(),open:[...document.querySelectorAll('dialog[open]')].map(d=>d.id),zoo:__lagoonQA.islands.get('magic-zoo')?.userData.stats})));throw error;}
 const first=await page.evaluate(()=>{const g=__lagoonSaveQA.getGame(),q=__lagoonQA;return {coins:g.coins,zoo:g.zoo,actors:q.islands.get('magic-zoo').userData.stats,oldIslands:[...q.islands.keys()].filter(id=>id!=='magic-zoo')};});assert.equal(first.coins,296400);assert.deepEqual(first.zoo.receipts,{});assert.equal(first.actors.animals,21);
 const baked=await page.evaluate(()=>[...__lagoonQA.islands.get('magic-zoo').userData.zoo.actors.values()].map(m=>({species:m.userData.zooSpecies,baked:!!m.userData.poseData.prebaked,revision:m.userData.poseData.anatomyRevision,detailRevision:m.userData.poseData.detailRevision})));assert.ok(baked.every(m=>m.baked&&m.revision==='wildlife-v4'),JSON.stringify(baked));assert.equal(baked.find(m=>m.species==='polar').detailRevision,'polar-v5');
 const liveClocks=await page.evaluate(()=>Object.fromEntries([...__lagoonQA.islands.get('magic-zoo').userData.zoo.actors].map(([id,m])=>[id,[...m.userData.uniforms.uZooFrameAt.value]])));
 await page.waitForFunction(before=>[...__lagoonQA.islands.get('magic-zoo').userData.zoo.actors].every(([id,m])=>m.userData.uniforms.uZooFrameAt.value.some((v,i)=>Math.abs(v-before[id][i])>.1)),liveClocks);
 assert.deepEqual((await page.evaluate(()=>__lagoonSaveQA.getGame().zoo)).receipts,{},'animation silently opened unpaid gates');
 await capture({path:dir+'/zoo-arrival-phone.png',timeout:180000});
 if(!process.env.CHICHI_ZOO_VISUAL_ONLY){const beforeGather=await page.evaluate(()=>{const q=__lagoonQA;const out={};for(const [id,n]of q.npcs){n.leisureBiome='moon';n.manualAnchor={x:n.carrier.position.x,z:n.carrier.position.z};out[id]={x:n.carrier.position.x,z:n.carrier.position.z};}return out;});
 await page.locator('#island-open').tap();await page.locator('#island-gather').tap();
 const gathering=await page.evaluate(()=>[...__lagoonQA.npcs].map(([id,n])=>({id,biome:n.profile.biome,stale:n.leisureBiome,anchor:n.manualAnchor,invited:n.manualUntil>performance.now()})));
 assert.ok(gathering.length>=4);assert.ok(gathering.every(n=>n.biome==='magic-zoo'&&n.stale===null&&n.anchor===null&&n.invited));
 await page.waitForFunction(before=>[...__lagoonQA.npcs].filter(([id,n])=>before[id]&&Math.hypot(n.carrier.position.x-before[id].x,n.carrier.position.z-before[id].z)>.2).length>=2,beforeGather);
 console.log('ZOO: native recall clears stale leisure islands and multiple free residents actually move');}
 const gathering=await page.evaluate(()=>[...__lagoonQA.npcs].map(([id,n])=>({id,biome:n.profile.biome,stale:n.leisureBiome,anchor:n.manualAnchor,invited:n.manualUntil>performance.now()})));

 for(const id of ids.slice(1)){
  await page.evaluate(id=>__lagoonQA.callbacks.onSelectCourt(id),id);await page.locator('#item-dialog').getByRole('button',{name:/^Відкрити/}).tap();await page.locator('.court-camera-exit').filter({hasText:/Вернуться/}).tap();
 }
 const snapshot=()=>page.evaluate(()=>{const g=__lagoonSaveQA.getGame();return {coins:g.coins,zoo:g.zoo,unlocked:g.unlocked,placements:g.placements};});const paid=await snapshot();assert.equal(paid.coins,205900);assert.equal(Object.keys(paid.zoo.receipts).length,4);
 const enclosureViews=[];
 for(const id of ids){
  await page.evaluate(id=>__lagoonQA.callbacks.onSelectCourt(id),id);await page.getByRole('button',{name:'📷 Камера вольєра',exact:true}).tap();
  await page.waitForFunction(id=>__lagoonQA.getCourtCamera()?.id===id&&__lagoonQA.getCourtCamera()?.zooEnclosure&&Math.abs(__lagoonQA.getDistance()-__lagoonQA.getDesiredDistance())<.2,id);
  enclosureViews.push(await page.evaluate(()=>({id:__lagoonQA.getCourtCamera().id,distance:__lagoonQA.getDistance(),aspect:__lagoonQA.camera.aspect,look:__lagoonQA.desiredLook.toArray()})));await capture({path:dir+'/'+id+'-enclosure-phone.png',timeout:180000});await page.locator('.court-camera-exit').filter({hasText:/Вернуться/}).tap();
 }
 const closeViews=[];for(const id of ids){await page.evaluate(id=>__lagoonQA.callbacks.onSelectCourt(id),id);await page.getByRole('button',{name:id==='zoo-axolotl'?'Аксолотль зблизька':'Тварина зблизька',exact:true}).tap();await page.waitForFunction(id=>__lagoonQA.getCourtCamera()?.id===id&&__lagoonQA.getCourtCamera()?.zooAnimal===0&&Math.abs(__lagoonQA.getDistance()-__lagoonQA.getDesiredDistance())<.15,id);await capture({path:dir+'/'+id+'-close-phone.png',timeout:180000});closeViews.push(await page.evaluate(()=>({id:__lagoonQA.getCourtCamera().id,distance:__lagoonQA.getDistance(),look:__lagoonQA.desiredLook.toArray()})));await page.locator('.court-camera-exit').filter({hasText:/Вернуться/}).tap();}

 if(process.env.CHICHI_ZOO_VISUAL_ONLY){await fs.writeFile(dir+'/zoo-visual.json',JSON.stringify({first,baked,liveClocks,paid,closeViews,enclosureViews},null,2));console.log('ZOO: final model assets, independent motion and all five native phone close cameras passed.');return;}

 await page.evaluate(()=>__lagoonQA.callbacks.onSelectCourt('zoo-axolotl'));await page.getByRole('button',{name:'Аксолотль зблизька'}).tap();
 await page.waitForFunction(()=>__lagoonQA.getCourtCamera()?.zooAnimal===0&&__lagoonQA.getDistance()<6.2);await capture({path:dir+'/zoo-axolotl-phone.png',timeout:180000});await page.locator('.court-camera-exit').filter({hasText:/Вернуться/}).tap();
 const visits=await page.evaluate(async ({ids,gate})=>{const q=__lagoonQA,g=__lagoonSaveQA.getGame(),results=[];q.freeze=true;q.court.clear();
 for(const n of q.npcs.values())n.manualUntil=performance.now()+1e9;
 // Private audit advances the real native visitor runtime, never production save time.
 for(const id of ids){const v=q.court.start({catId:'luna',objectId:id,position:JSON.parse(JSON.stringify(gate)),radius:.65});if(!v)throw Error('No visit '+id);let photo=false,wave=false;for(let f=0;f<3000&&q.court.get('luna');f++){q.court.step(.05,f*.05);photo||=v.holding;wave||=!!v.reaction?.paw;}results.push({id,finished:!q.court.get('luna'),photo,wave});}return results;},{ids,gate:ZOO_GATE});
 assert.ok(visits.every(v=>v.finished&&v.photo&&v.wave));
 // Native manual actor (tiny kitten) must reserve a real path on the zoo island.
 const manual=await page.evaluate(gate=>{const q=__lagoonQA,g=structuredClone(__lagoonSaveQA.getGame());
 g.catDestinations['adopt-crumb']='magic-zoo';g.catDestinations['adopt-marshmallow']='magic-zoo';__lagoonSaveQA.commit(g);q.court.cancel('luna');
 const result=[];for(const [i,id]of ['adopt-crumb','adopt-marshmallow'].entries()){const moved=__lagoonSaveQA.getWorld().moveResident(id,'magic-zoo',{x:207+(i?3:-3),z:136+gate.z-.2});const started=q.performResident(id,{action:'explore',activityId:'zoo-axolotl'});result.push({id,moved,started});}return result;},ZOO_GATE);assert.ok(manual.every(m=>m.moved&&m.started),JSON.stringify(manual));
 await page.evaluate(()=>{const q=__lagoonQA;for(let i=0;i<1000;i++){q.court.step(.05,performance.now()/1000);const v=q.court.get('adopt-crumb');if(v?.phase==='watch'&&v.elapsed>8)break;}q.freeze=false;});
 await page.evaluate(()=>{const q=__lagoonQA;q.enterCourt('zoo-axolotl');const v=q.court.get('adopt-crumb');q.desiredLook.set(207+v.position.x-1.8,1.2,136+v.position.z-.8);window.zooOriginalStep=q.court.step;q.court.step=(...args)=>{window.zooOriginalStep(...args);for(const id of ['adopt-crumb','adopt-marshmallow']){const v=q.court.get(id);if(v?.phase==='watch')v.elapsed=8;}};});await page.waitForFunction(()=>__lagoonQA.courtFoods.has('adopt-crumb')&&Math.abs(__lagoonQA.getDistance()-__lagoonQA.getDesiredDistance())<.3);await capture({path:dir+'/zoo-native-cat-photo.png',timeout:180000});
 await page.evaluate(()=>{__lagoonQA.freeze=true;__lagoonQA.court.step=window.zooOriginalStep;delete window.zooOriginalStep;__lagoonQA.court.clear();});

 const carries=[];
 for(const id of ['adopt-crumb','adopt-marshmallow']){
  const state=await page.evaluate(({id,seat})=>{const q=__lagoonQA;q.court.clear();const moved=__lagoonSaveQA.getWorld().moveResident(id,'magic-zoo',{x:207+seat.x,z:136+seat.z});const started=q.performResident(id,{action:'explore',activityId:'zoo-gorilla'});const v=q.court.get(id);if(!v)throw Error('No native gorilla visit');for(let i=0;i<400;i++){q.court.step(.05,performance.now()/1000);if(v.phase==='watch'&&v.elapsed>13.9)break;}window.zooPlayStep=q.court.step;q.court.step=(dt,t,...rest)=>{const v=q.court.get(id);if(v?.phase==='watch')v.elapsed=13.9-dt;return window.zooPlayStep(dt,t,...rest);};q.freeze=false;q.enterCourt('zoo-gorilla',0);return {id,moved,started,carry:v.zooCarry,position:{...v.position},seat:v.seat};},{id,seat:zooSeats(ZOO_EXHIBITS.find(e=>e.species==='gorilla'))[0]});
  assert.ok(state.moved&&state.started&&state.carry>.99,JSON.stringify(state));await page.waitForFunction(id=>{const q=__lagoonQA,n=q.npcs.get(id),v=q.court.get(id);return n&&v&&n.carrier.position.y>1.5&&Math.abs(n.carrier.position.y-v.position.y)<.02;},id);await capture({path:dir+'/'+id+'-native-gorilla-carry.png',timeout:180000});
  await page.locator('#camera-all').tap();await page.waitForFunction(()=>!__lagoonQA.faceCamera.enabled);
  await page.evaluate(()=>__lagoonQA.callbacks.onSelectCourt('zoo-gorilla'));await page.waitForTimeout(650);assert.equal(await page.locator('#item-guest-camera').isVisible(),true);assert.equal(await page.locator('#item-guest-camera').isEnabled(),true);await page.locator('#item-guest-camera').tap();await page.waitForFunction(()=>__lagoonQA.faceCamera.enabled);
  const guest=await page.evaluate(()=>{const q=__lagoonQA,target=q.faceCamera.facePoint(new q.THREE.Vector3()),ids=__lagoonSaveQA.getWorld().zooGuests();return ids.find(id=>{const model=id==='chichi'?q.cat:q.npcs.get(id)?.model;return model?.userData.head.localToWorld(new q.THREE.Vector3(0,.035,.18)).distanceTo(target)<.001;});});assert.ok(guest,'guest camera followed a cat outside the zoo');state.cameraGuest=guest;await capture({path:dir+'/'+id+'-zoo-guest-camera.png',timeout:180000});assert.equal(await page.evaluate(()=>__lagoonQA.renderer.getContext().isContextLost()),false);await page.locator('#camera-island').tap();await page.waitForFunction(()=>!__lagoonQA.faceCamera.enabled);
  await page.evaluate(id=>{const q=__lagoonQA;q.freeze=true;q.court.step=window.zooPlayStep;delete window.zooPlayStep;q.court.cancel(id);},id);carries.push(state);
 }
 await page.evaluate(()=>__lagoonSaveQA.cloud.flush());await page.waitForFunction(()=>!__lagoonSaveQA.cloud.pending&&!__lagoonSaveQA.cloud.retryEntry&&!__lagoonSaveQA.cloud.dirty);
 for(let i=0;i<2;i++){await page.evaluate(()=>__lagoonSaveQA.cloud.releaseEditor());await page.reload();await page.waitForFunction(()=>window.__lagoonQA&&__lagoonSaveQA.cloud.editable);assert.deepEqual(await snapshot(),paid);}
 await fs.writeFile(dir+'/zoo-app.json',JSON.stringify({first,baked,liveClocks,paid,visits,manual,gathering,closeViews,enclosureViews,carries,reloads:2},null,2));
 console.log('Zoo: native island purchase, four paid gates, close camera, five visitor actions and two durable SQLite reloads.');
}
