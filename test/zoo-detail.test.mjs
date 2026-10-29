import {test} from 'node:test';
import assert from 'node:assert/strict';
import * as T from 'three';
import {sculptZooAnimalSteps} from '../public/zoo-sculpt.js';
import {zooAnimals} from '../public/zoo-animals.js';
import {zooAnimalPose} from '../public/zoo-animal-motion.js';
import {ZOO_EXHIBITS} from '../public/zoo-data.js';

function finish(steps){let r;do{r=steps.next();}while(!r.done);return r.value;}
test('sculpt normals follow the continuous skin instead of embossing polygon diagonals',()=>{
 const g=finish(sculptZooAnimalSteps([{pos:[0,0,0],size:[1,1,1],color:0x888888,id:0}],{resolution:24,targetTriangles:800}));
 const p=g.attributes.position,n=g.attributes.normal;
 for(let i=0;i<p.count;i++){const v=new T.Vector3().fromBufferAttribute(p,i),normal=new T.Vector3().fromBufferAttribute(n,i);assert.ok(Math.abs(v.length()-1)<.002);assert.ok(v.normalize().dot(normal)>.9999);}
 g.dispose();
});
test('facial relief normals follow the deformed skin analytically, including the nasal bridge',()=>{
 const relief=[[0,.1,.18,.22,.16],[.24,.25,.07,.17,.08]],g=finish(sculptZooAnimalSteps([{pos:[0,0,0],size:[.5,.5,.4],relief,color:0x777777,id:0}],{resolution:36,targetTriangles:2200}));
 const distance=(x,y,z)=>{let h=0;for(const [cx,cy,a,sx,sy] of relief)h+=a*Math.exp(-.5*(((x-cx)/sx)**2+((y-cy)/sy)**2));return (Math.hypot(x/.5,y/.5,(z-h)/.4)-1)*.4;};
 for(let i=0;i<g.attributes.position.count;i+=5){const p=new T.Vector3().fromBufferAttribute(g.attributes.position,i),e=.0001,derivative=new T.Vector3((distance(p.x+e,p.y,p.z)-distance(p.x-e,p.y,p.z))/(2*e),(distance(p.x,p.y+e,p.z)-distance(p.x,p.y-e,p.z))/(2*e),(distance(p.x,p.y,p.z+e)-distance(p.x,p.y,p.z-e))/(2*e)).normalize();assert.ok(Math.abs(distance(p.x,p.y,p.z))<.002);assert.ok(derivative.dot(new T.Vector3().fromBufferAttribute(g.attributes.normal,i))>.9999);}
 g.dispose();
});
test('soft facial joins remain one continuous surface with normalized smooth normals',()=>{
 const volumes=[{pos:[0,0,0],size:[.5,.5,.4],blend:.14},{pos:[.21,.1,.27],size:[.25,.22,.2],blend:.14}].map(v=>({...v,color:0x777777,id:0}));
 const g=finish(sculptZooAnimalSteps(volumes,{resolution:36,targetTriangles:2500})),edges=new Map(),index=g.index.array;
 for(let i=0;i<index.length;i+=3)for(let k=0;k<3;k++){const x=index[i+k],y=index[i+(k+1)%3],key=Math.min(x,y)+','+Math.max(x,y);edges.set(key,(edges.get(key)||0)+1);}
 for(const count of edges.values())assert.equal(count,2,'open seam in blended face');
 for(let i=0;i<g.attributes.normal.count;i++)assert.ok(Math.abs(new T.Vector3().fromBufferAttribute(g.attributes.normal,i).length()-1)<1e-5);
 g.dispose();
});
test('denser offline animal sculpt retains released runtime vertex, triangle and pose budgets',()=>{
 const limits={elephant:[24027,44604,998400],axolotl:[22370,38928,460800],otter:[26429,34384,588800],polar:[43026,53176,588800],gorilla:[39888,51868,412672]};
 for(const e of ZOO_EXHIBITS){const m=zooAnimals(e),g=m.geometry,[vertices,triangles,bytes]=limits[e.species];assert.ok(g.attributes.position.count<=vertices,e.species+' vertices');assert.ok(g.index.count/3<=triangles,e.species+' triangles');assert.equal(m.userData.poseData.values.byteLength,bytes);assert.equal(m.material.alphaToCoverage,false);m.dispose();g.dispose();m.material.dispose();}
});
test('elephant neutral trunk has no accumulated sideways bend and retains smooth closed motion',()=>{
 for(let i=0;i<5;i++){const role='trunk'+i,rest=zooAnimalPose('elephant',0,role);assert.equal(rest.rx,0);assert.equal(rest.rz,0);const a=zooAnimalPose('elephant',31.9999,role),b=zooAnimalPose('elephant',.0001,role);assert.ok(Math.abs(a.rz-b.rz)<.0001);assert.ok(Math.abs(a.rx-b.rx)<.0001);}
});
test('photographic coat loads only on demand, coalesces and reuses one filtered immutable texture',async()=>{
 const old={window:globalThis.window,fetch:globalThis.fetch,bitmap:globalThis.createImageBitmap};let requests=0,decodes=0;
 try{globalThis.window={};globalThis.fetch=async()=>{requests++;return {ok:true,blob:async()=>new Blob()};};globalThis.createImageBitmap=async(_blob,options)=>{decodes++;assert.equal(options.imageOrientation,'none');return {width:1254,height:1254};};
  const {prepareZooCoat,zooCoatUniforms}=await import('../public/zoo-coat-atlas.js?qa=success');assert.equal(requests,0);assert.equal(zooCoatUniforms.uZooCoatReady.value,0);
  const a=prepareZooCoat(),b=prepareZooCoat();assert.equal(a,b);assert.equal(await a,true);assert.equal(requests,1);assert.equal(decodes,1);const t=zooCoatUniforms.uZooCoatAtlas.value,version=t.version;assert.equal(t.flipY,false);assert.equal(t.generateMipmaps,true);assert.equal(t.colorSpace,T.SRGBColorSpace);assert.equal(await prepareZooCoat(),true);assert.equal(t.version,version);assert.equal(requests,1);
 }finally{globalThis.window=old.window;globalThis.fetch=old.fetch;globalThis.createImageBitmap=old.bitmap;}
});
test('an unavailable coat retains the stable fallback without an unbounded retry loop',async()=>{
 const old={window:globalThis.window,fetch:globalThis.fetch,bitmap:globalThis.createImageBitmap};let requests=0;
 try{globalThis.window={};globalThis.createImageBitmap=async()=>{};globalThis.fetch=async()=>{requests++;throw Error('offline');};const {prepareZooCoat,zooCoatUniforms}=await import('../public/zoo-coat-atlas.js?qa=failure');assert.equal(await prepareZooCoat(),false);assert.equal(await prepareZooCoat(),false);assert.equal(requests,1);assert.equal(zooCoatUniforms.uZooCoatReady.value,0);assert.equal(zooCoatUniforms.uZooCoatAtlas.value.image.width,1);
 }finally{globalThis.window=old.window;globalThis.fetch=old.fetch;globalThis.createImageBitmap=old.bitmap;}
});

test('gorilla mouth and nostrils are painted into continuous matte skin, without protruding glossy backing parts',()=>{
 const m=zooAnimals(ZOO_EXHIBITS.find(e=>e.species==='gorilla')),g=m.geometry;let dark=0,skin=0;
 for(let i=0;i<g.attributes.position.count;i++){const p=new T.Vector3().fromBufferAttribute(g.attributes.position,i);if(p.z<.84||Math.abs(p.x)>.22||p.y<1.86||p.y>2.12)continue;assert.equal(g.attributes.aGloss.getX(i),0,'separate face backing');assert.equal(g.attributes.aGloss.getY(i),0,'hair inside oral/nasal cavity');skin++;if(g.attributes.color.getX(i)<.035)dark++;}
 assert.ok(skin>50);assert.ok(dark>10,'carved cavities lost their inner pigment');m.dispose();g.dispose();m.material.dispose();
});
