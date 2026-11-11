import {test} from 'node:test';
import assert from 'node:assert/strict';
import * as T from 'three';
import {mallConveyorSteps} from '../public/mall-conveyor.js';
import {runSceneSteps} from '../public/scene-tasks.js';
test('sushi colour/shadow motion shares one clock; exact native picking restores fixed GPU buffers',()=>{
 const clock={value:0},root=runSceneSteps(mallConveyorSteps(clock));root.updateMatrixWorld(true);
 assert.ok(root.children.length);const arrays=root.children.map(m=>m.instanceMatrix.array),versions=root.children.map(m=>m.instanceMatrix.version);
 for(const time of [0,1,7,14]){
  clock.value=time;const a=time*.28,x=Math.cos(a)*2.2,z=Math.sin(a)*.95,ray=new T.Raycaster(new T.Vector3(x,4,z),new T.Vector3(0,-1,0));
  assert.ok(ray.intersectObject(root,true).some(h=>h.instanceId===0),'dish at '+time);
  for(const [i,mesh]of root.children.entries()){
   assert.equal(mesh.instanceMatrix.array,arrays[i]);assert.equal(mesh.instanceMatrix.version,versions[i]);
   assert.deepEqual(Array.from(mesh.instanceMatrix.array.slice(12,15)),[0,0,0]);
   for(const m of [mesh.material,mesh.customDepthMaterial]){const shader={uniforms:{},vertexShader:'#include <begin_vertex>'};m.onBeforeCompile(shader);assert.equal(shader.uniforms.uMallBeltTime,clock);assert.match(shader.vertexShader,/transformed\+=vec3/);}
  }
 }
});
