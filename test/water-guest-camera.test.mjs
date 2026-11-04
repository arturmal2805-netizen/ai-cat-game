import {test} from 'node:test';
import assert from 'node:assert/strict';
import * as T from 'three';
import {createChichiCamera} from '../public/chichi-camera.js';
const make=(getViewLift=()=>0)=>{const camera=new T.PerspectiveCamera(48,.5,.1,100),head=new T.Object3D();head.position.set(0,.7,0);head.rotation.set(.6,.35,0);camera.position.set(2,3,5);const control=createChichiCamera(camera,head,{getViewLift});const look=new T.Vector3();control.setEnabled(true,look);return{camera,head,control,look};};
const settle=s=>{for(let i=0;i<120;i++)s.control.update(1/60,s.look);};
test('surf guest lift keeps the real expressive head framed above water and fades out without a camera jump',()=>{
 let lift=1.35;const a=make(()=>lift),ordinary=make();settle(a);settle(ordinary);
 assert.ok(ordinary.camera.position.y<0,'original forward-facing view enters the flume');assert.ok(a.camera.position.y>1.2,'surf view must stay above the water');
 const face=a.control.facePoint(new T.Vector3());a.camera.updateMatrixWorld(true);const projected=face.project(a.camera);assert.ok(Math.abs(projected.x)<1e-5&&Math.abs(projected.y)<1e-5);
 const before=a.camera.position.clone();lift=0;a.control.update(1/60,a.look);assert.ok(a.camera.position.distanceTo(before)<.2,'finishing the ride must ease the view down');settle(a);
 assert.ok(a.camera.position.distanceTo(ordinary.camera.position)<.001);assert.ok(a.camera.position.toArray().every(Number.isFinite));
});
test('all ordinary cat cameras retain their exact original orbit when no surf lift is requested',()=>{
 const a=make(),b=make(()=>0);for(let i=0;i<120;i++){a.control.update(1/60,a.look);b.control.update(1/60,b.look);assert.deepEqual(a.camera.position.toArray(),b.camera.position.toArray());}
 a.control.zoom(.2);b.control.zoom(.2);settle(a);settle(b);assert.deepEqual(a.camera.position.toArray(),b.camera.position.toArray());
});
