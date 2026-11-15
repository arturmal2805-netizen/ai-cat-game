import assert from 'node:assert/strict';
import {writeFile} from 'node:fs/promises';
import {join} from 'node:path';

export async function auditMallCameraNative({page,review,errors,httpErrors,capture}){
  const state=()=>page.evaluate(()=>{const q=__lagoonQA,m=q.mall(),head=m.guest?.model.userData.head,point=head?.getWorldPosition(new q.THREE.Vector3());return {floor:m.floor,inspection:m.inspection,guest:m.guest?.id,enabled:q.faceCamera.enabled,near:q.camera.near,fov:q.camera.fov,point:point?.toArray(),camera:q.camera.position.toArray(),panel:!document.querySelector('.mall-floors').hidden,dpr:q.renderer.getPixelRatio(),render:{...q.renderer.info.render},memory:{...q.renderer.info.memory}};});
  const owned=()=>page.evaluate(()=>{const g=__lagoonSaveQA.getGame();return {coins:g.coins,inventory:g.inventory,placements:g.placements,wallets:Object.fromEntries(Object.entries(g.jobCity.profiles).map(([id,p])=>[id,p.coins]))};});
  const initialOwned=await owned();
  const performanceRows=[];
  const samplePerformance=async phase=>{
    if(!process.env.CHICHI_MALL_CAMERA_PROFILE||process.env.CHICHI_MALL_CAMERA_SKIP_TIMING)return;
    const initial=await page.evaluate(()=>__cameraProfile.report());
    await page.evaluate(()=>{__cameraProfile.reset();const q=__lagoonQA;q.captureUntil=q.frames+16;q.drawPaused=false;});
    await page.waitForFunction(()=>__lagoonQA.drawPaused,null,{timeout:240000});
    const measured=await page.evaluate(()=>__cameraProfile.report());assert.ok(measured.samples>=8,'profile counts only actual submitted frames');performanceRows.push({phase,initial,measured});
  };
  assert.equal((await state()).floor,1);
  await page.waitForTimeout(1500);await capture('mall-overhead-phone');
  await page.locator('.mall-guest-camera').evaluate(b=>{const handler=b.onclick;b.onclick=function(event){const original=Math.random;Math.random=()=>0;try{return handler.call(this,event);}finally{Math.random=original;b.onclick=handler;}};});
  await page.locator('.mall-guest-camera').tap();await page.waitForTimeout(1200);
  const first=await state();assert.ok(first.guest?.startsWith('mall-ambient-'));assert.ok(first.enabled&&first.panel);assert.equal(first.near,.15);assert.equal(first.dpr,2);
  await capture('mall-guest-phone');Object.assign(first,await state());await samplePerformance('visitor-phone');
  await page.locator('.mall-guest-camera').evaluate(b=>{const handler=b.onclick;b.onclick=function(event){const original=Math.random;Math.random=()=>0;try{return handler.call(this,event);}finally{Math.random=original;b.onclick=handler;}};});
  await page.locator('.mall-guest-camera').tap();await page.waitForTimeout(900);
  const second=await state();assert.notEqual(second.guest,first.guest);
  await page.setViewportSize({width:844,height:390});await page.waitForTimeout(1100);
  const landscape=await state();assert.equal(landscape.near,.15);assert.ok(landscape.fov<=45&&landscape.enabled&&landscape.panel);await capture('mall-guest-landscape');Object.assign(landscape,await state());await samplePerformance('visitor-landscape');
  if(process.env.CHICHI_MALL_CAMERA_PROFILE){await writeFile(join(review,'performance.json'),JSON.stringify({performanceRows,first,second,landscape,errors,httpErrors,renderer:'Sequential Chromium SwiftShader DPR2; software diagnostics only, not hardware FPS'},null,2));assert.deepEqual(errors,[]);assert.deepEqual(httpErrors,[]);if(process.env.CHICHI_MALL_CAMERA_PROFILE_ONLY){
    assert.deepEqual(await owned(),initialOwned,'observing visitors cannot spend or replace owned assets');
    await page.evaluate(()=>window.dispatchEvent(new Event('pagehide')));await page.waitForFunction(()=>!__lagoonSaveQA.cloud.dirty&&!__lagoonSaveQA.cloud.pending&&!__lagoonSaveQA.cloud.retryEntry);
    await page.reload();await page.waitForFunction(()=>window.__lagoonQA?.submarine()&&window.__lagoonSaveQA?.cloud.editable,null,{timeout:240000});
    await page.evaluate(()=>{__lagoonQA.drawPaused=true;});assert.deepEqual(await owned(),initialOwned);assert.equal(await page.evaluate(()=>__lagoonQA.submarine().controlled),false);
    await page.locator('[data-biome="autumn"]').tap();await page.locator('.mall-access').tap({timeout:30000});await page.waitForFunction(()=>__lagoonQA.mall().ready&&__lagoonQA.mall().inspection,null,{timeout:240000});
    await page.locator('.mall-guest-camera').tap();await page.waitForTimeout(1000);await capture('visitor-after-sqlite-reload');
    assert.equal((await state()).enabled,true);assert.equal((await state()).floor>=1,true);assert.deepEqual(await owned(),initialOwned);
    if(process.env.CHICHI_MALL_LOW_CAMERA_AUDIT){const angle=await page.evaluate(()=>{const q=__lagoonQA,head=q.mall().guest.model.userData.head,target=q.faceCamera.facePoint(new q.THREE.Vector3()),scale=head.getWorldScale(new q.THREE.Vector3());target.y-=.28*Math.max(scale.x,scale.y,scale.z);const d=q.camera.position.clone().sub(target);return Math.atan2(d.y,Math.hypot(d.x,d.z))*180/Math.PI;});assert.ok(angle>=10&&angle<=20,'low visitor view survives SQLite reload');}
    await writeFile(join(review,'reload.json'),JSON.stringify({before:initialOwned,after:await owned(),camera:await state(),errors,httpErrors},null,2));assert.deepEqual(errors,[]);assert.deepEqual(httpErrors,[]);return;
  }}
  const allGuests=[];
  if(process.env.CHICHI_MALL_LOW_CAMERA_AUDIT){
    const ids=await page.evaluate(()=>__lagoonQA.mall().root.userData.guestActors.filter(g=>!g.roomGuest).map(g=>g.id));
    for(const id of ids){
      await page.locator('.mall-guest-camera').evaluate((b,id)=>{const m=__lagoonQA.mall(),pool=m.root.userData.guestActors.filter(g=>!g.roomGuest&&g.id!==m.guest?.id);const index=pool.findIndex(g=>g.id===id);if(index<0)return;const handler=b.onclick;b.onclick=function(event){const original=Math.random;Math.random=()=>(index+.1)/pool.length;try{return handler.call(this,event);}finally{Math.random=original;b.onclick=handler;}};},id);
      if((await state()).guest!==id)await page.locator('.mall-guest-camera').tap();await page.waitForTimeout(850);
      const row=await page.evaluate(()=>{const q=__lagoonQA,m=q.mall(),head=m.guest.model.userData.head,target=q.faceCamera.facePoint(new q.THREE.Vector3()),scale=head.getWorldScale(new q.THREE.Vector3());target.y-=.28*Math.max(scale.x,scale.y,scale.z);const eye=q.camera.position.clone(),delta=eye.clone().sub(target),free=eye.clone(),valid=m.resolveGuestCamera(free,target);return {id:m.guest.id,floor:m.floor,angle:Math.atan2(delta.y,Math.hypot(delta.x,delta.z))*180/Math.PI,valid,adjustment:eye.distanceTo(free),eye:eye.toArray(),target:target.toArray()};});
      assert.equal(row.id,id);assert.ok(row.angle>=10&&row.angle<=20,JSON.stringify(row));assert.equal(row.valid,true,JSON.stringify(row));assert.ok(row.adjustment<.03,JSON.stringify(row));allGuests.push(row);
    }
  }
  await page.locator('.mall-floors button').filter({hasText:/^F3$/}).tap();await page.waitForTimeout(900);
  assert.equal((await state()).enabled,false);assert.equal((await state()).floor,3);await capture('mall-floor3-landscape');
  // Follow a real runtime visitor, then move its visit back to surface without
  // deleting it. The camera must release immediately, not track a stale visit.
  const shopper=await page.evaluate(async()=>{const q=__lagoonQA,m=q.mall();await m.start('chichi','mall-mcd');const v=m.runtime.get('chichi');if(!v)return false;v.floor=3;v.phase='experience';v.elapsed=0;v.position={x:0,y:-145,z:100};return true;});
  assert.ok(shopper);
  await page.evaluate(()=>{const q=__lagoonQA,m=q.mall(),native=m.root.userData.guestActors;window.__cameraAmbient=native.splice(0);});
  await page.locator('.mall-guest-camera').tap();assert.equal((await state()).guest,'chichi');
  await page.evaluate(()=>{const m=__lagoonQA.mall();m.runtime.get('chichi').floor=0;m.update(0,performance.now()/1000);m.root.userData.guestActors.push(...window.__cameraAmbient);m.detach('chichi');});
  assert.equal((await state()).enabled,false);
  await page.locator('.mall-guest-camera').tap();await page.locator('#camera-all').click({force:true});
  assert.equal((await state()).inspection,false);assert.equal((await state()).enabled,false);
  await page.locator('[data-biome="autumn"]').tap();await page.locator('.mall-access').tap();
  assert.equal((await state()).floor,1);await page.locator('.mall-guest-camera').tap();
  await page.locator('.mall-floors button').filter({hasText:/^EXIT$/}).tap();assert.equal((await state()).enabled,false);
  await page.setViewportSize({width:390,height:844});
  await page.evaluate(()=>{const q=__lagoonQA,p=q.mall().root.position;q.setMallView({x:p.x,y:-140,z:p.z+65,d:145,a:.06,e:.5,fov:60,near:.5});});
  await page.waitForTimeout(1200);
  const tap=await page.evaluate(()=>{const q=__lagoonQA,canvas=q.renderer.domElement,rect=canvas.getBoundingClientRect();for(const y of [.5,.6,.7])for(const x of [.5,.4,.6]){const px=rect.x+rect.width*x,py=rect.y+rect.height*y;if(document.elementFromPoint(px,py)!==canvas)continue;q.raycaster.setFromCamera(new q.THREE.Vector2(x*2-1,1-y*2),q.camera);if(q.raycaster.intersectObject(q.mall().root,true).length)return {x:px,y:py};}return null;});
  assert.ok(tap,'Mall has an unobstructed physical screen target');await page.touchscreen.tap(tap.x,tap.y);
  await page.waitForFunction(()=>__lagoonQA.mall().inspection&&__lagoonQA.mall().floor===1);
  await capture('mall-physical-tap-overhead');
  await writeFile(join(review,'camera-results.json'),JSON.stringify({first,second,landscape,allGuests,errors,httpErrors,renderer:'Chromium SwiftShader, DPR2; no physical-device FPS claim'},null,2));
  assert.deepEqual(errors,[]);assert.deepEqual(httpErrors,[]);
  console.log('PASS: Mall floor camera, distinct native visitors, surface release, phone resize, world camera, EXIT and reentry.');
}
