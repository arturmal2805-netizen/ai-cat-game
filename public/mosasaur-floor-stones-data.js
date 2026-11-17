import {SEABED_REEF_GARDENS} from './mosasaur-seabed-patch-data.js';
import {mosaReefClearance} from './mosasaur-reef-data.js';
import {mosaBedY,mosaWaterRadius} from './mosasaur-data.js';
// Ready boulder forms are embedded into the real slope. These exact centres
// also drive the existing capsule collision system; no decorative duplicate.
export const MOSA_FLOOR_STONES=Object.freeze(SEABED_REEF_GARDENS.flatMap((garden,gardenIndex)=>Array.from({length:18},(_,i)=>{
 const side=i%2?1:-1,row=Math.floor(i/2),x=garden.x+garden.rx/10*side*(row<3?8:4.8+(row%3)*1.0+(row>=6?.8:0)),z=garden.z+garden.rz/8*(row<3?(row-1)*3:((row%3)-1)*5.6+(row>=6?.8:0)),r=row<3?.75+(i%3)*.2:.18+(i%4)*.07,e=.05;
 const dx=(mosaBedY(x+e,z)-mosaBedY(x-e,z))/(2*e),dz=(mosaBedY(x,z+e)-mosaBedY(x,z-e))/(2*e),length=Math.hypot(dx,1,dz),nx=-dx/length,ny=1/length,nz=-dz/length;
 return Object.freeze({id:gardenIndex?'seabed-stone-g'+gardenIndex+'-'+i:'seabed-stone-'+i,x:Math.fround(x+nx*r*.15),y:Math.fround(mosaBedY(x,z)+ny*r*.15),z:Math.fround(z+nz*r*.15),nx,ny,nz,r,kind:i%4,yaw:i*2.399963});
}).filter(p=>!gardenIndex||(p.ny>.5&&mosaWaterRadius(p.x,p.z)<.95&&mosaReefClearance(p.x,p.y+p.r*.4,p.z)>p.r*1.25+1.2))));
export const floorStoneObstacles=()=>MOSA_FLOOR_STONES.map(p=>({id:p.id,kind:'capsule',a:[p.x,p.y,p.z],b:[p.x,p.y,p.z],radius:p.r*1.25}));
