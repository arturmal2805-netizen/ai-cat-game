import assert from 'node:assert/strict';
import {writeFile} from 'node:fs/promises';
import {join} from 'node:path';
import {SPA_PALACE as P} from '../public/resort-spa-layout-v7.js';
export async function auditSpaV7Mass({page,review,errors,httpErrors}){
 const stage=process.env.CHICHI_SPA_V7_PHASE||'mass';
 const report=await page.evaluate(()=>{const q=__lagoonQA,r=q.resortSpa().root;return{report:r.userData.palace,layout:r.userData.layoutVersion,rootName:r.name,rootId:r.userData.id,zoneCount:r.userData.zones.size,basins:r.userData.basins.length,mallInspection:q.mall().inspection,appScripts:[...document.scripts].filter(s=>s.src.includes('app.js')).length};});
 assert.equal(report.layout,7);assert.equal(report.zoneCount,8);assert.equal(report.report.floorCount,3);assert.equal(report.report.independentRoomPlatforms,0);assert.equal(report.rootId,'chichi-underwater-spa');
 const views=[{name:'mass-angle',x:176,y:-58,z:263,fov:100},{name:'mass-front',x:0,y:-120,z:310,fov:105,targetY:-145},{name:'mass-top',x:12,y:-.5,z:239,fov:100}],frames=[];
 for(const view of views){
  await page.evaluate(v=>{const q=__lagoonQA,r=q.resortSpa().root;q.oceanReviewCamera={eye:[r.position.x+v.x,v.y,r.position.z+v.z],target:[r.position.x,v.targetY??-138,r.position.z+224],fov:v.fov};q.camera.fov=v.fov;q.camera.updateProjectionMatrix();q.liveFrames=[];q.targetFrames=q.frames+2;q.drawPaused=false;q.gpuFrames.clear();},view);
  await page.waitForFunction(()=>__lagoonQA.frames>=__lagoonQA.targetFrames,null,{timeout:240000});
  const state=await page.evaluate(()=>{const q=__lagoonQA;q.drawPaused=true;return{camera:q.camera.position.toArray(),look:q.look.toArray(),fov:q.camera.fov,render:q.renderer.info.render,memory:q.renderer.info.memory,frameSamples:q.liveFrames,heap:performance.memory?.usedJSHeapSize,lighting:q.scene.children.filter(o=>o.isLight).map(o=>({type:o.type,color:o.color.getHex(),intensity:o.intensity})),dpr:q.renderer.getPixelRatio()};});
  assert.equal(state.fov,view.fov);await page.screenshot({path:join(review,view.name+'.png'),style:'.resort-spa-zones{visibility:hidden!important}'});frames.push({...view,...state});await writeFile(join(review,'v7-mass-frames.json'),JSON.stringify({stage,scope:'Architecture mass/facade in actual private game using explicit QA-only layoutVersion7; public default remains6. Not furnished/functional V7, final ref matching or device FPS.',...report,layout:P,frames,errors,httpErrors},null,2));console.log('V7 actual architecture frame',view.name);
 }
 assert.deepEqual(errors,[]);assert.deepEqual(httpErrors,[]);console.log('PASS V7 mass native capture; functionality and reference detailing remain pending');
}
