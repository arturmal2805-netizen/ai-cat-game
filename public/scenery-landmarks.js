import * as THREE from "three";
import {
  shape,
  line,
  torus,
  flowerCluster,
  fluffyTree,
  lantern,
  wizardCottage,
  mushroomHouse,
  teaPavilion,
  crescentGate,
} from "./fantasy-scenery.js";
import { coralCluster } from "./reef.js";
import { creatureRide } from "./creature-rides.js";
export function buildLandmark(parent, style, id) {
  const h = new THREE.Group();
  h.position.set(0, 0, 0);
  parent.add(h);
  h.name = "Landmark-" + id;
  const hero = style.hero;
  if (hero === "bloom") {
    const flower = creatureRide("ride-lotus", { ambient: true });
    flower.scale.setScalar(1.25);
    h.add(flower);
    for (let i = 0; i < 5; i++)
      shape(
        h,
        "crystal",
        [0xb8e5ec, 0xd6b5ec, 0xf1bcdc][i % 3],
        Math.sin(i * 2.4) * 1.6,
        0.6,
        Math.cos(i * 2.4) * 1.6,
        0.32,
        1.2,
        0.32,
        true,
      );
  } else if (hero === "jelly") {
    crescentGate(h, 0, 0, 0, 0xffe0a1, 1.1);
    teaPavilion(h, 0, 0, 0, style.roof, 0.65);
  } else if (hero === "butterfly") {
    fluffyTree(h, 0, 0, style.leaf, "sakura", 0.9);
    for (let i = 0; i < 8; i++)
      shape(
        h,
        "sphere",
        0xffd277,
        Math.sin(i * 2.4),
        1.5 + (i % 3) * 0.4,
        Math.cos(i * 2.4),
        0.13,
        0.18,
        0.13,
        true,
      );
  } else if (hero === "dinosaur") {
    const friend = creatureRide("ride-dinosaur", { ambient: true });
    friend.scale.setScalar(0.95);
    h.add(friend);
    flowerCluster(h, -1.5, 1, style.flower, 1.2);
  } else if (hero === "moon" || hero === "wizard") {
    crescentGate(h, 0, 0, 0, 0xffdc90, 0.88);
  } else if (["tea", "bamboo"].includes(hero)) {
    teaPavilion(h, 0, 0, 0, style.roof, 1.15);
  } else if (
    ["pumpkin", "mushrooms", "snow", "oasis", "beach", "library"].includes(hero)
  ) {
    if (hero === "mushrooms") mushroomHouse(h, 0, 0, 0, style.roof, 1.25);
    else wizardCottage(h, 0, 0, 0, style.roof, 1.05);
    if (hero === "pumpkin")
      for (let i = 0; i < 6; i++)
        shape(
          h,
          "sphere",
          0xe9a55e,
          -1.8 + i * 0.55,
          0.23,
          1.6,
          0.28,
          0.23,
          0.26,
        );
    if (hero === "snow") {
      for (let i = 0; i < 3; i++)
        shape(
          h,
          "sphere",
          0xf6fbf9,
          2,
          0.25 + i * 0.38,
          1,
          0.45 - i * 0.1,
          0.35 - i * 0.08,
          0.45 - i * 0.1,
        );
    }
    if (hero === "beach") {
      for (let i = 0; i < 6; i++)
        shape(
          h,
          "sphere",
          0xf8e6c5,
          2 + Math.cos(i) * 0.15,
          0.3,
          Math.sin(i) * 0.15,
          0.11,
          0.3,
          0.06,
        );
    }
    if (hero === "library")
      for (let i = 0; i < 5; i++) {
        const book = shape(
          h,
          "cube",
          [0xc4a3d4, 0xb1cba6, 0xddbd88][i % 3],
          1.8,
          0.2 + i * 0.12,
          0.6,
          0.8,
          0.11,
          0.6,
        );
        book.rotation.y = i * 0.18;
      }
  } else if (hero === "treehouse") {
    fluffyTree(h, 0, 0, style.leaf, "oak", 1.6);
    shape(h, "cube", 0xc5a171, 0, 1.8, 1, 1.9, 0.18, 1.4);
    mushroomHouse(h, 0, 1.9, 0.8, style.roof, 0.65);
    line(h, [0.7, 0, 1.7], [0.7, 2.1, 1.7], 0xa28263, 0.05);
    for (let i = 0; i < 7; i++)
      line(h, [0.55, i * 0.3, 1.7], [0.95, i * 0.3, 1.7], 0xa28263, 0.045);
  } else if (["cloudcastle", "ice", "crystal"].includes(hero)) {
    for (const [x, z, s] of [
      [0, 0, 1],
      [-1.5, -0.4, 0.75],
      [1.5, -0.3, 0.75],
    ]) {
      shape(
        h,
        "pole",
        hero === "ice" ? 0xbadfee : 0xe6d7e6,
        x,
        1.5 * s,
        z,
        0.55 * s,
        3 * s,
        0.55 * s,
      );
      shape(
        h,
        "cone",
        style.roof,
        x,
        3.45 * s,
        z,
        0.85 * s,
        1.25 * s,
        0.85 * s,
      );
      shape(
        h,
        "sphere",
        0xffe2a4,
        x,
        1.8 * s,
        z + 0.53 * s,
        0.18 * s,
        0.3 * s,
        0.025,
        true,
      );
    }
    if (hero === "crystal")
      for (let i = 0; i < 5; i++) {
        const crystal = shape(
          h,
          "stone",
          [0xa8dcf2, 0xddb8f1, 0xaee8de][i % 3],
          Math.sin(i) * 2,
          1,
          Math.cos(i) * 1.7,
          0.35,
          1.2,
          0.35,
        );
        crystal.rotation.z = Math.sin(i) * 0.3;
      }
  } else if (["planet", "observatory"].includes(hero)) {
    const globe = shape(h, "sphere", 0xb6a2dc, 0, 2.35, 0, 1.5, 1.5, 1.5);
    torus(h, 0xf5d5a4, 2.05, 0.075, 0, 2.35, 0).rotation.x = 1.05;
    for (const dx of [-1.8, 1.8])
      line(h, [dx, 0, 0], [0, 2.35, 0], 0xab8b6b, 0.065);
    if (hero === "observatory") {
      shape(h, "pole", 0xe3d0b7, 0, 0.7, 0, 1.55, 1.4, 1.55);
      shape(h, "dome", style.roof, 0, 1.4, 0, 1.6, 1.1, 1.6);
      line(h, [1, 1.5, 0.2], [2, 2.1, 0.8], 0xe2bb7a, 0.2);
    }
  } else if (hero === "rainbow") {
    for (let i = 0; i < 6; i++)
      torus(
        h,
        [0xeb9cac, 0xf1c184, 0xe8dfa0, 0xa6cbab, 0xa5cbdc, 0xc3a6de][i],
        2.55 - i * 0.17,
        0.09,
        0,
        1,
        0,
        false,
        Math.PI,
      );
    for (const x of [-2.5, 2.5])
      for (let i = 0; i < 3; i++)
        shape(
          h,
          "sphere",
          0xf4edfa,
          x + (i - 1) * 0.3,
          0.75,
          0,
          0.55,
          0.4,
          0.4,
        );
  } else if (hero === "candy") {
    wizardCottage(h, 0, 0, 0, style.roof, 1.05);
    for (const x of [-1.8, 1.8]) {
      line(h, [x, 0, 0.8], [x, 2.2, 0.8], 0xf5d7c4, 0.09);
      shape(
        h,
        "sphere",
        x < 0 ? 0xffb7d5 : 0xc6d7ed,
        x,
        2.3,
        0.8,
        0.65,
        0.65,
        0.15,
      );
      torus(h, 0xfff0dd, 0.45, 0.055, x, 2.3, 1);
    }
  } else if (hero === "volcano") {
    shape(h, "cone", 0x8c7279, 0, 1.5, 0, 2.0, 3.6, 2);
    torus(h, 0xffbb80, 0.55, 0.13, 0, 3.12, 0, true).rotation.x = Math.PI / 2;
    for (let i = 0; i < 7; i++)
      shape(
        h,
        "stone",
        0xffc88a,
        Math.sin(i) * 0.4,
        3.3 + (i % 3) * 0.35,
        Math.cos(i) * 0.4,
        0.08,
        0.15,
        0.08,
        true,
      );
  } else if (hero === "clock") {
    shape(h, "cube", 0xdbbe92, 0, 1.9, 0, 1.7, 3.8, 1.5);
    shape(h, "cone", style.roof, 0, 4.15, 0, 1.4, 1.3, 1.4).rotation.y =
      Math.PI / 4;
    shape(h, "sphere", 0xffe9b3, 0, 2.65, 0.77, 0.57, 0.57, 0.04, true);
    torus(h, 0xa78858, 0.6, 0.065, 0, 2.65, 0.82);
    line(h, [0, 2.65, 0.9], [0, 3.04, 0.9], 0x7c6354, 0.035);
    line(h, [0, 2.65, 0.9], [0.3, 2.5, 0.9], 0x7c6354, 0.035);
    for (const x of [-1.5, 1.5]) {
      const gear = torus(h, 0xd0ab74, 0.68, 0.09, x, 1.1, 0.4);
      for (let i = 0; i < 8; i++)
        shape(
          h,
          "cube",
          0xd0ab74,
          x + Math.cos(i * 0.785) * 0.7,
          1.1 + Math.sin(i * 0.785) * 0.7,
          0.4,
          0.18,
          0.18,
          0.12,
        );
    }
  } else if (hero === "coral") {
    for (let i = 0; i < 7; i++)
      coralCluster(
        h,
        Math.sin(i * 2.4) * 1.4,
        Math.cos(i * 2.4) * 1.1,
        1.6 + (i % 3) * 0.25,
        i,
      );
    shape(h, "sphere", 0xf9e8c7, 0, 0.5, 0, 0.9, 0.75, 0.2);
  } else if (hero === "sunflower") {
    teaPavilion(h, 0, 0, 0, style.roof, 1.05);
    for (let i = 0; i < 5; i++) {
      const x = -2 + i;
      line(h, [x, 0, 1.5], [x, 1.6, 1.5], 0x91a261, 0.055);
      for (let j = 0; j < 8; j++)
        shape(
          h,
          "sphere",
          0xffdb6f,
          x + Math.cos(j * 0.785) * 0.28,
          1.6 + Math.sin(j * 0.785) * 0.28,
          1.5,
          0.14,
          0.14,
          0.04,
        );
      shape(h, "sphere", 0xa68354, x, 1.6, 1.55, 0.2, 0.2, 0.04);
    }
  } else if (hero === "lotus") {
    for (let i = 0; i < 8; i++) {
      const a = i * 0.785,
        p = shape(
          h,
          "sphere",
          0xf9cbdf,
          Math.cos(a) * 0.6,
          0.5,
          Math.sin(a) * 0.6,
          0.4,
          0.5,
          0.19,
        );
      p.rotation.set(0.3, a, 0);
    }
    shape(h, "sphere", 0xffe1a2, 0, 0.5, 0, 0.35, 0.35, 0.35, true);
  }
  flowerCluster(h, -1.8, 1.5, style.flower, 0.8);
  lantern(h, 1.9, 0, 1.3, 0.7);
  return h;
}
