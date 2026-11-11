import {test} from 'node:test';
import assert from 'node:assert/strict';
import * as T from 'three';
import {submarineControlInput,submarineAirborne} from '../public/submarine-controls.js';
import {createSubmarinePhysics,SUBMARINE_MAX_SPEED,SUBMARINE_BOOST_SPEED} from '../public/submarine-physics.js';
import {createSubmarineCameraFollower} from '../public/submarine-camera.js';
const initial={x:0,y:-5,z:-80,yaw:0,active:true};
test('A/D point to the visible left/right in the native +Z chase view; air W/S become opposing somersaults',()=>{
 const camera=new T.PerspectiveCamera(40,1,.1,100);camera.position.set(0,3.4,-9);camera.lookAt(0,0,0);camera.updateMatrixWorld();
 for(const [key,side]of [['KeyA',-1],['KeyD',1]]){const p=createSubmarinePhysics(initial),input=submarineControlInput(new Set([key]),p.state);for(let i=0;i<30;i++)p.step(1/60,input);const nose=new T.Vector3(Math.sin(p.state.yaw),0,Math.cos(p.state.yaw)).project(camera);assert.ok(nose.x*side>0,key);}
 for(const [key,sign]of [['KeyW',1],['KeyS',-1]]){const p=createSubmarinePhysics({...initial,y:30});let input=submarineControlInput(new Set([key]),p.state);assert.equal(input.forward,0);assert.equal(input.flip,sign);for(let i=0;i<90;i++)p.step(1/60,input);assert.ok(p.state.pitch*sign>Math.PI*2);}
 const water=submarineControlInput(new Set(['KeyW']),initial);assert.equal(water.forward,1);assert.equal(water.flip,0);
});
test('maximum forward speed is 50% higher and fourfold breach height retains real gravity',()=>{
 assert.equal(SUBMARINE_MAX_SPEED,24*1.5);assert.equal(SUBMARINE_BOOST_SPEED,26.6);
 const p=createSubmarinePhysics(initial);for(let i=0;i<240;i++)p.step(1/60,{forward:1});assert.ok(p.state.speed>35.9);
 // Immutable d5821c8 fixture: same dock-depth Space hold until first breach.
 const baseline=[8.227593023563617,8.221992628320955];
 for(const [index,dt]of [1/60,1/120].entries()){const boat=createSubmarinePhysics({x:0,y:-.85,z:0,yaw:0,active:true});let peak=boat.state.y,air=false;
  for(let t=0;t<8;t+=dt){boat.step(dt,air?{}:{boost:true,vertical:1});peak=Math.max(peak,boat.state.y);if(submarineAirborne(boat.state))air=true;}
  const height=peak-.155;assert.ok(height/baseline[index]>3.95&&height/baseline[index]<4.05,'breach height ratio '+height/baseline[index]);
 }
 const flight=createSubmarinePhysics({...initial,y:30});flight.state.vertical=8;const before=flight.state.vertical;flight.step(.1,{});assert.ok(Math.abs(flight.state.vertical-(before-9.81*.1))<1e-9);
});
test('landing eases the hull upright and a saved midair turn restores at height without stranding the pilot',()=>{
 const p=createSubmarinePhysics({...initial,y:30});for(let i=0;i<90;i++)p.step(1/60,{flip:1});const saved=p.snapshot(),restored=createSubmarinePhysics(saved);
 assert.equal(restored.state.active,true);assert.equal(restored.state.y,saved.y);assert.ok(Math.abs(Math.atan2(Math.sin(restored.state.pitch-saved.pitch),Math.cos(restored.state.pitch-saved.pitch)))<1e-9);
 for(let i=0;i<600;i++)restored.step(1/60,{});assert.ok(!submarineAirborne(restored.state));assert.ok(Math.abs(restored.state.pitch)<1e-7);assert.ok(Math.abs(restored.state.flipSpeed)<1e-9);
});
test('velocity-aware camera keeps a fast rising boat centred while the ordinary world orbit still runs',()=>{
 const camera=new T.PerspectiveCamera(40,.65,.5,1200),look=new T.Vector3(),f=createSubmarineCameraFollower(camera,look),velocity=new T.Vector3(10,26,0),start=new T.Vector3(-6,3.4,-9),aim=new T.Vector3(-6,0,0);
 camera.position.copy(start);look.copy(aim);f.update(0,start,aim,velocity);
 for(let i=1;i<=120;i++){camera.position.set(80,90,100);look.set(0,0,0);f.update(1/60,start.clone().addScaledVector(velocity,i/60),aim.clone().addScaledVector(velocity,i/60),velocity);}
 assert.ok(camera.position.distanceTo(start.clone().addScaledVector(velocity,2))<1e-7);assert.ok(look.distanceTo(aim.clone().addScaledVector(velocity,2))<1e-7);
});
