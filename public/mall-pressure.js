// Exterior collision only. Interior visitors use the measured room navigation;
// water vehicles/sea life must remain outside the sealed glass volumes.
import {MALL_LAYOUT as L,mallBuildingFootprintDistance,roundedMallRectDistance} from './mall-layout.js';
const top=L.y+L.rise*6+7.7;
const extrude=(horizontal,vertical)=>Math.hypot(Math.max(horizontal,0),Math.max(vertical,0))+Math.min(Math.max(horizontal,vertical),0);
const vertical=(y,lo,hi)=>Math.max(lo-y,y-hi);
function dome(x,y,z,cx,cz,radius,height){const q=Math.hypot((x-cx)/radius,(y-top)/height,(z-cz)/radius);return Math.max((q-1)*Math.min(radius,height),top-y);}
export function mallPressureDistance(x,y,z){
 let d=extrude(mallBuildingFootprintDistance(x,z),vertical(y,L.y-.5,top));
 d=Math.min(d,dome(x,y,z,0,L.z,59.6,28));
 for(const w of L.wings)d=Math.min(d,dome(x,y,z,w.x,w.z,31,28*31/59.6));
 d=Math.min(d,extrude(Math.hypot(x-L.lift.x,z-L.lift.z)-L.lift.radius,vertical(y,L.y-.5,.5)));
 for(const p of L.pavilions){
  const base=L.y+(p.floor-1)*L.rise,h=p.radius*.34;
  d=Math.min(d,extrude(Math.hypot(x-p.x,z-p.z)-p.radius,vertical(y,base-.6,base+7.5)));
  d=Math.min(d,Math.max((Math.hypot((x-p.x)/p.radius,(y-base-7.5)/h,(z-p.z)/p.radius)-1)*h,base+7.5-y));
  const radial=Math.hypot(x-p.x,z-p.z);d=Math.min(d,extrude(Math.max(radial-p.roofRadius,p.radius-.8-radial),vertical(y,base+7.64,base+7.76)));
  for(let j=0;j<4;j++){const a=j*Math.PI/2+Math.PI/4,cx=p.x+Math.cos(a)*12.5,cz=p.z+Math.sin(a)*12.5;d=Math.min(d,extrude(Math.hypot(x-cx,z-cz)-.4,vertical(y,L.y-4.5,base-.4)));}
  const a=p.connection,dx=p.x-a.x,dz=p.z-a.z,length=Math.hypot(dx,dz),mx=(p.x+a.x)/2,mz=(p.z+a.z)/2;
  const along=((x-mx)*dx+(z-mz)*dz)/length,across=(-(x-mx)*dz+(z-mz)*dx)/length;
  d=Math.min(d,extrude(roundedMallRectDistance(along,across,{x:0,z:0,w:length,d:8,corner:0}),vertical(y,base-.35,base+7.1)));
 }
 return d;
}
export function mallPressureContact(x,y,z,radius=1.25){
 const d=mallPressureDistance(x,y,z);if(d>radius*2)return null;
 const e=.05,gx=(mallPressureDistance(x+e,y,z)-mallPressureDistance(x-e,y,z))/(2*e),gy=(mallPressureDistance(x,y+e,z)-mallPressureDistance(x,y-e,z))/(2*e),gz=(mallPressureDistance(x,y,z+e)-mallPressureDistance(x,y,z-e))/(2*e),g=Math.hypot(gx,gy,gz);
 if(g<1e-6)return null;const clearance=d/g;if(clearance>=radius)return null;
 return{nx:gx/g,ny:gy/g,nz:gz/g,depth:radius-clearance};
}
