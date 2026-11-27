import assert from 'node:assert/strict';
import {writeFile} from 'node:fs/promises';
import {join} from 'node:path';
export async function auditRelease({page,review,errors,httpErrors,desktop}){
 const activate=s=>desktop?page.locator(s).click():page.locator(s).tap();
 await page.evaluate(async()=>{const q=__lagoonQA;q.freeze=false;q.manualFrames=false;q.drawPaused=true;q.reviewHour=12;document.querySelector('[data-biome="autumn"]').click();console.log('SQUISH_NATIVE_FOCUS');});
 await page.waitForFunction(()=>!!__lagoonQA.islands.get('autumn')?.userData.ocean?.warehouse,{timeout:240000});
 await page.evaluate(async()=>{const q=__lagoonQA;await q.warehouse().ensure();});
 await activate('.warehouse-access');await activate('[data-warehouse-interior]');
 await page.waitForFunction(()=>!!__lagoonQA.warehouse().interior,{timeout:180000});
 await page.evaluate(()=>{const q=__lagoonQA,m=q.warehouse().interior,p=m.position;q.manualFrames=true;q.testNow=performance.now();q.oceanReviewCamera={eye:[p.x+7,p.y+5.5,p.z+10],target:[p.x,p.y+2,p.z],fov:48,far:20000};q.manualStepping=true;q.step(q.testNow);q.manualStepping=false;});
 const frame=async name=>{const result=await page.evaluate(()=>{const q=__lagoonQA;q.drawFrame();q.renderer.getContext().finish();const m=q.warehouse().interior,t=m.userData.toys[0],s=t.userData.solver;return{raw:q.renderer.domElement.toDataURL('image/png').split(',')[1],solver:s.diagnostics(),camera:{position:q.camera.position.toArray(),target:q.look.toArray(),fov:q.camera.fov,aspect:q.camera.aspect,near:q.camera.near,far:q.camera.far},renderer:{dpr:q.renderer.getPixelRatio(),shadow:q.renderer.shadowMap.type,toneMapping:q.renderer.toneMapping,info:{...q.renderer.info.render}},time:s.time};});await writeFile(join(review,name+'.png'),Buffer.from(result.raw,'base64'));delete result.raw;await writeFile(join(review,name+'.json'),JSON.stringify(result,null,2));return result;};
 const step=n=>page.evaluate(n=>{const q=__lagoonQA;for(let i=0;i<n;i++){q.testNow+=1000/60;q.manualStepping=true;try{q.step(q.testNow);}finally{q.manualStepping=false;}}},n);
 await frame('one-squish-rest');
 await activate('[data-squish-mode="press"]');
 const location=await page.evaluate(()=>{const q=__lagoonQA,T=q.THREE,m=q.warehouse().interior,p=new T.Vector3(0,2.6,1.9);m.localToWorld(p);p.project(q.camera);const r=q.renderer.domElement.getBoundingClientRect();return{x:r.x+(p.x+1)*r.width/2,y:r.y+(1-p.y)*r.height/2};});
 let cdp;if(desktop){await page.mouse.move(location.x,location.y);await page.mouse.down();}else{cdp=await page.context().newCDPSession(page);await cdp.send('Input.dispatchTouchEvent',{type:'touchStart',touchPoints:[{...location,id:7}]});}
 await step(60);const pressed=await frame('one-squish-press');assert.equal(pressed.solver.contacts,1,'real mouse/touch contact');assert(pressed.solver.maxDeformation>.2);assert(pressed.solver.minTetRatio>0);assert.equal(pressed.solver.faults,0);
 if(desktop)await page.mouse.up();else await cdp.send('Input.dispatchTouchEvent',{type:'touchEnd',touchPoints:[]});
 await step(12);await frame('one-squish-release');await step(180);const recovered=await frame('one-squish-recovery');assert.equal(recovered.solver.contacts,0);assert(recovered.solver.maxDeformation<.03);
 await cdp?.detach();
 await activate('[data-squish-mode="camera"]');await activate('[data-warehouse-squish-cat]');
 const phases=[];let found=false;
 const advance=n=>page.evaluate(n=>{const q=__lagoonQA;for(let i=0;i<n;i++){q.testNow+=100;q.manualStepping=true;try{q.step(q.testNow);}finally{q.manualStepping=false;}}const w=q.warehouse(),v=w.runtime.get('chichi');return{phase:v?.phase,squish:v?.frame?.squish?.state,paws:w.pawDiagnostics,position:q.chichiCarrier.position.toArray()};},n);
 for(let i=0;i<1200;i++){const state=await advance(8);if(!phases.includes(state.phase)){phases.push(state.phase);console.log('NATIVE_SQUISH_CAT_PHASE',state.phase);}if(state.squish&&state.paws.length>=2){found=true;await frame('one-squish-native-paws');await writeFile(join(review,'native-paw-contact.json'),JSON.stringify({state,phases},null,2));assert(state.paws.every(p=>Math.abs(p.error)<.06),'actual skinned paw positions follow deformed mesh');break;}}
 assert(found,'original Chichi boards submarine, enters and jumps onto the squish');
 await writeFile(join(review,'native-paw-contact-sequence.json'),JSON.stringify(await advance(12),null,2));await frame('one-squish-native-knead');
 assert.deepEqual(errors,[]);assert.deepEqual(httpErrors,[]);await writeFile(join(review,'prototype-result.json'),JSON.stringify({passed:true,desktop,pressed,recovered,actualInput:true,errors,httpErrors,limitations:'Stage-one single prop, not final interior/art or physical device FPS.'},null,2));console.log('SQUISH_PROTOTYPE_NATIVE_PASS');
}
