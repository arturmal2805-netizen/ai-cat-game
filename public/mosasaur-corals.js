import {useMosasaurWaterField} from './mosasaur-water-field.js';
import {coralCellIndices,coralCellMesh,installCoralCellCulling} from './mosasaur-coral-cells.js';
import * as T from 'three';
import {mergeGeometries,mergeVertices} from 'three/addons/utils/BufferGeometryUtils.js';
import {coralCluster} from './reef.js';
import {shape,line} from './fantasy-scenery.js';
import {runSceneSteps} from './scene-tasks.js';
import {sculptBranchingCoralSteps} from './mosasaur-coral-sculpt.js';
import {mosaRockSurface} from './mosasaur-rock-surfaces.js';
import {detailedCoral} from './mosasaur-coral-anatomy.js';
import {applyUnderwaterLighting} from './water-shading.js';
import {mosaReefSurfaceY,reefCoralSites,installReefCoralSites,reefWallSite,MOSA_REEF_INSTANCES} from './mosasaur-reef-data.js';
import {MOSA_SEA,mosaBedY,mosaWaterRadius,mosaCoastFactor,MOSA_REEF_TERRACES} from './mosasaur-data.js';
// Eleven reusable anatomies, 1,024 real colonies. All instance buffers are
// immutable; polyps bend in the vertex shader from a single shared clock.
export const MOSA_CORAL_FORMS=['staghorn','sea-fan','brain','tube-sponge','anemone','table-coral','mushroom','soft-plume','luminous-corals','kelp','sea-grass'];
export function mosaCoralSites(){
 const cached=reefCoralSites();if(cached)return cached;
 const sites=Array.from({length:1024},(_,i)=>{
  const p=MOSA_REEF_TERRACES[i%12],a=i*2.3999632297+.35;let x,z,wall=null;
  if(i<384){const r=p.radius*.62*Math.sqrt(((i*37)%97)/97);x=p.x+Math.sin(a)*r;z=p.z+Math.cos(a)*r*.86;}
  else if(i%3===0){const q=.88+(i%5)*.016,f=mosaCoastFactor(a);x=Math.cos(a)*MOSA_SEA.rx*f*q;z=Math.sin(a)*MOSA_SEA.rz*f*q;}
  else{wall=reefWallSite(MOSA_REEF_INSTANCES[i%12],Math.PI/2+Math.sin(a)*.95,.28+(i%11)*.055);if(wall){x=wall.x;z=wall.z;}else{const r=p.radius*(.72+i%9*.16);x=p.x+Math.sin(a)*r;z=p.z+Math.cos(a)*r*.86;}}
  if(!wall){const q=mosaWaterRadius(x,z);if(q>.94){x*=.94/q;z*=.94/q;}}
  const y=wall?wall.y:mosaReefSurfaceY(x,z)+.05,form=i%11,maxHeight=form===9?1.5:form===10?.6:1.,scale=Math.max(.3,Math.min((i<384?4:2.6)+(i%6)*.72,(-y-.6)/maxHeight));
  return {id:'mosa-reef-'+i,form,x,z,y,scale,yaw:a,nx:wall?.nx||0,ny:wall?.ny??1,nz:wall?.nz||0};
 });installReefCoralSites(sites);return sites;
}
const templates=new Map();
// Read-only geometry lending for another selected ocean venue. Ownership and
// all existing reef instances/LOD selection remain with the ocean cache.
export const borrowedMosaCoralLevels=form=>templates.get(form)||null;
export function installMosaCoralTemplates(form,levels){for(const g of levels)g.userData.sharedScenery=true;templates.set(form,levels);}
export const coralGeometryFor=form=>runSceneSteps(coralGeometrySteps(form));
export function* coralGeometrySteps(form){
 if(form===0||form===7||form===8){const g=yield* sculptBranchingCoralSteps(form);return finishCoralGeometry(g,form);}
 const source=new T.Group();
 const custom=detailedCoral(source,form);
 if(form<5&&!custom){coralCluster(source,0,0,1,form,0);
  if(form===0)for(let j=0;j<5;j++){const a=j*2.4;line(source,[0,.1,0],[Math.sin(a)*.45,.65,Math.cos(a)*.4],0xef99be,.035);for(let k=0;k<3;k++)shape(source,'sphere',0xffd7d6,Math.sin(a)*(.3+k*.06),.55+k*.09,Math.cos(a)*(.3+k*.05),.04,.055,.04);}
  if(form===1)for(let k=0;k<12;k++){const a=k*.27;line(source,[0,.1,0],[Math.sin(a-.7)*.35,.4+Math.cos(a-.7)*.3,.03],0xeeb5dc,.009);}
 }else if(form===5&&!custom){
  line(source,[0,0,0],[.04,.55,0],0xd79ccf,.06);
  for(let j=0;j<4;j++){const a=j*2.4,p=shape(source,'sphere',0x9b8fd9,Math.sin(a)*.15,.18+j*.14,Math.cos(a)*.16,.36-j*.035,.035,.29-j*.025);p.rotation.z=Math.sin(a)*.12;
   for(let k=0;k<12;k++){const b=k*Math.PI/6;shape(source,'sphere',0xc8c1f5,Math.sin(a)*.15+Math.sin(b)*(.32-j*.035),.205+j*.14,Math.cos(a)*.16+Math.cos(b)*(.25-j*.025),.025,.018,.025);}
  }
 }
 if(form===6&&!custom){for(let j=0;j<5;j++){const a=j*2.4,x=Math.sin(a)*.25,z=Math.cos(a)*.25,h=.3+j*.05;line(source,[x,0,z],[x,h,z],0xf4b6ab,.035);shape(source,'dome',0xc08de0,x,h,z,.20,.12,.18);}}
 if(form===7&&!custom){for(let j=0;j<9;j++){const a=j*2.4;line(source,[0,.04,0],[Math.sin(a)*.22,.32+j*.035,Math.cos(a)*.18],0xf093bf,.025);shape(source,'sphere',0xffbdd4,Math.sin(a)*.22,.32+j*.035,Math.cos(a)*.18,.07,.12,.07);}}
 if(form===8&&!custom){for(let j=0;j<6;j++){const a=j*Math.PI/3;line(source,[0,0,0],[Math.sin(a)*.2,.25+j%3*.08,Math.cos(a)*.2],0x48d7d2,.022);shape(source,'sphere',0x83e9f7,Math.sin(a)*.2,.30+j%3*.08,Math.cos(a)*.2,.08,.13,.08);}}
 if(form===9&&!custom){for(let j=0;j<4;j++){const x=(j-1.5)*.12,h=.9+j*.1;line(source,[x,0,0],[x+.05,h,0],0x5f9871,.018);for(let k=0;k<6;k++){const leaf=shape(source,'sphere',k%2?0x70b88b:0x90c77d,x+(k%2?.12:-.12),.15+k*.13,0,.17,.025,.065);leaf.rotation.z=(k%2?1:-1)*.45;}}}
 if(form===10&&!custom){for(let j=0;j<12;j++){const a=j*2.399,blade=shape(source,'sphere',j%2?0x66bda7:0x9ad397,Math.sin(a)*.16,.2+j%3*.035,Math.cos(a)*.16,.015,.22+j%3*.05,.035);blade.rotation.z=Math.sin(a)*.3;}}
 source.updateMatrixWorld(true);const parts=[];
 source.traverse(m=>{if(!m.isMesh)return;let g=m.geometry.clone();g.applyMatrix4(m.matrixWorld);if(g.index){const old=g;g=g.toNonIndexed();old.dispose();}const p=g.attributes.position,c=new Float32Array(p.count*3);for(let i=0;i<p.count;i++){const shade=.90+.10*Math.sin(p.getX(i)*32+p.getY(i)*24),pigment=m.material.color.clone(),hsl={};if(m.material.vertexColors&&g.attributes.color)pigment.multiply(new T.Color().fromBufferAttribute(g.attributes.color,i));pigment.getHSL(hsl);pigment.setHSL(hsl.h,Math.min(.85,hsl.s*.96),hsl.l);c.set([pigment.r*shade,pigment.g*shade,pigment.b*shade],i*3);}g.setAttribute('color',new T.BufferAttribute(c,3));for(const key of Object.keys(g.attributes))if(!['position','normal','uv','color'].includes(key))g.deleteAttribute(key);parts.push(g);});
 const merged=mergeGeometries(parts),geometry=mergeVertices(merged,.00001);merged.dispose();for(const g of parts)g.dispose();source.traverse(m=>{if(m.isMesh&&!m.geometry.userData.sharedScenery)m.geometry.dispose();if(m.isMesh&&!m.material.userData.sharedScenery)m.material.dispose();});return finishCoralGeometry(geometry,form);
}
function finishCoralGeometry(geometry,form){
 geometry.setAttribute('aReefGlow',new T.BufferAttribute(new Float32Array(geometry.attributes.position.count).fill(form===4?.05:.018),1));geometry.setAttribute('aReefSway',new T.BufferAttribute(new Float32Array(geometry.attributes.position.count).fill(form===9?.04:form===10?.025:.008),1));geometry.computeBoundingBox();geometry.userData.sharedScenery=true;return geometry;
}
export function* mosaCoralSteps({spatialCells=true}={}){
 const root=new T.Group(),clock={value:0},motion={value:1},sites=mosaCoralSites(),dummy=new T.Object3D();root.name='Deep coral gardens · eleven distinct anatomies';
 const material=new T.MeshStandardMaterial({color:0xffffff,vertexColors:true,roughness:.78,normalMap:mosaRockSurface().coralNormal||null,normalScale:new T.Vector2(.65,.65),metalness:0,emissive:0x123d46,emissiveIntensity:.12,side:T.DoubleSide});
 material.onBeforeCompile=s=>{s.uniforms.uCoralTime=clock;s.uniforms.uCoralMotion=motion;s.vertexShader='uniform float uCoralTime;uniform float uCoralMotion;attribute float aReefGlow;attribute float aReefSway;varying float vReefGlow;varying vec3 vReefDetail;\n'+s.vertexShader.replace('#include <beginnormal_vertex>','#include <beginnormal_vertex>\nfloat phase=position.y*3.+uCoralTime*.7;float reefNormalBend=position.y>0.? aReefSway*(sin(phase)+position.y*3.*cos(phase))*uCoralMotion:0.;objectNormal.y-=reefNormalBend*objectNormal.x;objectNormal=normalize(objectNormal);').replace('#include <begin_vertex>','#include <begin_vertex>\nvReefGlow=aReefGlow;vReefDetail=position;transformed.x+=sin(position.y*3.+uCoralTime*.7)*max(position.y,0.)*aReefSway*uCoralMotion;');s.fragmentShader='varying float vReefGlow;varying vec3 vReefDetail;\n'+s.fragmentShader.replace('#include <emissivemap_fragment>','#include <emissivemap_fragment>\n totalEmissiveRadiance+=vColor.rgb*vReefGlow;').replace('#include <normal_fragment_maps>',`#include <normal_fragment_maps>
 vec3 coralP=vReefDetail*110.;float polyp=sin(coralP.x+sin(coralP.y*.67))*sin(coralP.z+coralP.y*.8);float filtered=1.-smoothstep(.7,2.,length(fwidth(coralP)));float relief=polyp*.0017*filtered;
 vec3 sigmaX=dFdx(-vViewPosition),sigmaY=dFdy(-vViewPosition),rX=cross(sigmaY,normal),rY=cross(normal,sigmaX);float det=dot(sigmaX,rX)*faceDirection;
 normal=normalize(abs(det)*normal-sign(det)*(dFdx(relief)*rX+dFdy(relief)*rY));
 roughnessFactor=clamp(roughnessFactor+polyp*.07,.42,.84);diffuseColor.rgb*=.94+polyp*.06;`);};
 material.customProgramCacheKey=()=> 'mosa-coral-polyp-v5';applyUnderwaterLighting(material,clock,0x51d6ef,{level:{value:MOSA_SEA.surfaceY}});useMosasaurWaterField(material);
 for(let region=0;region<16;region++){
  yield;const own=sites.filter(p=>{const sector=Math.floor(((Math.atan2(p.z,p.x)+Math.PI*2)%(Math.PI*2))/(Math.PI/4)),outer=Math.hypot(p.x/MOSA_SEA.rx,p.z/MOSA_SEA.rz)>.84?1:0;return sector*2+outer===region;});if(!own.length)continue;
  const center=own.reduce((v,p)=>v.add(new T.Vector3(p.x,p.y,p.z)),new T.Vector3()).multiplyScalar(1/own.length),lod=new T.LOD();lod.position.copy(center);root.add(lod);if(spatialCells)installCoralCellCulling(lod);
  const groups=[new T.Group(),new T.Group(),new T.Group()];for(const [i,d]of [0,60,160].entries())lod.addLevel(groups[i],d,.08);
  for(let form=0;form<11;form++){
   yield;const batch=own.filter(p=>p.form===form);if(!batch.length)continue;
   if(!templates.has(form)){const full=yield* coralGeometrySteps(form);templates.set(form,[full,full,full]);}
   let original;const cells=coralCellIndices(batch),nearCells=[],ids=batch.map(p=>p.id);for(let level=0;level<3;level++){
    const mesh=new T.InstancedMesh(templates.get(form)[level],material,batch.length);mesh.name=MOSA_CORAL_FORMS[form];
    if(!level){for(let i=0;i<batch.length;i++){const p=batch[i];dummy.position.set(p.x-center.x,p.y-center.y,p.z-center.z);dummy.quaternion.setFromUnitVectors(new T.Vector3(0,1,0),new T.Vector3(p.nx||0,p.ny??1,p.nz||0)).multiply(new T.Quaternion().setFromAxisAngle(new T.Vector3(0,1,0),p.yaw));dummy.scale.setScalar(p.scale);dummy.updateMatrix();mesh.setMatrixAt(i,dummy.matrix);mesh.setColorAt(i,new T.Color([0xffffff,0xffe7f5,0xe4faff,0xfff2ce][i%4]));}mesh.instanceMatrix.needsUpdate=true;mesh.computeBoundingBox();mesh.computeBoundingSphere();original=mesh;}
    else{mesh.instanceMatrix=original.instanceMatrix;mesh.instanceColor=original.instanceColor;mesh.boundingBox=original.boundingBox.clone();mesh.boundingSphere=original.boundingSphere.clone();}
    mesh.userData.colonyIds=ids;
    if(spatialCells&&level<2&&cells.length>1&&batch.length>=6){groups[level].userData.coralCells=true;for(const [cell,indices]of cells.entries()){yield;const sub=coralCellMesh(original,templates.get(form)[level],indices,ids,level?nearCells[cell]:null);if(!level)nearCells.push(sub);groups[level].add(sub);}mesh.dispose();}
    else groups[level].add(mesh);
   }
  }
 }
 root.userData.sites=sites;root.userData.update=(time,reduced=false)=>{clock.value=reduced?0:time;motion.value=reduced?0:1;};return root;
}
