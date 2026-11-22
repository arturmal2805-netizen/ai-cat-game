// V14 is an independent addition in autumn-local metres. No old venue moves.
export const WATERFRONT = Object.freeze({
  id: "chichi-lagoon-waterfront",
  biome: "autumn",
  x: 1140,
  z: -342,
  y: 1.05,
  width: 650,
  depth: 120,
  restaurant: { x: 0, z: -8, width: 280, depth: 112, height: 82 },
  trampoline: { x: -10, z: 350, radius: 74, y: 1.3 },
  bridge: {
    width: 12,
    start: { x: 0, z: 110 },
    control: { x: -42, z: 190 },
    end: { x: -10, z: 276 },
  },
  arrival: { x: -310, z: 14, y: 1.05 },
  capacity: 8,
});
export const WATERFRONT_ACTIVITIES = Object.freeze(
  [
    {
      id: "waterfront-dine",
      name: "Лагуна · вечеря",
      action: "eat",
      kind: "dine",
      capacity: 12,
      duration: 36,
    },
    {
      id: "waterfront-glass",
      name: "Лагуна · рибки",
      action: "explore",
      kind: "glass",
      capacity: 6,
      duration: 28,
    },
    {
      id: "waterfront-terrace",
      name: "Лагуна · тераса",
      action: "rest",
      kind: "terrace",
      capacity: 8,
      duration: 32,
    },
    {
      id: "waterfront-walk",
      name: "Лагуна · сад",
      action: "explore",
      kind: "walk",
      capacity: 6,
      duration: 32,
    },
    {
      id: "waterfront-bounce",
      name: "Батут · стрибки",
      action: "play",
      kind: "bounce",
      capacity: 6,
      duration: 34,
    },
    {
      id: "waterfront-dive",
      name: "Батут · лагуна",
      action: "swim",
      kind: "dive",
      capacity: 4,
      duration: 48,
    },
  ].map(Object.freeze),
);
export const waterfrontActivity = (id) =>
  WATERFRONT_ACTIVITIES.find((a) => a.id === id);
export const waterfrontOffers = (game) =>
  game.unlocked?.includes("autumn")
    ? WATERFRONT_ACTIVITIES.map((a) => ({
        id: a.id,
        type: a.id,
        biome: "autumn",
        name: a.name,
        action: a.action,
      }))
    : [];
function promenadeEdges(x) {
  const front = 60 + 50 * Math.cos(((x / 330) * Math.PI) / 2),
    back = -58 - 12 * Math.cos((x / 330) * Math.PI),
    centre = (front + back) / 2;
  const cap =
    Math.abs(x) <= 285
      ? 1
      : Math.sqrt(Math.max(0, 1 - ((Math.abs(x) - 285) / 40) ** 2));
  return {
    front: centre + ((front - back) / 2) * cap,
    back: centre - ((front - back) / 2) * cap,
  };
}
export function promenadeFront(x) {
  return promenadeEdges(x).front;
}
export function promenadeBack(x) {
  return promenadeEdges(x).back;
}
export function bridgePoint(t) {
  const b = WATERFRONT.bridge,
    u = 1 - t;
  return {
    x: u * u * b.start.x + 2 * u * t * b.control.x + t * t * b.end.x,
    z: u * u * b.start.z + 2 * u * t * b.control.z + t * t * b.end.z,
    y: WATERFRONT.y + 0.8 * Math.sin(t * Math.PI),
  };
}
export function waterfrontOrigin(centre) {
  return { x: centre[0] + WATERFRONT.x, y: 0, z: centre[1] + WATERFRONT.z };
}
export const WATERFRONT_VIEWS = Object.freeze([
  {
    id: "overview",
    name: "Набережна",
    target: [0, 9, 140],
    eye: [430, 380, 700],
  },
  {
    id: "restaurant",
    name: "Ресторан «Лагуна»",
    target: [0, 14, 0],
    eye: [180, 96, 190],
  },
  {
    id: "interior",
    name: "Зал ресторану",
    target: [-5, 9, -2],
    eye: [72, 17, 43],
    inside: false,
  },
  {
    id: "glass",
    name: "Скляна підлога",
    target: [0, -4, 9],
    eye: [25, 30, 45],
    inside: false,
  },
  {
    id: "underwater",
    name: "Під рестораном",
    target: [0, -1, 5],
    eye: [80, -19, 98],
  },
  {
    id: "trampoline",
    name: "Батут",
    target: [-10, 3, 350],
    eye: [145, 158, 510],
  },
  {
    id: "jumps",
    name: "Стрибки у воду",
    target: [-10, 4, 350],
    eye: [158, 45, 425],
  },
]);
