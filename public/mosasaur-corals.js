import * as T from 'three';
import {mergeGeometries} from 'three/addons/utils/BufferGeometryUtils.js';
import {coralCluster} from './reef.js';
import {shape,line} from './fantasy-scenery.js';
import {applyUnderwaterLighting} from './water-shading.js';
import {MOSA_SEA,mosaBedY} from './mosasaur-data.js';
// Eleven reusable anatomies, three hundred eighty-four real colonies. All instance buffers are
// immutable; polyps bend in the vertex shader from a single shared clock.
export const MOSA_CORAL_FORMS=['staghorn','sea-fan','brain','tube-sponge','anemone','table-coral','mushroom','soft-plume','luminous-corals','kelp','sea-grass'];
export function mosaCoralSites(){return Array.from({length:384},(_,i)=>{
 const a=i*2.3999632297+.35,q=.58+(i%19)*.018,x=Math.sin(a)*MOSA_SEA.rx*q,z=Math.cos(a)*MOSA_SEA.rz*q;
 return {id:'mosa-reef-'+i,form:i%11,x,z,y:mosaBedY(x,z)+.05,scale:1.8+(i%7)*.4,yaw:a};
});}
function geometryFor(form){
 const source=new T.Group();
 if(form<5){coralCluster(source,0,0,1,form,0);
  if(form===0)for(let j=0;j<5;j++){const a=j*2.4;line(source,[0,.1,0],[Math.sin(a)*.45,.65,Math.cos(a)*.4],0xef99be,.035);for(let k=0;k<3;k++)shape(source,'sphere',0xffd7d6,Math.sin(a)*(.3+k*.06),.55+k*.09,Math.cos(a)*(.3+k*.05),.04,.055,.04);}
  if(form===1)for(let k=0;k<12;k++){const a=k*.27;line(source,[0,.1,0],[Math.sin(a-.7)*.35,.4+Math.cos(a-.7)*.3,.03],0xeeb5dc,.009);}
 }else if(form===5){
  line(source,[0,0,0],[.04,.55,0],0xd79ccf,.06);
  for(let j=0;j<4;j++){const a=j*2.4,p=shape(source,'sphere',0x9b8fd9,Math.sin(a)*.15,.18+j*.14,Math.cos(a)*.16,.36-j*.035,.035,.29-j*.025);p.rotation.z=Math.sin(a)*.12;
   for(let k=0;k<12;k++){const b=k*Math.PI/6;shape(source,'sphere',0xc8c1f5,Math.sin(a)*.15+Math.sin(b)*(.32-j*.035),.205+j*.14,Math.cos(a)*.16+Math.cos(b)*(.25-j*.025),.025,.018,.025);}
  }
 }
 if(form===6){for(let j=0;j<5;j++){const a=j*2.4,x=Math.sin(a)*.25,z=Math.cos(a)*.25,h=.3+j*.05;line(source,[x,0,z],[x,h,z],0xf4b6ab,.035);shape(source,'dome',0xc08de0,x,h,z,.20,.12,.18);}}
 if(form===7){for(let j=0;j<9;j++){const a=j*2.4;line(source,[0,.04,0],[Math.sin(a)*.22,.32+j*.035,Math.cos(a)*.18],0xf093bf,.025);shape(source,'sphere',0xffbdd4,Math.sin(a)*.22,.32+j*.035,Math.cos(a)*.18,.07,.12,.07);}}
 if(form===8){for(let j=0;j<6;j++){const a=j*Math.PI/3;line(source,[0,0,0],[Math.sin(a)*.2,.25+j%3*.08,Math.cos(a)*.2],0x48d7d2,.022);shape(source,'sphere',0x83e9f7,Math.sin(a)*.2,.30+j%3*.08,Math.cos(a)*.2,.08,.13,.08);}}
 if(form===9){for(let j=0;j<4;j++){const x=(j-1.5)*.12,h=.9+j*.1;line(source,[x,0,0],[x+.05,h,0],0x5f9871,.018);for(let k=0;k<6;k++){const leaf=shape(source,'sphere',k%2?0x70b88b:0x90c77d,x+(k%2?.12:-.12),.15+k*.13,0,.17,.025,.065);leaf.rotation.z=(k%2?1:-1)*.45;}}}
 if(form===10){for(let j=0;j<12;j++){const a=j*2.399,blade=shape(source,'sphere',j%2?0x66bda7:0x9ad397,Math.sin(a)*.16,.2+j%3*.035,Math.cos(a)*.16,.015,.22+j%3*.05,.035);blade.rotation.z=Math.sin(a)*.3;}}
 source.updateMatrixWorld(true);const parts=[];
 source.traverse(m=>{if(!m.isMesh)return;let g=m.geometry.clone();g.applyMatrix4(m.matrixWorld);if(g.index){const old=g;g=g.toNonIndexed();old.dispose();}const p=g.attributes.position,c=new Float32Array(p.count*3);for(let i=0;i<p.count;i++){const shade=.90+.10*Math.sin(p.getX(i)*32+p.getY(i)*24);c.set([m.material.color.r*shade,m.material.color.g*shade,m.material.color.b*shade],i*3);}g.setAttribute('color',new T.BufferAttribute(c,3));for(const key of Object.keys(g.attributes))if(!['position','normal','uv','color'].includes(key))g.deleteAttribute(key);parts.push(g);});
 const geometry=mergeGeometries(parts);for(const g of parts)g.dispose();geometry.computeBoundingBox();return geometry;
}
export function* mosaCoralSteps(){
 const root=new T.Group(),clock={value:0},motion={value:1},sites=mosaCoralSites(),dummy=new T.Object3D();root.name='Deep coral gardens · eleven distinct anatomies';
 const material=new T.MeshStandardMaterial({color:0xffffff,vertexColors:true,roughness:.58,metalness:0,emissive:0x123d46,emissiveIntensity:.12});
 material.onBeforeCompile=s=>{s.uniforms.uCoralTime=clock;s.uniforms.uCoralMotion=motion;s.vertexShader='uniform float uCoralTime;uniform float uCoralMotion;\n'+s.vertexShader.replace('#include <beginnormal_vertex>','#include <beginnormal_vertex>\nfloat phase=position.y*3.+uCoralTime*.7;float bend=position.y>0.? .006*(sin(phase)+position.y*3.*cos(phase))*uCoralMotion:0.;objectNormal.y-=bend*objectNormal.x;objectNormal=normalize(objectNormal);').replace('#include <begin_vertex>','#include <begin_vertex>\ntransformed.x+=sin(position.y*3.+uCoralTime*.7)*max(position.y,0.)*.006*uCoralMotion;');};
 material.customProgramCacheKey=()=> 'mosa-coral-polyp-v1';applyUnderwaterLighting(material,clock,0x51d6ef,{level:{value:MOSA_SEA.surfaceY}});
 for(let form=0;form<11;form++){
  yield;const own=sites.filter(s=>s.form===form),mesh=new T.InstancedMesh(geometryFor(form),material,own.length);mesh.name=MOSA_CORAL_FORMS[form];
  for(let i=0;i<own.length;i++){const p=own[i];dummy.position.set(p.x,p.y,p.z);dummy.rotation.set(0,p.yaw,0);dummy.scale.setScalar(p.scale);dummy.updateMatrix();mesh.setMatrixAt(i,dummy.matrix);mesh.setColorAt(i,new T.Color([0xffffff,0xffdbed,0xd6f5ff,0xffebc1][i%4]));}
  mesh.instanceMatrix.needsUpdate=true;mesh.computeBoundingBox();mesh.computeBoundingSphere();root.add(mesh);
 }
 root.userData.sites=sites;root.userData.update=(time,reduced=false)=>{clock.value=reduced?0:time;motion.value=reduced?0:1;};return root;
}
