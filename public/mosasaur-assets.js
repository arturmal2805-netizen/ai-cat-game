import * as THREE from "three";
import { shape, line, batchScenery } from "./fantasy-scenery.js";
import {
  mosasaurFrame,
  mosasaurApproach,
  MOSA_DURATION,
  MOSA_SEAT,
  MOSA_SCALE,
} from "./mosasaur-motion.js";
import { runSceneSteps } from "./scene-tasks.js";
// A continuous sculpted profile, rather than a chain of overlapping spheres.
function skin() {
  const curve = new THREE.CatmullRomCurve3(
    [
      [-11, 0.02, 0.03, -0.1],
      [-9, 0.25, 0.3, -0.12],
      [-6, 0.6, 0.65, -0.1],
      [-3, 1.25, 1.02, 0],
      [0, 1.65, 1.36, 0],
      [2, 1.42, 1.18, 0.05],
      [3.5, 1.05, 0.9, 0.22],
      [5, 0.99, 0.68, 0.35],
      [6.5, 0.8, 0.45, 0.38],
      [8, 0.46, 0.26, 0.39],
      [8.35, 0.02, 0.03, 0.39],
    ].map((p) => new THREE.Vector3(p[0], p[1], p[2])),
  );
  const positions = [],
    colors = [],
    indices = [],
    sides = 40,
    rings = 120;
  for (let i = 0; i <= rings; i++) {
    const p = curve.getPoint(i / rings),
      cy = p.x > 3 ? Math.min(0.39, (p.x - 3) * 0.1) : 0;
    for (let j = 0; j <= sides; j++) {
      const a = (j / sides) * Math.PI * 2,
        s = Math.sin(a),
        x = Math.cos(a) * p.y,
        speck =
          Math.sin(p.x * 11 + Math.cos(a) * 15) * Math.sin(a * 17 + p.x * 3),
        color = new THREE.Color(s < -0.18 ? 0xe1eef0 : 0x2473a8);
      if (s >= -0.18)
        color.lerp(
          new THREE.Color(0x69a4bf),
          THREE.MathUtils.smoothstep(speck, 0.2, 0.85) * 0.7,
        );
      color.multiplyScalar(0.93 + Math.max(0, s) * 0.13);
      positions.push(x, s * p.z + cy, p.x);
      colors.push(color.r, color.g, color.b);
      if (i < rings && j < sides) {
        const n = i * (sides + 1) + j;
        indices.push(
          n,
          n + 1,
          n + sides + 1,
          n + 1,
          n + sides + 2,
          n + sides + 1,
        );
      }
    }
  }
  const g = new THREE.BufferGeometry();
  g.setAttribute("position", new THREE.Float32BufferAttribute(positions, 3));
  g.setAttribute("color", new THREE.Float32BufferAttribute(colors, 3));
  g.setIndex(indices);
  g.computeVertexNormals();
  return g;
}
function fin(parent, side, z, rear = false) {
  const outline = new THREE.Shape();
  outline.moveTo(0, 0);
  outline.bezierCurveTo(1.1, 0.4, 3.5, -0.8, 3.7, -2.2);
  outline.bezierCurveTo(3, -2.6, 1.6, -1.5, 0, -0.9);
  outline.closePath();
  const g = new THREE.ExtrudeGeometry(outline, {
    depth: 0.16,
    bevelEnabled: true,
    bevelSize: 0.13,
    bevelThickness: 0.1,
    bevelSegments: 3,
    curveSegments: 20,
  });
  g.rotateX(-Math.PI / 2);
  const pivot = new THREE.Group();
  pivot.position.set(side * (rear ? 0.78 : 1.25), -0.45, z);
  const mesh = new THREE.Mesh(
    g,
    new THREE.MeshPhysicalMaterial({
      color: 0x428eb4,
      roughness: 0.4,
      clearcoat: 0.55,
    }),
  );
  mesh.scale.x = side;
  if (rear) mesh.scale.multiplyScalar(0.74);
  mesh.castShadow = true;
  pivot.add(mesh);
  parent.add(pivot);
  return pivot;
}
export function* mosasaurRideSteps(id) {
  if (id !== "ride-mosasaur") return null;
  const root = new THREE.Group(),
    moving = new THREE.Group(),
    props = new THREE.Group(),
    fins = [];
  root.name = "Marin · sculpted friendly mosasaur";
  root.add(moving);
  moving.scale.setScalar(MOSA_SCALE);
  const clock = { value: 0 },
    material = new THREE.MeshPhysicalMaterial({
      vertexColors: true,
      roughness: 0.36,
      metalness: 0.035,
      clearcoat: 0.65,
      clearcoatRoughness: 0.25,
    });
  material.onBeforeCompile = (shader) => {
    shader.uniforms.uMosaClock = clock;
    shader.vertexShader =
      "uniform float uMosaClock;\n" +
      shader.vertexShader.replace(
        "#include <begin_vertex>",
        `#include <begin_vertex>
      float tailWeight=pow(clamp((-position.z-2.0)/8.0,0.0,1.0),1.6);
      transformed.x+=tailWeight*sin(uMosaClock*2.1+position.z*.5)*.7;`,
      );
  };
  material.customProgramCacheKey = () => "mosa-tail-v1";
  const body = new THREE.Mesh(skin(), material);
  body.name = "Continuous blue body, neck and long snout";
  body.castShadow = true;
  body.receiveShadow = true;
  moving.add(body);
  yield;
  // Rounded lower jaw and a gentle curved mouth line keep the giant friendly.
  shape(props, "sphere", 0xcbdfe5, 0, -0.15, 6.2, 0.81, 0.27, 2.05);
  for (const side of [-1, 1]) {
    const points = [
      [side * 0.87, 0.08, 4.3],
      [side * 0.87, 0.09, 5.5],
      [side * 0.65, 0.14, 7.4],
      [side * 0.28, 0.19, 8.03],
    ];
    const c = new THREE.CatmullRomCurve3(
      points.map((p) => new THREE.Vector3(...p)),
    );
    props.add(
      new THREE.Mesh(
        new THREE.TubeGeometry(c, 32, 0.045, 6, false),
        new THREE.MeshStandardMaterial({ color: 0x385d75, roughness: 0.8 }),
      ),
    );
    const eye = new THREE.Group();
    eye.position.set(side * 0.88, 0.71, 4.95);
    eye.rotation.y = side * 0.5;
    shape(eye, "sphere", 0xc9e7ee, 0, 0, 0, 0.34, 0.38, 0.24);
    shape(eye, "sphere", 0x5b9fa8, side * 0.1, 0, 0.15, 0.24, 0.28, 0.12);
    shape(eye, "sphere", 0x162f46, side * 0.13, 0.01, 0.23, 0.14, 0.21, 0.065);
    shape(
      eye,
      "sphere",
      0xffffff,
      side * 0.1,
      0.12,
      0.28,
      0.065,
      0.07,
      0.024,
      true,
    );
    props.add(eye);
    shape(props, "sphere", 0x224d6b, side * 0.34, 0.6, 7.38, 0.075, 0.05, 0.15);
    for (let i = 0; i < 6; i++) {
      const tooth = shape(
        props,
        "cone",
        0xfff5d7,
        side * (0.75 - i * 0.048),
        0.035,
        5.2 + i * 0.4,
        0.045,
        0.11,
        0.045,
      );
      tooth.rotation.z = Math.PI;
    }
    fins.push(fin(moving, side, 1.9), fin(moving, side, -4.4, true));
    yield;
  }
  // Strong vertical crescent tail, driven with the same GPU clock as the body.
  const tail = new THREE.Group();
  tail.position.set(0, -0.1, -10);
  const fluke = new THREE.Shape();
  fluke.moveTo(0, -0.2);
  fluke.bezierCurveTo(-0.3, 0.7, -1, 1.6, -2, 2);
  fluke.bezierCurveTo(-1.7, 1, -1.5, 0.3, -1, 0);
  fluke.bezierCurveTo(-1.5, -0.3, -1.7, -1.2, -2, -1.8);
  fluke.bezierCurveTo(-0.8, -1.4, -0.2, -0.6, 0, -0.2);
  fluke.closePath();
  const flukeGeometry = new THREE.ExtrudeGeometry(fluke, {
    depth: 0.12,
    bevelEnabled: true,
    bevelSize: 0.12,
    bevelThickness: 0.09,
    bevelSegments: 3,
    curveSegments: 28,
  });
  flukeGeometry.rotateY(-Math.PI / 2);
  tail.add(
    new THREE.Mesh(
      flukeGeometry,
      new THREE.MeshPhysicalMaterial({
        color: 0x377eaa,
        roughness: 0.39,
        clearcoat: 0.55,
      }),
    ),
  );
  moving.add(tail);
  for (let i = 0; i < 13; i++) {
    yield;
    const z = 2.7 - i * 0.68;
    shape(
      props,
      "sphere",
      0x79bdcd,
      0,
      1.18 - Math.max(0, -z) * 0.095,
      z,
      0.16,
      0.1,
      0.23,
    );
  }
  shape(props, "sphere", 0xac7547, 0, 1.23, 0.6, 0.8, 0.22, 1.12);
  shape(props, "cube", 0x254d8a, 0, 1.4, 0.6, 1.15, 0.08, 1.48);
  for (const x of [-0.5, 0.5])
    line(props, [x, 1.47, -0.03], [x, 1.47, 1.23], 0xeac479, 0.033);
  const rail = new THREE.Mesh(
    new THREE.TorusGeometry(0.43, 0.045, 8, 32, Math.PI),
    new THREE.MeshStandardMaterial({ color: 0xe3bd79 }),
  );
  rail.position.set(0, 1.6, 1.23);
  props.add(rail);
  const baked = batchScenery(props);
  moving.add(baked);
  yield;
  const dock = new THREE.Group();
  dock.name = "Boarding jetty and dry shore return";
  for (let z = 9.8; z < 24; z += 0.37) {
    shape(dock, "cube", 0xc99b61, 0, 0.19, z, 2.2, 0.17, 0.34);
    yield;
  }
  for (const x of [-1.1, 1.1])
    for (const z of [11, 14, 17, 20, 23]) {
      line(dock, [x, -1, z], [x, 1, z], 0x9e754d, 0.09);
      if (z > 11) line(dock, [x, 0.85, z - 2.5], [x, 0.85, z], 0xdfcaa0, 0.038);
    }
  root.add(batchScenery(dock));
  const bubbles = new THREE.InstancedMesh(
    new THREE.SphereGeometry(0.08, 8, 6),
    new THREE.MeshBasicMaterial({
      color: 0xb7f5ff,
      transparent: true,
      opacity: 0.42,
      depthWrite: false,
    }),
    28,
  );
  bubbles.name = "Mosasaur underwater bubbles and landing spray";
  bubbles.frustumCulled = false;
  root.add(bubbles);
  const splash = new THREE.Mesh(
    new THREE.TorusGeometry(1, 0.045, 6, 64),
    new THREE.MeshBasicMaterial({
      color: 0xe0fbff,
      transparent: true,
      opacity: 0.6,
      depthWrite: false,
    }),
  );
  splash.rotation.x = -Math.PI / 2;
  splash.visible = false;
  root.add(splash);
  const particle = new THREE.Object3D();
  const q = new THREE.Quaternion();
  root.userData = {
    id,
    duration: MOSA_DURATION,
    handpainted: true,
    moving,
    seatHeight: MOSA_SEAT[1],
    dismount: [0, 0, 23],
    rideFrame: mosasaurFrame,
    approachFrame: mosasaurApproach,
    // Expose the actual local saddle transform for geometry/attachment tests.
    saddleLocal: new THREE.Vector3(...MOSA_SEAT),
    deepRide: true,
    update(time, reduced = false) {
      const elapsed = root.userData.rideElapsed ?? 0,
        f = mosasaurFrame(elapsed, reduced);
      moving.position.set(...f.bodyPosition);
      q.fromArray(f.quaternion);
      moving.quaternion.copy(q);
      clock.value = reduced ? 0 : time;
      tail.rotation.y = reduced ? 0 : Math.sin(time * 2.1 - 5) * 0.18;
      for (let i = 0; i < fins.length; i++)
        fins[i].rotation.z = reduced
          ? 0
          : Math.sin(time * 1.7 + i * 0.5) * 0.13;
      const active = elapsed > 4 && elapsed < 40;
      bubbles.visible = active && !reduced;
      if (bubbles.visible)
        for (let i = 0; i < 28; i++) {
          const age = (time * 0.65 + i * 0.137) % 1,
            a = i * 2.399,
            r = 0.5 + age * 2.4;
          const spray = f.phase === "splash";
          particle.position.set(
            f.bodyPosition[0] + Math.cos(a) * r,
            spray
              ? 0.15 + Math.sin(age * Math.PI) * 1.7
              : f.bodyPosition[1] + age * 3.5,
            f.bodyPosition[2] + Math.sin(a) * r,
          );
          particle.scale.setScalar(spray ? 1.4 - age : 0.8 + age * 0.5);
          particle.updateMatrix();
          bubbles.setMatrixAt(i, particle.matrix);
        }
      if (bubbles.visible) bubbles.instanceMatrix.needsUpdate = true;
      splash.visible = !reduced && f.phase === "splash";
      if (splash.visible) {
        const age = (elapsed - 36) / 4;
        splash.position.set(f.bodyPosition[0], 0.04, f.bodyPosition[2]);
        splash.scale.setScalar(1 + age * 5);
        splash.material.opacity = (1 - age) * 0.65;
      }
      root.userData.phase = f.phase;
    },
  };
  root.userData.update(0, true);
  return root;
}
export const mosasaurRide = (id) => runSceneSteps(mosasaurRideSteps(id));
