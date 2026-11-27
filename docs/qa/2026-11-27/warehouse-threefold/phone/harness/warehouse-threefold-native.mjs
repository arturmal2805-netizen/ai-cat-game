import assert from 'node:assert/strict';
import {readFile,writeFile} from 'node:fs/promises';
import {join} from 'node:path';
import {waterfrontProtected} from './warehouse-threefold-protected.mjs';
import {waterfrontThirdFinal} from './waterfront-threefold-third-final.mjs';
export async function auditRelease(args){
 const {page,review,errors,httpErrors,desktop}=args;
 await waterfrontProtected(args);
 const before=JSON.parse(await readFile('/workspace/qa/waterfront-v14-baseline-time7/protected-buildings.json'));
 const now=JSON.parse(await readFile(join(review,'protected-buildings.json')));
 if(desktop)for(const name of ['mall','spa'])assert.deepEqual(now.buildings[name],before.buildings[name],name+' unchanged native geometry/material/poses');
 for(const k of ['lights','dpr','toneMapping','shadowType'])assert.deepEqual(now[k],before[k],k);
 const w=now.buildings.warehouse,b=w.bounds;assert.equal(w.position[0],3520);assert.equal(w.position[1],-453);assert(b.max[1]<-30);
 const old=before.buildings.warehouse.bounds;
 for(const i of [0,1])assert(Math.abs((b.max[i]-b.min[i])/(old.max[i]-old.min[i])-3)<1e-5);
 assert(Math.abs((b.max[2]-b.min[2])-(old.max[2]-old.min[2]))<.01);
 await writeFile(join(review,'protected-comparison.json'),JSON.stringify({protected:['mall','spa','global lights','DPR','shadow quality'],diffs:[],warehouseRatios:[3,3,1]},null,2));
 await page.evaluate(()=>{const q=__lagoonQA;q.freeze=false;q.manualFrames=true;q.drawPaused=true;q.oceanReviewCamera=null;});
 const step=(n=100)=>page.evaluate(n=>{const q=__lagoonQA,t=performance.now();for(let i=0;i<n;i++){q.manualStepping=true;try{q.step(t+i*16.67);}finally{q.manualStepping=false;}}q.drawFrame();q.renderer.getContext().finish();},n);
 const activate=s=>desktop?page.locator(s).click():page.locator(s).tap();
 await activate('.warehouse-access');await step();
 const product=await page.evaluate(()=>{const q=__lagoonQA,T=q.THREE,w=q.islands.get('autumn').userData.ocean.warehouse,b=new T.Box3().setFromObject(w,true),points=[];for(let i=0;i<8;i++)points.push(new T.Vector3(i&1?b.max.x:b.min.x,i&2?b.max.y:b.min.y,i&4?b.max.z:b.min.z).project(q.camera).toArray());const island=q.islands.get('autumn'),hit=new T.Raycaster(new T.Vector3(q.camera.position.x,5,q.camera.position.z),new T.Vector3(0,-1,0)).intersectObject(island.userData.ocean.sea.userData.bed,true)[0];const edge=new T.Vector3(island.position.x+1540,-452.59,island.position.z+450),delta=edge.clone().sub(q.camera.position),blockedFloor=new T.Raycaster(q.camera.position,delta.clone().normalize(),0,delta.length()-.5).intersectObject(island.userData.ocean.sea.userData.bed,true).length;return{blockedFloor,camera:q.camera.position.toArray(),points,floor:hit?.point.y,far:q.camera.far,dpr:q.renderer.getPixelRatio(),buttons:[...document.querySelectorAll('.venue-access')].filter(b=>!b.hidden).map(b=>{const r=b.getBoundingClientRect();return{kind:b.dataset.venue,w:r.width,h:r.height,left:r.left,right:r.right,label:b.ariaLabel};})};});
 assert.equal(product.blockedFloor,0,'rendered seabed must not occlude the lower shell');assert(product.points.every(p=>Math.abs(p[0])<.95&&Math.abs(p[1])<.95&&p[2]<1));assert(product.camera[1]<0);assert(product.floor===undefined||product.camera[1]>product.floor+2);
 for(const b of product.buttons){assert(b.w>=44&&b.h>=44);assert(b.left>=0&&b.right<=(desktop?1440:390));assert(b.label);}
 await page.screenshot({path:join(review,'warehouse-product-camera.png')});
 await activate('.mall-access');assert(await page.evaluate(()=>__lagoonQA.mall().inspection));
 await activate('.resort-spa-access');assert(await page.evaluate(()=>__lagoonQA.resortSpa().inspection));
 await activate('.warehouse-access');await step();assert.equal(await page.locator('.warehouse-access').getAttribute('aria-pressed'),'true');
 await activate('#camera-island');await step();assert.equal(await page.locator('.warehouse-access').getAttribute('aria-pressed'),'false');
 await page.screenshot({path:join(review,'common-lagoon-overview.png')});
 await writeFile(join(review,'warehouse-product.json'),JSON.stringify(product,null,2));
 const specs=desktop?[
  {name:'warehouse-aerial-front',eye:[3520,1900,5100],target:[3520,-254,450],fov:50},
  {name:'warehouse-aerial-side',eye:[5700,1200,2300],target:[3520,-254,450],fov:65},
  {name:'warehouse-overhead',eye:[3520,3800,450],target:[3520,-254,450.01],fov:65},
  {name:'warehouse-portal',eye:[3520,-120,950],target:[3520,-285,575],fov:65},
  {name:'warehouse-glass-gold-close',eye:[4480,-80,1050],target:[4450,-215,450],fov:65},
  {name:'old-core-preserved',eye:[450,740,1050],target:[0,-70,100],fov:40},
  {name:'new-far-shore',eye:[5700,160,1150],target:[5650,0,450],fov:55},
  {name:'all-four-venues',eye:[3650,3700,3700],target:[2300,-150,320],fov:55},
 ]:[{name:'warehouse-phone-portal',eye:[3520,-90,1100],target:[3520,-285,575],fov:95}];
 const rows=[];
 for(const s of specs){const row=await page.evaluate(s=>{const q=__lagoonQA,island=q.islands.get('autumn');q.terrainClock=7;q.reviewView(island.position.x+s.target[0],island.position.z+s.target[2],5000);q.oceanReviewCamera={eye:[island.position.x+s.eye[0],s.eye[1],island.position.z+s.eye[2]],target:[island.position.x+s.target[0],s.target[1],island.position.z+s.target[2]],fov:s.fov,far:20000};q.manualStepping=true;try{q.step(performance.now()+100);}finally{q.manualStepping=false;}q.drawFrame();const gl=q.renderer.getContext();gl.finish();return{png:q.renderer.domElement.toDataURL('image/png').split(',')[1],eye:q.camera.position.toArray(),fov:q.camera.fov,dpr:q.renderer.getPixelRatio(),lost:gl.isContextLost(),badPrograms:q.renderer.info.programs.filter(p=>p.diagnostics?.runnable===false).length};},s);await writeFile(join(review,s.name+'.png'),Buffer.from(row.png,'base64'));delete row.png;assert(!row.lost&&row.badPrograms===0);rows.push({name:s.name,...row});console.log('WAREHOUSE_NATIVE_VIEW',s.name);}
 await page.evaluate(()=>{const q=__lagoonQA;q.oceanReviewCamera=null;q.freeze=false;});
 await writeFile(join(review,'warehouse-native-views.json'),JSON.stringify({rows,errors,httpErrors,renderer:'SwiftShader; no physical device FPS claim'},null,2));
 // Real group invitation with no manual takeover must finish a water jump.
 await activate('.waterfront-access');await step(1);await activate('[data-waterfront-view="trampoline"]');await step(1);await page.waitForFunction(()=>__lagoonQA.waterfront().ready,null,{timeout:600000});
 await activate('[data-waterfront-all-trampoline]');
 const phases=new Set(),hops=[],captures=[];let last='',seen=false;
 for(let i=0;i<2500;i++){
  const v=await page.evaluate(()=>{const q=__lagoonQA;q.nativeNow??=performance.now();q.nativeNow+=100;q.terrainClock=(q.terrainClock??7)+.1;q.manualStepping=true;try{q.step(q.nativeNow);}finally{q.manualStepping=false;}const v=q.waterfront().runtime.get('chichi');return v&&{phase:v.phase,y:v.local.y,height:v.launchHeight,age:v.age};});
  if(!v){if(seen)break;continue;}seen=true;phases.add(v.phase);
  if(v.phase==='bounce'&&last!=='bounce')hops.push(v.height);
  if(desktop&&((v.phase==='compress'&&v.age>.3&&!captures.includes('compress'))||(v.phase==='dive'&&v.age>1&&!captures.includes('dive'))||(v.phase==='splash'&&!captures.includes('splash')))){
   const name=v.phase;captures.push(name);
   const png=await page.evaluate(()=>{const q=__lagoonQA;q.drawFrame();q.renderer.getContext().finish();return q.renderer.domElement.toDataURL('image/png').split(',')[1];});await writeFile(join(review,'automatic-'+name+'.png'),Buffer.from(png,'base64'));
  }
  last=v.phase;
 }
 assert(seen);assert.equal(hops.length,4);for(let i=1;i<hops.length;i++)assert(hops[i]>hops[i-1]);
 for(const p of ['dive','splash','swim','climb','shake'])assert(phases.has(p),p);
 await writeFile(join(review,'automatic-trampoline-cycle.json'),JSON.stringify({input:'real group invitation button, no manual takeover',hops,phases:[...phases],captures},null,2));
 console.log('AUTOMATIC_WATER_JUMP_PASS',JSON.stringify(hops));
 await page.locator('.waterfront-access').evaluate(b=>{if(b.getAttribute('aria-pressed')==='true')b.click();});
 await waterfrontThirdFinal(args);
 if(!desktop){const{deepSave}=await import("./warehouse-threefold-deep-save.mjs");await deepSave(args);}
}
