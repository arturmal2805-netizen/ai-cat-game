import test from 'node:test';
import assert from 'node:assert/strict';
import * as T from 'three';
import {createSubmarineRuntime} from '../public/submarine-runtime.js';
import {createMallAirlockTransit,MALL_AIRLOCK} from '../public/mall-airlock-data.js';
import {createOceanSwimmer} from '../public/ocean-swimmer.js';
import {normalizeOceanExplorer} from '../public/ocean-explorer-state.js';
import {newGame,loadGame} from '../public/economy.js';
import {mergeSharedWorld} from '../shared-world.mjs';

function fixture(saved={x:-6,y:-20,z:92,yaw:Math.PI,active:true,mode:'cockpit'},mall=null){
 const prior={document:globalThis.document,window:globalThis.window};
 class Element extends EventTarget {onclick=null;setAttribute(){}style={};dataset={};hidden=false;disabled=false;textContent='';map=new Map();setPointerCapture(){}getBoundingClientRect(){return {left:0,top:0,width:400,height:600,bottom:600};}append(e){this.child=e;}remove(){}querySelector(s){if(!this.map.has(s))this.map.set(s,new Element());return this.map.get(s);}querySelectorAll(s){return s==='button'?[]:['KeyW','KeyS','KeyA','KeyD','Space','ShiftLeft'].map(k=>{const e=this.querySelector(k);e.dataset.subKey=k;return e;});}}
 globalThis.document={createElement:()=>new Element(),querySelector:()=>null};globalThis.window=new EventTarget();
 const scene=new T.Scene(),actor=new T.Group(),model=new T.Group(),head=new T.Group();head.position.y=1.4;model.add(head);model.userData={head,body:{scale:{x:.5}}};actor.add(model);scene.add(actor);
 const camera=new T.PerspectiveCamera(40,1,.5,1200),look=new T.Vector3(),focusCalls=[];let focused='autumn';
 const game={unlocked:['moon','autumn'],mosasaurSubmarine:saved};
 const canvas=new Element(),container=new Element();
 const runtime=createSubmarineRuntime({scene,container,canvas,camera,look,actor,getModel:()=>model,getMall:()=>mall,getIsland:()=>({userData:{detail:{visible:true},ocean:{sea:{userData:{disturb(){}}}}}}),getGame:()=>game,getFocused:()=>focused,cancelHero(){},approachDock:()=>true,focus:(...a)=>focusCalls.push(a)});
 const tick=(n=1)=>{for(let i=0;i<n;i++)runtime.update(.1,i/10);};tick();
 const key=(code,down)=>{const e=new Event(down?'keydown':'keyup',{cancelable:true});Object.defineProperty(e,'code',{value:code});window.dispatchEvent(e);};
 return {runtime,actor,camera,canvas,panel:container.child,look,focusCalls,tick,key,setFocused:v=>focused=v,dispose(){runtime.dispose();globalThis.document=prior.document;globalThis.window=prior.window;}};
}

test('underwater exit, third-person camera-relative swimming axes, dive, reboard and release use actual runtime',()=>{
 const f=fixture();try{
  assert.equal(f.runtime.exit(),true);assert.equal(f.runtime.phase,'swimming');assert.ok(f.runtime.explorer.y< -10);
  f.runtime.updateCamera(.1);assert.equal(f.camera.near,.12);assert.equal(f.camera.fov,60);
  const before={...f.runtime.explorer};f.key('KeyW',true);f.key('KeyA',true);f.tick(5);f.key('KeyW',false);f.key('KeyA',false);
  assert.ok(f.runtime.explorer.z<before.z-1);assert.ok(f.runtime.explorer.x<before.x-1);
  const depth=f.runtime.explorer.y;f.key('ArrowDown',true);f.tick(5);f.key('ArrowDown',false);assert.ok(f.runtime.explorer.y<depth-2);
  f.runtime.releaseControl();f.camera.position.set(111,222,333);assert.equal(f.runtime.updateCamera(.1),false);assert.deepEqual(f.camera.position.toArray(),[111,222,333]);assert.equal(f.camera.near,.5);
 }finally{f.dispose();}
 const again=fixture();try{
  assert.ok(again.runtime.exit());assert.ok(again.runtime.enter());again.tick(31);assert.equal(again.runtime.phase,'piloting');assert.equal(again.runtime.snapshot().active,true);
  again.runtime.exit();again.runtime.enter();assert.equal(again.runtime.phase,'boarding');
  again.runtime.releaseControl();assert.equal(again.runtime.phase,'boarding','release during remote reboarding must finish boarding before navigating home');again.tick(1800);assert.equal(again.runtime.phase,'docked');assert.equal(again.runtime.active,false);assert.equal(again.focusCalls.length,0,'autopilot must not steal the camera at arrival');
  assert.ok(again.runtime.enter());again.tick(31);again.key('ArrowDown',true);again.tick(30);again.key('ArrowDown',false);assert.ok(again.runtime.exit());assert.equal(again.runtime.snapshot().explorer.returning,false,'a new trip must not inherit the previous automatic return');assert.equal(again.runtime.controlled,true);
 }finally{again.dispose();}
});

test('swimmer and released pilot restore without resetting wallets, inventory or camera ownership',()=>{
 const f=fixture();let save;try{f.runtime.exit();save=f.runtime.snapshot();}finally{f.dispose();}
 const now=Date.UTC(2026,10,14),initial=newGame(now),g=loadGame({getItem:k=>k==='chichi-world-v2'?JSON.stringify(initial):null},now,{advance:false});g.unlocked.push('autumn');g.mosasaurSubmarine=save;
 const restored=loadGame({getItem:k=>k==='chichi-world-v2'?JSON.stringify(g):null},now,{advance:false});
 assert.deepEqual(restored.mosasaurSubmarine.explorer,save.explorer);assert.equal(restored.coins,g.coins);assert.deepEqual(restored.inventory,g.inventory);assert.deepEqual(restored.placements,g.placements);
 const cached=structuredClone(g);delete cached.mosasaurSubmarine;assert.deepEqual(mergeSharedWorld(g,g,cached).mosasaurSubmarine,g.mosasaurSubmarine);
 const legacy=structuredClone(g);delete legacy.mosasaurSubmarine.explorer;delete legacy.mosasaurSubmarine.explorerVersion;assert.deepEqual(mergeSharedWorld(g,g,legacy).mosasaurSubmarine,g.mosasaurSubmarine);legacy.mosasaurSubmarine.x+=3;assert.throws(()=>mergeSharedWorld(g,g,legacy));
 const oldBase=structuredClone(g);delete oldBase.mosasaurSubmarine.explorer;delete oldBase.mosasaurSubmarine.explorerVersion;const oldClient=structuredClone(oldBase);oldClient.coins+=5;assert.deepEqual(mergeSharedWorld(oldBase,g,oldClient).mosasaurSubmarine,g.mosasaurSubmarine);oldClient.mosasaurSubmarine.x+=3;assert.throws(()=>mergeSharedWorld(oldBase,g,oldClient));
 const finished=structuredClone(g);finished.mosasaurSubmarine.explorer=null;assert.equal(mergeSharedWorld(g,g,finished).mosasaurSubmarine.explorer,null);
 const resumed=fixture(restored.mosasaurSubmarine);try{assert.equal(resumed.runtime.phase,'swimming');assert.deepEqual(resumed.runtime.snapshot().explorer,save.explorer);}finally{resumed.dispose();}
 const released=fixture();let returnSave;try{released.runtime.releaseControl();returnSave=released.runtime.snapshot();}finally{released.dispose();}
 const auto=fixture(returnSave);try{assert.equal(auto.runtime.controlled,false);assert.equal(auto.runtime.updateCamera(.1),false);auto.tick(1800);assert.equal(auto.runtime.active,false);}finally{auto.dispose();}
});

test('pressure airlock never opens both doors; entry and exit reach their real endpoints',()=>{
 for(const entering of [true,false]){
  const trip=createMallAirlockTransit(entering);let f;
  for(let i=0;i<1000;i++){f=trip.step(.037);assert.ok(f.outer<.0001||f.inner<.0001);if(f.done)break;}
  assert.ok(f.done);assert.deepEqual(f.position,entering?MALL_AIRLOCK.inside:MALL_AIRLOCK.outside);assert.equal(f.outer,0);assert.equal(f.inner,0);
 }
});

test('swimmer swept collision rejects sealed Mall shell and malformed explorer records',()=>{
 const s=createOceanSwimmer({x:-43,y:-162.5,z:124,yaw:Math.PI},{radius:.6});
 for(let i=0;i<60;i++)s.step(.1,{forward:1});assert.ok(s.state.z>119.5);
 assert.throws(()=>normalizeOceanExplorer({mode:'mall',x:0,y:NaN,z:0,yaw:0,floor:1}));
 assert.throws(()=>normalizeOceanExplorer({mode:'mall',x:0,y:-165,z:65,yaw:0,floor:9}));
});


test('manual swimming stops on release, blur and entry into text editing',()=>{
 const f=fixture();try{
  f.runtime.exit();
  f.key('KeyW',true);f.tick(2);f.key('KeyW',false);
  const released={...f.runtime.explorer};f.tick(2);assert.equal(f.runtime.explorer.z,released.z);
  f.key('KeyW',true);window.dispatchEvent(new Event('blur'));const blurred={...f.runtime.explorer};f.tick(2);assert.equal(f.runtime.explorer.z,blurred.z);
  f.key('KeyW',true);const event=new Event('focusin');Object.defineProperty(event,'target',{value:{tagName:'INPUT',isContentEditable:false}});window.dispatchEvent(event);
  const editing={...f.runtime.explorer};f.tick(2);assert.equal(f.runtime.explorer.z,editing.z,'held movement must clear when a text field receives focus');
 }finally{f.dispose();}
});


test('look orbit leaves a stationary cat facing forward and releasing a look drag preserves a held movement key',()=>{
 const f=fixture();try{
  f.runtime.exit();f.runtime.updateCamera(.1);const yaw=f.runtime.explorer.yaw,view=f.runtime.view.orbitYaw;
  const pointer=(type,x)=>{const event=new Event(type,{cancelable:true});for(const [k,v]of Object.entries({pointerId:1,clientX:x,clientY:0}))Object.defineProperty(event,k,{value:v});f.canvas.dispatchEvent(event);};
  pointer('pointerdown',0);pointer('pointermove',100);pointer('pointerup',100);f.tick();assert.equal(f.runtime.explorer.yaw,yaw);assert.ok(Math.abs(f.runtime.view.orbitYaw-view)>.3);
  f.runtime.updateCamera(.1);const a={...f.runtime.explorer},heading=f.runtime.view.yaw;f.key('KeyW',true);pointer('pointerdown',100);pointer('pointerup',100);f.tick(2);f.key('KeyW',false);const b=f.runtime.explorer;assert.ok((b.x-a.x)*Math.sin(heading)+(b.z-a.z)*Math.cos(heading)>1,'camera pointerup must not clear the keyboard');
 }finally{f.dispose();}
});


test('released explorer cannot cancel a newly selected mall overview or visitor camera',()=>{
 const floors=[],mall={inspection:false,root:null,ensure:async()=>null,walkPath:async()=>null,walkActors:()=>[],setExplorerFloor:f=>{floors.push(f);if(mall.inspection)mall.inspection=false;}};
 const f=fixture({x:-6,y:-20,z:92,yaw:0,active:false,mode:'chase',explorer:{mode:'mall',x:-43,y:-164.82,z:105,yaw:Math.PI,floor:1,returning:false}},mall);
 try{assert.deepEqual(floors,[1]);f.runtime.releaseControl();mall.inspection=true;f.tick();assert.equal(mall.inspection,true);assert.deepEqual(floors,[1]);assert.equal(f.runtime.updateCamera(.1),false);}finally{f.dispose();}
});


test('hidden canvas gestures move/look independently, dive with two fingers and stop on release',()=>{
 const f=fixture();try{f.runtime.exit();f.runtime.updateCamera(.1);
  const pointer=(type,id,x,y)=>{const event=new Event(type,{cancelable:true});for(const [k,v]of Object.entries({pointerId:id,pointerType:'touch',clientX:x,clientY:y}))Object.defineProperty(event,k,{value:v});f.canvas.dispatchEvent(event);};
  pointer('pointerdown',1,80,300);pointer('pointermove',1,80,252);const a={...f.runtime.explorer};f.tick(2);assert.ok(Math.hypot(f.runtime.explorer.x-a.x,f.runtime.explorer.z-a.z)>1);
  pointer('pointerdown',2,300,300);pointer('pointermove',2,340,300);pointer('pointerup',2,340,300);const held={...f.runtime.explorer};f.tick(2);assert.ok(Math.hypot(f.runtime.explorer.x-held.x,f.runtime.explorer.z-held.z)>1);
  pointer('pointerup',1,80,252);const stop={...f.runtime.explorer};f.tick(2);assert.equal(f.runtime.explorer.x,stop.x);assert.equal(f.runtime.explorer.z,stop.z);
  pointer('pointerdown',3,80,300);pointer('pointerdown',4,130,300);pointer('pointermove',3,80,252);pointer('pointermove',4,130,252);const y=f.runtime.explorer.y;f.tick(2);assert.ok(f.runtime.explorer.y>y+1);
  pointer('pointerup',4,130,252);const level=f.runtime.explorer.y;f.tick(2);assert.equal(f.runtime.explorer.y,level);pointer('pointerup',3,80,252);
 }finally{f.dispose();}
});


test('E chooses the real boat or door in view when both are within reach',async()=>{
 const mall={ensure:async()=>true};
 for(const [yaw,expected]of [[0,'boarding'],[Math.PI,'airlock']]){
  const f=fixture({x:-43,y:-162.5,z:124.5,yaw,mode:'chase',active:false,explorer:{...MALL_AIRLOCK.outside,mode:'swimming',yaw,returning:false}},mall);
  try{f.key('KeyE',true);await Promise.resolve();assert.equal(f.runtime.phase,expected);}finally{f.dispose();}
 }
});

test('phone buttons allow independent held movement and depth; cancellation and blur clear only their owned inputs',()=>{
 const f=fixture();try{
  f.runtime.exit();const forward=f.panel.querySelectorAll('[data-sub-key]')[0],up=f.panel.querySelectorAll('[data-sub-key]')[4];
  const pointer=(el,type,id)=>{const e=new Event(type,{cancelable:true});Object.defineProperty(e,'pointerId',{value:id});el.dispatchEvent(e);};
  const a={...f.runtime.explorer};pointer(forward,'pointerdown',11);pointer(up,'pointerdown',12);f.tick(2);assert.ok(f.runtime.explorer.z<a.z-1);assert.ok(f.runtime.explorer.y>a.y+1);
  pointer(up,'pointercancel',12);const b={...f.runtime.explorer};f.tick(2);assert.equal(f.runtime.explorer.y,b.y);assert.ok(f.runtime.explorer.z<b.z-1);
  window.dispatchEvent(new Event('blur'));const c={...f.runtime.explorer};f.tick(2);assert.equal(f.runtime.explorer.z,c.z);assert.equal(f.runtime.explorer.y,c.y);
 }finally{f.dispose();}
});


test('phone control anchor tracks the visible viewport when the game canvas extends below it',()=>{
 const f=fixture();try{
  window.innerHeight=500;window.dispatchEvent(new Event('resize'));assert.equal(f.panel.style.bottom,'100px');
  window.visualViewport=Object.assign(new EventTarget(),{height:400,offsetTop:20});window.dispatchEvent(new Event('scroll'));assert.equal(f.panel.style.bottom,'180px');
  Object.assign(window.visualViewport,{height:700,offsetTop:0});window.dispatchEvent(new Event('resize'));assert.equal(f.panel.style.bottom,'0px');
 }finally{f.dispose();}
});
