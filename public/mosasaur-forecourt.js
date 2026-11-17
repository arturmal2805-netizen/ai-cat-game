import {mallConstructionFootprintDistance} from './mall-layout.js';
// Navigable ocean outside the existing Mall, not a new building or interior.
// Keep the approved broad C2 shoulder, extending only its forward deep reach.
const APPROVED_BAY=Object.freeze({x:0,z:170,rx:192,rz:84,shoulder:36});
export const MOSA_FORECOURT=Object.freeze({x:0,z:184,rx:192,rz:98,floor:-190,shoulder:24});
const distanceTo=(c,x,z)=>(Math.hypot((x-c.x)/c.rx,(z-c.z)/c.rz)-1)*c.rz;
export function oceanForecourtDistance(x,z){return Math.min(distanceTo(APPROVED_BAY,x,z),distanceTo(MOSA_FORECOURT,x,z));}
export function oceanClearanceDistance(x,z){return Math.min(mallConstructionFootprintDistance(x,z),oceanForecourtDistance(x,z));}
function excavation(c,x,z){
 const t=Math.max(0,Math.min(1,(c.shoulder-distanceTo(c,x,z))/c.shoulder));
 return t*t*t*(t*(t*6-15)+10);
}
export function oceanForecourtBedY(x,z,bed){
 const a=excavation(APPROVED_BAY,x,z),b=excavation(MOSA_FORECOURT,x,z);
 // Bounded smooth union preserves every already-cleared point and both C2
 // edges. A plain replacement could fill the approved lateral shoulder.
 const weight=a+b-a*b;if(weight<=0)return bed;
 const outside=Math.max(0,Math.min(1,mallConstructionFootprintDistance(x,z)/6));
 return bed+(Math.min(bed,MOSA_FORECOURT.floor)-bed)*weight*outside*outside*(3-2*outside);
}
