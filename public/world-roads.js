// Shore-to-shore links for the complete active map. A glass aquarium is a
// destination, never a transit shortcut through tanks and visitors.
export const WORLD_ROAD_WIDTH=5.2;
export function worldRoads(biomes,heightAt=()=>0) {
  const connected=new Set(['moon']),links=[];
  while(connected.size<biomes.length){
    let best;
    for(const a of biomes)if(connected.has(a.id)&&a.id!=='aquarium')
      for(const b of biomes)if(!connected.has(b.id)){
        const dx=b.center[0]-a.center[0],dz=b.center[1]-a.center[1],length=Math.hypot(dx,dz),
          ux=dx/length,uz=dz/length,
          start={x:a.center[0]+ux*((a.radius||11.65)-.7),y:.18,z:a.center[1]+uz*((a.radius||11.65)-.7)},
          end={x:b.center[0]-ux*((b.radius||11.65)-.7),y:.18,z:b.center[1]-uz*((b.radius||11.65)-.7)},
          sx=end.x-start.x,sz=end.z-start.z,den=sx*sx+sz*sz;
        // The aquarium's real visitor gate is on its positive-Z shore. Its
        // back wall is not a drive-through entrance or a route around tanks.
        if(b.id==='aquarium' && -dz/length<.75)continue;
        if(biomes.some(c=>{
          if(c===a||c===b)return false;
          const t=Math.max(0,Math.min(1,((c.center[0]-start.x)*sx+(c.center[1]-start.z)*sz)/den));
          return Math.hypot(start.x+sx*t-c.center[0],start.z+sz*t-c.center[1])<(c.radius||11.65)+WORLD_ROAD_WIDTH/2;
        }))continue;
        start.y+=heightAt(a.id,start.x-a.center[0],start.z-a.center[1]);
        end.y+=heightAt(b.id,end.x-b.center[0],end.z-b.center[1]);
        const gap=length-(a.radius||11.65)-(b.radius||11.65);
        if(!best||gap<best.gap)best={from:a.id,to:b.id,start,end,gap};
      }
    if(!best)throw Error('Active islands must have unobstructed road connections');
    connected.add(best.to);links.push(best);
  }
  return links;
}
