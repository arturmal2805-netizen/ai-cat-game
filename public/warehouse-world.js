import * as T from 'three';
import {byBiome} from './game-data.js';
import {WAREHOUSE as W} from './mosasaur-expansion-data.js';
import {WAREHOUSE_ACCESS as A} from './warehouse-access-data.js';
import {warehouseFleetSteps} from './warehouse-shuttle-models.js';
import {createWarehouseVisits} from './warehouse-visit-runtime.js';
// A shared, bounded fleet. Visitors keep their original native carrier and rig.
export function createWarehouseWorld({scene,container,getGame,getActors,getFocused,getOverview,getModel,prepare,prepareModel,canSimulate,canInvite,reserve,hold,onPark,onComplete,onManualReady,onReleaseManual,onInspect,onError}){
 const b=byBiome('autumn'),origin={x:b.center[0],z:b.center[1]},abort=new AbortController();
 let fleet=null,pending=null,disposed=false,opened=false,nextTry=0;
 const panel=document.createElement('div');panel.className='waterfront-panel warehouse-panel';panel.hidden=true;
 const title=document.createElement('strong');title.textContent='Warehouse · субмарини';panel.append(title);
 const button=(text,action,key)=>{const e=document.createElement('button');e.textContent=text;e.onclick=action;if(key)e.dataset[key]='';panel.append(e);return e;};
 const call=button('🐈 Відправити Чічі до Warehouse',()=>void invite('chichi'),'warehouseCall');
 const control=button('🎮 Керувати Чічі після прибуття',()=>requestManual(),'warehouseControl');
 const back=button('↩ Повернути Чічі на берег',()=>{onReleaseManual();runtime.releaseManual();runtime.cancel('chichi');},'warehouseReturn');
 const status=document.createElement('small');status.setAttribute('role','status');status.style.color='#e8d8ad';status.style.display='block';status.style.lineHeight='1.4';panel.append(status);
 button('Закрити',()=>exit());container.append(panel);
 const seat=new T.Vector3();
 const runtime=createWarehouseVisits({origin,getActors,canSimulate,onPark,onComplete,onManualReady,
  onBoatPose:(pose,time)=>{const m=fleet?.userData.boats[pose.slot];if(!m)return;m.position.set(pose.x,pose.y,pose.z);m.rotation.set(-(pose.pitch||0),pose.yaw||0,0,'YXZ');m.userData.update(time,pose.speed,pose.open);const ramp=fleet.userData.ramps[pose.slot];if(ramp)ramp.visible=Math.hypot(pose.x-(A.departure.x+pose.slot*14),pose.z-A.departure.z)<1&&pose.open>.1;const dockRamp=fleet.userData.dockRamps[pose.slot];if(dockRamp)dockRamp.visible=Math.hypot(pose.x-(A.dock.x+(pose.slot-1)*14),pose.z-A.dock.z)<1&&['leaving-boat','return-boarding'].includes(runtime.get(pose.id)?.phase);m.updateWorldMatrix(true,false);},
  getSeat:pose=>{const m=fleet?.userData.boats[pose.slot];if(!m)return{x:pose.x,y:pose.y-.55,z:pose.z+.25};seat.copy(m.userData.seat);m.localToWorld(seat);return{x:seat.x-origin.x,y:seat.y,z:seat.z-origin.z};},
  onDoorPose:(outer,inner,water,time)=>getModel()?.userData.entry?.userData.update(outer,inner,water,time),
 });
 async function ensure(){if(disposed)return false;if(fleet)return true;if(pending)return pending;if(!getModel())return false;
  pending=(async()=>{let model;try{model=await prepare(warehouseFleetSteps(origin),abort.signal);await prepareModel(model);if(disposed){model.userData.dispose();return false;}fleet=model;fleet.userData.biomeId='autumn';scene.add(fleet);return true;}catch(e){model?.userData.dispose();if(!disposed)onError('Warehouse: '+e.message);return false;}finally{pending=null;}})();return pending;
 }
 async function invite(id){if(!canSimulate()||!canInvite(id)){onError('Дочекайся безпечного завершення поточного переходу.');return false;}if(!await ensure()||disposed||!canSimulate()||!canInvite(id))return false;if(runtime.has(id))return true;if(!reserve(id))return false;const ok=runtime.start(id);if(ok)onError('Чічі прямує до причалу. Субмарина доставить її до входу Warehouse.');return ok;}
 function requestManual(){if(runtime.has('chichi')){const returning=['lobby-return','airlock-out','return-boarding','inbound','disembark'].includes(runtime.get('chichi')?.phase);runtime.requestManual();onError(returning?'Керування увімкнеться на березі після завершення зворотного рейсу.':'Керування увімкнеться після безпечного прибуття до Warehouse.');return true;}return invite('chichi').then(ok=>ok&&runtime.requestManual());}
 function exit(){opened=false;panel.hidden=true;if(!runtime.manual)runtime.releaseManual();}
 const local=p=>({x:p.x-origin.x,y:p.y,z:p.z-origin.z});
 function support(p,radius=.6){if(!getModel()||Math.abs(p.y-A.foot)>.65)return null;const q=local(p),sx=W.width/240,sz=W.depth/120,dx=Math.max(0,Math.abs(q.x-W.x)-60*sx),dz=Math.abs(q.z-W.z),rx=59.4*sx-radius,rz=59.4*sz-radius,inside=(dx/rx)**2+(dz/rz)**2<1;
  const corridor=Math.abs(q.x-W.x)<4-radius&&q.z>=A.lobby.z&&q.z<=A.inside.z;
  if(!inside&&!corridor)return null;return{biome:'autumn',y:A.foot};}
 function cameraClear(a,b){const qa=local(a),qb=local(b);if(Math.min(qa.y,qb.y)<A.floor+.1)return false;const margin=.2;
  if(Math.max(Math.abs(qa.x-W.x),Math.abs(qb.x-W.x))<W.width/2-120-margin&&Math.max(Math.abs(qa.z-W.z),Math.abs(qb.z-W.z))<W.depth/2-12-margin)return true;
  return !support(a,0)||!!support(b,0);}
 return{origin,ensure,invite,requestManual,exit,support,cameraClear,runtime,pick(raycaster){const model=getModel();if(!model||!model.visible)return false;const b=new T.Box3().setFromObject(model);if(!raycaster.ray.intersectsBox(b))return false;if(!raycaster.intersectObject(model,true).length)return false;onInspect();return true;},get ready(){return!!fleet;},get manual(){return runtime.manual==='chichi';},get inspection(){return opened;},open(){opened=true;panel.hidden=false;},has:runtime.has,frame:runtime.frame,unsafe:runtime.unsafe,cancel:runtime.cancel,safePosition:runtime.safePosition,releaseManual:()=>runtime.releaseManual(),
  arrival:()=>new T.Vector3(origin.x+A.shore.x,A.shore.y,origin.z+A.shore.z),startReady:(id,activityId,ticket)=>runtime.start(id,activityId,{ticket}),
  update(dt,time){const active=getFocused()==='autumn',visible=active||getOverview();if(!active)exit();if(active&&getGame().unlocked.includes('autumn')&&!fleet&&!pending&&getModel()&&time>nextTry){nextTry=time+30;void ensure();}if(fleet)fleet.visible=visible;
   runtime.update(dt,time);for(const id of runtime.visits.keys())hold(id);const entry=getModel()?.userData.entry;if(entry){const s=entry.userData.state;entry.userData.update(s.outer,s.inner,s.water,time);}
   call.disabled=!canSimulate()||runtime.has('chichi');control.disabled=back.disabled=!canSimulate()||!runtime.has('chichi');
   const phase=runtime.get('chichi')?.phase;status.textContent=phase?(['outbound','inbound'].includes(phase)?'Субмарина в дорозі':phase==='visit'?'Чічі у Warehouse':phase.startsWith('airlock')?'Прохід через герметичний вхід':'Посадка та перехід'):'3 субмарини · проїзд безкоштовний';
  },dispose(){disposed=true;abort.abort();runtime.dispose();fleet?.userData.dispose();panel.remove();},diagnostics(){return{ready:!!fleet,manual:runtime.manual,visits:[...runtime.visits.values()].map(v=>({id:v.id,phase:v.phase,position:v.frame.position.toArray(),boat:v.boat})),boats:runtime.boats.map(b=>({...b}))};}
 };
}
