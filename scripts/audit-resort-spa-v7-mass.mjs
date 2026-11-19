import assert from 'node:assert/strict';
import {writeFile} from 'node:fs/promises';
import {join} from 'node:path';
import {SPA_PALACE as P} from '../public/resort-spa-layout-v7.js';
export async function auditSpaV7Mass({page,review,errors,httpErrors}){
 const stage=process.env.CHICHI_SPA_V7_PHASE||'mass';
 const report=await page.evaluate(()=>{const q=__lagoonQA,r=q.resortSpa().root;return{report:r.userData.palace,layout:r.userData.layoutVersion,rootName:r.name,rootId:r.userData.id,zoneCount:r.userData.zones.size,basins:r.userData.basins.length,mallInspection:q.mall().inspection,appScripts:[...document.scripts].filter(s=>s.src.includes('app.js')).length};});
 assert.equal(report.layout,7);assert.equal(report.zoneCount,8);assert.equal(report.report.floorCount,3);assert.equal(report.report.independentRoomPlatforms,0);assert.equal(report.rootId,'chichi-underwater-spa');
 const views=[{name:'mass-angle',x:176,y:-58,z:263,fov:100},{name:'mass-front',x:0,y:-151,z:308,fov:110,targetY:-148},{name:'mass-top',x:12,y:-.5,z:239,fov:100},...(stage==='interiors'?[{name:'midnight-interior',x:-82,y:-134,z:246,targetX:-82,targetY:-139,targetZ:225,fov:80},{name:'golden-interior',x:51,y:-135,z:251,targetX:99,targetY:-139,targetZ:224,fov:80},{name:'thermal-interior',x:-20,y:-158,z:284,targetX:0,targetY:-163,targetZ:259,fov:85},{name:'massage-interior',x:-88,y:-146,z:241,targetX:-88,targetY:-150,targetZ:222,fov:80}]:[])],frames=[];
 for(const view of views){
  await page.evaluate(v=>{const q=__lagoonQA,r=q.resortSpa().root;q.oceanReviewCamera={eye:[r.position.x+v.x,v.y,r.position.z+v.z],target:[r.position.x+(v.targetX??0),v.targetY??-138,r.position.z+(v.targetZ??224)],fov:v.fov};q.camera.fov=v.fov;q.camera.updateProjectionMatrix();q.liveFrames=[];q.targetFrames=q.frames+2;q.drawPaused=false;q.gpuFrames.clear();},view);
  await page.waitForFunction(()=>__lagoonQA.frames>=__lagoonQA.targetFrames,null,{timeout:240000});
  const state=await page.evaluate(()=>{const q=__lagoonQA;q.drawPaused=true;return{camera:q.camera.position.toArray(),look:q.look.toArray(),fov:q.camera.fov,render:q.renderer.info.render,memory:q.renderer.info.memory,frameSamples:q.liveFrames,heap:performance.memory?.usedJSHeapSize,lighting:q.scene.children.filter(o=>o.isLight).map(o=>({type:o.type,color:o.color.getHex(),intensity:o.intensity})),dpr:q.renderer.getPixelRatio()};});
  assert.equal(state.fov,view.fov);await page.screenshot({path:join(review,view.name+'.png'),style:'.resort-spa-zones{visibility:hidden!important}'});frames.push({...view,...state});await writeFile(join(review,'v7-mass-frames.json'),JSON.stringify({stage,scope:'Architecture mass/facade in actual private game using explicit QA-only layoutVersion7; public default remains6. Stage-specific geometry and furnishing capture; not a complete functional V7 audit, final reference acceptance or device FPS.',...report,layout:P,frames,errors,httpErrors},null,2));console.log('V7 actual architecture frame',view.name);
 }
 assert.deepEqual(errors,[]);assert.deepEqual(httpErrors,[]);console.log('PASS V7 mass native capture; functionality and reference detailing remain pending');
}
