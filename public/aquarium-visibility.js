import * as THREE from "three";

// Cull complete fish against their exact articulated bounds, never by distance
// or screen size. A close visitor/fish camera need not submit the other halls'
// unseen kittens. All geometry, small fish and animation stay intact.
export function fishVisibility(mesh, palette, parts) {
  const frustum = new THREE.Frustum(),
    projection = new THREE.Matrix4(),
    transform = new THREE.Matrix4(),
    local = new THREE.Matrix4(),
    sphere = new THREE.Sphere();
  const bounds = parts.map(([name, geometries]) => {
    const box = new THREE.Box3();
    for (const geometry of geometries) {
      if (!geometry.boundingBox) geometry.computeBoundingBox();
      box.union(geometry.boundingBox);
    }
    return [name, box.getBoundingSphere(new THREE.Sphere())];
  });
  return (camera, all = false) => {
    projection.multiplyMatrices(
      camera.projectionMatrix,
      camera.matrixWorldInverse,
    );
    frustum.setFromProjectionMatrix(
      projection,
      camera.coordinateSystem,
      camera.reversedDepth,
    );
    const ids = palette.visibleIds.value;
    let visible = 0;
    for (let i = 0; i < palette.tank.fish; i++) {
      let inside = all;
      if (!inside)
        for (const [name, bound] of bounds) {
          palette.matrixAt(i, name, local);
          transform.multiplyMatrices(mesh.matrixWorld, local);
          sphere.copy(bound).applyMatrix4(transform);
          if (frustum.intersectsSphere(sphere)) {
            inside = true;
            break;
          }
        }
      if (inside) ids[visible++] = i;
    }
    mesh.count = visible;
    return visible;
  };
}
