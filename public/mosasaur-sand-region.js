import * as T from 'three';
import {sandDetailTexture} from './mosasaur-sand-detail.js';
import {SEABED_REEF_PATCH as P} from './mosasaur-seabed-patch-data.js';
import {WORLD_CENTERS} from './world-layout.js';
// Partition the ORIGINAL floor triangles. No duplicate overlay, shifted floor,
// extra terrain evaluation or ocean-wide detail branch.
export function* installSandRegionSteps(bed){
 const source=bed.geometry,index=source.index.array,pos=source.attributes.position,near=[],far=[],cx=P.x,cz=P.z;
 for(let i=0;i<index.length;i+=3){
  if(i%768===0)yield;
  let selected=false;for(let j=0;j<3;j++){const k=index[i+j],x=pos.getX(k)*bed.scale.x,z=-pos.getY(k)*bed.scale.y;if(Math.hypot((x-cx)/P.rx,(z-cz)/P.rz)<1.15)selected=true;}
  (selected?near:far).push(index[i],index[i+1],index[i+2]);
 }
 if(!near.length)return null;
 const local=new T.BufferGeometry();for(const [key,a]of Object.entries(source.attributes))local.setAttribute(key,a);
 local.setIndex(new T.BufferAttribute(new index.constructor(near),1));source.setIndex(new T.BufferAttribute(new index.constructor(far),1));
 const original=bed.material,material=new T.MeshStandardMaterial({color:original.color,vertexColors:original.vertexColors,map:original.map,roughness:original.roughness,metalness:original.metalness,side:original.side});
 for(const key of ['mosaBedStone','mosaBedGround','mosaWaterField'])material[key]=original[key];
 material.userData.waterLight=original.userData.waterLight;material.seabedSandDetail=sandDetailTexture();
 material.onBeforeCompile=function(s,...args){original.onBeforeCompile.call(this,s,...args);s.uniforms.uLocalSandDetail={value:material.seabedSandDetail};s.uniforms.uLocalSandCenter={value:new T.Vector2(WORLD_CENTERS.autumn[0]+cx,WORLD_CENTERS.autumn[1]+cz)};
  s.fragmentShader='uniform sampler2D uLocalSandDetail;uniform vec2 uLocalSandCenter;\n'+s.fragmentShader.replace('#include <normal_fragment_maps>',`#include <normal_fragment_maps>
   vec2 sandDelta=vMosaBedPosition.xz-uLocalSandCenter;
   float sandR=length(sandDelta/vec2(${P.rx.toFixed(1)},${P.rz.toFixed(1)}))+.055*sin(sandDelta.x*.8)*sin(sandDelta.y*.9);
   float sandMix=(1.-smoothstep(.65,1.,sandR))*smoothstep(.45,.8,abs(vMosaBedNormal.y));
   vec4 sandDetail=texture2D(uLocalSandDetail,vMosaBedPosition.xz*.5);
   vec3 sandBase=normalize(vMosaBedNormal),sandTangent=normalize(vec3(1.,0.,0.)-sandBase*sandBase.x),sandBitangent=cross(sandTangent,sandBase),sandN=sandDetail.xyz*2.-1.;
   normal=normalize(mix(normal,mat3(viewMatrix)*normalize(sandBase*sandN.z+sandTangent*sandN.x+sandBitangent*sandN.y),sandMix*.75));roughnessFactor=mix(roughnessFactor,sandDetail.a,sandMix);`);
 };
 material.customProgramCacheKey=()=>original.customProgramCacheKey()+'-local-authored-sand-v1';
 const mesh=new T.Mesh(local,material);mesh.name='Exact seabed sand triangles · local PBR detail';mesh.position.copy(bed.position);mesh.rotation.copy(bed.rotation);mesh.scale.copy(bed.scale);mesh.receiveShadow=bed.receiveShadow;mesh.castShadow=bed.castShadow;bed.parent.add(mesh);
 mesh.userData.sourceTriangleCount=index.length/3;mesh.userData.localTriangleCount=near.length/3;return mesh;
}
