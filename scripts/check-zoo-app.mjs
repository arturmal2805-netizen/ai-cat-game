import assert from 'node:assert/strict';import fs from 'node:fs/promises';
export async function checkZooApp(page,dir){
 page.setDefaultTimeout(180000);
 const ids=['zoo-elephant','zoo-axolotl','zoo-otter','zoo-tiger','zoo-polar','zoo-gorilla'];
 console.log('ZOO: purchase island in native phone shop');await page.locator('#shop-open').tap();await page.getByRole('tab',{name:/Биомы/}).tap();const product=page.locator('[data-product="magic-zoo"]');assert.equal(await product.count(),1);await product.getByRole('button',{name:/^Открыть/}).tap();
 await page.evaluate(()=>__lagoonSaveQA.getWorld().focus('magic-zoo'));
 console.log('ZOO: waiting for cooperative island geometry');try{await page.waitForFunction(()=>__lagoonQA.islands.get('magic-zoo')?.userData.zoo?.actors?.size===6,undefined,{timeout:180000});}catch(error){console.log(await page.evaluate(()=>({focused:__lagoonQA.focused(),distance:__lagoonQA.getDesiredDistance(),open:[...document.querySelectorAll('dialog[open]')].map(d=>d.id),zoo:__lagoonQA.islands.get('magic-zoo')?.userData.stats})));throw error;}
 const first=await page.evaluate(()=>{const g=__lagoonSaveQA.getGame(),q=__lagoonQA;return {coins:g.coins,zoo:g.zoo,actors:q.islands.get('magic-zoo').userData.stats,oldIslands:[...q.islands.keys()].filter(id=>id!=='magic-zoo')};});assert.equal(first.coins,296400);assert.deepEqual(first.zoo.receipts,{});assert.equal(first.actors.animals,24);
 const baked=await page.evaluate(()=>[...__lagoonQA.islands.get('magic-zoo').userData.zoo.actors.values()].map(m=>({species:m.userData.zooSpecies,baked:!!m.userData.poseData.prebaked,revision:m.userData.poseData.anatomyRevision})));assert.ok(baked.every(m=>m.baked&&m.revision==='wildlife-v4'),JSON.stringify(baked));
 const liveClocks=await page.evaluate(()=>Object.fromEntries([...__lagoonQA.islands.get('magic-zoo').userData.zoo.actors].map(([id,m])=>[id,[...m.userData.uniforms.uZooFrameAt.value]])));
 await page.waitForFunction(before=>[...__lagoonQA.islands.get('magic-zoo').userData.zoo.actors].every(([id,m])=>m.userData.uniforms.uZooFrameAt.value.some((v,i)=>Math.abs(v-before[id][i])>.1)),liveClocks);
 assert.deepEqual((await page.evaluate(()=>__lagoonSaveQA.getGame().zoo)).receipts,{},'animation silently opened unpaid gates');
 await page.screenshot({path:dir+'/zoo-arrival-phone.png',timeout:180000});
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
 const snapshot=()=>page.evaluate(()=>{const g=__lagoonSaveQA.getGame();return {coins:g.coins,zoo:g.zoo,unlocked:g.unlocked,placements:g.placements};});const paid=await snapshot();assert.equal(paid.coins,187900);assert.equal(Object.keys(paid.zoo.receipts).length,5);
 const closeViews=[];for(const id of ids){await page.evaluate(id=>__lagoonQA.callbacks.onSelectCourt(id),id);await page.getByRole('button',{name:id==='zoo-axolotl'?'Аксолотль зблизька':'Тварина зблизька',exact:true}).tap();await page.waitForFunction(id=>__lagoonQA.getCourtCamera()?.id===id&&__lagoonQA.getCourtCamera()?.zooAnimal===0&&Math.abs(__lagoonQA.getDistance()-__lagoonQA.getDesiredDistance())<.15,id);await page.screenshot({path:dir+'/'+id+'-close-phone.png',timeout:180000});closeViews.push(await page.evaluate(()=>({id:__lagoonQA.getCourtCamera().id,distance:__lagoonQA.getDistance(),look:__lagoonQA.desiredLook.toArray()})));await page.locator('.court-camera-exit').filter({hasText:/Вернуться/}).tap();}

 if(process.env.CHICHI_ZOO_VISUAL_ONLY){await fs.writeFile(dir+'/zoo-visual.json',JSON.stringify({first,baked,liveClocks,paid,closeViews},null,2));console.log('ZOO: final model assets, independent motion and all six native phone close cameras passed.');return;}

 await page.evaluate(()=>__lagoonQA.callbacks.onSelectCourt('zoo-axolotl'));await page.getByRole('button',{name:'Аксолотль зблизька'}).tap();
 await page.waitForFunction(()=>__lagoonQA.getCourtCamera()?.zooAnimal===0&&__lagoonQA.getDistance()<6.2);await page.screenshot({path:dir+'/zoo-axolotl-phone.png',timeout:180000});await page.locator('.court-camera-exit').filter({hasText:/Вернуться/}).tap();
 const visits=await page.evaluate(async ids=>{const q=__lagoonQA,g=__lagoonSaveQA.getGame(),results=[];q.freeze=true;q.court.clear();
 for(const n of q.npcs.values())n.manualUntil=performance.now()+1e9;
 // Private audit advances the real native visitor runtime, never production save time.
 for(const id of ids){const v=q.court.start({catId:'luna',objectId:id,position:{x:0,z:17.9},radius:.65});if(!v)throw Error('No visit '+id);let photo=false,wave=false;for(let f=0;f<3000&&q.court.get('luna');f++){q.court.step(.05,f*.05);photo||=v.holding;wave||=!!v.reaction?.paw;}results.push({id,finished:!q.court.get('luna'),photo,wave});}return results;},ids);
 assert.ok(visits.every(v=>v.finished&&v.photo&&v.wave));
 // Native manual actor (tiny kitten) must reserve a real path on the zoo island.
 const manual=await page.evaluate(()=>{const q=__lagoonQA,g=structuredClone(__lagoonSaveQA.getGame());
 g.catDestinations['adopt-crumb']='magic-zoo';g.catDestinations['adopt-marshmallow']='magic-zoo';__lagoonSaveQA.commit(g);q.court.cancel('luna');
 const result=[];for(const [i,id]of ['adopt-crumb','adopt-marshmallow'].entries()){const moved=__lagoonSaveQA.getWorld().moveResident(id,'magic-zoo',{x:207+(i?3:-3),z:153.7});const started=q.performResident(id,{action:'explore',activityId:'zoo-axolotl'});result.push({id,moved,started});}return result;});assert.ok(manual.every(m=>m.moved&&m.started),JSON.stringify(manual));
 await page.evaluate(()=>{const q=__lagoonQA;for(let i=0;i<1000;i++){q.court.step(.05,performance.now()/1000);const v=q.court.get('adopt-crumb');if(v?.phase==='watch'&&v.elapsed>8)break;}q.freeze=false;});
 await page.evaluate(()=>{const q=__lagoonQA;q.enterCourt('zoo-axolotl');q.desiredLook.set(198.5,1.2,140.3);window.zooOriginalStep=q.court.step;q.court.step=(...args)=>{window.zooOriginalStep(...args);for(const id of ['adopt-crumb','adopt-marshmallow']){const v=q.court.get(id);if(v?.phase==='watch')v.elapsed=8;}};});await page.waitForFunction(()=>__lagoonQA.courtFoods.has('adopt-crumb')&&Math.abs(__lagoonQA.getDistance()-17)<.3);await page.screenshot({path:dir+'/zoo-native-cat-photo.png',timeout:180000});
 await page.evaluate(()=>{__lagoonQA.freeze=true;__lagoonQA.court.step=window.zooOriginalStep;delete window.zooOriginalStep;__lagoonQA.court.clear();});
 await page.evaluate(()=>__lagoonSaveQA.cloud.flush());await page.waitForFunction(()=>!__lagoonSaveQA.cloud.pending&&!__lagoonSaveQA.cloud.retryEntry&&!__lagoonSaveQA.cloud.dirty);
 for(let i=0;i<2;i++){await page.evaluate(()=>__lagoonSaveQA.cloud.releaseEditor());await page.reload();await page.waitForFunction(()=>window.__lagoonQA&&__lagoonSaveQA.cloud.editable);assert.deepEqual(await snapshot(),paid);}
 await fs.writeFile(dir+'/zoo-app.json',JSON.stringify({first,baked,liveClocks,paid,visits,manual,gathering,closeViews,reloads:2},null,2));
 console.log('Zoo: native island purchase, five paid gates, close camera, six visitor actions and two durable SQLite reloads.');
}
