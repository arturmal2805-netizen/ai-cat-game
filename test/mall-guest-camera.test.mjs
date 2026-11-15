import test from 'node:test';
import assert from 'node:assert/strict';
import * as T from 'three';
import {createChichiCamera} from '../public/chichi-camera.js';

test('Mall visitor view keeps a low world-space angle through head poses and phone resize',()=>{
 const scene=new T.Scene(),head=new T.Object3D();head.position.set(-490, -154.6, 580);head.scale.setScalar(.63);scene.add(head);
 const camera=new T.PerspectiveCamera(40,390/844,.15,1200),look=new T.Vector3(),profile={targetDrop:.28,distanceScale:1.6,downAngle:Math.PI/12};
 const control=createChichiCamera(camera,head,{reduced:true,getViewProfile:()=>profile});control.setEnabled(true,look);
 for(const aspect of [390/844,844/390,1440/900])for(const pitch of [-.8,0,.8]){
  camera.aspect=aspect;camera.updateProjectionMatrix();head.rotation.set(pitch,.7,.15);control.update(1,look);
  const target=control.facePoint(new T.Vector3());target.y-=profile.targetDrop*.63;
  const delta=camera.position.clone().sub(target),angle=Math.atan2(delta.y,Math.hypot(delta.x,delta.z));assert.ok(Math.abs(angle-Math.PI/12)<1e-9);
  camera.updateMatrixWorld(true);const projected=target.clone().project(camera);assert.ok(Math.abs(projected.x)<1e-8&&Math.abs(projected.y)<1e-8);
 }
});

import {mallCameraRayClear,mallGuestCameraEye} from '../public/mall-guest-camera.js';
test('a real sofa back selects a low side view, while free space above a low table stays clear',()=>{
 const target={x:0,y:1.8,z:0},desired={x:0,y:2.8,z:4},wall={x:0,z:2,hx:.7,hz:.15,c:1,s:0,minY:.6,maxY:3};
 assert.equal(mallCameraRayClear(target,desired,[wall]),false);
 const eye=mallGuestCameraEye(target,desired,[wall]);assert.ok(eye);assert.ok(mallCameraRayClear(target,eye,[wall]));
 const angle=Math.atan2(eye.y-target.y,Math.hypot(eye.x-target.x,eye.z-target.z));assert.ok(Math.abs(angle-Math.atan2(1,4))<1e-9);
 assert.equal(mallCameraRayClear(target,desired,[{...wall,maxY:.8}]),true,'camera can see over an actual low table');
 assert.equal(mallCameraRayClear(target,desired,[{...wall,c:Math.SQRT1_2,s:Math.SQRT1_2}]),false,'rotated furniture uses its real axes');
 assert.equal(mallGuestCameraEye(target,desired,[wall],()=>false),null,'no view is invented outside the building');
});

test('a temporarily blocked visitor keeps the last free eye instead of entering furniture',()=>{
 const camera=new T.PerspectiveCamera(40,1,.15,1200),head=new T.Object3D(),look=new T.Vector3();let clear=true;
 const control=createChichiCamera(camera,head,{getViewProfile:()=>({targetDrop:.2,distanceScale:1.6,downAngle:.25}),resolveEye:()=>clear});control.setEnabled(true,look);control.update(1,look);const free=camera.position.clone();
 head.position.x=1;clear=false;camera.position.set(100,100,100);control.update(1,look);assert.ok(camera.position.equals(free));
 const direction=camera.getWorldDirection(new T.Vector3());control.setEnabled(false,look);control.update(0,look);
 assert.ok(camera.getWorldDirection(new T.Vector3()).distanceTo(direction)<1e-9,'releasing an occluded view starts from its actual last aim');
});

import {mallGuestCameraInside} from '../public/mall-guest-camera.js';
test('guest camera containment uses the real pavilion glass and its own floor, not the wider roof',()=>{
 assert.equal(mallGuestCameraInside(2,{x:-150,y:2,z:45-65}),true);
 assert.equal(mallGuestCameraInside(2,{x:-169,y:2,z:45-65}),false);
 assert.equal(mallGuestCameraInside(3,{x:-150,y:2,z:45-65}),false);
 assert.equal(mallGuestCameraInside(1,{x:0,y:9,z:0}),false);
});
