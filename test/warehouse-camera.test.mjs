import {islandCameraFar} from '../public/camera-views.js';
import {expandedOverview} from '../public/mosasaur-expansion-data.js';
import test from'node:test';import assert from'node:assert/strict';import * as T from'three';import{warehouseExteriorSteps}from'../public/warehouse-exterior.js';import{runSceneSteps}from'../public/scene-tasks.js';import{warehouseCameraView,warehouseCameraBounds}from'../public/warehouse-camera.js';import{expansionBedY}from'../public/mosasaur-expansion.js';
test('immutable Warehouse bounds retain exact transformed vertices without rescanning on repeated visits',()=>{
 const parent=new T.Group(),model=new T.Group(),mesh=new T.Mesh(new T.BoxGeometry(3,7,11));parent.add(model);model.add(mesh);parent.position.set(25,-90,40);parent.rotation.y=.73;model.scale.set(2,1.5,.5);mesh.rotation.set(.1,.2,.3);
 parent.updateMatrixWorld(true);const expected=new T.Box3().setFromObject(model,true);
 let reads=0;const native=mesh.getVertexPosition;mesh.getVertexPosition=function(...args){reads++;return native.apply(this,args);};
 assert(warehouseCameraBounds(model).equals(expected));assert(reads>0);reads=0;
 const returned=warehouseCameraBounds(model);returned.makeEmpty();assert(warehouseCameraBounds(model).equals(expected));assert.equal(reads,0);
 parent.position.x+=8;parent.updateMatrixWorld(true);const moved=warehouseCameraBounds(model);assert(reads>0);assert(moved.equals(new T.Box3().setFromObject(model,true)));
 const replacement=new T.Group();replacement.add(new T.Mesh(new T.BoxGeometry(1,2,3)));assert(warehouseCameraBounds(replacement).equals(new T.Box3().setFromObject(replacement,true)));
});
test('Warehouse button camera fits the real shell in portrait/landscape and shows the broadened shell without bank occlusion',()=>{
 const model=runSceneSteps(warehouseExteriorSteps());model.updateMatrixWorld(true);const bounds=new T.Box3().setFromObject(model,true);
 for(const aspect of [320/740,390/700,1,844/390,16/9]){const v=warehouseCameraView(bounds,40,aspect),c=new T.PerspectiveCamera(40,aspect,.5,islandCameraFar(v.distance,expandedOverview().radius));c.position.copy(v.target).add(new T.Vector3(Math.sin(v.azimuth)*Math.cos(v.elevation),Math.sin(v.elevation),Math.cos(v.azimuth)*Math.cos(v.elevation)).multiplyScalar(v.distance));c.lookAt(v.target);c.updateMatrixWorld();assert(c.position.y>0);assert(c.position.y>expansionBedY(c.position.x,c.position.z)+2);
  for(let i=0;i<8;i++){const p=new T.Vector3(i&1?bounds.max.x:bounds.min.x,i&2?bounds.max.y:bounds.min.y,i&4?bounds.max.z:bounds.min.z).project(c);assert(Math.abs(p.x)<.9&&Math.abs(p.y)<.9&&p.z<1,JSON.stringify({aspect,p}));}
 }
});

// Fitting a bounding box alone did not expose the buried lower silhouette.
test('the full lower Warehouse silhouette has a clear underwater sight line above the actual physical bed',()=>{
 const model=runSceneSteps(warehouseExteriorSteps()),bounds=new T.Box3().setFromObject(model,true);
 for(const aspect of [320/740,390/844,1100/800,16/9]){
  const v=warehouseCameraView(bounds,40,aspect),eye=v.target.clone().add(new T.Vector3(Math.sin(v.azimuth)*Math.cos(v.elevation),Math.sin(v.elevation),Math.cos(v.azimuth)*Math.cos(v.elevation)).multiplyScalar(v.distance));
  const nearBase=new T.Vector3(1540,-452.59,450);
  for(let i=0;i<=200;i++){const p=eye.clone().lerp(nearBase,i/200);assert(p.y>expansionBedY(p.x,p.z)+.1,'the floor must not mask the lower shell: '+JSON.stringify({aspect,p}));}
 }
});
