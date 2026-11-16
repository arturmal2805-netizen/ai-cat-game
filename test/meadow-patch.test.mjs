import {readFileSync} from 'node:fs';
import {createHash} from 'node:crypto';
import test from 'node:test';
import assert from 'node:assert/strict';
import * as T from 'three';
import {meadowCover,MEADOW_PATCH,MEADOW_ASSETS} from '../public/meadow-patch.js';

test('source paths resolve under the published GitHub Pages project prefix',()=>{for(const path of Object.values(MEADOW_ASSETS)){assert.ok(path.startsWith('./art/meadow/'));assert.equal(new URL(path,'https://example.test/ai-cat-game/').pathname,'/ai-cat-game/'+path.slice(2));}});

test('prepared sod excludes the worn walking strip and ends outside its local footprint',()=>{
 const p=MEADOW_PATCH;
 for(let z=-20;z<=20;z+=.5){const pathX=1.7*Math.sin(z*.14)+.018*z*z;const v=meadowCover(p.x+pathX,p.z+z);assert.ok(v.soil>.8);assert.ok(v.grass<.13);}
 for(const [x,z] of [[0,0],[p.x+p.rx*1.3,p.z],[p.x,p.z-p.rz*1.3]])assert.equal(meadowCover(x,z).region,0);
 assert.ok(meadowCover(p.x-6,p.z).grass>.95);
});

test('selected preparation coalesces, bounds decoding, and retains physical colour/data roles',async()=>{
 const oldBitmap=globalThis.createImageBitmap,oldFetch=globalThis.fetch;let fetches=0,active=0,max=0,closed=0;
 globalThis.fetch=async()=>{fetches++;return {ok:true,blob:async()=>new Blob(['source'])};};
 globalThis.createImageBitmap=async(_blob,options)=>{assert.equal(options.imageOrientation,'flipY');assert.equal(options.colorSpaceConversion,'none');active++;max=Math.max(max,active);await new Promise(setImmediate);active--;return {width:1024,height:1024,close(){closed++;}};};
 try{
  const m=await import('../public/meadow-patch.js?preparation-contract');const a=m.prepareMeadowPatch(),b=m.prepareMeadowPatch();assert.equal(a,b);assert.equal(await a,true);assert.equal(fetches,4);assert.ok(max<=2);assert.equal(closed,0);
  const material=new T.MeshStandardMaterial();assert.equal(m.applyMeadowPatch(material),true);
  for(const [name,u]of Object.entries(material.uniforms)){const t=u.value;if(!t?.isTexture)continue;assert.equal(t.colorSpace,['uMeadowColor','uMeadowSoil'].includes(name)?T.SRGBColorSpace:T.NoColorSpace);if(name!=='uMeadowMask'){assert.equal(t.flipY,false);assert.equal(t.anisotropy,4);}assert.equal(t.generateMipmaps,true);}
  assert.equal(material.normalScale.x,.28);assert.equal(material.normalScale.y,.28);
  // Actual instance origins share the surface's prepared path and placement
  // clearance; neither LOD variant may put a clump on the walking strip.
  const it=m.meadowGrassSteps((x,z)=>Math.hypot(x-270,z+25)>2);let out;do{out=it.next();}while(!out.done);const root=out.value;assert.ok(root.userData.instanceCount>10000);
  const fixture=JSON.parse(readFileSync(new URL('./fixtures/meadow-v4-native-geometry.json',import.meta.url)));
  const poseHash=createHash('sha256'),centreHash=createHash('sha256');
  assert.equal(root.userData.instanceCount,fixture.instanceCount);
  for(const lod of root.children){centreHash.update(Buffer.from(new Float64Array(lod.position.toArray()).buffer));const g=lod.levels[0].object.geometry,p=g.attributes.meadowPose.array,s=g.attributes.meadowScale.array,packed=new Float32Array(g.instanceCount*5);for(let i=0;i<g.instanceCount;i++)packed.set([...p.subarray(i*4,i*4+4),s[i]],i*5);poseHash.update(Buffer.from(packed.buffer));}
  assert.equal(poseHash.digest('hex'),fixture.posesSHA256);assert.equal(centreHash.digest('hex'),fixture.centresSHA256);
  const geometry=root.children[0].levels[0].object.geometry;
  for(const [name,hash]of Object.entries(fixture.geometry)){const attribute=name==='index'?geometry.index:geometry.attributes[name];assert.equal(createHash('sha256').update(Buffer.from(attribute.array.buffer)).digest('hex'),hash,name+' must retain every original v4 vertex/normal/colour/index');}
  const matrix=new T.Matrix4(),position=new T.Vector3();
  for(const lod of root.children){
   // A chunk switches only after every clump has finished the same smooth
   // shape transition; the far empty level starts after complete collapse.
   const near=lod.levels[0].object,coarse=lod.levels[1].object;
   let radius=0;for(let i=0;i<near.geometry.instanceCount;i++){const pose=near.geometry.attributes.meadowPose;radius=Math.max(radius,Math.hypot(pose.getX(i),pose.getY(i)));}
   assert.ok(lod.levels[1].distance-radius>=12);assert.ok(lod.levels[2].distance-radius>=46);
   for(let blade=0;blade<8;blade++)for(let row=0;row<=3;row++)for(let side=0;side<2;side++){
    const ni=blade*8+row*2+side,lo=blade*4+side,hi=lo+2,t=row/3;
    for(let axis=0;axis<3;axis++){
     const expected=T.MathUtils.lerp(coarse.geometry.attributes.position.array[lo*3+axis],coarse.geometry.attributes.position.array[hi*3+axis],t);
     assert.ok(Math.abs(expected-near.geometry.attributes.meadowCoarse.array[ni*3+axis])<1e-7);
    }
   }
   assert.equal(lod.levels.length,3);for(const {object:mesh}of lod.levels){if(!mesh.geometry?.isInstancedBufferGeometry)continue;for(let i=0;i<mesh.geometry.instanceCount;i++){const pose=mesh.geometry.attributes.meadowPose;position.set(pose.getX(i),0,pose.getY(i)).add(lod.position);const c=m.meadowCover(position.x,position.z);assert.ok(c.soil<=.4);assert.ok(Math.hypot(position.x-270,position.z+25)>1.999);}}}
 }finally{globalThis.createImageBitmap=oldBitmap;globalThis.fetch=oldFetch;}
});

test('a failed source keeps the legacy surface and releases completed decodes once',async()=>{
 const oldBitmap=globalThis.createImageBitmap,oldFetch=globalThis.fetch;let calls=0,created=0,closed=0;
 globalThis.fetch=async()=>({ok:++calls!==2,blob:async()=>new Blob(['source'])});globalThis.createImageBitmap=async()=>{created++;return {width:1024,height:1024,close(){closed++;}};};
 try{const m=await import('../public/meadow-patch.js?failed-source');assert.equal(await m.prepareMeadowPatch(),false);const material=new T.MeshStandardMaterial({color:0xa4bf80}),before=material.color.getHex();assert.equal(m.applyMeadowPatch(material),false);assert.equal(material.color.getHex(),before);assert.equal(closed,created);const oldCalls=calls;assert.equal(await m.prepareMeadowPatch(),false);assert.equal(calls,oldCalls);}finally{globalThis.createImageBitmap=oldBitmap;globalThis.fetch=oldFetch;}
});
