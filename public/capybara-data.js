// Keep the meadow's save identity. Three times its area, not three times its
// diameter; the original central building yard stays at the original elevation.
export const CAPYBARA_RADIUS = 11.65 * Math.sqrt(3);
export const CAPYBARA_POOLS = [
  {
    id: "lake-summer",
    name: "Блакитна лагуна капібар",
    x: 0,
    z: 5.1,
    rx: 10.5,
    rz: 9.4,
    y: 0,
  },
  {
    id: "lake-summer-upper",
    name: "Смарагдовий верхній каскад",
    x: -1,
    z: -14.2,
    rx: 6,
    rz: 2.2,
    y: 4.2,
  },
  {
    id: "lake-summer-jungle",
    name: "Джунглева купальня",
    x: -14.5,
    z: -4.8,
    rx: 2.7,
    rz: 4.4,
    y: 1.8,
  },
  {
    id: "lake-summer-coconut",
    name: "Кокосова заводь",
    x: 14.4,
    z: -5,
    rx: 2.8,
    rz: 4.5,
    y: 1.2,
  },
];
export const CAPYBARA_RIDES = [
  {
    id: "ride-capybara-mango",
    name: "Манго · велика капібара",
    color: 0xb9834a,
    scale: 1.16,
    icon: "🥭",
    price: 850,
    requiredLevel: 4,
    buildMinutes: 30,
    footprint: [6, 6],
    description:
      "Пухкенька добродушна капібара смішно перевалюється й катає Чичі серед тропічних квітів.",
  },
  {
    id: "ride-capybara-boba",
    name: "Боба · карамельна капібара",
    color: 0xa96d3d,
    scale: 1.04,
    icon: "🧋",
    price: 1000,
    requiredLevel: 4,
    buildMinutes: 45,
    footprint: [6, 6],
    description:
      "Кругленький дослідник джунглів: коротенькі лапки, сонна усмішка та м'яка прогулянка верхи.",
  },
  {
    id: "ride-capybara-coconut",
    name: "Кокос · кремова капібара",
    color: 0xd5b683,
    scale: 1.08,
    icon: "🥥",
    price: 1200,
    requiredLevel: 5,
    buildMinutes: 45,
    footprint: [6, 6],
    description:
      "Світла товстенька капібара з квіткою за вушком. Любить повільні прогулянки й обійми.",
  },
  {
    id: "ride-capybara-float",
    name: "Булочка · лагунний велетень",
    color: 0xbd874b,
    scale: 1.3,
    icon: "💦",
    price: 1450,
    requiredLevel: 5,
    buildMinutes: 60,
    footprint: [7, 5],
    swimming: true,
    description:
      "Велика кумедна капібара плаває у власній блакитній купальні, а Чичі сидить на її спинці.",
  },
];
export const CAPYBARA_OBJECTS = [
  { id: "capybara-mango", type: "ride-capybara-mango", x: 12.4, z: 6 },
  { id: "capybara-boba", type: "ride-capybara-boba", x: -13, z: 7 },
  { id: "capybara-coconut", type: "ride-capybara-coconut", x: 8, z: -13.8 },
  {
    id: "capybara-float",
    type: "ride-capybara-float",
    x: 0,
    z: 5.1,
    dismount: [11.7, 0, 0],
  },
].map((o) => ({ ...o, biome: "summer" }));
export function capybaraHeight(x, z) {
  if (z < -11.3) return 4.2;
  if (x < -11.3 && z < 3) return 1.8;
  if (x > 11.3 && z < -0.2) return 1.2;
  return 0;
}
export function capybaraDryPoint(x, z) {
  for (const p of CAPYBARA_POOLS) {
    const dx = x - p.x,
      dz = z - p.z,
      rx = p.rx + 0.75,
      rz = p.rz + 0.75,
      distance = Math.hypot(dx / rx, dz / rz);
    if (distance >= 1) continue;
    if (distance < 0.01) return { x: p.x + rx, z: p.z };
    return { x: p.x + dx / distance, z: p.z + dz / distance };
  }
  return { x, z };
}
export function capybaraReservations() {
  return [
    { x: 0, z: -11.3, w: 36, d: 0.5 },
    { x: -11.3, z: -4, w: 0.5, d: 14 },
    { x: 11.3, z: -5.7, w: 0.5, d: 11 },
    ...CAPYBARA_OBJECTS.map((o) => {
      const s = CAPYBARA_RIDES.find((s) => s.id === o.type);
      return { x: o.x, z: o.z, w: s.footprint[0], d: s.footprint[1] };
    }),
    ...CAPYBARA_POOLS.map((p) => ({
      ...p,
      rx: p.rx + 0.18,
      rz: p.rz + 0.18,
      w: p.rx * 2 + 0.5,
      d: p.rz * 2 + 0.5,
    })),
  ];
}
