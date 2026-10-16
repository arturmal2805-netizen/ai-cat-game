// The old lagoon keeps its save identity, price and unlock level.
export const SPA_RADIUS = 11.65 * Math.sqrt(3);
export const SPA_GATE = { x: 0, z: 15.6 };
export const SPA_POOL = {
  id: "lake-water",
  x: 0,
  z: 1,
  rx: 6.5,
  rz: 6.2,
  y: 0,
};
export const SPA_JACUZZI = {
  id: "spa-jacuzzi",
  x: 14.1,
  z: 4.5,
  rx: 3.2,
  rz: 3.2,
  y: 0.3,
};
export const SPA_OBJECTS = [
  {
    ...SPA_POOL,
    type: "swim-lagoon",
    surfaceY: 0.155,
    name: "Cat SPA · великий басейн",
    actions: ["swim"],
  },
  {
    id: "spa-lounge",
    type: "bed",
    x: -14.2,
    z: 0,
    name: "Спільний м’який лежак",
    footprint: [7.2, 6.4],
  },
  { ...SPA_JACUZZI, type: "bed", name: "Тепле джакузі", footprint: [6.8, 6.8] },
  {
    id: "spa-bar",
    type: "cat-barista",
    x: 9.2,
    z: -13,
    name: "Cat SPA · бар біля басейну",
    actions: ["eat"],
    footprint: [8, 4],
  },
].map((o) => ({ ...o, biome: "water" }));
export const SPA_DRINKS = [
  {
    id: "milk",
    name: "Котяче молочко",
    icon: "🥛",
    price: 12,
    hunger: 22,
    energy: 6,
    happiness: 7,
    color: 0xfff2da,
  },
  {
    id: "berry",
    name: "Ягідний котейль",
    icon: "🍓",
    price: 24,
    hunger: 32,
    energy: 10,
    happiness: 12,
    color: 0xf3a9c3,
  },
  {
    id: "coconut",
    name: "Кокосова хмаринка",
    icon: "🥥",
    price: 18,
    hunger: 26,
    energy: 8,
    happiness: 10,
    color: 0xe7f5df,
  },
];
export const spaObject = (id) => SPA_OBJECTS.find((o) => o.id === id);
export function spaReservations() {
  return [
    { ...SPA_POOL, rx: 7, rz: 6.7, w: 14, d: 13.4 },
    { x: 0, z: 8.8, w: 3.8, d: 3.6 },
    { x: 0, z: 15.4, w: 7, d: 2.5 },
    ...SPA_OBJECTS.filter((o) => o.id !== "lake-water").map((o) => ({
      x: o.x,
      z: o.z,
      w: o.footprint[0] + 0.6,
      d: o.footprint[1] + 0.6,
    })),
  ];
}
export const SPA_SEATS = {
  "spa-lounge": [-2.2, 0, 2.2].flatMap((x, column) =>
    [-1.15, 1.15].map((z, row) => ({
      x: -14.2 + x,
      z,
      y: 0.91,
      yaw: 0.35 + column * 0.2,
      column,
      row,
    })),
  ),
  "lake-water": [-2.6, 2.6].flatMap((x) =>
    [-2.2, 2.2].map((z) => ({ x, z: z + 1, y: -0.28, yaw: 0 })),
  ),
  "spa-jacuzzi": Array.from({ length: 4 }, (_, i) => {
    const a = Math.PI / 4 + (i * Math.PI) / 2;
    return {
      x: 14.1 + Math.sin(a) * 1.8,
      z: 4.5 + Math.cos(a) * 1.8,
      y: 0.02,
      yaw: a + Math.PI,
    };
  }),
  "spa-bar": [5.9, 8.1, 10.3, 12.5].map((x) => ({
    x,
    z: -8.2,
    y: 0.76,
    yaw: Math.PI,
  })),
};
export const SPA_ENTRANCES = {
  "lake-water": { x: 0, z: 9.8 },
  "spa-lounge": { x: -14.2, z: 5.1 },
  "spa-jacuzzi": { x: 14.1, z: 9.8 },
  "spa-bar": { x: 15.1, z: -6.2 },
};
