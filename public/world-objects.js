import {ZOO_ID,ZOO_EXHIBITS} from './zoo-data.js';
import { JOB_BUSINESSES } from "./jobcity-data.js";
import { AQUARIUM_TANKS } from "./aquarium-data.js";
import {
  BIKINI_RESTAURANT,
  BIKINI_FRIENDS,
  BIKINI_POOLS,
} from "./bikini-data.js";
import {
  COURT_VENUES,
  COURT_FOUNTAIN,
  courtProject,
} from "./foodcourt-data.js";
import { MOSA_OBJECTS } from "./mosasaur-data.js";
import { CHILL_OBJECTS } from "./chill-data.js";
import { CAPYBARA_OBJECTS, CAPYBARA_POOLS } from "./capybara-data.js";
import { islandProject } from "./island-construction.js";
import { RENEWED_ISLANDS, ISLAND_RIDES } from "./renewal-data.js";
import { COTTON_OBJECTS, COTTON_POOLS } from "./cotton-data.js";
import { BIOMES } from "./game-data.js";
import { BIOME_STYLES } from "./biome-styles.js";
import { SPA_OBJECTS } from "./spa-data.js";
import { MAGIC_FARM_OBJECTS } from './magic-farms-data.js';
export const PARK_RIDES = [
  {
    id: "royal-rainbow",
    type: "coaster-rainbow-launch",
    biome: "aquapark",
    x: 8,
    z: 6,
  },
  {
    id: "royal-cascade",
    type: "slide-royal-cascade",
    biome: "aquapark",
    x: 9,
    z: -7,
  },
  {
    id: "royal-vortex",
    type: "slide-vortex-bowl",
    biome: "aquapark",
    x: -10,
    z: -8,
  },
];
export function permanentObjects(biomes) {
  biomes=biomes.filter(id=>BIOMES.some(b=>b.id===id));
  const objects = [];
  if(biomes.includes(ZOO_ID))objects.push(...ZOO_EXHIBITS);
  objects.push(...MAGIC_FARM_OBJECTS.filter(o=>biomes.includes(o.biome)));
  if (biomes.includes("jobcity")) objects.push(...JOB_BUSINESSES);
  if (biomes.includes("aquarium")) objects.push(...AQUARIUM_TANKS);
  if (biomes.includes("bikini"))
    objects.push(BIKINI_RESTAURANT, ...BIKINI_FRIENDS, ...BIKINI_POOLS);
  if (biomes.includes("foodcourt"))
    objects.push(...COURT_VENUES, COURT_FOUNTAIN);
  if (biomes.includes("sakura")) objects.push(...CHILL_OBJECTS);
  if (biomes.includes("water")) objects.push(...SPA_OBJECTS);
  for (const b of BIOMES) {
    if (!biomes.includes(b.id)) continue;
    if (
      ["foodcourt", "bikini", "aquarium", "jobcity", "cat-homes",ZOO_ID].includes(b.id)
    )
      continue;
    if (b.id === "autumn") {
      objects.push(...MOSA_OBJECTS);
      continue;
    }
    if (RENEWED_ISLANDS[b.id]) {
      objects.push(...ISLAND_RIDES.filter((r) => r.biome === b.id));
      const upper = RENEWED_ISLANDS[b.id].upper;
      objects.push({
        id: "lake-" + b.id + "-upper",
        type: "swim-lagoon",
        biome: b.id,
        x: upper[0],
        z: upper[1],
        rx: upper[2],
        rz: upper[3],
        surfaceY: 2.555,
        shoreY: 2.55,
        name: "Каскадная лагуна · " + b.name,
      });
    }
    const river = BIOME_STYLES[b.id]?.river;
    if (river)
      objects.push({
        id: "lake-" + b.id + "-river",
        type: "swim-lagoon",
        biome: b.id,
        x: river[0],
        z: river[1],
        rx: river[2],
        rz: river[3],
        surfaceY: 0.155,
        name: "Речной каскад · " + b.name,
      });
    const w = BIOME_STYLES[b.id]?.water;
    if (w)
      objects.push({
        id: "lake-" + b.id,
        type: "swim-lagoon",
        biome: b.id,
        x: w[0],
        z: w[1],
        rx: w[2],
        rz: w[3],
        surfaceY: 0.155,
        name: "Лагуна · " + b.name,
      });
  }
  if (biomes.includes("summer"))
    objects.push(
      ...CAPYBARA_OBJECTS,
      ...CAPYBARA_POOLS.map((p) => ({
        ...p,
        biome: "summer",
        type: "swim-lagoon",
        surfaceY: p.y + 0.155,
        shoreY: p.y + 0.16,
      })),
    );
  if (biomes.includes("clockwork"))
    objects.push(
      ...COTTON_OBJECTS,
      ...COTTON_POOLS.map((p) => ({
        ...p,
        biome: "clockwork",
        type: "swim-lagoon",
        surfaceY: p.y + 0.155,
        shoreY: p.y + 0.16,
      })),
    );
  if (biomes.includes("aquapark"))
    objects.push(...PARK_RIDES, {
      id: "lake-aquapark-upper",
      type: "swim-lagoon",
      biome: "aquapark",
      x: -3,
      z: -4.4,
      rx: 3.7,
      rz: 1.25,
      surfaceY: 3.455,
      shoreY: 3.15,
      name: "Верхняя королевская лагуна",
    });
  return objects;
}

export function islandObjects(
  game,
  { now = Date.now(), includeBuilding = false } = {},
) {
  return permanentObjects(game.unlocked)
    .map((o) => {
      const p = islandProject(game, o.id, now);
      if (p?.unstarted)
        return {
          ...o,
          unstarted: true,
          readyAt: 900000000000000,
          startedAt: 0,
        };
      return p?.readyAt
        ? { ...o, startedAt: p.startedAt, readyAt: p.readyAt }
        : o;
    })
    .filter(
      (o) =>
        includeBuilding || (!o.unstarted && (!o.readyAt || now >= o.readyAt)),
    );
}
