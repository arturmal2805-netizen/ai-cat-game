import {RESORT_SPA as S} from './resort-spa-data.js';
// Normal room views sit inside the pressure envelope. The overview eye stays
// in the existing cleared bay, ahead of SPA, with the Mall behind the resort.
export function resortSpaView(zone=null,{sky=false}={}){
 if(sky)return{x:0,y:S.y+19.3,z:203,distance:19,azimuth:-.2,elevation:.13,fov:60};
 return zone?{x:zone.x,y:zone.y+2,z:zone.z,distance:Math.min(28,Math.max(16,zone.rz*.85)),azimuth:-.2,elevation:.13,fov:60}:{x:0,y:S.y+3,z:S.z,distance:175,azimuth:1,elevation:.8,fov:60};
}
