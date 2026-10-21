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

// Persistent island-local addresses never depend on these world-map centres.
export const RETIRED_BIOME_IDS = Object.freeze([
  'lotus', 'crystal', 'mushrooms', 'desert', 'beach', 'aquapark',
  'rainbow', 'nature', 'bamboo', 'dusk',
  'stars', 'coral', 'clouds',
]);
const retired = new Set(RETIRED_BIOME_IDS);
export const isRetiredBiome = id => retired.has(id);
export const WORLD_CENTERS = Object.freeze({
  'moon':[0,0],
  'homestead':[0,-245],
  'jobcity':[-92,55],
  'cat-homes':[-210,55],
  'aquarium':[18.3427,51.7981],
  'foodcourt':[81.1833,8.609],
  'bikini':[87.9955,77.1497],
  'autumn':[-12.5837,116.6368],
  'sakura':[46.4777,122.8444],
  'clouds':[135.8717,-24.2511],
  'candy':[136.9242,39.6054],
  'clockwork':[-137.2347,-28.3119],
  'water':[-60.0521,141.3472],
  'summer':[14.5771,162.7468],
  'winter':[92.9434,128.5351],
  'volcano':[-26.5033,162.7201],
  'galaxy':[137.7209,85.2487],
  'ice':[-163.1679,5.485],
  'stars':[-28.0476,-1.7155],
  'coral':[29.298,-2.0487],
});
// Reserved, mutually disjoint districts outside the former homestead shore.
// Repeated migrations use identical offsets; purchase IDs never change.
export function retiredDistrict(id) {
  const index=RETIRED_BIOME_IDS.indexOf(id);
  if(index<0)return null;
  // Never redistribute released district addresses when retiring another
  // island: cached devices must migrate a purchase to the same coordinates.
  const original = index < 10,
    angle = original ? index*Math.PI*2/10 : (index-10)*Math.PI*2/3,
    radius = original ? 185 : 115;
  return {x:Math.round(Math.sin(angle)*radius*1e6)/1e6,
    z:Math.round(Math.cos(angle)*radius*1e6)/1e6};
}
