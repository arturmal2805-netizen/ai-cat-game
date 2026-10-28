import * as T from 'three';
import {createMagicBedHarvests,magicBedApproach} from './magic-bed-harvest.js';
import {makeBedFruit} from './magic-bed-models.js';
import {disposeScenery} from './scenery-models.js';
const basketGeometry=new T.SphereGeometry(1,12,8),basketMat=new T.MeshStandardMaterial({color:0xb99567,roughness:.88});basketGeometry.userData.sharedScenery=true;basketMat.userData.sharedScenery=true;
export function attachMagicBedInteraction(root,field,options){
 if(root.userData.harvests)return;const props=new Map(),harvests=createMagicBedHarvests(field,{...options,onPick:(index,on)=>root.userData.setPlantPicked(index,on)}),approach=magicBedApproach((a,b)=>[...(options.getBlockers?.()||[]),...(options.getActors?.('')||[]).filter(p=>Math.hypot(p.x-a.x,p.z-a.z)>.1).map(p=>({x:p.x,z:p.z,radius:p.radius})),...[...harvests.visits.values()].filter(p=>Math.hypot(p.entry.x-b.x,p.entry.z-b.z)>.1&&Math.hypot(p.entry.x-a.x,p.entry.z-a.z)>.1).map(p=>({x:p.entry.x,z:p.entry.z,radius:p.radius}))]);
 Object.assign(root.userData,{harvests,reserveHarvest:(id,r,cell)=>harvests.reserve(id,r,Date.now(),cell),releaseHarvest(id){harvests.release(id);if(!harvests.visits.size)approach.clear();const p=props.get(id);if(p){p.removeFromParent();disposeScenery(p);props.delete(id);}},approachFrame:approach.frame,approachYaw:approach.yaw,approachDuration:approach.duration,clearApproachCache:approach.clear,
 showHarvest(plan,frame){let prop=props.get(plan.catId);if(!prop){prop=new T.Group();const basket=new T.Mesh(basketGeometry,basketMat);basket.scale.set(.38,.16,.27);prop.add(basket);const fruit=makeBedFruit(plan.crop.id);fruit.scale.setScalar(.38);fruit.position.y=.25-plan.crop.height*.38;prop.add(fruit);root.add(prop);props.set(plan.catId,prop);}prop.visible=frame.carrying;const gap=plan.radius+.62;prop.position.set(frame.position[0]+Math.sin(frame.yaw)*gap,frame.position[1]+.35+plan.radius*.28,frame.position[2]+Math.cos(frame.yaw)*gap);prop.rotation.y=frame.yaw;}});
}
