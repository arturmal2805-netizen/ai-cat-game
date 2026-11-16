import assert from 'node:assert/strict';import {writeFile} from 'node:fs/promises';import {join} from 'node:path';
import {MOSA_SEA,mosaCoastFactor,MOSA_HEADLANDS} from '../public/mosasaur-data.js';import {coastMeadowCover} from '../public/meadow-coast-field.js';
function anchors(){
 const result=[];for(let i=0;i<8;i++){let found;for(const offset of [0,.04,-.04,.08,-.08,.12]){const a=i*Math.PI/4+offset,f=mosaCoastFactor(a);for(const ratio of [1.16,1.23,1.3]){const x=Math.cos(a)*MOSA_SEA.rx*f*ratio,z=Math.sin(a)*MOSA_SEA.rz*f*ratio;if(coastMeadowCover(x,z).grass>.48&&MOSA_HEADLANDS.every(p=>Math.hypot(x-p.x,z-p.z)>p.radius*1.25+2)){found={x,z,yaw:Math.atan2(x,z)};break;}}if(found)break;}assert.ok(found,'a real open meadow must exist in coast sector '+i);result.push(found);}return result;
}
export async function auditMeadowCoastNative({page,review,errors,httpErrors}){
 const positions=anchors(),rows=[];
 const owned=()=>page.evaluate(()=>{const g=__lagoonSaveQA.getGame();return {coins:g.coins,inventory:g.inventory,placements:g.placements};});
 const initial=await owned();
 async function select(p){
  await page.evaluate(p=>{const q=__lagoonQA,b=q.islands.get('autumn');q.drawPaused=true;q.faceCamera.setEnabled(false,q.look);document.querySelector('[data-biome="autumn"]').click();q.terrainClock=60;q.terrainGrassVisible=true;q.terrainAnchor={x:b.position.x+p.x,y:.14,z:b.position.z+p.z};q.reviewView(b.position.x+p.x,b.position.z+p.z,21);q.reviewOrbit(p.yaw,.4);},p);
  await page.waitForFunction(p=>{const q=__lagoonQA,b=q.islands.get('autumn'),s=b.userData.meadowState?.();return !b.userData.lowOnly&&Math.abs(q.getDistance()-21)<.0005&&q.look.distanceTo(q.desiredLook)<.0005&&q.shaderWarmup.idle()&&s&&s.wanted>0&&s.ready===s.wanted&&!s.pending&&!s.failures;},p,{timeout:240000});
 }
 async function capture(name,p){
  const row=await page.evaluate(async p=>{const q=__lagoonQA,b=q.islands.get('autumn'),grass=b.getObjectByName('Dense streamed coastal turf; bounded 192-cell working set');q.drawFrame();
   const selected=[...grass.children].filter(o=>o.visible).sort((a,b)=>Math.hypot(a.position.x-p.x,a.position.z-p.z)-Math.hypot(b.position.x-p.x,b.position.z-p.z)).slice(0,4),cells=[];
   for(const lod of selected){const g=lod.levels[0].object.geometry,parts=[new Float64Array(lod.position.toArray()),g.attributes.meadowPose.array,g.attributes.meadowScale.array],size=parts.reduce((n,p)=>n+p.byteLength,0),bytes=new Uint8Array(size);let offset=0;for(const part of parts){bytes.set(new Uint8Array(part.buffer,part.byteOffset,part.byteLength),offset);offset+=part.byteLength;}const hash=Array.from(new Uint8Array(await crypto.subtle.digest('SHA-256',bytes)),b=>b.toString(16).padStart(2,'0')).join('');cells.push({position:lod.position.toArray(),instances:g.instanceCount,sha256:hash});}
   const shore=b.getObjectByName('Wide dry beaches and walkable island ring');q.raycaster.set(new q.THREE.Vector3(b.position.x+p.x,10,b.position.z+p.z),new q.THREE.Vector3(0,-1,0));const hits=q.raycaster.intersectObject(shore,false);
   return {position:p,state:b.userData.meadowState(),count:grass.userData.instanceCount,cells,walkHeight:hits[0]?.point.y,scope:shore.material[1].userData.meadow.scope,terrain:shore.geometry.userData.coastMeadow?{angles:shore.geometry.userData.coastMeadow.angles,rings:shore.geometry.userData.coastMeadow.rings}:null,triangles:q.renderer.info.render.triangles,draws:q.renderer.info.render.calls,dpr:q.renderer.getPixelRatio(),lost:q.renderer.getContext().isContextLost(),png:q.renderer.domElement.toDataURL('image/png').split(',')[1]};
  },p);
  await writeFile(join(review,name+'.png'),Buffer.from(row.png,'base64'));delete row.png;rows.push({name,...row});assert.equal(row.scope,'whole-coast');assert.ok(Math.abs(row.walkHeight-.14)<1e-6);assert.equal(row.dpr,2);assert.equal(row.lost,false);assert.ok(row.state.peakResident<=192);assert.ok(row.state.peakPending<=2);assert.equal(row.state.failures,0);assert.ok(row.count>1000);assert.equal(row.cells.length,4);await writeFile(join(review,'coast-coverage-results.json'),JSON.stringify({completed:false,rows,errors,httpErrors},null,2));console.log('Coast coverage',name,JSON.stringify({resident:row.state.resident,pending:row.state.pending,peak:row.state.peakResident,count:row.count}));return row;
 }
 for(let i=0;i<positions.length;i++){await select(positions[i]);await capture('coast-'+i,positions[i]);}
 await page.locator('#camera-all').click();await page.waitForFunction(()=>__lagoonQA.islands.get('autumn').userData.meadowState()?.wanted===0);
 await page.waitForTimeout(8500);assert.equal(await page.evaluate(()=>__lagoonQA.islands.get('autumn').userData.meadowState().resident),0);
 await select(positions[0]);const returned=await capture('coast-return',positions[0]);assert.deepEqual(returned.cells,rows[0].cells,'native clumps must rebuild identically after leaving the coast');
 await page.evaluate(()=>window.dispatchEvent(new Event('pagehide')));await page.waitForFunction(()=>!__lagoonSaveQA.cloud.dirty&&!__lagoonSaveQA.cloud.pending&&!__lagoonSaveQA.cloud.retryEntry);
 assert.deepEqual(await owned(),initial);await page.reload();await page.waitForFunction(()=>window.__lagoonQA&&window.__lagoonSaveQA?.cloud.editable,null,{timeout:240000});await select(positions[0]);const reloaded=await capture('coast-reload',positions[0]);assert.deepEqual(reloaded.cells,rows[0].cells,'saved/reloaded native clumps must remain deterministic');assert.deepEqual(await owned(),initial);assert.deepEqual(errors,[]);assert.deepEqual(httpErrors,[]);
 await writeFile(join(review,'coast-coverage-results.json'),JSON.stringify({completed:true,rows,initial,final:await owned(),errors,httpErrors,renderer:'Actual native game DPR2, private workerd/SQLite. Coverage/resource correctness; not a device FPS claim.'},null,2));console.log('PASS: all eight coast sectors, bounded cells, overview release, identical return/reload and private ownership.');
}
