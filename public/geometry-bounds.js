import * as T from 'three';
const nativeSphere=T.BufferGeometry.prototype.computeBoundingSphere;
let halfValues;
// The exact native static-geometry sphere, prepared off the visible render path.
// Keep original vertex order/getters (including Float16), centre and radius.
// Never expose a partial bound or change an animated/custom bounds contract.
export function* geometryBoundsSteps(geometry){
 const p=geometry?.attributes?.position;
 if(!p||p.isGLBufferAttribute||geometry.boundingSphere!==null||geometry.computeBoundingSphere!==nativeSphere||geometry.morphAttributes.position?.length)return false;
 const buffer=p.isInterleavedBufferAttribute?p.data:p,array=buffer.array,version=buffer.version,count=p.count,box=new T.Box3(),sphere=new T.Sphere();
 const getterX=p.getX,getterY=p.getY,getterZ=p.getZ,normalized=p.normalized,itemSize=p.itemSize;
 const valid=()=>p.getX===getterX&&p.getY===getterY&&p.getZ===getterZ&&p.normalized===normalized&&p.itemSize===itemSize&&geometry.computeBoundingSphere===nativeSphere&&geometry.boundingSphere===null&&geometry.attributes.position===p&&buffer.array===array&&buffer.version===version&&p.count===count&&!geometry.morphAttributes.position?.length;
 // Select raw typed reads only for Three's unchanged getter implementations.
 // Half floats have exactly representable Float32 values; a shared decode table
 // retains every bit while avoiding six expensive virtual getters per vertex.
 const prototype=p.isInterleavedBufferAttribute?T.InterleavedBufferAttribute.prototype:p.isFloat16BufferAttribute?T.Float16BufferAttribute.prototype:T.BufferAttribute.prototype;
 const direct=!p.normalized&&['getX','getY','getZ'].every(k=>p[k]===prototype[k]);
 if(direct&&p.isFloat16BufferAttribute&&!halfValues){
  const table=new Float32Array(65536);
  for(let i=0;i<table.length;i++){if((i&4095)===0){yield;if(!valid())return false;}table[i]=T.DataUtils.fromHalfFloat(i);}
  halfValues=table;
 }
 const half=direct&&p.isFloat16BufferAttribute,offset=p.isInterleavedBufferAttribute?p.offset:0,stride=p.isInterleavedBufferAttribute?p.data.stride:p.itemSize;
 let minX=Infinity,minY=Infinity,minZ=Infinity,maxX=-Infinity,maxY=-Infinity,maxZ=-Infinity;
 for(let i=0;i<count;i++){
  if((i&1023)===0){yield;if(!valid())return false;}
  const k=offset+i*stride,x=direct?(half?halfValues[array[k]]:array[k]):p.getX(i),y=direct?(half?halfValues[array[k+1]]:array[k+1]):p.getY(i),z=direct?(half?halfValues[array[k+2]]:array[k+2]):p.getZ(i);
  minX=Math.min(minX,x);minY=Math.min(minY,y);minZ=Math.min(minZ,z);maxX=Math.max(maxX,x);maxY=Math.max(maxY,y);maxZ=Math.max(maxZ,z);
 }
 box.min.set(minX,minY,minZ);box.max.set(maxX,maxY,maxZ);box.getCenter(sphere.center);let radiusSquared=0;
 for(let i=0;i<count;i++){
  if((i&1023)===0){yield;if(!valid())return false;}
  const k=offset+i*stride,x=direct?(half?halfValues[array[k]]:array[k]):p.getX(i),y=direct?(half?halfValues[array[k+1]]:array[k+1]):p.getY(i),z=direct?(half?halfValues[array[k+2]]:array[k+2]):p.getZ(i),dx=sphere.center.x-x,dy=sphere.center.y-y,dz=sphere.center.z-z;
  radiusSquared=Math.max(radiusSquared,dx*dx+dy*dy+dz*dz);
 }
 sphere.radius=Math.sqrt(radiusSquared);
 if(!valid())return false;
 // Preserve Three's diagnostic for invalid source values rather than hiding it.
 if(Number.isNaN(sphere.radius)){geometry.computeBoundingSphere();return true;}
 geometry.boundingSphere=sphere;return true;
}
