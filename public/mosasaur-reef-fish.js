import * as T from 'three';
import {createMosaFish} from './mosasaur-fish.js';
import {MOSA_REEF_INSTANCES,mosaReefSurfaceY,reefSchoolStates,installReefSchoolStates} from './mosasaur-reef-data.js';
export function reefFishSchoolStates(index){
 const cached=reefSchoolStates(index);if(cached)return cached;
 const c=MOSA_REEF_INSTANCES[index],states=[];
 for(let i=0;i<48;i++){
  const radius=3.5+i%6*.6,cx=c.x+Math.cos(c.angle)*c.radius*.35,cz=c.z+Math.sin(c.angle)*c.radius*.35;let peak=-Infinity;
  for(let j=0;j<32;j++)peak=Math.max(peak,mosaReefSurfaceY(cx+Math.cos(j*Math.PI/16)*radius,cz+Math.sin(j*Math.PI/16)*radius));
  states.push({index:i,phase:i*2.399,radius,cx,cz,rx:1,rz:1,speed:(i%2?1:-1)*(.13+i%4*.018),depth:Math.min(-1.5,peak+1.4+i%3*.20),scale:.72+i%4*.15});
 }installReefSchoolStates(index,states);return states;
}
export function createReefFishSchools(){
 const root=new T.Group(),schools=[];root.name='Three living tropical reef fish schools';
 for(const index of [3,7,11]){const school=createMosaFish({school:reefFishSchoolStates(index)});root.add(school);schools.push(school);}
 root.userData.schools=schools;root.userData.fishCount=144;root.userData.update=(time,reduced=false)=>{for(const school of schools)school.userData.update(time,reduced);};return root;
}
