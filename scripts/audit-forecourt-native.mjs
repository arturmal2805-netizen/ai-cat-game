import assert from 'node:assert/strict';
import {writeFile} from 'node:fs/promises';
import {join} from 'node:path';
export async function auditForecourt({page,review,errors,httpErrors}){
 await page.evaluate(async()=>{const q=__lagoonQA;q.drawPaused=true;await q.mall().ensure();});
 await page.waitForFunction(()=>!__lagoonQA.islands.get('autumn').userData.lowOnly&&__lagoonQA.shaderWarmup.idle(),null,{timeout:240000});
 const rows=[];
 for(const spec of [
  {name:'front-overview',eye:[0,500,650],target:[0,-70,100],distance:500},
  {name:'front-underwater',eye:[95,-153,255],target:[0,-184,165],distance:110},
  {name:'phone-front',eye:[55,-161,245],target:[0,-185,165],distance:90,phone:true},
 ].filter(s=>!process.env.CHICHI_FORECOURT_VIEW||s.name===process.env.CHICHI_FORECOURT_VIEW)){
  await page.setViewportSize(spec.phone?{width:390,height:844}:{width:1440,height:812});
  await page.evaluate(()=>new Promise(resolve=>requestAnimationFrame(()=>requestAnimationFrame(resolve))));
  const row=await page.evaluate(({spec,samples})=>{const q=__lagoonQA,b=q.islands.get('autumn');q.manualFrames=true;q.drawPaused=true;q.setGameHour(12);q.terrainClock=7;q.reviewView(b.position.x+spec.target[0],b.position.z+spec.target[2],spec.distance);q.oceanReviewCamera={eye:[b.position.x+spec.eye[0],spec.eye[1],b.position.z+spec.eye[2]],target:[b.position.x+spec.target[0],spec.target[1],b.position.z+spec.target[2]]};q.gpuFrames.clear();q.manualStepping=true;try{q.step(performance.now()+100);}finally{q.manualStepping=false;}const gl=q.renderer.getContext(),pixels=new Uint8Array(gl.drawingBufferWidth*gl.drawingBufferHeight*4),frames=[];for(let i=0;i<samples;i++){const at=performance.now();q.gpuFrames.clear();q.drawFrame();gl.readPixels(0,0,gl.drawingBufferWidth,gl.drawingBufferHeight,gl.RGBA,gl.UNSIGNED_BYTE,pixels);frames.push(performance.now()-at);}return{png:q.renderer.domElement.toDataURL('image/png').split(',')[1],camera:q.camera.position.toArray(),target:q.look.toArray(),dpr:q.renderer.getPixelRatio(),exposure:q.renderer.toneMappingExposure,fov:q.camera.fov,calls:q.renderer.info.render.calls,triangles:q.renderer.info.render.triangles,geometries:q.renderer.info.memory.geometries,textures:q.renderer.info.memory.textures,heap:performance.memory?.usedJSHeapSize,completeSynchronizedFrameMs:frames,lost:gl.isContextLost()};},{spec,samples:Number(process.env.CHICHI_FORECOURT_SAMPLES||3)});
  assert.equal(row.dpr,2);assert.equal(row.exposure,1);assert.equal(row.lost,false);await writeFile(join(review,spec.name+'.png'),Buffer.from(row.png,'base64'));delete row.png;rows.push({name:spec.name,...row});console.log('Captured',spec.name);
 }
 if(process.env.CHICHI_FORECOURT_CHECK_MOVEMENT){
  const snap=()=>page.evaluate(()=>{const q=__lagoonQA,s=q.submarine(),g=__lagoonSaveQA.getGame();return{phase:s.phase,controlled:s.controlled,explorer:s.explorer&&{...s.explorer},coins:g.coins,inventory:g.inventory,placements:g.placements};});
  const economy=await snap();await page.evaluate(()=>{const q=__lagoonQA;delete q.oceanReviewCamera;Object.assign(q.submarine().physics.state,{x:0,y:-181,z:270,yaw:0,speed:0,vertical:0,pitch:0});q.submarine().update(.05,7);});
  await page.locator('#chichi-control').click();await page.waitForFunction(()=>__lagoonQA.submarine().phase==='swimming');const start=await snap();assert.ok(Math.abs(start.explorer.y+180.4)<1,'new deep bay does not clamp the swimmer upward');
  await page.keyboard.down('KeyW');await page.evaluate(()=>{for(let i=0;i<10;i++){__lagoonQA.submarine().update(.05,7+i*.05);__lagoonQA.submarine().updateCamera(.05);}});await page.keyboard.up('KeyW');const moved=await snap();assert.ok(Math.hypot(moved.explorer.x-start.explorer.x,moved.explorer.z-start.explorer.z)>1,'actual input traverses the expanded front');assert.ok(moved.explorer.y< -178);
  const persist=async()=>{await page.evaluate(()=>window.dispatchEvent(new Event('pagehide')));await page.waitForFunction(()=>!__lagoonSaveQA.cloud.dirty&&!__lagoonSaveQA.cloud.pending&&!__lagoonSaveQA.cloud.retryEntry);};
  await persist();await page.reload();await page.waitForFunction(()=>window.__lagoonQA&&__lagoonSaveQA.cloud.editable,null,{timeout:240000});await page.evaluate(()=>{__lagoonQA.drawPaused=true;__lagoonQA.manualFrames=true;});const reloaded=await snap();assert.equal(reloaded.phase,'swimming');assert.ok(Math.hypot(reloaded.explorer.x-moved.explorer.x,reloaded.explorer.z-moved.explorer.z)<.5);assert.ok(reloaded.explorer.y< -178);
  await page.locator('#camera-all').click();assert.equal((await snap()).controlled,false);const returned=await page.evaluate(async()=>{const q=__lagoonQA;for(let i=0;i<12000;i++){q.submarine().update(.1,8+i*.1);if(q.submarine().phase==='docked'&&!q.submarine().snapshot().returning)return {steps:i,boat:q.submarine().snapshot()};if(i%100===0)await new Promise(r=>setTimeout(r,0));}throw Error('Deep forecourt physical return stalled '+JSON.stringify(q.submarine().snapshot()));});
  const final=await snap();assert.deepEqual({coins:final.coins,inventory:final.inventory,placements:final.placements},{coins:economy.coins,inventory:economy.inventory,placements:economy.placements});await writeFile(join(review,'front-swim-reload-return.json'),JSON.stringify({economy,start,moved,reloaded,returned,final,privateFixture:'Pilot seeded in the newly excavated front bay; actual button and keyboard afterwards',errors,httpErrors},null,2));console.log('PASS new front swim, SQLite reload and physical autonomous return');
 }
 assert.deepEqual(errors,[]);assert.deepEqual(httpErrors,[]);await writeFile(join(review,'forecourt-native.json'),JSON.stringify({completed:true,rows,errors,httpErrors,limitations:'Full native private game, DPR2. Three synchronized software-GPU frames are not device FPS.'},null,2));
}
