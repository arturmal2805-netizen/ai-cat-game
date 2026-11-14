import * as T from 'three';
import {submarineControlInput,submarineAirborne} from './submarine-controls.js';
import {createSubmarinePhysics,SUBMARINE_DOCK,SUBMARINE_BOARDING_POINT} from './submarine-physics.js';
import {createSubmarineModel} from './submarine-model.js';
import {createSubmarineReturn} from './submarine-return.js';
import {createSubmarineCameraFollower} from './submarine-camera.js';
import {createOceanSwimmer} from './ocean-swimmer.js';
import {normalizeOceanExplorer} from './ocean-explorer-state.js';
import {MALL_AIRLOCK as AIRLOCK,createMallAirlockTransit} from './mall-airlock-data.js';
import {stepMallWalker} from './mall-walker.js';
import {MALL_LAYOUT as MALL} from './mall-layout.js';
import {catNavigationRadius} from './cat-navigation-size.js';
import {byBiome} from './game-data.js';

export function createSubmarineRuntime({container,canvas,camera,look,actor,getModel,getIsland,getGame,getFocused,cancelHero,approachDock,canPilot=()=>true,scene,focus,getMall=()=>null,onError=()=>{}}){
 const physics=createSubmarinePhysics(getGame().mosasaurSubmarine),state=physics.state,biome=byBiome('autumn'),centre=new T.Vector3(biome.center[0],0,biome.center[1]);
 const anchor=new T.Group();anchor.position.copy(centre);scene.add(anchor);let boat=null,disposed=false;
 const saved=state.explorer;
 let phase=saved?.mode||(state.active?'piloting':'docked'),controlled=phase!=='docked'&&!saved?.returning&&!state.released,age=0,returning=false,returnRoute=null,boatReturning=!!state.returning,boatRoute=boatReturning?createSubmarineReturn(state):null;
 let swimmer=saved?createOceanSwimmer(saved,{radius:catNavigationRadius(getModel())}):null,returningExplorer=!!saved?.returning,swimReturn=swimmer&&returningExplorer?createSubmarineReturn(swimmer.state):null;
 if(phase==='piloting'&&!controlled){returning=true;returnRoute=createSubmarineReturn(state);}
 let transit=null,transitOrigin=null,pan=0,tilt=0,drag=null,viewDistance=9,lastHud='',lastWake=-Infinity,lastAirborne=null,lastFloor=null,route=[],routePending=false,routeRetry=0,restoreView=null;
 const start=new T.Vector3(),dockPoint=new T.Vector3(SUBMARINE_BOARDING_POINT.x,SUBMARINE_BOARDING_POINT.y,SUBMARINE_BOARDING_POINT.z).add(centre),aim=new T.Vector3(),velocity=new T.Vector3(),keys=new Set(),target=new T.Vector3(),eye=new T.Vector3(),q=new T.Quaternion(),cameraFollow=createSubmarineCameraFollower(camera,look),smooth=t=>t*t*(3-2*t);
 const panel=document.createElement('div');panel.className='submarine-panel';panel.style.cssText='position:absolute;right:14px;bottom:116px;z-index:12;max-width:310px;padding:10px;border-radius:18px;background:#173c57e8;color:#effcff;box-shadow:0 4px 24px #1235;font:600 13px system-ui;';
 panel.innerHTML='<div data-sub-readout></div><div style="display:flex;gap:6px;flex-wrap:wrap;margin-top:7px"><button data-sub-enter>🌊 Сісти в субмарину · E</button><button data-sub-resume>Керувати Чічі</button><button data-sub-camera>Камера · C</button><button data-sub-return>До причалу</button><button data-sub-exit>Вийти · E</button><button data-sub-mall>Увійти до ТРЦ · E</button></div><div data-sub-controls style="display:flex;gap:5px;flex-wrap:wrap;margin-top:8px"><button data-sub-key="KeyW">▲ Вперед</button><button data-sub-key="KeyS">▼ Назад</button><button data-sub-key="KeyA">←</button><button data-sub-key="KeyD">→</button><button data-sub-key="Space">↑ Підйом</button><button data-sub-key="ShiftLeft">↓ Глибше</button></div><small style="display:block;margin-top:6px;opacity:.8">WASD · Space ↑ · Shift / ↓ глибше · у польоті W/S — сальто · потягніть екран для огляду · E вхід/вихід</small>';
 for(const b of panel.querySelectorAll('button'))b.style.cssText='border:1px solid #8cd9e66b;border-radius:9px;background:#376980;color:white;padding:8px;font:inherit;touch-action:none;cursor:pointer;';
 panel.hidden=true;container.append(panel);
 const readout=panel.querySelector('[data-sub-readout]'),enterButton=panel.querySelector('[data-sub-enter]'),resumeButton=panel.querySelector('[data-sub-resume]'),cameraButton=panel.querySelector('[data-sub-camera]'),returnButton=panel.querySelector('[data-sub-return]'),exitButton=panel.querySelector('[data-sub-exit]'),mallButton=panel.querySelector('[data-sub-mall]'),controls=panel.querySelector('[data-sub-controls]'),forwardButton=panel.querySelector('[data-sub-key="KeyW"]'),reverseButton=panel.querySelector('[data-sub-key="KeyS"]');
 const focused=()=>getFocused()==='autumn'&&getGame().unlocked.includes('autumn');
 const busy=()=>phase!=='docked';
 const exploring=()=>phase==='swimming'||phase==='mall'||phase==='airlock';
 const localPosition=()=>({x:actor.position.x-centre.x,y:actor.position.y,z:actor.position.z-centre.z});
 const distance=(a,b)=>Math.hypot(a.x-b.x,a.y-b.y,a.z-b.z);
 function clear(){keys.clear();drag=null;}
 function resume(){if(!busy()||!focused()||!canPilot())return false;controlled=true;returning=false;returningExplorer=false;route=[];pan=tilt=0;cameraFollow.reset();return true;}
 function beginBoarding(){returningExplorer=false;swimReturn=null;route=[];start.copy(actor.position);phase='boarding';age=0;state.active=false;returning=false;boatReturning=false;controlled=true;clear();}
 function enter(){
  if(!focused()||!canPilot())return false;
  if(phase==='swimming'){
   if(distance(swimmer.state,state)>7)return false;
   cancelHero();swimmer=null;state.explorer=null;beginBoarding();return true;
  }
  if(busy())return false;
  cancelHero();
  if(!physics.atDock()){boatReturning=true;boatRoute=createSubmarineReturn(state);return false;}
  if(actor.position.distanceTo(dockPoint)>16){if(!approachDock?.(dockPoint))return false;phase='approaching';controlled=true;age=0;clear();return true;}
  beginBoarding();return true;
 }
 function exit(){
  if(phase!=='piloting'||!controlled)return false;
  clear();state.active=false;returning=false;
  if(physics.atDock()){phase='exiting';age=0;start.copy(actor.position);return true;}
  const radius=catNavigationRadius(getModel()),candidate={mode:'swimming',floor:0,x:state.x,y:state.y+.6,z:state.z,yaw:state.yaw,returning:false};
  const trial=createOceanSwimmer(candidate,{radius});let spawn=null;
  // Find a clear place beside the real hull, not inside it or through glass.
  spawnSearch:for(const r of [3.2,4.5,6])for(const angle of [Math.PI/2,-Math.PI/2,Math.PI,0]){const p={...candidate,x:state.x+Math.sin(state.yaw+angle)*r,z:state.z+Math.cos(state.yaw+angle)*r};if(trial.clear(p)){spawn=p;break spawnSearch;}}
  if(!spawn){state.active=true;return false;}
  returningExplorer=false;swimReturn=null;state.speed=0;state.vertical=0;swimmer=createOceanSwimmer(spawn,{radius});phase='swimming';pan=tilt=0;actor.rotation.set(0,state.yaw,0);cameraFollow.reset();return true;
 }
 function boatHome(){boatReturning=true;boatRoute=createSubmarineReturn(state);}
 function releaseControl(){
  if(!controlled)return false;controlled=false;clear();cameraFollow.reset();
  if(restoreView){camera.near=restoreView.near;camera.fov=restoreView.fov;camera.updateProjectionMatrix();restoreView=null;}
  if(phase==='piloting'){returning=true;returnRoute=createSubmarineReturn(state);}
  else if(exploring()){returningExplorer=true;route=[];swimReturn=phase==='swimming'?createSubmarineReturn(swimmer.state):null;boatHome();}
  else if(phase==='approaching'){cancelHero();phase='docked';}
  else if(phase==='boarding'){returning=true;returnRoute=createSubmarineReturn(state);}
  return true;
 }
 function toggleCamera(){if(phase!=='piloting')return;state.mode=state.mode==='cockpit'?'chase':'cockpit';pan=tilt=0;}
 function nearPortal(){return !!swimmer&&distance(swimmer.state,phase==='mall'?AIRLOCK.inside:AIRLOCK.outside)<6;}
 async function usePortal(){
  if(!['swimming','mall'].includes(phase)||!nearPortal())return false;
  const entering=phase==='swimming',mall=getMall();if(!await mall?.ensure()||disposed||!swimmer)return false;
  transitOrigin={...swimmer.state,mode:entering?'swimming':'mall'};transit=createMallAirlockTransit(entering,swimmer.state);phase='airlock';clear();return true;
 }
 function interact(){if(phase==='docked')enter();else if(phase==='piloting')exit();else if(['swimming','mall'].includes(phase)){if(nearPortal())void usePortal();else enter();}}
 function onKey(e){
  if(!focused()||!canPilot()||e.ctrlKey||e.metaKey||e.altKey||document.querySelector('dialog[open]')||/INPUT|TEXTAREA|SELECT/.test(e.target.tagName))return;
  if(!['KeyW','KeyS','KeyA','KeyD','Space','ShiftLeft','ShiftRight','ArrowDown','KeyC','KeyE'].includes(e.code))return;
  if(e.code==='KeyE'&&!e.repeat)interact();
  if(!controlled||!busy())return;e.preventDefault();if(e.code==='KeyC'&&!e.repeat)toggleCamera();keys.add(e.code);
 }
 function release(e){keys.delete(e.code);}
 function down(e){if(!focused()||!controlled||!busy()||phase==='approaching')return;e.preventDefault();e.stopImmediatePropagation();drag={x:e.clientX,y:e.clientY};canvas.setPointerCapture?.(e.pointerId);}
 function move(e){
  if(!drag||!controlled||(!exploring()&&state.mode!=='cockpit'))return;
  const dx=(e.clientX-drag.x)*.004;tilt=T.MathUtils.clamp(tilt+(e.clientY-drag.y)*.004,-1.2,1.2);
  if(swimmer)swimmer.state.yaw-=dx;else pan=T.MathUtils.clamp(pan+dx,-1.3,1.3);
  drag={x:e.clientX,y:e.clientY};e.preventDefault();e.stopImmediatePropagation();
 }
 function wheel(e){if(!focused()||!controlled||phase!=='piloting')return;e.preventDefault();e.stopImmediatePropagation();viewDistance=T.MathUtils.clamp(viewDistance+e.deltaY*.008,5,18);}
 window.addEventListener('keydown',onKey);window.addEventListener('keyup',release);window.addEventListener('blur',clear);
 canvas.addEventListener('pointerdown',down,true);canvas.addEventListener('pointermove',move,true);canvas.addEventListener('pointerup',clear,true);canvas.addEventListener('pointercancel',clear,true);canvas.addEventListener('wheel',wheel,{capture:true,passive:false});
 enterButton.onclick=enter;resumeButton.onclick=resume;cameraButton.onclick=toggleCamera;exitButton.onclick=exit;mallButton.onclick=()=>void usePortal();returnButton.onclick=()=>{releaseControl();if(focused())focus('autumn',false,true);};
 for(const b of panel.querySelectorAll('[data-sub-key]')){
  b.addEventListener('pointerdown',e=>{if(!controlled)return;e.preventDefault();b.setPointerCapture(e.pointerId);keys.add(b.dataset.subKey);returning=false;});
  const release=()=>keys.delete(b.dataset.subKey);b.addEventListener('pointerup',release);b.addEventListener('pointercancel',release);
 }
 async function prepareReturnWalk(){
  if(routePending||!swimmer||phase!=='mall')return;routePending=true;
  const s=swimmer.state,floor=s.floor,side=s.x<0?-1:1,to=floor>1?{x:side*25,y:MALL.y+(floor-1)*MALL.rise+.18,z:MALL.z+14.7}:AIRLOCK.inside;
  try{
   const path=await getMall()?.walkPath(floor,s,to,catNavigationRadius(getModel()));
   if(disposed||phase!=='mall'||!returningExplorer||s!==swimmer?.state)return;
   route=path?path.slice(1):[];
   if(path&&floor>1)route.push({x:side*18.4,y:to.y,z:MALL.z+14.7},{x:side*18.4,y:to.y,z:MALL.z+13.5},{x:side*18.4,y:to.y-MALL.rise,z:MALL.z-13.5});
   routeRetry=1;
  }catch(error){routeRetry=3;if(!disposed&&error.name!=='AbortError')onError(error.message);}
  finally{routePending=false;}
 }
 function update(dt,time,reduced=false){
  if(disposed)return null;dt=Math.max(0,Math.min(dt,.1));const island=getIsland(),activeView=focused(),mall=getMall();
  if(!boat){if(!activeView&&!busy()&&!boatReturning)return null;boat=createSubmarineModel();anchor.add(boat);}
  anchor.visible=activeView&&!island?.userData.lowOnly&&!!island?.userData.detail.visible;
  if(!activeView||!canPilot()||!controlled)keys.clear();age+=dt;routeRetry=Math.max(0,routeRetry-dt);
  if(phase==='approaching'&&actor.position.distanceTo(dockPoint)<.5)beginBoarding();
  if(phase==='boarding'&&age>=3){phase='piloting';age=0;state.active=true;}
  if(phase==='exiting'&&age>=2.5){phase='docked';age=0;state.active=false;actor.position.copy(dockPoint);actor.rotation.set(0,0,0);if(controlled){controlled=false;focus('autumn',false,true);}}
  if(boatReturning){state.active=true;physics.step(dt,boatRoute(state));if(physics.atDock()){boatReturning=false;state.active=false;}}
  else if(phase==='piloting'){
   state.active=true;const input=controlled?submarineControlInput(keys,state):{};
   if(input.forward||input.turn||input.vertical||input.flip)returning=false;
   if(returning){Object.assign(input,returnRoute(state));if(physics.atDock()){returning=false;phase='exiting';age=0;state.active=false;start.copy(actor.position);}}
   physics.step(dt,input);
   if(Math.abs(state.y-MOSA_SURFACE)<1&&Math.abs(state.speed)>2&&time-lastWake>.24){lastWake=time;island?.userData.ocean.sea.userData.disturb(state.x,state.z,time,Math.min(1,Math.abs(state.speed)/20));}
  }
  boat.position.set(state.x,state.y,state.z);boat.rotation.set((reduced?0:state.pitch)-T.MathUtils.clamp(state.vertical*.025,-.25,.25),state.yaw,-state.turn*.12,'YXZ');boat.userData.update(time,state.speed,phase==='boarding'?1-smooth(Math.min(1,age/3)):phase==='exiting'?smooth(Math.min(1,age/2.5)):0,reduced);
  let walking=false;
  if(exploring()&&swimmer){
   const s=swimmer.state;
   const input={forward:(keys.has('KeyW')?1:0)-(keys.has('KeyS')?1:0),strafe:(keys.has('KeyA')?1:0)-(keys.has('KeyD')?1:0),vertical:(keys.has('Space')?1:0)-(keys.has('ShiftLeft')||keys.has('ShiftRight')||keys.has('ArrowDown')?1:0),jump:keys.has('Space')};
   if(phase==='airlock'){
    const frame=transit.step(dt);Object.assign(s,frame.position);mall?.root?.userData.airlock.userData.update(frame.outer,frame.inner,frame.water);
    if(frame.done){phase=frame.entering?'mall':'swimming';s.mode=phase;s.floor=phase==='mall'?1:0;s.returning=returningExplorer;transit=null;if(returningExplorer&&phase==='swimming')swimReturn=createSubmarineReturn(s);}
   }else if(phase==='swimming'){
    if(returningExplorer){const a=swimReturn(s);s.yaw+=a.turn*1.3*dt;Object.assign(input,{forward:a.forward,strafe:0,vertical:a.vertical,jump:false});}
    swimmer.step(dt,input);walking=!!(input.forward||input.strafe||input.vertical);
    if(returningExplorer&&Math.hypot(s.x-SUBMARINE_DOCK.x,s.z-SUBMARINE_DOCK.z)<4&&Math.abs(s.y-SUBMARINE_DOCK.y)<2.5){phase='exiting';start.set(s.x,s.y,s.z).add(centre);age=0;swimmer=null;}
   }else{
    if(!mall?.root)void mall?.ensure();
    if(returningExplorer){
     if(nearPortal()){void usePortal();}
     else{
      while(route.length&&Math.hypot(route[0].x-s.x,route[0].z-s.z)<.24)route.shift();
      if(!route.length&&!routeRetry)void prepareReturnWalk();
      const next=route[0];if(next){s.yaw=Math.atan2(next.x-s.x,next.z-s.z);Object.assign(input,{forward:1,strafe:0,jump:false});}else Object.assign(input,{forward:0,strafe:0,jump:false});
     }
    }
    if(mall?.root)walking=stepMallWalker(s,dt,input,mall.root.userData.obstacles,catNavigationRadius(getModel()),mall.walkActors());
   }
   if(swimmer){actor.position.set(s.x,s.y,s.z).add(centre);actor.rotation.set(0,s.yaw,0);}
   const floor=controlled&&(phase==='mall'||phase==='airlock')?s.floor||1:null;
   if(lastFloor!==floor||(floor&&mall?.root&&mall.root.userData.explorerFloor!==floor)){lastFloor=floor;mall?.setExplorerFloor(floor);}
  }else if(busy()&&phase!=='approaching'){
   if(phase==='boarding'){const u=smooth(Math.min(1,age/3));target.copy(boat.userData.seat).applyQuaternion(boat.quaternion).add(boat.position).add(centre);actor.position.lerpVectors(start,target,u);actor.position.y+=Math.sin(u*Math.PI)*.5;actor.rotation.set(0,state.yaw,0);}
   else if(phase==='exiting')actor.position.lerpVectors(start,dockPoint,smooth(Math.min(1,age/2.5)));
   else{actor.position.copy(boat.userData.seat).applyQuaternion(boat.quaternion).add(boat.position).add(centre);actor.quaternion.copy(boat.quaternion);}
   walking=phase==='boarding'||phase==='exiting';
  }
  panel.hidden=!activeView||!!mall?.inspection;
  enterButton.hidden=!(phase==='docked'||phase==='swimming'&&controlled);enterButton.disabled=!canPilot()||(phase==='swimming'&&distance(swimmer.state,state)>7);
  enterButton.textContent=phase==='swimming'?'Сісти назад · E':boatReturning?'Субмарина повертається…':actor.position.distanceTo(dockPoint)>16?'🐾 Покликати Чічі до субмарини':'🌊 Сісти в субмарину · E';
  resumeButton.hidden=!busy()||controlled||phase==='airlock';cameraButton.hidden=phase!=='piloting'||!controlled;returnButton.hidden=!busy()||!controlled;exitButton.hidden=phase!=='piloting'||!controlled;exitButton.disabled=phase!=='piloting';controls.hidden=!controlled||!['piloting','swimming','mall'].includes(phase);
  mallButton.hidden=!controlled||!['swimming','mall'].includes(phase)||!nearPortal();mallButton.textContent=phase==='mall'?'Вийти через шлюз · E':'Увійти до ТРЦ · E';
  const airborne=phase==='piloting'&&submarineAirborne(state);if(lastAirborne!==airborne){forwardButton.textContent=airborne?'↻ Переднє сальто · W':'▲ Вперед';reverseButton.textContent=airborne?'↺ Заднє сальто · S':'▼ Назад';lastAirborne=airborne;}
  const text=phase==='airlock'?'Шлюз · двері відчиняються по черзі…':phase==='mall'?'ТРЦ · поверх '+swimmer.state.floor:phase==='swimming'?'Чічі пливе · глибина '+Math.max(0,Math.round(MOSA_SURFACE-swimmer.state.y))+' м':phase==='approaching'?'Чічі прямує до причалу…':phase==='boarding'?'Влаштовуємось у кабіні…':phase==='exiting'?'Повертаємось на причал…':busy()?'Глибина '+Math.max(0,Math.round(MOSA_SURFACE-state.y))+' м · '+Math.round(Math.abs(state.speed)*3.6)+' км/год':'🐾 Підводна пригода';
  const hud=text+(busy()&&!controlled?' · Самостійне повернення':'');if(hud!==lastHud){readout.textContent=hud;lastHud=hud;}
  return busy()&&phase!=='approaching'?{walking,reaction:phase==='piloting'?{rideSit:1,weight:1,grip:submarineAirborne(state)?.75:.45,surprise:submarineAirborne(state)?.3:0,bodyLean:-state.turn*.1,headYaw:pan*.2,eyeClose:0}:phase==='swimming'?{headPitch:.12,paw:.15}:null}:null;
 }
 function updateCamera(dt){
  if(!boat||!busy()||!controlled||phase==='approaching'||!focused()){cameraFollow.reset();return false;}
  if(!exploring()&&restoreView){camera.near=restoreView.near;camera.fov=restoreView.fov;camera.updateProjectionMatrix();restoreView=null;}
  if(exploring()&&swimmer){
   if(!restoreView)restoreView={near:camera.near,fov:camera.fov};camera.near=.08;camera.fov=65;camera.updateProjectionMatrix();
   const s=swimmer.state,head=getModel().userData.head;head.getWorldPosition(eye);aim.set(Math.sin(s.yaw)*Math.cos(tilt),-Math.sin(tilt),Math.cos(s.yaw)*Math.cos(tilt));eye.addScaledVector(aim,.45*getModel().scale.x);camera.position.copy(eye);look.copy(eye).addScaledVector(aim,8);camera.up.set(0,1,0);camera.lookAt(look);return true;
  }
  q.copy(boat.quaternion);target.set(state.x,state.y+.25,state.z).add(centre);
  if(state.mode==='cockpit'){eye.set(0,.88,1).applyQuaternion(q).add(target);aim.set(Math.sin(pan)*Math.cos(tilt),-Math.sin(tilt),Math.cos(pan)*Math.cos(tilt));aim.applyQuaternion(q);target.copy(eye).addScaledVector(aim,8);}
  else{q.setFromAxisAngle(T.Object3D.DEFAULT_UP,state.yaw);eye.set(0,3.4,-viewDistance).applyQuaternion(q).add(target);}
  velocity.set(Math.sin(state.yaw)*state.speed,state.vertical,Math.cos(state.yaw)*state.speed);cameraFollow.update(dt,eye,target,velocity);return true;
 }
 function snapshot(){
  const explorer=swimmer?normalizeOceanExplorer({...((phase==='airlock'?transitOrigin:null)||swimmer.state),mode:phase==='airlock'?transitOrigin.mode:phase,returning:returningExplorer}):null;
  const {explorer:oldExplorer,returning:oldReturn,released:oldRelease,...boatState}=physics.snapshot();
  return {...boatState,explorerVersion:1,explorer,active:phase==='piloting'||phase==='boarding',...(boatReturning?{returning:true}:{}),...(!controlled&&busy()?{released:true}:{})};
 }
 return {get active(){return busy();},get controlled(){return controlled;},get exploringMall(){return controlled&&(phase==='mall'||phase==='airlock'&&transit?.frame.inner>0);},get phase(){return phase;},get explorer(){return swimmer?.state;},physics,boardingPoint:dockPoint,get boat(){return boat;},enter,exit,resume,releaseControl,usePortal,toggleCamera,update,updateCamera,snapshot,
  dispose(){disposed=true;clear();panel.remove();window.removeEventListener('keydown',onKey);window.removeEventListener('keyup',release);window.removeEventListener('blur',clear);canvas.removeEventListener('pointerdown',down,true);canvas.removeEventListener('pointermove',move,true);canvas.removeEventListener('pointerup',clear,true);canvas.removeEventListener('pointercancel',clear,true);canvas.removeEventListener('wheel',wheel,true);anchor.removeFromParent();boat?.userData.dispose();}};
}
const MOSA_SURFACE=.155;
