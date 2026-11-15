import {MALL_LAYOUT as L,mallBuildingFootprintDistance} from './mall-layout.js';

// Camera clearance only. Navigation uses the original radii and box footprints.
// These vertical limits come from the same original meshes before batching.
export function mallCameraRayClear(a,b,boxes,radius=.3){
 const nearby=new Set();
 if(boxes.cells){
  for(let x=Math.floor(Math.min(a.x,b.x)/4);x<=Math.floor(Math.max(a.x,b.x)/4);x++)for(let z=Math.floor(Math.min(a.z,b.z)/4);z<=Math.floor(Math.max(a.z,b.z)/4);z++)for(const box of boxes.cells.get(x+','+z)||[])nearby.add(box);
 }else for(const box of boxes)nearby.add(box);
 for(const box of nearby){
  const ax=a.x-box.x,az=a.z-box.z,bx=b.x-box.x,bz=b.z-box.z;
  const start=[ax*box.c+az*box.s,a.y,-ax*box.s+az*box.c],end=[bx*box.c+bz*box.s,b.y,-bx*box.s+bz*box.c];
  const lo=[-box.hx-radius,(box.minY??0)-radius,-box.hz-radius],hi=[box.hx+radius,(box.maxY??2.15)+radius,box.hz+radius];
  let enter=0,exit=1;
  for(let i=0;i<3;i++){
   const delta=end[i]-start[i];if(Math.abs(delta)<1e-9){if(start[i]<lo[i]||start[i]>hi[i]){enter=2;break;}continue;}
   const p=(lo[i]-start[i])/delta,q=(hi[i]-start[i])/delta;enter=Math.max(enter,Math.min(p,q));exit=Math.min(exit,Math.max(p,q));if(enter>exit)break;
  }
  if(enter<=exit)return false;
 }
 return true;
}
const angles=[0,Math.PI/12,-Math.PI/12,Math.PI/6,-Math.PI/6,Math.PI/4,-Math.PI/4,Math.PI/3,-Math.PI/3,Math.PI/2,-Math.PI/2];
export function mallGuestCameraEye(target,desired,boxes,inside=()=>true){
 const dx=desired.x-target.x,dz=desired.z-target.z;
 // Prefer the authored front view, then the nearest side view at the same low
 // angle. A short orbit is allowed; there is no ceiling-view fallback.
 for(const scale of [1,.85,.7])for(const angle of angles){
  const c=Math.cos(angle),s=Math.sin(angle),candidate={x:target.x+(dx*c-dz*s)*scale,y:target.y+(desired.y-target.y)*scale,z:target.z+(dx*s+dz*c)*scale};
  if(inside(candidate)&&mallCameraRayClear(target,candidate,boxes))return candidate;
 }
 return null;
}

export function mallGuestCameraInside(floor,p){
 if(p.y<=.3||p.y>=L.rise-.3)return false;
 const z=p.z+L.z;
 if(mallBuildingFootprintDistance(p.x,z)<-.3)return true;
 for(const pavilion of L.pavilions)if(pavilion.floor===floor){
  if(Math.hypot(p.x-pavilion.x,z-pavilion.z)<pavilion.radius-.3)return true;
  const a=pavilion.connection,dx=pavilion.x-a.x,dz=pavilion.z-a.z,length=Math.hypot(dx,dz),mx=(pavilion.x+a.x)/2,mz=(pavilion.z+a.z)/2;
  if(Math.abs(((p.x-mx)*dx+(z-mz)*dz)/length)<length/2&&Math.abs((-(p.x-mx)*dz+(z-mz)*dx)/length)<3.7)return true;
 }
 return false;
}
