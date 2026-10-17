// Appended destination: stable local coordinates, no existing biome migration.
export const BIKINI_RADIUS = 11.65 * Math.sqrt(7);
export const BIKINI_GATE = { x: 0, z: 27 };
export const BIKINI_HOUSES = [
  { kind: "tube", x: -11, z: -25, w: 3, d: 3 },
  { kind: "tube", x: 15, z: -23, w: 3, d: 3 },
  { kind: "tube", x: -27, z: 0, w: 3, d: 3 },
  { kind: "pineapple", x: -17, z: -12, w: 7, d: 7 },
  { kind: "moai", x: -3, z: -21, w: 6, d: 6 },
  { kind: "rock", x: -21, z: 7, w: 7, d: 6 },
  { kind: "lighthouse", x: 23, z: -16, w: 3, d: 3 },
  { kind: "tube", x: 5, z: -24, w: 3, d: 3 },
  { kind: "tube", x: 23, z: 5, w: 3, d: 3 },
];
export const BIKINI_POOLS = [
  {
    id: "lake-bikini",
    type: "swim-lagoon",
    biome: "bikini",
    name: "Голубая лагуна Бикини-Боттом",
    x: 0,
    z: -6,
    rx: 4.2,
    rz: 5,
    surfaceY: 0.155,
    shoreY: 0.16,
  },
  {
    id: "lake-bikini-shells",
    type: "swim-lagoon",
    biome: "bikini",
    name: "Лагуна ракушек",
    x: 19,
    z: 16,
    rx: 3.5,
    rz: 3.4,
    surfaceY: 0.155,
    shoreY: 0.16,
  },
];
export const BIKINI_RESTAURANT = {
  id: "bikini-krusty",
  type: "bikini-krusty",
  biome: "bikini",
  kind: "burger",
  x: 13,
  z: -7,
  w: 12,
  d: 10,
  name: "Красти Краб",
  icon: "🍔",
  color: 0xc69b70,
  roof: 0x9c6345,
  price: 0,
  buildMinutes: 0,
  rate: 760,
  nautical: true,
  description:
    "Губка Боб жарит крабсбургеры, котики заказывают и едят за столиками. Открытый интерьер, монеты и XP.",
};
export const BIKINI_FRIENDS = [
  {
    id: "bikini-sponge",
    type: "bikini-sponge",
    biome: "bikini",
    kind: "sponge",
    name: "Губка Боб",
    x: -7,
    z: 7,
    footprint: [3, 3],
  },
  {
    id: "bikini-patrick",
    type: "bikini-patrick",
    biome: "bikini",
    kind: "patrick",
    name: "Патрик",
    x: 8,
    z: 17,
    footprint: [3, 3],
  },
];
export const bikiniFriend = (id) => BIKINI_FRIENDS.find((f) => f.id === id);
export const BIKINI_ACTIONS = {
  sponge: [
    ["greet", "👋 Поздороваться"],
    ["five", "🐾 Дать пять"],
    ["hug", "💛 Обняться"],
    ["pet", "🐈 Погладить"],
    ["play", "🫧 Поиграть с пузырями"],
    ["dance", "🎵 Потанцевать"],
  ],
  patrick: [
    ["greet", "👋 Поздороваться"],
    ["photo", "📸 Совместное фото"],
    ["sit", "🌤️ Посидеть рядом"],
  ],
};
export const BIKINI_LOCALS = [
  {
    id: "bikini-sandy-cat",
    name: "Песчинка",
    biome: "bikini",
    breed: "calico",
    color: 0xd2aa82,
    eyes: 0x8fceab,
    personality: "Ловит пузыри и дружит с Губкой Бобом",
  },
  {
    id: "bikini-shell-cat",
    name: "Ракушечка",
    biome: "bikini",
    breed: "british",
    build: "plush",
    color: 0xb8babd,
    eyes: 0xd6c477,
    personality: "Любит крабсбургеры и тихие лагуны",
  },
];
export function bikiniReservations() {
  return [
    ...BIKINI_HOUSES.map((h) => ({ ...h, w: h.w + 1, d: h.d + 1 })),
    ...BIKINI_POOLS.map((p) => ({ ...p, w: p.rx * 2 + 1, d: p.rz * 2 + 1 })),
    { ...BIKINI_RESTAURANT, w: 13, d: 17, z: -4 },
    { x: -7, z: 10, w: 14, d: 13 },
    { x: 8, z: 20, w: 10, d: 10 },
    { x: 0, z: 27, w: 6, d: 6 },
  ];
}
