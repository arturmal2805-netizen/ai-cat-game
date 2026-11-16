import test from 'node:test';import assert from 'node:assert/strict';import * as T from 'three';
import {installMeadowLod} from '../public/meadow-lod.js';
const roots=[new T.Vector3(-3,0,-3),new T.Vector3(3,0,-3),new T.Vector3(3,0,3),new T.Vector3(-3,0,3)];
function scene(){const lod=new T.LOD();for(const d of [0,16.3,50.3])lod.addLevel(new T.Group(),d);const control=installMeadowLod(lod,new T.Box3().setFromPoints(roots));return {lod,control,camera:new T.PerspectiveCamera()};}
test('every selected coarse or empty mesh is beyond the actual shader transition for all its roots',()=>{
 const {lod,camera}=scene();lod.position.set(275,.14,-25);lod.rotation.y=.7;lod.scale.set(1.3,.8,.9);lod.updateMatrixWorld(true);
 const actual=roots.map(v=>v.clone().applyMatrix4(lod.matrixWorld));let middle=0,empty=0;
 for(let x=240;x<=340;x+=2.7)for(let y=1;y<=60;y+=11)for(let z=-60;z<=30;z+=5.9){camera.position.set(x,y,z);camera.updateMatrixWorld(true);lod.update(camera);const level=lod.getCurrentLevel();assert.equal(lod.levels.filter(l=>l.object.visible).length,1);
  if(level===1){middle++;for(const root of actual)assert.ok(camera.position.distanceTo(root)>=12);}
  if(level===2){empty++;for(const root of actual)assert.ok(camera.position.distanceTo(root)>=46);}
 }assert.ok(middle>100&&empty>100);
});
test('root boxes release fully straightened geometry earlier than the loose spherical threshold',()=>{
 const {lod,control,camera}=scene();lod.updateMatrixWorld(true);camera.position.set(15.1,0,0);camera.updateMatrixWorld(true);lod.update(camera);assert.equal(lod.getCurrentLevel(),1);
 control.setEnabled(false);lod.update(camera);assert.equal(lod.getCurrentLevel(),0);control.setEnabled(true);lod.update(camera);assert.equal(lod.getCurrentLevel(),1);
 // Shader distance is in world metres, independent of a camera zoom setting.
 camera.zoom=.25;camera.position.set(5,0,0);camera.updateMatrixWorld(true);lod.update(camera);assert.equal(lod.getCurrentLevel(),0);
});
test('moving a parent invalidates the world root box, and complete collapse happens before removal',()=>{
 const {lod,camera}=scene(),parent=new T.Group();parent.add(lod);parent.updateMatrixWorld(true);camera.position.set(80,1,0);camera.updateMatrixWorld(true);lod.update(camera);assert.equal(lod.getCurrentLevel(),2);
 parent.position.x=80;parent.updateMatrixWorld(true);lod.update(camera);assert.equal(lod.getCurrentLevel(),0);
 camera.position.set(129.001,0,0);camera.updateMatrixWorld(true);lod.update(camera);assert.equal(lod.getCurrentLevel(),1);camera.position.x=129.01;camera.updateMatrixWorld(true);lod.update(camera);assert.equal(lod.getCurrentLevel(),2);
});
