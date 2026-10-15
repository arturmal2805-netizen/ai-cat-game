// Stable physical targets are shared by rendering, AI validation and dragging.
// The biome keeps its old ID, so unlocking it never discards a player's world.
export const COTTON_RIDES = [
  {
    id: "ride-cupcake-wheel",
    name: "Колесо сахарных кексов",
    icon: "🎡",
    footprint: [10, 6],
    price: 2600,
    requiredLevel: 8,
    buildMinutes: 180,
    description:
      "Золотая звезда, десять кексов-кабинок и розовые огоньки над сладким островом.",
  },
  {
    id: "coaster-piglet-express",
    name: "Хрю-экспресс сладкой ваты",
    icon: "🎢",
    footprint: [16, 9],
    price: 4800,
    requiredLevel: 12,
    buildMinutes: 360,
    description:
      "Поезд-хрюшка мчится по трём большим волнам карамельных рельсов.",
  },
  {
    id: "ride-sugar-teacups",
    name: "Чайные чашечки сердечек",
    icon: "☕",
    footprint: [7, 7],
    price: 1800,
    requiredLevel: 6,
    buildMinutes: 90,
    description:
      "Пастельные чашечки кружатся на сахарном блюдце — каждая со своей улыбчивой хрюшкой.",
  },
  {
    id: "slide-marshmallow",
    name: "Зефирный водный серпантин",
    icon: "🌈",
    footprint: [8, 10],
    price: 3200,
    requiredLevel: 9,
    buildMinutes: 240,
    description:
      "Три жемчужные дорожки, брызги розовой воды и мягкий прыжок внизу.",
  },
  ...[
    ["ride-pig-rose", "Розочка · сахарная хрюшка", "🐷"],
    ["ride-pig-peach", "Персик · пятнистая хрюшка", "🐽"],
    ["ride-pig-lilac", "Зефирка · лиловая хрюшка", "💜"],
  ].map(([id, name, icon]) => ({
    id,
    name,
    icon,
    footprint: [5, 5],
    price: 1100,
    requiredLevel: 5,
    buildMinutes: 60,
    description:
      "Живая добрая хрюшка: топает копытцами, шевелит ушками и катает Чичи на своей спинке.",
  })),
];
export const COTTON_OBJECTS = [
  { id: "cotton-wheel", type: "ride-cupcake-wheel", x: -15, z: -6 },
  { id: "cotton-express", type: "coaster-piglet-express", x: 5, z: -16 },
  { id: "cotton-teacups", type: "ride-sugar-teacups", x: 16, z: 0 },
  { id: "cotton-slide", type: "slide-marshmallow", x: 13, z: 11 },
  { id: "cotton-pig-rose", type: "ride-pig-rose", x: -17, z: 10 },
  { id: "cotton-pig-peach", type: "ride-pig-peach", x: -12, z: 16 },
  { id: "cotton-pig-lilac", type: "ride-pig-lilac", x: 17, z: -8 },
].map((o) => ({ ...o, biome: "clockwork" }));
export const COTTON_POOLS = [
  {
    id: "lake-clockwork",
    x: -0.5,
    z: 16,
    rx: 8,
    rz: 4.2,
    y: 0,
    name: "Розовая зефирная лагуна",
  },
  {
    id: "lake-clockwork-upper",
    x: -5,
    z: -14,
    rx: 4,
    rz: 2,
    y: 2.4,
    name: "Верхний клубничный каскад",
  },
  {
    id: "lake-clockwork-cascade",
    x: -16,
    z: 0,
    rx: 3,
    rz: 2,
    y: 1.2,
    name: "Жемчужная розовая заводь",
  },
];
export function cottonHeight(x, z) {
  if (Math.hypot(x, z) < 11.2) return 0;
  if (z < -11) return 2.4;
  if (x < -11 && z < 3) return 1.2;
  return 0;
}
export function cottonReservations() {
  return [
    ...COTTON_OBJECTS.map((o) => {
      const s = COTTON_RIDES.find((r) => r.id === o.type);
      return { x: o.x, z: o.z, w: s.footprint[0], d: s.footprint[1] };
    }),
    ...COTTON_POOLS.map((p) => ({
      ...p,
      w: p.rx * 2 + 0.4,
      d: p.rz * 2 + 0.4,
      rx: p.rx + 0.2,
      rz: p.rz + 0.2,
    })),
  ];
}
