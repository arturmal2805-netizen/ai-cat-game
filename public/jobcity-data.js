import { WORLD_CENTERS } from './world-layout.js';
// Appended destination: never run the established island spacing algorithm again.
export const JOB_CITY_ID = "jobcity";
export const JOB_CITY_RADIUS = 67;
export const JOB_CITY_CENTER = [...WORLD_CENTERS.jobcity];
export const JOB_MINUTE_MS = 1000;
export const JOB_DAY_MINUTES = 1440;
export const JOB_START = 12 * 60;
export const JOB_END = 19 * 60;
export const JOB_CAPACITY = 6;
export const JOB_BUSINESSES = [
  [
    "bank",
    "Котячий банк",
    "🏦",
    -32,
    -22,
    0xe9bb54,
    90,
    900,
    "Каси, рахунки та затишне сховище",
  ],
  [
    "crypto",
    "Криптоофіс",
    "📈",
    0,
    -22,
    0x557dbd,
    110,
    1100,
    "Комп’ютери, графіки та командні обговорення",
  ],
  [
    "factory",
    "Котяче виробництво",
    "⚙️",
    32,
    -22,
    0xd96c5f,
    100,
    1050,
    "Конвеєри, роботизовані лапки та майстерня",
  ],
  [
    "furniture",
    "Меблевий дім",
    "🛋️",
    -32,
    19,
    0xcf726b,
    85,
    800,
    "Дивани, ліжечка та допомога покупцям",
  ],
  [
    "estate",
    "Котячі будиночки",
    "🏡",
    0,
    23,
    0x72a16c,
    115,
    1000,
    "Макет міста, плани й нові оселі",
  ],
  [
    "cars",
    "Мур-Моторс",
    "🚗",
    32,
    19,
    0x688ec7,
    105,
    1200,
    "Автосалон, тестові поїздки та парковка",
  ],
].map(([kind, name, icon, x, z, color, wage, rate, description]) => ({
  id: "job-" + kind,
  type: "job-" + kind,
  biome: JOB_CITY_ID,
  kind,
  name,
  icon,
  x,
  z,
  color,
  wage,
  rate,
  description,
  w: 25,
  d: 20,
  h: 15.5,
  capacity: JOB_CAPACITY,
}));
export const JOB_KINDS = JOB_BUSINESSES.map((b) => b.kind);
export const jobBusiness = (id) =>
  JOB_BUSINESSES.find((b) => b.id === id || b.kind === id);
export const JOB_CARS = [
  {
    id: "car-peach",
    name: "Персиковий Мурчик",
    icon: "🚗",
    price: 1200,
    color: 0xef9bac,
    speed: 8,
  },
  {
    id: "car-cloud",
    name: "Блакитна Хмаринка",
    icon: "🚙",
    price: 1800,
    color: 0x6cbedc,
    speed: 9,
  },
  {
    id: "car-lime",
    name: "Фісташковий Жучок",
    icon: "🚘",
    price: 2400,
    color: 0xa2ce7f,
    speed: 10,
  },
  {
    id: "car-lavender",
    name: "Лавандовий Круїзер",
    icon: "🚙",
    price: 3600,
    color: 0xb99cdd,
    speed: 9.5,
  },
  {
    id: "car-sun",
    name: "Золотий Мурр GT",
    icon: "🏎️",
    price: 6500,
    color: 0xeab85c,
    speed: 12,
  },
];
export const jobCar = (id) => JOB_CARS.find((c) => c.id === id);
export const JOB_CITY_LOCALS = JOB_BUSINESSES.flatMap((b, i) =>
  [0, 1].map((j) => ({
    id: "jobcat-" + b.kind + "-" + j,
    name: [
      ["Кеш", "Пенні"],
      ["Біт", "Графік"],
      ["Гайка", "Молотик"],
      ["Плюшка", "Велюр"],
      ["Ключик", "Дахик"],
      ["Турбо", "Піксель"],
    ][i][j],
    biome: JOB_CITY_ID,
    color: [0xd6c9ae, 0xa3a4ac, 0xce9a6c, 0xebe1d0, 0x979ba7, 0xe0b799][
      (i + j) % 6
    ],
    size: j ? 0.75 : 0.9,
    preferredJob: b.kind,
    jobCityLocal: true,
    hat: false,
  })),
);
export function jobStations(b) {
  return Array.from({ length: 6 }, (_, i) => ({
    id: b.id + "-seat-" + i,
    job: b.kind,
    floor: Math.floor(i / 2),
    x: b.x + (i % 2 ? 4 : -4),
    y: 0.32 + Math.floor(i / 2) * 4.6,
    z: b.z + 2.15,
    yaw: 0,
  }));
}
export const JOB_CITY_GATE = { x: 0, z: 59 };
export const JOB_PARKING = Array.from({ length: 12 }, (_, i) => ({
  x: -36 + i * 6.5,
  z: 48,
  y: 0.32,
}));
export function jobReservations() {
  return [
    ...JOB_BUSINESSES.map((b) => ({ x: b.x, z: b.z, w: b.w + 4, d: b.d + 3 })),
    { x: 0, z: 0, radius: 6 },
    { x: 0, z: 48, w: 92, d: 12 },
    ...[-50, -16, 16, 50].map((x) => ({ x, z: 1, w: 4.7, d: 82 })),
    ...[-38, 40].map((z) => ({ x: 0, z, w: 104, d: 4.7 })),
    { x: -33, z: 0, w: 38, d: 4.7 },
    { x: 33, z: 0, w: 38, d: 4.7 },
  ];
}
