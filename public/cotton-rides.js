import * as THREE from "three";
import {
  shape,
  line,
  torus,
  lantern,
  flowerCluster,
} from "./fantasy-scenery.js";
import { batchModelGeometry } from "./model-batching.js";
import { waterMaterial } from "./lagoon.js";
import { COTTON_RIDES } from "./cotton-data.js";
import {
  SWEETS,
  createPig,
  cupcake,
  heart,
  candyTube,
} from "./cotton-props.js";
const TAU = Math.PI * 2;
function bakeVehicle(g) {
  const b = batchModelGeometry(g, { combineColors: true });
  g.traverse((o) => {
    if (o.isMesh && !o.geometry.userData.sharedScenery) o.geometry.dispose();
  });
  g.clear();
  g.add(b);
}
function point(curve, u, seat = 0.4) {
  const p = curve.getPoint(u),
    v = curve.getTangent(u);
  return {
    position: [p.x, p.y + seat, p.z],
    yaw: Math.atan2(v.x, v.z),
    roll: Math.max(-0.2, Math.min(0.2, -v.x * v.y * 0.25)),
    phase: "ride",
    paw: 0.26,
  };
}
function teacup(color) {
  const g = new THREE.Group(),
    pts = [];
  for (let i = 0; i <= 18; i++) {
    const t = i / 18;
    pts.push(new THREE.Vector2(0.35 + 0.36 * t, 0.1 + t * 0.65));
  }
  const m = new THREE.Mesh(
    new THREE.LatheGeometry(pts, 32),
    new THREE.MeshPhysicalMaterial({
      color,
      roughness: 0.3,
      clearcoat: 0.7,
      side: THREE.DoubleSide,
    }),
  );
  g.add(m);
  shape(g, "sphere", 0xffe1d7, 0, 0.12, 0, 0.95, 0.06, 0.95);
  const handle = torus(g, 0xffd3a2, 0.28, 0.065, 0.78, 0.46, 0);
  handle.rotation.y = Math.PI / 2;
  heart(g, 0, 0.29, 0.65, 0xff8db7, 0.18);
  return g;
}
export function cottonRide(id) {
  const spec = COTTON_RIDES.find((r) => r.id === id);
  if (!spec) return null;
  const root = new THREE.Group(),
    props = new THREE.Group(),
    moving = new THREE.Group(),
    animated = [],
    vehicles = [];
  root.add(moving);
  let duration = 20,
    frame,
    wheel = null,
    curve = null,
    water = null;
  if (id.startsWith("ride-pig-")) {
    const pig = createPig({
      color: id.endsWith("lilac")
        ? 0xdabaf0
        : id.endsWith("peach")
          ? 0xffccba
          : 0xffb2cc,
      spotted: id.endsWith("peach"),
      saddle: true,
    });
    moving.add(pig);
    animated.push(pig);
    duration = 16;
    for (let i = 0; i < 12; i++) {
      const a = (i * TAU) / 12;
      shape(
        props,
        "stone",
        SWEETS[i % 5],
        Math.sin(a) * 2.2,
        0.04,
        Math.cos(a) * 2.2,
        0.18,
        0.04,
        0.14,
      );
    }
    flowerCluster(props, -2, 1.5, 0xff9fc7, 0.65);
    lantern(props, 2, 0, 1.5, 0.5);
    frame = (t, reduced) => {
      const a = reduced ? 0 : Math.min(1, Math.max(0, t / duration)) * TAU;
      return {
        position: [
          Math.sin(a) * 1.35,
          1.56 + (reduced ? 0 : Math.sin(a * 8) * 0.025),
          Math.cos(a) * 1.35,
        ],
        yaw: a + Math.PI / 2,
        phase: "ride",
        paw: 0.12,
        headPitch: 0.03,
      };
    };
  } else if (id === "ride-cupcake-wheel") {
    duration = 24;
    wheel = new THREE.Group();
    wheel.position.y = 4.7;
    root.add(wheel);
    shape(props, "pole", 0xffc9dd, 0, 0.12, 0, 4.3, 0.24, 2.6);
    for (const z of [-0.8, 0.8])
      for (const sign of [-1, 1])
        line(props, [sign * 3.2, 0.2, z], [0, 4.7, 0], 0xe7b87b, 0.16);
    for (const z of [-0.18, 0.18]) {
      torus(wheel, 0xffa3c7, 3.75, 0.1, 0, 0, z);
      torus(wheel, 0xffe0ad, 3.5, 0.045, 0, 0, z);
    }
    const star = new THREE.Shape();
    for (let i = 0; i < 10; i++) {
      const a = (i * Math.PI) / 5,
        r = i % 2 ? 0.4 : 0.88;
      const x = Math.sin(a) * r,
        y = Math.cos(a) * r;
      i ? star.lineTo(x, y) : star.moveTo(x, y);
    }
    star.closePath();
    const hub = new THREE.Mesh(
      new THREE.ExtrudeGeometry(star, {
        depth: 0.22,
        bevelEnabled: true,
        bevelSize: 0.05,
        bevelThickness: 0.03,
        bevelSegments: 2,
      }),
      new THREE.MeshStandardMaterial({
        color: 0xffd57e,
        emissive: 0xffb769,
        emissiveIntensity: 0.4,
      }),
    );
    hub.position.z = 0.32;
    wheel.add(hub);
    for (let i = 0; i < 10; i++) {
      const a = (i * TAU) / 10;
      line(
        wheel,
        [0, 0, 0],
        [Math.sin(a) * 3.75, Math.cos(a) * 3.75, 0],
        0xffe0ad,
        0.045,
      );
      const c = new THREE.Group();
      cupcake(c, SWEETS[i % 5], 0.56, false, true);
      shape(c, "sphere", 0xffebd8, 0, 0.6, 0, 0.39, 0.04, 0.36);
      bakeVehicle(c);
      root.add(c);
      vehicles.push(c);
    }
    for (let i = 0; i < 40; i++) {
      const a = (i * TAU) / 40;
      shape(
        wheel,
        "sphere",
        0xffe3ae,
        Math.sin(a) * 3.75,
        Math.cos(a) * 3.75,
        0.25,
        0.055,
        0.055,
        0.055,
        true,
      );
    }
    frame = (t, reduced) => {
      const a = reduced
        ? Math.PI
        : Math.PI + Math.min(1, Math.max(0, t / duration)) * TAU;
      return {
        position: [Math.sin(a) * 3.75, 4.7 + Math.cos(a) * 3.75 + 0.66, 0.48],
        yaw: 0,
        phase: "ride",
        paw: 0.3,
      };
    };
  } else if (id === "coaster-piglet-express") {
    duration = 22;
    const pts = [];
    for (let i = 0; i < 72; i++) {
      const a = (i * TAU) / 72;
      pts.push(
        new THREE.Vector3(
          Math.sin(a) * 6.6,
          0.65 + Math.sin(a * 1.5) ** 2 * 4.8,
          Math.cos(a) * 2.9,
        ),
      );
    }
    curve = new THREE.CatmullRomCurve3(pts, true);
    for (const dx of [-0.28, 0.28]) {
      const rail = new THREE.CatmullRomCurve3(
        pts.map((p) => p.clone().add(new THREE.Vector3(dx, 0, 0))),
        true,
      );
      candyTube(props, rail, dx < 0 ? 0xff87b4 : 0xffdba4, 0.09);
    }
    for (let i = 0; i < 80; i++) {
      const p = curve.getPoint(i / 80),
        v = curve.getTangent(i / 80),
        tie = shape(
          props,
          "cube",
          i % 2 ? 0xffb1d1 : 0xffdfae,
          p.x,
          p.y - 0.1,
          p.z,
          0.85,
          0.1,
          0.13,
        );
      tie.rotation.y = Math.atan2(v.x, v.z);
      if (i % 5 === 0) {
        line(props, [p.x, 0.05, p.z], [p.x, p.y - 0.1, p.z], 0xc48b83, 0.11);
        shape(
          props,
          "sphere",
          0xffd984,
          p.x,
          p.y - 0.18,
          p.z,
          0.14,
          0.14,
          0.14,
          true,
        );
      }
    }
    for (let i = 0; i < 4; i++) {
      const c = new THREE.Group();
      shape(c, "sphere", 0xf8a9ce, 0, 0.05, 0, 0.6, 0.27, 0.83);
      shape(c, "cube", 0xfde5bb, 0, 0.25, 0, 0.77, 0.08, 0.7);
      const face = createPig();
      face.scale.setScalar(0.34);
      face.position.set(0, -0.15, 0.59);
      c.add(face);
      if (i) {
        const guest = createPig({ color: 0xffc0d5 });
        guest.scale.setScalar(0.3);
        guest.position.set(0, 0.2, 0);
        c.add(guest);
      }
      bakeVehicle(c);
      moving.add(c);
      vehicles.push(c);
    }
    heart(props, -5.7, 3.9, -1, 0xff8cb9, 0.55);
    heart(props, 5.7, 4.3, 1, 0xffb1d9, 0.65);
    frame = (t, reduced) =>
      point(curve, reduced ? 0 : Math.min(1, Math.max(0, t / duration)), 0.43);
  } else if (id === "ride-sugar-teacups") {
    duration = 18;
    shape(props, "pole", 0xf3bbd8, 0, 0.1, 0, 3.25, 0.2, 3.25);
    const trim = torus(props, 0xffdcaa, 3, 0.075, 0, 0.23, 0);
    trim.rotation.x = Math.PI / 2;
    shape(props, "pole", 0xfbdc9b, 0, 0.85, 0, 0.32, 1.5, 0.32);
    heart(props, 0, 1.6, 0, 0xff91be, 0.6);
    for (let i = 0; i < 4; i++) {
      const c = teacup(SWEETS[i]);
      root.add(c);
      vehicles.push(c);
      if (i) {
        const p = createPig();
        p.scale.setScalar(0.32);
        p.position.y = 0.3;
        c.add(p);
        bakeVehicle(p);
      }
    }
    frame = (t, reduced) => {
      const a = reduced ? 0 : Math.min(1, Math.max(0, t / duration)) * TAU;
      return {
        position: [Math.sin(a) * 2.05, 0.58, Math.cos(a) * 2.05],
        yaw: -a * 3,
        phase: "ride",
        paw: 0.24,
      };
    };
  } else {
    duration = 18;
    const tracks = [];
    for (let lane = 0; lane < 3; lane++) {
      const x = (lane - 1) * 1.2,
        pts = [
          [x, 5.7, -3.7],
          [x + 0.35, 5.45, -2.8],
          [x + 0.55, 3.7, -1],
          [x, 1.6, 1.7],
          [x, 0.45, 3.8],
        ],
        c = new THREE.CatmullRomCurve3(pts.map((p) => new THREE.Vector3(...p)));
      tracks.push(c);
      const verts = [],
        uv = [],
        idx = [];
      for (let i = 0; i <= 60; i++) {
        const p = c.getPoint(i / 60);
        for (let j = 0; j <= 8; j++) {
          const a = -Math.PI / 2 + (j * Math.PI) / 8;
          verts.push(
            p.x + Math.sin(a) * 0.56,
            p.y + (1 - Math.cos(a)) * 0.43,
            p.z,
          );
          uv.push(j / 8, i / 60);
          if (i < 60 && j < 8) {
            const n = i * 9 + j;
            idx.push(n, n + 1, n + 9, n + 1, n + 10, n + 9);
          }
        }
      }
      const geo = new THREE.BufferGeometry();
      geo.setAttribute("position", new THREE.Float32BufferAttribute(verts, 3));
      geo.setAttribute("uv", new THREE.Float32BufferAttribute(uv, 2));
      geo.setIndex(idx);
      geo.computeVertexNormals();
      props.add(
        new THREE.Mesh(
          geo,
          new THREE.MeshPhysicalMaterial({
            color: SWEETS[lane],
            roughness: 0.28,
            clearcoat: 0.7,
            side: THREE.DoubleSide,
          }),
        ),
      );
      for (const side of [-1, 1])
        candyTube(
          props,
          new THREE.CatmullRomCurve3(
            pts.map(
              (p) => new THREE.Vector3(p[0] + side * 0.56, p[1] + 0.43, p[2]),
            ),
          ),
          0xffe1b6,
          0.055,
        );
      const raft = new THREE.Group();
      const ring = torus(raft, SWEETS[lane], 0.36, 0.12, 0, 0, 0);
      ring.rotation.x = Math.PI / 2;
      root.add(raft);
      vehicles.push(raft);
      if (lane !== 1) {
        const p = createPig();
        p.scale.setScalar(0.32);
        p.position.y = 0.03;
        raft.add(p);
        animated.push(p);
      }
    }
    curve = tracks[1];
    water = waterMaterial(0xf5a6d2, 0.67);
    const channel = new THREE.Mesh(
      new THREE.PlaneGeometry(3.5, 7.7, 12, 32),
      water,
    );
    channel.rotation.x = -Math.PI / 2;
    channel.position.set(0, 0.2, 0.1);
    props.add(channel);
    for (const x of [-2, 2])
      line(props, [x, 0, -3.7], [x, 5.7, -3.7], 0xc79598, 0.13);
    shape(props, "cube", 0xffd7b5, 0, 5.65, -3.7, 4.5, 0.18, 1.1);
    for (let i = 0; i < 16; i++) {
      const y = i * 0.35,
        z = -3.7;
      shape(
        props,
        "cube",
        i % 2 ? 0xffb9d6 : 0xffdeb5,
        -2.65,
        y,
        z,
        0.8,
        0.16,
        0.42,
      );
      line(props, [-3.03, y, z], [-3.03, y + 0.6, z], 0xffdca5, 0.04);
    }
    frame = (t, reduced) => {
      const u = reduced ? 0 : Math.min(1, Math.max(0, t / duration));
      if (u < 0.24) {
        const v = u / 0.24;
        return {
          position: [0, 0.55 + v * 5.45, 4.1 - v * 7.8],
          yaw: Math.PI,
          phase: "lift",
          paw: 0.08,
        };
      }
      if (u < 0.88) {
        const v = (u - 0.24) / 0.64,
          f = point(curve, v, 0.3);
        f.phase = v > 0.82 ? "flight" : "slide";
        f.position[1] +=
          v > 0.82 ? Math.sin(((v - 0.82) / 0.18) * Math.PI) * 0.65 : 0;
        f.paw = 0.5;
        return f;
      }
      return {
        position: [
          0,
          0.75 - ((u - 0.88) / 0.12) * 0.2,
          3.8 + ((u - 0.88) / 0.12) * 0.3,
        ],
        yaw: 0,
        phase: "splash",
        paw: 0.25,
      };
    };
  }
  if (!id.startsWith("ride-pig-"))
    for (const sign of [-1, 1]) {
      lantern(
        props,
        sign * (spec.footprint[0] / 2 - 0.4),
        0,
        spec.footprint[1] / 2 - 0.4,
        0.6,
      );
      flowerCluster(
        props,
        sign * (spec.footprint[0] / 2 - 0.6),
        spec.footprint[1] / 2 - 0.6,
        0xffa8d2,
        0.8,
      );
    }
  root.add(batchModelGeometry(props));
  props.traverse((o) => {
    if (o.isMesh && !o.geometry.userData.sharedScenery) o.geometry.dispose();
  });
  root.userData = {
    id,
    moving,
    rideFrame: frame,
    duration,
    seatHeight: 0.4,
    cotton: true,
    handpainted: true,
    vehicles,
    wheel,
    curve,
  };
  root.userData.update = (time, reduced = false) => {
    const elapsed = root.userData.rideElapsed ?? time % duration,
      f = frame(elapsed, reduced);
    animated.forEach((a) => a.userData.update?.(time, reduced));
    if (id.startsWith("ride-pig-")) {
      moving.position.set(f.position[0], f.position[1] - 1.56, f.position[2]);
      moving.rotation.y = f.yaw;
    } else if (wheel) {
      const a = reduced ? Math.PI : Math.PI + (elapsed / duration) * TAU;
      wheel.rotation.z = -a;
      vehicles.forEach((c, i) => {
        const b = a + (i * TAU) / 10;
        c.position.set(Math.sin(b) * 3.75, 4.7 + Math.cos(b) * 3.75, 0.48);
      });
    } else if (id === "coaster-piglet-express") {
      vehicles.forEach((c, i) => {
        const u = ((reduced ? 0 : elapsed / duration) - i * 0.035 + 1) % 1,
          p = point(curve, u, 0.0);
        c.position.set(...p.position);
        c.rotation.y = p.yaw;
        c.rotation.z = p.roll;
      });
    } else if (id === "ride-sugar-teacups") {
      const a = reduced ? 0 : (elapsed / duration) * TAU;
      vehicles.forEach((c, i) => {
        const b = a + (i * TAU) / 4;
        c.position.set(Math.sin(b) * 2.05, 0.25, Math.cos(b) * 2.05);
        c.rotation.y = -a * 3;
      });
    } else {
      vehicles.forEach((c, i) => {
        const e = i === 1 ? elapsed : (elapsed + i * 5) % duration,
          p = frame(e, reduced);
        c.position.set(
          p.position[0] + (i - 1) * 1.2,
          p.position[1] - 0.3,
          p.position[2],
        );
        c.rotation.y = p.yaw;
      });
      if (water) water.uniforms.uTime.value = reduced ? 0 : time;
    }
  };
  root.userData.update(0, true);
  return root;
}
