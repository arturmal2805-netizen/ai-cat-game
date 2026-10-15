import { RoundedBoxGeometry } from "three/addons/geometries/RoundedBoxGeometry.js";
import * as THREE from "three";
import { createCat, animateCat, reactCat } from "./cat-model.js";
import { BUSINESSES } from "./business-data.js";
import { batchModelGeometry } from "./model-batching.js";

export function catVenue(id) {
  const business = BUSINESSES.find((b) => b.id === id);
  if (!business && id !== "adoption-center") return null;
  const group = new THREE.Group(),
    materials = new Map();
  if (business?.footprint)
    group.scale.setScalar(Math.min(...business.footprint) / 5);
  const tint = business?.color || 0x96c5ba;
  const stall = business?.style === "stall";
  function mat(color, glow = false) {
    const key = color + ":" + glow;
    if (!materials.has(key))
      materials.set(
        key,
        new THREE.MeshStandardMaterial({
          color,
          roughness: 0.8,
          emissive: glow ? color : 0,
          emissiveIntensity: glow ? 0.35 : 0,
        }),
      );
    return materials.get(key);
  }
  function mesh(geometry, color, x, y, z, parent = group, glow = false) {
    const obj = new THREE.Mesh(geometry, mat(color, glow));
    obj.position.set(x, y, z);
    obj.castShadow = true;
    parent.add(obj);
    return obj;
  }
  const box = (c, x, y, z, w, h, d, parent) =>
      mesh(
        new RoundedBoxGeometry(w, h, d, 2, Math.min(w, h, d) * 0.1),
        c,
        x,
        y,
        z,
        parent,
      ),
    ball = (c, x, y, z, r, parent) =>
      mesh(new THREE.SphereGeometry(r, 12, 8), c, x, y, z, parent);
  const floor = box(0xc9b598, 0, 0.08, 0, 4.5, 0.16, 4.5);
  const house = box(0xf2e1c0, 0, 1.1, -0.45, 3.7, 2.15, 2.8);
  if (stall) {
    house.scale.y = 0.35;
    house.position.y = 0.45;
    for (const x of [-1.7, 1.7])
      for (const z of [-1.6, 0.9]) box(0xb49b7c, x, 1.25, z, 0.1, 2.5, 0.1);
  }
  const roofShape = new THREE.Shape();
  roofShape.moveTo(-2.12, 0);
  roofShape.quadraticCurveTo(-1.5, 0.7, 0, 1.15);
  roofShape.quadraticCurveTo(1.5, 0.7, 2.12, 0);
  roofShape.lineTo(-2.12, 0);
  mesh(
    new THREE.ExtrudeGeometry(roofShape, {
      depth: 3.15,
      bevelEnabled: true,
      bevelSize: 0.08,
      bevelThickness: 0.08,
      bevelSegments: 2,
      steps: 1,
    }),
    tint,
    0,
    2.15,
    -2.1,
  );
  for (let row = 0; row < 3; row++)
    for (let tile = 0; tile < 10; tile++) {
      const x = -1.9 + tile * 0.42,
        h = 0.82 * Math.max(0, 1 - Math.abs(x) / 2.2);
      box(
        tile % 2 ? 0xffefd7 : tint,
        x,
        2.4 + h,
        -1.8 + row * 1.1,
        0.37,
        0.085,
        1.02,
      );
    }
  if (!stall)
    for (const side of [-1, 1]) {
      box(0xb49b7c, side * 1.2, 1.3, 0.98, 0.75, 0.92, 0.11);
      box(0xffd592, side * 1.2, 1.3, 1.05, 0.57, 0.7, 0.03);
      box(0xb49b7c, side * 1.2, 1.3, 1.085, 0.06, 0.7, 0.05);
      box(0xb49b7c, side * 1.2, 1.3, 1.085, 0.6, 0.06, 0.05);
      box(tint, side * 1.2, 0.76, 1.15, 0.9, 0.18, 0.3);
      for (let flower = 0; flower < 5; flower++) {
        const x = side * 1.2 + (flower - 2) * 0.15;
        ball([0xe6b1c6, 0xebd58e, 0xb5b0dd][flower % 3], x, 0.93, 1.2, 0.105);
      }
    }
  const arch = new THREE.Shape();
  arch.moveTo(-0.45, 0);
  arch.lineTo(-0.45, 1);
  arch.absarc(0, 1, 0.45, Math.PI, 0, true);
  arch.lineTo(0.45, 0);
  const door = mesh(
    new THREE.ExtrudeGeometry(arch, {
      depth: 0.12,
      bevelEnabled: true,
      bevelSize: 0.025,
      bevelThickness: 0.02,
      bevelSegments: 2,
    }),
    0x9f79a8,
    0,
    0.19,
    1.03,
  );
  door.visible = !stall;
  if (!stall) ball(0xe9c56f, 0.28, 0.77, 1.21, 0.055);
  box(0xe3cfa9, 0, 0.2, 1.5, 1.25, 0.22, 0.65);
  const plaque = new THREE.Group();
  plaque.position.set(0, 2.36, 1.25);
  group.add(plaque);
  box(0xf3e4ca, 0, 0, 0, 1.1, 0.55, 0.1, plaque);
  ball(0xa58fb6, 0, -0.045, 0.075, 0.12, plaque).scale.set(1.15, 0.8, 0.3);
  for (const [x, y] of [
    [-0.2, 0.08],
    [-0.07, 0.16],
    [0.07, 0.16],
    [0.2, 0.08],
  ])
    ball(0xa58fb6, x, y, 0.075, 0.065, plaque).scale.z = 0.4;
  const staff = createCat("happy", {
    detail: "npc",
    breed:
      id === "adoption-center"
        ? "british"
        : stall
          ? "scottish"
          : id === "business-boba"
            ? "devon"
            : "tabby",
    color: id === "adoption-center" ? 0x81919a : 0xc9a074,
    eyeColor: 0xb8c577,
  });
  staff.scale.setScalar(0.43);
  staff.position.set(0.55, 0.17, 1.78);
  staff.rotation.y = 0.15;
  group.add(staff);
  const apron = box(tint, 0, 0.85, 0.56, 0.5, 0.63, 0.04, staff);
  if (id === "business-hotdog") {
    const paw = staff.getObjectByName("Leg-1_1");
    mesh(
      new THREE.CylinderGeometry(0.025, 0.025, 0.42, 8),
      0xa5a5aa,
      0,
      -0.22,
      0.24,
      paw,
    ).rotation.x = -0.5;
    box(0xc7c9cd, 0, -0.43, 0.35, 0.16, 0.03, 0.14, paw);
  }
  apron.userData.preservePalette = true;
  const counter = new THREE.Group();
  counter.position.set(-1, 0, 1.62);
  group.add(counter);
  box(0xb68d6d, 0, 0.45, 0, 1.38, 0.85, 0.75, counter);
  box(0xf0dcbc, 0, 0.91, 0, 1.5, 0.1, 0.9, counter);
  if (business?.goods) {
    const goods = business.goods;
    if (goods === "produce") {
      for (let i = 0; i < 4; i++) {
        const x = -0.45 + (i % 2) * 0.65,
          z = -0.13 + Math.floor(i / 2) * 0.38;
        box(0xb9956e, x, 1.03, z, 0.55, 0.16, 0.3, counter);
        for (let k = 0; k < 4; k++) {
          ball(
            i % 2 ? 0xf2a564 : 0x9abc72,
            x - 0.17 + k * 0.11,
            1.15,
            z,
            0.075,
            counter,
          );
          box(
            0x8db774,
            x - 0.17 + k * 0.11,
            1.24,
            z,
            0.025,
            0.12,
            0.025,
            counter,
          );
        }
      }
    } else if (goods === "fish") {
      box(0x99ced9, 0, 1.03, 0, 1.2, 0.15, 0.62, counter);
      for (let i = 0; i < 5; i++) {
        const x = -0.43 + i * 0.21;
        ball(0xcde6e9, x, 1.15, 0, 0.11, counter).scale.set(0.6, 0.55, 1.5);
        mesh(
          new THREE.ConeGeometry(0.09, 0.16, 3),
          0x81b5cb,
          x,
          1.15,
          -0.22,
          counter,
        ).rotation.x = Math.PI / 2;
        ball(0x344c62, x + 0.04, 1.19, 0.13, 0.013, counter);
      }
    } else if (goods === "pizza") {
      box(0xbf8e7b, -0.3, 1.29, -0.12, 0.65, 0.62, 0.53, counter);
      box(0x7b6172, -0.3, 1.24, 0.16, 0.46, 0.27, 0.035, counter);
      mesh(
        new THREE.CylinderGeometry(0.3, 0.3, 0.06, 24),
        0xeab879,
        0.32,
        1.04,
        0.16,
        counter,
      );
      for (let i = 0; i < 9; i++)
        ball(
          i % 2 ? 0xc67868 : 0x94ba73,
          0.32 + Math.sin(i * 2.4) * 0.22,
          1.09,
          0.16 + Math.cos(i * 2.4) * 0.22,
          0.04,
          counter,
        );
    } else if (["lemonade", "boba"].includes(goods)) {
      for (let i = 0; i < 3; i++) {
        const x = -0.37 + i * 0.36;
        mesh(
          new THREE.CylinderGeometry(0.12, 0.09, 0.35, 16),
          goods === "lemonade" ? 0xf1d581 : 0xdbb7d6,
          x,
          1.2,
          0,
          counter,
        );
        box(
          paletteColor(i),
          x + 0.02,
          1.46,
          0,
          0.025,
          0.28,
          0.025,
          counter,
        ).rotation.z = -0.15;
        for (let k = 0; k < 5; k++)
          ball(
            goods === "lemonade" ? 0xffebb1 : 0x6c536a,
            x + Math.sin(k * 2.4) * 0.065,
            1.07 + (k % 2) * 0.05,
            Math.cos(k * 2.4) * 0.065,
            0.026,
            counter,
          );
      }
      if (goods === "lemonade")
        for (let i = 0; i < 3; i++)
          ball(
            0xf3d269,
            0.48,
            1.06 + i * 0.06,
            0.28 - i * 0.1,
            0.085,
            counter,
          ).scale.z = 1.25;
    } else if (goods === "honey") {
      for (let i = 0; i < 3; i++) {
        const x = -0.38 + i * 0.35;
        mesh(
          new THREE.CylinderGeometry(0.13, 0.13, 0.28, 16),
          0xdab263,
          x,
          1.16,
          0.06,
          counter,
        );
        mesh(
          new THREE.CylinderGeometry(0.145, 0.145, 0.04, 16),
          0xf5df99,
          x,
          1.32,
          0.06,
          counter,
        );
      }
      ball(0xf5d693, 0, 1.55, -0.12, 0.22, counter);
      box(0xa18a6c, 0, 1.79, -0.12, 0.035, 0.16, 0.035, counter);
    } else if (goods === "candy") {
      for (let i = 0; i < 7; i++) {
        const x = -0.5 + i * 0.16,
          z = i % 2 ? -0.15 : 0.18;
        box(0xffe8cf, x, 1.19, z, 0.028, 0.4, 0.028, counter);
        ball(paletteColor(i), x, 1.44, z, 0.13, counter).scale.z = 0.55;
        ball(0xffe8cf, x + 0.03, 1.45, z + 0.07, 0.047, counter);
      }
    } else if (goods === "toys") {
      for (let i = 0; i < 3; i++) {
        const x = -0.38 + i * 0.36;
        ball(paletteColor(i), x, 1.11, 0, 0.16, counter);
        const ring = mesh(
          new THREE.TorusGeometry(0.16, 0.014, 6, 20),
          0xffe9b9,
          x,
          1.11,
          0,
          counter,
        );
        ring.rotation.y = i * 0.7;
      }
      box(0x948e9f, 0, 1.08, 0.3, 0.27, 0.14, 0.17, counter);
      for (const x of [-0.08, 0.08])
        ball(0xe9b7c8, x, 1.19, 0.25, 0.04, counter);
    }
  } else if (id === "business-hotdog") {
    box(0x647277, 0, 1.02, 0, 0.95, 0.1, 0.6, counter);
    for (let i = 0; i < 3; i++) {
      const bun = ball(0xe6bb71, (i - 1) * 0.29, 1.14, 0, 0.13, counter);
      bun.scale.set(1, 0.65, 1.7);
      const sausage = ball(0xab674f, (i - 1) * 0.29, 1.19, 0, 0.065, counter);
      sausage.scale.z = 2.9;
    }
  } else if (id === "business-artist") {
    box(0xb19a78, 0, 1.42, 0, 0.045, 1.02, 0.05, counter);
    box(0xf5e9cf, 0, 1.7, 0.05, 0.75, 0.72, 0.08, counter);
    box(0xa4cdda, 0, 1.7, 0.1, 0.64, 0.6, 0.02, counter);
    ball(0xebd392, 0.18, 1.84, 0.13, 0.08, counter);
    for (let i = 0; i < 5; i++)
      ball(
        [0xdb98bf, 0x99bda6, 0xe9c483][i % 3],
        -0.4 + i * 0.2,
        1.06,
        0.25,
        0.055,
        counter,
      );
  } else if (id === "business-gelato") {
    for (let i = 0; i < 3; i++) {
      mesh(
        new THREE.ConeGeometry(0.1, 0.3, 12),
        0xd9ad75,
        (i - 1) * 0.32,
        1.14,
        0,
        counter,
      ).rotation.z = Math.PI;
      ball(
        [0xf2c2d9, 0xc1d9ad, 0xe8d6b4][i],
        (i - 1) * 0.32,
        1.35,
        0,
        0.14,
        counter,
      );
    }
  } else if (id === "business-bakery") {
    box(0xbb937c, 0, 1.25, -0.16, 0.65, 0.55, 0.48, counter);
    box(0x6b5c67, 0, 1.2, 0.105, 0.42, 0.25, 0.04, counter);
    for (let i = 0; i < 3; i++)
      ball(0xe0b772, (i - 1) * 0.32, 1.08, 0.2, 0.12, counter).scale.set(
        1.1,
        0.7,
        1,
      );
  } else if (id === "business-florist") {
    for (let i = 0; i < 9; i++) {
      const x = Math.sin(i * 2.4) * 0.42,
        z = Math.cos(i * 2.4) * 0.22;
      box(0x82a478, x, 1.1, z, 0.025, 0.42, 0.025, counter);
      ball([0xdbb8de, 0xefc786, 0xeaafc6][i % 3], x, 1.36, z, 0.1, counter);
    }
  } else {
    box(
      id === "business-coffee" ? 0x768e96 : 0xdeb2c4,
      -0.23,
      1.16,
      0,
      0.52,
      0.48,
      0.43,
      counter,
    );
    for (let i = 0; i < 3; i++)
      mesh(
        new THREE.CylinderGeometry(0.1, 0.07, 0.18, 12),
        0xf8eee1,
        0.14 + i * 0.19,
        1.08,
        0,
        counter,
      );
  }
  const guests = [];
  if (business)
    for (let i = 0; i < 2; i++) {
      const guest = createCat("happy", {
        detail: "npc",
        breed: i ? "tuxedo" : "munchkin",
        color: i ? 0x4b5660 : 0xe2c19d,
      });
      guest.scale.setScalar(0.36);
      group.add(guest);
      guests.push(guest);
    }
  const steam = new THREE.Group();
  steam.position.set(-1, 1.7, 1.6);
  group.add(steam);
  for (let i = 0; i < 4; i++) {
    const puff = ball(0xe5e9e7, 0, i * 0.15, 0, 0.07, steam);
    puff.material = new THREE.MeshBasicMaterial({
      color: 0xe8edf0,
      transparent: true,
      opacity: 0.35,
      depthWrite: false,
    });
  }
  group.userData = {
    id,
    handpainted: true,
    business: !!business,
    barista:
      business &&
      !["produce", "fish", "toys"].includes(business.goods) &&
      !["business-artist", "business-florist"].includes(id)
        ? staff
        : null,
    moving: staff,
    seatHeight: 0.2,
    duration: 8,
    staff,
    guests,
  };
  group.userData.update = (time, reduced = false) => {
    animateCat(staff, time, false, reduced);
    reactCat(
      staff,
      {
        paw: reduced ? 0 : Math.max(0, Math.sin(time * 2)) * 0.32,
        headPitch: 0.14,
      },
      reduced,
    );
    steam.visible = id !== "adoption-center" && !reduced;
    steam.children.forEach((p, i) => {
      p.position.y = (time * 0.26 + i * 0.17) % 0.7;
      p.scale.setScalar(1 + p.position.y);
    });
    guests.forEach((guest, i) => {
      const t = (time * 0.08 + i * 0.5) % 1;
      guest.position.set(1.6 + i * 0.08, 0.17, -1.6 + 3.6 * t);
      guest.rotation.y = t < 0.75 ? 0 : -Math.PI / 2;
      animateCat(guest, time + i, t < 0.75, reduced);
    });
  };
  group.userData.update(0, true);
  const staticPart = new THREE.Group();
  for (const child of [...group.children])
    if (![staff, steam, ...guests].includes(child)) staticPart.add(child);
  group.add(batchModelGeometry(staticPart));
  return group;
}
const paletteColor = (i) => [0xeb9cbd, 0x92cec9, 0xecc974, 0xbda5dc][i % 4];
