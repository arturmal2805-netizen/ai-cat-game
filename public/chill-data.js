// Keep the crystal save ID; only its territory, architecture and activities change.
export const CHILL_RADIUS = 11.65 * Math.sqrt(5);
export const CHILL_GATE = { x: 0, z: 21.8 };
export const CHILL_FLOOR = 0.5;
export const CHILL_BED_Y = 1.12;
export const CHILL_WATER_Y = 1.35;
export const CHILL_HOUSES = [
  {
    id: "sage",
    name: "Садова вілла",
    x: -14,
    z: 10.5,
    roof: 0x71966e,
    cushion: 0xe8b5c5,
    form: "wave",
  },
  {
    id: "lavender",
    name: "Лавандовий особняк",
    x: 14,
    z: 10.5,
    roof: 0x8b79b6,
    cushion: 0xd2b8e5,
    form: "turret",
  },
  {
    id: "rose",
    name: "Трояндовий дім",
    x: -17,
    z: -1.2,
    roof: 0xc78994,
    cushion: 0xf0c8b9,
    form: "asymmetric",
  },
  {
    id: "blue",
    name: "Блакитна резиденція",
    x: 17,
    z: -1.2,
    roof: 0x769db5,
    cushion: 0xb7d4df,
    form: "dome",
  },
  {
    id: "honey",
    name: "Медове шале",
    x: -13,
    z: -14,
    roof: 0xd1b468,
    cushion: 0xf2d1ac,
    form: "chalet",
  },
  {
    id: "berry",
    name: "Малиновий особняк",
    x: 13,
    z: -14,
    roof: 0xb57795,
    cushion: 0xe0b1ca,
    form: "bow",
  },
  {
    id: "ivy",
    name: "Будинок плющевих снів",
    x: 0,
    z: -19,
    roof: 0x739b8d,
    cushion: 0xc0d8ba,
    form: "garden",
  },
];
export const CHILL_OBJECTS = CHILL_HOUSES.flatMap((h) => [
  {
    id: `chill-${h.id}-bed`,
    type: "bed",
    kind: "bed",
    biome: "sakura",
    houseId: h.id,
    name: `${h.name} · лежанка для двох`,
    x: h.x - 2.55,
    z: h.z + 0.65,
    footprint: [6.3, 3.1],
  },
  {
    id: `chill-${h.id}-bath`,
    type: "swim-lagoon",
    kind: "bath",
    biome: "sakura",
    houseId: h.id,
    name: `${h.name} · тепла ванна`,
    x: h.x + 3.05,
    z: h.z + 0.65,
    rx: 1.5,
    rz: 1.45,
    surfaceY: CHILL_WATER_Y,
    footprint: [3.6, 3.5],
  },
]);
export const chillObject = (id) => CHILL_OBJECTS.find((o) => o.id === id);
export const chillHouse = (id) => CHILL_HOUSES.find((h) => h.id === id);
export function chillSeats(o) {
  return o.kind === "bed"
    ? [-1.5, 1.5].map((dx, i) => ({
        x: o.x + dx,
        z: o.z,
        y: CHILL_BED_Y,
        yaw: i ? -0.2 : 0.2,
      }))
    : [{ x: o.x, z: o.z, y: CHILL_WATER_Y - 0.34, yaw: 0 }];
}
export function chillEntrance(o, seatIndex = 0) {
  const h = chillHouse(o.houseId);
  return {
    x: o.kind === "bed" ? chillSeats(o)[seatIndex].x : o.x,
    z: h.z + 5.7,
    y: 0.16,
  };
}
export const chillReservations = () => [
  ...CHILL_HOUSES.map((h) => ({ x: h.x, z: h.z + 0.5, w: 11.4, d: 9.5 })),
  { x: 0, z: 21.2, w: 8, d: 4.4 },
];
