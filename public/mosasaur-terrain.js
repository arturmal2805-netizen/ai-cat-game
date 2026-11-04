import * as T from 'three';
import {shape,line,surfaceTexture} from './fantasy-scenery.js';
import {batchModelSteps} from './model-batching.js';
import {applyUnderwaterLighting} from './water-shading.js';
import {mosaBedY,mosaNaturalBedY,MOSA_CAVE_LAYOUT,MOSA_SEA} from './mosasaur-data.js';
export const MOSA_CAVES=MOSA_CAVE_LAYOUT.map(c=>({...c,y:mosaNaturalBedY(c.x,c.z)+.7}));
export const MOSA_RUINS=[{id:'sunken-temple',x:-39,z:53,y:mosaBedY(-39,53)+.3},{id:'abyss-gate',x:12,z:-49,y:mosaBedY(12,-49)+.3}];
export function mosaTerrainObstacles(){
 const obstacles=[];
 for(const c of MOSA_CAVES){for(let row=0;row<4;row++){const z=c.z-row*4;for(let j=0;j<8;j++){const a=j*Math.PI/8,b=(j+1)*Math.PI/8;obstacles.push({id:c.id,kind:'capsule',a:[c.x+Math.cos(a)*c.radius,c.y+Math.sin(a)*c.radius,z],b:[c.x+Math.cos(b)*c.radius,c.y+Math.sin(b)*c.radius,z],radius:1.2});}}}
 for(const r of MOSA_RUINS)for(let i=0;i<8;i++){const a=i*Math.PI/4;obstacles.push({id:r.id,kind:'capsule',a:[r.x+Math.cos(a)*6,r.y,r.z+Math.sin(a)*6],b:[r.x+Math.cos(a)*6,r.y+7,r.z+Math.sin(a)*6],radius:.8});}
 return obstacles;
}
export function* mosaTerrainSteps(){
 const root=new T.Group(),source=new T.Group(),clock={value:0};root.name='Explorable ocean caves, coral terraces and ancient ruins';
 for(const c of MOSA_CAVES){
  for(let row=0;row<4;row++){yield;const z=c.z-row*4;for(let j=0;j<8;j++){const a=j*Math.PI/8,b=(j+1)*Math.PI/8;line(source,[c.x+Math.cos(a)*c.radius,c.y+Math.sin(a)*c.radius,z],[c.x+Math.cos(b)*c.radius,c.y+Math.sin(b)*c.radius,z],0x658f9b,1.2);}
   for(const side of [-1,1])shape(source,'stone',0x607b92,c.x+side*(c.radius+1),c.y+1,z,2.5,3,2.2);
  }
  // The chamber is hollow: a real opening with navigable floor, not a dark decal.
  const floor=new T.Mesh(new T.BoxGeometry(c.radius*2,.4,c.depth),new T.MeshStandardMaterial({color:0xb3c5be,map:surfaceTexture('stone'),roughness:.83}));floor.position.set(c.x,c.y-.3,c.z-c.depth/2+2);source.add(floor);
  for(let i=0;i<10;i++){const a=i*2.399;shape(source,'crystal',c.color,c.x+Math.sin(a)*(c.radius-2),c.y+1,c.z-2-i*1.2,.55,1.7+i%3*.6,.55);}
 }
 for(const r of MOSA_RUINS){yield;
  for(let i=0;i<8;i++){const a=i*Math.PI/4,x=r.x+Math.cos(a)*6,z=r.z+Math.sin(a)*6;
   shape(source,'pole',0xb4c4bd,x,r.y+3.5,z,.65,7,.65);shape(source,'cube',0xd8d7b8,x,r.y+.2,z,1.8,.5,1.8);shape(source,'cube',0xc2cbb9,x,r.y+7,z,1.8,.45,1.8);
   if(i%2===0){const stone=shape(source,'cube',0x829d91,x+1.5,r.y+.5,z+1.4,2.1,.8,1.5);stone.rotation.y=a;}
  }
  // Fallen stair blocks and the open lintel keep the temple explorable.
  for(let i=0;i<5;i++)shape(source,'cube',0xa1b6ac,r.x,r.y+.2+i*.22,r.z+9-i,6-i*.3,.4,1.1);
  line(source,[r.x-6,r.y+7,r.z],[r.x+6,r.y+7,r.z],0xc7cbb4,.65);
 }
 const baked=yield* batchModelSteps(source,{combineColors:true});root.add(baked);
 source.traverse(o=>{if(o.isMesh){if(!o.geometry.userData.sharedScenery)o.geometry.dispose();if(!o.material.userData.sharedScenery)o.material.dispose();}});
 baked.traverse(m=>{if(m.isMesh)applyUnderwaterLighting(m.material,clock,0x3fd0ed,{level:{value:MOSA_SEA.surfaceY},refract:true});});
 root.userData.obstacles=mosaTerrainObstacles();root.userData.caves=MOSA_CAVES;root.userData.ruins=MOSA_RUINS;root.userData.update=(time,reduced=false)=>{clock.value=reduced?0:time;};return root;
}
