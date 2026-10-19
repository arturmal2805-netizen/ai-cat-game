import { createChillRuntime } from "./chill-runtime.js";
import { chillSeats, CHILL_WATER_Y } from "./chill-data.js";
import { spaPath, spaClear } from "./spa-navigation.js";
import {
  HOUSING_RADIUS,
  HOUSING_SECTION_PITCH,
  housingPlot,
  housingObjects,
} from "./housing-data.js";

export function createHousingRuntime({ reduced = false } = {}) {
  let homes = [],
    state = null,
    objects = new Map();
  const walkable = (p, radius = 0.55, obstacles = []) => {
    const section = Math.max(0, Math.round(-p.x / HOUSING_SECTION_PITCH)),
      cx = -section * HOUSING_SECTION_PITCH;
    return (
      Math.hypot(p.x - cx, p.z) < HOUSING_RADIUS - radius - 0.55 &&
      spaClear(p, radius, obstacles) &&
      !homes.some(
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
        (p, r, obs) =>
          walkable(
            { ...p, x: p.x + sectionX },
            r,
            obs.map((q) => ({ ...q, x: q.x + sectionX })),
          ),
        { extent: 76 },
      );
      return path?.map((p) => ({ ...p, x: p.x + sectionX }));
    },
  });
  function sync(game) {
    if (state === game.housing) return;
    state = game.housing;
    homes = Object.values(state?.homes || {}).map((h) => ({
      ...h,
      ...housingPlot(h.plot),
    }));
    objects = new Map(
      Object.values(state?.homes || {})
        .flatMap(housingObjects)
        .map((o) => [o.id, o]),
    );
  }
  return {
    ...runtime,
    sync,
    walkable,
    object: (id) => objects.get(id),
    step(game, actors, dt, time, { night, blocked = () => false } = {}) {
      sync(game);
      for (const actor of actors) {
        const id = state?.residences[actor.id],
          h = state?.homes[id],
          visit = runtime.get(actor.id);
        if (
          !night ||
          !h ||
          blocked(actor) ||
          (visit && visit.objectId !== id + "-bed")
        ) {
          runtime.cancel(actor.id);
          continue;
        }
        if (!visit) {
          const p = housingPlot(h.plot),
            cx = -p.section * HOUSING_SECTION_PITCH;
          const origin =
            actor.local &&
            Math.hypot(actor.local.x - cx, actor.local.z) < HOUSING_RADIUS - 1
              ? actor.local
              : { x: cx, z: 32, y: 0.16 };
          const v = runtime.start({
            catId: actor.id,
            objectId: id + "-bed",
            position: origin,
            radius: actor.radius || 0.55,
          });
          if (v) v.hold = 86400;
        }
      }
      runtime.step(dt, time);
    },
  };
}
