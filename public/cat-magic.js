import * as THREE from "three";
import { mergeGeometries } from "three/addons/utils/BufferGeometryUtils.js";

// Small ornaments follow the existing bones. Vertex-colour batching limits
// each decorated pet to at most five extra draws, with no lights, textures,
// particles, reflection passes, timers or per-frame allocations.
export function attachCatMagic(cat, appearance) {
  if (!appearance.magic) return;
  const d = cat.userData,
    kind = appearance.magic,
    tint = appearance.magicColor || 0xf3d1e5,
    material = new THREE.MeshStandardMaterial({
      color: 0xffffff,
      vertexColors: true,
      roughness: 0.38,
      metalness: 0.15,
      emissive: tint,
      emissiveIntensity: 0.15,
    }),
    head = new THREE.Group(),
    back = new THREE.Group(),
    tail = new THREE.Group();
  head.name = "Magic crown · " + kind;
  back.name = "Magic wings · " + kind;
  tail.name = "Magic tail · " + kind;
  d.head.add(head);
  cat.add(back);
  d.tailTip.add(tail);
  back.position.set(0, 1.02, -0.25);
  const parts = new Map(),
    add = (
      parent,
      geo,
      color,
      x = 0,
      y = 0,
      z = 0,
      sx = 1,
      sy = sx,
      sz = sx,
      turn = 0,
    ) => {
      const g = geo;
      if (!g.index)
        g.setIndex(
          Array.from({ length: g.attributes.position.count }, (_, i) => i),
        );
      g.scale(sx, sy, sz);
      g.rotateZ(turn);
      g.translate(x, y, z);
      const c = new THREE.Color(color),
        p = g.attributes.position,
        values = new Float32Array(p.count * 3);
      for (let i = 0; i < p.count; i++) {
        values[i * 3] = c.r;
        values[i * 3 + 1] = c.g;
        values[i * 3 + 2] = c.b;
      }
      g.setAttribute("color", new THREE.Float32BufferAttribute(values, 3));
      const bucket = parts.get(parent) || [];
      bucket.push(g);
      parts.set(parent, bucket);
    },
    ball = (p, c, x, y, z, sx, sy = sx, sz = sx, turn = 0) =>
      add(p, new THREE.SphereGeometry(1, 12, 8), c, x, y, z, sx, sy, sz, turn),
    star = (parent, c, x, y, z, r = 0.12) => {
      const s = new THREE.Shape();
      for (let i = 0; i < 10; i++) {
        const a = (i * Math.PI) / 5,
          rad = r * (i % 2 ? 0.46 : 1),
          px = Math.sin(a) * rad,
          py = Math.cos(a) * rad;
        i ? s.lineTo(px, py) : s.moveTo(px, py);
      }
      s.closePath();
      add(
        parent,
        new THREE.ExtrudeGeometry(s, {
          depth: 0.035,
          bevelEnabled: true,
          bevelSize: 0.012,
          bevelThickness: 0.012,
          bevelSegments: 1,
          steps: 1,
        }),
        c,
        x,
        y,
        z,
      );
    },
    petal = (p, c, x, y, z, s = 1, a = 0) =>
      ball(p, c, x, y, z, 0.075 * s, 0.19 * s, 0.045 * s, a),
    flower = (p, x, y, z, s = 1) => {
      for (let i = 0; i < 5; i++) {
        const a = (i * Math.PI * 2) / 5;
        petal(
          p,
          [0xf3bfd4, 0xf9dbdf, 0xe4c6eb][i % 3],
          x + Math.sin(a) * 0.08 * s,
          y + Math.cos(a) * 0.08 * s,
          z,
          0.7 * s,
          -a,
        );
      }
      ball(p, 0xffe4a4, x, y, z + 0.035, 0.05 * s);
    },
    wing = (side, style) => {
      const w = new THREE.Group();
      w.name = "Magic wing " + side;
      w.position.x = side * 0.22 * Math.sqrt(d.build.width);
      back.add(w);
      if (style === "dragon") {
        const s = new THREE.Shape();
        s.moveTo(0, 0);
        s.quadraticCurveTo(side * 0.28, 0.7, side * 0.7, 0.56);
        s.quadraticCurveTo(side * 0.49, 0.31, side * 0.69, 0.08);
        s.quadraticCurveTo(side * 0.35, 0.23, side * 0.28, -0.12);
        s.quadraticCurveTo(side * 0.09, 0.12, 0, 0);
        add(
          w,
          new THREE.ExtrudeGeometry(s, {
            depth: 0.035,
            bevelEnabled: true,
            bevelSize: 0.014,
            bevelThickness: 0.014,
            bevelSegments: 1,
          }),
          0xc4e5dd,
        );
        ball(
          w,
          tint,
          side * 0.31,
          0.31,
          0.025,
          0.035,
          0.39,
          0.025,
          -side * 0.62,
        );
      } else {
        const cloud = style === "cloud",
          honey = style === "honey";
        for (let i = 0; i < (cloud ? 4 : 3); i++) {
          const x = side * (0.18 + i * 0.11),
            y = 0.18 + (cloud ? Math.sin(i) * 0.1 : i * 0.08);
          ball(
            w,
            [tint, 0xf6e6f0, 0xd7eaf3][i % 3],
            x,
            y,
            -i * 0.045,
            cloud ? 0.17 : 0.12,
            cloud ? 0.2 : 0.33,
            0.045,
            -side * (0.48 + i * 0.17),
          );
          if (honey)
            ball(
              w,
              0xe2c481,
              x,
              y,
              -i * 0.045 + 0.045,
              0.012,
              0.24,
              0.01,
              -side * (0.48 + i * 0.17),
            );
        }
      }
      return w;
    };
  let left, right;
  if (["fairy", "dragon", "cloud", "honey", "dream"].includes(kind)) {
    left = wing(-1, kind);
    right = wing(1, kind);
  }
  if (kind === "moon") {
    const s = new THREE.Shape();
    s.absarc(0, 0, 0.19, 0.28, Math.PI * 2 - 0.28, false);
    s.quadraticCurveTo(0.015, 0, Math.cos(0.28) * 0.19, Math.sin(0.28) * 0.19);
    add(
      head,
      new THREE.ExtrudeGeometry(s, {
        depth: 0.045,
        bevelEnabled: true,
        bevelSize: 0.012,
        bevelThickness: 0.012,
        bevelSegments: 1,
      }),
      0xffe1a3,
      0,
      0.58,
      0.04,
    );
    for (const side of [-1, 1]) star(head, tint, side * 0.23, 0.48, 0.13, 0.07);
  } else if (kind === "fairy") {
    for (let i = 0; i < 5; i++)
      flower(
        head,
        (i - 2) * 0.12,
        0.4 + Math.cos((i - 2) * 0.5) * 0.07,
        0.16,
        0.57,
      );
  } else if (kind === "dragon" || kind === "dream") {
    for (const x of kind === "dream" ? [0] : [-0.18, 0.18]) {
      add(
        head,
        new THREE.ConeGeometry(0.075, kind === "dream" ? 0.38 : 0.23, 12),
        kind === "dream" ? 0xf3dfba : 0xe6e4c3,
        x,
        0.54,
        0.02,
      );
      for (let i = 0; i < 3; i++)
        add(
          head,
          new THREE.TorusGeometry(0.06 - i * 0.014, 0.012, 5, 12),
          tint,
          x,
          0.44 + i * 0.07,
          0.02,
          1,
          1,
          1,
        );
    }
    if (kind === "dream")
      for (let i = 0; i < 5; i++)
        flower(head, (i - 2) * 0.13, 0.39, 0.18, 0.42);
    else
      for (let i = 0; i < 4; i++)
        add(
          back,
          new THREE.ConeGeometry(0.08, 0.15, 8),
          tint,
          0,
          0.1,
          -0.15 - i * 0.17,
        );
  } else if (kind === "aurora" || kind === "frost") {
    for (let i = 0; i < 5; i++)
      add(
        head,
        new THREE.OctahedronGeometry(0.1, 0),
        i % 2 ? tint : 0xe1dbf5,
        (i - 2) * 0.105,
        0.43 + Math.cos((i - 2) * 0.65) * 0.14,
        0.07,
        0.65,
        1.5 + Math.cos(i) * 0.3,
        0.65,
      );
    if (kind === "frost")
      for (let i = 0; i < 6; i++) {
        const a = (i * Math.PI) / 3;
        ball(
          back,
          tint,
          Math.sin(a) * 0.17,
          0.08,
          -0.25 + Math.cos(a) * 0.17,
          0.025,
          0.04,
          0.18,
          a,
        );
      }
    else
      for (let i = 0; i < 3; i++)
        star(
          tail,
          [tint, 0xeac5e6, 0xf8e1ba][i],
          (i - 1) * 0.13,
          0.5 + i * 0.1,
          0.06,
          0.06,
        );
  } else if (kind === "cloud") {
    for (let i = 0; i < 5; i++)
      ball(
        head,
        [0xf1e6f4, 0xe2e5f4, 0xffedec][i % 3],
        (i - 2) * 0.105,
        0.42 + (i % 2) * 0.04,
        0.08,
        0.13,
        0.1,
        0.09,
      );
    star(head, tint, 0, 0.65, 0.1, 0.085);
  } else if (kind === "lotus") {
    for (let row = 0; row < 2; row++)
      for (let i = 0; i < 7; i++) {
        const a = (i * Math.PI * 2) / 7;
        petal(
          head,
          row ? 0xffd6e5 : 0xe8adca,
          Math.sin(a) * (0.13 - row * 0.035),
          0.48 + row * 0.06,
          0.03 + Math.cos(a) * 0.1,
          0.75,
          -Math.sin(a) * 0.5,
        );
      }
    ball(head, 0xffe6a9, 0, 0.52, 0.14, 0.065);
    for (let i = 0; i < 5; i++)
      flower(
        back,
        Math.sin(i * 1.3) * 0.25,
        -0.05,
        0.18 + Math.cos(i * 1.3) * 0.1,
        0.5,
      );
  } else if (kind === "coral") {
    for (let i = 0; i < 7; i++)
      ball(
        head,
        i % 2 ? 0xe4bfda : 0xf5dce8,
        (i - 3) * 0.04,
        0.46 + Math.cos((i - 3) * 0.4) * 0.12,
        0.12,
        0.035,
        0.08,
        0.045,
        -(i - 3) * 0.16,
      );
    ball(head, 0xffebdf, 0, 0.42, 0.19, 0.055);
    for (const side of [-1, 1])
      for (let i = 0; i < 3; i++)
        petal(
          back,
          tint,
          side * (0.2 + i * 0.07),
          0.1 + i * 0.03,
          -0.2,
          0.75,
          -side * 0.7,
        );
  } else if (kind === "comet") {
    for (const side of [-1, 0, 1])
      star(
        head,
        tint,
        side * 0.17,
        0.49 + (side ? 0 : 0.13),
        0.09,
        side ? 0.075 : 0.12,
      );
    for (let i = 0; i < 3; i++)
      star(
        tail,
        i % 2 ? 0xe2c7ef : tint,
        0.08 * Math.sin(i * 2),
        0.43 + i * 0.15,
        0.03,
        0.065 - i * 0.008,
      );
  } else if (kind === "honey") {
    for (const side of [-1, 1]) {
      ball(
        head,
        0xb49b7b,
        side * 0.13,
        0.48,
        0.1,
        0.018,
        0.13,
        0.018,
        -side * 0.4,
      );
      ball(head, tint, side * 0.18, 0.6, 0.1, 0.055);
    }
    flower(head, 0, 0.42, 0.2, 0.65);
  } else if (kind === "mushroom") {
    ball(head, 0xe7bacd, 0, 0.52, 0.015, 0.28, 0.13, 0.22);
    ball(head, 0xf9dfcb, 0, 0.44, 0.015, 0.24, 0.035, 0.2);
    for (let i = 0; i < 7; i++) {
      const a = i * 2.4;
      ball(
        head,
        0xffecdb,
        Math.sin(a) * 0.19,
        0.57 + (i % 2) * 0.02,
        0.015 + Math.cos(a) * 0.13,
        0.027,
        0.016,
        0.027,
      );
    }
  }
  let draws = 0,
    vertices = 0;
  for (const [parent, geos] of parts) {
    const g = mergeGeometries(geos);
    geos.forEach((x) => x.dispose());
    const mesh = new THREE.Mesh(g, material);
    mesh.name = "Batched magic · " + kind;
    parent.add(mesh);
    draws++;
    vertices += g.attributes.position.count;
  }
  d.magic = {
    kind,
    draws,
    vertices,
    update(time, reduced) {
      back.position.y = 1.02 + (reduced ? 0 : Math.sin(time * 2.1) * 0.006);
      if (left) {
        left.rotation.z = reduced ? 0 : Math.sin(time * 2.3) * 0.055;
        right.rotation.z = -left.rotation.z;
      }
    },
  };
}
