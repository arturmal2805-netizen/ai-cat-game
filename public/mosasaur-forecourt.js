import {mallConstructionFootprintDistance} from './mall-layout.js';
// Navigable ocean outside the existing Mall, not a new building or interior.
// One envelope drives both the actual floor and offline rock clearance.
export const MOSA_FORECOURT=Object.freeze({x:0,z:164,rx:180,rz:72,floor:-190});
export function oceanForecourtDistance(x,z){const c=MOSA_FORECOURT;return(Math.hypot((x-c.x)/c.rx,(z-c.z)/c.rz)-1)*c.rz;}
export function oceanClearanceDistance(x,z){return Math.min(mallConstructionFootprintDistance(x,z),oceanForecourtDistance(x,z));}
export function oceanForecourtBedY(x,z,bed){
 const distance=oceanForecourtDistance(x,z);if(distance>=24)return bed;
 const t=Math.max(0,Math.min(1,(24-distance)/24)),outside=Math.max(0,Math.min(1,mallConstructionFootprintDistance(x,z)/6));
 return bed+(Math.min(bed,MOSA_FORECOURT.floor)-bed)*t*t*(3-2*t)*outside*outside*(3-2*outside);
}
