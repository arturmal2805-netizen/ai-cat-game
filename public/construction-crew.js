import * as THREE from "three";
import { BIOMES, byBiome, byItem, biomeReservations } from "./game-data.js";
import { islandHeight } from "./renewed-biomes.js";
import { spaPath, spaClear } from "./spa-navigation.js";
const handleGeo = new THREE.CylinderGeometry(0.032, 0.04, 0.5, 8),
  headGeo = new THREE.CylinderGeometry(0.085, 0.085, 0.24, 10),
  handlePaint = new THREE.MeshStandardMaterial({
    color: 0xc79b69,
    roughness: 0.83,
  }),
  headPaint = new THREE.MeshStandardMaterial({
    color: 0xe7b982,
    roughness: 0.36,
    metalness: 0.18,
  });
for (const g of [handleGeo, headGeo]) g.userData.sharedScenery = true;
for (const m of [handlePaint, headPaint]) m.userData.sharedScenery = true;
export function attachBuilderHammer(model) {
  const i = model.userData.legs.findIndex(
      (leg) => leg.position.z > 0 && leg.position.x < 0,
    ),
    ankle = model.userData.legJoints[i]?.ankle;
  if (!ankle) return null;
  const g = new THREE.Group(),
    handle = new THREE.Mesh(handleGeo, handlePaint),
    head = new THREE.Mesh(headGeo, headPaint);
  g.name = "Cat builder little hammer";
  g.position.set(0, 0.03, 0.23);
  handle.position.y = 0.18;
  head.position.y = 0.43;
  head.rotation.z = Math.PI / 2;
  handle.castShadow = head.castShadow = true;
  g.add(handle, head);
  ankle.add(g);
  g.visible = false;
  return g;
}
export function constructionSites(groups, now = Date.now()) {
  return [...groups.values()]
    .filter(
      (g) =>
        !g.userData.unstarted &&
        !g.userData.built &&
        g.userData.placement?.readyAt > now,
    )
    .map((g) => {
      const p = g.userData.placement,
        f = p.footprint || byItem(p.item).footprint,
        [w, d] = p.rotation % 2 ? [f[1], f[0]] : f;
      return {
        id: p.id,
        biome: p.biome,
        x: p.x,
        z: p.z,
        w,
        d,
        readyAt: p.readyAt,
      };
    });
}
const local = (p, b) => ({ x: p.x - b.center[0], z: p.z - b.center[1] });
const global = (p, b) => ({
  x: p.x + b.center[0],
  z: p.z + b.center[1],
  y: 0.16 + islandHeight(b.id, p.x, p.z),
});
// Use the actual rendered bridge tree. Work never changes the persisted timer,
// price, XP or purchases; it is a reversible, free visual background activity.
export function createConstructionCrew({
  getSites,
  getObstacles = () => [],
  bridges = [],
}) {
  const workers = new Map(),
    retryAt = new Map();
  let nextAssignment = -Infinity;
  function localRoute(from, to, b, radius, extra = []) {
    const obstacles = [...getObstacles(b.id), ...extra],
      clear = (p, r, obs) =>
        Math.hypot(p.x, p.z) <=
          (b.radius || 11.65) - 0.15 - Math.min(r, 0.45) && spaClear(p, r, obs),
      path = spaPath(local(from, b), local(to, b), radius, obstacles, clear, {
        extent: Math.ceil((b.radius || 11.65) / 0.6) + 1,
      });
    return path?.map((p) => global(p, b));
  }
  function journey(from, biome, site, slot, radius) {
    const a = byBiome(biome),
      b = byBiome(site.biome),
      goal = global(slot, b);
    if (a.id === b.id) return localRoute(from, goal, b, radius);
    const queue = [{ id: a.id, links: [] }],
      seen = new Set([a.id]);
    let route = null;
    while (queue.length) {
      const n = queue.shift();
      if (n.id === b.id) {
        route = n.links;
        break;
      }
      for (const edge of bridges) {
        const reverse = edge.to === n.id,
          id = reverse ? edge.from : edge.from === n.id ? edge.to : null;
        if (id && !seen.has(id)) {
          seen.add(id);
          queue.push({ id, links: [...n.links, { edge, reverse }] });
        }
      }
    }
    if (!route) return null;
    const path = [];
    let p = from,
      island = a;
    for (const { edge, reverse } of route) {
      const entry = reverse ? edge.end : edge.start,
        exit = reverse ? edge.start : edge.end,
        segment = localRoute(p, entry, island, Math.min(radius, 0.4));
      if (!segment?.length) return null;
      path.push(...segment, { ...exit });
      p = exit;
      island = byBiome(reverse ? edge.from : edge.to);
    }
    const last = localRoute(p, goal, b, radius);
    return last ? [...path, ...last] : null;
  }
  function station(site, radius, index) {
    const b = byBiome(site.biome),
      obstacles = getObstacles(b.id);
    for (let ring = 0; ring < 3; ring++)
      for (let i = 0; i < 24; i++) {
        const a = ((i + index * 7) / 24) * Math.PI * 2,
          s = {
            x: site.x + Math.sin(a) * (site.w / 2 + radius + 0.75 + ring * 2.2),
            z: site.z + Math.cos(a) * (site.d / 2 + radius + 0.75 + ring * 2.2),
          };
        if (
          Math.hypot(s.x, s.z) > (b.radius || 11.65) - radius - 0.65 ||
          !spaClear(s, radius, obstacles)
        )
          continue;
        if (
          [...workers.values()].some(
            (w) =>
              w.site.biome === site.biome &&
              Math.hypot(w.slot.x - s.x, w.slot.z - s.z) <
                w.radius + radius + 0.35,
          )
        )
          continue;
        return s;
      }
    return null;
  }
  function frame(
    id,
    position,
    biome,
    index,
    radius,
    dt,
    time,
    now = Date.now(),
  ) {
    const sites = getSites().filter((s) => s.readyAt > now);
    let w = workers.get(id);
    if (w && !sites.some((s) => s.id === w.site.id)) {
      workers.delete(id);
      w = null;
    }
    if (!sites.length) {
      workers.delete(id);
      return null;
    }
    if (!w) {
      if (time < nextAssignment || time < (retryAt.get(id) || -Infinity))
        return null;
      nextAssignment = time + 0.045;
      retryAt.set(id, time + 1.5);
      if (
        [...workers.values()].some(
          (o) =>
            Math.hypot(position.x - o.position.x, position.z - o.position.z) <
            radius + o.radius + 0.12,
        )
      )
        return null;
      const sorted = [...sites].sort(
        (a, b) =>
          (a.biome === biome ? 0 : 1000) - (b.biome === biome ? 0 : 1000) ||
          a.id.localeCompare(b.id),
      );
      for (const site of sorted) {
        const slot = station(site, radius, index + Math.floor(time / 1.5));
        if (!slot) continue;
        const path = journey(position, biome, site, slot, radius);
        if (!path?.length) continue;
        w = {
          site,
          slot,
          radius,
          path,
          position: { ...position },
          yaw: 0,
          phase: "run",
          elapsed: 0,
          index,
        };
        workers.set(id, w);
        break;
      }
      if (!w) return null;
    }
    radius = w.radius;
    w.elapsed += dt;
    if (w.path.length) {
      const to = w.path[0],
        d = Math.hypot(to.x - w.position.x, to.z - w.position.z),
        f = d ? Math.min(1, (2.9 * Math.min(dt, 0.05)) / d) : 1,
        next = {
          x: w.position.x + (to.x - w.position.x) * f,
          z: w.position.z + (to.z - w.position.z) * f,
          y:
            w.position.y +
            (to.y - w.position.y) * Math.min(1, Math.max(f, dt * 6)),
        };
      if (
        ![...workers.values()].some(
          (o) =>
            o !== w &&
            Math.hypot(next.x - o.position.x, next.z - o.position.z) <
              radius + o.radius + 0.01,
        )
      ) {
        w.blocked = 0;
        w.yaw = Math.atan2(to.x - w.position.x, to.z - w.position.z);
        w.position = next;
        if (d < 0.08) w.path.shift();
      } else {
        w.blocked = (w.blocked || 0) + dt;
        if (w.blocked > (w.repathAt || 0.8)) {
          w.repathAt = w.blocked + 1.2;
          const b = byBiome(w.site.biome),
            avoid = [...workers.values()]
              .filter((o) => o !== w)
              .map((o) => ({
                ...local(o.position, b),
                radius: o.radius + 0.02,
              })),
            path = localRoute(w.position, global(w.slot, b), b, radius, avoid);
          if (path?.length) w.path = path;
        }
      }
      w.phase = "run";
    } else {
      w.phase = "hammer";
      const b = byBiome(w.site.biome),
        goal = global(w.site, b);
      w.yaw = Math.atan2(goal.x - w.position.x, goal.z - w.position.z);
    }
    const tap = Math.max(0, Math.sin(time * 7 + index * 1.8));
    return {
      ...w,
      walking: w.phase === "run",
      reaction:
        w.phase === "hammer"
          ? {
              paw: 0.25 + tap * 0.62,
              headPitch: 0.07 + tap * 0.06,
              tailSway: Math.sin(time * 1.3) * 0.05,
            }
          : null,
      hammerAngle: w.phase === "hammer" ? -0.4 + tap * 1.05 : -0.25,
    };
  }
  return {
    workers,
    frame,
    cancel: (id) => workers.delete(id),
    clear: () => workers.clear(),
  };
}
