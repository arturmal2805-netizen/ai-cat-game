import * as T from "three";
import {
  shape as sceneryShape,
  line,
  torus,
  flowerCluster,
  lantern,
} from "./fantasy-scenery.js";
import { batchModelSteps, batchModelGeometry } from "./model-batching.js";
import { runSceneSteps } from "./scene-tasks.js";
import { courtLabel } from "./foodcourt-assets.js";
import { jobBusiness, jobCar, JOB_CARS } from "./jobcity-data.js";
const cityMaterials = new Map();
function shape(parent, kind, color, ...args) {
  const mesh = sceneryShape(parent, kind, color, ...args);
  if (kind === "cube" || kind === "pole") {
    const key = color + ":" + !!args[6];
    if (!cityMaterials.has(key)) {
      const mat = mesh.material.clone();
      mat.map = null;
      mat.bumpMap = null;
      mat.roughness = 0.72;
      mat.userData.sharedScenery = true;
      cityMaterials.set(key, mat);
    }
    mesh.material = cityMaterials.get(key);
  }
  return mesh;
}
function emblem(g, kind, color) {
  if (kind === "bank") {
    paw(g, 0, 15.4, 6.5, 0.9, color);
    return;
  }
  const x = 0,
    y = 15.3,
    z = 6.6;
  if (kind === "crypto") {
    for (let k = 0; k < 4; k++)
      shape(
        g,
        "cube",
        color,
        -0.95 + k * 0.55,
        y - 0.6 + k * 0.18,
        z,
        0.3,
        0.6 + k * 0.35,
        0.18,
      );
    line(g, [-1, y + 0.1, z], [-0.25, y + 0.45, z], color, 0.09);
    line(g, [-0.25, y + 0.45, z], [0.35, y + 0.25, z], color, 0.09);
    line(g, [0.35, y + 0.25, z], [1, y + 1.1, z], color, 0.09);
  } else if (kind === "factory") {
    const ring = torus(g, color, 0.75, 0.22, x, y, z);
    ring.rotation.x = Math.PI / 2;
    for (let k = 0; k < 8; k++) {
      const a = (k * Math.PI) / 4,
        m = shape(
          g,
          "cube",
          color,
          Math.sin(a),
          y + Math.cos(a),
          z,
          0.33,
          0.4,
          0.2,
        );
      m.rotation.z = -a;
    }
  } else if (kind === "estate") {
    shape(g, "cube", color, 0, y - 0.2, z, 1.4, 1.25, 0.2);
    line(g, [-1, y + 0.35, z], [0, y + 1.1, z], color, 0.18);
    line(g, [0, y + 1.1, z], [1, y + 0.35, z], color, 0.18);
    shape(g, "cube", 0xffedce, 0, y - 0.48, z + 0.15, 0.35, 0.7, 0.1);
  } else if (kind === "furniture") {
    shape(g, "cube", color, 0, y - 0.3, z, 1.9, 0.5, 0.5);
    shape(g, "cube", color, 0, y + 0.15, z - 0.1, 1.9, 0.8, 0.3);
    for (const dx of [-1, 1])
      shape(g, "cube", color, dx, y - 0.1, z, 0.35, 0.65, 0.65);
  } else {
    shape(g, "cube", color, 0, y, z, 2, 0.6, 0.3);
    shape(g, "cube", color, 0, y + 0.4, z, 1.1, 0.5, 0.3);
    for (const dx of [-0.7, 0.7])
      shape(g, "sphere", 0x526378, dx, y - 0.4, z + 0.15, 0.25, 0.25, 0.12);
  }
}
const C = {
  wall: 0xf2dfba,
  cream: 0xfff1cf,
  wood: 0xc38e5e,
  gold: 0xeaba54,
  dark: 0x526378,
};
function paw(g, x, y, z, r = 0.6, color = C.gold) {
  shape(g, "sphere", color, x, y, z, r * 0.65, r * 0.5, r * 0.17);
  for (let i = 0; i < 4; i++)
    shape(
      g,
      "sphere",
      color,
      x + (i - 1.5) * r * 0.36,
      y + r * 0.62 - Math.abs(i - 1.5) * r * 0.1,
      z,
      r * 0.19,
      r * 0.23,
      r * 0.15,
    );
}
function pot(g, x, y, z, s = 0.7) {
  shape(g, "pole", 0xdebd90, x, y + s * 0.35, z, s * 0.52, s * 0.7, s * 0.52);
  shape(g, "sphere", 0x78ac66, x, y + s, z, s * 0.65, s * 0.75, s * 0.65);
  flowerCluster(g, x, z, 0xf2bbd0, 0.5, y + s * 1.4);
}
function desk(g, x, y, z) {
  shape(g, "cube", C.wood, x, y + 1.23, z, 3.6, 0.2, 1.8);
  for (const s of [-1, 1])
    shape(g, "cube", C.cream, x + s * 1.55, y + 0.6, z, 0.22, 1.2, 1.35);
}
function chair(g, x, y, z, color) {
  shape(g, "cube", color, x, y + 0.55, z, 1.45, 0.22, 1.3);
  shape(g, "cube", color, x, y + 1, z - 0.6, 1.5, 1.05, 0.22);
  for (const dx of [-0.5, 0.5])
    for (const dz of [-0.45, 0.45])
      shape(g, "pole", C.wood, x + dx, y + 0.25, z + dz, 0.06, 0.5, 0.06);
}
function screen(g, x, y, z, w = 2.6, h = 1.6) {
  shape(g, "cube", 0x34495c, x, y, z, w + 0.18, h + 0.18, 0.18);
  shape(g, "cube", 0x63a5b2, x, y, z + 0.105, w, h, 0.025, true);
  shape(g, "cube", C.dark, x, y - h * 0.65, z, 0.14, 0.4, 0.13);
}
function sofa(g, x, y, z, color = 0xe7b3b5, s = 1) {
  shape(g, "cube", C.wood, x, y + 0.25, z, 3.6 * s, 0.32, 1.8 * s);
  shape(g, "cube", color, x, y + 0.65, z, 3.3 * s, 0.55, 1.7 * s);
  shape(g, "cube", color, x, y + 1.15, z - 0.7 * s, 3.4 * s, 1, 0.3 * s);
  for (const dx of [-1.65, 1.65])
    shape(g, "cube", color, x + dx * s, y + 0.9, z, 0.4 * s, 0.9, 1.8 * s);
  for (const dx of [-0.8, 0.8])
    shape(
      g,
      "cube",
      0xffecd3,
      x + dx * s,
      y + 1.15,
      z - 0.25 * s,
      0.7,
      0.7,
      0.25,
    ).rotation.z = dx * 0.12;
}
function shelf(g, x, y, z) {
  shape(g, "cube", C.wood, x, y + 1.4, z, 3, 2.8, 0.7);
  for (let row = 0; row < 3; row++) {
    shape(g, "cube", C.cream, x, y + 0.5 + row * 0.8, z + 0.38, 2.7, 0.08, 0.7);
    for (let k = 0; k < 5; k++)
      shape(
        g,
        "cube",
        [0xb9cfaa, 0xe3c08d, 0xc0b7d3][k % 3],
        x - 1 + k * 0.48,
        y + 0.72 + row * 0.8,
        z + 0.4,
        0.25,
        0.43,
        0.36,
      );
  }
}
function goldStack(g, x, y, z, n = 4) {
  for (let i = 0; i < n; i++)
    shape(g, "pole", 0xebc35b, x, y + 0.09 + i * 0.12, z, 0.23, 0.11, 0.23);
}
function miniHouse(g, x, y, z, color, s = 0.7) {
  shape(g, "cube", C.cream, x, y + 0.5 * s, z, 1.2 * s, s, 1.1 * s);
  shape(
    g,
    "cone",
    color,
    x,
    y + 1.18 * s,
    z,
    0.92 * s,
    0.65 * s,
    0.92 * s,
  ).rotation.y = Math.PI / 4;
  shape(
    g,
    "cube",
    0x91c9dc,
    x,
    y + 0.45 * s,
    z + 0.56 * s,
    0.3 * s,
    0.4 * s,
    0.02,
  );
}
function makeRoof(g, b) {
  const p = new T.Group();
  g.add(p);
  for (const side of [-1, 1]) {
    const roof = shape(
      p,
      "cube",
      b.color,
      side * 6.2,
      14.95,
      -2.2,
      13.8,
      0.55,
      16,
    );
    roof.rotation.z = -side * 0.17;
  }
  shape(p, "cube", C.cream, 0, 13.9, 5.9, 27, 0.5, 1);
  const badge = shape(p, "sphere", C.cream, 0, 15.3, 6.12, 2.4, 2.1, 0.36);
  emblem(p, b.kind, b.color);
  const label = courtLabel(b.name, 12, 1.4);
  label.position.set(0, 13.8, 6.5);
  p.add(label);
  return p;
}
function factoryFlow() {
  const count = 12,
    g = new T.BoxGeometry(0.66, 0.66, 0.66),
    m = new T.MeshStandardMaterial({ color: 0xd6b78e, roughness: 0.7 }),
    clock = { value: 0 };
  const mesh = new T.InstancedMesh(g, m, count),
    dummy = new T.Object3D();
  for (let i = 0; i < count; i++) {
    dummy.position.set(-8, 1.6, -5);
    dummy.updateMatrix();
    mesh.setMatrixAt(i, dummy.matrix);
  }
  mesh.frustumCulled = false;
  m.onBeforeCompile = (s) => {
    s.uniforms.cityTime = clock;
    s.vertexShader =
      "uniform float cityTime;\n" +
      s.vertexShader.replace(
        "#include <begin_vertex>",
        "#include <begin_vertex>\ntransformed.x+=mod(float(gl_InstanceID)*1.35+cityTime*.65,16.0);",
      );
  };
  m.customProgramCacheKey = () => "city-conveyor-v1";
  return { mesh, clock };
}
function graphScreen() {
  const clock = { value: 0 },
    m = new T.ShaderMaterial({
      uniforms: { time: clock },
      vertexShader:
        "varying vec2 uvp;void main(){uvp=uv;gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.);}",
      fragmentShader:
        "varying vec2 uvp;uniform float time;void main(){vec2 p=uvp;float grid=step(.95,fract(p.x*12.))+step(.95,fract(p.y*7.));float curve=.22+p.x*.5+sin(p.x*19.+time*.4)*.075+sin(p.x*43.)*.035;float stroke=1.-smoothstep(.007,.02,abs(p.y-curve));float bar=step(.55,fract(p.x*17.))*step(p.y,.12+fract(sin(floor(p.x*17.)*43.)*17.)*.22);vec3 c=vec3(.025,.10,.22)+grid*.07+stroke*vec3(.98,.72,.12)+bar*vec3(.03,.35,.42);gl_FragColor=vec4(c,1.);}",
      toneMapped: false,
    });
  return { mesh: new T.Mesh(new T.PlaneGeometry(9.6, 2.4), m), clock };
}
export function* jobBuildingSteps(id) {
  const b = jobBusiness(id);
  if (!b) throw Error("Unknown city business");
  const root = new T.Group(),
    props = new T.Group(),
    animated = [],
    charts = [];
  root.name = b.name;
  root.userData.jobBusiness = b;
  root.userData.id = b.id;
  root.add(props);
  shape(props, "cube", C.cream, 0, 0.0, 0, 26, 0.32, 21);
  shape(props, "cube", C.wall, 0, 6.8, -10, 25, 13.6, 0.35);
  for (const x of [-12.4, 12.4])
    shape(props, "cube", C.wall, x, 6.8, -2, 0.4, 13.6, 16);
  for (const x of [-12, 12]) {
    shape(props, "pole", C.cream, x, 6.6, 8.8, 0.32, 13.2, 0.32);
    shape(props, "pole", 0xe3c78f, x, 0.35, 8.8, 0.6, 0.35, 0.6);
    shape(props, "cube", C.cream, x, 13.1, 8.8, 1, 0.4, 1);
  }
  const roof = makeRoof(root, b);
  root.userData.roof = roof;
  for (let floor = 0; floor < 3; floor++) {
    const y = floor * 4.6;
    for (const x of [-5, 5])
      shape(props, "cube", 0xffd78e, x, y + 3.9, 2.5, 3, 0.08, 0.65, true);
    if (floor) {
      shape(props, "cube", C.cream, -2.15, y, 0, 20.7, 0.3, 20);
      shape(props, "cube", C.cream, 10.4, y, 9.1, 3.4, 0.3, 1.8);
    }
    shape(props, "cube", 0xe8d5ad, 0, y + 0.18, 9.5, 25, 0.14, 0.9);
    for (const [a, b] of [
      [-11.5, -2.3],
      [2.3, 7.8],
      [11.5, 12],
    ])
      line(props, [a, y + 1, 9.7], [b, y + 1, 9.7], C.gold, 0.06);
    for (let x = -11; x <= 11; x += 2.2)
      if (Math.abs(x) > 2.3 && x < 7.8)
        line(props, [x, y + 0.2, 9.7], [x, y + 1, 9.7], C.wood, 0.04);
    for (const x of [-10.5, 10.5]) {
      lantern(props, x, y + 3.6, 5.5, 0.5);
      pot(props, x, y + 0.2, -7.5, 0.8);
    }
    for (const x of [-4, 4]) {
      desk(props, x, y, 4.15);
      chair(props, x, y + 0.35, 1.8, b.color);
      if (["crypto", "bank", "estate"].includes(b.kind)) {
        screen(props, x - 0.95, y + 2.0, 4.4, 1.3, 0.95);
        shape(props, "cube", 0xabc4c6, x, y + 1.38, 4.5, 1.5, 0.05, 0.5);
        for (let k = 0; k < 6; k++)
          shape(
            props,
            "cube",
            C.cream,
            x - 0.6 + k * 0.23,
            y + 1.42,
            4.5,
            0.13,
            0.025,
            0.35,
          );
      }
      if (b.kind === "bank") {
        for (let k = 0; k < 4; k++)
          goldStack(props, x - 0.8 + k * 0.5, y + 1.37, 4.7, 3 + (k % 2));
        shape(props, "cube", 0xe0eadc, x + 0.7, y + 1.45, 4.2, 0.6, 0.16, 0.5);
      }
      if (b.kind === "factory") {
        shape(props, "cube", 0x7b8791, x, y + 1.6, 3.6, 1.4, 0.7, 0.7);
        for (let k = 0; k < 4; k++)
          shape(
            props,
            "sphere",
            k % 2 ? 0x94ccab : 0xe6bd6e,
            x - 0.45 + k * 0.3,
            y + 2,
            3.8,
            0.08,
            0.08,
            0.04,
          );
      }
      if (b.kind === "furniture") {
        sofa(
          props,
          x,
          y + 0.1,
          -3.4,
          [0xe8adb8, 0xa1c7a9, 0xc4b2da][floor],
          1.05,
        );
        shape(props, "cube", C.wood, x, y + 0.65, -1.5, 2.8, 0.2, 1.6);
        shape(props, "cube", 0xe9bd82, x, y + 1.4, 4.25, 1.5, 0.08, 1);
      }
      if (b.kind === "estate") {
        shape(props, "cube", 0x9dc4b2, x, y + 1.38, 4.2, 2.3, 0.13, 1.4);
        for (let k = 0; k < 3; k++)
          miniHouse(props, x - 0.65 + k * 0.65, y + 1.45, 4.2, b.color, 0.34);
      }
      if (b.kind === "cars") {
        shape(props, "cube", C.cream, x, y + 1.39, 4.25, 1.8, 0.09, 1.3);
        shape(props, "cube", 0x7fa6c5, x + 0.5, y + 1.48, 4.3, 0.6, 0.1, 0.4);
      }
    }
    if (b.kind === "bank") {
      const vault = shape(
        props,
        "pole",
        0x879499,
        -3,
        y + 2,
        -8.8,
        2.1,
        0.4,
        2.1,
      );
      vault.rotation.x = Math.PI / 2;
      const dial = torus(props, C.gold, 1.55, 0.12, -3, y + 2, -8.5);
      dial.rotation.x = Math.PI / 2;
      paw(props, -3, y + 2, -8.4, 0.85);
      for (let k = 0; k < 12; k++)
        goldStack(
          props,
          2 + (k % 4) * 0.65,
          y + 0.2 + Math.floor(k / 4) * 0.6,
          -8,
          4,
        );
      shelf(props, 5, y + 0.2, -9.5);
    } else if (b.kind === "crypto") {
      const graph = graphScreen();
      graph.mesh.position.set(0, y + 2.4, -9.7);
      root.add(graph.mesh);
      charts.push(graph.clock);
      for (const x of [-8, 4.5]) shelf(props, x, y + 0.2, -9.5);
    } else if (b.kind === "factory") {
      shape(props, "cube", 0x6e7f88, 0, y + 1, -5, 18, 0.7, 2.4);
      for (let k = 0; k < 14; k++) {
        const roller = shape(
          props,
          "pole",
          0xbbc2bc,
          -8.2 + k * 1.25,
          y + 1.35,
          -5,
          0.16,
          2.3,
          0.16,
        );
        roller.rotation.x = Math.PI / 2;
      }
      for (const x of [-6, 0, 6]) {
        line(props, [x, y + 0.2, -8], [x, y + 2.7, -8], 0xe9b74d, 0.2);
        line(props, [x, y + 2.7, -8], [x + 0.8, y + 3.4, -6.3], 0xe9b74d, 0.18);
        line(
          props,
          [x + 0.8, y + 3.4, -6.3],
          [x + 0.3, y + 2.3, -5],
          0xe9b74d,
          0.14,
        );
      }
      const belt = factoryFlow();
      belt.mesh.position.y = y;
      root.add(belt.mesh);
      animated.push(belt.clock);
    } else if (b.kind === "estate") {
      shape(props, "cube", C.wood, 0, y + 0.9, -5.1, 12, 0.4, 6);
      shape(props, "cube", 0xa5c788, 0, y + 1.14, -5.1, 11.8, 0.12, 5.8);
      for (let k = 0; k < 12; k++)
        miniHouse(
          props,
          -4.6 + (k % 6) * 1.8,
          y + 1.22,
          -6.5 + Math.floor(k / 6) * 2.4,
          [0xcc877c, 0xd8b267, 0x9fbc98][k % 3],
          0.7,
        );
      shelf(props, -9, y + 0.2, -8.8);
      shelf(props, 4.5, y + 0.2, -9.5);
    } else if (b.kind === "cars") {
      for (let k = 0; k < 3; k++) {
        const car = cityCar(JOB_CARS[(floor + k) % 5].id);
        car.position.set(-7 + k * 6, 0.24 + y, -4.8);
        car.rotation.y = 0.22;
        props.add(car);
      }
    } else {
      sofa(props, 0, y + 0.1, -7, 0xf0d5ab, 1.6);
      shelf(props, -9, y + 0.2, -8.8);
      shelf(props, 4.5, y + 0.2, -9.5);
    }
    yield;
  }
  // Real open stairwell; floors deliberately leave this strip clear.
  for (let flight = 0; flight < 2; flight++)
    for (let step = 0; step < 24; step++) {
      const t = (step + 0.5) / 24,
        z = flight ? -8 + t * 16 : 8 - t * 16,
        y = flight * 4.6 + t * 4.6;
      shape(
        props,
        "cube",
        0xe0c9a4,
        10,
        y / 2 + flight * 2.3,
        z,
        3.3,
        y - flight * 4.6 + 0.14,
        16 / 24 + 0.03,
      );
      if (step % 6 === 0)
        line(props, [11.7, y, z], [11.7, y + 0.9, z], C.wood, 0.045);
      if (step % 8 === 0) yield;
    }
  for (let floor = 0; floor < 3; floor++)
    pot(props, -10.3, floor * 4.6 + 0.15, 7.6, 0.85);
  const baked = yield* batchModelSteps(props, { combineColors: true });
  root.remove(props);
  root.add(baked);
  props.traverse((o) => {
    if (o.isMesh && !o.geometry.userData.sharedScenery) o.geometry.dispose();
  });
  const roofBaked = yield* batchModelSteps(roof, { combineColors: true });
  root.remove(roof);
  root.add(roofBaked);
  root.userData.roof = roofBaked;
  root.userData.stats = {
    staticMeshes: baked.children.length + roofBaked.children.length,
    sourceMeshes: baked.userData.sourceMeshes,
    floors: 3,
    workplaces: 6,
  };
  const clocks = [...animated, ...charts];
  root.userData.duration = 24;
  root.userData.update = (time, reduced) => {
    for (const u of clocks) u.value = reduced ? 0 : time;
  };
  return root;
}
export const jobBuilding = (id) => runSceneSteps(jobBuildingSteps(id));
const carTemplates = new Map();
export function cityCar(id) {
  const spec = jobCar(id);
  if (!spec) throw Error("Unknown car");
  if (carTemplates.has(id)) return carTemplates.get(id).clone(true);
  const g = new T.Group(),
    p = new T.Group();
  g.name = spec.name;
  shape(p, "cube", spec.color, 0, 0.62, 0, 1.95, 0.6, 3.6);
  shape(p, "cube", spec.color, 0, 0.95, 1.15, 1.85, 0.35, 1.2);
  shape(p, "cube", 0x486071, 0, 0.9, -0.75, 1.4, 0.35, 1.25);
  chair(p, 0, 0.63, -0.35, 0xdfc6ad);
  for (const x of [-0.38, 0.38]) {
    shape(p, "sphere", 0xfff2c7, x, 0.76, 1.83, 0.22, 0.12, 0.04, true);
    shape(p, "cube", 0xd98787, x, 0.7, -1.83, 0.3, 0.12, 0.04);
  }
  if (id === "car-sun") {
    shape(p, "cube", 0x535b70, 0, 1.15, -1.65, 2, 0.12, 0.6);
    for (const x of [-0.65, 0.65])
      shape(p, "cube", spec.color, x, 0.94, -1.6, 0.12, 0.45, 0.12);
    shape(p, "cube", 0xffedba, 0, 0.96, 1.12, 0.35, 0.04, 1.1);
  } else if (id === "car-lime") {
    shape(p, "sphere", spec.color, 0, 0.9, 1.15, 0.88, 0.42, 0.75);
    for (const x of [-0.5, 0.5])
      shape(p, "sphere", 0xfff3cf, x, 1.02, 1.72, 0.22, 0.22, 0.07, true);
  } else if (id === "car-cloud") {
    for (const x of [-0.9, 0.9])
      shape(p, "cube", 0xe6e3d3, x, 0.42, 0, 0.2, 0.16, 2.4);
    for (const x of [-0.67, 0.67])
      line(p, [x, 1.25, -1.05], [x, 1.7, -1.05], spec.color, 0.09);
    line(p, [-0.67, 1.7, -1.05], [0.67, 1.7, -1.05], spec.color, 0.09);
  } else if (id === "car-lavender") {
    for (const x of [-1, 1])
      shape(p, "cube", 0xf2daae, x, 0.75, 0, 0.06, 0.13, 3.1);
    shape(p, "cube", spec.color, 0, 1.05, -1.3, 1.8, 0.2, 0.8);
  }
  const glass = new T.Mesh(
    new T.PlaneGeometry(1.6, 0.6),
    new T.MeshStandardMaterial({
      color: 0xb9e7ee,
      transparent: true,
      opacity: 0.28,
      roughness: 0.16,
      side: T.DoubleSide,
      depthWrite: false,
    }),
  );
  glass.position.set(0, 1.3, 0.7);
  glass.rotation.x = -0.25;
  g.add(glass);
  const wheelSteer = torus(p, 0x536176, 0.24, 0.045, -0.36, 1.18, 0.3);
  wheelSteer.rotation.x = 0.8;
  const baked = batchModelGeometry(p, { combineColors: true });
  g.add(baked);
  p.traverse((o) => {
    if (o.isMesh && !o.geometry.userData.sharedScenery) o.geometry.dispose();
  });
  for (const x of [-1, 1])
    for (const z of [-1.1, 1.1]) {
      const w = new T.Group();
      w.name = "CityWheel";
      const tire = shape(w, "pole", 0x4c515e, 0, 0, 0, 0.35, 0.23, 0.35);
      tire.rotation.z = Math.PI / 2;
      const hub = shape(w, "pole", 0xe0dcd0, x * 0.13, 0, 0, 0.18, 0.02, 0.18);
      hub.rotation.z = Math.PI / 2;
      w.position.set(x, 0.36, z);
      g.add(w);
    }
  g.userData.carId = id;
  g.userData.seat = [-0.36, 1.02, -0.25];
  g.traverse((o) => {
    if (o.isMesh) {
      o.geometry.userData.sharedScenery = true;
      o.material.userData.sharedScenery = true;
    }
  });
  carTemplates.set(id, g);
  return g.clone(true);
}
export function animateCityCar(g, distance, steer = 0, reduced = false) {
  for (const w of g.children)
    if (w.name === "CityWheel") {
      w.rotation.x = reduced ? 0 : distance / 0.35;
      w.rotation.y =
        w.position.z > 0 ? Math.max(-0.45, Math.min(0.45, steer)) : 0;
    }
}
