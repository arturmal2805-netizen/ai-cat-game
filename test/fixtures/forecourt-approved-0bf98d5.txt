import {mallConstructionFootprintDistance} from './mall-layout.js';
// Navigable ocean outside the existing Mall, not a new building or interior.
// One envelope drives both the actual floor and offline rock clearance.
// Expand only the front bay; the C2 shoulder removes the hard rim without
// changing the Mall foundation, shore or existing water/geometry budgets.
export const MOSA_FORECOURT=Object.freeze({x:0,z:170,rx:192,rz:84,floor:-190,shoulder:36});
export function oceanForecourtDistance(x,z){const c=MOSA_FORECOURT;return(Math.hypot((x-c.x)/c.rx,(z-c.z)/c.rz)-1)*c.rz;}
export function oceanClearanceDistance(x,z){return Math.min(mallConstructionFootprintDistance(x,z),oceanForecourtDistance(x,z));}
export function oceanForecourtBedY(x,z,bed){
 const distance=oceanForecourtDistance(x,z);if(distance>=MOSA_FORECOURT.shoulder)return bed;
 const t=Math.max(0,Math.min(1,(MOSA_FORECOURT.shoulder-distance)/MOSA_FORECOURT.shoulder)),outside=Math.max(0,Math.min(1,mallConstructionFootprintDistance(x,z)/6));
 return bed+(Math.min(bed,MOSA_FORECOURT.floor)-bed)*t*t*t*(t*(t*6-15)+10)*outside*outside*(3-2*outside);
}
