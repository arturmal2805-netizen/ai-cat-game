import * as THREE from "three";

export const SLIDE_CAPACITY = 4, SLIDE_HEADWAY_MS = 5200;
export const hasSlideRoom = (g) => !!g?.userData.slideWater &&
  (g.userData.slideRiders?.size || 0) < SLIDE_CAPACITY;
export function reserveSlide(g, id) {
  if (!hasSlideRoom(g)) return null;
  const d = g.userData, riders = d.slideRiders ||= new Map();
  if (riders.has(id)) return riders.get(id);
  const used = new Set([...riders.values()].map((r) => r.slot));
  let slot = 0; while (used.has(slot)) slot++;
  const entry = d.approachOffset || d.rideFrame(0, true).position,
    w = d.footprint?.[0] || d.placement?.footprint?.[0] || 12,
    queue = slot ? [Math.min(entry[0], -w / 2 + 2), entry[1], entry[2] + slot * 4.1] : [...entry],
    ticket = { id, slot, lane: (d.nextSlideLane = (d.nextSlideLane ?? -1) + 1) % (d.route?.lanes?.length || 1), queue, entry: [...entry], elapsed: null, waterElapsed: null, launchAt: null };
  riders.set(id, ticket);
  return ticket;
}
export function launchSlide(g, ticket, now) {
  if (ticket.launchAt !== null) return ticket.launchAt;
  ticket.launchAt = Math.max(now, (g.userData.lastSlideLaunch ?? -Infinity) + SLIDE_HEADWAY_MS);
  g.userData.lastSlideLaunch = ticket.launchAt;
  return ticket.launchAt;
}
export function releaseSlide(g, id) {
  const ticket = g?.userData.slideRiders?.get(id);
  if (!ticket) return;
  if (g.userData.slideVehicles?.[ticket.slot]) g.userData.slideVehicles[ticket.slot].visible = false;
  g.userData.slideRiders.delete(id);
  if (!g.userData.slideRiders.size) {
    delete g.userData.rideElapsed; delete g.userData.lastSlideLaunch;
  } else g.userData.lastSlideLaunch = Math.max(-Infinity,...[...g.userData.slideRiders.values()].map(r=>r.launchAt??-Infinity));
}
// Cloned rafts share the original buffers/materials and are allocated once,
// bounded to four per attraction. Each visitor keeps their own seat and clock.
export function updateSlideVehicles(g, reduced) {
  const d = g.userData;
  if (!d.slideRiders || !d.moving) return;
  const vehicles = d.slideVehicles ||= [d.moving];
  for (const v of vehicles) v.visible = false;
  for (const r of d.slideRiders.values()) {
    if (!Number.isFinite(r.elapsed)) continue;
    let v = vehicles[r.slot];
    if (!v) {
      v = d.moving.clone(true);
      v.name = "Guest raft " + (r.slot + 1);
      d.moving.parent.add(v); vehicles[r.slot] = v;
    }
    const f = d.rideFrame(r.elapsed, reduced, r.lane);
    v.visible = !["board", "climb", "return", "anticipation", "exit", "done"].includes(f.phase) &&
      d.id !== "dive-triple-sky";
    v.position.set(...f.position);
    if (!d.mega) v.position.y -= d.seatHeight ?? 0.5;
    if (f.quaternion) v.quaternion.fromArray(f.quaternion);
    else v.rotation.set(f.pitch || 0, f.yaw || 0, f.roll || 0);
  }
}
