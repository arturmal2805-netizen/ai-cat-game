import assert from 'node:assert/strict';
import {writeFile} from 'node:fs/promises';
import {join} from 'node:path';

export async function auditMallCameraNative({page,review,errors,httpErrors,capture}){
  const state=()=>page.evaluate(()=>{const q=__lagoonQA,m=q.mall(),head=m.guest?.model.userData.head,point=head?.getWorldPosition(new q.THREE.Vector3());return {floor:m.floor,inspection:m.inspection,guest:m.guest?.id,enabled:q.faceCamera.enabled,near:q.camera.near,fov:q.camera.fov,point:point?.toArray(),camera:q.camera.position.toArray(),panel:!document.querySelector('.mall-floors').hidden,dpr:q.renderer.getPixelRatio()};});
  assert.equal((await state()).floor,1);
  await page.waitForTimeout(1500);await capture('mall-overhead-phone');
  await page.locator('.mall-guest-camera').tap();await page.waitForTimeout(1200);
  const first=await state();assert.ok(first.guest?.startsWith('mall-ambient-'));assert.ok(first.enabled&&first.panel);assert.equal(first.near,.15);assert.equal(first.dpr,2);
  await capture('mall-guest-phone');
  await page.locator('.mall-guest-camera').tap();await page.waitForTimeout(900);
  const second=await state();assert.notEqual(second.guest,first.guest);
  await page.setViewportSize({width:844,height:390});await page.waitForTimeout(1100);
  const landscape=await state();assert.equal(landscape.near,.15);assert.ok(landscape.fov<=45&&landscape.enabled&&landscape.panel);await capture('mall-guest-landscape');
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
  await writeFile(join(review,'camera-results.json'),JSON.stringify({first,second,landscape,errors,httpErrors,renderer:'Chromium SwiftShader, DPR2; no physical-device FPS claim'},null,2));
  assert.deepEqual(errors,[]);assert.deepEqual(httpErrors,[]);
  console.log('PASS: Mall floor camera, distinct native visitors, surface release, phone resize, world camera, EXIT and reentry.');
}
