import assert from 'node:assert/strict';
import {writeFile} from 'node:fs/promises';
import {join} from 'node:path';
export async function auditOceanAreaNative({page,review,errors,httpErrors,baseline}){
 const snapshot=()=>page.evaluate(()=>{const q=__lagoonQA,s=q.submarine(),g=__lagoonSaveQA.getGame();return{phase:s.phase,controlled:s.controlled,explorer:s.explorer&&{...s.explorer},boat:s.snapshot(),coins:g.coins,inventory:g.inventory,placements:g.placements};});
 const persist=async()=>{await page.evaluate(()=>window.dispatchEvent(new Event('pagehide')));await page.waitForFunction(()=>!__lagoonSaveQA.cloud.dirty&&!__lagoonSaveQA.cloud.pending&&!__lagoonSaveQA.cloud.retryEntry);};
 const prepare=async()=>{await page.evaluate(async()=>{const q=__lagoonQA;q.drawPaused=true;if(!window.__areaReturnOnly)await q.mall().ensure();});await page.waitForFunction(()=>!__lagoonQA.islands.get('autumn').userData.lowOnly&&__lagoonQA.shaderWarmup.idle(),null,{timeout:240000});};
 if(process.env.CHICHI_OCEAN_AREA_RETURN_ONLY)await page.evaluate(()=>window.__areaReturnOnly=true);
 await prepare();const initial=await snapshot();let restored=null;
 if(!baseline){
  assert.equal(initial.phase,'piloting');assert.ok(initial.boat.x>250,'native saved pilot starts in the newly available water');
  await page.locator('#chichi-control').click();await page.waitForFunction(()=>__lagoonQA.submarine().phase==='swimming');
  await page.evaluate(()=>{__lagoonQA.manualFrames=true;});const before=await snapshot();
  await page.keyboard.down('KeyW');await page.evaluate(()=>{const q=__lagoonQA;for(let i=0;i<8;i++){q.submarine().update(.05,7+i*.05);q.submarine().updateCamera(.05);}});await page.keyboard.up('KeyW');const moved=await snapshot();assert.ok(Math.hypot(moved.explorer.x-before.explorer.x,moved.explorer.z-before.explorer.z)>.5);
  await persist();await page.reload();if(process.env.CHICHI_OCEAN_AREA_RETURN_ONLY)await page.evaluate(()=>window.__areaReturnOnly=true);await page.waitForFunction(()=>window.__lagoonQA&&__lagoonSaveQA.cloud.editable,null,{timeout:240000});await prepare();restored=await snapshot();assert.equal(restored.phase,'swimming');assert.ok(restored.explorer.x>250);assert.ok(Math.hypot(restored.explorer.x-moved.explorer.x,restored.explorer.z-moved.explorer.z)<.5);
  await page.locator('#camera-all').click();assert.equal((await snapshot()).controlled,false);assert.equal(await page.evaluate(()=>__lagoonQA.submarine().updateCamera(.1)),false);
  await writeFile(join(review,'outer-water-control.json'),JSON.stringify({initial,before,moved,restored,worldReleased:true},null,2));console.log('PASS actual outer-water entry, movement, private SQLite reload and World release');
  if(process.env.CHICHI_OCEAN_AREA_RETURN_ONLY){
   const returned=await page.evaluate(async()=>{const q=__lagoonQA;q.manualFrames=true;for(let i=0;i<12000;i++){q.submarine().update(.1,7+i*.1);if(q.submarine().phase==='docked'&&!q.submarine().snapshot().returning)return{steps:i,boat:q.submarine().snapshot(),actor:q.chichiCarrier.position.toArray()};if(i%100===0)await new Promise(r=>setTimeout(r,0));}throw Error('Expanded-water physical return stalled: '+JSON.stringify(q.submarine().snapshot()));});
   assert.equal((await snapshot()).phase,'docked');await persist();await page.reload();await page.waitForFunction(()=>window.__lagoonQA&&__lagoonSaveQA.cloud.editable,null,{timeout:240000});await page.evaluate(()=>{__lagoonQA.drawPaused=true;});const final=await snapshot();assert.equal(final.phase,'docked');assert.equal(final.controlled,false);assert.equal(final.explorer,undefined);assert.deepEqual({coins:final.coins,inventory:final.inventory,placements:final.placements},{coins:initial.coins,inventory:initial.inventory,placements:initial.placements});assert.deepEqual(errors,[]);assert.deepEqual(httpErrors,[]);await writeFile(join(review,'expanded-return.json'),JSON.stringify({completed:true,returned,final,errors,httpErrors},null,2));console.log('PASS physical autonomous return from expanded water, dock and second SQLite reload');return;
  }
 }
 const rows=[],specs=[
  {name:'whole-island',eye:[0,650,850],target:[0,-15,0],distance:500},
  {name:'surface-close',eye:[18,14,35],target:[-8,.155,-12],distance:52},
  {name:'deep-approach',eye:[25,-158,170],target:[105,-185,176],distance:85},
  {name:'phone-underwater',eye:[35,-177,195],target:[0,-187,150],distance:65,phone:true},
 ];
 for(const hour of [12,0])for(const spec of specs){
  await page.setViewportSize(spec.phone?{width:390,height:844}:{width:1440,height:812});
  const row=await page.evaluate(({spec,hour})=>{
   const q=__lagoonQA,b=q.islands.get('autumn'),gl=q.renderer.getContext();q.manualFrames=true;q.drawPaused=true;q.setGameHour(hour);q.terrainClock=7;q.reviewView(b.position.x+spec.target[0],b.position.z+spec.target[2],spec.distance);q.oceanReviewCamera={eye:[b.position.x+spec.eye[0],spec.eye[1],b.position.z+spec.eye[2]],target:[b.position.x+spec.target[0],spec.target[1],b.position.z+spec.target[2]]};q.gpuFrames.clear();q.manualStepping=true;try{q.step(performance.now()+100);}finally{q.manualStepping=false;}
   const pixels=new Uint8Array(gl.drawingBufferWidth*gl.drawingBufferHeight*4),at=performance.now();q.drawFrame();gl.readPixels(0,0,gl.drawingBufferWidth,gl.drawingBufferHeight,gl.RGBA,gl.UNSIGNED_BYTE,pixels);const frameMs=performance.now()-at;
   return{png:q.renderer.domElement.toDataURL('image/png').split(',')[1],camera:q.camera.position.toArray(),target:q.look.toArray(),fov:q.camera.fov,clock:q.gameClock(),fog:{color:q.scene.fog.color.getHex(),density:q.scene.fog.density},lights:q.scene.children.filter(o=>o.isLight).map(o=>({type:o.type,color:o.color.getHex(),intensity:o.intensity})),dpr:q.renderer.getPixelRatio(),exposure:q.renderer.toneMappingExposure,calls:q.renderer.info.render.calls,triangles:q.renderer.info.render.triangles,geometry:q.renderer.info.memory.geometries,textures:q.renderer.info.memory.textures,heap:performance.memory?.usedJSHeapSize,completeOfflineFrameMs:frameMs,lost:gl.isContextLost()};
  },{spec,hour});
  assert.equal(row.dpr,2);assert.equal(row.exposure,1);assert.equal(row.lost,false);assert.equal(row.clock.hour,hour);const name=spec.name+'-'+(hour===12?'day':'night');await writeFile(join(review,name+'.png'),Buffer.from(row.png,'base64'));delete row.png;rows.push({name,...row});console.log('Native expanded-ocean capture',name,JSON.stringify({calls:row.calls,triangles:row.triangles,completeOfflineFrameMs:row.completeOfflineFrameMs}));
 }
 // The current production world has constant scene-light values. Check both
 // actual game-clock states and record that fact instead of faking night light.
 for(let i=0;i<4;i++)assert.deepEqual(rows[i].lights,rows[i+4].lights);
 assert.deepEqual(errors,[]);assert.deepEqual(httpErrors,[]);const final=await snapshot();assert.deepEqual({coins:final.coins,inventory:final.inventory,placements:final.placements},{coins:initial.coins,inventory:initial.inventory,placements:initial.placements});
 await writeFile(join(review,'ocean-area-native.json'),JSON.stringify({completed:true,baseline,initial,restored,final,rows,errors,httpErrors,limitations:'Actual native full game/private SQLite, DPR2. Synchronized SwiftShader frames are not physical Mac/iPhone FPS. Production scene lights are constant across game hours; captures verify the existing pipeline, not a new night-lighting system.'},null,2));console.log('PASS native ocean views at both actual clock states and unchanged ownership');
}
