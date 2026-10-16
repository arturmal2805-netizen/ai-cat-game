import * as THREE from "three";
import { SPA_JACUZZI } from "./spa-data.js";

export const SPA_STEAM_PUFFS = 12;
// Both effects use static instance buffers. Only their shared clock changes
// per frame: more visible steam needs no extra draw or CPU matrix uploads.
export function createJacuzziEffects(parent) {
  const clock = { value: 0 },
    bubbleGeometry = new THREE.SphereGeometry(1, 8, 6),
    bubblePhase = new THREE.InstancedBufferAttribute(new Float32Array(24), 1),
    bubbleMaterial = new THREE.MeshStandardMaterial({
      color: 0xedffef,
      transparent: true,
      opacity: 0.48,
      roughness: 0.25,
      depthWrite: false,
    });
  bubbleGeometry.setAttribute("bubblePhase", bubblePhase);
  bubbleMaterial.onBeforeCompile = (shader) => {
    shader.uniforms.spaParticleTime = clock;
    shader.vertexShader =
      "uniform float spaParticleTime;\nattribute float bubblePhase;\n" +
      shader.vertexShader.replace(
        "#include <begin_vertex>",
        `#include <begin_vertex>
      float bubbleAge=fract(spaParticleTime*.23+bubblePhase);
      transformed*= (.03+sin(bubbleAge*3.14159265)*.06)/.09;
      transformed.y+=bubbleAge*.2/.09;`,
      );
  };
  bubbleMaterial.customProgramCacheKey = () => "spa-gpu-bubbles-v1";
  const bubbles = new THREE.InstancedMesh(bubbleGeometry, bubbleMaterial, 24),
    steamGeometry = new THREE.PlaneGeometry(1, 1),
    phases = new THREE.InstancedBufferAttribute(
      new Float32Array(SPA_STEAM_PUFFS),
      1,
    );
  steamGeometry.setAttribute("steamPhase", phases);
  const steam = new THREE.InstancedMesh(
      steamGeometry,
      new THREE.ShaderMaterial({
        transparent: true,
        depthWrite: false,
        uniforms: { time: clock },
        vertexShader: `
      uniform float time;
      attribute float steamPhase;
      varying vec2 steamUv;
      varying float fade;
      void main() {
        float age=fract(time*.13+steamPhase);
        steamUv=uv;
        fade=pow(sin(age*3.14159265),.8);
        vec4 local=vec4(sin(time*.28+steamPhase*6.28)*age*.35,
          .3+age*3.25,cos(time*.22+steamPhase*9.7)*age*.2,1.);
        vec4 center=modelViewMatrix*instanceMatrix*local;
        center.xy+=position.xy*vec2(1.1+age*1.35,1.4+age*2.);
        gl_Position=projectionMatrix*center;
      }`,
        fragmentShader: `
      uniform float time;
      varying vec2 steamUv;
      varying float fade;
      void main() {
        vec2 p=steamUv-.5;
        p.x+=sin(p.y*8.+time*.6)*.045;
        float soft=1.-smoothstep(.08,.5,length(p));
        gl_FragColor=vec4(1.,.97,.91,soft*fade*.54);
        #include <tonemapping_fragment>
        #include <colorspace_fragment>
      }`,
      }),
      SPA_STEAM_PUFFS,
    ),
    dummy = new THREE.Object3D();
  for (let i = 0; i < 24; i++) {
    const a = i * 2.399,
      r = 0.4 + (i % 5) * 0.43;
    dummy.position.set(
      SPA_JACUZZI.x + Math.sin(a) * r,
      0.4,
      SPA_JACUZZI.z + Math.cos(a) * r,
    );
    dummy.scale.setScalar(0.09);
    dummy.updateMatrix();
    bubbles.setMatrixAt(i, dummy.matrix);
    bubblePhase.setX(i, (i * 0.14) % 1);
  }
  for (let i = 0; i < SPA_STEAM_PUFFS; i++) {
    const a = i * 2.399,
      r = 1.9 + (i % 3) * 0.12;
    dummy.position.set(
      SPA_JACUZZI.x + Math.sin(a) * r,
      0.65,
      SPA_JACUZZI.z + Math.cos(a) * r,
    );
    dummy.scale.setScalar(1);
    dummy.updateMatrix();
    steam.setMatrixAt(i, dummy.matrix);
    phases.setX(i, i / SPA_STEAM_PUFFS);
  }
  bubbles.name = "SPA jacuzzi bubbles";
  steam.name = "SPA warm rising steam";
  bubbles.frustumCulled = steam.frustumCulled = false;
  bubbles.userData.particleClock = clock;
  parent.add(bubbles, steam);
  return {
    userData: {
      update(time, reduced = false) {
        clock.value = reduced ? 0 : time;
      },
    },
  };
}
