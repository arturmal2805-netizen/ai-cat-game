import * as THREE from "three";
import { RoundedBoxGeometry } from "three/addons/geometries/RoundedBoxGeometry.js";
import { batchModelGeometry } from "./model-batching.js";
import { BUSINESSES } from "./business-data.js";
import { byItem } from "./game-data.js";
import { normalizeBusinessLevel } from "./business.js";
import { disposeScenery } from "./scenery-models.js";
// Additive, batched decoration: level one and all cat meshes stay untouched.
// Lanterns glow through materials, without adding expensive shadow lights.
export function decorateBusiness(model, item, requestedLevel = 1) {
  const level = normalizeBusinessLevel(requestedLevel);
  if (model.userData.businessLevel === level) return;
  const old = model.userData.businessDecor;
  if (old) {
    old.removeFromParent();
    disposeScenery(old);
  }
  model.userData.businessLevel = level;
  model.userData.businessDecor = null;
  if (level === 1) return;
  const group = new THREE.Group(),
    mats = new Map(),
    spec = byItem(item),
    business = BUSINESSES.find((b) => b.id === item),
    isVenue = !!business || ["cafe", "cat-barista"].includes(item),
    tint = business?.color || 0xc7a4df,
    w = Math.min(4.5, (spec?.footprint?.[0] || 5) / model.scale.x),
    d = Math.min(4.5, (spec?.footprint?.[1] || 5) / model.scale.z),
    x = w * 0.43,
    front = d * 0.43;
  group.name = "Business-level-" + level;
  function material(c, glow = false) {
    const key = c + ":" + glow;
    if (!mats.has(key))
      mats.set(
        key,
        glow
          ? new THREE.MeshBasicMaterial({ color: c })
          : new THREE.MeshStandardMaterial({ color: c, roughness: 0.65 }),
      );
    return mats.get(key);
  }
  function mesh(geo, c, px, py, pz, glow = false, parent = group) {
    const m = new THREE.Mesh(geo, material(c, glow));
    m.position.set(px, py, pz);
    m.castShadow = !glow;
    parent.add(m);
    return m;
  }
  const box = (c, px, py, pz, a, b, e) =>
      mesh(
        new RoundedBoxGeometry(a, b, e, 2, Math.min(a, b, e) * 0.12),
        c,
        px,
        py,
        pz,
      ),
    ball = (c, px, py, pz, r, glow = false) =>
      mesh(new THREE.SphereGeometry(r, 10, 7), c, px, py, pz, glow),
    pole = (c, px, py, pz, r, h) =>
      mesh(new THREE.CylinderGeometry(r, r, h, 8), c, px, py, pz);
  for (const side of [-1, 1]) {
    pole(0x9f7956, side * x, 0.95, front, 0.055, 1.8);
    box(0xe2b767, side * x, 1.7, front, 0.25, 0.35, 0.25);
    ball(0xffdca2, side * x, 1.73, front + 0.135, 0.09, true);
    mesh(new THREE.ConeGeometry(0.23, 0.2, 6), tint, side * x, 1.98, front);
  }
  const roofY = isVenue ? 3.3 : 1.75;
  for (let i = 0; i < 9; i++)
    ball(
      i % 2 ? 0xffe6a6 : 0xffc2dd,
      -x + (i * x) / 4,
      roofY - 0.2 - Math.sin((i / 8) * Math.PI) * 0.18,
      front,
      0.055,
      true,
    );
  if (isVenue)
    for (let i = 0; i < 8; i++)
      box(
        i % 2 ? tint : 0xffeed7,
        ((i - 3.5) * w) / 9,
        roofY,
        front - 0.1,
        w / 9,
        0.09,
        0.8,
      );
  if (level >= 3) {
    for (const side of [-1, 1]) {
      pole(0xd4a279, side * x, 0.25, front - 0.55, 0.19, 0.4);
      for (let i = 0; i < 5; i++) {
        const px = side * x + Math.sin(i * 2.4) * 0.13,
          pz = front - 0.55 + Math.cos(i * 2.4) * 0.13;
        pole(0x80ab71, px, 0.6, pz, 0.016, 0.4);
        ball(i % 2 ? 0xf5c5d9 : 0xffdda1, px, 0.82, pz, 0.09);
      }
    }
    if (isVenue) {
      pole(0xb18b63, x - 0.32, 0.5, front - 0.35, 0.05, 0.7);
      mesh(
        new THREE.CylinderGeometry(0.36, 0.36, 0.07, 18),
        0xf2d3a6,
        x - 0.32,
        0.9,
        front - 0.35,
      );
      ball(0xc2dfd9, x - 0.32, 1.04, front - 0.35, 0.1);
      box(0xf3d8aa, -0.95, 1.02, front - 0.35, 1.15, 0.06, 0.34);
      const goods = business?.goods || item.replace("business-", "");
      for (let i = 0; i < level + 1; i++) {
        const px = -1.4 + ((i % (level + 1)) * 0.9) / level,
          pz = front - 0.36;
        if (goods === "hotdog") {
          ball(0xe7bb78, px, 1.13, pz, 0.095).scale.set(1, 0.6, 1.7);
          ball(0xac6558, px, 1.18, pz, 0.047).scale.z = 2.8;
          box(0xf8d06e, px, 1.22, pz, 0.02, 0.016, 0.19);
        } else if (
          [
            "coffee",
            "cat-barista",
            "cafe",
            "boba",
            "lemonade",
            "honey",
          ].includes(goods)
        ) {
          pole(i % 2 ? 0xffd6df : 0xc3e8df, px, 1.15, pz, 0.07, 0.22);
          pole(0xecc989, px + 0.02, 1.33, pz, 0.008, 0.2);
        } else if (goods === "pizza") {
          pole(0xe4b872, px, 1.11, pz, 0.1, 0.045);
          ball(0xb96559, px + 0.025, 1.14, pz, 0.025);
          ball(0x82a564, px - 0.035, 1.14, pz + 0.03, 0.02);
        } else if (goods === "artist") {
          box(0xa88b65, px, 1.17, pz, 0.018, 0.32, 0.02);
          box(0xffe8bf, px, 1.29, pz + 0.015, 0.13, 0.16, 0.02);
          ball(tint, px, 1.3, pz + 0.034, 0.04).scale.z = 0.2;
        } else if (goods === "fish")
          ball(0xa9e1e5, px, 1.14, pz, 0.085).scale.set(0.7, 0.6, 1.5);
        else if (["flowers", "business-florist", "florist"].includes(goods)) {
          pole(0x7da374, px, 1.22, pz, 0.01, 0.3);
          ball(0xe7a6cc, px, 1.42, pz, 0.1);
        } else {
          ball(
            [0xf7c6dc, 0xc4dfac, 0xf7daa5, 0xc5b5ed][i % 4],
            px,
            1.16,
            pz,
            0.1,
          );
          ball(0xffedd4, px, 1.23, pz + 0.03, 0.038);
        }
      }
    }
  }
  if (level >= 4) {
    const shape = new THREE.Shape();
    for (let i = 0; i < 10; i++) {
      const a = (i * Math.PI) / 5 + Math.PI / 2,
        r = i % 2 ? 0.1 : 0.22;
      const px = Math.cos(a) * r,
        py = Math.sin(a) * r;
      if (i) shape.lineTo(px, py);
      else shape.moveTo(px, py);
    }
    shape.closePath();
    box(0xe8bf6d, 0, roofY + 0.28, front - 0.08, 1.05, 0.54, 0.1);
    for (let i = 0; i < 3; i++)
      mesh(
        new THREE.ExtrudeGeometry(shape, { depth: 0.035, bevelEnabled: false }),
        0xfff0b2,
        (i - 1) * 0.3,
        roofY + 0.28,
        front - 0.01,
        true,
      ).scale.setScalar(0.6);
    for (const side of [-1, 1]) {
      pole(0xddb675, side * x, roofY + 0.1, front, 0.025, 0.9);
      const flag = mesh(
        new THREE.ConeGeometry(0.18, 0.36, 3),
        tint,
        side * x + 0.17 * side,
        roofY + 0.43,
        front,
      );
      flag.rotation.z = (-side * Math.PI) / 2;
    }
  }
  if (level >= 5) {
    const arch = mesh(
      new THREE.TorusGeometry(x, 0.06, 6, 32, Math.PI),
      0xd4b66e,
      0,
      0.4,
      front,
    );
    arch.rotation.z = 0;
    for (let i = 0; i < 11; i++) {
      const a = (i / 10) * Math.PI,
        px = Math.cos(a) * x,
        py = 0.4 + Math.sin(a) * x;
      ball(0x8ab47d, px, py, front, 0.14);
      ball(i % 2 ? 0xffc2d9 : 0xf6dc9e, px, py + 0.06, front + 0.12, 0.1);
    }
    for (let i = 0; i < 5; i++) {
      pole(
        0xf3d18b,
        (i - 2) * 0.14,
        roofY + 0.82 + (i === 2 ? 0.15 : 0),
        -0.3,
        0.035,
        0.35,
      );
      ball(
        0xffe5b0,
        (i - 2) * 0.14,
        roofY + 1.02 + (i === 2 ? 0.15 : 0),
        -0.3,
        0.06,
        true,
      );
    }
    box(0xdab064, 0, roofY + 0.62, -0.3, 0.75, 0.13, 0.4);
  }
  const batched = batchModelGeometry(group, { combineColors: true });
  batched.name = group.name;
  model.add(batched);
  model.userData.businessDecor = batched;
}
