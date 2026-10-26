import test from "node:test";
import assert from "node:assert/strict";
import * as THREE from "three";
import { opaqueSceneryPaint, updateSceneryBlend } from "../public/scenery-blending.js";
import { createSceneryModel as sceneryModel, fadeScenery, disposeScenery } from "../public/scenery-models.js";

test("opaque scenery accepts only authored alpha-one texels and native opaque shader inputs",()=>{
  const p=new THREE.MeshStandardMaterial(),map=new THREE.DataTexture(new Uint8Array([120,40,30,255]),1,1);
  assert.equal(opaqueSceneryPaint(p),true);
  p.map=map;assert.equal(opaqueSceneryPaint(p),false);
  map.userData.sharedScenery=true;assert.equal(opaqueSceneryPaint(p),true);
  map.image.data[3]=200;map.needsUpdate=true;assert.equal(opaqueSceneryPaint(p),false);
  p.map=null;
  for(const [key,value] of [["opacity",.9],["alphaMap",map],["alphaTest",.1],["alphaHash",true],["alphaToCoverage",true],["blending",THREE.AdditiveBlending],["onBeforeCompile",()=>{}]]){
    const original=p[key];p[key]=value;assert.equal(opaqueSceneryPaint(p),false,key);p[key]=original;
  }
  assert.equal(opaqueSceneryPaint(new THREE.ShaderMaterial()),false);
});

test("fade restores normal blending on a private paint and returns to its original shared paint",()=>{
  const a=sceneryModel({id:"blend-a",type:"scenery-boulder",originBiome:"moon",x:0,z:0}),
    b=sceneryModel({id:"blend-b",type:"scenery-boulder",originBiome:"moon",x:2,z:0}),
    meshes=g=>{const result=[];g.traverse(o=>{if(o.isMesh)result.push(o);});return result;},
    am=meshes(a),bm=meshes(b),shared=am.map(o=>o.material);
  assert.ok(am.some(o=>o.material.userData.opaqueSceneryBlend));
  for(const o of am)if(o.material.userData.opaqueSceneryBlend){assert.equal(o.material.blending,THREE.NoBlending);assert.equal(o.material.transparent,true);}
  for(const opacity of [.999,.8,.27,0]){
    fadeScenery(a,opacity);
    for(let i=0;i<am.length;i++){
      assert.notEqual(am[i].material,shared[i]);assert.equal(am[i].material.blending,THREE.NormalBlending);
      assert.equal(bm[i].material,shared[i]);assert.equal(bm[i].material.opacity,1);
    }
  }
  fadeScenery(a,1);
  for(let i=0;i<am.length;i++){assert.equal(am[i].material,shared[i]);if(shared[i].userData.opaqueSceneryBlend)assert.equal(shared[i].blending,THREE.NoBlending);}
  const p=new THREE.MeshBasicMaterial({transparent:true,opacity:.3});updateSceneryBlend(p,1);assert.equal(p.blending,THREE.NormalBlending);
  disposeScenery(a);disposeScenery(b);
});
