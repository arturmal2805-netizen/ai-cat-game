import * as T from 'three';
import {MOSA_REEF_INSTANCES} from './mosasaur-reef-data.js';
import {mosaReefTemplateSteps,mosaReefLods} from './mosasaur-reef-sculpt.js';
import {applyMosasaurBedOptics} from './mosasaur-bed-optics.js';
import {applyUnderwaterLighting} from './water-shading.js';
import {waterSandTexture} from './water-sand.js';
import {MOSA_SEA} from './mosasaur-data.js';
export function* mosaRockReefSteps(){
 const root=new T.Group(),clock={value:0},variants=new Map(),material=applyMosasaurBedOptics(applyUnderwaterLighting(new T.MeshStandardMaterial({color:0xffffff,vertexColors:true,map:waterSandTexture(),roughness:.88}),clock,0x45c7db,{level:{value:MOSA_SEA.surfaceY}}),{stoneNormals:true,reefRock:true});root.name='Continuous eroded reef cliffs, overhangs and navigable grottoes';
 for(const c of MOSA_REEF_INSTANCES){
  yield;const g=yield* mosaReefTemplateSteps(c.kind);if(!variants.has(c.kind))variants.set(c.kind,mosaReefLods(c.kind,g));
  const lod=new T.LOD();lod.position.set(c.x,c.base+20*c.scaleY,c.z);lod.rotation.y=c.yaw;lod.scale.set(c.scaleXZ,c.scaleY,c.scaleXZ);root.add(lod);
  for(const [i,distance]of [0,90,220].entries()){const mesh=new T.Mesh(variants.get(c.kind)[i],material);mesh.position.y=-20;mesh.castShadow=mesh.receiveShadow=true;lod.addLevel(mesh,distance,.08);}
 }
 root.userData.instances=MOSA_REEF_INSTANCES;root.userData.update=(time,reduced=false)=>{clock.value=reduced?0:time;};return root;
}
