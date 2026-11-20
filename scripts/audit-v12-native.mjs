import assert from 'node:assert/strict';import {writeFile}from'node:fs/promises';import {join}from'node:path';
export async function auditV12({page,review,errors,httpErrors}){
 await page.locator('[data-biome="autumn"]').click();await page.evaluate(async()=>{const q=__lagoonQA;q.drawPaused=true;await q.mall().ensure();await q.resortSpa().ensure();});
 await page.waitForFunction(()=>__lagoonQA.mall().ready&&__lagoonQA.resortSpa().ready&&!__lagoonQA.islands.get('autumn').userData.lowOnly&&__lagoonQA.shaderWarmup.idle(),null,{timeout:300000});
 const report=await page.evaluate(()=>{const q=__lagoonQA;return{mall:{position:q.mall().root.position.toArray(),scale:q.mall().root.scale.toArray()},spa:{position:q.resortSpa().root.position.toArray(),scale:q.resortSpa().root.scale.toArray()},water:q.islands.get('autumn').userData.ocean.expansion||null,coins:__lagoonSaveQA.getGame().coins};});
 const specs=process.env.CHICHI_V12_BASELINE?[{name:'old-overview',eye:[450,740,1050],target:[0,-70,100],distance:1000}]:[
 {name:'expanded-overview',eye:[1350,1500,2050],target:[600,-75,300],distance:2400},
 {name:'three-buildings',eye:[1250,700,1400],target:[520,-130,240],distance:1400},
 {name:'open-water-gap',eye:[550,-75,740],target:[530,-150,235],distance:550},
 {name:'warehouse-front',eye:[1150,-100,630],target:[1150,-145,350],distance:300},
 {name:'warehouse-side',eye:[1400,-105,500],target:[1150,-145,350],distance:300},
 {name:'warehouse-top',eye:[1150,100,350],target:[1150,-145,350.01],distance:300},
 {name:'new-coast',eye:[1510,80,790],target:[1440,0,720],distance:190},
 ];
 const rows=[];
 for(const spec of specs){const row=await page.evaluate(spec=>{const q=__lagoonQA,b=q.islands.get('autumn'),gl=q.renderer.getContext();q.manualFrames=true;q.drawPaused=true;q.setGameHour(12);q.terrainClock=7;q.reviewView(b.position.x+spec.target[0],b.position.z+spec.target[2],spec.distance);q.oceanReviewCamera={eye:[b.position.x+spec.eye[0],spec.eye[1],b.position.z+spec.eye[2]],target:[b.position.x+spec.target[0],spec.target[1],b.position.z+spec.target[2]]};q.manualStepping=true;try{q.step(performance.now()+100);}finally{q.manualStepping=false;}q.drawFrame();gl.finish();return{png:q.renderer.domElement.toDataURL('image/png').split(',')[1],camera:q.camera.position.toArray(),target:q.look.toArray(),calls:q.renderer.info.render.calls,triangles:q.renderer.info.render.triangles,memory:q.renderer.info.memory,glLost:gl.isContextLost(),programs:q.renderer.info.programs.filter(p=>p.diagnostics?.runnable===false).length};},spec);await writeFile(join(review,spec.name+'.png'),Buffer.from(row.png,'base64'));delete row.png;rows.push({name:spec.name,...row});console.log('V12 actual game capture',spec.name,row.calls,row.triangles);assert(!row.glLost);assert.equal(row.programs,0);}
 await writeFile(join(review,'v12-native.json'),JSON.stringify({report,rows,errors,httpErrors,scope:'Actual full game/private SQLite, SwiftShader not hardware FPS; QA camera override only.'},null,2));assert.deepEqual(errors,[]);assert.deepEqual(httpErrors,[]);
}
