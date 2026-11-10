import * as T from 'three';
// Retain the original region's transform, original Float32 instance rows and
// original tint. Smaller near/middle bounds let the native final-camera frustum
// reject offscreen colonies. Far overviews keep the original combined draw.
export function coralCellIndices(batch){
 // Keep the original primitive order at intersecting/coplanar colonies.
 const cells=[];let previous;for(let i=0;i<batch.length;i++){const p=batch[i],key=[Math.floor(p.x/18),Math.floor(p.y/24),Math.floor(p.z/18)].join(':');if(key!==previous)cells.push([]);cells.at(-1).push(i);previous=key;}return cells;
}
export function coralCellMesh(source,geometry,indices,ids,reuse=null){
 const mesh=new T.InstancedMesh(geometry,source.material,indices.length);mesh.name=source.name;mesh.userData.colonyIds=indices.map(i=>ids[i]);
 if(reuse){mesh.instanceMatrix=reuse.instanceMatrix;mesh.instanceColor=reuse.instanceColor;mesh.boundingBox=reuse.boundingBox.clone();mesh.boundingSphere=source.boundingSphere.clone();mesh.userData.coralCullSphere=reuse.userData.coralCullSphere;mesh.frustumCulled=false;return mesh;}
 for(let i=0;i<indices.length;i++){mesh.instanceMatrix.array.set(source.instanceMatrix.array.subarray(indices[i]*16,indices[i]*16+16),i*16);mesh.instanceColor??=new T.InstancedBufferAttribute(new Float32Array(indices.length*3),3);mesh.instanceColor.array.set(source.instanceColor.array.subarray(indices[i]*3,indices[i]*3+3),i*3);}
 mesh.instanceMatrix.needsUpdate=true;mesh.computeBoundingBox();mesh.boundingBox.expandByScalar(.65);mesh.userData.coralCullSphere=mesh.boundingBox.getBoundingSphere(new T.Sphere());
 // Three uses this native sphere for depth sorting too. Keep the exact former
 // batch sphere, while the owning LOD uses the tighter sphere for visibility.
 mesh.boundingSphere=source.boundingSphere.clone();mesh.frustumCulled=false;return mesh;
}
export function installCoralCellCulling(lod){
 const update=lod.update,frustum=new T.Frustum(),projection=new T.Matrix4(),sphere=new T.Sphere();
 lod.update=function(camera){update.call(this,camera);projection.multiplyMatrices(camera.projectionMatrix,camera.matrixWorldInverse);frustum.setFromProjectionMatrix(projection,camera.coordinateSystem,camera.reversedDepth);
  for(const level of this.levels){if(!level.object.visible)continue;for(const mesh of level.object.children){const bound=mesh.userData.coralCullSphere;if(bound)mesh.visible=frustum.intersectsSphere(sphere.copy(bound).applyMatrix4(mesh.matrixWorld));}}
 };
}
