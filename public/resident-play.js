import * as THREE from "three";
import { yarnPlayFrame, applyYarnFrame, resetYarn } from "./yarn-play.js";
import { swimFrame } from "./swimming.js";
import { socialFrame } from "./social-animation.js";
// Uses the same authored ride seats, toy chase and swim frames as Chichi.
// Each normal object has one reservation; communal SPA/Chill seating uses its
// existing multi-place runtime instead. No new cat meshes or saved AI moods.
export function createResidentPlay({
  getCat,
  getObject,
  onComplete = () => {},
}) {
  const visits = new Map(),
    locks = new Map(),
    point = new THREE.Vector3();
  function cancel(id) {
    const v = visits.get(id);
    if (!v) return;
    if (v.object) {
      resetYarn(v.object);
      v.object.userData.playing = false;
      delete v.object.userData.heroPlayPos;
      delete v.object.userData.rideElapsed;
    }
    if (
      locks.get(v.decision.activityId || "friend:" + v.decision.friendId) === id
    )
      locks.delete(v.decision.activityId || "friend:" + v.decision.friendId);
    visits.delete(id);
  }
  function start(id, decision, now = performance.now()) {
    const n = getCat(id),
      object = getObject(decision.activityId),
      friend = getCat(decision.friendId);
    if (
      !n ||
      (!object && !friend) ||
      decision.friendId === id ||
      locks.has(decision.activityId || "friend:" + decision.friendId)
    )
      return false;
    cancel(id);
    const destination = object
      ? object.position.clone().add(new THREE.Vector3(0, 0, 1.2))
      : friend.carrier.position.clone().add(new THREE.Vector3(1, 0, 0));
    destination.y = 0.16;
    const v = {
      id,
      decision,
      object,
      friend,
      from: n.carrier.position.clone(),
      destination,
      started: now,
      travel: Math.min(
        6500,
        Math.max(900, n.carrier.position.distanceTo(destination) * 160),
      ),
      phase: "approach",
      elapsed: 0,
      origin: friend?.carrier.position.clone(),
    };
    visits.set(id, v);
    locks.set(decision.activityId || "friend:" + decision.friendId, id);
    return true;
  }
  function frame(id, now, time, reduced = false) {
    const v = visits.get(id);
    if (!v) return null;
    const n = getCat(id),
      g = v.object,
      d = v.decision;
    if (!n || (g && g !== getObject(d.activityId))) {
      cancel(id);
      return null;
    }
    const result = {
      position: n.carrier.position.clone(),
      yaw: n.carrier.rotation.y,
      walking: false,
      reaction: null,
      mood: d.action === "rest" ? "sleep" : "happy",
      roll: 0,
    };
    if (v.phase === "approach") {
      const t = Math.min(1, (now - v.started) / (reduced ? 50 : v.travel)),
        q = t * t * (3 - 2 * t);
      result.position.lerpVectors(v.from, v.destination, q);
      result.yaw = Math.atan2(
        v.destination.x - v.from.x,
        v.destination.z - v.from.z,
      );
      result.walking = t < 1;
      result.mood = "happy";
      if (t >= 1) {
        v.phase = "activity";
        v.activityStart = now;
        if (g && d.action === "play") g.userData.playing = true;
      }
      return result;
    }
    const elapsed = (now - v.activityStart) / 1000;
    v.elapsed = elapsed;
    let local = point.set(0, 0.16, 0),
      world = false;
    if (d.action === "ride" && g) {
      if (g.userData.rideFrame) {
        g.userData.rideElapsed = elapsed;
        const f = g.userData.rideFrame(elapsed, reduced);
        local.set(...f.position);
        result.yaw = (f.yaw || 0) + g.rotation.y;
        result.roll = f.roll || 0;
        result.reaction = { paw: f.paw || 0, headPitch: f.headPitch || 0 };
        g.userData.update?.(time, reduced);
      } else if (g.userData.curve) {
        local.copy(
          g.userData.curve.getPoint(
            (g.userData.id === "waterslide" ? elapsed / 4 : time * 0.1) % 1,
          ),
        );
        local.y += 0.5;
      } else if (g.userData.id === "carousel") {
        local.set(
          Math.cos(time * 0.65) * 1.05,
          0.95,
          -Math.sin(time * 0.65) * 1.05,
        );
      } else if (g.userData.id === "ferris") {
        local.set(
          -Math.sin(time * 0.4) * 1.5,
          2 + Math.cos(time * 0.4) * 1.5,
          0.18,
        );
      } else if (g.userData.moving) {
        local.copy(
          g.userData.moving.localToWorld(
            new THREE.Vector3(0, g.userData.seatHeight || 0.5, 0),
          ),
        );
        world = true;
      } else local.y += reduced ? 0 : Math.abs(Math.sin(elapsed * 3)) * 1.5;
      if (!g.userData.rideFrame) result.yaw = time * 0.8;
    } else if (d.action === "play" && g?.userData.id === "yarn") {
      const f = yarnPlayFrame(elapsed, reduced);
      applyYarnFrame(g, f);
      local.set(f.cat.x, 0.16 + f.jump, f.cat.z);
      result.yaw = g.rotation.y + f.yaw;
      result.walking = f.running;
      result.reaction = f;
    } else if (d.action === "play" && g?.userData.playFrame) {
      const f = g.userData.playFrame(elapsed, reduced);
      g.userData.heroPlayPos = { x: f.position[0], z: f.position[2] };
      local.set(...f.position);
      result.yaw = f.yaw;
      result.reaction = { paw: f.paw };
      result.walking = !reduced;
    } else if (d.action === "swim") {
      const bounds = g.userData.swimBounds || { rx: 1.7, rz: 1.7 },
        f = swimFrame(elapsed, bounds, n.index, reduced);
      local.set(f.x, f.y, f.z);
      result.yaw = f.yaw;
      result.reaction = f;
      result.walking = true;
      if (elapsed > 10)
        local.lerp(
          new THREE.Vector3(
            bounds.rx + 0.65,
            (g.userData.shoreHeight ?? 0.16) - g.position.y,
            0,
          ),
          Math.min(1, (elapsed - 10) / 2),
        );
      g.userData.lagoon?.userData.disturb?.(f.x, f.z, time, 0.4);
    } else if (d.action === "rest") {
      local.y = g.userData.id === "bed" ? 0.3 : 0.16;
      result.reaction = { headPitch: 0.12 };
    } else if (d.action === "eat") {
      local.set(-0.3, 0.16, 0.8);
      result.yaw = g.rotation.y + Math.PI;
      result.reaction = {
        headPitch: 0.25 + (reduced ? 0 : Math.sin(elapsed * 4) * 0.06),
      };
    } else if (d.action === "farm") {
      local.set(Math.sin(elapsed * 1.5), 0.18, Math.cos(elapsed * 1.5) * 0.7);
      result.walking = true;
      result.yaw = elapsed;
      result.reaction = { paw: Math.max(0, Math.sin(elapsed * 3)) * 0.3 };
    } else if (d.action === "meet") {
      const f = socialFrame(elapsed, "play", reduced),
        friend = v.friend;
      result.position
        .copy(v.origin)
        .add(new THREE.Vector3(f.hero.x, f.hero.jump, f.hero.z));
      result.yaw = f.hero.yaw;
      result.walking = f.hero.running;
      result.reaction = f.hero;
      if (friend) {
        friend.carrier.position
          .copy(v.origin)
          .add(new THREE.Vector3(f.friend.x, f.friend.jump, f.friend.z));
        friend.carrier.rotation.y = f.friend.yaw;
        v.friendFrame = f.friend;
      }
    } else if (d.action === "party") {
      local.y = 0.35 + (reduced ? 0 : Math.abs(Math.sin(elapsed * 4)) * 0.15);
      result.yaw = Math.sin(elapsed * 2) * 0.35;
    } else if (d.action === "play") {
      local.set(Math.sin(elapsed * 2) * 0.7, 0.16, Math.cos(elapsed * 2) * 0.7);
      if (g.userData.id === "tunnel")
        local.set(Math.sin(elapsed) * 1.35, 0.16, 0);
      result.walking = true;
      result.yaw = -elapsed * 2;
    } else {
      local.z = 0.9;
      result.yaw = g.rotation.y + Math.sin(elapsed * 0.9) * 0.3;
    }
    if (g) result.position.copy(world ? local : g.localToWorld(local));
    const duration = reduced
      ? 0.3
      : d.action === "meet"
        ? 14
        : d.action === "swim"
          ? 12
          : g?.userData.duration || 10;
    if (elapsed > duration) {
      result.position.copy(v.destination);
      result.position.y = 0.16;
      cancel(id);
      onComplete(id, d);
      result.completed = true;
    }
    return result;
  }
  return {
    visits,
    start,
    cancel,
    frame,
    get: (id) => visits.get(id),
    reserved: (id) => locks.has(id),
    friendVisit: (id) =>
      [...visits.values()].find((v) => v.decision.friendId === id),
    clear() {
      for (const id of [...visits.keys()]) cancel(id);
    },
  };
}
