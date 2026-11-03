import {test} from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {createHash} from 'node:crypto';
import * as T from 'three';
import {SHOWCASE_SURFACE_ASSETS,SHOWCASE_SURFACE_BYTES} from '../public/showcase-surface-assets.js';
import {showcaseSurfaceUVSteps,showcaseMaterialSteps} from '../public/showcase-surface-details.js';
import {runSceneSteps} from '../public/scene-tasks.js';
import {fern,rosette,leafyCanopy,mossMantle} from '../public/showcase-botany.js';

test('original versioned charts and granular sand have bounded shared storage, full colour detail and separate moss/wood/rock/leaf surfaces',async()=>{
 let bytes=0,gpu=0,count=0;
 for(const [kind,roles]of Object.entries(SHOWCASE_SURFACE_ASSETS))for(const [role,url]of Object.entries(roles)){
  const png=await readFile(new URL('../public/'+url,import.meta.url)),size=role==='color'?512:role==='normal'?256:128;
  assert.equal(png.readUInt32BE(16),size);assert.equal(png.readUInt32BE(20),size);
  assert.ok(url.includes(createHash('sha256').update(png).digest('hex').slice(0,12)),kind+' '+role);
  bytes+=png.length;gpu+=Math.ceil(size*size*4*4/3);count++;
 }
 assert.equal(count,14);assert.equal(bytes,SHOWCASE_SURFACE_BYTES.download);assert.equal(gpu,SHOWCASE_SURFACE_BYTES.gpuMipmapped);
 assert.ok(bytes<2400000);assert.ok(gpu<10*1024*1024);
 assert.notEqual(SHOWCASE_SURFACE_ASSETS.moss.color,SHOWCASE_SURFACE_ASSETS.leaf.color);
});
test('physical beam grain and owned surface changes never mutate a shared primitive/material or its transformed vertices',()=>{
 const g=new T.CylinderGeometry(.2,.2,1,8),m=new T.MeshStandardMaterial({color:0xa37c50}),uv=Array.from(g.attributes.uv.array),positions=Array.from(g.attributes.position.array);g.userData.sharedScenery=true;m.userData.sharedScenery=true;m.userData.surfaceKind='wood';
 const root=new T.Group(),mesh=new T.Mesh(g,m);mesh.scale.set(1,40,1);mesh.rotation.z=.7;root.add(mesh);root.updateMatrixWorld(true);const world=mesh.matrixWorld.clone();
 runSceneSteps(showcaseSurfaceUVSteps(root));runSceneSteps(showcaseMaterialSteps(root));
 assert.notEqual(mesh.geometry,g);assert.notEqual(mesh.material,m);assert.deepEqual(Array.from(g.attributes.uv.array),uv);assert.deepEqual(Array.from(mesh.geometry.attributes.position.array),positions);assert.equal(m.normalMap,null);assert.equal(m.color.getHex(),0xa37c50);
 assert.equal(Math.max(...Array.from(mesh.geometry.attributes.uv.array).filter((_,i)=>i%2)),10);
 const changed=Array.from(mesh.geometry.attributes.uv.array);runSceneSteps(showcaseSurfaceUVSteps(root));assert.deepEqual(Array.from(mesh.geometry.attributes.uv.array),changed);root.updateMatrixWorld(true);assert.deepEqual(mesh.matrixWorld,world);
});
test('curved foliage reuses bounded opaque geometry and moss has a real hanging surface with a matte response',()=>{
 const root=new T.Group(),a=fern(root,0,0,0),b=fern(root,3,0,0),c=rosette(root,0,0,3);leafyCanopy(root,0,0,0,20);const moss=mossMantle(root,8,0,12,5,1);
 assert.equal(a.geometry,b.geometry);assert.equal(a.material,b.material);assert.ok(a.geometry.index.count/3<=220);assert.ok(c.geometry.index.count/3<=40);
 assert.equal(a.material.transparent,false);assert.equal(a.material.alphaTest,0);assert.ok(moss.geometry.attributes.position.count>200);
 runSceneSteps(showcaseMaterialSteps(root));assert.equal(moss.material.userData.showcaseSurface.kind,'moss');assert.ok(moss.material.roughness>=.8);assert.equal(moss.material.metalness,0);
 for(const mesh of root.children)assert.equal(mesh.material.onBeforeCompile,T.Material.prototype.onBeforeCompile);
});
for(const fail of [false,true])test('selected surface decoding '+(fail?'fails atomically without retrying or leaking partial bitmaps':'coalesces all callers and limits concurrent work'),async()=>{
 const originals={window:globalThis.window,fetch:globalThis.fetch,createImageBitmap:globalThis.createImageBitmap};let requests=0,active=0,peak=0,decoded=0,closed=0;
 try{
  globalThis.window={};globalThis.fetch=async url=>{requests++;active++;peak=Math.max(peak,active);await new Promise(r=>setTimeout(r,2));active--;if(fail&&url.includes('moss-normal'))throw Error('offline');return {ok:true,blob:async()=>({url})};};
  globalThis.createImageBitmap=async()=>{decoded++;return {width:512,height:512,close(){closed++;}};};
  const module=await import('../public/showcase-surface-details.js?surface-test='+fail),one=module.prepareShowcaseSurfaces(),two=module.prepareShowcaseSurfaces();assert.equal(one,two);assert.equal(await one,!fail);assert.equal(await module.prepareShowcaseSurfaces(),!fail);
  assert.equal(requests,14);assert.ok(peak<=3);assert.equal(closed,fail?decoded:0);
  if(!fail){const material=new T.MeshStandardMaterial();material.userData.surfaceKind='moss';const root=new T.Group();root.add(new T.Mesh(new T.PlaneGeometry(),material));module.applyShowcaseSurfaceDetails(root);assert.match(material.map.name,/water garden moss color/);assert.equal(material.map.colorSpace,T.SRGBColorSpace);assert.equal(material.normalMap.colorSpace,T.NoColorSpace);}
 }finally{for(const [key,value]of Object.entries(originals)){if(value===undefined)delete globalThis[key];else globalThis[key]=value;}}
});
