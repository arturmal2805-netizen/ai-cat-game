import * as T from 'three';
import {MeshoptSimplifier} from 'meshoptimizer/simplifier';
let ready=false;if(MeshoptSimplifier.supported)await MeshoptSimplifier.ready.then(()=>{ready=true;},()=>{});
// Selected-model authoring only. Retain the dense sculpt's silhouette/normals
// within a fourteen-millimetre bound while emitting the released mobile triangle
// budget. Source fallback and downloaded templates run the same authoring.
export function retopologizeZoo(geometry,targetTriangles,sockets=[]){
 if(!ready||!targetTriangles||geometry.index.count<=targetTriangles*3)return geometry;
 const p=geometry.attributes.position,n=geometry.attributes.normal;
 const locks=new Uint8Array(p.count);for(let i=0;i<p.count;i++)for(const s of sockets){const r=Math.hypot((p.getX(i)-s.pos[0])/s.size[0],(p.getY(i)-s.pos[1])/s.size[1],(p.getZ(i)-s.pos[2])/s.size[2]);if(Math.abs(r-1)<.28)locks[i]=1;}
 const [index,error]=MeshoptSimplifier.simplifyWithAttributes(new Uint32Array(geometry.index.array),p.array,3,n.array,3,[.005,.005,.005],locks,targetTriangles*3,.014,['ErrorAbsolute','Regularize']);
 const [remap,count]=MeshoptSimplifier.compactMesh(index),positions=new Float32Array(count*3),normals=new Float32Array(count*3);
 for(let i=0;i<remap.length;i++)if(remap[i]!==0xffffffff){const j=remap[i];positions.set(p.array.subarray(i*3,i*3+3),j*3);normals.set(n.array.subarray(i*3,i*3+3),j*3);}
 geometry.setAttribute('position',new T.BufferAttribute(positions,3));geometry.setAttribute('normal',new T.BufferAttribute(normals,3));geometry.setIndex(new T.BufferAttribute(index,1));geometry.userData.sculptError=error;return geometry;
}
