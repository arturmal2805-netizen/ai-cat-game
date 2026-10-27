// A far overview must not allocate/warm twenty enormous purchased complexes.
// The existing shared scene scheduler takes over once a nearby plot is needed.
export function atollPreparationNeeded(placement, biome, {focused,look,distance,visible,moving=false,pending=0,requested=false}) {
  if(!visible||moving||pending||focused!==placement.biome)return false;
  if(requested)return true;
  if(distance>520)return false;
  return Math.hypot(biome.center[0]+placement.x-look.x,biome.center[1]+placement.z-look.z)<=140;
}
