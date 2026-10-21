import {JOB_END} from "./jobcity-data.js";
import { cityClock } from "./jobcity-system.js";
import { leisurePlanOwner } from "./leisure-data.js";
import { createChillRuntime } from "./chill-runtime.js";
import { chillSeats, CHILL_WATER_Y } from "./chill-data.js";
import { spaPath, spaClear } from "./spa-navigation.js";
import {
  HOUSING_RADIUS,
  HOUSING_SECTION_PITCH,
  housingPlot,
  housingObjects,
} from "./housing-data.js";

// A walk or drive is an evening choice, not an order to go straight to bed.
// Quiet cats can return at 17:00; other residents have free time until 22:00.
export function homeRestTime(game, id, now = Date.now(), context = null) {
  if (!game.housing?.residences[id] || !game.jobCity) return false;
  const clock = context?.clock || cityClock(game.jobCity, now),
    p = game.jobCity.profiles[id];
  if (clock.working) return false;
  const planner =
      game.jobCity.profiles[leisurePlanOwner(game, id, context?.partners)],
    progress = p?.leisureProgress;
  if (
    clock.minute < 22 * 60 &&
    planner?.schedule?.day === clock.day &&
    planner.schedule.outings?.length >
      (progress?.day === clock.day ? progress.done : 0)
  )
    return false;
  if (clock.minute >= JOB_END && clock.minute < 22 * 60)
    return p?.schedule?.evening === "rest";
  return true;
}
export function createHousingRuntime({ reduced = false } = {}) {
  let homes = new Map(),
    sections = new Map(),
    state = null,
    objects = new Map();
  const walkable = (p, radius = 0.55, obstacles = []) => {
    const section = Math.max(0, Math.round(-p.x / HOUSING_SECTION_PITCH)),
      cx = -section * HOUSING_SECTION_PITCH;
    return (
      Math.hypot(p.x - cx, p.z) < HOUSING_RADIUS - radius - 0.55 &&
      spaClear(p, radius, obstacles) &&
      !(sections.get(section) || []).some(
        (h) =>
          Math.abs(p.x - h.x) < 5.55 + radius &&
          p.z > h.z - 3.65 - radius &&
          p.z < h.z + 4.35 + radius,
      )
    );
  };
  const nearest = (p, radius, obstacles) => {
    if (walkable(p, radius, obstacles)) return { ...p, y: 0.16 };
    for (let r = 0.4; r < 87; r += 0.6)
      for (let i = 0; i < 24; i++) {
        const a = (i / 24) * Math.PI * 2,
          q = { x: p.x + Math.cos(a) * r, z: p.z + Math.sin(a) * r, y: 0.16 };
        if (walkable(q, radius, obstacles)) return q;
      }
    return null;
  };
  const runtime = createChillRuntime({
    reduced,
    getObject: (id) => objects.get(id),
    getSeats: chillSeats,
    getEntrance: (o, seatIndex) => {
      const h = state.homes[o.houseId],
        p = housingPlot(h.plot);
      return {
        x: o.kind === "bed" ? chillSeats(o)[seatIndex].x : o.x,
        z: p.z + 5.7,
        y: 0.16,
      };
    },
    nearestGround: nearest,
    findPath: (a, b, radius, obstacles) => {
      // Shift to the section's local frame so the same bounded navigation grid
      // works for the thousandth section as well as the first.
      const sectionX =
        -Math.max(0, Math.round(-b.x / HOUSING_SECTION_PITCH)) *
        HOUSING_SECTION_PITCH;
      const local = (p) => ({ ...p, x: p.x - sectionX });
      const path = spaPath(
        local(a),
        local(b),
        radius,
        obstacles.map(local),
        (p, r) => walkable({ ...p, x: p.x + sectionX }, r, obstacles),
        { extent: 76 },
      );
      return path?.map((p) => ({ ...p, x: p.x + sectionX }));
    },
  });
  function sync(game) {
    if (state === game.housing) return;
    state = game.housing;
    const records = Object.values(state?.homes || {});
    // Care, income and saves clone the ledger even when every building stays
    // at the same address. Reuse navigation objects and section-local bounds.
    if (records.length === homes.size && records.every(h => homes.get(h.id)?.plot === h.plot)) return;
    homes = new Map(records.map(h => [h.id, { id: h.id, plot: h.plot, ...housingPlot(h.plot) }]));
    sections = new Map();
    for (const home of homes.values()) {
      if (!sections.has(home.section)) sections.set(home.section, []);
      sections.get(home.section).push(home);
    }
    objects = new Map(records.flatMap(housingObjects).map(o => [o.id, o]));
  }
  return {
    ...runtime,
    sync,
    walkable,
    object: (id) => objects.get(id),
    step(
      game,
      actors,
      dt,
      time,
      { night, eligible = () => true, blocked = () => false } = {},
    ) {
      sync(game);
      // Give each column its own approach lane. Returning every resident at
      // the same gate made their collision avoidance lock the whole crowd.
      const arriving = new Map();
      const lane = (home) => {
        const p = housingPlot(home.plot);
        return p.section + ":" + (p.slot % 4);
      };
      for (const visit of runtime.visits.values()) {
        const home = state?.homes[objects.get(visit.objectId)?.houseId];
        if (home && visit.phase !== "relax") {
          const key = lane(home);
          arriving.set(key, (arriving.get(key) || 0) + 1);
        }
      }
      let starts = 0;
      for (const actor of actors) {
        const id = state?.residences[actor.id],
          h = state?.homes[id],
          visit = runtime.get(actor.id);
        if (
          !night ||
          !eligible(actor) ||
          !h ||
          blocked(actor) ||
          (visit && visit.objectId !== id + "-bed")
        ) {
          runtime.cancel(actor.id);
          continue;
        }
        if (!visit) {
          const key = lane(h);
          if (starts >= 2 || (arriving.get(key) || 0) >= 1) continue;
          const p = housingPlot(h.plot),
            cx = -p.section * HOUSING_SECTION_PITCH;
          const origin =
            actor.local &&
            Math.hypot(actor.local.x - cx, actor.local.z) < HOUSING_RADIUS - 1
              ? actor.local
              : {
                  x: p.x - 2.55 + (h.owner === actor.id ? -1.5 : 1.5),
                  z: 27,
                  y: 0.16,
                };
          const v = runtime.start({
            catId: actor.id,
            objectId: id + "-bed",
            position: origin,
            radius: actor.radius || 0.55,
          });
          if (v) {
            v.hold = 86400;
            starts++;
            arriving.set(key, (arriving.get(key) || 0) + 1);
          }
        }
      }
      runtime.step(dt, time);
    },
  };
}
