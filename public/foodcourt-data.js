// This island is appended after the established map layout. No existing island
// centre, save ID, unlock rule, cat appearance or purchased plot is replaced.
export const COURT_RADIUS = 11.65 * Math.sqrt(8);
export const COURT_GATE = { x: 0, z: 29 };
export const COURT_VENUES = [
  {
    id: "court-burger",
    type: "court-burger",
    biome: "foodcourt",
    kind: "burger",
    x: -17,
    z: -10,
    w: 12,
    d: 10,
    name: "Котячий McDonald’s",
    icon: "🍔",
    color: 0xe86c55,
    roof: 0xc34f43,
    price: 950,
    buildMinutes: 40,
    rate: 720,
    requiresBuild: true,
    description:
      "Котики жарят бургеры, подают картофель фри и угощают гостей за столиками.",
  },
  {
    id: "court-boba",
    type: "court-boba",
    biome: "foodcourt",
    kind: "boba",
    x: 0,
    z: -16,
    w: 11,
    d: 10,
    name: "Boba Cloud · жемчужное кафе",
    icon: "🧋",
    color: 0xcaa2df,
    roof: 0xb88bcb,
    price: 1200,
    buildMinutes: 70,
    rate: 640,
    requiresBuild: true,
    description:
      "Яркие напитки, настоящие маленькие жемчужины и котики с большими стаканчиками.",
  },
  {
    id: "court-coffee",
    type: "court-coffee",
    biome: "foodcourt",
    kind: "coffee",
    x: 17,
    z: -10,
    w: 12,
    d: 10,
    name: "Murrbucks · котячья кофейня",
    icon: "☕",
    color: 0x8abca2,
    roof: 0x397a64,
    price: 0,
    buildMinutes: 0,
    rate: 560,
    description:
      "Уже открыта: бариста мелет зёрна, варит котячий кофе и подаёт его гостям.",
  },
  {
    id: "court-bakery",
    type: "court-bakery",
    biome: "foodcourt",
    kind: "cookie",
    x: 18,
    z: 10,
    w: 11,
    d: 10,
    name: "Пекарня Кото-Печенька",
    icon: "🍪",
    color: 0xe5bd8c,
    roof: 0xcc976c,
    price: 1450,
    buildMinutes: 100,
    rate: 680,
    requiresBuild: true,
    description:
      "Печенье с ушками, тёплая печь, прозрачные витрины и пушистый пекарь.",
  },
  {
    id: "court-cinema",
    type: "court-cinema",
    biome: "foodcourt",
    kind: "cinema",
    x: -12,
    z: 15.5,
    w: 18,
    d: 18,
    name: "Котокино под облаками",
    icon: "🎬",
    color: 0xa594c9,
    roof: 0x8c77aa,
    price: 0,
    buildMinutes: 0,
    rate: 480,
    description:
      "Настоящий видеоплеер на большом экране и шесть огромных мягких пуфов для друзей.",
  },
];
export const COURT_MENU = {
  burger: {
    id: "burger",
    name: "Бургер и картофель фри",
    icon: "🍔",
    price: 8,
    hunger: 42,
    happiness: 12,
    energy: 8,
  },
  boba: {
    id: "boba",
    name: "Клубничный бабл-ти",
    icon: "🧋",
    price: 6,
    hunger: 25,
    happiness: 12,
    energy: 9,
  },
  coffee: {
    id: "coffee",
    name: "Котячий латте",
    icon: "☕",
    price: 4,
    hunger: 18,
    happiness: 7,
    energy: 12,
  },
  cookie: {
    id: "cookie",
    name: "Печенье с ушками",
    icon: "🍪",
    price: 5,
    hunger: 26,
    happiness: 9,
    energy: 6,
  },
};
export const courtObject = (id) => COURT_VENUES.find((o) => o.id === id);
export const courtType = (id) => COURT_VENUES.find((o) => o.type === id);
export const COURT_FOUNTAIN = {
  id: "lake-foodcourt",
  type: "swim-lagoon",
  biome: "foodcourt",
  name: "Фонтан маленьких желаний",
  x: 0,
  z: 3,
  rx: 3,
  rz: 2.6,
  surfaceY: 0.155,
  shoreY: 0.16,
};
export function courtProject(game, id, now = Date.now()) {
  const o = courtObject(id);
  if (!o || !game.unlocked.includes("foodcourt")) return null;
  const startedAt = Number.isSafeInteger(game.islandConstruction?.[id])
      ? game.islandConstruction[id]
      : 0,
    unstarted = !!o.requiresBuild && !startedAt,
    readyAt = startedAt ? startedAt + o.buildMinutes * 60000 : 0;
  return {
    ...o,
    startedAt,
    readyAt,
    unstarted,
    built: !unstarted && (!readyAt || now >= readyAt),
    progress: unstarted
      ? 0
      : readyAt
        ? Math.max(0, Math.min(1, (now - startedAt) / (readyAt - startedAt)))
        : 1,
  };
}
export function courtBusinessVenues(game) {
  return COURT_VENUES.map((o) => courtProject(game, o.id))
    .filter((o) => o && !o.unstarted)
    .map((o) => ({
      id: o.id,
      item: o.type,
      biome: o.biome,
      x: o.x,
      z: o.z,
      rotation: 0,
      readyAt: o.readyAt,
      startedAt: o.startedAt,
    }));
}
export function courtReservations() {
  return [
    ...COURT_VENUES.map((o) => ({
      id: o.id,
      x: o.x,
      z: o.z,
      w: o.w + 0.8,
      d: o.d + 0.8,
    })),
    { x: 0, z: 3, w: 7, d: 6, rx: 3.5, rz: 3.1 },
    { x: 0, z: 27, w: 5, d: 6 },
  ];
}
export function courtSeats(o) {
  if (o.kind === "cinema")
    return [-1, 0, 1].flatMap((s, i) =>
      [0, 1].map((row) => ({
        x: o.x + s * 5.3,
        z: o.z + row * 5.4,
        y: 1.05,
        index: i * 2 + row,
      })),
    );
  return [
    { x: o.x - 3.65, z: o.z + 1.3, y: 0.67 },
    { x: o.x + 3.65, z: o.z + 1.3, y: 0.67 },
    { x: o.x - 3.65, z: o.z + 6.9, y: 0.67 },
    { x: o.x + 3.65, z: o.z + 6.9, y: 0.67 },
  ];
}
export const COURT_LOCALS = [
  {
    id: "court-caramel",
    name: "Карамелька",
    biome: "foodcourt",
    breed: "calico",
    color: 0xcba67f,
    eyes: 0x8dbfda,
    personality: "С удовольствием пробует печенье и зовёт друзей в кино",
  },
  {
    id: "court-biscuit",
    name: "Печенюшка",
    biome: "foodcourt",
    breed: "british",
    build: "plush",
    color: 0xb6b3af,
    eyes: 0xd6c777,
    personality: "Уютная любительница мягких пуфов и котячьего латте",
  },
  {
    id: "court-pearl",
    name: "Жемчужинка",
    biome: "foodcourt",
    breed: "ragdoll",
    color: 0xe5d8c5,
    eyes: 0x90bedc,
    personality: "Любит цветной бабл-ти, большие окна и новых друзей",
  },
];

export function courtGroundY(p) {
  for (const o of COURT_VENUES)
    if (Math.abs(p.x - o.x) <= o.w / 2 && Math.abs(p.z - o.z) <= o.d / 2)
      return o.kind === "cinema" ? 0.4 : 0.285;
  return 0.16;
}
