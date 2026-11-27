import {MOSA_SEA,mosaCoastFactor} from './mosasaur-data.js';
import {expandedWaterContains,expandedCoastPoint,MOSA_EXPANSION,WAREHOUSE} from './mosasaur-expansion-data.js';

// The common floor undulates five metres below its authored deep-bed level.
// A valid diver near that floor must survive reload as well as horizontal travel.
export const OCEAN_EXPLORER_MIN_Y=Math.min(-198,MOSA_EXPANSION.bedY-5,WAREHOUSE.y-5);

// Physical navigation and saved explorer poses share the actual common lagoon.
// Retain the old allowed ellipse as well, so legacy edge saves remain valid.
export function oceanWaterContains(x,z,margin=0){
 if(!Number.isFinite(x)||!Number.isFinite(z))return false;
 return Math.hypot(x/(MOSA_SEA.rx-margin),z/(MOSA_SEA.rz-margin))<=1||expandedWaterContains(x,z,MOSA_SEA,mosaCoastFactor,margin);
}
export function constrainOceanWater(p,margin=0){
 if(oceanWaterContains(p.x,p.z,margin))return false;
 const a=Math.atan2(p.z/MOSA_SEA.rz,p.x/MOSA_SEA.rx),shore=expandedCoastPoint(a,MOSA_SEA,mosaCoastFactor,-margin);
 p.x=shore.x;p.z=shore.z;return true;
}
