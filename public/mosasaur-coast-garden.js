import {expansionPoint,expansionCoastDecorPoint,expansionHeadlands} from './mosasaur-expansion.js';
import {meadowBroadleaf} from './meadow-leaves.js';
import {sceneryDetailIndex} from './scenery-detail-levels.js';
import {showcaseMaterialSteps} from './showcase-surface-details.js';
import * as T from 'three';
import {batchModelSteps} from './model-batching.js';
import {tropicalPalm,sandstoneColumn} from './showcase-water-landscape.js';
import {leafyCanopy,fern,broadleaf,gardenFlowerCluster,mossMantle} from './showcase-botany.js';
import {cliffGeometry} from './showcase-geology.js';
import {shape,surfaceTexture,lantern} from './fantasy-scenery.js';
import {waterfallSteps} from './lagoon.js';
import {MOSA_SEA,MOSA_HEADLANDS,mosaCoastFactor} from './mosasaur-data.js';
import {placementClearance} from './landscape-detail.js';
function gardenHeight(x,z){for(const p of expansionHeadlands()){const d=Math.hypot((x-p.x)/p.radius,(z-p.z)/(p.radius*.86));if(d<.68)return p.height+.65;if(d<1.03)return null;}return .15;}
export function mosaForestSites(){const sites=[];for(let i=0;i<240;i++){
 const angle=i*2.3999632297,f=mosaCoastFactor(angle),ring=1.09+(i%4)*.055,x=Math.cos(angle)*MOSA_SEA.rx*f*ring,z=Math.sin(angle)*MOSA_SEA.rz*f*ring;
 if(Math.abs(x)<5&&z>10)continue;
 const y=gardenHeight(x,z);if(y===null)continue;
 const mapped=y===.15?expansionCoastDecorPoint(x,z):{x,z};
 sites.push({x:mapped.x,y,z:mapped.z,angle,kind:i%5===0?'pink':i%5===1?'green':'palm',scale:.82+i%5*.1});
 }
 let previous=null;
 for(let i=0;i<1024;i++){
  const a=i*Math.PI*2/1024,p=expansionPoint(a,8+(i%4)*4),old=Math.hypot(Math.cos(a)*MOSA_SEA.rx*mosaCoastFactor(a),Math.sin(a)*MOSA_SEA.rz*mosaCoastFactor(a));
  if(Math.hypot(p.x,p.z)-old<80||previous&&Math.hypot(p.x-previous.x,p.z-previous.z)<18)continue;
  sites.push({x:p.x,y:.15,z:p.z,angle:a,kind:i%5===0?'pink':i%5===1?'green':'palm',scale:.85+i%4*.08});previous=p;
 }
 return sites;}
export function* mosaCoastGardenSteps(placements=[]){
 const root=new T.Group(),rocks=new T.Group(),clockFalls=[],clear=placementClearance(placements.filter(p=>p.biome==='autumn')),dummy=new T.Object3D();root.name='Dense tropical headlands, flowering canopy and natural white-sand coves';
 for(const p of expansionHeadlands()){
  const i=MOSA_HEADLANDS.indexOf(p);yield;const stone=new T.Mesh(cliffGeometry(p.height+10,p.radius,i*.79,40,22),new T.MeshStandardMaterial({color:[0xb7ad96,0x9aa99a,0xb6b2a0][i%3],vertexColors:true,map:surfaceTexture('stone'),roughness:.9}));stone.position.set(p.x,-9.5,p.z);stone.castShadow=stone.receiveShadow=true;rocks.add(stone);
  stone.material.userData.surfaceKind='stone';const crown=new T.Group();crown.position.set(p.x,-9.5,p.z);mossMantle(crown,0,0,p.height+10,p.radius,i*.79);rocks.add(crown);
  for(let j=0;j<7;j++){const a=j*2.399+i,x=p.x+Math.sin(a)*p.radius*.6,z=p.z+Math.cos(a)*p.radius*.6,y=p.height+.6;
   fern(rocks,x,y,z,1.2+j%3*.4,a);if(j%2===0)gardenFlowerCluster(rocks,x,z,j%3?0xf689c4:0xffc35d,1.4,y);
  }
  if(i%3===0){const x=p.x-Math.cos(p.angle)*p.radius*.88,z=p.z-Math.sin(p.angle)*p.radius*.88,fall=yield* waterfallSteps(x,z,2.8,p.height+.4,{color:0x4fdbed});fall.position.y+=p.height+.35;fall.rotation.y=p.angle+Math.PI/2;root.add(fall);clockFalls.push(fall);}
 }
 yield* showcaseMaterialSteps(rocks);const rockBatch=yield* batchModelSteps(rocks,{combineColors:true});root.add(rockBatch);rocks.traverse(m=>{if(m.isMesh&&!m.geometry.userData.sharedScenery)m.geometry.dispose();});
 // Three full-detail templates shared by bounded spatial cells. More vegetation
 // does not duplicate every frond's vertex buffers for every tree.
 const sites=mosaForestSites().filter(p=>clear(p.x,p.z,7,7));
 for(const kind of ['palm','pink','green']){
  const source=new T.Group();if(kind==='palm')tropicalPalm(source,0,0,0,15,.4);else{shape(source,'pole',0x896949,0,4.1,0,.36,8.2,.36);leafyCanopy(source,0,9,0,5.2,kind==='pink');for(let j=0;j<4;j++)leafyCanopy(source,Math.sin(j*2.4)*3,7.2,Math.cos(j*2.4)*3,3.1,kind==='pink');}
  yield* showcaseMaterialSteps(source);const template=yield* batchModelSteps(source,{combineColors:true});source.traverse(m=>{if(m.isMesh&&!m.geometry.userData.sharedScenery)m.geometry.dispose();});
  const variants=new Map();
  const cells=new Map();for(const p of sites.filter(p=>p.kind===kind)){const key=Math.floor(p.x/320)+':'+Math.floor(p.z/320);if(!cells.has(key))cells.set(key,[]);cells.get(key).push(p);}
  for(const own of cells.values()){
   yield;
   const centroid=own.reduce((v,p)=>v.add(new T.Vector3(p.x,0,p.z)),new T.Vector3()).multiplyScalar(1/own.length),lod=new T.LOD();lod.position.copy(centroid);root.add(lod);
   template.updateMatrixWorld(true);for(const [level,distance,error,ratio]of [[0,0,0,1],[1,450,.035,.4],[2,800,.10,.15]]){
    const group=new T.Group();template.traverse(m=>{if(!m.isMesh)return;const key=m.uuid+':'+level;if(!variants.has(key))variants.set(key,level?sceneryDetailIndex(m.geometry,error,ratio):m.geometry);const geometry=variants.get(key),mesh=new T.InstancedMesh(geometry,m.material,own.length);for(let i=0;i<own.length;i++){const p=own[i];dummy.position.set(p.x-centroid.x,p.y,p.z-centroid.z);dummy.rotation.set(0,p.angle,0);dummy.scale.setScalar(p.scale);dummy.updateMatrix();mesh.setMatrixAt(i,dummy.matrix.clone().multiply(m.matrixWorld));}mesh.instanceMatrix.needsUpdate=true;mesh.computeBoundingSphere();mesh.castShadow=mesh.receiveShadow=true;group.add(mesh);});lod.addLevel(group,distance,.08);
   }
  }
 }
 const understory=new T.Group();for(let i=0;i<420;i++){
  if(i%12===0)yield;let a=i*2.399,f=mosaCoastFactor(a),r=1.07+(i%9)*.019,x=Math.cos(a)*MOSA_SEA.rx*f*r,z=Math.sin(a)*MOSA_SEA.rz*f*r;if(!clear(x,z,2,2)||Math.abs(x)<4&&z>5)continue;
  const y=gardenHeight(x,z);if(y===null)continue;
  const mapped=y===.15?expansionCoastDecorPoint(x,z):{x,z};x=mapped.x;z=mapped.z;
  if(i%3===0)meadowBroadleaf(understory,x,y,z,1.9,a);else fern(understory,x,y,z,1.3,a);if(i%4===0)gardenFlowerCluster(understory,x,z,[0xffa6d8,0xe7a0ec,0xffcb70][i%3],1.4,y+.01);if(i%42===0)lantern(understory,x,y,z,1.4);
 }
 yield* showcaseMaterialSteps(understory);root.add(yield* batchModelSteps(understory,{combineColors:true}));understory.traverse(m=>{if(m.isMesh&&!m.geometry.userData.sharedScenery)m.geometry.dispose();});
 root.userData.treeCount=sites.length;root.userData.headlands=expansionHeadlands();root.userData.update=(time,reduced=false)=>{for(const fall of clockFalls)fall.userData.update(time,reduced);};return root;
}
