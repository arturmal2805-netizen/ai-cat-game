import {WAREHOUSE_REEFS} from './mosasaur-expansion-data.js';
import * as T from 'three';
import {boulderGeometry} from './showcase-geology.js';
import {mosaCoralSteps} from './mosasaur-corals.js';
import {createMosaFish} from './mosasaur-fish.js';
import {applyUnderwaterLighting} from './water-shading.js';
import {applyMosasaurBedOptics} from './mosasaur-bed-optics.js';
import {expansionBedY} from './mosasaur-expansion.js';
// Spatial reef pockets keep the main cross-lagoon sight line genuinely open.
const pockets=WAREHOUSE_REEFS.map(p=>[p.x,p.z]);
export function* warehouseHabitatSteps(){
 const root=new T.Group(),dummy=new T.Object3D(),clock={value:0};root.name='Warehouse outer reef gardens · open water between venues';
 const stone=applyMosasaurBedOptics(applyUnderwaterLighting(new T.MeshStandardMaterial({color:0xffffff,roughness:.88}),clock,0x45c7db,{level:{value:.155},refract:false}),{stoneNormals:true,reefRock:true});
 for(let cell=0;cell<pockets.length;cell++){
  yield;const [cx,cz]=pockets[cell],mesh=new T.InstancedMesh(boulderGeometry(cell%4),stone,9);mesh.name='Embedded reef pocket '+cell;
  for(let i=0;i<9;i++){const a=i*2.399,r=10+i%3*9,x=cx+Math.cos(a)*r,z=cz+Math.sin(a)*r,s=4+i%4*2;dummy.position.set(x,expansionBedY(x,z)+s*.3,z);dummy.rotation.set(.1*Math.sin(a),a,.15*Math.cos(a));dummy.scale.set(s,s*.65,s*.85);dummy.updateMatrix();mesh.setMatrixAt(i,dummy.matrix);}
  mesh.instanceMatrix.needsUpdate=true;mesh.computeBoundingSphere();mesh.castShadow=mesh.receiveShadow=true;root.add(mesh);
 }
 const sites=[];for(let cell=0;cell<pockets.length;cell++){const[cx,cz]=pockets[cell];for(let i=0;i<48;i++){const a=i*2.399963,r=18+Math.sqrt(i/48)*45,x=cx+Math.cos(a)*r,z=cz+Math.sin(a)*r,y=expansionBedY(x,z);if(y> -8)continue;sites.push({id:'warehouse-reef-'+cell+'-'+i,x,y:y+.05,z,form:[0,1,2,3,5,6,7,9,10][i%9],scale:1.4+i%5*.55,yaw:a,nx:0,ny:1,nz:0});}}
 const corals=yield* mosaCoralSteps({sitesOverride:sites,lodDistances:[0,15,90],seabedFar:true});root.add(corals);
 const school=[];for(let i=0;i<60;i++){const j=Math.floor(i/20),cx=[870,1270,1435][j],cz=[500,500,325][j];school.push({cx,cz,phase:i*2.399,radius:1+(i%6)*.06,rx:28,rz:16,speed:.055+j*.008,depth:-130+i%5*.8,scale:.9+i%3*.15});}
 const fish=createMosaFish({deep:true,school});root.add(fish);
 root.userData={colonies:sites.length,fishCount:school.length,reefPockets:pockets.length,update(time,reduced=false){clock.value=reduced?0:time;corals.userData.update(time,reduced);fish.userData.update(time,reduced);}};return root;
}
