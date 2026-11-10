import {test} from 'node:test';import assert from 'node:assert/strict';import * as T from 'three';
import {createSubmarineCameraFollower} from '../public/submarine-camera.js';
test('the submarine follow view converges even while the ordinary world orbit runs before it every frame',()=>{
 const camera=new T.PerspectiveCamera(40,.65,.5,1200),look=new T.Vector3(),follow=createSubmarineCameraFollower(camera,look),eye=new T.Vector3(-6,-7,83),aim=new T.Vector3(-6,-10,92);
 for(let i=0;i<180;i++){camera.position.set(60,85,110);look.set(0,0,10);follow.update(1/60,eye,aim);}
 assert.ok(camera.position.distanceTo(eye)<1e-7);assert.ok(look.distanceTo(aim)<1e-7);
 assert.ok(camera.getWorldDirection(new T.Vector3()).dot(aim.clone().sub(eye).normalize())>.999999);
 const before=camera.position.clone();follow.update(1/60,new T.Vector3(-6,-9,93),new T.Vector3(-6,-9,101));assert.ok(camera.position.distanceTo(before)<2,'camera changes remain eased');
 follow.reset();camera.position.set(12,20,30);look.set(0,0,0);follow.update(0,eye,aim);assert.deepEqual(camera.position.toArray(),[12,20,30]);
});
