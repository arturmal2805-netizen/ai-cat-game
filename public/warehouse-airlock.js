import {WAREHOUSE_ACCESS as A} from './warehouse-access-data.js';
const mix=(a,b,t)=>a+(b-a)*t;
export function createWarehouseAirlock(entering,start=null){
 const chamber={x:A.chamber.x,y:A.foot,z:A.chamber.z},outside=A.outside,inside=A.inside;
 const stages=entering?[[1.1,1,0,1,outside],[2,1,0,1,chamber],[1,0,0,1,chamber],[1.8,0,0,0,chamber],[1,0,1,0,chamber],[3.2,0,1,0,inside],[1,0,0,0,inside]]:[[1,0,1,0,inside],[3.2,0,1,0,chamber],[1,0,0,0,chamber],[1.8,0,0,1,chamber],[1,1,0,1,chamber],[2,1,0,1,outside],[1,0,0,1,outside]];
 let index=0,elapsed=0,from={outer:0,inner:0,water:entering?1:0,position:{...(start||(entering?outside:inside))}};
 const frame={...from,position:{...from.position},done:false,entering};
 return{frame,step(dt){if(frame.done)return frame;elapsed+=Math.max(0,dt);while(index<stages.length&&elapsed>=stages[index][0]){const[duration,outer,inner,water,position]=stages[index++];elapsed-=duration;from={outer,inner,water,position};}if(index===stages.length){Object.assign(frame,from,{position:{...from.position},done:true});return frame;}const[duration,outer,inner,water,position]=stages[index],u=elapsed/duration,t=u*u*(3-2*u);for(const k of ['outer','inner','water'])frame[k]=mix(from[k],{outer,inner,water}[k],t);for(const k of ['x','y','z'])frame.position[k]=mix(from.position[k],position[k],t);return frame;}};
}
