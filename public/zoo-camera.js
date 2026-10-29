import * as T from 'three';
import {ZOO_BIOME,zooFacing} from './zoo-data.js';
import {attractionCameraView,randomCameraCat} from './camera-views.js';
// The ordinary attraction fit retains the whole habitat on portrait phones,
// while an elevated front view reveals the ground, tank and actual tree jumps.
export function zooEnclosureCameraView(exhibit,fov,aspect){
 const [cx,cz]=ZOO_BIOME.center,r=exhibit.radius+.45,h=exhibit.species==='gorilla'?7:exhibit.species==='elephant'?5:4.5;
 return attractionCameraView(new T.Box3(new T.Vector3(cx+exhibit.x-r,-.4,cz+exhibit.z-r),new T.Vector3(cx+exhibit.x+r,h,cz+exhibit.z+r)),fov,aspect,zooFacing(exhibit),.72);
}
export function zooCameraGuests(actors){
 const [cx,cz]=ZOO_BIOME.center;
 return [...actors].filter(a=>!a.staff&&a.position&&Math.hypot(a.position.x-cx,a.position.z-cz)<ZOO_BIOME.radius-.2).map(a=>({id:a.id}));
}
export const randomZooCameraGuest=(actors,previous,random=Math.random)=>randomCameraCat(zooCameraGuests(actors),previous,random)?.id||null;
