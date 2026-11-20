import * as T from 'three';
const nativeSphere=T.BufferGeometry.prototype.computeBoundingSphere;
// The exact native static-geometry sphere, prepared off the visible render path.
// Keep original vertex order/getters (including Float16), centre and radius.
// Never expose a partial bound or change an animated/custom bounds contract.
export function* geometryBoundsSteps(geometry){
 const p=geometry?.attributes?.position;
 if(!p||p.isGLBufferAttribute||geometry.boundingSphere!==null||geometry.computeBoundingSphere!==nativeSphere||geometry.morphAttributes.position?.length)return false;
 const buffer=p.isInterleavedBufferAttribute?p.data:p,array=buffer.array,version=buffer.version,count=p.count,box=new T.Box3(),point=new T.Vector3(),sphere=new T.Sphere();
 const valid=()=>geometry.boundingSphere===null&&geometry.attributes.position===p&&buffer.array===array&&buffer.version===version&&p.count===count&&!geometry.morphAttributes.position?.length;
 for(let i=0;i<count;i++){if((i&1023)===0){yield;if(!valid())return false;}box.expandByPoint(point.fromBufferAttribute(p,i));}
 box.getCenter(sphere.center);let radiusSquared=0;
 for(let i=0;i<count;i++){if((i&1023)===0){yield;if(!valid())return false;}point.fromBufferAttribute(p,i);radiusSquared=Math.max(radiusSquared,sphere.center.distanceToSquared(point));}
 sphere.radius=Math.sqrt(radiusSquared);
 if(!valid())return false;
 // Preserve Three's diagnostic for invalid source values rather than hiding it.
 if(Number.isNaN(sphere.radius)){geometry.computeBoundingSphere();return true;}
 geometry.boundingSphere=sphere;return true;
}
