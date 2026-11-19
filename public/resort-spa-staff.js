import * as T from 'three';
import {createCat,animateCat,reactCat,disposeCat} from './cat-model.js';
import {catAppearance} from './cat-breeds.js';
import {NEIGHBORS} from './game-data.js';
import {resortZone,resortSpaSeat} from './resort-spa-data.js';
// Service workers reuse the approved native rig and the same registration /
// disposal path as Mall staff. Never duplicate a player's controlled Chichi.
export function* resortSpaStaffSteps(centre,registerCat=()=>{},contract=null){
 const zoneFor=contract?.zone||resortZone,seatFor=contract?.seat||resortSpaSeat,staff=[],zone=zoneFor('resort-massage');
 for(let i=0;i<6;i++){
  yield;const contact=seatFor(zone,i),cat=createCat('happy',{detail:'npc',...catAppearance(NEIGHBORS[i%NEIGHBORS.length])});cat.scale.setScalar(.63);registerCat(cat);
  const carrier=new T.Group();carrier.add(cat);carrier.position.set(centre[0]+contact.staff.x,contact.staff.y,centre[1]+contact.staff.z);carrier.rotation.y=-Math.PI/2;carrier.userData.biomeId='autumn';staff.push({id:'resort-therapist-'+i,position:{...contact.staff},carrier,cat});
 }
 yield;const cafe=zoneFor('resort-cafe'),cat=createCat('happy',{detail:'npc',...catAppearance(NEIGHBORS[1])});cat.scale.setScalar(.63);registerCat(cat);const carrier=new T.Group(),position={x:0,y:cafe.y+.012,z:209.9};carrier.add(cat);carrier.position.set(centre[0]+position.x,position.y,centre[1]+position.z);carrier.userData.biomeId='autumn';staff.push({id:'resort-barista-0',role:'barista',position,carrier,cat});
 return staff;
}
export function updateResortStaff(staff,appointments,time,reduced,visible){for(const s of staff){s.carrier.visible=visible;if(!visible)continue;animateCat(s.cat,time,false,reduced);if(s.role==='barista')reactCat(s.cat,{ride:true,paw:.12+Math.sin(time*1.8)*.07,headPitch:.1,headYaw:Math.sin(time*.4)*.12},reduced);else if(appointments?.staffOwner(s.id))reactCat(s.cat,{ride:true,paw:.25+Math.sin(time*2.4)*.16,headPitch:.22,earRelax:.08},reduced);}}
export function disposeResortStaff(staff){for(const s of staff){s.carrier.removeFromParent();disposeCat(s.cat);}}
