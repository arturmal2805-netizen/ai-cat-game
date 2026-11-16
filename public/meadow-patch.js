import {installMeadowLod} from './meadow-lod.js';
import * as T from 'three';

// Local authoring candidate only. No global palette, saved coordinates, collision
// geometry, shadow settings or other biome material is changed.
export const MEADOW_PATCH=Object.freeze({x:275,z:-25,rx:27,rz:23,tileMetres:2.5,normalStrength:.28});
export const MEADOW_ASSETS=Object.freeze({
 turfColor:'./art/meadow/grass004-color-cf1c4c5a2c23.jpg',
 turfNormalRough:'./art/meadow/grass004-normal-roughness-55ff6228bfff.png',
 soilColor:'./art/meadow/ground037-color-height-dd93b05e107b.png',
 soilNormalRough:'./art/meadow/ground037-normal-roughness-cd91f1749830.png',
});
let request,ready;
export function prepareMeadowPatch(){
 if(typeof createImageBitmap!=='function')return Promise.resolve(false);
 return request??=(async()=>{
  const staged={},made=[],queue=Object.entries(MEADOW_ASSETS);
  try{
   const results=await Promise.allSettled(Array.from({length:2},async()=>{while(queue.length){
    const [role,url]=queue.shift(),r=await fetch(url,{signal:AbortSignal.timeout(15000)});if(!r.ok)throw Error('Meadow source unavailable');
    // Flip image rows exactly ONCE, equivalent to TextureLoader's default Y
    // orientation. Both GL normals and colour use the same UV basis, +Y intact.
    const bitmap=await createImageBitmap(await r.blob(),{imageOrientation:'flipY',colorSpaceConversion:'none',premultiplyAlpha:'none'}),t=new T.Texture(bitmap);
    t.name='CC0 meadow '+role;t.flipY=false;t.colorSpace=role.endsWith('Color')?T.SRGBColorSpace:T.NoColorSpace;
    t.wrapS=t.wrapT=T.RepeatWrapping;t.minFilter=T.LinearMipmapLinearFilter;t.magFilter=T.LinearFilter;t.anisotropy=4;t.generateMipmaps=true;t.userData.sharedScenery=true;t.needsUpdate=true;made.push(t);staged[role]=t;
   }}));
   if(results.some(r=>r.status==='rejected'))throw Error('Incomplete meadow sources');ready=staged;return true;
  }catch{for(const t of made){t.dispose();t.image.close();}return false;}
 })();
}
function smooth(a,b,x){const t=T.MathUtils.clamp((x-a)/(b-a),0,1);return t*t*(3-2*t);}
// One prepared irregular sod mask with a narrow worn footpath. Shared by the
// surface and grass placement: no unrelated random density field in the shader.
export function meadowCover(x,z){
 const p=MEADOW_PATCH,dx=x-p.x,dz=z-p.z,a=Math.atan2(dz,dx);
 const edge=Math.hypot(dx/p.rx,dz/p.rz)/(1+.055*Math.sin(a*3)+.035*Math.cos(a*5));
 const region=1-smooth(.88,1,edge),pathX=1.7*Math.sin(dz*.14)+.018*dz*dz;
 const clearing=(x,z,rx,rz)=>1-smooth(.65,1.15,Math.hypot((dx-x)/rx,(dz-z)/rz));
 const soil=Math.max((1-smooth(.7,1.5,Math.abs(dx-pathX)))*.88,clearing(6,7,1.4,2.1)*.8,clearing(-9,-8,1.8,1.25)*.75);
 return {region,soil,grass:region*(1-soil)};
}
function coverTexture(){
 const n=256,p=MEADOW_PATCH,data=new Uint8Array(n*n*4);
 for(let y=0;y<n;y++)for(let x=0;x<n;x++){
  const v=meadowCover(p.x+(x/(n-1)*2-1)*p.rx*1.12,p.z+(y/(n-1)*2-1)*p.rz*1.12),i=(y*n+x)*4;
  data[i]=Math.round(v.region*255);data[i+1]=Math.round(v.soil*255);data[i+2]=Math.round(v.grass*255);data[i+3]=255;
 }
 const t=new T.DataTexture(data,n,n);t.name='Prepared sod and footpath mask';t.colorSpace=T.NoColorSpace;t.magFilter=T.LinearFilter;t.minFilter=T.LinearMipmapLinearFilter;t.generateMipmaps=true;t.needsUpdate=true;return t;
}
export function applyMeadowPatch(material){
 if(!ready)return false;
 const p=MEADOW_PATCH,u={uMeadowEnabled:{value:1},uMeadowMask:{value:coverTexture()},uMeadowColor:{value:ready.turfColor},uMeadowNormalRough:{value:ready.turfNormalRough},uMeadowSoil:{value:ready.soilColor},uMeadowSoilNormalRough:{value:ready.soilNormalRough}};
 // Native warmup discovers these exact texture objects before reveal.
 material.addEventListener('dispose',()=>u.uMeadowMask.value.dispose());
 material.normalMap=null;material.normalScale.setScalar(p.normalStrength);u.uMeadowNormalScale={value:material.normalScale};material.uniforms=u;
 material.onBeforeCompile=s=>{
  Object.assign(s.uniforms,u);
  s.vertexShader='varying vec2 vMeadowPoint;varying vec3 vMeadowTangent,vMeadowBitangent;\n'+s.vertexShader.replace('#include <begin_vertex>','#include <begin_vertex>\nvMeadowPoint=vec2(position.x,-position.z);vMeadowTangent=normalize((modelViewMatrix*vec4(1.,0.,0.,0.)).xyz);vMeadowBitangent=normalize((modelViewMatrix*vec4(0.,0.,-1.,0.)).xyz);');
  s.fragmentShader=`varying vec2 vMeadowPoint;varying vec3 vMeadowTangent,vMeadowBitangent;uniform vec2 uMeadowNormalScale;uniform float uMeadowEnabled;uniform sampler2D uMeadowMask,uMeadowColor,uMeadowNormalRough,uMeadowSoil,uMeadowSoilNormalRough;\n`+s.fragmentShader;
  s.fragmentShader=s.fragmentShader.replace('#include <color_fragment>',`#include <color_fragment>
   vec2 meadowXZ=vec2(vMeadowPoint.x,-vMeadowPoint.y);
   vec2 meadowMaskUV=(meadowXZ-vec2(${p.x.toFixed(1)},${p.z.toFixed(1)}))/vec2(${(p.rx*2.24).toFixed(4)},${(p.rz*2.24).toFixed(4)})+.5;
   vec2 meadowMask=texture2D(uMeadowMask,meadowMaskUV).rg;
   float meadowMix=meadowMask.r*uMeadowEnabled;
   vec2 meadowUV=vMeadowPoint/${p.tileMetres.toFixed(3)};
   vec3 meadowN=vec3(0.,0.,1.);float meadowRough=roughness;
   if(meadowMix>.001){
    vec3 turf=texture2D(uMeadowColor,meadowUV).rgb;
    vec4 turfNR=texture2D(uMeadowNormalRough,meadowUV);
    meadowN=normalize(turfNR.xyz*2.-1.);meadowRough=turfNR.a;
    if(meadowMask.g>.001){
     vec3 soil=texture2D(uMeadowSoil,meadowUV*.73).rgb;
     vec4 soilNR=texture2D(uMeadowSoilNormalRough,meadowUV*.73);
     turf=mix(turf,soil,meadowMask.g);
     meadowN=normalize(mix(meadowN,normalize(soilNR.xyz*2.-1.),meadowMask.g));
     meadowRough=mix(meadowRough,soilNR.a,meadowMask.g);
    }
    diffuseColor.rgb=mix(diffuseColor.rgb,turf,meadowMix);
   }`);
  s.fragmentShader=s.fragmentShader.replace('#include <roughnessmap_fragment>','float roughnessFactor=mix(roughness,clamp(meadowRough,.68,1.),meadowMix);');
  s.fragmentShader=s.fragmentShader.replace('#include <normal_fragment_maps>',`if(meadowMix>.001){meadowN.xy*=uMeadowNormalScale;vec3 meadowLitNormal=normalize(vMeadowTangent*meadowN.x+vMeadowBitangent*meadowN.y+normal*meadowN.z);normal=normalize(mix(normal,meadowLitNormal,meadowMix));}`);
 };
 material.customProgramCacheKey=()=> 'meadow-sod-patch-planar-v3-packed-data';material.needsUpdate=true;
 material.userData.meadow={...p,normalFormat:'GL +Y; rows flipped once; no green-channel inversion',colorSpace:'sRGB colour; linear normal/roughness',soilPacking:'RGB colour+A height ignored; RGB normal+A roughness',uniforms:u};
 return true;
}

function grassGeometry(segments){
 const pos=[],coarse=[],norm=[],coarseNorm=[],colors=[],windWeights=[],idx=[];
 for(let b=0;b<8;b++){
  const a=b*2.39996323,dx=Math.sin(a)*(.045+b%4*.032),dz=Math.cos(a)*(.045+b%4*.032),h=.12+b%4*.03,w=.0085+b%3*.003,bend=.075+b%3*.035,first=pos.length/3;
  const point=(t,side)=>{const width=w*(1-t)*(.75+.55*Math.sin(t*Math.PI));return [dx+Math.cos(a)*width*side+Math.sin(a)*t*t*bend,h*(Math.sin(t*Math.PI*.5)-t*t*t*.3),dz-Math.sin(a)*width*side+Math.cos(a)*t*t*bend];};
  const normal=t=>{const slope=h*(Math.PI*.5*Math.cos(t*Math.PI*.5)-.9*t*t);return new T.Vector3(-Math.sin(a)*slope*.55,h*.6+bend*2*t,-Math.cos(a)*slope*.55).normalize();};
  const lower=point(0,-1),upper=point(1,-1),n0=normal(0),n1=normal(1);
  for(let k=0;k<=segments;k++){
   const t=k/segments;
   for(const side of [-1,1]){
    const v=point(t,side);windWeights.push(v[1]*v[1],upper[1]*upper[1]*t,upper[1]);
    pos.push(...v);const l=side===-1?lower:point(0,side),r=side===-1?upper:point(1,side);coarse.push(...l.map((v,i)=>T.MathUtils.lerp(v,r[i],t)));
    norm.push(...normal(t).toArray());coarseNorm.push(...n0.clone().lerp(n1,t).toArray());
    const c=new T.Color(b%7===0?0x969064:0x71834a).lerp(new T.Color(0x94a566),t*.48);colors.push(c.r,c.g,c.b);
   }
   if(k<segments){const i=first+k*2;idx.push(i,i+1,i+2,i+1,i+3,i+2);}
  }
 }
 const g=new T.BufferGeometry();g.setAttribute('position',new T.Float32BufferAttribute(pos,3));g.setAttribute('meadowWind',new T.Float32BufferAttribute(windWeights,3));g.setAttribute('meadowCoarse',new T.Float32BufferAttribute(coarse,3));g.setAttribute('meadowCoarseNormal',new T.Float32BufferAttribute(coarseNorm,3));g.setAttribute('normal',new T.Float32BufferAttribute(norm,3));g.setAttribute('color',new T.Float32BufferAttribute(colors,3));g.setIndex(idx);g.computeBoundingSphere();return g;
}
export function* meadowGrassSteps(clear=()=>true){
 if(!ready)return null;
 const root=new T.Group();root.name='Local sod candidate: continuous clumps, metre-scale LOD';root.userData.meadowGrass=true;
 const near=grassGeometry(3),mid=grassGeometry(1),material=new T.MeshStandardMaterial({vertexColors:true,roughness:.94,side:T.DoubleSide});
 const wind={value:0};material.uniforms={uMeadowWind:wind};
 const vertex=`uniform float uMeadowWind;attribute vec3 meadowWind;attribute vec3 meadowCoarse;attribute vec3 meadowCoarseNormal;attribute vec4 meadowPose;attribute float meadowScale;\n`;
 material.onBeforeCompile=s=>{
  s.uniforms.uMeadowWind=wind;s.vertexShader=vertex+s.vertexShader;
  s.vertexShader=s.vertexShader.replace('#include <beginnormal_vertex>',`#include <beginnormal_vertex>
   vec3 meadowRoot=(modelMatrix*vec4(meadowPose.x,0.,meadowPose.y,1.)).xyz;
   float meadowDistance=distance(cameraPosition,meadowRoot);
   float meadowShape=smoothstep(6.,12.,meadowDistance);
   objectNormal=mix(objectNormal,meadowCoarseNormal,meadowShape);
   objectNormal=vec3(meadowPose.z*objectNormal.x+meadowPose.w*objectNormal.z,meadowScale*objectNormal.y,-meadowPose.w*objectNormal.x+meadowPose.z*objectNormal.z);
   float meadowGust=sin(uMeadowWind*1.1+meadowRoot.x*.17+meadowRoot.z*.11)*.009+sin(uMeadowWind*.71+meadowRoot.z*.29)*.005;
   vec2 meadowBreeze=vec2(1.,.35)*meadowGust;
   objectNormal.y-=dot(objectNormal.xz,meadowBreeze)*mix(2.*position.y,meadowWind.z,meadowShape)*meadowScale/(.28*.28);
  `).replace('#include <begin_vertex>',`#include <begin_vertex>
   transformed=mix(transformed,meadowCoarse,meadowShape);
   transformed*=1.-smoothstep(30.,46.,meadowDistance);
   transformed=vec3(meadowPose.z*transformed.x+meadowPose.w*transformed.z,meadowScale*transformed.y,-meadowPose.w*transformed.x+meadowPose.z*transformed.z)+vec3(meadowPose.x,0.,meadowPose.y);
   float meadowCollapse=1.-smoothstep(30.,46.,meadowDistance);
   transformed.xz+=meadowBreeze*mix(meadowWind.x,meadowWind.y,meadowShape)*pow(meadowScale*meadowCollapse/.28,2.);
  `);
 };material.customProgramCacheKey=()=> 'meadow-sod-grass-packed-wind-v2';
 const p=MEADOW_PATCH,dummy=new T.Object3D(),buckets=new Map();let seed=918275,count=0;const random=()=>((seed=(Math.imul(seed,1664525)+1013904223)>>>0)/4294967296);
 for(let z=p.z-p.rz*1.1;z<p.z+p.rz*1.1;z+=.23){
  yield;
  for(let x=p.x-p.rx*1.1;x<p.x+p.rx*1.1;x+=.23){
   const px=x+(random()-.5)*.19,pz=z+(random()-.5)*.19,v=meadowCover(px,pz);
   if(v.grass<.12||random()>v.grass||!clear(px,pz,.42,.42))continue;
   // Keep the visible worn path genuinely open for the original native cat.
   if(v.soil>.4)continue;
   const key=Math.floor(px/7)+':'+Math.floor(pz/7),own=buckets.get(key)||[];
   const tuft=.5+.5*Math.sin(px*1.13+.4*Math.sin(pz*.7))*Math.cos(pz*.94+.3*Math.cos(px*.8));
   if(random()>.68+tuft*.32)continue;
   own.push({x:px,z:pz,a:random()*Math.PI*2,s:(.65+tuft*.55)*(.8+random()*.4)});buckets.set(key,own);count++;
  }
 }
 for(const own of buckets.values()){
  yield;
  const cx=own.reduce((s,p)=>s+p.x,0)/own.length,cz=own.reduce((s,p)=>s+p.z,0)/own.length;
  const lod=new T.LOD();lod.position.set(cx,.14,cz);root.add(lod);
  const radius=Math.max(...own.map(p=>Math.hypot(p.x-cx,p.z-cz)));
  for(const [g,d]of [[near,0],[mid,12+radius+.001]]){
   // Preserve the original authored matrix's exact Float32 components, but
   // upload only translation XZ, yaw*scale and vertical scale: five floats,
   // instead of sixteen. Geometry/colour/detail and every clump are unchanged.
   const geometry=new T.InstancedBufferGeometry();for(const [name,attribute]of Object.entries(g.attributes))geometry.setAttribute(name,attribute.clone());geometry.setIndex(g.index.clone());geometry.instanceCount=own.length;
   const pose=new Float32Array(own.length*4),scales=new Float32Array(own.length);let maxScale=0;
   for(let i=0;i<own.length;i++){const p=own[i];dummy.position.set(p.x-cx,0,p.z-cz);dummy.rotation.y=p.a;dummy.scale.setScalar(p.s);dummy.updateMatrix();const e=dummy.matrix.elements;pose.set([e[12],e[14],e[0],e[8]],i*4);scales[i]=e[5];maxScale=Math.max(maxScale,p.s);}
   geometry.setAttribute('meadowPose',new T.InstancedBufferAttribute(pose,4));geometry.setAttribute('meadowScale',new T.InstancedBufferAttribute(scales,1));
   // Shader poses occupy the whole chunk, not just the source blade at zero.
   const extent=radius+g.boundingSphere.radius*maxScale+.025;geometry.boundingSphere=new T.Sphere(new T.Vector3(),extent);geometry.boundingBox=new T.Box3(new T.Vector3(-extent,-.01,-extent),new T.Vector3(extent,.4*maxScale,extent));
   const mesh=new T.Mesh(geometry,material);mesh.userData.meadowPacked=true;mesh.receiveShadow=true;mesh.castShadow=false;lod.addLevel(mesh,d,0);
  }
  lod.addLevel(new T.Group(),46+radius+.001,0);
  const origins=new T.Box3();for(const p of own)origins.expandByPoint(new T.Vector3(p.x-cx,0,p.z-cz));
  installMeadowLod(lod,origins);
 }
 root.userData.instanceCount=count;root.userData.wind=wind;root.userData.update=(time,reduced=false)=>{wind.value=reduced?0:time;};return root;
}
