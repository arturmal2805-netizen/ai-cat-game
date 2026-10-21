import { BIOMES, byBiome } from "./game-data.js";
import { HOUSING_ID, HOUSING_CENTER, HOUSING_RADIUS, HOUSING_SECTION_PITCH } from "./housing-data.js";
import { spaClear, spaPath } from "./spa-navigation.js";
import { islandHeight } from "./renewed-biomes.js";

// Routes use the same rendered bridge tree as the construction crews. Build
// paths only at departure, not on every animation frame. One throttle in the
// commute controller bounds route preparation across the complete colony.
export function createCatCarNavigation({ bridges, obstacles = () => [], ground = () => true }) {
  const local = (p, b) => ({ x: p.x - b.center[0], z: p.z - b.center[1], y: p.y ?? .16 });
  const world = (p, b) => ({ x: p.x + b.center[0], z: p.z + b.center[1],
    y: .16 + islandHeight(b.id, p.x, p.z) });
  function locate(p) {
    if (p.biome === HOUSING_ID || (p.x < HOUSING_CENTER[0] - HOUSING_RADIUS &&
        Math.abs(p.z - HOUSING_CENTER[1]) < HOUSING_RADIUS)) {
      const section = Math.max(0, Math.round((HOUSING_CENTER[0] - p.x) / HOUSING_SECTION_PITCH));
      return { ...byBiome(HOUSING_ID), section, center: [HOUSING_CENTER[0] - section * HOUSING_SECTION_PITCH, HOUSING_CENTER[1]] };
    }
    return byBiome(p.biome) || BIOMES.reduce((best, b) =>
      Math.hypot(p.x - b.center[0], p.z - b.center[1]) <
      Math.hypot(p.x - best.center[0], p.z - best.center[1]) ? b : best);
  }
  const clear = (p, b, radius) => Math.hypot(p.x, p.z) < (b.radius || 11.65) - radius - .3 &&
    spaClear(p, radius, obstacles(b)) && ground(p, b, radius);
  function parking(target, b, occupied) {
    const origin = local(target, b);
    // Park outside a doorway rather than reserving its central approach lane.
    for (let ring = 0; ring < 18; ring++) {
      const r = 4 + ring * 1.4;
      for (let i = 0; i < 20; i++) {
        const a = i / 20 * Math.PI * 2, p = { x: origin.x + Math.sin(a) * r, z: origin.z + Math.cos(a) * r };
        if (!clear(p, b, 1.5)) continue;
        const at = { ...world(p, b), biome: b.id, yaw: a + Math.PI / 2 },
          door = { x: p.x + Math.cos(at.yaw) * 1.8, z: p.z - Math.sin(at.yaw) * 1.8 };
        if (!clear(door, b, .6) || occupied.some(o => Math.hypot(o.x - at.x, o.z - at.z) < 4.5)) continue;
        return at;
      }
    }
    return null;
  }
  function localRoute(from, to, b, radius) {
    const a = local(from, b), z = local(to, b), obs = obstacles(b),
      ok = (p, r) => clear(p, b, r), cell = radius > 1 ? 1.2 : .6;
    if (!ok(a, radius) || !ok(z, radius)) return null;
    const n = Math.ceil(Math.hypot(a.x-z.x, a.z-z.z) / .35);
    let straight = true;
    for (let i=0; i<=n; i++) if (!ok({ x:a.x+(z.x-a.x)*i/Math.max(1,n), z:a.z+(z.z-a.z)*i/Math.max(1,n) }, radius)) { straight=false;break; }
    if (straight) return [world(a,b),world(z,b)];
    const path = spaPath(a,z,radius,obs,ok,{cell,extent:Math.ceil((b.radius||12)/cell)+1});
    return path ? [world(a,b),...path.map(p=>world(p,b))] : null;
  }
  function route(from, to) {
    const a = locate(from), b = locate(to), result = [];
    // Housing extensions have their own real section bridges and footprints.
    const aSection = a.id === HOUSING_ID ? a.section || 0 : 0,
      bSection = b.id === HOUSING_ID ? b.section || 0 : 0;
    let current = from, island = a;
    function append(target, on, radius=1.05) {
      const segment = localRoute(current,target,on,radius);
      if (!segment) return false;
      result.push(...segment); current=target;return true;
    }
    if (aSection) {
      for (let i=aSection;i>0;i--) {
        const start={x:HOUSING_CENTER[0]-i*HOUSING_SECTION_PITCH+HOUSING_RADIUS-3,z:HOUSING_CENTER[1],y:.18},
          end={x:HOUSING_CENTER[0]-(i-1)*HOUSING_SECTION_PITCH-HOUSING_RADIUS+3,z:HOUSING_CENTER[1],y:.18};
        if (!append(start,island)) return null;
        result.push(end);current=end;island={...byBiome(HOUSING_ID),section:i-1,center:[HOUSING_CENTER[0]-(i-1)*HOUSING_SECTION_PITCH,HOUSING_CENTER[1]]};
      }
    }
    const queue=[{id:island.id,links:[]}], seen=new Set([island.id]); let links;
    for (let i=0;i<queue.length;i++) {
      const n=queue[i]; if(n.id===b.id){links=n.links;break;}
      for(const edge of bridges) {
        const reverse=edge.to===n.id, id=reverse?edge.from:edge.from===n.id?edge.to:null;
        if(id&&!seen.has(id)){seen.add(id);queue.push({id,links:[...n.links,{edge,reverse}]});}
      }
    }
    if(!links)return null;
    for(const {edge,reverse} of links) {
      const next=byBiome(reverse?edge.from:edge.to), raw=reverse?edge.end:edge.start, exit=reverse?edge.start:edge.end,
        inset=(p,on)=>{const dx=p.x-on.center[0],dz=p.z-on.center[1],k=Math.max(0,(Math.hypot(dx,dz)-1.1)/Math.hypot(dx,dz));return {x:on.center[0]+dx*k,z:on.center[1]+dz*k,y:.18};},
        entry=inset(raw,island), landing=inset(exit,next);
      if(!append(entry,island))return null;
      result.push({...raw},{...exit},landing);current=landing;island=next;
    }
    if(bSection) {
      for(let i=0;i<bSection;i++) {
        const start={x:HOUSING_CENTER[0]-i*HOUSING_SECTION_PITCH-HOUSING_RADIUS+3,z:HOUSING_CENTER[1],y:.18},
          end={x:HOUSING_CENTER[0]-(i+1)*HOUSING_SECTION_PITCH+HOUSING_RADIUS-3,z:HOUSING_CENTER[1],y:.18};
        if(!append(start,island))return null;
        result.push(end);current=end;island={...b,section:i+1,center:[HOUSING_CENTER[0]-(i+1)*HOUSING_SECTION_PITCH,HOUSING_CENTER[1]]};
      }
    }
    if(!append(to,island))return null;
    return result;
  }
  return { locate, parking, route, walk:(from,to,radius)=>localRoute(from,to,locate(from),Math.min(radius,.65)) };
}
