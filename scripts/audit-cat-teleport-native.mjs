import assert from 'node:assert/strict';
import {writeFile} from 'node:fs/promises';import{join}from'node:path';
export async function auditCatTeleport({page,review,errors,httpErrors}){
 await page.evaluate(()=>{const q=__lagoonQA;q.drawPaused=true;q.reviewHour=12;q.terrainClock=7;document.querySelector('[data-biome="autumn"]').click();});
 await page.waitForFunction(()=>!!__lagoonQA.islands.get('autumn')?.userData.ocean?.warehouse,null,{timeout:240000});
 await page.evaluate(async()=>{await __lagoonQA.warehouse().ensure();});
 await page.evaluate(()=>{const q=__lagoonQA;q.manualFrames=true;q.testNow=performance.now();});
 const step=async n=>page.evaluate(n=>{const q=__lagoonQA;for(let i=0;i<n;i++){q.testNow=Math.max(q.testNow||0,performance.now())+100;q.gpuFrames.clear();q.manualStepping=true;try{q.step(q.testNow);}finally{q.manualStepping=false;}}},n);
 const state=()=>page.evaluate(()=>{const q=__lagoonQA,t=__lagoonSaveQA.getWorld().teleportation();return{position:q.chichiCarrier.position.toArray(),core:t.diagnostics,operations:[...t.operations.values()].map(o=>({id:o.id,phase:o.phase,prepared:o.prepared,started:o.started,age:o.age,arrival:o.arrival,from:o.from,points:o.destination.arrivalPoints?.(o.actor).slice(0,3)})),warehouse:q.warehouse().frame('chichi')?.phase,errors:[]};});
 await page.locator('.warehouse-access').click();await page.locator('[data-warehouse-call]').click();await page.waitForTimeout(100);await step(2);
 const opened=await state();await writeFile(join(review,'portal-open.json'),JSON.stringify(opened,null,2));console.log('PORTAL_OPEN',JSON.stringify(opened));
 assert(opened.operations.some(o=>o.started),'actual Warehouse call opens a real portal');
 await page.evaluate(()=>{const q=__lagoonQA,p=q.chichiCarrier.position;q.oceanReviewCamera={eye:[p.x+5,p.y+3,p.z+8],target:[p.x,p.y+1,p.z],fov:48,far:20000};q.manualStepping=true;q.step(q.testNow+=100);q.manualStepping=false;q.drawFrame();q.renderer.getContext().finish();});
 await page.screenshot({path:join(review,'warehouse-origin-portal.png')});
 await step(8);const boarding=await state();console.log('BOARDING',JSON.stringify(boarding));assert(boarding.warehouse,'the same original cat starts the actual fleet after portal arrival');
 await step(120);const arrived=await state();console.log('WAREHOUSE_PROGRESS',JSON.stringify(arrived));
 await writeFile(join(review,'warehouse-transfer.json'),JSON.stringify({opened,boarding,arrived},null,2));
 // A different actual native resident exercises the direct selected SPA room.
 const spa=await page.evaluate(async()=>{const q=__lagoonQA;q.manualFrames=false;await q.resortSpa().ensure();const actor=q.lifeActors().find(a=>a.id!=='chichi'),profile=__lagoonSaveQA.getGame().jobCity.profiles[actor.id],n=q.npcs.get(actor.id);profile.manualUntil=0;profile.schedule={...profile.schedule,job:'rest'};n.manualUntil=0;n.gatheredUntil=0;q.setCatMood(actor.model,'happy',{immediate:true});q.manualFrames=true;return{id:actor.id,diagnostic:q.spaGuestDiagnostic(actor.id),ok:q.resortSpa().teleportCall(actor.id)};});
 console.log("SPA_REQUEST",JSON.stringify(spa));assert(spa.ok);await page.waitForTimeout(30);await step(8);
 const spaResult=await page.evaluate(id=>{const q=__lagoonQA,a=q.lifeActors().find(a=>a.id===id),r=q.resortSpa().root;return{id,position:a.position.toArray(),support:!!q.resortSpa().navigation.support({x:a.position.x-r.position.x,y:a.position.y-r.position.y,z:a.position.z-r.position.z},a.radius),active:__lagoonSaveQA.getWorld().teleportation().has(id)};},spa.id);
 await writeFile(join(review,'spa-transfer.json'),JSON.stringify(spaResult,null,2));console.log('SPA_ARRIVED',JSON.stringify(spaResult));assert(spaResult.support);assert(spaResult.position[1]<-100,'arrival remains inside the actual submerged SPA room');assert(!spaResult.active);
 const mall=await page.evaluate(async id=>{const q=__lagoonQA;q.manualFrames=false;await q.mall().ensure();q.manualFrames=true;return{ok:await __lagoonSaveQA.getWorld().visitMall(id,'mall-nike'),id};},spa.id);
 assert(mall.ok);await page.waitForTimeout(50);await step(8);
 const mallResult=await page.evaluate(id=>{const q=__lagoonQA,v=q.mall().runtime.get(id);return{id,position:q.lifeActors().find(a=>a.id===id).position.toArray(),visit:v?{floor:v.floor,phase:v.phase,storeId:v.storeId}:null,active:__lagoonSaveQA.getWorld().teleportation().has(id)};},spa.id);
 console.log('MALL_ARRIVED',JSON.stringify(mallResult));await writeFile(join(review,'mall-transfer.json'),JSON.stringify(mallResult,null,2));assert(mallResult.visit);assert(!mallResult.active);
 const bounce=await page.evaluate(async id=>{const q=__lagoonQA,w=__lagoonSaveQA.getWorld().waterfront();q.manualFrames=false;await w.ensure();q.manualFrames=true;return w.startReady(id,'waterfront-bounce');},spa.id);
 assert(bounce);await page.waitForTimeout(30);await step(8);
 const bounceResult=await page.evaluate(id=>{const q=__lagoonQA,w=__lagoonSaveQA.getWorld().waterfront(),v=w.runtime.get?.(id)||w.runtime.visits.get(id);return{id,position:q.lifeActors().find(a=>a.id===id).position.toArray(),visit:v?{phase:v.phase,kind:v.activity.kind}:null,active:__lagoonSaveQA.getWorld().teleportation().has(id),ops:[...__lagoonSaveQA.getWorld().teleportation().operations.values()].map(o=>({id:o.id,phase:o.phase,points:o.destination.arrivalPoints?.(o.actor).slice(0,2)}))};},spa.id);
 console.log('TRAMPOLINE_ARRIVED',JSON.stringify(bounceResult));await writeFile(join(review,'trampoline-transfer.json'),JSON.stringify(bounceResult,null,2));assert(bounceResult.visit);assert(bounceResult.position[1]>-5,'actual native carrier is on the net, not still owned by the old Mall route');assert(!bounceResult.active);
 assert.deepEqual(errors,[]);assert.deepEqual(httpErrors,[]);console.log('PASS actual Warehouse portal→native fleet and selected SPA-room portal');
}
