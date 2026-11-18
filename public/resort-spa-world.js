import {createResortAppointments} from './resort-spa-appointments.js';
import {resortSpaStaffSteps,updateResortStaff,disposeResortStaff} from './resort-spa-staff.js';
import {prepareMallArt} from './mall-art.js';
import {prepareMosaWaterReflection} from './mosasaur-water-probe.js';
import * as T from 'three';
import {resortSpaModelSteps} from './resort-spa-model.js';
import {createResortSpaNavigation} from './resort-spa-navigation.js';
import {RESORT_SPA as L,RESORT_ZONES,resortZone} from './resort-spa-data.js';
import {byBiome} from './game-data.js';
// Independent scene/camera owner. Mall's floors, selection and guest camera
// remain untouched; only the world coordinator performs the hand-off.
export function createResortSpaWorld({scene,container,getGame,getFocused,getOverview,prepare,prepareModel,onCamera,onExit,onError=()=>{},getActors=()=>[],registerCat=()=>{},canSimulate=()=>true,blocked=()=>false,onPurchase,onUse,onGoal,onComplete}){
 const centre=byBiome('autumn').center,controller=new AbortController(),buttons=new Map();let root=null,pending=null,disposed=false,inspection=false,selected=null,navigation=null,appointments=null,staff=[];
 const access=document.createElement('button');access.className='resort-spa-access';access.textContent='🪷 SPA';access.hidden=true;access.onclick=()=>inspect();(container.querySelector('.map-controls')||container).append(access);
 const panel=document.createElement('nav');panel.className='resort-spa-zones';panel.hidden=true;panel.setAttribute('aria-label','Зоны подводного SPA');container.append(panel);
 for(const zone of [null,...RESORT_ZONES]){const b=document.createElement('button');b.textContent=zone?.name||'Общий вид';b.onclick=()=>inspect(zone?.id);panel.append(b);buttons.set(zone?.id||'overview',b);}
 const close=document.createElement('button');close.textContent='Выйти из обзора';close.onclick=()=>exit();panel.append(close);
 async function ensure(){if(pending)return pending;if(root)return root;if(disposed)return null;pending=(async()=>{let model;try{await Promise.all([prepareMallArt(),prepareMosaWaterReflection()]);model=await prepare(resortSpaModelSteps(),controller.signal);if(disposed){model.userData.dispose();return null;}model.position.x=centre[0];model.position.z=centre[1];model.userData.biomeId='autumn';
   // Navigation is evaluated in ocean-local coordinates; prepare before the
   // world translation, retaining the authored floor and pool triangles.
   model.position.x=0;model.position.z=0;navigation=createResortSpaNavigation(model);model.position.x=centre[0];model.position.z=centre[1];model.updateWorldMatrix(true,true);
   await prepareModel(model);if(disposed){model.userData.dispose();return null;}scene.add(model);root=model;staff=await prepare(resortSpaStaffSteps(centre,registerCat),controller.signal);if(disposed){disposeResortStaff(staff);staff=[];return null;}for(const s of staff){await prepareModel(s.carrier);if(disposed)break;scene.add(s.carrier);}if(disposed){disposeResortStaff(staff);staff=[];return null;}appointments=createResortAppointments({getGame,getActors,getNavigation:()=>navigation,centre,canSimulate,blocked,onPurchase,onUse,onGoal,onComplete,getStaff:()=>staff});return root;
  }catch(e){if(root===model){scene.remove(root);root=null;model.userData.dispose();}else if(model&&!disposed)model.userData.dispose();disposeResortStaff(staff);staff=[];appointments=null;if(!disposed)onError(e.message);return null;}finally{pending=null;}})();return pending;}
 async function inspect(id=null){const zone=id?resortZone(id):null;if(id&&!zone)return false;if(!getGame().unlocked.includes('autumn')||!await ensure())return false;onCamera(zone,!inspection);inspection=true;selected=id;root.userData.setInspectionLevel?.(zone?.level??null);panel.hidden=false;for(const [key,b]of buttons)b.setAttribute('aria-pressed',String(key===(id||'overview')));return true;}
 function exit(restore=true){if(!inspection)return;inspection=false;root?.userData.setInspectionLevel?.(null);panel.hidden=true;selected=null;onExit(restore);}
 return{ensure,inspect,exit,get root(){return root;},get ready(){return!!root&&!pending&&!!appointments;},get appointments(){return appointments;},has:id=>appointments?.has(id)||false,cancel:id=>appointments?.cancel(id),frame:id=>appointments?.frame(id),startReady:(id,zone)=>!pending&&appointments?.start(id,zone)||false,get inspection(){return inspection;},get navigation(){return navigation;},get selected(){return selected;},
  pick(ray,occluder=null){if(!root?.visible)return false;const hits=ray.intersectObject(root,true);if(!hits.length)return false;if(occluder){const front=ray.intersectObject(occluder,true)[0];if(front&&front.distance<hits[0].distance)return false;}void inspect();return true;},
  update(dt,time,reduced=false){const active=getFocused()==='autumn',visible=active||getOverview();access.hidden=!active||!getGame().unlocked.includes('autumn');appointments?.update(dt);updateResortStaff(staff,appointments,time,reduced,visible);if(root){root.visible=visible;if(visible)root.userData.update(time,reduced);}},
  dispose(){disposed=true;controller.abort();access.remove();panel.remove();appointments?.clear();disposeResortStaff(staff);staff=[];if(root){scene.remove(root);root.userData.dispose();root=null;}},
 };
}
