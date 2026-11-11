import assert from 'node:assert/strict';
import {writeFile} from 'node:fs/promises';
import {join} from 'node:path';
export async function auditMallNative({page,context,base,headers,review,errors,httpErrors}){
 const capture=async name=>{await page.evaluate(()=>{const q=__lagoonQA;q.drawPaused=false;q.captureUntil=q.frames+2;});await page.waitForFunction(()=>__lagoonQA.drawPaused,null,{timeout:240000});await page.screenshot({path:join(review,name+'.png')});};
 await page.locator('.mall-access').click();await page.waitForFunction(()=>__lagoonQA.mall()?.ready&&__lagoonQA.mall().inspection,null,{timeout:240000});
 console.log('Actual ocean mall prepared: ',await page.evaluate(()=>__lagoonQA.mall().root.userData.stats));
 if(!process.env.CHICHI_MALL_GAMEPLAY_ONLY){
 await capture('mall-native-phone-all');
 await page.locator('.mall-floors button').filter({hasText:/^F3$/}).click();await page.waitForTimeout(1100);await capture('mall-native-phone-food-floor');
 for(const store of ['mall-mcd','mall-vuitton','mall-cinema','mall-ikea','mall-books','mall-sushi']){
  await page.evaluate(id=>__lagoonQA.mall().inspectStore(id),store);await page.waitForTimeout(1500);await capture(store+'-native-phone');
 }
 await page.setViewportSize({width:1440,height:900});
 await page.evaluate(()=>__lagoonQA.mall().inspect());await page.waitForTimeout(1500);await capture('mall-native-desktop-all');
 for(const store of ['mall-mcd','mall-vuitton','mall-cinema','mall-ikea','mall-books','mall-sushi']){
  await page.evaluate(id=>__lagoonQA.mall().inspectStore(id),store);await page.waitForTimeout(1500);await capture(store+'-native-desktop');
 }
 await writeFile(join(review,'mall-art-native.json'),JSON.stringify({errors,httpErrors,renderer:'Native game on Chromium SwiftShader at DPR 2; not physical-device FPS'},null,2));
 assert.deepEqual(errors,[]);assert.deepEqual(httpErrors,[]);
 if(process.env.CHICHI_MALL_ART_ONLY)return;
 }else{
 await capture('mall-native-phone-all');
 await page.locator('.mall-floors button').filter({hasText:/^F3$/}).click();await page.waitForTimeout(1100);await capture('mall-native-phone-food-floor');
 const target=await page.evaluate(()=>{const q=__lagoonQA,m=q.mall(),s=m.root.userData.stores.get('mall-mcd'),p=new q.THREE.Vector3(s.x,s.y+3,s.z);m.root.localToWorld(p);p.project(q.camera);const r=q.renderer.domElement.getBoundingClientRect();return{x:r.left+(p.x+1)*r.width/2,y:r.top+(1-p.y)*r.height/2};});
 await page.touchscreen.tap(target.x,target.y);await page.waitForFunction(()=>document.querySelector('.mall-shop-open')?.textContent.includes('McDonald'));
 await writeFile(join(review,'mall-world-touch.json'),JSON.stringify({target,errors,httpErrors},null,2));
 }
 // Actual catalogue controls start a native visit; all subsequent mutations go
 // through the application's ordinary durable commit and private SQLite server.
 await page.evaluate(()=>__lagoonQA.mall().inspectStore('mall-vuitton'));
 await page.locator('.mall-shop-open').click();await page.locator('.mall-dialog select').selectOption('chichi');
 const before=await page.evaluate(()=>__lagoonSaveQA.getGame().jobCity.profiles.chichi.coins);
 await page.locator('.mall-product button').first().click();await page.waitForFunction(()=>__lagoonQA.mall().has('chichi'));
 // Bound engine stepping is deterministic QA acceleration, not an FPS sample.
 const advance=async phase=>page.evaluate(target=>{const r=__lagoonQA.mall().runtime;for(let i=0;i<30000;i++){const v=r.get('chichi');if(!v||v.phase===target)return v?{phase:v.phase,position:v.position,bought:v.bought}:null;__lagoonQA.mall().update(1/60,performance.now()/1000+i/60);}throw Error('Mall visit stalled: '+JSON.stringify({lift:r.lift,visitors:[...r.visits.values()].map(v=>({phase:v.phase,next:v.next,position:v.position,routeFailed:v.routeFailed,bought:v.bought,returning:v.returning}))}));},phase);
 await advance('riding');await capture('mall-native-lift-passenger');
 await advance('checkout');assert.equal(await page.evaluate(()=>__lagoonSaveQA.getGame().jobCity.profiles.chichi.coins),before);
 await advance('joy');const paid=await page.evaluate(()=>__lagoonSaveQA.getGame().jobCity.profiles.chichi);assert.equal(paid.coins,before-850);assert.equal(paid.inventory['mall-vuitton-collar'],1);
 await page.evaluate(()=>window.dispatchEvent(new Event('pagehide')));await page.waitForFunction(()=>!__lagoonSaveQA.cloud.dirty&&!__lagoonSaveQA.cloud.pending&&!__lagoonSaveQA.cloud.retryEntry);
 const remote=await(await fetch(base+'/api/save',{headers})).json();assert.equal(remote.game.jobCity.profiles.chichi.coins,paid.coins);
 await page.reload();await page.waitForFunction(()=>window.__lagoonQA?.mall()&&window.__lagoonSaveQA?.cloud.editable,null,{timeout:240000});await page.locator('[data-biome="autumn"]').tap();await page.waitForFunction(()=>__lagoonQA.mall().ready,null,{timeout:240000});await page.waitForFunction(()=>__lagoonQA.mall().has('chichi'),null,{timeout:240000});
 await advance('done');const restored=await page.evaluate(()=>__lagoonSaveQA.getGame().jobCity.profiles.chichi);assert.equal(restored.coins,paid.coins);assert.equal(restored.inventory['mall-vuitton-collar'],1);assert.equal(Object.keys(restored.mall.receipts).length,1);
 await writeFile(join(review,'mall-purchase-native.json'),JSON.stringify({before,paid,restored,errors,httpErrors},null,2));assert.deepEqual(errors,[]);console.log('PASS: native catalogue, multi-level lift, purchase, once-only SQLite checkpoint/reload, inventory and return.');
}
