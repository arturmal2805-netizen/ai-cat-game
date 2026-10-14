import { BIOMES, byItem, biomeReservations } from "./game-data.js";

export const SCENERY_TYPES = Object.fromEntries([
  ...[
    ["enchanted", "Лунное дерево", "🌳"],
    ["willow", "Сказочная ива", "🌿"],
    ["maple", "Медовый клён", "🍁"],
    ["apple", "Яблоня с фонариками", "🍎"],
    ["snow", "Снежная ель", "🌲"],
    ["crystal", "Кристальное дерево", "💎"],
    ["palm", "Лагунная пальма", "🌴"],
    ["sakura", "Цветущая сакура", "🌸"],
    ["mushroom", "Грибное дерево", "🍄"],
    ["bamboo", "Бамбуковая рощица", "🎋"],
  ].map(([kind, name, icon]) => [
    "scenery-tree-" + kind,
    { kind, name, icon, category: "tree", footprint: [2.7, 2.7] },
  ]),
  [
    "scenery-cottage",
    {
      name: "Домик волшебника",
      icon: "🏡",
      category: "house",
      footprint: [3.4, 3.8],
    },
  ],
  [
    "scenery-mushroom",
    {
      name: "Грибной домик",
      icon: "🍄",
      category: "house",
      footprint: [3.1, 3.1],
    },
  ],
  [
    "scenery-tea",
    {
      name: "Чайная беседка",
      icon: "🍵",
      category: "house",
      footprint: [3.3, 3.3],
    },
  ],
  [
    "scenery-boulder",
    {
      name: "Мшистый валун",
      icon: "🪨",
      category: "rock",
      footprint: [1.8, 1.6],
    },
  ],
  [
    "scenery-landmark",
    {
      name: "Чудо острова",
      icon: "✨",
      category: "landmark",
      footprint: [4.8, 4.8],
    },
  ],
]);
export const byScenery = (type) => SCENERY_TYPES[type];
export function sceneryFootprint(record, rotation = record.rotation || 0) {
  const size = byScenery(record.type).footprint.map(
    (v) => v * (record.scale || 1),
  );
  return rotation % 2 ? size.reverse() : size;
}
export function sceneryBounds(record) {
  const [w, d] = sceneryFootprint(record);
  return { ...record, w, d };
}
export function sceneryName(record) {
  return record.type === "scenery-landmark"
    ? "Чудо · " + BIOMES.find((b) => b.id === record.originBiome).name
    : byScenery(record.type).name;
}
// Decorative objects keep stable identities separate from purchased attractions.
// This also permits old saves with sixty purchases to retain all their items.
export function initialScenery(placements = []) {
  const result = [];
  for (const biome of BIOMES) {
    const candidates = [
      { type: "scenery-landmark", x: -6, z: -6, scale: 0.88 },
      ...(biome.id === "moon"
        ? [{ type: "scenery-cottage", x: -6, z: -6, scale: 1 }]
        : []),
      ...landscapedTrees(biome.id).map((t) => ({
        type: "scenery-tree-" + t.kind,
        x: t.x,
        z: t.z,
        scale: t.scale,
      })),
      ...[
        [7, -6],
        [-7, 6],
      ].map(([x, z]) => ({
        type: ["sakura", "bamboo", "lotus"].includes(biome.id)
          ? "scenery-tea"
          : "scenery-mushroom",
        x,
        z,
        scale: 0.85,
      })),
      ...[
        [8, 1],
        [1, 8],
        [-8, 0],
        [0, -8],
      ].map(([x, z], i) => ({
        type: "scenery-boulder",
        x,
        z,
        scale: 0.75 + i * 0.08,
      })),
    ];
    if (["autumn", "ice", "galaxy", "volcano", "winter"].includes(biome.id)) {
      const kinds = {
        autumn: ["sakura", "apple"],
        ice: ["sakura", "crystal"],
        galaxy: ["willow", "enchanted"],
        volcano: ["palm", "bamboo"],
        winter: ["palm", "crystal"],
      };
      candidates.push(
        { type: "scenery-tree-" + kinds[biome.id][0], x: 9, z: 7, scale: 1.1 },
        {
          type: "scenery-tree-" + kinds[biome.id][1],
          x: -11,
          z: -1,
          scale: 0.92,
        },
      );
    }
    if (biome.id === "winter") {
      Object.assign(candidates[0], { x: 10, z: -5, scale: 0.86 });
      const houses = candidates.filter((c) => c.type === "scenery-mushroom");
      Object.assign(houses[0], { x: -11, z: 7.5, scale: 0.88 });
      Object.assign(houses[1], { x: 6, z: 10.8, scale: 0.84 });
      Object.assign(candidates.at(-2), { x: 12, z: 6, scale: 0.98 });
      Object.assign(candidates.at(-1), { x: -12, z: 5, scale: 0.92 });
    }
    if (biome.id === "aquapark") {
      candidates.splice(
        0,
        candidates.length,
        ...[
          [-14, 0],
          [-7, 14],
          [5, 15],
          [15, 1],
          [1, -16],
        ].map(([x, z], i) => ({
          type: "scenery-tree-palm",
          x,
          z,
          scale: 1.15 + i * 0.08,
        })),
        ...[
          [-13, 12],
          [3, 15],
          [16, -3],
          [-13, -13],
        ].map(([x, z]) => ({ type: "scenery-boulder", x, z, scale: 1.1 })),
      );
    }
    candidates.forEach((c, index) => {
      const record = {
        id: `decor-${biome.id}-${index}`,
        originBiome: biome.id,
        biome: biome.id,
        ...c,
        rotation: 0,
      };
      const occupied = [
        // Keep a usable building yard beside the starter activities. This is
        // only a planting preference, never a permanent placement restriction.
        ...(biome.id === "moon" ? [{ x: 0, z: -5, w: 6.4, d: 5.4 }] : []),
        ...biomeReservations(biome.id),
        ...placements
          .filter((p) => p.biome === biome.id)
          .map((p) => {
            const size = byItem(p.item).footprint,
              [w, d] = p.rotation % 2 ? [size[1], size[0]] : size;
            return { ...p, w, d };
          }),
        ...result
          .filter((p) => p.biome === biome.id && !p.stored)
          .map(sceneryBounds),
      ];
      const free = (x, z) => {
        const [w, d] = sceneryFootprint(record);
        return (
          Math.hypot(Math.abs(x) + w / 2, Math.abs(z) + d / 2) <=
            (biome.radius ? biome.radius - 0.7 : 10.8) &&
          !occupied.some(
            (p) =>
              Math.abs(x - p.x) < (w + p.w) / 2 + 0.2 &&
              Math.abs(z - p.z) < (d + p.d) / 2 + 0.2,
          )
        );
      };
      let point = free(c.x, c.z) ? { x: c.x, z: c.z } : null;
      if (!point) {
        const choices = [];
        for (
          let x = -(biome.radius ? 17 : 9);
          x <= (biome.radius ? 17 : 9);
          x++
        )
          for (
            let z = -(biome.radius ? 17 : 9);
            z <= (biome.radius ? 17 : 9);
            z++
          )
            if (free(x, z)) choices.push({ x, z });
        choices.sort(
          (a, b) =>
            Math.hypot(a.x - c.x, a.z - c.z) - Math.hypot(b.x - c.x, b.z - c.z),
        );
        point = choices[0];
      }
      result.push({ ...record, ...point, ...(!point ? { stored: true } : {}) });
    });
  }
  return result;
}

// Authored arrangements rather than a uniform ring of repeated trees.
const layouts = {
  aquapark: [
    [-14, 0, "palm", 1.15],
    [-7, 14, "palm", 1.23],
    [5, 15, "palm", 1.31],
    [15, 1, "palm", 1.39],
    [1, -16, "palm", 1.47],
  ],
  moon: [
    [-1, -8, "enchanted", 1],
    [6, -3, "willow", 1.08],
    [-5, 6, "enchanted", 0.82],
  ],
  autumn: [
    [-4, 5, "maple", 1.12],
    [5, -5, "maple", 0.91],
    [7, 3, "apple", 0.76],
  ],
  winter: [
    [-4, 5, "snow", 1.13],
    [5, -4, "crystal", 0.92],
    [7, 4, "snow", 0.72],
  ],
  beach: [
    [-8, 3, "palm", 1.1],
    [6, 5, "palm", 1.04],
  ],
  water: [
    [6, -4, "willow", 1.15],
    [5, 6, "palm", 0.9],
  ],
  wizard: [
    [-3, 6, "mushroom", 1.12],
    [6, -4, "enchanted", 1.03],
    [7, 3, "mushroom", 0.74],
  ],
  summer: [
    [-5, 4, "apple", 1.1],
    [5, -5, "apple", 0.84],
    [7, 2, "willow", 0.9],
  ],
  nature: [
    [-5, 4, "willow", 1.12],
    [5, -5, "apple", 0.94],
    [7, 2, "enchanted", 0.76],
  ],
  sakura: [
    [6, -5, "sakura", 1.12],
    [1, 7, "sakura", 0.95],
    [-7, 3, "willow", 0.8],
  ],
  clouds: [
    [-4, 5, "crystal", 0.96],
    [6.5, -3.5, "enchanted", 0.9],
  ],
  desert: [
    [4, -5, "palm", 1.05],
    [-3, 7, "palm", 0.8],
  ],
  stars: [
    [-5, 4, "enchanted", 1.04],
    [6, -3, "crystal", 0.81],
  ],
  volcano: [
    [-5, 4, "maple", 0.91],
    [5, -3, "mushroom", 0.84],
  ],
  crystal: [
    [-4, 5, "crystal", 1.15],
    [6, -4, "crystal", 0.87],
    [7, 3, "enchanted", 0.72],
  ],
  candy: [
    [-5, 4, "sakura", 0.97],
    [5, -4, "apple", 1.02],
    [7, 3, "mushroom", 0.77],
  ],
  rainbow: [
    [-4, 5, "sakura", 1.08],
    [5, -4, "willow", 0.99],
    [7, 3, "crystal", 0.72],
  ],
  bamboo: [
    [-5, 4, "bamboo", 1.13],
    [5, -5, "bamboo", 0.98],
    [7, 2, "willow", 0.78],
  ],
  mushrooms: [
    [-4, 5, "mushroom", 1.17],
    [6, -4, "mushroom", 0.9],
    [6, 5, "enchanted", 0.76],
  ],
  galaxy: [
    [-5, 4, "crystal", 1.03],
    [6, -3, "mushroom", 0.92],
  ],
  coral: [
    [-7.8, 2.3, "palm", 1.14],
    [5.8, 6.2, "palm", 1.07],
  ],
  lotus: [
    [6, -4, "willow", 1.16],
    [4, 7, "bamboo", 0.91],
  ],
  ice: [
    [-4, 5, "crystal", 1.16],
    [6, -4, "snow", 0.92],
  ],
  clockwork: [
    [-5, 4, "maple", 1.03],
    [5, -4, "apple", 0.91],
    [7, 3, "enchanted", 0.74],
  ],
  dusk: [
    [-4, 5, "willow", 1.12],
    [6, -4, "enchanted", 1],
    [7, 3, "mushroom", 0.74],
  ],
};
const artKinds = {
  enchanted: [false, 0, "oak"],
  sakura: [false, 1, "sakura"],
  palm: [false, 2, "palm"],
  snow: [false, 3, "snow"],
  willow: [true, 0, "oak"],
  maple: [true, 1, "maple"],
  bamboo: [true, 2, "bamboo"],
  apple: [true, 3, "fruit"],
  crystal: [true, 4, "snow"],
  mushroom: [true, 5, "oak"],
};
Object.assign(layouts, {
  winter: [
    [-11, -8, "palm", 1.22],
    [9, 9, "palm", 1.08],
    [-4, 12, "crystal", 0.9],
  ],
  autumn: [
    [-9, 4, "sakura", 1.18],
    [6, -5, "apple", 1.02],
    [6, 7, "sakura", 0.94],
  ],
  ice: [
    [-9, 4, "sakura", 1.12],
    [6, -5, "crystal", 1.05],
    [6, 7, "sakura", 0.94],
  ],
  galaxy: [
    [-9, 4, "willow", 1.2],
    [6, -5, "enchanted", 0.96],
    [6, 7, "willow", 0.92],
  ],
  volcano: [
    [-9, 4, "palm", 1.28],
    [6, -5, "palm", 1.04],
    [6, 7, "bamboo", 1.1],
  ],
});
export function landscapedTrees(id) {
  return (layouts[id] || []).map(([x, z, kind, scale], index) => {
    const [trees, cell, fallback] = artKinds[kind];
    return {
      id: `tree-${id}-${index}`,
      x,
      z,
      kind,
      scale,
      trees,
      cell,
      fallback,
      height: 4.7 * scale,
      width: 4.3 * scale,
    };
  });
}
