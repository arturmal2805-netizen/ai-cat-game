// Complete buildable sets, in world units. Heights are real geometry/ride
// heights; footprints include pools, supports, stairs and airborne arcs.
export const MEGA_RIDES = [
  {
    id: "slide-glass-corkscrew",
    kind: "glass",
    name: "Хрустальный шторм",
    icon: "🌀",
    price: 6800,
    requiredLevel: 6,
    buildMinutes: 150,
    footprint: [22, 24],
    height: 16,
    color: 0x69cfe3,
    accent: 0xc8a0eb,
    pool: [3, 7, 4.6, 3.7],
    tower: [-6, -7],
    description:
      "Огромная прозрачная труба: два стремительных витка, видимая вода, мягкий круг и бирюзовый бассейн.",
  },
  {
    id: "slide-sky-cannon",
    kind: "launch",
    name: "Небесная водная пушка",
    icon: "🚀",
    price: 9200,
    requiredLevel: 7,
    buildMinutes: 180,
    footprint: [26, 30],
    height: 21,
    color: 0xf291c4,
    accent: 0x7edbd9,
    pool: [3, 8, 6, 5],
    tower: [-8, -9],
    description:
      "Разгон с 21-метровой башни, прозрачный вираж и настоящий баллистический вылет над бассейном с большим всплеском.",
  },
  {
    id: "slide-titan-funnel",
    kind: "funnel",
    name: "Титаническая воронка",
    icon: "🌪️",
    price: 11500,
    requiredLevel: 8,
    buildMinutes: 210,
    footprint: [26, 28],
    height: 19,
    color: 0xb4a0e9,
    accent: 0xffd680,
    pool: [0, 9, 5.7, 3.6],
    tower: [-9, -8],
    description:
      "Та самая гигантская чаша-воронка: быстрые круги по настоящему склону, закручивание в горловину и выход через прозрачный тоннель.",
  },
  {
    id: "slide-jungle-titan",
    kind: "jungle",
    name: "Изумрудный водопад титанов",
    icon: "🏝️",
    price: 13800,
    requiredLevel: 9,
    buildMinutes: 240,
    footprint: [28, 28],
    height: 19,
    color: 0x68c9ae,
    accent: 0xf3ce8e,
    pool: [3, 8, 7, 4.5],
    tower: [-8, -8],
    description:
      "Целый тропический комплекс: скала, пальмы, каскадный водопад, изумрудный серпантин и большой пруд внизу.",
  },
  {
    id: "slide-rainbow-tsunami",
    kind: "racer",
    name: "Радужное цунами",
    icon: "🌈",
    price: 15200,
    requiredLevel: 10,
    buildMinutes: 270,
    footprint: [26, 32],
    height: 22,
    color: 0xf1a1ce,
    accent: 0x91dfd0,
    pool: [1, 10, 8, 4],
    tower: [-7, -11],
    description:
      "Шесть ярких волнистых дорожек с вершины огромной башни, резкие ускорения и весёлый прыжок на последней волне.",
  },
  {
    id: "slide-abyss-capsule",
    kind: "drop",
    name: "Прозрачная бездна",
    icon: "💎",
    price: 17800,
    requiredLevel: 11,
    buildMinutes: 300,
    footprint: [24, 28],
    height: 28,
    color: 0x92c6ec,
    accent: 0xf3b5d4,
    pool: [3, 8, 6.5, 4.4],
    tower: [-7, -8],
    description:
      "Панорамная стартовая капсула на высоте 28 метров, почти вертикальное падение и скоростной стеклянный вираж.",
  },
  {
    id: "dive-triple-sky",
    kind: "dive",
    name: "Вышка трёх небес · 10 / 20 / 30 м",
    icon: "🪂",
    price: 12400,
    requiredLevel: 8,
    buildMinutes: 210,
    footprint: [26, 28],
    height: 30,
    color: 0x8ebae5,
    accent: 0xffd58a,
    pool: [3, 7, 6.8, 5.7],
    tower: [-7, -7],
    description:
      "Одна настоящая 30-метровая вышка с тремя площадками: котик поднимается и по очереди прыгает с 10, 20 и 30 метров. Брызги, удивлённые глазки и безопасный выход.",
  },
  {
    id: "coaster-thunder-loop",
    kind: "loop",
    name: "Громовая петля",
    icon: "🎢",
    price: 16500,
    requiredLevel: 10,
    buildMinutes: 270,
    footprint: [30, 28],
    height: 25,
    color: 0x62c8de,
    accent: 0xffcf79,
    description:
      "Высокий цепной подъём, отвесный разгон и большая настоящая мёртвая петля. Котик и вагончик вместе переворачиваются на рельсах.",
  },
  {
    id: "coaster-aurora-rift",
    kind: "corkscrew",
    name: "Разлом северного сияния",
    icon: "🌌",
    price: 20500,
    requiredLevel: 12,
    buildMinutes: 330,
    footprint: [32, 28],
    height: 27,
    color: 0x9ba9ec,
    accent: 0x8ee1cb,
    description:
      "Сияющие двойные рельсы, кристальные арки, быстрые виражи и двойной пространственный штопор с точной посадкой в вагончике.",
  },
  {
    id: "coaster-dragon-titan",
    kind: "dragon",
    name: "Драконий титан",
    icon: "🐉",
    price: 24800,
    requiredLevel: 14,
    buildMinutes: 360,
    footprint: [34, 30],
    height: 30,
    color: 0xe7a1b9,
    accent: 0xffce8e,
    description:
      "Тридцатиметровая вершина, огромный золотой дракон, пикирование в пасть скалы и скоростная воздушная петля в драконьем вагончике.",
  },
].map((spec) => ({
  ...spec,
  category: "rides",
  actions: ["ride"],
  rarity: "Легендарное",
  fixedPrice: true,
  mega: true,
}));
export const megaRide = (id) => MEGA_RIDES.find((r) => r.id === id);

// Unassigned wanderers stay outside a complex instead of crossing its raised
// pool, tower or supports. Scripted riders/builders use their own real routes.
export function outsideMegaPlots(x, z, plots, biome, radius = 0.6, out = {}) {
  for (let pass = 0; pass < 3; pass++)
    for (const p of plots) {
      if (p.biome !== biome) continue;
      const hx = p.w / 2 + radius + 0.08,
        hz = p.d / 2 + radius + 0.08,
        dx = x - p.x,
        dz = z - p.z;
      if (Math.abs(dx) >= hx || Math.abs(dz) >= hz) continue;
      if (hx - Math.abs(dx) < hz - Math.abs(dz)) x = p.x + (dx < 0 ? -hx : hx);
      else z = p.z + (dz < 0 ? -hz : hz);
    }
  out.x = x;
  out.z = z;
  return out;
}
