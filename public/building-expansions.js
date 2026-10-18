// Preserve every island-local saved building/decor coordinate and the original
// themed core. Only these four shore outlines and their map centres expand.
export const BUILDING_EXPANSIONS = {
  candy: { originalRadius: 11.65, areaMultiplier: 5, center: [-88, 130] },
  nature: { originalRadius: 11.65, areaMultiplier: 5, center: [40, 135] },
  rainbow: { originalRadius: 11.65, areaMultiplier: 5, center: [125, 112] },
  clouds: { originalRadius: 11.65, areaMultiplier: 5, center: [132, -8] },
};
export const expandedBuildingRadius = (id) => {
  const spec = BUILDING_EXPANSIONS[id];
  return spec ? spec.originalRadius * Math.sqrt(spec.areaMultiplier) : null;
};
