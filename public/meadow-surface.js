import * as T from 'three';
import {MEADOW_PATCH,applyMeadowPatch} from './meadow-patch.js';

// Clip the original triangles once. The local PBR shader never shades the rest
// of the island, and both materials meet on the same original walking plane.
// Attribute interpolation keeps the old UVs/normals at every new seam vertex.
export function splitMeadowSurface(source,patch=MEADOW_PATCH){
 const names=Object.keys(source.attributes),sizes=names.map(n=>source.attributes[n].itemSize),offsets=[];let stride=0;
 for(const size of sizes){offsets.push(stride);stride+=size;}
 const positions=source.attributes.position,positionOffset=offsets[names.indexOf('position')],buckets=[[],[]],index=source.index;
 const bounds={left:patch.x-patch.rx*1.13,right:patch.x+patch.rx*1.13,bottom:patch.z-patch.rz*1.13,top:patch.z+patch.rz*1.13};
 const clip=(polygon,axis,limit,positive)=>{
  const out=[];for(let i=0;i<polygon.length;i++){
   const a=polygon[i],b=polygon[(i+1)%polygon.length],da=(a[positionOffset+axis]-limit)*(positive?1:-1),db=(b[positionOffset+axis]-limit)*(positive?1:-1);
   if(da>=0)out.push(a);
   if((da<0)!==(db<0)){const t=da/(da-db);out.push(a.map((v,k)=>v+(b[k]-v)*t));}
  }return out;
 };
 const emit=(polygon,bucket)=>{for(let i=1;i+1<polygon.length;i++){const a=polygon[0],b=polygon[i],c=polygon[i+1],k=positionOffset;
  const ab=new T.Vector3(b[k]-a[k],b[k+1]-a[k+1],b[k+2]-a[k+2]),ac=new T.Vector3(c[k]-a[k],c[k+1]-a[k+1],c[k+2]-a[k+2]);if(ab.cross(ac).lengthSq()<1e-18)continue;
  buckets[bucket].push(...a,...b,...c);
 }};
 for(let i=0;i<(index?.count??positions.count);i+=3){
  const vertices=[0,1,2].map(j=>{const id=index?index.getX(i+j):i+j,out=[];for(const name of names){const a=source.attributes[name];for(let k=0;k<a.itemSize;k++)out.push(a.getComponent(id,k));}return out;});
  const n=source.attributes.normal;if(n&&[0,1,2].some(j=>n.getY(index?index.getX(i+j):i+j)<.9)){emit(vertices,0);continue;}
  emit(clip(vertices,0,bounds.left,false),0);emit(clip(vertices,0,bounds.right,true),0);
  let middle=clip(clip(vertices,0,bounds.left,true),0,bounds.right,false);
  emit(clip(middle,2,bounds.bottom,false),0);emit(clip(middle,2,bounds.top,true),0);
  middle=clip(clip(middle,2,bounds.bottom,true),2,bounds.top,false);emit(middle,1);
 }
 const geometry=new T.BufferGeometry(),all=[...buckets[0],...buckets[1]],count=all.length/stride;
 for(let n=0;n<names.length;n++){const data=new Float32Array(count*sizes[n]);for(let i=0;i<count;i++)for(let k=0;k<sizes[n];k++)data[i*sizes[n]+k]=all[i*stride+offsets[n]+k];geometry.setAttribute(names[n],new T.BufferAttribute(data,sizes[n]));}
 geometry.addGroup(0,buckets[0].length/stride,0);geometry.addGroup(buckets[0].length/stride,buckets[1].length/stride,1);geometry.computeBoundingBox();geometry.computeBoundingSphere();return geometry;
}
export function installMeadowSurface(mesh){
 const local=mesh.material.clone();if(!applyMeadowPatch(local)){local.dispose();return false;}
 const old=mesh.geometry;mesh.geometry=splitMeadowSurface(old);old.dispose();mesh.material=[mesh.material,local];return true;
}
