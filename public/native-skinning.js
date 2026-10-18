// Keep Chichi's native SkinnedMesh renderer, bones, fur and materials. Three's
// generic shader fetches four bone matrices even when most weights are zero.
// A zero-weight joint contributes exactly zero to both position and normal.
export function skipUnusedSkinJoints(cat) {
  const materials = new Set();
  cat.traverse((mesh) => {
    if (mesh.isSkinnedMesh) materials.add(mesh.material);
  });
  for (const material of materials) {
    if (material.userData.skipUnusedSkinJoints) continue;
    material.userData.skipUnusedSkinJoints = true;
    const before = material.onBeforeCompile,
      key = material.customProgramCacheKey();
    material.onBeforeCompile = function (shader, ...args) {
      before.call(this, shader, ...args);
      shader.vertexShader = shader.vertexShader.replace(
        "#include <skinbase_vertex>",
        `#ifdef USE_SKINNING
        mat4 boneMatX=mat4(0.0),boneMatY=mat4(0.0),boneMatZ=mat4(0.0),boneMatW=mat4(0.0);
        if(skinWeight.x>0.0)boneMatX=getBoneMatrix(skinIndex.x);
        if(skinWeight.y>0.0)boneMatY=getBoneMatrix(skinIndex.y);
        if(skinWeight.z>0.0)boneMatZ=getBoneMatrix(skinIndex.z);
        if(skinWeight.w>0.0)boneMatW=getBoneMatrix(skinIndex.w);
        #endif`,
      );
    };
    material.customProgramCacheKey = () => key + "-skip-zero-joints-v1";
    material.needsUpdate = true;
  }
}
