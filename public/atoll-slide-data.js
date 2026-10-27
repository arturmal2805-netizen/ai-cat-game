// A separate 4 × 5 collection. Released dream-slide IDs/recipes never change.
export const ATOLL_PRICE_BASE = 80000, ATOLL_PRICE_MAX = 250000;
// Repricing changes purchase costs only; keep the released income rates.
const ATOLL_INCOME_BASE = 240000 * 8;
export const ATOLL_PARK_ID = "atoll-park";
export const ATOLL_PARK = {
  id: ATOLL_PARK_ID, name: "Великий аквапарк", icon: "🌊", price: 0,
  subtitle: "20 велетенських водних мінібіомів · просторі алеї",
  radius: 390, center: [0, -925], arrival: [0, 375], requiredLevel: 20,
  ground: 0x99cdb4, edge: 0x869e9c, foliage: 0x74bb83, accent: 0x5bdded,
  waterpark: true,
};
const specs = [
  ["giant-wave", "Велетенська хвиля", "🌊", 70, 1, 1, 0x37d5e7, 0x9af4f2, 2.4, "Величезний бірюзовий завиток, проїзд крізь хвилю та простора лагуна."],
  ["rock-arch", "Скеляста арка", "🏞️", 63, 1, 1, 0x72dcf6, 0xf2d7a1, 1.25, "Серпантин навколо високої скелі, природна арка та водоспадна завіса."],
  ["rainbow-race", "Веселковий спуск", "🌈", 66, 6, 6, 0x8adff3, 0xf9b3dd, 1.4, "Шість справжніх кольорових доріжок, одночасні заїзди й велика лагуна."],
  ["sky-serpent", "Небесний серпантин", "🌀", 73, 1, 1, 0x79dcf5, 0xc5eefa, 1.55, "Прозорий водний тунель навколо шпиля, крізь скельну арку."],
  ["blue-whirlpool", "Блакитний вир", "💧", 61, 1, 3, 0x39d1e1, 0x9fceba, 1.3, "Велика природна скельна чаша, глибокий вир і окремий вихід до басейну."],
  ["double-serpent", "Подвійний серпантин", "🎀", 69, 2, 2, 0xf88bd3, 0x58dce7, 1.65, "Дві переплетені траси — рожева й бірюзова — з окремими водними фінішами."],
  ["waterfall-cascade", "Каскад водоспадів", "🏝️", 66, 1, 4, 0x7ae6ee, 0xe4d7ad, 1.6, "Чотири великі тераси-басейни, водоспади й послідовні водні спуски."],
  ["emerald-canyon", "Смарагдовий каньйон", "🌿", 64, 1, 1, 0x7aeea5, 0xc7f29a, 1.2, "Зелена стрічка між високими скелями, містками й озерцями."],
  ["crystal-cavern", "Кристальна печера", "💎", 68, 1, 1, 0x86cfff, 0xb69bf4, 1.5, "Відкрита печера, високі сяючі кристали та блакитний водний маршрут."],
  ["root-valley", "Долина коріння", "🌳", 76, 1, 1, 0x79dff0, 0xb6dc89, 1.7, "Велетенське дерево, живе коріння, звивистий спуск і водоспади."],
  ["blue-halfpipe", "Блакитна півтруба", "🩵", 67, 1, 1, 0x60d7ef, 0xb1edf7, 1.35, "Висока U-подібна півтруба: розгін, зліт угору й бризки внизу."],
  ["lagoon-loop", "Кільце лагуни", "⭕", 77, 1, 1, 0x65c6fc, 0xd3abfa, 1.85, "Величезна вертикальна петля над лагуною та власний водний фініш."],
  ["coral-arch", "Коралова арка", "🪸", 65, 1, 1, 0x75deee, 0xf4b9b0, 1.45, "Природна кам’яна арка, коралові сади та широкий вигнутий спуск."],
  ["cloud-islets", "Хмарні острови", "☁️", 79, 1, 1, 0x83def1, 0xe2d9fb, 1.95, "Підвісні зелені острівці, скельні шпилі та легкі водоспади над хмарами."],
  ["flower-lagoon", "Квіткова лагуна", "🌸", 70, 1, 1, 0xc099fb, 0xf9a5d7, 1.6, "Фіолетово-рожевий маршрут, квітучі дерева й величезна квітка над лагуною."],
  ["red-canyon", "Червоний каньйон", "🏜️", 72, 2, 2, 0xffaa8a, 0x77d5ff, 1.55, "Два стрімкі гоночні спуски між теплими теракотовими скелями."],
  ["abyss-bridge", "Міст над безоднею", "🌉", 81, 1, 1, 0x73ddf4, 0xedcf92, 1.8, "Високий прогулянковий міст і майже вертикальний водний спуск у басейн."],
  ["green-valley", "Зелена долина", "🌴", 62, 1, 1, 0x7ce5db, 0xb3dc94, 1.1, "Довгий плавний спуск між зеленими пагорбами, деревами й каскадами."],
  ["purple-vortex", "Фіолетова воронка", "💜", 78, 1, 3, 0xb99af6, 0xf4c18b, 1.9, "Високий розгін у величезну фіолетову чашу, обертання й окремий вихідний канал."],
  ["mega-loops", "Мега-петлі", "🎢", 86, 1, 1, 0x85dafa, 0xf49bd2, 2.8, "Три великі кольорові петлі, швидкі повороти й просторий фінішний басейн."],
];
export const ATOLL_SLIDES = specs.map(([kind, name, icon, height, lanes, channels, color, accent, multiplier, description], i) => ({
  id: "slide-atoll-" + kind, kind, name, icon, height, lanes, channels, color, accent, description,
  referenceCell: {index: i + 1, row: Math.floor(i / 5) + 1, column: i % 5 + 1},
  collection: "Велетенські водні світи · 20 гірок", premiumWater: true, referenceSlide: true,
  category: "rides", actions: ["ride"], rarity: "Легендарное", mega: true, fixedPrice: true,
  price: Math.round((ATOLL_PRICE_BASE + (ATOLL_PRICE_MAX - ATOLL_PRICE_BASE) * i / (specs.length - 1)) / 1000) * 1000,
  incomePerHour: Math.round(ATOLL_INCOME_BASE * multiplier / 30 / 100) * 100,
  requiredLevel: 20, buildMinutes: 240 + i * 6, footprint: [112, 108],
  pool: [0, 33, 19, 12], surfaceY: 1.45, speedScale: 1.05,
}));
export const atollPlot = index => ({x: (index % 5 - 2) * 124, z: (Math.floor(index / 5) - 1.5) * 120});
