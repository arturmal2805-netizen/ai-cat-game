import { CHILL_HOUSES } from "./chill-data.js";
import { WORLD_CENTERS } from './world-layout.js';

export const HOUSING_ID = "cat-homes";
export const HOUSING_CENTER = [...WORLD_CENTERS['cat-homes']];
export const HOUSING_RADIUS = 43;
export const HOUSING_SECTION_PITCH = 98;
// Twelve spacious lots per section; sections have no final index or count cap.
export const HOUSING_LOTS_PER_SECTION = 12;
export const HOUSE_TYPES = CHILL_HOUSES.map((h, i) => ({
  ...h,
  id: "home-" + h.id,
  modelId: h.id,
  category: "property",
  icon: "🏡",
  price: [1600, 2600, 2100, 3200, 1800, 2400, 3600][i],
}));
export const houseType = (id) => HOUSE_TYPES.find((h) => h.id === id);
export function housingPlot(index) {
  const section = Math.floor(index / HOUSING_LOTS_PER_SECTION),
    slot = index % HOUSING_LOTS_PER_SECTION;
  return {
    index,
    section,
    slot,
    x: -section * HOUSING_SECTION_PITCH + [-24, -8, 8, 24][slot % 4],
    z: [-23, -7, 9][Math.floor(slot / 4)],
  };
}
export function housingSection(index) {
  return {
    index,
    x: -index * HOUSING_SECTION_PITCH,
    z: 0,
    radius: HOUSING_RADIUS,
  };
}
export function housingSectionCount(housing) {
  let count = 1;
  for (const h of Object.values(housing?.homes || {}))
    count = Math.max(count, Math.floor(h.plot / HOUSING_LOTS_PER_SECTION) + 1);
  return count;
}
export function housingObjects(home) {
  const p = housingPlot(home.plot);
  return [
    {
      id: home.id + "-bed",
      houseId: home.id,
      kind: "bed",
      type: "bed",
      biome: HOUSING_ID,
      x: p.x - 2.55,
      z: p.z + 0.65,
    },
    {
      id: home.id + "-bath",
      houseId: home.id,
      kind: "bath",
      type: "swim-lagoon",
      biome: HOUSING_ID,
      x: p.x + 3.05,
      z: p.z + 0.65,
    },
  ];
}
