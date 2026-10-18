import * as THREE from "three";

const matrix = new THREE.Matrix4(),
  part = new THREE.Box3();

// Native SkinnedMesh computes its first picking sphere by skinning every
// vertex on the UI thread. A blank camera gesture used to trigger that for
// every candidate cat. The union of the joint-transformed rest boxes encloses
// every weighted vertex, without changing the model or the exact raycast.
export function updateCatPickingBounds(mesh) {
  if (!mesh?.isSkinnedMesh) return;
  const geometry = mesh.geometry;
  if (!geometry.boundingBox) geometry.computeBoundingBox();
  const box = (mesh.boundingBox ||= new THREE.Box3());
  box.makeEmpty();
  for (let i = 0; i < mesh.skeleton.bones.length; i++) {
    matrix.multiplyMatrices(
      mesh.skeleton.bones[i].matrixWorld,
      mesh.skeleton.boneInverses[i],
    );
    matrix.premultiply(mesh.bindMatrixInverse).multiply(mesh.bindMatrix);
    part.copy(geometry.boundingBox).applyMatrix4(matrix);
    box.union(part);
  }
  // Normalized byte weights can sum a few float ulps away from one on a GPU.
  box.expandByScalar(0.002);
  box.getBoundingSphere((mesh.boundingSphere ||= new THREE.Sphere()));
}

export function prepareCatPicking(model) {
  model.traverse(updateCatPickingBounds);
}
