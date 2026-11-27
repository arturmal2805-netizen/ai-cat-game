import assert from 'node:assert/strict';
import {readFile,writeFile} from 'node:fs/promises';
import {join} from 'node:path';
import {waterfrontProtected} from './warehouse-proportions-bed-protected.mjs';
export async function auditRelease(args){
 const {page,review,errors,httpErrors,desktop}=args;
 await waterfrontProtected(args);
 const before=JSON.parse(await readFile('/workspace/qa/waterfront-v14-baseline-time7/protected-buildings.json'));
 const now=JSON.parse(await readFile(join(review,'protected-buildings.json')));
 if(desktop)for(const name of ['mall','spa'])assert.deepEqual(now.buildings[name],before.buildings[name],name+' unchanged native geometry/material/poses');
 for(const k of ['lights','dpr','toneMapping','shadowType'])assert.deepEqual(now[k],before[k],k);
 const w=now.buildings.warehouse,b=w.bounds;assert.equal(w.position[0],3520);assert.equal(w.position[1],-453);assert(b.max[1]<-30);
 const old=before.buildings.warehouse.bounds;
 for(const i of [0,1,2])assert(Math.abs((b.max[i]-b.min[i])/(old.max[i]-old.min[i])-3)<1e-5);
 assert((b.max[0]-b.min[0])/(b.max[2]-b.min[2])<5,'broad actual footprint');
 await writeFile(join(review,'protected-comparison.json'),JSON.stringify({protected:['mall','spa','global lights','DPR','shadow quality'],diffs:[],warehouseRatios:[3,3,3]},null,2));
 await page.evaluate(()=>{const q=__lagoonQA;q.freeze=false;q.manualFrames=true;q.drawPaused=true;q.oceanReviewCamera=null;});
 const step=(n=100)=>page.evaluate(n=>{const q=__lagoonQA,t=performance.now();for(let i=0;i<n;i++){q.manualStepping=true;try{q.step(t+i*16.67);}finally{q.manualStepping=false;}}q.drawFrame();q.renderer.getContext().finish();},n);
 const activate=s=>desktop?page.locator(s).click():page.locator(s).tap();
 await activate('.warehouse-access');await step();
 const product=await page.evaluate(()=>{const q=__lagoonQA,T=q.THREE,w=q.islands.get('autumn').userData.ocean.warehouse,b=new T.Box3().setFromObject(w,true),points=[];for(let i=0;i<8;i++)points.push(new T.Vector3(i&1?b.max.x:b.min.x,i&2?b.max.y:b.min.y,i&4?b.max.z:b.min.z).project(q.camera).toArray());const island=q.islands.get('autumn'),hit=new T.Raycaster(new T.Vector3(q.camera.position.x,5,q.camera.position.z),new T.Vector3(0,-1,0)).intersectObject(island.userData.ocean.sea.userData.bed,true)[0];const edge=new T.Vector3(island.position.x+1540,-452.59,island.position.z+450),delta=edge.clone().sub(q.camera.position),blockedFloor=new T.Raycaster(q.camera.position,delta.clone().normalize(),0,delta.length()-.5).intersectObject(island.userData.ocean.sea.userData.bed,true).length;return{blockedFloor,camera:q.camera.position.toArray(),points,floor:hit?.point.y,far:q.camera.far,dpr:q.renderer.getPixelRatio(),buttons:[...document.querySelectorAll('.venue-access')].filter(b=>!b.hidden).map(b=>{const r=b.getBoundingClientRect();return{kind:b.dataset.venue,w:r.width,h:r.height,left:r.left,right:r.right,label:b.ariaLabel};})};});
 assert.equal(product.blockedFloor,0,'rendered seabed must not occlude the lower shell');assert(product.points.every(p=>Math.abs(p[0])<.95&&Math.abs(p[1])<.95&&p[2]<1));assert(product.camera[1]>0);assert(product.floor===undefined||product.camera[1]>product.floor+2);
 for(const b of product.buttons){assert(b.w>=44&&b.h>=44);assert(b.left>=0&&b.right<=(desktop?1440:390));assert(b.label);}
 await page.screenshot({path:join(review,'warehouse-product-camera.png')});
 await activate('.mall-access');assert(await page.evaluate(()=>__lagoonQA.mall().inspection));
 await activate('.resort-spa-access');assert(await page.evaluate(()=>__lagoonQA.resortSpa().inspection));
 await activate('.warehouse-access');await step();assert.equal(await page.locator('.warehouse-access').getAttribute('aria-pressed'),'true');
 await activate('#camera-island');await step();assert.equal(await page.locator('.warehouse-access').getAttribute('aria-pressed'),'false');
 await page.screenshot({path:join(review,'common-lagoon-overview.png')});
 await writeFile(join(review,'warehouse-product.json'),JSON.stringify(product,null,2));
 const specs=desktop?[
 {name:'warehouse-overhead',eye:[3520,3500,450],target:[3520,-254,450.01],fov:65},
 {name:'old-core-preserved',eye:[450,740,1050],target:[0,-70,100],fov:40},
 ]:[{name:'warehouse-phone-portal',eye:[3520,-90,1450],target:[3520,-285,834],fov:110}];
 const rows=[];
 for(const s of specs){const row=await page.evaluate(s=>{const q=__lagoonQA,island=q.islands.get('autumn');q.terrainClock=7;q.reviewView(island.position.x+s.target[0],island.position.z+s.target[2],5000);q.oceanReviewCamera={eye:[island.position.x+s.eye[0],s.eye[1],island.position.z+s.eye[2]],target:[island.position.x+s.target[0],s.target[1],island.position.z+s.target[2]],fov:s.fov,far:20000};q.manualStepping=true;try{q.step(performance.now()+100);}finally{q.manualStepping=false;}q.drawFrame();const gl=q.renderer.getContext();gl.finish();return{png:q.renderer.domElement.toDataURL('image/png').split(',')[1],eye:q.camera.position.toArray(),fov:q.camera.fov,dpr:q.renderer.getPixelRatio(),lost:gl.isContextLost(),badPrograms:q.renderer.info.programs.filter(p=>p.diagnostics?.runnable===false).length};},s);await writeFile(join(review,s.name+'.png'),Buffer.from(row.png,'base64'));delete row.png;assert(!row.lost&&row.badPrograms===0);rows.push({name:s.name,...row});console.log('WAREHOUSE_NATIVE_VIEW',s.name);}
 await page.evaluate(()=>{const q=__lagoonQA;q.oceanReviewCamera=null;q.freeze=false;});
 await writeFile(join(review,'warehouse-native-views.json'),JSON.stringify({rows,errors,httpErrors,renderer:'SwiftShader; no physical device FPS claim'},null,2));
 await writeFile(join(review,'proportions-native.json'),JSON.stringify({passed:true,desktop,source:'actual-game',widthToDepthRatio:(b.max[0]-b.min[0])/(b.max[2]-b.min[2]),product,rows,errors,httpErrors},null,2));
 assert.deepEqual(errors,[]);assert.deepEqual(httpErrors,[]);
 if(!desktop){const{deepSave}=await import('./warehouse-proportions-bed-deep-save.mjs');await deepSave(args);}
 console.log('WAREHOUSE_PROPORTIONS_NATIVE_PASS');
}
