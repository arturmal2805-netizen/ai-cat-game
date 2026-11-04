import * as T from 'three';
import {mergeGeometries} from 'three/addons/utils/BufferGeometryUtils.js';
import {coralCluster} from './reef.js';
import {shape,line} from './fantasy-scenery.js';
import {applyUnderwaterLighting} from './water-shading.js';
import {MOSA_SEA,mosaBedY} from './mosasaur-data.js';
// Six reusable anatomies, ninety-six real colonies. All instance buffers are
// immutable; polyps bend in the vertex shader from a single shared clock.
export const MOSA_CORAL_FORMS=['staghorn','sea-fan','brain','tube-sponge','anemone','table-coral'];
export function mosaCoralSites(){return Array.from({length:96},(_,i)=>{
 const a=i*2.3999632297+.35,q=.60+(i%9)*.025,x=Math.sin(a)*MOSA_SEA.rx*q,z=Math.cos(a)*MOSA_SEA.rz*q;
 return {id:'mosa-reef-'+i,form:i%6,x,z,y:mosaBedY(x,z)+.05,scale:1.2+(i%5)*.28,yaw:a};
});}
function geometryFor(form){
 const source=new T.Group();
 if(form<5){coralCluster(source,0,0,1,form,0);
  if(form===0)for(let j=0;j<5;j++){const a=j*2.4;line(source,[0,.1,0],[Math.sin(a)*.45,.65,Math.cos(a)*.4],0xef99be,.035);for(let k=0;k<3;k++)shape(source,'sphere',0xffd7d6,Math.sin(a)*(.3+k*.06),.55+k*.09,Math.cos(a)*(.3+k*.05),.04,.055,.04);}
  if(form===1)for(let k=0;k<12;k++){const a=k*.27;line(source,[0,.1,0],[Math.sin(a-.7)*.35,.4+Math.cos(a-.7)*.3,.03],0xeeb5dc,.009);}
 }else{
  line(source,[0,0,0],[.04,.55,0],0xd79ccf,.06);
  for(let j=0;j<4;j++){const a=j*2.4,p=shape(source,'sphere',0x9b8fd9,Math.sin(a)*.15,.18+j*.14,Math.cos(a)*.16,.36-j*.035,.035,.29-j*.025);p.rotation.z=Math.sin(a)*.12;
   for(let k=0;k<12;k++){const b=k*Math.PI/6;shape(source,'sphere',0xc8c1f5,Math.sin(a)*.15+Math.sin(b)*(.32-j*.035),.205+j*.14,Math.cos(a)*.16+Math.cos(b)*(.25-j*.025),.025,.018,.025);}
  }
 }
 source.updateMatrixWorld(true);const parts=[];
 source.traverse(m=>{if(!m.isMesh)return;let g=m.geometry.clone();g.applyMatrix4(m.matrixWorld);if(g.index){const old=g;g=g.toNonIndexed();old.dispose();}const p=g.attributes.position,c=new Float32Array(p.count*3);for(let i=0;i<p.count;i++){const shade=.90+.10*Math.sin(p.getX(i)*32+p.getY(i)*24);c.set([m.material.color.r*shade,m.material.color.g*shade,m.material.color.b*shade],i*3);}g.setAttribute('color',new T.BufferAttribute(c,3));for(const key of Object.keys(g.attributes))if(!['position','normal','uv','color'].includes(key))g.deleteAttribute(key);parts.push(g);});
 const geometry=mergeGeometries(parts);for(const g of parts)g.dispose();geometry.computeBoundingBox();return geometry;
}
export function* mosaCoralSteps(){
 const root=new T.Group(),clock={value:0},motion={value:1},sites=mosaCoralSites(),dummy=new T.Object3D();root.name='Deep coral gardens · six distinct anatomies';
 const material=new T.MeshStandardMaterial({color:0xffffff,vertexColors:true,roughness:.63,metalness:0});
 material.onBeforeCompile=s=>{s.uniforms.uCoralTime=clock;s.uniforms.uCoralMotion=motion;s.vertexShader='uniform float uCoralTime;uniform float uCoralMotion;\n'+s.vertexShader.replace('#include <beginnormal_vertex>','#include <beginnormal_vertex>\nfloat phase=position.y*3.+uCoralTime*.7;float bend=position.y>0.? .006*(sin(phase)+position.y*3.*cos(phase))*uCoralMotion:0.;objectNormal.y-=bend*objectNormal.x;objectNormal=normalize(objectNormal);').replace('#include <begin_vertex>','#include <begin_vertex>\ntransformed.x+=sin(position.y*3.+uCoralTime*.7)*max(position.y,0.)*.006*uCoralMotion;');};
 material.customProgramCacheKey=()=> 'mosa-coral-polyp-v1';applyUnderwaterLighting(material,clock,0x51d6ef,{level:{value:MOSA_SEA.surfaceY}});
 for(let form=0;form<6;form++){
  yield;const own=sites.filter(s=>s.form===form),mesh=new T.InstancedMesh(geometryFor(form),material,own.length);mesh.name=MOSA_CORAL_FORMS[form];
  for(let i=0;i<own.length;i++){const p=own[i];dummy.position.set(p.x,p.y,p.z);dummy.rotation.set(0,p.yaw,0);dummy.scale.setScalar(p.scale);dummy.updateMatrix();mesh.setMatrixAt(i,dummy.matrix);mesh.setColorAt(i,new T.Color([0xffffff,0xffdbed,0xd6f5ff,0xffebc1][i%4]));}
  mesh.instanceMatrix.needsUpdate=true;mesh.computeBoundingBox();mesh.computeBoundingSphere();root.add(mesh);
 }
 root.userData.sites=sites;root.userData.update=(time,reduced=false)=>{clock.value=reduced?0:time;motion.value=reduced?0:1;};return root;
}
