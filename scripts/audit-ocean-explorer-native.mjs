import assert from 'node:assert/strict';
import {writeFile} from 'node:fs/promises';
import {join} from 'node:path';

export async function auditOceanExplorerNative({page,review,errors,httpErrors,capture}){
 const snapshot=()=>page.evaluate(()=>{const q=__lagoonQA,s=q.submarine(),g=__lagoonSaveQA.getGame();return {phase:s.phase,controlled:s.controlled,explorer:s.snapshot().explorer,boat:s.snapshot(),camera:q.camera.position.toArray(),fov:q.camera.fov,near:q.camera.near,coins:g.coins,inventory:g.inventory,placements:g.placements};});
 const advance=n=>page.evaluate(async n=>{const q=__lagoonQA;for(let i=0;i<n;i++){q.submarine().update(.1,performance.now()/1000+i/10);if(i%20===0)await new Promise(resolve=>setTimeout(resolve,0));}},n);
 const move=async(code,n)=>{await page.keyboard.down(code);await advance(n);await page.keyboard.up(code);};
 const persist=async()=>{await page.evaluate(()=>window.dispatchEvent(new Event('pagehide')));await page.waitForFunction(()=>!__lagoonSaveQA.cloud.dirty&&!__lagoonSaveQA.cloud.pending&&!__lagoonSaveQA.cloud.retryEntry);};
 const reload=async()=>{await persist();await page.reload();await page.waitForFunction(()=>window.__lagoonQA?.submarine()&&window.__lagoonSaveQA?.cloud.editable,null,{timeout:240000});await page.evaluate(async()=>{__lagoonQA.drawPaused=true;await __lagoonQA.mall().ensure();});};
 const watcher=setInterval(async()=>{try{console.log('Explorer progress',await page.evaluate(()=>{const q=__lagoonQA,s=q.submarine();return {phase:s.phase,controlled:s.controlled,explorer:s.explorer,root:!!q.mall().root,ready:q.mall().ready,visible:q.isVisible(),paused:q.drawPaused,exitHidden:document.querySelector('[data-sub-exit]').hidden,mallHidden:document.querySelector('[data-sub-mall]').hidden};}));}catch{}},15000);
 try{
 console.log('Explorer: initial boat');
 await page.evaluate(async()=>{__lagoonQA.drawPaused=true;await __lagoonQA.mall().ensure();});
 const initial=await snapshot();assert.equal(initial.phase,'piloting');let first=null;
 if(process.env.CHICHI_EXPLORER_STAGE!=='mall'){
 await page.locator('[data-sub-exit]').tap({timeout:45000});await page.waitForFunction(()=>__lagoonQA.submarine().phase==='swimming');
 first=await snapshot();assert.ok(first.explorer.y< -10);await capture('chichi-swimming-first-person');
 const position=await snapshot();await move('ArrowDown',5);assert.ok((await snapshot()).explorer.y<position.explorer.y-2);await move('Space',5);
 await move('KeyW',3);await move('KeyS',3);
 await page.locator('[data-sub-enter]').tap();await advance(31);assert.equal((await snapshot()).phase,'piloting');
 await page.locator('[data-sub-exit]').tap({timeout:45000});await reload();assert.equal((await snapshot()).phase,'swimming');
 console.log('Explorer: swim reload passed');
 await page.locator('#camera-all').click();assert.equal((await snapshot()).controlled,false);
 assert.equal(await page.evaluate(()=>__lagoonQA.submarine().updateCamera(.1)),false);
 await advance(2200);assert.equal((await snapshot()).phase,'docked');assert.equal((await snapshot()).controlled,false);
 await page.locator('[data-biome="autumn"]').tap();
 await page.locator('[data-sub-enter]').tap();await advance(31);
 assert.equal((await snapshot()).phase,'piloting');
 }
 console.log('Explorer: preparing Mall approach');
 await page.evaluate(()=>{const q=__lagoonQA;Object.assign(q.submarine().physics.state,{x:-43,y:-162.5,z:124.5,yaw:Math.PI,speed:0,vertical:0,pitch:0});q.submarine().update(0,performance.now()/1000);});
 await page.locator('[data-sub-exit]').tap({timeout:45000});
 console.log('Explorer: portal approach',await page.evaluate(()=>({phase:__lagoonQA.submarine().phase,explorer:__lagoonQA.submarine().explorer})));
 await page.waitForFunction(()=>__lagoonQA.submarine().phase==='swimming',null,{timeout:30000});
 await page.evaluate(async()=>{await Promise.race([__lagoonQA.mall().ensure(),new Promise((_,reject)=>setTimeout(()=>reject(Error('Mall preparation timed out')),180000))]);});
 console.log('Explorer: Mall ready, portal visible',await page.locator('[data-sub-mall]').isVisible());
 await page.locator('[data-sub-mall]').tap({timeout:45000});
 await advance(150);assert.equal((await snapshot()).phase,'mall');assert.equal((await snapshot()).explorer.floor,1);await capture('chichi-first-person-mall');
 console.log('Explorer: sequential airlock entry passed');
 const inside=await snapshot();await move('KeyW',5);assert.ok((await snapshot()).explorer.z<inside.explorer.z-1);
 await reload();assert.equal((await snapshot()).phase,'mall');assert.equal((await snapshot()).explorer.floor,1);
 await page.evaluate(async()=>{await Promise.race([__lagoonQA.mall().ensure(),new Promise((_,reject)=>setTimeout(()=>reject(Error('Mall preparation timed out')),180000))]);});
 // Put the private fixture at the real foot of an authored escalator, then
 // exercise its full 27-metre ramp using the actual keyboard and walker.
 await page.evaluate(()=>Object.assign(__lagoonQA.submarine().explorer,{x:18.4,y:-164.82,z:51.4,yaw:0,floor:1}));
 await move('KeyW',60);assert.equal((await snapshot()).explorer.floor,2);await capture('chichi-escalator-floor2');
 await reload();assert.equal((await snapshot()).explorer.floor,2);
 await page.locator('#camera-island').click();assert.equal((await snapshot()).controlled,false);assert.equal(await page.evaluate(()=>__lagoonQA.submarine().updateCamera(.1)),false);
 await page.evaluate(async()=>{await Promise.race([__lagoonQA.mall().ensure(),new Promise((_,reject)=>setTimeout(()=>reject(Error('Mall preparation timed out')),180000))]);});
 for(let i=0;i<60&&(await snapshot()).phase!=='docked';i++){await advance(100);await page.waitForTimeout(100);}
 console.log('Explorer return state',await page.evaluate(()=>({phase:__lagoonQA.submarine().phase,position:__lagoonQA.submarine().explorer})));
 assert.equal((await snapshot()).phase,'docked','manual Mall control must return Chichi to ordinary life');
 const final=await snapshot();assert.equal(final.coins,initial.coins);assert.deepEqual(final.inventory,initial.inventory);assert.deepEqual(final.placements,initial.placements);
 await writeFile(join(review,'explorer-results.json'),JSON.stringify({stage:process.env.CHICHI_EXPLORER_STAGE||'full',initial,first,inside,final,errors,httpErrors,renderer:'Native game, Chromium SwiftShader at DPR2; not device FPS'},null,2));
 assert.deepEqual(errors,[]);assert.deepEqual(httpErrors,[]);console.log(process.env.CHICHI_EXPLORER_STAGE==='mall'?'PASS: sequential Mall airlock, walking, storey reloads, escalator, camera release and automatic return.':'PASS: underwater exit, FP movement/dive, reboard, world/island release, swimming/Mall reload, sequential airlock, escalator and automatic return.');
 }finally{clearInterval(watcher);}
}
