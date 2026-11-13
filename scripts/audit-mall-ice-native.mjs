import assert from 'node:assert/strict';
import {writeFile} from 'node:fs/promises';
import {join} from 'node:path';
export async function auditMallIceNative({page,base,headers,review,errors,httpErrors,capture}){
 const rows=[];
 const advance=async phase=>page.evaluate(target=>{const m=__lagoonQA.mall(),r=m.runtime;for(let i=0;i<40000;i++){const v=r.get('chichi');if(!v||v.phase===target)return v?{phase:v.phase,position:v.position,bought:v.bought}:null;m.update(1/60,performance.now()/1000+i/60);}throw Error('Ice cream journey stalled '+JSON.stringify([...r.visits.values()]));},phase);
 await page.evaluate(()=>__lagoonQA.mall().inspectStore('mall-ice'));await page.waitForTimeout(1300);await capture('ice-native-phone-front');
 await page.locator('.mall-store-view').click();await page.waitForTimeout(1300);await capture('ice-native-phone-interior');
 await page.locator('.mall-shop-open').click();await page.locator('.mall-dialog select').selectOption('chichi');
 assert.equal(await page.locator('.mall-ice-flavor').count(),6);await capture('ice-native-phone-menu');
 await page.locator('.mall-dialog .close').click();
 const initial=await page.evaluate(()=>__lagoonSaveQA.getGame().jobCity.profiles.chichi.coins);
 for(const [index,flavor,price]of [[0,'Блакитна лагуна',48],[1,'Космічна веселка',65]]){
  await page.evaluate(()=>__lagoonQA.mall().inspectStore('mall-ice'));await page.locator('.mall-shop-open').click();await page.locator('.mall-dialog select').selectOption('chichi');await page.locator('.mall-ice-flavor').filter({has:page.locator('h3',{hasText:flavor})}).locator('button').click();await page.waitForFunction(()=>__lagoonQA.mall().has('chichi'));
  await advance('checkout');await page.evaluate(()=>__lagoonQA.pinMall={id:'chichi',phase:'checkout',elapsed:1.1});
  await capture('ice-native-machine-order-'+index);
  const machine=await page.evaluate(()=>{const s=__lagoonQA.mall().root.userData.iceCreamStation.streams;return{matrices:s.instanceMatrix.version,positions:s.geometry.attributes.position.version,nozzles:s.count};});assert.equal(machine.nozzles,6);
  await page.evaluate(()=>__lagoonQA.pinMall=null);await advance('experience');
  await page.evaluate(()=>{const q=__lagoonQA; q.pinMall={id:'chichi',phase:'experience',elapsed:.38};q.mall().update(0,performance.now()/1000);const p=q.mall().frame('chichi',0).position;q.setMallView({x:p.x,y:p.y+.7,z:p.z,d:4,e:.10,a:2.6,fov:55,near:.12});});await page.waitForTimeout(1300);await capture('ice-native-cat-eating-'+index);
  const state=await page.evaluate(()=>{const q=__lagoonQA,p=__lagoonSaveQA.getGame().jobCity.profiles.chichi,cones=q.scene.children.filter(o=>o.userData.iceFlavor);return{profile:p,frame:q.mall().runtime.frame('chichi'),cones:cones.map(o=>({flavor:o.userData.iceFlavor,visible:o.visible,position:new q.THREE.Vector3().setFromMatrixPosition(o.matrix).toArray(),cream:o.userData.cream.scale.y})),tongue:q.cat.userData.tongue.visible,machine:{matrix:q.mall().root.userData.iceCreamStation.streams.instanceMatrix.version,position:q.mall().root.userData.iceCreamStation.streams.geometry.attributes.position.version}};});
  assert.ok(state.frame.iceCream);assert.equal(state.cones.length,1);assert.equal(state.cones[0].flavor,state.frame.iceCream.flavor);assert.ok(state.cones[0].position.every(Number.isFinite));assert.equal(state.cones[0].visible,true);assert.ok(state.cones[0].cream<1);assert.equal(state.tongue,true,'The native tongue reaches the selected cone during the lick');assert.equal(state.machine.matrix,machine.matrices);assert.equal(state.machine.position,machine.positions);assert.equal(state.profile.coins,initial-48-(index?65:0));assert.equal(Object.keys(state.profile.mall.receipts).length,index+1);assert.equal(state.profile.mall.used['mall-ice-'+state.frame.iceCream.flavor],1);
  await page.evaluate(()=>window.dispatchEvent(new Event('pagehide')));await page.waitForFunction(()=>!__lagoonSaveQA.cloud.dirty&&!__lagoonSaveQA.cloud.pending&&!__lagoonSaveQA.cloud.retryEntry);
  const remote=await(await fetch(base+'/api/save',{headers})).json();assert.equal(remote.game.jobCity.profiles.chichi.coins,state.profile.coins);
  await page.reload();await page.waitForFunction(()=>window.__lagoonQA?.mall()&&window.__lagoonSaveQA?.cloud.editable,null,{timeout:300000});await page.locator('[data-biome="autumn"]').tap();await page.waitForFunction(()=>__lagoonQA.mall().ready&&__lagoonQA.mall().has('chichi'),null,{timeout:300000});await advance('done');const restored=await page.evaluate(()=>__lagoonSaveQA.getGame().jobCity.profiles.chichi);assert.equal(restored.coins,state.profile.coins);assert.deepEqual(restored.mall.used,state.profile.mall.used);assert.deepEqual(restored.mall.receipts,state.profile.mall.receipts);rows.push({index,flavor,price,machine,state,restored});
 }
 await page.setViewportSize({width:1440,height:900});await page.evaluate(()=>__lagoonQA.mall().inspectStore('mall-ice'));await page.waitForTimeout(1300);await capture('ice-native-desktop-front');await page.locator('.mall-store-view').click();await page.waitForTimeout(1300);await capture('ice-native-desktop-interior');
 await writeFile(join(review,'ice-native.json'),JSON.stringify({rows,errors,httpErrors,renderer:'Native DPR 2 / Chromium SwiftShader. No physical-device FPS claim.'},null,2));assert.deepEqual(errors,[]);assert.deepEqual(httpErrors,[]);console.log('PASS: real six-flavor menu, two purchased native cones, fixed machine buffers, exact-once meals through two SQLite reloads.');
}
