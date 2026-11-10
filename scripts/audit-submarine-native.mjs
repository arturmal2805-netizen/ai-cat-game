import assert from 'node:assert/strict';import{writeFile}from'node:fs/promises';import{join}from'node:path';
export async function auditSubmarine({page,context,base,headers,review,errors,httpErrors}){
 const pose=()=>page.evaluate(()=>__lagoonQA.submarine().snapshot());
 const image=async name=>{await page.evaluate(()=>{const q=__lagoonQA;q.captureUntil=q.frames+1;q.drawPaused=false;});await page.waitForFunction(()=>__lagoonQA.drawPaused);console.log('Captured native frame',name,await page.evaluate(()=>({calls:__lagoonQA.renderer.info.render.calls,triangles:__lagoonQA.renderer.info.render.triangles})));await page.screenshot({path:join(review,name+'-phone.png')});};
 await page.waitForFunction(()=>__lagoonQA.submarine()?.boat);
 await page.locator('[data-sub-enter]').tap();await page.waitForFunction(()=>__lagoonQA.submarine().phase==='piloting');
 const seat=await page.evaluate(()=>{const q=__lagoonQA,s=q.submarine();const p=s.boat.localToWorld(s.boat.userData.seat.clone());return p.distanceTo(q.chichiCarrier.position);});assert.ok(seat<.005,seat);console.log('Native pilot seated',seat);
 const start=await pose();await page.keyboard.down('w');await page.waitForFunction(z=>__lagoonQA.submarine().physics.state.z<z-4,start.z);await page.keyboard.up('w');
 let before=await pose();await page.keyboard.down('a');await page.waitForFunction(y=>{const a=__lagoonQA.submarine().physics.state.yaw-y;return Math.atan2(Math.sin(a),Math.cos(a))<-.25;},before.yaw);await page.keyboard.up('a');
 before=await pose();await page.keyboard.down('d');await page.waitForFunction(y=>{const a=__lagoonQA.submarine().physics.state.yaw-y;return Math.atan2(Math.sin(a),Math.cos(a))>.25;},before.yaw);await page.keyboard.up('d');
 await page.keyboard.down('Shift');await page.waitForFunction(()=>__lagoonQA.submarine().physics.state.y<-7);await page.keyboard.up('Shift');
 await page.keyboard.down('s');await page.waitForFunction(()=>__lagoonQA.submarine().physics.state.speed< -2);await page.keyboard.up('s');await image('submarine-chase');
 await page.keyboard.press('c');await page.waitForFunction(()=>__lagoonQA.submarine().physics.state.mode==='cockpit'&&__lagoonQA.camera.position.y<0);await image('submarine-cockpit');
 const button=page.locator('[data-sub-key="KeyW"]'),bounds=await button.boundingBox();assert.ok(bounds);const cdp=await context.newCDPSession(page),point={x:bounds.x+bounds.width/2,y:bounds.y+bounds.height/2};
 await cdp.send('Input.dispatchTouchEvent',{type:'touchStart',touchPoints:[point]});await page.waitForFunction(()=>__lagoonQA.submarine().physics.state.speed>2);await cdp.send('Input.dispatchTouchEvent',{type:'touchEnd',touchPoints:[]});
 await page.keyboard.press('c');const driven=await pose();assert.equal(driven.active,true);assert.ok(driven.y< -5);console.log('WASD, reverse, dive, two cameras and real touch throttle passed',driven);
 await page.waitForFunction(()=>!__lagoonSaveQA.cloud.dirty&&!__lagoonSaveQA.cloud.pending&&!__lagoonSaveQA.cloud.retryEntry);
 const remote=await(await fetch(base+'/api/save',{headers})).json();assert.equal(remote.game.mosasaurSubmarine.active,true);
 await page.reload();await page.waitForFunction(()=>window.__lagoonQA?.submarine()?.phase==='piloting'&&window.__lagoonSaveQA?.cloud.editable);await page.evaluate(()=>__lagoonQA.drawPaused=true);const restored=await pose();
 assert.equal(restored.mode,remote.game.mosasaurSubmarine.mode);assert.ok(Math.hypot(restored.x-remote.game.mosasaurSubmarine.x,restored.z-remote.game.mosasaurSubmarine.z)<.1);assert.equal(restored.active,true);console.log('SQLite reload restored the actual pilot and vehicle',restored);
 await page.locator('[data-sub-return]').tap();await page.waitForFunction(()=>__lagoonQA.submarine().phase==='docked',null,{timeout:120000});
 const end=await page.evaluate(()=>{const q=__lagoonQA,b=q.islands.get('autumn');return {position:q.chichiCarrier.position.toArray(),expected:q.submarine().boardingPoint.toArray(),sub:q.submarine().snapshot()};});assert.ok(Math.hypot(...end.position.map((v,i)=>v-end.expected[i]))<.02);assert.equal(end.sub.active,false);await image('submarine-return');
 assert.deepEqual(errors,[]);assert.deepEqual(httpErrors,[]);await writeFile(join(review,'submarine-native.json'),JSON.stringify({seat,start,driven,restored,end},null,2));console.log('PASS: real keyboard/touch driving, original cat cockpit, cameras, private SQLite reload, autopilot and dry exit.');
}
