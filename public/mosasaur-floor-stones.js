import * as T from 'three';
import {boulderGeometry} from './showcase-geology.js';
import {MOSA_FLOOR_STONES} from './mosasaur-floor-stones-data.js';
import {applyUnderwaterLighting} from './water-shading.js';
import {applyMosasaurBedOptics} from './mosasaur-bed-optics.js';
export function* floorStoneSteps(bed){
 const root=new T.Group(),clock=bed.material.userData.waterLight.clock,level=bed.material.userData.waterLight.level,material=applyMosasaurBedOptics(applyUnderwaterLighting(new T.MeshStandardMaterial({color:0xffffff,roughness:.88}),clock,0x45c7db,{level,refract:false}),{stoneNormals:true,reefRock:true}),dummy=new T.Object3D(),up=new T.Vector3(0,1,0);
 root.name='Embedded scanned boulders and pebbles · original ready forms';
 for(let kind=0;kind<4;kind++){
  yield;const sites=MOSA_FLOOR_STONES.filter(p=>p.kind===kind),mesh=new T.InstancedMesh(boulderGeometry(kind),material,sites.length);
  for(const [i,p]of sites.entries()){dummy.position.set(p.x,p.y,p.z);dummy.quaternion.setFromUnitVectors(up,new T.Vector3(p.nx,p.ny,p.nz));dummy.quaternion.multiply(new T.Quaternion().setFromAxisAngle(up,p.yaw));dummy.scale.setScalar(p.r);dummy.updateMatrix();mesh.setMatrixAt(i,dummy.matrix);}
  mesh.instanceMatrix.needsUpdate=true;mesh.computeBoundingSphere();mesh.castShadow=mesh.receiveShadow=true;root.add(mesh);
 }
 root.userData.sites=MOSA_FLOOR_STONES;return root;
}
