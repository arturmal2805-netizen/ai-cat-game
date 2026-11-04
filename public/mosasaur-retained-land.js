import {byItem} from './game-data.js';
import {sceneryFootprint} from './scenery-data.js';
import {MOSA_OLD_RADIUS,MOSA_SEA,mosaZoneContains} from './mosasaur-data.js';
// Derived from actual owned addresses; no purchase, new object ID or save copy.
export function wasMosaShore(x,z){return Math.hypot(x/21.5,z/20.5)>=1 && Math.hypot(x,z)<MOSA_OLD_RADIUS+.01;}
export function retainedMosaLand(items=[],records=[]){
 const pads=[];
 for(const p of [...items,...records]){
  if(p.biome!=='autumn'||p.stored||!wasMosaShore(p.x,p.z))continue;
  let dims=p.item?byItem(p.item)?.footprint:sceneryFootprint(p,p.rotation||0);
  dims=dims||[2.4,2.4];let [w,d]=dims;
  if(p.item&&(p.rotation||0)%2)[w,d]=[d,w];
  pads.push({id:p.id,x:p.x,z:p.z,w:w+1.4,d:d+1.4,yaw:0,kind:'pad'});
  const a=Math.atan2(p.x,p.z),outer=1/Math.hypot(Math.sin(a)/(MOSA_SEA.rx+2.5),Math.cos(a)/(MOSA_SEA.rz+2.5)),r=Math.hypot(p.x,p.z),length=Math.max(0,outer-r);
  pads.push({id:p.id+'-walk',x:Math.sin(a)*(r+length/2),z:Math.cos(a)*(r+length/2),w:2.4,d:length+1,yaw:a,kind:'bridge'});
 }
 return pads;
}
export const onRetainedMosaLand=(x,z,zones)=>zones.some(p=>mosaZoneContains(x,z,p));
