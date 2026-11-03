import * as T from 'three';
const cache=new WeakMap();
// One immutable swept-volume table per original route, built cooperatively.
// Vegetation beside curved banks must be tested in 3D, not against a wide XY
// box which rejected even plants well outside the occupied flume.
export function* gardenClearanceSteps(route,spec){
 if(cache.has(route))return cache.get(route);const segments=[];
 const sample=(fn,t,cat)=>{const f=fn(t);if(!cat&&(f.walking||!f.seatBlend))return null;const p=new T.Vector3(...f.position);if(cat)p.add(new T.Vector3(0,1.6,0).applyQuaternion(new T.Quaternion().fromArray(f.quaternion)));return p;};
 for(const [fn,radius,cat]of [...route.lanes.map(l=>[l.frame,3.2,true]),[route.vehicleFrame,spec.radius+.2,false]]){
  let previous=sample(fn,0,cat);
  for(let t=.2;t<route.duration+.2;t+=.2){const p=sample(fn,Math.min(t,route.duration),cat);if(previous&&p){const delta=p.clone().sub(previous);segments.push(previous.x,previous.y,previous.z,delta.x,delta.y,delta.z,1/Math.max(1e-12,delta.lengthSq()),radius);}previous=p;if(segments.length%512===0)yield;}
 }
 const data=new Float32Array(segments),clear=(x,y,z,radius)=>{
  for(let i=0;i<data.length;i+=8){const dx=x-data[i],dy=y-data[i+1],dz=z-data[i+2],u=Math.max(0,Math.min(1,(dx*data[i+3]+dy*data[i+4]+dz*data[i+5])*data[i+6])),r=radius+data[i+7]+.5;
   if((dx-data[i+3]*u)**2+(dy-data[i+4]*u)**2+(dz-data[i+5]*u)**2<r*r)return false;
  }return true;
 };
 cache.set(route,clear);return clear;
}
