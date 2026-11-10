import {MOSA_SEA,MOSA_REEF_TERRACES,MOSA_HORIZONTAL_EXPANSION,mosaNaturalBedY,mosaBedY,mosaTerraceY} from './mosasaur-data.js';
const forms=[
 {volumes:[[-1,7,0,18,12,15],[-2,22,-1,12,23,11],[1,36,-1,10,5.5,9],[-7,25,5,10,6,9],[9,16,-5,7,18,7]],caves:[[6,17,10,7,5.3,12]]},
 {volumes:[[-2,6,1,17,12,17],[-5,21,-2,10,21,11],[-6,36,-2,8,6,9],[7,25,1,8,15,9],[9,37,2,6,4.5,7],[-7,15,10,10,7,7]],caves:[[0,20,0,4.5,5.5,22]]},
 {volumes:[[0,7,0,18,13,15],[1,22,0,13,21,12],[0,36,1,11,5,9],[-12,16,-1,7,15,9],[10,26,-6,7,7,9],[4,16,10,12,6,8]],caves:[[7,16,12,7,6,13],[-8,11,-10,6,4.5,10]]}
];
export const MOSA_REEF_FORMS=forms;
function rawField(x,y,z,kind){
 const authoredX=x,authoredZ=z;x+=.55*Math.sin(y*.16+z*.18);z+=.48*Math.cos(authoredX*.19-y*.11);
 let d=1e6;for(const v of forms[kind].volumes){const q=(Math.hypot((x-v[0])/v[3],(y-v[1])/v[4],(z-v[2])/v[5])-1)*Math.min(v[3],v[4],v[5]),k=1.25,h=Math.max(0,Math.min(1,.5+.5*(q-d)/k));d=q*(1-h)+d*h-k*h*(1-h);}
 // Erosion exists in the actual surface/collider, in three dimensions. Fine
 // porosity comes from the shared stone charts rather than huge triangle grids.
 d+=.38*Math.sin(x*.73+Math.sin(y*.24))*Math.cos(z*.61-y*.16)+.14*Math.sin(y*2.1+x*.43)*Math.cos(z*1.3-x*.2);
 // Broad fracture faces interrupt rounded masses. Each layer erodes on a
 // different plane; the result has real ledges and sharp broken stone edges.
 for(let j=0;j<7;j++){const a=j*Math.PI*2/7+kind*.37,limit=12.8+(j%3)*1.2+1.1*Math.sin(y*.19+j*1.7)+.22*Math.sin(y*1.1+j);d=Math.max(d,(x*Math.cos(a)+z*Math.sin(a)-limit)*.82);}
 d=Math.max(d,y-40-.32*Math.sin(x*.4)*Math.cos(z*.3));
 for(const c of forms[kind].caves){const cut=(1-Math.hypot((x-c[0]+.45*Math.sin(z*.22))/c[3],(y-c[1]+.32*Math.sin(x*.31))/c[4],(z-c[2])/c[5]))*Math.min(c[3],c[4],c[5]);d=Math.max(d,cut);}
 return d;
}
export function reefLocalField(kind,p,out){const d=rawField(p[0],p[1],p[2],kind);if(out){const e=.02;out[0]=(rawField(p[0]+e,p[1],p[2],kind)-rawField(p[0]-e,p[1],p[2],kind))/(2*e);out[1]=(rawField(p[0],p[1]+e,p[2],kind)-rawField(p[0],p[1]-e,p[2],kind))/(2*e);out[2]=(rawField(p[0],p[1],p[2]+e,kind)-rawField(p[0],p[1],p[2]-e,kind))/(2*e);}return d;}
export const MOSA_REEF_INSTANCES=MOSA_REEF_TERRACES.map((c,i)=>{
 let base=mosaNaturalBedY(c.x,c.z);for(let j=0;j<12;j++)base=Math.min(base,mosaNaturalBedY(c.x+Math.cos(j*Math.PI/6)*c.radius*1.9,c.z+Math.sin(j*Math.PI/6)*c.radius*1.9));base-=2;
 const depth=[7,28,53,17,8,43,66,26,9,54,34,23][i],radius=c.radius*[1.42,1.18,1.54,1.3,1.43,1.28,1.46,1.39,1.37,1.44,1.47,1.32][i],top=MOSA_SEA.surfaceY-depth;return {...c,depth,radius,kind:i%3,base,top,scaleXZ:radius/10,scaleY:(top-base)/40,yaw:Math.atan2(-c.x,-c.z)};
});
export function reefSolidDistance(c,x,y,z){const dx=x-c.x,dz=z-c.z,cs=Math.cos(c.yaw),sn=Math.sin(c.yaw);return rawField((dx*cs-dz*sn)/c.scaleXZ,(y-c.base)/c.scaleY,(dx*sn+dz*cs)/c.scaleXZ,c.kind)*Math.min(c.scaleXZ,c.scaleY);}
export function mosaReefDistance(x,y,z){let d=Infinity;for(const c of MOSA_REEF_INSTANCES){const bx=Math.max(0,Math.abs(x-c.x)-c.radius*2.2),bz=Math.max(0,Math.abs(z-c.z)-c.radius*2.2),by=Math.max(0,c.base-c.scaleY*6-y,y-c.top-c.scaleY*7),bound=Math.hypot(bx,by,bz);d=Math.min(d,bound>4?bound:reefSolidDistance(c,x,y,z));}return d;}
export function mosaReefClearance(x,y,z){const d=mosaReefDistance(x,y,z);if(d>=4)return d;const e=.05,gx=(mosaReefDistance(x+e,y,z)-mosaReefDistance(x-e,y,z))/(2*e),gy=(mosaReefDistance(x,y+e,z)-mosaReefDistance(x,y-e,z))/(2*e),gz=(mosaReefDistance(x,y,z+e)-mosaReefDistance(x,y,z-e))/(2*e);return d/Math.max(.15,Math.hypot(gx,gy,gz))*.8;}
export function mosaReefSurfaceY(x,z){
 let highest=mosaBedY(x,z);for(const c of MOSA_REEF_INSTANCES){if(Math.hypot(x-c.x,z-c.z)>c.radius*2.2)continue;let y=c.top+c.scaleY*7;
  for(let i=0;i<180&&y>highest;i++){const d=reefSolidDistance(c,x,y,z);if(d<.02){highest=y;break;}y-=Math.min(3,Math.max(.015,d*.45));}
 }return highest;
}
export function reefWallSite(c,angle,level){
 const cs=Math.cos(c.yaw),sn=Math.sin(c.yaw),lx=Math.cos(angle),lz=Math.sin(angle),dx=lx*cs+lz*sn,dz=-lx*sn+lz*cs,y=c.base+(c.top-c.base)*level;
 // Roots follow the visible union of neighbouring cliffs AND the real bed;
 // anchoring only to one overlapping template can bury plants in its neighbour.
 const solid=(x,y,z)=>Math.min(mosaReefDistance(x,y,z),y-mosaBedY(x,z));
 let r=c.radius*2.4,open=false;for(let i=0;i<240&&r>0;i++){
  const x=c.x+dx*r,z=c.z+dz*r,d=solid(x,y,z);
  if(!open){if(d>.04)open=true;else{r-=.5;continue;}}
  if(d<.02){const e=.04,nx=solid(x+e,y,z)-solid(x-e,y,z),ny=solid(x,y+e,z)-solid(x,y-e,z),nz=solid(x,y,z+e)-solid(x,y,z-e),length=Math.hypot(nx,ny,nz)||1;return {x,y,z,nx:nx/length,ny:ny/length,nz:nz/length};}
  r-=Math.min(2,Math.max(.02,d*.45));
 }return null;
}
export const MOSA_OPTICAL_GRID_SIZE=128,MOSA_OPTICAL_GRID_EXTENT=116*MOSA_HORIZONTAL_EXPANSION;
let opticalGrid=null;
let coralSites=null;
const schoolStates=new Map();
export const reefSchoolStates=index=>schoolStates.get(index);
export function installReefSchoolStates(index,states){schoolStates.set(index,states);}
export const reefCoralSites=()=>coralSites;
export function installReefCoralSites(sites){coralSites=sites;}
export function installMosaReefOpticalGrid(grid){if(grid.length!==MOSA_OPTICAL_GRID_SIZE**2)throw Error('Invalid reef depth grid');opticalGrid=grid;}
export function mosaOpticalBedY(x,z){
 if(!opticalGrid){const natural=mosaBedY(x,z);let y=natural;for(const c of MOSA_REEF_TERRACES)y=Math.max(y,mosaTerraceY(c,x,z,natural));return y;}
 const n=MOSA_OPTICAL_GRID_SIZE,u=Math.max(0,Math.min(n-1,(x/MOSA_OPTICAL_GRID_EXTENT*.5+.5)*(n-1))),v=Math.max(0,Math.min(n-1,(z/MOSA_OPTICAL_GRID_EXTENT*.5+.5)*(n-1))),ix=Math.min(n-2,Math.floor(u)),iz=Math.min(n-2,Math.floor(v)),a=u-ix,b=v-iz,k=iz*n+ix;
 return (opticalGrid[k]*(1-a)+opticalGrid[k+1]*a)*(1-b)+(opticalGrid[k+n]*(1-a)+opticalGrid[k+n+1]*a)*b;
}
