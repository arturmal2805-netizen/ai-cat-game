import * as T from "three";
import { WATERFRONT } from "./waterfront-data.js";
import { parts } from "./waterfront-primitives.js";
export const TRAMPOLINE_GRAVITY = 9.81,
  TRAMPOLINE_SLOTS = 8;
export function netDisplacement(x, z, time, springs) {
  let y = 0;
  for (const p of springs) {
    const r2 = (x - p.x) ** 2 + (z - p.y) ** 2;
    y += p.z * Math.exp(-r2 / 95);
  }
  return Math.max(-1.1, Math.min(0.42, y));
}
const deform = `uniform vec4 wfSprings[8];float wfDeform(vec2 p){float d=0.;for(int i=0;i<8;i++){vec2 v=p-wfSprings[i].xy;d+=wfSprings[i].z*exp(-dot(v,v)/95.);}return clamp(d,-1.1,.42);}`;
function netTexture() {
  if (typeof document === "undefined") return null;
  const c = document.createElement("canvas");
  c.width = c.height = 1024;
  const ctx = c.getContext("2d");
  ctx.fillStyle = "#b296df";
  ctx.fillRect(0, 0, 1024, 1024);
  ctx.strokeStyle = "#e0caef";
  ctx.lineWidth = 1.2;
  for (let i = 0; i <= 1024; i += 8) {
    ctx.beginPath();
    ctx.moveTo(i, 0);
    ctx.lineTo(i, 1024);
    ctx.moveTo(0, i);
    ctx.lineTo(1024, i);
    ctx.stroke();
  }
  ctx.fillStyle = "#ffd8ed";
  ctx.beginPath();
  ctx.ellipse(512, 550, 132, 110, 0, 0, Math.PI * 2);
  ctx.fill();
  for (const [x, y] of [
    [330, 390],
    [450, 320],
    [585, 320],
    [695, 390],
  ]) {
    ctx.beginPath();
    ctx.ellipse(x, y, 49, 70, Math.atan2(x - 512, 240), 0, Math.PI * 2);
    ctx.fill();
  }
  const t = new T.CanvasTexture(c);
  t.colorSpace = T.SRGBColorSpace;
  t.anisotropy = 4;
  return t;
}
export function* trampolineSteps(root, materials) {
  const b = parts(root, materials),
    r = WATERFRONT.trampoline.radius,
    y = WATERFRONT.trampoline.y;
  // Soft rim with authored bridge/climb openings; it never blocks an exit.
  const gaps = [0.045, 0.045, 0.045, 0.11];
  for (let i = 0; i < 4; i++) {
    const start = (i * Math.PI) / 2 + gaps[i],
      arc = Math.PI / 2 - gaps[i] - gaps[(i + 1) % 4];
    for (const [key, tube, yOffset] of [
      ["violet", 3.3, 0],
      ["rose", 1, 1.3],
    ]) {
      const g = new T.TorusGeometry(r - 3, tube, 12, 96, arc);
      g.rotateZ(start);
      g.rotateX(Math.PI / 2);
      b.put(g, key, 0, y + yOffset, 0);
    }
  }
  b.torus("gold", 0, y - 0.7, 0, r + 1, 0.55);
  b.torus("light", 0, y - 0.75, 0, r + 1.4, 0.16);
  for (let i = 0; i < 24; i++) {
    yield;
    const a = (i * Math.PI) / 12,
      x = Math.sin(a) * (r - 3),
      z = Math.cos(a) * (r - 3);
    b.sphere("gold", x, y + 1.7, z, 0.18, 1, 0.18);
    if (i % 3 === 0) {
      b.sphere("light", x, y + 2.7, z, 0.65, 0.4, 0.65);
      b.cylinder("gold", x, y + 4.4, z, 0.1, 4);
      b.box(
        "pink",
        x + 1.4 * Math.cos(a),
        y + 5.5,
        z - 1.4 * Math.sin(a),
        3,
        2,
        0.08,
        [0, a, 0],
      );
    }
  }
  // Four real stairs give swimmers a wide climb-out with no jump through the ring.
  for (const a of [0, Math.PI / 2, Math.PI, Math.PI * 1.5]) {
    yield;
    for (let i = 0; i < 9; i++) {
      const d = r + 7 - i * 1.55;
      b.box(
        "ivory",
        Math.sin(a) * d,
        y - 2.4 + i * 0.28,
        Math.cos(a) * d,
        5,
        0.42,
        2.2,
        [0, a, 0],
      );
    }
    for (const side of [-1, 1]) {
      const line = [];
      for (let i = 0; i < 9; i++) {
        const d = r + 7 - i * 1.55;
        line.push([
          Math.sin(a) * d + side * Math.cos(a) * 2.8,
          y - 0.9 + i * 0.28,
          Math.cos(a) * d - side * Math.sin(a) * 2.8,
        ]);
      }
      b.tube("gold", line, 0.15);
    }
  }
  b.box("ivory", 0, y - 0.225, -r + 3, 12, 0.45, 6);
  yield* b.finish();
  const impacts = Array.from({ length: 8 }, () => new T.Vector4(0, 0, 0, 0)),
    clock = { value: 0 },
    map = netTexture(),
    mat = new T.MeshStandardMaterial({
      color: map ? 0xffffff : 0xa288d0,
      map,
      roughness: 0.8,
      side: T.DoubleSide,
    });
  const patch = (shader) => {
    shader.uniforms.wfSprings = { value: impacts };
    shader.uniforms.wfTime = clock;
    shader.vertexShader = deform + "\n" + shader.vertexShader;
    shader.vertexShader = shader.vertexShader.replace(
      "#include <beginnormal_vertex>",
      "#include <beginnormal_vertex>\nfloat e=.12;objectNormal=normalize(vec3(-(wfDeform(position.xz+vec2(e,0.))-wfDeform(position.xz-vec2(e,0.)))/(2.*e),1.,-(wfDeform(position.xz+vec2(0.,e))-wfDeform(position.xz-vec2(0.,e)))/(2.*e)));",
    );
    shader.vertexShader = shader.vertexShader.replace(
      "#include <begin_vertex>",
      "#include <begin_vertex>\ntransformed.y+=wfDeform(position.xz);",
    );
  };
  mat.onBeforeCompile = patch;
  mat.customProgramCacheKey = () =>
    "waterfront-elastic-net-v3-persistent-springs";
  const geometry = new T.CircleGeometry(r - 6, 128, 0, Math.PI * 2);
  // Concentric topology resolves local paw impacts across the entire net.
  const v = [0, 0, 0],
    uv = [0.5, 0.5],
    index = [];
  const rings = 48,
    segments = 128;
  for (let j = 1; j <= rings; j++)
    for (let i = 0; i < segments; i++) {
      const a = (i * Math.PI * 2) / segments,
        d = ((r - 6) * j) / rings;
      v.push(Math.sin(a) * d, 0, Math.cos(a) * d);
      uv.push(
        0.5 + ((Math.sin(a) * j) / rings) * 0.5,
        0.5 + ((Math.cos(a) * j) / rings) * 0.5,
      );
    }
  for (let i = 0; i < segments; i++)
    index.push(0, 1 + ((i + 1) % segments), 1 + i);
  for (let j = 1; j < rings; j++)
    for (let i = 0; i < segments; i++) {
      const a = 1 + (j - 1) * segments + i,
        c = 1 + j * segments + i,
        an = 1 + (j - 1) * segments + ((i + 1) % segments),
        cn = 1 + j * segments + ((i + 1) % segments);
      index.push(a, cn, c, a, an, cn);
    }
  geometry.setAttribute("position", new T.Float32BufferAttribute(v, 3));
  geometry.setAttribute("uv", new T.Float32BufferAttribute(uv, 2));
  geometry.setIndex(index);
  geometry.deleteAttribute("normal");
  geometry.computeVertexNormals();
  geometry.computeBoundingBox();
  geometry.boundingBox.min.y = -1.1;
  geometry.boundingBox.max.y = 0.42;
  geometry.computeBoundingSphere();
  geometry.boundingSphere.radius += 1.1;
  const net = new T.Mesh(geometry, mat);
  net.position.y = y;
  net.castShadow = true;
  net.receiveShadow = true;
  const depth = new T.MeshDepthMaterial({ depthPacking: T.RGBADepthPacking });
  depth.onBeforeCompile = patch;
  depth.customProgramCacheKey = mat.customProgramCacheKey;
  net.customDepthMaterial = depth;
  root.add(net);
  let cursor = 0;
  const states = Array.from({ length: 8 }, () => ({
    target: 0,
    until: -Infinity,
  }));
  root.userData = {
    net,
    impacts,
    press(slot, x, z, t, strength) {
      const i = slot % 8;
      impacts[i].x = x;
      impacts[i].y = z;
      states[i].target = -Math.max(0, Math.min(1.06, strength));
      states[i].until = t + 0.13;
    },
    release(slot) {
      states[slot % 8].target = 0;
      states[slot % 8].until = -Infinity;
    },
    impact(x, z, t, strength = 0.5, slot = null) {
      const i = slot === null ? cursor++ % 8 : slot % 8;
      impacts[i].x = x;
      impacts[i].y = z;
      impacts[i].w = Math.max(-14, impacts[i].w - Math.max(0.2, strength) * 9);
      states[i].target = 0;
      states[i].until = -Infinity;
    },
    step(dt, t) {
      const count = Math.max(
          1,
          Math.ceil(Math.max(0, Math.min(0.1, dt)) * 120),
        ),
        h = Math.max(0, Math.min(0.1, dt)) / count;
      for (let j = 0; j < count; j++)
        for (let i = 0; i < 8; i++) {
          const p = impacts[i],
            target = t <= states[i].until ? states[i].target : 0;
          p.w += (100 * (target - p.z) - 8 * p.w) * h;
          p.z += p.w * h;
          if (p.z < -1.08) {
            p.z = -1.08;
            p.w = Math.max(0, p.w) * 0.25;
          }
          if (p.z > 0.42) {
            p.z = 0.42;
            p.w = Math.min(0, p.w) * 0.25;
          }
          if (Math.abs(p.z) < 1e-7 && Math.abs(p.w) < 1e-6) {
            p.z = 0;
            p.w = 0;
          }
        }
    },
    height(x, z, t) {
      return y + netDisplacement(x, z, t, impacts);
    },
    update(t) {
      clock.value = t;
    },
  };
  return root;
}
