import * as THREE from "three";
import { shape, line, lantern } from "./fantasy-scenery.js";
import { createCat, animateCat, reactCat } from "./cat-model.js";
import { catAppearance } from "./cat-breeds.js";
import { batchModelGeometry } from "./model-batching.js";
function mergeFurniture(group) {
  const merged = batchModelGeometry(group, { combineColors: true });
  group.traverse((o) => {
    if (o.isMesh && !o.geometry.userData.sharedScenery) o.geometry.dispose();
  });
  group.clear();
  group.add(merged);
  group.userData.staticMeshes = merged.children.length;
  return group;
}
function cushion(parent, x, y, z, sx, sy, sz, color) {
  return shape(parent, "sphere", color, x, y, z, sx, sy, sz);
}
function lettering(text, width, height) {
  if (typeof document === "undefined") return null;
  const c = document.createElement("canvas");
  c.width = 768;
  c.height = 192;
  const ctx = c.getContext("2d");
  ctx.fillStyle = "#775135";
  ctx.font = "bold 108px Georgia";
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  ctx.fillText(text, 384, 96);
  const texture = new THREE.CanvasTexture(c);
  texture.colorSpace = THREE.SRGBColorSpace;
  return new THREE.Mesh(
    new THREE.PlaneGeometry(width, height),
    new THREE.MeshBasicMaterial({
      map: texture,
      transparent: true,
      depthWrite: false,
      side: THREE.DoubleSide,
    }),
  );
}
export function spaCup(color = 0xfff2da) {
  const g = new THREE.Group();
  shape(g, "pole", 0xfaf1e5, 0, 0.19, 0, 0.13, 0.34, 0.13);
  shape(g, "pole", color, 0, 0.37, 0, 0.115, 0.025, 0.115);
  line(g, [0.04, 0.38, 0], [0.07, 0.66, 0.02], 0xf3a9c3, 0.018);
  cushion(g, -0.08, 0.4, 0.02, 0.08, 0.025, 0.08, 0xd5b5ed);
  return g;
}
export function spaLounge() {
  const g = new THREE.Group();
  g.name = "One continuous shared SPA daybed";
  shape(g, "pole", 0xba8b59, 0, 0.16, 0, 3.6, 0.3, 3.15);
  cushion(g, 0, 0.47, 0, 3.6, 0.43, 3.15, 0xffe9d4);
  cushion(g, 0, 0.79, -2.25, 3.1, 0.8, 0.75, 0xf2cedc);
  for (const x of [-2.65, 2.65])
    cushion(g, x, 0.95, -1.2, 0.6, 0.47, 0.78, 0xf8dbe4);
  for (const x of [-2.8, 2.8]) {
    const t = shape(g, "pole", 0xb7a5d4, x, 0.92, 1.5, 0.2, 0.8, 0.2);
    t.rotation.z = Math.PI / 2;
  }
  // A single mattress remains one object; these seams do not divide it.
  const seam = new THREE.Mesh(
    new THREE.TorusGeometry(1, 0.018, 5, 72),
    new THREE.MeshStandardMaterial({ color: 0xd4b6ac, roughness: 0.8 }),
  );
  seam.rotation.x = Math.PI / 2;
  seam.scale.set(3.5, 3.05, 1);
  seam.position.y = 0.49;
  g.add(seam);
  for (let i = 0; i < 3; i++)
    shape(
      g,
      "cube",
      0xd5b189,
      0,
      0.1 + i * 0.14,
      3.5 - i * 0.22,
      2.8,
      0.16,
      0.5,
    );
  umbrella(g, -2.2, -2.6, 0xf1bbd0);
  shape(g, "pole", 0xc29a69, -3.8, 0.5, 2, 0.7, 0.13, 0.7);
  line(g, [-3.8, 0, 2], [-3.8, 0.5, 2], 0xa77d50, 0.12);
  const cup = spaCup(0xc4e3b6);
  cup.position.set(-3.8, 0.6, 2);
  g.add(cup);
  g.userData = { id: "bed", duration: 22, spa: true };
  return mergeFurniture(g);
}
export function umbrella(parent, x, z, color = 0xf6c8d9) {
  line(parent, [x, 0.1, z], [x, 4.4, z], 0xc7a376, 0.06);
  const canopy = new THREE.Group();
  canopy.position.set(x, 4.15, z);
  parent.add(canopy);
  for (let i = 0; i < 10; i++) {
    const geo = new THREE.ConeGeometry(
        2.3,
        0.75,
        1,
        1,
        true,
        (i * Math.PI) / 5,
        Math.PI / 5,
      ),
      m = new THREE.MeshStandardMaterial({
        color: i % 2 ? 0xffeddf : color,
        side: THREE.DoubleSide,
        roughness: 0.8,
      });
    const panel = new THREE.Mesh(geo, m);
    canopy.add(panel);
    const a = (i * Math.PI) / 5;
    line(
      canopy,
      [0, 0.37, 0],
      [Math.sin(a) * 2.3, -0.37, Math.cos(a) * 2.3],
      0xe8d4b3,
      0.024,
    );
  }
  cushion(canopy, 0, 0.42, 0, 0.12, 0.1, 0.12, 0xffe5ad);
  return canopy;
}
export function spaBar({ preview = false } = {}) {
  const g = new THREE.Group();
  g.name = "Cat SPA poolside milk bar";
  shape(g, "cube", 0xc79d70, 0, 0.12, 0, 8, 0.24, 4);
  shape(g, "cube", 0xc19b70, 0, 1, -0.05, 7.5, 1.8, 1.7);
  for (let i = 0; i < 20; i++)
    shape(
      g,
      "cube",
      i % 2 ? 0xd5ad7a : 0xe2c291,
      -3.55 + i * 0.375,
      1,
      0.85,
      0.33,
      1.6,
      0.08,
    );
  shape(g, "cube", 0xf0d3a3, 0, 2.03, 0, 8, 0.2, 2.2);
  for (const x of [-3.65, 3.65])
    for (const z of [-2, 0.2]) line(g, [x, 0.2, z], [x, 4.7, z], 0xb28a5c, 0.1);
  for (let i = 0; i < 12; i++) {
    const x = -3.85 + i * 0.7,
      roof = shape(
        g,
        "cube",
        i % 2 ? 0xffe6ce : 0xf5b5c9,
        x,
        4.6,
        -0.9,
        0.71,
        0.16,
        2.6,
      );
    roof.rotation.x = 0.13;
    cushion(g, x, 4.22, 0.4, 0.35, 0.24, 0.1, i % 2 ? 0xffe6ce : 0xf5b5c9);
  }
  for (let i = 0; i < 4; i++) {
    const x = -3.3 + i * 2.2;
    shape(g, "pole", 0xd4b284, x, 0.57, 4.8, 0.58, 0.2, 0.58);
    line(g, [x, 0.1, 4.8], [x, 0.54, 4.8], 0xa67f51, 0.12);
    for (let j = 0; j < 3; j++) {
      const a = (j * Math.PI * 2) / 3;
      line(
        g,
        [x, 0.52, 4.8],
        [x + Math.sin(a) * 0.45, 0.05, 4.8 + Math.cos(a) * 0.45],
        0xad8454,
        0.06,
      );
    }
    const drink = spaCup([0xfff2da, 0xf1adc7, 0xc8e8d3][i % 3]);
    drink.position.set(x, 2.13, 0.3);
    g.add(drink);
  }
  for (let i = 0; i < 5; i++) {
    const x = -2.8 + i * 1.35;
    line(g, [x, 4.5, 0.1], [x, 4.05, 0.1], 0xa3845d, 0.02);
    cushion(g, x, 3.98, 0.1, 0.13, 0.18, 0.13, 0xffdc88);
  }
  lantern(g, -3.75, 2.1, 0.6, 0.45);
  lantern(g, 3.75, 2.1, 0.6, 0.45);
  // A broad front-facing shop sign and a milk/cocktail display make this a
  // recognisable bar even when the entire large island fits a phone screen.
  // The normal high game camera must see the bartender and serving top:
  // keep the shallow canopy behind them and the sign below the counter.
  shape(g, "cube", 0xb58a62, 0, 1.05, 0.94, 5.3, 0.95, 0.18);
  shape(g, "cube", 0xffe4ce, 0, 1.05, 1.05, 5.08, 0.75, 0.06);
  for (const side of [-1, 1]) {
    const display = spaCup(side < 0 ? 0xfff2da : 0xf1adc7);
    display.position.set(side * 2.9, 2.14, 0.5);
    display.scale.setScalar(1.4);
    g.add(display);
  }
  mergeFurniture(g);
  const sign = lettering("SPA · BAR", 4.7, 0.74);
  if (sign) {
    sign.name = "SPA bar lettering";
    sign.position.set(0, 1.05, 1.09);
    g.add(sign);
  }
  if (!preview) {
    const cat = createCat("happy", {
      detail: "npc",
      ...catAppearance({
        breed: "ragdoll",
        color: 0xe5d0b4,
        eyeColor: 0x8fc7b3,
      }),
    });
    cat.scale.setScalar(0.62);
    cat.name = "SPA barista";
    const platform = new THREE.Group();
    platform.name = "SPA barista platform";
    platform.position.set(0, 1.9, -1);
    platform.add(cat);
    g.add(platform);
    shape(cat, "sphere", 0xb4d7c9, 0, 0.55, 0.4, 0.31, 0.32, 0.06);
    g.userData.update = (time, reduced) => {
      animateCat(cat, time, false, reduced);
      if (time - (g.userData.lastServiceTime || -100) < 2)
        reactCat(
          cat,
          { paw: 0.3 + Math.sin(time * 4) * 0.15, headPitch: 0.12 },
          reduced,
        );
      cat.userData.head.rotation.y = reduced ? 0 : Math.sin(time * 0.45) * 0.18;
    };
  }
  g.userData.id = "cat-barista";
  g.userData.handpainted = true;
  g.userData.spa = true;
  g.userData.duration = 26;
  return g;
}
export function spaSign(parent) {
  const g = new THREE.Group();
  g.position.set(0, 0, 15.4);
  g.name = "Cat SPA entrance arch";
  parent.add(g);
  for (const x of [-2.8, 2.8]) {
    shape(g, "pole", 0xaf8154, x, 2.1, 0, 0.24, 4.2, 0.24);
    cushion(g, x, 4.2, 0, 0.34, 0.25, 0.34, 0xd9ba88);
    lantern(g, x, 2.1, 0.4, 0.65);
  }
  cushion(g, 0, 3.85, 0, 3.3, 0.84, 0.25, 0xa97f56);
  cushion(g, 0, 3.88, 0.2, 2.96, 0.65, 0.12, 0xf4d7ab);
  // Canvas label is the only small generated texture; there are no billboards.
  if (typeof document !== "undefined") {
    const c = document.createElement("canvas");
    c.width = 768;
    c.height = 192;
    const ctx = c.getContext("2d");
    ctx.clearRect(0, 0, c.width, c.height);
    ctx.fillStyle = "#775135";
    ctx.font = "bold 112px Georgia";
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    ctx.fillText("Cat SPA", 384, 96);
    const texture = new THREE.CanvasTexture(c);
    texture.colorSpace = THREE.SRGBColorSpace;
    const sign = new THREE.Mesh(
      new THREE.PlaneGeometry(4.6, 1.15),
      new THREE.MeshBasicMaterial({
        map: texture,
        transparent: true,
        depthWrite: false,
        side: THREE.DoubleSide,
      }),
    );
    sign.position.set(0, 3.9, 0.335);
    g.add(sign);
  }
  return g;
}
