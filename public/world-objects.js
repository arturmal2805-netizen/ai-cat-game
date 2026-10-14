import { BIOMES } from "./game-data.js";
import { BIOME_STYLES } from "./biome-styles.js";
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
  const objects = [];
  for (const b of BIOMES) {
    if (!biomes.includes(b.id)) continue;
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
