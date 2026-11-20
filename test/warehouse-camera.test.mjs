import test from'node:test';import assert from'node:assert/strict';import * as T from'three';import{warehouseExteriorSteps}from'../public/warehouse-exterior.js';import{runSceneSteps}from'../public/scene-tasks.js';import{warehouseCameraView}from'../public/warehouse-camera.js';import{expansionBedY}from'../public/mosasaur-expansion.js';
test('Warehouse button camera fits the real shell in portrait/landscape and remains in open water above the physical floor',()=>{
 const model=runSceneSteps(warehouseExteriorSteps());model.updateMatrixWorld(true);const bounds=new T.Box3().setFromObject(model,true);
 for(const aspect of [320/740,390/700,1,844/390,16/9]){const v=warehouseCameraView(bounds,40,aspect),c=new T.PerspectiveCamera(40,aspect,.5,10000);c.position.copy(v.target).add(new T.Vector3(Math.sin(v.azimuth)*Math.cos(v.elevation),Math.sin(v.elevation),Math.cos(v.azimuth)*Math.cos(v.elevation)).multiplyScalar(v.distance));c.lookAt(v.target);c.updateMatrixWorld();assert(c.position.y<0);assert(c.position.y>expansionBedY(c.position.x,c.position.z)+2);
  for(let i=0;i<8;i++){const p=new T.Vector3(i&1?bounds.max.x:bounds.min.x,i&2?bounds.max.y:bounds.min.y,i&4?bounds.max.z:bounds.min.z).project(c);assert(Math.abs(p.x)<.9&&Math.abs(p.y)<.9&&p.z<1,JSON.stringify({aspect,p}));}
 }
});
