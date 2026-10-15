// Keep the authored arrangement, while leaving real space for enlarged shores.
// Save positions are island-local; only the map centres change.
export const SHORE_MARGIN = 0.65;
export const MIN_ISLAND_GAP = 3;
export const islandShoreRadius = (biome) =>
  (biome.radius || 11.65) + SHORE_MARGIN;

export function separateIslandCenters(biomes) {
  let scale = 1;
  for (let i = 0; i < biomes.length; i++)
    for (let j = i + 1; j < biomes.length; j++) {
      const a = biomes[i],
        b = biomes[j],
        distance = Math.hypot(
          a.center[0] - b.center[0],
          a.center[1] - b.center[1],
        );
      if (!distance) throw Error("Island centres must be distinct");
      scale = Math.max(
        scale,
        (islandShoreRadius(a) + islandShoreRadius(b) + MIN_ISLAND_GAP) /
          distance,
      );
    }
  // Round the original 27-unit grid upwards; never round the clearance down.
  scale = Math.ceil(scale * 27 - 1e-8) / 27;
  const anchor = biomes.find((b) => b.id === "moon")?.center || [0, 0];
  for (const b of biomes)
    b.center = b.center.map(
      (v, axis) =>
        Math.round((anchor[axis] + (v - anchor[axis]) * scale) * 1e6) / 1e6,
    );
  return scale;
}
