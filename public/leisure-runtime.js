import { familyPartners } from "./family-system.js";
const copy = (p) => ({ x: p.x, y: p.y || 0.16, z: p.z });
const free = (p, clock) =>
  !!p &&
  clock.minute < 22 * 60 &&
  clock.minute >= 8 * 60 &&
  (!clock.working || p.schedule?.job === "rest");
export function createLeisureRuntime() {
  const visits = new Map();
  let next = 0,
    orderDay = -1;
  const ranks = new Map();
  const rank = (id, day) => {
    let n =
      [...id].reduce((h, c) => Math.imul(h, 31) + c.charCodeAt(0), 17) ^
      Math.imul(day + 1, 0x9e3779b1);
    n = Math.imul(n ^ (n >>> 16), 0x85ebca6b);
    return (n ^ (n >>> 13)) >>> 0;
  };
  const done = (p, day) =>
    p?.leisureProgress?.day === day ? p.leisureProgress.done : 0;
  function cancel(id) {
    visits.delete(id);
  }
  return {
    visits,
    cancel,
    get: (id) => visits.get(id),
    has: (id) => visits.has(id),
    clear: () => visits.clear(),
    finish(id) {
      const v = visits.get(id);
      visits.delete(id);
      return v;
    },
    step(
      game,
      actors,
      dt,
      time,
      {
        clock,
        offers,
        blocked = () => false,
        start = () => false,
        active = () => true,
        stop = () => {},
        skip = () => {},
        prepare = () => true,
        destination = (offer, a) => a.position,
        allow = true,
      } = {},
    ) {
      const profiles = game.jobCity?.profiles || {},
        people = new Map(actors.map((a) => [a.id, a]));
      for (const [id, v] of visits) {
        const p = profiles[id];
        if (
          !allow ||
          !people.has(id) ||
          !free(p, clock) ||
          p.schedule?.day !== v.day ||
          blocked(id, v)
        ) {
          visits.delete(id);
          stop(id);
          continue;
        }
        if (v.phase === "activity" && !active(id, v)) {
          visits.delete(id);
          stop(id);
          skip(id, v);
          continue;
        }
        if (done(p, v.day) > v.index) {
          visits.delete(id);
          continue;
        }
        if (
          v.phase !== "activity" &&
          (!offers.has(v.offer.id) ||
            (v.phase === "queue" && time - v.queuedAt > 60))
        ) {
          visits.delete(id);
          stop(id);
          skip(id, v);
          continue;
        }
        if (v.phase === "travel") {
          v.elapsed += dt;
          const u = Math.min(1, v.elapsed / v.duration),
            t = u * u * (3 - 2 * u);
          v.position = {
            x: v.from.x + (v.to.x - v.from.x) * t,
            z: v.from.z + (v.to.z - v.from.z) * t,
            y:
              v.from.y +
              (v.to.y - v.from.y) * t +
              Math.sin(Math.PI * u) * v.height,
          };
          if (u === 1) {
            v.phase = "queue";
            v.retryAt = time;
            v.queuedAt = time;
          }
        }
        if (v.phase === "queue" && time >= v.retryAt) {
          v.retryAt = time + 2;
          if (start(id, v.offer, v)) v.phase = "activity";
        }
      }
      if (!allow || !game.jobCity || time < next || visits.size >= 6) return;
      next = time + 1.4;
      const partners = familyPartners(game),
        checked = new Set();
      if (orderDay !== clock.day) {
        ranks.clear();
        orderDay = clock.day;
      }
      for (const a of actors)
        if (!ranks.has(a.id)) ranks.set(a.id, rank(a.id, clock.day));
      // First outings take priority over repeat visits. A stable daily shuffle
      // gives later roster entries their turn without more active simulations.
      const ordered = [...actors].sort(
        (a, b) =>
          done(profiles[a.id], clock.day) - done(profiles[b.id], clock.day) ||
          ranks.get(a.id) - ranks.get(b.id),
      );
      for (const a of ordered) {
        if (
          checked.has(a.id) ||
          visits.has(a.id) ||
          blocked(a.id) ||
          !free(profiles[a.id], clock)
        )
          continue;
        const spouse = partners.get(a.id),
          together =
            spouse &&
            people.has(spouse) &&
            free(profiles[spouse], clock) &&
            !blocked(spouse);
        const members = together ? [a.id, spouse] : [a.id];
        members.forEach((id) => checked.add(id));
        if (members.some((id) => visits.has(id))) continue;
        const source = members.includes("chichi")
          ? "chichi"
          : members.find((id) => profiles[id]?.sex === "male") || members[0];
        const schedule = profiles[source]?.schedule;
        if (schedule?.day !== clock.day || !schedule.outings?.length) continue;
        const index = Math.min(
          ...members.map((id) => done(profiles[id], clock.day)),
        );
        const offer = offers.get(schedule.outings[index]);
        if (!offer) {
          if (index < schedule.outings.length)
            for (const id of members)
              if (done(profiles[id], clock.day) <= index)
                skip(id, {
                  catId: id,
                  day: clock.day,
                  index,
                  offer: { id: schedule.outings[index] },
                });
          continue;
        }
        if (!prepare(offer)) continue;
        const pending = members.filter(
          (id) => done(profiles[id], clock.day) <= index,
        );
        if (!pending.length || visits.size + pending.length > 6) continue;
        for (const [slot, id] of pending.entries()) {
          const actor = people.get(id),
            to = destination(offer, actor, slot, members);
          if (!to) continue;
          const from = copy(actor.position),
            length = Math.hypot(to.x - from.x, to.z - from.z);
          visits.set(id, {
            catId: id,
            day: clock.day,
            index,
            source,
            members,
            offer,
            phase: "travel",
            from,
            to: copy(to),
            position: from,
            elapsed: 0,
            duration: length < 8 ? 1.1 : Math.min(7, 2 + length / 100),
            height: length > 40 ? Math.min(16, length * 0.04) : 0,
            yaw: Math.atan2(to.x - from.x, to.z - from.z),
          });
        }
        return;
      }
    },
    frame(id) {
      const v = visits.get(id);
      return v && v.phase !== "activity"
        ? {
            position: v.position,
            yaw: v.yaw,
            walking: v.phase === "travel" && v.height === 0,
            reaction: v.height ? { headPitch: -0.05, paw: 0.15 } : null,
          }
        : null;
    },
  };
}
// A relaxed companion uses the existing walking rig, beside the partner rather
// than inside them. Busy partners stay on their own reserved seats/ride frames.
export function familyFollowTarget(leader, radius, partnerRadius) {
  const yaw = leader.yaw || 0,
    gap = radius + partnerRadius + 0.4;
  return {
    x: leader.position.x + Math.cos(yaw) * gap,
    z: leader.position.z - Math.sin(yaw) * gap,
    y: leader.position.y,
  };
}
