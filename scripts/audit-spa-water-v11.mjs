import assert from 'node:assert/strict';import {writeFile} from 'node:fs/promises';import {join} from 'node:path';
export async function auditSpaWaterV11({page,review}){
 const optics=await page.evaluate(()=>{const q=__lagoonQA,d=q.resortSpa().root.userData;return{version:d.waterQuality.version,surfaces:d.waters.map(w=>({profile:w.material.userData.spaWaterQuality,ready:w.material.uniforms.uSpaRefractionReady.value})),capture:{...d.waterQuality.refraction},programs:q.renderer.info.programs.map(p=>({runnable:p.diagnostics?.runnable})),memory:q.renderer.info.memory};});
 assert.equal(optics.version,11);assert.equal(optics.surfaces.length,38);assert(optics.capture.copies>0,'actual visible water must capture the opaque scene');assert.equal(optics.capture.sceneRenders,0);assert(optics.programs.every(p=>p.runnable!==false));
 await writeFile(join(review,'v11-optics.json'),JSON.stringify(optics,null,2));
 // Explicit GPU completion includes waiting for real submitted work. These
 // software-renderer samples compare the shared copy on/off; not phone FPS.
 const timings=await page.evaluate(()=>{const q=__lagoonQA,gl=q.renderer.getContext(),capture=q.resortSpa().root.userData.waterQuality.refraction,result={};q.manualFrames=true;q.drawPaused=false;
  for(const enabled of [false,true]){capture.enabled=enabled;const samples=[];for(let i=0;i<4;i++){gl.finish();q.gpuFrames.clear();const start=performance.now();q.manualStepping=true;try{q.step(Math.max(performance.now(),q.appointmentClock||0)+16.67);}finally{q.manualStepping=false;}gl.finish();samples.push(performance.now()-start);}result[enabled?'copyEnabled':'copyDisabled']=samples;}
  capture.enabled=true;q.drawPaused=true;return{samples:result,capture:{...capture},scope:'Four full native simulation/render steps with gl.finish per mode in SwiftShader. Copy-on/off overhead comparison only; no hardware FPS claim.'};});
 await writeFile(join(review,'v11-frame-completion.json'),JSON.stringify(timings,null,2));
 // Private fixtures only: retain one blocked resident; invite two actual native
 // residents. No user-world values or paid inference are touched.
 const before=await page.evaluate(async()=>{await __lagoonSaveQA.cloud.claimEditor();const q=__lagoonQA,g=__lagoonSaveQA.getGame(),ids=[...q.npcs.keys()].slice(0,3);q.manualFrames=true;q.drawPaused=true;q.reviewHour=12;for(const [i,id]of ids.entries()){const p=g.jobCity.profiles[id],n=q.npcs.get(id);p.schedule={day:0,job:'rest'};p.manualUntil=i===2?Date.now()+3600000:0;n.manualUntil=0;}return{ids,coins:g.coins,profiles:Object.fromEntries(Object.entries(g.jobCity.profiles).map(([id,p])=>[id,{coins:p.coins,receipts:p.mall?.receipts||{},used:p.mall?.used||{}}])),inventory:g.inventory};});
 assert(before.ids.length>=2);await page.locator('.resort-spa-call-all').click();
 const count=await page.evaluate(()=>__lagoonQA.resortSpa().invited);assert(count>=2);await page.locator('.resort-spa-call-all').click();assert.equal(await page.evaluate(()=>__lagoonQA.resortSpa().invited),count,'repeat must not duplicate invitations');
 const phases=new Set();let arrived=false;
 for(let batch=0;batch<1400;batch++){const state=await page.evaluate(ids=>{const q=__lagoonQA;for(let i=0;i<10;i++){q.appointmentClock=Math.max(performance.now(),q.appointmentClock||0)+100;q.manualStepping=true;try{q.step(q.appointmentClock);}finally{q.manualStepping=false;}}return ids.slice(0,2).map(id=>({id,frame:q.resortSpa().frame(id)?.phase||null,position:q.npcs.get(id).carrier.position.toArray()}));},before.ids);for(const s of state)if(s.frame)phases.add(s.frame);if(state.every(s=>s.frame==='spa-invitation-parked')){arrived=true;break;}}
 const after=await page.evaluate(()=>{const q=__lagoonQA,g=__lagoonSaveQA.getGame();return{coins:g.coins,profiles:Object.fromEntries(Object.entries(g.jobCity.profiles).map(([id,p])=>[id,{coins:p.coins,receipts:p.mall?.receipts||{},used:p.mall?.used||{}}])),inventory:g.inventory,invited:q.resortSpa().invited};});
 await writeFile(join(review,'v11-group-invitation.json'),JSON.stringify({before,after,count,arrived,phases:[...phases],scope:'Actual native residents, free staged recall, physical lift and dry walking, private editor. No procedure or AI purchase.'},null,2));
 assert(arrived,'two invited residents must reach distinct supported dry positions');assert(phases.has('riding'),'use real pressure lift');for(const k of ['coins','profiles','inventory'])assert.deepEqual(after[k],before[k],'free invitation must preserve '+k);
 console.log('PASS V11 actual 38 water profiles/copy bounds and free resident group arrival');
}
