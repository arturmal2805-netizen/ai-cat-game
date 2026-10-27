import * as THREE from 'three';

// Keep Three's exact vertex order and sphere algorithm. Its native bounds pass
// multiplies the same bone matrices for every weighted vertex; one synchronous
// bounds calculation can safely reuse those products. No model/GPU data changes.
const installed=new WeakSet(),nativeSphere=THREE.SkinnedMesh.prototype.computeBoundingSphere,
  nativeVertex=THREE.SkinnedMesh.prototype.getVertexPosition,
  nativeTransform=THREE.SkinnedMesh.prototype.applyBoneTransform;
export function cacheNativeSkinBounds(root){
 root.traverse(mesh=>{
  if(!mesh.isSkinnedMesh||installed.has(mesh)||mesh.computeBoundingSphere!==nativeSphere||!Object.isExtensible(mesh))return;
  installed.add(mesh);
  const matrices=[],indices=new THREE.Vector4(),weights=new THREE.Vector4(),base=new THREE.Vector4(),point=new THREE.Vector4();
  mesh.computeBoundingSphere=function(){
   const descriptor=Object.getOwnPropertyDescriptor(this,'applyBoneTransform'),skeleton=this.skeleton;
   if(!Object.isExtensible(this)||this.getVertexPosition!==nativeVertex||this.applyBoneTransform!==nativeTransform||
     descriptor&&(!('value'in descriptor)||!descriptor.writable)||
     !skeleton?.bones.every((b,i)=>b?.matrixWorld&&skeleton.boneInverses[i]))return nativeSphere.call(this);
   matrices.length=skeleton.bones.length;
   for(let i=0;i<matrices.length;i++)(matrices[i]||=new THREE.Matrix4()).multiplyMatrices(skeleton.bones[i].matrixWorld,skeleton.boneInverses[i]);
   this.applyBoneTransform=function(index,target){
    const geometry=this.geometry;
    indices.fromBufferAttribute(geometry.attributes.skinIndex,index);
    weights.fromBufferAttribute(geometry.attributes.skinWeight,index);
    base.set(target.x,target.y,target.z,target.isVector4?target.w:1).applyMatrix4(this.bindMatrix);
    if(target.isVector4)target.set(0,0,0,0);else target.set(0,0,0);
    for(let i=0;i<4;i++){
     const weight=weights.getComponent(i);
     if(weight!==0)target.addScaledVector(point.copy(base).applyMatrix4(matrices[indices.getComponent(i)]),weight);
    }
    if(target.isVector4)target.w=base.w;
    return target.applyMatrix4(this.bindMatrixInverse);
   };
   try{return nativeSphere.call(this);}
   finally{if(descriptor)Object.defineProperty(this,'applyBoneTransform',descriptor);else delete this.applyBoneTransform;}
  };
 });
}
