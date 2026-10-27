import * as THREE from "three";
import { RoundedBoxGeometry } from "three/addons/geometries/RoundedBoxGeometry.js";
import { megaRide } from "./mega-ride-data.js";
import {
  createMegaRoute,
  sampleMegaCurve,
  stairPoint,
  funnelFloor,
  funnelNormal,
  FUNNEL_RADIUS,
} from "./mega-ride-motion.js";
import { batchModelGeometry } from "./model-batching.js";
import { createLagoon, createWaterfall } from "./lagoon.js";
import { waterMaterial, advanceWater } from "./water-shading.js";
import { installSlideWater } from "./slide-water.js";
import { installRideActing } from "./ride-acting.js";
import { courtLabel } from "./foodcourt-assets.js";
const cream = 0xffedd2,
  gold = 0xf6cf86;

// A real flume cross-section, sampled along the SAME arc-length path as the
// rider. Clear shells use alpha/Fresnel, never transmission or a scene copy.
export function flume(data, radius, { full = false, offset = 0, flat = 1 } = {}) {
  const positions = [],
    normals = [],
    uv = [],
    indices = [],
    steps = data.flumeSteps || 180,
    sides = full ? 18 : 14;
  for (let i = 0; i <= steps; i++) {
    const s = data.samples[Math.round((i / steps) * 600)];
    for (let j = 0; j <= sides; j++) {
      const open = full
        ? Math.max(
            data.openStart ? 1 - THREE.MathUtils.smoothstep(i / steps, 0, .15) : 0,
            data.openEnd ? THREE.MathUtils.smoothstep(i / steps, .85, 1) : 0,
            data.narrowEnd ? THREE.MathUtils.smoothstep(i / steps, 0.76, 1) : 0,
            data.narrowStart
              ? 1 - THREE.MathUtils.smoothstep(i / steps, 0, 0.22)
              : 0,
          )
        : 1;
      const a = Math.PI * open + (j / sides) * Math.PI * (2 - open),
        taper =
          (data.narrowEnd
            ? THREE.MathUtils.lerp(
                1,
                0.38,
                THREE.MathUtils.smoothstep(i / steps, 0.78, 1),
              )
            : 1) *
          (data.narrowStart
            ? THREE.MathUtils.lerp(
                0.38,
                1,
                THREE.MathUtils.smoothstep(i / steps, 0, 0.22),
              )
            : 1),
        x = Math.cos(a) * radius * taper,
        y = Math.sin(a) * radius * taper * flat + offset;
      positions.push(
        s.p.x + s.right.x * x + s.up.x * y,
        s.p.y + s.right.y * x + s.up.y * y,
        s.p.z + s.right.z * x + s.up.z * y,
      );
      const n = s.right
        .clone()
        .multiplyScalar(Math.cos(a))
        .addScaledVector(s.up, Math.sin(a));
      normals.push(n.x, n.y, n.z);
      uv.push(j / sides, (i / steps) * 20);
      if (i < steps && j < sides) {
        const k = i * (sides + 1) + j;
        indices.push(
          k,
          k + 1,
          k + sides + 1,
          k + 1,
          k + sides + 2,
          k + sides + 1,
        );
      }
    }
  }
  const g = new THREE.BufferGeometry();
  g.setAttribute("position", new THREE.Float32BufferAttribute(positions, 3));
  g.setAttribute("normal", new THREE.Float32BufferAttribute(normals, 3));
  g.setAttribute("uv", new THREE.Float32BufferAttribute(uv, 2));
  g.setIndex(indices);
  return g;
}
export function crystalGlass(color) {
  const m = new THREE.MeshPhysicalMaterial({
    color,
    transparent: true,
    opacity: 0.17,
    depthWrite: false,
    roughness: 0.12,
    metalness: 0.12,
    clearcoat: 1,
    clearcoatRoughness: 0.08,
    side: THREE.FrontSide,
  });
  m.onBeforeCompile = (shader) => {
    shader.fragmentShader = shader.fragmentShader.replace(
      "#include <opaque_fragment>",
      `float rim=pow(1.0-abs(dot(normal,normalize(vViewPosition))),3.0);diffuseColor.a=clamp(.10+rim*.5,.10,.62);outgoingLight+=vec3(.55,.8,1.)*rim*.3;\n#include <opaque_fragment>`,
    );
  };
  m.customProgramCacheKey = () => "mega-acrylic-v1";
  m.name = "Lightweight clear acrylic · no transmission";
  return m;
}
export function megaAttraction(id) {
  const spec = megaRide(id);
  if (!spec) return null;
  const g = new THREE.Group(),
    props = new THREE.Group(),
    moving = new THREE.Group(),
    route = createMegaRoute(spec),
    materials = new Map(),
    water = [],
    channels = [],
    animations = [],
    bowlPostTops = [],
    labels = [];
  g.name = spec.name;
  g.add(moving);
  const mat = (c, polish = false, glow = false) => {
      const key = [c, polish, glow].join(":");
      if (!materials.has(key))
        materials.set(
          key,
          new THREE.MeshStandardMaterial({
            color: c,
            roughness: polish ? 0.28 : 0.76,
            metalness: polish ? 0.18 : 0.02,
            emissive: glow ? c : 0,
            emissiveIntensity: glow ? 0.45 : 0,
          }),
        );
      return materials.get(key);
    },
    mesh = (
      parent,
      geo,
      c,
      x = 0,
      y = 0,
      z = 0,
      polish = false,
      glow = false,
    ) => {
      const m = new THREE.Mesh(geo, mat(c, polish, glow));
      m.position.set(x, y, z);
      m.castShadow = !glow;
      m.receiveShadow = true;
      parent.add(m);
      return m;
    },
    box = (p, c, x, y, z, w, h, d, polish = false) =>
      mesh(
        p,
        new RoundedBoxGeometry(
          w,
          h,
          d,
          1,
          Math.min(0.12, w * 0.15, h * 0.15, d * 0.15),
        ),
        c,
        x,
        y,
        z,
        polish,
      ),
    ball = (p, c, x, y, z, sx, sy = sx, sz = sx, glow = false) => {
      const m = mesh(
        p,
        new THREE.SphereGeometry(1, 10, 7),
        c,
        x,
        y,
        z,
        false,
        glow,
      );
      m.scale.set(sx, sy, sz);
      return m;
    },
    rod = (p, c, a, b, r = 0.1) => {
      const av = new THREE.Vector3(...a),
        bv = new THREE.Vector3(...b),
        delta = bv.clone().sub(av),
        m = mesh(p, new THREE.CylinderGeometry(r, r, delta.length(), 8), c);
      m.position.copy(av.add(bv).multiplyScalar(0.5));
      m.quaternion.setFromUnitVectors(
        new THREE.Vector3(0, 1, 0),
        delta.normalize(),
      );
      return m;
    },
    tube = (p, c, points, r = 0.05) =>
      mesh(
        p,
        new THREE.TubeGeometry(
          new THREE.CatmullRomCurve3(points),
          Math.max(16, points.length * 2),
          r,
          6,
          false,
        ),
        c,
        0,
        0,
        0,
        true,
      ),
    rim = (p, c, r, x, y, z, rotation, open = false) => {
      const geometry = new THREE.TorusGeometry(
        r,
        0.075,
        6,
        28,
        open ? Math.PI : Math.PI * 2,
      );
      if (open) geometry.rotateZ(Math.PI);
      const m = mesh(p, geometry, c, x, y, z, true);
      if (rotation) m.quaternion.copy(rotation);
      else m.rotation.x = Math.PI / 2;
      return m;
    };
  const [w, d] = spec.footprint;
  box(props, cream, 0, 0.06, 0, w - 0.4, 0.12, d - 0.4);
  // Small patterned border, flowers and lights belong to this purchased set.
  for (let i = 0; i < 18; i++) {
    const x = -w / 2 + 1 + (i * (w - 2)) / 17;
    box(
      props,
      i % 2 ? spec.color : spec.accent,
      x,
      0.16,
      d / 2 - 0.5,
      0.65,
      0.15,
      0.45,
      true,
    );
    if (i % 3 === 0) {
      rod(props, gold, [x, 0.1, d / 2 - 0.6], [x, 1.35, d / 2 - 0.6], 0.035);
      ball(props, 0xffe4a1, x, 1.4, d / 2 - 0.6, 0.16, 0.22, 0.16, true);
    }
  }
  function tower(height) {
    const [tx, tz] = spec.tower;
    for (const x of [-0.72, 0.72])
      for (const z of [-0.72, 0.72])
        rod(
          props,
          spec.color,
          [tx + x, 0.2, tz + z],
          [tx + x, height + 0.3, tz + z],
          0.14,
        );
    for (let level = 0; level < height; level += 3) {
      for (const side of [-1, 1]) {
        rod(
          props,
          gold,
          [tx - 0.72, level + 0.2, tz + side * 0.72],
          [tx + 0.72, Math.min(height, level + 3), tz + side * 0.72],
          0.065,
        );
        rod(
          props,
          spec.accent,
          [tx + side * 0.72, level + 0.2, tz - 0.72],
          [tx + side * 0.72, Math.min(height, level + 3), tz + 0.72],
          0.065,
        );
      }
    }
    const rail = [];
    for (let i = 0; i <= height * 4; i++) {
      const p = stairPoint(spec.tower, height, i / (height * 4)),
        a = (i * Math.PI) / 8;
      box(
        props,
        i % 2 ? cream : spec.accent,
        p[0],
        p[1] - 0.1,
        p[2],
        1.1,
        0.2,
        0.75,
      ).rotation.y = -a;
      const q = stairPoint(spec.tower, height, i / (height * 4));
      q[0] += 0.4 * Math.cos(a);
      q[1] += 0.8;
      q[2] += 0.4 * Math.sin(a);
      rail.push(new THREE.Vector3(...q));
      if (i % 4 === 0) rod(props, gold, p, q, 0.035);
    }
    tube(props, gold, rail, 0.04);
    box(props, spec.color, tx, height + 0.08, tz, 4.3, 0.18, 4.3, true);
    for (const side of [-1, 1])
      rod(
        props,
        gold,
        [tx + side * 2, height + 0.1, tz - 2],
        [tx + side * 2, height + 1, tz - 2],
        0.06,
      );
    if (spec.kind !== "dive") {
      for (const side of [-1, 1])
        rod(
          props,
          gold,
          [tx + side * 1.8, height + 0.2, tz - 1.8],
          [tx + side * 1.8, height + 2.8, tz - 1.8],
          0.07,
        );
      mesh(
        props,
        new THREE.ConeGeometry(2.5, 1.5, 8),
        spec.accent,
        tx,
        height + 3,
        tz,
      );
      ball(props, gold, tx, height + 3.9, tz, 0.22, 0.28, 0.22, true);
    }
  }
  let pool;
  if (spec.pool) {
    const [px, pz, rx, rz] = spec.pool;
    pool = createLagoon({
      x: px,
      z: pz,
      rx,
      rz,
      depth: 1.1,
      fishCount: 0,
      color: 0x2cc6dd,
      seed: spec.height,
    });
    pool.position.y = 1.25;
    g.add(pool);
    animations.push(pool);
    const ring = mesh(
      props,
      new THREE.CylinderGeometry(1, 1, 1.26, 64, 1, true),
      spec.accent,
      px,
      0.67,
      pz,
      true,
    );
    ring.scale.set(rx + 0.18, 1, rz + 0.18);
    const lip = rim(props, cream, 1, px, 1.43, pz);
    lip.scale.set(rx + 0.1, rz + 0.1, 1);
    for (let i = 0; i < 5; i++)
      box(
        props,
        cream,
        px,
        0.13 + i * 0.25,
        pz + rz + 0.7 - i * 0.13,
        2.6,
        0.25,
        0.6,
      );
    for (const side of [-1, 1])
      rod(
        props,
        gold,
        [px + side * 1.25, 0.15, pz + rz + 1.1],
        [px + side * 1.25, 2, pz + rz - 0.3],
        0.055,
      );
    tower(spec.height);
  }
  const glass = crystalGlass(0xc8edf4);
  for (const segment of route.geometry) {
    if (segment.visual === "rails") {
      for (const side of [-1, 1]) {
        const points = segment.samples
          .filter((_, i) => i % 3 === 0)
          .map((s) => s.p.clone().addScaledVector(s.right, side * 0.48));
        tube(props, side < 0 ? spec.color : spec.accent, points, 0.095);
      }
      for (let i = 0; i <= 100; i++) {
        const s = segment.samples[i * 6];
        const tie = box(
          props,
          cream,
          s.p.x,
          s.p.y - 0.05,
          s.p.z,
          1.25,
          0.14,
          0.15,
          true,
        );
        tie.quaternion.copy(s.q);
        if (i % 8 === 0 && s.p.y > 0.8) {
          rod(
            props,
            gold,
            [s.p.x, 0.15, s.p.z],
            [s.p.x, s.p.y - 0.2, s.p.z],
            0.13,
          );
          if (s.p.y > 7)
            rod(
              props,
              spec.color,
              [s.p.x - 1.3, 0.15, s.p.z],
              [s.p.x, s.p.y - 0.25, s.p.z],
              0.075,
            );
        }
      }
    } else if (segment.visual !== "bowl") {
      const lanes =
        segment.visual === "racer" ? [-7.5, -4.5, -1.5, 1.5, 4.5, 7.5] : [null];
      for (const lane of lanes) {
        let data = segment;
        if (lane != null) {
          // Keep the lead-in platform unchannelled. All six long flumes are
          // real geometry; the ride uses the centre-right lane.
          const points = [];
          for (let i = 0; i <= 50; i++) {
            const u = i / 50;
            points.push([
              lane,
              spec.height +
                0.55 -
                (spec.height - 3.2) * u +
                Math.sin(u * Math.PI * 5) * 0.75,
              -9 + 16 * u,
            ]);
          }
          data = sampleMegaCurve(points, { seat: -0.55 });
        }
        if (["glass"].includes(segment.visual)) {
          const m = new THREE.Mesh(flume(data, 1.8, { full: true }), glass);
          m.name = "Clear acrylic slide";
          g.add(m);
        } else {
          const shell = mesh(
            props,
            flume(data, 1.7),
            lanes.length > 1
              ? [0xf39eb6, 0xffc582, 0xffdf87, 0x8bd5b1, 0x88cce5, 0xb8a3e9][
                  lanes.indexOf(lane)
                ]
              : spec.color,
          );
          shell.material = shell.material.clone();
          shell.material.side = THREE.DoubleSide;
        }
        const transfer = segment.narrowEnd ? data.samples.at(-1).p : null;
        channels.push({
          samples: data.samples,
          width: 1.32,
          widthStart: segment.narrowStart ? 0.46 : undefined,
          widthEnd: segment.narrowEnd ? 0.46 : undefined,
          offset: -0.53,
          steps: 180,
          ...(transfer
            ? {
                outletPoint: [
                  transfer.x,
                  funnelFloor(Math.hypot(transfer.x, transfer.z)) + 0.045,
                  transfer.z,
                ],
                outletNormal: funnelNormal(transfer.x, transfer.z).toArray(),
              }
            : {}),
          outlet: true,
        });
      }
      for (let i = 0; i <= 16; i++) {
        const s = segment.samples[Math.round((i / 16) * 600)];
        if (segment.visual === "glass")
          rim(
            props,
            i % 2 ? spec.color : spec.accent,
            1.84 *
              (segment.narrowEnd
                ? THREE.MathUtils.lerp(
                    1,
                    0.38,
                    THREE.MathUtils.smoothstep(i / 16, 0.78, 1),
                  )
                : 1) *
              (segment.narrowStart
                ? THREE.MathUtils.lerp(
                    0.38,
                    1,
                    THREE.MathUtils.smoothstep(i / 16, 0, 0.22),
                  )
                : 1),
            s.p.x,
            s.p.y,
            s.p.z,
            s.q,
            !!((segment.narrowEnd && i > 13) || (segment.narrowStart && i < 3)),
          );
        if (i % 3 === 0) {
          const radius = Math.hypot(s.p.x, s.p.z),
            top =
              spec.kind === "funnel" &&
              radius > 1.85 &&
              radius < FUNNEL_RADIUS + 0.2
                ? Math.min(
                    s.p.y - 1.65,
                    funnelFloor(Math.min(radius, FUNNEL_RADIUS)) - 0.28,
                  )
                : s.p.y - 1.65;
          const support = rod(
            props,
            gold,
            [s.p.x, 0.12, s.p.z],
            [s.p.x, Math.max(0.3, top), s.p.z],
            0.12,
          );
          if (
            spec.kind === "funnel" &&
            radius > 1.85 &&
            radius < FUNNEL_RADIUS + 0.2
          )
            bowlPostTops.push([
              support.position.x,
              support.position.y + support.geometry.parameters.height / 2,
              support.position.z,
            ]);
        }
      }
    }
  }
  if (spec.kind === "funnel") {
    const profile = [];
    for (let i = 0; i <= 32; i++) {
      const r = 1.85 + ((FUNNEL_RADIUS - 1.85) * i) / 32;
      profile.push(new THREE.Vector2(r, funnelFloor(r)));
    }
    const bm = new THREE.MeshStandardMaterial({
      color: spec.color,
      roughness: 0.29,
      metalness: 0.17,
      side: THREE.DoubleSide,
    });
    bm.onBeforeCompile = (s) => {
      s.vertexShader =
        "varying vec2 vBowlUv;\n" +
        s.vertexShader.replace(
          "#include <begin_vertex>",
          "#include <begin_vertex>\nvBowlUv=uv;",
        );
      s.fragmentShader =
        "varying vec2 vBowlUv;\n" +
        s.fragmentShader.replace(
          "#include <color_fragment>",
          "#include <color_fragment>\nfloat stripe=step(.5,fract(vBowlUv.x*12.));diffuseColor.rgb=mix(diffuseColor.rgb,vec3(1.,.84,.54),stripe*.55);",
        );
    };
    bm.customProgramCacheKey = () => "titan-funnel-stripes-v1";
    const bowl = new THREE.Mesh(new THREE.LatheGeometry(profile, 96), bm);
    bowl.name = "Real concave vortex bowl with open throat";
    g.add(bowl);
    const film = waterMaterial(0x76e2e5, 0.7, {
        flow: {
          vortex: true,
          speed: 5,
          width: Math.PI * 2 * FUNNEL_RADIUS,
          length: 9,
        },
      }),
      wet = new THREE.Mesh(
        new THREE.LatheGeometry(
          profile.map((p) => new THREE.Vector2(p.x, p.y + 0.035)),
          96,
        ),
        film,
      );
    g.add(wet);
    water.push(film);
    rim(props, gold, FUNNEL_RADIUS, 0, funnelFloor(FUNNEL_RADIUS) + 0.06, 0);
    for (let i = 0; i < 8; i++) {
      const a = (i * Math.PI) / 4;
      rod(
        props,
        spec.accent,
        [Math.sin(a) * 6.3, 0.12, Math.cos(a) * 6.3],
        [Math.sin(a) * 6.3, 8.7, Math.cos(a) * 6.3],
        0.16,
      );
    }
  }
  if (spec.kind === "dive") {
    for (const height of [10, 20, 30]) {
      const p = stairPoint(spec.tower, height, 1),
        dx = spec.pool[0] - p[0],
        dz = spec.pool[1] - p[2],
        a = Math.atan2(dx, dz);
      const plank = box(
        props,
        cream,
        p[0] + Math.sin(a) * 1.1,
        p[1] - 0.1,
        p[2] + Math.cos(a) * 1.1,
        1.4,
        0.2,
        3.2,
        true,
      );
      plank.rotation.y = a;
      const label = courtLabel(height + " м", 2.1, 0.8);
      label.position.set(spec.tower[0], height + 0.65, spec.tower[1] + 1.4);
      g.add(label);
      labels.push(label);
      for (const side of [-1, 1])
        rod(
          props,
          spec.accent,
          [p[0] + side * 0.6, p[1], p[2]],
          [p[0] + side * 0.6, p[1] + 0.8, p[2]],
          0.045,
        );
    }
  }
  if (spec.kind === "racer") {
    box(props, cream, 0, spec.height + 0.08, -10, 22, 0.18, 3.3, true);
    for (let i = 0; i < 6; i++)
      rim(
        props,
        [0xf39eb6, 0xffc582, 0xffdf87, 0x8bd5b1, 0x88cce5, 0xb8a3e9][i],
        1.05,
        -7.5 + i * 3,
        spec.height + 1.25,
        -9.8,
        new THREE.Quaternion(),
      );
  }
  if (spec.kind === "drop") {
    const e = stairPoint(spec.tower, spec.height, 1);
    const capsule = new THREE.Mesh(
      new THREE.CylinderGeometry(1.25, 1.25, 3.5, 24, 1, true),
      glass,
    );
    capsule.position.set(e[0], e[1] + 1.2, e[2]);
    capsule.name = "Panoramic drop capsule";
    g.add(capsule);
    for (const y of [e[1] - 0.3, e[1] + 2.8])
      rim(props, gold, 1.28, e[0], y, e[2]);
  }
  if (spec.kind === "jungle" || spec.kind === "dragon") {
    const count = spec.kind === "jungle" ? 10 : 6;
    for (let i = 0; i < count; i++) {
      const m = mesh(
        props,
        new THREE.DodecahedronGeometry(1, 1),
        [0x98a599, 0xb7b398, 0x8f9e9b][i % 3],
        -5 + Math.sin(i * 2.4) * 3,
        1 + (i % 4) * 2,
        -5 + Math.cos(i * 2.4) * 3,
      );
      m.scale.set(2.2, 3.2 + (i % 3), 1.7);
      if (i % 3 === 0) {
        rod(
          props,
          0x8e7964,
          [m.position.x, m.position.y + 2, m.position.z],
          [m.position.x, m.position.y + 5, m.position.z],
          0.12,
        );
        for (let j = 0; j < 5; j++) {
          const a = (j * Math.PI * 2) / 5;
          const leaf = ball(
            props,
            0x91ba7a,
            m.position.x + Math.sin(a) * 0.8,
            m.position.y + 5,
            m.position.z + Math.cos(a) * 0.8,
            1.2,
            0.18,
            0.4,
          );
          leaf.rotation.y = -a;
        }
      }
    }
    if (spec.kind === "jungle") {
      const cliff = mesh(
        props,
        new THREE.DodecahedronGeometry(1, 1),
        0x99ab99,
        -3,
        5.1,
        0,
      );
      cliff.scale.set(3.4, 4.6, 2.4);
      const upper = createLagoon({
        x: -3,
        z: 0,
        rx: 2.7,
        rz: 1.9,
        depth: 0.55,
        fishCount: 0,
        color: 0x4ad2c7,
      });
      upper.position.y = 9.1;
      g.add(upper);
      animations.push(upper);
      const fall = createWaterfall(-3, 2.5, 2.3, 8);
      fall.position.y += 9.4;
      g.add(fall);
      animations.push(fall);
    }
  }
  if (route.coaster) {
    // Raised station, arrival stairs, coloured portals and a distinct train.
    const e = route.station;
    box(props, cream, e[0], 0.25, e[2], 3.4, 0.5, 3.4);
    for (let i = 0; i < 4; i++)
      box(
        props,
        spec.accent,
        e[0] - 2 + i * 0.3,
        0.1 + i * 0.12,
        e[2],
        0.6,
        0.15,
        1.5,
      );
    for (let i = 0; i < 5; i++) {
      const x = (i - 2) * 4;
      rod(props, spec.color, [x, 0.15, -10], [x, 4 + (i % 2) * 2, -10], 0.14);
      mesh(
        props,
        new THREE.OctahedronGeometry(0.6, 0),
        spec.accent,
        x,
        5 + (i % 2) * 2,
        -10,
        false,
        true,
      );
    }
    box(moving, spec.color, 0, -0.12, 0, 1.55, 0.4, 1.9, true);
    box(moving, cream, 0, 0.1, -0.5, 1.3, 0.65, 0.25);
    for (const side of [-1, 1]) {
      rod(
        moving,
        gold,
        [side * 0.65, 0.12, -0.4],
        [side * 0.65, 0.4, 0.5],
        0.05,
      );
      ball(moving, 0x5f6482, side * 0.7, -0.34, -0.55, 0.18, 0.18, 0.13);
      ball(moving, 0x5f6482, side * 0.7, -0.34, 0.55, 0.18, 0.18, 0.13);
    }
    rod(moving, gold, [-0.65, 0.4, 0.5], [0.65, 0.4, 0.5], 0.055);
    if (spec.kind === "dragon") {
      ball(moving, spec.accent, 0, 0.2, 0.9, 0.64, 0.45, 0.48);
      for (const side of [-1, 1]) {
        ball(moving, cream, side * 0.24, 0.39, 1.25, 0.16, 0.18, 0.08);
        ball(moving, 0x47566d, side * 0.24, 0.4, 1.32, 0.065, 0.09, 0.035);
        mesh(
          moving,
          new THREE.ConeGeometry(0.1, 0.4, 8),
          gold,
          side * 0.3,
          0.79,
          0.85,
        );
      }
      for (let i = 0; i < 5; i++)
        mesh(
          moving,
          new THREE.ConeGeometry(0.13, 0.3, 8),
          spec.accent,
          0,
          0.4,
          -0.8 - i * 0.1,
        );
      ball(props, spec.color, 6, 6, -8, 2.7, 2.5, 2.7);
      ball(props, spec.accent, 6, 5.1, -5.9, 2.1, 0.8, 1.5);
      for (const side of [-1, 1]) {
        ball(props, cream, 6 + side * 1.25, 7, -5.8, 0.7, 0.82, 0.38);
        ball(props, 0x5a597e, 6 + side * 1.22, 7.05, -5.5, 0.27, 0.43, 0.16);
        mesh(
          props,
          new THREE.ConeGeometry(0.38, 2.5, 10),
          gold,
          6 + side * 1.6,
          9.1,
          -8.3,
        );
        for (let j = 0; j < 3; j++)
          mesh(
            props,
            new THREE.ConeGeometry(0.16, 0.55, 8),
            cream,
            6 + side * (0.5 + j * 0.5),
            5.1,
            -4.8,
          ).rotation.z = Math.PI;
      }
    }
  } else if (spec.kind !== "dive") {
    const raft = mesh(
      moving,
      new THREE.TorusGeometry(0.7, 0.18, 8, 32),
      spec.accent,
      0,
      -0.03,
      0,
      true,
    );
    raft.rotation.x = Math.PI / 2;
    box(moving, cream, 0, -0.15, 0, 1, 0.16, 1, true);
    for (const side of [-1, 1])
      rod(
        moving,
        spec.color,
        [side * 0.57, 0.08, -0.1],
        [side * 0.57, 0.2, 0.25],
        0.05,
      );
  }
  // Soft landscape edging, never an extra blocking object outside the footprint.
  for (let i = 0; i < 20; i++) {
    const x = (i % 2 ? -1 : 1) * (w / 2 - 0.6),
      z = -d / 2 + 1 + (Math.floor(i / 2) * (d - 2)) / 9;
    for (let p = 0; p < 4; p++)
      ball(
        props,
        [spec.accent, 0xf6d7da, 0xc4dfae][i % 3],
        x + Math.sin(p * 1.57) * 0.13,
        0.23,
        z + Math.cos(p * 1.57) * 0.13,
        0.14,
        0.05,
        0.1,
      );
    ball(props, gold, x, 0.28, z, 0.07);
  }
  const staticModel = batchModelGeometry(props, { combineColors: true });
  staticModel.name = "Batched legendary complex";
  g.add(staticModel);
  props.traverse((o) => {
    if (o.isMesh && !o.geometry.userData.sharedScenery) o.geometry.dispose();
  });
  g.userData = {
    id,
    mega: true,
    handpainted: true,
    moving,
    rideFrame: route.frame,
    duration: route.duration,
    seatHeight: 0,
    approachOffset: route.entry,
    dismount: route.entry,
    route,
    pool,
    labels,
    bowlPostTops,
    stats: {
      sourceMeshes: staticModel.userData.sourceMeshes,
      staticMeshes: staticModel.children.length,
      waterDraws: water.length,
    },
    waterMaterials: water,
  };
  g.userData.update = (time, reduced = false) => {
    const elapsed = g.userData.rideElapsed ?? time % route.duration,
      f = route.frame(elapsed, reduced);
    for (const m of water) advanceWater(m, time, reduced);
    for (const a of animations) a.userData.update(time, reduced);
    moving.visible =
      route.coaster ||
      (Number.isFinite(g.userData.rideElapsed) &&
        !["board", "climb", "return", "anticipation", "done"].includes(
          f.phase,
        ) &&
        spec.kind !== "dive");
    const vehicle =
      route.coaster && ["board", "exit", "done"].includes(f.phase)
        ? route.run.at(f.phase === "board" ? 0 : 1)
        : f;
    moving.position.set(...vehicle.position);
    if (vehicle.quaternion) moving.quaternion.fromArray(vehicle.quaternion);
    else
      moving.rotation.set(
        vehicle.pitch || 0,
        vehicle.yaw || 0,
        vehicle.roll || 0,
      );
  };
  if (pool) {
    installSlideWater(g, {
      channels,
      pool,
      extraSurfaces: water,
      color: 0x43d1e7,
      speed: spec.kind === "racer" ? 8 : 6.5,
    });
    g.userData.waterMaterials = g.userData.slideWater.materials;
    g.userData.stats.waterDraws = (channels.length ? 1 : 0) + water.length;
  }
  installRideActing(g);
  g.userData.update(0, true);
  return g;
}
