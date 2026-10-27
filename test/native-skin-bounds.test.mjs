import test from 'node:test';import assert from 'node:assert/strict';import * as THREE from 'three';
import{createCat,animateCat,setCatMood,disposeCat}from'../public/cat-model.js';
import{cacheNativeSkinBounds}from'../public/native-skin-bounds.js';

test('cached native bounds retain the exact sphere for every approved hero pose and transform, without per-vertex bone matrix products',t=>{
 const cat=createCat('happy'),meshes=[];cat.traverse(m=>{if(m.isSkinnedMesh)meshes.push(m);});assert.ok(meshes.length>0);
 const native=THREE.SkinnedMesh.prototype.computeBoundingSphere,multiply=THREE.Matrix4.prototype.multiplyMatrices;
 for(const [mood,time,walking]of[['happy',3,false],['sleep',6,false],['crazy hungry',12,true],['happy',15,true]]){
  setCatMood(cat,mood,{immediate:true});animateCat(cat,time,walking);cat.position.set(8,2,-3);cat.rotation.set(.15,.8,-.1);cat.scale.set(1.3,.9,1.1);cat.updateWorldMatrix(true,true);
  const expected=new Map();let before=0,after=0;
  try{
   THREE.Matrix4.prototype.multiplyMatrices=function(...args){before++;return multiply.apply(this,args);};
   for(const mesh of meshes){mesh.boundingSphere=null;native.call(mesh);expected.set(mesh,mesh.boundingSphere.clone());}
   cacheNativeSkinBounds(cat);
   THREE.Matrix4.prototype.multiplyMatrices=function(...args){after++;return multiply.apply(this,args);};
   for(const mesh of meshes){mesh.boundingSphere=null;mesh.computeBoundingSphere();assert.deepEqual(mesh.boundingSphere,expected.get(mesh));assert.equal(Object.hasOwn(mesh,'applyBoneTransform'),false);}
  }finally{THREE.Matrix4.prototype.multiplyMatrices=multiply;}
  assert.ok(after<before/20,`${mood}: ${before} -> ${after} bone products`);
  t.diagnostic(`${mood}: ${before} -> ${after} bone matrix products; exact native sphere retained.`);
 }
 disposeCat(cat);
});

test('custom vertex/skin callbacks retain their native path, and temporary overrides restore on exceptions',()=>{
 const cat=createCat('happy');cacheNativeSkinBounds(cat);let mesh;cat.traverse(m=>{if(m.isSkinnedMesh&&!mesh)mesh=m;});
 const custom=function(){throw Error('custom skin failure');};mesh.applyBoneTransform=custom;
 assert.throws(()=>mesh.computeBoundingSphere(),/custom skin failure/);assert.equal(mesh.applyBoneTransform,custom);
 delete mesh.applyBoneTransform;
 const attribute=mesh.geometry.attributes.position,read=attribute.getX;attribute.getX=()=>{throw Error('native vertex read failed');};
 assert.throws(()=>mesh.computeBoundingSphere(),/native vertex read failed/);
 assert.equal(Object.hasOwn(mesh,'applyBoneTransform'),false);attribute.getX=read;disposeCat(cat);
});
