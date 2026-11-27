import assert from 'node:assert/strict';
import {writeFile,readFile} from 'node:fs/promises';
import {join} from 'node:path';
import {waterfrontProtected} from './waterfront-v14-protected.mjs';
export async function waterfrontThirdFinal({page,review,errors,httpErrors,desktop}) {
 page.setDefaultTimeout(120000);
 await page.evaluate(()=>{__lagoonQA.drawPaused=true;__lagoonQA.reviewHour=12;});
 await page.evaluate(async()=>{const q=__lagoonQA;q.freeze=false;q.manualFrames=true;q.drawPaused=true;await q.waterfront().ensure();});
 await page.waitForFunction(()=>__lagoonQA.waterfront().ready&&__lagoonQA.shaderWarmup.idle(),null,{timeout:600000});
 const step=(count=1,dt=.1)=>page.evaluate(({count,dt})=>{const q=__lagoonQA;q.manualFrames=true;q.drawPaused=true;q.freeze=false;q.nativeNow??=performance.now();q.terrainClock??=7;for(let i=0;i<count;i++){q.nativeNow+=dt*1000;q.terrainClock+=dt;q.manualStepping=true;try{q.step(q.nativeNow);}finally{q.manualStepping=false;}}const v=q.waterfront().runtime.get('chichi');return v&&{phase:v.phase,y:v.local.y,height:v.launchHeight,vy:v.frame.motion.velocityY,age:v.age};},{count,dt});
 const activate=selector=>desktop?page.locator(selector).click():page.locator(selector).tap();
 await step(1);await activate('.waterfront-access');await step(1);await activate('[data-waterfront-view="trampoline"]');await step(1);
 if(desktop){const eligible=await page.evaluate(()=>[...__lagoonQA.npcs.keys()].filter(id=>__lagoonQA.spaGuestDiagnostic(id).free));await activate('[data-waterfront-all-trampoline]');await step(2);const d=await page.evaluate(()=>__lagoonQA.waterfront().diagnostics());assert(d.visits.some(v=>v.id==='chichi'));for(const id of eligible)assert(d.visits.some(v=>v.id===id),'every genuinely free cat joins: '+id);assert(d.active<=6);console.log('THIRD_GROUP',JSON.stringify({eligible,visits:d.visits.length,active:d.active}));}
 for(let i=0;i<150;i++){const v=await step(1);if(v?.phase==='approach')break;}
 await activate('#chichi-control');for(let i=0;i<150;i++){await step(10);if(await page.evaluate(()=>__lagoonQA.manualWalk().active))break;}
 assert(await page.evaluate(()=>__lagoonQA.manualWalk().active));
 await step(1);assert.equal(await page.evaluate(()=>__lagoonQA.waterfront().firstPerson),false);
 assert.equal(await page.evaluate(()=>__lagoonQA.camera.fov),60);
 const cdp=await page.context().newCDPSession(page);
 async function held(selector,on){if(!on)return cdp.send('Input.dispatchTouchEvent',{type:'touchEnd',touchPoints:[]});const b=await page.locator(selector).boundingBox();return cdp.send('Input.dispatchTouchEvent',{type:'touchStart',touchPoints:[{x:b.x+b.width/2,y:b.y+b.height/2,id:1}]});}
 const controls={};if(!desktop){assert(await page.evaluate(()=>matchMedia('(pointer:coarse)').matches));for(const s of ['.waterfront-jump','.waterfront-view-toggle','[data-waterfront-dive]','.chichi-walk-controls [data-walk-key="KeyW"]']){const b=await page.locator(s).boundingBox();assert(b&&b.width>=44&&b.height>=44,s);assert(b.x>=0&&b.y>=0&&b.x+b.width<=390.1&&b.y+b.height<=844.1,s+' inside viewport');controls[s]=b;}}
 // A real camera gesture faces the restaurant, retaining the full native scene.
 const point=await page.evaluate(()=>{const c=__lagoonQA.renderer.domElement;for(let y=340;y<480;y+=20)for(let x=90;x<180;x+=20)if(document.elementFromPoint(x,y)===c)return{x,y};throw Error('No clear visible canvas for actual look gesture');});
 if(desktop){await page.mouse.move(point.x,point.y);await page.mouse.down();await page.mouse.move(point.x+390,point.y,{steps:10});await page.mouse.up();}else for(let i=0;i<2;i++){await cdp.send('Input.dispatchTouchEvent',{type:'touchStart',touchPoints:[{x:point.x,y:point.y,id:4+i}]});await cdp.send('Input.dispatchTouchEvent',{type:'touchMove',touchPoints:[{x:point.x+190,y:point.y,id:4+i}]});await cdp.send('Input.dispatchTouchEvent',{type:'touchEnd',touchPoints:[]});}
 await step(1);const before=await page.evaluate(()=>__lagoonQA.chichiCarrier.position.toArray());
 if(desktop)await page.keyboard.down('KeyW');else await held('.chichi-walk-controls [data-walk-key="KeyW"]',true);
 await step(8);if(desktop)await page.keyboard.up('KeyW');else await held('',false);
 const after=await page.evaluate(()=>__lagoonQA.chichiCarrier.position.toArray());assert(Math.hypot(after[0]-before[0],after[2]-before[2])>2);
 const rows=[];
 async function capture(name){const row=await page.evaluate(()=>{const q=__lagoonQA;q.oceanReviewCamera=null;q.cat.updateWorldMatrix(true,true);q.cat.traverse(o=>{if(o.isSkinnedMesh)o.skeleton.update();});q.drawFrame();const gl=q.renderer.getContext();gl.finish();q.camera.updateMatrixWorld(true);const box=new q.THREE.Box3(),vertex=new q.THREE.Vector3();let measuredVertices=0;q.cat.traverseVisible(o=>{if(!o.isMesh||!o.geometry?.attributes.position)return;for(let i=0;i<o.geometry.attributes.position.count;i++){o.getVertexPosition(i,vertex);vertex.applyMatrix4(o.matrixWorld);box.expandByPoint(vertex);measuredVertices++;}});const corners=[];for(const x of [box.min.x,box.max.x])for(const y of [box.min.y,box.max.y])for(const z of [box.min.z,box.max.z])corners.push(new q.THREE.Vector3(x,y,z).project(q.camera).toArray());return{png:q.renderer.domElement.toDataURL('image/png').split(',')[1],camera:q.camera.position.toArray(),target:q.look.toArray(),fov:q.camera.fov,near:q.camera.near,dpr:q.renderer.getPixelRatio(),up:q.camera.up.toArray(),position:q.chichiCarrier.position.toArray(),phase:q.waterfront().frame('chichi')?.phase,corners,calls:q.renderer.info.render.calls,triangles:q.renderer.info.render.triangles,lost:gl.isContextLost(),badPrograms:q.renderer.info.programs.filter(p=>p.diagnostics?.runnable===false).length};});await writeFile(join(review,name+'.png'),Buffer.from(row.png,'base64'));delete row.png;await writeFile(join(review,name+'.json'),JSON.stringify(row,null,2));assert(!row.lost);assert.equal(row.badPrograms,0);assert.equal(row.fov,60);assert.equal(row.dpr,2);assert.deepEqual(row.up,[0,1,0]);if(!name.includes('water'))for(const p of row.corners)assert(p[0]>-.98&&p[0]<.98&&p[1]>-.98&&p[1]<.98&&p[2]>-1&&p[2]<1,'complete native Chichi fits third-person frame');rows.push({name,...row});console.log('THIRD_CAPTURE',name,row.phase,row.position[1],row.triangles);return row;}
 if(desktop)await page.keyboard.down('Space');else await held('.waterfront-jump',true);
 const hops=[];let last='',compressed=false,peak=false;
 for(let i=0;i<650;i++){const v=await step(1);if(v.phase==='bounce'&&last!=='bounce')hops.push(v.height);last=v.phase;
  if(desktop&&hops.length===1&&v.phase==='compress'&&v.age>.3&&!compressed){await capture('third-person-net-compression');compressed=true;}
  if(hops.length>=7&&v.y>40){await capture('third-person-high-jump');peak=true;break;}}
 if(desktop)await page.keyboard.up('Space');else await held('',false);
 assert(peak&&hops.length>=7);for(let i=1;i<hops.length;i++)assert(hops[i]>hops[i-1]);console.log('THIRD_PROGRESSIVE_HOPS',JSON.stringify(hops));
 let landed=false;for(let i=0;i<140;i++){const v=await step(1);if(v.phase==='player-land'){if(desktop)await capture('third-person-spring-landing');landed=true;break;}}assert(landed);for(let i=0;i<30;i++){if((await step(1)).phase==='player')break;}
 // Reproduce the old missing compatibility-click case after a native look gesture.
 const p=await page.evaluate(()=>{const c=__lagoonQA.renderer.domElement;for(let y=340;y<470;y+=20)for(let x=110;x<190;x+=20)if(document.elementFromPoint(x,y)===c)return{x,y};throw Error('No clear canvas');});
 if(desktop){await page.mouse.move(p.x,p.y);await page.mouse.down();await page.mouse.move(p.x,p.y+25,{steps:3});await page.mouse.up();}else{await cdp.send('Input.dispatchTouchEvent',{type:'touchStart',touchPoints:[{x:p.x,y:p.y,id:8}]});await cdp.send('Input.dispatchTouchEvent',{type:'touchMove',touchPoints:[{x:p.x,y:p.y+25,id:8}]});await cdp.send('Input.dispatchTouchEvent',{type:'touchEnd',touchPoints:[]});}
 await step(1);await page.evaluate(()=>{window.__waterTap=[];document.addEventListener('pointerup',e=>{if(e.target.closest?.('[data-waterfront-dive]'))window.__waterTap.push({trusted:e.isTrusted,pointerType:e.pointerType,phase:__lagoonQA.waterfront().frame('chichi')?.phase});});});
 await activate('[data-waterfront-dive]');await page.waitForFunction(()=>__lagoonQA.waterfront().frame('chichi')?.phase==='approach');
 const taps=await page.evaluate(()=>window.__waterTap);if(!desktop)assert(taps.some(e=>e.trusted&&e.pointerType==='touch'&&e.phase==='approach'),'actual trusted touch release starts the dive');console.log('THIRD_NATIVE_WATER_ACTION',JSON.stringify(taps));
 let splash=false,swim=false;for(let i=0;i<1800;i++){const v=await step(1);if(v?.phase==='splash'&&!splash){await capture('third-person-water-splash');splash=true;}if(v?.phase==='swim'){if(desktop)await capture('third-person-water-swimming');swim=true;break;}}assert(splash&&swim);
 await page.screenshot({path:join(review,'actual-third-person-controls.png')});
 await writeFile(join(review,'third-person-native.json'),JSON.stringify({passed:true,desktop,defaultView:'third-person',controls,hops,wasd:{before,after},rows,taps,errors,httpErrors,browser:page.context().browser().version(),scope:'Actual native meshes, full DPR2, real input; deterministic review steps and paused raster during preparation. No device FPS or artistic equivalence claim.'},null,2));
 assert.deepEqual(errors,[]);assert.deepEqual(httpErrors,[]);await cdp.detach();console.log('THIRD_PERSON_NATIVE_PASS');
}
