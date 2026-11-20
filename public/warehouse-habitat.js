import {WAREHOUSE_REEFS} from './mosasaur-expansion-data.js';
import {mosaCoralSteps} from './mosasaur-corals.js';
import {createMosaFish} from './mosasaur-fish.js';
import * as T from 'three';
import {expansionBedY} from './mosasaur-expansion.js';
// Spatial reef pockets keep the main cross-lagoon sight line genuinely open.
const pockets=WAREHOUSE_REEFS.map(p=>[p.x,p.z]);
export function* warehouseHabitatSteps(){
 const root=new T.Group();root.name='Warehouse seabed coral gardens · cleared open water';
 // No raised mounds or their 72 crown boulders. Keep the original living coral
 // and fish identities; coral roots are rebuilt on the actual level seabed.
 const sites=[];for(let cell=0;cell<pockets.length;cell++){const[cx,cz]=pockets[cell];for(let i=0;i<48;i++){const a=i*2.399963,r=18+Math.sqrt(i/48)*45,x=cx+Math.cos(a)*r,z=cz+Math.sin(a)*r,y=expansionBedY(x,z);if(y> -8)continue;sites.push({id:'warehouse-reef-'+cell+'-'+i,x,y:y+.05,z,form:[0,1,2,3,5,6,7,9,10][i%9],scale:1.4+i%5*.55,yaw:a,nx:0,ny:1,nz:0});}}
 const corals=yield* mosaCoralSteps({sitesOverride:sites,lodDistances:[0,15,90],seabedFar:true});root.add(corals);
 const school=[];for(let i=0;i<60;i++){const j=Math.floor(i/20),cx=[WAREHOUSE_REEFS[0].x,WAREHOUSE_REEFS[4].x,WAREHOUSE_REEFS[3].x][j],cz=[WAREHOUSE_REEFS[0].z,WAREHOUSE_REEFS[4].z+50,WAREHOUSE_REEFS[3].z][j];school.push({cx,cz,phase:i*2.399,radius:1+(i%6)*.06,rx:28,rz:16,speed:.055+j*.008,depth:[-62,-62,-95][j]+i%5*.8,scale:.9+i%3*.15});}
 const fish=createMosaFish({deep:true,school});root.add(fish);
 root.userData={colonies:sites.length,fishCount:school.length,reefPockets:pockets.length,raisedMounds:0,crownBoulders:0,update(time,reduced=false){corals.userData.update(time,reduced);fish.userData.update(time,reduced);}};return root;
}
