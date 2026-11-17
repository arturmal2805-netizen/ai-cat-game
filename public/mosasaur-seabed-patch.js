import * as T from 'three';
import {SEABED_REEF_PATCH as P,SEABED_REEF_GARDENS,seabedPatchHabitat} from './mosasaur-seabed-patch-data.js';
import {mosaBedY,MOSA_SEA} from './mosasaur-data.js';
import {mosaReefClearance} from './mosasaur-reef-data.js';
import {mosaCoralSteps} from './mosasaur-corals.js';
import {applyUnderwaterLighting} from './water-shading.js';
const random=n=>{const v=Math.sin(n*127.1+19.7)*43758.5453;return v-Math.floor(v);};
export function* seabedPatchSites(count,seed,coral=false,patch=P){
 const P=patch;
 const sites=[];
 for(let i=0;i<24000&&sites.length<count;i++){
  if(i%32===0)yield;
  const x=P.x+(random(i+seed)*2-1)*P.rx,z=P.z+(random(i+seed+810)*2-1)*P.rz;
  if(seabedPatchHabitat(x,z,P)<(coral?.40:.26))continue;
  if(coral&&Math.abs(x-P.x-1.5*Math.sin((z-P.z)*.23))<2.6)continue;
  const y=mosaBedY(x,z);if(mosaReefClearance(x,y+.4,z)<1)continue;
  if(Math.hypot(x,z)<28||Math.abs(x)<80&&z>70)continue;
  if(coral&&sites.some(p=>Math.hypot(p.x-x,p.z-z)<.85))continue;
  const e=.05,dx=(mosaBedY(x+e,z)-mosaBedY(x-e,z))/(2*e),dz=(mosaBedY(x,z+e)-mosaBedY(x,z-e))/(2*e),n=new T.Vector3(-dx,1,-dz).normalize(),id=sites.length;
  sites.push({id:'seabed-'+P.x+'-'+P.z+'-'+(coral?'coral':'grass')+'-'+id,x,y:y+.025,z,nx:n.x,ny:n.y,nz:n.z,form:[0,1,2,3,5,6,7,9,10][id%9],scale:coral?.8+random(i+220)*1.1:.65+random(i+320)*.65,yaw:random(i+420)*Math.PI*2});
 }
 return sites;
}
function grassGeometry(rows,blades=7){
 const p=[],uv=[],indices=[],colors=[];
 for(let blade=0;blade<blades;blade++){
  const a=blade*2.399963,h=.22+(blade%4)*.045,width=.018,offset=p.length/3;
  for(let j=0;j<=rows;j++)for(let c=0;c<3;c++){
   const t=j/rows,side=c-1,w=width*Math.sin(Math.PI*t),bend=.14*t*t;
   p.push(Math.sin(a)*(.06+bend)+Math.cos(a)*side*w,h*t+(1-side*side)*.006*Math.sin(Math.PI*t),Math.cos(a)*(.06+bend)-Math.sin(a)*side*w);
   uv.push(c/2,t);colors.push(.22+t*.16,.37+t*.17,.24+t*.10);
   if(j<rows&&c<2){const k=offset+j*3+c;indices.push(k,k+1,k+3,k+1,k+4,k+3);}
  }
 }
 const g=new T.BufferGeometry();g.setAttribute('position',new T.Float32BufferAttribute(p,3));g.setAttribute('uv',new T.Float32BufferAttribute(uv,2));g.setAttribute('color',new T.Float32BufferAttribute(colors,3));g.setIndex(indices);g.computeVertexNormals();return g;
}
export function* mosaSeabedPatchSteps({gardens=SEABED_REEF_GARDENS}={}){
 const root=new T.Group(),clock={value:0},motion={value:1};root.name='Layered living reef and open sand · first seabed patch';
 const colonies=[],plants=[],coralGroups=[];
 const material=new T.MeshStandardMaterial({color:0xffffff,vertexColors:true,side:T.DoubleSide,roughness:.85});
 material.onBeforeCompile=s=>{s.uniforms.uPatchTime=clock;s.uniforms.uPatchMotion=motion;s.vertexShader='uniform float uPatchTime;uniform float uPatchMotion;\n'+s.vertexShader.replace('#include <beginnormal_vertex>','#include <beginnormal_vertex>\nfloat bladePhase=uPatchTime*.7+position.y*2.;objectNormal.y-=(.24*position.y*sin(bladePhase)+.24*position.y*position.y*cos(bladePhase))*uPatchMotion*objectNormal.x;').replace('#include <begin_vertex>','#include <begin_vertex>\ntransformed.x+=position.y*position.y*.12*sin(uPatchTime*.7+position.y*2.)*uPatchMotion;');};
 material.customProgramCacheKey=()=> 'seabed-curved-ribbed-grass-v1';applyUnderwaterLighting(material,clock,0x51d6ef,{level:{value:MOSA_SEA.surfaceY}});
 const geometries=[grassGeometry(6),grassGeometry(3),grassGeometry(1,3)],dummy=new T.Object3D();
 for(const [gardenIndex,P]of gardens.entries()){
  const ownColonies=yield* seabedPatchSites(P.corals,7319+gardenIndex*101,true,P),ownPlants=yield* seabedPatchSites(P.grass,9401+gardenIndex*101,false,P);colonies.push(...ownColonies);plants.push(...ownPlants);
  const corals=yield* mosaCoralSteps({sitesOverride:ownColonies,lodDistances:[0,6,32],seabedFar:true});root.add(corals);coralGroups.push(corals);
 for(let cell=0;cell<4;cell++){
  yield;const own=ownPlants.filter(p=>(p.x>P.x?1:0)+(p.z>P.z?2:0)===cell);if(!own.length)continue;
  const center=own.reduce((v,p)=>v.add(new T.Vector3(p.x,p.y,p.z)),new T.Vector3()).multiplyScalar(1/own.length),lod=new T.LOD();lod.position.copy(center);root.add(lod);let first;
  for(let level=0;level<3;level++){
   const mesh=new T.InstancedMesh(geometries[level],material,own.length);mesh.name='Dense curved seagrass';
   if(!level){for(const [i,p]of own.entries()){dummy.position.set(p.x-center.x,p.y-center.y,p.z-center.z);dummy.quaternion.setFromUnitVectors(new T.Vector3(0,1,0),new T.Vector3(p.nx,p.ny,p.nz));dummy.quaternion.multiply(new T.Quaternion().setFromAxisAngle(new T.Vector3(0,1,0),p.yaw));dummy.scale.setScalar(p.scale);dummy.updateMatrix();mesh.setMatrixAt(i,dummy.matrix);}mesh.instanceMatrix.needsUpdate=true;first=mesh;}
   else mesh.instanceMatrix=first.instanceMatrix;
   mesh.computeBoundingSphere();mesh.boundingSphere.radius+=.05;lod.addLevel(mesh,[0,8,42][level],.12);
  }
 }
 }
 root.userData.colonies=colonies;root.userData.plants=plants;
 root.userData.update=(time,reduced=false)=>{clock.value=reduced?0:time;motion.value=reduced?0:1;for(const corals of coralGroups)corals.userData.update(time,reduced);};return root;
}
