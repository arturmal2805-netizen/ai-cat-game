import * as T from 'three';import{createSubmarinePhysics,SUBMARINE_DOCK,SUBMARINE_BOARDING_POINT}from'./submarine-physics.js';import{createSubmarineModel}from'./submarine-model.js';import{byBiome}from'./game-data.js';
import {createSubmarineReturn} from './submarine-return.js';
export function createSubmarineRuntime({container,canvas,camera,look,actor,getModel,getIsland,getGame,getFocused,cancelHero,approachDock,canPilot=()=>true,scene,focus}){
 const physics=createSubmarinePhysics(getGame().mosasaurSubmarine),state=physics.state,biome=byBiome('autumn'),centre=new T.Vector3(biome.center[0],0,biome.center[1]);
 const anchor=new T.Group();anchor.position.copy(centre);scene.add(anchor);let boat=null;
 let phase=state.active?'piloting':'docked',age=0,start=new T.Vector3(),returning=false,returnRoute=null,pan=0,tilt=0,drag=null,viewDistance=9,lastHud='',lastWake=-Infinity,shown=false,disposed=false;
 const dockPoint=new T.Vector3(SUBMARINE_BOARDING_POINT.x,SUBMARINE_BOARDING_POINT.y,SUBMARINE_BOARDING_POINT.z).add(centre),aim=new T.Vector3();
 const keys=new Set(),point=new T.Vector3(),target=new T.Vector3(),eye=new T.Vector3(),q=new T.Quaternion(),up=new T.Vector3(0,1,0),smooth=t=>t*t*(3-2*t);
 const panel=document.createElement('div');panel.className='submarine-panel';panel.style.cssText='position:absolute;right:14px;bottom:116px;z-index:12;max-width:310px;padding:10px;border-radius:18px;background:#173c57e8;color:#effcff;box-shadow:0 4px 24px #1235;font:600 13px system-ui;';
 panel.innerHTML='<div data-sub-readout></div><div style="display:flex;gap:6px;flex-wrap:wrap;margin-top:7px"><button data-sub-enter>🌊 Сісти в субмарину · E</button><button data-sub-camera>Камера · C</button><button data-sub-return>До причалу</button><button data-sub-exit>Вийти · E</button></div><div data-sub-controls style="display:flex;gap:5px;flex-wrap:wrap;margin-top:8px"><button data-sub-key="KeyW">▲ Газ</button><button data-sub-key="KeyS">▼ Назад</button><button data-sub-key="KeyA">←</button><button data-sub-key="KeyD">→</button><button data-sub-key="Space">↑ Ривок</button><button data-sub-key="ShiftLeft">↓ Глибше</button></div><small data-sub-help style="display:block;margin-top:6px;opacity:.8">WASD · Space ↑ · Shift ↓ · C камера · E вхід/вихід</small>';
 for(const b of panel.querySelectorAll('button'))b.style.cssText='border:1px solid #8cd9e66b;border-radius:9px;background:#376980;color:white;padding:8px;font:inherit;touch-action:none;cursor:pointer;';panel.hidden=true;container.append(panel);const readout=panel.querySelector('[data-sub-readout]'),enterButton=panel.querySelector('[data-sub-enter]'),cameraButton=panel.querySelector('[data-sub-camera]'),returnButton=panel.querySelector('[data-sub-return]'),exitButton=panel.querySelector('[data-sub-exit]'),controls=panel.querySelector('[data-sub-controls]');
 function focused(){return getFocused()==='autumn'&&getGame().unlocked.includes('autumn');}
 function isBusy(){return phase!=='docked';}
 function beginBoarding(){start.copy(actor.position);phase='boarding';age=0;state.active=false;returning=false;keys.clear();}
 function enter(){if(!focused()||isBusy()||!canPilot())return false;cancelHero();if(actor.position.distanceTo(dockPoint)>16){if(!approachDock?.(dockPoint))return false;phase='approaching';age=0;keys.clear();return true;}beginBoarding();return true;}
 function exit(){if(phase!=='piloting'||!physics.atDock())return false;phase='exiting';age=0;state.active=false;start.copy(actor.position);keys.clear();return true;}
 function toggleCamera(){state.mode=state.mode==='cockpit'?'chase':'cockpit';pan=tilt=0;}
 function onKey(e){if(!focused()||!canPilot()||e.ctrlKey||e.metaKey||e.altKey||document.querySelector('dialog[open]')||/INPUT|TEXTAREA|SELECT/.test(e.target.tagName))return;const code=e.code;if(!['KeyW','KeyS','KeyA','KeyD','Space','ShiftLeft','ShiftRight','KeyC','KeyE'].includes(code))return;if(code==='KeyE'&&!e.repeat){if(phase==='docked')enter();else exit();}if(!isBusy())return;e.preventDefault();if(code==='KeyC'&&!e.repeat)toggleCamera();keys.add(code);}
 function release(e){keys.delete(e.code);}function clear(){keys.clear();drag=null;}
 function down(e){if(!focused()||!isBusy()||phase==='approaching')return;e.preventDefault();e.stopImmediatePropagation();drag={x:e.clientX,y:e.clientY};canvas.setPointerCapture?.(e.pointerId);}
 function move(e){if(!drag||!isBusy()||state.mode!=='cockpit')return;pan=T.MathUtils.clamp(pan+(e.clientX-drag.x)*.004,-1.3,1.3);tilt=T.MathUtils.clamp(tilt+(e.clientY-drag.y)*.004,-.8,.8);drag={x:e.clientX,y:e.clientY};e.preventDefault();e.stopImmediatePropagation();}
 function wheel(e){if(!focused()||!isBusy()||phase==='approaching')return;e.preventDefault();e.stopImmediatePropagation();viewDistance=T.MathUtils.clamp(viewDistance+e.deltaY*.008,5,18);}
 window.addEventListener('keydown',onKey);window.addEventListener('keyup',release);window.addEventListener('blur',clear);canvas.addEventListener('pointerdown',down,true);canvas.addEventListener('pointermove',move,true);canvas.addEventListener('pointerup',clear,true);canvas.addEventListener('pointercancel',clear,true);canvas.addEventListener('wheel',wheel,{capture:true,passive:false});
 enterButton.onclick=enter;cameraButton.onclick=toggleCamera;exitButton.onclick=exit;returnButton.onclick=()=>{returning=true;returnRoute=createSubmarineReturn(state);keys.clear();};
 const touchHandlers=[];for(const b of panel.querySelectorAll('[data-sub-key]')){const press=e=>{e.preventDefault();b.setPointerCapture(e.pointerId);keys.add(b.dataset.subKey);returning=false;},release=()=>keys.delete(b.dataset.subKey);b.addEventListener('pointerdown',press);b.addEventListener('pointerup',release);b.addEventListener('pointercancel',release);touchHandlers.push([b,press,release]);}
 function update(dt,time,reduced=false){
  if(disposed)return null;const island=getIsland(),activeView=focused();if(!boat){if(!activeView&&!state.active)return null;boat=createSubmarineModel();anchor.add(boat);}anchor.visible=activeView&&!island?.userData.lowOnly&&!!island?.userData.detail.visible;
  if(!activeView||!canPilot())keys.clear();age+=dt;if(phase==='approaching'&&actor.position.distanceTo(dockPoint)<.5)beginBoarding();
  if(phase==='boarding'&&age>=3){phase='piloting';age=0;state.active=true;}if(phase==='exiting'&&age>=2.5){phase='docked';age=0;actor.rotation.set(0,0,0);focus('autumn',false,true);}
  if(phase==='piloting'){
   const input={forward:(keys.has('KeyW')?1:0)-(keys.has('KeyS')?1:0),turn:(keys.has('KeyD')?1:0)-(keys.has('KeyA')?1:0),vertical:(keys.has('Space')?1:0)-(keys.has('ShiftLeft')||keys.has('ShiftRight')?1:0),boost:keys.has('Space')};
   if(input.forward||input.turn||input.vertical)returning=false;
   if(returning){Object.assign(input,returnRoute(state));if(physics.atDock()){returning=false;exit();}}
   physics.step(dt,input);
   if(Math.abs(state.y-MOSA_SURFACE)<1&&Math.abs(state.speed)>2&&time-lastWake>.24){lastWake=time;island?.userData.ocean.sea.userData.disturb(state.x,state.z,time,Math.min(1,Math.abs(state.speed)/20));}
  }
  boat.position.set(state.x,state.y,state.z);boat.rotation.set(-T.MathUtils.clamp(state.vertical*.025,-.25,.25),state.yaw,-state.turn*.12);boat.userData.update(time,state.speed,phase==='boarding'?1-smooth(Math.min(1,age/3)):phase==='exiting'?smooth(Math.min(1,age/2.5)):0,reduced);
  if(isBusy()&&phase!=='approaching'){
   if(phase==='boarding'){const u=smooth(Math.min(1,age/3));target.copy(boat.userData.seat).applyQuaternion(boat.quaternion).add(boat.position).add(centre);actor.position.lerpVectors(start,target,u);actor.position.y+=Math.sin(u*Math.PI)*.5;actor.rotation.set(0,state.yaw,0);}
   else if(phase==='exiting'){target.copy(dockPoint);actor.position.lerpVectors(start,target,smooth(Math.min(1,age/2.5)));}
   else{actor.position.copy(boat.userData.seat).applyQuaternion(boat.quaternion).add(boat.position).add(centre);actor.quaternion.copy(boat.quaternion);}
  }
  shown=activeView;panel.hidden=!shown;
  enterButton.hidden=isBusy();enterButton.disabled=!canPilot();enterButton.textContent=actor.position.distanceTo(dockPoint)>16?'🐾 Покликати Чічі до субмарини':'🌊 Сісти в субмарину · E';for(const b of[cameraButton,returnButton,exitButton])b.hidden=!isBusy()||phase==='approaching';controls.hidden=!isBusy()||phase==='approaching';exitButton.disabled=!physics.atDock()||phase!=='piloting';
  const text=phase==='approaching'?'Чічі прямує до причалу…':phase==='boarding'?'Влаштовуємось у кабіні…':phase==='exiting'?'Повертаємось на причал…':isBusy()?'Глибина '+Math.max(0,Math.round(MOSA_SURFACE-state.y))+' м · '+Math.round(Math.abs(state.speed)*3.6)+' км/год'+(returning?' · До причалу':''): '🐾 Підводна пригода';if(text!==lastHud){readout.textContent=text;lastHud=text;}
  return isBusy()&&phase!=='approaching'?{walking:phase==='boarding'||phase==='exiting',reaction:phase==='piloting'?{rideSit:1,weight:1,grip:.45,bodyLean:-state.turn*.1,headYaw:pan*.2,eyeClose:0}:null}:null;
 }
 function updateCamera(dt){if(!boat||!isBusy()||phase==='approaching'||!focused())return false;q.copy(boat.quaternion);target.set(state.x,state.y+.25,state.z).add(centre);
  if(state.mode==='cockpit'){eye.set(0,.88,1).applyQuaternion(q).add(target);aim.set(Math.sin(pan)*Math.cos(tilt),-Math.sin(tilt),Math.cos(pan)*Math.cos(tilt));aim.applyQuaternion(q);target.copy(eye).addScaledVector(aim,8);}
  else eye.set(0,3.4,-viewDistance).applyQuaternion(q).add(target);
  const ease=1-Math.exp(-dt*8);camera.position.lerp(eye,ease);look.lerp(target,ease);camera.up.copy(up);camera.lookAt(look);return true;
 }
 return {get active(){return isBusy();},get phase(){return phase;},physics,boardingPoint:dockPoint,get boat(){return boat;},enter,exit,toggleCamera,update,updateCamera,snapshot:()=>({...physics.snapshot(),active:phase==='piloting'}),dispose(){disposed=true;clear();panel.remove();window.removeEventListener('keydown',onKey);window.removeEventListener('keyup',release);window.removeEventListener('blur',clear);canvas.removeEventListener('pointerdown',down,true);canvas.removeEventListener('pointermove',move,true);canvas.removeEventListener('pointerup',clear,true);canvas.removeEventListener('pointercancel',clear,true);canvas.removeEventListener('wheel',wheel,true);anchor.removeFromParent();boat?.userData.dispose();}};
}
const MOSA_SURFACE=.155;
