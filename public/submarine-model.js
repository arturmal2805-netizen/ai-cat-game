import * as T from 'three';
import {batchModelGeometry} from './model-batching.js';
export function createSubmarineModel(){
 const root=new T.Group(),staticParts=new T.Group(),canopy=new T.Group(),propeller=new T.Group(),clock={value:0},thrust={value:0};root.name='Chichi · turquoise explorer submarine';
 const paints=new Map();function mat(color,roughness=.35){const key=color+':'+roughness;if(!paints.has(key))paints.set(key,new T.MeshStandardMaterial({color,roughness,metalness:.18}));return paints.get(key);}
 function oval(parent,color,x,y,z,sx,sy,sz){const m=new T.Mesh(new T.SphereGeometry(1,24,16),mat(color));m.position.set(x,y,z);m.scale.set(sx,sy,sz);parent.add(m);return m;}
 function box(parent,color,x,y,z,sx,sy,sz){const m=new T.Mesh(new T.BoxGeometry(sx,sy,sz),mat(color));m.position.set(x,y,z);parent.add(m);return m;}
 oval(staticParts,0xf5b844,0,-.38,-1.45,1.12,.96,1.55);oval(staticParts,0x2c9fab,0,-.78,.15,1.35,.4,2.8);
 for(const s of [-1,1]){oval(staticParts,0xffcf63,s*1.2,-.55,-.25,.45,.18,1.85);box(staticParts,0x356375,s*.45,.78,-1.15,.16,.42,.4);}
 // Open cockpit surround: the original native cat remains visible through it.
 const rim=new T.Mesh(new T.TorusGeometry(1.19,.065,8,64),mat(0xffd474));rim.scale.set(1,1.1,1);rim.position.set(0,.15,1.55);staticParts.add(rim);
 const canopyMesh=new T.Mesh(new T.SphereGeometry(1,32,24),new T.MeshStandardMaterial({color:0xadefff,roughness:.09,metalness:.08,transparent:true,opacity:.16,depthWrite:false,side:T.DoubleSide}));canopyMesh.scale.set(1.26,1.18,1.95);canopyMesh.position.set(0,.32,.65);canopy.add(canopyMesh);canopy.position.set(0,0,0);root.add(canopy);
 box(staticParts,0x394c66,0,-.55,.15,.8,.16,.72);box(staticParts,0x576984,0,-.08,-.12,.76,.9,.12);
 const console=box(staticParts,0x2c455a,0,-.05,1.12,.9,.22,.34);console.rotation.x=-.2;
 for(const s of [-1,1]){box(staticParts,0x6ee8d5,s*.21,.09,1.10,.30,.016,.2);const handle=box(staticParts,0xf3bb64,s*.39,.12,.89,.05,.25,.06);handle.rotation.z=s*.2;}
 const engineRing=new T.Mesh(new T.TorusGeometry(.57,.10,8,32),mat(0x3c6b7a));engineRing.position.set(0,-.2,-2.8);staticParts.add(engineRing);
 for(let i=0;i<3;i++){const a=i*Math.PI*2/3,blade=box(propeller,0xe7b764,Math.sin(a)*.3,Math.cos(a)*.3,0,.15,.67,.05);blade.rotation.z=-a;}
 propeller.position.set(0,-.2,-2.85);root.add(propeller);
 for(const s of [-1,1]){const lamp=oval(staticParts,0xe8fbff,s*.9,-.33,1.9,.13,.13,.10);lamp.material=new T.MeshStandardMaterial({color:0xebffff,emissive:0x90deed,emissiveIntensity:.7,roughness:.16});}
 const baked=batchModelGeometry(staticParts,{combineColors:true});root.add(baked);staticParts.traverse(m=>{if(m.isMesh){m.geometry.dispose();}});
 const bubbleGeometry=new T.SphereGeometry(.075,6,4),bubbleMaterial=new T.MeshBasicMaterial({color:0xa7efff,transparent:true,opacity:.35,depthWrite:false});
 bubbleMaterial.onBeforeCompile=s=>{s.uniforms.uSubTime=clock;s.uniforms.uSubThrust=thrust;s.vertexShader='uniform float uSubTime;uniform float uSubThrust;attribute float aSubPhase;\n'+s.vertexShader.replace('#include <begin_vertex>','#include <begin_vertex>\nfloat life=fract(uSubTime*.8+aSubPhase);transformed*=sin(life*3.14159)*uSubThrust;transformed+=vec3(sin(aSubPhase*63.)*.35,life*.7,-life*4.);');};bubbleMaterial.customProgramCacheKey=()=> 'submarine-fixed-bubbles-v1';
 bubbleGeometry.setAttribute('aSubPhase',new T.InstancedBufferAttribute(Float32Array.from({length:40},(_,i)=>i/40),1));const bubbles=new T.InstancedMesh(bubbleGeometry,bubbleMaterial,40);for(let i=0;i<40;i++)bubbles.setMatrixAt(i,new T.Matrix4());bubbles.instanceMatrix.needsUpdate=true;bubbles.position.copy(propeller.position);bubbles.frustumCulled=false;root.add(bubbles);
 root.userData.seat=new T.Vector3(0,-.55,.25);root.userData.canopy=canopy;root.userData.propeller=propeller;root.userData.bubbles=bubbles;root.userData.update=(t,speed=0,open=0,reduced=false)=>{clock.value=reduced?0:t;thrust.value=reduced?0:Math.min(1,Math.abs(speed)/6);propeller.rotation.z=reduced?0:t*(2+Math.abs(speed)*1.5);canopy.rotation.x=-open*.8;bubbles.visible=thrust.value>.01;};
 root.userData.dispose=()=>{const geometries=new Set(),materials=new Set();root.traverse(m=>{if(m.geometry)geometries.add(m.geometry);for(const a of Array.isArray(m.material)?m.material:[m.material])if(a)materials.add(a);});geometries.forEach(g=>g.dispose());materials.forEach(m=>m.dispose());};return root;
}
