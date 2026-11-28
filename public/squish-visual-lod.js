import * as T from "three";

// Secondary collection props: one shared shader/uniform, no per-toy solver or
// instance uploads. Distant props become exactly static via a continuous fade.
// This decorative material response is not reported as a physical contact.
export function bindSquishVisualLOD(meshes) {
  const time = { value: 0 },
    eye = { value: new T.Vector3(1e6, 1e6, 1e6) },
    owned = [];
  const media =
    typeof matchMedia === "function"
      ? matchMedia("(prefers-reduced-motion: reduce)")
      : null;
  const bind = (material) => {
    const compile = material.onBeforeCompile,
      key = material.customProgramCacheKey();
    material.onBeforeCompile = (shader) => {
      compile.call(material, shader);
      shader.uniforms.uSquishVisualTime = time;
      shader.uniforms.uSquishVisualEye = eye;
      shader.vertexShader =
        "uniform float uSquishVisualTime;\nuniform vec3 uSquishVisualEye;\n" +
        shader.vertexShader;
      shader.vertexShader = shader.vertexShader.replace(
        /void\s+main\s*\(\s*\)\s*\{/,
        `$&
        vec4 squishCentre=vec4(0.,0.,0.,1.);
        #ifdef USE_INSTANCING
          squishCentre=instanceMatrix*squishCentre;
        #endif
        squishCentre=modelMatrix*squishCentre;
        float squishVisualFade=1.-smoothstep(55.,100.,distance(uSquishVisualEye,squishCentre.xyz));
        float squishVisualAmp=.018*sin(uSquishVisualTime*1.6+squishCentre.x*.11+squishCentre.z*.17)*squishVisualFade;
        float squishVisualY=position.y;
        float squishVisualDen=1.+squishVisualY*squishVisualY;
        `,
      );
      shader.vertexShader = shader.vertexShader.replace(
        "#include <beginnormal_vertex>",
        `#include <beginnormal_vertex>
        objectNormal.y/=1.+squishVisualAmp*2.*squishVisualY/(squishVisualDen*squishVisualDen);
        objectNormal=normalize(objectNormal);`,
      );
      shader.vertexShader = shader.vertexShader.replace(
        "#include <begin_vertex>",
        `#include <begin_vertex>
        transformed.y+=squishVisualAmp*squishVisualY*squishVisualY/squishVisualDen;`,
      );
    };
    material.customProgramCacheKey = () =>
      key + "-squish-secondary-visual-lod-v1";
    material.needsUpdate = true;
  };
  for (const mesh of meshes) {
    bind(mesh.material);
    mesh.customDepthMaterial = new T.MeshDepthMaterial({
      depthPacking: T.RGBADepthPacking,
    });
    mesh.customDistanceMaterial = new T.MeshDistanceMaterial();
    for (const material of [
      mesh.customDepthMaterial,
      mesh.customDistanceMaterial,
    ]) {
      bind(material);
      owned.push(material);
    }
    mesh.userData.squishVisualLOD = {
      near: "VISUAL",
      far: "STATIC",
      fadeMetres: [55, 100],
      instanced: true,
    };
    // Preserve shadow policy and immutable instance buffers; only widen bounds
    // enough to contain the 1.8cm local upper-surface motion.
    mesh.geometry.computeBoundingSphere();
    mesh.geometry.boundingSphere.radius += 0.018;
  }
  return {
    update(dt, position) {
      if (position) eye.value.copy(position);
      time.value = media?.matches
        ? 0
        : time.value + Math.min(0.1, Math.max(0, dt));
    },
    uniforms: { uSquishVisualTime: time, uSquishVisualEye: eye },
    dispose() {
      for (const material of owned) material.dispose();
    },
  };
}
