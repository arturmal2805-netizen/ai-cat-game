import * as T from 'three';
import {sandDetailTexture} from './mosasaur-sand-detail.js';
// One metre-based sand material everywhere. Separate static floor sections use
// the original cheap material beyond the already invisible detail transition.
// Original floor remains the exact picking/ray proxy; visual chunks do not pick.
export function* installSandRegionSteps(bed){
 const source=bed.geometry,index=source.index.array,pos=source.attributes.position,cells=new Map(),point=new T.Vector3();bed.updateMatrix();
 for(let i=0;i<index.length;i+=3){
  if(i%768===0)yield;
  let x=0,y=0,z=0;for(let j=0;j<3;j++){point.fromBufferAttribute(pos,index[i+j]).applyMatrix4(bed.matrix);x+=point.x/3;y+=point.y/3;z+=point.z/3;}
  const key=Math.floor(x/64)+':'+Math.floor(z/64);let cell=cells.get(key);if(!cell){cell={indices:[],sum:new T.Vector3(),count:0};cells.set(key,cell);}cell.indices.push(index[i],index[i+1],index[i+2]);cell.sum.add(new T.Vector3(x,y,z));cell.count++;
 }
 const original=bed.material,material=new T.MeshStandardMaterial({color:original.color,vertexColors:original.vertexColors,map:original.map,roughness:original.roughness,metalness:original.metalness,side:original.side});
 for(const key of ['mosaBedStone','mosaBedGround','mosaWaterField'])material[key]=original[key];
 material.userData.waterLight=original.userData.waterLight;material.seabedSandDetail=sandDetailTexture();
 material.onBeforeCompile=function(s,...args){original.onBeforeCompile.call(this,s,...args);s.uniforms.uLocalSandDetail={value:material.seabedSandDetail};
  s.fragmentShader='uniform sampler2D uLocalSandDetail;\n'+s.fragmentShader.replace('#include <normal_fragment_maps>',`#include <normal_fragment_maps>
   float sandMix=(1.-smoothstep(35.,65.,distance(cameraPosition,vMosaBedPosition)))*smoothstep(.45,.8,abs(vMosaBedNormal.y));
   vec4 sandDetail=texture2D(uLocalSandDetail,vMosaBedPosition.xz*.5);
   vec3 sandBase=normalize(vMosaBedNormal),sandTangent=normalize(abs(sandBase.x)>.9?cross(vec3(0.,1.,0.),sandBase):vec3(1.,0.,0.)-sandBase*sandBase.x),sandBitangent=cross(sandTangent,sandBase),sandN=sandDetail.xyz*2.-1.;
   normal=normalize(mix(normal,mat3(viewMatrix)*normalize(sandBase*sandN.z+sandTangent*sandN.x+sandBitangent*sandN.y),sandMix*.55));roughnessFactor=mix(roughnessFactor,sandDetail.a,sandMix);`);
 };
 material.customProgramCacheKey=()=>original.customProgramCacheKey()+'-whole-floor-shared-sand-v2';
 const root=new T.Group();root.name='Continuous sand floor · one shared physical material';
 for(const cell of cells.values()){
  yield;const g=new T.BufferGeometry();for(const [key,a]of Object.entries(source.attributes))g.setAttribute(key,a);g.setIndex(new T.BufferAttribute(new index.constructor(cell.indices),1));
  const lod=new T.LOD();lod.position.copy(cell.sum.multiplyScalar(1/cell.count));root.add(lod);
  for(const [level,paint]of [material,original].entries()){const mesh=new T.Mesh(g,paint);mesh.position.copy(bed.position).sub(lod.position);mesh.rotation.copy(bed.rotation);mesh.scale.copy(bed.scale);mesh.receiveShadow=bed.receiveShadow;mesh.castShadow=bed.castShadow;mesh.raycast=()=>{};lod.addLevel(mesh,level?130:0,.08);}
 }
 bed.visible=false;bed.parent.add(root);root.userData.sourceTriangleCount=index.length/3;root.userData.localTriangleCount=index.length/3;root.userData.sectionCount=cells.size;return root;
}
