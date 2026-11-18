import {createResortAppointments} from './resort-spa-appointments.js';
import {createResortTransit} from './resort-spa-transit.js';
import {RESORT_LIFT} from './resort-spa-lift.js';
import {resortPaidTicket} from './resort-spa-economy.js';
import {updateResortPoolRipples} from './resort-spa-pool-effects.js';
import {courtFood} from './foodcourt-assets.js';
import {placeCourtFood} from './court-food-pose.js';
import {mosaPierClear} from './resort-pier-link-data.js';
import {MOSA_SHORE_GATE} from './mosasaur-data.js';
import {resortLiftRecovery} from './resort-spa-recovery.js';
import {prepareResortExpression} from './resort-spa-dry-performance.js';
import {resortSpaStaffSteps,updateResortStaff,disposeResortStaff} from './resort-spa-staff.js';
import {prepareMallArt} from './mall-art.js';
import {prepareMosaWaterReflection} from './mosasaur-water-probe.js';
import * as T from 'three';
import {resortSpaModelSteps} from './resort-spa-model.js';
import {createResortSpaNavigation} from './resort-spa-navigation.js';
import {RESORT_SPA as L,RESORT_ZONES,resortZone,resortSpaOrigin} from './resort-spa-data.js';
import {byBiome} from './game-data.js';
// Independent scene/camera owner. Mall's floors, selection and guest camera
// remain untouched; only the world coordinator performs the hand-off.
export function createResortSpaWorld({scene,container,getGame,getFocused,getOverview,prepare,prepareModel,onCamera,onExit,onRecovery=()=>{},onError=()=>{},getActors=()=>[],getAccessSurfaces=()=>[],accessClear=()=>true,registerCat=()=>{},canSimulate=()=>true,blocked=()=>false,onPurchase,onUse,onGoal,onComplete}){
 const centre=resortSpaOrigin(byBiome('autumn').center),controller=new AbortController(),buttons=new Map(),journeys=new Map(),heldFoods=new Map(),recovering=resortLiftRecovery(getGame());let root=null,pending=null,disposed=false,inspection=false,selected=null,navigation=null,appointments=null,transit=null,staff=[],nextPreparation=0;
 const access=document.createElement('button');access.className='resort-spa-access';access.textContent='🪷 SPA';access.hidden=true;access.onclick=()=>inspect();(container.querySelector('.map-controls')||container).append(access);
 const panel=document.createElement('nav');panel.className='resort-spa-zones';panel.hidden=true;panel.setAttribute('aria-label','Зоны подводного SPA');container.append(panel);
 for(const zone of [null,...RESORT_ZONES]){const b=document.createElement('button');b.textContent=zone?.name||'Общий вид';b.onclick=()=>inspect(zone?.id);panel.append(b);buttons.set(zone?.id||'overview',b);}
 const close=document.createElement('button');close.textContent='Выйти из обзора';close.onclick=()=>exit();panel.append(close);
 const liftButton=document.createElement('button');liftButton.className='resort-spa-lift';liftButton.hidden=true;(container.querySelector('.map-controls')||container).append(liftButton);
 const finish=(id,result)=>{journeys.delete(id);onComplete?.(id,result);};
 function start(id,zone){const service=resortZone(zone),profile=getGame().jobCity?.profiles[id];if(pending||!appointments||!service||!profile||journeys.has(id)||transit?.has(id)||(profile.coins<service.price&&!resortPaidTicket(getGame(),id,zone)))return false;const actor=getActors().find(a=>a.id===id);if(!actor)return false;
  if(Math.abs(actor.position.y-RESORT_LIFT.upperY)<.65){if(blocked(id)||!transit.start(id,1))return false;journeys.set(id,{zone,result:null});return true;}
  return appointments.start(id,zone);
 }
 function ride(id,target){return !!transit&&!appointments?.has(id)&&!journeys.has(id)&&transit.start(id,target,{purpose:'manual'});}
 liftButton.onclick=()=>{const actor=getActors().find(a=>a.id==='chichi');if(actor)ride('chichi',actor.position.y>-80?1:0);};
 async function ensure(){if(pending)return pending;if(root)return root;if(disposed)return null;pending=(async()=>{let model;try{await Promise.all([prepareMallArt(),prepareMosaWaterReflection()]);model=await prepare(resortSpaModelSteps(),controller.signal);if(disposed){model.userData.dispose();return null;}model.position.x=centre[0];model.position.z=centre[1];model.userData.biomeId='autumn';
   // Navigation is evaluated in ocean-local coordinates; prepare before the
   // world translation, retaining the authored floor and pool triangles.
   model.position.x=0;model.position.z=0;navigation=createResortSpaNavigation(model,{externalSurfaces:getAccessSurfaces,externalContains:p=>Math.abs(p.x)<1.1&&p.z+L.offsetZ>=23&&p.z+L.offsetZ<=MOSA_SHORE_GATE.z+1,externalClear:(p,r)=>{const q={x:p.x,y:p.y+L.y,z:p.z+L.offsetZ};return mosaPierClear(q,r,MOSA_SHORE_GATE.z)&&accessClear(q,r);}});model.position.x=centre[0];model.position.z=centre[1];model.updateWorldMatrix(true,true);
   await prepareModel(model);if(disposed){model.userData.dispose();return null;}scene.add(model);root=model;staff=await prepare(resortSpaStaffSteps(centre,registerCat),controller.signal);if(disposed){disposeResortStaff(staff);staff=[];return null;}for(const s of staff){await prepareModel(s.carrier);if(disposed)break;scene.add(s.carrier);}if(disposed){disposeResortStaff(staff);staff=[];return null;}
   await prepareModel(courtFood('coffee'));await prepareModel(courtFood('cookie'));if(disposed)return null;
   function* posePreparation(){for(const actor of getActors()){prepareResortExpression(actor.model);yield;}}await prepare(posePreparation(),controller.signal);if(disposed)return null;
   transit=createResortTransit({navigation,geometry:root.userData.accessGeometry,getActors,centre,canSimulate,blocked:(id,purpose)=>!['manual','recovery'].includes(purpose)&&blocked(id),onCancel:(id)=>finish(id,{completed:false}),onArrive:(id,{floor,purpose})=>{if(purpose==='manual')return;if(purpose==='recovery'){if(resortZone(getGame().jobCity?.profiles[id]?.mall?.goal?.storeId))onGoal?.(id,null,{completed:false});finish(id,{completed:false,recovered:true});return;}const journey=journeys.get(id);if(!journey)return;if(floor===1){if(!appointments.start(id,journey.zone)){journey.result={completed:false};if(!transit.start(id,0))finish(id,journey.result);}}else finish(id,journey.result||{completed:false});}});
   appointments=createResortAppointments({getGame,getActors,getNavigation:()=>navigation,centre,canSimulate,blocked,onPurchase,onUse,onGoal,onComplete:(id,result)=>{const journey=journeys.get(id);if(!journey){onComplete?.(id,result);return;}journey.result=result;if(!transit.start(id,0))finish(id,result);},getStaff:()=>staff});
   if(recovering.size){for(const[id,saved]of recovering){const actor=getActors().find(a=>a.id===id);if(actor)Object.assign(actor.position,{x:centre[0]+saved.local.x,y:saved.y,z:centre[1]+saved.local.z});}if(transit.restore([...recovering.keys()]))recovering.clear();else onError('Не удалось восстановить согласованные места в лифте SPA. Сохранение не изменено.');}return root;
  }catch(e){if(root===model){scene.remove(root);root=null;model.userData.dispose();}else if(model&&!disposed)model.userData.dispose();disposeResortStaff(staff);staff=[];appointments=null;if(!disposed)onError(e.message);return null;}finally{pending=null;}})();return pending;}
 async function inspect(id=null){const zone=id?resortZone(id):null;if(id&&!zone)return false;if(!getGame().unlocked.includes('autumn')||!await ensure())return false;onCamera(zone,!inspection);inspection=true;selected=id;root.userData.setInspectionLevel?.(zone?.level??null);panel.hidden=false;for(const [key,b]of buttons)b.setAttribute('aria-pressed',String(key===(id||'overview')));return true;}
 function exit(restore=true){if(!inspection)return;inspection=false;root?.userData.setInspectionLevel?.(null);panel.hidden=true;selected=null;onExit(restore);}
 function updateHeld(){const active=new Set();for(const v of appointments?.runtime.visits.values()||[]){if(v.zone.key!=='cafe'||v.phase!=='procedure')continue;const actor=getActors().find(a=>a.id===v.catId);if(!actor)continue;const action=appointments.frame(v.catId)?.action,kind=action==='drink'?'coffee':['taste-treat','satisfied-chew'].includes(action)?'cookie':null;if(!kind)continue;const key=v.catId+':'+kind;active.add(key);let prop=heldFoods.get(key);if(!prop){prop=courtFood(kind);prop.userData.biomeId='autumn';scene.add(prop);heldFoods.set(key,prop);}prop.visible=!!root?.visible;placeCourtFood(prop,actor.model,actor.carrier,{kind,drinking:kind==='coffee',time:v.elapsed});}for(const[key,prop]of heldFoods)if(!active.has(key)){prop.removeFromParent();heldFoods.delete(key);}}
 const recoveryFrame=id=>{const p=recovering.get(id);return p?{position:{x:centre[0]+p.local.x,y:p.y,z:centre[1]+p.local.z},yaw:p.yaw,walking:false,phase:'restoring-lift',reaction:{ride:true}}:null;};
 if(recovering.size)queueMicrotask(()=>{if(disposed)return;if(recovering.has('chichi'))onRecovery();void ensure();});
 return{ensure,inspect,exit,ride,updateHeld,get recovering(){return recovering.size>0;},get root(){return root;},get ready(){return!!root&&!pending&&!!appointments;},get appointments(){return appointments;},get transit(){return transit;},has:id=>recovering.has(id)||transit?.has(id)||appointments?.has(id)||false,cancel:id=>transit?.cancel(id)||appointments?.cancel(id),frame:id=>recoveryFrame(id)||transit?.frame(id)||appointments?.frame(id),transportFrame:id=>transit?.frame(id),startReady:start,get inspection(){return inspection;},get navigation(){return navigation;},get selected(){return selected;},
  pick(ray,occluder=null){if(!root?.visible)return false;const hits=ray.intersectObject(root,true);if(!hits.length)return false;if(occluder){const front=ray.intersectObject(occluder,true)[0];if(front&&front.distance<hits[0].distance)return false;}void inspect();return true;},
  update(dt,time,reduced=false){const active=getFocused()==='autumn',visible=active||getOverview(),unlocked=getGame().unlocked.includes('autumn');access.hidden=!active||!unlocked;if(active&&unlocked&&!root&&!pending&&time>=nextPreparation){nextPreparation=time+30;void ensure();}transit?.update(dt);appointments?.update(dt);const actor=getActors().find(a=>a.id==='chichi'),near=actor&&Math.hypot(actor.position.x-centre[0]-RESORT_LIFT.x,actor.position.z-centre[1]-RESORT_LIFT.z)<14&&(Math.abs(actor.position.y-RESORT_LIFT.upperY)<.65||Math.abs(actor.position.y-RESORT_LIFT.lowerY)<.65);liftButton.hidden=!active||!transit||!near||!!transit.has('chichi')||!!appointments?.has('chichi');liftButton.textContent=actor?.position.y>-80?'🪷 Спуститься в SPA':'🪷 Подняться на причал';updateResortStaff(staff,appointments,time,reduced,visible&&!pending);if(root){root.visible=visible&&!pending;if(visible){root.userData.update(time,reduced);if(appointments)updateResortPoolRipples(root,appointments.runtime.visits,time,reduced);}}},
  dispose(){disposed=true;controller.abort();access.remove();panel.remove();liftButton.remove();for(const prop of heldFoods.values())prop.removeFromParent();heldFoods.clear();journeys.clear();transit?.clear();appointments?.clear();disposeResortStaff(staff);staff=[];if(root){scene.remove(root);root.userData.dispose();root=null;}},
 };
}
