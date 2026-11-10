import {mosaBedY,mosaNaturalBedY,MOSA_CAVE_LAYOUT,MOSA_REEF_TERRACES} from './mosasaur-data.js';
import {mosaReefSurfaceY} from './mosasaur-reef-data.js';
export const MOSA_CAVES=MOSA_CAVE_LAYOUT.map(c=>({...c,y:mosaNaturalBedY(c.x,c.z)+.7}));
export const MOSA_RUINS=[{id:'sunken-temple',x:-39,z:53,y:mosaBedY(-39,53)+.3},{id:'abyss-gate',x:12,z:-49,y:mosaBedY(12,-49)+.3}];
export const MOSA_REEF_ARCHES=MOSA_REEF_TERRACES.filter((_,i)=>i%4===0).map((c,i)=>({id:'living-reef-arch-'+i,x:c.x,z:c.z,radius:8.5,depth:3.5,y:mosaBedY(c.x,c.z)+.25}));
export const MOSA_GUARDIAN=(()=>{const c=MOSA_REEF_TERRACES[3];return {id:'sunken-guardian',x:c.x+2,z:c.z-2,y:mosaReefSurfaceY(c.x+2,c.z-2),radius:3.5,height:9};})();
export function mosaTerrainObstacles(){
 const obstacles=[];
 for(const c of MOSA_CAVES){for(let row=0;row<4;row++){const z=c.z-row*4;for(let j=0;j<8;j++){const a=j*Math.PI/8,b=(j+1)*Math.PI/8;obstacles.push({id:c.id,kind:'capsule',a:[c.x+Math.cos(a)*c.radius,c.y+Math.sin(a)*c.radius,z],b:[c.x+Math.cos(b)*c.radius,c.y+Math.sin(b)*c.radius,z],radius:1.2});}}}
 for(const r of MOSA_RUINS)for(let i=0;i<8;i++){const a=i*Math.PI/4;obstacles.push({id:r.id,kind:'capsule',a:[r.x+Math.cos(a)*6,r.y,r.z+Math.sin(a)*6],b:[r.x+Math.cos(a)*6,r.y+7,r.z+Math.sin(a)*6],radius:.8});}
 for(const c of MOSA_REEF_ARCHES)for(let j=0;j<16;j++){const a=j*Math.PI/16,b=(j+1)*Math.PI/16;obstacles.push({id:c.id,kind:'capsule',a:[c.x+Math.cos(a)*c.radius,c.y+Math.sin(a)*c.radius,c.z],b:[c.x+Math.cos(b)*c.radius,c.y+Math.sin(b)*c.radius,c.z],radius:2.1});}
 const p=MOSA_GUARDIAN;obstacles.push({id:p.id,kind:'capsule',a:[p.x,p.y,p.z],b:[p.x,p.y+p.height,p.z],radius:p.radius});
 return obstacles;
}
