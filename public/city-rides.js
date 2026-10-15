import * as THREE from "three";
import { CITY_RIDES } from "./city-ride-data.js";
import {
  shape,
  line,
  torus,
  lantern,
  flowerCluster,
} from "./fantasy-scenery.js";
import { batchModelGeometry } from "./model-batching.js";
import { createLagoon, waterMaterial } from "./lagoon.js";

const gold = 0xf5d69a,
  cream = 0xffeed3;
const palette = [0xef94b8, 0x84d5d1, 0xffca77, 0xa8adef, 0x99cc9a, 0xe2a6e9];
function rail(parent, curve, color, radius = 0.07) {
  const mesh = new THREE.Mesh(
    new THREE.TubeGeometry(curve, 160, radius, 8, false),
    new THREE.MeshStandardMaterial({ color, roughness: 0.3, metalness: 0.15 }),
  );
  parent.add(mesh);
  return mesh;
}
function cabin(parent, color, open = false) {
  const g = new THREE.Group();
  parent.add(g);
  shape(g, "cube", color, 0, 0.1, 0, 1.0, 0.35, 1.25);
  shape(g, "cube", cream, 0, 0.31, 0, 0.84, 0.08, 0.8);
  for (const x of [-0.46, 0.46]) {
    line(g, [x, 0.25, -0.48], [x, 1.22, -0.48], gold, 0.028);
    line(g, [x, 0.25, 0.48], [x, 1.22, 0.48], gold, 0.028);
  }
  if (!open) shape(g, "dome", color, 0, 1.23, 0, 0.62, 0.28, 0.74);
  lantern(g, 0.53, 0.45, 0.1, 0.25);
  return g;
}
function tower(parent, x, z, h, color, pagoda = false) {
  const g = new THREE.Group();
  g.position.set(x, 0, z);
  parent.add(g);
  shape(g, "cube", cream, 0, h / 2, 0, 0.85, h, 0.85);
  for (let i = 0; i < 4; i++) {
    shape(
      g,
      "cube",
      0xffd681,
      0,
      0.5 + (i * h) / 5,
      0.44,
      0.32,
      0.35,
      0.04,
      true,
    );
    if (pagoda)
      shape(
        g,
        "cone",
        color,
        0,
        0.85 + (i * h) / 4,
        0,
        0.91 - i * 0.1,
        0.55,
        0.8 - i * 0.08,
      );
  }
  shape(g, "cone", color, 0, h + 0.4, 0, 0.76, 1, 0.76);
  lantern(g, 0.6, 0.1, 0.3, 0.55);
}
function routePoint(curve, t, seat = 0.3) {
  const p = curve.getPoint(t),
    tangent = curve.getTangent(t);
  return {
    position: [p.x, p.y + seat, p.z],
    yaw: Math.atan2(tangent.x, tangent.z),
    phase: "ride",
    paw: 0.22,
  };
}
export function cityRide(id) {
  const spec = CITY_RIDES.find((r) => r.id === id);
  if (!spec) return null;
  const g = new THREE.Group(),
    props = new THREE.Group(),
    moving = new THREE.Group();
  g.add(moving);
  let duration = 16,
    frame,
    curve,
    lake = null,
    wheel = null,
    channelWater = null,
    cabins = [];
  if (id === "ride-paris-wheel") {
    duration = 20;
    for (const side of [-1, 1]) {
      line(props, [side * 2.1, 0, 0.3], [0, 3.4, 0], gold, 0.15);
      line(props, [side * 1.9, 0, -0.8], [0, 3.4, 0], spec.color, 0.13);
    }
    wheel = new THREE.Group();
    wheel.position.y = 3.4;
    g.add(wheel);
    torus(wheel, gold, 2.4, 0.095, 0, 0, 0);
    torus(wheel, spec.color, 2.18, 0.04, 0, 0, 0);
    for (let i = 0; i < 10; i++) {
      const a = (i * Math.PI) / 5;
      line(
        wheel,
        [0, 0, 0],
        [Math.sin(a) * 2.4, Math.cos(a) * 2.4, 0],
        gold,
        0.03,
      );
      const c = cabin(g, palette[i % palette.length]);
      cabins.push(c);
    }
    tower(props, -2.6, -1.2, 3.8, spec.accent);
    frame = (t, reduced) => {
      const a = reduced ? Math.PI : (t / duration) * Math.PI * 2 + Math.PI;
      return {
        position: [Math.sin(a) * 2.4, 3.7 + Math.cos(a) * 2.4, 0.55],
        yaw: 0,
        phase: "ride",
        paw: 0.28,
      };
    };
  } else if (id === "ride-venice-gondola") {
    duration = 18;
    lake = createLagoon({ rx: 2.9, rz: 2.5, fishCount: 12, seed: 84 });
    g.add(lake);
    for (let i = 0; i < 18; i++) {
      const x = -2.7 + i * 0.3,
        y = 0.65 + Math.sin((i / 17) * Math.PI) * 0.5;
      shape(props, "cube", gold, x, y, -1.8, 0.32, 0.12, 0.85);
      if (i % 3 === 0)
        line(props, [x, y, -1.4], [x, y + 0.48, -1.4], spec.accent, 0.04);
    }
    tower(props, -2.5, 2.1, 2.4, spec.accent);
    shape(moving, "sphere", 0x715b80, 0, 0, 0, 0.65, 0.22, 1.4);
    shape(moving, "cube", cream, 0, 0.22, 0, 0.85, 0.12, 0.8);
    for (const z of [-1.2, 1.2])
      shape(moving, "cone", spec.color, 0, 0.25, z, 0.13, 0.5, 0.2);
    lantern(moving, 0, 0.25, -0.9, 0.3);
    frame = (t, reduced) => {
      const a = reduced ? 0 : (t / duration) * Math.PI * 2;
      return {
        position: [Math.sin(a) * 1.55, 0.42, Math.cos(a) * 1.4],
        yaw: a + Math.PI / 2,
        phase: "float",
        paw: 0.2,
      };
    };
  } else if (
    ["ride-tokyo-train", "ride-cloud-tram", "coaster-candy-city"].includes(id)
  ) {
    const cloud = id === "ride-cloud-tram",
      candy = id === "coaster-candy-city";
    duration = cloud ? 20 : candy ? 16 : 18;
    const pts = [];
    for (let i = 0; i < 32; i++) {
      const a = (i * Math.PI) / 16;
      pts.push(
        new THREE.Vector3(
          Math.sin(a) * (candy ? 3.5 : 2.8),
          cloud
            ? 1.1 + Math.sin(a / 2) ** 2 * 4.2
            : 0.35 +
              (candy ? Math.sin(a) ** 2 * 3.4 : Math.sin(a * 2) ** 2 * 0.45),
          Math.cos(a) * 2.6,
        ),
      );
    }
    curve = new THREE.CatmullRomCurve3(pts, true);
    rail(props, curve, spec.color, 0.11);
    for (let i = 0; i < 32; i++) {
      const p = curve.getPoint(i / 32),
        tangent = curve.getTangent(i / 32);
      const tie = shape(
        props,
        "cube",
        palette[i % 6],
        p.x,
        p.y - 0.08,
        p.z,
        0.6,
        0.09,
        0.13,
      );
      tie.rotation.y = Math.atan2(tangent.x, tangent.z);
      if (i % 4 === 0)
        line(props, [p.x, 0, p.z], [p.x, p.y - 0.1, p.z], gold, 0.075);
    }
    cabin(moving, spec.color, candy);
    if (id === "ride-tokyo-train") {
      shape(moving, "pole", spec.accent, 0, 0.6, 0.75, 0.42, 0.8, 0.42);
      tower(props, -2.6, -2, 3.4, spec.color, true);
      for (const side of [-1, 1]) {
        line(props, [side * 2.6, 0, 1.4], [side * 2.6, 2.4, 1.4], gold, 0.11);
        for (let i = 0; i < 12; i++)
          shape(
            props,
            "sphere",
            i % 2 ? 0xf4bad5 : 0xe894bd,
            side * 2.6 + Math.sin(i * 2.4) * 0.6,
            2.1 + (i % 3) * 0.2,
            1.4 + Math.cos(i * 2.4) * 0.5,
            0.22,
            0.25,
            0.2,
          );
      }
    } else if (cloud) {
      for (const side of [-1, 1]) {
        tower(props, side * 2.8, -2.1, 3.2, spec.accent);
        for (let i = 0; i < 5; i++)
          shape(
            props,
            "sphere",
            cream,
            side * 2.3 + i * 0.2,
            2.3,
            -2.2,
            0.45,
            0.22,
            0.35,
          );
      }
    } else {
      for (const side of [-1, 1]) {
        tower(props, side * 3.0, -2.5, 2.3, spec.accent);
        for (let i = 0; i < 8; i++) {
          shape(
            props,
            "pole",
            i % 2 ? cream : spec.color,
            side * 1.4,
            0.3 + i * 0.3,
            0,
            0.12,
            0.32,
            0.12,
          );
        }
        torus(props, spec.accent, 1.0, 0.17, side * 1.4, 2.4, 0, Math.PI);
      }
    }
    frame = (t, reduced) =>
      routePoint(curve, reduced ? 0 : Math.min(1, t / duration), 0.32);
  } else if (id === "ride-star-carousel") {
    duration = 16;
    shape(props, "pole", gold, 0, 1.8, 0, 0.13, 3.6, 0.13);
    shape(props, "dome", spec.color, 0, 3.6, 0, 2.6, 0.8, 2.6);
    torus(props, gold, 2.6, 0.08, 0, 3.6, 0).rotation.x = Math.PI / 2;
    for (let i = 0; i < 8; i++) {
      const a = (i * Math.PI) / 4,
        seat = new THREE.Group();
      moving.add(seat);
      const moon = torus(
        seat,
        palette[i % 6],
        0.48,
        0.13,
        Math.sin(a) * 2,
        1.1,
        Math.cos(a) * 2,
        Math.PI * 1.5,
      );
      moon.rotation.y = a;
      line(
        seat,
        [Math.sin(a) * 2, 1.1, Math.cos(a) * 2],
        [Math.sin(a) * 2, 3.6, Math.cos(a) * 2],
        gold,
        0.022,
      );
    }
    frame = (t, reduced) => {
      const a = reduced ? 0 : (t / duration) * Math.PI * 2;
      return {
        position: [Math.sin(a) * 2, 1.2, Math.cos(a) * 2],
        yaw: a,
        phase: "ride",
        paw: 0.3,
      };
    };
  } else if (id === "ride-crystal-slide") {
    duration = 18;
    tower(props, 0, 0, 5.9, spec.accent);
    const pts = [];
    for (let i = 0; i <= 80; i++) {
      const a = (i / 80) * Math.PI * 6;
      pts.push(
        new THREE.Vector3(
          Math.sin(a) * 2.7,
          6.5 - (i / 80) * 6,
          Math.cos(a) * 2.7,
        ),
      );
    }
    curve = new THREE.CatmullRomCurve3(pts);
    rail(props, curve, spec.color, 0.28);
    channelWater = new THREE.Mesh(
      new THREE.TubeGeometry(curve, 160, 0.13, 8, false),
      waterMaterial(0x81daee),
    );
    channelWater.position.y = 0.22;
    props.add(channelWater);
    torus(moving, spec.accent, 0.42, 0.13, 0, 0.19, 0).rotation.x = Math.PI / 2;
    frame = (t, reduced) => {
      const p = reduced ? 0 : Math.min(1, Math.max(0, t / duration));
      if (p < 0.2)
        return {
          position: [0, 0.68 + (p / 0.2) * 6, 2.7],
          yaw: 0,
          phase: "lift",
          paw: 0.2,
        };
      if (p < 0.85) return routePoint(curve, (p - 0.2) / 0.65, 0.18);
      return { position: [0, 0.68, 2.7], yaw: 0, phase: "ride", paw: 0.35 };
    };
  } else {
    duration = 18;
    cabin(moving, spec.accent, true);
    shape(moving, "sphere", spec.color, 0, 2.8, 0, 1.35, 1.65, 1.35);
    for (let i = 0; i < 12; i++) {
      const a = (i * Math.PI) / 6;
      line(
        moving,
        [Math.sin(a) * 0.43, 0.5, Math.cos(a) * 0.43],
        [Math.sin(a) * 1.0, 1.7, Math.cos(a) * 1.0],
        gold,
        0.015,
      );
      shape(
        moving,
        "sphere",
        palette[i % 6],
        Math.sin(a) * 1.27,
        2.85,
        Math.cos(a) * 1.27,
        0.16,
        1.02,
        0.16,
      );
    }
    frame = (t, reduced) => {
      const a = reduced ? 0 : (t / duration) * Math.PI * 2;
      return {
        position: [
          Math.sin(a) * 1.7,
          0.32 + (reduced ? 0 : Math.sin(a / 2) ** 2 * 4),
          Math.cos(a) * 1.7,
        ],
        yaw: a,
        phase: "float",
        paw: 0.2,
      };
    };
  }
  const [w, d] = spec.footprint;
  for (const side of [-1, 1]) {
    flowerCluster(props, side * (w / 2 - 0.4), d / 2 - 0.5, spec.color, 0.65);
    lantern(props, side * (w / 2 - 0.3), 0, d / 2 - 0.3, 0.5);
  }
  g.add(batchModelGeometry(props));
  g.userData = {
    id,
    handpainted: true,
    moving,
    rideFrame: frame,
    seatHeight: 0.32,
    duration,
    curve,
    city: true,
  };
  g.userData.update = (time, reduced = false) => {
    const elapsed = g.userData.rideElapsed ?? time % duration,
      f = frame(elapsed, reduced);
    lake?.userData.update(time, reduced);
    if (channelWater)
      channelWater.material.uniforms.uTime.value = reduced ? 0 : time;
    if (wheel) {
      const a = reduced
        ? Math.PI
        : (elapsed / duration) * Math.PI * 2 + Math.PI;
      wheel.rotation.z = -a;
      cabins.forEach((c, i) => {
        const b = a + (i * Math.PI) / 5;
        c.position.set(Math.sin(b) * 2.4, 3.4 + Math.cos(b) * 2.4, 0.55);
      });
      moving.position.set(...f.position);
    } else if (id === "ride-star-carousel")
      moving.rotation.y = reduced ? 0 : (elapsed / duration) * Math.PI * 2;
    else {
      moving.position.set(f.position[0], f.position[1] - 0.32, f.position[2]);
      moving.rotation.y = f.yaw;
    }
  };
  g.userData.update(0, true);
  return g;
}
