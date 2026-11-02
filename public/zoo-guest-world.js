import * as T from 'three';
import {activeZooGuests} from './zoo-guest-visits.js';
import {zooGuestAnimal} from './zoo-guest-data.js';
import {zooGuestFrame} from './zoo-guest-motion.js';
import {zooAnimalSteps,zooJointPoint} from './zoo-animals.js';
import {prepareZooAnimalTemplates} from './zoo-model-cache.js';
import {HOUSING_ID,HOUSING_CENTER} from './housing-data.js';
// At most the 21 original animals. Pending views coalesce by durable visit ID;
// cancellation/expiry invalidates late completions. No new render loop or AI.
export function createZooGuestWorld({scene,prepare,prepareModel,working=()=>false,reduced=false}){
 const views=new Map(),pending=new Map(),retryAfter=new Map(),root=new T.Vector3();let disposed=false,current=[],lastState,lastHousing,expires=0,lastNow=0;
 function remove(key){const g=views.get(key);if(!g)return;g.removeFromParent();g.dispose();g.material.dispose();views.delete(key);}
 function sync(game,now=Date.now()){
  if(lastState===game.zoo&&lastHousing===game.housing&&now>=lastNow&&now<expires)return;
  lastState=game.zoo;lastHousing=game.housing;lastNow=now;current=activeZooGuests(game,now);
  expires=Math.min(Infinity,...Object.values(game.zoo?.guestVisits||{}).flatMap(v=>[v.startedAt,v.endsAt]).filter(t=>t>now));
  const live=new Map(current.map(v=>[v.animalId,v.id]));
  for(const [key,g]of views)if(live.get(key)!==g.userData.guestVisitId)remove(key);
  for(const [key,id]of pending)if(live.get(key)!==id)pending.delete(key);
 }
 function update(game,now,time,visible){
  if(disposed)return;sync(game,now);
  for(const record of current){
   const key=record.animalId,animal=zooGuestAnimal(key);let mesh=views.get(key);
   if(!mesh&&visible&&!pending.has(key)&&now>=(retryAfter.get(key)||0)){
    pending.set(key,record.id);
    (async()=>{let model;try{
     await prepareZooAnimalTemplates(animal.species);
     if(disposed||pending.get(key)!==record.id)return;
     model=await prepare(zooAnimalSteps(animal.exhibit,{guestIndex:animal.index}),HOUSING_ID);
     await prepareModel(model);
     if(disposed||pending.get(key)!==record.id){model.dispose();model.material.dispose();return;}
     const size=model.userData.poseData.geometry.boundingBox.getSize(new T.Vector3());model.userData.guestFit=Math.min(1.1/Math.max(1,size.y),1.15/Math.max(1,size.x),1.35/Math.max(1,size.z));
     model.userData.guestVisitId=record.id;model.userData.guestAnimalId=key;model.frustumCulled=true;
     scene.add(model);views.set(key,model);pending.delete(key);
    }catch{pending.delete(key);retryAfter.set(key,Date.now()+30000);if(model){model.dispose();model.material.dispose();}}})();
   }
   if(!mesh)continue;mesh.visible=visible;if(!visible)continue;
   const household=current.filter(v=>v.houseId===record.houseId),frame=zooGuestFrame(record,game.housing.homes[record.houseId],now,{working:working(game,record),slot:household.indexOf(record),count:household.length,bathSlot:Math.floor((now-Math.min(...household.map(v=>v.startedAt)))/144000)%household.length}),
    fit=mesh.userData.guestFit*frame.fit;
   mesh.userData.update(reduced?0:time,reduced);mesh.userData.actors[animal.index].guestBaseFrame=frame.baseFrame;mesh.userData.uniforms.uZooFrameAt.value[animal.index]=frame.baseFrame;mesh.userData.setActorPlay(animal.index,{frame:frame.frame,mix:frame.blend});
   mesh.scale.setScalar(fit);mesh.rotation.y=frame.yaw;
   zooJointPoint(mesh,'root',animal.index,mesh.userData.uniforms.uZooTime.value,root);
   root.multiplyScalar(fit).applyAxisAngle(T.Object3D.DEFAULT_UP,frame.yaw);
   mesh.position.set(HOUSING_CENTER[0]+frame.position.x-root.x,frame.position.y-root.y,HOUSING_CENTER[1]+frame.position.z-root.z);
   mesh.userData.guestActivity=frame.kind;
  }
 }
 return {views,sync,update,get active(){return current;},dispose(){disposed=true;pending.clear();retryAfter.clear();for(const key of [...views.keys()])remove(key);}};
}
